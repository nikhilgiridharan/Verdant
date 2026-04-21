const VIDEO_ID = "dQw4w9WgXcQ";
const PLAYER_DIV_ID = "go-fund-me-hidden-yt-player";

let apiPromise = null;
let playerPromise = null;
let playerInstance = null;
let playerReady = false;
let pendingPlay = false;

/** WebKit on phones often blocks audible play unless playback starts muted in the same gesture. */
function useMobileYouTubeWorkaround() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(pointer: coarse)")?.matches) return true;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPod|iPad|Android/i.test(ua)) return true;
  // iPadOS 13+ Safari often reports as Mac with touch.
  if (typeof navigator !== "undefined" && navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) {
    return true;
  }
  return false;
}

function applyIframeCapabilities() {
  const iframe = playerInstance?.getIframe?.();
  if (!iframe) return;
  iframe.setAttribute(
    "allow",
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
  );
  iframe.setAttribute("playsinline", "1");
}

function ensurePlayerContainer() {
  let el = document.getElementById(PLAYER_DIV_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = PLAYER_DIV_ID;
    const mobile = useMobileYouTubeWorkaround();
    el.style.position = "fixed";
    el.style.left = "0";
    el.style.top = "0";
    // iOS often refuses audio in a 1×1 off-tree iframe; keep visually empty but layout-real.
    el.style.width = mobile ? "240px" : "1px";
    el.style.height = mobile ? "135px" : "1px";
    el.style.opacity = "0.02";
    el.style.pointerEvents = "none";
    el.style.zIndex = "-1";
    el.style.overflow = "hidden";
    document.body.appendChild(el);
  }
  return el;
}

function loadYouTubeIframeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousReady === "function") previousReady();
      resolve(window.YT);
    };

    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(script);
    }
  });

  return apiPromise;
}

export function ensureGoFundMeAudioPlayer() {
  if (playerPromise) return playerPromise;

  playerPromise = loadYouTubeIframeApi().then((YT) => {
    ensurePlayerContainer();
    return new Promise((resolve) => {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const mobile = useMobileYouTubeWorkaround();
      playerInstance = new YT.Player(PLAYER_DIV_ID, {
        width: mobile ? "240" : "1",
        height: mobile ? "135" : "1",
        videoId: VIDEO_ID,
        playerVars: {
          autoplay: 0,
          controls: 0,
          playsinline: 1,
          ...(origin ? { origin } : {}),
        },
        events: {
          onReady: () => {
            playerReady = true;
            queueMicrotask(() => {
              applyIframeCapabilities();
            });
            if (pendingPlay) {
              pendingPlay = false;
              startPlaybackFromUserGesture();
            }
            resolve(playerInstance);
          },
        },
      });
    });
  });

  return playerPromise;
}

function startPlaybackFromUserGesture() {
  const p = playerInstance;
  if (!p) return;
  applyIframeCapabilities();
  p.seekTo?.(0, true);

  if (useMobileYouTubeWorkaround()) {
    // Same synchronous stack: start muted (allowed), then unmute right after.
    try {
      p.mute?.();
      p.playVideo?.();
    } catch {
      /* ignore */
    }
    window.setTimeout(() => {
      try {
        p.unMute?.();
        p.setVolume?.(100);
      } catch {
        /* ignore */
      }
    }, 250);
    return;
  }

  try {
    p.unMute?.();
    p.setVolume?.(100);
    p.playVideo?.();
  } catch {
    /* ignore */
  }
}

export function playGoFundMeAudio() {
  if (playerInstance && playerReady) {
    pendingPlay = false;
    try {
      startPlaybackFromUserGesture();
    } catch {
      /* ignore */
    }
    return Promise.resolve(playerInstance);
  }

  pendingPlay = true;
  return ensureGoFundMeAudioPlayer().then((player) => {
    pendingPlay = false;
    if (playerReady) {
      try {
        startPlaybackFromUserGesture();
      } catch {
        /* ignore */
      }
    }
    return player;
  });
}

export function pauseGoFundMeAudio() {
  if (playerInstance) {
    playerInstance.pauseVideo?.();
    playerInstance.seekTo?.(0, true);
  }
}

/** True on phones / coarse pointers — show an explicit tap target if embed audio is blocked. */
export function shouldShowConclusionAudioHint() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(pointer: coarse)")?.matches) return true;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPod|iPad|Android/i.test(ua)) return true;
  if (typeof navigator !== "undefined" && navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) {
    return true;
  }
  return false;
}

/** Used by the Conclusion view to decide whether to show a mobile fallback control. */
export function isGoFundMeAudioPlaying() {
  if (!playerInstance || !playerReady || !window.YT?.PlayerState) return false;
  try {
    return playerInstance.getPlayerState() === window.YT.PlayerState.PLAYING;
  } catch {
    return false;
  }
}
