/* tools/audit/grand-ouvrage-captures.js (29/10/2026, hors jeu) : atelier du Grand Ouvrage (retour Seb, point 9, option E).
   Vrai jeu aux Ruines, Entrepôt plein ; carte et fiche prototypes injectées. USAGE : node tools/audit/grand-ouvrage-captures.js -> captures/grand-ouvrage/ */
var http = require("http"), fs = require("fs"), path = require("path"), chromium = require("playwright").chromium;
var ROOT = require("../chemins.js").jeu(), OUT = require("../chemins.js").captures("grand-ouvrage");
fs.mkdirSync(OUT, { recursive: true });
var MIME = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".json": "application/json", ".mp3": "audio/mpeg" };

/* Écrans : la grille (carte du Grand Ouvrage) ; fiche A (liste à verser) ; fiche B (compacte) ; B après versement. */
var ECRANS = ["grille", "A", "B", "B_palier"];

var CSS = [
  ".go-gauge { margin: 10px 0 4px; }",
  ".go-head { display:flex; justify-content:space-between; align-items:baseline; gap:8px; font-weight:700; color: var(--c-brown-850-soft); }",
  ".go-head small { font-weight:600; color: var(--c-brown-700-soft); }",
  ".go-bonus { display:flex; align-items:center; gap:8px; margin:10px 0 0; padding:8px 10px; border:1px solid var(--c-bronze-500); border-radius:12px; background: var(--c-cream-50-soft); font-weight:700; color: var(--c-brown-850-soft); }",
  ".go-bonus img { width:22px; height:22px; }",
  ".go-bonus small { display:block; font-weight:600; color: var(--c-brown-700-soft); }",
  ".go-list { margin:10px 0 0; display:grid; gap:6px; }",
  ".go-row { display:grid; grid-template-columns: 28px 1fr auto auto; align-items:center; gap:8px; padding:6px 8px; border:1px solid var(--c-bronze-500); border-radius:10px; background: var(--c-cream-50-soft); font-size:13px; font-weight:700; color: var(--c-brown-850-soft); }",
  ".go-row img { width:26px; height:26px; }",
  ".go-row small { display:block; font-weight:600; color: var(--c-brown-700-soft); font-size:12px; }",
  ".go-row .go-pts { font-size:12px; color: var(--c-brown-700-soft); white-space:nowrap; }",
  ".go-row .go-step { display:flex; gap:4px; }",
  ".go-row .go-step button { min-width:34px; min-height:34px; border-radius:8px; border:1px solid var(--c-bronze-500); background: var(--c-cream-100-soft); font-weight:700; }",
  ".go-go { margin-top:12px; }",
  ".go-go .kbtn { width:100%; max-width:none; margin:0; min-height:52px; flex-direction:column; gap:2px; }",
  ".go-go .kbtn small { font-size:12px; font-weight:600; opacity:.9; }",
  ".go-next { margin:10px 0 0; font-size:12px; color: var(--c-brown-750-2); }",
  ".go-more { margin:10px 0 0; font-size:13px; font-weight:700; color: var(--c-brown-750-2); text-decoration: underline; }",
  ".go-toast { margin:10px 0 0; padding:8px 10px; border-radius:12px; background:#1d3a26; color:#d6f5df; font-weight:700; font-size:13px; text-align:center; }"
].join("\n");

/* La fiche prototype, construite avec les classes du jeu (kSheetHeadHTML, ksheet-body, kgauge, kbtn). */
function fiche(variante) {
  var R = WAREHOUSE_RESOURCES, palier = variante === "B_palier" ? 4 : 3, pts = variante === "B_palier" ? 310 : 1640, cout = Math.round(2000 * Math.pow(1.12, palier));
  var lignes = [["bois", 1, 1125], ["fer", 1, 1125], ["pierre", 1, 1125], ["eau", 1, 980], ["ble", 1, 1010], ["viande", 1, 1060], ["planche", 5, 120], ["lingot", 5, 64], ["pierre_errante", 25, 0]];
  var total = lignes.reduce(function (a, l) { return a + l[1] * l[2]; }, 0);
  var h = '<div class="full-menu-overlay"><div class="full-menu vb-sheet-card" onclick="event.stopPropagation()">';
  h += kSheetHeadHTML({ icon: '<img class="vb-sheet-icon" src="images/Icons/village_buildings/grand_ouvrage.webp" onerror="this.onerror=null;this.src=\'images/Icons/system/search_unknown.webp\'" alt="">', title: "Le Grand Ouvrage", sub: "Palier " + palier, close: "void 0" });
  h += '<div class="ksheet-body">';
  if (variante === "B_palier") h += '<div class="go-toast">Palier 4 atteint : +4 % d\'or. Edda ajoute une pierre à l\'arche.</div>';
  h += '<div class="vb-sheet-text">Edda bâtit une arche au milieu du village. Tout ce que tu as en trop y trouve sa place : chaque palier rend le village un peu plus riche.</div>';
  h += '<div class="go-bonus"><img src="images/Icons/gold_icon.webp" alt=""><span>+' + palier + ' % d\'or<small>sur tout l\'or gagné (combats, Taverne, caravanes, récompenses)</small></span></div>';
  h += '<div class="go-head go-gauge"><span>Palier ' + (palier + 1) + '</span><small>' + formatNumber(pts) + ' / ' + formatNumber(cout) + '</small></div>';
  h += '<div class="kgauge kgauge-thin kgauge-xp"><div class="kgauge-track"><div class="kgauge-fill" style="width:' + Math.round(pts / cout * 100) + '%"></div></div></div>';
  h += '<div class="go-go"><button type="button" class="kbtn primary"><span>Verser le surplus</span><small>+' + formatNumber(variante === "B_palier" ? 0 : total) + ' points · garde la moitié du plafond et la réserve</small></button></div>';
  if (variante === "A") {
    h += '<div class="go-list">';
    lignes.forEach(function (l) {
      var d = R[l[0]]; if (!d) return;
      h += '<div class="go-row"><img src="' + d.icon + '" alt=""><span>' + _td(d.name) + '<small>' + (l[2] ? formatNumber(l[2]) + ' en trop' : 'rien en trop') + '</small></span>'
        + '<span class="go-pts">' + l[1] + ' pt</span><span class="go-step"><button type="button">−</button><button type="button">+</button></span></div>';
    });
    h += '</div>';
  } else {
    h += '<div class="go-more">Choisir quoi verser ›</div>';
  }
  h += '<p class="go-next">Prochain haut fait : palier 5 (« Première arche »). Un brut vaut 1 point, une planche 5, une ressource du monde 25.</p>';
  return h + '</div></div></div>';
}

