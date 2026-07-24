"use strict";
/* ============================================================
Quest Idle — main.js (version refaite)
Combat, achats, talents, ascension, boucle de jeu, initialisation
Dépend de : data.js, game-state.js, managers.js, ui.js, save.js
============================================================ */

var gameLog = window.gameLog || [];
var lastTick = Date.now();
var autoTapInterval = null;
var gameStarted = false;

function formatNumber(value) {
  var n = Number(value || 0);
  if (n >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
  if (n % 1 !== 0) return n.toFixed(1);
  return String(Math.floor(n));
}

function chance(percent) {
  return Math.random() * 100 < Number(percent || 0);
}

function randInt(min, max) {
  min = Math.ceil(Number(min || 0));
  max = Math.floor(Number(max || 0));
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max) {
  return Math.random() * (Number(max || 0) - Number(min || 0)) + Number(min || 0);
}

function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

function addLog(message, type) {
  gameLog.unshift({
    text: String(message || ""),
    type: type || "event",
    at: Date.now()
  });

  if (gameLog.length > 100) {
    gameLog.length = 100;
  }
}

function getUpgradeCost(upgrade) {
  if (!upgrade) return Infinity;
  var level = game.upgrades[upgrade.id] || 0;
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMult, level));
}

function getAllTalentNodes() {
  if (typeof TALENTTREE !== "undefined") return TALENTTREE;
  if (typeof TALENT_TREE !== "undefined") return TALENT_TREE;
  return {};
}

function buyUpgrade(id) {
  var upgrade = (UPGRADES || []).find(function (u) {
    return u.id === id;
  });

  if (!upgrade) {
    showToast("Amélioration introuvable", 1000);
    return;
  }

  var level = game.upgrades[id] || 0;

  if (level >= (upgrade.maxLevel || Infinity)) {
    showToast("Niveau maximum", 1200);
    return;
  }

  if ((WorldManager.worldIndex || 0) < (upgrade.unlockWorld || 0)) {
    showToast("Monde requis non débloqué", 1200);
    return;
  }

  var cost = getUpgradeCost(upgrade);
  if (game.gold < cost) {
    showToast("Pas assez d'or", 1000);
    return;
  }

  game.gold -= cost;
  game.upgrades[id] = level + 1;

  if (window.QuestManager && typeof QuestManager.track === "function") {
    QuestManager.track("goldSpent", cost);
  }

  if (typeof upgrade.apply === "function") {
    upgrade.apply(game.upgrades[id]);
  }

  if (window.EquipmentManager && typeof EquipmentManager.recalcStats === "function") {
    EquipmentManager.recalcStats();
  }

  addLog("Amélioration achetée : " + upgrade.name + " niv. " + game.upgrades[id], "event");
  showToast(upgrade.name, 1200);

  if (typeof renderAll === "function") renderAll();
  saveGame();
}

function buyTalentNode(id) {
  var tree = getAllTalentNodes();
  var node = null;

  Object.keys(tree).forEach(function (branch) {
    (tree[branch] || []).forEach(function (entry) {
      if (entry.id === id) node = entry;
    });
  });

  if (!node) {
    showToast("Talent introuvable", 1000);
    return;
  }

  if (game.talents[id]) {
    showToast("Talent déjà appris", 1000);
    return;
  }

  if (node.requires && !game.talents[node.requires]) {
    showToast("Talent précédent requis", 1200);
    return;
  }

  if ((game.talentPoints || 0) < 1) {
    showToast("Pas assez de points de talent", 1200);
    return;
  }

  game.talentPoints -= 1;
  game.talents[id] = true;

  if (window.EquipmentManager && typeof EquipmentManager.recalcStats === "function") {
    EquipmentManager.recalcStats();
  }

  syncAutoTapLoop();

  addLog("Talent débloqué : " + (node.name || id), "event");
  showToast((node.name || id) + " débloqué", 1500);
  vibrate([40, 20, 40]);

  if (typeof renderAll === "function") renderAll();
  saveGame();
}

