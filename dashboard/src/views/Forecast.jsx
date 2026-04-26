import { useEffect, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function Forecast() {
  const [supplierId, setSupplierId] = useState("SUP-00001");
  const [horizon, setHorizon] = useState(30);
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [supplierList, setSupplierList] = useState([]);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);

  const fetchForecast = async (id, h) => {
    if (!id) return;
    setLoading(true);
    try {
      const API = import.meta.env.VITE_API_BASE_URL || "";
      const res = await fetch(
        `${API}/api/v1/forecasts/supplier/${id}?horizon=${h}`,
      );
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      setForecastData(data);
    } catch (e) {
      console.error("Forecast failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const API = import.meta.env.VITE_API_BASE_URL || "";
    fetch(`${API}/api/v1/suppliers?limit=500`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.suppliers || [];
        setSupplierList(list);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchForecast(supplierId, horizon);
  }, [supplierId, horizon]);

  const chartData = useMemo(
    () => [
      ...(forecastData?.historical || []).map((d) => ({
        date: d.date,
        actual: d.emissions_kg,
        predicted: null,
        lower: null,
        upper: null,
      })),
      ...(forecastData?.forecast || []).map((d) => ({
        date: d.date,
        actual: null,
        predicted: d.predicted_kg,
        lower: d.lower_bound,
        upper: d.upper_bound,
      })),
    ],
    [forecastData],
  );

  const todayIndex = (forecastData?.historical || []).length - 1;

  return (
    <div
      style={{
        minHeight: "100%",
        padding: "32px 40px",
        width: "100%",
        backgroundColor: "var(--bg-surface)",
        backgroundImage: `
          linear-gradient(90deg, color-mix(in srgb, var(--color-warning) 12%, transparent) 1px, transparent 1px),
          linear-gradient(color-mix(in srgb, var(--gray-300) 35%, transparent) 1px, transparent 1px)
        `,
        backgroundSize: "28px 100%, 100% 28px",
        backgroundPosition: "0 0, 0 0",
      }}
    >
      <div style={{ width: "100%" }}>
        <p
          style={{
            fontFamily: "var(--font-reading)",
            fontSize: 14,
            fontStyle: "italic",
            color: "var(--text-tertiary)",
            margin: "0 0 8px",
            borderBottom: "1px solid var(--border-subtle)",
            paddingBottom: 8,
            display: "inline-block",
          }}
        >
          Analyst notebook · {horizon}-day horizon
        </p>
        <h1
          style={{
            fontFamily: "var(--font-reading)",
            fontSize: 32,
            fontWeight: 600,
            color: "var(--text-primary)",
            margin: "0 0 20px",
            lineHeight: 1.15,
          }}
        >
          Emissions forecast
        </h1>
        <div style={{ position: "relative", width: "340px", marginBottom: "20px" }}>
          <label
            style={{
              fontSize: "11px",
              fontWeight: "600",
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              display: "block",
              marginBottom: "6px",
            }}
          >
            Supplier
          </label>
          <input
            value={
              supplierSearch ||
              supplierList.find((s) => s.supplier_id === supplierId)?.name ||
              supplierId
            }
            onChange={(e) => {
              setSupplierSearch(e.target.value);
              setSupplierDropdownOpen(true);
            }}
            onFocus={(e) => {
              setSupplierSearch("");
              setSupplierDropdownOpen(true);
              e.target.style.borderColor = "var(--green-500)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--border-default)";
              setTimeout(() => setSupplierDropdownOpen(false), 200);
            }}
            placeholder="Search suppliers..."
            style={{
              width: "100%",
              padding: "10px 14px",
              fontSize: "13px",
              border: "1.5px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-sans)",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {supplierDropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-md)",
                zIndex: 100,
                maxHeight: "260px",
                overflowY: "auto",
              }}
            >
              {supplierList
                .filter((s) => {
                  const q = supplierSearch.toLowerCase();
                  return (
                    !q ||
                    s.name?.toLowerCase().includes(q) ||
                    s.supplier_id?.toLowerCase().includes(q) ||
                    s.country?.toLowerCase().includes(q)
                  );
                })
                .slice(0, 80)
                .map((s) => (
                  <div
                    key={s.supplier_id}
                    onMouseDown={() => {
                      setSupplierId(s.supplier_id);
                      setSupplierSearch("");
                      setSupplierDropdownOpen(false);
                    }}
                    style={{
                      padding: "9px 14px",
                      cursor: "pointer",
                      borderBottom: "1px solid var(--border-subtle)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: "500",
                        color: "var(--text-primary)",
                      }}
                    >
                      {s.name || s.supplier_id}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--text-tertiary)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {s.supplier_id} · {s.country}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "20px",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: "600",
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginRight: "4px",
            }}
          >
            Horizon
          </span>
          {[30, 60, 90].map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              style={{
                padding: "5px 14px",
                background:
                  horizon === h ? "var(--green-500)" : "var(--bg-subtle)",
                color: horizon === h ? "white" : "var(--text-secondary)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                fontSize: "12px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {h}D
            </button>
          ))}
        </div>
        <div
          className="panel"
          style={{
            padding: "24px 20px 20px",
            border: "1px solid var(--border-default)",
            borderTop: "3px double color-mix(in srgb, var(--color-warning) 55%, var(--border-default))",
            background: "rgba(255,255,255,0.88)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          {loading ? (
            <div style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
              Loading forecast…
            </div>
          ) : (
            <>
              <div style={{ width: "100%", height: "380px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 8, right: 24, bottom: 8, left: 16 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border-subtle)"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{
                        fontSize: 10,
                        fill: "var(--text-tertiary)",
                        fontFamily: "var(--font-mono)",
                      }}
                      tickFormatter={(v) => (v ? v.slice(5) : "")}
                      interval={Math.floor(chartData.length / 6)}
                    />
                    <YAxis
                      tick={{
                        fontSize: 10,
                        fill: "var(--text-tertiary)",
                        fontFamily: "var(--font-mono)",
                      }}
                      tickFormatter={(v) => `${v.toFixed(0)}`}
                      label={{
                        value: "kg CO2e",
                        angle: -90,
                        position: "insideLeft",
                        style: { fontSize: 10, fill: "var(--text-tertiary)" },
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-default)",
                        borderRadius: "var(--radius-md)",
                        fontSize: "12px",
                        fontFamily: "var(--font-mono)",
                      }}
                      formatter={(value, name) => [
                        value ? `${parseFloat(value).toFixed(1)} kg` : null,
                        name === "actual"
                          ? "Historical"
                          : name === "predicted"
                            ? "Forecast"
                            : null,
                      ]}
                    />
                    <Legend
                      formatter={(v) =>
                        v === "actual"
                          ? "Historical"
                          : v === "predicted"
                            ? `${horizon}-day Forecast`
                            : null
                      }
                    />

                    <Area
                      dataKey="upper"
                      stroke="none"
                      fill="var(--teal-100, #ccfbf1)"
                      fillOpacity={0.4}
                      legendType="none"
                    />
                    <Area
                      dataKey="lower"
                      stroke="none"
                      fill="var(--bg-surface)"
                      fillOpacity={1}
                      legendType="none"
                    />

                    <Line
                      dataKey="actual"
                      stroke="var(--teal-500, #14b8a6)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      connectNulls={false}
                    />
                    <Line
                      dataKey="predicted"
                      stroke="var(--teal-300, #5eead4)"
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      dot={false}
                      connectNulls={false}
                    />

                    {todayIndex >= 0 && (
                      <ReferenceLine
                        x={chartData[todayIndex]?.date}
                        stroke="var(--text-tertiary)"
                        strokeDasharray="3 3"
                        label={{
                          value: "Today",
                          position: "top",
                          style: { fontSize: 10, fill: "var(--text-tertiary)" },
                        }}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {forecastData && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "12px",
                    marginTop: "20px",
                  }}
                >
                  {[
                    {
                      label: "Avg Daily (30d)",
                      value: `${(forecastData.summary?.avg_daily_30d || 0).toFixed(1)} kg`,
                      sub: "Historical baseline",
                      color: "var(--text-primary)",
                    },
                    {
                      label: `${horizon}D Projection`,
                      value: `${((forecastData.summary?.projected_total_kg || 0) / 1000).toFixed(1)}k kg`,
                      sub: forecastData.trend_direction || "STABLE",
                      color:
                        forecastData.trend_direction === "WORSENING"
                          ? "var(--risk-high-text)"
                          : forecastData.trend_direction === "IMPROVING"
                            ? "var(--risk-low-text)"
                            : "var(--text-primary)",
                    },
                    {
                      label: "With Optimization",
                      value: `${((forecastData.scenario_comparison?.optimistic?.total_kg || 0) / 1000).toFixed(1)}k kg`,
                      sub: `Save ${forecastData.scenario_comparison?.optimistic?.savings_pct || 0}% with route changes`,
                      color: "var(--risk-low-text)",
                    },
                  ].map((card) => (
                    <div
                      key={card.label}
                      style={{
                        padding: "16px",
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-default)",
                        borderRadius: "var(--radius-md)",
                        boxShadow: "var(--shadow-xs)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: "600",
                          color: "var(--text-tertiary)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: "6px",
                        }}
                      >
                        {card.label}
                      </div>
                      <div
                        style={{
                          fontSize: "20px",
                          fontWeight: "700",
                          color: card.color,
                          fontFamily: "var(--font-display)",
                        }}
                      >
                        {card.value}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "var(--text-tertiary)",
                          marginTop: "4px",
                        }}
                      >
                        {card.sub}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
