# Plan: hooks för butik-API

## Bakgrund
docs/standard.md säger att ingen regel kontrolleras automatiskt ännu; att göra dem kontrollerbara i hooks är en del av kursprojektet. CLAUDE.md har regler som Claude lätt glömmer (köra `npm test`, aldrig röra `price_calc.py`, ingen `.env`, sessionslogg). Idag finns bara `permissions` i `.claude/settings.json`, inga hooks. Hooks körs av Claude Code, inte av Claude, så de är pålitliga.

Skripten `typecheck`, `lint`, `format`, `format:check`, `test` och `test:legacy` finns redan i package.json och återanvänds.

## Föreslagna hooks

| # | Händelse | Matchare | Hook (en mening) |
|---|---|---|---|
| 1 | PostToolUse | `Edit\|Write` på `*.ts` | **Formatering:** kör `prettier --write` på den ändrade filen så att koden alltid följer `.prettierrc.json`. |
| 2 | PostToolUse | `Edit\|Write` på `*.ts` | **Typkontroll:** kör `npm run typecheck` efter varje filändring och skickar tillbaka felen (exit 2) så att Claude rättar dem direkt. |
| 3 | PreToolUse | `Edit\|Write` | **Skydd av legacy:** blockerar (exit 2) ändringar i `src/legacy/price_calc.py`, eftersom avrundningen är stämd av ekonomi och bara får ändras efter att användaren bett om det. |
| 4 | PreToolUse | `Edit\|Write`, `Bash` | **Hemligheter:** blockerar skrivning till `.env` och filer med nycklar eller lösenord, som komplement till `deny: Read(./.env)`. |
| 5 | PostToolUse | `Edit\|Write` på `src/**/*.ts` | **SQL-vakt:** söker efter strängmallar i `db.query(` och varnar eller blockerar, eftersom SQL alltid ska vara parametriserad. |
| 6 | Stop | – | **Test före avslut:** kör `npm test` när Claude är klar och hindrar avslut om något test är rött. |
| 7 | Stop | – | **Sessionslogg:** påminner om att skriva en logg i `sessions/` om ingen ny fil skapats under passet. |

Prioritet: 1, 2, 3 och 6 först (enkla, tydlig nytta). 4, 5 och 7 som utökning.

## Filer som ändras eller skapas
- `.claude/settings.json`: lägg till `hooks`-block, behåll `permissions`.
- `.claude/hooks/format-ts.js`: hook 1, läser JSON från stdin (`tool_input.file_path`).
- `.claude/hooks/typecheck.js`: hook 2.
- `.claude/hooks/protect-files.js`: hook 3 och 4.
- `.claude/hooks/check-sql.js`: hook 5.
- `.claude/hooks/stop-gate.js`: hook 6 och 7.
- `docs/standard.md`: peka ut vilka regler som nu kontrolleras av hooks.
- `CLAUDE.md`: kort avsnitt "Hooks".
- `sessions/pass-N.md`: sessionslogg i slutet av passet.

Skripten skrivs i Node (kravet är redan Node >=22) så att de fungerar på Windows utan bash eller jq.

## Att tänka på
- Använd `node .claude/hooks/x.js` som kommando.
- Stop-hooken måste kontrollera `stop_hook_active` för att undvika oändlig loop.
- `npm test` kräver Docker-databasen (`npm run db:up`). Hook 6 bör ge ett tydligt meddelande om databasen saknas i stället för att blockera för alltid.
- Typkontroll på hela projektet kan vara långsam. Om det stör, flytta hook 2 till Stop.

## Verifiering
1. Ändra en `.ts`-fil med fel formatering: den ska formateras automatiskt.
2. Introducera ett typfel: Claude ska få felmeddelandet tillbaka.
3. Försök ändra `src/legacy/price_calc.py`: det ska blockeras.
4. Avsluta ett pass med rött test: Claude ska inte kunna avsluta.
5. `npm test`, `npm run typecheck`, `npm run lint` och `npm run format:check` ska vara gröna efteråt.
