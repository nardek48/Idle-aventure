"use strict";
/* ============================================================
Quest Idle — systems/save-system.js
Sauvegarde/chargement (localStorage), autosave, migrations
d'anciennes sauvegardes, et les 2 types de "reset" :
  - hardResetState()  reset d'ascension : garde l'Aether/les
    ascensions/les améliorations Aether, remet tout le reste à zéro
  - fullResetState()   reset complet (bouton "Réinitialiser tout"
    des Paramètres) : efface absolument tout, y compris le héros
Augmenter SAVE_VERSION quand la structure de sauvegarde change de
façon significative (permet de détecter d'anciennes sauvegardes).
============================================================ */

var SAVE_KEY = "quest_idle_save_v6";
var SAVE_VERSION = 6;
var AUTO_SAVE_INTERVAL_MS = 30000;
var saveIntervalId = null;

/* ============================================================
v3.25 : PLUSIEURS HÉROS = PLUSIEURS PARTIES INDÉPENDANTES.
Chaque "héros" (jusqu'à MAX_HERO_SLOTS) est une sauvegarde COMPLÈTE et
autonome — or, essence, Aether, ascension, position sur la carte,
quêtes, Village, Donjon, hauts faits, Codex, afflictions, inventaire,
équipement, talents, niveau : absolument tout, pas seulement les
stats du personnage. "Switcher" de héros = charger une autre partie
en entier ; l'ancienne reste figée telle quelle jusqu'à ce qu'on y
revienne.

Implémentation : au lieu d'une seule clé localStorage fixe (SAVE_KEY
ci-dessus, conservée telle quelle pour la clé de base), chaque
emplacement a sa PROPRE clé (getSlotKey(1/2/3)), et une petite clé à
part (ACTIVE_SLOT_KEY) retient quel emplacement est actif. saveGame()/
loadGame()/clearSaveData() plus bas n'ont PAS changé de signature —
seul ce que SAVE_KEY représente concrètement est devenu dynamique
(voir getActiveSaveKey()), donc tous les appelants existants ailleurs
dans le code (des dizaines, partout) continuent de fonctionner sans
aucune modification.

Migration automatique : si une ancienne sauvegarde "à plat" existe
(clé SAVE_KEY brute, format d'avant les emplacements) et qu'aucun
emplacement 1 n'existe encore, elle est copiée vers l'emplacement 1 —
zéro action requise, la partie en cours au moment de cette mise à jour
devient simplement "Héros 1". Voir migrateOldSaveToSlot1(), appelée
une fois au boot (main/boot.js). */

var MAX_HERO_SLOTS = 3;
var ACTIVE_SLOT_KEY = "quest_idle_active_slot";

function getSlotKey(slotNumber) {
  return SAVE_KEY + "_slot" + slotNumber;
}

function getActiveSlot() {
  try {
    var raw = localStorage.getItem(ACTIVE_SLOT_KEY);
    var n = parseInt(raw, 10);
    if (n >= 1 && n <= MAX_HERO_SLOTS) return n;
  } catch (e) {}
  return 1;
}

function setActiveSlot(slotNumber) {
  try {
    localStorage.setItem(ACTIVE_SLOT_KEY, String(slotNumber));
  } catch (e) {}
}

/* La clé RÉELLEMENT utilisée par saveGame()/loadGame()/clearSaveData()
   ci-dessous — toujours celle de l'emplacement actif du moment. */
function getActiveSaveKey() {
  return getSlotKey(getActiveSlot());
}

/* Migration unique : ancienne sauvegarde à plat (avant les
   emplacements) -> Emplacement 1. Ne fait rien si l'ancienne clé
   n'existe pas, ou si l'emplacement 1 a déjà des données (déjà migré,
   ou partie multi-héros déjà commencée). */
function migrateOldSaveToSlot1() {
  try {
    var slot1Key = getSlotKey(1);
    if (localStorage.getItem(slot1Key)) return; // déjà migré / déjà en place

    var oldRaw = localStorage.getItem(SAVE_KEY);
    if (!oldRaw) return; // rien à migrer (partie neuve)

    localStorage.setItem(slot1Key, oldRaw);
    setActiveSlot(1);
  } catch (e) {}
}

/* ============================================================
   HeroSlotManager : créer/switcher/supprimer un emplacement de héros.
   Couche fine par-dessus saveGame()/loadGame() ci-dessous — ne
   réinvente rien, orchestre juste QUAND sauvegarder/charger/reset.
============================================================ */
/* v3.26 : bug corrigé — après un changement/création de héros
   (HeroSlotManager.switchToSlot()/createHeroInSlot() ci-dessous), le
   joueur se retrouvait sur un écran Combat sans ennemi valide (il
   fallait quitter et relancer le jeu pour pouvoir taper). Cause :
   ces deux fonctions réimplémentent une partie de la séquence de
   main/boot.js (createInitialGameState -> loadGame ->
   ensureGameStateDefaults -> recalcStats) mais SANS l'étape qui fait
   apparaître le premier ennemi (CombatEngine.spawnEnemy(), ou la
   reprise de la vague en cours si un donjon était actif) — cette
   étape n'existait QUE dans boot.js, jamais rappelée ailleurs.
   Fonction partagée qui réplique fidèlement cette même séquence
   (voir main/boot.js, function init(), juste après loadGame()) :
   marque le monde courant "atteint" pour le Codex, génère les quêtes
   journalières si absentes, puis fait apparaître un ennemi (ou
   reprend la vague de donjon en cours). */
function resumeCombatAfterSlotChange() {
  if (window.WorldManager && typeof WorldManager.markWorldReached === "function") {
    WorldManager.markWorldReached(WorldManager.worldIndex || 0);
  }

  if (typeof ensureDailyQuests === "function") ensureDailyQuests();

  if (game.dungeonRun && game.dungeonRun.active && window.DungeonManager) {
    if (typeof DungeonManager.applyDungeonTheme === "function") DungeonManager.applyDungeonTheme(game.dungeonRun.tierId);
    if (typeof DungeonManager.spawnWave === "function") DungeonManager.spawnWave(game.dungeonRun.wave || 1);
  } else if (window.CombatEngine && typeof CombatEngine.spawnEnemy === "function") {
    CombatEngine.spawnEnemy();
  }

  if (window.QuestManager && typeof QuestManager.checkReset === "function") {
    QuestManager.checkReset();
  }
}

