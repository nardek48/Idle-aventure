"use strict";
/* sim/i18n-data.js — v3.374.0 (lot L-6) : lecture des textes des données pour l'audit et les harnais.
   - load(root)            : charge js/data/*.js (ordre d'index.html) dans un bac à sable ; _t/_td = identité.
   - collect(sb, fields)   : liste { global, path, value } de toutes les chaînes déclarées au registre
                             (js/lang/data-fields.js) ; « * » = une clé, « ** » = toute profondeur.
   - uncovered(sb, fields, ignored) : chaînes « françaises » des données qu'aucun chemin ne couvre.
   Hors jeu : aucun fichier du jeu ne l'utilise. */

var fs = require("fs"), path = require("path"), vm = require("vm");

function load(root, extra) {
  var html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  extra = extra || registry(root).DATA_TEXT_SOURCES || [];
  var scripts = (html.match(/src="js\/[^"]+"/g) || []).map(function (s) { return s.slice(5, -1); })
    .filter(function (s) { return /^js\/(data\/|core\/constants\.js)/.test(s) || extra.indexOf(s) >= 0; });
  var sb = { console: console, Math: Math, Date: Date, JSON: JSON };
  sb.window = sb;
  sb._t = function (s) { return s; };
  sb._tn = function (n, a, b) { return n === 1 ? a : b; };
  sb._td = function (s) { return s; };
  sb.I18n = { fill: function (s) { return s; }, t: function (s) { return s; }, lang: function () { return "fr"; } };
  sb.document = { getElementById: function () { return null; }, querySelector: function () { return null; }, addEventListener: function () {} };
  sb.localStorage = { getItem: function () { return null; }, setItem: function () {} };
  sb.game = { explorationProgression: {}, storyQuests: {}, village: { buildings: {} }, upgrades: {}, flags: {} };
  vm.createContext(sb);
  var owner = {};
  scripts.forEach(function (s) {
    var before = Object.keys(sb);
    try { vm.runInContext(fs.readFileSync(path.join(root, s), "utf8"), sb, { filename: s }); }
    catch (e) { owner["!" + s] = e.message; }
    Object.keys(sb).forEach(function (k) { if (before.indexOf(k) < 0) owner[k] = s; });
  });
  sb.__owner = owner;
  return sb;
}

function get(o, k) { try { return o[k]; } catch (e) { return undefined; } } // getters qui lisent `game`

/* Toutes les chaînes sous `o` (liste ou objet), avec leur chemin relatif. */
function leaves(o, p, out, depth) {
  if (depth > 12 || o == null) return out;
  if (typeof o === "string") { out.push({ path: p, value: o }); return out; }
  if (typeof o !== "object") return out;
  Object.keys(o).forEach(function (k) { leaves(get(o, k), p ? p + "." + k : k, out, depth + 1); });
  return out;
}

/* Chemins concrets qui satisfont un motif. */
function match(o, parts, p, out) {
  if (o == null) return out;
  if (!parts.length) { leaves(o, p, out, 0); return out; }
  var seg = parts[0], rest = parts.slice(1);
  if (seg === "**") {
    match(o, rest, p, out);
    if (typeof o === "object") Object.keys(o).forEach(function (k) { match(get(o, k), parts, p ? p + "." + k : k, out); });
    return out;
  }
  if (typeof o !== "object") return out;
  var keys = seg === "*" ? Object.keys(o) : (Object.prototype.hasOwnProperty.call(o, seg) ? [seg] : []);
  keys.forEach(function (k) { match(get(o, k), rest, p ? p + "." + k : k, out); });
  return out;
}

function collect(sb, fields) {
  var out = [];
  Object.keys(fields).forEach(function (g) {
    fields[g].forEach(function (pat) {
      match(sb[g], pat === "" ? [] : pat.split("."), "", []).forEach(function (x) {
        out.push({ global: g, path: x.path, value: x.value, pattern: pat });
      });
    });
  });
  return out;
}

/* Heuristique « texte affiché en français » : ni identifiant, ni chemin, ni couleur, ni emoji seul. */
function looksLikeText(v) {
  v = String(v).trim();
  if (!v) return false;
  if (/^(\.{0,2}\/)*(images|css|js|audio|sounds?)\//.test(v) || /\.(png|jpe?g|webp|svg|mp3|gif)$/i.test(v)) return false;
  if (/^[a-z0-9_\-.]+$/.test(v) || /^[a-z][A-Za-z0-9]+$/.test(v)) return false;   // identifiants
  if (/^#[0-9a-fA-F]{3,8}$|^rgba?\(|^var\(/.test(v)) return false;
  if (/^is-[\w-]+$/.test(v)) return false;                                             // classes CSS
  return /[A-Za-zÀ-ÿ]{2,}/.test(v);
}

function uncovered(sb, fields, ignored) {
  var covered = {};
  collect(sb, fields).forEach(function (x) { covered[x.global + "|" + x.path] = true; });
  collect(sb, ignored || {}).forEach(function (x) { covered[x.global + "|" + x.path] = true; });
  var out = [];
  Object.keys(sb.__owner).forEach(function (g) {
    if (g.charAt(0) === "!" || !/^[A-Z][A-Z0-9_]+$/.test(g)) return;               // seules les constantes MAJUSCULES
    var o = sb[g];
    if (typeof o === "string") { if (!covered[g + "|"] && looksLikeText(o)) out.push({ global: g, path: "", value: o, file: sb.__owner[g] }); return; }
    if (!o || typeof o !== "object") return;
    leaves(o, "", [], 0).forEach(function (x) {
      if (!covered[g + "|" + x.path] && looksLikeText(x.value)) out.push({ global: g, path: x.path, value: x.value, file: sb.__owner[g] });
    });
  });
  return out;
}

function registry(root) {
  var file = path.join(root, "js", "lang", "data-fields.js");
  var m = { exports: {} };
  vm.runInNewContext(fs.readFileSync(file, "utf8"), { module: m });
  return m.exports;
}

module.exports = { load: load, collect: collect, uncovered: uncovered, registry: registry, looksLikeText: looksLikeText };
