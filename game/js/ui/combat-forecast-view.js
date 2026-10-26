"use strict";
/* ui/combat-forecast-view.js — écran de pronostic AVANT le lancement d'un combat (v3.247.0,
   demande Seb 15/09/2026 : « un message juste avant de lancer le combat, avec possibilité
   d'annuler, et qui dise s'il faut monter ses caractéristiques ou acheter de l'équipement »).

   Deux usages :
     - buildCombatForecastLineHTML(f) : une ligne à intégrer dans un écran de lancement
       existant (feuille de donjon) ;
     - openCombatForecastConfirm(f, opts) : l'overlay de confirmation, pour les lancements
       qui n'ont pas d'écran intermédiaire (missions du tableau).
   L'overlay ne s'ouvre que si le pronostic est « Risqué » ou pire : sur un combat abordable,
   il n'y a rien à dire et une confirmation de plus serait une gêne. */

/* v3.265.0 (retour Seb) : sous ce seuil de PV, le départ en mission est précédé d'un
   avertissement « soigne-toi », quel que soit le verdict du pronostic. */
var FORECAST_LOW_HP_PCT = 0.60;
window.FORECAST_LOW_HP_PCT = FORECAST_LOW_HP_PCT;

function getHeroHpRatio() {
  var max = Number(game.heroMaxHp || 0);
  if (max <= 0) return 1;
  return Math.max(0, Number(game.heroHp != null ? game.heroHp : max)) / max;
}
window.getHeroHpRatio = getHeroHpRatio;

/* Soigner = aller au Campement (rations, régénération) : ferme l'overlay sans lancer. */
function goHealFromForecast() {
  closeCombatForecast();
  if (typeof switchTab === "function") switchTab("campement");
}
window.goHealFromForecast = goHealFromForecast;

function getForecastLevelClass(f) {
  return f ? ("is-" + f.id) : "";
}

/* Ligne compacte : verdict + estimation de rounds. */
function buildCombatForecastLineHTML(f) {
  if (!f || !window.CombatForecast) return "";
  var def = CombatForecast.getLevelDef(f.id);
  var h = '<div class="cf-line ' + getForecastLevelClass(f) + '">';
  h += '<span class="cf-line-verdict">' + esc(_td(def.label)) + '</span>';
  if (f.unwinnable) {
    h += '<span class="cf-line-detail">' + _t("il se soigne plus vite que tu ne frappes") + '</span>';
  } else if (f.roundsToKill) {
    h += '<span class="cf-line-detail">' + _t("~{a} rounds pour le vaincre, ~{b} pour tomber", { a: f.roundsToKill, b: f.roundsToDie }) + '</span>';
  }
  h += '</div>';
  return h;
}
window.buildCombatForecastLineHTML = buildCombatForecastLineHTML;

var pendingForecastAction = null;