var HeroSlotManager = {
  getMaxSlots: function () { return MAX_HERO_SLOTS; },
  getActiveSlot: getActiveSlot,

  hasSlot: function (slotNumber) {
    if (!game.saveSupported) return false;
    try {
      return !!localStorage.getItem(getSlotKey(slotNumber));
    } catch (e) {
      return false;
    }
  },

  /* Résumé léger pour l'affichage du sélecteur (nom, classe, niveau,
     monde atteint) SANS charger cet emplacement dans `game` — lit et
     parse directement sa clé localStorage. Renvoie null si vide ou
     illisible. */
  getSlotSummary: function (slotNumber) {
    if (!this.hasSlot(slotNumber)) return null;
    try {
      var raw = localStorage.getItem(getSlotKey(slotNumber));
      var d = JSON.parse(raw);
      if (!d || typeof d !== "object") return null;

      var hero = null;
      if (typeof HEROES_DB !== "undefined" && d.heroId) {
        Object.keys(HEROES_DB).forEach(function (key) {
          if (HEROES_DB[key] && HEROES_DB[key].id === d.heroId) hero = HEROES_DB[key];
        });
      }

      return {
        playerName: d.playerName || "",
        heroId: d.heroId || "",
        heroName: hero ? hero.name : "",
        heroImage: hero ? hero.image : "",
        heroLevel: Number(d.heroLevel || 1),
        worldIndex: Number(d.worldIndex || 0),
        cycleCount: Number(d.cycleCount || 0),
        ascensionCount: Number(d.ascensionCount || 0)
      };
    } catch (e) {
      return null;
    }
  },

  /* Bascule vers un AUTRE emplacement : sauvegarde l'emplacement
     actif courant (pour ne rien perdre), puis charge l'emplacement
     demandé dans `game`. Si l'emplacement demandé est vide, ne fait
     rien de spécial ici — c'est createHeroInSlot() qui gère la
     création (voir plus bas), appelée séparément par l'écran de
     sélection de héros. */
  switchToSlot: function (slotNumber) {
    if (slotNumber === getActiveSlot()) return true;
    if (!this.hasSlot(slotNumber)) return false;

    // Sauvegarde l'emplacement qu'on quitte AVANT de changer la clé
    // active, pour que saveGame() écrive encore au bon endroit.
    saveGame();

    setActiveSlot(slotNumber);

    // Repart d'un état par défaut avant de charger, comme au tout
    // premier boot — évite qu'un champ absent de la nouvelle
    // sauvegarde garde par erreur une valeur de l'ancien héros
    // (ensureGameStateDefaults() re-remplit tout juste après).
    if (typeof createInitialGameState === "function") {
      // v3.25 : game.saveSupported vient de la détection de
      // fonctionnalité au boot (initSaveSystem()), PAS de l'état d'un
      // héros précis — sans cette préservation explicite, le "wipe"
      // ci-dessous le remet à false (valeur par défaut de
      // createInitialGameState()) et saveGame() se met à échouer
      // silencieusement juste après (son tout premier if la vérifie).
      var keptSaveSupported = game.saveSupported;
      var fresh = createInitialGameState();
      Object.keys(game).forEach(function (k) { delete game[k]; });
      Object.assign(game, fresh);
      game.saveSupported = keptSaveSupported;
    }

    loadGame();
    if (typeof ensureGameStateDefaults === "function") ensureGameStateDefaults();
    if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") StatsSystem.recalcStats();
    resumeCombatAfterSlotChange();

    return true;
  },

  /* Crée un NOUVEAU héros dans un emplacement VIDE : sauvegarde
     l'emplacement qu'on quitte, bascule la clé active vers le nouvel
     emplacement, repart d'un état 100% neuf (fullResetState-like,
     mais sans qu'il y ait quoi que ce soit à préserver puisque
     l'emplacement est vide), puis ouvre le flux de création de héros
     déjà existant (nom -> héros, voir ui/modal-view.js) pour CE
     nouvel emplacement. */
  createHeroInSlot: function (slotNumber) {
    if (this.hasSlot(slotNumber)) return false; // emplacement déjà occupé, pas de recréation silencieuse
    if (slotNumber < 1 || slotNumber > MAX_HERO_SLOTS) return false;

    if (getActiveSlot() !== slotNumber) saveGame(); // préserve l'emplacement qu'on quitte

    setActiveSlot(slotNumber);

    if (typeof createInitialGameState === "function") {
      // v3.25 : game.saveSupported vient de la détection de
      // fonctionnalité au boot (initSaveSystem()), PAS de l'état d'un
      // héros précis — sans cette préservation explicite, le "wipe"
      // ci-dessous le remet à false (valeur par défaut de
      // createInitialGameState()) et saveGame() se met à échouer
      // silencieusement juste après (son tout premier if la vérifie).
      var keptSaveSupported = game.saveSupported;
      var fresh = createInitialGameState();
      Object.keys(game).forEach(function (k) { delete game[k]; });
      Object.assign(game, fresh);
      game.saveSupported = keptSaveSupported;
    }
    if (typeof ensureGameStateDefaults === "function") ensureGameStateDefaults();
    resumeCombatAfterSlotChange(); // v3.26 : voir la fonction ci-dessus — sans ça, l'écran Combat n'avait aucun ennemi tant que le jeu n'était pas relancé

    // Pas de saveGame() ici : le nouvel emplacement ne doit exister
    // "pour de vrai" (hasSlot() === true) qu'une fois le flux de
    // création de héros complété (confirmHeroSelection()), pas avant
    // — sinon un emplacement "vide" abandonné en cours de création
    // laisserait une coquille derrière lui.

    if (typeof renderAll === "function") renderAll();
    if (typeof openHeroSelection === "function") openHeroSelection();

    return true;
  },

  /* Supprime un emplacement occupé (efface sa sauvegarde) pour
     libérer la place — DESTRUCTIF, l'appelant (UI) doit confirmer
     avant d'appeler ceci. Si c'était l'emplacement ACTIF, bascule
     automatiquement vers le premier emplacement restant occupé (ou
     ouvre la création si plus aucun emplacement n'est occupé). */
  deleteSlot: function (slotNumber) {
    if (!this.hasSlot(slotNumber)) return false;

    var wasActive = getActiveSlot() === slotNumber;
    try {
      localStorage.removeItem(getSlotKey(slotNumber));
    } catch (e) {
      return false;
    }

    if (wasActive) {
      var self = this;
      var fallback = null;
      for (var i = 1; i <= MAX_HERO_SLOTS; i++) {
        if (i !== slotNumber && self.hasSlot(i)) { fallback = i; break; }
      }
      if (fallback) {
        this.switchToSlot(fallback);
      } else {
        // Plus aucun emplacement occupé : repart sur un état neuf,
        // needsHeroSetup() rouvrira naturellement la création.
        setActiveSlot(1);
        if (typeof createInitialGameState === "function") {
          var keptSaveSupported2 = game.saveSupported;
          var fresh = createInitialGameState();
          Object.keys(game).forEach(function (k) { delete game[k]; });
          Object.assign(game, fresh);
          game.saveSupported = keptSaveSupported2;
        }
        if (typeof ensureGameStateDefaults === "function") ensureGameStateDefaults();
        resumeCombatAfterSlotChange(); // v3.26 : même correctif que createHeroInSlot()/switchToSlot()
        if (typeof renderAll === "function") renderAll();
      }
    }

    return true;
  }
};
window.HeroSlotManager = HeroSlotManager;
window.MAX_HERO_SLOTS = MAX_HERO_SLOTS;

function getDefaultQuestProgress() {
  if (typeof DEFAULT_QUEST_PROGRESS !== "undefined" && DEFAULT_QUEST_PROGRESS) {
    return Object.assign({}, DEFAULT_QUEST_PROGRESS);
  }
  return {
    kills: 0,
    treasures: 0,
    bossKills: 0,
    goldEarned: 0,
    goldSpent: 0,
    crits: 0,
    combatTime: 0,
    forestChaptersDone: 0,
    ruinsChaptersDone: 0
  };
}

function getDefaultEquipped() {
  return { weapon: null, armor: null, helmet: null, gloves: null, boots: null, ring: null, amulet: null };
}

/* Fusionne un objet de progression chargé avec un objet de valeurs
   par défaut : garde les nombres valides de `obj`, comble le reste. */
function normalizeProgressMap(obj, fallback) {
  var out = {};
  var src = obj || {};

  Object.keys(fallback).forEach(function (key) {
    out[key] = typeof src[key] === "number" ? src[key] : fallback[key];
  });

  Object.keys(src).forEach(function (key) {
    if (typeof out[key] === "undefined" && typeof src[key] === "number") {
      out[key] = src[key];
    }
  });

  return out;
}

/* D'anciennes sauvegardes stockaient l'id du héros du chaos sous un
   format différent (ex: "ChaosNight" au lieu de "chaosKnight") ;
   cette table de correspondance répare ça au chargement. */
function migrateHeroId(heroId) {
  var map = {
    ChaosNight: "chaosKnight",
    ChaosRanger: "chaosRanger",
    ChaosMage: "chaosMage"
  };
  return map[heroId] || heroId || "";
}

/* Répare game.upgrades/aetherUpgrades pour une sauvegarde chargée :
   renomme les vieux ids d'upgrades (upgradeKeyMap, d'avant que les
   terrains d'entraînement soient renommés en "utrain_*"), puis
   pré-remplit à 0 toute amélioration connue qui manquerait encore. */
