# v3.506.0 — Entrepôt agrandi : 20 niveaux (option B)

Décision de Seb du 27/10 : l'Entrepôt n'absorbait même pas la production maximale des zones.

## Le constat (mesuré)
- Zones au maximum, avec leurs deux améliorations : une ressource brute produit environ 2 200 par heure au Désert et aux Ruines (2 rangées), 2 650 à 3 650 à la Crypte et à la Montagne (3 rangées).
- Réserve des zones d'un bâtiment : environ 3 170 (2 rangées), 4 750 (3 rangées).
- Plafond brut de l'Entrepôt : 2 000 au Désert, 2 250 aux Ruines, **2 500 à la Crypte comme à la Montagne** (Entrepôt plafonné au niveau 8). Une seule récolte complète n'entrait pas.

## Ce qui change en jeu
- **20 niveaux** au lieu de 10. Jusqu'au niveau 10, rien ne change (+250 par niveau). **Au-delà, +500 par niveau.**
- **Plafond de monde** : Crypte 8 → **12**, Montagne 8 → **16**, la Tour ira jusqu'à 20. Forêt, Désert et Ruines ne changent pas (leurs paliers demandent les matériaux des mondes suivants).

| Niveau | Brutes | Fabriquées |
| --- | --- | --- |
| 10 | 3 000 | 3 499 |
| 12 (Crypte) | 4 000 | 4 499 |
| 16 (Montagne) | **6 000** | 6 499 |
| 20 (Tour) | 8 000 | 8 499 |

À la Montagne, une récolte complète des zones (environ 4 750) entre avec de la marge.

- **Coûts des nouveaux niveaux** (pente ×1,2, au lieu de ×1,42 qui rendait les niveaux 13 à 16 hors de prix) :
  - 10 → 12 : 25 000 puis 30 000 or, Planches, Blocs, Pierre, Lingots, **4 Cires consacrées** par niveau ;
  - 12 → 16 : 36 000 à 62 000 or, **3 à 5 Obsidiennes taillées** par niveau ;
  - 16 → 20 : même palier en Obsidienne, en attendant le matériau de la Tour.
  - Total du niveau 8 au 16 : 283 000 or (90 000 à la Crypte, 194 000 à la Montagne), 8 Cires consacrées, 15 Obsidiennes taillées, 8 347 Pierres. Chaque niveau tient dans le plafond du niveau précédent.

## Contrôles
- Campagnes de contrôle (3 classes) : 0 mur, 0 échec.
- `round-harness.js` : section [27b], trois contrôles de plus (niveau 16, niveau 20, coût 15 → 16), et la section des plafonds de la Crypte passe à 12.
- `parcours-harness.js` : P10 cliquait sur l'onglet « Paramètres » du grand écran, caché sur téléphone (échec depuis v3.502.0, sans rapport avec ce lot) ; le sélecteur ne prend plus que l'élément visible.

## Code
- `data/hunt-quests.js` : `WAREHOUSE_CAP_HIGH_FROM`, `WAREHOUSE_CAP_PER_LEVEL_HIGH`, `getWarehouseCapBonus(level)`.
- `systems/warehouse-system.js` : `getCap` lit `getWarehouseCapBonus`.
- `data/village-buildings.js` : Entrepôt `maxLevel` 20, deux paliers de coût, libellé d'effet.
- `data/world-caps.js` : Entrepôt 12 (Crypte), 16 (Montagne).
- `tools/docs-gen/generate-balance-guide.js` : texte du plafond.
- Aucun fichier ajouté, aucun fichier protégé.
