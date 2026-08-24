"use strict";
/* core/utils.js — utilitaires génériques (formatage, aléatoire, vibration), ne touchent pas à game (sauf cloneQuestProgress). Détail : COMMENTAIRES_ORIGINAUX.md */

function renderIconOrEmojiHTML(icon, baseClass, altText) {
  var isImagePath = typeof icon === "string" && /\.(png|jpg|jpeg|svg|gif|webp)$/i.test(icon);
  if (isImagePath) {
    return '<img class="' + baseClass + '" src="' + esc(icon) + '" alt="' + esc(altText || "") + '">';
  }
  return '<span class="' + baseClass + ' ' + baseClass + '-emoji">' + esc(icon || "") + '</span>';
}

function cloneQuestProgress() {
  return Object.assign({}, DEFAULT_QUEST_PROGRESS);
}

function formatNumber(value) {
  var n = Number(value || 0);
  if (n >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
  if (n % 1 !== 0) return n.toFixed(1);
  return String(Math.floor(n));
}

function formatTime(totalSeconds) {
  var s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  var h = Math.floor(s / 3600);
  var m = Math.floor((s % 3600) / 60);
  var sec = s % 60;

  if (h > 0) return h + "h " + m + "m";
  if (m > 0) return m + "m " + sec + "s";
  return sec + "s";
}

function chance(percent) {
  return Math.random() * 100 < Number(percent || 0);
}

function randInt(min, max) {
  min = Math.ceil(Number(min || 0));
  max = Math.floor(Number(max || 0));
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max) {
  return Math.random() * (Number(max || 0) - Number(min || 0)) + Number(min || 0);
}

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
