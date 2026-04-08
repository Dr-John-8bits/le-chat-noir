(function () {
  var PRODUCERS = [
    {
      role: "Production",
      name: "Dr. John",
      image: "assets/media/producers/drjohn.webp",
      bio: "Explore les zones floues entre réalité sonore, fiction radiophonique et écoute lente.",
    },
    {
      role: "Découverte",
      name: "Julien",
      image: "assets/media/producers/julien.jpg",
      bio: "Traverse la synthèse analogique par l'essai, l'apprentissage et l'expérimentation continue.",
    },
    {
      role: "Chronique",
      name: "Lady Em",
      image: "assets/media/producers/ladyem.webp",
      bio: "Démonte les mythes du vestiaire moderne sur fond de velvet tips.",
    },
    {
      role: "CONCERTS",
      name: "Naki et Guillaume",
      image: "assets/media/producers/NakietGuillaume.webp",
      bio: "Rediffusent ici les concerts qu’ils accueillent et enregistrent pour MFE sur RCV99.",
    },
    {
      role: "Curateur",
      name: "Yann",
      image: "assets/media/producers/yann.webp",
      bio: "Compose une curation fine, patiemment choisie dans les sorties du label Camembert électrique.",
    },
    {
      role: "Jingles",
      name: "Les potes",
      image: "assets/media/producers/potes.webp",
      bio: "Prêtent voix, idées et impulsions aux jingles, aux accroches et à la texture collective de la radio.",
    },
  ];

  var SHOWS = [
    {
      meta: "Émission",
      title: "L'Autre Nuit",
      image: "assets/media/shows/lautrenuit.webp",
      text: "Lectures sans centre, voix fatiguées et machines hésitantes pour les heures qui dérivent.",
      href: "https://audioblog.arteradio.com/blog/263269/le-chat-noir",
      actionLabelLines: ["Écouter", "le podcast"],
    },
    {
      meta: "Fiction sonore",
      title: "Le Pseudodocumentaire de l'espace",
      image: "assets/media/shows/pseudocumentaire.webp",
      text: "Archives déplacées, faux-semblants et dépression verte pour un laboratoire d'anticipation.",
      href: "https://audioblog.arteradio.com/blog/194586/pseudocumentaire-de-l-espace",
      actionLabelLines: ["Écouter", "le podcast"],
    },
    {
      meta: "Émission",
      title: "Console-toi",
      image: "assets/media/shows/consoletoi.webp",
      text: "ASMR Atari, stress 8-bit et poésie du samedi matin à micro ouvert.",
      href: "https://audioblog.arteradio.com/blog/263269/le-chat-noir",
      actionLabelLines: ["Écouter", "le podcast"],
    },
    {
      meta: "Labo Expé",
      title: "MS-20 Interférences",
      image: "assets/media/shows/ms20.webp",
      text: "Dérives du Korg MS-20 entre nappes instables, séquences rugueuses et heureux accidents.",
      actionLabel: "En rotation sur la radio",
    },
    {
      meta: "Captations",
      title: "Home Taping is Killing Music",
      image: "assets/media/shows/hometaping.webp",
      text: "Bootlegs, bruits du lieu et mémoire brute de la scène captée sur le vif.",
      href: "https://hometapingiskillingmusic.bandcamp.com/",
      actionLabel: "Ouvrir l'archive sonore",
    },
    {
      meta: "Captation",
      title: "Documents de terrain",
      image: "assets/media/shows/documentsdeterrain.webp",
      text: "Captations monophoniques et stéréophoniques de terrain.",
      actionLabel: "En rotation sur la radio",
    },
    {
      meta: "Mixtapes",
      title: "Camembert électrique",
      image: "assets/media/shows/camembert.webp",
      text: "Le label y déroule chaque semaine une sélection de musique expérimentale, minutieusement construite à partir de ses propres sorties.",
      href: "https://www.camembertelectrique.com/",
      actionLabel: "Visiter le label",
    },
  ];

  var ABOUT_CHIPS = [
    "Autogérée",
    "Créations sonores",
    "Écoute lente",
    "Scène locale",
    "Diffusion continue",
    "Auto-hébergée",
  ];

  var CONTRIBUTION_MODES = [
    {
      id: "son",
      label: "Proposer un son",
      kicker: "Contribution",
      title: "Proposer un son ou une émission",
      text: "Un morceau, une émission, un module ou un podcast diffusable. On cherche des propositions claires, diffusables, et accompagnées des bonnes infos.",
      points: [
        "Titre ou nom du projet",
        "Lien d'écoute ou fichier",
        "Infos de droits et nom ou pseudo",
      ],
      subject: "Le Chat Noir - Proposition sonore",
      body:
        "Bonjour,\n\nJe propose ce contenu pour diffusion :\n\n- Titre / Projet :\n- Lien d'écoute / téléchargement :\n- Droits / autorisation :\n- Nom / pseudo :\n\nMerci.",
      cta: "Nous écrire",
    },
    {
      id: "retrait",
      label: "Demander un retrait",
      kicker: "Priorité",
      title: "Demander un retrait",
      text: "Les demandes de retrait sont traitées en priorité, sans friction inutile. Il suffit de nous donner les éléments permettant d'identifier le contenu concerné.",
      points: [
        "Titre ou contenu concerné",
        "Motif de la demande",
        "Lien ou plage horaire si possible",
      ],
      subject: "Le Chat Noir - Demande de retrait",
      body:
        "Bonjour,\n\nJe demande le retrait du contenu suivant :\n\n- Titre / Artiste :\n- Motif :\n- Lien / horaire de diffusion :\n- Contact :\n\nMerci.",
      cta: "Nous écrire",
    },
    {
      id: "contact",
      label: "Autre message",
      kicker: "Contact",
      title: "Nous écrire",
      text: "Pour une question, une correction, un signalement, une idée d'émission ou toute autre prise de contact liée à la radio.",
      points: [
        "Objet du message",
        "Contexte en quelques lignes",
        "Retour attendu",
      ],
      subject: "Le Chat Noir - Contact",
      body: "Bonjour,\n\nObjet :\n\nMessage :\n\nNom / pseudo :\n\nMerci.",
      cta: "Nous écrire",
    },
  ];

  var SCHEDULE_TIMELINE_DAYS = [
    {
      id: "mon",
      shortName: "Lun",
      name: "Lundi",
      summary: "Le Migou, fragments matinaux, rock de l'aprème et retour de L'Autre Nuit.",
      slots: [
        { time: "00h00", title: "La Grande Nuit", desc: "Paysages sonores étendus, pièces immersives." },
        { time: "07h00", title: "Le Migou", desc: "Réveil café." },
        { time: "Puis", title: "Matinée : Fragments", desc: "Courtes dérives musicales de morceaux de 10 à 15 minutes.", meta: true },
        { time: "12h00", title: "La table du chat", desc: "Chanson, electro douce, ambient léger." },
        { time: "14h00", title: "L'instinct mode", desc: "Chronique du vestiaire by Lady Em." },
        { time: "Puis", title: "Rock de l'aprème", desc: "On réchauffe le rock'n'roll :D", meta: true, highlight: true },
        { time: "23h40", title: "L'Autre Nuit", desc: "Lectures sans centre et machines hésitantes." },
      ],
    },
    {
      id: "tue",
      shortName: "Mar",
      name: "Mardi",
      summary: "Le Migou, trajectoires matinales, noise du mardi et captations live jusqu'au pseudodocumentaire tardif.",
      slots: [
        { time: "00h00", title: "La Grande Nuit", desc: "Paysages sonores étendus, pièces immersives." },
        { time: "07h00", title: "Le Migou", desc: "Réveil café." },
        { time: "Puis", title: "Matinée : Trajectoires", desc: "Dérives musicales de morceaux de 15 à 30 minutes.", meta: true },
        { time: "12h00", title: "La table du chat", desc: "Chanson, electro douce, ambient léger." },
        { time: "14h00", title: "L'instinct mode", desc: "Chronique du vestiaire by Lady Em." },
        { time: "Puis", title: "Noise de l'aprème", desc: "Noise-rock, post-punk, etc.", meta: true, highlight: true },
        { time: "18h00", title: "Home Taping Is Killing Music", desc: "Captations pirates, concerts enregistrés sur le vif, archives live, sueur, scène et bootlegs.", highlight: true },
        { time: "Puis", title: "Noise de l'aprème", desc: "Retour au bloc noise du mardi jusqu'au rendez-vous de 23h40.", meta: true, highlight: true },
        { time: "23h40", title: "Le Pseudodocumentaire de l'espace", desc: "Fiction sonore et dépression verte." },
      ],
    },
    {
      id: "wed",
      shortName: "Mer",
      name: "Mercredi",
      summary: "Immersion longue, chats sauvages et Ondes du Chat Noir en soirée.",
      slots: [
        { time: "00h00", title: "La Grande Nuit", desc: "Paysages sonores étendus, pièces immersives." },
        { time: "07h00", title: "Le Migou", desc: "Réveil café." },
        { time: "Puis", title: "Matinée : Immersion", desc: "Longues dérives musicales de morceaux de plus de 30 minutes.", meta: true },
        { time: "12h00", title: "La table du chat", desc: "Chanson, electro douce, ambient léger." },
        { time: "14h00", title: "Les Transmissions du Dr. John", desc: "Archive aléatoire des Transmissions du Dr. John." },
        { time: "Puis", title: "Les chats sauvages", desc: "Le jour des enfants, c'est musique aléatoire !", meta: true, highlight: true },
        { time: "22h00", title: "Les Ondes du Chat Noir", desc: "Émissions, fictions, transmissions et formes radiophoniques choisies au hasard." },
      ],
    },
    {
      id: "thu",
      shortName: "Jeu",
      name: "Jeudi",
      summary: "Traversées matinales, cinéma pour les oreilles, Radio Gadin et fiction tardive.",
      slots: [
        { time: "00h00", title: "La Grande Nuit", desc: "Paysages sonores étendus, pièces immersives." },
        { time: "07h00", title: "Le Migou", desc: "Réveil café." },
        { time: "Puis", title: "Matinée : Traversées", desc: "Dérives musicales de morceaux de 5 à 10 minutes.", meta: true },
        { time: "12h00", title: "La table du chat", desc: "Chanson, electro douce, ambient léger." },
        { time: "14h00", title: "L'instinct mode", desc: "Chronique du vestiaire by Lady Em." },
        { time: "Puis", title: "Cinéma pour les oreilles", desc: "Bandes-son, paysages projetés, musiques d'images et dérives cinématiques.", meta: true, highlight: true },
        { time: "18h00", title: "Radio Gadin", desc: "Plongée dans le lore de Flash Dog Duke Silver", highlight: true },
        { time: "23h40", title: "Le Pseudodocumentaire de l'espace", desc: "Fiction sonore et dépression verte." },
      ],
    },
    {
      id: "fri",
      shortName: "Ven",
      name: "Vendredi",
      summary: "Fragments, indie de l'aprème et My Favorite Dead Radio.",
      slots: [
        { time: "00h00", title: "La Grande Nuit", desc: "Paysages sonores étendus, pièces immersives." },
        { time: "07h00", title: "Le Migou", desc: "Réveil café." },
        { time: "Puis", title: "Matinée : Fragments", desc: "Courtes dérives musicales de morceaux de 10 à 15 minutes.", meta: true },
        { time: "12h00", title: "La table du chat", desc: "Chanson, electro douce, ambient léger." },
        { time: "14h00", title: "L'instinct mode", desc: "Chronique du vestiaire by Lady Em." },
        { time: "Puis", title: "Indie de l'aprème", desc: "Indie rock, shoegaze, dream pop, etc.", meta: true, highlight: true },
        { time: "18h00", title: "My Favorite Dead Radio", desc: "Focus sur les affinités entre Drive with a dead girl et les lives de My Favourite Everything.", highlight: true },
        { time: "23h40", title: "L'Autre Nuit", desc: "Lectures sans centre et machines hésitantes." },
      ],
    },
    {
      id: "sat",
      shortName: "Sam",
      name: "Samedi",
      summary: "Antenne ouverte, Console-toi, synthèse analogique et focus When Day Chokes a Radio.",
      slots: [
        { time: "00h00", title: "La Grande Nuit", desc: "Paysages sonores étendus, pièces immersives." },
        { time: "07h00", title: "Les chats dans la courée", desc: "Le grand bazar du chat : surprises, bizarreries et sérendipité totale." },
        { time: "10h00", title: "Console-toi", desc: "ASMR de l'Atari et poésie 8-bit.", highlight: true },
        { time: "11h45", title: "Je ne sais pas jouer du synthé", desc: "On traverse la synthèse analogique par l'essai-erreur." },
        { time: "12h00", title: "La table du chat", desc: "Chanson, electro douce, ambient léger." },
        { time: "14h00", title: "L'instinct mode", desc: "Chronique du vestiaire by Lady Em." },
        { time: "Puis", title: "Les chats dans la courée", desc: "Le grand bazar du chat : surprises, bizarreries et sérendipité totale.", meta: true },
        { time: "18h00", title: "When Day Chokes a Radio", desc: "Focus Intégrale When Day Chokes The Night", highlight: true },
        { time: "23h40", title: "Le Pseudodocumentaire de l'espace", desc: "Fiction sonore (20 min)." },
      ],
    },
    {
      id: "sun",
      shortName: "Dim",
      name: "Dimanche",
      summary: "Réveil lent, Ondes du Chat Noir, siestes du chat et Messe Noire.",
      slots: [
        { time: "00h00", title: "La Grande Nuit", desc: "Paysages sonores étendus, pièces immersives." },
        { time: "07h00", title: "Le réveil lent du chat", desc: "Musiques calmes, flottantes et encore ensommeillées pour entrer doucement dans le jour." },
        { time: "12h00", title: "La table du chat", desc: "Chanson, electro douce, ambient léger." },
        { time: "14h00", title: "Les Ondes du Chat Noir", desc: "Émissions, fictions, transmissions et formes radiophoniques choisies au hasard." },
        { time: "15h00", title: "Les siestes du chat", desc: "Dream pop, lo-fi, ambient doux et formes suspendues pour laisser le dimanche s'étirer." },
        { time: "18h00", title: "Messe Noire", desc: "Rituel. Écho aux « messes » du dimanche matin : musiques dures, sombres, expérimentales, radicales.", highlight: true },
      ],
    },
  ];

  var SCHEDULE_DAY_ICONS = {
    mon: "fa-solid fa-moon",
    tue: "fa-solid fa-rocket",
    wed: "fa-solid fa-cat",
    thu: "fa-solid fa-film",
    fri: "fa-solid fa-car-side",
    sat: "fa-solid fa-user-astronaut",
    sun: "fa-solid fa-sun",
  };

  var SLOT_DECOR_BY_DAY = {
    thu: {
      "Radio Gadin": { badge: "Focus", kind: "focus-amber" },
    },
    fri: {
      "My Favorite Dead Radio": { badge: "Focus", kind: "focus-danger" },
    },
    sat: {
      "When Day Chokes a Radio": { badge: "Focus", kind: "focus-cyan" },
    },
    sun: {
      "Messe Noire": {
        badge: "Rituel",
        badgeIcon: "fa-solid fa-church",
        kind: "rituel",
      },
    },
  };

  function decorateScheduleDays(days) {
    return (days || []).map(function (day) {
      var dayDecor = SLOT_DECOR_BY_DAY[day.id] || {};
      return Object.assign({}, day, {
        icon: day.icon || SCHEDULE_DAY_ICONS[day.id] || "",
        slots: (day.slots || []).map(function (slot) {
          var extra = dayDecor[slot.title] || {};
          if (slot.title === "La table du chat" && !extra.icon && !slot.icon) {
            extra = Object.assign({ icon: "fa-solid fa-utensils" }, extra);
          }
          return Object.assign({}, slot, extra);
        }),
      });
    });
  }

  window.LCNContentData = {
    PRODUCERS: PRODUCERS,
    SHOWS: SHOWS,
    ABOUT_CHIPS: ABOUT_CHIPS,
    CONTRIBUTION_MODES: CONTRIBUTION_MODES,
    SCHEDULE_TIMELINE_DAYS: decorateScheduleDays(SCHEDULE_TIMELINE_DAYS),
  };
})();
