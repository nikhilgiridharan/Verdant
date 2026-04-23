import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import SankeyDiagram from "../components/charts/SankeyDiagram.jsx";
import { apiBaseUrl } from "../utils/constants.js";

const client = axios.create({ baseURL: apiBaseUrl() });

/** Keep only top N suppliers by total emissions; rebuild supplier→mode→SKU paths. */
function sankeyTopSuppliers(raw, topN = 10) {
  const links = raw?.links || [];
  if (!links.length) return { nodes: raw?.nodes || [], links: [] };

  const supToMode = links.filter((l) => typeof l.source === "string" && l.source.startsWith("supplier:"));
  const modeToSku = links.filter(
    (l) => typeof l.source === "string" && l.source.startsWith("mode:") && typeof l.target === "string" && l.target.startsWith("sku:")
  );

  const bySup = new Map();
  for (const l of supToMode) {
    const id = l.source;
    bySup.set(id, (bySup.get(id) || 0) + Number(l.value || 0));
  }
  const topIds = new Set(
    [...bySup.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([id]) => id)
  );

  const usedModeSku = new Set();
  const filtered = [];
  for (const l1 of supToMode) {
    if (!topIds.has(l1.source)) continue;
    const v = Number(l1.value || 0);
    const mode = l1.target;
    const l2 = modeToSku.find(
      (l) =>
        l.source === mode &&
        !usedModeSku.has(l) &&
        Math.abs(Number(l.value || 0) - v) <= Math.max(1e-6 * Math.max(v, 1), 1e-9)
    );
    if (!l2) continue;
    usedModeSku.add(l2);
    filtered.push(l1, l2);
  }

  const ids = new Set();
  for (const l of filtered) {
    ids.add(l.source);
    ids.add(l.target);
  }
  const nodes = (raw?.nodes || []).filter((n) => ids.has(n.id));
  return { nodes, links: filtered };
}

export default function SKUAttribution() {
  const [sku, setSku] = useState("SKU-00001");
  const [data, setData] = useState(null);

  useEffect(() => {
    client.get(`/skus/${encodeURIComponent(sku)}/sankey`).then((r) => setData(r.data));
  }, [sku]);

  const { nodes, links } = useMemo(() => sankeyTopSuppliers(data, 10), [data]);

  return (
    <div style={{ padding: 24, background: "var(--bg-base)", minHeight: "100%" }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>
        SKU attribution
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          style={{
            flex: "1 1 280px",
            maxWidth: 480,
            padding: "7px 12px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-default)",
            background: "var(--bg-subtle)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
          }}
        />
      </div>
      <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 8 }}>
        Showing top 10 suppliers by emissions for this SKU
      </div>
      <SankeyDiagram nodes={nodes} links={links} />
    </div>
  );
}
