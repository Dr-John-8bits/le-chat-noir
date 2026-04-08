const STREAM_URL = "https://stream.lechatnoirradio.fr/stream.mp3";
const NOW_PLAYING_URL = "https://stream.lechatnoirradio.fr/nowplaying.json";
const CURRENT_SHOW_URL = "https://stream.lechatnoirradio.fr/current-show.json";
const HISTORY_CSV_URL = "https://stream.lechatnoirradio.fr/history/nowplaying.csv";
const DISPLAY_TIME_ZONE = "Europe/Paris";
const ROUTES = ["accueil", "actualites", "grille", "historique", "voix", "apropos"];
const DEFAULT_VOLUME = 1;
const LIVE_REFRESH_MS = 12000;
const LIVE_REFRESH_MIN_INTERVAL_MS = 2500;
const HISTORY_REFRESH_MS = 20000;
const FETCH_CACHE_MS = 15000;
const HISTORY_CACHE_KEY = "lcn-history-preview-v1";
const HISTORY_CACHE_AT_KEY = "lcn-history-preview-at";
const HISTORY_CACHE_MAX_ROWS = 240;
const HISTORY_CACHE_MAX_AGE_MS = 3 * 60 * 1000;
const HISTORY_PREVIEW_REFRESH_ROWS = HISTORY_CACHE_MAX_ROWS;
const INITIAL_NEWS_VISIBLE_COUNT = 6;
const DEFAULT_HISTORY_VISIBLE_ROWS = 30;
const HISTORY_LOAD_MORE_STEP = 30;
const HISTORY_INITIAL_DELAY_MS = 900;
const CSV_PARSE_CHUNK_SIZE = 180;
const APP_ICON_180_URL = new URL("apple-touch-icon.png", window.location.href).href;
const APP_ICON_192_URL = new URL("icon-192.png", window.location.href).href;
const APP_ICON_512_URL = new URL("icon-512.png", window.location.href).href;

const ICONS = {
  play:
    '<svg class="player-strip__icon player-strip__icon--play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5c0-.86.93-1.41 1.68-.98l8.98 5.18a1.14 1.14 0 0 1 0 1.98l-8.98 5.18A1.13 1.13 0 0 1 8 15.88z"></path></svg>',
  pause:
    '<svg class="player-strip__icon player-strip__icon--pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5.6A1.6 1.6 0 0 1 8.6 4h.8A1.6 1.6 0 0 1 11 5.6v12.8A1.6 1.6 0 0 1 9.4 20h-.8A1.6 1.6 0 0 1 7 18.4zm6 0A1.6 1.6 0 0 1 14.6 4h.8A1.6 1.6 0 0 1 17 5.6v12.8a1.6 1.6 0 0 1-1.6 1.6h-.8a1.6 1.6 0 0 1-1.6-1.6z"></path></svg>',
};

const COMMON = typeof window.LCNPageCommon === "object" ? window.LCNPageCommon : {};
const CONTENT = typeof window.LCNContentData === "object" ? window.LCNContentData : {};
const APP_UTILS = typeof window.LCNAppUtils === "object" ? window.LCNAppUtils : {};
const RENDERERS_FACTORY = typeof window.LCNAppRenderers === "function" ? window.LCNAppRenderers : null;
const NEWS_ITEMS = Array.isArray(window.LCN_NEWS_ITEMS) ? window.LCN_NEWS_ITEMS.slice() : [];
const PRODUCERS = Array.isArray(CONTENT.PRODUCERS) ? CONTENT.PRODUCERS : [];
const SHOWS = Array.isArray(CONTENT.SHOWS) ? CONTENT.SHOWS : [];
const ABOUT_CHIPS = Array.isArray(CONTENT.ABOUT_CHIPS) ? CONTENT.ABOUT_CHIPS : [];
const SCHEDULE_DAYS = Array.isArray(CONTENT.SCHEDULE_TIMELINE_DAYS) ? CONTENT.SCHEDULE_TIMELINE_DAYS : [];
const asString = APP_UTILS.asString;
const escapeHtml = APP_UTILS.escapeHtml;
const parseYear = APP_UTILS.parseYear;
const firstString = APP_UTILS.firstString;
const detectIOSPhoneDevice = APP_UTILS.detectIOSPhoneDevice;
const parseCsvLine = APP_UTILS.parseCsvLine;
const yieldToBrowser = APP_UTILS.yieldToBrowser;
const getDisplayDateParts = (value) => APP_UTILS.getDisplayDateParts(value, DISPLAY_TIME_ZONE);
const ensureEnrichedRow = (row) => APP_UTILS.ensureEnrichedRow(row, DISPLAY_TIME_ZONE);
const getSortedHistoryRows = (rows) => APP_UTILS.getSortedHistoryRows(rows, DISPLAY_TIME_ZONE);
const getDisplayZoneLabel = () => APP_UTILS.getDisplayZoneLabel(DISPLAY_TIME_ZONE);
const getTodayYmd = () => APP_UTILS.getTodayYmd(DISPLAY_TIME_ZONE);
const formatLocalDate = (isoDate) => APP_UTILS.formatLocalDate(isoDate, DISPLAY_TIME_ZONE);
const formatLocalTime = (isoDate) => APP_UTILS.formatLocalTime(isoDate, DISPLAY_TIME_ZONE);
const formatSinceLabel = (unixSeconds) => APP_UTILS.formatSinceLabel(unixSeconds, DISPLAY_TIME_ZONE);
const buildNowPlayingLabel = APP_UTILS.buildNowPlayingLabel;
const isLiveTrack = APP_UTILS.isLiveTrack;
const getTrackMeta = APP_UTILS.getTrackMeta;
const getTrackSignature = APP_UTILS.getTrackSignature;
const parseAlbumYearFromTitle = APP_UTILS.parseAlbumYearFromTitle;
const splitArtistAndTitle = APP_UTILS.splitArtistAndTitle;

