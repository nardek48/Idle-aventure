"use strict";
/* ui/return-view.js — v3.332.0 (Évolutions, lot R-1) : l'écran de retour.
   Maquette validée : atelier-evolutions.html (E-0). Données : systems/return-system.js.

   Rubriques (R2), masquées si vides : Récolté, Ateliers et chantier, Patrouilles, Héros ; renvoi des
   contrats. v3.782.0 (atelier retour-absence, variante C) : récolte et butin faits à l'ouverture (gestes
   gratuits, R3) ; pied : la proposition du fil rouge en bouton principal, « Plus tard ». */

var returnScreenState = null; // { summary, harvested, delivered, line }

function returnResName(key) {
  var def = (window.WAREHOUSE_RESOURCES || {})[key];
  return def ? _td(def.name) : key;
}

function returnResIcon(key) {
  var def = (window.WAREHOUSE_RESOURCES || {})[key];
  return def && def.icon ? def.icon : "images/Icons/system/warehouse_supplies.webp";
}

function buildReturnGainHTML(key, amount, done) {
  return '<span class="ret-gain' + (done ? ' is-done' : '') + '">' + renderIconOrEmojiHTML(returnResIcon(key), "ret-gain-ico", returnResName(key))
    + '+' + formatNumber(amount) + ' ' + esc(returnResName(key)) + '</span>';
}

function buildReturnSectionHTML(icon, title, body, mark) {
  return '<div class="ret-sec"><div class="ret-sec-h"><img src="' + icon + '" alt="">' + esc(title) + (mark || '') + '</div><div class="ret-sec-b">' + body + '</div></div>';
}

/* Contrats livrables maintenant (renvoi vers le tableau des missions, v3.778.0). */
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

/* PV sous lesquels la fenêtre propose une ration (même seuil que l'alerte de départ). */
var RETURN_EAT_PCT = 0.70;

/* v3.782.0 (atelier retour-absence, Seb 13/11, variante C) : récolte et butin sont faits à l'ouverture (gestes gratuits) ;
   la fenêtre n'est qu'un bilan coché. Bouton principal : la prochaine action du fil rouge ; « Plus tard » referme. */
