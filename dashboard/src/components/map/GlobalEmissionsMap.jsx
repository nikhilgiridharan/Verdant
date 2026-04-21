import { useCallback, useMemo, useState } from "react";
import Map, { Layer, Source } from "react-map-gl";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import RiskBadge from "../shared/RiskBadge.jsx";
import { MAPBOX_TOKEN } from "../../utils/constants.js";

function riskColor(tier) {
  const t = (tier || "LOW").toUpperCase();
  if (t === "MEDIUM") return "#D97706";
  if (t === "HIGH") return "#C2410C";
  if (t === "CRITICAL") return "#B91C1C";
  return "#3D8C21";
}

function sizeForEmissions(kg) {
  const v = Math.max(0, Math.log10((kg || 1) + 1));
  return Math.min(24, Math.max(6, v * 6));
}

export default function GlobalEmissionsMap({ suppliers, selectedId, onSelect }) {
  const [viewState, setViewState] = useState({
    longitude: 10,
    latitude: 25,
    zoom: 1.6,
    pitch: 0,
  });

  const geojson = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: (suppliers || []).map((s) => ({
        type: "Feature",
        properties: {
          id: s.supplier_id,
          name: s.name,
          country: s.country,
          risk: s.risk_tier,
          emissions: s.emissions_30d_kg,
          r: sizeForEmissions(s.emissions_30d_kg),
          color: riskColor(s.risk_tier),
        },
        geometry: { type: "Point", coordinates: [s.lng, s.lat] },
      })),
    };
  }, [suppliers]);

  const selected = useMemo(() => (suppliers || []).find((s) => s.supplier_id === selectedId), [suppliers, selectedId]);

  const onClick = useCallback(
    (e) => {
      const f = e.features?.[0];
      if (f?.properties?.id) onSelect?.(f.properties.id);
    },
    [onSelect],
  );

  if (!MAPBOX_TOKEN) {
    return (
      <div className="panel" style={{ height: "100%", display: "grid", placeItems: "center", padding: 24, boxShadow: "none" }}>
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
            Mapbox token missing
          </div>
          <div style={{ marginTop: 10, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Set <code style={{ fontFamily: "var(--font-mono)", fontSize: 12, background: "var(--bg-subtle)", padding: "2px 6px", borderRadius: "var(--radius-sm)" }}>VITE_MAPBOX_TOKEN</code> to enable the live emissions map.
          </div>
        </div>
      </div>
    );
  }

  mapboxgl.accessToken = MAPBOX_TOKEN;

  return (
    <div style={{ height: "100%", position: "relative" }}>
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        interactiveLayerIds={["suppliers-circle"]}
        onClick={onClick}
      >
        <Source id="suppliers" type="geojson" data={geojson}>
          <Layer
            id="suppliers-circle"
            type="circle"
            paint={{
              "circle-radius": ["get", "r"],
              "circle-color": ["get", "color"],
              "circle-opacity": 0.85,
              "circle-stroke-width": 1.5,
              "circle-stroke-color": "#FFFFFF",
            }}
          />
        </Source>
      </Map>
      {selected ? (
        <div
          style={{
            position: "absolute",
            left: 16,
            bottom: 16,
            maxWidth: 280,
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-md)",
            padding: "10px 14px",
            fontFamily: "var(--font-sans)",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{selected.name}</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{selected.country}</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
            {(selected.emissions_30d_kg || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} kg CO₂e (30d)
          </div>
          <div style={{ marginTop: 8 }}>
            <RiskBadge tier={selected.risk_tier} />
          </div>
        </div>
      ) : null}
      <div
        style={{
          position: "absolute",
          right: 12,
          top: 12,
          display: "flex",
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={() => setViewState((vs) => ({ ...vs, longitude: 10, latitude: 25, zoom: 1.6 }))}
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text-secondary)",
            padding: "6px 12px",
            cursor: "pointer",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          Reset view
        </button>
      </div>
    </div>
  );
}
