"""
LightGBM supplier risk classifier — training + honest evaluation.

Audit (2026): This file was a one-line stub. README claimed percentile labels and
lgbm-1.0 versioning, but labels in seed/bootstrap were MD5-hash tiers unrelated to
emissions. Training now uses multi-factor composite labels (risk_features.py), held-out
evaluation, percentile + majority baselines, MLflow logging, and artifact export.
"""

from __future__ import annotations

import json
import os
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import lightgbm as lgb
import mlflow
import numpy as np
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parent
sys.path.insert(0, str(ROOT / "training"))

from risk_features import (  # noqa: E402
    FEATURE_COLUMNS,
    RISK_TIERS,
    derive_risk_labels,
    features_and_labels,
    generate_synthetic_supplier_frame,
)

ARTIFACT_DIR = ROOT / "artifacts"
EVAL_PATH = REPO_ROOT / "docs" / "model_evaluation.json"
MODEL_VERSION = "lgbm-1.0"


def _load_frame_from_db() -> pd.DataFrame | None:
    """Optional: build training frame from Neon/Postgres when DATABASE_URL is set."""
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        return None
    try:
        import psycopg2
        import psycopg2.extras
    except ImportError:
        return None

    sql = """
        SELECT
            supplier_id,
            COALESCE(SUM(CASE WHEN event_at >= NOW() - INTERVAL '30 days'
                THEN emissions_kg_co2e ELSE 0 END), 0)::float AS emissions_30d_kg,
            COALESCE(SUM(CASE WHEN event_at >= NOW() - INTERVAL '90 days'
                THEN emissions_kg_co2e ELSE 0 END), 0)::float AS emissions_90d_kg,
            COALESCE(COUNT(*) FILTER (WHERE event_at >= NOW() - INTERVAL '30 days'), 0)::int
                AS shipment_count_30d,
            COALESCE(COUNT(*) FILTER (WHERE event_at >= NOW() - INTERVAL '90 days'), 0)::int
                AS shipment_count_90d,
            COALESCE(AVG(NULLIF(carbon_intensity, 0))
                FILTER (WHERE event_at >= NOW() - INTERVAL '90 days'), 0)::float
                AS avg_carbon_intensity,
            COALESCE(STDDEV(weight_kg) FILTER (WHERE event_at >= NOW() - INTERVAL '90 days'), 0)::float
                AS weight_volatility,
            COALESCE(
                COUNT(*) FILTER (WHERE transport_mode = 'AIR'
                    AND event_at >= NOW() - INTERVAL '90 days')::float
                / NULLIF(COUNT(*) FILTER (WHERE event_at >= NOW() - INTERVAL '90 days'), 0),
                0
            )::float AS air_pct,
            COALESCE(
                COUNT(*) FILTER (WHERE transport_mode = 'OCEAN'
                    AND event_at >= NOW() - INTERVAL '90 days')::float
                / NULLIF(COUNT(*) FILTER (WHERE event_at >= NOW() - INTERVAL '90 days'), 0),
                0
            )::float AS ocean_pct,
            COALESCE(
                COUNT(*) FILTER (WHERE transport_mode = 'TRUCK'
                    AND event_at >= NOW() - INTERVAL '90 days')::float
                / NULLIF(COUNT(*) FILTER (WHERE event_at >= NOW() - INTERVAL '90 days'), 0),
                0
            )::float AS truck_pct,
            COALESCE(
                COUNT(*) FILTER (WHERE transport_mode = 'RAIL'
                    AND event_at >= NOW() - INTERVAL '90 days')::float
                / NULLIF(COUNT(*) FILTER (WHERE event_at >= NOW() - INTERVAL '90 days'), 0),
                0
            )::float AS rail_pct,
            COALESCE(STDDEV(emissions_kg_co2e)
                FILTER (WHERE event_at >= NOW() - INTERVAL '90 days'), 0)::float AS emissions_std_90d,
            COALESCE(AVG(emissions_kg_co2e)
                FILTER (WHERE event_at >= NOW() - INTERVAL '90 days'), 0)::float AS emissions_mean_90d
        FROM shipment_silver_summary
        GROUP BY supplier_id
        HAVING COUNT(*) FILTER (WHERE event_at >= NOW() - INTERVAL '90 days') >= 5
    """
    try:
        with psycopg2.connect(db_url) as conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql)
            rows = cur.fetchall()
    except Exception as exc:  # noqa: BLE001
        print(f"DB feature load skipped ({exc}); using synthetic data.")
        return None

    if len(rows) < 100:
        print(f"Only {len(rows)} suppliers with enough history; using synthetic data.")
        return None

    df = pd.DataFrame(rows)
    df["risk_tier"] = derive_risk_labels(df, random_state=42)
    return df


def _tier_to_score(tier: str) -> float:
    return {"LOW": 0.15, "MEDIUM": 0.45, "HIGH": 0.72, "CRITICAL": 0.92}.get(tier, 0.5)


