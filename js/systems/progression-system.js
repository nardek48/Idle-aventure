"use strict";
/* systems/progression-system.js — le plus gros fichier du projet : WorldManager (progression mondes + génération ennemis),
   achats (upgrades/talents/Aether), XP héros, AscensionManager + ascendNow(). Journalières retirées en v3.116.0.
   Détail complet (constantes de balance ENEMY_PV_*, historique des exposants) : COMMENTAIRES_ORIGINAUX.md */
var ENEMY_PV_MULT = 3.33; // v3.102.0 (P2) : 4,0 → 3,33, calibration par rounds (P1_Budgets_Foret.md §B)
var ENEMY_PV_WORLD_EXP = 1.45;
var BOSS_PV_MULT = 3.1;   // v3.102.0 (P2) : 6,7 → 3,1 ; les dégâts de boss passent ×1,5 (BOSS_DMG_MULT, combat-engine.js)
var ENEMY_POWER_SCALE_EXP = 0.3;

// Coefficient WORLD_MULT par monde (session équilibrage "scie", cf. CHANGELOG_v3.87.0.md) :
// remplace l'ancien coefficient unique 0.90 partagé par tous les mondes. Valeurs trouvées par
// dichotomie visant ~55% de deathRate à adventureIndex=0, sur les nouvelles stats joueur
// (post-nerf talents/équipement de v3.87.0). Index = WorldManager.worldIndex (0-based, ordre
// réel de WORLDS : forest, desert, ruins, crypt, mountain, tower).
var WORLD_MULT_BY_WORLD = [1.264, 1.637, 1.917, 2.757, 5.418, 7.892];
// Ratio boss/normal préservé identique à l'original (1.3 / 0.90 ≈ 1.444).
var BOSS_WORLD_MULT_RATIO = 1.3 / 0.90;

