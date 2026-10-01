"use strict";
/* ui/pa2-view.js — v3.382.0 (Petites Aventures v2, lot PA2-1) : les écrans du mode v2.
   Portage de l'atelier validé par Seb (habillage « Nuit », 29/09/2026) sur le moteur réel
   (systems/pa2-run.js). Le moteur applique chaque résultat tout de suite et le sauvegarde ;
   cette vue ne fait que le METTRE EN SCÈNE (dé, échanges de combat, cartes retournées).
   Trois écrans dans l'onglet "scene" (routés par buildSceneScreenHTML) :
     - préparation (pa2-prep) : besace puis pactes ;
     - carte (pa2-map / pa2-node) : HUD, carte de nuit, feuille d'action du nœud ;
     - bilan (completed) : destination, butin, coffre d'expédition.
   La feuille d'action et la légende vivent dans #pa2-overlay (enfant de body) : un
   renderPanel() venu d'ailleurs (fin de production…) ne coupe pas une animation en cours. */

/* ---------- État de la vue (volatil, jamais sauvegardé) ---------- */

var pa2View = {
  runId: null,
  prepStep: "bag",      // "bag" | "pacts"
  picker: null,         // { mode: "add" } | { mode: "item", idx }
  sheet: null,          // { key, step, res, ... } : feuille ouverte
  hud: null,            // valeurs affichées pendant une animation (le moteur a déjà tout appliqué)
  fromKey: null,        // nœud quitté : le repère du héros glisse depuis lui
  keepScroll: null,
  cam: { w: 0, tx: 0, ty: 0, key: null }, // v3.394.0 : vue de la carte plein écran (key = run + carte)
  legend: false,
  justAdded: null,
  timers: []
};

var PA2_ICONS = {
  obstacle: "images/Icons/scene/node_obstacle.png",
  combat: "images/Icons/scene/node_encounter.png",
  source: "images/Icons/scene/node_clear_spring.png",
  autel: "images/Icons/scene/node_forgotten_altar.png",
  trouvaille: "images/Icons/scene/node_discovery.png",
  evenement: "images/Icons/scene/node_event.png",
  unknown: "images/Icons/scene/node_unknown.png",
  camp: "images/Icons/camp/campfire.png",
  seuil: "images/Icons/scene/node_threshold.png",
  depart: "images/Icons/menu_icons/village_menu.png",
  boss: "images/Icons/scene/dest/dest_cerf_racine.png",
  clairiere: "images/Icons/scene/dest/dest_clairiere.png",
  tertre: "images/Icons/scene/dest/dest_tertre.png",
  power: "images/Icons/potions/potion_force.png",
  precision: "images/Icons/potions/potion_precision.png",
  endurance: "images/Icons/potions/potion_endurance.png",
  ruse: "images/Icons/scene/ways/fight_trick.png",
  flee: "images/Icons/quests/flee.png",
  hp: "images/Icons/combat_stats/stat_health.png",
  gold: "images/Icons/dungeon/dungeon_gold.png",
  bag: "images/Icons/subtabs/inventory.png",
  chest: "images/Icons/dungeon/dungeon_guaranteed_loot.png",
  wound: "images/Icons/scene/ui/ui_wound.png",
  hero: "images/Icons/scene/ui/ui_hero_marker.png",
  title: "images/Icons/scene/path_easy.png"
};

var PA2_CRAN_WORD = { sur: _t("Sûr"), probable: _t("Probable"), risque: _t("Risqué"), desespere: _t("Désespéré") };
var PA2_CRAN_LEVEL = { sur: 4, probable: 3, risque: 2, desespere: 1 };
var PA2_VERDICT_WORD = { leger: _t("Léger"), rude: _t("Rude"), severe: _t("Sévère"), brutal: _t("Brutal"), mortel: _t("Mortel") };
var PA2_RAR_WORD = { com: _t("Commune"), rare: _t("Rare"), leg: _t("Légendaire") };
var PA2_RING_WORD = { sentier: _t("Sentier"), chemin: _t("Chemin"), periple: _t("Périple") };
var PA2_ACT_WORD = { 1: _t("Acte I"), 2: _t("Acte II"), 3: _t("Acte III") };

/* ---------- Outils ---------- */

function pa2Img(src, cls, alt) {
  return '<img class="' + (cls || "pa2-ic") + '" src="' + esc(src) + '" alt="' + esc(alt || "") + '">';
}
function pa2Pct(v) { return Math.round(v * 100) + " %"; }
function pa2Num(v) { return String(Math.round(Number(v || 0))); }
function pa2Mult(v) { return "×" + Number(v).toFixed(2).replace(".", ","); }

function pa2ItemName(id) {
  var it = PA2_ITEMS[id];
  if (!it) return id;
  if (it.name) return _td(it.name);
  var res = window.WAREHOUSE_RESOURCES && WAREHOUSE_RESOURCES[it.resource];
  return res ? _td(res.name) : id;
}
function pa2WorldName(worldId) {
  var list = window.WORLDS || [];
  for (var i = 0; i < list.length; i++) if (list[i].id === worldId) return _td(list[i].name);
  return "";
}
function pa2Hero() {
  var h = (typeof getHeroByGameId === "function") ? getHeroByGameId(game.heroId) : null;
  return { name: h ? _td(h.name) : "", image: h ? h.image : PA2_ICONS.hp };
}
function pa2RareName(worldId) {
  var rare = window.PA2_RARE && PA2_RARE[worldId];
  var res = rare && window.WAREHOUSE_RESOURCES && WAREHOUSE_RESOURCES[rare.resourceId];
  return res ? _td(res.name) : "";
}
function pa2Dests(run) { return (PA2_DESTS[run.worldId] || PA2_DESTS.forest); }
function pa2Hook(run) { return run.hookId ? PA2_HOOKS[run.hookId] : null; }

function pa2ClearTimers() {
  pa2View.timers.forEach(function (t) { clearTimeout(t); clearInterval(t); });
  pa2View.timers = [];
}
function pa2Later(fn, ms) { var t = setTimeout(fn, ms); pa2View.timers.push(t); return t; }

// Nouveau run : l'état de la vue repart de zéro.
function pa2SyncViewRun(run) {
  if (pa2View.runId === run.id) return;
  pa2ClearTimers();
  pa2View.runId = run.id;
  pa2View.prepStep = "bag";
  pa2View.picker = null;
  pa2View.sheet = null;
  pa2View.hud = null;
  pa2View.fromKey = null;
  pa2View.cam.key = null; // v3.394.0 : nouveau run, cadrage d'ouverture sur le héros
  pa2View.camSheet = 0;
  pa2View.legend = false;
}

/* ---------- Routeur (appelé par buildSceneScreenHTML) ---------- */

function buildPa2ScreenHTML(run) {
  pa2SyncViewRun(run);
  var zone = document.querySelector ? document.querySelector("#panel-container .kfp-scrollzone") : null;
  pa2View.keepScroll = zone ? zone.scrollTop : null; // lu AVANT que renderPanel remplace le contenu
  var h;
  if (run.status === PA2_STATUS.prep) h = buildPa2PrepHTML(run);
  // Fin de run pendant qu'une feuille montre encore l'issue (dé, combat) : la carte reste derrière.
  else if (run.status === PA2_STATUS.done && !pa2View.sheet) h = buildPa2EndHTML(run);
  else h = buildPa2MapScreenHTML(run);
  setTimeout(pa2AfterRender, 0);
  return h;
}
window.buildPa2ScreenHTML = buildPa2ScreenHTML;

function pa2Rerender() {
  if (typeof refreshSceneScreen === "function") refreshSceneScreen();
  else if (typeof renderPanel === "function") renderPanel();
}

// Après chaque rendu : habillage du body, calque (feuille, légende), défilement, repère du héros.
function pa2AfterRender() {
  var run = window.Pa2Run ? Pa2Run.getRun() : null;
  var onScene = game.activeTab === "scene" && !!run;
  var body = document.body;
  if (!body || !body.classList) return;
  body.classList.toggle("pa2-run", onScene);
  var onMap = onScene && (run.status === PA2_STATUS.map || run.status === PA2_STATUS.node || (run.status === PA2_STATUS.done && !!pa2View.sheet));
  body.classList.toggle("pa2-night", onMap);
  body.classList.toggle("pa2-full", onMap && !!document.getElementById("pa2-vp")); // v3.394.0 : carte plein écran
  if (!onScene) { pa2RemoveOverlay(); return; }
  pa2EnsureOverlay();
  pa2RenderLegend();
  if (run.status === PA2_STATUS.node && !pa2View.sheet && !pa2View.fromKey) pa2OpenSheet();
  if (run.status === PA2_STATUS.prep) pa2RenderPicker();
  else if (!pa2View.sheet) pa2SetSheetHTML(null);
  var zone = document.querySelector("#panel-container .kfp-scrollzone");
  if (zone && pa2View.keepScroll != null) zone.scrollTop = pa2View.keepScroll;
  if (document.getElementById("pa2-vp")) pa2CamAfterRender(run);
  if (pa2View.fromKey) pa2AnimateMove();
}

function pa2EnsureOverlay() {
  var root = document.getElementById("pa2-overlay");
  if (root) return root;
  root = document.createElement("div");
  root.id = "pa2-overlay";
  root.innerHTML = '<div id="pa2-legendbox"></div><div id="pa2-sheetbox"></div>';
  document.body.appendChild(root);
  return root;
}
function pa2RemoveOverlay() {
  var root = document.getElementById("pa2-overlay");
  if (root && root.parentNode) root.parentNode.removeChild(root);
}
// Quitte l'habillage v2 (bilan fermé, préparation abandonnée).
function pa2ClearChrome() {
  pa2ClearTimers();
  pa2RemoveOverlay();
  if (document.body && document.body.classList) { document.body.classList.remove("pa2-run"); document.body.classList.remove("pa2-night"); document.body.classList.remove("pa2-full"); }
}
window.pa2ClearChrome = pa2ClearChrome;

/* ---------- Préparation : besace et pactes ---------- */

function pa2PageOpen(title) {
  return '<div class="nb-page-frame kframe-page pa2-page" data-kf-title="' + esc(PA2_ICONS.title + "|" + title) + '">';
}

