"use strict";
/* ============================================================
Quest Idle — ui/equipment-view.js
Écran "Équipement" : fiche héros + 3 emplacements (arme/armure/
amulette) et le sac d'inventaire. Note : le titre du sac affiche
"/50" comme limite mais rien dans le code n'empêche réellement de
dépasser 50 objets (LootSystem ne vérifie pas la taille de
l'inventaire) — purement indicatif pour l'instant.

v2.83.16 : ajout du panneau de détail façon maquette — la grille de
gauche ne montre plus que des icônes (clic = sélectionne), le détail
de l'emplacement sélectionné (nom, stat, action) s'affiche à droite.
Pas de bouton "Améliorer" (aucune mécanique de ce type dans le jeu) :
remplacé par "Déséquiper", la vraie action disponible.
============================================================ */

var activeEquipSubTab = "equipment"; // "equipment" | "inventory"
var selectedEquipSlot = "weapon"; // slot réel ("weapon"/"armor"/"amulet") ou id verrouillé ("locked0".."locked3")
var selectedInventoryUid = null; // uid de l'objet sélectionné dans le sac (v2.83.29)

function setEquipSubTab(tab) {
  activeEquipSubTab = (tab === "inventory") ? "inventory" : "equipment";
  if (typeof renderPanel === "function") renderPanel();
}
window.setEquipSubTab = setEquipSubTab;

function selectEquipSlot(slotId) {
  selectedEquipSlot = slotId;
  if (typeof renderPanel === "function") renderPanel();
}
window.selectEquipSlot = selectEquipSlot;

function selectInventoryItem(uid) {
  selectedInventoryUid = uid;
  if (typeof renderPanel === "function") renderPanel();
}
window.selectInventoryItem = selectInventoryItem;

function buildEquipSubTabBarHTML() {
  var h = '<div class="pc-subtab-bar">';
  h += '<button type="button" class="pc-subtab-btn' + (activeEquipSubTab === "equipment" ? ' is-active' : '') + '" onclick="setEquipSubTab(\'equipment\')">🛡️<span>Équipement</span></button>';
  h += '<button type="button" class="pc-subtab-btn' + (activeEquipSubTab === "inventory" ? ' is-active' : '') + '" onclick="setEquipSubTab(\'inventory\')">🎒<span>Inventaire</span></button>';
  h += '</div>';
  return h;
}

/* Texte lisible du bonus d'un objet, ex: "+10% dégâts". */
function formatEquipmentStat(item) {
  if (!item) return "";
  var value = Number(item.value || 0);

  if (item.stat === "tapDmg") return "+" + formatNumber(value) + " dégâts/tap";
  if (item.stat === "tapMult") return "+" + Math.round(value * 100) + "% dégâts";
  if (item.stat === "goldMult") return "+" + Math.round(value * 100) + "% or";
  if (item.stat === "critChance") return "+" + formatNumber(value) + "% critique";
  if (item.stat === "critMult") return "+" + formatNumber(value) + "x dégâts crit";
  if (item.stat === "autoDps") return "+" + formatNumber(value) + " auto DPS";

  return "+" + formatNumber(value) + " " + esc(item.stat);
}

function getCurrentHeroForEquipmentView() {
  if (typeof getSelectedHero === "function") {
    return getSelectedHero();
  }
  return null;
}

/* Un des 3 emplacements équipés (arme/armure/amulette), version
   "icône seule" (v2.83.16) — le détail complet (nom, stat, action)
   est maintenant dans le panneau de droite, voir
   buildEquipDetailPanelHTML. Cliquer sélectionne l'emplacement,
   qu'il soit rempli ou vide. */
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

/* Emplacement RÉSERVÉ pour un futur type d'objet (casque, anneau,
   bottes...) — pas encore défini côté données, donc pas de nom
   inventé : juste un cadenas générique. Cliquable (contrairement à
   v2.83.15) pour afficher l'explication dans le panneau de droite,
   mais aucune action réelle possible tant que le type n'existe pas. */
function buildLockedEquipmentSlot(slotId) {
  var isSelected = selectedEquipSlot === slotId;
  var h = '<button class="eq-orbit-slot locked' + (isSelected ? ' is-selected' : '') + '" onclick="selectEquipSlot(\'' + esc(slotId) + '\')" aria-label="Emplacement à venir">';
  h += '<div class="eq-orbit-slot-icon eq-orbit-slot-placeholder">🔒</div>';
  h += '</button>';
  return h;
}

/* v2.83.34 : compare deux objets du MÊME type de stat (renvoie null
   si les types diffèrent — pas de comparaison numérique honnête
   entre par ex. +dégâts/tap et +%or). Renvoie le delta signé. */
function getEquipmentStatDelta(candidate, current) {
  if (!candidate || !current) return null;
  if (candidate.stat !== current.stat) return null;
  return Number(candidate.value || 0) - Number(current.value || 0);
}

