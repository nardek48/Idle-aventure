"use strict";
/* ui/warehouse-view.js — onglet Entrepôt du Village.
   v3.416.0 (lot VUI-3, atelier village validé par Seb le 01/10/2026, version 8) :
   - tuiles T3 sombres : grande icône, nombre et nom sur un bandeau, filet du plafond pour les
     matières brutes, liseré rouge quand c'est plein, ♻ quand un atelier en fabrique ;
   - un seul filtre en liste déroulante (« Afficher ▼ ») : Tout, familles, Pleins, En fabrication,
     Ma sélection + « Choisir ma sélection… » (feuille à cocher) ; interrupteur « Zéros » à côté.
     Filtre, sélection et zéros sont des préférences d'AFFICHAGE de l'appareil (Prefs), décision Seb ;
   - toucher une tuile ouvre la FEUILLE de la ressource (#village-modal-root) : plafond, d'où ça
     vient, où ça part, réserve protégée (− / + par 10, nombre saisissable), valeur de référence.
   La vente reste retirée (v3.330.0, E6). Ancien écran grille + panneau : COMMENTAIRES_ORIGINAUX.md */

var selectedWarehouseKey = null;   // ressource dont la feuille est ouverte (nom conservé : resetVillageSubScreenState)
var warehousePickerOpen = false;   // feuille « Ma sélection » ouverte
var warehouseMenuOpen = false;     // liste déroulante dépliée
var WAREHOUSE_FILTERS = ["all", "raw", "crafted", "special", "full", "run", "mine"];

/* ---------- Préférences d'affichage (appareil) ---------- */
function getWarehouseFilter() {
  var f = (window.Prefs && Prefs.has("whFilter")) ? Prefs.getValue("whFilter") : "all";
  return WAREHOUSE_FILTERS.indexOf(f) !== -1 ? f : "all";
}
function warehouseShowsZeros() { return !!(window.Prefs && Prefs.has("whZeros") && Prefs.get("whZeros")); }
function getWarehouseHidden() {
  var raw = (window.Prefs && Prefs.has("whHidden")) ? Prefs.getValue("whHidden") : "";
  var o = {};
  String(raw || "").split(",").forEach(function (k) { if (k) o[k] = true; });
  return o;
}
function setWarehouseHidden(o) {
  if (window.Prefs) Prefs.setValue("whHidden", Object.keys(o).filter(function (k) { return o[k]; }).join(","));
}

/* Ancien point d'entrée (Bruts / Tier 1 / Rares) : conservé pour les appelants, il pose le filtre. */
function setWarehouseFilter(f) {
  if (WAREHOUSE_FILTERS.indexOf(f) === -1) f = "all";
  if (window.Prefs) Prefs.setValue("whFilter", f);
  warehouseMenuOpen = false;
  if (typeof renderPanel === "function") renderPanel();
}
window.setWarehouseFilter = setWarehouseFilter;

function toggleWarehouseMenu() {
  warehouseMenuOpen = !warehouseMenuOpen;
  if (typeof renderPanel === "function") renderPanel();
}
window.toggleWarehouseMenu = toggleWarehouseMenu;

function toggleWarehouseZeros() {
  if (window.Prefs) Prefs.set("whZeros", !warehouseShowsZeros());
  if (typeof renderPanel === "function") renderPanel();
  if (warehousePickerOpen) renderWarehousePicker();
}
window.toggleWarehouseZeros = toggleWarehouseZeros;

/* ---------- Données d'une ressource ---------- */
function warehouseTier(key) { return (WAREHOUSE_RESOURCES[key] || {}).tier || "raw"; }

function isWarehouseFull(key) {
  if (warehouseTier(key) !== "raw") return false;
  return WarehouseManager.getCap(key) !== Infinity && WarehouseManager.getFreeSpace(key) <= 0;
}

/* Ateliers dont une recette donne cette ressource. */
function getWorkshopsProducing(key) {
  return Object.keys(WORKSHOPS_CONFIG).filter(function (wid) {
    return (WORKSHOPS_CONFIG[wid].recipes || []).some(function (r) { return r.outputs[0].resourceId === key; });
  });
}
/* Ateliers dont une recette consomme cette ressource. */
function getWorkshopsConsuming(key) {
  return Object.keys(WORKSHOPS_CONFIG).filter(function (wid) {
    return (WORKSHOPS_CONFIG[wid].recipes || []).some(function (r) { return r.inputs.some(function (i) { return i.resourceId === key; }); });
  });
}
function isWarehouseBeingMade(key) {
  return getWorkshopsProducing(key).some(function (wid) {
    var q = WorkshopsSystem.getQueue(wid);
    return q.some(function (e) { var r = WorkshopsSystem.getRecipe(wid, e.recipeId); return r && r.outputs[0].resourceId === key; });
  });
}

