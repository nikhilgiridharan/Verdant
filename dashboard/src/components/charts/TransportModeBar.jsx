import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const fills = {
  AIR: "#C2410C",
  OCEAN: "#3D8C21",
  TRUCK: "#D97706",
  RAIL: "#2A9E94",
};

export default function TransportModeBar({ data }) {
  const rows = data || [];
  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <BarChart data={rows}>
          <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
          <XAxis dataKey="mode" tick={{ fill: "var(--text-tertiary)", fontSize: 11 }} axisLine={{ stroke: "var(--border-default)" }} />
          <YAxis tick={{ fill: "var(--text-tertiary)", fontSize: 11 }} axisLine={{ stroke: "var(--border-default)" }} />
          <Tooltip
            contentStyle={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-md)",
            }}
          />
          <Bar dataKey="emissions_kg" radius={[4, 4, 0, 0]}>
            {rows.map((e, i) => (
              <Cell key={i} fill={fills[(e.mode || "").toUpperCase()] || "var(--gray-400)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
