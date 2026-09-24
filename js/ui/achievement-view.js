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
  if (r.gold) parts.push('<img class="ico-inline" src="images/Icons/gold_icon.png" alt=""> ' + formatNumber(r.gold) + ' or');
  if (r.essence) parts.push('<img class="ico-inline" src="images/Icons/essence_icon.png" alt=""> ' + formatNumber(r.essence) + ' essence');
  return '<span class="hf-rew">' + parts.join(" · ") + (ach.title ? '<span class="hf-title-tag">Titre</span>' : '') + '</span>';
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
      + '<div class="hf-desc">Haut fait caché. ' + esc(ach.hint || "") + '</div><div class="hf-meta"><span>Révélé une fois obtenu</span></div></div></div>';
  }
  var target = AM.getTarget(ach), prog = Math.min(target, AM.getProgress(ach));
  var h = '<div class="hf-card' + (ready ? ' is-ready' : claimed ? ' is-done' : '') + '">';
  h += renderIconOrEmojiHTML(ach.icon, "hf-ico", ach.name);
  h += '<div class="hf-body"><div class="hf-name">' + esc(ach.name) + (ach.hidden ? ' <span class="hf-title-tag">Caché</span>' : '') + '</div>';
  h += '<div class="hf-desc">' + esc(ach.desc) + '</div>';
  if (ready) {
    h += '<div class="hf-meta">' + formatAchievementRewardHTML(ach) + '<button type="button" class="hf-btn" onclick="AchievementManager.claim(\'' + esc(ach.id) + '\')">Réclamer</button></div>';
  } else if (claimed) {
    var at = AM.ensure().claimedAt[ach.id];
    h += '<div class="hf-meta"><span class="hf-got">✓ ' + (at ? 'Obtenu le ' + formatAchievementDate(at) : 'Obtenu') + '</span>' + (ach.title ? '<span class="hf-title-tag">Titre</span>' : '') + '</div>';
  } else {
    if (target > 1) {
      h += '<div class="hf-bar"><i style="width:' + Math.round(100 * prog / target) + '%"></i></div>';
      h += '<div class="hf-meta"><span>' + formatNumber(prog) + ' / ' + formatNumber(target) + (ach.fresh ? ' · compté depuis la mise à jour' : '') + '</span>' + formatAchievementRewardHTML(ach) + '</div>';
    } else {
      h += '<div class="hf-meta"><span>' + (ach.fresh ? 'Compté depuis la mise à jour' : 'À faire') + '</span>' + formatAchievementRewardHTML(ach) + '</div>';
    }
  }
  return h + '</div></div>';
}

function buildAchievementTiersHTML(cat) {
  var w = AchievementManager.getCategoryTier(cat.id), t = cat.tiers;
  var pct = function (n) { return Math.min(100, Math.round(100 * n / t[t.length - 1])); };
  var labels = [["bronze", "Bronze"], ["silver", "Argent"], ["gold", "Or"]];
  var h = '<div class="hf-tiers"><div class="hf-tiers-h"><span>Paliers — ' + esc(cat.label) + '</span><span>' + w.count + ' / ' + w.max + '</span></div>';
  h += '<div class="hf-track"><div class="hf-track-fill" style="width:' + pct(w.count) + '%"></div>';
  labels.forEach(function (l, i) {
    h += '<div class="hf-notch is-' + l[0] + (w.count >= t[i] ? ' is-got' : '') + '" style="left:' + pct(t[i]) + '%">' + t[i] + '<span>' + l[1] + '</span></div>';
  });
  var rew = cat.tierRewards.map(function (r, i) {
    var p = [];
    if (r.essence) p.push("+" + formatNumber(r.essence) + " essence");
    if (r.title) p.push("titre « " + r.title + " »");
    if (r.aether) p.push("+" + formatNumber(r.aether) + " Aether");
    return labels[i][1] + " : " + p.join(" + ");
  }).join(" · ");
  h += '</div><div class="hf-tiers-reward">' + esc(rew) + '. Les hauts faits cachés ne comptent pas.</div></div>';
  return h;
}

