"use strict";
/* ui/achievement-view.js — v3.338.0 : écran des Hauts faits refondu (conception « Hauts faits »
   v1.0, maquette validée : atelier-hauts-faits.html).
   En-tête (compteur, titre porté, « Tout réclamer »), onglets en pastilles, paliers d'un monde
   (H4), cartes triées (à réclamer, en cours, obtenus, cachés), « Anciens exploits » (H9) et bilan
   de partie en bas de Collection. Le choix du titre (H8) est une feuille du bas. */

var achievementTab = null;       // onglet ouvert (null : monde courant)
var achievementOldOpen = false;  // « Anciens exploits » dépliés
var achievementTotalsOpen = false;

function getAchievementDefaultTab() {
  var idx = window.WorldManager ? Number(WorldManager.worldIndex || 0) : 0;
  var cat = (window.ACHIEVEMENT_CATEGORIES || []).find(function (c) { return c.world === idx; });
  return cat ? cat.id : "forest";
}

function setAchievementTab(tab) {
  achievementTab = tab;
  if (typeof renderPanel === "function") renderPanel();
}
window.setAchievementTab = setAchievementTab;

function toggleAchievementOld() { achievementOldOpen = !achievementOldOpen; if (typeof renderPanel === "function") renderPanel(); }
function toggleAchievementTotals() { achievementTotalsOpen = !achievementTotalsOpen; if (typeof renderPanel === "function") renderPanel(); }
window.toggleAchievementOld = toggleAchievementOld;
window.toggleAchievementTotals = toggleAchievementTotals;

function formatAchievementRewardHTML(ach) {
  var r = ach.reward || {}, parts = [];
  if (r.gold) parts.push('<img class="ico-inline" src="images/Icons/gold_icon.png" alt=""> ' + _t("{n} or", { n: formatNumber(r.gold) }));
  return '<span class="hf-rew">' + parts.join(" · ") + (ach.title ? '<span class="hf-title-tag">' + _t("Titre") + '</span>' : '') + '</span>';
}

function formatAchievementDate(ts) {
  var d = new Date(ts || Date.now());
  return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
}

function buildAchievementCardHTML(ach) {
  var AM = AchievementManager;
  var complete = AM.isComplete(ach), claimed = AM.isClaimed(ach.id), ready = complete && !claimed;
  if (ach.hidden && !complete) {
    return '<div class="hf-card is-hidden"><div class="hf-q">?</div><div class="hf-body"><div class="hf-name">???</div>'
      + '<div class="hf-desc">' + _t("Haut fait caché.") + ' ' + esc(_td(ach.hint || "")) + '</div><div class="hf-meta"><span>' + _t("Révélé une fois obtenu") + '</span></div></div></div>';
  }
  var target = AM.getTarget(ach), prog = Math.min(target, AM.getProgress(ach));
  var h = '<div class="hf-card' + (ready ? ' is-ready' : claimed ? ' is-done' : '') + '">';
  h += renderIconOrEmojiHTML(ach.icon, "hf-ico", _td(ach.name));
  h += '<div class="hf-body"><div class="hf-name">' + esc(_td(ach.name)) + (ach.hidden ? ' <span class="hf-title-tag">' + _t("Caché") + '</span>' : '') + '</div>';
  h += '<div class="hf-desc">' + esc(_td(ach.desc)) + '</div>';
  if (ready) {
    h += '<div class="hf-meta">' + formatAchievementRewardHTML(ach) + '<button type="button" class="hf-btn" onclick="AchievementManager.claim(\'' + esc(ach.id) + '\')">' + _t("Réclamer") + '</button></div>';
  } else if (claimed) {
    var at = AM.ensure().claimedAt[ach.id];
    h += '<div class="hf-meta"><span class="hf-got">✓ ' + (at ? _t("Obtenu le {d}", { d: formatAchievementDate(at) }) : _t("Obtenu")) + '</span>' + (ach.title ? '<span class="hf-title-tag">' + _t("Titre") + '</span>' : '') + '</div>';
  } else {
    if (target > 1) {
      h += '<div class="hf-bar"><i style="width:' + Math.round(100 * prog / target) + '%"></i></div>';
      h += '<div class="hf-meta"><span>' + formatNumber(prog) + ' / ' + formatNumber(target) + (ach.fresh ? ' · ' + _t("compté depuis la mise à jour") : '') + '</span>' + formatAchievementRewardHTML(ach) + '</div>';
    } else {
      h += '<div class="hf-meta"><span>' + (ach.fresh ? _t("Compté depuis la mise à jour") : _t("À faire")) + '</span>' + formatAchievementRewardHTML(ach) + '</div>';
    }
  }
  return h + '</div></div>';
}

