"use strict";
/* ui/fil-rouge-view.js — v3.332.0 (Évolutions, lot F-1) : bulle du fil rouge (v3.396.0 : son
   bouton est devenu une bulle de raccourci, voir ui/hud-dock-view.js).
   F1 (Seb, 24/09/2026) : le bouton REMPLACE le raccourci Ascension du HUD, à côté du
   portrait. Son badge était mort depuis la v3.322.0 (canAscend() rend toujours false) et
   la Mémoire reste ouverte depuis Héros › Résumé ; un choix de Mémoire en attente passe
   par le fil rouge.

   Le HUD se redessine à chaque image (renderHud) : le bouton ne réécrit son contenu que si
   la proposition change (leçon v3.329.0), et FilRouge.get() garde son calcul une seconde. */

var filRougeLastKey = null;
var filRougeShown = []; // propositions affichées dans la bulle : le toucher agit sur CE qui est vu

/* v3.396.0 (lot HUD-1) : le bouton du fil rouge quitte le bandeau du HUD ; c'est une bulle de
   ui/hud-dock-view.js (petite et discrète au calme, plus grande avec « ! » si urgent).
   Nom gardé pour les appels extérieurs. */
function renderHudFilRouge() { if (typeof renderHudDock === "function") renderHudDock(); }
window.renderHudFilRouge = renderHudFilRouge;

function getFilRougeRoot() {
  var root = document.getElementById("filrouge-bubble-root");
  if (!root && document.body && typeof document.createElement === "function") {
    root = document.createElement("div");
    root.id = "filrouge-bubble-root";
    document.body.appendChild(root);
  }
  return root;
}

function openFilRougeBubble() {
  if (!window.FilRouge) return;
  FilRouge.invalidate();
  var a = FilRouge.get();
  var also = FilRouge.also();
  filRougeShown = [a].concat(also);
  var h = '<div class="fr-bubble-bg" onclick="if(event.target===this)closeFilRougeBubble()">';
  h += '<div class="fr-bubble" id="fr-bubble"><div class="fr-kicker">' + _t("Fil rouge") + '</div>';
  h += '<div class="fr-row">' + renderIconOrEmojiHTML(a.icon, "fr-row-ico", _td(a.title)) + '<div><div class="fr-title">' + esc(_td(a.title)) + '</div>'
    + '<div class="fr-reason">' + esc(a.reason) + '</div></div></div>';
  h += '<button type="button" class="settings-btn primary fr-go" onclick="filRougeGo(0)">' + esc(a.goLabel) + '</button>';
  if (also.length) {
    h += '<div class="fr-also"><span>' + _t("Aussi :") + '</span> ' + also.map(function (x, i) {
      return '<button type="button" class="fr-also-btn" onclick="filRougeGo(' + (i + 1) + ')">' + esc(_td(x.title)) + '</button>';
    }).join(" · ") + '</div>';
  }
  h += '</div></div>';
  var root = getFilRougeRoot();
  if (!root) return;
  root.innerHTML = h;
  positionFilRougeBubble();
}

/* Sous le bouton, la flèche sur son centre, sans sortir de l'écran. */
function positionFilRougeBubble() {
  var bub = document.getElementById("fr-bubble");
  var btn = document.getElementById("hud-filrouge-btn");
  if (!bub || !btn || typeof btn.getBoundingClientRect !== "function") return;
  var f = window.DesktopScale ? DesktopScale.factorOf(btn) : 1; // v3.367.0 : mode PC zoomé, px d'écran -> px CSS
  var b = btn.getBoundingClientRect();
  var r = { left: b.left / f, width: b.width / f, bottom: b.bottom / f };
  var vw = (window.innerWidth || 390) / f;
  var w = bub.offsetWidth || 300;
  var cx = r.left + r.width / 2;
  var left = Math.max(8, Math.min(vw - w - 8, cx - w + 40));
  bub.style.left = left + "px";
  bub.style.top = (r.bottom + 10) + "px";
  bub.style.setProperty("--fr-arrow", Math.max(12, Math.min(w - 26, cx - left - 7)) + "px");
}

function closeFilRougeBubble() {
  var root = document.getElementById("filrouge-bubble-root");
  if (root) root.innerHTML = "";
}

/* 0 = proposition principale ; 1, 2 = les « Aussi ». */
function filRougeGo(index) {
  var a = filRougeShown[index || 0];
  filRougeShown = [];
  closeFilRougeBubble();
  if (a && typeof a.go === "function") a.go();
  FilRouge.invalidate();
  filRougeLastKey = null;
}

/* ---------- F-2 (v3.336.0) : un refus qui dit comment avancer ----------
   Remplace le toast simple aux cinq refus retenus : le message, la raison, un bouton.
   Reste 5 s (on doit avoir le temps de lire et de toucher), un toucher à côté le ferme.
   Sans proposition (howTo rend null), retombe sur le toast habituel. */
var HOWTO_TOAST_MS = 5000;
var howToTimer = null;
var howToCurrent = null;

function showHowToToast(message, kind, ctx) {
  var how = (window.FilRouge && typeof FilRouge.howTo === "function") ? FilRouge.howTo(kind, ctx) : null;
  if (!how) { if (typeof showToast === "function") showToast(message, 1800); return null; }
  howToCurrent = how;
  var root = document.getElementById("howto-toast-root");
  if (!root && document.body && typeof document.createElement === "function") {
    root = document.createElement("div");
    root.id = "howto-toast-root";
    document.body.appendChild(root);
  }
  if (!root) return how;
  root.innerHTML = '<div class="howto-toast" role="status">'
    + '<div class="howto-msg">' + esc(message) + '</div>'
    + (how.text && how.text !== message ? '<div class="howto-why">' + esc(_td(how.text)) + '</div>' : '')
    + '<div class="howto-row"><span class="howto-kicker">' + _t("Pour y arriver") + '</span>'
    + '<button type="button" class="howto-go" onclick="howToGo()">' + esc(_td(how.label)) + ' ›</button>'
    + '<button type="button" class="howto-close" aria-label="' + _t("Fermer") + '" onclick="closeHowToToast()">✕</button></div></div>';
  if (howToTimer) clearTimeout(howToTimer);
  howToTimer = setTimeout(closeHowToToast, HOWTO_TOAST_MS);
  return how;
}

function closeHowToToast() {
  if (howToTimer) { clearTimeout(howToTimer); howToTimer = null; }
  var root = document.getElementById("howto-toast-root");
  if (root) root.innerHTML = "";
}

function howToGo() {
  var how = howToCurrent;
  howToCurrent = null;
  closeHowToToast();
  if (how && typeof how.go === "function") how.go();
}

window.showHowToToast = showHowToToast;
window.closeHowToToast = closeHowToToast;
window.howToGo = howToGo;

window.renderHudFilRouge = renderHudFilRouge;
window.openFilRougeBubble = openFilRougeBubble;
window.closeFilRougeBubble = closeFilRougeBubble;
window.filRougeGo = filRougeGo;
