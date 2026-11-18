# Pass 1

## Mål

Story 2: en kund ska kunna avbryta en beställning inom 30 minuter efter att den lagts.

## Gjort

- Riggen: `CLAUDE.md`, `.claude/settings.json` (behörigheter) och skillen `/tdd`.
- Plan i `docs/plan.md` med acceptanskriterier, antaganden och steg.
- `cancelOrder` i `src/services/orderService.ts` och routen `POST /orders/:id/cancel` i `src/routes/orders.ts`. Statuskontroll och tidskontroll görs i samma UPDATE.
- 16 tester i `tests/orders.test.ts` (23 tester totalt i projektet, varav 7 i `tests/customers.test.ts`), som täcker acceptanskriterium 1–6 (400 och 401 som egna fall).
- Dokumentation: `docs/api.md` (endpointet och svarskoder), testantalet i `CLAUDE.md` och `README.md`.

## Bevis

- `npm test`: 23 av 23 gröna.
- `npm run typecheck`: utan fel.
- `npm run lint`: utan fel.
- `npm run format:check`: alla filer följer Prettier.
- Mutationskontroll: borttagna villkor i `cancelOrder` och i routen fick motsvarande test att falla. Koden återställdes efter varje kontroll.

## Förbrukning

## Nästa

- Bekräfta antagande 1 (bara status `new` får avbrytas) och antagande 3 (gränsen är exakt 30 minuter, inklusive).
- Granska diffen (`git diff`).
- Göra commit när det begärs.