var WorldManager = {
  worldIndex: 0,
  adventureIndex: 0,
  enemyIndex: 0,

  getWorld: function () {
    return WORLDS[this.worldIndex] || WORLDS[0];
  },

  getAdventure: function () {
    var world = this.getWorld();
    if (!world || !world.adventures || !world.adventures.length) return null;
    return world.adventures[this.adventureIndex] || world.adventures[0];
  },

    generateEnemy: function () {
    var adventure = this.getAdventure();
    if (!adventure) {
      return { id: "fallback", name: "Ennemi", asset: "slime", isBoss: false, hp: 10, maxHp: 10, goldReward: 1, essenceReward: 0, resists: [], weak: [], stats: makeRpgStats(5, 10, 10, 5, 5) };
    }

    var milestoneMult = this.getCycleMilestoneMult();

    var forceAllBosses = window.AfflictionManager && typeof AfflictionManager.shouldForceAllBosses === "function" && AfflictionManager.shouldForceAllBosses();
    var isBoss = forceAllBosses || this.enemyIndex >= Math.max(0, (adventure.enemyCount || 1) - 1);
    var enemyId;

    if (isBoss) {
      enemyId = adventure.boss;
      var bossData = BOSS_DB[enemyId] || { name: "Boss", asset: "slimeking" };
      var bossWorldMult = WORLD_MULT_BY_WORLD[this.worldIndex] != null
        ? WORLD_MULT_BY_WORLD[this.worldIndex] * BOSS_WORLD_MULT_RATIO
        : 1.3;
      var bossWorldComponent = Math.pow(1 + this.worldIndex * bossWorldMult, ENEMY_PV_WORLD_EXP);
      var bossScale = bossWorldComponent + this.adventureIndex * 0.4 + (game.cycleCount || 0) * 0.7;
      var bossEndurance = (bossData.stats && bossData.stats.endurance) || 58;
      // v3.106.1 : terme totalKills retiré — grandissait indéfiniment sans plafond avec le nombre de kills
      // GLOBAL du joueur (toutes zones confondues), rendant les boss plus durs à mesure qu'on progresse
      // normalement dans le jeu (+111 % de PV à seulement 100 kills). Le boss suit désormais la même
      // logique que les ennemis normaux (monde/aventure/cycle uniquement, cf. plus bas dans ce fichier).
      var bossHp = Math.floor(bossEndurance * BOSS_PV_MULT * bossScale * milestoneMult);
      if (window.AfflictionManager && typeof AfflictionManager.getCombinedModifiers === "function") {
        var bossHpMods = AfflictionManager.getCombinedModifiers();
        if (bossHpMods.bossHpMult !== 1) bossHp = Math.floor(bossHp * bossHpMods.bossHpMult);
      }
      var bossStats = bossData.stats ? Object.assign({}, bossData.stats) : null;
      if (bossStats && milestoneMult !== 1) {
        bossStats.power = Math.floor(bossStats.power * milestoneMult);
      }
      if (bossStats) {
        bossStats.power = Math.floor(bossStats.power * Math.pow(bossScale, ENEMY_POWER_SCALE_EXP));
      }

      var archetype = (typeof decideEnemyArchetype === "function")
        ? decideEnemyArchetype(this.worldIndex, true, randInt(1, 100), randInt(1, 100))
        : null;

      return {
        id: enemyId,
        name: bossData.name,
        asset: bossData.asset,
        isBoss: true,
        archetype: archetype,
        hp: bossHp,
        maxHp: bossHp,
        goldReward: Math.floor(40 * bossScale),
        essenceReward: 3 + this.worldIndex,
        resists: bossData.resists || [],
        weak: bossData.weak || [],
        stats: bossStats
      };
    }

    enemyId = adventure.enemyPool[randInt(0, adventure.enemyPool.length - 1)];
    var enemyData = ENEMY_DB[enemyId] || { name: "Ennemi", asset: "slime" };
    var worldMult = WORLD_MULT_BY_WORLD[this.worldIndex] != null ? WORLD_MULT_BY_WORLD[this.worldIndex] : 0.90;
    var worldComponent = Math.pow(1 + this.worldIndex * worldMult, ENEMY_PV_WORLD_EXP);
    // v3.106.1 : enemyIndex neutralisé en Forêt (worldIndex 0) — c'est un monde d'apprentissage, pas de
    // ressaut de difficulté voulu à l'intérieur d'une même aventure. Ailleurs, worldComponent domine déjà
    // largement (Désert et +) et ce terme y reste un petit à-côté (+1 à +11 % du 1er au 10e ennemi).
    var enemyIndexFactor = this.worldIndex === 0 ? 0 : this.enemyIndex;
    var scale = worldComponent + this.adventureIndex * 0.30 + (game.cycleCount || 0) * 0.45 + enemyIndexFactor * 0.05;
    var enemyEndurance = (enemyData.stats && enemyData.stats.endurance) || 18;
    var hp = Math.floor(enemyEndurance * ENEMY_PV_MULT * scale * milestoneMult + enemyIndexFactor * 5);

    var effectiveStats = enemyData.stats ? Object.assign({}, enemyData.stats) : null;
    if (effectiveStats && milestoneMult !== 1) {
      effectiveStats.power = Math.floor(effectiveStats.power * milestoneMult);
    }
    if (effectiveStats) {
      effectiveStats.power = Math.floor(effectiveStats.power * Math.pow(scale, ENEMY_POWER_SCALE_EXP));
    }

    var normalArchetype = (typeof decideNormalEnemyArchetype === "function")
      ? decideNormalEnemyArchetype(this.worldIndex, false, randInt(1, 100), enemyId)
      : null;

    return {
      id: enemyId,
      name: enemyData.name,
      asset: enemyData.asset,
      isBoss: false,
      archetype: normalArchetype,
      hp: hp,
      maxHp: hp,
      goldReward: Math.floor(6 * scale + this.worldIndex * 3),
      essenceReward: 1,
      resists: enemyData.resists || [],
      weak: enemyData.weak || [],
      stats: effectiveStats
    };
  },

  CYCLE_MILESTONE_BONUS_PER_STEP: 0.25,
  getCycleMilestoneMult: function () {
    if (!window.WorldManager || typeof WorldManager.meetsAscensionRequirement !== "function") return 1;
    if (!WorldManager.meetsAscensionRequirement(5)) return 1;

    var milestones = Math.floor((game.cycleCount || 0) / 5);
    if (milestones <= 0) return 1;
    return 1 + milestones * this.CYCLE_MILESTONE_BONUS_PER_STEP;
  },

    meetsAscensionRequirement: function (index) {
    var w = WORLDS[index];
    if (!w) return false;
    if (window.WorldQuestManager && !WorldQuestManager.isWorldUnlocked(index)) return false;
    if (window.AdventureQuestManager) {
      var precedingWorld = WORLDS[index - 1];
      if (precedingWorld && !AdventureQuestManager.isWorldTransitionUnlocked(precedingWorld.id)) return false;
    }
    return true;
  },

      markWorldReached: function (index) {
    if (!game.worldsEverReached || typeof game.worldsEverReached !== "object") game.worldsEverReached = {};
    game.worldsEverReached[index] = true;
  },

  advance: function () {
    var world = this.getWorld();
    var adventure = this.getAdventure();
    if (!world || !adventure) return { type: "none" };

    this.enemyIndex += 1;
    if (this.enemyIndex < (adventure.enemyCount || 1)) return { type: "enemy" };

    this.enemyIndex = 0;
    var justFinishedAdventureIndex = this.adventureIndex;
    var nextAdventureIndex = this.adventureIndex + 1;

    if (nextAdventureIndex < world.adventures.length) {
      if (window.AdventureQuestManager && !AdventureQuestManager.isTransitionUnlocked(world.id, justFinishedAdventureIndex)) {
        return { type: "adventure_locked", world: world, adventure: world.adventures[justFinishedAdventureIndex] };
      }
      this.adventureIndex = nextAdventureIndex;
      return { type: "adventure", world: world, adventure: world.adventures[this.adventureIndex] };
    }

    this.adventureIndex = 0;
    var nextIndex = this.worldIndex + 1;
    var nextWorld = WORLDS[nextIndex];

    if (nextWorld && this.meetsAscensionRequirement(nextIndex)) {
      this.worldIndex = nextIndex;
      this.markWorldReached(nextIndex);
      return { type: "world", world: nextWorld };
    }

    // v3.109.1 (scope validé Seb) : porte d'aventure (gatesNextWorld) non franchie -> on RESTE sur la dernière
    // aventure du monde, sans cycle ni retour au début (le boss du Cœur relançait un cycle +45 % en plein Acte III).
    // Le verrou de questline de monde (WorldQuestManager, Ruines et +) garde le comportement cycle ci-dessous.
    if (nextWorld && window.AdventureQuestManager && !AdventureQuestManager.isWorldTransitionUnlocked(world.id)) {
      this.adventureIndex = justFinishedAdventureIndex;
      var gateQuest = null;
      Object.keys(window.ADVENTURE_QUESTS || {}).some(function (k) {
        var q = ADVENTURE_QUESTS[k];
        if (q.worldId === world.id && q.gatesNextWorld === true) { gateQuest = q; return true; }
        return false;
      });
      return { type: "world_gate_locked", world: world, adventure: adventure, gateQuest: gateQuest };
    }

    this.worldIndex = 0;
    game.cycleCount = (game.cycleCount || 0) + 1;

    if (nextWorld && !this.meetsAscensionRequirement(nextIndex)) {
      return { type: "locked", world: nextWorld };
    }

    return { type: "cycle" };
  },

    resetToCycleStart: function () {
    this.worldIndex = 0;
    this.adventureIndex = 0;
    this.enemyIndex = 0;
  },

  /* v3.109.1 (scope validé Seb) : repart au début de l'AVENTURE en cours (mort en farm libre) —
     une mort au Cœur ne renvoie plus en Lisière (re-traversée complète), seulement au 1er ennemi du Cœur. */
  resetToAdventureStart: function () {
    this.enemyIndex = 0;
  },

    applyWorldTheme: function () {
    var root = document.documentElement;
    var world = this.getWorld();
    if (!root || !world) return;
    root.style.setProperty("--world-bg", world.bg || "#111");
    if (world.combatMap) root.style.setProperty("--world-combat-map", 'url("' + world.combatMap + '")');
    else root.style.setProperty("--world-combat-map", "none");
  }
};

