"use strict";
/* systems/combat-engine.js — cœur de la boucle de combat : attaque joueur (tap/auto-DPS/auto-tap), riposte ennemie,
   patterns (Charge/Silencieux ennemis normaux ; Bouclier/Soin boss), mort d'un ennemi (récompenses/butin/progression).
   NOTE : contenait un doublon de commentaire (getConfiguredCounterSlotsForCondition/estimateCounterValue expliqués 2×).
   Détail complet : COMMENTAIRES_ORIGINAUX.md */

var autoTapInterval = null;

var RESIST_DMG_MULT = 0.7;
var WEAK_DMG_MULT = 1.3;
var NO_WEAPON_MULT = 0.8;

function getPlayerDamageType() {
  if (!game.equipped || !game.equipped.weapon) return null;
  var hero = (window.HEROES_DB && game.heroId) ? HEROES_DB[game.heroId] : null;
  return (hero && hero.weaponType) || null;
}

function getDamageAffinity() {
  if (!game.enemy) return { type: null, status: "neutral", mult: 1 };

  var type = getPlayerDamageType();
  if (!type) return { type: null, status: "unarmed", mult: NO_WEAPON_MULT };

  var resists = game.enemy.resists || [];
  var weak = game.enemy.weak || [];

  if (resists.indexOf(type) !== -1) return { type: type, status: "resist", mult: RESIST_DMG_MULT };
  if (weak.indexOf(type) !== -1) return { type: type, status: "weak", mult: WEAK_DMG_MULT };
  return { type: type, status: "neutral", mult: 1 };
}

var ENEMY_ATTACK_BASE_INTERVAL = 3;
var ENEMY_POWER_DMG_COEF = 0.5;
var ENEMY_PRECISION_CRIT_COEF = 0.3;
var ENEMY_CRIT_MULT = 1.5;
var WILL_CRIT_RESIST_COEF = 0.05;
var DEFEAT_GOLD_PENALTY = 0.10;

var ENEMY_CHARGE_MIN_INTERVAL_S = 8;
var ENEMY_CHARGE_MAX_INTERVAL_S = 12;
var ENEMY_CHARGE_TELEGRAPH_MS = 1500;
var ENEMY_CHARGE_DMG_MULT = 1.3;

var BOSS_SHIELD_MIN_INTERVAL_S = 10;
var BOSS_SHIELD_MAX_INTERVAL_S = 15;
var BOSS_SHIELD_TELEGRAPH_MS = 1500;
var BOSS_SHIELD_DURATION_MS = 4000;
var BOSS_SHIELD_REDUCTION = 0.5;

var BOSS_HEAL_MIN_INTERVAL_S = 10;
var BOSS_HEAL_MAX_INTERVAL_S = 15;
var BOSS_HEAL_TELEGRAPH_MS = 1500;
var BOSS_HEAL_PERCENT = 0.15;

var COUNTER_CONFIRMATION_MS = 800;

var BASIC_ATTACK_BASE_COOLDOWN_MS = 1000;

function getEnemyWillCritPenalty() {
  var stats = game.enemy && game.enemy.stats;
  if (!stats) return 0;
  return Number(stats.will || 0) * WILL_CRIT_RESIST_COEF;
}

