const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

function getNavButton(page, name) {
  return page.locator(".main-nav").getByRole("button", { name, exact: true });
}

async function openMobileNavIfNeeded(page) {
  const toggle = page.locator("#mobileNavToggle");
  if (!(await toggle.isVisible())) return;
  if ((await toggle.getAttribute("aria-expanded")) === "true") return;
  await toggle.click();
}

test("keeps one active nav item and preserves the shared audio element across route changes", async ({ page }) => {
  await page.evaluate(() => {
    window.__audioRef = document.getElementById("radioAudio");
  });

  await expect(page.locator(".main-nav__button.is-active")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Récemment diffusé" })).toBeVisible();

  await openMobileNavIfNeeded(page);
  await getNavButton(page, "Historique").click();
  await expect(page.locator(".main-nav__button.is-active")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Historique de diffusion" })).toBeVisible();
  await expect(page.locator(".history-hero .history-form")).toBeVisible();
  await expect(page.locator(".history-toolbar")).toHaveCount(0);

  const mobileToggle = page.locator("#mobileNavToggle");
  if (await mobileToggle.isVisible()) {
    await expect(mobileToggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#mobileNavCurrentLabel")).toHaveText("Historique");
  }

  const sameAudioNode = await page.evaluate(() => window.__audioRef === document.getElementById("radioAudio"));
  expect(sameAudioNode).toBe(true);

  await openMobileNavIfNeeded(page);
  await getNavButton(page, "Accueil").click();
  await expect(page.locator(".main-nav__button.is-active")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Récemment diffusé" })).toBeVisible();
});

test("news year tabs expose a single active tab and support keyboard navigation", async ({ page }) => {
  await openMobileNavIfNeeded(page);
  await getNavButton(page, "Actualités").click();

  const activeTabs = page.locator('.day-switcher [role="tab"][aria-selected="true"]');
  await expect(activeTabs).toHaveCount(1);

  const firstActiveId = await activeTabs.first().getAttribute("id");
  await activeTabs.first().press("ArrowRight");

  await expect(activeTabs).toHaveCount(1);
  const secondActiveId = await activeTabs.first().getAttribute("id");
  expect(secondActiveId).not.toBe(firstActiveId);

  const tabPanel = page.locator('#news-panel[role="tabpanel"]');
  await expect(tabPanel).toHaveAttribute("aria-labelledby", secondActiveId || "");
});

test("schedule day tabs expose a single active tab on touch navigation", async ({ page }) => {
  await openMobileNavIfNeeded(page);
  await getNavButton(page, "Grille").click();

  const activeTabs = page.locator('.day-switcher [role="tab"][aria-selected="true"]');
  await expect(activeTabs).toHaveCount(1);

  await page.locator('[data-schedule-day="wed"]').click();
  await expect(activeTabs).toHaveCount(1);
  await expect(page.locator('[data-schedule-day="wed"]')).toHaveAttribute("aria-selected", "true");

  const tabPanel = page.locator('#schedule-panel[role="tabpanel"]');
  await expect(tabPanel).toHaveAttribute("aria-labelledby", /schedule-tab-wed/);
});

test("mobile nav toggle exposes and collapses the menu cleanly", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile-only navigation behavior");

  const toggle = page.locator("#mobileNavToggle");
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#mainNav")).toHaveClass(/is-open/);

  await getNavButton(page, "Voix").click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".main-nav__button.is-active")).toHaveCount(1);
  await expect(page.locator("#mobileNavCurrentLabel")).toHaveText("Voix");
});
