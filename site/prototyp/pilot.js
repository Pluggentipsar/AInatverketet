/* Sökbar verklig insamlingspilot. Redaktörsbeslut sparas bara i denna webbläsare. */
(() => {
  "use strict";
  const data = window.AINAT_PILOT;
  const engine = window.AINAT_PILOT_SEARCH;
  const tax = data.taxonomi;
  const key = "ainat-pilot-review-v1";
  const e = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const labels = { anvandning: "Jag vill…", amne: "Ämne", stadium: "Stadium", materialtyp: "Materialtyp", verktyg: "Verktyg", undervisningstid: "Undervisningstid" };
  const statuses = { ej_granskad: "Ej granskat", godkand: "Godkänt i arbetsunderlaget", avvisad: "Avvisat", granska: "Granska vidare", andrad: "Källa eller förslag har ändrats" };
  let decisions = {}, warning = "", mode = "sok", selected = null;
  let filters = { q: "", anvandning: "", amne: "", stadium: "", materialtyp: "", verktyg: "" };
  let queue = "alla";
  const taxEntries = field => field === "stadium" ? ["forskola", "f3", "46", "79", "gy"].map(v => [v, tax[field][v]]) : Object.entries(tax[field]);
  function validEdits(edits) {
    return edits && typeof edits === "object" && !Array.isArray(edits) && Object.entries(edits).every(([f,v]) => {
      if (["anvandning", "amne", "stadium"].includes(f)) return Array.isArray(v) && v.every(x => typeof x === "string" && Object.hasOwn(tax[f], x));
      if (["materialtyp", "verktyg"].includes(f)) return typeof v === "string" && Object.hasOwn(tax[f], v);
      return f === "beskrivning" && typeof v === "string" && v.length >= 20 && v.length <= 500;
    });
  }
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "{}");
    // Validate stored drafts before using them as metadata or UI content.
    for (const [id, d] of Object.entries(saved)) {
      if (data.resurser.some(r => r.id === id) && ["godkand", "avvisad", "granska"].includes(d?.status) && typeof d.innehall_hash === "string" && validEdits(d.andringar) && typeof (d.notering || "") === "string") decisions[id] = d;
    }
  } catch { warning = "Kunde inte läsa lokala granskningsbeslut."; }
  function save() {
    try { localStorage.setItem(key, JSON.stringify(decisions)); return true; }
    catch { warning = "Webbläsaren kunde inte spara. Exportera besluten innan du lämnar sidan."; return false; }
  }
  function records() {
    return data.resurser.map(r => {
      const d = decisions[r.id];
      if (!d) return r;
      return { ...r, ...d.andringar, granskning: d.innehall_hash === r.innehall_hash && d.gransknings_hash === r.gransknings_hash ? d.status : "andrad", lokalt: true, redaktionella_falt: Object.keys(d.andringar) };
    });
  }
  const badge = r => `<span class="pilot-status ${r.granskning === "godkand" ? "approved" : ""}">${e(statuses[r.granskning] || "Ej granskat")}${r.lokalt ? " · lokalt" : ""}</span>`;
  const valueLabel = (field, value) => Array.isArray(value) ? value.map(v => tax[field]?.[v] || v).join(", ") || "Ej angivet" : tax[field]?.[value] || value || "Ej angivet";
  const source = r => `<a class="text-link" href="${e(r.url)}" target="_blank" rel="noopener noreferrer">${r.ankare ? "Öppna avsnittet" : "Öppna originalet"} ↗</a>`;
  function render(main) {
    main.innerHTML = `<section class="pilot"><div class="page-heading"><div><p class="eyebrow">Från källa till klassrum · Jönköpingspiloten</p><h1>Hitta rätt, en nivå djupare.</h1><p>En hel pedagogsida rymmer många bra idéer. Här provar vi att hitta de enskilda sidorna – och övningarna inuti dem.</p></div></div>
      <div class="pilot-intro"><div><span class="pilot-stamp">Verkliga källor · automatisk sortering</span><p>Det här är en öppen testyta. Kategorierna är regelförslag som behöver granskas. Den ordinarie resursbanken innehåller fortfarande de tidigare kuraterade resurserna.</p></div><div class="pilot-numbers"><span><strong>${data.statistik.sidor}</strong> sidor</span><span><strong>${data.statistik.avsnitt}</strong> avsnitt</span></div></div>
      <div class="pilot-toolbar"><div class="tabs" aria-label="Pilotens vy"><button class="tab ${mode === "sok" ? "active" : ""}" data-pilot-mode="sok" aria-pressed="${mode === "sok"}">Prova att hitta material</button><button class="tab ${mode === "granska" ? "active" : ""}" data-pilot-mode="granska" aria-pressed="${mode === "granska"}">Granska underlaget</button></div><span class="small-note">Insamlat ${e(data.resurser.map(r => r.hamtad.slice(0, 10)).sort().at(-1))}</span></div>
      <p id="pilot-message" role="status" class="pilot-message">${e(warning)}</p><div id="pilot-content"></div></section>`;
    if (mode === "sok") searchView(); else reviewView();
  }
  function searchView() {
    document.getElementById("pilot-content").innerHTML = `<div class="pilot-examples"><span>Börja med ett behov</span><button data-pilot-example="utan">Om AI · mellanstadiet · utan skärm</button><button data-pilot-example="matte">AI i matematik</button><button data-pilot-example="modeller">Pedagogiska tankemodeller</button></div>
      <form id="pilot-search-form" class="pilot-search"><label for="pilot-query">Vad letar du efter?</label><div><input id="pilot-query" name="q" type="search" value="${e(filters.q)}" placeholder="Till exempel matte, ECPA eller källkritik"><button class="button primary" type="submit">Sök material</button></div></form>
      <div class="pilot-filters">${Object.entries(labels).filter(([f]) => tax[f]).map(([field, label]) => `<label>${label}<select data-pilot-filter="${field}"><option value="">Alla / inget krav</option>${taxEntries(field).map(([v, t]) => `<option value="${v}" ${filters[field] === v ? "selected" : ""}>${e(t)} (${engine.facetCount(records(), filters, field, v, tax)})</option>`).join("")}</select></label>`).join("")}</div>
      <div class="pilot-filter-note"><span>Stadium och tid visas bara när källan anger dem. Antalen avser grupper av material.</span><button class="text-link" data-pilot-clear>Rensa sökning och filter</button></div><div id="pilot-results"></div>`;
    searchResults();
  }
  function card(r, reason) {
    return `<div class="pilot-hit">${badge(r)}<h3>${e(r.titel)}</h3><p>${e(r.beskrivning)}</p><div class="tags">${[valueLabel("materialtyp", r.materialtyp), ...r.stadium.map(v => tax.stadium[v]), ...(r.verktyg !== "okant" ? [tax.verktyg[r.verktyg]] : [])].map(t => `<span class="tag">${e(t)}</span>`).join("")}</div><p class="pilot-why">${e(reason)}</p><div class="pilot-hit-actions">${source(r)}<button class="text-link" data-pilot-inspect="${r.id}">Se kategorisering & källstöd</button></div></div>`;
  }
  function searchResults() {
    const result = engine.search(records(), filters, tax);
    const requirements = Object.keys(labels).filter(f => filters[f]).map(f => valueLabel(f, filters[f]));
    document.getElementById("pilot-results").innerHTML = `<div class="result-meta" role="status"><span><strong>${result.groups.length}</strong> materialgrupper · ${result.rows.length} matchande sidor och avsnitt</span><span>Pedagog Jönköping</span></div>${result.groups.length ? `<div class="pilot-results">${result.groups.map(group => {
      const children = group.rows.filter(r => r.niva === "avsnitt");
      const parentHit = group.rows.find(r => r.niva === "sida");
      const hits = children.length && Object.values(filters).some(Boolean) ? children : parentHit ? [parentHit] : children;
      return `<article class="pilot-group"><div class="pilot-group-label"><span>${children.length && hits[0]?.niva === "avsnitt" ? "Ur materialet" : "Sida hos"} ${e(hits[0]?.niva === "avsnitt" ? group.parent?.titel : "Pedagog Jönköping")}</span>${group.rows.length > 1 ? `<span>${group.rows.length} matchningar i samma material</span>` : ""}</div>${hits.map(r => card(r, requirements.length ? `Matchar dina val: ${requirements.join(" · ")}.` : filters.q ? `Matchar ”${filters.q}” i titel, sammanhang eller kategorier.` : r.niva === "avsnitt" ? "Ett eget avsnitt med länk till rätt plats i originalet." : "En egen sida, med möjlighet att granska kategoriseringen.")).join("")}${parentHit && children.length && hits[0]?.niva !== "avsnitt" ? `<details class="pilot-children"><summary>Visa ${children.length} övningar / upplägg i materialet</summary>${children.map(r => card(r, "Egen kategorisering för det här avsnittet.")).join("")}</details>` : ""}</article>`;
    }).join("")}</div>` : `<div class="pilot-empty"><h2>Inget säkert matchat material ännu.</h2><p>Det kan finnas bra material där stadium eller verktygskrav saknas. Prova färre filter eller granska underlaget för att komplettera uppgifterna.</p><button class="button" data-pilot-clear>Rensa sökning och filter</button></div>`}`;
  }
  function reviewView() {
    const all = records();
    const rows = all.filter(r => queue === "alla" || (queue === "gallrade" ? r.urval === "avvakta" : r.granskning === queue));
    const chosen = all.find(r => r.id === selected);
    document.getElementById("pilot-content").innerHTML = `<div class="pilot-review-intro"><div><h2>Hjälp nästa lärare att hitta rätt.</h2><p>Kontrollera originalet, justera kategorierna och fatta ett beslut. Dina ändringar sparas i den här webbläsaren. Exportera arbetsunderlaget för att ta med besluten tillbaka till repot.</p></div><button class="button" data-pilot-export ${Object.keys(decisions).length ? "" : "disabled"}>Exportera ${Object.keys(decisions).length} lokala beslut ↓</button></div><div class="pilot-review-layout"><section class="pilot-queue"><label>Visa i kön<select id="pilot-queue"><option value="alla">Alla ${all.length} kandidater</option>${["ej_granskad", "godkand", "avvisad", "granska", "andrad"].map(s => `<option value="${s}" ${queue === s ? "selected" : ""}>${statuses[s]} (${all.filter(r => r.granskning === s).length})</option>`).join("")}<option value="gallrade" ${queue === "gallrade" ? "selected" : ""}>Bortsorterade förslag (${all.filter(r => r.urval === "avvakta").length})</option></select></label><div class="pilot-queue-list">${rows.length ? rows.map(r => `<button class="pilot-queue-item ${selected === r.id ? "selected" : ""}" data-pilot-select="${r.id}" ${selected === r.id ? 'aria-current="true"' : ""}><span>${e(r.niva === "avsnitt" ? `Avsnitt · ${r.parent_titel}` : "Sida")}</span><strong>${e(r.titel)}</strong><small>${e(statuses[r.granskning])}${r.urval === "avvakta" ? " · bortsorterat förslag" : ""}</small></button>`).join("") : "<p>Inga kandidater i den här kön.</p>"}</div></section><section class="pilot-editor" id="pilot-editor" tabindex="-1">${chosen ? editor(chosen) : '<div class="pilot-editor-empty"><span>↖</span><h3>En människa behövs här.</h3><p>Välj en sida eller övning. Du får se vad insamlingen hittade, hur förslagen uppstod och vilka uppgifter som saknas.</p></div>'}</section></div>`;
  }
  function editor(r) {
    const original = data.resurser.find(x => x.id === r.id);
    const d = decisions[r.id];
    return `<p class="eyebrow">${e(r.niva === "avsnitt" ? "Avsnitt i " + r.parent_titel : "Enskild sida")}</p><h2>${e(r.titel)}</h2>${badge(r)}<div class="pilot-editor-source">${source(r)}<small>Källans datum: ${e(r.kallans_datum || "Ej angivet")} · Hämtad ${e(r.hamtad.slice(0, 10))}</small></div><p class="pilot-selection">${e(r.urvalsskal)}</p>
      <details class="pilot-evidence" open><summary>Varför dessa förslag?</summary><p>Regelbaserad kategorisering. ”Tolkning” är ett förslag, inte en uppgift från utgivaren. Ändrade fält får redaktionellt ursprung.</p><ul>${original.belagg.map(b => `<li><strong>${e(labels[b.falt] || b.falt)}: ${e(valueLabel(b.falt, b.varde))}</strong><span>${b.grund === "uttryckligt" ? "Källuppgift" : "Tolkning"} · ${e(b.plats)}</span>${b.utdrag ? `<q>${e(b.utdrag)}</q>` : ""}</li>`).join("")}</ul></details>
      <div class="pilot-unknown">${!r.stadium.length ? "Stadium saknas. " : ""}${!r.amne.length ? "Ämne är inte preciserat. " : ""}${!r.undervisningstid ? "Undervisningstid saknas; eventuell lästid används inte som lektionstid." : e(r.undervisningstid)}${r.niva === "avsnitt" && !r.ankare ? " Direktankare saknas – leta efter avsnittsrubriken på originalsidan." : ""}</div>
      <form id="pilot-review-form" data-id="${r.id}"><label class="form-field">Kort egen beskrivning<textarea name="beskrivning" minlength="20" maxlength="500" required>${e(r.beskrivning)}</textarea></label><div class="pilot-edit-fields">${["anvandning", "amne", "stadium"].map(field => `<fieldset><legend>${labels[field]}</legend>${taxEntries(field).map(([v, t]) => `<label><input type="checkbox" name="${field}" value="${v}" ${r[field].includes(v) ? "checked" : ""}> ${e(t)}</label>`).join("")}</fieldset>`).join("")}</div><div class="pilot-filters">${["materialtyp", "verktyg"].map(field => `<label>${labels[field]}<select name="${field}">${taxEntries(field).map(([v, t]) => `<option value="${v}" ${r[field] === v ? "selected" : ""}>${e(t)}</option>`).join("")}</select></label>`).join("")}</div><label class="form-field">Notering till arbetsgruppen<textarea name="notering" maxlength="2000" placeholder="Till exempel varför du ändrade stadium eller avvisade sidan">${e(d?.notering || "")}</textarea></label><label class="pilot-confirm"><input name="kontrollerat" type="checkbox"> Jag har kontrollerat originalet och uppgifterna jag godkänner.</label><div class="pilot-decision-buttons"><button class="button primary" type="submit" name="status" value="godkand">Godkänn lokalt</button><button class="button" type="submit" name="status" value="granska">Spara för vidare granskning</button><button class="text-link" type="submit" name="status" value="avvisad">Avvisa</button></div><p class="small-note">Godkännandet gäller ditt arbetsunderlag. Publicering i ordinarie katalog sker separat efter import och kontroll.</p>${d ? '<button class="text-link" type="button" data-pilot-undo>Ta bort mitt lokala beslut för denna resurs</button>' : ""}</form>`;
  }
  const refresh = () => render(document.getElementById("main"));
  function focusEditor() { document.getElementById("pilot-editor")?.focus({ preventScroll: true }); if (matchMedia("(max-width: 760px)").matches) document.getElementById("pilot-editor")?.scrollIntoView({ behavior: "smooth" }); }
  document.addEventListener("click", event => {
    const t = event.target.closest("button");
    if (!t) return;
    if (t.form?.id === "pilot-review-form" && t.type === "submit") t.form.elements.kontrollerat.setCustomValidity("");
    if (t.dataset.pilotMode) { mode = t.dataset.pilotMode; refresh(); }
    else if (t.hasAttribute("data-pilot-clear")) { filters = { q: "" }; refresh(); }
    else if (t.dataset.pilotExample) {
      filters = t.dataset.pilotExample === "utan" ? { q: "", anvandning: "om", stadium: "46", verktyg: "utan" } : t.dataset.pilotExample === "matte" ? { q: "", anvandning: "med", amne: "matematik" } : { q: "", materialtyp: "metod" };
      searchView();
    } else if (t.dataset.pilotInspect || t.dataset.pilotSelect) {
      selected = t.dataset.pilotInspect || t.dataset.pilotSelect; mode = "granska"; refresh(); focusEditor();
    } else if (t.hasAttribute("data-pilot-undo")) { delete decisions[selected]; save(); refresh(); focusEditor(); }
    else if (t.hasAttribute("data-pilot-export")) {
      const text = JSON.stringify({ version: 1, exporterad: new Date().toISOString(), beslut: decisions }, null, 2);
      const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
      const dialog = document.createElement("dialog");
      dialog.className = "pilot-export-dialog";
      dialog.setAttribute("aria-labelledby", "pilot-export-title");
      dialog.innerHTML = `<h2 id="pilot-export-title">Ta med granskningsbesluten</h2><p>Spara filen och lämna den till den som uppdaterar katalogen. Du kan också kopiera innehållet nedan till en JSON-fil.</p><a class="button primary" href="${e(url)}" download="jonkoping-granskning.json">Hämta JSON-filen ↓</a><label class="form-field">Exportens innehåll<textarea id="pilot-export-json" readonly>${e(text)}</textarea></label><form method="dialog"><button class="button">Stäng exporten</button></form>`;
      document.body.append(dialog);
      dialog.addEventListener("close", () => { URL.revokeObjectURL(url); dialog.remove(); }, { once: true });
      dialog.showModal();
    }
  });
  document.addEventListener("change", event => {
    const t = event.target;
    if (t.dataset.pilotFilter) { filters[t.dataset.pilotFilter] = t.value; searchView(); document.querySelector(`[data-pilot-filter="${t.dataset.pilotFilter}"]`)?.focus(); }
    else if (t.id === "pilot-queue") { queue = t.value; selected = null; reviewView(); document.getElementById("pilot-queue").focus(); }
  });
  document.addEventListener("submit", event => {
    const form = event.target;
    if (form.id === "pilot-search-form") { event.preventDefault(); filters.q = new FormData(form).get("q").trim(); searchView(); document.getElementById("pilot-query").focus(); }
    if (form.id !== "pilot-review-form") return;
    event.preventDefault();
    const values = new FormData(form), status = event.submitter?.value;
    if (!["godkand", "avvisad", "granska"].includes(status)) return;
    const confirmation = form.elements.kontrollerat;
    confirmation.setCustomValidity(status === "godkand" && !confirmation.checked ? "Bekräfta att du har kontrollerat originalet innan du godkänner." : "");
    if (!form.reportValidity()) { confirmation.addEventListener("change", () => confirmation.setCustomValidity(""), { once: true }); return; }
    const original = data.resurser.find(r => r.id === form.dataset.id);
    const proposed = { beskrivning: values.get("beskrivning"), materialtyp: values.get("materialtyp"), verktyg: values.get("verktyg"), ...Object.fromEntries(["anvandning", "amne", "stadium"].map(f => [f, values.getAll(f)])) };
    const edits = Object.fromEntries(Object.entries(proposed).filter(([f, v]) => JSON.stringify(v) !== JSON.stringify(original[f])));
    decisions[original.id] = { status, innehall_hash: original.innehall_hash, gransknings_hash: original.gransknings_hash, andringar: edits, notering: values.get("notering"), granskad: new Date().toISOString() };
    warning = save() ? "Beslutet är sparat i den här webbläsaren. Exportera för att ta med det till repot." : warning;
    refresh(); focusEditor();
  });
  window.AINAT_PILOT_UI = { render };
})();
