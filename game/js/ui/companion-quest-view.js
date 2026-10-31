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
  return M.inParty(q) ? '' : '<span class="qb-card-locked">' + esc(_t("{n} doit être dans l'équipe", { n: name })) + '</span>';
}

function buildCompanionQuestCardHTML(q) {
  var M = CompanionQuestManager, def = getCompanionDef(q.companion), name = _td(def.name), s = M.stateOf(q.id) || { s: 0 }, done = M.isDone(q.id), cur = M.step(q);
  var h = '<div class="qb-card cq-card' + (done ? ' is-done' : M.isReady(q) ? ' is-claimable' : ' is-running') + '" data-cq="' + esc(q.id) + '">';
  h += '<div class="qb-card-banner cq-banner">' + renderIconOrEmojiHTML(def.image, "qb-card-banner-img", name) + '</div><div class="qb-card-body">';
  h += '<div class="qb-card-title-row"><span class="qb-card-title">' + esc(_td(q.title)) + '</span><span class="quest-badge cq-badge">' + esc(name) + '</span></div>';
  if (q.blurb) h += '<div class="qb-card-desc">' + esc(_td(q.blurb)) + '</div>';
  if (!done) {
    h += '<div class="qb-card-steps">';
    q.steps.forEach(function (st, k) {
      var cls = k < s.s ? "is-done" : k === s.s ? "is-current" : "is-pending";
      var icon = k < s.s ? "<img class=ico-inline src=images/Icons/system/check_valid.webp>" : k === s.s ? "<img class=ico-inline src=images/Icons/quests/continue.webp>" : "○";
      h += '<div class="qb-card-step ' + cls + '"><span class="qb-card-step-icon">' + icon + '</span><span class="qb-card-step-label">' + esc(companionQuestStepLabel(st)) + '</span>'
        + (k === s.s && M.progressText(q) ? '<span class="qb-card-step-progress">' + esc(M.progressText(q)) + '</span>' : '') + '</div>';
    });
    h += '</div>';
    if (cur && cur.type === "deliver") h += '<div class="cq-cost">' + companionQuestCostHTML(cur) + '</div>';
  }
  var R = window.COMPANION_RELIC_UNIQUES && COMPANION_RELIC_UNIQUES[q.relic], relic = R ? { f: q.relic, w: R.w } : null;
  h += '<div class="qb-card-footer"><div class="qb-card-rewards">' + (relic ? '<span class="qb-reward-chip cq-relic"><img src="' + esc(CompanionRelics.icon(relic)) + '" alt="">'
    + '<span><b>' + esc(CompanionRelics.name(relic)) + '</b><small>' + esc(CompanionRelics.effectText(relic)) + '</small></span></span>' : '') + '</div>';
  h += '<div class="qb-card-action">' + companionQuestActionHTML(q, name) + '</div></div></div></div>';
  return h;
}

function buildCompanionQuestsHTML() {
  if (!window.CompanionQuestManager) return "";
  var list = CompanionQuestManager.list();
  return list.length ? '<div class="quest-board-list cq-list">' + list.map(buildCompanionQuestCardHTML).join("") + '</div>' : "";
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
