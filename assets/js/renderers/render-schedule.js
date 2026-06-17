import { escapeHtml } from "../ui-states.js";
import { SCHEDULE_TIMELINE_DAYS } from "../content-data.js";
import { getCurrentDayId } from "../time.js";

export function renderSchedule(selectedDayId, currentShow, resolveShowSlot) {
  const todayId = getCurrentDayId();
  const dayId = selectedDayId || todayId;
  const day = SCHEDULE_TIMELINE_DAYS.find((d) => d.id === dayId) || SCHEDULE_TIMELINE_DAYS[0];
  const isToday = day.id === todayId;

  // Le surlignage vient de current-show.json (vérité antenne), jamais de l'heure théorique.
  const currentSlot =
    isToday && currentShow && currentShow.show && typeof resolveShowSlot === "function"
      ? resolveShowSlot(day, currentShow)
      : null;

  const tabs = SCHEDULE_TIMELINE_DAYS.map((d) => {
    const isActive = d.id === day.id;
    const todayMark = d.id === todayId ? " ·" : "";
    return `<button type="button" role="tab" aria-selected="${isActive}" tabindex="${isActive ? "0" : "-1"}" data-day="${d.id}"${isActive ? ' class="is-active"' : ""}>${escapeHtml(d.shortName)}${todayMark}</button>`;
  }).join("");

  const nowLine =
    isToday && currentShow && currentShow.show
      ? `<p class="kicker kicker--accent" style="margin:0 0 12px;">// en ce moment : ${escapeHtml(currentShow.show)}${currentShow.isLive ? " — direct" : ""}</p>`
      : "";

  const slots = (day.slots || [])
    .map((slot) => {
      const isCurrent = slot === currentSlot;
      const badge = slot.badge ? `<span class="slot-badge">${escapeHtml(slot.badge)}</span>` : "";
      const onAir = isCurrent ? `<span class="slot-badge slot-badge--onair">à l'antenne</span>` : "";
      return `
        <li${isCurrent ? ' class="is-current"' : ""}>
          <span class="slot-time">${escapeHtml(slot.time || "")}</span>
          <div>
            <p class="slot-title">${escapeHtml(slot.title || "")}${badge}${onAir}</p>
            <p class="slot-desc">${escapeHtml(slot.desc || "")}</p>
          </div>
        </li>
      `;
    })
    .join("");

  return `
    <h2 class="page-title">La semaine en clair</h2>
    <p class="page-lead">Les nuits, les matinées, les rendez-vous fixes, les focus et les dérives qui donnent son rythme à la radio. La grille reste fluide et indicative : un direct, un décalage ou une dérive peuvent déplacer l'antenne. C'est la grille de lancement de la radio : d'autres émissions viendront bientôt l'habiter, au fil des rencontres, des essais et des formes qui s'invitent à l'antenne.</p>
    <div class="day-tabs" id="scheduleDayTabs" role="tablist" aria-label="Jours de la semaine">${tabs}</div>
    <p class="kicker" style="margin:0 0 10px;">${escapeHtml(day.name)} — ${escapeHtml(day.summary || "")}</p>
    ${nowLine}
    <ul class="slot-list">${slots}</ul>
  `;
}
