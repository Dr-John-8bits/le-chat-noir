import { REFRESH_MS } from "./config.js";
import { fetchHistoryCsv, fetchNowPlaying, STATUS } from "./radio-api.js";
import { parseHistoryCsvChunked, enrichHistoryRow } from "./csv.js";
import { searchWindow, getTodayYmd, getDisplayZoneLabel, formatLocalDate } from "./time.js";
import { createPoller } from "./poller.js";
import { escapeHtml, setTextIfChanged } from "./ui-states.js";
import { initScrollTop } from "./scroll-top.js";
import { formatTrackMain } from "./renderers/render-home.js";

const VISIBLE_STEP = 30;

const refs = {
  form: document.getElementById("historyForm"),
  dayInput: document.getElementById("historyDayInput"),
  timeInput: document.getElementById("historyTimeInput"),
  label: document.getElementById("historyLabel"),
  status: document.getElementById("historyStatus"),
  list: document.getElementById("historyList"),
  moreButton: document.getElementById("historyMoreButton"),
  reloadButton: document.getElementById("historyReloadButton"),
  zone: document.getElementById("historyZone"),
};

const state = {
  rows: [],
  day: getTodayYmd(),
  minutes: null,
  visible: VISIBLE_STEP,
  trackSignature: "",
  loading: false,
};

refs.dayInput.value = state.day;
refs.zone.textContent = getDisplayZoneLabel();

function setStatus(text, { error = false, loading = false } = {}) {
  setTextIfChanged(refs.status, text);
  refs.status.classList.toggle("is-error", error);
  refs.status.classList.toggle("is-loading-anim", loading);
}

function renderRows() {
  const { rows, totalCount } = searchWindow(state.rows, {
    dateYmd: state.day,
    minutes: state.minutes,
    count: state.visible,
  });

  const isToday = state.day === getTodayYmd();
  const dayLabel = isToday ? "aujourd'hui" : formatLocalDate(`${state.day}T12:00:00Z`);
  setTextIfChanged(
    refs.label,
    state.minutes == null
      ? `Diffusions — ${dayLabel}`
      : `Autour de ${String(Math.floor(state.minutes / 60)).padStart(2, "0")}:${String(state.minutes % 60).padStart(2, "0")} — ${dayLabel}`
  );

  if (!rows.length) {
    refs.list.innerHTML = `<li><span class="track-time">--:--</span><span class="track-main">Aucune diffusion trouvée pour ce créneau.</span></li>`;
  } else {
    refs.list.innerHTML = rows
      .map((row) => {
        const extra = [row.album, row.year].filter(Boolean).join(" · ");
        return `
          <li>
            <span class="track-time">${escapeHtml(row.localTime)}</span>
            <span class="track-main">${formatTrackMain(row.artist, row.title)}</span>
            ${extra ? `<span class="track-extra">${escapeHtml(extra)}</span>` : ""}
          </li>
        `;
      })
      .join("");
  }

  refs.moreButton.hidden = totalCount <= rows.length;
}

async function loadArchives() {
  if (state.loading) return;
  state.loading = true;
  refs.reloadButton.disabled = true;
  setStatus("chargement des archives", { loading: true });

  const result = await fetchHistoryCsv();
  if (result.status !== STATUS.OK) {
    setStatus("historique momentanément inaccessible — réessayez", { error: true });
    state.loading = false;
    refs.reloadButton.disabled = false;
    return;
  }

  setStatus("lecture des archives", { loading: true });
  const rows = await parseHistoryCsvChunked(result.data);
  state.rows = rows;
  state.loading = false;
  refs.reloadButton.disabled = false;
  setStatus(`${rows.length.toLocaleString("fr-FR")} diffusions archivées · heure de Paris`);
  renderRows();
}

// MAJ locale via nowplaying — pas de re-téléchargement du CSV (D3).
async function refreshFromNowPlaying() {
  const result = await fetchNowPlaying();
  if (result.status !== STATUS.OK) return false;
  const track = result.data;
  if (!track.title && !track.artist) return true;

  const signature = [track.artist, track.title, track.album].join("||").toLowerCase();
  if (signature === state.trackSignature) return true;
  state.trackSignature = signature;

  const head = state.rows[0];
  const headSignature = head ? [head.artist, head.title, head.album].join("||").toLowerCase() : "";
  if (signature === headSignature) return true;

  const entry = enrichHistoryRow({
    tsIso: new Date().toISOString(),
    artist: track.artist,
    title: track.title,
    album: track.album,
    year: track.year,
  });
  if (entry) {
    state.rows = [entry, ...state.rows];
    renderRows();
  }
  return true;
}

refs.form.addEventListener("submit", (event) => {
  event.preventDefault();
  state.day = refs.dayInput.value || getTodayYmd();
  const time = refs.timeInput.value;
  if (time) {
    const [h, m] = time.split(":").map(Number);
    state.minutes = (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  } else {
    state.minutes = null;
  }
  state.visible = VISIBLE_STEP;
  renderRows();
});

refs.moreButton.addEventListener("click", () => {
  state.visible += VISIBLE_STEP;
  renderRows();
});

refs.reloadButton.addEventListener("click", loadArchives);

loadArchives();
initScrollTop();
createPoller(refreshFromNowPlaying, REFRESH_MS.historyPage, { runImmediately: false }).start();
