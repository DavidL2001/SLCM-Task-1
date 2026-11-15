# CI/CD med docker och render

Next.js app med en enkel to-do-lista, en startsida och en om sida. Listan hanteras av en API route och appen har en "/health" endpoint. Den körs som en docker container på render via github actions.

Driftsatt app: https://slcm-task-1-1.onrender.com

## Val av ramverk och motivering

jag valde Next.js. Jag använder app router med Typescript:

- Sidor, API-routes och en produktionsbuild ryms i ett och samma ramverk, så vi behöver inget separat backend.
- TypeScript fångar fel redan vid bygget, vilket CI pipelinen kan dra nytta av.
- Inga extra bibliotek (ingen databas, ingen Tailwind), så att fokuset stannar på driftsättningen.

## Köra lokalt

Man behöver Node.js och npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Testa produktionsbuilden lokalt:

```bash
npm run build
npm start
```

`npm run dev` laddar om sidan när man ändrar i koden.`npm run build` + `npm start` kör den optimerade versionen, alltså samma som på render.

## Bygga och köra med docker

```bash
docker build -t cicd-render-app .
docker run --rm -p 3000:3000 --env-file .env.local -e APP_ENV=production cicd-render-app
```

Öppna sen `http://localhost:3000`. docker Desktop måste vara igång. Om porten är upptagen kan man byta den vänstra siffran, t.ex. -p 3001:3000. Dockerfilen är multi-stage (`deps`, `builder`, `runner`) så att imagen blir mindrer.

## Miljövariabler och hemligheter

All konfiguration läses på ett ställe, i lib/config.ts. Där kollas värdena och det finns standardvärden.

### Vilka variabler finns och var sätts de?

Variabel, Typ, Syfte, Dev, Prod
`APP_ENV`, server, `development` eller `production`. Styr bannern och hur mycket som loggas `.env.local` renders miljövariabler,
 `LOG_LEVEL`, server, `debug`, `info`, `warn` eller `error`, `.env.local`, renders miljövariabler,
`API_SECRET_KEY`, server, hemlig, Ett exempel på en hemlighet (valfri). Läses bara på servern, `.env.local`, renders miljövariabler,
`NEXT_PUBLIC_APP_NAME`, publik, Appens namn som visas på sidan, .env.local, renders miljövariabler (som build arg i docker)

- Dev: kopiera `.env.example` till `.env.local` och kör `npm run dev`. `.env.local` ignoreras av git.
- Prod: variablerna sätts i render (Environment) och finns som vanliga miljövariabler när containern körs. `.env.local` kommer aldrig med i docker imagen.
- `.env.example` visar alla variabler med platshållare och committas. Där finns inga riktiga hemligheter.

Variablerna till server läses när appen körs och inte vid build, så samma docker image kan användas i olika miljöer.

### Varför hårdkodas inga hemligheter?

Allt som ligger i koden hamnar i git, och historiken försvinner inte. Även om man tar bort raden senare finns hemligheten kvar i gamla commits. Om repot är eller blir offentligt kan vem som helst läsa den. Därför ligger hemligheter i miljövariabler och i github secrets i stället.

### Varför är `NEXT_PUBLIC_`-variabler inte hemliga?

Variabler som börjar med `NEXT_PUBLIC_` bakas in i JavaScript-koden när man kör `npm run build` och skickas till webbläsaren. Alla kan alltså läsa dem med utvecklarverktygen. De funkar för sånt som är offentligt, som appens namn, men aldrig för nycklar eller lösenord. Variabler utan prefixet läses bara på servern.

### Var lagras deploy hook-URL:en och varför?

Deploy hook-URL:en ligger som en github Secret (`RENDER_DEPLOY_HOOK_URL`) under Settings → Secrets and variables → Actions. Den som har URL:en kan starta en deploy utan att logga in, så den är i princip ett lösenord. github Secrets är krypterade, visas inte i loggarna och finns inte i repot. Workflow-filen använder bara namnet (`${{ secrets.RENDER_DEPLOY_HOOK_URL }}`), aldrig själva värdet.

### Vad gör man om en hemlighet läcker?

