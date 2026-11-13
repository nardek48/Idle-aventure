"use strict";
/* tools/audit/coach-captures.js — chantier « tutoriels sur l'écran » (Seb 13/11, option A) : joue un tutoriel dans son
   vrai contexte (étape d'Histoire acceptée, ou déclencheur générique), puis capture chaque bulle à taille iPhone.
   USAGE : node tools/audit/coach-captures.js . forest_03,forest_04 [--dump] [--sortie coach] [--saves captures/coach-saves]
   --dump : liste aussi les éléments visibles de l'écran (classes, position, texte) pour choisir les sélecteurs.
   --saves : dossier de vraies sauvegardes <id>.json écrites par le robot à l'entrée de l'étape
     (SAVE_OUT=<dossier>/<id>.json node tools/sim/campagne-harness.js . --combats --joueur --jusqua <id>) ; sans elle, état reconstruit.
   Sortie : captures/<sortie>/<id>_<n>.png et un résumé (bulles trouvées, ou « fenêtre » si le tutoriel retombe). */
var http = require("http"), fs = require("fs"), path = require("path");
var C = require("../chemins.js");
var ROOT = C.jeu(process.argv[2]);
var ARGS = process.argv.slice(3);
var IDS = (ARGS[0] || "").split(",").filter(Boolean);
var DUMP = ARGS.indexOf("--dump") >= 0;
var NAV = ARGS.indexOf("--nav") >= 0 ? ARGS[ARGS.indexOf("--nav") + 1] : null; // geste d'exploration (avec --dump)
var SAVES = ARGS.indexOf("--saves") >= 0 ? path.resolve(ARGS[ARGS.indexOf("--saves") + 1]) : null;
var OUT = C.captures(ARGS.indexOf("--sortie") >= 0 ? ARGS[ARGS.indexOf("--sortie") + 1] : "coach");
var playwright = require("playwright");

var TYPES = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".webp": "image/webp", ".png": "image/png", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
function serve() {
  return new Promise(function (ok) {
    var srv = http.createServer(function (q, r) {
      var f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]));
      if (f.endsWith("/")) f += "index.html";
      fs.readFile(f, function (e, d) { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); r.end(d); });
    });
    srv.listen(0, "127.0.0.1", function () { ok(srv); });
  });
}

/* Déclencheurs des tutoriels génériques (même geste que le jeu). Un id absent d'ici est cherché dans l'Histoire. */
var GENERIC = {
  sortie_prep: "CompanionManager.state('wenna').unlocked = true; CompanionManager.state('wenna').present = true; switchTab('campement'); openSortiePrep({ title: 'Test', icon: 'images/Icons/quests/mission_dungeon.webp', ctx: { type: 'dungeon', id: 1 }, food: { kind: 'dungeon', ref: DungeonManager.getById(1) }, onGo: function () {} });",
  // lot 2 : PV bas pour que le pronostic s'ouvre (il ne s'ouvre que si c'est Risqué ou sous 50 % de PV)
  combat_forecast: "game.heroHp = Math.floor(game.heroMaxHp * 0.3); switchTab('campement'); var m = MissionBoard.list().filter(function (x) { try { return !!CombatForecast.forMission(x); } catch (e) { return false; } })[0]; launchWithForecast(m || { title: 'Test' }, function () {});",
  pa2_night: "switchTab('campement'); SceneRunManager.startRun('petite_aventure_desert'); game.sceneRun.cond = 'vent'; switchTab('scene');",
  pa2_traps: "switchTab('campement'); SceneRunManager.startRun('petite_aventure_desert'); game.sceneRun.cond = 'pillards'; Pa2Run.addItem('torche'); game.genericTutorialsSeen.pa2_night = true; Pa2Run.depart(); switchTab('scene');",
  equipment_intro: "switchTab('more'); if (typeof setHerosSubTab === 'function') setHerosSubTab('equip'); switchTab('equip');",
  village_training: "switchTab('campement'); switchTab('village');" // lot 2 : le geste du jeu (onglet Village), la feuille n'est plus ouverte
};

