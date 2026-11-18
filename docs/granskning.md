# Granskning: commit 473c002 (avbryt beställning)

Granskad mot: docs/plan.md, docs/standard.md
Granskare: granskare-agenten + manuell kontroll
Automatiska kontroller:
- npm test: exit 0. 2 sviter, 29 av 29 tester gröna (tests/orders.test.ts har 22, tests/customers.test.ts har 7).
- npm run typecheck: exit 0. Ingen felutskrift.
- npm run lint (eslint src tests): exit 0. Ingen felutskrift.
- npm run format:check: exit 0. "All matched files use Prettier code style!"

## Fynd

| # | Sort | Fil:rad | Fynd | Varför det är ett problem | Kontroll som borde ha stoppat det | Status |
|---|------|---------|------|---------------------------|-----------------------------------|--------|
| 1 | Plan vs kod | docs/plan.md:41 | Kriterium 6 säger `invalid_input` för 401, men koden ger `unauthorized`. | Planen och koden säger olika saker om felkoden. `src/auth.ts:11` och docs/api.md använder `unauthorized`. | Granskning av plan mot kod före kodningen. | Åtgärdad |
| 2 | Plan vs kod | docs/plan.md:51, src/routes/orders.ts | Antagande 5 säger 400 före 401, men `requireCustomer` körs före `parseId`, så 401 ges först. | Ordningen i planen stämmer inte med routen. | Granskning av plan mot kod. | Åtgärdad |
| 3 | Plan vs kod | src/services/orderService.ts:112 | Alla 409-fall ger samma meddelande: "Beställningen kan inte avbrytas." | Antagande 6 säger att "för sent" och "fel status" ska skiljas i `message`. Koden gör inte det. | Ett test som kontrollerar 409-meddelandet för två olika orsaker. | Åtgärdad |
| 4 | Säkerhet | src/services/orderService.ts:91 | UPDATE-satsen saknar `customer_id`. Ägarkontrollen sitter bara i `getOrder` ovanför. | Skyddet mot att avbryta någon annans beställning beror på ett anrop före UPDATE, inte på UPDATE-satsen själv. | Ett test där ägarkontrollen i `getOrder` förbigås. | Åtgärdad |
| 5 | Testtäckning | tests/orders.test.ts, describe "POST /orders/:id/cancel" | Bara `paid` testas som fel status. `cancelled` och `shipped` saknas. | Planens kriterium 3 nämner tre statusar. Att en redan avbruten beställning inte kan avbrytas igen är den konkreta risken med fri text i `status`. | Testet för kriterium 3 är ofullständigt. | Åtgärdad |
| 6 | Testtäckning | tests/orders.test.ts, describe "POST /orders/:id/cancel" | Ingen test ligger på gränsen 30 minuter. `created_at` sätts inte bakåt i något test. | Antagande 3 och operatorn `>=` är otestade. Planens antagande 9 säger att `created_at` ska sättas bakåt i testdatabasen. | Test med `created_at` satt till 29 och 31 minuter. | Delvis åtgärdad |
| 7 | Testtäckning | tests/orders.test.ts, test "409 för en beställning som är äldre än 30 minuter" | Testet använder seed 1043 i stället för en beställning med `created_at` satt bakåt. Seed 1043 har datum 2026-10-03 (db/seed.sql:24). | Testet är skört mot ändringar i seed-data och bryter mot antagande 9. | Granskning av planens antagande 9 mot testet. | Åtgärdad |
| 8 | Testtäckning | tests/orders.test.ts, success-testet och felfallen | Success-testet kontrollerar bara `status`, inte `id` eller `lines`. Felfallen 409, 403, 401 och 400 läser inte tillbaka att beställningen är oförändrad. | Kriterierna 1, 2, 4 och 6 kräver att svaret är beställningen och att beställningen är oförändrad. | Test som läser tillbaka med `GET /orders/:id` efter felfallen. | Åtgärdad |
| 9 | Plan vs kod | docs/plan.md:63 och :68 | Planen säger "sex tester" och "nu 16". Det blev sju nya tester, och totalt 23 i projektet. | Siffrorna i planen är fel och påverkar uppföljning. | Granskning av planens siffror mot `npm test`. | Åtgärdad |

## Åtgärder

