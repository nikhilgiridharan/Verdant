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
        onPointerDown={() => {
          playGoFundMeAudio().catch(() => {
            /* touch must stay in user-gesture stack for mobile audio */
          });
        }}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          borderRadius: "var(--radius-md)",
          touchAction: "manipulation",
        }}
      />
      {needsManualStart && (
        <button
          type="button"
          onPointerDown={tryPlay}
          onClick={tryPlay}
          style={{
            position: "absolute",
            right: 24,
            bottom: 24,
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            padding: "12px 16px",
            minHeight: 44,
            minWidth: 44,
            cursor: "pointer",
            touchAction: "manipulation",
          }}
        >
          Play audio
        </button>
      )}
    </div>
  );
}
