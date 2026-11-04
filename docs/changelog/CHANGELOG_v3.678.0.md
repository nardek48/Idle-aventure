# v3.678.0 — Pas de feu de camp pendant une élite de carte engagée

- **Trou corrigé** (repéré en vérifiant v3.677.0) : `CampManager._hasActiveRun` excluait le donjon, la chasse et la quête d'aventure, mais pas l'élite de carte. Élite engagée, passage au Camp par la barre du bas : le feu soignait 5 % PV/min (hors ligne compris), puis on reprenait le combat. Décision de Seb : option A.
- `js/systems/camp-system.js` : `_hasActiveRun` compte aussi `livingMaps.fight`.
- `tools/harness/round-harness.js` [443] : élite engagée, aucune régénération en ligne ni hors ligne.
- « Quoi de neuf » : une ligne (FR et en.js).

Contrôles : round 6 160 OK (2 passes), boot 4 OK, création 44 OK, parcours 212 OK, i18n 100 %.
