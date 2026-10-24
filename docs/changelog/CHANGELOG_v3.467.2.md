# v3.467.2 — Pièges : un désamorçage raté blesse

Avant, Subir était presque toujours moins bon que Désamorcer : un désamorçage raté donnait le même effet, sans rien coûter de plus. Seb a choisi l'option 1 (décision PG-D3 de la conception des pièges).

## Ce qui change en jeu
- **Désamorcer raté : l'effet joue, et une blessure.** La blessure est celle qui existe déjà : −1 cran sur tous les dés, jusqu'à une ration moyenne ou grande, un repas au feu ou un autel.
- **Subir** reste sans dé et sans blessure. Les textes de la fiche le disent :
  - Désamorcer : « Raté : l'effet joue, et une blessure. De justesse : −10 Souffle. » ;
  - Subir : « Pas de dé, pas de blessure. Tu avances, l'effet joue. » ;
  - après un raté : « Et une blessure : −1 cran sur tous les dés. »
- Le choix suit les chances affichées : avec un bon dé, on tente ; avec un mauvais (« Risqué », « Désespéré »), on subit.

## Mesures (`pa2-bench`, Périple, 150 runs par cellule)
Le robot désamorce quand le dé demande 4 ou moins, sinon il subit.

| Cas | KO | Pièges rencontrés | Effets subis par run |
| --- | --- | --- | --- |
| Forêt, droit devant, sans Trousse | 32 % (32 % en v3.467.0) | 1,55 | 1,37 |
| Forêt, Trousse | 27 % | 0,83 | 0,04 |
| Crypte, droit devant, sans Trousse | 27 % (22 % sans pièges) | 2,18 | 2,17 |
| Crypte, Trousse | 20 % | 1,42 | 0,09 |

À la Crypte, le dé de désamorçage est souvent mauvais : sans Trousse, on subit presque tout. La Trousse y vaut cher.

## Code
- `systems/pa2-run.js` : `resolveTrap`, raté = blessure en plus (`res.wound`).
- `ui/pa2-view.js` : textes de Désamorcer et de Subir, ligne de la blessure ; `css/04-panel-pa2.css` : `.pa2-result.is-red`.
- `lang/en.js` : 3 textes.
- Aucun fichier protégé, aucun fichier ajouté.

## Outils
- `round-harness.js` [281] : le raté blesse, Subir ne blesse pas.
- `pa2-bench.js`, `campagne-harness.js` : le robot subit quand le dé est mauvais.

## Contrôles
- i18n 100 %, aucun orphelin.
- round-harness 4685 OK, 0 échec (deux passes) ; boot, création du héros, parcours (139) OK.
