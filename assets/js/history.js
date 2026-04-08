(function () {
  var utils = window.LCNAppUtils || {};

  var HISTORY_CSV_URL = "https://stream.lechatnoirradio.fr/history/nowplaying.csv";
  var DISPLAY_TIME_ZONE = "Europe/Paris";
  var HISTORY_REFRESH_MS = 20000;
  var DEFAULT_HISTORY_VISIBLE_ROWS = 30;
  var HISTORY_LOAD_MORE_STEP = 30;
  var HISTORY_PREVIEW_REFRESH_ROWS = 240;
  var CSV_PARSE_CHUNK_SIZE = 180;

  var refs = {
    timezoneLabel: document.getElementById("historyTimezoneLabel"),
    displayLabel: document.getElementById("historyDisplayLabel"),
    statusText: document.getElementById("historyStatusText"),
    dayInput: document.getElementById("historyDayInput"),
    timeInput: document.getElementById("historyTimeInput"),
    searchButton: document.getElementById("historySearchButton"),
    list: document.getElementById("historyList"),
    moreRow: document.getElementById("historyMoreRow"),
    moreButton: document.getElementById("historyMoreButton"),
  };

  var state = {
    rows: [],
    sortedRows: [],
    historyDay: getTodayYmd(),
    historyTime: "",
    historyVisibleCount: DEFAULT_HISTORY_VISIBLE_ROWS,
    hasFullArchive: false,
    refreshPromise: null,
    statusText: "Chargement des archives complètes…",
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

  function yieldToBrowser() {
    return typeof utils.yieldToBrowser === "function"
      ? utils.yieldToBrowser()
      : new Promise(function (resolve) {
          window.setTimeout(resolve, 0);
        });
  }

  function ensureEnrichedRow(row) {
    return typeof utils.ensureEnrichedRow === "function" ? utils.ensureEnrichedRow(row, DISPLAY_TIME_ZONE) : row;
  }

  function getSortedHistoryRows(rows) {
    return typeof utils.getSortedHistoryRows === "function" ? utils.getSortedHistoryRows(rows, DISPLAY_TIME_ZONE) : rows || [];
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

  function initialize() {
    if (refs.timezoneLabel) refs.timezoneLabel.textContent = getDisplayZoneLabel();
    if (refs.dayInput) refs.dayInput.value = state.historyDay;
    if (refs.timeInput) refs.timeInput.value = state.historyTime;

    bindEvents();
    render();
    refreshHistory({ full: true });

    window.setInterval(function () {
      if (!document.hidden) refreshHistory({ full: false, silent: true });
    }, HISTORY_REFRESH_MS);

    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) refreshHistory({ full: false, silent: true });
    });
  }

  function bindEvents() {
    if (refs.dayInput) {
      refs.dayInput.addEventListener("change", function (event) {
        state.historyDay = event.target.value || getTodayYmd();
        state.historyVisibleCount = DEFAULT_HISTORY_VISIBLE_ROWS;
        render();
      });
    }

    if (refs.timeInput) {
      refs.timeInput.addEventListener("change", function (event) {
        state.historyTime = event.target.value || "";
        state.historyVisibleCount = DEFAULT_HISTORY_VISIBLE_ROWS;
        render();
      });
    }

    if (refs.searchButton) {
      refs.searchButton.addEventListener("click", function () {
        state.historyVisibleCount = DEFAULT_HISTORY_VISIBLE_ROWS;
        if (!state.hasFullArchive) {
          refreshHistory({ full: true });
          return;
        }
        render();
      });
    }

    if (refs.moreButton) {
      refs.moreButton.addEventListener("click", function () {
        state.historyVisibleCount += HISTORY_LOAD_MORE_STEP;
        render();
      });
    }
  }

  function render() {
    var display = getHistoryDisplay();

    if (refs.displayLabel) refs.displayLabel.textContent = display.label;
    if (refs.statusText) refs.statusText.textContent = state.statusText;
    if (refs.list) refs.list.innerHTML = renderHistoryRows(display.rows, "Aucun titre trouvé pour cette sélection.");

    if (refs.moreRow) {
      refs.moreRow.hidden = !(display.totalCount > display.rows.length);
    }
  }

  function getHistoryDisplay() {
    var selectedDay = state.historyDay || getTodayYmd();
    var selectedTime = state.historyTime || "";
    var rows = state.sortedRows;

    if (!selectedTime) {
      var dayRows = rows.filter(function (row) {
        return row.localYmd === selectedDay;
      });

      return {
        label: selectedDay === getTodayYmd() ? "Derniers passages du jour" : "Recherche ponctuelle : " + selectedDay,
        rows: dayRows.slice(0, state.historyVisibleCount),
        totalCount: dayRows.length,
      };
    }

    var timeParts = selectedTime.split(":");
    var referenceMinutes = Number(timeParts[0] || 0) * 60 + Number(timeParts[1] || 0);
    var selectedDayRows = rows.filter(function (row) {
      return row.localYmd === selectedDay;
    });
    var closestRows = selectedDayRows
      .slice()
      .sort(function (left, right) {
        return (
          Math.abs((left.localMinutes == null ? 0 : left.localMinutes) - referenceMinutes) -
            Math.abs((right.localMinutes == null ? 0 : right.localMinutes) - referenceMinutes) ||
          right.tsMs - left.tsMs
        );
      })
      .slice(0, state.historyVisibleCount);

    return {
      label: "Recherche ponctuelle : titres les plus proches de " + selectedTime,
      rows: closestRows,
      totalCount: selectedDayRows.length,
    };
  }

  function renderHistoryRows(rows, emptyText) {
    if (!rows.length) {
      return '<li class="history-empty">' + escapeHtml(emptyText) + "</li>";
    }

    return rows
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

  async function refreshHistory(options) {
    if (state.refreshPromise) return state.refreshPromise;

    var config = options || {};
    var shouldLoadFullArchive = Boolean(config.full) || !state.hasFullArchive;

    if (!config.silent) {
      state.statusText = shouldLoadFullArchive ? "Chargement des archives complètes…" : "Historique de diffusion actualisé";
      render();
    }

    state.refreshPromise = (async function () {
      try {
        var rows = await fetchHistoryRows({ full: shouldLoadFullArchive });
        var nextRows =
          state.hasFullArchive && !shouldLoadFullArchive
            ? mergeHistoryRows(state.rows, rows)
            : rows;
        setHistoryRows(nextRows, { full: state.hasFullArchive || shouldLoadFullArchive });
        state.statusText = shouldLoadFullArchive ? "Archives complètes chargées" : "Historique de diffusion actualisé";
        render();
      } catch (error) {
        state.statusText = "Impossible de charger l'historique pour le moment";
        render();
      } finally {
        state.refreshPromise = null;
      }
    })();

    return state.refreshPromise;
  }

  async function fetchHistoryRows(options) {
    var response = await fetch(HISTORY_CSV_URL + "?t=" + Date.now(), {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    return parseCsvRowsAsync(await response.text(), {
      limitFromEnd: options && options.full ? 0 : HISTORY_PREVIEW_REFRESH_ROWS,
    });
  }

  async function parseCsvRowsAsync(csvText, options) {
    var normalized = String(csvText || "").replace(/\r\n?/g, "\n").trim();
    if (!normalized) return [];

    var lines = normalized.split("\n");
    var rows = [];
    var config = options || {};
    var startIndex =
      Number.isFinite(config.limitFromEnd) && config.limitFromEnd > 0
        ? Math.max(1, lines.length - config.limitFromEnd)
        : 1;
    var linesSinceYield = 0;

    for (var index = startIndex; index < lines.length; index += 1) {
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

      if (enriched) rows.push(enriched);

      linesSinceYield += 1;
      if (linesSinceYield >= CSV_PARSE_CHUNK_SIZE) {
        linesSinceYield = 0;
        await yieldToBrowser();
      }
    }

    return rows;
  }

  function getHistoryRowKey(row) {
    return [row.tsIso, row.artist, row.title, row.album, row.year]
      .map(function (value) {
        return asString(value);
      })
      .join("::");
  }

  function mergeHistoryRows(existingRows, incomingRows) {
    var mergedMap = new Map();

    existingRows.concat(incomingRows).forEach(function (row) {
      var enriched = ensureEnrichedRow(row);
      if (!enriched) return;
      var key = getHistoryRowKey(enriched);
      if (!mergedMap.has(key)) {
        mergedMap.set(key, enriched);
      }
    });

    return Array.from(mergedMap.values()).sort(function (left, right) {
      return right.tsMs - left.tsMs;
    });
  }

  function setHistoryRows(rows, options) {
    var nextRows = (rows || [])
      .filter(function (row) {
        return row && row.tsIso;
      })
      .map(function (row) {
        return ensureEnrichedRow(row);
      })
      .filter(Boolean);

    state.rows = nextRows;
    state.sortedRows = getSortedHistoryRows(nextRows);
    state.hasFullArchive = Boolean(options && options.full);
  }

  initialize();
})();