function buildAchievementTiersHTML(cat) {
  var w = AchievementManager.getCategoryTier(cat.id), t = cat.tiers;
  var pct = function (n) { return Math.min(100, Math.round(100 * n / t[t.length - 1])); };
  var labels = [["bronze", _t("Bronze", "palier")], ["silver", _t("Argent", "palier")], ["gold", _t("Or", "palier")]];
  var h = '<div class="hf-tiers"><div class="hf-tiers-h"><span>' + esc(_t("Paliers — {x}", { x: _td(cat.label) })) + '</span><span>' + w.count + ' / ' + w.max + '</span></div>';
  h += '<div class="hf-track"><div class="hf-track-fill" style="width:' + pct(w.count) + '%"></div>';
  labels.forEach(function (l, i) {
    h += '<div class="hf-notch is-' + l[0] + (w.count >= t[i] ? ' is-got' : '') + '" style="left:' + pct(t[i]) + '%">' + t[i] + '<span>' + l[1] + '</span></div>';
  });
  // v3.376.0 : un palier sans récompense n'est plus affiché (« Bronze : · » vide) ; « : » passe par _t (anglais « Gold: »)
  var rew = [];
  cat.tierRewards.forEach(function (r, i) {
    var p = [];
    if (r.title) p.push(_t("titre « {x} »", { x: _td(r.title) }));
    if (p.length) rew.push(_t("{palier} : {gains}", { palier: labels[i][1], gains: p.join(" + ") }));
  });
  h += '</div><div class="hf-tiers-reward">' + (rew.length ? esc(rew.join(" · ")) + '. ' : '') + _t("Les hauts faits cachés ne comptent pas.") + '</div></div>';
  return h;
}

/* Bilan de partie (repris de v3.202.1), replié en bas de Collection. */
/* v3.365.0 (lot J) : où en est l'Histoire, en une ligne — le dernier chapitre ouvert, son étape
   courante, ou « terminé ». Lecture seule. */
function buildTotalsStoryLabel() {
  var S = window.StoryQuestManager, Q = window.STORY_QUESTS;
  if (!S || !Q) return "—";
  var ids = Object.keys(Q).filter(function (id) { return S.isChapterOpen(id); });
  if (!ids.length) return "—";
  var id = ids[ids.length - 1], ch = Q[id], nom = _t("Ch. {n}", { n: ids.length }); // court : la case est étroite sur iPhone
  if (S.isChapterCompleted(id)) return _t("{x} terminé", { x: nom });
  var st = S.getState(id), n = ch.steps.length;
  return nom + " · " + Math.min(n, Number(st.currentStep || 0) + 1) + " / " + n;
}

function buildAchievementTotalsHTML() {
  var rows = [
    ["images/Icons/system/hourglass_waiting.png", _t("Temps de jeu"), (typeof formatTime === "function") ? formatTime(game.playTime || 0) : String(Math.floor(game.playTime || 0)) + "s"],
    ["images/Icons/combat_stats/stat_attack.png", _t("Ennemis vaincus"), formatNumber(game.totalKills || 0)],
    ["images/Icons/gold_icon.png", _t("Or gagné"), formatNumber(game.totalGoldEarned || 0)],
    ["images/Icons/combat_status/charge_incoming.png", _t("Dégâts"), formatNumber(game.totalDamageDealt || 0)],
    ["images/Icons/quests/quest_resources.png", _t("Monde"), (WorldManager.worldIndex + 1) + " / " + WORLDS.length],
    ["images/Icons/system/ascension.png", _t("Mémoire"), formatNumber(window.MemoryManager ? MemoryManager.getLevel() : 0)],
    // v3.365.0 (lot J) : trois lignes de plus, sans nouveau compteur
    ["images/Icons/scene/final_reward.png", _t("Hauts faits"), window.AchievementManager ? AchievementManager.getClaimedCount() + " / " + (window.ACHIEVEMENTS_DB || []).length : "—"],
    ["images/Icons/system/ascension.png", _t("Aether gagné"), formatNumber(Math.floor(Number(game.totalAetherEarned || 0)))],
    // v3.379.1 : l'Histoire en dernier = seule sur sa ligne (valeur longue, « Hist… » tronqué sur iPhone)
    ["images/Icons/codex/codex_lore.png", _t("Histoire"), buildTotalsStoryLabel()]
  ];
  var h = '<div class="achievement-totals">';
  rows.forEach(function (r) {
    h += '<div class="achievement-total"><span class="achievement-total-ico">' + renderIconOrEmojiHTML(r[0], "ach-total-ico", "") + '</span>'
      + '<span class="achievement-total-lbl">' + esc(r[1]) + '</span><span class="achievement-total-val">' + esc(r[2]) + '</span></div>';
  });
  return h + '</div>';
}

