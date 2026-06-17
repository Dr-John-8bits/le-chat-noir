#!/usr/bin/env node

import fs from "node:fs";
import {
  GENERATED_JS_PATH,
  readSchedule,
  renderBrowserPayload,
} from "./lib/schedule-content.mjs";

try {
  const schedule = readSchedule();
  fs.writeFileSync(GENERATED_JS_PATH, renderBrowserPayload(schedule), "utf8");

  const slotCount = schedule.days.reduce((total, day) => total + day.slots.length, 0);
  process.stdout.write(
    `Généré : ${schedule.days.length} jours, ${slotCount} créneaux → schedule-data.js.\n`
  );
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
