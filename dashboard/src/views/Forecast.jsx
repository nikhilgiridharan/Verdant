import { useEffect, useState } from "react";
import axios from "axios";
import ForecastChart from "../components/charts/ForecastChart.jsx";
import { apiBaseUrl } from "../utils/constants.js";

const client = axios.create({ baseURL: apiBaseUrl() });

export default function Forecast() {
  const [supplier, setSupplier] = useState("SUP-00001");
  const [fc, setFc] = useState(null);

  useEffect(() => {
    client.get(`/forecasts/supplier/${encodeURIComponent(supplier)}`, { params: { horizon: 30 } }).then((r) => setFc(r.data));
  }, [supplier]);

  const hist = (fc?.forecast || []).slice(0, 10).map((p) => ({
    date: p.date,
    emissions_kg: p.predicted_kg * 0.95,
    predicted_kg: null,
    lower_bound: null,
    upper_bound: null,
  }));
  const fut = (fc?.forecast || []).map((p) => ({
    date: p.date,
    emissions_kg: null,
    predicted_kg: p.predicted_kg,
    lower_bound: p.lower_bound,
    upper_bound: p.upper_bound,
  }));

  return (
    <div style={{ padding: 24, background: "var(--bg-base)", minHeight: "100%" }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>
        Emissions forecast
      </div>
      <input
        value={supplier}
        onChange={(e) => setSupplier(e.target.value)}
        style={{
          width: "min(100%, 360px)",
          padding: "7px 12px",
          marginBottom: 16,
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-default)",
          background: "var(--bg-subtle)",
          color: "var(--text-primary)",
          fontFamily: "var(--font-sans)",
          fontSize: 13,
        }}
      />
      <div className="panel" style={{ padding: 20, boxShadow: "var(--shadow-card)" }}>
        <ForecastChart history={hist} forecast={fut} />
      </div>
    </div>
  );
}