function buildCombatForecastHTML(f, opts) {
  var def = CombatForecast.getLevelDef(f.id);
  var h = '<div class="full-menu-overlay kwin-veil">';
  h += '  <div class="kwin cf-card ' + getForecastLevelClass(f) + '">';
  h += kWinHeadHTML({ title: esc(opts.title ? _td(opts.title) : _t("Avant de partir")), sub: opts.title ? _t("Avant de partir") : "" }); // v3.400.0 (F-2)
  h += '    <div class="kwin-body">';
  if (opts.lowHp) {
    h += '    <div class="cf-lowhp"><img class="cf-lowhp-ico" src="images/Icons/combat_stats/stat_health.webp" alt="">'
      + '<span><b>' + _t("Attention, il faut te soigner.") + '</b> '
      + _t("Tu pars à {n} % de tes PV : mange une ration au Campement ou laisse le feu te remettre sur pied.", { n: Math.round(getHeroHpRatio() * 100) }) + '</span></div>';
  }
  h += '    <div class="cf-verdict">' + esc(_td(def.label)) + '</div>';
  if (f.enemyName) h += '    <div class="cf-enemy">' + esc(_t("Adversaire annoncé : {x}", { x: _td(f.enemyName) })) + '</div>';

  h += '    <div class="cf-rows">';
  h += '      <div class="cf-row"><span>' + _t("Tes dégâts") + '</span><span>' + _t("{n} / round", { n: formatNumber(f.heroDamagePerRound) }) + '</span></div>';
  h += '      <div class="cf-row"><span>' + _t("Ses dégâts") + '</span><span>' + _t("{n} / round", { n: formatNumber(f.enemyDamagePerRound) }) + '</span></div>';
  h += '      <div class="cf-row"><span>' + _t("Ses PV") + '</span><span>' + formatNumber(f.enemyHp) + '</span></div>';
  if (f.healThreshold > 0) {
    h += '      <div class="cf-row' + (f.unwinnable ? ' is-blocking' : '') + '"><span>' + _t("Il se soigne") + '</span><span>' + _t("il faut plus de {n} dégâts / round", { n: formatNumber(f.healThreshold) }) + '</span></div>';
  }
  if (!f.unwinnable) {
    h += '      <div class="cf-row"><span>' + _t("Estimation") + '</span><span>' + _tn(f.roundsToKill, "~{a} round contre ~{b}", "~{a} rounds contre ~{b}", { a: f.roundsToKill, b: f.roundsToDie }) + '</span></div>';
  }
  h += '    </div>';

  if (f.reason) h += '    <div class="cf-reason">' + esc(_td(f.reason)) + '</div>';
  if (f.advice) h += '    <div class="cf-advice">' + esc(_td(f.advice)) + '</div>';
  if (def.hint) h += '    <div class="cf-hint">' + esc(_td(def.hint)) + '</div>';

  h += '    </div>';
  h += '    <div class="kwin-foot">';
  if (opts.lowHp) h += '      <button class="kbtn" type="button" onclick="goHealFromForecast()">' + _t("Me soigner") + '</button>';
  else h += '      <button class="kbtn" type="button" onclick="closeCombatForecast()">' + _t("Annuler") + '</button>';
  h += '      <button class="kbtn primary" type="button" onclick="confirmCombatForecast()">' + esc(opts.confirmLabel ? _td(opts.confirmLabel) : _t("Partir quand même")) + '</button>';
  h += '    </div>';
  h += '  </div>';
  h += '</div>';
  return h;
}

function getForecastHost() {
  return document.getElementById("forecast-modal-root") || document.getElementById("dungeon-modal-root");
}

function openCombatForecastConfirm(f, opts) {
  opts = opts || {};
  pendingForecastAction = opts.onConfirm || null;
  var host = getForecastHost();
  if (!host) { if (pendingForecastAction) { var a = pendingForecastAction; pendingForecastAction = null; a(); } return; }
  host.innerHTML = buildCombatForecastHTML(f, opts);
}
window.openCombatForecastConfirm = openCombatForecastConfirm;

function closeCombatForecast() {
  pendingForecastAction = null;
  var host = getForecastHost();
  if (host) host.innerHTML = "";
}
window.closeCombatForecast = closeCombatForecast;

function confirmCombatForecast() {
  var action = pendingForecastAction;
  closeCombatForecast();
  if (typeof action === "function") action();
}
window.confirmCombatForecast = confirmCombatForecast;

/* Point d'entrée unique : lance `action`, précédée de l'overlay si le pronostic l'exige.
   Utilisé par campMissionAction() — donc par le tableau du Camp ET par l'écran Quêtes. */
function launchWithForecast(mission, action) {
  if (!window.CombatForecast || !mission) return action();
  var f = null;
  try { f = CombatForecast.forMission(mission); } catch (e) { f = null; }
  if (!f) return action();
  // v3.265.0 : PV sous le seuil -> avertissement même sur un combat abordable
  var lowHp = getHeroHpRatio() < FORECAST_LOW_HP_PCT;
  if (!lowHp && CombatForecast.getLevelDef(f.id).level < 2) return action();
  openCombatForecastConfirm(f, {
    title: mission.title || _t("Avant de partir"),
    confirmLabel: (f.unwinnable || lowHp) ? _t("Partir quand même") : _t("Partir"),
    lowHp: lowHp,
    onConfirm: action
  });
}
window.launchWithForecast = launchWithForecast;

/* =====================================================================
   v3.378.0 — « Ce que tu vas affronter » (idée Seb, 28/09/2026).
   Avant un combat qu'on lance soi-même, en mode Grimoire seulement : les traits PERMANENTS
   des créatures déjà vaincues, et si les règles actives y répondent. Exclus : les traits
   tirés au hasard, les changements de phase des boss (surprise), les créatures jamais vaincues.
   Aucun encart si aucun trait n'est connu. Lecture seule des données : aucun fichier protégé.
   ===================================================================== */

/* Trait → condition du Grimoire qui le vise, et état de combat qui le décrit (nom, icône, conseil).
   v3.492.14 (audit des télégraphes, décision Seb) : aussi le soin et le bouclier des boss, l'exaltation des élites et
   les mécaniques des mondes. cond null : aucune règle n'y répond. nom : quand l'état de combat n'a pas le bon mot. */