function getAllTalentNodes() {
  if (typeof TALENTTREE !== "undefined") return TALENTTREE;
  if (typeof TALENT_TREE !== "undefined") return TALENT_TREE;
  return {};
}

function getUpgradeCost(upgrade, atLevel) {
  if (!upgrade) return Infinity;
  var level = (atLevel === undefined || atLevel === null)
    ? (game.upgrades[upgrade.id] || 0)
    : Number(atLevel || 0);

  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMult, level));
}

function buyUpgrade(id, amount) {
  var upgrade = (UPGRADES || []).find(function (u) { return u.id === id; });
  if (!upgrade) return showToast("Amélioration introuvable", 1000);

  if ((WorldManager.worldIndex || 0) < (upgrade.unlockWorld || 0)) {
    return showToast("Monde requis non débloqué", 1200);
  }

  amount = Number(amount || 1);
  var buyMax = amount === -1;
  var limit = buyMax ? Infinity : Math.max(1, amount);

  var bought = 0;
  var totalSpent = 0;

  while (bought < limit) {
    var level = game.upgrades[id] || 0;
    if (level >= (upgrade.maxLevel || Infinity)) break;

    var cost = getUpgradeCost(upgrade, level);
    if (game.gold < cost) break;

    game.gold -= cost;
    totalSpent += cost;
    game.upgrades[id] = level + 1;
    bought += 1;
  }

  if (bought <= 0) {
    var currentLevel = game.upgrades[id] || 0;
    if (currentLevel >= (upgrade.maxLevel || Infinity)) {
      return showToast("Niveau maximum", 1200);
    }
    return showToast("Pas assez d'or", 1000);
  }

  if (typeof upgrade.apply === "function") {
    upgrade.apply(game.upgrades[id]);
  }

  if (window.StatsSystem) StatsSystem.recalcStats();

  addLog(
    "Amélioration achetée : " + upgrade.name + " +" + bought + " (niv. " + game.upgrades[id] + ")",
    "event"
  );
  showToast(upgrade.name + " +" + bought, 1200);

  if (typeof renderAll === "function") renderAll();
  saveGame();
}

