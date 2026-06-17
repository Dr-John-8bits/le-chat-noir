export const LCN_ENDPOINTS = Object.freeze({
  streamMp3: "https://stream.lechatnoirradio.fr/stream.mp3",
  streamOpus: "https://stream.lechatnoirradio.fr/stream",
  nowPlaying: "https://stream.lechatnoirradio.fr/nowplaying.json",
  currentShow: "https://stream.lechatnoirradio.fr/current-show.json",
  listeners: "https://stream.lechatnoirradio.fr/listeners.json",
  historyCsv: "https://stream.lechatnoirradio.fr/history/nowplaying.csv",
});

export const REFRESH_MS = Object.freeze({
  live: 12_000,
  listeners: 30_000,
  historyPage: 20_000,
});

export const STALE_MS = Object.freeze({
  listeners: 120_000,
  nowPlaying: 90_000,
});

export const FETCH_TIMEOUT_MS = 8_000;
export const DISPLAY_TIME_ZONE = "Europe/Paris";
export const CONTACT_EMAIL = "radio@lechatnoirradio.fr";
export const SITE_URL = "https://lechatnoirradio.fr";

export const HISTORY_PREVIEW_ROWS = 240;
export const HISTORY_CACHE_KEY = "lcn-history-preview-v1";
export const HISTORY_CACHE_AT_KEY = "lcn-history-preview-at";
export const HISTORY_CACHE_MAX_AGE_MS = 3 * 60 * 1000;
