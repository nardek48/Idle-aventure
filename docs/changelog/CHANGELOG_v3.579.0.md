# v3.579.0 — Petites Aventures : la gourde donne l'avantage

Choix A de Seb (30/10). Au banc, la gourde ne servait presque à rien : on finit une aventure avec environ 40 de Souffle, et les KO viennent des combats. Rendre du Souffle ne pouvait donc pas peser. La gorgée sert désormais aux jets.

## La règle
- **Gourde** : deux gorgées, chacune **+15 Souffle et l'avantage au prochain jet** (deux dés, le meilleur compte). Avant : +25 Souffle par gorgée.
- Souffle plein : la gorgée se boit quand même, pour l'avantage. Si l'avantage est déjà pris, elle attend.
- Le bandeau montre « **Avantage** » tant qu'il n'est pas utilisé ; le choix ouvert met sa chance à jour aussitôt.
- Autel de pierre tenu (carte vivante de la Forêt) : la gorgée rend 25 Souffle au lieu de 15 (avant : 40 au lieu de 25).
- L'outre du Désert ne change pas : là-bas, la soif existe vraiment.

## Banc (`tools/sim/pa2-bench.js`, le robot boit avant un jet sous 70 %)
| Anneau | KO avec gourde | KO sans | Or avec / sans |
|---|---|---|---|
| Chemin (300 runs) | 8 % | 9 % | 283 / 277 |
| Périple | 17 % | 20 % | 369 / 339 |

Avant ce changement, la gourde valait 0 à 2 points de KO sans écart d'or.

## Code
- `js/data/pa2-content.js` : gourde `breath: 15, adv: true`.
- `js/systems/pa2-run.js` : `useItem` donne l'avantage (`run.advNext`), et se boit à Souffle plein pour l'avantage.
- `js/data/living-maps.js` : `gourdeBreath` 40 → 25 et son libellé.
- `js/ui/pa2-view.js`, `css/04-panel-pa2.css` : pastille « Avantage » au bandeau, message après la gorgée.
- `js/lang/en.js` : textes anglais.
- Aucun fichier ajouté, aucun fichier protégé, aucun nouvel état.

## Contrôles
`round-harness` 5 562 OK, 0 échec (deux passes ; nouvelle section [383], [59b] mis à jour) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` 142 OK ; audit i18n 100 %, 0 orphelin. Bandeau vérifié sous Chromium à 390 × 844.
