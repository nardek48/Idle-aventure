"use strict";
/* systems/achievement-system.js — v3.338.0 : REFONTE des Hauts faits.
   Conception « Hauts faits » v1.0, décisions H1 à H11 (Seb, 24/09/2026). Données :
   data/achievements.js. Écran : ui/achievement-view.js.

   ÉTAT
     game.achievementsClaimed  { id: true }  (inchangé : les anciens réclamés restent acquis)
     game.achievementStats     { counters, reached, claimedAt, tiers, title }  (v3.338.0, 4 points)
       counters   compteurs neufs (patrouilles, règles, expéditions…), sans rattrapage
       reached    { id: horodatage } : obtenu UNE fois = acquis pour toujours (une carte reprise
                  par le Recouvrement n'efface rien)
       claimedAt  { id: horodatage }
       tiers      { catégorie: "bronze" | "silver" | "gold" } : paliers déjà payés
       title      titre porté (H8), ou null

   RÈGLES
     H3 : plus AUCUN bonus permanent. getTotalBonus() rend {} ; StatsSystem continue de
          l'appeler, sans effet. Les bancs n'avaient jamais compté ces bonus.
     H6 : réclamation à la main (un par un ou « Tout réclamer »), qui verse la récompense.
     Rattrapage : tout ce qui se lit dans l'état est évalué à l'ouverture de l'écran et au
     chargement ; les compteurs neufs partent de la mise à jour. */

var ACH_REFRESH_MS = 2000;
var ACH_TIER_ORDER = ["bronze", "silver", "gold"];
var ACH_TIER_LABELS = { bronze: "Bronze", silver: "Argent", gold: "Or" };

