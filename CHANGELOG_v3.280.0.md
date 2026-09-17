# v3.280.0 — Sélection du second ennemi : deux causes possibles écartées

Seb ne parvient pas à sélectionner le deuxième ennemi de La Meute Affamée.

**Je ne reproduis pas le défaut.** En rendu automatique, sur la vraie quête, un clic sur le
second portrait change bien la cible : `targetId` passe de `e1` à `e2`, le halo suit, aucune
erreur. Plutôt que de deviner, cette version élimine les deux causes plausibles que la
mesure ne peut pas exclure sur un écran tactile.

## 1. La rangée se réécrivait à chaque rafraîchissement

`renderEnemyRow` est appelée à chaque dégât et à chaque rendu de l'écran, et réécrivait
`innerHTML` **même quand rien n'avait changé**. Or réécrire le DOM entre le toucher et le
relâchement annule le tap sur mobile : le portrait ne réagit pas, et aucune erreur
n'apparaît. C'est la cause la plus probable, et la seule qui expliquerait un comportement
intermittent.

La rangée n'est désormais réécrite que si son contenu diffère. Même traitement pour la
rangée d'alliés.

## 2. L'illustration pouvait mordre sur la rangée

`#enemy-display` remonte de 100 px et son illustration s'étire selon la hauteur disponible.
Un portrait à moitié recouvert ne réagit qu'à moitié, et la zone morte se déplace avec la
taille de l'écran — ce qui expliquerait que le premier portrait réponde et pas le second.
La rangée passe au-dessus (`z-index: 5`), reçoit les touchers sans condition, et les
portraits prennent `touch-action: manipulation` pour supprimer le délai de double-tap.

## Mesures

| Contrôle | v3.279.0 | v3.280.0 |
|---|---|---|
| `round-harness.js` | 2402–2403 OK, 0 échec | 2407–2408 OK, **0 échec** sur 3 passages |
| `sim/forest-bench.js --diff` | écart nul | **écart nul** |
| `boot-harness.js` | 4 OK | 4 OK, 0 échec |
| `hero-creation-harness.js` | 44 OK | 44 OK, 0 échec |

Section **[78]** ajoutée, 6 assertions : la rangée est stable tant que rien ne bouge, elle
change dès que la cible ou les PV changent, idem pour les alliés, et elle reste au-dessus de
l'illustration.

## Fichiers livrés

```
sw.js
round-harness.js
CHANGELOG_v3.280.0.md
css/03-combat-group.css
js/core/constants.js
js/ui/combat-group-view.js
```

## Si ça ne suffit pas

Trois précisions permettraient de trancher : le portrait s'éclaire-t-il brièvement au
toucher ? Le troisième ennemi d'un groupe de trois se sélectionne-t-il ? Et cela se
produit-il aussi en mode Tactique, où rien ne se rafraîchit tout seul ?