/* Débouchés hors ateliers, lus dans les données : constructions, zones, améliorations
   d'atelier, Apothicaire, Taverne, Forge, repas. Une ligne par famille. */
function getWarehouseOtherUses(key) {
  var out = [];
  var vb = [];
  Object.keys(window.VILLAGE_BUILDINGS || {}).forEach(function (id) {
    var d = VILLAGE_BUILDINGS[id];
    var used = (d.costTiers || []).some(function (t) { return (t.resources || []).indexOf(key) !== -1; }) || (d.firstLevelCost && d.firstLevelCost[key]);
    if (used) vb.push(_td(d.name));
  });
  if (vb.length) out.push({ icon: "images/Icons/construction_icon.png", text: _t("Constructions : {x}", { x: vb.join(", ") }) });
  var zones = [];
  Object.keys(window.PRODUCTION_PLOTS_BUILDINGS || {}).forEach(function (bid) {
    var c = PRODUCTION_PLOTS_BUILDINGS[bid];
    var used = [c.unlockCost, c.upgradeCost].concat(Object.keys(c.improvementCost || {}).map(function (k) { return c.improvementCost[k]; }))
      .some(function (x) { return x && (x.resources || []).indexOf(key) !== -1; });
    if (used && PRODUCTION_BUILDINGS[bid]) zones.push(_td(PRODUCTION_BUILDINGS[bid].name));
  });
  if (zones.length) out.push({ icon: "images/Icons/subtabs/production.png", text: _t("Zones de production : {x}", { x: zones.join(", ") }) });
  if (window.WORKSHOP_LEVEL_CONFIG && (WORKSHOP_LEVEL_CONFIG.upgradeCost.resources || []).indexOf(key) !== -1) {
    out.push({ icon: "images/Icons/system/upgrade.png", text: _t("Améliorer les ateliers") });
  }
  if ((window.APOTHECARY_RECIPES || []).some(function (r) { return (r.inputs && r.inputs[key]) || (r.order && r.order[key]); })) {
    out.push({ icon: "images/Icons/village_buildings/apothecary.png", text: _t("Apothicaire : potions") });
  }
  if ((window.TAVERN_CONTRACT_TEMPLATES || []).some(function (t) { return t.resourceId === key; })) {
    out.push({ icon: "images/Icons/village_buildings/tavern.png", text: _t("Contrats de la Taverne") });
  }
  // v3.419.0 (E-2) : la caravane emporte le surplus des matières brutes
  if (window.CaravanManager && CaravanManager.getEligibleKeys().indexOf(key) !== -1) {
    out.push({ icon: "images/Icons/village_buildings/merchant_hall.png", text: _t("Caravane de la Halle (au-delà de la moitié du plafond)") });
  }
  if (["acier", "resine_durcie", "chitine_profondeurs"].indexOf(key) !== -1) {
    out.push({ icon: "images/Icons/village_buildings/village_forge.png", text: _t("Forge : reforge de l'équipement") });
  }
  var def = WAREHOUSE_RESOURCES[key] || {};
  if (def.healPct) out.push({ icon: "images/Icons/quests/village_quest.png", text: _t("Campement : repas (+{p} % PV)", { p: Math.round(def.healPct * 100) }) });
  return out;
}

/* ---------- Tuile T3 ---------- */
function buildWarehouseTileHTML(key) {
  var def = WAREHOUSE_RESOURCES[key];
  var stock = Math.floor(WarehouseManager.getAmount(key));
  var cap = WarehouseManager.getCap(key);
  var full = isWarehouseFull(key);
  var h = '<button type="button" class="wh-tile' + (full ? ' is-full' : '') + (stock === 0 ? ' is-zero' : '') + '" onclick="openWarehouseSheet(\'' + esc(key) + '\')" aria-label="' + esc(_td(def.name)) + '">';
  h += renderIconOrEmojiHTML(def.icon, "wh-tile-img", _td(def.name));
  if (isWarehouseBeingMade(key)) h += '<span class="wh-tile-gear"><img src="images/Icons/system/auto_repeat.png" alt=""></span>';
  h += '<span class="wh-tile-band"><span class="wh-tile-n">' + formatNumber(stock) + '</span><span class="wh-tile-name">' + esc(_td(def.name)) + '</span></span>';
  if (warehouseTier(key) === "raw" && cap !== Infinity) {
    h += '<span class="wh-tile-bar"><span style="width:' + Math.min(100, (stock / cap) * 100) + '%"></span></span>';
  }
  h += '</button>';
  return h;
}

