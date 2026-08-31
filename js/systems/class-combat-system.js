"use strict";
/* systems/class-combat-system.js — ADAPTATEUR classes (data/class-skills.js) <-> game.* et combat-engine.js.
   v3.102.0 (P2) : tout en ROUNDS. useSkill() = une action de round ; chooseRoundAction() = décision Grimoire/repli
   (exécutée par CombatEngine.tickRoundClock en mode Grimoire, suggérée en Tactique) ; onRoundEnd() = cooldowns + mana passif + défense. */
var CLASS_ACTION_ICON_FALLBACK = {
  knight_heavy_strike: "./images/Icons/special_attacks/smashing_blow.png",
  knight_guard_break: "./images/Icons/special_attacks/attack6.png",
  knight_execute: "./images/Icons/special_attacks/attack10.png",
  knight_guard: "./images/Icons/special_attacks/defensive_stance.png",
  archer_precise_shot: "./images/Icons/special_attacks/attack3.png",
  archer_volley: "./images/Icons/special_attacks/multishot.png",
  archer_piercing_shot: "./images/Icons/special_attacks/attack4.png",
  archer_evasion: "./images/Icons/special_attacks/attack11.png",
  mage_arcane_blast: "./images/Icons/special_attacks/arcane_blast.png",
  mage_arcane_burn: "./images/Icons/special_attacks/attack12.png",
  mage_arcane_nova: "./images/Icons/special_attacks/cataclysm.png",
  mage_arcane_barrier: "./images/Icons/special_attacks/chaos_fury.png"
};

var ARCHETYPE_EFFECT_TO_CONDITION_ID = {
  enemyRageSuppression: "enemyEnraged",
  enemyCorruptionPurge: "enemyCorrupted",
  enemyLifestealSuppression: "enemyVampiric",
  enemyArmorSuppression: "enemyArmored"
};

function getArchetypeEffectConditionId(action) {
  if (!action || !Array.isArray(action.effects)) return null;
  for (var i = 0; i < action.effects.length; i++) {
    var effect = action.effects[i];
    if (effect && ARCHETYPE_EFFECT_TO_CONDITION_ID[effect.type]) {
      return ARCHETYPE_EFFECT_TO_CONDITION_ID[effect.type];
    }
  }
  return null;
}

window.getArchetypeEffectConditionId = getArchetypeEffectConditionId;

