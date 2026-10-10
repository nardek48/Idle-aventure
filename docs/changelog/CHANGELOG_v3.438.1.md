# Aethervale v3.438.1 — Cité engloutie : trois traits pour deux règles

Suite de la v3.438.0 (refonte des traits ennemis des donjons, courbe B). La Cité est le premier donjon où il faut sacrifier un trait : 3 traits, 2 règles actives à son ouverture.

## Ce qui change
- **Le sphinx passe Corrupteur** (`data/dungeon.js`), au lieu de Blindé. Sa phase cachée à 33 % (Enragé) ne change pas.
- Traits de la Cité : **Blindé** (Guerrier des sables, Serment sous l'armure), **Enragé** (Dard des profondeurs), **Corrupteur** (le sphinx). Avec 2 règles, on protège les vagues ou le boss.

## Mesure (plafond-bench, 40 runs, avant → après)
| Profil | Chevalier | Rôdeur | Mage |
|---|---|---|---|
| desert0 (début d'acte III) | 28 → 20 % | 13 → 8 % | 20 → 18 % |
| campagne | 100 → 100 % | 85 → 80 % | 80 → 78 % |
| desertfin | 100 → 100 % | 100 → 100 % | 100 → 100 % |

Écart de quelques points, PV restants et potions stables : pas de recalage du sphinx. Vague 5 (étape `desert_12`) toujours passée à 100 %.

## Contrôles
- `round-harness` : 4 116 OK, 0 échec (3 passes) ; contrôle ajouté au [154] (sphinx Corrupteur dans l'encart).
- Aucun fichier ajouté, aucun fichier protégé touché.

## Suite
Sanctuaire scellé : 4 traits pour 3 règles (Blindé, Bouclier, Enragé, Vampirique pressentis).
