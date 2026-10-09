"use strict";
/* ui/or-a-investir-view.js — v3.429.24 (option A, atelier/or-a-investir.html validé par Seb) :
   bulle dorée du dock quand une dépense d'or est payable TOUT DE SUITE (or + matériaux).
   Elle se tait une fois ouverte et ne revient que pour une NOUVELLE dépense payable.
   Dépenses suivies : bâtiments du village, reforges, compagnons, entraînement.
   Boutique, potions, enchantement et parcelles ont leur propre parcours : laissés de côté. */

var OR_INVEST_ICON = "images/Icons/gold_icon.png";
var OR_INVEST_MIN_GOLD = 1000; // en dessous, pas de bulle : l'or se dépense de lui-même
var orInvestSeen = {};          // dépenses déjà montrées (mémoire vive : un rechargement la vide)
var orInvestShown = [];         // dépenses de la fenêtre ouverte : le toucher agit sur ce qui est vu
var orInvestCache = null;

function orInvestHeroBusy() { return !!(window.heroLockReason && heroLockReason()); }

/* Chantiers du village payables, Atelier d'abord (il ouvre les autres), puis Forge, puis le moins cher. */
function orInvestBuildings() {
  if (!window.VillageBuildingManager || !Array.isArray(window.VILLAGE_BUILDING_ORDER)) return [];
  if (typeof isTabUnlocked === "function" && !isTabUnlocked("village")) return [];
  var out = [];
  VILLAGE_BUILDING_ORDER.forEach(function (id) {
    var def = VILLAGE_BUILDINGS[id];
    if (!def || VillageBuildingManager.getBlockReason(id) !== null) return;
    var cost = VillageBuildingManager.getNextCost(id) || {}, lvl = VillageBuildingManager.getLevel(id);
    out.push({ id: "b:" + id + ":" + (lvl + 1), rank: id === "workshop" ? 0 : (id === "forge" ? 1 : 2), gold: Number(cost.gold || 0),
      icon: def.iconImg || def.icon, title: lvl ? _t("{x} niv. {n}", { x: _td(def.name), n: lvl + 1 }) : _t("Construire : {x}", { x: _td(def.name) }),
      sub: VillageBuildingManager.getEffectLabel(id, lvl + 1), cost: cost, go: function () { orInvestGoBuilding(id); } });
  });
  return out;
}

/* Reforges payables (Forge construite, héros au village). */
function orInvestReforges() {
  if (!window.ForgeManager || !Array.isArray(window.EQUIPMENT_SLOTS) || ForgeManager.getBuildingLevel() <= 0 || orInvestHeroBusy()) return [];
  var out = [];
  EQUIPMENT_SLOTS.forEach(function (slot) {
    if (ForgeManager.getBlockReason(slot) !== null) return;
    var cost = ForgeManager.getCost(slot) || {}, lvl = ForgeManager.getLevel(slot);
    var name = (window.EQUIPMENT_SLOT_LABELS && EQUIPMENT_SLOT_LABELS[slot]) ? _td(EQUIPMENT_SLOT_LABELS[slot]) : slot;
    out.push({ id: "r:" + slot + ":" + (lvl + 1), rank: 3, gold: Number(cost.gold || 0), icon: VILLAGE_BUILDINGS.forge.iconImg || VILLAGE_BUILDINGS.forge.icon,
      title: _t("Reforger : {x}", { x: name }), sub: _t("niv. {a} → {b}", { a: lvl, b: lvl + 1 }), cost: cost, go: function () { orInvestGoBuilding("forge"); } });
  });
  return out;
}

/* Améliorations de compagnons payables. */
function orInvestCompanions() {
  if (!window.CompanionManager || typeof getCompanionUpgradeCost !== "function" || orInvestHeroBusy()) return [];
  var out = [];
  CompanionManager.unlockedIds().forEach(function (cid) {
    var st = CompanionManager.state(cid), def = typeof getCompanionDef === "function" ? getCompanionDef(cid) : null;
    var cost = st ? getCompanionUpgradeCost(cid, st.upgrades) : null;
    if (cost == null || Number(game.gold || 0) < cost) return;
    var pct = def && def.upgrades && def.upgrades.statPct ? Math.round(def.upgrades.statPct * 100) : 0;
    out.push({ id: "c:" + cid + ":" + (st.upgrades + 1), rank: 4, gold: cost, icon: def ? def.image : OR_INVEST_ICON,
      title: _t("{x} niv. {n}", { x: def ? _td(def.name) : cid, n: st.upgrades + 2 }), sub: pct ? _t("+{n} % à ses stats", { n: pct }) : "",
      cost: { gold: cost }, go: function () { orInvestGoHeros("companions"); } });
  });
  return out;
}

