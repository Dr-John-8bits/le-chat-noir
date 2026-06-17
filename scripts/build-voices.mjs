#!/usr/bin/env node

import fs from "node:fs";
import {
  GENERATED_JS_PATH,
  readVoices,
  renderBrowserPayload,
} from "./lib/voices-content.mjs";

try {
  const voices = readVoices();
  fs.writeFileSync(GENERATED_JS_PATH, renderBrowserPayload(voices), "utf8");

  process.stdout.write(
    `Généré : ${voices.producers.length} voix, ${voices.shows.length} émissions → voices-data.js.\n`
  );
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
