import { useEffect, useState } from "react";
import axios from "axios";
import SankeyDiagram from "../components/charts/SankeyDiagram.jsx";
import { apiBaseUrl } from "../utils/constants.js";

const client = axios.create({ baseURL: apiBaseUrl() });

export default function SKUAttribution() {
  const [sku, setSku] = useState("SKU-00001");
  const [data, setData] = useState(null);

  useEffect(() => {
    client.get(`/skus/${encodeURIComponent(sku)}/sankey`).then((r) => setData(r.data));
  }, [sku]);

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
      <SankeyDiagram nodes={data?.nodes || []} links={data?.links || []} />
    </div>
  );
}
