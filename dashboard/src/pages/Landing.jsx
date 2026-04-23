import { useNavigate } from "react-router-dom";

const fadeUp = {
  opacity: 0,
  transform: "translateY(20px)",
  animation: "fadeUp 0.6s ease forwards",
};

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ background: "#EEEEE9", minHeight: "100vh", color: "#1C1C1E", position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <header
        style={{
          width: "100%",
          padding: "26px 10% 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div style={{ fontFamily: '"DM Sans", system-ui, -apple-system, sans-serif', fontWeight: 800, fontSize: 24 }}>Verdant</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: '"DM Sans", system-ui, -apple-system, sans-serif' }}>
          <a href="#" style={{ color: "#1C1C1E", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>
            Sign in
          </a>
          <button
            type="button"
            style={{
              border: "none",
              background: "#1C1C1E",
              color: "#FFFFFF",
              borderRadius: 8,
              padding: "10px 16px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Get started
          </button>
        </div>
      </header>

      <section
        style={{
          minHeight: "calc(100vh - 220px)",
          display: "flex",
          alignItems: "center",
          position: "relative",
          backgroundImage: "radial-gradient(circle, #9CA3AF 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      >
        <div style={{ paddingLeft: "10%", maxWidth: 700, position: "relative", zIndex: 2 }}>
          <div
            style={{
              ...fadeUp,
              animationDelay: "0ms",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderRadius: 999,
              background: "#1C1C1E",
              color: "#FFFFFF",
              fontSize: 13,
              fontFamily: '"DM Sans", system-ui, -apple-system, sans-serif',
              fontWeight: 500,
            }}
          >
            <span aria-hidden>●</span>
            <span>Scope 3 Intelligence Platform</span>
          </div>

          <h1
            style={{
              ...fadeUp,
              animationDelay: "150ms",
              margin: "22px 0 0",
              fontFamily: '"DM Sans", "Inter Tight", system-ui, -apple-system, sans-serif',
              fontSize: "clamp(44px, 7vw, 72px)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              fontWeight: 800,
              color: "#1C1C1E",
            }}
          >
            <div>The Emissions</div>
            <div>Intelligence Platform.</div>
          </h1>

          <p
            style={{
              ...fadeUp,
              animationDelay: "300ms",
              marginTop: 22,
              maxWidth: 520,
              fontSize: 18,
              lineHeight: 1.55,
              color: "#6B7280",
              fontWeight: 400,
              fontFamily: '"DM Sans", system-ui, -apple-system, sans-serif',
            }}
          >
            Map supplier shipments to carbon emissions. Score supplier risk. Respond with confidence to ESG disclosure requests.
          </p>

          <div style={{ ...fadeUp, animationDelay: "450ms", marginTop: 40, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              style={{
                border: "none",
                background: "#1C1C1E",
                color: "#FFFFFF",
                borderRadius: 8,
                padding: "14px 28px",
                fontSize: 16,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              View live demo →
            </button>
            <a
              href="https://github.com/nikhilgiridharan/CarbonTrace#readme"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "transparent",
                color: "#1C1C1E",
                border: "1.5px solid #1C1C1E",
                borderRadius: 8,
                padding: "14px 28px",
                fontSize: 16,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Read the docs
            </a>
          </div>
        </div>

        <div
          aria-hidden
          style={{
            position: "absolute",
            right: "-160px",
            top: "12%",
            width: 520,
            height: 520,
            borderRadius: "50%",
            background: "rgba(209, 213, 219, 0.3)",
            zIndex: 1,
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            right: "4%",
            top: "42%",
            width: 340,
            height: 220,
            borderRadius: 24,
            background: "rgba(209, 213, 219, 0.3)",
            border: "1px solid rgba(156, 163, 175, 0.4)",
            zIndex: 1,
          }}
        />
      </section>

      <section style={{ borderTop: "1px solid #D1D5DB", borderBottom: "1px solid #D1D5DB", background: "rgba(255,255,255,0.35)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", textAlign: "center" }}>
          {[
            { value: "500+", label: "Suppliers tracked" },
            { value: "50,000", label: "Shipments analyzed" },
            { value: "EPA v1.4.0", label: "Factors" },
          ].map((s, idx) => (
            <div key={s.label} style={{ padding: "20px 12px", borderLeft: idx === 0 ? "none" : "1px solid #D1D5DB" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#1C1C1E", fontFamily: '"DM Sans", system-ui, -apple-system, sans-serif' }}>{s.value}</div>
              <div style={{ marginTop: 4, color: "#6B7280", fontSize: 13, fontFamily: '"DM Sans", system-ui, -apple-system, sans-serif' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