function buildAchievementsHTML() {
  var AM = AchievementManager;
  AM.refresh(true); // rattrapage : tout ce qui se lit dans l'état
  var tab = achievementTab || getAchievementDefaultTab();
  var cats = window.ACHIEVEMENT_CATEGORIES || [];
  var cat = cats.find(function (c) { return c.id === tab; }) || cats[0];
  var total = (ACHIEVEMENTS_DB || []).length, claimed = AM.getClaimedCount(), ready = AM.getAvailableToClaimCount();
  var title = AM.getTitle();

  var h = '<div class="hf-top"><div class="hf-count">' + claimed + ' / ' + total + '<small>' + _t("obtenus") + '</small></div>'
    + '<button type="button" class="hf-title-btn" onclick="openAchievementTitleSheet()"><small>' + _t("Titre porté") + '</small><b>' + esc(title ? _td(title) : _t("Aucun — choisir")) + '</b></button>'
    + (ready ? '<button type="button" class="hf-claim-all" onclick="AchievementManager.claimAll()">' + _t("Tout réclamer ({n})", { n: ready }) + '</button>' : '') + '</div>';

  h += '<div class="hf-tabs">' + cats.map(function (c) {
    var r = AM.getAvailableToClaimCount(c.id);
    return '<button type="button" class="hf-tab' + (c.id === cat.id ? ' is-on' : '') + '" onclick="setAchievementTab(\'' + c.id + '\')">'
      + esc(_td(c.label)) + (r ? '<span class="hf-dot">' + r + '</span>' : '') + '</button>';
  }).join("") + '</div>';

  if (cat.tiers) h += buildAchievementTiersHTML(cat);

  // Ordre : à réclamer, en cours, obtenus, cachés non trouvés
  var rank = function (a) {
    var done = AM.isComplete(a), cl = AM.isClaimed(a.id);
    return (done && !cl) ? 0 : (a.hidden && !done) ? 3 : cl ? 2 : 1;
  };
  (ACHIEVEMENTS_DB || []).filter(function (a) { return a.category === cat.id; })
    .map(function (a, i) { return { a: a, r: rank(a), i: i }; })
    .sort(function (x, y) { return x.r - y.r || x.i - y.i; })
    .forEach(function (x) { h += buildAchievementCardHTML(x.a); });

  if (cat.id === "collection") {
    var old = AM.getRetiredClaimed();
    if (old.length) {
      h += '<div class="hf-old"><button type="button" class="hf-old-h" onclick="toggleAchievementOld()">' + (achievementOldOpen ? '▾' : '▸') + ' ' + _t("Anciens exploits ({n})", { n: old.length }) + '</button>';
      if (achievementOldOpen) h += old.map(function (o) { return '<div class="hf-old-row"><b>' + esc(_td(o.name)) + '</b> — ' + esc(_td(o.desc)) + ' <i>' + _t("Obtenu avant la refonte.") + '</i></div>'; }).join("");
      h += '</div>';
    }
    // v3.365.0 (lot J, demande Seb) : le Bilan de la partie est parti en tête du Journal (log-view.js)
  }

  return '<div class="nb-page-frame kframe-page" data-kf-title="' + esc("images/Icons/scene/final_reward.png|" + _t("Hauts faits")) + '">' + h + '</div>';
}

/* ---------- Titre porté (H8) : feuille du bas ---------- */

function getAchievementSheetRoot() {
  var root = document.getElementById("achievement-sheet-root");
  if (!root && document.body && typeof document.createElement === "function") {
    root = document.createElement("div");
    root.id = "achievement-sheet-root";
    document.body.appendChild(root);
  }
  return root;
}

function openAchievementTitleSheet() {
  var AM = AchievementManager, cur = AM.getTitle();
  var h = '<div class="hf-sheet-bg" onclick="if(event.target===this)closeAchievementTitleSheet()"><div class="hf-sheet" role="dialog" aria-label="' + esc(_t("Choisir un titre")) + '">';
  h += '<h3>' + _t("Choisir un titre") + '</h3>';
  h += '<button type="button" class="hf-opt' + (!cur ? ' is-on' : '') + '" onclick="pickAchievementTitle(-1)"><span>' + _t("Aucun titre") + '</span></button>';
  AM.getAllTitles().forEach(function (t, i) {
    var ok = AM.isTitleUnlocked(t);
    h += '<button type="button" class="hf-opt' + (cur === t.title ? ' is-on' : '') + (ok ? '' : ' is-locked') + '"' + (ok ? ' onclick="pickAchievementTitle(' + i + ')"' : ' disabled') + '>'
      + '<span>' + (ok ? '' : '🔒 ') + esc(_td(t.title)) + '</span><small>' + esc(t.from) + '</small></button>';
  });
  h += '</div></div>';
  var root = getAchievementSheetRoot();
  if (root) root.innerHTML = h;
}

function closeAchievementTitleSheet() {
  var root = document.getElementById("achievement-sheet-root");
  if (root) root.innerHTML = "";
}

function pickAchievementTitle(index) {
  var t = index >= 0 ? AchievementManager.getAllTitles()[index] : null;
  AchievementManager.setTitle(t ? t.title : null);
  closeAchievementTitleSheet();
}

window.buildAchievementsHTML = buildAchievementsHTML;
window.buildAchievementTotalsHTML = buildAchievementTotalsHTML;
window.buildAchievementCardHTML = buildAchievementCardHTML;
window.openAchievementTitleSheet = openAchievementTitleSheet;
window.closeAchievementTitleSheet = closeAchievementTitleSheet;
window.pickAchievementTitle = pickAchievementTitle;
