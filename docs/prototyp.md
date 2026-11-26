# AI-nätverket – klickbar framtidsskiss

Prototypen är ett samtalsunderlag inför nästa nätverksträff. Den visar hur
resurskatalogen kan bli en mötesplats för människor som utforskar AI och lärande.
Den är inte en överenskommen kravspecifikation eller en färdig communitytjänst.

## Öppna prototypen

Delbar version: https://mellow-summit-4fhe.here.now/ (publicerad på here.now).
Prototypen ligger på startsidan och originalkatalogen under `/katalog/index.html`.

Kör `node scripts/serve.mjs` från repots rot och öppna
http://localhost:4173/prototyp/index.html.

Den ursprungliga katalogen finns kvar på http://localhost:4173.
Hela `site/` kan fortfarande publiceras som statiska filer. Använd den fullständiga
adressen `prototyp/index.html` med den medföljande utvecklingsservern.

## Ett förslag på rundtur, 15–20 minuter

1. **Översikten:** Ger de fyra ingångarna en begriplig bild av nätverket?
2. **Resursbanken:** Sök efter exempelvis `lektioner om bias` eller `skolverkte`.
   Filtrera och spara en resurs. Öppna originalkällan vid behov.
3. **Lektionsbanken:** Växla mellan undervisning **om AI** och lärande **med AI**.
   Öppna ett upplägg och diskutera lärandemål, förberedelser, steg och reflektion.
   Prova formuläret **Dela en lektion**.
4. **Samtalsforum:** Öppna en tråd, skriv ett demosvar och prova att starta en ny.
5. **Träffas & prata:** Öppna samtalet om AI och språk den 20 september 2026,
   kl. 13–14. Boka och avboka en demoplats. Prova kalendern och skapa en träff.
6. **Mitt hörn:** Här finns sparat material, egna demoanmälningar och lokala bidrag.
   Ett resurstips hamnar i en illustrerad lokal granskningskö.
7. **Om nätverket:** Diskutera riktningen och markera frågor att ta upp. Valen är
   personliga och lokala, inte en gemensam omröstning.

## Frågor att fatta beslut om

- **Första lanseringen:** Ska katalogen och en enkel tipsfunktion komma först?
  När finns tid att faktiskt värda ett forum och återkommande samtal?
- **Kuratering:** Vem granskar, utifrån vilka kriterier och hur ofta?
- **Lektionsdelning:** Vad måste finnas med? Hur skiljer vi idéer från genomförda
  upplägg, och hur ger vi utrymme åt reflektion och kollegial respons?
- **Identitet och gemenskap:** Vad är öppet att läsa? Vad kräver konto? Hur gör
  vi det lätt att börja delta utan att skapa en stor administrativ börda?
- **Samtal:** Vem får vara värd, hur hanteras inställda eller fullbokade träffar
  och vilken befintlig mötestjänst passar?
- **Hållbarhet:** Vem förvaltar innehåll, teknik och medlemsdialog över tid?

## Vad som är verkligt och vad som är exempel

| Del | I prototypen |
| --- | --- |
| Resursbank | Läser det befintliga `site/data.js`, genererat från katalog och taxonomi. |
| Sökning och filter | Fungerar lokalt, inklusive enkel fuzzy-sökning och ämnes-/stadiefilter. |
| Lektionsbank | Sex fiktiva exempel; de är inte rapporter från genomförda lektioner. |
| Forum | Fem fiktiva trådar med exempelsvar; egna svar sparas lokalt. |
| Träffar | Fyra exempel i september 2026, lista/kalender, platsantal och demoanmälan. |
| Dela innehåll | Formulär för resurstips, lektioner, trådar och träffar skapar lokala utkast. |
| Mitt hörn | Bokmärken, demobokningar och egna utkast i samma webbläsare. |
| Profil | En enda lokal demoanvändare, ingen riktig inloggning. |
| Granskningskö | Resurstips visas som lokalt väntande; inget skickas till en moderator. |
| Utskrift | Lektionssidor har utskriftsanpassning via webbläsarens utskriftsdialog. |

Inga riktiga inlägg publiceras, inga e-postmeddelanden skickas och inga riktiga
videomöten bokas. Det finns ingen gemensam databas, filuppladdning eller moderering.
AI-sammanfattningar och automatisk länkkontroll är fortfarande framtida funktioner.

## Struktur och fortsatt arbete

```text
site/prototyp/index.html    Sidans ram, navigation och dialogbehållare
site/prototyp/stil.css      Papperstoner, falurött, illustrationernas miljö och responsivitet
site/prototyp/demo.js       Fiktiva personer, lektioner, trådar och träffar
site/prototyp/app.js        Hash-navigation, vyer, sökning, formulär och lokal lagring
```

Prototypen har inga paketberoenden eller byggsteg. Typografin använder Google Fonts
med lokala systemtypsnitt som reserv. Illustrationerna är egen SVG-kod.

Lokal lagring använder nyckeln `ainat-prototyp-v1`. **Om nätverket → Återställ min
prototyp** tar bort just prototypens provdata efter bekräftelse. Katalogens filer
påverkas inte. Om webbläsaren blockerar lagring fungerar sidan under sessionen och
visar en notis när ändringar inte kan sparas permanent.

Att bygga en riktig tjänst kräver beslut om konton, datalagring, behörigheter,
moderering, innehållsansvar, filhantering och mötestjänst. De delarna är avsiktligt
inte valda genom den här skissen.