function ensureUpgradeDefaults() {
  if (!game.upgrades || typeof game.upgrades !== "object") game.upgrades = {};
  if (!game.aetherUpgrades || typeof game.aetherUpgrades !== "object") game.aetherUpgrades = {};

  var upgradeKeyMap = {
    utap: "utrain_power",
    ucelery: "utrain_celerity",
    ucelerity: "utrain_celerity",
    uprecision: "utrain_precision",
    uwill: "utrain_will",
    uendurance: "utrain_endurance",
    u_crit: "u_crit",
    u_gold: "u_gold",
    u_tap_mult: "u_tap_mult",
    u_crit_mult: "u_crit_mult",
    u_auto_mult: "u_auto_mult",
    u_bounty: "u_bounty"
  };

  Object.keys(upgradeKeyMap).forEach(function(oldKey) {
    var newKey = upgradeKeyMap[oldKey];
    if (game.upgrades[oldKey] != null && game.upgrades[newKey] == null) {
      game.upgrades[newKey] = game.upgrades[oldKey];
    }
  });

  if (typeof UPGRADES !== "undefined" && Array.isArray(UPGRADES)) {
    UPGRADES.forEach(function(u) {
      if (u && u.id != null && game.upgrades[u.id] === undefined) game.upgrades[u.id] = 0;
    });
  }

  if (typeof AETHER_SHOP !== "undefined" && Array.isArray(AETHER_SHOP)) {
    AETHER_SHOP.forEach(function(u) {
      if (u && u.id != null && game.aetherUpgrades[u.id] === undefined) game.aetherUpgrades[u.id] = 0;
    });
  }
}

/* À appeler une fois au boot : détecte si localStorage est utilisable
   (peut échouer en navigation privée sur certains navigateurs), met en
   place l'autosave périodique, et sauvegarde aussi quand l'onglet perd
   le focus ou se ferme (pour ne jamais perdre de progression). */
function initSaveSystem() {
  try {
    localStorage.setItem("__quest_idle_test__", "1");
    localStorage.removeItem("__quest_idle_test__");
    game.saveSupported = true;
  } catch (e) {
    game.saveSupported = false;
  }

  // v3.25 : migration unique de l'ancienne sauvegarde à plat (avant
  // les 3 emplacements de héros) vers l'Emplacement 1 — voir
  // migrateOldSaveToSlot1() plus haut dans ce fichier. Doit tourner
  // AVANT le premier loadGame() de init() (main/boot.js), sinon ce
  // loadGame() chercherait la clé du nouvel emplacement 1 (encore
  // vide) plutôt que l'ancienne clé à plat.
  if (game.saveSupported) migrateOldSaveToSlot1();

  if (saveIntervalId) {
    clearInterval(saveIntervalId);
    saveIntervalId = null;
  }

  saveIntervalId = setInterval(function () {
    saveGame();
  }, AUTO_SAVE_INTERVAL_MS);

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") saveGame();
  });

  window.addEventListener("beforeunload", function () {
    saveGame();
  });
}

/* Construit l'objet JSON exact qui sera stocké dans localStorage.
   TOUT champ persistant de `game` doit être repris ici, sinon il ne
   survivra pas à un rechargement de page. Voir restoreBaseState plus
   bas pour le chemin inverse (lecture). */
function buildSaveData() {
  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    lastOnline: Date.now(),
    gold: Number(game.gold || 0),
    essence: Number(game.essence || 0),
    aether: Number(game.aether || 0),
    totalAetherEarned: Number(game.totalAetherEarned || 0),
    tapDamage: Number(game.tapDamage || 1),
    tapMult: Number(game.tapMult || 1),
    equipFlatTapBonus: Number(game.equipFlatTapBonus || 0),
    autoDps: Number(game.autoDps || 0),
    critChance: Number(game.critChance || 5),
    critMult: Number(game.critMult || 2),
    goldMult: Number(game.goldMult || 1),
    bossGoldBonusPct: Number(game.bossGoldBonusPct || 0),

    trainedStats: game.trainedStats || {
      power: 0,
      endurance: 0,
      celerity: 0,
      precision: 0,
      will: 0
    },

    worldIndex: Number((window.WorldManager && WorldManager.worldIndex) || 0),
    adventureIndex: Number((window.WorldManager && WorldManager.adventureIndex) || 0),
    enemyIndex: Number((window.WorldManager && WorldManager.enemyIndex) || 0),
    totalKills: Number(game.totalKills || 0),
    totalGoldEarned: Number(game.totalGoldEarned || 0),
    totalDamageDealt: Number(game.totalDamageDealt || 0),
    playTime: Number(game.playTime || 0),
    cycleCount: Number(game.cycleCount || 0),
    ascensionCount: Number(game.ascensionCount || 0),
    killCounts: game.killCounts || {},
    upgrades: game.upgrades || {},
    talents: game.talents || {},
    inventory: Array.isArray(game.inventory) ? game.inventory : [],
    equipped: game.equipped || getDefaultEquipped(),
    quests: Array.isArray(game.quests) ? game.quests : [],
    questProgress: game.questProgress || getDefaultQuestProgress(),
    questResetTime: Number(game.questResetTime || 0),
    aetherUpgrades: game.aetherUpgrades || {},
    activeTab: game.activeTab || "combat",
    playerName: game.playerName,
    heroId: game.heroId,
    heroLevel: Number(game.heroLevel || 1),
    heroXp: Number(game.heroXp || 0),
    heroXpToNext: Number(game.heroXpToNext || 10),
    talentPoints: Number(game.talentPoints || 0),
    heroHp: Number(game.heroHp != null ? game.heroHp : (game.heroMaxHp || 10)),
    heroMaxHp: Number(game.heroMaxHp || 10),
    village: game.village || { goldMine: 0, essenceWell: 0, barracks: 0, timeRelay: 0 },
    activePotions: game.activePotions || {},
    pendingPotionBonuses: game.pendingPotionBonuses || { aetherNext: 0 },
    aetherElixirStackCount: Number(game.aetherElixirStackCount || 0),
    equipShopStock: game.equipShopStock || [],
    equipShopResetTime: Number(game.equipShopResetTime || 0),
    equipShopManualRefreshCount: Number(game.equipShopManualRefreshCount || 0),
    dungeonTickets: Number(game.dungeonTickets != null ? game.dungeonTickets : 1),
    dungeonTicketResetTime: Number(game.dungeonTicketResetTime || 0),
    dungeonTicketsPurchasedToday: Number(game.dungeonTicketsPurchasedToday || 0),
    dungeonRun: game.dungeonRun || { active: false, wave: 0, tierId: 1 },
    dungeonBestWave: Number(game.dungeonBestWave || 0),
    dungeonBossClears: Number(game.dungeonBossClears || 0),
    dungeonShards: Number(game.dungeonShards || 0),
    dungeonShopLevels: game.dungeonShopLevels || {},
    // v2.90.11 : oublié lors de l'ajout du déblocage séquentiel des
    // paliers de donjon (v2.90.9) — sans ça, la progression de
    // déblocage se perdait à chaque rechargement de page (jamais
    // sauvegardée). Trouvé en auditant le code pour la doc.
    dungeonTierCleared: game.dungeonTierCleared || {},
    healingPotionsOwned: game.healingPotionsOwned || {},
    potionsOwned: game.potionsOwned || {},
    lastHealUse: Number(game.lastHealUse || 0),
    autoSellEquipment: !!game.autoSellEquipment,
    autoSellRarityThreshold: game.autoSellRarityThreshold || "common",
    lastSpecialUse: Number(game.lastSpecialUse || 0),
    specialBuffExpires: Number(game.specialBuffExpires || 0),
    specialBuffPct: Number(game.specialBuffPct || 0),
    lastDefenseUse: Number(game.lastDefenseUse || 0),
    defenseBuffExpires: Number(game.defenseBuffExpires || 0),
    achievementsClaimed: game.achievementsClaimed || {},
    worldsEverReached: game.worldsEverReached || {},
    worldQuestProgress: game.worldQuestProgress || {},
    worldQuestsCompleted: game.worldQuestsCompleted || {},
    // v3.0 : système Quêtes/Ressources/Territoire (voir data/adventure-quests.js).
    resources: game.resources || { mineraiRare: 0 },
    adventureQuestProgress: game.adventureQuestProgress || {},
    adventureQuestsCompleted: game.adventureQuestsCompleted || {},
    adventureQuestRun: game.adventureQuestRun || { active: false, questId: null },
    campfireLastUsed: game.campfireLastUsed || 0, // v3.7 : cooldown du feu de camp (long repos), voir systems/camp-system.js
    campfireShortLastUsed: game.campfireShortLastUsed || 0, // v3.14 : cooldown du repos court
    activeAfflictions: Object.assign({}, game.activeAfflictions || {}), // v3.20 : voir data/afflictions.js
    dungeonTiersEntered: game.dungeonTiersEntered || {},
    codexChaosSeen: !!game.codexChaosSeen,
    codexRead: game.codexRead || {},
    hasSeenOnboarding: !!game.hasSeenOnboarding
  };
}

