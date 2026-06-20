import { escapeHtml } from "../ui-states.js";

const MACOS_DMG_URL = "https://github.com/Dr-John-8bits/le-chat-noir/releases/latest/download/LeChatNoir.dmg";

// Icône de l'app = le logo de la station, cadré en squircle macOS (coins arrondis,
// look « app icon »). Même image que l'icône réelle de l'app Mac/Linux.
function appIcon() {
  return `<img class="app-icon__img" src="assets/media/brand/logo-320.jpg" alt="" width="84" height="84" loading="lazy" />`;
}

const APPLE_GLYPH = `<svg class="plat-glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M16.36 1.43c0 1.06-.43 2.06-1.13 2.79-.74.79-1.93 1.39-2.92 1.31-.12-1.02.42-2.08 1.08-2.76.73-.77 2-.36 2.97-1.34zM20.9 17.13c-.03.07-.46 1.56-1.51 3.1-.93 1.34-1.92 2.7-3.41 2.71-1.46.03-1.93-.86-3.6-.86-1.67 0-2.19.84-3.57.89-1.44.05-2.54-1.45-3.48-2.79-1.92-2.78-3.39-7.86-1.42-11.29.98-1.7 2.73-2.78 4.63-2.8 1.42-.03 2.76.95 3.62.95.86 0 2.49-1.18 4.2-1.01.71.03 2.71.29 3.99 2.18-.1.07-2.38 1.39-2.35 4.15.03 3.3 2.9 4.4 2.93 4.42z"></path></svg>`;

const PENGUIN_GLYPH = `<svg class="plat-glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 1.6c-2.2 0-3.7 1.7-3.7 4.1 0 1 .2 1.7.2 2.4-.7.6-1.6 1.7-2.4 3.5-.5 1.2-.9 1.9-1.5 2.3-.6.4-.6 1 .1 1.3.4.2 1 .1 1.5-.2-.3.9-.5 1.9-.5 2.8 0 1.5.6 2.4 1.3 3 .5.4 1.1.6 1.7.6h6.6c.6 0 1.2-.2 1.7-.6.7-.6 1.3-1.5 1.3-3 0-.9-.2-1.9-.5-2.8.5.3 1.1.4 1.5.2.7-.3.7-.9.1-1.3-.6-.4-1-1.1-1.5-2.3-.8-1.8-1.7-2.9-2.4-3.5 0-.7.2-1.4.2-2.4 0-2.4-1.5-4.1-3.5-4.1z"></path><circle cx="10" cy="6.4" r="0.9" fill="#15110b"></circle><circle cx="14" cy="6.4" r="0.9" fill="#15110b"></circle><path d="M11 8.1l1-1 1 1-1 1z" fill="#e8a23a"></path><path d="M9.3 21.4l-1.4 1.6M14.7 21.4l1.4 1.6" stroke="#e8a23a" stroke-width="1.4" stroke-linecap="round"></path></svg>`;

const MACOS_SPECS = ["macOS 14 (Sonoma) ou plus récent", "Mac Apple Silicon — puce M1, M2, M3…"];

const LINUX_SPECS = [
  "Ubuntu 24.04 LTS et ultérieures · bureau GNOME",
  "Linux Mint 21 / 22 et ultérieures · bureau Cinnamon",
  "Architecture x86_64 (64 bits)",
  "Wayland et X11",
];

const LINUX_FORMATS = [
  ["Flatpak", "via Flathub — canal principal, mises à jour automatiques"],
  ["AppImage", "téléchargement direct, sans installation"],
];

function specList(items) {
  return `<ul class="spec-list">${items.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>`;
}

export function renderApp() {
  return `
    <h2 class="page-title">L'app Le Chat Noir</h2>
    <p class="page-lead">Le direct, la grille, les voix et les actus — dans une app native, posée sur ton bureau. L'écoute lente, sans onglet à garder ouvert.</p>

    <div class="platform-grid">

      <article class="platform-card" aria-labelledby="plat-macos">
        <div class="app-icon">${appIcon()}</div>
        <div class="platform-card__head">
          <h3 class="platform-card__name" id="plat-macos">${APPLE_GLYPH}<span>macOS</span></h3>
          <span class="avail-pill"><span class="avail-pill__dot" aria-hidden="true"></span>disponible</span>
        </div>
        ${specList(MACOS_SPECS)}
        <p class="status-line" id="appVersionLine">&nbsp;</p>
        <a class="action-button action-button--accent" href="${MACOS_DMG_URL}" target="_blank" rel="noopener noreferrer">Télécharger pour Mac</a>
        <div class="install-note">
          <p class="kicker kicker--accent" style="margin:0 0 6px;">// première ouverture</p>
          <p style="margin:0;">Le Chat Noir est une app indépendante, <strong>non signée par Apple</strong>. Au premier lancement, fais un <strong>clic droit sur l'app</strong> dans le dossier Applications → <strong>Ouvrir</strong>, puis confirme.</p>
          <p class="status-line" style="margin:8px 0 0;">Alternative : Réglages Système → Confidentialité et sécurité → « Ouvrir quand même ».</p>
        </div>
      </article>

      <article class="platform-card platform-card--soon" aria-labelledby="plat-linux">
        <div class="app-icon app-icon--soon">${appIcon()}</div>
        <div class="platform-card__head">
          <h3 class="platform-card__name" id="plat-linux">${PENGUIN_GLYPH}<span>Linux</span></h3>
          <span class="soon-pill">bientôt</span>
        </div>
        <p style="font-size:14.5px;color:var(--ink-soft);margin:0 0 14px;">On y travaille. L'app débarque aussi sur Linux — voici ce qu'elle visera.</p>
        ${specList(LINUX_SPECS)}
        <div class="formats">
          <p class="kicker" style="margin:0 0 8px;">// distribution prévue</p>
          ${LINUX_FORMATS.map(([n, d]) => `<p class="format-row"><strong>${escapeHtml(n)}</strong> — ${escapeHtml(d)}</p>`).join("")}
        </div>
        <p class="status-line" style="margin:14px 0 0;">identifiant : <span class="mono">fr.lechatnoirradio.Player</span></p>
      </article>

    </div>
  `;
}

// Affichage de la version en direct depuis app-version.json (source unique, lue
// aussi par l'app). Repli silencieux : le bouton de téléchargement reste valide.
export async function loadAppVersion() {
  const line = document.getElementById("appVersionLine");
  if (!line) return;
  try {
    const res = await fetch(`assets/data/app-version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const macos = data && data.macos;
    if (macos && macos.version) {
      const build = macos.build != null ? ` · build ${macos.build}` : "";
      line.textContent = `dernière version : ${macos.version}${build}`;
      return;
    }
    line.textContent = "";
  } catch {
    line.textContent = "";
  }
}