var AchievementManager = {
  _lastRefresh: 0,
  _fight: { enemy: null, potion: false, modeChanged: false, startMode: null }, // transitoire, jamais sauvé

  ensure: function () {
    if (!game.achievementsClaimed || typeof game.achievementsClaimed !== "object") game.achievementsClaimed = {};
    var st = game.achievementStats;
    if (!st || typeof st !== "object" || Array.isArray(st)) st = game.achievementStats = {};
    ["counters", "reached", "claimedAt", "tiers"].forEach(function (k) {
      if (!st[k] || typeof st[k] !== "object" || Array.isArray(st[k])) st[k] = {};
    });
    if (typeof st.title !== "string") st.title = null;
    return st;
  },

  getById: function (id) {
    return (ACHIEVEMENTS_DB || []).find(function (a) { return a.id === id; }) || null;
  },

  getCategory: function (catId) {
    return (window.ACHIEVEMENT_CATEGORIES || []).find(function (c) { return c.id === catId; }) || null;
  },

  getTarget: function (ach) {
    if (typeof ach.targetFn === "function") {
      try { var t = Number(ach.targetFn()); if (t > 0) return t; } catch (e) { /* repli sur target */ }
    }
    return Number(ach.target || 1);
  },

  getProgress: function (ach) {
    try { return Number(ach.track()) || 0; } catch (e) { return 0; }
  },

  /* Obtenu : déjà atteint une fois, déjà réclamé, ou atteint maintenant. */
  isComplete: function (ach) {
    var st = this.ensure();
    if (st.reached[ach.id] || game.achievementsClaimed[ach.id]) return true;
    return this.getProgress(ach) >= this.getTarget(ach);
  },

  isClaimed: function (id) {
    this.ensure();
    return !!game.achievementsClaimed[id];
  },

  isReady: function (ach) { return !this.isClaimed(ach.id) && this.isComplete(ach); },

  /* Relit l'état et note ce qui est atteint (rattrapage, « acquis pour toujours »).
     force : sans l'attente de 2 s (ouverture de l'écran, chargement). */
  refresh: function (force) {
    var now = Date.now();
    if (!force && now - this._lastRefresh < ACH_REFRESH_MS) return;
    this._lastRefresh = now;
    var st = this.ensure(), self = this;
    (ACHIEVEMENTS_DB || []).forEach(function (a) {
      if (st.reached[a.id]) return;
      if (game.achievementsClaimed[a.id] || self.getProgress(a) >= self.getTarget(a)) st.reached[a.id] = now;
    });
  },

  /* ---------- Réclamer (H6) ---------- */

  _pay: function (reward, parts) {
    if (!reward) return;
    if (reward.gold) {
      game.gold = Number(game.gold || 0) + reward.gold;
      if (window.QuestManager && typeof QuestManager.track === "function") QuestManager.track("goldEarned", reward.gold);
      parts.push("+" + formatNumber(reward.gold) + " or");
    }
    if (reward.essence) {
      game.essence = Number(game.essence || 0) + reward.essence;
      parts.push("+" + formatNumber(reward.essence) + " essence");
    }
    if (reward.aether) {
      // Aether versé au porte-monnaie SEULEMENT : pas à totalAetherEarned, qui fait la jauge de Mémoire
      game.aether = Number(game.aether || 0) + reward.aether;
      parts.push("+" + formatNumber(reward.aether) + " Aether");
    }
  },

  /* Paie les paliers franchis d'une catégorie de monde. Rend la liste des paliers gagnés. */
  _payTiers: function (catId, parts) {
    var cat = this.getCategory(catId);
    if (!cat || !cat.tiers) return [];
    var st = this.ensure(), done = st.tiers[catId], got = [];
    var have = this.getCategoryTier(catId);
    var from = done ? ACH_TIER_ORDER.indexOf(done) + 1 : 0;
    var to = have.tier ? ACH_TIER_ORDER.indexOf(have.tier) : -1;
    for (var i = from; i <= to; i++) {
      this._pay(cat.tierRewards[i], parts);
      if (cat.tierRewards[i] && cat.tierRewards[i].title) parts.push("titre « " + cat.tierRewards[i].title + " »");
      got.push(ACH_TIER_ORDER[i]);
    }
    if (got.length) st.tiers[catId] = got[got.length - 1];
    return got;
  },

  /* quiet : pas de toast ni de rendu (« Tout réclamer » les fait une fois). */
  claim: function (id, quiet) {
    var st = this.ensure();
    var ach = this.getById(id);
    if (!ach || this.isClaimed(id) || !this.isComplete(ach)) return null;
    game.achievementsClaimed[id] = true;
    st.claimedAt[id] = Date.now();
    if (!st.reached[id]) st.reached[id] = st.claimedAt[id];
    var parts = [];
    this._pay(ach.reward, parts);
    var tiers = this._payTiers(ach.category, parts);
    if (typeof addLog === "function") addLog("🏆 Haut fait : " + ach.name + (parts.length ? " (" + parts.join(", ") + ")" : ""), "event");
    if (!quiet) {
      var cat = this.getCategory(ach.category);
      var tierTxt = tiers.length ? " · palier " + ACH_TIER_LABELS[tiers[tiers.length - 1]] + (cat ? " — " + cat.label : "") : "";
      if (typeof showToast === "function") showToast("🏆 " + ach.name + (parts.length ? " · " + parts.join(", ") : "") + tierTxt, 2200);
      this._after();
    }
    return { parts: parts, tiers: tiers };
  },

  claimAll: function () {
    this.refresh(true);
    var self = this, n = 0, gold = 0, ess = 0, tierMsgs = [];
    (ACHIEVEMENTS_DB || []).forEach(function (a) {
      if (!self.isReady(a)) return;
      var r = self.claim(a.id, true);
      if (!r) return;
      n++;
      gold += (a.reward && a.reward.gold) || 0;
      ess += (a.reward && a.reward.essence) || 0;
      if (r.tiers.length) {
        var cat = self.getCategory(a.category);
        tierMsgs.push("palier " + ACH_TIER_LABELS[r.tiers[r.tiers.length - 1]] + " — " + (cat ? cat.label : a.category));
      }
    });
    if (n && typeof showToast === "function") {
      showToast("🏆 " + n + " haut" + (n > 1 ? "s faits" : " fait") + (gold ? " · +" + formatNumber(gold) + " or" : "") + (ess ? " · +" + formatNumber(ess) + " essence" : "")
        + (tierMsgs.length ? " · " + tierMsgs.join(", ") : ""), 2600);
    }
    if (n) this._after();
    return n;
  },

  _after: function () {
    if (window.FilRouge) FilRouge.invalidate();
    if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") StatsSystem.recalcStats();
    if (typeof renderAll === "function") renderAll();
    if (typeof saveGame === "function") saveGame();
  },

  /* ---------- Paliers (H4) et titres (H8) ---------- */

  /* Hauts faits NON cachés réclamés d'une catégorie de monde, et palier atteint. */
  getCategoryTier: function (catId) {
    var cat = this.getCategory(catId), self = this;
    if (!cat || !cat.tiers) return { count: 0, max: 0, tier: null };
    var count = (ACHIEVEMENTS_DB || []).filter(function (a) { return a.category === catId && !a.hidden && self.isClaimed(a.id); }).length;
    var tier = null;
    for (var i = 0; i < cat.tiers.length; i++) if (count >= cat.tiers[i]) tier = ACH_TIER_ORDER[i];
    return { count: count, max: cat.tiers[cat.tiers.length - 1], tier: tier };
  },

  /* Palier du monde courant : liseré du portrait du HUD. */
  getCurrentWorldTier: function () {
    var idx = (window.WorldManager) ? Number(WorldManager.worldIndex || 0) : 0;
    var cat = (window.ACHIEVEMENT_CATEGORIES || []).find(function (c) { return c.world === idx; });
    return cat ? this.getCategoryTier(cat.id).tier : null;
  },

  getAllTitles: function () {
    var out = [];
    (window.ACHIEVEMENT_CATEGORIES || []).forEach(function (c) {
      if (c.tierRewards) c.tierRewards.forEach(function (r) { if (r && r.title) out.push({ title: r.title, from: "Palier or — " + c.label, cat: c.id }); });
    });
    (ACHIEVEMENTS_DB || []).forEach(function (a) { if (a.title) out.push({ title: a.title, from: "Haut fait « " + a.name + " »", id: a.id }); });
    return out;
  },

  isTitleUnlocked: function (t) {
    var st = this.ensure();
    if (t.cat) return st.tiers[t.cat] === "gold";
    if (t.id) return this.isClaimed(t.id);
    return false;
  },

  getTitle: function () {
    var st = this.ensure(), self = this;
    if (!st.title) return null;
    var t = this.getAllTitles().find(function (x) { return x.title === st.title; });
    return (t && self.isTitleUnlocked(t)) ? st.title : null;
  },

  setTitle: function (title) {
    var st = this.ensure(), self = this;
    if (title == null) { st.title = null; }
    else {
      var t = this.getAllTitles().find(function (x) { return x.title === title; });
      if (!t || !self.isTitleUnlocked(t)) return false;
      st.title = title;
    }
    if (typeof renderAll === "function") renderAll();
    if (typeof saveGame === "function") saveGame();
    return true;
  },

  /* ---------- Comptes ---------- */

  getClaimedCount: function () {
    var self = this;
    return (ACHIEVEMENTS_DB || []).filter(function (a) { return self.isClaimed(a.id); }).length;
  },

  getAvailableToClaimCount: function (catId) {
    this.refresh(false);
    var self = this;
    return (ACHIEVEMENTS_DB || []).filter(function (a) { return (!catId || a.category === catId) && self.isReady(a); }).length;
  },

  /* H9 : anciens hauts faits retirés et déjà réclamés. */
  getRetiredClaimed: function () {
    this.ensure();
    return (window.ACHIEVEMENTS_RETIRED || []).filter(function (a) { return !!game.achievementsClaimed[a.id]; });
  },

  /* H3 : plus aucun bonus permanent. Gardée pour StatsSystem.recalcStats(). */
  getTotalBonus: function () { return {}; },

  /* ---------- Compteurs neufs ---------- */

  bump: function (key, n) {
    var st = this.ensure();
    st.counters[key] = Number(st.counters[key] || 0) + (n == null ? 1 : n);
  },

  flag: function (key) {
    var st = this.ensure();
    if (!st.counters[key]) st.counters[key] = 1;
  },

  /* ---------- Crochets (appelés par les systèmes) ---------- */

  /* combat-view.js (renderEnemy) : un nouvel ennemi à l'écran = un nouveau combat. */
  onFightStart: function (enemy) {
    if (!enemy || this._fight.enemy === enemy) return;
    this._fight = { enemy: enemy, potion: false, modeChanged: false, startMode: game.combatMode || null };
  },

  /* combat-view.js (renderCombatControls, appelé par setCombatMode) */
  onModeShown: function (mode) {
    if (this._fight.enemy && this._fight.startMode && mode !== this._fight.startMode) this._fight.modeChanged = true;
  },

  /* potion-system.js : potion bue à l'écran de combat. */
  onPotionUsed: function () {
    if (game.activeTab === "combat") this._fight.potion = true;
  },

  /* combat-engine.js (killEnemy), une ligne : chaque ennemi vaincu. */
  onEnemyKilled: function (enemy) {
    if (!enemy) return;
    var grimoire = game.combatMode === "grimoire";
    if (grimoire) this.bump("grimoireKills");
    if (enemy.isBoss && grimoire && this._fight.startMode === "grimoire" && !this._fight.modeChanged) this.flag("grimoireBoss");
    if (enemy.id === "orcwarlord" && this._fight.enemy === enemy && !this._fight.potion) this.flag("orcNoPotion");
  },

  /* scene-run-system.js : chambre finale résolue. */
  onRunSuccess: function () {
    var idx = window.WorldManager ? Number(WorldManager.worldIndex || 0) : 0;
    if (idx === 0) this.bump("runForest");
    else if (idx === 1) this.bump("runDesert");
  },

  /* patrol-system.js */
  onPatrolStarted: function () {
    if (!window.PatrolManager) return;
    if (Object.keys(PatrolManager.ensure()).length >= 2) this.flag("twoPatrols");
  },
  onPatrolCollected: function (p) {
    if (!p) return;
    this.bump("patrolsDone");
    if (Number(p.hours) >= 8) this.flag("patrolNight");
    if (p.story && p.story.rare) this.flag(p.mapId === "desert" ? "rareStoryDesert" : "rareStoryForest");
  },

  /* living-map-system.js : un secteur recouvert redevient libéré. */
  onSectorRetaken: function (mapId) {
    if (mapId === "desert") this.flag("retakenDesert");
  },

  /* class-combat-system.js : une règle du joueur a choisi l'action. */
  onRuleFired: function () { this.bump("rulesFired"); },

  /* tavern-system.js */
  onTavernDelivered: function () { this.bump("tavernDelivered"); },

  /* Chargement : ne garde que des entrées bien formées. */
  restore: function (raw) {
    game.achievementStats = {};
    var st = this.ensure();
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      ["counters", "reached", "claimedAt"].forEach(function (k) {
        var src = raw[k];
        if (src && typeof src === "object") Object.keys(src).forEach(function (x) { var n = Number(src[x]); if (n > 0) st[k][x] = n; });
      });
      if (raw.tiers && typeof raw.tiers === "object") {
        Object.keys(raw.tiers).forEach(function (c) { if (ACH_TIER_ORDER.indexOf(raw.tiers[c]) !== -1) st.tiers[c] = raw.tiers[c]; });
      }
      if (typeof raw.title === "string") st.title = raw.title;
    }
    return st;
  }
};

window.AchievementManager = AchievementManager;
window.ACH_TIER_LABELS = ACH_TIER_LABELS;
