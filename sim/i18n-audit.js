"use strict";
/* sim/i18n-audit.js — v3.368.0 : AUDIT DU MULTILANGUE (hors jeu, conception i18n v1.0).
   Relève tous les textes traduisibles du jeu et les compare à un dictionnaire (js/lang/en.js par défaut) :
     - _t("texte"), _t("texte", "contexte"), _tn(n, "singulier", "pluriel") dans js/ ;
     - data-i18n="contexte">texte< dans index.html ;
     - les champs de texte des données déclarés dans js/lang/data-fields.js (DATA_TEXT_FIELDS, lot L-6).
   Sort : entrées manquantes, orphelines (texte français changé ou retiré), {paramètres} différents,
   appels non littéraux (_t(a + b) : intraduisible), couverture, et une estimation des textes français
   encore écrits en dur par fichier (heuristique : sert à suivre l'extraction, pas à juger).

   USAGE :
     node sim/i18n-audit.js .                     résumé
     node sim/i18n-audit.js . --detail            + liste des manquants et orphelins
     node sim/i18n-audit.js . --skeleton out.js   squelette à traduire (entrées manquantes, valeur "")
     node sim/i18n-audit.js . --lang en           autre dictionnaire (js/lang/<lang>.js)
     node sim/i18n-audit.js . --json out.json     tous les textes relevés (clé, sorte, fichiers, traduit)
   Code de sortie 1 si orphelins, paramètres différents ou appels non littéraux. */

var fs = require("fs"), path = require("path"), vm = require("vm");
var ROOT = path.resolve(process.argv[2] || ".");
var ARGS = process.argv.slice(3);
var DETAIL = ARGS.indexOf("--detail") >= 0;
var LANG = ARGS.indexOf("--lang") >= 0 ? ARGS[ARGS.indexOf("--lang") + 1] : "en";
var SKELETON = ARGS.indexOf("--skeleton") >= 0 ? ARGS[ARGS.indexOf("--skeleton") + 1] : null;
var CTX_SEP = "|", PLURAL_SEP = "||";

/* v3.374.0 (L-6) : les champs de texte des données sont déclarés dans js/lang/data-fields.js
   (DATA_TEXT_FIELDS) et lus par sim/i18n-data.js. */
var DATA = require("./i18n-data.js");
var REG = DATA.registry(ROOT);

function walk(dir, out) {
  fs.readdirSync(dir).forEach(function (f) {
    var p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.js$/.test(f)) out.push(p);
  });
  return out;
}
function rel(p) { return path.relative(ROOT, p).split(path.sep).join("/"); }
function lit(s) { return vm.runInNewContext("(" + s + ")"); } // littéral de chaîne JS -> valeur
function stripComments(src) { return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'\\])\/\/[^\n]*/g, "$1"); }
function params(s) { return (String(s).match(/\{\w+\}/g) || []).sort().join(","); }

var STR = "(\"(?:[^\"\\\\\\n]|\\\\.)*\"|'(?:[^'\\\\\\n]|\\\\.)*')";
var RE_T = new RegExp("\\b_t\\(\\s*" + STR + "(?:\\s*,\\s*" + STR + ")?", "g");
var RE_TN = new RegExp("\\b_tn\\([^,]+,\\s*" + STR + "\\s*,\\s*" + STR, "g");
var RE_T_ANY = /\b_tn?\(/g;

var found = {};      // clé -> { files: {}, kind: "t" | "tn" | "data" }
var nonLiteral = [];
function add(key, file, kind, forms) {
  var e = found[key] || (found[key] = { files: {}, kind: kind, forms: forms }); // forms : texte(s) français, sans contexte
  e.files[file] = true;
}

/* 1. Code : _t / _tn */
var jsFiles = walk(path.join(ROOT, "js"), []).filter(function (f) { return !/[\\/]lang[\\/]/.test(f); });
var hardcoded = {};
jsFiles.forEach(function (f) {
  var src = stripComments(fs.readFileSync(f, "utf8")), file = rel(f), m, n = 0;
  RE_T.lastIndex = 0;
  while ((m = RE_T.exec(src))) { n++; var txt = lit(m[1]), ctx = m[2] ? lit(m[2]) : null; add(ctx ? ctx + CTX_SEP + txt : txt, file, "t", [txt]); }
  RE_TN.lastIndex = 0;
  while ((m = RE_TN.exec(src))) { n++; var one = lit(m[1]), other = lit(m[2]); add(one + PLURAL_SEP + other, file, "tn", [one, other]); }
  var calls = (src.match(RE_T_ANY) || []).length - (/core[\\/]i18n\.js$/.test(f) ? (src.match(RE_T_ANY) || []).length : 0);
  if (calls > n) nonLiteral.push(file + " : " + (calls - n) + " appel(s) sans texte littéral");
  hardcoded[file] = countHardcoded(src);
});

/* 2. index.html : data-i18n */
var html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8"), mh;
var RE_DOM = /data-i18n="([^"]*)"[^>]*>([^<]+)</g;
while ((mh = RE_DOM.exec(html))) { var ctx = mh[1], txt = mh[2].trim(); add(ctx ? ctx + CTX_SEP + txt : txt, "index.html", "t", [txt]); }

