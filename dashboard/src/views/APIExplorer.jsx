import { useMemo, useState } from "react";
import axios from "axios";
import { apiBaseUrl } from "../utils/constants.js";

const endpoints = [
  { group: "Emissions", method: "GET", path: "/emissions/summary", desc: "Portfolio emissions summary" },
  { group: "Emissions", method: "GET", path: "/emissions/timeseries?granularity=day&days=30", desc: "Timeseries" },
  { group: "Suppliers", method: "GET", path: "/suppliers/map-data", desc: "Map-optimized supplier nodes" },
  { group: "Suppliers", method: "GET", path: "/suppliers?limit=10&sort_by=risk_score&order=desc", desc: "Supplier list" },
  { group: "SKUs", method: "GET", path: "/skus/SKU-00001/sankey", desc: "Sankey payload" },
  { group: "Forecasts", method: "GET", path: "/forecasts/supplier/SUP-00001?horizon=30", desc: "Forecast stub" },
  { group: "Pipeline", method: "GET", path: "/pipeline/status", desc: "Pipeline status" },
];

const getBadge = {
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  fontSize: 10,
  fontWeight: 600,
  padding: "2px 6px",
  borderRadius: "var(--radius-sm)",
};

const postBadge = {
  background: "#f0fdf4",
  color: "#166534",
  border: "1px solid #bbf7d0",
  fontSize: 10,
  fontWeight: 600,
  padding: "2px 6px",
  borderRadius: "var(--radius-sm)",
};

export default function APIExplorer() {
  const [active, setActive] = useState(endpoints[0]);
  const [out, setOut] = useState("");
  const [ms, setMs] = useState(null);
  const [status, setStatus] = useState(null);

  const url = useMemo(() => `${apiBaseUrl()}${active.path}`, [active]);

  async function run() {
    const t0 = performance.now();
    try {
      const r = await axios.get(url);
      setStatus(r.status);
      setOut(JSON.stringify(r.data, null, 2));
    } catch (e) {
      setStatus(e?.response?.status || 500);
      setOut(JSON.stringify(e?.response?.data || { error: String(e) }, null, 2));
    } finally {
      setMs(Math.round(performance.now() - t0));
    }
  }

  function statusBadgeStyle(code) {
    if (code == null) return {};
    if (code >= 500) {
      return {
        background: "var(--color-danger-bg)",
        color: "var(--color-danger)",
        border: "1px solid var(--color-danger-border)",
      };
    }
    if (code >= 400) {
      return {
        background: "var(--color-warning-bg)",
        color: "var(--color-warning)",
        border: "1px solid var(--color-warning-border)",
      };
    }
    return {
      background: "var(--color-success-bg)",
      color: "var(--color-success)",
      border: "1px solid var(--color-success-border)",
    };
  }

  return (
    <div style={{ padding: 16, display: "grid", gridTemplateColumns: "360px 1fr", gap: 16, height: "calc(100vh - 52px - 22px)", background: "var(--bg-base)" }}>
      <div
        className="panel"
        style={{
          padding: 0,
          overflow: "auto",
          borderRight: "1px solid var(--border-default)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {endpoints.map((e) => (
          <button
            key={e.path}
            type="button"
            onClick={() => setActive(e)}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "12px 14px",
              border: "none",
              borderLeft: active.path === e.path ? "2px solid var(--teal-400)" : "2px solid transparent",
              background: active.path === e.path ? "var(--bg-selected)" : "transparent",
              color: "var(--text-primary)",
              cursor: "pointer",
            }}
          >
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)" }}>{e.group}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, marginTop: 6, wordBreak: "break-all", color: "var(--text-primary)" }}>
              <span style={e.method === "POST" ? postBadge : getBadge}>{e.method}</span> <span style={{ color: "var(--text-secondary)" }}>{e.path}</span>
            </div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-secondary)", marginTop: 6, lineHeight: 1.45 }}>{e.desc}</div>
          </button>
        ))}
      </div>
      <div className="panel" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, minHeight: 0, boxShadow: "var(--shadow-card)" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Request</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, wordBreak: "break-all", color: "var(--text-primary)", background: "var(--bg-subtle)", padding: "8px 12px", borderRadius: "var(--radius-sm)" }}>
          {url}
        </div>
        <button
          type="button"
          onClick={run}
          style={{
            alignSelf: "flex-start",
            padding: "8px 16px",
            cursor: "pointer",
            background: "var(--green-500)",
            color: "var(--text-inverse)",
            border: "none",
            borderRadius: "var(--radius-md)",
            fontSize: 13,
            fontWeight: 500,
            fontFamily: "var(--font-sans)",
          }}
        >
          Execute
        </button>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)" }}>{ms != null ? `${ms} ms` : ""}</span>
          {status != null ? (
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 12,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: "var(--radius-full)",
                ...statusBadgeStyle(status),
              }}
            >
              {status}
            </span>
          ) : null}
        </div>
        <pre
          style={{
            flex: 1,
            overflow: "auto",
            margin: 0,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            lineHeight: 1.5,
            color: "#e2e8f0",
            background: "var(--gray-800)",
            borderRadius: "var(--radius-md)",
            padding: 16,
            minHeight: 200,
          }}
        >
          {out || " "}
        </pre>
      </div>
    </div>
  );
}