/* Écrit la sauvegarde dans localStorage. Renvoie false silencieusement
   si le stockage n'est pas dispo ou en erreur (quota dépassé...) plutôt
   que de faire planter le jeu. */
function saveGame() {
  if (!game.saveSupported) return false;
  try {
    localStorage.setItem(getActiveSaveKey(), JSON.stringify(buildSaveData()));
    game.lastSave = Date.now();
    game.lastOnline = game.lastSave;
    return true;
  } catch (e) {
    return false;
  }
}

/* Recharge une sauvegarde (objet `d` = JSON.parse du localStorage)
   dans `game`. Ne fait AUCUN recalcul de stats dérivées (ça, c'est le
   rôle de StatsSystem.recalcStats(), appelé séparément après). */
function restoreBaseState(d) {
  var questDefaults = getDefaultQuestProgress();

  game.gold = Number(d.gold || 0);
  game.essence = Number(d.essence || 0);
  game.aether = Number(d.aether || 0);
  game.totalAetherEarned = Number(d.totalAetherEarned != null ? d.totalAetherEarned : d.aether || 0);

  game.playerName = d.playerName || "";
  game.heroId = migrateHeroId(d.heroId);

  game.tapDamage = 1;
  game.tapMult = 1;
  game.equipFlatTapBonus = 0;
  game.autoDps = 0;
  game.critChance = 5;
  game.critMult = 2;
  game.goldMult = 1;
  game.bossGoldBonusPct = 0;

  game.trainedStats = (d.trainedStats && typeof d.trainedStats === "object") ? d.trainedStats : { power: 0, endurance: 0, celerity: 0, precision: 0, will: 0 };


  game.heroLevel = Number(d.heroLevel || 1);
  game.heroXp = Number(d.heroXp || 0);
  game.heroXpToNext = Number(d.heroXpToNext || 20);
  game.talentPoints = Number(d.talentPoints || 0);
  game.heroMaxHp = Number(d.heroMaxHp || 10);
  game.heroHp = d.heroHp != null ? Number(d.heroHp) : game.heroMaxHp;

  game.totalKills = Number(d.totalKills || 0);
  game.totalGoldEarned = Number(d.totalGoldEarned || 0);
  game.totalDamageDealt = Number(d.totalDamageDealt || 0);
  game.playTime = Number(d.playTime || 0);
  game.cycleCount = Number(d.cycleCount || 0);
  game.ascensionCount = Number(d.ascensionCount || 0);

  game.killCounts = d.killCounts && typeof d.killCounts === "object" ? d.killCounts : {};
  game.upgrades = d.upgrades && typeof d.upgrades === "object" ? d.upgrades : {};
  game.talents = d.talents && typeof d.talents === "object" ? d.talents : {};
  game.aetherUpgrades = d.aetherUpgrades && typeof d.aetherUpgrades === "object" ? d.aetherUpgrades : {};

  game.inventory = Array.isArray(d.inventory) ? d.inventory : [];
  game.equipped = d.equipped && typeof d.equipped === "object" ? d.equipped : getDefaultEquipped();
  if (game.equipped.weapon === undefined) game.equipped.weapon = null;
  if (game.equipped.armor === undefined) game.equipped.armor = null;
  if (game.equipped.amulet === undefined) game.equipped.amulet = null;
  // v2.83.55 : 4 nouveaux emplacements — anciennes sauvegardes n'ont
  // que weapon/armor/amulet, on comble le reste à null (même filet de
  // sécurité que les 3 emplacements historiques ci-dessus).
  if (game.equipped.helmet === undefined) game.equipped.helmet = null;
  if (game.equipped.gloves === undefined) game.equipped.gloves = null;
  if (game.equipped.boots === undefined) game.equipped.boots = null;
  if (game.equipped.ring === undefined) game.equipped.ring = null;

  game.quests = Array.isArray(d.quests) ? d.quests : [];
  game.questProgress = normalizeProgressMap(d.questProgress, questDefaults);
  game.questResetTime = Number(d.questResetTime || 0);

  game.activeTab = d.activeTab || "combat";
  game.enemy = null;
  game.lastOnline = Number(d.lastOnline || d.savedAt || 0);

  WorldManager.worldIndex = Math.max(0, Number(d.worldIndex || 0));
  WorldManager.adventureIndex = Math.max(0, Number(d.adventureIndex || 0));
  WorldManager.enemyIndex = Math.max(0, Number(d.enemyIndex || 0));

  game.village = d.village && typeof d.village === "object"
    ? d.village
    : { goldMine: 0, essenceWell: 0, barracks: 0, timeRelay: 0 };

  if (window.VillageManager && typeof VillageManager.ensure === "function") {
    VillageManager.ensure();
  }

  if (typeof game.village.goldMine !== "number") game.village.goldMine = 0;
  if (typeof game.village.essenceWell !== "number") game.village.essenceWell = 0;
  if (typeof game.village.barracks !== "number") game.village.barracks = 0;
  if (typeof game.village.timeRelay !== "number") game.village.timeRelay = 0;

  game.activePotions = d.activePotions && typeof d.activePotions === "object" ? d.activePotions : {};
  game.pendingPotionBonuses = d.pendingPotionBonuses && typeof d.pendingPotionBonuses === "object"
    ? d.pendingPotionBonuses
    : { aetherNext: 0 };
  if (typeof game.pendingPotionBonuses.aetherNext !== "number") game.pendingPotionBonuses.aetherNext = 0;
  game.aetherElixirStackCount = Number(d.aetherElixirStackCount || 0);

  game.equipShopStock = Array.isArray(d.equipShopStock) ? d.equipShopStock : [];
  game.equipShopResetTime = Number(d.equipShopResetTime || 0);
  game.equipShopManualRefreshCount = Number(d.equipShopManualRefreshCount || 0);

  game.dungeonTickets = typeof d.dungeonTickets === "number" ? d.dungeonTickets : 1;
  game.dungeonTicketResetTime = Number(d.dungeonTicketResetTime || 0);
  game.dungeonTicketsPurchasedToday = Number(d.dungeonTicketsPurchasedToday || 0);
  game.dungeonRun = d.dungeonRun && typeof d.dungeonRun === "object" ? d.dungeonRun : { active: false, wave: 0, tierId: 1 };
  if (typeof game.dungeonRun.tierId !== "number") game.dungeonRun.tierId = 1;
  game.dungeonBestWave = Number(d.dungeonBestWave || 0);
  game.dungeonBossClears = Number(d.dungeonBossClears || 0);
  game.dungeonShards = Number(d.dungeonShards || 0);
  game.dungeonShopLevels = d.dungeonShopLevels && typeof d.dungeonShopLevels === "object" ? d.dungeonShopLevels : {};
  // v2.90.11 : voir buildSaveData() ci-dessus, même correctif.
  game.dungeonTierCleared = d.dungeonTierCleared && typeof d.dungeonTierCleared === "object" ? d.dungeonTierCleared : {};
  game.healingPotionsOwned = d.healingPotionsOwned && typeof d.healingPotionsOwned === "object" ? d.healingPotionsOwned : {};
  game.potionsOwned = d.potionsOwned && typeof d.potionsOwned === "object" ? d.potionsOwned : {};
  game.lastHealUse = Number(d.lastHealUse || 0);
  game.autoSellEquipment = !!d.autoSellEquipment;
  game.autoSellRarityThreshold = (typeof d.autoSellRarityThreshold === "string") ? d.autoSellRarityThreshold : "common";
  game.lastSpecialUse = Number(d.lastSpecialUse || 0);
  game.specialBuffExpires = Number(d.specialBuffExpires || 0);
  game.specialBuffPct = Number(d.specialBuffPct || 0);
  game.lastDefenseUse = Number(d.lastDefenseUse || 0);
  game.defenseBuffExpires = Number(d.defenseBuffExpires || 0);
  game.achievementsClaimed = d.achievementsClaimed && typeof d.achievementsClaimed === "object" ? d.achievementsClaimed : {};
  game.worldsEverReached = d.worldsEverReached && typeof d.worldsEverReached === "object" ? d.worldsEverReached : {};
  game.worldQuestProgress = d.worldQuestProgress && typeof d.worldQuestProgress === "object" ? d.worldQuestProgress : {};
  game.worldQuestsCompleted = d.worldQuestsCompleted && typeof d.worldQuestsCompleted === "object" ? d.worldQuestsCompleted : {};
  // v3.0 : système Quêtes/Ressources/Territoire (voir data/adventure-quests.js).
  game.resources = d.resources && typeof d.resources === "object" ? d.resources : { mineraiRare: 0 };
  if (typeof game.resources.mineraiRare !== "number") game.resources.mineraiRare = 0;
  game.adventureQuestProgress = d.adventureQuestProgress && typeof d.adventureQuestProgress === "object" ? d.adventureQuestProgress : {};
  game.adventureQuestsCompleted = d.adventureQuestsCompleted && typeof d.adventureQuestsCompleted === "object" ? d.adventureQuestsCompleted : {};
  game.adventureQuestRun = d.adventureQuestRun && typeof d.adventureQuestRun === "object" ? d.adventureQuestRun : { active: false, questId: null };
  game.campfireLastUsed = typeof d.campfireLastUsed === "number" ? d.campfireLastUsed : 0;
  game.campfireShortLastUsed = typeof d.campfireShortLastUsed === "number" ? d.campfireShortLastUsed : 0;
  game.activeAfflictions = (d.activeAfflictions && typeof d.activeAfflictions === "object") ? d.activeAfflictions : {};
  game.dungeonTiersEntered = d.dungeonTiersEntered && typeof d.dungeonTiersEntered === "object" ? d.dungeonTiersEntered : {};
  game.codexChaosSeen = !!d.codexChaosSeen;
  game.codexRead = d.codexRead && typeof d.codexRead === "object" ? d.codexRead : {};
  game.hasSeenOnboarding = !!d.hasSeenOnboarding;

  ensureUpgradeDefaults();
}

