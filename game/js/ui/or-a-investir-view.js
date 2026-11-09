"use strict";
/* ui/or-a-investir-view.js — « + » doré du bandeau (bulle du dock en large) et fenêtre « Ton or peut servir ».
   Atelier bulle-or.html (Seb) : retour quand l'or double (A), trois groupes (B), une carte par matériau (B) ; rien n'est sauvegardé. */

var OR_INVEST_ICON = "images/Icons/gold_icon.webp";
var OR_INVEST_SHOP_ICON = "images/Icons/subtabs/equipment_shop.webp";
var OR_INVEST_MIN_GOLD = 1000;     // en dessous, pas de bulle : l'or se dépense de lui-même
var OR_INVEST_DOUBLE_MIN = 10000;  // or-retour A : l'or doublé ne rallume le « + » qu'au-dessus de ce seuil
var OR_INVEST_KO_ROWS = 6;         // lignes « Il manque quelque chose » montrées (les cartes comptent tout)
var OR_INVEST_MAT_CARDS = 3;       // cartes de matériau au plus, celles qui retiennent le plus d'or d'abord
var OR_INVEST_LATER_ROWS = 6;
var orInvestSeen = {};          // dépenses déjà montrées (mémoire vive : un rechargement la vide)
var orInvestGoldRef = null;     // or à la dernière ouverture (mémoire vive, comme orInvestSeen)
var orInvestShown = [];         // cibles de la fenêtre ouverte : le toucher agit sur ce qui est vu
var orInvestCache = null;

/* Intérêt (atelier, tri proposé) : gain mesuré d'abord, puis rangs et paliers (+8 %), le reste ensuite. */
var OR_INVEST_INTERET = { shopUp: 100, skill: 90, workshop: 85, companion: 80, compRank: 60, enchanter: 45, relic: 40, training: 35, reforge: 30, forge: 29, building: 28, refresh: 5 };

function orInvestHeroBusy() { return !!(window.heroLockReason && heroLockReason()); }
function orInvestHave(k) { return k === "gold" ? Number(game.gold || 0) : (window.WarehouseManager ? WarehouseManager.getAmount(k) : 0); }
function orInvestCanPay(cost) { return Object.keys(cost || {}).every(function (k) { return orInvestHave(k) >= cost[k]; }); }
function orInvestResName(k) { var r = window.WAREHOUSE_RESOURCES && WAREHOUSE_RESOURCES[k]; return k === "gold" ? _t("or") : (r ? _td(r.name) : k); }

/* Chantiers du village : payables, ou bloqués par l'or ou un matériau (les autres verrous restent muets). */
function orInvestBuildings() {
  if (!window.VillageBuildingManager || !Array.isArray(window.VILLAGE_BUILDING_ORDER)) return [];
  if (typeof isTabUnlocked === "function" && !isTabUnlocked("village")) return [];
  var out = [], short = _t("Matériaux manquants"), I = OR_INVEST_INTERET;
  VILLAGE_BUILDING_ORDER.forEach(function (id) {
    var def = VILLAGE_BUILDINGS[id], why = def ? VillageBuildingManager.getBlockReason(id) : "";
    if (!def || (why !== null && why !== short)) return;
    var cost = VillageBuildingManager.getNextCost(id) || {}, lvl = VillageBuildingManager.getLevel(id);
    out.push({ id: "b:" + id + ":" + (lvl + 1), kind: "b", ok: why === null, gold: Number(cost.gold || 0),
      interet: id === "workshop" ? I.workshop : id === "forge" ? I.forge : (id === "enchanter" && !lvl) ? I.enchanter : I.building,
      icon: def.iconImg || def.icon, title: lvl ? _t("{x} niv. {n}", { x: _td(def.name), n: lvl + 1 }) : _t("Construire : {x}", { x: _td(def.name) }),
      sub: VillageBuildingManager.getEffectLabel(id, lvl + 1), cost: cost, go: function () { orInvestGoBuilding(id); } });
  });
  return out;
}

