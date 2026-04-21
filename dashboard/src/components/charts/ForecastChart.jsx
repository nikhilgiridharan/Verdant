import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function ForecastChart({ history, forecast }) {
  const merged = [...(history || []), ...(forecast || [])];
  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <ComposedChart data={merged}>
          <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fill: "var(--text-tertiary)", fontSize: 11 }} axisLine={{ stroke: "var(--border-default)" }} />
          <YAxis tick={{ fill: "var(--text-tertiary)", fontSize: 11 }} axisLine={{ stroke: "var(--border-default)" }} />
          <Tooltip
            contentStyle={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-md)",
            }}
            labelStyle={{ color: "var(--text-secondary)", fontSize: 12 }}
          />
          <Area type="monotone" dataKey="predicted_kg" stroke="none" fill="var(--teal-50)" fillOpacity={0.5} connectNulls />
          <Line type="monotone" dataKey="emissions_kg" stroke="var(--teal-500)" dot={false} strokeWidth={2} connectNulls />
          <Line
            type="monotone"
            dataKey="predicted_kg"
            stroke="var(--teal-300)"
            dot={false}
            strokeWidth={2}
            strokeDasharray="6 3"
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
