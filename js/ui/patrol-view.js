"use strict";
/* ui/patrol-view.js — v3.334.0 (Évolutions, lot P-1) : patrouilles, côté écran.
   Deux endroits (P9) : la fiche du compagnon (Héros › Compagnons) et la rubrique
   « Patrouilles » de l'écran de retour. Règles : systems/patrol-system.js. */

var patrolUi = {};       // choix en cours par compagnon : { sectorId, hours }
var patrolLastResult = {}; // dernier butin pris, affiché sur la fiche jusqu'au prochain départ

function patrolResName(k) { var d = (window.WAREHOUSE_RESOURCES || {})[k]; return d ? d.name : k; }

function buildPatrolLootHTML(loot, gold, done) {
  var h = '<div class="ret-gains">';
  Object.keys(loot || {}).forEach(function (k) {
    var d = (window.WAREHOUSE_RESOURCES || {})[k] || {};
    h += '<span class="ret-gain' + (done ? ' is-done' : '') + '">' + renderIconOrEmojiHTML(d.icon || "images/Icons/system/warehouse_supplies.png", "ret-gain-ico", patrolResName(k))
      + (done ? '+' : '≈ ') + formatNumber(loot[k]) + ' ' + esc(patrolResName(k)) + '</span>';
  });
  if (gold) h += '<span class="ret-gain' + (done ? ' is-done' : '') + '">' + renderIconOrEmojiHTML("images/Icons/gold_icon.png", "ret-gain-ico", "Or") + (done ? '+' : '≈ ') + formatNumber(gold) + ' or</span>';
  return h + '</div>';
}

function buildPatrolLostHTML(lost) {
  var k = Object.keys(lost || {});
  if (!k.length) return "";
  return '<div class="ret-warn">Entrepôt plein : ' + k.map(function (x) { return formatNumber(lost[x]) + ' ' + esc(patrolResName(x)); }).join(", ") + ' perdu' + (k.length > 1 || lost[k[0]] > 1 ? 's' : '') + '.</div>';
}

/* ---------- Fiche du compagnon ---------- */

function buildCompanionPatrolHTML(companionId) {
  var PM = window.PatrolManager;
  if (!PM || !PM.isUnlocked()) return "";
  var p = PM.get(companionId);
  var h = '<div class="pt-box"><div class="pt-title"><img src="images/Icons/quests/mission_exploration.png" alt=""> Patrouille</div>';

  if (p) {
    var sec = PM.getSectorDef(p.mapId, p.sectorId);
    var sName = sec ? sec.name : p.sectorId;
    if (Date.now() >= p.endsAt) {
      h += '<div class="pt-line">Rentré' + (PATROL_COMPANION_FEMININE[companionId] ? 'e' : '') + ' de <b>' + esc(sName) + '</b>.</div>';
      h += '<button type="button" class="kbtn pt-go" onclick="patrolCollect(\'' + companionId + '\')">Prendre le butin</button>';
    } else {
      var left = window.ResumeManager ? ResumeManager.formatAbsence(p.endsAt - Date.now()) : "";
      h += '<div class="pt-line">En route : <b>' + esc(sName) + '</b> · retour dans ' + esc(left) + '.</div>';
      h += '<div class="pt-hint">Absent des combats jusqu\u2019à son retour.</div>';
      h += '<button type="button" class="kbtn pt-recall" onclick="patrolRecall(\'' + companionId + '\')">Rappeler (butin au prorata)</button>';
    }
    return h + '</div>';
  }

  var last = patrolLastResult[companionId];
  if (last) {
    h += buildPatrolLootHTML(last.loot, last.gold, true) + buildPatrolLostHTML(last.lost);
    if (last.story) h += '<div class="ret-story">« ' + esc(last.story) + ' »</div>';
  }

  var dests = PM.getDestinations();
  if (!dests.length) {
    h += '<div class="pt-hint">Libère un secteur de la carte pour l\u2019envoyer en patrouille.</div>';
    return h + '</div>';
  }
  var ui = patrolUi[companionId] || {};
  if (!ui.sectorId || !dests.some(function (d) { return d.sectorId === ui.sectorId; })) ui.sectorId = dests[0].sectorId;
  if (PATROL_DURATIONS_H.indexOf(ui.hours) === -1) ui.hours = 8;
  patrolUi[companionId] = ui;

  h += '<select class="pt-select" onchange="patrolPick(\'' + companionId + '\', \'sectorId\', this.value)">';
  dests.forEach(function (d) {
    h += '<option value="' + esc(d.sectorId) + '"' + (d.sectorId === ui.sectorId ? ' selected' : '') + '>'
      + esc(d.name + ' — ' + patrolResName(d.main) + ', ' + patrolResName(d.second)) + '</option>';
  });
  h += '</select>';
  h += '<div class="kseg pt-seg">';
  PATROL_DURATIONS_H.forEach(function (hrs) {
    h += '<button type="button" class="' + (ui.hours === hrs ? 'is-on' : '') + '" onclick="patrolPick(\'' + companionId + '\', \'hours\', ' + hrs + ')">' + hrs + ' h</button>';
  });
  h += '</div>';
  var mapId = PM.currentMapId();
  var est = PM.estimate(companionId, mapId, ui.sectorId, ui.hours);
  h += buildPatrolLootHTML(est.loot, est.gold, false);
  h += '<div class="pt-hint">Absent des combats pendant la patrouille. Aucun risque : il revient toujours.</div>';
  var why = PM.canStart(companionId);
  h += '<button type="button" class="kbtn pt-go' + (why ? ' is-disabled' : '') + '"' + (why ? ' disabled title="' + esc(why) + '"' : '')
    + ' onclick="patrolStart(\'' + companionId + '\')">Envoyer</button>';
  if (why) h += '<div class="pt-hint">' + esc(why) + '</div>';
  return h + '</div>';
}

