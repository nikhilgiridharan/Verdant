function stripTrailingSlash(s) {
  return s.replace(/\/$/, "");
}

export function apiOrigin() {
  const v = import.meta.env.VITE_API_BASE_URL;
  if (v) return stripTrailingSlash(String(v));
  if (typeof window !== "undefined") return "";
  return "http://localhost:8000";
}

export function apiBaseUrl() {
  const o = apiOrigin();
  return o ? `${o}/api/v1` : "/api/v1";
}

export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

export function wsAlertsUrl() {
  const o = apiOrigin();
  if (o) {
    const u = new URL(o);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    return `${u.origin}/ws/alerts`;
  }
  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${window.location.host}/ws/alerts`;
  }
  return "ws://localhost:8000/ws/alerts";
}

export function wsPipelineUrl() {
  const o = apiOrigin();
  if (o) {
    const u = new URL(o);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    return `${u.origin}/ws/pipeline`;
  }
  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${window.location.host}/ws/pipeline`;
  }
  return "ws://localhost:8000/ws/pipeline";
}
