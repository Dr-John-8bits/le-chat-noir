import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SCHEDULE_JSON_PATH = path.resolve(HERE, "../../assets/data/schedule.json");
export const GENERATED_JS_PATH = path.resolve(HERE, "../../assets/js/schedule-data.js");

export const SCHEDULE_SCHEMA_ID = "lcn-schedule/1";
const DAY_IDS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function fail(message) {
  throw new Error(`schedule.json invalide — ${message}`);
}

function requireText(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    fail(`${label} doit être un texte non vide (reçu : ${JSON.stringify(value)})`);
  }
  return value;
}

// Le site interprète tous les horaires dans le fuseau d'affichage
// (DISPLAY_TIME_ZONE, assets/js/config.js) : la grille doit être produite dans ce fuseau.
const EXPECTED_TIMEZONE = "Europe/Paris";

// Un libellé horaire peut être du texte libre (« Puis »), mais s'il a la forme
// d'une heure, elle doit être réelle — sinon schedule-match calcule des minutes
// impossibles et le créneau ne devient jamais « courant ».
function checkTimeLabel(value, label) {
  const match = value.trim().toLowerCase().match(/^(\d{1,2})\s*[h:]\s*(\d{2})$/);
  if (match && (Number(match[1]) > 23 || Number(match[2]) > 59)) {
    fail(`${label} : horaire impossible ${JSON.stringify(value)} (attendu 00h00 → 23h59, ou un libellé libre)`);
  }
}

export function parseSchedule(rawText) {
  let parsed = null;
  try {
    parsed = JSON.parse(rawText);
  } catch (error) {
    fail(`JSON illisible (${error.message})`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    fail("la racine doit être un objet");
  }

  if (parsed.schema !== SCHEDULE_SCHEMA_ID) {
    fail(`schéma attendu ${JSON.stringify(SCHEDULE_SCHEMA_ID)}, reçu ${JSON.stringify(parsed.schema)}`);
  }
  if (parsed.timezone !== undefined && parsed.timezone !== EXPECTED_TIMEZONE) {
    fail(`timezone attendue ${JSON.stringify(EXPECTED_TIMEZONE)}, reçue ${JSON.stringify(parsed.timezone)} — les horaires seraient décalés à l'affichage`);
  }
  if (!Array.isArray(parsed.days) || parsed.days.length !== DAY_IDS.length) {
    fail(`days doit contenir exactement ${DAY_IDS.length} jours`);
  }

  parsed.days.forEach((day, index) => {
    if (!day || typeof day !== "object") fail(`days[${index}] n'est pas un objet`);
    if (day.id !== DAY_IDS[index]) {
      fail(`days[${index}].id attendu ${JSON.stringify(DAY_IDS[index])} (ordre lundi → dimanche), reçu ${JSON.stringify(day.id)}`);
    }
    requireText(day.name, `days[${index}].name`);
    requireText(day.shortName, `days[${index}].shortName`);
    requireText(day.summary, `days[${index}].summary`);
    if (!Array.isArray(day.slots) || !day.slots.length) {
      fail(`days[${index}].slots doit être une liste non vide`);
    }
    day.slots.forEach((slot, slotIndex) => {
      const where = `days[${index}].slots[${slotIndex}]`;
      if (!slot || typeof slot !== "object") fail(`${where} n'est pas un objet`);
      requireText(slot.time, `${where}.time`);
      checkTimeLabel(slot.time, `${where}.time`);
      requireText(slot.title, `${where}.title`);
      requireText(slot.desc, `${where}.desc`);
      if (slot.badge !== undefined) requireText(slot.badge, `${where}.badge`);
      if (slot.meta !== undefined && slot.meta !== true) fail(`${where}.meta ne peut valoir que true (sinon absent)`);
      if (slot.highlight !== undefined && slot.highlight !== true) fail(`${where}.highlight ne peut valoir que true (sinon absent)`);
    });
  });

  const aliases = parsed.aliases === undefined ? {} : parsed.aliases;
  if (!aliases || typeof aliases !== "object" || Array.isArray(aliases)) {
    fail("aliases doit être un objet { variante: titre public }");
  }
  Object.entries(aliases).forEach(([variant, canonical]) => {
    requireText(variant, "aliases (clé)");
    requireText(canonical, `aliases[${JSON.stringify(variant)}]`);
  });

  return parsed;
}

export function readSchedule() {
  if (!fs.existsSync(SCHEDULE_JSON_PATH)) {
    fail(`fichier introuvable : ${SCHEDULE_JSON_PATH} (exporter depuis le Concepteur-Grille)`);
  }
  return parseSchedule(fs.readFileSync(SCHEDULE_JSON_PATH, "utf8"));
}

export function toTimelineDays(schedule) {
  return schedule.days.map((day) => ({
    id: day.id,
    shortName: day.shortName,
    name: day.name,
    summary: day.summary,
    slots: day.slots.map((slot) => {
      const entry = { time: slot.time, title: slot.title, desc: slot.desc };
      if (slot.meta === true) entry.meta = true;
      if (slot.highlight === true) entry.highlight = true;
      if (slot.badge !== undefined) entry.badge = slot.badge;
      return entry;
    }),
  }));
}

export function toAliasPairs(schedule) {
  return Object.entries(schedule.aliases || {});
}

export function renderBrowserPayload(schedule) {
  return [
    "// Généré depuis assets/data/schedule.json par scripts/build-schedule.mjs — ne pas éditer à la main.",
    "// Source de vérité : le Concepteur-Grille (LCN-Tools), voir docs/MAINTENANCE.md.",
    `export const SCHEDULE_TIMELINE_DAYS = ${JSON.stringify(toTimelineDays(schedule), null, 2)};`,
    "",
    "// Variantes de noms antenne → titre public, normalisées par schedule-match au chargement.",
    `export const SCHEDULE_ALIAS_PAIRS = ${JSON.stringify(toAliasPairs(schedule), null, 2)};`,
    "",
  ].join("\n");
}
