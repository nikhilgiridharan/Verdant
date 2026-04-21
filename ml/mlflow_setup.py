"""MLflow configuration helpers (DS-owned models register here)."""

from __future__ import annotations

import os

import mlflow

EXPERIMENT = "carbonpulse-models"
MODELS = ("supplier-risk-scorer", "emissions-forecaster", "anomaly-detector")


def configure_tracking() -> str:
    uri = os.environ.get("MLFLOW_TRACKING_URI", "http://localhost:5000")
    mlflow.set_tracking_uri(uri)
    mlflow.set_experiment(EXPERIMENT)
    return uri


def log_training_metrics(
    *,
    train_accuracy: float,
    val_accuracy: float,
    feature_importances: dict,
    training_rows: int,
    training_duration_seconds: float,
    model_version: str,
) -> None:
    mlflow.log_metric("train_accuracy", train_accuracy)
    mlflow.log_metric("val_accuracy", val_accuracy)
    mlflow.log_dict(feature_importances, "feature_importances.json")
    mlflow.log_metric("training_rows", training_rows)
    mlflow.log_metric("training_duration_seconds", training_duration_seconds)
    mlflow.set_tag("model_version", model_version)
