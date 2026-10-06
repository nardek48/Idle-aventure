"use strict";
/* ui/patrol-view.js — v3.334.0 (Évolutions, lot P-1) : patrouilles, côté écran.
   v3.426.0 (chantier Expéditions) : la patrouille se lance depuis Campement › Expéditions
   (feuille « Patrouille », ui/expeditions-view.js : durée, monde, une carte par lieu avec ce
   qu'il rapporte). Ici : l'état d'une patrouille partie (en route / rentrée), le renvoi de la
   fiche du compagnon, et la rubrique « Patrouilles » de l'écran de retour.
   Règles : systems/patrol-system.js. */

var patrolUi = {};       // choix en cours par compagnon : { mapId, sectorId, hours } (ui/expeditions-view.js)
var patrolLastResult = {}; // dernier butin pris, affiché sur la fiche jusqu'au prochain départ

function patrolResName(k) { var d = (window.WAREHOUSE_RESOURCES || {})[k]; return d ? _td(d.name) : k; }

function buildPatrolLootHTML(loot, gold, done) {
  var h = '<div class="ret-gains">';
  Object.keys(loot || {}).forEach(function (k) {
    var d = (window.WAREHOUSE_RESOURCES || {})[k] || {};
    h += '<span class="ret-gain' + (done ? ' is-done' : '') + '">' + renderIconOrEmojiHTML(d.icon || "images/Icons/system/warehouse_supplies.png", "ret-gain-ico", patrolResName(k))
      + (done ? '+' : '≈ ') + formatNumber(loot[k]) + ' ' + esc(patrolResName(k)) + '</span>';
  });
  if (gold) h += '<span class="ret-gain' + (done ? ' is-done' : '') + '">' + renderIconOrEmojiHTML("images/Icons/gold_icon.png", "ret-gain-ico", _t("Or")) + (done ? '+' : '≈ ') + _t("{n} or", { n: formatNumber(gold) }) + '</span>';
  return h + '</div>';
}

function buildPatrolLostHTML(lost) {
  var k = Object.keys(lost || {});
  if (!k.length) return "";
  var liste = k.map(function (x) { return formatNumber(lost[x]) + ' ' + esc(patrolResName(x)); }).join(", ");
  return '<div class="ret-warn">' + ((k.length > 1 || lost[k[0]] > 1) ? _t("Entrepôt plein : {liste} perdus.", { liste: liste }) : _t("Entrepôt plein : {liste} perdu.", { liste: liste })) + '</div>';
}

/* ---------- Patrouille partie : en route ou rentrée (feuille « Patrouille ») ---------- */

/* "" quand le compagnon est au camp : le formulaire de départ est dans ui/expeditions-view.js. */
function buildPatrolProgressHTML(companionId) {
  var PM = window.PatrolManager;
  if (!PM) return "";
  var p = PM.get(companionId);
  if (!p) return "";
  var sec = PM.getSectorDef(p.mapId, p.sectorId);
  var sName = sec ? _td(sec.name) : p.sectorId;
  var h = '<div class="pt-box">';
  if (Date.now() >= p.endsAt) {
    h += '<div class="pt-line">' + (PATROL_COMPANION_FEMININE[companionId] ? _t("Rentrée de <b>{x}</b>.", { x: esc(sName) }) : _t("Rentré de <b>{x}</b>.", { x: esc(sName) })) + '</div>';
    h += '<button type="button" class="kbtn pt-go" onclick="patrolCollect(\'' + companionId + '\')">' + _t("Prendre le butin") + '</button>';
  } else {
    var left = window.ResumeManager ? ResumeManager.formatAbsence(p.endsAt - Date.now()) : "";
    h += '<div class="pt-line">' + _t("En route : <b>{x}</b> · retour dans {d}.", { x: esc(sName), d: esc(left) }) + '</div>';
    h += '<div class="pt-hint">' + _t("Absent des combats jusqu’à son retour.") + '</div>';
    h += '<button type="button" class="kbtn pt-recall" onclick="patrolRecall(\'' + companionId + '\')">' + _t("Rappeler (butin au prorata)") + '</button>';
  }
  return h + '</div>';
}

/* Dernier butin pris, en tête de la feuille jusqu'au prochain départ. */
function buildPatrolLastResultHTML(companionId) {
  var last = patrolLastResult[companionId];
  if (!last) return "";
  var h = '<div class="exp-last"><small>' + _t("Dernier retour") + '</small>' + buildPatrolLootHTML(last.loot, last.gold, true) + buildPatrolLostHTML(last.lost);
  if (last.story) h += '<div class="ret-story">« ' + esc(_td(last.story)) + ' »</div>';
  return h + '</div>';
}

/* ---------- Fiche du compagnon : un renvoi vers les Expéditions (v3.426.0) ---------- */

function buildCompanionPatrolHTML(companionId) {
  var PM = window.PatrolManager;
  if (!PM || !PM.isUnlocked()) return "";
  var p = PM.get(companionId), sub;
  if (p && Date.now() >= p.endsAt) sub = _t("Rentré · butin à prendre");
  else if (p) sub = _t("En route · retour dans {d}", { d: window.ResumeManager ? ResumeManager.formatAbsence(p.endsAt - Date.now()) : "" });
  else sub = _t("Se lance depuis Campement › Expéditions");
  return '<button type="button" class="exp-moved" onclick="closeHerosSheet();goToExpeditions(\'patrol\', \'' + companionId + '\')">'
    + '<img src="images/Icons/quests/mission_exploration.png" alt=""><span><b>' + _t("Patrouille") + '</b><small>' + esc(sub) + '</small></span><i class="exp-chev">›</i></button>';
}

