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
  return Number(game.talents && game.talents[id] || 0) > 0;
}

/* v3.28 : niveau actuel d'un talent (0 à node.maxLevel) — remplace le
   simple booléen d'avant cette refonte. */
function getTalentLevel(id) {
  return Number(game.talents && game.talents[id] || 0);
}

function hasTalentRequirement(node) {
  return !node.requires || getTalentLevel(node.requires) > 0;
}

/* v3.28 : un nœud à palier (tier/side non null) est-il verrouillé
   parce qu'un point a déjà été investi dans le nœud OPPOSÉ du MÊME
   palier de la même branche ? Voir buyTalentNode(),
   systems/progression-system.js, pour la même règle côté achat. */
function isTierLockedByOpposite(node, nodes) {
  if (!node.tier || !node.side) return false;
  var oppositeSide = node.side === "left" ? "right" : "left";
  return nodes.some(function (entry) {
    return entry.tier === node.tier && entry.side === oppositeSide && getTalentLevel(entry.id) > 0;
  });
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

/* v3.28 : reflète maintenant le NIVEAU (0-3) plutôt qu'un simple
   acheté/pas acheté, ET l'exclusivité par palier (voir
   isTierLockedByOpposite ci-dessus). */
/* v3.29.6 : texte du bonus TOTAL au niveau actuel — les taux ci-dessous
   sont revérifiés contre le code réel de chaque système consommateur
   (pas seulement recopiés depuis node.perLevel), suite à l'audit qui a
   aussi corrigé les bugs t_sharpened_blades/t_bloodlust (doublons) et
   t_interest/t_boss_slayer (désync texte/code) — voir CHANGELOG. */
var TALENT_CURRENT_VALUE_OVERRIDES = {
  t_auto_tap: function (level) {
    var vals = { 1: "2s", 2: "1.5s", 3: "1s" };
    return "Auto-tap actuel : toutes les " + vals[level];
  },
  t_interest: function (level) {
    return "Gain d'or passif actuel : ×" + level + " le taux de base";
  },
  t_bloodlust: function (node, level) {
    var rate = Math.round(node.perLevel * 100 * level);
    var cap = Math.round(node.perLevelCap * 100 * level);
    return "Taux actuel : " + rate + "%/ascension (plafond " + cap + "%)";
  },
  t_thick_skin: function (node, level) {
    return "Bonus actuel : +" + ((node.perLevel * level) / 1000) + "s";
  },
  t_treasure_hunter: function (node, level) {
    return "Bonus actuel : +" + (node.perLevel * level);
  },
  t_rich_ritual: function (node, level) {
    return "Bonus actuel : +" + (node.perLevel * level);
  }
};

function buildTalentCurrentValueText(node, level) {
  if (level <= 0 || node.perLevel === undefined) return "";

  var override = TALENT_CURRENT_VALUE_OVERRIDES[node.id];
  if (override) return override.length === 1 ? override(level) : override(node, level);
  if (node.perLevel >= 1) {
    // Déjà en points de %/unité entière (ex: merchant_instinct 5 -> +5%/niveau)
    return "Bonus actuel : +" + (node.perLevel * level) + "%";
  }
  // Fraction (0.05 = 5%) -> pourcentage
  return "Bonus actuel : +" + Math.round(node.perLevel * 100 * level) + "%";
}

function buildTalentCurrentValueHTML(node, level) {
  var text = buildTalentCurrentValueText(node, level);
  return text ? '<div class="talent-tier-current">' + esc(text) + '</div>' : "";
}

function buildTalentStatusHTML(node, nodes) {
  var level = getTalentLevel(node.id);
  var maxLevel = node.maxLevel || 1;
  var tierLocked = isTierLockedByOpposite(node, nodes);

  if (level >= maxLevel) {
    return '<span class="talent-tier-status status-unlocked">✔ Niveau max (' + maxLevel + '/' + maxLevel + ')</span>';
  }
  if (tierLocked) {
    var sideLabel = node.side === "left" ? "Passif" : "Actif";
    return '<span class="talent-tier-status status-locked">🔒 Palier engagé côté ' + sideLabel + ' — réinitialise pour changer</span>';
  }
  if (node.requires && getTalentLevel(node.requires) === 0) {
    var reqNode = findTalentNodeInBranch(nodes, node.requires);
    return '<span class="talent-tier-status status-locked">🔒 Nécessite ' + esc(reqNode ? reqNode.name : "un talent précédent") + '</span>';
  }
  if ((game.talentPoints || 0) < 1) {
    return '<span class="talent-tier-status status-locked">🔒 Pas assez de points</span>';
  }
  var label = level > 0 ? ("Niveau " + level + "/" + maxLevel + " · Améliorer · 1 pt") : "Disponible · 1 pt";
  return '<span class="talent-tier-status status-available">' + label + '</span>';
}

/* v3.28 : petites pastilles pleines/vides représentant le niveau
   actuel (● ● ○ pour niveau 2/3), affichées sous le nom du talent. */
function buildTalentLevelPipsHTML(node) {
  var level = getTalentLevel(node.id);
  var maxLevel = node.maxLevel || 1;
  var h = '<div class="talent-tier-pips">';
  for (var i = 1; i <= maxLevel; i++) {
    h += '<span class="talent-pip' + (i <= level ? ' is-filled' : '') + '"></span>';
  }
  h += '</div>';
  return h;
}

/* v3.28 : petite étiquette Actif (gauche)/Passif (droite) — le thème
   demandé pour les 2 colonnes de chaque palier. Rien pour le nœud
   "top" (partagé, ni gauche ni droite). */
function buildTalentSideTagHTML(node) {
  if (!node.side) return "";
  var isLeft = node.side === "left";
  return '<span class="talent-side-tag ' + (isLeft ? "side-active" : "side-passive") + '">' + (isLeft ? "⚔ Actif" : "🧘 Passif") + '</span>';
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
      var level = getTalentLevel(node.id);
      var maxLevel = node.maxLevel || 1;
      var owned = level > 0;
      var atMax = level >= maxLevel;
      var tierLocked = isTierLockedByOpposite(node, nodes);
      var canBuy = !atMax && !tierLocked && hasTalentRequirement(node) && (game.talentPoints || 0) >= 1;
      var classes = ["talent-tier-card"];

      if (atMax) classes.push("unlocked");
      else if (owned) classes.push("in-progress");
      else if (canBuy) classes.push("available");
      else classes.push("locked");
      if (tierLocked && !owned) classes.push("tier-locked");
      if (node.capstone) classes.push("capstone");
      if (node.side) classes.push("side-" + node.side);

      var tooltipText = node.desc || node.effect || "";

      h += '<button class="' + classes.join(" ") + '" type="button" title="' + esc(tooltipText) + '" onclick="buyTalentNode(\'' + esc(node.id) + '\')">';
      h += buildTalentSideTagHTML(node);
      h += '<div class="talent-tier-icon">' + renderTalentIconHTML(node) + '</div>';
      h += '<div class="talent-tier-name">' + esc(node.name) + '</div>';
      h += buildTalentLevelPipsHTML(node);
      h += '<div class="talent-tier-effect">' + esc(node.effect || "") + '</div>';
      h += buildTalentCurrentValueHTML(node, level);
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
      var level = getTalentLevel(n.id);
      var maxLevel = n.maxLevel || 1;
      var currentValueText = buildTalentCurrentValueText(n, level);
      h += '<div class="talent-summary-item">' +
           '<span class="talent-summary-icon">' + renderTalentIconHTML(n) + '</span>' +
           '<span>' + esc(n.name) + ' (niv. ' + level + '/' + maxLevel + ') — ' + esc(n.effect || "") +
           (currentValueText ? ' <em>(' + esc(currentValueText) + ')</em>' : '') +
           '</span>' +
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
