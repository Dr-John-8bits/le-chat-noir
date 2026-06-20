import { REFRESH_MS, STALE_MS, HISTORY_PREVIEW_ROWS, HISTORY_CACHE_KEY, HISTORY_CACHE_AT_KEY, HISTORY_CACHE_MAX_AGE_MS } from "./config.js";
import { fetchNowPlaying, fetchCurrentShow, fetchHistoryCsv, STATUS } from "./radio-api.js";
import { parseHistoryCsvChunked, enrichHistoryRow } from "./csv.js";
import { createPlayer, shouldDisableWebVolumeControl } from "./player.js";
import { createPoller } from "./poller.js";
import { initScrollTop } from "./scroll-top.js";
import { setTextIfChanged, prefersReducedMotion } from "./ui-states.js";
import { createShowSlotResolver } from "./schedule-match.js";
import { renderHome, renderTodaySlots, renderRecentTracks } from "./renderers/render-home.js";
import { renderSchedule } from "./renderers/render-schedule.js";
import { renderVoices } from "./renderers/render-voices.js";
import { renderAbout } from "./renderers/render-about.js";
import { renderApp, loadAppVersion } from "./renderers/render-app.js";

// Le module actualités (et ses données générées, ~50 Ko) ne se charge
// qu'à l'ouverture de la rubrique — jamais sur la home.
const NEWS_PAGE_SIZE = 6;
let newsModulePromise = null;
function loadNewsModule() {
  if (!newsModulePromise) {
    // Ne pas mémoriser un échec : un blip réseau ne doit pas figer la rubrique.
    newsModulePromise = import("./renderers/render-news.js").catch((error) => {
      newsModulePromise = null;
      throw error;
    });
  }
  return newsModulePromise;
}

const ROUTES = ["accueil", "actualites", "grille", "voix", "apropos", "app"];

const ICONS = {
  play: '<path d="M8 5.5c0-.86.93-1.41 1.68-.98l8.98 5.18a1.14 1.14 0 0 1 0 1.98l-8.98 5.18A1.13 1.13 0 0 1 8 15.88z"></path>',
  pause: '<path d="M7 5.6A1.6 1.6 0 0 1 8.6 4h.8A1.6 1.6 0 0 1 11 5.6v12.8A1.6 1.6 0 0 1 9.4 20h-.8A1.6 1.6 0 0 1 7 18.4zm6 0A1.6 1.6 0 0 1 14.6 4h.8A1.6 1.6 0 0 1 17 5.6v12.8a1.6 1.6 0 0 1-1.6 1.6h-.8a1.6 1.6 0 0 1-1.6-1.6z"></path>',
};

const refs = {
  playButton: document.getElementById("playButton"),
  playIcon: document.getElementById("playIcon"),
  onAirPill: document.getElementById("onAirPill"),
  onAirPillText: document.getElementById("onAirPillText"),
  currentShowText: document.getElementById("currentShowText"),
  liveKicker: document.getElementById("liveKicker"),
  ticker: document.getElementById("ticker"),
  tickerTrack: document.getElementById("tickerTrack"),
  tickerText: document.getElementById("tickerText"),
  tickerTextClone: document.getElementById("tickerTextClone"),
  mainNav: document.getElementById("mainNav"),
  pageView: document.getElementById("pageView"),
};

const initialHash = parseHash();
const state = {
  route: initialHash.route,
  focusedNewsSlug: initialHash.newsSlug,
  selectedNewsYear: "",
  newsVisibleCount: NEWS_PAGE_SIZE,
  currentShow: null,
  currentTrack: null,
  trackSignature: "",
  lastLiveOkAt: 0,
  recentRows: loadPreviewRows(),
  recentLoaded: false,
  selectedScheduleDay: "",
  lastScheduleShowKey: "",
};

function scheduleShowKey() {
  const show = state.currentShow;
  return show ? `${show.show}|${show.isLive}|${show.since}` : "";
}

