"""
Shared supplier risk features and label derivation.

Audit (2026): README described percentile labels on emissions_90d_kg, but no LightGBM
training existed (train_risk_model.py was a stub). Production seed/bootstrap assigned
risk tiers via MD5(supplier_id) — uncorrelated with emission patterns. This module
builds multi-factor composite labels and the feature matrix used for honest training.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

RISK_TIERS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

FEATURE_COLUMNS = [
    "emissions_30d_kg",
    "emissions_90d_kg",
    "air_pct",
    "ocean_pct",
    "truck_pct",
    "rail_pct",
    "avg_carbon_intensity",
    "weight_volatility",
    "shipment_count_30d",
    "shipment_count_90d",
    "emissions_std_90d",
    "emissions_mean_90d",
]


def normalize(series: pd.Series) -> pd.Series:
    """Min-max normalize to [0, 1]."""
    min_val, max_val = float(series.min()), float(series.max())
    if max_val - min_val == 0:
        return pd.Series(0.0, index=series.index)
    return (series - min_val) / (max_val - min_val)


def derive_risk_labels(df: pd.DataFrame, *, noise_std: float = 0.05, random_state: int = 42) -> pd.Series:
    """
    Composite risk labels from multiple emission dimensions (not a single-feature qcut).
    Small Gaussian noise prevents perfect reconstruction from any one column.
    """
    rng = np.random.default_rng(random_state)
    shipment_count_90d = df["shipment_count_90d"].clip(lower=1)
    shipment_count_30d = df["shipment_count_30d"].clip(lower=1)

    dims = {
        "emissions_intensity": normalize(df["emissions_90d_kg"] / shipment_count_90d),
        "trend": normalize(df["emissions_30d_kg"] / (df["emissions_90d_kg"] / 3.0 + 1e-9)),
        "mode_concentration": normalize(df["air_pct"]),
        "volatility": normalize(df["emissions_std_90d"] / (df["emissions_mean_90d"] + 1e-9)),
        "absolute_volume": normalize(df["emissions_90d_kg"]),
    }

    composite = (
        0.30 * dims["emissions_intensity"]
        + 0.25 * dims["trend"]
        + 0.20 * dims["mode_concentration"]
        + 0.15 * dims["volatility"]
        + 0.10 * dims["absolute_volume"]
    )
    composite = composite + rng.normal(0, noise_std, size=len(composite))
    composite = composite.clip(0, 1)

    return pd.cut(
        composite,
        bins=[-0.01, 0.25, 0.50, 0.75, 1.01],
        labels=RISK_TIERS,
    ).astype(str)


def generate_synthetic_supplier_frame(n_suppliers: int = 2500, random_state: int = 42) -> pd.DataFrame:
    """
    Synthetic supplier-level aggregates mirroring shipment_silver_summary rollups.
    Used when DATABASE_URL is unavailable (local training / CI).
    """
    rng = np.random.default_rng(random_state)
    n = n_suppliers

    shipment_count_90d = rng.integers(8, 220, size=n)
    shipment_count_30d = np.maximum(1, (shipment_count_90d * rng.uniform(0.22, 0.48, size=n)).astype(int))
    emissions_90d_kg = rng.lognormal(mean=8.0, sigma=1.1, size=n)
    emissions_30d_kg = emissions_90d_kg * rng.uniform(0.22, 0.42, size=n)

    mode_mix = rng.dirichlet([1.8, 4.5, 2.8, 1.0], size=n)
    air_pct, ocean_pct, truck_pct, rail_pct = mode_mix.T

    avg_weight = rng.lognormal(3.0, 0.55, size=n)
    weight_volatility = rng.lognormal(2.2, 0.45, size=n)
    avg_carbon_intensity = emissions_90d_kg / (shipment_count_90d * avg_weight + 1e-9)

    per_shipment_emissions = emissions_90d_kg / shipment_count_90d
    emissions_mean_90d = per_shipment_emissions
    emissions_std_90d = per_shipment_emissions * rng.uniform(0.12, 0.85, size=n)

    df = pd.DataFrame(
        {
            "supplier_id": [f"SUP-{i:05d}" for i in range(n)],
            "emissions_30d_kg": emissions_30d_kg,
            "emissions_90d_kg": emissions_90d_kg,
            "air_pct": air_pct,
            "ocean_pct": ocean_pct,
            "truck_pct": truck_pct,
            "rail_pct": rail_pct,
            "avg_carbon_intensity": avg_carbon_intensity,
            "weight_volatility": weight_volatility,
            "shipment_count_30d": shipment_count_30d,
            "shipment_count_90d": shipment_count_90d,
            "emissions_std_90d": emissions_std_90d,
            "emissions_mean_90d": emissions_mean_90d,
        }
    )
    df["risk_tier"] = derive_risk_labels(df, random_state=random_state)
    return df


def features_and_labels(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """Return feature matrix X and label series y from a supplier aggregate frame."""
    missing = [c for c in FEATURE_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"Missing feature columns: {missing}")
    if "risk_tier" not in df.columns:
        raise ValueError("DataFrame must include risk_tier column")
    x = df[FEATURE_COLUMNS].astype(float)
    y = df["risk_tier"].astype(str)
    return x, y
