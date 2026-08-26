# Changelog — Équilibrage combat (chantier "scie") — v3.87.0

Suite directe de v3.86.0 (correctif régression bac à sable). Porte en dur les facteurs de
nerf validés par simulation lors de la session d'audit "progression en scie", qui débloquent
la tension aux mondes 4-5 (auparavant bloqués à 0% de deathRate quel que soit `WORLD_MULT`,
plafond de défense saturé dès le monde 4).

⚠️ **`CACHE_VERSION` dans `sw.js` à bumper de 3.86.0 vers 3.87.0** — je n'ai pas ce fichier
dans cette session (absent du zip de handoff), merci de le faire toi-même avant mise en ligne.

## Fichiers modifiés

- `systems/stats-system.js`
- `data/equipment.js`

## `stats-system.js`

Ajout d'un facteur `SURVIVAL_DEFENSE_FACTOR = 0.35` appliqué à la somme des bonus de défense
des 3 talents de survie (`t_second_wind` / `t_vital_anchor` / `t_immutable_guardian`), avant
le calcul de `game.heroDefensePct`. Réduit l'apport de ces talents de 60% par rapport à
l'original, sans toucher à leur bonus de PV max (`survivalHpMult`, non modifié) ni au plafond
`HERO_DEFENSE_CAP` (toujours 0.6, inchangé).

Effet mesuré (profil "fin de monde", Chevalier) :
- Monde 4 (epic) : `defensePct` 60% → 37%
- Monde 5 (legendary) : `defensePct` 60% → 37% (les deux mondes étaient auparavant strictement
  identiques sur cet axe, aucune marge de progression restante)

## Effet sur le ratio DPS légendaire/aucun (référence v3.86.0)

v3.86.0 avait mesuré et validé ce ratio à **×8,6** après correction du bug de bac à sable, en
laissant la question d'une éventuelle retouche "en pause, aucune action prévue".

Cette livraison le fait bouger comme **effet de bord assumé** du nerf equipment.js (pas un
objectif en soi) : mesuré ici à **~×2,2** (profil fin-monde5, talents max) — resserrement
voulu et confirmé avec Seb, cohérent avec l'objectif de réduire l'écart de puissance en haut
de gamme pour désaturer `defensePct` et ralentir le DPS de fin de jeu.

| | tapDamage | autoDps |
|---|---|---|
| Sans équipement | 129 | 3.7 |
| Commun | 164 | 9.2 |
| Légendaire | 268 | 18.7 |

## `equipment.js`

Réduction des `ranges` (bornes min/max de génération procédurale) pour les emplacements
`weapon` (stat `tapDmg`), `armor` (stat `defense`) et `boots` (stat `autoDps`), sur les
paliers `rare`/`epic`/`legendary` uniquement — `common` et `green` conservent leurs valeurs
d'origine (facteur ×1.0/×0.9 négligeable, non modifié en pratique pour `common`).

| Emplacement | Rareté | Avant | Après |
|---|---|---|---|
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
Accepté comme compromis : au pire, ça demande davantage de run pour se stuff plutôt qu'une
inversion de hiérarchie problématique.

## Validation

Revalidé par simulation réelle (harnais `node vm`, 3 héros × 20 runs, dichotomie de
`WORLD_MULT` par monde ciblant ~55% de deathRate à `adventureIndex=0`), avec ces deux fichiers
modifiés chargés tels quels (aucun patch de nerf superposé) :

| Monde | Rareté | WORLD_MULT (à définir dans data/worlds.js) | adv=0 | adv=8 |
|---|---|---|---|---|
| 1 | common | 1.264 | 52% | 100% |
| 2 | green | 1.917 | 57% | 100% |
| 3 | rare | 2.757 | 48% | 67% |
| 4 | epic | 5.418 | 60% | 67% |
| 5 | legendary | 7.892 | 45% | 53% |

Les 5 mondes convergent maintenant vers 45-60% de deathRate à l'entrée — homogène, contre 100%
(mondes 1-3) / 0% (mondes 4-5) mesurés avant modification avec les `WORLD_MULT` d'origine.

## Ce qui n'est PAS livré ici

- **`WORLD_MULT` par monde** (colonne ci-dessus) : ce sont des valeurs de calibrage trouvées
  par dichotomie dans le harnais, pas encore portées dans `data/worlds.js` ou le code de scaling
  ennemi réel. Nécessite une discussion séparée sur où stocker ce coefficient par monde (le
  code actuel n'a qu'un seul `WORLD_MULT` global, pas un tableau par `worldIndex`).
- **La "scie" intra-monde** (dur → facile en avançant dans le monde) : confirmé structurellement
  impossible avec `adventureIndex` seul (terme additif toujours positif dans la formule de
  scaling ennemi). Reste dépendant du chantier structure de quêtes (base/élite/donjon), toujours
  en pause.
- `CACHE_VERSION` dans `sw.js` : à bumper manuellement, fichier non disponible dans cette session.

## Prochaine étape suggérée

Décider comment porter les `WORLD_MULT` par monde trouvés ci-dessus dans le code réel
(`data/enemies.js` ou `data/worlds.js` selon où vit `buildSandboxEnemyStats`/l'équivalent
production) — actuellement ce ne sont que des résultats de recherche, pas un format de
configuration prêt à intégrer.
