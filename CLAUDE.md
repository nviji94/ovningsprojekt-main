# CLAUDE.md: butik-API (övningsprojekt)

Instruktioner för Claude Code i det här repot. Läs också docs/standard.md innan du ändrar kod.

## Projekt
- REST-API för kunder och beställningar: TypeScript, Express 4, PostgreSQL 16 (Docker).
- Äldre prisberäkning i Python: src/legacy/price_calc.py. Anropas via src/pricing/legacyPrice.ts.
- Svara på svenska i kommentarer och dokumentation. Kod, namn och commits följer docs/standard.md.

## Kommandon
- Test: `npm test` (16 tester, mot butik_test). Python-tester: `npm run test:legacy`.
- Typkontroll: `npm run typecheck`. Lint: `npm run lint`. Format: `npm run format:check`.
- Databas: `npm run db:up` startar Docker. `npm run db:reset` återställer schema och testdata.
- Kör alltid `npm test` efter en kodändring och visa resultatet.

## Regler
- SQL är alltid parametriserad: `db.query(sql, [värden])`. Aldrig strängmallar i SQL.
- Tjänstelagret (src/services/) returnerar `Result`, kastar inte fel för förväntade fall.
- Kunden hämtas från `req.customerId` (requireCustomer), aldrig från body eller query.
- Belopp räknas aldrig med flyttal. Pris går alltid genom calcPrice.
- Inga lösenord eller nycklar i kod. Inga namn eller e-post i loggar.
- Ta aldrig bort eller hoppa över ett test för att få grönt.
- Ändra inte src/legacy/price_calc.py utan att be om det. Avrundningen är stämd av ekonomi.

## Arbetssätt
- Gör små ändringar, en sak i taget. Läs filerna innan du föreslår en ändring.
- Committa inte och pusha inte utan att jag ber om det.
- Skriv en sessionslogg i sessions/ i slutet av varje pass.
- Lägg inga riktiga kunddata i repot.