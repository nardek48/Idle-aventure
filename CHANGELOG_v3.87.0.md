# Aethervale — v3.87.0

## Équilibrage combat (chantier "scie") — nerf talents/équipement + WORLD_MULT par monde

Suite directe de v3.86.0 (correctif régression bac à sable). Porte en dur les facteurs de nerf
validés par simulation lors de la session d'audit "progression en scie", et le coefficient de
scaling ennemi par monde qui en découle. Débloque la tension aux mondes Montagne/Tour
(auparavant bloqués à 0% de deathRate quel que soit `WORLD_MULT`, plafond de défense saturé
dès la Montagne).

⚠️ **`CACHE_VERSION` dans `sw.js` à bumper de 3.86.0 vers 3.87.0** — fichier non disponible
dans cette session (absent du zip de handoff transmis), à faire manuellement avant mise en ligne.

## Fichiers modifiés

- `systems/stats-system.js`
- `data/equipment.js`
- `systems/progression-system.js`
- `systems/combat-sandbox-system.js`

---

## `stats-system.js`

Ajout d'un facteur `SURVIVAL_DEFENSE_FACTOR = 0.35` appliqué à la somme des bonus de défense
des 3 talents de survie (`t_second_wind` / `t_vital_anchor` / `t_immutable_guardian`), avant
le calcul de `game.heroDefensePct`. Réduit l'apport de ces talents de 65% par rapport à
l'original, sans toucher à leur bonus de PV max (`survivalHpMult`, non modifié) ni au plafond
`HERO_DEFENSE_CAP` (toujours 0.6, inchangé).

Effet mesuré (profil "fin de monde", Chevalier) :
- Montagne (epic) : `defensePct` 60% → 37%
- Tour (legendary) : `defensePct` 60% → 37% (les deux mondes étaient auparavant strictement
  identiques sur cet axe, aucune marge de progression restante)

## `equipment.js`

Réduction des `ranges` (bornes min/max de génération procédurale) pour les emplacements
`weapon` (stat `tapDmg`), `armor` (stat `defense`) et `boots` (stat `autoDps`), sur les
paliers `rare`/`epic`/`legendary` — `common` inchangé, `green` réduit d'un facteur ×0.9
uniforme.

| Emplacement | Rareté | Avant | Après |
|---|---|---|---|
| weapon | green | [26, 35] | [23, 32] |
| weapon | rare | [40, 60] | [32, 48] |
| weapon | epic | [75, 110] | [49, 72] |
| weapon | legendary | [140, 200] | [59, 84] |
| armor | green | [0.03, 0.05] | [0.027, 0.045] |
| armor | rare | [0.05, 0.08] | [0.038, 0.06] |
| armor | epic | [0.08, 0.12] | [0.044, 0.066] |
| armor | legendary | [0.12, 0.18] | [0.046, 0.068] |
| boots | green | [5, 9] | [4, 8] |
| boots | rare | [9, 15] | [7, 12] |
| boots | epic | [15, 28] | [9, 17] |
| boots | legendary | [28, 50] | [11, 19] |

**Point de vigilance signalé et accepté par Seb :** les facteurs multiplicatifs par palier
(plus agressifs en haut de gamme) resserrent l'écart absolu entre `epic` et `legendary` au
point que les bornes se chevauchent légèrement sur `weapon` et `armor` (ex. weapon legendary
bas = 59, weapon epic haut = 72 → un legendary mal roll peut tomber sous un epic bien roll).
Les **moyennes** de palier restent strictement croissantes sur les 3 emplacements (vérifié).
Accepté comme compromis explicite : au pire, ça demande davantage de run pour se stuff plutôt
qu'une inversion de hiérarchie.

### Effet sur le ratio DPS légendaire/aucun (référence v3.86.0)

v3.86.0 avait mesuré et validé ce ratio à **×8,6** après correction du bug de bac à sable, en
laissant la question d'une éventuelle retouche "en pause, aucune action prévue".

Cette livraison le fait bouger comme **effet de bord assumé** du nerf `equipment.js` (pas un
objectif en soi) : mesuré ici à **~×2,2** (profil fin-Tour, talents max) — resserrement voulu
et confirmé avec Seb, cohérent avec l'objectif de réduire l'écart de puissance en haut de gamme
pour désaturer `defensePct` et ralentir le DPS de fin de jeu.

| | tapDamage | autoDps |
|---|---|---|
| Sans équipement | 129 | 3.7 |
| Commun | 164 | 9.2 |
| Légendaire | 268 | 18.7 |

---

## `progression-system.js` — portage du `WORLD_MULT` par monde

**C'est la partie nouvelle de cette livraison** par rapport au rapport précédent. Le
coefficient `worldIndex × 0.90` (ennemis normaux) et `worldIndex × 1.3` (boss), auparavant
codés en dur et partagés par tous les mondes dans `WorldManager.generateEnemy()`, sont
remplacés par un tableau indexé :

```js
var WORLD_MULT_BY_WORLD = [1.264, 1.637, 1.917, 2.757, 5.418, 7.892];
var BOSS_WORLD_MULT_RATIO = 1.3 / 0.90; // ratio boss/normal préservé identique à l'original
```

Index = `WorldManager.worldIndex` (0-based), dans l'ordre réel de `WORLDS` :

