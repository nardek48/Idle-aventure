"use strict";
/* ============================================================
Aethervale — ui/construction-view.js
v3.37 : modale du bâtiment de Construction (#construction-modal-root,
voir index.html) — même principe que #village-modal-root
(ui/village-view.js) : la popup vit HORS du cycle renderPanel()
habituel, réécrite directement en innerHTML après un achat pour un
rafraîchissement immédiat sans fermer/rouvrir. Point d'entrée : un
bouton dédié en bas de l'écran Production (voir buildProductionHTML,
ui/production-view.js) — décision explicite (pas de 4e sous-onglet,
pas de grille de bâtiments de construction, un seul bâtiment pour
cette session).

v3.40 : liste de coût généralisée pour un NOMBRE VARIABLE de
ressources selon le palier en cours (voir CONSTRUCTION_BUILDINGS.workshop.costTiers,
data/construction.js) — avant, 3 lignes fixes (Or/Planche/Pierre) ;
maintenant une boucle sur les clés réellement présentes dans
getNextCost(id), qui varient déjà tout seules selon le palier
(3 ressources niveaux 1-5, 4 avec le Lingot niveaux 6-10). Aucun
changement de structure visuelle par ailleurs.
============================================================ */

var openConstructionId = null;

/* Métadonnées d'affichage pour une clé de coût (label + icône) — l'or
   est un cas à part (pas dans WAREHOUSE_RESOURCES), toute autre clé
   est résolue dynamiquement dans ce catalogue. Un futur palier 3 avec
   une nouvelle ressource n'a besoin d'AUCUNE modification ici tant
   que cette ressource existe dans WAREHOUSE_RESOURCES (data/hunt-quests.js). */
function getConstructionCostMeta(key) {
  if (key === "gold") {
    return { label: "Or", iconHTML: '<img class="construction-cost-icon" src="images/Icons/gold_icon.png" alt="">' };
  }
  var def = WAREHOUSE_RESOURCES[key];
  if (!def) return { label: key, iconHTML: "" };
  return { label: def.name, iconHTML: renderIconOrEmojiHTML(def.icon, "construction-cost-icon", def.name) };
}

/* Une ligne de coût pour UNE ressource du prix du prochain niveau,
   avec indicateur ✅/❌ selon l'affordability. */
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
    // v3.40 : boucle générique sur les clés RÉELLES du coût — "gold"
    // toujours affiché en premier (cohérent avec l'ordre historique
    // Or/Planche/Pierre), puis le reste dans l'ordre naturel des clés
    // de l'objet renvoyé par costPerLevel() (qui suit lui-même l'ordre
    // de tier.resources dans data/construction.js).
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

/* Rachète puis réécrit immédiatement la modale (même principe que
   buyVillageUpgradeFromPopup, ui/village-view.js) — sans ça, niveau/
   coût/bonus affichés resteraient figés jusqu'à fermeture/réouverture. */
function buyConstructionFromModal(id) {
  ConstructionManager.buy(id);
  if (openConstructionId === id) openConstructionModal(id);
}
window.buyConstructionFromModal = buyConstructionFromModal;