1. Byt ut den direkt: skapa en ny och gör den gamla ogiltig. För deploy hooken skapar man en ny i render och tar bort den gamla.
2. Uppdatera det nya värdet i github Secrets och / eller renders miljövariabler.
3. Kolla loggar och deploy historiken om någon har använt den.
4. Det räcker inte att bara ta bort den ur koden, för den finns kvar i git-historiken. Det viktiga är att den gamla inte funkar längre.

## Loggning och health check

### Hur loggar appen?

Appen har en liten logger i `lib/logger.ts`. Den skriver en rad per händelse som JSON med tid, nivå, meddelande och eventuell data, via `console.info`, `console.warn` och `console.error`. render sparar allt som containern skriver, så raderna syns i Logs på tjänsten. Hur mycket som loggas styrs av `LOG_LEVEL`.

Startlogg: `instrumentation.ts` skriver `Servern startar` med miljö, loggnivå, port och Node-version varje gång servern startar.
Normal händelse (`console.info`): API routen `/api/todos` loggar t.ex. `Ny uppgift skapad`.
Fel (`console.error`): ogiltig indata (400), uppgifter som inte finns (404) och oväntade fel (500) loggas med orsak. Användaren får bara ett kort felmeddelande, aldrig stackspår. Det loggas bara på servern.
Felsidor: `app/error.tsx` visas vid oväntade fel och `app/not-found.tsx` för sidor som inte finns.

Exempel på loggrader:

```json
{"time":"2026-11-13T08:25:39.143Z","level":"info","message":"Servern startar","data":{"environment":"production","logLevel":"info","port":"3000","nodeVersion":"v24.21.0"}}
{"time":"2026-11-13T08:30:12.001Z","level":"error","message":"Förfrågan misslyckades","data":{"route":"/api/todos","method":"POST","status":400,"reason":"ogiltig text"}}
```

### Health check: `/health`

`GET /health` svarar med 200 och JSON utan några hemligheter:

```json
{ "status": "ok", "uptime": 87, "timestamp": "2026-11-13T08:27:04.432Z", "environment": "production" }
```

Svaret har `Cache-Control: no-store`, så man får alltid ett nytt svar. Man kan testa lokalt med `curl -i http://localhost:3000/health`.

### Hur används loggning och health checks vid felsökning?

`/health` visar om servern lever och loggarna visar vad som hände. Tillsammans kan man se om problemet är att containern inte startar, att den startar men är trasig, eller att ett enskilt anrop går fel.

Startloggen: efter en deploy öppnar man Logs på render. Om raden `Servern startar` finns, med rätt miljö (`production`) och port, har containern startat. Finns den inte har bygget eller starten gått fel, och felet står oftast i raderna ovanför. Ett exempel är ett ogiltigt värde i `LOG_LEVEL`, som ger ett felmeddelande från `lib/config.ts`.

Felsökning med `console.error`: man söker i loggen efter `"level":"error"`. Varje rad har route, metod, status och orsak, och vid oväntade fel även stackspår. Eftersom raderna är JSON går de lätt att filtrera. Användaren behöver aldrig se några interna detaljer.

Hur render använder health checken: i inställningarna står Health Check Path som `/health`. Vid en deploy anropar render den på den nya versionen. Om den svarar OK byter render över trafiken dit. Om den inte svarar blir deployen inte klar och den gamla versionen fortsätter köra, så en trasig version tar inte ner sidan. Dockerfilen har också en `HEALTHCHECK` mot `/health`, så man kan se samma sak lokalt med `docker ps`.

Så kan man felsöka:
1. Svarar `/health` med 200? Om inte lever inte servern, och då kollar man startloggen.
2. Om `/health` funkar men något annat är trasigt letar man efter `error`-rader runt den tiden.
3. Stämmer `environment` och `logLevel` i startloggen? Annars är miljövariablerna fel på render.
4. Fixa felet, deploya igen och kolla `/health` och startloggen.

## github actions-workflowen

Filen [.github/workflows/deploy.yml](.github/workflows/deploy.yml) startar när man pushar till `main` (och kan köras manuellt med `workflow_dispatch`). Den har två jobb:

1. `build`
   - hämtar koden (`actions/checkout`)
   - installerar Node.js 24 med npm cache (`actions/setup-node`)
   - kör `npm ci`
   - kör `npm run build`
   - kör `docker build` för att kolla att imagen går att bygga
