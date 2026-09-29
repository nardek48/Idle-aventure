# Aethervale v3.389.0 — Chantier P, lot P-1 : le moteur de parcours et les six quêtes de déblocage

Base : v3.388.0. Décisions de Seb du 29/09/2026 : **H1 A, H2 A, H3 A, H4 A, H5 A.**

**Aucun fichier nouveau. Aucun fichier protégé touché.**

## 1. Le moteur de parcours (H1)

Un **parcours**, c'est une ligne droite d'étapes, jouée avec les feuilles des Petites Aventures v2 : obstacle à trois voies avec dé, source, combat résolu. Un canevas en `mode: "parcours"` déclare ses étapes. Pa2Run s'en charge.

- **Le tracé est calculé.** Il y a un nœud par étape, en lacet vers le nord. Le départ est au sud. Tout le parcours est visible dès le départ.
- **Le fond (H5)** :
  - l'illustration de `parcours.image` quand elle existe ;
  - sinon un **parchemin en CSS**, sans image empruntée (`.pa2-parchment`).
  - Poser une carte plus tard ne demandera que l'image et, si tu veux, des positions.
- **Le départ** :
  - sans besace, on part tout de suite ;
  - avec une besace (bientôt la remontée du fleuve), on passe d'abord par la préparation, sans pactes.
  - Le **coût d'entrée** du canevas (Petite ration, Ration moyenne) est pris au départ, après les vivres de la besace, en tout-ou-rien.
- **Pas une Petite Aventure** : aucune place de la réserve n'est prise, pas d'accroche, pas de pacte, pas de trophée. Le tableau de missions ne les range pas parmi les Petites Aventures (`Pa2Run.isPaTemplate`).
- **L'arrivée (H3)** : la dernière étape franchie, le parcours est fini. Pas de chambre finale. Le jeu applique ensuite, comme la v1 :
  - le déblocage (bâtiment et drapeaux) ;
  - le voyage ;
  - le compte rendu à la carte vivante ;
  - « Un Périple » dans les Hauts faits.
- **Un jet raté** coûte des PV et une blessure, et le parcours continue. Seul un KO l'arrête.
- **À l'écran** :
  - le titre de la quête ;
  - « Étape 1/2 » dans le HUD et en tête de feuille ;
  - « Abandonner le parcours » ;
  - un bilan « Parcours terminé » avec le butin rapporté.
- **Les étapes** peuvent porter un texte (`text`), affiché en tête de la feuille. Il servira au journal des parcours d'Histoire en P-2.

## 2. Les six quêtes de déblocage

Le sentier obstrué, le bosquet silencieux, la terre en friche, la veine instable, l'éboulis ferreux et la source tarie sont maintenant des parcours de deux obstacles, tirés dans leurs gabarits habituels.

- **Leurs coûts, déblocages et visibilité au tableau ne changent pas.**
- **Leur butin reste leur ressource** (bois, blé, pierre, fer, eau), au barème de la v1 : par obstacle réussi, plus le bonus d'arrivée. Le HUD, les résultats et le bilan comptent cette ressource au lieu de l'or. Le Collectionneur (pouvoir légendaire) ajoute toujours un exemplaire.
- **Chaque obstacle de quête a sa phrase d'ambiance** : les 12 gabarits, dans la voix de la bible.
- **Les champs de l'ancien moteur sont retirés de leurs canevas** : paliers, portes, écarts de risque, préparation.

## 3. Sauvegardes en cours

Si une quête était en cours sur l'ancien moteur, elle se clôt au chargement :
- le butin déjà ramassé est rapporté ;
- la Petite ration est rendue ;
- la quête se relance du début, sans nouveau coût ;
- une ligne du journal le dit.

## 4. Contrôles

- **round-harness.js : 3637 OK, 0 échec, sur 3 passages.**
  - **[165]** (nouvelle, 19 contrôles) :
    - les six canevas ;
    - les phrases d'ambiance ;
    - les six quêtes jouées jusqu'au bout : déblocage, ressource, aucune place de Petite Aventure, pas de relance une fois finie ;
    - le parchemin et le titre à l'écran ;
    - la feuille d'obstacle et le bilan ;
    - les quêtes absentes des Petites Aventures au tableau ;
    - un ancien run repris.
  - **[S2a]**, **[S2b]** et le bloc Scierie de [71] sont réécrits sur le parcours v2 : coûts, déblocages, ressources, échec qui laisse continuer.
  - Nouvelle aide de test : `playParcours(win)`.
- **parcours-harness : P1 à P13, 139 OK, 0 échec.**
  - **P13** (nouveau) : le sentier obstrué joué au doigt dans Chromium. Il vérifie le parchemin, trois nœuds, deux feuilles d'obstacle, le bilan sans perte, la Clairière débloquée et le bois à l'Entrepôt.
- **campagne-harness : 38/38. boot-harness : 4 OK. hero-creation-harness : 44 OK.**
- **i18n : 3813 textes, 100 %, 0 orphelin.**
- `node --check` passe sur tous les JS modifiés.

## Suite

- **P-2** : les trois parcours d'Histoire (traversée, descente au Temple, remontée du fleuve). Leurs combats deviennent résolus (Charger ou Tenir). La remontée a une besace de 3 places.
- **P-3** : suppression de l'ancien moteur (`scene-engine`, `scene-run-system`, `scene-view`, `scene-check`) et nettoyage des tests.
- **Cartes à dessiner, quand tu veux**, au format 848 × 1264 :
  - une carte de Forêt pour les six quêtes ;
  - trois cartes du Désert, une par parcours d'Histoire.

## Fichiers

- **Jeu :**
  - `js/systems/pa2-run.js`, `js/ui/pa2-view.js`, `css/04-panel-pa2.css` ;
  - `js/data/scene-templates.js`, `js/data/pa2-content.js`, `js/lang/en.js` ;
  - `js/systems/scene-run-system.js`, `js/systems/mission-board-system.js`, `js/systems/living-map-system.js` ;
  - `sw.js` (CACHE_VERSION 3.389.0), `js/core/constants.js` (GAME_VERSION 3.389.0).
- **Hors jeu :** `round-harness.js`, `sim/parcours-harness.js`.
