import { escapeHtml } from "./ui-states.js";
import { getTodayYmd } from "./time.js";

const refs = {
  form: document.getElementById("newsStudioForm"),
  title: document.getElementById("newsTitleInput"),
  date: document.getElementById("newsDateInput"),
  order: document.getElementById("newsOrderInput"),
  lead: document.getElementById("newsLeadInput"),
  body: document.getElementById("newsBodyInput"),
  slug: document.getElementById("newsSlugPreview"),
  file: document.getElementById("newsFilePreview"),
  output: document.getElementById("newsMarkdownOutput"),
  copy: document.getElementById("copyMarkdownButton"),
  download: document.getElementById("downloadMarkdownButton"),
  recent: document.getElementById("newsStudioRecent"),
};

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " et ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function buildMarkdown() {
  const title = refs.title.value.trim();
  const publishedOn = refs.date.value.trim() || getTodayYmd();
  const order = refs.order.value.trim() || "1";
  const lead = refs.lead.value.trim();
  const body = refs.body.value.trim();
  const slug = slugify(title || "nouvelle-actualite");
  const fileName = `${publishedOn}-${slug}.md`;

  const markdown = [
    "---",
    `title: "${(title || "Titre de l’actualité").replace(/"/g, '\\"')}"`,
    `publishedOn: "${publishedOn}"`,
    `order: "${order}"`,
    "---",
    "",
    lead || "Rédige ici le chapeau de l’actualité.",
    "",
    body || "Ajoute ici le corps du billet. Tu peux utiliser du Markdown simple, y compris [des liens](https://example.com).",
    "",
  ].join("\n");

  return { slug, fileName, markdown };
}

function updatePreview() {
  const { slug, fileName, markdown } = buildMarkdown();
  refs.slug.textContent = slug || "—";
  refs.file.textContent = fileName || "—";
  refs.output.value = markdown;
}

function flashLabel(button, label, fallback) {
  button.textContent = label;
  window.setTimeout(() => {
    button.textContent = fallback;
  }, 1400);
}

refs.copy.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(refs.output.value);
    flashLabel(refs.copy, "Markdown copié", "Copier le Markdown");
  } catch {
    flashLabel(refs.copy, "Copie impossible", "Copier le Markdown");
  }
});

refs.download.addEventListener("click", () => {
  const { fileName, markdown } = buildMarkdown();
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
});

async function loadRecentItems() {
  try {
    const response = await fetch("assets/data/news.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const items = (payload.items || []).slice(0, 6);
    refs.recent.innerHTML = items.length
      ? items
          .map(
            (item) => `
              <div class="news-item">
                <span class="kicker">${escapeHtml(item.dateLabel || item.publishedOn || "")}</span>
                <h3 class="news-item__title" style="font-size:15px;">${escapeHtml(item.title || "")}</h3>
                <p class="news-item__body">${escapeHtml(item.lead || "")}</p>
              </div>
            `
          )
          .join("")
      : '<p class="status-line">aucune actualité générée pour le moment</p>';
  } catch {
    refs.recent.innerHTML = '<p class="status-line is-error">aperçu indisponible (servir la page en HTTP)</p>';
  }
}

refs.form.addEventListener("input", updatePreview);
if (!refs.date.value) refs.date.value = getTodayYmd();
updatePreview();
loadRecentItems();
