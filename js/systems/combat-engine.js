"use strict";

var autoTapInterval = null;

/* ============================================================
Quest Idle — systems/combat-engine.js
Combat loop actions, enemy deaths, random events, visual popups
============================================================ */

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
    if (typeof WorldManager.applyWorldTheme === "function") WorldManager.applyWorldTheme();
    if (typeof renderEnemy === "function") renderEnemy();
    if (typeof renderHud === "function") renderHud();
  },

  playerAttack: function () {
    if (!game.enemy || !window.EquipmentManager) return;

    var dmg = Math.max(1, Math.floor(EquipmentManager.effectiveTapDamage()));
    var isCrit = chance(EquipmentManager.effectiveCritChance());

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

  dealDamage: function (dmg, isCrit, fromTap) {
    if (!game.enemy) return;

    dmg = Math.max(0, Number(dmg || 0));
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

    if (game.talents.t_double_gold) goldGain *= 2;
    if (game.talents.t_essence_boost) essenceGain = Math.ceil(essenceGain * 1.5);
    if (enemy.isBoss) {
      var aetherBonuses = getAetherBonuses();
      essenceGain += aetherBonuses.essenceBonus || 0;
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
    }

    showGoldPopup(goldGain);
    addLog((enemy.isBoss ? "👑 Boss vaincu : " : "⚔️ Ennemi vaincu : ") + enemy.name + " (+" + formatNumber(goldGain) + " or)", enemy.isBoss ? "boss" : "normal");

    if (enemy.isBoss) {
      vibrate([50, 30, 50, 30, 100]);

      var lootChance = 50 + (getAetherBonuses().lootBonus || 0);
      if (window.LootSystem && typeof LootSystem.rollDrop === "function" && chance(lootChance)) {
        var drop = LootSystem.rollDrop();
        if (drop) {
          game.inventory.push(drop);
          addLog("🎁 Objet trouvé : " + drop.name + " (" + drop.rarity + ")", "event");
          showToast("🎁 " + drop.name, 1800);
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
        game.gold += bonus;
        game.totalGoldEarned += bonus;
        addLog("💰 Trésor trouvé ! +" + bonus + " or", "event");
        showToast("💰 +" + bonus + " or", 1400);
        if (window.QuestManager && typeof QuestManager.track === "function") {
          QuestManager.track("treasures", 1);
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
