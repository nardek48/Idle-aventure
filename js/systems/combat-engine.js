"use strict";

var autoTapInterval = null;

/* ============================================================
Quest Idle — systems/combat-engine.js
Combat loop actions, enemy deaths, random events, visual popups
============================================================ */

/* Mappe l'icône d'arme équipée vers un type de dégâts (aligné sur
   resists/weak des ennemis, qui utilisent "sword" / "bow" / "magic"). */
var WEAPON_ICON_DAMAGE_TYPE = {
  sword: "sword",
  axe: "sword",
  staff: "magic",
  bow: "bow"
};

var RESIST_DMG_MULT = 0.7;   // Ennemi résistant au type d'arme -> -30% de dégâts infligés
var WEAK_DMG_MULT = 1.3;     // Ennemi faible au type d'arme -> +30% de dégâts infligés
var NO_WEAPON_MULT = 0.8;    // Aucune arme équipée -> -20% de dégâts infligés

function getPlayerDamageType() {
  var weapon = game.equipped && game.equipped.weapon;
  if (!weapon || !weapon.icon) return null;
  return WEAPON_ICON_DAMAGE_TYPE[weapon.icon] || null;
}

/* Retourne l'affinité de dégâts courante face à l'ennemi affiché.
   status: "resist" | "weak" | "unarmed" | "neutral". */
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

/* ============================================================
   v1.8.5 — Riposte ennemie (power/celerity/precision) et
   résistance ennemie au critique (will).
============================================================ */
var ENEMY_ATTACK_BASE_INTERVAL = 3;    // secondes entre deux attaques ennemies à célérité neutre
var ENEMY_POWER_DMG_COEF = 0.5;        // dégâts de riposte = power ennemi * ce coefficient
var ENEMY_PRECISION_CRIT_COEF = 0.3;   // % de chance de coup critique ennemi par point de précision
var ENEMY_CRIT_MULT = 1.5;             // multiplicateur sur un coup critique ennemi
var WILL_CRIT_RESIST_COEF = 0.05;      // réduction de la chance de critique du joueur par point de volonté ennemie
var DEFEAT_GOLD_PENALTY = 0.10;        // % d'or perdu quand le héros tombe à 0 PV

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

