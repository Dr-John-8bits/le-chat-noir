import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { mockRadio, collectPageErrors } from "./helpers.mjs";

test("direct.html : show, titre et audience", async ({ page }) => {
  const errors = collectPageErrors(page);
  await mockRadio(page);
  await page.goto("/direct.html");

  await expect(page.locator("#directShow")).toHaveText("La table du chat");
  await expect(page.locator("#directTrack")).toHaveText("Artiste Test — Titre Test");
  await expect(page.locator("#directListeners")).toContainText("3 auditeur·ices · pic 5");
  expect(errors).toEqual([]);
});

test("maintenance.html : antenne consultable et mini-player présent", async ({ page }) => {
  await mockRadio(page);
  await page.goto("/maintenance.html");
  await expect(page.locator("#mShow")).toHaveText("La table du chat");
  await expect(page.locator("audio")).toBeAttached();
});

test("news-studio : la saisie génère le Markdown et le nom de fichier", async ({ page }) => {
  await page.goto("/news-studio.html");
  await page.fill("#newsTitleInput", "Une Émission d'Été & d'Hiver");
  await expect(page.locator("#newsSlugPreview")).toHaveText("une-emission-d-ete-et-d-hiver");
  await expect(page.locator("#newsMarkdownOutput")).toHaveValue(/title: "Une Émission d'Été & d'Hiver"/);
});

test("permalien RSS #actualites/<slug> : l'article est ciblé et surligné", async ({ page }) => {
  const newsJson = JSON.parse(
    await readFile(fileURLToPath(new URL("../../assets/data/news.json", import.meta.url)), "utf8")
  );
  const slug = newsJson.items[3].slug;

  await mockRadio(page);
  await page.goto(`/#actualites/${slug}`);
  const focused = page.locator(".news-item.is-focused");
  await expect(focused).toBeVisible();
  await expect(focused).toHaveId(`news-${slug}`);
});

test("webapp installable : manifest complet, icônes joignables, balises Apple", async ({ page, request }) => {
  await mockRadio(page);
  await page.goto("/");

  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "manifest.webmanifest");
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute("content", "yes");
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute("content", "Le Chat Noir");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "apple-touch-icon.png");

  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.status()).toBe(200);
  const manifest = await manifestResponse.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.short_name).toBe("Le Chat Noir");
  expect(manifest.start_url).toBe("./index.html");
  expect(manifest.icons.map((icon) => icon.sizes)).toEqual(
    expect.arrayContaining(["192x192", "512x512", "180x180"])
  );

  for (const icon of manifest.icons) {
    const iconResponse = await request.get(`/${icon.src}`);
    expect(iconResponse.status(), `icône ${icon.src}`).toBe(200);
  }
});

test("SEO : canonical, Open Graph, RSS découvrable, 404 propre", async ({ page, request }) => {
  await mockRadio(page);
  await page.goto("/");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://lechatnoirradio.fr/");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /Le Chat Noir/);
  await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute("href", "feed.xml");

  const feed = await request.get("/feed.xml");
  expect(feed.status()).toBe(200);
  expect(await feed.text()).toContain("<rss");

  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Sitemap:");

  await page.goto("/404.html");
  await expect(page.locator("h1")).toContainText("Cette fréquence n'émet pas");
});
