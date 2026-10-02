"use strict";
/* sim/design-audit.js — v3.394.0 : AUDIT DESIGN (hors jeu).
   Ouvre le vrai jeu en iPhone 390 × 844, parcourt les écrans, prend une capture de chacun et
   relève les styles réellement affichés : polices, tailles, couleurs de texte, fonds, rayons,
   familles de boutons et de cadres. Sortie : sim/design-audit/<écran>.png + audit.json.
   Recettes de navigation reprises de sim/i18n-pseudo-scan.js.
   USAGE : node sim/design-audit.js . [écran,écran…] */

var http = require("http"), fs = require("fs"), path = require("path");
var chromium = require("playwright").chromium;
var ROOT = path.resolve(process.argv[2] || ".");
var ONLY = process.argv[3] ? process.argv[3].split(",") : null;
var OUT = path.join(ROOT, process.env.OUT_DIR || "sim/design-audit");
var HIDE_HUD = !!process.env.HIDE_HUD; // atelier HUD : écrans capturés sans le HUD (le panneau remonte)
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

/* Dans la page : relevé des styles des éléments visibles dans l'écran. */
function inventory() {
  var R = { fonts: {}, sizes: {}, colors: {}, bgs: {}, bgImgs: {}, radii: {}, borders: {}, buttons: {}, frames: {}, headings: [], lightPanels: 0, darkPanels: 0 };
  function inc(o, k) { if (k) o[k] = (o[k] || 0) + 1; }
  function vis(el) {
    var r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0.05;
  }
  function lum(c) { var m = c.match(/[\d.]+/g); if (!m) return null; return (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) / 255; }
  var all = document.querySelectorAll("body *");
  for (var i = 0; i < all.length; i++) {
    var el = all[i];
    if (/^(SCRIPT|STYLE|svg|path|line|circle|rect|defs|mask|stop|radialGradient|g)$/i.test(el.tagName) || !vis(el)) continue;
    var cs = getComputedStyle(el);
    var hasText = Array.prototype.some.call(el.childNodes, function (n) { return n.nodeType === 3 && /\S{2,}/.test(n.textContent); });
    if (hasText) {
      inc(R.fonts, cs.fontFamily.split(",")[0].replace(/["']/g, "").trim() + " " + cs.fontWeight);
      inc(R.sizes, Math.round(parseFloat(cs.fontSize)) + "px");
      inc(R.colors, cs.color);
    }
    var bg = cs.backgroundColor;
    if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
      inc(R.bgs, bg);
      var r = el.getBoundingClientRect(), a = (bg.match(/[\d.]+/g) || [])[3];
      if (r.width > 200 && r.height > 60 && (a === undefined || Number(a) > 0.5)) { var L = lum(bg); if (L !== null) { if (L > 0.6) R.lightPanels++; else if (L < 0.3) R.darkPanels++; } }
    }
    var bi = cs.backgroundImage;
    if (bi && bi !== "none") (bi.match(/url\([^)]*\)/g) || []).forEach(function (u) { inc(R.bgImgs, u.replace(/url\(["']?/, "").replace(/["']?\)$/, "").split("/").slice(-2).join("/")); });
    if (cs.borderTopLeftRadius !== "0px" && (bg !== "rgba(0, 0, 0, 0)" || cs.borderTopWidth !== "0px")) inc(R.radii, cs.borderTopLeftRadius);
    if (cs.borderTopWidth !== "0px" && cs.borderTopStyle !== "none") inc(R.borders, cs.borderTopWidth + " " + cs.borderTopColor);
    if (el.tagName === "BUTTON" || el.getAttribute("role") === "button") {
      var cls = (el.className && el.className.baseVal === undefined ? el.className : "").split(/\s+/).filter(Boolean);
      inc(R.buttons, cls[0] || "(sans classe)");
    }
    var fc = (typeof el.className === "string" ? el.className : "").split(/\s+/).filter(function (c) { return /frame|card|panel|sheet|kfp|rframe|nb-card|modal/.test(c); });
    fc.forEach(function (c) { inc(R.frames, c); });
    if (/^H[1-6]$/.test(el.tagName) || /title|kicker|h1|h2|h3/.test(typeof el.className === "string" ? el.className : "")) {
      if (hasText && R.headings.length < 40) R.headings.push([el.tagName, (el.className || "").split(" ")[0], Math.round(parseFloat(cs.fontSize)), cs.fontFamily.split(",")[0].replace(/["']/g, ""), cs.fontWeight, cs.color, el.textContent.trim().slice(0, 40)]);
    }
  }
  /* v3.398.0 (S-2) : textes coupés — contenu plus large ou plus haut que leur case, qui ne déborde pas
     (overflow caché ou ellipse). C'est ce qu'un agrandissement de texte casse en premier. */
  R.clipped = [];
  for (var j = 0; j < all.length; j++) {
    var e2 = all[j];
    if (!vis(e2)) continue;
    var own = Array.prototype.some.call(e2.childNodes, function (n) { return n.nodeType === 3 && /\S{2,}/.test(n.textContent); });
    if (!own) continue;
    var c2 = getComputedStyle(e2);
    var hid = c2.overflowX !== "visible" || c2.overflowY !== "visible" || c2.textOverflow === "ellipsis";
    if (hid && (e2.scrollWidth > e2.clientWidth + 1 || e2.scrollHeight > e2.clientHeight + 2))
      R.clipped.push([(typeof e2.className === "string" ? e2.className.split(" ")[0] : e2.tagName), e2.textContent.trim().slice(0, 40), Math.round(parseFloat(c2.fontSize))]);
  }
  R.bodyClass = document.body.className;
  R.scrollH = (function () { var z = document.querySelector("#panel-container .kfp-scrollzone") || document.getElementById("panel-container"); return z ? [z.scrollHeight, z.clientHeight] : null; })();
  return R;
}

async function closeTut(p) {
  for (var i = 0; i < 8; i++) {
    // D'abord les popups d'explication (ils couvrent l'écran), puis les autres « Compris / Continuer ».
    var b = p.locator("#tutorial-modal-root button:visible");
    if (!(await b.count())) b = p.locator("button:visible", { hasText: /^\s*(Compris|Continuer)\s*$/ });
    if (!(await b.count())) return;
    try { await b.first().click({ timeout: 1500 }); } catch (e) { return; }
    await p.waitForTimeout(250);
  }
}
async function newHero(p) {
  await p.evaluate(function () { titleScreenNewGame(); pendingHeroId = "knight"; pendingPlayerName = "Test"; confirmHeroSelection();
    game.unlockedTabs = Object.assign({}, game.unlockedTabs, { village: true, map: true, combat: true, more: true }); saveGame(); });
  await p.waitForTimeout(500); await closeTut(p);
}
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
    WarehouseManager.addResource("petite_ration", 3, true); WarehouseManager.addResource("ration", 2, true);
    saveGame();
  });
  await closeTut(p);
}
async function fightStart(p) {
  await newHero(p);
  await p.evaluate(function () { game.heroMaxHp = 99999; game.heroHp = 99999; saveGame(); });
  await p.reload();
  await p.waitForFunction(function () { var t = document.getElementById("title-screen-root"); return t && t.innerHTML.length > 0; }, null, { timeout: 15000 });
  await p.locator(".title-screen-continue").first().click(); await p.waitForTimeout(400); await closeTut(p);
  await p.evaluate(function () { AdventureQuestManager.start("eq_forest_spider"); });
  await p.waitForTimeout(400); await closeTut(p);
}

/* Écrans : [groupe, libellé, recette] */
var SCREENS = {
  titre: ["Accueil", "Écran titre", async function (p) { }],
  creation: ["Accueil", "Création du héros", async function (p) { await p.evaluate(function () { titleScreenNewGame(); }); }],
  camp: ["Camp", "Camp (HUD + menu du bas)", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("campement"); }); }],
  camp_depart: ["Camp", "Camp (HUD + menu du bas)", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("campement"); setCampTab("depart"); }); }],
  menu: ["Navigation", "Menu ☰", async function (p) { await richHero(p); await p.evaluate(function () { openFullMenu(); }); }],
  confirmation: ["Navigation", "Fenêtre de confirmation", async function (p) { await newHero(p); await p.evaluate(function () { showConfirmModal(_t("Abandonner l'aventure ?"), _t("Tu perds la moitié du butin. Les rations non mangées retournent à l'Entrepôt."), "⚠️", function () {}); }); }],
  retour: ["Camp", "Écran de retour", async function (p) {
    await newHero(p);
    await p.evaluate(function () {
      var s = ReturnManager.complete({ produced: { bois: 40, pierre: 12 }, crafted: { planche: 3 }, fullPlots: 1, openPlots: 2, awayMs: 3 * 3600e3 }, ReturnManager.capture());
      s.hpGain = 120; s.patrolsBack = 1; s.tavernNew = true; s.tavernReady = 2; s.siteDone = { name: _t("Forge"), level: 2 };
      openReturnScreen(s);
    });
  }],
  combat: ["Combat", "Combat", async function (p) { await fightStart(p); for (var i = 0; i < 2; i++) { var a = p.locator("#combat-attack-btn:not([disabled]):visible"); if (await a.count()) await a.first().click(); await p.waitForTimeout(700); } }],
  quetes: ["Quêtes", "Quêtes", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("quests"); }); }],
  quetes_aventure: ["Quêtes", "Quêtes › Aventure", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("quests"); setQuestCategory("aventure"); }); }],
  carte: ["Carte", "Carte du monde + popup", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("map"); openWorldPopup(0); }); }],
  carte_vivante: ["Carte", "Carte vivante + volet", async function (p) {
    await richHero(p);
    await p.evaluate(function () { switchTab("map"); openLivingMap("forest"); });
    await p.waitForTimeout(400);
    await p.evaluate(function () { var d = LivingMapManager.getMap("forest").sectors[0]; selectLivingMapSector(d.id); });
  }],
  pa_prep: ["Petites Aventures", "PA › préparation (besace)", async function (p) {
    await richHero(p);
    await p.evaluate(function () { game.lastPetiteAventureAt = 0; switchTab("campement"); SceneRunManager.startRun("petite_aventure_foret"); switchTab("scene"); Pa2Run.addItem("ration"); Pa2Run.addItem("petite_ration"); pa2Rerender(); });
  }],
  pa_carte: ["Petites Aventures", "PA › carte plein écran", async function (p) {
    await richHero(p);
    await p.evaluate(function () { game.lastPetiteAventureAt = 0; switchTab("campement"); SceneRunManager.startRun("petite_aventure_foret"); switchTab("scene"); Pa2Run.addItem("petite_ration"); Pa2Run.depart(); pa2Rerender(); });
    await p.waitForTimeout(500);
    await p.evaluate(function () { pa2Move(Pa2Run.openMoves()[0]); });
    await p.waitForTimeout(1800);
  }],
  village: ["Village", "Village", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("village"); setVillageSubTab("buildings"); }); }],
  batiment: ["Village", "Feuille d'un bâtiment de production", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("village"); openProductionBuildingDetail(Object.keys(PRODUCTION_BUILDINGS)[0]); }); }],
  ateliers: ["Village", "Ateliers", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("village"); setVillageSubTab("shops"); }); }],
  production: ["Village", "Production", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("village"); setVillageSubTab("production"); }); }],
  entrepot: ["Village", "Entrepôt", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("village"); setVillageSubTab("entrepot"); }); }],
  equipement: ["Héros & objets", "Équipement", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("equip"); setEquipSubTab("equipment"); }); }],
  inventaire: ["Héros & objets", "Inventaire", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("equip"); setEquipSubTab("inventory"); }); }],
  echoppe: ["Héros & objets", "Échoppe", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("equip"); setEquipSubTab("shop"); }); }],
  potions: ["Héros & objets", "Potions", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("shop"); setShopSubTab("potions"); }); }],
  heros: ["Héros & objets", "Héros › Résumé", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("more"); setHerosSubTab("hero"); }); }],
  stats: ["Héros & objets", "Héros › Statistiques (feuille)", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("more"); setHerosSubTab("hero"); openHerosSheet("stats"); }); }],
  talents: ["Héros & objets", "Talents", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("more"); setHerosSubTab("talents"); }); }],
  compagnons: ["Héros & objets", "Compagnons", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("more"); setHerosSubTab("companions"); }); }],
  grimoire: ["Combat", "Grimoire", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("grimoire"); }); }],
  donjons: ["Combat", "Donjons", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("dungeon"); }); }],
  donjon_fiche: ["Combat", "Fiche d'un donjon", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("dungeon"); openDungeonSheet(DUNGEONS[0].id); }); }],
  hauts_faits: ["Collection", "Hauts faits", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("achievements"); }); }],
  bestiaire: ["Collection", "Bestiaire", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("bestiary"); setBestiaryCodexSubTab("bestiary"); toggleBestiaryWorld(0); }); }],
  codex: ["Collection", "Codex", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("bestiary"); setBestiaryCodexSubTab("codex"); toggleCodexCategory("intro"); }); }],
  memoire: ["Collection", "Mémoire (Ascension)", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("ascension"); }); }],
  tutoriels: ["Système", "Tutoriels", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("tutorials"); setBestiaryCodexSubTab("tutorials"); }); }],
  journal: ["Système", "Journal", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("log"); }); }],
  parametres: ["Système", "Paramètres", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("settings"); }); }],
  parametres_jeu: ["Système", "Paramètres › Jeu", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("settings"); setSettingsTab("jeu"); }); }],
  parametres_appareil: ["Système", "Paramètres › Appareil", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("settings"); setSettingsTab("appareil"); }); }],
  /* v3.399.0 (F-1) : feuilles et fenêtres */
  f_capacites: ["Feuilles", "Héros › Capacités (feuille)", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("more"); setHerosSubTab("hero"); openHerosSheet("abilities"); }); }],
  f_batiment: ["Feuilles", "Fiche d'un bâtiment", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("village"); setVillageSubTab("buildings"); openVillageBuildingSheet("workshop"); }); }],
  f_grimoire: ["Feuilles", "Grimoire › aide (feuille)", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("grimoire"); openGrimoireSheet("help"); }); }],
  f_presets: ["Feuilles", "Grimoire › presets (feuille)", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("grimoire"); openGrimoireSheet("presets"); }); }],
  f_titre: ["Feuilles", "Hauts faits › choisir un titre", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("achievements"); openAchievementTitleSheet(); }); }],
  f_ateliers: ["Feuilles", "Résumé des ateliers", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("village"); openWorkshopSummaryModal(); }); }],
  f_quete: ["Feuilles", "Quête d'aventure › présentation", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("quests"); openAdventureQuestIntro(Object.keys(ADVENTURE_QUESTS)[0]); }); }],
  f_compare: ["Feuilles", "Équipement › comparer un objet", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("equip"); setEquipSubTab("inventory"); openEquipCompareSheet(game.inventory[0].uid); }); }],
  f_etats: ["Feuilles", "Combat › états (feuille)", async function (p) { await fightStart(p); await p.evaluate(function () { openCombatStatesSheet(); }); }],
  f_sortie: ["Feuilles", "Combat › sortie en cours (feuille)", async function (p) { await fightStart(p); await p.evaluate(function () { openSortieSheet(); }); }],
  /* v3.400.0 (lot F-2) : fenêtres centrées */
  w_tuto: ["Fenêtres", "Tutoriel (popup)", async function (p) { await richHero(p); await closeTut(p); await p.evaluate(function () { document.getElementById("tutorial-modal-root").innerHTML = buildTutorialModalHTML("closeStoryChoiceModal()", GENERIC_TUTORIALS.grimoire_rules); }); }],
  w_choix: ["Fenêtres", "Choix de récit", async function (p) { await richHero(p); await closeTut(p); await p.evaluate(function () {
    var step = null; Object.keys(STORY_QUESTS).forEach(function (k) { (STORY_QUESTS[k].steps || []).forEach(function (s) { if (!step && s.choice) step = s; }); });
    StoryQuestManager.getCurrentStep = function () { return step; }; openStoryChoiceModal("x"); }); }],
  w_quete_fin: ["Fenêtres", "Fin de quête", async function (p) { await richHero(p); await p.evaluate(function () { openQuestCompletePopup({ title: "Prouver sa valeur", text: "Le Roi Slime s'effondre. La Lisière respire à nouveau.", rewardRows: [{ label: "Or", value: "+120" }, { label: "Expérience", value: "+45" }] }); }); }],
  w_battue_fin: ["Fenêtres", "Battue › terminée (v3.412.0)", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("quests"); var q = Object.keys(HUNT_QUESTS).map(function (k) { return HUNT_QUESTS[k]; }).filter(function (x) { return x.rewardGold && !x.resourceKey; })[0]; game.lastSortieSummary = { outcome: "success", context: "hunt", kept: { gold: 64, items: [{}], resources: {} } }; openHuntLotComplete(q); }); }],
  w_chasse_fin: ["Fenêtres", "Chasse › terminée (v3.412.0)", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("quests"); var q = Object.keys(HUNT_QUESTS).map(function (k) { return HUNT_QUESTS[k]; }).filter(function (x) { return x.resourceKey; })[0]; var r = {}; r[q.resourceKey] = 9; game.lastSortieSummary = { outcome: "success", context: "hunt", kept: { gold: 22, items: [], resources: r } }; openHuntLotComplete(q); }); }],
  w_chasse: ["Fenêtres", "Chasse › présentation", async function (p) { await richHero(p); await p.evaluate(function () { switchTab("quests"); openHuntQuestIntro(Object.keys(HUNT_QUESTS)[0]); }); }],
  w_donjon_fin: ["Fenêtres", "Donjon › rapport de fin", async function (p) { await richHero(p); await p.evaluate(function () { openDungeonSummary({ success: true, tierName: "Tanière du Basilic", clearedWave: 15, wavesTotal: 15, goldReward: 820, shardsGained: 6, marks: [] }); }); }],
  w_prevision: ["Fenêtres", "Avant de partir (prévision)", async function (p) { await richHero(p); await p.evaluate(function () { openCombatForecastConfirm({ id: "tresdur", heroDamagePerRound: 42, enemyDamagePerRound: 61, enemyHp: 900, roundsToKill: 22, roundsToDie: 9, enemyName: "Roi Slime", advice: "Monte ta Force ou reviens avec des potions." }, { title: "Prouver sa valeur", lowHp: true, onConfirm: function () {} }); }); }],
  w_fil: ["Fenêtres", "Fil rouge", async function (p) { await richHero(p); await p.evaluate(function () { openFilRougeBubble(); }); }],
  w_atelier_etape: ["Fenêtres", "Atelier › étape terminée", async function (p) { await richHero(p); await p.evaluate(function () { showWorkshopStepCompletionPopup(WORKSHOP_UNLOCK_STEPS[0], WORKSHOP_UNLOCK_STEPS[1]); }); }],
  w_atelier_obj: ["Fenêtres", "Atelier › objectif", async function (p) { await richHero(p); await p.evaluate(function () { openWorkshopStepPopup(); }); }],
  w_sac: ["Fenêtres", "Sac › réglages de l'autovente", async function (p) { await richHero(p); await p.evaluate(function () {
    game.genericTutorialsSeen = game.genericTutorialsSeen || {}; Object.keys(GENERIC_TUTORIALS).forEach(function (k) { game.genericTutorialsSeen[k] = true; });
    switchTab("equip"); }); await closeTut(p); await p.evaluate(function () { document.getElementById("tutorial-modal-root").innerHTML = ""; openInventorySettings(); }); }],
  w_rapport: ["Fenêtres", "Rapport de combat (défaite)", async function (p) { await fightStart(p); await p.evaluate(function () { openCombatReport("defeat", "Araignée géante"); }); }]
};