/* ---------- Filtre ---------- */
function warehousePassesFilter(key, f, hidden) {
  if (f === "all") return true;
  if (f === "mine") return !hidden[key];
  if (f === "full") return isWarehouseFull(key);
  if (f === "run") return isWarehouseBeingMade(key);
  var t = warehouseTier(key);
  return f === "raw" ? t === "raw" : f === "crafted" ? t === "crafted" : t === "special";
}

function buildWarehouseFilterRowHTML(keys) {
  var f = getWarehouseFilter(), hidden = getWarehouseHidden(), zeros = warehouseShowsZeros();
  function count(fl) { return keys.filter(function (k) { return warehousePassesFilter(k, fl, hidden) && (zeros || WarehouseManager.getAmount(k) > 0); }).length; }
  var D = [
    ["all", _t("Tout"), "images/Icons/system/warehouse_supplies.png"],
    ["raw", _t("Matières brutes"), "images/Icons/resources/wood_icon.png"],
    ["crafted", _t("Fabriqué"), "images/Icons/resources/plank_icon.png"],
    ["special", _t("Rare"), "images/Icons/resources/seve_aeswyn_icon.png"],
    "-",
    ["full", _t("Pleins"), "images/Icons/system/warning.png", true],
    ["run", _t("En fabrication"), "images/Icons/system/auto_repeat.png"],
    "-",
    ["mine", _t("Ma sélection"), "images/Icons/system/sort.png"]
  ];
  var cur = D.filter(function (d) { return d !== "-" && d[0] === f; })[0];
  var h = '<div class="wh-filter">';
  if (warehouseMenuOpen) h += '<div class="wh-dd-veil" onclick="toggleWarehouseMenu()"></div>'; // toucher ailleurs replie la liste
  h += '<div class="wh-dd' + (warehouseMenuOpen ? ' is-open' : '') + '">';
  h += '<button type="button" class="wh-dd-btn" onclick="toggleWarehouseMenu()"><img src="' + cur[2] + '" alt=""><span><small>' + _t("Afficher") + '</small>' + esc(cur[1]) + '</span><span class="wh-dd-car">▼</span></button>';
  if (warehouseMenuOpen) {
    h += '<div class="wh-dd-menu">';
    D.forEach(function (d) {
      if (d === "-") { h += '<hr>'; return; }
      var n = count(d[0]);
      h += '<button type="button" class="' + (d[0] === f ? 'is-on' : '') + '" onclick="setWarehouseFilter(\'' + d[0] + '\')"><img src="' + d[2] + '" alt="">' + esc(d[1])
        + '<span class="wh-dd-n' + (d[3] && n ? ' is-red' : '') + '">' + n + '</span></button>';
    });
    h += '<button type="button" class="wh-dd-pick" onclick="openWarehousePicker()"><img src="images/Icons/system/sort.png" alt="">' + _t("Choisir ma sélection…") + '</button>';
    h += '</div>';
  }
  h += '</div>';
  h += '<span class="wh-zeros"><button type="button" class="kswitch' + (zeros ? ' is-on' : '') + '" role="switch" aria-checked="' + zeros + '" onclick="toggleWarehouseZeros()"></button>' + _t("Zéros") + '</span>';
  h += '</div>';
  return h;
}

