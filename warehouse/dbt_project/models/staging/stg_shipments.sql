SELECT
  shipment_id,
  CAST(event_at AS TIMESTAMP) AS event_at,
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
  CAST(ingestion_timestamp AS TIMESTAMP) AS ingestion_timestamp
FROM {{ ref('shipments_enriched_sample') }}
WHERE weight_kg > 0
  AND emissions_kg_co2e IS NOT NULL
