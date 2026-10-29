"use strict";
/* systems/village-quest-system.js — v3.111.0 (Lot B) : VillageQuestManager, chaîne
   séquentielle de quêtes tutorielles du Village (data/village-quests.js). Pattern
   check/progress stateless : la progression est lue en direct dans game.production
   (aucun compteur, aucun hook dans les systèmes de parcelles). État persistant
   (réclamées + popups vus) rangé dans game.explorationProgression.villageQuests —
   save-system.js (protégé, liste blanche) persiste explorationProgression comme objet
   entier, et ce bloc est permanent (survit à l'ascension, comme les déblocages).
   Récompenses via StoryQuestManager._grantReward (or/essence/ressources + 15 XP,
   même façade que « Les fondations »). */

var VillageQuestManager = {
  ensure: function () {
    if (typeof ensureGameStateDefaults === "function") ensureGameStateDefaults();
    var prog = game.explorationProgression;
    if (!prog.villageQuests || typeof prog.villageQuests !== "object") {
      prog.villageQuests = { claimed: {}, tutorialsSeen: {} };
    }
    var vq = prog.villageQuests;
    if (!vq.claimed || typeof vq.claimed !== "object") vq.claimed = {};
    if (!vq.tutorialsSeen || typeof vq.tutorialsSeen !== "object") vq.tutorialsSeen = {};
    // v3.112.0 (Lot C) : compteur générique de crafts par ressource produite — alimenté
    // par WorkshopsSystem (tick + rattrapage hors ligne), lu par les checks des quêtes
    // d'atelier. Cumulatif et rétroactif : une planche fabriquée pour « Les fondations »
    // compte déjà quand la quête d'atelier devient courante (même esprit que
    // WorkshopUnlockManager.runRetroactiveCheck).
    if (!vq.craftCounts || typeof vq.craftCounts !== "object") vq.craftCounts = {};
    return vq;
  },

  /* Hook appelé par WorkshopsSystem à chaque lot terminé (par resourceId produit). */
  notifyRecipeCrafted: function (resourceId, amount) {
    amount = Math.floor(Number(amount || 0));
    if (!resourceId || amount <= 0) return;
    var vq = this.ensure();
    vq.craftCounts[resourceId] = Number(vq.craftCounts[resourceId] || 0) + amount;
  },

  getCraftCount: function (resourceId) {
    var vq = this.ensure();
    return Number(vq.craftCounts[resourceId] || 0);
  },

  isClaimed: function (questId) {
    var vq = this.ensure();
    return !!vq.claimed[questId];
  },

  /* La chaîne n'existe qu'une fois le Champs débloqué (après « La Terre en Friche ») —
     jamais évaluée avant : les check() ne doivent pas être appelés sur un bâtiment
     verrouillé (et le tableau ne doit pas montrer un tutoriel inaccessible). */
  isChainAvailable: function () {
    this.ensure();
    return !!(game.explorationProgression && game.explorationProgression.farmUnlocked);
  },

  /* Quête courante = première non réclamée, dans l'ordre du tableau (séquence tutorielle).
     null si la chaîne est indisponible ou entièrement réclamée. */
  getCurrentQuest: function () {
    if (!this.isChainAvailable()) return null;
    var vq = this.ensure();
    return (window.VILLAGE_QUESTS || []).find(function (q) { return !vq.claimed[q.id]; }) || null;
  },

  /* v3.112.0 (Lot C) : prérequis optionnel par quête (quest.requires) — si la quête
     courante n'est pas disponible (ex. Scierie/Mine pas encore débloquées), la chaîne
     est en pause : pas de carte au tableau, pas de popup, pas de réclamation. */
  isQuestAvailable: function (quest) {
    if (!quest) return false;
    if (typeof quest.requires !== "function") return true;
    return !!quest.requires();
  },

  isQuestReady: function (quest) {
    if (!quest || typeof quest.check !== "function") return false;
    return !!quest.check();
  },

  /* Réclame la quête courante (et elle seule) si son objectif est atteint. Récompense +
     popup de fin narratif (openQuestCompletePopup, même rendu que l'Histoire). */
  claim: function (questId) {
    var current = this.getCurrentQuest();
    if (!current || current.id !== questId) return false;
    if (!this.isQuestAvailable(current)) return false;
    if (!this.isQuestReady(current)) return false;

    var vq = this.ensure();
    var rewardRows = [];
    if (window.StoryQuestManager && typeof StoryQuestManager._grantReward === "function") {
      rewardRows = StoryQuestManager._grantReward(current.reward || {});
    }
    vq.claimed[current.id] = true;

    addLog("🏡 " + _t("Quête de village terminée : {x}", { x: _td(current.title) }), "event");
    if (typeof showToast === "function") showToast("✅ " + _td(current.title), 1800);
    if (typeof openQuestCompletePopup === "function") {
      openQuestCompletePopup({
        icon: current.icon || "🏡",
        title: current.title,
        text: (current.narrative && current.narrative.completion) || "",
        rewardRows: rewardRows,
        closeLabel: _t("Continuer"),
        suggestNextQuest: false
      });
    }

    if (typeof renderPanel === "function") renderPanel();
    if (typeof saveGame === "function") saveGame();
    return true;
  },

  /* --- Popups pédagogiques (ui/tutorial-view.js, déclenchés depuis switchTab) --- */

  isTutorialSeen: function (questId) {
    var vq = this.ensure();
    return !!vq.tutorialsSeen[questId];
  },

  markTutorialSeen: function (questId) {
    var vq = this.ensure();
    vq.tutorialsSeen[questId] = true;
    if (typeof saveGame === "function") saveGame();
  }
};

