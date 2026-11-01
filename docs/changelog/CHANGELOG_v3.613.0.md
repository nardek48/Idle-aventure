# v3.613.0 — Entraînement ×4 dès le Désert, combats avec Wenna contre une élite seule

## Entraînement (chantier « stats du héros », option C)
- Les niveaux d'entraînement achetés à partir de 60 coûtent ×4 (`TRAINING_PRICE_TRANCHES = [{ from: 60, mult: 4 }, { from: 150, mult: 15 }]`, dans `upgrades.js`). La Forêt (jusqu'à 60) et la tranche au-delà de 150 ne changent pas.
- Un palier du Désert (10 niveaux sur les 5 caractéristiques) coûte environ 6 100 à 9 000 or, au lieu de 1 500 à 2 300.
- Banc de campagne en vrais combats (robot, ×1 / ×3 / ×4 / ×5) :
  - à ×4, aucun mur ; arrivée à la Montagne en 17,8 h (18,3 h à ×1) ;
  - en fin de Désert, le robot entraîne d'abord sa caractéristique de classe et l'Endurance : Célérité 104, Précision 77 ;
  - à ×5, le robot n'avait plus d'or à l'étape des 4 pièces Rares (`ruines_13`) et y passait 20 h.

## Correctif : les combats avec un compagnon contre une élite seule
- Une élite sans escorte (l'Arbre-mère, par exemple) n'ouvrait pas de nouveau combat (`Initiative.newCombat`). Le numéro de combat restait le même, et l'étape `forest_wenna` (« 3 combats avec Wenna ») ne comptait qu'un seul de ces combats. Le jet d'initiative non plus n'était pas relancé.
- Correctif dans `elite-system.js` (chemin sans escorte).

## Outils
- Robot de campagne (`tools/sim/campagne-harness.js`) : les lots d'atelier tiennent sous le seuil du Grand Ouvrage automatique. Il traverse désormais l'Histoire jusqu'à `montagne_13`, contre `forest_wenna` auparavant.

## Contrôles
- round-harness : 5 785 OK, 0 échec, sur 2 passes. Nouvelle section [408] ; [322] mise à jour.
- boot : 4 OK. Création du héros : 44 OK. Parcours : 142 OK.
- i18n : 100 %.
- Aucun fichier ajouté, aucun fichier protégé modifié.
