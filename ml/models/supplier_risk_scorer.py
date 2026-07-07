"""
Supplier risk inference — LightGBM when artifacts exist, hash stub otherwise.

Audit (2026): Was MD5(supplier_id) → tier with model_version stub-1.0. Training now
writes ml/artifacts/lgbm_risk_model.txt; pass emission feature dict from DB aggregates.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import lightgbm as lgb
import numpy as np

RISK_TIERS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
TIER_SCORES = {"LOW": 0.15, "MEDIUM": 0.45, "HIGH": 0.72, "CRITICAL": 0.92}
DEFAULT_ARTIFACT_DIR = Path(__file__).resolve().parents[1] / "artifacts"


class SupplierRiskScorer:
    def __init__(self, artifact_dir: Path | str | None = None) -> None:
        self._booster: lgb.Booster | None = None
        self._feature_columns: list[str] = []
        self._model_version = "stub-1.0"
        self._load_artifacts(Path(artifact_dir) if artifact_dir else DEFAULT_ARTIFACT_DIR)

    def _load_artifacts(self, artifact_dir: Path) -> None:
        model_path = artifact_dir / "lgbm_risk_model.txt"
        cols_path = artifact_dir / "risk_feature_columns.json"
        meta_path = artifact_dir / "risk_model_meta.json"
        if not (model_path.exists() and cols_path.exists()):
            return
        self._booster = lgb.Booster(model_file=str(model_path))
        self._feature_columns = json.loads(cols_path.read_text(encoding="utf-8"))
        if meta_path.exists():
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            self._model_version = meta.get("model_version", "lgbm-1.0")

    def _hash_score(self, supplier_id: str) -> dict:
        score = int(hashlib.md5(supplier_id.encode(), usedforsecurity=False).hexdigest()[:4], 16) / 65535.0
        if score < 0.3:
            tier = "LOW"
        elif score < 0.6:
            tier = "MEDIUM"
        elif score < 0.85:
            tier = "HIGH"
        else:
            tier = "CRITICAL"
        return {
            "supplier_id": supplier_id,
            "risk_score": round(score, 3),
            "risk_tier": tier,
            "model_version": "stub-1.0",
            "scored_at": datetime.now(timezone.utc).isoformat(),
        }

    def score_supplier(self, supplier_id: str, features: dict | None = None) -> dict:
        if self._booster is None or not features:
            return self._hash_score(supplier_id)

        row = np.array([[float(features.get(col, 0.0)) for col in self._feature_columns]], dtype=np.float64)
        proba = self._booster.predict(row)
        if proba.ndim == 1:
            proba = proba.reshape(1, -1)
        pred_idx = int(np.argmax(proba[0]))
        tier = RISK_TIERS[pred_idx] if pred_idx < len(RISK_TIERS) else "MEDIUM"
        tier_score_vector = np.array([TIER_SCORES[t] for t in RISK_TIERS[: proba.shape[1]]])
        risk_score = float(np.dot(proba[0], tier_score_vector))

        return {
            "supplier_id": supplier_id,
            "risk_score": round(risk_score, 3),
            "risk_tier": tier,
            "model_version": self._model_version,
            "scored_at": datetime.now(timezone.utc).isoformat(),
        }

    def score_all_suppliers(self) -> list[dict]:
        raise NotImplementedError("Use ml/score_suppliers.py for batch scoring against the database")
