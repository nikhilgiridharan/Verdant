# ADR-004: LightGBM for risk scoring, XGBoost for forecasting

## Context

The DS track needs fast iteration on wide, categorical-heavy supplier features and a separate regression model for horizons.

## Decision

Standardize on **LightGBM** for supplier risk classification and **XGBoost** for emissions forecasting (stubs until DS ships models).

## Consequences

- Pros: speed + native categorical handling (LightGBM); strong tabular regression defaults (XGBoost).  
- Cons: two modeling stacks to maintain and monitor.