/* Entraînement : une seule ligne, la caractéristique la moins chère sous le plafond du Terrain. */
function orInvestTraining() {
  if (!Array.isArray(window.UPGRADES) || typeof getUpgradeCost !== "function" || orInvestHeroBusy()) return [];
  var best = null, wi = window.WorldManager ? Number(WorldManager.worldIndex || 0) : 0;
  UPGRADES.forEach(function (u) {
    if (!isTrainingUpgradeId(u.id) || wi < (u.unlockWorld || 0)) return;
    var lvl = Number((game.upgrades && game.upgrades[u.id]) || 0);
    if (lvl >= getUpgradeCap(u)) return;
    var cost = getUpgradeCost(u, lvl);
    if (Number(game.gold || 0) >= cost && (!best || cost < best.gold)) best = { u: u, gold: cost };
  });
  if (!best) return [];
  // Clé au plafond du Terrain : la ligne ne revient qu'à un nouveau plafond, pas à chaque point acheté
  return [{ id: "t:" + getTrainingCapLevels(), rank: 5, gold: best.gold, icon: best.u.icon, title: _t("Entraînement"),
    sub: _t("Plafond du Terrain : {n}", { n: getTrainingCapLevels() }), cost: { gold: best.gold }, go: function () { orInvestGoHeros("amelioration"); } }];
}

/* Toutes les dépenses payables, la meilleure d'abord. */
function orInvestList() {
  var list = [].concat(orInvestBuildings(), orInvestReforges(), orInvestCompanions(), orInvestTraining());
  list.sort(function (a, b) { return (a.rank - b.rank) || (a.gold - b.gold); });
  return list;
}

/* L'Atelier qui ferme la Forge, quand il ne manque que des matériaux : montré en tête,
   il ne déclenche jamais la bulle à lui seul. */
function orInvestGate() {
  var V = window.VillageBuildingManager;
  if (!V || !window.VILLAGE_BUILDINGS || !VILLAGE_BUILDINGS.forge || V.getLevel("forge") > 0 || V.isBuilding() || V.isMaxLevel("workshop")) return null;
  var need = VILLAGE_RANK_THRESHOLDS[VILLAGE_BUILDINGS.forge.rank - 1];
  if (V.getRank() >= VILLAGE_BUILDINGS.forge.rank || V.getLevel("workshop") + 1 !== need) return null;
  var cost = V.getNextCost("workshop"), aff = V.getAffordability("workshop");
  if (!cost || aff.all || !aff.gold) return null;
  var miss = Object.keys(cost).filter(function (k) { return k !== "gold" && !aff[k]; })[0];
  var def = VILLAGE_BUILDINGS.workshop;
  return { id: "gate", gate: true, gold: Number(cost.gold || 0), icon: def.iconImg || def.icon, cost: cost, miss: miss,
    title: _t("{x} niv. {n}", { x: _td(def.name), n: need }), sub: _t("Il ouvre la Forge : ton or pourra renforcer ton équipement."),
    go: function () { orInvestGoProducer(miss); } };
}

/* Calcul une fois par seconde au plus : le dock se redessine à chaque image. */
function orInvestState() {
  var now = Date.now();
  if (orInvestCache && now - orInvestCache.at < 1000) return orInvestCache;
  var list = Number(game.gold || 0) >= OR_INVEST_MIN_GOLD ? orInvestList() : [];
  var fresh = list.some(function (s) { return !orInvestSeen[s.id]; });
  orInvestCache = { at: now, list: list, fresh: fresh };
  return orInvestCache;
}
window.orInvestReset = function () { orInvestCache = null; };

/* Bulle du dock, ou null. */
function hudDockOr() {
  var s = orInvestState();
  if (!s.fresh) return null;
  return { k: "or", icon: OR_INVEST_ICON, badge: "", tip: _t("{n} or à investir", { n: formatNumber(Math.floor(game.gold || 0)) }), go: "openOrInvestWindow()" };
}
window.hudDockOr = hudDockOr;

function orInvestCostHTML(cost) {
  return Object.keys(cost || {}).map(function (k) {
    var have = k === "gold" ? Number(game.gold || 0) : (window.WarehouseManager ? WarehouseManager.getAmount(k) : 0);
    var res = k === "gold" ? null : (window.WAREHOUSE_RESOURCES && WAREHOUSE_RESOURCES[k]);
    var ico = k === "gold" ? OR_INVEST_ICON : (res && res.icon);
    var txt = k === "gold" ? formatNumber(cost[k]) : formatNumber(Math.min(have, cost[k])) + " / " + formatNumber(cost[k]);
    var name = k === "gold" ? _t("or") : (res ? _td(res.name) : k);
    return '<span class="oi-chip ' + (have >= cost[k] ? "is-ok" : "is-ko") + '">' + (ico ? renderIconOrEmojiHTML(ico, "oi-chip-ico", name) : esc(name) + " ") + esc(txt) + '</span>';
  }).join("");
}

