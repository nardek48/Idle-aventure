"use strict";
/* systems/camp-system.js — v3.106.0 : plus de repos à horloge. Régénération lente au Campement
   (5 % PV max / min, sans plafond hors ligne depuis v3.457.7) + Repas (v3.786.0 : remplace les rations,
   toute l'équipe à plein, payé en blé, viande, eau selon le manque). */

var CAMP_REGEN_PCT_PER_MIN = 0.05;
var CAMP_MEAL_PER_10 = { ble: 3, viande: 3, eau: 1 };                 // v3.786.0 : prix du repas par 10 % manquants
var CAMP_MEAL_SOURCES = { ble: "farm", viande: "hunt", eau: "well" }; // bâtiment qui produit chaque denrée
/* v3.457.7 (P10, choix Seb) : plus de plafond hors ligne — rechargement et reprise après veille soignent pareil. */

var CampManager = {
  _frac: {}, // fraction de PV en attente par membre (« hero », id de compagnon), en mémoire seulement
  ensureDefaults: function () {
    if (typeof game.campRegenLastAt !== "number" || game.campRegenLastAt <= 0) game.campRegenLastAt = Date.now();
  },

  /* Run à sortie en cours (donjon / quête d'aventure / élite de carte) : pas de repos au camp tant qu'il n'est pas clos. */
  _hasActiveRun: function () {
    // v3.307.0 : pas de feu de camp en expédition. v3.429.4 : la préparation (besace, pactes) n'engage pas le héros
    if (window.SceneRunManager && SceneRunManager.isHeroEngaged()) return true;
    if (game.dungeonRun && game.dungeonRun.active) return true;
    if (game.adventureQuestRun && game.adventureQuestRun.active) return true;
    if (game.livingMaps && game.livingMaps.fight) return true; // audit 04/11 : élite de carte engagée, pas de feu de camp
    return false;
  },

  getRegenPctPerMin: function () {
    var repos = (window.MemoryManager && MemoryManager.has("repos_camp")) ? 1.5 : 1; // v3.322.0 : Repos du camp
    return CAMP_REGEN_PCT_PER_MIN * repos; // v3.327.0 : « Repos du guerrier » retiré (doublon de Repos du camp)
  },

  /* La régénération court hors combat (héros à terre inclus) : jamais pendant un combat actif ni pendant
     une sortie à run (donjon, chasse, quête d'aventure — v3.108.0 : la quête n'était pas exclue). */
  isRegenActive: function () {
    if (this._hasActiveRun()) return false;
    return game.activeTab !== "combat" || (game.heroHp || 0) <= 0;
  },

  /* Accrual paresseux : appelé par renderHud (chaque tick) et au boot (offline : journal, quel que soit l'onglet).
     Le repère est avancé à chaque appel ; la part de PV pas encore entière attend dans _frac (v3.516.0). */
  applyRegen: function (offline) {
    this.ensureDefaults();
    var now = Date.now();
    var elapsedMin = Math.max(0, now - game.campRegenLastAt) / 60000;
    game.campRegenLastAt = now;
    if (elapsedMin <= 0) return 0;
    // Hors ligne : le joueur était absent, on régénère quel que soit l'onglet restauré (sauf run en cours).
    if (offline ? this._hasActiveRun() : !this.isRegenActive()) return 0;

    // v3.448.0 : le feu soigne aussi les compagnons restés au camp (même rythme)
    // v3.516.0 (audit TUT-1) : la fraction de PV non rendue est gardée par membre ; l'arrondi par appel perdait 4 à 40 %
    var self = this, pctMin = this.getRegenPctPerMin(), fr = this._frac;
    var gain = function (key, cur, max) {
      var missing = Math.max(0, max - cur);
      if (missing <= 0) { fr[key] = 0; return 0; }
      var exact = max * pctMin * elapsedMin + (fr[key] || 0), g = Math.min(Math.floor(exact), Math.floor(missing));
      fr[key] = g >= Math.floor(missing) ? 0 : exact - g;
      return g;
    };
    var maxHp = game.heroMaxHp || 1;
    var hp = game.heroHp != null ? game.heroHp : maxHp;
    var heal = gain("hero", hp, maxHp), total = heal;
    this.campCompanionIds().forEach(function (id) {
      var max = CompanionManager.maxHpOf(id), cur = CompanionManager.hpOf(id), g = gain(id, cur, max);
      if (g > 0) { CompanionManager.state(id).hp = cur + g; total += g; }
    });
    if (total <= 0) return 0;

    game.heroHp = hp + heal;
    if (offline && heal > 0) addLog("🔥 " + _t("Régénération au camp pendant ton absence : +{n} PV.", { n: formatNumber(heal) }), "event");
    if (typeof renderHeroHp === "function") renderHeroHp();
    self.refreshCampCard();
    return total;
  },

  /* v3.448.0 : compagnons au camp (recrutés, pas en patrouille), que le feu et le repas soignent. */
  campCompanionIds: function () {
    if (!window.CompanionManager) return [];
    return CompanionManager.unlockedIds().filter(function (id) { return !(window.PatrolManager && PatrolManager.isOnPatrol(id)); });
  },

  teamFull: function () {
    if ((game.heroHp || 0) < (game.heroMaxHp || 1)) return false;
    return this.campCompanionIds().every(function (id) { return CompanionManager.hpOf(id) >= CompanionManager.maxHpOf(id); });
  },

  /* Rafraîchit la carte Feu de camp sans re-rendre le panneau (renderHud tourne à chaque frame). */
  refreshCampCard: function () {
    if (typeof document === "undefined") return;
    var v = document.getElementById("camp-fire-hp-value");
    if (!v) return;
    var maxHp = game.heroMaxHp || 1;
    var hp = Math.floor(game.heroHp || 0);
    // v3.116.0 (Lot C) : maj des barres PV/régénération en plus des textes (nouveau rendu Campement).
    // v3.174.0 : l'élément est maintenant le texte DANS la jauge du kit
    // (kgauge-text, blanc ombré) — plus de span coloré camp-hp-current.
    v.textContent = formatNumber(hp) + " / " + formatNumber(maxHp);
    var pct = Math.max(0, Math.min(100, (hp / maxHp) * 100)) + "%";
    var hpFill = document.getElementById("camp-hp-fill");
    if (hpFill) hpFill.style.width = pct;
    // v3.448.0 : les barres des compagnons au camp ; v3.786.0 : leurs anneaux autour du portrait (--p)
    this.campCompanionIds().forEach(function (id) {
      var p = Math.max(0, Math.min(100, CompanionManager.hpOf(id) / Math.max(1, CompanionManager.maxHpOf(id)) * 100));
      var f = document.getElementById("camp-comp-hp-" + id);
      if (f) f.style.width = p + "%";
      var r = document.getElementById("camp-ring-" + id);
      if (r) r.style.setProperty("--p", p.toFixed(1));
    });
    var mc = document.getElementById("camp-meal-cost"); // le prix du repas baisse avec le feu
    if (mc && typeof campMealCostHTML === "function") mc.innerHTML = campMealCostHTML();
    // v3.233.0 : la barre camp-regen-fill n'existe plus (doublon de la barre de PV).
    var eta = document.getElementById("camp-fire-eta");
    if (eta) {
      var full = (game.heroHp || 0) >= maxHp;
      // v3.242.0 : même rendu que camp-view.js (icônes PNG) — ce textContent réécrivait
      // l'élément avec les anciens emoji à chaque tick, annulant l'icône de la vue.
      eta.innerHTML = full
        ? '<img class=ico-inline src=images/Icons/system/check_valid.webp> ' + _t("PV au maximum")
        : '<img class=ico-inline src=images/Icons/system/hourglass_waiting.webp> ' + _t("Max dans {d}", { d: formatTime(Math.ceil(this.getMinutesToFull() * 60)) });
      if (this.teamFull() && typeof renderPanel === "function") renderPanel(); // ré-évalue le bouton Repas (grisé si tous pleins)
    }
  },

  /* Minutes restantes avant PV max au rythme actuel (affichage). */
  getMinutesToFull: function () {
    var maxHp = game.heroMaxHp || 1;
    var missing = maxHp - (game.heroHp != null ? game.heroHp : maxHp);
    if (missing <= 0) return 0;
    return missing / (maxHp * this.getRegenPctPerMin());
  },

  /* v3.786.0 (atelier repas-camp, Seb C) : LE REPAS remplace les rations. Toute l'équipe au camp remonte à plein ;
     prix au manque : 3 Blé + 3 Viande + 1 Eau par tranche de 10 % de PV manquants (ressources déjà produites seules). */
  teamMissingPct: function () {
    var max = game.heroMaxHp || 1, cur = Math.min(max, Math.max(0, game.heroHp || 0));
    this.campCompanionIds().forEach(function (id) {
      var m = CompanionManager.maxHpOf(id);
      max += m; cur += Math.min(m, Math.max(0, CompanionManager.hpOf(id)));
    });
    return max > 0 ? Math.max(0, 1 - cur / max) : 0;
  },

  mealCost: function () {
    var n = Math.ceil(this.teamMissingPct() * 10 - 1e-9), out = {};
    if (n <= 0) return out;
    var mult = (window.MemoryManager && MemoryManager.has("cuisine_campagne")) ? (typeof MEMORY_CUISINE_MEAL_MULT === "number" ? MEMORY_CUISINE_MEAL_MULT : 0.75) : 1;
    Object.keys(CAMP_MEAL_PER_10).forEach(function (k) {
      if (window.ProductionManager && !ProductionManager.isBuildingUnlocked(CAMP_MEAL_SOURCES[k])) return; // pas encore produit : gratuit
      out[k] = Math.max(1, Math.ceil(CAMP_MEAL_PER_10[k] * n * mult));
    });
    return out;
  },

  mealMissing: function () {
    var c = this.mealCost();
    return Object.keys(c).filter(function (k) { return !window.WarehouseManager || WarehouseManager.getAmount(k) < c[k]; });
  },

  /* audit 04/11 (QA-8) : en sortie de combat (donjon, élite, quête, chasse), pas de repas du Camp ;
     la règle annoncée : « tu pars avec tes PV actuels ». Raison affichée, ou null. */
  mealLockReason: function () {
    if (window.heroLockReason && heroLockReason()) return heroLockReason(); // v3.307.0
    if (typeof hasCombatQuestContext === "function" && hasCombatQuestContext()) return _t("En pleine sortie, pas de repas : termine ou abandonne d'abord.");
    return null;
  },

  canEatMeal: function () { return !this.teamFull() && !this.mealLockReason() && this.mealMissing().length === 0; },

  eatMeal: function () {
    if (this.teamFull()) { showToast(_t("PV déjà au maximum"), 1200); return false; }
    if (window.heroLockToast && heroLockToast()) return false; // v3.307.0
    var lock = this.mealLockReason();
    if (lock) { showToast(lock, 1800); return false; }
    if (this.mealMissing().length) { showToast(_t("Il manque de quoi préparer le repas"), 1600); return false; }
    var c = this.mealCost();
    Object.keys(c).forEach(function (k) { WarehouseManager.removeResource(k, c[k]); });
    var maxHp = game.heroMaxHp || 1, healed = Math.max(0, maxHp - (game.heroHp || 0));
    game.heroHp = maxHp;
    this._frac.hero = 0;
    var self = this, nourris = [];
    this.campCompanionIds().forEach(function (id) {
      var max = CompanionManager.maxHpOf(id);
      self._frac[id] = 0;
      if (CompanionManager.hpOf(id) >= max) return;
      CompanionManager.state(id).hp = max;
      nourris.push(_td(getCompanionDef(id).name));
    });
    addLog("🍖 " + (nourris.length
      ? _t("Repas au camp — +{n} PV, et pour {y}.", { n: formatNumber(healed), y: nourris.join(", ") })
      : _t("Repas au camp — +{n} PV.", { n: formatNumber(healed) })), "event");
    showToast("🍖 " + _t("Toute l'équipe à plein"), 1600);
    if (typeof renderAll === "function") renderAll();
    if (typeof saveGame === "function") saveGame();
    return true;
  }
};

