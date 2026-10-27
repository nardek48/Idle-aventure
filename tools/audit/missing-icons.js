"use strict";
/* tools/audit/missing-icons.js — v3.304.0 : liste des images citées par le jeu et absentes du disque.
   Règle Seb : une icône pas encore dessinée garde son vrai chemin dans les données (le jeu
   affiche l'icône générique à sa place) ; ce contrôle en fait la liste à générer en une fois.
   Lit js/, css/ et index.html, puis les données chargées (v3.457.1 : chemins construits au chargement).
   Les chemins construits plus tard, à l'exécution, échappent encore : en jeu, window.MISSING_ICONS les liste.
   v3.519.0 (audit, lot 3) : --chromium [sauvegarde.json] ajoute une passe dans le vrai jeu (390 px) : chaque écran
   est ouvert, et toute image demandée en 404 (chemins construits à l'exécution, ex. une extension .png) est relevée.
   USAGE : node tools/audit/missing-icons.js . [--chromium [sauvegarde.json]] */
var fs = require("fs"), path = require("path");
var ROOT = require("../chemins.js").jeu(process.argv[2]);
// v3.449.3 : aussi src=… sans guillemets (src=images/….png>), qui échappait au contrôle
var RE = /["'(=]((?:\.{0,2}\/)*images\/[^"'()\s>]+?\.(?:png|jpe?g|webp|svg|gif))(?=["')>\s])/gi;

function walk(dir, out) {
  fs.readdirSync(dir).forEach(function (f) {
    var p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.(js|css|html)$/.test(f)) out.push(p);
  });
  return out;
}

var fichiers = walk(path.join(ROOT, "js"), walk(path.join(ROOT, "css"), [path.join(ROOT, "index.html")]));
var manquants = {}; // chemin normalisé -> [fichiers qui le citent]
fichiers.forEach(function (f) {
  var src = fs.readFileSync(f, "utf8"), m;
  RE.lastIndex = 0;
  while ((m = RE.exec(src)) !== null) {
    var rel = m[1].replace(/^(\.{0,2}\/)+/, ""); // tout est servi depuis la racine
    if (fs.existsSync(path.join(ROOT, rel))) continue;
    var cite = path.relative(ROOT, f);
    (manquants[rel] = manquants[rel] || []);
    if (manquants[rel].indexOf(cite) === -1) manquants[rel].push(cite);
  }
});

/* v3.457.1 : seconde passe — les données chargées (js/data) livrent les chemins construits au
   chargement (icônes des hauts faits : ACH_ICON + id + ".webp"), que la lecture du texte ne voit pas. */
(function () {
  var vm = require("vm"), sb = { console: { log: function () {}, warn: function () {}, error: function () {} }, Math: Math, JSON: JSON, Date: Date,
    _t: function (x) { return x; }, _td: function (x) { return x; }, _tn: function (n, a) { return a; }, game: {}, localStorage: { getItem: function () { return null; }, setItem: function () {} } };
  sb.window = sb; sb.self = sb;
  vm.createContext(sb);
  var scripts = require("../harness/index-scripts.js")(ROOT, /pwa\.js|boot\.js/).filter(function (f) { return /^js\/(core|data)\//.test(f); });
  scripts.forEach(function (f) { try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sb, { filename: f }); } catch (e) { /* donnée qui dépend d'un système : ignorée */ } });
  var vus = [];
  function fouille(v, d) {
    if (d > 8 || v == null) return;
    if (typeof v === "string") {
      if (!/^(\.{0,2}\/)*images\/.+\.(png|jpe?g|webp|svg|gif)$/i.test(v)) return;
      var rel = v.replace(/^(\.{0,2}\/)+/, "");
      if (!fs.existsSync(path.join(ROOT, rel))) { manquants[rel] = manquants[rel] || []; if (manquants[rel].indexOf("(données chargées)") === -1) manquants[rel].push("(données chargées)"); }
      return;
    }
    if (typeof v !== "object" || vus.indexOf(v) !== -1) return;
    vus.push(v);
    Object.keys(v).forEach(function (k) { try { fouille(v[k], d + 1); } catch (e) {} });
  }
  Object.keys(sb).forEach(function (k) { if (/^[A-Z][A-Z0-9_]+$/.test(k)) fouille(sb[k], 0); });
})();

var cles = Object.keys(manquants).sort();
console.log(cles.length ? cles.length + " image(s) absente(s) :\n" : "Aucune image absente.");
cles.forEach(function (k) { console.log("  " + k + "   <- " + manquants[k].join(", ")); });

/* Troisième passe (--chromium) : le jeu dans Chromium, une partie chargée, tous les écrans ouverts un à un. */
var IC = process.argv.indexOf("--chromium");
if (IC >= 0) passeChromium(process.argv[IC + 1] && /\.json$/.test(process.argv[IC + 1]) ? process.argv[IC + 1]
  : require("../chemins.js").captures("audit-v3515") + "/saves/knight_mountain.json");