/* Reforges (Forge construite, héros au village) : le gain de la Forge des mondes (v3.743). */
function orInvestReforges() {
  if (!window.ForgeManager || !Array.isArray(window.EQUIPMENT_SLOTS) || ForgeManager.getBuildingLevel() <= 0 || orInvestHeroBusy()) return [];
  var out = [], short = _t("Matériaux manquants");
  EQUIPMENT_SLOTS.forEach(function (slot) {
    var why = ForgeManager.getBlockReason(slot);
    if (why !== null && why !== short) return;
    var cost = ForgeManager.getCost(slot) || {}, lvl = ForgeManager.getLevel(slot);
    var name = (window.EQUIPMENT_SLOT_LABELS && EQUIPMENT_SLOT_LABELS[slot]) ? _td(EQUIPMENT_SLOT_LABELS[slot]) : slot;
    out.push({ id: "r:" + slot + ":" + (lvl + 1), kind: "r", ok: why === null, interet: OR_INVEST_INTERET.reforge, gold: Number(cost.gold || 0),
      icon: VILLAGE_BUILDINGS.forge.iconImg || VILLAGE_BUILDINGS.forge.icon, title: _t("Reforger : {x}", { x: name }),
      sub: ForgeManager.getNextGainLabel(slot) || "", cost: cost, go: function () { orInvestGoBuilding("forge"); } });
  });
  return out;
}

/* Paliers d'entraînement des compagnons (H4). */
function orInvestCompanions() {
  if (!window.CompanionManager || typeof getCompanionUpgradeCost !== "function" || orInvestHeroBusy()) return [];
  var out = [];
  CompanionManager.unlockedIds().forEach(function (cid) {
    var st = CompanionManager.state(cid), def = typeof getCompanionDef === "function" ? getCompanionDef(cid) : null;
    var cost = st ? CompanionManager.nextTrainingCost(cid) : null;
    if (cost == null) return;
    var pct = Math.round(COMPANION_TRAINING_PCT * 100);
    out.push({ id: "c:" + cid + ":" + (st.upgrades + 1), kind: "c", ok: Number(game.gold || 0) >= cost, interet: OR_INVEST_INTERET.companion, gold: cost,
      icon: def ? def.image : OR_INVEST_ICON, title: _t("{x} niv. {n}", { x: def ? _td(def.name) : cid, n: st.upgrades + 2 }),
      sub: pct ? _t("+{n} % dégâts ou PV, au choix", { n: pct }) : "", cost: { gold: cost }, go: function () { orInvestGoHeros("companions"); } });
  });
  return out;
}

/* Rangs des sorts (H2), ouverts sur la fiche Capacités au sort concerné. */
function orInvestSkillRanks() {
  if (!window.SkillRanks || orInvestHeroBusy()) return [];
  var out = [];
  SkillRanks.kitActions().forEach(function (a) {
    var s = SkillRanks.status(a.id);
    if (s !== "ok" && s !== "short") return;
    var r = SkillRanks.get(a.id), cost = SkillRanks.nextCost(a.id), c = { gold: cost.gold };
    c[cost.mat] = cost.qty;
    out.push({ id: "s:" + a.id + ":" + (r + 1), kind: "s", ok: s === "ok", interet: OR_INVEST_INTERET.skill, gold: cost.gold,
      icon: (typeof CLASS_ACTION_ICON_FALLBACK !== "undefined" && CLASS_ACTION_ICON_FALLBACK[a.id]) || (a.type === "defense" ? "images/Icons/combat_stats/stat_defense.webp" : "images/Icons/combat_actions/skill_generic.webp"),
      title: _t("{x} : rang {n}", { x: _td(a.label || a.id), n: r + 1 }), sub: _t("Rang de sort"), cost: c,
      go: function () { orInvestGoSkill(a.id); } });
  });
  return out;
}