(async function () {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  var srv = await serve(), base = "http://localhost:" + srv.address().port;
  var browser = await chromium.launch();
  var result = {};
  var jsonPath = path.join(OUT, "audit.json");
  if (ONLY && fs.existsSync(jsonPath)) result = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  for (var name of Object.keys(SCREENS)) {
    if (ONLY && ONLY.indexOf(name) < 0) continue;
    var VW = Number(process.env.VW || 390), VH = Number(process.env.VH || 844), DESK = VW > 900 && !process.env.TOUCH; // TOUCH=1 : tablette (tactile) // VW/VH : capture grand écran (ex. VW=1280 VH=800)
    var ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: (DESK || VW > 700) ? 1 : 2, isMobile: !DESK, hasTouch: !DESK, serviceWorkers: "block", locale: "fr-FR" });
    await ctx.addInitScript(function (pt) { try { localStorage.setItem("aethervale_prefs", JSON.stringify({ lang: "fr", installHint: false, tabletPortrait: pt })); } catch (e) {} }, process.env.PORTRAIT || "zoom"); // PORTRAIT=rail : tablette en portrait, menu à gauche
    var p = await ctx.newPage(), errs = [];
    p.on("pageerror", function (e) { errs.push(e.message); });
    p.on("dialog", function (d) { d.accept(); });
    await p.goto(base + "/index.html");
    await p.waitForFunction(function () { var t = document.getElementById("title-screen-root"); return t && t.innerHTML.length > 0; }, null, { timeout: 15000 });
    await p.waitForTimeout(700);
    // Service worker bloqué ici : on lève l'écran d'attente du boot, et on masque les toasts (passagers).
    await p.evaluate(function () { if (window.hidePwaBootGate) hidePwaBootGate(); });
    await p.addStyleTag({ content: "#toast{display:none!important}" + (HIDE_HUD ? "#hud{display:none!important}" : "") + (process.env.HIDE_DOCK ? "#hud-dock{display:none!important}" : "") });
    try { await SCREENS[name][2](p); } catch (e) { errs.push("écran : " + e.message.split("\n")[0]); }
    await p.waitForTimeout(700);
    if (["titre", "creation", "confirmation", "retour", "menu"].indexOf(name) < 0 && name.indexOf("w_") !== 0) await closeTut(p); // popups d'explication d'onglet
    await p.waitForTimeout(500);
    await p.screenshot({ path: path.join(OUT, name + ".png") });
    if (process.env.PROBE) console.log("PROBE " + name + " " + JSON.stringify(await p.evaluate(process.env.PROBE))); // PROBE="expression" : mesure ponctuelle
    if (HIDE_HUD) console.log("TABBAR " + name + " " + JSON.stringify(await p.evaluate(function () { var t = document.getElementById("tab-bar"), r = t && t.getBoundingClientRect(); return r ? [Math.round(r.top), Math.round(r.height)] : null; })));
    var inv = await p.evaluate(inventory);
    inv.group = SCREENS[name][0]; inv.label = SCREENS[name][1]; inv.errors = errs;
    result[name] = inv;
    console.log(name + (errs.length ? "  — erreurs : " + errs.join(" | ") : "  ok"));
    await ctx.close();
  }
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 1));
  await browser.close(); srv.close();
})();
