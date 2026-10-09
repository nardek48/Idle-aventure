# Aethervale v3.434.0 — Ruines : le Labyrinthe aux leviers (livraison 1)

Le Labyrinthe aux leviers (RU12) entre dans le jeu. Conception : « Labyrinthe aux leviers » v0.1. Atelier validé sur iPhone : `atelier/labyrinthe-final.html`. Décisions de Seb du 09/10/2026 :
- combats comme les Petites Aventures ;
- 3 descentes ;
- le même Contremaître.

S'applique sur la v3.433.1.

## Ce que fait le joueur
- **Une mission sur le tableau**, « Le Labyrinthe aux leviers », une fois l'étape 10 des Ruines franchie.
  - **3 descentes en réserve**, une revient toutes les 4 h. Une descente coûte 1 Petite ration.
  - Accepter, c'est descendre.
- **Des étages générés, dans le noir.** On ne voit que la salle où l'on est et ses voisines ouvertes. Les salles visitées restent en mémoire.
  - L'étage fait 5 × 6 salles au début, jusqu'à 6 × 8 en profondeur.
  - Le plus court chemin fait 10 à 15 pas.
- **Deux leviers par étage, dont un gardé.** Un levier fait tourner des pans de mur : il ouvre une porte et en ferme une autre. Une porte-pan barre le chemin de l'escalier à l'étage 1, deux ensuite, plus un leurre dès l'étage 4.
- **La carte d'Edda** se dessine dans le coin, à chaque salle. Les pans qu'un levier fait tourner y sont notés en violet, même au loin. Toucher la carte l'ouvre en grand : toucher une salle dessinée y emmène le héros, en payant ses pas.
- **Le Souffle** : 3 par pas, 4 par tirage. Il remonte de 30 en descendant ; une source cachée rend aussi des PV.
- **Le Contremaître traque** à partir de l'étage 2. On l'entend avant de le voir. S'il te rattrape, tu perds des PV et il recule, sonné.
- **Le Gardien du plan** garde l'escalier tous les 5 étages.
- **À l'escalier : descendre ou remonter avec le sac** (Pierres errantes et or).
  - Remonter garde tout le sac.
  - Tomber ou s'essouffler n'en garde que la moitié. La descente est alors rendue, comme pour une Petite Aventure.
  - Quitter l'onglet en pleine descente, c'est l'abandon : la moitié du sac.
- Une descente en cours **reprend après un rechargement**.

## Équilibrage (banc `tools/sim/labyrinthe-bench.js`, nouveau)
Combats résolus comme les Petites Aventures : héros seul, estimation affichée avant de combattre. PV perdus, en pourcentage des PV max :

| Combat | Palier de l'acte II | Palier Rare | Cible |
| --- | --- | --- | --- |
| Garde d'un levier (squelette / bâtisseur / gargouille), étages 1 à 5 | 12 à 26 % | 12 à 25 % | 12 à 20 % |
| Le Contremaître (un coup) | 32 % | 28-29 % | ~30 % |
| Le Gardien du plan | 40-42 % | 38-39 % | ~40 % |

- Calage : gardes à part par créature (la gargouille était à 27-38 %) ; Contremaître ×0,55 / ×0,8 sur l'élite du Sanctuaire ; Gardien bâti comme le gardien des Petites Aventures des Ruines, un cran au-dessus (×8 / ×2,4).
- Gains provisoires :
  - escalier : 1 + l'étage en Pierres errantes, et 150 or par étage ;
  - coffre : 1 + un par deux étages ;
  - Gardien : +3.
- Le robot qui explore dans le noir viendra en livraison 2, pour régler le Souffle, la vitesse du Contremaître et les gains.

## Code
**Fichiers ajoutés** (tous dans `index.html` et dans le précache de `sw.js`) :
- `js/data/labyrinth.js` : réglages, tuiles, textes ;
- `js/systems/labyrinth-run.js` : génération, solveur, déplacement, leviers, Contremaître, combats, sac, réserve ;
- `js/ui/labyrinth-view.js` : vue à la torche, carte d'Edda, feuilles, bilan ;
- `css/04-panel-labyrinth.css`.

**Fichiers modifiés** :
- `systems/scene-run-system.js` : le run du labyrinthe (`lab: true`) n'est pas pris pour un ancien run ; l'abandon passe par lui ;
- `ui/scene-view.js` : l'onglet « scene » route vers le labyrinthe ;
- `systems/mission-board-system.js` et `ui/quests-view.js` : la mission, et le délai de la prochaine descente ;
- `lang/en.js` (97 traductions) et `lang/data-fields.js`.

**Ce qui ne change pas** :
- aucun fichier protégé touché ;
- **aucun nouvel état sauvegardé hors des blocs existants** : la descente vit dans `game.sceneRun` (déjà sauvegardé et repris au démarrage), la réserve dans `explorationProgression.labyrinth`.

**Images** (de Seb, 09/10) : `images/Maps/labyrinthe/` (13 tuiles), `images/Icons/quest_icons/exploration/labyrinthe.png`. Le portrait `images/Boss/gardien_du_plan.jpg` est provisoire, tiré de la première planche : un portrait de face carré est à refaire.

## Contrôles
- Round : **4 089 OK**, 0 échec, sur huit passes. Nouvelle section [210] (31 contrôles) :
  - 400 étages tirés, tous jouables ;
  - un étage joué au plus court ;
  - la sauvegarde ;
  - le Contremaître ;
  - remonter, tomber, abandonner ;
  - la réserve et la mission.
- Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- i18n : 4 543 textes, 100 %, 0 orphelin. `missing-icons.js` : aucune image absente.
- Chromium (390 × 844), vrai jeu, console sans erreur :
  - la mission sur le tableau, la descente, le levier gardé, la carte d'Edda ;
  - le rechargement de la page en pleine descente : reprise au même endroit, avec le même Souffle ;
  - la remontée et le bilan.
- `node --check` sur tous les fichiers modifiés.
