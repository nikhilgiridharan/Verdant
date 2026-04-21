# ADR-003: EPA Emission Factors Selection and Derivation Methodology

**Status:** Accepted
**Date:** 2025-10
**Authors:** Data Engineer + Supply Chain Analyst

## Context

CarbonPulse calculates Scope 3 Category 4 (Upstream Transportation and
Distribution) emissions for every shipment record. We need a credible,
auditable source for greenhouse gas emission factors per transport mode.

## Decision

We use the EPA Supply Chain GHG Emission Factors v1.4.0 NAICS-6 dataset
published October 14, 2025 (Ingwersen and Young 2025, Zenodo DOI:
10.5281/zenodo.17202747).

**Key dataset characteristics:**
- GHG inventory data year: 2023
- Dollar year: 2024 USD
- GWP standard: IPCC AR6 (upgraded from AR5 in v1.3.0)
- Coverage: 1,016 U.S. commodities at NAICS-6 level
- Factor type used: Supply Chain Emission Factors WITH Margins (SEF+MEF)

**Why SEF+MEF over SEF alone:**
The EPA recommends SEF+MEF for Scope 3 purchased goods and services
reporting. Margins represent distribution and retail emissions that are
part of the full supply chain footprint.

## Transport Mode Mapping

| CarbonPulse Mode | Primary NAICS Code | NAICS Title | SEF+MEF (kg CO2e/2024 USD) |
|---|---|---|---|
| AIR | 481112 | Scheduled Freight Air Transportation | 0.644 |
| OCEAN | 483111 | Deep Sea Freight Transportation | 0.583 |
| TRUCK | 484121 | General Freight Trucking, Long-Distance TL | 0.767 |
| RAIL | 482111 | Line-Haul Railroads | 0.154 |

## Derivation: Cost-Based to Tonne-km Factors

The EPA factors are expressed in kg CO2e per USD spent on transport
services. CarbonPulse stores physical shipment data (weight_kg,
distance_km), requiring a conversion to kg CO2e per tonne-km.

**Conversion methodology:**
```
kg_co2e_per_tonne_km = epa_factor_per_usd × cost_usd_per_tonne_km
```

**Industry-average cost rates used (2024 benchmarks):**

| Mode | Cost Rate (USD/tonne-km) | Source |
|---|---|---|
| AIR | $0.85 | IATA Air Cargo Market Analysis 2024 |
| OCEAN | $0.04 | Drewry Container Freight Rate Insight 2024 |
| TRUCK | $0.12 | ATA Trucking Activity Report 2024 |
| RAIL | $0.05 | AAR Railroad Cost Conditions 2024 |

**Derived kg CO2e per tonne-km:**

| Mode | EPA Factor | Cost Rate | Derived tonne-km Factor |
|---|---|---|---|
| AIR | 0.644 | 0.85 | **0.5474** |
| OCEAN | 0.583 | 0.04 | **0.0233** |
| TRUCK | 0.767 | 0.12 | **0.0920** |
| RAIL | 0.154 | 0.05 | **0.0077** |

## Consequences

**Positive:**
- Legally defensible emission factors from official U.S. EPA source
- Most current dataset available (2023 GHG data, IPCC AR6 GWPs)
- Full auditability — every fact_emissions row carries factor version
- Ocean shipping factor dropped 29% from v1.3.0 — correctly reflects
  improved measurement and AR6 GWP updates

**Negative:**
- Cost-based EPA factors require assumption of average cost rates
  per transport mode — introduces uncertainty for non-average shipments
- Does not account for specific vessel efficiency, route congestion,
  or carrier-specific emission performance
- Factors update annually — pipeline must be updated when v1.5.0 releases

## Upgrade Path

When EPA releases v1.5.0:
1. SC Analyst downloads new CSV from Zenodo
2. Update epa_emission_factors.csv seed with new factor values
3. Run `dbt seed && dbt run && dbt test`
4. Verify fact_emissions rows carry new version string
5. Update this ADR with new factor values

## References

- Ingwersen, W. and Young, B. (2025). Supply Chain Greenhouse Gas Emission
  Factors V1.4 by NAICS-6. https://doi.org/10.5281/zenodo.17202747
- EPA Scope 3 Inventory Guidance: https://www.epa.gov/climateleadership/scope-3-inventory-guidance
- GHG Protocol Scope 3 Technical Guidance: https://ghgprotocol.org
