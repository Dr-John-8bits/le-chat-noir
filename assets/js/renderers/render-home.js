import { escapeHtml } from "../ui-states.js";
import { SCHEDULE_TIMELINE_DAYS } from "../content-data.js";
import { getCurrentDayId, getCurrentLocalMinutes } from "../time.js";
import { getHomeTodayState } from "../schedule-match.js";

export function renderHome() {
  return `
    <section class="page-section" aria-labelledby="home-today-title">
      <div class="page-section__head">
        <h2 class="page-section__title" id="home-today-title">Aujourd'hui</h2>
        <span class="kicker">programmation indicative</span>
      </div>
      <ul class="slot-list" id="homeTodayList">
        <li><span class="slot-time mono">…</span><div><p class="slot-title">Chargement de la grille…</p></div></li>
      </ul>
      <p style="margin:14px 0 0;"><a class="ghost-link" href="#grille">voir la grille complète →</a></p>
    </section>

    <section class="page-section" aria-labelledby="home-recent-title">
      <div class="page-section__head">
        <h2 class="page-section__title" id="home-recent-title">Derniers passages</h2>
        <span class="status-line" id="homeRecentStatus">chargement…</span>
      </div>
      <ul class="track-list" id="homeRecentList">
        <li><span class="track-time">--:--</span><span class="track-main">Chargement des dernières diffusions…</span></li>
      </ul>
      <p style="margin:14px 0 0;"><a class="ghost-link" href="history.html" target="_blank" rel="noopener noreferrer">explorer tout l'historique ↗</a></p>
    </section>
  `;
}

function renderSlotItem(slot, isCurrent) {
  const badge = slot.badge ? `<span class="slot-badge">${escapeHtml(slot.badge)}</span>` : "";
  return `
    <li${isCurrent ? ' class="is-current"' : ""}>
      <span class="slot-time">${escapeHtml(slot.time || "")}</span>
      <div>
        <p class="slot-title">${escapeHtml(slot.title || "")}${badge}</p>
        <p class="slot-desc">${escapeHtml(slot.desc || "")}</p>
      </div>
    </li>
  `;
}

export function renderTodaySlots(currentShow, resolver) {
  const dayIndex = Math.max(
    0,
    SCHEDULE_TIMELINE_DAYS.findIndex((d) => d.id === getCurrentDayId())
  );
  const day = SCHEDULE_TIMELINE_DAYS[dayIndex];
  const { rows, currentSlot } = getHomeTodayState(day, currentShow, resolver, getCurrentLocalMinutes());

  if (!rows.length) {
    return `<li><span class="slot-time mono">—</span><div><p class="slot-title">Grille indisponible</p></div></li>`;
  }

  let html = rows.map((slot) => renderSlotItem(slot, slot === currentSlot)).join("");

  // Fin de journée : la suite du programme vit déjà demain (ex. 23h40 →
  // La Grande Nuit de 00h00). On complète avec les premiers créneaux du lendemain.
  if (rows.length < 4) {
    const nextDay = SCHEDULE_TIMELINE_DAYS[(dayIndex + 1) % SCHEDULE_TIMELINE_DAYS.length];
    const nextSlots = (nextDay.slots || []).slice(0, 4 - rows.length);
    if (nextSlots.length) {
      html += `
        <li class="slot-sep">
          <span class="slot-time"></span>
          <p class="kicker">demain — ${escapeHtml(nextDay.name.toLowerCase())}</p>
        </li>
      `;
      html += nextSlots.map((slot) => renderSlotItem(slot, false)).join("");
    }
  }

  return html;
}

export function renderRecentTracks(rows) {
  if (!rows || !rows.length) {
    return `<li><span class="track-time">--:--</span><span class="track-main">Rien à afficher pour le moment.</span></li>`;
  }

  return rows
    .slice(0, 8)
    .map((row) => {
      const extra = [row.album, row.year].filter(Boolean).join(" · ");
      return `
        <li>
          <span class="track-time">${escapeHtml(row.localTime || "--:--")}</span>
          <span class="track-main">${formatTrackMain(row.artist, row.title)}</span>
          ${extra ? `<span class="track-extra">${escapeHtml(extra)}</span>` : ""}
        </li>
      `;
    })
    .join("");
}

// Artiste en gras, titre en graisse normale : la radio diffuse des titres très
// narratifs, la distinction doit être immédiate.
export function formatTrackMain(artist, title) {
  const safeArtist = escapeHtml(artist || "");
  const safeTitle = escapeHtml(title || "");
  if (safeArtist && safeTitle) return `<strong class="track-artist">${safeArtist}</strong> — ${safeTitle}`;
  if (safeArtist) return `<strong class="track-artist">${safeArtist}</strong>`;
  return safeTitle || "Titre inconnu";
}