function buildWarehouseHTML() {
  if (typeof HuntQuestManager !== "undefined") HuntQuestManager.ensureDefaults();
  if (typeof WarehouseManager !== "undefined") WarehouseManager.ensure();

  var all = Object.keys(WAREHOUSE_RESOURCES);
  if (!all.length) return '<div class="eq-empty">' + _t("Entrepôt vide pour l'instant.") + '</div>';

  var f = getWarehouseFilter(), hidden = getWarehouseHidden(), zeros = warehouseShowsZeros();
  var h = '';
  // v3.330.0 (E6) : à la première visite, le tavernier explique la fin de la vente
  if (!(game.genericTutorialsSeen || {}).warehouse_no_sale) {
    h += '<div class="warehouse-note">'
       + '<div class="warehouse-note-text"><strong>' + _t("Le tavernier") + '</strong> : « ' + _t("L’Entrepôt ne rachète plus rien. Ce qu’il te reste, porte-le-moi : mes contrats paient mieux, et on sait ce qu’on te demande.") + ' »</div>'
       + '<button type="button" class="settings-btn" onclick="dismissWarehouseNoSaleNote()">' + _t("Compris") + '</button></div>';
  }
  var nFull = all.filter(isWarehouseFull).length;
  if (nFull) h += '<div class="wh-warn">' + esc(_tn(nFull, "{n} ressource au plafond : sa production est à l'arrêt.", "{n} ressources au plafond : leur production est à l'arrêt.")) + '</div>';

  h += buildWarehouseFilterRowHTML(all);

  var shown = all.filter(function (k) { return warehousePassesFilter(k, f, hidden); });
  var zeroHidden = zeros ? 0 : shown.filter(function (k) { return WarehouseManager.getAmount(k) <= 0; }).length;
  if (!zeros) shown = shown.filter(function (k) { return WarehouseManager.getAmount(k) > 0; });

  var groups = [
    ["raw", _t("Matières brutes · plafond {n}", { n: formatNumber(WarehouseManager.getCap("bois")) })],
    ["crafted", _t("Fabriqué")],
    ["special", _t("Rare")]
  ];
  var any = false;
  groups.forEach(function (g) {
    var ks = shown.filter(function (k) { return warehouseTier(k) === g[0]; });
    if (!ks.length) return;
    any = true;
    h += '<div class="ksec"><span>' + esc(g[1]) + '</span></div>';
    h += '<div class="wh-grid">' + ks.map(buildWarehouseTileHTML).join("") + '</div>';
  });
  if (!any) h += '<div class="eq-empty">' + _t("Aucune ressource pour ce filtre.") + '</div>';
  if (zeroHidden) h += '<p class="wh-zero-note">' + esc(_tn(zeroHidden, "{n} ressource à zéro masquée", "{n} ressources à zéro masquées")) + '</p>';
  return h;
}
window.buildWarehouseHTML = buildWarehouseHTML;

function dismissWarehouseNoSaleNote() {
  if (!game.genericTutorialsSeen || typeof game.genericTutorialsSeen !== "object") game.genericTutorialsSeen = {};
  game.genericTutorialsSeen.warehouse_no_sale = true;
  if (typeof saveGame === "function") saveGame();
  if (typeof renderPanel === "function") renderPanel();
}
window.dismissWarehouseNoSaleNote = dismissWarehouseNoSaleNote;

/* ---------- Feuille d'une ressource ---------- */
/* v3.98.13 : réserve protégée — le chaînage AUTOMATIQUE des ateliers ne la consomme jamais. */
function commitWarehouseReserve(key, rawValue) {
  if (!key) return;
  ResourceReserveManager.setReserve(key, rawValue);
  if (selectedWarehouseKey === key) renderWarehouseSheet(true);
}
window.commitWarehouseReserve = commitWarehouseReserve;

function stepWarehouseReserve(key, delta) {
  var r = ResourceReserveManager.getReserve(key) || 0;
  commitWarehouseReserve(key, Math.max(0, r + delta));
}
window.stepWarehouseReserve = stepWarehouseReserve;

function openWarehouseSheet(key) {
  if (!WAREHOUSE_RESOURCES[key]) return;
  selectedWarehouseKey = key;
  warehousePickerOpen = false;
  warehouseMenuOpen = false;
  if (typeof productionDetailBuildingId !== "undefined") productionDetailBuildingId = null;
  if (typeof openWorkshopId !== "undefined") openWorkshopId = null;
  renderWarehouseSheet(false);
}
window.openWarehouseSheet = openWarehouseSheet;

function closeWarehouseSheet() {
  selectedWarehouseKey = null;
  warehousePickerOpen = false;
  if (typeof document === "undefined") return;
  var host = document.getElementById("village-modal-root");
  if (host && host.querySelector(".wh-sheet")) host.innerHTML = "";
}
window.closeWarehouseSheet = closeWarehouseSheet;

function closeWarehouseSheetFromBackdrop(e) {
  if (e && e.target && e.target.classList && e.target.classList.contains("full-menu-overlay")) closeWarehouseSheet();
}
window.closeWarehouseSheetFromBackdrop = closeWarehouseSheetFromBackdrop;

