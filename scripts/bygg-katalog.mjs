// Slår ihop research-agenternas delresultat till data/katalog.json + data/osakra.json.
// Validerar mot data/taxonomi.json, deduplicerar på normaliserad URL och rapporterar avvikelser.
// Körning: node scripts/bygg-katalog.mjs <delfil1.json> <delfil2.json> ...
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const rot = join(dirname(fileURLToPath(import.meta.url)), "..");
const taxonomi = JSON.parse(readFileSync(join(rot, "data", "taxonomi.json"), "utf8"));

const OBLIGATORISKA = ["id", "titel", "url", "beskrivning", "typ", "malgrupp", "stadium", "teman", "kalla", "kalla_namn", "sprak", "kostnad", "tillagd", "status"];

const normUrl = (u) => u.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "").toLowerCase();

const fel = [];
const validera = (r, kallfil) => {
  for (const f of OBLIGATORISKA) if (r[f] == null || r[f].length === 0) fel.push(`${kallfil} ${r.id ?? r.url}: saknar ${f}`);
  const enumKoll = (falt, varden) => {
    for (const v of Array.isArray(r[falt]) ? r[falt] : [r[falt]]) {
      if (!(v in taxonomi[falt === "teman" ? "teman" : falt])) fel.push(`${kallfil} ${r.id}: okänt ${falt}-värde "${v}"`);
    }
  };
  enumKoll("typ"); enumKoll("malgrupp"); enumKoll("stadium"); enumKoll("teman");
  enumKoll("kalla"); enumKoll("sprak"); enumKoll("kostnad"); enumKoll("status");
  if (r.beskrivning && (r.beskrivning.length < 100 || r.beskrivning.length > 300)) {
    fel.push(`${kallfil} ${r.id}: beskrivning ${r.beskrivning.length} tecken (riktmärke 150–250)`);
  }
};

const perUrl = new Map(); // normaliserad url -> resurs (först vinner; dubbletter loggas)
const seddaId = new Set();
const osakra = [];
const dubbletter = [];

for (const fil of process.argv.slice(2)) {
  const del = JSON.parse(readFileSync(fil, "utf8"));
  for (const r of del.resurser ?? []) {
    validera(r, fil);
    const nyckel = normUrl(r.url);
    if (perUrl.has(nyckel)) { dubbletter.push(`${r.id} (${r.url}) = ${perUrl.get(nyckel).id}`); continue; }
    while (seddaId.has(r.id)) r.id += "-2"; // id-krock utan url-krock: gör unikt
    seddaId.add(r.id);
    perUrl.set(nyckel, r);
  }
  for (const o of del.osakra ?? []) {
    if (![...perUrl.keys()].includes(normUrl(o.url)) && !osakra.some((x) => normUrl(x.url) === normUrl(o.url))) osakra.push(o);
  }
}

const resurser = [...perUrl.values()].sort((a, b) => a.id.localeCompare(b.id, "sv"));
writeFileSync(join(rot, "data", "katalog.json"), JSON.stringify({ uppdaterad: "2026-08-18", antal: resurser.length, resurser }, null, 2) + "\n");
writeFileSync(join(rot, "data", "osakra.json"), JSON.stringify({ uppdaterad: "2026-08-18", kandidater: osakra }, null, 2) + "\n");

console.log(`Katalog: ${resurser.length} resurser. Granskningskö: ${osakra.length}.`);
if (dubbletter.length) console.log(`Dubbletter (hoppade över):\n  ${dubbletter.join("\n  ")}`);
if (fel.length) { console.log(`Valideringsavvikelser:\n  ${fel.join("\n  ")}`); process.exitCode = 1; }
