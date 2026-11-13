# v3.790.0 — Tutoriels sur l'écran, lot 3 : les quêtes du village (13/11/2026)

Chantier des tutoriels sur l'écran (Seb 13/11, option A), lot 3. Les tutoriels des quêtes du village passent par le moteur des bulles. Aucun fichier protégé modifié, aucun changement de sauvegarde, aucun fichier ajouté.

## Ce qui change
- **Branchement** (`ui/tutorial-view.js`) : `maybeShowVillageQuestTutorial` passe par `renderTutorialInto` (bulles si décrites, sinon la fenêtre, même clôture).
- **5 quêtes** (`ui/coach-view.js`). « Le pain d'Aeswyn », la 6e, a été retirée en v3.788.0.
  - Sur la feuille du Champs, ouverte sur ses zones :
    - « Agrandir » : les zones, une autre zone, son prix ;
    - « Les niveaux » : le niveau, monter d'un niveau, l'achat automatique ;
    - « Les améliorations » : la fenêtre d'une zone, le cumul, partout pareil.
  - Aux Ateliers :
    - « Planche et lingot » : la Scierie fine, intrants et produit, la Fonderie, les files ;
    - « L'atelier bien huilé », sur la feuille de la Scierie fine ouverte : chacun son niveau, la file, améliorer.
- **Bulles** : un élément couvert, par exemple le bandeau collant du Village une fois l'écran défilé, est recentré comme un élément hors écran, au relevé comme à l'affichage.
- **Outil** `tools/audit/coach-captures.js` : déclencheurs des quêtes du village (chaîne remise juste avant la quête, puis l'onglet Village).
- **Traductions** : 32 textes nouveaux. **CLAUDE.md** : 28 tutoriels sur l'écran.

## Contrôles
- `round-harness` 7080 OK, 0 échec ([468] 4 ouvertures d'aide, [513] 28 tutoriels).
- boot 4 OK ; création du héros 46 OK ; i18n 100 %, 0 orphelin.
- Parcours complet (Chromium) 236 OK, 0 échec.
- Captures iPhone des 5 quêtes, **validées par Seb** (`captures/lot2-planches/lot3-planche.png`) ; les 16 tutoriels des lots 1 et 2 recapturés après la retouche du moteur : tous sur l'écran.
- Alpha mise à jour en v3.790.0 (accord de Seb).
- Quoi de neuf : une ligne (FR + EN).
