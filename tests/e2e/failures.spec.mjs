import { test, expect } from "@playwright/test";
import { mockRadio, collectPageErrors } from "./helpers.mjs";

test("tous les endpoints en 404 : le player reste visible et la page dégrade sobrement", async ({ page }) => {
  const errors = collectPageErrors(page);
  await mockRadio(page, { failNowPlaying: true, failCurrentShow: true, failListeners: true, failCsv: true });
  await page.goto("/");

  await expect(page.locator("#playButton")).toBeVisible();
  await expect(page.locator("#playButton")).toBeEnabled();
  await expect(page.locator("#tickerText")).toHaveText("métadonnées momentanément indisponibles");
  await expect(page.locator("#listenersNote")).toBeHidden();
  await expect(page.locator("#homeTodayList li").first()).toBeVisible();

  const pageErrors = errors.filter((e) => e.startsWith("pageerror"));
  expect(pageErrors).toEqual([]);
});

test("JSON invalide : ignoré sans casser l'interface", async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.route("**/stream.lechatnoirradio.fr/nowplaying.json*", (route) =>
    route.fulfill({ contentType: "application/json", body: "{pas du json" })
  );
  await page.route("**/stream.lechatnoirradio.fr/current-show.json*", (route) =>
    route.fulfill({ json: { show: "La table du chat", kind: "music_block", is_live: false, since: 0 } })
  );
  await page.route("**/stream.lechatnoirradio.fr/listeners.json*", (route) => route.fulfill({ status: 404 }));
  await page.route("**/stream.lechatnoirradio.fr/history/nowplaying.csv*", (route) => route.fulfill({ status: 404 }));
  await page.goto("/");

  await expect(page.locator("#currentShowText")).toHaveText("La table du chat");
  await expect(page.locator("#playButton")).toBeEnabled();
  expect(errors.filter((e) => e.startsWith("pageerror"))).toEqual([]);
});

test("CSV vide : la home reste propre", async ({ page }) => {
  await mockRadio(page, { csv: "iso_utc,epoch,artist,title,album,year\n" });
  await page.goto("/");
  await expect(page.locator("#currentShowText")).toHaveText("La table du chat");
  await expect(page.locator("#homeRecentList li").first()).toBeVisible();
});
