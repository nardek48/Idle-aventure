"use strict";
/* ui/tap-rescue.js — v3.296.0 : SECOURS DE TAP sur l'écran Combat (bug iPhone, Seb 18/09/2026).
   Mesuré sur l'iPhone avec le diagnostic v3.295.0 : après une ou deux actions, un tap sur un
   bouton du combat produit touchstart, pointerdown, pointerup et touchend SUR le bouton, mais
   Safari n'envoie jamais le « click ». Les gestionnaires onclick ne sont donc pas appelés.
   Chromium, lui, envoie le click (non reproductible en émulation).

   Correctif de contournement, limité à l'onglet Combat : un tap net (moins de 10 px de
   déplacement, moins de 800 ms) qui se termine sur un bouton le clique aussitôt ; le click
   natif de ce même tap, s'il arrive, est absorbé. Voir v3.296.1 ci-dessous.
   Chaque secours est tracé dans le diagnostic tactile (ui/debug-touch-view.js). */

var TAP_RESCUE_SUPPRESS_MS = 800;     // fenêtre pendant laquelle le click natif du même tap est absorbé
var TAP_RESCUE_SUPPRESS_RADIUS = 30;  // px autour du point de relâcher
var TAP_RESCUE_MAX_MOVE_PX = 10;
var TAP_RESCUE_MAX_DURATION_MS = 800;

/* v3.296.1 (retour Seb : grosse latence à chaque clic) : le secours n'ATTEND plus 450 ms.
   Sur l'iPhone le click natif ne venait presque jamais, donc chaque action payait le délai.
   Le bouton est désormais cliqué dès le relâcher du doigt, et le click natif de ce même tap,
   s'il arrive quand même, est absorbé : une seule action, sans délai. */
var TapRescue = {
  start: null,       // { btn, x, y, t }
  suppress: null,    // { x, y, until } : click natif à absorber
  synthetic: false,
  rescued: 0,
  absorbed: 0,

  /* Limité à l'écran Combat, où le bug a été mesuré. */
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

  /* Tap net sur un bouton : clic immédiat. Bouton remplacé pendant le toucher -> celui du même endroit. */
  onEnd: function (e) {
    var s = this.start;
    this.start = null;
    if (!s || !this.isActive()) return false;
    var p = this.point(e);
    if (Math.abs(p.x - s.x) > TAP_RESCUE_MAX_MOVE_PX || Math.abs(p.y - s.y) > TAP_RESCUE_MAX_MOVE_PX) return false;
    if (Date.now() - s.t > TAP_RESCUE_MAX_DURATION_MS) return false;
    var btn = s.btn, detached = !(btn && btn.isConnected);
    if (detached) btn = this.buttonAt(p.x, p.y);
    if (!btn || btn.disabled) return false;
    this.suppress = { x: p.x, y: p.y, until: Date.now() + TAP_RESCUE_SUPPRESS_MS };
    this.rescued += 1;
    if (window.TouchDebug && TouchDebug.on) {
      TouchDebug.note("tap n°" + this.rescued + (detached ? " (bouton remplacé)" : "")
        + " → « " + (btn.textContent || "").trim().replace(/\s+/g, " ").slice(0, 14) + " »");
    }
    this.synthetic = true;
    try { btn.click(); } finally { this.synthetic = false; }
    return true;
  },

  /* Le click natif du tap déjà joué : absorbé avant d'atteindre le bouton (phase de capture). */
  onClick: function (e) {
    if (this.synthetic || !this.suppress) return false;
    var s = this.suppress;
    if (Date.now() > s.until) { this.suppress = null; return false; }
    var x = Number(e.clientX), y = Number(e.clientY);
    var near = !isFinite(x) || !isFinite(y) || (x === 0 && y === 0)
      || (Math.abs(x - s.x) <= TAP_RESCUE_SUPPRESS_RADIUS && Math.abs(y - s.y) <= TAP_RESCUE_SUPPRESS_RADIUS);
    if (!near) return false;
    this.suppress = null;
    this.absorbed += 1;
    if (e.preventDefault) e.preventDefault();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    if (e.stopPropagation) e.stopPropagation();
    if (window.TouchDebug && TouchDebug.on) TouchDebug.note("click natif absorbé (déjà joué)");
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
