"use strict";
/* systems/prefs-system.js — v3.332.0 (Évolutions) : préférences d'AFFICHAGE, propres à
   l'appareil et non au héros. Stockées à part (localStorage), hors de la sauvegarde :
   elles ne voyagent pas avec un export et ne passent pas par save-system.js.

   Clés connues (valeur par défaut) :
     filRouge     true   bouton du fil rouge dans le HUD (conception F4)
     bossMoments  true   mises en scène des boss (conception B4) */

var PREFS_STORAGE_KEY = "aethervale_prefs";
var PREFS_DEFAULTS = { filRouge: true, bossMoments: true };

var Prefs = {
  _cache: null,

  /* Lecture paresseuse, tolérante : un stockage absent ou illisible rend les valeurs par défaut. */
  _load: function () {
    if (this._cache) return this._cache;
    var raw = null;
    try { raw = window.localStorage ? localStorage.getItem(PREFS_STORAGE_KEY) : null; } catch (e) { raw = null; }
    var data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch (e) { data = {}; }
    if (!data || typeof data !== "object") data = {};
    this._cache = data;
    return data;
  },

  get: function (key) {
    var data = this._load();
    if (typeof data[key] === "boolean") return data[key];
    return PREFS_DEFAULTS.hasOwnProperty(key) ? PREFS_DEFAULTS[key] : null;
  },

  set: function (key, value) {
    var data = this._load();
    data[key] = !!value;
    try { if (window.localStorage) localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* mode privé : garde en mémoire */ }
  }
};

window.Prefs = Prefs;
