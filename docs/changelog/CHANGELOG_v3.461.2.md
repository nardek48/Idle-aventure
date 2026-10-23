# v3.461.2 — Vivres : Ration moyenne aux Ruines et à la Crypte

Décision N-L de Seb (conception « Niveaux de donjon » v0.3). Après le Désert, presque rien ne consommait la Ration moyenne : le stock montait à des centaines.

## Ce qui change
- Aux Ruines et à la Crypte, toute sortie **rejouée** (donjon, élite de carte) demande 1 Ration moyenne, comme au Désert.
- L'Histoire et les premières victoires restent gratuites.
- La description de la Ration moyenne le dit.
- Le mode libre (lot 3) demandera 1 Ration moyenne pour les 4 donjons.

## Code
- `provisions-system.js` : `PROVISIONS_BY_WORLD` gagne `ruins` et `crypt` (Ration moyenne).
- `data/hunt-quests.js` et `en.js` : description de la Ration moyenne.
- Aucun fichier protégé, aucun fichier ajouté.

## Contrôles
- Harnais [274] : Tanière et Cité inchangées ; Ruines, Crypte et élite de la Crypte rejouées en Ration moyenne ; première victoire gratuite ; description.
- Robot (3 parties) : toutes au bout, médiane 21 h (référence 22 h).
- i18n 100 % ; round-harness 4593 OK, 0 échec (deux passes) ; boot, création du héros OK.
