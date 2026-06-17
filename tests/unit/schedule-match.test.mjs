import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeShowName,
  parseScheduleTimeLabel,
  findCurrentScheduleSlot,
  createShowSlotResolver,
  getHomeTodayState,
  buildSyntheticCurrentShowSlot,
} from "../../assets/js/schedule-match.js";
import { SCHEDULE_TIMELINE_DAYS } from "../../assets/js/content-data.js";

const monday = SCHEDULE_TIMELINE_DAYS.find((d) => d.id === "mon");

test("normalizeShowName : alias réels de production", () => {
  assert.equal(normalizeShowName("Fragments"), "matinee fragments");
  assert.equal(normalizeShowName("Matinée : Fragments"), "matinee fragments");
  assert.equal(normalizeShowName("L'Autre Nuit"), "l autre nuit");
  assert.equal(normalizeShowName("blocSonic mixtapes"), "blocsonic");
  assert.equal(normalizeShowName("Les Ondes du Chat Noir"), "les ondes du chat noir");
  assert.equal(normalizeShowName("Émission Inédite"), "emission inedite");
});

test("normalizeShowName : « Pseudocumentaire » est le nom officiel ; l'ancienne coquille est tolérée", () => {
  assert.equal(normalizeShowName("Le Pseudocumentaire de l'espace"), "le pseudocumentaire de l espace");
  assert.equal(normalizeShowName("Pseudocumentaire de l'espace"), "le pseudocumentaire de l espace");
  assert.equal(normalizeShowName("Le Pseudodocumentaire de l'espace"), "le pseudocumentaire de l espace");
});

test("parseScheduleTimeLabel : formats 18h00 / 18:00, libellés non horaires", () => {
  assert.equal(parseScheduleTimeLabel("18h00"), 18 * 60);
  assert.equal(parseScheduleTimeLabel("07:00"), 7 * 60);
  assert.equal(parseScheduleTimeLabel("Puis"), null);
  assert.equal(parseScheduleTimeLabel(""), null);
});

test("findCurrentScheduleSlot : créneau théorique selon l'heure", () => {
  const at8h = findCurrentScheduleSlot(monday, 8 * 60);
  assert.equal(at8h.title, "Matinée : Fragments");
  const at18h30 = findCurrentScheduleSlot(monday, 18 * 60 + 30);
  assert.equal(at18h30.title, "blocSonic");
  const beforeAnything = findCurrentScheduleSlot({ id: "x", slots: [{ time: "09h00", title: "A" }] }, 60);
  assert.equal(beforeAnything, null);
});

test("résolution du show réel : alias + désambiguïsation par since", () => {
  const resolver = createShowSlotResolver();
  const slot = resolver(monday, { show: "Fragments", kind: "music_block", isLive: false, since: 0 }, 9 * 60);
  assert.equal(slot.title, "Matinée : Fragments");
});

test("résolution : show absent de la grille → null, puis slot synthétique en tête", () => {
  const resolver = createShowSlotResolver();
  const currentShow = { show: "Session mystère", kind: "editorial_event", isLive: false, since: 0 };
  assert.equal(resolver(monday, currentShow, 10 * 60), null);

  const { rows, currentSlot } = getHomeTodayState(monday, currentShow, resolver, 10 * 60);
  assert.equal(currentSlot.isSyntheticCurrent, true);
  assert.equal(rows[0].title, "Session mystère");
  assert.ok(rows.length <= 4);
});

test("getHomeTodayState : show réel trouvé → fenêtre de grille à partir du slot courant", () => {
  const resolver = createShowSlotResolver();
  const currentShow = { show: "blocSonic", kind: "music_block", isLive: false, since: 0 };
  const { rows, currentSlot } = getHomeTodayState(monday, currentShow, resolver, 18 * 60 + 15);
  assert.equal(currentSlot.title, "blocSonic");
  assert.equal(rows[0].title, "blocSonic");
});

test("slot synthétique : DIRECT — heure de début (pas un mot qui déborde la colonne)", () => {
  const since = Math.floor(Date.parse("2026-06-14T18:30:00Z") / 1000); // 20h30 à Paris (été)
  const slot = buildSyntheticCurrentShowSlot({ show: "", isLive: true, kind: "live", since });
  assert.equal(slot.title, "DIRECT");
  assert.equal(slot.time, "20h30");
  // sans `since` : repli court, jamais le mot long « Maintenant »
  const noSince = buildSyntheticCurrentShowSlot({ show: "X", isLive: true, since: 0 });
  assert.equal(noSince.time, "·");
});

test("doublons dans la journée : désambiguïsation par heure de début (since)", () => {
  const sunday = SCHEDULE_TIMELINE_DAYS.find((d) => d.id === "sun");
  const resolver = createShowSlotResolver();
  const sinceParis22h = Math.floor(Date.parse("2026-06-14T20:30:00Z") / 1000);
  const slot = resolver(sunday, { show: "Documents de terrain", kind: "music_block", isLive: false, since: sinceParis22h }, 22 * 60 + 40);
  assert.equal(slot.time, "22h00");
});
