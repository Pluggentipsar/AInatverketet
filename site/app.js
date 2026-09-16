/* AI-nätverket — sök, filter och rendering. Ingen byggkedja, inga beroenden. */
(() => {
  "use strict";

  const { taxonomi, katalog } = window.AINAT;
  const resurser = katalog.resurser;

  const el = (id) => document.getElementById(id);
  const kortnat = el("kortnat");
  const sokfalt = el("sokfalt");

  const esc = (s) =>
    s.replace(/[&<>"']/g, (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[t]));

  const etikett = (grupp, slug) => taxonomi[grupp]?.[slug] ?? slug;

  const doman = (url) => {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
  };

  /* ---------- Fuzzy-sök ---------- */

  const vika = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  // Småord som inte ska krävas i sökningen ("lektioner om bias" → "lektioner", "bias").
  const STOPP = new Set(["om", "och", "i", "pa", "for", "att", "med", "en", "ett", "av", "till", "det", "den", "de", "ar", "hur", "vad", "du", "din", "dina", "ska", "kan", "som", "vid"]);

  // Tillåter ett stavfel: insättning, borttagning, byte eller omkastning (skolverkte → skolverket).
  const nastanLika = (a, b) => {
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0, j = 0, fel = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++fel > 1) return false;
      if (a[i] === b[j + 1] && a[i + 1] === b[j]) { i += 2; j += 2; }
      else if (a.length > b.length) i++;
      else if (b.length > a.length) j++;
      else { i++; j++; }
    }
    return fel + (a.length - i) + (b.length - j) <= 1;
  };

  // Ordstamsmatchning för svenska sammansättningar: "lektioner" träffar "lektionsmaterial"
  // om orden delar en tillräckligt lång början.
  const delarStam = (ord, token) => {
    let i = 0;
    const max = Math.min(ord.length, token.length);
    while (i < max && ord[i] === token[i]) i++;
    return i >= 5 && i >= token.length - 3;
  };

  // Förberedda sökfält per resurs: [text, vikt]
  const index = resurser.map((r) => ({
    r,
    falt: [
      [vika(r.titel), 3],
      [vika(r.kalla_namn), 2.2],
      [vika([...r.teman.map((t) => etikett("teman", t)), ...r.typ.map((t) => etikett("typ", t))].join(" ")), 2],
      [vika(doman(r.url)), 1.6],
      [vika(r.beskrivning), 1],
    ].map(([text, vikt]) => ({ text, ord: text.split(/[^a-z0-9]+/).filter(Boolean), vikt })),
  }));

  const poangsatt = (post, tokens) => {
    let summa = 0;
    for (const token of tokens) {
      let bast = 0;
      for (const { text, ord, vikt } of post.falt) {
        let traff = 0;
        if (ord.some((o) => o.startsWith(token))) traff = 1;
        else if (text.includes(token)) traff = 0.7;
        else if (token.length >= 5 && ord.some((o) => delarStam(o, token))) traff = 0.5;
        else if (token.length >= 5 && ord.some((o) => nastanLika(o, token))) traff = 0.45;
        if (traff * vikt > bast) bast = traff * vikt;
      }
      if (bast === 0) return 0; // alla sökord måste träffa någonstans
      summa += bast;
    }
    return summa;
  };

  /* ---------- Tillstånd ---------- */

  const GRUPPER = ["typ", "teman", "malgrupp", "stadium", "kostnad"];
  const state = { q: "", typ: new Set(), teman: new Set(), malgrupp: new Set(), stadium: new Set(), kostnad: new Set() };

  const lasUrl = () => {
    const p = new URLSearchParams(location.search);
    state.q = p.get("q") ?? "";
    for (const g of GRUPPER) {
      state[g] = new Set((p.get(g) ?? "").split(",").filter((v) => v in taxonomi[g]));
    }
  };

  const skrivUrl = () => {
    const p = new URLSearchParams();
    if (state.q) p.set("q", state.q);
    for (const g of GRUPPER) if (state[g].size) p.set(g, [...state[g]].join(","));
    const qs = p.toString();
    history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
  };

  const aktivaFilter = () => GRUPPER.some((g) => state[g].size > 0);

  /* ---------- Filtrering ---------- */

  const matchar = (r) => {
    if (state.typ.size && !r.typ.some((v) => state.typ.has(v))) return false;
    if (state.teman.size && !r.teman.some((v) => state.teman.has(v))) return false;
    if (state.malgrupp.size && !r.malgrupp.some((v) => state.malgrupp.has(v))) return false;
    if (state.stadium.size && !r.stadium.some((v) => state.stadium.has(v))) return false;
    if (state.kostnad.size && !state.kostnad.has(r.kostnad)) return false;
    return true;
  };

  const urval = () => {
    let tokens = vika(state.q.trim()).split(/[^a-z0-9]+/).filter(Boolean);
    const barande = tokens.filter((t) => t.length > 2 && !STOPP.has(t));
    if (barande.length) tokens = barande;
    let lista = index.filter(({ r }) => matchar(r));
    if (tokens.length) {
      lista = lista
        .map((post) => ({ post, p: poangsatt(post, tokens) }))
        .filter((x) => x.p > 0)
        .sort((a, b) => b.p - a.p)
        .map((x) => x.post);
    }
    return lista.map(({ r }) => r);
  };

  /* ---------- Rendering ---------- */

  const kortHtml = (r, i) => {
    const typEtikett = r.typ.slice(0, 2).map((t) => etikett("typ", t)).join(" · ");
    const teman = r.teman.slice(0, 3).map((t) => `<span class="tagg">${esc(etikett("teman", t))}</span>`).join("");
    const fler = r.teman.length > 3 ? `<span class="tagg">+${r.teman.length - 3}</span>` : "";
    const stampel = r.kostnad !== "gratis" ? `<span class="kort__stampel">${esc(etikett("kostnad", r.kostnad))}</span>` : "";
    return `
<a class="kort" style="--i:${Math.min(i, 11)}" href="${esc(r.url)}" target="_blank" rel="noopener">
  <span class="kort__topp">
    <span class="kalla" style="--k: var(--k-${esc(r.kalla)})">${esc(r.kalla_namn)}</span>
    ${stampel}
    <span class="kort__typ">${esc(typEtikett)}</span>
  </span>
  <h3>${esc(r.titel)}</h3>
  <p class="kort__beskrivning">${esc(r.beskrivning)}</p>
  <span class="kort__fot">${teman}${fler}<span class="kort__doman">${esc(doman(r.url))}</span></span>
</a>`;
  };

  const rita = () => {
    const lista = urval();
    kortnat.innerHTML = lista.map(kortHtml).join("");
    el("tomt").hidden = lista.length > 0;

    const antal = el("antal");
    antal.innerHTML =
      lista.length === 0
        ? ""
        : state.q.trim() || aktivaFilter()
          ? `Visar <em>${lista.length}</em> av ${resurser.length} resurser`
          : `<em>${resurser.length}</em> handgranskade resurser — sök eller filtrera för att hitta ditt`;

    el("rensa-sok").hidden = !state.q;
    el("rensa-allt").hidden = !aktivaFilter();

    for (const meny of document.querySelectorAll(".meny")) {
      const g = meny.dataset.grupp;
      const badge = meny.querySelector(".meny__antal");
      badge.hidden = state[g].size === 0;
      badge.textContent = state[g].size;
    }
    skrivUrl();
  };

  /* ---------- Kontroller ---------- */

  const byggChips = (grupp, behallare) => {
    behallare.innerHTML = Object.entries(taxonomi[grupp])
      .map(([slug, namn]) => `<button class="chip" type="button" data-v="${slug}" aria-pressed="false">${esc(namn)}</button>`)
      .join("");
    behallare.addEventListener("click", (e) => {
      const knapp = e.target.closest(".chip");
      if (!knapp) return;
      const v = knapp.dataset.v;
      state[grupp].has(v) ? state[grupp].delete(v) : state[grupp].add(v);
      knapp.setAttribute("aria-pressed", state[grupp].has(v));
      rita();
    });
  };

  const byggMeny = (meny) => {
    const g = meny.dataset.grupp;
    meny.querySelector(".meny__lista").innerHTML = Object.entries(taxonomi[g])
      .map(([slug, namn]) => `<label><input type="checkbox" value="${slug}"> ${esc(namn)}</label>`)
      .join("");
    meny.addEventListener("change", (e) => {
      e.target.checked ? state[g].add(e.target.value) : state[g].delete(e.target.value);
      rita();
    });
    meny.addEventListener("toggle", () => {
      if (meny.open) for (const annan of document.querySelectorAll(".meny[open]")) if (annan !== meny) annan.open = false;
    });
  };

  const synkaKontroller = () => {
    sokfalt.value = state.q;
    for (const chip of document.querySelectorAll(".chip[data-v]")) {
      const grupp = chip.closest("#chips-typ") ? "typ" : "teman";
      chip.setAttribute("aria-pressed", state[grupp].has(chip.dataset.v));
    }
    for (const meny of document.querySelectorAll(".meny")) {
      const g = meny.dataset.grupp;
      for (const box of meny.querySelectorAll("input")) box.checked = state[g].has(box.value);
    }
  };

  const rensaAllt = () => {
    state.q = "";
    for (const g of GRUPPER) state[g].clear();
    synkaKontroller();
    rita();
  };

  /* ---------- Init ---------- */

  byggChips("typ", el("chips-typ"));
  byggChips("teman", el("chips-teman"));
  for (const meny of document.querySelectorAll(".meny")) byggMeny(meny);

  let timer;
  sokfalt.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => { state.q = sokfalt.value; rita(); }, 70);
  });
  sokfalt.addEventListener("keydown", (e) => { if (e.key === "Escape") { state.q = ""; sokfalt.value = ""; rita(); } });

  el("rensa-sok").addEventListener("click", () => { state.q = ""; sokfalt.value = ""; sokfalt.focus(); rita(); });
  el("rensa-allt").addEventListener("click", rensaAllt);
  el("tomt-rensa").addEventListener("click", rensaAllt);

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".meny")) for (const meny of document.querySelectorAll(".meny[open]")) meny.open = false;
  });

  const datum = new Date(katalog.uppdaterad + "T12:00:00").toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });
  el("ingress-stat").innerHTML = `Just nu <strong>${resurser.length} handplockade resurser</strong> från myndigheter, kommuner, lärosäten och lärare.`;
  el("fot-meta").textContent = `${resurser.length} resurser · Senast uppdaterad ${datum}`;

  lasUrl();
  synkaKontroller();
  rita();
})();
