# v3.777.0 — Simplification : les Marques du donjon sont retirées (12/11/2026)

Décision de Seb (12/11), lot 3 de la simplification avant l'Alpha. Les Marques faisaient double emploi avec les niveaux de donjon, qui règlent déjà la difficulté (+15 % de PV ennemis et +10 % d'or par niveau). Avec les Bénédictions prévues, la feuille de lancement aurait empilé trois couches. Accord de Seb pour `js/data/story-quests.js` (étape forest_13). Aucun autre fichier protégé modifié, aucun fichier ajouté ni supprimé.

## Ce qui change
- **Données** : `DUNGEON_MARKS` est vide (`data/dungeon.js`). Le moteur garde son canal de modificateurs (`AfflictionManager`), que les cartes de halte utilisent encore. Toute Marque demandée (vieille feuille, robot) est écartée au départ.
- **Feuille de lancement** (`ui/dungeon-view.js`) : plus de bloc « Marques », de multiplicateur « Récompenses ×… » ni de rappel « l'étape demande une Marque » ; le départ ne demande plus de confirmation « sans Marque » (aussi depuis le tableau du Camp, `ui/camp-view.js`).
- **Étape forest_13** (`story-quests.js`, accord de Seb) :
  - « Marques du corrompu » devient « Sous les racines » : entrer dans la Tanière et passer 5 vagues dans le même run ;
  - même id, même position, même récompense ;
  - la vérification lit le record de vague du donjon (`dungeonBestWave`), ce qui évite de toucher `story-quest-system.js` ;
  - une vieille sauvegarde qui avait déjà ses 5 vagues sous Marque reste prête ;
  - le tutoriel « Les Marques » devient « Le Donjon » (15 vagues et le boss, les haltes, 3 sorties par jour, les niveaux).
- **Traductions** : les textes des Marques sont retirés du registre (`lang/data-fields.js`) ; les nouveaux textes sont traduits ; 27 orphelins sont retirés de `en.js`.

## Mesure (robot, 3 parties complètes)
| | Morts | Murs | Or gagné | Temps simulé |
|---|---|---|---|---|
| v3.776.0 (avec Marques) | 0 / 1 / 0 | aucun | 1,89 / 1,88 / 1,89 M | 31,1 / 30,4 / 32,5 h |
| v3.777.0 (sans Marques) | 0 / 0 / 0 | aucun | 1,96 / 1,85 / 1,88 M | 39,5 / 25,4 / 28,1 h |

- **forest_13** se valide en une sortie (1,0 à 1,2 h de partie, niveau 7).
- **Temps simulé** : l'écart vient surtout des attentes d'atelier et de l'attente déjà connue à tour_07 (Chevalier 7,9 h). C'est le bruit habituel du robot, pas un effet des Marques.

## Contrôles
- `round-harness` 7232 OK, 0 échec, sur 2 passes. Les contrôles des Marques deviennent des contrôles de retrait : [47b], [56b], [ÉLITES], [297], [495]. Ceux de forest_13 vérifient les 5 vagues sans Marque, y compris la pause « Objectif tenu » [508]. [116] utilise un préparatif fictif.
- boot 4 OK ; création du héros 46 OK ; parcours complet 239 OK ; i18n 100 %, 0 orphelin.
- Quoi de neuf : une ligne (FR + EN).
