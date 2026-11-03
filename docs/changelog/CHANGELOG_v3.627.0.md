# v3.627.0 — Tour, lot T-2a : la carte des étages et l'escalier

Première moitié de l'acte II « Les étages » (Conception Tour TW8 à TW10, textes d'étapes validés par Seb). Le lot T-2 est livré en deux fois : T-2a (étapes 6 et 7), puis T-2b (étapes 8 à 10 : les gisants debout, le Gardien qui répète, les feuillets, le palier Légendaire).

## Les deux étapes
6. **La rue qui tient** : la carte des étages s'ouvre ; libérer 3 étages. Tutoriel « Les étages ».
7. **L'escalier** : réussir une Petite Aventure de la Tour depuis l'acceptation de l'étape (compteur `towerPaWins`).

Récompenses provisoires : or, et 3 puis 4 Givres bleus.

## La carte des étages
- Une carte en coupe, six étages, du dernier camp (en bas) au palier sans murs (en haut) : l'étage du sable, la rue qui tient, les gisants debout, la veine du dedans, les marches de craie, le palier sans murs. Positions provisoires (image à générer).
- Chaque étage se souvient d'un monde : sa Petite Aventure tire ses obstacles dans les gabarits du Désert, des Ruines, de la Crypte, de la Montagne et de la route du nord.
- La carte ne recule jamais (`noRegress`). Échec propre, **« La redite »** : l'étage raté est refait par la Tour, ennemis ×1,25 jusqu'au lendemain. La nuit le dit (« Cette nuit, la Tour a fini de refaire : … »).
- **Marché de la Tour** au dernier camp (ouvert à `tour_06`) ; trajet Long : 2 Givres bleus garantis.

## L'escalier (Petite Aventure de la Tour)
- Pas de règle propre (les échos passent par les obstacles) ; Souffle 4 par pas.
- Gardien : un gardien de pierre. Destinations : le gardien du palier, la citerne haute, la porte murée.
- Trois nuits (Lumière froide, Nuit des redites, Silence), reprises d'effets existants ; cinq pièges et deux sentiers coupés (icônes à générer).
- Deux cartes (`tour_1`, `tour_2`), places reprises de la Montagne en attendant les images.

## Équilibrage
Campagne au robot (`--combats --joueur`) : les trois classes passent les étapes 6 et 7, 109 contrôles, 0 échec, aucune Petite Aventure de la Tour ratée. Elles semblent faciles : à juger en jeu, banc dédié au besoin.

## Code
- `data/living-maps.js` : carte `tower`. `systems/living-map-system.js` (« La redite »), `ui/living-map-view.js` (ligne de l'étage refait), `systems/pa2-run.js` (×1,25 de la redite ; `successCount` des modèles), `systems/world-day-system.js` (nuit).
- `data/scene-templates.js` : `petite_aventure_tour`. `data/pa2-content.js` : tables de la Tour (tranche, obstacles, gardien, Givre, nuits, pièges, ennemis, lieux, destinations, sentiers coupés). `data/pa2-maps.js` : `tour_1`, `tour_2`.
- `systems/caravan-system.js` : Marché de la Tour.
- `data/story-quests.js` : `tour_06`, `tour_07`, `storyTowerFloorsFreed`, `storyTowerPaWins`.
- `lang/en.js` : 87 textes. Aucun fichier protégé touché, aucun fichier ajouté.

## Images manquantes (vrais chemins gardés)
Carte des étages, deux cartes de l'escalier, deux icônes de sentier coupé (ajoutées à « Images à générer » ; format des cartes corrigé en 848 × 1264).

## Outils
- `round-harness.js` : [422].
- `campagne-harness.js` : gestes `tour_06` et `tour_07`.
