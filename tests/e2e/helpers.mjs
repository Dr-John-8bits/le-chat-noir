// WAV PCM 8 bits mono silencieux, généré en mémoire : sert de "flux" jouable
// pour tester la Media Session sans toucher au vrai stream de production.
export function buildSilentWav(seconds = 3, sampleRate = 8000) {
  const dataSize = Math.floor(seconds * sampleRate);
  const buffer = Buffer.alloc(44 + dataSize, 0x80);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate, 28);
  buffer.writeUInt16LE(1, 32);
  buffer.writeUInt16LE(8, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

export function buildCsv(rows) {
  const quote = (value) => `"${String(value || "").replace(/"/g, '""')}"`;
  const header = "iso_utc,epoch,artist,title,album,year";
  const lines = rows.map((r) => {
    const epoch = Math.floor(Date.parse(r.iso) / 1000);
    return `${r.iso},${epoch},${quote(r.artist)},${quote(r.title)},${quote(r.album)},${quote(r.year)}`;
  });
  return [header, ...lines].join("\n") + "\n";
}

export const DEFAULT_CSV = buildCsv([
  { iso: "2026-05-13T11:03:51Z", artist: "la souterraine", title: "élématique", album: "levogyre, le best of", year: "2025" },
  { iso: "2026-05-13T11:00:00Z", artist: "Proksima", title: "Anna ne vient pas", album: "Le corps reconnaît", year: "2026" },
  { iso: "2026-05-13T09:30:00Z", artist: 'Duo "Étrange"', title: "Titre, avec virgule", album: "Album (notes)", year: "2024" },
  { iso: "2026-05-12T20:00:00Z", artist: "Veille", title: "Autre jour", album: "", year: "" },
]);

export async function mockRadio(page, overrides = {}) {
  const nowPlaying = {
    artist: "Artiste Test",
    title: "Titre Test",
    album: "Album Test",
    year: "2026",
    ...(overrides.nowPlaying || {}),
  };
  const currentShow = {
    show: "La table du chat",
    kind: "music_block",
    is_live: false,
    since: Math.floor(Date.now() / 1000) - 600,
    ...(overrides.currentShow || {}),
  };
  const listeners = {
    mount: "/stream.mp3",
    current: 3,
    peak: 5,
    server_listeners: 3,
    updatedAt: new Date().toISOString(),
    ...(overrides.listeners || {}),
  };

  await page.route("**/stream.lechatnoirradio.fr/nowplaying.json*", (route) =>
    overrides.failNowPlaying ? route.fulfill({ status: 404 }) : route.fulfill({ json: nowPlaying })
  );
  await page.route("**/stream.lechatnoirradio.fr/current-show.json*", (route) =>
    overrides.failCurrentShow ? route.fulfill({ status: 404 }) : route.fulfill({ json: currentShow })
  );
  await page.route("**/stream.lechatnoirradio.fr/listeners.json*", (route) =>
    overrides.failListeners ? route.fulfill({ status: 404 }) : route.fulfill({ json: listeners })
  );
  await page.route("**/stream.lechatnoirradio.fr/history/nowplaying.csv*", (route) =>
    overrides.failCsv
      ? route.fulfill({ status: 500 })
      : route.fulfill({ contentType: "text/csv", body: overrides.csv ?? DEFAULT_CSV })
  );
  await page.route("**/stream.lechatnoirradio.fr/stream.mp3*", (route) =>
    overrides.playableStream
      ? route.fulfill({ contentType: "audio/wav", body: buildSilentWav() })
      : route.abort()
  );
}

export function collectPageErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  return errors;
}
