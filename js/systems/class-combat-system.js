"use strict";
/* systems/class-combat-system.js — ADAPTATEUR classes (data/class-skills.js) <-> game.* et combat-engine.js.
   useSkill() = point d'entrée UI ; tickAutoSkills() = combat auto (Grimoire d'abord, repli par défaut sinon) ; tick() = cooldowns+régén passive.
   Détail complet (logique de réserve/exclusion Grimoire, contres d'archétypes, etc.) : COMMENTAIRES_ORIGINAUX.md */
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
      game.classActiveDefense = null; // { actionId, effectType, value, expiresAt } ou null
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
      isSilenced: !!(game.silencedUntil && Date.now() < game.silencedUntil)
    };
  },

    getGrimoireCombatContext: function () {
    var base = this.getCombatContext();
    var now = Date.now();

    base.chargeIncoming = !!(game.enemy && game.enemy.chargeTelegraphUntil && now < game.enemy.chargeTelegraphUntil);
    base.shieldIncoming = !!(game.enemy && game.enemy.shieldTelegraphUntil && now < game.enemy.shieldTelegraphUntil);
    base.healIncoming = !!(game.enemy && game.enemy.healTelegraphUntil && now < game.enemy.healTelegraphUntil);
    base.enemySilenceIncoming = !!(game.enemy && game.enemy.silenceTelegraphUntil && now < game.enemy.silenceTelegraphUntil);

    var heroMaxHp = Number(game.heroMaxHp || 0);
    base.heroHpPercent = heroMaxHp > 0 ? Number(game.heroHp || 0) / heroMaxHp : null;

    base.secondsUntilEnemyAttack = this.getSecondsUntilNextEnemyAttack();

    base.enemyArchetype = game.enemy ? (game.enemy.archetype || null) : null;

    return base;
  },

    getSecondsUntilNextEnemyAttack: function () {
    if (!game.enemy || !game.enemy.stats) return null;

    var celerity = Number(game.enemy.stats.celerity || 0);
    var interval = (typeof ENEMY_ATTACK_BASE_INTERVAL === "number" ? ENEMY_ATTACK_BASE_INTERVAL : 3) / (1 + celerity / 40);
    var elapsed = Number(game._enemyAttackTimer || 0);
    var remaining = interval - elapsed;
    return remaining > 0 ? remaining : 0;
  },

    getSecondsUntilPatternTrigger: function (conditionId) {
    if (!game.enemy) return null;

    var fieldMap = {
      chargeIncoming: { telegraph: "chargeTelegraphUntil", nextAt: "_chargeNextAt", timer: "_chargeTimer" },
      shieldIncoming: { telegraph: "shieldTelegraphUntil", nextAt: "_shieldNextAt", timer: "_shieldTimer" },
      healIncoming: { telegraph: "healTelegraphUntil", nextAt: "_healNextAt", timer: "_healTimer" },
      enemySilenceIncoming: { telegraph: "silenceTelegraphUntil", nextAt: "_silenceNextAt", timer: "_silenceTimer" }
    };
    var fields = fieldMap[conditionId];
    if (!fields) return null;

    if (game.enemy[fields.telegraph]) return null; // déjà télégraphié, plus en phase d'approche

    var nextAt = Number(game.enemy[fields.nextAt] || 0);
    if (nextAt <= 0) return null; // minuteur pas encore démarré

    var elapsed = Number(game.enemy[fields.timer] || 0);
    var remaining = nextAt - elapsed;
    return remaining > 0 ? remaining : 0;
  },

    getActiveDefenseEffect: function () {
    this.ensure();
    var active = game.classActiveDefense;
    if (!active) return null;
    if (Date.now() >= active.expiresAt) {
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
        var cooldownRemaining = (game.classCooldowns && game.classCooldowns[action.id]) || 0;
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

    if (typeof renderClassSkillButtons === "function") renderClassSkillButtons();
    saveGame();
    return true;
  },

    applyGrimoireCounterIfApplicable: function (action, matchedConditionId, slot) {
    if (!matchedConditionId || !game.enemy) return;
    if (!Array.isArray(action.counters) || action.counters.indexOf(matchedConditionId) === -1) return;

    var countered = false;

    if (matchedConditionId === "chargeIncoming" && game.enemy.chargeTelegraphUntil) {
      game.enemy.chargeTelegraphUntil = 0;
      countered = true;
    } else if (matchedConditionId === "shieldIncoming" && game.enemy.shieldTelegraphUntil) {
      game.enemy.shieldTelegraphUntil = 0;
      countered = true;
    } else if (matchedConditionId === "healIncoming" && game.enemy.healTelegraphUntil) {
      game.enemy.healTelegraphUntil = 0;
      countered = true;
    } else if (matchedConditionId === "enemySilenceIncoming" && game.enemy.silenceTelegraphUntil) {
      game.enemy.silenceTelegraphUntil = 0;
      countered = true;
    }

    if (countered) {
      if (window.CombatReportManager) {
        var estimatedValue = (typeof CombatEngine !== "undefined" && typeof CombatEngine.estimateCounterValue === "function")
          ? CombatEngine.estimateCounterValue(matchedConditionId)
          : 0;
        CombatReportManager.logCounterSuccess(slot, matchedConditionId, estimatedValue);
      }
      addLog("⚡ Contre réussi : " + (action.label || "l'action") + " annule l'attaque adverse !", "event");
      showToast("⚡ Contré !", 1600);
      game.enemy.counteredUntil = Date.now() + (typeof COUNTER_CONFIRMATION_MS === "number" ? COUNTER_CONFIRMATION_MS : 800);
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
    for (var i = 0; i < hits; i++) {
      if (!game.enemy) break;
      var dmg = baseDamage * Number(action.damageMultiplier || 1);
      var critChance = Math.max(0, EquipmentManager.effectiveCritChance() - getEnemyWillCritPenalty());
      var isCrit = chance(critChance);
      if (isCrit) dmg = dmg * EquipmentManager.effectiveCritMult();
      lastHitDmg = dmg;
      CombatEngine.dealDamage(dmg, isCrit, true, !!action.ignoreAffinity);
    }

    if (game.enemy) this.applyActionEffects(action, lastHitDmg, matchedConditionId);
  },

    applyActionEffects: function (action, lastHitDmg, matchedConditionId) {
    var effects = action.effects || [];
    for (var i = 0; i < effects.length; i++) {
      var effect = effects[i];
      if (!effect || !game.enemy) continue;

      if (effect.type === "enemyVulnerability") {
        game.enemy.vulnerableUntil = Date.now() + Number(effect.durationMs || 0);
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
    var freezeDurationMs = (typeof ENRAGED_FREEZE_DURATION_MS === "number") ? ENRAGED_FREEZE_DURATION_MS : 4000;

    game.enemy.rageFrozenPct = reducedPct;
    game.enemy.rageFreezeUntil = Date.now() + freezeDurationMs;

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

    var suppressionDurationMs = (typeof VAMPIRIC_SUPPRESSION_DURATION_MS === "number") ? VAMPIRIC_SUPPRESSION_DURATION_MS : 4000;
    game.enemy.vampiricSuppressedUntil = Date.now() + suppressionDurationMs;

    addLog("🧛 Le vol de vie de " + game.enemy.name + " est bloqué temporairement !", "event");
    showToast("🧛 Vol de vie bloqué !", 1400);
    if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
  },

    applyArmorSuppression: function () {
    if (!game.enemy || game.enemy.archetype !== "armored") return;

    var suppressionDurationMs = (typeof ARMORED_SUPPRESSION_DURATION_MS === "number") ? ARMORED_SUPPRESSION_DURATION_MS : 4000;
    var suppressedReduction = (typeof ARMORED_SUPPRESSION_REDUCTION_PCT === "number") ? ARMORED_SUPPRESSION_REDUCTION_PCT : 0.05;

    game.enemy.armorSuppressedReduction = suppressedReduction;
    game.enemy.armorSuppressedUntil = Date.now() + suppressionDurationMs;

    addLog("🛡️‍🩹 Le blindage de " + game.enemy.name + " se fissure temporairement !", "event");
    showToast("🛡️‍🩹 Blindage fissuré !", 1400);
    if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
  },

    applyDoT: function (effect, lastHitDmg) {
    var perTick = Math.max(0, Number(lastHitDmg || 0) * Number(effect.percentPerSecond || 0));
    game.enemy.dot = {
      perTickDamage: perTick,
      remainingMs: Number(effect.durationMs || 0),
      accumMs: 0 // accumulateur pour ticker toutes les 1000ms même avec un dt irrégulier
    };
  },

    tickDoT: function (elapsedMs) {
    if (!game.enemy || !game.enemy.dot) return;

    var dot = game.enemy.dot;
    dot.accumMs += elapsedMs;
    dot.remainingMs -= elapsedMs;

    var guard = 0;
    while (dot.accumMs >= 1000 && guard < 10) {
      dot.accumMs -= 1000;
      guard++;
      if (!game.enemy || !game.enemy.dot) return; // l'ennemi a pu mourir sur un tick précédent de cette boucle
      CombatEngine.dealDamage(dot.perTickDamage, false, false, true); // ignoreAffinity: true, dégâts déjà calculés sur le coup d'origine
    }

    if (game.enemy && game.enemy.dot && game.enemy.dot.remainingMs <= 0) {
      delete game.enemy.dot;
    }
  },

    activateDefenseEffect: function (action) {
    var effect = (action.effects && action.effects[0]) || null;
    if (!effect) return;

    var talentDurationBonusMs = (game.talents && game.talents.t_thick_skin) ? game.talents.t_thick_skin * 2000 : 0;
    var talentValueBonus = (game.talents && game.talents.t_calm_breath) ? game.talents.t_calm_breath * 0.05 : 0;

    game.classActiveDefense = {
      actionId: action.id,
      effectType: effect.type, // "damageReduction" | "evasion" | "damageAbsorption"
      value: Math.min(1, Number(effect.value || 0) + talentValueBonus),
      expiresAt: Date.now() + Number(effect.durationMs || 0) + talentDurationBonusMs
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

    tick: function (dt) {
    this.ensure();
    if (!this.isCombatActive()) return;

    var elapsedMs = Math.max(0, Number(dt || 0)) * 1000;
    if (elapsedMs <= 0) return;

    this.tickDoT(elapsedMs);

    var classId = this.getCurrentClassId();
    if (!classId) return;

    this.ensureForCurrentClass();

    game.classCooldowns = tickCooldowns(game.classCooldowns, elapsedMs);

    var resourceDef = (typeof getClassResource === "function") ? getClassResource(classId) : null;
    if (resourceDef && resourceDef.generation && resourceDef.generation.type === "passiveAndBasicAttack") {
      game.classResource = tickResourceRegen(game.classResource, resourceDef.generation, elapsedMs);
    }
  },

    shouldActivateGrimoireReserve: function (activeRules, kit, resourceState) {
    if (!activeRules || !kit || !resourceState) return false;
    if (typeof getPrioritaryCounterRule !== "function") return false;

    var rule = getPrioritaryCounterRule(activeRules, kit, game.enemy);
    if (!rule) return false;

    var action = kit.actions[rule.actionSlot];
    if (!action || !(action.resourceCost > 0)) return false;

    var approachWindowSeconds = (typeof getGrimoireApproachWindowSeconds === "function")
      ? getGrimoireApproachWindowSeconds(action.resourceCost)
      : 0;

    var secondsRemaining = this.getSecondsUntilPatternTrigger(rule.conditionId);
    if (secondsRemaining === null) return false;
    if (secondsRemaining > approachWindowSeconds) return false; // pattern encore loin, pas la peine de brider

    if (this.isCounterActionAlreadyOnTrack(action, resourceState, secondsRemaining)) return false;

    var resourceDef = (typeof getClassResource === "function") ? getClassResource(kit.classId) : null;
    if (!resourceDef) return false;

    var totalCelerity = (window.CombatEngine && typeof CombatEngine.getTotalCelerity === "function")
      ? CombatEngine.getTotalCelerity()
      : 0;
    var effectiveCooldownMs = (typeof computeEffectiveCooldownMs === "function")
      ? computeEffectiveCooldownMs(BASIC_ATTACK_BASE_COOLDOWN_MS, totalCelerity)
      : BASIC_ATTACK_BASE_COOLDOWN_MS;

    var basicDamageEstimate = (window.EquipmentManager && typeof EquipmentManager.effectiveTapDamage === "function")
      ? EquipmentManager.effectiveTapDamage()
      : 0;

    var estimatedGain = (typeof estimateResourceGainOverWindow === "function")
      ? estimateResourceGainOverWindow(resourceDef, secondsRemaining, effectiveCooldownMs, basicDamageEstimate)
      : 0;

    var predictedTotal = Number(resourceState.current || 0) + estimatedGain;
    return predictedTotal >= action.resourceCost;
  },

    isCounterActionAlreadyOnTrack: function (action, resourceState, secondsRemaining) {
    if (!action || !resourceState) return false;
    if (Number(resourceState.current || 0) < Number(action.resourceCost || 0)) return false;

    var cooldownRemainingMs = (game.classCooldowns && typeof game.classCooldowns[action.id] === "number")
      ? game.classCooldowns[action.id]
      : 0;
    var secondsRemainingMs = Number(secondsRemaining || 0) * 1000;

    return (cooldownRemainingMs + GRIMOIRE_RESERVE_RELEASE_SAFETY_MARGIN_MS) < secondsRemainingMs;
  },

    buildReservedResourceState: function (resourceState, reserveAmount) {
    if (!resourceState || !(reserveAmount > 0)) return resourceState;
    return Object.assign({}, resourceState, {
      current: Math.max(0, resourceState.current - reserveAmount)
    });
  },

    tickAutoSkills: function (dt) {
    if (!game.autoSkillsEnabled) return;
    if (!this.isCombatActive()) return;
    if (!game.enemy) return;

    game._autoSkillsAccumMs = Number(game._autoSkillsAccumMs || 0) + Math.max(0, Number(dt || 0)) * 1000;
    if (game._autoSkillsAccumMs < AUTO_SKILLS_DECISION_INTERVAL_MS) return;
    game._autoSkillsAccumMs = 0;

    var classId = this.getCurrentClassId();
    if (!classId || typeof getClassSkills !== "function") return;

    var kit = getClassSkills(classId);
    if (!kit) return;

    var resourceState = this.ensureForCurrentClass();
    if (!resourceState) return;

    var grimoireContext = this.getGrimoireCombatContext();
    var slot = null;
    var matchedConditionId = null;

    var unlockedSlotCount = (typeof getGrimoireSlotCount === "function")
      ? getGrimoireSlotCount(game.worldsEverReached)
      : 2;
    var activeRules = (Array.isArray(game.grimoireRules) && game.grimoireRules.length)
      ? game.grimoireRules.slice(0, unlockedSlotCount)
      : null;

    if (activeRules && activeRules.length && typeof chooseGrimoireAction === "function") {
      var grimoireResult = chooseGrimoireAction(activeRules, kit, resourceState, game.classCooldowns, grimoireContext);
      if (grimoireResult) {
        slot = grimoireResult.actionSlot;
        matchedConditionId = grimoireResult.matchedConditionId;
      }
    }

    if (!slot) {
      var reserveAmount = this.shouldActivateGrimoireReserve(activeRules, kit, resourceState)
        ? ((typeof getGrimoireCounterReserveAmount === "function") ? getGrimoireCounterReserveAmount(activeRules, kit, game.enemy) : 0)
        : 0;
      var resourceStateForFallback = this.buildReservedResourceState(resourceState, reserveAmount);

      var priorityList = (typeof getAutoPolicyDefault === "function") ? getAutoPolicyDefault(classId) : null;
      if (!priorityList) return;

      var counterSlots = (activeRules && typeof getAllCounterActionSlots === "function")
        ? getAllCounterActionSlots(activeRules, kit, game.enemy)
        : [];
      var priorityListForFallback = counterSlots.length
        ? priorityList.filter(function (s) { return counterSlots.indexOf(s) === -1; })
        : priorityList;

      if (counterSlots.length && window.CombatReportManager && typeof canUseAction === "function") {
        counterSlots.forEach(function (excludedSlot) {
          var excludedAction = kit.actions[excludedSlot];
          if (excludedAction && canUseAction(resourceState, game.classCooldowns, excludedAction, grimoireContext)) {
            CombatReportManager.logBlockedByReserve(excludedSlot);
          }
        });
      }

      slot = (typeof chooseAutoAction === "function")
        ? chooseAutoAction(priorityListForFallback, kit, resourceStateForFallback, game.classCooldowns, grimoireContext)
        : null;
      matchedConditionId = null; // jamais de contre depuis le repli par défaut, voir note ci-dessus
    }

    if (!slot || slot === "basic") return;

    this.useSkill(slot, matchedConditionId);
  },

    tryAutoBasicAttack: function () {
    if (!game.autoSkillsEnabled) return;
    if (!this.isCombatActive()) return;
    if (!game.enemy) return;
    if ((game.basicAttackCooldownMs || 0) > 0) return;
    if (typeof CombatEngine === "undefined" || typeof CombatEngine.playerAttack !== "function") return;
    CombatEngine.playerAttack();
  }
};

var AUTO_SKILLS_DECISION_INTERVAL_MS = 300;

var GRIMOIRE_RESERVE_RELEASE_SAFETY_MARGIN_MS = 600;

window.ClassCombatManager = ClassCombatManager;
