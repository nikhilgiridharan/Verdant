CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    country VARCHAR NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    tier INT NOT NULL,
    industry VARCHAR
);

CREATE TABLE IF NOT EXISTS skus (
    sku_id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    category VARCHAR NOT NULL,
    hs_code VARCHAR NOT NULL
);

-- Raw seed: EPA Supply Chain GHG Emission Factors v1.4.0 (NAICS-6 rows)
DROP VIEW IF EXISTS stg_emission_factors;
DROP TABLE IF EXISTS epa_emission_factors CASCADE;

CREATE TABLE epa_emission_factors (
    transport_mode VARCHAR NOT NULL,
    naics_code INT NOT NULL,
    naics_title VARCHAR NOT NULL,
    epa_version VARCHAR NOT NULL,
    ghg_data_year INT NOT NULL,
    dollar_year INT NOT NULL,
    gwp_standard VARCHAR NOT NULL,
    sef_without_margins DOUBLE PRECISION NOT NULL,
    margins_sef DOUBLE PRECISION NOT NULL,
    sef_with_margins DOUBLE PRECISION NOT NULL,
    cost_usd_per_tonne_km DOUBLE PRECISION NOT NULL,
    kg_co2e_per_tonne_km DOUBLE PRECISION NOT NULL,
    source VARCHAR NOT NULL,
    PRIMARY KEY (transport_mode, naics_code)
);

-- Staging view: one row per transport mode (matches dbt stg_emission_factors)
CREATE OR REPLACE VIEW stg_emission_factors AS
WITH source AS (
    SELECT * FROM epa_emission_factors
),
deduped AS (
    SELECT
        transport_mode,
        CASE transport_mode
            WHEN 'AIR' THEN 481112
            WHEN 'OCEAN' THEN 483111
            WHEN 'TRUCK' THEN 484121
            WHEN 'RAIL' THEN 482111
        END AS primary_naics_code,
        epa_version,
        ghg_data_year,
        dollar_year,
        gwp_standard,
        sef_without_margins,
        margins_sef,
        sef_with_margins AS epa_factor_per_usd,
        cost_usd_per_tonne_km,
        kg_co2e_per_tonne_km,
        source
    FROM source
    WHERE naics_code IN (481112, 483111, 484121, 482111)
)
SELECT
    transport_mode,
    primary_naics_code,
    epa_version,
    ghg_data_year,
    dollar_year,
    gwp_standard,
    epa_factor_per_usd,
    cost_usd_per_tonne_km,
    kg_co2e_per_tonne_km,
    source,
    CURRENT_TIMESTAMP AS loaded_at
FROM deduped;

CREATE TABLE IF NOT EXISTS shipment_silver_summary (
    shipment_id VARCHAR PRIMARY KEY,
    supplier_id VARCHAR NOT NULL,
    sku_id VARCHAR NOT NULL,
    event_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    weight_kg DOUBLE PRECISION,
    distance_km DOUBLE PRECISION,
    cost_usd DOUBLE PRECISION,
    emissions_kg_co2e DOUBLE PRECISION NOT NULL,
    carbon_intensity DOUBLE PRECISION,
    transport_mode VARCHAR NOT NULL,
    route_key VARCHAR,
    is_anomaly BOOLEAN DEFAULT FALSE,
    supplier_country VARCHAR,
    destination_country VARCHAR,
    processing_timestamp TIMESTAMPTZ DEFAULT NOW(),
    ingestion_timestamp TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shipment_silver_summary ADD COLUMN IF NOT EXISTS emissions_factor_version VARCHAR(20) DEFAULT 'v1.4.0';
ALTER TABLE shipment_silver_summary ADD COLUMN IF NOT EXISTS emissions_dollar_year VARCHAR(10);
ALTER TABLE shipment_silver_summary ADD COLUMN IF NOT EXISTS emissions_factor_per_tonne_km DOUBLE PRECISION;

UPDATE shipment_silver_summary SET emissions_factor_version = 'v1.4.0' WHERE emissions_factor_version IS NULL;
UPDATE shipment_silver_summary SET emissions_dollar_year = '2024' WHERE emissions_dollar_year IS NULL;
UPDATE shipment_silver_summary SET
    emissions_factor_per_tonne_km = CASE transport_mode
        WHEN 'AIR' THEN 0.5474
        WHEN 'OCEAN' THEN 0.0233
        WHEN 'TRUCK' THEN 0.0920
        WHEN 'RAIL' THEN 0.0077
    END
WHERE emissions_factor_per_tonne_km IS NULL;

CREATE OR REPLACE VIEW shipments_enriched AS
SELECT
    shipment_id,
    event_at,
    supplier_id,
    sku_id,
    transport_mode,
    weight_kg,
    distance_km,
    cost_usd,
    emissions_kg_co2e,
    carbon_intensity,
    route_key,
    is_anomaly,
    ingestion_timestamp
FROM shipment_silver_summary;

CREATE TABLE IF NOT EXISTS supplier_risk_scores (
    supplier_id VARCHAR PRIMARY KEY,
    risk_score FLOAT NOT NULL,
    risk_tier VARCHAR NOT NULL,
    emissions_30d_kg FLOAT,
    emissions_90d_kg FLOAT,
    emissions_trend VARCHAR,
    last_scored_at TIMESTAMP DEFAULT NOW(),
    model_version VARCHAR
);

CREATE TABLE IF NOT EXISTS emissions_alerts (
    alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR NOT NULL,
    severity VARCHAR NOT NULL,
    supplier_id VARCHAR,
    sku_id VARCHAR,
    emissions_kg FLOAT,
    threshold_kg FLOAT,
    message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    acknowledged BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS pipeline_status (
    component VARCHAR PRIMARY KEY,
    status VARCHAR NOT NULL,
    last_heartbeat TIMESTAMP,
    records_processed BIGINT DEFAULT 0,
    last_error TEXT
);

CREATE TABLE IF NOT EXISTS sku_emissions_summary (
    sku_id VARCHAR PRIMARY KEY,
    sku_name VARCHAR,
    product_category VARCHAR,
    total_emissions_kg FLOAT,
    avg_carbon_intensity FLOAT,
    shipment_count INT,
    top_supplier_id VARCHAR,
    last_updated TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dbt_run_metadata (
    id SERIAL PRIMARY KEY,
    status VARCHAR,
    duration_seconds FLOAT,
    models_run INT,
    tests_passed INT,
    ran_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_created ON emissions_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_supplier ON emissions_alerts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_risk_tier ON supplier_risk_scores(risk_tier);
CREATE INDEX IF NOT EXISTS idx_shipment_event ON shipment_silver_summary(event_at DESC);
