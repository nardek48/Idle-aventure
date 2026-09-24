"use strict";
/* ui/fil-rouge-view.js — v3.332.0 (Évolutions, lot F-1) : bouton du fil rouge et sa bulle.
   F1 (Seb, 24/09/2026) : le bouton REMPLACE le raccourci Ascension du HUD, à côté du
   portrait. Son badge était mort depuis la v3.322.0 (canAscend() rend toujours false) et
   la Mémoire reste ouverte depuis Héros › Résumé ; un choix de Mémoire en attente passe
   par le fil rouge.

   Le HUD se redessine à chaque image (renderHud) : le bouton ne réécrit son contenu que si
   la proposition change (leçon v3.329.0), et FilRouge.get() garde son calcul une seconde. */

var filRougeLastKey = null;
var filRougeShown = []; // propositions affichées dans la bulle : le toucher agit sur CE qui est vu

function buildHudFilRougeButtonHTML() {
  return '<button type="button" class="nb-hud-bag-btn hud-fr-btn" id="hud-filrouge-btn" onclick="openFilRougeBubble()" aria-label="Fil rouge : que faire maintenant">'
    + '<span class="hud-fr-disc" id="hud-filrouge-disc"></span><span class="hud-fr-thread"></span>'
    + '<span id="hud-filrouge-badge" class="nb-hud-bag-badge" style="display:none;">!</span></button>';
}

/* Appelé par renderHud à chaque image. */
function renderHudFilRouge() {
  var btn = document.getElementById("hud-filrouge-btn");
  if (!btn) return;
  var show = !window.Prefs || Prefs.get("filRouge");
  btn.style.display = show ? "" : "none";
  if (!show || !window.FilRouge) return;

  var a = FilRouge.get();
  var key = a.id + "|" + a.icon + "|" + (a.urgent ? 1 : 0);
  if (key === filRougeLastKey) return;
  var changed = filRougeLastKey !== null && filRougeLastKey.split("|")[0] !== a.id;
  filRougeLastKey = key;

  var disc = document.getElementById("hud-filrouge-disc");
  if (disc) disc.innerHTML = renderIconOrEmojiHTML(a.icon, "hud-fr-ico", a.title);
  var badge = document.getElementById("hud-filrouge-badge");
  if (badge) badge.style.display = a.urgent ? "flex" : "none";
  // Une seule lueur quand la proposition change, jamais en boucle (pas de pression)
  if (changed) { btn.classList.remove("is-new"); void btn.offsetWidth; btn.classList.add("is-new"); }
}

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
  h += '<div class="fr-bubble" id="fr-bubble"><div class="fr-kicker">Fil rouge</div>';
  h += '<div class="fr-row">' + renderIconOrEmojiHTML(a.icon, "fr-row-ico", a.title) + '<div><div class="fr-title">' + esc(a.title) + '</div>'
    + '<div class="fr-reason">' + esc(a.reason) + '</div></div></div>';
  h += '<button type="button" class="settings-btn primary fr-go" onclick="filRougeGo(0)">' + esc(a.goLabel) + '</button>';
  if (also.length) {
    h += '<div class="fr-also"><span>Aussi :</span> ' + also.map(function (x, i) {
      return '<button type="button" class="fr-also-btn" onclick="filRougeGo(' + (i + 1) + ')">' + esc(x.title) + '</button>';
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
  var r = btn.getBoundingClientRect();
  var vw = window.innerWidth || 390;
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
    + (how.text && how.text !== message ? '<div class="howto-why">' + esc(how.text) + '</div>' : '')
    + '<div class="howto-row"><span class="howto-kicker">Pour y arriver</span>'
    + '<button type="button" class="howto-go" onclick="howToGo()">' + esc(how.label) + ' ›</button>'
    + '<button type="button" class="howto-close" aria-label="Fermer" onclick="closeHowToToast()">✕</button></div></div>';
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

window.buildHudFilRougeButtonHTML = buildHudFilRougeButtonHTML;
window.renderHudFilRouge = renderHudFilRouge;
window.openFilRougeBubble = openFilRougeBubble;
window.closeFilRougeBubble = closeFilRougeBubble;
window.filRougeGo = filRougeGo;