/* Rangs de compétence des compagnons (H4 partie C). */
function orInvestCompanionRanks() {
  if (!window.CompanionManager || typeof CompanionManager.skillRankStatus !== "function" || orInvestHeroBusy()) return [];
  var out = [];
  CompanionManager.unlockedIds().forEach(function (cid) {
    var s = CompanionManager.skillRankStatus(cid);
    if (s !== "ok" && s !== "short") return;
    var r = CompanionManager.skillRank(cid), p = COMPANION_SKILL_RANK_PRICES[r], def = typeof getCompanionDef === "function" ? getCompanionDef(cid) : null, c = { gold: p.gold };
    c[p.mat] = p.qty;
    out.push({ id: "cr:" + cid + ":" + (r + 1), kind: "cr", ok: s === "ok", interet: OR_INVEST_INTERET.compRank, gold: p.gold, icon: def ? def.image : OR_INVEST_ICON,
      title: _t("{x} : compétence rang {n}", { x: def ? _td(def.name) : cid, n: r + 1 }), sub: def && def.skill ? _td(def.skill.name || "") : "", cost: c,
      go: function () { orInvestGoHeros("companions"); if (typeof herosOpenCompanion === "function") herosOpenCompanion(cid); } });
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
    if (!best || cost < best.gold) best = { u: u, gold: cost };
  });
  if (!best) return [];
  // Clé au plafond du Terrain : la ligne ne revient qu'à un nouveau plafond, pas à chaque point acheté
  return [{ id: "t:" + getTrainingCapLevels(), kind: "t", ok: Number(game.gold || 0) >= best.gold, interet: OR_INVEST_INTERET.training, gold: best.gold, icon: best.u.icon,
    title: _t("Entraînement"), sub: _t("Plafond du Terrain : {n}", { n: getTrainingCapLevels() }), cost: { gold: best.gold }, go: function () { orInvestGoHeros("amelioration"); } }];
}

/* Échoppe : une pièce qui monte la rareté d'un emplacement porté, une relique utile à un compagnon ;
   sans rien de tel, la relance de la vitrine (muette : elle ne rallume jamais le « + »). */
function orInvestShop() {
  var E = window.EquipShopManager, stock = game.equipShopStock;
  if (!E || !Array.isArray(stock) || !stock.length || Date.now() >= Number(game.equipShopResetTime || 0)) return [];
  var out = [], R = window.RARITY_ORDER || [];
  stock.forEach(function (it) {
    if (!it || it.bought) return;
    var price = typeof it.price === "number" ? it.price : E.getPrice(it);
    if (it.kind === "relic") {
      var CR = window.CompanionRelics, rel = { f: it.f, w: it.w };
      var fits = CR && window.CompanionManager && typeof relicShopFit === "function" && CompanionManager.unlockedIds().some(function (cid) { var f = relicShopFit(cid, it); return f === "free" || f === "up"; });
      if (fits) out.push({ id: "sh:" + it.uid, kind: "sh", ok: Number(game.gold || 0) >= price, interet: OR_INVEST_INTERET.relic, gold: price, icon: CR.icon(rel),
        title: _t("Échoppe : {x}", { x: CR.name(rel) }), sub: CR.effectText(rel), cost: { gold: price }, go: orInvestGoShop });
      return;
    }
    var worn = game.equipped && game.equipped[it.slot], ri = R.indexOf(it.rarity);
    if (ri < 0 || (worn && R.indexOf(worn.rarity) >= ri)) return;
    var lab = function (r) { return (window.RARITY_LABELS && RARITY_LABELS[r]) ? _td(RARITY_LABELS[r]) : r; };
    var slot = (window.EQUIPMENT_SLOT_LABELS && EQUIPMENT_SLOT_LABELS[it.slot]) ? _td(EQUIPMENT_SLOT_LABELS[it.slot]) : it.slot;
    out.push({ id: "sh:" + it.uid, kind: "sh", ok: Number(game.gold || 0) >= price, interet: OR_INVEST_INTERET.shopUp, gold: price, icon: OR_INVEST_SHOP_ICON,
      title: _t("Échoppe : {x}", { x: _td(it.name) }), sub: worn ? _t("{x} : {a} → {b}", { x: slot, a: lab(worn.rarity), b: lab(it.rarity) }) : _t("{x} : emplacement vide", { x: slot }),
      cost: { gold: price }, go: orInvestGoShop });
  });
  if (!out.length) {
    var rc = E.getManualRefreshCost();
    out.push({ id: "v:" + Number(game.equipShopResetTime || 0) + ":" + Number(game.equipShopManualRefreshCount || 0), kind: "v", quiet: true, ok: Number(game.gold || 0) >= rc,
      interet: OR_INVEST_INTERET.refresh, gold: rc, icon: OR_INVEST_SHOP_ICON, title: _t("Échoppe : renouveler la vitrine"), sub: _t("Rien de mieux que ton équipement en vitrine"),
      cost: { gold: rc }, go: orInvestGoShop });
  }
  return out;
}

