import { useMemo } from "react";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";

function tierFill(tier) {
  const t = (tier || "LOW").toUpperCase();
  if (t === "MEDIUM") return "var(--risk-medium)";
  if (t === "HIGH") return "var(--risk-high)";
  if (t === "CRITICAL") return "var(--risk-critical)";
  return "var(--risk-low)";
}

export default function SankeyDiagram({ nodes, links }) {
  const supplierTier = useMemo(() => {
    const m = new Map();
    const rank = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
    for (const lk of links || []) {
      const src = lk.source;
      if (typeof src !== "string" || !src.startsWith("supplier:")) continue;
      const label = (lk.label || "LOW").toUpperCase();
      const prev = m.get(src) || "LOW";
      if ((rank[label] ?? 0) > (rank[prev] ?? 0)) m.set(src, label);
    }
    return m;
  }, [links]);

  const layout = useMemo(() => {
    if (!nodes?.length || !links?.length) return null;
    const n = nodes.map((x, i) => ({ ...x, index: i }));
    const nodeById = new Map(n.map((d) => [d.id, d]));
    const linkMap = new Map();
    for (const lk of links) {
      const k = `${lk.source}|||${lk.target}`;
      linkMap.set(k, (linkMap.get(k) || 0) + Number(lk.value || 0));
    }
    const l = [...linkMap.entries()]
      .map(([k, v]) => {
        const [source, target] = k.split("|||");
        return {
          source: nodeById.get(source),
          target: nodeById.get(target),
          value: v,
        };
      })
      .filter((lk) => lk.source && lk.target);
    const sk = sankey().nodeWidth(18).nodePadding(12).extent([
      [1, 1],
      [860, 360],
    ]);
    return sk({ nodes: n, links: l });
  }, [nodes, links]);

  if (!layout) {
    return (
      <div className="panel" style={{ height: 380, display: "grid", placeItems: "center", color: "var(--text-tertiary)" }}>
        No Sankey data
      </div>
    );
  }

  const path = sankeyLinkHorizontal();
  const colorFor = (d) => {
    if (d.type === "transport") return "var(--teal-400)";
    if (d.type === "sku") return "var(--green-400)";
    if (d.type === "supplier") return tierFill(supplierTier.get(d.id));
    return "var(--teal-400)";
  };

  return (
    <svg
      width="100%"
      height="380"
      viewBox="0 0 900 380"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {layout.links.map((l, i) => (
        <path
          key={i}
          d={path(l)}
          fill="none"
          stroke="var(--gray-200)"
          strokeOpacity={0.6}
          strokeWidth={Math.max(1, l.width)}
        />
      ))}
      {layout.nodes.map((d) => (
        <g key={d.id} transform={`translate(${d.x0},${d.y0})`}>
          <rect width={d.x1 - d.x0} height={d.y1 - d.y0} fill={colorFor(d)} opacity={0.9} rx={2} />
          <text x={4} y={16} fill="var(--text-secondary)" style={{ fontFamily: "var(--font-sans)", fontSize: 11 }}>
            {(d.name || "").slice(0, 18)}
          </text>
        </g>
      ))}
    </svg>
  );
}
