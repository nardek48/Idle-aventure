# v3.546.0 — Bonus « % dégâts » : libellé « de base » (option A)

Décision de Seb : option A. L'option B a été mesurée au robot puis écartée.

## Ce qui change en jeu
- Le bonus « +X % dégâts » ne multiplie que la base de l'attaque, celle qui vient de la Force, et pas l'ATK de l'équipement. Il s'appelle maintenant « +X % dégâts de base ».
- Endroits concernés :
  - les affixes d'objet, à la Forge et à l'Enchanteresse ;
  - les bonus de panoplie ;
  - les Marques du donjon (Ascétisme, Fragilité) ;
  - les deux faveurs de halte.
- Aucun chiffre ne change.

## Banc de l'option B (le bonus multiplie aussi l'ATK de l'équipement), non retenue
| Cas | ATK en fin de partie (Chevalier) | Morts Chevalier | Morts Mage |
|---|---|---|---|
| Jeu actuel | 690 | 4 | 3 |
| B, bonus entiers | 1 897 (×2,75) | 0 | 2 |
| B, bonus divisés par 2 | 1 231 (×1,78) | 3 | 3 |

- Une campagne complète par cas, en vrais combats (`--combats`). Les durées restent entre 18,5 et 20,1 h.
- B obligerait à rééquilibrer tous les bonus du jeu.
- L'essai reste disponible dans le robot : `ESSAI_TAPMULT_TOTAL=1` (et `ESSAI_TAPMULT_ECHELLE=0.5` pour diviser les bonus par 2).

## Code
- `ui/equipment-view.js`, `data/dungeon.js` et `en.js` : les textes (4 textes, 1 orphelin retiré).
- `systems/stats-system.js` (protégé, accord de Seb) : le libellé des bonus de panoplie, une ligne de texte.
- `tools/sim/campagne-harness.js` : l'essai de l'option B.
- Aucun état sauvegardé, aucun fichier ajouté.

## Contrôles
- Round : 5 392 OK, 0 échec, sur deux passes.
- Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- i18n : 100 %, 0 orphelin.
- Chromium à 320 et 390 px : sur la fiche d'arme, « +29% dégâts de base » tient sur la ligne, sans coupure, 0 erreur.
