import { useMemo, useState } from "react";
import { useSuppliers } from "../hooks/useSuppliers.js";
import RiskBadge from "../components/shared/RiskBadge.jsx";

function tierDotColor(tier) {
  const t = (tier || "LOW").toUpperCase();
  if (t === "MEDIUM") return "var(--risk-medium)";
  if (t === "HIGH") return "var(--risk-high)";
  if (t === "CRITICAL") return "var(--risk-critical)";
  return "var(--risk-low)";
}

function tierBarColor(tier) {
  return tierDotColor(tier);
}

export default function Suppliers() {
  const [page, setPage] = useState(0);
  const { data, isLoading } = useSuppliers({ limit: 25, offset: page * 25, sort_by: "risk_score", order: "desc" });
  const maxE = useMemo(() => {
    const rows = data?.items || [];
    return Math.max(1, ...rows.map((s) => s.emissions_30d_kg || 0));
  }, [data?.items]);
  const items = data?.items || [];

  return (
    <div style={{ padding: 24, background: "var(--bg-base)", minHeight: "100%" }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>
        Suppliers {data?.total != null ? `(${data.total})` : ""}
      </div>
      <div className="panel" style={{ overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
        <div style={{ overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-sans)", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border-default)" }}>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Supplier
                </th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Country
                </th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Risk
                </th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  30d emissions
                </th>
                <th style={{ textAlign: "right", padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Risk score
                </th>
                <th style={{ textAlign: "right", padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {" "}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => {
                const t = (s.risk_tier || "LOW").toUpperCase();
                const rowRisk = t === "HIGH" || t === "CRITICAL";
                const pct = Math.min(100, Math.round(((s.emissions_30d_kg || 0) / maxE) * 100));
                return (
                  <tr
                    key={s.supplier_id}
                    style={{
                      background: rowRisk ? "var(--risk-high-bg)" : "var(--bg-surface)",
                      borderBottom: "1px solid var(--border-subtle)",
                      borderLeft: rowRisk ? "2px solid var(--risk-high)" : "none",
                    }}
                  >
                    <td style={{ padding: "12px 16px", color: "var(--text-primary)", fontWeight: 500 }}>{s.name}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-primary)" }}>{s.country}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <RiskBadge tier={s.risk_tier} />
                    </td>
                    <td style={{ padding: "12px 16px", minWidth: 200 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ flex: 1, height: 4, background: "var(--gray-100)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: tierBarColor(s.risk_tier), borderRadius: "var(--radius-full)" }} />
                        </div>
                        <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "var(--font-sans)", whiteSpace: "nowrap" }}>{pct}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-primary)" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: tierDotColor(s.risk_tier) }} />
                        {(s.risk_score ?? 0).toFixed(2)}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => {}}
                        style={{
                          background: "var(--bg-surface)",
                          border: "1px solid var(--border-default)",
                          borderRadius: "var(--radius-md)",
                          padding: "5px 10px",
                          fontSize: 12,
                          fontWeight: 500,
                          color: "var(--text-secondary)",
                          cursor: "pointer",
                          fontFamily: "var(--font-sans)",
                        }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {isLoading ? <div style={{ padding: 16, color: "var(--text-tertiary)", fontSize: 13 }}>Loading…</div> : null}
        <div style={{ display: "flex", gap: 10, padding: "12px 16px", borderTop: "1px solid var(--border-subtle)" }}>
          <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} style={btn}>
            Previous
          </button>
          <button type="button" onClick={() => setPage((p) => p + 1)} style={btn}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

const btn = {
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  fontWeight: 500,
  padding: "6px 12px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border-default)",
  background: "var(--bg-surface)",
  color: "var(--text-secondary)",
  cursor: "pointer",
};
