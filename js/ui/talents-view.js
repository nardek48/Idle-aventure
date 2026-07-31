"use strict";

/* ============================================================
   Builder panneau talents
============================================================ */

var activeTalentCategory = "combat";

var TALENT_SLOT_POSITIONS_DESKTOP = {
  top:         { top: "32%", left: "50%" },
  upper_left:  { top: "37.5%", left: "37%" },
  upper_right: { top: "37.5%", left: "63%" },
  mid_left:    { top: "46%", left: "31%" },
  mid_right:   { top: "46%", left: "68%" },
  inner_left:  { top: "60%", left: "31%" },
  inner_right: { top: "60%", left: "68%" },
  lower_left:  { top: "53%", left: "39%" },
  lower_right: { top: "53%", left: "61%" },
  bottom:      { top: "70%", left: "52%" }
};

var TALENT_SLOT_POSITIONS_MOBILE = {
  top:         { top: "180px", left: "285px" },
  upper_left:  { top: "210px", left: "220px" },
  upper_right: { top: "210px", left: "350px" },
  mid_left:    { top: "255px", left: "195px" },
  mid_right:   { top: "255px", left: "380px" },
  inner_left:  { top: "335px", left: "198px" },
  inner_right: { top: "335px", left: "380px" },
  lower_left:  { top: "295px", left: "230px" },
  lower_right: { top: "295px", left: "340px" },
  bottom:      { top: "310px", left: "160px" }
};

function getTalentSlotPositions() {
  return window.innerWidth <= 760
    ? TALENT_SLOT_POSITIONS_MOBILE
    : TALENT_SLOT_POSITIONS_DESKTOP;
}

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

function buildTalentBranchHTML(branchKey) {
  var tree = getTalentTree();
  var nodes = tree[branchKey] || [];
  var h = '<div class="talent-board">';
  h += '<div class="talent-board-bg">';
  h += '<img class="talent-board-image" src="images/Worlds/talent_mobile.png" alt="">';
  h += '<div class="talent-board-grid">';

  nodes.forEach(function (node) {
    var owned = isTalentOwned(node.id);
    var canBuy = !owned && hasTalentRequirement(node) && (game.talentPoints || 0) >= 1;
    var classes = ["talent-node"];

    if (owned) classes.push("unlocked");
    else if (canBuy) classes.push("available");
    else classes.push("locked");

    if (node.capstone) classes.push("branch-capstone");

    var tooltipText = node.desc || node.effect || "Effet non renseigné";
    var safeTooltip = esc(tooltipText);
    var costText = owned ? "✔" : "1 pt";
    var positions = getTalentSlotPositions();
    var pos = positions[node.slot] || { top: "50%", left: "50%" };

    h += '<button class="' + classes.join(" ") + '" type="button" ' +
         'style="top:' + pos.top + ';left:' + pos.left + ';" ' +
         'data-tooltip="' + safeTooltip + '" title="' + safeTooltip + '" ' +
         'onclick="buyTalentNode(\'' + esc(node.id) + '\')">';

    h += '<div class="talent-icon">' + esc(node.icon || "✨") + '</div>';
    h += '<div class="talent-name">' + esc(node.name) + '</div>';
    h += '<div class="talent-cost">' + costText + '</div>';
    h += '</button>';
  });

  h += '</div></div></div>';
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
           '<span class="talent-summary-icon">' + esc(n.icon || "✨") + '</span>' +
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
  h += '<div class="talent-center-wrap">';
  h += buildTalentBranchHTML(activeTalentCategory);
  h += '</div>';
  return h;
}

window.buildTalentsHTML = buildTalentsHTML;
window.setTalentCategory = setTalentCategory;