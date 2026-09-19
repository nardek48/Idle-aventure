"use strict";
/* systems/enchant-system.js — v3.229.0 (Lot 5 du chantier Équipement multi-affixes) : EnchantManager.

   RÈGLES FIGÉES AVEC SEB (12/09/2026) :
   - Le joueur CHOISIT la ligne à relancer (pas de tirage aveugle sur l'objet).
   - La relance change la VALEUR SEULE : la stat de l'affixe ne bouge jamais.
     Le joueur ne peut donc pas perdre un bonus qu'il aime.
   - Relances ILLIMITÉES, coût croissant sur CETTE ligne (compteur par affixe).
   - La pièce ne peut jamais empirer : on garde la meilleure des deux valeurs.
     C'est ce qui rend le coût croissant lisible — on paie de la progression
     garantie mais de plus en plus chère, pas un pari.

   Le niveau du bâtiment ouvre les RARETÉS relançables (ENCHANT_RARITY_BY_LEVEL),
   comme la Forge ouvre des niveaux de reforge.

   ÉTAT EN SAUVEGARDE : aucun. Le compteur vit dans l'affixe lui-même
   (a.rerolls), donc il suit l'objet dans l'inventaire et dans l'équipement
   sans toucher à save-system.js. */

/* Raretés ouvertes par niveau de bâtiment (cumulatif). */
var ENCHANT_RARITY_BY_LEVEL = [
  ["green", "rare"],
  ["epic"],
  ["legendary"]
];

/* Or de base d'une première relance, par rareté d'objet. Indexé sur le monde max
   atteint comme l'échoppe (EQUIP_SHOP_WORLD_PRICE_MULT) : sans cela, la relance
   deviendrait gratuite dès le Désert. Environ 8 % du prix d'achat de la pièce. */
var ENCHANT_BASE_GOLD = { green: 80, rare: 200, epic: 700, legendary: 2800 };

/* Sève d'Aeswyn de base, par rareté. La Sève ne s'achète pas : c'est elle, et
   non l'or, qui limite vraiment le nombre de relances. */
var ENCHANT_BASE_SEVE = { green: 1, rare: 2, epic: 3, legendary: 5 };

/* Croissance du coût à chaque relance de la MÊME ligne. */
var ENCHANT_COST_MULT = 1.55;

/* Sève supplémentaire tous les N relances de la même ligne. */
var ENCHANT_SEVE_STEP = 3;

