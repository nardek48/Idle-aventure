"use strict";
/* systems/sortie-system.js — v3.102.1 (P2) : la SORTIE, unité de jeu (LIGNE_DIRECTRICE §4). On part du camp, on enchaîne les combats,
   on rentre. Or / essence / objets / ressources gagnés en route vont dans game.sortie.loot et ne sont banqués qu'au retour
   (Rentrer, mission réussie) ; la mort perd tout le butin, Fuir en garde 50 %. Potions plafonnées par sortie. Persisté (4 emplacements). */

var SORTIE_POTION_CAP = 2;        // décision §10 n°10 : 2 potions par sortie (calibration P1)
var SORTIE_FLEE_KEEP_PCT = 0.5;   // décision §10 n°3 : fuir = 50 % du butin

var SORTIE_CONTEXT_LABELS = { farm: "exploration", adventure: "quête", hunt: "chasse", dungeon: "donjon" };

var SortieManager = {
  emptyLoot: function () {
    return { gold: 0, essence: 0, items: [], resources: {} };
  },

  ensure: function () {
    if (!game.sortie || typeof game.sortie !== "object") {
      game.sortie = { active: false, context: null, startedAt: 0, loot: this.emptyLoot(), potionsUsed: 0, kills: 0, killedBoss: false };
    }
    if (!game.sortie.loot || typeof game.sortie.loot !== "object") game.sortie.loot = this.emptyLoot();
    if (!Array.isArray(game.sortie.loot.items)) game.sortie.loot.items = [];
    if (!game.sortie.loot.resources || typeof game.sortie.loot.resources !== "object") game.sortie.loot.resources = {};
    if (typeof game.sortie.potionsUsed !== "number") game.sortie.potionsUsed = 0;
    if (typeof game.sortie.kills !== "number") game.sortie.kills = 0;
    if (typeof game.sortie.killedBoss !== "boolean") game.sortie.killedBoss = false;
    return game.sortie;
  },

  isActive: function () {
    return !!this.ensure().active;
  },

  /* Contexte déduit des runs actifs (une save d'avant 3.102.1 peut avoir un run sans sortie). */
  detectContext: function () {
    if (game.dungeonRun && game.dungeonRun.active) return "dungeon";
    if (game.adventureQuestRun && game.adventureQuestRun.active) return "adventure";
    if (game.huntRun && game.huntRun.active) return "hunt";
    return "farm";
  },

  start: function (context) {
    var s = this.ensure();
    if (s.active) return false;
    s.active = true;
    s.context = context || this.detectContext();
    s.startedAt = Date.now();
    s.loot = this.emptyLoot();
    s.potionsUsed = 0;
    s.kills = 0;
    addLog("🎒 Départ en sortie (" + (SORTIE_CONTEXT_LABELS[s.context] || s.context) + ") — le butin sera banqué au retour.", "event");
    if (typeof renderCombatControls === "function") renderCombatControls();
    return true;
  },

  isMission: function () {
    var s = this.ensure();
    return s.active && s.context !== "farm";
  },

  /* ---------- Butin ---------- */
  addGold: function (n) { var s = this.ensure(); s.loot.gold += Math.max(0, Math.floor(Number(n) || 0)); },
  addEssence: function (n) { var s = this.ensure(); s.loot.essence += Math.max(0, Number(n) || 0); },
  addItem: function (item) { if (item) this.ensure().loot.items.push(item); },
  addResource: function (key, n) {
    var s = this.ensure();
    s.loot.resources[key] = Number(s.loot.resources[key] || 0) + Math.max(0, Number(n) || 0);
  },
  noteKill: function (isBoss) {
    var s = this.ensure();
    s.kills += 1;
    if (isBoss) s.killedBoss = true;
  },

  canUsePotion: function () {
    var s = this.ensure();
    return !s.active || s.potionsUsed < SORTIE_POTION_CAP;
  },
  notePotion: function () { var s = this.ensure(); if (s.active) s.potionsUsed += 1; },
  getPotionsLeft: function () {
    var s = this.ensure();
    return s.active ? Math.max(0, SORTIE_POTION_CAP - s.potionsUsed) : SORTIE_POTION_CAP;
  },

  getLootSummary: function (loot) {
    loot = loot || this.ensure().loot;
    var parts = [];
    if (loot.gold > 0) parts.push(formatNumber(loot.gold) + " or");
    if (loot.essence > 0) parts.push(formatNumber(Math.floor(loot.essence)) + " essence");
    if (loot.items.length) parts.push(loot.items.length + " objet" + (loot.items.length > 1 ? "s" : ""));
    Object.keys(loot.resources).forEach(function (k) {
      var q = Math.floor(loot.resources[k]);
      if (q > 0) parts.push(q + " " + k);
    });
    return parts.length ? parts.join(", ") : "rien";
  },

  /* ---------- Fin de sortie ---------- */
  /* outcome : "return" (Rentrer, farm) | "success" (mission réussie) | "flee" (50 %) | "death" (tout perdu). Idempotent. */
  end: function (outcome) {
    var s = this.ensure();
    if (!s.active) return null;
    var keepPct = (outcome === "flee") ? SORTIE_FLEE_KEEP_PCT : (outcome === "death" ? 0 : 1);
    var lost = this.emptyLoot();
    var kept = this.emptyLoot();

    kept.gold = Math.floor(s.loot.gold * keepPct); lost.gold = s.loot.gold - kept.gold;
    kept.essence = Math.floor(s.loot.essence * keepPct); lost.essence = s.loot.essence - kept.essence;
    var keepItems = Math.ceil(s.loot.items.length * keepPct);
    kept.items = s.loot.items.slice(0, keepItems); lost.items = s.loot.items.slice(keepItems);
    Object.keys(s.loot.resources).forEach(function (k) {
      var q = Number(s.loot.resources[k] || 0);
      kept.resources[k] = Math.floor(q * keepPct);
      lost.resources[k] = q - kept.resources[k];
    });

    this.bank(kept);
    if (outcome === "success") this.grantMissionXp(s);

    var summary = { outcome: outcome, context: s.context, kept: kept, lost: lost, kills: s.kills, potionsUsed: s.potionsUsed };
    var label = SORTIE_CONTEXT_LABELS[s.context] || s.context;
    if (outcome === "death") {
      addLog("💀 Sortie perdue (" + label + ") : butin abandonné sur place — " + this.getLootSummary(lost) + ".", "event");
    } else if (outcome === "flee") {
      addLog("🏳️ Fuite (" + label + ") : " + this.getLootSummary(kept) + " rapportés, " + this.getLootSummary(lost) + " perdus.", "event");
      showToast("🏳️ Fuite : 50 % du butin conservé", 1800);
    } else {
      addLog("🏕️ Retour au camp (" + label + ", " + s.kills + " ennemi" + (s.kills > 1 ? "s" : "") + ") : " + this.getLootSummary(kept) + " rapportés.", "event");
      if (kept.gold > 0 || kept.essence > 0 || kept.items.length || Object.keys(kept.resources).length) {
        showToast("🎒 Butin rapporté : " + this.getLootSummary(kept), 2200);
      }
    }

    game.sortie = { active: false, context: null, startedAt: 0, loot: this.emptyLoot(), potionsUsed: 0, kills: 0, killedBoss: false }; // v3.108.0 : reset complet
    game.lastSortieSummary = summary;
    if (typeof renderCombatControls === "function") renderCombatControls();
    return summary;
  },

  /* XP par mission (décision §10 n°6, LIGNE_DIRECTRICE §4) : 10 pour une mission de combat réussie,
     5 si elle s'est conclue sur un boss vaincu (remplace le 10, pas cumulé) — jamais par kill.
     L'étape Histoire a sa propre récompense (15), gérée par StoryQuestManager, pas ici. Le farm
     (context "farm", Rentrer) n'est pas une mission au sens de la ligne directrice : pas d'XP. */
  grantMissionXp: function (s) {
    if (s.context === "farm" || !s.context) return;
    if (typeof grantHeroXp !== "function") return;
    var xp = s.killedBoss ? 5 : 10;
    grantHeroXp(xp, s.killedBoss ? "boss" : "mission");
  },

  /* Verse le butin conservé dans la bourse / l'inventaire / l'entrepôt (WarehouseManager, jamais game.resources). */
  bank: function (loot) {
    if (loot.gold > 0) {
      game.gold += loot.gold;
      game.totalGoldEarned += loot.gold;
      if (window.QuestManager && typeof QuestManager.track === "function") QuestManager.track("goldEarned", loot.gold);
    }
    if (loot.essence > 0) game.essence += loot.essence;
    loot.items.forEach(function (item) {
      if (typeof addDropToInventory === "function" && addDropToInventory(item)) {
        addLog("🎁 Objet rapporté : " + item.name + " (" + item.rarity + ")", "event");
      }
    });
    Object.keys(loot.resources).forEach(function (k) {
      var q = Math.floor(loot.resources[k]);
      if (q > 0 && window.WarehouseManager && typeof WarehouseManager.addResource === "function") WarehouseManager.addResource(k, q);
    });
  },

  /* ---------- Actions joueur ---------- */
  /* Rentrer (farm) : banque tout et retourne au Campement. */
  returnToCamp: function () {
    var s = this.ensure();
    if (s.active && s.context === "farm") this.end("return");
    if (typeof switchTab === "function") switchTab("campement");
  },

  /* Fuir (mission) : 50 % du butin, mission non validée — délégué au manager du run, qui appelle end("flee"). */
  flee: function () {
    var s = this.ensure();
    if (!s.active) return;
    if (s.context === "dungeon" && window.DungeonManager) DungeonManager.forfeit();
    else if (s.context === "adventure" && window.AdventureQuestManager) AdventureQuestManager.forfeit();
    else if (s.context === "hunt" && window.HuntQuestManager) HuntQuestManager.stop();
    else this.end("return");
    if (typeof switchTab === "function") switchTab("campement");
  },

  /* Revenir sur l'onglet Campement pendant un farm = rentrer (le camp est le seul hub). */
  onTabChange: function (tabName) {
    var s = this.ensure();
    if (tabName === "campement" && s.active && s.context === "farm") this.end("return");
  }
};

window.SortieManager = SortieManager;
window.SORTIE_POTION_CAP = SORTIE_POTION_CAP;
window.SORTIE_FLEE_KEEP_PCT = SORTIE_FLEE_KEEP_PCT;