/* Mise en place d'une étape d'Histoire : chapitres d'avant finis, étape courante, acceptée par le vrai geste. */
var SETUP_STORY = function (id) {
  var found = null;
  Object.keys(STORY_QUESTS).forEach(function (cid) { STORY_QUESTS[cid].steps.forEach(function (s, i) { if (s.id === id) found = { cid: cid, i: i, step: s }; }); });
  if (!found) return "inconnu";
  game.unlockedTabs = game.unlockedTabs || {};
  var order = Object.keys(STORY_QUESTS), stop = false;
  order.forEach(function (cid) {
    if (stop) return;
    var ch = STORY_QUESTS[cid], st = StoryQuestManager.getState(cid);
    var upto = cid === found.cid ? found.i : ch.steps.length;
    for (var k = 0; k < upto; k++) (ch.steps[k].unlockTabs || []).forEach(function (t) { game.unlockedTabs[t] = true; });
    st.currentStep = upto; st.accepted = false; st.tutorialsSeen = {};
    if (cid === found.cid) stop = true;
  });
  game.gold = Math.max(Number(game.gold || 0), 20000);
  if (typeof WorldManager !== "undefined") WorldManager.worldIndex = Math.max(0, order.indexOf(found.cid));
  StoryQuestManager.acceptStep(found.cid);
  var st2 = StoryQuestManager.getState(found.cid); st2.tutorialsSeen = {};
  var h = document.getElementById("tutorial-modal-root"); if (h) h.innerHTML = "";
  try { pendingTutorial = null; } catch (e) {}
  var tab = found.step.tutorial && found.step.tutorial.tab;
  if (tab) game.unlockedTabs[tab] = true; // l'onglet du tutoriel est ouvert à ce stade de l'Histoire
  if (game.activeTab === tab) switchTab("campement");
  return tab || "sans-tutoriel";
};

/* Sauvegarde du robot, arrêtée à l'entrée de l'étape : il reste à l'accepter (le vrai geste) et à oublier son tutoriel. */
var ACCEPT_SAVED = function (id) {
  var found = null;
  Object.keys(STORY_QUESTS).forEach(function (cid) { STORY_QUESTS[cid].steps.forEach(function (s, i) { if (s.id === id) found = { cid: cid, step: s }; }); });
  if (!found) return "inconnu";
  var st = StoryQuestManager.getState(found.cid);
  if (!StoryQuestManager.getCurrentStep(found.cid) || StoryQuestManager.getCurrentStep(found.cid).id !== id) return "sauvegarde-pas-a-l-etape";
  if (!st.accepted) StoryQuestManager.acceptStep(found.cid);
  st.tutorialsSeen = {};
  var h = document.getElementById("tutorial-modal-root"); if (h) h.innerHTML = "";
  try { pendingTutorial = null; } catch (e) {}
  var tab = found.step.tutorial && found.step.tutorial.tab;
  if (game.activeTab === tab) switchTab("campement");
  return tab || "sans-tutoriel";
};

/* Lot 2 : étape de combat — « Partir » sur la carte d'Histoire, puis les boutons de départ, jusqu'à l'écran de combat. */
var GO_COMBAT = function (id) {
  var cid = Object.keys(STORY_QUESTS).filter(function (c) { var s = StoryQuestManager.getCurrentStep(c); return s && s.id === id; })[0];
  var m = MissionBoard.getById("story_" + cid); if (m) (m.launch || m.accept)();
  var sel = [".kwin-foot .kbtn.primary", ".sp-foot .kbtn.primary", ".sp-foot .kbtn.danger", "button.kbtn.primary"];
  return new Promise(function (ok) {
    var n = 0, t = setInterval(function () {
      if (game.activeTab === "combat") { clearInterval(t); setTimeout(ok, 300); return; }
      for (var i = 0; i < sel.length; i++) { var b = document.querySelector(sel[i]); if (b && b.offsetParent) { b.click(); break; } }
      if (++n > 30) { clearInterval(t); ok(); }
    }, 300);
  });
};

