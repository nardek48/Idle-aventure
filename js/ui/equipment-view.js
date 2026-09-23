"use strict";
/* ui/equipment-view.js — écran Équipement, 3 sous-onglets Équipement/Inventaire/Boutique. Panneau détail unifié équipement+potions (v2.83.46), comparaison avec équipé, bonus de set. Détail : COMMENTAIRES_ORIGINAUX.md */

var activeEquipSubTab = "equipment"; // "equipment" | "inventory" | "shop" | "potions"
var selectedEquipSlot = "weapon"; // un des 7 slots réels (voir EQUIPMENT_SLOTS)
var selectedInventoryKey = null; // clé unifiée équipement("eq:uid")/potion("buff:id"/"heal:id") — v2.83.46

/* v3.222.0 : même règle que le Village — revenir sur un sous-onglet le ramène
   à son état d'accueil, plutôt qu'à l'objet qu'on regardait la fois d'avant. */
function setEquipSubTab(tab) {
  selectedInventoryKey = null;
  if (tab === "inventory") activeEquipSubTab = "inventory";
  else if (tab === "shop") activeEquipSubTab = "shop";
  else activeEquipSubTab = "equipment";
  if (typeof renderPanel === "function") renderPanel();
}
window.setEquipSubTab = setEquipSubTab;

function selectEquipSlot(slotId) {
  selectedEquipSlot = slotId;
  if (typeof renderPanel === "function") renderPanel();
}
window.selectEquipSlot = selectEquipSlot;

function selectInventoryKey(key) {
  selectedInventoryKey = key;
  if (typeof renderPanel === "function") renderPanel();
}
window.selectInventoryKey = selectInventoryKey;

var inventoryFilter = "all"; // "all" | "equipment" | "potions" — v2.83.46

function setInventoryFilter(filter) {
  inventoryFilter = filter;
  selectedInventoryKey = null; // évite de garder sélectionné un objet qui sort du filtre
  if (typeof renderPanel === "function") renderPanel();
}
window.setInventoryFilter = setInventoryFilter;

function buildEquipSubTabBarHTML() {
  var h = '<div class="pc-subtab-bar">';
  h += '<button type="button" class="pc-subtab-btn' + (activeEquipSubTab === "equipment" ? ' is-active' : '') + '" onclick="setEquipSubTab(\'equipment\')"><img class="pc-subtab-ico" src="images/Icons/subtabs/equipment.png" alt=""><span>Équipement</span></button>';
  h += '<button type="button" class="pc-subtab-btn' + (activeEquipSubTab === "inventory" ? ' is-active' : '') + '" onclick="setEquipSubTab(\'inventory\')"><img class="pc-subtab-ico" src="images/Icons/subtabs/inventory.png" alt=""><span>Inventaire</span></button>';
  h += '<button type="button" class="pc-subtab-btn' + (activeEquipSubTab === "shop" ? ' is-active' : '') + '" onclick="setEquipSubTab(\'shop\')"><img class="pc-subtab-ico" src="images/Icons/subtabs/equipment_shop.png" alt=""><span>Boutique</span></button>';
  h += '</div>';
  return h;
}

function formatEquipmentStat(item) {
  if (!item) return "";
  return formatEquipmentStatValue(item.stat, Number(item.value || 0));
}

/* v3.225.0 : texte d'une stat quelle que soit sa source (stat de base ou affixe). */
function formatEquipmentStatValue(stat, value) {
  if (stat === "tapDmg") return "+" + formatNumber(value) + " dégâts/tap";
  if (stat === "tapMult") return "+" + Math.round(value * 100) + "% dégâts";
  if (stat === "goldMult") return "+" + Math.round(value * 100) + "% or";
  if (stat === "critChance") return "+" + formatNumber(value) + "% critique";
  if (stat === "critMult") return "+" + formatNumber(value) + "x dégâts crit";
  if (stat === "autoDps") return "+" + formatNumber(value) + " célérité";
  if (stat === "defense") return "+" + (Math.round(value * 1000) / 10) + "% défense";
  if (stat === "maxHpPct") return "+" + Math.round(value * 100) + "% PV max";
  if (stat === "xpMult") return "+" + Math.round(value * 100) + "% expérience";
  if (stat === "dropChance") return "+" + formatNumber(value) + "% de butin"; // court : tient sur une ligne à 320 px

  return "+" + formatNumber(value) + " " + esc(stat);
}

/* v3.225.0 : lignes d'affixes sous la stat de base (Lot 1b — sans comparaison, voir Lot 2).
   Primaires puis secondaires ; vide pour un Commun ou un objet d'avant v3.225.0. */
function buildEquipmentAffixLinesHTML(item) {
  var affixes = (typeof getItemAffixes === "function") ? getItemAffixes(item) : [];
  if (!affixes.length) return "";
  /* v3.252.0 : primaire et secondaire ne se distinguaient que par un italique atténué —
     invisible en pratique. Une puce pleine / creuse porte la différence, et le libellé
     l'explicite pour qui ne connaît pas encore le vocabulaire. */
  var h = '<div class="eq-affix-lines">';
  affixes.forEach(function (a) {
    var sec = a.tier === "S";
    h += '<div class="eq-affix-line' + (sec ? ' is-secondary' : '') + '">';
    h += '<span class="eq-affix-dot" aria-hidden="true"></span>';
    h += '<span class="eq-affix-txt">' + esc(formatEquipmentStatValue(a.stat, a.value)) + '</span>';
    h += '</div>';
  });
  h += '</div>';
  return h;
}

