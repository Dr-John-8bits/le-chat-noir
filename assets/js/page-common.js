(function () {
  var CONTACT_EMAIL = "radio@lechatnoirradio.fr";
  var DISPLAY_TIME_ZONE = "Europe/Paris";
  var SHOW_NAME_ALIASES = {
    "instinct mode": "l instinct mode",
    "l instinct mode": "l instinct mode",
    "autre nuit": "l autre nuit",
    "l autre nuit": "l autre nuit",
    "pseudodocumentaire de l espace": "le pseudodocumentaire de l espace",
    "le pseudodocumentaire de l espace": "le pseudodocumentaire de l espace",
    "fragments": "matinee fragments",
    "matinee fragments": "matinee fragments",
    "trajectoires": "matinee trajectoires",
    "matinee trajectoires": "matinee trajectoires",
    "immersion": "matinee immersion",
    "matinee immersion": "matinee immersion",
    "traversees": "matinee traversees",
    "matinee traversees": "matinee traversees",
    "transmissions du dr john": "les transmissions du dr john",
    "les transmissions du dr john": "les transmissions du dr john",
    "ondes du chat noir": "les ondes du chat noir",
    "les ondes du chat noir": "les ondes du chat noir",
  };

  var ICONS = {
    news:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M5 6.5A2.5 2.5 0 0 1 7.5 4H19v11.5a2.5 2.5 0 0 1-2.5 2.5H7.5A2.5 2.5 0 0 1 5 15.5z"></path><path d="M5 7h10"></path><path d="M8 11h8"></path><path d="M8 14.5h6"></path></svg>',
    schedule:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="3"></rect><path d="M8 3v4"></path><path d="M16 3v4"></path><path d="M4 10h16"></path><path d="M8 14h3"></path></svg>',
    voices:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M12 15a4 4 0 0 0 4-4V7a4 4 0 1 0-8 0v4a4 4 0 0 0 4 4z"></path><path d="M5 11a7 7 0 0 0 14 0"></path><path d="M12 18v3"></path><path d="M8.5 21h7"></path></svg>',
    about:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="12" cy="4.5" r="1.3" fill="currentColor" stroke="none"></circle><path d="M12 6.5v13"></path><path d="m8.4 19.5 3.6-6.2 3.6 6.2"></path><path d="M7.1 9.3a6.9 6.9 0 0 1 9.8 0"></path><path d="M4.3 6.6a10.8 10.8 0 0 1 15.4 0"></path></svg>',
    external:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M14 5h5v5"></path><path d="M10 14 19 5"></path><path d="M19 13v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4"></path></svg>',
    contact:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M5 7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 16.5z"></path><path d="m7 8 5 4 5-4"></path></svg>',
  };

  var FA_SVG_PATHS = {
    "fa-arrow-up": '<path d="M12 19V5"></path><path d="m6 11 6-6 6 6"></path>',
    "fa-calendar-days":
      '<rect x="3.5" y="5" width="17" height="15" rx="3"></rect><path d="M8 3.5v3"></path><path d="M16 3.5v3"></path><path d="M3.5 10h17"></path><path d="M8 13.5h3"></path><path d="M13 13.5h3"></path><path d="M8 17h3"></path>',
    "fa-car-side":
      '<path d="M5 14.5 7.2 9.8A2 2 0 0 1 9 8.6h6a2 2 0 0 1 1.8 1.2l2.2 4.7"></path><path d="M4 14.5h16v3a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 17.5z"></path><circle cx="7.5" cy="17" r="1.2" fill="currentColor" stroke="none"></circle><circle cx="16.5" cy="17" r="1.2" fill="currentColor" stroke="none"></circle>',
    "fa-cat":
      '<path d="M7 9V5.5l2.6 1.9L12 5.7l2.4 1.7L17 5.5V9"></path><path d="M5.3 10.4C5.3 7.9 7.9 6 12 6s6.7 1.9 6.7 4.4c0 2-1.1 3.8-2.9 4.9V18a1 1 0 0 1-1.6.8L12 17.2l-2.2 1.6a1 1 0 0 1-1.6-.8v-2.7c-1.8-1.1-2.9-2.9-2.9-4.9z"></path><circle cx="9.4" cy="11.8" r="0.7" fill="currentColor" stroke="none"></circle><circle cx="14.6" cy="11.8" r="0.7" fill="currentColor" stroke="none"></circle><path d="M10.1 14.3c1.1.8 2.7.8 3.8 0"></path>',
    "fa-church":
      '<path d="M6.5 20V9.5L12 6l5.5 3.5V20"></path><path d="M12 6V3.5"></path><path d="M10.8 4.8h2.4"></path><path d="M9 20v-4.2a3 3 0 0 1 6 0V20"></path><path d="M8.5 11.5h7"></path>',
    "fa-circle-info":
      '<circle cx="12" cy="12" r="8.5"></circle><path d="M12 10.5V16"></path><circle cx="12" cy="7.5" r="0.85" fill="currentColor" stroke="none"></circle>',
    "fa-code-branch":
      '<circle cx="7" cy="6" r="1.5" fill="currentColor" stroke="none"></circle><circle cx="17" cy="18" r="1.5" fill="currentColor" stroke="none"></circle><circle cx="17" cy="8" r="1.5" fill="currentColor" stroke="none"></circle><path d="M8.5 6H12a3 3 0 0 1 3 3v0"></path><path d="M8.5 6H12a3 3 0 0 1 3 3v6"></path><path d="M15 15a3 3 0 0 0 3 3"></path>',
    "fa-delete-left":
      '<path d="M10.5 7h7a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-7L4.5 12z"></path><path d="m12 10 4 4"></path><path d="m16 10-4 4"></path>',
    "fa-ear-listen":
      '<path d="M8.5 14.5c0-4.2 1.8-7 5.2-7 2.4 0 4.3 1.7 4.3 4.1 0 2.6-1.7 3.8-3.4 5.1-.9.7-1.6 1.5-1.6 2.8"></path><path d="M8.6 17.5a2.9 2.9 0 0 0 5 2"></path><path d="M5 10.8a5.2 5.2 0 0 1 1.8-3.9"></path><path d="M4 14a5.8 5.8 0 0 1 .3-1.8"></path>',
    "fa-film":
      '<rect x="4" y="5" width="16" height="14" rx="2.5"></rect><path d="M8 5v14"></path><path d="M16 5v14"></path><path d="M4 9h4"></path><path d="M16 9h4"></path><path d="M4 15h4"></path><path d="M16 15h4"></path>',
    "fa-hand-sparkles":
      '<path d="M12.2 4.5 13 6.3l1.8.8-1.8.8-.8 1.8-.8-1.8-1.8-.8 1.8-.8z" fill="currentColor" stroke="none"></path><path d="M6.8 13.5V10.8a1 1 0 0 1 2 0v1.4"></path><path d="M8.8 12.5V9.7a1 1 0 0 1 2 0v2"></path><path d="M10.8 12V9.9a1 1 0 0 1 2 0V12"></path><path d="M12.8 12.5v-1.3a1 1 0 0 1 2 0v3.1"></path><path d="M6.8 13.5v1.8c0 2.1 1.7 3.7 3.8 3.7h2.6c2.1 0 3.8-1.6 3.8-3.7v-2.1a2.7 2.7 0 0 0-2.7-2.7h-.5"></path>',
    "fa-house-signal":
      '<path d="m4.5 11 7.5-6 7.5 6"></path><path d="M6.5 10.5V19h11V10.5"></path><path d="M9.5 19v-4.5h5V19"></path><path d="M18.8 6.8a3.4 3.4 0 0 1 0 4.8"></path><path d="M17.1 8.5a1.1 1.1 0 0 1 0 1.6"></path>',
    "fa-instagram":
      '<rect x="4.5" y="4.5" width="15" height="15" rx="4"></rect><circle cx="12" cy="12" r="3.4"></circle><circle cx="16.4" cy="7.8" r="0.9" fill="currentColor" stroke="none"></circle>',
    "fa-microphone-lines":
      '<path d="M12 15a3.2 3.2 0 0 0 3.2-3.2V7.7a3.2 3.2 0 1 0-6.4 0v4.1A3.2 3.2 0 0 0 12 15z"></path><path d="M6.5 11.8a5.5 5.5 0 0 0 11 0"></path><path d="M12 17.3V20"></path><path d="M9 20h6"></path><path d="M18.8 9.2h1.7"></path><path d="M18.4 12h2.1"></path><path d="M18.8 14.8h1.7"></path>',
    "fa-moon": '<path d="M19.5 14.6A8.5 8.5 0 1 1 9.4 4.5a6.8 6.8 0 1 0 10.1 10.1z"></path>',
    "fa-pen-nib":
      '<path d="m12 4 6 6-6 10L6 10z"></path><path d="M12 4v7"></path><path d="M9 14h6"></path><circle cx="12" cy="11" r="1" fill="currentColor" stroke="none"></circle>',
    "fa-rocket":
      '<path d="M14.8 4.5c2.6 0 4.7 2.1 4.7 4.7 0 4.2-4.9 8-7.2 9.5-1.5-2.3-5.3-7.1-5.3-9.2 0-2.8 3-5 7.8-5z"></path><path d="m8.6 14.6-3.1 3.1"></path><path d="m8 10.1-3.5-.8 2.3-2.3 1.2 3.1"></path><circle cx="14.6" cy="9.4" r="1.2"></circle>',
    "fa-shield-heart":
      '<path d="M12 20c4.8-1.7 7-5.2 7-9.8V5.7L12 3 5 5.7v4.5C5 14.8 7.2 18.3 12 20z"></path><path d="m12 14.8-2.2-2.2a1.7 1.7 0 0 1 2.4-2.4l.3.3.3-.3a1.7 1.7 0 0 1 2.4 2.4z" fill="currentColor" stroke="none"></path>',
    "fa-sliders":
      '<path d="M6 5v14"></path><path d="M12 5v14"></path><path d="M18 5v14"></path><circle cx="6" cy="9" r="1.8" fill="currentColor" stroke="none"></circle><circle cx="12" cy="15" r="1.8" fill="currentColor" stroke="none"></circle><circle cx="18" cy="10.5" r="1.8" fill="currentColor" stroke="none"></circle>',
    "fa-sun":
      '<circle cx="12" cy="12" r="3.6"></circle><path d="M12 2.8v2.1"></path><path d="M12 19.1v2.1"></path><path d="m5.5 5.5 1.5 1.5"></path><path d="m17 17 1.5 1.5"></path><path d="M2.8 12h2.1"></path><path d="M19.1 12h2.1"></path><path d="m5.5 18.5 1.5-1.5"></path><path d="m17 7 1.5-1.5"></path>',
    "fa-tower-broadcast":
      '<path d="M12 6v13"></path><path d="m9.2 19 2.8-6 2.8 6"></path><path d="M8.2 8.6a5.5 5.5 0 0 1 7.6 0"></path><path d="M6.1 6.4a8.5 8.5 0 0 1 11.8 0"></path>',
    "fa-user-astronaut":
      '<circle cx="12" cy="10" r="4.6"></circle><path d="M8.6 7.8V5.6l1.7 1.1"></path><path d="M15.4 7.8V5.6l-1.7 1.1"></path><path d="M8.2 18v-.8a3.8 3.8 0 0 1 7.6 0v.8"></path>',
    "fa-user-shield":
      '<circle cx="9.2" cy="8.4" r="2.4"></circle><path d="M5.7 16.8a3.8 3.8 0 0 1 7 0"></path><path d="M16.5 20c3-1 4.5-3.2 4.5-6V10.8l-4.5-1.8-4.5 1.8V14c0 2.8 1.5 5 4.5 6z"></path>',
    "fa-utensils":
      '<path d="M6.5 4.5v7"></path><path d="M4.5 4.5v4.2a2 2 0 0 0 4 0V4.5"></path><path d="M6.5 11.5V19"></path><path d="M16 4.5c-1.6 0-2.8 1.3-2.8 2.9v4.1H16V19"></path>',
    "fa-wave-square":
      '<path d="M3.5 13h3l1.6-6 2.8 10 2.3-8 1.6 4H20.5"></path>'
  };

  function asString(value) {
    if (typeof value !== "string") return "";
    return value.trim();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function extractFaIconName(className) {
    var tokens = asString(className).split(/\s+/);
    for (var i = 0; i < tokens.length; i += 1) {
      var token = tokens[i];
      if (!/^fa-[a-z0-9-]+$/.test(token)) continue;
      if (token === "fa-solid" || token === "fa-regular" || token === "fa-brands") continue;
      return token;
    }
    return "";
  }

  function buildInlineSvgIcon(paths, classes) {
    if (!paths) return "";
    return (
      '<svg class="' +
      escapeHtml(classes) +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      paths +
      "</svg>"
    );
  }

  function faIcon(className, extraClassName) {
    var iconName = extractFaIconName(className);
    if (!iconName) return "";
    var paths = FA_SVG_PATHS[iconName];
    if (!paths) return "";
    var classes = "svg-icon";
    if (extraClassName) classes += " " + extraClassName;
    return buildInlineSvgIcon(paths, classes);
  }

  function icon(name) {
    return ICONS[name] || "";
  }

  function fillIconSlots(scope) {
    var root = scope || document;
    root.querySelectorAll(".icon-slot[data-icon]").forEach(function (node) {
      var name = node.getAttribute("data-icon");
      node.innerHTML = icon(name);
    });
  }

  function markActiveNav() {
    var pageId = asString(document.body && document.body.getAttribute("data-page"));
    document.querySelectorAll("[data-page-link]").forEach(function (link) {
      var route = link.getAttribute("data-page-link");
      link.classList.toggle("is-active", route === pageId);
    });
  }

  function buildMailtoHref(action) {
    return (
      "mailto:" +
      CONTACT_EMAIL +
      "?subject=" +
      encodeURIComponent(action.subject) +
      "&body=" +
      encodeURIComponent(action.body)
    );
  }

  function renderShowActionLabel(show) {
    if (show && Array.isArray(show.actionLabelLines) && show.actionLabelLines.length) {
      return (
        '<span class="show-action-label">' +
        show.actionLabelLines
          .map(function (line) {
            return "<span>" + escapeHtml(line) + "</span>";
          })
          .join("") +
        "</span>"
      );
    }
    return "<span>" + escapeHtml(show && show.actionLabel ? show.actionLabel : "") + "</span>";
  }

  function getCurrentDayId() {
    try {
      var weekday = new Intl.DateTimeFormat("en-US", {
        timeZone: DISPLAY_TIME_ZONE,
        weekday: "short",
      })
        .format(new Date())
        .slice(0, 3)
        .toLowerCase();
      var weekdayMap = {
        sun: "sun",
        mon: "mon",
        tue: "tue",
        wed: "wed",
        thu: "thu",
        fri: "fri",
        sat: "sat",
      };
      return weekdayMap[weekday] || "mon";
    } catch (error) {
      var map = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
      return map[new Date().getDay()] || "mon";
    }
  }

  function parseScheduleTimeLabel(rawValue) {
    var raw = asString(rawValue).toLowerCase();
    if (!raw) return null;
    var match = raw.match(/^(\d{1,2})\s*[h:]\s*(\d{2})$/);
    if (!match) return null;
    var hour = Number(match[1]);
    var minute = Number(match[2]);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return hour * 60 + minute;
  }

  function getCurrentLocalMinutes() {
    try {
      var parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: DISPLAY_TIME_ZONE,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(new Date());
      var map = {};
      parts.forEach(function (part) {
        if (part.type !== "literal") map[part.type] = part.value;
      });
      return Number(map.hour || 0) * 60 + Number(map.minute || 0);
    } catch (error) {
      var now = new Date();
      return now.getHours() * 60 + now.getMinutes();
    }
  }

  function getFirstString(source, keys) {
    if (!source || typeof source !== "object") return "";
    for (var i = 0; i < keys.length; i += 1) {
      var value = asString(source[keys[i]]);
      if (value) return value;
    }
    return "";
  }

  function normalizeComparableText(value) {
    var raw = asString(value).toLowerCase();
    if (!raw) return "";
    if (typeof raw.normalize === "function") {
      raw = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
    return raw
      .replace(/[’']/g, " ")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeShowName(value) {
    var normalized = normalizeComparableText(value);
    return SHOW_NAME_ALIASES[normalized] || normalized;
  }

  function parseBooleanish(value) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value > 0;
    var raw = normalizeComparableText(value);
    return raw === "true" || raw === "1" || raw === "yes" || raw === "oui";
  }

  function extractCurrentShow(payload) {
    var roots = [];
    if (payload && typeof payload === "object") roots.push(payload);
    if (payload && payload.current_show && typeof payload.current_show === "object") {
      roots.push(payload.current_show);
    }
    if (payload && payload.show && typeof payload.show === "object") {
      roots.push(payload.show);
    }

    var show = typeof payload === "string" ? asString(payload) : "";
    var kind = "";
    var isLive = false;
    var since = 0;

    roots.forEach(function (root) {
      if (!show) {
        show = getFirstString(root, ["show", "name", "title", "label"]);
      }
      if (!kind) {
        kind = getFirstString(root, ["kind", "show_kind", "type"]);
      }
      if (!since) {
        var nextSince = Number(root.since || root.started_at || root.startedAt || 0);
        if (Number.isFinite(nextSince) && nextSince > 0) since = nextSince;
      }
      if (!isLive) {
        isLive = parseBooleanish(root.is_live) || parseBooleanish(root.show_is_live) || kind === "live";
      }
    });

    return {
      show: show,
      kind: kind,
      isLive: isLive,
      since: since,
    };
  }

  function findCurrentScheduleSlot(day) {
    if (!day || !Array.isArray(day.slots) || !day.slots.length) return null;
    var currentMinutes = getCurrentLocalMinutes();
    var lastExplicitMinutes = null;
    var candidate = null;

    day.slots.forEach(function (slot, index) {
      var explicitMinutes = parseScheduleTimeLabel(slot && slot.time);
      if (explicitMinutes != null) {
        lastExplicitMinutes = explicitMinutes;
      }
      if (lastExplicitMinutes == null || lastExplicitMinutes > currentMinutes) return;
      if (
        !candidate ||
        lastExplicitMinutes > candidate.startMinutes ||
        (lastExplicitMinutes === candidate.startMinutes && index > candidate.index)
      ) {
        candidate = {
          slot: slot,
          index: index,
          startMinutes: lastExplicitMinutes,
        };
      }
    });

    return candidate ? candidate.slot : null;
  }

  function findScheduleSlotByShow(day, showName) {
    var normalizedShow = normalizeShowName(showName);
    if (!normalizedShow || !day || !Array.isArray(day.slots)) return null;
    var currentMinutes = getCurrentLocalMinutes();
    var lastExplicitMinutes = null;
    var matches = [];

    day.slots.forEach(function (slot, index) {
      var explicitMinutes = parseScheduleTimeLabel(slot && slot.time);
      if (explicitMinutes != null) {
        lastExplicitMinutes = explicitMinutes;
      }
      if (normalizeShowName(slot && slot.title) !== normalizedShow) return;
      matches.push({
        slot: slot,
        index: index,
        startMinutes: lastExplicitMinutes,
      });
    });

    if (!matches.length) return null;

    var activeMatches = matches.filter(function (match) {
      return typeof match.startMinutes !== "number" || match.startMinutes <= currentMinutes;
    });

    if (!activeMatches.length) {
      return matches[0].slot;
    }

    activeMatches.sort(function (left, right) {
      var leftMinutes = typeof left.startMinutes === "number" ? left.startMinutes : -1;
      var rightMinutes = typeof right.startMinutes === "number" ? right.startMinutes : -1;
      if (rightMinutes !== leftMinutes) return rightMinutes - leftMinutes;
      return right.index - left.index;
    });

    return activeMatches[0].slot;
  }

  function initPageChrome(scope) {
    fillIconSlots(scope || document);
    markActiveNav();
  }

  window.LCNPageCommon = {
    asString: asString,
    escapeHtml: escapeHtml,
    faIcon: faIcon,
    icon: icon,
    fillIconSlots: fillIconSlots,
    markActiveNav: markActiveNav,
    buildMailtoHref: buildMailtoHref,
    renderShowActionLabel: renderShowActionLabel,
    getCurrentDayId: getCurrentDayId,
    parseScheduleTimeLabel: parseScheduleTimeLabel,
    getCurrentLocalMinutes: getCurrentLocalMinutes,
    normalizeShowName: normalizeShowName,
    extractCurrentShow: extractCurrentShow,
    findCurrentScheduleSlot: findCurrentScheduleSlot,
    findScheduleSlotByShow: findScheduleSlotByShow,
    initPageChrome: initPageChrome,
  };
})();
