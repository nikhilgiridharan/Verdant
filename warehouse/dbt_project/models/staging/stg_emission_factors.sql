-- stg_emission_factors.sql
-- Staging model for EPA Supply Chain GHG Emission Factors v1.4.0
-- Source: EPA NAICS-6 Supply Chain Emission Factors, October 2025
-- GHG data year: 2023 | Dollar year: 2024 USD | GWP: IPCC AR6
--
-- Key design decision: We use sef_with_margins (SEF+MEF) per EPA guidance
-- for Scope 3 Category 4 (Upstream Transportation and Distribution).
-- The kg_co2e_per_tonne_km is derived by multiplying the cost-based EPA
-- factor by industry-average cost rates (USD/tonne-km) per transport mode.
-- This bridges EPA's cost-based methodology with CarbonPulse's
-- weight × distance calculation approach.
-- See ADR-003 for full methodology documentation.

with source as (
    select * from {{ ref('epa_emission_factors') }}
),

-- Deduplicate to one factor per transport mode
-- (multiple NAICS codes map to the same mode and factor)
-- Use the primary NAICS code per mode for the canonical factor
deduped as (
    select
        transport_mode,
        -- Use primary NAICS code per mode
        case transport_mode
            when 'AIR' then 481112
            when 'OCEAN' then 483111
            when 'TRUCK' then 484121
            when 'RAIL' then 482111
        end as primary_naics_code,
        epa_version,
        ghg_data_year,
        dollar_year,
        gwp_standard,
        sef_without_margins,
        margins_sef,
        -- sef_with_margins is the authoritative factor per EPA Scope 3 guidance
        sef_with_margins as epa_factor_per_usd,
        cost_usd_per_tonne_km,
        -- Derived factor for CarbonPulse weight × distance calculations
        kg_co2e_per_tonne_km,
        source
    from source
    where naics_code in (481112, 483111, 484121, 482111)
)

select
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
    -- Metadata
    current_timestamp as loaded_at
from deduped
