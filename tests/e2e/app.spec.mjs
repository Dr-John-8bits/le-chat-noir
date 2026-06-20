import { test, expect } from "@playwright/test";
import { mockRadio, collectPageErrors } from "./helpers.mjs";

const DMG_URL = "https://github.com/Dr-John-8bits/le-chat-noir/releases/latest/download/LeChatNoir.dmg";

test("la route #app rend la page de téléchargement, le player reste intact", async ({ page }) => {
  const errors = collectPageErrors(page);
  await mockRadio(page);
  await page.goto("/#app");

  await expect(page).toHaveTitle(/L'app Le Chat Noir/);
  await expect(page.locator(".page-title")).toHaveText("L'app Le Chat Noir");
  await expect(page.locator("#playButton")).toBeVisible();
  await expect(page.locator(".main-nav a[data-route='app']")).toHaveClass(/is-active/);
  expect(errors.filter((e) => e.startsWith("pageerror"))).toEqual([]);
});

test("le bouton macOS pointe exactement vers le .dmg de la dernière release, en nouvel onglet", async ({ page }) => {
  await mockRadio(page);
  await page.goto("/#app");
  const btn = page.locator(".action-button--accent");
  await expect(btn).toHaveText(/Télécharger pour Mac/);
  await expect(btn).toHaveAttribute("href", DMG_URL);
  await expect(btn).toHaveAttribute("target", "_blank");
  await expect(btn).toHaveAttribute("rel", /noopener/);
});

test("la version s'affiche en live depuis app-version.json", async ({ page }) => {
  await mockRadio(page);
  await page.goto("/#app");
  // app-version.json est servi par le serveur de dev (fichier réel)
  await expect(page.locator("#appVersionLine")).toContainText(/dernière version : \d{2}\.\d{2}\.\d{2} · build \d+/);
});

test("configuration requise macOS + notice Gatekeeper présentes", async ({ page }) => {
  await mockRadio(page);
  await page.goto("/#app");
  const macCard = page.locator(".platform-card").first();
  await expect(macCard).toContainText("macOS 14 (Sonoma) ou plus récent");
  await expect(macCard).toContainText("Mac Apple Silicon");
  await expect(macCard).toContainText("non signée par Apple");
  await expect(macCard).toContainText("clic droit sur l'app");
});

test("carte Linux : à venir, compatibilité et formats annoncés, sans lien Flathub", async ({ page }) => {
  await mockRadio(page);
  await page.goto("/#app");
  const linux = page.locator(".platform-card--soon");
  await expect(linux).toContainText("bientôt");
  await expect(linux).toContainText("Ubuntu 24.04 LTS");
  await expect(linux).toContainText("Linux Mint 21 / 22");
  await expect(linux).toContainText("x86_64");
  await expect(linux).toContainText("Flatpak");
  await expect(linux).toContainText("AppImage");
  await expect(linux).toContainText("fr.lechatnoirradio.Player");
  // pas de lien Flathub tant que la page n'est pas en ligne
  await expect(linux.locator('a[href*="flathub"]')).toHaveCount(0);
  // pas de date annoncée
  await expect(linux).not.toContainText(/\b20\d{2}\b/);
});
