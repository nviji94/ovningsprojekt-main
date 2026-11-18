# API

Alla anrop utom `POST /customers` och `/health` kräver headern `X-Customer-Id` med den inloggade kundens id. Det är en förenklad inloggning för övningen.

| Metod och sökväg | Beskrivning | Svar |
|---|---|---|
| `GET /health` | Kontroll att API:t kör. | 200 |
| `POST /customers` | Registrera en kund. Body: `{ name, email }`. | 201, 400 |
| `GET /customers/me` | Den inloggade kunden. | 200, 401, 404 |
| `GET /customers/me/orders` | Den inloggade kundens beställningar, nyast först. | 200, 401 |
| `POST /orders` | Lägg en beställning. Body: `{ lines: [{ product, quantity, unitPrice }], discountCode? }`. | 201, 400, 401 |
| `GET /orders/:id` | En egen beställning med rader. | 200, 400, 401, 403, 404 |
| `GET /orders/:id/price` | Pris för en egen beställning: `{ net, vat, total }`. Räknas av den äldre modulen. | 200, 400, 401, 403, 404 |
| `POST /orders/:id/cancel` | Avbryt en egen beställning som är ny och högst 30 minuter gammal. Svaret är beställningen med status `cancelled`. | 200, 400, 401, 403, 404, 409 |

### `POST /orders/:id/cancel`

Syfte: kunden ska kunna avbryta en beställning inom 30 minuter efter att den lagts. Tidskontrollen görs mot `created_at` i databasen. Bara beställningar med status `new` kan avbrytas.

- **200**: beställningen avbröts. Svaret har samma form som `GET /orders/:id`, med `status: "cancelled"`.
- **400** (`invalid_input`): `:id` är inte ett positivt heltal.
- **401** (`unauthorized`): headern `X-Customer-Id` saknas eller är ogiltig.
- **403** (`forbidden`): beställningen tillhör en annan kund. Beställningen är oförändrad.
- **404** (`not_found`): beställningen finns inte.
- **409** (`conflict`): beställningen är äldre än 30 minuter, eller har en annan status än `new`. Statusen är oförändrad.

## Den äldre modulen

`src/legacy/price_calc.py` räknar pris, rabatt och moms för en beställning. Den är skriven i Python, saknar tester och dokumentation och anropas från två ställen: API:t (via `src/pricing/legacyPrice.ts`) och den nattliga rapporten `jobs/nightly_report.py`.

Den går att köra direkt:

```bash
python3 src/legacy/price_calc.py 1042
```