var ENEMY_TRAIT_DEFS = {
  shielded:  { cond: "shieldIncoming",       state: "shieldIncoming" },
  heal:      { cond: "healIncoming",         state: "healIncoming" },
  surge:     { cond: "eliteSurgeIncoming",   state: "surge" },
  silenced:  { cond: "enemySilenceIncoming", state: "silence" },
  armored:   { cond: "enemyArmored",         state: "armored" },
  enraged:   { cond: "enemyEnraged",         state: "enraged" },
  vampiric:  { cond: "enemyVampiric",        state: "vampiric" },
  corrupted: { cond: "enemyCorrupted",       state: "corrupted" },
  adds:      { cond: "multipleEnemies",      state: null, nom: _t("Renforts"), icon: "images/Icons/combat_status/multiple_enemies.webp" },
  calling:   { cond: "multipleEnemies",      state: "calling" },
  rising:    { cond: "enemyRising",          state: "rising", nom: _t("Se relève") },
  asleep:    { cond: "enemySleeping",        state: "asleep", nom: _t("Dormeurs") },
  chaining:  { cond: "allyChained",          state: "chaining", nom: _t("Chaînes") },
  sorting:   { cond: null,                   state: "sorting" },
  shell:     { cond: null,                   state: "shell" },
  burning:   { cond: null,                   state: "burning", nom: _t("Brûlure") },
  heat:      { cond: null,                   state: null, nom: _t("Chaleur"), icon: "images/Icons/combat_status/vein_heat.webp" },
  diving:    { cond: null,                   state: "diving", nom: _t("Plongée") }
};
var ENEMY_TRAIT_ORDER = ["heal", "shielded", "surge", "silenced", "armored", "enraged", "vampiric", "corrupted",
  "adds", "calling", "rising", "asleep", "chaining", "sorting", "shell", "burning", "heat", "diving"];
/* Nom et icône d'un trait (état de combat, ou nom/icône propres). */
function enemyTraitLook(trait) {
  var def = ENEMY_TRAIT_DEFS[trait] || {};
  var st = def.state ? (window.COMBAT_STATES || {})[def.state] || (window.COMBAT_STATES_SCREEN || {})[def.state] || {} : {}; // les deux registres d'états
  return { nom: def.nom || st.nom || trait, icon: def.icon || st.icon || "" };
}
window.enemyTraitLook = enemyTraitLook;

function etKilled(id) {
  return !!(game.killCounts && Number(game.killCounts[id] || 0) > 0);
}

function etAdventurePool(worldId, adventureIndex) {
  var w = (window.WORLDS || []).filter(function (x) { return x.id === worldId; })[0];
  var a = w && w.adventures ? w.adventures[adventureIndex || 0] : null;
  return (a && Array.isArray(a.enemyPool)) ? a.enemyPool.slice() : [];
}

/* Créatures possibles d'une quête (aventure ou chasse) : rencontres écrites, groupe, filtre,
   sinon le pool de l'aventure. Le boss d'aventure sans bossId n'a pas de trait fixe : ignoré. */
function etQuestCreatures(quest) {
  var ids = [];
  var add = function (id) { if (typeof id === "string" && ids.indexOf(id) === -1) ids.push(id); };
  (quest.encounters || []).forEach(function (e) {
    if (!e) return;
    if (typeof e.enemy === "string") add(e.enemy);
    (Array.isArray(e.group) ? e.group : []).forEach(add);
  });
  (Array.isArray(quest.group) ? quest.group : []).forEach(add);
  (Array.isArray(quest.enemyFilter) ? quest.enemyFilter : []).forEach(add);
  if (!ids.length) etAdventurePool(quest.worldId, quest.adventureIndex).forEach(add);
  var out = ids.map(function (id) { return { kind: "enemy", id: id }; });
  if (quest.eliteId) etPushElite(out, quest.eliteId);
  if (quest.bossId) out.push({ kind: "boss", id: quest.bossId, archetype: quest.bossArchetype || null, phases: quest.bossPhases || null });
  return out;
}

/* Créatures d'un contexte de lancement. Donjon (v3.380.0) : des vagues normales, seules
   celles qui portent un trait fixe (même pool que dungeon-system.js), puis élites et boss. */