2. `deploy` har `needs: build`, så det körs bara om bygget lyckades, och bara på `main`.
   - kollar att secreten finns (annars ett tydligt felmeddelande)
   - anropar renders deploy hook med `curl --fail`, så att ett HTTP-fel stoppar jobbet

Imagen publiceras inte på docker Hub och inga tester körs, enligt uppgiften. render bygger sin egen image från Dockerfilen. Deploy hook-URL:en är en github secret och skrivs aldrig ut i loggen.

Om ett byggsteg misslyckas stoppas allt och render triggas inte (se [Verifiering av flödet](#verifiering-av-flödet)).

## Driftsättning på render

render kör appen som en Web Service med docker som runtime:

- Repo och branch: `DavidL2001/SLCM-Task-1`, branch `main`
- Plan och region: Free, Frankfurt
- Auto-Deploy: Off, så deploy sker bara via github actions
- Health Check Path: `/health`
- Miljövariabler: `APP_ENV=production`, `LOG_LEVEL=info`, `NEXT_PUBLIC_APP_NAME` och `API_SECRET_KEY` (sätts i render, inte i repot). `PORT` sätter render själv.

Så här funkar det:

1. Jag pushar till +main.
2. Github actions bygger appen och docker imagen.
3. Om bygget lyckas anropar deploy jobbet renders deploy hook (URL:en ligger i github secret RENDER_DEPLOY_HOOK_URL).
4. render hämtar koden från github, bygger imagen från Dockerfilen och startar containern.
5. render anropar /health. Om den svarar OK byter render till den nya versionen.
6. Appen nås på den publika URL:en och startloggen "servern startar" syns i renders loggar.

## Verifiering av flödet

När tjänsten var uppe ändrade jag rubriken på startsidan och pushade till `main`:

- Github actions startade automatiskt.
- Både bygget av appen och docker bygget lyckades.
- Actions triggade render via deploy hook och render gjorde deployen.
- Den nya rubriken syntes på den publika URL:en.

Felfall: Jag la medvetet in ett typfel i `app/page.tsx` och pushade. Då misslyckades `npm run build`, docker bygget och deploy jobbet hoppades över och render triggades inte. Sen återställde jag med `git revert` och nästa körning blev grön.

## Kostnadsmedveten drift

### 1. Vilken render plan använder du?

Free, med docker som runtime, i Frankfurt. Det kostar ingenting.

### 2. Varför har du valt den?

Appen är liten och har ingen databas, så gratis versionen räcker.

### 3. Vilka faktorer påverkar kostnaden för att driva applikationen?

 hur stor instans man har (minne och CPU)
 hur många instanser man kör
    hur länge den körs. På Free får man 750 gratis timmar i månaden
    hur mycket trafik det är

Priserna finns på render.com/pricing.

### 4. Hur kan du minska applikationens resursanvändning?

- ha en liten docker image (multi-stage, standalone och Alpine, ca 300 MB)
- inte använda onödiga bibliotek
- logga mindre i produktion (`LOG_LEVEL=info`)
- bygga färre gånger, Auto-Deploy är av och render bygger bara när pipelinen lyckats
- låta tjänsten sova när ingen använder den, vilket Free gör själv efter 15 minuter
- använda cachning eller ett CDN för statiska sidor

### 5. Vilka begränsningar har din nuvarande driftlösning?

- tjänsten somnar efter 15 minuter och första anropet tar ungefär en minut
- Free har lite minne och CPU
- 750 gratis timmar i månaden, sen stängs den av tills nästa månad
- to-do-listan ligger i minnet och försvinner vid omstart
- bara en instans, så en omstart ger ett kort avbrott
- ingen staging och inga tester, så en ändring på `main` går direkt till produktion
- ingen övervakning, man får kolla loggar och `/health` själv

### 6. Vad skulle du behöva ändra om applikationen fick betydligt fler användare?

- byta till en betald plan som alltid är igång och har mer minne och CPU
- köra flera instanser, och då kan appen inte spara listan i minnet
- ha en riktig databas, t.ex. render Postgres
- använda ett CDN och cachning så att färre anrop når servern
- lägga till tester och en staging-miljö
- ha övervakning och larm
- skydda mot missbruk, t.ex. med rate limiting

## Arkitektur

Så går det från kod till körande app:

utvecklare till git push till github (main) till github actions (build och docker build) till deploy hook till render (bygger imagen och kör containern) till publik url

Var saker finns:

hemligheten för deploy hooken ligger som github secret och används av github actions
miljövariablerna ligger i render
 loggarna syns i render
/health används för att kolla att appen lever

## Tekniska beslut

Next.js med app router och TypeScript: krav i uppgiften. Sidor, API routes och produktionsbuild finns i ett ramverk och TypeScript hittar fel redan vid bygget.

Inga extra bibliotek: fokus är på driftsättning, och färre beroenden ger mindre image och mindre att underhålla.

To-do-lista i minnet: enkel interaktiv funktion utan databas. Nackdelen är att datan försvinner vid omstart.

Central konfiguration i lib/config.ts: alla miljövariabler kollas på ett ställe, med standardvärden och tydliga felmeddelanden.

Hemligheter i miljövariabler och github secrets: inget hemligt i koden eller git-historiken. NEXT_PUBLIC_ används bara för sånt som är offentligt.

.env.example committas men .env.local ignoreras: visar vilka variabler som behövs utan att läcka värden.

JSON-loggar via console: enkelt, inga bibliotek, och render samlar in loggarna direkt.

/health utan cache och hemligheter: används av render och Dockerfilens HEALTHCHECK för att se om appen lever.

docker multi-stage med output standalone: ger en liten image där bara det som behövs för körning finns med.

node:24.21.0-alpine: fast version ger samma bygge varje gång och är samma Node som lokalt. Alpine är liten.

Icke-root användare i containern: mindre skada om något går fel i containern.

render Free med docker runtime: gratis och räcker för uppgiften. render bygger imagen själv, så den behöver inte ligga på docker hub.

Auto-Deploy Off och deploy hook: deploy sker bara via pipelinen efter ett lyckat bygge. Annars skulle render deploya vid varje push.

curl --fail mot deploy hook: ett HTTP-fel stoppar jobbet och URL:en skrivs aldrig ut.

## Fördjupad diskussion

### Kostnader

Just nu kostar det ingenting eftersom render Free, github actions och repot är gratis. Nackdelen är att tjänsten somnar och att första anropet tar ungefär en minut, vilket inte funkar för riktiga användare. Då skulle jag byta till en betald plan som alltid är igång. Det som kostar mest är storleken på instansen och hur många man har. Trafik och byggminuter kostar lite. Pipelinen hjälper till en del eftersom render bara bygger när bygget i Actions har gått bra, men varje deploy bygger ändå på render, så många deployer kostar.

### Säkerhet

Hemligheterna ligger inte i koden. `API_SECRET_KEY` finns bara på render och läses bara på servern, och deploy hook-URL:en ligger som github secret och skrivs aldrig ut i loggen. `.env*` ignoreras av både git och docker. Containern körs inte som root, workflowen har bara `contents: read` och användaren får aldrig se stackspår.

Det finns också svagheter. Deploy hook-URL:en är som ett lösenord, så den som får tag i den kan starta deployer. Appen har ingen inloggning och ingen rate limiting.
 Actions använder versionstaggar (`@v7`) och inte fasta hashar. docker imagen skannas inte efter sårbarheter. Och `main` deployas direkt, så en dålig ändring kan hamna i produktion utan att någon granskar den.

### Resursanvändning

Appen är lätt: en Node-process, ingen databas och en image på ca 300 MB, vilket passar Free. Det som kan bli ett problem är att to-do-listan ligger i minnet och kan växa hur mycket som helst. Varje uppgift är max 200 tecken men antalet uppgifter har ingen gräns, så den kan till slut ta slut på minne. Loggningen är liten i produktion (`LOG_LEVEL=info`).

### Möjliga förbättringar

 tester i CI, för nu kollas bara att appen går att bygga. Uppgiften säger att tester inte ska köras här, men i ett riktigt projekt vore det första jag la till
 en staging-miljö, så man kan testa innan det går till produktion
 skanna docker imagen och beroendena
 en riktig databas så att datan sparas
 en betald plan

Sammanfattningsvis är lösningen enkel och billig. Den visar hela kedjan från kod till driftsatt app, men för riktig drift behövs tester, staging osv...
