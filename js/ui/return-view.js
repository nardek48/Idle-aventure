"use strict";
/* ui/return-view.js — v3.332.0 (Évolutions, lot R-1) : l'écran de retour.
   Maquette validée : atelier-evolutions.html (E-0). Données : systems/return-system.js.

   Rubriques (R2), masquées si vides : Village, Ateliers et chantier, Taverne, Héros,
   Patrouilles. Gestes (R3) : « Tout récolter » ne dépense rien ; « Livrer » affiche ce
   qu'il coûte. Pied d'écran : la proposition du fil rouge. */

var returnScreenState = null; // { summary, harvested, delivered, line }

function returnResName(key) {
  var def = (window.WAREHOUSE_RESOURCES || {})[key];
  return def ? def.name : key;
}

function returnResIcon(key) {
  var def = (window.WAREHOUSE_RESOURCES || {})[key];
  return def && def.icon ? def.icon : "images/Icons/system/warehouse_supplies.png";
}

function buildReturnGainHTML(key, amount, done) {
  return '<span class="ret-gain' + (done ? ' is-done' : '') + '">' + renderIconOrEmojiHTML(returnResIcon(key), "ret-gain-ico", returnResName(key))
    + '+' + formatNumber(amount) + ' ' + esc(returnResName(key)) + '</span>';
}

function buildReturnSectionHTML(icon, title, body) {
  return '<div class="ret-sec"><div class="ret-sec-h"><img src="' + icon + '" alt="">' + esc(title) + '</div><div class="ret-sec-b">' + body + '</div></div>';
}

/* Contrats livrables maintenant, avec coût et paie. */
function getReturnDeliverables() {
  if (!window.TavernManager || TavernManager.getLevel() <= 0) return [];
  return TavernManager.getContracts().filter(function (c) { return !c.done && TavernManager.canDeliver(c.id); });
}

/* Stock encore dans les zones (après une récolte : ce que l'Entrepôt plein a laissé). */
function getReturnStockLeft() {
  if (!window.OfflineManager || typeof OfflineManager._collectPlotTotals !== "function") return {};
  var t = OfflineManager._collectPlotTotals(), out = {};
  Object.keys(t).forEach(function (k) {
    if (t[k] > 0 && window.WarehouseManager && typeof WarehouseManager.getFreeSpace === "function" && WarehouseManager.getFreeSpace(k) <= 0) out[k] = t[k];
  });
  return out;
}

function buildReturnScreenHTML() {
  var st = returnScreenState;
  var s = st.summary;
  var h = '<div class="ret-card" role="dialog" aria-label="Pendant ton absence">';
  h += '<div class="ret-top"><img src="images/Icons/system/offline_progress.png" alt="">'
    + '<div class="ret-title">Pendant ton absence</div>'
    + '<div class="ret-time">Tu es parti ' + esc(window.ResumeManager ? ResumeManager.formatAbsence(s.ms || 0) : "") + '.</div></div>';
  if (st.line) h += '<div class="ret-line">' + esc(st.line) + '</div>';

  // Village (production des zones)
  var produced = Object.keys(s.produced || {});
  if (produced.length) {
    var vb = '<div class="ret-gains">' + produced.map(function (k) { return buildReturnGainHTML(k, s.produced[k], st.harvested); }).join("") + '</div>';
    if (!st.harvested && s.fullPlots > 0) {
      vb += '<div class="ret-warn">' + s.fullPlots + ' zone' + (s.fullPlots > 1 ? 's pleines' : ' pleine') + ' sur ' + s.openPlots + ' — elle' + (s.fullPlots > 1 ? 's ne produisent' : ' ne produit') + ' plus.</div>';
    }
    if (st.harvested) {
      var left = getReturnStockLeft();
      var lk = Object.keys(left);
      if (lk.length) vb += '<div class="ret-warn">Entrepôt plein : ' + lk.map(function (k) { return formatNumber(left[k]) + ' ' + esc(returnResName(k)); }).join(", ") + ' reste' + (lk.length > 1 || left[lk[0]] > 1 ? 'nt' : '') + ' dans les zones.</div>';
    }
    h += buildReturnSectionHTML("images/Icons/menu_icons/village_menu.png", "Village" + (st.harvested ? " · récolté" : " · à récolter"), vb);
  }

  // Ateliers et chantier
  var crafted = Object.keys(s.crafted || {});
  if (crafted.length || s.siteDone) {
    var ab = "";
    if (crafted.length) ab += '<div class="ret-gains">' + crafted.map(function (k) { return buildReturnGainHTML(k, s.crafted[k], true); }).join("") + '</div>';
    if (s.siteDone) ab += 'Chantier terminé : <b>' + esc(s.siteDone.name) + ' niveau ' + s.siteDone.level + '</b>.';
    h += buildReturnSectionHTML("images/Icons/construction_icon.png", "Ateliers et chantier", ab);
  }

  // Taverne
  var ready = getReturnDeliverables();
  if (s.tavernNew || ready.length || st.delivered) {
    var tb;
    if (st.delivered) tb = 'Contrats livrés : <b>+' + formatNumber(st.delivered) + ' or</b>.';
    else tb = (s.tavernNew ? 'Nouveaux contrats. ' : '') + (ready.length ? '<b>' + ready.length + ' livrable' + (ready.length > 1 ? 's' : '') + ' maintenant.</b>' : 'Rien de livrable pour l\u2019instant.');
    h += buildReturnSectionHTML("images/Icons/village_buildings/tavern.png", "Taverne", tb);
  }

  // Héros
  if (s.hpGain > 0) {
    h += buildReturnSectionHTML("images/Icons/camp/campfire.png", "Héros",
      '+' + formatNumber(s.hpGain) + ' PV au coin du feu (' + formatNumber(Math.floor(game.heroHp || 0)) + ' / ' + formatNumber(game.heroMaxHp || 0) + ').');
  }

  // Patrouilles (lot P-1)
  if (typeof buildReturnPatrolsHTML === "function") h += buildReturnPatrolsHTML();

  // Gestes (R3)
  h += '<div class="ret-acts">';
  if (produced.length) {
    if (!st.harvested) h += '<button type="button" class="settings-btn primary" onclick="returnHarvestAll()">Tout récolter</button>';
    else h += '<div class="ret-done">✓ Récolte faite.</div>';
  }
  if (ready.length && !st.delivered) {
    var cost = ready.map(function (c) { return '−' + formatNumber(c.quantity) + ' ' + returnResName(c.resourceId); }).join(", ");
    var pay = ready.reduce(function (sum, c) { return sum + TavernManager.getPayout(c); }, 0);
    h += '<button type="button" class="settings-btn" onclick="returnDeliverAll()"><span class="ret-btn-col"><span>Livrer '
      + ready.length + ' contrat' + (ready.length > 1 ? 's' : '') + ' · +' + formatNumber(pay) + ' or</span><small>' + esc(cost) + '</small></span></button>';
  } else if (st.delivered) {
    h += '<div class="ret-done">✓ Contrats livrés.</div>';
  }
  h += '</div>';

  // Fil rouge en pied d'écran
  if (window.FilRouge) {
    var a = FilRouge.next();
    h += '<div class="ret-next"><img src="' + a.icon + '" alt=""><div class="ret-next-t"><small>Ensuite</small><b>' + esc(a.title) + '</b></div>'
      + '<button type="button" onclick="returnGoFilRouge()">' + esc(a.goLabel) + '</button></div>';
  }
  h += '<button type="button" class="ret-close" onclick="closeReturnScreen()">Continuer</button>';
  h += '</div>';
  return h;
}