const resolveShowSlot = createShowSlotResolver();
// Même liste d'artwork que l'ancien site, 180x180 en tête : c'est celle que
// macOS/iOS privilégient pour l'imagette native (Centre de contrôle, écran verrouillé).
const player = createPlayer({
  artwork: [
    { src: new URL("apple-touch-icon.png", window.location.href).href, sizes: "180x180", type: "image/png" },
    { src: new URL("icon-192.png", window.location.href).href, sizes: "192x192", type: "image/png" },
    { src: new URL("icon-512.png", window.location.href).href, sizes: "512x512", type: "image/png" },
  ],
});
document.body.append(player.el);

function parseHash() {
  const raw = String(window.location.hash || "").replace(/^#/, "").trim();
  const [routePart, ...rest] = raw.split("/");
  const route = ROUTES.includes(routePart.toLowerCase()) ? routePart.toLowerCase() : "accueil";
  const newsSlug =
    route === "actualites" && rest.length ? decodeURIComponent(rest.join("/")).trim().toLowerCase() : "";
  return { route, newsSlug };
}

async function renderNewsRoute() {
  refs.pageView.innerHTML = '<p class="status-line is-loading-anim">chargement des actualités</p>';
  let news;
  try {
    news = await loadNewsModule();
  } catch {
    if (state.route !== "actualites") return;
    refs.pageView.innerHTML =
      '<h2 class="page-title">Actualités</h2>' +
      '<p class="status-line is-error">Impossible de charger les actualités pour le moment.</p>' +
      '<p style="margin-top:14px;"><button class="action-button action-button--ghost" type="button" data-news-retry>Réessayer</button></p>';
    return;
  }
  if (state.route !== "actualites") return;

  const item = news.findNewsBySlug(state.focusedNewsSlug);
  if (item) {
    state.selectedNewsYear = String(item.publishedOn || "").slice(0, 4);
    const yearItems = news
      .getSortedNews()
      .filter((i) => String(i.publishedOn || "").startsWith(state.selectedNewsYear));
    const index = yearItems.findIndex((i) => i.slug === item.slug);
    if (index >= 0) state.newsVisibleCount = Math.max(NEWS_PAGE_SIZE, index + 1);
  }

  refs.pageView.innerHTML = news.renderNews({
    year: state.selectedNewsYear,
    visibleCount: state.newsVisibleCount,
    focusedSlug: state.focusedNewsSlug,
  });

  if (state.focusedNewsSlug) {
    window.requestAnimationFrame(() => {
      const target = document.getElementById(`news-${state.focusedNewsSlug}`);
      if (target) target.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }
}

function trackSignatureOf(track) {
  if (!track) return "";
  return [track.artist, track.title, track.album].map((v) => String(v || "").toLowerCase()).join("||");
}

/* ---------- Player UI ---------- */

function updatePlayButton() {
  const playerState = player.getState();
  const showPause = playerState === "playing" || playerState === "connecting";
  refs.playIcon.innerHTML = showPause ? ICONS.pause : ICONS.play;
  refs.playButton.setAttribute("aria-pressed", showPause ? "true" : "false");
  refs.playButton.setAttribute("aria-label", showPause ? "Mettre le direct en pause" : "Lancer le direct");
  refs.playButton.classList.toggle("is-connecting", playerState === "connecting");
}

refs.playButton.addEventListener("click", () => player.toggle());
player.onStateChange(() => {
  updatePlayButton();
  updateLiveUi();
});

// Volume : masqué sur iPhone/iPod (le système n'autorise pas le réglage web),
// synchronisé dans les deux sens avec l'élément audio — comme l'ancien site.
const volumeWrap = document.getElementById("volumeWrap");
const volumeRange = document.getElementById("volumeRange");
if (volumeWrap && volumeRange && !shouldDisableWebVolumeControl()) {
  volumeWrap.hidden = false;
  volumeRange.addEventListener("input", () => {
    player.setVolume(Number(volumeRange.value) / 100);
  });
  player.el.addEventListener("volumechange", () => {
    const percent = String(Math.round(player.el.volume * 100));
    if (volumeRange.value !== percent) volumeRange.value = percent;
  });
}

/* ---------- Bandeau live ---------- */

function buildTickerLabel(track) {
  if (!track || (!track.artist && !track.title)) return "métadonnées momentanément indisponibles";
  const parts = [track.artist, track.title].filter(Boolean);
  const tail = [track.album, track.year].filter(Boolean).join(" · ");
  return tail ? `${parts.join(" — ")}  ·  ${tail}` : parts.join(" — ");
}

function refreshTicker() {
  refs.tickerTrack.classList.remove("is-animated");
  refs.tickerTrack.style.removeProperty("--ticker-distance");
  refs.tickerTrack.style.removeProperty("--ticker-duration");
  if (prefersReducedMotion()) return;

  window.requestAnimationFrame(() => {
    const contentWidth = refs.tickerText.scrollWidth;
    const containerWidth = refs.ticker.clientWidth;
    if (!contentWidth || !containerWidth || contentWidth <= containerWidth - 12) return;
    const distance = contentWidth + 28;
    refs.tickerTrack.style.setProperty("--ticker-distance", `${distance}px`);
    refs.tickerTrack.style.setProperty("--ticker-duration", `${Math.max(14, distance / 26)}s`);
    refs.tickerTrack.classList.add("is-animated");
  });
}

function updateLiveUi() {
  const show = state.currentShow;
  const track = state.currentTrack;
  // current-show.json est la vérité prioritaire ; le préfixe "DIRECT -" de
  // nowplaying (convention BUTT) sert d'indice complémentaire, comme sur l'ancien site.
  const isLive = Boolean((show && show.isLive) || (track && track.isLiveHint));
  const metadataFresh = Date.now() - state.lastLiveOkAt < STALE_MS.nowPlaying;

  const showLabel = show && show.show ? show.show : metadataFresh ? "Programmation en cours" : "Le Chat Noir";
  setTextIfChanged(refs.currentShowText, showLabel);
  setTextIfChanged(refs.liveKicker, isLive ? "// direct" : "// en ce moment");

  const tickerLabel = metadataFresh ? buildTickerLabel(track) : "métadonnées momentanément indisponibles";
  if (setTextIfChanged(refs.tickerText, tickerLabel)) {
    refs.tickerTextClone.textContent = tickerLabel;
    refreshTicker();
  }

  // La pastille décrit l'état de l'antenne, pas l'action de l'auditeur.
  // « à l'antenne » dès que le flux joue réellement OU que les métadonnées
  // sont fraîches (présence confirmée par le serveur).
  const playerState = player.getState();
  let pillText;
  let pillOn = true;
  if (isLive) {
    pillText = "direct — on air";
  } else if (playerState === "connecting") {
    pillText = "connexion…";
  } else if (playerState === "playing" || metadataFresh) {
    pillText = "à l'antenne";
  } else {
    pillText = "hors ligne";
    pillOn = false;
  }
  refs.onAirPill.classList.toggle("is-direct", isLive);
  refs.onAirPill.classList.toggle("is-on", !isLive && pillOn);
  setTextIfChanged(refs.onAirPillText, pillText);

  // Mêmes champs que l'ancien site : titre/artiste/album du morceau réel,
  // tagline en repli — c'est ce que macOS/iOS/Android affichent nativement.
  player.setMediaSessionMetadata({
    title: track && track.title ? track.title : "Le Chat Noir",
    artist: track && track.artist ? track.artist : "Le Chat Noir",
    album: track && track.album ? track.album : "Laboratoire radiophonique indépendant",
  });
}

async function refreshLive() {
  const [showResult, trackResult] = await Promise.all([fetchCurrentShow(), fetchNowPlaying()]);
  const anyOk = showResult.status === STATUS.OK || trackResult.status === STATUS.OK;

  if (showResult.status === STATUS.OK) state.currentShow = showResult.data;
  if (trackResult.status === STATUS.OK && (trackResult.data.title || trackResult.data.artist)) {
    const nextSignature = trackSignatureOf(trackResult.data);
    if (nextSignature && nextSignature !== state.trackSignature) {
      state.trackSignature = nextSignature;
      prependRecentTrack(trackResult.data);
    }
    state.currentTrack = trackResult.data;
  }
  if (anyOk) state.lastLiveOkAt = Date.now();

  updateLiveUi();
  if (state.route === "accueil") updateHomeToday();
  if (state.route === "grille" && scheduleShowKey() !== state.lastScheduleShowKey) {
    renderRoute();
  }
  return anyOk;
}

/* ---------- Derniers passages (home) ---------- */

function loadPreviewRows() {
  try {
    const cachedAt = Number(window.localStorage.getItem(HISTORY_CACHE_AT_KEY) || 0);
    if (!cachedAt || Date.now() - cachedAt > HISTORY_CACHE_MAX_AGE_MS) return [];
    const raw = window.localStorage.getItem(HISTORY_CACHE_KEY);
    if (!raw) return [];
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => enrichHistoryRow(row)).filter(Boolean);
  } catch {
    return [];
  }
}

function savePreviewRows(rows) {
  try {
    window.localStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify(rows.slice(0, HISTORY_PREVIEW_ROWS)));
    window.localStorage.setItem(HISTORY_CACHE_AT_KEY, String(Date.now()));
  } catch {
    /* stockage local indisponible : non bloquant */
  }
}

function prependRecentTrack(track) {
  const head = state.recentRows[0];
  if (head && trackSignatureOf(head) === trackSignatureOf(track)) return;
  const entry = enrichHistoryRow({
    tsIso: new Date().toISOString(),
    artist: track.artist,
    title: track.title,
    album: track.album,
    year: track.year,
  });
  if (!entry) return;
  state.recentRows = [entry, ...state.recentRows].slice(0, HISTORY_PREVIEW_ROWS);
  savePreviewRows(state.recentRows);
  if (state.route === "accueil") updateHomeRecent("ready");
}

async function loadRecentFromCsvOnce() {
  // Un seul recalage CSV, différé après le rendu initial — jamais en boucle (D3).
  if (state.recentLoaded) return;
  state.recentLoaded = true;

  const result = await fetchHistoryCsv();
  if (result.status !== STATUS.OK) {
    if (state.route === "accueil") updateHomeRecent(state.recentRows.length ? "ready" : "error");
    return;
  }

  const rows = await parseHistoryCsvChunked(result.data, { limitFromEnd: HISTORY_PREVIEW_ROWS });
  if (rows.length) {
    state.recentRows = rows;
    savePreviewRows(rows);
  }
  if (state.route === "accueil") updateHomeRecent("ready");
}

function updateHomeRecent(status) {
  const list = document.getElementById("homeRecentList");
  const statusEl = document.getElementById("homeRecentStatus");
  if (!list) return;
  list.innerHTML = renderRecentTracks(state.recentRows);
  if (statusEl) {
    statusEl.classList.toggle("is-error", status === "error");
    statusEl.classList.toggle("is-loading-anim", status === "loading");
    setTextIfChanged(
      statusEl,
      status === "error" ? "historique momentanément inaccessible" : status === "loading" ? "chargement" : "heure de Paris"
    );
  }
}

function updateHomeToday() {
  const list = document.getElementById("homeTodayList");
  if (!list) return;
  const html = renderTodaySlots(state.currentShow, resolveShowSlot);
  if (list.dataset.rendered !== html) {
    list.dataset.rendered = html;
    list.innerHTML = html;
  }
}

/* ---------- Routage ---------- */

function renderRoute() {
  for (const link of refs.mainNav.querySelectorAll("a[data-route]")) {
    const isActive = link.dataset.route === state.route;
    link.classList.toggle("is-active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  }

  const titles = {
    accueil: "Le Chat Noir — laboratoire radiophonique indépendant",
    actualites: "Actualités — Le Chat Noir",
    grille: "Grille des programmes — Le Chat Noir",
    voix: "Voix et formats — Le Chat Noir",
    apropos: "À propos — Le Chat Noir",
    app: "L'app Le Chat Noir — Mac & Linux",
  };
  document.title = titles[state.route] || titles.accueil;

  switch (state.route) {
    case "grille":
      refs.pageView.innerHTML = renderSchedule(state.selectedScheduleDay, state.currentShow, resolveShowSlot);
      state.lastScheduleShowKey = scheduleShowKey();
      break;
    case "actualites":
      renderNewsRoute();
      break;
    case "voix":
      refs.pageView.innerHTML = renderVoices();
      break;
    case "apropos":
      refs.pageView.innerHTML = renderAbout();
      break;
    case "app":
      refs.pageView.innerHTML = renderApp();
      loadAppVersion();
      break;
    default:
      refs.pageView.innerHTML = renderHome();
      updateHomeToday();
      updateHomeRecent(state.recentLoaded ? "ready" : "loading");
      break;
  }
}

refs.pageView.addEventListener("click", (event) => {
  const dayButton = event.target.closest("[data-day]");
  if (dayButton) {
    state.selectedScheduleDay = dayButton.dataset.day;
    renderRoute();
    return;
  }

  if (event.target.closest("[data-news-retry]")) {
    renderNewsRoute();
    return;
  }

  const yearButton = event.target.closest("[data-news-year]");
  if (yearButton) {
    state.selectedNewsYear = yearButton.dataset.newsYear;
    state.newsVisibleCount = NEWS_PAGE_SIZE;
    clearNewsFocus();
    renderRoute();
    return;
  }

  if (event.target.closest("[data-news-more]")) {
    state.newsVisibleCount += NEWS_PAGE_SIZE;
    clearNewsFocus();
    renderRoute();
  }
});

function clearNewsFocus() {
  if (!state.focusedNewsSlug) return;
  state.focusedNewsSlug = "";
  if (state.route === "actualites") window.history.replaceState(null, "", "#actualites");
}

window.addEventListener("hashchange", () => {
  const next = parseHash();
  if (next.route !== state.route || next.newsSlug !== state.focusedNewsSlug) {
    const routeChanged = next.route !== state.route;
    state.route = next.route;
    state.focusedNewsSlug = next.newsSlug;
    renderRoute();
    if (routeChanged && !state.focusedNewsSlug) window.scrollTo({ top: 0, behavior: "auto" });
  }
});

// Flèches clavier sur les onglets (jours de grille, années d'actualités) —
// pattern ARIA tablist porté de l'ancien site.
refs.pageView.addEventListener("keydown", (event) => {
  const tab = event.target.closest('[role="tab"]');
  if (!tab) return;
  const tablist = tab.closest('[role="tablist"]');
  if (!tablist) return;

  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
  const currentIndex = tabs.indexOf(tab);
  let nextIndex = currentIndex;

  if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (currentIndex + 1) % tabs.length;
  else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  else if (event.key === "Home") nextIndex = 0;
  else if (event.key === "End") nextIndex = tabs.length - 1;
  else return;

  event.preventDefault();
  const nextTab = tabs[nextIndex];
  if (!nextTab) return;
  nextTab.focus();
  if (nextTab !== tab) nextTab.click();
});

window.addEventListener("resize", refreshTicker);
initScrollTop();

/* ---------- Démarrage ---------- */

updatePlayButton();
renderRoute();

const livePoller = createPoller(refreshLive, REFRESH_MS.live);
livePoller.start();

setTimeout(() => {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => loadRecentFromCsvOnce(), { timeout: 4000 });
  } else {
    loadRecentFromCsvOnce();
  }
}, 1200);