/* Bilan de partie (repris de v3.202.1), replié en bas de Collection. */
function buildAchievementTotalsHTML() {
  var rows = [
    ["images/Icons/system/hourglass_waiting.png", "Temps de jeu", (typeof formatTime === "function") ? formatTime(game.playTime || 0) : String(Math.floor(game.playTime || 0)) + "s"],
    ["images/Icons/combat_stats/stat_attack.png", "Ennemis vaincus", formatNumber(game.totalKills || 0)],
    ["images/Icons/gold_icon.png", "Or gagné", formatNumber(game.totalGoldEarned || 0)],
    ["images/Icons/combat_status/charge_incoming.png", "Dégâts", formatNumber(game.totalDamageDealt || 0)],
    ["images/Icons/quests/quest_resources.png", "Monde", (WorldManager.worldIndex + 1) + " / " + WORLDS.length],
    ["images/Icons/system/ascension.png", "Mémoire", formatNumber(window.MemoryManager ? MemoryManager.getLevel() : 0)]
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

  var h = '<div class="hf-top"><div class="hf-count">' + claimed + ' / ' + total + '<small>obtenus</small></div>'
    + '<button type="button" class="hf-title-btn" onclick="openAchievementTitleSheet()"><small>Titre porté</small><b>' + esc(title || "Aucun — choisir") + '</b></button>'
    + (ready ? '<button type="button" class="hf-claim-all" onclick="AchievementManager.claimAll()">Tout réclamer (' + ready + ')</button>' : '') + '</div>';

  h += '<div class="hf-tabs">' + cats.map(function (c) {
    var r = AM.getAvailableToClaimCount(c.id);
    return '<button type="button" class="hf-tab' + (c.id === cat.id ? ' is-on' : '') + '" onclick="setAchievementTab(\'' + c.id + '\')">'
      + esc(c.label) + (r ? '<span class="hf-dot">' + r + '</span>' : '') + '</button>';
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
      h += '<div class="hf-old"><button type="button" class="hf-old-h" onclick="toggleAchievementOld()">' + (achievementOldOpen ? '▾' : '▸') + ' Anciens exploits (' + old.length + ')</button>';
      if (achievementOldOpen) h += old.map(function (o) { return '<div class="hf-old-row"><b>' + esc(o.name) + '</b> — ' + esc(o.desc) + ' <i>Obtenu avant la refonte.</i></div>'; }).join("");
      h += '</div>';
    }
    h += '<div class="hf-old"><button type="button" class="hf-old-h" onclick="toggleAchievementTotals()">' + (achievementTotalsOpen ? '▾' : '▸') + ' Bilan de la partie</button>';
    if (achievementTotalsOpen) h += buildAchievementTotalsHTML();
    h += '</div>';
  }

  return '<div class="nb-page-frame kframe-page" data-kf-title="images/Icons/scene/final_reward.png|Hauts faits">' + h + '</div>';
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
  var h = '<div class="hf-sheet-bg" onclick="if(event.target===this)closeAchievementTitleSheet()"><div class="hf-sheet" role="dialog" aria-label="Choisir un titre">';
  h += '<h3>Choisir un titre</h3>';
  h += '<button type="button" class="hf-opt' + (!cur ? ' is-on' : '') + '" onclick="pickAchievementTitle(-1)"><span>Aucun titre</span></button>';
  AM.getAllTitles().forEach(function (t, i) {
    var ok = AM.isTitleUnlocked(t);
    h += '<button type="button" class="hf-opt' + (cur === t.title ? ' is-on' : '') + (ok ? '' : ' is-locked') + '"' + (ok ? ' onclick="pickAchievementTitle(' + i + ')"' : ' disabled') + '>'
      + '<span>' + (ok ? '' : '🔒 ') + esc(t.title) + '</span><small>' + esc(t.from) + '</small></button>';
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