/* Remet les stats de base avant de laisser StatsSystem.recalcStats()
   reconstruire tout par-dessus — évite d'accumuler d'anciennes
   valeurs si cette fonction est appelée plusieurs fois. */
function reapplyProgressEffects() {
  game.tapDamage = 1;
  game.tapMult = 1;
  game.equipFlatTapBonus = 0;
  game.autoDps = 0;
  game.critChance = 5;
  game.critMult = 2;
  game.goldMult = 1;
  game.bossGoldBonusPct = 0;

  if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") {
    StatsSystem.recalcStats();
  }
}

/* Point d'entrée principal pour charger la partie au démarrage :
   lit le JSON de localStorage, restaure l'état, recalcule les stats,
   et vérifie si les quêtes journalières doivent être régénérées.
   Renvoie false (sans planter) si rien n'est sauvegardé ou en cas
   d'erreur de parsing. */
function loadGame() {
  if (!game.saveSupported) return false;

  try {
    var raw = localStorage.getItem(getActiveSaveKey());
    if (!raw) return false;

    var d = JSON.parse(raw);
    if (!d || typeof d !== "object") return false;

    restoreBaseState(d);
    reapplyProgressEffects();

    if (window.QuestManager && typeof QuestManager.checkReset === "function") {
      QuestManager.checkReset();
    }

    return true;
  } catch (e) {
    return false;
  }
}

function clearSaveData() {
  if (!game.saveSupported) return;
  try {
    localStorage.removeItem(getActiveSaveKey());
  } catch (e) {}
}

/* Reset "ascension" : réinitialise la progression classique (or, dégâts,
   monde, inventaire, talents, niveau du héros...) mais CONSERVE l'Aether,
   le nombre d'ascensions et les améliorations Aether (kept* ci-dessous).
   Appelée par ascendNow() en progression-system.js. */
