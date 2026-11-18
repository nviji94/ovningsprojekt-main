# Plan: avbryt en beställning (user story 2)

## Mål

Som kund vill jag kunna avbryta en beställning inom 30 minuter efter att jag lagt den.

Ett nytt endpoint, `POST /orders/:id/cancel`, sätter status `cancelled` på kundens egen beställning om den är ny och högst 30 minuter gammal. Tidskontrollen använder `created_at`. Kontrollen av redan avbrutna beställningar görs i tjänstelagret, eftersom `status` är fri text i databasen utan CHECK.

Ingen ändring av databasschemat behövs.

## Acceptanskriterier

1. **Lyckat avbrott**
   - Givet en egen beställning med status `new` som är 5 minuter gammal
   - När kunden anropar `POST /orders/:id/cancel`
   - Så svarar API:t 200 med beställningen, och `status` är `cancelled`.

2. **För sent**
   - Givet en egen beställning med status `new` som är äldre än 30 minuter
   - När kunden försöker avbryta den
   - Så svarar API:t 409 med felkoden `conflict`, och statusen är oförändrad.

3. **Fel status**
   - Givet en egen beställning vars status inte är `new` (till exempel `cancelled`, `paid` eller `shipped`), även om den är yngre än 30 minuter
   - När kunden försöker avbryta den
   - Så svarar API:t 409 med felkoden `conflict`, och statusen är oförändrad.

4. **Annan kunds beställning**
   - Givet en beställning som tillhör en annan kund
   - När kunden försöker avbryta den
   - Så svarar API:t 403 med felkoden `forbidden`, och beställningen är oförändrad.

5. **Beställningen finns inte**
   - Givet ett id som inte finns i `orders`
   - När kunden försöker avbryta beställningen
   - Så svarar API:t 404 med felkoden `not_found`.

6. **Ogiltig begäran**
   - Givet en begäran utan headern `X-Customer-Id`, eller med ett id som inte är ett positivt heltal
   - När begäran skickas till `POST /orders/:id/cancel`
   - Så svarar API:t 401 respektive 400 med felkoden `invalid_input`, och ingen beställning ändras.

## Antaganden

Dessa är antaganden och ska bekräftas innan koden skrivs.

- **Antagande 1: bara status `new` får avbrytas.** Storyn säger bara "inom 30 minuter". Vi tolkar den som att betalda (`paid`) och skickade (`shipped`) beställningar inte går att avbryta, eftersom det skulle kräva återbetalning respektive retur.
- **Antagande 2: databasens klocka gäller.** Tidskontrollen använder `now()` i PostgreSQL, inte `Date.now()` i appen, så att klockorna inte kan skilja sig åt.
- **Antagande 3: gränsen är exakt 30 minuter.** En beställning som är högst 30 minuter gammal går att avbryta. Villkoret blir `created_at >= now() - interval '30 minutes'`.
- **Antagande 4: kontrollen är atomär.** Statuskontrollen och tidskontrollen görs i samma `UPDATE ... WHERE ... RETURNING`, så att två samtidiga avbrott inte båda kan lyckas.
- **Antagande 5: ordningen på felen.** 400 för ogiltigt id, 401 utan inloggning, 404 om beställningen inte finns, 403 om den tillhör en annan kund och därefter 409. Ägarkontrollen återanvänder `getOrder` i `src/services/orderService.ts`.
- **Antagande 6: alla 409-fall använder felkoden `conflict`.** Skillnaden mellan "för sent" och "fel status" syns bara i `message`. Ingen ny felkod behövs i `src/result.ts`.
- **Antagande 7: svaret är hela beställningen.** Svaret har samma form som `GET /orders/:id`.
- **Antagande 8: metod och sökväg.** `POST /orders/:id/cancel`, eftersom raden finns kvar och bara ändrar status.
- **Antagande 9: testdata för tid.** Alla beställningar i `db/seed.sql` har fasta datum i oktober 2026 och är därför äldre än 30 minuter. Lyckat avbrott testas med en beställning som skapas via `POST /orders` i testet. "För sent" testas genom att sätta `created_at` bakåt direkt i testdatabasen.
- **Antagande 10: pris och nattrapport.** `GET /orders/:id/price` och `jobs/nightly_report.py` hanterar avbrutna beställningar som i dag. Det är inte undersökt om rapporten bör utesluta dem, och det hör inte till den här planen.

## Steg

Ett steg i taget. Kör `npm test` efter varje kodändring och visa resultatet.

1. Bekräfta antagandena ovan, särskilt 1 och 3.
2. Skriv testerna först, i `tests/orders.test.ts`, ett per acceptanskriterium (sex tester, med 400 och 401 som egna fall). Kör `npm test` och kontrollera att de nya testerna är röda av rätt skäl.
3. Lägg till `cancelOrder(orderId, customerId)` i `src/services/orderService.ts`. Funktionen returnerar `Result`, kastar inte fel för förväntade fall, och använder parametriserad SQL. Återanvänd `getOrder` för 404 och 403.
4. Lägg till routen `POST /orders/:id/cancel` i `src/routes/orders.ts` med `requireCustomer`, `parseId` och `sendResult`. Kunden hämtas från `req.customerId`.
5. Kör `npm test`. Alla tester ska vara gröna, och inget befintligt test får tas bort eller hoppas över.
6. Kör `npm run typecheck`, `npm run lint` och `npm run format:check`.
7. Uppdatera `docs/api.md` med en ny rad för endpointet. Uppdatera antalet tester i `CLAUDE.md` och `README.md` (nu 16).
8. Skriv en sessionslogg i `sessions/`.
9. Committa först när det har begärts.

## Utanför planen

- Återbetalning, retur eller ändring av betalda och skickade beställningar.
- Mejl eller andra notiser till kunden.
- Ändringar i `src/legacy/price_calc.py`, i `jobs/nightly_report.py` eller i prisberäkningen.
- Databasmigreringar och nya kolumner, till exempel `cancelled_at`.
- CHECK-villkor eller andra begränsningar på `status` i schemat.
- Kundtjänstroller eller möjlighet att avbryta en annan kunds beställning.
- Ångra ett avbrott.
- Andra user stories.
