// Genererar site/data.js från data/katalog.json + data/taxonomi.json.
// Körs efter varje katalogändring: node scripts/bygg-site-data.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const rot = join(dirname(fileURLToPath(import.meta.url)), "..");
const katalog = JSON.parse(readFileSync(join(rot, "data", "katalog.json"), "utf8"));
const taxonomi = JSON.parse(readFileSync(join(rot, "data", "taxonomi.json"), "utf8"));

mkdirSync(join(rot, "site"), { recursive: true });
writeFileSync(
  join(rot, "site", "data.js"),
  "// Genererad av scripts/bygg-site-data.mjs — redigera inte för hand.\n" +
    "window.AINAT = " + JSON.stringify({ taxonomi, katalog }) + ";\n"
);
console.log(`site/data.js: ${katalog.resurser.length} resurser, uppdaterad ${katalog.uppdaterad}.`);
