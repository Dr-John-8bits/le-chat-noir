import { LCN_ENDPOINTS, FETCH_TIMEOUT_MS, STALE_MS } from "./config.js";

export const STATUS = Object.freeze({
  OK: "ok",
  INVALID: "invalid",
  HTTP_ERROR: "http_error",
  NETWORK_ERROR: "network_error",
  TIMEOUT: "timeout",
});

export function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function firstString(source, keys) {
  if (!source || typeof source !== "object") return "";
  for (const key of keys) {
    const value = asString(source[key]);
    if (value) return value;
  }
  return "";
}

export function parseYear(rawValue) {
  const match = String(rawValue || "").match(/(19|20)\d{2}/);
  return match ? match[0] : "";
}

function normalizeComparableText(value) {
  let raw = asString(value).toLowerCase();
  if (!raw) return "";
  raw = raw.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return raw
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseBooleanish(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  const raw = normalizeComparableText(value);
  return raw === "true" || raw === "1" || raw === "yes" || raw === "oui";
}

export function stripEndcap(showName) {
  return asString(showName).replace(/\s+endcap$/i, "").trim();
}

export function isLiveTrack(meta) {
  const artist = asString(meta && meta.artist);
  const title = asString(meta && meta.title);
  return /\(DIRECT\)/i.test(artist) || /^DIRECT\s*-/i.test(title);
}

export function splitArtistAndTitle(rawValue) {
  const raw = asString(rawValue);
  if (!raw) return { artist: "", title: "" };
  const match = raw.match(/^(.+?)\s+[—-]\s+(.+)$/);
  if (!match) return { artist: "", title: raw };
  return { artist: asString(match[1]), title: asString(match[2]) };
}

export function parseAlbumYearFromTitle(displayTitle) {
  const text = asString(displayTitle);
  if (!text) return { album: "", year: "" };
  const groups = text.match(/\(([^()]*)\)/g);
  if (!groups || !groups.length) return { album: "", year: "" };
  const inside = groups[groups.length - 1].replace(/[()]/g, "").trim();
  if (!inside) return { album: "", year: "" };

  const year = parseYear(inside);
  let album = inside;
  if (year) {
    album = inside.replace(year, "").replace(/[,;/-]\s*$/, "").replace(/\s{2,}/g, " ").trim();
  }
  return { album, year };
}

export function extractNowPlaying(payload) {
  const roots = [];
  if (payload && typeof payload === "object") roots.push(payload);
  if (payload && payload.now_playing && typeof payload.now_playing === "object") {
    roots.push(payload.now_playing);
    if (payload.now_playing.song && typeof payload.now_playing.song === "object") {
      roots.push(payload.now_playing.song);
    }
  }
  if (payload && payload.song && typeof payload.song === "object") roots.push(payload.song);
  if (payload && payload.track && typeof payload.track === "object") roots.push(payload.track);

  let artist = "";
  let title = "";
  let album = "";
  let year = "";

  for (const root of roots) {
    if (!artist) artist = firstString(root, ["artist", "artist_name", "creator", "author", "performer", "dj", "host"]);
    if (!title) title = firstString(root, ["title", "name", "track", "song", "now_playing"]);
    if (!album) album = firstString(root, ["album", "release", "record"]);
    if (!year) year = parseYear(firstString(root, ["year", "date", "released", "release_year"]));
  }

  if (!title && payload) title = asString(payload.now_playing);

  // L'indice DIRECT s'évalue sur les champs bruts : splitArtistAndTitle
  // consommerait le préfixe "DIRECT - " (convention BUTT) comme un nom d'artiste.
  const rawLiveHint = isLiveTrack({ artist, title });

  if (title) {
    const split = splitArtistAndTitle(title);
    if (!artist && split.artist) artist = split.artist;
    title = split.title || title;
  }

  if (title) {
    const parsed = parseAlbumYearFromTitle(title);
    if (!album && parsed.album) album = parsed.album;
    if (!year && parsed.year) year = parsed.year;
  }

  const meta = { artist, title, album, year };
  return { ...meta, isLiveHint: rawLiveHint || isLiveTrack(meta) };
}

export function extractCurrentShow(payload) {
  const roots = [];
  if (payload && typeof payload === "object") roots.push(payload);
  if (payload && payload.current_show && typeof payload.current_show === "object") roots.push(payload.current_show);
  if (payload && payload.show && typeof payload.show === "object") roots.push(payload.show);

  let show = typeof payload === "string" ? asString(payload) : "";
  let kind = "";
  let isLive = false;
  let since = 0;

  for (const root of roots) {
    if (!show) show = firstString(root, ["show", "name", "title", "label"]);
    if (!kind) kind = firstString(root, ["kind", "show_kind", "type"]);
    if (!since) {
      const nextSince = Number(root.since || root.started_at || root.startedAt || 0);
      if (Number.isFinite(nextSince) && nextSince > 0) since = nextSince;
    }
    if (!isLive) {
      isLive = parseBooleanish(root.is_live) || parseBooleanish(root.show_is_live) || kind === "live";
    }
  }

  return { show: stripEndcap(show), kind, isLive, since };
}

export function extractListeners(payload, now = Date.now(), staleMs = STALE_MS.listeners) {
  if (!payload || typeof payload !== "object") {
    return { current: null, peak: null, mount: "", updatedAt: "", isStale: true, isForExpectedMount: false };
  }

  const current = Number(payload.current);
  const peak = Number(payload.peak);
  const mount = asString(payload.mount);
  const updatedAt = asString(payload.updatedAt);
  const updatedMs = Date.parse(updatedAt);
  const isStale = !Number.isFinite(updatedMs) || now - updatedMs > staleMs;

  return {
    current: Number.isFinite(current) ? current : null,
    peak: Number.isFinite(peak) ? peak : null,
    mount,
    updatedAt,
    isStale,
    isForExpectedMount: mount === "/stream.mp3",
  };
}

async function fetchWithTimeout(url, { timeoutMs = FETCH_TIMEOUT_MS, headers } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const separator = url.includes("?") ? "&" : "?";
    return await fetch(`${url}${separator}t=${Date.now()}`, {
      cache: "no-store",
      signal: controller.signal,
      headers,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchEndpoint(url, parse, options = {}) {
  const fetchedAt = Date.now();
  let response;
  try {
    response = await fetchWithTimeout(url, options);
  } catch (error) {
    const isAbort = error && (error.name === "AbortError" || error.name === "TimeoutError");
    return { status: isAbort ? STATUS.TIMEOUT : STATUS.NETWORK_ERROR, data: null, fetchedAt };
  }

  if (!response.ok && response.status !== 206) {
    return { status: STATUS.HTTP_ERROR, data: null, fetchedAt, httpStatus: response.status };
  }

  try {
    const data = await parse(response);
    return { status: STATUS.OK, data, fetchedAt };
  } catch {
    return { status: STATUS.INVALID, data: null, fetchedAt };
  }
}

export function fetchNowPlaying() {
  return fetchEndpoint(LCN_ENDPOINTS.nowPlaying, async (res) => extractNowPlaying(await res.json()));
}

export function fetchCurrentShow() {
  return fetchEndpoint(LCN_ENDPOINTS.currentShow, async (res) => extractCurrentShow(await res.json()));
}

export function fetchListeners() {
  return fetchEndpoint(LCN_ENDPOINTS.listeners, async (res) => extractListeners(await res.json()));
}

// Annonce du prochain épisode des rendez-vous à épisodes.
// Rend une Map « jour|émission » -> { titre, numero, total, date }, où le jour
// est l'identifiant de la grille (mon, tue…). Seules les annonces datées
// d'aujourd'hui aux six jours suivants sont gardées : un fichier qui ne serait
// plus régénéré cesse d'afficher quoi que ce soit dès que la date est passée,
// plutôt que d'annoncer un épisode déjà diffusé.
const DAY_IDS_FROM_UTC = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function extractEpisodes(payload, todayYmd) {
  const episodes = new Map();
  const list = payload && Array.isArray(payload.emissions) ? payload.emissions : [];
  const today = Date.parse(`${todayYmd}T00:00:00Z`);
  if (!Number.isFinite(today)) return episodes;

  for (const item of list) {
    const emission = asString(item && item.emission);
    const titre = asString(item && item.titre);
    const date = asString(item && item.date);
    if (!emission || !titre || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const at = Date.parse(`${date}T00:00:00Z`);
    const ecart = Math.round((at - today) / 86_400_000);
    if (!Number.isFinite(at) || ecart < 0 || ecart > 6) continue;
    const dayId = DAY_IDS_FROM_UTC[new Date(at).getUTCDay()];
    const numero = Number(item.numero);
    const total = Number(item.total);
    episodes.set(`${dayId}|${emission}`, {
      titre,
      date,
      numero: Number.isInteger(numero) && numero > 0 ? numero : null,
      total: Number.isInteger(total) && total > 0 ? total : null,
    });
  }
  return episodes;
}

export function fetchEpisodes(todayYmd) {
  return fetchEndpoint(LCN_ENDPOINTS.episodes, async (res) => extractEpisodes(await res.json(), todayYmd));
}

export function fetchHistoryCsv({ tailBytes } = {}) {
  // tailBytes reste inactif tant que le serveur n'autorise pas Range en CORS
  // (voir docs/SPEC-SERVEUR-HISTORIQUE.md).
  const headers = Number.isFinite(tailBytes) && tailBytes > 0 ? { Range: `bytes=-${tailBytes}` } : undefined;
  return fetchEndpoint(LCN_ENDPOINTS.historyCsv, (res) => res.text(), { headers, timeoutMs: 30_000 });
}
