from __future__ import annotations

from datetime import datetime, timedelta, timezone


class EmissionsForecaster:
    """STUB: simple extrapolation; DS replaces with XGBoost."""

    def forecast(self, supplier_id: str, horizon_days: int = 30) -> dict:
        base = 1000.0 + (hash(supplier_id) % 5000)
        pts = []
        now = datetime.now(timezone.utc).date()
        for i in range(horizon_days):
            d = now + timedelta(days=i + 1)
            pred = max(0.0, base * (1 + 0.002 * i))
            band = pred * 0.15
            pts.append(
                {
                    "date": d.isoformat(),
                    "predicted_kg": pred,
                    "lower_bound": pred - band,
                    "upper_bound": pred + band,
                }
            )
        return {
            "supplier_id": supplier_id,
            "horizon_days": horizon_days,
            "forecast": pts,
            "model_version": "stub-1.0",
        }
