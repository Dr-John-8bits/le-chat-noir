import { LCN_ENDPOINTS } from "./config.js";

export function shouldDisableWebVolumeControl() {
  const nav = globalThis.navigator || {};
  const platform = String(nav.platform || "");
  const userAgent = String(nav.userAgent || "");
  const uaDataPlatform = String((nav.userAgentData && nav.userAgentData.platform) || "");
  const maxTouchPoints = Number(nav.maxTouchPoints || 0);
  const screen = globalThis.screen || {};
  const shortestEdge = Math.min(Number(screen.width || 0) || Infinity, Number(screen.height || 0) || Infinity);

  const explicitIphone =
    /iPhone|iPod/i.test(platform) || /iPhone|iPod/i.test(userAgent) || /iPhone|iPod/i.test(uaDataPlatform);
  if (explicitIphone) return true;

  return (
    /AppleWebKit/i.test(userAgent) &&
    /Mac/i.test(`${platform} ${uaDataPlatform}`) &&
    maxTouchPoints > 1 &&
    shortestEdge < 500
  );
}

const RECONNECT_DELAYS_MS = [2000, 4000, 8000, 16000, 30000];

export function createPlayer({ streamUrl = LCN_ENDPOINTS.streamMp3, artwork = [] } = {}) {
  const audio = document.createElement("audio");
  audio.preload = "none";
  audio.crossOrigin = "anonymous";
  audio.src = streamUrl;

  let state = "idle";
  let wantsPlayback = false;
  let reconnectAttempt = 0;
  let reconnectTimer = 0;
  const listeners = new Set();

  function setState(next) {
    if (state === next) return;
    state = next;
    updateMediaSessionPlaybackState();
    for (const cb of listeners) cb(state);
  }

  function cancelReconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = 0;
    }
    reconnectAttempt = 0;
  }

  function scheduleReconnect() {
    if (!wantsPlayback || reconnectTimer) return;
    const delay = RECONNECT_DELAYS_MS[Math.min(reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)];
    reconnectAttempt += 1;
    reconnectTimer = setTimeout(async () => {
      reconnectTimer = 0;
      if (!wantsPlayback) return;
      try {
        setState("connecting");
        refreshStreamSource();
        audio.load();
        await audio.play();
      } catch {
        scheduleReconnect();
      }
    }, delay);
  }

  audio.addEventListener("playing", () => {
    cancelReconnect();
    setState("playing");
  });

  audio.addEventListener("pause", () => {
    if (!wantsPlayback) setState("paused");
  });

  audio.addEventListener("waiting", () => {
    if (wantsPlayback) setState("connecting");
  });

  audio.addEventListener("error", () => {
    if (wantsPlayback) {
      setState("connecting");
      scheduleReconnect();
    } else {
      setState("error");
    }
  });

  audio.addEventListener("stalled", () => {
    if (wantsPlayback && state === "playing") {
      setState("connecting");
      scheduleReconnect();
    }
  });

  // Connexion toujours neuve : sans cache-buster, le navigateur peut resservir
  // son tampon (on entend le morceau d'avant). Icecast ignore les paramètres d'URL.
  function refreshStreamSource() {
    audio.src = `${streamUrl}${streamUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
  }

  async function play() {
    wantsPlayback = true;
    cancelReconnect();
    try {
      setState("connecting");
      refreshStreamSource();
      audio.load();
      await audio.play();
    } catch {
      wantsPlayback = false;
      setState("error");
    }
  }

  function pause() {
    wantsPlayback = false;
    cancelReconnect();
    audio.pause();
    setState("paused");
  }

  function toggle() {
    if (wantsPlayback) {
      pause();
    } else {
      play();
    }
  }

  function setVolume(value) {
    const normalized = Math.max(0, Math.min(1, Number(value)));
    audio.muted = false;
    audio.volume = Number.isFinite(normalized) ? normalized : 1;
  }

  let lastMetadataKey = "";

  function setMediaSessionMetadata({ title, artist, album } = {}) {
    if (!("mediaSession" in navigator) || typeof globalThis.MediaMetadata !== "function") return;
    const next = {
      title: title || "Le Chat Noir",
      artist: artist || "Le Chat Noir",
      album: album || "Laboratoire radiophonique indépendant",
    };
    // Ne recréer la métadonnée native que si elle change : évite tout
    // scintillement de l'affichage écran verrouillé / Centre de contrôle.
    const key = `${next.title}|${next.artist}|${next.album}`;
    if (key === lastMetadataKey) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ ...next, artwork });
      navigator.mediaSession.setActionHandler("play", play);
      navigator.mediaSession.setActionHandler("pause", pause);
      lastMetadataKey = key;
    } catch {
      /* Media Session indisponible : non bloquant */
    }
  }

  function updateMediaSessionPlaybackState() {
    if (!("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.playbackState = state === "playing" ? "playing" : "paused";
    } catch {
      /* non bloquant */
    }
  }

  return {
    el: audio,
    getState: () => state,
    isPlaying: () => state === "playing" || state === "connecting",
    play,
    pause,
    toggle,
    setVolume,
    setMediaSessionMetadata,
    onStateChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}
