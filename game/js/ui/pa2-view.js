"use strict";
/* ui/pa2-view.js — v3.382.0 (Petites Aventures v2, lot PA2-1) : les écrans du mode v2.
   Portage de l'atelier validé par Seb (habillage « Nuit », 29/09/2026) sur le moteur réel
   (systems/pa2-run.js). Le moteur applique chaque résultat tout de suite et le sauvegarde ;
   cette vue ne fait que le METTRE EN SCÈNE (dé, échanges de combat, cartes retournées).
   Trois écrans dans l'onglet "scene" (routés par buildSceneScreenHTML) :
     - préparation (pa2-prep) : « Prêt à partir », besace et pactes sur un écran (v3.723.0) ;
     - carte (pa2-map / pa2-node) : HUD, carte de nuit, feuille d'action du nœud ;
     - bilan (completed) : destination, butin, coffre d'expédition.
   La feuille d'action et la légende vivent dans #pa2-overlay (enfant de body) : un
   renderPanel() venu d'ailleurs (fin de production…) ne coupe pas une animation en cours. */

/* ---------- État de la vue (volatil, jamais sauvegardé) ---------- */

var pa2View = {
  runId: null,
  picker: null,         // { mode: "add" } : feuille d'ajout ouverte (v3.723.0 : plus d'étape Pactes ni de fiche d'objet)
  detail: null,         // v3.723.0 : objet dont la feuille montre le détail
  notice: null,         // v3.723.0 : { txt, undo } message dans la besace (retrait, besace reprise)
  helpRun: null,        // v3.723.0 : run de la première préparation (rappels du tutoriel affichés)
  folds: {},            // v3.723.0 : plis ouverts de « Prêt à partir » (accroche, trophées)
  sheet: null,          // { key, step, res, ... } : feuille ouverte
  hud: null,            // valeurs affichées pendant une animation (le moteur a déjà tout appliqué)
  fromKey: null,        // nœud quitté : le repère du héros glisse depuis lui
  fromMid: false,       // v3.467.0 : il repart du milieu d'un sentier piégé
  keepScroll: null,
  cam: { w: 0, tx: 0, ty: 0, key: null }, // v3.394.0 : vue de la carte plein écran (key = run + carte)
  legend: false,
  timers: []
};

var PA2_ICONS = {
  obstacle: "images/Icons/scene/node_obstacle.webp",
  combat: "images/Icons/scene/node_encounter.webp",
  source: "images/Icons/scene/node_clear_spring.webp",
  autel: "images/Icons/scene/node_forgotten_altar.webp",
  trouvaille: "images/Icons/scene/node_discovery.webp",
  evenement: "images/Icons/scene/node_event.webp",
  unknown: "images/Icons/scene/node_unknown.webp",
  camp: "images/Icons/camp/campfire.webp",
  seuil: "images/Icons/scene/node_threshold.webp",
  depart: "images/Icons/menu_icons/village_menu.webp",
  boss: "images/Icons/scene/dest/dest_cerf_racine.webp",
  clairiere: "images/Icons/scene/dest/dest_clairiere.webp",
  tertre: "images/Icons/scene/dest/dest_tertre.webp",
  power: "images/Icons/improvement_icons/power.webp", // v3.527.0 (IMA-5) : les icônes de stat de la fiche du héros
  precision: "images/Icons/improvement_icons/accuracy.webp",
  endurance: "images/Icons/improvement_icons/endurance.webp",
  ruse: "images/Icons/scene/ways/fight_trick.webp",
  flee: "images/Icons/quests/flee.webp",
  hp: "images/Icons/combat_stats/stat_health.webp",
  gold: "images/Icons/dungeon/dungeon_gold.webp",
  bag: "images/Icons/scene/pa2_besace.webp",
  chest: "images/Icons/dungeon/dungeon_guaranteed_loot.webp",
  wound: "images/Icons/scene/ui/ui_wound.webp",
  hero: "images/Icons/scene/ui/ui_hero_marker.webp",
  title: "images/Icons/scene/path_easy.webp",
  veine: "images/Icons/scene/node_vein.webp", // v3.489.0 (Montagne)
  // v3.724.0 (Seb 06/11) : mini-quêtes de parcours ; images à faire, l'icône générique les remplace en attendant
  cache: "images/Icons/scene/quest/quest_cache.webp", lock: "images/Icons/scene/quest/quest_lock.webp",
  hint: "images/Icons/scene/quest/quest_hint.webp", secret: "images/Icons/scene/quest/quest_secret.webp",
  cachee: "images/Icons/scene/dest/dest_forest_cachee.webp"
};
/* v3.724.0 (atelier aventure-parcours, choix de Seb) : marques dessinées sur la carte — coffre (A), clé, cadenas (A), « ? » (A). */
var PA2_QMARK = {
  chest: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="rgba(20,14,6,.85)" stroke="#f0c64a" stroke-width="2"/><rect x="9" y="17" width="22" height="13" rx="2" fill="#8a5c14" stroke="#ffe08a" stroke-width="1.5"/><path d="M9 18 Q20 7 31 18" fill="#b07a3c" stroke="#ffe08a" stroke-width="1.5"/><rect x="18" y="19" width="4" height="5" fill="#ffe08a"/></svg>',
  key: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="rgba(20,14,6,.85)" stroke="#f0c64a" stroke-width="2"/><circle cx="14" cy="16" r="5" fill="none" stroke="#ffe08a" stroke-width="3"/><path d="M18 19 L30 30 M25 25 L28 22 M28 28 L31 25" stroke="#ffe08a" stroke-width="3" stroke-linecap="round"/></svg>',
  lock: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="rgba(40,10,6,.9)" stroke="#e0806a" stroke-width="2"/><path d="M14 18 V14 a6 6 0 0 1 12 0 V18" fill="none" stroke="#ffd0c0" stroke-width="3"/><rect x="11" y="18" width="18" height="13" rx="2" fill="#e0806a"/><circle cx="20" cy="24" r="2" fill="#2a0a06"/></svg>',
  hint: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="rgba(10,20,30,.9)" stroke="#a9dcff" stroke-width="2"/><text x="20" y="27" text-anchor="middle" font-size="21" font-weight="800" fill="#dff1ff" font-family="Georgia,serif">?</text></svg>'
};
/* v3.492.3 (décision Seb du 24/10, images livrées le 26/10) : icônes propres à chaque monde. Un monde sans entrée
   prend la Forêt. Le Désert et la Montagne (v3.492.10, ses trois fins) gardent les autres icônes communes. */
var PA2_ICONS_BY_WORLD = {
  forest: { evenement: "images/Icons/scene/forest/node_event.webp" },
  desert: {
    obstacle: "images/Icons/scene/desert/node_obstacle.webp", source: "images/Icons/scene/desert/node_spring.webp",
    autel: "images/Icons/scene/desert/node_altar.webp", camp: "images/Icons/scene/desert/node_camp.webp", seuil: "images/Icons/scene/desert/node_threshold.webp",
    boss: "images/Icons/scene/dest/dest_desert_boss.webp", clairiere: "images/Icons/scene/dest/dest_desert_clairiere.webp", tertre: "images/Icons/scene/dest/dest_desert_tertre.webp",
    cachee: "images/Icons/scene/dest/dest_desert_cachee.webp" // v3.725.0 : la tour de guet (fin cachée), image à faire
  },
  ruins: {
    evenement: "images/Icons/scene/ruins/node_event.webp", obstacle: "images/Icons/scene/ruins/node_obstacle.webp", source: "images/Icons/scene/ruins/node_spring.webp",
    autel: "images/Icons/scene/ruins/node_altar.webp", camp: "images/Icons/scene/ruins/node_camp.webp", seuil: "images/Icons/scene/ruins/node_threshold.webp",
    boss: "images/Icons/scene/dest/dest_ruins_boss.webp", clairiere: "images/Icons/scene/dest/dest_ruins_clairiere.webp", tertre: "images/Icons/scene/dest/dest_ruins_tertre.webp"
  },
  crypt: {
    evenement: "images/Icons/scene/crypt/node_event.webp", obstacle: "images/Icons/scene/crypt/node_obstacle.webp", source: "images/Icons/scene/crypt/node_spring.webp",
    autel: "images/Icons/scene/crypt/node_altar.webp", camp: "images/Icons/scene/crypt/node_camp.webp", seuil: "images/Icons/scene/crypt/node_threshold.webp",
    boss: "images/Icons/scene/dest/dest_crypt_boss.webp", clairiere: "images/Icons/scene/dest/dest_crypt_clairiere.webp", tertre: "images/Icons/scene/dest/dest_crypt_tertre.webp",
    cachee: "images/Icons/scene/dest/dest_crypt_cachee.webp" // v3.726.0 : la niche aux lampes (fin cachée), image à faire
  },
  mountain: { // v3.492.10 : ses trois fins ; les autres points gardent les icônes communes
    boss: "images/Icons/scene/dest/dest_mountain_boss.webp", clairiere: "images/Icons/scene/dest/dest_mountain_clairiere.webp", tertre: "images/Icons/scene/dest/dest_mountain_tertre.webp"
  },
  tower: { // v3.727.0 (Seb 06/11) : ses propres fins (prenait celles de la Forêt) ; images à faire, icône générique en attendant
    boss: "images/Icons/scene/dest/dest_tower_boss.webp", clairiere: "images/Icons/scene/dest/dest_tower_clairiere.webp", tertre: "images/Icons/scene/dest/dest_tower_tertre.webp",
    cachee: "images/Icons/scene/dest/dest_tower_cachee.webp"
  }
};
/* Icône d'un point ou d'une destination, au monde du run. */
function pa2Ico(key, run) {
  var w = run && run.worldId, o = PA2_ICONS_BY_WORLD[w] || PA2_ICONS_BY_WORLD.forest;
  return o[key] || PA2_ICONS[key];
}

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
function pa2Pct(v) { return fmtPct(Math.round(v * 100)); }
function pa2Num(v) { return String(Math.round(Number(v || 0))); }
function pa2Mult(v) { return "×" + fmtDec(Number(v).toFixed(2)); } // CPL3-1 : décimale selon la langue

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
/* v3.429.16 : textes du lieu, par monde. Ils disaient « la forêt » au Désert et aux Ruines.
   Littéraux _t() pour l'audit i18n ; la Forêt garde ses textes d'origine. */
function pa2Words(run) {
  var w = run && run.worldId;
  if (w === "desert") return {
    enter: _t("Entrer dans le désert"), listen: _t("Écouter le désert"), home: _t("Tu as choisi de rentrer avant la nuit profonde. Le désert garde ses secrets. Tu gardes ton butin."),
    koHalf: _t("Le silence, d'un coup. Puis des voix, des mains. La moitié de ce que tu portais reste dans le sable."),
    koAll: _t("Le silence, d'un coup. Puis des voix, des mains. Tout ce que tu portais reste dans le sable."),
    take: _t("Fouiller les tentes"), takeIcon: null };
  if (w === "crypt") return { // v3.454.0
    enter: _t("Descendre dans le noir"), listen: _t("Écouter la Crypte"), home: _t("Tu as choisi de remonter avant que la mèche ne s'éteigne. La Crypte garde ses dormeurs. Tu gardes ton butin."),
    koHalf: _t("Le silence, d'un coup. Puis des voix, des mains. La moitié de ce que tu portais reste dans le noir."),
    koAll: _t("Le silence, d'un coup. Puis des voix, des mains. Tout ce que tu portais reste dans le noir."),
    take: _t("S'approcher de l'autel"), takeIcon: null };
  if (w === "ruins") return {
    enter: _t("Entrer dans les ruines"), listen: _t("Écouter les ruines"), home: _t("Tu as choisi de rentrer avant la nuit profonde. Les ruines gardent leurs secrets. Tu gardes ton butin."),
    koHalf: _t("Le silence, d'un coup. Puis des voix, des mains. La moitié de ce que tu portais reste dans les ruines."),
    koAll: _t("Le silence, d'un coup. Puis des voix, des mains. Tout ce que tu portais reste dans les ruines."),
    take: _t("S'approcher du puits"), takeIcon: null };
  return {
    enter: _t("Entrer dans la forêt"), listen: _t("Écouter la forêt"), home: _t("Tu as choisi de rentrer avant la nuit profonde. La forêt garde ses secrets. Tu gardes ton butin."),
    koHalf: _t("Le silence, d'un coup. Puis des voix, des mains. La moitié de ce que tu portais reste dans la forêt."),
    koAll: _t("Le silence, d'un coup. Puis des voix, des mains. Tout ce que tu portais reste dans la forêt."),
    take: _t("Prendre la lanterne qui t'attend"), takeIcon: PA2_ITEMS.veilleurs.icon };
}
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
  pa2View.picker = null;
  pa2View.detail = null;
  pa2View.notice = null;
  pa2View.folds = {};
  pa2View.helpRun = (game.genericTutorialsSeen || {}).pa2_prep ? null : run.id; // v3.723.0 : tutoriel pas encore vu
  pa2View.sheet = null;
  pa2View.hud = null;
  pa2View.fromKey = null;
  pa2View.fromMid = false;
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
  var onMap = onScene && (run.status === PA2_STATUS.map || run.status === PA2_STATUS.node || run.status === PA2_STATUS.trap || run.status === PA2_STATUS.lock || (run.status === PA2_STATUS.done && !!pa2View.sheet));
  body.classList.toggle("pa2-night", onMap);
  body.classList.toggle("pa2-full", onMap && !!document.getElementById("pa2-vp")); // v3.394.0 : carte plein écran
  if (!onScene) { pa2RemoveOverlay(); return; }
  pa2EnsureOverlay();
  if ((run.status === PA2_STATUS.node || run.status === PA2_STATUS.trap || run.status === PA2_STATUS.lock) && !pa2View.sheet && !pa2View.fromKey) pa2View.legend = false; // audit NOV-13 : une fiche qui s'ouvre referme la légende
  pa2RenderLegend();
  if (run.status === PA2_STATUS.node && !pa2View.sheet && !pa2View.fromKey) pa2OpenSheet();
  if (run.status === PA2_STATUS.trap && !pa2View.sheet && !pa2View.fromKey) pa2OpenTrapSheet();
  if (run.status === PA2_STATUS.lock && !pa2View.sheet && !pa2View.fromKey) pa2OpenLockSheet(); // v3.724.0
  if (pa2AnnounceDue(run) && !pa2View.sheet && !pa2View.fromKey) pa2OpenAnnounce();
  if (run.status === PA2_STATUS.prep) pa2RenderPicker();
  else if (!pa2View.sheet) pa2SetSheetHTML(null);
  // v3.469.2 (PA-T1) : la nuit du run, les pièges et sentiers coupés s'expliquent au premier contact
  if (typeof maybeShowGenericTutorial === "function") maybeShowGenericTutorial("scene");
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

/* ---------- Préparation : « Prêt à partir » ---------- */
/* v3.723.0 (Seb 06/11, atelier aventure-parcours, variante B « Récap et feuille ») : une seule étape.
   La besace se lit en récapitulatif ; la feuille d'ajout reste ouverte ; pactes en bascules ; départ collé en bas. */

function pa2PageOpen(title) {
  return '<div class="nb-page-frame kframe-page pa2-page" data-kf-title="' + esc(PA2_ICONS.title + "|" + title) + '">';
}

// v3.723.0 (PB-D, PB-E) : objet de ce monde que le joueur a (coffre gagné, Entrepôt non vide ou déjà dans la besace).
function pa2ItemOwned(id, run) {
  var it = PA2_ITEMS[id];
  if (!it || !Pa2Run.itemInWorld(id, run) || !Pa2Run.isUnlocked(id)) return false;
  if (!it.resource || !window.WarehouseManager) return true;
  return WarehouseManager.getAmount(it.resource) > 0 || run.bag.indexOf(id) >= 0;
}
// Liste de la feuille (PB-B) : l'objet de la nuit en tête, puis l'ordre des données (vivres, matériel, coffre).
function pa2PickList(run) {
  var night = Pa2Run.nightItem(run), list = PA2_ITEM_ORDER.slice(), i = night ? list.indexOf(night) : -1;
  if (i > 0) { list.splice(i, 1); list.unshift(night); }
  return list.filter(function (id) { return pa2ItemOwned(id, run); });
}
function pa2Pips(n) {
  var h = '<span class="pa2-size" role="img" aria-label="' + esc(_tn(n, "{n} place", "{n} places", { n: n })) + '">';
  for (var k = 0; k < n; k++) h += "<i></i>";
  return h + "</span>";
}
function pa2UsesText(id, n, night) {
  var w = (id === "gourde" || id === "outre") ? _tn(n, "{n} gorgée", "{n} gorgées", { n: n })
    : (id === "trousse" ? _tn(n, "{n} crochet", "{n} crochets", { n: n }) : _tn(n, "{n} usage", "{n} usages", { n: n }));
  return night ? _t("{u} (dont 1 de la nuit)", { u: w }) : w;
}
function pa2CountIn(run, id) { return run.bag.filter(function (x) { return x === id; }).length; }

