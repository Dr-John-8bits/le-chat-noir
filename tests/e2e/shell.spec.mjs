import { test, expect } from "@playwright/test";
import { mockRadio, collectPageErrors } from "./helpers.mjs";

test("le bandeau live s'alimente et le player est utilisable", async ({ page }) => {
  const errors = collectPageErrors(page);
  await mockRadio(page);
  await page.goto("/");

  await expect(page.locator("#currentShowText")).toHaveText("La table du chat");
  await expect(page.locator("#tickerText")).toContainText("Artiste Test — Titre Test");
  await expect(page.locator("#onAirPillText")).toHaveText("à l'antenne");
  await expect(page.locator("#playButton")).toBeVisible();
  await expect(page.locator("#playButton")).toBeEnabled();
  expect(errors).toEqual([]);
});

test("le badge DIRECT s'affiche quand current-show est en live", async ({ page }) => {
  await mockRadio(page, { currentShow: { show: "DIRECT", kind: "live", is_live: true } });
  await page.goto("/");
  await expect(page.locator("#onAirPillText")).toHaveText("direct — on air");
  await expect(page.locator("#liveKicker")).toHaveText("// direct");
});

test("convention BUTT : DIRECT - dans le titre déclenche le badge même sans current-show live", async ({ page }) => {
  await mockRadio(page, { nowPlaying: { artist: "Le Chat Noir", title: "DIRECT - prise d'antenne" } });
  await page.goto("/");
  await expect(page.locator("#onAirPillText")).toHaveText("direct — on air");
});

test("la navigation entre rubriques ne recrée jamais l'élément audio", async ({ page, isMobile }) => {
  test.skip(isMobile, "nav par liens identique, vérifié sur desktop");
  const errors = collectPageErrors(page);
  await mockRadio(page);
  await page.goto("/");
  await page.evaluate(() => {
    window.__audioRef = document.querySelector("audio");
  });

  for (const route of ["grille", "actualites", "voix", "apropos", "accueil"]) {
    await page.click(`.main-nav a[data-route="${route}"]`);
    await expect(page.locator(`.main-nav a[data-route="${route}"]`)).toHaveClass(/is-active/);
  }

  const sameAudio = await page.evaluate(() => window.__audioRef === document.querySelector("audio"));
  expect(sameAudio).toBe(true);
  expect(errors).toEqual([]);
});

test("chaque rubrique a un titre de document distinct", async ({ page }) => {
  await mockRadio(page);
  await page.goto("/#grille");
  await expect(page).toHaveTitle(/Grille des programmes/);
  await page.goto("/#voix");
  await expect(page).toHaveTitle(/Voix et formats/);
});
