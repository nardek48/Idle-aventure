"use strict";
/* ui/prologue-view.js — v3.570.0 : le prologue (option B de Seb, atelier atelier/prologue.html).
   Planches 1-4 avant la création du héros, 5-6 après ; conception : systemes/introduction/Aethervale_Prologue_v0_2.md. */

/* Les planches (images et textes) sont dans data/prologue.js (PROLOGUE_PLANCHES). */
var PROLOGUE_TEMPS = { avant: [0, 4], apres: [4, 6], tout: [0, 6] }; // avant, après la création ; tout = « Revoir »
var PROLOGUE_MS_LETTRE = 40;                           // choix de Seb : lettre à lettre, vitesse normale, rythme régulier

var PrologueView = {
  active: false,
  temps: null,
  idx: 0,
  fin: null,
  timers: [],

  /* Lance un temps ("avant" ou "apres") ; onEnd est appelé à la fin ou sur « Passer ». */
  play: function (temps, onEnd) {
    var root = PrologueView.root();
    if (!root || !PROLOGUE_TEMPS[temps]) { if (onEnd) onEnd(); return; }
    PrologueView.active = true;
    PrologueView.temps = temps;
    PrologueView.fin = onEnd || null;
    PrologueView.show(PROLOGUE_TEMPS[temps][0]);
  },

  /* Calque plein écran créé à la demande, au-dessus de la création du héros (z-index 3001). */
  root: function () {
    if (typeof document === "undefined" || !document.body) return null;
    var el = document.getElementById("prologue-root");
    if (!el) { el = document.createElement("div"); el.id = "prologue-root"; document.body.appendChild(el); }
    return el;
  },

  src: function (i, wide) { return "images/Prologue/" + PROLOGUE_PLANCHES[i].img + (wide ? "-wide" : "") + ".webp"; },

  show: function (i) {
    PrologueView.clear();
    PrologueView.idx = i;
    var p = PROLOGUE_PLANCHES[i], range = PROLOGUE_TEMPS[PrologueView.temps], dots = "";
    for (var k = range[0]; k < range[1]; k++) dots += '<i class="' + (k === i ? "on" : "") + '"></i>';
    var lignes = p.lignes.map(function (l, n) {
      return '<p class="' + (p.nom === n ? "is-nom" : "") + '">' + prologueLetters(_td(l)) + '</p>';
    }).join("");
    PrologueView.root().innerHTML = '<div class="prologue" role="dialog" aria-modal="true" aria-label="' + esc(_t("Prologue")) + '">'
      + '<div class="prologue-scene" onclick="PrologueView.next()">'
      + '<picture><source media="(min-aspect-ratio: 1/1)" srcset="' + PrologueView.src(i, true) + '">'
      + '<img id="prologue-img" src="' + PrologueView.src(i, false) + '" alt=""></picture>'
      + '<div class="prologue-veil"></div><div class="prologue-text" aria-live="polite">' + lignes + '</div></div>'
      + '<button class="prologue-skip" type="button" onclick="PrologueView.skip()">' + esc(_t("Passer ▸")) + '</button>'
      + '<div class="prologue-foot"><div class="prologue-dots">' + dots + '</div>'
      + '<span class="prologue-hint" id="prologue-hint">' + esc(_t("Toucher pour continuer")) + '</span></div></div>';
    var img = document.getElementById("prologue-img");
    var on = function () { img.classList.add("on"); };
    if (img.complete) requestAnimationFrame(on); else img.onload = img.onerror = on;
    PrologueView.type();
    if (i + 1 < range[1] && typeof Image !== "undefined") { var pre = new Image(); pre.src = PrologueView.src(i + 1, window.matchMedia && matchMedia("(min-aspect-ratio: 1/1)").matches); }
  },

  /* Lettre à lettre, au rythme régulier ; d'un bloc si l'appareil demande moins d'animations. */
  type: function () {
    var ls = document.querySelectorAll("#prologue-root .prologue-l"), t = 700;
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) { PrologueView.revealAll(); return; }
    Array.prototype.forEach.call(ls, function (el, k) {
      var next = ls[k + 1];
      PrologueView.timers.push(setTimeout(function () { el.classList.add("v"); }, t));
      t += PROLOGUE_MS_LETTRE;
      if (next && el.parentNode.parentNode !== next.parentNode.parentNode) t += PROLOGUE_MS_LETTRE * 5; // court temps entre deux lignes
    });
    PrologueView.timers.push(setTimeout(PrologueView.hint, t + 200));
  },

  revealAll: function () {
    PrologueView.clear();
    Array.prototype.forEach.call(document.querySelectorAll("#prologue-root .prologue-l"), function (el) { el.classList.add("v"); });
    PrologueView.hint();
  },

  hint: function () { var h = document.getElementById("prologue-hint"); if (h) h.classList.add("on"); },
  clear: function () { PrologueView.timers.forEach(clearTimeout); PrologueView.timers = []; },

  /* Toucher : d'abord tout le texte, puis la planche suivante (ou la fin du temps). */
  next: function () {
    if (!PrologueView.active) return;
    if (document.querySelector("#prologue-root .prologue-l:not(.v)")) { PrologueView.revealAll(); return; }
    if (PrologueView.idx + 1 < PROLOGUE_TEMPS[PrologueView.temps][1]) PrologueView.show(PrologueView.idx + 1);
    else PrologueView.end();
  },

  skip: function () { if (PrologueView.active) PrologueView.end(); },

  end: function () {
    var cb = PrologueView.fin;
    PrologueView.clear();
    PrologueView.active = false;
    PrologueView.fin = null;
    var root = document.getElementById("prologue-root");
    if (root) root.innerHTML = "";
    if (cb) cb();
  }
};

/* Mots insécables, lettres déjà en place mais invisibles : rien ne saute pendant la frappe. */
function prologueLetters(text) {
  return String(text).split(" ").map(function (mot) {
    return '<span class="prologue-m">' + mot.split("").map(function (c) { return '<span class="prologue-l">' + esc(c) + '</span>'; }).join("") + '</span>';
  }).join(" ");
}

/* Quêtes › Histoire : « Revoir le prologue » rejoue les six planches d'un trait. */
function openPrologueReplay() {
  PrologueView.play("tout", null);
}

if (typeof document !== "undefined") {
  document.addEventListener("keydown", function (e) {
    if (!PrologueView.active) return;
    if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") { e.preventDefault(); PrologueView.next(); }
  });
}

window.PrologueView = PrologueView;
window.prologueLetters = prologueLetters;
window.openPrologueReplay = openPrologueReplay;
