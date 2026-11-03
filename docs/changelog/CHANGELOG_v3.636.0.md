# v3.636.0 — Faille, lot F-0 : le moteur du Labyrinthe partagé par sorte de run

Premier lot de la faille sans fond (conception « Faille » v0.1, docs `idees/`, validée par Seb le 03/11 ; FA2 option B). Le moteur du Labyrinthe aux leviers sert désormais plusieurs sortes de run. **Rien ne change pour le joueur** : le Labyrinthe est la seule sorte inscrite.

## Le moteur
- `data/labyrinth.js` : registre **`LAB_KINDS`**. Une sorte = config, tuiles, textes et clé d'état dans `explorationProgression`. Le Labyrinthe : `LABYRINTH_*`, clé `labyrinth`, comme avant.
- `systems/labyrinth-run.js` :
  - `cfg`, `tiles`, `texts` lisent la sorte du run en cours (`run.kind`), sinon l'argument, sinon le Labyrinthe. Un run sauvegardé sans `kind` reste le Labyrinthe.
  - Réserve, record et ouverture propres à chaque sorte. `isUnlocked`, `canStart` et `start` prennent la sorte en argument (le Labyrinthe sans argument). Une sorte peut porter sa propre condition d'ouverture (`isUnlocked`).
  - `say(clé, texte)` : texte propre à la sorte (`texts.say`), sinon celui du Labyrinthe. 14 textes du moteur passent par là (Edda, le Contremaître, le Gardien, les Pierres errantes).
  - Profil de héros de référence : celui du monde de la sorte (`refByWorld[worldId][adventureIndex]`, ou `heroRef`). Pour le Labyrinthe : Ruines, seconde aventure, comme avant.
- `ui/labyrinth-view.js` : config, tuiles et textes lus par sorte ; 27 textes passent par `labSay`. `labLaunch(sorte)`.
- `systems/mission-board-system.js` : une carte de mission par sorte ouverte (`labKind`). La carte du Labyrinthe ne prend plus le run d'une autre sorte pour le sien. `ui/quests-view.js` : l'attente lue sur la bonne sorte.

## Corrigé au passage
- L'alerte « des pas tout près » (note en rouge, marche guidée arrêtée) se déclenchait en cherchant le mot « tout près » dans le texte : jamais en anglais. Elle suit maintenant la distance (2 salles), comme le texte. En français, rien ne change.

## Vérifications
- Banc `labyrinthe-bench.js` à graine fixe (estimations et `--robot --runs 20`) : sorties **identiques** avant et après, octet pour octet.
- Chromium (390 × 844, graine fixe) : écran de descente, carte d'Edda et bilan identiques au pixel près (anticrénelage seul), mêmes textes, aucune erreur.
- `round-harness.js` : [431] ajouté (11 contrôles : réserve, record et textes par sorte, carte de mission par sorte, run sans sorte). Audit i18n : 0 manquant, 0 non littéral (`LAB_KINDS` déclaré dans `lang/data-fields.js`).
- Aucun fichier protégé touché, aucun fichier ajouté.
