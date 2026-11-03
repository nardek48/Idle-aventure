"use strict";
/* tools/sim/journal-robot.js — v3.613.0 (demande de Seb) : génère atelier/robot-campagne.html, le journal du robot de campagne.
   Lit tous les relevés (tools/sim/releves/*.json, écrits par campagne-harness.js --releve <nom>), les objectifs des étapes
   (vrai jeu) et ce que le robot fait à chaque étape (SOLVERS de campagne-harness.js). La page laisse choisir un relevé et
   celui auquel le comparer.
   USAGE : node tools/sim/journal-robot.js */
var fs = require("fs"), path = require("path"), vm = require("vm");
var ROOT = require("../chemins.js").jeu();
var DIR = path.join(__dirname, "releves"), OUT = path.join(__dirname, "..", "..", "atelier", "robot-campagne.html");

/* ---------- Le jeu : objectifs et noms (quêtes, Petites Aventures, donjons, secteurs, bâtiments) ---------- */
var src = fs.readFileSync(path.join(__dirname, "debouches-bench.js"), "utf8"); src = src.slice(0, src.indexOf("var SCENARIOS"));
var lib = new Function("require", "ROOT", "path", "vm", src.replace(/^"use strict";/, "").replace(/var fs = [^\n]*\n/, "var fs = require('fs');\n").replace(/var ROOT = [^\n]*\n/, "")
  + "\nreturn { boot: boot };")(function (m) { return require(m.indexOf("../") === 0 ? path.join(__dirname, m) : m); }, ROOT, path, vm);
var g = lib.boot(); vm.runInContext("fullResetState();", g);
var N = {};
function put(k, v) { if (k && v && !N[k]) N[k] = v; }
Object.keys(g).forEach(function (K) {
  var v = g[K]; if (!v || typeof v !== "object" || !/QUEST|TEMPLATE|DUNGEON|SCENE/.test(K)) return;
  (Array.isArray(v) ? v : Object.keys(v).map(function (k) { return v[k]; })).forEach(function (q) { if (q && typeof q === "object" && q.id && (q.title || q.name)) put(String(q.id), q.title || q.name); });
});
Object.keys(g.WAREHOUSE_RESOURCES).forEach(function (k) { put(k, g.WAREHOUSE_RESOURCES[k].name); });
Object.keys(g.LIVING_MAPS).forEach(function (m) { (g.LIVING_MAPS[m].sectors || []).forEach(function (s) { put(m + ":" + s.id, s.name); }); });
(g.DUNGEONS || []).forEach(function (d) { put("donjon" + d.id, d.name); });
Object.keys(g.VILLAGE_BUILDINGS).forEach(function (k) { put("b:" + k, g.VILLAGE_BUILDINGS[k].name); });
var steps = [];
Object.keys(g.STORY_QUESTS).forEach(function (ch) { (g.STORY_QUESTS[ch].steps || []).forEach(function (s) { steps.push({ ch: ch, id: s.id, title: s.title, obj: s.objectiveLabel || "" }); }); });

