"use strict";
/* core/i18n.js — v3.368.0 : SOCLE MULTILANGUE (lot L-0, conception i18n v1.0, décisions Seb du 28/09/2026).
   D1 : le texte français EST la clé. On écrit _t("Santé du Héros") ; js/lang/en.js associe chaque
        texte français à son anglais. Traduction absente : le français s'affiche, jamais une clé brute.
   D2 : changer de langue relance le jeu (après sauvegarde).
   D3 : v3.375.0, choix « English (beta) » dans les Paramètres ; v3.376.0 (Forêt traduite), un appareil
        neuf démarre dans la langue du navigateur (firstLang).
   Écriture : _t(texte), _t(texte, contexte), _t(texte, {params}), _tn(n, singulier, pluriel).
   La sauvegarde reste en français (noms d'objets, trophées) : traduits à l'affichage seulement. */

var I18N_DEFAULT_LANG = "fr";
var I18N_PSEUDO_LANG = "xx";          // langue de test : tout texte passé par _t() s'affiche entre ⟦ ⟧
var I18N_LANGS = {                    // langues proposées (xx n'apparaît que dans l'Admin)
  fr: { label: "Français", locale: "fr-FR" },
  en: { label: "English", locale: "en-GB" },
  xx: { label: "Pseudo-langue (test)", locale: "fr-FR" }
};
var I18N_CTX_SEP = "|";               // "contexte|texte" : même mot français, deux sens
var I18N_PLURAL_SEP = "||";           // "singulier||pluriel" : clé d'une entrée _tn()

