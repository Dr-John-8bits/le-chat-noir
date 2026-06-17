import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SITE_URL = "https://lechatnoirradio.fr";
export const NEWS_SECTION_URL = `${SITE_URL}/#actualites`;

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CONTENT_DIR = path.resolve(HERE, "../../content/news");
export const GENERATED_JS_PATH = path.resolve(HERE, "../../assets/js/news-data.js");
export const GENERATED_JSON_PATH = path.resolve(HERE, "../../assets/data/news.json");
export const GENERATED_RSS_PATH = path.resolve(HERE, "../../feed.xml");

export function buildNewsUrl(slug) {
  return `${SITE_URL}/#actualites/${slugify(slug)}`;
}

export function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " et ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function unquote(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  return raw;
}

export function parseFrontMatter(source) {
  const normalized = String(source || "").replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { attributes: {}, body: normalized.trim() };
  }

  const attributes = {};
  match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const separator = line.indexOf(":");
      if (separator === -1) return;
      const key = line.slice(0, separator).trim();
      attributes[key] = unquote(line.slice(separator + 1));
    });

  return { attributes, body: match[2].trim() };
}

function replaceMarkdownLinks(text, renderLink) {
  const source = String(text || "");
  let cursor = 0;
  let output = "";
  const pattern = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let match = null;

  while ((match = pattern.exec(source))) {
    output += escapeHtml(source.slice(cursor, match.index));
    output += renderLink(match[1], match[2]);
    cursor = match.index + match[0].length;
  }

  output += escapeHtml(source.slice(cursor));
  return output;
}

export function inlineMarkdownToHtml(text, options = {}) {
  return replaceMarkdownLinks(text, (label, href) => {
    const safeLabel = escapeHtml(label);
    const safeHref = escapeHtml(href);
    if (options.forFeed) {
      return `<a href="${safeHref}">${safeLabel}</a>`;
    }
    return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${safeLabel}</a>`;
  });
}

export function inlineMarkdownToPlainText(text) {
  return String(text || "").replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1");
}

export function splitMarkdownParagraphs(source) {
  return String(source || "")
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

export function formatFrenchDateLabel(publishedOn) {
  const date = new Date(`${publishedOn}T12:00:00Z`);
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function buildPublishedAt(publishedOn, order) {
  const orderValue = Number.isFinite(Number(order)) ? Number(order) : 1;
  const minute = Math.max(0, Math.min(59, orderValue));
  return `${publishedOn}T12:${String(minute).padStart(2, "0")}:00.000Z`;
}

export function buildSortKey(publishedOn, order) {
  return `${publishedOn}-${String(Number.isFinite(Number(order)) ? Number(order) : 1).padStart(3, "0")}`;
}

export function buildNewsItem(entry) {
  const paragraphs = splitMarkdownParagraphs(entry.body);
  if (!paragraphs.length) {
    throw new Error(`Le fichier ${entry.sourcePath} ne contient aucun paragraphe éditorial.`);
  }

  const leadMarkdown = paragraphs[0];
  const bodyParagraphs = paragraphs.slice(1);

  return {
    id: entry.slug,
    slug: entry.slug,
    title: entry.title,
    publishedOn: entry.publishedOn,
    publishedAt: buildPublishedAt(entry.publishedOn, entry.order),
    order: entry.order,
    sortKey: buildSortKey(entry.publishedOn, entry.order),
    dateLabel: formatFrenchDateLabel(entry.publishedOn),
    lead: inlineMarkdownToPlainText(leadMarkdown),
    leadHtml: inlineMarkdownToHtml(leadMarkdown),
    leadHtmlForFeed: inlineMarkdownToHtml(leadMarkdown, { forFeed: true }),
    body: bodyParagraphs.map(inlineMarkdownToPlainText).join("\n\n"),
    bodyHtml: bodyParagraphs.map((p) => inlineMarkdownToHtml(p)).join("<br /><br />"),
    bodyHtmlForFeed: bodyParagraphs.map((p) => inlineMarkdownToHtml(p, { forFeed: true })).join("<br /><br />"),
    url: buildNewsUrl(entry.slug),
  };
}

export function readNewsEntries(contentDir = CONTENT_DIR) {
  if (!fs.existsSync(contentDir)) return [];

  return fs
    .readdirSync(contentDir)
    .filter((fileName) => /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(fileName))
    .sort()
    .map((fileName) => {
      const sourcePath = path.join(contentDir, fileName);
      const { attributes, body } = parseFrontMatter(fs.readFileSync(sourcePath, "utf8"));
      const publishedOn = attributes.publishedOn || attributes.date || "";
      const title = attributes.title || "";
      const order = Number(attributes.order || 1);
      const explicitSlug = attributes.slug ? slugify(attributes.slug) : "";
      const derivedSlug = fileName.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
      const slug = explicitSlug || derivedSlug || slugify(title);

      if (!/^\d{4}-\d{2}-\d{2}$/.test(publishedOn)) {
        throw new Error(`Date invalide dans ${fileName} : ${publishedOn || "(vide)"}`);
      }
      if (!title.trim()) {
        throw new Error(`Titre manquant dans ${fileName}`);
      }

      return { title: title.trim(), publishedOn, order, slug, body, sourcePath };
    })
    .map(buildNewsItem)
    .sort((left, right) => {
      if (left.sortKey === right.sortKey) return right.slug.localeCompare(left.slug);
      return right.sortKey.localeCompare(left.sortKey);
    });
}

export function renderBrowserPayload(items) {
  return `// Généré depuis content/news par scripts/build-news.mjs — ne pas éditer à la main.\nexport const NEWS_ITEMS = ${JSON.stringify(items, null, 2)};\n`;
}

export function renderJsonPayload(items) {
  return JSON.stringify({ generatedAt: new Date().toISOString(), items }, null, 2);
}

export function renderRss(items) {
  const feedItems = items
    .map((item) => {
      const description = [item.leadHtmlForFeed, item.bodyHtmlForFeed].filter(Boolean).join("<br /><br />");
      return [
        "    <item>",
        `      <title>${escapeHtml(item.title)}</title>`,
        `      <link>${escapeHtml(item.url)}</link>`,
        `      <guid isPermaLink="true">${escapeHtml(item.url)}</guid>`,
        `      <pubDate>${new Date(item.publishedAt).toUTCString()}</pubDate>`,
        `      <description><![CDATA[${description}]]></description>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    "    <title>Le Chat Noir — Actualités</title>",
    `    <link>${escapeHtml(NEWS_SECTION_URL)}</link>`,
    "    <description>Actualités éditoriales de la radio Le Chat Noir.</description>",
    "    <language>fr-fr</language>",
    `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    `    <atom:link href="${escapeHtml(`${SITE_URL}/feed.xml`)}" rel="self" type="application/rss+xml" />`,
    feedItems,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}

export function ensureNewsDirectories() {
  fs.mkdirSync(CONTENT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(GENERATED_JS_PATH), { recursive: true });
  fs.mkdirSync(path.dirname(GENERATED_JSON_PATH), { recursive: true });
}
