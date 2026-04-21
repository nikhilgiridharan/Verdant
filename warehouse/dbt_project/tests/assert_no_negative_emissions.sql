SELECT *
FROM {{ ref('fact_emissions') }}
WHERE emissions_kg_co2e < 0
