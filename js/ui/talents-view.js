"use strict";

/* ============================================================
   v2.1 — Refonte de l'écran talents.
   Fini les cercles positionnés à la main (2 jeux de coordonnées
   desktop/mobile) sur une image de fond fixe. Chaque talent est
   une carte, organisée par palier, dans une grille CSS standard.
============================================================ */

var activeTalentCategory = "combat";

function getTalentTree() {
  if (typeof TALENTTREE !== "undefined") return TALENTTREE;
  if (typeof TALENT_TREE !== "undefined") return TALENT_TREE;
  return { combat: [], fortune: [], survival: [] };
}

function isTalentOwned(id) {
  return !!(game.talents && game.talents[id]);
}

function hasTalentRequirement(node) {
  return !node.requires || !!game.talents[node.requires];
}

function getTalentCategoryLabel(category) {
  var labels = {
    combat: "Combat",
    fortune: "Fortune",
    survival: "Survie"
  };
  return labels[category] || category;
}

function setTalentCategory(category) {
  activeTalentCategory = category;
  renderPanel("talents");
}

// v2.90.13 : bascule des 3 arbres alignée sur le composant partagé
// .pc-subtab-bar/.pc-subtab-btn (même pattern que Donjon/Équipement/
// Ascension/Boutique), au lieu des pastilles bricolées d'avant —
// cohérence visuelle + la barre passe en bas de l'écran comme
// partout ailleurs (voir .subtab-page/.subtab-bar-wrapper dans
// buildTalentsHTML plus bas), au lieu d'être fixée en haut.
var TALENT_CATEGORY_ICONS = { combat: "⚔️", fortune: "💰", survival: "🛡️" };

function buildTalentCategoryTabs() {
  var categories = ["combat", "fortune", "survival"];
  var h = '<div class="pc-subtab-bar">';

  categories.forEach(function (category) {
    var active = category === activeTalentCategory ? " is-active" : "";
    h += '<button type="button" class="pc-subtab-btn' + active + '" onclick="window.setTalentCategory(\'' + category + '\')">' +
         TALENT_CATEGORY_ICONS[category] + '<span>' + esc(getTalentCategoryLabel(category)) + '</span>' +
         '</button>';
  });

  h += '</div>';
  return h;
}

/* Un talent a un "slot" hérité de l'ancien positionnement en croix
   (top / upper_left / mid_right / ...). On s'en sert juste pour
   déduire son palier, plus pour le positionner à l'écran. */
var TALENT_TIER_ORDER = ["top", "upper", "mid", "inner", "lower", "bottom"];
var TALENT_TIER_LABELS = {
  top: "Palier 1",
  upper: "Palier 2",
  mid: "Palier 3",
  inner: "Palier 4",
  lower: "Palier 5",
  bottom: "Palier 6"
};

function getTalentTierKey(slot) {
  if (!slot) return "top";
  if (slot === "top" || slot === "bottom") return slot;
  return slot.replace(/_left$|_right$/, "");
}

function findTalentNodeInBranch(nodes, id) {
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i].id === id) return nodes[i];
  }
  return null;
}

function renderTalentIconHTML(node) {
  if (node.img) {
    return '<img class="talent-icon-img" src="' + esc(node.img) + '" alt="">';
  }
  return esc(node.icon || "✨");
}

function buildTalentStatusHTML(node, nodes) {
  var owned = isTalentOwned(node.id);
  var canBuy = !owned && hasTalentRequirement(node) && (game.talentPoints || 0) >= 1;

  if (owned) {
    return '<span class="talent-tier-status status-unlocked">✔ Débloqué</span>';
  }
  if (canBuy) {
    return '<span class="talent-tier-status status-available">Disponible · 1 pt</span>';
  }
  if (node.requires && !game.talents[node.requires]) {
    var reqNode = findTalentNodeInBranch(nodes, node.requires);
    return '<span class="talent-tier-status status-locked">🔒 Nécessite ' + esc(reqNode ? reqNode.name : "un talent précédent") + '</span>';
  }
  return '<span class="talent-tier-status status-locked">🔒 Pas assez de points</span>';
}

