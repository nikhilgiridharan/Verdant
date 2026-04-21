from __future__ import annotations


class AnomalyDetector:
    """STUB: DS replaces with Isolation Forest."""

    def detect(self, shipment: dict) -> float:
        emissions = float(shipment.get("emissions_kg_co2e") or 0.0)
        mode = shipment.get("transport_mode", "AIR")
        baseline = {"AIR": 800.0, "OCEAN": 4000.0, "TRUCK": 900.0, "RAIL": 700.0}.get(mode, 1000.0)
        return emissions - 3 * baseline
