# v3.478.0 — Refonte de l'économie, lot F1 : des zones qui tiennent 2 à 3 heures

Premier lot de la refonte de l'économie des ressources (conception `systemes/village/Aethervale_Conception_Refonte_Economie_v0_1.md`, décision RE-1 de Seb, option 1). L'audit des ressources (v3.473.0) montrait que les zones s'arrêtaient de produire au bout de 30 minutes à 1 heure, hors ligne compris.

## Ce qui change en jeu
- **La réserve de chaque zone est triplée** : 45 / 90 / 180 de base (zone rapide, équilibrée, lente), au lieu de 15 / 30 / 60. Le débit ne change pas (décision E5).
- Une zone produit maintenant **2 à 3 heures** avant de s'arrêter, au lieu de 34 minutes à 1 heure.
- Ce que l'Entrepôt plein refuse à la récolte reste dans les zones, comme avant : rien n'est perdu.

## Mesures
Production d'un bâtiment au plafond de chaque monde (moteur du jeu) :

| Monde | Réserve par bâtiment | 1 récolte par jour | 4 récoltes par jour |
| --- | --- | --- | --- |
| Forêt | 234 → 703 | 234 → 703 | 13 % → 40 % de la production théorique (bois) |
| Désert, Ruines | 1 054 → 3 168 | 1 054 → 3 168 | 9 % → 28 % |
| Crypte | 1 581 → 4 752 | 1 581 → 4 752 | 9 % → 28 % |

Village de la Forêt (`village-economy-bench.js`) :

| Joueur | Avant | Après |
| --- | --- | --- |
| Tout d'une traite | fini après 7,5 h de jeu | 5,2 h |
| 3 séances de 25 min par jour | 4,6 h (2,5 jours) | 3,0 h (1,6 jour) |
| 1 séance de 40 min par jour | 6,0 h (9 jours) | 3,9 h (5 jours) |

La décision B tient : à l'arrivée au Désert, le village de la Forêt est entamé (27 à 41 % des niveaux), pas terminé. Au-delà de ×3, le gain plafonnait (l'Entrepôt et le chantier unique bornent).

## Code
- `data/production-plots.js` : `baseCapacity` des trois profils.
- Aucun fichier protégé, aucun fichier ajouté.

## Outils
- `round-harness.js` : section [299] (3 contrôles : réserves ×3, débits inchangés, durée avant l'arrêt).
- `village-economy-bench.js` (poussé à part le 25/10) : plafond du Terrain par acte et rangs actuels de la Halle et de la Taverne ; il ne finissait plus jamais le village de la Forêt.

## Contrôles
- round-harness 4863 OK, 0 échec (deux passes) ; boot, création du héros, parcours (139) OK.
