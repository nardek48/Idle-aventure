# v3.708.0 — Restes techniques de l'audit : ARCH-15, QUET-8, banc de la Sève

Lot d'outillage. Le jeu ne change que dans l'outil d'administration. Aucun fichier protégé touché, aucun état sauvegardé nouveau, aucun fichier ajouté.

## Corrigés

- **QUET-8** (le reste) : forcer une étape d'Histoire (`adminForceStoryStep`) fabrique maintenant l'état que l'étape demande. 24 entrées de plus dans `ADMIN_STORY_EXTRA`, avec leurs aides :
  - gestes du joueur : forest_03 (équiper l'arme du sac, 1 niveau d'entraînement), forest_04 (une potion de soin en stock), forest_12 (règle du Grimoire « charge annoncée → Défense », l'exemple du tutoriel) ;
  - compteurs : forest_wenna (3 combats à deux), montagne_04 (5 veines taillées depuis la base notée à l'acceptation), tour_07 (2 escaliers réussis depuis `paBase`) ;
  - secteurs (`adminFreeSectors`) : forest_brume, desert_04, ruines_07, crypte_07, montagne_07 (N secteurs atteignables, sur le chemin des secteurs que l'Histoire visera d'abord, élites et secteurs visés en dernier), tour_06 (les 5 étages), ruines_16 (voisins du Cœur), crypte_16 (`STORY_CHAIN_SECTORS`), montagne_16 (`STORY_MONTAGNE_ANNEAU3`) ;
  - paliers d'équipement (`adminSetPalier`) : desert_13, ruines_09/13, crypte_09/13, montagne_09/13, tour_10/13. Les pièces manquantes (arme, armure, puis les autres) sont tirées par `generateEquipmentItem` à la rareté du palier ; une pièce déjà au niveau n'est pas remplacée, l'ancienne pièce reste au sac ; Forge du village et reforge de l'arme et de l'armure montées aux niveaux du palier, jamais abaissées.
  - Les compagnons dans le groupe (desert_08, ruines_03, crypte_03, montagne_03) passaient déjà : rien à ajouter.
  - Vérifié par script (3 classes) : les 115 étapes forcées d'un bout à l'autre, chacune remplit son vrai objectif au moment où l'Admin la réclame (sauf forest_11, ci-dessous) ; le secteur visé par l'étape suivante est ouvert, ou un chemin atteignable y mène (avant : 25 étapes incohérentes).
  - `js/ui/admin-view.js`.
- **ARCH-15** (le reste) : 12 contrôles de `round-harness.js` qui lisaient le texte du code vérifient maintenant un effet :
  - donjon : le matériau va à l'Entrepôt après une réussite, rien après une mort ni en mode libre (vrai donjon lancé puis clos) ;
  - butin de `killEnemy` : boss tué au jet 60 (`Math.random` figé), rien à 50 %, un objet avec l'affixe à +25 % ;
  - Prospecteur : bourse du boss doublée au jet 0, jamais celle d'un ennemi normal ;
  - Œil du faucon : critique sur Élite +25 %, rien sans le pouvoir ni sans critique (nouveau contrôle) ;
  - Collectionneur et Endurance du marcheur : vraie Petite Aventure arrêtée sur un obstacle, butin +1 et Souffle −15 % lus ;
  - création du héros : vraie confirmation, aucune arme portée ;
  - Petite Aventure : abandon, la place reste prise ; KO, elle est rendue (vraie sortie) ;
  - Admin : popup et toast rendus (les mêmes fonctions) ;
  - écran de combat (dégâts, coups reçus, or, « CONTRÉ ! ») : faux écran mesurable (`fauxEcranCombat`), on relève ce qui est posé dans `#cbx-fx`.
  - Aides ajoutées en tête du harnais : `hasard(v, f)`, `porteLegendaire(id)`, `fauxEcranCombat(pastille)`.
- Quoi de neuf : une ligne FR + EN (`js/ui/news-view.js`, `js/lang/en.js`).
- `tools/harness/round-harness.js` : [474] (nouveau, 6 contrôles) : les 115 étapes forcées, objectifs remplis, secteur suivant atteignable, fin de la Tour, palier qui ne remplace ni n'abaisse rien.

## Hors version du jeu (même lot)

- **`tools/sim/seve-bench.js`** réécrit sur le vrai moteur : il joue de vrais parcours `Pa2Run` avec le robot de `pa2-bench.js` (3 classes × 4 étapes, 300 runs par cellule, par anneau) et relève la Sève de `takeRelic` et de `finish`. Il garde la demande du village (coûts lus par `VillageBuildingManager.getLevelCost`). L'ancien modèle (chance par nœud, finale par intensité, chasse) est retiré.

## Mesures

`node tools/sim/seve-bench.js .` (Forêt, 300 runs × 12 cellules par anneau, hors récompense de secteur, Mémoires et rumeur) :

| Anneau | Destination | KO | Trouvailles / run | Sève trouvailles | Sève destination | **Sève / run** | Sève / jour (3 places) |
|---|---|---|---|---|---|---|---|
| Sentier | 96 % | 4 % | 1,42 | 0,40 | 2,03 | **2,43** | 7,3 |
| Chemin | 88 % | 8 % | 1,48 | 0,45 | 2,73 | **3,18** | 9,5 |
| Périple | 68 % | 19 % | 1,32 | 0,37 | 2,80 | **3,17** | 9,5 |

Le Périple ne rapporte pas plus que le Chemin : sa destination à 4 se perd une fois sur trois. Village au niveau max : 50 Sève + 55 Résine (× 2) = 160 Sève, soit 51 runs (17 jours) au Chemin.

## Laissés

- **QUET-8**, forest_11 : un talent demande des points, qui viennent du niveau du héros. L'Admin ne fabrique pas le niveau ; à niveau 1, l'étape forcée reste sans talent. Rien de la suite n'en dépend.
- **ARCH-15** : restent en lecture de source les contrôles qui vérifient une règle de code, pas un effet :
  - CPL2-8 (`[457]`) : un seul tirage `randInt(SLEEP_WAKE_ROUNDS_MIN…)`, appelé par les trois chemins (règle « un seul point de tirage ») ;
  - les contrôles « aucun appel à X ne reste » (moteur des chasses, globales fantômes, anciens décors), la présence des fichiers dans `index.html` et `sw.js`, et les règles de CSS (jetons, sélecteurs, médias) : ce sont des règles du code lui-même.

Contrôles : round 6 610 OK (2 passes, avant 6 603), boot 4 OK, création 44 OK, parcours 232 OK, i18n 100 % / 0 orphelin. `node --check` sur chaque JS modifié. Aucun fichier protégé touché. Aucun fichier ajouté.
