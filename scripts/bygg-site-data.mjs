// Genererar site/data.js från data/katalog.json + data/taxonomi.json.
// Körs efter varje katalogändring: node scripts/bygg-site-data.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const rot = join(dirname(fileURLToPath(import.meta.url)), "..");
const katalog = JSON.parse(readFileSync(join(rot, "data", "katalog.json"), "utf8"));
const taxonomi = JSON.parse(readFileSync(join(rot, "data", "taxonomi.json"), "utf8"));

// Döda länkar stannar i katalogfilen för granskning men publiceras aldrig.
const bortfiltrerade = katalog.resurser.filter((r) => r.status === "dod-lank").length;
katalog.resurser = katalog.resurser.filter((r) => r.status !== "dod-lank");
katalog.antal = katalog.resurser.length;
if (bortfiltrerade) console.log(`Filtrerade bort ${bortfiltrerade} resurser med status dod-lank.`);

// Presentationsmetadata (delningsbild, favicon) från scripts/hamta-metadata.mjs, om den körts.
try {
  const metadata = JSON.parse(readFileSync(join(rot, "data", "metadata.json"), "utf8")).resurser;
  for (const r of katalog.resurser) {
    const m = metadata[r.id];
    if (m?.bild) r.bild = m.bild;
    if (m?.favicon) r.favicon = m.favicon;
  }
} catch { console.log("Ingen data/metadata.json — sajten byggs utan delningsbilder."); }

mkdirSync(join(rot, "site"), { recursive: true });
writeFileSync(
  join(rot, "site", "data.js"),
  "// Genererad av scripts/bygg-site-data.mjs — redigera inte för hand.\n" +
    "window.AINAT = " + JSON.stringify({ taxonomi, katalog }) + ";\n"
);
console.log(`site/data.js: ${katalog.resurser.length} resurser, uppdaterad ${katalog.uppdaterad}.`);