function buildPa2PrepHTML(run) {
  var hook = pa2Hook(run), hero = pa2Hero(), snap = run.heroSnapshot || {};
  var ring = Pa2Run.ring(run), ringId = run.ring;
  var tpl = SceneEngine.getTemplate(run.templateId) || {}, par = !!run.parcours, size = Pa2Run.bagSize(run);
  if (par) pa2View.prepStep = "bag"; // un parcours n'a pas de pactes
  var h = pa2PageOpen(pa2View.prepStep === "pacts" ? _t("Les pactes") : (par ? _td(tpl.title || "") : _t("Petite aventure"))) + '<div class="pa2-col">';

  if (pa2View.prepStep === "bag") {
    h += '<div class="pa2-panel pa2-center">';
    h += '<div class="pa2-kicker">' + esc(par ? pa2WorldName(run.worldId) : _t("{w} · de nuit", { w: pa2WorldName(run.worldId) })) + '</div>';
    if (hook) {
      h += '<h1 class="pa2-h1">' + esc(_td(hook.title)) + '</h1>';
      h += '<p class="pa2-narr pa2-dim">' + esc(_td(hook.lede)) + '</p>';
    }
    if (ringId !== "sentier") {
      h += '<p class="pa2-ring">' + esc(_t("{r} : ennemis et obstacles plus durs, butin ×{m}.", { r: PA2_RING_WORD[ringId], m: String(ring.lootMult).replace(".", ",") })) + '</p>';
    }
    h += '</div>';

    // Le héros tel qu'il part : PV actuels (pas de soin gratuit), stats du jet.
    h += '<div class="pa2-panel pa2-hero">' + pa2Img(hero.image, "pa2-portrait", hero.name);
    h += '<div class="pa2-hero-info"><div class="pa2-kicker">' + esc(_t("{n}, niveau {l}", { n: hero.name, l: run.level })) + '</div>';
    h += pa2GaugeHTML("hp", game.heroHp, game.heroMaxHp, _t("{a} / {b} PV", { a: pa2Num(game.heroHp), b: pa2Num(game.heroMaxHp) }));
    h += '<div class="pa2-stats">';
    ["power", "precision", "endurance"].forEach(function (s) {
      h += '<span title="' + esc(sceneStatLabel(s)) + '">' + pa2Img(PA2_ICONS[s]) + '<b>' + pa2Num(snap[s]) + '</b></span>';
    });
    h += '</div></div></div>';
    if (Number(game.heroHp || 0) < Number(game.heroMaxHp || 1)) {
      h += '<p class="pa2-note">' + esc(_t("Tu pars avec tes PV actuels. Les rations de la besace soignent en route.")) + '</p>';
    }

    if (!par) h += pa2TrophiesHTML(run);

    // Besace : l'objet dans une case ; ses autres places sont bloquées (v3.394.0, retour Seb).
    // Une case libre ouvre la liste ; une case bloquée ouvre la fiche de son objet.
    var cells = "", used = Pa2Run.bagUsed(run);
    run.bag.forEach(function (id, idx) {
      var it = PA2_ITEMS[id], nm = pa2ItemName(id);
      cells += '<button type="button" class="pa2-cell is-full' + (pa2View.justAdded === idx ? ' is-pop' : '') + '" onclick="pa2OpenItem(' + idx + ')" aria-label="' + esc(nm) + '">' + pa2Img(it.icon, "", nm) + '</button>';
      for (var k = 1; k < it.size; k++) {
        cells += '<button type="button" class="pa2-cell is-held' + (pa2View.justAdded === idx ? ' is-pop' : '') + '" onclick="pa2OpenItem(' + idx + ')" aria-label="' + esc(_t("Place prise : {n}", { n: nm })) + '"></button>';
      }
    });
    for (var i = used; i < size; i++) {
      cells += '<button type="button" class="pa2-cell is-free" onclick="pa2OpenPicker()" aria-label="' + esc(_t("Case libre : ajouter un objet")) + '"><span>+</span></button>';
    }
    pa2View.justAdded = null;
    h += '<div class="pa2-panel"><div class="pa2-kicker pa2-kicker-ico">' + pa2Img(PA2_ICONS.bag) + esc(_t("Ta besace")) + '</div>';
    h += '<div class="pa2-bag" id="pa2-bag">' + cells + '</div>';
    h += '<div class="pa2-bag-meta"><span>' + esc(_t("{a} / {b} places", { a: used, b: size })) + '</span><span>' +
      esc(run.bag.length ? _t("Touche un objet pour le retirer") : _t("Touche une case pour la remplir")) + '</span></div>';
    h += '<p class="pa2-small pa2-dim">' + esc(_t("Les rations viennent de l'Entrepôt ; celles que tu ne manges pas y retournent.")) + '</p></div>';
    if (par) h += '<button type="button" class="kbtn primary" onclick="pa2Depart()">' + esc(tpl.departLabel ? _td(tpl.departLabel) : _t("Partir")) + '</button>';
    else h += '<button type="button" class="kbtn primary" onclick="pa2PrepStep(\'pacts\')">' + esc(_t("Choisir mes pactes")) + '</button>';
  } else {
    h += '<div class="pa2-panel"><p class="pa2-narr pa2-dim pa2-center">' + esc(_t("Aucun n'est obligatoire. Chacun rend la nuit plus dure, et le retour plus riche.")) + '</p></div>';
    h += '<div class="pa2-list">';
    PA2_PACT_ORDER.forEach(function (id) {
      var p = PA2_PACTS[id], on = Pa2Run.hasPact(id, run);
      h += '<button type="button" class="pa2-pact" aria-pressed="' + on + '" onclick="pa2TogglePact(\'' + id + '\')">' + pa2Img(p.icon) +
        '<span><span class="pa2-nm">' + esc(_td(p.name)) + '</span><span class="pa2-ds">' + esc(_td(p.desc)) + '</span></span>' +
        '<span class="pa2-bonus">+' + Math.round(p.bonus * 100) + ' %</span></button>';
    });
    h += '</div>';
    h += '<div class="pa2-panel pa2-mult"><span>' + esc(_t("Butin final")) + '</span><b>' + pa2Mult(Pa2Run.pactMult(run)) + '</b></div>';
    h += '<div class="pa2-btnrow"><button type="button" class="kbtn" onclick="pa2PrepStep(\'bag\')">' + esc(_t("Besace")) + '</button>' +
      '<button type="button" class="kbtn primary" onclick="pa2Depart()">' + esc(_t("Entrer dans la forêt")) + '</button></div>';
  }
  h += '<button type="button" class="pa2-link" onclick="pa2CancelPrep()">' + esc(par ? _t("Renoncer") : _t("Renoncer à cette aventure")) + '</button>';
  h += '</div></div>';
  return h;
}

/* Trophées du monde (PA2-2, D3) : destinations atteintes, réussites, record de pactes. */
function pa2TrophiesHTML(run) {
  var t = Pa2Run.trophies(run.worldId), st = Pa2Run.ensureChest().stats, dests = pa2Dests(run);
  var h = '<div class="pa2-panel"><div class="pa2-kicker">' + esc(_t("Trophées — {w}", { w: pa2WorldName(run.worldId) })) + '</div><div class="pa2-trophies">';
  ["boss", "clairiere", "tertre"].forEach(function (d) {
    var n = Number(t.dests[d] || 0);
    h += '<div class="pa2-troph' + (n ? '' : ' is-empty') + '">' + pa2Img(PA2_ICONS[d], "", _td(dests[d].name)) + '<b>×' + n + '</b><span>' + esc(_td(dests[d].name)) + '</span></div>';
  });
  h += '</div><div class="pa2-bag-meta"><span>' + esc(_tn(t.success, "{n} destination atteinte", "{n} destinations atteintes", { n: t.success })) + '</span>' +
    '<span>' + esc(_tn(Number(st.bestPacts || 0), "Record : {n} pacte tenu", "Record : {n} pactes tenus", { n: Number(st.bestPacts || 0) })) + '</span></div></div>';
  return h;
}

function pa2PrepStep(step) {
  pa2View.prepStep = step === "pacts" ? "pacts" : "bag";
  pa2View.keepScroll = 0;
  pa2Rerender();
  var zone = document.querySelector("#panel-container .kfp-scrollzone");
  if (zone) zone.scrollTop = 0;
}
function pa2OpenPicker() { pa2View.picker = { mode: "add" }; pa2RenderPicker(); }
function pa2OpenItem(idx) { pa2View.picker = { mode: "item", idx: idx }; pa2RenderPicker(); }
function pa2ClosePicker() { pa2View.picker = null; pa2RenderPicker(); }
function pa2AddItem(id) {
  var r = Pa2Run.addItem(id);
  if (!r.ok) { if (typeof showToast === "function") showToast(r.reason, 1600); return; }
  pa2View.justAdded = Pa2Run.getRun().bag.length - 1;
  pa2View.picker = null;
  pa2RenderPicker();
  pa2Rerender();
}
function pa2RemoveItem(idx) {
  Pa2Run.removeItem(idx);
  pa2View.picker = null;
  pa2RenderPicker();
  pa2Rerender();
}
function pa2TogglePact(id) { Pa2Run.togglePact(id); pa2Rerender(); }

function pa2Depart() {
  var r = Pa2Run.depart();
  if (!r.ok) { if (typeof showToast === "function") showToast(r.reason, 2200); return; }
  pa2Rerender();
}
function pa2CancelPrep() {
  Pa2Run.abandon();
  pa2ClearChrome();
  if (typeof leaveSceneScreen === "function") leaveSceneScreen();
}

// Feuille de la besace : ajouter (liste) ou retirer (fiche de l'objet).
function pa2RenderPicker() {
  var run = Pa2Run.getRun();
  if (!run || run.status !== PA2_STATUS.prep || !pa2View.picker) { pa2SetSheetHTML(null); return; }
  var h = "", free = Pa2Run.bagSize(run) - Pa2Run.bagUsed(run);
  if (pa2View.picker.mode === "add") {
    h += '<div class="pa2-sheet-head"><div class="pa2-medal">' + pa2Img(PA2_ICONS.bag) + '</div><div><div class="pa2-kicker">' +
      esc(_tn(free, "{n} place libre", "{n} places libres", { n: free })) + '</div><h2 class="pa2-h2">' + esc(_t("Ajouter à la besace")) + '</h2></div></div><div class="pa2-choices">';
    PA2_ITEM_ORDER.forEach(function (id) {
      if (!Pa2Run.itemInWorld(id, run)) return; // v3.387.0 : l'Outre n'existe qu'au Désert
      var it = PA2_ITEMS[id], c = Pa2Run.canAdd(id), n = run.bag.filter(function (x) { return x === id; }).length, sz = "";
      for (var k = 0; k < it.size; k++) sz += "<i></i>";
      var locked = !Pa2Run.isUnlocked(id);
      var stock = it.resource && window.WarehouseManager ? WarehouseManager.getAmount(it.resource) : null;
      var why = c.ok ? "" : (c.reason === _t("La besace est pleine.") ? _tn(it.size, "Trop grand : {n} place.", "Trop grand : {n} places.", { n: it.size }) : c.reason);
      h += '<button type="button" class="pa2-choice pa2-pickrow' + (locked ? ' is-locked' : '') + '"' + (c.ok ? '' : ' disabled') + ' onclick="pa2AddItem(\'' + id + '\')">' +
        pa2Img(it.icon) + '<span class="pa2-t">' + esc(pa2ItemName(id)) + (n ? ' <span class="pa2-dim">(×' + n + ')</span>' : '') + '</span>' +
        '<span class="pa2-size">' + sz + '</span><span class="pa2-s">' +
        (why ? '<span class="pa2-dim">' + esc(why) + '</span>'
          : '<span class="pa2-pro">' + esc(_td(it.pro)) + '</span>' + (it.con ? ' <span class="pa2-con">' + esc(_td(it.con)) + '</span>' : '')) +
        (stock != null && !locked ? ' <span class="pa2-dim">' + esc(_t("Entrepôt : {n}", { n: stock })) + '</span>' : '') + '</span></button>';
    });
    h += '</div>';
  } else {
    var id = run.bag[pa2View.picker.idx], it = PA2_ITEMS[id];
    if (!it) { pa2View.picker = null; pa2SetSheetHTML(null); return; }
    h += '<div class="pa2-sheet-head"><div class="pa2-medal is-big">' + pa2Img(it.icon) + '</div><div><div class="pa2-kicker">' +
      esc(_tn(it.size, "{n} place", "{n} places", { n: it.size })) + '</div><h2 class="pa2-h2">' + esc(pa2ItemName(id)) + '</h2></div></div>';
    h += '<p class="pa2-pro pa2-p">' + esc(_td(it.pro)) + '</p>' + (it.con ? '<p class="pa2-con pa2-p">' + esc(_td(it.con)) + '</p>' : '');
    h += '<div class="pa2-btnrow"><button type="button" class="kbtn" onclick="pa2ClosePicker()">' + esc(_t("Garder")) + '</button>' +
      '<button type="button" class="kbtn danger" onclick="pa2RemoveItem(' + pa2View.picker.idx + ')">' + esc(_t("Retirer")) + '</button></div>';
  }
  pa2SetSheetHTML(h, _t("Besace"), true);
}

/* ---------- Écran de la carte ---------- */

function pa2GaugeHTML(kind, v, max, label) {
  var pct = Math.max(0, Math.min(100, Math.round(100 * Number(v || 0) / Math.max(1, Number(max || 1)))));
  return '<div class="kgauge kgauge-thin pa2-gauge is-' + kind + '"><div class="kgauge-track"><div class="kgauge-fill" style="width:' + pct + '%"></div></div><div class="kgauge-text">' + esc(label) + '</div></div>';
}

