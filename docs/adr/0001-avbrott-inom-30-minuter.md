# ADR 0001: Var avbrottsregeln för beställningar ska ligga

Datum: 2026-11-18
Status: Föreslagen tills jag bekräftar

## Kontext

User story 2 (se `docs/plan.md`) säger att en kund ska kunna avbryta en beställning inom 30 minuter efter att den lagts. Planen föreslår ett nytt endpoint, `POST /orders/:id/cancel`, som sätter `status` till `cancelled` om beställningen har status `new` och är högst 30 minuter gammal.

Regeln består av två villkor som måste gälla samtidigt: statusen ska vara `new` och `created_at` ska vara inom 30 minuter. Frågan är var i koden dessa villkor ska kontrolleras.

Några fakta från `db/schema.sql`:

- `orders.status` är `TEXT NOT NULL DEFAULT 'new'`, utan CHECK-villkor. Databasen förhindrar inte godtyckliga statusvärden.
- `orders.created_at` är `TIMESTAMPTZ NOT NULL DEFAULT now()`, så tidsstämpeln sätts av databasen.
- Schemat är ett DROP/CREATE-skript utan migreringar. En schemaändring är alltså mer än en enda rad i en fil.

Kodstandarden (`docs/standard.md`) säger att tjänstelagret returnerar `Result` och inte kastar fel för förväntade fall, att routes bara översätter fel till HTTP, och att en kund bara får ändra sina egna beställningar, kontrollerat i tjänstelagret.

## Alternativ

### A. Route (HTTP-lagret)

Kontrollen görs i `src/routes/orders.ts`. Routen läser beställningen, kontrollerar status och tid och uppdaterar sedan raden.

- **För:** Det är den snabbaste vägen och kräver inga nya funktioner i tjänstelagret.
- **Emot:** Affärsregeln hamnar i HTTP-lagret, vilket strider mot standarden. Routen får då både översätta fel och avgöra vad som är tillåtet. Regeln blir svår att testa utan HTTP, och den riskerar att dupliceras om fler endpoint behöver samma kontroll.

### B. Tjänst (`src/services/orderService.ts`)

En ny funktion `cancelOrder(orderId, customerId)` returnerar `Result`. Den återanvänder `getOrder` för 404 och 403 och gör statuskontrollen och tidskontrollen i en enda `UPDATE ... WHERE status = 'new' AND created_at >= now() - interval '30 minutes' RETURNING ...`, parametriserat.

- **För:** Följer standarden för lager, fel och behörighet. Den atomära `UPDATE`-frågan gör att två samtidiga avbrott inte kan lyckas båda, utan att schemat ändras. Regeln kan testas direkt mot tjänsten och mot HTTP.
- **Emot:** Regeln finns bara i koden, inte i databasen. En annan kodväg som ändrar `status` kan bryta mot den utan att databasen säger ifrån.

### C. Databas (CHECK-villkor, trigger eller regel i schemat)

Regeln skrivs in i databasen, till exempel som en trigger som förhindrar statusändringar efter 30 minuter, eller som ett CHECK-villkor på `status`.

- **För:** Regeln gäller oavsett vilken kod som skriver till `orders`. Det är det starkaste skyddet.
- **Emot:** Kräver schemaändring och en migreringsväg, som projektet inte har idag. Tidsregeln i en trigger är svårare att förklara och testa. Ett CHECK-villkor på `status` gäller också andra statusvärden, vilket är ett bredare beslut än den här storyn. Planen utesluter uttryckligen CHECK-villkor och schemaändringar.

## Beslut

**Alternativ B** (tjänstelagret) ligger i planen och väljs av följande skäl:

- Planen säger att kontrollen av redan avbrutna beställningar görs i tjänstelagret, eftersom `status` är fri text utan CHECK.
- Planen säger att ingen ändring av databasschemat behövs, och utesluter CHECK-villkor och migreringar.
- Standarden kräver att tjänstelagret returnerar `Result` och att routes bara översätter fel. Alternativ B är det enda som följer detta utan att ändra schemat.
- Den atomära `UPDATE ... WHERE` i tjänsten ger samma samtidighetsskydd som antagande 4 i planen kräver.

Status: **Föreslagen tills jag bekräftar.** Beslutet ska bekräftas i planens steg 1 ("Bekräfta antagandena") innan kod skrivs.

## Konsekvenser

- Ny funktion `cancelOrder` i `src/services/orderService.ts`. Ny route `POST /orders/:id/cancel` i `src/routes/orders.ts`.
- Ingen ändring av `db/schema.sql` och inga migreringar.
- Alla 409-fall (för sent och fel status) använder felkoden `conflict`. Skillnaden mellan dem syns bara i `message`, så ingen ny felkod behövs i `src/result.ts`.
- Regeln lever i koden. Framtida kodvägar som ändrar `orders.status` måste känna till den, eller så behöver regeln flyttas till databasen i en senare ADR.
- Tidskontrollen använder `now()` i PostgreSQL, så appens och databasens klockor kan inte ge olika svar.

## Antaganden

Dessa följer planens antaganden och ska bekräftas innan kod skrivs.

- **Bara status `new` får avbrytas.** Betalda (`paid`) och skickade (`shipped`) beställningar kräver återbetalning respektive retur, som ligger utanför planen.
- **Gränsen är exakt 30 minuter.** Villkoret är `created_at >= now() - interval '30 minutes'`.
- **Databasens klocka gäller.** `now()` i PostgreSQL används, inte `Date.now()` i appen.
- **Kontrollen är atomär.** Status- och tidskontrollen görs i samma `UPDATE`.
- **Ordningen på felen är 400, 401, 404, 403, 409.** Ägarkontrollen återanvänder `getOrder`.
- **Ingen ny felkod.** Alla 409-fall använder `conflict`.
- **Ingen schemaändring.** Statusen är fri text och tidsstämpeln finns redan i `created_at`.
