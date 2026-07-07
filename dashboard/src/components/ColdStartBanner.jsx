export default function ColdStartBanner() {
  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        background: "var(--color-info-bg)",
        borderBottom: "1px solid var(--color-info-border)",
        color: "var(--teal-600)",
        fontSize: 13,
        lineHeight: 1.4,
      }}
    >
      <span aria-hidden style={{ fontSize: 16, flexShrink: 0 }}>
        ◌
      </span>
      <span>
        API is warming up — free-tier cold start takes ~30s. Data will appear shortly.
      </span>
    </div>
  );
}

export function ApiErrorState({ onRetry }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "50vh",
        padding: 32,
        textAlign: "center",
        gap: 16,
      }}
    >
      <p style={{ fontSize: 15, color: "var(--text-secondary)", maxWidth: 420, lineHeight: 1.5 }}>
        Unable to reach API. The backend may be temporarily unavailable.
      </p>
      <button
        type="button"
        onClick={onRetry}
        style={{
          padding: "10px 20px",
          background: "var(--green-500)",
          color: "var(--text-inverse)",
          border: "none",
          borderRadius: "var(--radius-md)",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        Retry
      </button>
    </div>
  );
}
