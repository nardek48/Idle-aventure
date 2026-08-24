"use strict";
/* ui/equipment-view.js — écran Équipement, 3 sous-onglets Équipement/Inventaire/Boutique. Panneau détail unifié équipement+potions (v2.83.46), comparaison avec équipé, bonus de set. Détail : COMMENTAIRES_ORIGINAUX.md */

var activeEquipSubTab = "equipment"; // "equipment" | "inventory" | "shop" | "potions"
var selectedEquipSlot = "weapon"; // un des 7 slots réels (voir EQUIPMENT_SLOTS)
var selectedInventoryKey = null; // clé unifiée équipement("eq:uid")/potion("buff:id"/"heal:id") — v2.83.46

function setEquipSubTab(tab) {
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
  h += '<button type="button" class="pc-subtab-btn' + (activeEquipSubTab === "equipment" ? ' is-active' : '') + '" onclick="setEquipSubTab(\'equipment\')">🛡️<span>Équipement</span></button>';
  h += '<button type="button" class="pc-subtab-btn' + (activeEquipSubTab === "inventory" ? ' is-active' : '') + '" onclick="setEquipSubTab(\'inventory\')">🎒<span>Inventaire</span></button>';
  h += '<button type="button" class="pc-subtab-btn' + (activeEquipSubTab === "shop" ? ' is-active' : '') + '" onclick="setEquipSubTab(\'shop\')">🛒<span>Boutique</span></button>';
  h += '</div>';
  return h;
}

