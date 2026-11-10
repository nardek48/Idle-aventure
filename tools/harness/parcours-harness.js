"use strict";
/* tools/harness/parcours-harness.js — v3.351.0 (H-0), v3.352.0 (H-1) : harnais de PARCOURS, P1 à P10 ; v3.359.0 : P11 (installer le jeu) ; v3.364.0 : P12 (acte IV du Désert) ; v3.380.0 : P12 déterministe sur la remontée ; v3.618.0 : P14 (habillage des cartes) ; v3.703.0 : P15 (fenêtres au clavier).
   Carte des systèmes v3.350.0 §7. Complète round-harness.js, ne le remplace pas.

   Le VRAI index.html, servi en http://localhost (service worker compris), dans Chromium à la
   taille d'un iPhone. Le script fait les gestes du joueur (toucher, changer d'onglet, fermer
   l'app, revenir) et vérifie ce qui est À L'ÉCRAN. L'état interne ne sert qu'à FABRIQUER une
   partie de départ (setup) et, en second, à confirmer un effet (ressource créditée).

   Lancer :   node tools/harness/parcours-harness.js .            (tous les parcours)
              node tools/harness/parcours-harness.js . P2 P5      (au choix)
   Prérequis : npm i -D playwright  puis  npx playwright install chromium
   Sortie :    une ligne ✔/✘ par contrôle, erreurs de console, captures dans captures/parcours/. */

var http = require("http"), fs = require("fs"), path = require("path");
var chromium;
try { chromium = require("playwright").chromium; }
catch (e) { console.error("Playwright absent : npm i -D playwright && npx playwright install chromium"); process.exit(2); }

var ROOT = require("../chemins.js").jeu(process.argv[2]);
var ONLY = process.argv.slice(3);
var SHOTS = require("../chemins.js").captures("parcours");
var H = 3600e3;

/* ---------- Serveur statique (le service worker exige http) ---------- */

var MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".json": "application/json", ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2", ".mp3": "audio/mpeg", ".ico": "image/x-icon" };

function serve(root) {
  return new Promise(function (resolve) {
    var srv = http.createServer(function (req, res) {
      var p = decodeURIComponent(req.url.split("?")[0]);
      if (p === "/") p = "/index.html";
      if (srv._override && srv._override[p] != null) {          // P9 : une « nouvelle version » en ligne
        res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "text/plain", "Cache-Control": "no-store" });
        return res.end(srv._override[p]);
      }
      var f = path.join(root, p);
      if (f.indexOf(root) !== 0 || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "Content-Type": MIME[path.extname(f).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(0, "127.0.0.1", function () { resolve(srv); });
  });
}

/* ---------- Contrôles ---------- */

var passes = 0, failures = 0, current = "";
function ok(cond, msg) {
  if (cond) { passes++; console.log("  ✔ " + msg); }
  else { failures++; console.log("  ✘ " + msg); }
  return !!cond;
}

/* ---------- Un appareil, des lancements ---------- */

/* Un « appareil » = un contexte de navigateur : localStorage et service worker persistent
   entre ses pages, comme sur l'iPhone entre deux ouvertures de la PWA. */
async function newDevice(browser, ua, opts) {
  var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "fr-FR", userAgent: ua || undefined }); // v3.359.0 : ua optionnel (P11, iPhone)
  // v3.761.0 : tutoriels sur l'écran coupés (fenêtre classique) sauf pour les parcours qui les testent (opts.coach)
  if (!(opts && opts.coach)) await ctx.addInitScript(function () { window.COACH_OFF = true; });
  return ctx;
}

/* Ouvre la PWA et attend l'écran titre. Tuer l'app = page.close(). */
var lastPage = null;
async function launch(device, base) {
  var page = await device.newPage();
  page.setDefaultTimeout(6000);
  lastPage = page;
  page._errors = [];
  page.on("pageerror", function (e) { page._errors.push(e.message); });
  page.on("console", function (m) { if (m.type() === "error" || (m.type() === "warning" && /^\[rattrapée\]/.test(m.text()))) page._errors.push(m.text()); }); // v3.692.0 (ARCH-14) : une erreur rattrapée compte
  // window.confirm : le parcours décide (page._answer = true/false), le message est gardé
  page._answer = true; page._dialogs = [];
  page.on("dialog", function (d) { page._dialogs.push(d.message()); if (page._answer) d.accept(); else d.dismiss(); });
  await page.goto(base + "/index.html");
  await page.waitForFunction(function () {
    var gate = document.getElementById("pwa-boot-gate");
    var title = document.getElementById("title-screen-root");
    return (!gate || !gate.classList.contains("show")) && title && title.innerHTML.length > 0;
  }, null, { timeout: 15000 });
  return page;
}

async function shot(page, name) {
  if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, current + "_" + name + ".png") });
}

async function visible(page, selector, timeout) {
  try { await page.locator(selector).first().waitFor({ state: "visible", timeout: timeout || 3000 }); return true; }
  catch (e) { return false; }
}

async function tap(page, selector) {
  await page.locator(selector).first().click();
  await page.waitForTimeout(250);
}

/* Les tutoriels d'un héros neuf s'ouvrent par-dessus : on les ferme comme un joueur. */
async function dismissTutorials(page) {
  // v3.761.0 : un tutoriel sur l'écran se mesure après la pose de l'écran (voile d'attente) : on l'attend
  for (var w = 0; w < 30 && await page.locator("#tutorial-modal-root .coach-wait").count(); w++) await page.waitForTimeout(100);
  for (var i = 0; i < 6; i++) {
    var sk = page.locator("#tutorial-modal-root .coach-skip"); // v3.761.0 : tutoriel sur l'écran, « Passer » comme un joueur pressé
    if (await sk.count() && await sk.first().isVisible()) {
      (page._coachLog = page._coachLog || []).push(await page.evaluate(function () { var c = document.querySelector("#tutorial-modal-root .coach"); return c ? c.querySelector(".coach-t").textContent + " " + c.querySelector(".coach-n").textContent + " " + isBlockingModalOpen() : ""; }));
      await sk.first().click(); await page.waitForTimeout(250); continue;
    }
    var b = page.locator("#tutorial-modal-root button", { hasText: "Compris" });
    if (!(await b.count()) || !(await b.first().isVisible())) return;
    await b.first().click();
    await page.waitForTimeout(250);
  }
}

function consoleClean(page) {
  var errs = (page._errors || []).filter(function (m) { return !/service worker|Failed to load resource/i.test(m); });
  return ok(errs.length === 0, "console sans erreur" + (errs.length ? " : " + errs.slice(0, 2).join(" | ") : ""));
}

/* ---------- Fabriquer une partie (setup seulement) ---------- */

/* Crée un héros dans le premier emplacement vide, depuis l'écran titre, puis applique `prep`
   (fonction exécutée dans la page) et sauvegarde. Le héros créé devient le dernier joué. */
async function makeHero(page, name, heroId, prep) {
  await page.evaluate(function (a) {
    titleScreenNewGame(); if (window.PrologueView) PrologueView.skip(); // v3.570.0 : setup, prologue passé
    pendingHeroId = a.heroId; pendingPlayerName = a.name; confirmHeroSelection(); if (window.PrologueView) PrologueView.skip();
  }, { name: name, heroId: heroId });
  await page.waitForTimeout(300);
  // prep : une fonction ou une liste, exécutées DANS la page (pas de fermeture sur le script)
  var preps = [].concat(prep || []);
  for (var i = 0; i < preps.length; i++) await page.evaluate(preps[i]);
  await page.evaluate(function () { saveGame(); });
}

/* Un village qui produit : les six zones débloquées. */
function prepVillage() {
  game.unlockedTabs = Object.assign({}, game.unlockedTabs, { village: true, map: true, combat: true, more: true });
  Object.keys(PRODUCTION_UNLOCK_FLAGS).forEach(function (id) { game.explorationProgression[PRODUCTION_UNLOCK_FLAGS[id]] = true; });
  Object.keys(PRODUCTION_BUILDINGS).forEach(function (id) { ProductionManager.unlockBuilding(id); });
  game.activeTab = "campement";
}

/* Vieillit une sauvegarde : toutes ses dates récentes reculent de `ms` (absence simulée). */
async function age(page, slot, ms) {
  await page.evaluate(function (a) {
    var key = "quest_idle_save_v6_slot" + a.slot, now = Date.now();
    var d = JSON.parse(localStorage.getItem(key));
    (function shift(o) {
      if (!o || typeof o !== "object") return;
      Object.keys(o).forEach(function (k) {
        var v = o[k];
        if (typeof v === "number" && v > now - 864e5 && v <= now + 864e5) o[k] = v - a.ms; else shift(v);
      });
    })(d);
    localStorage.setItem(key, JSON.stringify(d));
  }, { slot: slot, ms: ms });
}

async function savedAt(page, slot) {
  return page.evaluate(function (s) { var d = JSON.parse(localStorage.getItem("quest_idle_save_v6_slot" + s) || "{}"); return d.savedAt || 0; }, slot);
}


/* ---------- Gestes composés ---------- */

/* Gagne le combat en cours : les ennemis tombent à 1 PV (le parcours teste l'enchaînement,
   pas l'équilibrage), puis ATTAQUER jusqu'à ce que `done()` (dans la page) soit vrai. */
async function winFight(page, doneSelectorOrFn, maxTaps) {
  for (var i = 0; i < (maxTaps || 10); i++) {
    await dismissTutorials(page);
    if (await page.locator("#tutorial-modal-root button").count() === 0 && await page.locator(".bm-intro").count()) await tap(page, ".bm-intro");
    await page.evaluate(function () { if (window.CombatActors) CombatActors.enemies().forEach(function (e) { if (e.hp > 1) e.hp = 1; }); });
    var atk = page.locator("#combat-attack-btn:not([disabled])");
    if (await atk.count() && await atk.first().isVisible()) await atk.first().click();
    await page.waitForTimeout(700);
    var fini = typeof doneSelectorOrFn === "string" ? await visible(page, doneSelectorOrFn, 300) : await page.evaluate(doneSelectorOrFn);
    if (fini) return true;
  }
  return false;
}

/* v3.390.0 : joue un run Pa2Run au doigt (nœud ouvert, premier choix, continuer). Renvoie vrai
   si `seek` a été lu dans une feuille en route. */
async function drivePa2(page, seek, maxSteps) {
  var seen = false;
  for (var i = 0; i < (maxSteps || 14); i++) {
    await dismissTutorials(page);
    await page.evaluate(function () { if (typeof closeWorkshopCompletionPopup === "function") closeWorkshopCompletionPopup(); });
    var st = await page.evaluate(function () { var r = game.sceneRun; return r ? r.status : null; });
    if (!st || st === "completed") break;
    // v3.467.0 : après un piège, la feuille du nœud est déjà ouverte (pas de sentier à toucher)
    if (st === "pa2-map") {
      if (!(await page.locator(".pa2-node.is-open").count())) break;
      await tap(page, ".pa2-node.is-open");
    }
    await page.waitForTimeout(900);
    if (seek && !seen) seen = await page.evaluate(function (t) { var o = document.getElementById("pa2-overlay"); return !!o && o.innerText.indexOf(t) >= 0; }, seek);
    // Un combat se fuit (héros sans équipement : l'estimation le dit mortel) ; ailleurs, le premier choix.
    var choice = page.locator('#pa2-overlay .pa2-choice[onclick="pa2Flee()"]:not([disabled])');
    if (!(await choice.count())) choice = page.locator("#pa2-overlay .pa2-choice:not([disabled])");
    if (await choice.count()) await choice.first().click();
    await page.waitForTimeout(2800);
    var cont = page.locator("#pa2-overlay .kbtn.primary:not([disabled])");
    if (await cont.count() && await cont.first().isVisible()) { await page.waitForTimeout(500); await cont.first().click({ force: true }); }
    await page.waitForTimeout(500);
  }
  return seen;
}