// Valeurs du HUD : les vraies, sauf pendant une animation (le moteur a déjà appliqué le résultat).
function pa2HudValues(run) {
  var v = { hp: Number(game.heroHp || 0), max: Number(game.heroMaxHp || 1), breath: run.breath, loot: run.loot, wounds: run.wounds };
  if (pa2View.hud) { v.hp = pa2View.hud.hp; v.breath = pa2View.hud.breath; v.loot = pa2View.hud.loot; v.wounds = pa2View.hud.wounds; }
  return v;
}
function pa2Snapshot(run) {
  pa2View.hud = { hp: Number(game.heroHp || 0), breath: run.breath, loot: run.loot, wounds: run.wounds, fiole: run.fioleUsed };
}

function pa2HudHTML(run) {
  var v = pa2HudValues(run), hero = pa2Hero(), n = Pa2Run.node(run.at, run), chips = "";
  if (v.wounds) chips += '<span class="pa2-chip is-wound" title="' + esc(_t("Blessures : −1 cran par blessure")) + '">' + pa2Img(PA2_ICONS.wound) + '×' + v.wounds + '</span>';
  ["petite_ration", "ration", "grande_ration", "gourde", "outre"].forEach(function (id) {
    if (run.stock[id] > 0) chips += '<button type="button" class="pa2-chip" onclick="pa2Use(\'' + id + '\')" aria-label="' + esc(_t("Utiliser : {n}", { n: pa2ItemName(id) })) + '">' + pa2Img(PA2_ITEMS[id].icon) + '×' + run.stock[id] + '</button>';
  });
  if (run.stock.corde > 0) chips += '<span class="pa2-chip" title="' + esc(pa2ItemName("corde")) + '">' + pa2Img(PA2_ITEMS.corde.icon) + '×' + run.stock.corde + '</span>';
  var rel = run.relics.map(function (id) {
    var r = PA2_RELICS[id];
    return '<button type="button" class="pa2-chip is-relic is-' + r.rar + '" onclick="pa2RelicInfo(\'' + id + '\')" aria-label="' + esc(_td(r.name)) + '">' + pa2Img(r.icon) + '</button>';
  }).join("");
  var act = n && n.row >= 0 ? (run.parcours ? _t("Étape {a}/{b}", { a: n.row + 1, b: Pa2Run.rows(Pa2Run.getMap(run)).dest + 1 }) : PA2_ACT_WORD[n.act]) : _t("Départ");
  // v3.394.0 : plus de cadre de page — le monde (ou le parcours) se lit dans l'en-tête.
  var where = (run.parcours ? _td((SceneEngine.getTemplate(run.templateId) || {}).title || "") : pa2WorldName(run.worldId)) + " · " + act;
  // v3.405.0 : le lieu et le butin passent sur une ligne au-dessus — les barres prennent toute la largeur.
  return '<div class="pa2-hud" id="pa2-hud">' +
    '<div class="pa2-hud-top"><div class="pa2-act">' + esc(where) + '</div><div class="pa2-gold">' + pa2Img(pa2LootRes(run) ? pa2LootRes(run).icon : PA2_ICONS.gold) + pa2Num(v.loot) + '</div></div>' +
    pa2Img(hero.image, "pa2-portrait", hero.name) +
    '<div class="pa2-gauges">' + pa2GaugeHTML("hp", v.hp, v.max, _t("{a} / {b} PV", { a: pa2Num(v.hp), b: pa2Num(v.max) })) +
    pa2GaugeHTML("breath", v.breath, 100, _t("Souffle {n}", { n: pa2Num(v.breath) })) + '</div>' +
    (chips || rel ? '<div class="pa2-hud-row">' + chips + '<span class="pa2-spacer"></span>' + rel + '</div>' : '') + '</div>';
}
function pa2RefreshHud() {
  var run = Pa2Run.getRun(), el = document.getElementById("pa2-hud");
  if (run && el) el.outerHTML = pa2HudHTML(run);
  pa2CamTop(); // l'en-tête a pu changer de hauteur (rangée d'objets vidée)
}

/* v3.394.0 : carte plein écran, sans cadre de page (atelier validé par Seb le 30/09/2026) :
   la carte en « Couvrant », l'en-tête flottant, zoom et caméra communs (ui/map-camera.js).
   La scène reprend la vue de pa2View.cam : un nouveau rendu ne fait pas sauter la carte. */
function buildPa2MapScreenHTML(run) {
  var n = Pa2Run.node(run.at, run), v = pa2View.cam, map = Pa2Run.getMap(run);
  var keep = v.key === pa2CamKey(run) && v.w;
  var h = '<div class="pa2-fs pa2-page" id="pa2-fs">';
  h += '<div class="pa2-vp" id="pa2-vp"><div class="pa2-stage" id="pa2-stage" style="' + (keep
    ? 'width:' + v.w + 'px;height:' + (v.w * map.height / map.width) + 'px;transform:translate3d(' + v.tx + 'px,' + v.ty + 'px,0);--nk:' + pa2CamNk()
    : 'visibility:hidden') + '">' + pa2MapHTML(run) + '</div></div>';
  h += pa2HudHTML(run);
  // Consigne : seulement avant le premier pas, elle s'efface d'elle-même.
  if (run.status === PA2_STATUS.map && !run.path.length) {
    var hint = run.parcours ? _t("Touche l'étape suivante pour avancer.") : (n.type === "depart" ? _t("Touche un sentier doré pour quitter le village.") : _t("Choisis ta route. Les trois destinations brillent au nord."));
    h += '<p class="pa2-maphint">' + esc(hint) + '</p>';
  }
  h += '<button type="button" class="pa2-offmark" id="pa2-offmark" onclick="pa2CamFollow(true)" aria-label="' + esc(_t("Revenir au héros")) + '"><i id="pa2-offarrow"></i>' + pa2Img(PA2_ICONS.hero) + '</button>';
  h += '<button type="button" class="lmx-btn pa2-fs-btn is-quit" onclick="pa2AskAbandon()" aria-label="' + esc(run.parcours ? _t("Abandonner le parcours") : _t("Abandonner l'aventure")) + '">⚑</button>';
  h += '<button type="button" class="lmx-btn pa2-fs-btn is-center" onclick="pa2CamFollow(true)" aria-label="' + esc(_t("Recentrer sur le héros")) + '">◎</button>';
  h += '</div>';
  return h;
}

/* ---------- Caméra de la carte (moteur commun, ui/map-camera.js) ---------- */

var PA2_ZOOM_MAX = 2;       // choix de Seb (atelier) : ×2 par rapport au cadrage Couvrant
var PA2_NODE_GROW = 0.4;    // choix de Seb (atelier) : les repères grossissent peu (taille ∝ zoom^0,4)

var pa2Cam = window.MapCamera ? MapCamera.create({
  vpId: "pa2-vp", stageId: "pa2-stage", view: pa2View.cam, ignoreButtonTaps: true,
  ratio: function () { var m = window.Pa2Run && Pa2Run.getMap(); return m ? m.height / m.width : 1; },
  zoomMax: function () { return PA2_ZOOM_MAX; },
  topSlack: function () { return pa2View.camTop || 0; },
  bottomSlack: function () { return pa2CamSheetH(); },
  onSettle: function () { pa2CamOffscreen(); },
  onReset: function () { pa2CamFollow(true); },
  onResize: function (st) { st.style.setProperty("--nk", pa2CamNk()); }
}) : null;

function pa2CamKey(run) { return run.id + "|" + (run.mapId || (run.map && run.map.image) || ""); }
// Compensation de taille des repères : 1 en Couvrant, (Couvrant / largeur)^0,6 en zoomant.
function pa2CamNk() { var c = pa2Cam ? pa2Cam.coverW() : 0, w = pa2View.cam.w; return c && w ? Math.pow(c / w, 1 - PA2_NODE_GROW).toFixed(3) : "1"; }
// Feuille d'action ouverte : la zone utile s'arrête à son bord haut.
function pa2CamSheetH() {
  var sh = document.querySelector ? document.querySelector("#pa2-sheetbox .pa2-sheet") : null;
  return sh && sh.getBoundingClientRect ? sh.getBoundingClientRect().height / MapCamera.scaleOf(sh) : 0;
}
// Bas de l'en-tête flottant, en px de la fenêtre : la carte peut descendre jusque-là.
function pa2CamTop() {
  var hud = document.getElementById("pa2-hud"), vp = document.getElementById("pa2-vp");
  if (!hud || !vp || !hud.getBoundingClientRect) return;
  var f = MapCamera.scaleOf(vp);
  pa2View.camTop = (hud.getBoundingClientRect().bottom - vp.getBoundingClientRect().top) / f + 6;
}
function pa2CamAfterRender(run) {
  if (!pa2Cam) return;
  pa2CamTop();
  var v = pa2View.cam, key = pa2CamKey(run);
  if (v.key !== key || !v.w) { v.key = key; pa2Cam.resetCover(); pa2CamFollow(false); }
  else pa2Cam.refit();
}
// Centre le nœud du héros dans la zone utile (sous l'en-tête, au-dessus de la feuille).
function pa2CamFollow(anim) {
  var run = Pa2Run.getRun(); if (!pa2Cam || !run || !document.getElementById("pa2-vp")) return;
  var map = Pa2Run.getMap(run), d = map.nodes[run.at];
  if (d) pa2Cam.centerOn(d.x / map.width, d.y / map.height, anim);
}
window.pa2CamFollow = pa2CamFollow;
// Héros hors de la zone utile : pastille au bord, flèche vers lui.
function pa2CamOffscreen() {
  var el = document.getElementById("pa2-offmark"), vp = document.getElementById("pa2-vp"), run = Pa2Run.getRun();
  if (!el || !vp || !run || !el.classList) return;
  var map = Pa2Run.getMap(run), d = map.nodes[run.at], v = pa2View.cam;
  var W = vp.clientWidth, H = vp.clientHeight - pa2CamSheetH(), T = (pa2View.camTop || 0) + 20, M = 24;
  var sx = v.tx + v.w * d.x / map.width, sy = v.ty + v.w * d.y / map.width;
  if (pa2View.sheet || (sx > M && sx < W - M && sy > T && sy < H - M)) { el.classList.remove("is-on"); return; }
  var ang = Math.atan2(sy - (T + H) / 2, sx - W / 2), arrow = document.getElementById("pa2-offarrow");
  if (arrow) arrow.style.transform = "rotate(" + (ang + Math.PI / 2) + "rad)";
  el.style.left = Math.max(70, Math.min(W - 70, sx)) + "px";
  el.style.top = Math.max(T + 10, Math.min(H - 130, sy)) + "px"; // au-dessus des boutons ronds du bas
  el.classList.add("is-on");
}