window.CampManager = CampManager;
window.CAMP_REGEN_PCT_PER_MIN = CAMP_REGEN_PCT_PER_MIN;
window.CAMP_MEAL_PER_10 = CAMP_MEAL_PER_10;

/* v3.656.0 (atelier festin.html, placement A, choix de Seb du 04/11) — LE FESTIN.
   Blé, viande et eau du village contre +10 % de dégâts et de PV pour tout le groupe, pendant 3 sorties (pas l'exploration libre).
   Prix par monde (le plus loin atteint) : 25 % / 25 % / 10 % de l'Entrepôt au niveau max du monde. État dans le jour de jeu (worldDay.feast, déjà sauvegardé). */
var FEAST_SORTIES = 3;
var FEAST_BONUS = 0.10;
var FEAST_COST_BY_WORLD = [
  { ble: 300, viande: 300, eau: 125 },    // Forêt (Entrepôt 1 250)
  { ble: 500, viande: 500, eau: 200 },    // Désert (2 000)
  { ble: 550, viande: 550, eau: 225 },    // Ruines (2 250)
  { ble: 1000, viande: 1000, eau: 400 },  // Crypte (4 000)
  { ble: 1500, viande: 1500, eau: 600 },  // Montagne (6 000)
  { ble: 2000, viande: 2000, eau: 800 }   // Tour (8 000)
];
var FEAST_ICON = "images/Icons/camp/festin.webp";