def main() -> None:
    started = time.time()
    df = _load_frame_from_db()
    data_source = "database"
    if df is None:
        df = generate_synthetic_supplier_frame(n_suppliers=2500, random_state=42)
        data_source = "synthetic"

    features, labels = features_and_labels(df)

    x_train, x_test, y_train, y_test = train_test_split(
        features,
        labels,
        test_size=0.2,
        random_state=42,
        stratify=labels,
    )

    model = lgb.LGBMClassifier(
        objective="multiclass",
        num_class=len(RISK_TIERS),
        n_estimators=120,
        learning_rate=0.08,
        max_depth=6,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=42,
        verbosity=-1,
    )
    model.fit(x_train, y_train)

    y_pred = model.predict(x_test)
    report = classification_report(y_test, y_pred, labels=RISK_TIERS, output_dict=True, zero_division=0)
    cm = confusion_matrix(y_test, y_pred, labels=RISK_TIERS)

    print("\n=== MODEL EVALUATION (held-out 20% test set) ===")
    print(classification_report(y_test, y_pred, labels=RISK_TIERS, zero_division=0))
    print(f"\nConfusion Matrix:\n{cm}")

    # --- Baseline 1: single-feature percentile (naive approach) ---
    baseline_percentile = pd.qcut(
        x_test["emissions_90d_kg"].rank(method="first"),
        q=4,
        labels=RISK_TIERS,
    ).astype(str)
    baseline_report = classification_report(
        y_test, baseline_percentile, labels=RISK_TIERS, output_dict=True, zero_division=0
    )

    # --- Baseline 2: majority class ---
    most_common = Counter(y_train).most_common(1)[0][0]
    baseline_majority = [most_common] * len(y_test)
    majority_report = classification_report(
        y_test, baseline_majority, labels=RISK_TIERS, output_dict=True, zero_division=0
    )

    model_f1 = report["weighted avg"]["f1-score"]
    pct_f1 = baseline_report["weighted avg"]["f1-score"]
    maj_f1 = majority_report["weighted avg"]["f1-score"]
    lift = model_f1 - pct_f1

    print("\n=== BASELINE COMPARISON ===")
    print(f"Majority class baseline F1:     {maj_f1:.3f}")
    print(f"Percentile cutoff baseline F1:  {pct_f1:.3f}")
    print(f"LightGBM model F1:              {model_f1:.3f}")
    print(f"Lift over percentile baseline:  {lift:+.3f}")

    # --- Save artifacts ---
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    model.booster_.save_model(str(ARTIFACT_DIR / "lgbm_risk_model.txt"))
    with open(ARTIFACT_DIR / "risk_feature_columns.json", "w", encoding="utf-8") as f:
        json.dump(FEATURE_COLUMNS, f, indent=2)
    with open(ARTIFACT_DIR / "risk_model_meta.json", "w", encoding="utf-8") as f:
        json.dump({"model_version": MODEL_VERSION, "risk_tiers": RISK_TIERS}, f, indent=2)

    eval_results = {
        "eval_date": datetime.now(timezone.utc).isoformat(),
        "data_source": data_source,
        "test_set_size": len(x_test),
        "train_set_size": len(x_train),
        "model": "LightGBM",
        "model_version": MODEL_VERSION,
        "baselines": {
            "majority_class": {
                "f1_weighted": round(maj_f1, 4),
                "accuracy": round(majority_report["accuracy"], 4),
            },
            "percentile_cutoff": {
                "f1_weighted": round(pct_f1, 4),
                "accuracy": round(baseline_report["accuracy"], 4),
            },
        },
        "model_metrics": {
            "f1_weighted": round(model_f1, 4),
            "accuracy": round(report["accuracy"], 4),
            "per_class": {
                label: {
                    "precision": round(report[label]["precision"], 4),
                    "recall": round(report[label]["recall"], 4),
                    "f1": round(report[label]["f1-score"], 4),
                    "support": int(report[label]["support"]),
                }
                for label in RISK_TIERS
            },
        },
        "confusion_matrix": cm.tolist(),
        "lift_over_percentile": round(lift, 4),
        "feature_importance": {
            name: round(float(val), 4)
            for name, val in zip(FEATURE_COLUMNS, model.feature_importances_, strict=False)
        },
        "training_duration_seconds": round(time.time() - started, 2),
    }

    EVAL_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(EVAL_PATH, "w", encoding="utf-8") as f:
        json.dump(eval_results, f, indent=2)
    print(f"\nEvaluation saved to {EVAL_PATH}")

    # --- MLflow ---
    mlflow.set_tracking_uri(os.environ.get("MLFLOW_TRACKING_URI", f"file:{REPO_ROOT / 'mlruns'}"))
    mlflow.set_experiment("verdant-risk-model")
    with mlflow.start_run(run_name="lgbm-risk-classifier"):
        mlflow.log_params(
            {
                "model_type": "LightGBM",
                "n_estimators": model.n_estimators,
                "test_size": 0.2,
                "n_features": len(FEATURE_COLUMNS),
                "n_samples_train": len(x_train),
                "n_samples_test": len(x_test),
                "data_source": data_source,
            }
        )
        mlflow.log_metrics(
            {
                "test_f1_weighted": model_f1,
                "test_accuracy": report["accuracy"],
                "baseline_percentile_f1": pct_f1,
                "baseline_majority_f1": maj_f1,
                "lift_over_percentile": lift,
            }
        )
        for label in RISK_TIERS:
            mlflow.log_metrics(
                {
                    f"{label}_precision": report[label]["precision"],
                    f"{label}_recall": report[label]["recall"],
                    f"{label}_f1": report[label]["f1-score"],
                }
            )
        mlflow.lightgbm.log_model(model, "risk_model")
        mlflow.log_artifact(str(EVAL_PATH))

    print("Training complete. Artifacts:", ARTIFACT_DIR)


if __name__ == "__main__":
    main()
