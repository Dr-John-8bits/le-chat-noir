import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getDisplayDateParts,
  formatLocalTime,
  formatLocalDate,
  formatSinceLabel,
  localYmdOf,
  getDayIdForDate,
  normalizeUtcOffset,
  searchWindow,
} from "../../assets/js/time.js";
import { enrichHistoryRow } from "../../assets/js/csv.js";

test("conversion nominale UTC → Europe/Paris (été, UTC+2)", () => {
  assert.equal(formatLocalTime("2026-06-11T11:03:06Z"), "13:03");
  assert.equal(formatLocalDate("2026-06-11T11:03:06Z"), "11/06/2026");
});

test("conversion hiver (UTC+1)", () => {
  assert.equal(formatLocalTime("2026-01-15T11:00:00Z"), "12:00");
});

test("nuit de passage à l'heure d'été — 29 mars 2026", () => {
  assert.equal(formatLocalTime("2026-03-29T00:30:00Z"), "01:30");
  assert.equal(formatLocalTime("2026-03-29T01:30:00Z"), "03:30");
});

test("nuit de retour à l'heure d'hiver — 25 octobre 2026 (heure ambiguë)", () => {
  assert.equal(formatLocalTime("2026-10-25T00:30:00Z"), "02:30");
  assert.equal(formatLocalTime("2026-10-25T01:30:00Z"), "02:30");
});

test("minuit Paris ≠ minuit UTC : bascule de jour correcte", () => {
  assert.equal(localYmdOf("2026-06-11T22:30:00Z"), "2026-06-12");
  assert.equal(getDayIdForDate("2026-06-11T22:30:00Z"), "fri");
  assert.equal(getDayIdForDate("2026-06-11T12:00:00Z"), "thu");
});

test("entrée epoch (ms) et Date acceptées", () => {
  const ms = Date.parse("2026-06-11T11:03:06Z");
  assert.equal(formatLocalTime(ms), "13:03");
  assert.equal(formatLocalTime(new Date(ms)), "13:03");
});

test("entrées invalides → fallback sans plantage", () => {
  assert.equal(getDisplayDateParts("n'importe quoi"), null);
  assert.equal(formatLocalTime("n'importe quoi"), "--:--");
  assert.equal(formatSinceLabel(0), "");
  assert.equal(formatSinceLabel(-5), "");
});

test("formatSinceLabel : epoch secondes → heure de Paris", () => {
  const since = Math.floor(Date.parse("2026-06-11T11:00:00Z") / 1000);
  assert.equal(formatSinceLabel(since), "Depuis 13:00");
});

test("normalizeUtcOffset", () => {
  assert.equal(normalizeUtcOffset("GMT+2"), "UTC+02:00");
  assert.equal(normalizeUtcOffset("UTC+02:00"), "UTC+02:00");
  assert.equal(normalizeUtcOffset("rien"), "");
});

function entry(tsIso, title) {
  return enrichHistoryRow({ tsIso, artist: "A", title });
}

test("searchWindow : tri par proximité du créneau demandé", () => {
  const entries = [
    entry("2026-06-11T08:00:00Z", "10h00 Paris"),
    entry("2026-06-11T12:00:00Z", "14h00 Paris"),
    entry("2026-06-11T12:30:00Z", "14h30 Paris"),
    entry("2026-06-10T12:10:00Z", "autre jour"),
  ];
  const { rows, totalCount } = searchWindow(entries, { dateYmd: "2026-06-11", minutes: 14 * 60 + 20, count: 2 });
  assert.equal(totalCount, 3);
  assert.deepEqual(rows.map((r) => r.title), ["14h30 Paris", "14h00 Paris"]);
});

test("searchWindow : sans heure → dernières diffusions du jour", () => {
  const entries = [
    entry("2026-06-11T08:00:00Z", "matin"),
    entry("2026-06-11T18:00:00Z", "soir"),
  ];
  const { rows } = searchWindow(entries, { dateYmd: "2026-06-11", count: 10 });
  assert.deepEqual(rows.map((r) => r.title), ["soir", "matin"]);
});

test("searchWindow : heure ambiguë du 25 octobre — les deux passages 02:30 ressortent", () => {
  const entries = [
    entry("2026-10-25T00:30:00Z", "premier 02:30"),
    entry("2026-10-25T01:30:00Z", "second 02:30"),
    entry("2026-10-25T10:00:00Z", "midi moins le quart"),
  ];
  const { rows } = searchWindow(entries, { dateYmd: "2026-10-25", minutes: 2 * 60 + 30, count: 2 });
  assert.deepEqual(rows.map((r) => r.title).sort(), ["premier 02:30", "second 02:30"]);
});
