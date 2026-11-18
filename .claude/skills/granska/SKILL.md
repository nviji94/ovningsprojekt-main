---
name: granska
description: Granskar den aktuella ändringen mot docs/plan.md och docs/standard.md. Ändrar inga filer. Anrop: /granska
---

Granska ändringarna i repot. Ändra inga filer och gör ingen commit.

1. Kör `git status` och `git diff`. Om inget är ändrat: säg det och stanna.
2. Läs docs/plan.md och docs/standard.md.
3. Gå igenom varje ändrad fil och lista brister i tre kategorier:
   - Säkerhet: SQL som byggs av text, hemligheter i kod, saknade behörighetskontroller.
   - Struktur: en databasfråga per rad, kopierad logik, för stora funktioner.
   - Kodstandard: console.log, tom catch, avvikande namn.
4. För varje brist: fil, rad, vad som är fel, varför det är fel och vilken regel i standarden som gäller.
5. Kontrollera att varje ny rad går att spåra till ett steg i docs/plan.md. Lista rader som inte gör det.
6. Kontrollera att inga tester har tagits bort eller stängts av (it.skip, describe.skip eller borttagna it-block).
7. Avsluta med en kort sammanfattning: antal brister per kategori, och vad som behöver en människas bedömning.

Svara på svenska.