// Carte : illustration, voile de nuit (masque SVG), sentiers ouverts et parcourus, nœuds en HTML.
function pa2MapHTML(run) {
  var map = Pa2Run.getMap(run), W = map.width, H = map.height;
  var cur = map.nodes[run.at], here = Pa2Run.node(run.at, run);
  var open = run.status === PA2_STATUS.map ? Pa2Run.openMoves() : [];
  var walked = {};
  run.path.forEach(function (e) { walked[e[0] + ">" + e[1]] = true; });
  // Rayons pensés pour foret_1 (848 px de large) : mis à l'échelle de chaque illustration.
  var K = W / 848;
  var light = (Pa2Run.hasItem("veilleurs", run) ? 275 : (Pa2Run.hasItem("torche", run) ? 230 : 190)) * K;

  var svg = '<svg class="pa2-map-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">';
  svg += '<defs><radialGradient id="pa2-halo"><stop offset="0" stop-color="#000"/><stop offset=".55" stop-color="#000" stop-opacity=".92"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="pa2-glow"><stop offset="0" stop-color="#f0aa3e" stop-opacity=".38"/><stop offset="1" stop-color="#f0aa3e" stop-opacity="0"/></radialGradient>' +
    '<mask id="pa2-fog"><rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#fff"/>' +
    '<circle cx="' + cur.x + '" cy="' + cur.y + '" r="' + light + '" fill="url(#pa2-halo)"/>';
  run.path.forEach(function (e) { var q = map.nodes[e[1]]; svg += '<circle cx="' + q.x + '" cy="' + q.y + '" r="' + Math.round(75 * K) + '" fill="url(#pa2-halo)" opacity=".75"/>'; });
  Object.keys(map.nodes).forEach(function (k) {
    var d = map.nodes[k];
    if (Pa2Run.isDest(run.nodes[k], run)) svg += '<circle cx="' + d.x + '" cy="' + d.y + '" r="' + Math.round(66 * K) + '" fill="url(#pa2-halo)" opacity=".6"/>';
    else if (d.row >= 0 && run.reveal[Pa2Run.actOf(d.row, map)]) svg += '<circle cx="' + d.x + '" cy="' + d.y + '" r="' + Math.round(58 * K) + '" fill="url(#pa2-halo)" opacity=".45"/>';
  });
  svg += '</mask></defs>';
  var veil = run.parcours ? (map.image ? '.45' : '0') : (here && here.act === 3 ? '.9' : '.84'); // parcours : le chemin se voit en entier
  svg += '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#050302" opacity="' + veil + '" mask="url(#pa2-fog)"/>';
  svg += '<circle cx="' + cur.x + '" cy="' + cur.y + '" r="' + Math.round(light * 0.8) + '" fill="url(#pa2-glow)"/>';
  // Seuls les sentiers possibles (pointillés dorés) et la trace parcourue sont dessinés.
  Object.keys(map.links).forEach(function (a) {
    map.links[a].forEach(function (b) {
      var w = walked[a + ">" + b], o = a === run.at && open.indexOf(b) >= 0;
      if (!w && !o) return;
      var A = map.nodes[a], B = map.nodes[b];
      var isNew = pa2View.fromKey && a === pa2View.fromKey && b === run.at;
      var st = w ? 'stroke="#ffcf7a" stroke-width="' + (5 * K).toFixed(1) + '" stroke-opacity=".9"' : 'stroke="#f0aa3e" stroke-width="' + (4.5 * K).toFixed(1) + '" stroke-dasharray="' + (2 * K).toFixed(1) + ' ' + (12 * K).toFixed(1) + '"';
      svg += '<line class="pa2-edge' + (isNew ? ' is-drawing' : '') + '" x1="' + A.x + '" y1="' + A.y + '" x2="' + B.x + '" y2="' + B.y + '" ' + st + ' stroke-linecap="round"/>';
    });
  });
  svg += '</svg>';

  var nodes = "";
  Object.keys(map.nodes).forEach(function (k) {
    if (!Pa2Run.isShown(k, run)) return;
    var d = map.nodes[k], n = Pa2Run.node(k, run), isOpen = open.indexOf(k) >= 0, isCur = k === run.at;
    var vis = Pa2Run.isVisible(k, run), type = vis ? n.type : "unknown";
    var cls = "pa2-node t-" + type + (Pa2Run.isDest(n, run) ? " is-dest" : "") + (n.type === "camp" || n.type === "seuil" || n.type === "depart" ? " is-mark" : "") +
      (isOpen ? " is-open" : "") + (isCur ? " is-cur" : "") + (n.done && !isCur ? " is-done" : "");
    var label = vis ? pa2NodeLabel(run, n) : _t("Inconnu");
    nodes += '<button type="button" class="' + cls + '" style="left:' + (100 * d.x / W).toFixed(2) + '%;top:' + (100 * d.y / H).toFixed(2) + '%"' +
      (isOpen ? ' onclick="pa2Move(\'' + k + '\')"' : ' tabindex="-1"') + ' aria-label="' + esc(label) + '">' + pa2Img(PA2_ICONS[type] || PA2_ICONS.unknown) + '</button>';
  });
  var from = pa2View.fromKey ? map.nodes[pa2View.fromKey] : cur;
  var marker = '<img class="pa2-hero-mark" id="pa2-hero-mark" src="' + esc(PA2_ICONS.hero) + '" alt="" style="left:' + (100 * from.x / W).toFixed(2) + '%;top:' + (100 * from.y / H).toFixed(2) + '%">';
  return '<div class="pa2-map" id="pa2-map">' +
    (map.image ? '<img class="pa2-map-img" src="' + esc(map.image) + '" alt="">' : '<div class="pa2-map-img pa2-parchment"></div>') + svg + nodes + marker + '</div>';
}

function pa2NodeLabel(run, n) {
  var d = pa2Dests(run);
  var names = {
    obstacle: _t("Obstacle"), combat: _t("Combat"), source: _t("Source"), autel: _t("Autel"), trouvaille: _t("Trouvaille"),
    evenement: _t("Rencontre"), camp: _t("Le camp"), seuil: _t("Le seuil"), depart: _t("Le village")
  };
  if (d[n.type]) return _td(d[n.type].name);
  return names[n.type] || "";
}

// Le repère glisse du nœud quitté au nouveau, le sentier se trace, puis la feuille s'ouvre.
function pa2AnimateMove() {
  var run = Pa2Run.getRun(), map = run ? Pa2Run.getMap(run) : null, mark = document.getElementById("pa2-hero-mark");
  pa2View.fromKey = null;
  if (!run || !map || !mark) return;
  var cur = map.nodes[run.at];
  pa2CamFollow(true); // la caméra suit le héros
  var edge = document.querySelector("#pa2-map .pa2-edge.is-drawing");
  if (edge) {
    var L = Math.hypot(edge.x2.baseVal.value - edge.x1.baseVal.value, edge.y2.baseVal.value - edge.y1.baseVal.value);
    edge.style.strokeDasharray = L; edge.style.strokeDashoffset = L; edge.getBoundingClientRect();
    edge.style.transition = "stroke-dashoffset .55s ease-out"; edge.style.strokeDashoffset = 0;
  }
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      mark.classList.add("is-moving");
      mark.style.left = (100 * cur.x / map.width).toFixed(2) + "%";
      mark.style.top = (100 * cur.y / map.height).toFixed(2) + "%";
    });
  });
  pa2Later(function () { if (Pa2Run.getRun() && Pa2Run.getRun().status === PA2_STATUS.node) pa2OpenSheet(); }, 700);
}

function pa2Move(key) {
  var run = Pa2Run.getRun();
  if (!run || pa2View.sheet || (pa2Cam && pa2Cam.gesture.suppressClick)) return; // fin d'un glissé : pas un tap
  var from = run.at, r = Pa2Run.moveTo(key);
  if (!r.ok) { if (typeof showToast === "function") showToast(r.reason, 1600); return; }
  pa2View.fromKey = from;
  pa2Rerender();
}

function pa2Use(id) {
  var before = { hp: game.heroHp, breath: Pa2Run.getRun().breath };
  var r = Pa2Run.useItem(id);
  if (!r.ok) { if (typeof showToast === "function") showToast(r.reason, 1600); return; }
  var run = Pa2Run.getRun();
  if (game.heroHp > before.hp) pa2Float("+" + pa2Num(game.heroHp - before.hp) + " " + _t("PV"), "heal");
  if (run.breath > before.breath) pa2Float("+" + pa2Num(run.breath - before.breath) + " " + _t("Souffle"), "breath");
  pa2RefreshHud();
  if (pa2View.sheet && pa2View.sheet.step === "intro") pa2RenderSheet();
}
function pa2RelicInfo(id) {
  var r = PA2_RELICS[id];
  if (r && typeof showToast === "function") showToast(_td(r.name) + " : " + _td(r.fx), 2600);
}

function pa2AskAbandon() {
  var run = Pa2Run.getRun();
  if (!run) return;
  var retour = Pa2Run.hasPact("retour", run);
  showConfirmModal(_t("Abandonner l'aventure ?"),
    retour ? _t("Pacte « Pas de retour » : tout le butin reste en route.") : _t("Tu perds la moitié du butin. Les rations non mangées retournent à l'Entrepôt."),
    "images/Icons/system/warning.png", function () {
      SceneRunManager.abandon();
      pa2View.sheet = null;
      pa2Rerender();
    });
}

/* ---------- Légende (bouton rond, comme la carte du monde) ---------- */

function pa2RenderLegend() {
  var box = document.getElementById("pa2-legendbox"), run = Pa2Run.getRun();
  if (!box) return;
  if (!run || (run.status !== PA2_STATUS.map && run.status !== PA2_STATUS.node)) { box.innerHTML = ""; return; }
  var h = '<button type="button" class="lmx-btn pa2-legend-btn" onclick="pa2ToggleLegend()" aria-label="' + esc(_t("Légende")) + '" aria-expanded="' + !!pa2View.legend + '">?</button>';
  if (pa2View.legend) {
    var row = function (icon, label, sub) {
      return '<div class="pa2-legend-row"><span class="pa2-disc">' + pa2Img(icon) + '</span><span>' + esc(label) + '<small>' + esc(sub) + '</small></span></div>';
    };
    h += '<div class="pa2-legend" role="dialog" aria-label="' + esc(_t("Légende")) + '"><h5>' + esc(_t("Légende")) + '</h5>' +
      row(PA2_ICONS.obstacle, _t("Obstacle"), _t("Trois voies, un jet de dé")) + row(PA2_ICONS.combat, _t("Combat"), _t("Charger, Tenir, Ruser ou Fuir")) +
      row(PA2_ICONS.source, _t("Source"), _t("PV et Souffle")) + row(PA2_ICONS.autel, _t("Autel"), _t("De l'or contre une plaie")) +
      row(PA2_ICONS.trouvaille, _t("Trouvaille"), _t("Un objet pour ce run")) + row(PA2_ICONS.evenement, _t("Rencontre"), _t("Un choix qui aura des suites")) +
      row(PA2_ICONS.camp, _t("Le camp"), _t("Fin de l'acte I")) + row(PA2_ICONS.seuil, _t("Le seuil"), _t("Fin de l'acte II")) +
      row(PA2_ICONS.boss, _t("Destinations"), _t("Trois fins possibles, au nord")) + '</div>';
  }
  box.innerHTML = h;
}
function pa2ToggleLegend() { pa2View.legend = !pa2View.legend; pa2RenderLegend(); }

/* ---------- Feuille d'action ---------- */

// Pose (ou retire) la feuille du bas dans le calque. keep=true : remplace le contenu sans rejouer l'entrée.
function pa2SetSheetHTML(inner, label, closable) {
  var box = document.getElementById("pa2-sheetbox");
  if (!box) return;
  if (inner == null) { box.innerHTML = ""; pa2CamSheetChanged(); return; }
  var sheet = box.querySelector(".pa2-sheet");
  var body = (closable ? '<button type="button" class="pa2-xclose" onclick="pa2ClosePicker()" aria-label="' + esc(_t("Fermer")) + '"></button>' : '') + inner;
  if (sheet) { sheet.innerHTML = body; pa2CamSheetChanged(); return; }
  pa2CamSheetChanged();
  box.innerHTML = '<div class="pa2-scrim"' + (closable ? ' onclick="if(event.target===this)pa2ClosePicker()"' : '') + '><div class="pa2-sheet" role="dialog" aria-modal="true" aria-label="' + esc(label || "") + '">' + body + '</div></div>';
}

/* v3.394.0 : la feuille ouverte (ou changée de taille) réduit la zone utile ; le nœud du héros
   est ramené au-dessus d'elle. Feuille fermée : la carte reprend toute la hauteur. */
