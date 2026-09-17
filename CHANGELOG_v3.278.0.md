# v3.278.0 — La barre de PV du héros prend le cadre des compagnons

Demande de Seb : la même jauge que celle des compagnons, en gardant le remplissage vert.

## Ce qui change

La barre de PV du héros, **dans le cadre de combat**, passe du cadre « dragon »
(1091 × 215) à la **griffe de dragon** (1086 × 163) — celui qu'utilisent les mini-cartes et
le cadre d'un compagnon. Le remplissage reste le dégradé vert des PV : c'est la lecture la
plus immédiate de l'écran, et la cohérence recherchée porte sur la forme, pas sur la
couleur.

## Pourquoi une reprise CSS et pas un changement à la source

Le mini-héros est **le même élément** dans le HUD hors combat et dans le cadre du bas
pendant le combat — il y est simplement déplacé à l'exécution. Changer son balisage dans
`hud-view.js` aurait donc changé aussi le HUD, qui n'était pas le sujet. La reprise est
bornée à `.cb-hero`.

Vérifié en rendu, sur le balisage exact du mini-héros : hors du cadre il garde
`gauge-dragon-frame.png` en 1091 × 215, dans le cadre il prend
`gauge-dragon-claw-frame.png` en 1086 × 163, et le vert est identique dans les deux cas.

## Mesures

| Contrôle | v3.277.0 | v3.278.0 |
|---|---|---|
| `round-harness.js` | 2382–2383 OK, 0 échec | 2389 OK, **0 échec** sur 3 passages |
| `sim/forest-bench.js --diff` | écart nul | **écart nul** |
| `boot-harness.js` | 4 OK | 4 OK, 0 échec |
| `hero-creation-harness.js` | 44 OK | 44 OK, 0 échec |

Section **[76]** ajoutée, 6 assertions : le cadre emprunté, le rapport de forme, le vert
conservé, le balisage d'origine intact, et surtout que la reprise reste **bornée au
combat**. Cette dernière a d'ailleurs échoué à ma première écriture : je cherchais la
sous-chaîne du sélecteur, qu'on retrouve forcément à l'intérieur du sélecteur borné. Elle
vérifie maintenant que chaque occurrence est bien précédée de sa portée.

## Fichiers livrés

```
sw.js
round-harness.js
CHANGELOG_v3.278.0.md
css/03-combat-group.css
js/core/constants.js
```
