# v3.283.0 — La suggestion du Grimoire redevient visible

Seb : les suggestions ont disparu des boutons d'attaque.

## La cause

Le moteur les calculait toujours — vérifié, `suggestAction()` répond et le bouton concerné
porte bien sa classe `is-suggested`. C'est **l'affichage** qui les avait perdues.

La suggestion se marque par un `box-shadow` doré. Le passage des boutons d'action en carrés
(v3.275.0) leur a donné **leur propre `box-shadow`** — une ombre portée — dans un fichier
chargé après `03-combat.css`. À spécificité égale, c'est la dernière règle qui gagne : mon
ombre écrasait le halo.

C'est le défaut typique d'une reprise de style : on ajoute une propriété sans regarder qui
l'utilisait déjà pour dire autre chose.

## Ce qui est réparé

- **La suggestion** : halo doré reposé, avec l'ombre portée conservée dessous.
- **La posture active** (Garde en cours) : même cause, même correction, en vert. Sans elle,
  on ne distinguait plus une Garde active d'un bouton ordinaire.
- **La recharge** : opacité réduite, pour que « en recharge » se lise au premier coup d'œil.

En mode Grimoire, toujours aucune suggestion — c'est lui qui joue.

## Mesures

| Contrôle | v3.282.0 | v3.283.0 |
|---|---|---|
| `round-harness.js` | 2426–2428 OK, 0 échec | 2433–2435 OK, **0 échec** sur 3 passages |
| `sim/forest-bench.js --diff` | écart nul | **écart nul** |
| `boot-harness.js` | 4 OK | 4 OK, 0 échec |
| `hero-creation-harness.js` | 44 OK | 44 OK, 0 échec |

Section **[81]** ajoutée, 7 assertions : le moteur suggère toujours, le bouton porte sa
marque, le halo existe dans la portée du combat avec sa teinte d'origine et l'ombre
conservée dessous, la posture active est reprise, et le mode Grimoire ne suggère rien.

Ces assertions lisent le CSS plutôt que le rendu : c'est le seul moyen, ici, de figer
l'ordre des ombres dans un `box-shadow` — un test de rendu dirait seulement qu'il y a une
ombre, pas laquelle gagne.

## Fichiers livrés

```
sw.js
round-harness.js
CHANGELOG_v3.283.0.md
css/03-combat-group.css
js/core/constants.js
```