function passeChromium(savePath) {
  var http = require("http"), chromium = require("playwright").chromium;
  var MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".json": "application/json", ".woff2": "font/woff2", ".mp3": "audio/mpeg" };
  var srv = http.createServer(function (q, res) {
    var u = decodeURIComponent(q.url.split("?")[0]); if (u === "/") u = "/index.html";
    fs.readFile(path.join(ROOT, u), function (e, d) { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type": MIME[path.extname(u)] || "application/octet-stream" }); res.end(d); });
  });
  var save = fs.existsSync(savePath) ? fs.readFileSync(savePath, "utf8") : null;
  (async function () {
    await new Promise(function (r) { srv.listen(0, r); });
    var b = await chromium.launch(), ctx = await b.newContext({ locale: "fr-FR", serviceWorkers: "block", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    var p = await ctx.newPage(), absents = {}, ecran = "démarrage";
    p.on("response", function (r) { var u = r.url(); if (r.status() === 404 && /\/images\//.test(u)) { var k = decodeURIComponent(u.replace(/^https?:\/\/[^/]+\//, "")); (absents[k] = absents[k] || []).indexOf(ecran) < 0 && absents[k].push(ecran); } });
    await p.goto("http://localhost:" + srv.address().port + "/index.html");
    await p.waitForFunction(function () { var t = document.getElementById("title-screen-root"); return t && t.innerHTML.length > 0; }, null, { timeout: 20000 });
    await p.evaluate(function () { titleScreenNewGame(); }); await p.waitForTimeout(300);
    await p.evaluate(function () { pendingHeroId = "knight"; pendingPlayerName = "Seb"; confirmHeroSelection(); }); await p.waitForTimeout(500);
    if (save) await p.evaluate(function (s) { restoreBaseState(JSON.parse(s)); renderAll(); }, save);
    var ECRANS = [["campement"], ["village", "buildings"], ["village", "production"], ["village", "shops"], ["village", "entrepot"], ["quests", "histoire"], ["quests", "aventure"], ["quests", "secondaires"],
      ["more", "stats"], ["more", "amelioration"], ["more", "abilities"], ["equip"], ["talents"], ["companions"], ["shop", "potions"], ["dungeon"], ["map"], ["ascension"], ["grimoire"], ["achievements"], ["log"], ["settings"]];
    for (var i = 0; i < ECRANS.length; i++) {
      ecran = ECRANS[i].join(" › ");
      await p.evaluate(function (e) {
        try { switchTab(e[0]); } catch (x) { return; }
        try { if (e[0] === "village" && e[1]) setVillageSubTab(e[1]); if (e[0] === "quests" && e[1]) setQuestCategory(e[1]); if (e[0] === "more" && e[1]) setHerosSubTab(e[1]); if (e[0] === "shop" && e[1]) setShopSubTab(e[1]); } catch (x) { /* sous-onglet absent */ }
        ["tutorial-modal-root"].forEach(function (r) { var h = document.getElementById(r); if (h) h.innerHTML = ""; });
      }, ECRANS[i]);
      await p.waitForTimeout(250);
    }
    ecran = "feuilles de donjon";   // chaque donjon ouvert, puis la fiche de chaque ressource
    await p.evaluate(function () { switchTab("dungeon"); (window.DUNGEONS || []).forEach(function (d) { try { if (DungeonManager.isUnlocked(d.id)) openDungeonSheet(d.id); } catch (x) {} }); });
    await p.waitForTimeout(300);
    ecran = "fiches de l'Entrepôt";
    await p.evaluate(function () { switchTab("village"); setVillageSubTab("entrepot"); Object.keys(WAREHOUSE_RESOURCES).forEach(function (k) { try { openWarehouseSheet(k); } catch (x) {} }); });
    await p.waitForTimeout(400);
    var jeu = await p.evaluate(function () { return (window.MISSING_ICONS || []).slice(); });
    jeu.forEach(function (k) { k = k.replace(/^(\.{0,2}\/)+/, ""); (absents[k] = absents[k] || []).indexOf("MISSING_ICONS") < 0 && absents[k].push("MISSING_ICONS"); });
    var ks = Object.keys(absents).filter(function (k) { return !manquants[k]; }).sort();
    var deja = Object.keys(absents).length - ks.length;
    console.log("\nPasse Chromium (" + (save ? path.basename(savePath) : "partie neuve") + ", " + ECRANS.length + " écrans, " + deja + " absente(s) déjà listée(s) revue(s) en 404) : " + (ks.length ? ks.length + " image(s) absente(s) en plus :" : "aucune image absente en plus."));
    ks.forEach(function (k) { console.log("  " + k + "   <- " + absents[k].join(", ")); });
    await b.close(); srv.close();
  })().catch(function (e) { console.error(e); process.exit(1); });
}