// Récapitulatif de la besace (PB-C) : un rang par objet, usages réels (Pa2Run.bagStock), soins, Entrepôt.
function pa2RecapHTML(run) {
  var night = Pa2Run.nightItem(run), stock = Pa2Run.bagStock(run), max = Number(game.heroMaxHp || 1);
  var seen = {}, rows = "", heal = 0, wounds = 0, taken = [];
  var owner = {}; // la clé d'usages (corde, corde tressée…) est portée par l'objet de base s'il est là
  run.bag.forEach(function (id) { var k = PA2_ITEMS[id].as || id; if (!owner[k] || id === k) owner[k] = id; });
  run.bag.forEach(function (id) {
    if (seen[id]) return; seen[id] = 1;
    var it = PA2_ITEMS[id], n = pa2CountIn(run, id), k = it.as || id, isNight = night === k, det;
    if (it.healPct) {
      heal += it.healPct * n; wounds += it.healsWound ? n : 0;
      var pv = { p: pa2Num(it.healPct * max) };
      det = n > 1 ? (it.healsWound ? _t("Chacune rend {p} PV et efface une blessure", pv) : _t("Chacune rend {p} PV", pv))
        : (it.healsWound ? _t("Rend {p} PV et efface une blessure", pv) : _t("Rend {p} PV", pv));
    } else if (it.uses) {
      var u = it.uses * n;
      if (owner[k] === id) { u = Number(stock[k] || 0); run.bag.forEach(function (x) { if (x !== id && (PA2_ITEMS[x].as || x) === k) u -= PA2_ITEMS[x].uses; }); }
      det = pa2UsesText(k, u, isNight && owner[k] === id);
    } else det = isNight ? pa2NightBonus(k) : _td(it.pro);
    if (it.resource) taken.push(pa2ItemName(id) + " ×" + n);
    rows += '<div class="pa2-irow is-in' + (isNight ? ' is-night' : '') + '">' + pa2Img(it.icon, "pa2-irow-ic") +
      '<div class="pa2-irow-t"><b>' + esc((n > 1 ? n + " × " : "") + pa2ItemName(id)) + (isNight ? ' <span class="pa2-night-tag">★</span>' : '') + ' ' + pa2Pips(it.size * n) + '</b>' +
      '<span class="pa2-irow-s">' + esc(det) + '</span></div>' +
      '<span class="pa2-step"><button type="button" class="pa2-stepbtn" onclick="pa2RemoveOne(\'' + id + '\')" aria-label="' + esc(_t("Retirer : {n}", { n: pa2ItemName(id) })) + '">−</button></span></div>';
  });
  if (!run.bag.length) rows = '<p class="pa2-recap-empty">' + esc(_t("Besace vide. Tu peux partir ainsi.")) + '</p>';
  var h = '<div class="pa2-recap">' + rows;
  if (run.bag.length) {
    h += '<div class="pa2-recap-r is-tot"><span>' + esc(_t("Soins emportés")) + '</span><span>' + esc(heal
      ? _t("{p} des PV ({v} PV)", { p: pa2Pct(heal), v: pa2Num(heal * max) }) + (wounds ? ", " + _tn(wounds, "{n} blessure", "{n} blessures", { n: wounds }) : "")
      : _t("aucun")) + '</span></div>';
    if (taken.length) h += '<div class="pa2-recap-r"><span>' + esc(_t("Pris à l'Entrepôt")) + '</span><span>' + esc(taken.join(", ") + " " + _t("(rendu s'il ne sert pas)")) + '</span></div>';
  }
  if (night && !Pa2Run.hasItem(night, run)) h += '<p class="pa2-warn">' + esc(_t("★ {x}, l'objet de la nuit, n'est pas dans la besace.", { x: pa2ItemName(night) })) + '</p>';
  return h + '</div>';
}

function pa2PactsHTML(run) {
  var h = '<div class="pa2-panel"><div class="pa2-kicker">' + esc(_t("Pactes")) + '</div><div class="pa2-list">';
  PA2_PACT_ORDER.forEach(function (id) {
    var p = PA2_PACTS[id], on = Pa2Run.hasPact(id, run);
    h += '<button type="button" class="pa2-pact" aria-pressed="' + on + '" onclick="pa2TogglePact(\'' + id + '\')">' + pa2Img(p.icon) +
      '<span><span class="pa2-nm">' + esc(_td(p.name)) + '</span><span class="pa2-ds">' + esc(_td(p.desc)) + '</span></span>' +
      '<span class="pa2-pact-r"><span class="pa2-bonus">+' + Math.round(p.bonus * 100) + ' %</span><span class="pa2-sw" aria-hidden="true"></span></span></button>';
  });
  return h + '</div></div>';
}

// Bouton de départ : le butin final réellement appliqué au bilan (Pa2Run.departLootMult), facteur par facteur.
function pa2FootHTML(run) {
  if (run.parcours) {
    var tpl = SceneEngine.getTemplate(run.templateId) || {};
    return '<div class="pa2-foot"><button type="button" class="kbtn primary pa2-go" onclick="pa2Depart()">' + esc(tpl.departLabel ? _td(tpl.departLabel) : _t("Partir")) + '</button></div>';
  }
  var parts = [], m = Pa2Run.departLootMult(run, parts), cond = Pa2Run.condition(run);
  var names = { ring: PA2_RING_WORD[run.ring], pacts: _t("pactes"), cond: cond ? _td(cond.kicker) : "", carte: pa2ItemName("carte"), rumor: _t("rumeur"), dune: "" };
  var calc = parts.map(function (p) { return names[p.k] + " " + pa2Mult(p.m); }).join(" · ");
  if (Pa2Run.hasItem("fiole", run)) calc += " · " + _t("Fiole : ÷ 2 si elle sert");
  return '<div class="pa2-foot"><div class="pa2-calc">' + esc(calc) + '</div>' +
    '<button type="button" class="kbtn primary pa2-go" onclick="pa2Depart()"><span>' + esc(pa2Words(run).enter) + '</span><b>' + pa2Mult(m) + '</b></button></div>';
}

function buildPa2PrepHTML(run) {
  var hook = pa2Hook(run), hero = pa2Hero(), ringId = run.ring;
  var tpl = SceneEngine.getTemplate(run.templateId) || {}, par = !!run.parcours, size = Pa2Run.bagSize(run), used = Pa2Run.bagUsed(run);
  var cond = par ? null : Pa2Run.condition(run); // v3.469.0 : la nuit du run remplace « de nuit »
  var h = pa2PageOpen(par ? _td(tpl.title || "") : _t("Prêt à partir")) + '<div class="pa2-col pa2-prep">';

  if (!par) { // accroche repliée en une ligne (PB-A) : monde · nuit · anneau, puis le titre
    var kick = (cond ? pa2WorldName(run.worldId) + " · " + _td(cond.kicker) : _t("{w} · de nuit", { w: pa2WorldName(run.worldId) })) + (ringId !== "sentier" ? " · " + PA2_RING_WORD[ringId] : "");
    var body = (hook ? '<p class="pa2-narr">' + esc(_td(hook.lede)) + '</p>' : '') +
      (ringId !== "sentier" ? '<p class="pa2-ring">' + esc(_t("{r} : ennemis et obstacles plus durs, butin ×{m}.", { r: PA2_RING_WORD[ringId], m: fmtDec(Pa2Run.ring(run).lootMult) })) + '</p>' : '');
    var qt = hook && hook.quest && hook.quest.kind === "end" && Pa2Run.questDef(run) ? hook.quest.text : null; // v3.724.0 (PP-Q5 a) : la fin imposée, annoncée ici
    var sum = '<span class="pa2-fold-sum"><span class="pa2-kicker">' + esc(kick) + '</span>' + (hook ? '<b>' + esc(_td(hook.title)) + '</b>' : '') +
      (qt ? '<span class="pa2-endline">★ ' + esc(_td(qt.prep)) + '</span>' : '') + '</span>';
    h += body ? '<details class="pa2-panel pa2-fold pa2-hook"' + pa2FoldAttr("hook") + '><summary>' + sum + '</summary>' + body + '</details>' : '<div class="pa2-panel pa2-hook">' + sum + '</div>';
    // v3.429.23 : comme l'entrée de donjon offerte — l'Histoire paie la place
    if (SceneRunManager.isStoryPaFree(run.worldId, run.livingMap)) {
      h += '<p class="pa2-note pa2-storyfree"><img class=ico-inline src=images/Icons/dungeon/dungeon_ticket.webp> <b>' + esc(_t("Expédition offerte")) + '</b> ' + esc(_t("— l'Histoire t'y mène : aucune place prise, sauf si tu rentres avant le but")) + '</p>';
    }
    if (cond) h += pa2CondPanelHTML(cond, run); // la nuit en bande, avec son objet ★
  }

  // Besace en récapitulatif (PB-A, PB-C) : le héros tel qu'il part, chaque objet, soins et Entrepôt.
  h += '<div class="pa2-panel pa2-bagpanel" id="pa2-bag"><div class="pa2-bag-h"><span class="pa2-kicker pa2-kicker-ico">' + pa2Img(PA2_ICONS.bag) + esc(_t("Ta besace")) + '</span>' +
    '<span class="pa2-bag-n">' + esc(_t("{a} / {b} places", { a: used, b: size })) + '</span></div>';
  var hpPct = Math.max(0, Math.min(100, Math.round(100 * Number(game.heroHp || 0) / Math.max(1, Number(game.heroMaxHp || 1)))));
  h += '<div class="pa2-heroline"><span>' + esc(_t("{n}, niveau {l}", { n: hero.name, l: run.level })) + '</span><span class="pa2-hpbar" aria-hidden="true"><i style="width:' + hpPct + '%"></i></span>' +
    '<span>' + esc(_t("{a} / {b} PV", { a: pa2Num(game.heroHp), b: pa2Num(game.heroMaxHp) })) + '</span></div>';
  // Rappel du tutoriel : seulement à la première préparation (ou dans un parcours, qui n'a pas ce tutoriel).
  if (Number(game.heroHp || 0) < Number(game.heroMaxHp || 1) && (par || pa2View.helpRun === run.id)) {
    h += '<p class="pa2-help">' + esc(_t("Tu pars avec tes PV actuels. Les rations de la besace soignent en route.")) + '</p>';
  }
  if (pa2View.notice) {
    h += '<div class="pa2-notice" role="status"><span>' + esc(pa2View.notice.txt) + '</span><button type="button" class="kbtn is-sec" onclick="pa2NoticeAct()">' +
      esc(pa2View.notice.undo ? _t("Annuler") : _t("OK")) + '</button></div>';
  }
  h += pa2RecapHTML(run);
  h += '<button type="button" class="pa2-addbig" onclick="pa2OpenPicker()">' + esc(_t("+ Ajouter des objets")) + '</button>';
  // v3.427.2 (retour Seb, option A) : la besace du dernier départ, remise en un toucher
  var last = pa2LastBag(run);
  if (last.length && pa2BagKey(run.bag) !== pa2BagKey(last) && pa2LastBagAvailable(run, last)) { // v3.616.0 : rien à reprendre, pas de bouton
    h += '<button type="button" class="kbtn is-sec pa2-lastbag" onclick="pa2ReuseLastBag()">' + pa2Img(PA2_ICONS.bag) + esc(_t("Comme la dernière fois")) + '</button>';
  }
  h += '</div>';

  if (!par) h += pa2PactsHTML(run) + pa2TrophiesHTML(run);
  h += '<button type="button" class="pa2-link" onclick="pa2CancelPrep()">' + esc(par ? _t("Renoncer") : _t("Renoncer à cette aventure")) + '</button>';
  h += pa2FootHTML(run);
  h += '</div></div>';
  return h;
}

/* Trophées du monde (PA2-2, D3), repliés sous les pactes (PB-A) : destinations atteintes, record de pactes. */
function pa2TrophiesHTML(run) {
  var t = Pa2Run.trophies(run.worldId), st = Pa2Run.ensureChest().stats, dests = pa2Dests(run), got = 0;
  var line = ["boss", "clairiere", "tertre"].map(function (d) { var n = Number(t.dests[d] || 0); if (n) got++; return _td(dests[d].name) + " ×" + n; }).join(" · ");
  var best = Number(st.bestPacts || 0);
  return '<details class="pa2-panel pa2-fold"' + pa2FoldAttr("troph") + '><summary><span class="pa2-fold-sum"><span class="pa2-kicker">' + esc(_t("Trophées — {w}", { w: pa2WorldName(run.worldId) })) + '</span>' +
    '<span class="pa2-dim">' + esc(_t("{a} / 3 destinations", { a: got }) + " · " + _tn(best, "Record : {n} pacte tenu", "Record : {n} pactes tenus", { n: best })) + '</span></span></summary>' +
    '<p class="pa2-trophies">' + esc(line) + ' · ' + esc(_tn(t.success, "{n} destination atteinte", "{n} destinations atteintes", { n: t.success })) + '</p></details>';
}

// Un pli ouvert le reste quand l'écran se redessine (ajout, pacte).
function pa2FoldAttr(key) { return (pa2View.folds[key] ? ' open' : '') + ' ontoggle="pa2View.folds.' + key + '=this.open"'; }
function pa2OpenPicker() { pa2View.picker = { mode: "add" }; pa2View.notice = null; pa2RenderPicker(); }
function pa2ClosePicker() { pa2View.picker = null; pa2View.detail = null; pa2RenderPicker(); pa2Rerender(); }
function pa2ItemDetail(id) { pa2View.detail = pa2View.detail === id ? null : id; pa2RenderPicker(); }
// La feuille reste ouverte : on ajoute plusieurs objets d'affilée (PB-B).
function pa2AddItem(id) {
  var r = Pa2Run.addItem(id);
  if (!r.ok) { if (typeof showToast === "function") showToast(r.reason, 1600); return; }
  pa2View.notice = null;
  pa2RenderPicker();
  pa2Rerender();
}
// Retire un exemplaire ; hors de la feuille, « Annuler » le remet.
function pa2RemoveOne(id) {
  var run = Pa2Run.getRun(), idx = run ? run.bag.lastIndexOf(id) : -1;
  if (idx < 0 || !Pa2Run.removeItem(idx).ok) return;
  pa2View.notice = pa2View.picker ? null : { txt: _t("Retiré de la besace : {x}.", { x: pa2ItemName(id) }), undo: id };
  pa2RenderPicker();
  pa2Rerender();
}
function pa2NoticeAct() {
  var u = pa2View.notice && pa2View.notice.undo;
  pa2View.notice = null;
  if (u) Pa2Run.addItem(u);
  pa2Rerender();
}
function pa2TogglePact(id) { Pa2Run.togglePact(id); pa2View.notice = null; pa2Rerender(); }

/* v3.427.2 (retour Seb, option A) : « Comme la dernière fois ». La besace du dernier départ est retenue
   par monde — et par parcours pour les parcours à besace.
   v3.616.0 (retour Seb) : retenue dans la PARTIE (coffre d'expédition), plus sur l'appareil : une partie neuve
   reprenait la besace d'une autre sauvegarde (Trousse de maître). Les anciennes clés Prefs ne sont plus lues. */
function pa2LastBagPref(run) { return run.parcours ? run.templateId : run.worldId; }
function pa2BagKey(bag) { return (bag || []).slice().sort().join(","); }
function pa2LastBag(run) {
  if (!run || !window.Pa2Run) return [];
  var v = Pa2Run.ensureChest().lastBag[pa2LastBagPref(run)];
  return Array.isArray(v) ? v.filter(function (id) { return !!PA2_ITEMS[id]; }) : [];
}
// Au moins un objet retenu peut revenir : présent dans ce monde, débloqué, et en stock s'il vient de l'Entrepôt.
function pa2LastBagAvailable(run, last) {
  return (last || []).some(function (id) {
    var it = PA2_ITEMS[id];
    if (!it || !Pa2Run.itemInWorld(id, run) || !Pa2Run.isUnlocked(id)) return false;
    return !it.resource || !window.WarehouseManager || WarehouseManager.getAmount(it.resource) > 0;
  });
}
// v3.723.0 : le message s'affiche dans la besace (le toast couvrait le bouton de départ) ; l'objet de la nuit absent y est signalé.
function pa2ReuseLastBag() {
  var run = Pa2Run.getRun();
  if (!run || run.status !== PA2_STATUS.prep) return;
  for (var i = run.bag.length - 1; i >= 0; i--) Pa2Run.removeItem(i);   // on repart de la besace retenue, rations rendues
  var missing = [];
  pa2LastBag(run).forEach(function (id) {
    var r = Pa2Run.addItem(id);
    if (!r.ok) missing.push(pa2ItemName(id));
  });
  pa2View.notice = { txt: missing.length ? _tn(missing.length, "Besace reprise. Manque : {x}.", "Besace reprise. Manquent : {x}.", { x: missing.join(", ") }) : _t("Besace reprise."), undo: null };
  pa2Rerender();
}
window.pa2ReuseLastBag = pa2ReuseLastBag;

function pa2Depart() {
  var run = Pa2Run.getRun(), bag = run ? run.bag.slice() : [], key = run ? pa2LastBagPref(run) : null;
  var r = Pa2Run.depart();
  if (!r.ok) { if (typeof showToast === "function") showToast(r.reason, 2200); return; }
  if (key && bag.length) { Pa2Run.ensureChest().lastBag[key] = bag; if (typeof saveGame === "function") saveGame(); } // v3.616.0 : dans la partie
  pa2View.picker = null; pa2View.notice = null;
  pa2Rerender();
}
function pa2CancelPrep() {
  Pa2Run.abandon();
  pa2ClearChrome();
  if (typeof leaveSceneScreen === "function") leaveSceneScreen();
}

