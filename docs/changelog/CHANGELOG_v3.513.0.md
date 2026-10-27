# v3.513.0 — Alerte « PV bas » avant une élite ou un boss

Décision de Seb du 27/10 (option A, seuil 70 %), prototype `atelier/pv-bas-depart.html`. Cas réel : mort contre la Fileuse aux yeux blancs, partie à 16 / 400 PV (4 %) ; le jeu ne bloquait qu'à 0 PV.

## Ce qui change en jeu
- Sous 70 % des PV, avant une sortie qui mène à une élite ou un boss (donjon, élite de carte, quête d'élite ou à boss), la feuille de préparation s'ouvre sur un encart : jauge des PV avec le seuil, rappel des potions par sortie.
- Deux remèdes sans quitter la feuille : manger une ration (stock et soin réel affichés, Cuisine de campagne comprise), ou se reposer au Feu de camp (temps jusqu'au maximum ; ferme la feuille et ouvre le Campement).
- Le bouton devient « Partir à X % » (style danger) : on peut toujours partir.
- Les vivres du départ (sortie rejouée) ne sont jamais proposés à manger.
- En début de partie, quand la feuille est sautée faute de choix, elle s'ouvre réduite à l'encart ; une fois le seuil passé (ration), elle affiche « PV suffisants pour partir ».
- Quête sans élite ni boss : aucun changement.

## Code
- `ui/sortie-prep-view.js` : `SORTIE_LOW_HP_PCT`, `sortieHasStrongFoe`, `sortieLowHp`, encart, pied de feuille, `sortiePrepEat`, `sortiePrepRest` ; option `food` de `openSortiePrep`.
- `ui/dungeon-view.js`, `ui/living-map-view.js`, `ui/camp-view.js` : passent `food` (vivres du départ).
- `css/04-panel-sortie-prep.css` : `.sp-lowhp*`. `lang/en.js` : 9 textes.
- Vérifié dans Chromium à 390 px (20 contrôles dédiés). round-harness 5230 OK ×3, boot 4 OK, parcours 139 OK, i18n 100 %.
- Aucun fichier ajouté au jeu, aucun fichier protégé.
