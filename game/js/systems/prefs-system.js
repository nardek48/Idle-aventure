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
     howtoWarehouseFull (absente) v3.410.0 : l'explication « Entrepôt plein » a déjà été montrée (une seule fois)
     tabletPortrait "zoom" v3.406.0 : tablette tenue en portrait — "zoom" (téléphone agrandi) ou "rail"
                         (format tablette, menu à gauche) ; lu par ui/desktop-scale.js
     grimEpure    true   v3.473.0 : combat épuré en Grimoire (atelier grimoire-epure.html), Paramètres › Jeu
     journalTest  false  v3.437.0 : journal de test (main/journal-test.js), activé dans Paramètres › Appareil ; v3.753.0 : true en Alpha
     desInstant   false  v3.756.0 (Seb 09/11, A + B) : jets de dés des Petites Aventures sans roulement (ui/pa2-view.js)
     alphaIntroSeen, alphaFinSeen (absentes) v3.753.0 : fenêtres de l'Alpha déjà montrées (ui/alpha-view.js)
     textSize     "normal" v3.538.0 (audit ERG-11) : « grand » agrandit pages, feuilles et fenêtres de 12 % (ui/desktop-scale.js)
     chronique    true   v3.503.0 (grand écran) : Chronique ouverte à droite du format large (ui/chronique-view.js)
     chaosUnlocked (absente) v3.774.0 (Seb 12/11) : un héros a fini l'Histoire, la variante du Chaos s'ouvre à la création
     forgeMondesSeen (absente) Forge des mondes (Seb 07/11) : fenêtre « La Forge a changé » montrée ; v3.783.0 : fenêtre retirée, plus lue
     shopBuyAmount (absente) audit 04/11 (SAVE-17) : quantité d'entraînement (1, 10, 25 ou -1 = MAX), texte
     lang         "fr"   v3.368.0 : langue du jeu (core/i18n.js) ; texte, lu par getValue/setValue.
                         v3.376.0 : absente au premier lancement, elle est fixée par I18n.firstLang() (D3) */

var PREFS_STORAGE_KEY = (typeof STORAGE_PREFIX === "string" ? STORAGE_PREFIX : "") + "aethervale_prefs"; // v3.752.0 : préfixe de l'Alpha
var PREFS_DEFAULTS = { filRouge: true, bossMoments: true, installHint: true, logTotals: true, lang: "fr", tabletPortrait: "zoom", journalTest: !!(typeof isAlphaEdition === "function" && isAlphaEdition()), grimEpure: true, desInstant: false, chronique: true, textSize: "normal" };

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

  /* v3.376.0 : la clé a-t-elle été enregistrée sur cet appareil ? (sinon getValue rend le défaut) */
  has: function (key) {
    return Object.prototype.hasOwnProperty.call(this._load(), key);
  },

  setValue: function (key, value) {
    var data = this._load();
    data[key] = String(value);
    this._save(data);
  },

  _save: function (data) {
    try { if (window.localStorage) localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(data)); } catch (e) { noteErreur("prefs-system._save", e); /* mode privé : garde en mémoire */ }
  }
};

window.Prefs = Prefs;
