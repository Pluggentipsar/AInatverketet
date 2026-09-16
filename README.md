# AI-nätverket

Ett nav för AI och pedagogik i svensk skola: en kuraterad, sökbar katalog över det bästa
som redan finns (myndigheter, kommuner, privatpersoner, verktyg, lektionsmaterial) — och
på sikt en plats att dela och tänka tillsammans.

## Status

- [x] **Steg 1 — Taxonomi & urvalskriterier**: se [docs/taxonomi.md](docs/taxonomi.md)
- [x] **Steg 2 — Fröet**: handkuraterad startkatalog i [data/katalog.json](data/katalog.json)
- [x] **Steg 3 — Frontend med fuzzy-sök**: statisk sajt i [site/](site/), ingen byggkedja, inga beroenden
- [ ] Steg 4 — AI-sammanfattningar och taggning per resurs
- [ ] Steg 5 — Inlämningsformulär + schemalagt jobb med modereringskö och dödlänkskoll
- [ ] Steg 6 — Community/forum

## Struktur

```
docs/taxonomi.md            Urvalskriterier och kategorisering — projektets grunddokument
data/taxonomi.json          Kontrollerade vokabulärer (maskinvärden -> visningsnamn)
data/katalog.json           Katalogen: alla resurser
data/osakra.json            Kandidater som inte kunde verifieras — manuell granskningskö
scripts/bygg-katalog.mjs    Validerar och slår ihop nya resurser till katalogen
scripts/bygg-site-data.mjs  Genererar site/data.js från katalogen
scripts/serve.mjs           Lokal utvecklingsserver för sajten
site/                       Sajten: statisk HTML/CSS/JS med klientsidig fuzzy-sök
```

## Köra sajten lokalt

```
node scripts/serve.mjs
```

Öppna sedan http://localhost:4173. Efter ändringar i `data/katalog.json`:
kör `node scripts/bygg-site-data.mjs` för att uppdatera sajtens data.

Sajten är helt statisk — för publicering, peka Vercel/Netlify/GitHub Pages
på mappen `site/` som publiceringskatalog.

## Principer

1. **Kurateringen är produkten.** Allt i katalogen är verifierat och relevant. Hellre kort och pålitlig än lång och skräpig.
2. **Länka, återpublicera inte.** Kort egen sammanfattning + länk. Trafiken går till upphovspersonerna.
3. **Inga fria taggar.** Nya kategorivärden definieras i `data/taxonomi.json` innan de används.
