"use strict";
/* ui/tap-rescue.js — v3.296.0 : SECOURS DE TAP sur l'écran Combat (bug iPhone, Seb 18/09/2026).
   Mesuré sur l'iPhone avec le diagnostic v3.295.0 : après une ou deux actions, un tap sur un
   bouton du combat produit touchstart, pointerdown, pointerup et touchend SUR le bouton, mais
   Safari n'envoie jamais le « click ». Les gestionnaires onclick ne sont donc pas appelés.
   Chromium, lui, envoie le click (non reproductible en émulation).

   Correctif de contournement, limité à l'onglet Combat : si un tap net (moins de 10 px de
   déplacement, moins de 800 ms) se termine sur un bouton et qu'aucun click natif n'arrive
   dans les 450 ms, le bouton est cliqué par le code. Si le bouton a été remplacé entre-temps
   par un nouveau rendu, c'est le bouton présent au même endroit qui est cliqué.
   Un click natif qui arrive annule le secours : jamais de double action.
   Chaque secours est tracé dans le diagnostic tactile (ui/debug-touch-view.js). */

var TAP_RESCUE_DELAY_MS = 450;
var TAP_RESCUE_MAX_MOVE_PX = 10;
var TAP_RESCUE_MAX_DURATION_MS = 800;

var TapRescue = {
  start: null,     // { btn, x, y, t }
  pending: null,   // { btn, x, y, timer }
  synthetic: false,
  rescued: 0,

  /* Le secours ne vaut que sur l'écran Combat, où le bug a été mesuré. */
  isActive: function () {
    return typeof game !== "undefined" && game && game.activeTab === "combat";
  },

  buttonAt: function (x, y) {
    if (typeof document === "undefined" || typeof document.elementFromPoint !== "function") return null;
    var el = document.elementFromPoint(x, y);
    return el && el.closest ? el.closest("button") : null;
  },

  point: function (e) {
    var t = (e.changedTouches && e.changedTouches[0]) || e;
    return { x: Number(t.clientX || 0), y: Number(t.clientY || 0) };
  },

  onStart: function (e) {
    if (!this.isActive()) { this.start = null; return; }
    var p = this.point(e);
    var btn = e.target && e.target.closest ? e.target.closest("button") : null;
    this.start = btn ? { btn: btn, x: p.x, y: p.y, t: Date.now() } : null;
  },

  onEnd: function (e) {
    var s = this.start;
    this.start = null;
    if (!s || !this.isActive()) return;
    var p = this.point(e);
    if (Math.abs(p.x - s.x) > TAP_RESCUE_MAX_MOVE_PX || Math.abs(p.y - s.y) > TAP_RESCUE_MAX_MOVE_PX) return;
    if (Date.now() - s.t > TAP_RESCUE_MAX_DURATION_MS) return;
    this.cancel();
    var self = this;
    this.pending = { btn: s.btn, x: p.x, y: p.y, timer: 0 };
    this.pending.timer = setTimeout(function () { self.fire(); }, TAP_RESCUE_DELAY_MS);
  },

  /* Un click natif est arrivé : Safari a fait son travail, pas de secours. */
  onClick: function (e) {
    if (this.synthetic || !this.pending) return;
    var p = this.pending;
    var clicked = e.target && e.target.closest ? e.target.closest("button") : null;
    if (clicked && (clicked === p.btn || clicked === this.buttonAt(p.x, p.y))) { this.cancel(); return; }
    // Click arrivé ailleurs (bouton remplacé -> click sur le parent) : le secours reste armé.
    if (window.TouchDebug && TouchDebug.on) TouchDebug.note("click natif hors du bouton tapé");
  },

  cancel: function () {
    if (this.pending && this.pending.timer) clearTimeout(this.pending.timer);
    this.pending = null;
  },

  /* Le click n'est pas venu : on le donne. Bouton détaché par un rendu -> celui du même endroit. */
  fire: function () {
    var p = this.pending;
    this.pending = null;
    if (!p || !this.isActive()) return false;
    var btn = p.btn;
    var detached = !(btn && btn.isConnected);
    if (detached) btn = this.buttonAt(p.x, p.y);
    if (!btn || btn.disabled) return false;
    this.rescued += 1;
    if (window.TouchDebug && TouchDebug.on) {
      TouchDebug.note("SECOURS n°" + this.rescued + " : click absent" + (detached ? " (bouton remplacé)" : "")
        + " → « " + (btn.textContent || "").trim().replace(/\s+/g, " ").slice(0, 14) + " »");
    }
    this.synthetic = true;
    try { btn.click(); } finally { this.synthetic = false; }
    return true;
  },

  install: function () {
    if (typeof document === "undefined" || !document.addEventListener) return;
    var self = this;
    document.addEventListener("touchstart", function (e) { self.onStart(e); }, { capture: true, passive: true });
    document.addEventListener("touchend", function (e) { self.onEnd(e); }, { capture: true, passive: true });
    document.addEventListener("touchcancel", function () { self.start = null; }, { capture: true, passive: true });
    document.addEventListener("click", function (e) { self.onClick(e); }, true);
  }
};

TapRescue.install();
window.TapRescue = TapRescue;
