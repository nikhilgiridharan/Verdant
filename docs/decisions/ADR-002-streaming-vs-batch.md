# ADR-002: Kafka + Spark Structured Streaming over batch-only

## Context

Anomaly surfacing and map freshness benefit from near-real-time ingress; batch nightly jobs are simpler but weaker for demos.

## Decision

Use **Kafka** for ingestion and **Spark Structured Streaming** (micro-batch) toward Delta bronze/silver layers.

## Consequences

- Pros: backpressure buffering, MSK/Glue-compatible story.  
- Cons: higher operational complexity than pure batch.