function hardResetState() {
  var questDefaults = getDefaultQuestProgress();
  var keptAether = game.aether || 0;
  var keptTotalAetherEarned = game.totalAetherEarned || 0;
  var keptAscensions = game.ascensionCount || 0;
  var keptAetherUpgrades = Object.assign({}, game.aetherUpgrades || {});

  // v2.26 : la progression VRAIMENT permanente (indépendante de la
  // run en cours) doit survivre à l'ascension, comme l'Aether et sa
  // boutique le faisaient déjà — sinon chaque ascension effaçait
  // silencieusement le Codex, les hauts faits, la boutique du
  // donjon, etc. Ce qui reste lié à la run "classique" (or, potions,
  // stock de soin...) continue de repartir à zéro normalement.
  var keptAchievementsClaimed = Object.assign({}, game.achievementsClaimed || {});
  var keptWorldsEverReached = Object.assign({}, game.worldsEverReached || {});
  var keptWorldQuestProgress = Object.assign({}, game.worldQuestProgress || {});
  var keptWorldQuestsCompleted = Object.assign({}, game.worldQuestsCompleted || {});
  // v3.0 : système Quêtes/Ressources/Territoire — les ressources rares
  // et la progression des quêtes d'aventure sont une progression
  // permanente au même titre que les questlines de monde ci-dessus.
  var keptResources = Object.assign({ mineraiRare: 0 }, game.resources || {});
  var keptAdventureQuestProgress = Object.assign({}, game.adventureQuestProgress || {});
  var keptAdventureQuestsCompleted = Object.assign({}, game.adventureQuestsCompleted || {});
  var keptDungeonTiersEntered = Object.assign({}, game.dungeonTiersEntered || {});
  var keptCodexChaosSeen = !!game.codexChaosSeen;
  var keptCodexRead = Object.assign({}, game.codexRead || {});
  // v3.14 : les quêtes journalières ne doivent plus se réinitialiser à
  // l'ascension (seulement au reset complet) — avant, elles étaient
  // effacées comme le reste de la "run classique" (or, potions...),
  // ce qui n'a pas vraiment de sens : rien dans la journée du joueur
  // n'a changé juste parce qu'il a ascensionné.
  var keptQuests = Array.isArray(game.quests) ? game.quests.slice() : [];
  var keptQuestProgress = Object.assign({}, game.questProgress || {});
  var keptQuestResetTime = game.questResetTime || 0;
  var keptDungeonShopLevels = Object.assign({}, game.dungeonShopLevels || {});
  // v2.90.11 : voir note dans buildSaveData() — la progression de
  // déblocage séquentiel des paliers de donjon est une progression
  // permanente au même titre que dungeonBossClears/dungeonShopLevels,
  // doit survivre à l'ascension comme eux.
  var keptDungeonTierCleared = Object.assign({}, game.dungeonTierCleared || {});
  var keptDungeonShards = Number(game.dungeonShards || 0);
  var keptDungeonBestWave = Number(game.dungeonBestWave || 0);
  var keptDungeonBossClears = Number(game.dungeonBossClears || 0);
  var keptDungeonTickets = Number(game.dungeonTickets != null ? game.dungeonTickets : 1);
  var keptDungeonTicketResetTime = Number(game.dungeonTicketResetTime || 0);
  var keptDungeonTicketsPurchasedToday = Number(game.dungeonTicketsPurchasedToday || 0);
  var keptEquipShopStock = game.equipShopStock || [];
  var keptEquipShopResetTime = Number(game.equipShopResetTime || 0);
  var keptEquipShopManualRefreshCount = Number(game.equipShopManualRefreshCount || 0);
  var keptVillage = Object.assign({ goldMine: 0, essenceWell: 0, barracks: 0, timeRelay: 0, watchtower: 0, sanctuary: 0 }, game.village || {});
  // v3.14 : le réglage d'autovente n'est PLUS conservé à l'ascension —
  // logique, puisque tout l'équipement équipé/en sac est perdu à
  // l'ascension (game.inventory/equipped repartent à zéro juste en
  // dessous) ; garder un seuil de rareté configuré sur un sac
  // désormais vide n'avait pas de sens. Remis aux valeurs par défaut,
  // comme le fait déjà fullResetState().
  var keptHasSeenOnboarding = !!game.hasSeenOnboarding;

  game.gold = 0;
  game.essence = 0;
  game.aether = keptAether;
  game.totalAetherEarned = keptTotalAetherEarned;

  game.tapDamage = 1;
  game.tapMult = 1;
  game.equipFlatTapBonus = 0;
  game.autoDps = 0;
  game.critChance = 5;
  game.critMult = 2;
  game.goldMult = 1;
  game.bossGoldBonusPct = 0;
  game.essenceGlobalMult = 1;
  game.heroDefensePct = 0;

  game.trainedStats = { power: 0, endurance: 0, celerity: 0, precision: 0, will: 0 };

  game.heroLevel = 1;
  game.heroXp = 0;
  game.heroXpToNext = 20;
  game.talentPoints = 0;
  game.heroHp = 10;
  game.heroMaxHp = 10;

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
  game.equipped = getDefaultEquipped();
  game.quests = keptQuests;
  game.questProgress = keptQuestProgress;
  game.questResetTime = keptQuestResetTime;
  game.activeTab = "combat";
  game.enemy = null;
  game.lastOnline = Date.now();
  game.lastSave = 0;
  game.village = keptVillage;

  game.equipShopStock = keptEquipShopStock;
  game.equipShopResetTime = keptEquipShopResetTime;
  game.equipShopManualRefreshCount = keptEquipShopManualRefreshCount;

  game.activePotions = {};
  game.pendingPotionBonuses = { aetherNext: 0 };
  game.aetherElixirStackCount = 0;
  game.healingPotionsOwned = {};
  game.potionsOwned = {};
  game.lastHealUse = 0;

  game.dungeonTickets = keptDungeonTickets;
  game.dungeonTicketResetTime = keptDungeonTicketResetTime;
  game.dungeonTicketsPurchasedToday = keptDungeonTicketsPurchasedToday;
  game.dungeonRun = { active: false, wave: 0, tierId: 1 };
  // v3.2 : le run de quête en cours ne survit pas à l'ascension, même
  // traitement que dungeonRun juste au-dessus (la PROGRESSION déjà
  // enregistrée sur les étapes, elle, est conservée séparément —
  // keptAdventureQuestProgress/keptAdventureQuestsCompleted plus haut).
  game.adventureQuestRun = { active: false, questId: null };
  game.dungeonBestWave = keptDungeonBestWave;
  game.dungeonBossClears = keptDungeonBossClears;
  game.dungeonShards = keptDungeonShards;
  game.dungeonShopLevels = keptDungeonShopLevels;
  game.dungeonTierCleared = keptDungeonTierCleared;

  game.achievementsClaimed = keptAchievementsClaimed;

  game.worldsEverReached = keptWorldsEverReached;
  game.worldQuestProgress = keptWorldQuestProgress;
  game.worldQuestsCompleted = keptWorldQuestsCompleted;
  game.resources = keptResources;
  game.adventureQuestProgress = keptAdventureQuestProgress;
  game.adventureQuestsCompleted = keptAdventureQuestsCompleted;
  game.dungeonTiersEntered = keptDungeonTiersEntered;
  game.codexChaosSeen = keptCodexChaosSeen;
  game.codexRead = keptCodexRead;

  game.lastSpecialUse = 0;
  game.specialBuffExpires = 0;
  game.specialBuffPct = 0;
  game.lastDefenseUse = 0;
  game.defenseBuffExpires = 0;

  game.autoSellEquipment = false;
  game.autoSellRarityThreshold = "common";
  game.hasSeenOnboarding = keptHasSeenOnboarding;

  WorldManager.worldIndex = 0;
  WorldManager.adventureIndex = 0;
  WorldManager.enemyIndex = 0;
  if (typeof WorldManager.markWorldReached === "function") WorldManager.markWorldReached(0);

  if (typeof ensureUpgradeDefaults === "function") ensureUpgradeDefaults();

  if (typeof gameLog !== "undefined" && Array.isArray(gameLog)) gameLog.length = 0;

  // v3.14 : PLUS de régénération forcée des quêtes journalières ici —
  // ce bloc écrasait silencieusement le "kept" plus haut
  // (game.quests/questProgress/questResetTime), qui avait beau les
  // conserver, cette régénération inconditionnelle les remplaçait
  // quand même juste avant la fin de la fonction. Les quêtes
  // journalières ne doivent plus du tout être affectées par
  // l'ascension — QuestManager gère déjà tout seul leur renouvellement
  // normal via game.questResetTime (ailleurs, au fil du jeu).

  reapplyProgressEffects();

  if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") {StatsSystem.recalcStats();}
  game.heroHp = game.heroMaxHp;

}

/* Reset "complet" (bouton "Réinitialiser tout" des Paramètres) : efface
   VRAIMENT tout, y compris l'Aether et le choix de héros — c'est
   repartir d'une partie neuve. Contrairement à hardResetState, rien
   n'est conservé. Note : redonne 1 000 000 d'or de départ (probablement
   un réglage de debug/confort, à surveiller si le jeu est publié tel quel). */
function fullResetState() {
  var questDefaults = getDefaultQuestProgress();

  // v2.26 : plus d'or de confort au reset complet (était 1 000 000,
  // un réglage de test qui n'avait pas sa place dans un vrai reset).
  game.gold = 0;
  game.essence = 0;
  game.aether = 0;
  game.totalAetherEarned = 0;
  game.playerName = "";
  game.heroId = "";

  game.tapDamage = 1;
  game.tapMult = 1;
  game.equipFlatTapBonus = 0;
  game.autoDps = 0;
  game.critChance = 5;
  game.critMult = 2;
  game.goldMult = 1;
  game.bossGoldBonusPct = 0;
  game.essenceGlobalMult = 1;
  game.heroDefensePct = 0;

  game.trainedStats = { power: 0, endurance: 0, celerity: 0, precision: 0, will: 0 };

  game.heroLevel = 1;
  game.heroXp = 0;
  game.heroXpToNext = 20;
  game.talentPoints = 0;
  game.heroHp = 10;
  game.heroMaxHp = 10;

  game.totalKills = 0;
  game.totalGoldEarned = 0;
  game.totalDamageDealt = 0;
  game.playTime = 0;
  game.cycleCount = 0;
  game.ascensionCount = 0;

  game.killCounts = {};
  game.upgrades = {};
  game.talents = {};
  game.aetherUpgrades = {};
  game.inventory = [];
  game.equipped = getDefaultEquipped();
  game.quests = [];
  game.questProgress = Object.assign({}, questDefaults);
  game.questResetTime = 0;
  game.activeTab = "combat";
  game.enemy = null;
  game.lastOnline = Date.now();
  game.lastSave = 0;
  game.village = { goldMine: 0, essenceWell: 0, barracks: 0, timeRelay: 0, watchtower: 0, sanctuary: 0 };

  // v2.26 : tous les systèmes ajoutés depuis la première version de
  // fullResetState() — oubliés jusqu'ici, un reset "complet" ne
  // l'était donc pas vraiment.
  game.equipShopStock = [];
  game.equipShopResetTime = 0;
  game.equipShopManualRefreshCount = 0;

  game.activePotions = {};
  game.pendingPotionBonuses = { aetherNext: 0 };
  game.aetherElixirStackCount = 0;
  game.healingPotionsOwned = {};
  game.potionsOwned = {};
  game.lastHealUse = 0;

  game.dungeonRun = { active: false, wave: 0, tierId: 1 };
  game.adventureQuestRun = { active: false, questId: null };
  game.campfireLastUsed = 0; // v3.7 : repos gratuit du Campement — repart bien à zéro sur un reset complet
  game.campfireShortLastUsed = 0; // v3.14 : idem pour le repos court
  game.activeAfflictions = {}; // v3.20 : remis à zéro sur un reset complet (conservé à l'ascension)
  game.dungeonBossClears = 0;
  game.dungeonShards = 0;
  game.dungeonShopLevels = {};
  // v2.90.11 : voir note dans buildSaveData() — repart bien à zéro
  // sur un reset complet, comme dungeonBossClears/dungeonShopLevels.
  game.dungeonTierCleared = {};

  game.worldsEverReached = {};
  game.worldQuestProgress = {};
  game.worldQuestsCompleted = {};
  // v3.0 : système Quêtes/Ressources/Territoire — repart bien à zéro
  // sur un reset complet, comme worldQuestProgress ci-dessus.
  game.resources = { mineraiRare: 0 };
  game.adventureQuestProgress = {};
  game.adventureQuestsCompleted = {};
  game.dungeonTiersEntered = {};
  game.codexChaosSeen = false;
  game.codexRead = {};

  game.lastSpecialUse = 0;
  game.specialBuffExpires = 0;
  game.specialBuffPct = 0;
  game.lastDefenseUse = 0;
  game.defenseBuffExpires = 0;

  game.autoSellEquipment = false;
  game.autoSellRarityThreshold = "common";
  game.hasSeenOnboarding = false;

  WorldManager.worldIndex = 0;
  WorldManager.adventureIndex = 0;
  WorldManager.enemyIndex = 0;
  if (typeof WorldManager.markWorldReached === "function") WorldManager.markWorldReached(0);

  if (typeof ensureUpgradeDefaults === "function") ensureUpgradeDefaults();

  if (typeof gameLog !== "undefined" && Array.isArray(gameLog)) gameLog.length = 0;

  if (window.QuestManager && typeof QuestManager.generateDaily === "function") {
    game.quests = QuestManager.generateDaily();
    var resetHours = (typeof QUEST_CONFIG !== "undefined" && QUEST_CONFIG && QUEST_CONFIG.resetHours) ? QUEST_CONFIG.resetHours : 24;
    game.questResetTime = Date.now() + resetHours * 3600 * 1000;
  }

  reapplyProgressEffects();

  if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") {StatsSystem.recalcStats();}
  game.heroHp = game.heroMaxHp;
}