/* Tout le monde débloqué comme en fin de Forêt, carte libérée sauf `except`. */
function prepMap(except) {
  return new Function("LivingMapManager.ensureDefaults(); var st = game.livingMaps.forest.sectors;"
    + "Object.keys(st).forEach(function (id) { if (" + JSON.stringify(except || []) + ".indexOf(id) < 0) st[id].state = 'libere'; });"
    + "WarehouseManager.addResource('petite_ration', 10, true); WarehouseManager.addResource('ration', 10, true);"
    + "game.heroMaxHp = 99999; game.heroHp = 99999;");
}

/* ====================================================================================
   P2 — Soir / matin. Village qui produit, Wenna partie 8 h, app tuée, 9 h plus tard :
   « Continuer », écran de retour, « Tout récolter ». Coutures C1, C3.
   ==================================================================================== */
async function P2(browser, base) {
  var dev = await newDevice(browser);
  var page = await launch(dev, base);
  await makeHero(page, "Nardek", "ranger", [prepVillage, function () {
    CompanionManager.unlock("wenna");
    game.patrols = { wenna: { mapId: "forest", sectorId: "lisiere", hours: 8, startedAt: Date.now(), endsAt: Date.now() + 8 * 3600e3,
      loot: { bois: 12, viande: 8 }, gold: 60, story: { rare: false, index: 0 } } };
  }]);
  await page.close();                                   // le soir : l'app est tuée

  page = await launch(dev, base);                       // on ne fait qu'ouvrir pour vieillir la save
  await age(page, 1, 9 * H);
  await page.close();

  page = await launch(dev, base);                       // le matin
  ok(await visible(page, ".title-screen-continue"), "écran titre : bouton « Continuer »");
  ok(/Nardek/.test(await page.locator(".title-screen-continue").innerText()), "« Continuer » nomme le héros (Nardek)");
  await shot(page, "1_titre");
  await tap(page, ".title-screen-continue");

  ok(await visible(page, ".ret-card", 4000), "écran de retour ouvert");
  var txt = await page.locator(".ret-card").innerText().catch(function () { return ""; });
  ok(/Pendant ton absence/.test(txt), "titre « Pendant ton absence »");
  ok(/9 h/.test(txt), "durée d'absence affichée (9 h)");
  ok(/Village/.test(txt), "rubrique Village (production de la nuit)");
  ok(/Wenna/.test(txt), "rubrique Patrouilles : Wenna est rentrée");
  ok(await page.locator(".ret-card").count() === 1, "un seul écran de retour");
  await shot(page, "2_retour");

  var before = await page.evaluate(function () { return Object.keys(WAREHOUSE_RESOURCES).reduce(function (s, k) { return s + WarehouseManager.getAmount(k); }, 0); });
  var btn = page.locator(".ret-acts button", { hasText: "Tout récolter" });
  ok(await btn.count() === 1, "bouton « Tout récolter »");
  if (await btn.count()) await btn.first().click();
  await page.waitForTimeout(300);
  ok(/Récolte faite/.test(await page.locator(".ret-card").innerText()), "« Récolte faite » affiché");
  var after = await page.evaluate(function () { return Object.keys(WAREHOUSE_RESOURCES).reduce(function (s, k) { return s + WarehouseManager.getAmount(k); }, 0); });
  ok(after > before, "l'Entrepôt a reçu la récolte (" + before + " -> " + after + ")");
  await shot(page, "3_recolte");

  await tap(page, ".ret-close");
  ok(!(await visible(page, ".ret-card", 500)), "« Continuer » ferme l'écran de retour");
  consoleClean(page);
  await dev.close();
}

/* ====================================================================================
   P3 — Deux héros. Nardek joué il y a 8 h, Luca il y a 1 h (le dernier joué). Au démarrage,
   « Charger » Nardek : son écran de retour, sans réécrire Luca. Puis Héros › Mes héros ›
   Luca : son écran de retour à lui. Couture C1.
   ==================================================================================== */
async function P3(browser, base) {
  var dev = await newDevice(browser);
  var page = await launch(dev, base);
  await makeHero(page, "Nardek", "knight", prepVillage);
  await makeHero(page, "Luca", "ranger", prepVillage);   // Luca devient le dernier joué
  await page.close();

  page = await launch(dev, base);
  await age(page, 1, 8 * H);
  await age(page, 2, 1 * H);
  var lucaAt = await savedAt(page, 2);
  await page.close();

  page = await launch(dev, base);
  ok(/Luca/.test(await page.locator(".title-screen-continue").innerText().catch(function () { return ""; })), "« Continuer » propose le dernier joué (Luca)");
  await tap(page, ".title-screen-btn-row .title-screen-img-btn:nth-child(2)");   // « Charger »
  ok(await visible(page, ".title-slot-card.occupied"), "liste des héros affichée");
  await shot(page, "1_liste");
  var nardekCard = page.locator(".title-slot-card.occupied", { hasText: "Nardek" });
  await nardekCard.locator(".title-slot-load-btn").click();
  await page.waitForTimeout(400);

  ok(await visible(page, ".ret-card", 4000), "Nardek chargé au démarrage : écran de retour");
  var txt = await page.locator(".ret-card").innerText().catch(function () { return ""; });
  ok(/8 h/.test(txt), "absence de Nardek entière (8 h)");
  ok(await page.locator(".ret-card").count() === 1, "un seul écran de retour");
  ok(await savedAt(page, 2) === lucaAt, "la sauvegarde de Luca n'a pas été réécrite");
  await shot(page, "2_retour_nardek");
  await tap(page, ".ret-close");
  await dismissTutorials(page);

  // Retour à Luca depuis le jeu : Héros › Résumé › Mes héros
  await tap(page, '.tab-btn[data-tab="more"]');
  await dismissTutorials(page);
  var mes = page.locator("button", { hasText: "Mes héros" });
  ok(await mes.count() > 0, "Héros › « Mes héros »");
  if (await mes.count()) await mes.first().click();
  await page.waitForTimeout(300);
  var lucaCard = page.locator(".title-slot-card.occupied", { hasText: "Luca" });
  await lucaCard.locator(".title-slot-load-btn").click();
  await page.waitForTimeout(500);
  ok(await visible(page, ".ret-card", 4000), "Luca rechargé depuis le jeu (1 h d'absence) : écran de retour");
  await shot(page, "3_retour_luca");
  consoleClean(page);
  await dev.close();
}

/* ====================================================================================
   P5 — Élite de la carte. Carte de la Forêt, secteur de l'Arbre-mère : carte d'entrée,
   combat, coup final, trophée, Sève créditée. Coutures C2, C6, C10.
   ==================================================================================== */
async function P5(browser, base) {
  var dev = await newDevice(browser);
  var page = await launch(dev, base);
  await makeHero(page, "Nardek", "knight", [prepVillage, function () {
    LivingMapManager.ensureDefaults();
    var st = game.livingMaps.forest.sectors;
    Object.keys(st).forEach(function (id) { if (id !== "arbremere") st[id].state = "libere"; });
    WarehouseManager.addResource("petite_ration", 10, true);
    WarehouseManager.addResource("ration", 10, true);
    game.heroMaxHp = 99999; game.heroHp = 99999;         // le parcours teste l'enchaînement, pas l'équilibrage
  }]);
  await page.close();

  page = await launch(dev, base);
  await tap(page, ".title-screen-continue");
  await page.waitForTimeout(400);
  if (await visible(page, ".ret-card", 800)) await tap(page, ".ret-close");
  await dismissTutorials(page);

  await page.evaluate(function () { openLivingMap("forest"); });   // le bouton « Voir la carte » de la fiche du monde
  await page.waitForTimeout(400);
  var node = page.locator(".lm-node[onclick*=\"arbremere\"]");
  ok(await node.count() === 1, "carte : le secteur de l'Arbre-mère est là");
  await node.first().click();
  await page.waitForTimeout(300);
  await shot(page, "1_carte");
  var go = page.locator("button[onclick*=\"startLivingMapSector('arbremere')\"]");
  ok(await go.count() === 1, "fiche du secteur : bouton de départ");
  if (await go.count()) await go.first().click();

  ok(await visible(page, ".bm-intro", 3000), "carte d'entrée de l'élite (C2)");
  var src = await page.locator(".bm-intro-pic").getAttribute("src").catch(function () { return ""; });
  ok(/elite_arbre_mere/.test(src || ""), "portrait propre de l'Arbre-mère sur la carte d'entrée");
  ok(/Élite/i.test(await page.locator(".bm-kicker").innerText().catch(function () { return ""; })), "annoncée comme « Élite »");
  await shot(page, "2_entree");
  await tap(page, ".bm-intro");
  ok(!(await visible(page, ".bm-intro", 500)), "un toucher passe la carte d'entrée");

  var seveAvant = await page.evaluate(function () { return WarehouseManager.getAmount("seve_aeswyn"); });
  await page.evaluate(function () { CombatActors.enemies().forEach(function (e) { e.hp = 1; }); });  // abréger le combat
  var fini = false;
  for (var i = 0; i < 8 && !fini; i++) {
    var atk = page.locator("#combat-attack-btn:not([disabled])");   // le gros bouton ATTAQUER
    if (await atk.count()) await atk.first().click();
    fini = await visible(page, ".bm-final, .bm-win", 1500);
  }
  ok(fini, "coup final mis en scène");
  ok(await visible(page, ".bm-win", 4000), "carte de victoire");
  var win = await page.locator(".bm-win").innerText().catch(function () { return ""; });
  ok(/Nouveau trophée/i.test(win) && /Arbre-mère/.test(win), "« Nouveau trophée » : L'Arbre-mère");
  await shot(page, "3_victoire");
  await tap(page, ".bm-win button");
  ok(!(await visible(page, ".bm-win", 500)), "« Continuer » ferme la victoire");
  var seveApres = await page.evaluate(function () { return WarehouseManager.getAmount("seve_aeswyn"); });
  ok(seveApres > seveAvant, "Sève créditée (" + seveAvant + " -> " + seveApres + ")");
  consoleClean(page);
  await dev.close();
}


/* ====================================================================================
   P1 — Premier lancement : Nouvelle Partie, nom, classe, confirmation, tutoriel d'accueil,
   Campement, première mission, premier combat gagné. Couture C8.
   ==================================================================================== */