function showFloatingDamage(amount, isCrit) {
  var container = document.getElementById("enemy-display");
  if (!container) return;

  var el = document.createElement("div");
  el.className = "float-dmg " + (isCrit ? "crit" : "normal");
  el.textContent = (isCrit ? "💥 " : "") + formatNumber(amount);
  el.style.left = (45 + randFloat(-18, 18)) + "%";
  el.style.top = (26 + randFloat(-12, 12)) + "%";
  container.appendChild(el);

  setTimeout(function () {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 800);

  var emoji = document.getElementById("enemy-emoji");
  if (emoji) {
    emoji.classList.remove("hit-flash");
    void emoji.offsetWidth;
    emoji.classList.add("hit-flash");
  }
}

function showGoldPopup(amount) {
  var container = document.getElementById("enemy-display");
  if (!container) return;

  var el = document.createElement("div");
  el.className = "gold-popup";
  el.textContent = "+" + formatNumber(amount);
  el.style.left = "50%";
  el.style.top = "60%";
  container.appendChild(el);

  setTimeout(function () {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 1000);
}

function showDamageTakenPopup(amount) {
  var container = document.getElementById("combat-hero-mini");
  if (!container) return;

  var el = document.createElement("div");
  el.className = "damage-taken-popup";
  el.textContent = "-" + formatNumber(amount);
  el.style.left = "50%";
  el.style.top = "30%";
  container.appendChild(el);

  setTimeout(function () {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 1000);
}

function getConfiguredCounterSlotsForCondition(conditionId) {
  if (!window.ClassCombatManager || typeof ClassCombatManager.getCurrentClassId !== "function") return [];
  var classId = ClassCombatManager.getCurrentClassId();
  if (!classId || typeof getClassSkills !== "function") return [];
  var kit = getClassSkills(classId);
  if (!kit || !kit.actions) return [];

  var unlockedSlotCount = (typeof getGrimoireSlotCount === "function")
    ? getGrimoireSlotCount(game.worldsEverReached)
    : 2;
  var activeRules = (Array.isArray(game.grimoireRules) && game.grimoireRules.length)
    ? game.grimoireRules.slice(0, unlockedSlotCount)
    : [];

  var slots = [];
  activeRules.forEach(function (rule) {
    if (!rule || rule.conditionId !== conditionId || !rule.actionSlot) return;
    var action = kit.actions[rule.actionSlot];
    if (action && Array.isArray(action.counters) && action.counters.indexOf(conditionId) !== -1) {
      slots.push(rule.actionSlot);
    }
  });
  return slots;
}

function showCounterSuccessPopup() {
  var container = document.getElementById("enemy-display");
  if (!container) return;

  var el = document.createElement("div");
  el.className = "counter-success-popup";
  el.textContent = "⚡ CONTRÉ !";
  el.style.left = "50%";
  el.style.top = "18%";
  container.appendChild(el);

  setTimeout(function () {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 1400);

  var emoji = document.getElementById("enemy-emoji");
  if (emoji) {
    emoji.classList.remove("counter-flash");
    void emoji.offsetWidth;
    emoji.classList.add("counter-flash");
  }
}

var CombatEngine = {
    estimateCounterValue: function (conditionId) {
    if (!game.enemy || !game.enemy.stats) return 0;

    var power = Number(game.enemy.stats.power || 0);
    if (window.AfflictionManager && typeof AfflictionManager.getCombinedModifiers === "function") {
      power *= AfflictionManager.getCombinedModifiers().enemyPowerMult;
    }

    if (conditionId === "chargeIncoming") {
      return Math.max(1, Math.floor(power * ENEMY_POWER_DMG_COEF * ENEMY_CHARGE_DMG_MULT));
    }
    if (conditionId === "shieldIncoming") {
      return Math.max(1, Math.floor(power * ENEMY_POWER_DMG_COEF));
    }
    if (conditionId === "healIncoming") {
      return Math.max(1, Math.floor(Number(game.enemy.hp || 0) * BOSS_HEAL_PERCENT));
    }
    if (conditionId === "enemySilenceIncoming") {
      return (typeof SILENCE_DURATION_MS === "number") ? SILENCE_DURATION_MS : 4000;
    }
    return 0;
  },

    getEnragedEffectivePctHpLost: function () {
    if (!game.enemy || !(game.enemy.maxHp > 0)) return 0;

    if (game.enemy.rageFreezeUntil && Date.now() < game.enemy.rageFreezeUntil) {
      return Number(game.enemy.rageFrozenPct || 0);
    }

    return 1 - (Number(game.enemy.hp || 0) / Number(game.enemy.maxHp || 1));
  },

    spawnEnemy: function () {
    if (!window.WorldManager || typeof WorldManager.generateEnemy !== "function") return;

    game.enemy = WorldManager.generateEnemy();
    game._enemyAttackTimer = 0;
    if (typeof WorldManager.applyWorldTheme === "function") WorldManager.applyWorldTheme();

    if (typeof renderEnemy === "function") renderEnemy();
    if (typeof renderHud === "function") renderHud();
  },

    requestPlayerAttack: function () {
    if (!game.enemy || !window.EquipmentManager) return;
    if (typeof isBlockingModalOpen === "function" && isBlockingModalOpen()) return;
    if ((game.heroHp || 0) <= 0) return;

    if ((game.basicAttackCooldownMs || 0) > 0) {
      game.basicAttackPending = true;
      return;
    }

    this.playerAttack();
  },

    getTotalCelerity: function () {
    var hero = typeof getHeroByGameId === "function" ? getHeroByGameId(game.heroId) : null;
    var baseCelerity = (hero && hero.stats) ? Number(hero.stats.celerity) || 0 : 0;
    var trainedCelerity = (game.trainedStats && game.trainedStats.celerity) || 0;
    return baseCelerity + trainedCelerity;
  },

    tickBasicAttackCooldown: function (dt) {
    if ((game.basicAttackCooldownMs || 0) <= 0) return;

    game.basicAttackCooldownMs -= Math.max(0, Number(dt || 0)) * 1000;

    if (game.basicAttackCooldownMs > 0) {
      if (typeof renderBasicAttackCooldown === "function") renderBasicAttackCooldown();
      return;
    }

    game.basicAttackCooldownMs = 0;
    if (game.basicAttackPending) {
      game.basicAttackPending = false;
      this.playerAttack();
    } else if (typeof renderBasicAttackCooldown === "function") {
      renderBasicAttackCooldown();
    }
  },

    playerAttack: function () {
    if (!game.enemy || !window.EquipmentManager) return;
    if (typeof isBlockingModalOpen === "function" && isBlockingModalOpen()) return;
    if ((game.heroHp || 0) <= 0) return;

    var classBasicMult = (window.ClassCombatManager && typeof ClassCombatManager.getBasicAttackMultiplier === "function")
      ? ClassCombatManager.getBasicAttackMultiplier()
      : 1;

    var dmg = Math.max(1, Math.floor(EquipmentManager.effectiveTapDamage() * classBasicMult));
    var critChance = Math.max(0, EquipmentManager.effectiveCritChance() - getEnemyWillCritPenalty());
    var isCrit = chance(critChance);

    if (isCrit) {
      dmg = Math.floor(dmg * EquipmentManager.effectiveCritMult());
      if (window.QuestManager && typeof QuestManager.track === "function") QuestManager.track("crits", 1);
    }

    if (game.enemy.isBoss && game.talents.t_war_instinct) dmg = Math.floor(dmg * (1 + 0.05 * game.talents.t_war_instinct));
    if (game.enemy.isBoss && game.talents.t_boss_slayer) dmg = Math.floor(dmg * (1 + 0.08 * game.talents.t_boss_slayer));

    if (game.talents.t_assault_frenzy) {
      if (game._frenzyReady) {
        dmg = Math.floor(dmg * (1 + 0.25 * game.talents.t_assault_frenzy));
        game._frenzyReady = false;
        showToast("💥 Frénésie d'assaut !", 1000);
      }
      game._frenzyTapCount = (game._frenzyTapCount || 0) + 1;
      if (game._frenzyTapCount >= 20) {
        game._frenzyTapCount = 0;
        game._frenzyReady = true;
      }
    }

    this.dealDamage(dmg, isCrit, true);

    if (window.ClassCombatManager && typeof ClassCombatManager.onBasicAttackDealt === "function") {
      ClassCombatManager.onBasicAttackDealt(dmg, isCrit);
    }

    var totalCelerity = this.getTotalCelerity();
    game.basicAttackCooldownMs = (typeof computeEffectiveCooldownMs === "function")
      ? computeEffectiveCooldownMs(BASIC_ATTACK_BASE_COOLDOWN_MS, totalCelerity)
      : BASIC_ATTACK_BASE_COOLDOWN_MS;
    if (typeof renderBasicAttackCooldown === "function") renderBasicAttackCooldown();
  },

      autoAttack: function (dt) {
    if (!game.enemy || !window.EquipmentManager) return;

    var dps = EquipmentManager.effectiveAutoDps();
    if (dps <= 0) return;

    var damage = dps * Math.max(0, Number(dt || 0));
    if (damage <= 0) return;
    this.dealDamage(damage, false, false);
  },

    autoTap: function () {
    if (!game.enemy || !game.talents.t_auto_tap) return;
    if (game.activeTab !== "combat") return;
    if ((game.basicAttackCooldownMs || 0) > 0) return;
    this.playerAttack();
  },

    enemyAttackTick: function (dt) {
    if (!game.enemy || !game.enemy.stats) return;

    var celerity = Number(game.enemy.stats.celerity || 0);
    var interval = ENEMY_ATTACK_BASE_INTERVAL / (1 + celerity / 40);

    game._enemyAttackTimer = Number(game._enemyAttackTimer || 0) + Math.max(0, Number(dt || 0));

    var guard = 0;
    while (game._enemyAttackTimer >= interval && guard < 10) {
      game._enemyAttackTimer -= interval;
      this.enemyStrike();
      guard++;
    }
  },

    enemyChargeTick: function (dt) {
    if (!game.enemy || !game.enemy.stats || game.enemy.isBoss) return;
    if (game.enemy.archetype === "silenced") return;
    if ((game.heroHp || 0) <= 0) return;

    if (game.enemy.chargeTelegraphUntil) {
      if (Date.now() >= game.enemy.chargeTelegraphUntil) {
        this.resolveEnemyCharge();
      }
      return;
    }

    if (!game.enemy._chargeNextAt) {
      game.enemy._chargeNextAt = randFloat(ENEMY_CHARGE_MIN_INTERVAL_S, ENEMY_CHARGE_MAX_INTERVAL_S);
    }
    game.enemy._chargeTimer = Number(game.enemy._chargeTimer || 0) + Math.max(0, Number(dt || 0));

    if (game.enemy._chargeTimer >= game.enemy._chargeNextAt) {
      game.enemy._chargeTimer = 0;
      game.enemy._chargeNextAt = 0;
      game.enemy.chargeTelegraphUntil = Date.now() + ENEMY_CHARGE_TELEGRAPH_MS;

      addLog("⚠️ " + game.enemy.name + " prépare une charge !", "event");
      showToast("⚠️ Charge imminente !", 1200);
      if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();

      if (window.CombatReportManager) {
        getConfiguredCounterSlotsForCondition("chargeIncoming").forEach(function (s) {
          CombatReportManager.logTelegraphSeen(s);
        });
      }
    }
  },

    resolveEnemyCharge: function () {
    if (!game.enemy) return;

    if (window.CombatReportManager) {
      getConfiguredCounterSlotsForCondition("chargeIncoming").forEach(function (s) {
        CombatReportManager.logCounterExpired(s);
      });
    }

    game.enemy.chargeTelegraphUntil = 0;
    game.enemy._chargeNextAt = randFloat(ENEMY_CHARGE_MIN_INTERVAL_S, ENEMY_CHARGE_MAX_INTERVAL_S);

    this.enemyStrike(ENEMY_CHARGE_DMG_MULT);

    if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
  },

    enemySilenceTick: function (dt) {
    if (!game.enemy || !game.enemy.stats || game.enemy.archetype !== "silenced") return;
    if ((game.heroHp || 0) <= 0) return;

    if (game.enemy.silenceTelegraphUntil) {
      if (Date.now() >= game.enemy.silenceTelegraphUntil) {
        this.resolveSilenceCast();
      }
      return;
    }

    if (!game.enemy._silenceNextAt) {
      game.enemy._silenceNextAt = randFloat(ENEMY_CHARGE_MIN_INTERVAL_S, ENEMY_CHARGE_MAX_INTERVAL_S);
    }
    game.enemy._silenceTimer = Number(game.enemy._silenceTimer || 0) + Math.max(0, Number(dt || 0));

    if (game.enemy._silenceTimer >= game.enemy._silenceNextAt) {
      game.enemy._silenceTimer = 0;
      game.enemy._silenceNextAt = 0;
      game.enemy.silenceTelegraphUntil = Date.now() + ENEMY_CHARGE_TELEGRAPH_MS;

      addLog("🔇 " + game.enemy.name + " se prépare à te réduire au silence !", "event");
      showToast("🔇 Silence imminent !", 1200);
      if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();

      if (window.CombatReportManager) {
        getConfiguredCounterSlotsForCondition("enemySilenceIncoming").forEach(function (s) {
          CombatReportManager.logTelegraphSeen(s);
        });
      }
    }
  },

    resolveSilenceCast: function () {
    if (!game.enemy) return;

    if (window.CombatReportManager) {
      getConfiguredCounterSlotsForCondition("enemySilenceIncoming").forEach(function (s) {
        CombatReportManager.logCounterExpired(s);
      });
    }

    game.enemy.silenceTelegraphUntil = 0;
    game.enemy._silenceNextAt = randFloat(ENEMY_CHARGE_MIN_INTERVAL_S, ENEMY_CHARGE_MAX_INTERVAL_S);

    var durationMs = (typeof SILENCE_DURATION_MS === "number") ? SILENCE_DURATION_MS : 4000;
    game.silencedUntil = Date.now() + durationMs;

    addLog("🔇 Tu es réduit au silence ! Tes techniques sont bloquées un instant.", "event");
    showToast("🔇 Silencié !", 1400);
    if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
    if (typeof renderClassSkillButtons === "function") renderClassSkillButtons();
  },

    bossPatternTick: function (dt) {
    if (!game.enemy || !game.enemy.stats || !game.enemy.isBoss) return;
    if ((game.heroHp || 0) <= 0) return;

    this.bossShieldTick(dt);
    this.bossHealTick(dt);
  },

    bossShieldTick: function (dt) {
    if (game.enemy.shieldTelegraphUntil) {
      if (Date.now() >= game.enemy.shieldTelegraphUntil) {
        this.resolveBossShield();
      }
      return;
    }

    if (!game.enemy._shieldNextAt) {
      game.enemy._shieldNextAt = randFloat(BOSS_SHIELD_MIN_INTERVAL_S, BOSS_SHIELD_MAX_INTERVAL_S);
    }
    game.enemy._shieldTimer = Number(game.enemy._shieldTimer || 0) + Math.max(0, Number(dt || 0));

    if (game.enemy._shieldTimer >= game.enemy._shieldNextAt) {
      game.enemy._shieldTimer = 0;
      game.enemy._shieldNextAt = 0;
      game.enemy.shieldTelegraphUntil = Date.now() + BOSS_SHIELD_TELEGRAPH_MS;

      addLog("🛡️ " + game.enemy.name + " invoque un bouclier !", "event");
      showToast("🛡️ Bouclier imminent !", 1200);
      if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();

      if (window.CombatReportManager) {
        getConfiguredCounterSlotsForCondition("shieldIncoming").forEach(function (s) {
          CombatReportManager.logTelegraphSeen(s);
        });
      }
    }
  },

    resolveBossShield: function () {
    if (!game.enemy) return;

    if (window.CombatReportManager) {
      getConfiguredCounterSlotsForCondition("shieldIncoming").forEach(function (s) {
        CombatReportManager.logCounterExpired(s);
      });
    }

    game.enemy.shieldTelegraphUntil = 0;
    game.enemy._shieldNextAt = randFloat(BOSS_SHIELD_MIN_INTERVAL_S, BOSS_SHIELD_MAX_INTERVAL_S);
    game.enemy.shieldActiveUntil = Date.now() + BOSS_SHIELD_DURATION_MS;

    addLog("🛡️ Le bouclier se referme !", "event");
    if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
  },

    bossHealTick: function (dt) {
    if (game.enemy.healTelegraphUntil) {
      if (Date.now() >= game.enemy.healTelegraphUntil) {
        this.resolveBossHeal();
      }
      return;
    }

    if (!game.enemy._healNextAt) {
      game.enemy._healNextAt = randFloat(BOSS_HEAL_MIN_INTERVAL_S, BOSS_HEAL_MAX_INTERVAL_S);
    }
    game.enemy._healTimer = Number(game.enemy._healTimer || 0) + Math.max(0, Number(dt || 0));

    if (game.enemy._healTimer >= game.enemy._healNextAt) {
      game.enemy._healTimer = 0;
      game.enemy._healNextAt = 0;
      game.enemy.healTelegraphUntil = Date.now() + BOSS_HEAL_TELEGRAPH_MS;

      addLog("💚 " + game.enemy.name + " se prépare à se soigner !", "event");
      showToast("💚 Soin imminent !", 1200);
      if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();

      if (window.CombatReportManager) {
        getConfiguredCounterSlotsForCondition("healIncoming").forEach(function (s) {
          CombatReportManager.logTelegraphSeen(s);
        });
      }
    }
  },

    resolveBossHeal: function () {
    if (!game.enemy) return;

    if (window.CombatReportManager) {
      getConfiguredCounterSlotsForCondition("healIncoming").forEach(function (s) {
        CombatReportManager.logCounterExpired(s);
      });
    }

    game.enemy.healTelegraphUntil = 0;
    game.enemy._healNextAt = randFloat(BOSS_HEAL_MIN_INTERVAL_S, BOSS_HEAL_MAX_INTERVAL_S);

    var healAmount = Math.max(1, Math.floor(Number(game.enemy.hp || 0) * BOSS_HEAL_PERCENT));
    game.enemy.hp = Math.min(game.enemy.maxHp, game.enemy.hp + healAmount);

    addLog("💚 " + game.enemy.name + " récupère " + formatNumber(healAmount) + " PV !", "event");
    showToast("💚 +" + formatNumber(healAmount) + " PV boss", 1200);

    if (typeof renderEnemyHp === "function") renderEnemyHp();
    if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
  },

    enemyStrike: function (dmgMult) {
    if (!game.enemy || !game.enemy.stats) return;
    if ((game.heroHp || 0) <= 0) return;

    var power = Number(game.enemy.stats.power || 0);
    var precision = Number(game.enemy.stats.precision || 0);

    if (window.AfflictionManager && typeof AfflictionManager.getCombinedModifiers === "function") {
      power *= AfflictionManager.getCombinedModifiers().enemyPowerMult;
    }

    var dmg = Math.max(1, Math.floor(power * ENEMY_POWER_DMG_COEF));
    var patternMult = (typeof dmgMult === "number" && dmgMult > 0) ? dmgMult : 1;
    if (patternMult !== 1) dmg = Math.max(1, Math.floor(dmg * patternMult));

    if (game.enemy.archetype === "enraged" && typeof getEnragedDamageMultiplier === "function") {
      var effectivePct = this.getEnragedEffectivePctHpLost();
      var enragedMult = getEnragedDamageMultiplier(effectivePct);
      if (enragedMult !== 1) {
        var preEnragedDmg = dmg;
        dmg = Math.max(1, Math.floor(dmg * enragedMult));
        if (window.CombatReportManager) CombatReportManager.logArchetypeImpact("enragedBonusDamageTaken", dmg - preEnragedDmg);
      }
    }

    var isCrit = chance(Math.min(40, precision * ENEMY_PRECISION_CRIT_COEF));
    if (isCrit) dmg = Math.floor(dmg * ENEMY_CRIT_MULT);

    var activeDefense = window.ClassCombatManager && typeof ClassCombatManager.getActiveDefenseEffect === "function"
      ? ClassCombatManager.getActiveDefenseEffect()
      : null;
    var defenseCapNow = activeDefense ? 0.85 : 0.6;
    var defense = Math.min(defenseCapNow, Number(game.heroDefensePct || 0));
    dmg = Math.max(1, Math.floor(dmg * (1 - defense)));

    if (activeDefense) {
      if (activeDefense.effectType === "damageReduction" || activeDefense.effectType === "damageAbsorption") {
        dmg = Math.max(0, Math.floor(dmg * (1 - activeDefense.value)));
      } else if (activeDefense.effectType === "evasion") {
        if (chance(activeDefense.value * 100)) dmg = 0;
      }
    }

    game.heroHp = Math.max(0, Number(game.heroHp != null ? game.heroHp : game.heroMaxHp || 1) - dmg);

    if (game.enemy.archetype === "vampiric" && dmg > 0 && typeof getVampiricLifestealAmount === "function") {
      var lifestealSuppressed = !!(game.enemy.vampiricSuppressedUntil && Date.now() < game.enemy.vampiricSuppressedUntil);
      if (!lifestealSuppressed) {
        var healed = getVampiricLifestealAmount(dmg);
        if (healed > 0) {
          game.enemy.hp = Math.min(game.enemy.maxHp, Number(game.enemy.hp || 0) + healed);
          if (window.CombatReportManager) CombatReportManager.logArchetypeImpact("vampiricHealStolen", healed);
          if (typeof renderEnemyHp === "function") renderEnemyHp();
        }
      }
    }

    if (game.enemy.archetype === "corrupted") {
      game.enemy.corruptedStacks = Math.min(
        (typeof CORRUPTED_MAX_STACKS === "number" ? CORRUPTED_MAX_STACKS : 5),
        Number(game.enemy.corruptedStacks || 0) + 1
      );
      if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
    }

    showDamageTakenPopup(dmg);

    if (typeof renderHeroHp === "function") renderHeroHp();

    if (game.heroHp <= 0) this.onHeroDefeated();
  },

    onHeroDefeated: function () {
    if (window.DungeonManager && game.dungeonRun && game.dungeonRun.active) {
      DungeonManager.onDefeat();
      return;
    }

    if (window.AdventureQuestManager && game.adventureQuestRun && game.adventureQuestRun.active) {
      AdventureQuestManager.onDefeat();
      return;
    }

    if (window.HuntQuestManager && game.huntRun && game.huntRun.active) {
      HuntQuestManager.onDefeat();
      return;
    }

    var talentPenaltyReduction = (game.talents && game.talents.t_essence_bloom) ? game.talents.t_essence_bloom * 0.10 : 0;
    var effectivePenaltyPct = DEFEAT_GOLD_PENALTY * Math.max(0, 1 - talentPenaltyReduction);
    var lost = Math.floor((game.gold || 0) * effectivePenaltyPct);
    game.gold = Math.max(0, game.gold - lost);
    game.heroHp = 0;

    if (typeof openCombatReport === "function") openCombatReport("defeat", game.enemy ? game.enemy.name : null);

    if (window.WorldManager && typeof WorldManager.resetToCycleStart === "function") {
      WorldManager.resetToCycleStart();
      if (typeof WorldManager.applyWorldTheme === "function") WorldManager.applyWorldTheme();
      if (typeof WorldManager.generateEnemy === "function") {
        game.enemy = WorldManager.generateEnemy();
      }
    }

    addLog("💀 Vous avez été terrassé ! -" + formatNumber(lost) + " or. Il faut te reposer avant de repartir au combat.", "event");
    showToast("💀 Terrassé ! -" + formatNumber(lost) + " or", 1800);
    vibrate([80, 40, 80]);

    game.justDied = true;
    if (typeof switchTab === "function") switchTab("campement");

    if (typeof renderHeroHp === "function") renderHeroHp();
    if (typeof renderHud === "function") renderHud();
    saveGame();
  },

      dealDamage: function (dmg, isCrit, fromTap, ignoreAffinity) {
    if (!game.enemy) return;

    dmg = Math.max(0, Number(dmg || 0));
    if (!ignoreAffinity) dmg *= getDamageAffinity().mult;

    if (game.enemy.archetype === "corrupted" && typeof getCorruptedDamageMultiplier === "function") {
      var preCorruptedDmg = dmg;
      dmg *= getCorruptedDamageMultiplier(game.enemy.corruptedStacks || 0);
      if (window.CombatReportManager) CombatReportManager.logArchetypeImpact("corruptedDamageLost", preCorruptedDmg - dmg);
    }

    if (game.enemy.vulnerableUntil && Date.now() < game.enemy.vulnerableUntil) {
      dmg *= (1 + Number(game.enemy.vulnerableMult || 0));
    }

    if (game.enemy.isBoss && game.enemy.shieldActiveUntil && Date.now() < game.enemy.shieldActiveUntil) {
      dmg *= (1 - BOSS_SHIELD_REDUCTION);
    }

    if (game.enemy.archetype === "armored" && typeof getArmoredEffectiveDamageReduction === "function") {
      var preArmoredDmg = dmg;
      dmg *= (1 - getArmoredEffectiveDamageReduction(game.enemy));
      if (window.CombatReportManager) CombatReportManager.logArchetypeImpact("armoredDamageLost", preArmoredDmg - dmg);
    }

    if (game.enemy.isBoss && game.talents.t_perfect_execution && game.enemy.maxHp > 0 && (game.enemy.hp / game.enemy.maxHp) < 0.2) {
      dmg *= (1 + 0.15 * game.talents.t_perfect_execution);
    }

    game.enemy.hp -= dmg;
    game.totalDamageDealt += dmg;
    if (window.CombatReportManager) CombatReportManager.logDamageDealt(dmg);

    if (fromTap) {
      showFloatingDamage(Math.floor(dmg), !!isCrit);
      vibrate(isCrit ? 30 : 10);
    }

    if (game.enemy.hp <= 0) this.killEnemy();
    else if (typeof renderEnemyHp === "function") renderEnemyHp();
  },

    killEnemy: function () {
    if (!game.enemy) return;

    if (window.HuntQuestManager && game.huntRun && game.huntRun.active) {
      game.totalKills += 1;
      game.killCounts[game.enemy.id] = (game.killCounts[game.enemy.id] || 0) + 1;
      HuntQuestManager.onEnemyKilled();
      if (typeof renderAll === "function") renderAll();
      saveGame();
      return;
    }

    var enemy = game.enemy;
    var goldGain = Number(enemy.goldReward || 0);
    var essenceGain = Number(enemy.essenceReward || 0);

    if (window.EquipmentManager && typeof EquipmentManager.effectiveGoldMult === "function") {
      goldGain = Math.floor(goldGain * EquipmentManager.effectiveGoldMult());
    }

    if (enemy.isBoss) {
      goldGain = Math.floor(goldGain * (1 + Number(game.bossGoldBonusPct || 0)));
    }

    essenceGain = Math.ceil(essenceGain * Math.max(1, Number(game.essenceGlobalMult || 1)));

    if (enemy.isBoss) {
      var aetherBonuses = getAetherBonuses();
      essenceGain += aetherBonuses.essenceBonus || 0;

      if (game.bossEssenceBonusPct) {
        essenceGain = Math.ceil(essenceGain * (1 + Number(game.bossEssenceBonusPct || 0)));
      }
    }

    var currentWorld = (window.WORLDS && window.WorldManager) ? WORLDS[WorldManager.worldIndex] : null;

    var merchantBonusGold = 0;
    if (game.talents.t_merchant_instinct && chance(5 * game.talents.t_merchant_instinct)) {
      merchantBonusGold = Math.floor(goldGain * 0.5);
      goldGain += merchantBonusGold;
    }

    game.gold += goldGain;
    game.essence += essenceGain;
    game.totalGoldEarned += goldGain;
    game.totalKills += 1;
    game.killCounts[enemy.id] = (game.killCounts[enemy.id] || 0) + 1;

    if (window.QuestManager && typeof QuestManager.track === "function") {
      QuestManager.track("kills", 1);
      QuestManager.track("goldEarned", goldGain);
      if (enemy.isBoss) QuestManager.track("bossKills", 1);

      var masteryType = typeof getPlayerDamageType === "function" ? getPlayerDamageType() : null;
      if (masteryType === "sword") QuestManager.track("swordKills", 1);
      else if (masteryType === "bow") QuestManager.track("bowKills", 1);
      else if (masteryType === "magic") QuestManager.track("magicKills", 1);
    }

    showGoldPopup(goldGain);
    addLog((enemy.isBoss ? "👑 Boss vaincu : " : "⚔️ Ennemi vaincu : ") + enemy.name + " (+" + formatNumber(goldGain) + " or)", enemy.isBoss ? "boss" : "normal");
    if (merchantBonusGold > 0) {
      addLog("📜 Instinct marchand : bonus de +" + formatNumber(merchantBonusGold) + " or", "event");
    }

    if (enemy.isBoss) {
      vibrate([50, 30, 50, 30, 100]);

      var bestiaryBonus = typeof getBestiaryBonus === "function" ? getBestiaryBonus(enemy.id) : { lootBonus: 0 };
      var lootChance = 50 + (getAetherBonuses().lootBonus || 0) + (bestiaryBonus.lootBonus || 0);
      if (window.AfflictionManager && typeof AfflictionManager.getCombinedModifiers === "function") {
        lootChance *= AfflictionManager.getCombinedModifiers().lootChanceMult;
      }
      var rolls = 1;
      if (game.talents.t_astral_prospecting && chance(5 * game.talents.t_astral_prospecting)) rolls = 2;

      for (var r = 0; r < rolls; r++) {
        if (window.LootSystem && typeof LootSystem.rollDrop === "function" && chance(lootChance)) {
          var drop = LootSystem.rollDrop();
          if (drop && addDropToInventory(drop)) {
            addLog("🎁 Objet trouvé : " + drop.name + " (" + drop.rarity + ")", "event");
            showToast("🎁 " + drop.name, 1800);
          }
        }
      }
    } else if (chance(8)) {
      this.triggerRandomEvent();
    }

    saveEquipBagScroll();

    if (window.DungeonManager && game.dungeonRun && game.dungeonRun.active) {
      var dungeonXpBonus = game.cycleCount || 0;
      var dungeonXpGain = enemy.isBoss ? (3 + dungeonXpBonus * 0.5) : (1 + dungeonXpBonus * 0.1);
      if (typeof grantHeroXp === "function") grantHeroXp(dungeonXpGain, enemy.isBoss ? "boss" : "enemy");

      DungeonManager.onEnemyKilled();
      if (typeof renderAll === "function") renderAll();
      restoreEquipBagScroll();
      saveGame();
      return;
    }

    if (window.AdventureQuestManager && game.adventureQuestRun && game.adventureQuestRun.active) {
      AdventureQuestManager.onEnemyKilled(enemy);
      if (typeof renderAll === "function") renderAll();
      restoreEquipBagScroll();
      saveGame();
      return;
    }

    if (window.WorldQuestManager && currentWorld) {
      if (enemy.isBoss) WorldQuestManager.trackBossKill(enemy.id);
      else WorldQuestManager.trackKill(currentWorld.id);
    }

    var result = null;
    if (window.WorldManager && typeof WorldManager.advance === "function") result = WorldManager.advance();

    if (result && result.type === "adventure" && result.adventure) {
      addLog("Nouveau chapitre : " + result.adventure.name, "zone");
      showToast(result.adventure.name, 1800);
    } else if (result && result.type === "world" && result.world) {
      addLog("Nouveau monde débloqué : " + result.world.name, "zone");
      showToast(result.world.name, 2200);

      if (window.WorldManager && typeof isGrimoireWorldUnlockMilestone === "function"
        && isGrimoireWorldUnlockMilestone(WorldManager.worldIndex)) {
        addLog("📖 Une nouvelle règle de Grimoire est disponible !", "event");
        showToast("📖 Nouvelle règle de Grimoire débloquée !", 2200);
      }
    } else if (result && result.type === "cycle") {
      addLog("Le cycle recommence, les ennemis deviennent plus forts.", "zone");
      if (typeof openCycleSummary === "function") openCycleSummary();
    } else if (result && result.type === "locked") {
      addLog("🔒 " + result.world.name + " est verrouillé (questline de déblocage incomplète, voir Carte). Le cycle recommence.", "zone");
      showToast("🔒 Termine la questline pour débloquer " + result.world.name, 2200);
      if (typeof openCycleSummary === "function") openCycleSummary(result.world);
    } else if (result && result.type === "adventure_locked") {
      addLog("🧭 Une quête d'Expédition attend d'être lancée pour explorer plus loin (voir l'onglet Quêtes).", "zone");
      showToast("🧭 Lance la quête d'Expédition (onglet Quêtes) pour continuer", 2200);
    }

    if (result && (result.type === "adventure" || result.type === "world")) {
      var chapterGold = Math.floor(20 + (WorldManager.worldIndex || 0) * 15);
      var chapterEssence = 2 + (WorldManager.worldIndex || 0);

      if (game.talents.t_deep_pockets) {
        chapterGold = Math.floor(chapterGold * (1 + 0.10 * game.talents.t_deep_pockets));
      }

      game.gold += chapterGold;
      game.essence += chapterEssence;
      game.totalGoldEarned += chapterGold;
      addLog("🎉 Récompense de chapitre : +" + formatNumber(chapterGold) + " or, +" + chapterEssence + " essence", "event");
    }

    var cycleXpBonus = game.cycleCount || 0;
    var xpGain = enemy.isBoss ? (3 + cycleXpBonus * 0.5) : (1 + cycleXpBonus * 0.1);

    if (typeof grantHeroXp === "function") {
      grantHeroXp(xpGain, enemy.isBoss ? "boss" : "enemy");
    }

    this.spawnEnemy();
    if (typeof renderAll === "function") renderAll();
    restoreEquipBagScroll();
    saveGame();
  },

    triggerRandomEvent: function () {
    var events = [
      function () {
        var bonus = randInt(10, 50);
        if (game.talents.t_deep_pockets) bonus = Math.floor(bonus * (1 + 0.10 * game.talents.t_deep_pockets));
        game.gold += bonus;
        game.totalGoldEarned += bonus;
        addLog("💰 Trésor trouvé ! +" + bonus + " or", "event");
        showToast("💰 +" + bonus + " or", 1400);
        if (window.QuestManager && typeof QuestManager.track === "function") {
          QuestManager.track("treasures", 1 + (game.talents.t_treasure_hunter || 0));
          QuestManager.track("goldEarned", bonus);
        }
      },
      function () {
        var bonus = randInt(1, 3);
        game.essence += bonus;
        addLog("🔮 Fontaine d'essence ! +" + bonus + " essence", "event");
        showToast("🔮 +" + bonus + " essence", 1400);
      },
      function () {
        var bonus = Math.floor(game.gold * 0.05);
        if (bonus > 0) {
          game.gold += bonus;
          game.totalGoldEarned += bonus;
          addLog("✨ Bénédiction ! +" + formatNumber(bonus) + " or", "event");
          showToast("✨ +" + formatNumber(bonus) + " or", 1400);
          if (window.QuestManager && typeof QuestManager.track === "function") {
            QuestManager.track("goldEarned", bonus);
          }
        }
      },
      function () {
        if (typeof AMBIANCE_TEXTS !== "undefined" && AMBIANCE_TEXTS.length) {
          addLog(AMBIANCE_TEXTS[randInt(0, AMBIANCE_TEXTS.length - 1)], "event");
        }
      }
    ];

    events[randInt(0, events.length - 1)]();
  }
};

function playerAttack() { CombatEngine.requestPlayerAttack(); }
function autoAttack() { CombatEngine.autoAttack(0.1); }
function autoTap() { CombatEngine.autoTap(); }

window.CombatEngine = CombatEngine;
window.playerAttack = playerAttack;
window.autoAttack = autoAttack;
window.autoTap = autoTap;
window.showFloatingDamage = showFloatingDamage;
window.showGoldPopup = showGoldPopup;
window.showCounterSuccessPopup = showCounterSuccessPopup;
window.getDamageAffinity = getDamageAffinity;
window.getPlayerDamageType = getPlayerDamageType;
window.getEnemyWillCritPenalty = getEnemyWillCritPenalty;
window.getConfiguredCounterSlotsForCondition = getConfiguredCounterSlotsForCondition;
