"use strict";
/* systems/equip-shop-system.js — échoppe d'équipement (Boutique) : 6 objets aléatoires, rachetables une fois chacun, stock renouvelé/6h.
   Détail complet : COMMENTAIRES_ORIGINAUX.md */

/* Taille de base de la vitrine. v3.216.0 : la Halle marchande l'augmente
   (voir EquipShopManager.getShopSize) — la constante reste le socle. */
var EQUIP_SHOP_SIZE = 6;
var EQUIP_SHOP_REFRESH_MS = 6 * 3600 * 1000;

/* v3.308.0 (décision Seb 19/09/2026) : la rareté la plus haute du monde occupe au plus 25 %
   de la vitrine (arrondi inférieur, minimum 1). Au Désert, l'Inhabituel pèse 31 % par tirage :
   sans borne, 3 Inhabituels ou plus sortaient dans ~28 % des vitrines et le joueur s'équipait
   dès l'arrivée. Plus loin la rareté du sommet pèse déjà moins (Rare 16 %, Épique 4 %). */
var EQUIP_SHOP_TOP_RARITY_SHARE = 0.25;

var EQUIP_SHOP_MANUAL_REFRESH_BASE_COST = 1000;
var EQUIP_SHOP_MANUAL_REFRESH_MULT = 2.2;

/* v3.114.0 (équilibrage or) : grille de BASE recalée sur l'or actif de la Forêt (~93-146
   or/sortie) — rare 4000→2500 (≈17 sorties, objectif long de fin de Forêt), epic/legendary
   abaissés en proportion. */
var EQUIP_SHOP_PRICES = {
  common: 300,
  green: 1000,
  rare: 2500,
  epic: 9000,
  legendary: 35000
};

/* v3.114.0 : multiplicateur de prix par MONDE MAX ATTEINT (game.worldsEverReached), calé sur
   la courbe réelle de l'or/kill (worldComponent^1.45 de progression-system.js : ×1 Forêt,
   ×~4.7 Désert, ×~12 Monde 3...) — décision validée avec Seb (option A : indexer les PRIX,
   ne jamais toucher aux gains). L'effort en sorties reste ainsi constant d'un monde à l'autre.
   Indexé sur le monde max ATTEINT (pas le monde courant) : reculer d'un monde ne baisse pas
   les prix. S'applique aussi au refresh manuel. Les potions ne sont PAS concernées. */
var EQUIP_SHOP_WORLD_PRICE_MULT = [1, 4, 10, 25, 90, 200];

function getEquipShopWorldPriceMult() {
  var maxWorld = 0;
  if (game.worldsEverReached && typeof game.worldsEverReached === "object") {
    Object.keys(game.worldsEverReached).forEach(function (k) {
      var idx = Number(k);
      if (game.worldsEverReached[k] && idx > maxWorld) maxWorld = idx;
    });
  }
  if (window.WorldManager && Number(WorldManager.worldIndex || 0) > maxWorld) {
    maxWorld = Number(WorldManager.worldIndex || 0);
  }
  var mult = EQUIP_SHOP_WORLD_PRICE_MULT[maxWorld];
  return mult != null ? mult : EQUIP_SHOP_WORLD_PRICE_MULT[EQUIP_SHOP_WORLD_PRICE_MULT.length - 1];
}

