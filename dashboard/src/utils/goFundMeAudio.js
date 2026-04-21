const VIDEO_ID = "dQw4w9WgXcQ";
const PLAYER_DIV_ID = "go-fund-me-hidden-yt-player";

let apiPromise = null;
let playerPromise = null;
let playerInstance = null;
let pendingPlay = false;

function ensurePlayerContainer() {
  let el = document.getElementById(PLAYER_DIV_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = PLAYER_DIV_ID;
    el.style.position = "absolute";
    el.style.left = "-9999px";
    el.style.width = "1px";
    el.style.height = "1px";
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
      playerInstance = new YT.Player(PLAYER_DIV_ID, {
        width: "1",
        height: "1",
        videoId: VIDEO_ID,
        playerVars: { autoplay: 0, controls: 0, playsinline: 1 },
        events: {
          onReady: () => {
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

export function playGoFundMeAudio() {
  pendingPlay = true;
  return ensureGoFundMeAudioPlayer().then((player) => {
    pendingPlay = false;
    player?.unMute?.();
    player?.setVolume?.(100);
    player?.seekTo?.(0, true);
    player?.playVideo?.();
    return player;
  });
}

export function pauseGoFundMeAudio() {
  if (playerInstance) {
    playerInstance.pauseVideo?.();
    playerInstance.seekTo?.(0, true);
  }
}
