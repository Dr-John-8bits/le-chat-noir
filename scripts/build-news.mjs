#!/usr/bin/env node

import fs from "node:fs";
import {
  GENERATED_JS_PATH,
  GENERATED_JSON_PATH,
  GENERATED_RSS_PATH,
  ensureNewsDirectories,
  readNewsEntries,
  renderBrowserPayload,
  renderJsonPayload,
  renderRss,
} from "./lib/news-content.mjs";

try {
  ensureNewsDirectories();
  const items = readNewsEntries();

  fs.writeFileSync(GENERATED_JS_PATH, renderBrowserPayload(items), "utf8");
  fs.writeFileSync(GENERATED_JSON_PATH, renderJsonPayload(items), "utf8");
  fs.writeFileSync(GENERATED_RSS_PATH, renderRss(items), "utf8");

  process.stdout.write(
    `Généré : ${items.length} actualités → news-data.js, news.json, feed.xml.\n`
  );
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
