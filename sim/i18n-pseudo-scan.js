"use strict";
/* sim/i18n-pseudo-scan.js — v3.369.0 : RELEVÉ À L'ÉCRAN du texte pas encore extrait (hors jeu).
   Ouvre le vrai jeu en pseudo-langue (tout texte passé par _t() est entouré de ⟦ ⟧), parcourt des
   écrans, et liste chaque texte visible qui n'est PAS entre ⟦ ⟧. C'est la mesure juste d'un lot
   d'extraction (l'audit statique, lui, ne fait qu'estimer).
   Les textes venus des données (noms d'ennemis, de quêtes…) sortent aussi : ils relèvent du lot L-6.

   USAGE : node sim/i18n-pseudo-scan.js . [écran,écran…]     (Playwright requis, comme parcours-harness)
   Écrans : titre, creation, camp, combat, menu, confirmation, retour, quetes, quetes_aventure, carte, carte_vivante,
   aventure, parametres ; v3.374.0 : village, production, entrepot, equipement, inventaire, echoppe, potions, heros, stats,
   capacites, talents, compagnons, grimoire, hauts_faits, bestiaire, codex, tutoriels, journal, memoire, donjons */

var http = require("http"), fs = require("fs"), path = require("path");
var chromium;
try { chromium = require("playwright").chromium; }
catch (e) { console.error("Playwright absent : npm i -D playwright && npx playwright install chromium"); process.exit(2); }
var ROOT = path.resolve(process.argv[2] || ".");
var ONLY = process.argv[3] ? process.argv[3].split(",") : null;
var MIME = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".json": "application/json", ".svg": "image/svg+xml", ".mp3": "audio/mpeg" };

function serve() {
  return new Promise(function (r) {
    var s = http.createServer(function (q, res) {
      var p = decodeURIComponent(q.url.split("?")[0]); if (p === "/") p = "/index.html";
      fs.readFile(path.join(ROOT, p), function (e, d) {
        if (e) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" }); res.end(d);
      });
    });
    s.listen(0, function () { r(s); });
  });
}

/* Dans la page : textes visibles hors ⟦ ⟧ (un texte partiellement entouré compte pour sa partie nue). */
function scanPage() {
  var out = [];
  var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  var n;
  while ((n = w.nextNode())) {
    var el = n.parentElement;
    if (!el || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName)) continue;
    var r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (!r.width || !r.height || cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) continue;
    // v3.422.0 : les gabarits imbriqués (« ⟦⟦Puissance⟧ 40 contre 5⟧ ») se retirent de l'intérieur
    var bare = n.textContent, prev;
    do { prev = bare; bare = bare.replace(/⟦[^⟦⟧]*⟧/g, " "); } while (bare !== prev);
    bare = bare.replace(/\s+/g, " ").trim();
    if (/[A-Za-zÀ-ÿ]{2,}/.test(bare)) out.push(bare);
  }
  ["placeholder", "title", "aria-label"].forEach(function (a) {
    Array.prototype.forEach.call(document.querySelectorAll("[" + a + "]"), function (el) {
      var v = el.getAttribute(a) || "";
      if (el.offsetParent && /[A-Za-zÀ-ÿ]{2,}/.test(v) && v.indexOf("⟦") < 0) out.push("@" + a + " " + v);
    });
  });
  return out;
}