function pa2CamSheetChanged() {
  if (!pa2Cam || !document.getElementById("pa2-vp")) return;
  var go = function () {
    var h = pa2CamSheetH();
    if (Math.abs(h - (pa2View.camSheet || 0)) < 2) return;
    pa2View.camSheet = h;
    if (h) pa2CamFollow(true); else pa2Cam.refit();
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(go); else go();
}

function pa2OpenSheet() {
  var run = Pa2Run.getRun();
  if (!run || run.status !== PA2_STATUS.node) return;
  var n = Pa2Run.node(run.at, run);
  pa2View.sheet = { key: n.key, step: (run.lastResult && run.lastResult.surprised) ? "surprised" : "intro" };
  pa2RenderSheet();
}
function pa2CloseSheet() {
  pa2ClearTimers();
  pa2View.sheet = null;
  pa2View.hud = null;
  pa2SetSheetHTML(null);
  pa2Rerender();
}
window.pa2CloseSheet = pa2CloseSheet;

function pa2RenderSheet() {
  var run = Pa2Run.getRun(), st = pa2View.sheet;
  if (!run || !st) { pa2SetSheetHTML(null); return; }
  var n = Pa2Run.node(st.key, run);
  pa2SetSheetHTML(pa2SheetBody(run, n, st), pa2NodeLabel(run, n), false);
}

function pa2Head(run, n, title, kicker, big) {
  var dest = Pa2Run.isDest(n, run);
  return '<div class="pa2-sheet-head"><div class="pa2-medal' + (dest ? ' is-dest is-big' : (big ? ' is-big' : '')) + '">' + pa2Img(PA2_ICONS[n.type] || PA2_ICONS.unknown) + '</div><div><div class="pa2-kicker">' + esc(kicker) + '</div><h2 class="pa2-h2">' + esc(title) + '</h2></div></div>';
}
function pa2OddsHTML(cran) {
  return '<span class="pa2-odds o' + PA2_CRAN_LEVEL[cran] + '"><span class="pa2-cran"><i></i><i></i><i></i><i></i></span><span class="pa2-w">' + esc(PA2_CRAN_WORD[cran]) + '</span></span>';
}
function pa2DieFace(v) {
  var m = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }, h = "";
  for (var i = 0; i < 9; i++) h += "<i" + (m[v].indexOf(i) >= 0 ? ' class="on"' : "") + "></i>";
  return h;
}
function pa2DieBlock(thr, cran, rope) {
  return '<div class="pa2-dierow"><div class="pa2-die" id="pa2-die">' + pa2DieFace(rope ? 6 : 1) + '</div><div class="pa2-target">' + esc(_t("Il faut")) +
    '<b>' + (rope ? esc(_t("corde")) : thr + (thr < 6 ? "+" : "")) + '</b>' + esc(rope ? _t("Assuré") : PA2_CRAN_WORD[cran]) + '</div></div>';
}
function pa2WhyHTML(o, run) {
  var parts = [_t("{s} {v} contre {d}", { s: sceneStatLabel(o.stat), v: pa2Num(o.statValue), d: pa2Num(o.difficulty) })];
  if (o.bonus) parts.push(_tn(o.bonus, "+{n} cran", "+{n} crans", { n: o.bonus }));
  if (run.wounds) parts.push(_tn(run.wounds, "{n} blessure", "{n} blessures", { n: run.wounds }));
  return esc(parts.join(" · "));
}
function pa2ActKicker(n, what) {
  var run = Pa2Run.getRun();
  if (run && run.parcours && n.row >= 0) return what + " · " + _t("étape {n}", { n: n.row + 1 }); // parcours : pas d'actes
  return what + " · " + (n.row >= 0 ? PA2_ACT_WORD[n.act].toLowerCase() : "");
}

function pa2SheetBody(run, n, st) {
  var h = pa2EchoHTML(n, st), dests = pa2Dests(run), hook = pa2Hook(run), R = PA2_RULES;
  switch (n.type) {
    case "obstacle":
    case "tertre": {
      var gab = SceneEngine.getNodeBank().obstacles[n.gabaritId];
      var tertre = n.type === "tertre";
      var name = tertre ? _td(dests.tertre.name) : _td(gab.name);
      if (st.step === "intro") {
        h += pa2Head(run, n, name, tertre ? _t("Destination") : pa2ActKicker(n, _t("Obstacle")));
        h += '<p class="pa2-narr">' + esc(tertre ? _td(dests.tertre.line) : _td(PA2_OBSTACLE_LINES[n.gabaritId] || "")) + '</p><div class="pa2-choices">';
        var opts = Pa2Run.obstacleOptions();
        opts.forEach(function (o) {
          h += '<button type="button" class="pa2-choice"' + (o.affordable ? '' : ' disabled') + ' onclick="pa2Obstacle(\'' + o.voie + '\',false)">' + pa2Img(PA2_ICONS[o.voie]) +
            '<span class="pa2-t">' + esc(_td(o.label)) + '</span>' + pa2OddsHTML(o.cran) +
            '<span class="pa2-s">' + pa2WhyHTML(o, run) + ' · <b class="pa2-breath">' + esc(o.cost ? _t("{n} Souffle", { n: o.cost }) : _t("sans Souffle")) + '</b>' +
            (o.affordable ? '' : ' · ' + esc(_t("pas assez de Souffle"))) + '</span></button>';
        });
        opts.forEach(function (o) {
          if (!o.rope) return;
          h += '<button type="button" class="pa2-choice" onclick="pa2Obstacle(\'' + o.voie + '\',true)">' + pa2Img(PA2_ITEMS.corde.icon) +
            '<span class="pa2-t">' + esc(_t("Utiliser la corde")) + '</span><span class="pa2-odds o4"><span class="pa2-w">' + esc(_t("Assuré")) + '</span></span>' +
            '<span class="pa2-s">' + esc(_td(o.label)) + ' · ' + esc(_tn(run.stock.corde, "il te reste {n} corde", "il te reste {n} cordes", { n: run.stock.corde })) + '</span></button>';
        });
        if (Pa2Run.canBruteForce()) {
          h += '<button type="button" class="pa2-choice is-noicon" onclick="pa2Brute()"><span class="pa2-t">' + esc(_t("Passer en force brute")) + '</span><span class="pa2-cost is-red">−' + pa2Pct(R.bruteForcePct) + ' ' + esc(_t("PV")) + '</span><span class="pa2-s">' + esc(_t("Plus de Souffle. Tu passes, mais ça fait mal.")) + '</span></button>';
        }
        h += '</div>';
      } else {
        var r = st.res;
        h += pa2Head(run, n, name, _td((gab.options[r.voie] || {}).label || ""));
        h += pa2DieBlock(r.thr, r.cran, r.rope);
        h += '<div id="pa2-outcome" class="' + (st.shown ? "" : "is-hidden") + '">' + pa2ObstacleOutcome(run, n, r) + '</div>';
      }
      break;
    }

    case "combat":
    case "boss": {
      var boss = n.type === "boss", pv = st.step === "intro" || st.step === "surprised" ? Pa2Run.combatPreview() : null;
      var foe = pa2FoeInfo(run, n, pv);
      if (st.step === "intro" || st.step === "surprised") {
        h += pa2FoeHead(foe, boss ? _t("Destination · gardien") : (n.revenge ? _t("Combat · conséquence") : pa2ActKicker(n, _t("Combat"))), true);
        if (n.revenge) h += '<p class="pa2-sim is-red">' + esc(_t("Tu lui as pris son arc, plus tôt. Il frappe 30 % plus fort.")) + '</p>';
        h += '<p class="pa2-sim">' + esc(_t("Résolu sur ton héros seul, niveau {l} : sans compagnons ni potions. Les dégâts annoncés sont ceux que tu prendras, à 15 % près.", { l: run.level })) + '</p>';
        h += '<div class="pa2-choices">';
        if (st.step === "surprised") {
          var sur = pv.tenir, loss = Math.round(sur.hpLoss * R.surprisedMult);
          h += '<p class="pa2-sim is-red">' + esc(_t("Il t'a vu venir. Il frappe le premier : +20 % de dégâts.")) + '</p>';
          h += pa2ApproachButton("tenir", sur, loss, true);
        } else {
          ["charger", "tenir"].forEach(function (id) { h += pa2ApproachButton(id, pv[id], pv[id].hpLoss, false); });
          if (!boss) {
            h += '<button type="button" class="pa2-choice" onclick="pa2Ruse()">' + pa2Img(PA2_ICONS.ruse) + '<span class="pa2-t">' + esc(_t("Ruser")) + '</span>' + pa2OddsHTML(pv.ruse.cran) +
              '<span class="pa2-s">' + pa2WhyHTML(pv.ruse, run) + '. ' + esc(_t("Réussi : pas de combat, un peu de butin. Raté : il frappe le premier.")) + '</span></button>';
            h += '<button type="button" class="pa2-choice"' + (pv.flee.affordable ? '' : ' disabled') + ' onclick="pa2Flee()">' + pa2Img(PA2_ICONS.flee) + '<span class="pa2-t">' + esc(_t("Fuir par les fourrés")) + '</span>' +
              '<span class="pa2-cost">' + esc(_t("{n} Souffle", { n: pv.flee.cost })) + '</span><span class="pa2-s">' + esc(_t("Aucun butin.")) + '</span></button>';
          }
        }
        h += '</div>';
      } else if (st.step === "ruse") {
        h += pa2FoeHead(foe, _t("Ruser"), false);
        h += pa2DieBlock(st.res.thr, st.res.cran, false);
        h += '<div id="pa2-outcome" class="' + (st.shown ? "" : "is-hidden") + '">' + pa2RuseOutcome(run, st.res) + '</div>';
      } else {
        h += pa2FoeHead(foe, st.apName, false);
        h += '<div class="pa2-rounds" id="pa2-rounds">' + (st.shown ? pa2RoundsHTML(st, st.res.parts.length) : "") + '</div>';
        h += '<div id="pa2-outcome" class="' + (st.shown ? "" : "is-hidden") + '">' + pa2FightOutcome(run, n, st.res) + '</div>';
      }
      break;
    }

    case "source": {
      var dry = Pa2Run.hasPact("tarie", run), place = dry ? Pa2Run.place(run, "sourceDry") : Pa2Run.place(run, "source"), amt = Pa2Run.sourceAmount(run);
      h += pa2Head(run, n, _td(place.name), pa2ActKicker(n, _t("Source")));
      h += '<p class="pa2-narr">' + esc(_td(place.text)) + '</p><div class="pa2-choices">';
      h += '<button type="button" class="pa2-choice is-noicon" onclick="pa2Drink()"><span class="pa2-t">' + esc(_t("Boire")) + '</span><span class="pa2-cost">' + esc(_t("+{n} % PV · +{n} Souffle", { n: amt })) + '</span></button></div>';
      break;
    }

    case "autel": {
      var free = Pa2Run._altarFree(run), cost = Pa2Run.altarCost(run), can = free || run.loot >= cost;
      var ap = free ? Pa2Run.place(run, "autelFree") : Pa2Run.place(run, "autel");
      h += pa2Head(run, n, _td(ap.name), pa2ActKicker(n, _t("Autel")));
      h += '<p class="pa2-narr">' + esc(_td(ap.text).replace("{cost}", cost)) + '</p><div class="pa2-choices">';
      h += '<button type="button" class="pa2-choice is-noicon"' + (can ? '' : ' disabled') + ' onclick="pa2Altar(true)"><span class="pa2-t">' + esc(free ? _t("Poser la main sur la pierre") : _t("Déposer {n} or", { n: cost })) + '</span>' +
        '<span class="pa2-cost is-gold">' + esc(_t("−1 blessure · +{n} PV", { n: pa2Pct(R.altarHealPct) })) + '</span>' + (can ? '' : '<span class="pa2-s">' + esc(_t("Pas assez d'or.")) + '</span>') + '</button>';
      h += '<button type="button" class="pa2-choice is-noicon" onclick="pa2Altar(false)"><span class="pa2-t">' + esc(_t("Passer ton chemin")) + '</span></button></div>';
      break;
    }

    case "trouvaille": {
      var draw = n.draw || [];
      h += pa2Head(run, n, st.flipped ? _t("Une trouvaille") : _td(Pa2Run.place(run, "trouvaille").name), pa2ActKicker(n, _t("Trouvaille")));
      h += '<p class="pa2-narr">' + esc(st.flipped ? (draw.length > 1 ? _t("Deux objets. Tu n'en portes qu'un.") : _t("Pas pour toi. Mais tu es là.")) : _td(Pa2Run.place(run, "trouvaille").text)) + '</p>';
      h += '<div class="pa2-cards">' + draw.map(function (id, i) {
        var r = PA2_RELICS[id];
        return '<button type="button" class="pa2-card is-' + r.rar + (st.flipped ? ' is-flipped' : '') + (st.picked === id ? ' is-picked' : '') + '" onclick="' + (st.flipped ? "pa2PickRelic('" + id + "')" : "pa2Flip()") + '" aria-label="' + esc(st.flipped ? _td(r.name) : _t("Carte cachée {n}", { n: i + 1 })) + '">' +
          '<span class="pa2-face pa2-back">' + pa2Img(PA2_ICONS.unknown) + '</span>' +
          '<span class="pa2-face pa2-front"><span class="pa2-slot">' + pa2Img(r.icon) + '</span><span class="pa2-rar">' + esc(PA2_RAR_WORD[r.rar]) + '</span><span class="pa2-nm">' + esc(_td(r.name)) + '</span><span class="pa2-fx">' + esc(_td(r.fx)) + '</span></span></button>';
      }).join("") + '</div>';
      if (st.flipped) {
        var need = draw.length > 1 && !st.picked;
        h += '<button type="button" class="kbtn primary"' + (need ? ' disabled' : '') + ' onclick="pa2TakeRelic()">' + esc(draw.length > 1 ? (st.picked ? _t("Garder cette carte") : _t("Choisis une carte")) : _t("Garder")) + '</button>';
      } else {
        h += '<p class="pa2-small pa2-dim pa2-center">' + esc(_t("Retourne la carte.")) + '</p>';
      }
      break;
    }

    case "evenement": {
      var ev = hook.event;
      if (st.step === "intro" && hook.id !== "chasseur") {
        h += pa2Head(run, n, _td(ev.name), _t("Rencontre"));
        h += '<p class="pa2-narr">' + esc(_td(ev.text)) + '</p><div class="pa2-choices">';
        Object.keys(ev.branches).forEach(function (id) {
          var b = ev.branches[id], c = b.cost || {}, can = Pa2Run.canHookBranch(id), cost = "", icon = "";
          if (c.stock) { cost = _t("−1 gorgée"); icon = PA2_ITEMS[c.stock].icon; }
          else if (c.ration) { cost = _t("−1 ration"); icon = PA2_ITEMS.petite_ration.icon; }
          else if (c.breath) cost = _t("−{n} Souffle", { n: c.breath });
          else if (b.gainBreath) cost = _t("+{n} Souffle", { n: b.gainBreath });
          h += '<button type="button" class="pa2-choice' + (icon ? '' : ' is-noicon') + '"' + (can.ok ? '' : ' disabled') + ' onclick="pa2Event(\'' + id + '\')">' + (icon ? pa2Img(icon) : '') +
            '<span class="pa2-t">' + esc(_td(b.label)) + '</span>' + (cost ? '<span class="pa2-cost">' + esc(cost) + '</span>' : '') +
            (can.ok ? '' : '<span class="pa2-s">' + esc(can.reason) + '</span>') + '</button>';
        });
        h += '</div>';
      } else if (st.step === "intro") {
        var rid = Pa2Run._rationInStock(run), gain = Math.round(run.refGold * PA2_GOLD.event * Pa2Run.ring(run).lootMult * (Pa2Run.hasRelic("ronce", run) ? R.ronceLoot : 1));
        h += pa2Head(run, n, _td(ev.name), _t("Rencontre"));
        h += '<p class="pa2-narr">' + esc(_td(ev.text)) + '</p><div class="pa2-choices">';
        h += '<button type="button" class="pa2-choice"' + (rid ? '' : ' disabled') + ' onclick="pa2Event(\'ration\')">' + pa2Img(PA2_ITEMS.petite_ration.icon) + '<span class="pa2-t">' + esc(_td(ev.branches.ration.label)) + '</span>' +
          '<span class="pa2-cost">' + esc(_t("−1 ration")) + '</span>' + (rid ? '' : '<span class="pa2-s">' + esc(_t("Tu n'as plus de ration.")) + '</span>') + '</button>';
        h += '<button type="button" class="pa2-choice" onclick="pa2Event(\'mains\')">' + pa2Img(PA2_ICONS.wound) + '<span class="pa2-t">' + esc(_td(ev.branches.mains.label)) + '</span><span class="pa2-cost is-red">−' + pa2Pct(R.eventHandsPct) + ' ' + esc(_t("PV")) + '</span></button>';
        h += '<button type="button" class="pa2-choice" onclick="pa2Event(\'arc\')">' + pa2Img(PA2_ICONS.gold) + '<span class="pa2-t">' + esc(_td(ev.branches.arc.label)) + '</span><span class="pa2-cost is-gold">+' + gain + ' ' + esc(_t("or")) + '</span></button>';
        h += '</div>';
      } else {
        h += pa2Head(run, n, _td(ev.name), _t("Rencontre"));
        h += '<p class="pa2-narr">' + esc(_td(ev.branches[st.res.branch].text)) + '</p>';
        h += pa2ContinueButton(run);
      }
      break;
    }

    case "camp":
    case "seuil": {
      var camp = n.type === "camp", pl = camp ? Pa2Run.place(run, "camp") : Pa2Run.place(run, "seuil"), pct = camp ? R.campRestPct : R.seuilRestPct;
      var hasR = !!Pa2Run._rationInStock(run);
      h += pa2Head(run, n, _td(pl.name), camp ? _t("Fin de l'acte I") : _t("Fin de l'acte II"), true);
      h += '<p class="pa2-narr">' + esc(_td(pl.text)) + '</p>';
      if (!camp) h += pa2GuardianHint(run);
      if (camp && Pa2Run.campGiftDue(run)) {
        h += '<div class="pa2-panel pa2-trophy">' + pa2Img(PA2_RELICS[hook.campGift.relic].icon) + '<div><div class="pa2-dim pa2-small">' + esc(_td(hook.campGift.text)) + '</div></div></div>';
      }
      h += '<div class="pa2-choices">';
      h += '<button type="button" class="pa2-choice is-noicon" onclick="pa2Place(\'rest\')"><span class="pa2-t">' + esc(camp ? _t("Dormir") : _t("Reprendre ton souffle")) + '</span><span class="pa2-cost">' + esc(_t("+{n} % PV · +{n} Souffle", { n: Math.round(pct * 100) })) + '</span></button>';
      h += '<button type="button" class="pa2-choice"' + (hasR ? '' : ' disabled') + ' onclick="pa2Place(\'cook\')">' + pa2Img(PA2_ITEMS.petite_ration.icon) + '<span class="pa2-t">' + esc(_t("Cuisiner une ration")) + '</span>' +
        '<span class="pa2-cost">' + esc(_t("+{n} PV · −1 blessure", { n: pa2Pct(R.cookPct) })) + '</span><span class="pa2-s">' + esc(hasR ? _t("Au feu, une ration vaut bien plus.") : _t("Il te faut une ration.")) + '</span></button>';
      h += '<button type="button" class="pa2-choice is-noicon" onclick="pa2Place(\'listen\')"><span class="pa2-t">' + esc(camp ? _t("Écouter la forêt") : _t("Lire les traces")) + '</span>' +
        '<span class="pa2-cost">' + esc(camp ? _t("Acte II révélé") : _t("Acte III révélé")) + '</span><span class="pa2-s">' + esc(camp ? _t("Tu sais ce qui t'attend jusqu'au seuil.") : _t("Tu sais ce qui t'attend jusqu'au bout.")) + '</span></button>';
      h += '<button type="button" class="pa2-choice is-noicon" onclick="pa2Place(\'home\')"><span class="pa2-t">' + esc(_t("Rentrer au village")) + '</span>' +
        '<span class="pa2-cost is-gold">' + esc(_t("Tout le butin")) + '</span><span class="pa2-s">' + esc(_t("Pas de destination, pas de trophée.")) + '</span></button>';
      h += '</div>';
      break;
    }

    case "clairiere": {
      var cl = dests.clairiere, share = run.flags.sauve ? PA2_GOLD.clairiereSauve : PA2_GOLD.clairiere;
      var clGain = Math.round(run.refGold * share * Pa2Run.ring(run).lootMult * Pa2Run.destGoldMult(run) * (Pa2Run.hasRelic("ronce", run) ? R.ronceLoot : 1));
      h += pa2Head(run, n, _td(cl.name), _t("Destination"));
      h += '<p class="pa2-narr">' + esc(_td(cl.line)) + (hook ? " " + esc(_td(pa2HookClairiere(run, hook))) : "") + '</p><div class="pa2-choices">';
      h += '<button type="button" class="pa2-choice" onclick="pa2Clairiere()">' + pa2Img(PA2_ITEMS.veilleurs.icon) + '<span class="pa2-t">' + esc(_t("Prendre la lanterne qui t'attend")) + '</span>' +
        '<span class="pa2-cost is-gold">' + esc(_t("Trophée")) + '</span><span class="pa2-s">' + esc(_t("Fin sans combat · +{n} or", { n: clGain })) + '</span></button></div>';
      break;
    }
  }
  return h;
}