function formatStatDelta(stat, delta) {
  var sign = delta > 0 ? "+" : "";
  if (stat === "tapMult" || stat === "goldMult") return sign + Math.round(delta * 100) + "%";
  if (stat === "critMult") return sign + formatNumber(delta) + "x";
  return sign + formatNumber(delta);
}

/* Objets du sac compatibles avec un emplacement donné, triés par
   rareté (décroissante) puis nom — utilisé par la mini-liste "Objets
   du sac compatibles" côté Équipement (v2.83.34). */
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

/* Mini-liste des objets du sac compatibles avec l'emplacement
   sélectionné, avec un bouton "Équiper" direct sur chacun — évite
   d'avoir à changer d'onglet pour équiper (v2.83.34). Plafonnée à 5
   objets affichés (au-delà, direction vers l'Inventaire complet). */
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

/* Panneau de détail (colonne de droite) — reflète l'emplacement
   actuellement sélectionné dans la grille de gauche. 3 états
   possibles : objet équipé (icône + nom + stat + bouton Déséquiper),
   emplacement réel vide (juste une invite vers l'Inventaire), ou
   emplacement verrouillé (explication, aucune action). v2.83.34 :
   ajout d'une mini-liste des objets compatibles du sac (voir
   buildCompatibleItemsListHTML), pour équiper sans changer d'onglet. */
function buildEquipDetailPanelHTML() {
  var realSlots = { weapon: "Arme", armor: "Armure", amulet: "Amulette" };
  var h = '<div class="eq-detail-panel">';

  if (realSlots[selectedEquipSlot]) {
    var slot = selectedEquipSlot;
    var item = game.equipped[slot];

    if (item) {
      h += '<div class="eq-detail-icon">' + buildEquipmentIconHTML(item, "eq-detail-icon-img") + '</div>';
      h += '<div class="eq-detail-name rarity-' + esc(item.rarity) + '">' + esc(item.name) + '</div>';
      h += '<div class="eq-detail-stat">' + esc(formatEquipmentStat(item)) + '</div>';
      h += '<button class="btn-buy eq-detail-action" type="button" onclick="EquipmentManager.unequip(\'' + esc(slot) + '\')">Déséquiper</button>';
    } else {
      h += '<div class="eq-detail-icon eq-detail-icon-empty">' + esc(realSlots[slot] === "Arme" ? "⚔️" : realSlots[slot] === "Armure" ? "🛡️" : "💍") + '</div>';
      h += '<div class="eq-detail-name">' + esc(realSlots[slot]) + ' — Vide</div>';
      h += '<div class="eq-detail-hint">Équipe un objet depuis l\u2019Inventaire pour remplir cet emplacement.</div>';
    }

    h += buildCompatibleItemsListHTML(slot);
  } else {
    h += '<div class="eq-detail-icon eq-detail-icon-empty">🔒</div>';
    h += '<div class="eq-detail-name">Emplacement à venir</div>';
    h += '<div class="eq-detail-hint">Ce type d\u2019objet n\u2019existe pas encore dans le jeu — réservé pour une future mise à jour.</div>';
  }

  h += buildCompactSetBonusHTML();

  h += '</div>';
  return h;
}

/* Version courte du bandeau "Bonus de set" (voir tout en haut de
   l'écran pour la version complète), affichée sous le panneau de
   détail — pratique pour vérifier l'état du bonus sans remonter en
   haut de l'écran pendant qu'on équipe/déséquipe des objets. */
function buildCompactSetBonusHTML() {
  var setBonus = EquipmentManager.getSetBonus();
  var h = '<div class="eq-detail-setbonus' + (setBonus && setBonus.config ? ' is-active' : '') + '">';

  if (setBonus && setBonus.config) {
    h += '<span class="eq-detail-setbonus-icon">✨</span>';
    h += '<span class="eq-detail-setbonus-text">' + esc(setBonus.config.name) + ' — ' + esc(setBonus.config.text) + '</span>';
  } else {
    h += '<span class="eq-detail-setbonus-icon">✦</span>';
    h += '<span class="eq-detail-setbonus-text">Bonus de set inactif</span>';
  }

  h += '</div>';
  return h;
}

/* Une tuile d'objet dans la grille du sac (v2.83.29) — icône seule,
   bordée par couleur de rareté, clic = sélectionne (le détail complet
   s'affiche dans le panneau de droite, voir
   buildInventoryDetailPanelHTML). Même principe que les emplacements
   de l'onglet Équipement. */
function buildInventoryGridTile(item) {
  var isSelected = selectedInventoryUid === item.uid;
  var h = '<button class="eq-bag-tile rarity-' + esc(item.rarity) + (isSelected ? ' is-selected' : '') + '" onclick="selectInventoryItem(\'' + esc(item.uid) + '\')" aria-label="' + esc(item.name) + '">';
  h += buildEquipmentIconHTML(item, "eq-bag-tile-icon");
  h += '</button>';
  return h;
}

