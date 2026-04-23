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
        background: "radial-gradient(ellipse 120% 80% at 50% 20%, color-mix(in srgb, var(--color-warning-bg) 90%, var(--bg-base)) 0%, var(--bg-base) 55%, color-mix(in srgb, var(--teal-50) 40%, var(--bg-base)) 100%)",
        padding: 28,
        position: "relative",
      }}
    >
      <div
        style={{
          maxWidth: 560,
          width: "100%",
          padding: "20px 20px 24px",
          borderRadius: "var(--radius-xl)",
          background: "color-mix(in srgb, var(--bg-surface) 92%, var(--color-warning-bg) 8%)",
          border: "1px solid color-mix(in srgb, var(--color-warning-border) 70%, var(--border-default))",
          boxShadow: "var(--shadow-lg), 0 0 0 1px rgba(255,255,255,0.6) inset",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--color-warning)",
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          Conclusion
        </div>
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
            maxHeight: "min(72vh, 520px)",
            objectFit: "contain",
            borderRadius: "var(--radius-md)",
            touchAction: "manipulation",
            display: "block",
            margin: "0 auto",
            outline: "3px solid color-mix(in srgb, var(--color-warning) 25%, transparent)",
            outlineOffset: 6,
          }}
        />
      </div>
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
              border: "1px solid color-mix(in srgb, var(--color-warning-border) 80%, var(--border-default))",
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
              fontFamily: "var(--font-display)",
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
            border: "1px solid color-mix(in srgb, var(--color-warning-border) 80%, var(--border-default))",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            padding: "12px 16px",
            minHeight: 44,
            minWidth: 44,
            cursor: "pointer",
            touchAction: "manipulation",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
          }}
        >
          Play audio
        </button>
      )}
    </div>
  );
}