/* Depuis la feuille d'une ressource vers un bâtiment ou un atelier : une seule feuille à la fois. */
function warehouseGoTo(kind, id) {
  selectedWarehouseKey = null;
  if (kind === "building") openProductionBuildingDetail(id);
  else openWorkshopSheet(id);
}
window.warehouseGoTo = warehouseGoTo;

function renderWarehouseSheet(keepScroll) {
  if (typeof document === "undefined") return;
  var host = document.getElementById("village-modal-root");
  if (!host) return;
  var html = warehousePickerOpen ? buildWarehousePickerHTML() : (selectedWarehouseKey ? buildWarehouseSheetHTML(selectedWarehouseKey) : "");
  if (!html) return;
  var body = host.querySelector(".wh-sheet .ksheet-body");
  var top = (keepScroll && body) ? body.scrollTop : 0;
  host.innerHTML = html;
  var nb = host.querySelector(".wh-sheet .ksheet-body");
  if (nb && top) nb.scrollTop = top;
}

/* Appelée à chaque rendu du Village : redessine la feuille de l'Entrepôt ouverte. Rend vrai si elle l'a fait. */
function refreshWarehouseSheets() {
  if (typeof document === "undefined" || (!selectedWarehouseKey && !warehousePickerOpen)) return false;
  var host = document.getElementById("village-modal-root");
  if (!host || !host.querySelector(".wh-sheet")) return false;
  renderWarehouseSheet(true);
  return true;
}
window.refreshWarehouseSheets = refreshWarehouseSheets;

function buildWarehouseWorkshopLineHTML(wid) {
  var w = Object.assign({ id: wid }, WORKSHOPS_CONFIG[wid]);
  var state = getWorkshopTileState(w);
  var pill = state === "run" ? ['is-run', _t("En cours")] : state === "idle" ? ['is-idle', _t("Libre")] : state === "soon" ? ['is-soon', _t("Bientôt")] : ['is-block', state === "stalled" ? _t("À l'arrêt") : _t("Bloqué")];
  var b = PRODUCTION_BUILDINGS[w.buildingId] || {};
  var h = '<button type="button" class="wh-line"' + (state === "soon" ? ' disabled' : ' onclick="warehouseGoTo(\'workshop\', \'' + wid + '\')"') + '>';
  h += renderIconOrEmojiHTML(w.icon, "wh-line-img", _td(w.name));
  h += '<span class="wh-line-t"><b>' + esc(_td(w.name)) + '</b><small>' + esc(_td(b.name || "")) + '</small></span>';
  h += '<span class="wh-pill ' + pill[0] + '">' + esc(pill[1]) + '</span>';
  if (state !== "soon") h += '<span class="wh-line-chev">›</span>';
  return h + '</button>';
}

