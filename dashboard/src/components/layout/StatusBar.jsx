export default function StatusBar({ text }) {
  return (
    <div
      style={{
        height: 22,
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        borderTop: "1px solid var(--border-subtle)",
        background: "var(--bg-surface)",
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        color: "var(--text-tertiary)",
      }}
    >
      {text}
    </div>
  );
}
