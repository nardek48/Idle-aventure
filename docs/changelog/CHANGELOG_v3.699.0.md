# v3.699.0 — Code et documents : chasses retirées, `ensure*` ciblés, affinité de la cible (Seb, 05/11)

Décisions de Seb du 05/11 (lot « Code et documents »), appliquées telles quelles.

## Corrigés

- **ARCH-9**, option A : le moteur des chasses, inerte depuis v3.511.0, est retiré.
  - Preuve que rien de jouable n'en dépendait : `HUNT_QUESTS` était vide, et plus aucun appel à `HuntQuestManager` / `HUNT_QUESTS` ne reste dans le jeu chargé (contrôle [464]).
  - Retirés : les branches de chasse de `combat-engine.js` (mort, victoire, meute), `progression-system.js` (décor), `dungeon-system.js` et `adventure-quest-system.js` (refus « chasse en cours »), `story-quest-system.js`, `mission-board-system.js` (`_huntMissions`), `sortie-system.js`, `quest-enemy-system.js` (reprise, contexte de combat), `world-travel-system.js`, `camp-system.js`, `talent-system.js`, `provisions-system.js` (vivres « hunt »), `combat-forecast-system.js`, `fil-rouge-system.js`, et les vues `quests-view.js` (fenêtres d'intro et de fin de lot), `admin-view.js`, `combat-view.js`, `combat-forecast-view.js`, `warehouse-view.js`, `debug-touch-view.js`.
  - Sauvegarde : `huntStats` et `huntRun` restent lus **et** écrits. Une sauvegarde prise en pleine chasse se charge sans erreur : le lot est clos, sa sortie revient au farm (`restoreBaseState`, deux lignes).
  - `js/lang/en.js` : 17 textes devenus orphelins retirés.
  - **À supprimer à la version suivante** (sortis d'`index.html` et du précache de `sw.js` dans ce commit, encore sur le disque parce que le `sw.js` publié les précache) : `js/systems/hunt-quest-system.js`, `js/data/hunt-quests.js`. Leurs textes dans `en.js` (sections « hunt-quest-system » et « HUNT_QUESTS ») partiront avec eux.
  - `tools/harness/hunt-fixture.js` supprimé (outillage, plus lu par personne). Les contrôles du moteur des chasses sont retirés du harnais ; ceux qui se servaient d'une chasse comme contexte de combat passent par une quête d'aventure ou un donjon. `campagne-harness.js` : le farm passe directement au donjon. `telegraphes-audit.js` tolère l'absence de `HUNT_QUESTS`.
- **PERF-4**, option A : les lecteurs appelés à chaque tick ne revalident plus l'état.
  - `story-quest-system.js` : `_ensureOnce(chapterId)` avec le drapeau `_ensured`. Un chapitre déjà validé (même objet, drapeaux de migration posés) n'est plus repassé. Un état remplacé (chargement, remise à zéro, Admin) ou un drapeau de migration effacé relance la validation. `getState` ne valide plus que le chapitre demandé ; `getChoice` passe par `getState`.
  - `adventure-quest-system.js` : `getStepProgress`, `isReadyToClaim` et `isWorldTransitionUnlocked` lisent sans `ensureDefaults`.
  - `scene-run-system.js` : `getRun` sans `ensureGameStateDefaults`.
- **Bug v3.698** : `getDamageAffinity(target)` lit la cible frappée, et `dealDamage` lui passe `foe`. En groupe, un coup sur la seconde cible prend sa propre faiblesse ou résistance. Sans argument, rien ne change (ennemi courant). `combat-engine.js` **(protégé, accord de Seb)**.
- **QUET-8** : l'Admin (`ADMIN_STORY_EXTRA`) pose aussi les marchés des Ruines et de la Crypte, les campements (Sanctuaire, Ossuaire, Gueule, Sommet), les donjons 3 à 6 (+ `dungeonLevelBest` à 1, comme une première victoire), le compteur de la Tanière (forest_13) et le camp de la Tour (tour_03). `js/ui/admin-view.js`.
- **ARCH-3** : `manifest.json`, la description devient « RPG d'aventure fantasy-médiéval au tour par tour, avec un village qui produit pendant ton absence. ».
- **SUIV-23** :
  - Petite ration, Ration moyenne et Grande ration ont un `sourceHint` (« Se cuisine à la Cuisine de camp (Chasse)… »). Avant, tant que la Chasse était fermée, la fiche de l'Entrepôt disait « Butin : expéditions, Petites Aventures et élites. ». Fichiers : `js/data/warehouse-resources.js`, `en.js` (3 textes). Vu dans Chromium (390 × 844) : ligne de 362 px de large, pas de défilement horizontal, aucune erreur.
  - `elites.js` : le commentaire disait « shielded et silenced sont exclus ». En réalité l'élite est `isBoss` et le moteur lui joue la branche d'élite (exaltation + bouclier). `shielded` reste une étiquette pour l'Arbre-mère.
- **ARCH-15** (reste) : passent en contrôles d'effet le calcul de lots des ateliers (plafond du bâtiment, puis Entrepôt plein) et le départ du donjon (repart de la première vague). Trois contrôles qui lisaient un commentaire n'en dépendent plus : PERF-13, NOV-13 et l'écran des dégâts. Ils passent donc aussi sur la copie publiée sans commentaires.
- **EQUI-19**, option A : définition du temps actif, écrite en tête de `campagne-harness.js`. **Temps actif = rounds de combat (`STATS.combatMs`) + navigation**, sans les attentes (soin au camp, production, recharges). Navigation : 5 s par geste (`NAV_GESTE_MS`), avec ces gestes :
  - chaque `act()` (achats, chantiers, taverne…) ;
  - chaque départ en combat ;
  - deux par étape (accepter, réclamer).

  `STATS.actifMs`, `STATS.navMs` et `STATS.gestes` sont écrits dans le JSON. Le relevé donne `actifH` par étape et au total ; `campagne-lot.js` affiche la médiane.
- `js/lang/en.js` : Quoi de neuf (une ligne).
- `tools/harness/round-harness.js` : [464] sauvegarde en pleine chasse, absence du moteur, `ensure*` comptés, affinité en groupe, Admin, manifeste, rations, workflow, définition du temps actif. Les contrôles du dépôt (workflow, outils) passent par `chemins.DEPOT`, ce qui permet de lancer le harnais sur une autre racine.

## Hors version du jeu (même lot)

- **PERF-7**, option A : `tools/publication/sans-commentaires.js` (**outil nouveau**, hors jeu, ni index.html ni précache). `pages.yml` le lance dans le job de publication, après les harnais, puis relance boot et création sur la copie allégée. Fonctionnement :
  - acorn repère les commentaires ; le code n'est pas touché ;
  - un commentaire de bloc devient autant de sauts de ligne qu'il en contenait, donc numéros de ligne et insertion des points-virgules restent ceux du dépôt ;
  - chaque fichier est relu après coup.

  Le dépôt garde ses commentaires.
- CLAUDE.md (SUIV-7, CLAUDE-CMD, CLAUDE-MAJ) : liste fermée des fichiers de quêtes protégés, commande de campagne `--joueur`, « >6 000 contrôles », ordre de chargement réel, exceptions de la règle « fichier nouveau », arborescence, État et suivi d'audit nommés.

## Laissés

- **QUET-8**, le reste : l'Admin force encore 45 étapes sans en fabriquer l'état, ce qui n'est ni simple ni sûr. Il s'agit :
  - des paliers d'équipement (desert_13, ruines_09/13, crypte_09/13, montagne_09/13, tour_10/13) ;
  - des cartes à N secteurs (forest_brume, desert_04, ruines_07/16, crypte_07/16, montagne_07/16, tour_06) ;
  - des compagnons dans le groupe (desert_08, ruines_03, crypte_03, montagne_03) ;
  - de forest_03/04/11/12/wenna, montagne_04 (veines) et tour_07 (Petites aventures).

  Les choix (13 étapes) sont faits juste après par l'Admin (première option).
- **ARCH-15**, le reste : environ 10 contrôles lisent encore le code (pouvoirs légendaires, butin de `killEnemy`, création du héros). Un contrôle d'effet y demande un tirage aléatoire forcé.

## Mesures

### PERF-4 : arrêt au Camp (Chromium 390 × 844 @3x, CPU ×4, fin de partie de Chevalier, 20 s, méthode v3.688)

| | Avant (v3.698.0) | Après (v3.699.0) |
|---|---|---|
| Script, sans profileur (2 relevés) | 19,1 / 22,4 ms/s | 20,7 / 20,2 ms/s |
| Script, avec compteurs | 25,6 ms/s | 21,5 ms/s |
| `StoryQuestManager.ensure` | 523,8 /s (4,6 ms/s) | 0 |
| `_ensureChapter` | 3 143 /s (2,3 ms/s) | 0 |
| `FilRouge.all` / `MissionBoard.list` | 7,6 / 3,7 ms/s | 4,1 / 1,9 ms/s |

Sans profileur, l'écart reste dans le bruit (environ 20 ms/s des deux côtés). Les gros gains étaient déjà pris en v3.688.0 (cache du fil rouge à 2 s). Les compteurs, eux, montrent la disparition des validations d'Histoire : −4 ms/s mesurés sous enveloppes. Il reste `AdventureQuestManager.ensureDefaults` (16 /s) et `SceneRunManager.ensureDefaults` (15 /s), appelés par d'autres chemins que les lecteurs visés.

### PERF-7 : copie publiée sans commentaires

208 fichiers JS : 4 923 → 3 973 Ko, **gzip 1 550 → 1 133 Ko (−416 Ko)**. Les 204 scripts chargés par index.html en français : gzip 1 536 → 1 126 Ko (−410 Ko). Sur la copie allégée : round 6 459 OK, boot 4 OK, création 44 OK, parcours 212 OK.

### EQUI-19 : `campagne-lot.js . --combats --joueur --n 1` (une partie par classe)

| | Chevalier | Rôdeur | Mage |
|---|---|---|---|
| Temps simulé | 44,2 h | 38,2 h | 44,5 h |
| **Temps actif** | **6,0 h** | **6,2 h** | **7,0 h** |
| dont rounds de combat | 1,6 h | 1,6 h | 2,0 h |
| dont navigation (gestes à 5 s) | 4,5 h (3 229) | 4,7 h (3 351) | 5,0 h (3 669) |

Les trois parties vont au bout (3/3, Tour comprise). Médiane du temps actif : 6,2 h. Le Chevalier compte 1 504 départs en combat, environ 1 500 gestes `act()`, dont 943 achats d'entraînement, et 230 acceptations ou réclamations d'étape. La navigation pèse donc près de trois fois les rounds. Le chiffre de 5 s par geste est une hypothèse, à recaler sur le journal de test de Seb (`compare-journal.js`).

Contrôles : round 6 459 OK (2 passes), boot 4 OK, création 44 OK, parcours 212 OK, i18n 100 % / 0 orphelin, icônes : aucune absente. Fichiers protégés touchés : `combat-engine.js`, `save-system.js`, `progression-system.js`, `dungeon-system.js`, `story-quest-system.js`, `adventure-quest-system.js` (accord de Seb, minimal). Fichier ajouté : `tools/publication/sans-commentaires.js` (outillage, hors jeu). Aucun fichier ajouté au jeu.
