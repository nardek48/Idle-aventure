"use strict";
/* ui/construction-view.js — modale du bâtiment de Construction (#construction-modal-root, hors cycle renderPanel()).
   Coût généralisé à un nombre variable de ressources selon le palier (v3.40). Détail complet : COMMENTAIRES_ORIGINAUX.md */

var openConstructionId = null;

function getConstructionCostMeta(key) {
  if (key === "gold") {
    return { label: "Or", iconHTML: '<img class="construction-cost-icon" src="images/Icons/gold_icon.png" alt="">' };
  }
  var def = WAREHOUSE_RESOURCES[key];
  if (!def) return { label: key, iconHTML: "" };
  return { label: def.name, iconHTML: renderIconOrEmojiHTML(def.icon, "construction-cost-icon", def.name) };
}

function buildConstructionCostRowHTML(label, iconHTML, amount, ok) {
  var h = '<div class="construction-cost-row' + (ok ? '' : ' is-missing') + '">';
  h += iconHTML;
  h += '<span class="construction-cost-label">' + esc(label) + '</span>';
  h += '<span class="construction-cost-amount">' + formatNumber(amount) + '</span>';
  h += '<span class="construction-cost-check">' + (ok ? '✅' : '❌') + '</span>';
  h += '</div>';
  return h;
}

function buildConstructionModalHTML(id) {
  var def = CONSTRUCTION_BUILDINGS[id];
  if (!def) return "";

  var level = ConstructionManager.getLevel(id);
  var maxed = ConstructionManager.isMaxLevel(id);
  var currentBonusPct = Math.round((ConstructionManager.getCurrentBonusMultiplier(id) - 1) * 100);

  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu construction-popup-card">';
  h += '    <div class="construction-popup-icon">🏗️</div>';
  h += '    <div class="construction-popup-title">' + esc(def.name) + '</div>';
  h += '    <div class="construction-popup-text">' + esc(def.desc) + '</div>';
  h += '    <div class="construction-popup-meta">Niveau ' + level + ' / ' + def.maxLevel + '</div>';
  h += '    <div class="construction-popup-meta"><strong>Bonus actuel : +' + currentBonusPct + '% or de vente à l\'Entrepôt</strong></div>';

  if (maxed) {
    h += '    <div class="construction-popup-meta">Niveau maximum atteint.</div>';
    h += '    <div class="construction-popup-actions">';
    h += '      <button class="settings-btn" type="button" onclick="closeConstructionModal()">Fermer</button>';
    h += '      <button class="settings-btn primary is-maxed" type="button" disabled>Niveau maximum</button>';
    h += '    </div>';
  } else {
    var nextBonusPct = Math.round((ConstructionManager.getNextBonusMultiplier(id) - 1) * 100);
    var cost = ConstructionManager.getNextCost(id);
    var afford = ConstructionManager.getAffordability(id);

    h += '    <div class="construction-popup-meta">Prochain niveau : +' + nextBonusPct + '% <span class="construction-popup-delta">(+' + (nextBonusPct - currentBonusPct) + ')</span></div>';

    h += '    <div class="construction-cost-list">';
    var costKeys = Object.keys(cost);
    costKeys.sort(function (a, b) {
      if (a === "gold") return -1;
      if (b === "gold") return 1;
      return 0;
    });
    costKeys.forEach(function (key) {
      var meta = getConstructionCostMeta(key);
      h += buildConstructionCostRowHTML(meta.label, meta.iconHTML, cost[key], afford[key]);
    });
    h += '    </div>';

    h += '    <div class="construction-popup-actions">';
    h += '      <button class="settings-btn" type="button" onclick="closeConstructionModal()">Fermer</button>';
    if (afford.all) {
      h += '      <button class="settings-btn primary" type="button" onclick="buyConstructionFromModal(\'' + id + '\')">Améliorer</button>';
    } else {
      h += '      <button class="settings-btn primary is-unaffordable" type="button" disabled>Améliorer</button>';
    }
    h += '    </div>';
  }

  h += '  </div>';
  h += '</div>';
  return h;
}

function openConstructionModal(id) {
  if (!CONSTRUCTION_BUILDINGS[id]) return;
  ConstructionManager.ensure();
  openConstructionId = id;
  var host = document.getElementById("construction-modal-root");
  if (host) host.innerHTML = buildConstructionModalHTML(id);
}
window.openConstructionModal = openConstructionModal;

function closeConstructionModal() {
  openConstructionId = null;
  var host = document.getElementById("construction-modal-root");
  if (host) host.innerHTML = "";
}
window.closeConstructionModal = closeConstructionModal;

function buyConstructionFromModal(id) {
  ConstructionManager.buy(id);
  if (openConstructionId === id) openConstructionModal(id);
}
window.buyConstructionFromModal = buyConstructionFromModal;