/* Au seuil : ce que coûterait le gardien, pour choisir sa destination avant l'acte III (C1, PA2-3). */
function pa2GuardianHint(run) {
  var gp = Pa2Run.guardianPreview();
  if (!gp || !gp.tenir) return "";
  var t = gp.tenir, verdict = t.unwinnable ? "mortel" : Pa2Run.verdictOf(t.hpLoss);
  var cost = PA2_VERDICT_WORD[verdict] + (t.unwinnable ? "" : " · ~" + pa2Num(t.hpLoss) + " " + _t("PV"));
  return '<div class="pa2-panel pa2-trophy pa2-guardian">' + pa2Img(PA2_ICONS.boss) + '<div><div class="pa2-kicker">' + esc(_t("Au nord : {n}", { n: _td(pa2Dests(run).boss.name) })) + '</div>' +
    '<div class="pa2-small">' + esc(_t("En tenant, aujourd'hui : {c}.", { c: cost })) + ' ' + esc(_t("Les deux autres destinations ne demandent pas de combat.")) + '</div></div></div>';
}

/* Écho d'une accroche (PA2-4) : une ligne en tête de la feuille, sans rappel de la cause. */
function pa2EchoHTML(n, st) {
  if (!n || !st || (st.step !== "intro" && st.step !== "surprised")) return "";
  return (n.narr ? '<p class="pa2-echo">' + esc(_td(n.narr)) + '</p>' : "") + (n.echo ? '<p class="pa2-echo">' + esc(_td(n.echo)) + '</p>' : ""); // narr : texte d'étape d'un parcours
}

function pa2FoeInfo(run, n, pv) {
  var dests = pa2Dests(run), hook = pa2Hook(run);
  if (n.type === "boss") return { name: _td(dests.boss.name), line: _td(dests.boss.line), image: PA2_ICONS.boss, boss: true, pack: 1 };
  var db = (window.ENEMY_DB && ENEMY_DB[n.foeId]) || {};
  if (n.revenge && hook) return { name: _td(hook.revenge.name), line: _td(hook.revenge.line), image: db.image || PA2_ICONS.combat, boss: false, pack: 1 };
  return { name: _td(db.name || (pv && pv.charger ? pv.charger.foeName : "")), line: _td(PA2_FOE_LINES[n.foeId] || ""), image: db.image || PA2_ICONS.combat, boss: false, pack: Number(n.pack || 1) };
}
// Ce que la Clairière montre de la rencontre : chasseur sauvé ou non, sinon la branche choisie.
function pa2HookClairiere(run, hook) {
  if (hook.id === "chasseur") return run.flags.sauve ? hook.clairiere.saved : hook.clairiere.other;
  var b = Pa2Run.hookBranch(run);
  return (b && hook.clairiere[b]) || hook.clairiere.other;
}

function pa2FoeHead(foe, kicker, withLine) {
  return '<div class="pa2-foe' + (foe.boss ? ' is-boss' : '') + '"><div class="pa2-pic">' + pa2Img(foe.image, "pa2-foe-img", foe.name) + '</div><div><div class="pa2-kicker">' + esc(kicker) + '</div>' +
    '<h2 class="pa2-h2">' + esc(foe.name) + (foe.pack > 1 ? ' <span class="pa2-pack">×' + foe.pack + '</span>' : '') + '</h2>' +
    (withLine && foe.line ? '<p class="pa2-narr pa2-mt4">' + esc(foe.line) + '</p>' : '') + '</div></div>';
}
function pa2ApproachButton(id, est, loss, surprised) {
  var ap = PA2_APPROACHES[id];
  var verdict = est.unwinnable ? "mortel" : Pa2Run.verdictOf(loss);
  var name = surprised ? _t("Se défendre") : (id === "charger" ? _t("Charger", "combat") : _t("Tenir"));
  var sub = id === "charger" ? _t("Court et brutal. Plus de coups reçus, plus de butin.") : _t("Bouclier levé. Moins de coups, butin normal.");
  return '<button type="button" class="pa2-choice" onclick="pa2Fight(\'' + id + '\',' + (surprised ? 'true' : 'false') + ')">' + pa2Img(ap.icon) +
    '<span class="pa2-t">' + esc(name) + '</span><span class="pa2-cost is-red' + (verdict === "mortel" ? ' is-deadly' : '') + '">' + esc(PA2_VERDICT_WORD[verdict]) + (est.unwinnable ? '' : ' · ~' + pa2Num(loss) + ' ' + esc(_t("PV"))) + '</span>' +
    '<span class="pa2-s">' + esc(sub) + ' ' + esc(_t("Butin ~{n}.", { n: pa2Num(est.gold) })) + '</span></button>';
}
function pa2ContinueButton(run) {
  var ended = run.status === PA2_STATUS.done;
  return '<button type="button" class="kbtn primary" onclick="pa2CloseSheet()">' + esc(ended ? _t("Voir le bilan") : _t("Continuer")) + '</button>';
}

