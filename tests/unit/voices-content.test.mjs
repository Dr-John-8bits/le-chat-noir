import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  GENERATED_JS_PATH,
  VOICES_SCHEMA_ID,
  parseVoices,
  readVoices,
  renderBrowserPayload,
} from "../../scripts/lib/voices-content.mjs";

function makeValidVoices() {
  return {
    schema: VOICES_SCHEMA_ID,
    updatedAt: "2026-06-12",
    producers: [
      { role: "Production", name: "Dr. John", image: "assets/media/p.webp", bio: "Bio." },
      { role: "Chronique", name: "Lady Em", image: "assets/media/l.webp", bio: "Bio.", href: "https://example.org" },
    ],
    shows: [
      { meta: "Émission", title: "Console-toi", image: "assets/media/c.webp", text: "Texte.", href: "https://example.org", actionLabel: "Écouter" },
      { meta: "Mixtapes", title: "blocSonic", image: "assets/media/b.png", text: "Texte.", imageFit: "contain" },
    ],
  };
}

function parseOf(voices) {
  return () => parseVoices(JSON.stringify(voices));
}

test("parseVoices : accepte un fichier conforme", () => {
  const voices = parseVoices(JSON.stringify(makeValidVoices()));
  assert.equal(voices.producers.length, 2);
  assert.equal(voices.shows.length, 2);
});

test("parseVoices : rejette un schéma inconnu, un JSON illisible ou une racine non-objet", () => {
  assert.throws(parseOf({ ...makeValidVoices(), schema: "lcn-voices/99" }), /schéma attendu/);
  assert.throws(() => parseVoices("pas du json"), /JSON illisible/);
  assert.throws(() => parseVoices("null"), /racine doit être un objet/);
});

test("parseVoices : exige les champs obligatoires des voix", () => {
  const noBio = makeValidVoices();
  noBio.producers[0].bio = "";
  assert.throws(parseOf(noBio), /producers\[0\]\.bio/);

  const emptyHref = makeValidVoices();
  emptyHref.producers[1].href = "  ";
  assert.throws(parseOf(emptyHref), /producers\[1\]\.href/);

  const noProducers = makeValidVoices();
  noProducers.producers = [];
  assert.throws(parseOf(noProducers), /producers doit être une liste non vide/);
});

test("parseVoices : exige les champs obligatoires des émissions", () => {
  const noTitle = makeValidVoices();
  noTitle.shows[0].title = "";
  assert.throws(parseOf(noTitle), /shows\[0\]\.title/);

  const badFit = makeValidVoices();
  badFit.shows[1].imageFit = "cover";
  assert.throws(parseOf(badFit), /imageFit/);
});

test("voices-data.js est à jour par rapport à assets/data/voices.json", () => {
  const generated = fs.readFileSync(GENERATED_JS_PATH, "utf8");
  assert.equal(
    generated,
    renderBrowserPayload(readVoices()),
    "voices-data.js ne correspond plus à voices.json — relancer npm run build:voices"
  );
});
