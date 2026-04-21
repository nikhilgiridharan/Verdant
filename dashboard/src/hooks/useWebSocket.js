import { useEffect, useRef, useState } from "react";

export function useWebSocket(urlFactory, { onMessage } = {}) {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    const url = typeof urlFactory === "function" ? urlFactory() : urlFactory;
    if (!url) return undefined;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        setLastMessage(data);
        onMessage?.(data);
      } catch {
        setLastMessage(ev.data);
      }
    };
    return () => ws.close();
  }, [urlFactory, onMessage]);

  return { connected, lastMessage, wsRef };
}