var I18n = {
  _lang: null,
  dicts: {},       // { en: { "texte fr": "text en", "ctx|texte": "…", "un||plusieurs": ["one", "other"] } }
  _plural: {},     // cache Intl.PluralRules par langue

  /* Langue courante, lue une fois dans Prefs (préférence d'appareil, hors sauvegarde). */
  lang: function () {
    if (this._lang) return this._lang;
    if (!window.Prefs || typeof Prefs.getValue !== "function") return I18N_DEFAULT_LANG; // Prefs pas encore chargé : rien de figé
    var l;
    if (typeof Prefs.has === "function" && !Prefs.has("lang")) {   // v3.376.0 (D3) : premier lancement
      l = this.firstLang();
      Prefs.setValue("lang", l);                                     // fixée une fois : le joueur la change dans Paramètres
    } else l = Prefs.getValue("lang");
    this._lang = I18N_LANGS.hasOwnProperty(l) ? l : I18N_DEFAULT_LANG;
    if (typeof document !== "undefined" && document.documentElement) document.documentElement.lang = this._lang === I18N_PSEUDO_LANG ? "fr" : this._lang;
    return this._lang;
  },

  /* v3.376.0 (D3) : langue d'un appareil qui n'en a jamais choisi.
     - une partie existe déjà (clé quest_idle_save*) : français, le joueur jouait en français avant le choix ;
     - sinon, langue du navigateur : français si elle commence par « fr », anglais pour toutes les autres. */
  firstLang: function () {
    try {
      var ls = window.localStorage;
      for (var i = 0; ls && i < ls.length; i++) if (/^quest_idle_save/.test(ls.key(i) || "")) return I18N_DEFAULT_LANG;
    } catch (e) { return I18N_DEFAULT_LANG; }
    var nav = window.navigator || {};
    var code = String((nav.languages && nav.languages[0]) || nav.language || "");
    return !code || /^fr\b/i.test(code) ? I18N_DEFAULT_LANG : "en";
  },

  locale: function () { return I18N_LANGS[this.lang()].locale; },

  /* Un fichier de langue s'ajoute par register ; plusieurs appels se cumulent (un fichier par lot). */
  register: function (lang, dict) {
    var d = this.dicts[lang] || (this.dicts[lang] = {});
    Object.keys(dict || {}).forEach(function (k) { d[k] = dict[k]; });
  },

  /* Remplace {nom} par params.nom ; un paramètre absent laisse {nom} visible (repérable au test). */
  fill: function (s, params) {
    if (!params || typeof s !== "string") return s;
    return s.replace(/\{(\w+)\}/g, function (m, k) { return params.hasOwnProperty(k) && params[k] != null ? String(params[k]) : m; });
  },

  /* Traduction brute d'une clé ; null si absente. Un contexte absent retombe sur le texte seul. */
  lookup: function (fr, ctx) {
    var d = this.dicts[this.lang()];
    if (!d) return null;
    if (ctx && d.hasOwnProperty(ctx + I18N_CTX_SEP + fr)) return d[ctx + I18N_CTX_SEP + fr];
    return d.hasOwnProperty(fr) ? d[fr] : null;
  },

  t: function (fr, a, b) {
    if (typeof fr !== "string" || fr === "") return fr;
    var ctx = typeof a === "string" ? a : null;
    var params = typeof a === "object" && a ? a : (typeof b === "object" && b ? b : null);
    var lang = this.lang();
    if (lang === I18N_DEFAULT_LANG) return this.fill(fr, params);
    if (lang === I18N_PSEUDO_LANG) return "⟦" + this.fill(fr, params) + "⟧";
    var tr = this.lookup(fr, ctx);
    return this.fill(typeof tr === "string" && tr !== "" ? tr : fr, params);
  },

  /* Forme plurielle selon la langue : fr « 0 ou 1 → singulier », en « 1 → singulier ». */
  pluralIndex: function (n) {
    var lang = this.lang() === I18N_PSEUDO_LANG ? "fr" : this.lang();
    try {
      if (typeof Intl !== "undefined" && Intl.PluralRules) {
        var pr = this._plural[lang] || (this._plural[lang] = new Intl.PluralRules(I18N_LANGS[lang].locale));
        return pr.select(n) === "one" ? 0 : 1;
      }
    } catch (e) { /* navigateur ancien : règle simple ci-dessous */ }
    return (lang === "fr" ? Math.abs(n) < 2 : n === 1) ? 0 : 1;
  },

  /* _tn(3, "{n} place", "{n} places") ; {n} est toujours fourni, d'autres paramètres possibles. */
  tn: function (n, one, other, params) {
    var p = {}; Object.keys(params || {}).forEach(function (k) { p[k] = params[k]; });
    if (!p.hasOwnProperty("n")) p.n = this.formatNumber(n);
    var lang = this.lang();
    var forms = [one, other];
    if (lang !== I18N_DEFAULT_LANG && lang !== I18N_PSEUDO_LANG) {
      var tr = this.lookup(one + I18N_PLURAL_SEP + other, null);
      if (Array.isArray(tr) && tr.length === 2) forms = tr;
    }
    var s = this.fill(forms[this.pluralIndex(n)], p);
    return lang === I18N_PSEUDO_LANG ? "⟦" + s + "⟧" : s;
  },

  /* Nombres selon la langue (séparateur de milliers, virgule décimale en français). */
  formatNumber: function (n, opts) {
    if (typeof n !== "number" || !isFinite(n)) return String(n);
    try { return new Intl.NumberFormat(this.locale(), opts || {}).format(n); }
    catch (e) { return String(n); }
  },

  /* Textes écrits en dur dans index.html : l'élément porte data-i18n (sa valeur = contexte,
     vide sinon) et son texte français sert de clé. Appelé une fois, DOM et Prefs chargés. */
  translateDom: function (root) {
    if (typeof document === "undefined" || I18n.lang() === I18N_DEFAULT_LANG) return;
    var list = (root || document).querySelectorAll("[data-i18n]");
    Array.prototype.forEach.call(list, function (el) {
      if (!el.hasAttribute("data-i18n-fr")) el.setAttribute("data-i18n-fr", el.textContent.trim()); // source gardée
      el.textContent = I18n.t(el.getAttribute("data-i18n-fr"), el.getAttribute("data-i18n") || null);
    });
  },

  /* D2 : on enregistre la langue, on sauvegarde la partie en cours, puis on relance. */
  setLang: function (lang) {
    if (!I18N_LANGS.hasOwnProperty(lang) || lang === this.lang()) return false;
    if (window.Prefs && typeof Prefs.setValue === "function") Prefs.setValue("lang", lang);
    try { if (typeof saveGame === "function" && typeof game !== "undefined" && game && game.heroId) saveGame(); } catch (e) { /* la relance se fait quand même */ }
    if (typeof location !== "undefined" && typeof location.reload === "function") location.reload();
    return true;
  }
};

/* Raccourcis globaux, utilisés partout dans les vues et les systèmes.
   « _t » et non « t » : 45 fonctions du jeu ont déjà une variable locale t, qui masquerait la fonction. */
function _t(fr, a, b) { return I18n.t(fr, a, b); }
function _tn(n, one, other, params) { return I18n.tn(n, one, other, params); }
/* v3.369.0 : texte venu des DONNÉES (nom d'ennemi, de ration, de quête…), traduit à l'affichage.
   Non littéral par nature : l'audit le relève par le registre DATA_TEXT_FIELDS (lot L-6), pas ici. */
function _td(fr) { return I18n.t(fr); }

window.I18n = I18n;
if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
  document.addEventListener("DOMContentLoaded", function () { I18n.translateDom(); });
}
window._t = _t;
window._tn = _tn;
window._td = _td;
