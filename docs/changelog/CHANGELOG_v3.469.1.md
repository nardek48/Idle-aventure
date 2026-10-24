# v3.469.1 — Conditions du run : deux réglages au banc

Trois conditions pesaient nettement plus que les autres au banc (v3.469.0). Seb a choisi l'option 1 : on règle les deux premières, et la troisième se juge en jeu.

## Ce qui change en jeu
- **Pleine lune** (Forêt) : combats +8 % de dégâts reçus (au lieu de +15 %).
- **Courants d'air** (Crypte) : la marche coûte 1 Souffle de plus par pas (au lieu de 2).
- **Les dormeurs remuent** (Crypte) : inchangé, à juger en jeu. Au banc, le robot garde la même besace ; face au combat renforcé, il fuit ou ruse, et perd du Souffle et des rations, alors qu'un joueur prendrait l'armure conseillée. Même en ne renforçant qu'un seul combat par run, le KO ne bougeait pas.

## Mesures (`pa2-bench`, Périple, 150 runs par cellule)
| Condition | Avant | Après | Sans condition |
| --- | --- | --- | --- |
| Pleine lune | 41 % | 36 % | 31 % |
| Courants d'air | 28 % | 18 % | 17 % |

## Code
- `data/pa2-content.js` : réglages et textes des deux conditions.
- `lang/en.js` : 2 textes.
- Aucun fichier protégé, aucun fichier ajouté.

## Contrôles
- `round-harness.js` [283] : pleine lune à +8 %, courants d'air à +1 Souffle par pas.
- i18n 100 %, aucun orphelin.
- round-harness 4720 OK, 0 échec (deux passes) ; boot, création du héros, parcours (139) OK.