/* Panneau de détail (colonne de droite) — objet actuellement
   sélectionné dans la grille du sac. "Équiper" est l'action réelle du
   jeu (pas d'"Utiliser" : ce sac ne contient que de l'équipement, les
   potions ont leur propre écran dans la Boutique). v2.83.34 : ajout
   d'une comparaison avec l'objet déjà équipé sur le même emplacement
   (delta si même type de stat, sinon simple rappel côte à côte). */
function buildInventoryDetailPanelHTML(inventory) {
  var item = inventory.find(function (i) { return i.uid === selectedInventoryUid; });
  var h = '<div class="eq-detail-panel">';

  if (item) {
    h += '<div class="eq-detail-icon">' + buildEquipmentIconHTML(item, "eq-detail-icon-img") + '</div>';
    h += '<div class="eq-detail-name rarity-' + esc(item.rarity) + '">' + esc(item.name) + '</div>';
    h += '<div class="eq-detail-stat">' + esc(formatEquipmentStat(item)) + '</div>';
    h += '<button class="btn-buy eq-detail-action" type="button" onclick="EquipmentManager.equip(\'' + esc(item.uid) + '\')">Équiper</button>';
    h += '<button class="btn-buy eq-detail-action" type="button" onclick="confirmSellItem(\'' + esc(item.uid) + '\')">Vendre</button>';
    h += buildEquippedComparisonHTML(item);
  } else {
    h += '<div class="eq-detail-icon eq-detail-icon-empty">🎒</div>';
    h += '<div class="eq-detail-name">Aucun objet sélectionné</div>';
    h += '<div class="eq-detail-hint">Touche un objet dans le sac pour voir son détail ici.</div>';
  }

  h += '</div>';
  return h;
}

/* Comparaison avec l'objet déjà équipé sur le même emplacement que
   l'objet sélectionné dans le sac (v2.83.34) — même logique de
   delta que buildCompatibleItemsListHTML côté Équipement. */
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

/* Une tuile d'objet dans le sac : cliquer sur l'objet l'équipe,
   le bouton "Vendre" séparé le vend directement sans l'équiper.
   v2.83.29 : conservée pour compatibilité mais plus utilisée par
   buildInventoryTabContentHTML — voir buildInventoryGridTile /
   buildInventoryDetailPanelHTML. */
function buildInventoryTile(item) {
  var h = '<div class="eq-bag-item rarity-' + esc(item.rarity) + '">';
  h += '<button class="eq-bag-main" onclick="EquipmentManager.equip(\'' + esc(item.uid) + '\')">';
  h += buildEquipmentIconHTML(item, "eq-bag-icon");
  h += '<div class="eq-bag-name rarity-' + esc(item.rarity) + '">' + esc(item.name) + '</div>';
  h += '<div class="eq-bag-stat">' + esc(formatEquipmentStat(item)) + '</div>';
  h += '</button>';
  h += '<button class="eq-bag-sell" onclick="EquipmentManager.sell(\'' + esc(item.uid) + '\')">Vendre</button>';
  h += '</div>';
  return h;
}

/* Contenu du sous-onglet "Équipement" : les 3 emplacements réels +
   emplacements verrouillés réservés pour de futurs types d'objets.
   v2.83.23 : le bandeau "BONUS DE SET" pleine largeur (en haut) a été
   retiré — le rappel compact sous le panneau de détail (voir
   buildCompactSetBonusHTML, v2.83.22) suffit maintenant à lui seul. */
function buildEquipmentTabContentHTML() {
  var h = '';

  // v2.24 : le portrait/nom/niveau/mini-stats du héros a été retiré
  // d'ici (doublon exact de l'écran Personnage) — cet écran ne
  // montre plus que ce qui concerne l'ÉQUIPEMENT lui-même.
  // v2.83.16 : grille d'icônes (gauche) + panneau de détail (droite),
  // façon maquette — voir buildEquipDetailPanelHTML.
  h += '<div class="eq-layout">';
  h += '<div class="eq-hero-card nb-page-frame nb-page-frame-fill">';
  h += '<div class="eq-hero-main eq-hero-main-slots-only">';

  h += '<div class="eq-hero-right">';
  h += '<div class="eq-slot-col">';
  h += buildEquipmentSlot("weapon", "Arme", "⚔️");
  h += buildEquipmentSlot("armor", "Armure", "🛡️");
  h += buildEquipmentSlot("amulet", "Amulette", "💍");
  h += buildLockedEquipmentSlot("locked0");
  h += '</div>';
  h += '<div class="eq-slot-col">';
  // Emplacements réservés pour de futurs types d'objets (pas encore
  // définis — voir buildLockedEquipmentSlot). 4 au total pour matcher
  // la maquette (7 emplacements), répartis 4/3 sur 2 colonnes comme
  // demandé.
  h += buildLockedEquipmentSlot("locked1");
  h += buildLockedEquipmentSlot("locked2");
  h += buildLockedEquipmentSlot("locked3");
  h += '</div>';
  h += '</div>';

  h += buildEquipDetailPanelHTML();

  h += '</div>';
  h += '</div>';
  h += '</div>';

  return h;
}

