# v3.749.0 — Préparation pressée à l'Apothicaire (piste D de l'étude « L'or et la Forge »)

Décision de Seb le 09/11 (audit A, ECO-1 : 994 000 or sans usage en fin de partie), atelier `atelier/apothicaire-pressee.html` : emplacement A (dans la ligne « Préparer »), prix P1, mot « Presser ».

- `js/data/apothecary-recipes.js` : `APOTHECARY_PRESS_BASE` 1 000, `APOTHECARY_PRESS_MULT` 2.
- `js/systems/apothecary-system.js` : quand la journée est finie, `press(id)` prépare une de plus contre 1 000 or × rang du monde le plus loin atteint (Forêt 1 … Tour 6), doublé à chaque pressée du jour, remis à zéro le lendemain. Ingrédients toujours dus, plafond de stock inchangé, Soin mineur (sans plafond) non concerné. État `pressKey` / `pressCount` dans `game.village.apothecary`, déjà sauvegardé tel quel (aucun changement de save-system.js). Nouveaux : `getPressedToday`, `getPressCost`, `canPress`, `press`.
- `js/ui/potion-view.js` + `css/04-panel-village.css` : « Fini pour aujourd'hui » devient le bouton « Presser · 5 000 » et une ligne « la suivante : 10 000 or ».
- `js/lang/en.js` : « Rush », textes traduits ; l'ancien « Fini pour aujourd'hui ({a}/{b}) » retiré (orphelin).
- `tools/harness/round-harness.js` : section [502] (prix par monde et par pressée, or et ingrédients, refus sans or ou sans ingrédient, nouveau jour, Soin mineur, rendu de la ligne).
- Quoi de neuf : une ligne (FR + EN).

Repères (journaux de Seb) : 7 pressées dans une journée coûtent 155 000 or en Montagne (720 000 gagnés dans le monde) et 762 000 à la Tour (environ 1 200 000 gagnés).

Contrôles : round-harness 7 209 OK, 0 échec (×2) ; boot 4 OK ; création du héros 44 OK ; i18n 8 896 textes, 100 %, 0 orphelin ; parcours 235 OK. Rendu vérifié dans Chromium à 390 px.
