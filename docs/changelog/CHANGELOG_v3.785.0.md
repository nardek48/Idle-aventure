# v3.785.0 — Simplification des rations (1/4) : plus de vivres de sortie (13/11/2026)

Décision de Seb (13/11, option C) : les rations ne servent plus de provisions. Le nombre de sorties par jour limite déjà les donjons, les PV limitent les élites, et le brut abonde en fin de partie. **Accord de Seb pour `js/data/story-quests.js`.** Aucun autre fichier protégé modifié, aucun changement de sauvegarde, aucun fichier ajouté.

## Ce qui change
- **Sorties refaites gratuites** (`systems/provisions-system.js`) : `getRequirement` ne demande plus rien. Donjon refait, mode libre et élite de carte rejouée partent sans ration. Le donjon (protégé) n'a pas changé : il interroge toujours `ProvisionsManager`, qui ne refuse ni ne prélève plus rien.
- **Expéditions et traversées gratuites** (`data/scene-templates.js`) : les 13 coûts en Petites, Moyennes et Grandes rations sont retirés (Sentier obstrué, Veine instable, Éboulis ferreux, Source tarie, traversées du Désert, de la Crypte, de la Montagne et de la Tour, remontée du fleuve…). L'Outre pleine reste demandée là où elle l'était.
- **La Faille est gratuite** (`data/faille.js`). Les 2 montées toutes les 6 h ne changent pas.
- **Histoire** (accord de Seb) :
  - 9 objectifs perdent leur « (coût : … ration) » ;
  - tour_17 ne rend plus de Grande ration.
- **Textes** :
  - la carte vivante ne dit plus qu'un combat rejoué prend ses vivres ;
  - l'Entrepôt ne liste plus les rations comme vivres de sortie.
- **Traductions** : 10 textes nouveaux (repris de l'anglais existant), 12 orphelins retirés.

## Mesure (robot, 3 parties complètes)
Chevalier, Rôdeur, Mage : 0 mort, aucun mur ; Tour finie à 33,4 / 30,1 / 34,3 h (le temps varie surtout avec l'attente connue à tour_07).

## Contrôles
- `round-harness` 7094 OK, 0 échec, sur 2 passes. Les contrôles des vivres deviennent des contrôles de gratuité : [S2a], [S2b], [62b], [71], [95], [125], [126], [139], [165], [167], [274], [275], [341], [415], [432].
- boot 4 OK ; création du héros 46 OK ; parcours complet 236 OK ; i18n 100 %, 0 orphelin.
- Quoi de neuf : une ligne (FR + EN).
