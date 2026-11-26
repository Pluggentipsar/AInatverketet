# Jönköpingspiloten

Implementerad 2026-09-16. En avgränsad insamlare och ett sök-/granskningsgränssnitt
för att diskutera hur en kuraterad katalog kan arbeta på sid- och avsnittsnivå.

## Prova tillsammans

Öppna [piloten på here.now](https://mellow-summit-4fhe.here.now/index.html#/pilot),
eller kör `node scripts/serve.mjs` och öppna
`http://localhost:4173/prototyp/index.html#/pilot`.

1. Välj **Om AI · mellanstadiet · utan skärm**. Övning 1 i *AI-vänner i
   klassrummet* matchar. Övriga övningar får inte ärva dess målgrupp.
2. Välj **AI i matematik**. Två utvecklade upplägg visas tillsammans, med
   matematiksidan som sammanhang. Välj sedan åk 4–6: inga säkra träffar, eftersom
   källan inte anger stadium för uppläggen.
3. Välj **Pedagogiska tankemodeller** för att hitta ECPA och Processkrivning 2.0.
4. Öppna **Se kategorisering & källstöd**. Skilj mellan uttryckliga källuppgifter,
   regelbaserade tolkningar och sådant som saknas.
5. Korrigera, godkänn, avvisa eller spara för vidare granskning. Besluten sparas
   endast i den aktuella webbläsaren och kan exporteras som JSON.

## Vad som faktiskt är insamlat

- 25 sidor från Pedagog Jönköping: 12 valda startadresser och 13 upptäckta länkar.
- 13 avsnitt: sju övningar om AI-relationer samt två lektionsupplägg vardera
  från matematik, engelska och biologi.
- 38 kandidater totalt. Nyhetsarkivet sorteras bort som listningssida och finns
  kvar i granskningskön. Sökningen visar 37 poster grupperade under 24 sidor.
- 31 korta beskrivningar är egna, skrivna pilotutkast. Övriga använder en enkel
  beskrivningsmall. Beskrivningarna är inte hämtad fulltext och inte godkännanden.
- Inga poster har redaktionellt godkänts i repot. `godkanda.json` är därför tom.
  Den ordinarie katalogens 65 resurser ändras inte av piloten.

Urvalet testar strukturen; det är inte en fullständig inventering av webbplatsen
eller ett mått på hur stor del av allt relevant material som har hittats.

## Köra insamlingen

Python 3.11+ och Node behövs. Inga paket eller API-nycklar behövs.

```powershell
# Hämta nya sidor, återanvänd redan hämtade sidor från cache.
python scripts/samla_pilot.py

# Kontrollera också tidigare hämtade sidor mot källan.
python scripts/samla_pilot.py --refresh

# Utveckla extraktion och kategorisering utan nya nätverksanrop.
python scripts/samla_pilot.py --offline

# Bygg webbdata från incheckade kandidater och granskningsbeslut, utan cache/nätverk.
python scripts/samla_pilot.py --build
```

`data/pilot/kalla.json` anger källa, tillåtna sökvägar, startadresser, högsta antal
sidförsök (25) och paus (1,2 sekunder). Insamlaren följer länkar från sidornas
huvudområde. Den hämtar robots.txt, hanterar wildcardregler och crawl-delay,
kontrollerar omdirigeringar mot samma tillåtna källa och begränsar sidstorlek.
Parametriserade adresser och externa sajter följs inte. Det finns ännu ingen
sitemap-import, schemaläggare eller generell adapter för andra CMS.

HTML och hämtmetadata sparas lokalt i den gitignorerade `.cache/jonkoping/`.
`--refresh` använder ETag/Last-Modified när källan ger sådana uppgifter.
Ett hämtnings- eller extraktionsfel stoppar ersättningen av kandidatdata;
diagnostiken finns då i `.cache/jonkoping/fel.json`. En 404 blir alltså inte ett
automatiskt redaktionellt avvisande. Körningen kan upprepas efter kontroll.

## Data och granskning

| Fil | Innehåll |
| --- | --- |
| `data/pilot/kandidater.json` | Automatiska metadataförslag, källstöd, sidrelationer och upptäcktshistorik. |
| `data/pilot/taxonomi.json` | Pilotens kontrollerade kategorier, separat från originalkatalogens schema. |
| `data/pilot/beskrivningar.json` | Egna beskrivningsutkast, bundna till den källversion som lästes. |
| `data/pilot/granskning.json` | Importerade redaktörsbeslut. Insamlingen skriver aldrig över filen. |
| `data/pilot/godkanda.json` | Export av enbart godkända poster vars granskning fortfarande gäller. |
| `site/prototyp/pilot-data.js` | Offentlig förhandsvisning av metadata, tydligt märkt som ogranskad pilot. |

Exportera besluten från granskningsvyn och importera den sparade filen:

```powershell
python scripts/samla_pilot.py --import-review "C:\sökväg\jonkoping-granskning.json"
```

Hela filen valideras före skrivning: identifierare, beslut, kontrollerade
kategorier, beskrivningslängd och versionshashar. Därefter slås besluten ihop med
tidigare beslut. Andra resurser behåller sina beslut. URL, källstöd och
identifierare kan inte skrivas över genom formuläret.

Källinnehåll och granskningsunderlag har separata hashvärden. Ändrad källtext,
beskrivning eller kategorisering markerar ett gammalt beslut som **ändrat** och
tar bort posten från `godkanda.json` tills den granskats igen. Redaktörens ändrade
fält bevaras och får redaktionellt ursprung. Äldre beskrivningsutkast används inte
automatiskt för en ny innehållsversion.

Den offentliga testytan visar även ogranskade förslag för att arbetsgruppen ska
kunna diskutera dem. Den ordinarie resursbanken tar inte in dem automatiskt.
Beslut och noteringar i en deltagares webbläsare är inte gemensamma. Om flera
personer granskar samma resurs behöver ansvarig redaktör jämföra deras exporter;
vid import vinner det senast importerade beslutet för samma identifierare.

## Regler och praktiska begränsningar

- Extraktionen använder Sitevisions `pagecontent` och utesluter navigation,
  relaterade kort, sidfot och skript. Relaterade länkar kan fortfarande upptäckas.
- Både vanliga övningsrubriker och expanderbara lektionskort stöds. Direktlänkar
  får endast ankare som faktiskt finns i HTML. Saknas ankare visas sidlänken.
- Stadium hämtas från uttryckliga målgruppsrader. ”Mellanstadiet och uppåt” ger
  mellanstadiet som säker målgrupp; senare stadier lämnas till redaktören.
- Ämne är för närvarande konservativt: det kommer från en tydlig ämnessiderubrik.
  Ett omnämnande i en text räcker inte för att ämnestagga hela sidan.
- Undervisningstid används bara från en särskild tidsrad i rätt avsnitt.
  Lästid och tid som råkar finnas i en rubrik används inte som lektionstid.
- Kategoriseringen är enkla lokala regler, inte en språkmodell. Relevansregeln är
  grov. En nyhet om AI kan vara värd att upptäcka utan att vara lektionsmaterial.
- Sökningen använder titel, egen beskrivning, sammanhang och kategorier samt
  några synonymer. Den söker inte i publicerad fulltext och är inte semantisk.
- Originalkatalogens `bygg-katalog.mjs` används inte i detta flöde. Dess tidigare
  identifierade skriv-/sammanslagningsrisker återstår att åtgärda före en framtida
  integration med den vanliga katalogen. Pilotens godkända export har ett eget schema.

## Verifiering och nästa bedömning

```powershell
python -m unittest discover -s scripts -p test_pilot.py
node --test scripts/test-pilot-search.mjs
```

Testerna täcker extraktion, verifierade ankare, avsnittens egna förutsättningar,
URL/robotsregler, bevarade redaktörsändringar, felhantering, importvalidering,
godkänd export samt filtrering och gruppering. Tio konkreta sökfall ingår.

Detta är utvecklarformulerade regressionstester. Arbetsgruppen behöver fortfarande
göra en oberoende relevansbedömning: vilka poster är användbara, vad saknas och vilka
förväntade träffar kommer bland de första fem? Använd dessa svar för att förbättra
reglerna innan fler källor ansluts eller en språkmodell läggs till.
