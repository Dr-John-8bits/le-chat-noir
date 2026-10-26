import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDaySky, minutesToPercent } from "../../assets/js/day-sky.js";
import { SCHEDULE_TIMELINE_DAYS } from "../../assets/js/content-data.js";

const saturday = SCHEDULE_TIMELINE_DAYS.find((d) => d.id === "sat");

test("minutesToPercent : minuit, midi, fin de journée", () => {
  assert.equal(minutesToPercent(0), 0);
  assert.equal(minutesToPercent(12 * 60), 50);
  assert.equal(minutesToPercent(7 * 60), 29.2);
  assert.equal(minutesToPercent(23 * 60 + 59), 99.9);
});

test("buildDaySky : un trait par créneau horaire, « Puis » et minuit ignorés", () => {
  const { ticks } = buildDaySky(saturday);
  const labels = ticks.map((t) => t.minutes);
  assert.deepEqual(labels, [7 * 60, 10 * 60, 11 * 60 + 45, 12 * 60, 14 * 60, 16 * 60, 18 * 60, 19 * 60, 23 * 60 + 40]);
});

test("buildDaySky : repère « maintenant » seulement avec une heure valide", () => {
  assert.deepEqual(buildDaySky(saturday, 16 * 60 + 42).now, { minutes: 16 * 60 + 42, percent: 69.6 });
  assert.equal(buildDaySky(saturday).now, null);
  assert.equal(buildDaySky(saturday, Number.NaN).now, null);
  assert.equal(buildDaySky(saturday, 24 * 60).now, null);
  assert.equal(buildDaySky(saturday, -1).now, null);
});

test("buildDaySky : jour vide ou absent sans erreur", () => {
  assert.deepEqual(buildDaySky(null, 600), { ticks: [], now: { minutes: 600, percent: 41.7 } });
  assert.deepEqual(buildDaySky({ slots: [] }).ticks, []);
});

test("buildDaySky : grille réelle — traits croissants, uniques, dans la journée", () => {
  for (const day of SCHEDULE_TIMELINE_DAYS) {
    const { ticks } = buildDaySky(day);
    assert.ok(ticks.length > 0, `${day.id} : au moins un trait`);
    for (let i = 0; i < ticks.length; i += 1) {
      assert.ok(ticks[i].percent > 0 && ticks[i].percent < 100, `${day.id} : trait hors journée`);
      if (i > 0) assert.ok(ticks[i].minutes > ticks[i - 1].minutes, `${day.id} : ordre ou doublon`);
    }
  }
});
