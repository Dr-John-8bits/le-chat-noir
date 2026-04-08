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

async function mockWednesdayCurrentShow(page, options = {}) {
  const nowIso = options.nowIso || "2026-04-08T16:05:00.000Z";
  const sinceIso = options.sinceIso || "2026-04-08T15:50:00.000Z";

  await page.addInitScript(({ fixedNow }) => {
    const RealDate = Date;

    class MockDate extends RealDate {
      constructor(...args) {
        if (args.length === 0) {
          super(fixedNow);
          return;
        }
        super(...args);
      }

      static now() {
        return new RealDate(fixedNow).getTime();
      }
    }

    MockDate.parse = RealDate.parse.bind(RealDate);
    MockDate.UTC = RealDate.UTC.bind(RealDate);
    window.Date = MockDate;
  }, { fixedNow: nowIso });

  await page.route("**/current-show.json*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        show: "Les chats sauvages",
        kind: "editorial_window",
        is_live: false,
        since: Math.floor(new Date(sinceIso).getTime() / 1000),
      }),
    });
  });

  await page.route("**/nowplaying.json*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        artist: "Test Artist",
        title: "Test Track",
        album: "Test Album",
        year: "2026",
      }),
    });
  });

  await page.route("**/history/nowplaying.csv*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/csv",
      body: [
        "ts,unused,artist,title,album,year",
        "2026-04-08T15:58:00.000Z,,Test Artist,Test Track,Test Album,2026",
      ].join("\n"),
    });
  });
}

test("keeps one active nav item and preserves the shared audio element across route changes", async ({ page }) => {
  await page.evaluate(() => {
    window.__audioRef = document.getElementById("radioAudio");
  });

  const homeNavButton = page.locator('.main-nav__button[data-route="accueil"]').first();
  await expect(page.getByRole("button", { name: "Historique", exact: true })).toHaveCount(0);
  await expect(page.locator(".main-nav__button.is-active")).toHaveCount(1);
  await expect(homeNavButton).toHaveClass(/is-active/);
  await expect(page.getByRole("heading", { name: "Récemment diffusé" })).toBeVisible();

  await openMobileNavIfNeeded(page);
  await getNavButton(page, "Grille").click();
  await expect(page.locator(".main-nav__button.is-active")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "La semaine en clair" })).toBeVisible();
  await expect(page.locator("#schedule-panel")).toBeVisible();

  const mobileToggle = page.locator("#mobileNavToggle");
  if (await mobileToggle.isVisible()) {
    await expect(mobileToggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#mobileNavCurrentLabel")).toHaveText("Grille");
  }

  const sameAudioNode = await page.evaluate(() => window.__audioRef === document.getElementById("radioAudio"));
  expect(sameAudioNode).toBe(true);

  await page.locator(".brand__home").click();
  await expect(page.locator(".main-nav__button.is-active")).toHaveCount(1);
  await expect(homeNavButton).toHaveClass(/is-active/);
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

test("direct page stays out of the main menu and loads its monitoring shell", async ({ page }) => {
  await page.goto("/direct.html");

  await expect(page.getByRole("heading", { name: "État du direct" })).toBeVisible();
  await expect(page.locator(".main-nav")).toHaveCount(0);
  await expect(page.locator("#directCurrentShow")).toBeVisible();
  await expect(page.locator("#directListenersCurrent")).toBeVisible();
});

test("home history CTA opens the dedicated history page in a new tab", async ({ page, context }) => {
  await context.route("**/history/nowplaying.csv*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/csv",
      body: [
        "ts,unused,artist,title,album,year",
        "2026-04-08T18:00:00.000Z,,Test Artist,Test Track,Test Album,2026",
      ].join("\n"),
    });
  });

  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("link", { name: "Afficher l'historique de diffusion" }).click();
  const popup = await popupPromise;

  await expect(popup).toHaveURL(/history\.html$/);
  await expect(popup.getByRole("heading", { name: "Historique de diffusion" })).toBeVisible();
  await expect(popup.locator(".main-nav")).toHaveCount(0);
  await expect(popup.locator("#radioAudio")).toHaveCount(0);
  await expect(popup.locator("#historyList .history-row")).toHaveCount(1);
});

test("home keeps the earlier duplicate show block active until the current-show source actually changes", async ({ page }) => {
  await mockWednesdayCurrentShow(page, {
    nowIso: "2026-04-08T16:05:00.000Z",
    sinceIso: "2026-04-08T15:50:00.000Z",
  });

  await page.goto("/");

  const focusTitles = page.locator(".today-focus__title");
  await expect(focusTitles).toHaveCount(4);
  await expect(focusTitles.nth(0)).toHaveText("Les chats sauvages");
  await expect(focusTitles.nth(1)).toHaveText("Documents de terrain");
  await expect(focusTitles.nth(2)).toHaveText("Les chats sauvages");
});

test("home can resolve the later duplicate show block once it has actually resumed", async ({ page }) => {
  await mockWednesdayCurrentShow(page, {
    nowIso: "2026-04-08T17:10:00.000Z",
    sinceIso: "2026-04-08T16:40:00.000Z",
  });

  await page.goto("/");

  const focusTitles = page.locator(".today-focus__title");
  await expect(focusTitles).toHaveCount(2);
  await expect(focusTitles.nth(0)).toHaveText("Les chats sauvages");
  await expect(focusTitles.nth(1)).toHaveText("Les Ondes du Chat Noir");
});
