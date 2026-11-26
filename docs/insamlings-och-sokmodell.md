# Förslag: från källsajter till användbara sökträffar

Underlag 2026-09-16. En avgränsad del är nu implementerad i
[Jönköpingspiloten](jonkopingspiloten.md). Det här dokumentet beskriver den vidare
målbilden; pilotdokumentet anger vad som fungerar idag. Den ordinarie taxonomin
och katalogen ändras inte av piloten.

## Utgångspunkt

Repot har sex poster från Pedagog Jönköping, huvudsakligen övergripande ingångar.
`scripts/bygg-katalog.mjs` validerar och slår ihop indatafiler. Det upptäcker eller
hämtar inte webbsidor. Nästa steg är därför en insamlingsprocess som kan hitta
enskilda resurser och lämna granskningsbara förslag till katalogen.

Två olika beslut måste hållas isär:

1. Vilka sidor är värda att undersöka och ta in?
2. Vilka godkända resurser hjälper den här läraren med den aktuella uppgiften?

## 1. Tre nivåer, med relationer

- **Källa:** Pedagog Jönköping, med ansvarig utgivare och tillåtna ingångar.
- **Resurs:** En självständig sida, till exempel Matematik eller ECPA.
- **Delresurs:** En användbar övning eller ett upplägg på en större sida.

Översiktssidor kan finnas kvar som samlingar. En specifik sökning bör normalt
prioritera den relevanta sidan eller övningen och samtidigt visa sammanhanget.
En sökning efter en introduktion eller hela materialpaketet kan i stället
prioritera samlingen.

Lagra `kalla_id`, `parent_id`, originaltitel, kanonisk URL och vid behov
`avsnittsrubrik` samt ett kontrollerat ankare. Hitta inte på fragmentidentifierare.
Om sidan saknar ett stabilt ankare: länka till sidan och ange vilken rubrik som
läraren ska leta efter. Parentrelationer ska styrkas av navigation eller innehåll,
inte enbart av URL-strukturen.

En sida delas endast när delarna går att beskriva och använda var för sig.
Hämtning och ändringskontroll sker fortfarande per sida. Delresurserna behöver
egna stabila identifierare men inte egna nätverksanrop.

## 2. Konkreta exempel från Pedagog Jönköping

Klassificeringen nedan är vårt förslag, baserat på sidornas innehåll. Den är inte
utgivarens egen kategorisering.

