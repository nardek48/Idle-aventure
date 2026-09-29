"use strict";
/* sim/parcours-harness.js — v3.351.0 (H-0), v3.352.0 (H-1) : harnais de PARCOURS, P1 à P10 ; v3.359.0 : P11 (installer le jeu) ; v3.364.0 : P12 (acte IV du Désert) ; v3.380.0 : P12 déterministe sur la remontée.
   Carte des systèmes v3.350.0 §7. Complète round-harness.js, ne le remplace pas.

   Le VRAI index.html, servi en http://localhost (service worker compris), dans Chromium à la
   taille d'un iPhone. Le script fait les gestes du joueur (toucher, changer d'onglet, fermer
   l'app, revenir) et vérifie ce qui est À L'ÉCRAN. L'état interne ne sert qu'à FABRIQUER une
   partie de départ (setup) et, en second, à confirmer un effet (ressource créditée).

   Lancer :   node sim/parcours-harness.js .            (tous les parcours)
              node sim/parcours-harness.js . P2 P5      (au choix)
   Prérequis : npm i -D playwright  puis  npx playwright install chromium
   Sortie :    une ligne ✔/✘ par contrôle, erreurs de console, captures dans sim/parcours/. */

var http = require("http"), fs = require("fs"), path = require("path");
var chromium;
try { chromium = require("playwright").chromium; }
catch (e) { console.error("Playwright absent : npm i -D playwright && npx playwright install chromium"); process.exit(2); }

var ROOT = path.resolve(process.argv[2] || ".");
var ONLY = process.argv.slice(3);
var SHOTS = path.join(ROOT, "sim", "parcours");
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
async function newDevice(browser, ua) {
  return browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "fr-FR", userAgent: ua || undefined }); // v3.359.0 : ua optionnel (P11, iPhone)
}

