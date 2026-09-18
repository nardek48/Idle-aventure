"use strict";
/* core/utils.js — utilitaires génériques (formatage, aléatoire, vibration), ne touchent pas à game (sauf cloneQuestProgress). Détail : COMMENTAIRES_ORIGINAUX.md */

function renderIconOrEmojiHTML(icon, baseClass, altText) {
  // v3.242.0 : la passe icônes v3.240 a laissé des balises <img ...> COMPLÈTES là où
  // cette fonction attend un chemin — elles ressortaient échappées (le joueur voyait
  // le HTML). On en extrait le src plutôt que de l'afficher tel quel.
  if (typeof icon === "string" && icon.indexOf("<img") === 0) {
    var srcMatch = /src\s*=\s*["']?([^"'\s>]+)/i.exec(icon);
    icon = srcMatch ? srcMatch[1] : "";
  }
  var isImagePath = typeof icon === "string" && /\.(png|jpg|jpeg|svg|gif|webp)$/i.test(icon);
  if (isImagePath) {
    return '<img class="' + baseClass + '" src="' + esc(icon) + '" alt="">';
  }
  return '<span class="' + baseClass + ' ' + baseClass + '-emoji">' + esc(icon || "") + '</span>';
}

/* v3.242.1 (bug Seb) : échappe du texte qui contient déjà des balises <img> d'icône.
   esc() sur la chaîne entière affichait le HTML en clair (rapport de combat). Ici on
   ne laisse passer QUE les <img ...>, tout le reste est échappé normalement. */
function escPreservingIcons(text) {
  var parts = String(text == null ? "" : text).split(/(<img\b[^>]*>)/i);
  var out = "";
  for (var i = 0; i < parts.length; i++) {
    out += (i % 2 === 1) ? parts[i] : esc(parts[i]);
  }
  return out;
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

/* v3.98.9 : temps de craft (atelier/production) — garde la précision décimale en
   dessous de 60s (ex. "3.2 s", utile vu les durées courtes des recettes), mais bascule
   en minutes au-delà (ex. "1m 05s") plutôt que d'afficher "125.0 s" comme avant.
   Distinct de formatTime() (qui n'a jamais de décimale et sert à des affichages plus
   longs comme "Plein dans Xm Ys") pour ne rien changer aux usages existants de
   formatTime() ailleurs dans le jeu. Prend des MILLISECONDES en entrée. */
function formatCraftDuration(ms) {
  var totalSeconds = Math.max(0, Number(ms) || 0) / 1000;
  var roundedToTenth = Math.round(totalSeconds * 10) / 10;
  if (roundedToTenth < 60) return roundedToTenth.toFixed(1) + " s";

  var totalSecondsFloor = Math.floor(totalSeconds);
  var m = Math.floor(totalSecondsFloor / 60);
  var sec = totalSecondsFloor % 60;
  return m + "m " + (sec < 10 ? "0" : "") + sec + "s";
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

window.escPreservingIcons = escPreservingIcons;
window.cloneQuestProgress = cloneQuestProgress;
window.formatNumber = formatNumber;
window.formatTime = formatTime;
window.formatCraftDuration = formatCraftDuration;
window.chance = chance;
window.randInt = randInt;
window.randFloat = randFloat;
window.vibrate = vibrate;

/* v3.304.0 (règle Seb) — ICÔNE GÉNÉRIQUE POUR TOUTE IMAGE ABSENTE. Une icône pas encore dessinée
   garde son vrai chemin dans les données : elle reste repérable par le contrôle des icônes
   manquantes (sim/missing-icons.js) et prend sa place d'elle-même le jour où le fichier existe.
   En attendant, l'image qui échoue est remplacée par ce carré neutre, jamais par une autre icône
   du jeu. Les <img> qui déclarent leur propre onerror (repli emoji) gardent leur comportement. */
var MISSING_ICON_SRC = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
  + '<rect x="4" y="4" width="56" height="56" rx="10" fill="#efe0c2" stroke="#8a7a5c" stroke-width="3" stroke-dasharray="7 5"/>'
  + '<text x="32" y="43" text-anchor="middle" font-family="Georgia,serif" font-size="30" fill="#8a7a5c">?</text></svg>');
var MISSING_ICONS = []; // chemins réellement tombés en jeu (diagnostic, sans doublon)

function onMissingImage(e) {
  var img = e && e.target;
  if (!img || img.tagName !== "IMG" || img.getAttribute("onerror") || img.getAttribute("data-missing-icon")) return;
  var src = img.getAttribute("src") || "";
  if (!src || src.indexOf("data:") === 0) return;
  if (MISSING_ICONS.indexOf(src) === -1) MISSING_ICONS.push(src);
  img.setAttribute("data-missing-icon", src); // garde l'origine lisible, et empêche une boucle
  img.src = MISSING_ICON_SRC;
}
// Les erreurs d'image ne remontent pas : écoute en phase de capture, une fois pour toute la page.
if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("error", onMissingImage, true);
}
window.MISSING_ICON_SRC = MISSING_ICON_SRC;
window.MISSING_ICONS = MISSING_ICONS;
window.onMissingImage = onMissingImage;