var EnchantManager = {

  getBuildingLevel: function () {
    return (window.VillageBuildingManager && typeof VillageBuildingManager.getLevel === "function")
      ? VillageBuildingManager.getLevel("enchanter")
      : 0;
  },

  /* Raretés relançables au niveau actuel. Tableau vide si non construite. */
  getAllowedRarities: function () {
    var out = [];
    var level = Math.min(this.getBuildingLevel(), ENCHANT_RARITY_BY_LEVEL.length);
    for (var i = 0; i < level; i++) out = out.concat(ENCHANT_RARITY_BY_LEVEL[i]);
    return out;
  },

  canRerollRarity: function (rarity) {
    return this.getAllowedRarities().indexOf(rarity) !== -1;
  },

  /* Niveau de bâtiment qui ouvrirait cette rareté, 0 si elle n'est jamais relançable. */
  getRequiredLevel: function (rarity) {
    for (var i = 0; i < ENCHANT_RARITY_BY_LEVEL.length; i++) {
      if (ENCHANT_RARITY_BY_LEVEL[i].indexOf(rarity) !== -1) return i + 1;
    }
    return 0;
  },

  /* Nombre de relances déjà faites sur cette ligne. */
  getRerollCount: function (item, index) {
    var affixes = getItemAffixes(item);
    var a = affixes[index];
    return (a && Number(a.rerolls)) || 0;
  },

  /* Coût de la PROCHAINE relance de cette ligne, ou null si impossible. */
  getCost: function (item, index) {
    if (!item || !this.canRerollRarity(item.rarity)) return null;
    var affixes = getItemAffixes(item);
    if (!affixes[index]) return null;

    var n = this.getRerollCount(item, index);
    var worldMult = (typeof getEquipShopWorldPriceMult === "function") ? getEquipShopWorldPriceMult() : 1;
    var gold = (ENCHANT_BASE_GOLD[item.rarity] || 80) * Math.pow(ENCHANT_COST_MULT, n) * worldMult;
    var seve = (ENCHANT_BASE_SEVE[item.rarity] || 1) + Math.floor(n / ENCHANT_SEVE_STEP);
    return { gold: Math.floor(gold), seve_aeswyn: seve };
  },

  canAfford: function (item, index) {
    var cost = this.getCost(item, index);
    if (!cost) return false;
    return Number(game.gold || 0) >= cost.gold
      && WarehouseManager.getAmount("seve_aeswyn") >= cost.seve_aeswyn;
  },

  /* Raison de blocage lisible, jamais un simple faux : l'écran doit dire quoi faire. */
  /* v3.307.0 : pièce portée (même objet ou même uid) — seule celle-ci est gelée en expédition. */
  _isEquipped: function (item) {
    var eq = game.equipped || {};
    return Object.keys(eq).some(function (k) { return eq[k] && (eq[k] === item || (item.uid && eq[k].uid === item.uid)); });
  },

  getBlockReason: function (item, index) {
    if (this.getBuildingLevel() <= 0) return "Enchanteresse non construite";
    if (!item) return "Aucune pièce";
    if (window.heroLockReason && heroLockReason() && this._isEquipped(item)) return "Héros en expédition"; // v3.307.0
    if (!getItemAffixes(item)[index]) return "Aucun bonus";
    if (!this.canRerollRarity(item.rarity)) {
      var need = this.getRequiredLevel(item.rarity);
      return need ? ("Niveau " + need + " requis") : "Aucun bonus";
    }
    if (!this.canAfford(item, index)) return "Ressources manquantes";
    return null;
  },

  /* Fourchette de la ligne, échelle de monde comprise pour les valeurs plates.
     Même source que la génération : une relance ne peut pas sortir du cadre
     dans lequel l'affixe a été tiré. */
  getRange: function (item, index) {
    var a = getItemAffixes(item)[index];
    if (!a) return null;
    var rule = (typeof AFFIX_RANGES !== "undefined") ? AFFIX_RANGES[a.stat] : null;
    if (!rule) return null;
    var range = rule[item.rarity] || rule.green;
    var scale = rule.flat ? getEquipWorldScale(Number(item.worldIndex) || 0) : 1;
    return { min: range[0] * scale, max: range[1] * scale, decimals: rule.decimals || 0 };
  },

  _rolling: false,

  /* Relance la ligne `index` de `item`. Renvoie true si la relance a eu lieu,
     même quand le tirage est moins bon que la valeur en place (l'or est dépensé,
     la valeur conservée). */
  reroll: function (item, index) {
    if (this._rolling) return false;

    var reason = this.getBlockReason(item, index);
    if (reason) {
      showToast(reason, 1400);
      return false;
    }

    var affix = item.affixes[index];
    var range = this.getRange(item, index);
    if (!range) return false;

    var cost = this.getCost(item, index);
    this._rolling = true;

    game.gold -= cost.gold;
    WarehouseManager.removeResource("seve_aeswyn", cost.seve_aeswyn);
    if (window.QuestManager && typeof QuestManager.track === "function") {
      QuestManager.track("goldSpent", cost.gold);
    }

    var factor = Math.pow(10, range.decimals);
    var rolled = Math.round(randFloat(range.min, range.max) * factor) / factor;
    var before = Number(affix.value) || 0;
    var kept = Math.max(before, rolled);

    affix.value = kept;
    affix.rerolls = this.getRerollCount(item, index) + 1;

    var label = (typeof formatEquipmentStatValue === "function")
      ? formatEquipmentStatValue(affix.stat, kept) : String(kept);
    if (kept > before) {
      addLog("✨ " + item.name + " : " + label + " (relance réussie).", "event");
      showToast("✨ " + label, 1300);
    } else {
      addLog("✨ " + item.name + " : la relance n'a pas fait mieux, le bonus est conservé.", "event");
      showToast("Pas mieux — bonus conservé", 1300);
    }

    if (typeof StatsSystem !== "undefined") StatsSystem.recalcStats();
    if (typeof renderAll === "function") renderAll();
    saveGame();

    this._rolling = false;
    return true;
  }
};

window.ENCHANT_RARITY_BY_LEVEL = ENCHANT_RARITY_BY_LEVEL;
window.ENCHANT_BASE_GOLD = ENCHANT_BASE_GOLD;
window.ENCHANT_BASE_SEVE = ENCHANT_BASE_SEVE;
window.ENCHANT_COST_MULT = ENCHANT_COST_MULT;
window.EnchantManager = EnchantManager;
