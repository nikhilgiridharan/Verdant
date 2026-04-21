SELECT
  s.*,
  sup.supplier_name,
  sup.supplier_country,
  sup.supplier_lat,
  sup.supplier_lng,
  sup.supplier_tier,
  sup.industry,
  sku.name AS sku_name,
  sku.category AS product_category
FROM {{ ref('stg_shipments') }} s
LEFT JOIN {{ ref('stg_suppliers') }} sup USING (supplier_id)
LEFT JOIN {{ ref('skus_sample') }} sku USING (sku_id)
