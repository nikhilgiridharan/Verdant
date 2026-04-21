SELECT
  supplier_id,
  name AS supplier_name,
  country AS supplier_country,
  lat AS supplier_lat,
  lng AS supplier_lng,
  tier AS supplier_tier,
  industry,
  CURRENT_TIMESTAMP AS valid_from,
  CAST(NULL AS TIMESTAMP) AS valid_to,
  TRUE AS is_current
FROM {{ ref('suppliers') }}