function patrolPick(companionId, key, value) {
  var ui = patrolUi[companionId] || (patrolUi[companionId] = {});
  ui[key] = key === "hours" ? Number(value) : value;
  if (typeof renderPanel === "function") renderPanel();
}

function patrolStart(companionId) {
  var ui = patrolUi[companionId] || {};
  delete patrolLastResult[companionId];
  if (window.PatrolManager) PatrolManager.start(companionId, ui.sectorId, ui.hours || 8);
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

/* Fil rouge « patrouille rentrée » : l'écran Compagnons. */
function openPatrolScreen() {
  if (typeof switchTab === "function") switchTab("more");
  if (typeof setHerosSubTab === "function") setHerosSubTab("companions");
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
    body += '<div class="pt-ret-row"><b>' + esc(r.companionName) + '</b> est rentré' + (r.feminine ? 'e' : '') + ' de ' + esc(r.sectorName) + '.</div>';
  });
  if (back.length) body += '<button type="button" class="ret-link" onclick="returnCollectPatrols()">Prendre le butin</button>';

  ids.forEach(function (id) {
    var res = results[id];
    var def = window.getCompanionDef ? getCompanionDef(id) : null;
    var sec = PatrolManager.getSectorDef(res.mapId, res.sectorId);
    body += '<div class="pt-ret-row"><b>' + esc(def ? def.name : id) + '</b> · ' + esc(sec ? sec.name : "") + '</div>';
    body += buildPatrolLootHTML(res.loot, res.gold, true) + buildPatrolLostHTML(res.lost);
    if (res.story) {
      if (st.storyOpen && st.storyOpen[id]) body += '<div class="ret-story">« ' + esc(res.story) + ' »</div>';
      else body += '<button type="button" class="ret-link" onclick="returnOpenPatrolStory(\'' + id + '\')">Lire son récit</button> ';
    }
    if (!PatrolManager.isOnPatrol(id) && !res.relaunched) {
      body += '<button type="button" class="ret-link" onclick="returnRelaunchPatrol(\'' + id + '\')">Repartir (même route, ' + res.hours + ' h)</button>';
    } else if (res.relaunched) {
      body += '<div class="ret-done">✓ Reparti' + (PATROL_COMPANION_FEMININE[id] ? 'e' : '') + '.</div>';
    }
  });
  return buildReturnSectionHTML("images/Icons/quests/mission_exploration.png", "Patrouilles", body);
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

/* Même route, même durée — si le secteur est encore libéré dans le monde courant. */
function returnRelaunchPatrol(id) {
  var st = (typeof getReturnScreenState === "function") ? getReturnScreenState() : null;
  var res = st && st.patrolResults && st.patrolResults[id];
  if (!res || !window.PatrolManager) return;
  if (PatrolManager.start(id, res.sectorId, res.hours)) res.relaunched = true;
  if (typeof renderReturnScreen === "function") renderReturnScreen();
}

window.buildCompanionPatrolHTML = buildCompanionPatrolHTML;
window.patrolPick = patrolPick;
window.patrolStart = patrolStart;
window.patrolCollect = patrolCollect;
window.patrolRecall = patrolRecall;
window.openPatrolScreen = openPatrolScreen;
window.buildReturnPatrolsHTML = buildReturnPatrolsHTML;
window.returnCollectPatrols = returnCollectPatrols;
window.returnOpenPatrolStory = returnOpenPatrolStory;
window.returnRelaunchPatrol = returnRelaunchPatrol;
