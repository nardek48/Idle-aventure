# v3.638.0 — Faille, lot F-1 : la faille sans fond

Contenu de fin de jeu, commun aux quatre fins (conception « Faille » v0.1, docs `idees/`, validée par Seb le 03/11). Une fois la Question répondue, la faille s'ouvre dans Expédition. C'est une sorte du moteur du Labyrinthe (v3.636.0) : on y **monte**, étage après étage, sans fond, et on redescend avec le sac.

## Ce que le joueur voit
- **Carte « La faille »** (monde : la Tour), après la Question : 2 montées, une revient toutes les 6 h, 1 Grande ration par montée (FA7). Avant : « La faille s'ouvre une fois la Question répondue ».
- **Le premier étage dit la fin choisie** (FA1) :
  - *La forme au sol* : « Tu es en haut. Elle continue de descendre en toi. »
  - *Ce que la braise a gardé* : « La couture bleue pâlit. Dessous, il reste ce qu'elle n'a pas pris. »
  - *Ce que tu as gardé* : « Le ciel est toujours fendu. Tu montes parce que tu peux. »
  - *Le feu tient encore* : « La braise tient. Là-haut, ça ne tient pas. Aldric dit d'y aller doucement. »
- **Pas de fond** : gardes de la Tour (gardien, mage corrompu, hybride), **+6 % composés par étage** (FA4). Record gardé à part de celui du Labyrinthe.
- **Le Reflet** garde l'escalier tous les 5 étages, plus fort à chaque fois (FA5).
- **La forme au sol** suit dès l'étage 3, tous les 3 pas (FA6). Elle ne se bat pas : si elle te rejoint, elle prend 10 de Souffle et recule. Sa lumière froide prévient (« Une lumière froide, tout près — vers le nord. »).
- **Butin** : Givre bleu (1 par escalier, 1 par givre trouvé, 3 par Reflet) et or. La Mémoire 25 à 28 viendra au lot F-3 (FA8).
- **Tutoriel « La faille »** à la première montée. Le tutoriel du Labyrinthe ne s'y déclenche plus.
- **Textes propres** : 45 textes du moteur remplacés pour la faille (la carte, le sac, la montée, le bilan), plus ses noms et lignes d'étage. Edda n'y est pas : c'est « ta carte ».
- Quoi de neuf : une ligne. Entrepôt : la Grande ration indique le départ « La faille ».

## Équilibrage (relevé sur les héros de fin d'Histoire)
Trois campagnes complètes (`--combats --joueur`, 122 OK chacune : Chevalier 41,3 h, Rôdeur 54,8 h, Mage 37,1 h), sauvegardes de fin, puis relevé de la faille : estimations de combat (Tenir) et robot au plan parfait qui monte sans s'arrêter (30 montées par classe).

| Réglage | Garde ét. 1 / 10 / 20 | Reflet ét. 5 / 15 | Étage 5 atteint | Étage 10 atteint | Record |
| --- | --- | --- | --- | --- | --- |
| Premier (gardes ×1,8, Reflet 8 / 2,4) | 15 / 41 / 118 % | 21 / 62 % | 90 à 100 % | 13 à 20 % | 11 à 13 |
| **Retenu** (gardes ×1,2, Reflet 5,3 / 1,6) | 6-7 / 16-23 / 59-61 % | 9 / 29-30 % | 97 à 100 % | 17 à 37 % | 12 à 17 |

- Avec le réglage retenu, **le Souffle arrête la montée** (27 à 29 fins sur 30), la forme au sol en tête. Les PV ne ferment qu'au-delà de l'étage 20.
- Cible FA4 (étage 10 une fois sur deux, mur vers 15 à 20) pas encore atteinte. Le robot ne passe pas par les sources, un joueur si. À juger en jeu ; réglage au lot F-2 avec les échos.
- **Écart à la conception** : le Reflet de la faille est bâti comme le Gardien du Labyrinthe (un ennemi de la Tour, le mage corrompu, × multiplicateurs de boss), pas sur la base `archmage` du Sommet interdit. Les combats de la faille se résolvent au pronostic, sans moteur de combat : seules ses statistiques comptent. Même nom, même image.

## Moteur (`systems/labyrinth-run.js`, aucun changement pour le Labyrinthe)
- `floorGrowth` : croissance des gardes linéaire (Labyrinthe, comme avant) ou composée (`guardCompound`) ; le boss suit l'étage si `bossCompound`.
- `foeTouch` : le poursuivant ne se combat pas ; il prend du Souffle et recule (événement « touched », sans feuille de combat).
- `floorNote` : une sorte peut donner sa ligne d'étage (la faille : la fin choisie, au premier étage).
- La raison d'attente, la réserve sur la carte et les textes de direction (monter, redescendre) passent par `say`.
- `ui/labyrinth-view.js` : une tuile pas encore dessinée garde son chemin et montre l'icône générique (`labTileMissing`, relevée dans `MISSING_ICONS`). Symbole du poursuivant propre à la sorte.
- Banc `labyrinthe-bench.js --robot` à graine fixe : sortie identique, octet pour octet, à celle d'avant v3.636.0.

## Images à générer
13 entrées ajoutées, famille « La faille » : 12 tuiles (`images/Maps/faille/`) et l'icône. Le Reflet et la silhouette y étaient déjà. **À signaler** : la carte de la faille (« Ta carte ») garde le fond papier de la carte d'Edda (CSS du Labyrinthe). C'est la même idée (une carte dessinée), mais c'est la même image pour deux lieux : à toi de dire s'il en faut une propre.

## Fichiers
- **Fichier ajouté : `js/data/faille.js`** (réglages, tuiles, textes, sorte `faille`), dans `index.html` après `labyrinth.js` et dans le précache de `sw.js`.
- Modifiés : `systems/labyrinth-run.js`, `ui/labyrinth-view.js`, `systems/mission-board-system.js`, `ui/warehouse-view.js`, `ui/tutorial-view.js`, `ui/news-view.js`, `lang/en.js` (69 textes), `lang/data-fields.js`, `atelier/images-a-generer.html`.
- Aucun fichier protégé touché. État sauvegardé dans `explorationProgression.faille` (déjà sauvegardé en bloc).
- Harnais [432] : 18 contrôles (ouverture après la Question, réserve et coût, ligne de la fin, tutoriel, croissance composée, Reflet, forme au sol, sauvegarde, chargement et précache).
