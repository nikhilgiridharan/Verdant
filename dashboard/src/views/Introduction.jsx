import { useNavigate } from "react-router-dom";

const techBadges = ["Kafka", "PySpark", "dbt", "Airflow", "Snowflake", "FastAPI", "React", "Mapbox", "LightGBM", "EPA v1.4.0"];

export default function Introduction() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        color: "var(--text-primary)",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 0,
          fontSize: 120,
          fontWeight: 800,
          lineHeight: 0.85,
          color: "var(--green-100)",
          fontFamily: "var(--font-display)",
          letterSpacing: "-0.04em",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        01
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 720,
          margin: "0 auto",
          padding: "72px 32px 96px",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 40,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--green-600)",
            fontFamily: "var(--font-display)",
          }}
        >
          Verdant
        </div>

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 48,
            lineHeight: 1,
            margin: 0,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          <span style={{ fontWeight: 300 }}>Scope 3</span>
          <br />
          <span style={{ fontWeight: 800 }}>Intelligence.</span>
        </h1>

        <div
          style={{
            width: 48,
            height: 2,
            background: "var(--green-500)",
            margin: "24px 0",
          }}
        />

        <p
          style={{
            fontFamily: "var(--font-reading)",
            fontSize: 18,
            lineHeight: 1.65,
            color: "var(--text-secondary)",
            maxWidth: 560,
            margin: 0,
          }}
        >
          Track carbon emissions across your supply chain — down to the supplier, shipment, and SKU.
        </p>

        <div
          style={{
            borderTop: "1px solid var(--border-subtle)",
            margin: "48px 0 40px",
            paddingTop: 40,
          }}
        >
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "var(--text-tertiary)",
              fontWeight: 600,
              fontFamily: "var(--font-display)",
              marginBottom: 20,
            }}
          >
            At a glance
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 24,
              fontFamily: "var(--font-reading)",
            }}
          >
            {[
              { value: "500", label: "Suppliers" },
              { value: "50k", label: "Shipments" },
              { value: "EPA v1.4.0", label: "Factors" },
            ].map((s, idx) => (
              <div
                key={s.label}
                style={{
                  textAlign: idx === 1 ? "center" : idx === 2 ? "right" : "left",
                  borderLeft: idx === 0 ? "none" : "1px solid var(--border-subtle)",
                  paddingLeft: idx === 0 ? 0 : 24,
                }}
              >
                <div style={{ fontSize: 28, fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>{s.value}</div>
                <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 6 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "var(--text-tertiary)",
              fontWeight: 600,
              fontFamily: "var(--font-display)",
              marginBottom: 20,
            }}
          >
            What it does
          </div>
          <div style={{ display: "grid", gap: 16 }}>
            {[
              "Ingests supplier shipment data via Kafka at 100 events/sec",
              "Maps every shipment to EPA v1.4.0 emission factors",
              "Scores supplier risk with LightGBM, updated every 15 min",
            ].map((row) => (
              <p key={row} style={{ fontFamily: "var(--font-reading)", fontSize: 16, lineHeight: 1.55, color: "var(--text-secondary)", margin: 0 }}>
                {row}
              </p>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 48 }}>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "var(--text-tertiary)",
              fontWeight: 600,
              fontFamily: "var(--font-display)",
              marginBottom: 16,
            }}
          >
            Built with
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "center",
            }}
          >
            {techBadges.map((badge) => (
              <span
                key={badge}
                style={{
                  display: "inline-block",
                  padding: "8px 16px",
                  borderRadius: 999,
                  border: "1px solid var(--border-default)",
                  background: "var(--bg-subtle)",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.02em",
                }}
              >
                {badge}
              </span>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          style={{
            background: "var(--green-500)",
            color: "var(--text-inverse)",
            padding: "14px 28px",
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--font-display)",
            letterSpacing: "0.02em",
          }}
        >
          Open emissions map →
        </button>
      </div>
    </div>
  );
}
