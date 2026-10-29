/* tools/audit/carte-objectif-captures.js (29/10/2026, hors jeu) : carte vivante avec l'objectif d'Histoire, son chemin offert
   et les élites signalées (retour Seb, points 5 et 6), trois styles injectés. USAGE : node tools/audit/carte-objectif-captures.js -> captures/carte-objectif/ */
var http = require("http"), fs = require("fs"), path = require("path"), chromium = require("playwright").chromium;
var ROOT = require("../chemins.js").jeu(), OUT = require("../chemins.js").captures("carte-objectif");
fs.mkdirSync(OUT, { recursive: true });
var MIME = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".json": "application/json", ".mp3": "audio/mpeg" };

/* Scènes : monde, étape en cours (acceptée), secteurs déjà libérés. */
var SCENES = [
  { k: "desert", chap: "desert", step: "desert_14", avant: ["forest"], libres: ["puits_sec", "caravane", "steles", "scarabees", "tour_guet", "marche_sel", "porte_temple"] },
  { k: "montagne", chap: "mountain", step: "montagne_16", avant: ["forest", "desert", "ruins", "crypt"], libres: ["pente_grise", "paroi_noire"] }
];
var STYLES = ["A", "B", "C", "actuel"];
var LARGEURS = [390, 320];

/* CSS des trois styles. A : tracé doré + drapeau ; B : halo sur les secteurs ; C : pastilles « Histoire » et « offert ». */
var CSS = [
  ".lm-proto-trace { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }",
  ".lm-proto-trace path { fill:none; stroke:#f0aa3e; stroke-width:4; stroke-linecap:round; opacity:.95; vector-effect:non-scaling-stroke; filter:drop-shadow(0 0 2px rgba(0,0,0,.8)); }",
  ".lm-proto-flag { position:absolute; left:50%; top:-22px; transform:translateX(-50%); width:24px; height:24px; border-radius:50%; background:#3a2410 url(images/Icons/quests/quest_story.webp) center/18px no-repeat; border:2px solid #f0aa3e; box-shadow:0 1px 4px rgba(0,0,0,.7); pointer-events:none; }",
  ".sA .lm-node.is-proto-cible .lm-node-disc { box-shadow:0 0 0 3px #f0aa3e, 0 0 14px rgba(240,170,62,.8); }",
  ".sB .lm-node.is-proto-chemin .lm-node-disc { box-shadow:0 0 0 3px rgba(240,170,62,.9), 0 0 10px rgba(240,170,62,.55); }",
  ".sB .lm-node.is-proto-cible .lm-node-disc { box-shadow:0 0 0 4px #f0aa3e, 0 0 18px 4px rgba(240,170,62,.85); animation:lmProtoPulse 1.6s ease-in-out infinite; }",
  "@keyframes lmProtoPulse { 50% { box-shadow:0 0 0 4px #f0aa3e, 0 0 6px 1px rgba(240,170,62,.4); } }",
  ".lm-proto-chip { position:absolute; left:50%; top:-20px; transform:translateX(-50%); white-space:nowrap; font:700 10px/1 -apple-system,sans-serif; padding:3px 6px; border-radius:8px; pointer-events:none; box-shadow:0 1px 3px rgba(0,0,0,.7); }",
  ".lm-proto-chip.is-cible { background:#f0aa3e; color:#2a1a08; }",
  ".lm-proto-chip.is-offert { background:#1d3a26; color:#9be3b0; border:1px solid #7fd49a; }",
  /* Élites (tous styles) : liseré rouge + icône de ce qu'elles donnent */
  ".lm-node.is-proto-elite .lm-node-disc { border-color:#c4473a; box-shadow:0 0 0 2px #7a1f17, 0 2px 6px rgba(0,0,0,.55); }",
  ".lm-proto-gain { position:absolute; right:-10px; bottom:6px; width:24px; height:24px; border-radius:50%; background:#1b130c center/18px no-repeat; border:2px solid #c4473a; box-shadow:0 1px 3px rgba(0,0,0,.7); pointer-events:none; }",
  ".lm-proto-gain.is-repete::after { content:'↻'; position:absolute; left:-9px; top:-8px; width:14px; height:14px; border-radius:50%; background:#c4473a; color:#fff; font:700 10px/14px sans-serif; text-align:center; }"
].join("\n");