async function P1(browser, base) {
  var dev = await newDevice(browser, undefined, { coach: true }); // v3.761.0 : le vrai premier lancement garde les tutoriels sur l'écran
  var page = await launch(dev, base);
  ok(!(await visible(page, ".title-screen-continue", 500)), "tout premier lancement : pas de « Continuer »");
  await tap(page, ".title-screen-img-btn");                          // « Nouvelle Partie »
  // v3.570.0 : le prologue, planches 1-4, puis « Passer ▸ » comme un joueur pressé
  ok(await visible(page, ".prologue-scene", 2000), "prologue : planche 1 par-dessus la création");
  await shot(page, "1_prologue");
  await tap(page, ".prologue-skip");
  ok(!(await visible(page, ".prologue", 300)), "« Passer » : la création apparaît");
  ok(await visible(page, "#player-name-input"), "création : champ du nom");
  await page.fill("#player-name-input", "Aube");
  await page.locator("#player-name-input").press("Enter");
  await page.waitForTimeout(300);
  var cls = page.locator('[onclick^="selectHeroClass"]');
  ok(await cls.count() >= 3, "création : trois classes proposées");
  await cls.first().click(); await page.waitForTimeout(250);
  var next = page.locator('[onclick^="goToConfirmStep"]');
  if (await next.count()) { await next.first().click(); await page.waitForTimeout(250); }
  await shot(page, "1_recap");
  var conf = page.locator('[onclick^="confirmHeroSelection"]');
  ok(await conf.count() === 1, "création : bouton de confirmation");
  await conf.first().click(); await page.waitForTimeout(800);
  ok(await page.evaluate(function () { return PrologueView.active && PrologueView.idx === 4; }), "prologue : planche 5 après la création");
  await tap(page, ".prologue-skip");
  ok(await visible(page, "#tutorial-modal-root .coach-next", 4000), "tutoriel d'accueil affiché sur l'écran (éclairage et bulle)");
  ok(await page.evaluate(function () { var c = document.querySelector("#tutorial-modal-root .coach"); return !!c && c.getAttribute("role") === "dialog" && c.contains(document.activeElement) && !!document.getElementById("tab-bar").closest("[inert]"); }), "tutoriel sur l'écran : fenêtre au lecteur d'écran, focus dedans, fond inerte");
  await page.locator("#tutorial-modal-root .coach-spot").click(); await page.waitForTimeout(300);
  ok(await page.evaluate(function () { var n = document.querySelector("#tutorial-modal-root .coach-n"); return !!n && /^2 \/ /.test(n.textContent); }), "toucher l'élément éclairé passe à l'étape suivante");
  await shot(page, "2_accueil");
  await dismissTutorials(page);
  ok(!(await visible(page, "#tutorial-modal-root button", 400)), "« Compris » ferme les tutoriels");
  ok(await page.evaluate(function () { return game.activeTab === "campement" && game.playerName === "Aube"; }), "Campement, héros « Aube »");
  // Étape 1 « Le feu de camp » : accepter, réclamer
  var accept = page.locator("button", { hasText: "Accepter" });
  ok(await accept.count() > 0, "tableau de missions : « Le feu de camp » à accepter");
  if (await accept.count()) { await accept.first().click(); await page.waitForTimeout(500); }
  await dismissTutorials(page);
  var reclamer = page.locator("button", { hasText: "Réclamer" });
  ok(await reclamer.count() > 0, "« Réclamer » la récompense");
  if (await reclamer.count()) { await reclamer.first().click(); await page.waitForTimeout(600); }
  await dismissTutorials(page);
  var fin = page.locator("[id$='-modal-root'] button", { hasText: "Continuer" });
  ok(await fin.count() > 0 && await fin.first().isVisible(), "fiche de fin d'étape (récit, 50 or)");
  if (await fin.count()) { await fin.first().click(); await page.waitForTimeout(400); }
  await dismissTutorials(page);
  ok(await page.evaluate(function () { return game.gold >= 50; }), "+50 or");

  // Étape 2 « Premier sang » : accepter, partir, premier ennemi vaincu
  for (var k = 0; k < 5 && !(await page.evaluate(function () { return game.activeTab === "combat"; })); k++) {
    // une fiche ouverte d'abord (« Commencer »), sinon le bouton de la mission
    var b = page.locator("[id$='-modal-root'] button:visible", { hasText: /Commencer|Partir/ });
    if (!(await b.count())) b = page.locator("button:visible", { hasText: /Accepter|Partir|Y aller|Commencer/ });
    if (!(await b.count())) break;
    await b.first().click(); await page.waitForTimeout(600);
    await dismissTutorials(page);
  }
  var enCombat = await page.evaluate(function () { return game.activeTab === "combat" && !!game.enemy; });
  ok(enCombat, "« Premier sang » mène au combat");
  if (enCombat) {
    await dismissTutorials(page);
    ok((page._coachLog || []).some(function (l) { return /^Attaquer 1 \/ 6 true$/.test(l); }), "tutoriel du combat sur l'écran : 6 étapes, le combat attend (" + (page._coachLog || []).join(" ; ") + ")");
    ok(await page.evaluate(function () { var st = StoryQuestManager.getState("forest"); return !!(st.tutorialsSeen || {}).forest_02 && !document.querySelector("#tutorial-modal-root").innerHTML; }), "« Passer » : tutoriel noté vu, combat rendu");
  }
  if (enCombat) {
    var kills0 = await page.evaluate(function () { return game.totalKills || 0; });
    ok(await winFight(page, new Function("return (game.totalKills || 0) > " + kills0 + ";")), "premier ennemi vaincu au bouton ATTAQUER");
  }
  await shot(page, "3_combat");
  ok(await page.evaluate(function () { return !!localStorage.getItem("quest_idle_save_v6_slot1"); }), "la partie est sauvegardée");
  consoleClean(page);
  await dev.close();
}

/* ====================================================================================
   P4 — Reprise en plein combat. Élite de la carte, l'app est suspendue 40 min au milieu du
   combat : pastille « Retour », puis écran de retour une fois le combat fini. C3, C5.
   ==================================================================================== */
async function P4(browser, base) {
  var dev = await newDevice(browser);
  await dev.clock.install();                 // horloge du navigateur pilotable (Date, timers, images)
  var page = await launch(dev, base);
  await makeHero(page, "Nardek", "knight", [prepVillage, prepMap(["arbremere"])]);
  await page.close();
  page = await launch(dev, base);
  await tap(page, ".title-screen-continue");
  await dismissTutorials(page);
  await page.evaluate(function () { openLivingMap("forest"); });
  await tap(page, '.lm-node[onclick*="arbremere"]');
  await tap(page, "button[onclick*=\"startLivingMapSector('arbremere')\"]");
  if (await visible(page, ".bm-intro", 2000)) await tap(page, ".bm-intro");
  ok(await page.evaluate(function () { return game.activeTab === "combat"; }), "combat engagé contre l'Arbre-mère");

  // Suspension de la PWA : plus aucune image pendant 40 min, puis une image au réveil
  await page.clock.fastForward(40 * 60e3);   // 40 min d'un coup : ce que voit la PWA au réveil
  await page.waitForTimeout(800);
  ok(await visible(page, ".ret-pending", 2000), "au réveil en plein combat : pastille « Retour »");
  ok(!(await visible(page, ".ret-card", 300)), "l'écran de retour attend (le combat n'est pas coupé)");
  await shot(page, "1_pastille");
  await tap(page, ".ret-pending");
  ok(!(await visible(page, ".ret-card", 300)), "toucher la pastille en combat : toujours rien d'ouvert");

  /* v3.447.0 : la file de tours avance avec la boucle de jeu. Après le saut de l'horloge factice, la boucle
     (requestAnimationFrame factice) peut rester figée : sujet du test = l'écran de retour, pas la cadence.
     On rejoue donc ce combat en mode synchrone (une action joue la fin du round), comme le harnais. */
  await page.evaluate(function () { CombatEngine.paced = false; renderCombatControls(); });   // la boucle figée ne redessine plus
  ok(await winFight(page, ".bm-win, .bm-final"), "combat gagné");
  if (await visible(page, ".bm-win", 4000)) await tap(page, ".bm-win button");
  ok(await visible(page, ".ret-card", 3000), "combat fini : l'écran de retour s'ouvre");
  ok(!(await visible(page, ".ret-pending", 300)), "la pastille disparaît");
  var txt = await page.locator(".ret-card").innerText().catch(function () { return ""; });
  ok(/40 min/.test(txt), "absence de 40 min affichée");
  await shot(page, "2_retour");
  consoleClean(page);
  await dev.close();
}

/* ====================================================================================
   P6 — Quête d'élite escortée (la Fileuse et une araignée de sa couvée) : l'escorte ne
   valide pas la quête, l'élite la valide. Couture C6.
   ==================================================================================== */
async function P6(browser, base) {
  var dev = await newDevice(browser);
  var page = await launch(dev, base);
  await makeHero(page, "Nardek", "knight", [prepVillage, function () { game.heroMaxHp = 99999; game.heroHp = 99999; }]);
  await page.close();
  page = await launch(dev, base);
  await tap(page, ".title-screen-continue");
  await dismissTutorials(page);
  await page.evaluate(function () { AdventureQuestManager.start("eq_forest_spider"); });   // le bouton « Partir » de la quête
  await page.waitForTimeout(400);
  await dismissTutorials(page);
  ok(await page.evaluate(function () { return game.adventureQuestRun.active && game.activeTab === "combat"; }), "quête lancée, écran de combat");

  // Pistage : les araignées ordinaires, jusqu'à l'arrivée de l'élite
  var arrivee = await winFight(page, function () { return !!(game.enemy && game.enemy.isElite); }, 20);
  ok(arrivee, "après le pistage, la Fileuse arrive");
  ok(await visible(page, ".bm-intro", 2000), "carte d'entrée de la Fileuse");
  if (await visible(page, ".bm-intro", 300)) await tap(page, ".bm-intro");
  ok(await page.locator(".cbx-foe:not(.is-dead) .cbx-foe-hit").count() === 2, "deux ennemis à l'écran : l'élite et son escorte"); // v3.427.0 : nouvel écran (scène)
  await shot(page, "1_groupe");

  // L'escorte d'abord : on la vise, elle tombe, la quête n'est pas validée
  var kEscorte = await page.evaluate(function () { var e = CombatActors.enemies()[1]; return e ? e.actorId : ""; });
  var escorte = page.locator('.cbx-foe[data-k="' + kEscorte + '"] .cbx-foe-hit');
  await escorte.click(); await page.waitForTimeout(250);
  await page.evaluate(function () { var e = CombatActors.enemies()[1]; if (e) e.hp = 1; });
  await visible(page, "#combat-attack-btn:not([disabled])", 4000);   // v3.447.0 : l'initiative peut faire jouer l'ennemi d'abord
  await tap(page, "#combat-attack-btn");
  await page.waitForTimeout(900);
  var etat = await page.evaluate(function () { var en = CombatActors.enemies(); return { vivants: en.filter(function (e) { return e.hp > 0; }).map(function (e) { return e.id; }), quete: game.adventureQuestRun.active, fini: !!game.adventureQuestsCompleted.eq_forest_spider }; });
  ok(etat.vivants.length === 1 && etat.vivants[0] === "araignee_marquee", "l'escorte tombe, la Fileuse reste");
  ok(etat.quete && !etat.fini, "l'escorte ne valide pas la quête");

  ok(await winFight(page, function () { return !!game.adventureQuestsCompleted.eq_forest_spider; }), "la Fileuse tombe : quête validée");
  await shot(page, "2_fin");
  consoleClean(page);
  await dev.close();
}

