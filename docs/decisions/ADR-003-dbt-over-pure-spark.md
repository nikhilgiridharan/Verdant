# ADR-003: dbt for the Gold layer instead of pure PySpark

## Context

Gold-layer logic must be testable, reviewable by analysts, and easy to version.

## Decision

Use **dbt** for curated models (staging/intermediate/marts) while Spark handles heavy bronze/silver hygiene.

## Consequences

- Pros: tests/lineage/SQL-first collaboration.  
- Cons: need a warehouse target (DuckDB/Snowflake) and disciplined source contracts.
