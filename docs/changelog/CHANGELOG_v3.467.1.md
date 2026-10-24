# v3.467.1 — Pièges : une part cachée, la torche les révèle

Retour de Seb après la v3.467.0 : les pièges se voyaient trop, on prenait forcément un autre chemin. Il a choisi l'option 2 (décision PG-G2 de la conception des pièges).

## Ce qui change en jeu
- **Un piège sur deux est caché** hors de la Crypte. À la Crypte, ils le sont tous, comme avant. Un piège caché ne se voit pas sur la carte : on le découvre en marchant dessus, et la fiche dit « Tu ne l'as pas vu venir. Ton pied est déjà dessus. » (à la Crypte : « Dans le noir… »).
- Les pièges visibles se contournent toujours, comme en v3.467.0.
- **La torche révèle les pièges cachés des sentiers que tu peux prendre** (pas plus loin). Sa description le dit. Ça vaut aussi à la Crypte, où la Lanterne allumée les montre en plus.
- La Lanterne allumée, la Lanterne des veilleurs et l'Œil de chouette montrent toujours tous les pièges en vue.

## Mesures (`pa2-bench`, Forêt et Crypte au Périple, 150 runs par cellule)
| Besace | KO | Or par run | Pièges rencontrés par run |
| --- | --- | --- | --- |
| Forêt, torche | 32 % | 242 | 0 (la torche les montre, le joueur contourne) |
| Forêt, Trousse, sans pièges | 25 % | 281 | — |
| Forêt, Trousse | 26 % | 273 | 0,8 |
| Crypte, torche | 21 % | 1 831 | 0 |
| Crypte, Trousse | 23 % | 2 125 | 1,5 |

La torche et la Trousse deviennent un vrai choix de besace :
- avec la torche, on voit tous les pièges des sentiers à prendre, mais les combats font 15 % de dégâts en plus ;
- avec la Trousse, on tombe sur les pièges cachés, et on les désamorce.

## Code
- `data/pa2-content.js` : `PA2_TRAP_RULES.hiddenPct` (0,5) ; nouvelle description de la Torche.
- `systems/pa2-run.js` : `_placeTraps` tire `hidden` par piège (tous à la Crypte) ; `isTrapShown` montre un piège caché à la Lanterne, à la torche sur un sentier ouvert, ou une fois découvert. Un run commencé en v3.467.0 garde sa règle (seule la Crypte cache).
- `ui/pa2-view.js` : phrase du piège non vu hors de la Crypte.
- `lang/en.js` : 2 textes (dont la Torche réécrite).
- Aucun fichier protégé, aucun fichier ajouté.

## Outils
- `round-harness.js` [281] : +5 contrôles (part cachée, Crypte tout caché, piège invisible, torche sur le sentier ouvert seulement, phrase de la fiche, description de la Torche).
- `pa2-bench.js` : `--trousse` (la Trousse à la place de la torche).

## Contrôles
- i18n 100 %, aucun orphelin.
- round-harness 4684 OK, 0 échec (deux passes) ; boot, création du héros, parcours (139) OK.