const initialHistoryRows = loadPreviewRows();
let historyRefreshPromise = null;
let historyRefreshScheduled = false;
let historyRefreshTimeoutId = 0;
let historyRefreshIdleId = 0;
let liveRefreshPromise = null;
let liveRefreshAt = 0;
const state = {
  route: getRouteFromHash(),
  isPlaying: false,
  streamAvailable: false,
  isIOSPhone: detectIOSPhoneDevice(),
  volume: DEFAULT_VOLUME,
  hasUserAdjustedVolume: false,
  currentShow: {
    show: "",
    kind: "",
    isLive: false,
    since: 0,
  },
  currentShowLoaded: false,
  currentTrack: {
    artist: "",
    title: "Chargement...",
    album: "",
    year: "",
  },
  isLive: false,
  selectedNewsYear: "",
  newsVisibleCount: INITIAL_NEWS_VISIBLE_COUNT,
  selectedScheduleDay: getCurrentDayId(),
  historyRows: initialHistoryRows,
  sortedHistoryRows: getSortedHistoryRows(initialHistoryRows),
  historyHasFullArchive: false,
  historyFetchCacheRows: null,
  historyFetchCacheAt: 0,
  historyFetchCacheMode: "preview",
  historyDay: getTodayYmd(),
  historyTime: "",
  historyVisibleCount: DEFAULT_HISTORY_VISIBLE_ROWS,
  historyStatusText: initialHistoryRows.length
    ? "Affichage rapide depuis le cache local…"
    : "Chargement des dernières diffusions…",
  historyTimezoneLabel: getDisplayZoneLabel(),
  isMobileNavOpen: false,
};

const refs = {
  topShell: document.getElementById("topShell"),
  audio: document.getElementById("radioAudio"),
  playerToggle: document.getElementById("playerToggle"),
  playerToggleIcon: document.getElementById("playerToggleIcon"),
  volumeWrap: document.querySelector(".player-strip__volume"),
  volumeRange: document.getElementById("volumeRange"),
  signalIndicator: document.getElementById("signalIndicator"),
  currentShowText: document.getElementById("currentShowText"),
  nowPlayingTicker: document.getElementById("nowPlayingTicker"),
  nowPlayingTickerTrack: document.getElementById("nowPlayingTickerTrack"),
  nowPlayingTickerText: document.getElementById("nowPlayingTickerText"),
  nowPlayingTickerTextClone: document.getElementById("nowPlayingTickerTextClone"),
  mainNav: document.getElementById("mainNav"),
  mobileNavToggle: document.getElementById("mobileNavToggle"),
  mobileNavCurrentLabel: document.getElementById("mobileNavCurrentLabel"),
  navButtons: Array.from(document.querySelectorAll(".main-nav__button")),
  pageView: document.getElementById("pageView"),
  scrollTopButton: document.getElementById("scrollTopButton"),
};

state.selectedNewsYear = getNewsYears()[0] || "";

const renderers = RENDERERS_FACTORY
  ? RENDERERS_FACTORY({
      state,
      COMMON,
      ABOUT_CHIPS,
      PRODUCERS,
      SHOWS,
      SCHEDULE_DAYS,
      escapeHtml,
      asString,
      parseYear,
      formatLocalDate,
      formatLocalTime,
      formatSinceLabel,
      getTrackMeta,
      getHistoryRowsSorted,
      getNewsYears,
      getNewsItemsForYear,
      getScheduleDayById,
      getCurrentDayId,
      getCurrentShowSlot,
      getHomeTodayState,
      getHistoryDisplay,
      buildMailtoHref,
      makeDomId,
      isLiveTrack,
    })
  : null;

function init() {
  refs.audio.src = STREAM_URL;
  refs.audio.preload = "none";
  applyPlatformAudioUi();
  bindEvents();
  renderRoute();
  syncShellHeight();
  updateMobileNavUi();
  updatePlayerButton();
  updateSignalIndicator();
  updateHeaderLiveFields();
  updateMediaSession();
  syncVolumeInput();
  setVolume(state.volume, { preserveUserState: true });
  ensurePlaybackVolumeReady();
  updateScrollTopButton();
  refreshLiveData({ force: true });
  scheduleHistoryRefresh({ silent: Boolean(state.historyRows.length) });
  window.setInterval(() => {
    if (!document.hidden) refreshLiveData();
  }, LIVE_REFRESH_MS);
  window.setInterval(() => {
    if (!document.hidden && (state.route === "accueil" || state.route === "historique")) {
      scheduleHistoryRefresh({
        silent: true,
        immediate: true,
        full: state.route === "historique" && !state.historyHasFullArchive,
      });
    }
  }, HISTORY_REFRESH_MS);
}