/* Départ depuis la feuille « Patrouille » (choix tenus dans patrolUi par ui/expeditions-view.js). */
function patrolStart(companionId) {
  var ui = patrolUi[companionId] || {};
  if (!ui.sectorId || !window.PatrolManager) return;
  delete patrolLastResult[companionId];
  if (PatrolManager.start(companionId, ui.sectorId, ui.hours || 8) && typeof renderPanel === "function") renderPanel();
}

function patrolCollect(companionId) {
  if (!window.PatrolManager) return;
  var r = PatrolManager.collect(companionId);
  if (r) patrolLastResult[companionId] = r;
  if (typeof renderPanel === "function") renderPanel();
}

function patrolRecall(companionId) {
  if (!window.PatrolManager) return;
  var r = PatrolManager.recall(companionId);
  if (r) patrolLastResult[companionId] = r;
  if (typeof renderPanel === "function") renderPanel();
}

/* Fil rouge « patrouille rentrée ». v3.426.0 : les patrouilles vivent dans Campement › Expéditions. */
function openPatrolScreen() {
  if (typeof goToExpeditions === "function") goToExpeditions();
}

/* ---------- Écran de retour : rubrique Patrouilles ---------- */

function buildReturnPatrolsHTML() {
  if (!window.PatrolManager) return "";
  var st = (typeof getReturnScreenState === "function") ? getReturnScreenState() : null;
  var results = (st && st.patrolResults) || {};
  var back = PatrolManager.getReturned();
  var ids = Object.keys(results);
  if (!back.length && !ids.length) return "";

  var body = "";
  back.forEach(function (r) {
    body += '<div class="pt-ret-row">' + (r.feminine ? _t("<b>{x}</b> est rentrée de {y}.", { x: esc(_td(r.companionName)), y: esc(_td(r.sectorName)) }) : _t("<b>{x}</b> est rentré de {y}.", { x: esc(_td(r.companionName)), y: esc(_td(r.sectorName)) })) + '</div>';
  });
  if (back.length) body += '<button type="button" class="ret-link" onclick="returnCollectPatrols()">' + _t("Prendre le butin") + '</button>';

  ids.forEach(function (id) {
    var res = results[id];
    var def = window.getCompanionDef ? getCompanionDef(id) : null;
    var sec = PatrolManager.getSectorDef(res.mapId, res.sectorId);
    body += '<div class="pt-ret-row"><b>' + esc(def ? _td(def.name) : id) + '</b> · ' + esc(sec ? _td(sec.name) : "") + '</div>';
    body += buildPatrolLootHTML(res.loot, res.gold, true) + buildPatrolLostHTML(res.lost);
    if (res.story) {
      if (st.storyOpen && st.storyOpen[id]) body += '<div class="ret-story">« ' + esc(_td(res.story)) + ' »</div>';
      else body += '<button type="button" class="ret-link" onclick="returnOpenPatrolStory(\'' + id + '\')">' + _t("Lire son récit") + '</button> ';
    }
    if (!PatrolManager.isOnPatrol(id) && !res.relaunched) {
      body += '<button type="button" class="ret-link" onclick="returnRelaunchPatrol(\'' + id + '\')">' + _t("Repartir (même route, {h} h)", { h: res.hours }) + '</button>';
    } else if (res.relaunched) {
      body += '<div class="ret-done"><img class="ico-inline" src="images/Icons/system/check_valid.png" alt=""> ' + (PATROL_COMPANION_FEMININE[id] ? _t("Repartie.") : _t("Reparti.")) + '</div>';
    }
  });
  return buildReturnSectionHTML("images/Icons/quests/mission_exploration.png", _t("Patrouilles"), body);
}

function returnCollectPatrols() {
  var st = (typeof getReturnScreenState === "function") ? getReturnScreenState() : null;
  if (!st || !window.PatrolManager) return;
  var got = PatrolManager.collectAll();
  st.patrolResults = Object.assign(st.patrolResults || {}, got);
  if (typeof renderReturnScreen === "function") renderReturnScreen();
}

function returnOpenPatrolStory(id) {
  var st = (typeof getReturnScreenState === "function") ? getReturnScreenState() : null;
  if (!st) return;
  st.storyOpen = st.storyOpen || {};
  st.storyOpen[id] = true;
  if (typeof renderReturnScreen === "function") renderReturnScreen();
}

/* Même route, même durée — si le secteur est encore libéré (v3.426.0 : quelle que soit sa carte). */
function returnRelaunchPatrol(id) {
  var st = (typeof getReturnScreenState === "function") ? getReturnScreenState() : null;
  var res = st && st.patrolResults && st.patrolResults[id];
  if (!res || !window.PatrolManager) return;
  if (PatrolManager.start(id, res.sectorId, res.hours)) res.relaunched = true;
  if (typeof renderReturnScreen === "function") renderReturnScreen();
}

window.buildCompanionPatrolHTML = buildCompanionPatrolHTML;
window.buildPatrolProgressHTML = buildPatrolProgressHTML;
window.buildPatrolLastResultHTML = buildPatrolLastResultHTML;
window.patrolStart = patrolStart;
window.patrolCollect = patrolCollect;
window.patrolRecall = patrolRecall;
window.openPatrolScreen = openPatrolScreen;
window.buildReturnPatrolsHTML = buildReturnPatrolsHTML;
window.returnCollectPatrols = returnCollectPatrols;
window.returnOpenPatrolStory = returnOpenPatrolStory;
window.returnRelaunchPatrol = returnRelaunchPatrol;
