"use strict";
/* systems/combat-item-system.js — v3.441.0 : OBJETS DE COMBAT (data/combat-items.js).
   Emportés à la préparation de sortie (retirés de l'Entrepôt au départ, consommés quoi qu'il arrive),
   notés dans game.sortie.items : la sauvegarde garde déjà la sortie en entier.
   Passifs, en Tactique comme en Grimoire : à l'ouverture du combat et à chaque fin de round, le contre
   du trait est posé sur chaque ennemi qui le porte (mêmes chiffres que class-combat-system.js),
   puis reposé quand il retombe. Appelé par TalentManager.onCombatStart et ClassCombatManager.onRoundEnd. */

var CombatItems = {

  /* Places : 1, puis 2 à l'Apothicaire niveau 4 (décision Seb). */
  slotCount: function () {
    var lvl = window.ApothecaryManager ? ApothecaryManager.getLevel() : 0;
    return COMBAT_ITEM_SLOTS_BASE + (lvl >= COMBAT_ITEM_SECOND_SLOT_APOTHECARY_LEVEL ? 1 : 0);
  },

  getStock: function (id) {
    return window.WarehouseManager ? WarehouseManager.getAmount(id) : 0;
  },

  /* Objets en stock, dans l'ordre des données. */
  ownedIds: function () {
    var self = this;
    return COMBAT_ITEM_ORDER.filter(function (id) { return self.getStock(id) > 0; });
  },

  /* Objets de la sortie EN COURS (mission seulement, comme les potions à bonus). */
  carried: function () {
    var s = game.sortie;
    if (!s || !s.active || !s.context || s.context === "farm" || !Array.isArray(s.items)) return [];
    return s.items.filter(function (id) { return !!COMBAT_ITEMS[id]; });
  },

  /* Un objet emporté tient-il ce trait ? Lu par le contexte du Grimoire (condition rendue fausse). */
  holds: function (trait) {
    if (!trait) return false;
    return this.carried().some(function (id) { return COMBAT_ITEMS[id].trait === trait; });
  },

  itemForTrait: function (trait) {
    var ids = this.carried();
    for (var i = 0; i < ids.length; i++) if (COMBAT_ITEMS[ids[i]].trait === trait) return COMBAT_ITEMS[ids[i]];
    return null;
  },

  /* Au départ, une fois la sortie ouverte : prend les objets choisis (en stock, sans doublon, places max). */
  takeForSortie: function (ids) {
    if (!window.SortieManager || !SortieManager.isMission()) return [];
    var self = this, s = SortieManager.ensure(), out = [];
    (ids || []).forEach(function (id) {
      if (!COMBAT_ITEMS[id] || out.indexOf(id) !== -1 || out.length >= self.slotCount()) return;
      if (self.getStock(id) <= 0 || !WarehouseManager.removeResource(id, 1)) return;
      out.push(id);
    });
    s.items = out;
    if (out.length) {
      addLog("🎒 " + _t("Objets emportés : {x}.", { x: out.map(function (id) { return _td(COMBAT_ITEMS[id].name); }).join(", ") }), "event");
      this.apply();   // le premier combat est déjà ouvert au départ : le contre est posé tout de suite
      if (typeof saveGame === "function") saveGame();
    }
    return out;
  },

  onCombatStart: function () { this.apply(); },
  onRoundEnd: function () { this.apply(); },

  /* Pose (ou repose) le contre sur chaque ennemi en lice. Reposé dès qu'il ne reste qu'un round :
     la fin de round décompte ensuite, le trait reste tenu sans trou. */
  apply: function () {
    var ids = this.carried();
    if (!ids.length) return;
    var list = window.CombatActors ? CombatActors.enemies() : (game.enemy ? [game.enemy] : []);
    var self = this;
    list.forEach(function (e) {
      if (!e || Number(e.hp || 0) <= 0) return;
      ids.forEach(function (id) { self.applyTo(e, COMBAT_ITEMS[id]); });
    });
  },

  applyTo: function (e, item) {
    if (!e || !item || !item.trait || e.archetype !== item.trait) return false;
    var posed = false;
    if (item.trait === "armored" && Number(e.armorSuppressedRounds || 0) <= 1) {
      e.armorSuppressedReduction = ARMORED_SUPPRESSION_REDUCTION_PCT;
      e.armorSuppressedRounds = ARMORED_SUPPRESSION_DURATION_ROUNDS;
      posed = true;
    } else if (item.trait === "enraged" && Number(e.rageFreezeRounds || 0) <= 1 && e.maxHp > 0) {
      var lost = 1 - (Number(e.hp || 0) / Number(e.maxHp || 1));
      e.rageFrozenPct = Math.max(0, lost - ENRAGED_SUPPRESSION_REDUCTION_PCT);
      e.rageFreezeRounds = ENRAGED_FREEZE_DURATION_ROUNDS;
      posed = true;
    } else if (item.trait === "corrupted" && Number(e.corruptedStacks || 0) >= COMBAT_ITEM_CORRUPTION_PURGE_STACKS) {
      e.corruptedStacks = 0;
      posed = true;
    } else if (item.trait === "vampiric" && Number(e.vampiricSuppressedRounds || 0) <= 1) {
      e.vampiricSuppressedRounds = VAMPIRIC_SUPPRESSION_DURATION_ROUNDS;
      posed = true;
    }
    // Une ligne de journal par ennemi, la première fois : le reste du combat, l'icône « contré » suffit.
    if (posed && !e._itemNoted) {
      e._itemNoted = true;
      addLog("🧪 " + _t("{o} : le trait de {x} est tenu.", { o: _td(item.name), x: _td(e.name || "") }), "event");
      if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
    }
    return posed;
  }
};