(async function () {
  if (!IDS.length) { console.error("Donner au moins un id de tutoriel (ex. forest_03,sortie_prep)."); process.exit(2); }
  var srv = await serve(), base = "http://127.0.0.1:" + srv.address().port + "/index.html";
  var browser = await playwright.chromium.launch(), bilan = [];
  for (var n = 0; n < IDS.length; n++) {
    var id = IDS[n];
    var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "fr-FR" });
    var page = await ctx.newPage(), errs = [];
    page.on("pageerror", function (e) { errs.push(e.message); });
    var saveFile = SAVES && path.join(SAVES, id + ".json"), fromSave = !!(saveFile && fs.existsSync(saveFile));
    if (fromSave) await ctx.addInitScript(function (json) { if (!sessionStorage.getItem("cc")) { sessionStorage.setItem("cc", "1"); localStorage.setItem("quest_idle_save_v6_slot1", json); localStorage.setItem("quest_idle_active_slot", "1"); } }, fs.readFileSync(saveFile, "utf8"));
    await page.goto(base); await page.waitForTimeout(1200);
    if (fromSave) { // l'horloge du robot est loin : l'écran de retour s'ouvre, on le ferme comme un joueur
      await page.click(".title-screen-continue"); await page.waitForTimeout(1500);
      await page.evaluate(function () { // écran de retour et « Quoi de neuf » (sauvegarde d'une version d'avant) fermés
        if (typeof closeReturnScreen === "function") closeReturnScreen();
        [].slice.call(document.querySelectorAll('[id$="-modal-root"], #news-root')).forEach(function (el) { if (el.id !== "tutorial-modal-root") el.innerHTML = ""; });
        if (window.Prefs && typeof GAME_VERSION === "string") Prefs.setValue("newsSeen", GAME_VERSION);
      });
      await page.waitForTimeout(300);
    }
    else {
    await page.click(".title-screen-img-btn"); await page.waitForTimeout(400);
    await page.click(".prologue-skip"); await page.waitForTimeout(300);
    await page.fill("#player-name-input", "Aube"); await page.locator("#player-name-input").press("Enter"); await page.waitForTimeout(300);
    await page.locator('[onclick^="selectHeroClass"]').first().click(); await page.waitForTimeout(250);
    var nx = page.locator('[onclick^="goToConfirmStep"]'); if (await nx.count()) { await nx.first().click(); await page.waitForTimeout(250); }
    await page.locator('[onclick^="confirmHeroSelection"]').first().click(); await page.waitForTimeout(800);
    await page.click(".prologue-skip").catch(function () {}); await page.waitForTimeout(600);
    }
    // tous les tutoriels déjà vus, sauf celui qu'on joue
    await page.evaluate(function (id) {
      var h = document.getElementById("tutorial-modal-root"); if (h) h.innerHTML = "";
      try { if (window.CoachTutorial) { CoachTutorial._token = null; CoachTutorial.steps = null; } pendingTutorial = null; } catch (e) {}
      game.genericTutorialsSeen = {}; Object.keys(GENERIC_TUTORIALS).forEach(function (k) { if (k !== id) game.genericTutorialsSeen[k] = true; });
    }, id);
    var trig = GENERIC[id], tab = null;
    if (trig) await page.evaluate(trig);
    else {
      tab = await page.evaluate(fromSave ? "(" + ACCEPT_SAVED.toString() + ")(" + JSON.stringify(id) + ")" : "(" + SETUP_STORY.toString() + ")(" + JSON.stringify(id) + ")");
      await page.waitForTimeout(300);
      if (tab === "combat") await page.evaluate("(" + GO_COMBAT.toString() + ")(" + JSON.stringify(id) + ")"); // lot 2 : on part vraiment au combat
      else {
        if (DUMP) await page.evaluate("switchTab(" + JSON.stringify(tab) + ")"); // l'écran, pour le relevé des éléments
        await page.evaluate("switchTab(" + JSON.stringify(tab) + "); if (typeof renderPanel === 'function') renderPanel();");
      }
    }
    await page.waitForTimeout(1300);
    for (var w = 0; w < 30 && await page.locator("#tutorial-modal-root .coach-wait").count(); w++) await page.waitForTimeout(100);
    var bulles = [], mode = "aucun";
    if (await page.locator("#tutorial-modal-root .coach").count()) {
      mode = "écran";
      for (var k = 0; k < 12 && await page.locator("#tutorial-modal-root .coach").count(); k++) {
        var t = await page.evaluate(function () { var c = document.querySelector("#tutorial-modal-root .coach"); return c.querySelector(".coach-t").textContent + " " + c.querySelector(".coach-n").textContent; });
        bulles.push(t);
        await page.screenshot({ path: path.join(OUT, id + "_" + (k + 1) + ".png") });
        await page.locator("#tutorial-modal-root .coach-next").click(); await page.waitForTimeout(350);
      }
    } else if (await page.locator("#tutorial-modal-root .tutorial-modal, #tutorial-modal-root button").count()) {
      mode = "fenêtre";
      await page.screenshot({ path: path.join(OUT, id + "_fenetre.png") });
    }
    if (DUMP) {
      await page.evaluate(function () { var h = document.getElementById("tutorial-modal-root"); if (h) h.innerHTML = ""; });
      if (NAV) { await page.evaluate(NAV); await page.waitForTimeout(700); }
      await page.screenshot({ path: path.join(OUT, id + "_ecran.png") });
      var list = await page.evaluate(function () {
        var W = innerWidth, H = innerHeight, o = [];
        document.querySelectorAll("[class]").forEach(function (el) {
          var r = el.getBoundingClientRect(); if (r.width < 8 || r.height < 8 || r.bottom < 0 || r.top > H || r.right < 0 || r.left > W) return;
          var cs = getComputedStyle(el); if (cs.visibility === "hidden" || cs.display === "none") return;
          o.push(Math.round(r.top) + "," + Math.round(r.left) + " " + Math.round(r.width) + "x" + Math.round(r.height) + " " + el.tagName.toLowerCase() + "." + String(el.className).trim().split(/\s+/).join(".") + " « " + (el.innerText || "").replace(/\s+/g, " ").slice(0, 50) + " »");
        });
        return o;
      });
      // chaque étape de la bulle : trouvée, à l'écran, au premier plan (les raisons d'un repli en fenêtre)
      var diag = await page.evaluate(function (id) {
        var def = window.COACH_TUTORIALS && COACH_TUTORIALS[id], CT = window.CoachTutorial;
        if (!def) return ["pas d'étapes déclarées"];
        if (typeof def.prepare === "function") def.prepare();
        return def.steps.map(function (st) { var r = CT._rect(st); return st.sel + " → " + (r ? "trouvé" : "absent") + (r ? (CT._onScreen(r) ? ", à l'écran" : ", hors écran") + (CT._onTop(st) ? ", au premier plan" : ", couvert") : ""); });
      }, id);
      list.unshift("ÉTAPES : " + diag.join(" | "));
      fs.writeFileSync(path.join(OUT, id + "_ecran.txt"), list.join("\n"));
    }
    bilan.push(id + (tab ? " (" + tab + ")" : "") + " : " + mode + (bulles.length ? " — " + bulles.join(" · ") : "") + (errs.length ? " — ERREURS " + errs.join(" | ") : ""));
    await ctx.close();
  }
  await browser.close(); srv.close();
  console.log(bilan.join("\n"));
  console.log("Captures : " + OUT);
})();
