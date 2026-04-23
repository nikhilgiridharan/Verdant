import { useNavigate } from "react-router-dom";

const techBadges = [
  "Kafka",
  "PySpark",
  "dbt",
  "Airflow",
  "Snowflake",
  "FastAPI",
  "React",
  "Mapbox",
  "LightGBM",
  "EPA v1.4.0",
];

export default function Introduction() {
  const navigate = useNavigate();

  return (
    <div style={{ display: "flex", justifyContent: "center", minHeight: "100%", animation: "fadeIn 0.4s ease forwards", opacity: 0 }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      <div style={{ width: "100%", maxWidth: 680, padding: "48px 24px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 48, fontSize: 13, fontWeight: 600, color: "var(--green-600)" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 3C8 7 5 10 5 14a7 7 0 0 0 14 0c0-4-3-7-7-11z" stroke="var(--green-600)" strokeWidth="1.7" fill="none" />
          </svg>
          <span>Verdant</span>
        </div>

        <h1
          style={{
            fontSize: 36,
            fontWeight: 700,
            fontFamily: "var(--font-display)",
            color: "var(--text-primary)",
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          Scope 3 Emissions Intelligence.
        </h1>

        <p style={{ fontSize: 15, color: "var(--text-secondary)", marginTop: 12, marginBottom: 0 }}>
          Track carbon emissions across your supply chain — down to the supplier, shipment, and SKU.
        </p>

        <div style={{ borderTop: "1px solid var(--border-subtle)", margin: "32px 0" }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", alignItems: "stretch" }}>
          {[
            { value: "500", label: "Suppliers" },
            { value: "50k", label: "Shipments" },
            { value: "EPA v1.4.0", label: "" },
          ].map((s, idx) => (
            <div key={s.value} style={{ textAlign: "center", borderLeft: idx === 0 ? "none" : "1px solid var(--border-subtle)", padding: "4px 8px" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>{s.label || " "}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--border-subtle)", margin: "32px 0" }} />

        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", fontWeight: 600, marginBottom: 16 }}>
          What it does
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {[
            "Ingests supplier shipment data via Kafka at 100 events/sec",
            "Maps every shipment to EPA v1.4.0 emission factors",
            "Scores supplier risk with LightGBM, updated every 15 min",
          ].map((row) => (
            <div key={row} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green-500)", flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{row}</span>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--border-subtle)", margin: "32px 0" }} />

        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", fontWeight: 600, marginBottom: 16 }}>
          Built with
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          {techBadges.map((badge) => (
            <div
              key={badge}
              style={{
                background: "var(--bg-subtle)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "6px 12px",
                fontSize: 12,
                color: "var(--text-secondary)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {badge}
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--border-subtle)", margin: "32px 0" }} />

        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          style={{
            background: "var(--green-500)",
            color: "white",
            padding: "11px 24px",
            borderRadius: "var(--radius-md)",
            fontSize: 13,
            fontWeight: 500,
            border: "none",
            cursor: "pointer",
          }}
        >
          Open emissions map →
        </button>
      </div>
    </div>
  );
}