/* Enchanteresse bâtie : la relance la moins chère d'une ligne d'une pièce portée (une ligne par niveau du bâtiment). */
function orInvestEnchant() {
  var EM = window.EnchantManager;
  if (!EM || EM.getBuildingLevel() <= 0 || orInvestHeroBusy() || typeof getItemAffixes !== "function") return [];
  var best = null, eq = game.equipped || {};
  Object.keys(eq).forEach(function (slot) {
    var it = eq[slot];
    if (it) getItemAffixes(it).forEach(function (a, i) { var c = EM.getCost(it, i); if (c && (!best || c.gold < best.gold)) best = { it: it, gold: c.gold }; });
  });
  if (!best) return [];
  var def = VILLAGE_BUILDINGS.enchanter;
  return [{ id: "e:" + EM.getBuildingLevel(), kind: "e", ok: Number(game.gold || 0) >= best.gold, interet: OR_INVEST_INTERET.enchanter, gold: best.gold, icon: def.iconImg || def.icon,
    title: _t("Enchanteresse : relancer une ligne"), sub: _t("{x} : la pièce ne peut jamais empirer", { x: _td(best.it.name) }), cost: { gold: best.gold },
    go: function () { orInvestGoBuilding("enchanter"); } }];
}

function orInvestSort(list) {
  list.sort(function (a, b) { return (b.interet - a.interet) || (a.gold - b.gold); });
  return list;
}

/* Tout ce que l'or peut acheter, payable (ok) ou non. */
function orInvestAll() {
  return orInvestSort([].concat(orInvestShop(), orInvestBuildings(), orInvestSkillRanks(), orInvestCompanions(), orInvestCompanionRanks(),
    orInvestEnchant(), orInvestTraining(), orInvestReforges()));
}
/* Dépenses payables tout de suite, la meilleure d'abord. */
function orInvestList() { return orInvestAll().filter(function (x) { return x.ok; }); }

