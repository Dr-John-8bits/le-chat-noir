(function () {
  var utils = window.LCNAppUtils || {};

  var CSV_URL = "https://stream.lechatnoirradio.fr/history/nowplaying.csv";
  var DISPLAY_TIME_ZONE = "Europe/Paris";
  var AUTO_MS = 20000;
  var FETCH_CACHE_MS = 15000;
  var HISTORY_CACHE_KEY = "lcn-history-preview-v1";
  var HISTORY_CACHE_AT_KEY = "lcn-history-preview-at";
  var HISTORY_CACHE_MAX_ROWS = 240;
  var HISTORY_CACHE_MAX_AGE_MS = 3 * 60 * 1000;
  var DEFAULT_VISIBLE_ROWS = 30;
  var LOAD_MORE_STEP = 30;

  var refs = {
    dayInput: document.getElementById("historyDayInput"),
    timeInput: document.getElementById("historyTimeInput"),
    searchButton: document.getElementById("historySearchButton"),
    list: document.getElementById("historyList"),
    moreRow: document.getElementById("historyMoreRow"),
    moreButton: document.getElementById("historyMoreButton"),
    modeLabel: document.getElementById("historyDisplayLabel"),
    statusText: document.getElementById("historyStatusText"),
    timezonePill: document.getElementById("historyTimezoneLabel"),
  };

  if (!refs.dayInput || !refs.timeInput || !refs.searchButton || !refs.list || !refs.moreButton) return;

  var state = {
    rows: [],
    fetchCacheRows: null,
    fetchCacheAt: 0,
    autoTimer: null,
    visibleCount: DEFAULT_VISIBLE_ROWS,
    statusText: "Chargement des dernières diffusions…",
    timezoneLabel: getDisplayZoneLabel(),
  };

  function asString(value) {
    return typeof utils.asString === "function" ? utils.asString(value) : String(value || "").trim();
  }

  function escapeHtml(value) {
    return typeof utils.escapeHtml === "function"
      ? utils.escapeHtml(value)
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

  function parseCsvLine(line) {
    return typeof utils.parseCsvLine === "function" ? utils.parseCsvLine(line) : [line];
  }

  function ensureEnrichedRow(row) {
    return typeof utils.ensureEnrichedRow === "function" ? utils.ensureEnrichedRow(row, DISPLAY_TIME_ZONE) : row;
  }

  function getDisplayZoneLabel() {
    return typeof utils.getDisplayZoneLabel === "function" ? utils.getDisplayZoneLabel(DISPLAY_TIME_ZONE) : DISPLAY_TIME_ZONE;
  }

  function getTodayYmd() {
    return typeof utils.getTodayYmd === "function" ? utils.getTodayYmd(DISPLAY_TIME_ZONE) : "";
  }

  function formatLocalDate(value) {
    return typeof utils.formatLocalDate === "function" ? utils.formatLocalDate(value, DISPLAY_TIME_ZONE) : "--";
  }

  function formatLocalTime(value) {
    return typeof utils.formatLocalTime === "function" ? utils.formatLocalTime(value, DISPLAY_TIME_ZONE) : "--:--";
  }

  function loadPreviewRows() {
    try {
      var cachedAt = Number(window.localStorage.getItem(HISTORY_CACHE_AT_KEY) || 0);
      if (!cachedAt || Date.now() - cachedAt > HISTORY_CACHE_MAX_AGE_MS) return null;
      var raw = window.localStorage.getItem(HISTORY_CACHE_KEY);
      if (!raw) return null;
      var rows = JSON.parse(raw);
      if (!Array.isArray(rows) || !rows.length) return null;
      return rows
        .map(function (row) {
          return ensureEnrichedRow(row);
        })
        .filter(Boolean);
    } catch (error) {
      return null;
    }
  }

  function savePreviewRows(rows) {
    try {
      var previewRows = (rows || [])
        .slice(0, HISTORY_CACHE_MAX_ROWS)
        .map(function (row) {
          return ensureEnrichedRow(row);
        })
        .filter(Boolean);
      window.localStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify(previewRows));
      window.localStorage.setItem(HISTORY_CACHE_AT_KEY, String(Date.now()));
    } catch (error) {
      return;
    }
  }

  function parseCsvRows(csvText) {
    var normalized = String(csvText || "")
      .replace(/\r\n?/g, "\n")
      .trim();
    if (!normalized) return [];

    var lines = normalized.split("\n");
    var parsed = [];

    for (var index = 1; index < lines.length; index += 1) {
      var line = lines[index];
      if (!line) continue;
      var cols = parseCsvLine(line);
      var enriched = ensureEnrichedRow({
        tsIso: cols[0] || "",
        artist: cols[2] || "",
        title: cols[3] || "",
        album: cols[4] || "",
        year: cols[5] || "",
      });
      if (enriched) parsed.push(enriched);
    }

    parsed.sort(function (left, right) {
      return right.tsMs - left.tsMs;
    });

    return parsed;
  }

  function getTrackMeta(row) {
    var parts = [];
    var artist = asString(row && row.artist);
    var album = asString(row && row.album);
    var year = parseYear(row && row.year);
    if (artist) parts.push(artist);
    if (album) parts.push(album);
    if (year) parts.push(year);
    return parts.join(" · ");
  }

  function renderRows(rows, emptyText) {
    if (!rows || !rows.length) {
      refs.list.innerHTML = '<li class="history-empty">' + escapeHtml(emptyText) + "</li>";
      if (refs.moreRow) refs.moreRow.hidden = true;
      return;
    }

    refs.list.innerHTML = rows
      .map(function (row) {
        var title = asString(row.title) || "(sans titre)";
        var artist = asString(row.artist) || "—";
        var album = asString(row.album) || "—";
        var year = parseYear(row.year) || "—";
        var mobileMeta = [artist, album, year]
          .filter(function (value) {
            return value && value !== "—";
          })
          .join(" · ") || "—";

        return (
          '<li class="history-row">' +
          '<span class="history-cell history-cell--date" data-label="Date">' +
          '<span class="history-cell__label">Date</span>' +
          '<span class="history-cell__value">' +
          escapeHtml(row.localDate || formatLocalDate(row.tsIso)) +
          "</span>" +
          "</span>" +
          '<span class="history-cell history-cell--time" data-label="Heure">' +
          '<span class="history-cell__label">Heure</span>' +
          '<span class="history-cell__value">' +
          escapeHtml(row.localTime || formatLocalTime(row.tsIso)) +
          "</span>" +
          "</span>" +
          '<span class="history-cell history-cell--title" data-label="Titre">' +
          '<span class="history-cell__label">Titre</span>' +
          '<strong class="history-cell__value history-cell__value--strong">' +
          escapeHtml(title) +
          "</strong>" +
          '<span class="history-cell__meta">' +
          escapeHtml(mobileMeta) +
          "</span>" +
          "</span>" +
          '<span class="history-cell history-cell--artist" data-label="Artiste">' +
          '<span class="history-cell__label">Artiste</span>' +
          '<span class="history-cell__value">' +
          escapeHtml(artist) +
          "</span>" +
          "</span>" +
          '<span class="history-cell history-cell--album" data-label="Album">' +
          '<span class="history-cell__label">Album</span>' +
          '<span class="history-cell__value">' +
          escapeHtml(album) +
          "</span>" +
          "</span>" +
          '<span class="history-cell history-cell--year" data-label="Année">' +
          '<span class="history-cell__label">Année</span>' +
          '<span class="history-cell__value">' +
          escapeHtml(year) +
          "</span>" +
          "</span>" +
          "</li>"
        );
      })
      .join("");
  }

  function getDisplayRows() {
    var selectedDay = refs.dayInput.value || getTodayYmd();
    var selectedTime = refs.timeInput.value || "";

    if (!selectedTime) {
      var latestRows = state.rows.filter(function (row) {
        return row && row.localYmd === selectedDay;
      });

      return {
        label: selectedDay === getTodayYmd() ? "Derniers passages du jour" : "Recherche ponctuelle : " + selectedDay,
        rows: latestRows.slice(0, state.visibleCount),
        totalCount: latestRows.length,
      };
    }

    var filtered = state.rows.filter(function (row) {
      return row.localYmd === selectedDay;
    });
    var tokens = selectedTime.split(":");
    var referenceMinutes = Number(tokens[0] || 0) * 60 + Number(tokens[1] || 0);

    filtered.sort(function (left, right) {
      return (
        Math.abs((left.localMinutes == null ? 0 : left.localMinutes) - referenceMinutes) -
          Math.abs((right.localMinutes == null ? 0 : right.localMinutes) - referenceMinutes) ||
        right.tsMs - left.tsMs
      );
    });

    return {
      label: "Recherche ponctuelle : titres les plus proches de " + selectedTime,
      rows: filtered.slice(0, state.visibleCount),
      totalCount: filtered.length,
    };
  }

  function renderView(emptyText) {
    var display = getDisplayRows();

    if (refs.modeLabel) refs.modeLabel.textContent = display.label;
    if (refs.statusText) refs.statusText.textContent = state.statusText;
    if (refs.timezonePill) refs.timezonePill.textContent = state.timezoneLabel;

    renderRows(display.rows, emptyText || "Aucun titre trouvé pour cette sélection.");

    if (refs.moreRow) {
      refs.moreRow.hidden = !display.totalCount || display.rows.length >= display.totalCount;
    }
  }

  async function fetchRows() {
    var now = Date.now();

    if (state.fetchCacheRows && now - state.fetchCacheAt < FETCH_CACHE_MS) {
      return state.fetchCacheRows;
    }

    var response = await fetch(CSV_URL + "?t=" + now, { cache: "no-store" });
    if (!response.ok) throw new Error(String(response.status));

    var rows = parseCsvRows(await response.text());
    state.fetchCacheRows = rows;
    state.fetchCacheAt = now;
    savePreviewRows(rows);
    return rows;
  }

  async function refreshHistory() {
    try {
      var rows = await fetchRows();
      state.rows = rows;
      state.statusText = "Historique de diffusion actualisé";
      renderView();
    } catch (error) {
      state.statusText = "Impossible de charger l'historique pour le moment";
      renderView("Impossible de charger les dernières diffusions.");
    }
  }

  function stopAutoTimer() {
    if (!state.autoTimer) return;
    window.clearInterval(state.autoTimer);
    state.autoTimer = null;
  }

  function startAutoTimer() {
    stopAutoTimer();
    state.autoTimer = window.setInterval(function () {
      if (!document.hidden) refreshHistory();
    }, AUTO_MS);
  }

  function scheduleInitialRefresh() {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(
        function () {
          refreshHistory();
        },
        { timeout: 240 }
      );
      return;
    }

    window.requestAnimationFrame(function () {
      window.setTimeout(function () {
        refreshHistory();
      }, 120);
    });
  }

  function handleSearch() {
    state.visibleCount = DEFAULT_VISIBLE_ROWS;
    if (!state.rows.length) {
      state.statusText = "Chargement des dernières diffusions…";
      renderView("Chargement des dernières diffusions…");
      refreshHistory();
      return;
    }
    renderView();
  }

  function initialize() {
    refs.dayInput.value = getTodayYmd();
    refs.timeInput.value = "";
    state.timezoneLabel = getDisplayZoneLabel();
    if (refs.timezonePill) refs.timezonePill.textContent = state.timezoneLabel;

    var previewRows = loadPreviewRows();
    if (previewRows && previewRows.length) {
      state.rows = previewRows;
      state.statusText = "Affichage rapide depuis le cache local…";
      renderView();
    } else {
      renderRows([], "Chargement des dernières diffusions…");
    }

    refs.searchButton.addEventListener("click", handleSearch);
    refs.moreButton.addEventListener("click", function () {
      state.visibleCount += LOAD_MORE_STEP;
      renderView();
    });

    refs.dayInput.addEventListener("change", function () {
      handleSearch();
    });

    refs.timeInput.addEventListener("change", function () {
      handleSearch();
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        stopAutoTimer();
        return;
      }
      refreshHistory();
      startAutoTimer();
    });

    scheduleInitialRefresh();
    startAutoTimer();
  }

  initialize();
})();