function getUpgradePurchasePreview(upgrade, amount) {
  if (!upgrade) {
    return {
      count: 0,
      totalCost: 0,
      currentLevel: 0,
      nextLevel: 0,
      reachedMax: false
    };
  }

  amount = Number(amount || 1);
  var buyMax = amount === -1;
  var limit = buyMax ? Infinity : Math.max(1, amount);

  var currentLevel = game.upgrades[upgrade.id] || 0;
  var maxLevel = upgrade.maxLevel || Infinity;
  var simLevel = currentLevel;
  var goldLeft = Number(game.gold || 0);

  var count = 0;
  var totalCost = 0;

  while (count < limit && simLevel < maxLevel) {
    var stepCost = getUpgradeCost(upgrade, simLevel);
    if (goldLeft < stepCost) break;

    goldLeft -= stepCost;
    totalCost += stepCost;
    simLevel += 1;
    count += 1;
  }

  return {
    count: count,
    totalCost: totalCost,
    currentLevel: currentLevel,
    nextLevel: simLevel,
    reachedMax: simLevel >= maxLevel
  };
}

function setShopBuyAmount(amount) {
  amount = Number(amount || 1);

  if (![1, 10, 25, -1].includes(amount)) {
    amount = 1;
  }

  game.shopBuyAmount = amount;

  if (typeof renderAll === "function") renderAll();
  saveGame();
}

function getTalentRespecCost() {
  var levels = Object.keys(game.talents || {}).map(function (id) { return Number(game.talents[id] || 0); });
  var totalPoints = levels.reduce(function (sum, lvl) { return sum + lvl; }, 0);
  return totalPoints * 150;
}

function respecTalents() {
  var levels = Object.keys(game.talents || {}).map(function (id) { return Number(game.talents[id] || 0); });
  var totalPoints = levels.reduce(function (sum, lvl) { return sum + lvl; }, 0);
  if (!totalPoints) return showToast("Aucun talent à réinitialiser", 1200);

  var cost = getTalentRespecCost();
  if ((game.gold || 0) < cost) return showToast("Pas assez d'or (" + formatNumber(cost) + " requis)", 1500);

  var doRespec = function () {
    game.gold -= cost;
    game.talentPoints = Number(game.talentPoints || 0) + totalPoints;
    game.talents = {};
    game._frenzyTapCount = 0;
    game._frenzyReady = false;

    if (window.StatsSystem) StatsSystem.recalcStats();

    addLog("🔄 Talents réinitialisés (-" + formatNumber(cost) + " or, " + totalPoints + " point(s) rendu(s))", "event");
    showToast("Talents réinitialisés", 1500);
    if (typeof closeTalentSummaryPopup === "function") closeTalentSummaryPopup();
    if (typeof renderAll === "function") renderAll();
    saveGame();
  };

  if (typeof showConfirmModal === "function") {
    showConfirmModal(
      "Réinitialiser les talents ?",
      "Coût : " + formatNumber(cost) + " or. Les " + totalPoints + " point(s) dépensé(s) seront rendus.",
      "🔄",
      doRespec
    );
  } else if (window.confirm("Réinitialiser les talents pour " + cost + " or ?")) {
    doRespec();
  }
}

