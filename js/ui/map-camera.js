"use strict";
/* ui/map-camera.js — v3.394.0 : moteur de caméra commun aux cartes illustrées.
   Sorti de living-map-view.js (v3.292.0, ateliers A1-A3) et généralisé aux cartes
   rectangulaires (Petites Aventures v2, atelier plein écran validé par Seb le 30/09/2026).

   Une caméra = une fenêtre (vpId) et une scène (stageId) de largeur view.w, de hauteur
   view.w × ratio(), déplacée par translate3d(view.tx, view.ty).
   - Couvrant : la carte remplit toute la fenêtre (jamais de bandes noires) ; zoom max ×zoomMax.
   - Marges : la carte peut descendre de topSlack() sous l'en-tête ; bottomSlack() réduit la
     zone utile (volet, feuille ouverte) sans jamais laisser de bande noire.
   - Gestes : glisser (avec élan), pincer, double tap (×1,8, au max retour Couvrant), molette.
     Écoutés sur document (délégation) : un nouveau rendu de la carte ne casse pas un geste.
   - Mesures en px CSS : ramenées par DesktopScale (mode PC zoomé, v3.367.0). */

var MAP_CAM_TAP_SLOP = 8;        // px avant qu'un appui devienne un glissé
var MAP_CAM_DOUBLE_TAP_MS = 300;

var MapCamera = {
  list: [],

  /* opts : vpId, stageId, view ({ w, tx, ty }, gardé par l'appelant), ratio(), zoomMax(),
     topSlack(), bottomSlack(), onSettle() (fin de mouvement), onReset() (double tap au max),
     onResize(stage) (taille changée), ignoreButtonTaps (un tap sur un bouton ne compte pas pour le double tap),
     fitCenter (carte pas plus haute que la zone utile : centrée verticalement). */
  create: function (opts) {
    var cam = new MapCameraInstance(opts);
    MapCamera.list.push(cam);
    return cam;
  },
  // Caméra dont la fenêtre contient la cible du geste
  forTarget: function (t) {
    if (!t || !t.closest) return null;
    for (var i = 0; i < MapCamera.list.length; i++) {
      if (t.closest("#" + MapCamera.list[i].opts.vpId)) return MapCamera.list[i];
    }
    return null;
  },
  scaleOf: function (el) { return window.DesktopScale ? DesktopScale.factorOf(el) : 1; }
};
window.MapCamera = MapCamera;

function MapCameraInstance(opts) {
  this.opts = opts;
  this.view = opts.view || { w: 0, tx: 0, ty: 0 };
  this.gesture = { pts: {}, mode: null, start: null, moved: false, suppressClick: false, lastTap: 0, vel: { x: 0, y: 0 }, lastMove: 0, raf: 0, geo: null, frame: 0 };
}

