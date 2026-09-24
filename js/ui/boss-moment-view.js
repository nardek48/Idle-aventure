"use strict";
/* ui/boss-moment-view.js — v3.333.0 (Évolutions, lot B-1) : l'affichage des moments de boss.
   Maquette validée : atelier-evolutions.html (onglet Boss). Règles : systems/boss-moment-system.js.

   PAUSE DU COMBAT : la carte d'entrée et le coup final s'écrivent dans #cycle-modal-root, la
   racine de l'ancienne modale de Cycle (vide depuis la fin de l'Ascension) qui figure déjà
   dans BLOCKING_MODAL_IDS de game-loop.js : tant qu'elle a du contenu, les rounds s'arrêtent.
   Aucune ligne de game-loop.js (protégé) n'est touchée.
   Les bandeaux (entrée rejouée, phase) ne bloquent rien : racine à part, #boss-banner-root.

   B4 : tout se passe dans la VUE. Le moteur ne ralentit pas ; seul le résultat attend que le
   joueur ait vu le coup final. Animations coupées par prefers-reduced-motion (CSS). */

var BOSS_INTRO_MS = 3400;   // 2 s d'image + le temps de lire les répliques ; un toucher la passe
var BOSS_BANNER_MS = 1000;  // entrée rejouée
var BOSS_PHASE_MS = 1600;
var BOSS_FINAL_HIT_MS = 600;   // pause avant le coup
var BOSS_FINAL_WIN_MS = 1900;  // carte de victoire

var bossMomentTimers = [];

function bossMomentClearTimers() {
  bossMomentTimers.forEach(function (t) { clearTimeout(t); });
  bossMomentTimers = [];
}

function getBossBlockingRoot() { return document.getElementById("cycle-modal-root"); }

function getBossBannerRoot() {
  var root = document.getElementById("boss-banner-root");
  if (!root && document.body && typeof document.createElement === "function") {
    root = document.createElement("div");
    root.id = "boss-banner-root";
    document.body.appendChild(root);
  }
  return root;
}

function bossPortraitHTML(enemy, cls) {
  var src = window.BossMomentManager ? BossMomentManager.imageOf(enemy) : "";
  return src ? '<img class="' + cls + '" src="' + esc(src) + '" alt="">' : '<div class="' + cls + ' bm-pic-empty"></div>';
}

/* ---------- Entrée (B2) ---------- */

function showBossIntro(enemy, mode) {
  var BM = window.BossMomentManager;
  if (!BM) return;
  var name = BM.cleanName(enemy);
  if (mode !== "full") { showBossBanner(name, "de retour", BOSS_BANNER_MS, false); return; }

  var m = BM.getMoment(enemy);
  var ally = BM.allyLine("bossIntro");
  var h = '<div class="bm-intro" onclick="closeBossIntro()" role="dialog" aria-label="' + esc(name) + '">';
  h += bossPortraitHTML(enemy, "bm-intro-pic");
  h += '<div class="bm-kicker">' + (enemy.isElite ? "Élite" : "Boss") + '</div>';
  h += '<div class="bm-name">' + esc(name) + '</div>';
  if (m.title) h += '<div class="bm-title">' + esc(m.title) + '</div>';
  if (m.intro) h += '<div class="bm-line">' + esc(m.intro) + '</div>';
  if (ally) h += '<div class="bm-ally">' + (ally.image ? '<img src="' + esc(ally.image) + '" alt="">' : '') + '<span><b>' + esc(ally.name) + ' :</b> ' + esc(ally.text) + '</span></div>';
  h += '<div class="bm-skip">Touche pour passer</div><div class="bm-bar" style="animation-duration:' + BOSS_INTRO_MS + 'ms"></div>';
  h += '</div>';

  var root = getBossBlockingRoot();
  if (!root) return;
  bossMomentClearTimers();
  root.innerHTML = h;
  bossMomentTimers.push(setTimeout(closeBossIntro, BOSS_INTRO_MS));
}

function closeBossIntro() {
  var root = getBossBlockingRoot();
  if (root && root.querySelector && root.querySelector(".bm-intro")) root.innerHTML = "";
  bossMomentClearTimers();
}