function buildTalentBranchHTML(branchKey) {
  var tree = getTalentTree();
  var nodes = tree[branchKey] || [];

  var tiers = {};
  nodes.forEach(function (node) {
    var tierKey = getTalentTierKey(node.slot);
    if (!tiers[tierKey]) tiers[tierKey] = [];
    tiers[tierKey].push(node);
  });

  // v2.90.13 : liste ordonnée des paliers RÉELLEMENT présents dans
  // cette branche, avec lookahead nécessaire pour dessiner le
  // connecteur ENTRE ce palier et le suivant (voir plus bas).
  var presentTiers = TALENT_TIER_ORDER.filter(function (k) { return tiers[k] && tiers[k].length; });

  var h = '<div class="talent-board talent-board-' + esc(branchKey) + '">';

  presentTiers.forEach(function (tierKey, tierIndex) {
    var tierNodes = tiers[tierKey];

    h += '<div class="talent-tier-label">' + esc(TALENT_TIER_LABELS[tierKey] || tierKey) + '</div>';
    h += '<div class="talent-tier-row' + (tierNodes.length === 1 ? " single" : "") + '">';

    tierNodes.forEach(function (node) {
      var owned = isTalentOwned(node.id);
      var canBuy = !owned && hasTalentRequirement(node) && (game.talentPoints || 0) >= 1;
      var classes = ["talent-tier-card"];

      if (owned) classes.push("unlocked");
      else if (canBuy) classes.push("available");
      else classes.push("locked");
      if (node.capstone) classes.push("capstone");

      var tooltipText = node.desc || node.effect || "";

      h += '<button class="' + classes.join(" ") + '" type="button" title="' + esc(tooltipText) + '" onclick="buyTalentNode(\'' + esc(node.id) + '\')">';
      h += '<div class="talent-tier-icon">' + renderTalentIconHTML(node) + '</div>';
      h += '<div class="talent-tier-name">' + esc(node.name) + '</div>';
      h += '<div class="talent-tier-effect">' + esc(node.effect || "") + '</div>';
      h += buildTalentStatusHTML(node, nodes);
      h += '</button>';
    });

    h += '</div>';

    // v2.90.13 : connecteur visuel ENTRE ce palier et le suivant (pas
    // après le dernier). "split" si on passe de 1 à 2 talents (palier
    // 1 -> 2, toutes branches), "parallel" sinon (2 talents restent 2,
    // chaque colonne reste sur SA propre branche jusqu'au bout — voir
    // data/talents.js, chaque talent de palier N+1 ne dépend que du
    // talent de MÊME CÔTÉ au palier N). Coloré en doré si le talent
    // d'origine (palier courant, même colonne) est débloqué, pour
    // matérialiser le chemin déjà emprunté.
    var nextTierNodes = presentTiers[tierIndex + 1] ? tiers[presentTiers[tierIndex + 1]] : null;
    if (nextTierNodes) {
      var isSplit = tierNodes.length === 1 && nextTierNodes.length > 1;
      var leftOwned = isTalentOwned(tierNodes[0].id);
      var rightOwned = tierNodes.length > 1 ? isTalentOwned(tierNodes[1].id) : leftOwned;

      h += '<div class="talent-connector ' + (isSplit ? "split" : "parallel") + '">';
      h += '<div class="tc-stem-top' + (leftOwned ? " is-active" : "") + '"></div>';
      h += '<div class="tc-bar' + (leftOwned ? " is-active" : "") + '"></div>';
      h += '<div class="tc-stem-left' + (leftOwned ? " is-active" : "") + '"></div>';
      h += '<div class="tc-stem-right' + (rightOwned ? " is-active" : "") + '"></div>';
      h += '</div>';
    }
  });

  h += '</div>';
  return h;
}

