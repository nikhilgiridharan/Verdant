"""
PySpark Structured Streaming: Kafka → MinIO (Delta Bronze).

Run (example):
  spark-submit --packages org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.1,\
io.delta:delta-spark_2.12:3.2.0,org.apache.spark:spark-avro_2.12:3.5.1 \\
  spark_processor.py
"""

from __future__ import annotations

import os

from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.functions import col, current_timestamp

KAFKA_BOOTSTRAP = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
MINIO_ENDPOINT = os.environ.get("MINIO_ENDPOINT", "http://localhost:9000")
MINIO_KEY = os.environ.get("MINIO_ACCESS_KEY", "carbonpulse")
MINIO_SECRET = os.environ.get("MINIO_SECRET_KEY", "carbonpulse123")


def build_spark() -> SparkSession:
    spark = (
        SparkSession.builder.appName("carbonpulse-bronze")
        .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
        .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog")
        .config("spark.hadoop.fs.s3a.endpoint", MINIO_ENDPOINT)
        .config("spark.hadoop.fs.s3a.access.key", MINIO_KEY)
        .config("spark.hadoop.fs.s3a.secret.key", MINIO_SECRET)
        .config("spark.hadoop.fs.s3a.path.style.access", "true")
        .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem")
        .getOrCreate()
    )
    return spark


def main() -> None:
    spark = build_spark()
    spark.sparkContext.setLogLevel("WARN")
    # NOTE: Full Avro deserialization requires a deployed schema and spark-avro configuration.
    raw = (
        spark.readStream.format("kafka")
        .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP)
        .option("subscribe", "shipment-events")
        .option("startingOffsets", "latest")
        .option("failOnDataLoss", "false")
        .load()
    )

    bronze = raw.select(
        col("timestamp").alias("kafka_timestamp"),
        col("partition"),
        col("offset"),
        col("key").cast("string"),
        col("value").cast("binary"),
        current_timestamp().alias("ingestion_timestamp"),
        F.current_date().alias("processing_date"),
        F.lit("kafka-producer").alias("source_system"),
    )

    query = (
        bronze.writeStream.format("delta")
        .outputMode("append")
        .option("checkpointLocation", "s3a://carbonpulse/checkpoints/bronze_shipments/")
        .partitionBy("processing_date")
        .trigger(processingTime="30 seconds")
        .start("s3a://carbonpulse/bronze/shipments/")
    )

    query.awaitTermination()


if __name__ == "__main__":
    main()
