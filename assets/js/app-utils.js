(function () {
  function asString(value) {
    if (typeof value !== "string") return "";
    return value.trim();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function parseYear(rawValue) {
    var raw = String(rawValue || "");
    var match = raw.match(/(19|20)\d{2}/);
    return match ? match[0] : "";
  }

  function firstString(source, keys) {
    if (!source || typeof source !== "object") return "";
    for (var index = 0; index < keys.length; index += 1) {
      var value = asString(source[keys[index]]);
      if (value) return value;
    }
    return "";
  }

  function shouldDisableWebVolumeControl() {
    var nav = window.navigator || {};
    var platform = String(nav.platform || "");
    var userAgent = String(nav.userAgent || "");
    var userAgentDataPlatform = String((nav.userAgentData && nav.userAgentData.platform) || "");
    var maxTouchPoints = Number(nav.maxTouchPoints || 0);
    var shortestScreenEdge = Math.min(
      Number((window.screen && window.screen.width) || 0) || Infinity,
      Number((window.screen && window.screen.height) || 0) || Infinity
    );
    var explicitIPhoneOrIPod =
      /iPhone|iPod/i.test(platform) ||
      /iPhone|iPod/i.test(userAgent) ||
      /iPhone|iPod/i.test(userAgentDataPlatform);

    if (explicitIPhoneOrIPod) return true;

    var isDisguisedIPhone =
      /AppleWebKit/i.test(userAgent) &&
      /Mac/i.test(platform + " " + userAgentDataPlatform) &&
      maxTouchPoints > 1 &&
      shortestScreenEdge < 500;

    return isDisguisedIPhone;
  }

  function parseCsvLine(line) {
    var values = [];
    var current = "";
    var inQuotes = false;

    for (var index = 0; index < line.length; index += 1) {
      var char = line[index];
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
    return new Promise(function (resolve) {
      if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(function () {
          resolve();
        });
        return;
      }
      window.setTimeout(resolve, 0);
    });
  }

  function getDisplayDateParts(value, displayTimeZone) {
    var date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    try {
      var parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: displayTimeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(date);

      var map = {};
      parts.forEach(function (part) {
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

  function ensureEnrichedRow(row, displayTimeZone) {
    if (!row || !row.tsIso) return null;
    var parts = getDisplayDateParts(row.tsIso, displayTimeZone);
    if (!parts) return null;

    var tsMs = Date.parse(row.tsIso);
    return {
      tsIso: row.tsIso,
      tsMs: Number.isFinite(tsMs) ? tsMs : 0,
      artist: asString(row.artist),
      title: asString(row.title),
      album: asString(row.album),
      year: asString(row.year),
      localYmd: parts.year + "-" + parts.month + "-" + parts.day,
      localDate: parts.day + "/" + parts.month + "/" + parts.year,
      localTime: parts.hour + ":" + parts.minute,
      localMinutes: Number(parts.hour) * 60 + Number(parts.minute),
    };
  }

  function getSortedHistoryRows(rows, displayTimeZone) {
    return (rows || [])
      .filter(function (row) {
        return row && row.tsIso;
      })
      .map(function (row) {
        return ensureEnrichedRow(row, displayTimeZone);
      })
      .filter(Boolean)
      .sort(function (left, right) {
        return right.tsMs - left.tsMs;
      });
  }

  function normalizeUtcOffset(rawLabel) {
    var match = String(rawLabel || "").match(/(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?/i);
    if (!match) return "";
    return "UTC" + match[1] + String(match[2] || "0").padStart(2, "0") + ":" + String(match[3] || "00").padStart(2, "0");
  }

  function getDisplayZoneLabel(displayTimeZone) {
    try {
      var parts = new Intl.DateTimeFormat("en-US", {
        timeZone: displayTimeZone,
        timeZoneName: "shortOffset",
        hour: "2-digit",
        minute: "2-digit",
      }).formatToParts(new Date());
      var zonePart = parts.find(function (part) {
        return part.type === "timeZoneName";
      });
      var offset = normalizeUtcOffset(zonePart && zonePart.value);
      if (offset) return offset + " · " + displayTimeZone;
    } catch (error) {
      return "UTC+01:00 / UTC+02:00 · " + displayTimeZone;
    }
    return "UTC+01:00 / UTC+02:00 · " + displayTimeZone;
  }

  function getTodayYmd(displayTimeZone) {
    var parts = getDisplayDateParts(new Date(), displayTimeZone);
    if (!parts) return "";
    return parts.year + "-" + parts.month + "-" + parts.day;
  }

  function formatLocalDate(isoDate, displayTimeZone) {
    var parts = getDisplayDateParts(isoDate, displayTimeZone);
    if (!parts) return "--";
    return parts.day + "/" + parts.month + "/" + parts.year;
  }

  function formatLocalTime(isoDate, displayTimeZone) {
    var parts = getDisplayDateParts(isoDate, displayTimeZone);
    if (!parts) return "--:--";
    return parts.hour + ":" + parts.minute;
  }

  function formatSinceLabel(unixSeconds, displayTimeZone) {
    var value = Number(unixSeconds);
    if (!Number.isFinite(value) || value <= 0) return "";
    return "Depuis " + formatLocalTime(value * 1000, displayTimeZone);
  }

  function buildNowPlayingLabel(meta) {
    var artist = asString(meta && meta.artist);
    var album = asString(meta && meta.album);
    var title = asString(meta && meta.title);
    var parts = [];
    if (artist) parts.push(artist);
    if (album) parts.push(album);
    if (title) parts.push(title);
    return parts.length ? parts.join(" — ") : "Titre indisponible pour l'instant";
  }

  function isLiveTrack(meta) {
    var artist = asString(meta && meta.artist);
    var title = asString(meta && meta.title);
    return /\(DIRECT\)/i.test(artist) || /^DIRECT\s*-/i.test(title);
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
    var text = asString(displayTitle);
    if (!text) return { album: "", year: "" };
    var groups = text.match(/\(([^()]*)\)/g);
    if (!groups || !groups.length) return { album: "", year: "" };
    var inside = groups[groups.length - 1].replace(/[()]/g, "").trim();
    if (!inside) return { album: "", year: "" };

    var year = parseYear(inside);
    var album = inside;
    if (year) {
      album = inside.replace(year, "").replace(/[,;/-]\s*$/, "").replace(/\s{2,}/g, " ").trim();
    }
    return { album: album, year: year };
  }

  function splitArtistAndTitle(rawValue) {
    var raw = asString(rawValue);
    if (!raw) return { artist: "", title: "" };
    var match = raw.match(/^(.+?)\s+[—-]\s+(.+)$/);
    if (!match) return { artist: "", title: raw };
    return {
      artist: asString(match[1]),
      title: asString(match[2]),
    };
  }

  window.LCNAppUtils = {
    asString: asString,
    escapeHtml: escapeHtml,
    parseYear: parseYear,
    firstString: firstString,
    shouldDisableWebVolumeControl: shouldDisableWebVolumeControl,
    parseCsvLine: parseCsvLine,
    yieldToBrowser: yieldToBrowser,
    getDisplayDateParts: getDisplayDateParts,
    ensureEnrichedRow: ensureEnrichedRow,
    getSortedHistoryRows: getSortedHistoryRows,
    normalizeUtcOffset: normalizeUtcOffset,
    getDisplayZoneLabel: getDisplayZoneLabel,
    getTodayYmd: getTodayYmd,
    formatLocalDate: formatLocalDate,
    formatLocalTime: formatLocalTime,
    formatSinceLabel: formatSinceLabel,
    buildNowPlayingLabel: buildNowPlayingLabel,
    isLiveTrack: isLiveTrack,
    getTrackMeta: getTrackMeta,
    getTrackSignature: getTrackSignature,
    parseAlbumYearFromTitle: parseAlbumYearFromTitle,
    splitArtistAndTitle: splitArtistAndTitle,
  };
})();