var CombatEngine = {
  spawnEnemy: function () {
    if (!window.WorldManager || typeof WorldManager.generateEnemy !== "function") return;

    game.enemy = WorldManager.generateEnemy();
    game._enemyAttackTimer = 0;
    if (typeof WorldManager.applyWorldTheme === "function") WorldManager.applyWorldTheme();
    if (typeof renderEnemy === "function") renderEnemy();
    if (typeof renderHud === "function") renderHud();
  },

  playerAttack: function () {
    if (!game.enemy || !window.EquipmentManager) return;

    var dmg = Math.max(1, Math.floor(EquipmentManager.effectiveTapDamage()));
    var critChance = Math.max(0, EquipmentManager.effectiveCritChance() - getEnemyWillCritPenalty());
    var isCrit = chance(critChance);

    if (isCrit) {
      dmg = Math.floor(dmg * EquipmentManager.effectiveCritMult());
      if (window.QuestManager && typeof QuestManager.track === "function") QuestManager.track("crits", 1);
    }

    if (game.talents.t_sharpened_blades) dmg = Math.floor(dmg * 1.10);
    if (game.enemy.isBoss && game.talents.t_war_instinct) dmg = Math.floor(dmg * 1.05);
    if (game.enemy.isBoss && game.talents.t_boss_slayer) dmg = Math.floor(dmg * 1.20);
    if (game.talents.t_bloodlust) {
      var ascBonus = Math.min(5 * (game.ascensionCount || 0), 25);
      dmg = Math.floor(dmg * (1 + ascBonus / 100));
    }

    if (game.talents.t_assault_frenzy) {
      if (game._frenzyReady) {
        dmg = Math.floor(dmg * 1.25);
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
    this.playerAttack();
  },

  /* v1.8.5 : riposte ennemie, cadencée par la célérité de l'ennemi affiché. */
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

  enemyStrike: function () {
    if (!game.enemy || !game.enemy.stats) return;

    var power = Number(game.enemy.stats.power || 0);
    var precision = Number(game.enemy.stats.precision || 0);

    var dmg = Math.max(1, Math.floor(power * ENEMY_POWER_DMG_COEF));
    var isCrit = chance(Math.min(40, precision * ENEMY_PRECISION_CRIT_COEF));
    if (isCrit) dmg = Math.floor(dmg * ENEMY_CRIT_MULT);

    var defense = Math.min(0.6, Number(game.heroDefensePct || 0));
    dmg = Math.max(1, Math.floor(dmg * (1 - defense)));

    game.heroHp = Math.max(0, Number(game.heroHp != null ? game.heroHp : game.heroMaxHp || 1) - dmg);

    if (typeof renderHeroHp === "function") renderHeroHp();

    if (game.heroHp <= 0) this.onHeroDefeated();
  },

  onHeroDefeated: function () {
    var lost = Math.floor((game.gold || 0) * DEFEAT_GOLD_PENALTY);
    game.gold = Math.max(0, game.gold - lost);
    game.heroHp = game.heroMaxHp || 1;

    addLog("💀 Vous avez été terrassé ! -" + formatNumber(lost) + " or, PV restaurés.", "event");
    showToast("💀 Terrassé ! -" + formatNumber(lost) + " or", 1800);
    vibrate([80, 40, 80]);

    if (typeof renderHeroHp === "function") renderHeroHp();
    if (typeof renderHud === "function") renderHud();
    saveGame();
  },

  dealDamage: function (dmg, isCrit, fromTap) {
    if (!game.enemy) return;

    dmg = Math.max(0, Number(dmg || 0));
    dmg *= getDamageAffinity().mult;

    if (game.enemy.isBoss && game.talents.t_perfect_execution && game.enemy.maxHp > 0 && (game.enemy.hp / game.enemy.maxHp) < 0.2) {
      dmg *= 1.15;
    }

    game.enemy.hp -= dmg;
    game.totalDamageDealt += dmg;

    if (fromTap) {
      showFloatingDamage(Math.floor(dmg), !!isCrit);
      vibrate(isCrit ? 30 : 10);
    }

    if (game.enemy.hp <= 0) this.killEnemy();
    else if (typeof renderEnemyHp === "function") renderEnemyHp();
  },

  killEnemy: function () {
    if (!game.enemy) return;

    var enemy = game.enemy;
    var goldGain = Number(enemy.goldReward || 0);
    var essenceGain = Number(enemy.essenceReward || 0);

    if (window.EquipmentManager && typeof EquipmentManager.effectiveGoldMult === "function") {
      goldGain = Math.floor(goldGain * EquipmentManager.effectiveGoldMult());
    }

    essenceGain = Math.ceil(essenceGain * Math.max(1, Number(game.essenceGlobalMult || 1)));

    if (enemy.isBoss) {
      var aetherBonuses = getAetherBonuses();
      essenceGain += aetherBonuses.essenceBonus || 0;

      if (game.talents.t_thick_skin) essenceGain = Math.ceil(essenceGain * 1.05);
      if (game.talents.t_vital_anchor) essenceGain = Math.ceil(essenceGain * 1.12);
    }

    // Volonté tenace : +10% or/essence dans les mondes verrouillés (nécessitant une ascension)
    var currentWorld = (window.WORLDS && window.WorldManager) ? WORLDS[WorldManager.worldIndex] : null;
    var isDifficultWorld = !!(currentWorld && (currentWorld.requiredAscension || 0) > 0);
    if (game.talents.t_tenacious_will && isDifficultWorld) {
      goldGain = Math.floor(goldGain * 1.10);
      essenceGain = Math.ceil(essenceGain * 1.10);
    }

    // Instinct marchand : petite chance de récompense bonus
    var merchantBonusGold = 0;
    if (game.talents.t_merchant_instinct && chance(15)) {
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
      var rolls = 1;
      // Prospection astrale : petite chance de doubler le butin gagné
      if (game.talents.t_astral_prospecting && chance(15)) rolls = 2;

      for (var r = 0; r < rolls; r++) {
        if (window.LootSystem && typeof LootSystem.rollDrop === "function" && chance(lootChance)) {
          var drop = LootSystem.rollDrop();
          if (drop) {
            game.inventory.push(drop);
            addLog("🎁 Objet trouvé : " + drop.name + " (" + drop.rarity + ")", "event");
            showToast("🎁 " + drop.name, 1800);
          }
        }
      }
    } else if (chance(8)) {
      this.triggerRandomEvent();
    }

    saveEquipBagScroll();
    var result = null;
    if (window.WorldManager && typeof WorldManager.advance === "function") result = WorldManager.advance();

    if (result && result.type === "adventure" && result.adventure) {
      addLog("Nouveau chapitre : " + result.adventure.name, "zone");
      showToast(result.adventure.name, 1800);
    } else if (result && result.type === "world" && result.world) {
      addLog("Nouveau monde débloqué : " + result.world.name, "zone");
      showToast(result.world.name, 2200);
    } else if (result && result.type === "cycle") {
      addLog("Le cycle recommence, les ennemis deviennent plus forts.", "zone");
    } else if (result && result.type === "locked") {
      addLog("🔒 " + result.world.name + " est verrouillé (" + result.world.requiredAscension + " ascension(s) requise(s)). Le cycle recommence.", "zone");
      showToast("🔒 Ascensionne pour débloquer " + result.world.name, 2200);
    }

    // Second souffle / Bourse profonde : récompense de fin de chapitre
    if (result && (result.type === "adventure" || result.type === "world")) {
      var chapterGold = Math.floor(20 + (WorldManager.worldIndex || 0) * 15);
      var chapterEssence = 2 + (WorldManager.worldIndex || 0);

      if (game.talents.t_second_wind) {
        chapterGold = Math.floor(chapterGold * 1.08);
        chapterEssence = Math.ceil(chapterEssence * 1.08);
      }
      if (game.talents.t_deep_pockets) {
        chapterGold = Math.floor(chapterGold * 1.10);
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
        if (game.talents.t_deep_pockets) bonus = Math.floor(bonus * 1.10);
        game.gold += bonus;
        game.totalGoldEarned += bonus;
        addLog("💰 Trésor trouvé ! +" + bonus + " or", "event");
        showToast("💰 +" + bonus + " or", 1400);
        if (window.QuestManager && typeof QuestManager.track === "function") {
          QuestManager.track("treasures", game.talents.t_treasure_hunter ? 2 : 1);
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

function playerAttack() { CombatEngine.playerAttack(); }
function autoAttack() { CombatEngine.autoAttack(0.1); }
function autoTap() { CombatEngine.autoTap(); }

window.CombatEngine = CombatEngine;
window.playerAttack = playerAttack;
window.autoAttack = autoAttack;
window.autoTap = autoTap;
window.showFloatingDamage = showFloatingDamage;
window.showGoldPopup = showGoldPopup;
window.getDamageAffinity = getDamageAffinity;
window.getPlayerDamageType = getPlayerDamageType;
window.getEnemyWillCritPenalty = getEnemyWillCritPenalty;