function etCreaturesFor(ctx) {
  if (!ctx) return [];
  if (ctx.type === "adventure") {
    var aq = window.ADVENTURE_QUESTS && ADVENTURE_QUESTS[ctx.id];
    return aq ? etQuestCreatures(aq) : [];
  }
  if (ctx.type === "hunt") {
    var hq = window.HUNT_QUESTS && HUNT_QUESTS[ctx.id];
    return hq ? etQuestCreatures(hq) : [];
  }
  if (ctx.type === "elite") { var eo = []; etPushElite(eo, ctx.id); return eo; }
  if (ctx.type === "dungeon") {
    var d = (window.DUNGEONS || []).filter(function (x) { return x.id === Number(ctx.id); })[0];
    if (!d) return [];
    var out = [];
    /* v3.492.14 : en donjon, une vague ne se relève pas et n'appelle pas (dungeon-system.js) ; elle trie dans la Gueule. */
    etDungeonPool(d).forEach(function (id) {
      var def = window.ENEMY_DB && ENEMY_DB[id];
      if ((window.FIXED_ENEMY_ARCHETYPES && FIXED_ENEMY_ARCHETYPES[id]) || (d.worldId === "mountain" && def && def.sorts)) out.push({ kind: "enemy", id: id, inDungeon: true });
    });
    Object.keys(d.eliteWaves || {}).forEach(function (w) {
      var eid = d.eliteWaves[w];
      if (!out.some(function (x) { return x.id === eid; })) etPushElite(out, eid, true);
    });
    if (d.boss) out.push({ kind: "dungeonBoss", id: d.id, name: d.boss.name, archetype: d.boss.archetype || null, phases: d.boss.phases || null, rises: !!d.boss.rises });
    return out;
  }
  return [];
}

/* v3.438.2 : une élite et son escorte (le Bâtisseur du Contremaître porte le Bouclier). */
function etPushElite(out, eliteId, inDungeon) {
  out.push({ kind: "elite", id: eliteId });
  var el = window.ELITE_DB && ELITE_DB[eliteId];
  ((el && el.escort && el.escort.members) || []).forEach(function (id) {
    if (!out.some(function (x) { return x.kind === "enemy" && x.id === id; })) out.push({ kind: "enemy", id: id, inDungeon: !!inDungeon });
  });
}

/* Pool des vagues normales d'un donjon : le sien, sinon les aventures des mondes jusqu'à sa puissance. */
function etDungeonPool(d) {
  if (Array.isArray(d.enemyPool) && d.enemyPool.length) return d.enemyPool.slice();
  var pool = [];
  for (var w = 0; w <= (d.worldPower || 0) && w < (window.WORLDS || []).length; w++) {
    (WORLDS[w].adventures || []).forEach(function (adv) {
      (adv.enemyPool || []).forEach(function (eid) { if (pool.indexOf(eid) === -1) pool.push(eid); });
    });
  }
  return pool;
}

/* Nom, traits et « déjà vaincu » d'une créature. v3.492.14 : tous ses traits, comme le moteur les joue
   (combat-engine.js : un boss se soigne et se protège, une élite se protège et s'exalte). */
// Les phases (renforts, chaleur, plongée, trait qui change…) restent une surprise : décision v3.378.0, inchangée.
function etBossTraits(archetype) {
  var t = ["heal", "shielded"];
  if (archetype) t.push(archetype);
  return t;
}
function etDescribe(c) {
  if (c.kind === "enemy") {
    var e = window.ENEMY_DB && ENEMY_DB[c.id];
    var fixed = (typeof FIXED_ENEMY_ARCHETYPES !== "undefined" && FIXED_ENEMY_ARCHETYPES[c.id]) || null, t = fixed ? [fixed] : [];
    if (e && e.sorts) t.push("sorting");
    if (e && e.rises && !c.inDungeon) t.push("rising");
    if (e && e.calls && !c.inDungeon) t.push("calling");
    return { name: e ? e.name : c.id, traits: t, met: etKilled(c.id) };
  }
  if (c.kind === "elite") {
    var el = window.ELITE_DB && ELITE_DB[c.id], te = ["shielded", "surge"];
    if (el && el.archetype) te.push(el.archetype);
    if (el && el.sorts) te.push("sorting");
    if (el && el.forgeShell) te.push("shell");
    if (el && el.burns) te.push("burning");
    return { name: el ? el.name : c.id, traits: te, met: etKilled(c.id) };
  }
  if (c.kind === "boss") {
    var b = window.BOSS_DB && BOSS_DB[c.id];
    return { name: b ? b.name : c.id, traits: etBossTraits(c.archetype, c.phases), met: etKilled(c.id) };
  }
  if (c.kind === "dungeonBoss") {
    return { name: c.name || "Boss", traits: etBossTraits(c.archetype, c.phases).concat(c.rises ? ["rising"] : []), met: !!(game.dungeonTierCleared && game.dungeonTierCleared[c.id]) };
  }
  return { name: c.id, traits: [], met: false };
}

