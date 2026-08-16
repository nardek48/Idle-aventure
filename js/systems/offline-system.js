"use strict";
/* ============================================================
Quest Idle — systems/offline-system.js
Le village (6 bâtiments achetables en or, chacun améliore un aspect
des gains hors-ligne) et le calcul des récompenses hors-ligne
(OfflineManager), déclenché au boot si le joueur était absent.
============================================================ */

/* Catalogue des bâtiments du village. Chaque bâtiment n'affecte QUE le
   hors-ligne (jamais les gains en jeu actif) — voir
   VillageManager.getOfflineBonuses() pour le détail de chaque effet.
   v2.90 : noms affichés (name) remis au goût du nouveau visuel de
   carte (voir ui/village-view.js) — IDs, coûts, effets et formules
   STRICTEMENT inchangés, seul l'habillage textuel change :
     goldMine     "Mine d'or"            -> "Mine d'Or"            (inchangé, casse mise à jour)
     essenceWell  "Puits d'essence"      -> "Hutte de l'Alchimiste"
     barracks     "Caserne"              -> "Caserne"              (inchangé)
     timeRelay    "Relais du temps"      -> "Tour des Mages"
     watchtower   "Vigie"                -> "Hôtel de Ville"
     sanctuary    "Sanctuaire d'Aether"  -> "Atelier de Forgeron"  (l'utilisateur envisage de le retirer plus tard) */
var VILLAGE_CONFIG = {
  goldMine: { name: "Mine d'Or", desc: "Multiplie l'or gagné hors-ligne (kills simulés par l'Hôtel de Ville).", baseCost: 250, costMult: 1.65, maxLevel: 25 },
  essenceWell: { name: "Hutte de l'Alchimiste", desc: "Ajoute de l'essence gagnée hors-ligne.", baseCost: 400, costMult: 1.75, maxLevel: 20 },
  barracks: { name: "Caserne", desc: "Améliore l'efficacité hors-ligne.", baseCost: 600, costMult: 1.8, maxLevel: 20 },
  timeRelay: { name: "Tour des Mages", desc: "Augmente la durée maximale des gains hors-ligne.", baseCost: 900, costMult: 2, maxLevel: 10 },
  watchtower: { name: "Hôtel de Ville", desc: "Simule des combats en continu (hors-ligne ET en jeu, même hors de l'écran Combat) : kills (qui rapportent l'or via la Mine d'Or), bestiaire, et chance de butin.", baseCost: 1200, costMult: 1.9, maxLevel: 20 },
  sanctuary: { name: "Atelier de Forgeron", desc: "Génère un peu d'Aether pendant ton absence.", baseCost: 5000, costMult: 2.3, maxLevel: 10 }
};

var OFFLINE_MAX_SIMULATED_KILLS = 2000;   // garde-fou perf/économie, même sur une absence énorme
var OFFLINE_BOSS_CHECK_EVERY = 25;         // 1 "chance de butin" tous les 25 kills simulés
var OFFLINE_BOSS_CHECK_CHANCE = 20;        // % de chance de loot à chaque vérification
var OFFLINE_MAX_ITEMS = 3;                 // butin hors-ligne plafonné (évite d'inonder l'inventaire)

/* v2.90.19 : l'or hors-ligne était un flat de 1 or/seconde totalement
   déconnecté du monde atteint et des kills simulés (l'Hôtel de Ville ne
   rapportait que du butin, jamais d'or) — voir doc d'équilibrage.
   Remplacé par un or PAR KILL simulé, sur le même principe que
   WorldManager.generateEnemy() (voir progression-system.js) : chaque
   kill vaut (OFFLINE_GOLD_PER_KILL_BASE * scale + monde * OFFLINE_GOLD_PER_KILL_WORLD),
   scale utilisant le monde/chapitre/cycle réels du joueur (index moyen
   d'ennemi de 4.5, l'offline ne suit pas un index précis comme en
   combat actif). OFFLINE_GOLD_KILL_MULT compense le fait que le débit
   de kills hors-ligne (Vigie) est bien plus faible que le rythme d'un
   combat actif — calibré pour ~25% de l'or actif en milieu de partie
   (voir feuille de simulation d'équilibrage). */