/* ---------- v3.442.0 : la Fiole noire ----------
   Appelée par CombatEngine.onHeroDefeated, juste après « Le seuil » des Ruines (gratuit, passe d'abord).
   Une fois par sortie : le héros se relève à 40 % ; le butin de la sortie sera divisé par deux. */
CombatItems.tryFiole = function () {
  var s = game.sortie;
  if (this.carried().indexOf("fiole_noire") === -1 || !s || s.fioleUsed) return false;
  if (window.CombatActors && !CombatActors.aliveEnemies().length) return false;
  s.fioleUsed = true;
  game.heroHp = Math.max(1, Math.floor(Number(game.heroMaxHp || 1) * COMBAT_ITEM_FIOLE_HP_PCT));
  addLog("⚗️ " + _t("Fiole noire : tu te relèves. Le butin de la sortie sera divisé par deux."), "event");
  if (typeof showToast === "function") showToast("⚗️ " + _t("Fiole noire : tu te relèves"), 1600);
  if (typeof renderHeroHp === "function") renderHeroHp();
  return true;
};

/* Part du butin gardée (lue par SortieManager.end) : la moitié si la Fiole a servi. */
CombatItems.lootMultOf = function (s) {
  return (s && s.fioleUsed) ? COMBAT_ITEM_FIOLE_LOOT_MULT : 1;
};

/* Fin de sortie : un objet « rendu s'il n'a pas servi » retourne à l'Entrepôt (la Fiole, si elle n'a pas joué). */
CombatItems.onSortieEnd = function (s) {
  if (!s || !Array.isArray(s.items)) return;
  s.items.forEach(function (id) {
    var it = COMBAT_ITEMS[id];
    if (!it || !it.returnIfUnused || (id === "fiole_noire" && s.fioleUsed)) return;
    WarehouseManager.addResource(id, 1, true);
    addLog("🎒 " + _t("{x} n'a pas servi : rangée à l'Entrepôt.", { x: _td(it.name) }), "event");
  });
};

window.CombatItems = CombatItems;
