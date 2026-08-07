"use strict";
/* ============================================================
Quest Idle — ui/equipment-view.js
Écran "Équipement" : fiche héros + 3 emplacements (arme/armure/
amulette) et le sac d'inventaire. Note : le titre du sac affiche
"/50" comme limite mais rien dans le code n'empêche réellement de
dépasser 50 objets (LootSystem ne vérifie pas la taille de
l'inventaire) — purement indicatif pour l'instant.
============================================================ */

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

/* Un des 3 emplacements équipés (arme/armure/amulette) : vide (clic
   sans effet, juste un toast) ou rempli (clic pour déséquiper). */
function buildEquipmentSlot(slot, label, icon) {
  var item = game.equipped[slot];
  var h = '<button class="eq-orbit-slot ' + (item ? 'filled' : 'empty') + '" onclick="' +
    (item
      ? "EquipmentManager.unequip('" + slot + "')"
      : "showToast('Aucun objet équipé', 900)") +
    '">';

  h += '<div class="eq-orbit-slot-label">' + esc(label) + '</div>';

  if (item) {
    h += buildEquipmentIconHTML(item, "eq-orbit-slot-icon");
    h += '<div class="eq-orbit-slot-name rarity-' + esc(item.rarity) + '">' + esc(item.name) + '</div>';
    h += '<div class="eq-orbit-slot-stat">' + esc(formatEquipmentStat(item)) + '</div>';
  } else {
    h += '<div class="eq-orbit-slot-icon eq-orbit-slot-placeholder">' + esc(icon) + '</div>';
    h += '<div class="eq-orbit-slot-empty">Vide</div>';
  }

  h += '</button>';
  return h;
}

/* Une tuile d'objet dans le sac : cliquer sur l'objet l'équipe,
   le bouton "Vendre" séparé le vend directement sans l'équiper. */
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

/* Assemble l'écran entier : bandeau de bonus de set (actif ou non),
   carte héros avec les 3 emplacements, puis le sac avec ses outils
   de tri/vente rapide. */
function buildEquipHTML() {
  var setBonus = EquipmentManager.getSetBonus();
  var inventory = Array.isArray(game.inventory) ? game.inventory : [];

  var h = '';

  if (setBonus && setBonus.config) {
    h += '<div class="set-bonus set-bonus-active">';
    h += '<div class="set-bonus-top">';
    h += '<span class="set-bonus-title">Bonus de set ' + esc(setBonus.rarity) + '</span>';
    h += '<span class="set-bonus-state">Actif</span>';
    h += '</div>';
    h += '<div class="set-bonus-text">' + esc(setBonus.config.text || "Bonus actif") + '</div>';
    h += '</div>';
  } else {
    h += '<div class="set-bonus set-bonus-inactive">';
    h += '<div class="set-bonus-top">';
    h += '<span class="set-bonus-title">Bonus de set</span>';
    h += '<span class="set-bonus-state">Inactif</span>';
    h += '</div>';
    h += '<div class="set-bonus-text">Équipe 3 objets de même rareté pour activer un bonus de set.</div>';
    h += '</div>';
  }

  // v2.24 : le portrait/nom/niveau/mini-stats du héros a été retiré
  // d'ici (doublon exact de l'écran Personnage) — cet écran ne
  // montre plus que ce qui concerne l'ÉQUIPEMENT lui-même.
  h += '<div class="eq-layout">';
  h += '<div class="eq-hero-card">';
  h += '<div class="eq-hero-main eq-hero-main-slots-only">';

  h += '<div class="eq-hero-right">';
  h += buildEquipmentSlot("weapon", "Arme", "⚔️");
  h += buildEquipmentSlot("armor", "Armure", "🛡️");
  h += buildEquipmentSlot("amulet", "Amulette", "💍");
  h += '</div>';

  h += '</div>';
  h += '</div>';

  h += '<div class="eq-bag-panel">';

  h += '<div class="auto-sell-toggle-row">';
  h += '<button class="auto-sell-toggle' + (game.autoSellEquipment ? ' is-on' : '') + '" type="button" onclick="toggleAutoSellEquipment()">';
  h += '<span class="auto-sell-switch"></span>';
  h += '<span class="auto-sell-label">🤖 Autovente ' + (game.autoSellEquipment ? "activée" : "désactivée") + '</span>';
  h += '</button>';
  h += '<p class="panel-sub" style="margin:6px 0 0;">Vend automatiquement tout nouveau butin d\u2019une rareté inférieure à celle déjà équipée sur le même emplacement.</p>';
  h += '</div>';

  h += '<div class="equip-toolbar">';
  h += '<button class="settings-btn" onclick="sortInventoryByRarity()">Tri rareté</button>';
  h += '<button class="settings-btn" onclick="sortInventoryByType()">Tri type</button>';
  h += '<button class="settings-btn danger" onclick="sellAllInventory()">Tout vendre</button>';
  h += '</div>';

  h += '<div class="panel-title" style="margin:0 0 10px;">Sac (' + inventory.length + '/50)</div>';

  if (!inventory.length) {
    h += '<div class="eq-empty">Sac vide, vainquez des boss pour obtenir du loot.</div>';
  } else {
    h += '<div class="eq-bag-grid">';
    inventory.forEach(function (item) {
      h += buildInventoryTile(item);
    });
    h += '</div>';
  }

  h += '</div>';
  h += '</div>';

  return h;
}

window.buildEquipHTML = buildEquipHTML;