var FeastManager = {
  _w: function () { return window.WorldDays ? WorldDays.ensure() : {}; },
  left: function () { return Math.max(0, Math.floor(Number(this._w().feast) || 0)); },
  // Vivant seulement pendant une sortie hors exploration libre (même règle que les potions à bonus).
  isLive: function () { return this.left() > 0 && !!(window.PotionManager && PotionManager.isEffectLive()); },
  mult: function () { return this.isLive() ? 1 + FEAST_BONUS : 1; },
  hpPct: function () { return this.isLive() ? FEAST_BONUS : 0; },
  cost: function () {
    // ECON-8 : prix du monde le plus loin atteint (un retour en Forêt ne le divise plus par cinq)
    var reached = (window.WorldCaps && typeof WorldCaps.getReachedWorldIndex === "function") ? WorldCaps.getReachedWorldIndex() : Number((window.WorldManager && WorldManager.worldIndex) || 0);
    var w = Math.max(0, Math.min(FEAST_COST_BY_WORLD.length - 1, Number(reached) || 0));
    return FEAST_COST_BY_WORLD[w];
  },
  missing: function () {
    var c = this.cost(), out = [];
    Object.keys(c).forEach(function (k) { if (WarehouseManager.getAmount(k) < c[k]) out.push(k); });
    return out;
  },
  canPrepare: function () { return this.left() === 0 && this.missing().length === 0; },
  prepare: function () {
    if (this.left() > 0) return false;
    if (window.heroLockToast && heroLockToast()) return false;
    if (this.missing().length) { showToast(_t("Il manque de quoi préparer le festin"), 1400); return false; }
    var c = this.cost();
    Object.keys(c).forEach(function (k) { WarehouseManager.removeResource(k, c[k]); });
    this._w().feast = FEAST_SORTIES;
    addLog("🔥 " + _t("Festin au camp : +{n} % de dégâts et de PV pour tout le groupe, pendant {k} sorties.", { n: Math.round(FEAST_BONUS * 100), k: FEAST_SORTIES }), "event");
    showToast("🔥 " + _t("Festin préparé"), 1400);
    if (typeof saveGame === "function") saveGame();
    if (typeof renderAll === "function") renderAll();
    return true;
  },
  // Appelé par WorldDays.onSortieEnd (hors exploration libre) : une sortie de moins.
  onSortieEnd: function (context) {
    if (context === "farm") return;
    var w = this._w(), n = this.left();
    if (n <= 0) return;
    w.feast = n - 1;
    if (w.feast === 0) addLog("🔥 " + _t("Le festin est fini."), "event");
  }
};

window.FeastManager = FeastManager;
window.FEAST_COST_BY_WORLD = FEAST_COST_BY_WORLD;
window.FEAST_ICON = FEAST_ICON;

