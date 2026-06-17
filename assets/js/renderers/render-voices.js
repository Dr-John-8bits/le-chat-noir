import { escapeHtml } from "../ui-states.js";
import { PRODUCERS, SHOWS } from "../content-data.js";

export function renderVoices() {
  const producers = PRODUCERS.map((p) => {
    const name = p.href
      ? `<a href="${escapeHtml(p.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(p.name)} ↗</a>`
      : escapeHtml(p.name);
    return `
      <div class="voice-row">
        <img class="voice-row__avatar" src="${escapeHtml(p.image)}" alt="" loading="lazy" width="52" height="52" />
        <div>
          <span class="kicker">${escapeHtml(p.role)}</span>
          <p class="voice-row__name">${name}</p>
          <p class="voice-row__bio">${escapeHtml(p.bio)}</p>
        </div>
      </div>
    `;
  }).join("");

  const shows = SHOWS.map((s) => {
    const action = s.href
      ? `<a class="ghost-link" href="${escapeHtml(s.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.actionLabel || "Découvrir")} ↗</a>`
      : `<span class="status-line">${escapeHtml(s.actionLabel || "En rotation sur la radio")}</span>`;
    return `
      <article class="card">
        <img class="card__image${s.imageFit === "contain" ? " card__image--contain" : ""}" src="${escapeHtml(s.image)}" alt="" loading="lazy" />
        <div class="card__body">
          <span class="kicker">${escapeHtml(s.meta)}</span>
          <h3 class="card__title">${escapeHtml(s.title)}</h3>
          <p class="card__text">${escapeHtml(s.text)}</p>
          ${action}
        </div>
      </article>
    `;
  }).join("");

  return `
    <h2 class="page-title">Les voix qui fabriquent la radio</h2>
    <p class="page-lead">Production, chroniques, émissions, captations et projets qui donnent une forme au territoire radiophonique du Chat Noir.</p>

    <section class="page-section" aria-labelledby="voices-people">
      <div class="page-section__head">
        <h3 class="page-section__title" id="voices-people">Les voix</h3>
      </div>
      ${producers}
    </section>

    <section class="page-section" aria-labelledby="voices-shows">
      <div class="page-section__head">
        <h3 class="page-section__title" id="voices-shows">Émissions et formats</h3>
      </div>
      <div class="cards-grid">${shows}</div>
    </section>
  `;
}