function getCurrentHeroForEquipmentView() {
  if (typeof getSelectedHero === "function") {
    return getSelectedHero();
  }
  return null;
}

function buildEquipmentSlot(slot, label, icon) {
  var item = game.equipped[slot];
  var isSelected = selectedEquipSlot === slot;
  var h = '<button class="eq-orbit-slot ' + (item ? 'filled' : 'empty') + (isSelected ? ' is-selected' : '') + '" onclick="selectEquipSlot(\'' + esc(slot) + '\')" aria-label="' + esc(label) + '">';
  h += item
    ? buildEquipmentIconHTML(item, "eq-orbit-slot-icon rframe")
    : '<div class="eq-orbit-slot-icon eq-orbit-slot-placeholder">' + renderIconOrEmojiHTML(icon, "eq-orbit-slot-img", label) + '</div>';
  h += '</button>';
  return h;
}

function getEquipmentStatDelta(candidate, current) {
  if (!candidate || !current) return null;
  if (candidate.stat !== current.stat) return null;
  return Number(candidate.value || 0) - Number(current.value || 0);
}

function formatStatDelta(stat, delta) {
  var sign = delta > 0 ? "+" : "";
  if (stat === "tapMult" || stat === "goldMult" || stat === "maxHpPct" || stat === "xpMult") return sign + Math.round(delta * 100) + "%";
  if (stat === "defense") return sign + (Math.round(delta * 1000) / 10) + "%"; // v3.226.0 : 1 décimale, les affixes de défense en ont 3
  if (stat === "critMult") return sign + formatNumber(delta) + "x";
  if (stat === "critChance" || stat === "dropChance") return sign + formatNumber(delta) + "%";
  return sign + formatNumber(delta);
}

/* v3.230.0 : ligne de pouvoir d'un objet légendaire — sans delta, ce n'est pas
   une valeur qui se compare. Vide pour tout autre objet. */
function buildEquipmentPowerHTML(item) {
  var power = (typeof getItemPower === "function") ? getItemPower(item) : null;
  if (!power) return "";
  return '<div class="eq-power-line"><span class="eq-power-label">' + esc(power.label) + '</span>'
    + '<span class="eq-power-desc">' + esc(power.desc) + '</span></div>';
}

/* v3.226.0 (Lot 2) : lignes du candidat avec un delta par ligne face à l'objet équipé
   (getEquipmentCompareLines, systems/equipment-system.js). Stat de base en tête, puis
   affixes, puis en atténué ce que seul l'objet équipé porte (▼). Emplacement vide : tout ▲. */
function buildEquipmentCompareLinesHTML(candidate, equipped) {
  var lines = (typeof getEquipmentCompareLines === "function") ? getEquipmentCompareLines(candidate, equipped) : [];
  if (!lines.length) return "";
  var h = '<div class="eq-cmp-lines">';
  lines.forEach(function (l) {
    var cls = l.onlyEquipped ? "is-lost" : (l.tier === "B" ? "is-base" : (l.tier === "S" ? "is-secondary" : "is-primary"));
    var shown = l.onlyEquipped ? l.equipValue : l.candValue;
    var dcls = l.delta > 0 ? "is-up" : (l.delta < 0 ? "is-down" : "is-flat");
    var arrow = l.delta > 0 ? "\u25b2 " : (l.delta < 0 ? "\u25bc " : "\u2014");
    h += '<div class="eq-cmp-row ' + cls + '">';
    h += '<span class="eq-cmp-txt">' + esc(formatEquipmentStatValue(l.stat, shown)) + (l.onlyEquipped ? ' <small>(\u00e9quip\u00e9)</small>' : '') + '</span>';
    h += '<span class="eq-cmp-delta ' + dcls + '">' + arrow + (l.delta !== 0 ? esc(formatStatDelta(l.stat, l.delta)) : '') + '</span>';
    h += '</div>';
  });
  h += '</div>';
  return h;
}

