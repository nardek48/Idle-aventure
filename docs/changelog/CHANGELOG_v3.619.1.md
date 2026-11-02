# v3.619.1 — Correctif : mannequin de l'équipement

Bug signalé par Seb : depuis la v3.618.0, l'écran Héros › Équipement › Équipé n'affichait plus le mannequin (téléphone et PC).

## Cause
La texture parchemin du lot 2 est posée en `background-image !important` sur une liste de classes. Deux cartes de la liste avaient leur propre image de fond, recouverte : `.hs-eq` (silhouette du mannequin) et `.exp-world` (route de la Caravane). Relevé exhaustif fait en désactivant `00-cartes.css` sur 26 écrans et fiches, téléphone et PC : ce sont les deux seules.

## Changements
- `css/00-cartes.css` : `.hs-eq` et `.exp-world` retirés de la liste « texture » ; ils gardent le cadre secondaire.
- `tools/harness/parcours-harness.js` (P14) : contrôle que le mannequin et la route restent visibles ; une carte avec sa propre illustration compte comme habillée.
- Quoi de neuf : une ligne (FR + EN).
