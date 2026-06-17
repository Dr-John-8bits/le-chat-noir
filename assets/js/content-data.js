// Contenus éditoriaux du site. Les voix et la grille sont des données générées
// (assets/data/*.json → npm run build:voices / build:schedule), le reste est édité ici.
export { PRODUCERS, SHOWS } from "./voices-data.js";
export { SCHEDULE_TIMELINE_DAYS } from "./schedule-data.js";

export const ABOUT_CHIPS = [
  "Autogérée",
  "Créations sonores",
  "Écoute lente",
  "Scène locale",
  "Diffusion continue",
  "Auto-hébergée",
];

export const CONTRIBUTION_MODES = [
  {
    id: "son",
    label: "Proposer un son",
    kicker: "Contribution",
    title: "Proposer un son ou une émission",
    text: "Un morceau, une émission, un module ou un podcast diffusable. On cherche des propositions claires, diffusables, et accompagnées des bonnes infos.",
    points: ["Titre ou nom du projet", "Lien d'écoute ou fichier", "Infos de droits et nom ou pseudo"],
    subject: "Le Chat Noir - Proposition sonore",
    body: "Bonjour,\n\nJe propose ce contenu pour diffusion :\n\n- Titre / Projet :\n- Lien d'écoute / téléchargement :\n- Droits / autorisation :\n- Nom / pseudo :\n\nMerci.",
    cta: "Nous écrire",
  },
  {
    id: "retrait",
    label: "Demander un retrait",
    kicker: "Priorité",
    title: "Demander un retrait",
    text: "Les demandes de retrait sont traitées en priorité, sans friction inutile. Il suffit de nous donner les éléments permettant d'identifier le contenu concerné.",
    points: ["Titre ou contenu concerné", "Motif de la demande", "Lien ou plage horaire si possible"],
    subject: "Le Chat Noir - Demande de retrait",
    body: "Bonjour,\n\nJe demande le retrait du contenu suivant :\n\n- Titre / Artiste :\n- Motif :\n- Lien / horaire de diffusion :\n- Contact :\n\nMerci.",
    cta: "Nous écrire",
  },
  {
    id: "contact",
    label: "Autre message",
    kicker: "Contact",
    title: "Nous écrire",
    text: "Pour une question, une correction, un signalement, une idée d'émission ou toute autre prise de contact liée à la radio.",
    points: ["Objet du message", "Contexte en quelques lignes", "Retour attendu"],
    subject: "Le Chat Noir - Contact",
    body: "Bonjour,\n\nObjet :\n\nMessage :\n\nNom / pseudo :\n\nMerci.",
    cta: "Nous écrire",
  },
];