/* Bouton "Réinitialiser tout" des Paramètres : demande confirmation
   (action irréversible) puis efface la sauvegarde et appelle
   fullResetState(). */
function resetGame() {
  var doReset = function () {
    clearSaveData();
    fullResetState();

    if (window.CombatEngine && typeof CombatEngine.spawnEnemy === "function") {
      CombatEngine.spawnEnemy();
    }

    if (typeof renderAll === "function") renderAll();
    // v3.7 : bug latent découvert en auditant les flux de bascule
    // d'onglet pour le Campement — sans cet appel, l'affichage restait
    // figé sur l'écran d'où le reset a été déclenché (typiquement
    // Paramètres, hors combat) au lieu de refléter le nouvel
    // activeTab="combat" fixé par fullResetState(). Même correctif que
    // main/boot.js (switchTab() plutôt que de compter sur l'état CSS
    // par défaut).
    if (typeof switchTab === "function") switchTab(game.activeTab || "combat");
    if (typeof updateQuestBadge === "function") updateQuestBadge();

    saveGame();
    if (typeof showToast === "function") showToast("Partie réinitialisée", 1200);
  };

  if (typeof showConfirmModal === "function") {
    showConfirmModal(
      "Réinitialiser TOUT ?",
      "Cette action efface toute la progression, y compris l'Aether et les ascensions. Cette action est irréversible.",
      "⚠️",
      doReset
    );
  } else if (window.confirm("Réinitialiser toute la progression ?")) {
    doReset();
  }
}

window.initSaveSystem = initSaveSystem;
window.saveGame = saveGame;
window.loadGame = loadGame;
window.resetGame = resetGame;
window.clearSaveData = clearSaveData;
window.hardResetState = hardResetState;
window.fullResetState = fullResetState;
window.buildSaveData = buildSaveData;
window.restoreBaseState = restoreBaseState;
window.reapplyProgressEffects = reapplyProgressEffects;
window.ensureUpgradeDefaults = ensureUpgradeDefaults;
window.migrateHeroId = migrateHeroId;

/* ============================================================
   v2.9 : export/import de sauvegarde. Toute la partie repose sur le
   localStorage du navigateur (rien côté serveur) — un simple export
   en fichier JSON sert de filet de sécurité en cas de changement
   d'appareil, de nettoyage du cache, etc. Deux façons d'exporter/
   importer : fichier téléchargé (le plus simple) ou code texte à
   copier/coller (repli si le téléchargement de fichier ne convient
   pas dans le contexte où tourne le jeu).
============================================================ */

/* Génère le JSON de sauvegarde et déclenche son téléchargement comme
   fichier .json (le navigateur choisit où l'enregistrer). */
/* v3.29 : construit le payload d'export COMPLET (tous les emplacements
   de héros occupés), partagé par exportSaveToFile() et
   showExportTextModal() ci-dessous — évite de dupliquer la logique de
   collecte entre le fichier téléchargé et le code texte copié/collé. */
function buildMultiSaveExportPayload() {
  saveGame(); // l'emplacement actif doit être à jour avant de lire les autres

  var slots = {};
  var maxSlots = window.MAX_HERO_SLOTS || 3;
  for (var i = 1; i <= maxSlots; i++) {
    if (window.HeroSlotManager && HeroSlotManager.hasSlot(i)) {
      try {
        var raw = localStorage.getItem(getSlotKey(i));
        if (raw) slots[i] = JSON.parse(raw);
      } catch (e) {}
    }
  }

  return {
    aethervaleMultiSave: true,
    exportVersion: 1,
    activeSlot: getActiveSlot(),
    slots: slots
  };
}

/* Génère le JSON de sauvegarde et déclenche son téléchargement comme
   fichier .json (le navigateur choisit où l'enregistrer). */
/* v3.29 : bug corrigé — n'exportait QUE l'emplacement actif
   (buildSaveData() ne lit que le `game` en mémoire), les 2 autres
   héros (stockés dans leurs propres clés localStorage depuis le
   système multi-héros, v3.25) n'étaient jamais inclus dans le
   fichier. Exporte maintenant TOUS les emplacements occupés, dans un
   nouveau format enveloppe ({ aethervaleMultiSave: true, slots: {...} }).
   Reste capable d'IMPORTER l'ancien format à un seul héros (voir
   applyImportedSave() plus bas) — juste l'export qui change. */
function exportSaveToFile() {
  var payload = buildMultiSaveExportPayload();
  var json = JSON.stringify(payload, null, 2);
  var blob = new Blob([json], { type: "application/json" });
  var url = URL.createObjectURL(blob);

  var date = new Date().toISOString().slice(0, 10);
  var a = document.createElement("a");
  a.href = url;
  a.download = "quest-idle-save-" + date + ".json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  var slotCount = Object.keys(payload.slots).length;
  showToast("💾 Sauvegarde exportée (" + slotCount + " héros)", 1800);
}

/* Affiche le JSON de sauvegarde dans une modale texte, à copier
   manuellement — repli pratique si le téléchargement de fichier ne
   convient pas. */
function showExportTextModal() {
  var host = document.getElementById("export-text-root");
  if (!host) return;
  // v3.29 : même correctif que exportSaveToFile() — inclut maintenant
  // tous les emplacements de héros occupés, pas seulement l'actif.
  var json = JSON.stringify(buildMultiSaveExportPayload());

  host.innerHTML = ''
    + '<div class="full-menu-overlay" onclick="if (event.target === this) closeExportTextModal();">'
    +   '<div class="full-menu" style="max-height:75vh;">'
    +     '<div class="full-menu-header"><h2>Code de sauvegarde</h2><button class="full-menu-close" type="button" onclick="closeExportTextModal()">✕</button></div>'
    +     '<div class="export-text-body">'
    +       '<p>Copie ce texte et garde-le en lieu sûr. Tu pourras le recoller via "Importer un code" pour restaurer cette progression.</p>'
    +       '<textarea readonly id="export-text-area" class="export-textarea">' + esc(json) + '</textarea>'
    +       '<button class="settings-btn" type="button" onclick="copyExportText()">📋 Copier</button>'
    +     '</div>'
    +   '</div>'
    + '</div>';
}

