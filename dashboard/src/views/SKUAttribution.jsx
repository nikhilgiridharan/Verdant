import { useEffect, useMemo, useRef, useState } from "react";
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
  const [skuList, setSkuList] = useState([]);
  const [skuSearch, setSkuSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [skuDisplayName, setSkuDisplayName] = useState("");
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(900);

  useEffect(() => {
    fetch(`${apiBaseUrl()}/skus?limit=200`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.items || data.skus || [];
        setSkuList(list);
      })
      .catch(() => {});
  }, []);

  const fetchSkuName = async (skuId) => {
    const API = import.meta.env.VITE_API_BASE_URL || "";
    try {
      const res = await fetch(`${API}/api/v1/skus/${skuId}`);
      if (!res.ok) return skuId;
      const data = await res.json();
      return data.sku_name || skuId;
    } catch {
      return skuId;
    }
  };

  useEffect(() => {
    if (!sku) return;
    fetchSkuName(sku).then((name) => setSkuDisplayName(name));
  }, [sku]);

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth - 32);
    }
    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth - 32);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    client
      .get(`/skus/${encodeURIComponent(sku)}/sankey`, { signal: controller.signal })
      .then((r) => setData(r.data))
      .catch(() => {
        /* ignore cancelled/failed request */
      });
    return () => controller.abort();
  }, [sku]);

  const { nodes, links } = useMemo(() => {
    const base = sankeyTopSuppliers(data, 10);
    const resolvedSkuName = data?.sku_name || data?.sku_id || skuDisplayName || sku;
    const mappedNodes = (base.nodes || []).map((node) => {
      if (typeof node.id === "string" && node.id.startsWith("sku:")) {
        return { ...node, name: resolvedSkuName };
      }
      return node;
    });
    return { nodes: mappedNodes, links: base.links || [] };
  }, [data, sku, skuDisplayName]);

  return (
    <div
      style={{
        minHeight: "100%",
        padding: "32px 40px",
        width: "100%",
        background: "linear-gradient(165deg, color-mix(in srgb, var(--teal-50) 55%, var(--bg-base)) 0%, var(--bg-base) 42%, var(--bg-subtle) 100%)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: 0,
          width: "100%",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--teal-600)",
                marginBottom: 6,
              }}
            >
              SKU trace · flow attribution
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
              Emissions Sankey
            </h1>
          </div>
          <div style={{ position: "relative", width: "320px", flexShrink: 0 }}>
            <input
              value={skuSearch || sku}
              onChange={(e) => {
                setSkuSearch(e.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => {
                setSkuSearch("");
                setDropdownOpen(true);
              }}
              onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
              placeholder="Search SKUs..."
              aria-label="SKU identifier"
              style={{
                width: "100%",
                padding: "10px 36px 10px 14px",
                fontSize: "14px",
                border: "1.5px solid var(--teal-400)",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-mono)",
                outline: "none",
                cursor: "pointer",
                boxSizing: "border-box",
              }}
            />
            <span
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: `translateY(-50%) rotate(${dropdownOpen ? "180deg" : "0deg"})`,
                transition: "transform 0.2s ease",
                color: "var(--text-tertiary)",
                fontSize: "12px",
                pointerEvents: "none",
              }}
            >
              ▾
            </span>

            {dropdownOpen && (
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
                  maxHeight: "280px",
                  overflowY: "auto",
                }}
              >
                {skuList
                  .filter((row) => {
                    const search = skuSearch.toLowerCase();
                    return (
                      row.sku_id?.toLowerCase().includes(search) ||
                      row.sku_name?.toLowerCase().includes(search) ||
                      row.product_category?.toLowerCase().includes(search)
                    );
                  })
                  .slice(0, 100)
                  .map((row) => (
                    <div
                      key={row.sku_id}
                      onMouseDown={() => {
                        setSku(row.sku_id);
                        setSkuSearch("");
                        setDropdownOpen(false);
                      }}
                      style={{
                        padding: "9px 14px",
                        cursor: "pointer",
                        borderBottom: "1px solid var(--border-subtle)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--bg-hover)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "500",
                          color: "var(--text-primary)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {row.sku_id}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--text-tertiary)",
                          fontFamily: "var(--font-sans)",
                        }}
                      >
                        {row.sku_name} · {row.product_category}
                      </span>
                    </div>
                  ))}
                {skuList.filter((row) => {
                  const search = skuSearch.toLowerCase();
                  return (
                    row.sku_id?.toLowerCase().includes(search) ||
                    row.sku_name?.toLowerCase().includes(search) ||
                    row.product_category?.toLowerCase().includes(search)
                  );
                }).length === 0 && (
                  <div
                    style={{
                      padding: "16px",
                      textAlign: "center",
                      fontSize: "12px",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    No SKUs found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "500px",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            padding: "16px",
          }}
        >
          <div style={{ width: "100%", minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-mono)",
                marginBottom: 12,
                paddingBottom: 10,
                borderBottom: "1px dashed var(--border-default)",
              }}
            >
              Showing top 10 suppliers by emissions for this SKU
            </div>
            <SankeyDiagram nodes={nodes} links={links} width={containerWidth} />
          </div>
        </div>
      </div>
    </div>
  );
}
