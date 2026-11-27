# Automatiken: hur sidan hålls levande

Uppdaterad 2026-11-27. Principen genom hela kedjan: **maskiner hämtar och föreslår,
människor beslutar.** Ingenting publiceras utan att en människa godkänt det.

## Flödet

```
Källor ──► Insamlare ──► Kandidater ──► Granskning ──► Katalog ──► Sajt
(sajter)  (skript)      (förslag +     (människor,     (data/       (statisk,
                         källstöd)      Gransknings-    katalog.json) bildsatt)
                                        rummet)
```

## Delarna som finns idag

| Skript | Gör | Rytm |
|---|---|---|
| `scripts/samla_pilot.py` | Hämtar sidor från en källa (artigt: robots.txt, paus, storleksgräns) och föreslår kandidater på sid- och avsnittsnivå med källstöd. | Per källa, vid behov |
| `scripts/bygg-granskning.mjs` | Bygger Granskningsrummet — delad sida där redaktionen röstar och kommenterar; besluten läses därifrån. | Inför möte |
| `scripts/bygg-katalog.mjs` | Validerar mot taxonomin, deduplicerar på URL, slår ihop till katalogen. | Vid intag |
| `scripts/kontrollera-lankar.mjs` | Kontrollerar varje länk, sätter `senast_kontrollerad` och status; döda länkar göms från sajten men ligger kvar för granskning. | Veckovis (mål) |
| `scripts/hamta-metadata.mjs` | Hämtar delningsbild (og:image) och favicon per resurs till `data/metadata.json`. Endast https; saknas bild får kortet en egen monogramplatta. | Efter katalogändring |
| `scripts/bygg-site-data.mjs` | Bygger `site/data.js` av katalog + taxonomi + metadata, filtrerar bort döda länkar. | Efter katalogändring |

Körordning vid uppdatering:

```
node scripts/kontrollera-lankar.mjs
node scripts/hamta-metadata.mjs
node scripts/bygg-site-data.mjs
```

## Det som återstår (steg 5)

1. **Inlämningsformulär** på sajten → kandidater hamnar i en granskningskö, aldrig direkt i katalogen.
2. **Schemalagt jobb** (t.ex. GitHub Actions, veckovis): länkkoll + metadata + ombygge, och en körning av
   insamlaren mot utvalda källor för att upptäcka nytt — allt som förslag till kön.
3. **Granskningsrundor**: kön töms i Granskningsrummet; godkänt förs in via `bygg-katalog.mjs`.

## Hållningar

- **Bilder hotlänkas, kopieras inte.** Delningsbilder är gjorda för att visas vid länkning;
  försvinner en bild faller kortet tillbaka till monogramplattan av sig självt.
- **Genererad data skiljs från kuraterad.** `data/metadata.json` kan alltid slängas och
  hämtas om; `data/katalog.json` är redaktionens verk och ändras bara genom beslut.
- **Länkröta är ett förstaklassproblem.** En katalog med 404:or dör; länkkollen är inte valfri.
