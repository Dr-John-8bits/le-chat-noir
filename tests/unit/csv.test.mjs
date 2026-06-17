import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseCsv, parseCsvLine, parseHistoryCsv, parseHistoryCsvChunked, enrichHistoryRow } from "../../assets/js/csv.js";

const fixture = (name) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

test("parseCsv : champs quotés avec virgules et guillemets doublés", () => {
  const rows = parseCsv('a,"b, avec virgule","il a dit ""salut""",d');
  assert.deepEqual(rows, [["a", "b, avec virgule", 'il a dit "salut"', "d"]]);
});

test("parseCsv : retour ligne dans un champ quoté (RFC 4180)", () => {
  const rows = parseCsv('a,"ligne 1\nligne 2",c');
  assert.deepEqual(rows, [["a", "ligne 1\nligne 2", "c"]]);
});

test("parseCsv : CRLF, lignes vides, BOM", () => {
  const rows = parseCsv('﻿x,y\r\n\r\na,b\r\n');
  assert.deepEqual(rows, [["x", "y"], ["a", "b"]]);
});

test("parseCsv : fichier vide", () => {
  assert.deepEqual(parseCsv(""), []);
  assert.deepEqual(parseCsv(null), []);
});

test("parseCsvLine : compatible avec le format historique", () => {
  const cols = parseCsvLine('2026-05-13T11:03:51Z,1778670231,"la souterraine","élématique","levogyre : ((2020-2025)), fin","2025"');
  assert.equal(cols[2], "la souterraine");
  assert.equal(cols[3], "élématique");
  assert.equal(cols[4], "levogyre : ((2020-2025)), fin");
});

test("parseHistoryCsv : fixture réelle — entêtes ignorées, tri anti-chronologique, accents", async () => {
  const text = await readFile(fixture("history-real-sample.csv"), "utf8");
  const entries = parseHistoryCsv(text);
  assert.ok(entries.length >= 290, `attendu ≥290 lignes, obtenu ${entries.length}`);
  assert.ok(entries.every((e) => e.tsIso && e.tsMs > 0));
  for (let i = 1; i < entries.length; i += 1) {
    assert.ok(entries[i - 1].tsMs >= entries[i].tsMs, "ordre anti-chronologique");
  }
  assert.ok(entries.every((e) => !e.tsIso.includes("iso_utc")), "pas de ligne d'entête");
});

test("parseHistoryCsv : limitFromEnd ne garde que la fin", async () => {
  const text = await readFile(fixture("history-real-sample.csv"), "utf8");
  const all = parseHistoryCsv(text);
  const limited = parseHistoryCsv(text, { limitFromEnd: 10 });
  assert.equal(limited.length, 10);
  assert.equal(limited[0].tsIso, all[0].tsIso);
});

test("parseHistoryCsv : CSV corrompu — lignes tronquées ignorées sans plantage", async () => {
  const text = await readFile(fixture("history-corrupt.csv"), "utf8");
  const entries = parseHistoryCsv(text);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].artist, "Artiste, avec virgule");
  assert.equal(entries[0].title, 'Titre "quoté"');
});

test("parseHistoryCsvChunked : mêmes résultats que parseHistoryCsv sur la fixture réelle", async () => {
  const text = await readFile(fixture("history-real-sample.csv"), "utf8");
  const sync = parseHistoryCsv(text, { limitFromEnd: 50 });
  const chunked = await parseHistoryCsvChunked(text, { limitFromEnd: 50, chunkSize: 7 });
  assert.deepEqual(chunked, sync);
});

test("enrichHistoryRow : conversion UTC → Europe/Paris", () => {
  const row = enrichHistoryRow({ tsIso: "2026-06-11T11:03:06Z", artist: "France Travail", title: "Aftercare" });
  assert.equal(row.localTime, "13:03");
  assert.equal(row.localYmd, "2026-06-11");
  assert.equal(row.localMinutes, 13 * 60 + 3);
});

test("enrichHistoryRow : entrée invalide → null", () => {
  assert.equal(enrichHistoryRow(null), null);
  assert.equal(enrichHistoryRow({ tsIso: "" }), null);
  assert.equal(enrichHistoryRow({ tsIso: "pas-une-date" }), null);
});
