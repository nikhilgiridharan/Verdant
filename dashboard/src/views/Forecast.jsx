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

  const fetchForecast = async (selectedSupplierId, horizonDays) => {
    if (!selectedSupplierId) return;
    const API = import.meta.env.VITE_API_BASE_URL || "";
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/api/v1/forecasts/supplier/${selectedSupplierId}?horizon=${horizonDays}`,
      );
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setForecastData(data);
    } catch (err) {
      console.error("Forecast fetch failed:", err);
      setForecastData(null);
    } finally {
      setLoading(false);
    }
  };

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
        padding: "32px 28px 40px",
        backgroundColor: "var(--bg-surface)",
        backgroundImage: `
          linear-gradient(90deg, color-mix(in srgb, var(--color-warning) 12%, transparent) 1px, transparent 1px),
          linear-gradient(color-mix(in srgb, var(--gray-300) 35%, transparent) 1px, transparent 1px)
        `,
        backgroundSize: "28px 100%, 100% 28px",
        backgroundPosition: "0 0, 0 0",
      }}
    >
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
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
        <label
          htmlFor="forecast-supplier"
          style={{
            display: "block",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
            marginBottom: 6,
          }}
        >
          Supplier ID
        </label>
        <input
          id="forecast-supplier"
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          style={{
            width: "min(100%, 360px)",
            padding: "10px 14px",
            marginBottom: 16,
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-strong)",
            borderLeft: "4px solid var(--color-warning)",
            background: "rgba(255,255,255,0.92)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
          }}
        />
        <div
          style={{
            display: "inline-flex",
            background: "var(--bg-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "3px",
            gap: "2px",
            marginBottom: "20px",
          }}
        >
          {[30, 60, 90].map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              style={{
                padding: "6px 16px",
                background: horizon === h ? "var(--bg-surface)" : "transparent",
                color:
                  horizon === h ? "var(--text-primary)" : "var(--text-tertiary)",
                border: "none",
                borderRadius: "var(--radius-sm)",
                fontSize: "12px",
                fontWeight: horizon === h ? "600" : "400",
                cursor: "pointer",
                boxShadow: horizon === h ? "var(--shadow-xs)" : "none",
                transition: "all 0.15s ease",
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
            <div style={{ color: "var(--text-tertiary)", fontSize: 13 }}>Loading forecast…</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={320}>
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
