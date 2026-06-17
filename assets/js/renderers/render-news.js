import { escapeHtml } from "../ui-states.js";
import { NEWS_ITEMS } from "../news-data.js";

export const NEWS_PAGE_SIZE = 6;

export function getSortedNews() {
  return NEWS_ITEMS.slice().sort((a, b) => String(b.sortKey).localeCompare(String(a.sortKey)));
}

export function getNewsYears() {
  const years = [];
  for (const item of getSortedNews()) {
    const year = String(item.publishedOn || "").slice(0, 4) || "Archives";
    if (!years.includes(year)) years.push(year);
  }
  return years;
}

export function findNewsBySlug(slug) {
  const wanted = String(slug || "").trim().toLowerCase();
  if (!wanted) return null;
  return NEWS_ITEMS.find((item) => String(item.slug).toLowerCase() === wanted) || null;
}

export function renderNews({ year, visibleCount = NEWS_PAGE_SIZE, focusedSlug = "" } = {}) {
  const years = getNewsYears();
  const selectedYear = years.includes(year) ? year : years[0] || "";
  const items = getSortedNews().filter((item) => String(item.publishedOn || "").startsWith(selectedYear));
  const shown = items.slice(0, visibleCount);

  const yearTabs = years
    .map((y) => {
      const isActive = y === selectedYear;
      return `<button type="button" role="tab" aria-selected="${isActive}" tabindex="${isActive ? "0" : "-1"}" data-news-year="${escapeHtml(y)}"${isActive ? ' class="is-active"' : ""}>${escapeHtml(y)}</button>`;
    })
    .join("");

  // leadHtml / bodyHtml sont générés et échappés par scripts/build-news.mjs.
  const articles = shown
    .map((item) => {
      const focused = focusedSlug && item.slug === focusedSlug;
      return `
        <article class="news-item${focused ? " is-focused" : ""}" id="news-${escapeHtml(item.slug)}">
          <span class="kicker">${escapeHtml(item.dateLabel)}</span>
          <h3 class="news-item__title">${escapeHtml(item.title)}</h3>
          <p class="news-item__lead">${item.leadHtml}</p>
          ${item.bodyHtml ? `<p class="news-item__body">${item.bodyHtml}</p>` : ""}
        </article>
      `;
    })
    .join("");

  return `
    <h2 class="page-title">Chronologie de la station</h2>
    <p class="page-lead">Naissance du flux, mises en route, bascules techniques, voix nouvelles, lives et accidents : les étapes qui façonnent encore Le Chat Noir.</p>
    <div class="day-tabs" role="tablist" aria-label="Filtrer les actualités par année">${yearTabs}</div>
    ${articles || '<p class="status-line">Aucune actualité pour cette année.</p>'}
    ${
      items.length > shown.length
        ? '<div class="history-actions"><button class="action-button action-button--ghost" type="button" data-news-more>Afficher davantage</button></div>'
        : ""
    }
    <p style="margin:20px 0 0;"><a class="ghost-link" href="feed.xml" target="_blank" rel="noopener noreferrer">s'abonner au flux RSS ↗</a></p>
  `;
}