function buildReturnScreenHTML() {
  var st = returnScreenState;
  var s = st.summary;
  var check = '<img class="ret-sec-ok" src="images/Icons/system/check_valid.webp" alt="">';
  var h = '<div class="kwin ret-card" role="dialog" aria-label="' + _t("Pendant ton absence") + '">';
  h += kWinHeadHTML({ icon: '<img src="images/Icons/system/offline_progress.webp" alt="">', title: _t("Pendant ton absence"),
    sub: esc(_t("{d} d'absence · tout est rentré.", { d: window.ResumeManager ? ResumeManager.formatAbsence(s.ms || 0) : "" })) });
  h += '<div class="kwin-body">';
  if (st.line) h += '<div class="kwin-quote ret-line">' + esc(_td(st.line)) + '</div>';
  if (st.news && st.news.length) h += '<button type="button" class="ret-news" onclick="returnOpenNews()"><img src="images/Icons/system/upgrade.webp" alt=""><span>'
    + esc(_tn(st.news.length, "{n} nouveauté depuis ta dernière visite", "{n} nouveautés depuis ta dernière visite")) + '</span><i>›</i></button>';

  // Village : déjà récolté
  var produced = Object.keys(s.produced || {});
  if (produced.length) {
    var vb = '<div class="ret-gains">' + produced.map(function (k) { return buildReturnGainHTML(k, s.produced[k], true); }).join("") + '</div>';
    var left = getReturnStockLeft(), lk = Object.keys(left);
    if (lk.length) vb += '<div class="ret-warn">' + _tn(lk.length > 1 ? 2 : left[lk[0]], "Entrepôt plein : {x} reste dans les zones.", "Entrepôt plein : {x} restent dans les zones.",
      { x: lk.map(function (k) { return formatNumber(left[k]) + ' ' + esc(returnResName(k)); }).join(", ") }) + '</div>';
    if (st.goPoints > 0) vb += '<div>' + _t("Surplus versé au Grand Ouvrage : <b>+{n} points</b>.", { n: formatNumber(st.goPoints) }) + '</div>'; // v3.688.0 (CPL1-4)
    h += buildReturnSectionHTML("images/Icons/menu_icons/village_menu.webp", _t("Récolté"), vb, check);
  }

  // Ateliers et chantier
  var crafted = Object.keys(s.crafted || {}), used = Object.keys(s.used || {}), lost = Object.keys(s.lost || {});
  var resList = function (o, keys, sign) { return keys.map(function (k) { return sign + formatNumber(o[k]) + ' ' + esc(returnResName(k)); }).join(", "); };
  if (crafted.length || s.siteDone || used.length || lost.length) {
    var ab = "";
    if (crafted.length) ab += '<div class="ret-gains">' + crafted.map(function (k) { return buildReturnGainHTML(k, s.crafted[k], true); }).join("") + '</div>';
    // v3.688.0 (CPL1-3, CPL1-1) : ce que les ateliers ont pris, et ce que l'Entrepôt plein a perdu
    if (used.length) ab += '<div>' + _t("Pris par les ateliers : {x}.", { x: resList(s.used, used, "−") }) + '</div>';
    if (lost.length) ab += '<div class="ret-warn">' + _t("Entrepôt plein, sorties perdues : {x}.", { x: resList(s.lost, lost, "") }) + '</div>';
    if (s.siteDone) ab += _t("Chantier terminé : <b>{x} niveau {n}</b>.", { x: esc(_td(s.siteDone.name)), n: s.siteDone.level });
    h += buildReturnSectionHTML("images/Icons/construction_icon.webp", _t("Ateliers et chantier"), ab, check);
  }

  // Patrouilles (lot P-1) : butin déjà pris à l'ouverture
  if (typeof buildReturnPatrolsHTML === "function") h += buildReturnPatrolsHTML();

  // Taverne : un renvoi, les contrats se livrent au tableau des missions (v3.778.0)
  var ready = getReturnDeliverables();
  if (ready.length) h += '<div class="ret-note"><img src="images/Icons/village_buildings/tavern.webp" alt=""> '
    + esc(_tn(ready.length, "{n} contrat livrable, au tableau des missions.", "{n} contrats livrables, au tableau des missions.")) + '</div>';

  // Héros : PV regagnés, et une ration proposée seulement si les PV sont bas (elle se consomme : c'est un choix)
  var CM = window.CampManager, eat = "";
  if (CM && !CM.teamFull() && !CM.rationLockReason() && Number(game.heroHp || 0) < Number(game.heroMaxHp || 1) * RETURN_EAT_PCT) {
    var opts = CM.getRationOptions().filter(function (r) { return r.amount >= 1; });
    var miss = (game.heroMaxHp || 1) - (game.heroHp || 0);
    var pick = opts.filter(function (r) { return (game.heroMaxHp || 1) * r.healPct >= miss; }).sort(function (a, b) { return a.healPct - b.healPct; })[0]
      || opts.sort(function (a, b) { return b.healPct - a.healPct; })[0];
    if (pick) eat = '<button type="button" class="ret-link ret-eat" onclick="CampManager.eatRation(\'' + esc(pick.id) + '\'); renderReturnScreen();">'
      + esc(_t("Manger : {x}", { x: _td(pick.name) })) + ' (' + esc(_t("+{n} PV", { n: formatNumber(Math.floor((game.heroMaxHp || 1) * pick.healPct)) })) + ')</button>';
  }
  if (s.hpGain > 0 || eat) {
    h += buildReturnSectionHTML("images/Icons/camp/campfire.webp", _t("Héros"),
      (s.hpGain > 0 ? _t("+{n} PV au coin du feu ({a} / {b}).", { n: formatNumber(s.hpGain), a: formatNumber(Math.floor(game.heroHp || 0)), b: formatNumber(game.heroMaxHp || 0) })
        : _t("{a} / {b} PV.", { a: formatNumber(Math.floor(game.heroHp || 0)), b: formatNumber(game.heroMaxHp || 0) })) + (eat ? '<div>' + eat + '</div>' : ''));
  }
  h += '</div>'; // kwin-body

  // Pied : la suite (fil rouge) en bouton principal, « Plus tard » referme
  var a = window.FilRouge ? FilRouge.next() : null;
  h += '<div class="kwin-foot ret-foot">';
  if (a && typeof a.go === "function") {
    var gl = _td(a.goLabel), tt = _td(a.title); // « Réclamer : X » dit déjà le geste : pas de doublon sur deux lignes
    h += '<button type="button" class="kbtn primary ret-go" onclick="returnGoFilRouge()"><span class="ret-btn-col">'
      + (tt.indexOf(gl) === 0 ? '<span>' + esc(tt) + '</span>' : '<span>' + esc(gl) + '</span><small>' + esc(tt) + '</small>') + '</span></button>'
      + '<button type="button" class="ret-link ret-close" onclick="closeReturnScreen()">' + _t("Plus tard") + '</button>';
  }
  else h += '<button type="button" class="kbtn ret-close" onclick="closeReturnScreen()">' + _t("Continuer") + '</button>';
  h += '</div></div>';
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
  root.innerHTML = '<div class="kwin-veil ret-bg">' + buildReturnScreenHTML() + '</div>';
}

