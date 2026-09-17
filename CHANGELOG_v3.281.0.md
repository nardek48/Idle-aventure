# v3.281.0 — Taps perdus sur iPhone : tout ce qui se tape devient un bouton

Seb, sur iPhone : impossible d'ouvrir les états du combat, ni de sélectionner un compagnon
ou le héros. Sur PC en émulation mobile, tout fonctionne.

## Le diagnostic

Le facteur commun n'est pas l'écran ni la largeur : ce sont les **éléments**. Tout ce qui
répondait était un `<button>` ; tout ce qui ne répondait pas était un `<div>` porteur d'un
`onclick`. Sur iOS, un `div` cliquable ne reçoit pas le tap de façon fiable — et
contrairement à ce que je pensais d'abord, `cursor: pointer` ne suffit pas : les deux
rangées d'états l'avaient déjà.

Plutôt que de chercher la règle exacte qui cassait le test de survol sur une plateforme que
je ne peux pas instrumenter, je supprime la classe entière de problèmes.

## Ce qui change

Passent de `<div onclick>` à `<button type="button">`, sans un pixel de différence à l'œil
(le style natif est neutralisé en CSS) :

- la bande d'alerte du combat ;
- la rangée des états ;
- les cartes d'acteur — héros compris.

Les portraits ennemis étaient déjà des boutons, ce qui explique qu'ils répondaient.

Hors mode Manuel, une carte d'acteur est désormais **désactivée** plutôt que simplement
muette : le navigateur sait qu'il n'y a rien à taper, et l'apparence reste celle d'une fiche
d'information, pas d'un contrôle grisé.

## Vérification

Le harnais ne peut pas simuler un tap. J'ai donc rejoué la scène dans un navigateur en
**mode tactile** (viewport iPhone, `hasTouch`, `isMobile`), avec de vrais `tap()` et non des
clics de souris :

- tap sur la carte de Wenna → elle devient l'acteur affiché ;
- tap sur le second portrait → la cible passe de `e1` à `e2` ;
- tap sur la bande d'alerte → la feuille « États du combat » s'ouvre.

## Mesures

| Contrôle | v3.280.0 | v3.281.0 |
|---|---|---|
| `round-harness.js` | 2407–2408 OK, 0 échec | 2415–2417 OK, **0 échec** sur 3 passages |
| `sim/forest-bench.js --diff` | écart nul | **écart nul** |
| `boot-harness.js` | 4 OK | 4 OK, 0 échec |
| `hero-creation-harness.js` | 44 OK | 44 OK, 0 échec |

Section **[79]** ajoutée, 8 assertions : chaque élément cliquable est un bouton bien
refermé, et les cartes sont désactivées hors mode Manuel.

## Fichiers livrés

```
sw.js
round-harness.js
CHANGELOG_v3.281.0.md
css/03-combat-group.css
js/core/constants.js
js/ui/combat-group-view.js
js/ui/combat-view.js
```

## Note sur ta seconde capture

L'écran en mode normal n'affichait qu'un seul ennemi parce que c'était « Chasse en Forêt »,
une quête de chasse : elle n'a pas de groupe, donc pas de rangée de portraits — c'est le
comportement attendu. Pour tester la sélection, il faut La Meute Affamée, ou n'importe quelle
quête relançable depuis la nouvelle section Admin.