function buyTalentNode(id) {
  var tree = getAllTalentNodes();
  var node = null;
  var branchOfNode = null;

  Object.keys(tree).forEach(function (branch) {
    (tree[branch] || []).forEach(function (entry) {
      if (entry.id === id) { node = entry; branchOfNode = branch; }
    });
  });

  if (!node) return showToast("Talent introuvable", 1000);

  var maxLevel = node.maxLevel || 1;
  var currentLevel = Number(game.talents[id] || 0);
  if (currentLevel >= maxLevel) return showToast("Niveau maximum atteint", 1000);
  if (node.requires && !(Number(game.talents[node.requires] || 0) > 0)) return showToast("Talent précédent requis", 1200);
  if ((game.talentPoints || 0) < 1) return showToast("Pas assez de points de talent", 1200);

  if (node.tier && node.side) {
    var oppositeSide = node.side === "left" ? "right" : "left";
    var blocked = (tree[branchOfNode] || []).some(function (entry) {
      return entry.tier === node.tier && entry.side === oppositeSide && Number(game.talents[entry.id] || 0) > 0;
    });
    if (blocked) {
      showToast("Choix déjà fait pour ce palier (" + (oppositeSide === "left" ? "Actif" : "Passif") + ") — réinitialise pour changer", 2000);
      return;
    }
  }

  game.talentPoints -= 1;
  game.talents[id] = currentLevel + 1;

  if (window.StatsSystem) StatsSystem.recalcStats();

  addLog("Talent amélioré : " + (node.name || id) + " (niveau " + game.talents[id] + "/" + maxLevel + ")", "event");
  showToast((node.name || id) + " niveau " + game.talents[id], 1500);
  vibrate([40, 20, 40]);
  if (typeof renderAll === "function") renderAll();
  saveGame();
}

function buyAetherUpgrade(id) {
  var upgrade = (AETHER_SHOP || []).find(function (u) { return u.id === id; });
  if (!upgrade) return showToast("Amélioration astrale introuvable", 1000);

  var currentLevel = game.aetherUpgrades[id] || 0;
  if (currentLevel >= (upgrade.maxLevel || Infinity)) return showToast("Niveau maximum", 1200);

  var cost = typeof getAetherUpgradeCost === "function"
    ? getAetherUpgradeCost(upgrade)
    : Math.floor(upgrade.baseCost * Math.pow(1.4, currentLevel));

  if (game.aether < cost) return showToast("Pas assez d'Aether", 1000);

  game.aether -= cost;
  game.aetherUpgrades[id] = currentLevel + 1;

  if (window.StatsSystem) StatsSystem.recalcStats();
  addLog("Amélioration astrale : " + upgrade.name + " niv. " + game.aetherUpgrades[id], "event");
  showToast(upgrade.name, 1500);
  if (typeof renderAll === "function") renderAll();
  saveGame();
}

function getHeroXpRequiredForLevel(level) {
  level = Math.max(1, Number(level || 1));
  return Math.floor(20 * Math.pow(1.35, level - 1) + (level - 1) * 10);
}

function grantHeroXp(amount, source) {
  amount = Math.max(0, Number(amount || 0));
  source = source || "generic";
  if (amount <= 0) return 0;

  var levelsGained = 0;
  var previousLevel = game.heroLevel || 1;

  game.heroXp = Number(game.heroXp || 0);
  game.heroLevel = Number(game.heroLevel || 1);
  game.heroXpToNext = Number(game.heroXpToNext || getHeroXpRequiredForLevel(game.heroLevel));
  game.talentPoints = Number(game.talentPoints || 0);

  game.heroXp += amount;

  while (game.heroXp >= game.heroXpToNext) {
    game.heroXp -= game.heroXpToNext;
    game.heroLevel += 1;
    game.talentPoints += 1;
    levelsGained += 1;
    game.heroXpToNext = getHeroXpRequiredForLevel(game.heroLevel);

    addLog("Niveau du héros : " + game.heroLevel + " (+1 point de talent)", "event");
    showToast("Niveau " + game.heroLevel + " ! +1 point de talent", 1800);
    vibrate([30, 20, 30]);
  }

  if (levelsGained === 0) {
    addLog("+" + Math.floor(amount) + " XP héros", "event");
  } else {
    addLog(
      "+" + Math.floor(amount) + " XP héros (" + previousLevel + " → " + game.heroLevel + ")",
      "event"
    );
  }

  if (typeof renderHud === "function") renderHud();
  if (typeof renderStats === "function") renderStats();
  if (typeof renderAll === "function") renderAll();

  return levelsGained;
}

