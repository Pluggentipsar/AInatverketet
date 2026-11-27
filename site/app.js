/* AI-nätverket — sök, filter, snabbvy, kommandopalett och Min lista. Inga beroenden. */
(() => {
  "use strict";

  const { taxonomi, katalog } = window.AINAT;
  const resurser = katalog.resurser;
  const perId = new Map(resurser.map((r) => [r.id, r]));

  const el = (id) => document.getElementById(id);
  const kortnat = el("kortnat");
  const sokfalt = el("sokfalt");

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[t]));

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

  // Ordstamsmatchning för svenska sammansättningar: "lektioner" träffar "lektionsmaterial".
  const delarStam = (ord, token) => {
    let i = 0;
    const max = Math.min(ord.length, token.length);
    while (i < max && ord[i] === token[i]) i++;
    return i >= 5 && i >= token.length - 3;
  };

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
      if (bast === 0) return 0;
      summa += bast;
    }
    return summa;
  };

  const tokenisera = (q) => {
    let tokens = vika(q.trim()).split(/[^a-z0-9]+/).filter(Boolean);
    const barande = tokens.filter((t) => t.length > 2 && !STOPP.has(t));
    return barande.length ? barande : tokens;
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

  /* ---------- Min lista (localStorage) ---------- */

  const lasSparade = () => {
    try { return new Set(JSON.parse(localStorage.getItem("ainat-lista") || "[]").filter((id) => perId.has(id))); }
    catch { return new Set(); }
  };
  let sparade = lasSparade();
  const skrivSparade = () => { try { localStorage.setItem("ainat-lista", JSON.stringify([...sparade])); } catch {} };

  const uppdateraListbadge = () => {
    const badge = el("lista-antal");
    badge.hidden = sparade.size === 0;
    badge.textContent = sparade.size;
  };

  const vaxlaSparad = (id) => {
    sparade.has(id) ? sparade.delete(id) : sparade.add(id);
    skrivSparade();
    uppdateraListbadge();
    for (const knapp of document.querySelectorAll(`[data-spara="${CSS.escape(id)}"]`)) {
      knapp.setAttribute("aria-pressed", String(sparade.has(id)));
      knapp.querySelector("use")?.setAttribute("href", sparade.has(id) ? "#ik-bokmarke-fylld" : "#ik-bokmarke");
    }
    if (el("qv").dataset.id === id) fyllQvSpara(id);
    if (el("lista").open) ritaLista();
  };

  const ritaLista = () => {
    el("lista-rubrik").textContent = sparade.size
      ? `${sparade.size} sparade ${sparade.size === 1 ? "resurs" : "resurser"}`
      : "Tomt här än";
    const rader = el("lista-rader");
    if (!sparade.size) {
      rader.innerHTML = `<p class="lista__tom">Spara resurser med bokmärket på korten, så samlas de här.</p>`;
      return;
    }
    rader.innerHTML = [...sparade].map((id) => {
      const r = perId.get(id);
      const mini = r.bild
        ? `<img class="mini" src="${esc(r.bild)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.outerHTML='<span class=&quot;mini--platta&quot;>${esc((r.titel || "?")[0])}</span>'">`
        : `<span class="mini--platta">${esc((r.titel || "?")[0])}</span>`;
      return `<div class="lista__rad">${mini}
        <span class="info"><b>${esc(r.titel)}</b><span>${esc(r.kalla_namn)} · ${esc(doman(r.url))}</span></span>
        <button class="bort" type="button" data-bort="${esc(id)}" aria-label="Ta bort ${esc(r.titel)}">×</button></div>`;
    }).join("");
  };

  /* ---------- Behovsingångar ---------- */

  const INGANGAR = [
    { ik: "kompass", titel: "Kom igång själv", text: "Guider och kurser som ger dig grunderna i din egen takt.", filter: { typ: ["guide", "kurs"] } },
    { ik: "tavla", titel: "Till klassrummet", text: "Färdiga lektioner och material om AI.", filter: { typ: ["lektionsmaterial", "video"] } },
    { ik: "verktyg", titel: "Verktyg att prova", text: "AI-tjänster byggda för skolan.", filter: { typ: ["verktyg"] } },
    { ik: "paragraf", titel: "Riktlinjer & juridik", text: "GDPR, policyer och vägledningar.", filter: { teman: ["juridik-gdpr"] } },
    { ik: "flagga", titel: "Leda & besluta", text: "För rektor och huvudman.", filter: { malgrupp: ["skolledare", "huvudman"] } },
    { ik: "bok", titel: "Följa & fördjupa", text: "Poddar, nyhetsbrev, bloggar och forskning.", filter: { typ: ["podd", "nyhetsbrev", "blogg", "forskning"] } },
  ];

  const raknaIngang = (filter) =>
    resurser.filter((r) => Object.entries(filter).every(([g, varden]) =>
      g === "kostnad" ? varden.includes(r.kostnad) : r[g].some((v) => varden.includes(v))
    )).length;

  const byggIngangar = () => {
    el("ingangar").innerHTML = INGANGAR.map((ing, i) => `
<button class="ingang" type="button" data-i="${i}" title="${esc(ing.text)}">
  <span class="ik" aria-hidden="true"><svg><use href="#ik-${ing.ik}"></use></svg></span>
  <b>${esc(ing.titel)}</b>
  <small>${raknaIngang(ing.filter)} resurser</small>
</button>`).join("");
    el("ingangar").addEventListener("click", (e) => {
      const knapp = e.target.closest(".ingang");
      if (!knapp) return;
      const ing = INGANGAR[Number(knapp.dataset.i)];
      state.q = "";
      for (const g of GRUPPER) state[g].clear();
      for (const [g, varden] of Object.entries(ing.filter)) state[g] = new Set(varden);
      synkaKontroller();
      rita();
      el("resultat").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

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
    const tokens = tokenisera(state.q);
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
    const kVar = `--k: var(--k-${esc(r.kalla)})`;
    const initial = (r.titel || "?").trim().charAt(0).toUpperCase();
    const bild = r.bild
      ? `<img src="${esc(r.bild)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"
           onerror="this.parentElement.classList.add('kort__media--miss')">`
      : "";
    const favicon = r.favicon
      ? `<img src="${esc(r.favicon)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.hidden=true">`
      : "";
    const sparad = sparade.has(r.id);
    return `
<article class="kort" style="--i:${Math.min(i, 11)}" data-id="${esc(r.id)}">
  <button class="kort__spara" type="button" data-spara="${esc(r.id)}" aria-pressed="${sparad}"
          title="${sparad ? "Ta bort från Min lista" : "Spara i Min lista"}" aria-label="Spara ${esc(r.titel)} i Min lista">
    <svg aria-hidden="true"><use href="${sparad ? "#ik-bokmarke-fylld" : "#ik-bokmarke"}"></use></svg>
  </button>
  <span class="kort__media${r.bild ? "" : " kort__media--miss"}" style="${kVar}" aria-hidden="true">
    ${bild}<span class="kort__platta"><b>${esc(initial)}</b></span>
  </span>
  <span class="kort__kropp">
    <span class="kort__topp">
      <span class="kalla" style="${kVar}">${esc(r.kalla_namn)}</span>
      ${stampel}
      <span class="kort__typ">${esc(typEtikett)}</span>
    </span>
    <h3><button class="kort__titel" type="button" data-qv="${esc(r.id)}">${esc(r.titel)}</button></h3>
    <p class="kort__beskrivning">${esc(r.beskrivning)}</p>
    <span class="kort__fot">${teman}${fler}
      <a class="kort__doman" href="${esc(r.url)}" target="_blank" rel="noopener" aria-label="Öppna ${esc(r.titel)} hos ${esc(doman(r.url))}">
        ${favicon}${esc(doman(r.url))} <svg aria-hidden="true"><use href="#ik-extern"></use></svg>
      </a>
    </span>
  </span>
</article>`;
  };

  const uppdateraDom = () => {
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

    const hopp = el("sok-hopp");
    hopp.hidden = !state.q.trim();
    hopp.textContent = lista.length
      ? `Visa ${lista.length} ${lista.length === 1 ? "träff" : "träffar"} ↓`
      : "Inga träffar — prova ett annat ord";

    for (const meny of document.querySelectorAll(".meny")) {
      const g = meny.dataset.grupp;
      const badge = meny.querySelector(".meny__antal");
      badge.hidden = state[g].size === 0;
      badge.textContent = state[g].size;
    }
    skrivUrl();
  };

  // Mjuk omritning med View Transitions där det stöds.
  const reduceradRorelse = matchMedia("(prefers-reduced-motion: reduce)");
  const rita = () => {
    if (document.startViewTransition && !reduceradRorelse.matches) document.startViewTransition(uppdateraDom);
    else uppdateraDom();
  };

  /* ---------- Snabbvyn (dialog) ---------- */

  const qv = el("qv");

  const fyllQvSpara = (id) => {
    const knapp = el("qv-spara");
    const sparad = sparade.has(id);
    knapp.innerHTML = `<svg aria-hidden="true"><use href="${sparad ? "#ik-bokmarke-fylld" : "#ik-bokmarke"}"></use></svg> ${sparad ? "Sparad i Min lista" : "Spara i Min lista"}`;
    knapp.setAttribute("aria-pressed", String(sparad));
  };

  const oppnaQv = (id) => {
    const r = perId.get(id);
    if (!r) return;
    qv.dataset.id = id;
    const media = el("qv-media");
    media.className = "qv__media" + (r.bild ? " har-bild" : "");
    media.innerHTML = r.bild
      ? `<img src="${esc(r.bild)}" alt="" referrerpolicy="no-referrer" onerror="this.parentElement.classList.remove('har-bild')">`
      : "";
    el("qv-topp").innerHTML =
      `<span class="kalla" style="--k: var(--k-${esc(r.kalla)})">${esc(r.kalla_namn)}</span>` +
      (r.kostnad !== "gratis" ? `<span class="kort__stampel">${esc(etikett("kostnad", r.kostnad))}</span>` : "") +
      `<span class="kort__typ">${esc(r.typ.map((t) => etikett("typ", t)).join(" · "))}</span>`;
    el("qv-titel").textContent = r.titel;
    el("qv-beskrivning").textContent = r.beskrivning;
    el("qv-taggar").innerHTML = [
      ...r.teman.map((t) => etikett("teman", t)),
      ...r.malgrupp.map((t) => etikett("malgrupp", t)),
      ...r.stadium.map((t) => etikett("stadium", t)),
    ].map((namn) => `<span class="tagg">${esc(namn)}</span>`).join("");
    const oppna = el("qv-oppna");
    oppna.href = r.url;
    fyllQvSpara(id);
    qv.showModal();
  };

  /* ---------- Kommandopaletten ---------- */

  const palett = el("palett");
  const palettInput = el("palett-input");
  const palettResultat = el("palett-resultat");
  let palettVal = 0;
  let palettTraffar = [];

  const ritaPalett = () => {
    const tokens = tokenisera(palettInput.value);
    palettTraffar = !tokens.length
      ? resurser.slice(0, 7)
      : index
          .map((post) => ({ post, p: poangsatt(post, tokens) }))
          .filter((x) => x.p > 0)
          .sort((a, b) => b.p - a.p)
          .slice(0, 8)
          .map((x) => x.post.r);
    palettVal = Math.min(palettVal, Math.max(0, palettTraffar.length - 1));
    palettResultat.innerHTML = palettTraffar.length
      ? palettTraffar.map((r, i) => `
<button class="palett__rad" type="button" role="option" aria-selected="${i === palettVal}" data-qv-palett="${esc(r.id)}">
  <span class="titel">${esc(r.titel)}</span>
  <span class="meta">${esc(r.kalla_namn)} · ${esc(etikett("typ", r.typ[0]))}</span>
</button>`).join("")
      : `<p class="palett__tom">Inga träffar på ”${esc(palettInput.value)}”.</p>`;
  };

  const oppnaPalett = () => {
    palettInput.value = "";
    palettVal = 0;
    ritaPalett();
    palett.showModal();
    palettInput.focus();
  };

  palettInput.addEventListener("input", () => { palettVal = 0; ritaPalett(); });
  palettInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); palettVal = Math.min(palettVal + 1, palettTraffar.length - 1); ritaPalett(); }
    if (e.key === "ArrowUp") { e.preventDefault(); palettVal = Math.max(palettVal - 1, 0); ritaPalett(); }
    if (e.key === "Enter" && palettTraffar[palettVal]) {
      palett.close();
      oppnaQv(palettTraffar[palettVal].id);
    }
  });

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      palett.open ? palett.close() : oppnaPalett();
    }
  });

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

  /* ---------- Händelser ---------- */

  document.addEventListener("click", (e) => {
    const spara = e.target.closest("[data-spara]");
    if (spara) { vaxlaSparad(spara.dataset.spara); return; }
    const bort = e.target.closest("[data-bort]");
    if (bort) { vaxlaSparad(bort.dataset.bort); return; }
    const palettRad = e.target.closest("[data-qv-palett]");
    if (palettRad) { palett.close(); oppnaQv(palettRad.dataset.qvPalett); return; }
    const stang = e.target.closest("[data-stang]");
    if (stang) { stang.closest("dialog")?.close(); return; }
    const kort = e.target.closest(".kort");
    if (kort && !e.target.closest("a")) { oppnaQv(kort.dataset.id); return; }
    if (!e.target.closest(".meny")) for (const meny of document.querySelectorAll(".meny[open]")) meny.open = false;
  });

  // Klick på backdrop stänger dialogen.
  for (const dialog of document.querySelectorAll("dialog")) {
    dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
  }

  el("qv-spara").addEventListener("click", () => { const id = qv.dataset.id; if (id) vaxlaSparad(id); });

  el("nav-lista").addEventListener("click", () => { ritaLista(); el("lista").showModal(); });
  el("lista-rensa").addEventListener("click", () => {
    sparade.clear(); skrivSparade(); uppdateraListbadge(); ritaLista(); rita();
  });
  el("lista-kopiera").addEventListener("click", async () => {
    const text = [...sparade].map((id) => { const r = perId.get(id); return `${r.titel}\n${r.url}`; }).join("\n\n");
    const knapp = el("lista-kopiera");
    try { await navigator.clipboard.writeText(text); knapp.textContent = "Kopierat!"; }
    catch { knapp.textContent = "Kunde inte kopiera"; }
    setTimeout(() => { knapp.textContent = "Kopiera alla länkar"; }, 1600);
  });

  el("oppna-palett").addEventListener("click", oppnaPalett);

  let timer;
  sokfalt.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => { state.q = sokfalt.value; rita(); }, 70);
  });
  sokfalt.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { state.q = ""; sokfalt.value = ""; rita(); }
    if (e.key === "Enter") { state.q = sokfalt.value; rita(); el("resultat").scrollIntoView({ behavior: "smooth", block: "start" }); }
  });
  el("sok-hopp").addEventListener("click", () => el("resultat").scrollIntoView({ behavior: "smooth", block: "start" }));

  el("rensa-sok").addEventListener("click", () => { state.q = ""; sokfalt.value = ""; sokfalt.focus(); rita(); });
  el("rensa-allt").addEventListener("click", rensaAllt);
  el("tomt-rensa").addEventListener("click", rensaAllt);

  /* ---------- Init ---------- */

  byggChips("typ", el("chips-typ"));
  byggChips("teman", el("chips-teman"));
  for (const meny of document.querySelectorAll(".meny")) byggMeny(meny);
  byggIngangar();
  uppdateraListbadge();

  const datum = new Date(katalog.uppdaterad + "T12:00:00").toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });
  const kallor = new Set(resurser.map((r) => r.kalla_namn)).size;
  el("hero-pill").innerHTML = `<em>${resurser.length}</em> granskade resurser från <em>${kallor}</em> källor`;
  el("fot-meta").textContent = `${resurser.length} resurser · Senast uppdaterad ${datum} · Alla länkar kontrollerade`;

  lasUrl();
  synkaKontroller();
  uppdateraDom();
})();
