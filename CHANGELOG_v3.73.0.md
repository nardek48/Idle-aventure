# Aethervale v3.73.0 — Archétype "Blindé" (Phase 9, 5e et dernier archétype) + correctif d'affichage

## Résumé

Cinquième et dernier archétype de la Phase 9 ("Extension des archétypes")
de la feuille de route combat : **Blindé**. La Phase 9 est désormais
complète (Enragé, Corrupteur, Silencieux, Vampirique, Blindé). Cette
livraison inclut aussi une correction d'affichage demandée par Seb :
le sprite ennemi ne se grise plus pendant le cooldown de l'attaque de
base.

## Correctif d'affichage (demande de Seb)

Le filtre de grisage (`grayscale`/`brightness`) appliqué au sprite ennemi
pendant le cooldown de l'attaque de base a été retiré — il ne reste que
sur le bouton ATTAQUE lui-même. `ui/combat-view.js`,
`renderBasicAttackCooldown()` ne pose plus la classe `.on-cooldown` sur
`#enemy-emoji` (seulement sur `#combat-attack-btn`). La règle CSS
`#enemy-emoji.on-cooldown` reste définie dans `css/03-combat.css` mais
n'est plus jamais appliquée par le code.

## Design de Blindé (validé avec Seb avant implémentation)

- **Type** : boss uniquement, rejoint le pool des archétypes de boss
  (Enragé/Corrupteur/Vampirique) à partir de Crypte. Le tirage à 3
  tranches (v3.72.0) devient un tirage à **4 tranches égales**
  (25/25/25/25).
- **Effet** : réduction **passive et permanente** de **10%** de tous les
  dégâts que le boss subit — valeur chiffrée par simulation hors-jeu pour
  rester comparable en impact à Enragé/Vampirique aux paliers déjà
  validés (une valeur plus haute testée aurait été plus punitive que les
  3 autres archétypes au même palier).
- **Signal visuel** : badge permanent 🛡️‍🩹 (comme les 3 autres archétypes
  de boss).
- **Contre** : `defense` de chaque classe (Garde/Esquive/Barrière) — seul
  slot encore libre sur un boss (skill1/2/3 déjà occupés par
  Corrupteur/Vampirique/Enragé). Histoire retenue avec Seb : ce n'est pas
  "je me protège", c'est une contre-attaque/riposte qui fissure
  temporairement le blindage du boss. Réduit **partiellement** le
  blindage (de 10% à 5%, pas une annulation totale) pendant 4 secondes —
  cohérent avec la réduction partielle (pas totale) d'Enragé.

## Détail technique

- `data/enemy-archetypes.js` :
  - `decideEnemyArchetype()` étendu à 4 tranches (`> 75` → armored,
    `51-75` → vampiric, `26-50` → corrupted, `≤ 25` → enraged).
  - Nouvelles constantes : `ARMORED_MIN_WORLD_INDEX` (3),
    `ARMORED_DAMAGE_REDUCTION_PCT` (0.10), `ARMORED_SUPPRESSION_
    REDUCTION_PCT` (0.05), `ARMORED_SUPPRESSION_DURATION_MS` (4000).
  - Nouvelle fonction pure `getArmoredEffectiveDamageReduction(enemy)` —
    retourne le taux de réduction effectif (normal ou temporairement
    réduit par le contre).
- `data/grimoire-conditions.js` : nouvelle carte "🛡️‍🩹 L'ennemi est
  blindé" (`enemyArmored`).
- `data/class-skills.js` : les 3 actions `defense` (`knight_guard`,
  `archer_evasion`, `mage_arcane_barrier`) déclarent désormais
  `effects: [..., { type: "enemyArmorSuppression" }]` — en plus de leur
  effet défensif existant et de leur `counters` existant
  (`chargeIncoming`/`enemySilenceIncoming`).
- `systems/combat-engine.js` : `dealDamage()` applique la réduction de
  Blindé juste après le Bouclier de boss (résistance permanente,
  complémentaire au Bouclier temporaire).
- `systems/class-combat-system.js` :
  - **Correctif de bug** : `useSkill()` n'appelait jamais
    `applyActionEffects()` pour une action de type `"defense"` (seul
    `activateDefenseEffect()`, qui ne lit que `action.effects[0]`, était
    invoqué) — les effets d'archétype ajoutés en 2e position du tableau
    n'étaient donc jamais appliqués. Corrigé en ajoutant l'appel
    manquant, avec la même garde `matchedConditionId` que les 3 autres
    archétypes. Vérifié sans impact sur les contres classiques
    (Charge/Silencieux) via `counters`, indépendants de ce mécanisme.
  - `ARCHETYPE_EFFECT_TO_CONDITION_ID` étendue :
    `enemyArmorSuppression` → `enemyArmored`.
  - `applyActionEffects()` : nouveau cas, filtré par `matchedConditionId
    === "enemyArmored"`.
  - Nouvelle méthode `applyArmorSuppression()`.
- `systems/combat-auto-policy-system.js` : `evaluateGrimoireCondition()`
  et `isConditionPossibleForEnemy()` étendus pour `enemyArmored`.
- `ui/combat-view.js` : badge permanent dans `buildEnemyStatusBarHTML()`,
  avec variante `.is-suppressed`.
- `css/03-combat.css` : styles `.enemy-status-armored` /
  `.enemy-status-armored.is-suppressed`.

## Ce qui NE change PAS

- Aucune modification du comportement de `defense` pour un ennemi non
  Blindé — ses effets défensifs normaux et ses contres existants sur
  Charge/Silencieux restent inchangés.
- Enragé, Corrupteur, Silencieux, Vampirique : aucun changement fonctionnel.

## Tests effectués

- `node --check` sur tous les fichiers JS touchés.
- Harnais Node `vm` (fichiers réels du projet) couvrant :
  - `decideEnemyArchetype()` : les 4 tranches correctement réparties,
    `armored` toujours `null` avant Crypte.
  - `getArmoredEffectiveDamageReduction()` : 10% normal, 5% pendant la
    suppression, 0% pour un ennemi non-Blindé.
  - Pipeline réel `dealDamage()` : 100 dégâts de base → 90 dégâts réels
    (réduction 10%), puis 95 dégâts pendant la fenêtre de suppression
    (réduction passée à 5%).
  - **Bug détecté puis corrigé** : la suppression via règle Grimoire
    n'avait initialement aucun effet (`applyActionEffects` jamais
    appelé pour `defense`) — reproduit, corrigé, et re-testé avec
    succès (suppression active, réduction effective bien à 5%).
  - Confirmation que le repli automatique sans règle configurée ne
    déclenche jamais la suppression, tandis qu'un tap manuel peut
    toujours l'improviser.
  - Test de non-régression dédié : le contre classique de Charge via
    `defense` sur un ennemi normal continue de fonctionner exactement
    comme avant (télégraphe annulé, effet défensif actif, aucun champ
    Blindé parasite).

## État de la Phase 9

**Complète** : les 5 archétypes prévus par la feuille de route sont
livrés — Enragé (v3.68.0), Corrupteur (v3.69.0), Silencieux (v3.71.0),
Vampirique (v3.72.0), Blindé (v3.73.0), avec leur intégration au
Grimoire (v3.70.0 pour Enragé/Corrupteur, généralisée aux suivants).

## Prochaine étape suggérée

Revenir à la vraie Phase 7 (tutoriel progressif par monde, mise en
pause à l'origine faute de nouveaux patterns à enseigner) — désormais
pertinente puisque 5 nouveaux archétypes existent réellement à
présenter progressivement aux joueurs.
