from __future__ import annotations

import hashlib
from datetime import datetime, timezone


class SupplierRiskScorer:
    """STUB: deterministic risk score; DS replaces with LightGBM."""

    def score_supplier(self, supplier_id: str) -> dict:
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

    def score_all_suppliers(self) -> list[dict]:
        raise NotImplementedError("DS implements batch scoring")