var AscensionManager = {
  previewGain: function () {
    var gain = typeof ASCENSION_CONFIG.computeGain === "function" ? ASCENSION_CONFIG.computeGain() : 0;
    if (game.talents.t_rich_ritual && gain >= 10) gain += game.talents.t_rich_ritual;

    var pendingAetherBonus = (game.pendingPotionBonuses && game.pendingPotionBonuses.aetherNext) || 0;
    if (pendingAetherBonus > 0) gain = Math.ceil(gain * (1 + pendingAetherBonus));

    return Math.max(0, gain);
  },

  canAscend: function () {
    var kills = Number(game.totalKills || 0);
    return kills >= (ASCENSION_CONFIG.minKillsToAscend || 0) && this.previewGain() > 0;
  },

  doAscend: function () {
    if (!this.canAscend()) {
      showToast("Ascension indisponible", 1200);
      return;
    }
    if (typeof ascendNow === "function") ascendNow();
  }
};

function ascendNow() {
  if (typeof ASCENSION_CONFIG === "undefined") return;
  var minKills = ASCENSION_CONFIG.minKillsToAscend || 0;
  if ((game.totalKills || 0) < minKills) {
    showToast("Ascension non disponible (" + minKills + " kills minimum)", 1500);
    return;
  }

  var gain = typeof ASCENSION_CONFIG.computeGain === "function" ? ASCENSION_CONFIG.computeGain() : 0;
  if (game.talents.t_rich_ritual && gain >= 10) gain += game.talents.t_rich_ritual;

  var pendingAetherBonus = (window.PotionManager && game.pendingPotionBonuses)
    ? Number(game.pendingPotionBonuses.aetherNext || 0)
    : 0;
  if (pendingAetherBonus > 0) gain = Math.ceil(gain * (1 + pendingAetherBonus));

  if (gain <= 0) return showToast("Gain d'Aether insuffisant", 1200);

  var doAscend = function () {
    game.aether = Number(game.aether || 0) + gain;
    game.totalAetherEarned = Number(game.totalAetherEarned || 0) + gain;
    game.ascensionCount = Number(game.ascensionCount || 0) + 1;

    if (pendingAetherBonus > 0 && game.pendingPotionBonuses) {
      game.pendingPotionBonuses.aetherNext = 0;
    }
    game.aetherElixirStackCount = 0;

    addLog("Ascension accomplie : +" + gain + " Aether", "event");

    if (typeof hardResetState === "function") {
      hardResetState();
    }

    if (window.CombatEngine && typeof CombatEngine.spawnEnemy === "function") CombatEngine.spawnEnemy();
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
      "images/Icons/aether_icon.png",
      doAscend
    );
  } else if (window.confirm("Ascensionner et gagner +" + gain + " Aether ?")) {
    doAscend();
  }
}

window.WorldManager = WorldManager;
window.AscensionManager = AscensionManager;
window.getUpgradeCost = getUpgradeCost;
window.getAllTalentNodes = getAllTalentNodes;
window.buyUpgrade = buyUpgrade;
window.buyTalentNode = buyTalentNode;
window.respecTalents = respecTalents;
window.getTalentRespecCost = getTalentRespecCost;
window.buyAetherUpgrade = buyAetherUpgrade;
window.grantHeroXp = grantHeroXp;
window.ascendNow = ascendNow;
window.setShopBuyAmount = setShopBuyAmount;
window.getUpgradePurchasePreview = getUpgradePurchasePreview;
window.doAscend = function () { AscensionManager.doAscend(); };
window.ENEMY_PV_MULT = ENEMY_PV_MULT;
window.ENEMY_PV_WORLD_EXP = ENEMY_PV_WORLD_EXP;
window.BOSS_PV_MULT = BOSS_PV_MULT;
window.ENEMY_POWER_SCALE_EXP = ENEMY_POWER_SCALE_EXP;

