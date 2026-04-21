const VIDEO_ID = "dQw4w9WgXcQ";
const PLAYER_DIV_ID = "go-fund-me-hidden-yt-player";

let apiPromise = null;
let playerPromise = null;
let playerInstance = null;
let playerReady = false;
let pendingPlay = false;

function ensurePlayerContainer() {
  let el = document.getElementById(PLAYER_DIV_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = PLAYER_DIV_ID;
    // Fixed in-viewport but invisible: some mobile browsers skip audio for
    // off-screen (-9999px) iframes; still no visible UI for the user.
    el.style.position = "fixed";
    el.style.left = "0";
    el.style.top = "0";
    el.style.width = "1px";
    el.style.height = "1px";
    el.style.opacity = "0";
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
      playerInstance = new YT.Player(PLAYER_DIV_ID, {
        width: "1",
        height: "1",
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
            if (pendingPlay) {
              pendingPlay = false;
              playerInstance?.unMute?.();
              playerInstance?.setVolume?.(100);
              playerInstance?.seekTo?.(0, true);
              playerInstance?.playVideo?.();
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
  playerInstance?.unMute?.();
  playerInstance?.setVolume?.(100);
  playerInstance?.seekTo?.(0, true);
  playerInstance?.playVideo?.();
}

export function playGoFundMeAudio() {
  // Mobile Safari only unlocks media if play starts in the same synchronous
  // turn as the user gesture. A fulfilled Promise still runs in a microtask,
  // which is too late — so call playVideo() immediately when already ready.
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