/* Dans la page : pose les classes et les marques sur la carte ouverte. */
function poser(style) {
  var mapId = window.__lmProtoMap, LM = LivingMapManager, map = LM.getMap(mapId);
  var step = StoryQuestManager.getCurrentStep(window.__lmProtoChap);
  var cibles = SceneRunManager.storyPaTargets(step.storyPa) || [];
  var chemin = LM.getStoryPath(mapId, cibles);
  window.__lmProtoCible = chemin.filter(function (id) { return cibles.indexOf(id) >= 0; })[0] || cibles[0];
  var root = document.querySelector(".lm-map");
  if (!root) return "pas de carte";
  root.classList.add("s" + style);
  var btn = function (id) { return root.querySelector('[onclick*="lmxTapSector(\'' + id + '\')"]'); };
  // élites : ce qu'elles donnent (ressource de victoire, pièce Épique, sinon la ressource de la carte)
  map.sectors.forEach(function (d) {
    var c = d.content; if (!c || c.type !== "elite") return;
    if (!c.repeatable && LM.isLiberated(mapId, d.id)) return; // élite unique déjà battue : redevient une expédition
    var b = btn(d.id); if (!b) return;
    var e = ELITE_DB[c.eliteId] || {}, ic;
    if (e.winResource) ic = (WAREHOUSE_RESOURCES[e.winResource.id] || {}).icon;
    else if (e.winDrop) ic = "images/Icons/equipment_icon/armor_epic.webp";
    else ic = (WAREHOUSE_RESOURCES[map.rewardResourceId] || {}).icon;
    b.classList.add("is-proto-elite");
    if (style !== "actuel") b.insertAdjacentHTML("beforeend", '<span class="lm-proto-gain' + (c.repeatable ? " is-repete" : "") + '" style="background-image:url(' + ic + ')"></span>');
  });
  if (style === "actuel") { root.querySelectorAll(".is-proto-elite").forEach(function (b) { b.classList.remove("is-proto-elite"); }); return chemin.join(","); }
  chemin.forEach(function (id) { var b = btn(id); if (b) b.classList.add(cibles.indexOf(id) >= 0 ? "is-proto-cible" : "is-proto-chemin"); });
  cibles.forEach(function (id) { var b = btn(id); if (b && !LM.isLiberated(mapId, id)) b.classList.add("is-proto-cible"); });
  if (style === "A") {
    // tracé : chaque lien entre deux secteurs du chemin, ou du libéré / village vers le chemin
    var pos = function (id) { return id === "village" ? map.village : LM.getSectorDef(mapId, id); };
    // tracé : les liens entre secteurs du chemin, plus l'accès depuis le déjà libéré (ou le village)
    var segs = [];
    chemin.forEach(function (id) {
      var d = LM.getSectorDef(mapId, id);
      d.neighbors.forEach(function (n) { if (chemin.indexOf(n) >= 0 && n < id && !(cibles.indexOf(n) >= 0 && cibles.indexOf(id) >= 0)) segs.push([n, id]); }); // pas de trait d'objectif à objectif
      if (LM.isReachable(mapId, id)) {
        var lib = d.neighbors.filter(function (n) { return LM.isLiberated(mapId, n); })[0];
        segs.push([lib || "village", id]);
      }
    });
    var h = '<svg class="lm-proto-trace" viewBox="0 0 100 100" preserveAspectRatio="none">';
    segs.forEach(function (s) { var a = pos(s[0]), z = pos(s[1]); h += '<path d="M' + a.x + ' ' + a.y + ' L' + z.x + ' ' + z.y + '"/>'; });
    root.querySelector(".lm-links").insertAdjacentHTML("afterend", h + "</svg>");
    root.querySelectorAll(".is-proto-cible").forEach(function (b) { b.insertAdjacentHTML("beforeend", '<span class="lm-proto-flag"></span>'); });
  }
  if (style === "C") { // une élite du chemin se bat, elle ne coûte pas de place : pas de pastille « offert »
    root.querySelectorAll(".is-proto-cible").forEach(function (b) { b.insertAdjacentHTML("beforeend", '<span class="lm-proto-chip is-cible">' + "Histoire" + '</span>'); });
    root.querySelectorAll(".is-proto-chemin:not(.is-proto-elite)").forEach(function (b) { b.insertAdjacentHTML("beforeend", '<span class="lm-proto-chip is-offert">' + "offert" + '</span>'); });
  }
  return chemin.join(",");
}