var SCREENS = {
  titre: async function (p) { },
  creation: async function (p) { await p.evaluate(function () { titleScreenNewGame(); }); },
  camp: async function (p) { await newHero(p); await p.evaluate(function () { switchTab("campement"); }); },
  combat: async function (p) {
    await newHero(p);
    await p.evaluate(function () { game.heroMaxHp = 99999; game.heroHp = 99999; saveGame(); });
    await p.reload();
    await p.waitForFunction(function () { var t = document.getElementById("title-screen-root"); return t && t.innerHTML.length > 0; }, null, { timeout: 15000 });
    await p.locator(".title-screen-continue").first().click(); await p.waitForTimeout(400); await closeTut(p);
    await p.evaluate(function () { AdventureQuestManager.start("eq_forest_spider"); });
    await p.waitForTimeout(400); await closeTut(p);
    for (var i = 0; i < 3; i++) { var a = p.locator("#combat-attack-btn:not([disabled]):visible"); if (await a.count()) await a.first().click(); await p.waitForTimeout(700); }
  },
  menu: async function (p) { await newHero(p); await p.evaluate(function () { openFullMenu(); }); },
  confirmation: async function (p) { await newHero(p); await p.evaluate(function () { showConfirmModal(_t("Titre"), _t("Texte"), "", function () {}); }); },
  retour: async function (p) {
    await newHero(p);
    await p.evaluate(function () {
      var s = ReturnManager.complete({ produced: { bois: 40, pierre: 12 }, crafted: { planche: 3 }, fullPlots: 1, openPlots: 2, awayMs: 3 * 3600e3 }, ReturnManager.capture());
      s.hpGain = 120; s.patrolsBack = 1; s.tavernNew = true; s.tavernReady = 2; s.siteDone = { name: _t("Forge"), level: 2 };
      openReturnScreen(s);
    });
  },
  quetes: async function (p) { await newHero(p); await p.evaluate(function () { switchTab("quests"); }); },
  quetes_aventure: async function (p) { await newHero(p); await p.evaluate(function () { switchTab("quests"); setQuestCategory("aventure"); }); },
  carte: async function (p) { await newHero(p); await p.evaluate(function () { switchTab("map"); openWorldPopup(0); }); },
  carte_vivante: async function (p) {
    await newHero(p);
    await p.evaluate(function () { switchTab("map"); openLivingMap("forest"); });
    await p.waitForTimeout(400);
    await p.evaluate(function () { var d = LivingMapManager.getMap("forest").sectors[0]; selectLivingMapSector(d.id); lmxToggleLegend(); });
  },
  /* v3.422.0 : Petite Aventure v2 — préparation (sac, pactes), départ, puis deux pas sur la
     carte et l'écran du nœud atteint (les boutons v1 « Bourrin / Prudent » n'existent plus). */
  aventure: async function (p) {
    await newHero(p);
    await p.evaluate(function () { switchTab("campement"); SceneRunManager.startRun("petite_aventure_foret"); switchTab("scene"); });
    await p.waitForTimeout(300);
    await p.evaluate(function () { pa2PrepStep("pacts"); });
    await p.waitForTimeout(200);
    await p.evaluate(function () { pa2Depart(); });
    await p.waitForTimeout(300);
    for (var i = 0; i < 2; i++) {
      await p.evaluate(function () {
        var next = Pa2Run.openMoves();
        if (next.length) pa2Move(next[0]);
      });
      await p.waitForTimeout(300);
    }
  },
  parametres: async function (p) { await newHero(p); await p.evaluate(function () { switchTab("settings"); }); },
  /* v3.374.0 (L-6) : écrans des lots L-3 et L-4, avec un peu de contenu (objets, créature rencontrée, Mémoire). */
  village: async function (p) { await richHero(p); await p.evaluate(function () { switchTab("village"); setVillageSubTab("buildings"); }); },
  production: async function (p) { await richHero(p); await p.evaluate(function () { switchTab("village"); setVillageSubTab("production"); }); },
  entrepot: async function (p) { await richHero(p); await p.evaluate(function () { switchTab("village"); setVillageSubTab("entrepot"); }); },
  equipement: async function (p) { await richHero(p); await p.evaluate(function () { switchTab("equip"); setEquipSubTab("equipment"); }); },
  inventaire: async function (p) { await richHero(p); await p.evaluate(function () { switchTab("equip"); setEquipSubTab("inventory"); }); },
  echoppe: async function (p) { await richHero(p); await p.evaluate(function () { switchTab("equip"); setEquipSubTab("shop"); }); },
  potions: async function (p) { await richHero(p); await p.evaluate(function () { switchTab("shop"); setShopSubTab("potions"); }); },
  heros: async function (p) { await richHero(p); await p.evaluate(function () { switchTab("more"); setHerosSubTab("hero"); }); },
  stats: async function (p) { await richHero(p); await p.evaluate(function () { switchTab("more"); setHerosSubTab("hero"); openHerosSheet("stats"); }); },
  capacites: async function (p) { await richHero(p); await p.evaluate(function () { switchTab("more"); setHerosSubTab("hero"); openHerosSheet("abilities"); }); },
  talents: async function (p) { await richHero(p); await p.evaluate(function () { switchTab("more"); setHerosSubTab("talents"); }); },
  compagnons: async function (p) { await richHero(p); await p.evaluate(function () { switchTab("more"); setHerosSubTab("companions"); }); },
  grimoire: async function (p) { await richHero(p); await p.evaluate(function () { switchTab("grimoire"); }); },
  hauts_faits: async function (p) { await richHero(p); await p.evaluate(function () { switchTab("achievements"); }); },
  bestiaire: async function (p) { await richHero(p); await p.evaluate(function () { switchTab("bestiary"); toggleBestiaryWorld(0); }); },
  codex: async function (p) { await richHero(p); await p.evaluate(function () { switchTab("bestiary"); setBestiaryCodexSubTab("codex"); toggleCodexCategory("intro"); }); },
  tutoriels: async function (p) { await richHero(p); await p.evaluate(function () { switchTab("tutorials"); }); },
  journal: async function (p) { await richHero(p); await p.evaluate(function () { switchTab("log"); }); },
  memoire: async function (p) { await richHero(p); await p.evaluate(function () { switchTab("ascension"); }); },
  donjons: async function (p) { await richHero(p); await p.evaluate(function () { switchTab("dungeon"); }); }
};

