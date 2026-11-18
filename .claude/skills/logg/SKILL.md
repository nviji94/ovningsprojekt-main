---
name: logg
description: Skriver sessionslogg i sessions/ med mål, gjort, bevis, förbrukning och nästa. Anrop: /logg och en kort beskrivning av passet.
---

Skriv en sessionslogg för det här arbetspasset: $ARGUMENTS

1. Lista filerna i sessions/ och välj nästa nummer: pass-N.md, där N är antalet befintliga pass-*.md-filer plus ett. Räkna bara filer som heter pass-*.md.
2. Kör `git log --oneline -5` och `git status` för att se vad som committats och vad som väntar.
3. Skriv filen med dessa rubriker:
   - Mål: vad passet skulle uppnå, med hänvisning till docs/plan.md.
   - Gjort: vad som blev klart, i planens steg.
   - Bevis: testresultat (antal gröna tester), kontroller som gick igenom och commit-hash.
   - Förbrukning: raden "Tokens: [fyll i från /usage]" så att användaren fyller i den.
   - Nästa: första konkreta steget för nästa pass.
   - Beslut och antaganden: vilka antaganden som är bekräftade och av vem.
4. Skriv bara det som går att kontrollera. Gissa inga siffror.
5. Visa filen för användaren och ändra ingen annan fil.

Svara på svenska.
