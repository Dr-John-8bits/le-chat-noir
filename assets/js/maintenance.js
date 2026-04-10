(function () {
  var common = window.LCNPageCommon || {};
  var utils = window.LCNAppUtils || {};

  var NOW_PLAYING_URL = "https://stream.lechatnoirradio.fr/nowplaying.json";
  var CURRENT_SHOW_URL = "https://stream.lechatnoirradio.fr/current-show.json";
  var DISPLAY_TIME_ZONE = "Europe/Paris";
  var META_REFRESH_MS = 12000;

  var refs = {
    currentShow: document.getElementById("maintenanceCurrentShow"),
    currentSince: document.getElementById("maintenanceCurrentSince"),
    trackTitle: document.getElementById("maintenanceTrackTitle"),
    trackMeta: document.getElementById("maintenanceTrackMeta"),
    updatedAt: document.getElementById("maintenanceUpdatedAt"),
  };

  var state = {
    currentShow: {
      show: "",
      since: 0,
    },
    currentTrack: {
      artist: "",
      title: "",
      album: "",
      year: "",
    },
    updatedAt: 0,
  };

  function asString(value) {
    return typeof utils.asString === "function" ? utils.asString(value) : String(value || "").trim();
  }

  function firstString(source, keys) {
    return typeof utils.firstString === "function" ? utils.firstString(source, keys) : "";
  }

  function parseYear(value) {
    return typeof utils.parseYear === "function" ? utils.parseYear(value) : "";
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

  function render() {
    if (refs.currentShow) refs.currentShow.textContent = state.currentShow.show || "—";
    if (refs.currentSince) refs.currentSince.textContent = formatSince(state.currentShow.since);
    if (refs.trackTitle) refs.trackTitle.textContent = state.currentTrack.title || "—";
    if (refs.trackMeta) refs.trackMeta.textContent = getTrackMeta(state.currentTrack) || "Métadonnées partielles ou indisponibles.";
    if (refs.updatedAt) {
      refs.updatedAt.textContent = state.updatedAt
        ? "Dernière mise à jour à " + formatLocalTime(state.updatedAt)
        : "Mise à jour continue.";
    }
  }

  async function refreshCurrentShow() {
    if (typeof common.extractCurrentShow !== "function") return;
    var response = await fetch(CURRENT_SHOW_URL + "?t=" + Date.now(), { cache: "no-store" });
    if (!response.ok) throw new Error(String(response.status));
    var payload = common.extractCurrentShow(await response.json());
    state.currentShow = {
      show: asString(payload.show),
      since: Number(payload.since) || 0,
    };
  }

  async function refreshNowPlaying() {
    var response = await fetch(NOW_PLAYING_URL + "?t=" + Date.now(), { cache: "no-store" });
    if (!response.ok) throw new Error(String(response.status));
    var payload = extractNowPlayingMeta(await response.json());
    state.currentTrack = {
      artist: asString(payload.artist),
      title: asString(payload.title),
      album: asString(payload.album),
      year: asString(payload.year),
    };
  }

  async function refreshMeta() {
    try {
      await Promise.all([refreshCurrentShow(), refreshNowPlaying()]);
      state.updatedAt = Date.now();
      render();
    } catch (error) {
      render();
    }
  }

  function init() {
    render();
    refreshMeta();
    window.setInterval(refreshMeta, META_REFRESH_MS);
  }

  init();
})();
