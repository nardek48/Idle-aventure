"use strict";
/* systems/potion-system.js — v3.115.0 : potions PER-RUN (décision Seb). activePotions = {id: true}
   (armées — plus de minuteur) ; l'effet ne s'applique que pendant un run de MISSION
   (SortieManager.isMission(), jamais le farm libre) et les potions armées sont consommées à la
   fin du run (voir hooks dans sortie-system.js). Cumulables : 1 de chaque type par run. Une
   potion bue au camp reste armée indéfiniment jusqu'au prochain run. Élixir d'Aether inchangé
   (pendingPotionBonuses, hors runs). Anciennes saves : timestamps normalisés en booléens à
   ensure(). Ancien système 30 min : COMMENTAIRES_ORIGINAUX.md */

var POTION_CYCLE_PRICE_GROWTH = 0.15;

var PotionManager = {
  ensure: function () {
    if (!game.activePotions || typeof game.activePotions !== "object") game.activePotions = {};
    if (!game.pendingPotionBonuses || typeof game.pendingPotionBonuses !== "object") {
      game.pendingPotionBonuses = { aetherNext: 0 };
    }
    if (typeof game.pendingPotionBonuses.aetherNext !== "number") game.pendingPotionBonuses.aetherNext = 0;
    if (typeof game.aetherElixirStackCount !== "number") game.aetherElixirStackCount = 0;
    if (!game.potionsOwned || typeof game.potionsOwned !== "object") game.potionsOwned = {};
    // v3.115.0 : normalise l'ancien format {id: timestampExpiry} en {id: true} — une potion
    // encore minutée à la migration devient simplement armée pour le prochain run (généreux).
    Object.keys(game.activePotions).forEach(function (id) {
      var v = game.activePotions[id];
      if (v === true) return;
      if (typeof v === "number" && v > Date.now()) game.activePotions[id] = true;
      else delete game.activePotions[id];
    });
  },

  /* Une potion est « armée » dès qu'elle est bue ; son effet n'est VIVANT que pendant une mission. */
  isArmed: function (id) {
    this.ensure();
    return game.activePotions[id] === true;
  },

  isEffectLive: function () {
    // Lecture PASSIVE de game.sortie (jamais SortieManager.isMission() qui passe par ensure()
    // et recréerait l'objet — hardResetState/fullResetState mettent game.sortie à null et
    // recalcStats() passe par ici).
    var s = game.sortie;
    return !!(s && s.active && s.context && s.context !== "farm");
  },

  /* Consomme toutes les potions armées — appelé par SortieManager à la fin d'un run de
     MISSION (quelle que soit l'issue : bues, elles sont bues). Jamais appelé pour le farm. */
  consumeRunPotions: function () {
    this.ensure();
    var ids = Object.keys(game.activePotions);
    if (!ids.length) return false;
    game.activePotions = {};
    if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") StatsSystem.recalcStats();
    addLog(_t("🧪 Effets de potions dissipés (fin du run)."), "event");
    return true;
  },

  getPotion: function (id) {
    return (POTIONS_DB || []).find(function (p) { return p.id === id; }) || null;
  },

  getStock: function (id) {
    this.ensure();
    return Number(game.potionsOwned[id] || 0);
  },

  getCost: function (potion) {
    this.ensure();
    var base = potion.cost;
    if (potion.costMult) {
      var stacks = Number(game.aetherElixirStackCount || 0);
      base = base * Math.pow(potion.costMult, stacks);
    }
    var cycleMult = Math.pow(1 + POTION_CYCLE_PRICE_GROWTH, Number(game.cycleCount || 0));
    return Math.floor(base * cycleMult);
  },

  buyPotion: function (id) {
    this.ensure();
    var potion = this.getPotion(id);
    if (!potion) return showToast(_t("Potion introuvable"), 1000);

    if (window.AfflictionManager && typeof AfflictionManager.arePotionsForbidden === "function" && AfflictionManager.arePotionsForbidden()) {
      return showToast(_t("🚫 Potions interdites (Ascétisme actif)"), 1600);
    }

    var cost = this.getCost(potion);
    if ((game.gold || 0) < cost) return showToast(_t("Pas assez d'or"), 1000);

    var cap = typeof getPotionStockCap === "function" ? getPotionStockCap() : 9; // v3.322.0
    if (potion.perRun && this.getStock(id) >= cap) {
      return showToast(_t("Stock plein ({n} max)", { n: cap }), 1400);
    }

    game.gold -= cost;
    game.potionsOwned[id] = this.getStock(id) + 1;
    if (!potion.perRun) game.aetherElixirStackCount = Number(game.aetherElixirStackCount || 0) + 1;

    if (window.QuestManager && typeof QuestManager.track === "function") {
      QuestManager.track("goldSpent", cost);
    }

    addLog("🧪 " + _t("{x} achetée (stock : {n})", { x: _td(potion.name), n: game.potionsOwned[id] }), "event");
    showToast(_td(potion.name) + " +1", 1300);
    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  usePotion: function (id) {
    this.ensure();
    var potion = this.getPotion(id);
    if (!potion) return showToast(_t("Potion introuvable"), 1000);
    if (potion.perRun && window.heroLockToast && heroLockToast()) return; // v3.307.0 : pas d'armement en expédition

    if (window.AfflictionManager && typeof AfflictionManager.arePotionsForbidden === "function" && AfflictionManager.arePotionsForbidden()) {
      return showToast(_t("🚫 Potions interdites (Ascétisme actif)"), 1600);
    }

    var stock = this.getStock(id);
    if (stock <= 0) return showToast(_t("Aucune potion en stock"), 1000);

    if (potion.perRun && this.isArmed(id)) {
      return showToast(_t("Déjà armée pour ce run — 1 par type et par run"), 1600);
    }

    game.potionsOwned[id] = stock - 1;
    if (window.AchievementManager) AchievementManager.onPotionUsed(); // v3.338.0 : « Sans une gorgée »

    if (potion.perRun) {
      game.activePotions[id] = true;
      if (this.isEffectLive()) {
        addLog("🧪 " + _t("{x} bue — active pour la mission en cours.", { x: _td(potion.name) }), "event");
      } else {
        addLog("🧪 " + _t("{x} bue — armée pour la prochaine mission.", { x: _td(potion.name) }), "event");
      }
    } else {
      game.pendingPotionBonuses.aetherNext = Number(game.pendingPotionBonuses.aetherNext || 0) + potion.bonus;
      addLog("🌀 " + _t("{x} bu — bonus prêt pour la prochaine ascension", { x: _td(potion.name) }), "event");
    }

    if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") {
      StatsSystem.recalcStats();
    }

    showToast(_t("{x} utilisée", { x: _td(potion.name) }), 1500);
    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  sellPotion: function (id) {
    this.ensure();
    this.ensureHealing();
    var potion = this.getPotion(id) || this.getHealingPotion(id);
    if (!potion) return showToast(_t("Potion introuvable"), 1000);

    var isHealing = !this.getPotion(id);
    var stock = isHealing ? this.getHealingStock(id) : this.getStock(id);
    if (stock <= 0) return showToast(_t("Aucune potion à vendre"), 1000);

    var value = Math.floor(this.getCost(potion) / 2);
    if (isHealing) game.healingPotionsOwned[id] = stock - 1;
    else game.potionsOwned[id] = stock - 1;
    game.gold += value;

    addLog("💰 " + _t("{x} vendue (+{n} or)", { x: _td(potion.name), n: formatNumber(value) }), "event");
    showToast(_t("+{n} or", { n: formatNumber(value) }), 1300);
    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  /* v3.115.0 : plus de minuteur — expiration événementielle (fin de run, consumeRunPotions).
     Signature conservée pour l'appel existant de game-loop.js (protégé, non modifié). */
  tick: function () {
    return false;
  },

    ensureHealing: function () {
    if (!game.healingPotionsOwned || typeof game.healingPotionsOwned !== "object") {
      game.healingPotionsOwned = {};
    }
    if (typeof game.lastHealUse !== "number") game.lastHealUse = 0;
  },

  getHealingPotion: function (id) {
    return (HEALING_POTIONS_DB || []).find(function (p) { return p.id === id; }) || null;
  },

  getHealingStock: function (id) {
    this.ensureHealing();
    return Number(game.healingPotionsOwned[id] || 0);
  },

  /* v3.291.0 : limite d'achat quotidienne (potion.dailyBuyLimit). Compteur rangé dans
     game.village.potionShop — game.village est sauvegardé tel quel, sans toucher
     save-system.js, et la Boutique est appelée à rejoindre le village. Jour civil. */
  _shopDaily: function () {
    if (!game.village || typeof game.village !== "object") game.village = {};
    var st = game.village.potionShop;
    var today = new Date().toDateString();
    if (!st || typeof st !== "object" || st.dayKey !== today) st = game.village.potionShop = { dayKey: today, bought: {} };
    if (!st.bought || typeof st.bought !== "object") st.bought = {};
    return st;
  },

  /* Achats restants aujourd'hui, Infinity si la potion n'a pas de limite. */
  getHealingBuyRemaining: function (id) {
    var potion = this.getHealingPotion(id);
    if (!potion || typeof potion.dailyBuyLimit !== "number") return Infinity;
    return Math.max(0, potion.dailyBuyLimit - Number(this._shopDaily().bought[id] || 0));
  },

  buyHealingPotion: function (id) {
    this.ensureHealing();
    var potion = this.getHealingPotion(id);
    if (!potion) return;

    if (this.getHealingBuyRemaining(id) <= 0) {
      return showToast(_t("Le colporteur n'en a plus aujourd'hui ({n} max)", { n: potion.dailyBuyLimit }), 1600);
    }

    if (window.AfflictionManager && typeof AfflictionManager.arePotionsForbidden === "function" && AfflictionManager.arePotionsForbidden()) {
      return showToast(_t("🚫 Potions interdites (Ascétisme actif)"), 1600);
    }

    var cost = this.getCost(potion);
    if ((game.gold || 0) < cost) return showToast(_t("Pas assez d'or"), 1000);

    game.gold -= cost;
    game.healingPotionsOwned[id] = this.getHealingStock(id) + 1;
    if (typeof potion.dailyBuyLimit === "number") {
      var daily = this._shopDaily();
      daily.bought[id] = Number(daily.bought[id] || 0) + 1;
    }

    addLog("🩹 " + _t("{x} achetée (stock : {n})", { x: _td(potion.name), n: game.healingPotionsOwned[id] }), "event");
    showToast(_td(potion.name) + " +1", 1300);
    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  getHealCooldownRemainingMs: function () { // v3.102.0 : conservé pour compatibilité (toujours 0, le tour de round remplace le cooldown)
    return 0;
  },

  _legacyHealCooldownRemainingMs: function () {
    this.ensureHealing();
    var elapsed = Date.now() - (game.lastHealUse || 0);
    return Math.max(0, HEALING_POTION_COOLDOWN_MS - elapsed);
  },

  /* v3.102.0 (P2) : la potion est l'action « Objet » d'un round (elle consomme le tour, voir CombatEngine.heroAction) —
     plus de cooldown d'horloge. Retourne true si une potion a été bue. */
  useHealingPotion: function (id) {
    this.ensureHealing();
    var potion = this.getHealingPotion(id);
    if (!potion) return false;
    if (window.heroLockToast && heroLockToast()) return false; // v3.307.0 : libre au combat de nœud (verrou levé)

    if (window.AfflictionManager && typeof AfflictionManager.arePotionsForbidden === "function" && AfflictionManager.arePotionsForbidden()) {
      showToast(_t("🚫 Potions interdites (Ascétisme actif)"), 1600);
      return false;
    }

    var stock = this.getHealingStock(id);
    if (stock <= 0) { showToast(_t("Aucune potion en stock"), 1000); return false; }

    var maxHp = Number(game.heroMaxHp || 1);
    var currentHp = Number(game.heroHp != null ? game.heroHp : maxHp);
    if (currentHp >= maxHp) { showToast(_t("PV déjà au maximum"), 1000); return false; }

    game.healingPotionsOwned[id] = stock - 1;
    if (window.AchievementManager) AchievementManager.onPotionUsed(); // v3.338.0 : « Sans une gorgée »
    var healed = Math.floor(maxHp * potion.healPercent);
    game.heroHp = Math.min(maxHp, currentHp + healed);
    game.lastHealUse = Date.now();

    addLog("🩹 " + _t("{x} utilisée (+{n} PV)", { x: _td(potion.name), n: formatNumber(healed) }), "event");
    showToast(_t("+{n} PV", { n: formatNumber(healed) }), 1200);
    if (typeof renderHeroHp === "function") renderHeroHp();
    if (typeof renderHud === "function") renderHud();
    if (typeof renderHealButtons === "function") renderHealButtons();
    if (game.activeTab !== "combat" && typeof renderPanel === "function") renderPanel();
    saveGame();
    return true;
  },

  getActiveEffects: function () {
    this.ensure();
    var effects = {};
    if (!this.isEffectLive()) return effects; // armées mais dormantes hors mission (jamais de boost du farm libre)

    (POTIONS_DB || []).forEach(function (potion) {
      if (!potion.perRun) return;
      if (game.activePotions[potion.id] === true) {
        effects[potion.stat] = (effects[potion.stat] || 0) + potion.bonus;
      }
    });

    return effects;
  }
};

window.PotionManager = PotionManager;

/* =====================================================================
   v3.379.0 — POTION AUTOMATIQUE en mode Grimoire (décisions Seb, 28/09/2026).
   Hors des règles : un seuil (Jamais / Tard / Normal / Tôt) et « garder la dernière pour le boss ».
   Réglage de partie (game.potionAuto, sauvegardé) : « Normal » sur une partie neuve, « Jamais »
   sur une partie d'avant cette version. Lu par CombatEngine.tickRoundClock, avant les règles ;
   la potion passe par heroAction("potion") : même plafond par sortie, elle prend le tour.
   ===================================================================== */

var POTION_AUTO_THRESHOLDS = [
  { id: "jamais", label: _t("Jamais"), value: 0,    desc: _t("Tu bois à la main, comme en mode Tactique.") },
  { id: "tard",   label: _t("Tard"),   value: 0.25, desc: _t("Sous 25 % de tes PV, pour ménager ton stock.") },
  { id: "normal", label: _t("Normal"), value: 0.40, desc: _t("Sous 40 % de tes PV — le réglage conseillé.") },
  { id: "tot",    label: _t("Tôt"),    value: 0.55, desc: _t("Sous 55 % de tes PV, pour ne jamais frôler la chute.") }
];
var POTION_AUTO_NEW_GAME = { threshold: "normal", keepForBoss: true };   // partie neuve (fullResetState)
var POTION_AUTO_OLD_SAVE = { threshold: "jamais", keepForBoss: true };   // sauvegarde sans le réglage
var POTION_AUTO_TARGET_PCT = 0.60; // « suffit » = te remonte au moins à 60 % de tes PV

var PotionAutoManager = {
  /* Réglage normalisé (tolérant : un id inconnu retombe sur « Jamais »). */
  normalize: function (raw, fallback) {
    var f = fallback || POTION_AUTO_OLD_SAVE;
    if (!raw || typeof raw !== "object") return { threshold: f.threshold, keepForBoss: f.keepForBoss };
    var ok = POTION_AUTO_THRESHOLDS.some(function (t) { return t.id === raw.threshold; });
    return { threshold: ok ? raw.threshold : "jamais", keepForBoss: raw.keepForBoss !== false };
  },

  ensure: function () {
    game.potionAuto = this.normalize(game.potionAuto);
    return game.potionAuto;
  },

  getThreshold: function (id) {
    return POTION_AUTO_THRESHOLDS.filter(function (t) { return t.id === id; })[0] || POTION_AUTO_THRESHOLDS[0];
  },

  set: function (key, value) {
    var s = this.ensure();
    if (key === "threshold" && POTION_AUTO_THRESHOLDS.some(function (t) { return t.id === value; })) s.threshold = value;
    if (key === "keepForBoss") s.keepForBoss = !!value;
    if (typeof saveGame === "function") saveGame();
  },

  /* Un boss ou une élite est-il devant, dans la sortie en cours ? Quête d'aventure dont l'étape
     boss/élite n'est pas faite, ou donjon avant la vague du boss. Chasse, expédition : non. */
  hasBossAhead: function () {
    if (game.dungeonRun && game.dungeonRun.active) {
      var n = (typeof DUNGEON_CONFIG !== "undefined" && DUNGEON_CONFIG.waveCount) || 15;
      return Number(game.dungeonRun.wave || 1) <= n;
    }
    if (game.adventureQuestRun && game.adventureQuestRun.active && window.AdventureQuestManager) {
      var q = (window.ADVENTURE_QUESTS || {})[game.adventureQuestRun.questId];
      if (!q) return false;
      return q.steps.some(function (s) {
        return (s.type === "bossKill" || s.type === "eliteKill") && !AdventureQuestManager.isStepComplete(q, s);
      });
    }
    return false;
  },

  /* Le combat en cours oppose-t-il un boss ou une élite (isBoss couvre les deux) ? */
  isFacingBoss: function () {
    var list = (window.CombatActors && typeof CombatActors.enemies === "function") ? CombatActors.enemies() : [game.enemy];
    return (list || []).some(function (e) { return e && e.isBoss && Number(e.hp || 0) > 0; });
  },

  /* Potion à boire maintenant, ou null. La plus petite qui te remonte à 60 %, sinon la plus forte. */
  pick: function () {
    if (game.combatMode !== "grimoire") return null;
    var s = this.ensure();
    var seuil = this.getThreshold(s.threshold).value;
    if (!(seuil > 0)) return null;
    var maxHp = Number(game.heroMaxHp || 0);
    if (!(maxHp > 0)) return null;
    var hp = Number(game.heroHp != null ? game.heroHp : maxHp);
    if (hp <= 0 || hp / maxHp > seuil) return null;
    if (window.AfflictionManager && typeof AfflictionManager.arePotionsForbidden === "function" && AfflictionManager.arePotionsForbidden()) return null;
    if (window.SortieManager && typeof SortieManager.canUsePotion === "function" && !SortieManager.canUsePotion()) return null;

    var enStock = (HEALING_POTIONS_DB || []).filter(function (p) { return PotionManager.getHealingStock(p.id) > 0; })
      .sort(function (a, b) { return a.healPercent - b.healPercent; });
    if (!enStock.length) return null;

    // Réserve : la dernière potion disponible attend le boss, s'il en reste un devant.
    if (s.keepForBoss && !this.isFacingBoss() && this.hasBossAhead()) {
      var permises = (window.SortieManager && typeof SortieManager.getPotionsLeft === "function") ? SortieManager.getPotionsLeft() : 2;
      var stock = enStock.reduce(function (n, p) { return n + PotionManager.getHealingStock(p.id); }, 0);
      if (Math.min(permises, stock) <= 1) return null;
    }

    var suffit = enStock.filter(function (p) { return hp + maxHp * p.healPercent >= maxHp * POTION_AUTO_TARGET_PCT; })[0];
    return (suffit || enStock[enStock.length - 1]).id;
  }
};

window.POTION_AUTO_THRESHOLDS = POTION_AUTO_THRESHOLDS;
window.POTION_AUTO_NEW_GAME = POTION_AUTO_NEW_GAME;
window.POTION_AUTO_OLD_SAVE = POTION_AUTO_OLD_SAVE;
window.PotionAutoManager = PotionAutoManager;
