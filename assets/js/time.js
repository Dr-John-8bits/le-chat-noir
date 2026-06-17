import { DISPLAY_TIME_ZONE } from "./config.js";

const WEEKDAY_IDS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const partsFormatters = new Map();
const weekdayFormatters = new Map();

function getPartsFormatter(timeZone) {
  if (!partsFormatters.has(timeZone)) {
    partsFormatters.set(
      timeZone,
      new Intl.DateTimeFormat("en-GB", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    );
  }
  return partsFormatters.get(timeZone);
}

function toDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  const date = new Date(value);
  return date;
}

export function getDisplayDateParts(value, timeZone = DISPLAY_TIME_ZONE) {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return null;

  try {
    const parts = getPartsFormatter(timeZone).formatToParts(date);
    const map = {};
    for (const part of parts) {
      if (part.type !== "literal") map[part.type] = part.value;
    }
    return {
      year: map.year,
      month: map.month,
      day: map.day,
      hour: map.hour,
      minute: map.minute,
    };
  } catch {
    return {
      year: String(date.getFullYear()),
      month: String(date.getMonth() + 1).padStart(2, "0"),
      day: String(date.getDate()).padStart(2, "0"),
      hour: String(date.getHours()).padStart(2, "0"),
      minute: String(date.getMinutes()).padStart(2, "0"),
    };
  }
}

export function localYmdOf(value, timeZone = DISPLAY_TIME_ZONE) {
  const parts = getDisplayDateParts(value, timeZone);
  if (!parts) return "";
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function localMinutesOf(value, timeZone = DISPLAY_TIME_ZONE) {
  const parts = getDisplayDateParts(value, timeZone);
  if (!parts) return null;
  return Number(parts.hour) * 60 + Number(parts.minute);
}

export function getTodayYmd(timeZone = DISPLAY_TIME_ZONE) {
  return localYmdOf(new Date(), timeZone);
}

export function getCurrentLocalMinutes(timeZone = DISPLAY_TIME_ZONE) {
  return localMinutesOf(new Date(), timeZone);
}

export function formatLocalDate(value, timeZone = DISPLAY_TIME_ZONE) {
  const parts = getDisplayDateParts(value, timeZone);
  if (!parts) return "--";
  return `${parts.day}/${parts.month}/${parts.year}`;
}

export function formatLocalTime(value, timeZone = DISPLAY_TIME_ZONE) {
  const parts = getDisplayDateParts(value, timeZone);
  if (!parts) return "--:--";
  return `${parts.hour}:${parts.minute}`;
}

export function formatSinceLabel(unixSeconds, timeZone = DISPLAY_TIME_ZONE) {
  const value = Number(unixSeconds);
  if (!Number.isFinite(value) || value <= 0) return "";
  return `Depuis ${formatLocalTime(value * 1000, timeZone)}`;
}

export function normalizeUtcOffset(rawLabel) {
  const match = String(rawLabel || "").match(/(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?/i);
  if (!match) return "";
  return `UTC${match[1]}${String(match[2] || "0").padStart(2, "0")}:${String(match[3] || "00").padStart(2, "0")}`;
}

export function getDisplayZoneLabel(timeZone = DISPLAY_TIME_ZONE) {
  const fallback = `UTC+01:00 / UTC+02:00 · ${timeZone}`;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(new Date());
    const zonePart = parts.find((part) => part.type === "timeZoneName");
    const offset = normalizeUtcOffset(zonePart && zonePart.value);
    return offset ? `${offset} · ${timeZone}` : fallback;
  } catch {
    return fallback;
  }
}

export function getDayIdForDate(value, timeZone = DISPLAY_TIME_ZONE) {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "";

  try {
    if (!weekdayFormatters.has(timeZone)) {
      weekdayFormatters.set(
        timeZone,
        new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" })
      );
    }
    const weekday = weekdayFormatters.get(timeZone).format(date).slice(0, 3).toLowerCase();
    return WEEKDAY_IDS.includes(weekday) ? weekday : "";
  } catch {
    return WEEKDAY_IDS[date.getDay()] || "";
  }
}

export function getCurrentDayId(timeZone = DISPLAY_TIME_ZONE) {
  return getDayIdForDate(new Date(), timeZone) || "mon";
}

export function searchWindow(entries, { dateYmd, minutes = null, count = 10 } = {}) {
  const rows = Array.isArray(entries) ? entries : [];
  const dayRows = rows.filter((row) => row && row.localYmd === dateYmd);

  if (minutes == null) {
    const sorted = dayRows.slice().sort((a, b) => b.tsMs - a.tsMs);
    return { rows: sorted.slice(0, count), totalCount: dayRows.length };
  }

  const sorted = dayRows.slice().sort((a, b) => {
    const da = Math.abs((a.localMinutes == null ? 0 : a.localMinutes) - minutes);
    const db = Math.abs((b.localMinutes == null ? 0 : b.localMinutes) - minutes);
    return da - db || b.tsMs - a.tsMs;
  });

  return { rows: sorted.slice(0, count), totalCount: dayRows.length };
}
