---
name: tdd
description: Genomför ett steg ur docs/plan.md med test först. Anrop: /tdd och ett stegnummer
---

Du ska genomföra följande steg ur planen: $ARGUMENTS

Arbeta i den här ordningen och hoppa inte över något:

1. Läs docs/plan.md och hitta steget. Läs sedan den kod som berörs.
2. Skriv ETT nytt test i tests/ för det nya beteendet. Rör inte src/.
3. Kör `npm test` och visa att det nya testet är rött. Om det är grönt: stanna och berätta, eftersom testet då inte mäter det som ska ändras.
4. Gör den minsta möjliga ändringen i src/ som får testet grönt. Ändra inget annat.
5. Kör `npm test` och `npm run typecheck`. Alla tester ska vara gröna.
6. Visa diffen med `git diff` och vänta på min granskning. Gör ingen commit.