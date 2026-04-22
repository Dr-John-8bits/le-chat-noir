#!/usr/bin/env node

const fs = require("fs");
const {
  GENERATED_JS_PATH,
  GENERATED_JSON_PATH,
  GENERATED_RSS_PATH,
  ensureNewsDirectories,
  readNewsEntries,
  renderBrowserPayload,
  renderJsonPayload,
  renderRss,
} = require("./lib/news-content");

function main() {
  ensureNewsDirectories();
  const items = readNewsEntries();

  fs.writeFileSync(GENERATED_JS_PATH, renderBrowserPayload(items), "utf8");
  fs.writeFileSync(GENERATED_JSON_PATH, renderJsonPayload(items), "utf8");
  fs.writeFileSync(GENERATED_RSS_PATH, renderRss(items), "utf8");

  process.stdout.write(
    `Generated ${items.length} news items into ${GENERATED_JS_PATH}, ${GENERATED_JSON_PATH} and ${GENERATED_RSS_PATH}.\n`
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
