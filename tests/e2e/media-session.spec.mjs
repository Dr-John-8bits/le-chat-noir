import { test, expect } from "@playwright/test";
import { mockRadio } from "./helpers.mjs";

// Garantit l'affichage natif (Centre de contrôle macOS, écran verrouillé
// iOS/Android) : artwork du chat + titre en cours. Acquis critique de
// l'ancien site — ne doit jamais régresser.

test("la Media Session expose titre, artiste, album et les 3 artworks après lecture", async ({ page }) => {
  await mockRadio(page, { playableStream: true });
  await page.goto("/");
  await expect(page.locator("#currentShowText")).toHaveText("La table du chat");

  await page.click("#playButton");

  await expect
    .poll(() => page.evaluate(() => navigator.mediaSession.playbackState), { timeout: 8000 })
    .toBe("playing");

  const session = await page.evaluate(() => {
    const meta = navigator.mediaSession.metadata;
    return {
      titre: meta ? meta.title : null,
      artiste: meta ? meta.artist : null,
      album: meta ? meta.album : null,
      artworks: meta ? meta.artwork.map((a) => a.sizes) : [],
      premierArtwork: meta && meta.artwork[0] ? meta.artwork[0].src : "",
    };
  });

  expect(session.titre).toBe("Titre Test");
  expect(session.artiste).toBe("Artiste Test");
  expect(session.album).toBe("Album Test");
  expect(session.artworks).toEqual(["180x180", "192x192", "512x512"]);
  expect(session.premierArtwork).toContain("apple-touch-icon.png");
});

test("le bouton passe en lecture et la pastille reste « à l'antenne »", async ({ page }) => {
  await mockRadio(page, { playableStream: true });
  await page.goto("/");
  await expect(page.locator("#onAirPillText")).toHaveText("à l'antenne");

  await page.click("#playButton");
  await expect(page.locator("#playButton")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#onAirPill")).toHaveClass(/is-on/);
  await expect(page.locator("#onAirPillText")).toHaveText("à l'antenne");
});

test("métadonnées absentes : la Media Session retombe sur l'identité de la radio", async ({ page }) => {
  await mockRadio(page, { failNowPlaying: true, failCurrentShow: true, playableStream: true });
  await page.goto("/");
  await page.click("#playButton");

  await expect
    .poll(() => page.evaluate(() => navigator.mediaSession.playbackState), { timeout: 8000 })
    .toBe("playing");

  const meta = await page.evaluate(() => ({
    titre: navigator.mediaSession.metadata?.title,
    album: navigator.mediaSession.metadata?.album,
  }));
  expect(meta.titre).toBe("Le Chat Noir");
  expect(meta.album).toBe("Laboratoire radiophonique indépendant");
});