/* « Plus tard » : le palier que le monde suivant ouvrira (compagnons, rangs), et les bâtiments plafonnés. */
function orInvestLater() {
  var out = [], CM = window.CompanionManager, W = window.WorldCaps, SR = window.SkillRanks, I = OR_INVEST_INTERET;
  var next = W && typeof W.withPrep === "function" ? W.withPrep(W.getReachedWorldIndex() + 1) : "";
  if (CM && typeof CM.trainingMax === "function" && W) CM.unlockedIds().forEach(function (cid) {
    var max = CM.trainingMax(cid), def = typeof getCompanionDef === "function" ? getCompanionDef(cid) : null;
    if (max >= COMPANION_TRAINING_HARD_MAX) return;
    var hi = Math.min(max + COMPANION_TRAINING_PER_WORLD, COMPANION_TRAINING_HARD_MAX);
    out.push({ interet: I.companion, icon: def ? def.image : OR_INVEST_ICON, title: _t("{x}, niveaux {a} à {b}", { x: def ? _td(def.name) : cid, a: max + 2, b: hi + 1 }), sub: _t("s'ouvrent {w}", { w: next }) });
  });
  var rk = SR ? SR.maxRank() + 1 : 0, acts = SR ? SR.kitActions() : [];
  if (SR && rk <= SKILL_RANK_MAX && acts.length) {
    var p = SKILL_RANK_PRICES[rk - 1];
    out.push({ interet: I.skill, icon: "images/Icons/combat_actions/skill_generic.webp", title: _t("Rangs de sorts : rang {n}", { n: rk }),
      sub: SR.openingText(rk) + " · " + _tn(acts.length, "{g} or + {q} {m}", "{g} or + {q} {m} chacun", { g: formatNumber(p.gold), q: p.qty, m: orInvestResName(p.mat) }) });
  }
  var ck = CM && typeof CM.skillRankMax === "function" ? CM.skillRankMax() + 1 : 0, ids = CM ? CM.unlockedIds() : [];
  if (SR && ck && ck <= COMPANION_SKILL_RANK_MAX && ids.length) {
    out.push({ interet: I.compRank, icon: "images/Icons/companions/competences_compagnons.webp", title: _t("Compétences des compagnons : rang {n}", { n: ck }), sub: SR.openingText(ck) });
  }
  var V = window.VillageBuildingManager;
  if (V && Array.isArray(window.VILLAGE_BUILDING_ORDER) && !(typeof isTabUnlocked === "function" && !isTabUnlocked("village"))) VILLAGE_BUILDING_ORDER.forEach(function (id) {
    var def = VILLAGE_BUILDINGS[id], lvl = def ? V.getLevel(id) : 0;
    if (!def || !lvl || !V.isMaxLevel(id) || !V.isWorldCapped(id)) return;
    out.push({ interet: id === "workshop" ? I.workshop : id === "forge" ? I.forge : I.building, icon: def.iconImg || def.icon,
      title: _t("{x} niv. {n}", { x: _td(def.name), n: lvl + 1 }), sub: V.getWorldCapLabel(id) });
  });
  out.sort(function (a, b) { return b.interet - a.interet; });
  return out.slice(0, OR_INVEST_LATER_ROWS);
}

/* or-bloque B (généralise l'ancienne porte de la Forge) : une carte par matériau qui bloque un achat,
   avec ce qui manque en tout, l'or qu'il retient, et son producteur. Les cartes ne rallument jamais le « + ». */
function orInvestGate(ko) {
  var by = {};
  (ko || orInvestAll().filter(function (x) { return !x.ok; })).forEach(function (e) {
    Object.keys(e.cost || {}).forEach(function (k) {
      if (k === "gold" || orInvestHave(k) >= e.cost[k]) return;
      var m = by[k] || (by[k] = { res: k, need: 0, gold: 0, items: [] });
      m.need += Number(e.cost[k] || 0); m.gold += Number(e.gold || 0); m.items.push(e);
    });
  });
  return Object.keys(by).map(function (k) {
    var m = by[k];
    m.miss = Math.max(0, m.need - orInvestHave(k));
    m.prod = typeof findResourceProducer === "function" ? findResourceProducer(k) : null;
    m.lock = typeof getResourceStoryLock === "function" ? getResourceStoryLock(k) : ""; // v3.754.0 (MES-6) : atelier pas encore ouvert
    return m;
  }).sort(function (a, b) { return b.gold - a.gold; });
}

/* « 4 rangs de sorts, 2 compétences de compagnon, Forge niv. 3 » */
function orInvestWhoText(items) {
  var n = { s: 0, cr: 0, r: 0 }, parts = [];
  items.forEach(function (e) { if (n.hasOwnProperty(e.kind)) n[e.kind]++; else parts.push(e.title); });
  if (n.r) parts.unshift(_tn(n.r, "{n} reforge", "{n} reforges"));
  if (n.cr) parts.unshift(_tn(n.cr, "{n} compétence de compagnon", "{n} compétences de compagnon"));
  if (n.s) parts.unshift(_tn(n.s, "{n} rang de sort", "{n} rangs de sorts"));
  return parts.length > 4 ? parts.slice(0, 4).join(", ") + "…" : parts.join(", ");
}

