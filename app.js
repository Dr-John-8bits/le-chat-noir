const STREAM_URL = "https://stream.lechatnoirradio.fr/stream.mp3";
const NOW_PLAYING_URL = "https://stream.lechatnoirradio.fr/nowplaying.json";
const CURRENT_SHOW_URL = "https://stream.lechatnoirradio.fr/current-show.json";
const HISTORY_CSV_URL = "https://stream.lechatnoirradio.fr/history/nowplaying.csv";
const DISPLAY_TIME_ZONE = "Europe/Paris";
const ROUTES = ["accueil", "actualites", "grille", "historique", "voix", "apropos"];
const DEFAULT_VOLUME = 1;
const LIVE_REFRESH_MS = 30000;
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
const NEWS_ITEMS = Array.isArray(window.LCN_NEWS_ITEMS) ? window.LCN_NEWS_ITEMS.slice() : [];
const PRODUCERS = Array.isArray(CONTENT.PRODUCERS) ? CONTENT.PRODUCERS : [];
const SHOWS = Array.isArray(CONTENT.SHOWS) ? CONTENT.SHOWS : [];
const ABOUT_CHIPS = Array.isArray(CONTENT.ABOUT_CHIPS) ? CONTENT.ABOUT_CHIPS : [];
const SCHEDULE_DAYS = Array.isArray(CONTENT.SCHEDULE_TIMELINE_DAYS) ? CONTENT.SCHEDULE_TIMELINE_DAYS : [];

const initialHistoryRows = loadPreviewRows();
let historyRefreshPromise = null;
let historyRefreshScheduled = false;
let historyRefreshTimeoutId = 0;
let historyRefreshIdleId = 0;
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
  navButtons: Array.from(document.querySelectorAll(".main-nav__button")),
  pageView: document.getElementById("pageView"),
  scrollTopButton: document.getElementById("scrollTopButton"),
};

state.selectedNewsYear = getNewsYears()[0] || "";