/* Modale d'import par copier/coller (symétrique de showExportTextModal). */
function showImportTextModal() {
  var host = document.getElementById("export-text-root");
  if (!host) return;

  host.innerHTML = ''
    + '<div class="full-menu-overlay" onclick="if (event.target === this) closeExportTextModal();">'
    +   '<div class="full-menu" style="max-height:75vh;">'
    +     '<div class="full-menu-header"><h2>Importer un code</h2><button class="full-menu-close" type="button" onclick="closeExportTextModal()">✕</button></div>'
    +     '<div class="export-text-body">'
    +       '<p>Colle ici un code de sauvegarde exporté précédemment. Ça remplacera ta progression actuelle.</p>'
    +       '<textarea id="import-text-area" class="export-textarea" placeholder="Colle le code ici..."></textarea>'
    +       '<button class="settings-btn" type="button" onclick="importSaveFromText(document.getElementById(\'import-text-area\').value)">📥 Importer ce code</button>'
    +     '</div>'
    +   '</div>'
    + '</div>';
}

function closeExportTextModal() {
  var host = document.getElementById("export-text-root");
  if (host) host.innerHTML = "";
}

function copyExportText() {
  var area = document.getElementById("export-text-area");
  if (!area) return;
  area.select();

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(area.value)
      .then(function () { showToast("📋 Copié !", 1200); })
      .catch(function () { showToast("Sélectionne et copie manuellement", 1500); });
  } else {
    try {
      document.execCommand("copy");
      showToast("📋 Copié !", 1200);
    } catch (e) {
      showToast("Sélectionne et copie manuellement", 1500);
    }
  }
}

/* Vérifie grossièrement qu'un objet ressemble à une sauvegarde Quest
   Idle avant de l'appliquer — évite d'écraser la partie avec un
   fichier/texte quelconque collé par erreur. */
function looksLikeQuestIdleSave(d) {
  return !!(d && typeof d === "object" &&
    typeof d.gold === "number" &&
    typeof d.heroId === "string" &&
    d.equipped !== undefined &&
    d.talents !== undefined);
}

/* v3.29 : détecte le NOUVEAU format d'export multi-héros (voir
   buildMultiSaveExportPayload() plus haut) — { aethervaleMultiSave:
   true, slots: {...} }, un ou plusieurs héros complets. */
function looksLikeMultiSave(d) {
  return !!(d && typeof d === "object" && d.aethervaleMultiSave === true &&
    d.slots && typeof d.slots === "object" && Object.keys(d.slots).length > 0);
}

/* Applique une sauvegarde importée (objet déjà parsé), après
   confirmation explicite — remplace TOUTE la progression actuelle.
   v3.29 : reconnaît maintenant DEUX formats — le nouveau
   (aethervaleMultiSave, plusieurs héros à la fois) ET l'ancien (un
   seul héros, pour rester compatible avec les fichiers exportés
   avant ce correctif) — voir looksLikeMultiSave()/looksLikeQuestIdleSave()
   juste au-dessus. */
function applyImportedSave(data) {
  var isMulti = looksLikeMultiSave(data);
  var isSingle = !isMulti && looksLikeQuestIdleSave(data);

  if (!isMulti && !isSingle) {
    showToast("❌ Fichier invalide (pas une sauvegarde Aethervale)", 2200);
    return;
  }

  var doImport = function () {
    if (isMulti) {
      // Écrit CHAQUE emplacement du fichier dans sa clé localStorage
      // dédiée — remplace entièrement ce qui existait avant à ces
      // emplacements (les emplacements NON présents dans le fichier,
      // s'il y en a, restent inchangés).
      var maxSlots = window.MAX_HERO_SLOTS || 3;
      var importedCount = 0;
      Object.keys(data.slots).forEach(function (slotKey) {
        var slotNum = parseInt(slotKey, 10);
        if (slotNum < 1 || slotNum > maxSlots) return;
        var slotData = data.slots[slotKey];
        if (!slotData) return;
        try {
          localStorage.setItem(getSlotKey(slotNum), JSON.stringify(slotData));
          importedCount++;
        } catch (e) {}
      });

      var targetSlot = (data.activeSlot && data.slots[data.activeSlot]) ? Number(data.activeSlot) : Number(Object.keys(data.slots)[0]);
      setActiveSlot(targetSlot);

      // Repart d'un état neuf avant de charger l'emplacement importé
      // (même précaution que HeroSlotManager.switchToSlot()).
      if (typeof createInitialGameState === "function") {
        var keptSaveSupported = game.saveSupported;
        var fresh = createInitialGameState();
        Object.keys(game).forEach(function (k) { delete game[k]; });
        Object.assign(game, fresh);
        game.saveSupported = keptSaveSupported;
      }
      loadGame();
      if (typeof ensureGameStateDefaults === "function") ensureGameStateDefaults();
      if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") StatsSystem.recalcStats();
      if (typeof resumeCombatAfterSlotChange === "function") resumeCombatAfterSlotChange();

      if (typeof renderAll === "function") renderAll();
      showToast("✅ Sauvegarde importée (" + importedCount + " héros)", 2000);
      addLog("📥 Sauvegarde multi-héros importée (" + importedCount + " héros).", "event");
    } else {
      // Ancien format (un seul héros) — importe dans l'EMPLACEMENT
      // ACTIF uniquement, comportement identique à avant ce correctif.
      restoreBaseState(data);
      reapplyProgressEffects();

      if (window.QuestManager && typeof QuestManager.checkReset === "function") {
        QuestManager.checkReset();
      }
      if (window.CombatEngine && typeof CombatEngine.spawnEnemy === "function") {
        CombatEngine.spawnEnemy();
      }

      saveGame();
      if (typeof renderAll === "function") renderAll();
      showToast("✅ Sauvegarde importée", 1800);
      addLog("📥 Sauvegarde importée.", "event");
    }
  };

  // Ferme la modale d'import (copier/coller) AVANT d'ouvrir la
  // confirmation, sinon les deux se superposent et bloquent le clic.
  if (typeof closeExportTextModal === "function") closeExportTextModal();

  var confirmMsg = isMulti
    ? "Ceci va REMPLACER la progression des héros présents dans ce fichier (" + Object.keys(data.slots).length + "). Cette action est irréversible."
    : "Ceci va REMPLACER toute la progression de l'emplacement ACTIF par celle importée. Cette action est irréversible.";

  if (typeof showConfirmModal === "function") {
    showConfirmModal("Importer cette sauvegarde ?", confirmMsg, "📥", doImport);
  } else if (window.confirm(confirmMsg)) {
    doImport();
  }
}

/* Lit le fichier choisi via l'input caché (voir index.html) et tente
   de l'importer comme sauvegarde. */
function importSaveFromFile(fileInput) {
  var file = fileInput && fileInput.files && fileInput.files[0];
  if (!file) return;

  var reader = new FileReader();
  reader.onload = function (e) {
    try {
      var data = JSON.parse(e.target.result);
      applyImportedSave(data);
    } catch (err) {
      showToast("❌ Fichier illisible (JSON invalide)", 2200);
    }
    fileInput.value = "";
  };
  reader.onerror = function () {
    showToast("❌ Erreur de lecture du fichier", 1800);
  };
  reader.readAsText(file);
}

function importSaveFromText(text) {
  try {
    var data = JSON.parse(text);
    applyImportedSave(data);
  } catch (err) {
    showToast("❌ Texte invalide (JSON incorrect)", 2200);
  }
}

function triggerImportFilePicker() {
  var input = document.getElementById("import-save-file-input");
  if (input) input.click();
}

window.exportSaveToFile = exportSaveToFile;
window.showExportTextModal = showExportTextModal;
window.showImportTextModal = showImportTextModal;
window.closeExportTextModal = closeExportTextModal;
window.copyExportText = copyExportText;
window.importSaveFromFile = importSaveFromFile;
window.importSaveFromText = importSaveFromText;
window.triggerImportFilePicker = triggerImportFilePicker;
