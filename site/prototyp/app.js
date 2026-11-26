(() => {
  "use strict";
  const { katalog, taxonomi } = window.AINAT;
  const demo = window.AINAT_DEMO;
  const STORAGE = "ainat-prototyp-v1";
  const fresh = () => ({ saved: [], joined: [], lessons: [], topics: [], meetings: [], replies: {}, tips: [], votes: [] });
  let local = fresh(), storageFailed = false;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE) || "null");
    if (stored && typeof stored === "object") {
      for (const key of ["saved", "joined", "lessons", "topics", "meetings", "tips", "votes"]) if (Array.isArray(stored[key])) local[key] = stored[key];
      if (stored.replies && typeof stored.replies === "object" && !Array.isArray(stored.replies)) local.replies = stored.replies;
    }
  } catch { storageFailed = true; }
  const persist = () => {
    try { localStorage.setItem(STORAGE, JSON.stringify(local)); return true; }
    catch { storageFailed = true; return false; }
  };
  const e = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fold = (value) => String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const $ = (id) => document.getElementById(id);
  const main = $("main");
  const dialog = $("dialog");
  const labels = { hem: "Översikt", resurser: "Resursbanken", pilot: "Indexeringspiloten", lektioner: "Lektionsbanken", forum: "Samtalsforum", traffar: "Träffas & prata", sparat: "Mitt hörn", om: "Om nätverket" };
  const categories = ["Kom igång", "Ämnen & undervisning", "Bedömning & lärande", "Skolutveckling", "Om nätverket"];
  const subjects = ["Svenska", "Engelska", "Matematik", "Bild", "Samhällskunskap", "Naturvetenskap", "Ämnesövergripande"];
  const stages = ["Förskola", "Åk 1–3", "Åk 4–6", "Åk 7–9", "Gymnasiet", "Vuxenutbildning"];
  const ui = { resource: { q: "", typ: "", teman: "", stadium: "", kostnad: "", count: 12 }, lesson: { q: "", mode: "", subject: "", stage: "" }, forum: { q: "", category: "" }, meetings: { view: "list", month: 8, year: 2026 }, savedTab: "sparat" };
  const icons = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
    library: '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="4" height="16" rx="1"/><path d="m16 5 4-1 3 15-4 1Z"/><path d="M4 8h3m4 8h2"/>',
    book: '<path d="M12 5C8 2 4 3 2 4v15c3-1 6-1 10 2 4-3 7-3 10-2V4c-2-1-6-2-10 1Zm0 0v16"/>',
    chat: '<path d="M21 11a8 8 0 0 1-8 8H7l-5 3 2-6a8 8 0 0 1-1-5 9 9 0 0 1 18 0Z"/><path d="M7 9h10M7 13h6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-13 4h2m4 0h2m-8 3h2"/>',
    bookmark: '<path d="M6 3h12v18l-6-4-6 4Z"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
    external: '<path d="M14 3h7v7m0-7L10 14m0-10H4a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h15a1 1 0 0 0 1-1v-6"/>',
    search: '<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    plus: '<path d="M12 4v16M4 12h16"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    people: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5"/>',
    video: '<rect x="2" y="5" width="14" height="14" rx="2"/><path d="m16 10 6-4v12l-6-4"/>',
    spark: '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.1M3 12h.1M3 18h.1"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    leaf: '<path d="M20 3C8 2 3 7 4 13a7 7 0 0 0 11 6c5-4 5-10 5-16ZM3 22 15 10"/>',
    shield: '<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Zm-5 9 3 3 6-6"/>',
  };
  const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.spark}</svg>`;
  const arrow = () => icon("arrow");
  const avatar = (person, extra = "") => `<span class="avatar ${e(person.color || "sage")} ${extra}" aria-hidden="true">${e(person.initials || "Du")}</span>`;
  const link = (href, text) => `<a class="text-link" href="${e(href)}">${e(text)} ${arrow()}</a>`;
  const saved = (kind, id) => local.saved.includes(`${kind}:${id}`);
  const save = (kind, id, title) => `<button class="icon-button save-button" data-action="save" data-kind="${kind}" data-id="${e(id)}" aria-label="${saved(kind, id) ? "Ta bort från sparat" : "Spara"}: ${e(title)}" aria-pressed="${saved(kind, id)}" title="${saved(kind, id) ? "Sparad" : "Spara"}">${icon("bookmark")}</button>`;
  const allLessons = () => [...local.lessons, ...demo.lessons];
  const allTopics = () => [...local.topics, ...demo.topics];
  const allMeetings = () => [...local.meetings, ...demo.meetings].sort((a, b) => `${a.date}T${a.start}`.localeCompare(`${b.date}T${b.start}`));
  const replies = (topic) => [...topic.replies, ...(local.replies[topic.id] || [])];
  const sampleNotice = (text = "Här visas fiktiva exempel. Det du skapar sparas bara i den här webbläsaren.") => `<div class="notice">${icon("info")}<p>${e(text)}</p></div>`;
  const heading = (eyebrow, title, intro, action = "") => `<div class="page-heading"><div><p class="eyebrow">${e(eyebrow)}</p><h1>${e(title)}</h1><p class="lede">${e(intro)}</p></div>${action}</div>`;
  const actionButton = (action, text, type = "primary", extra = "") => `<button class="button ${type}" data-action="${action}" ${extra}>${icon("plus")}${e(text)}</button>`;
  const empty = (title, text, action = "") => `<div class="empty">${icon("leaf")}<h2>${e(title)}</h2><p>${e(text)}</p>${action}</div>`;
  const modeLabel = (mode) => mode === "om" ? "OM AI" : "MED AI";
  const dateLabel = (value, options = { day: "numeric", month: "long" }) => new Date(`${value}T12:00:00`).toLocaleDateString("sv-SE", options);
  const dateTile = (value) => `<div class="date-tile"><strong>${new Date(`${value}T12:00:00`).getDate()}</strong><span>${e(dateLabel(value, { month: "short" }).replace(".", ""))}</span></div>`;
  const attendeeCount = (meeting) => meeting.participants + Number(local.joined.includes(meeting.id));
  const isFull = (meeting) => attendeeCount(meeting) >= meeting.capacity;
  const isJoined = (meeting) => local.joined.includes(meeting.id);
  const attendees = (meeting) => `<div class="avatar-stack">${[meeting, { initials: "SL", color: "sage" }, { initials: "EB", color: "lavender" }].slice(0, Math.min(3, attendeeCount(meeting))).map((x) => avatar(x)).join("")}${attendeeCount(meeting) > 3 ? `<span class="avatar avatar-more">+${attendeeCount(meeting) - 3}</span>` : ""}</div>`;
  const searchBox = (id, placeholder, value) => `<label class="search-box">${icon("search")}<span class="sr-only">${e(placeholder)}</span><input id="${id}" data-search="${id}" type="search" autocomplete="off" placeholder="${e(placeholder)}" value="${e(value)}"><button type="button" class="clear-search" data-action="clear-search" data-target="${id}" aria-label="Rensa sökningen" ${value ? "" : "hidden"}>${icon("close")}</button></label>`;
  const options = (items, current = "") => items.map(([value, text]) => `<option value="${e(value)}" ${current === value ? "selected" : ""}>${e(text)}</option>`).join("");
  const filterSelect = (kind, key, label, values, value) => `<label class="select-label">${e(label)}<select class="filter-select" data-filter="${kind}" data-key="${key}">${options([["", "Alla"], ...values], value)}</select></label>`;
  function toast(message) {
    clearTimeout(toast.timer);
    $("toast").innerHTML = `<span class="toast-inner">${icon("check")}${e(message)}${storageFailed ? " · Sparas endast tills sidan stängs." : ""}</span>`;
    $("toast").hidden = false;
    toast.timer = setTimeout(() => { $("toast").hidden = true; }, 4600);
  }
  function art(type) {
    const common = 'viewBox="0 0 300 160" fill="none" aria-hidden="true"';
    if (type === "truth") return `<svg ${common}><path d="m50 120 150 14 49-87-151-15Z" fill="#cbd6bf"/><g transform="rotate(-9 133 80)"><rect x="78" y="26" width="108" height="112" rx="4" fill="#fffcf1" stroke="#667b57" stroke-width="1.5"/><path d="M96 49h43M96 61h70M96 72h58M96 100h51M96 112h67" stroke="#93a284" stroke-width="2"/><path d="m96 86 5 5 10-11" stroke="#667b57" stroke-width="2"/></g><circle cx="196" cy="86" r="31" fill="#edf1e388" stroke="#47613d" stroke-width="5"/><path d="m219 108 25 25" stroke="#47613d" stroke-width="9" stroke-linecap="round"/><text x="196" y="97" text-anchor="middle" fill="#47613d" font-size="31" font-family="Georgia">?</text><path d="M51 43v15m-8-8h16m196-17v12m-6-6h12" stroke="#94a280" stroke-width="2"/></svg>`;
    if (type === "language") return `<svg ${common}><path d="M60 115c12-49 75-82 162-44l17 51-143 17Z" fill="#e8c7b1"/><path d="M58 30h124a12 12 0 0 1 12 12v51a12 12 0 0 1-12 12h-73l-24 19 4-19H58a12 12 0 0 1-12-12V42a12 12 0 0 1 12-12Z" fill="#fffaf0" stroke="#ae7351" stroke-width="1.5"/><text x="77" y="75" fill="#9b5e40" font-size="32" font-family="Georgia" font-style="italic">Hello!</text><path d="M164 83h74a10 10 0 0 1 10 10v33a10 10 0 0 1-10 10h-5l4 15-20-15h-53a10 10 0 0 1-10-10V93a10 10 0 0 1 10-10Z" fill="#bd7857"/><path d="M175 108h5m14 0h5m14 0h5" stroke="#fff9ed" stroke-width="5" stroke-linecap="round"/><path d="M224 33v17m-8-8h16" stroke="#c49477" stroke-width="2"/></svg>`;
    if (type === "image") return `<svg ${common}><g transform="rotate(-7 140 85)"><rect x="64" y="25" width="164" height="115" rx="3" fill="#faf7f0" stroke="#9785a3" stroke-width="1.5"/><rect x="75" y="36" width="142" height="83" fill="#d8d3e5"/><circle cx="178" cy="57" r="12" fill="#f9eaca"/><path d="m75 119 44-48 30 28 25-17 43 37" fill="#a49bad"/><path d="M126 129h40" stroke="#b7acbd" stroke-width="2"/></g><path d="m239 22 3 10 10 3-10 3-3 10-3-10-10-3 10-3Z" fill="#a090af"/><path d="M47 110v16m-8-8h16" stroke="#a090af" stroke-width="2"/></svg>`;
    if (type === "math") return `<svg ${common}><rect x="68" y="20" width="166" height="122" rx="4" fill="#fffaf0" stroke="#b5a173" stroke-width="1.5"/><path d="M87 43h128M87 68h128M87 93h128M87 118h128" stroke="#e0d7c0"/><text x="102" y="66" font-size="27" fill="#8d7b4d" font-family="Georgia">2 + 2 = 5</text><path d="m202 48 15 18m-15 0 15-18" stroke="#a65640" stroke-width="3"/><text x="118" y="113" font-size="29" fill="#8d7b4d" font-family="Georgia" font-style="italic">Varför?</text><path d="m45 107 31-41 8 6-31 41-11 6Z" fill="#b8a36d"/></svg>`;
    if (type === "bias") return `<svg ${common}><path d="M150 29v108m-42 0h84M80 49h140" stroke="#a97470" stroke-width="3" stroke-linecap="round"/><path d="m90 50-28 56h56Zm120 0-28 56h56Z" fill="#fbf4e9" stroke="#a97470" stroke-width="1.5"/><path d="M61 106a29 23 0 0 0 58 0m62 0a29 23 0 0 0 58 0" fill="#c59287"/><circle cx="150" cy="29" r="7" fill="#a97470"/><path d="M53 29v15m-8-7h16m208 68v13m-6-7h12" stroke="#c59287" stroke-width="2"/></svg>`;
    return `<svg ${common}><g transform="rotate(-8 137 80)"><rect x="80" y="20" width="133" height="123" rx="4" fill="#fffaf0" stroke="#7c936a" stroke-width="1.5"/><path d="M98 45h62M98 62h95M98 79h81M98 96h90M98 113h62" stroke="#b5c3a9" stroke-width="2"/><path d="M128 61h41M110 96h43" stroke="#a85743" stroke-width="2"/></g><path d="m191 127 40-69 10 6-40 69-14 8Z" fill="#7c936a"/><path d="m186 142 5-15 10 6Z" fill="#a85743"/></svg>`;
  }
  function heroArt() {
    return `<svg viewBox="0 0 370 290" fill="none" aria-hidden="true"><ellipse cx="190" cy="141" rx="106" ry="91" stroke="#c9c5af" stroke-dasharray="4 7"/><path d="M100 80 276 193M95 191 278 72M187 45l-3 199" stroke="#d8d1bc"/><circle cx="188" cy="141" r="61" fill="#e3e7d7" stroke="#cad3bc"/><circle cx="188" cy="141" r="49" fill="#eff0e3"/><text x="188" y="136" text-anchor="middle" font-family="Georgia" font-size="19" fill="#485d41">en bra idé</text><text x="188" y="157" text-anchor="middle" font-family="Georgia" font-size="12" font-style="italic" fill="#6b7b5b">börjar med oss</text><g transform="rotate(-7 87 70)"><rect x="34" y="46" width="100" height="50" rx="7" fill="#fffaf0" stroke="#d8cbb7"/><path d="M50 61h20v19l-10-3-10 3Zm10 0v16" stroke="#a1684a" stroke-width="1.4"/><text x="81" y="76" font-size="12" fill="#7f755b" font-family="Georgia">Dela.</text></g><g transform="rotate(7 293 200)"><rect x="243" y="172" width="100" height="49" rx="7" fill="#fffaf0" stroke="#d8cbb7"/><path d="M255 188h20v12h-10l-6 5v-5h-4Z" stroke="#73845d" stroke-width="1.4"/><text x="284" y="200" font-size="12" fill="#7f755b" font-family="Georgia">Lär.</text></g><circle cx="280" cy="72" r="26" fill="#cbd9bd" stroke="#f7f4ed" stroke-width="5"/><text x="280" y="78" font-family="Georgia" font-size="16" text-anchor="middle" fill="#58734b">S</text><circle cx="89" cy="193" r="25" fill="#d2aa91" stroke="#f7f4ed" stroke-width="5"/><text x="89" y="199" font-family="Georgia" font-size="17" text-anchor="middle" fill="#fff7ed">A</text><circle cx="187" cy="245" r="21" fill="#b4b0c2" stroke="#f7f4ed" stroke-width="4"/><text x="187" y="251" font-family="Georgia" font-size="14" text-anchor="middle" fill="#fff7ed">E</text><path d="m185 25 3 10 10 3-10 3-3 10-3-10-10-3 10-3Z" fill="#a9553d"/><path d="m325 126 2 7 7 2-7 2-2 7-2-7-7-2 7-2Z" fill="#b6b68e"/><path d="M44 130v10m-5-5h10" stroke="#a79775"/><path d="M113 253c20 17 36 18 46 10" stroke="#b5ad91" stroke-linecap="round"/><text x="213" y="276" class="hero-note">Fler perspektiv. Mer möjligt.</text></svg>`;
  }
  function renderSidebar(route) {
    const navs = [["hem", "home", "Översikt"], ["resurser", "library", "Resursbanken"], ["pilot", "search", "Indexeringspilot"], ["lektioner", "book", "Lektionsbanken"], ["forum", "chat", "Samtalsforum"], ["traffar", "calendar", "Träffas & prata"]];
    const navItem = ([key, sym, label]) => `<a class="nav-link ${route === key ? "active" : ""}" href="#/${key}" ${route === key ? 'aria-current="page"' : ""}>${icon(sym)}<span>${label}</span>${key === "resurser" ? `<span class="nav-count">${katalog.resurser.length}</span>` : ""}${key === "sparat" && local.saved.length ? `<span class="nav-count">${local.saved.length}</span>` : ""}</a>`;
    $("sidebar").innerHTML = `<a class="brand" href="#/hem" aria-label="AI-nätverket, startsida"><span class="brand-symbol" aria-hidden="true">✳</span><span class="brand-name">AI-nätverket<small>Nyfikenhet för oss samman</small></span></a><p class="nav-caption">Utforska & möts</p><nav class="nav-list">${navs.map(navItem).join("")}</nav><hr class="nav-divider"><nav class="nav-list" aria-label="Personligt och om nätverket">${[["sparat", "bookmark", "Mitt hörn"], ["om", "heart", "Om nätverket"]].map(navItem).join("")}</nav><div class="sidebar-bottom"><div class="community-note"><span class="little-star" aria-hidden="true">✳</span><strong>Ingen behöver kunna allt.</strong><p>Vi är nyfikna lärare och eldsjälar som lär av varandra. Du är också välkommen.</p></div><a class="small-link" href="../index.html">Den ursprungliga katalogen ↗</a></div>`;
    $("page-label").textContent = labels[route] || "Sidan hittades inte";
  }
  function lessonCard(lesson) {
    return `<article class="lesson-card"><div class="lesson-art ${e(lesson.color)}"><span class="mode-badge ${e(lesson.mode)}">${modeLabel(lesson.mode)}</span>${save("lesson", lesson.id, lesson.title)}${art(lesson.art)}</div><div class="lesson-content"><div class="card-kicker">${e(lesson.subject)}<span>·</span>${e(lesson.stage)}<span>·</span>${lesson.minutes} min</div><h3><a href="#/lektioner/${e(lesson.id)}">${e(lesson.title)}</a></h3><p class="card-summary">${e(lesson.intro)}</p><div class="card-person">${avatar(lesson)}<span>${e(lesson.author)}</span><span class="demo-mark">${lesson.isLocal ? "Lokalt utkast" : "Exempel"}</span></div></div></article>`;
  }
  function topicRow(topic) {
    return `<article class="discussion-row">${avatar(topic)}<div><span class="category">${e(topic.category)}</span><h3><a href="#/forum/${e(topic.id)}">${e(topic.title)}</a></h3><p class="discussion-meta"><span>${e(topic.author)}</span><span>·</span><span>${e(topic.time)}</span><span>·</span><span>${topic.isLocal ? "Lokalt utkast" : "Exempel"}</span></p></div><span class="reply-count" aria-label="${replies(topic).length} svar">${icon("chat")}${replies(topic).length}</span></article>`;
  }
  function resourceCard(resource) {
    const initials = resource.kalla_namn.split(" ").filter(Boolean).slice(0, 2).map((x) => x[0]).join("");
    return `<article class="resource-card"><div class="resource-card-top"><span class="source-symbol ${e(resource.kalla)}" aria-hidden="true">${e(initials)}</span>${save("resource", resource.id, resource.titel)}</div><div><p class="resource-source">${e(resource.kalla_namn)} · ${e(taxonomi.kalla[resource.kalla])}</p><h3><a href="${e(resource.url)}" target="_blank" rel="noopener noreferrer">${e(resource.titel)}</a></h3></div><p class="resource-description">${e(resource.beskrivning)}</p><div class="tags">${resource.teman.slice(0, 2).map((tag) => `<span class="tag">${e(taxonomi.teman[tag])}</span>`).join("")}</div><div class="resource-bottom"><span>${e(taxonomi.typ[resource.typ[0]])} · ${e(taxonomi.kostnad[resource.kostnad])}</span><a href="${e(resource.url)}" target="_blank" rel="noopener noreferrer" aria-label="Besök ${e(resource.titel)} (öppnas i ny flik)">Besök ${icon("external")}</a></div></article>`;
  }
  function homeView() {
    const meeting = demo.meetings[0];
    main.innerHTML = `<div class="welcome-row"><p class="eyebrow">${icon("spark")} En plats att tänka tillsammans</p><span class="welcome-date">För hela skolans AI-resa</span></div><section class="hero"><div class="hero-copy"><h1>Ingen behöver<br>uppfinna allt <em>själv.</em></h1><p>Hitta det som redan är bra. Dela det du har provat.<br>Och möt andra som är lika nyfikna som du.</p><div class="hero-actions"><a class="button primary" href="#/resurser">Utforska resursbanken ${arrow()}</a><a class="button" href="#/lektioner">Hitta en lektionsidé ${icon("book")}</a></div></div><div class="hero-art">${heroArt()}</div></section><div class="paths">${[["resurser","library","Handplockat, inte allt",`${katalog.resurser.length} resurser att upptäcka`],["lektioner","book","Från klassrummet","Lektioner om och med AI"],["forum","chat","Fler perspektiv","Fråga, dela och diskutera"],["traffar","calendar","En stund tillsammans","Små samtal, stora tankar"]].map(([href,sym,title,text])=>`<a class="path" href="#/${href}"><span class="path-icon">${icon(sym)}</span><div><strong>${title}</strong><p>${text}</p></div></a>`).join("")}</div><div class="dashboard-grid"><div><section><div class="section-head"><div><h2>Idéer att ta till klassrummet</h2><p>Så kan kollegors erfarenheter bli din nästa lektion.</p></div>${link("#/lektioner", "Alla lektioner")}</div><div class="lesson-grid home-lessons">${demo.lessons.slice(0,2).map(lessonCard).join("")}</div></section><section class="section-space"><div class="section-head"><h2>Samtalet är igång</h2>${link("#/forum","Till forumet")}</div><div class="discussion-list">${demo.topics.slice(0,3).map(topicRow).join("")}</div></section></div><aside class="dashboard-aside"><section class="meet-preview"><p class="eyebrow">${icon("video")} Vi ses väl? · exempelträff</p><h3>En timme om<br>AI och språk.</h3><p class="meet-summary">Inga föreläsningar. Inga färdiga svar. Bara nyfikna kollegor som tänker högt tillsammans.</p><div class="meeting-when">${dateTile(meeting.date)}<div><p>Söndag 20 september</p><small>13.00–14.00 · Digitalt samtal</small></div></div><div class="attendees-row">${attendees(meeting)}<span>${attendeeCount(meeting)} av ${meeting.capacity} platser</span></div><a class="button green wide" href="#/traffar/${meeting.id}">${isJoined(meeting) ? "Du är anmäld i prototypen" : "Det här vill jag vara med på"} ${arrow()}</a><p class="small-note">Du behöver bara ta med din nyfikenhet.</p></section><section class="mini-about"><p class="eyebrow">Vår gemensamma idé</p><h3>Av eldsjälar. För fler.</h3><p>Det finns redan så mycket bra. Vi samlar, länkar vidare och skapar plats för det som händer mellan människor.</p>${link("#/om", "Lär känna nätverket")}</section></aside></div><section class="curated-strip"><span class="path-icon">${icon("leaf")}</span><div><strong>Bra material förtjänar att hittas.</strong><p>Känner du till en pedagogsida, guide eller resurs som fler borde upptäcka?</p></div><button class="text-link" data-action="form-resource">Tipsa om en resurs ${arrow()}</button></section>`;
  }
  // Samma princip som ursprungskatalogen: normaliserade ord, viktade fält och ett stavfel.
  function almost(a, b) {
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0, j = 0, errors = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++errors > 1) return false;
      if (a[i] === b[j + 1] && a[i + 1] === b[j]) { i += 2; j += 2; }
      else if (a.length > b.length) i++;
      else if (b.length > a.length) j++;
      else { i++; j++; }
    }
    return errors + a.length - i + b.length - j <= 1;
  }
  const stopwords = new Set(["om", "och", "i", "pa", "for", "att", "med", "en", "ett", "av", "till", "det", "den", "de", "ar", "hur", "vad", "som"]);
  function score(resource, query) {
    const raw = fold(query).split(/[^a-z0-9]+/).filter(Boolean);
    const substantial = raw.filter((word) => word.length > 2 && !stopwords.has(word));
    const tokens = substantial.length ? substantial : raw;
    const fields = [[resource.titel,3],[resource.kalla_namn,2.2],[resource.teman.map((x)=>taxonomi.teman[x]).join(" ")+" "+resource.typ.map((x)=>taxonomi.typ[x]).join(" "),2],[resource.beskrivning,1]].map(([text,weight])=>({text:fold(text),words:fold(text).split(/[^a-z0-9]+/),weight}));
    let total = 0;
    for (const token of tokens) {
      let best = 0;
      for (const field of fields) {
        let hit = field.words.some((word)=>word.startsWith(token)) ? 1 : field.text.includes(token) ? .7 : 0;
        if (!hit && token.length >= 5) hit = field.words.some((word)=>{let n=0;while(n<Math.min(word.length,token.length)&&word[n]===token[n])n++;return n>=5&&n>=token.length-3;}) ? .5 : field.words.some((word)=>almost(word,token)) ? .45 : 0;
        best = Math.max(best, hit * field.weight);
      }
      if (!best) return 0;
      total += best;
    }
    return total || 1;
  }
  function resourceResults() {
    const state = ui.resource;
    const rows = katalog.resurser.filter((r) => r.status === "aktiv" && (!state.typ || r.typ.includes(state.typ)) && (!state.teman || r.teman.includes(state.teman)) && (!state.stadium || r.stadium.includes(state.stadium) || r.stadium.includes("alla")) && (!state.kostnad || r.kostnad === state.kostnad)).map((r)=>({r,p:score(r,state.q)})).filter((x)=>x.p>0).sort((a,b)=>b.p-a.p).map((x)=>x.r);
    $("resource-results").innerHTML = `<div class="result-meta" role="status"><span><strong>${rows.length}</strong> resurser${state.q ? ` för ”${e(state.q)}”` : " att upptäcka"}</span><span>Handplockat av människor</span></div>${rows.length ? `<div class="resource-grid">${rows.slice(0,state.count).map(resourceCard).join("")}</div>${rows.length>state.count?`<div class="load-row"><button class="button" data-action="load-resources">Visa fler resurser (${Math.min(12,rows.length-state.count)} till) ${icon("plus")}</button></div>`:""}` : empty("Inga resurser just här", "Prova ett annat sökord eller ta bort något filter.", '<button class="button" data-action="reset-resources">Rensa sökning och filter</button>')}`;
  }
  function resourceView() {
    main.innerHTML = `${heading("Samlat, granskat och sökbart", "Det bästa finns redan.", "Guider, verktyg och inspiration från pedagogsidor, myndigheter och eldsjälar. Vi hjälper dig att hitta vidare till dem som kan.", actionButton("form-resource","Tipsa om en resurs"))}${searchBox("resource-search","Sök till exempel ”lektioner om bias” eller ”riktlinjer gdpr”",ui.resource.q)}<div class="filter-bar">${[["typ","Resurstyp"],["teman","Tema"],["stadium","Skolform"],["kostnad","Kostnad"]].map(([key,label])=>filterSelect("resource",key,label,Object.entries(taxonomi[key]).filter(([v])=>v!=="alla"),ui.resource[key])).join("")}<button class="text-link" data-action="reset-resources">Rensa filter</button></div><div id="resource-results"></div>`;
    resourceResults();
  }
  function lessonResults() {
    const state=ui.lesson;
    const rows=allLessons().filter((r)=>(!state.mode||r.mode===state.mode)&&(!state.subject||r.subject===state.subject)&&(!state.stage||r.stage===state.stage)&&fold([r.title,r.intro,r.subject,...r.tags].join(" ")).includes(fold(state.q)));
    $("lesson-results").innerHTML=`<div class="result-meta" role="status"><span><strong>${rows.length}</strong> lektionsidéer</span><span>Exempel på hur vi kan dela erfarenheter</span></div>${rows.length?`<div class="lesson-grid">${rows.map(lessonCard).join("")}</div>`:empty("Nästa lektion kanske är din?","Inget upplägg matchar filtren. Prova en annan kombination.",'<button class="button" data-action="reset-lessons">Rensa filtren</button>')}`;
  }
  function lessonView() {
    main.innerHTML=`${heading("Pröva, reflektera, dela vidare","Från ett klassrum till ett annat.","Lektioner där eleverna lär om AI – eller med AI. Med mål, upplägg och ärliga reflektioner om vad som fungerade.",actionButton("form-lesson","Dela en lektion"))}${sampleNotice("Lektionsuppläggen och lärarreflektionerna är illustrativa exempel, inte rapporter från genomförd undervisning.")}${searchBox("lesson-search","Sök bland lektionsidéer…",ui.lesson.q)}<div class="lesson-filters"><div class="tabs" aria-label="Typ av AI-undervisning">${[["","Alla lektioner"],["om","Undervisa om AI"],["med","Lära med AI"]].map(([mode,label])=>`<button class="tab ${ui.lesson.mode===mode?"active":""}" data-action="lesson-mode" data-mode="${mode}" aria-pressed="${ui.lesson.mode===mode}">${label}</button>`).join("")}</div><div class="filter-bar">${filterSelect("lesson","subject","Ämne",subjects.map(x=>[x,x]),ui.lesson.subject)}${filterSelect("lesson","stage","Stadium",stages.map(x=>[x,x]),ui.lesson.stage)}</div></div><div id="lesson-results"></div>`;
    lessonResults();
  }
  function lessonDetail(id) {
    const lesson=allLessons().find((x)=>x.id===id);if(!lesson)return notFound();
    main.innerHTML=`<a class="back-link" href="#/lektioner">${icon("back")} Alla lektioner</a><div class="detail-layout"><article class="detail-main"><div class="tags"><span class="mode-badge ${e(lesson.mode)}">${modeLabel(lesson.mode)}</span><span class="tag">${e(lesson.subject)}</span><span class="tag">${lesson.isLocal?"Lokalt utkast":"Exempellektion"}</span></div><h1>${e(lesson.title)}</h1><p class="detail-lede">${e(lesson.intro)}</p><div class="author">${avatar(lesson)}<div><strong>${e(lesson.author)}</strong><small>${e(lesson.city)} · ${lesson.isLocal?"Ditt bidrag i prototypen":"Fiktiv lärare i prototypen"}</small></div></div><div class="lesson-art detail-art ${e(lesson.color)}">${art(lesson.art)}</div><section class="detail-section"><h2>Det här ska eleverna få med sig</h2><p>${e(lesson.aim)}</p></section><section class="detail-section"><h2>Innan ni börjar</h2><p>${e(lesson.materials)}</p></section><section class="detail-section"><h2>Så kan lektionen gå till</h2><ol class="step-list">${lesson.steps.map(step=>`<li>${e(step)}</li>`).join("")}</ol></section><section class="detail-section reflection"><h2>Reflektionen efteråt</h2><p>${e(lesson.reflection)}</p></section>${lesson.resourceUrl?`<p><a class="text-link" href="${e(lesson.resourceUrl)}" target="_blank" rel="noopener noreferrer">Till tillhörande material ${icon("external")}</a></p>`:""}${sampleNotice(lesson.isLocal?"Det här är ditt lokala lektionsutkast. Det har inte publicerats eller skickats till nätverket.":"Det här upplägget visar hur en delad lektion skulle kunna presenteras. Exemplet är inte klassrumsprövat eller granskat.")}</article><aside class="detail-aside"><h3>Lektionen i korthet</h3><dl class="fact-list"><div><dt>Ämne</dt><dd>${e(lesson.subject)}</dd></div><div><dt>Stadium</dt><dd>${e(lesson.stage)}</dd></div><div><dt>Tidsåtgång</dt><dd>${lesson.minutes} minuter</dd></div><div><dt>AI:s roll</dt><dd>${lesson.mode==="om"?"Det vi undersöker":"Ett stöd i lärandet"}</dd></div></dl><button class="button primary wide" data-action="save" data-kind="lesson" data-id="${e(lesson.id)}" aria-pressed="${saved("lesson",lesson.id)}">${icon("bookmark")}${saved("lesson",lesson.id)?"Sparad i mitt hörn":"Spara lektionsidén"}</button><button class="button wide" data-action="print">${icon("download")}Skriv ut upplägget</button><p class="aside-note">Anpassa alltid upplägget till din elevgrupp och skolans förutsättningar.</p><div class="tags" style="margin-top:18px">${lesson.tags.map(tag=>`<span class="tag">${e(tag)}</span>`).join("")}</div></aside></div>`;
  }
  function forumResults() {
    const rows=allTopics().filter(x=>(!ui.forum.category||x.category===ui.forum.category)&&fold(x.title+" "+x.body).includes(fold(ui.forum.q)));
    $("forum-results").innerHTML=`<div class="result-meta" role="status"><span><strong>${rows.length}</strong> samtal att kliva in i</span><span>${ui.forum.category?e(ui.forum.category):"Alla ämnesområden"}</span></div><div class="discussion-list">${rows.map(topicRow).join("")}</div>${rows.length?"":empty("Här kan ett nytt samtal börja.","Ingen tråd matchar sökningen.",actionButton("form-topic","Starta ett samtal"))}`;
  }
  function forumView() {
    main.innerHTML=`${heading("Ingen fråga är för liten","Vad funderar du på?","Dela ett dilemma, en upptäckt eller en halvfärdig tanke. Här lär vi tillsammans, med plats för fler perspektiv.",actionButton("form-topic","Starta ett samtal"))}${sampleNotice()}<div class="forum-layout"><div>${searchBox("forum-search","Sök bland frågor och samtal…",ui.forum.q)}<div id="forum-results"></div></div><aside class="forum-categories"><h3>Hitta ditt samtal</h3>${["",...categories].map(category=>`<button class="category-button ${ui.forum.category===category?"active":""}" data-action="forum-category" data-category="${e(category)}" aria-pressed="${ui.forum.category===category}"><span>${e(category||"Alla samtal")}</span><small>${allTopics().filter(x=>!category||x.category===category).length}</small></button>`).join("")}<div class="forum-guideline"><strong>Nyfikna på varandras perspektiv.</strong>Fråga hellre än anta. Dela gärna det som skavde också. Och låt elever och kollegor förbli anonyma.</div></aside></div>`;
    forumResults();
  }
  function topicDetail(id) {
    const topic=allTopics().find(x=>x.id===id);if(!topic)return notFound();
    main.innerHTML=`<a class="back-link" href="#/forum">${icon("back")} Alla samtal</a><div class="detail-layout"><article class="detail-main"><span class="tag tint">${e(topic.category)}</span><h1>${e(topic.title)}</h1><div class="thread-post"><div class="author">${avatar(topic)}<div><strong>${e(topic.author)}</strong><small>${e(topic.city)} · ${topic.isLocal?"Lokalt utkast":"Fiktivt exempel"}</small></div></div><p>${e(topic.body)}</p></div><section class="reply-list"><h2>${replies(topic).length} svar och perspektiv</h2>${replies(topic).map(reply=>`<div class="thread-post"><div class="author">${avatar(reply)}<div><strong>${e(reply.author)}</strong><small>${reply.isLocal?"Ditt lokala svar":"Exempelsvar"}</small></div></div><p>${e(reply.text)}</p></div>`).join("")}${!replies(topic).length?'<p class="muted">Samtalet väntar på sitt första perspektiv.</p>':""}<form class="reply-form" data-form="reply" data-id="${e(id)}"><label for="reply-body">Vad tänker du?</label><textarea id="reply-body" name="body" required maxlength="4000" placeholder="Dela en erfarenhet eller ställ en följdfråga…"></textarea><button class="button primary" type="submit">Lägg till demosvar ${arrow()}</button><p class="dialog-note">Svaret sparas bara i din webbläsare. Ingen annan får en avisering.</p></form></section></article><aside class="detail-aside"><h3>Ett samtal att återkomma till</h3><button class="button wide" data-action="save" data-kind="topic" data-id="${e(topic.id)}" aria-pressed="${saved("topic",topic.id)}">${icon("bookmark")}${saved("topic",topic.id)?"Sparat samtal":"Spara samtalet"}</button><p class="aside-note">Ibland behövs en stund tillsammans för att komma vidare. Bjud in till ett öppet samtal om ämnet.</p><button class="button wide" data-action="form-meeting">${icon("calendar")}Föreslå en träff</button><p class="aside-note">Prototyp: personer och inlägg är exempel. Dina svar publiceras inte.</p></aside></div>`;
  }
  function joinButton(meeting, wide = false) {
    return `<button class="button ${isJoined(meeting)?"":"primary"} ${wide?"wide":""}" data-action="join" data-id="${e(meeting.id)}" ${isFull(meeting)&&!isJoined(meeting)?"disabled":""}>${icon(isJoined(meeting)?"check":"plus")}${isJoined(meeting)?"Avboka demoplats":isFull(meeting)?"Alla platser tagna":"Boka en demoplats"}</button>`;
  }
  function meetingCard(meeting) {
    return `<article class="meeting-card">${dateTile(meeting.date)}<div class="meeting-info"><div class="tags"><span class="tag tint">${e(meeting.category)}</span><span class="tag">${meeting.isLocal?"Lokalt utkast":"Exempelträff"}</span>${isJoined(meeting)?'<span class="tag red">Du är demoanmäld</span>':""}</div><h3><a href="#/traffar/${e(meeting.id)}">${e(meeting.title)}</a></h3><p>${e(meeting.description)}</p><div class="meeting-details"><span>${icon("clock")}${e(meeting.start.replace(":","."))}–${e(meeting.end.replace(":","."))}</span><span>${icon("video")}${e(meeting.format)}</span><span>${avatar(meeting)}Med ${e(meeting.host)}</span></div></div><div class="meeting-side">${save("meeting",meeting.id,meeting.title)}<span>${attendeeCount(meeting)} av ${meeting.capacity} platser</span><a class="button small" href="#/traffar/${e(meeting.id)}">${isFull(meeting)&&!isJoined(meeting)?"Visa fullbokad träff":"Läs mer & delta"} ${arrow()}</a></div></article>`;
  }
  function meetingCalendar() {
    const {month,year}=ui.meetings;
    const first=new Date(year,month,1),offset=(first.getDay()+6)%7,last=new Date(year,month+1,0).getDate(),total=Math.ceil((offset+last)/7)*7;
    let cells="";
    for(let index=0;index<total;index++){
      const day=index-offset+1;
      if(day<1||day>last){cells+='<div class="calendar-day outside" aria-hidden="true"></div>';continue;}
      const value=`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
      const meetings=allMeetings().filter(x=>x.date===value);
      cells+=`<div class="calendar-day"><span class="calendar-number">${day}</span>${meetings.map(x=>`<a class="calendar-event" href="#/traffar/${e(x.id)}"><b>${e(x.start)}–${e(x.end)}</b>${e(x.title)}${isJoined(x)?" ✓":""}</a>`).join("")}</div>`;
    }
    return `<div class="calendar" role="region" aria-label="Träffkalender" tabindex="0"><div class="calendar-header"><h2>${e(first.toLocaleDateString("sv-SE",{month:"long",year:"numeric"}))}</h2><div class="calendar-nav"><button class="icon-button" data-action="calendar-month" data-delta="-1" aria-label="Föregående månad">${icon("back")}</button><button class="icon-button" data-action="calendar-month" data-delta="1" aria-label="Nästa månad">${arrow()}</button></div></div><div class="calendar-week">${["Mån","Tis","Ons","Tor","Fre","Lör","Sön"].map(day=>`<div>${day}</div>`).join("")}</div><div class="calendar-grid">${cells}</div></div><p class="calendar-hint">Alla tider är svensk lokal tid (Europe/Stockholm). På en liten skärm kan du dra kalendern i sidled.</p>`;
  }
  function meetingsView() {
    main.innerHTML=`${heading("Lite tid. Mycket att dela.","Ska vi tänka högt tillsammans?","Bjud in till ett samtal om det du är nyfiken på. Ingen konferens, ingen prestation. Bara en stund med kollegor från hela landet.",actionButton("form-meeting","Bjud in till en träff"))}${sampleNotice("Träffarna i september 2026 är exempel. Anmälan är lokal och ingen möteslänk skickas ut.")}<div class="meeting-toolbar"><div class="tabs" aria-label="Visning av träffar"><button class="tab ${ui.meetings.view==="list"?"active":""}" data-action="meeting-view" data-view="list" aria-pressed="${ui.meetings.view==="list"}">${icon("list")}Lista</button><button class="tab ${ui.meetings.view==="calendar"?"active":""}" data-action="meeting-view" data-view="calendar" aria-pressed="${ui.meetings.view==="calendar"}">${icon("calendar")}Kalender</button></div><span class="muted" style="font-size:10px">${allMeetings().length} träffar · Svensk lokal tid</span></div>${ui.meetings.view==="calendar"?meetingCalendar():`<div class="meeting-list">${allMeetings().map(meetingCard).join("")}</div>`}`;
  }
  function meetingDetail(id) {
    const meeting=allMeetings().find(x=>x.id===id);if(!meeting)return notFound();
    main.innerHTML=`<a class="back-link" href="#/traffar">${icon("back")} Alla träffar</a><div class="detail-layout"><article class="detail-main"><div class="tags"><span class="tag tint">${e(meeting.category)}</span><span class="tag">${meeting.isLocal?"Ditt lokala utkast":"Exempelträff"}</span></div><h1>${e(meeting.title)}</h1><p class="detail-lede">${e(meeting.description)}</p><div class="author">${avatar(meeting)}<div><strong>Din samtalsvärd: ${e(meeting.host)}</strong><small>${meeting.isLocal?"Din träff i prototypen":"Fiktiv värd i prototypen"}</small></div></div><section class="detail-section"><h2>Det här kan vi prata om</h2><ol class="step-list">${meeting.agenda.map(x=>`<li>${e(x)}</li>`).join("")}</ol></section><section class="detail-section reflection"><h2>Du behöver inte ha svaren.</h2><p>Ta med en fråga, en erfarenhet eller bara din nyfikenhet. Vi lyssnar på varandra och gör plats för olika perspektiv.</p></section><section class="detail-section"><h2>Vi samlas i en liten grupp</h2><div class="attendees-row">${attendees(meeting)}<span>${attendeeCount(meeting)} av ${meeting.capacity} platser ${isJoined(meeting)?"· inklusive din demoplats":""}</span></div><p>${isFull(meeting)?"Den här exempelträffen är fullbokad.":`${meeting.capacity-attendeeCount(meeting)} platser kvar i exemplet. Alla erfarenhetsnivåer är välkomna.`}</p></section>${sampleNotice("Det här är en prototyp. Att boka en demoplats skapar ingen riktig anmälan, kalenderbokning eller möteslänk.")}</article><aside class="detail-aside"><h3>En stund tillsammans</h3><dl class="fact-list"><div><dt>Datum</dt><dd>${e(dateLabel(meeting.date,{day:"numeric",month:"long",year:"numeric"}))}</dd></div><div><dt>Tid</dt><dd>${e(meeting.start)}–${e(meeting.end)}</dd></div><div><dt>Tidszon</dt><dd>Europe/Stockholm</dd></div><div><dt>Plats</dt><dd>${e(meeting.format)}</dd></div><div><dt>Platser</dt><dd>${attendeeCount(meeting)} / ${meeting.capacity}</dd></div></dl>${joinButton(meeting,true)}<button class="button wide" data-action="save" data-kind="meeting" data-id="${e(meeting.id)}" aria-pressed="${saved("meeting",meeting.id)}">${icon("bookmark")}${saved("meeting",meeting.id)?"Träffen är sparad":"Spara till senare"}</button><p class="aside-note">${isJoined(meeting)?"Din demoplats är bokad. Du hittar träffen under Mitt hörn → Mina träffar.":"I en färdig tjänst får deltagarna möteslänk och påminnelse inför samtalet."}</p></aside></div>`;
  }
  function savedView() {
    let content="";
    if(ui.savedTab==="sparat"){
      const resources=katalog.resurser.filter(x=>saved("resource",x.id));
      const lessons=allLessons().filter(x=>saved("lesson",x.id));
      const topics=allTopics().filter(x=>saved("topic",x.id));
      const meetings=allMeetings().filter(x=>saved("meeting",x.id));
      const section=(title,body)=>`<section class="section-space"><div class="section-head"><h2>${title}</h2></div>${body}</section>`;
      if(resources.length)content+=section("Resurser att återkomma till",`<div class="resource-grid">${resources.map(resourceCard).join("")}</div>`);
      if(lessons.length)content+=section("Lektionsidéer",`<div class="lesson-grid">${lessons.map(lessonCard).join("")}</div>`);
      if(topics.length)content+=section("Samtal att följa",`<div class="discussion-list">${topics.map(topicRow).join("")}</div>`);
      if(meetings.length)content+=section("Träffar du är nyfiken på",`<div class="meeting-list">${meetings.map(meetingCard).join("")}</div>`);
      if(!content)content=empty("Plats för dina nästa idéer.","Tryck på bokmärket vid en resurs, lektion, tråd eller träff. Då hittar du den här nästa gång.",'<a class="button primary" href="#/resurser">Hitta något att spara</a>');
    }else if(ui.savedTab==="traffar"){
      const rows=allMeetings().filter(x=>isJoined(x));
      content=rows.length?`<div class="meeting-list">${rows.map(meetingCard).join("")}</div>`:empty("En stol väntar på dig.","Här samlas träffarna där du bokat en demoplats.",'<a class="button primary" href="#/traffar">Hitta ett samtal</a>');
    }else{
      if(local.lessons.length)content+=`<div class="section-head"><h2>Dina lektionsutkast</h2></div><div class="lesson-grid">${local.lessons.map(lessonCard).join("")}</div>`;
      if(local.topics.length)content+=`<section class="section-space"><h2>Dina samtalsutkast</h2><div class="discussion-list">${local.topics.map(topicRow).join("")}</div></section>`;
      if(local.meetings.length)content+=`<section class="section-space"><div class="section-head"><h2>Dina träffutkast</h2></div><div class="meeting-list">${local.meetings.map(meetingCard).join("")}</div></section>`;
      if(local.tips.length)content+=`<section class="section-space"><h2>Dina resurstips</h2>${local.tips.map(tip=>`<article class="local-tip"><span class="tag red">Lokal granskningskö · inte inskickat</span><h3>${e(tip.title)}</h3><p>${e(tip.description)}</p><a href="${e(tip.url)}" target="_blank" rel="noopener noreferrer">${e(tip.url)}</a></article>`).join("")}</section>`;
      if(!content)content=empty("Det börjar med något litet.","Prova att tipsa om en resurs, dela en lektion, starta en tråd eller bjuda in till en träff.",actionButton("contribute","Dela något"));
    }
    main.innerHTML=`${heading("Mitt hörn av nätverket","Här samlas din nyfikenhet.","Sparat material, kommande samtal och det du själv vill dela vidare.")}${sampleNotice("Du provar som en lokal demoanvändare. Dina sparade saker, bidrag och anmälningar finns bara i den här webbläsaren.")}<div class="tabs saved-tabs">${[["sparat","Sparat"],["traffar","Mina träffar"],["bidrag","Mina bidrag"]].map(([key,label])=>`<button class="tab ${ui.savedTab===key?"active":""}" data-action="saved-tab" data-tab="${key}" aria-pressed="${ui.savedTab===key}">${label}</button>`).join("")}</div>${content}`;
  }
  const workshopQuestions=["Hur gör vi kurateringen hållbar när vi blir fler?","Vad behöver en delad lektion innehålla för att vara användbar?","Vad får ett forum att kännas välkomnande och levande?","Vem kan bjuda in till samtal, och hur håller vi dem trygga?","Vilken liten del ska vi lansera först?"];
  function aboutView() {
    main.innerHTML=`<section class="about-hero"><p class="eyebrow">En idé som blir bättre tillsammans</p><h1>Vi samlar det som finns.<br><em>Och gör plats för det som saknas.</em></h1><p>Runt om i Sverige finns människor som utforskar AI och lärande. Vi vill göra deras arbete lättare att hitta – och avståndet mellan kollegor lite kortare.</p></section><div class="principles">${[["01","Kurateringen är produkten.","Hellre ett mindre urval med tydlig relevans än ännu ett oändligt flöde. Vi länkar till upphovspersonerna."],["02","Lärandet kommer först.","Vad lär sig eleverna? Vad bidrar AI med? Vi vill dela reflektionerna, inte bara de snygga resultaten."],["03","Flera perspektiv behövs.","Nyfiken och tveksam, nybörjare och erfaren. Vi bygger ett nätverk där det är okej att inte veta."]].map(([n,title,body])=>`<article class="principle"><span>${n}</span><h3>${title}</h3><p>${body}</p></article>`).join("")}</div><section class="section-space"><div class="section-head"><h2>En möjlig väg framåt</h2></div><div class="roadmap"><div><p class="eyebrow">Finns redan</p><h3>En gemensam resursbank</h3><p>${katalog.resurser.length} katalogiserade resurser, kontrollerad taxonomi och sökning. Här använder prototypen repots riktiga katalog.</p></div><div><p class="eyebrow">Utforskas i prototypen</p><h3>Från material till möten</h3><p>Lektionsdelning, forum, träffar och ett personligt hörn. Klickbart, med exempel och lokal lagring.</p></div><div><p class="eyebrow">Idéer att prioritera senare</p><h3>Ett nätverk som kan växa</h3><p>Ämnesgrupper, gemensamma samlingar, kollegial respons och nyhetsbrev. Vi väljer utifrån verkliga behov.</p></div></div></section><section class="section-space"><div class="section-head"><div><h2>Ta med till nästa träff</h2><p>Markera de frågor du vill prata om. Markeringarna sparas lokalt.</p></div></div><div class="question-list">${workshopQuestions.map((q,i)=>`<div class="question-item"><p>${e(q)}</p><button class="button" data-action="vote" data-id="${i}" aria-pressed="${local.votes.includes(i)}">${icon(local.votes.includes(i)?"check":"plus")}${local.votes.includes(i)?"På min agenda":"Ta upp på träffen"}</button></div>`).join("")}</div></section><section class="curated-strip"><span class="path-icon">${icon("info")}</span><div><strong>En framtidsbild att prata om.</strong><p>Prototypen har ingen inloggning, serverlagring, riktig publicering eller videomötestjänst. Communityinnehållet är fiktivt.</p></div></section><div class="reset-row"><button class="button" data-action="reset-demo">Återställ min prototyp</button><p>Tar bort dina lokala provbidrag, sparade saker, anmälningar och agendaval.</p></div>`;
  }
  function notFound() { main.innerHTML=empty("Den sidan finns inte här.","Prototypen kan ha återställts, eller så är adressen fel.",'<a class="button primary" href="#/hem">Till översikten</a>'); }
  function routeParts() { return (location.hash.replace(/^#\/?/,"")||"hem").split("/"); }
  function render(moveFocus=false) {
    const [route,id]=routeParts();
    renderSidebar(route);
    document.title=`${labels[route]||"AI-nätverket"} · AI-nätverket`;
    if(route==="hem")homeView();
    else if(route==="resurser")resourceView();
    else if(route==="pilot")window.AINAT_PILOT_UI.render(main);
    else if(route==="lektioner")id?lessonDetail(id):lessonView();
    else if(route==="forum")id?topicDetail(id):forumView();
    else if(route==="traffar")id?meetingDetail(id):meetingsView();
    else if(route==="sparat")savedView();
    else if(route==="om")aboutView();
    else notFound();
    if(moveFocus){window.scrollTo(0,0);main.focus({preventScroll:true});}
  }
  function navigate(path) { if(location.hash===`#/${path}`)render(true);else location.hash=`#/${path}`; }
  function openDialog(html) {
    $("dialog-content").innerHTML=html;
    if(!dialog.open)dialog.showModal();
    dialog.scrollTop=0;
    requestAnimationFrame(()=>{const first=dialog.querySelector("input,select,textarea");if(first)first.focus();else $("close-dialog").focus();});
  }
  const dialogHeading=(title,description)=>`<div class="dialog-heading"><p class="eyebrow">Dela med nätverket</p><h2 id="dialog-title">${e(title)}</h2><p>${e(description)}</p></div>`;
  function contributeDialog() {
    openDialog(`${dialogHeading("Vad vill du dela?","En liten sak från dig kan bli en stor hjälp för någon annan.")}<div class="contribute-options">${[["resource","library","En bra resurs","Tipsa om något som fler borde hitta."],["lesson","book","En lektion eller ett upplägg","Dela vad ni gjorde, lärde och vill ändra."],["topic","chat","En fråga eller erfarenhet","Bjud in fler perspektiv till ett samtal."],["meeting","calendar","En stund tillsammans","Välj ett ämne och föreslå en tid."]].map(([key,sym,title,text])=>`<button class="contribute-option" data-action="form-${key}"><span class="path-icon">${icon(sym)}</span><span><strong>${title}</strong><small>${text}</small></span>${arrow()}</button>`).join("")}</div><p class="dialog-note">Du provar en prototyp. Inget publiceras eller skickas till andra.</p>`);
  }
  const input=(name,label,placeholder="",type="text",extra="")=>`<label class="form-field">${label}<input name="${name}" type="${type}" placeholder="${e(placeholder)}" ${extra}></label>`;
  const textarea=(name,label,placeholder="",extra="")=>`<label class="form-field">${label}<textarea name="${name}" placeholder="${e(placeholder)}" ${extra}></textarea></label>`;
  const select=(name,label,values)=>`<label class="form-field">${label}<select name="${name}" required>${options(values.map(v=>[v,v]))}</select></label>`;
  function formDialog(type) {
    let fields="",title="",description="",submit="Spara lokalt utkast";
    if(type==="resource"){
      title="Hittat något riktigt bra?";description="Tipsa om en resurs. Tanken är att varje tips granskas innan det får plats i katalogen.";submit="Lägg i lokal granskningskö";
      fields=input("title","Vad heter resursen?","Till exempel en guide eller pedagogsida","text",'required maxlength="160"')+input("url","Länk till originalet","https://…","url",'required maxlength="2000"')+textarea("description","Varför är den värdefull för skolan?","Vad kan någon annan få hjälp med?","required maxlength=1500")+select("type","Typ av resurs",Object.values(taxonomi.typ));
    }else if(type==="lesson"){
      title="Dela lärandet, inte bara lektionen.";description="Visa hur AI var en del av elevernas lärprocess. Ett ärligt upplägg är mer värdefullt än ett perfekt.";
      fields=input("title","Lektionens rubrik","En rubrik som väcker nyfikenhet","text",'required maxlength="160"')+`<div class="form-row">${select("subject","Ämne",subjects)}${select("stage","Stadium",stages)}</div><fieldset class="form-field" style="border:0;padding:0"><legend>Vilken roll har AI?</legend><div class="radio-row"><label><input type="radio" name="mode" value="om" checked>Undervisning om AI</label><label><input type="radio" name="mode" value="med">Lärande med AI</label></div></fieldset>`+input("minutes","Tidsåtgång i minuter","60","number",'required min="5" max="600" step="5" value="60"')+textarea("intro","Kort om upplägget","Vad gör eleverna?","required maxlength=1000")+textarea("aim","Vad ska eleverna lära sig?","Beskriv det viktigaste lärandemålet.","required maxlength=2000")+textarea("materials","Förberedelser och material","Vad behöver läraren förbereda? Behövs elevkonton?","required maxlength=2000")+textarea("steps","Genomförande – ett steg per rad","Starta med…\nLåt eleverna…\nAvsluta med…","required maxlength=5000")+textarea("reflection","Din reflektion efteråt","Vad fungerade, vad skavde och vad skulle du ändra?","required maxlength=3000")+input("resourceUrl","Länk till eget material (valfritt)","https://…","url",'maxlength="2000"');
    }else if(type==="topic"){
      title="Vad vill du tänka tillsammans om?";description="En fråga, en upptäckt eller ett dilemma. Du behöver inte ha ett färdigt svar.";
      fields=input("title","Rubrik","Vad är du nyfiken på?","text",'required maxlength="160"')+select("category","Ämnesområde",categories)+textarea("body","Starta samtalet","Ge lite sammanhang och bjud in andra att dela sina erfarenheter.",'required maxlength="5000" style="min-height:160px"');
    }else if(type==="meeting"){
      title="Gör plats för ett samtal.";description="Välj vad du vill prata om och en tid som passar. Ett litet sällskap räcker långt.";
      fields=input("title","Vad vill du prata om?","Till exempel AI och språk","text",'required maxlength="160"')+`<div class="form-row three">${input("date","Datum","","date",'required value="2026-09-20"')}${input("start","Från","","time",'required value="13:00"')}${input("end","Till","","time",'required value="14:00"')}</div><div class="form-row">${input("capacity","Antal platser, inklusive dig","8","number",'required min="2" max="50" step="1" value="8"')}${select("category","Tema",["Språkutveckling","Källkritik","Skolutveckling","Lektionsutveckling","Bedömning","Kom igång","Annat AI-tema"])}</div>`+textarea("description","En kort inbjudan","Vem är samtalet för? Vad vill du utforska?","required maxlength=2000")+textarea("agenda","Samtalsfrågor (valfritt, en per rad)","Vad har vi prövat?\nVad vill vi lära oss mer om?","maxlength=2000")+'<p class="dialog-note">Alla tider är svensk lokal tid. I prototypen skapas ingen riktig möteslänk.</p>';
    }
    openDialog(`${dialogHeading(title,description)}<form data-form="${type}"><div class="form-error" id="form-error" role="alert" hidden></div>${fields}<div class="form-actions"><button type="button" class="button" data-action="close-dialog">Avbryt</button><button type="submit" class="button primary">${e(submit)} ${arrow()}</button></div><p class="dialog-note">Sparas bara i din webbläsare. Du hittar utkastet under Mitt hörn → Mina bidrag.</p></form>`);
  }
  function profileDialog() {
    openDialog(`${dialogHeading("Ditt hörn börjar här.","I framtiden kan en profil knyta ihop det du delar, sparar och deltar i.")}<div class="dialog-profile"><span class="avatar you">Du</span><div><strong>Nyfiken kollega</strong><p>Lokal demoanvändare · ingen inloggning behövs</p></div></div><p class="storage-note">I den här prototypen sparas dina val på enheten. Personer i exempelmaterialet är fiktiva.</p><a class="button primary wide" href="#/sparat" data-close-dialog="true">Till mitt hörn ${arrow()}</a>`);
  }
  function resetDialog() {
    openDialog(`${dialogHeading("Börja om från första skissen?","Det här tar bort dina lokala utkast, svar, sparade saker, demobokningar och agendaval. Exempelmaterialet finns kvar.")}<div class="form-actions"><button class="button" data-action="close-dialog">Behåll mina val</button><button class="button primary" data-action="confirm-reset">Återställ prototypen</button></div>`);
  }
  function safeUrl(value) {
    try { const url=new URL(value);return ["https:","http:"].includes(url.protocol)&&!url.username&&!url.password?url.href:null; } catch { return null; }
  }
  function newId(prefix) { return `${prefix}-${crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`}`; }
  function formError(message) { $("form-error").textContent=message;$("form-error").hidden=false;$("form-error").scrollIntoView({block:"nearest"}); }
  document.addEventListener("submit",(event)=>{
    const form=event.target.closest("form[data-form]");if(!form)return;
    event.preventDefault();
    const values=Object.fromEntries([...new FormData(form)].map(([key,value])=>[key,String(value).trim()]));
    const type=form.dataset.form;
    if(type==="reply"){
      if(!values.body){form.querySelector("textarea").setCustomValidity("Skriv något innan du sparar svaret.");form.reportValidity();return;}
      const id=form.dataset.id;
      local.replies[id]=[...(local.replies[id]||[]),{author:"Du",initials:"Du",color:"sand",text:values.body,isLocal:true}];persist();
      topicDetail(id);toast("Ditt demosvar har lagts till lokalt.");$("reply-body").focus();return;
    }
    for(const field of form.querySelectorAll("[required]")) if(field.name&&!(values[field.name]||"").trim()){formError("Fyll i de obligatoriska fälten med mer än blanksteg.");field.focus();return;}
    if(type==="resource"&&!safeUrl(values.url)){formError("Ange en fullständig länk som börjar med https:// eller http://.");return;}
    if(type==="lesson"&&values.resourceUrl&&!safeUrl(values.resourceUrl)){formError("Materiallänken behöver börja med https:// eller http://.");return;}
    if(type==="meeting"&&values.end<=values.start){formError("Sluttiden måste vara senare än starttiden, samma dag.");return;}
    let destination="",message="Ditt utkast har sparats i prototypen.";
    if(type==="resource"){
      local.tips.unshift({id:newId("tips"),...values,url:safeUrl(values.url)});ui.savedTab="bidrag";destination="sparat";message="Ditt tips ligger nu i den lokala granskningskön.";
    }else if(type==="lesson"){
      const id=newId("lektion");
      local.lessons.unshift({id,...values,minutes:Number(values.minutes),resourceUrl:values.resourceUrl?safeUrl(values.resourceUrl):"",steps:values.steps.split(/\r?\n/).filter(x=>x.trim()),author:"Du",initials:"Du",city:"Ditt klassrum",color:values.mode==="om"?"sage":"peach",art:values.mode==="om"?"truth":"language",tags:["Eget upplägg"],isLocal:true});destination=`lektioner/${id}`;
    }else if(type==="topic"){
      const id=newId("samtal");local.topics.unshift({id,...values,author:"Du",initials:"Du",city:"Ditt nätverk",color:"sand",time:"Just nu",replies:[],tags:[],isLocal:true});destination=`forum/${id}`;
    }else if(type==="meeting"){
      const id=newId("traff");local.meetings.unshift({id,...values,capacity:Number(values.capacity),participants:0,host:"Du",initials:"Du",color:"sand",agenda:values.agenda?values.agenda.split(/\r?\n/).filter(x=>x.trim()):["En presentationsrunda.","Vi utforskar ämnet tillsammans.","Vad tar vi med oss?"],format:"Digitalt samtal",isLocal:true});local.joined.push(id);destination=`traffar/${id}`;
    }
    persist();dialog.close();navigate(destination);toast(message);
  });
  document.addEventListener("input",(event)=>{
    if(event.target.id==="reply-body")event.target.setCustomValidity("");
    const id=event.target.dataset.search;if(!id)return;
    const button=document.querySelector(`[data-action="clear-search"][data-target="${id}"]`);if(button)button.hidden=!event.target.value;
    if(id==="resource-search"){ui.resource.q=event.target.value;ui.resource.count=12;resourceResults();}
    else if(id==="lesson-search"){ui.lesson.q=event.target.value;lessonResults();}
    else if(id==="forum-search"){ui.forum.q=event.target.value;forumResults();}
  });
  document.addEventListener("change",(event)=>{
    const select=event.target.closest("[data-filter]");if(!select)return;
    ui[select.dataset.filter][select.dataset.key]=select.value;
    if(select.dataset.filter==="resource"){ui.resource.count=12;resourceResults();}else lessonResults();
  });
  const mobileQuery = window.matchMedia("(max-width: 760px)");
  function syncSidebar() { $("sidebar").inert = mobileQuery.matches && !$("sidebar").classList.contains("open"); }
  function closeMobile() { $("sidebar").classList.remove("open");$("sidebar-backdrop").hidden=true;$("mobile-menu").setAttribute("aria-expanded","false");$("mobile-menu").setAttribute("aria-label","Öppna menyn");syncSidebar(); }
  function toggleSave(button) {
    const key=`${button.dataset.kind}:${button.dataset.id}`;
    if(local.saved.includes(key))local.saved=local.saved.filter(x=>x!==key);else local.saved.push(key);
    persist();const active=local.saved.includes(key);
    // Uppdatera knapparna på plats så att tangentbordsfokus och läsposition består.
    for(const matching of document.querySelectorAll('[data-action="save"]')) if(matching.dataset.kind===button.dataset.kind&&matching.dataset.id===button.dataset.id){
      matching.setAttribute("aria-pressed",String(active));
      if(matching.classList.contains("icon-button")){
        const old=matching.getAttribute("aria-label")||"";matching.setAttribute("aria-label",old.replace(/^(Spara|Ta bort från sparat):/,`${active?"Ta bort från sparat":"Spara"}:`));matching.title=active?"Sparad":"Spara";
      }else matching.innerHTML=icon("bookmark")+(active?"Sparad i mitt hörn":"Spara till mitt hörn");
    }
    renderSidebar(routeParts()[0]);
    if(routeParts()[0]==="sparat")savedView();
    toast(active?"Sparat i ditt hörn.":"Borttaget från sparat.");
  }
  document.addEventListener("click",(event)=>{
    if(event.target.closest(".skip-link")){event.preventDefault();main.focus();main.scrollIntoView({block:"start"});return;}
    if(event.target.closest('[data-close-dialog="true"]'))dialog.close();
    if(event.target.closest("#sidebar a"))closeMobile();
    const button=event.target.closest("[data-action]");if(!button)return;
    const action=button.dataset.action;
    if(action==="contribute")contributeDialog();
    else if(action.startsWith("form-"))formDialog(action.slice(5));
    else if(action==="profile")profileDialog();
    else if(action==="close-dialog")dialog.close();
    else if(action==="save")toggleSave(button);
    else if(action==="load-resources"){ui.resource.count+=12;resourceResults();}
    else if(action==="clear-search"){
      const field=$(button.dataset.target);field.value="";field.dispatchEvent(new Event("input",{bubbles:true}));field.focus();
    }
    else if(action==="reset-resources"){ui.resource={q:"",typ:"",teman:"",stadium:"",kostnad:"",count:12};resourceView();$("resource-search").focus();}
    else if(action==="reset-lessons"){ui.lesson={q:"",mode:"",subject:"",stage:""};lessonView();$("lesson-search").focus();}
    else if(action==="lesson-mode"){
      ui.lesson.mode=button.dataset.mode;for(const tab of document.querySelectorAll('[data-action="lesson-mode"]')){const active=tab===button;tab.classList.toggle("active",active);tab.setAttribute("aria-pressed",String(active));}lessonResults();
    }
    else if(action==="forum-category"){
      ui.forum.category=button.dataset.category;for(const tab of document.querySelectorAll('[data-action="forum-category"]')){const active=tab===button;tab.classList.toggle("active",active);tab.setAttribute("aria-pressed",String(active));}forumResults();
    }
    else if(action==="meeting-view"){ui.meetings.view=button.dataset.view;meetingsView();document.querySelector(`[data-action="meeting-view"][data-view="${ui.meetings.view}"]`).focus();}
    else if(action==="calendar-month"){
      const date=new Date(ui.meetings.year,ui.meetings.month+Number(button.dataset.delta),1);ui.meetings.year=date.getFullYear();ui.meetings.month=date.getMonth();meetingsView();document.querySelector(`[data-action="calendar-month"][data-delta="${button.dataset.delta}"]`).focus();
    }
    else if(action==="join"){
      const meeting=allMeetings().find(x=>x.id===button.dataset.id);if(!meeting)return;
      if(isJoined(meeting)){local.joined=local.joined.filter(x=>x!==meeting.id);persist();render();toast("Din demoplats är avbokad.");}
      else if(!isFull(meeting)){local.joined.push(meeting.id);persist();render();toast("Din demoplats är bokad. Du hittar träffen i Mitt hörn.");}
      document.querySelector('[data-action="join"]')?.focus();
    }
    else if(action==="saved-tab"){ui.savedTab=button.dataset.tab;savedView();document.querySelector(`[data-action="saved-tab"][data-tab="${ui.savedTab}"]`).focus();}
    else if(action==="print")window.print();
    else if(action==="vote"){
      const id=Number(button.dataset.id);if(local.votes.includes(id))local.votes=local.votes.filter(x=>x!==id);else local.votes.push(id);persist();const active=local.votes.includes(id);button.setAttribute("aria-pressed",String(active));button.innerHTML=icon(active?"check":"plus")+(active?"På min agenda":"Ta upp på träffen");
    }
    else if(action==="reset-demo")resetDialog();
    else if(action==="confirm-reset"){local=fresh();persist();dialog.close();render();toast("Prototypen är återställd.");}
  });
  $("close-dialog").innerHTML=icon("close");
  $("close-dialog").addEventListener("click",()=>dialog.close());
  $("mobile-menu").innerHTML=icon("menu");
  $("mobile-menu").addEventListener("click",()=>{
    const open=$("sidebar").classList.toggle("open");$("sidebar-backdrop").hidden=!open;$("mobile-menu").setAttribute("aria-expanded",String(open));$("mobile-menu").setAttribute("aria-label",open?"Stäng menyn":"Öppna menyn");
    syncSidebar();
    if(open)$("sidebar").querySelector("a").focus();
  });
  $("sidebar-backdrop").addEventListener("click",closeMobile);
  document.addEventListener("keydown",(event)=>{if(event.key==="Escape"&&$("sidebar").classList.contains("open")){closeMobile();$("mobile-menu").focus();}});
  window.addEventListener("hashchange",()=>{if(dialog.open)dialog.close();closeMobile();render(true);});
  mobileQuery.addEventListener("change",closeMobile);
  render();
  syncSidebar();
})();