function getReturnRoot() {
  var root = document.getElementById("return-modal-root");
  if (!root && document.body && typeof document.createElement === "function") {
    root = document.createElement("div");
    root.id = "return-modal-root";
    document.body.appendChild(root);
  }
  return root;
}

function renderReturnScreen() {
  var root = getReturnRoot();
  if (!root || !returnScreenState) return;
  root.innerHTML = '<div class="ret-bg">' + buildReturnScreenHTML() + '</div>';
}

function openReturnScreen(summary) {
  returnScreenState = { summary: summary, harvested: false, delivered: 0, line: window.ReturnManager ? ReturnManager.pickLine() : "" };
  renderReturnScreen();
}

function closeReturnScreen() {
  returnScreenState = null;
  var root = document.getElementById("return-modal-root");
  if (root) root.innerHTML = "";
  if (window.FilRouge) FilRouge.invalidate();
}

/* R3 : geste gratuit — la récolte habituelle (plafond de l'Entrepôt compris). */
function returnHarvestAll() {
  if (!returnScreenState) return;
  if (window.ProductionManager && typeof ProductionManager.harvestAll === "function") ProductionManager.harvestAll();
  returnScreenState.harvested = true;
  renderReturnScreen();
}

/* R3 : geste qui dépense — le coût était affiché sur le bouton. */
function returnDeliverAll() {
  if (!returnScreenState || !window.TavernManager) return;
  var total = 0;
  getReturnDeliverables().forEach(function (c) {
    var pay = TavernManager.getPayout(c);
    if (TavernManager.deliver(c.id)) total += pay;
  });
  returnScreenState.delivered = total;
  renderReturnScreen();
}

function returnGoFilRouge() {
  var a = window.FilRouge ? FilRouge.next() : null;
  closeReturnScreen();
  if (a && typeof a.go === "function") a.go();
}

/* Pastille « Retour » quand le héros est engagé (R1). */
function renderReturnPending(on) {
  var id = "return-pending-pill";
  var el = document.getElementById(id);
  if (!on) { if (el && el.parentNode) el.parentNode.removeChild(el); return; }
  if (!el && document.body && typeof document.createElement === "function") {
    el = document.createElement("button");
    el.id = id;
    el.type = "button";
    el.className = "ret-pending";
    el.setAttribute("onclick", "returnPendingTap()");
    el.innerHTML = '<img src="images/Icons/system/offline_progress.png" alt="">Retour · après le combat';
    document.body.appendChild(el);
  }
}

function returnPendingTap() {
  if (window.ReturnManager && !ReturnManager.flushPending() && typeof showToast === "function") {
    showToast("Termine d'abord ce que tu as commencé", 1400);
  }
}

// Le retour en attente s'ouvre dès que le héros est libre (une vérification par seconde).
if (typeof setInterval === "function") {
  setInterval(function () { if (window.ReturnManager && ReturnManager.hasPending()) ReturnManager.flushPending(); }, 1000);
}

window.openReturnScreen = openReturnScreen;
window.closeReturnScreen = closeReturnScreen;
window.renderReturnScreen = renderReturnScreen;
window.returnHarvestAll = returnHarvestAll;
window.returnDeliverAll = returnDeliverAll;
window.returnGoFilRouge = returnGoFilRouge;
window.renderReturnPending = renderReturnPending;
window.returnPendingTap = returnPendingTap;
window.buildReturnScreenHTML = buildReturnScreenHTML;
window.getReturnScreenState = function () { return returnScreenState; };
