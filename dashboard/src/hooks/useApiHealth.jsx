import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiOrigin } from "../utils/constants.js";

const MAX_ATTEMPTS = 12;
const RETRY_MS = 5000;
const WAKING_THRESHOLD_MS = 3000;

const ApiHealthContext = createContext(null);

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function ApiHealthProvider({ children }) {
  const [apiState, setApiState] = useState("cold");
  const [retryKey, setRetryKey] = useState(0);

  const retry = useCallback(() => {
    setApiState("cold");
    setRetryKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const wakingTimer = setTimeout(() => {
      if (!cancelled) {
        setApiState((s) => (s === "cold" ? "waking" : s));
      }
    }, WAKING_THRESHOLD_MS);

    (async () => {
      const healthUrl = `${apiOrigin()}/health`;

      for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
        if (cancelled) return;
        try {
          const res = await fetch(healthUrl, { method: "GET" });
          if (res.ok) {
            if (!cancelled) setApiState("ready");
            return;
          }
        } catch {
          /* retry */
        }
        if (i < MAX_ATTEMPTS - 1 && !cancelled) {
          await sleep(RETRY_MS);
        }
      }

      if (!cancelled) setApiState("error");
    })();

    return () => {
      cancelled = true;
      clearTimeout(wakingTimer);
    };
  }, [retryKey]);

  const value = useMemo(() => {
    const isReady = apiState === "ready";
    const showSkeleton = apiState === "cold" || apiState === "waking";
    return { apiState, isReady, showSkeleton, retry };
  }, [apiState, retry]);

  return <ApiHealthContext.Provider value={value}>{children}</ApiHealthContext.Provider>;
}

export function useApiHealth() {
  const ctx = useContext(ApiHealthContext);
  if (!ctx) {
    throw new Error("useApiHealth must be used within ApiHealthProvider");
  }
  return ctx;
}