/* 3. Données déclarées (registre js/lang/data-fields.js). Les fichiers js/data/ sont mesurés
   exactement : « en dur » = chaîne française qu'aucun chemin du registre ne couvre. */
var dataSb = DATA.load(ROOT);
var dataUncovered = DATA.uncovered(dataSb, REG.DATA_TEXT_FIELDS, REG.DATA_TEXT_IGNORED);
DATA.collect(dataSb, REG.DATA_TEXT_FIELDS).forEach(function (x) {
  if (DATA.looksLikeText(x.value)) add(x.value, "data:" + x.global, "data", [x.value]);
});
Object.keys(hardcoded).forEach(function (f) { if (/^js\/data\//.test(f)) hardcoded[f] = 0; });
/* Fichiers de code qui portent une table de texte déclarée (DATA_TEXT_SOURCES) : ces chaînes-là sont couvertes. */
var registered = {};
DATA.collect(dataSb, REG.DATA_TEXT_FIELDS).forEach(function (x) { registered[x.value] = true; });
(REG.DATA_TEXT_SOURCES || []).forEach(function (f) {
  if (hardcoded.hasOwnProperty(f)) hardcoded[f] = countHardcoded(stripComments(fs.readFileSync(path.join(ROOT, f), "utf8")), registered);
});
dataUncovered.forEach(function (x) { hardcoded[x.file] = (hardcoded[x.file] || 0) + 1; });

/* 4. Dictionnaire */
var dict = {};
var dictFile = path.join(ROOT, "js", "lang", LANG + ".js");
if (fs.existsSync(dictFile)) {
  var sb = { I18n: { register: function (l, d) { Object.keys(d).forEach(function (k) { dict[k] = d[k]; }); } } };
  vm.runInNewContext(fs.readFileSync(dictFile, "utf8"), sb, { filename: dictFile });
}

var keys = Object.keys(found), missing = [], badParams = [];
keys.forEach(function (k) {
  var v = dict[k];
  if (v == null || v === "" || (Array.isArray(v) && (!v[0] || !v[1]))) { missing.push(k); return; }
  var fr = found[k].forms;
  var en = Array.isArray(v) ? v : [v];
  fr.forEach(function (f, i) { if (params(f) !== params(en[i] || "")) badParams.push(k + "  ->  " + JSON.stringify(v)); });
});
var orphans = Object.keys(dict).filter(function (k) { return !found.hasOwnProperty(k); });

/* Heuristique « texte français en dur » : chaînes à mots français hors _t(), texte entre balises compris. */
function countHardcoded(src, skip) {
  var s = src.replace(/\b_tn?\((?:[^()]|\([^()]*\))*\)/g, " ");
  var re = /("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/g, m, n = 0;
  function fr(t) {
    t = t.trim();
    return /[A-Za-zÀ-ÿ]{3,}/.test(t) && !/^[\w\-./#:%]+$/.test(t)
      && (/[À-ÿ]/.test(t) || /\b(le|la|les|de|du|des|un|une|et|pour|sur|dans|avec|pas|est|ton|ta|tes)\b/i.test(t) || /^[A-ZÀ-Ý][a-zà-ÿ]+( [a-zà-ÿ]+)*[ .!?:…]*$/.test(t));
  }
  while ((m = re.exec(s))) {
    var v = m[1].slice(1, -1);
    if (skip) { try { if (skip[lit(m[1])]) continue; } catch (e) { /* littéral non évaluable */ } }
    if (/<[a-z\/]/i.test(v)) (v.match(/>([^<>]+)</g) || []).forEach(function (x) { if (fr(x.slice(1, -1))) n++; });
    else if (fr(v)) n++;
  }
  return n;
}

/* Rapport */
var done = keys.length - missing.length;
console.log("i18n — dictionnaire « " + LANG + " » : " + Object.keys(dict).length + " entrée(s)");
console.log("Données : " + keys.filter(function (k) { return found[k].kind === "data"; }).length + " texte(s) déclaré(s) au registre, "
  + dataUncovered.length + " chaîne(s) française(s) hors registre");
console.log("Textes traduisibles relevés : " + keys.length + " (" + keys.filter(function (k) { return found[k].kind === "tn"; }).length + " pluriels)"
  + " — traduits : " + done + " (" + (keys.length ? Math.round(100 * done / keys.length) : 100) + " %), manquants : " + missing.length);
console.log("Orphelins (dans le dictionnaire, plus dans le jeu) : " + orphans.length);
console.log("{paramètres} différents : " + badParams.length);
console.log("Appels non littéraux : " + nonLiteral.length);
/* v3.422.0 (décision Seb) : les écrans de développement (Admin, bac à sable, débogage) ne sont
   jamais vus par le joueur. Ils restent en français et sortent de l'estimation (comptés à part). */
var DEV_SCREENS = ["js/ui/admin-view.js", "js/ui/combat-round-sandbox-view.js", "js/ui/debug-touch-view.js"];
var devTotal = DEV_SCREENS.reduce(function (s, f) { return s + Number(hardcoded[f] || 0); }, 0);
var hc = Object.keys(hardcoded).filter(function (f) { return hardcoded[f] > 0 && DEV_SCREENS.indexOf(f) < 0; }).sort(function (a, b) { return hardcoded[b] - hardcoded[a]; });
var hcTotal = hc.reduce(function (s, f) { return s + hardcoded[f]; }, 0);
console.log("Texte français encore en dur (estimation, écrans du joueur) : ~" + hcTotal + " dans " + hc.length + " fichier(s) ; écrans de développement exclus : ~" + devTotal + " ; les plus chargés :");
hc.slice(0, ARGS.indexOf("--all") >= 0 ? hc.length : 8).forEach(function (f) { console.log("  " + String(hardcoded[f]).padStart(5) + "  " + f); });
if (DETAIL) {
  if (missing.length) { console.log("\nMANQUANTS"); missing.forEach(function (k) { console.log("  " + JSON.stringify(k) + "  (" + Object.keys(found[k].files).join(", ") + ")"); }); }
  if (dataUncovered.length) { console.log("\nDONNÉES HORS REGISTRE"); dataUncovered.forEach(function (x) { console.log("  " + x.global + "." + x.path + "  " + JSON.stringify(x.value.slice(0, 60)) + "  (" + x.file + ")"); }); }
  if (orphans.length) { console.log("\nORPHELINS"); orphans.forEach(function (k) { console.log("  " + JSON.stringify(k)); }); }
}
if (badParams.length) { console.log("\n{PARAMÈTRES} DIFFÉRENTS"); badParams.forEach(function (x) { console.log("  " + x); }); }
if (nonLiteral.length) { console.log("\nNON LITTÉRAUX"); nonLiteral.forEach(function (x) { console.log("  " + x); }); }
/* v3.375.0 : --json out.json — tous les textes relevés { clé, sorte, fichiers, traduit }, pour préparer une traduction par blocs. */
if (ARGS.indexOf("--json") >= 0) {
  var jsonOut = ARGS[ARGS.indexOf("--json") + 1];
  fs.writeFileSync(jsonOut, JSON.stringify(keys.map(function (k) {
    return { key: k, kind: found[k].kind, files: Object.keys(found[k].files), done: missing.indexOf(k) < 0 };
  }), null, 1));
  console.log("\nJSON : " + jsonOut + " (" + keys.length + " entrée(s))");
}
if (SKELETON) {
  var out = missing.map(function (k) { return "  " + JSON.stringify(k) + ": " + (found[k].kind === "tn" ? '["", ""]' : '""') + ","; }).join("\n");
  fs.writeFileSync(SKELETON, "I18n.register(\"" + LANG + "\", {\n" + out.replace(/,$/, "") + "\n});\n");
  console.log("\nSquelette : " + SKELETON + " (" + missing.length + " entrée(s))");
}
process.exit(orphans.length || badParams.length || nonLiteral.length ? 1 : 0);
