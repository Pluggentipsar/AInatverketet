// Färskhetskoll av katalogen: hämtar varje resurs-URL, uppdaterar senast_kontrollerad
// och sätter status (aktiv | granskas | dod-lank). Ändrar aldrig URL:er själv —
// omdirigeringar och fel rapporteras för manuellt beslut.
// Körning: node scripts/kontrollera-lankar.mjs [--dry-run]
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const rot = join(dirname(fileURLToPath(import.meta.url)), "..");
const stig = join(rot, "data", "katalog.json");
const katalog = JSON.parse(readFileSync(stig, "utf8"));
const torrkorning = process.argv.includes("--dry-run");
const idag = new Date().toISOString().slice(0, 10);

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36 AInatverketet-lankkoll/1.0";

// Jämför URL:er med överseende för protokoll, www och avslutande snedstreck.
const normaliserad = (u) => {
  const url = new URL(u);
  return (url.host.replace(/^www\./, "") + url.pathname.replace(/\/+$/, "") + url.search).toLowerCase();
};

const kontrollera = async (resurs) => {
  const styr = AbortSignal.timeout(25000);
  try {
    const svar = await fetch(resurs.url, {
      redirect: "follow",
      signal: styr,
      headers: { "User-Agent": UA, "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.5" },
    });
    const flyttad = normaliserad(svar.url) !== normaliserad(resurs.url);
    if (svar.ok) return { utfall: flyttad ? "omdirigerad" : "ok", kod: svar.status, slutUrl: svar.url };
    if (svar.status === 404 || svar.status === 410) return { utfall: "dod", kod: svar.status };
    return { utfall: "fel", kod: svar.status };
  } catch (e) {
    return { utfall: "natverksfel", kod: e.name === "TimeoutError" ? "timeout" : (e.cause?.code ?? e.message) };
  }
};

// Begränsad parallellism av artighet mot källorna.
const SAMTIDIGA = 6;
const ko = [...katalog.resurser];
const resultat = [];
await Promise.all(
  Array.from({ length: SAMTIDIGA }, async () => {
    for (let r; (r = ko.shift()); ) {
      const utfall = await kontrollera(r);
      resultat.push({ r, ...utfall });
      process.stdout.write(utfall.utfall === "ok" ? "." : "!");
    }
  })
);
console.log("\n");

const grupper = { omdirigerad: [], dod: [], fel: [], natverksfel: [] };
for (const { r, utfall, kod, slutUrl } of resultat) {
  r.senast_kontrollerad = idag;
  if (utfall === "ok" || utfall === "omdirigerad") r.status = "aktiv";
  else if (utfall === "dod") r.status = "dod-lank";
  else r.status = "granskas";
  if (utfall !== "ok") grupper[utfall].push({ id: r.id, url: r.url, kod, slutUrl });
}

const ok = resultat.filter((x) => x.utfall === "ok").length;
console.log(`OK: ${ok} av ${resultat.length}`);
for (const [namn, lista] of Object.entries(grupper)) {
  if (!lista.length) continue;
  console.log(`\n${namn.toUpperCase()} (${lista.length}):`);
  for (const p of lista) console.log(`  ${p.id} [${p.kod}] ${p.url}${p.slutUrl ? `\n    -> ${p.slutUrl}` : ""}`);
}

if (!torrkorning) {
  katalog.uppdaterad = idag;
  writeFileSync(stig, JSON.stringify(katalog, null, 2) + "\n");
  console.log(`\ndata/katalog.json uppdaterad (senast_kontrollerad = ${idag}).`);
} else {
  console.log("\nTorrkörning — inget skrevs.");
}
