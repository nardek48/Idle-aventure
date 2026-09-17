# v3.288.0 — Le Donjon : élites escortées et phases du Basilic

Deux demandes de Seb, avec son accord pour `dungeon-system.js` (fichier protégé).

## 1. Les élites de donjon arrivent escortées

Le Donjon appelait `EliteManager.build()` directement, pas `spawn()` — l'escorte posée en
v3.286.0 ne s'y appliquait donc pas. `buildEliteWave` renvoie maintenant un tableau quand
l'élite a une escorte. Rien d'autre à changer : `spawnWave` fait
`game.enemy = buildWaveEnemy(...)`, et l'accesseur accepte les tableaux depuis le lot L-3.

Les membres d'escorte sont mis à l'échelle de la **vague**, pas du monde — un donjon avancé
ne doit pas servir des ennemis de Lisière. Ils sont construits à part plutôt que via
`buildWaveEnemy()`, qui appelle `ensure()` et suppose donc un run en cours : une escorte
doit pouvoir se fabriquer hors run, pour le banc et le harnais.

## 2. Les phases du Basilic

Deux seuils, pas plus — un combat de boss doit rester lisible.

- **75 %** : des fileuses descendent des voûtes. **Un seul renfort**, et c'est la mesure qui
  l'impose : sur la Fileuse, un seul ennemi supplémentaire faisait déjà passer les morts de
  23 % à 83 %.
- **25 %** : il entre en rage. L'archétype `enraged` existe depuis la v3.204 et fait monter
  ses dégâts à mesure qu'il perd des PV — il n'y avait qu'à l'allumer.

Trois règles accompagnent le système, chacune pour une raison précise :

- **Les renforts s'annoncent** (`engageIn: 1`) : ils frappent au round suivant, jamais par
  surprise. C'est la grammaire des télégraphes du jeu ; un pic de danger non annoncé se lit
  comme un bug.
- **Le soin de boss est suspendu** tant qu'un renfort tient debout. Sans ça, les renforts
  allongent le combat, donc multiplient les soins de 15 %, et une classe à faibles dégâts
  bute contre un mur — c'est exactement ce que le pronostic de combat sert à éviter. Le
  compte à rebours continue de tourner : le soin repart dès la salle nettoyée.
- **Les renforts se dispersent à la mort du chef**, comme l'escorte d'une élite. Sinon la
  salle de donjon ne se referme jamais.

`phases` était un champ **réservé** dans `data/elites.js` depuis longtemps, documenté comme
« prévu pour les élites à plusieurs phases (idée Seb) ». Il est enfin lu.

**Une note sur les serpents :** il n'y en a pas au bestiaire. J'ai pris l'araignée, qui
existe et tient le rôle dans un antre humide. Le jour où un serpent entre dans `ENEMY_DB`,
il suffit de changer un identifiant dans `data/dungeon.js`.

## Mesures

Boss du Donjon de la Forêt, profil de fin de Forêt, 60 combats par ligne, attaque de base
seulement — **et avec Wenna**, puisqu'elle est acquise depuis longtemps à ce stade du jeu :

| | Chevalier | Rôdeur | Mage |
|---|---|---|---|
| sans phases, seul | 43 % PV | 31 % | 33 % |
| **avec phases, seul** | **59 %** | **53 %** | **58 %** |
| avec phases + Wenna | 51 % | 44 % | 45 % |

Le boss passe d'une formalité à un vrai combat — vingt points de PV en plus — sans jamais
tuer. Et Wenna en rend huit à treize : elle reste la bonne réponse à un combat qui dure,
ce qu'on voulait qu'elle raconte depuis le début.

Un biais de mesure corrigé en cours de route : ma boucle comptait les **actes** et non les
rounds. Avec un compagnon manuel, un tap n'est qu'un acte et deux actes font un round — le
premier tableau affichait donc des durées doublées dès que Wenna était là.

| Contrôle | v3.286.0 | v3.288.0 |
|---|---|---|
| `round-harness.js` | 2465–2467 OK, 0 échec | 2494 OK, **0 échec** sur 3 passages |
| `sim/forest-bench.js --diff` | écart nul | **écart nul** |
| `boot-harness.js` | 4 OK | 4 OK, 0 échec |
| `hero-creation-harness.js` | 44 OK | 44 OK, 0 échec |

Section **[85]** ajoutée, 19 assertions. Cinq assertions existantes mises à jour : elles
supposaient qu'une vague d'élite renvoyait un seul ennemi.

## Fichiers livrés

```
sw.js
round-harness.js
CHANGELOG_v3.288.0.md
js/core/constants.js
js/data/dungeon.js
js/systems/combat-engine.js
js/systems/dungeon-system.js
```
