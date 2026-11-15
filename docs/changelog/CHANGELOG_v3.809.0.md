# v3.809.0 — Pronostic : le Tir perforant du Rôdeur compté dans les combats de groupe (15/11/2026)

Option C du pronostic (audit de l'Alpha) : l'usure des combats ordinaires. Option C1 de Seb (15/11). Aucun fichier protégé modifié, aucun changement de sauvegarde, aucun fichier ajouté.

## Diagnostic (robot, ~300 quêtes par classe, trace `PRONO=1`)
- Usure prévue / réelle (médiane) : Chevalier 1,09 · Mage 0,93 · **Rôdeur 2,26**.
- L'écart du Rôdeur se creuse en groupe (meute ×5,2, Crypte ×4,1, Montagne ×3,1, Tour ×2,4) et disparaît en combat seul (Désert ×1,07).
- Le Tir perforant touche le premier autre ennemi debout du même coup (`class-combat-system.js`, `applyTraverse`, v3.709.0) : le pronostic l'ignorait.

## Changement
- `systems/combat-forecast-system.js` : `getTraverseShare` (part du kit portée par une technique qui traverse, même moyenne que `getKitDamageMultiplier` : 0,38 pour le Rôdeur, 0 pour le Chevalier et le Mage). Dans `simGroupFight`, pendant qu'un ennemi tombe, le premier autre ennemi visable reçoit cette part des dégâts du héros ; il peut tomber sous le Tir perforant. Un dormeur n'est pas visé avant son réveil. Ennemi seul : inchangé.

## Mesure (robot, 6 parties)
- Rôdeur : 2,26 → 1,92 (Désert 0,99 ; Crypte 5,2, Montagne 3,0, Tour 2,3 restent surestimés). Chevalier 1,08 et Mage 0,91, inchangés.
- Meute du Rôdeur (sauvegarde à forest_06) : usure prévue 432 → 344 PV.
- Aucune mort nouvelle ; les 6 morts de la série sont celles du Chevalier contre la silhouette, annoncées « Hors de portée » ou « Très difficile ».
- Banc `forecast-calibration-bench.js` : sortie identique.
- Reste : l'usure du Rôdeur en groupe, encore surestimée de ×2 à ×5. À instruire (sonde au moteur) avant tout coefficient.

## Contrôles
- `round-harness` 7135 OK, 0 échec, sur 2 passes ([513q]).
- boot 4 OK ; création du héros 46 OK ; parcours complet 236 OK ; i18n 100 %.
- Quoi de neuf : une ligne (FR + EN).
