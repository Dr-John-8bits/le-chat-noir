import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  extractNowPlaying,
  extractCurrentShow,
  extractListeners,
  isLiveTrack,
  stripEndcap,
  parseYear,
  parseAlbumYearFromTitle,
  splitArtistAndTitle,
  fetchNowPlaying,
  STATUS,
} from "../../assets/js/radio-api.js";

const fixture = (name) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

test("extractNowPlaying : payload réel de production", async () => {
  const payload = JSON.parse(await readFile(fixture("nowplaying-real.json"), "utf8"));
  const meta = extractNowPlaying(payload);
  assert.ok(meta.artist.length > 0);
  assert.ok(meta.title.length > 0);
  assert.equal(meta.isLiveHint, false);
});

test("extractNowPlaying : champs absents / null tolérés", () => {
  assert.deepEqual(extractNowPlaying({}), { artist: "", title: "", album: "", year: "", isLiveHint: false });
  const meta = extractNowPlaying({ artist: null, title: "Seul le titre", album: null, year: null });
  assert.equal(meta.title, "Seul le titre");
  assert.equal(meta.album, "");
});

test("extractNowPlaying : formes alternatives (now_playing.song)", () => {
  const meta = extractNowPlaying({ now_playing: { song: { artist: "X", title: "Y", album: "Z", year: "2024" } } });
  assert.deepEqual(meta, { artist: "X", title: "Y", album: "Z", year: "2024", isLiveHint: false });
});

test("détection DIRECT via nowplaying", () => {
  assert.equal(isLiveTrack({ artist: "Le Chat Noir (DIRECT)", title: "x" }), true);
  assert.equal(isLiveTrack({ artist: "x", title: "DIRECT - prise d'antenne" }), true);
  assert.equal(isLiveTrack({ artist: "Direction", title: "directive" }), false);
  const meta = extractNowPlaying({ artist: "Untel (DIRECT)", title: "Live du soir" });
  assert.equal(meta.isLiveHint, true);
});

test("convention BUTT : le préfixe DIRECT - est détecté même consommé par le split artiste/titre", () => {
  // avec artiste renseigné
  const withArtist = extractNowPlaying({ artist: "Le Chat Noir", title: "DIRECT - prise d'antenne du jeudi" });
  assert.equal(withArtist.isLiveHint, true);
  // sans artiste : "DIRECT" devient le pseudo-artiste après split — l'indice doit survivre
  const noArtist = extractNowPlaying({ title: "DIRECT - prise d'antenne du jeudi" });
  assert.equal(noArtist.isLiveHint, true);
  // un titre ordinaire avec tiret ne déclenche rien
  const ordinary = extractNowPlaying({ title: "Artiste - Morceau ordinaire" });
  assert.equal(ordinary.isLiveHint, false);
});

test("extractCurrentShow : payload réel + retrait endcap", async () => {
  const payload = JSON.parse(await readFile(fixture("current-show-real.json"), "utf8"));
  const show = extractCurrentShow(payload);
  assert.ok(show.show.length > 0);
  assert.ok(["music_block", "editorial_event", "editorial_window", "live"].includes(show.kind));
  assert.equal(typeof show.isLive, "boolean");
  assert.ok(show.since > 0);

  assert.equal(extractCurrentShow({ show: "Trajectoires endcap", kind: "music_block" }).show, "Trajectoires");
  assert.equal(stripEndcap("Fragments ENDCAP"), "Fragments");
  assert.equal(stripEndcap("Endcap Show"), "Endcap Show");
});

test("extractCurrentShow : is_live sous formes variées", () => {
  assert.equal(extractCurrentShow({ show: "X", is_live: true }).isLive, true);
  assert.equal(extractCurrentShow({ show: "X", is_live: "true" }).isLive, true);
  assert.equal(extractCurrentShow({ show: "X", kind: "live" }).isLive, true);
  assert.equal(extractCurrentShow({ show: "X", is_live: false }).isLive, false);
});

test("extractListeners : payload réel — mount attendu, fraîcheur calculée", async () => {
  const payload = JSON.parse(await readFile(fixture("listeners-real.json"), "utf8"));
  const now = Date.parse(payload.updatedAt) + 10_000;
  const data = extractListeners(payload, now);
  assert.equal(data.isForExpectedMount, true);
  assert.equal(data.isStale, false);
  assert.equal(typeof data.current, "number");
});

test("extractListeners : données périmées ou mount inattendu signalés", () => {
  const old = extractListeners({ mount: "/stream.mp3", current: 3, updatedAt: "2026-06-11T10:00:00+02:00" }, Date.parse("2026-06-11T11:00:00+02:00"));
  assert.equal(old.isStale, true);
  const wrongMount = extractListeners({ mount: "/stream", current: 3, updatedAt: new Date().toISOString() });
  assert.equal(wrongMount.isForExpectedMount, false);
  const garbage = extractListeners(null);
  assert.equal(garbage.current, null);
  assert.equal(garbage.isStale, true);
});

test("parseAlbumYearFromTitle et splitArtistAndTitle", () => {
  assert.deepEqual(parseAlbumYearFromTitle("Titre (Album 2024)"), { album: "Album", year: "2024" });
  assert.deepEqual(splitArtistAndTitle("Artiste — Titre"), { artist: "Artiste", title: "Titre" });
  assert.deepEqual(splitArtistAndTitle("Sans séparateur"), { artist: "", title: "Sans séparateur" });
  assert.equal(parseYear("sorti en 2025 !"), "2025");
  assert.equal(parseYear("aucune année"), "");
});

test("fetchNowPlaying : JSON invalide → status invalid, jamais d'exception", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () => new Response("pas du json", { status: 200 });
  const invalid = await fetchNowPlaying();
  assert.equal(invalid.status, STATUS.INVALID);

  globalThis.fetch = async () => new Response("{}", { status: 503 });
  const httpError = await fetchNowPlaying();
  assert.equal(httpError.status, STATUS.HTTP_ERROR);

  globalThis.fetch = async () => {
    throw new TypeError("network down");
  };
  const network = await fetchNowPlaying();
  assert.equal(network.status, STATUS.NETWORK_ERROR);
});
