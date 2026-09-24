"use strict";
/* systems/memory-system.js — v3.322.0 (Offrande, conception v1.2) : remplace l'Ascension.
   - Offrande : se séparer d'un objet rend de l'Aether (rareté seule, 0 si acheté).
   - Souvenirs : les grandes victoires rendent de l'Aether.
   - Mémoire : game.totalAetherEarned est la jauge (jamais vidée) ; un niveau atteint ouvre
     un choix. game.aether est le solde dépensable, qui ne sert plus qu'aux reprises.
   Tous les effets des choix passent par MemoryManager.has(id) : un seul point à lire. */

var MEMORY_INVENTORY_BASE = 25;  // O8 : sac de base
var MEMORY_INVENTORY_BONUS = 25; // Sac profond : 25 -> 50

var MemoryManager = {
  /* État persistant (save-system.js : buildSaveData, loadGame, hardResetState, fullResetState). */
  ensure: function () {
    var m = game.memory;
    if (!m || typeof m !== "object") m = game.memory = {};
    if (!m.choices || typeof m.choices !== "object") m.choices = {};
    if (typeof m.reprises !== "number") m.reprises = 0;
    if (typeof m.carry !== "number") m.carry = 0;          // fraction d'Aether de la Mémoire vive
    if (typeof m.firstOffering !== "boolean") m.firstOffering = false;
    if (typeof m.announced !== "number") m.announced = 0;  // dernier niveau annoncé au joueur
    if (typeof m.voieFreeDay !== "string") m.voieFreeDay = "";
    return m;
  },

  /* ---------- Effets des choix ---------- */
  has: function (optionId) {
    var m = this.ensure();
    for (var lvl in m.choices) {
      if (m.choices[lvl] === optionId && Number(lvl) <= this.getLevel()) return true;
    }
    return false;
  },

  /* Voie libre (niveau 7) : un changement de voie gratuit par jour (date locale). */
  todayKey: function () {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  },
  isVoieFreeToday: function () {
    return this.has("voie_libre") && this.ensure().voieFreeDay !== this.todayKey();
  },
  useVoieFree: function () { this.ensure().voieFreeDay = this.todayKey(); },

  getInventoryCap: function () {
    return MEMORY_INVENTORY_BASE + (this.has("sac_profond") ? MEMORY_INVENTORY_BONUS : 0);
  },

  /* ---------- Jauge et niveaux ---------- */
  getTotal: function () { return Number(game.totalAetherEarned || 0); },

  /* Plafond : 4 niveaux par monde atteint (O6). */
  getCap: function () {
    var reached = game.worldsEverReached && typeof game.worldsEverReached === "object" ? game.worldsEverReached : {};
    var maxIdx = 0;
    Object.keys(reached).forEach(function (k) { if (reached[k]) maxIdx = Math.max(maxIdx, Number(k) || 0); });
    return Math.min(MEMORY_LEVEL_COSTS.length, (maxIdx + 1) * MEMORY_LEVELS_PER_WORLD);
  },

  /* Niveau porté par la jauge seule, sans plafond de monde. */
  getGaugeLevel: function () {
    var total = this.getTotal(), cum = 0, lvl = 0;
    for (var i = 0; i < MEMORY_LEVEL_COSTS.length; i++) {
      cum += MEMORY_LEVEL_COSTS[i];
      if (total >= cum) lvl = i + 1; else break;
    }
    return lvl;
  },

  getLevel: function () { return Math.min(this.getGaugeLevel(), this.getCap()); },

  /* Pour l'écran : où en est la jauge vers le prochain niveau. */
  getProgress: function () {
    var total = this.getTotal(), lvl = this.getGaugeLevel(), cum = 0;
    for (var i = 0; i < lvl; i++) cum += MEMORY_LEVEL_COSTS[i];
    var next = MEMORY_LEVEL_COSTS[lvl];
    return {
      level: this.getLevel(), gaugeLevel: lvl, cap: this.getCap(), total: total,
      into: total - cum, need: next || 0, maxed: lvl >= MEMORY_LEVEL_COSTS.length,
      // la jauge a atteint le plafond du monde, et d'autres niveaux existent plus loin
      capped: lvl >= this.getCap() && this.getCap() < MEMORY_LEVEL_COSTS.length
    };
  },

  getLevelDef: function (level) {
    return (window.MEMORY_LEVELS || []).find(function (d) { return d.level === level; }) || null;
  },

  getChoice: function (level) { return this.ensure().choices[level] || null; },

  getPendingLevels: function () {
    var out = [], lvl = this.getLevel();
    for (var i = 1; i <= lvl; i++) if (!this.getChoice(i)) out.push(i);
    return out;
  },

  getRepriseCost: function () {
    return Math.floor(MEMORY_REPRISE_BASE_COST * Math.pow(MEMORY_REPRISE_MULT, this.ensure().reprises));
  },

  /* Choisir (gratuit) ou reprendre un choix (payant, ×3 à chaque fois). */
  choose: function (level, optionId) {
    if (window.heroLockToast && heroLockToast()) return false; // v3.307.0 : héros en expédition
    var m = this.ensure(), def = this.getLevelDef(level);
    if (!def || level > this.getLevel()) return false;
    if (!def.options.some(function (o) { return o.id === optionId; })) return false;
    var current = m.choices[level];
    if (current === optionId) return false;
    if (current) {
      var cost = this.getRepriseCost();
      if (Number(game.aether || 0) < cost) { showToast("Pas assez d'Aether (" + cost + ")", 1400); return false; }
      game.aether = Number(game.aether || 0) - cost;
      m.reprises += 1;
      addLog("Mémoire : choix du niveau " + level + " repris (−" + cost + " Aether)", "event");
    }
    m.choices[level] = optionId;
    this.afterChoice();
    return true;
  },

  afterChoice: function () {
    if (window.StatsSystem) StatsSystem.recalcStats();
    if (typeof renderAll === "function") renderAll();
    if (typeof saveGame === "function") saveGame();
  },

  /* ---------- Gains d'Aether ---------- */
  gainAether: function (amount, label) {
    amount = Number(amount) || 0;
    if (amount <= 0) return 0;
    var m = this.ensure();
    var raw = amount * (this.has("memoire_vive") ? 1.25 : 1) + m.carry; // Mémoire vive : tout l'Aether
    var gained = Math.floor(raw + 1e-9);
    m.carry = raw - gained;
    if (gained <= 0) return 0;
    var before = this.getLevel();
    game.aether = Number(game.aether || 0) + gained;
    game.totalAetherEarned = Number(game.totalAetherEarned || 0) + gained;
    if (label) addLog("✨ " + label + " : +" + gained + " Aether", "event");
    this.announceLevels(before);
    return gained;
  },

  /* Un niveau atteint s'annonce une fois ; le choix se fait dans l'écran de Mémoire. */
  announceLevels: function (before) {
    var m = this.ensure(), now = this.getLevel();
    if (now <= before || now <= m.announced) return;
    m.announced = now;
    addLog("🌟 Niveau de Mémoire " + now + " atteint : un choix t'attend (Héros › Mémoire).", "event");
    if (typeof showToast === "function") showToast("🌟 Mémoire niveau " + now + " : un choix t'attend", 2600);
  },

  /* Souvenirs : appelés là où la victoire est déjà reconnue. */
  souvenir: function (key, label) {
    var v = (window.MEMORY_SOUVENIRS || {})[key];
    return v ? this.gainAether(v, label || "Souvenir") : 0;
  },

  /* ---------- Offrande ---------- */
  getOfferingValue: function (item) {
    if (!item || item.fromShop) return 0; // O9 : un objet acheté ne porte aucun souvenir
    return Number((window.MEMORY_OFFERING_VALUES || {})[item.rarity] || 0);
  },

  /* v3.327.0 : « Main offrante » sort des talents (T4) ; l'Offrande rend sa valeur fixe. */
  rollOfferingValue: function (item) {
    return this.getOfferingValue(item);
  },

  /* Offre un objet déjà retiré du sac (ou qui n'y est jamais entré). Retourne l'Aether gagné. */
  offerItem: function (item, how) {
    if (!item) return 0;
    var value = this.rollOfferingValue(item);
    var gained = value > 0 ? this.gainAether(value, null) : 0;
    var prefix = how === "auto" ? "🤖 " : (how === "full" ? "🎒 Sac plein : " : "");
    addLog(prefix + item.name + " offert à l'Aether" + (gained > 0 ? " (+" + gained + ")" : " — cet objet ne porte aucun souvenir"), "event");
    this.noteFirstOffering();
    return gained;
  },

  /* Une ligne du Veilleur à la toute première Offrande (conception v1.2 §5.5). */
  noteFirstOffering: function () {
    var m = this.ensure();
    if (m.firstOffering) return;
    m.firstOffering = true;
    addLog("Le Veilleur : « Ce que tu lui donnes, l'Aether ne l'oublie pas. Il le garde, pour toi. »", "event");
  },

  /* Offrir depuis le sac (remplace l'ancienne vente). */
  offer: function (uid) {
    var inv = Array.isArray(game.inventory) ? game.inventory : [];
    var index = inv.findIndex(function (it) { return it.uid === uid; });
    if (index === -1) return 0;
    var item = inv.splice(index, 1)[0];
    var gained = this.offerItem(item, "manual");
    if (typeof showToast === "function") showToast(gained > 0 ? "✨ +" + gained + " Aether" : "Offert", 1200);
    if (typeof renderAll === "function") renderAll();
    if (typeof saveGame === "function") saveGame();
    return gained;
  },

  /* Tout offrir : jamais les objets uniques (armes d'élite). */
  offerAll: function () {
    var inv = Array.isArray(game.inventory) ? game.inventory : [];
    var kept = [], total = 0, count = 0, self = this;
    inv.forEach(function (it) {
      if (it && it.unique) { kept.push(it); return; }
      count++;
      total += self.gainAether(self.rollOfferingValue(it), null);
    });
    game.inventory = kept;
    if (!count) { showToast("Aucun objet à offrir", 1200); return 0; }
    addLog("✨ " + count + " objets offerts à l'Aether (+" + total + ")", "event");
    showToast("✨ " + count + " objets offerts (+" + total + ")", 1600);
    this.noteFirstOffering();
    if (typeof renderPanel === "function") renderPanel();
    if (typeof renderHud === "function") renderHud();
    if (typeof saveGame === "function") saveGame();
    return total;
  },

  /* Somme affichée avant « Tout offrir » (valeur sans le hasard de la Main offrante). */
  previewOfferAll: function () {
    var self = this;
    return (game.inventory || []).reduce(function (s, it) { return s + (it && !it.unique ? self.getOfferingValue(it) : 0); }, 0);
  }
};

window.MemoryManager = MemoryManager;
window.MEMORY_INVENTORY_BASE = MEMORY_INVENTORY_BASE;
