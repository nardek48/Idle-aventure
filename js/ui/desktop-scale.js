"use strict";
/* ui/desktop-scale.js — v3.367.0 : MODE PC (niveau A du chantier grand écran, Seb 28/09/2026).
   Sur un écran d'ordinateur, la colonne mobile (390 px) est agrandie d'un bloc par `zoom`
   sur <html> : tout garde ses proportions de téléphone, rien n'est remis en page.
   Le mobile et la tablette tactile ne sont jamais touchés (classe absente, zoom 1). */

var DESKTOP_MIN_WIDTH = 1000;      // px d'écran réels : en dessous, jamais de mode PC
var DESKTOP_REF_HEIGHT = 720;      // hauteur « utile » visée pour la colonne, en px de jeu
var DESKTOP_COLUMN_W = 390;        // largeur de la colonne mobile (#hud, #game-area)
var DESKTOP_ZOOM_MAX = 2.4;
var DESKTOP_ZOOM_STEP = 0.05;

var DesktopScale = {
  zoom: 1,
  active: false,

  /* Ordinateur = souris ou pavé (survol + pointeur fin) sur un écran assez large.
     Un iPad en paysage (pointeur grossier) reste en mode mobile. */
  isDesktop: function () {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(min-width: " + DESKTOP_MIN_WIDTH + "px) and (hover: hover) and (pointer: fine)").matches;
  },

  /* Zoom automatique : la colonne remplit la hauteur de la fenêtre, sans déborder en largeur. */
  computeZoom: function () {
    var h = window.innerHeight || 0, w = window.innerWidth || 0;
    var z = Math.min(h / DESKTOP_REF_HEIGHT, (w * 0.9) / DESKTOP_COLUMN_W, DESKTOP_ZOOM_MAX);
    z = Math.floor(z / DESKTOP_ZOOM_STEP) * DESKTOP_ZOOM_STEP;
    return Math.max(1, Math.round(z * 100) / 100);
  },

  apply: function () {
    var root = document.documentElement;
    var on = DesktopScale.isDesktop();
    var z = on ? DesktopScale.computeZoom() : 1;
    DesktopScale.active = on;
    DesktopScale.zoom = z;
    root.classList.toggle("pc-mode", on);
    root.style.setProperty("--pc-zoom", String(z));
  },

  /* Facteur réel entre px d'écran (clientX, getBoundingClientRect) et px CSS d'un élément.
     Mesuré sur l'élément lui-même : juste quel que soit le moteur (Chrome, Firefox, Safari). */
  factorOf: function (el) {
    if (!el || typeof el.getBoundingClientRect !== "function" || !el.offsetWidth) return 1;
    var f = el.getBoundingClientRect().width / el.offsetWidth;
    return f > 0 ? f : 1;
  },

  init: function () {
    if (typeof window.addEventListener !== "function") return; // harnais Node : pas de fenêtre réelle
    DesktopScale.apply();
    var t = 0;
    window.addEventListener("resize", function () {
      clearTimeout(t);
      t = setTimeout(DesktopScale.apply, 120); // un seul recalcul par redimensionnement
    });
  }
};

window.DesktopScale = DesktopScale;
if (typeof document !== "undefined" && document.documentElement) DesktopScale.init();
