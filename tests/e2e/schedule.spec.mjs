import { test, expect } from "@playwright/test";
import { mockRadio, collectPageErrors } from "./helpers.mjs";

// Samedi 24 octobre 2026, 16:42 à Paris (UTC+2).
const SATURDAY_16H42 = new Date("2026-10-24T14:42:00Z");

test("ciel de la journée : un trait par créneau horaire, repère sur aujourd'hui seulement", async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.clock.setFixedTime(SATURDAY_16H42);
  await mockRadio(page, { currentShow: { show: "Doucement" } });
  await page.goto("/#grille");

  const sky = page.locator(".day-sky");
  await expect(sky).toBeVisible();
  await expect(sky).toHaveAttribute("aria-hidden", "true");
  await expect(sky.locator(".day-sky__tick")).toHaveCount(9);
  const now = page.locator("#scheduleSkyNow");
  await expect(now).toHaveCount(1);
  await expect(now).toHaveAttribute("style", "--at:69.6%");

  // Le surlignage reste celui de current-show.json, indépendamment du ciel.
  await expect(page.locator(".slot-list li.is-current .slot-title")).toContainText("Doucement");

  await page.locator('[data-day="mon"]').click();
  await expect(page.locator("#scheduleSkyNow")).toHaveCount(0);
  await expect(page.locator(".day-sky__tick")).toHaveCount(6);
  expect(errors).toEqual([]);
});
