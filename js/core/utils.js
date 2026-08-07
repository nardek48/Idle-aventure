"use strict";
/* ============================================================
Quest Idle — core/utils.js
Fonctions utilitaires génériques, utilisées dans tout le projet
(formatage, aléatoire, vibration...). Aucune de ces fonctions ne
touche à `game` directement (sauf cloneQuestProgress).
============================================================ */

/* ============================================================
   v2.79 : helper partagé pour afficher une icône qui peut être soit
   un emoji (texte), soit un vrai fichier image — plusieurs écrans
   (Boutique, Boutique d'Aether, Potions, Quêtes...) ont des icônes de
   données mixtes : certaines entrées ont une vraie image (ex.
   "images/Icons/gold_icon.png"), d'autres encore un simple emoji en
   attendant leur icône dédiée. Rendre un emoji directement dans un
   <img src="..."> génère une requête réseau vers un fichier
   inexistant (404) — voir le bug corrigé en v2.78 sur les cartes
   d'upgrade. Ce helper centralise la détection pour éviter de la
   dupliquer dans chaque écran.
   baseClass : nom de classe CSS déjà utilisé par l'ancien rendu texte
   (ex. "potion-icon", "quest-icon") — réutilisé tel quel sur le tag
   <img> pour garder le même habillage (fond, position...), avec en
   plus "<baseClass>-emoji" quand c'est un emoji, pour ajuster la
   taille de police indépendamment (voir CSS de chaque écran). */
function renderIconOrEmojiHTML(icon, baseClass, altText) {
  var isImagePath = typeof icon === "string" && /\.(png|jpg|jpeg|svg|gif|webp)$/i.test(icon);
  if (isImagePath) {
    return '<img class="' + baseClass + '" src="' + esc(icon) + '" alt="' + esc(altText || "") + '">';
  }
  return '<span class="' + baseClass + ' ' + baseClass + '-emoji">' + esc(icon || "") + '</span>';
}

/* Retourne une copie indépendante de DEFAULT_QUEST_PROGRESS, utilisée
   à chaque (re)génération de quêtes journalières pour repartir sur
   des compteurs de progression à zéro. */
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