"use strict";
/* ui/companion-quest-view.js — v3.598.0 : les quêtes des compagnons dans Quêtes › Secondaires (téléphone et grand écran).
   Carte du tableau (qb-card) au portrait du compagnon : étapes, action de l'étape en cours, relique promise. */

function companionQuestWorldName(worldId) {
  var w = window.WORLDS ? WORLDS.filter(function (x) { return x.id === worldId; })[0] : null;
  return w ? _td(w.name) : "";
}

// Ce qu'il faut faire, quand la donnée ne le dit pas elle-même.
function companionQuestStepLabel(st) {
  if (st.label) return _td(st.label);
  if (st.type === "deliver") return _t("Apporter des ressources");
  if (st.type === "run") return _t("Réussir une Petite Aventure : {w}", { w: companionQuestWorldName(st.world) });
  if (st.type === "elite") return _t("Vaincre une élite de la carte : {w}", { w: companionQuestWorldName(st.world) });
  return _t("Écouter");
}

function companionQuestCostHTML(st) {
  return Object.keys(st.res || {}).map(function (k) {
    var def = (typeof WAREHOUSE_RESOURCES !== "undefined" && WAREHOUSE_RESOURCES[k]) || {}, have = window.WarehouseManager ? WarehouseManager.getAmount(k) : 0;
    return '<span class="pc-skill-chip' + (have >= st.res[k] ? '' : ' is-short') + '">' + renderIconOrEmojiHTML(def.icon || "", "pc-skill-chip-img", "")
      + st.res[k] + ' ' + esc(_td(def.name || k)) + ' <small>(' + formatNumber(have) + ')</small></span>';
  }).join("");
}

// Action de l'étape en cours : donner, écouter, ou ce qu'il faut pour que l'étape avance.
function companionQuestActionHTML(q, name) {
  var M = CompanionQuestManager, st = M.step(q);
  if (!st) return '<span class="cq-done">✓ ' + esc(_t("Terminée")) + '</span>';
  if (st.type === "scene") return '<button type="button" class="settings-btn primary qb-card-btn" onclick="openQuestScene(\'' + esc(q.id) + '\')">' + esc(_t("Écouter")) + '</button>';
  if (st.type === "deliver") return '<button type="button" class="settings-btn primary qb-card-btn" onclick="companionQuestDeliver(\'' + esc(q.id) + '\')"' + (M.canDeliver(q) ? '' : ' disabled') + '>' + esc(_t("Donner")) + '</button>';
  // v3.600.0 (option B) : « J'y vais » mène à la carte vivante du monde, sur un secteur qui compte
  return (M.inParty(q) ? '' : '<span class="qb-card-locked">' + esc(_t("{n} doit être dans l'équipe", { n: name })) + '</span>')
    + '<button type="button" class="settings-btn primary qb-card-btn" onclick="companionQuestGo(\'' + esc(q.id) + '\')">' + esc(_t("J'y vais")) + '</button>';
}

/* Le monde de l'étape : sa carte vivante si le héros y est (centrée sur un secteur qui compte),
   sinon la fiche du monde, avec le voyage. */
function companionQuestGo(id) {
  var M = CompanionQuestManager, q = M.get(id), st = q ? M.step(q) : null;
  if (!st || !window.WORLDS) return;
  var idx = WORLDS.findIndex(function (w) { return w.id === st.world; }), LM = window.LivingMapManager;
  var map = LM ? LM.getMapForWorld(st.world) : null, here = idx === Number((window.WorldManager && WorldManager.worldIndex) || 0);
  if (map && here) { openLivingMap(map.id, M.targetOf(q)); return; } // v3.603.0 : le lieu attribué
  if (typeof switchTab === "function") switchTab("map");
  if (idx >= 0 && typeof openWorldPopup === "function") openWorldPopup(idx);
}

/* v3.603.0 : où se joue l'étape (le lieu attribué, un seul par quête). */
function companionQuestWhere(q) {
  var M = CompanionQuestManager, st = M.step(q), LM = window.LivingMapManager, map = LM && st ? LM.getMapForWorld(st.world) : null, id = M.targetOf(q);
  if (!map || !id) return _t("Aucun lieu ouvert pour l'instant : avance sur la carte de ce monde.");
  var d = LM.getSectorDef(map.id, id);
  return LM.isNameRevealed(map.id, id) ? _t("Lieu : {x}", { x: _td(d.name) }) : _t("Lieu : un secteur voilé (marqué sur la carte)");
}

