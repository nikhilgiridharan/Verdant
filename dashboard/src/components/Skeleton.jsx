export default function Skeleton({ width = "100%", height = 16, style = {}, className = "" }) {
  return (
    <div
      className={`skeleton ${className}`.trim()}
      style={{ width, height, ...style }}
      aria-hidden
    />
  );
}

const cardShell = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-lg)",
  padding: "20px 24px",
  boxShadow: "var(--shadow-card)",
};

export function MetricCardsSkeleton() {
  return (
    <div className="metric-cards-row" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={cardShell}>
          <Skeleton height={12} width="55%" style={{ marginBottom: 8 }} />
          <Skeleton height={28} width="45%" />
          <Skeleton height={12} width="50%" style={{ marginTop: 6 }} />
        </div>
      ))}
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: 200,
        background: "var(--bg-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <Skeleton height={14} width="30%" />
      <Skeleton height="100%" style={{ flex: 1, minHeight: 160 }} />
    </div>
  );
}

export function PanelListSkeleton({ rows = 5 }) {
  return (
    <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <Skeleton height={32} width="100%" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 0" }}>
          <Skeleton height={14} width="70%" />
          <Skeleton height={8} width="100%" />
          <Skeleton height={10} width="40%" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 8, cols = 5 }) {
  return (
    <div style={{ padding: "8px 0" }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, padding: "12px 16px" }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={`h-${i}`} height={12} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: 12,
            padding: "14px 16px",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={`${r}-${c}`} height={14} width={c === 0 ? "80%" : "60%"} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 380 }) {
  return (
    <div className="panel" style={{ padding: 24, border: "1px solid var(--border-default)" }}>
      <Skeleton height={14} width="25%" style={{ marginBottom: 16 }} />
      <Skeleton height={height} width="100%" />
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div style={{ marginBottom: 24 }}>
      <Skeleton height={28} width={220} style={{ marginBottom: 8 }} />
      <Skeleton height={14} width={320} />
    </div>
  );
}