function openOrInvestWindow() {
  orInvestCache = null;
  var s = orInvestState(), gate = orInvestGate(), list = s.list.slice();
  s.list.forEach(function (x) { orInvestSeen[x.id] = true; });
  orInvestCache = null;
  var best = gate || list.shift();
  if (!best) return;
  var also = list.slice(0, 4);
  orInvestShown = [best].concat(also);
  var h = '<div class="kwin-veil oi-bg" onclick="if(event.target===this)closeOrInvestWindow()"><div class="kwin oi-win">';
  h += kWinHeadHTML({ icon: renderIconOrEmojiHTML(OR_INVEST_ICON, "fr-row-ico", _t("Or")), title: esc(_t("Ton or peut servir")),
    sub: esc(_t("{n} or en poche", { n: formatNumber(Math.floor(game.gold || 0)) })), close: "closeOrInvestWindow()" });
  h += '<div class="kwin-body"><div class="oi-best">' + renderIconOrEmojiHTML(best.icon, "oi-best-ico", best.title) +
    '<div class="oi-best-txt"><b>' + esc(best.title) + '</b><span>' + esc(best.sub) + '</span></div>' +
    '<div class="oi-cost">' + orInvestCostHTML(best.cost) + '</div>';
  if (best.gate && best.miss) {
    var res = window.WAREHOUSE_RESOURCES && WAREHOUSE_RESOURCES[best.miss], prod = typeof findResourceProducer === "function" ? findResourceProducer(best.miss) : null;
    var n = Number(best.cost[best.miss] || 0) - (window.WarehouseManager ? WarehouseManager.getAmount(best.miss) : 0);
    h += '<p class="oi-hint">' + esc(_t("{x} : il en manque {n}.", { n: formatNumber(n), x: res ? _td(res.name) : best.miss }) +
      (prod ? " " + _t("Production : {x}.", { x: prod.name }) : "")) + '</p>';
  }
  h += '</div>';
  if (also.length) {
    h += '<div class="oi-also">' + esc(_t("Aussi ouvert")) + '</div>';
    also.forEach(function (x, i) {
      h += '<button type="button" class="oi-alt" onclick="orInvestGo(' + (i + 1) + ')">' + renderIconOrEmojiHTML(x.icon, "oi-alt-ico", x.title) +
        '<span class="oi-alt-lbl">' + esc(x.title) + (x.sub ? '<small>' + esc(x.sub) + '</small>' : '') + '</span>' +
        '<span class="oi-alt-px">' + formatNumber(x.gold) + renderIconOrEmojiHTML(OR_INVEST_ICON, "oi-px-ico", _t("or")) + '</span></button>';
    });
  }
  h += '</div><div class="kwin-foot"><button type="button" class="kbtn primary oi-go" onclick="orInvestGo(0)">' +
    esc(best.gate ? _t("Aller produire") : _t("J'y vais")) + '</button></div></div></div>';
  var root = document.getElementById("or-invest-root");
  if (!root && document.body) { root = document.createElement("div"); root.id = "or-invest-root"; document.body.appendChild(root); }
  if (root) root.innerHTML = h;
  if (typeof renderHudDock === "function") renderHudDock();
}
window.openOrInvestWindow = openOrInvestWindow;

function closeOrInvestWindow() {
  var root = document.getElementById("or-invest-root");
  if (root) root.innerHTML = "";
}
window.closeOrInvestWindow = closeOrInvestWindow;

function orInvestGo(i) {
  var x = orInvestShown[i || 0];
  closeOrInvestWindow();
  orInvestShown = [];
  if (x && typeof x.go === "function") x.go();
}
window.orInvestGo = orInvestGo;

/* Destinations : la fiche du bâtiment, l'écran Héros, ou le producteur du matériau manquant. */
function orInvestGoBuilding(id) {
  if (typeof switchTab === "function") switchTab("village");
  if (typeof setVillageSubTab === "function") setVillageSubTab("buildings");
  if (typeof openVillageBuildingSheet === "function") openVillageBuildingSheet(id);
}
function orInvestGoHeros(sub) {
  if (typeof switchTab === "function") switchTab("more"); // onglet Personnage (voir goToHeroTraining)
  if (typeof setHerosSubTab === "function") setHerosSubTab(sub);
}
function orInvestGoProducer(resKey) {
  var prod = typeof findResourceProducer === "function" ? findResourceProducer(resKey) : null;
  if (typeof switchTab === "function") switchTab("village");
  if (typeof setVillageSubTab === "function") setVillageSubTab("production");
  if (prod && typeof goToResourceProducer === "function") goToResourceProducer(prod.kind, prod.id);
}

window.orInvestList = orInvestList;
window.orInvestGate = orInvestGate;