// Unité du butin d'un run : l'or, ou la ressource d'une quête de déblocage (bois, blé…).
function pa2LootRes(run) { var id = Pa2Run._parcoursResource(run); return id && window.WAREHOUSE_RESOURCES ? WAREHOUSE_RESOURCES[id] : null; }
function pa2Unit(run) { var r = pa2LootRes(run); return r ? _td(r.name) : _t("or"); }

function pa2ObstacleOutcome(run, n, r) {
  var h;
  if (r.kind === "ok") h = '<div class="pa2-verdict is-ok">' + esc(r.rope ? _t("La corde tient") : _t("Réussi")) + '</div><p class="pa2-result">+' + pa2Num(r.gain) + ' ' + esc(pa2Unit(run)) + '</p>';
  else if (r.kind === "mid") h = '<div class="pa2-verdict is-mid">' + esc(_t("De justesse")) + '</div><p class="pa2-result">' + esc(pa2LootRes(run) ? _t("Tu passes, épuisé. −{b} Souffle · +{g} {x}", { b: PA2_RULES.mistBreath, g: pa2Num(r.gain), x: pa2Unit(run) }) : _t("Tu passes, épuisé. −{b} Souffle · +{g} or", { b: PA2_RULES.mistBreath, g: pa2Num(r.gain) })) + '</p>';
  else h = '<div class="pa2-verdict is-ko">' + esc(_t("Raté")) + '</div><p class="pa2-result">' + esc(_t("Tu passes quand même, mais pas entier. −{d} PV · une blessure", { d: r.dmg })) + '</p>';
  if (n.type === "tertre") {
    var d = pa2Dests(run).tertre;
    h += '<p class="pa2-narr pa2-center">' + esc(_td(r.opened ? d.win : d.fail)) + '</p>';
    if (r.opened) h += '<p class="pa2-result">' + esc(_t("Le coffre : +{n} or", { n: pa2Num(r.chestGain) })) + (r.relic ? ' · ' + esc(_td(PA2_RELICS[r.relic].name)) : '') + '</p>';
  }
  return h + pa2ContinueButton(run);
}
function pa2RuseOutcome(run, r) {
  if (r.kind === "ko") {
    return '<div class="pa2-verdict is-ko">' + esc(_t("Repéré")) + '</div><p class="pa2-result">' + esc(_t("Il t'a vu venir. Il frappe le premier.")) + '</p>' +
      '<button type="button" class="kbtn" onclick="pa2Surprised()">' + esc(_t("Se battre")) + '</button>';
  }
  return '<div class="pa2-verdict is-' + r.kind + '">' + esc(r.kind === "ok" ? _t("Passé sans bruit") : _t("De justesse")) + '</div><p class="pa2-result">' +
    esc(r.kind === "ok" ? _t("Il ne t'a jamais vu. +{g} or", { g: pa2Num(r.gain) }) : _t("Tu as dû courir. −{b} Souffle · +{g} or", { b: PA2_RULES.ruseMidBreath, g: pa2Num(r.gain) })) + '</p>' + pa2ContinueButton(run);
}
function pa2FightOutcome(run, n, r) {
  if (r.ko) return '<div class="pa2-verdict is-ko">' + esc(_t("À terre")) + '</div><p class="pa2-result">' + esc(_t("Tu ne te relèves pas.")) + '</p>' + pa2ContinueButton(run);
  var h = '<div class="pa2-verdict is-ok">' + esc(n.type === "boss" ? _t("Le gardien s'effondre") : _t("Victoire")) + '</div><p class="pa2-result">+' + pa2Num(r.gain) + ' ' + esc(pa2Unit(run)) + '</p>';
  if (n.after) h += '<p class="pa2-echo">' + esc(_td(n.after)) + '</p>'; // parcours : la suite du combat
  if (n.type === "boss") h += '<p class="pa2-narr pa2-center">' + esc(_td(pa2Dests(run).boss.win)) + '</p>';
  if (r.drop) h += '<p class="pa2-result is-drop"><img class="ico-inline" src="images/Icons/dungeon/dungeon_guaranteed_loot.png" alt=""> ' + esc(_t("Objet trouvé : {x} ({r})", { x: _td(r.drop.name), r: r.drop.rarity })) + '</p>';
  return h + pa2ContinueButton(run);
}
function pa2RoundsHTML(st, count) {
  var h = "";
  for (var i = 0; i < count; i++) h += '<div class="pa2-round"><span>' + esc(st.lines[i]) + '</span><b>−' + st.res.parts[i] + ' ' + esc(_t("PV")) + '</b></div>';
  return h;
}

/* ---------- Effets ---------- */

function pa2Float(text, kind) {
  var el = document.createElement("div"), sh = document.querySelector("#pa2-overlay .pa2-sheet");
  el.className = "pa2-float is-" + kind;
  el.textContent = text;
  el.style.top = ((sh ? sh.getBoundingClientRect().top + 30 : window.innerHeight * 0.3) + Math.random() * 24) + "px";
  document.body.appendChild(el);
  setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1150);
}
function pa2Shake() {
  var s = document.querySelector("#pa2-overlay .pa2-sheet");
  if (!s) return;
  s.classList.remove("is-shake"); void s.offsetWidth; s.classList.add("is-shake");
}
function pa2Buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* vibration indisponible */ } }

// Dé qui roule, puis se pose sur la valeur déjà tirée par le moteur.
function pa2RollDie(finalVal, then) {
  var die = document.getElementById("pa2-die");
  if (!die) { then(); return; }
  die.classList.add("is-rolling");
  var t = setInterval(function () { die.innerHTML = pa2DieFace(1 + Math.floor(Math.random() * 6)); }, 70);
  pa2View.timers.push(t);
  pa2Later(function () { clearInterval(t); die.classList.remove("is-rolling"); die.innerHTML = pa2DieFace(finalVal); then(); }, 800);
}
// Fin d'animation : la feuille montre l'issue, le HUD reprend les vraies valeurs.
function pa2Reveal(run) {
  var st = pa2View.sheet;
  if (st) st.shown = true;
  var out = document.getElementById("pa2-outcome");
  if (out) out.classList.remove("is-hidden");
  var snap = pa2View.hud;
  pa2View.hud = null;
  if (snap) {
    var dl = Math.round(run.loot - snap.loot), dh = Math.round(game.heroHp - snap.hp), db = Math.round(run.breath - snap.breath);
    if (dl > 0) pa2Float("+" + dl + " " + pa2Unit(run), "gold");
    if (dh < 0) { pa2Float(dh + " " + _t("PV"), "hurt"); pa2Shake(); pa2Buzz([40, 30, 60]); }
    if (dh > 0) pa2Float("+" + dh + " " + _t("PV"), "heal");
    if (db > 0) pa2Float("+" + db + " " + _t("Souffle"), "breath");
    if (!snap.fiole && run.fioleUsed && typeof showToast === "function") showToast(_t("La fiole noire. Tu te relèves. Le butin pèse moins lourd."), 3000);
  }
  pa2RefreshHud();
}

/* ---------- Actions de nœud ---------- */

function pa2Fail(r) { if (r && !r.ok && typeof showToast === "function") showToast(r.reason, 1800); return !r || !r.ok; }

function pa2Obstacle(voie, rope) {
  var run = Pa2Run.getRun(), cost = 0;
  Pa2Run.obstacleOptions().forEach(function (o) { if (o.voie === voie && !rope) cost = o.cost; });
  pa2Snapshot(run);
  var r = Pa2Run.resolveObstacle(voie, !!rope);
  if (pa2Fail(r)) { pa2View.hud = null; return; }
  pa2View.sheet.step = "roll";
  pa2View.sheet.res = r.result;
  pa2View.hud.breath = Math.max(0, pa2View.hud.breath - cost); // le Souffle est payé avant le jet
  pa2RefreshHud();
  pa2RenderSheet();
  pa2RollDie(r.result.roll, function () {
    if (r.result.kind === "ok") pa2Buzz(30);
    pa2Reveal(Pa2Run.getRun() || run);
  });
}
function pa2Brute() {
  var run = Pa2Run.getRun();
  pa2Snapshot(run);
  var r = Pa2Run.bruteForce();
  if (pa2Fail(r)) { pa2View.hud = null; return; }
  pa2Reveal(Pa2Run.getRun() || run);
  pa2CloseSheet();
}

function pa2Fight(apId, surprised) {
  var run = Pa2Run.getRun();
  pa2Snapshot(run);
  var r = Pa2Run.fight(apId, !!surprised);
  if (pa2Fail(r)) { pa2View.hud = null; return; }
  var res = r.result, k = res.parts.length;
  var lines = surprised ? [_t("Il frappe le premier"), _t("Tu te reprends"), _t("Le dernier échange")]
    : (k === 2 ? [_t("Tu fonces dans le tas"), _t("Le coup qui décide")] : [_t("Premier échange"), _t("Il revient à la charge"), _t("Le coup final")]);
  var st = pa2View.sheet;
  st.step = "fight"; st.res = res; st.lines = lines;
  st.apName = surprised ? _t("Surpris") : (apId === "charger" ? _t("Charger", "combat") : _t("Tenir"));
  pa2RenderSheet();
  var i = 0;
  var tick = function () {
    var box = document.getElementById("pa2-rounds");
    if (!box || !pa2View.hud) return;
    box.insertAdjacentHTML("beforeend", '<div class="pa2-round"><span>' + esc(lines[i]) + '</span><b>−' + res.parts[i] + ' ' + esc(_t("PV")) + '</b></div>');
    pa2View.hud.hp = Math.max(0, pa2View.hud.hp - res.parts[i]);
    pa2Shake(); pa2Buzz(35); pa2RefreshHud();
    i++;
    if (i >= k || pa2View.hud.hp <= 0) {
      pa2View.hud.hp = Number(game.heroHp || 0); // le moteur a déjà tranché (Fiole comprise)
      pa2Reveal(Pa2Run.getRun() || run);
      return;
    }
    pa2Later(tick, 560);
  };
  pa2Later(tick, 420);
}
function pa2Surprised() { pa2View.sheet.step = "surprised"; pa2View.sheet.shown = false; pa2RenderSheet(); }

function pa2Ruse() {
  var run = Pa2Run.getRun();
  pa2Snapshot(run);
  var r = Pa2Run.ruse();
  if (pa2Fail(r)) { pa2View.hud = null; return; }
  pa2View.sheet.step = "ruse";
  pa2View.sheet.res = r.result;
  pa2RenderSheet();
  pa2RollDie(r.result.roll, function () { pa2Reveal(Pa2Run.getRun() || run); });
}
function pa2Flee() {
  var r = Pa2Run.flee();
  if (pa2Fail(r)) return;
  pa2Float("−" + PA2_RULES.fleeBreath + " " + _t("Souffle"), "breath");
  pa2CloseSheet();
}

