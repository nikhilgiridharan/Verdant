"""
PySpark Silver transformer (Bronze Delta → Silver Delta + PostgreSQL summary).

Emissions use EPA Supply Chain GHG Emission Factors v1.4.0 (see ADR-003).
`CARBONPULSE_SILVER_BRONZE_CLEAN_PATH`: Delta path to parsed bronze with
transport_mode, weight_kg, distance_km, and core shipment columns (optional).
"""

from __future__ import annotations

import os

from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.functions import broadcast

MINIO_ENDPOINT = os.environ.get("MINIO_ENDPOINT", "http://localhost:9000")
MINIO_KEY = os.environ.get("MINIO_ACCESS_KEY", "carbonpulse")
MINIO_SECRET = os.environ.get("MINIO_SECRET_KEY", "carbonpulse123")
POSTGRES_URL = os.environ.get(
    "DATABASE_URL",
    "jdbc:postgresql://localhost:5432/carbonpulse?user=carbonpulse&password=carbonpulse123",
)

SILVER_BRONZE_CLEAN_PATH = os.environ.get(
    "CARBONPULSE_SILVER_BRONZE_CLEAN_PATH",
    "s3a://carbonpulse/bronze/shipments_clean/",
)


def build_spark() -> SparkSession:
    return (
        SparkSession.builder.appName("carbonpulse-silver")
        .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
        .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog")
        .config("spark.hadoop.fs.s3a.endpoint", MINIO_ENDPOINT)
        .config("spark.hadoop.fs.s3a.access.key", MINIO_KEY)
        .config("spark.hadoop.fs.s3a.secret.key", MINIO_SECRET)
        .config("spark.hadoop.fs.s3a.path.style.access", "true")
        .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem")
        .getOrCreate()
    )


def apply_epa_v14_emissions(spark: SparkSession, bronze_clean_df):
    """Join EPA v1.4.0 factors and compute emissions_kg_co2e (see ADR-003)."""
    # ── Emission Factor Join (updated for EPA v1.4.0) ─────────────────────────
    #
    # Load emission factors from PostgreSQL (populated by dbt seed + API bootstrap)
    # One row per transport mode after staging deduplication
    #
    emission_factors_df = (
        spark.read.format("jdbc")
        .option("url", POSTGRES_URL)
        .option("dbtable", "stg_emission_factors")
        .option("driver", "org.postgresql.Driver")
        .load()
        .select(
            "transport_mode",
            "kg_co2e_per_tonne_km",
            "epa_factor_per_usd",
            "epa_version",
            "ghg_data_year",
            "dollar_year",
        )
    )

    # Broadcast join — only 4 rows, tiny table
    emission_factors_broadcast = broadcast(emission_factors_df)

    # ── Emissions Calculation ─────────────────────────────────────────────────
    #
    # Formula: emissions_kg_co2e = (weight_kg / 1000) * distance_km * kg_co2e_per_tonne_km
    #
    # Where kg_co2e_per_tonne_km is derived from EPA v1.4.0 NAICS-6 factors:
    #   - EPA publishes factors in kg CO2e per 2024 USD spent on transport
    #   - We multiply by industry-average cost rate (USD/tonne-km) per mode
    #   - This gives kg CO2e per tonne-km usable with physical shipment data
    #
    silver_df = (
        bronze_clean_df.join(emission_factors_broadcast, on="transport_mode", how="left")
        .withColumn(
            "emissions_kg_co2e",
            (F.col("weight_kg") / 1000.0) * F.col("distance_km") * F.col("kg_co2e_per_tonne_km"),
        )
        .withColumn(
            "carbon_intensity",
            F.when(F.col("weight_kg") > 0, F.col("emissions_kg_co2e") / F.col("weight_kg")).otherwise(F.lit(None)),
        )
        .withColumn("emissions_factor_version", F.col("epa_version"))
        .withColumn("emissions_dollar_year", F.col("dollar_year").cast("string"))
        .withColumn("emissions_factor_per_tonne_km", F.col("kg_co2e_per_tonne_km"))
    )

    # ── Silver Quality Filters ────────────────────────────────────────────────
    silver_filtered_df = (
        silver_df.filter(F.col("weight_kg") > 0)
        .filter(F.col("distance_km") > 0)
        .filter(F.col("emissions_kg_co2e").isNotNull())
        .filter(F.col("emissions_kg_co2e") > 0)
        .filter(F.col("emissions_kg_co2e") < 500_000)  # Sanity cap: 500t CO2e max per shipment
    )

    return silver_filtered_df


def main() -> None:
    spark = build_spark()
    spark.sparkContext.setLogLevel("WARN")

    try:
        bronze_clean_df = spark.read.format("delta").load(SILVER_BRONZE_CLEAN_PATH)
    except Exception as exc:  # noqa: BLE001
        print(f"Silver transformer: no parsed bronze at {SILVER_BRONZE_CLEAN_PATH} ({exc}).")
        try:
            df = spark.read.format("delta").load("s3a://carbonpulse/bronze/shipments/")
            print(f"Silver transformer: bronze rows visible: {df.count()}")
        except Exception as exc2:  # noqa: BLE001
            print(f"Silver transformer: bronze read failed (expected if bronze empty): {exc2}")
        return

    silver_filtered_df = apply_epa_v14_emissions(spark, bronze_clean_df)
    out_path = os.environ.get("CARBONPULSE_SILVER_DELTA_PATH", "s3a://carbonpulse/silver/shipments/")
    silver_filtered_df.write.format("delta").mode("append").save(out_path)
    print(f"Silver transformer: wrote silver batch to {out_path}")


if __name__ == "__main__":
    main()