window.VillageQuestManager = VillageQuestManager;

/* v3.509.0 (option A, variante B) : JALONS du village et du héros (data/village-quests.js, VILLAGE_MILESTONES).
   Lus en direct dans l'état du jeu ; seules les réclamations sont gardées, dans
   game.explorationProgression.villageQuests.milestones (objet sauvegardé tel quel, voir l'en-tête). */
var MilestoneManager = {
  claimedMap: function () {
    var vq = VillageQuestManager.ensure();
    if (!vq.milestones || typeof vq.milestones !== "object") vq.milestones = {};
    return vq.milestones;
  },
  isClaimed: function (id) { return !!this.claimedMap()[id]; },
  reachedWorld: function () {
    var w = (window.WorldCaps && typeof WorldCaps.getReachedWorldIndex === "function") ? WorldCaps.getReachedWorldIndex() : 0;
    return Math.max(0, Number(w || 0));
  },
  /* Jalons d'un monde (atteint seulement). v3.539.0 (Seb) : un jalon de compagnon attend que ce compagnon
     ait rejoint le groupe, un jalon de relique qu'il y ait un compagnon. */
  ofWorld: function (w) {
    if (w > this.reachedWorld()) return [];
    var CM = window.CompanionManager;
    return VILLAGE_MILESTONES.filter(function (m) {
      if (m.w !== w) return false;
      if (!CM) return true;
      if ((m.kind === "companionUpg" || m.kind === "companionRank") && m.arg) return CM.isUnlocked(m.arg);
      if (/^(relicsWorn|relicsOnOne|companionUpgMax)$/.test(m.kind)) return CM.unlockedIds().length > 0;
      return true;
    });
  },
  /* Valeur courante d'un jalon. Chaque lecture est défensive : un système absent compte 0. */
  measure: function (m) {
    var CM = window.CompanionManager, CR = window.CompanionRelics, SR = window.SkillRanks, P = window.ProductionPlotsSystem;
    switch (m.kind) {
      case "zonesAtLevel": {
        var n = 0;
        if (P) P.getManagedBuildingIds().forEach(function (bid) { P.getPlots(bid).forEach(function (pl) { if (pl.state === "open" && pl.level >= m.arg) n++; }); });
        return n;
      }
      case "zonesOpenMax": {
        var best = 0;
        if (P) P.getManagedBuildingIds().forEach(function (bid) { best = Math.max(best, P.getOpenPlotsCount(bid)); });
        return best;
      }
      case "building": return window.VillageBuildingManager ? VillageBuildingManager.getLevel(m.arg) : 0;
      case "counter": {
        var st = window.AchievementManager ? AchievementManager.ensure() : null;
        var n = st ? Number(st.counters[m.arg] || 0) : 0;
        return Math.max(n, this.legacyCount(m.arg));
      }
      case "spellRankMax": case "spellRankMin": {
        if (!SR) return 0;
        var r = SR.kitActions().map(function (a) { return SR.get(a.id); });
        if (!r.length) return 0;
        return m.kind === "spellRankMax" ? Math.max.apply(null, r) : Math.min.apply(null, r);
      }
      case "companionUpg": return CM && CM.state(m.arg) ? Number(CM.state(m.arg).upgrades || 0) : 0;
      case "companionUpgMax": return CM ? CM.unlockedIds().reduce(function (s, id) { return Math.max(s, Number(CM.state(id).upgrades || 0)); }, 0) : 0;
      case "companionRank": return CM && typeof CM.skillRank === "function" ? CM.skillRank(m.arg) : 0;
      case "relicsWorn": return CM && CR ? CM.unlockedIds().reduce(function (s, id) { return s + CR.active(id).length; }, 0) : 0;
      case "relicsOnOne": return CM && CR ? CM.unlockedIds().reduce(function (s, id) { return Math.max(s, CR.active(id).length); }, 0) : 0;
      case "trainingMax": return (window.HEROS_TRAINING_UPGRADE_IDS || []).reduce(function (s, id) { return Math.max(s, Number((game.upgrades || {})[id] || 0)); }, 0);
    }
    return 0;
  },
  /* Parties d'avant v3.509.0 : traces déjà sauvegardées (date de préparation, marchés des Ruines et de la Crypte). */
  legacyCount: function (key) {
    var v = game.village || {}, ep = game.explorationProgression || {};
    if (key === "apothecaryCrafts") return v.apothecary && v.apothecary.dailyKey ? 1 : 0;
    if (key === "caravansBack") return ep.ruinsMarketDone || ep.cryptMarketDone ? 1 : 0;
    return 0;
  },
  progress: function (m) { return Math.min(m.target, Math.floor(this.measure(m))); },
  isReady: function (m) { return !this.isClaimed(m.id) && this.measure(m) >= m.target; },
  reward: function (m) { return MILESTONE_REWARD_BY_WORLD[m.w] || MILESTONE_REWARD_BY_WORLD[0]; },
  readyCount: function () {
    var self = this, n = 0;
    for (var w = 0; w <= this.reachedWorld(); w++) this.ofWorld(w).forEach(function (m) { if (self.isReady(m)) n++; });
    return n;
  },
  openCount: function (w) { var self = this; return this.ofWorld(w).filter(function (m) { return !self.isClaimed(m.id); }).length; },
  claim: function (id) {
    var m = VILLAGE_MILESTONES.filter(function (x) { return x.id === id; })[0];
    if (!m || !this.isReady(m) || m.w > this.reachedWorld()) return false;
    var R = this.reward(m), res = {}; res[R.mat] = 1;
    var rows = (window.StoryQuestManager && typeof StoryQuestManager._grantReward === "function")
      ? StoryQuestManager._grantReward({ gold: R.gold, resources: res }) : [];
    this.claimedMap()[m.id] = true;
    if (typeof addLog === "function") addLog("🏅 " + _t("Jalon atteint : {x}", { x: _td(m.title) }), "event");
    if (typeof showToast === "function") showToast("✅ " + _td(m.title), 1800);
    if (typeof saveGame === "function") saveGame();
    return rows || true;
  }
};
window.MilestoneManager = MilestoneManager;
