// Hämtar presentationsmetadata (delningsbild + favicon) för varje aktiv resurs i katalogen.
// Resultatet är genererad data och hålls skilt från den kuraterade katalogen.
// Körning: node scripts/hamta-metadata.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const rot = join(dirname(fileURLToPath(import.meta.url)), "..");
const katalog = JSON.parse(readFileSync(join(rot, "data", "katalog.json"), "utf8"));
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36 AInatverketet-metadata/1.0";

// Endast https-adresser behålls — sajten serveras över https och blandat innehåll blockeras.
const absolutHttps = (varde, bas) => {
  try {
    const url = new URL(varde, bas);
    return url.protocol === "https:" ? url.href : null;
  } catch { return null; }
};

const attribut = (tagg) => {
  const ut = {};
  for (const m of tagg.matchAll(/([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) ut[m[1].toLowerCase()] = m[3] ?? m[4];
  return ut;
};

const plocka = (html, bas) => {
  let bild = null, favicon = null, touch = null;
  for (const m of html.matchAll(/<meta\s[^>]*>/gi)) {
    const a = attribut(m[0]);
    const namn = (a.property || a.name || "").toLowerCase();
    if (!bild && (namn === "og:image" || namn === "og:image:secure_url" || namn === "twitter:image") && a.content) {
      bild = absolutHttps(a.content.trim(), bas);
    }
  }
  for (const m of html.matchAll(/<link\s[^>]*>/gi)) {
    const a = attribut(m[0]);
    const rel = (a.rel || "").toLowerCase();
    if (!a.href) continue;
    if (rel.includes("apple-touch-icon") && !touch) touch = absolutHttps(a.href.trim(), bas);
    else if (rel.split(/\s+/).includes("icon") && !favicon) favicon = absolutHttps(a.href.trim(), bas);
  }
  if (!favicon) favicon = absolutHttps("/favicon.ico", bas);
  return { bild, favicon: touch || favicon };
};

const hamta = async (r) => {
  try {
    const svar = await fetch(r.url, {
      redirect: "follow",
      signal: AbortSignal.timeout(25000),
      headers: { "User-Agent": UA, "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.5" },
    });
    if (!svar.ok) return { id: r.id };
    const html = (await svar.text()).slice(0, 400000);
    return { id: r.id, ...plocka(html, svar.url) };
  } catch { return { id: r.id }; }
};

const aktiva = katalog.resurser.filter((r) => r.status !== "dod-lank");
const metadata = {};
const ko = [...aktiva];
await Promise.all(Array.from({ length: 6 }, async () => {
  for (let r; (r = ko.shift()); ) {
    const m = await hamta(r);
    metadata[m.id] = { bild: m.bild ?? null, favicon: m.favicon ?? null };
    process.stdout.write(m.bild ? "." : "o");
  }
}));
console.log("\n");

const sorterad = Object.fromEntries(Object.keys(metadata).sort().map((k) => [k, metadata[k]]));
writeFileSync(join(rot, "data", "metadata.json"), JSON.stringify({ uppdaterad: new Date().toISOString().slice(0, 10), resurser: sorterad }, null, 2) + "\n");
const medBild = Object.values(sorterad).filter((m) => m.bild).length;
console.log(`data/metadata.json: ${Object.keys(sorterad).length} resurser, ${medBild} med delningsbild.`);
