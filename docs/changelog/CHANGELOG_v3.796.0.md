# v3.796.0 — Montagne : la chaîne de l'arche (verrou) (14/11/2026)

Point 5 des « Signalés » (Seb 14/11 : option B, textes validés). Première moitié : le verrou. Aucun fichier protégé modifié, aucun changement de sauvegarde, aucun fichier ajouté.

## Accroche « La chaîne de l'arche » (`data/pa2-content.js`)
- 3ᵉ accroche de la Montagne (`PA2_HOOKS_BY_WORLD.mountain`), mini-quête de verrou sur le modèle du bâtisseur (Ruines) et de la porte (Tour).
- Rencontre « Le tailleur assis » :
  - *Lui donner la gourde* ou *Lui porter son sac* (20 Souffle) : la clé est marquée sur la carte, et un bloc tombe sur un ennemi de l'acte II ou III ;
  - *Passer* : or d'arrivée ×0,85.
- Verrou au seuil (l'arche, sur les deux pentes) : ouvrir avec la clavette, forcer (force), ou rebrousser.
- Clé `clavette` : posée en L3 ou R3, après le surplomb (`keySlots` de `montagne_1` et `montagne_2`, `data/pa2-maps.js`).
- **Image à fournir** : `images/Icons/scene/quest/quest_clavette.webp`. Le chemin est gardé, l'icône générique s'affiche en attendant.

## Banc (`tools/sim/pa2-bench.js`, Périple, 150 runs × 3 classes, `--montagne --resume`)
- La chaîne : KO 3 %, or 7 074, Sève 4,98. Pour comparaison, la forme (fin imposée) : KO 5 %, or 7 050.
- Verrou atteint dans 215 runs sur 450 (ouvert 96, forcé 119). Les autres passent par les passages secrets qui contournent le seuil.
- Aucun ajustement.

## Contrôles
- `round-harness` 7092 OK, 0 échec, sur 2 passes ([513f] accroche, deux pentes, chemin d'icône, aide et or).
- boot 4 OK ; création du héros 46 OK ; parcours complet 236 OK ; i18n 100 % (20 textes ajoutés en anglais).
- Captures iPhone : préparation et écran du verrou.
- Quoi de neuf : une ligne (FR + EN).
