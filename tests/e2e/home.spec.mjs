import { test, expect } from "@playwright/test";
import { mockRadio, collectPageErrors } from "./helpers.mjs";

test("la home affiche les blocs obligatoires sans overflow horizontal", async ({ page }) => {
  const errors = collectPageErrors(page);
  await mockRadio(page);
  await page.goto("/");

  await expect(page.locator("#homeTodayList li").first()).toBeVisible();
  await expect(page.locator("#home-recent-title")).toBeVisible();
  await expect(page.locator("#homeRecentList li").first()).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});

test("le compteur d'auditeurs ne figure pas sur la home (info backoffice → direct.html)", async ({ page }) => {
  await mockRadio(page);
  await page.goto("/");
  await expect(page.locator("#currentShowText")).toHaveText("La table du chat");
  await expect(page.locator("#listenersNote")).toHaveCount(0);
});

test("les derniers passages viennent du CSV avec heures de Paris", async ({ page }) => {
  await mockRadio(page);
  await page.goto("/");
  const firstRow = page.locator("#homeRecentList li").first();
  await expect(firstRow).toContainText("la souterraine — élématique");
  await expect(firstRow.locator(".track-time")).toHaveText("13:03");
});

test("la grille du jour signale le show réel via current-show", async ({ page }) => {
  await mockRadio(page, { currentShow: { show: "Show Inconnu De La Grille", kind: "editorial_event" } });
  await page.goto("/#grille");
  await expect(page.locator("#pageView")).toContainText("// en ce moment : Show Inconnu De La Grille");
});