function buildWarehouseSheetHTML(key) {
  var def = WAREHOUSE_RESOURCES[key];
  if (!def) return "";
  var stock = Math.floor(WarehouseManager.getAmount(key));
  var cap = WarehouseManager.getCap(key);
  var full = isWarehouseFull(key);
  var bid = Object.keys(PRODUCTION_BUILDINGS).filter(function (id) { return PRODUCTION_BUILDINGS[id].resourceKey === key; })[0];

  var h = '<div class="full-menu-overlay" onclick="closeWarehouseSheetFromBackdrop(event)">';
  h += '<div class="full-menu vb-sheet-card wh-sheet" onclick="event.stopPropagation()">';
  h += kSheetHeadHTML({
    icon: renderIconOrEmojiHTML(def.icon, "vb-sheet-icon", _td(def.name)),
    title: esc(_td(def.name)),
    sub: esc(cap !== Infinity ? _t("{a} / {b} en stock", { a: formatNumber(stock), b: formatNumber(cap) }) : _t("{a} en stock", { a: formatNumber(stock) })),
    close: "closeWarehouseSheet()"
  });
  h += '<div class="ksheet-body">';
  if (def.desc) h += '<p class="wh-desc">' + esc(_td(def.desc)) + '</p>';

  if (cap !== Infinity) {
    h += '<div class="wh-cap"><div class="kgauge kgauge-thin ' + (full ? 'kgauge-hp' : 'kgauge-xp') + '"><div class="kgauge-track"><div class="kgauge-fill" style="width:' + Math.min(100, (stock / cap) * 100) + '%"></div></div>'
      + '<span class="kgauge-text">' + formatNumber(stock) + ' / ' + formatNumber(cap) + '</span></div>';
    if (full && bid) h += '<p class="wh-cap-warn">' + esc(_t("Au plafond : {x} ne produit plus.", { x: _td(PRODUCTION_BUILDINGS[bid].name) })) + '</p>';
    h += '</div>';
  }

  // D'où ça vient
  h += '<div class="ksec"><span>' + _t("D'où ça vient") + '</span></div>';
  var srcCount = 0;
  if (bid) {
    var pb = PRODUCTION_BUILDINGS[bid];
    var unlocked = ProductionManager.isBuildingUnlocked(bid);
    var lstock = Math.floor(ProductionManager.getStock(bid)), lcap = ProductionManager.getCapacity(bid);
    h += '<button type="button" class="wh-line"' + (unlocked ? ' onclick="warehouseGoTo(\'building\', \'' + bid + '\')"' : ' disabled') + '>';
    h += renderIconOrEmojiHTML(pb.buildingImage, "wh-line-img", _td(pb.name));
    h += '<span class="wh-line-t"><b>' + esc(_td(pb.name)) + '</b><small>' + (unlocked
      ? esc(_t("+{n}/min · en attente {a} / {b}", { n: formatNumber(ProductionManager.getRatePerMin(bid)), a: formatNumber(lstock), b: formatNumber(lcap) }))
      : _t("À débloquer")) + '</small></span>';
    if (unlocked && lcap > 0 && lstock >= lcap) h += '<span class="wh-pill ' + (full ? 'is-block' : 'is-run') + '">' + (full ? _t("Bloqué") : _t("Récolter")) + '</span>';
    if (unlocked) h += '<span class="wh-line-chev">›</span>';
    h += '</button>';
    srcCount++;
  }
  getWorkshopsProducing(key).forEach(function (wid) {
    if (!ProductionManager.isBuildingUnlocked(WORKSHOPS_CONFIG[wid].buildingId)) return;
    h += buildWarehouseWorkshopLineHTML(wid); srcCount++;
  });
  if (!srcCount) h += '<div class="wh-line is-text"><span class="wh-line-t"><small>' + esc(def.sourceHint ? _td(def.sourceHint) : _t("Butin : expéditions, Petites Aventures et élites.")) + '</small></span></div>';

  // Où ça part
  h += '<div class="ksec"><span>' + _t("Où ça part") + '</span></div>';
  var uses = 0;
  getWorkshopsConsuming(key).forEach(function (wid) {
    if (!ProductionManager.isBuildingUnlocked(WORKSHOPS_CONFIG[wid].buildingId)) return;
    h += buildWarehouseWorkshopLineHTML(wid); uses++;
  });
  getWarehouseOtherUses(key).forEach(function (u) {
    h += '<div class="wh-line is-text"><img class="wh-line-ico" src="' + u.icon + '" alt=""><span class="wh-line-t"><small>' + esc(u.text) + '</small></span></div>'; uses++;
  });
  if (!uses) h += '<div class="wh-line is-text"><span class="wh-line-t"><small>' + _t("Rien pour l'instant : elle servira plus tard.") + '</small></span></div>';

  // Réserve protégée (les ressources qu'un atelier consomme)
  if (getWorkshopsConsuming(key).length) {
    var r = ResourceReserveManager.getReserve(key) || 0;
    h += '<div class="ksec"><img src="images/Icons/system/lock_closed.png" alt=""><span>' + _t("Réserve protégée") + '</span></div>';
    h += '<div class="wh-resv">';
    h += '<div class="wh-resv-row"><button type="button" class="wh-step" onclick="stepWarehouseReserve(\'' + esc(key) + '\', -10)"' + (r <= 0 ? ' disabled' : '') + '>−</button>';
    h += '<input class="wh-resv-n" type="number" inputmode="numeric" min="0" step="1" value="' + r + '" onchange="commitWarehouseReserve(\'' + esc(key) + '\', this.value)" aria-label="' + esc(_t("Réserve protégée")) + '">';
    h += '<button type="button" class="wh-step" onclick="stepWarehouseReserve(\'' + esc(key) + '\', 10)">+</button></div>';
    h += '<p class="wh-resv-hint">' + esc(_t("Les ateliers en Continu ne descendent jamais sous ce nombre. Libre : {n}", { n: formatNumber(Math.max(0, stock - r)) })) + '</p>';
    h += '</div>';
  }

  // Valeur de référence (Taverne) — v3.330.0 (E6) : plus de vente
  var refValue = Number(def.sellPrice || 0);
  h += '<p class="wh-ref">' + (refValue > 0
    ? esc(_t("Valeur de référence : {n} or. Se livre à la Taverne, dans ses contrats.", { n: formatNumber(refValue) }))
    : esc(_t("Ne se vend pas : sert aux constructions et aux ateliers."))) + '</p>';

  h += '</div></div></div>';
  return h;
}
window.buildWarehouseSheetHTML = buildWarehouseSheetHTML;