/* Recette du producteur et ce que l'Entrepôt permet d'en tirer tout de suite. */
function orInvestRecipe(k, prod) {
  if (!prod || prod.kind !== "workshop" || !window.WORKSHOPS_CONFIG || !WORKSHOPS_CONFIG[prod.id]) return null;
  var rec = (WORKSHOPS_CONFIG[prod.id].recipes || []).filter(function (r) { return r.outputs[0].resourceId === k; })[0];
  if (!rec) return null;
  var txt = rec.inputs.map(function (i) { return orInvestResName(i.resourceId) + " ×" + i.quantity; }).join(" + ");
  var times = window.WorkshopsSystem && typeof WorkshopsSystem.getMaxManualCraftTimes === "function" ? WorkshopsSystem.getMaxManualCraftTimes(prod.id, rec.id) : 0;
  var lack = rec.inputs.filter(function (i) { return orInvestHave(i.resourceId) < i.quantity; })[0];
  return { txt: txt, out: Number(rec.outputs[0].quantity || 1), now: Math.max(0, times) * Number(rec.outputs[0].quantity || 1), lack: lack ? lack.resourceId : null };
}

/* Calcul une fois par seconde au plus : le dock se redessine à chaque image. */
function orInvestState() {
  var now = Date.now();
  if (orInvestCache && now - orInvestCache.at < 1000) return orInvestCache;
  var gold = Number(game.gold || 0), all = gold >= OR_INVEST_MIN_GOLD ? orInvestAll() : [];
  var list = all.filter(function (s) { return s.ok && !s.quiet; }), ko = all.filter(function (s) { return !s.ok; });
  var doubled = orInvestGoldRef != null && gold >= OR_INVEST_DOUBLE_MIN && gold >= 2 * orInvestGoldRef && (list.length + ko.length) > 0;
  var fresh = doubled || list.some(function (s) { return !orInvestSeen[s.id]; });
  orInvestCache = { at: now, list: list, ko: ko, fresh: fresh, doubled: doubled };
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
    var have = orInvestHave(k), res = k === "gold" ? null : (window.WAREHOUSE_RESOURCES && WAREHOUSE_RESOURCES[k]);
    var ico = k === "gold" ? OR_INVEST_ICON : (res && res.icon), name = orInvestResName(k);
    var txt = k === "gold" ? formatNumber(cost[k]) : formatNumber(Math.min(have, cost[k])) + " / " + formatNumber(cost[k]);
    return '<span class="oi-chip ' + (have >= cost[k] ? "is-ok" : "is-ko") + '">' + (ico ? renderIconOrEmojiHTML(ico, "oi-chip-ico", name) : esc(name) + " ") + esc(txt) + '</span>';
  }).join("");
}

function orInvestRowHTML(x, cls, more) {
  var i = orInvestShown.push(x) - 1, sub = x.sub || "";
  if (more) sub = (sub ? sub + " · " : "") + _tn(more, "et {n} autre", "et {n} autres");
  var gap = Number(x.cost && x.cost.gold || 0) - Number(game.gold || 0);
  return '<button type="button" class="oi-row' + (cls ? " " + cls : "") + '" onclick="orInvestGo(' + i + ')">' + renderIconOrEmojiHTML(x.icon, "oi-row-ico", x.title) +
    '<span class="oi-row-txt"><b>' + esc(x.title) + '</b>' + (sub ? '<span class="oi-sub">' + esc(sub) + '</span>' : '') +
    '<span class="oi-cost">' + orInvestCostHTML(x.cost) + '</span>' +
    (!x.ok && gap > 0 ? '<span class="oi-miss">' + esc(_t("Il te manque {n} or.", { n: formatNumber(gap) })) + '</span>' : '') + '</span></button>';
}

