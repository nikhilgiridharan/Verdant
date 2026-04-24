import { useCallback, useMemo, useState } from "react";
import GlobalEmissionsMap from "../components/map/GlobalEmissionsMap.jsx";
import SupplierIntelPanel from "../components/panels/SupplierIntelPanel.jsx";
import AlertFeed from "../components/panels/AlertFeed.jsx";
import MetricCards from "../components/panels/MetricCards.jsx";
import { useEmissionsSummary, useMapData } from "../hooks/useEmissionsData.js";

export default function Dashboard({ liveAlerts }) {
  const { data: summary } = useEmissionsSummary();
  const { data: mapData } = useMapData();
  const [selected, setSelected] = useState(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const handleSelectSupplier = useCallback((id) => setSelected(id), []);
  const API = import.meta.env.VITE_API_BASE_URL || "";

  const suppliers = useMemo(() => mapData || [], [mapData]);

  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - 48px)",
        position: "relative",
        overflow: "hidden",
        padding: 16,
        background: "var(--bg-base)",
      }}
    >
      {/* ── LEFT PANEL (Supplier Intelligence) ── */}
      <div
        style={{
          width: leftOpen ? "280px" : "0px",
          minWidth: leftOpen ? "280px" : "0px",
          overflow: "hidden",
          transition: "width 0.3s ease, min-width 0.3s ease",
          position: "relative",
          flexShrink: 0,
          borderRight: leftOpen ? "1px solid var(--border-default)" : "none",
        }}
      >
        <div style={{ width: "280px", height: "100%", overflowY: "auto" }}>
          <SupplierIntelPanel suppliers={suppliers} selectedId={selected} onSelect={handleSelectSupplier} />
        </div>
      </div>

      {/* Left panel toggle tab */}
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setLeftOpen((prev) => !prev);
          }
        }}
        onClick={() => setLeftOpen((prev) => !prev)}
        style={{
          position: "absolute",
          left: leftOpen ? "280px" : "0px",
          top: "50%",
          transform: "translateY(-50%)",
          transition: "left 0.3s ease",
          zIndex: 20,
          width: "18px",
          height: "52px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderLeft: leftOpen ? "none" : "1px solid var(--border-default)",
          borderRadius: leftOpen ? "0 6px 6px 0" : "0 6px 6px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "2px 0 6px rgba(0,0,0,0.06)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--bg-hover)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--bg-surface)";
        }}
      >
        <span
          style={{
            fontSize: "10px",
            color: "var(--text-tertiary)",
            lineHeight: 1,
            transform: leftOpen ? "rotate(0deg)" : "rotate(180deg)",
            transition: "transform 0.3s ease",
            display: "inline-block",
          }}
        >
          ◀
        </span>
      </div>

      {/* ── CENTER (metrics + map) ── */}
      <div
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          marginLeft: 16,
          marginRight: 16,
        }}
      >
        <div style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "center", justifyContent: "flex-end", flexShrink: 0 }}>
          <a
            href={`${API}/api/v1/report/generate`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              background: "var(--green-500)",
              color: "white",
              borderRadius: "var(--radius-md)",
              fontSize: "12px",
              fontWeight: "500",
              textDecoration: "none",
            }}
          >
            Download ESG Report (PDF)
          </a>
        </div>
        <MetricCards summary={summary} />
        <div
          className="panel cp-dashboard-map-shell"
          style={{
            flex: 1,
            overflow: "hidden",
            padding: 0,
            minHeight: 0,
            marginTop: 10,
            backgroundColor: "var(--bg-surface)",
            backgroundImage: "radial-gradient(circle, var(--gray-200) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        >
          <GlobalEmissionsMap suppliers={suppliers} selectedId={selected} onSelect={handleSelectSupplier} />
        </div>
      </div>

      {/* Right panel toggle tab */}
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setRightOpen((prev) => !prev);
          }
        }}
        onClick={() => setRightOpen((prev) => !prev)}
        style={{
          position: "absolute",
          right: rightOpen ? "320px" : "0px",
          top: "50%",
          transform: "translateY(-50%)",
          transition: "right 0.3s ease",
          zIndex: 20,
          width: "18px",
          height: "52px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRight: rightOpen ? "none" : "1px solid var(--border-default)",
          borderRadius: rightOpen ? "6px 0 0 6px" : "6px 0 0 6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "-2px 0 6px rgba(0,0,0,0.06)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--bg-hover)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--bg-surface)";
        }}
      >
        <span
          style={{
            fontSize: "10px",
            color: "var(--text-tertiary)",
            lineHeight: 1,
            transform: rightOpen ? "rotate(0deg)" : "rotate(180deg)",
            transition: "transform 0.3s ease",
            display: "inline-block",
          }}
        >
          ▶
        </span>
      </div>

      {/* ── RIGHT PANEL (Live Anomalies) ── */}
      <div
        style={{
          width: rightOpen ? "320px" : "0px",
          minWidth: rightOpen ? "320px" : "0px",
          overflow: "hidden",
          transition: "width 0.3s ease, min-width 0.3s ease",
          position: "relative",
          flexShrink: 0,
          borderLeft: rightOpen ? "1px solid var(--border-default)" : "none",
        }}
      >
        <div style={{ width: "320px", height: "100%", overflowY: "auto" }}>
          <AlertFeed liveAlerts={liveAlerts} />
        </div>
      </div>
    </div>
  );
}
