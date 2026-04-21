import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { apiBaseUrl } from "../utils/constants.js";

const client = axios.create({ baseURL: apiBaseUrl() });

function statusDot(status) {
  const s = (status || "").toUpperCase();
  if (s === "HEALTHY") return "var(--color-success)";
  if (s === "DEGRADED") return "var(--color-warning)";
  if (s === "DOWN") return "var(--color-danger)";
  return "var(--text-tertiary)";
}

function statusLabel(status) {
  const s = (status || "").toUpperCase();
  if (s === "HEALTHY") return { text: "Healthy", color: "var(--color-success)" };
  if (s === "DEGRADED") return { text: "Degraded", color: "var(--color-warning)" };
  if (s === "DOWN") return { text: "Down", color: "var(--color-danger)" };
  return { text: status || "Unknown", color: "var(--text-secondary)" };
}

export default function DataQuality() {
  const { data } = useQuery({
    queryKey: ["dq"],
    queryFn: async () => (await client.get("/pipeline/data-quality")).data,
  });
  const { data: pipe } = useQuery({
    queryKey: ["pipeline", "status"],
    queryFn: async () => (await client.get("/pipeline/status")).data,
  });

  const results = Array.isArray(data?.results) ? data.results : [];

  return (
    <div style={{ padding: 24, background: "var(--bg-base)", minHeight: "100%" }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>
        Data quality
      </div>
      <div className="panel" style={{ padding: 20, marginBottom: 16, boxShadow: "var(--shadow-card)" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
          Pipeline components
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
          {(pipe?.components || []).map((c) => {
            const lbl = statusLabel(c.status);
            return (
              <div
                key={c.name}
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-xs)",
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{c.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusDot(c.status) }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: lbl.color }}>{lbl.text}</span>
                </div>
                {c.records_processed != null ? (
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)", marginTop: 8 }}>
                    {c.records_processed} records
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <div className="panel" style={{ padding: 0, overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-default)", background: "var(--bg-subtle)" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Great Expectations — last run
          </div>
          {data?.ran_at ? (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)", marginTop: 6 }}>{data.ran_at}</div>
          ) : null}
        </div>
        {results.length ? (
          <div style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-sans)", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border-default)" }}>
                  <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Expectation
                  </th>
                  <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Result
                  </th>
                  <th style={{ textAlign: "right", padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Detail
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.map((row, i) => {
                  const pass = row.passed !== false;
                  return (
                    <tr
                      key={i}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        background: pass ? "var(--bg-surface)" : "var(--risk-high-bg)",
                        borderLeft: pass ? "none" : "2px solid var(--risk-high)",
                      }}
                    >
                      <td style={{ padding: "12px 16px", color: "var(--text-primary)", fontWeight: 500 }}>{row.expectation}</td>
                      <td style={{ padding: "12px 16px", color: pass ? "var(--color-success)" : "var(--color-danger)", fontWeight: 600 }}>
                        {pass ? "Pass" : "Fail"}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)" }}>
                        {row.unexpected_rows != null ? `${row.unexpected_rows} rows` : row.mean != null ? row.mean.toFixed(4) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <pre
            style={{
              margin: 0,
              padding: 20,
              whiteSpace: "pre-wrap",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--text-secondary)",
              lineHeight: 1.5,
            }}
          >
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
