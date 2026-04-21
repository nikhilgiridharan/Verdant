import { useEffect, useState } from "react";
import { pauseGoFundMeAudio, playGoFundMeAudio } from "../utils/goFundMeAudio.js";

export default function GoFundMe() {
  const [needsManualStart, setNeedsManualStart] = useState(false);

  const tryPlay = () => {
    playGoFundMeAudio()
      .then((player) => {
        setTimeout(() => {
          const state = player?.getPlayerState?.();
          if (state !== window.YT?.PlayerState?.PLAYING) {
            setNeedsManualStart(true);
          } else {
            setNeedsManualStart(false);
          }
        }, 250);
      })
      .catch(() => {
        setNeedsManualStart(true);
      });
  };

  useEffect(() => {
    try {
      tryPlay();
    } catch {
      setNeedsManualStart(true);
    }

    return () => {
      pauseGoFundMeAudio();
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "calc(100vh - 52px - 22px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-base)",
        padding: 16,
      }}
    >
      <img
        src="/go-fund-me.png"
        alt="Go Fund Me"
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          borderRadius: "var(--radius-md)",
        }}
      />
      {needsManualStart && (
        <button
          type="button"
          onClick={tryPlay}
          style={{
            position: "absolute",
            right: 24,
            bottom: 24,
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          Play audio
        </button>
      )}
    </div>
  );
}
