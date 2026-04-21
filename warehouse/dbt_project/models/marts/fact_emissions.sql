select
  {{ dbt_utils.generate_surrogate_key(["s.shipment_id", "s.event_at"]) }} as emission_id,
  s.shipment_id,
  s.event_at,
  date_trunc('day', s.event_at) as emission_date,
  date_trunc('month', s.event_at) as emission_month,
  s.supplier_id,
  s.sku_id,
  s.transport_mode,
  s.weight_kg,
  s.distance_km,
  s.cost_usd,
  s.emissions_kg_co2e,
  s.carbon_intensity,
  s.route_key,
  s.is_anomaly,
  s.ingestion_timestamp,
  -- EPA factor traceability columns
  ef.epa_version as emissions_factor_version,
  ef.ghg_data_year as emissions_factor_data_year,
  ef.dollar_year as emissions_factor_dollar_year,
  ef.epa_factor_per_usd as emissions_factor_per_usd,
  ef.kg_co2e_per_tonne_km as emissions_factor_per_tonne_km
from {{ ref("int_shipments_enriched") }} s
inner join {{ ref("stg_emission_factors") }} ef
  on s.transport_mode = ef.transport_mode