function openReturnScreen(summary) {
  returnScreenState = { summary: summary, harvested: false, line: window.ReturnManager ? ReturnManager.pickLine() : "" };
  // v3.783.0 : les nouveautés non vues passent par une ligne de cette fenêtre (plus de « Quoi de neuf » à part)
  returnScreenState.news = typeof newsUnseen === "function" ? newsUnseen() : [];
  if (typeof newsSeenVersion === "function" && !newsSeenVersion()) returnScreenState.news = []; // appareil sans repère : rien à rattraper
  if (typeof newsMarkSeen === "function") newsMarkSeen();
  returnHarvestAll(true);                                                     // v3.782.0 (C) : gestes gratuits faits d'office
  if (window.PatrolManager && PatrolManager.getReturned().length && typeof returnCollectPatrols === "function") returnCollectPatrols(true);
  renderReturnScreen();
}

function closeReturnScreen() {
  returnScreenState = null;
  if (window.ReturnManager) ReturnManager.forget(); // CPL1-6 : vu, plus rien à rouvrir
  var root = document.getElementById("return-modal-root");
  if (root) root.innerHTML = "";
  if (window.FilRouge) FilRouge.invalidate();
}

/* R3 : geste gratuit — la récolte habituelle (plafond de l'Entrepôt compris). quiet : sans redessiner (ouverture). */
function returnHarvestAll(quiet) {
  if (!returnScreenState) return;
  var GO = window.GrandOuvrage, before = GO && typeof GO.getPoints === "function" ? GO.getPoints() : 0;
  if (window.ProductionManager && typeof ProductionManager.harvestAll === "function") ProductionManager.harvestAll();
  returnScreenState.goPoints = GO && typeof GO.getPoints === "function" ? Math.max(0, GO.getPoints() - before) : 0; // v3.688.0 (CPL1-4)
  returnScreenState.harvested = true;
  if (!quiet) renderReturnScreen();
}

/* La ligne « Nouveautés » : la fenêtre de retour se ferme, « Quoi de neuf » s'ouvre avec ce qui était nouveau. */
function returnOpenNews() {
  var list = returnScreenState && returnScreenState.news;
  closeReturnScreen();
  if (typeof openNewsWindow === "function") openNewsWindow(list && list.length ? list : undefined);
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
    el.innerHTML = '<img src="images/Icons/system/offline_progress.webp" alt="">' + _t("Retour · après le combat");
    document.body.appendChild(el);
  }
}

function returnPendingTap() {
  if (window.ReturnManager && !ReturnManager.flushPending() && typeof showToast === "function") {
    showToast(_t("Termine d'abord ce que tu as commencé"), 1400);
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
window.returnGoFilRouge = returnGoFilRouge;
window.returnOpenNews = returnOpenNews;
window.renderReturnPending = renderReturnPending;
window.returnPendingTap = returnPendingTap;
window.buildReturnScreenHTML = buildReturnScreenHTML;
window.getReturnScreenState = function () { return returnScreenState; };
