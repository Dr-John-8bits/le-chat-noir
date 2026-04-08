(function () {
  var common = window.LCNPageCommon || {};
  var utils = window.LCNAppUtils || {};

  var NOW_PLAYING_URL = "https://stream.lechatnoirradio.fr/nowplaying.json";
  var CURRENT_SHOW_URL = "https://stream.lechatnoirradio.fr/current-show.json";
  var LISTENERS_URL = "https://stream.lechatnoirradio.fr/listeners.json";
  var DISPLAY_TIME_ZONE = "Europe/Paris";
  var META_REFRESH_MS = 12000;
  var LISTENERS_REFRESH_MS = 30000;

  var refs = {
    currentBadge: document.getElementById("directCurrentBadge"),
    currentShow: document.getElementById("directCurrentShow"),
    currentSince: document.getElementById("directCurrentSince"),
    trackTitle: document.getElementById("directTrackTitle"),
    trackMeta: document.getElementById("directTrackMeta"),
    listenersCurrent: document.getElementById("directListenersCurrent"),
    listenersPeak: document.getElementById("directListenersPeak"),
    listenersUnit: document.getElementById("directListenersUnit"),
    listenersUpdated: document.getElementById("directListenersUpdated"),
    refreshButton: document.getElementById("directRefreshButton"),
  };

  var state = {
    currentShow: {
      show: "",
      kind: "",
      isLive: false,
      since: 0,
    },
    currentTrack: {
      artist: "",
      title: "",
      album: "",
      year: "",
    },
    listeners: {
      current: null,
      peak: null,
      updatedAt: "",
    },
  };

  function asString(value) {
    return typeof utils.asString === "function" ? utils.asString(value) : String(value || "").trim();
  }

  function escapeHtml(value) {
    return typeof common.escapeHtml === "function"
      ? common.escapeHtml(value)
      : String(value || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
  }

  function parseYear(value) {
    return typeof utils.parseYear === "function" ? utils.parseYear(value) : "";
  }

  function firstString(source, keys) {
    return typeof utils.firstString === "function" ? utils.firstString(source, keys) : "";
  }

  function splitArtistAndTitle(rawValue) {
    return typeof utils.splitArtistAndTitle === "function"
      ? utils.splitArtistAndTitle(rawValue)
      : { artist: "", title: asString(rawValue) };
  }

  function parseAlbumYearFromTitle(value) {
    return typeof utils.parseAlbumYearFromTitle === "function"
      ? utils.parseAlbumYearFromTitle(value)
      : { album: "", year: "" };
  }

  function extractNowPlayingMeta(payload) {
    var roots = [];
    if (payload && typeof payload === "object") roots.push(payload);
    if (payload && payload.now_playing && typeof payload.now_playing === "object") roots.push(payload.now_playing);
    if (payload && payload.now_playing && payload.now_playing.song && typeof payload.now_playing.song === "object") {
      roots.push(payload.now_playing.song);
    }
    if (payload && payload.song && typeof payload.song === "object") roots.push(payload.song);
    if (payload && payload.track && typeof payload.track === "object") roots.push(payload.track);

    var artist = "";
    var title = "";
    var album = "";
    var year = "";

    roots.forEach(function (root) {
      if (!artist) artist = firstString(root, ["artist", "artist_name", "creator", "author", "performer", "dj", "host"]);
      if (!title) title = firstString(root, ["title", "name", "track", "song", "now_playing"]);
      if (!album) album = firstString(root, ["album", "release", "record"]);
      if (!year) year = parseYear(firstString(root, ["year", "date", "released", "release_year"]));
    });

    if (!title) {
      title = asString(payload && payload.now_playing);
    }

    if (title) {
      var split = splitArtistAndTitle(title);
      if (!artist && split.artist) artist = split.artist;
      title = split.title || title;
    }

    if (title) {
      var parsed = parseAlbumYearFromTitle(title);
      if (!album && parsed.album) album = parsed.album;
      if (!year && parsed.year) year = parsed.year;
    }

    return {
      artist: artist,
      title: title,
      album: album,
      year: year,
    };
  }

  function normalizeListeners(payload) {
    if (!payload || typeof payload !== "object") return null;
    var current = Number(payload.current);
    var peak = Number(payload.peak);
    return {
      current: Number.isFinite(current) ? current : null,
      peak: Number.isFinite(peak) ? peak : null,
      updatedAt: asString(payload.updatedAt),
    };
  }

  function formatLocalTime(value) {
    if (!value) return "—";
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    try {
      return new Intl.DateTimeFormat("fr-FR", {
        timeZone: DISPLAY_TIME_ZONE,
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch (error) {
      return "—";
    }
  }

  function formatSince(unixSeconds) {
    var value = Number(unixSeconds);
    if (!Number.isFinite(value) || value <= 0) return "Mise à jour continue du show courant.";
    return "Depuis " + formatLocalTime(value * 1000);
  }

  function getTrackMeta(meta) {
    var parts = [];
    if (asString(meta.artist)) parts.push(asString(meta.artist));
    if (asString(meta.album)) parts.push(asString(meta.album));
    if (parseYear(meta.year)) parts.push(parseYear(meta.year));
    return parts.join(" · ");
  }

  function renderBadge() {
    if (!refs.currentBadge) return;
    var label = state.currentShow.isLive ? "ON AIR" : "À l’antenne";
    var className = state.currentShow.isLive ? "live-pill" : "current-pill";
    var dotClass = state.currentShow.isLive ? "live-pill-dot" : "current-pill-dot";
    refs.currentBadge.innerHTML =
      '<span class="' +
      className +
      '" aria-label="' +
      escapeHtml(label) +
      '">' +
      '<span class="' +
      dotClass +
      '" aria-hidden="true"></span>' +
      "<span>" +
      escapeHtml(label) +
      "</span></span>";
  }

  function render() {
    renderBadge();

    if (refs.currentShow) refs.currentShow.textContent = state.currentShow.show || "—";
    if (refs.currentSince) refs.currentSince.textContent = formatSince(state.currentShow.since);
    if (refs.trackTitle) refs.trackTitle.textContent = state.currentTrack.title || "—";
    if (refs.trackMeta) refs.trackMeta.textContent = getTrackMeta(state.currentTrack) || "Métadonnées partielles ou indisponibles.";
    if (refs.listenersCurrent) refs.listenersCurrent.textContent = Number.isFinite(state.listeners.current) ? String(state.listeners.current) : "—";
    if (refs.listenersPeak) refs.listenersPeak.textContent = Number.isFinite(state.listeners.peak) ? String(state.listeners.peak) : "—";
    if (refs.listenersUnit) refs.listenersUnit.textContent = state.listeners.current === 1 ? "auditeur·ice" : "auditeur·ices";
    if (refs.listenersUpdated) {
      refs.listenersUpdated.textContent = state.listeners.updatedAt
        ? "Mis à jour à " + formatLocalTime(state.listeners.updatedAt)
        : "Mise à jour silencieuse toutes les 30 secondes.";
    }
  }

  async function refreshCurrentShow() {
    if (typeof common.extractCurrentShow !== "function") return;
    try {
      var response = await fetch(CURRENT_SHOW_URL + "?t=" + Date.now(), { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      var payload = common.extractCurrentShow(await response.json());
      state.currentShow = {
        show: asString(payload.show),
        kind: asString(payload.kind),
        isLive: Boolean(payload.isLive),
        since: Number(payload.since) || 0,
      };
      render();
    } catch (error) {
      return;
    }
  }

  async function refreshNowPlaying() {
    try {
      var response = await fetch(NOW_PLAYING_URL + "?t=" + Date.now(), { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      var payload = extractNowPlayingMeta(await response.json());
      state.currentTrack = {
        artist: asString(payload.artist),
        title: asString(payload.title),
        album: asString(payload.album),
        year: asString(payload.year),
      };
      render();
    } catch (error) {
      return;
    }
  }

  async function refreshListeners() {
    try {
      var response = await fetch(LISTENERS_URL + "?t=" + Date.now(), { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      var payload = normalizeListeners(await response.json());
      if (!payload) throw new Error("invalid-payload");
      state.listeners = payload;
      render();
    } catch (error) {
      return;
    }
  }

  function refreshAll() {
    refreshCurrentShow();
    refreshNowPlaying();
    refreshListeners();
  }

  function initialize() {
    render();
    refreshAll();

    if (refs.refreshButton) {
      refs.refreshButton.addEventListener("click", refreshAll);
    }

    window.setInterval(function () {
      if (!document.hidden) {
        refreshCurrentShow();
        refreshNowPlaying();
      }
    }, META_REFRESH_MS);

    window.setInterval(function () {
      if (!document.hidden) refreshListeners();
    }, LISTENERS_REFRESH_MS);

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) return;
      refreshAll();
    });
  }

  initialize();
})();
