import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const FILE = fileURLToPath(new URL("../../assets/data/app-version.json", import.meta.url));
const DMG_URL = "https://github.com/Dr-John-8bits/le-chat-noir/releases/latest/download/LeChatNoir.dmg";

test("app-version.json : JSON valide au schéma attendu par l'app", async () => {
  const data = JSON.parse(await readFile(FILE, "utf8"));
  assert.ok(data.macos, "clé macos présente");
  const m = data.macos;
  assert.match(m.version, /^\d{2}\.\d{2}\.\d{2}$/, "version au format AA.MM.JJ");
  assert.equal(typeof m.build, "number", "build est un nombre");
  assert.ok(Number.isInteger(m.build) && m.build > 0, "build entier positif");
  assert.equal(typeof m.notes, "string", "notes est une chaîne");
  assert.ok(m.notes.length > 0, "notes non vide");
});

test("app-version.json : l'URL pointe vers l'asset de la dernière release", async () => {
  const data = JSON.parse(await readFile(FILE, "utf8"));
  assert.equal(data.macos.url, DMG_URL);
  // Lien « latest » stable + asset nommé exactement LeChatNoir.dmg (cf. process de release).
  assert.ok(data.macos.url.endsWith("/releases/latest/download/LeChatNoir.dmg"));
});
