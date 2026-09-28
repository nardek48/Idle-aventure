"use strict";
/* systems/prefs-system.js — v3.332.0 (Évolutions) : préférences d'AFFICHAGE, propres à
   l'appareil et non au héros. Stockées à part (localStorage), hors de la sauvegarde :
   elles ne voyagent pas avec un export et ne passent pas par save-system.js.

   Clés connues (valeur par défaut) :
     filRouge     true   bouton du fil rouge dans le HUD (conception F4)
     bossMoments  true   mises en scène des boss (conception B4)
     installHint  true   v3.359.0 : bouton « Installer le jeu » sur l'écran titre ; « Plus tard » le passe à
                         false (l'installation reste proposée dans Paramètres › Application)
     logTotals    true   v3.365.0 : Bilan de la partie ouvert en tête du Journal
     lang         "fr"   v3.368.0 : langue du jeu (core/i18n.js) ; texte, lu par getValue/setValue */

var PREFS_STORAGE_KEY = "aethervale_prefs";
var PREFS_DEFAULTS = { filRouge: true, bossMoments: true, installHint: true, logTotals: true, lang: "fr" };

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
    this._save(data);
  },

  /* v3.368.0 : préférence en texte (langue). get/set restent réservés aux interrupteurs. */
  getValue: function (key) {
    var data = this._load();
    if (typeof data[key] === "string") return data[key];
    return PREFS_DEFAULTS.hasOwnProperty(key) ? PREFS_DEFAULTS[key] : null;
  },

  setValue: function (key, value) {
    var data = this._load();
    data[key] = String(value);
    this._save(data);
  },

  _save: function (data) {
    try { if (window.localStorage) localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* mode privé : garde en mémoire */ }
  }
};

window.Prefs = Prefs;