var EquipShopManager = {
  ensure: function () {
    if (typeof game.equipShopStarterServed !== "boolean") game.equipShopStarterServed = false; // v3.247.0
    if (!Array.isArray(game.equipShopStock)) game.equipShopStock = [];
    if (typeof game.equipShopResetTime !== "number") game.equipShopResetTime = 0;
    if (typeof game.equipShopManualRefreshCount !== "number") game.equipShopManualRefreshCount = 0;
  },

  getPrice: function (item) {
    if (!item) return Infinity;
    var base = EQUIP_SHOP_PRICES[item.rarity] || EQUIP_SHOP_PRICES.common;
    return Math.floor(base * getEquipShopWorldPriceMult());
  },

  /* v3.216.0 (lot V-5) — LA HALLE AGRANDIT L'ÉCHOPPE, elle ne la déplace pas.
     Un emplacement de plus tous les deux niveaux, soit 6 → 11 au niveau 10.
     Le paramètre `level` sert à la fiche du bâtiment, qui veut annoncer l'effet
     du PROCHAIN niveau avant de le payer. */
  getShopSize: function (level) {
    var lvl = (typeof level === "number")
      ? level
      : ((window.VillageBuildingManager && typeof VillageBuildingManager.getLevel === "function")
          ? VillageBuildingManager.getLevel("hall") : 0);
    var etal = (window.MemoryManager && MemoryManager.has("etal_garni")) ? 1 : 0; // v3.322.0 : Étal garni
    return EQUIP_SHOP_SIZE + Math.floor(Math.max(0, lvl) / 2) + etal;
  },

  /* Remise sur le renouvellement manuel : -5 % par niveau, composés. Elle ne
     touche PAS le prix des objets — indexer les prix sur le monde reste la
     règle de la v3.114.0, et une remise dessus casserait cet équilibrage. */
  getRefreshDiscount: function (level) {
    var lvl = (typeof level === "number")
      ? level
      : ((window.VillageBuildingManager && typeof VillageBuildingManager.getLevel === "function")
          ? VillageBuildingManager.getLevel("hall") : 0);
    return Math.pow(0.95, Math.max(0, lvl));
  },

  /* v3.247.0 : la PREMIÈRE vitrine d'une partie est figée (EQUIP_SHOP_STARTER), la même pour
     tous les héros, l'arme déclinée par classe. Tout renouvellement ensuite repasse en aléatoire. */
  buildStarterStock: function () {
    var cls = (typeof getClassByHeroId === "function") ? getClassByHeroId(game.heroId) : null;
    var classId = cls ? cls.id : "knight";
    var self = this;
    return (window.EQUIP_SHOP_STARTER || []).map(function (def, i) {
      var config = (typeof EQUIPMENT_SLOT_CONFIG !== "undefined") ? EQUIPMENT_SLOT_CONFIG[def.slot] : null;
      var icon = (def.byClassIcon && def.byClassIcon[classId]) || def.icon
        || (config && config.icons ? config.icons[0] : "sword");
      var item = {
        uid: "shopstart_" + def.slot + "_" + i,
        slot: def.slot,
        name: def.name,
        icon: icon,
        rarity: "common",
        stat: def.stat,
        value: def.value,
        affixes: [],          // la vitrine de départ n'a pas d'affixes : c'est un socle
        worldIndex: 0,
        starter: true
      };
      item.price = self.getPrice(item);
      item.bought = false;
      return item;
    });
  },

  generateStock: function () {
    // v3.247.0 : vitrine de départ, servie une seule fois par partie
    if (!game.equipShopStarterServed) {
      var starter = this.buildStarterStock();
      if (starter.length) { game.equipShopStarterServed = true; return starter; }
    }
    var stock = [];
    var size = this.getShopSize();
    for (var i = 0; i < size; i++) {
      var item = window.LootSystem && typeof LootSystem.rollDrop === "function"
        ? LootSystem.rollDrop()
        : null;
      if (!item) continue;
      stock.push(item);
    }
    this._capTopRarity(stock, size);
    var self = this;
    stock.forEach(function (it) { it.price = self.getPrice(it); it.bought = false; });
    return stock;
  },

  /* v3.308.0 : nombre maximal d'objets de la rareté du sommet pour une vitrine de `size`. */
  getTopRarityCap: function (size) {
    // v3.322.0 : Regard du marchand (Mémoire niveau 8) — 40 % au lieu de 25 %
    var share = (window.MemoryManager && MemoryManager.has("regard_marchand")) ? 0.40 : EQUIP_SHOP_TOP_RARITY_SHARE;
    return Math.max(1, Math.floor(size * share));
  },

  /* Retire l'excédent de la rareté du sommet : chaque objet en trop est retiré dans la
     rareté juste en dessous, même emplacement. Sans effet s'il n'y a qu'une rareté. */
  _capTopRarity: function (stock, size) {
    var allowed = (typeof getAllowedRarities === "function") ? getAllowedRarities() : null;
    if (!allowed || allowed.length < 2 || typeof generateEquipmentItem !== "function") return;
    var top = allowed[allowed.length - 1], below = allowed[allowed.length - 2];
    var cap = this.getTopRarityCap(size), seen = 0;
    for (var i = 0; i < stock.length; i++) {
      if (!stock[i] || stock[i].rarity !== top) continue;
      seen += 1;
      if (seen > cap) stock[i] = generateEquipmentItem(stock[i].slot, below) || stock[i];
    }
  },

  /* v3.209.0 (bug Seb) — le stock est SAUVEGARDÉ et checkRefresh() ne regardait que
     son minuteur. Un lot fabriqué dans un monde supérieur restait donc en vitrine
     après un retour en arrière : Inhabituel proposé en Forêt, où seul le Commun est
     censé exister (WORLD_RARITY_UNLOCKS). Reproduit en deux cas — retour au monde
     précédent, et ascension (hardResetState remet worldIndex à 0 sans toucher au
     stock). Pire, ces objets étaient achetables au prix du monde MAX atteint, donc
     à la fois hors palier et hors budget.

     Asymétrie voulue : on ne réagit qu'aux raretés AU-DESSUS du palier autorisé.
     Progresser d'un monde n'invalide rien (un lot commun reste légitime au Désert),
     seul un recul nettoie. Le minuteur et le compteur de renouvellements manuels ne
     sont pas touchés : régénérer ici ne doit pas offrir un renouvellement gratuit. */
  hasOutOfTierStock: function () {
    if (!Array.isArray(game.equipShopStock) || !game.equipShopStock.length) return false;
    var allowed = (typeof getAllowedRarities === "function") ? getAllowedRarities() : null;
    if (!allowed || !allowed.length) return false;
    return game.equipShopStock.some(function (item) {
      return item && item.rarity && allowed.indexOf(item.rarity) === -1;
    });
  },

  checkRefresh: function () {
    this.ensure();
    var now = Date.now();
    if (!game.equipShopStock.length || now >= game.equipShopResetTime) {
      game.equipShopStock = this.generateStock();
      game.equipShopResetTime = now + EQUIP_SHOP_REFRESH_MS;
      game.equipShopManualRefreshCount = 0;
      return;
    }
    if (this.hasOutOfTierStock()) {
      game.equipShopStock = this.generateStock();
      return;
    }

    /* v3.216.0 : la Halle vient de monter d'un niveau → la vitrine a gagné un
       emplacement. On COMPLÈTE le stock au lieu de le régénérer : sinon
       améliorer la Halle effacerait les objets que le joueur gardait en vue,
       ce qui serait une punition déguisée. */
    var size = this.getShopSize();
    while (game.equipShopStock.length < size) {
      var extra = window.LootSystem && typeof LootSystem.rollDrop === "function" ? LootSystem.rollDrop() : null;
      if (!extra) break;
      extra.price = this.getPrice(extra);
      extra.bought = false;
      game.equipShopStock.push(extra);
    }
  },

  getManualRefreshCost: function () {
    this.ensure();
    var count = Number(game.equipShopManualRefreshCount || 0);
    // v3.114.0 : base indexée sur le monde max atteint, même logique que getPrice().
    return Math.floor(EQUIP_SHOP_MANUAL_REFRESH_BASE_COST * getEquipShopWorldPriceMult()
      * Math.pow(EQUIP_SHOP_MANUAL_REFRESH_MULT, count) * this.getRefreshDiscount()
      * ((window.MemoryManager && MemoryManager.has("oeil_marchand")) ? 0.5 : 1)); // v3.322.0 : Œil du marchand
  },

  manualRefresh: function () {
    this.ensure();
    var cost = this.getManualRefreshCost();
    if ((game.gold || 0) < cost) return showToast("Pas assez d'or", 1000);

    game.gold -= cost;
    game.equipShopManualRefreshCount = Number(game.equipShopManualRefreshCount || 0) + 1;
    game.equipShopStock = this.generateStock();
    game.equipShopResetTime = Date.now() + EQUIP_SHOP_REFRESH_MS;

    if (window.QuestManager && typeof QuestManager.track === "function") {
      QuestManager.track("goldSpent", cost);
    }

    addLog("🔄 Échoppe renouvelée (" + formatNumber(cost) + " or)", "event");
    showToast("🔄 Stock renouvelé !", 1500);
    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  timeUntilRefresh: function () {
    this.ensure();
    var diff = Math.max(0, (game.equipShopResetTime || 0) - Date.now());
    var h = Math.floor(diff / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    return h + "h " + m + "m";
  },

  buy: function (uid) {
    this.ensure();
    var item = game.equipShopStock.find(function (it) { return it.uid === uid; });
    if (!item) return showToast("Objet introuvable", 1000);
    if (item.bought) return showToast("Déjà acheté", 1000);

    // v3.114.0 : le joueur paie le prix AFFICHÉ (estampillé à la génération du stock) —
    // si un nouveau monde est atteint entre deux refresh, le stock courant garde ses prix,
    // le prochain renouvellement (6h ou manuel) appliquera le nouveau multiplicateur.
    var price = typeof item.price === "number" ? item.price : this.getPrice(item);
    if ((game.gold || 0) < price) return showToast("Pas assez d'or", 1000);

    var owned = Object.assign({}, item);
    delete owned.price;
    delete owned.bought;
    owned.uid = "itm_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
    owned.fromShop = true; // v3.322.0 (O9) : un objet acheté ne porte aucun souvenir, Offrande à 0

    /* v3.322.0 : sac plein, on refuse l'achat — sinon addLootToInventory offrirait l'objet
       avant qu'il soit payé. */
    var cap = (typeof getInventoryCap === "function") ? getInventoryCap() : 25;
    if ((game.inventory || []).length >= cap) return showToast("🎒 Sac plein : offre des objets pour faire de la place", 1800);
    if (!addLootToInventory(owned)) return;

    game.gold -= price;
    item.bought = true;

    if (window.QuestManager && typeof QuestManager.track === "function") {
      QuestManager.track("goldSpent", price);
    }

    addLog("🛒 " + owned.name + " acheté à l'échoppe (" + formatNumber(price) + " or)", "event");
    showToast(owned.name, 1500);
    if (typeof renderAll === "function") renderAll();
    saveGame();
  }
};

window.EquipShopManager = EquipShopManager;
window.getEquipShopWorldPriceMult = getEquipShopWorldPriceMult;
window.EQUIP_SHOP_WORLD_PRICE_MULT = EQUIP_SHOP_WORLD_PRICE_MULT;
