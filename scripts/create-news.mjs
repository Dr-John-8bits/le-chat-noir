#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { CONTENT_DIR, ensureNewsDirectories, slugify } from "./lib/news-content.mjs";

function getArgValue(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return "";
  return process.argv[index + 1] || "";
}

function getParisDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const usage = [
  "Usage :",
  '  node scripts/create-news.mjs --title "Titre de l’actualité" [--date YYYY-MM-DD] [--order 1]',
].join("\n");

try {
  const title = String(getArgValue("title") || "").trim();
  const publishedOn = String(getArgValue("date") || getParisDateString()).trim();
  const order = String(getArgValue("order") || "1").trim();

  if (!title) throw new Error(usage);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publishedOn)) throw new Error(`Date invalide : ${publishedOn}`);
  if (!/^\d+$/.test(order)) throw new Error(`Ordre invalide : ${order}`);

  ensureNewsDirectories();
  const slug = slugify(title);
  const filePath = path.join(CONTENT_DIR, `${publishedOn}-${slug}.md`);
  if (fs.existsSync(filePath)) throw new Error(`Le fichier existe déjà : ${filePath}`);

  const template = [
    "---",
    `title: "${title.replace(/"/g, '\\"')}"`,
    `publishedOn: "${publishedOn}"`,
    `order: "${order}"`,
    "---",
    "",
    "Rédige ici le chapeau de l’actualité.",
    "",
    "Ajoute ici le corps du billet. Tu peux utiliser du Markdown simple, y compris [des liens](https://example.com).",
    "",
  ].join("\n");

  fs.writeFileSync(filePath, template, "utf8");
  process.stdout.write(`${filePath}\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
