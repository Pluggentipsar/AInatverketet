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

## Klickbar framtidsskiss

Publicerad på here.now: **https://mellow-summit-4fhe.here.now/**

Öppna **http://localhost:4173/prototyp/index.html** för en utökad prototyp med
resursbank, lektionsbank (om och med AI), forum, träffkalender och sparat material.
Den ursprungliga katalogen finns kvar på startsidan.

Prototypen återanvänder katalogens 65 resurser. Personer, lektioner, forumtrådar
och träffar är tydligt märkta exempel. Nya bidrag, bokmärken och demoanmälningar
sparas endast lokalt i webbläsaren; inget publiceras eller skickas till andra.
Ingen backend eller installation behövs.

Se [docs/prototyp.md](docs/prototyp.md) för ett förslag på rundtur inför nästa
nätverksträff, diskussionsfrågor och tekniska avgränsningar.

Sajten är helt statisk — för publicering, peka Vercel/Netlify/GitHub Pages
på mappen `site/` som publiceringskatalog.

## Indexeringspilot: Pedagog Jönköping

Under **Indexeringspilot** i prototypen kan ni söka bland 25 verkliga sidor och
13 avsnitt, filtrera utifrån lärarens behov och granska kategoriförslagen.
Insamlaren finns i `scripts/samla_pilot.py`. Den använder Python utan extra paket.
Den ordinarie katalogen påverkas inte av pilotens insamling eller lokala beslut.

Se [docs/jonkopingspiloten.md](docs/jonkopingspiloten.md) för rundtur,
körkommandon, granskningsimport, tester och kvarvarande begränsningar.

## Principer

1. **Kurateringen är produkten.** Allt i katalogen är verifierat och relevant. Hellre kort och pålitlig än lång och skräpig.
2. **Länka, återpublicera inte.** Kort egen sammanfattning + länk. Trafiken går till upphovspersonerna.
3. **Inga fria taggar.** Nya kategorivärden definieras i `data/taxonomi.json` innan de används.
