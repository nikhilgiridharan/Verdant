# ADR-001: Snowflake with DuckDB for local development

## Context

The team needs a warehouse that appears frequently in hiring loops, supports dbt cleanly, and can be demoed without cloud spend.

## Decision

Use **Snowflake** in production profiles and **DuckDB** on developer laptops / CI for the same dbt project.

## Consequences

- Pros: dbt parity, fast local iteration, credible interview narrative.  
- Cons: Snowflake trial limits; slight SQL dialect differences require testing both targets.
