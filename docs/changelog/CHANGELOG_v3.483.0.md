# v3.483.0 — Refonte de l'économie, F6 : textes et commentaires de l'audit

Dernier lot de corrections relevées par l'audit des ressources (v3.473.0). Aucun chiffre du jeu ne change.

## Ce qui change en jeu
- **« Où trouver »** (fiche d'une ressource à l'Entrepôt) :
  - Sève d'Aeswyn : la chasse « Ce que les bêtes ont bu » (Cœur de la forêt) est citée ;
  - Verre des dunes : le Dard des profondeurs est cité ;
  - Pierre errante et Cire de sépulcre : toutes les sources (Petites Aventures et carte, Sanctuaire scellé ou Ossuaire, Labyrinthe, chantier errant, veillée d'Aeswyn, caravane), plus seulement la caravane.
- **Enchanteresse** : quand l'or manque, le blocage dit « Pas assez d'or » (il disait « Ressources manquantes », alors que relances et transmutations se paient en or seul).
- **Fiole noire** non utilisée : « rendue à l'Entrepôt » (le journal disait « rangée dans le Sac »).
- **Taverne** : la notification de livraison affiche l'or réellement versé, Campement tenu compris (+10 %).

## Code
- `data/hunt-quests.js` (indications « où trouver », un commentaire), `systems/enchant-system.js`, `ui/village-building-view.js` (la vue reconnaît le nouveau message), `systems/combat-item-system.js`, `systems/tavern-system.js`, `lang/en.js`.
- Commentaires périmés corrigés : `systems/tavern-system.js` (nombre de contrats), `data/tavern-contracts.js` (vente à l'Entrepôt), `systems/caravan-system.js` (monde du marché), `data/pa2-content.js` (coffres de chaque monde), `data/living-maps.js` (ressource de première libération).
- Aucun fichier protégé, aucun fichier ajouté.

## Outils
- `round-harness.js` :
  - section [304] (4 contrôles : « où trouver », notification de la Taverne, Fiole noire, message de l'Enchanteresse) ;
  - [38b] et [279] : le blocage de l'or s'appelle « Pas assez d'or ».

## Contrôles
- i18n 100 %, aucun orphelin.
- round-harness 4890 OK, 0 échec (deux passes) ; boot, création du héros, parcours (139) OK.