// Rang de la feuille : nom, ★, encombrement, une ligne utile ; détail au toucher du nom ; − / + à droite.
function pa2PickRowHTML(run, id) {
  var it = PA2_ITEMS[id], c = Pa2Run.canAdd(id), n = pa2CountIn(run, id), k = it.as || id, isNight = Pa2Run.nightItem(run) === k, open = pa2View.detail === id;
  var line = isNight ? "★ " + _t("cette nuit") + " · " + (it.uses ? pa2UsesText(k, it.uses + 1, true) : pa2NightBonus(k))
    : (it.healPct ? _t("Soigne {p}", { p: pa2Pct(it.healPct) }) + (it.healsWound ? ", " + _tn(1, "{n} blessure", "{n} blessures", { n: 1 }) : "") : (it.uses ? pa2UsesText(k, it.uses, false) : ""));
  if (it.resource && window.WarehouseManager) line += (line ? " · " : "") + _t("Entrepôt : {n}", { n: Math.max(0, WarehouseManager.getAmount(it.resource) - n) });
  var why = c.ok || n ? "" : (c.reason === _t("La besace est pleine.") ? _tn(it.size, "Trop grand : {n} place.", "Trop grand : {n} places.", { n: it.size }) : c.reason);
  var h = '<div class="pa2-irow' + (n ? ' is-in' : '') + (isNight ? ' is-night' : '') + '">' + pa2Img(it.icon, "pa2-irow-ic") +
    '<button type="button" class="pa2-irow-t" onclick="pa2ItemDetail(\'' + id + '\')" aria-expanded="' + open + '"><b>' + esc(pa2ItemName(id)) + (isNight ? ' <span class="pa2-night-tag">★</span>' : '') + ' ' + pa2Pips(it.size) + '</b>' +
    (line ? '<span class="pa2-irow-s' + (isNight ? ' pa2-night-tag' : '') + '">' + esc(line) + '</span>' : '') + (why ? '<span class="pa2-why">' + esc(why) + '</span>' : '') + '</button>' +
    '<span class="pa2-step"><button type="button" class="pa2-stepbtn" onclick="pa2RemoveOne(\'' + id + '\')" aria-label="' + esc(_t("Retirer : {n}", { n: pa2ItemName(id) })) + '"' + (n ? '' : ' disabled') + '>−</button>' +
    '<span class="pa2-stepn">' + (n || "") + '</span><button type="button" class="pa2-stepbtn" onclick="pa2AddItem(\'' + id + '\')" aria-label="' + esc(_t("Ajouter : {n}", { n: pa2ItemName(id) })) + '"' + (c.ok ? '' : ' disabled') + '>+</button></span>';
  if (open) h += '<div class="pa2-irow-x"><span class="pa2-pro">' + esc(_td(it.pro)) + '</span>' + (it.con ? ' <span class="pa2-con">' + esc(_td(it.con)) + '</span>' : '') + '</div>';
  return h + '</div>';
}
// Feuille « Ajouter à la besace » : ouverte tant qu'on ajoute, « Fini » la referme (PB-B).
function pa2RenderPicker() {
  var run = Pa2Run.getRun();
  if (!run || run.status !== PA2_STATUS.prep || !pa2View.picker) { pa2SetSheetHTML(null); return; }
  var h = '<div class="pa2-pick-head"><div class="pa2-medal">' + pa2Img(PA2_ICONS.bag) + '</div><div class="pa2-pick-title"><h2 class="pa2-h2">' + esc(_t("Ajouter à la besace")) + '</h2>' +
    '<span class="pa2-pick-sub">' + esc(_t("{a} / {b} places", { a: Pa2Run.bagUsed(run), b: Pa2Run.bagSize(run) }) + " · " + pa2WorldName(run.worldId)) + '</span></div>' +
    '<button type="button" class="kbtn is-sec pa2-done" onclick="pa2ClosePicker()">' + esc(_t("Fini")) + '</button></div><div class="pa2-pick">';
  pa2PickList(run).forEach(function (id) { h += pa2PickRowHTML(run, id); });
  pa2SetSheetHTML(h + '</div>', _t("Besace"), true);
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
  if (v.wounds) chips += '<span class="pa2-chip is-wound" title="' + esc(_t("Blessures : −2 au jet par blessure")) + '">' + pa2Img(PA2_ICONS.wound) + '×' + v.wounds + '</span>';
  ["petite_ration", "ration", "grande_ration", "gourde", "outre"].forEach(function (id) {
    if (run.stock[id] > 0) chips += '<button type="button" class="pa2-chip" onclick="pa2Use(\'' + id + '\')" aria-label="' + esc(_t("Utiliser : {n}", { n: pa2ItemName(id) })) + '">' + pa2Img(PA2_ITEMS[id].icon) + '×' + run.stock[id] + '</button>';
  });
  if (run.stock.corde > 0) chips += '<span class="pa2-chip" title="' + esc(pa2ItemName("corde")) + '">' + pa2Img(PA2_ITEMS.corde.icon) + '×' + run.stock.corde + '</span>';
  if (run.stock.trousse > 0) chips += '<span class="pa2-chip" title="' + esc(pa2ItemName("trousse")) + '">' + pa2Img(PA2_ITEMS.trousse.icon) + '×' + run.stock.trousse + '</span>';
  if (run.stock.pierre_froide > 0) chips += '<span class="pa2-chip" title="' + esc(pa2ItemName("pierre_froide")) + '">' + pa2Img(PA2_ITEMS.pierre_froide.icon) + '×' + run.stock.pierre_froide + '</span>'; // v3.489.0
  if (run.advNext) chips += '<span class="pa2-chip is-adv" title="' + esc(_t("Deux dés au prochain jet, le meilleur compte.")) + '">' + esc(_t("Avantage")) + '</span>'; // v3.579.0
  chips = pa2CondChipHTML(run) + pa2FxChipsHTML(run) + chips; // v3.467.0 : effets des pièges en cours ; v3.469.0 : la condition, en tête
  // v3.454.0 (Crypte) : la Lanterne, à allumer ; allumée, le nombre de pas qu'il lui reste
  if (Number(run.lanternLeft || 0) > 0) chips += '<span class="pa2-chip is-lit" title="' + esc(pa2ItemName("lanterne")) + '">' + pa2Img(PA2_ITEMS.lanterne.icon) + esc(_tn(run.lanternLeft, "{n} pas", "{n} pas")) + '</span>';
  else if (run.stock.lanterne > 0) chips += '<button type="button" class="pa2-chip" onclick="pa2Use(\'lanterne\')" aria-label="' + esc(_t("Allumer la Lanterne")) + '">' + pa2Img(PA2_ITEMS.lanterne.icon) + '×' + run.stock.lanterne + '</button>';
  var rel = run.relics.map(function (id) {
    var r = PA2_RELICS[id];
    return '<button type="button" class="pa2-chip is-relic is-' + r.rar + '" onclick="pa2RelicInfo(\'' + id + '\')" aria-label="' + esc(_td(r.name)) + '">' + pa2Img(r.icon) + '</button>';
  }).join("");
  if (Pa2Run.hasKey(run)) { var kd = PA2_QUEST_KEYS[run.quest.key]; chips += '<span class="pa2-chip is-quest" title="' + esc(_td(kd.name)) + '" role="img" aria-label="' + esc(_t("Poche de quête : {k}", { k: _td(kd.name) })) + '">' + pa2Img(kd.icon) + '</span>'; } // v3.724.0
  var act = n && n.row >= 0 ? (run.parcours ? _t("Étape {a}/{b}", { a: n.row + 1, b: Pa2Run.rows(Pa2Run.getMap(run)).dest + 1 }) : PA2_ACT_WORD[n.act]) : _t("Départ");
  // v3.394.0 : plus de cadre de page — le monde (ou le parcours) se lit dans l'en-tête.
  var where = (run.parcours ? _td((SceneEngine.getTemplate(run.templateId) || {}).title || "") : pa2WorldName(run.worldId)) + " · " + act;
  // v3.405.0 : le lieu et le butin passent sur une ligne au-dessus — les barres prennent toute la largeur.
  return '<div class="pa2-hud" id="pa2-hud">' +
    '<div class="pa2-hud-top"><div class="pa2-act">' + esc(where) + '</div><div class="pa2-gold">' + pa2Img(pa2LootRes(run) ? pa2LootRes(run).icon : PA2_ICONS.gold) + pa2Num(v.loot) + '</div></div>' +
    pa2Img(hero.image, "pa2-portrait", hero.name) +
    '<div class="pa2-gauges">' + pa2GaugeHTML("hp", v.hp, v.max, _t("{a} / {b} PV", { a: pa2Num(v.hp), b: pa2Num(v.max) })) +
    pa2GaugeHTML("breath", v.breath, 100, _t("Souffle {n}", { n: pa2Num(v.breath) })) + '</div>' +
    (chips || rel ? '<div class="pa2-hud-row">' + chips + '<span class="pa2-spacer"></span>' + rel + '</div>' : '') + pa2QuestLineHTML(run) + '</div>';
}
/* v3.724.0 (Seb 06/11) : la ligne de quête du HUD — carnier annoncé, clé marquée, fin imposée. */
function pa2QuestLineHTML(run) {
  var q = run.quest, t = Pa2Run.questText(run), line = "", ico = "";
  if (!q) return "";
  if (q.kind === "cache" && q.state === "annoncee") { ico = PA2_QMARK.chest; line = _tn(q.back.length, "{t} : {n} pas derrière toi. Facultatif.", "{t} : {n} pas derrière toi. Facultatif.", { t: _td(t.name), n: q.back.length }); }
  else if (q.kind === "cache" && q.state === "faite" && run.at !== q.halt) { ico = PA2_QMARK.chest; line = _t("{t} est dans ton sac. Retour à la halte.", { t: _td(t.name) }); }
  else if (q.kind === "lock" && q.keyShown && !Pa2Run.hasKey(run)) { ico = PA2_QMARK.key; line = _t("{k} : marqué sur ta carte.", { k: _td(PA2_QUEST_KEYS[q.key].name) }); }
  else if (q.kind === "end") line = "★ " + _t("Une seule fin cette nuit : {d}.", { d: _td(pa2Dests(run)[q.end].name) });
  return line ? '<div class="pa2-qline">' + (ico ? '<span class="pa2-qi">' + ico + '</span>' : '') + '<span>' + esc(line) + '</span></div>' : "";
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
  // v3.576.0 : un rendu pendant un glissement repart de la position affichée, pas de l'arrivée
  var shown = keep ? pa2CamShownXY() : null;
  pa2View.camDrawn = shown || { tx: v.tx, ty: v.ty };
  var h = '<div class="pa2-fs pa2-page" id="pa2-fs">';
  h += '<div class="pa2-vp" id="pa2-vp"><div class="pa2-stage" id="pa2-stage" style="' + (keep
    ? 'width:' + v.w + 'px;height:' + (v.w * map.height / map.width) + 'px;transform:translate3d(' + pa2View.camDrawn.tx + 'px,' + pa2View.camDrawn.ty + 'px,0);--nk:' + pa2CamNk()
    : 'visibility:hidden') + '">' + pa2MapHTML(run) + '</div></div>';
  h += pa2HudHTML(run);
  // Consigne : seulement avant le premier pas, elle s'efface d'elle-même.
  if (run.status === PA2_STATUS.map && !run.path.length) {
    var hint = run.parcours ? _t("Touche l'étape suivante pour avancer.") : (n.type === "depart" ? _t("Touche un sentier doré pour quitter le village.") : _t("Choisis ta route. Les trois destinations brillent au nord."));
    h += '<p class="pa2-maphint">' + esc(hint) + '</p>';
  }
  // v3.724.0 (indice A : « ? » et panneau) : un passage presque trouvé, on peut chercher encore une fois
  if (run.status === PA2_STATUS.map && run.hint && run.hint.node === run.at) {
    var sd = Pa2Run.secretDef(run.hint.secret, run), cost = PA2_QUEST_RULES.searchAgainBreath, can = run.breath >= cost;
    h += '<div class="pa2-hintbox" role="status"><p class="pa2-hintln">' + esc(sd ? _td(sd.hint) : "") + '</p>' +
      '<button type="button" class="pa2-choice is-noicon is-q"' + (can ? '' : ' disabled') + ' onclick="pa2SearchAgain()"><span class="pa2-t">' + esc(_t("Chercher encore")) + '</span>' +
      '<span class="pa2-cost">' + esc(_t("{n} Souffle", { n: cost })) + '</span><span class="pa2-s">' + esc(can ? _t("Avec l'avantage. Une seule fois.") : _t("pas assez de Souffle")) + '</span></button></div>';
  }
  h += '<button type="button" class="pa2-offmark" id="pa2-offmark" onclick="pa2CamFollow(true)" aria-label="' + esc(_t("Revenir au héros")) + '"><i id="pa2-offarrow"></i>' + pa2Img(PA2_ICONS.hero) + '</button>';
  h += '<button type="button" class="lmx-btn pa2-fs-btn is-quit" onclick="pa2AskAbandon()" aria-label="' + esc(run.parcours ? _t("Abandonner le parcours") : _t("Abandonner l'aventure")) + '">⚑</button>';
  h += '<button type="button" class="lmx-btn pa2-fs-btn is-center" onclick="pa2CamFollow(true)" aria-label="' + esc(_t("Recentrer sur le héros")) + '">◎</button>';
  h += '</div>';
  return h;
}

/* ---------- Caméra de la carte (moteur commun, ui/map-camera.js) ---------- */

var PA2_ZOOM_MAX = 2;       // choix de Seb (atelier) : ×2 par rapport au cadrage Couvrant
var PA2_ZOOM_START = 1.4;   // v3.576.0 (retour Seb) : la carte s'ouvre zoomée, on ne voit pas tout d'un coup
var PA2_NODE_GROW = 0.4;    // choix de Seb (atelier) : les repères grossissent peu (taille ∝ zoom^0,4)

var pa2Cam = window.MapCamera ? MapCamera.create({
  vpId: "pa2-vp", stageId: "pa2-stage", view: pa2View.cam, ignoreButtonTaps: true,
  ratio: function () { var m = window.Pa2Run && Pa2Run.getMap(); return m ? m.height / m.width : 1; },
  zoomMax: function () { return PA2_ZOOM_MAX; },
  topSlack: function () { return pa2View.camTop || 0; },
  bottomSlack: function () { return pa2CamSheetH() || (pa2View.sheet ? (pa2View.camSheet || 0) : 0); }, // v3.576.0 : pendant un rendu, la feuille ouverte compte encore
  onSettle: function () { pa2CamOffscreen(); },
  onReset: function () { pa2CamFollow(true); },
  onResize: function (st) { st.style.setProperty("--nk", pa2CamNk()); }
}) : null;

