import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import {
  slugify,
  parseFrontMatter,
  buildNewsItem,
  buildSortKey,
  inlineMarkdownToHtml,
  renderRss,
  readNewsEntries,
  buildNewsUrl,
  CONTENT_DIR,
} from "../../scripts/lib/news-content.mjs";

test("slugify : accents, apostrophes, esperluettes", () => {
  assert.equal(slugify("L'Autre Nuit & les Étoiles"), "l-autre-nuit-et-les-etoiles");
  assert.equal(slugify("  Déjà   vu !!! "), "deja-vu");
});

test("parseFrontMatter : attributs quotés et corps", () => {
  const { attributes, body } = parseFrontMatter('---\ntitle: "Mon titre"\npublishedOn: "2026-06-11"\norder: "2"\n---\n\nChapeau.\n\nCorps.');
  assert.equal(attributes.title, "Mon titre");
  assert.equal(attributes.publishedOn, "2026-06-11");
  assert.equal(body, "Chapeau.\n\nCorps.");
});

test("parseFrontMatter : sans front matter → tout en corps", () => {
  const { attributes, body } = parseFrontMatter("Juste du texte.");
  assert.deepEqual(attributes, {});
  assert.equal(body, "Juste du texte.");
});

test("buildNewsItem : lead/body séparés, HTML échappé, liens markdown", () => {
  const item = buildNewsItem({
    title: "Test <script>",
    publishedOn: "2026-06-11",
    order: 1,
    slug: "test",
    body: "Chapeau avec [un lien](https://example.com) & des chevrons <b>.\n\nCorps du billet.",
    sourcePath: "test.md",
  });
  assert.equal(item.lead, "Chapeau avec un lien & des chevrons <b>.");
  assert.ok(item.leadHtml.includes('<a href="https://example.com"'));
  assert.ok(item.leadHtml.includes("&amp;"));
  assert.ok(item.leadHtml.includes("&lt;b&gt;"));
  assert.equal(item.body, "Corps du billet.");
  assert.equal(item.url, buildNewsUrl("test"));
  assert.ok(item.url.endsWith("/#actualites/test"), "permalien hash conservé pour compat RSS");
});

test("buildNewsItem : billet sans paragraphe → erreur explicite", () => {
  assert.throws(
    () => buildNewsItem({ title: "X", publishedOn: "2026-06-11", order: 1, slug: "x", body: "   ", sourcePath: "x.md" }),
    /aucun paragraphe/
  );
});

test("buildSortKey : tri stable par date puis ordre", () => {
  assert.ok(buildSortKey("2026-06-11", 2) > buildSortKey("2026-06-11", 1));
  assert.ok(buildSortKey("2026-06-12", 1) > buildSortKey("2026-06-11", 9));
});

test("inlineMarkdownToHtml : pas de target=_blank dans le flux RSS", () => {
  const web = inlineMarkdownToHtml("[x](https://a.fr)");
  const feed = inlineMarkdownToHtml("[x](https://a.fr)", { forFeed: true });
  assert.ok(web.includes("noopener"));
  assert.ok(!feed.includes("noopener"));
});

test("renderRss : XML bien formé, dates RFC 822, items présents", () => {
  const item = buildNewsItem({
    title: 'Titre & "guillemets"',
    publishedOn: "2026-06-11",
    order: 1,
    slug: "titre-guillemets",
    body: "Chapeau.\n\nCorps.",
    sourcePath: "t.md",
  });
  const rss = renderRss([item]);
  assert.ok(rss.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(rss.includes("<title>Titre &amp; &quot;guillemets&quot;</title>"));
  assert.ok(rss.includes("<pubDate>Thu, 11 Jun 2026"));
  assert.ok(rss.includes('guid isPermaLink="true"'));
});

test("readNewsEntries : lit tous les billets sources, tri anti-chronologique", () => {
  const items = readNewsEntries();
  const sourceCount = readdirSync(CONTENT_DIR).filter((f) => /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(f)).length;
  assert.equal(items.length, sourceCount);
  assert.ok(items.length > 0);
  for (let i = 1; i < items.length; i += 1) {
    assert.ok(items[i - 1].sortKey >= items[i].sortKey);
  }
  assert.ok(items.every((item) => item.slug && item.title && item.dateLabel));
});
