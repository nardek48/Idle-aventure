# v3.519.0 — Règles des mondes (audit, lot 4) et correctifs en fichiers protégés

Audit du 27/10, lot 4, et les trois correctifs qui attendaient l'accord de Seb sur les fichiers protégés (« Tu peux corriger en modifiant les fichiers protégés »). Le diff a été relu sous trois angles, puis chaque constat a été soumis à une vérification adverse. Les 4 défauts confirmés sont corrigés ici (deux constats décrivaient la même boucle), sauf la boucle de la Petite aventure offerte, laissée à Seb (voir à la fin).

## Ce qui change en jeu
- **Vivres de la Montagne (SUI-2, option A)** : rejouer une élite de la carte ou la Gueule du volcan demande 1 Ration moyenne, comme aux Ruines et à la Crypte. Le panneau « Chaque combat rejoué prend ses vivres » dit enfin vrai.
- **Petites aventures offertes par l'Histoire (DUR-5)** : crypte_16, montagne_11 et montagne_16 les offrent, comme les 12 autres étapes de carte. Mesuré : montagne_11 passe de 9,7 h à 0,4 h, et la recharge des Petites aventures de 11,7 h à 0 h par partie (médianes).
  - Une étape réussie n'offre plus de départ (même règle que le donjon offert, RE-5).
  - La carte « Offerte par l'Histoire » ne compte plus une élite comme une Petite aventure à libérer.
- **Labyrinthe des Ruines (SUI-9)** : l'entrée coûte 1 Ration moyenne, les vivres des Ruines, au lieu de la Petite ration de la Forêt.
- **Tournures neutres (SUI-5)** : le héros n'est plus accordé au masculin.
  - Bilan de donjon : « {x} : tu tombes à la vague… », « {x} : sortie abandonnée… ».
  - Mort : « 💀 Tu tombes ! Retour au campement… », toast « 💀 À terre ! ».
  - Petite aventure : « Tu es à terre : soigne-toi au Campement avant de partir. »
- **Accords des noms (même famille)** : un nom accordé au hasard devenait faux avec les vrais noms (« Tanière du Basilic entièrement terminé », « La Pleureuse vaincue »…).
  - Donjon : « {x} : première victoire — palier suivant débloqué ! », « Souvenir : {x}, sortie terminée ».
  - Améliorations : « Amélioration : {x} (niveau {n}) » (boutique du donjon, bâtiments, ateliers).
  - Quêtes et victoires : « Souvenir de victoire : {x} », « {x} : quête terminée ! ».
  - Combat : « {x} reste sous le choc de ta charge. »
- **« Or gagné » (RES-8)** : la statistique compte désormais l'or de l'Histoire, des quêtes du village, des jalons, de la Taverne, des caravanes, des patrouilles et des hauts faits, ainsi que le choix « Déterrer les noms ». Avant, elle n'en montrait que 44 à 64 %. La revente d'une potion n'est pas comptée, puisque c'est un demi-remboursement.
- Ration moyenne : la description cite la Montagne et le Labyrinthe.

## Mesures (robot de campagne, 12 parties, --combats)
- Avant ce lot (v3.518.0, robot du lot 3) : médiane 31,9 h.
- Avec ce lot : médiane **21,1 h**, p25–p75 de 20,1 à 22,2 h, de 19 à 31 h. 12 parties sur 12 vont au bout.
- Le robot comptait une mort contre une élite de carte comme une victoire (défaut ancien, corrigé dans `tools/`). Il retentait donc le jour même, jusqu'à 35 morts à montagne_09 pour un Rôdeur. Avec la correction : 0 à 2 morts à montagne_09.
- Reste : la traîne de montagne_09 et montagne_13 (jusqu'à 12–13 h, élites et Wyrm). C'est le lot 6.

## Code
- Fichiers protégés, avec l'accord de Seb :
  - `systems/dungeon-system.js` et `systems/combat-engine.js` : textes seulement ;
  - `systems/story-quest-system.js` : une ligne dans `_grantReward` ;
  - `systems/adventure-quest-system.js` : textes seulement.
  - `save-system.js` n'est pas touché.
- Autres :
  - `systems/provisions-system.js` : Montagne, et commentaires des chasses mis à jour ;
  - `systems/scene-run-system.js` : offre de la Petite aventure ;
  - `systems/tavern-system.js`, `caravan-system.js`, `patrol-system.js`, `achievement-system.js` : « Or gagné » ;
  - `systems/elite-system.js`, `living-map-system.js`, `production-system.js`, `workshops-system.js`, `pa2-run.js` : textes ;
  - données : `data/story-quests.js`, `data/labyrinth.js`, `data/hunt-quests.js`, `core/constants.js` (compteurs swordKills, bowKills et magicKills retirés, SUI-8 ; une vieille sauvegarde les garde, sans effet).
- `en.js` : 15 clés renommées et retraduites, 1 fusionnée. i18n à 100 %, 0 orphelin.
- Harnais [340], et [210], [212], la mort au tutoiement ainsi que le Labyrinthe mis à jour.
- Robot : `freeSectorAgain` rend le vrai résultat du combat, et le motif « à terre » suit le nouveau texte.
- Aucun fichier ajouté.

## Contrôles
- Round : 5 287 OK, 0 échec, sur deux passes.
- Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- i18n : 6 569 textes, 100 %.

## À trancher par Seb
- Une Petite aventure offerte par l'Histoire peut se refaire sans fin pendant l'étape. Il suffit de rentrer au camp avec le butin (100 % gardé), ou d'abandonner, avant de libérer le secteur. Aucune place n'est prise, et le secteur reste à libérer. Le défaut existe depuis v3.429.23 sur les 12 étapes de carte, et ce lot l'étend à 3 de plus.
- Options :
  - (a) une sortie offerte rentrée sans libérer prend sa place après coup ;
  - (b) un seul départ offert par secteur et par étape ;
  - (c) laisser tel quel.