// Actions sans animation : on applique, on montre l'effet, on referme.
function pa2Quick(fn, toast) {
  var run = Pa2Run.getRun();
  pa2Snapshot(run);
  var r = fn();
  if (pa2Fail(r)) { pa2View.hud = null; return null; }
  pa2Reveal(Pa2Run.getRun() || run);
  if (toast && typeof showToast === "function") showToast(toast, 2400);
  return r;
}
function pa2Drink() { if (pa2Quick(function () { return Pa2Run.drink(); })) pa2CloseSheet(); }
function pa2Altar(accept) { if (pa2Quick(function () { return Pa2Run.altar(accept); })) pa2CloseSheet(); }

function pa2Flip() {
  var st = pa2View.sheet;
  if (!st || st.flipped) return;
  st.flipped = true;
  pa2Buzz(20);
  Array.prototype.forEach.call(document.querySelectorAll("#pa2-overlay .pa2-card"), function (c) { c.classList.add("is-flipped"); });
  pa2Later(pa2RenderSheet, 720);
}
function pa2PickRelic(id) { pa2View.sheet.picked = id; pa2RenderSheet(); }
function pa2TakeRelic() {
  var run = Pa2Run.getRun(), st = pa2View.sheet, n = Pa2Run.node(st.key, run), draw = n.draw || [];
  var id = draw.length > 1 ? st.picked : draw[0];
  if (!id) return;
  var r = Pa2Run.takeRelic(id);
  if (pa2Fail(r)) return;
  var msg = _t("{n} rejoint tes trouvailles.", { n: _td(PA2_RELICS[id].name) });
  if (r.result.rare) msg += " " + _t("Et, au fond : {r} +{n}.", { r: pa2RareName(run.worldId), n: r.result.rare });
  if (typeof showToast === "function") showToast(msg, 2800);
  pa2CloseSheet();
}

function pa2Event(branch) {
  var run = Pa2Run.getRun();
  pa2Snapshot(run);
  var r = Pa2Run.eventChoice(branch);
  if (pa2Fail(r)) { pa2View.hud = null; return; }
  pa2Reveal(Pa2Run.getRun() || run);
  pa2View.sheet.step = "done";
  pa2View.sheet.res = r.result;
  pa2RenderSheet();
}

function pa2Place(action) {
  var run = Pa2Run.getRun(), camp = Pa2Run.node(run.at, run).type === "camp";
  var r = pa2Quick(function () { return Pa2Run.placeAction(action); });
  if (!r) return;
  var msgs = [];
  if (r.result.gift) msgs.push(_t("{n} rejoint tes trouvailles.", { n: _td(PA2_RELICS[r.result.gift].name) }));
  if (action === "listen") msgs.push(camp ? _t("Acte II révélé.") : _t("Acte III révélé."));
  if (msgs.length && typeof showToast === "function") showToast(msgs.join(" "), 2800);
  pa2CloseSheet();
}
function pa2Clairiere() { if (pa2Quick(function () { return Pa2Run.clairiere(); })) pa2CloseSheet(); }

/* ---------- Bilan ---------- */

function buildPa2EndHTML(run) {
  if (run.parcours) return buildPa2ParcoursEndHTML(run);
  var e = run.end || {}, dests = pa2Dests(run), n = Pa2Run.node(run.at, run) || {};
  var title, text, icon = null;
  if (e.how === "ko") {
    title = _t("On te ramène");
    text = Pa2Run.hasPact("retour", run) ? _t("Le silence, d'un coup. Puis des voix, des mains. Tout ce que tu portais reste dans la forêt.") : _t("Le silence, d'un coup. Puis des voix, des mains. La moitié de ce que tu portais reste dans la forêt.");
  } else if (e.how === "home") {
    title = _t("Retour au feu");
    text = _t("Tu as choisi de rentrer avant la nuit profonde. La forêt garde ses secrets. Tu gardes ton butin.");
  } else if (e.how === "abandon") {
    title = _t("Tu fais demi-tour");
    text = _t("Tu rentres sans finir. Une part du butin reste en route.");
  } else if (e.dest === "boss") {
    icon = PA2_ICONS.boss; title = _t("{n} est tombé", { n: _td(dests.boss.name) }); text = _td(dests.boss.win);
  } else if (e.dest === "clairiere") {
    icon = PA2_ICONS.clairiere; title = _td(dests.clairiere.name); text = _td(dests.clairiere.win);
  } else {
    icon = PA2_ICONS.tertre;
    var opened = !!run.flags.tertreOpened;
    title = opened ? _td(dests.tertre.name) : _t("Le Tertre reste scellé");
    text = _td(opened ? dests.tertre.win : dests.tertre.fail);
  }
  var sum = e.summary || {}, kept = sum.kept ? Number(sum.kept.gold || 0) : 0, lost = sum.lost ? Number(sum.lost.gold || 0) : 0;
  var h = pa2PageOpen(_t("Retour de l'aventure")) + '<div class="pa2-col">';
  h += '<div class="pa2-panel pa2-center">' + (icon ? '<div class="pa2-medal is-dest is-huge">' + pa2Img(icon) + '</div>' : '') +
    '<div class="pa2-kicker">' + esc(e.how === "dest" ? _t("Fin de l'aventure") : (e.how === "ko" ? _t("Évacuation") : _t("Retour anticipé"))) + '</div>' +
    '<h1 class="pa2-h1">' + esc(title) + '</h1><p class="pa2-narr pa2-dim">' + esc(text) + '</p></div>';

  h += '<div class="pa2-panel pa2-tally">';
  h += '<span>' + esc(_t("Butin ramassé")) + '</span><span>' + pa2Num(run.loot) + ' ' + esc(_t("or")) + '</span>';
  if (run.pacts.length) h += '<span>' + esc(_t("Pactes")) + '</span><span>' + pa2Mult(Pa2Run.pactMult(run)) + '</span>';
  if (Pa2Run.hasItem("carte", run)) h += '<span>' + esc(pa2ItemName("carte")) + '</span><span>−' + pa2Pct(1 - PA2_RULES.carteLoot) + '</span>';
  if (run.fioleUsed) h += '<span>' + esc(pa2ItemName("fiole")) + '</span><span>÷2</span>';
  if (lost > 0) h += '<span>' + esc(_t("Perdu en route")) + '</span><span class="pa2-con">−' + pa2Num(lost) + ' ' + esc(_t("or")) + '</span>';
  h += '<span class="pa2-sep">' + esc(_t("Butin rapporté")) + '</span><span class="pa2-sep pa2-tot">' + pa2Num(kept) + ' ' + esc(_t("or")) + '</span>';
  if (run.rareFound > 0) h += '<span>' + esc(pa2RareName(run.worldId)) + '</span><span>+' + run.rareFound + '</span>';
  var drop = run.lastResult && run.lastResult.drop;
  if (drop) h += '<span>' + esc(_t("Objet")) + '</span><span>' + esc(_td(drop.name)) + '</span>';
  h += '</div>';

  if (run.relics.length) {
    h += '<div class="pa2-panel"><div class="pa2-kicker">' + esc(_t("Trouvailles de ce run, perdues au retour")) + '</div><div class="pa2-relics">' + run.relics.map(function (id) {
      var r = PA2_RELICS[id];
      return '<span class="pa2-chip is-relic is-wide is-' + r.rar + '">' + pa2Img(r.icon) + esc(_td(r.name)) + '</span>';
    }).join("") + '</div></div>';
  }
  if (e.chest) {
    var it = PA2_ITEMS[e.chest.item];
    h += '<div class="pa2-panel pa2-trophy">' + pa2Img(it.icon) + '<div><div class="pa2-kicker">' + esc(e.chest.isNew ? _t("Nouveau dans le coffre d'expédition") : _t("Déjà dans ton coffre")) + '</div>' +
      '<h3 class="pa2-h3">' + esc(pa2ItemName(e.chest.item)) + '</h3><div class="pa2-dim pa2-small">' + esc(_td(it.pro)) + ' ' + esc(_t("Disponible dans ta besace dès le prochain départ.")) + '</div></div></div>';
  }
  var rep = run.livingMapReport;
  if (rep && rep.message) h += '<div class="scene-map-report' + (rep.regressed ? ' is-loss' : '') + '">' + esc(rep.message) + '</div>';
  h += '<button type="button" class="kbtn primary" onclick="pa2Leave()">' + esc(run.livingMap ? _t("Retour à la carte") : _t("Retour au Campement")) + '</button>';
  h += '</div></div>';
  return h;
}

// Bilan d'un parcours (quête de déblocage, étape d'Histoire) : arrivée ou évacuation, butin rapporté.
function buildPa2ParcoursEndHTML(run) {
  var e = run.end || {}, t = SceneEngine.getTemplate(run.templateId) || {}, sum = e.summary || {};
  var ok = e.how === "parcours";
  var text = ok ? _t("Tu es au bout du chemin. Ce qui bloquait ne bloque plus.")
    : (e.how === "ko" ? _t("Le silence, d'un coup. Puis des voix, des mains. La moitié de ce que tu portais reste en route.") : _t("Tu rentres sans finir. Une part du butin reste en route."));
  var h = pa2PageOpen(_t("Retour du parcours")) + '<div class="pa2-col">';
  h += '<div class="pa2-panel pa2-center"><div class="pa2-kicker">' + esc(ok ? _t("Parcours terminé") : (e.how === "ko" ? _t("Évacuation") : _t("Retour anticipé"))) + '</div>' +
    '<h1 class="pa2-h1">' + esc(_td(t.title || "")) + '</h1><p class="pa2-narr pa2-dim">' + esc(text) + '</p></div>';
  var kept = sum.kept && window.SortieManager ? SortieManager.getLootSummary(sum.kept) : "";
  var L = sum.lost || {}, hasLost = Number(L.gold || 0) > 0 || Object.keys(L.resources || {}).some(function (k) { return Number(L.resources[k]) > 0; });
  var lost = hasLost && window.SortieManager ? SortieManager.getLootSummary(L) : "";
  h += '<div class="pa2-panel pa2-tally"><span class="pa2-sep">' + esc(_t("Butin rapporté")) + '</span><span class="pa2-sep pa2-tot">' + esc(kept || "—") + '</span>';
  if (lost) h += '<span>' + esc(_t("Perdu en route")) + '</span><span class="pa2-con">' + esc(lost) + '</span>';
  h += '</div>';
  var rep = run.livingMapReport;
  if (rep && rep.message) h += '<div class="scene-map-report' + (rep.regressed ? ' is-loss' : '') + '">' + esc(rep.message) + '</div>';
  h += '<button type="button" class="kbtn primary" onclick="pa2Leave()">' + esc(run.livingMap ? _t("Retour à la carte") : _t("Retour au Campement")) + '</button>';
  h += '</div></div>';
  return h;
}

function pa2Leave() {
  pa2ClearChrome();
  pa2View.runId = null;
  if (typeof leaveSceneScreen === "function") leaveSceneScreen();
}

/* Fonctions appelées par les onclick des écrans. */
window.pa2PrepStep = pa2PrepStep;
window.pa2OpenPicker = pa2OpenPicker;
window.pa2OpenItem = pa2OpenItem;
window.pa2ClosePicker = pa2ClosePicker;
window.pa2AddItem = pa2AddItem;
window.pa2RemoveItem = pa2RemoveItem;
window.pa2TogglePact = pa2TogglePact;
window.pa2Depart = pa2Depart;
window.pa2CancelPrep = pa2CancelPrep;
window.pa2Move = pa2Move;
window.pa2Use = pa2Use;
window.pa2RelicInfo = pa2RelicInfo;
window.pa2AskAbandon = pa2AskAbandon;
window.pa2ToggleLegend = pa2ToggleLegend;
window.pa2Obstacle = pa2Obstacle;
window.pa2Brute = pa2Brute;
window.pa2Fight = pa2Fight;
window.pa2Surprised = pa2Surprised;
window.pa2Ruse = pa2Ruse;
window.pa2Flee = pa2Flee;
window.pa2Drink = pa2Drink;
window.pa2Altar = pa2Altar;
window.pa2Flip = pa2Flip;
window.pa2PickRelic = pa2PickRelic;
window.pa2TakeRelic = pa2TakeRelic;
window.pa2Event = pa2Event;
window.pa2Place = pa2Place;
window.pa2Clairiere = pa2Clairiere;
window.pa2Leave = pa2Leave;
window.pa2View = pa2View;
