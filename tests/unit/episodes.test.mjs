import { test } from "node:test";
import assert from "node:assert/strict";
import { extractEpisodes } from "../../assets/js/radio-api.js";
import { renderEpisodeLine } from "../../assets/js/ui-states.js";

const PAYLOAD = {
  genere: "2026-11-14T04:07:12+01:00",
  date: "2026-11-14",
  emissions: [
    { id: "lautre-nuit", emission: "L'Autre Nuit", date: "2026-11-16", titre: "Le point", numero: 7, total: 7 },
    { id: "console-toi", emission: "Console-toi", date: "2026-11-14", titre: "Dig dug", numero: 9, total: 12 },
    { id: "vieux", emission: "Le Pseudocumentaire de l'espace", date: "2026-11-13", titre: "Passé", numero: 1, total: 8 },
    { id: "loin", emission: "L'instinct mode", date: "2026-11-21", titre: "Trop loin", numero: 1, total: 8 },
    { id: "casse", emission: "", date: "2026-11-15", titre: "Sans émission" },
  ],
};

test("extractEpisodes : rattache chaque annonce au jour de la grille", () => {
  const eps = extractEpisodes(PAYLOAD, "2026-11-14");
  assert.equal(eps.get("mon|L'Autre Nuit").titre, "Le point");
  assert.equal(eps.get("sat|Console-toi").numero, 9);
});

test("extractEpisodes : écarte le passé, l'au-delà de six jours et l'incomplet", () => {
  const eps = extractEpisodes(PAYLOAD, "2026-11-14");
  assert.equal(eps.size, 2);
  assert.equal(eps.has("fri|Le Pseudocumentaire de l'espace"), false);
  assert.equal(eps.has("sat|L'instinct mode"), false);
});

test("extractEpisodes : un fichier vide ou absurde ne rend rien", () => {
  assert.equal(extractEpisodes(null, "2026-11-14").size, 0);
  assert.equal(extractEpisodes({ emissions: "x" }, "2026-11-14").size, 0);
  assert.equal(extractEpisodes(PAYLOAD, "").size, 0);
});

test("renderEpisodeLine : affiche le titre échappé, rien sinon", () => {
  const eps = extractEpisodes(
    { emissions: [{ emission: "Console-toi", date: "2026-11-14", titre: "<b>Dig</b>" }] },
    "2026-11-14"
  );
  const html = renderEpisodeLine(eps, "sat", "Console-toi");
  assert.match(html, /slot-episode/);
  assert.match(html, /&lt;b&gt;Dig&lt;\/b&gt;/);
  assert.equal(renderEpisodeLine(eps, "sun", "Console-toi"), "");
  assert.equal(renderEpisodeLine(null, "sat", "Console-toi"), "");
});