var ClassCombatManager = {
    ensure: function () {
    if (!game.classResource || typeof game.classResource !== "object") {
      game.classResource = null; // recréé au premier besoin, voir ensureForCurrentClass()
    }
    if (!game.classCooldowns || typeof game.classCooldowns !== "object") {
      game.classCooldowns = (typeof createCooldownState === "function") ? createCooldownState() : {};
    }
    if (typeof game.classActiveDefense === "undefined") {
      game.classActiveDefense = null; // { actionId, effectType, value, roundsLeft } ou null
    }
  },

    getCurrentClassId: function () {
    if (typeof getClassForHero !== "function" || typeof HEROES_DB === "undefined" || !game.heroId) return null;
    var hero = HEROES_DB[game.heroId];
    var cls = getClassForHero(hero);
    return cls ? cls.id : null;
  },

    ensureForCurrentClass: function () {
    this.ensure();
    var classId = this.getCurrentClassId();
    if (!classId) return null;

    if (!game.classResource || game.classResource.classId !== classId) {
      game.classResource = (typeof createCombatResourceState === "function") ? createCombatResourceState(classId) : null;
    }
    return game.classResource;
  },

    resetForNewHero: function () {
    this.ensure();
    game.classResource = null;
    game.classCooldowns = (typeof createCooldownState === "function") ? createCooldownState() : {};
    game.classActiveDefense = null;
    this.ensureForCurrentClass();
  },

    isCombatActive: function () {
    if (game.activeTab !== "combat") return false;
    if (typeof isBlockingModalOpen === "function" && isBlockingModalOpen()) return false;
    if ((game.heroHp || 0) <= 0) return false;
    return true;
  },

    getAction: function (slot) {
    var classId = this.getCurrentClassId();
    if (!classId || typeof getClassAction !== "function") return null;
    return getClassAction(classId, slot);
  },

    getCombatContext: function () {
    return {
      enemyHp: game.enemy ? game.enemy.hp : null,
      enemyMaxHp: game.enemy ? game.enemy.maxHp : null,
      isSilenced: Number(game.silencedRounds || 0) > 0
    };
  },

    getGrimoireCombatContext: function () {
    var base = this.getCombatContext();
    var e = game.enemy;

    base.chargeIncoming = !!(e && e.chargeTelegraphed);
    base.shieldIncoming = !!(e && e.shieldTelegraphed);
    base.healIncoming = !!(e && e.healTelegraphed);
    base.enemySilenceIncoming = !!(e && e.silenceTelegraphed);

    var heroMaxHp = Number(game.heroMaxHp || 0);
    base.heroHpPercent = heroMaxHp > 0 ? Number(game.heroHp || 0) / heroMaxHp : null;

    // v3.102.0 : « enemyAttackIncoming » = double frappe ennemie au prochain tour (jauge de célérité pleine)
    base.enemyDoubleStrikeNext = !!(e && window.CombatEngine && typeof CombatEngine.enemyDoubleStrikeNext === "function"
      && CombatEngine.enemyDoubleStrikeNext());

    base.enemyArchetype = e ? (e.archetype || null) : null;

    return base;
  },

  /* Rounds avant le prochain télégraphe d'un pattern (null si déjà télégraphié ou sans objet). */
  getRoundsUntilPatternTrigger: function (conditionId) {
    var e = game.enemy;
    if (!e) return null;
    if (window.CombatEngine && typeof CombatEngine.prepareEnemy === "function") CombatEngine.prepareEnemy(e);

    if (conditionId === "enemyAttackIncoming") {
      var gain = (window.CombatEngine && typeof CombatEngine.getEnemyGaugeGain === "function") ? CombatEngine.getEnemyGaugeGain(e) : 0;
      if (gain <= 0) return null;
      var max = (typeof CELERITY_GAUGE_MAX === "number") ? CELERITY_GAUGE_MAX : 100;
      return Math.max(0, Math.ceil((max - Number(e.gauge || 0)) / gain) - 1);
    }

    var fieldMap = {
      chargeIncoming: { flag: "chargeTelegraphed", counter: "chargeIn" },
      shieldIncoming: { flag: "shieldTelegraphed", counter: "shieldIn" },
      healIncoming: { flag: "healTelegraphed", counter: "healIn" },
      enemySilenceIncoming: { flag: "silenceTelegraphed", counter: "silenceIn" }
    };
    var fields = fieldMap[conditionId];
    if (!fields) return null;
    if (e[fields.flag]) return null; // déjà télégraphié, impact au prochain tour
    return Math.max(0, Number(e[fields.counter] || 0));
  },

    getActiveDefenseEffect: function () {
    this.ensure();
    var active = game.classActiveDefense;
    if (!active) return null;
    if (!(Number(active.roundsLeft || 0) > 0)) {
      game.classActiveDefense = null;
      return null;
    }
    return active;
  },

    useSkillManual: function (slot) {
    var action = this.getAction(slot);
    var matchedConditionId = null;
    var hasCounters = !!(action && Array.isArray(action.counters) && action.counters.length);

    if (hasCounters && game.enemy) {
      var context = this.getGrimoireCombatContext();
      for (var i = 0; i < action.counters.length; i++) {
        var conditionId = action.counters[i];
        if (context[conditionId]) {
          matchedConditionId = conditionId;
          break;
        }
      }
    }

    if (!matchedConditionId && action && game.enemy) {
      var archetypeConditionId = (typeof getArchetypeEffectConditionId === "function")
        ? getArchetypeEffectConditionId(action)
        : null;
      if (archetypeConditionId && typeof evaluateGrimoireCondition === "function"
        && evaluateGrimoireCondition(archetypeConditionId, this.getGrimoireCombatContext())) {
        matchedConditionId = archetypeConditionId;
      }
    }

    if (window.CombatReportManager && CombatReportManager.isTrackedSlot(slot)) {
      var resourceStateCheck = this.ensureForCurrentClass();
      var combatContextCheck = this.getCombatContext();
      if (action && resourceStateCheck && typeof canUseAction === "function"
        && !canUseAction(resourceStateCheck, game.classCooldowns, action, combatContextCheck)) {
        var cooldownRemaining = (game.classCooldowns && game.classCooldowns[action.id]) || 0; // en rounds
        var affordable = resourceStateCheck.current >= (action.resourceCost || 0);
        if (cooldownRemaining > 0) {
          CombatReportManager.logFailedAttempt(slot, "cooldown");
        } else if (!affordable) {
          CombatReportManager.logFailedAttempt(slot, "resource");
        }
      } else if (hasCounters && !matchedConditionId) {
        CombatReportManager.logCounterMissed(slot);
      }
    }

    return this.useSkill(slot, matchedConditionId);
  },

    useSkill: function (slot, matchedConditionId) {
    this.ensure();
    if (!game.enemy) return false;
    if ((game.heroHp || 0) <= 0) return false;
    if (typeof isBlockingModalOpen === "function" && isBlockingModalOpen()) return false;

    var action = this.getAction(slot);
    if (!action) return false;

    var resourceState = this.ensureForCurrentClass();
    if (!resourceState) return false;

    var combatContext = this.getCombatContext();
    if (typeof canUseAction !== "function" || !canUseAction(resourceState, game.classCooldowns, action, combatContext)) {
      return false;
    }

    var result = useAction(resourceState, game.classCooldowns, action, combatContext);
    if (!result.success) return false;

    game.classResource = result.resourceState;
    game.classCooldowns = result.cooldownState;

    if (window.CombatReportManager) CombatReportManager.logUsage(slot);

    this.applyGrimoireCounterIfApplicable(action, matchedConditionId, slot);

    if (action.type === "defense") {
      this.activateDefenseEffect(action);
      if (game.enemy) this.applyActionEffects(action, 0, matchedConditionId);
      addLog("🛡️ " + action.label + " !", "event");
      showToast((action.icon || "🛡️") + " " + action.label, 1400);
    } else {
      this.applyDamageAction(action, matchedConditionId);
      addLog("✨ " + action.label + " !", "event");
      showToast((action.icon || "✨") + " " + action.label, 1400);
    }

    return true;
  },

    applyGrimoireCounterIfApplicable: function (action, matchedConditionId, slot) {
    if (!matchedConditionId || !game.enemy) return;
    if (!Array.isArray(action.counters) || action.counters.indexOf(matchedConditionId) === -1) return;

    var flagByCondition = {
      chargeIncoming: "chargeTelegraphed",
      shieldIncoming: "shieldTelegraphed",
      healIncoming: "healTelegraphed",
      enemySilenceIncoming: "silenceTelegraphed"
    };
    var countered = !!(flagByCondition[matchedConditionId] && game.enemy[flagByCondition[matchedConditionId]]);

    if (countered) {
      if (window.CombatReportManager) {
        var estimatedValue = (typeof CombatEngine !== "undefined" && typeof CombatEngine.estimateCounterValue === "function")
          ? CombatEngine.estimateCounterValue(matchedConditionId)
          : 0;
        CombatReportManager.logCounterSuccess(slot, matchedConditionId, estimatedValue);
      }
      addLog("⚡ Contre réussi : " + (action.label || "l'action") + " annule l'attaque adverse !", "event");
      showToast("⚡ Contré !", 1600);
      if (window.CombatEngine && typeof CombatEngine.rescheduleCounteredPattern === "function") {
        CombatEngine.rescheduleCounteredPattern(matchedConditionId); // annule le pattern, relance son compte à rebours
      }
      if (typeof showCounterSuccessPopup === "function") showCounterSuccessPopup();
      if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
    }
  },

    applyDamageAction: function (action, matchedConditionId) {
    var baseDamage = (window.EquipmentManager && typeof EquipmentManager.effectiveTapDamage === "function")
      ? EquipmentManager.effectiveTapDamage()
      : Math.max(1, Math.floor(game.tapDamage * game.tapMult) + Math.floor(game.equipFlatTapBonus || 0));

    var hits = Math.max(1, Number(action.hits || 1));
    var lastHitDmg = 0;
    var target = game.enemy;
    for (var i = 0; i < hits; i++) {
      if (!game.enemy || game.enemy !== target) break; // v3.102.0 : l'ennemi est mort, les coups restants sont perdus
      var dmg = baseDamage * Number(action.damageMultiplier || 1);
      var critChance = Math.max(0, EquipmentManager.effectiveCritChance() - getEnemyWillCritPenalty());
      var isCrit = chance(critChance);
      if (isCrit) dmg = dmg * EquipmentManager.effectiveCritMult();
      lastHitDmg = dmg;
      CombatEngine.dealDamage(dmg, isCrit, true, !!action.ignoreAffinity);
    }

    if (game.enemy && game.enemy === target) this.applyActionEffects(action, lastHitDmg, matchedConditionId);
  },

    applyActionEffects: function (action, lastHitDmg, matchedConditionId) {
    var effects = action.effects || [];
    for (var i = 0; i < effects.length; i++) {
      var effect = effects[i];
      if (!effect || !game.enemy) continue;

      if (effect.type === "enemyVulnerability") {
        game.enemy.vulnerableRounds = Math.max(1, Number(effect.durationRounds || 1));
        game.enemy.vulnerableMult = Number(effect.value || 0);
      } else if (effect.type === "damageOverTime") {
        this.applyDoT(effect, lastHitDmg);
      } else if (effect.type === "enemyRageSuppression") {
        if (matchedConditionId === "enemyEnraged") this.applyEnemyRageSuppression();
      } else if (effect.type === "enemyCorruptionPurge") {
        if (matchedConditionId === "enemyCorrupted") this.applyEnemyCorruptionPurge();
      } else if (effect.type === "enemyLifestealSuppression") {
        if (matchedConditionId === "enemyVampiric") this.applyVampiricLifestealSuppression();
      } else if (effect.type === "enemyArmorSuppression") {
        if (matchedConditionId === "enemyArmored") this.applyArmorSuppression();
      }
    }
  },

    applyEnemyRageSuppression: function () {
    if (!game.enemy || game.enemy.archetype !== "enraged") return;
    if (!(game.enemy.maxHp > 0)) return;

    var currentPct = 1 - (Number(game.enemy.hp || 0) / Number(game.enemy.maxHp || 1));
    var reduction = (typeof ENRAGED_SUPPRESSION_REDUCTION_PCT === "number") ? ENRAGED_SUPPRESSION_REDUCTION_PCT : 0.20;
    var reducedPct = Math.max(0, currentPct - reduction);
    game.enemy.rageFrozenPct = reducedPct;
    game.enemy.rageFreezeRounds = (typeof ENRAGED_FREEZE_DURATION_ROUNDS === "number") ? ENRAGED_FREEZE_DURATION_ROUNDS : 2;

    addLog("😤 La rage de " + game.enemy.name + " retombe temporairement !", "event");
    showToast("😤 Rage apaisée !", 1400);
    if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
  },

    applyEnemyCorruptionPurge: function () {
    if (!game.enemy || game.enemy.archetype !== "corrupted") return;
    if (!(Number(game.enemy.corruptedStacks || 0) > 0)) return; // rien à purger, silencieux

    game.enemy.corruptedStacks = 0;

    addLog("✨ La corruption de " + game.enemy.name + " est purgée !", "event");
    showToast("✨ Corruption purgée !", 1400);
    if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
  },

    applyVampiricLifestealSuppression: function () {
    if (!game.enemy || game.enemy.archetype !== "vampiric") return;

    game.enemy.vampiricSuppressedRounds = (typeof VAMPIRIC_SUPPRESSION_DURATION_ROUNDS === "number") ? VAMPIRIC_SUPPRESSION_DURATION_ROUNDS : 2;

    addLog("🧛 Le vol de vie de " + game.enemy.name + " est bloqué temporairement !", "event");
    showToast("🧛 Vol de vie bloqué !", 1400);
    if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
  },

    applyArmorSuppression: function () {
    if (!game.enemy || game.enemy.archetype !== "armored") return;

    var suppressedReduction = (typeof ARMORED_SUPPRESSION_REDUCTION_PCT === "number") ? ARMORED_SUPPRESSION_REDUCTION_PCT : 0.05;

    game.enemy.armorSuppressedReduction = suppressedReduction;
    game.enemy.armorSuppressedRounds = (typeof ARMORED_SUPPRESSION_DURATION_ROUNDS === "number") ? ARMORED_SUPPRESSION_DURATION_ROUNDS : 2;

    addLog("🛡️‍🩹 Le blindage de " + game.enemy.name + " se fissure temporairement !", "event");
    showToast("🛡️‍🩹 Blindage fissuré !", 1400);
    if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
  },

    applyDoT: function (effect, lastHitDmg) {
    game.enemy.dot = {
      perRound: Math.max(0, Math.floor(Number(lastHitDmg || 0) * Number(effect.percentPerRound || 0))),
      rounds: Math.max(1, Number(effect.durationRounds || 1))
    };
  },

  /* Un tick de DoT en fin de round (appelé par CombatEngine.endRound). */
  tickDoTRound: function () {
    if (!game.enemy || !game.enemy.dot) return;
    var dot = game.enemy.dot;
    var target = game.enemy;
    if (dot.perRound > 0) {
      CombatEngine.dealDamage(dot.perRound, false, false, true); // ignoreAffinity : déjà appliquée sur le coup d'origine
    }
    if (game.enemy !== target || !game.enemy.dot) return;
    dot.rounds -= 1;
    if (dot.rounds <= 0) delete game.enemy.dot;
  },

    activateDefenseEffect: function (action) {
    var effect = (action.effects && action.effects[0]) || null;
    if (!effect) return;

    var talentDurationBonusRounds = (game.talents && game.talents.t_thick_skin) ? game.talents.t_thick_skin : 0; // +1 round/niveau
    var talentValueBonus = (game.talents && game.talents.t_calm_breath) ? game.talents.t_calm_breath * 0.05 : 0;

    game.classActiveDefense = {
      actionId: action.id,
      effectType: effect.type, // "damageReduction" | "evasion" | "damageAbsorption"
      value: Math.min(1, Number(effect.value || 0) + talentValueBonus),
      roundsLeft: Math.max(1, Number(effect.durationRounds || 1)) + talentDurationBonusRounds
    };
  },

    getBasicAttackMultiplier: function () {
    var action = this.getAction("basic");
    return action ? Number(action.damageMultiplier || 1) : 1;
  },

    onBasicAttackDealt: function (damageDealt, isCritical) {
    var resourceState = this.ensureForCurrentClass();
    if (!resourceState) return;

    var classId = this.getCurrentClassId();
    var resourceDef = (typeof getClassResource === "function") ? getClassResource(classId) : null;
    if (!resourceDef || !resourceDef.generation) return;

    game.classResource = applyResourceGain(resourceState, resourceDef.generation, {
      damageDealt: damageDealt,
      isCritical: !!isCritical,
      isBasicAttack: true
    });
  },

    /* Fin de round côté héros : cooldowns -1, mana passif, défense active -1 round. */
  onRoundEnd: function () {
    this.ensure();
    var classId = this.getCurrentClassId();
    if (!classId) return;
    this.ensureForCurrentClass();

    game.classCooldowns = tickCooldowns(game.classCooldowns, 1);

    var resourceDef = (typeof getClassResource === "function") ? getClassResource(classId) : null;
    if (resourceDef && resourceDef.generation && resourceDef.generation.type === "passiveAndBasicAttack") {
      game.classResource = tickResourceRegen(game.classResource, resourceDef.generation, 1);
    }

    if (game.classActiveDefense) {
      game.classActiveDefense.roundsLeft = Number(game.classActiveDefense.roundsLeft || 0) - 1;
      if (game.classActiveDefense.roundsLeft <= 0) game.classActiveDefense = null;
    }
  },

    /* Réserve : si le télégraphe de la règle de contre prioritaire est à ≤ GRIMOIRE_APPROACH_WINDOW_ROUNDS,
     le repli garde le coût de l'action de contre — sauf si elle est déjà prête ou si l'ennemi mourra avant. */
  shouldActivateGrimoireReserve: function (activeRules, kit, resourceState) {
    if (!activeRules || !kit || !resourceState) return false;
    if (typeof getPrioritaryCounterRule !== "function") return false;

    var rule = getPrioritaryCounterRule(activeRules, kit, game.enemy);
    if (!rule) return false;

    var action = kit.actions[rule.actionSlot];
    if (!action || !(action.resourceCost > 0)) return false;

    var windowRounds = (typeof getGrimoireApproachWindowRounds === "function")
      ? getGrimoireApproachWindowRounds(action.resourceCost)
      : 3;

    var roundsRemaining = this.getRoundsUntilPatternTrigger(rule.conditionId);
    if (roundsRemaining === null) return false;
    if (roundsRemaining > windowRounds) return false;

    if (this.isCounterActionAlreadyOnTrack(action, resourceState, roundsRemaining)) return false;

    var resourceDef = (typeof getClassResource === "function") ? getClassResource(kit.classId) : null;
    if (!resourceDef) return false;

    var basicDamageEstimate = (window.EquipmentManager && typeof EquipmentManager.effectiveTapDamage === "function")
      ? EquipmentManager.effectiveTapDamage()
      : 0;

    var estimatedGain = (typeof estimateResourceGainOverWindow === "function")
      ? estimateResourceGainOverWindow(resourceDef, roundsRemaining, basicDamageEstimate)
      : 0;

    if (Number(resourceState.current || 0) + estimatedGain < action.resourceCost) return false;

    if (typeof estimateRoundsToKill === "function" && game.enemy) {
      var heroStats = {
        weaponType: (window.HEROES_DB && game.heroId) ? (HEROES_DB[game.heroId] && HEROES_DB[game.heroId].weaponType) : null,
        attackDamage: basicDamageEstimate,
        celerity: (window.CombatEngine && typeof CombatEngine.getTotalCelerity === "function") ? CombatEngine.getTotalCelerity() : 0,
        critChance: ((window.EquipmentManager && typeof EquipmentManager.effectiveCritChance === "function") ? EquipmentManager.effectiveCritChance() : 0) / 100,
        critMult: (window.EquipmentManager && typeof EquipmentManager.effectiveCritMult === "function") ? EquipmentManager.effectiveCritMult() : 1
      };
      var enemyStats = { hp: game.enemy.hp, resists: game.enemy.isBoss ? [] : game.enemy.resists, weak: game.enemy.isBoss ? [] : game.enemy.weak };
      if (estimateRoundsToKill(heroStats, enemyStats) <= roundsRemaining + 1) return false; // l'ennemi mourra avant, on tape
    }

    return true;
  },

  isCounterActionAlreadyOnTrack: function (action, resourceState, roundsRemaining) {
    if (!action || !resourceState) return false;
    if (Number(resourceState.current || 0) < Number(action.resourceCost || 0)) return false;

    var cooldownRemaining = (game.classCooldowns && typeof game.classCooldowns[action.id] === "number")
      ? game.classCooldowns[action.id]
      : 0;
    return cooldownRemaining <= Number(roundsRemaining || 0);
  },

    buildReservedResourceState: function (resourceState, reserveAmount) {
    if (!resourceState || !(reserveAmount > 0)) return resourceState;
    return Object.assign({}, resourceState, {
      current: Math.max(0, resourceState.current - reserveAmount)
    });
  },

    /* Décision de round de l'auto-pilote : règle du Grimoire applicable d'abord, sinon repli par défaut (avec réserve).
     Retourne { slot, matchedConditionId } ou null (= Attaque). forExecution=false : suggestion sans effet de bord. */
  chooseRoundAction: function (forExecution) {
    if (!game.enemy) return null;
    if ((game.heroHp || 0) <= 0) return null;

    var classId = this.getCurrentClassId();
    if (!classId || typeof getClassSkills !== "function") return null;

    var kit = getClassSkills(classId);
    if (!kit) return null;

    var resourceState = this.ensureForCurrentClass();
    if (!resourceState) return null;

    var grimoireContext = this.getGrimoireCombatContext();

    var unlockedSlotCount = (typeof getGrimoireSlotCount === "function")
      ? getGrimoireSlotCount(game.worldsEverReached)
      : 2;
    var activeRules = (Array.isArray(game.grimoireRules) && game.grimoireRules.length)
      ? game.grimoireRules.slice(0, unlockedSlotCount)
      : null;

    if (activeRules && activeRules.length && typeof chooseGrimoireAction === "function") {
      var grimoireResult = chooseGrimoireAction(activeRules, kit, resourceState, game.classCooldowns, grimoireContext);
      if (grimoireResult) return { slot: grimoireResult.actionSlot, matchedConditionId: grimoireResult.matchedConditionId };
    }

    var reserveAmount = this.shouldActivateGrimoireReserve(activeRules, kit, resourceState)
      ? ((typeof getGrimoireCounterReserveAmount === "function") ? getGrimoireCounterReserveAmount(activeRules, kit, game.enemy) : 0)
      : 0;
    var resourceStateForFallback = this.buildReservedResourceState(resourceState, reserveAmount);

    var priorityList = (typeof getAutoPolicyDefault === "function") ? getAutoPolicyDefault(classId) : null;
    if (!priorityList) return null;

    var priorityRule = (activeRules && typeof getPrioritaryCounterRule === "function")
      ? getPrioritaryCounterRule(activeRules, kit, game.enemy)
      : null;
    var priorityListForFallback = priorityRule
      ? priorityList.filter(function (s) { return s !== priorityRule.actionSlot; })
      : priorityList;

    if (forExecution && priorityRule && window.CombatReportManager && typeof canUseAction === "function") {
      var excludedAction = kit.actions[priorityRule.actionSlot];
      if (excludedAction && canUseAction(resourceState, game.classCooldowns, excludedAction, grimoireContext)) {
        CombatReportManager.logBlockedByReserve(priorityRule.actionSlot);
      }
    }

    var slot = (typeof chooseAutoAction === "function")
      ? chooseAutoAction(priorityListForFallback, kit, resourceStateForFallback, game.classCooldowns, grimoireContext)
      : null;
    if (!slot || slot === "basic") return null;
    return { slot: slot, matchedConditionId: null }; // jamais de contre depuis le repli par défaut
  }
};

window.ClassCombatManager = ClassCombatManager;