| Källa/sida | Föreslagen presentation | Användarens behov |
| --- | --- | --- |
| [Lära om AI](https://pedagog.jonkoping.se/ai/lara-om-ai) | Introduktion/fortbildning för pedagoger, med koppling till dess undersidor. | Jag vill förstå AI själv. |
| [Pedagogiska tankemodeller](https://pedagog.jonkoping.se/ai/ai-i-arbetsrummet---pedagogisk-planering/pedagogiska-tankemodeller) | Samling som leder till separata modellbeskrivningar. | Jag vill utveckla min undervisningsdesign. |
| [ECPA](https://pedagog.jonkoping.se/ai/ai-i-arbetsrummet---pedagogisk-planering/pedagogiska-tankemodeller/ecpa---enskilt-chatbot-par-alla) | Egen metodresurs, relaterad till samlingen med tankemodeller. | Jag vill strukturera elevers arbete med AI. |
| [Matematik](https://pedagog.jonkoping.se/ai/ai-i-klassrummet---lararhandledning/lektionsingangar-for-ditt-amne/matematik) | Ämnessida med snabba idéer och två mer utvecklade upplägg. De senare kan bli delresurser. | Jag vill hitta ett sätt att arbeta med AI i matematik. |
| [AI-vänner i klassrummet](https://pedagog.jonkoping.se/ai/lektionsmaterial-ai/ai-vanner-i-klassrummet) | Ett materialpaket med sju övningar. Övningarnas förutsättningar behöver beskrivas var för sig. | Jag vill undervisa om AI och relationer. |

Exempel på varför avsnittsnivån spelar roll: övning 1 i AI-vänner anges fungera
från mellanstadiet och utan digitala verktyg. Övning 2 anges passa högstadiet och
gymnasiet och kan använda digitala verktyg eller förberedda exempel. Metadata för
den ena övningen får inte spridas till hela paketet.

Även huvudinnehåll behöver skiljas från kringmaterial. Exempelvis innehåller
matematiksidan också relaterade nyheter och blogginlägg. Deras teman och datum
ska inte bli matematiksidans ämnen eller uppdateringsdatum.

## 3. Metadata som svarar på lärarens frågor

Behåll befintliga fält för källa, språk, kostnad och teman. Pröva följande
utökningar på pilotmaterialet innan nya värden införs i `data/taxonomi.json`:

| Fråga | Förslag på fält/innehåll |
| --- | --- |
| Vad vill jag göra? | `anvandning`: förstå AI själv, undervisa om AI, använda AI med elever, planera med AI, leda utveckling. Flera värden kan gälla. |
| Vad får jag? | `materialtyp`: övning, lektionsupplägg, metod/tankemodell, introduktion, reflektion/erfarenhet, riktlinje, forskning, samling. |
| Vilket ämne och stadium? | Kontrollerade ämnesvärden och mer preciserade stadier, plus uttryckligt ämnesövergripande innehåll. |
| Vad får eleverna öva? | Kort beskrivning av lärandeaktivitet/förmåga, till exempel resonera, granska, revidera eller ge respons. |
| Hur genomförs det? | Verktygsanvändning: inget digitalt verktyg, läraren demonstrerar, elever använder AI, flera alternativa genomföranden, ej angivet. |
| Vad behöver jag förbereda? | Förberedelser och eventuella kontokrav, endast när de är dokumenterade. |
| Hur lång tid? | Undervisningstid separat från lästid och lärarens förberedelsetid. Ange uppskattning bara som uttrycklig uppskattning. |
| Vilken form? | Format som webbsida, PDF, video eller ljud, separat från materialets pedagogiska funktion. |
| Hur vet ni detta? | Källstöd och granskningsstatus per metadatafält. |

En resurs kan både handla om AI och använda AI. Två uteslutande OM/MED-kategorier
räcker därför inte för hela katalogen. Fortbildning, planering och skolutveckling
behöver också rymmas.

**Okänt är inte samma sak som alla.** Saknas årskurs, kontokrav eller tid ska det
framgå. Blanda inte källans uttryckliga uppgifter med AI-förslag eller en
redaktörs bedömning. Ett senare granskat kompletteringsförslag kan vara användbart,
men ska ha egen provenance och får inte presenteras som utgivarens uppgift.

## 4. Förslag på insamlingsflöde

1. **Upptäck:** konfigurerade källor, deras webbplatskartor där sådana finns och
   utvalda ingångssidor. För Jönköping: undersök AI-området samt relevanta nyheter
   och blogginlägg. Externa länkar blir nya kandidater, inte automatiskt godkända
   källor. Följ robotsregler, begränsa anropsfrekvens och använd cache.
2. **Hämta:** spara hämtad URL, slutlig URL, eventuell canonical, HTTP-resultat,
   tidpunkt och metadata från källan. Hantera omdirigeringar och timeout separat.
3. **Extrahera:** titel, introduktion, huvudtext, avsnitt, länkar och sidans egna
   datum. Ta bort menyer, kontaktblock, sidfot och relaterade kort innan
   relevansbedömning. Spara sidkontext utan att låta den ersätta huvudinnehållet.
4. **Gallra:** tillämpa projektets urvalskriterier. AI ska ha en meningsfull roll i
   resursens pedagogiska innehåll; en träff i navigeringen räcker inte. Skilj
   användbara resurser från tagglistor, dubbletter och gamla anmälningssidor.
5. **Föreslå:** klassificering, kort egen sammanfattning och möjliga delresurser.
   Automatisk klassificering ska lämna källstöd för föreslagna värden. Hämtad text
   behandlas som data och får inte styra insamlingsprogrammets instruktioner.
6. **Granska:** visa originalet, förslaget, det som saknas och skälet till att
   resursen föreslås. Godkänn, korrigera, avvisa eller lägg i granskningskö.
7. **Publicera:** bara godkända metadata, egna korta beskrivningar och originallänkar.
   Fulltext för intern analys ska inte hamna i sajtens offentliga `data.js`.
8. **Följ upp:** jämför innehållshash, lyft väsentliga ändringar till granskning
   och skilj tillfälliga hämtningsfel från bekräftade döda länkar.

Lagra upptäckt, hämtningsresultat, redaktionellt beslut och publiceringsstatus
separat. En fungerande länk är inte samma sak som granskat innehåll.

Skriv aldrig över manuellt godkända ändringar med en ny automatisk gissning.
Validera före publicering och ersätt data atomiskt först efter godkänd validering.
Det nuvarande katalogskriptet behöver justeras: det skriver utdata även när
valideringsavvikelser upptäckts och bygger en ny katalog enbart av angivna indata.

## 5. Så hittar läraren rätt

Visa några begripliga ingångar först: **Till min undervisning**, **Förstå AI själv**,
**Planera och utveckla**. Ge därefter filtren ämne, stadium och materialtyp.
Tema, tidsåtgång och verktygsförutsättningar kan ligga under fler filter.

Ett exempel på en sökväg:

> Undervisa om AI → mellanstadiet → utan digitala verktyg

Här är övning 1 i AI-vänner en relevant kandidat. Föräldrapaketet kan visas under
träffen som sammanhang. Det ska inte ge sju oberoende, nästan identiska träffkort
om användaren söker efter paketet i stort.

Varje träff bör visa vad läraren kan använda materialet till, det viktigaste om
målgrupp/genomförande, källa och en kort motivering till matchningen. Skilj mellan
externa kuraterade material och medlemsbidrag även när de visas i samma sökning.

Förslag på rangordning:

1. Tydlig match mot användarens ärende och valda filter.
2. Relevant titel, beskrivning och kuraterade ämnes-/temavärden.
3. Relevant avsnitt när sidan innehåller flera olika aktiviteter.
4. Granskningsläge och aktualitet, bedömda efter innehållstyp.
5. Gruppering av närliggande träffar och variation mellan källor.

Visa antal träffar i filtren och gör valen lätta att ta bort. Exakt valda krav
ska respekteras; okända värden får erbjudas separat som material att undersöka,
inte smygas in som säkra matchningar. Nyast är inte automatiskt bäst, och flest
undersidor ska inte ensamt ge en källa flest platser överst.

Utöka först befintlig sökning med bättre metadata och synonymer, exempelvis
matte/matematik och felaktiga AI-svar/hallucinationer. Utvärdera semantisk sökning
senare mot frågor där den enklare sökningen faktiskt missar användbara resurser.

## 6. Avgränsad pilot

Inventera Jönköpings AI-material och välj 20–30 varierade sidor för att prova
modellen. Urvalet ska inkludera samlingar, ämnessidor, modeller, övningar,
fortbildning, relaterade nyheter samt sidor som ska avvisas. Det är ett föreslaget
piloturval, inte ett uppmätt antal resurser på webbplatsen.

Låt en redaktör ange förväntad klassificering och relevanta träffar för 8–10
realistiska lärarfrågor innan resultatet utvärderas. Kontrollera särskilt:

- Hur mycket relevant material upptäcktes, och vad missades?
- Hur många föreslagna poster bör faktiskt tas in?
- Hur ofta är föreslagna metadata korrekta och styrkta?
- Hittar läraren ett användbart resultat bland de första fem?
- Klarar vi kontextberoende rubriker som Matematik utan att märka alla sidor
  med alla ämnen som råkar nämnas i sidfoten?
- Får övningar på samma sida rätt individuella förutsättningar?
- Bevaras godkända redaktörsändringar vid omkörning?

När detta fungerar läggs en andra källa till. Då syns vilka regler som är
generella och vilka som tillhör en viss webbplats.
