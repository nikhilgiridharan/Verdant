SELECT
  supplier_id,
  supplier_name,
  supplier_country,
  supplier_lat,
  supplier_lng,
  supplier_tier,
  industry,
  valid_from,
  valid_to,
  is_current
FROM {{ ref('stg_suppliers') }}