/* La carte de la grille, sur le modèle de buildVillageBuildingCardHTML. */
function carte() {
  return '<button type="button" class="vb-card is-built"><span class="vb-card-lvl">3</span><span class="vb-card-flag is-good">À verser</span>'
    + '<div class="vb-card-top"><img class="vb-card-icon" src="images/Icons/village_buildings/grand_ouvrage.webp" onerror="this.onerror=null;this.src=\'images/Icons/system/search_unknown.webp\'" alt="">'
    + '<div class="vb-card-name">Le Grand Ouvrage</div></div><div class="vb-card-status">+3 % d\'or<br>palier 4 : 82 %</div></button>';
}

var srv = http.createServer(function (q, r) {
  var p = decodeURIComponent(q.url.split("?")[0]).replace(/\/\.\//g, "/"); if (p === "/") p = "/index.html";
  fs.readFile(path.join(ROOT, p), function (e, d) { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream", "Cache-Control": "no-store" }); r.end(d); });
}).listen(0, async function () {
  var b = await chromium.launch(), base = "http://localhost:" + srv.address().port;
  for (var w of [390, 320]) for (var e of ECRANS) {
    var ctx = await b.newContext({ viewport: { width: w, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: "block", locale: "fr-FR" });
    var p = await ctx.newPage(); p.on("pageerror", function (x) { console.log("ERR", x.message); });
    await p.goto(base + "/index.html");
    await p.waitForFunction(function () { var t = document.getElementById("title-screen-root"); return t && t.innerHTML.length > 0; }, null, { timeout: 15000 });
    await p.evaluate(function () { if (window.hidePwaBootGate) hidePwaBootGate(); titleScreenNewGame(); pendingHeroId = "knight"; pendingPlayerName = "Aldric"; confirmHeroSelection(); });
    await p.waitForTimeout(600);
    await p.evaluate(function (a) {
      game.unlockedTabs = Object.assign({}, game.unlockedTabs, { village: true, map: true, quests: true, more: true });
      StoryQuestManager.ensure(); ["forest", "desert"].forEach(function (c) { game.storyQuests[c].currentStep = STORY_QUESTS[c].steps.length; });
      game.storyQuests.ruins.currentStep = 10; WorldTravel.arrive("ruins", 0);
      VillageBuildingManager.ensure(); ["hall", "warehouse", "tavern", "apothecary", "training", "workshop", "palisade", "forge"].forEach(function (id) { game.village.buildings[id] = { level: 3 }; });
      var css = document.createElement("style"); css.textContent = a.css; document.head.appendChild(css);
      window.__goFiche = new Function("return (" + a.fiche + ")")(); window.__goCarte = new Function("return (" + a.carte + ")")();
      switchTab("village"); setVillageSubTab("buildings");
    }, { css: CSS, fiche: fiche.toString(), carte: carte.toString() });
    await p.waitForTimeout(500);
    for (var k = 0; k < 6; k++) { var bt = p.locator("[id$='modal-root'] button", { hasText: /Compris|Continuer|Fermer/ }); if (!(await bt.count()) || !(await bt.first().isVisible())) break; await bt.first().click(); await p.waitForTimeout(250); }
    await p.evaluate(function (e) {
      var grid = document.querySelector(".vb-card") && document.querySelector(".vb-card").parentNode;
      if (grid) grid.insertAdjacentHTML("afterbegin", window.__goCarte());
      if (e !== "grille") document.getElementById("village-modal-root").innerHTML = window.__goFiche(e);
    }, e);
    await p.waitForTimeout(400);
    var f = path.join(OUT, e + "_" + w + ".png");
    await p.screenshot({ path: f });
    console.log(f);
    await ctx.close();
  }
  await b.close(); srv.close();
});
