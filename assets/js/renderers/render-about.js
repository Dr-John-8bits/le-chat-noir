import { escapeHtml } from "../ui-states.js";
import { ABOUT_CHIPS, CONTRIBUTION_MODES } from "../content-data.js";
import { CONTACT_EMAIL } from "../config.js";

function buildMailtoHref(subject, body) {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// Contenu éditorial porté verbatim de l'ancien site (référence de ligne éditoriale).
const MANIFESTO_LINES = [
  "Le Chat Noir est une webradio lilloise, artisanale, indépendante et autogérée, dédiée aux créations sonores et musicales.",
  "Elle diffuse en continu des créations libres : paysages sonores, field recordings, expérimentations radiophoniques, émissions et musiques de tous horizons, sans cloisonnement rigide.",
  "La radio assume une écoute lente entre fiction et réel, et respecte les dynamiques des œuvres sans compression globale imposée à l'antenne.",
  "Le catalogue est le fruit d'une curation humaine, patiente et sensible : ici, pas d'algorithme de recommandation, pas d'IA, seulement des choix d'écoute, des essais, des intuitions et du temps passé à chercher.",
  "Tout est fait maison, hébergé, programmé et maintenu localement. Une radio de proximité cosmique, née dans un coin de la tête, tournée vers l'espace.",
];

const CONTRIBUTION_LINES = [
  "Nous sommes ouvert·es à toutes les propositions d’émission, de mix, de podcast ou de création sonore, à condition que tu détiennes les droits d’auteur sur tout ce que tu proposes et que les œuvres puissent être diffusées librement dans un cadre non commercial. Pas d’AI slop, pas de création générée par IA : uniquement des créations pensées, composées et portées par des humain·es.",
  "Nous ne diffuserons pas de contenus haineux, discriminatoires, fascistes, masculinistes, racistes, LGBTQIA+phobes ou assimilés : la radio reste un espace d’écoute safe.",
  "Nous cherchons aussi tout particulièrement un rendez-vous sonore régulier, hebdomadaire ou mensuel.",
  "Nous écoutons tout ce qui nous est envoyé, sans garantie de diffusion.",
];

const CONTRIBUTION_PANELS = [
  {
    title: "Ce que tu peux envoyer",
    body: "<p>Créations sonores, field recordings, documentaires déviants, fictions radiophoniques, paysages, bruits, silences, fragments ou autres choses difficiles à classer. Si tu hésites à savoir si ça rentre, c’est probablement que oui.</p>",
  },
  {
    title: "Repères techniques",
    body: "<ul><li>Durée libre.</li><li>Format accepté : MP3.</li><li>Stéréo ou mono, langue libre.</li></ul>",
  },
  {
    title: "Si la création est retenue",
    body: "<ul><li>Diffusion à l’antenne et intégration à la programmation.</li><li>Possibilité d’être rejouée et archivée.</li><li>Pas besoin d’être “pro”, ni même “abouti” : on cherche des gestes sincères, des tentatives, des recherches sonores et des ratés intéressants.</li></ul>",
  },
  {
    title: "Ce qu’il faut envoyer",
    body: "<ul><li>La création sonore elle-même.</li><li>Un titre.</li><li>Ton nom ou ton pseudonyme.</li><li>Une photo ou un visuel qui te représente.</li><li>Une courte description du principe de l’émission ou de la proposition.</li></ul>",
  },
];

const MENTIONS = [
  ["Éditeur du site.", "Le site Le Chat Noir Radio est édité et maintenu par un particulier, hébergé à titre non commercial sur un serveur personnel."],
  ["Contenu et diffusion.", "Tous les morceaux diffusés sont des œuvres libres de droits ou créées par leurs auteur·ices respectif·ves, dans le respect de leurs choix de diffusion. Si tu constates une erreur ou une diffusion non souhaitée, signale-la par le bouton de contact."],
  ["Données personnelles.", "Le site ne trace pas les visiteurs. Les seules données collectées sont celles que tu fournis volontairement pour nous écrire ; elles servent uniquement à répondre à ta demande et ne sont ni stockées ni partagées. Les statistiques d’écoute sont agrégées et anonymes."],
  ["Open source.", "L’intégralité de la webradio repose sur des outils open source comme Ubuntu, Icecast et Liquidsoap, et nous encourageons chaleureusement le soutien à cette communauté qui rend cette aventure possible."],
  ["Crédit photo.", "La photo utilisée pour le logo du Chat Noir a été prise par Yirmi June."],
  ["Responsabilité.", "L’éditeur ne saurait être tenu responsable d’une interruption temporaire du flux, ni de tout dommage indirect lié à l’usage du site ou à la diffusion en ligne."],
  ["Publication du site.", "Conception et rédaction humaines. Éditorialisation et publication assistées par IA."],
];

export function renderAbout() {
  const manifesto = MANIFESTO_LINES.map(
    (line, index) =>
      `<p style="font-size:${index === 0 ? "16.5px" : "15px"};color:${index === 0 ? "var(--ink)" : "var(--ink-soft)"};max-width:62ch;margin:0 0 14px;">${escapeHtml(line)}</p>`
  ).join("");

  const chips = ABOUT_CHIPS.map((chip) => `<li>${escapeHtml(chip)}</li>`).join("");

  const contributionIntro = CONTRIBUTION_LINES.map(
    (line) => `<p style="font-size:14.5px;color:var(--ink-soft);max-width:62ch;margin:0 0 12px;">${escapeHtml(line)}</p>`
  ).join("");

  const panels = CONTRIBUTION_PANELS.map(
    (panel) => `
      <article class="contrib-card">
        <h4 class="card__title" style="margin:0 0 8px;">${escapeHtml(panel.title)}</h4>
        <div class="card__text" style="font-size:13.5px;">${panel.body}</div>
      </article>
    `
  ).join("");

  const contribCards = CONTRIBUTION_MODES.map(
    (mode) => `
      <article class="contrib-card">
        <span class="kicker kicker--accent">${escapeHtml(mode.kicker)}</span>
        <h4 class="card__title" style="margin:6px 0 8px;">${escapeHtml(mode.title)}</h4>
        <p class="card__text">${escapeHtml(mode.text)}</p>
        <ul>${mode.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>
        <a class="action-button" style="display:inline-block;text-decoration:none;" href="${buildMailtoHref(mode.subject, mode.body)}">${escapeHtml(mode.cta)}</a>
      </article>
    `
  ).join("");

  const mentions = MENTIONS.map(
    ([label, text]) =>
      `<p style="font-size:13.5px;color:var(--muted);max-width:68ch;margin:0 0 10px;"><strong style="color:var(--ink-soft);">${escapeHtml(label)}</strong> ${escapeHtml(text)}</p>`
  ).join("");

  return `
    <h2 class="page-title">Un laboratoire radiophonique indépendant</h2>
    <div style="margin-top:16px;">${manifesto}</div>
    <ul class="chips">${chips}</ul>

    <section class="page-section" style="margin-top:40px;" aria-labelledby="about-contribute">
      <div class="page-section__head">
        <h3 class="page-section__title" id="about-contribute">Proposer une création</h3>
        <span class="kicker">émission · mix · podcast · création sonore</span>
      </div>
      ${contributionIntro}
      <div class="cards-grid" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr));margin-top:18px;">${panels}</div>
    </section>

    <section class="page-section" aria-labelledby="about-write">
      <div class="page-section__head">
        <h3 class="page-section__title" id="about-write">Nous écrire</h3>
        <span class="kicker">${escapeHtml(CONTACT_EMAIL)}</span>
      </div>
      <p style="font-size:14.5px;color:var(--ink-soft);max-width:62ch;margin:0 0 6px;">Si tu demandes le retrait d’un morceau, la suppression est faite dès réception du message.</p>
      <p style="font-size:14.5px;color:var(--ink-soft);max-width:62ch;margin:0 0 6px;">Aucune donnée personnelle n’est conservée au-delà du traitement de ta demande.</p>
      <p style="font-size:14.5px;color:var(--ink-soft);max-width:62ch;margin:0 0 18px;">On n’est pas très actif·ves sur les produits de META, mais on tient un <a class="ghost-link" href="https://www.instagram.com/lechatnoirradio/" target="_blank" rel="noopener noreferrer">compte Instagram vaguement à jour ↗</a>.</p>
      <div class="cards-grid" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr));">${contribCards}</div>
    </section>

    <section class="page-section" aria-labelledby="about-mentions">
      <div class="page-section__head">
        <h3 class="page-section__title" id="about-mentions">Mentions et confidentialité</h3>
        <span class="kicker">cadre de diffusion</span>
      </div>
      ${mentions}
    </section>
  `;
}