/* ---------- Ce que le robot fait à chaque étape (lecture des SOLVERS) ---------- */
var H = fs.readFileSync(path.join(__dirname, "campagne-harness.js"), "utf8");
var body = H.slice(H.indexOf("var SOLVERS = {"), H.indexOf("\n};", H.indexOf("var SOLVERS = {")));
var parts = body.split(/\n  ([a-z_0-9]+): /), SOL = {};
for (var p = 1; p < parts.length; p += 2) SOL[parts[p]] = parts[p + 1];
var BLD = { forge: "la Forge", training: "le Terrain d'entraînement", warehouse: "l'Entrepôt", hall: "la Halle", palisade: "la Palissade", workshop: "l'Atelier", tavern: "la Taverne", apothecary: "l'Apothicaire", enchanter: "l'Enchanteresse" };
var RAR = { green: "Inhabituelles", blue: "Rares", rare: "Rares", epic: "Épiques" };
function nm(x, pref) { return N[(pref || "") + x] || N[x] || x; }
function actions(code) {
  var out = [], re = /(playAdventure|playExpedition|freeSectorAgain|freeSector|playDungeon|obtain|offer|gearRarity|upgradeBuilding|reforgeTo|equipAll|buyTraining|activateGrimoireRule|TalentManager\.buy|withCompanion|buyHealingPotion|storyMakeChoice)\(([^)]*)\)/g, m;
  if (/^\s*choiceStep/.test(code)) out.push("Fait le choix de l'étape (le premier proposé)");
  if (/caravaneMarche/.test(code)) out.push("Envoie la caravane au marché demandé");
  while ((m = re.exec(code))) {
    var f = m[1], a = m[2].split(",").map(function (x) { return x.trim().replace(/^["']|["']$/g, ""); }), t = null;
    if (f === "playAdventure" && a[0] && !/^g\./.test(a[0])) t = "Joue la quête « " + nm(a[0]) + " »";
    else if (f === "playExpedition" && a[0]) t = "Fait la Petite Aventure « " + nm(a[0]) + " »";
    else if (f === "freeSector" || f === "freeSectorAgain") t = a[1] && /^[a-z_]+$/.test(a[1]) && a[1] !== "id" ? (f === "freeSectorAgain" ? "Rejoue" : "Libère") + " le secteur « " + nm(a[0] + ":" + a[1]) + " »" : "Libère un secteur de la carte vivante";
    else if (f === "playDungeon" && a[0]) t = "Entre au donjon « " + nm("donjon" + a[0]) + " »";
    else if (f === "obtain" && a[0] && /^[a-z_]+$/.test(a[0]) && a[0] !== "res") t = "Se procure : " + nm(a[0]);
    else if (f === "storyMakeChoice") t = "Fait le choix de l'étape";
    else if (f === "offer") t = "Fait l'offrande au feu de camp";
    else if (f === "gearRarity" && a[0]) t = "S'équipe en pièces " + (RAR[a[0]] || a[0]);
    else if (f === "upgradeBuilding" && a[0]) t = "Construit " + (BLD[a[0]] || a[0]);
    else if (f === "reforgeTo" && a[0]) t = "Reforge " + ({ weapon: "l'arme", armor: "l'armure" }[a[0]] || a[0]);
    else if (f === "equipAll") t = "Porte le meilleur équipement du sac";
    else if (f === "buyTraining") t = "Achète de l'entraînement";
    else if (f === "activateGrimoireRule") t = "Active une règle du Grimoire";
    else if (f === "TalentManager.buy") t = "Achète un talent";
    else if (f === "withCompanion") t = "Prend " + (a[1] ? a[1].charAt(0).toUpperCase() + a[1].slice(1) : "un compagnon") + " dans le groupe";
    else if (f === "buyHealingPotion") t = "Achète une potion de soin";
    if (t && out.indexOf(t) < 0) out.push(t);
  }
  return out;
}
steps.forEach(function (s) { s.robot = actions(SOL[s.id] || ""); if (!s.robot.length && s.id === "forest_01") s.robot = ["Accepte la quête"]; });

/* ---------- Les relevés (allégés pour la page) ---------- */
var releves = (fs.existsSync(DIR) ? fs.readdirSync(DIR) : []).filter(function (f) { return /\.json$/.test(f); }).map(function (f) {
  var r = JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));
  return { fichier: f, meta: r.meta, resume: { reussies: r.resume.reussies, totalH: r.resume.totalH, niveau: r.resume.niveau, morts: r.resume.morts, arret: r.resume.arret, orGagne: (r.resume.economie || {}).orGagne },
    etapes: (r.etapes || []).map(function (e) { return { id: e.id, finH: e.finH, h: e.h, niv: e.niv, morts: e.morts, combatH: e.combatH, soinH: e.soinH, actions: e.actions }; }),
    mondes: (r.mondes || []).map(function (m) { return { monde: m.monde, h: m.h, niv: m.niv, orMonde: m.orMonde, entr: m.entr, rangsSorts: m.rangsSorts, talents: m.talents, compagnons: m.compagnons, forge: m.forge, equip: m.equip, zones: m.zones }; }) };
}).sort(function (a, b) { return a.fichier < b.fichier ? -1 : 1; });
// l'ordre de création compte : la référence d'abord, puis chaque lot
var ORDRE = ["reference", "lot2", "lot21", "lot213", "joueur", "secondaires60", "secondaires70"];
releves.sort(function (a, b) { var ia = ORDRE.indexOf(a.meta.nom), ib = ORDRE.indexOf(b.meta.nom); return (a.meta.date + (ia < 0 ? 9 : ia)) < (b.meta.date + (ib < 0 ? 9 : ib)) ? -1 : 1; });

var tpl = fs.readFileSync(path.join(__dirname, "journal-robot.tpl.html"), "utf8");
var data = JSON.stringify({ steps: steps, releves: releves }).replace(/<\//g, "<\\/");
fs.writeFileSync(OUT, tpl.replace("/*DONNEES*/null", data));
console.log("Journal écrit : atelier/robot-campagne.html (" + releves.length + " relevé(s), " + steps.length + " étapes)");