MapCameraInstance.prototype = {
  vp: function () { return document.getElementById(this.opts.vpId); },
  stage: function () { return document.getElementById(this.opts.stageId); },
  ratio: function () { return this.opts.ratio ? Number(this.opts.ratio()) || 1 : 1; },
  top: function () { return this.opts.topSlack ? Number(this.opts.topSlack()) || 0 : 0; },
  bottom: function () { return this.opts.bottomSlack ? Number(this.opts.bottomSlack()) || 0 : 0; },
  zoomMax: function () { return this.opts.zoomMax ? Number(this.opts.zoomMax()) || 2 : 2; },

  /* Couvrant : la carte remplit la fenêtre entière (le volet se pose par-dessus). */
  coverW: function () { var vp = this.vp(); return vp ? Math.max(vp.clientWidth, vp.clientHeight / this.ratio()) : 0; },
  maxW: function () { return this.coverW() * this.zoomMax(); },

  /* Géométrie figée pendant un geste (la relire à chaque mouvement forçait un recalcul de page). */
  geo: function () {
    if (this.gesture.geo) return this.gesture.geo;
    var vp = this.vp();
    return vp ? { W: vp.clientWidth, H: vp.clientHeight - this.bottom(), rect: vp.getBoundingClientRect(), f: MapCamera.scaleOf(vp) } : null;
  },
  local: function (e) { var g = this.gesture.geo || this.geo(), r = g.rect, f = g.f || 1; return { x: (e.clientX - r.left) / f, y: (e.clientY - r.top) / f }; },

  /* Bornes : la carte ne quitte jamais la fenêtre ; elle peut descendre de top() sous
     l'en-tête et remonter au-dessus de la zone réservée en bas. */
  clamp: function () {
    var geo = this.geo(); if (!geo) return;
    var v = this.view, W = geo.W, H = geo.H, w = v.w, h = w * this.ratio();
    v.tx = w <= W ? (W - w) / 2 : Math.min(0, Math.max(W - w, v.tx));
    // fitCenter (carte vivante, comportement d'origine) : carte pas plus haute que la zone → centrée.
    // Sinon elle peut toujours descendre sous l'en-tête, même en Couvrant (atelier PA, 30/09/2026).
    if (this.opts.fitCenter && h <= H) v.ty = (H - h) / 2;
    else v.ty = Math.min(this.top(), Math.max(H - h, v.ty));
  },
  /* La taille n'est réécrite que si elle change : un glissé ne touche que la translation. */
  apply: function (anim) {
    var st = this.stage(), v = this.view, self = this; if (!st) return;
    st.classList.toggle("is-anim", !!anim);
    st.style.visibility = "";
    var wpx = v.w + "px";
    if (st.style.width !== wpx) {
      st.style.width = wpx; st.style.height = (v.w * this.ratio()) + "px";
      if (this.opts.onResize) this.opts.onResize(st);
    }
    st.style.transform = "translate3d(" + v.tx + "px," + v.ty + "px,0)";
    if (anim) setTimeout(function () { self.settle(); }, 300); else if (!this.gesture.mode) this.settle();
  },
  settle: function () { if (this.opts.onSettle) this.opts.onSettle(); },
  schedule: function () {
    var g = this.gesture, self = this;
    if (g.frame || typeof requestAnimationFrame !== "function") { if (!g.frame) this.apply(false); return; }
    g.frame = requestAnimationFrame(function () { g.frame = 0; self.apply(false); });
  },
  zoomAt: function (nw, px, py, anim) {
    var v = this.view;
    nw = Math.max(this.coverW(), Math.min(this.maxW(), nw));
    var u = (px - v.tx) / v.w, q = (py - v.ty) / v.w;
    v.w = nw; v.tx = px - u * nw; v.ty = py - q * nw;
    this.clamp(); this.apply(anim);
  },
  /* Place un point de la carte (fractions 0-1 de sa largeur et de sa hauteur) au centre de la
     zone utile : sous l'en-tête, au-dessus de la zone réservée en bas. */
  centerOn: function (xf, yf, anim) {
    var vp = this.vp(); if (!vp) return;
    var v = this.view, W = vp.clientWidth, H = vp.clientHeight - this.bottom();
    v.tx = W / 2 - xf * v.w;
    v.ty = (this.top() + H) / 2 - yf * v.w * this.ratio();
    this.clamp(); this.apply(anim);
  },
  /* Après un rendu : bornes de zoom relues (l'écran a pu changer), position bornée. */
  refit: function () {
    var v = this.view;
    v.w = Math.max(this.coverW(), Math.min(this.maxW(), v.w || 0));
    this.clamp(); this.apply(false);
  },
  resetCover: function () { this.view.w = this.coverW(); },

  /* ---------- Gestes ---------- */
  pts: function () { var p = this.gesture.pts; return Object.keys(p).map(function (k) { return p[k]; }); },
  begin: function () {
    var p = this.pts(), g = this.gesture, v = this.view;
    if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(g.raf);
    if (p.length >= 2) {
      g.mode = "pinch";
      g.start = { d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), m: { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 }, w: v.w, tx: v.tx, ty: v.ty };
    } else if (p.length === 1) {
      g.mode = "pan"; g.start = { x: p[0].x, y: p[0].y, tx: v.tx, ty: v.ty };
      g.vel = { x: 0, y: 0 }; g.lastMove = performance.now();
    }
  },
  onDown: function (e) {
    var g = this.gesture;
    if (!this.pts().length) { g.geo = null; g.geo = this.geo(); } // lue une fois, au premier doigt
    g.pts[e.pointerId] = this.local(e);
    if (this.pts().length === 1) { g.moved = false; g.suppressClick = false; }
    this.begin();
  },
  onMove: function (e) {
    var g = this.gesture, v = this.view;
    if (!g.pts[e.pointerId] || !this.vp()) return;
    var prev = g.pts[e.pointerId]; g.pts[e.pointerId] = this.local(e);
    var p = this.pts(), s = g.start;
    if (g.mode === "pan" && p.length === 1) {
      var dx = p[0].x - s.x, dy = p[0].y - s.y;
      if (!g.moved && Math.hypot(dx, dy) < MAP_CAM_TAP_SLOP) return;
      g.moved = true;
      var now = performance.now(), dt = Math.max(1, now - g.lastMove);
      g.vel = { x: (p[0].x - prev.x) / dt, y: (p[0].y - prev.y) / dt }; g.lastMove = now;
      v.tx = s.tx + dx; v.ty = s.ty + dy; this.clamp(); this.schedule();
    } else if (g.mode === "pinch" && p.length >= 2) {
      g.moved = true;
      var m = { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 };
      var f = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) / s.d;
      var nw = Math.max(this.coverW(), Math.min(this.maxW(), s.w * f));
      var u = (s.m.x - s.tx) / s.w, q = (s.m.y - s.ty) / s.w;   // point de la carte sous les doigts au départ
      v.w = nw; v.tx = m.x - u * nw; v.ty = m.y - q * nw;
      this.clamp(); this.schedule();
    }
  },
  onUp: function (e) {
    var g = this.gesture, v = this.view;
    if (!g.pts[e.pointerId]) return;
    var up = g.pts[e.pointerId]; delete g.pts[e.pointerId];
    if (g.moved) { g.suppressClick = true; setTimeout(function () { g.suppressClick = false; }, 0); }
    if (this.pts().length) { this.begin(); return; }
    if (g.frame && typeof cancelAnimationFrame === "function") { cancelAnimationFrame(g.frame); g.frame = 0; }
    var momentum = g.mode === "pan" && g.moved && performance.now() - g.lastMove < 60;
    if (!momentum) { g.geo = null; g.mode = null; this.apply(false); }
    if (momentum) this.momentum();
    else if (!g.moved && !(this.opts.ignoreButtonTaps && e.target && e.target.closest && e.target.closest("button"))) {
      var now = performance.now();
      if (now - g.lastTap < MAP_CAM_DOUBLE_TAP_MS) {   // double tap : ×1,8 ; au max, retour Couvrant
        g.lastTap = 0;
        if (v.w >= this.maxW() - 1) {
          v.w = this.coverW();
          if (this.opts.onReset) this.opts.onReset(); else { this.clamp(); this.apply(true); }
        } else this.zoomAt(v.w * 1.8, up.x, up.y, true);
      } else g.lastTap = now;
    }
    g.mode = null;
  },
  /* Élan : la carte continue sur sa lancée et ralentit. */
  momentum: function () {
    var g = this.gesture, v = this.view, self = this, s = { x: g.vel.x * 16, y: g.vel.y * 16 };
    g.mode = null;
    function step() {
      s.x *= 0.92; s.y *= 0.92;
      if ((Math.abs(s.x) < 0.3 && Math.abs(s.y) < 0.3) || !self.vp()) { g.geo = null; self.settle(); return; }
      v.tx += s.x; v.ty += s.y; self.clamp(); self.apply(false);
      g.raf = requestAnimationFrame(step);
    }
    g.raf = requestAnimationFrame(step);
  },
  onWheel: function (e) {
    e.preventDefault();
    var pt = this.local(e);
    this.zoomAt(this.view.w * Math.pow(1.0015, -e.deltaY), pt.x, pt.y, false);
  }
};

/* Délégation : un seul jeu d'écouteurs pour toutes les caméras. */
if (typeof document !== "undefined" && document.addEventListener) {
  var mapCamActive = null; // caméra du geste en cours (le doigt peut sortir de la fenêtre)
  document.addEventListener("pointerdown", function (e) {
    var cam = MapCamera.forTarget(e.target); if (!cam) return;
    mapCamActive = cam; cam.onDown(e);
  });
  document.addEventListener("pointermove", function (e) { if (mapCamActive) mapCamActive.onMove(e); });
  var mapCamUp = function (e) {
    if (!mapCamActive) return;
    var cam = mapCamActive; cam.onUp(e);
    if (!cam.pts().length) mapCamActive = null;
  };
  document.addEventListener("pointerup", mapCamUp);
  document.addEventListener("pointercancel", mapCamUp);
  document.addEventListener("wheel", function (e) { var cam = MapCamera.forTarget(e.target); if (cam) cam.onWheel(e); }, { passive: false });
  /* iOS : pas de zoom de la page entière par pincement sur une carte. */
  document.addEventListener("gesturestart", function (e) {
    for (var i = 0; i < MapCamera.list.length; i++) if (MapCamera.list[i].vp()) { e.preventDefault(); return; }
  });
}
