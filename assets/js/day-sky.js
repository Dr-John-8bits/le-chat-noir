import { parseScheduleTimeLabel } from "./schedule-match.js";

const MINUTES_PER_DAY = 24 * 60;

// Position (en % de la journée) d'une heure exprimée en minutes depuis minuit.
export function minutesToPercent(minutes) {
  return Math.round((minutes / MINUTES_PER_DAY) * 1000) / 10;
}

// « Ciel de la journée » de la grille : un trait par début de créneau horaire
// (les « Puis » n'ont pas d'heure et sont ignorés) et, pour aujourd'hui seulement,
// un repère sur l'heure courante. Le ciel montre l'heure, jamais le show : le
// créneau à l'antenne reste celui de current-show.json.
export function buildDaySky(day, nowMinutes = null) {
  const seen = new Set();
  const ticks = [];
  for (const slot of (day && day.slots) || []) {
    const minutes = parseScheduleTimeLabel(slot && slot.time);
    if (minutes == null || minutes <= 0 || minutes >= MINUTES_PER_DAY || seen.has(minutes)) continue;
    seen.add(minutes);
    ticks.push({ minutes, percent: minutesToPercent(minutes) });
  }
  ticks.sort((a, b) => a.minutes - b.minutes);

  const hasNow = Number.isFinite(nowMinutes) && nowMinutes >= 0 && nowMinutes < MINUTES_PER_DAY;
  return {
    ticks,
    now: hasNow ? { minutes: nowMinutes, percent: minutesToPercent(nowMinutes) } : null,
  };
}