function buyAetherUpgrade(id) {
  var upgrade = (AETHER_SHOP || []).find(function (u) {
    return u.id === id;
  });

  if (!upgrade) {
    showToast("Amélioration astrale introuvable", 1000);
    return;
  }

  var currentLevel = game.aetherUpgrades[id] || 0;
  if (currentLevel >= (upgrade.maxLevel || Infinity)) {
    showToast("Niveau maximum", 1200);
    return;
  }

  var cost = typeof getAetherUpgradeCost === "function"
    ? getAetherUpgradeCost(upgrade)
    : Math.floor(upgrade.baseCost * Math.pow(1.4, currentLevel));

  if (game.aether < cost) {
    showToast("Pas assez d'Aether", 1000);
    return;
  }

  game.aether -= cost;
  game.aetherUpgrades[id] = currentLevel + 1;

  if (window.EquipmentManager && typeof EquipmentManager.recalcStats === "function") {
    EquipmentManager.recalcStats();
  }

  addLog("Amélioration astrale : " + upgrade.name + " niv. " + game.aetherUpgrades[id], "event");
  showToast(upgrade.name, 1500);

  if (typeof renderAll === "function") renderAll();
  saveGame();
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

function getAetherUpgradeLevel(id) {
  return Number((game.aetherUpgrades && game.aetherUpgrades[id]) || 0);
}

function getAetherBonuses() {
  var levels = game.aetherUpgrades || {};

  return {
    tapBonus: (levels.a_tap || 0) * 0.10,
    goldBonus: (levels.a_gold || 0) * 0.10,
    lootBonus: (levels.a_loot || 0) * 3,
    essenceBonus: Math.floor((levels.a_essence || 0) / 2)
  };
}

function getAetherMult() {
  var bonus = getAetherBonuses();
  return {
    tap: 1 + (bonus.tapBonus || 0),
    gold: 1 + (bonus.goldBonus || 0),
    loot: bonus.lootBonus || 0,
    essence: bonus.essenceBonus || 0
  };
}

function getAetherUpgradeCost(upgrade) {
  var level = getAetherUpgradeLevel(upgrade.id);
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMult || 1.4, level));
}

