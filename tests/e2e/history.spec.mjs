import { test, expect } from "@playwright/test";
import { mockRadio, collectPageErrors } from "./helpers.mjs";

// Fuseau new-yorkais : prouve que la restitution reste en Europe/Paris
// quel que soit le fuseau du visiteur (CDC § 13.3).
test.use({ timezoneId: "America/New_York" });

test("archives chargées, heures en Europe/Paris même depuis un autre fuseau", async ({ page }) => {
  const errors = collectPageErrors(page);
  await mockRadio(page);
  await page.goto("/history.html");

  await expect(page.locator("#historyStatus")).toContainText("diffusions archivées");

  await page.fill("#historyDayInput", "2026-05-13");
  await page.click("#historySearchButton");
  const firstRow = page.locator("#historyList li").first();
  await expect(firstRow.locator(".track-time")).toHaveText("13:03");
  await expect(firstRow).toContainText("la souterraine — élématique");
  expect(errors).toEqual([]);
});

test("recherche par heure : résultats triés par proximité du créneau", async ({ page }) => {
  await mockRadio(page);
  await page.goto("/history.html");
  await expect(page.locator("#historyStatus")).toContainText("diffusions archivées");

  await page.fill("#historyDayInput", "2026-05-13");
  await page.fill("#historyTimeInput", "11:25");
  await page.click("#historySearchButton");

  await expect(page.locator("#historyLabel")).toContainText("Autour de 11:25 — 13/05/2026");
  const times = await page.locator("#historyList .track-time").allTextContents();
  expect(times[0]).toBe("11:30");
});

test("CSV avec virgules et guillemets correctement parsé", async ({ page }) => {
  await mockRadio(page);
  await page.goto("/history.html");
  await expect(page.locator("#historyStatus")).toContainText("diffusions archivées");
  await page.fill("#historyDayInput", "2026-05-13");
  await page.click("#historySearchButton");
  await expect(page.locator("#historyList")).toContainText('Duo "Étrange" — Titre, avec virgule');
});

test("CSV indisponible : message clair et bouton de relance fonctionnel", async ({ page }) => {
  await mockRadio(page, { failCsv: true });
  await page.goto("/history.html");
  await expect(page.locator("#historyStatus")).toContainText("momentanément inaccessible");

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await mockRadio(page);
  await page.click("#historyReloadButton");
  await expect(page.locator("#historyStatus")).toContainText("diffusions archivées");
});
