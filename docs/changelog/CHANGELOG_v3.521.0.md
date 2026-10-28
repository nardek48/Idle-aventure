# v3.521.0 — La Montagne au banc (audit, lot 6)

Audit du 27/10, lot 6 : la traîne de montagne_09 et montagne_13, le Wyrm du Chevalier, le Dragon ancien. Décisions de Seb : garantie A sur le butin des élites, Dragon +25 %. Le diff du robot et celui du jeu ont chacun été relus sous trois angles, et chaque constat est passé par une vérification adverse. Les 5 défauts confirmés sont corrigés. Aucun fichier protégé.

## D'où venait la traîne de 12 h
- Les deux parties à 31 h (Rôdeur à montagne_09, Mage à montagne_13) attendaient « le lendemain » pendant 11,4 et 11,7 h.
- Deux règles du robot, pas du jeu :
  - le robot ne retentait pas une élite perdue le jour même ;
  - son horloge partait de l'heure du lancement (20 h 30), d'où environ 11,5 h jusqu'à minuit.
- Le jeu gardait un vrai risque, plus petit : 35 % par victoire, sans garantie. Avec un robot fidèle, 6,4 % des parties attendaient un lendemain (8,3 % pour le Chevalier).

## Ce qui change en jeu
- **Garantie sur le butin des élites de la Montagne (option A)** : après deux victoires sans pièce, la troisième donne un Épique de la Montagne. Le compteur est commun au nid et à la forge froide, et repart à zéro à chaque pièce. Calcul : 6,4 % → 0,02 % de parties qui attendent un lendemain.
- La pièce d'une élite est du monde de la carte, même si le héros réside ailleurs (voyage libre). Avant, une victoire faite depuis la Crypte donnait une pièce qui ne comptait pas pour le palier.
- **Dragon ancien : +25 % de puissance** (×0,75 → ×0,94).
- **Défaite contre une élite de la Montagne** : le message disait « reste sous la lave jusqu'à demain », ce qui était faux, puisque la coulée ne touche que les Petites Aventures. Il dit maintenant « Soigne-toi, puis retente quand tu veux. ». L'élite n'est plus marquée sous la lave.
- **Textes corrigés** :
  - fin de montagne_09 : « Quatre pièces » au lieu de « Cinq » (palier de 4) ;
  - tutoriel de montagne_07 : la coulée vise une Petite Aventure ratée, et une élite perdue se retente le jour même ;
  - tutoriel de montagne_09 et aide du palier : la garantie est dite.

## Mesures (robot de campagne, 12 parties, --combats)
| | v3.519 (robot d'avant) | robot corrigé | v3.521.0 | palier 2 puis 4 (essai) |
|---|---|---|---|---|
| Durée médiane (min–max) | 21,1 h (19,1–31,0) | 20,1 h (19,2–21,1) | 20,4 h (18,9–28,3) | 20,8 h (19,1–23,2) |
| montagne_09 / 13, maximum | 12,3 h / 12,8 h | 1,4 h / 1,9 h | 0,3 h / 1,8 h | 0 h / 0,9 h |
| Morts au Wyrm (étapes 12-13 / 15) | Chevalier 15/19 | 11/52 au total | 19/50 / 0/1 | 9/10 / 9/20 |
| Dragon, PV restants (médiane) | 41,5 % | 46 % | 34 % | 50 % |

- La partie à 28,3 h du lot v3.521.0 bloque aux Ruines (ruines_13), pas à la Montagne.
- Le Chevalier ne mourait au Wyrm que parce que le robot ne rachetait pas de potions : 15 morts sur 19 avant la correction du robot, 5 sur 18 après. Pas de réglage du Chevalier.
- Dragon repris à l'entrée de montagne_19 (6 sauvegardes, 30 essais par réglage) : ×0,75 → 38 % de PV, 1 mort ; ×0,94 → 42 %, 0 mort ; ×1,05 → 34 %, 5 morts sur 35.
- Palier à 2 puis 4 (question de Seb) : l'Histoire donne déjà ces pièces, la condition disparaît donc. La partie ne va pas plus vite (20,8 h), et le Wyrm de montagne_15 tue alors 9 fois sur 20. Le palier reste à 4 puis 7.

## Robot (`tools/sim/campagne-harness.js`, commit 5cdaa8d0)
- Horloge partant d'une date fixe (1er octobre, 8 h, `--heure H` validé). Avec SAVE_IN, elle reprend à l'heure de la sauvegarde.
- Une élite de la Montagne perdue se retente une fois dans la journée.
- Potions rachetées pendant l'épargne quand l'or dépasse 50 000.
- L'entretien garde les pièces qui comptent pour le palier.
- Profils relevés à l'entrée de montagne_12 et 13.

## Code
- `systems/living-map-system.js` : garantie (`dropDry`, dans l'état de la carte, sauvegardé avec elle), monde de la pièce, message et marque de défaite d'une élite.
  - `game.livingMaps` est déjà sauvegardé, relu et remis à zéro en bloc ; `ensureDefaults` valide le compteur. Aucun nouveau bloc de sauvegarde.
- `data/elites.js` : `winDrop.pityAfter: 2`.
- `data/adventure-quests.js` : Dragon ×0,94.
- `data/story-quests.js` : 4 textes.
- `en.js` : 4 clés renommées et retraduites, 1 ajoutée.
- Harnais [342].
- Aucun fichier ajouté.

## Contrôles
- Round : 5 307 OK, 0 échec, sur deux passes.
- Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- i18n : 6 582 textes, 100 %, 0 orphelin.
