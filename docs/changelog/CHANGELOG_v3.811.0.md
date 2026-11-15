# v3.811.0 — Rythme : la Forêt moins molle (15/11/2026)

Rythme de l'Alpha (audit du 13/11), Forêt trop facile. Choix de Seb (15/11) : combats plus longs et coups plus forts, sauf la Meute et la finale. Aucun fichier protégé modifié, aucun changement de sauvegarde, aucun fichier ajouté.

## Diagnostic
- Cibles des quêtes de la Forêt (`target` de `data/adventure-quests.js`, courbe v3.764.0) : 0,9 à 1,2 round, 1,6 à 4 % des PV par coup ; Désert 3,5 à 6 rounds, 6 à 8 %.
- Robot (6 parties, ~1 100 combats normaux) : PV perdus médians 0 %, 0 mort. On enchaîne la meilleure technique sans décider.

## Changement (`data/adventure-quests.js`, cibles des ennemis normaux)
| Quête | Rounds | Coup (part des PV effectifs) |
|---|---|---|
| Prouver sa valeur (`aq_forest_expedition`) | 0,91 → 1,5 | 0,0214 → 0,0321 |
| Franchir la Lisière (`aq_story_lisiere`) | 1,02 → 1,75 | 0,0221 → 0,0331 |
| Les yeux blancs (`eq_forest_spider`) | 1,22 → 2 | 0,0222 → 0,0333 |
| Ce qui a poussé sur la cendre (`eq_forest_bramble`) | 0,9 → 2 | 0,0163 → 0,0244 |
| Tenir le Cœur (`aq_story_coeur`) | 1,17 → 2,25 | 0,0407 → 0,0611 |
Inchangés : Premier sang, la Meute Affamée, Le Cœur de la Forêt (finale, déjà 8,4 % au coup sur 20 combats), les boss.

## Mesure (robot, Forêt jusqu'à desert_01, une partie par classe et par essai)
- Plus longs et ×1,5 partout : 1 / 19 / 31 morts (Meute et finale). Plus longs seuls, partout : 0 / 7 / 10 (finale). Sans la Meute : 10 morts par classe, toutes à la finale.
- Retenu (sans la Meute ni la finale) : **0 mort** ; PV perdus médians 2 à 8 % sur Prouver sa valeur et Tenir le Cœur ; temps de Forêt 0,45 / 0,86 / 0,81 h (avant 0,44 / 0,97 / 0,79), combat ~0,22 h.

## Contrôles
- `round-harness` 7147 OK, 0 échec, sur 2 passes ([513s] ; [48b], [89], [121] mis à jour : les ennemis ordinaires de Prouver sa valeur passent au-dessus de ceux du farm).
- boot 4 OK ; création du héros 46 OK ; parcours complet 236 OK ; i18n 100 %.
- Quoi de neuf : une ligne (FR + EN).
