# Aethervale v3.457.0 — Plusieurs caravanes

Décision de Seb du 20/10/2026 (option A) : on peut envoyer plusieurs caravanes à la fois, une par marché. Leur nombre dépend du niveau de la Halle marchande.

## Règle
- **1 caravane, plus 1 tous les 3 niveaux de Halle** :

  | Halle   | Caravanes |
  |---------|-----------|
  | 1 à 2   | 1         |
  | 3 à 5   | 2         |
  | 6 à 8   | 3         |
  | 9 à 10  | 4         |

  Les plafonds de Halle sont 4 en Forêt, 7 au Désert, et 8 aux Ruines et dans la Crypte. On a donc 2 caravanes dès la Forêt, et 3 à partir du Désert.
- **Une seule caravane par marché.** Une caravane part avec le surplus qui reste dans l'Entrepôt au moment de son départ : la deuxième prend donc ce que la première a laissé.
- Les trajets ne changent pas : durée, capacité, valeur, matériau rare et objet du trajet Long.

## Interface
- **Feuille « Caravane »** (Campement › Expéditions) :
  - un bloc par caravane partie : en route, ou rentrée avec son bouton « Décharger » ;
  - en dessous, le formulaire de départ, tant qu'il reste une place ;
  - dès qu'on a droit à plus d'une caravane, chaque bloc affiche le nom de son marché ;
  - dans le choix du marché, ceux qui ont déjà une caravane sont grisés et marqués « En route » ou « De retour ».
  - Quand tout est parti, la feuille dit à quel niveau de Halle la caravane suivante s'ajoute. Quand chaque marché ouvert a déjà sa caravane, elle le dit aussi.
- **Tableau des départs** : une ligne par caravane, intitulée « Caravane · Désert oublié » par exemple, et une ligne « Prête » s'il reste une place et un marché libre.
- **Carte vivante** : chaque caravane roule sur la carte de son marché.
- **Fiche de la Halle** : la description du niveau indique le nombre de caravanes à partir du niveau 3.
- Capture à 390 px vérifiée : une caravane rentrée, une en route, le départ vers les Ruines. La page ne défile pas en largeur et la console n'affiche aucune erreur.

## Sauvegarde
- L'état passe de `game.village.caravan` (une caravane) à **`game.village.caravans`** (une liste).
- Une ancienne sauvegarde est reprise au chargement : sa caravane entre dans la liste. Si elle n'avait pas de monde noté, elle prend le monde où l'on se trouve.
- `game.village` est déjà sauvegardé en entier : **`save-system.js` n'est pas touché**. La valeur par défaut `caravans: []` est ajoutée dans `createInitialGameState`.

## Code
- **Système** — `caravan-system.js` :
  - nouvelles fonctions `list`, `getMaxCaravans`, `getNextCaravanLevel`, `hasFreeSlot`, `getForMap` ;
  - `get`, `isBack`, `isTraveling`, `getSecondsLeft`, `getProgressPct` et `unload` acceptent un monde. Sans monde, `unload` décharge toutes les caravanes rentrées ;
  - `getBlockReason(trajet, monde)` refuse un marché déjà pris ;
  - le retour est annoncé une fois par caravane.
- **Interface** :
  - `caravan-view.js` : les blocs par caravane, et un compte à rebours pour chacune ;
  - `expeditions-view.js` : le tableau des départs ;
  - `village-buildings.js` : la description de la Halle ;
  - CSS : `04-panel-expeditions.css` (marché grisé) et `04-panel-village.css` (filet entre les blocs).
- **Langue** : `en.js` (8 textes). L'audit i18n donne 0 manquant et 0 orphelin.
- **Harnais** :
  - nouvelle section [250] ;
  - les tests [191], [192] et [198] lisent maintenant la liste des caravanes ;
  - le test [203] garde l'ancien format, ce qui vérifie la reprise d'une ancienne sauvegarde.
  - Résultat : 4 469 OK, 0 échec, sur deux passes.

Aucun fichier protégé n'a été touché et aucun fichier n'a été ajouté.