var CombatEngine = {
  spawnEnemy: function () {
    if (!window.WorldManager || typeof WorldManager.generateEnemy !== "function") return;

    game.enemy = WorldManager.generateEnemy();

    if (typeof WorldManager.applyWorldTheme === "function") {
      WorldManager.applyWorldTheme();
    }

    if (typeof renderEnemy === "function") renderEnemy();
    if (typeof renderHud === "function") renderHud();
  },

  playerAttack: function () {
    if (!game.enemy || !window.EquipmentManager) return;

    var dmg = Math.max(1, Math.floor(EquipmentManager.effectiveTapDamage()));
    var isCrit = chance(EquipmentManager.effectiveCritChance());

    if (isCrit) {
      dmg = Math.floor(dmg * EquipmentManager.effectiveCritMult());
      if (window.QuestManager && typeof QuestManager.track === "function") {
        QuestManager.track("crits", 1);
      }
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

    if (game.enemy.hp <= 0) {
      this.killEnemy();
    } else if (typeof renderEnemyHp === "function") {
      renderEnemyHp();
    }
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
  addLog(
    (enemy.isBoss ? "👑 Boss vaincu : " : "⚔️ Ennemi vaincu : ") +
    enemy.name +
    " (+" + formatNumber(goldGain) + " or)",
    enemy.isBoss ? "boss" : "normal"
  );

  if (enemy.isBoss) {
    vibrate([50, 30, 50, 30, 100]);

    var lootChance = 50 + (getAetherBonuses().lootBonus || 0);
    if (window.EquipmentManager && typeof EquipmentManager.rollDrop === "function" && chance(lootChance)) {
      var drop = EquipmentManager.rollDrop();
      if (drop) {
        game.inventory.push(drop);
        addLog("🎁 Objet trouvé : " + drop.name + " (" + drop.rarity + ")", "event");
        showToast("🎁 " + drop.name, 1800);
      }
    }
  } else if (chance(8)) {
    this.triggerRandomEvent();
  }

  var result = null;
  if (window.WorldManager && typeof WorldManager.advance === "function") {
    result = WorldManager.advance();
  }

  if (result && result.type === "adventure" && result.adventure) {
    addLog("Nouveau chapitre : " + result.adventure.name, "zone");
    showToast(result.adventure.name, 1800);
  } else if (result && result.type === "world" && result.world) {
    addLog("Nouveau monde débloqué : " + result.world.name, "zone");
    showToast(result.world.name, 2200);
  } else if (result && result.type === "cycle") {
    addLog("Le cycle recommence, les ennemis deviennent plus forts.", "zone");
  }

  var xpGain = enemy.isBoss ? (10 + WorldManager.worldIndex * 3) : (2 + WorldManager.worldIndex);
  grantHeroXp(xpGain);

  this.spawnEnemy();

  if (typeof renderAll === "function") renderAll();
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

function grantHeroXp(amount) {
  amount = Math.max(0, Number(amount || 0));
  if (amount <= 0) return;

  game.heroXp += amount;

  while (game.heroXp >= game.heroXpToNext) {
    game.heroXp -= game.heroXpToNext;
    game.heroLevel += 1;
    game.talentPoints += 1;
    game.heroXpToNext = Math.floor(game.heroXpToNext * 1.25 + 5);

    addLog("Niveau du héros : " + game.heroLevel + " (+1 point de talent)", "event");
    showToast("Niveau " + game.heroLevel + " ! +1 point de talent", 1800);
    vibrate([30, 20, 30]);
  }
}

function playerAttack() {
  CombatEngine.playerAttack();
}

function autoAttack() {
  CombatEngine.autoAttack(0.1);
}

function autoTap() {
  CombatEngine.autoTap();
}

function sortInventoryByRarity() {
  if (!Array.isArray(game.inventory)) game.inventory = [];

  var order = typeof RARITY_ORDER !== "undefined"
    ? RARITY_ORDER
    : ["common", "rare", "epic", "legendary"];

  game.inventory.sort(function (a, b) {
    var ra = order.indexOf(a.rarity);
    var rb = order.indexOf(b.rarity);

    if (ra !== rb) return ra - rb;
    if ((a.slot || "") !== (b.slot || "")) {
      return String(a.slot || "").localeCompare(String(b.slot || ""));
    }

    return String(a.name || "").localeCompare(String(b.name || ""));
  });

  if (typeof renderPanel === "function") renderPanel();
  saveGame();
}

function sellInventoryByRarity(rarity) {
  var items = (game.inventory || []).filter(function (item) {
    return item.rarity === rarity;
  });

  if (!items.length) {
    showToast("Aucun objet à vendre", 1200);
    return;
  }

  var goldGain = items.reduce(function (sum, item) {
    if (item.rarity === "legendary") return sum + 1000;
    if (item.rarity === "epic") return sum + 200;
    if (item.rarity === "rare") return sum + 50;
    return sum + 10;
  }, 0);

  game.inventory = game.inventory.filter(function (item) {
    return item.rarity !== rarity;
  });

  game.gold += goldGain;
  game.totalGoldEarned += goldGain;

  if (window.QuestManager && typeof QuestManager.track === "function") {
    QuestManager.track("goldEarned", goldGain);
  }

  addLog(
    "🧹 Vente de " + items.length + " objets " + rarity + " pour +" + formatNumber(goldGain) + " or",
    "event"
  );
  showToast("Vente effectuée", 1200);

  if (typeof renderPanel === "function") renderPanel();
  if (typeof renderHud === "function") renderHud();
  saveGame();
}

function ascendNow() {
  if (typeof ASCENSION_CONFIG === "undefined") return;

  if ((WorldManager.worldIndex || 0) < (ASCENSION_CONFIG.minWorldToAscend || 0)) {
    showToast("Ascension non disponible", 1200);
    return;
  }

  var gain = typeof ASCENSION_CONFIG.computeGain === "function"
    ? ASCENSION_CONFIG.computeGain()
    : 0;

  if (game.talents.t_aether_broker) {
    gain = Math.floor(gain * 1.1);
  }

  if (gain <= 0) {
    showToast("Gain d'Aether insuffisant", 1200);
    return;
  }

  var doAscend = function () {
    game.aether = Number(game.aether || 0) + gain;
    game.ascensionCount = Number(game.ascensionCount || 0) + 1;

    addLog("Ascension accomplie : +" + gain + " Aether", "event");

    if (typeof hardResetState === "function") {
      hardResetState();
    } else {
      var keptAether = game.aether || 0;
      var keptAscensions = game.ascensionCount || 0;
      var keptAetherUpgrades = Object.assign({}, game.aetherUpgrades || {});

      game.gold = 0;
      game.essence = 0;
      game.aether = keptAether;

      game.tapDamage = 1;
      game.tapMult = 1;
      game.autoDps = 0;
      game.critChance = 5;
      game.critMult = 2;
      game.goldMult = 1;

      game.totalKills = 0;
      game.totalGoldEarned = 0;
      game.totalDamageDealt = 0;
      game.playTime = 0;
      game.cycleCount = 0;
      game.ascensionCount = keptAscensions;

      game.killCounts = {};
      game.upgrades = {};
      game.talents = {};
      game.aetherUpgrades = keptAetherUpgrades;
      game.inventory = [];
      game.equipped = { weapon: null, armor: null, amulet: null };
      game.quests = [];
      game.questProgress = {};
      game.questResetTime = 0;
      game.enemy = null;
      game.activeTab = "combat";

      WorldManager.worldIndex = 0;
      WorldManager.adventureIndex = 0;
      WorldManager.enemyIndex = 0;
    }

    if (window.EquipmentManager && typeof EquipmentManager.recalcStats === "function") {
      EquipmentManager.recalcStats();
    }

    if (typeof ensureDailyQuests === "function") ensureDailyQuests();
    if (window.CombatEngine && typeof CombatEngine.spawnEnemy === "function") {
      CombatEngine.spawnEnemy();
    }

    if (typeof switchTab === "function") switchTab("combat");
    if (typeof renderAll === "function") renderAll();
    if (typeof updateQuestBadge === "function") updateQuestBadge();
    if (typeof saveGame === "function") saveGame();
    if (typeof showToast === "function") showToast("Ascension +" + gain + " Aether", 1800);
  };

  if (typeof showConfirmModal === "function") {
    showConfirmModal(
      "Ascension",
      "Tu vas recommencer ta progression, mais garder ton Aether, tes ascensions et tes améliorations d'Aether.\n\nGain prévu : +" + gain + " Aether.",
      "🌀",
      doAscend
    );
  } else if (window.confirm("Ascensionner et gagner +" + gain + " Aether ?")) {
    doAscend();
  }
}

function ensureDailyQuests() {
  if (!window.QuestManager || typeof QuestManager.generateDaily !== "function") return;

  if (!game.quests || game.quests.length === 0) {
    game.quests = QuestManager.generateDaily();
    var hours = (typeof QUEST_CONFIG !== "undefined" && QUEST_CONFIG.resetHours) ? QUEST_CONFIG.resetHours : 24;
    game.questResetTime = Date.now() + hours * 3600 * 1000;

    if (!game.questProgress || typeof game.questProgress !== "object") {
      if (typeof DEFAULT_QUEST_PROGRESS !== "undefined" && DEFAULT_QUEST_PROGRESS) {
        game.questProgress = Object.assign({}, DEFAULT_QUEST_PROGRESS);
      } else {
        game.questProgress = {};
      }
    }
  }

  if (typeof updateQuestBadge === "function") updateQuestBadge();
}

function syncAutoTapLoop() {
  if (autoTapInterval) {
    clearInterval(autoTapInterval);
    autoTapInterval = null;
  }

  autoTapInterval = setInterval(function () {
    CombatEngine.autoTap();
  }, 2000);
}

function gameLoop() {
  var now = Date.now();
  var dt = (now - lastTick) / 1000;
  lastTick = now;

  if (!isFinite(dt) || dt < 0) dt = 0;
  if (dt > 0.25) dt = 0.25;

  game.playTime += dt;

  if (window.QuestManager && typeof QuestManager.track === "function") {
    QuestManager.track("combatTime", dt);
  }

  CombatEngine.autoAttack(dt);

  if (game.talents.t_regenerate) {
    game.essence += dt;
  }

  if (game.talents.t_interest) {
    game._interestTimer = (game._interestTimer || 0) + dt;
    while (game._interestTimer >= 10) {
      var bonus = Math.floor(game.gold * 0.0005);
      if (bonus > 0) {
        game.gold += bonus;
        game.totalGoldEarned += bonus;
        if (window.QuestManager && typeof QuestManager.track === "function") {
          QuestManager.track("goldEarned", bonus);
        }
      }
      game._interestTimer -= 10;
    }
  }

  if (window.QuestManager && typeof QuestManager.checkReset === "function") {
    QuestManager.checkReset();
  }

  if (typeof renderHud === "function") renderHud();
  if (typeof renderEnemyHp === "function") renderEnemyHp();

  requestAnimationFrame(gameLoop);
}

function init() {
  if (gameStarted) return;
  gameStarted = true;

  if (typeof ensureGameStateDefaults === "function") {
    ensureGameStateDefaults();
  }

  initSaveSystem();

  var loaded = loadGame();

  ensureDailyQuests();
  CombatEngine.spawnEnemy();

  if (window.QuestManager && typeof QuestManager.checkReset === "function") {
    QuestManager.checkReset();
  }

  if (loaded) {
    addLog("Partie chargée", "event");
    showToast("Partie chargée", 1400);

    if (window.OfflineManager && typeof OfflineManager.calculate === "function") {
      var offline = OfflineManager.calculate();
      if (offline && typeof OfflineManager.show === "function") {
        OfflineManager.show(offline);
      }
    }
  } else {
    addLog("Bienvenue, héros ! Tape l'ennemi pour commencer.", "event");
  }

  if (window.EquipmentManager && typeof EquipmentManager.recalcStats === "function") {
    EquipmentManager.recalcStats();
  }

  if (typeof renderAll === "function") renderAll();

  lastTick = Date.now();
  syncAutoTapLoop();
  requestAnimationFrame(gameLoop);
}

document.addEventListener("contextmenu", function (e) {
  e.preventDefault();
});

var lastTouchEnd = 0;
document.addEventListener("touchend", function (e) {
  var now = Date.now();
  if (now - lastTouchEnd < 300) e.preventDefault();
  lastTouchEnd = now;
}, { passive: false });

window.gameLog = gameLog;
window.formatNumber = formatNumber;
window.chance = chance;
window.randInt = randInt;
window.randFloat = randFloat;
window.vibrate = vibrate;
window.addLog = addLog;
window.getUpgradeCost = getUpgradeCost;
window.getAllTalentNodes = getAllTalentNodes;
window.buyUpgrade = buyUpgrade;
window.buyTalentNode = buyTalentNode;
window.buyAetherUpgrade = buyAetherUpgrade;
window.getAetherUpgradeCost = getAetherUpgradeCost;
window.getAetherBonuses = getAetherBonuses;
window.getAetherMult = getAetherMult;
window.sortInventoryByRarity = sortInventoryByRarity;
window.sellInventoryByRarity = sellInventoryByRarity;
window.ascendNow = ascendNow;
window.CombatEngine = CombatEngine;
window.playerAttack = playerAttack;
window.autoAttack = autoAttack;
window.autoTap = autoTap;
window.showFloatingDamage = showFloatingDamage;
window.showGoldPopup = showGoldPopup;
window.syncAutoTapLoop = syncAutoTapLoop;
window.init = init;
window.resetGame = resetGame;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}