function buildCompanionQuestCardHTML(q, inSection) {
  var M = CompanionQuestManager, def = getCompanionDef(q.companion), name = _td(def.name), s = M.stateOf(q.id) || { s: 0 }, done = M.isDone(q.id), cur = M.step(q);
  var h = '<div class="qb-card cq-card' + (done ? ' is-done' : M.isReady(q) ? ' is-claimable' : ' is-running') + '" data-cq="' + esc(q.id) + '">';
  h += '<div class="qb-card-banner cq-banner">' + renderIconOrEmojiHTML(def.image, "qb-card-banner-img", name) + '</div><div class="qb-card-body">';
  h += '<div class="qb-card-title-row"><span class="qb-card-title">' + esc(_td(q.title)) + '</span>' + (inSection ? '' : '<span class="quest-badge cq-badge">' + esc(name) + '</span>') + '</div>';
  if (q.blurb) h += '<div class="qb-card-desc">' + esc(_td(q.blurb)) + '</div>';
  if (!done) {
    // v3.639.0 : l'étape en cours seule, les autres derrière une ligne (questStepsHTML, quests-view.js)
    h += questStepsHTML("cq_" + q.id, q.steps.map(function (st, k) {
      return { state: k < s.s ? "done" : k === s.s ? "current" : "pending", label: companionQuestStepLabel(st), progress: k === s.s ? (M.progressText(q) || "") : "" };
    }));
    if (cur && cur.type === "deliver") h += '<div class="cq-cost">' + companionQuestCostHTML(cur) + '</div>';
    if (cur && (cur.type === "run" || cur.type === "elite")) h += '<div class="cq-where">' + esc(companionQuestWhere(q)) + '</div>'; // v3.603.0
  }
  var R = window.COMPANION_RELIC_UNIQUES && COMPANION_RELIC_UNIQUES[q.relic], relic = R ? { f: q.relic, w: R.w } : null;
  h += '<div class="qb-card-footer"><div class="qb-card-rewards">' + (relic ? '<span class="qb-reward-chip cq-relic"><img src="' + esc(CompanionRelics.icon(relic)) + '" alt="">'
    + '<span><b>' + esc(CompanionRelics.name(relic)) + '</b><small>' + esc(CompanionRelics.effectText(relic)) + '</small></span></span>' : '') + '</div>';
  h += '<div class="qb-card-action">' + companionQuestActionHTML(q, name) + '</div></div></div></div>';
  return h;
}

/* bySection (v3.639.0, onglet Compagnons) : une section par compagnon dès qu'il y a plusieurs quêtes */
function buildCompanionQuestsHTML(bySection) {
  if (!window.CompanionQuestManager) return "";
  var list = CompanionQuestManager.list();
  if (!list.length) return "";
  if (!bySection || list.length < 2) return '<div class="quest-board-list cq-list">' + list.map(function (q) { return buildCompanionQuestCardHTML(q); }).join("") + '</div>';
  var order = [], by = {};
  list.forEach(function (q) { if (!by[q.companion]) { by[q.companion] = []; order.push(q.companion); } by[q.companion].push(q); });
  return '<div class="quest-board-list cq-list">' + order.map(function (id) {
    var def = getCompanionDef(id), qs = by[id];
    return '<div class="cq-sec">' + renderIconOrEmojiHTML(def.image, "cq-sec-img", "") + '<b>' + esc(_td(def.name)) + '</b><small>' + esc(_tn(qs.length, "{n} quête", "{n} quêtes")) + '</small></div>'
      + qs.map(function (q) { return buildCompanionQuestCardHTML(q, true); }).join("");
  }).join("") + '</div>';
}

// Grand écran : une ligne par quête dans la liste de gauche.
function companionQuestWideEntries() {
  if (!window.CompanionQuestManager) return [];
  var M = CompanionQuestManager;
  return M.list().map(function (q) {
    var def = getCompanionDef(q.companion), st = M.step(q), done = M.isDone(q.id);
    return { key: "cq:" + q.id, icon: def.image, title: _td(q.title), done: done,
      sub: _td(def.name) + " · " + (done ? _t("Terminée") : companionQuestStepLabel(st)), right: done ? "✓" : M.isReady(q) ? "!" : "›" };
  });
}

function companionQuestDeliver(id) {
  if (CompanionQuestManager.deliver(id) && typeof renderPanel === "function") renderPanel();
}

window.buildCompanionQuestsHTML = buildCompanionQuestsHTML;
window.buildCompanionQuestCardHTML = buildCompanionQuestCardHTML;
window.companionQuestWideEntries = companionQuestWideEntries;
window.companionQuestDeliver = companionQuestDeliver;
window.companionQuestGo = companionQuestGo;