// Translation affichée de la scène (animation en cours comprise), ou null.
function pa2CamShownXY() {
  var st = document.getElementById ? document.getElementById("pa2-stage") : null;
  if (!st || typeof getComputedStyle !== "function") return null;
  var m = /matrix\(([^)]+)\)/.exec(getComputedStyle(st).transform || "");
  if (!m) return null;
  var p = m[1].split(",").map(Number);
  return p.length === 6 && isFinite(p[4]) && isFinite(p[5]) ? { tx: p[4], ty: p[5] } : null;
}
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
  if (v.key !== key || !v.w) { v.key = key; pa2Cam.resetCover(); v.w = Math.min(pa2Cam.maxW(), v.w * PA2_ZOOM_START); pa2CamFollow(false); return; }
  // v3.576.0 : la carte revient dans ses bornes en glissant (une feuille fermée), jamais d'un saut
  var d0 = pa2View.camDrawn || { tx: v.tx, ty: v.ty }, st = document.getElementById("pa2-stage");
  v.w = Math.max(pa2Cam.coverW(), Math.min(pa2Cam.maxW(), v.w));
  pa2Cam.clamp(); pa2CamRevealMoves();
  if (st && st.getBoundingClientRect) st.getBoundingClientRect(); // position de départ prise en compte avant l'animation
  pa2Cam.apply(Math.abs(d0.tx - v.tx) + Math.abs(d0.ty - v.ty) > 1);
}
// Place le nœud du héros dans la zone utile (sous l'en-tête, au-dessus de la feuille).
// v3.576.0 : sans feuille, vers 40 % de la hauteur, pour qu'une feuille qui s'ouvre le cache rarement.
var PA2_FOLLOW_Y = 0.4;
function pa2CamFollow(anim) {
  var run = Pa2Run.getRun(), vp = document.getElementById("pa2-vp"); if (!pa2Cam || !run || !vp) return;
  var map = Pa2Run.getMap(run), d = map.nodes[run.at], v = pa2View.cam; if (!d) return;
  var T = pa2Cam.top(), H = vp.clientHeight - pa2Cam.bottom(), W = vp.clientWidth, f = pa2View.sheet ? 0.5 : PA2_FOLLOW_Y;
  v.tx = W / 2 - v.w * d.x / map.width;
  v.ty = T + (H - T) * f - v.w * d.y / map.width;
  if (!pa2View.sheet) pa2CamKeepMoves(run, map, d, T, H, W);
  pa2Cam.clamp(); pa2Cam.apply(anim);
}
// Les points où l'on peut aller restent visibles (sentiers très espacés des parcours), sans perdre le héros.
function pa2CamKeepMoves(run, map, d, T, H, W) {
  var v = pa2View.cam, k = v.w / map.width, M = 44; // marge autour d'un repère, en px
  Pa2Run.openMoves().forEach(function (key) {
    var q = map.nodes[key]; if (!q) return;
    var sy = v.ty + k * q.y, sx = v.tx + k * q.x;
    if (sy < T + M) v.ty = Math.min(v.ty + (T + M - sy), H - M - k * d.y);
    else if (sy > H - M) v.ty = Math.max(v.ty - (sy - H + M), T + M - k * d.y);
    if (sx < M) v.tx = Math.min(v.tx + (M - sx), W - M - k * d.x);
    else if (sx > W - M) v.tx = Math.max(v.tx - (sx - W + M), M - k * d.x);
  });
}
// Feuille fermée, de retour sur la carte : décalage minimal si un point accessible est hors de vue.
function pa2CamRevealMoves() {
  var run = Pa2Run.getRun(), vp = document.getElementById("pa2-vp");
  if (!pa2Cam || !run || !vp || pa2View.sheet || run.status !== PA2_STATUS.map) return false;
  var map = Pa2Run.getMap(run), d = map.nodes[run.at]; if (!d) return false;
  var v = pa2View.cam, ox = v.tx, oy = v.ty;
  pa2CamKeepMoves(run, map, d, pa2Cam.top(), vp.clientHeight - pa2Cam.bottom(), vp.clientWidth);
  pa2Cam.clamp();
  return Math.abs(ox - v.tx) + Math.abs(oy - v.ty) > 1;
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
    if (run.nodes && run.nodes[k] && !Pa2Run.isShown(k, run) && (d.hidden || Pa2Run.isClosed(k, run))) return; // v3.724.0 : fin cachée ou écartée, pas de lueur
    if (Pa2Run.isDest(run.nodes[k], run)) svg += '<circle cx="' + d.x + '" cy="' + d.y + '" r="' + Math.round(66 * K) + '" fill="url(#pa2-halo)" opacity=".6"/>';
    else if (d.row >= 0 && run.reveal[Pa2Run.actOf(d.row, map)]) svg += '<circle cx="' + d.x + '" cy="' + d.y + '" r="' + Math.round(58 * K) + '" fill="url(#pa2-halo)" opacity=".45"/>';
  });
  svg += '</mask></defs>';
  var veil = run.parcours ? (map.image ? '.45' : '0') : (here && here.act === 3 ? '.9' : '.84'); // parcours : le chemin se voit en entier
  svg += '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#050302" opacity="' + veil + '" mask="url(#pa2-fog)"/>';
  svg += '<circle cx="' + cur.x + '" cy="' + cur.y + '" r="' + Math.round(light * 0.8) + '" fill="url(#pa2-glow)"/>';
  // v3.489.0 (Montagne) : le sol qui brûle, une lueur de lave sous chaque case brûlante en vue
  if (run.lavaRow != null || run.nodes) Object.keys(map.nodes).forEach(function (k) {
    var lv = Pa2Run.burnLevel(k, run), d = map.nodes[k];
    if (lv && Pa2Run.isShown(k, run)) svg += '<circle cx="' + d.x + '" cy="' + d.y + '" r="' + Math.round((44 + 10 * lv) * K) + '" fill="#ff5a1f" opacity="' + (0.22 + 0.1 * lv).toFixed(2) + '"/>';
  });
  // Seuls les sentiers possibles (pointillés dorés) et la trace parcourue sont dessinés.
  var runLinks = Pa2Run.links(run); // v3.429.0 : les murs qui ont bougé
  var found = {}, q = run.quest;
  Pa2Run.foundSecrets(run).forEach(function (sk) { found[sk] = true; });
  Object.keys(runLinks).forEach(function (a) {
    runLinks[a].forEach(function (b) {
      var w = walked[a + ">" + b], o = a === run.at && open.indexOf(b) >= 0;
      if (!w && !o) return;
      if (found[a + ">" + b]) return; // v3.724.0 : un passage secret a son propre tracé
      var A = map.nodes[a], B = map.nodes[b];
      var isNew = pa2View.fromKey && a === pa2View.fromKey && b === run.at;
      var st = w ? 'stroke="#ffcf7a" stroke-width="' + (5 * K).toFixed(1) + '" stroke-opacity=".9"' : 'stroke="#f0aa3e" stroke-width="' + (4.5 * K).toFixed(1) + '" stroke-dasharray="' + (2 * K).toFixed(1) + ' ' + (12 * K).toFixed(1) + '"';
      svg += '<line class="pa2-edge' + (isNew ? ' is-drawing' : '') + '" x1="' + A.x + '" y1="' + A.y + '" x2="' + B.x + '" y2="' + B.y + '" ' + st + ' stroke-linecap="round"/>';
    });
  });
  // v3.724.0 (passage A : points bleu pâle) : passages trouvés, tracé courbe s'il a un point de contrôle (via)
  Object.keys(found).forEach(function (sk) {
    var p = sk.split(">"), sd = Pa2Run.secretDef(sk, run), A = map.nodes[p[0]], B = map.nodes[p[1]];
    if (!sd || !A || !B || Pa2Run.isClosed(p[1], run)) return;
    var dd = sd.via ? 'M' + A.x + ' ' + A.y + ' Q' + sd.via[0] + ' ' + sd.via[1] + ' ' + B.x + ' ' + B.y : 'M' + A.x + ' ' + A.y + ' L' + B.x + ' ' + B.y;
    if (walked[sk]) svg += '<path d="' + dd + '" fill="none" stroke="#ffcf7a" stroke-width="' + (5 * K).toFixed(1) + '" stroke-opacity=".9" stroke-linecap="round"/>';
    svg += '<path class="pa2-secret-edge" d="' + dd + '" fill="none" stroke="#a9dcff" stroke-width="' + (7 * K).toFixed(1) + '" stroke-dasharray="0.1 ' + (16 * K).toFixed(1) + '" stroke-linecap="round"/>';
  });
  // v3.724.0 (retour B : trace claire qui coule) : le chemin du carnier, de la halte vers la cache
  if (q && q.state === "annoncee" && q.back) {
    svg += '<defs><marker id="pa2-arr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3" markerHeight="3" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#fff4cf"/></marker></defs>';
    q.back.forEach(function (e) {
      var A = map.nodes[e[0]], B = map.nodes[e[1]];
      svg += '<line x1="' + A.x + '" y1="' + A.y + '" x2="' + B.x + '" y2="' + B.y + '" stroke="#fff4cf" stroke-width="' + (9 * K).toFixed(1) + '" stroke-opacity=".25" stroke-linecap="round"/>' +
        '<line class="pa2-flow" x1="' + A.x + '" y1="' + A.y + '" x2="' + B.x + '" y2="' + B.y + '" stroke="#fff4cf" stroke-width="' + (4 * K).toFixed(1) + '" stroke-dasharray="12 10" stroke-linecap="round" marker-end="url(#pa2-arr)"/>';
    });
  }
  svg += '</svg>';

  var nodes = "";
  Object.keys(map.nodes).forEach(function (k) {
    if (!Pa2Run.isShown(k, run)) return;
    var d = map.nodes[k], n = Pa2Run.node(k, run), isOpen = open.indexOf(k) >= 0, isCur = k === run.at;
    var vis = Pa2Run.isVisible(k, run), type = vis ? n.type : "unknown";
    var cls = "pa2-node t-" + type + (Pa2Run.isDest(n, run) ? " is-dest" : "") + (n.type === "camp" || n.type === "seuil" || n.type === "depart" ? " is-mark" : "") +
      (isOpen ? " is-open" : "") + (isCur ? " is-cur" : "") + (n.done && !isCur ? " is-done" : "") + (Pa2Run.burnLevel(k, run) ? " is-burning" : "") +
      (n.cache ? " is-cache" : "") + (n.hidden ? " is-hidden-end" : "") + (isOpen && Pa2Run.isBackMove(k, run) ? " is-back" : ""); // v3.724.0
    var label = n.cache ? _td(Pa2Run.questText(run).name || "") : (vis ? pa2NodeLabel(run, n) : _t("Inconnu"));
    nodes += '<button type="button" class="' + cls + '" style="left:' + (100 * d.x / W).toFixed(2) + '%;top:' + (100 * d.y / H).toFixed(2) + '%"' +
      (isOpen ? ' onclick="pa2Move(\'' + k + '\')"' : ' tabindex="-1"') + ' aria-label="' + esc(label) + '">' + (n.cache ? PA2_QMARK.chest : pa2Img(pa2Ico(type, run) || PA2_ICONS.unknown)) + '</button>';
  });
  // v3.467.0 (Pièges) : losange rouge au milieu des sentiers piégés en vue ; le héros arrêté au milieu.
  var trapSvg = "", traps = "";
  // v3.468.0 (PG-A1b) : sentier coupé, rond gris barré au milieu, trait gris pâle
  Object.keys(run.cuts || {}).forEach(function (key) {
    if (!Pa2Run.isCutShown(key, run)) return;
    var p = key.split(">"), A = map.nodes[p[0]], B = map.nodes[p[1]], m = pa2Mid(map, key), c = Pa2Run.cutDef(key, run);
    trapSvg += '<line x1="' + A.x + '" y1="' + A.y + '" x2="' + B.x + '" y2="' + B.y + '" stroke="#a8a29a" stroke-opacity=".5" stroke-width="' + (3 * K).toFixed(1) + '" stroke-dasharray="' + (2 * K).toFixed(1) + ' ' + (10 * K).toFixed(1) + '" stroke-linecap="round"/>';
    traps += '<button type="button" class="pa2-cut" style="left:' + (100 * m.x / W).toFixed(2) + '%;top:' + (100 * m.y / H).toFixed(2) + '%" onclick="pa2CutInfo(\'' + key + '\')" aria-label="' +
      esc(_t("{x} : le sentier est coupé.", { x: _td(c.name) })) + '">' + pa2Img(c.icon) + '</button>';
  });
  Object.keys(run.traps || {}).forEach(function (key) {
    if (!Pa2Run.isTrapShown(key, run) || (run.trap && run.trap.key === key)) return;
    var p = key.split(">"), A = map.nodes[p[0]], B = map.nodes[p[1]], m = pa2Mid(map, key), near = p[0] === run.at;
    if (!near) trapSvg += '<line x1="' + A.x + '" y1="' + A.y + '" x2="' + B.x + '" y2="' + B.y + '" stroke="#e0806a" stroke-opacity=".55" stroke-width="' + (3 * K).toFixed(1) + '" stroke-dasharray="' + (2 * K).toFixed(1) + ' ' + (10 * K).toFixed(1) + '" stroke-linecap="round"/>';
    traps += pa2TrapMarkHTML(run.traps[key].fx, m, W, H, !near);
  });
  if (run.trap) traps += pa2TrapMarkHTML(run.traps[run.trap.key].fx, pa2Mid(map, run.trap.key), W, H, false);
  // v3.724.0 (verrou A : cadenas) : au milieu du sentier fermé, trait rouge pâle ; clé marquée et indice en badge sur leur case
  Object.keys(run.locks || {}).forEach(function (key) {
    if (!Pa2Run.isLockShown(key, run) && !(run.lock && run.lock.key === key)) return;
    var p = key.split(">"), A = map.nodes[p[0]], B = map.nodes[p[1]], m = pa2Mid(map, key);
    trapSvg += '<line x1="' + A.x + '" y1="' + A.y + '" x2="' + B.x + '" y2="' + B.y + '" stroke="#e0806a" stroke-opacity=".55" stroke-width="' + (3 * K).toFixed(1) + '" stroke-dasharray="' + (2 * K).toFixed(1) + ' ' + (10 * K).toFixed(1) + '" stroke-linecap="round"/>';
    traps += '<span class="pa2-qmark is-mid" style="left:' + (100 * m.x / W).toFixed(2) + '%;top:' + (100 * m.y / H).toFixed(2) + '%" role="img" aria-label="' + esc(_t("Verrou : {x}", { x: _td(Pa2Run.questText(run).name || "") })) + '">' + PA2_QMARK.lock + '</span>';
  });
  var badge = function (k, svgMark, label) {
    var d = map.nodes[k];
    return d ? '<span class="pa2-qmark is-pulse" style="left:' + (100 * d.x / W).toFixed(2) + '%;top:' + (100 * d.y / H).toFixed(2) + '%" role="img" aria-label="' + esc(label) + '">' + svgMark + '</span>' : "";
  };
  if (q && q.kind === "lock" && q.keyShown && !Pa2Run.hasKey(run) && Pa2Run.isShown(q.keyNode, run)) traps += badge(q.keyNode, PA2_QMARK.key, _td(PA2_QUEST_KEYS[q.key].name));
  if (run.hint && run.hint.node === run.at) traps += badge(run.at, PA2_QMARK.hint, _t("Indice"));
  if (trapSvg) trapSvg = '<svg class="pa2-trap-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' + trapSvg + '</svg>';
  var from = pa2View.fromKey ? (pa2View.fromMid ? pa2Mid(map, pa2View.fromKey + ">" + run.at) : map.nodes[pa2View.fromKey]) : (run.trap ? pa2Mid(map, run.trap.key) : (run.lock ? pa2Mid(map, run.lock.key) : cur));
  var marker = '<img class="pa2-hero-mark" id="pa2-hero-mark" src="' + esc(PA2_ICONS.hero) + '" alt="" style="left:' + (100 * from.x / W).toFixed(2) + '%;top:' + (100 * from.y / H).toFixed(2) + '%">';
  // v3.489.0 : image pas encore livrée (Montagne) -> le fond parchemin
  return '<div class="pa2-map" id="pa2-map">' +
    (map.image ? '<img class="pa2-map-img" src="' + esc(map.image) + '" alt="" onerror="this.removeAttribute(\'src\');this.classList.add(\'pa2-img-missing\')">' : '<div class="pa2-map-img pa2-parchment"></div>') + svg + trapSvg + nodes + traps + marker + '</div>';
}

function pa2NodeLabel(run, n) {
  var d = pa2Dests(run);
  var names = {
    obstacle: _t("Obstacle"), combat: _t("Combat"), source: _t("Source"), autel: _t("Autel"), trouvaille: _t("Trouvaille"),
    evenement: _t("Rencontre"), camp: _t("Le camp"), seuil: _t("Le seuil"), depart: _t("Le village"), veine: _t("Veine")
  };
  if (d[n.type]) return _td(d[n.type].name);
  return names[n.type] || "";
}

// Le repère glisse du nœud quitté au nouveau, le sentier se trace, puis la feuille s'ouvre.
function pa2AnimateMove() {
  var run = Pa2Run.getRun(), map = run ? Pa2Run.getMap(run) : null, mark = document.getElementById("pa2-hero-mark");
  pa2View.fromKey = null; pa2View.fromMid = false;
  if (!run || !map || !mark) return;
  var cur = run.trap ? pa2Mid(map, run.trap.key) : (run.lock ? pa2Mid(map, run.lock.key) : map.nodes[run.at]); // v3.467.0 : arrêt sur le piège ; v3.724.0 : sur le verrou
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
  pa2Later(function () {
    var r = Pa2Run.getRun();
    if (r && r.status === PA2_STATUS.node) pa2OpenSheet();
    else if (r && r.status === PA2_STATUS.trap) pa2OpenTrapSheet();
    else if (r && r.status === PA2_STATUS.lock) pa2OpenLockSheet(); // v3.724.0
    else if (r && r.status === PA2_STATUS.map && r.revisit === r.at && typeof showToast === "function") showToast(_t("Déjà passé par ici : rien de neuf."), 1800);
  }, 700);
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
  if (PA2_ITEMS[id] && PA2_ITEMS[id].adv && typeof showToast === "function") showToast(_t("Avantage au prochain jet."), 1800);
  pa2RefreshHud();
  if (pa2View.sheet && pa2View.sheet.step === "intro") pa2RenderSheet();
  if (PA2_ITEMS[id] && PA2_ITEMS[id].light) pa2Rerender(); // v3.454.0 : la Lanterne montre de nouvelles rangées
}
function pa2RelicInfo(id) {
  var r = PA2_RELICS[id];
  if (r && typeof showToast === "function") showToast(_t("{a} : {b}", { a: _td(r.name), b: _td(r.fx) }), 2600) // CPL3-2 : deux-points selon la langue;
}

function pa2AskAbandon() {
  var run = Pa2Run.getRun();
  if (!run) return;
  var retour = Pa2Run.hasPact("retour", run);
  showConfirmModal(_t("Abandonner l'aventure ?"),
    retour ? _t("Pacte « Pas de retour » : tout le butin reste en route.") : _t("Tu perds la moitié du butin. Les rations non mangées retournent à l'Entrepôt."),
    "images/Icons/system/warning.webp", function () {
      SceneRunManager.abandon();
      pa2View.sheet = null;
      pa2Rerender();
    });
}

/* ---------- Pièges (v3.467.0, atelier pieges-pa validé le 24/10/2026) ---------- */

