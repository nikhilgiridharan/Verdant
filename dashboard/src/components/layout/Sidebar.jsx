import { NavLink } from "react-router-dom";
import { playGoFundMeAudio } from "../../utils/goFundMeAudio.js";

const nav = [
  { to: "/", label: "Overview" },
  { to: "/suppliers", label: "Suppliers" },
  { to: "/skus", label: "SKU trace" },
  { to: "/forecast", label: "Forecast" },
  { to: "/quality", label: "Data quality" },
  { to: "/api", label: "API console" },
  { to: "/go-fund-me", label: "Conclusion" },
];

const navLabel = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-tertiary)",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  padding: "16px 16px 4px",
};

export default function Sidebar({ pipelineOk }) {
  return (
    <aside
      style={{
        width: 220,
        minHeight: "100vh",
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border-default)",
        display: "flex",
        flexDirection: "column",
        boxShadow: "none",
      }}
    >
      <div
        style={{
          padding: 20,
          borderBottom: "1px solid var(--border-default)",
          background: "var(--bg-surface)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              minWidth: 40,
              height: 36,
              padding: "0 4px",
              borderRadius: "var(--radius-md)",
              background: "var(--green-500)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              flexShrink: 0,
            }}
          >
            <span aria-hidden style={{ fontSize: 13, lineHeight: 1 }}>
              🕊️
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 3C8 7 5 10 5 14a7 7 0 0 0 14 0c0-4-3-7-7-11z"
                stroke="var(--text-inverse)"
                strokeWidth="1.4"
                fill="none"
              />
            </svg>
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: 15,
                color: "var(--text-primary)",
              }}
            >
              Verdant
            </div>
          </div>
        </div>
      </div>
      <nav style={{ flex: 1, paddingTop: 4 }}>
        <div style={navLabel}>Navigate</div>
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === "/"}
            onPointerDown={() => {
              if (n.to === "/go-fund-me") {
                playGoFundMeAudio().catch(() => {
                  /* keep in same gesture stack as touch (mobile Safari) */
                });
              }
            }}
            onClick={() => {
              if (n.to === "/go-fund-me") {
                playGoFundMeAudio().catch(() => {
                  /* autoplay may still be browser-gated */
                });
              }
            }}
            className={({ isActive }) => `cp-nav-link${isActive ? " cp-nav-link--active" : ""}`}
          >
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="M12 5v2M12 17v2M5 12h2M17 12h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span>{n.label}</span>
          </NavLink>
        ))}
        <a
          href="https://github.com/nikhilgiridharan/CarbonTrace"
          target="_blank"
          rel="noopener noreferrer"
          className="cp-nav-link"
        >
          <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ flexShrink: 0 }}>
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
            />
          </svg>
          <span>GitHub</span>
        </a>
        <a
          href="https://medium.com/@nikhilgiridharan/building-verdant-019e8e44b7b3"
          target="_blank"
          rel="noopener noreferrer"
          className="cp-nav-link"
        >
          <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ flexShrink: 0 }}>
            <path d="M2 6.5A1.5 1.5 0 0 1 3.5 5h17A1.5 1.5 0 0 1 22 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 17.5v-11Zm5.2 9.1c1.85 0 3-1.6 3-3.62 0-2.03-1.15-3.64-3-3.64s-3 1.61-3 3.64c0 2.02 1.15 3.62 3 3.62Zm5.38-.06h.6v-6.96h-.6v6.96Zm3.72.03c1.2 0 2-.9 2-2.09 0-1.3-.89-1.77-1.8-2.13-.73-.29-1.39-.47-1.39-1.01 0-.45.33-.73.86-.73.48 0 .92.22 1.32.56l.68-.89a2.98 2.98 0 0 0-2-.72c-1.18 0-1.94.84-1.94 1.96 0 1.22.9 1.72 1.78 2.05.74.28 1.4.49 1.4 1.09 0 .49-.34.83-.93.83-.58 0-1.14-.28-1.62-.73l-.72.9c.62.58 1.45.91 2.36.91Z" />
          </svg>
          <span>Medium</span>
        </a>
        <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer" className="cp-nav-link">
          <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ flexShrink: 0 }}>
            <path d="M23.5 7.2a2.98 2.98 0 0 0-2.1-2.1C19.5 4.5 12 4.5 12 4.5s-7.5 0-9.4.6a2.98 2.98 0 0 0-2.1 2.1C0 9.1 0 12 0 12s0 2.9.5 4.8a2.98 2.98 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a2.98 2.98 0 0 0 2.1-2.1c.5-1.9.5-4.8.5-4.8s0-2.9-.5-4.8ZM9.6 15.2V8.8L15.8 12l-6.2 3.2Z" />
          </svg>
          <span>Demo</span>
        </a>
      </nav>
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--border-subtle)",
          background: "var(--bg-surface)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
        }}
      >
        <div style={{ color: "var(--text-tertiary)", marginBottom: 6 }}>Pipeline</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              flexShrink: 0,
              background: pipelineOk ? "var(--color-success)" : "var(--color-danger)",
            }}
          />
          <span style={{ color: "var(--text-secondary)" }}>{pipelineOk ? "Healthy" : "Down"}</span>
        </div>
        <div style={{ marginTop: 8 }}>
          <span style={{ color: "var(--text-tertiary)" }}>Last sync </span>
          <span style={{ color: "var(--text-secondary)" }}>live</span>
        </div>
      </div>
    </aside>
  );
}
