# Aethervale v3.436.0 — Labyrinthe : combats comme les Petites Aventures, nouveau bilan

Retour de Seb du 09/10 : l'écran de fin était trop sec, et les combats devaient se jouer comme dans les Petites Aventures. S'applique sur la v3.435.1.

## Les combats
Chaque combat s'ouvre sur une feuille, avec la tête de l'adversaire et sa phrase.

- **Approches** :
  - **Charger** : plus de dégâts reçus (×1,3), plus d'or (×1,4), en 2 échanges ;
  - **Tenir** : moins de dégâts (×0,7), or normal, en 3 échanges.
- **Choix propres à chaque adversaire** :
  - **la garde d'un levier** : **Ruser**. Réussir, c'est passer sans combattre et sans butin (60 % à l'étage 1, −5 points par étage, 30 % au plus bas). Rater coûte 10 de Souffle, puis la garde frappe la première (×1,2) ;
  - **le Contremaître** (quand il rattrape le héros) : **Fuir dans le noir**. Coûte 10 de Souffle, ne fait aucun dégât, et le sème pour moins longtemps qu'une victoire ;
  - **le Gardien du plan** : Charger ou Tenir.
- **Estimation** sur chaque bouton : verdict, ~PV et ~or.
- **Déroulé** : échanges animés (lignes, PV qui baissent, secousse), puis l'issue et « Continuer ».
- **Or des combats** : multiple de l'or d'un squelette des Ruines (garde ×1,7 par ennemi, Contremaître ×2,5, Gardien ×6), multiplié par l'approche.
- **Combat en attente** : il est sauvegardé. Au rechargement, sa feuille revient, et l'on ne peut plus bouger tant qu'il n'est pas résolu.

## Le bilan
- En-tête : l'icône, l'issue, le badge « Nouveau record ».
- La phrase d'Edda selon l'issue.
- Le butin rapporté : Pierres errantes et or. En cas de chute ou de souffle perdu, ce qui est resté en bas.
- Le relevé :
  - étage atteint et record ;
  - étages franchis ;
  - combats gagnés et ruses réussies ;
  - prises du Contremaître.
- La carte d'Edda du dernier étage.
- L'écran est en plein écran sur fond de nuit et défile : la bande beige du bas disparaît.

## Banc (robot explorateur, 80 descentes par classe, palier Rare)
| Approche du robot | Profondeur | Tombé | Pierres / descente | Or / descente |
| --- | --- | --- | --- | --- |
| Tenir (toujours) | 3,4 à 3,6 | 3 à 9 % | ~5 | 1 700 à 1 950 (v3.435.0 : ~1 500) |
| Charger (toujours) | 2,7 à 3,0 | 16 à 18 % | 3,2 à 3,6 | 1 200 à 1 400 |

Charger ne paie que si les PV le permettent : c'est l'arbitrage voulu.

## Correctif
Le message « Butin rapporté » affichait l'identifiant d'une ressource (`pierre_errante`) au lieu de son nom.

## Code
- `systems/labyrinth-run.js` :
  - nouvelles fonctions : `estimate(kind, apId)` (avec l'or), `engage`, `fight`, `ruse`, `ruseChance`, `flee`, `pendingFight` ;
  - `run.pending` : le combat en attente ;
  - `run.stats` : les compteurs du bilan ;
  - le Contremaître ne frappe plus d'office ;
  - `fightGuard` et `fightBoss` restent comme raccourcis.
- `data/labyrinth.js` : `combatGold`, `ruseBase`, `rusePerFloor`, `ruseMin`, `ruseBreath`, `fleeBreath`.
- `ui/labyrinth-view.js` : feuille de combat animée, nouveau bilan.
- `css/04-panel-labyrinth.css` : le style des deux.
- `systems/sortie-system.js` : le nom des ressources dans le résumé.
- `lang/en.js` : 36 traductions ; 9 entrées devenues orphelines retirées.
- `tools/sim/labyrinthe-bench.js` : nouvelle API ; option `--charger`.
- **Aucun fichier ajouté. Aucun fichier protégé touché.** Le nouvel état (`pending`, `stats`, `refGold`, `bestBefore`) vit dans `game.sceneRun`, déjà sauvegardé.

## Contrôles
- Round : **4 113 OK**, 0 échec, sur trois passes.
  - Nouvelle section [212] (16 contrôles).
  - Le contrôle du Contremaître de [210] est adapté au combat en attente.
- Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- i18n : 4 575 textes, 100 %, 0 orphelin.
- Chromium (390 × 844), vrai jeu, console sans erreur :
  - garde : Tenir, puis Ruse ratée ;
  - rechargement avec un combat en attente, puis Charger ;
  - Contremaître : Fuir ;
  - Gardien : Tenir ;
  - remontée et bilan.
- `node --check` sur tous les fichiers modifiés.
