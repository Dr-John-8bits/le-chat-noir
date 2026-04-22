(function () {
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
    copyBuildCommand: document.getElementById("copyBuildCommandButton"),
    recent: document.getElementById("newsStudioRecent"),
  };

  function slugify(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/&/g, " et ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getParisToday() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

    const year = parts.find((part) => part.type === "year")?.value || "1970";
    const month = parts.find((part) => part.type === "month")?.value || "01";
    const day = parts.find((part) => part.type === "day")?.value || "01";
    return `${year}-${month}-${day}`;
  }

  function escapeFrontMatter(value) {
    return String(value || "").replace(/"/g, '\\"');
  }

  function buildMarkdown() {
    const title = String(refs.title?.value || "").trim();
    const publishedOn = String(refs.date?.value || "").trim() || getParisToday();
    const order = String(refs.order?.value || "1").trim() || "1";
    const lead = String(refs.lead?.value || "").trim();
    const body = String(refs.body?.value || "").trim();
    const slug = slugify(title || "nouvelle-actualite");
    const fileName = `${publishedOn}-${slug}.md`;

    const segments = [
      "---",
      `title: "${escapeFrontMatter(title || "Titre de l’actualité")}"`,
      `publishedOn: "${publishedOn}"`,
      `order: "${order}"`,
      "---",
      "",
      lead || "Rédige ici le chapeau de l’actualité.",
      "",
      body || "Ajoute ici le corps du billet. Tu peux utiliser du Markdown simple, y compris [des liens](https://example.com).",
      "",
    ];

    return {
      slug,
      fileName,
      markdown: segments.join("\n"),
    };
  }

  function updatePreview() {
    const { slug, fileName, markdown } = buildMarkdown();
    if (refs.slug) refs.slug.textContent = slug || "—";
    if (refs.file) refs.file.textContent = fileName || "—";
    if (refs.output) refs.output.value = markdown;
  }

  async function copyMarkdown() {
    if (!refs.output?.value) return;
    try {
      await navigator.clipboard.writeText(refs.output.value);
      refs.copy.textContent = "Markdown copié";
      window.setTimeout(() => {
        refs.copy.textContent = "Copier le Markdown";
      }, 1400);
    } catch (error) {
      refs.copy.textContent = "Copie impossible";
      window.setTimeout(() => {
        refs.copy.textContent = "Copier le Markdown";
      }, 1400);
    }
  }

  async function copyBuildCommand() {
    const command = "npm run build:news";
    try {
      await navigator.clipboard.writeText(command);
      refs.copyBuildCommand.textContent = "Commande copiée";
      window.setTimeout(() => {
        refs.copyBuildCommand.textContent = "Copier la commande de build";
      }, 1400);
    } catch (error) {
      refs.copyBuildCommand.textContent = command;
      window.setTimeout(() => {
        refs.copyBuildCommand.textContent = "Copier la commande de build";
      }, 1800);
    }
  }

  function downloadMarkdown() {
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
  }

  function renderRecentItems(items) {
    if (!refs.recent) return;

    if (!Array.isArray(items) || !items.length) {
      refs.recent.innerHTML = '<p class="studio-empty">Aucune actualité générée pour le moment.</p>';
      return;
    }

    refs.recent.innerHTML = items
      .slice(0, 8)
      .map(
        (item) => `
          <article class="studio-recent__item">
            <p class="studio-recent__date">${escapeHtml(item.dateLabel || item.publishedOn || "")}</p>
            <h3 class="studio-recent__title">${escapeHtml(item.title || "")}</h3>
            <p class="studio-recent__lead">${escapeHtml(item.lead || "")}</p>
          </article>
        `
      )
      .join("");
  }

  async function loadRecentItems() {
    try {
      const response = await fetch("assets/data/news.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      renderRecentItems(payload.items || []);
    } catch (error) {
      if (refs.recent) {
        refs.recent.innerHTML =
          '<p class="studio-empty">Impossible de charger l’aperçu des actualités. Lance la page via un petit serveur local pour profiter de cette section.</p>';
      }
    }
  }

  function bindEvents() {
    if (refs.form) {
      refs.form.addEventListener("input", updatePreview);
    }
    if (refs.copy) {
      refs.copy.addEventListener("click", copyMarkdown);
    }
    if (refs.download) {
      refs.download.addEventListener("click", downloadMarkdown);
    }
    if (refs.copyBuildCommand) {
      refs.copyBuildCommand.addEventListener("click", copyBuildCommand);
    }
  }

  function init() {
    if (refs.date && !refs.date.value) {
      refs.date.value = getParisToday();
    }
    bindEvents();
    updatePreview();
    loadRecentItems();
  }

  init();
})();
