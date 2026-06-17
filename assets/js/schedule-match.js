import { DISPLAY_TIME_ZONE } from "./config.js";
import { getDisplayDateParts, getDayIdForDate, getCurrentLocalMinutes } from "./time.js";
import { SCHEDULE_ALIAS_PAIRS } from "./schedule-data.js";

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeComparableText(value) {
  let raw = asString(value).toLowerCase();
  if (!raw) return "";
  raw = raw.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return raw
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Variantes de noms antenne → titre public. Les paires brutes viennent de
// schedule.json (export du Concepteur-Grille, dont la coquille historique
// « Pseudodocumentaire ») ; la normalisation reste faite ici, en un seul endroit.
const SHOW_NAME_ALIASES = {};
SCHEDULE_ALIAS_PAIRS.forEach(([variant, canonical]) => {
  const key = normalizeComparableText(variant);
  const value = normalizeComparableText(canonical);
  if (key && value) SHOW_NAME_ALIASES[key] = value;
});

export function normalizeShowName(value) {
  const normalized = normalizeComparableText(value);
  return SHOW_NAME_ALIASES[normalized] || normalized;
}

export function parseScheduleTimeLabel(rawValue) {
  const raw = asString(rawValue).toLowerCase();
  if (!raw) return null;
  const match = raw.match(/^(\d{1,2})\s*[h:]\s*(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

export function findCurrentScheduleSlot(day, nowMinutes = getCurrentLocalMinutes()) {
  if (!day || !Array.isArray(day.slots) || !day.slots.length) return null;
  let lastExplicitMinutes = null;
  let candidate = null;

  day.slots.forEach((slot, index) => {
    const explicitMinutes = parseScheduleTimeLabel(slot && slot.time);
    if (explicitMinutes != null) lastExplicitMinutes = explicitMinutes;
    if (lastExplicitMinutes == null || lastExplicitMinutes > nowMinutes) return;
    if (
      !candidate ||
      lastExplicitMinutes > candidate.startMinutes ||
      (lastExplicitMinutes === candidate.startMinutes && index > candidate.index)
    ) {
      candidate = { slot, index, startMinutes: lastExplicitMinutes };
    }
  });

  return candidate ? candidate.slot : null;
}

export function getScheduleMatchesByShow(day, showName) {
  const normalizedShow = normalizeShowName(showName);
  if (!normalizedShow || !day || !Array.isArray(day.slots)) {
    return { normalizedShow, matches: [] };
  }

  let lastExplicitMinutes = null;
  const matches = [];

  day.slots.forEach((slot, index) => {
    const explicitMinutes = parseScheduleTimeLabel(slot && slot.time);
    if (explicitMinutes != null) lastExplicitMinutes = explicitMinutes;
    if (normalizeShowName(slot && slot.title) !== normalizedShow) return;
    matches.push({ slot, index, startMinutes: lastExplicitMinutes });
  });

  return { normalizedShow, matches };
}

export function pickScheduleMatch(matches, referenceMinutes) {
  if (!Array.isArray(matches) || !matches.length) return null;

  const eligible =
    typeof referenceMinutes === "number"
      ? matches.filter((m) => typeof m.startMinutes !== "number" || m.startMinutes <= referenceMinutes)
      : matches.slice();

  if (!eligible.length) return matches[0];

  eligible.sort((a, b) => {
    const am = typeof a.startMinutes === "number" ? a.startMinutes : -1;
    const bm = typeof b.startMinutes === "number" ? b.startMinutes : -1;
    if (bm !== am) return bm - am;
    return b.index - a.index;
  });

  return eligible[0];
}

function sinceMinutesForDay(currentShow, day, timeZone) {
  const sinceSeconds = Number(currentShow && currentShow.since);
  if (!Number.isFinite(sinceSeconds) || sinceSeconds <= 0) return null;
  const sinceDate = new Date(sinceSeconds * 1000);
  if (getDayIdForDate(sinceDate, timeZone) !== day.id) return null;
  const parts = getDisplayDateParts(sinceDate, timeZone);
  if (!parts) return null;
  return Number(parts.hour) * 60 + Number(parts.minute);
}

export function createShowSlotResolver({ timeZone = DISPLAY_TIME_ZONE } = {}) {
  let cached = null;

  return function resolveCurrentShowSlot(day, currentShow, nowMinutes = getCurrentLocalMinutes(timeZone)) {
    if (!day || !currentShow || !asString(currentShow.show)) return null;

    const { normalizedShow, matches } = getScheduleMatchesByShow(day, currentShow.show);
    if (!matches.length) return null;

    const remember = (match) => {
      cached = { dayId: day.id, normalizedShow, index: match.index };
      return match.slot;
    };

    if (matches.length === 1) return remember(matches[0]);

    const sinceMinutes = sinceMinutesForDay(currentShow, day, timeZone);
    if (sinceMinutes != null) {
      const sinceMatch = pickScheduleMatch(matches, sinceMinutes);
      if (sinceMatch) return remember(sinceMatch);
    }

    if (cached && cached.dayId === day.id && cached.normalizedShow === normalizedShow) {
      const cachedMatch = matches.find((m) => m.index === cached.index);
      if (cachedMatch) return cachedMatch.slot;
    }

    const nowMatch = pickScheduleMatch(matches, nowMinutes);
    return nowMatch ? remember(nowMatch) : null;
  };
}

export function getCurrentShowDescription(currentShow) {
  if (!currentShow || !asString(currentShow.show)) return "Show réellement diffusé à l'antenne.";
  if (currentShow.isLive || currentShow.kind === "live") {
    return "Prise d'antenne en direct réellement diffusée en ce moment.";
  }
  if (currentShow.kind === "editorial_event") return "Émission réellement diffusée à l'antenne.";
  if (currentShow.kind === "editorial_window") return "Fenêtre éditoriale réellement diffusée à l'antenne.";
  return "Bloc réellement diffusé à l'antenne.";
}

function formatStartHour(since) {
  const seconds = Number(since);
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const parts = getDisplayDateParts(seconds * 1000);
  return parts ? `${parts.hour}h${parts.minute}` : "";
}

export function buildSyntheticCurrentShowSlot(currentShow) {
  // Heure de début du show (depuis `since`), comme toutes les lignes de grille —
  // évite un libellé long ("Maintenant") qui débordait la colonne d'heure étroite.
  const startHour = formatStartHour(currentShow && currentShow.since);
  return {
    time: startHour || "·",
    title: asString(currentShow && currentShow.show) || (currentShow && currentShow.isLive ? "DIRECT" : "Show en cours"),
    desc: getCurrentShowDescription(currentShow),
    highlight: true,
    isSyntheticCurrent: true,
  };
}

export function getHomeTodayState(day, currentShow, resolver, nowMinutes = getCurrentLocalMinutes()) {
  const slots = day && Array.isArray(day.slots) ? day.slots.filter(Boolean) : [];
  if (!slots.length) return { rows: [], currentSlot: null };

  const matchedSlot = resolver ? resolver(day, currentShow, nowMinutes) : null;
  if (matchedSlot) {
    const matchedIndex = slots.indexOf(matchedSlot);
    return { rows: slots.slice(matchedIndex, matchedIndex + 4), currentSlot: matchedSlot };
  }

  if (currentShow && asString(currentShow.show)) {
    const theoreticalSlot = findCurrentScheduleSlot(day, nowMinutes);
    let theoreticalIndex = theoreticalSlot ? slots.indexOf(theoreticalSlot) : 0;
    if (theoreticalIndex < 0) theoreticalIndex = 0;
    const synthetic = buildSyntheticCurrentShowSlot(currentShow);
    return {
      rows: [synthetic].concat(slots.slice(theoreticalIndex, theoreticalIndex + 3)).slice(0, 4),
      currentSlot: synthetic,
    };
  }

  const fallbackSlot = findCurrentScheduleSlot(day, nowMinutes);
  let startIndex = 0;
  if (fallbackSlot) {
    const fallbackIndex = slots.indexOf(fallbackSlot);
    if (fallbackIndex >= 0) startIndex = fallbackIndex;
  }

  return { rows: slots.slice(startIndex, startIndex + 4), currentSlot: null };
}