var OFFLINE_GOLD_PER_KILL_BASE = 6;
var OFFLINE_GOLD_PER_KILL_WORLD = 3;
var OFFLINE_AVG_ENEMY_INDEX = 4.5;
var OFFLINE_GOLD_KILL_MULT = 4.1;
var OFFLINE_BASE_GOLD_PER_SEC = 1; // v2.90.22 : plancher symbolique (ancien flat), voir calculate()

var VillageManager = {
  /* Comble les niveaux de bâtiments manquants (0 par défaut) — utile
     pour les sauvegardes créées avant l'ajout de watchtower/sanctuary. */
  ensure: function () {
    if (!game.village || typeof game.village !== "object") game.village = {};
    if (typeof game.village.goldMine !== "number") game.village.goldMine = 0;
    if (typeof game.village.essenceWell !== "number") game.village.essenceWell = 0;
    if (typeof game.village.barracks !== "number") game.village.barracks = 0;
    if (typeof game.village.timeRelay !== "number") game.village.timeRelay = 0;
    if (typeof game.village.watchtower !== "number") game.village.watchtower = 0;
    if (typeof game.village.sanctuary !== "number") game.village.sanctuary = 0;
  },

  getLevel: function (id) {
    this.ensure();
    return Number(game.village[id] || 0);
  },

  getConfig: function (id) {
    return VILLAGE_CONFIG[id] || null;
  },

  getCost: function (id) {
    var cfg = this.getConfig(id);
    if (!cfg) return Infinity;
    var level = this.getLevel(id);
    return Math.floor(cfg.baseCost * Math.pow(cfg.costMult, level));
  },

  canBuy: function (id) {
    var cfg = this.getConfig(id);
    if (!cfg) return false;
    var level = this.getLevel(id);
    if (level >= (cfg.maxLevel || Infinity)) return false;
    return game.gold >= this.getCost(id);
  },

  /* Améliore un bâtiment d'un niveau (en or). */
  buy: function (id) {
    var cfg = this.getConfig(id);
    if (!cfg) {
      showToast("Bâtiment introuvable", 1200);
      return;
    }

    var level = this.getLevel(id);
    if (level >= (cfg.maxLevel || Infinity)) {
      showToast("Niveau maximum", 1200);
      return;
    }

    var cost = this.getCost(id);
    if (game.gold < cost) {
      showToast("Pas assez d'or", 1000);
      return;
    }

    game.gold -= cost;
    game.village[id] = level + 1;

    if (window.QuestManager && typeof QuestManager.track === "function") {
      QuestManager.track("goldSpent", cost);
    }

    addLog("Village : " + cfg.name + " niv. " + game.village[id], "event");
    showToast(cfg.name + " +1", 1200);
    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  /* Village total : somme des niveaux de tous les bâtiments.
     Utilisé pour le visuel de village qui évolue (point 5). */
  getTotalLevel: function () {
    this.ensure();
    var ids = Object.keys(VILLAGE_CONFIG);
    var total = 0;
    for (var i = 0; i < ids.length; i++) total += this.getLevel(ids[i]);
    return total;
  },

  /* Formule PARTAGÉE entre le calcul hors-ligne (calculate() ci-dessous,
     un seul bloc au retour d'absence) et la chasse ambiante en continu
     (tickAmbientHunting(), appelée à chaque frame par main/game-loop.js
     depuis v3.0) — SOURCE UNIQUE pour éviter que les deux formules
     divergent avec le temps (voir le bug "Contrats lucratifs" v2.90.20,
     causé exactement par une logique dupliquée). `kills` et `seconds`
     couvrent des kills simulés (Vigie/Hôtel de Ville) et un intervalle
     de temps quelconques — l'appelant décide s'il s'agit d'heures
     d'absence ou d'un dt de frame. Renvoie un montant d'or NON arrondi
     (l'arrondi se fait chez l'appelant, qui gère sa propre précision :
     Math.floor ponctuel hors-ligne, accumulateur fractionnaire en
     continu). */
  computeHuntingGold: function (kills, seconds, bonuses) {
    var worldIndex = (window.WorldManager && WorldManager.worldIndex) || 0;
    var adventureIndex = (window.WorldManager && WorldManager.adventureIndex) || 0;
    var cycleCount = game.cycleCount || 0;
    var scale = 1 + worldIndex * 0.90 + adventureIndex * 0.30 + cycleCount * 0.45 + OFFLINE_AVG_ENEMY_INDEX * 0.05;
    var goldPerKill = OFFLINE_GOLD_PER_KILL_BASE * scale + worldIndex * OFFLINE_GOLD_PER_KILL_WORLD;
    var killBasedGold = Number(kills || 0) * goldPerKill * OFFLINE_GOLD_KILL_MULT * (1 + Number(bonuses.efficiencyBonus || 0)) * Number(bonuses.goldMult || 1);

    // Plancher symbolique (v2.90.22) : filet de sécurité pour les
    // joueurs sans Hôtel de Ville (0 kill simulé) — voir calculate().
    var floorGold = OFFLINE_BASE_GOLD_PER_SEC * Number(seconds || 0) * (1 + Number(bonuses.efficiencyBonus || 0)) * Number(bonuses.goldMult || 1);

    return Math.max(killBasedGold, floorGold);
  },

  /* v3.0 : chasse ambiante EN CONTINU (que le joueur regarde l'écran
     Combat ou non), appelée à chaque frame par main/game-loop.js —
     avant, ce même principe (simuler des combats via l'Hôtel de
     Ville) n'existait qu'au retour d'une absence (calculate()
     ci-dessous, toujours utilisée pour le vrai hors-ligne app fermée).
     Utilise EXACTEMENT les mêmes bonus/formule (computeHuntingGold
     ci-dessus) qu'hors-ligne, appliqués en continu via deux
     accumulateurs fractionnaires (kills et or) plutôt qu'en un seul
     bloc — un dt de frame ne fait quasiment jamais un kill entier.
     N'avance JAMAIS la progression des mondes/quêtes (comme
     hors-ligne) : uniquement or, bestiaire (killCounts) et chance de
     butin — les mondes/quêtes restent liés au combat RÉEL sur l'écran
     Combat (ou, à partir de v3.0, aux runs de quête dédiés). */
  tickAmbientHunting: function (dt) {
    this.ensure();
    dt = Math.max(0, Number(dt || 0));
    if (dt <= 0) return;

    var bonuses = this.getOfflineBonuses();

    // --- Kills simulés (accumulateur fractionnaire) ---
    var killsPerSecond = Number(bonuses.killsPerHour || 0) / 3600;
    game._huntKillAccum = Number(game._huntKillAccum || 0) + killsPerSecond * dt;
    var wholeKills = Math.floor(game._huntKillAccum);
    game._huntKillAccum -= wholeKills;

    // --- Or (accumulateur fractionnaire, même formule que hors-ligne) ---
    game._huntGoldAccum = Number(game._huntGoldAccum || 0) + this.computeHuntingGold(wholeKills, dt, bonuses);
    var wholeGold = Math.floor(game._huntGoldAccum);
    game._huntGoldAccum -= wholeGold;

    if (wholeGold > 0) {
      game.gold += wholeGold;
      game.totalGoldEarned += wholeGold;
      if (window.QuestManager && typeof QuestManager.track === "function") {
        QuestManager.track("goldEarned", wholeGold);
      }
    }

    if (wholeKills <= 0) return;

    // --- Bestiaire (killCounts) + chance de butin, même cadence que
    //     hors-ligne (1 vérification tous les OFFLINE_BOSS_CHECK_EVERY
    //     kills simulés) via un compteur cumulatif dédié. ---
    game.totalKills = Number(game.totalKills || 0) + wholeKills;
    game.killCounts = game.killCounts || {};

    var pool = [];
    if (window.WorldManager && typeof WorldManager.getAdventure === "function") {
      var adventure = WorldManager.getAdventure();
      if (adventure && adventure.enemyPool && adventure.enemyPool.length) pool = adventure.enemyPool;
    }

    if (pool.length) {
      for (var i = 0; i < wholeKills; i++) {
        var id = pool[randInt(0, pool.length - 1)];
        game.killCounts[id] = (game.killCounts[id] || 0) + 1;
      }
    }

    game._huntBossCheckAccum = Number(game._huntBossCheckAccum || 0) + wholeKills;
    while (game._huntBossCheckAccum >= OFFLINE_BOSS_CHECK_EVERY) {
      game._huntBossCheckAccum -= OFFLINE_BOSS_CHECK_EVERY;
      if (chance(OFFLINE_BOSS_CHECK_CHANCE) && window.LootSystem && typeof LootSystem.rollDrop === "function") {
        var drop = LootSystem.rollDrop();
        if (drop && typeof addDropToInventory === "function" && addDropToInventory(drop)) {
          addLog("🏘️ Chasse du village : " + drop.name + " (" + drop.rarity + ")", "event");
        }
      }
    }
  },

  /* Regroupe TOUS les bonus hors-ligne actuels (village + talents +
     synergie d'ascension), consommé par OfflineManager.calculate().
     - goldMult      multiplicateur d'or hors-ligne (Mine d'or)
     - essenceFlat   essence gagnée par heure (Puits d'essence)
     - efficiencyBonus  % additionnel sur l'or hors-ligne (Caserne +
       talents + ascension)
     - extraHours    heures ajoutées au plafond de base de 4h (Relais)
     - killsPerHour  kills simulés par heure (Vigie)
     - aetherPerHour Aether généré par heure (Sanctuaire) */
  getOfflineBonuses: function () {
    this.ensure();

    // v3.28 : t_calm_breath/t_last_stand/t_immutable_guardian ont
    // tous migré vers un thème défense/PV/repos (branche Survie
    // rethématisée) — plus aucun talent ne contribue directement à
    // l'efficacité hors-ligne maintenant, ce bonus est retiré.
    var talentEfficiency = 0;

    // Synergie d'ascension (point 6) : le village reste pertinent en fin de partie,
    // sans bâtiment dédié -> +2% d'efficacité hors-ligne par ascension, plafonné à +40%.
    var ascensionEfficiency = Math.min(0.40, (game.ascensionCount || 0) * 0.02);

    return {
      goldMult: 1 + this.getLevel("goldMine") * 0.12,
      essenceFlat: this.getLevel("essenceWell"),
      efficiencyBonus: this.getLevel("barracks") * 0.04 + talentEfficiency + ascensionEfficiency,
      extraHours: this.getLevel("timeRelay") * 2,
      killsPerHour: this.getLevel("watchtower") * 3,
      aetherPerHour: this.getLevel("sanctuary") * 0.05
    };
  }
};

var OfflineManager = {
  /* Calcule ce que le joueur a gagné pendant son absence, sans encore
     rien appliquer à `game` (voir show() plus bas pour ça). Le temps
     pris en compte est plafonné par maxHours (4h de base + bonus du
     Relais du temps). Simule aussi des kills (Vigie) répartis
     aléatoirement sur le pool d'ennemis du chapitre courant, avec une
     petite chance de butin tous les OFFLINE_BOSS_CHECK_EVERY kills.
     Renvoie null s'il n'y a rien à donner (absence trop courte, ou
     aucun bâtiment investi). */
  calculate: function () {
    if (!game.lastOnline) return null;
    if (!window.VillageManager || typeof VillageManager.getOfflineBonuses !== "function") return null;

    VillageManager.ensure();

    var elapsedMs = Date.now() - game.lastOnline;
    if (elapsedMs <= 1000) return null;

    var bonuses = VillageManager.getOfflineBonuses();
    var baseCapHours = 4;
    var maxHours = baseCapHours + Number(bonuses.extraHours || 0);
    var cappedMs = Math.min(elapsedMs, maxHours * 3600 * 1000);
    var seconds = cappedMs / 1000;
    var hours = seconds / 3600;

    var essence = Math.floor(hours * Number(bonuses.essenceFlat || 0));
    var aether = Math.floor(hours * Number(bonuses.aetherPerHour || 0));

    // v1.9.2 : Vigie -> combats simulés hors-ligne (kills, bestiaire, butin)
    var kills = Math.min(OFFLINE_MAX_SIMULATED_KILLS, Math.floor(hours * Number(bonuses.killsPerHour || 0)));
    var killsByEnemy = {};
    var items = [];

    if (kills > 0) {
      var pool = [];
      if (window.WorldManager && typeof WorldManager.getAdventure === "function") {
        var adventure = WorldManager.getAdventure();
        if (adventure && adventure.enemyPool && adventure.enemyPool.length) pool = adventure.enemyPool;
      }

      if (pool.length) {
        for (var i = 0; i < kills; i++) {
          var id = pool[randInt(0, pool.length - 1)];
          killsByEnemy[id] = (killsByEnemy[id] || 0) + 1;
        }

        var bossChecks = Math.floor(kills / OFFLINE_BOSS_CHECK_EVERY);
        for (var c = 0; c < bossChecks && items.length < OFFLINE_MAX_ITEMS; c++) {
          if (chance(OFFLINE_BOSS_CHECK_CHANCE) && window.LootSystem && typeof LootSystem.rollDrop === "function") {
            var drop = LootSystem.rollDrop();
            if (drop) items.push(drop);
          }
        }
      }
    }

    // v2.90.19 : or hors-ligne dérivé des kills simulés (voir note au-dessus
    // de OFFLINE_GOLD_KILL_MULT) — 0 or si aucun kill simulé (Hôtel de
    // Ville non investi), au lieu de l'ancien flat indépendant.
    // v3.0 : formule déplacée dans VillageManager.computeHuntingGold()
    // (partagée avec tickAmbientHunting, la chasse ambiante en continu)
    // — inchangée, juste extraite pour éviter toute divergence entre
    // hors-ligne et continu.
    var gold = Math.floor(VillageManager.computeHuntingGold(kills, seconds, bonuses));

    if (gold <= 0 && essence <= 0 && aether <= 0 && kills <= 0) return null;

    return {
      ms: cappedMs,
      gold: Math.max(0, gold),
      essence: Math.max(0, essence),
      aether: Math.max(0, aether),
      kills: kills,
      killsByEnemy: killsByEnemy,
      items: items
    };
  },

  /* Applique réellement le résultat de calculate() à `game` (or,
     essence, Aether, kills + bestiaire, objets), puis affiche la
     modale de bienvenue (ou un simple toast si la modale n'est pas
     disponible). Appelée une fois au boot si loadGame() a réussi. */
  show: function (offline) {
    if (!offline) return;

    game.gold += Number(offline.gold || 0);
    game.essence += Number(offline.essence || 0);
    game.totalGoldEarned += Number(offline.gold || 0);

    if (offline.aether > 0) {
      game.aether = Number(game.aether || 0) + offline.aether;
      game.totalAetherEarned = Number(game.totalAetherEarned || 0) + offline.aether;
    }

    var itemNames = [];
    if (offline.kills > 0) {
      game.totalKills = Number(game.totalKills || 0) + offline.kills;
      game.killCounts = game.killCounts || {};

      Object.keys(offline.killsByEnemy || {}).forEach(function (id) {
        game.killCounts[id] = (game.killCounts[id] || 0) + offline.killsByEnemy[id];
      });

      if (window.QuestManager && typeof QuestManager.track === "function") {
        QuestManager.track("kills", offline.kills);
      }

      (offline.items || []).forEach(function (drop) {
        if (typeof addDropToInventory === "function" ? addDropToInventory(drop) : (game.inventory.push(drop), true)) {
          itemNames.push(drop.name);
        }
      });
    }

    addLog(
      "Gain hors-ligne : +" + formatNumber(offline.gold || 0) + " or, +" + formatNumber(offline.essence || 0) + " essence" +
      (offline.aether > 0 ? ", +" + formatNumber(offline.aether) + " Aether" : "") +
      (offline.kills > 0 ? ", " + formatNumber(offline.kills) + " ennemis vaincus par la Vigie" : ""),
      "event"
    );

    if (typeof showOfflineModal === "function") {
      showOfflineModal({
        ms: offline.ms,
        gold: offline.gold,
        essence: offline.essence,
        aether: offline.aether,
        kills: offline.kills,
        items: itemNames
      });
    } else {
      showToast("Hors-ligne : +" + formatNumber(offline.gold || 0) + " or", 1800);
    }

    if (typeof renderAll === "function") renderAll();
    if (typeof saveGame === "function") saveGame();
  }
};

window.VillageManager = VillageManager;
window.OfflineManager = OfflineManager;
window.VILLAGE_CONFIG = VILLAGE_CONFIG;
