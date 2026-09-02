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

  getQuest: function (questId) {
    return (window.VILLAGE_QUESTS || []).find(function (q) { return q.id === questId; }) || null;
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

    addLog("🏡 Quête de village terminée : " + current.title, "event");
    if (typeof showToast === "function") showToast("✅ " + current.title, 1800);
    if (typeof openQuestCompletePopup === "function") {
      openQuestCompletePopup({
        icon: current.icon || "🏡",
        title: current.title,
        text: (current.narrative && current.narrative.completion) || "",
        rewardRows: rewardRows,
        closeLabel: "Continuer",
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