function pa2Mid(map, key) {
  var p = key.split(">"), A = map.nodes[p[0]], B = map.nodes[p[1]];
  return { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
}
// Losange rouge au milieu du sentier, avec l'icône de l'effet ; plus pâle quand il est plus loin.
function pa2TrapMarkHTML(fx, m, W, H, far) {
  var d = PA2_TRAP_FX[fx];
  return '<span class="pa2-trap' + (far ? ' is-far' : '') + '" style="left:' + (100 * m.x / W).toFixed(2) + '%;top:' + (100 * m.y / H).toFixed(2) + '%" role="img" aria-label="' +
    esc(_t("Piège : {x}", { x: _td(d.name) })) + '">' + pa2Img(d.icon) + '</span>';
}
// Pastilles rouges des effets en cours : nom et pas restants (l'Alarme dure jusqu'au combat).
function pa2FxChipsHTML(run) {
  var h = "";
  PA2_TRAP_FX_ORDER.forEach(function (id) {
    var left = Pa2Run.fxLeft(run, id), d = PA2_TRAP_FX[id];
    if (!(left > 0)) return;
    h += '<span class="pa2-chip is-fx" title="' + esc(_t("{a} : {b}", { a: _td(d.name), b: _td(d.desc) })) + '">' + pa2Img(d.icon) + esc(_td(d.name) + (d.steps ? " " + left : "")) + '</span>';
  });
  return h;
}
/* v3.469.0 (Condition du run, atelier conditions-run validé le 24/10/2026)
   v3.723.0 (Seb 06/11, PB-A) : une bande, + / −, et l'objet ★ qu'on prend d'un toucher. Nuit calme : sa phrase seule. */
function pa2CondPanelHTML(cond, run) {
  var h = '<div class="pa2-panel pa2-cond"><div class="pa2-kicker">' + esc(_t("Cette nuit · {n}", { n: _td(cond.name) })) + '</div>';
  if (cond.pro) h += '<ul><li class="pa2-pro"><span>+</span><span>' + esc(_td(cond.pro)) + '</span></li><li class="pa2-con"><span>−</span><span>' + esc(_td(cond.con)) + '</span></li></ul>';
  else h += '<p class="pa2-narr pa2-dim">' + esc(_td(cond.line)) + '</p>';
  if (cond.tip && PA2_ITEMS[cond.tip]) { // v3.580.0 (lot 4, A) : l'objet de la nuit, renforcé pour ce run
    var has = run && Pa2Run.hasItem(cond.tip, run), c = run ? Pa2Run.canAdd(cond.tip) : { ok: false };
    h += '<div class="pa2-nightitem">' + pa2Img(PA2_ITEMS[cond.tip].icon) + '<div><b>' + esc("★ " + _t("Cette nuit : {x}", { x: pa2ItemName(cond.tip) })) + '</b>' +
      '<span>' + esc(pa2NightBonus(cond.tip)) + (has ? ' <span class="pa2-pro">' + esc(_t("Dans la besace.")) + '</span>' : '') + '</span></div>' +
      (has || !run ? '' : '<button type="button" class="kbtn is-sec pa2-take" onclick="pa2AddItem(\'' + cond.tip + '\')"' + (c.ok ? '' : ' disabled') + '>' + esc(_t("+ Prendre")) + '</button>') + '</div>';
  }
  return h + '</div>';
}
function pa2NightBonus(id) {
  if (id === "torche") return _t("Sa lumière n'attire rien : pas de dégâts en plus.");
  if (id === "armure") return _t("Pas de Souffle en plus sur les obstacles.");
  return _t("Un usage de plus.");
}
function pa2CondChipHTML(run) {
  var c = Pa2Run.condition(run);
  if (!c || !c.pro) return "";
  return '<button type="button" class="pa2-chip is-cond" onclick="pa2CondInfo()" aria-label="' + esc(_td(c.name)) + '">' + esc(_td(c.name)) + '</button>';
}
function pa2CondInfo() {
  var c = Pa2Run.condition();
  if (c && c.pro && typeof showToast === "function") showToast(_t("{n} : + {p} ; − {c}", { n: _td(c.name), p: _td(c.pro), c: _td(c.con) }), 2600);
}
function pa2CutInfo(key) {
  if (pa2Cam && pa2Cam.gesture.suppressClick) return; // fin d'un glissé : pas un tap
  var c = Pa2Run.cutDef(key);
  if (c && typeof showToast === "function") showToast(_t("{x} : le sentier est coupé.", { x: _td(c.name) }), 1800);
}
function pa2OpenTrapSheet() {
  var run = Pa2Run.getRun();
  if (!run || run.status !== PA2_STATUS.trap) return;
  var r = (run.trap && run.trap.result) || (run.pending && run.pending.type === "trap" ? run.pending.res : null); // v3.578.0 : jet en suspens
  pa2View.sheet = { trap: true, step: r ? "result" : "intro", res: r || null, shown: !!r };
  pa2RenderSheet();
}
function pa2TrapSheetBody(run, st) {
  var td = Pa2Run.trapDef(run), fx = td.fxDef, h = "";
  if (run.trap.unseen && st.step === "intro") h += '<p class="pa2-echo">' + esc(Pa2Run.worldRule(run, "trapsHidden") ? _t("Dans le noir, tu ne l'as pas vu. Ton pied est déjà dessus.") : _t("Tu ne l'as pas vu venir. Ton pied est déjà dessus.")) + '</p>';
  h += '<div class="pa2-sheet-head"><div class="pa2-medal is-trap">' + pa2Img(fx.icon) + '</div><div><div class="pa2-kicker">' +
    esc(_t("Piège") + " · " + _td(fx.name).toLowerCase()) + '</div><h2 class="pa2-h2">' + esc(_td(td.name)) + '</h2></div></div>';
  if (st.step === "intro") {
    h += '<p class="pa2-narr">' + esc(_td(td.line)) + '</p>';
    h += '<div class="pa2-fxline">' + pa2Img(fx.icon) + '<div><b>' + esc(_td(fx.name) + (fx.steps ? " · " + _tn(fx.steps, "{n} pas", "{n} pas") : "")) + '</b><span>' +
      esc(_td(fx.desc) + ". " + _td(fx.cure)) + '</span></div></div>';
    var o = Pa2Run.trapOptions();
    h += '<div class="pa2-choices">';
    h += '<button type="button" class="pa2-choice" onclick="pa2Trap(\'desamorcer\')">' + pa2Img(PA2_ICONS.precision) + '<span class="pa2-t">' + esc(_t("Désamorcer")) + '</span>' + pa2OddsHTML(o.disarm.cran) +
      '<span class="pa2-s">' + pa2WhyHTML(o.disarm, run) + ' · <b class="pa2-breath">' + esc(_t("sans Souffle")) + '</b>. ' +
      esc(_t("Raté : l'effet joue, et une blessure. De justesse : −{b} Souffle.", { b: PA2_TRAP_RULES.midBreath })) + '</span></button>';
    if (o.kit > 0) h += '<button type="button" class="pa2-choice" onclick="pa2Trap(\'trousse\')">' + pa2Img(PA2_ITEMS.trousse.icon) + '<span class="pa2-t">' + esc(_t("Utiliser la trousse")) + '</span>' +
      '<span class="pa2-odds o4"><span class="pa2-w">' + esc(_t("Assuré")) + '</span></span><span class="pa2-s">' + esc(_tn(o.kit, "il te reste {n} crochet", "il te reste {n} crochets", { n: o.kit })) + '</span></button>';
    h += '<button type="button" class="pa2-choice" onclick="pa2Trap(\'subir\')">' + pa2Img(fx.icon) + '<span class="pa2-t">' + esc(_t("Subir")) + '</span><span class="pa2-cost is-red">' + esc(_td(fx.name)) + '</span>' +
      '<span class="pa2-s">' + esc(_t("Pas de dé, pas de blessure. Tu avances, l'effet joue.")) + '</span></button>';
    h += '<button type="button" class="pa2-choice"' + (o.back.affordable ? '' : ' disabled') + ' onclick="pa2Trap(\'rebrousser\')">' + pa2Img(PA2_ICONS.flee) + '<span class="pa2-t">' + esc(_t("Rebrousser")) + '</span>' +
      '<span class="pa2-cost">' + esc(_t("{n} Souffle", { n: o.back.cost })) + '</span><span class="pa2-s">' + esc(_t("Retour au point d'avant, un autre sentier. Le piège reste.")) +
      (o.back.affordable ? '' : ' · ' + esc(_t("pas assez de Souffle"))) + '</span></button>';
    h += '</div>';
  } else {
    var r = st.res;
    if (r.choice === "desamorcer") h += pa2DieBlock(r, st.shown);
    h += '<div id="pa2-outcome" class="' + (st.shown ? "" : "is-hidden") + '">' + pa2TrapOutcome(run, r, td) +
      (r.pending ? '' : '<button type="button" class="kbtn primary" onclick="pa2TrapGo()">' + esc(_t("Continuer")) + '</button>') + '</div>';
  }
  return h;
}
function pa2TrapOutcome(run, r, td) {
  if (r.pending) return pa2InsistHTML(run, r);
  var fx = td.fxDef, hit = r.kind === "ko" || r.kind === "endure", h;
  if (r.kind === "ok") h = '<div class="pa2-verdict is-ok">' + esc(r.kit ? _t("Les crochets tiennent") : _t("Désamorcé")) + '</div><p class="pa2-result">' + esc(_t("Tu passes sans rien déclencher.")) + '</p>';
  else if (r.kind === "mid") h = '<div class="pa2-verdict is-mid">' + esc(_t("De justesse")) + '</div><p class="pa2-result">' + esc(_t("Tu passes, épuisé. −{b} Souffle", { b: PA2_TRAP_RULES.midBreath })) + '</p>';
  else h = '<div class="pa2-verdict is-ko">' + esc(r.kind === "ko" ? _t("Raté") : _t("Subi")) + '</div>';
  if (hit) {
    var what = r.fx === "besace" ? (r.lost ? _t("Perdu : {x}.", { x: pa2ItemName(r.lost) }) : _t("Ta besace était vide : rien de perdu."))
      : _td(fx.desc) + (fx.steps ? ", " + _tn(fx.steps, "{n} pas", "{n} pas") : "") + ".";
    if (r.muted) what = _t("la Cloche muette l'étouffe, rien ne sonne."); // v3.469.5
    h += '<p class="pa2-result">' + esc(_t("{a} : {b}", { a: _td(fx.name), b: what })) + '</p>';
    if (r.wound) h += '<p class="pa2-result is-red">' + esc(_t("Et une blessure : −1 cran sur tous les dés.")) + '</p>';
  }
  return h;
}
function pa2Trap(choice) {
  var run = Pa2Run.getRun();
  pa2Snapshot(run);
  var r = Pa2Run.resolveTrap(choice);
  if (pa2Fail(r)) { pa2View.hud = null; return; }
  if (choice === "rebrousser") { // retour sur le point de départ, la carte reprend
    pa2View.hud = null; pa2View.sheet = null; pa2SetSheetHTML(null);
    if (typeof showToast === "function") showToast(_t("Tu rebrousses chemin. −{n} Souffle", { n: PA2_TRAP_RULES.backBreath }), 1600);
    pa2Rerender();
    return;
  }
  pa2View.sheet = { trap: true, step: "result", res: r.result, shown: choice !== "desamorcer" };
  pa2RenderSheet();
  if (choice === "desamorcer") pa2RollDie(r.result.roll, function () { if (r.result.kind === "ok") pa2Buzz(30); pa2Reveal(Pa2Run.getRun() || run); }, r.result);
  else { pa2Reveal(run); pa2RefreshHud(); }
}
// Le pas reprend du milieu du sentier jusqu'au point visé.
function pa2TrapGo() {
  var run = Pa2Run.getRun(), from = run && run.trap ? run.trap.from : null;
  var r = Pa2Run.trapContinue();
  if (pa2Fail(r)) return;
  pa2ClearTimers();
  pa2View.sheet = null; pa2View.hud = null; pa2SetSheetHTML(null);
  pa2View.fromKey = from; pa2View.fromMid = true;
  pa2Rerender();
}

/* ---------- Légende (bouton rond, comme la carte du monde) ---------- */

function pa2RenderLegend() {
  var box = document.getElementById("pa2-legendbox"), run = Pa2Run.getRun();
  if (!box) return;
  if (!run || (run.status !== PA2_STATUS.map && run.status !== PA2_STATUS.node && run.status !== PA2_STATUS.trap && run.status !== PA2_STATUS.lock)) { box.innerHTML = ""; return; }
  var h = '<button type="button" class="lmx-btn pa2-legend-btn" onclick="pa2ToggleLegend()" aria-label="' + esc(_t("Légende")) + '" aria-expanded="' + !!pa2View.legend + '">?</button>';
  if (pa2View.legend) {
    // audit NOV-13 : dans un parcours, seulement ce que son tracé contient (pas d'actes, pas de destinations)
    var par = !!run.parcours, has = {};
    Object.keys(run.nodes || {}).forEach(function (k) { if (run.nodes[k]) has[run.nodes[k].type] = true; });
    var row = function (type, icon, label, sub, mark) {
      if (par && !has[type]) return "";
      return '<div class="pa2-legend-row"><span class="pa2-disc' + (mark ? ' is-mark' : '') + '">' + (mark || pa2Img(icon)) + '</span><span>' + esc(label) + '<small>' + esc(sub) + '</small></span></div>';
    };
    // v3.724.0 : passages secrets (cartes qui en ont) et marques de la mini-quête du run
    var qk = run.quest ? run.quest.kind : "", qrows = (Pa2Run.getMap(run).secrets ? row("secret", null, _t("Passage secret"), _t("Points bleu pâle : trouvé en fouillant ; « ? » : un indice"), PA2_QMARK.hint) : "") +
      (qk === "cache" ? row("cache", null, _td(Pa2Run.questText(run).name || ""), _t("Un détour facultatif, derrière toi"), PA2_QMARK.chest) : "") + // v3.725.0 : le nom du trésor de l'accroche
      (qk === "lock" ? row("lock", null, _t("Verrou"), _t("Ouvrir avec la clé, ou forcer : on passe toujours"), PA2_QMARK.lock) : "");
    if (par) { has.piege = Object.keys(run.traps || {}).length > 0; has.coupe = Object.keys(run.cuts || {}).length > 0; }
    h += '<div class="pa2-legend" role="dialog" aria-label="' + esc(_t("Légende")) + '"><h5>' + esc(_t("Légende")) + '</h5>' +
      row("obstacle", pa2Ico("obstacle", run), _t("Obstacle"), _t("Trois voies, un jet de dé")) + row("combat", PA2_ICONS.combat, _t("Combat"), _t("Charger, Tenir, Ruser ou Fuir")) +
      row("source", pa2Ico("source", run), _t("Source"), _t("PV et Souffle")) + row("autel", pa2Ico("autel", run), _t("Autel"), _t("De l'or contre une plaie")) +
      row("trouvaille", PA2_ICONS.trouvaille, _t("Trouvaille"), _t("Un objet pour ce run")) + row("evenement", pa2Ico("evenement", run), _t("Rencontre"), _t("Un choix qui aura des suites")) +
      row("camp", pa2Ico("camp", run), _t("Le camp"), _t("Fin de l'acte I")) + row("seuil", pa2Ico("seuil", run), _t("Le seuil"), _t("Fin de l'acte II")) +
      row("piege", PA2_TRAP_FX.venin.icon, _t("Piège"), _t("Losange rouge sur un sentier : son effet, à désamorcer ou à éviter")) +
      row("coupe", ((PA2_CUTS[run.worldId] || PA2_CUTS.forest)[Object.keys(PA2_CUTS[run.worldId] || PA2_CUTS.forest)[0]]).icon, _t("Sentier coupé"), _t("Rond gris : le passage est fermé pour ce run")) +
      qrows + row("dest", pa2Ico("boss", run), _t("Destinations"), qk === "end" ? _t("Une seule fin cette nuit") : _t("Trois fins possibles, au nord")) + '</div>';
  }
  box.innerHTML = h;
}
function pa2ToggleLegend() { pa2View.legend = !pa2View.legend; pa2RenderLegend(); }

/* ---------- Feuille d'action ---------- */

// Pose (ou retire) la feuille du bas dans le calque ; déjà ouverte, le contenu change sans rejouer l'entrée.
// closable : le voile la referme (feuille de la besace).
function pa2SetSheetHTML(inner, label, closable) {
  var box = document.getElementById("pa2-sheetbox");
  if (!box) return;
  if (inner == null) { box.innerHTML = ""; pa2CamSheetChanged(); return; }
  var sheet = box.querySelector(".pa2-sheet");
  var body = inner; // v3.723.0 : plus de croix de 36 px, la feuille de la besace a son bouton « Fini » ; le voile ferme
  if (sheet) { var top = sheet.scrollTop; sheet.innerHTML = body; sheet.scrollTop = top; pa2CamSheetChanged(); return; }
  pa2CamSheetChanged();
  box.innerHTML = '<div class="pa2-scrim"' + (closable ? ' onclick="if(event.target===this)pa2ClosePicker()"' : '') + '><div class="pa2-sheet" role="dialog" aria-modal="true" aria-label="' + esc(label || "") + '">' + body + '</div></div>';
}

/* v3.394.0 : la feuille ouverte (ou changée de taille) réduit la zone utile.
   v3.576.0 (retour Seb, « la carte va dans tous les sens ») : on ne recentre que si la feuille
   cache le héros ; feuille fermée, la carte glisse doucement dans ses bornes au lieu de sauter. */
function pa2CamHeroHidden() {
  var run = Pa2Run.getRun(), vp = document.getElementById("pa2-vp"); if (!run || !vp) return false;
  var map = Pa2Run.getMap(run), d = map.nodes[run.at], v = pa2View.cam; if (!d || !v.w) return false;
  var sy = v.ty + v.w * d.y / map.width, H = vp.clientHeight - pa2CamSheetH(), T = pa2View.camTop || 0;
  return sy > H - 48 || sy < T + 24;
}
function pa2CamSheetChanged() {
  if (!pa2Cam || !document.getElementById("pa2-vp")) return;
  var go = function () {
    var h = pa2CamSheetH();
    if (Math.abs(h - (pa2View.camSheet || 0)) < 2) return;
    pa2View.camSheet = h;
    if (h) { if (pa2CamHeroHidden()) pa2CamFollow(true); }
    else { pa2Cam.clamp(); pa2CamRevealMoves(); pa2Cam.apply(true); }
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(go); else go();
}

function pa2OpenSheet() {
  var run = Pa2Run.getRun();
  if (!run || run.status !== PA2_STATUS.node) return;
  var n = Pa2Run.node(run.at, run), f = Pa2Run.questFoeHere(run);
  pa2View.sheet = { key: n.key, step: (run.lastResult && run.lastResult.surprised) ? "surprised" : "intro" };
  if (f && !f.done) pa2View.sheet.foe = true; // v3.724.0 : la rencontre du retour
  else if (n.cache && !n.done) pa2View.sheet.cache = true; // v3.724.0 : le carnier
  if (run.pending && run.pending.key === n.key) pa2View.sheet = { key: n.key, foe: !!pa2View.sheet.foe, step: run.pending.type === "ruse" ? "ruse" : "roll", res: run.pending.res, shown: true }; // v3.578.0 : jet en suspens
  pa2RenderSheet();
}
function pa2Insist(accept) {
  var run = Pa2Run.getRun(), st = pa2View.sheet;
  if (!run || !st) return;
  pa2Snapshot(run);
  var r = Pa2Run.insist(accept);
  if (pa2Fail(r)) { pa2View.hud = null; return; }
  st.res = r.result; st.shown = !!accept;
  if (accept) { pa2RenderSheet(); pa2Reveal(Pa2Run.getRun() || run); return; }
  pa2View.hud.breath = Math.max(0, pa2View.hud.breath - PA2_D20.insistBreath); // le Souffle est payé avant la relance
  pa2RefreshHud();
  pa2RenderSheet();
  pa2RollDie(r.result.roll, function () { if (r.result.kind === "ok") pa2Buzz(30); pa2Reveal(Pa2Run.getRun() || run); }, r.result);
}
function pa2CloseSheet() {
  pa2ClearTimers();
  pa2View.sheet = null;
  pa2View.hud = null;
  pa2SetSheetHTML(null);
  var run = Pa2Run.getRun(), kd = run && run.keyNote ? PA2_QUEST_KEYS[run.keyNote] : null;
  if (kd) { run.keyNote = null; if (typeof showToast === "function") showToast(_td(kd.found), 3000); } // v3.724.0 : la clé ramassée
  pa2Rerender();
}
window.pa2CloseSheet = pa2CloseSheet;

function pa2RenderSheet() {
  var run = Pa2Run.getRun(), st = pa2View.sheet;
  if (!run || !st) { pa2SetSheetHTML(null); return; }
  if (st.trap) { var td = Pa2Run.trapDef(run); pa2SetSheetHTML(pa2TrapSheetBody(run, st), td ? _td(td.name) : "", false); return; }
  if (st.lock) { pa2SetSheetHTML(pa2LockSheetBody(run, st), _td(Pa2Run.questText(run).name || ""), false); return; } // v3.724.0
  if (st.announce) { pa2SetSheetHTML(pa2AnnounceBody(run), _td(Pa2Run.questText(run).name || ""), false); return; }
  if (st.search) { pa2SetSheetHTML(pa2SearchBody(run, st), _t("Chercher encore"), false); return; }
  var n = st.foe && run.quest && run.quest.foe ? run.quest.foe : Pa2Run.node(st.key, run);
  pa2SetSheetHTML(pa2SheetBody(run, n, st), pa2NodeLabel(run, n), false);
}

function pa2Head(run, n, title, kicker, big) {
  var dest = Pa2Run.isDest(n, run);
  return '<div class="pa2-sheet-head"><div class="pa2-medal' + (dest ? ' is-dest is-big' : (big ? ' is-big' : '')) + '">' + pa2Img(pa2Ico(n.type, run) || PA2_ICONS.unknown) + '</div><div><div class="pa2-kicker">' + esc(kicker) + '</div><h2 class="pa2-h2">' + esc(title) + '</h2></div></div>';
}
function pa2OddsHTML(cran) {
  return '<span class="pa2-odds o' + PA2_CRAN_LEVEL[cran] + '"><span class="pa2-cran"><i></i><i></i><i></i><i></i></span><span class="pa2-w">' + esc(PA2_CRAN_WORD[cran]) + '</span></span>';
}
/* v3.673.0 : le d20 pré-rendu (modèle 3D CC0, tools/rendu-de/) : une pose par valeur, face avant vide,
   le jeu y écrit le chiffre ; le roulé est une bande de 16 images (images/UI/de/). */
var PA2_DIE_DIR = "images/UI/de/", pa2DieLoaded = false;
/* v3.674.0 (atelier de-d20.html, B) : effets du 20 naturel (anneau doré, rayons, étincelles) et du 1 (fêlure) ; joués à la pose seulement */
var PA2_DIE_FX = '<span class="pa2-fx pa2-fx-halo" aria-hidden="true"></span><span class="pa2-fx pa2-fx-rays" aria-hidden="true"></span><span class="pa2-fx pa2-fx-red" aria-hidden="true"></span>' +
  '<i class="pa2-sp" style="--dx:0px;--dy:-62px;animation-delay:0ms"></i><i class="pa2-sp" style="--dx:44px;--dy:-44px;animation-delay:40ms"></i><i class="pa2-sp" style="--dx:62px;--dy:0px;animation-delay:80ms"></i><i class="pa2-sp" style="--dx:44px;--dy:44px;animation-delay:20ms"></i><i class="pa2-sp" style="--dx:0px;--dy:62px;animation-delay:60ms"></i><i class="pa2-sp" style="--dx:-44px;--dy:44px;animation-delay:100ms"></i><i class="pa2-sp" style="--dx:-62px;--dy:0px;animation-delay:30ms"></i><i class="pa2-sp" style="--dx:-44px;--dy:-44px;animation-delay:70ms"></i><i class="pa2-sp" style="--dx:24px;--dy:-58px;animation-delay:120ms"></i><i class="pa2-sp" style="--dx:-28px;--dy:58px;animation-delay:90ms"></i>' +
  '<svg class="pa2-crack" viewBox="0 0 100 100" aria-hidden="true"><path d="M44 34 L52 46 L47 52 L57 63 L53 70 L60 80"/></svg>';
function pa2DieFace(v) {
  if (!pa2DieLoaded && typeof Image === "function") { pa2DieLoaded = true; try { new Image().src = PA2_DIE_DIR + "d20_roll.webp"; } catch (e) { noteErreur("pa2-view.pa2DieFace", e); } }
  var n = Math.max(1, Math.min(20, Number(v) || 20));
  return '<img class="pa2-die-img" src="' + PA2_DIE_DIR + 'd20_vide_' + n + '.webp" alt=""><span class="pa2-die-roll" aria-hidden="true"></span>' +
    PA2_DIE_FX + '<span class="pa2-die-num">' + esc(v == null ? "?" : String(v)) + '</span>';
}
// « Il faut 9+ » ; au-delà de 20, seul le 20 naturel passe ; le 1 rate toujours.
function pa2NeedText(thr) { return thr >= 20 ? "20" : Math.max(2, Number(thr || 0)) + "+"; }
function pa2Signed(n) { return (n < 0 ? "−" : "+") + Math.abs(n); }
/* r : résultat du jet (thr, cran, chance, roll, nat, rope) ; shown : le dé est déjà tombé. */
function pa2DieBlock(r, shown) {
  var nat = shown && !r.rope && !r.pending && r.nat ? r.nat : 0;
  var h = '<div class="pa2-dierow"><div class="pa2-die' + (nat ? " is-nat" + nat : "") + '" id="pa2-die">' + pa2DieFace(r.rope ? 20 : (shown ? r.roll : null)) + '</div><div class="pa2-target">' + esc(_t("Il faut")) +
    '<b>' + (r.rope ? esc(_t("corde")) : pa2NeedText(r.thr)) + '</b>' + esc(r.rope ? _t("Assuré") : PA2_CRAN_WORD[r.cran] + (r.chance != null ? " · " + fmtPct(r.chance) : "")) + '</div></div>';
  return h + '<div class="pa2-nat" id="pa2-nat">' + (shown && !r.rope ? pa2NatHTML(r) : "") + '</div>';
}
/* Sous le dé : 20 ou 1 naturel, les deux dés de l'avantage, le premier jet d'une relance (v3.578.0). */
function pa2NatHTML(r) {
  var p = [];
  if (r.adv && r.r2) p.push('<span>' + esc(_t("Avantage : {a} et {b}", { a: r.r1, b: r.r2 })) + '</span>');
  if (r.insisted) p.push('<span>' + esc(_t("Relancé (premier jet : {n})", { n: r.first })) + '</span>');
  if (r.nat === 20 && !r.pending) p.push('<span class="is-ok">' + esc(_t("20 naturel : réussite d'office")) + '</span>');
  if (r.nat === 1 && !r.pending) p.push('<span class="is-ko">' + esc(_t("1 naturel : échec d'office")) + '</span>');
  return p.join(" · ");
}
function pa2ClassLabel() {
  var hero = typeof getSelectedHero === "function" ? getSelectedHero() : null, cls = hero && typeof getClassForHero === "function" ? getClassForHero(hero) : null;
  return cls ? _td(cls.label) : "";
}
/* Le détail du jet : « Force +4 · Chevalier +2 · objets +3 · blessure −2 · il faut 8 ou plus ».
   Audit NOV-14 : sans « DD », ni « +0 » ; le chiffre à faire au dé, comme sous le dé. */
function pa2WhyHTML(o, run) {
  var parts = [];
  if (o.mod) parts.push(sceneStatLabel(o.stat) + " " + pa2Signed(o.mod));
  if (o.mastery) parts.push(pa2ClassLabel() + " " + pa2Signed(o.mastery));
  if (o.items) parts.push(_t("objets {m}", { m: pa2Signed(o.items) }));
  if (o.wounds) parts.push(_tn(run.wounds, "blessure {m}", "blessures {m}", { m: pa2Signed(-o.wounds) }));
  if (o.adv) parts.push(_t("avantage"));
  parts.push(o.thr >= 20 ? _t("il faut 20") : _t("il faut {n} ou plus", { n: Math.max(2, Number(o.thr || 0)) }));
  return esc(parts.map(function (x) { return x.replace(/ /g, "\u00a0"); }).join(" · ")); // chaque terme reste d'un bloc
}
function pa2ActKicker(n, what) {
  var run = Pa2Run.getRun();
  if (run && run.parcours && n.row >= 0) return what + " · " + _t("étape {n}", { n: n.row + 1 }); // parcours : pas d'actes
  return what + " · " + (n.row >= 0 ? PA2_ACT_WORD[n.act].toLowerCase() : "");
}

function pa2SheetBody(run, n, st) {
  var h = pa2EchoHTML(n, st) + (run.wallNote && st && st.step === "intro" ? '<p class="pa2-echo">' + esc(run.wallNote) + '</p>' : ""), dests = pa2Dests(run), hook = pa2Hook(run), R = PA2_RULES;
  if (run.fxNote && st && st.step === "intro") h += '<p class="pa2-echo is-red">' + esc(run.fxNote) + '</p>'; // v3.467.0 : le Venin
  if (run.burnNote && st && st.step === "intro") h += '<p class="pa2-echo is-red">' + esc(run.burnNote) + '</p>'; // v3.489.0 : le sol qui brûle
  if (st && st.step === "intro" && run.searchNote) h += pa2SearchNoteHTML(run); // v3.724.0 : la fouille de l'arrivée, réussie ou de justesse
  if (st && st.step === "quality") return h + pa2QualityBody(run, n, st); // v3.578.0
  if (st && st.cache) return h + pa2CacheBody(run, n, st); // v3.724.0 : le carnier
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
        h += pa2DieBlock(r, st.shown);
        h += '<div id="pa2-outcome" class="' + (st.shown ? "" : "is-hidden") + '">' + pa2ObstacleOutcome(run, n, r) + '</div>';
      }
      break;
    }

    case "combat":
    case "boss": {
      var boss = n.type === "boss", pv = st.step === "intro" || st.step === "surprised" ? Pa2Run.combatPreview() : null;
      var foe = pa2FoeInfo(run, n, pv);
      if (st.step === "intro" || st.step === "surprised") {
        h += pa2FoeHead(foe, boss ? _t("Destination · gardien") : (n.revenge ? _t("Combat · conséquence") : (n.questFoe ? _t("Combat · sur le retour") : pa2ActKicker(n, _t("Combat")))), true);
        if (n.questFoe) h += '<p class="pa2-sim is-red is-q">' + esc(_td(Pa2Run.questText(run).back || "") + " " + _t("Rencontre de la quête : pas d'or.")) + '</p>'; // v3.724.0
        if (n.revenge) h += '<p class="pa2-sim is-red">' + esc(_t("Tu lui as pris son arc, plus tôt. Il frappe 30 % plus fort.")) + '</p>';
        if (n.alarm) h += '<p class="pa2-sim is-red">' + esc(_t("L'alarme a sonné plus tôt : ils sont un de plus, et ils t'attendent.")) + '</p>';
        if (n.condExtra) h += '<p class="pa2-sim is-red">' + esc(_t("Cette nuit, le premier combat de l'acte compte un ennemi de plus.")) + '</p>';
        h += '<p class="pa2-sim">' + esc(_t("Résolu sur ton héros seul, niveau {l} : sans compagnons ni potions. Les dégâts annoncés sont ceux que tu prendras, à 15 % près.", { l: run.level })) + '</p>';
        h += '<div class="pa2-choices">';
        if (st.step === "surprised") {
          var sur = pv.tenir, loss = Math.round(sur.hpLoss * R.surprisedMult);
          h += '<p class="pa2-sim is-red">' + esc(_t("Il t'a vu venir. Il frappe le premier : +20 % de dégâts.")) + '</p>';
          h += pa2ApproachButton("tenir", sur, loss, true);
        } else {
          ["charger", "tenir"].forEach(function (id) { h += pa2ApproachButton(id, pv[id], pv[id].hpLoss, false); });
          if (boss && Pa2Run.canPassGuardian() && Pa2Run.guardianSorts(run)) { // v3.489.0 (Montagne) : le trieur, mains vides
            h += '<button type="button" class="pa2-choice" onclick="pa2PassGuardian()">' + pa2Img(PA2_ICONS.ruse) + '<span class="pa2-t">' + esc(_t("Montrer tes mains vides")) + '</span>' +
              '<span class="pa2-s">' + esc(_t("Tu n'as rien taillé. Il te laisse passer, mais son coffre reste sous lui.")) + '</span></button>';
          } else if (boss && Pa2Run.canPassGuardian()) { // v3.454.0 (Crypte) : le gardien dort
            h += '<button type="button" class="pa2-choice" onclick="pa2PassGuardian()">' + pa2Img(PA2_ICONS.ruse) + '<span class="pa2-t">' + esc(_t("Faire le tour")) + '</span>' +
              '<span class="pa2-s">' + esc(_t("Il dort. Tu atteins la destination sans combat, mais son coffre reste sous lui.")) + '</span></button>';
          } else if (boss && Pa2Run.guardianSorts(run) && dests.boss.sorted) {
            h += '<p class="pa2-sim is-red">' + esc(_td(dests.boss.sorted)) + '</p>';
          }
          if (!boss && pv.ruseBlocked) { // v3.467.0 : l'Alarme a sonné, ils sont un de plus et t'attendent
            h += '<button type="button" class="pa2-choice" disabled>' + pa2Img(PA2_ICONS.ruse) + '<span class="pa2-t">' + esc(_t("Ruser")) + '</span>' +
              '<span class="pa2-cost is-red">' + esc(_td(PA2_TRAP_FX.alarme.name)) + '</span><span class="pa2-s">' + esc(_t("L'alarme a sonné : ils t'attendent.")) + '</span></button>';
          } else if (!boss) {
            h += '<button type="button" class="pa2-choice" onclick="pa2Ruse()">' + pa2Img(PA2_ICONS.ruse) + '<span class="pa2-t">' + esc(_t("Ruser")) + '</span>' + pa2OddsHTML(pv.ruse.cran) +
              '<span class="pa2-s">' + pa2WhyHTML(pv.ruse, run) + '. ' + esc(_t("Réussi : pas de combat, un peu de butin. Raté : il frappe le premier.")) + '</span></button>';
            h += '<button type="button" class="pa2-choice"' + (pv.flee.affordable ? '' : ' disabled') + ' onclick="pa2Flee()">' + pa2Img(PA2_ICONS.flee) + '<span class="pa2-t">' + esc(_t("Fuir par les fourrés")) + '</span>' +
              '<span class="pa2-cost">' + esc(_t("{n} Souffle", { n: pv.flee.cost })) + '</span><span class="pa2-s">' + esc(_t("Aucun butin.")) + '</span></button>';
          }
        }
        h += '</div>';
      } else if (st.step === "ruse") {
        h += pa2FoeHead(foe, _t("Ruser"), false);
        h += pa2DieBlock(st.res, st.shown);
        h += '<div id="pa2-outcome" class="' + (st.shown ? "" : "is-hidden") + '">' + pa2RuseOutcome(run, st.res) + '</div>';
      } else {
        h += pa2FoeHead(foe, st.apName, false);
        h += '<div class="pa2-rounds" id="pa2-rounds">' + (st.shown ? pa2RoundsHTML(st, st.res.parts.length) : "") + '</div>';
        h += '<div id="pa2-outcome" class="' + (st.shown ? "" : "is-hidden") + '">' + pa2FightOutcome(run, n, st.res) + '</div>';
      }
      break;
    }

    case "veine": { // v3.489.0 (Montagne, MT10) : les veines du chemin
      var vp = Pa2Run.place(run, "veine"), va = Pa2Run.veinAsh(run);
      h += pa2Head(run, n, _td(vp.name), pa2ActKicker(n, _t("Veine")));
      h += '<p class="pa2-narr">' + esc(_td(vp.text)) + '</p><div class="pa2-choices">';
      h += '<button type="button" class="pa2-choice" onclick="pa2Vein(true)">' + pa2Img(PA2_ICONS.veine) + '<span class="pa2-t">' + esc(_t("La tailler")) + '</span>' +
        '<span class="pa2-cost is-gold">' + esc(_t("+{a} à {b} {x}", { a: va.min, b: va.max, x: pa2RareName(run.worldId) })) + '</span>' +
        '<span class="pa2-s">' + esc(_t("La lave avance d'une rangée. Au bout, le gardien saura que tu as pris.")) + '</span></button>';
      h += '<button type="button" class="pa2-choice is-noicon" onclick="pa2Vein(false)"><span class="pa2-t">' + esc(_t("La laisser")) + '</span><span class="pa2-s">' + esc(_t("Rien ne change. Tu passes.")) + '</span></button></div>';
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
        if (run.quest && run.quest.kind === "lock" && run.quest.keyShown && Pa2Run.questText(run).hint) h += '<p class="pa2-echo">' + esc(_td(Pa2Run.questText(run).hint)) + '</p>'; // v3.724.0 (B) : la clé, marquée
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
      if (!camp && run.quest && run.quest.kind === "end" && Pa2Run.questText(run).closed) h += '<p class="pa2-echo">' + esc(_td(Pa2Run.questText(run).closed)) + '</p>'; // v3.724.0 : les fins écartées
      if (!camp && !Pa2Run.isClosed(Object.keys(run.nodes).filter(function (k) { return run.nodes[k].type === "boss"; })[0], run)) h += pa2GuardianHint(run); // v3.724.0 : pas de gardien si sa fin est écartée
      if (camp && Pa2Run.campGiftDue(run)) {
        h += '<div class="pa2-panel pa2-trophy">' + pa2Img(PA2_RELICS[hook.campGift.relic].icon) + '<div><div class="pa2-dim pa2-small">' + esc(_td(hook.campGift.text)) + '</div></div></div>';
      }
      h += '<div class="pa2-choices">';
      h += '<button type="button" class="pa2-choice is-noicon" onclick="pa2Place(\'rest\')"><span class="pa2-t">' + esc(camp ? _t("Dormir") : _t("Reprendre ton souffle")) + '</span><span class="pa2-cost">' + esc(_t("+{n} % PV · +{n} Souffle", { n: Math.round(pct * 100) })) + '</span>' +
        '<span class="pa2-s">' + esc(_t("Et l'avantage au prochain jet : deux dés, le meilleur compte.")) + '</span></button>';
      // v3.578.0 (2A) : au feu, chaque ration soigne ×1,5 son effet ; on choisit laquelle
      var rations = ["petite_ration", "ration", "grande_ration"].filter(function (id) { return run.stock[id] > 0; });
      rations.forEach(function (id) {
        h += '<button type="button" class="pa2-choice" onclick="pa2Place(\'cook\',\'' + id + '\')">' + pa2Img(PA2_ITEMS[id].icon) + '<span class="pa2-t">' + esc(_t("Cuisiner : {r}", { r: pa2ItemName(id) })) + '</span>' +
          '<span class="pa2-cost">' + esc(_t("+{n} PV · −1 blessure", { n: pa2Pct(Pa2Run.cookPct(id)) })) + '</span><span class="pa2-s">' + esc(_tn(run.stock[id], "il t'en reste {n}", "il t'en reste {n}", { n: run.stock[id] })) + '</span></button>';
      });
      if (!hasR) h += '<button type="button" class="pa2-choice" disabled>' + pa2Img(PA2_ITEMS.petite_ration.icon) + '<span class="pa2-t">' + esc(_t("Cuisiner une ration")) + '</span><span class="pa2-s">' + esc(_t("Il te faut une ration.")) + '</span></button>';
      h += '<button type="button" class="pa2-choice is-noicon" onclick="pa2Place(\'listen\')"><span class="pa2-t">' + esc(camp ? pa2Words(run).listen : _t("Lire les traces")) + '</span>' +
        '<span class="pa2-cost">' + esc(camp ? _t("Acte II révélé") : _t("Acte III révélé")) + '</span><span class="pa2-s">' + esc(camp ? _t("Tu sais ce qui t'attend jusqu'au seuil.") : _t("Tu sais ce qui t'attend jusqu'au bout.")) + '</span></button>';
      h += '<button type="button" class="pa2-choice is-noicon" onclick="pa2Place(\'home\')"><span class="pa2-t">' + esc(_t("Rentrer au village")) + '</span>' +
        '<span class="pa2-cost is-gold">' + esc(_t("Tout le butin")) + '</span><span class="pa2-s">' + esc(_t("Pas de destination, pas de trophée.")) + '</span></button>';
      h += '</div>';
      break;
    }

    case "cachee": { // v3.724.0 (D) : la fin cachée, derrière son passage secret
      var hd = dests.cachee || {}, QR = PA2_QUEST_RULES;
      var hGain = Math.round(run.refGold * QR.hiddenGold * Pa2Run.lootMult(run) * Pa2Run.destGoldMult(run) * (Pa2Run.hasRelic("ronce", run) ? R.ronceLoot : 1));
      h += pa2Head(run, n, _td(hd.name || ""), _t("Destination cachée"));
      h += '<p class="pa2-narr">' + esc(_td(hd.line || "")) + '</p><div class="pa2-choices">';
      h += '<button type="button" class="pa2-choice is-q" onclick="pa2HiddenEnd()">' + pa2Img(pa2Ico("cachee", run)) + '<span class="pa2-t">' + esc(_td(Pa2Run.questText(run).take || "")) + '</span>' +
        '<span class="pa2-cost is-gold">' + esc(_t("Trophée")) + '</span><span class="pa2-s">' + esc(_t("Fin cachée · +{n} or · +{r} {x}", { n: hGain, r: QR.hiddenRare, x: pa2RareName(run.worldId) })) + '</span></button></div>';
      break;
    }

    case "clairiere": {
      var cl = dests.clairiere, share = run.flags.sauve ? PA2_GOLD.clairiereSauve : PA2_GOLD.clairiere;
      var clGain = Math.round(run.refGold * share * Pa2Run.ring(run).lootMult * Pa2Run.destGoldMult(run) * (Pa2Run.hasRelic("ronce", run) ? R.ronceLoot : 1));
      h += pa2Head(run, n, _td(cl.name), _t("Destination"));
      h += '<p class="pa2-narr">' + esc(_td(cl.line)) + (hook ? " " + esc(_td(pa2HookClairiere(run, hook))) : "") + '</p><div class="pa2-choices">';
      var pw = pa2Words(run);
      h += '<button type="button" class="pa2-choice' + (pw.takeIcon ? '' : ' is-noicon') + '" onclick="pa2Clairiere()">' + (pw.takeIcon ? pa2Img(pw.takeIcon) : '') + '<span class="pa2-t">' + esc(pw.take) + '</span>' +
        '<span class="pa2-cost is-gold">' + esc(_t("Trophée")) + '</span><span class="pa2-s">' + esc(_t("Fin sans combat · +{n} or", { n: clGain })) + '</span></button></div>';
      break;
    }
  }
  return h;
}

