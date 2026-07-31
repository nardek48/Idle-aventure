"use strict";

function cloneQuestProgress() {
  return Object.assign({}, DEFAULT_QUEST_PROGRESS);
}

/* getAetherBonuses() et getAetherMult() sont définies dans
   systems/stats-system.js. */

/* ============================================================
Formate les nombres en K, M, B, T et gère aussi les décimales simples pour l’affichage UI et log
============================================================ */

function formatNumber(value) {
  var n = Number(value || 0);
  if (n >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
  if (n % 1 !== 0) return n.toFixed(1);
  return String(Math.floor(n));
}

/* ============================================================
Formate une durée en secondes en "Xh Ym", "Xm Ys" ou "Xs".
============================================================ */

function formatTime(totalSeconds) {
  var s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  var h = Math.floor(s / 3600);
  var m = Math.floor((s % 3600) / 60);
  var sec = s % 60;

  if (h > 0) return h + "h " + m + "m";
  if (m > 0) return m + "m " + sec + "s";
  return sec + "s";
}

/* ============================================================
Retourne un booléen selon un pourcentage de probabilité. 
============================================================ */

function chance(percent) {
  return Math.random() * 100 < Number(percent || 0);
}

/* ============================================================
Génère un entier aléatoire inclusif entre min et max. 
============================================================ */

function randInt(min, max) {
  min = Math.ceil(Number(min || 0));
  max = Math.floor(Number(max || 0));
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* ============================================================
Génère un nombre flottant aléatoire entre min et max. 
============================================================ */

function randFloat(min, max) {
  return Math.random() * (Number(max || 0) - Number(min || 0)) + Number(min || 0);
}

/* ============================================================
Déclenche une vibration via navigator.vibrate quand l’appareil le permet. 
============================================================ */

function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

window.cloneQuestProgress = cloneQuestProgress;
window.formatNumber = formatNumber;
window.formatTime = formatTime;
window.chance = chance;
window.randInt = randInt;
window.randFloat = randFloat;
window.vibrate = vibrate;