var srv = http.createServer(function (q, r) {
  var p = decodeURIComponent(q.url.split("?")[0]).replace(/\/\.\//g, "/"); if (p === "/") p = "/index.html";
  fs.readFile(path.join(ROOT, p), function (e, d) { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream", "Cache-Control": "no-store" }); r.end(d); });
}).listen(0, async function () {
  var b = await chromium.launch(), base = "http://localhost:" + srv.address().port;
  for (var w = 0; w < LARGEURS.length; w++) for (var i = 0; i < SCENES.length; i++) for (var s = 0; s < STYLES.length; s++) {
    var sc = SCENES[i], st = STYLES[s];
    if (LARGEURS[w] === 320 && st !== "A" && st !== "C") continue; // petit écran : les deux styles à marques
    var ctx = await b.newContext({ viewport: { width: LARGEURS[w], height: 760 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: "block", locale: "fr-FR" });
    var p = await ctx.newPage(); p.on("pageerror", function (e) { console.log("ERR", e.message); });
    await p.goto(base + "/index.html");
    await p.waitForFunction(function () { var t = document.getElementById("title-screen-root"); return t && t.innerHTML.length > 0; }, null, { timeout: 15000 });
    await p.evaluate(function () { if (window.hidePwaBootGate) hidePwaBootGate(); titleScreenNewGame(); pendingHeroId = "knight"; pendingPlayerName = "Aldric"; confirmHeroSelection(); });
    await p.waitForTimeout(600);
    var info = await p.evaluate(function (a) {
      var sc = a.sc;
      game.unlockedTabs = Object.assign({}, game.unlockedTabs, { village: true, map: true, combat: true, more: true, quests: true });
      StoryQuestManager.ensure();
      sc.avant.forEach(function (c) { game.storyQuests[c].currentStep = STORY_QUESTS[c].steps.length; });
      game.storyQuests[sc.chap].currentStep = STORY_QUESTS[sc.chap].steps.map(function (x) { return x.id; }).indexOf(sc.step);
      game.storyQuests[sc.chap].accepted = true;
      var mapId = LivingMapManager.getMapIds().filter(function (m) { return LIVING_MAPS[m].worldId === sc.chap; })[0];
      WorldTravel.arrive(LIVING_MAPS[mapId].worldId, 0);
      LivingMapManager.ensureDefaults();
      LIVING_MAPS[mapId].sectors.forEach(function (d) { var x = game.livingMaps[mapId].sectors[d.id]; if (sc.libres.indexOf(d.id) >= 0) { x.state = "libere"; x.liberatedCount = 1; x.firstRewardClaimed = true; } });
      window.__lmProtoMap = mapId; window.__lmProtoChap = sc.chap;
      var css = document.createElement("style"); css.textContent = a.css; document.head.appendChild(css);
      switchTab("map"); openLivingMap(mapId);
      return mapId;
    }, { sc: sc, css: CSS });
    await p.waitForTimeout(800);
    for (var k = 0; k < 6; k++) { var bt = p.locator("[id$='modal-root'] button", { hasText: /Compris|Continuer|Fermer/ }); if (!(await bt.count()) || !(await bt.first().isVisible())) break; await bt.first().click(); await p.waitForTimeout(250); }
    var chemin = await p.evaluate(poser, st);
    // cadrage : entre le village et l'objectif, comme un joueur qui fait glisser la carte
    await p.evaluate(function () { var m = LivingMapManager.getMap(window.__lmProtoMap), c = LivingMapManager.getSectorDef(m.id, window.__lmProtoCible) || m.village; lmxCenterOn((m.village.x + c.x) / 2, (m.village.y + c.y) / 2, false); });
    await p.waitForTimeout(300);
    var f = path.join(OUT, sc.k + "_" + st + "_" + LARGEURS[w] + ".png");
    await p.screenshot({ path: f });
    console.log(f, info, "chemin :", chemin);
    await ctx.close();
  }
  await b.close(); srv.close();
});