function init() {
  refs.audio.src = STREAM_URL;
  refs.audio.preload = "none";
  applyPlatformAudioUi();
  bindEvents();
  renderRoute();
  syncShellHeight();
  updatePlayerButton();
  updateSignalIndicator();
  updateHeaderLiveFields();
  updateMediaSession();
  syncVolumeInput();
  setVolume(state.volume, { preserveUserState: true });
  ensurePlaybackVolumeReady();
  updateScrollTopButton();
  refreshLiveData();
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

  refs.navButtons.forEach((button) => {
    button.addEventListener("click", () => setRoute(button.dataset.route));
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

  window.addEventListener("hashchange", () => {
    const nextRoute = getRouteFromHash();
    if (nextRoute !== state.route) {
      state.route = nextRoute;
      renderRoute({ scrollToTop: true });
    }
  });

  window.addEventListener("resize", () => {
    syncShellHeight();
    refreshNowPlayingTicker();
  });

  window.addEventListener("scroll", updateScrollTopButton, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      refreshLiveData();
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
  const routeLink = event.target.closest("[data-route-link]");
  if (!routeLink) return;
  event.preventDefault();
  setRoute(routeLink.getAttribute("data-route-link"));
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
  if (route === "accueil") return renderHomePage();
  if (route === "actualites") return renderNewsPage();
  if (route === "grille") return renderSchedulePage();
  if (route === "historique") return renderHistoryPage();
  if (route === "voix") return renderVoicesPage();
  return renderAboutPage();
}

function renderHomePage() {
  const today = getScheduleDayById(getCurrentDayId());

  return `
    <section class="page page--home" aria-labelledby="home-title">
      ${renderLiveMonitorCard()}
      <div class="page-grid page-grid--equal">
        <article class="page-card">
          <div class="section-heading">
            <p class="section-kicker">Derniers passages</p>
            <h1 class="section-title" id="home-title">Récemment diffusé</h1>
            <p class="section-intro">Les derniers contenus passés à l'antenne, musique, émission ou autre forme sonore comprise.</p>
          </div>
          <ul class="recent-list">
            ${renderRecentList()}
          </ul>
          <button class="ghost-button home-cta" type="button" data-route-jump="historique">Afficher l'historique de diffusion</button>
        </article>

        <article class="page-card">
          <div class="section-heading">
            <p class="section-kicker">Aujourd'hui</p>
            <h2 class="section-title">Programme du ${escapeHtml(today.name.toLowerCase())}</h2>
            <p class="section-intro">${escapeHtml(today.summary)}</p>
          </div>
          <div class="today-focus-list">
            ${renderHomeTodayFocus(today)}
          </div>
          <button class="ghost-button home-cta" type="button" data-route-jump="grille">Voir la grille des programmes</button>
        </article>
      </div>
    </section>
  `;
}

function renderNewsPage() {
  const years = getNewsYears();
  const items = getNewsItemsForYear(state.selectedNewsYear);
  const visibleItems = items.slice(0, state.newsVisibleCount);
  const summaryText =
    `${visibleItems.length} actualité${visibleItems.length > 1 ? "s" : ""} affichée${visibleItems.length > 1 ? "s" : ""} sur ${items.length} pour ${state.selectedNewsYear}.`;

  return `
    <section class="page" aria-labelledby="page-title">
      <article class="page-card page-card--hero">
        <span class="page-eyebrow">Actualités</span>
        <h1 class="page-title" id="page-title">Chronologie de la station</h1>
        <p class="page-copy">Naissance du flux, mises en route, bascules techniques, voix nouvelles, lives et accidents : les étapes qui façonnent encore Le Chat Noir.</p>
      </article>

      <article class="page-card">
        <div class="section-heading">
          <p class="section-kicker">Archives</p>
          <h2 class="section-title">Par année</h2>
          <p class="section-intro">${escapeHtml(summaryText)}</p>
        </div>
        <div class="day-switcher" role="tablist" aria-label="Filtrer les actualités par année">
          ${years
            .map((year) => {
              const active = year === state.selectedNewsYear ? " is-active" : "";
              return `<button class="day-chip${active}" type="button" data-news-year="${escapeHtml(year)}">${escapeHtml(year)}</button>`;
            })
            .join("")}
        </div>
        <section class="news-feed" aria-live="polite">
          ${visibleItems.length ? visibleItems.map(renderNewsItem).join("") : renderEmptyCard("Aucune actualité pour le moment", "Les nouvelles étapes de la station apparaîtront ici.")}
        </section>
        ${items.length > state.newsVisibleCount ? '<button class="ghost-button" type="button" data-news-more>Afficher plus</button>' : ""}
      </article>
    </section>
  `;
}

function renderSchedulePage() {
  const selectedDay = getScheduleDayById(state.selectedScheduleDay);
  const currentSlot = selectedDay.id === getCurrentDayId() ? getCurrentShowSlot(selectedDay) : null;

  return `
    <section class="page" aria-labelledby="page-title">
      <article class="page-card page-card--hero">
        <span class="page-eyebrow">Grille des programmes</span>
        <h1 class="page-title" id="page-title">La semaine en clair</h1>
        <p class="page-copy">Les nuits, les matinées, les rendez-vous fixes, les focus et les dérives qui donnent son rythme à la radio. La grille reste fluide et indicative : un direct, un décalage ou une dérive peuvent déplacer l'antenne. C'est la grille de lancement de la radio : d'autres émissions viendront bientôt l'habiter, au fil des rencontres, des essais et des formes qui s'invitent à l'antenne.</p>
      </article>

      ${renderLiveMonitorCard()}

      <article class="page-card">
        <div class="day-switcher" role="tablist" aria-label="Choisir un jour de la grille">
          ${SCHEDULE_DAYS.map((day) => {
            const active = day.id === state.selectedScheduleDay ? " is-active" : "";
            return `
              <button class="day-chip${active}" type="button" data-schedule-day="${escapeHtml(day.id)}">
                ${renderFaIcon(day.icon, "day-chip__icon")}
                <span>${escapeHtml(day.shortName)}</span>
              </button>
            `;
          }).join("")}
        </div>
        ${renderSchedulePanel(selectedDay, currentSlot)}
      </article>
    </section>
  `;
}

function renderHistoryPage() {
  const display = getHistoryDisplay();
  const canLoadMore = display.totalCount > display.rows.length;

  return `
    <section class="page" aria-labelledby="page-title">
      <article class="page-card page-card--hero">
        <span class="page-eyebrow">Les archives de la radio</span>
        <h1 class="page-title" id="page-title">Historique de diffusion</h1>
        <p class="page-copy">Un titre t'a échappé pendant l'écoute ? Les dernières diffusions, en lecture chronologique, avec actualisation automatique et recherche par date et heure.</p>
        <div class="meta-row">
          <span class="meta-pill">Mise à jour toutes les 20 s</span>
          <span class="meta-pill">${escapeHtml(state.historyTimezoneLabel)}</span>
        </div>
      </article>

      <article class="page-card history-toolbar">
        <div class="history-toolbar__copy">
          <p class="history-toolbar__label">${escapeHtml(display.label)}</p>
          <p class="history-toolbar__status">${escapeHtml(state.historyStatusText)}</p>
        </div>
        <div class="history-form">
          <label class="field-group">
            <span>Choisir une date</span>
            <input id="historyDayInput" type="date" value="${escapeHtml(state.historyDay)}" />
          </label>
          <label class="field-group">
            <span>Choisir une heure</span>
            <input id="historyTimeInput" type="time" value="${escapeHtml(state.historyTime)}" />
          </label>
          <button class="ghost-button history-search-button" type="button" data-history-search>Rechercher</button>
        </div>
      </article>

      <article class="page-card">
        <div class="history-table">
          <div class="history-table__head" aria-hidden="true">
            <span>Date</span>
            <span>Heure</span>
            <span>Titre</span>
            <span>Artiste</span>
            <span>Album</span>
            <span>Année</span>
          </div>
          <ul class="history-list history-list--table">
            ${renderHistoryRows(display.rows, "Aucun titre trouvé pour cette sélection.")}
          </ul>
        </div>
        ${canLoadMore ? '<div class="history-more-row"><button class="ghost-button" type="button" data-history-more>Afficher davantage</button></div>' : ""}
      </article>
    </section>
  `;
}

function renderVoicesPage() {
  return `
    <section class="page" aria-labelledby="page-title">
      <article class="page-card page-card--hero">
        <span class="page-eyebrow">Voix et formats</span>
        <h1 class="page-title" id="page-title">Les voix qui fabriquent la radio</h1>
        <p class="page-copy">Production, chroniques, émissions, captations et projets qui donnent une forme au territoire radiophonique du Chat Noir.</p>
      </article>

      <section class="page-section">
        <div class="section-heading">
          <p class="section-kicker">Voix</p>
          <h2 class="section-title">Présences à l'antenne</h2>
        </div>
        <div class="producers-grid">
          ${PRODUCERS.map(renderProducerCard).join("")}
        </div>
      </section>

      <section class="page-section">
        <div class="section-heading">
          <p class="section-kicker">Formats</p>
          <h2 class="section-title">Univers en rotation sur la radio</h2>
        </div>
        <div class="shows-grid">
          ${SHOWS.map(renderShowCard).join("")}
        </div>
      </section>
    </section>
  `;
}

function renderAboutPage() {
  return `
    <section class="page" aria-labelledby="page-title">
      <article class="page-card page-card--hero about-hero">
        <div class="about-hero__brand">
          <img class="about-hero__logo" src="assets/media/brand/logo.png" alt="Logo Le Chat Noir" loading="lazy" />
        </div>
        <div class="about-hero__copy">
          <span class="page-eyebrow">À propos</span>
          <h1 class="page-title" id="page-title">Un laboratoire radiophonique indépendant</h1>
          ${renderAboutLine("fa-solid fa-tower-broadcast", "Le Chat Noir est une webradio lilloise, artisanale, indépendante et autogérée, dédiée aux créations sonores et musicales.")}
          <div class="about-copy">
            ${renderAboutLine("fa-solid fa-wave-square", "Elle diffuse en continu des créations libres : paysages sonores, field recordings, expérimentations radiophoniques, émissions et musiques de tous horizons, sans cloisonnement rigide.")}
            ${renderAboutLine("fa-solid fa-sliders", "La radio assume une écoute lente entre fiction et réel, et respecte les dynamiques des œuvres sans compression globale imposée à l'antenne.")}
            ${renderAboutLine("fa-solid fa-hand-sparkles", "Le catalogue est le fruit d'une curation humaine, patiente et sensible : ici, pas d'algorithme de recommandation, pas d'IA, seulement des choix d'écoute, des essais, des intuitions et du temps passé à chercher.")}
            ${renderAboutLine("fa-solid fa-house-signal", "Tout est fait maison, hébergé, programmé et maintenu localement. Une radio de proximité cosmique, née dans un coin de la tête, tournée vers l'espace.")}
          </div>
          <div class="about-chip-row">
            ${ABOUT_CHIPS.map((chip) => `<span class="about-chip">${escapeHtml(chip)}</span>`).join("")}
          </div>
        </div>
      </article>

      <article class="page-card">
        <div class="section-heading">
          <p class="section-kicker">Contact</p>
          <h2 class="section-title">Nous écrire</h2>
          <p class="section-intro">Pour nous contacter, demander un retrait, signaler une correction ou poser une question.</p>
        </div>
        <div class="contact-cta-wrap">
          <a class="contact-cta" href="${escapeHtml(buildMailtoHref("Le Chat Noir - Contact", "Bonjour,\n\n"))}">
            <span>Nous écrire</span>
          </a>
        </div>
        <div class="about-copy about-copy--spaced">
          ${renderAboutLine("fa-solid fa-delete-left", "Si tu demandes le retrait d’un morceau, la suppression est faite dès réception du message.")}
          ${renderAboutLine("fa-solid fa-user-shield", "Aucune donnée personnelle n’est conservée au-delà du traitement de ta demande.")}
          ${renderAboutLine("fa-brands fa-instagram", `On n’est pas très actif·ves sur les produits de META, mais on tient un <a class="text-link" href="https://www.instagram.com/lechatnoirradio/" target="_blank" rel="noopener noreferrer">compte Instagram vaguement à jour</a>.`)}
        </div>
      </article>

      <article class="page-card">
        <div class="section-heading">
          <p class="section-kicker">Appel à contribution</p>
          <h2 class="section-title">Proposer une création</h2>
          <p class="section-intro">Émission, mix, podcast, rendez-vous régulier ou création sonore : tout ce qui peut habiter les ondes nous intéresse.</p>
        </div>
        <div class="contact-cta-wrap">
          <a class="contact-cta" href="${escapeHtml(buildMailtoHref("Le Chat Noir - Contact", "Bonjour,\n\n"))}">
            <span>Nous écrire</span>
          </a>
        </div>
        <div class="about-copy about-copy--spaced">
          ${renderAboutLine("fa-solid fa-microphone-lines", "Nous sommes ouvert·es à toutes les propositions d’émission, de mix, de podcast ou de création sonore, à condition que tu détiennes les droits d’auteur sur tout ce que tu proposes et que les œuvres puissent être diffusées librement dans un cadre non commercial. Pas d’AI slop, pas de création générée par IA : uniquement des créations pensées, composées et portées par des humain·es.")}
          ${renderAboutLine("fa-solid fa-shield-heart", "Nous ne diffuserons pas de contenus haineux, discriminatoires, fascistes, masculinistes, racistes, LGBTQIA+phobes ou assimilés : la radio reste un espace d’écoute safe.")}
          ${renderAboutLine("fa-solid fa-calendar-days", "Nous cherchons aussi tout particulièrement un rendez-vous sonore régulier, hebdomadaire ou mensuel.")}
          ${renderAboutLine("fa-solid fa-ear-listen", "Nous écoutons tout ce qui nous est envoyé, sans garantie de diffusion.")}
        </div>
        <div class="page-grid page-grid--equal about-panels-grid">
          <article class="page-card page-card--subtle about-panel">
            <h3 class="subsection-title">Ce que tu peux envoyer</h3>
            <p>Créations sonores, field recordings, documentaires déviants, fictions radiophoniques, paysages, bruits, silences, fragments ou autres choses difficiles à classer. Si tu hésites à savoir si ça rentre, c’est probablement que oui.</p>
          </article>
          <article class="page-card page-card--subtle about-panel">
            <h3 class="subsection-title">Repères techniques</h3>
            <ul class="card-list">
              <li>Durée libre, avec un repère de 3 à 60 minutes.</li>
              <li>Formats acceptés : WAV, AIFF, FLAC ou MP3.</li>
              <li>Stéréo ou mono, langue libre.</li>
            </ul>
          </article>
          <article class="page-card page-card--subtle about-panel">
            <h3 class="subsection-title">Si la création est retenue</h3>
            <ul class="card-list">
              <li>Diffusion à l’antenne et intégration à la programmation.</li>
              <li>Possibilité d’être rejouée et archivée.</li>
              <li>Pas besoin d’être “pro”, ni même “abouti” : on cherche des gestes sincères, des tentatives, des recherches sonores et des ratés intéressants.</li>
            </ul>
          </article>
          <article class="page-card page-card--subtle about-panel">
            <h3 class="subsection-title">Ce qu’il faut envoyer</h3>
            <ul class="card-list">
              <li>La création sonore elle-même.</li>
              <li>Un titre.</li>
              <li>Ton nom ou ton pseudonyme.</li>
              <li>Une photo ou un visuel qui te représente.</li>
              <li>Une courte description du principe de l’émission ou de la proposition.</li>
            </ul>
          </article>
        </div>
      </article>

      <article class="page-card mentions-block">
        <div class="section-heading">
          <p class="section-kicker">Mentions & confidentialité</p>
          <h2 class="section-title">Cadre de diffusion</h2>
        </div>
        <div class="about-copy mentions-flat">
          ${renderAboutLine("fa-solid fa-pen-nib", '<strong class="mentions-label">Éditeur du site.</strong> Le site Le Chat Noir Radio est édité et maintenu par un particulier, hébergé à titre non commercial sur un serveur personnel.')}
          ${renderAboutLine("fa-solid fa-wave-square", '<strong class="mentions-label">Contenu et diffusion.</strong> Tous les morceaux diffusés sont des œuvres libres de droits ou créées par leurs auteur·ices respectif·ves, dans le respect de leurs choix de diffusion. Si tu constates une erreur ou une diffusion non souhaitée, signale-la par le bouton de contact.')}
          ${renderAboutLine("fa-solid fa-user-shield", '<strong class="mentions-label">Données personnelles.</strong> Le site ne trace pas les visiteurs. Les seules données collectées sont celles que tu fournis volontairement pour nous écrire ; elles servent uniquement à répondre à ta demande et ne sont ni stockées ni partagées. Les statistiques d’écoute sont agrégées et anonymes.')}
          ${renderAboutLine("fa-solid fa-code-branch", '<strong class="mentions-label">Open source.</strong> L’intégralité de la webradio repose sur des outils open source comme Ubuntu, Icecast et Liquidsoap, et nous encourageons chaleureusement le soutien à cette communauté qui rend cette aventure possible.')}
          ${renderAboutLine("fa-solid fa-circle-info", '<strong class="mentions-label">Responsabilité.</strong> L’éditeur ne saurait être tenu responsable d’une interruption temporaire du flux, ni de tout dommage indirect lié à l’usage du site ou à la diffusion en ligne.')}
        </div>
      </article>

    </section>
  `;
}

function renderRecentList() {
  const rows = getHistoryRowsSorted().slice(0, 5);
  if (!rows.length) {
    return '<li class="history-empty">Les derniers titres apparaîtront ici dès que le CSV est chargé.</li>';
  }

  return rows
    .map((row) => {
      const title = asString(row.title) || "(sans titre)";
      const meta = getTrackMeta(row);
      return `
        <li class="recent-item">
          <span class="recent-time">${escapeHtml(row.localTime || formatLocalTime(row.tsIso))}</span>
          <strong class="recent-title">${escapeHtml(title)}</strong>
          <span class="recent-meta">${escapeHtml(meta || "Métadonnées partielles")}</span>
        </li>
      `;
    })
    .join("");
}

function renderHomeTodayFocus(day) {
  const todayState = getHomeTodayState(day);

  return todayState.rows
    .map((slot) => {
      const isCurrent = todayState.currentSlot === slot;
      return `
        <article class="${getProgramItemClasses("today-focus", slot)}${isCurrent ? " is-current-slot" : ""}">
          <div class="today-focus__top">
            <span class="today-focus__time${slot.meta ? " is-meta" : ""}">${escapeHtml(slot.time)}</span>
            <div class="program-badges">
              ${buildCurrentBadge(isCurrent)}
              ${buildProgramBadge(slot)}
            </div>
          </div>
          <div class="today-focus__title-row">
            ${renderFaIcon(slot.icon, "program-icon")}
            <strong class="today-focus__title">${escapeHtml(slot.title)}</strong>
          </div>
          <p class="today-focus__desc">${escapeHtml(slot.desc)}</p>
        </article>
      `;
    })
    .join("");
}

function renderNewsItem(item) {
  return `
    <article class="news-card">
      <p class="news-date">${escapeHtml(item.dateLabel || item.date || "")}</p>
      <div class="news-copy">
        <h2 class="news-title">${escapeHtml(item.title || "")}</h2>
        <p class="news-lead">${renderNewsField(item, "lead")}</p>
        <p class="news-body">${renderNewsField(item, "body")}</p>
      </div>
    </article>
  `;
}

function renderSchedulePanel(day, currentSlot) {
  const todayId = getCurrentDayId();
  const currentShowAside =
    day.id === todayId && !hasLiveTakeover() && state.currentShowLoaded && state.currentShow.show && !currentSlot
      ? `
        <div class="schedule-live-state">
          ${buildCurrentBadge(true)}
          <p class="schedule-live-note">${escapeHtml(state.currentShow.show)}${state.currentShow.isLive ? " · hors grille" : ""}</p>
        </div>
      `
      : "";

  return `
    <article class="schedule-card">
      <div class="schedule-day-head">
        <div class="schedule-day-copy">
          <div class="schedule-day-title-row">
            <span class="schedule-day-icon">${renderFaIcon(day.icon, "schedule-day-fa")}</span>
            <h2 class="schedule-day-title">${escapeHtml(day.name)}</h2>
          </div>
          <p class="schedule-day-summary">${escapeHtml(day.summary)}</p>
          <p class="schedule-day-note">Grille fluide, donnée à titre indicatif. Un direct, un décalage ou une dérive peuvent déplacer l'antenne.</p>
        </div>
        <div class="schedule-day-side">${currentShowAside}</div>
      </div>
      <div class="schedule-list">
        ${day.slots
          .map((slot) => {
            const isCurrent = currentSlot === slot;
            return `
              <article class="${getProgramItemClasses("schedule-item", slot)}${isCurrent ? " is-current-slot" : ""}">
                <div class="schedule-item__top">
                  <span class="schedule-item__time${slot.meta ? " is-meta" : ""}">${escapeHtml(slot.time)}</span>
                  <div class="program-badges">
                    ${buildCurrentBadge(isCurrent)}
                    ${buildProgramBadge(slot)}
                  </div>
                </div>
                <div class="schedule-item__title-row">
                  ${renderFaIcon(slot.icon, "program-icon")}
                  <strong class="schedule-item__title">${escapeHtml(slot.title)}</strong>
                </div>
                <p class="schedule-item__desc">${escapeHtml(slot.desc)}</p>
              </article>
            `;
          })
          .join("")}
      </div>
    </article>
  `;
}

function renderHistoryRows(rows, emptyText) {
  if (!rows.length) {
    return `<li class="history-empty">${escapeHtml(emptyText)}</li>`;
  }

  return rows
    .map((row) => {
      const title = asString(row.title) || "(sans titre)";
      const artist = asString(row.artist) || "—";
      const album = asString(row.album) || "—";
      const year = parseYear(row.year) || "—";
      return `
        <li class="history-row">
          <span class="history-cell" data-label="Date">
            <span class="history-cell__label">Date</span>
            <span class="history-cell__value">${escapeHtml(row.localDate || formatLocalDate(row.tsIso))}</span>
          </span>
          <span class="history-cell" data-label="Heure">
            <span class="history-cell__label">Heure</span>
            <span class="history-cell__value">${escapeHtml(row.localTime || formatLocalTime(row.tsIso))}</span>
          </span>
          <span class="history-cell" data-label="Titre">
            <span class="history-cell__label">Titre</span>
            <strong class="history-cell__value history-cell__value--strong">${escapeHtml(title)}</strong>
          </span>
          <span class="history-cell" data-label="Artiste">
            <span class="history-cell__label">Artiste</span>
            <span class="history-cell__value">${escapeHtml(artist)}</span>
          </span>
          <span class="history-cell" data-label="Album">
            <span class="history-cell__label">Album</span>
            <span class="history-cell__value">${escapeHtml(album)}</span>
          </span>
          <span class="history-cell" data-label="Année">
            <span class="history-cell__label">Année</span>
            <span class="history-cell__value">${escapeHtml(year)}</span>
          </span>
        </li>
      `;
    })
    .join("");
}

function renderProducerCard(producer) {
  return `
    <article class="producer-card">
      <img class="producer-photo" src="${escapeHtml(producer.image)}" alt="${escapeHtml(`Portrait de ${producer.name}`)}" loading="lazy" />
      <div>
        <p class="producer-role">${escapeHtml(producer.role)}</p>
        <h3 class="producer-name">${escapeHtml(producer.name)}</h3>
        <p class="producer-bio">${escapeHtml(producer.bio)}</p>
      </div>
    </article>
  `;
}

function renderShowCard(show) {
  let actionHtml = "";

  if (show.href) {
    actionHtml = `
      <a class="show-action" href="${escapeHtml(show.href)}" target="_blank" rel="noopener">
        ${renderShowActionLabel(show)}
      </a>
    `;
  } else if (show.actionLabel || (Array.isArray(show.actionLabelLines) && show.actionLabelLines.length)) {
    actionHtml = `<p class="show-action show-action--static">${renderShowActionLabel(show)}</p>`;
  }

  return `
    <article class="show-card">
      <img class="show-cover" src="${escapeHtml(show.image)}" alt="${escapeHtml(`Visuel ${show.title}`)}" loading="lazy" />
      <div class="show-body">
        <p class="show-meta">${escapeHtml(show.meta)}</p>
        <h3 class="show-title">${escapeHtml(show.title)}</h3>
        <p class="card-text">${escapeHtml(show.text)}</p>
        ${actionHtml}
      </div>
    </article>
  `;
}

function renderShowActionLabel(show) {
  if (COMMON.renderShowActionLabel) {
    return COMMON.renderShowActionLabel(show);
  }

  if (Array.isArray(show.actionLabelLines) && show.actionLabelLines.length) {
    return show.actionLabelLines.map((line) => `<span>${escapeHtml(line)}</span>`).join("");
  }

  return `<span>${escapeHtml(show.actionLabel || "")}</span>`;
}

function renderAboutLine(iconClass, htmlText) {
  return `
    <p class="about-line">
      ${renderFaIcon(iconClass, "about-fa")}
      <span>${htmlText}</span>
    </p>
  `;
}

function renderNewsField(item, fieldName) {
  const htmlFieldName = `${fieldName}Html`;
  if (item && typeof item[htmlFieldName] === "string" && item[htmlFieldName].trim()) {
    return item[htmlFieldName];
  }
  return escapeHtml((item && item[fieldName]) || "");
}

function renderEmptyCard(title, body) {
  return `
    <article class="news-card">
      <div class="news-copy">
        <h2 class="news-title">${escapeHtml(title)}</h2>
        <p class="news-body">${escapeHtml(body)}</p>
      </div>
    </article>
  `;
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

function hasLiveTakeover() {
  return Boolean(state.currentShow && state.currentShow.isLive) || isLiveTrack(state.currentTrack);
}

function getProgramItemClasses(baseClass, slot) {
  const classes = [baseClass];
  if (slot && slot.meta) classes.push("is-meta");
  if (slot && slot.highlight) classes.push("is-highlight");
  if (slot && slot.kind) classes.push(slot.kind);
  return classes.join(" ");
}

function buildProgramBadge(slot) {
  if (!slot || !slot.badge) return "";
  return `
    <span class="program-badge">
      ${renderFaIcon(slot.badgeIcon, "program-badge-icon")}
      <span>${escapeHtml(slot.badge)}</span>
    </span>
  `;
}

function buildCurrentBadge(isCurrent) {
  if (!isCurrent) return "";
  return '<span class="current-pill" aria-label="À l\'antenne"><span class="current-pill-dot" aria-hidden="true"></span><span>À l\'antenne</span></span>';
}

function buildLivePill() {
  return '<span class="live-pill" aria-label="ON AIR"><span class="live-pill-dot" aria-hidden="true"></span><span>ON AIR</span></span>';
}

function renderFaIcon(className, extraClassName = "") {
  if (!className || !COMMON.faIcon) return "";
  return COMMON.faIcon(className, extraClassName);
}

function renderLiveMonitorCard() {
  if (!hasLiveTakeover()) return "";

  const liveShowTitle = asString(state.currentShow.show) || "Direct à l'antenne";
  const liveTrackTitle = asString(state.currentTrack.title) || "Titre en direct";
  const liveTrackMeta = getTrackMeta(state.currentTrack) || "Métadonnées partielles ou indisponibles.";
  const liveSince = formatSinceLabel(state.currentShow.since) || "Prise d’antenne en direct réellement diffusée en ce moment.";

  return `
    <article class="page-card live-monitor-card">
      <div class="live-monitor-head">
        <div class="live-monitor-head__copy">
          <p class="section-kicker">Direct</p>
          <h2 class="live-monitor-title">${escapeHtml(liveShowTitle)}</h2>
        </div>
        <div class="live-monitor-badge-slot">
          ${buildLivePill()}
        </div>
      </div>
      <div class="live-monitor-current-block">
        <h3 class="live-monitor-title-track">${escapeHtml(liveTrackTitle)}</h3>
        <p class="live-monitor-meta">${escapeHtml(liveTrackMeta)}</p>
      </div>
      <p class="live-monitor-note">${escapeHtml(liveSince)}</p>
    </article>
  `;
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
  refs.signalIndicator.classList.toggle("is-live", state.streamAvailable);
  refs.signalIndicator.classList.toggle("is-offline", !state.streamAvailable);
  refs.signalIndicator.setAttribute("aria-label", state.streamAvailable ? "Flux audio disponible" : "Flux audio indisponible");
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

async function refreshLiveData() {
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
        state.historyHasFullArchive && !shouldLoadFullArchive ? mergeHistoryRows(state.historyRows, rows) : rows;
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

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function yieldToBrowser() {
  return new Promise((resolve) => {
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => resolve());
      return;
    }
    window.setTimeout(resolve, 0);
  });
}

function getDisplayDateParts(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: DISPLAY_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);

    const map = {};
    parts.forEach((part) => {
      if (part.type !== "literal") map[part.type] = part.value;
    });

    return {
      year: map.year,
      month: map.month,
      day: map.day,
      hour: map.hour,
      minute: map.minute,
    };
  } catch (error) {
    return {
      year: String(date.getFullYear()),
      month: String(date.getMonth() + 1).padStart(2, "0"),
      day: String(date.getDate()).padStart(2, "0"),
      hour: String(date.getHours()).padStart(2, "0"),
      minute: String(date.getMinutes()).padStart(2, "0"),
    };
  }
}

function ensureEnrichedRow(row) {
  if (!row || !row.tsIso) return null;
  const parts = getDisplayDateParts(row.tsIso);
  if (!parts) return null;

  const tsMs = Date.parse(row.tsIso);
  return {
    tsIso: row.tsIso,
    tsMs: Number.isFinite(tsMs) ? tsMs : 0,
    artist: asString(row.artist),
    title: asString(row.title),
    album: asString(row.album),
    year: asString(row.year),
    localYmd: `${parts.year}-${parts.month}-${parts.day}`,
    localDate: `${parts.day}/${parts.month}/${parts.year}`,
    localTime: `${parts.hour}:${parts.minute}`,
    localMinutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function getSortedHistoryRows(rows) {
  return (rows || [])
    .filter((row) => row && row.tsIso)
    .map((row) => ensureEnrichedRow(row))
    .filter(Boolean)
    .sort((left, right) => right.tsMs - left.tsMs);
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

function getDisplayZoneLabel() {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: DISPLAY_TIME_ZONE,
      timeZoneName: "shortOffset",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(new Date());
    const zonePart = parts.find((part) => part.type === "timeZoneName");
    const offset = normalizeUtcOffset(zonePart && zonePart.value);
    if (offset) return `${offset} · ${DISPLAY_TIME_ZONE}`;
  } catch (error) {
    return `UTC+01:00 / UTC+02:00 · ${DISPLAY_TIME_ZONE}`;
  }
  return `UTC+01:00 / UTC+02:00 · ${DISPLAY_TIME_ZONE}`;
}

function normalizeUtcOffset(rawLabel) {
  const match = String(rawLabel || "").match(/(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?/i);
  if (!match) return "";
  return `UTC${match[1]}${String(match[2] || "0").padStart(2, "0")}:${String(match[3] || "00").padStart(2, "0")}`;
}

function getTodayYmd() {
  const parts = getDisplayDateParts(new Date());
  if (!parts) return "";
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function formatLocalDate(isoDate) {
  const parts = getDisplayDateParts(isoDate);
  if (!parts) return "--";
  return `${parts.day}/${parts.month}/${parts.year}`;
}

function formatLocalTime(isoDate) {
  const parts = getDisplayDateParts(isoDate);
  if (!parts) return "--:--";
  return `${parts.hour}:${parts.minute}`;
}

function formatSinceLabel(unixSeconds) {
  const value = Number(unixSeconds);
  if (!Number.isFinite(value) || value <= 0) return "";
  return `Depuis ${formatLocalTime(value * 1000)}`;
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

function buildNowPlayingLabel(meta) {
  const artist = asString(meta && meta.artist);
  const album = asString(meta && meta.album);
  const title = asString(meta && meta.title);
  const parts = [];
  if (artist) parts.push(artist);
  if (album) parts.push(album);
  if (title) parts.push(title);
  return parts.length ? parts.join(" — ") : "Titre indisponible pour l'instant";
}

function isLiveTrack(meta) {
  const artist = asString(meta && meta.artist);
  const title = asString(meta && meta.title);
  return /\(DIRECT\)/i.test(artist) || /^DIRECT\s*-/i.test(title);
}

function getTrackMeta(row) {
  const parts = [];
  const artist = asString(row.artist);
  const album = asString(row.album);
  const year = parseYear(row.year);
  if (artist) parts.push(artist);
  if (album) parts.push(album);
  if (year) parts.push(year);
  return parts.join(" · ");
}

function getTrackSignature(meta) {
  return [
    asString(meta && meta.artist).toLowerCase(),
    asString(meta && meta.title).toLowerCase(),
    asString(meta && meta.album).toLowerCase(),
    parseYear(meta && meta.year).toLowerCase(),
  ]
    .filter(Boolean)
    .join("||");
}

function parseAlbumYearFromTitle(displayTitle) {
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

function splitArtistAndTitle(rawValue) {
  const raw = asString(rawValue);
  if (!raw) return { artist: "", title: "" };
  const match = raw.match(/^(.+?)\s+[—-]\s+(.+)$/);
  if (!match) return { artist: "", title: raw };
  return {
    artist: asString(match[1]),
    title: asString(match[2]),
  };
}

function buildMailtoHref(subject, body) {
  if (COMMON.buildMailtoHref) {
    return COMMON.buildMailtoHref({ subject, body });
  }
  return `mailto:radio@lechatnoirradio.fr?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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

function firstString(source, keys) {
  if (!source || typeof source !== "object") return "";
  for (const key of keys) {
    const value = asString(source[key]);
    if (value) return value;
  }
  return "";
}

function detectIOSPhoneDevice() {
  const userAgent = String((window.navigator && window.navigator.userAgent) || "");
  const platform = String((window.navigator && window.navigator.platform) || "");
  return /iPhone|iPod/i.test(userAgent) || /iPhone|iPod/i.test(platform);
}

function parseYear(rawValue) {
  const raw = String(rawValue || "");
  const match = raw.match(/(19|20)\d{2}/);
  return match ? match[0] : "";
}

function asString(value) {
  if (COMMON.asString) return COMMON.asString(value);
  if (typeof value !== "string") return "";
  return value.trim();
}

function escapeHtml(value) {
  if (COMMON.escapeHtml) return COMMON.escapeHtml(value);
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

init();