/* v3.578.0 (lot 3) : la feuille d'un jet de qualité (source, autel, camp, seuil, trouvaille). */
var PA2_QUALITY_WORD = { maigre: _t("Maigre · −25 %"), normal: _t("Normal"), bon: _t("Bon · +25 %"), parfait: _t("Parfait · +50 %") };
function pa2QualityBody(run, n, st) {
  var r = st.res, q = r.quality, line = "", wound = r.cured ? _tn(r.cured, "−{n} blessure", "−{n} blessures", { n: r.cured }) : "";
  if (r.kind === "source") line = _t("+{h} PV · +{b} Souffle", { h: pa2Num(r.healed), b: r.amount });
  else if (r.kind === "autel") line = _t("+{h} PV", { h: pa2Num(r.healed) }) + (wound ? " · " + wound : "");
  else if (r.kind === "trouvaille") line = _t("{n} rejoint tes trouvailles.", { n: _td(PA2_RELICS[r.relic].name) }) + (r.rare ? " " + _t("Et, au fond : {r} +{n}.", { r: pa2RareName(run.worldId), n: r.rare }) : "");
  else if (r.action === "rest") line = _t("+{h} PV · +{b} Souffle", { h: pa2Num(r.healed), b: r.breath }) + (wound ? " · " + wound : "") + ". " + _t("Avantage au prochain jet.");
  else if (r.action === "cook") line = _t("{a} : {b}", { a: pa2ItemName(r.ration), b: _t("+{h} PV", { h: pa2Num(r.healed) }) }) + (wound ? " · " + wound : "");
  var h = pa2Head(run, n, pa2NodeLabel(run, n), _t("Jet de qualité"));
  h += '<div class="pa2-dierow"><div class="pa2-die" id="pa2-die">' + pa2DieFace(st.shown ? q.roll : null) + '</div><div class="pa2-target">' + esc(_t("Sans échec")) +
    '<b>' + esc(_t("d20")) + '</b>' + esc(_t("16+ : bon · 20 : parfait")) + '</div></div><div class="pa2-nat" id="pa2-nat"></div>';
  h += '<div id="pa2-outcome" class="' + (st.shown ? "" : "is-hidden") + '"><div class="pa2-verdict is-q-' + q.q + '">' + esc(PA2_QUALITY_WORD[q.q]) + '</div>' +
    '<p class="pa2-result">' + esc(line) + '</p>' + pa2ContinueButton(run) + '</div>';
  return h;
}

