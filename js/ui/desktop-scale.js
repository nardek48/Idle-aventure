"use strict";
/* ui/desktop-scale.js — v3.367.0 (v3.406.0 : format tablette, voir plus bas) : MODE PC (niveau A du chantier grand écran, Seb 28/09/2026).
   Sur un écran d'ordinateur, la colonne mobile (390 px) est agrandie d'un bloc par `zoom`
   sur <html> : tout garde ses proportions de téléphone, rien n'est remis en page.
   v3.406.0 : la tablette a désormais ses dispositions (voir plus bas). */

/* v3.406.0 : FORMAT TABLETTE (niveau B, décisions Seb 01/10/2026) — une seule grande fenêtre
   d'environ 1 180 px, menu en colonne à gauche, HUD en bandeau ; le même affichage sur PC et
   sur tablette en paysage. Trois dispositions, posées en classes sur <html> :
   - téléphone : rien (zoom 1) ;
   - "column"  : colonne téléphone agrandie (html.pc-mode) — tablette en portrait, réglage « zoom » ;
   - "wide"    : format tablette (html.pc-mode.wide-mode) — PC, tablette en paysage, et tablette
                 en portrait si le réglage vaut « rail ». Sur tablette, pas de zoom : la fenêtre
                 suit la largeur de l'écran jusqu'à 1 180 px. */
var DESKTOP_MIN_WIDTH = 1000;      // px d'écran réels : en dessous, jamais de mode PC
var DESKTOP_REF_HEIGHT = 720;      // hauteur « utile » visée pour la colonne, en px de jeu
var DESKTOP_COLUMN_W = 390;        // largeur de la colonne mobile (#hud, #game-area)
var DESKTOP_ZOOM_MAX = 2.4;
var DESKTOP_ZOOM_STEP = 0.05;
var WIDE_W = 1180;                 // largeur de la fenêtre au format tablette, en px de jeu
var WIDE_REF_HEIGHT = 780;         // hauteur visée pour cette fenêtre sur PC
var TABLET_MIN_SIDE = 700;         // petit côté minimal d'une tablette (un téléphone n'y arrive pas)
var TABLET_WIDE_MIN_W = 900;       // largeur minimale pour le format tablette sans zoom

var DesktopScale = {
  zoom: 1,
  active: false,
  mode: "phone",

  /* Ordinateur = souris ou pavé (survol + pointeur fin) sur un écran assez large.
     Un iPad en paysage (pointeur grossier) n'en est pas un : il passe par isTablet. */
  isDesktop: function () {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(min-width: " + DESKTOP_MIN_WIDTH + "px) and (hover: hover) and (pointer: fine)").matches;
  },

  /* Tablette = écran tactile dont le petit côté dépasse celui d'un téléphone. */
  isTablet: function () {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    var w = window.innerWidth || 0, h = window.innerHeight || 0;
    return window.matchMedia("(pointer: coarse)").matches && Math.min(w, h) >= TABLET_MIN_SIDE;
  },

  portraitChoice: function () {
    var v = window.Prefs && typeof Prefs.getValue === "function" ? Prefs.getValue("tabletPortrait") : null;
    return v === "rail" ? "rail" : "zoom";
  },

  computeMode: function () {
    var w = window.innerWidth || 0, h = window.innerHeight || 0;
    if (DesktopScale.isDesktop()) return "wide";
    if (!DesktopScale.isTablet()) return "phone";
    if (w > h) return w >= TABLET_WIDE_MIN_W ? "wide" : "column";
    return DesktopScale.portraitChoice() === "rail" ? "wide" : "column";
  },

  /* Zoom automatique.
     - column : la colonne remplit la hauteur sans déborder en largeur (PC v3.367.0, tablette en portrait) ;
     - wide sur PC : la fenêtre de 1 180 px remplit la hauteur sans déborder ; sur tablette : 1. */
  computeZoom: function (mode) {
    var h = window.innerHeight || 0, w = window.innerWidth || 0, z = 1;
    if (mode === "column") z = Math.min(h / (DesktopScale.isDesktop() ? DESKTOP_REF_HEIGHT : 844), (w * 0.94) / DESKTOP_COLUMN_W, DESKTOP_ZOOM_MAX);
    else if (mode === "wide" && DesktopScale.isDesktop()) z = Math.min(h / WIDE_REF_HEIGHT, w / (WIDE_W + 20), DESKTOP_ZOOM_MAX);
    z = Math.floor(z / DESKTOP_ZOOM_STEP) * DESKTOP_ZOOM_STEP;
    return Math.max(1, Math.round(z * 100) / 100);
  },

  apply: function () {
    var root = document.documentElement;
    var mode = DesktopScale.computeMode();
    var z = mode === "phone" ? 1 : DesktopScale.computeZoom(mode);
    var changed = mode !== DesktopScale.mode;
    DesktopScale.active = mode !== "phone";
    DesktopScale.mode = mode;
    DesktopScale.zoom = z;
    root.classList.toggle("pc-mode", mode !== "phone");
    root.classList.toggle("wide-mode", mode === "wide");
    root.style.setProperty("--pc-zoom", String(z));
    // Le HUD et la page se redessinent pour leur nouvelle disposition (mesures, bulles)
    if (changed && typeof renderPanel === "function" && window.game) { try { renderPanel(); } catch (e) {} }
  },

  /* Réglage de la tablette en portrait (Paramètres › Affichage) */
  setPortraitChoice: function (v) {
    if (window.Prefs && typeof Prefs.setValue === "function") Prefs.setValue("tabletPortrait", v === "rail" ? "rail" : "zoom");
    DesktopScale.apply();
    if (typeof renderPanel === "function") renderPanel();
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
