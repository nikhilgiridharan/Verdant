import { useEffect, useState } from "react";
import {
  isGoFundMeAudioPlaying,
  pauseGoFundMeAudio,
  playGoFundMeAudio,
  shouldShowConclusionAudioHint,
} from "../utils/goFundMeAudio.js";

export default function GoFundMe() {
  const [needsManualStart, setNeedsManualStart] = useState(false);
  const [soundBarVisible, setSoundBarVisible] = useState(() =>
    typeof window !== "undefined" ? shouldShowConclusionAudioHint() : false,
  );

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
        }, 400);
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

  useEffect(() => {
    if (!shouldShowConclusionAudioHint()) return undefined;
    const id = window.setInterval(() => {
      if (isGoFundMeAudioPlaying()) {
        setSoundBarVisible(false);
      }
    }, 350);
    return () => window.clearInterval(id);
  }, []);

  const tapForSound = () => {
    playGoFundMeAudio().catch(() => {
      setNeedsManualStart(true);
    });
  };

  return (
    <div
      style={{
        minHeight: "calc(100vh - 52px - 22px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-base)",
        padding: 16,
        position: "relative",
      }}
    >
      <img
        src="/go-fund-me.png"
        alt="Go Fund Me"
        onPointerDown={() => {
          playGoFundMeAudio().catch(() => {
            setNeedsManualStart(true);
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
      {soundBarVisible && (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 50,
            padding: "12px 16px calc(12px + env(safe-area-inset-bottom, 0px))",
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              tapForSound();
            }}
            style={{
              pointerEvents: "auto",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              padding: "14px 24px",
              minHeight: 48,
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
              touchAction: "manipulation",
              boxShadow: "var(--shadow-md)",
            }}
          >
            Tap for sound
          </button>
        </div>
      )}
      {needsManualStart && !soundBarVisible && (
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