/* ====================================================================================
   P7 — Petite Aventure v2 (v3.382.0) : besace remplie au doigt, départ, carte de nuit, nœuds
   joués dans la feuille, abandon confirmé. La moitié du butin, le héros libéré. Coutures C4, C5.
   ==================================================================================== */
async function P7(browser, base) {
  var dev = await newDevice(browser);
  var page = await launch(dev, base);
  await makeHero(page, "Nardek", "knight", [prepVillage, prepMap(["autel"])]);
  await page.close();
  page = await launch(dev, base);
  await tap(page, ".title-screen-continue");
  await dismissTutorials(page);
  var or0 = await page.evaluate(function () { return game.gold; });
  var pr0 = await page.evaluate(function () { return WarehouseManager.getAmount("petite_ration"); });
  // v3.386.0 : le parcours vise la carte courte ; foret_2 est couverte par round-harness [163].
  await page.evaluate(function () { PA2_MAPS_BY_WORLD.forest = ["foret_1"]; openLivingMap("forest"); });
  await tap(page, '.lm-node[onclick*="autel"]');
  await tap(page, "button[onclick*=\"startLivingMapSector('autel')\"]");
  ok(await page.evaluate(function () { return game.activeTab === "scene" && game.sceneRun && game.sceneRun.status === "pa2-prep"; }), "Petite Aventure v2 ouverte sur la préparation");
  await page.waitForTimeout(400);
  await dismissTutorials(page); // le tutoriel « Préparer une petite aventure » recouvre la besace
  await page.waitForTimeout(400); await dismissTutorials(page); // v3.469.2 : puis « La nuit du run » quand la nuit a une condition

  // v3.723.0 : « Prêt à partir ». La feuille d'ajout reste ouverte : petite ration puis gourde, puis « Fini »
  ok(await page.evaluate(function () { var b = document.querySelector("#pa2-bag"), z = document.querySelector("#panel-container .kfp-scrollzone"); return !!b && !!z && b.getBoundingClientRect().top < z.getBoundingClientRect().bottom; }), "la besace est dans le premier écran");
  await tap(page, ".pa2-addbig");
  ok(await visible(page, "#pa2-overlay .pa2-sheet"), "« Ajouter des objets » ouvre la feuille de la besace");
  await tap(page, "#pa2-overlay button[onclick=\"pa2AddItem('petite_ration')\"]");
  ok(await visible(page, "#pa2-overlay .pa2-sheet"), "la feuille reste ouverte après un ajout");
  await tap(page, "#pa2-overlay button[onclick=\"pa2AddItem('gourde')\"]");
  await tap(page, "#pa2-overlay .pa2-done");
  ok(await page.locator("#pa2-bag .pa2-irow.is-in").count() === 2, "deux objets dans le récapitulatif de la besace");
  await tap(page, "button[onclick=\"pa2TogglePact('lourd')\"]");
  await tap(page, "button[onclick=\"pa2TogglePact('lourd')\"]");
  ok(await page.locator(".pa2-pact[aria-pressed=\"true\"]").count() === 0 && await visible(page, ".pa2-go"), "pactes en bascules sur le même écran, bouton de départ visible");
  // v3.386.0 : Math.random graine (carte, dés, combats) : le héros sans arme ramasse toujours de l'or. v3.422.0 : graine changée (le pool du secteur consomme un tirage de plus).
  await page.evaluate(function () { var t = 20261001; Math.random = function () { t = (t + 0x6D2B79F5) | 0; var x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; });
  await tap(page, "button[onclick=\"pa2Depart()\"]");
  ok(await visible(page, "#pa2-map") && await visible(page, "#pa2-hud"), "départ : carte de nuit et HUD du run");
  ok(await page.evaluate(function (p0) { return WarehouseManager.getAmount("petite_ration") === p0 - 1; }, pr0), "la ration emportée est prise à l'Entrepôt");
  ok(await page.locator("text=/Souffle/").count() > 0, "Souffle affiché");
  await shot(page, "1_run");

  // Héros engagé : le menu du bas disparaît, on ne quitte l'expédition que par ses propres portes
  ok(!(await page.locator('.tab-btn[data-tab="village"]').isVisible()), "pendant l'expédition, le menu du bas est masqué");
  ok(await page.evaluate(function () { return !!(window.heroLockReason && heroLockReason()); }), "le héros est engagé (actions du camp verrouillées)");

  // Quelques nœuds joués au doigt : un sentier doré, puis le premier choix de la feuille
  var avant = 0;
  for (var i = 0; i < 8 && avant <= 0; i++) {
    await dismissTutorials(page); // v3.469.2 : « Pièges et sentiers coupés » au premier piège en vue
    // v3.467.0 : après un piège, la feuille du nœud est déjà ouverte (pas de sentier à toucher)
    if (await page.evaluate(function () { return game.sceneRun && game.sceneRun.status === "pa2-map"; })) {
      // v3.737.0 : échec intermittent (aucune case ouverte sous 6 s en série complète) : on attend plus, et on décrit l'état s'il manque
      if (!(await visible(page, ".pa2-node.is-open", 10000))) {
        ok(false, "P7 : aucune case ouverte sur la carte — " + await page.evaluate(function () { var r = game.sceneRun; return JSON.stringify({ at: r.at, st: r.status, ouverts: Pa2Run.openMoves(), quete: r.quest && r.quest.state, feuille: !!document.querySelector("#pa2-overlay .pa2-sheet"), noeuds: document.querySelectorAll(".pa2-node").length }); }));
        break;
      }
      await tap(page, ".pa2-node.is-open");
    }
    await page.waitForTimeout(900);
    if (!(await visible(page, "#pa2-overlay .pa2-sheet", 2000))) break;
    var card = page.locator("#pa2-overlay .pa2-card");
    if (await card.count()) { await card.first().click(); await page.waitForTimeout(900); await card.first().click(); await page.waitForTimeout(200); }
    // Un combat se fuit (héros sans équipement : l'estimation le dit mortel) ; ailleurs, le premier choix.
    var choice = page.locator('#pa2-overlay .pa2-choice[onclick="pa2Flee()"]:not([disabled])');
    if (!(await choice.count())) choice = page.locator("#pa2-overlay .pa2-choice:not([disabled])");
    if (await choice.count()) await choice.first().click();
    await page.waitForTimeout(2600);
    var fight = page.locator('#pa2-overlay button[onclick="pa2Surprised()"]');
    if (await fight.count()) { await fight.first().click(); await page.waitForTimeout(300); await page.locator("#pa2-overlay .pa2-choice").first().click(); await page.waitForTimeout(2600); }
    var cont = page.locator("#pa2-overlay .kbtn.primary:not([disabled])");
    if (await cont.count() && await cont.first().isVisible()) await cont.first().click();
    await page.waitForTimeout(500);
    avant = await page.evaluate(function () { return game.sceneRun && game.sceneRun.status !== "completed" ? (SortieManager.ensure().loot.gold || 0) : -1; });
    if (process.env.P7_DEBUG) console.log("    [debug]", i, avant, await page.evaluate(function () { var r = game.sceneRun; return r && JSON.stringify({ st: r.status, at: r.at, end: r.end && r.end.how, hp: game.heroHp, max: game.heroMaxHp, last: r.lastResult }); }));
    if (avant < 0) break;
  }
  ok(avant > 0, "butin ramassé en chemin (" + avant + " or)");
  if (avant > 0) {
    await shot(page, "2_combat");
    await tap(page, "button[onclick=\"pa2AskAbandon()\"]");
    ok(await visible(page, "#confirm-modal.show"), "« Abandonner » demande confirmation");
    await tap(page, "#confirm-modal button[onclick=\"closeConfirmModal(true)\"]");
    ok(await visible(page, "button[onclick=\"pa2Leave()\"]"), "bilan de l'aventure affiché");
    await tap(page, "button[onclick=\"pa2Leave()\"]");
  }
  await page.waitForTimeout(600);
  await dismissTutorials(page);
  var apres = await page.evaluate(function () { return { or: game.gold, run: game.sceneRun && game.sceneRun.status, lock: window.heroLockReason ? heroLockReason() : null, keep: SORTIE_FLEE_KEEP_PCT, pr: WarehouseManager.getAmount("petite_ration"), overlay: !!document.getElementById("pa2-overlay") }; });
  ok(apres.run === "completed" || !apres.run, "l'expédition est terminée");
  ok(Math.abs((apres.or - or0) - Math.floor(avant * apres.keep)) <= 1, "abandon : moitié du butin rapportée (" + avant + " -> +" + (apres.or - or0) + " or)");
  ok(!apres.lock, "le héros est libéré");
  ok(!apres.overlay, "plus de calque d'aventure après le retour");
  if (await visible(page, ".ret-card, [id$='-modal-root'] button:has-text('Continuer')", 500)) await tap(page, "[id$='-modal-root'] button:has-text('Continuer')");
  if (await visible(page, ".lmx-back, button[onclick*='closeLivingMap']", 500)) await tap(page, "button[onclick*='closeLivingMap']");
  await tap(page, '.tab-btn[data-tab="village"]');
  ok(await page.evaluate(function () { return game.activeTab === "village"; }), "le Village s'ouvre sans condition");
  await shot(page, "2_apres");
  consoleClean(page);
  await dev.close();
}

/* ====================================================================================
   P8 — Défaite en quête : le héros tombe, retour au Campement, butin de la sortie perdu,
   progression de la quête remise à zéro. Couture C4.
   ==================================================================================== */
async function P8(browser, base) {
  var dev = await newDevice(browser);
  var page = await launch(dev, base);
  await makeHero(page, "Nardek", "knight", [prepVillage]);
  await page.close();
  page = await launch(dev, base);
  await tap(page, ".title-screen-continue");
  await dismissTutorials(page);
  var or0 = await page.evaluate(function () { return game.gold; });
  await page.evaluate(function () { AdventureQuestManager.start("eq_forest_spider"); });
  await page.waitForTimeout(400);
  await dismissTutorials(page);
  var kills = await winFight(page, function () { var p = game.adventureQuestProgress.eq_forest_spider || {}; return Object.keys(p).some(function (k) { return p[k] >= 2; }); }, 6);
  ok(kills, "deux ennemis de pistage vaincus");
  var sac = await page.evaluate(function () { return SortieManager.ensure().loot.gold || 0; });
  ok(sac > 0, "butin dans le sac de sortie (" + sac + " or)");

  // Le héros tombe au prochain coup reçu
  await page.evaluate(function () { game.heroHp = 1; CombatActors.enemies().forEach(function (e) { e.hp = e.maxHp; if (e.stats) e.stats.power = 99999; e.power = 99999; }); });
  for (var i = 0; i < 6 && await page.evaluate(function () { return game.heroHp > 0; }); i++) {
    var atk = page.locator("#combat-attack-btn:not([disabled])");
    if (await atk.count()) await atk.first().click();
    await page.waitForTimeout(700);
  }
  await page.waitForTimeout(500);
  await dismissTutorials(page);
  var r = await page.evaluate(function () { var p = game.adventureQuestProgress.eq_forest_spider || {}; return { tab: game.activeTab, hp: game.heroHp, or: game.gold, run: game.adventureQuestRun.active, prog: Object.keys(p).map(function (k) { return p[k]; }) }; });
  ok(r.hp <= 0 || r.tab === "campement", "le héros est tombé");
  ok(r.tab === "campement", "retour au Campement");
  ok(r.or === or0, "butin de la sortie perdu (or inchangé : " + or0 + " -> " + r.or + ")");
  ok(!r.run && r.prog.every(function (v) { return v === 0; }), "quête arrêtée, progression remise à zéro");
  await shot(page, "1_camp");
  consoleClean(page);
  await dev.close();
}

/* ====================================================================================
   P9 — Mise à jour de la PWA : la version N est installée (service worker), la N+1 est mise
   en ligne. Bandeau de mise à jour, rechargement, nouvelle version, aucune image absente.
   ==================================================================================== */
async function P9(browser, base, srv) {
  var dev = await newDevice(browser);
  var page = await launch(dev, base);
  await page.waitForFunction(function () { return navigator.serviceWorker && navigator.serviceWorker.controller; }, null, { timeout: 15000 }).catch(function () {});
  var v0 = await page.evaluate(function () { return GAME_VERSION; });
  ok(await page.evaluate(function () { return !!navigator.serviceWorker.controller; }), "version " + v0 + " installée (service worker aux commandes)");
  await page.close();

  // Mise en ligne de la N+1 : sw.js et constants.js changent sur le serveur
  var next = v0.replace(/(\d+)\.(\d+)$/, function (m, a, b) { return (Number(a) + 1) + "." + b; });
  srv._override = {
    "/sw.js": fs.readFileSync(path.join(ROOT, "sw.js"), "utf8").replace('"' + v0 + '"', '"' + next + '"'),
    "/js/core/constants.js": fs.readFileSync(path.join(ROOT, "js/core/constants.js"), "utf8").replace('"' + v0 + '"', '"' + next + '"')
  };
  page = await launch(dev, base);
  ok(await visible(page, "#pwa-update-banner.show", 15000), "bandeau « mise à jour » affiché");
  await shot(page, "1_bandeau");
  await page.evaluate(function () { reloadForPwaUpdate(); });
  await page.waitForLoadState("load");
  await page.waitForTimeout(1500);
  var v1 = await page.evaluate(function () { return GAME_VERSION; });
  ok(v1 === next, "après rechargement : version " + next + " (" + v1 + ")");
  ok(/v?\d/.test(await page.locator(".title-screen-version").innerText().catch(function () { return ""; })) && (await page.locator(".title-screen-version").innerText()).indexOf(next) >= 0, "l'écran titre affiche v" + next);
  var cassees = await page.evaluate(function () { return Array.from(document.images).filter(function (i) { return i.complete && i.naturalWidth === 0; }).map(function (i) { return i.getAttribute("src"); }); });
  ok(cassees.length === 0, "aucune image absente à l'écran" + (cassees.length ? " : " + cassees.slice(0, 3).join(", ") : ""));
  srv._override = null;
  consoleClean(page);
  await dev.close();
}

/* ====================================================================================
   P10 — Réglages de l'appareil : couper les mises en scène de boss sur un héros, changer de
   héros : le réglage suit l'appareil, et l'élite arrive sans carte d'entrée. Couture C7.
   ==================================================================================== */
async function P10(browser, base) {
  var dev = await newDevice(browser);
  var page = await launch(dev, base);
  await makeHero(page, "Nardek", "knight", [prepVillage, prepMap(["arbremere"])]);
  await makeHero(page, "Luca", "ranger", [prepVillage, prepMap(["arbremere"])]);
  await page.close();
  page = await launch(dev, base);
  await tap(page, ".title-screen-continue");                          // Luca
  await dismissTutorials(page);
  await page.evaluate(function () { openFullMenu(); });
  await page.waitForTimeout(300);
  var item = page.locator("[onclick*=\"settings\"]:visible", { hasText: "Paramètres" }); // v3.506.0 : l'onglet du grand écran, caché sur téléphone, passait devant
  if (await item.count()) await item.first().click(); else await page.evaluate(function () { switchTab("settings"); });
  await page.waitForTimeout(300);
  // v3.408.0 : Paramètres en trois onglets ; les mises en scène sont dans « Jeu », en interrupteur
  await tap(page, '.set-tabs button[onclick*="\'jeu\'"]');
  await page.waitForTimeout(200);
  var box = page.locator(".kswitch[onclick*=\"bossMoments\"]");
  ok(await box.count() === 1 && (await box.getAttribute("aria-checked")) === "true", "Réglages : mises en scène de boss, allumées par défaut");
  await box.click(); await page.waitForTimeout(200);
  await shot(page, "1_reglage");

  // Changer de héros : Héros › Mes héros › Nardek
  await tap(page, '.tab-btn[data-tab="more"]');
  await dismissTutorials(page);
  await tap(page, "button:has-text('Mes héros')");
  await page.locator(".title-slot-card.occupied", { hasText: "Nardek" }).locator(".title-slot-load-btn").click();
  await page.waitForTimeout(500);
  if (await visible(page, ".ret-card", 500)) await tap(page, ".ret-close");
  await dismissTutorials(page);
  ok(await page.evaluate(function () { return game.playerName === "Nardek" && Prefs.get("bossMoments") === false; }), "Nardek chargé : le réglage est resté coupé (il suit l'appareil)");

  await page.evaluate(function () { openLivingMap("forest"); });
  await tap(page, '.lm-node[onclick*="arbremere"]');
  await tap(page, "button[onclick*=\"startLivingMapSector('arbremere')\"]");
  await page.waitForTimeout(500);
  ok(await page.evaluate(function () { return game.activeTab === "combat"; }), "combat engagé");
  ok(!(await visible(page, ".bm-intro", 800)), "pas de carte d'entrée : le réglage est respecté");

  // Nouveau lancement de l'app : le réglage tient
  await page.close();
  page = await launch(dev, base);
  ok(await page.evaluate(function () { return Prefs.get("bossMoments") === false; }), "après fermeture de l'app : toujours coupé");
  consoleClean(page);
  await dev.close();
}

/* P11 — v3.359.0 : installer le jeu. iPhone : bouton sur l'écran titre, feuille d'explication
   au-dessus de l'écran titre, « Plus tard » retenu par l'appareil, Paramètres le proposent toujours.
   Chrome/Android : l'événement du navigateur (simulé) fait paraître le bouton, le toucher ouvre la
   fenêtre système. Jeu déjà installé : aucun bouton. */
var IOS_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
async function P11(browser, base) {
  var dev = await newDevice(browser, IOS_UA);
  var page = await launch(dev, base);
  ok(/Installer sur iPhone/.test(await page.textContent("#title-screen-root")), "iPhone : « Installer sur iPhone / iPad » sur l'écran titre");
  var box = await page.evaluate(function () {
    var b = document.querySelector(".pwa-install-btn-title").getBoundingClientRect();
    var v = document.querySelector(".title-screen-version").getBoundingClientRect();
    return { btnBottom: b.bottom, logoTop: document.querySelector(".title-screen-logo-img").getBoundingClientRect().top, versionBottom: v.bottom, h: innerHeight };
  });
  ok(box.versionBottom <= box.h, "la version reste à l'écran (" + Math.round(box.versionBottom) + " / " + box.h + ")");
  await shot(page, "titre");
  await tap(page, ".pwa-install-btn-title");
  ok(await visible(page, ".pwa-install-sheet"), "la feuille d'explication s'ouvre");
  var top = await page.evaluate(function () { var b = document.querySelector(".pwa-install-later").getBoundingClientRect(); var el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return el && el.className; });
  ok(/pwa-install-later/.test(top), "elle passe au-dessus de l'écran titre (« Plus tard » touchable)");
  await shot(page, "feuille");
  await tap(page, ".pwa-install-later");
  ok(!(await page.$(".pwa-install-btn-title")) && !(await page.$(".pwa-install-sheet")), "« Plus tard » : feuille fermée, bouton retiré");
  await page.close();
  page = await launch(dev, base);
  ok(!(await page.$(".pwa-install-btn-title")), "app rouverte : le bouton reste retiré sur cet appareil");
  await makeHero(page, "Ios", "knight", function () { game.unlockedTabs.settings = true; });
  await dismissTutorials(page);
  await page.evaluate(function () { game.activeTab = "settings"; settingsTab = "appareil"; renderAll(); }); // v3.408.0 : onglet Appareil
  await page.waitForTimeout(300);
  ok(await page.evaluate(function () { return /Application/.test(document.body.textContent) && !!document.querySelector('.settings-btn[onclick*="PwaInstall.install"]'); }), "Paramètres › Application : l'installation reste proposée");
  consoleClean(page);
  await dev.close();

  dev = await newDevice(browser);
  page = await launch(dev, base);
  ok(!(await page.$(".pwa-install-btn-title")), "Chrome sans signal du navigateur : aucun bouton");
  await page.evaluate(function () {
    var ev = new Event("beforeinstallprompt");
    window._prompted = 0; ev.prompt = function () { window._prompted++; }; ev.userChoice = Promise.resolve({ outcome: "dismissed" });
    window.dispatchEvent(ev);
  });
  await page.waitForTimeout(200);
  ok(/Installer le jeu/.test(await page.textContent("#title-screen-root")), "signal reçu : « Installer le jeu » paraît");
  await tap(page, ".pwa-install-btn-title");
  await page.waitForTimeout(200);
  ok(await page.evaluate(function () { return window._prompted === 1; }), "toucher : la fenêtre système est demandée");
  ok(!(await page.$(".pwa-install-btn-title")), "installation refusée : le bouton quitte l'écran titre");
  consoleClean(page);
  await dev.close();

  dev = await newDevice(browser, IOS_UA);
  await dev.addInitScript(function () { Object.defineProperty(window.navigator, "standalone", { get: function () { return true; } }); });
  page = await launch(dev, base);
  ok(!(await page.$(".pwa-install-btn-title")), "jeu installé : aucun bouton");
  ok(await page.evaluate(function () { return /installé sur cet appareil/.test(buildPwaSettingsCardHTML()); }), "jeu installé : Paramètres le disent");
  await dev.close();
}

/* P12 — v3.364.0 : l'acte IV du Désert de bout en bout, dans la vraie page. La remontée du
   fleuve (le Veilleur au palier 4), le trône de sable (carte d'entrée de Nezzam selon les noms,
   ses phases), le choix du roi posé depuis la carte d'étape, l'arme bleue, la fin du chapitre.
   Les ennemis tombent à 1 PV (le parcours teste l'enchaînement, pas l'équilibrage). */
function prepActeIV() {
  game.unlockedTabs = Object.assign({}, game.unlockedTabs, { village: true, map: true, combat: true, more: true, quests: true, companions: true });
  StoryQuestManager.ensure();
  game.storyQuests.forest.currentStep = STORY_QUESTS.forest.steps.length;
  game.storyQuests.desert.currentStep = STORY_QUESTS.desert.steps.map(function (x) { return x.id; }).indexOf("desert_16");
  game.storyQuests.desert.choices.noms = "laisser";
  CompanionManager.unlock("wenna"); CompanionManager.unlock("maddoc"); CompanionManager.chooseVoie("maddoc", "tronc");
  WorldTravel.arrive("desert", 0);
  WarehouseManager.addResource("ration", 3, true);
  game.heroMaxHp = 99999; game.heroHp = 99999;
  game.activeTab = "campement";
}
async function claimStoryStep(page) {
  await page.evaluate(function () { StoryQuestManager._checkNow(true); StoryQuestManager.claimStep("desert"); });
  await page.waitForTimeout(400);
  var txt = await page.evaluate(function () { var r = document.querySelector("[id$='-modal-root'] .quest-complete-card, #quest-complete-modal-root"); return document.body.innerText; });
  var fin = page.locator("[id$='-modal-root'] button", { hasText: "Continuer" });
  if (await fin.count()) { await fin.first().click(); await page.waitForTimeout(300); }
  await dismissTutorials(page);
  return txt;
}
async function P12(browser, base) {
  var dev = await newDevice(browser);
  var page = await launch(dev, base);
  await makeHero(page, "Roi", "knight", [prepActeIV]);
  await dismissTutorials(page);

  // Étape 16 : la remontée, lancée depuis la carte d'étape. v3.390.0 : parcours v2 (besace, feuilles), dés forcés hauts.
  await page.evaluate(function () { Pa2Run.rand = function () { return 0.999; }; StoryQuestManager.acceptStep("desert"); StoryQuestManager.goToLink("desert"); });
  await page.waitForTimeout(500);
  await dismissTutorials(page);
  ok(await page.evaluate(function () { return game.sceneRun && game.sceneRun.templateId === "remontee_fleuve" && game.sceneRun.status === "pa2-prep"; }), "étape 16 : « Aller à la quête » ouvre la besace de la remontée du fleuve");
  await tap(page, "button[onclick=\"pa2Depart()\"]");
  await page.waitForTimeout(500);
  await shot(page, "0_remontee");
  var vu = await drivePa2(page, "Une main te prend au col");
  if (process.env.P12_DEBUG) console.log("  [debug]", await page.evaluate(function () { var r = game.sceneRun; return JSON.stringify(r && { st: r.status, at: r.at, end: r.end, last: r.lastResult, hp: game.heroHp }); }));
  ok(vu, "étape 4 : « Une main te prend au col » en tête de la feuille");
  ok(await page.evaluate(function () { return !!game.explorationProgression.remonteeFleuveDone; }), "le trône est atteint");
  await page.evaluate(function () { if (SceneRunManager.getRun()) SceneRunManager.clearRun(); switchTab("campement"); });
  var t16 = await claimStoryStep(page);
  ok(/Ici, on sait faire/.test(t16), "réclamation : « Ici, on sait faire. »");

  // Étape 17 : le trône de sable
  // La carte d'entrée se ferme d'un toucher : on garde ce qu'elle a affiché, au moment où elle s'affiche
  await page.evaluate(function () {
    var orig = window.showBossIntro;
    window.showBossIntro = function (e, mode) { orig(e, mode); var r = document.getElementById("cycle-modal-root"); window.__introTxt = (window.__introTxt || "") + (r ? r.innerText : ""); };
    StoryQuestManager.acceptStep("desert"); AdventureQuestManager.start("aq_desert_trone");
  });
  await page.waitForTimeout(500);
  await dismissTutorials(page);
  for (var r = 0; r < 12 && await page.evaluate(function () { return game.adventureQuestRun.active; }); r++) {
    if (await page.evaluate(function () { return game.enemy && game.enemy.id === "nezzam"; }) && await visible(page, ".bm-intro", 300)) await shot(page, "1_nezzam");
    await winFight(page, function () { return !game.adventureQuestRun.active; }, 6);
  }
  var introTxt = await page.evaluate(function () { return window.__introTxt || ""; });
  var intro = /Nezzam le Desséché/.test(introTxt) && /Le dernier roi/.test(introTxt) && /Je les ai tous gardés/.test(introTxt);
  ok(intro, "carte d'entrée de Nezzam : « Je les ai tous gardés. Tous. » (noms laissés)");
  ok(await page.evaluate(function () { return game.adventureQuestsCompleted.aq_desert_trone === true; }), "Nezzam vaincu, quête terminée");
  if (await visible(page, ".bm-win button", 3000)) await tap(page, ".bm-win button");
  await page.evaluate(function () { switchTab("campement"); });
  var t17 = await claimStoryStep(page);
  ok(/Elle ne sèche pas/.test(t17), "réclamation : la flaque qui ne sèche pas");

  // Étape 18 : le choix, depuis la carte d'étape
  await page.evaluate(function () { StoryQuestManager.acceptStep("desert"); switchTab("quests"); });
  await page.waitForTimeout(400);
  await dismissTutorials(page);
  var decider = page.locator("button:visible", { hasText: "Décider" });
  ok(await decider.count() > 0, "carte d'étape : bouton « Décider »");
  if (await decider.count()) await decider.first().click(); else await page.evaluate(function () { openStoryChoiceModal("desert"); });
  await page.waitForTimeout(300);
  ok(await visible(page, ".story-choice-card"), "le choix s'ouvre : deux options, conséquences en clair");
  await shot(page, "2_choix");
  await tap(page, ".story-choice-card button:has-text('Prendre la forme')");
  ok(await page.evaluate(function () { return StoryQuestManager.getChoice("roi") === "soi" && getHeroSilenceRounds() === 1; }), "« Prendre la forme » : noté, silence à 1 round");
  var t18 = await claimStoryStep(page);
  ok(/Pas encore\./.test(t18) && /fil du tranchant est bleu/.test(t18), "réclamation : l'arme bleue de Maddoc, Sarkel ferme le chapitre");
  ok(await page.evaluate(function () { return (game.inventory || []).some(function (it) { return it.name === "Lame du Fleuve" && it.rarity === "rare"; }); }), "Lame du Fleuve (Rare) dans le sac");
  await page.evaluate(function () { switchTab("quests"); });
  await page.waitForTimeout(300);
  await tap(page, ".story-past-row"); // v3.639.0 : chapitres terminés repliés dans « Déjà vécu »
  await page.waitForTimeout(300);
  ok(/au nord, les pierres bougent/.test(await page.evaluate(function () { return document.body.innerText; })), "Histoire : « Chapitre terminé — au nord, les pierres bougent. »");
  await shot(page, "3_fin");
  consoleClean(page);
  await dev.close();
}

/* ---------------------------------------------------------------------------
   P13 — Quête de déblocage en parcours v2 (v3.389.0, chantier P) : tracé sur parchemin,
   deux obstacles joués au doigt, bilan et déblocage.
   --------------------------------------------------------------------------- */
async function P13(browser, base) {
  var dev = await newDevice(browser);
  var page = await launch(dev, base);
  await makeHero(page, "Orla", "ranger", [function () {
    game.unlockedTabs = Object.assign({}, game.unlockedTabs, { village: true });
    game.explorationProgression.huntBuildingUnlocked = true;
    WarehouseManager.addResource("petite_ration", 2, true);
    game.activeTab = "campement";
  }]);
  await page.close();
  page = await launch(dev, base);
  await tap(page, ".title-screen-continue");
  await dismissTutorials(page);
  var bois0 = await page.evaluate(function () { return WarehouseManager.getAmount("bois"); });
  await page.evaluate(function () { var t = 20260929; Math.random = function () { t = (t + 0x6D2B79F5) | 0; var x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; Pa2Run.rand = function () { return 0.999; }; });
  await page.evaluate(function () { switchTab("scene"); openSceneQuestEntry("sentier_obstrue"); });
  await page.waitForTimeout(600);
  ok(await visible(page, "#pa2-map img.pa2-map-img") && await visible(page, "#pa2-hud"), "parcours : tracé sur la carte de la Forêt et HUD");
  ok(await page.locator("#pa2-map .pa2-node").count() === 3, "trois nœuds : le départ et deux étapes");
  await shot(page, "1_trace");
  for (var i = 0; i < 2; i++) {
    await tap(page, ".pa2-node.is-open");
    await page.waitForTimeout(900);
    ok(await visible(page, "#pa2-overlay .pa2-sheet", 2000), "étape " + (i + 1) + " : la feuille d'obstacle s'ouvre");
    if (i === 0) await shot(page, "2_obstacle");
    await page.locator("#pa2-overlay .pa2-choice:not([disabled])").first().click();
    await page.waitForTimeout(2800);
    await dismissTutorials(page);
    await page.evaluate(function () { if (typeof closeWorkshopCompletionPopup === "function") closeWorkshopCompletionPopup(); }); // l'étape d'atelier du bois se valide en route
    var cont = page.locator("#pa2-overlay .kbtn.primary:not([disabled])");
    if (await cont.count() && await cont.first().isVisible()) { await page.waitForTimeout(600); await cont.first().click({ force: true }); }
    await page.waitForTimeout(600);
  }
  var end = await page.evaluate(function () { var r = game.sceneRun; return { st: r && r.status, how: r && r.end && r.end.how, flag: game.explorationProgression.blockedPathCompleted, txt: document.body.innerText }; });
  ok(end.st === "completed" && end.how === "parcours" && end.flag === true, "arrivée : parcours terminé, Clairière débloquée");
  ok(/Parcours terminé/i.test(end.txt) && !/Perdu en route/i.test(end.txt), "bilan affiché, sans perte");
  await shot(page, "3_bilan");
  await tap(page, "button[onclick=\"pa2Leave()\"]");
  await page.waitForTimeout(500);
  ok(await page.evaluate(function (b0) { return WarehouseManager.getAmount("bois") > b0 && !game.sceneRun; }, bois0), "retour : bois à l'Entrepôt, run nettoyé");
  consoleClean(page);
  await dev.close();
}

/* ====================================================================================
   P14 — Habillage des cartes (v3.618.0 lot 2, v3.619.0 lot 3, v3.620.0 lot 4, atelier « Cartes E ») : sur 33
   écrans et fiches, en téléphone et en PC, toute carte crème porte la texture (ou sa propre image), et tout
   document non imbriqué la découpe déchirée. Un oubli nomme sa classe (listes de css/00-cartes.css).
   ==================================================================================== */
function prepHabillage() {
  game.unlockedTabs = Object.assign({}, game.unlockedTabs, { village: true, map: true, combat: true, more: true, quests: true, companions: true, equip: true, achievements: true, log: true, tutorials: true, settings: true });
  Object.keys(PRODUCTION_UNLOCK_FLAGS).forEach(function (id) { game.explorationProgression[PRODUCTION_UNLOCK_FLAGS[id]] = true; });
  Object.keys(PRODUCTION_BUILDINGS).forEach(function (id) { ProductionManager.unlockBuilding(id); });
  StoryQuestManager.ensure();
  game.storyQuests.forest.currentStep = STORY_QUESTS.forest.steps.length;
  game.storyQuests.desert.currentStep = STORY_QUESTS.desert.steps.map(function (x) { return x.id; }).indexOf("desert_16");
  CompanionManager.unlock("wenna"); CompanionManager.unlock("maddoc"); CompanionManager.chooseVoie("maddoc", "tronc");
  WorldTravel.arrive("desert", 0);
  VillageBuildingManager.ensure();
  Object.keys(game.village.buildings).forEach(function (k) { game.village.buildings[k].level = Math.max(game.village.buildings[k].level || 0, 3); });
  game.gold = 48000; game.heroMaxHp = 99999; game.heroHp = 99999; game.activeTab = "campement";
}
var ECRANS_HABILLAGE = [
  ["Quêtes", "switchTab('quests')"], ["Quêtes secondaires", "switchTab('quests');setQuestCategory('secondaires')"],
  ["Camp, le feu", "switchTab('campement');setCampTab('feu')"], ["Camp, missions", "switchTab('campement');setCampTab('missions')"],
  ["Village, production", "switchTab('village');setVillageSubTab('production')"], ["Village, bâtiments", "switchTab('village');setVillageSubTab('buildings')"],
  ["Village, ateliers", "switchTab('village');setVillageSubTab('shops')"], ["Village, entrepôt", "switchTab('village');setVillageSubTab('entrepot')"],
  ["Héros, résumé", "switchTab('equip');setHerosSubTab('hero')"], ["Héros, boutique", "switchTab('equip');setHerosSubTab('equip');setEquipSubTab('shop')"],
  ["Héros, sac", "switchTab('equip');setHerosSubTab('equip');setEquipSubTab('inventory')"], ["Héros, compagnons", "switchTab('equip');setHerosSubTab('companions')"],
  ["Hauts faits", "switchTab('achievements')"], ["Journal", "switchTab('log')"], ["Paramètres", "switchTab('settings')"],
  ["Fiche Halle", "switchTab('village');openVillageBuildingSheet('hall')"], ["Fiche Taverne", "switchTab('village');openVillageBuildingSheet('tavern')"],
  ["Fiche Forge", "switchTab('village');openVillageBuildingSheet('forge')"], ["Fiche Stats", "switchTab('equip');openHerosSheet('stats')"],
  ["Fiche Capacités", "switchTab('equip');openHerosSheet('abilities')"], ["Fiche Caravane", "switchTab('campement');openExpeditionsSheet('caravan')"],
  ["Fiche Donjon", "switchTab('village');openDungeonSheet(1)"],
  // v3.620.0 (lot 4) : le reste du jeu
  ["Carte", "switchTab('map')"], ["Bibliothèque", "switchTab('tutorials')"], ["Camp, grimoire", "switchTab('campement');setCampTab('grimoire')"],
  ["Camp, expéditions", "switchTab('campement');setCampTab('depart')"], ["Fiche Entrepôt", "switchTab('village');openVillageBuildingSheet('warehouse')"],
  ["Fiche Terrain", "switchTab('village');openVillageBuildingSheet('training')"], ["Fiche Apothicaire", "switchTab('village');openVillageBuildingSheet('apothecary')"],
  ["Fiche Enchanteresse", "switchTab('village');openVillageBuildingSheet('enchanter')"], ["Fiche Palissade", "switchTab('village');openVillageBuildingSheet('palisade')"],
  ["Fiche Grand Ouvrage", "switchTab('village');openGrandOuvrageSheet()"], ["Fiche Patrouilles", "switchTab('campement');openExpeditionsSheet('patrols')"]
];
function cartesNonHabillees() {
  var DOC = /^(story-chain|story-step|story-prologue-card|camp-missions-card|ms-block|qb-card|tavern-board|chr-obj)$/;
  var CONTENEUR = /^(vb-sheet-card|full-menu|ksheet|mw-sheet|pw-sheet)$/;
  var oublis = {};
  document.querySelectorAll("#panel-container *, .vb-sheet-card *, .ksheet *").forEach(function (e) {
    var r = e.getBoundingClientRect(); if (r.width < 120 || r.height < 30) return;
    var s = getComputedStyle(e), m = (s.backgroundColor.match(/[\d.]+/g) || []).map(Number);
    if (!(m.length >= 3 && (m[3] === undefined || m[3] > 0.5) && m[0] > 225 && m[1] > 205 && m[2] > 160)) return;
    var cls = String(e.className || "").split(/\s+/).filter(Boolean);
    if (cls.some(function (c) { return CONTENEUR.test(c); })) return;
    if ((e.tagName === "BUTTON" || e.closest("button")) && r.height < 70) return;
    if (e.parentElement && e.parentElement.classList.contains("exp-sum")) return; // v3.702.0 : compteurs d'Expéditions, pas des cartes (plus de 120 px de large avec les marges de 4 px)
    if (!/url\(/.test(s.backgroundImage)) { oublis[cls[0] || e.tagName.toLowerCase()] = 1; return; } // texture, ou illustration propre (mannequin, route)
    // document (dont la carte Missions en PC) hors de toute carte habillée : découpe déchirée attendue
    var doc = cls.some(function (c) { return DOC.test(c); }) || (cls.indexOf("cw-card") >= 0 && !!e.querySelector(".cw-mlist"));
    var p = e.parentElement, range = false;
    while (p && !range) { if (getComputedStyle(p).backgroundImage.indexOf("parchment-cream") >= 0) range = true; p = p.parentElement; }
    if (doc && !range && (s.webkitMaskBoxImageSource || "none") === "none") oublis[(cls[0] || "?") + " (sans bord déchiré)"] = 1;
  });
  return Object.keys(oublis);
}
async function verifierHabillage(page, mode) {
  // v3.619.1 (bug Seb) : la texture ne doit pas recouvrir une illustration propre (mannequin, route de la Caravane)
  var illus = await page.evaluate(function () {
    switchTab("equip"); setHerosSubTab("equip"); setEquipSubTab("equipment");
    var eq = document.querySelector(".hs-eq"), a = eq ? getComputedStyle(eq).backgroundImage : "";
    switchTab("campement"); openExpeditionsSheet("caravan");
    var w = document.querySelector(".exp-world"), b = w ? getComputedStyle(w).backgroundImage : "";
    try { closeExpeditionsSheet(); } catch (x) {}
    return { eq: a.indexOf("/Heroes/") >= 0, route: !w || (b.indexOf("url(") >= 0 && b.indexOf("parchment-cream") < 0) };
  });
  ok(illus.eq && illus.route, mode + " · le mannequin de l'équipement et la route de la Caravane restent visibles");
  for (var i = 0; i < ECRANS_HABILLAGE.length; i++) {
    var e = ECRANS_HABILLAGE[i];
    await page.evaluate(function () {
      ["closeVillageBuildingSheet", "closeHerosSheet", "closeDungeonSheet", "closeExpeditionsSheet", "closeGrandOuvrageSheet"].forEach(function (f) { try { if (typeof window[f] === "function") window[f](); } catch (x) {} });
    });
    await page.evaluate(function (c) { new Function(c)(); }, e[1]);
    await page.waitForTimeout(500);
    var oublis = await page.evaluate(cartesNonHabillees);
    ok(oublis.length === 0, mode + " · " + e[0] + " : cartes crème habillées" + (oublis.length ? " — oubli : " + oublis.join(", ") : ""));
  }
}
async function P14(browser, base) {
  var dev = await newDevice(browser);
  var page = await launch(dev, base);
  await makeHero(page, "Seb", "knight", [prepHabillage]);
  await page.close();
  page = await launch(dev, base);
  await tap(page, ".title-screen-continue");
  await dismissTutorials(page);
  await verifierHabillage(page, "téléphone");
  await shot(page, "1_telephone");
  consoleClean(page);
  await dev.close();
  // PC : fenêtre large à la souris (mode grand écran)
  dev = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" });
  page = await launch(dev, base);
  await makeHero(page, "Seb", "knight", [prepHabillage]);
  await page.close();
  page = await launch(dev, base);
  await page.locator(".ts-wide-card button:visible", { hasText: "Continuer" }).first().click(); // accueil grand écran : autre bouton
  await page.waitForTimeout(400);
  await dismissTutorials(page);
  ok(await page.evaluate(function () { return document.documentElement.classList.contains("wide-mode"); }), "PC : mode grand écran actif");
  await verifierHabillage(page, "PC");
  await shot(page, "2_pc");
  await dev.close();
}

/* v3.703.0 (CPL3-5, TUTO-11) : feuilles et fenêtres au vrai clavier (Tab, Maj+Tab, Échap, Entrée) ;
   aucun écran ne reste inerte après fermeture ; indice « Suite ↓ » des aides à 320 × 568. */
function etatFenetre(sel) {
  var win = document.querySelector(sel), a = document.activeElement, lb = win && win.getAttribute("aria-labelledby"), db = win && win.getAttribute("aria-describedby");
  var fond = ["panel-container", "tab-bar", "hud"].map(function (id) { return document.getElementById(id); }).filter(Boolean);
  return { open: !!win && win.getClientRects().length > 0, role: win && win.getAttribute("role"), modal: win && win.getAttribute("aria-modal"),
    nom: lb && document.getElementById(lb) ? document.getElementById(lb).textContent.trim() : "", desc: db && document.getElementById(db) ? document.getElementById(db).textContent.trim() : "",
    dedans: !!win && (a === win || win.contains(a)), origine: !!(a && a.hasAttribute && a.hasAttribute("data-origine")),
    fond: fond.filter(function (e) { return !!e.closest("[inert]"); }).length, nFond: fond.length, toast: !!document.getElementById("toast").closest("[inert]"),
    inertes: document.querySelectorAll("[inert]").length, pile: window.kDialog ? kDialog.stack().length : -1 };
}
async function tabsDedans(page, sel, n) {
  var k = 0;
  for (var i = 0; i < n; i++) { await page.keyboard.press("Tab"); if ((await page.evaluate(etatFenetre, sel)).dedans) k++; }
  return k;
}
async function P15(browser, base) {
  var dev = await newDevice(browser);
  var page = await launch(dev, base);
  await makeHero(page, "Seb", "ranger", [prepHabillage]);
  await page.close();
  page = await launch(dev, base);
  await tap(page, ".title-screen-continue");
  await dismissTutorials(page);
  var SHEET = "#village-modal-root .full-menu", TUT = "#tutorial-modal-root .kwin";
  // Feuille : la Taverne, ouverte au toucher de sa carte
  await page.evaluate(function () { switchTab("village"); setVillageSubTab("buildings"); });
  await page.waitForTimeout(400); await dismissTutorials(page);
  await page.evaluate(function () { game.genericTutorialsSeen.tavern_contracts = true; }); // v3.704.0 : la fiche de la Taverne (TUTO-16) est déjà vue ici
  var carte = page.locator('[onclick*="openVillageBuildingSheet(\'tavern\')"]').first();
  await carte.evaluate(function (e) { e.setAttribute("data-origine", "1"); });
  await carte.click(); await page.waitForTimeout(300);
  var e0 = await page.evaluate(etatFenetre, SHEET);
  ok(e0.open && e0.role === "dialog" && e0.modal === "true", "feuille Taverne : role=\"dialog\", aria-modal");
  ok(e0.nom === "Taverne" && /^Niveau \d+ \/ \d+$/.test(e0.desc), "feuille : nom « " + e0.nom + " » (titre seul), sous-titre en description (« " + e0.desc + " »)");
  ok(e0.dedans, "feuille : focus placé dedans à l'ouverture");
  ok(e0.fond === e0.nFond && !e0.toast, "feuille : écran, barre et HUD inertes, toast actif");
  ok(await tabsDedans(page, SHEET, 10) === 10, "feuille : 10 × Tab restent dedans");
  await page.evaluate(function (sel) { var w = document.querySelector(sel), f = [].filter.call(w.querySelectorAll("button"), function (b) { return b.getClientRects().length; })[0]; f.focus(); }, SHEET);
  await page.keyboard.press("Shift+Tab");
  ok((await page.evaluate(etatFenetre, SHEET)).dedans, "feuille : Maj+Tab depuis le premier bouton reste dedans");
  await page.keyboard.press("Escape"); await page.waitForTimeout(250);
  var e1 = await page.evaluate(etatFenetre, SHEET);
  ok(!e1.open && e1.origine && e1.inertes === 0 && e1.pile === 0, "feuille : Échap ferme, focus rendu à la carte, plus rien d'inerte");
  // Empilées : confirmation ouverte depuis la feuille
  await carte.click(); await page.waitForTimeout(300);
  await page.evaluate(function (sel) {
    var w = document.querySelector(sel), b = [].filter.call(w.querySelectorAll("button:not(.ksheet-x):not([disabled])"), function (x) { return x.getClientRects().length; })[0] || w.querySelector(".ksheet-x");
    window.__dedans = b.getAttribute("onclick") || b.className; b.focus(); showConfirmModal("Essai", "Fenêtre empilée", null, function () {});
  }, SHEET);
  await page.waitForTimeout(150);
  var c0 = await page.evaluate(function (sel) { var cw = document.querySelector("#confirm-modal .kwin"), w = document.querySelector(sel); return { dedans: cw.contains(document.activeElement) || document.activeElement === cw, feuille: !!w.closest("[inert]") }; }, SHEET);
  ok(c0.dedans && c0.feuille, "empilées : la confirmation prend le focus, la feuille dessous devient inerte");
  await page.keyboard.press("Escape"); await page.waitForTimeout(200);
  var c1 = await page.evaluate(function (sel) { var a = document.activeElement, w = document.querySelector(sel); return { retour: !!(a && w && w.contains(a) && (a.getAttribute("onclick") || a.className) === window.__dedans), feuille: !!(w && w.closest("[inert]")), barre: !!document.getElementById("tab-bar").closest("[inert]") }; }, SHEET);
  ok(c1.retour && !c1.feuille && c1.barre, "empilées : Échap ferme la confirmation, focus rendu au bouton de la feuille, qui redevient active");
  await page.keyboard.press("Escape"); await page.waitForTimeout(250);
  var c2 = await page.evaluate(etatFenetre, SHEET);
  ok(!c2.open && c2.origine && c2.inertes === 0, "empilées : second Échap, feuille fermée, focus à la carte, plus rien d'inerte");
  // Calque hors kit (prologue, moment de boss…) posé au-dessus d'une feuille : il reste touchable
  await carte.click(); await page.waitForTimeout(300);
  var hk = await page.evaluate(function () {
    var r = document.createElement("div"); r.id = "essai-calque-root"; r.innerHTML = '<div style="position:fixed;inset:0;z-index:9500"><button type="button">Essai</button></div>'; document.body.appendChild(r);
    return new Promise(function (res) { setTimeout(function () {
      var b = r.querySelector("button"), a = { libre: !b.closest("[inert]"), inertes: document.querySelectorAll("[inert]").length };
      r.remove();
      setTimeout(function () { a.apres = !!document.getElementById("tab-bar").closest("[inert]"); closeVillageBuildingSheet(); setTimeout(function () { a.fin = document.querySelectorAll("[inert]").length; res(a); }, 60); }, 60);
    }, 60); });
  });
  ok(hk.libre && hk.inertes === 0 && hk.apres && hk.fin === 0, "calque hors kit au-dessus d'une feuille : rien d'inerte tant qu'il est là, fond inerte à nouveau après, rien à la fermeture");
  await page.evaluate(function () { [].forEach.call(document.querySelectorAll("[data-origine]"), function (e) { e.removeAttribute("data-origine"); }); });
  // Fenêtre d'aide (sans croix) : Échap ne la ferme pas (v3.536.0, option A), « Compris » au clavier
  await page.evaluate(function () { game.genericTutorialsSeen.camp_welcome = false; });
  var onglet = page.locator('#tab-bar .tab-btn[data-tab="campement"]').first();
  await onglet.evaluate(function (e) { e.setAttribute("data-origine", "1"); });
  await onglet.click(); await page.waitForTimeout(350);
  var t0 = await page.evaluate(etatFenetre, TUT);
  ok(t0.open && t0.role === "dialog" && t0.nom === "Le Campement" && t0.dedans && t0.fond === t0.nFond, "aide « Le Campement » : rôle, nom, focus dedans, fond inerte");
  ok(await tabsDedans(page, TUT, 10) === 10, "aide : 10 × Tab restent dedans");
  await page.keyboard.press("Escape"); await page.keyboard.press("Escape"); await page.waitForTimeout(200);
  ok((await page.evaluate(etatFenetre, TUT)).open, "aide : deux Échap la laissent ouverte (fenêtre sans croix)");
  await page.evaluate(function (sel) { document.querySelector(sel).querySelector(".kwin-foot .kbtn").focus(); }, TUT);
  await page.keyboard.press("Enter"); await page.waitForTimeout(300);
  var t1 = await page.evaluate(etatFenetre, TUT);
  ok(!t1.open && t1.origine && t1.inertes === 0, "aide : Entrée sur « Compris » ferme, focus rendu à l'onglet Camp, plus rien d'inerte");
  await page.evaluate(function () { [].forEach.call(document.querySelectorAll("[data-origine]"), function (e) { e.removeAttribute("data-origine"); }); });
  // Toutes les fiches du parcours d'habillage, puis le menu : ouvertes, fermées par leur code (innerHTML = "")
  var restes = [];
  for (var i = 0; i < ECRANS_HABILLAGE.length; i++) {
    var e = ECRANS_HABILLAGE[i]; if (!/^Fiche/.test(e[0])) continue;
    var r = await page.evaluate(function (c) {
      new Function(c)();
      return new Promise(function (res) { setTimeout(function () {
        for (var k = 0; k < 4; k++) { var cb = document.querySelector("#tutorial-modal-root .kwin-foot .kbtn"); if (cb) cb.click(); } // aide ouverte par l'onglet : fermée d'abord
        var n = kDialog.stack().length;
        ["closeVillageBuildingSheet", "closeHerosSheet", "closeDungeonSheet", "closeExpeditionsSheet", "closeGrandOuvrageSheet"].forEach(function (f) { try { if (typeof window[f] === "function") window[f](); } catch (x) {} });
        setTimeout(function () { res({ ouverte: n, inertes: document.querySelectorAll("[inert]").length, pile: kDialog.stack().length }); }, 60);
      }, 120); });
    }, e[1]);
    if (!r.ouverte || r.inertes || r.pile) restes.push(e[0] + " (" + r.ouverte + "/" + r.inertes + "/" + r.pile + ")");
  }
  await tap(page, '#tab-bar .tab-btn[data-tab="menu"]');
  var m0 = await page.evaluate(etatFenetre, "#full-menu-root .full-menu");
  await page.keyboard.press("Escape"); await page.waitForTimeout(250);
  var m1 = await page.evaluate(etatFenetre, "#full-menu-root .full-menu");
  if (!m0.open || !m0.dedans || m1.open || m1.inertes) restes.push("Menu");
  ok(restes.length === 0, "fiches du parcours et menu : chacune prise en charge à l'ouverture, plus rien d'inerte à la fermeture" + (restes.length ? " — " + restes.join(", ") : ""));
  // TUTO-11 : à 320 × 568, aide resserrée et « Suite ↓ » jusqu'au bas de la liste
  await page.setViewportSize({ width: 320, height: 568 }); await page.waitForTimeout(250);
  await page.evaluate(function () { game.genericTutorialsSeen.camp_welcome = false; switchTab("village"); switchTab("campement"); });
  await page.waitForTimeout(350);
  var s0 = await page.evaluate(function () {
    var card = document.querySelector("#tutorial-modal-root .tutorial-card"), body = card.querySelector(".kwin-body"), hint = card.querySelector(".tut-more > i");
    var vis = function () { return getComputedStyle(hint).visibility !== "hidden" && !card.classList.contains("is-end"); };
    var r = { ico: Math.round(card.querySelector(".kwin-ico img").getBoundingClientRect().width), cache: body.scrollHeight - body.clientHeight, avant: vis(), font: parseFloat(getComputedStyle(card.querySelector(".tutorial-point-text")).fontSize) };
    body.scrollTop = body.scrollHeight; body.dispatchEvent(new Event("scroll")); r.fin = !vis();
    return r;
  });
  ok(s0.ico === 36 && s0.font === 13, "aide à 320 × 568 : en-tête en ligne (icône " + s0.ico + " px), texte à " + s0.font + " px");
  ok(s0.cache > 0 && s0.avant && s0.fin, "aide à 320 × 568 : « Suite ↓ » tant qu'il reste " + s0.cache + " px à lire, effacé en fin de liste");
  await dismissTutorials(page);
  ok((await page.evaluate(etatFenetre, TUT)).inertes === 0, "aide fermée : plus rien d'inerte");
  consoleClean(page);
  await dev.close();
}

/* ---------- Lancement ---------- */

var PARCOURS = { P1: P1, P2: P2, P3: P3, P4: P4, P5: P5, P6: P6, P7: P7, P8: P8, P9: P9, P10: P10, P11: P11, P12: P12, P13: P13, P14: P14, P15: P15 };

(async function () {
  var srv = await serve(ROOT);
  var base = "http://127.0.0.1:" + srv.address().port;
  var browser = await chromium.launch();
  var ids = Object.keys(PARCOURS).filter(function (id) { return !ONLY.length || ONLY.indexOf(id) >= 0; });
  for (var i = 0; i < ids.length; i++) {
    current = ids[i];
    console.log("\n[" + ids[i] + "]");
    try { await PARCOURS[ids[i]](browser, base, srv); }
    catch (e) {
      ok(false, ids[i] + " interrompu : " + String(e.message || e).replace(/\s+/g, " ").slice(0, 400));
      if (lastPage) { try { await shot(lastPage, "echec"); } catch (e2) {} }
    }
  }
  await browser.close();
  srv.close();
  console.log("\n" + passes + " OK, " + failures + " échec(s) — captures : captures/parcours/");
  process.exit(failures ? 1 : 0);
})();