/* Contenu du sous-onglet "Inventaire" : bascule d'autovente, outils
   de tri/vente rapide, puis grille 3 colonnes (icônes seules) +
   panneau de détail de l'objet sélectionné (v2.83.29, même principe
   que l'onglet Équipement — voir buildInventoryDetailPanelHTML). */
/* v2.83.31 : barre d'outils compacte du sac — remplace l'ancienne
   bascule d'autovente pleine largeur + les 3 boutons côte à côte.
   2 icônes seulement : "⇅ Trier" (petit menu déroulant, 2 options) et
   "⚙" (panneau de réglages complet, voir buildInventorySettingsHTML). */
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
  // sortInventoryByX() appellent déjà renderPanel()/saveGame(), pas
  // besoin de le refaire ici.
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

/* Panneau de réglages complet (overlay, réutilise #full-menu-root —
   même conteneur générique que le menu ☰) : autovente + son seuil de
   rareté réglable, et "Tout vendre" tout en bas en rouge discret. */
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

/* v2.83.31 : confirmation avant toute vente (objet seul + tout
   vendre), demandée explicitement — réutilise showConfirmModal(),
   déjà utilisée pour l'ascension/le reset complet/le respec talents. */
function confirmSellItem(uid) {
  var item = (Array.isArray(game.inventory) ? game.inventory : []).find(function (i) { return i.uid === uid; });
  var itemName = item ? item.name : "cet objet";
  if (typeof showConfirmModal !== "function") { EquipmentManager.sell(uid); return; }
  showConfirmModal(
    "Vendre cet objet ?",
    "Tu es sur le point de vendre " + itemName + ". Cette action est irréversible.",
    "💰",
    function () { EquipmentManager.sell(uid); }
  );
}
window.confirmSellItem = confirmSellItem;

function confirmSellAllInventory() {
  var count = Array.isArray(game.inventory) ? game.inventory.length : 0;
  if (!count) { showToast("Aucun objet à vendre", 1200); return; }
  if (typeof showConfirmModal !== "function") { sellAllInventory(); return; }
  closeInventorySettings();
  showConfirmModal(
    "Tout vendre ?",
    "Tu es sur le point de vendre les " + count + " objets de ton sac. Cette action est irréversible.",
    "🗑️",
    function () { sellAllInventory(); }
  );
}
window.confirmSellAllInventory = confirmSellAllInventory;

function buildInventoryTabContentHTML() {
  var inventory = Array.isArray(game.inventory) ? game.inventory : [];
  var h = '<div class="eq-bag-panel nb-page-frame nb-page-frame-fill">';

  h += buildInventoryCompactToolbarHTML();

  h += '<div class="panel-title" style="margin:0 0 10px;">Sac (' + inventory.length + '/50)</div>';

  if (!inventory.length) {
    h += '<div class="eq-empty">Sac vide, vainquez des boss pour obtenir du loot.</div>';
  } else {
    // Si l'objet sélectionné a été vendu/équipé entre-temps (ou au
    // tout premier rendu), on retombe sur le premier objet du sac.
    if (!inventory.some(function (i) { return i.uid === selectedInventoryUid; })) {
      selectedInventoryUid = inventory[0].uid;
    }

    h += '<div class="eq-bag-flex">';
    h += '<div class="eq-bag-inv-grid">';
    inventory.forEach(function (item) {
      h += buildInventoryGridTile(item);
    });
    h += '</div>';
    h += buildInventoryDetailPanelHTML(inventory);
    h += '</div>';
  }

  h += '</div>';
  return h;
}

/* Assemble l'écran entier — 2 sous-onglets (Équipement/Inventaire),
   même pattern que Personnage/Donjon/Boutique (voir
   css/00-components.css : .subtab-page/-content/-bar-wrapper +
   .pc-subtab-bar/.pc-subtab-btn). */
function buildEquipHTML() {
  var h = '<div class="subtab-page">';
  h += '<div class="subtab-page-content">';
  h += (activeEquipSubTab === "inventory") ? buildInventoryTabContentHTML() : buildEquipmentTabContentHTML();
  h += '</div>';

  h += '<div class="subtab-bar-wrapper">';
  h += buildEquipSubTabBarHTML();
  h += '</div>';

  h += '</div>';
  return h;
}

window.buildEquipHTML = buildEquipHTML;