async function richHero(p) {
  await newHero(p);
  await p.evaluate(function () {
    Object.assign(game.unlockedTabs, { talents: true, grimoire: true, achievements: true, bestiary: true, tutorials: true, log: true,
      settings: true, ascension: true, companions: true, equip: true, shop: true, dungeon: true, quests: true });
    Object.keys(PRODUCTION_UNLOCK_FLAGS).forEach(function (id) { game.explorationProgression[PRODUCTION_UNLOCK_FLAGS[id]] = true; });
    Object.keys(PRODUCTION_BUILDINGS).forEach(function (id) { ProductionManager.unlockBuilding(id); });
    game.gold = 5000;
    var sl = Object.keys(EQUIPMENT_SLOT_CONFIG);
    ["common", "rare", "epic", "legendary"].forEach(function (r, i) { var it = generateEquipmentItem(sl[i % sl.length], r, 0); if (it) game.inventory.push(it); });
    game.killCounts = game.killCounts || {}; game.killCounts.slime = 3;
    if (window.CompanionManager && CompanionManager.unlock) CompanionManager.unlock("wenna");
    if (window.MemoryManager) MemoryManager.gainAether(400, null);
    saveGame();
  });
  await closeTut(p);
}

async function closeTut(p) {
  for (var i = 0; i < 8; i++) {
    var b = p.locator("button:visible", { hasText: /Compris|Continuer/ });
    if (!(await b.count())) return;
    await b.first().click(); await p.waitForTimeout(250);
  }
}
async function newHero(p) {
  await p.evaluate(function () { titleScreenNewGame(); pendingHeroId = "knight"; pendingPlayerName = "Test"; confirmHeroSelection();
    game.unlockedTabs = Object.assign({}, game.unlockedTabs, { village: true, map: true, combat: true, more: true }); saveGame(); });
  await p.waitForTimeout(500); await closeTut(p);
}

(async function () {
  var srv = await serve(), base = "http://localhost:" + srv.address().port;
  var browser = await chromium.launch();
  var total = 0;
  for (var name of Object.keys(SCREENS)) {
    if (ONLY && ONLY.indexOf(name) < 0) continue;
    var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block", locale: "fr-FR" });
    await ctx.addInitScript(function () { try { localStorage.setItem("aethervale_prefs", JSON.stringify({ lang: "xx", installHint: false })); } catch (e) {} });
    var p = await ctx.newPage(), errs = [];
    p.on("pageerror", function (e) { errs.push(e.message); });
    p.on("dialog", function (d) { d.accept(); });
    await p.goto(base + "/index.html");
    await p.waitForFunction(function () { var t = document.getElementById("title-screen-root"); return t && t.innerHTML.length > 0; }, null, { timeout: 15000 });
    await p.waitForTimeout(500);
    try { await SCREENS[name](p); } catch (e) { errs.push("écran : " + e.message); }
    await p.waitForTimeout(500);
    var bare = await p.evaluate(scanPage);
    var uniq = bare.filter(function (x, i) { return bare.indexOf(x) === i; });
    total += uniq.length;
    console.log("\n[" + name + "] " + uniq.length + " texte(s) nu(s)" + (errs.length ? "  — erreurs : " + errs.join(" | ") : ""));
    uniq.forEach(function (x) { console.log("  · " + x.slice(0, 110)); });
    await ctx.close();
  }
  await browser.close(); srv.close();
  console.log("\nTotal : " + total + " texte(s) nu(s)");
})();