/* ---------- Feuille « Ma sélection » ---------- */
function openWarehousePicker() {
  warehousePickerOpen = true;
  warehouseMenuOpen = false;
  selectedWarehouseKey = null;
  if (typeof renderPanel === "function") renderPanel();
  renderWarehouseSheet(false);
}
window.openWarehousePicker = openWarehousePicker;

function toggleWarehousePick(key) {
  var o = getWarehouseHidden();
  o[key] = !o[key];
  setWarehouseHidden(o);
  renderWarehouseSheet(true);
}
window.toggleWarehousePick = toggleWarehousePick;

function warehousePickAll(mode) {
  var o = {};
  if (mode === "zeros") Object.keys(WAREHOUSE_RESOURCES).forEach(function (k) { if (WarehouseManager.getAmount(k) <= 0) o[k] = true; });
  setWarehouseHidden(o);
  renderWarehouseSheet(true);
}
window.warehousePickAll = warehousePickAll;

function validateWarehousePicker() {
  warehousePickerOpen = false;
  if (window.Prefs) Prefs.setValue("whFilter", "mine");
  var host = typeof document !== "undefined" ? document.getElementById("village-modal-root") : null;
  if (host) host.innerHTML = "";
  if (typeof renderPanel === "function") renderPanel();
}
window.validateWarehousePicker = validateWarehousePicker;

function closeWarehousePicker() {
  warehousePickerOpen = false;
  var host = typeof document !== "undefined" ? document.getElementById("village-modal-root") : null;
  if (host) host.innerHTML = "";
}
window.closeWarehousePicker = closeWarehousePicker;

function buildWarehousePickerHTML() {
  var hidden = getWarehouseHidden();
  var all = Object.keys(WAREHOUSE_RESOURCES);
  var h = '<div class="full-menu-overlay" onclick="if (event.target === this) closeWarehousePicker()">';
  h += '<div class="full-menu vb-sheet-card wh-sheet wh-picker" onclick="event.stopPropagation()">';
  h += kSheetHeadHTML({
    icon: '<img class="vb-sheet-icon" src="images/Icons/system/sort.png" alt="">',
    title: _t("Ma sélection"),
    sub: _t("Touche une ressource pour la montrer ou la cacher"),
    close: "closeWarehousePicker()"
  });
  h += '<div class="ksheet-body">';
  h += '<div class="wh-pick-q"><button type="button" class="kbtn" onclick="warehousePickAll(\'all\')">' + _t("Tout afficher") + '</button>'
    + '<button type="button" class="kbtn" onclick="warehousePickAll(\'zeros\')">' + _t("Cacher les zéros") + '</button></div>';
  [["raw", _t("Matières brutes")], ["crafted", _t("Fabriqué")], ["special", _t("Rare")]].forEach(function (g) {
    var ks = all.filter(function (k) { return warehouseTier(k) === g[0]; });
    if (!ks.length) return;
    h += '<div class="ksec"><span>' + esc(g[1]) + '</span></div><div class="wh-pick">';
    ks.forEach(function (k) {
      var d = WAREHOUSE_RESOURCES[k];
      h += '<button type="button" class="wh-pk' + (hidden[k] ? ' is-off' : '') + '" onclick="toggleWarehousePick(\'' + esc(k) + '\')" aria-pressed="' + !hidden[k] + '">'
        + renderIconOrEmojiHTML(d.icon, "", _td(d.name)) + '<small>' + esc(_td(d.name)) + '</small></button>';
    });
    h += '</div>';
  });
  h += '<button type="button" class="kbtn primary wh-pick-ok" onclick="validateWarehousePicker()">' + _t("Valider") + '</button>';
  h += '</div></div></div>';
  return h;
}
window.buildWarehousePickerHTML = buildWarehousePickerHTML;
