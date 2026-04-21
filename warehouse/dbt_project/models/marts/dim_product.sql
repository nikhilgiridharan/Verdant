SELECT
  sku_id,
  name AS sku_name,
  category AS product_category,
  hs_code
FROM {{ ref('skus_sample') }}
