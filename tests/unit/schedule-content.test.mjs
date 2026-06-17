import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  GENERATED_JS_PATH,
  SCHEDULE_SCHEMA_ID,
  parseSchedule,
  readSchedule,
  renderBrowserPayload,
  toAliasPairs,
  toTimelineDays,
} from "../../scripts/lib/schedule-content.mjs";

const DAY_IDS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function makeValidSchedule(overrides = {}) {
  return {
    schema: SCHEDULE_SCHEMA_ID,
    aliases: { "Nom antenne": "Nom public" },
    days: DAY_IDS.map((id, index) => ({
      id,
      name: `Jour ${index}`,
      shortName: `J${index}`,
      summary: `Résumé ${index}`,
      slots: [
        {
          time: "00h00",
          title: "La Grande Nuit",
          desc: "Paysages sonores.",
          showId: "la-grande-nuit",
          kind: "music_block",
          start: "00:00",
          end: "07:00",
        },
      ],
    })),
    ...overrides,
  };
}

function parseOf(schedule) {
  return () => parseSchedule(JSON.stringify(schedule));
}

test("parseSchedule : accepte une grille conforme", () => {
  const schedule = parseSchedule(JSON.stringify(makeValidSchedule()));
  assert.equal(schedule.days.length, 7);
});

test("parseSchedule : rejette un schéma inconnu", () => {
  assert.throws(parseOf(makeValidSchedule({ schema: "lcn-schedule/99" })), /schéma attendu/);
});

test("parseSchedule : rejette un JSON illisible ou une racine non-objet", () => {
  assert.throws(() => parseSchedule("{pas du json"), /JSON illisible/);
  assert.throws(() => parseSchedule("null"), /racine doit être un objet/);
  assert.throws(() => parseSchedule("[]"), /racine doit être un objet/);
});

test("parseSchedule : rejette une timezone autre que Europe/Paris", () => {
  assert.throws(parseOf(makeValidSchedule({ timezone: "America/New_York" })), /timezone attendue/);
  assert.equal(parseSchedule(JSON.stringify(makeValidSchedule({ timezone: "Europe/Paris" }))).days.length, 7);
});

test("parseSchedule : rejette un horaire impossible, accepte les libellés libres", () => {
  const badHour = makeValidSchedule();
  badHour.days[0].slots[0].time = "25h99";
  assert.throws(parseOf(badHour), /horaire impossible/);

  const badMinutes = makeValidSchedule();
  badMinutes.days[0].slots[0].time = "18h75";
  assert.throws(parseOf(badMinutes), /horaire impossible/);

  const freeLabels = makeValidSchedule();
  freeLabels.days[0].slots[0].time = "Puis";
  assert.equal(parseSchedule(JSON.stringify(freeLabels)).days[0].slots[0].time, "Puis");
});

test("parseSchedule : exige les 7 jours dans l'ordre lundi → dimanche", () => {
  const missing = makeValidSchedule();
  missing.days = missing.days.slice(0, 6);
  assert.throws(parseOf(missing), /exactement 7 jours/);

  const swapped = makeValidSchedule();
  [swapped.days[0], swapped.days[1]] = [swapped.days[1], swapped.days[0]];
  assert.throws(parseOf(swapped), /ordre lundi → dimanche/);
});

test("parseSchedule : rejette un créneau sans titre ou sans description", () => {
  const noTitle = makeValidSchedule();
  noTitle.days[2].slots[0].title = "";
  assert.throws(parseOf(noTitle), /slots\[0\]\.title/);

  const noDesc = makeValidSchedule();
  noDesc.days[4].slots[0].desc = "   ";
  assert.throws(parseOf(noDesc), /slots\[0\]\.desc/);
});

test("parseSchedule : meta/highlight valent true ou sont absents, badge non vide", () => {
  const badMeta = makeValidSchedule();
  badMeta.days[0].slots[0].meta = false;
  assert.throws(parseOf(badMeta), /meta/);

  const badHighlight = makeValidSchedule();
  badHighlight.days[0].slots[0].highlight = "oui";
  assert.throws(parseOf(badHighlight), /highlight/);

  const badBadge = makeValidSchedule();
  badBadge.days[0].slots[0].badge = "";
  assert.throws(parseOf(badBadge), /badge/);
});

test("parseSchedule : les alias sont un objet de textes non vides", () => {
  const badAliases = makeValidSchedule({ aliases: ["liste"] });
  assert.throws(parseOf(badAliases), /aliases doit être un objet/);

  const emptyValue = makeValidSchedule({ aliases: { Variante: "" } });
  assert.throws(parseOf(emptyValue), /aliases\["Variante"\]/);

  const absent = makeValidSchedule();
  delete absent.aliases;
  assert.deepEqual(toAliasPairs(parseSchedule(JSON.stringify(absent))), []);
});

test("toTimelineDays : ne garde que les champs consommés par le site", () => {
  const schedule = makeValidSchedule();
  schedule.days[0].slots[0].meta = true;
  schedule.days[0].slots[0].highlight = true;
  schedule.days[0].slots[0].badge = "Focus";
  const days = toTimelineDays(parseSchedule(JSON.stringify(schedule)));

  assert.deepEqual(Object.keys(days[0]), ["id", "shortName", "name", "summary", "slots"]);
  assert.deepEqual(days[0].slots[0], {
    time: "00h00",
    title: "La Grande Nuit",
    desc: "Paysages sonores.",
    meta: true,
    highlight: true,
    badge: "Focus",
  });
  // Sans drapeaux : uniquement time/title/desc, pas de clés résiduelles.
  assert.deepEqual(Object.keys(days[1].slots[0]), ["time", "title", "desc"]);
});

test("schedule-data.js est à jour par rapport à assets/data/schedule.json", () => {
  const generated = fs.readFileSync(GENERATED_JS_PATH, "utf8");
  assert.equal(
    generated,
    renderBrowserPayload(readSchedule()),
    "schedule-data.js ne correspond plus à schedule.json — relancer npm run build:schedule"
  );
});
