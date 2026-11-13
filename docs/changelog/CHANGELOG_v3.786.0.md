# v3.786.0 — Simplification des rations (2/4) : le repas du Camp (13/11/2026)

Décisions de Seb (13/11, atelier `repas-camp.html`) : repas option C, festin en 2e bouton avec son effet écrit, PV des compagnons en anneaux, « Au coin du feu » fusionné dans les anneaux. Aucun fichier protégé modifié, aucun changement de sauvegarde, aucun fichier ajouté.

## Ce qui change
- **Le Repas** (`systems/camp-system.js`) remplace les trois boutons de ration au Camp :
  - un bouton « Repas · Toute l'équipe à plein » remonte le héros et les compagnons au camp à 100 % ;
  - prix au manque : 3 Blé + 3 Viande + 1 Eau par tranche de 10 % de PV manquants de l'équipe (ex. 45 % → 15 + 15 + 5) ;
  - une denrée pas encore produite (Champs, Chasse ou Puits fermé) n'est pas comptée ;
  - même verrou qu'avant en sortie de combat (donjon, élite, quête, chasse).
  - Nouvelles fonctions : `teamMissingPct`, `mealCost`, `mealMissing`, `mealLockReason` (ex-`rationLockReason`), `canEatMeal`, `eatMeal`. Retirées : `getRationOptions`, `canEatRation`, `eatRation`, `campRationEmpty`.
- **La carte du feu** (`ui/camp-view.js`) :
  - les compagnons en **anneaux de PV** autour du portrait, 5 sur une ligne même à 320 px ; rouge sous 35 % ;
  - toucher un anneau ouvre la conversation, « … » quand il a du nouveau. La carte « Au coin du feu » disparaît ;
  - **Repas** et **Festin** côte à côte. Le festin dit « +10 % dégâts et PV, 3 sorties » ; en cours : « Festin actif · encore N sorties ». La carte du festin à part disparaît ;
  - mesure au pixel (390 × 844, 2 compagnons) : la carte du feu fait 301 px, contre 619 px avant (santé + festin + coin du feu).
- **Le prix du repas baisse en direct** avec le feu (`refreshCampCard` met à jour anneaux et prix).
- **Mode PC** : le feu de camp garde son équipe, avec Repas et Festin dessous.
- **Repas proposé ailleurs** :
  - fenêtre de retour, si les PV sont bas et le stock suffit ;
  - préparation de sortie, si les PV sont bas.
- **Mémoire « Cuisine de campagne »** : le repas coûte 25 % de moins (avant : Petite ration +25 %).
- **Icône du repas** : `images/Icons/camp/camp_meal.webp`, qui servait à la ligne « Campement : repas » des rations dans l'Entrepôt. Cette ligne devient « Campement : repas et festin » sur le blé, la viande et l'eau.
- **Textes** : bandeau « à terre », aide de la régénération, PV bas avant un combat, tutoriel du Campement (fenêtre et bulle « Le feu »), descriptions des rations (vivres de la besace).
- **CSS** : styles des rations, des barres de compagnons, du coin du feu et de la carte du festin retirés (66 règles) ; styles `.camp-rings`, `.camp-ring*`, `.camp-acts`, `.camp-act*`, `.camp-cost`.
- **Robot** (`tools/sim/campagne-harness.js`) : il prend le repas au-delà de 20 % de PV manquants s'il peut le payer.
- **Traductions** : 25 textes nouveaux, autant d'orphelins retirés.

## Contrôles
- `round-harness` 7094 OK, 0 échec, sur 2 passes. Les contrôles des rations deviennent des contrôles du repas : [49], [62b], [104], [145], [184], [223], [439], [443], [456], [482], Mémoire.
- boot 4 OK ; création du héros 46 OK ; i18n 100 %, 0 orphelin.
- Parcours complet (Chromium) 236 OK, 0 échec.
- Robot, 9 parties (3 par classe) : 9 au bout, aucun mur, médiane 23,4 h (17 à 34 h) ; 4 KO sur des boss d'Histoire (tour_18 ×2, montagne_15, crypte_03).
- Captures : 390 × 844, 320 × 640 et 320 × 568 avec 5 compagnons (une ligne), mode PC.
- Quoi de neuf : une ligne (FR + EN).