/* ---------- Bandeaux ---------- */

function showBossBanner(title, sub, ms, flash) {
  var root = getBossBannerRoot();
  if (!root) return;
  root.innerHTML = (flash ? '<div class="bm-flash bm-flash-red"></div>' : '')
    + '<div class="bm-banner"><b>' + esc(title) + '</b>' + (sub ? '<span>' + esc(sub) + '</span>' : '') + '</div>';
  var mine = root.innerHTML;
  setTimeout(function () { if (root.innerHTML === mine) root.innerHTML = ""; }, ms);
}

/* B3 option A : le libellé de checkPhases devient un bandeau central, flash à la première. */
function showBossPhase(enemy, label, line, full) {
  var name = window.BossMomentManager ? BossMomentManager.cleanName(enemy) : "";
  showBossBanner(name + " — " + label, line || "", BOSS_PHASE_MS, !!full);
}

/* ---------- Coup final et trophée (B4, B5) ---------- */

function showBossFinal(enemy, trophy) {
  var BM = window.BossMomentManager;
  var root = getBossBlockingRoot();
  if (!BM || !root) return;
  var m = BM.getMoment(enemy);
  bossMomentClearTimers();
  root.innerHTML = '<div class="bm-final">' + bossPortraitHTML(enemy, "bm-final-pic") + '<div class="bm-flash"></div>'
    + (m.death ? '<div class="bm-final-line">' + esc(m.death) + '</div>' : '') + '</div>';

  bossMomentTimers.push(setTimeout(function () {
    var el = root.querySelector ? root.querySelector(".bm-final") : null;
    if (el) el.classList.add("is-hit");
  }, BOSS_FINAL_HIT_MS));
  bossMomentTimers.push(setTimeout(function () {
    var el = root.querySelector ? root.querySelector(".bm-final") : null;
    if (el) { el.classList.remove("is-hit"); el.classList.add("is-down"); }
  }, BOSS_FINAL_HIT_MS + 500));
  bossMomentTimers.push(setTimeout(function () { showBossVictory(enemy, trophy); }, BOSS_FINAL_WIN_MS));
}

function buildBossTrophyCardHTML(t) {
  var d = new Date(t.at || Date.now());
  var date = ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
  var bits = [date, "niveau " + t.level];
  if (t.rounds > 0) bits.push(t.rounds + " round" + (t.rounds > 1 ? "s" : ""));
  if (t.allies && t.allies.length) bits.push("avec " + t.allies.join(" et "));
  return '<div class="bm-trophy">' + (t.image ? '<img src="' + esc(t.image) + '" alt="">' : '<div class="bm-trophy-empty"></div>')
    + '<div><div class="bm-trophy-k">Trophée</div><div class="bm-trophy-n">' + esc(t.name) + '</div>'
    + '<div class="bm-trophy-d">' + esc(bits.join(" · ")) + '</div></div></div>';
}

function showBossVictory(enemy, trophy) {
  var root = getBossBlockingRoot();
  if (!root) return;
  var ally = window.BossMomentManager ? BossMomentManager.allyLine("bossWin") : null;
  var h = '<div class="bm-win"><div class="bm-win-card"><div class="bm-win-t">Victoire</div>';
  if (trophy) h += '<div class="bm-new">Nouveau trophée</div>' + buildBossTrophyCardHTML(trophy);
  if (ally) h += '<div class="bm-win-line">' + esc(ally.name) + ' : « ' + esc(ally.text) + ' »</div>';
  h += '<button type="button" class="settings-btn primary" onclick="closeBossFinal()">Continuer</button></div></div>';
  root.innerHTML = h;
}

function closeBossFinal() {
  bossMomentClearTimers();
  var root = getBossBlockingRoot();
  if (root) root.innerHTML = "";
}

window.showBossIntro = showBossIntro;
window.closeBossIntro = closeBossIntro;
window.showBossBanner = showBossBanner;
window.showBossPhase = showBossPhase;
window.showBossFinal = showBossFinal;
window.showBossVictory = showBossVictory;
window.closeBossFinal = closeBossFinal;
window.buildBossTrophyCardHTML = buildBossTrophyCardHTML;