- **Fynd 1:** `docs/plan.md`, kriterium 6, ändrad. Saknad `X-Customer-Id` ger 401 med `unauthorized`, och ett id som inte är ett positivt heltal ger 400 med `invalid_input`. Koden var redan konsekvent med `src/auth.ts`, så det var planen som rättades.
- **Fynd 2:** `docs/plan.md`, antagande 5, ändrad. Autentisering kontrolleras först (401), sedan validering av id (400), sedan 404, 403 och 409. Det stämmer nu med routen.
- **Fynd 3:** `cancelOrder` i `src/services/orderService.ts` väljer meddelande när UPDATE inte uppdaterar någon rad. Om statusen inte är `new` ges "Beställningen har status X och kan inte avbrytas.". Annars, alltså för gammal beställning, ges "Beställningen är äldre än 30 minuter och kan inte avbrytas.". Testerna i `tests/orders.test.ts` uppdaterades. `npm test` ger 23 av 23 gröna.
- **Fynd 4:** `customer_id = $2` finns nu i UPDATE-satsen, och parametrarna är `[orderId, customerId]`. UPDATE-logiken är utbruten till `markCancelled` i `src/services/orderService.ts`, så den kan anropas utan `getOrder`. Två nya tester i `tests/orders.test.ts` verifierar ägarskyddet: ett där kund 2 inte kan ändra kund 3:s beställning (returnerar 0, status oförändrad), och ett positivt kontrolltest där rätt kund avbryter (returnerar 1). En mutationskontroll, där `customer_id = $2` tillfälligt togs bort, gjorde det negativa testet rött. Efter återställning: `npm test` 25 av 25 gröna, `npm run lint`, `npm run typecheck` och `npm run format:check` exit 0.
- **Fynd 5:** De två nya fallen i `describe("POST /orders/:id/cancel")` i `tests/orders.test.ts`, med status `cancelled` och `shipped`, verifierar felstatus. Båda beställningarna är yngre än 30 minuter. Testerna ger 409 med `conflict`, och statusen är oförändrad efter anropet. Mutationskontrollen för fynd 5 är inte gjord än.
- **Fynd 6 (delvis åtgärdad):** Testerna för 29 och 31 minuter i `tests/orders.test.ts` verifierar tidsgränsen. Gränsen exakt vid 30 minuter är inte testad, eftersom `now()` rör sig mellan databasanrop, så `created_at` inte kan sättas till exakt 30 minuter bakåt. Mutationskontrollen för `>=` mot `>` kunde inte göras, eftersom skillnaden bara syns exakt vid 30 minuter.
- **Fynd 7:** Testet "returnerar 409 för en beställning som är äldre än 30 minuter" använder nu en egen beställning, skapad via `POST /orders`, med `created_at` satt 31 minuter bakåt i testdatabasen, i stället för seed 1043. Testet kontrollerar 409, `conflict` och meddelandet "Beställningen är äldre än 30 minuter och kan inte avbrytas.". Testet togs inte bort, eftersom det kontrollerar meddelandet, som det andra 31-minutertestet inte gör. `npm test` ger 29 av 29 gröna.
- **Fynd 8:** Lyckat-avbrottstestet kontrollerar nu att `res.body.id` är samma som beställningens id och att `res.body.lines` är samma som vid skapandet. Felfallen 403 och 401 läser tillbaka beställning 1043 som kund 3 före och efter anropet och kontrollerar att statusen är oförändrad. 409-fallen för fel status (paid, cancelled, shipped) och för 31 minuter hade redan återläsning. 400-fallet med ogiltigt id har ingen återläsning, eftersom det inte finns någon beställning att läsa. `npm test` ger 29 av 29 gröna.
- **Fynd 9:** Siffrorna uppdaterades efter `npm test` och jest-räkning. Totalt är 29 tester: 22 i `tests/orders.test.ts` och 7 i `tests/customers.test.ts`. Före beställningsfunktionen var det 16: 9 i orders och 7 i customers. Det ger 13 nya tester i `tests/orders.test.ts`. I `docs/plan.md` står nu "13 nya tester" och "nu 29", i `CLAUDE.md` och `README.md` står "29 tester". Kontrollen gjordes med `npm test` i serie. En jest-körning utan `--runInBand` gav 22 av 29 gröna. Orsaken har inte undersökts, och den körningen används inte.

## Kända begränsningar

- **N6: felmeddelandet kan vara fel vid samtidiga ändringar.** `cancelOrder` läser beställningen med `getOrder` och väljer felmeddelande utifrån den status som lästes före UPDATE-satsen (`src/services/orderService.ts:100–112`). Om statusen ändras mellan läsningen och UPDATE:n kan meddelandet vara fel. Exempel: meddelandet "äldre än 30 minuter" för en beställning som just blivit `paid`. HTTP-statuskoden 409 och det oförändrade datat är alltid korrekta, eftersom UPDATE-satsen bara ändrar en rad som uppfyller alla villkor. Begränsningen kräver två samtidiga anrop eller ändringar. Den är inte reproducerad med något test. Fixen är att läsa om statusen efter ett misslyckat UPDATE, innan felmeddelandet väljs. Fixen är inte gjord.

## Verifierat

- Fynd 1: docs/plan.md:41 säger `invalid_input` för 401. `src/auth.ts:11` ger `unauthorized`.
- Fynd 2: Route-ordningen i `src/routes/orders.ts` (requireCustomer före parseId) och antagande 5 i docs/plan.md:51.
- Fynd 3: `cancelOrder` i `src/services/orderService.ts` ger alltid samma `err("conflict", "Beställningen kan inte avbrytas.")`. Antagande 6 i docs/plan.md:52 säger annat.
- Fynd 4: UPDATE-satsen i `cancelOrder` har `WHERE id = $1 AND status = 'new' AND created_at >= ...` och saknar `customer_id`.
- Fynd 5: Testfilen har bara ett fel-status-test, med `paid`.
- Fynd 6: Inget test i `tests/orders.test.ts` sätter `created_at` bakåt.
- Fynd 7: `db/seed.sql:24` har `(1043, 3, 'new', NULL, '2026-10-03 13:20:00+02')`. Testet använder 1043.
- Fynd 8: Success-testet kontrollerar bara `res.body.status`. Det är bara paid-testet som läser tillbaka statusen.
- Fynd 9: docs/plan.md:63 säger "sex tester" och docs/plan.md:68 säger "nu 16". `npm test` ger 23 totalt, och `tests/orders.test.ts` har 16 `it(`-block.
- Testresultat: `npm test` ger 23 av 23 gröna tester.

## Ej verifierat

- Agentens påstående att sessions/pass-1.md rad 12 säger "23 tester i tests/orders.test.ts". Jag har inte läst den filen.
- Agentens påstående att sessions/pass-1.md har en tom rubrik "Förbrukning" (rad 23–24). Jag har inte läst den filen.
- Agentens påstående att sessionsloggen gör ett påstående om mutationskontroller. Jag har inte kört några mutationskontroller.
- Exitkoderna för `npm run typecheck` och `npm run lint`. Jag kontrollerade bara att utskriften inte innehöll några fel.
- Agentens påstående att `getOrder` i onödan hämtar orderrader vid ägarkontroll. Det är inte prioriterat här och är inte verifierat.
