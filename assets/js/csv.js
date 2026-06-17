import { DISPLAY_TIME_ZONE } from "./config.js";
import { getDisplayDateParts } from "./time.js";

export function parseCsv(text) {
  let source = String(text || "");
  if (source.charCodeAt(0) === 0xfeff) source = source.slice(1);

  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let fieldHadContent = false;

  const pushField = () => {
    row.push(field);
    field = "";
    fieldHadContent = false;
  };

  const pushRow = () => {
    pushField();
    const isEmptyLine = row.length === 1 && row[0] === "";
    if (!isEmptyLine) rows.push(row);
    row = [];
  };

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && !fieldHadContent && field === "") {
      inQuotes = true;
      fieldHadContent = true;
      continue;
    }

    if (char === ",") {
      pushField();
      continue;
    }

    if (char === "\n") {
      pushRow();
      continue;
    }

    if (char === "\r") {
      if (source[i + 1] === "\n") i += 1;
      pushRow();
      continue;
    }

    field += char;
    fieldHadContent = true;
  }

  if (field !== "" || row.length) pushRow();
  return rows;
}

export function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;
  const source = String(line || "");

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (char === '"') {
      if (inQuotes && source[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  values.push(current);
  return values;
}

function asTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function enrichHistoryRow(raw, timeZone = DISPLAY_TIME_ZONE) {
  if (!raw || !raw.tsIso) return null;
  const parts = getDisplayDateParts(raw.tsIso, timeZone);
  if (!parts) return null;

  const parsedMs = Date.parse(raw.tsIso);
  const epoch = Number(raw.epoch);
  const tsMs = Number.isFinite(parsedMs)
    ? parsedMs
    : Number.isFinite(epoch) && epoch > 0
      ? epoch * 1000
      : 0;

  return {
    tsIso: raw.tsIso,
    tsMs,
    epoch: Number.isFinite(epoch) ? epoch : 0,
    artist: asTrimmedString(raw.artist),
    title: asTrimmedString(raw.title),
    album: asTrimmedString(raw.album),
    year: asTrimmedString(raw.year),
    localYmd: `${parts.year}-${parts.month}-${parts.day}`,
    localDate: `${parts.day}/${parts.month}/${parts.year}`,
    localTime: `${parts.hour}:${parts.minute}`,
    localMinutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function colsToHistoryRow(cols, timeZone) {
  if (!Array.isArray(cols) || cols.length < 4) return null;
  return enrichHistoryRow(
    {
      tsIso: asTrimmedString(cols[0]),
      epoch: cols[1],
      artist: cols[2],
      title: cols[3],
      album: cols[4],
      year: cols[5],
    },
    timeZone
  );
}

function isHeaderRow(cols) {
  return asTrimmedString(cols && cols[0]).toLowerCase() === "iso_utc";
}

export function parseHistoryCsv(text, { limitFromEnd = 0, timeZone = DISPLAY_TIME_ZONE } = {}) {
  const allRows = parseCsv(text);
  if (!allRows.length) return [];

  let dataRows = isHeaderRow(allRows[0]) ? allRows.slice(1) : allRows;
  if (Number.isFinite(limitFromEnd) && limitFromEnd > 0 && dataRows.length > limitFromEnd) {
    dataRows = dataRows.slice(dataRows.length - limitFromEnd);
  }

  const entries = [];
  for (const cols of dataRows) {
    const entry = colsToHistoryRow(cols, timeZone);
    if (entry) entries.push(entry);
  }
  entries.sort((a, b) => b.tsMs - a.tsMs);
  return entries;
}

function isPageHidden() {
  return typeof document !== "undefined" && document.hidden;
}

function yieldToEventLoop() {
  return new Promise((resolve) => {
    if (typeof globalThis.requestAnimationFrame === "function" && !isPageHidden()) {
      globalThis.requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

export async function parseHistoryCsvChunked(
  text,
  { limitFromEnd = 0, timeZone = DISPLAY_TIME_ZONE, chunkSize = 300 } = {}
) {
  // Fast path per line; quoted newlines unsupported here (the server never emits
  // them — parseCsv covers the full RFC for everything else that needs it).
  const normalized = String(text || "").replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const entries = [];

  let start = 0;
  if (lines.length && isHeaderRow(parseCsvLine(lines[0]))) start = 1;
  if (Number.isFinite(limitFromEnd) && limitFromEnd > 0) {
    start = Math.max(start, lines.length - limitFromEnd);
  }

  let sinceYield = 0;
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i];
    if (line) {
      const entry = colsToHistoryRow(parseCsvLine(line), timeZone);
      if (entry) entries.push(entry);
    }
    sinceYield += 1;
    if (sinceYield >= chunkSize) {
      sinceYield = 0;
      // Onglet caché : rAF gelé et setTimeout bridé à ~1 s — on ne yield que
      // lorsqu'il y a une interface visible à garder fluide.
      if (!isPageHidden()) await yieldToEventLoop();
    }
  }

  entries.sort((a, b) => b.tsMs - a.tsMs);
  return entries;
}