function orInvestMatHTML(m) {
  var res = window.WAREHOUSE_RESOURCES && WAREHOUSE_RESOURCES[m.res], name = orInvestResName(m.res), rec = m.lock ? null : orInvestRecipe(m.res, m.prod); // MES-6 : atelier fermé, pas de recette promise
  var h = '<div class="oi-mat"><div class="oi-mat-t">' + (res && res.icon ? renderIconOrEmojiHTML(res.icon, "oi-mat-ico", name) : "") +
    '<span>' + esc(_t("{x} : il en manque {n}", { x: name, n: formatNumber(m.miss) })) + '</span></div>';
  h += '<p>' + esc(_t("Retient {g} or : {x}.", { g: formatNumber(m.gold), x: orInvestWhoText(m.items) })) + '</p>';
  if (rec) {
    h += '<p>' + esc(_t("{x} : {r} → {n}.", { x: m.prod.name, r: rec.txt, n: rec.out })) + '</p>';
    h += '<p>' + esc(rec.now > 0 ? _t("Avec ton Entrepôt : {n} tout de suite.", { n: formatNumber(rec.now) }) : _t("Ton Entrepôt n'a pas de quoi en produire.")) + '</p>';
    var lr = rec.lack && window.WAREHOUSE_RESOURCES && WAREHOUSE_RESOURCES[rec.lack];
    if (!rec.now && lr && lr.sourceHint) h += '<p>' + esc(_t("{x} : {s}.", { x: _td(lr.name), s: _td(lr.sourceHint) })) + '</p>';
  } else if (m.prod && !m.lock) h += '<p>' + esc(_t("Production : {x}.", { x: m.prod.name })) + '</p>';
  else if (res && res.sourceHint) h += '<p>' + esc(_td(res.sourceHint)) + '.</p>';
  if (m.lock) h += '<p>' + esc(_t("S'ouvre avec l'Histoire : « {s} ».", { s: _td(m.lock) })) + '</p>'; // v3.754.0 (MES-6) : pas de « Produire » vers un atelier fermé
  else if (m.prod) {
    var i = orInvestShown.push({ go: function () { orInvestGoProducer(m.res); } }) - 1;
    h += '<button type="button" class="oi-go" onclick="orInvestGo(' + i + ')">' + esc(_t("Produire : {x}", { x: m.prod.name })) + ' ›</button>';
  }
  return h + '</div>';
}

/* Rangs de sorts, reforges, compétences : une ligne par sorte (la plus utile), « et N autres ». */
function orInvestFold(list) {
  var folded = {}, rows = [];
  list.forEach(function (x) {
    var f = (x.kind === "s" || x.kind === "r" || x.kind === "cr") ? x.kind : null;
    if (f && folded[f]) { folded[f].more++; return; }
    var row = { x: x, more: 0 };
    if (f) folded[f] = row;
    rows.push(row);
  });
  return rows;
}