/* v2.90.13 : le résumé complet (liste des bonus actifs + bouton
   Réinitialiser) n'est plus affiché en permanence en haut de l'écran
   — remplacé par un résumé compact d'une ligne, qui ouvre une popup
   au tap (même pattern que les popups Village/Donjon de cette
   session : #talent-modal-root, .full-menu-overlay/.full-menu). */
function buildTalentSummaryBarHTML() {
  var tree = getTalentTree();
  var all = [].concat(tree.combat || [], tree.fortune || [], tree.survival || []);
  var ownedCount = all.filter(function (n) { return isTalentOwned(n.id); }).length;

  var h = '<button type="button" class="talent-summary-bar" onclick="openTalentSummaryPopup()">';
  h += '<span>✨ ' + ownedCount + ' bonus actif' + (ownedCount > 1 ? "s" : "") + '</span>';
  h += '<span class="talent-summary-bar-points">' + (game.talentPoints || 0) + ' pt(s) disponible(s)</span>';
  h += '<span class="talent-summary-bar-chevron">▸</span>';
  h += '</button>';
  return h;
}

function buildTalentSummaryPopupHTML() {
  var tree = getTalentTree();
  var all = [].concat(tree.combat || [], tree.fortune || [], tree.survival || []);
  var owned = all.filter(function (n) { return isTalentOwned(n.id); });

  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu talent-popup-card">';
  h += '    <div class="talent-popup-title">✨ Bonus de talents actifs</div>';
  h += '    <div class="talent-popup-meta">' + (game.talentPoints || 0) + ' point(s) disponible(s)</div>';

  if (owned.length) {
    h += '<div class="talent-summary-list">';
    owned.forEach(function (n) {
      h += '<div class="talent-summary-item">' +
           '<span class="talent-summary-icon">' + renderTalentIconHTML(n) + '</span>' +
           '<span>' + esc(n.name) + ' — ' + esc(n.effect || "") + '</span>' +
           '</div>';
    });
    h += '</div>';

    var respecCost = typeof getTalentRespecCost === "function" ? getTalentRespecCost() : 0;
    var canRespec = (game.gold || 0) >= respecCost;
    h += '<button class="talent-respec-btn' + (canRespec ? "" : " disabled") + '" type="button" onclick="respecTalents()">' +
         '🔄 Réinitialiser les talents (' + formatNumber(respecCost) + ' or)' +
         '</button>';
  } else {
    h += '<div class="talent-summary-empty">Aucun talent débloqué pour l\'instant.</div>';
  }

  h += '    <button class="settings-btn" type="button" onclick="closeTalentSummaryPopup()">Fermer</button>';
  h += '  </div>';
  h += '</div>';
  return h;
}

function openTalentSummaryPopup() {
  var host = document.getElementById("talent-modal-root");
  if (host) host.innerHTML = buildTalentSummaryPopupHTML();
}

function closeTalentSummaryPopup() {
  var host = document.getElementById("talent-modal-root");
  if (host) host.innerHTML = "";
}

function buildTalentsHTML() {
  var h = '<div class="subtab-page">';
  h += '<div class="subtab-page-content">';
  h += '<div class="nb-page-frame">';
  h += buildTalentSummaryBarHTML();
  h += buildTalentBranchHTML(activeTalentCategory);
  h += '</div>';
  h += '</div>'; // fin .subtab-page-content

  h += '<div class="subtab-bar-wrapper">';
  h += buildTalentCategoryTabs();
  h += '</div>';

  h += '</div>'; // fin .subtab-page
  return h;
}

window.buildTalentsHTML = buildTalentsHTML;
window.setTalentCategory = setTalentCategory;
window.openTalentSummaryPopup = openTalentSummaryPopup;
window.closeTalentSummaryPopup = closeTalentSummaryPopup;
