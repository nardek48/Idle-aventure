# CHANGELOG v3.232.0 — Recalibrage de la Forêt sur un joueur équipé

Base : v3.231.0. Valeurs validées par Seb le 12/09/2026 après mesure (`sim/balance-bench.js`, nouveau).

## Ce que la mesure a montré

Le banc de référence historique (`sim/forest-bench.js`) mesure un héros **nu**. La cible de 40 %
de PV perdus sur un boss avait donc été calée sur un personnage sans équipement. Un vrai joueur,
même en Commun intégral, ne perdait que **0 à 8 %** sur un boss de Forêt : le boss tombait en
2,9 rounds là où le héros aurait tenu 26.

`sim/balance-bench.js` remplace le profil posé à la main par un profil **dérivé de l'économie** :
or réellement gagné aux récompenses du moteur, 60 % en améliorations au coût réel, 40 % en
échoppe, drops de boss, points de talent par niveau, Forge et potions. Revenu de quêtes à zéro
(les quêtes ne sont pas encore jouables).

## Valeurs

| Constante | Avant | Après | Effet |
| --- | --- | --- | --- |
| `BOSS_PV_MULT` | 3,1 | **12** | Boss de Forêt ×3,9 |
| `ENEMY_PV_MULT` | 3,33 | **6** | Ennemis normaux ×1,8 |
| `WORLD_MULT_BY_WORLD` | [1.264, 2.03, 2.30, 4.19, 5.418, 7.892] | **[1.264, 0.378, 0.694, 1.507, 2.025, 3.019]** | Compense exactement la hausse pour les BOSS des mondes 1 à 5 |

La hausse ne va donc **qu'à la Forêt** : `worldIndex = 0` annule le terme de monde. Les PV des
boss du Désert et au-delà sont inchangés au pour cent près (vérifié par assertion).

Effet de bord assumé : les ennemis **normaux** des mondes 1+ perdent ~40 % de PV. Ils coûtaient
29 à 50 % de la barre de vie au Désert — c'est un pas dans le bon sens, en attendant la session
Désert.

## Résultat mesuré (PV perdus sur le boss, joueur équipé)

| Étape | Chevalier | Rôdeur | Mage |
| --- | --- | --- | --- |
| Forêt · début | 8 % → **41 %** | 0 % → 25 % | 0 % → 28 % |
| Forêt · milieu | 8 % → **38 %** | 0 % → 20 % | 0 % → 26 % |
| Forêt · fin | 7 % → **40 %** | 0 % → 29 % | 0 % → 34 % |

Le combat de boss passe de ~2,9 à ~9-10 rounds. Les ennemis normaux passent de 2 % à 4 % de PV
perdus, soit ~35 % cumulés sur les 9 ennemis avant un boss.

## Fichiers modifiés

- `js/systems/progression-system.js` — **PROTÉGÉ, valeurs validées par Seb** : 3 constantes.
- `js/sim/combat-round-sim.js` — miroir des coefficients (le bac à sable les surcharge déjà avec
  les valeurs réelles du moteur).
- `sim/balance-bench.js` — **nouveau** (`--stages f3,d1`, `--pvmult`, `--bosspv`, `--mult`,
  `--prec`, `--will`, `--quests`).
- `sim/forest-bench.js` — en-tête : ce banc mesure un héros nu, il devient un détecteur de
  régression et non une cible. `sim/forest-bench-ref.json` ré-enregistrée.
- `sim/world-bench.js`, `sim/test-round-sim.js` — ancres et attendus réalignés.
- `round-harness.js` — bloc [36] réécrit (compensation des mondes 1-5), bloc [1] et [19] alignés.
- `sw.js` — `CACHE_VERSION` 3.232.0.

## Tests

- `round-harness.js` : 1694 OK, 0 échec. `boot-harness.js` : 4 OK. `sim/test-round-sim.js` : TOUT OK.
- `sim/forest-bench.js` (héros nu) affiche désormais 100 % de PV perdus : attendu, la difficulté
  vise un joueur équipé.

## À tester sur iPhone

Un boss de Forêt doit tenir 9 à 10 rounds et coûter environ 40 % de la barre de vie au Chevalier.
Si le Rôdeur et le Mage te semblent trop à l'aise (25-34 %), c'est le point à traiter ensuite.

## Ce qui reste (session Désert)

Le mur du Désert n'est **pas** un problème de PV : entre fin de Forêt et début de Désert, le coup
encaissé passe ×4,2 quand les PV du héros ne font que ×1,2 et ses dégâts ×1,3. Leviers à
instruire : `ENEMY_POWER_SCALE_EXP` (0,3), la progression des PV du héros, et les prix d'échoppe
(×4 dès le monde 1, alors que le joueur y arrive avec 8 000 or).