/* Fenêtre « Ton or peut servir » : Tout de suite, Il manque quelque chose, Plus tard (or-liste B). */
function openOrInvestWindow() {
  orInvestCache = null;
  var all = orInvestAll(), now = all.filter(function (x) { return x.ok; }), ko = all.filter(function (x) { return !x.ok; }), later = orInvestLater();
  if (!now.length && !ko.length && !later.length) return;
  now.forEach(function (x) { orInvestSeen[x.id] = true; });
  orInvestGoldRef = Number(game.gold || 0); // or-retour A : repère de la prochaine fois où l'or aura doublé
  orInvestShown = [];
  var mats = orInvestGate(ko), h = '<div class="kwin-veil oi-bg" onclick="if(event.target===this)closeOrInvestWindow()"><div class="kwin oi-win">';
  h += kWinHeadHTML({ icon: renderIconOrEmojiHTML(OR_INVEST_ICON, "fr-row-ico", _t("Or")), title: esc(_t("Ton or peut servir")),
    sub: esc(_t("{n} or en poche", { n: formatNumber(Math.floor(game.gold || 0)) })), close: "closeOrInvestWindow()" });
  h += '<div class="kwin-body">';
  h += '<div class="oi-h">' + esc(_t("Tout de suite")) + '<small>' + now.length + '</small></div>';
  h += now.length ? orInvestFold(now).map(function (r, i) { return orInvestRowHTML(r.x, i ? "" : "is-best", r.more); }).join("") : '<p class="oi-none">' + esc(_t("Rien de payable pour l'instant.")) + '</p>';
  var foot = now.length ? { i: 0, lbl: _t("J'y vais") } : null;
  if (ko.length) {
    h += '<div class="oi-h">' + esc(_t("Il manque quelque chose")) + '<small>' + ko.length + '</small></div>';
    mats.slice(0, OR_INVEST_MAT_CARDS).forEach(function (m) {
      var at = orInvestShown.length;
      h += orInvestMatHTML(m);
      if (!foot && m.prod) foot = { i: at, lbl: _t("Aller produire") };
    });
    var rows = orInvestFold(ko);
    rows.slice(0, OR_INVEST_KO_ROWS).forEach(function (r) { h += orInvestRowHTML(r.x, "is-ko", r.more); });
    if (rows.length > OR_INVEST_KO_ROWS) h += '<p class="oi-none">' + esc(_tn(rows.length - OR_INVEST_KO_ROWS, "Et {n} autre achat attend.", "Et {n} autres achats attendent.")) + '</p>';
  }
  if (later.length) {
    h += '<div class="oi-h">' + esc(_t("Plus tard")) + '</div>';
    later.forEach(function (x) {
      h += '<div class="oi-row is-later">' + renderIconOrEmojiHTML(x.icon, "oi-row-ico", x.title) + '<span class="oi-row-txt"><b>' + esc(x.title) + '</b>' +
        (x.sub ? '<span class="oi-sub">' + esc(x.sub) + '</span>' : '') + '</span></div>';
    });
  }
  h += '</div>';
  if (foot) h += '<div class="kwin-foot"><button type="button" class="kbtn primary oi-go-main" onclick="orInvestGo(' + foot.i + ')">' + esc(foot.lbl) + '</button></div>';
  h += '</div></div>';
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

/* Destinations : la fiche du bâtiment, l'écran Héros, l'échoppe, ou le producteur du matériau manquant. */
function orInvestGoBuilding(id) {
  if (typeof switchTab === "function") switchTab("village");
  if (typeof setVillageSubTab === "function") setVillageSubTab("buildings");
  if (typeof openVillageBuildingSheet === "function") openVillageBuildingSheet(id);
}
function orInvestGoHeros(sub) {
  if (typeof switchTab === "function") switchTab("more"); // onglet Personnage (voir goToHeroTraining)
  if (typeof setHerosSubTab === "function") setHerosSubTab(sub);
}
// L'échoppe vit à la Halle une fois bâtie (segment Échoppe), sinon dans Héros › Équipement › Boutique
function orInvestGoShop() {
  if (typeof isEquipShopAtHall === "function" && isEquipShopAtHall()) {
    if (typeof hallSheetSegment !== "undefined") hallSheetSegment = "shop";
    orInvestGoBuilding("hall");
    return;
  }
  if (typeof setEquipSubTab === "function") setEquipSubTab("shop");
  orInvestGoHeros("equip");
}
function orInvestGoSkill(actionId) {
  if (typeof switchTab === "function") switchTab("more");
  if (typeof openHerosSheet === "function") openHerosSheet("abilities");
  if (typeof expandedHeroSkill !== "undefined") expandedHeroSkill = actionId; // la carte du sort ouverte sur son rang
  if (typeof renderPanel === "function") renderPanel();
}
function orInvestGoProducer(resKey) {
  var prod = typeof findResourceProducer === "function" ? findResourceProducer(resKey) : null;
  if (typeof switchTab === "function") switchTab("village");
  if (typeof setVillageSubTab === "function") setVillageSubTab("production");
  if (prod && typeof goToResourceProducer === "function") goToResourceProducer(prod.kind, prod.id);
}

window.orInvestList = orInvestList;
window.orInvestAll = orInvestAll;
window.orInvestLater = orInvestLater;
window.orInvestGate = orInvestGate;
window.orInvestGoShop = orInvestGoShop;