/* Mécaniques posées par la quête elle-même, sur ses rencontres (morts qui dorment, chaînes des Nécromanciens). */
function etQuestTraits(ctx) {
  var q = ctx && (ctx.type === "adventure" || ctx.type === "hunt") ? (ctx.type === "adventure" ? window.ADVENTURE_QUESTS : window.HUNT_QUESTS || {})[ctx.id] : null;
  var out = [];
  if (!q) return out;
  if ((q.encounters || []).some(function (e) { return e && e.sleepers; })) out.push({ trait: "asleep", name: _t("Des morts qui dorment") });
  if (q.chains) out.push({ trait: "chaining", name: _t("Les Nécromanciens") });
  return out;
}

/* Règles réellement actives (les premières, selon les emplacements débloqués). */
function etActiveRules(rules) {
  var n = (typeof getGrimoireSlotCount === "function") ? getGrimoireSlotCount(game.worldsEverReached) : 2;
  return (Array.isArray(rules) ? rules : []).slice(0, n).filter(function (r) { return r && r.conditionId && r.actionSlot; });
}

/* Réponse des règles à une condition : "counter" (⚡), "react" (sans contre) ou "none". */
function etRuleResponse(condId, rules, kit) {
  var hits = etActiveRules(rules).filter(function (r) { return r.conditionId === condId; });
  var counter = hits.filter(function (r) { return typeof isGrimoireRuleCounter === "function" && isGrimoireRuleCounter(r, kit); })[0];
  if (counter) return { status: "counter", rule: counter };
  if (hits.length) return { status: "react", rule: hits[0] };
  return { status: "none", rule: null };
}

function etRuleLabel(rule, kit) {
  var cond = (typeof getGrimoireConditionShortLabel === "function") ? getGrimoireConditionShortLabel(rule.conditionId) : rule.conditionId;
  var action = kit && kit.actions ? kit.actions[rule.actionSlot] : null;
  return cond + " → " + (action ? _td(action.label) : rule.actionSlot);
}

/* Donnée de l'encart : traits connus (groupés), et nombre de créatures jamais vaincues. */
function getEnemyTraitsPreview(ctx) {
  var traits = {}, unmet = 0, seen = {};
  etCreaturesFor(ctx).forEach(function (c) {
    var key = c.kind + ":" + c.id;
    if (seen[key]) return;
    seen[key] = true;
    var d = etDescribe(c);
    if (!d.met) { unmet++; return; }
    d.traits.forEach(function (t) {
      if (!ENEMY_TRAIT_DEFS[t]) return;
      traits[t] = traits[t] || [];
      if (traits[t].indexOf(d.name) === -1) traits[t].push(d.name);
    });
  });
  etQuestTraits(ctx).forEach(function (x) { (traits[x.trait] = traits[x.trait] || []).push(x.name); });
  var list = ENEMY_TRAIT_ORDER.filter(function (t) { return traits[t]; }).map(function (t) { return { trait: t, names: traits[t] }; });
  return { traits: list, unmet: unmet };
}
window.getEnemyTraitsPreview = getEnemyTraitsPreview;

/* v3.446.0 : l'encart des écrans de lancement est retiré (doublon) : ces traits se lisent à la
   préparation de sortie (sortie-prep-view.js), qui garde aussi le chemin du retour depuis le Grimoire. */
var grimoireReturn = null; // { fromTab, reopen, label } : posé par sortiePrepEditRules

function hasGrimoireReturn() {
  if (grimoireReturn && game.activeTab !== "grimoire") grimoireReturn = null; // parti ailleurs : oublié
  return !!grimoireReturn;
}
window.hasGrimoireReturn = hasGrimoireReturn;

function buildGrimoireReturnHTML() {
  if (!hasGrimoireReturn()) return "";
  return '<button type="button" class="kbtn primary grimoire-return-btn" onclick="grimoireGoBack()">↩ ' + esc(grimoireReturn.label) + '</button>';
}
window.buildGrimoireReturnHTML = buildGrimoireReturnHTML;

function grimoireGoBack() {
  var back = grimoireReturn;
  grimoireReturn = null;
  if (!back) return;
  if (back.fromTab && back.fromTab !== "grimoire" && typeof switchTab === "function") switchTab(back.fromTab);
  back.reopen();
}
window.grimoireGoBack = grimoireGoBack;
