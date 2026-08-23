# Aethervale v3.70.0 — Configuration Grimoire pour Enragé/Corrupteur

## Résumé

Correction d'un trou de design signalé par Seb : les effets d'Enragé
(v3.68.0) et Corrupteur (v3.69.0) se déclenchaient **automatiquement** dès
que skill3/skill1 était utilisé sur l'ennemi concerné, peu importe COMMENT
l'action avait été jouée — aucune configuration possible, contrairement à
tout le reste du Grimoire (Charge/Bouclier/Soin). Cette livraison rend ces
2 effets configurables et priorisables comme les autres conditions.

## Ce qui change en jeu

Deux nouvelles cartes de condition dans le Grimoire :
- **"😡 L'ennemi est enragé"** (`enemyEnraged`)
- **"☠️ L'ennemi est corrompu"** (`enemyCorrupted`)

Assignées à skill3 (Enragé) ou skill1 (Corrupteur), elles activent
désormais l'effet spécial (réduction/gel de rage, purge de corruption) —
mais **seulement** si l'action a été déclenchée par une règle du Grimoire
dont la condition correspond, ou par un tap manuel au bon moment. Sans
règle configurée, skill3/skill1 restent de simples attaques normales face
à un boss Enragé/Corrompu, exactement comme avant l'existence de ces
archétypes.

Différence avec les 4 cartes existantes basées sur un télégraphe : Enragé/
Corrupteur sont des **états permanents** de l'ennemi (pas des événements
ponctuels à anticiper) — ces 2 nouvelles cartes sont donc **vraies en
permanence** tant que l'ennemi porte l'archétype correspondant, sans
notion de fenêtre d'approche. Option A retenue par Seb pour cette
livraison (pas de seuil de stacks avant de proposer le contre, ex. "3+
stacks") — Option B (avec seuil) gardée en note pour une itération future
si utile.

## Détail technique

- `data/grimoire-conditions.js` : 2 nouvelles cartes ajoutées à
  `GRIMOIRE_CONDITIONS`/`GRIMOIRE_CONDITION_ORDER`.
- `systems/combat-auto-policy-system.js` :
  - `evaluateGrimoireCondition()` : nouveaux cas `enemyEnraged`/
    `enemyCorrupted`, comparent directement `ctx.enemyArchetype`.
  - `isConditionPossibleForEnemy()` : ces conditions ne sont possibles que
    si `enemy.archetype` correspond EXACTEMENT — contrairement aux
    patterns Charge/Bouclier/Soin (possibles/impossibles selon `isBoss`,
    stable pour toute la durée du combat), l'archétype est tiré une seule
    fois à la génération de l'ennemi : la réserve de ressource (Phase 4.2)
    n'a donc jamais lieu d'être face à un ennemi qui ne pourra JAMAIS
    devenir Enragé/Corrompu en cours de combat.
- `systems/class-combat-system.js` :
  - Nouvelle table `ARCHETYPE_EFFECT_TO_CONDITION_ID` et fonction pure
    `getArchetypeEffectConditionId(action)` — correspondance
    `enemyRageSuppression` → `enemyEnraged`, `enemyCorruptionPurge` →
    `enemyCorrupted`, dérivée de `action.effects` (pas un nouveau champ de
    données, réutilise ce qui existait déjà depuis v3.68.0/v3.69.0).
  - `getGrimoireCombatContext()` expose désormais `enemyArchetype` (la
    valeur de `game.enemy.archetype` telle quelle).
  - `useSkillManual()` : calcule désormais `matchedConditionId` aussi via
    `getArchetypeEffectConditionId()` (en plus de la boucle `action.
    counters` existante) — permet le "tap manuel au bon moment", même
    principe que les contres classiques.
  - `applyDamageAction()`/`applyActionEffects()` : `matchedConditionId`
    transmis jusqu'au bout de la chaîne — `enemyRageSuppression`/
    `enemyCorruptionPurge` ne s'appliquent désormais QUE si
    `matchedConditionId` correspond à la condition d'archétype de cet
    effet (`enemyVulnerability`/`damageOverTime` restent inconditionnels,
    comme avant).
- `ui/grimoire-view.js` : nouvel indicateur informatif (icône 🌀, distincte
  du ⚡ des contres classiques) — "Cette action a aussi un effet spécial
  contre : [condition]" quand l'action assignée a un potentiel d'effet
  d'archétype, et encadré dédié (teinte violette, pas dorée) quand la
  combinaison est active. Texte volontairement différent des contres
  classiques ("effet spécial, en plus de ses dégâts normaux" plutôt que
  "annulera l'attaque") pour rester honnête sur la nature de l'effet.
- `css/04-panel-grimoire.css` : style `.grimoire-archetype-active`.

## Ce qui NE change PAS

- Les dégâts normaux de skill3/skill1 restent inchangés dans tous les cas
  — seul l'effet SUPPLÉMENTAIRE (suppression de rage / purge de
  corruption) devient conditionnel.
- Les contres classiques existants sur skill1 (Soin pour le Chevalier,
  Bouclier pour Rôdeur/Mage, via `action.counters`) continuent de
  fonctionner indépendamment, sans changement.
- Aucun changement sur Charge/Bouclier/Soin/Attaque normale (les 4 cartes
  existantes).

## Tests effectués

- `node --check` sur tous les fichiers JS touchés.
- Harnais Node `vm` (fichiers réels du projet) couvrant :
  - `getArchetypeEffectConditionId()` : mapping correct skill3→
    enemyEnraged, skill1→enemyCorrupted, defense→null.
  - **Confirmation du bug corrigé** : sans règle Grimoire configurée, le
    repli automatique utilisant skill3 sur un boss Enragé NE déclenche
    PLUS l'effet de suppression de rage.
  - Avec une règle "Si Enragé → skill3" configurée : l'effet se déclenche
    bien via le repli/Grimoire.
  - Tap manuel (`useSkillManual`) sur un ennemi Enragé sans règle
    configurée : déclenche bien l'effet (comme un contre manuel classique).
  - Même vérification côté Corrupteur (skill1, tap manuel) : purge bien
    tous les stacks.
  - `isConditionPossibleForEnemy()` : Enragé possible sur un ennemi
    Enragé, impossible sur un ennemi Corrompu ou un boss normal (et
    inversement pour Corrupteur).

## État de la Phase 9

Toujours 2 archétypes sur 5 livrés (Enragé, Corrupteur) — cette livraison
corrige leur intégration au Grimoire plutôt que d'ajouter un nouvel
archétype. Restent : Silencieux, Vampirique, Blindé.
