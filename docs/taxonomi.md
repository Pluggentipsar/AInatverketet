# Taxonomi och urvalskriterier

Det här dokumentet definierar vad som får plats i katalogen och hur allt kategoriseras.
Det är projektets viktigaste dokument: kurateringen är produkten.

## Urvalskriterier (constraints)

En resurs indexeras om **alla** dessa stämmer:

1. **Svensk relevans.** På svenska, eller med tydlig svensk skolkontext. Internationella
   resurser (t.ex. verktyg) tas bara med om de har svenskt gränssnitt eller uppenbart
   bred användning i svensk skola.
2. **AI och skola — båda.** Generella AI-nyheter utan skolkoppling: nej.
   Allmän skoldigitalisering utan AI: nej.
3. **Öppen tillgång.** Innehållsresurser ska gå att nå utan inloggning eller betalvägg.
   Verktyg får vara freemium/betalda men märks då med `kostnad`.
4. **Beständig adress.** Stabila URL:er. Enskilda inlägg i sociala medier: nej.
   Stabila kanaler, grupper och spellistor: ja.
5. **Inte ren marknadsföring.** Produktsidor utan pedagogiskt innehåll: nej.
   Ett verktyg som faktiskt används i skolan är dock en giltig resurs (`typ: verktyg`).

**Aktualitet:** AI-fältet rör sig fort. Verktygsguider äldre än ~2 år ska granskas extra;
teori och forskning åldras långsammare. Fältet `senast_kontrollerad` (fylls i av det
framtida schemalagda jobbet) håller koll på länkröta.

## Granularitet

Vi indexerar **både sajter och enskilda sidor**:

- En hel sajt/hubb (t.ex. en pedagogsajts AI-tema) → `typ: samling` eller `blogg`.
- En enskild lektion, guide eller riktlinje → djuplänk till just den sidan.

Tumregel: djuplänka när det specifika innehållet är värdet; sajtnivå när helheten är resursen.
Samma sajt kan förekomma både som samling och med enstaka djuplänkar om innehållet motiverar det.

## Fält och kontrollerade vokabulärer

Maskinvärden är ascii-slugs (inga åäö) — visningsnamn finns i `data/taxonomi.json`.

| Fält | Typ | Värden |
|---|---|---|
| `id` | sträng | unik kebab-slug, t.ex. `skolverket-ai-i-undervisningen` |
| `titel` | sträng | resursens namn |
| `url` | sträng | verifierad, kanonisk adress |
| `beskrivning` | sträng | 150–250 tecken, saklig svenska |
| `typ` | array | `samling` `verktyg` `guide` `lektionsmaterial` `kurs` `riktlinjer` `forskning` `blogg` `podd` `video` `natverk` `nyhetsbrev` |
| `malgrupp` | array | `larare` `skolledare` `huvudman` `elever` `vardnadshavare` `alla` |
| `stadium` | array | `forskola` `grundskola` `gymnasium` `vux` `hogskola` `alla` |
| `teman` | array | se temalistan nedan |
| `kalla` | sträng | `myndighet` `kommun` `region` `larosate` `organisation` `foretag` `privatperson` `media` |
| `kalla_namn` | sträng | t.ex. "Skolverket", "Jönköpings kommun" |
| `sprak` | sträng | `sv` `en` |
| `kostnad` | sträng | `gratis` `freemium` `betald` |
| `tillagd` | datum | ISO-datum när resursen togs in |
| `status` | sträng | `aktiv` `granskas` `dod-lank` |

### Teman

| Slug | Betyder |
|---|---|
| `ai-litteracitet` | Grundförståelse: vad AI är och inte är |
| `prompting` | Att skriva och förbättra promptar |
| `kallkritik-mik` | Källkritik, medie- och informationskunnighet |
| `etik-bias` | Etik, bias, rättvisa |
| `juridik-gdpr` | GDPR, upphovsrätt, juridik |
| `bedomning` | Bedömning och betygssättning med/om AI |
| `akademisk-integritet` | Fusk, plagiat, AI-detektering |
| `lektionsplanering` | AI som stöd i planering |
| `differentiering-stod` | Anpassningar, särskilt stöd, specialpedagogik |
| `sprakutveckling` | Språkundervisning, flerspråkighet |
| `bild-video` | Generativ media: bild, video, ljud |
| `programmering-teknik` | Teknik, programmering, hur AI fungerar |
| `ledning-strategi` | Skolledning, huvudmannastrategi, implementation |
| `kompetensutveckling` | Kurser, fortbildning |
| `forskning-teori` | Forskning, rapporter, teori |

Vokabulärerna är medvetet korta. Nya värden läggs till i `data/taxonomi.json` först —
fria taggar utan definition är förbjudna, annars förfaller sökbarheten.
