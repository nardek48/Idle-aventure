# Aethervale v3.46.0

## Contexte

Implémentation d'un changement d'équilibrage validé hors-jeu (spreadsheet Seb) : nouvelle courbe de PV/dégâts ennemis, correction de la rareté d'équipement au monde 0, et extension du bac à sable de combat pour pouvoir retester ce type de changement sans relancer une vraie partie.

La validation par batch-sim (étape prévue dans le prompt de livraison) a révélé un déséquilibre entre classes non détecté par la précédente référence (v3.33.17, testée sans équipement) — deux correctifs d'équilibrage ont été ajoutés dans cette même livraison suite à cette découverte, avec accord explicite avant implémentation.

## 1. Nouvelle courbe de PV/dégâts ennemis (`systems/progression-system.js`)

- PV des ennemis normaux et des boss : l'exposant `ENEMY_PV_WORLD_EXP` (1.45) s'applique désormais au terme lié au monde uniquement (`(1 + worldIndex*0.90)` pour les ennemis normaux, `(1 + worldIndex*1.3)` pour les boss) — `adventureIndex`/`cycleCount`/`enemyIndex` restent additifs, inchangés.
- Multiplicateur de PV : `ENEMY_PV_MULT` (4.0, remplace l'ancien coefficient fixe 1.2) pour les ennemis normaux, `BOSS_PV_MULT` (6.7, remplace 2.0) pour les boss — dérivé du même ratio que l'existant.
- **Nouveau** : la Puissance de riposte ennemie (dégâts) suit désormais la même échelle via `ENEMY_POWER_SCALE_EXP` (0.9) — avant, seuls les PV grandissaient avec la progression, ce qui rendait un ennemi "plus gros" sans le rendre plus dangereux une fois le DPS du joueur suffisant pour tuer en moins d'un intervalle de riposte.
- Toutes les constantes sont nommées en tête de fichier, faciles à retoucher.

*Non touché (hors périmètre initial, corrigé ci-dessous) : `ui/bestiary-view.js` avait sa propre copie dupliquée, déjà divergente avant cette livraison, de l'ancienne formule de PV — voir section 6.*

## 2. Rareté d'équipement au monde 0 (`data/equipment.js`)

- `WORLD_RARITY_UNLOCKS[0]` : `["common", "green"]` → `["common"]` — aligne "1 monde = 1 palier de rareté visé" avec la nouvelle courbe de difficulté (avant, Forêt et Désert partageaient le même palier disponible).

## 3. Extension du bac à sable — monde/cycle simulés (`systems/combat-sandbox-system.js`, `ui/combat-sandbox-view.js`)

- `SANDBOX_ENEMY_COEFS` étendu : `PV_WORLD_EXP`, `POWER_SCALE_EXP`, `WORLD_INDEX`, `ADVENTURE_INDEX`, `CYCLE_COUNT` (tous à 0/valeurs neutres par défaut, rétrocompatibles).
- `buildSandboxEnemyStats()` recalcule désormais un vrai `scale`/`bossScale` avec les formules réelles de `progression-system.js`, au lieu d'une échelle neutre fixe (`scale = 1`) — un ennemi de test peut représenter n'importe quel point de la progression.
- Panneau "Coefficients d'ennemi" mis à jour avec les nouveaux champs réglables.

## 4. Simulation d'équipement dans le bac à sable

- Nouvelle fonction `applySandboxEquipmentBonus(heroStats, rarity)` : applique un set complet (7 emplacements) de la rareté choisie, valeur = moyenne du range de chaque emplacement (déterministe, pas de tirage aléatoire), + bonus de panoplie 3 et 7 pièces cumulés (comme en jeu réel).
- Sélecteur de rareté ajouté dans l'UI ("Aucun" → Légendaire), propagé à tous les modes (Combat unique, Run, Simulation infinie, rafale Simulation auto / batch-sim).
- `autoDps`/`goldMult` calculés pour référence mais sans effet sur le combat simulé (le bac à sable ne modélise ni l'un ni l'autre).

## 5. Correctifs d'équilibrage découverts par la validation batch-sim

**Constat initial** : la nouvelle courbe de PV (points 1-2), une fois testée avec un héros réellement équipé (via le point 4, absent de la référence v3.33.17), a révélé que le Chevalier survivait 2 à 9× plus longtemps que le Rôdeur/le Mage selon le monde simulé — un écart largement au-delà du seuil de tolérance (< 10-12 kills, référence < 8 kills). Deux causes distinctes identifiées et corrigées avec accord explicite avant implémentation :

### 5a. Plafond de génération de Rage (`data/class-skills.js`, `systems/combat-resource-system.js`)

- `resource.generation.maxGainPerHit` (20) ajouté à la Rage du Chevalier — le seul mécanisme de ressource proportionnel aux dégâts infligés (`damageDealtPercent`) parmi les 3 classes. Sans plafond, un `tapDamage` élevé (bonus d'équipement) créait une boucle de rétroaction : dégâts élevés → Rage pleine en 1-2 coups → skills quasi ininterrompus → encore plus de dégâts. Rôdeur (Concentration) et Mage (Mana) ont des gains fixes, indépendants de la puissance du héros — jamais concernés par cet effet.
- 20 choisi légèrement au-dessus du plus gros gain naturel *sans* équipement (~12 Rage sur Exécution à stats de base) : aucun changement de comportement pour un Chevalier peu équipé.
- `applyResourceGain()` reste rétrocompatible (`maxGainPerHit` absent = comportement inchangé).

### 5b. Conversion Endurance→PV non linéaire (`systems/stats-system.js`, `systems/combat-sandbox-system.js`)

- `game.heroMaxHp` : passage d'un calcul linéaire (`endurance × 6`) à `Math.pow(endurance, ENDURANCE_HP_EXP) × ENDURANCE_HP_COEF` avec `ENDURANCE_HP_EXP = 0.75` et `ENDURANCE_HP_COEF` recalé (17.716) pour que le Chevalier (Endurance 76, la plus haute des 6 héros) conserve exactement ses PV d'avant cette version (456) — tout l'équilibrage riposte/PV déjà calibré sur cette référence reste valide.
- Ratio de PV Chevalier/Mage resserré de ×2.24 à ×1.83, sans toucher aux stats de base (`data/heroes.js` inchangé) ni au kit d'aucune classe.
- **Défense passive (`heroDefensePct`) volontairement non touchée** — reste sur `totalEndurance` linéaire, décision explicite : toucher aussi la défense en plus des PV aurait cumulé deux correctifs sur le même levier, risque de trop aplatir l'identité "tanky" du Chevalier.
- Dupliqué en lecture seule dans le bac à sable (`SANDBOX_HERO_BASE_COEFS.ENDURANCE_HP_EXP`/`ENDURANCE_HP_COEF`), même valeurs.

### 5c. Réduction de l'exposant de Puissance de riposte (`systems/progression-system.js`, `systems/combat-sandbox-system.js`)

**Constat, découvert lors d'une simulation demandée explicitement pour vérifier la jouabilité globale (pas seulement l'écart entre classes)** : `ENEMY_POWER_SCALE_EXP` à sa valeur initiale (0.9, quasi linéaire) rendait le jeu quasi injouable en milieu/fin de progression pour un joueur "réaliste" (gear en retard d'un palier — le cas d'un joueur qui vient d'entrer dans un monde sans avoir encore looté son équipement, pas le meilleur cas). Diagnostic chiffré : au monde 5, un Mage encaisse ~154 dégâts par coup de riposte (le tuant en 1.6 coup) mais a besoin de ~39 coups pour tuer un seul ennemi — un ratio survie/temps-de-kill de 0.27, très en dessous du seuil jouable. Dès le monde 3, ce ratio tombait sous 1.0 pour les 3 classes (le joueur meurt plus vite qu'il ne tue), avec un pire cas observé en batch-sim à **1 seul kill avant KO** au monde 5.

- `ENEMY_POWER_SCALE_EXP` : 0.9 → **0.3**, après test de sensibilité (0.9/0.7/0.5/0.3/0.15) validé par batch-sim réel (pas seulement calcul instantané) sur le scénario "gear en retard d'un palier", les 6 mondes, les 3 classes.
- Résultat : le pire cas observé (minimum sur 20 runs) ne descend plus sous **6 kills** avant KO, sur toute la progression (contre 1 kill au monde 5 avant ce correctif).
- Aucun effet notable en tout début de partie (monde 0 : `scale ≈ 1` quel que soit l'exposant, `Math.pow(1, x) = 1`).
- L'écart entre classes (section 5a/5b) reste dans la même fourchette après ce changement (~×2.5 à ×4.5 selon le monde, comparable au ×2.3-3 déjà accepté) — ce correctif touche le rythme global, pas l'équilibrage relatif entre classes.
- Dupliqué en lecture seule dans le bac à sable (`SANDBOX_ENEMY_COEFS.POWER_SCALE_EXP`), même valeur.

### Résultat de la revalidation post-correctifs (batch-sim, 20-30 runs/config)

| Configuration | Avant les 3 correctifs | Après les 3 correctifs |
|---|---|---|
| Sans équipement (référence) | Chevalier 15.2 / Rôdeur 9.2 / Mage 9.8 (écart 5.9) | Chevalier 15.0 / Rôdeur 11.0 / Mage 11.9 (écart 4.1) |
| Monde 0, gear common | Chevalier 174 / Rôdeur 76 / Mage 42 (ratio ×4.1) | Chevalier 149 / Rôdeur 90 / Mage 49 (ratio ×3.1) |
| Monde 5, gear legendary | Chevalier 88 / Rôdeur 16 / Mage 10 (ratio ×8.5) | Chevalier 124 / Rôdeur 58 / Mage 27 (ratio ×4.5) |
| **Monde 5, gear epic (en retard, cas réaliste)** | **Mage : 1 kill minimum avant KO** | **Mage : 6 kills minimum avant KO** |

**Le ratio résiduel entre classes (~×3 à ×4.5 avec équipement) n'a pas été entièrement résorbé** — diagnostiqué comme venant de la défense passive (non touchée, voir 5b). Accepté explicitement comme compromis pour cette livraison. En revanche, la jouabilité globale (objectif "pouvoir tuer quelques monstres avant KO") est maintenant assurée sur toute la progression, y compris dans le scénario le plus défavorable testé (gear en retard d'un palier).

*Recommandation pour une session future si l'écart résiduel entre classes doit être resserré davantage : retravailler `HERO_DEFENSE_COEF` ou les valeurs de base des actions defense de classe (Esquive/Barrière, actuellement plus faibles que Garde) plutôt que l'Endurance elle-même.*

## 6. Resynchronisation du Bestiaire (`ui/bestiary-view.js`, `js/systems/progression-system.js`)

- `ENEMY_PV_MULT`/`ENEMY_PV_WORLD_EXP`/`BOSS_PV_MULT`/`ENEMY_POWER_SCALE_EXP` désormais exportées sur `window.*` depuis `progression-system.js` (elles ne l'étaient pas, simple oubli de la convention du projet).
- `ui/bestiary-view.js` (estimation "PV à la première rencontre" affichée par créature) réutilise maintenant ces vraies constantes au lieu d'une copie locale dupliquée — cette copie était **déjà divergente avant la présente livraison** : ses poids monde/aventure (0.60/0.22 pour les ennemis normaux, 0.90/0.30 pour les boss) ne correspondaient plus aux vrais poids de `generateEnemy()` (0.90/0.30 et 1.3/0.4) depuis le rééquilibrage v2.11, plusieurs versions avant celle-ci.
- Vérifié par harnais : les PV estimés par le Bestiaire correspondent désormais exactement à ceux produits par `WorldManager.generateEnemy()` pour la même créature, au même monde/aventure (cycleCount=0, enemyIndex=0/dernier — "à la première rencontre"), sur les 6 mondes, ennemis normaux et boss.

## Fichiers modifiés

- `js/systems/progression-system.js`
- `js/data/equipment.js`
- `js/systems/combat-sandbox-system.js`
- `js/ui/combat-sandbox-view.js`
- `js/systems/combat-batch-sim-system.js`
- `js/data/class-skills.js`
- `js/systems/combat-resource-system.js`
- `js/systems/stats-system.js`
- `js/ui/bestiary-view.js`
- `sw.js` (CACHE_VERSION 3.45.0 → 3.46.0)

## Tests effectués

- `node --check` sur tous les fichiers JS touchés.
- Harnais Node `vm` (chargement des vrais fichiers sources, sans DOM) : génération d'ennemis/boss sur les 6 mondes, non-mutation de `ENEMY_DB`/`BOSS_DB`, `WORLD_RARITY_UNLOCKS`, `buildSandboxEnemyStats` à échelle neutre vs simulée, `applySandboxEquipmentBonus` (plafond de défense respecté), `createSandboxCombatState` bout-en-bout avec équipement.
- Batch-sim (`runSingleAutoRun`) : comparaison avant/après sur les 3 classes, aux mondes 0 et 5, avec et sans équipement simulé — résultats ci-dessus.

*Non testé : rendu visuel en conditions réelles (navigateur), le panneau bac à sable étendu n'a été vérifié que par lecture de code + harnais headless.*