/* Ouvre la PWA et attend l'écran titre. Tuer l'app = page.close(). */
var lastPage = null;
async function launch(device, base) {
  var page = await device.newPage();
  page.setDefaultTimeout(6000);
  lastPage = page;
  page._errors = [];
  page.on("pageerror", function (e) { page._errors.push(e.message); });
  page.on("console", function (m) { if (m.type() === "error") page._errors.push(m.text()); });
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
  for (var i = 0; i < 6; i++) {
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
    titleScreenNewGame(); pendingHeroId = a.heroId; pendingPlayerName = a.name; confirmHeroSelection();
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

/* Petite Aventure : avance en prenant, à chaque écran, le premier geste utile ; s'arrête
   quand `stop(état)` est vrai. */
async function driveScene(page, stop, maxSteps) {
  var PRI = ["acknowledgeSceneMutator", "confirmScenePreparation", "enterSceneGate", "resolveScene", "chooseSceneProfile", "chooseSceneIntensity"];
  for (var i = 0; i < (maxSteps || 30); i++) {
    await dismissTutorials(page);
    var st = await page.evaluate(function () {
      return { tab: game.activeTab, status: game.sceneRun && game.sceneRun.status, loot: (SortieManager.ensure().loot || {}).gold || 0,
        btns: Array.from(document.querySelectorAll("button")).filter(function (x) { return x.offsetParent && !x.disabled && /Scene/.test(x.getAttribute("onclick") || ""); })
          .map(function (x) { return { on: x.getAttribute("onclick"), txt: x.innerText }; }) };
    });
    if (stop(st)) return st;
    var pick = null;
    for (var k = 0; k < PRI.length && !pick; k++) pick = st.btns.filter(function (b) { return b.on.indexOf(PRI[k]) === 0; })[0];
    if (!pick) pick = st.btns.filter(function (b) { return /^toggleScenePrepItem/.test(b.on) && !/\(x/.test(b.txt); })[0];
    if (!pick) return st;
    await page.locator('button[onclick="' + pick.on.replace(/"/g, '\\"') + '"]').first().click();
    await page.waitForTimeout(350);
  }
  return null;
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
  var dev = await newDevice(browser);
  var page = await launch(dev, base);
  ok(!(await visible(page, ".title-screen-continue", 500)), "tout premier lancement : pas de « Continuer »");
  await tap(page, ".title-screen-img-btn");                          // « Nouvelle Partie »
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
  ok(await visible(page, "#tutorial-modal-root button", 3000), "tutoriel d'accueil affiché");
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
  ok(await page.locator(".cbg-foe").count() === 2, "deux ennemis à l'écran : l'élite et son escorte");
  await shot(page, "1_groupe");

  // L'escorte d'abord : on la vise, elle tombe, la quête n'est pas validée
  var escorte = page.locator(".cbg-foe").nth(1);
  await escorte.click(); await page.waitForTimeout(250);
  await page.evaluate(function () { var e = CombatActors.enemies()[1]; if (e) e.hp = 1; });
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

  // Besace : une case libre ouvre la liste, on y choisit une petite ration puis une gourde
  await tap(page, ".pa2-cell.is-free");
  ok(await visible(page, "#pa2-overlay .pa2-sheet"), "une case libre ouvre la liste de la besace");
  await tap(page, "#pa2-overlay button[onclick=\"pa2AddItem('petite_ration')\"]");
  await tap(page, ".pa2-cell.is-free");
  await tap(page, "#pa2-overlay button[onclick=\"pa2AddItem('gourde')\"]");
  ok(await page.locator(".pa2-cell.is-full").count() === 2, "deux objets posés dans la besace");
  await tap(page, "button[onclick=\"pa2PrepStep('pacts')\"]");
  // v3.386.0 : Math.random graine (carte, dés, combats) : le héros sans arme ramasse toujours de l'or.
  await page.evaluate(function () { var t = 20260929; Math.random = function () { t = (t + 0x6D2B79F5) | 0; var x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; });
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
    await tap(page, ".pa2-node.is-open");
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
  var item = page.locator("[onclick*=\"settings\"]", { hasText: "Paramètres" });
  if (await item.count()) await item.first().click(); else await page.evaluate(function () { switchTab("settings"); });
  await page.waitForTimeout(300);
  var box = page.locator("input[onchange*=\"bossMoments\"]");
  ok(await box.count() === 1 && await box.isChecked(), "Réglages : mises en scène de boss, cochées par défaut");
  await box.uncheck(); await page.waitForTimeout(200);
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
  await page.evaluate(function () { game.activeTab = "settings"; renderAll(); });
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

  // Étape 16 : la remontée, lancée depuis la carte d'étape. v3.380.0 : tirages tassés vers le bas
  // (= épreuves réussies) le temps de la remontée — sinon deux échecs aux sables évacuent avant le palier 4.
  await page.evaluate(function () { window.__rnd = Math.random; Math.random = function () { return window.__rnd() * 0.3; }; });
  await page.evaluate(function () { StoryQuestManager.acceptStep("desert"); StoryQuestManager.goToLink("desert"); });
  await page.waitForTimeout(500);
  await dismissTutorials(page);
  ok(await page.evaluate(function () { return game.sceneRun && game.sceneRun.templateId === "remontee_fleuve"; }), "étape 16 : « Aller à la quête » lance la remontée du fleuve");
  var vu = false;
  for (var k = 0; k < 20; k++) {
    var pop = page.locator("[id$='-modal-root'] button:visible", { hasText: "Continuer" });
    if (await pop.count()) { await pop.first().click(); await page.waitForTimeout(250); }
    var st = await driveScene(page, function (x) { return x.tab === "combat" || x.status === "finale" || x.status === "completed" || !x.status; }, 30);
    var etat = await page.evaluate(function () { return { tab: game.activeTab, status: game.sceneRun && game.sceneRun.status, d: game.sceneRun && game.sceneRun.depth }; });
    if (etat.tab === "combat") { await winFight(page, function () { return game.activeTab !== "combat"; }, 12); continue; }
    if (etat.status === "finale") { await page.evaluate(function () { SceneRunManager.resolveFinale("sur"); }); break; }
    if (!etat.status || etat.status === "completed") break;
  }
  await page.evaluate(function () { Math.random = window.__rnd; });
  vu = await page.evaluate(function () { return /Une main te prend au col/.test((window.sceneRunLog || []).join(" ")); });
  ok(vu, "palier 4 : « Une main te prend au col » inscrit au journal de l'expédition");
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
  ok(await visible(page, "#pa2-map .pa2-parchment") && await visible(page, "#pa2-hud"), "parcours : tracé sur parchemin et HUD");
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

/* ---------- Lancement ---------- */

var PARCOURS = { P1: P1, P2: P2, P3: P3, P4: P4, P5: P5, P6: P6, P7: P7, P8: P8, P9: P9, P10: P10, P11: P11, P12: P12, P13: P13 };

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
  console.log("\n" + passes + " OK, " + failures + " échec(s) — captures : sim/parcours/");
  process.exit(failures ? 1 : 0);
})();
