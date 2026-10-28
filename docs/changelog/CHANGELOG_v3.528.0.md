# v3.528.0 — Aide de la carte vivante de la Forêt (audit, lot 10 : TUT-9)

Décision de Seb : option A de l'atelier `atelier/aide-carte-vivante.html`, après examen de captures du vrai jeu à 320 et 390 px et en format tablette.

## Ce qui change en jeu
- L'étape « Ce que la brume reprend » (forest_brume) ouvre une fenêtre d'aide, **« La brume reprend »**. Elle s'affiche une seule fois, à l'arrivée sur la carte, comme « L'Ensablement » au Désert et « Le chantier errant » aux Ruines.
- Elle reste ensuite consultable dans Bibliothèque › Tutoriels.
- Ses 4 points :
  - comment libérer un secteur, et lesquels sont atteignables ;
  - les anneaux et la Sève de première libération (5, 8 ou 12) ;
  - le Recouvrement : un échec en Petite Aventure sur la carte rend un secteur libéré voisin à la brume, et son effet revient quand on le reprend ;
  - la Palissade, et le bouton « ? » de la légende.
- Chaque règle a été vérifiée dans le code : `LIVING_MAP_RULES`, `pickRegression` et `getBrakeChance` dans `systems/living-map-system.js`.
- Les aides du Désert et des Ruines, qui disent « fonctionne comme celle de la Forêt », renvoient enfin à une aide qui existe.

## Code
- `data/story-quests.js` : bloc `tutorial` de forest_brume.
- `en.js` : 5 textes.
- Harnais [347] : le texte suit les règles (Sève 5/8/12, anneau 1 tenu au niveau 3 de la Palissade).
- Aucun nouvel état sauvegardé, aucun fichier ajouté.

## Contrôles
- Round : 5 340 OK, 0 échec, sur deux passes.
- Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- i18n : 6 588 textes, 100 %, 0 orphelin.
- Chromium à 320 et 390 px, étape forest_brume acceptée :
  - la fenêtre s'ouvre à l'arrivée sur la carte, avec 4 points ;
  - elle ne revient pas après « Compris » ;
  - elle figure au catalogue des tutoriels ;
  - 0 erreur.