function bindEvents() {
  if (refs.playerToggle) {
    refs.playerToggle.addEventListener("click", togglePlayback);
  }

  if (refs.mobileNavToggle) {
    refs.mobileNavToggle.addEventListener("click", () => {
      setMobileNavOpen(!state.isMobileNavOpen);
    });
  }

  refs.navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setRoute(button.dataset.route);
      closeMobileNav();
    });
  });

  if (refs.volumeRange) {
    refs.volumeRange.addEventListener("input", (event) => {
      setVolume(Number(event.target.value) / 100);
    });
  }

  if (refs.scrollTopButton) {
    refs.scrollTopButton.addEventListener("click", scrollToTop);
  }

  refs.audio.addEventListener("play", () => {
    state.isPlaying = true;
    ensurePlaybackVolumeReady();
    updatePlayerButton();
  });

  refs.audio.addEventListener("pause", () => {
    state.isPlaying = false;
    updatePlayerButton();
  });

  ["loadedmetadata", "loadeddata", "canplay", "canplaythrough", "playing"].forEach((eventName) => {
    refs.audio.addEventListener(eventName, () => {
      setStreamAvailability(true);
    });
  });

  ["error", "emptied"].forEach((eventName) => {
    refs.audio.addEventListener(eventName, () => {
      setStreamAvailability(false);
    });
  });

  refs.audio.addEventListener("volumechange", () => {
    refs.audio.defaultMuted = false;
    refs.audio.muted = false;

    if (!state.hasUserAdjustedVolume && refs.audio.volume <= 0.001) {
      ensurePlaybackVolumeReady();
      return;
    }

    if (Math.abs(refs.audio.volume - state.volume) > 0.001) {
      state.volume = refs.audio.volume;
      syncVolumeInput();
    }
  });

  document.addEventListener("click", handleDocumentClick);
  refs.pageView.addEventListener("click", handlePageClick);
  refs.pageView.addEventListener("change", handlePageChange);
  refs.pageView.addEventListener("keydown", handlePageKeydown);

  window.addEventListener("hashchange", () => {
    const nextRoute = getRouteFromHash();
    if (nextRoute !== state.route) {
      state.route = nextRoute;
      renderRoute({ scrollToTop: true });
    }
  });

  window.addEventListener("resize", () => {
    updateMobileNavUi();
    syncShellHeight();
    refreshNowPlayingTicker();
  });

  window.addEventListener("scroll", updateScrollTopButton, { passive: true });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !state.isMobileNavOpen) return;
    closeMobileNav();
    if (refs.mobileNavToggle) refs.mobileNavToggle.focus();
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      refreshLiveData({ force: true });
      if (state.route === "accueil" || state.route === "historique") {
        scheduleHistoryRefresh({
          silent: true,
          immediate: true,
          full: state.route === "historique" && !state.historyHasFullArchive,
        });
      }
    }
  });

  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(() => {
      syncShellHeight();
      refreshNowPlayingTicker();
    });
    observer.observe(refs.topShell);
  }
}

function handleDocumentClick(event) {
  if (
    state.isMobileNavOpen &&
    refs.mainNav &&
    refs.mobileNavToggle &&
    !event.target.closest("#mainNav") &&
    !event.target.closest("#mobileNavToggle")
  ) {
    closeMobileNav();
  }

  const routeLink = event.target.closest("[data-route-link]");
  if (!routeLink) return;
  event.preventDefault();
  setRoute(routeLink.getAttribute("data-route-link"));
  closeMobileNav();
}

function handlePageClick(event) {
  const routeJump = event.target.closest("[data-route-jump]");
  if (routeJump) {
    event.preventDefault();
    setRoute(routeJump.getAttribute("data-route-jump"));
    return;
  }

  const newsYearTrigger = event.target.closest("[data-news-year]");
  if (newsYearTrigger) {
    state.selectedNewsYear = newsYearTrigger.getAttribute("data-news-year") || state.selectedNewsYear;
    state.newsVisibleCount = INITIAL_NEWS_VISIBLE_COUNT;
    renderRoute();
    return;
  }

  if (event.target.closest("[data-news-more]")) {
    state.newsVisibleCount += INITIAL_NEWS_VISIBLE_COUNT;
    renderRoute();
    return;
  }

  const dayTrigger = event.target.closest("[data-schedule-day]");
  if (dayTrigger) {
    state.selectedScheduleDay = dayTrigger.getAttribute("data-schedule-day") || state.selectedScheduleDay;
    renderRoute();
    return;
  }

  if (event.target.closest("[data-history-search]")) {
    state.historyVisibleCount = DEFAULT_HISTORY_VISIBLE_ROWS;
    if (!state.historyHasFullArchive) {
      refreshHistory({ full: true });
      return;
    }
    renderRoute();
    return;
  }

  if (event.target.closest("[data-history-more]")) {
    state.historyVisibleCount += HISTORY_LOAD_MORE_STEP;
    renderRoute();
  }
}

function handlePageChange(event) {
  if (event.target.id === "historyDayInput") {
    state.historyDay = event.target.value || getTodayYmd();
    state.historyVisibleCount = DEFAULT_HISTORY_VISIBLE_ROWS;
    renderRoute();
    return;
  }

  if (event.target.id === "historyTimeInput") {
    state.historyTime = event.target.value || "";
    state.historyVisibleCount = DEFAULT_HISTORY_VISIBLE_ROWS;
    renderRoute();
  }
}

function handlePageKeydown(event) {
  const tab = event.target.closest('[role="tab"]');
  if (!tab) return;

  const tablist = tab.closest('[role="tablist"]');
  if (!tablist) return;

  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
  const currentIndex = tabs.indexOf(tab);
  if (currentIndex < 0) return;

  let nextIndex = currentIndex;

  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    nextIndex = (currentIndex + 1) % tabs.length;
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  } else if (event.key === "Home") {
    nextIndex = 0;
  } else if (event.key === "End") {
    nextIndex = tabs.length - 1;
  } else {
    return;
  }

  event.preventDefault();
  const nextTab = tabs[nextIndex];
  if (!nextTab) return;
  nextTab.focus();
  if (nextTab !== tab) nextTab.click();
}

