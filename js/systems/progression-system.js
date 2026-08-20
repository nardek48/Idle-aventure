"use strict";
/* ============================================================
Quest Idle — systems/progression-system.js
Le plus gros fichier du projet : progression dans les mondes
(WorldManager), quêtes journalières (QuestManager), achats
(upgrades classiques, talents, améliorations Aether), XP/niveau du
héros, et ascension (AscensionManager + ascendNow).
============================================================ */

var WorldManager = {
  worldIndex: 0,      // index du monde courant dans WORLDS
  adventureIndex: 0,   // index du chapitre courant dans world.adventures
  enemyIndex: 0,        // combien d'ennemis vaincus dans le chapitre courant

  getWorld: function () {
    return WORLDS[this.worldIndex] || WORLDS[0];
  },

  getAdventure: function () {
    var world = this.getWorld();
    if (!world || !world.adventures || !world.adventures.length) return null;
    return world.adventures[this.adventureIndex] || world.adventures[0];
  },

  /* Génère le prochain ennemi (ou le boss si enemyIndex a atteint le
     dernier cran de l'aventure). Les PV de l'ennemi dérivent de sa
     stat d'endurance de base (ENEMY_DB/BOSS_DB), multipliée par un
     facteur d'échelle qui grandit avec :
       - le monde atteint (worldIndex)
       - le chapitre dans ce monde (adventureIndex)
       - le nombre de cycles bouclés sans ascensionner (game.cycleCount)
     Les boss ont aussi un bonus supplémentaire lié à game.totalKills. */
  generateEnemy: function () {
    var adventure = this.getAdventure();
    if (!adventure) {
      return { id: "fallback", name: "Ennemi", asset: "slime", isBoss: false, hp: 10, maxHp: 10, goldReward: 1, essenceReward: 0, resists: [], weak: [], stats: makeRpgStats(5, 10, 10, 5, 5) };
    }

    // v3.23 : palier de difficulté tous les 5 cycles — demandé, pour
    // pousser encore plus à ascensionner une fois qu'on a tout
    // débloqué (monde 6/Tour) plutôt que de juste farm indéfiniment.
    // Ne touche QUE les PV et les dégâts (via stats.power, cloné plus
    // bas pour ne jamais modifier ENEMY_DB/BOSS_DB partagés) des
    // ENNEMIS — les améliorations du héros restent inchangées.
    // L'augmentation NORMALE par cycle (déjà dans scale/bossScale plus
    // bas) continue de s'appliquer à chaque cycle, sans exception —
    // ce palier est un bonus EN PLUS, pas un remplacement. Voir
    // getCycleMilestoneMult() plus bas dans ce fichier.
    var milestoneMult = this.getCycleMilestoneMult();

    // v3.20 : Élite (affliction) force TOUS les ennemis à être des
    // boss, pas seulement le dernier de la vague — voir
    // AfflictionManager.shouldForceAllBosses(), systems/affliction-system.js.
    var forceAllBosses = window.AfflictionManager && typeof AfflictionManager.shouldForceAllBosses === "function" && AfflictionManager.shouldForceAllBosses();
    var isBoss = forceAllBosses || this.enemyIndex >= Math.max(0, (adventure.enemyCount || 1) - 1);
    var enemyId;

    if (isBoss) {
      enemyId = adventure.boss;
      var bossData = BOSS_DB[enemyId] || { name: "Boss", asset: "slimeking" };
      // v2.11 : coefficients augmentés (0.90/0.30/0.35 -> 1.3/0.4/0.7)
      // pour suivre la croissance multiplicative de la puissance du joueur.
      var bossScale = 1 + this.worldIndex * 1.3 + this.adventureIndex * 0.4 + (game.cycleCount || 0) * 0.7;
      var BOSS_ENDURANCE_HP_COEF = 2;
      var bossEndurance = (bossData.stats && bossData.stats.endurance) || 58;
      var bossHp = Math.floor(bossEndurance * BOSS_ENDURANCE_HP_COEF * bossScale * milestoneMult + (game.totalKills || 0) * 2);
      // v3.20 : Colosses (affliction) double les PV de boss — voir
      // AfflictionManager.getCombinedModifiers().bossHpMult.
      if (window.AfflictionManager && typeof AfflictionManager.getCombinedModifiers === "function") {
        var bossHpMods = AfflictionManager.getCombinedModifiers();
        if (bossHpMods.bossHpMult !== 1) bossHp = Math.floor(bossHp * bossHpMods.bossHpMult);
      }
      // v3.23 : clone des stats du boss (JAMAIS l'objet partagé de
      // BOSS_DB directement) pour pouvoir booster power (dégâts de
      // riposte) sans corrompre la base de données pour toujours.
      var bossStats = bossData.stats ? Object.assign({}, bossData.stats) : null;
      if (bossStats && milestoneMult !== 1) {
        bossStats.power = Math.floor(bossStats.power * milestoneMult);
      }
      return {
        id: enemyId,
        name: bossData.name,
        asset: bossData.asset,
        isBoss: true,
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
    // v2.11 : coefficients augmentés (0.60/0.22/0.20 -> 0.90/0.30/0.45)
    // pour suivre la croissance multiplicative de la puissance du joueur.
    var scale = 1 + this.worldIndex * 0.90 + this.adventureIndex * 0.30 + (game.cycleCount || 0) * 0.45 + this.enemyIndex * 0.05;
    var ENEMY_ENDURANCE_HP_COEF = 1.2;
    var enemyEndurance = (enemyData.stats && enemyData.stats.endurance) || 18;
    var hp = Math.floor(enemyEndurance * ENEMY_ENDURANCE_HP_COEF * scale * milestoneMult + this.enemyIndex * 5);

    // v3.23 : même clonage que pour le boss ci-dessus — jamais
    // l'objet ENEMY_DB partagé directement.
    var effectiveStats = enemyData.stats ? Object.assign({}, enemyData.stats) : null;
    if (effectiveStats && milestoneMult !== 1) {
      effectiveStats.power = Math.floor(effectiveStats.power * milestoneMult);
    }

    return {
      id: enemyId,
      name: enemyData.name,
      asset: enemyData.asset,
      isBoss: false,
      hp: hp,
      maxHp: hp,
      goldReward: Math.floor(6 * scale + this.worldIndex * 3),
      essenceReward: 1,
      resists: enemyData.resists || [],
      weak: enemyData.weak || [],
      stats: effectiveStats
    };
  },

  // v3.23 : plus qu'une simple augmentation "normale" par cycle
  // (scale/bossScale ci-dessus, inchangée, continue de s'appliquer à
  // CHAQUE cycle sans exception) — un palier SUPPLÉMENTAIRE tous les
  // 5 cycles (5, 10, 15...), MAIS seulement une fois le monde 6
  // (Tour, index 5) débloqué. Objectif explicite : pousser encore
  // plus à ascensionner une fois qu'on a tout débloqué plutôt que de
  // juste farm indéfiniment sans y être incité.
  // Valeur choisie par défaut (+25% de PV/dégâts par palier de 5
  // cycles, additif) — pas de chiffre précisé dans la demande,
  // facile à ajuster une fois testé en jeu réel.
  CYCLE_MILESTONE_BONUS_PER_STEP: 0.25,
  getCycleMilestoneMult: function () {
    if (!window.WorldManager || typeof WorldManager.meetsAscensionRequirement !== "function") return 1;
    if (!WorldManager.meetsAscensionRequirement(5)) return 1; // index 5 = Tour (6e monde)

    var milestones = Math.floor((game.cycleCount || 0) / 5);
    if (milestones <= 0) return 1;
    return 1 + milestones * this.CYCLE_MILESTONE_BONUS_PER_STEP;
  },

  /* v2.83 : un monde n'est plus débloqué par un nombre d'ascensions
     mais par la questline associée (voir data/world-quests.js et
     WorldQuestManager.isWorldUnlocked). Le nom de la fonction est
     conservé tel quel (beaucoup d'appelants dans l'UI) même si elle
     ne regarde plus l'ascension — ça évite de renommer partout ;
     `requiredAscension` reste dans data/worlds.js pour référence/
     historique mais n'est plus consulté ici.
     v3.3 : vérifie EN PLUS qu'aucune quête d'aventure du monde
     PRÉCÉDENT ne verrouille explicitement ce passage (gatesNextWorld,
     voir AdventureQuestManager.isWorldTransitionUnlocked) — un second
     verrou possible, indépendant de la questline WorldQuestManager,
     qui doit lui aussi être levé. Aucune quête gatesNextWorld définie
     pour le monde précédent = ce second verrou reste toujours ouvert
     (comportement inchangé pour tous les mondes sans contenu ici). */
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

  /* Appelée après chaque kill (voir CombatEngine.killEnemy). Fait
     progresser enemyIndex -> adventureIndex -> worldIndex dans cet
     ordre, et renvoie un objet décrivant ce qui vient de se passer
     ({ type: "enemy" | "adventure" | "world" | "locked" | "cycle" }),
     lu par killEnemy() pour afficher le bon message. Si le monde
     suivant est verrouillé (ascension insuffisante), boucle au
     monde 0 et incrémente game.cycleCount au lieu d'avancer. */
  /* Marque un monde comme "déjà atteint au moins une fois" — pour le
     Codex (data/codex.js), qui doit rester débloqué même après une
     ascension (worldIndex, lui, retombe à 0 à chaque ascension). */
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

    if (window.QuestManager && typeof QuestManager.trackWorldCompletion === "function") {
      QuestManager.trackWorldCompletion(world.id);
    }

    if (nextAdventureIndex < world.adventures.length) {
      // v3.0 : une quête d'Expédition (data/adventure-quests.js) peut
      // verrouiller le passage vers l'aventure suivante d'un même
      // monde — voir AdventureQuestManager.isTransitionUnlocked.
      // Aucune quête définie pour cette transition = comportement
      // inchangé (toujours débloqué, comme avant v3.0). Si verrouillé,
      // adventureIndex ne bouge pas : le joueur reboucle sur la même
      // aventure jusqu'à réclamation de la quête sur la Carte.
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

    this.worldIndex = 0;
    game.cycleCount = (game.cycleCount || 0) + 1;

    if (nextWorld && !this.meetsAscensionRequirement(nextIndex)) {
      return { type: "locked", world: nextWorld };
    }

    return { type: "cycle" };
  },

  /* v3.41 : repositionne au tout début du cycle (monde 1, 1er ennemi),
     sans toucher cycleCount. Utilisé au switch/création de héros et à
     la mort — indépendant de la progression déjà atteinte. */
  resetToCycleStart: function () {
    this.worldIndex = 0;
    this.adventureIndex = 0;
    this.enemyIndex = 0;
  },

  /* Met à jour les variables CSS --world-bg/--world-combat-map pour
     que le fond de l'écran de combat corresponde au monde courant. */
  applyWorldTheme: function () {
    var root = document.documentElement;
    var world = this.getWorld();
    if (!root || !world) return;
    root.style.setProperty("--world-bg", world.bg || "#111");
    if (world.combatMap) root.style.setProperty("--world-combat-map", 'url("' + world.combatMap + '")');
    else root.style.setProperty("--world-combat-map", "none");
  }
};

var QuestManager = {
  /* Tire QUEST_CONFIG.count quêtes au hasard (sans doublon) dans
     QUEST_TEMPLATES pour former le lot du jour. */
  generateDaily: function () {
    var templates = Array.isArray(QUEST_TEMPLATES) ? QUEST_TEMPLATES.slice() : [];
    var picked = [];
    var maxCount = (QUEST_CONFIG && QUEST_CONFIG.count) || 3;

    while (templates.length && picked.length < maxCount) {
      var idx = randInt(0, templates.length - 1);
      var t = templates.splice(idx, 1)[0];
      picked.push({
        id: t.id,
        icon: t.icon || "📜",
        name: t.name || "Quête",
        desc: String(t.desc || "").replace("{target}", t.target),
        target: Number(t.target || 0),
        rewardGold: Number(t.rewardGold || 0),
        rewardEssence: Number(t.rewardEssence || 0),
        claimed: false
      });
    }
    return picked;
  },

  getTemplate: function (id) {
    return (QUEST_TEMPLATES || []).find(function (q) { return q.id === id; }) || null;
  },

  /* Progression actuelle d'une quête, en appelant le tracker() de son
     template (qui lit game.questProgress). */
  getProgress: function (quest) {
    var tpl = this.getTemplate(quest.id);
    if (!tpl) return 0;
    if (typeof tpl.tracker === "function") return Math.floor(Number(tpl.tracker()) || 0);
    return 0;
  },

  isComplete: function (quest) {
    return this.getProgress(quest) >= Number(quest.target || 0);
  },

  /* Réclame la récompense d'une quête complétée (une seule fois, via
     quest.claimed). */
  claim: function (id) {
    var quest = (game.quests || []).find(function (q) { return q.id === id; });
    if (!quest || quest.claimed || !this.isComplete(quest)) return;

    quest.claimed = true;
    game.gold += Number(quest.rewardGold || 0);
    game.essence += Number(quest.rewardEssence || 0);
    game.totalGoldEarned += Number(quest.rewardGold || 0);

    addLog("Quête accomplie : " + quest.name, "event");
    showToast("Quête réclamée", 1400);
    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  /* Incrémente un compteur de progression de quête (ex:
     QuestManager.track("kills", 1)). Utilisé un peu partout dans le
     code à chaque fois qu'une action pertinente se produit. */
  track: function (key, amount) {
    if (!game.questProgress) game.questProgress = {};
    if (typeof game.questProgress[key] !== "number") game.questProgress[key] = 0;
    game.questProgress[key] += Number(amount || 0);
  },

  trackWorldCompletion: function (worldId) {
    if (worldId === "forest") this.track("forestChaptersDone", 1);
    if (worldId === "ruins") this.track("ruinsChaptersDone", 1);
  },

  /* Vérifie si le délai de reset (24h par défaut) est écoulé et, si
     oui, régénère un nouveau lot de quêtes avec une progression
     remise à zéro. Appelée régulièrement (boot + boucle de jeu). */
  checkReset: function () {
    if (!game.questResetTime || Date.now() >= game.questResetTime) {
      game.quests = this.generateDaily();
      game.questProgress = Object.assign({}, DEFAULT_QUEST_PROGRESS);
      game.questResetTime = Date.now() + (((QUEST_CONFIG && QUEST_CONFIG.resetHours) || 24) * 3600 * 1000);
      if (typeof updateQuestBadge === "function") updateQuestBadge();
      if (typeof renderAll === "function") renderAll();
    }
  },

  /* Texte "Xh Ym" du temps restant avant le prochain reset de quêtes. */
  timeUntilReset: function () {
    var diff = Math.max(0, (game.questResetTime || 0) - Date.now());
    var h = Math.floor(diff / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    return h + "h " + m + "m";
  }
};

/* Renvoie l'arbre de talents complet ({combat:[...], fortune:[...],
   survival:[...]}), utilisée par buyTalentNode ci-dessous. Le résumé
   des bonus actifs (talents-view.js) a sa propre fonction getTalentTree()
   qui fait la même chose — gardées séparées pour ne pas coupler les
   deux fichiers. */
function getAllTalentNodes() {
  if (typeof TALENTTREE !== "undefined") return TALENTTREE;
  if (typeof TALENT_TREE !== "undefined") return TALENT_TREE;
  return {};
}

/* Coût du prochain niveau d'une upgrade classique. `atLevel` permet de
   simuler un niveau différent du niveau actuel (utilisé par
   getUpgradePurchasePreview pour calculer un achat multiple). */
function getUpgradeCost(upgrade, atLevel) {
  if (!upgrade) return Infinity;
  var level = (atLevel === undefined || atLevel === null)
    ? (game.upgrades[upgrade.id] || 0)
    : Number(atLevel || 0);

  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMult, level));
}



/* Achète une upgrade classique. `amount` peut être 1/10/25 ou -1
   (signifie "MAX", achète tant qu'il reste de l'or et que le niveau
   max n'est pas atteint). Achète les niveaux un par un dans une
   boucle pour respecter le coût croissant à chaque palier. */
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

  if (window.QuestManager && typeof QuestManager.track === "function") {
    QuestManager.track("goldSpent", totalSpent);
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

/* Simule un achat (sans le réaliser) pour afficher un aperçu dans
   l'UI : combien de niveaux seraient achetés et pour quel coût total,
   selon le mode d'achat (x1/x10/x25/MAX) et l'or actuel. */
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


/* Change le mode d'achat de la boutique (boutons x1/x10/x25/MAX). */
function setShopBuyAmount(amount) {
  amount = Number(amount || 1);

  if (![1, 10, 25, -1].includes(amount)) {
    amount = 1;
  }

  game.shopBuyAmount = amount;

  if (typeof renderAll === "function") renderAll();
  saveGame();
}

/* Coût pour réinitialiser tous les talents : 150 or par talent
   actuellement débloqué (donc plus cher si on a beaucoup investi). */
function getTalentRespecCost() {
  // v3.28 : scale maintenant avec la SOMME des niveaux investis (0-3
  // par talent), pas juste le nombre de talents distincts démarrés —
  // cohérent avec le remboursement de respecTalents() ci-dessous.
  var levels = Object.keys(game.talents || {}).map(function (id) { return Number(game.talents[id] || 0); });
  var totalPoints = levels.reduce(function (sum, lvl) { return sum + lvl; }, 0);
  return totalPoints * 150;
}

/* Réinitialise tous les talents contre de l'or : rend tous les points
   dépensés (utilisables ailleurs) et vide game.talents. Demande
   confirmation via showConfirmModal avant d'agir. */
function respecTalents() {
  // v3.28 : chaque talent peut valoir 1, 2 ou 3 points investis
  // maintenant (niveaux) — le remboursement doit compter la SOMME des
  // niveaux, pas juste le nombre de talents distincts démarrés.
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
    if (typeof syncAutoTapLoop === "function") syncAutoTapLoop();

    addLog("🔄 Talents réinitialisés (-" + formatNumber(cost) + " or, " + totalPoints + " point(s) rendu(s))", "event");
    showToast("Talents réinitialisés", 1500);
    // v2.90.13 : la popup de résumé (#talent-modal-root) vit hors du
    // cycle renderAll() habituel — sans ça, elle continuerait
    // d'afficher les talents déjà réinitialisés jusqu'à ce qu'on la
    // referme/rouvre manuellement (plus rien d'utile à y montrer une
    // fois vidée, donc on la referme simplement).
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

/* Débloque un talent précis : vérifie qu'il existe, qu'il n'est pas
   déjà appris, que son prérequis (node.requires) est rempli, et qu'il
   reste au moins 1 point de talent. Recherche le node dans les 3
   branches de l'arbre (l'id suffit, pas besoin de connaître la branche). */
/* v3.28 : achète UN NIVEAU d'un talent (jusqu'à node.maxLevel, 3 par
   défaut) — avant, un talent était acheté/pas acheté (booléen),
   maintenant game.talents[id] est un NOMBRE de niveaux investis.
   Vérifie : le talent existe, n'est pas déjà au niveau max, son
   prérequis est acquis (≥1 niveau), il reste au moins 1 point de
   talent, ET l'exclusivité par palier (voir tier/side, data/talents.js)
   — investir dans un nœud dont le PALIER a déjà un point investi de
   l'AUTRE côté est refusé, jusqu'à une réinitialisation. */
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

  // v3.28 : exclusivité par PALIER — si ce nœud a un tier/side (donc
  // n'est pas le nœud "top" partagé), vérifie qu'aucun point n'est
  // déjà investi dans le nœud OPPOSÉ du MÊME palier de la MÊME branche.
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
  if (typeof syncAutoTapLoop === "function") syncAutoTapLoop();

  addLog("Talent amélioré : " + (node.name || id) + " (niveau " + game.talents[id] + "/" + maxLevel + ")", "event");
  showToast((node.name || id) + " niveau " + game.talents[id], 1500);
  vibrate([40, 20, 40]);
  if (typeof renderAll === "function") renderAll();
  saveGame();
}

/* Achète UN niveau d'une amélioration de la Boutique d'Aether
   (contrairement à buyUpgrade, pas d'achat multiple ici). */
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

/* XP nécessaire pour passer du niveau `level` au suivant (voir
   HERO_LEVELING dans data/heroes.js pour les 2 constantes utilisées). */
/* XP nécessaire pour passer du niveau `level` au suivant. v2.11 :
   base 10->20, croissance 1.25->1.35, terme linéaire 5->10 (chaque
   niveau donne 1 point de talent, c'était trop rapide à obtenir).
   Voir HERO_LEVELING dans data/heroes.js — cette donnée existe mais
   n'est PAS branchée ici, les valeurs sont en dur ci-dessous ; les
   deux devraient être fusionnées un jour pour éviter la confusion. */
function getHeroXpRequiredForLevel(level) {
  level = Math.max(1, Number(level || 1));
  return Math.floor(20 * Math.pow(1.35, level - 1) + (level - 1) * 10);
}

/* Ajoute de l'XP au héros et gère la montée de niveau (potentiellement
   plusieurs d'un coup si amount est gros, via la boucle while). Chaque
   niveau donne 1 point de talent. Retourne le nombre de niveaux gagnés. */
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

/* Filet de sécurité appelé au boot : s'assure qu'il existe bien un
   lot de quêtes et un questProgress valides, même sur une toute
   première partie ou une sauvegarde corrompue/ancienne. */
function ensureDailyQuests() {
  if (!window.QuestManager || typeof QuestManager.generateDaily !== "function") return;

  if (!game.quests || game.quests.length === 0) {
    game.quests = QuestManager.generateDaily();
    var hours = (typeof QUEST_CONFIG !== "undefined" && QUEST_CONFIG.resetHours) ? QUEST_CONFIG.resetHours : 24;
    game.questResetTime = Date.now() + hours * 3600 * 1000;
  }

  if (!game.questProgress || typeof game.questProgress !== "object") {
    if (typeof DEFAULT_QUEST_PROGRESS !== "undefined" && DEFAULT_QUEST_PROGRESS) {
      game.questProgress = Object.assign({}, DEFAULT_QUEST_PROGRESS);
    } else {
      game.questProgress = {};
    }
  }

  if (typeof updateQuestBadge === "function") updateQuestBadge();
}

/* Petite façade utilisée par l'UI (ascension-view.js) pour savoir si
   le bouton d'ascension doit être actif et combien il rapporterait.
   La vraie logique d'ascension est dans ascendNow() ci-dessous (les
   deux gardent le même calcul de gain, à garder synchronisés). */
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

/* Le vrai processus d'ascension, avec confirmation de l'utilisateur :
   calcule le gain d'Aether, puis (après confirmation) l'ajoute,
   incrémente le compteur d'ascensions, réinitialise la progression
   classique (hardResetState, voir save-system.js) tout en conservant
   l'Aether/les talents Aether/les ascensions, régénère les quêtes et
   redémarre un combat depuis le monde 0. */
function ascendNow() {
  if (typeof ASCENSION_CONFIG === "undefined") return;
  var minKills = ASCENSION_CONFIG.minKillsToAscend || 0;
  if ((game.totalKills || 0) < minKills) {
    showToast("Ascension non disponible (" + minKills + " kills minimum)", 1500);
    return;
  }

  var gain = typeof ASCENSION_CONFIG.computeGain === "function" ? ASCENSION_CONFIG.computeGain() : 0;
  if (game.talents.t_rich_ritual && gain >= 10) gain += game.talents.t_rich_ritual;

  // Élixir d'Aether (potion sans minuteur) : bonus consommé ici, une seule fois.
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

    if (typeof ensureDailyQuests === "function") ensureDailyQuests();
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
window.QuestManager = QuestManager;
window.AscensionManager = AscensionManager;
window.getUpgradeCost = getUpgradeCost;
window.getAllTalentNodes = getAllTalentNodes;
window.buyUpgrade = buyUpgrade;
window.buyTalentNode = buyTalentNode;
window.respecTalents = respecTalents;
window.getTalentRespecCost = getTalentRespecCost;
window.buyAetherUpgrade = buyAetherUpgrade;
window.grantHeroXp = grantHeroXp;
window.ensureDailyQuests = ensureDailyQuests;
window.ascendNow = ascendNow;
window.setShopBuyAmount = setShopBuyAmount;
window.getUpgradePurchasePreview = getUpgradePurchasePreview;
window.doAscend = function () { AscensionManager.doAscend(); };

