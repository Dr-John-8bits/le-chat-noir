import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const VOICES_JSON_PATH = path.resolve(HERE, "../../assets/data/voices.json");
export const GENERATED_JS_PATH = path.resolve(HERE, "../../assets/js/voices-data.js");

export const VOICES_SCHEMA_ID = "lcn-voices/1";

function fail(message) {
  throw new Error(`voices.json invalide — ${message}`);
}

function requireText(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    fail(`${label} doit être un texte non vide (reçu : ${JSON.stringify(value)})`);
  }
  return value;
}

function checkOptionalText(value, label) {
  if (value !== undefined) requireText(value, label);
}

export function parseVoices(rawText) {
  let parsed = null;
  try {
    parsed = JSON.parse(rawText);
  } catch (error) {
    fail(`JSON illisible (${error.message})`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    fail("la racine doit être un objet");
  }

  if (parsed.schema !== VOICES_SCHEMA_ID) {
    fail(`schéma attendu ${JSON.stringify(VOICES_SCHEMA_ID)}, reçu ${JSON.stringify(parsed.schema)}`);
  }
  if (!Array.isArray(parsed.producers) || !parsed.producers.length) {
    fail("producers doit être une liste non vide");
  }
  if (!Array.isArray(parsed.shows) || !parsed.shows.length) {
    fail("shows doit être une liste non vide");
  }

  parsed.producers.forEach((producer, index) => {
    const where = `producers[${index}]`;
    if (!producer || typeof producer !== "object") fail(`${where} n'est pas un objet`);
    requireText(producer.role, `${where}.role`);
    requireText(producer.name, `${where}.name`);
    requireText(producer.image, `${where}.image`);
    requireText(producer.bio, `${where}.bio`);
    checkOptionalText(producer.href, `${where}.href`);
  });

  parsed.shows.forEach((show, index) => {
    const where = `shows[${index}]`;
    if (!show || typeof show !== "object") fail(`${where} n'est pas un objet`);
    requireText(show.meta, `${where}.meta`);
    requireText(show.title, `${where}.title`);
    requireText(show.image, `${where}.image`);
    requireText(show.text, `${where}.text`);
    checkOptionalText(show.href, `${where}.href`);
    checkOptionalText(show.actionLabel, `${where}.actionLabel`);
    if (show.imageFit !== undefined && show.imageFit !== "contain") {
      fail(`${where}.imageFit ne peut valoir que "contain" (sinon absent)`);
    }
  });

  return parsed;
}

export function readVoices() {
  if (!fs.existsSync(VOICES_JSON_PATH)) {
    fail(`fichier introuvable : ${VOICES_JSON_PATH}`);
  }
  return parseVoices(fs.readFileSync(VOICES_JSON_PATH, "utf8"));
}

export function renderBrowserPayload(voices) {
  return [
    "// Généré depuis assets/data/voices.json par scripts/build-voices.mjs — ne pas éditer à la main.",
    "// Pour modifier les voix ou les émissions : éditer voices.json puis npm run build:voices (docs/MAINTENANCE.md).",
    `export const PRODUCERS = ${JSON.stringify(voices.producers, null, 2)};`,
    "",
    `export const SHOWS = ${JSON.stringify(voices.shows, null, 2)};`,
    "",
  ].join("\n");
}
