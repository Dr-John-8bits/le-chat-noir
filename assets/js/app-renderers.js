(function () {
  function createAppRenderers(deps) {
    const {
      state,
      COMMON,
      ABOUT_CHIPS,
      PRODUCERS,
      SHOWS,
      SCHEDULE_DAYS,
      escapeHtml,
      asString,
      parseYear,
      formatLocalDate,
      formatLocalTime,
      formatSinceLabel,
      getTrackMeta,
      getHistoryRowsSorted,
      getNewsYears,
      getNewsItemsForYear,
      getScheduleDayById,
      getCurrentDayId,
      getCurrentShowSlot,
      getHomeTodayState,
      getHistoryDisplay,
      buildMailtoHref,
      makeDomId,
      isLiveTrack,
    } = deps;

    function renderPage(route) {
      if (route === "accueil") return renderHomePage();
      if (route === "actualites") return renderNewsPage();
      if (route === "grille") return renderSchedulePage();
      if (route === "historique") return renderHistoryPage();
      if (route === "voix") return renderVoicesPage();
      return renderAboutPage();
    }

    function renderHomePage() {
      const today = getScheduleDayById(getCurrentDayId());

      return `
        <section class="page page--home" aria-labelledby="home-title">
          ${renderLiveMonitorCard()}
          <div class="page-grid page-grid--equal">
            <article class="page-card">
              <div class="section-heading">
                <p class="section-kicker">Derniers passages</p>
                <h1 class="section-title" id="home-title">Récemment diffusé</h1>
              </div>
              <ul class="recent-list">
                ${renderRecentList()}
              </ul>
              <button class="ghost-button home-cta" type="button" data-route-jump="historique">Afficher l'historique de diffusion</button>
            </article>

            <article class="page-card">
              <div class="section-heading">
                <p class="section-kicker">Aujourd'hui</p>
                <h2 class="section-title">Programme du ${escapeHtml(today.name.toLowerCase())}</h2>
                <p class="section-intro">${escapeHtml(today.summary)}</p>
              </div>
              <div class="today-focus-list">
                ${renderHomeTodayFocus(today)}
              </div>
              <button class="ghost-button home-cta" type="button" data-route-jump="grille">Voir la grille des programmes</button>
            </article>
          </div>
        </section>
      `;
    }

    function renderNewsPage() {
      const years = getNewsYears();
      const items = getNewsItemsForYear(state.selectedNewsYear);
      const visibleItems = items.slice(0, state.newsVisibleCount);
      const summaryText =
        `${visibleItems.length} actualité${visibleItems.length > 1 ? "s" : ""} affichée${visibleItems.length > 1 ? "s" : ""} sur ${items.length} pour ${state.selectedNewsYear}.`;
      const panelId = "news-panel";
      const activeTabId = makeDomId("news-tab", state.selectedNewsYear);

      return `
        <section class="page" aria-labelledby="page-title">
          <article class="page-card page-card--hero">
            <span class="page-eyebrow">Actualités</span>
            <h1 class="page-title" id="page-title">Chronologie de la station</h1>
            <p class="page-copy">Naissance du flux, mises en route, bascules techniques, voix nouvelles, lives et accidents : les étapes qui façonnent encore Le Chat Noir.</p>
          </article>

          <article class="page-card">
            <div class="section-heading">
              <p class="section-kicker">Archives</p>
              <h2 class="section-title">Par année</h2>
              <p class="section-intro">${escapeHtml(summaryText)}</p>
            </div>
            <div class="day-switcher" role="tablist" aria-label="Filtrer les actualités par année">
              ${years
                .map((year) => {
                  const isActive = year === state.selectedNewsYear;
                  const active = isActive ? " is-active" : "";
                  const tabId = makeDomId("news-tab", year);
                  return `<button class="pill-button pill-button--filter day-chip${active}" type="button" role="tab" id="${tabId}" aria-selected="${isActive ? "true" : "false"}" aria-controls="${panelId}" tabindex="${isActive ? "0" : "-1"}" data-news-year="${escapeHtml(year)}">${escapeHtml(year)}</button>`;
                })
                .join("")}
            </div>
            <section class="news-feed" id="${panelId}" role="tabpanel" aria-labelledby="${activeTabId}" aria-live="polite">
              ${visibleItems.length ? visibleItems.map(renderNewsItem).join("") : renderEmptyCard("Aucune actualité pour le moment", "Les nouvelles étapes de la station apparaîtront ici.")}
            </section>
            ${items.length > state.newsVisibleCount ? '<button class="ghost-button" type="button" data-news-more>Afficher plus</button>' : ""}
          </article>
        </section>
      `;
    }

    function renderSchedulePage() {
      const selectedDay = getScheduleDayById(state.selectedScheduleDay);
      const currentSlot = selectedDay.id === getCurrentDayId() ? getCurrentShowSlot(selectedDay) : null;
      const panelId = "schedule-panel";
      const activeTabId = makeDomId("schedule-tab", selectedDay.id);

      return `
        <section class="page" aria-labelledby="page-title">
          <article class="page-card page-card--hero">
            <span class="page-eyebrow">Grille des programmes</span>
            <h1 class="page-title" id="page-title">La semaine en clair</h1>
            <p class="page-copy">Les nuits, les matinées, les rendez-vous fixes, les focus et les dérives qui donnent son rythme à la radio. La grille reste fluide et indicative : un direct, un décalage ou une dérive peuvent déplacer l'antenne. C'est la grille de lancement de la radio : d'autres émissions viendront bientôt l'habiter, au fil des rencontres, des essais et des formes qui s'invitent à l'antenne.</p>
          </article>

          ${renderLiveMonitorCard()}

          <article class="page-card">
            <div class="day-switcher" role="tablist" aria-label="Choisir un jour de la grille">
              ${SCHEDULE_DAYS.map((day) => {
                const isActive = day.id === state.selectedScheduleDay;
                const active = isActive ? " is-active" : "";
                const tabId = makeDomId("schedule-tab", day.id);
                return `
                  <button class="pill-button pill-button--filter day-chip${active}" type="button" role="tab" id="${tabId}" aria-selected="${isActive ? "true" : "false"}" aria-controls="${panelId}" tabindex="${isActive ? "0" : "-1"}" data-schedule-day="${escapeHtml(day.id)}">
                    ${renderFaIcon(day.icon, "day-chip__icon")}
                    <span>${escapeHtml(day.shortName)}</span>
                  </button>
                `;
              }).join("")}
            </div>
            ${renderSchedulePanel(selectedDay, currentSlot, { panelId, activeTabId })}
          </article>
        </section>
      `;
    }

    function renderHistoryPage() {
      const display = getHistoryDisplay();
      const canLoadMore = display.totalCount > display.rows.length;

      return `
        <section class="page" aria-labelledby="page-title">
          <article class="page-card page-card--hero history-hero">
            <span class="page-eyebrow">Les archives de la radio</span>
            <h1 class="page-title" id="page-title">Historique de diffusion</h1>
            <p class="page-copy">Un titre t'a échappé pendant l'écoute ? Les dernières diffusions, en lecture chronologique, avec actualisation automatique et recherche par date et heure.</p>
            <div class="meta-row">
              <span class="meta-pill">Mise à jour toutes les 20 s</span>
              <span class="meta-pill">${escapeHtml(state.historyTimezoneLabel)}</span>
            </div>
            <div class="history-toolbar__copy">
              <p class="history-toolbar__label">${escapeHtml(display.label)}</p>
              <p class="history-toolbar__status">${escapeHtml(state.historyStatusText)}</p>
            </div>
            <div class="history-form">
              <label class="field-group">
                <span>Choisir une date</span>
                <input id="historyDayInput" type="date" value="${escapeHtml(state.historyDay)}" />
              </label>
              <label class="field-group">
                <span>Choisir une heure</span>
                <input id="historyTimeInput" type="time" value="${escapeHtml(state.historyTime)}" />
              </label>
              <button class="ghost-button history-search-button" type="button" data-history-search>Rechercher</button>
            </div>
          </article>

          <article class="page-card">
            <div class="history-table">
              <div class="history-table__head" aria-hidden="true">
                <span>Date</span>
                <span>Heure</span>
                <span>Titre</span>
                <span>Artiste</span>
                <span>Album</span>
                <span>Année</span>
              </div>
              <ul class="history-list history-list--table">
                ${renderHistoryRows(display.rows, "Aucun titre trouvé pour cette sélection.")}
              </ul>
            </div>
            ${canLoadMore ? '<div class="history-more-row"><button class="ghost-button" type="button" data-history-more>Afficher davantage</button></div>' : ""}
          </article>
        </section>
      `;
    }

    function renderVoicesPage() {
      return `
        <section class="page" aria-labelledby="page-title">
          <article class="page-card page-card--hero">
            <span class="page-eyebrow">Voix et formats</span>
            <h1 class="page-title" id="page-title">Les voix qui fabriquent la radio</h1>
            <p class="page-copy">Production, chroniques, émissions, captations et projets qui donnent une forme au territoire radiophonique du Chat Noir.</p>
          </article>

          <section class="page-section">
            <div class="section-heading">
              <p class="section-kicker">Voix</p>
              <h2 class="section-title">Présences à l'antenne</h2>
            </div>
            <div class="producers-grid">
              ${PRODUCERS.map(renderProducerCard).join("")}
            </div>
          </section>

          <section class="page-section">
            <div class="section-heading">
              <p class="section-kicker">Formats</p>
              <h2 class="section-title">Univers en rotation sur la radio</h2>
            </div>
            <div class="shows-grid">
              ${SHOWS.map(renderShowCard).join("")}
            </div>
          </section>
        </section>
      `;
    }

    function renderAboutPage() {
      return `
        <section class="page" aria-labelledby="page-title">
          <article class="page-card page-card--hero about-hero">
            <div class="about-hero__brand">
              <img class="about-hero__logo" src="assets/media/brand/logo.png" alt="Logo Le Chat Noir" loading="lazy" />
            </div>
            <div class="about-hero__copy">
              <span class="page-eyebrow">À propos</span>
              <h1 class="page-title" id="page-title">Un laboratoire radiophonique indépendant</h1>
              ${renderAboutLine("fa-solid fa-tower-broadcast", "Le Chat Noir est une webradio lilloise, artisanale, indépendante et autogérée, dédiée aux créations sonores et musicales.")}
              <div class="about-copy">
                ${renderAboutLine("fa-solid fa-wave-square", "Elle diffuse en continu des créations libres : paysages sonores, field recordings, expérimentations radiophoniques, émissions et musiques de tous horizons, sans cloisonnement rigide.")}
                ${renderAboutLine("fa-solid fa-sliders", "La radio assume une écoute lente entre fiction et réel, et respecte les dynamiques des œuvres sans compression globale imposée à l'antenne.")}
                ${renderAboutLine("fa-solid fa-hand-sparkles", "Le catalogue est le fruit d'une curation humaine, patiente et sensible : ici, pas d'algorithme de recommandation, pas d'IA, seulement des choix d'écoute, des essais, des intuitions et du temps passé à chercher.")}
                ${renderAboutLine("fa-solid fa-house-signal", "Tout est fait maison, hébergé, programmé et maintenu localement. Une radio de proximité cosmique, née dans un coin de la tête, tournée vers l'espace.")}
              </div>
              <div class="about-chip-row">
                ${ABOUT_CHIPS.map((chip) => `<span class="about-chip">${escapeHtml(chip)}</span>`).join("")}
              </div>
            </div>
          </article>

          <article class="page-card">
            <div class="section-heading">
              <p class="section-kicker">Contact</p>
              <h2 class="section-title">Nous écrire</h2>
              <p class="section-intro">Pour nous contacter, demander un retrait, signaler une correction ou poser une question.</p>
            </div>
            <div class="contact-cta-wrap">
              <a class="contact-cta" href="${escapeHtml(buildMailtoHref("Le Chat Noir - Contact", "Bonjour,\n\n"))}">
                <span>Nous écrire</span>
              </a>
            </div>
            <div class="about-copy about-copy--spaced">
              ${renderAboutLine("fa-solid fa-delete-left", "Si tu demandes le retrait d’un morceau, la suppression est faite dès réception du message.")}
              ${renderAboutLine("fa-solid fa-user-shield", "Aucune donnée personnelle n’est conservée au-delà du traitement de ta demande.")}
              ${renderAboutLine("fa-brands fa-instagram", `On n’est pas très actif·ves sur les produits de META, mais on tient un <a class="text-link" href="https://www.instagram.com/lechatnoirradio/" target="_blank" rel="noopener noreferrer">compte Instagram vaguement à jour</a>.`)}
            </div>
          </article>

          <article class="page-card">
            <div class="section-heading">
              <p class="section-kicker">Appel à contribution</p>
              <h2 class="section-title">Proposer une création</h2>
              <p class="section-intro">Émission, mix, podcast, rendez-vous régulier ou création sonore : tout ce qui peut habiter les ondes nous intéresse.</p>
            </div>
            <div class="contact-cta-wrap">
              <a class="contact-cta" href="${escapeHtml(buildMailtoHref("Le Chat Noir - Contact", "Bonjour,\n\n"))}">
                <span>Nous écrire</span>
              </a>
            </div>
            <div class="about-copy about-copy--spaced">
              ${renderAboutLine("fa-solid fa-microphone-lines", "Nous sommes ouvert·es à toutes les propositions d’émission, de mix, de podcast ou de création sonore, à condition que tu détiennes les droits d’auteur sur tout ce que tu proposes et que les œuvres puissent être diffusées librement dans un cadre non commercial. Pas d’AI slop, pas de création générée par IA : uniquement des créations pensées, composées et portées par des humain·es.")}
              ${renderAboutLine("fa-solid fa-shield-heart", "Nous ne diffuserons pas de contenus haineux, discriminatoires, fascistes, masculinistes, racistes, LGBTQIA+phobes ou assimilés : la radio reste un espace d’écoute safe.")}
              ${renderAboutLine("fa-solid fa-calendar-days", "Nous cherchons aussi tout particulièrement un rendez-vous sonore régulier, hebdomadaire ou mensuel.")}
              ${renderAboutLine("fa-solid fa-ear-listen", "Nous écoutons tout ce qui nous est envoyé, sans garantie de diffusion.")}
            </div>
            <div class="page-grid page-grid--equal about-panels-grid">
              <article class="page-card page-card--subtle about-panel">
                <h3 class="subsection-title">Ce que tu peux envoyer</h3>
                <p>Créations sonores, field recordings, documentaires déviants, fictions radiophoniques, paysages, bruits, silences, fragments ou autres choses difficiles à classer. Si tu hésites à savoir si ça rentre, c’est probablement que oui.</p>
              </article>
              <article class="page-card page-card--subtle about-panel">
                <h3 class="subsection-title">Repères techniques</h3>
                <ul class="card-list">
                  <li>Durée libre, avec un repère de 3 à 60 minutes.</li>
                  <li>Formats acceptés : WAV, AIFF, FLAC ou MP3.</li>
                  <li>Stéréo ou mono, langue libre.</li>
                </ul>
              </article>
              <article class="page-card page-card--subtle about-panel">
                <h3 class="subsection-title">Si la création est retenue</h3>
                <ul class="card-list">
                  <li>Diffusion à l’antenne et intégration à la programmation.</li>
                  <li>Possibilité d’être rejouée et archivée.</li>
                  <li>Pas besoin d’être “pro”, ni même “abouti” : on cherche des gestes sincères, des tentatives, des recherches sonores et des ratés intéressants.</li>
                </ul>
              </article>
              <article class="page-card page-card--subtle about-panel">
                <h3 class="subsection-title">Ce qu’il faut envoyer</h3>
                <ul class="card-list">
                  <li>La création sonore elle-même.</li>
                  <li>Un titre.</li>
                  <li>Ton nom ou ton pseudonyme.</li>
                  <li>Une photo ou un visuel qui te représente.</li>
                  <li>Une courte description du principe de l’émission ou de la proposition.</li>
                </ul>
              </article>
            </div>
          </article>

          <article class="page-card mentions-block">
            <div class="section-heading">
              <p class="section-kicker">Mentions & confidentialité</p>
              <h2 class="section-title">Cadre de diffusion</h2>
            </div>
            <div class="about-copy mentions-flat">
              ${renderAboutLine("fa-solid fa-pen-nib", '<strong class="mentions-label">Éditeur du site.</strong> Le site Le Chat Noir Radio est édité et maintenu par un particulier, hébergé à titre non commercial sur un serveur personnel.')}
              ${renderAboutLine("fa-solid fa-wave-square", '<strong class="mentions-label">Contenu et diffusion.</strong> Tous les morceaux diffusés sont des œuvres libres de droits ou créées par leurs auteur·ices respectif·ves, dans le respect de leurs choix de diffusion. Si tu constates une erreur ou une diffusion non souhaitée, signale-la par le bouton de contact.')}
              ${renderAboutLine("fa-solid fa-user-shield", '<strong class="mentions-label">Données personnelles.</strong> Le site ne trace pas les visiteurs. Les seules données collectées sont celles que tu fournis volontairement pour nous écrire ; elles servent uniquement à répondre à ta demande et ne sont ni stockées ni partagées. Les statistiques d’écoute sont agrégées et anonymes.')}
              ${renderAboutLine("fa-solid fa-code-branch", '<strong class="mentions-label">Open source.</strong> L’intégralité de la webradio repose sur des outils open source comme Ubuntu, Icecast et Liquidsoap, et nous encourageons chaleureusement le soutien à cette communauté qui rend cette aventure possible.')}
              ${renderAboutLine("fa-solid fa-circle-info", '<strong class="mentions-label">Responsabilité.</strong> L’éditeur ne saurait être tenu responsable d’une interruption temporaire du flux, ni de tout dommage indirect lié à l’usage du site ou à la diffusion en ligne.')}
            </div>
          </article>

        </section>
      `;
    }

    function renderRecentList() {
      const rows = getHistoryRowsSorted().slice(0, 5);
      if (!rows.length) {
        return '<li class="history-empty">Les derniers titres apparaîtront ici dès que le CSV est chargé.</li>';
      }

      return rows
        .map((row) => {
          const title = asString(row.title) || "(sans titre)";
          const meta = getTrackMeta(row);
          return `
            <li class="recent-item">
              <span class="recent-time">${escapeHtml(row.localTime || formatLocalTime(row.tsIso))}</span>
              <strong class="recent-title">${escapeHtml(title)}</strong>
              <span class="recent-meta">${escapeHtml(meta || "Métadonnées partielles")}</span>
            </li>
          `;
        })
        .join("");
    }

    function renderHomeTodayFocus(day) {
      const todayState = getHomeTodayState(day);

      return todayState.rows
        .map((slot) => {
          const isCurrent = todayState.currentSlot === slot;
          return `
            <article class="${getProgramItemClasses("today-focus", slot)}${isCurrent ? " is-current-slot" : ""}">
              <div class="today-focus__top">
                <span class="today-focus__time${slot.meta ? " is-meta" : ""}">${escapeHtml(slot.time)}</span>
                <div class="program-badges">
                  ${buildCurrentBadge(isCurrent)}
                  ${buildProgramBadge(slot)}
                </div>
              </div>
              <div class="today-focus__title-row">
                ${renderFaIcon(slot.icon, "program-icon")}
                <strong class="today-focus__title">${escapeHtml(slot.title)}</strong>
              </div>
              <p class="today-focus__desc">${escapeHtml(slot.desc)}</p>
            </article>
          `;
        })
        .join("");
    }

    function renderNewsItem(item) {
      return `
        <article class="news-card">
          <p class="news-date">${escapeHtml(item.dateLabel || item.date || "")}</p>
          <div class="news-copy">
            <h2 class="news-title">${escapeHtml(item.title || "")}</h2>
            <p class="news-lead">${renderNewsField(item, "lead")}</p>
            <p class="news-body">${renderNewsField(item, "body")}</p>
          </div>
        </article>
      `;
    }

    function renderSchedulePanel(day, currentSlot, options = {}) {
      const todayId = getCurrentDayId();
      const currentShowAside =
        day.id === todayId && !hasLiveTakeover() && state.currentShowLoaded && state.currentShow.show && !currentSlot
          ? `
            <div class="schedule-live-state">
              ${buildCurrentBadge(true)}
              <p class="schedule-live-note">${escapeHtml(state.currentShow.show)}${state.currentShow.isLive ? " · hors grille" : ""}</p>
            </div>
          `
          : "";

      return `
        <article class="schedule-card" id="${escapeHtml(options.panelId || "schedule-panel")}" role="tabpanel" aria-labelledby="${escapeHtml(options.activeTabId || "")}">
          <div class="schedule-day-head">
            <div class="schedule-day-copy">
              <div class="schedule-day-title-row">
                <span class="schedule-day-icon">${renderFaIcon(day.icon, "schedule-day-fa")}</span>
                <h2 class="schedule-day-title">${escapeHtml(day.name)}</h2>
              </div>
              <p class="schedule-day-summary">${escapeHtml(day.summary)}</p>
              <p class="schedule-day-note">Grille fluide, donnée à titre indicatif. Un direct, un décalage ou une dérive peuvent déplacer l'antenne.</p>
            </div>
            <div class="schedule-day-side">${currentShowAside}</div>
          </div>
          <div class="schedule-list">
            ${day.slots
              .map((slot) => {
                const isCurrent = currentSlot === slot;
                return `
                  <article class="${getProgramItemClasses("schedule-item", slot)}${isCurrent ? " is-current-slot" : ""}">
                    <div class="schedule-item__top">
                      <span class="schedule-item__time${slot.meta ? " is-meta" : ""}">${escapeHtml(slot.time)}</span>
                      <div class="program-badges">
                        ${buildCurrentBadge(isCurrent)}
                        ${buildProgramBadge(slot)}
                      </div>
                    </div>
                    <div class="schedule-item__title-row">
                      ${renderFaIcon(slot.icon, "program-icon")}
                      <strong class="schedule-item__title">${escapeHtml(slot.title)}</strong>
                    </div>
                    <p class="schedule-item__desc">${escapeHtml(slot.desc)}</p>
                  </article>
                `;
              })
              .join("")}
          </div>
        </article>
      `;
    }

    function renderHistoryRows(rows, emptyText) {
      if (!rows.length) {
        return `<li class="history-empty">${escapeHtml(emptyText)}</li>`;
      }

      return rows
        .map((row) => {
          const title = asString(row.title) || "(sans titre)";
          const artist = asString(row.artist) || "—";
          const album = asString(row.album) || "—";
          const year = parseYear(row.year) || "—";
          return `
            <li class="history-row">
              <span class="history-cell" data-label="Date">
                <span class="history-cell__label">Date</span>
                <span class="history-cell__value">${escapeHtml(row.localDate || formatLocalDate(row.tsIso))}</span>
              </span>
              <span class="history-cell" data-label="Heure">
                <span class="history-cell__label">Heure</span>
                <span class="history-cell__value">${escapeHtml(row.localTime || formatLocalTime(row.tsIso))}</span>
              </span>
              <span class="history-cell" data-label="Titre">
                <span class="history-cell__label">Titre</span>
                <strong class="history-cell__value history-cell__value--strong">${escapeHtml(title)}</strong>
              </span>
              <span class="history-cell" data-label="Artiste">
                <span class="history-cell__label">Artiste</span>
                <span class="history-cell__value">${escapeHtml(artist)}</span>
              </span>
              <span class="history-cell" data-label="Album">
                <span class="history-cell__label">Album</span>
                <span class="history-cell__value">${escapeHtml(album)}</span>
              </span>
              <span class="history-cell" data-label="Année">
                <span class="history-cell__label">Année</span>
                <span class="history-cell__value">${escapeHtml(year)}</span>
              </span>
            </li>
          `;
        })
        .join("");
    }

    function renderProducerCard(producer) {
      return `
        <article class="producer-card">
          <img class="producer-photo" src="${escapeHtml(producer.image)}" alt="${escapeHtml(`Portrait de ${producer.name}`)}" loading="lazy" />
          <div>
            <p class="producer-role">${escapeHtml(producer.role)}</p>
            <h3 class="producer-name">${escapeHtml(producer.name)}</h3>
            <p class="producer-bio">${escapeHtml(producer.bio)}</p>
          </div>
        </article>
      `;
    }

    function renderShowCard(show) {
      let actionHtml = "";

      if (show.href) {
        actionHtml = `
          <a class="show-action" href="${escapeHtml(show.href)}" target="_blank" rel="noopener">
            ${renderShowActionLabel(show)}
          </a>
        `;
      } else if (show.actionLabel || (Array.isArray(show.actionLabelLines) && show.actionLabelLines.length)) {
        actionHtml = `<p class="show-action show-action--static">${renderShowActionLabel(show)}</p>`;
      }

      return `
        <article class="show-card">
          <img class="show-cover" src="${escapeHtml(show.image)}" alt="${escapeHtml(`Visuel ${show.title}`)}" loading="lazy" />
          <div class="show-body">
            <p class="show-meta">${escapeHtml(show.meta)}</p>
            <h3 class="show-title">${escapeHtml(show.title)}</h3>
            <p class="card-text">${escapeHtml(show.text)}</p>
            ${actionHtml}
          </div>
        </article>
      `;
    }

    function renderShowActionLabel(show) {
      if (COMMON.renderShowActionLabel) {
        return COMMON.renderShowActionLabel(show);
      }

      if (Array.isArray(show.actionLabelLines) && show.actionLabelLines.length) {
        return show.actionLabelLines.map((line) => `<span>${escapeHtml(line)}</span>`).join("");
      }

      return `<span>${escapeHtml(show.actionLabel || "")}</span>`;
    }

    function renderAboutLine(iconClass, htmlText) {
      return `
        <p class="about-line">
          ${renderFaIcon(iconClass, "about-fa")}
          <span>${htmlText}</span>
        </p>
      `;
    }

    function renderNewsField(item, fieldName) {
      const htmlFieldName = `${fieldName}Html`;
      if (item && typeof item[htmlFieldName] === "string" && item[htmlFieldName].trim()) {
        return item[htmlFieldName];
      }
      return escapeHtml((item && item[fieldName]) || "");
    }

    function renderEmptyCard(title, body) {
      return `
        <article class="news-card">
          <div class="news-copy">
            <h2 class="news-title">${escapeHtml(title)}</h2>
            <p class="news-body">${escapeHtml(body)}</p>
          </div>
        </article>
      `;
    }

    function hasLiveTakeover() {
      return Boolean(state.currentShow && state.currentShow.isLive) || isLiveTrack(state.currentTrack);
    }

    function getProgramItemClasses(baseClass, slot) {
      const classes = [baseClass];
      if (slot && slot.meta) classes.push("is-meta");
      if (slot && slot.highlight) classes.push("is-highlight");
      if (slot && slot.kind) classes.push(slot.kind);
      return classes.join(" ");
    }

    function buildProgramBadge(slot) {
      if (!slot || !slot.badge) return "";
      return `
        <span class="program-badge">
          ${renderFaIcon(slot.badgeIcon, "program-badge-icon")}
          <span>${escapeHtml(slot.badge)}</span>
        </span>
      `;
    }

    function buildCurrentBadge(isCurrent) {
      if (!isCurrent) return "";
      return '<span class="current-pill" aria-label="À l\'antenne"><span class="current-pill-dot" aria-hidden="true"></span><span>À l\'antenne</span></span>';
    }

    function buildLivePill() {
      return '<span class="live-pill" aria-label="ON AIR"><span class="live-pill-dot" aria-hidden="true"></span><span>ON AIR</span></span>';
    }

    function renderFaIcon(className, extraClassName = "") {
      if (!className || !COMMON.faIcon) return "";
      return COMMON.faIcon(className, extraClassName);
    }

    function renderLiveMonitorCard() {
      if (!hasLiveTakeover()) return "";

      const liveShowTitle = asString(state.currentShow.show) || "Direct à l'antenne";
      const liveTrackTitle = asString(state.currentTrack.title) || "Titre en direct";
      const liveTrackMeta = getTrackMeta(state.currentTrack) || "Métadonnées partielles ou indisponibles.";
      const liveSince = formatSinceLabel(state.currentShow.since) || "Prise d’antenne en direct réellement diffusée en ce moment.";

      return `
        <article class="page-card live-monitor-card">
          <div class="live-monitor-head">
            <div class="live-monitor-head__copy">
              <p class="section-kicker">Direct</p>
              <h2 class="live-monitor-title">${escapeHtml(liveShowTitle)}</h2>
            </div>
            <div class="live-monitor-badge-slot">
              ${buildLivePill()}
            </div>
          </div>
          <div class="live-monitor-current-block">
            <h3 class="live-monitor-title-track">${escapeHtml(liveTrackTitle)}</h3>
            <p class="live-monitor-meta">${escapeHtml(liveTrackMeta)}</p>
          </div>
          <p class="live-monitor-note">${escapeHtml(liveSince)}</p>
        </article>
      `;
    }

    return {
      renderPage,
    };
  }

  window.LCNAppRenderers = createAppRenderers;
})();