/* Au seuil : ce que coûterait le gardien, pour choisir sa destination avant l'acte III (C1, PA2-3). */
function pa2GuardianHint(run) {
  var gp = Pa2Run.guardianPreview();
  if (!gp || !gp.tenir) return "";
  var t = gp.tenir, verdict = t.unwinnable ? "mortel" : Pa2Run.verdictOf(t.hpLoss);
  var cost = PA2_VERDICT_WORD[verdict] + (t.unwinnable ? "" : " · ~" + pa2Num(t.hpLoss) + " " + _t("PV"));
  return '<div class="pa2-panel pa2-trophy pa2-guardian">' + pa2Img(pa2Ico("boss", run)) + '<div><div class="pa2-kicker">' + esc(_t("Au nord : {n}", { n: _td(pa2Dests(run).boss.name) })) + '</div>' +
    '<div class="pa2-small">' + esc(_t("En tenant, aujourd'hui : {c}.", { c: cost })) + ' ' + esc(_t("Les deux autres destinations ne demandent pas de combat.")) + '</div></div></div>';
}

/* Écho d'une accroche (PA2-4) : une ligne en tête de la feuille, sans rappel de la cause. */
function pa2EchoHTML(n, st) {
  if (!n || !st || (st.step !== "intro" && st.step !== "surprised")) return "";
  return (n.narr ? '<p class="pa2-echo">' + esc(_td(n.narr)) + '</p>' : "") + (n.echo ? '<p class="pa2-echo">' + esc(_td(n.echo)) + '</p>' : ""); // narr : texte d'étape d'un parcours
}

