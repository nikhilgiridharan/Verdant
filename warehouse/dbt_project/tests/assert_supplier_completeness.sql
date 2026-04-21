SELECT f.shipment_id
FROM {{ ref('fact_emissions') }} f
LEFT JOIN {{ ref('dim_supplier') }} s USING (supplier_id)
WHERE s.supplier_id IS NULL