function formatEquipmentStat(item) {
  if (!item) return "";
  var value = Number(item.value || 0);

  if (item.stat === "tapDmg") return "+" + formatNumber(value) + " dégâts/tap";
  if (item.stat === "tapMult") return "+" + Math.round(value * 100) + "% dégâts";
  if (item.stat === "goldMult") return "+" + Math.round(value * 100) + "% or";
  if (item.stat === "critChance") return "+" + formatNumber(value) + "% critique";
  if (item.stat === "critMult") return "+" + formatNumber(value) + "x dégâts crit";
  if (item.stat === "autoDps") return "+" + formatNumber(value) + " auto DPS";
  if (item.stat === "defense") return "+" + Math.round(value * 100) + "% défense";

  return "+" + formatNumber(value) + " " + esc(item.stat);
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
    ? buildEquipmentIconHTML(item, "eq-orbit-slot-icon")
    : '<div class="eq-orbit-slot-icon eq-orbit-slot-placeholder">' + esc(icon) + '</div>';
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
  if (stat === "tapMult" || stat === "goldMult" || stat === "defense") return sign + Math.round(delta * 100) + "%";
  if (stat === "critMult") return sign + formatNumber(delta) + "x";
  return sign + formatNumber(delta);
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

function buildCompatibleItemsListHTML(slot) {
  var items = getInventoryItemsForSlot(slot);
  if (!items.length) return "";

  var equipped = game.equipped[slot];
  var h = '<div class="eq-compat-list">';
  h += '<div class="eq-compat-title">🎒 Dans le sac (' + items.length + ')</div>';

  items.slice(0, 5).forEach(function (item) {
    var delta = getEquipmentStatDelta(item, equipped);
    h += '<div class="eq-compat-row">';
    h += '<div class="eq-compat-icon">' + buildEquipmentIconHTML(item, "eq-compat-icon-img") + '</div>';
    h += '<div class="eq-compat-info">';
    h += '<div class="eq-compat-name rarity-' + esc(item.rarity) + '">' + esc(item.name) + '</div>';
    h += '<div class="eq-compat-stat">' + esc(formatEquipmentStat(item));
    if (delta != null) {
      h += ' <span class="eq-compat-delta ' + (delta > 0 ? "is-up" : delta < 0 ? "is-down" : "is-flat") + '">(' + esc(formatStatDelta(item.stat, delta)) + ')</span>';
    }
    h += '</div>';
    h += '</div>';
    h += '<button class="btn-buy eq-compat-equip-btn" type="button" onclick="EquipmentManager.equip(\'' + esc(item.uid) + '\')">Équiper</button>';
    h += '</div>';
  });

  if (items.length > 5) {
    h += '<button class="eq-compat-more-btn" type="button" onclick="setEquipSubTab(\'inventory\')">Voir les ' + items.length + ' objets dans l\u2019Inventaire →</button>';
  }

  h += '</div>';
  return h;
}

function buildEquipDetailPanelHTML() {
  var slot = selectedEquipSlot;
  var label = EQUIPMENT_SLOT_LABELS[slot] || slot;
  var emoji = EQUIPMENT_SLOT_EMOJI[slot] || "❔";
  var item = game.equipped[slot];
  var h = '<div class="eq-detail-panel">';

  if (item) {
    h += '<div class="eq-detail-icon">' + buildEquipmentIconHTML(item, "eq-detail-icon-img") + '</div>';
    h += '<div class="eq-detail-name rarity-' + esc(item.rarity) + '">' + esc(item.name) + '</div>';
    h += '<div class="eq-detail-stat">' + esc(formatEquipmentStat(item)) + '</div>';
    h += '<button class="btn-buy eq-detail-action" type="button" onclick="EquipmentManager.unequip(\'' + esc(slot) + '\')">Déséquiper</button>';
  } else {
    h += '<div class="eq-detail-icon eq-detail-icon-empty">' + esc(emoji) + '</div>';
    h += '<div class="eq-detail-name">' + esc(label) + ' — Vide</div>';
    h += '<div class="eq-detail-hint">Équipe un objet depuis l\u2019Inventaire pour remplir cet emplacement.</div>';
  }

  h += buildCompatibleItemsListHTML(slot);
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
    h += '<span class="eq-detail-setbonus-icon">✦</span>';
    h += '<span class="eq-detail-setbonus-text">Bonus de set inactif</span>';
    h += '</div>';
    return h;
  }

  var out = '';
  active.forEach(function (entry) {
    out += '<div class="eq-detail-setbonus is-active">';
    out += '<span class="eq-detail-setbonus-icon">✨</span>';
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
    var h = '<button class="eq-bag-tile rarity-' + esc(item.rarity) + (isSelected ? ' is-selected' : '') + '" onclick="selectInventoryKey(\'' + esc(entry.key) + '\')" aria-label="' + esc(item.name) + '">';
    h += buildEquipmentIconHTML(item, "eq-bag-tile-icon");
    h += '</button>';
    return h;
  }

  var potion = entry.potion;
  var h2 = '<button class="eq-bag-tile rarity-' + esc(potion.rarity || "common") + (isSelected ? ' is-selected' : '') + '" onclick="selectInventoryKey(\'' + esc(entry.key) + '\')" aria-label="' + esc(potion.name) + '">';
  h2 += renderIconOrEmojiHTML(potion.icon, "eq-bag-tile-icon", potion.name);
  h2 += '<span class="eq-bag-tile-stock">' + entry.stock + '</span>';
  h2 += '</button>';
  return h2;
}

function buildUnifiedDetailPanelHTML(entries) {
  var entry = entries.find(function (e) { return e.key === selectedInventoryKey; });
  var h = '<div class="eq-detail-panel">';

  if (!entry) {
    h += '<div class="eq-detail-icon eq-detail-icon-empty">🎒</div>';
    h += '<div class="eq-detail-name">Aucun objet sélectionné</div>';
    h += '<div class="eq-detail-hint">Touche un objet dans le sac pour voir son détail ici.</div>';
  } else if (entry.type === "equipment") {
    var item = entry.item;
    h += '<div class="eq-detail-icon">' + buildEquipmentIconHTML(item, "eq-detail-icon-img") + '</div>';
    h += '<div class="eq-detail-name rarity-' + esc(item.rarity) + '">' + esc(item.name) + '</div>';
    h += '<div class="eq-detail-stat">' + esc(formatEquipmentStat(item)) + '</div>';
    h += '<button class="btn-buy eq-detail-action" type="button" onclick="EquipmentManager.equip(\'' + esc(item.uid) + '\')">Équiper</button>';
    h += '<button class="btn-buy eq-detail-action" type="button" onclick="confirmSellItem(\'' + esc(item.uid) + '\')">Vendre</button>';
    h += buildEquippedComparisonHTML(item);
  } else {
    var potion = entry.potion;
    var descText = entry.isHealing
      ? "Restaure " + Math.round(potion.healPercent * 100) + "% des PV max."
      : potion.desc;

    h += '<div class="eq-detail-icon">' + renderIconOrEmojiHTML(potion.icon, "eq-detail-icon-img", potion.name) + '</div>';
    h += '<div class="eq-detail-name">' + esc(potion.name) + '</div>';
    h += '<div class="eq-detail-stat">' + esc(descText) + '</div>';
    h += '<div class="eq-detail-hint">🎒 Stock : ' + entry.stock + '</div>';

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
  h += '<div class="eq-compare-title">🔁 Actuellement équipé</div>';

  if (!equipped) {
    h += '<div class="eq-compare-empty">Rien d\u2019équipé sur cet emplacement — équiper cet objet sera un pur gain.</div>';
  } else {
    var delta = getEquipmentStatDelta(item, equipped);
    h += '<div class="eq-compare-row">';
    h += '<div class="eq-compare-icon">' + buildEquipmentIconHTML(equipped, "eq-compare-icon-img") + '</div>';
    h += '<div class="eq-compare-info">';
    h += '<div class="eq-compare-name rarity-' + esc(equipped.rarity) + '">' + esc(equipped.name) + '</div>';
    h += '<div class="eq-compare-stat">' + esc(formatEquipmentStat(equipped)) + '</div>';
    h += '</div>';
    h += '</div>';

    if (delta != null) {
      h += '<div class="eq-compare-delta ' + (delta > 0 ? "is-up" : delta < 0 ? "is-down" : "is-flat") + '">';
      h += (delta > 0 ? "▲ Amélioration : " : delta < 0 ? "▼ Recul : " : "= Égalité : ");
      h += esc(formatStatDelta(item.stat, delta));
      h += '</div>';
    } else {
      h += '<div class="eq-compare-hint">Types de bonus différents — compare les deux lignes ci-dessus à l\u2019œil.</div>';
    }
  }

  h += '</div>';
  return h;
}

function buildEquipmentTabContentHTML() {
  var h = '';

  h += '<div class="eq-layout">';
  h += '<div class="eq-hero-card nb-page-frame nb-page-frame-fill">';
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
  h += '<button class="inv-toolbar-btn" type="button" onclick="toggleInventorySortMenu()">⇅ Trier</button>';
  if (showInventorySortMenu) {
    h += '<div class="inv-sort-menu">';
    h += '<button type="button" onclick="applyInventorySort(\'rarity\')">Rareté</button>';
    h += '<button type="button" onclick="applyInventorySort(\'type\')">Type</button>';
    h += '</div>';
  }
  h += '</div>';

  h += '<button class="inv-toolbar-btn" type="button" onclick="openInventorySettings()">⚙</button>';

  h += '</div>';
  return h;
}

function buildInventoryFilterRowHTML() {
  var h = '<div class="inv-filter-row">';
  h += '<button type="button" class="inv-filter-btn' + (inventoryFilter === "all" ? ' is-active' : '') + '" onclick="setInventoryFilter(\'all\')">Tout</button>';
  h += '<button type="button" class="inv-filter-btn' + (inventoryFilter === "equipment" ? ' is-active' : '') + '" onclick="setInventoryFilter(\'equipment\')">🛡️ Équipement</button>';
  h += '<button type="button" class="inv-filter-btn' + (inventoryFilter === "potions" ? ' is-active' : '') + '" onclick="setInventoryFilter(\'potions\')">🧪 Potions</button>';
  h += '</div>';
  return h;
}

function buildInventorySettingsHTML() {
  var threshold = game.autoSellRarityThreshold || "common";
  var rarities = (typeof RARITY_ORDER !== "undefined") ? RARITY_ORDER : ["common", "green", "rare", "epic", "legendary"];

  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu dungeon-story-card">';
  h += '    <div class="dungeon-story-icon">⚙️</div>';
  h += '    <div class="dungeon-story-title">Réglages du sac</div>';

  h += '    <div class="auto-sell-toggle-row">';
  h += '      <button class="auto-sell-toggle' + (game.autoSellEquipment ? ' is-on' : '') + '" type="button" onclick="toggleAutoSellEquipment();openInventorySettings();">';
  h += '        <span class="auto-sell-switch"></span>';
  h += '        <span class="auto-sell-label">🤖 Autovente ' + (game.autoSellEquipment ? "activée" : "désactivée") + '</span>';
  h += '      </button>';
  h += '    </div>';

  h += '    <div class="inv-threshold-label">Vendre automatiquement tout objet de rareté :</div>';
  h += '    <div class="inv-threshold-row">';
  rarities.forEach(function (r) {
    var label = (typeof RARITY_LABELS !== "undefined" && RARITY_LABELS[r]) || r;
    h += '<button class="inv-threshold-pill rarity-' + esc(r) + (threshold === r ? ' is-active' : '') + '" type="button" onclick="setAutoSellRarityThreshold(\'' + esc(r) + '\');openInventorySettings();">' + esc(label) + '</button>';
  });
  h += '    </div>';
  h += '    <div class="inv-threshold-hint">... ou en dessous.</div>';

  h += '    <div class="dungeon-story-actions">';
  h += '      <button class="settings-btn" type="button" onclick="closeInventorySettings()">Fermer</button>';
  h += '    </div>';

  h += '    <button class="inv-sell-all-btn" type="button" onclick="confirmSellAllInventory()">🗑️ Tout vendre</button>';

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

function confirmSellItem(uid) {
  var item = (Array.isArray(game.inventory) ? game.inventory : []).find(function (i) { return i.uid === uid; });
  var itemName = item ? item.name : "cet objet";
  var sellValue = (item && typeof getEquipmentSellValue === "function") ? getEquipmentSellValue(item) : 0;
  if (typeof showConfirmModal !== "function") { EquipmentManager.sell(uid); return; }
  showConfirmModal(
    "Vendre cet objet ?",
    "Tu es sur le point de vendre " + itemName + " pour " + formatNumber(sellValue) + " or. Cette action est irréversible.",
    "💰",
    function () { EquipmentManager.sell(uid); }
  );
}
window.confirmSellItem = confirmSellItem;

function confirmSellAllInventory() {
  var inventory = Array.isArray(game.inventory) ? game.inventory : [];
  var count = inventory.length;
  if (!count) { showToast("Aucun objet à vendre", 1200); return; }
  var totalValue = (typeof getEquipmentSellValue === "function")
    ? inventory.reduce(function (sum, item) { return sum + getEquipmentSellValue(item); }, 0)
    : 0;
  if (typeof showConfirmModal !== "function") { sellAllInventory(); return; }
  closeInventorySettings();
  showConfirmModal(
    "Tout vendre ?",
    "Tu es sur le point de vendre les " + count + " objets de ton sac pour " + formatNumber(totalValue) + " or au total. Cette action est irréversible.",
    "🗑️",
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

function buildInventoryTabContentHTML() {
  var h = '<div class="eq-bag-panel nb-page-frame nb-page-frame-fill">';

  h += buildInventoryCompactToolbarHTML();
  h += buildInventoryFilterRowHTML();

  var entries = getUnifiedInventoryEntries();
  var equipCount = (Array.isArray(game.inventory) ? game.inventory.length : 0);

  h += '<div class="panel-title" style="margin:0 0 10px;">Sac (' + equipCount + '/50)</div>';

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
    h += '<div class="nb-page-frame nb-page-frame-fill">';
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