import { Area, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function EmissionsTrend({ data }) {
  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <LineChart data={data || []}>
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
          <Area type="monotone" dataKey="emissions_kg" stroke="none" fill="var(--teal-50)" fillOpacity={0.6} />
          <Line
            type="monotone"
            dataKey="emissions_kg"
            stroke="var(--teal-400)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "var(--teal-400)", stroke: "#fff", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
