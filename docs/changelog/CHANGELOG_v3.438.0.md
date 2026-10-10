# Aethervale v3.438.0 — Tanière du Basilic : deux traits pour deux règles

Début de la refonte des traits ennemis des donjons (décision Seb, courbe B : on apprend au premier donjon, on sacrifie un trait ensuite). Constat : la Tanière demandait 4 réponses du Grimoire (Bouclier, Silence, Enragé, Corrupteur) à un joueur qui n'a que 2 règles actives, alors que le Sanctuaire scellé n'en demandait qu'une.

## Ce qui change
- **Pool fixe des vagues** (`data/dungeon.js`) : `["slime", "goblin", "spider"]`. Le Troll des forêts (Bouclier) et la Ronce animée (Silence) n'arrivent plus par le pool du Cœur élargi à l'acte III. Restent : Enragé (Fileuse, Ronce qui se souvient) et Corrupteur (Basilic), la rage du Basilic à 25 % restant cachée.
- **Vagues plus solides** : `wavePremiumMult` 2,8 → 3,2.

## Mesure (plafond-bench, profil foret, 40 runs)
| | Chevalier | Rôdeur | Mage |
|---|---|---|---|
| Avant (pool acte III, 2,8) | 59 rds · 48 % PV · 1,9 pot. | 42 · 48 % · 0,4 | 41 · 47 % · 0,7 |
| v3.438.0 (pool fixe, 3,2) | 62 · 42 % · 1,9 | 44 · 48 % · 0,6 | 44 · 46 % · 1,0 |

Réussite 100 % et vague 5 passée à 100 % pour les trois classes. Retirer Troll et Ronce seul ne changeait qu'un à deux rounds : le banc ne les simulait pas, le calage v3.326 reste valable.

## Contrôles
- `round-harness` : 4 115 OK, 0 échec (3 passes) ; contrôle [55] mis à jour (3,2 et pool fixe).
- Aucun fichier ajouté, aucun fichier protégé touché.

## Suite
Cité engloutie (3 traits pour 2 règles) puis Sanctuaire scellé (4 pour 3).