| worldIndex | Monde | WORLD_MULT |
|---|---|---|
| 0 | Forêt | 1.264 |
| 1 | Désert | 1.637 |
| 2 | Ruines | 1.917 |
| 3 | Crypte | 2.757 |
| 4 | Montagne | 5.418 |
| 5 | Tour | 7.892 |

Fallback conservé (`0.90` par défaut) si `worldIndex` sort de la plage du tableau — protège
contre un monde ajouté plus tard sans mise à jour de `WORLD_MULT_BY_WORLD`.

### Correction du mapping monde/coefficient (erreur repérée pendant le portage)

Le rapport de session précédente avait mesuré 5 valeurs ("monde1..monde5") **sans jamais
inclure le Désert**, qui est pourtant `WORLDS[1]` (2ᵉ monde réel, entre Forêt et Ruines). Les
5 valeurs mesurées correspondaient en réalité à Forêt/Ruines/Crypte/Montagne/Tour. Le Désert a
été mesuré spécifiquement pour cette livraison (dichotomie identique, profil interpolé entre
Forêt et Ruines) : **WORLD_MULT = 1.637**, deathRate 55% à `adventureIndex=0`, cohérent avec
la progression attendue entre ses deux voisins.

### Limite structurelle découverte en validant le portage (Forêt, worldIndex=0)

La formule `1 + worldIndex × WORLD_MULT` s'annule mathématiquement à `worldIndex=0` — le
terme vaut `1` quel que soit `WORLD_MULT`. **`WORLD_MULT` n'a donc aucun effet sur la
difficulté de la Forêt**, qui reste à sa difficulté d'origine (mesurée à 0% de deathRate avec
le profil "tout début de partie", talents "none", équipement `null`).

**Décision de Seb :** formule non modifiée pour corriger ce point — la Forêt reste le seul
monde non ajustable par ce levier. Documenté ici pour éviter toute confusion si un futur
calibrage semble ne pas "prendre" sur ce monde spécifiquement — ce n'est pas un bug, c'est un
comportement structurel préexistant à cette livraison.

## `combat-sandbox-system.js` — même portage côté bac à sable

`buildSandboxEnemyStats()` (utilisé par l'onglet "Simulation auto" du jeu ET par
`runSingleAutoRun` du harnais de test) avait sa **propre copie** de la formule de scaling,
avec les mêmes `0.90`/`1.3` en dur, indépendante de `progression-system.js`. Mise à jour en
miroir avec un tableau dédié :

```js
var SANDBOX_WORLD_MULT_BY_WORLD = [1.264, 1.637, 1.917, 2.757, 5.418, 7.892];
var SANDBOX_BOSS_WORLD_MULT_RATIO = 1.3 / 0.90;
```

Dupliqué volontairement (pas de référence croisée vers `progression-system.js`) : ce fichier
est documenté comme module pur sans dépendance à `game.*` ni aux autres systèmes — gardez les
deux tableaux synchronisés en cas de retouche future des `WORLD_MULT`.

Le mécanisme `overrideCoefs` (`WORLD_MULT`/`BOSS_WORLD_MULT` passés explicitement) reste
prioritaire sur le tableau par défaut — rétrocompatible avec les outils d'exploration du
harnais qui testent des valeurs personnalisées.

---

## Validation

Revalidé de bout en bout, avec les 4 fichiers modifiés chargés tels quels et **sans aucun
override de coefficient** (`runSingleAutoRun` → `buildSandboxEnemyStats` en configuration
100% par défaut, le chemin le plus proche du comportement réel en jeu) :

| worldIndex | Monde | Rareté arrivée | deathRate mesuré (adv=0, sans override) |
|---|---|---|---|
| 0 | Forêt | common | 0% *(cf. limite structurelle ci-dessus)* |
| 1 | Désert | common | 52% |
| 2 | Ruines | green | 58% |
| 3 | Crypte | rare | 52% |
| 4 | Montagne | epic | 60% |
| 5 | Tour | legendary | 50% |

Les mondes 1 à 5 convergent vers 50-60% de deathRate à l'entrée en configuration nativement
par défaut — sans avoir besoin d'un patch d'exploration pour l'obtenir. Avant cette livraison
(WORLD_MULT d'origine, 0.90/1.3 fixes), les mêmes mesures donnaient 100% (mondes 1-3) / 0%
(mondes 4-5).

`node --check` passé sur les 4 fichiers.

## Ce qui n'est toujours PAS livré ici

- **La "scie" intra-monde** (dur → facile en avançant dans le monde) : confirmé
  structurellement impossible avec `adventureIndex` seul (terme additif toujours positif dans
  la formule de scaling ennemi). Reste dépendant du chantier structure de quêtes
  (base/élite/donjon), toujours en pause.
- **Difficulté d'entrée de la Forêt** : non ajustable par `WORLD_MULT` (limite structurelle
  ci-dessus), formule non modifiée sur décision de Seb.
- `CACHE_VERSION` dans `sw.js` : à bumper manuellement, fichier non disponible dans cette
  session.

## Prochaine étape suggérée

Reprendre le chantier structure de quêtes (base/élite avec afflictions/donjon de fin de
monde) pour obtenir la scie intra-monde — seul point encore ouvert du diagnostic initial.
