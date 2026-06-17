import { REFRESH_MS } from "./config.js";
import { fetchNowPlaying, fetchCurrentShow, fetchListeners, STATUS } from "./radio-api.js";
import { formatSinceLabel, formatLocalTime } from "./time.js";
import { createPoller } from "./poller.js";
import { setTextIfChanged } from "./ui-states.js";
import { formatTrackMain } from "./renderers/render-home.js";

const refs = {
  pill: document.getElementById("directPill"),
  pillText: document.getElementById("directPillText"),
  show: document.getElementById("directShow"),
  since: document.getElementById("directSince"),
  track: document.getElementById("directTrack"),
  trackMeta: document.getElementById("directTrackMeta"),
  listeners: document.getElementById("directListeners"),
  listenersUpdated: document.getElementById("directListenersUpdated"),
  refreshButton: document.getElementById("directRefreshButton"),
};

async function refreshMeta() {
  const [showResult, trackResult] = await Promise.all([fetchCurrentShow(), fetchNowPlaying()]);

  if (showResult.status === STATUS.OK) {
    const show = showResult.data;
    const isLive = show.isLive || (trackResult.status === STATUS.OK && trackResult.data.isLiveHint);
    setTextIfChanged(refs.show, show.show || "Programmation en cours");
    setTextIfChanged(refs.since, formatSinceLabel(show.since) || "—");
    refs.pill.classList.toggle("is-direct", Boolean(isLive));
    refs.pill.classList.toggle("is-on", !isLive);
    setTextIfChanged(refs.pillText, isLive ? "direct — on air" : "à l'antenne");
  }

  if (trackResult.status === STATUS.OK && (trackResult.data.title || trackResult.data.artist)) {
    const t = trackResult.data;
    const mainHtml = formatTrackMain(t.artist, t.title);
    if (refs.track.dataset.rendered !== mainHtml) {
      refs.track.dataset.rendered = mainHtml;
      refs.track.innerHTML = mainHtml;
    }
    const meta = [t.album, t.year].filter(Boolean).join(" · ");
    setTextIfChanged(refs.trackMeta, meta || "—");
  }

  return showResult.status === STATUS.OK || trackResult.status === STATUS.OK;
}

async function refreshListeners() {
  const result = await fetchListeners();
  const data = result.data;
  if (result.status === STATUS.OK && data && data.isForExpectedMount && !data.isStale && data.current != null) {
    const plural = data.current === 1 ? "auditeur·ice" : "auditeur·ices";
    const peak = data.peak != null ? ` · pic ${data.peak}` : "";
    setTextIfChanged(refs.listeners, `${data.current} ${plural}${peak}`);
    setTextIfChanged(refs.listenersUpdated, data.updatedAt ? `mis à jour à ${formatLocalTime(data.updatedAt)}` : "—");
  } else {
    setTextIfChanged(refs.listeners, "audience momentanément indisponible");
    setTextIfChanged(refs.listenersUpdated, "—");
  }
  return result.status === STATUS.OK;
}

const metaPoller = createPoller(refreshMeta, REFRESH_MS.live);
const listenersPoller = createPoller(refreshListeners, REFRESH_MS.listeners);
metaPoller.start();
listenersPoller.start();

refs.refreshButton.addEventListener("click", () => {
  metaPoller.kick();
  listenersPoller.kick();
});
