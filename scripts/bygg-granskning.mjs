// Bygger Granskningsrummet: injicerar pilotkandidater + katalogbeslut i mallen.
// Körning: node scripts/bygg-granskning.mjs <utfil.html>
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const rot = join(dirname(fileURLToPath(import.meta.url)), "..");
const utfil = process.argv[2];
if (!utfil) { console.error("Ange utfil: node scripts/bygg-granskning.mjs <utfil.html>"); process.exit(1); }

const kandidater = JSON.parse(readFileSync(join(rot, "data", "pilot", "kandidater.json"), "utf8"));
const pilotTax = JSON.parse(readFileSync(join(rot, "data", "pilot", "taxonomi.json"), "utf8"));
const katalog = JSON.parse(readFileSync(join(rot, "data", "katalog.json"), "utf8"));

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[t]));

// Slimmade kandidatposter — bara det granskarna behöver se.
const resurser = kandidater.resurser.map((r) => ({
  id: r.id,
  titel: r.titel,
  url: r.url,
  sid_url: r.sid_url,
  niva: r.niva,
  parent_titel: r.parent_titel,
  beskrivning: r.beskrivning,
  beskrivning_grund: r.beskrivning_grund,
  kallans_datum: r.kallans_datum,
  anvandning: r.anvandning,
  amne: r.amne,
  stadium: r.stadium,
  verktyg: r.verktyg,
  materialtyp: r.materialtyp,
  urval: r.urval,
  urvalsskal: r.urvalsskal,
  belagg: (r.belagg || []).map((b) => ({ falt: b.falt, varde: b.varde, grund: b.grund, plats: b.plats, utdrag: b.utdrag ? String(b.utdrag).slice(0, 220) : undefined })),
  gransknings_hash: r.gransknings_hash,
}));

// Katalogbeslut: de döda länkarna, med efterforskningsläget från 2026-11-26.
const doda = Object.fromEntries(katalog.resurser.filter((r) => r.status === "dod-lank").map((r) => [r.id, r]));
const beslutDef = [
  {
    id: "beslut-pedagog-stockholm",
    kalla: "pedagog-stockholm-sa-anvander-du-ai",
    html: `Pedagog Stockholms vägledning svarar 404 och är <b>borttagen hos källan</b> — den finns varken
      på <a href="https://pedagog.stockholm/ai/" target="_blank" rel="noopener">deras AI-sida</a> eller i
      webbplatskartan. Stadens två andra sidor finns kvar i katalogen. Rimligt förslag: stryk.`,
  },
  {
    id: "beslut-skolverket-amne",
    kalla: "skolverket-amne-artificiell-intelligens",
    html: `Skolverkets sida om AI-ämnet i gymnasieskolan svarar 404. Den låg under "tidigare förändringar"
      och är troligen städad nu när ämnet funnits sedan 2024 — men det gick inte att bekräfta maskinellt.
      Någon behöver söka manuellt på <a href="https://www.skolverket.se" target="_blank" rel="noopener">skolverket.se</a>:
      finns en ny sida om ämnet, eller stryker vi?`,
  },
  {
    id: "beslut-tekniska-museet",
    kalla: "tekniska-museet-framtidens-manniska",
    html: `Tekniska museets skolprogram "Framtidens människa" är borta ur programlistan. Museet har en ny
      skolsajt med två möjliga ersättare:
      <a href="https://skola.tekniskamuseet.se/start/skolbesok/ai-en-immersiv-resa-in-i-framtiden-3d/" target="_blank" rel="noopener">AI – en immersiv resa in i framtiden 3D</a> (åk 7–9/gy, Wisdome) och
      <a href="https://skola.tekniskamuseet.se/utstallningar/hyper-human/" target="_blank" rel="noopener">Hyper Human</a> (utställningsvisning om AI, genredigering och bioteknik).
      Ersätter vi med någon av dem, eller stryker vi?`,
  },
];
const beslut = beslutDef.map((b) => {
  const r = doda[b.kalla];
  return { id: b.id, titel: r ? r.titel : b.kalla, html: `<i>${esc(r ? r.beskrivning : "")}</i><br><br>${b.html}` };
});

const DATA = { tax: pilotTax, resurser, beslut, byggd: new Date().toISOString().slice(0, 10) };

const mall = readFileSync(join(rot, "scripts", "granskning-mall.html"), "utf8");
const json = JSON.stringify(DATA).replace(/</g, "\\u003c");
writeFileSync(utfil, mall.replace("__DATA__", json));
console.log(`${utfil}: ${resurser.length} kandidater + ${beslut.length} katalogbeslut (${Math.round(json.length / 1024)} kB data).`);