function getRouteFromHash() {
  const route = window.location.hash.replace(/^#/, "").trim().toLowerCase();
  return ROUTES.includes(route) ? route : "accueil";
}

function setRoute(route, options = {}) {
  if (!ROUTES.includes(route)) return;
  state.route = route;
  if (window.location.hash !== `#${route}`) {
    window.location.hash = route;
  }
  renderRoute({ scrollToTop: options.scrollToTop !== false });
}

function renderRoute(options = {}) {
  refs.navButtons.forEach((button) => {
    const isActive = button.dataset.route === state.route;
    button.classList.toggle("is-active", isActive);
    if (isActive) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  updateMobileNavUi();

  refs.pageView.innerHTML = renderPage(state.route);

  if (options.scrollToTop) {
    scrollRouteToTop();
  }

  if (state.route === "historique" && !state.historyHasFullArchive) {
    scheduleHistoryRefresh({ silent: true, full: true, immediate: true });
  } else if (state.route === "accueil" && !state.historyRows.length) {
    scheduleHistoryRefresh({ silent: true });
  }
}

function renderPage(route) {
  if (renderers && typeof renderers.renderPage === "function") {
    return renderers.renderPage(route);
  }
  return "";
}

function getRouteLabel(route) {
  const activeButton = refs.navButtons.find((button) => button.dataset.route === route);
  return activeButton ? asString(activeButton.textContent) || "Accueil" : "Accueil";
}

function isMobileNavigationViewport() {
  return typeof window.matchMedia === "function"
    ? window.matchMedia("(max-width: 680px)").matches
    : window.innerWidth <= 680;
}

function setMobileNavOpen(nextValue) {
  state.isMobileNavOpen = Boolean(nextValue) && isMobileNavigationViewport();
  updateMobileNavUi();
  syncShellHeight();
}

function closeMobileNav() {
  if (!state.isMobileNavOpen) return;
  setMobileNavOpen(false);
}

function updateMobileNavUi() {
  const isMobile = isMobileNavigationViewport();
  const isExpanded = isMobile && state.isMobileNavOpen;
  const currentLabel = getRouteLabel(state.route);

  if (refs.mobileNavCurrentLabel) {
    refs.mobileNavCurrentLabel.textContent = currentLabel;
  }

  if (refs.mobileNavToggle) {
    refs.mobileNavToggle.setAttribute("aria-expanded", isExpanded ? "true" : "false");
    refs.mobileNavToggle.setAttribute(
      "aria-label",
      `${isExpanded ? "Fermer" : "Ouvrir"} le menu des rubriques, page active ${currentLabel}`
    );
    refs.mobileNavToggle.classList.toggle("is-open", isExpanded);
  }

  if (refs.mainNav) {
    refs.mainNav.classList.toggle("is-open", isExpanded);
    refs.mainNav.setAttribute("aria-hidden", isMobile && !isExpanded ? "true" : "false");
    refs.mainNav.inert = Boolean(isMobile && !isExpanded);
  }

  if (!isMobile && state.isMobileNavOpen) {
    state.isMobileNavOpen = false;
  }
}

function getNewsYears() {
  const seen = new Set();
  const years = [];
  getSortedNewsItems().forEach((item) => {
    const year = getNewsItemYear(item);
    if (seen.has(year)) return;
    seen.add(year);
    years.push(year);
  });
  return years.sort((left, right) => String(right).localeCompare(String(left)));
}

function getSortedNewsItems() {
  return NEWS_ITEMS.slice().sort((left, right) => {
    const leftKey = String(left && left.sortKey ? left.sortKey : "");
    const rightKey = String(right && right.sortKey ? right.sortKey : "");
    return rightKey.localeCompare(leftKey);
  });
}

function getNewsItemYear(item) {
  const sortKey = String(item && item.sortKey ? item.sortKey : "");
  if (/^\d{4}-/.test(sortKey)) return sortKey.slice(0, 4);
  const label = String(item && item.dateLabel ? item.dateLabel : "");
  const match = label.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : "Archives";
}

function getNewsItemsForYear(year) {
  return getSortedNewsItems().filter((item) => getNewsItemYear(item) === year);
}

function getScheduleDayById(dayId) {
  return SCHEDULE_DAYS.find((day) => day.id === dayId) || SCHEDULE_DAYS[0] || { id: "", name: "", summary: "", slots: [] };
}

function getCurrentDayId() {
  if (COMMON.getCurrentDayId) return COMMON.getCurrentDayId();
  const weekdayMap = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return weekdayMap[new Date().getDay()] || "mon";
}

function getCurrentScheduleSlot(day) {
  if (COMMON.findCurrentScheduleSlot) {
    return COMMON.findCurrentScheduleSlot(day);
  }
  return null;
}

function getCurrentShowSlot(day) {
  if (!state.currentShowLoaded || !state.currentShow.show || !COMMON.findScheduleSlotByShow) {
    return null;
  }
  return COMMON.findScheduleSlotByShow(day, state.currentShow.show);
}

function getCurrentShowDescription(currentShow) {
  if (!currentShow || !currentShow.show) return "Show réellement diffusé à l'antenne.";
  if (currentShow.isLive || currentShow.kind === "live") {
    return "Prise d'antenne en direct réellement diffusée en ce moment.";
  }
  if (currentShow.kind === "editorial_event") {
    return "Émission réellement diffusée à l'antenne.";
  }
  if (currentShow.kind === "editorial_window") {
    return "Fenêtre éditoriale réellement diffusée à l'antenne.";
  }
  return "Bloc réellement diffusé à l'antenne.";
}

function buildSyntheticCurrentShowSlot(currentShow) {
  return {
    time: currentShow && currentShow.isLive ? "Maintenant" : "À l'antenne",
    title:
      asString(currentShow && currentShow.show) ||
      (currentShow && currentShow.isLive ? "DIRECT" : "Show en cours"),
    desc: getCurrentShowDescription(currentShow),
    highlight: true,
    isSyntheticCurrent: true,
  };
}

function getHomeTodayState(day) {
  const slots = Array.isArray(day.slots) ? day.slots.filter(Boolean) : [];
  if (!slots.length) {
    return {
      rows: [],
      currentSlot: null,
    };
  }

  const matchedCurrentShowSlot = getCurrentShowSlot(day);
  if (matchedCurrentShowSlot) {
    const matchedIndex = slots.indexOf(matchedCurrentShowSlot);
    return {
      rows: slots.slice(matchedIndex, matchedIndex + 4),
      currentSlot: matchedCurrentShowSlot,
    };
  }

  if (state.currentShowLoaded && state.currentShow.show) {
    const theoreticalSlot = getCurrentScheduleSlot(day);
    let theoreticalIndex = theoreticalSlot ? slots.indexOf(theoreticalSlot) : 0;
    if (theoreticalIndex < 0) theoreticalIndex = 0;
    const syntheticSlot = buildSyntheticCurrentShowSlot(state.currentShow);
    return {
      rows: [syntheticSlot].concat(slots.slice(theoreticalIndex, theoreticalIndex + 3)).slice(0, 4),
      currentSlot: syntheticSlot,
    };
  }

  const fallbackSlot = getCurrentScheduleSlot(day);
  let startIndex = 0;
  if (fallbackSlot) {
    const fallbackIndex = slots.indexOf(fallbackSlot);
    if (fallbackIndex >= 0) startIndex = fallbackIndex;
  }

  return {
    rows: slots.slice(startIndex, startIndex + 4),
    currentSlot: null,
  };
}

function ensurePlaybackVolumeReady() {
  const shouldForceDefaultVolume = !state.hasUserAdjustedVolume;
  let nextVolume = state.volume;

  refs.audio.defaultMuted = false;
  refs.audio.muted = false;

  if (shouldForceDefaultVolume && nextVolume <= 0.001) {
    nextVolume = DEFAULT_VOLUME;
  }

  if (shouldForceDefaultVolume && refs.audio.volume <= 0.001) {
    nextVolume = DEFAULT_VOLUME;
  }

  if (Math.abs(refs.audio.volume - nextVolume) > 0.001) {
    refs.audio.volume = nextVolume;
  }

  if (state.volume !== nextVolume) {
    state.volume = nextVolume;
    syncVolumeInput();
  }
}

function setVolume(nextValue, options = {}) {
  const normalized = Math.max(0, Math.min(1, nextValue));
  state.volume = normalized;

  if (!options.preserveUserState) {
    state.hasUserAdjustedVolume = true;
  }

  refs.audio.defaultMuted = false;
  refs.audio.muted = false;
  refs.audio.volume = normalized;
  syncVolumeInput();
}

function syncVolumeInput() {
  if (!refs.volumeRange) return;
  const percent = String(Math.round(state.volume * 100));
  refs.volumeRange.value = percent;
  refs.volumeRange.style.setProperty("--volume-value", `${percent}%`);
}

async function togglePlayback() {
  if (state.isPlaying) {
    pausePlayback();
    return;
  }

  try {
    refreshLiveData({ force: true });
    ensurePlaybackVolumeReady();
    refs.audio.load();
    await refs.audio.play();
  } catch (error) {
    state.isPlaying = false;
    updatePlayerButton();
  }
}

function pausePlayback() {
  refs.audio.pause();
}

function updatePlayerButton() {
  if (!refs.playerToggle || !refs.playerToggleIcon) return;
  refs.playerToggle.setAttribute("aria-pressed", state.isPlaying ? "true" : "false");
  refs.playerToggle.setAttribute("aria-label", state.isPlaying ? "Mettre en pause le direct" : "Lancer le direct");
  refs.playerToggleIcon.innerHTML = state.isPlaying ? ICONS.pause : ICONS.play;
  refs.playerToggle.classList.toggle("is-idle-cta", !state.isPlaying);
  updateMediaSessionPlaybackState();
}

function setStreamAvailability(nextValue) {
  if (state.streamAvailable === nextValue) return;
  state.streamAvailable = nextValue;
  updateSignalIndicator();
}

function updateSignalIndicator() {
  const isDirect = state.streamAvailable && Boolean(state.isLive);
  const isLive = state.streamAvailable && !isDirect;

  refs.signalIndicator.classList.toggle("is-live", isLive);
  refs.signalIndicator.classList.toggle("is-direct", isDirect);
  refs.signalIndicator.classList.toggle("is-offline", !state.streamAvailable);

  const label = !state.streamAvailable
    ? "Flux audio indisponible"
    : isDirect
      ? "Direct en cours, flux audio disponible"
      : "Flux audio disponible";

  refs.signalIndicator.setAttribute("aria-label", label);
}

function updateHeaderLiveFields() {
  const currentShowText =
    asString(state.currentShow.show) ||
    (state.currentShowLoaded ? "Programmation en cours" : "Chargement...");
  refs.currentShowText.textContent = currentShowText;
  updateNowPlayingTicker();
  updateMediaSession();
}

function updateMediaSession() {
  if (!("mediaSession" in navigator) || typeof window.MediaMetadata !== "function") return;

  try {
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: asString(state.currentTrack.title) || "Le Chat Noir",
      artist: asString(state.currentTrack.artist) || "Le Chat Noir",
      album: asString(state.currentTrack.album) || "Laboratoire radiophonique indépendant",
      artwork: [
        {
          src: APP_ICON_180_URL,
          sizes: "180x180",
          type: "image/png",
        },
        {
          src: APP_ICON_192_URL,
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: APP_ICON_512_URL,
          sizes: "512x512",
          type: "image/png",
        },
      ],
    });
    navigator.mediaSession.setActionHandler("play", togglePlayback);
    navigator.mediaSession.setActionHandler("pause", pausePlayback);
  } catch (error) {
    return;
  }
}

function updateMediaSessionPlaybackState() {
  if (!("mediaSession" in navigator)) return;

  try {
    navigator.mediaSession.playbackState = state.isPlaying ? "playing" : "paused";
  } catch (error) {
    return;
  }
}

function updateNowPlayingTicker() {
  const label = buildNowPlayingLabel(state.currentTrack);
  refs.nowPlayingTickerText.textContent = label;
  refs.nowPlayingTickerTextClone.textContent = label;
  refreshNowPlayingTicker();
}

function refreshNowPlayingTicker() {
  refs.nowPlayingTickerTrack.classList.remove("is-animated");
  refs.nowPlayingTickerTrack.style.removeProperty("--ticker-distance");
  refs.nowPlayingTickerTrack.style.removeProperty("--ticker-duration");

  window.requestAnimationFrame(() => {
    const contentWidth = refs.nowPlayingTickerText.scrollWidth;
    const containerWidth = refs.nowPlayingTicker.clientWidth;

    if (!contentWidth || !containerWidth || contentWidth <= containerWidth - 12) {
      return;
    }

    const distance = contentWidth + 32;
    const duration = Math.max(12, distance / 28);
    refs.nowPlayingTickerTrack.style.setProperty("--ticker-distance", `${distance}px`);
    refs.nowPlayingTickerTrack.style.setProperty("--ticker-duration", `${duration}s`);
    refs.nowPlayingTickerTrack.classList.add("is-animated");
  });
}

async function refreshLiveData(options = {}) {
  if (liveRefreshPromise) return liveRefreshPromise;

  const now = Date.now();
  if (!options.force && liveRefreshAt && now - liveRefreshAt < LIVE_REFRESH_MIN_INTERVAL_MS) {
    return null;
  }

  liveRefreshPromise = (async () => {
    const [currentShowMeta, currentTrackMeta] = await Promise.all([
      fetchJson(CURRENT_SHOW_URL).then(extractCurrentShowMeta).catch(() => null),
      fetchJson(NOW_PLAYING_URL).then(extractNowPlayingMeta).catch(() => null),
    ]);

    if (currentShowMeta || currentTrackMeta) {
      setStreamAvailability(true);
    }

    applyCurrentShow(currentShowMeta);
    if (currentTrackMeta && (currentTrackMeta.artist || currentTrackMeta.title || currentTrackMeta.album)) {
      applyCurrentTrack(currentTrackMeta);
    } else if (state.historyRows.length) {
      const fallbackMeta = buildMetaFromHistoryRows(state.historyRows);
      if (fallbackMeta) applyCurrentTrack(fallbackMeta);
    }
  })();

  try {
    await liveRefreshPromise;
  } finally {
    liveRefreshAt = Date.now();
    liveRefreshPromise = null;
  }

  return null;
}

function applyCurrentShow(showMeta) {
  if (showMeta) {
    state.currentShow = {
      show: asString(showMeta.show),
      kind: asString(showMeta.kind),
      isLive: Boolean(showMeta.isLive),
      since: Number(showMeta.since) || 0,
    };
    state.currentShowLoaded = true;
  } else {
    state.currentShowLoaded = true;
  }

  state.isLive = Boolean(state.currentShow.isLive) || isLiveTrack(state.currentTrack);
  updateHeaderLiveFields();

  if (state.route === "accueil" || state.route === "grille") {
    renderRoute();
  }
}

function applyCurrentTrack(meta) {
  const nextTrack = {
    artist: asString(meta.artist),
    title: asString(meta.title) || "Titre indisponible pour l'instant",
    album: asString(meta.album),
    year: parseYear(meta.year),
  };

  const previousSignature = getTrackSignature(state.currentTrack);
  const nextSignature = getTrackSignature(nextTrack);
  state.currentTrack = nextTrack;
  state.isLive = isLiveTrack(nextTrack) || Boolean(state.currentShow && state.currentShow.isLive);

  if (nextSignature && nextSignature !== previousSignature) {
    syncRecentHistoryFromNowPlaying(nextTrack);
  }

  updateHeaderLiveFields();
}

function syncRecentHistoryFromNowPlaying(track) {
  const signature = getTrackSignature(track);
  if (!signature) return;

  const sortedRows = getHistoryRowsSorted();
  if (sortedRows.length && getTrackSignature(sortedRows[0]) === signature) {
    return;
  }

  const nextRows = [
    ensureEnrichedRow({
      tsIso: new Date().toISOString(),
      artist: asString(track.artist),
      title: asString(track.title),
      album: asString(track.album),
      year: asString(track.year),
    }),
  ]
    .concat(sortedRows)
    .filter(Boolean)
    .slice(0, state.historyHasFullArchive ? sortedRows.length + 1 : HISTORY_CACHE_MAX_ROWS);

  setHistoryRows(nextRows, { full: state.historyHasFullArchive });
  savePreviewRows(nextRows);

  if (state.route === "accueil" || state.route === "historique") {
    renderRoute();
  }
}

async function refreshHistory(options = {}) {
  if (historyRefreshPromise) return historyRefreshPromise;
  const shouldLoadFullArchive = Boolean(options.full) || (state.route === "historique" && !state.historyHasFullArchive);

  if (!options.silent) {
    state.historyStatusText = shouldLoadFullArchive
      ? "Chargement des archives complètes…"
      : "Chargement des dernières diffusions…";
    if (state.route === "historique") renderRoute();
  }

  historyRefreshPromise = (async () => {
    try {
      const rows = await fetchHistoryRows({ full: shouldLoadFullArchive });
      const nextRows =
        state.historyHasFullArchive && !shouldLoadFullArchive
          ? mergeHistoryRows(state.historyRows, rows)
          : shouldLoadFullArchive
            ? rows
            : alignPreviewHistoryRowsWithCurrentTrack(rows);
      setHistoryRows(nextRows, { full: state.historyHasFullArchive || shouldLoadFullArchive });
      state.historyStatusText = shouldLoadFullArchive
        ? "Archives complètes chargées"
        : "Historique de diffusion actualisé";
      savePreviewRows(nextRows);

      if (state.route === "accueil" || state.route === "historique") {
        renderRoute();
      }
    } catch (error) {
      state.historyStatusText = "Impossible de charger l'historique pour le moment";
      if (state.route === "historique") {
        renderRoute();
      }
    } finally {
      historyRefreshPromise = null;
    }
  })();

  return historyRefreshPromise;
}

function scheduleHistoryRefresh(options = {}) {
  if (historyRefreshPromise) return;
  if (historyRefreshScheduled) {
    if (!options.immediate && !options.full) return;
    cancelScheduledHistoryRefresh();
  }
  historyRefreshScheduled = true;

  const run = () => {
    historyRefreshScheduled = false;
    historyRefreshTimeoutId = 0;
    historyRefreshIdleId = 0;
    refreshHistory(options);
  };

  if (options.immediate) {
    historyRefreshTimeoutId = window.setTimeout(run, 0);
    return;
  }

  historyRefreshTimeoutId = window.setTimeout(() => {
    if (typeof window.requestIdleCallback === "function") {
      historyRefreshIdleId = window.requestIdleCallback(run, { timeout: 300 });
      return;
    }

    window.requestAnimationFrame(run);
  }, HISTORY_INITIAL_DELAY_MS);
}

function cancelScheduledHistoryRefresh() {
  if (historyRefreshTimeoutId) {
    window.clearTimeout(historyRefreshTimeoutId);
    historyRefreshTimeoutId = 0;
  }

  if (historyRefreshIdleId && typeof window.cancelIdleCallback === "function") {
    window.cancelIdleCallback(historyRefreshIdleId);
    historyRefreshIdleId = 0;
  }

  historyRefreshScheduled = false;
}

async function fetchHistoryRows(options = {}) {
  const now = Date.now();
  const mode = options.full ? "full" : "preview";

  if (
    state.historyFetchCacheRows &&
    state.historyFetchCacheMode === mode &&
    now - state.historyFetchCacheAt < FETCH_CACHE_MS
  ) {
    return state.historyFetchCacheRows;
  }

  const response = await fetch(`${HISTORY_CSV_URL}?t=${now}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const rows = await parseCsvRowsAsync(await response.text(), {
    limitFromEnd: options.full ? 0 : HISTORY_PREVIEW_REFRESH_ROWS,
  });
  state.historyFetchCacheRows = rows;
  state.historyFetchCacheAt = now;
  state.historyFetchCacheMode = mode;
  return rows;
}

function getHistoryDisplay() {
  const selectedDay = state.historyDay || getTodayYmd();
  const selectedTime = state.historyTime || "";
  const rows = getHistoryRowsSorted();

  if (!selectedTime) {
    const dayRows = rows.filter((row) => row.localYmd === selectedDay).slice(0, state.historyVisibleCount);
    return {
      label: selectedDay === getTodayYmd() ? "Derniers passages du jour" : `Recherche ponctuelle : ${selectedDay}`,
      rows: dayRows,
      totalCount: rows.filter((row) => row.localYmd === selectedDay).length,
    };
  }

  const [hourToken, minuteToken] = selectedTime.split(":");
  const referenceMinutes = Number(hourToken || 0) * 60 + Number(minuteToken || 0);
  const dayRows = rows.filter((row) => row.localYmd === selectedDay);
  const closestRows = dayRows
    .slice()
    .sort((left, right) => {
      return (
        Math.abs((left.localMinutes == null ? 0 : left.localMinutes) - referenceMinutes) -
          Math.abs((right.localMinutes == null ? 0 : right.localMinutes) - referenceMinutes) ||
        right.tsMs - left.tsMs
      );
    })
    .slice(0, state.historyVisibleCount);

  return {
    label: `Recherche ponctuelle : titres les plus proches de ${selectedTime}`,
    rows: closestRows,
    totalCount: dayRows.length,
  };
}

async function parseCsvRowsAsync(csvText, options = {}) {
  const normalized = String(csvText || "").replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [];

  const lines = normalized.split("\n");
  const rows = [];
  const startIndex =
    Number.isFinite(options.limitFromEnd) && options.limitFromEnd > 0
      ? Math.max(1, lines.length - options.limitFromEnd)
      : 1;
  let linesSinceYield = 0;

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) continue;

    const cols = parseCsvLine(line);
    const enriched = ensureEnrichedRow({
      tsIso: cols[0] || "",
      artist: cols[2] || "",
      title: cols[3] || "",
      album: cols[4] || "",
      year: cols[5] || "",
    });

    if (enriched) rows.push(enriched);

    linesSinceYield += 1;
    if (linesSinceYield >= CSV_PARSE_CHUNK_SIZE) {
      linesSinceYield = 0;
      await yieldToBrowser();
    }
  }

  return rows;
}

function buildSyntheticCurrentTrackRow() {
  const signature = getTrackSignature(state.currentTrack);
  if (!signature) return null;

  return ensureEnrichedRow({
    tsIso: new Date().toISOString(),
    artist: asString(state.currentTrack.artist),
    title: asString(state.currentTrack.title),
    album: asString(state.currentTrack.album),
    year: asString(state.currentTrack.year),
  });
}

function alignPreviewHistoryRowsWithCurrentTrack(rows) {
  const sortedRows = getSortedHistoryRows(rows);
  const currentSignature = getTrackSignature(state.currentTrack);
  if (!currentSignature) {
    return sortedRows.slice(0, HISTORY_CACHE_MAX_ROWS);
  }

  const currentIndex = sortedRows.findIndex((row) => getTrackSignature(row) === currentSignature);
  if (currentIndex === 0) {
    return sortedRows.slice(0, HISTORY_CACHE_MAX_ROWS);
  }

  const syntheticRow = buildSyntheticCurrentTrackRow();
  if (!syntheticRow) {
    return sortedRows.slice(0, HISTORY_CACHE_MAX_ROWS);
  }

  return [syntheticRow]
    .concat(sortedRows.filter((row, index) => index !== currentIndex))
    .slice(0, HISTORY_CACHE_MAX_ROWS);
}

function getHistoryRowKey(row) {
  return [row.tsIso, row.artist, row.title, row.album, row.year].map((value) => asString(value)).join("::");
}

function mergeHistoryRows(existingRows, incomingRows) {
  const mergedMap = new Map();

  existingRows.concat(incomingRows).forEach((row) => {
    const enriched = ensureEnrichedRow(row);
    if (!enriched) return;
    const key = getHistoryRowKey(enriched);
    if (!mergedMap.has(key)) {
      mergedMap.set(key, enriched);
    }
  });

  return Array.from(mergedMap.values()).sort((left, right) => right.tsMs - left.tsMs);
}

function setHistoryRows(rows, options = {}) {
  const nextRows = (rows || []).filter((row) => row && row.tsIso).map((row) => ensureEnrichedRow(row)).filter(Boolean);
  state.historyRows = nextRows;
  state.sortedHistoryRows = nextRows.slice().sort((left, right) => right.tsMs - left.tsMs);
  state.historyHasFullArchive = Boolean(options.full);
}

function getHistoryRowsSorted() {
  return Array.isArray(state.sortedHistoryRows) ? state.sortedHistoryRows : [];
}

function buildMetaFromHistoryRows(rows) {
  const sorted = Array.isArray(rows) && rows === state.historyRows ? getHistoryRowsSorted() : getSortedHistoryRows(rows);
  const row = sorted[0];
  if (!row) return null;
  return {
    artist: row.artist,
    title: row.title,
    album: row.album,
    year: parseYear(row.year),
  };
}

function loadPreviewRows() {
  try {
    const cachedAt = Number(window.localStorage.getItem(HISTORY_CACHE_AT_KEY) || 0);
    if (!cachedAt || Date.now() - cachedAt > HISTORY_CACHE_MAX_AGE_MS) return [];
    const raw = window.localStorage.getItem(HISTORY_CACHE_KEY);
    if (!raw) return [];
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows) || !rows.length) return [];
    return rows.map((row) => ensureEnrichedRow(row)).filter(Boolean);
  } catch (error) {
    return [];
  }
}

function savePreviewRows(rows) {
  try {
    const previewRows =
      Array.isArray(rows) && rows === state.historyRows
        ? getHistoryRowsSorted().slice(0, HISTORY_CACHE_MAX_ROWS)
        : getSortedHistoryRows(rows).slice(0, HISTORY_CACHE_MAX_ROWS);
    window.localStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify(previewRows));
    window.localStorage.setItem(HISTORY_CACHE_AT_KEY, String(Date.now()));
  } catch (error) {
    return;
  }
}

function extractCurrentShowMeta(payload) {
  if (COMMON.extractCurrentShow) return COMMON.extractCurrentShow(payload);
  return {
    show: "",
    kind: "",
    isLive: false,
    since: 0,
  };
}

function extractNowPlayingMeta(payload) {
  const roots = [];
  if (payload && typeof payload === "object") roots.push(payload);
  if (payload && payload.now_playing && typeof payload.now_playing === "object") roots.push(payload.now_playing);
  if (payload && payload.now_playing && payload.now_playing.song && typeof payload.now_playing.song === "object") {
    roots.push(payload.now_playing.song);
  }
  if (payload && payload.song && typeof payload.song === "object") roots.push(payload.song);
  if (payload && payload.track && typeof payload.track === "object") roots.push(payload.track);

  let artist = "";
  let title = "";
  let album = "";
  let year = "";

  roots.forEach((root) => {
    if (!artist) {
      artist = firstString(root, ["artist", "artist_name", "creator", "author", "performer", "dj", "host"]);
    }
    if (!title) {
      title = firstString(root, ["title", "name", "track", "song", "now_playing"]);
    }
    if (!album) {
      album = firstString(root, ["album", "release", "record"]);
    }
    if (!year) {
      year = parseYear(firstString(root, ["year", "date", "released", "release_year"]));
    }
  });

  if (!title) {
    title = asString(payload && payload.now_playing);
  }

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

  return {
    artist,
    title,
    album,
    year,
  };
}

function buildMailtoHref(subject, body) {
  if (COMMON.buildMailtoHref) {
    return COMMON.buildMailtoHref({ subject, body });
  }
  return `mailto:radio@lechatnoirradio.fr?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function makeDomId(prefix, value) {
  const normalized = String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${prefix}-${normalized || "item"}`;
}

function applyPlatformAudioUi() {
  const shouldHideVolume = state.isIOSPhone;
  if (refs.volumeWrap) {
    refs.volumeWrap.hidden = shouldHideVolume;
  }
  if (refs.volumeRange) {
    refs.volumeRange.disabled = shouldHideVolume;
    refs.volumeRange.tabIndex = shouldHideVolume ? -1 : 0;
  }
}

async function fetchJson(url) {
  const response = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

function syncShellHeight() {
  const height = refs.topShell.getBoundingClientRect().height;
  document.documentElement.style.setProperty("--shell-height", `${Math.ceil(height)}px`);
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function scrollRouteToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

function updateScrollTopButton() {
  if (!refs.scrollTopButton) return;
  const isVisible = window.scrollY > Math.max(220, refs.topShell ? refs.topShell.offsetHeight : 0);
  refs.scrollTopButton.classList.toggle("is-visible", isVisible);
  refs.scrollTopButton.setAttribute("aria-hidden", isVisible ? "false" : "true");
}

init();