function getInventoryItemsForSlot(slot) {
  var inventory = Array.isArray(game.inventory) ? game.inventory : [];
  var order = (typeof RARITY_ORDER !== "undefined") ? RARITY_ORDER : ["common", "green", "rare", "epic", "legendary"];
  return inventory
    .filter(function (i) { return i.slot === slot; })
    .sort(function (a, b) {
      var ra = order.indexOf(a.rarity), rb = order.indexOf(b.rarity);
      if (ra !== rb) return rb - ra;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
}

/* v3.252.0 (lot B-2) — RÉSUMÉ DE COMPARAISON d'un objet du sac face à l'équipé.
   Avant, la liste n'affichait qu'un delta sur la STAT DE BASE (getEquipmentStatDelta, qui
   renvoie même null quand les deux objets n'ont pas la même stat) plus un badge « +3 » muet :
   un objet avec trois affixes excellents était indiscernable d'un objet avec trois affixes
   médiocres, et le joueur ne pouvait pas savoir lequel prendre — ce que cet écran existe
   pourtant pour lui dire.
   getEquipmentCompareLines() savait déjà fusionner base et affixes par statistique et sortir
   les deltas ; elle n'était utilisée que dans la feuille. On s'en sert ici. */
function getEquipmentCompareSummary(candidate, equipped) {
  var lines = (typeof getEquipmentCompareLines === "function") ? getEquipmentCompareLines(candidate, equipped) : [];
  if (!lines.length) return null;
  var base = null, gains = 0, pertes = 0;
  lines.forEach(function (l) {
    if (l.tier === "B" && !l.onlyEquipped) base = l;
    if (l.delta > 0) gains += 1;
    else if (l.delta < 0 || l.onlyEquipped) pertes += 1;
  });
  return { lines: lines, base: base, gains: gains, pertes: pertes };
}

/* Une ligne du sac : nom complet, stat de base avec son delta, puis le RESTE chiffré
   (« +2 autres gains », « −1 perte ») au lieu d'un badge « +3 » qui ne disait rien. */
function buildCompatibleItemsListHTML(slot) {
  var items = getInventoryItemsForSlot(slot);
  if (!items.length) return "";

  var equipped = game.equipped[slot];
  var h = '<div class="eq-compat-list">';
  h += '<div class="eq-compat-title"><img class=ico-inline src=images/Icons/subtabs/inventory.png> Dans le sac (' + items.length + ')</div>';

  items.slice(0, 5).forEach(function (item) {
    var sum = getEquipmentCompareSummary(item, equipped);
    var baseDelta = (sum && sum.base) ? sum.base.delta : null;
    var autresGains = sum ? Math.max(0, sum.gains - (baseDelta > 0 ? 1 : 0)) : 0;
    var pertes = sum ? sum.pertes : 0;

    h += '<div class="eq-compat-row" onclick="openEquipCompareSheet(\'' + esc(item.uid) + '\')">';
    h += '<div class="eq-compat-icon">' + buildEquipmentIconHTML(item, "eq-compat-icon-img rframe") + '</div>';
    h += '<div class="eq-compat-info">';
    h += '<div class="eq-compat-name rarity-' + esc(item.rarity) + '">' + esc(item.name) + '</div>';
    h += '<div class="eq-compat-stat">' + esc(formatEquipmentStat(item));
    if (baseDelta != null && baseDelta !== 0) {
      h += ' <span class="eq-compat-delta ' + (baseDelta > 0 ? "is-up" : "is-down") + '">'
        + (baseDelta > 0 ? "\u25b2" : "\u25bc") + esc(formatStatDelta(sum.base.stat, baseDelta)) + '</span>';
    }
    h += '</div>';
    /* Le reste du bilan, en clair. C'est ce qui permet enfin de choisir. */
    if (autresGains > 0 || pertes > 0) {
      h += '<div class="eq-compat-extra">';
      if (autresGains > 0) h += '<span class="is-up">+' + autresGains + ' gain' + (autresGains > 1 ? "s" : "") + '</span>';
      if (autresGains > 0 && pertes > 0) h += '<span class="eq-compat-extra-sep">\u00b7</span>';
      if (pertes > 0) h += '<span class="is-down">\u2212' + pertes + ' perte' + (pertes > 1 ? "s" : "") + '</span>';
      h += '</div>';
    }
    h += '</div>';
    h += '<button class="btn-buy eq-compat-equip-btn" type="button" onclick="event.stopPropagation(); EquipmentManager.equip(\'' + esc(item.uid) + '\')">\u00c9quiper</button>';
    h += '</div>';
  });

  if (items.length > 5) {
    h += '<button class="eq-compat-more-btn" type="button" onclick="setEquipSubTab(\'inventory\')">Voir les ' + items.length + ' objets dans l\u2019Inventaire \u2192</button>';
  }

  h += '</div>';
  return h;
}

/* Feuille de comparaison détaillée — même composant que la feuille d'états de combat (B-1).
   C'est le seul endroit où l'on peut dire honnêtement « +79 dégâts mais −6 % d'or » : un
   arbitrage que la liste seule rend invisible. */
function buildEquipCompareSheetHTML(uid) {
  var item = (game.inventory || []).find(function (i) { return i.uid === uid; });
  if (!item) return "";
  var equipped = game.equipped[item.slot];
  var sum = getEquipmentCompareSummary(item, equipped);

  var h = '<div class="ksheet-backdrop" onclick="closeEquipCompareSheet()"></div>';
  h += '<div class="ksheet"><div class="ksheet-handle"></div>';
  h += '<div class="ksheet-title">' + buildEquipmentIconHTML(item, "eqs-title-icon rframe")
    + '<span class="rarity-' + esc(item.rarity) + '">' + esc(item.name) + '</span></div>';
  h += '<div class="eqs-sub">' + esc(EQUIPMENT_SLOT_LABELS[item.slot] || item.slot)
    + (equipped ? ' \u00b7 compar\u00e9 \u00e0 ' + esc(equipped.name) : ' \u00b7 emplacement vide') + '</div>';
  h += '<div class="ksheet-body">';

  if (sum && sum.lines.length) {
    sum.lines.forEach(function (l) {
      var shown = l.onlyEquipped ? l.equipValue : l.candValue;
      var tier = l.tier === "B" ? "base" : (l.tier === "S" ? "secondaire" : "primaire");
      var dcls = l.delta > 0 ? "is-up" : (l.delta < 0 ? "is-down" : "is-flat");
      h += '<div class="eqs-row' + (l.onlyEquipped ? " is-lost" : "") + '">';
      h += '<div class="eqs-row-body">';
      h += '<div class="eqs-row-txt">' + esc(formatEquipmentStatValue(l.stat, shown)) + '</div>';
      h += '<div class="eqs-row-tier">' + tier + (l.onlyEquipped ? " \u2014 seulement sur l\u2019objet port\u00e9" : "") + '</div>';
      h += '</div>';
      h += '<div class="eqs-row-delta ' + dcls + '">'
        + (l.delta > 0 ? "\u25b2 " : l.delta < 0 ? "\u25bc " : "\u2014")
        + (l.delta !== 0 ? esc(formatStatDelta(l.stat, l.delta)) : "") + '</div>';
      h += '</div>';
    });
  }

  var power = buildEquipmentPowerHTML(item);
  if (power) h += '<div class="eqs-power">' + power + '</div>';
  h += buildItemOriginHTML(item);
  h += '</div>';
  h += '<button type="button" class="ksheet-close" onclick="equipFromCompareSheet(\'' + esc(uid) + '\')">\u00c9quiper</button>';
  h += '</div>';
  return h;
}

function openEquipCompareSheet(uid) {
  var host = document.getElementById("equip-compare-modal-root");
  if (host) host.innerHTML = buildEquipCompareSheetHTML(uid);
}
function closeEquipCompareSheet() {
  var host = document.getElementById("equip-compare-modal-root");
  if (host) host.innerHTML = "";
}
function equipFromCompareSheet(uid) {
  closeEquipCompareSheet();
  if (window.EquipmentManager && typeof EquipmentManager.equip === "function") EquipmentManager.equip(uid);
}
window.getEquipmentCompareSummary = getEquipmentCompareSummary;
window.buildEquipCompareSheetHTML = buildEquipCompareSheetHTML;
window.openEquipCompareSheet = openEquipCompareSheet;
window.closeEquipCompareSheet = closeEquipCompareSheet;
window.equipFromCompareSheet = equipFromCompareSheet;

function buildEquipDetailPanelHTML() {
  var slot = selectedEquipSlot;
  var label = EQUIPMENT_SLOT_LABELS[slot] || slot;
  var emoji = EQUIPMENT_SLOT_EMOJI[slot] || "images/Icons/equipment_slots/slot_unknown.png";
  var item = game.equipped[slot];
  var h = '<div class="eq-detail-panel">';

  if (item) {
    h += '<div class="eq-detail-icon">' + buildEquipmentIconHTML(item, "eq-detail-icon-img rframe") + '</div>';
    h += '<div class="eq-detail-name rarity-' + esc(item.rarity) + '">' + esc(item.name) + '</div>';
    h += '<div class="eq-detail-stat">' + esc(formatEquipmentStat(item)) + '</div>';
    h += buildEquipmentAffixLinesHTML(item);
    h += buildEquipmentPowerHTML(item); // v3.230.0
    h += buildItemOriginHTML(item);
    h += '<button class="btn-buy eq-detail-action" type="button" onclick="EquipmentManager.unequip(\'' + esc(slot) + '\')">Déséquiper</button>';
  } else {
    h += '<div class="eq-detail-icon eq-detail-icon-empty">' + renderIconOrEmojiHTML(emoji, "eq-detail-empty-img", "") + '</div>';
    h += '<div class="eq-detail-name">' + esc(label) + ' — Vide</div>';
    h += '<div class="eq-detail-hint">Équipe un objet depuis l\u2019Inventaire pour remplir cet emplacement.</div>';
  }

  // v3.252.0 : la liste du sac a quitté ce panneau — il fait 50 % de largeur (~150 px utiles),
  // ce qui tronquait les noms à une lettre (« D… »). Elle est rendue en pleine largeur, après.
  h += buildCompactSetBonusHTML();

  h += '</div>';
  return h;
}

function buildCompactSetBonusHTML() {
  var active = (window.EquipmentManager && typeof EquipmentManager.getActiveSetBonuses === "function")
    ? EquipmentManager.getActiveSetBonuses()
    : [];

  if (!active.length) {
    var h = '<div class="eq-detail-setbonus">';
    h += '<span class="eq-detail-setbonus-icon"><img class=ico-inline src=images/Icons/equipment_slots/set_bonus.png></span>';
    h += '<span class="eq-detail-setbonus-text">Bonus de set inactif</span>';
    h += '</div>';
    return h;
  }

  var out = '';
  active.forEach(function (entry) {
    out += '<div class="eq-detail-setbonus is-active">';
    out += '<span class="eq-detail-setbonus-icon"><img class=ico-inline src=images/Icons/equipment_slots/set_bonus.png></span>';
    out += '<span class="eq-detail-setbonus-text">' + esc(entry.config.name) + ' — ' + esc(entry.config.text) + '</span>';
    out += '</div>';
  });
  return out;
}

function getUnifiedInventoryEntries() {
  var entries = [];

  if (inventoryFilter !== "potions") {
    (Array.isArray(game.inventory) ? game.inventory : []).forEach(function (item) {
      entries.push({ key: "eq:" + item.uid, type: "equipment", item: item });
    });
  }

  if (inventoryFilter !== "equipment") {
    getOwnedPotionsList().forEach(function (p) {
      entries.push({ key: p.key, type: "potion", potion: p.potion, isHealing: p.isHealing, stock: p.stock });
    });
  }

  return entries;
}

function buildUnifiedTileHTML(entry) {
  var isSelected = selectedInventoryKey === entry.key;

  if (entry.type === "equipment") {
    var item = entry.item;
    var h = '<button class="eq-bag-tile rframe rarity-' + esc(item.rarity) + (isSelected ? ' is-selected' : '') + '" onclick="selectInventoryKey(\'' + esc(entry.key) + '\')" aria-label="' + esc(item.name) + '">';
    h += buildEquipmentIconHTML(item, "eq-bag-tile-icon");
    h += '</button>';
    return h;
  }

  var potion = entry.potion;
  var h2 = '<button class="eq-bag-tile rframe rarity-' + esc(potion.rarity || "common") + (isSelected ? ' is-selected' : '') + '" onclick="selectInventoryKey(\'' + esc(entry.key) + '\')" aria-label="' + esc(potion.name) + '">';
  h2 += renderIconOrEmojiHTML(potion.icon, "eq-bag-tile-icon", potion.name);
  h2 += '<span class="eq-bag-tile-stock">' + entry.stock + '</span>';
  h2 += '</button>';
  return h2;
}

/* v3.220.0 : provenance d'un objet. Avec l'échelle de monde, deux objets de
   même rareté peuvent avoir des valeurs très différentes — sans cette ligne, le
   joueur n'a aucun moyen de comprendre pourquoi. Un objet d'une sauvegarde
   antérieure n'a pas de `worldIndex` : il est de fait de Forêt, et on l'affiche
   comme tel plutôt que de laisser un trou. */
function buildItemOriginHTML(item) {
  if (!item) return "";
  var cfg = EQUIPMENT_SLOT_CONFIG[item.slot];
  if (!cfg || !cfg.scalesWithWorld) return "";
  var idx = (typeof item.worldIndex === "number") ? item.worldIndex : 0;
  var world = (window.WORLDS && WORLDS[idx]) ? WORLDS[idx].name : null;
  if (!world) return "";
  return '<div class="eq-detail-hint"><img class=ico-inline src=images/Icons/quests/quest_resources.png> Trouvé en ' + esc(world) + '</div>';
}
window.buildItemOriginHTML = buildItemOriginHTML;

function buildUnifiedDetailPanelHTML(entries) {
  var entry = entries.find(function (e) { return e.key === selectedInventoryKey; });
  var h = '<div class="eq-detail-panel">';

  if (!entry) {
    h += '<div class="eq-detail-icon eq-detail-icon-empty"><img class=ico-inline src=images/Icons/subtabs/inventory.png></div>';
    h += '<div class="eq-detail-name">Aucun objet sélectionné</div>';
    h += '<div class="eq-detail-hint">Touche un objet dans le sac pour voir son détail ici.</div>';
  } else if (entry.type === "equipment") {
    var item = entry.item;
    h += '<div class="eq-detail-icon">' + buildEquipmentIconHTML(item, "eq-detail-icon-img rframe") + '</div>';
    h += '<div class="eq-detail-name rarity-' + esc(item.rarity) + '">' + esc(item.name) + '</div>';
    h += buildEquipmentCompareLinesHTML(item, game.equipped ? game.equipped[item.slot] : null); // v3.226.0 : delta par ligne
    h += buildEquipmentPowerHTML(item); // v3.230.0
    h += buildItemOriginHTML(item);
    h += '<button class="btn-buy eq-detail-action" type="button" onclick="EquipmentManager.equip(\'' + esc(item.uid) + '\')">Équiper</button>';
    // v3.322.0 (O2) : la vente devient l'Offrande ; la valeur s'affiche, 0 compris (O9)
    var offerVal = window.MemoryManager ? MemoryManager.getOfferingValue(item) : 0;
    h += '<button class="btn-buy eq-detail-action" type="button" onclick="confirmSellItem(\'' + esc(item.uid) + '\')">Offrir (' + (offerVal > 0 ? '+' + offerVal + ' Aether' : 'aucun souvenir') + ')</button>';
    h += buildEquippedComparisonHTML(item);
  } else {
    var potion = entry.potion;
    var descText = entry.isHealing
      ? "Restaure " + Math.round(potion.healPercent * 100) + "% des PV max."
      : potion.desc;

    h += '<div class="eq-detail-icon">' + renderIconOrEmojiHTML(potion.icon, "eq-detail-icon-img", potion.name) + '</div>';
    h += '<div class="eq-detail-name">' + esc(potion.name) + '</div>';
    h += '<div class="eq-detail-stat">' + esc(descText) + '</div>';
    h += '<div class="eq-detail-hint"><img class=ico-inline src=images/Icons/subtabs/inventory.png> Stock : ' + entry.stock + '</div>';

    if (entry.isHealing) {
      h += '<button class="btn-buy eq-detail-action" type="button" onclick="PotionManager.useHealingPotion(\'' + esc(potion.id) + '\')">Utiliser</button>';
    } else {
      h += '<button class="btn-buy eq-detail-action" type="button" onclick="PotionManager.usePotion(\'' + esc(potion.id) + '\')">Utiliser</button>';
    }
    h += '<button class="btn-buy eq-detail-action" type="button" onclick="PotionManager.sellPotion(\'' + esc(potion.id) + '\')">Vendre</button>';
  }

  h += '</div>';
  return h;
}

function buildEquippedComparisonHTML(item) {
  var equipped = game.equipped ? game.equipped[item.slot] : null;
  var h = '<div class="eq-compare-box">';
  h += '<div class="eq-compare-title"><img class=ico-inline src=images/Icons/system/auto_repeat.png> Actuellement équipé</div>';

  if (!equipped) {
    h += '<div class="eq-compare-empty">Rien d\u2019équipé sur cet emplacement — équiper cet objet sera un pur gain.</div>';
  } else {
    h += '<div class="eq-compare-row">';
    h += '<div class="eq-compare-icon">' + buildEquipmentIconHTML(equipped, "eq-compare-icon-img rframe") + '</div>';
    h += '<div class="eq-compare-info">';
    h += '<div class="eq-compare-name rarity-' + esc(equipped.rarity) + '">' + esc(equipped.name) + '</div>';
    h += '<div class="eq-compare-stat">' + esc(formatEquipmentStat(equipped)) + '</div>';
    h += buildEquipmentAffixLinesHTML(equipped);
    h += '</div>';
    h += '</div>';

    /* v3.226.0 : le delta global a disparu (D6) — chaque ligne du candidat porte le sien, ci-dessus. */
  }

  h += '</div>';
  return h;
}

/* v3.244.0 : `topHTML` (optionnel) est inséré EN TÊTE DU CADRE — c'est là que le segment
   Équipé / Sac de Héros doit vivre. Posé avant le cadre, il tomberait entre le bandeau
   (que kframe-decorator sort du flux) et le corps. */
function buildEquipmentTabContentHTML(topHTML) {
  var h = '';

  h += '<div class="eq-layout">';
  h += '<div class="eq-hero-card nb-page-frame nb-page-frame-fill kframe-page" data-kf-title="images/Icons/combat_stats/stat_defense.png|\u00c9quipement">';
  h += topHTML || '';
  h += '<div class="eq-hero-main eq-hero-main-slots-only">';

  h += '<div class="eq-hero-right">';
  h += '<div class="eq-slot-col">';
  h += buildEquipmentSlot("weapon", EQUIPMENT_SLOT_LABELS.weapon, EQUIPMENT_SLOT_EMOJI.weapon);
  h += buildEquipmentSlot("armor", EQUIPMENT_SLOT_LABELS.armor, EQUIPMENT_SLOT_EMOJI.armor);
  h += buildEquipmentSlot("helmet", EQUIPMENT_SLOT_LABELS.helmet, EQUIPMENT_SLOT_EMOJI.helmet);
  h += buildEquipmentSlot("gloves", EQUIPMENT_SLOT_LABELS.gloves, EQUIPMENT_SLOT_EMOJI.gloves);
  h += '</div>';
  h += '<div class="eq-slot-col">';
  h += buildEquipmentSlot("boots", EQUIPMENT_SLOT_LABELS.boots, EQUIPMENT_SLOT_EMOJI.boots);
  h += buildEquipmentSlot("ring", EQUIPMENT_SLOT_LABELS.ring, EQUIPMENT_SLOT_EMOJI.ring);
  h += buildEquipmentSlot("amulet", EQUIPMENT_SLOT_LABELS.amulet, EQUIPMENT_SLOT_EMOJI.amulet);
  h += '</div>';
  h += '</div>';

  h += buildEquipDetailPanelHTML();

  h += '</div>';
  // v3.252.0 : pleine largeur, hors de la ligne « grille + détail ».
  h += buildCompatibleItemsListHTML(selectedEquipSlot);
  h += '</div>';
  h += '</div>';

  return h;
}

var showInventorySortMenu = false;

function toggleInventorySortMenu() {
  showInventorySortMenu = !showInventorySortMenu;
  if (typeof renderPanel === "function") renderPanel();
}
window.toggleInventorySortMenu = toggleInventorySortMenu;

function applyInventorySort(kind) {
  showInventorySortMenu = false;
  if (kind === "type") sortInventoryByType();
  else sortInventoryByRarity();
}
window.applyInventorySort = applyInventorySort;

function buildInventoryCompactToolbarHTML() {
  var h = '<div class="inv-toolbar">';

  h += '<div class="inv-toolbar-sort-wrap">';
  h += '<button class="inv-toolbar-btn" type="button" onclick="toggleInventorySortMenu()"><img class=ico-inline src=images/Icons/system/sort.png> Trier</button>';
  if (showInventorySortMenu) {
    h += '<div class="inv-sort-menu">';
    h += '<button type="button" onclick="applyInventorySort(\'rarity\')">Rareté</button>';
    h += '<button type="button" onclick="applyInventorySort(\'type\')">Type</button>';
    h += '</div>';
  }
  h += '</div>';

  // v3.242.0 (retour Seb) : le bouton n'affichait qu'une icône, réduite à 0 px par le
  // filet `img { font-size: 0 }` — il ne restait qu'une plaque bleue vide. Icône rétablie
  // (voir css/99-icon-assets.css) et libellé ajouté pour qu'il se lise sans ambiguïté.
  h += '<button class="inv-toolbar-btn" type="button" onclick="openInventorySettings()"><img class=ico-inline src=images/Icons/system/auto_sell.png> Autovente</button>';

  h += '</div>';
  return h;
}

function buildInventoryFilterRowHTML() {
  var h = '<div class="inv-filter-row">';
  h += '<button type="button" class="inv-filter-btn' + (inventoryFilter === "all" ? ' is-active' : '') + '" onclick="setInventoryFilter(\'all\')">Tout</button>';
  h += '<button type="button" class="inv-filter-btn' + (inventoryFilter === "equipment" ? ' is-active' : '') + '" onclick="setInventoryFilter(\'equipment\')"><img class=ico-inline src=images/Icons/combat_stats/stat_defense.png> Équipement</button>';
  h += '<button type="button" class="inv-filter-btn' + (inventoryFilter === "potions" ? ' is-active' : '') + '" onclick="setInventoryFilter(\'potions\')"><img class=ico-inline src=images/Icons/subtabs/potions.png> Potions</button>';
  h += '</div>';
  return h;
}

function buildInventorySettingsHTML() {
  var threshold = game.autoSellRarityThreshold || "common";
  var rarities = (typeof RARITY_ORDER !== "undefined") ? RARITY_ORDER : ["common", "green", "rare", "epic", "legendary"];

  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu dungeon-story-card">';
  h += '    <div class="dungeon-story-icon"><img class=ico-inline src=images/Icons/system/settings.png></div>';
  h += '    <div class="dungeon-story-title">Réglages du sac</div>';

  h += '    <div class="auto-sell-toggle-row">';
  h += '      <button class="auto-sell-toggle' + (game.autoSellEquipment ? ' is-on' : '') + '" type="button" onclick="toggleAutoSellEquipment();openInventorySettings();">';
  h += '        <span class="auto-sell-switch"></span>';
  h += '        <span class="auto-sell-label"><img class=ico-inline src=images/Icons/system/auto_sell.png> Auto-offrande ' + (game.autoSellEquipment ? "activée" : "désactivée") + '</span>';
  h += '      </button>';
  h += '    </div>';

  h += '    <div class="inv-threshold-label">Offrir automatiquement tout objet de rareté :</div>';
  h += '    <div class="inv-threshold-row">';
  rarities.forEach(function (r) {
    var label = (typeof RARITY_LABELS !== "undefined" && RARITY_LABELS[r]) || r;
    h += '<button class="inv-threshold-pill rarity-' + esc(r) + (threshold === r ? ' is-active' : '') + '" type="button" onclick="setAutoSellRarityThreshold(\'' + esc(r) + '\');openInventorySettings();">' + esc(label) + '</button>';
  });
  h += '    </div>';
  h += '    <div class="inv-threshold-hint">... ou en dessous.</div>';
  // v3.228.0 : l'autovente ne regarde que la rareté, pas les affixes — le dire pour éviter la mauvaise surprise.
  h += '    <div class="inv-threshold-hint">Le tri se fait sur la rareté seule : un objet de cette rareté part même si ses bonus sont excellents. Une arme d\'élite n\'est jamais offerte d\'office.</div>';

  h += '    <div class="dungeon-story-actions">';
  h += '      <button class="settings-btn" type="button" onclick="closeInventorySettings()">Fermer</button>';
  h += '    </div>';

  h += '    <button class="inv-sell-all-btn" type="button" onclick="confirmSellAllInventory()"><img class=ico-inline src=images/Icons/system/bulk_sell.png> Tout offrir</button>';

  h += '  </div>';
  h += '</div>';
  return h;
}

function openInventorySettings() {
  var host = document.getElementById("full-menu-root");
  if (host) host.innerHTML = buildInventorySettingsHTML();
}

function closeInventorySettings() {
  var host = document.getElementById("full-menu-root");
  if (host) host.innerHTML = "";
}
window.openInventorySettings = openInventorySettings;
window.closeInventorySettings = closeInventorySettings;

/* v3.322.0 (O2) : confirmations d'Offrande. Les noms des fonctions sont gardés (appelants). */
function confirmSellItem(uid) {
  var item = (Array.isArray(game.inventory) ? game.inventory : []).find(function (i) { return i.uid === uid; });
  var itemName = item ? item.name : "cet objet";
  var value = (item && window.MemoryManager) ? MemoryManager.getOfferingValue(item) : 0;
  if (typeof showConfirmModal !== "function") { EquipmentManager.sell(uid); return; }
  showConfirmModal(
    "Offrir cet objet ?",
    value > 0
      ? "Tu donnes " + itemName + " à l'Aether, qui t'en rendra " + formatNumber(value) + ". L'objet disparaît."
      : itemName + " a été acheté : il ne porte aucun souvenir et ne rendra pas d'Aether. L'objet disparaît.",
    "images/Icons/system/ascension.png",
    function () { EquipmentManager.sell(uid); }
  );
}
window.confirmSellItem = confirmSellItem;

function confirmSellAllInventory() {
  var inventory = Array.isArray(game.inventory) ? game.inventory : [];
  var count = inventory.filter(function (it) { return it && !it.unique; }).length;
  if (!count) { showToast("Aucun objet à offrir", 1200); return; }
  var totalValue = window.MemoryManager ? MemoryManager.previewOfferAll() : 0;
  if (typeof showConfirmModal !== "function") { sellAllInventory(); return; }
  closeInventorySettings();
  showConfirmModal(
    "Tout offrir ?",
    "Tu donnes les " + count + " objets de ton sac à l'Aether, pour " + formatNumber(totalValue) + " Aether environ. Les armes d'élite restent. Cette action est irréversible.",
    "images/Icons/system/trash.png",
    function () { sellAllInventory(); }
  );
}
window.confirmSellAllInventory = confirmSellAllInventory;

function getOwnedPotionsList() {
  var order = (typeof RARITY_ORDER !== "undefined") ? RARITY_ORDER : ["common", "green", "rare", "epic", "legendary"];
  var list = [];

  (POTIONS_DB || []).forEach(function (p) {
    var stock = PotionManager.getStock(p.id);
    if (stock > 0) list.push({ key: "buff:" + p.id, potion: p, isHealing: false, stock: stock });
  });
  (HEALING_POTIONS_DB || []).forEach(function (p) {
    var stock = PotionManager.getHealingStock(p.id);
    if (stock > 0) list.push({ key: "heal:" + p.id, potion: p, isHealing: true, stock: stock });
  });

  list.sort(function (a, b) {
    var ra = order.indexOf(a.potion.rarity || "common"), rb = order.indexOf(b.potion.rarity || "common");
    if (ra !== rb) return rb - ra;
    return String(a.potion.name || "").localeCompare(String(b.potion.name || ""));
  });

  return list;
}

function buildInventoryTabContentHTML(topHTML) {
  var h = '<div class="eq-bag-panel nb-page-frame nb-page-frame-fill kframe-page" data-kf-title="images/Icons/subtabs/inventory.png|Inventaire">';
  h += topHTML || ''; // v3.244.0 : voir buildEquipmentTabContentHTML

  h += buildInventoryCompactToolbarHTML();
  h += buildInventoryFilterRowHTML();

  var entries = getUnifiedInventoryEntries();
  var equipCount = (Array.isArray(game.inventory) ? game.inventory.length : 0);

  h += '<div class="panel-title" style="margin:0 0 10px;">Sac (' + equipCount + '/' + (typeof getInventoryCap === "function" ? getInventoryCap() : 25) + ')</div>'; // v3.322.0

  if (!entries.length) {
    var emptyMsg = inventoryFilter === "potions"
      ? "Aucune potion en stock — achète-en depuis la Boutique."
      : inventoryFilter === "equipment"
        ? "Sac vide, vainquez des boss pour obtenir du loot."
        : "Rien à afficher pour l\u2019instant.";
    h += '<div class="eq-empty">' + emptyMsg + '</div>';
  } else {
    if (!entries.some(function (e) { return e.key === selectedInventoryKey; })) {
      selectedInventoryKey = entries[0].key;
    }

    h += '<div class="eq-bag-flex">';
    h += '<div class="eq-bag-inv-grid">';
    entries.forEach(function (entry) {
      h += buildUnifiedTileHTML(entry);
    });
    h += '</div>';
    h += buildUnifiedDetailPanelHTML(entries);
    h += '</div>';
  }

  h += '</div>';
  return h;
}

function buildEquipHTML() {
  var h = '<div class="subtab-page">';
  h += '<div class="subtab-page-content">';
  if (activeEquipSubTab === "inventory") {
    h += buildInventoryTabContentHTML();
  } else if (activeEquipSubTab === "shop") {
    h += '<div class="nb-page-frame nb-page-frame-fill kframe-page" data-kf-title="images/Icons/subtabs/equipment_shop.png|Boutique d\u2019\u00e9quipement">';
    h += (typeof buildEquipShopHTML === "function") ? buildEquipShopHTML() : "";
    h += '</div>';
  } else {
    h += buildEquipmentTabContentHTML();
  }
  h += '</div>';

  h += '<div class="subtab-bar-wrapper">';
  h += buildEquipSubTabBarHTML();
  h += '</div>';

  h += '</div>';
  return h;
}

window.buildEquipHTML = buildEquipHTML;