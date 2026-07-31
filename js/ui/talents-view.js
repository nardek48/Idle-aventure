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

function buildTalentCategoryTabs() {
  var categories = ["combat", "fortune", "survival"];
  var h = '<div class="talent-category-tabs">';

  categories.forEach(function (category) {
    var active = category === activeTalentCategory ? " is-active" : "";
    h += '<button class="talent-category-tab' + active + '" type="button" onclick="window.setTalentCategory(\'' + category + '\')">' +
         esc(getTalentCategoryLabel(category)) +
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

  var h = '<div class="talent-board talent-board-' + esc(branchKey) + '">';

  TALENT_TIER_ORDER.forEach(function (tierKey) {
    var tierNodes = tiers[tierKey];
    if (!tierNodes || !tierNodes.length) return;

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
  });

  h += '</div>';
  return h;
}

function buildActiveTalentBonusesHTML() {
  var tree = getTalentTree();
  var all = [].concat(tree.combat || [], tree.fortune || [], tree.survival || []);
  var owned = all.filter(function (n) { return isTalentOwned(n.id); });

  var h = '<div class="talent-summary">';
  h += '<div class="talent-summary-header">';
  h += '<span>✨ Bonus actifs (' + owned.length + ')</span>';
  h += '<span>' + (game.talentPoints || 0) + ' pt(s) disponible(s)</span>';
  h += '</div>';

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

  h += '</div>';
  return h;
}

function buildTalentsHTML() {
  var h = '<div class="panel-title">Arbres de talents</div>';
  h += buildActiveTalentBonusesHTML();
  h += buildTalentCategoryTabs();
  h += buildTalentBranchHTML(activeTalentCategory);
  return h;
}

window.buildTalentsHTML = buildTalentsHTML;
window.setTalentCategory = setTalentCategory;