function pa2FoeInfo(run, n, pv) {
  var dests = pa2Dests(run), hook = pa2Hook(run);
  if (n.type === "boss") {
    // v3.423.1 (retour Seb) : hors Forêt, le portrait est celui du gardien du monde (le Ver au Désert), plus le cerf
    var gd = (window.PA2_GUARDIAN && PA2_GUARDIAN[run.worldId]) || null, gimg = (run.worldId !== "forest" && gd && window.ENEMY_DB && ENEMY_DB[gd.foe]) ? ENEMY_DB[gd.foe].image : null;
    return { name: _td(dests.boss.name), line: _td(dests.boss.line), image: gimg || pa2Ico("boss", run), boss: true, pack: 1 };
  }
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

/* v3.578.0 (lot 3, 1A) : un jet raté ou de justesse attend ; insister relance le dé contre du Souffle. */
function pa2InsistHTML(run, r) {
  var can = Pa2Run.canInsist(run);
  return '<div class="pa2-verdict is-' + r.kind + '">' + esc(r.kind === "mid" ? _t("De justesse") : _t("Raté")) + '</div>' +
    '<p class="pa2-result">' + esc(_t("Tu peux insister : relancer le dé, une seule fois.")) + '</p><div class="pa2-choices">' +
    '<button type="button" class="pa2-choice is-noicon"' + (can ? '' : ' disabled') + ' onclick="pa2Insist(false)"><span class="pa2-t">' + esc(_t("Insister")) + '</span>' +
    '<span class="pa2-cost">' + esc(_t("{n} Souffle", { n: PA2_D20.insistBreath })) + '</span><span class="pa2-s">' + esc(_t("Le nouveau jet compte, quel qu'il soit.")) + '</span></button>' +
    '<button type="button" class="pa2-choice is-noicon" onclick="pa2Insist(true)"><span class="pa2-t">' + esc(_t("Garder ce jet")) + '</span></button></div>';
}
function pa2ObstacleOutcome(run, n, r) {
  if (r.pending) return pa2InsistHTML(run, r);
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
  if (r.pending) return pa2InsistHTML(run, r);
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
  if (r.drop) h += '<p class="pa2-result is-drop"><img class="ico-inline" src="images/Icons/dungeon/dungeon_guaranteed_loot.webp" alt=""> ' + esc(_t("Objet trouvé : {x} ({r})", { x: _td(r.drop.name), r: _td((window.RARITY_LABELS || {})[r.drop.rarity] || r.drop.rarity) })) + '</p>';
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
function pa2Buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { noteErreur("pa2-view.pa2Buzz", e); /* vibration indisponible */ } }

// Dé qui roule, puis se pose sur la valeur déjà tirée par le moteur.
function pa2RollDie(finalVal, then, res) {
  var die = document.getElementById("pa2-die");
  if (!die) { then(); return; }
  var num = die.querySelector(".pa2-die-num"), img = die.querySelector(".pa2-die-img");
  die.classList.remove("is-landed", "is-fx20", "is-fx1", "is-nat20", "is-nat1"); die.classList.add("is-rolling"); // v3.673.0 : le dé roule (bande d'images), puis se pose sur la valeur
  pa2Later(function () {
    die.classList.remove("is-rolling");
    var n = Math.max(1, Math.min(20, Number(finalVal) || 20));
    if (img) img.src = PA2_DIE_DIR + "d20_vide_" + n + ".webp";
    if (num) num.textContent = String(finalVal);
    void die.offsetWidth; die.classList.add("is-landed");
    var nat = res && !res.pending && !res.rope ? res.nat : 0, el = document.getElementById("pa2-nat");
    if (nat) die.classList.add("is-nat" + nat, "is-fx" + nat); // 20 ou 1 naturel ; is-fx : l'effet ne joue qu'à la pose (v3.674.0)
    if (nat === 20) pa2Buzz([20, 40, 20]); else if (nat === 1) pa2Buzz(60);
    if (el && res && !res.rope) el.innerHTML = pa2NatHTML(res);
    then();
  }, 800);
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
  }, r.result);
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
  pa2RollDie(r.result.roll, function () { pa2Reveal(Pa2Run.getRun() || run); }, r.result);
}
function pa2PassGuardian() { // v3.454.0 (Crypte)
  if (pa2Quick(function () { return Pa2Run.passGuardian(); })) pa2CloseSheet();
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
/* v3.578.0 (lot 3) : jet de qualité, sans échec. Le dé roule, la feuille montre l'effet, « Continuer » referme. */
function pa2QualityRoll(fn) {
  var run = Pa2Run.getRun(), key = pa2View.sheet && pa2View.sheet.key;
  pa2Snapshot(run);
  var r = fn();
  if (pa2Fail(r)) { pa2View.hud = null; return null; }
  pa2View.sheet = { key: key, step: "quality", res: r.result, shown: false };
  pa2RenderSheet();
  pa2RollDie(r.result.quality.roll, function () { if (r.result.quality.q === "parfait") pa2Buzz(30); pa2Reveal(Pa2Run.getRun() || run); }, null);
  return r;
}
function pa2Drink() { pa2QualityRoll(function () { return Pa2Run.drink(); }); }
function pa2Vein(take) { if (pa2Quick(function () { return Pa2Run.cutVein(take); })) pa2CloseSheet(); } // v3.489.0
function pa2Altar(accept) {
  if (accept) { pa2QualityRoll(function () { return Pa2Run.altar(true); }); return; }
  if (pa2Quick(function () { return Pa2Run.altar(false); })) pa2CloseSheet();
}

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
  pa2QualityRoll(function () { return Pa2Run.takeRelic(id); });
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

function pa2Place(action, rationId) {
  var run = Pa2Run.getRun(), camp = Pa2Run.node(run.at, run).type === "camp";
  if (action === "rest" || action === "cook") { // v3.578.0 : jet de qualité
    var q = pa2QualityRoll(function () { return Pa2Run.placeAction(action, rationId); });
    if (q && q.result.gift && typeof showToast === "function") showToast(_t("{n} rejoint tes trouvailles.", { n: _td(PA2_RELICS[q.result.gift].name) }), 2800);
    return;
  }
  var r = pa2Quick(function () { return Pa2Run.placeAction(action); });
  if (!r) return;
  var msgs = [];
  if (r.result.gift) msgs.push(_t("{n} rejoint tes trouvailles.", { n: _td(PA2_RELICS[r.result.gift].name) }));
  if (action === "listen") msgs.push(camp ? _t("Acte II révélé.") : _t("Acte III révélé."));
  if (msgs.length && typeof showToast === "function") showToast(msgs.join(" "), 2800);
  pa2CloseSheet();
}
function pa2Clairiere() { if (pa2Quick(function () { return Pa2Run.clairiere(); })) pa2CloseSheet(); }

/* ---------- v3.724.0 (Seb 06/11, atelier aventure-parcours, partie 2) : mini-quêtes de parcours ---------- */

// La fouille de l'arrivée : montrée seulement réussie (le passage est sur la carte) ou de justesse (un indice).
function pa2SearchNoteHTML(run) {
  var sn = run.searchNote, sd = sn ? Pa2Run.secretDef(sn.secret, run) : null;
  if (!sd) return "";
  if (sn.kind === "ok") return '<p class="pa2-echo is-secret">' + esc(_t("Tu remarques un passage : {x}. Il est sur ta carte.", { x: _td(sd.name) })) + '</p>';
  return '<p class="pa2-echo is-secret">' + esc(_td(sd.hint)) + ' ' + esc(_t("(Un indice : tu pourras chercher encore, depuis la carte.)")) + '</p>';
}
function pa2SearchAgain() {
  var run = Pa2Run.getRun();
  if (!run || pa2View.sheet) return;
  pa2Snapshot(run);
  var r = Pa2Run.searchAgain();
  if (pa2Fail(r)) { pa2View.hud = null; return; }
  pa2View.hud.breath = Math.max(0, pa2View.hud.breath - PA2_QUEST_RULES.searchAgainBreath); // payé avant le dé
  pa2RefreshHud();
  pa2View.sheet = { search: true, step: "result", res: r.result, shown: false };
  pa2Rerender(); // la carte perd son panneau d'indice
  pa2RenderSheet();
  pa2Later(function () { pa2RollDie(r.result.roll, function () { if (r.result.found) pa2Buzz(30); pa2Reveal(Pa2Run.getRun() || run); }, r.result); }, 60);
}
function pa2SearchBody(run, st) {
  var r = st.res, sd = r.found ? Pa2Run.secretDef(r.found, run) : null;
  var h = '<div class="pa2-sheet-head"><div class="pa2-medal">' + pa2Img(PA2_ICONS.secret) + '</div><div><div class="pa2-kicker">' + esc(_t("Fouille · avec l'avantage")) + '</div><h2 class="pa2-h2">' + esc(_t("Chercher encore")) + '</h2></div></div>';
  h += pa2DieBlock(r, st.shown);
  h += '<div id="pa2-outcome" class="' + (st.shown ? "" : "is-hidden") + '">' + (sd
    ? '<div class="pa2-verdict is-ok">' + esc(_t("Trouvé")) + '</div><p class="pa2-result">' + esc(_t("Tu remarques un passage : {x}. Il est sur ta carte.", { x: _td(sd.name) })) + '</p>'
    : '<div class="pa2-verdict is-ko">' + esc(_t("Rien")) + '</div><p class="pa2-result">' + esc(_t("Tu cherches encore. Rien, cette fois.")) + '</p>') +
    '<button type="button" class="kbtn primary" onclick="pa2CloseSheet()">' + esc(_t("Continuer")) + '</button></div>';
  return h;
}

// A — l'annonce du carnier, une fiche à la halte (choix B de Seb), une seule fois.
function pa2AnnounceDue(run) {
  var q = run && run.quest;
  return !!(q && q.kind === "cache" && q.state === "annoncee" && !q.seen && run.at === q.halt && run.status === PA2_STATUS.map);
}
function pa2OpenAnnounce() { pa2View.sheet = { announce: true }; pa2RenderSheet(); }
function pa2AnnounceBody(run) {
  var q = run.quest, t = Pa2Run.questText(run), steps = q.back.length, cc = Pa2Run.cacheCost(run), cost = cc.total, halt = Pa2Run.node(q.halt, run); // v3.726.0 : brûlures comprises
  var h = '<div class="pa2-sheet-head"><div class="pa2-medal">' + pa2Img(PA2_ICONS.cache) + '</div><div><div class="pa2-kicker">' + esc(halt ? pa2NodeLabel(run, halt) : "") + '</div><h2 class="pa2-h2">' + esc(_td(t.name)) + '</h2></div></div>';
  h += '<p class="pa2-narr">' + esc(_td(t.announce)) + '</p>';
  h += '<p class="pa2-sim is-q">' + esc(_tn(steps, "{n} pas derrière toi, sur une case que tu n'as pas jouée. Aller et retour : {b} Souffle. Facultatif.", "{n} pas derrière toi, sur une case que tu n'as pas jouée. Aller et retour : {b} Souffle. Facultatif.", { n: steps, b: cost })) + '</p>';
  if (cc.burn > 0) h += '<p class="pa2-sim is-q">' + esc(_t("Dont {n} Souffle de brûlures : la lave ne monte pas pendant le détour, mais elle est déjà là.", { n: cc.burn })) + '</p>'; // v3.726.0 (Montagne)
  h += '<div class="pa2-choices"><button type="button" class="pa2-choice is-q" onclick="pa2AnnounceGo()">' + pa2Img(PA2_ICONS.cache) + '<span class="pa2-t">' + esc(_t("Y retourner")) + '</span>' +
    '<span class="pa2-cost">' + esc(_t("{n} Souffle", { n: cost })) + '</span><span class="pa2-s">' + esc(_t("Le chemin du retour s'affiche ; tu fais le premier pas.")) + '</span></button>' +
    '<button type="button" class="pa2-choice is-noicon is-q" onclick="pa2AnnounceLater()"><span class="pa2-t">' + esc(_t("Voir la carte")) + '</span>' +
    '<span class="pa2-s">' + esc(_t("Tu décides sur la carte. Repartir vers l'avant, c'est y renoncer.")) + '</span></button></div>'; // v3.725.0 : texte commun à tous les trésors
  return h;
}
function pa2AnnounceLater() { Pa2Run.questSeen(); pa2CloseSheet(); }
function pa2AnnounceGo() {
  var run = Pa2Run.getRun(), q = run && run.quest;
  Pa2Run.questSeen();
  pa2ClearTimers(); pa2View.sheet = null; pa2SetSheetHTML(null);
  if (q && q.back) pa2Move(q.back[0][1]);
  else pa2Rerender();
}
// Le carnier, sur sa case : il remplace ce que la case contenait.
function pa2CacheBody(run, n, st) {
  var t = Pa2Run.questText(run), hook = pa2Hook(run), R = PA2_QUEST_RULES, r = st.res;
  var h = '<div class="pa2-sheet-head"><div class="pa2-medal">' + pa2Img(PA2_ICONS.cache) + '</div><div><div class="pa2-kicker">' + esc(_t("Quête · {t}", { t: hook ? _td(hook.title) : "" })) + '</div><h2 class="pa2-h2">' + esc(_td(t.name)) + '</h2></div></div>';
  h += '<p class="pa2-narr">' + esc(_td(t.found)) + '</p>';
  if (!r) {
    var g = Math.round(run.refGold * R.cacheGold * Pa2Run.lootMult(run) * (Pa2Run.hasRelic("ronce", run) ? PA2_RULES.ronceLoot : 1));
    return h + '<div class="pa2-choices"><button type="button" class="pa2-choice is-q" onclick="pa2TakeCache()">' + pa2Img(PA2_ICONS.cache) + '<span class="pa2-t">' + esc(_td(t.take)) + '</span>' +
      '<span class="pa2-cost is-gold">+' + g + ' ' + esc(_t("or")) + '</span><span class="pa2-s">' + esc(_t("Et peut-être un peu de {x}.", { x: pa2RareName(run.worldId) })) + '</span></button></div>';
  }
  h += '<div class="pa2-verdict is-ok">' + esc(_td(t.got || t.name || "")) + '</div><p class="pa2-result">+' + pa2Num(r.gain) + ' ' + esc(_t("or")) + (r.rare ? ' · ' + esc(pa2RareName(run.worldId)) + ' +' + r.rare : '') + '</p>'; // v3.725.0 : verdict propre au trésor (quest.text.got)
  h += '<p class="pa2-sim is-q">' + esc(_t("Le chemin du retour s'efface. Reviens à la halte, puis repars vers l'avant.")) + '</p>';
  return h + pa2ContinueButton(run);
}
function pa2TakeCache() {
  var run = Pa2Run.getRun(), st = pa2View.sheet;
  pa2Snapshot(run);
  var r = Pa2Run.takeCache();
  if (pa2Fail(r)) { pa2View.hud = null; return; }
  st.res = r.result;
  pa2RenderSheet();
  pa2Reveal(Pa2Run.getRun() || run);
}
function pa2HiddenEnd() { if (pa2Quick(function () { return Pa2Run.hiddenEnd(); })) pa2CloseSheet(); }

// B — le verrou : arrêt au milieu du sentier, Ouvrir (la clé), Forcer (on passe toujours), Rebrousser.
function pa2OpenLockSheet() {
  var run = Pa2Run.getRun();
  if (!run || run.status !== PA2_STATUS.lock || !run.lock) return;
  var r = run.lock.result;
  pa2View.sheet = { lock: true, step: r ? "result" : "intro", res: r || null, shown: !!r };
  pa2RenderSheet();
}
function pa2LockSheetBody(run, st) {
  var t = Pa2Run.questText(run), q = run.quest, kd = q && PA2_QUEST_KEYS[q.key], h;
  h = '<div class="pa2-sheet-head"><div class="pa2-medal is-trap">' + pa2Img(PA2_ICONS.lock) + '</div><div><div class="pa2-kicker">' + esc(_t("Verrou")) + '</div><h2 class="pa2-h2">' + esc(_td(t.name || "")) + '</h2></div></div>';
  if (st.step === "intro") {
    var o = Pa2Run.lockOptions(), kn = kd ? _td(kd.need) : "";
    h += '<p class="pa2-narr">' + esc(_td(t.lock || "")) + '</p><div class="pa2-choices">';
    h += '<button type="button" class="pa2-choice is-q"' + (o.open ? '' : ' disabled') + ' onclick="pa2Lock(\'ouvrir\')">' + pa2Img(kd ? kd.icon : PA2_ICONS.lock) + '<span class="pa2-t">' + esc(_t("Ouvrir")) + '</span>' +
      '<span class="pa2-odds o4"><span class="pa2-w">' + esc(_t("Assuré")) + '</span></span><span class="pa2-s">' + esc(o.open ? _t("Avec {k} : sans jet, sans risque.", { k: kn }) : _t("Il te faut {k}.", { k: kn })) + '</span></button>';
    h += '<button type="button" class="pa2-choice is-q" onclick="pa2Lock(\'forcer\')">' + pa2Img(PA2_ICONS.power) + '<span class="pa2-t">' + esc(_t("Forcer")) + '</span>' + pa2OddsHTML(o.force.cran) +
      '<span class="pa2-s">' + pa2WhyHTML(o.force, run) + '. ' + esc(_t("Tu passes toujours. De justesse : −{b} Souffle. Raté : une blessure et −{d} PV.", { b: o.midBreath, d: o.dmg })) + '</span></button>';
    h += '<button type="button" class="pa2-choice is-q" onclick="pa2Lock(\'rebrousser\')">' + pa2Img(PA2_ICONS.flee) + '<span class="pa2-t">' + esc(_t("Rebrousser")) + '</span>' +
      '<span class="pa2-s">' + esc(_t("Tu restes de ce côté. Le verrou reste.")) + '</span></button></div>';
    return h;
  }
  var r = st.res, out;
  if (r.choice === "forcer") h += pa2DieBlock(r, st.shown);
  if (r.kind === "open") out = '<div class="pa2-verdict is-ok">' + esc(_t("Ouvert")) + '</div><p class="pa2-narr">' + esc(_td(t.open || "")) + '</p>';
  else if (r.kind === "ok") out = '<div class="pa2-verdict is-ok">' + esc(_t("Forcé")) + '</div><p class="pa2-narr">' + esc(_td(t.force || "")) + '</p>';
  else if (r.kind === "mid") out = '<div class="pa2-verdict is-mid">' + esc(_t("De justesse")) + '</div><p class="pa2-narr">' + esc(_td(t.force || "")) + '</p><p class="pa2-result">' + esc(_t("Tu passes, épuisé. −{b} Souffle", { b: PA2_QUEST_RULES.forceMidBreath })) + '</p>';
  else out = '<div class="pa2-verdict is-ko">' + esc(_t("Raté")) + '</div><p class="pa2-result">' + esc(_t("Tu passes quand même, mais pas entier. −{d} PV · une blessure", { d: r.dmg })) + '</p>';
  var ended = run.status === PA2_STATUS.done;
  h += '<div id="pa2-outcome" class="' + (st.shown ? "" : "is-hidden") + '">' + out + '<button type="button" class="kbtn primary" onclick="' + (ended ? 'pa2CloseSheet()' : 'pa2LockGo()') + '">' + esc(ended ? _t("Voir le bilan") : _t("Continuer")) + '</button></div>';
  return h;
}
function pa2Lock(choice) {
  var run = Pa2Run.getRun();
  pa2Snapshot(run);
  var r = Pa2Run.resolveLock(choice);
  if (pa2Fail(r)) { pa2View.hud = null; return; }
  if (choice === "rebrousser") {
    pa2View.hud = null; pa2View.sheet = null; pa2SetSheetHTML(null);
    if (typeof showToast === "function") showToast(_t("Tu rebrousses chemin. Le verrou reste."), 1600);
    pa2Rerender();
    return;
  }
  pa2View.sheet = { lock: true, step: "result", res: r.result, shown: choice !== "forcer" };
  pa2RenderSheet();
  if (choice === "forcer") pa2RollDie(r.result.roll, function () { if (r.result.kind === "ok") pa2Buzz(30); pa2Reveal(Pa2Run.getRun() || run); }, r.result);
  else { pa2Reveal(run); pa2RefreshHud(); }
}
// Le pas reprend du milieu du sentier jusqu'au point visé.
function pa2LockGo() {
  var run = Pa2Run.getRun(), from = run && run.lock ? run.lock.from : null;
  var r = Pa2Run.lockContinue();
  if (pa2Fail(r)) return;
  pa2ClearTimers();
  pa2View.sheet = null; pa2View.hud = null; pa2SetSheetHTML(null);
  pa2View.fromKey = from; pa2View.fromMid = true;
  pa2Rerender();
}

/* ---------- Bilan ---------- */

function buildPa2EndHTML(run) {
  if (run.parcours) return buildPa2ParcoursEndHTML(run);
  var e = run.end || {}, dests = pa2Dests(run), n = Pa2Run.node(run.at, run) || {};
  var title, text, icon = null;
  if (e.how === "ko") {
    title = _t("On te ramène");
    text = Pa2Run.hasPact("retour", run) ? pa2Words(run).koAll : pa2Words(run).koHalf;
  } else if (e.how === "home") {
    title = _t("Retour au feu");
    text = pa2Words(run).home;
  } else if (e.how === "abandon") {
    title = _t("Tu fais demi-tour");
    text = _t("Tu rentres sans finir. Une part du butin reste en route.");
  } else if (e.dest === "boss" && run.flags.guardianPassed) { // v3.454.0 (Crypte) : on a fait le tour ; v3.489.0 : le trieur laisse passer
    icon = pa2Ico("boss", run); title = Pa2Run.guardianSorts(run) ? _t("{n} te laisse passer", { n: _td(dests.boss.name) }) : _t("{n} dort encore", { n: _td(dests.boss.name) }); text = _td(dests.boss.pass || "");
  } else if (e.dest === "boss") {
    icon = pa2Ico("boss", run); title = _t("{n} est tombé", { n: _td(dests.boss.name) }); text = _td(dests.boss.win);
  } else if (e.dest === "cachee") { // v3.724.0
    icon = pa2Ico("cachee", run); title = _td(dests.cachee.name); text = _td(dests.cachee.win);
  } else if (e.dest === "clairiere") {
    icon = pa2Ico("clairiere", run); title = _td(dests.clairiere.name); text = _td(dests.clairiere.win);
  } else {
    icon = pa2Ico("tertre", run);
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
window.pa2OpenPicker = pa2OpenPicker;
window.pa2ClosePicker = pa2ClosePicker;
window.pa2ItemDetail = pa2ItemDetail;
window.pa2AddItem = pa2AddItem;
window.pa2RemoveOne = pa2RemoveOne;
window.pa2NoticeAct = pa2NoticeAct;
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
window.pa2PassGuardian = pa2PassGuardian;
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
window.pa2SearchAgain = pa2SearchAgain; // v3.724.0 : mini-quêtes de parcours
window.pa2AnnounceGo = pa2AnnounceGo;
window.pa2AnnounceLater = pa2AnnounceLater;
window.pa2TakeCache = pa2TakeCache;
window.pa2HiddenEnd = pa2HiddenEnd;
window.pa2Lock = pa2Lock;
window.pa2LockGo = pa2LockGo;
