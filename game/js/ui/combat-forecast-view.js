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
var FORECAST_LOW_HP_PCT = 0.50; // v3.735.0 (Seb 07/11) : aligné sur le rappel à l'acceptation (STORY_LOW_HP_PCT)
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
  if (typeof campTab !== "undefined") campTab = "feu"; // v3.683.0 (audit NOV-8) : droit au feu (santé, rations), pas aux Missions
  if (typeof switchTab === "function") switchTab("campement");
}
window.goHealFromForecast = goHealFromForecast;

/* v3.734.0 (Seb 07/11) : accepter une étape d'Histoire de combat sous la moitié des PV rappelle de se soigner.
   Une fois par acceptation, jamais pendant une activité en cours ; rien de bloquant (l'étape reste acceptée). */
var STORY_LOW_HP_PCT = 0.50;
window.STORY_LOW_HP_PCT = STORY_LOW_HP_PCT;

/* Étape de combat : liée à une quête d'aventure, une Petite Aventure ou un donjon, ou comptant des victoires. */
function storyStepIsCombat(step) {
  if (!step) return false;
  if (step.killTarget) return true;
  var l = step.linkTo || {}, tab = typeof l.tab === "function" ? l.tab(game) : l.tab;
  return tab === "dungeon" || /^(adv_|petite_aventure_)/.test(String(l.cardId || ""));
}
window.storyStepIsCombat = storyStepIsCombat;

function storyLowHpReminderNeeded(chapterId) {
  if (!window.StoryQuestManager || (window.WorldTravel && WorldTravel.isBusy())) return false;
  return storyStepIsCombat(StoryQuestManager.getCurrentStep(chapterId)) && getHeroHpRatio() < STORY_LOW_HP_PCT;
}
window.storyLowHpReminderNeeded = storyLowHpReminderNeeded;

function maybeStoryLowHpReminder(chapterId) {
  if (!storyLowHpReminderNeeded(chapterId)) return false;
  showConfirmModal(_t("PV bas"), _t("Tes PV sont bas : repose-toi au feu ou mange une ration avant de partir."),
    "images/Icons/combat_stats/stat_health.webp", goHealFromForecast, { ok: _t("Aller au feu"), cancel: _t("Plus tard") });
  return true;
}
window.maybeStoryLowHpReminder = maybeStoryLowHpReminder;

/* Bouton « Accepter » de la carte d'étape (Quêtes › Histoire). */
function acceptStoryStepWithCheck(chapterId) {
  var ok = StoryQuestManager.acceptStep(chapterId);
  if (ok) maybeStoryLowHpReminder(chapterId);
  return ok;
}
window.acceptStoryStepWithCheck = acceptStoryStepWithCheck;

function getForecastLevelClass(f) {
  return f ? ("is-" + f.id) : "";
}

/* Ligne compacte : verdict + estimation de rounds. v3.523.0 : opts.who (nom de l'adversaire), opts.brake (frein du jour). */
function buildCombatForecastLineHTML(f, opts) {
  if (!f || !window.CombatForecast) return "";
  opts = opts || {};
  var def = CombatForecast.getLevelDef(f.id);
  var who = opts.who && f.enemyName ? esc(_td(f.enemyName)) + ' · ' : '';
  var h = '<div class="cf-line ' + getForecastLevelClass(f) + '">';
  h += '<span class="cf-line-verdict">' + esc(_td(def.label)) + '</span>';
  if (f.unwinnable) {
    h += '<span class="cf-line-detail">' + who + _t("il se soigne plus vite que tu ne frappes") + '</span>';
  } else if (f.roundsToKill) {
    // v3.523.0 (revue) : tournure neutre (élites au féminin) et pluriel géré
    h += '<span class="cf-line-detail">' + who + _tn(f.roundsToKill, "~{a} round pour en venir à bout, ~{b} pour tomber", "~{a} rounds pour en venir à bout, ~{b} pour tomber", { a: f.roundsToKill, b: f.roundsToDie })
      + (opts.brake && f.brakeMult > 1 ? ' · ' + _t("frein du jour compris (+{p} %)", { p: Math.round((f.brakeMult - 1) * 100) }) : '') + '</span>';
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
  var open = function () {
    openCombatForecastConfirm(f, {
      title: mission.title || _t("Avant de partir"),
      confirmLabel: (f.unwinnable || lowHp) ? _t("Partir quand même") : _t("Partir"),
      lowHp: lowHp,
      onConfirm: action
    });
  };
  // v3.704.0 (TUTO-16) : la première fois, la fiche du pronostic d'abord ; « Compris » ouvre le pronostic
  if (typeof openGenericTutorialOnce === "function" && openGenericTutorialOnce("combat_forecast", { after: open })) return;
  open();
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
  charge:    { cond: "chargeIncoming",       state: "charge" }, // v3.736.0 : la Charge des ennemis ordinaires
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
  vein:      { cond: "veinIntact",           state: null, nom: _t("Veine intacte"), icon: "images/Icons/combat_status/vein_intact.webp" }, // v3.736.0
  sorting:   { cond: null,                   state: "sorting" },
  shell:     { cond: null,                   state: "shell" },
  burning:   { cond: null,                   state: "burning", nom: _t("Brûlure") },
  heat:      { cond: null,                   state: null, nom: _t("Chaleur"), icon: "images/Icons/combat_status/vein_heat.webp" },
  diving:    { cond: null,                   state: "diving", nom: _t("Plongée") }
};
var ENEMY_TRAIT_ORDER = ["heal", "shielded", "surge", "charge", "silenced", "armored", "enraged", "vampiric", "corrupted",
  "adds", "calling", "rising", "asleep", "chaining", "vein", "sorting", "shell", "burning", "heat", "diving"];
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
  // v3.736.0 : quête faite seulement de boss ou d'élite (nextSpawnIsBoss) : aucun ennemi ordinaire ne paraît
  var seul = (quest.steps || []).length && quest.steps.every(function (s) { return s.type === "bossKill" || s.type === "eliteKill"; });
  var out = seul ? [] : ids.map(function (id) { return { kind: "enemy", id: id }; });
  if (quest.eliteId) etPushElite(out, quest.eliteId);
  var vs = (quest.bossId && window.TowerSystem) ? TowerSystem.copyClassRule(quest) : null; // v3.737.0 : la silhouette face au Rôdeur, sans soin
  if (quest.bossId) out.push({ kind: "boss", id: quest.bossId, archetype: quest.bossArchetype || null, phases: quest.bossPhases || null, noHeal: !!(vs && vs.noHeal) });
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
// Les phases (renforts, chaleur, plongée, trait qui change…) restent une surprise : décision v3.378.0, sauf celles du round 1 (v3.736.0)
// et, une fois le boss vaincu, celles qui viennent en cours de combat (v3.742.0).
function etBossTraits(archetype, phases, noHeal) {
  var t = noHeal ? ["shielded"] : ["heal", "shielded"]; // v3.737.0 : noHeal, boss qui ne se soigne pas
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
    return { name: b ? b.name : c.id, traits: etBossTraits(c.archetype, c.phases, c.noHeal), met: etKilled(c.id) };
  }
  if (c.kind === "dungeonBoss") {
    return { name: c.name || "Boss", traits: etBossTraits(c.archetype, c.phases).concat(c.rises ? ["rising"] : []), met: !!(game.dungeonTierCleared && game.dungeonTierCleared[c.id]) };
  }
  return { name: c.id, traits: [], met: false };
}

/* Mécaniques posées par la quête elle-même, sur ses rencontres (morts qui dorment, chaînes des Nécromanciens). */
function etQuestTraits(ctx) {
  var q = ctx && ctx.type === "adventure" ? (window.ADVENTURE_QUESTS || {})[ctx.id] : null;
  var out = [];
  var d = ctx && ctx.type === "dungeon" ? (window.DUNGEONS || []).filter(function (x) { return x.id === Number(ctx.id); })[0] : null;
  if ((q && q.worldId === "mountain") || (d && d.worldId === "mountain") || (ctx && ctx.type === "elite" && ctx.mapId === "mountain")) out.push({ trait: "vein", name: _t("La Montagne"), opt: true }); // v3.736.0 : une veine par combat
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

/* v3.736.0 : la règle répond-elle vraiment ? Contre ou effet du kit, ou « Tailler » sur la veine intacte. */
function etRuleCovers(rule, kit) {
  if (!rule || !rule.conditionId || !rule.actionSlot) return false;
  if (rule.conditionId === "veinIntact") return rule.actionSlot === "vein";
  return typeof isGrimoireRuleCounter === "function" && isGrimoireRuleCounter(rule, kit);
}

/* Réponse des règles à une condition : "counter" (⚡), "react" (sans contre) ou "none". */
function etRuleResponse(condId, rules, kit) {
  var hits = etActiveRules(rules).filter(function (r) { return r.conditionId === condId; });
  var counter = hits.filter(function (r) { return etRuleCovers(r, kit); })[0];
  if (counter) return { status: "counter", rule: counter };
  if (hits.length) return { status: "react", rule: hits[0] };
  return { status: "none", rule: null };
}

function etRuleLabel(rule, kit) {
  var cond = (typeof getGrimoireConditionShortLabel === "function") ? getGrimoireConditionShortLabel(rule.conditionId) : rule.conditionId;
  var action = (typeof getGrimoireActionDef === "function") ? getGrimoireActionDef(kit, rule.actionSlot) : (kit && kit.actions ? kit.actions[rule.actionSlot] : null);
  return cond + " → " + (action ? _td(action.label) : rule.actionSlot);
}

/* v3.736.0 (Seb 07/11, pronostic B) : règle conseillée par situation, « Ajouter », « Tout préparer ».
   Écrit dans game.grimoireRules puis dans le jeu actif (syncGrimoireActiveJeu) ; verrou de sortie respecté. */
// Ordre de « Tout préparer » : contres d'annonce d'abord (Charge, Bouclier, Soin…), puis les traits, la veine en dernier.
var GRIMOIRE_PREP_ORDER = ["chargeIncoming", "shieldIncoming", "healIncoming", "eliteSurgeIncoming", "enemySilenceIncoming",
  "enemyEnraged", "enemyCorrupted", "enemyVampiric", "enemyArmored", "enemyRising", "enemySleeping", "allyChained", "multipleEnemies", "veinIntact"];
window.GRIMOIRE_PREP_ORDER = GRIMOIRE_PREP_ORDER;

/* Action conseillée : le contre d'annonce du kit, sinon l'effet qui vise ce trait ; « Tailler » pour la veine. */
function etAdvisedSlot(cond, kit) {
  if (cond === "veinIntact") return "vein";
  if (!kit || !kit.actions) return null;
  var slots = ["defense", "skill1", "skill2", "skill3"], i, a;
  for (i = 0; i < slots.length; i++) { a = kit.actions[slots[i]]; if (a && Array.isArray(a.counters) && a.counters.indexOf(cond) !== -1) return slots[i]; }
  for (i = 0; i < slots.length; i++) { a = kit.actions[slots[i]]; if (a && typeof getAllGrimoireCounterIds === "function" && getAllGrimoireCounterIds(a).indexOf(cond) !== -1) return slots[i]; }
  return null;
}
window.etAdvisedSlot = etAdvisedSlot;

function etKit() { return (typeof getGrimoireCurrentKit === "function") ? getGrimoireCurrentKit() : null; }

/* Situations de la sortie auxquelles une règle répond, dans l'ordre de préparation : { cond, slot, opt, trait }. */
function grimoireSortieSituations(ctx) {
  var kit = etKit(), out = [], seen = {};
  getEnemyTraitsPreview(ctx).traits.forEach(function (t) {
    var cond = ENEMY_TRAIT_DEFS[t.trait].cond, slot = cond ? etAdvisedSlot(cond, kit) : null;
    if (!slot || seen[cond]) return;
    seen[cond] = true;
    out.push({ cond: cond, slot: slot, opt: !!t.opt, trait: t.trait, phase: t.phase });
  });
  var rank = function (c) { var i = GRIMOIRE_PREP_ORDER.indexOf(c); return i < 0 ? 99 : i; };
  // v3.742.0 : les phases d'abord (mesuré au banc : c'est là que préparer paie)
  return out.sort(function (a, b) { return (a.opt ? 1 : 0) - (b.opt ? 1 : 0) || (a.phase != null ? 0 : 1) - (b.phase != null ? 0 : 1) || rank(a.cond) - rank(b.cond); });
}
window.grimoireSortieSituations = grimoireSortieSituations;

/* Combien des situations (non facultatives) un jeu couvre ; v3.738.0 : items, objets choisis (un trait tenu compte). */
function grimoireJeuScore(rules, ctx, items) {
  var kit = etKit(), want = grimoireSortieSituations(ctx).filter(function (x) { return !x.opt; });
  return { n: want.filter(function (x) { return etItemHolds(x.trait, items) || etRuleResponse(x.cond, rules, kit).status === "counter"; }).length, of: want.length };
}
window.grimoireJeuScore = grimoireJeuScore;

function etCopyRules() { return (game.grimoireRules || []).map(function (r) { return { conditionId: (r && r.conditionId) || null, actionSlot: (r && r.actionSlot) || null }; }); }
function etCommitRules(rules) {
  game.grimoireRules = rules;
  if (typeof ensureGrimoireRules === "function") ensureGrimoireRules();
  if (typeof syncGrimoireActiveJeu === "function") syncGrimoireActiveJeu();
  if (typeof saveGame === "function") saveGame();
}
function etEditable() { return typeof isGrimoireEditable !== "function" || isGrimoireEditable(); }
/* Situations que la sortie PEUT présenter, toutes phases comprises (données, rien n'est affiché) : { cond: true }. */
function etPossibleConds(ctx) {
  var out = {}, add = function (t) { var d = ENEMY_TRAIT_DEFS[t]; if (d && d.cond) out[d.cond] = true; };
  var arch = function (ph) { return ph.copyClass ? ((window.TOWER_CLASS_ARCHETYPE || {})[window.TowerSystem ? TowerSystem.baseHeroId(game.heroId) : game.heroId] || "enraged") : ph.archetype; };
  etCreaturesFor(ctx).forEach(function (c) {
    etDescribe(c).traits.forEach(add);
    etCertainTraits(c, ctx).forEach(function (x) { add(x.trait); });
    var b = c.kind === "boss" ? (window.BOSS_DB || {})[c.id] : null;
    if (b && b.rises) add("rising");
    (c.phases || []).concat((b && b.risePhases) || []).forEach(function (ph) { if (!ph) return; add(arch(ph)); if (ph.sleepAdds) add("asleep"); });
  });
  etQuestTraits(ctx).forEach(function (x) { add(x.trait); });
  return out;
}
// Situations dont le pronostic peut dire l'absence ; PV bas, compagnon, double frappe, groupe : jamais « sans objet ».
var ET_KNOWABLE_CONDS = ["chargeIncoming", "shieldIncoming", "healIncoming", "eliteSurgeIncoming", "enemySilenceIncoming", "enemyEnraged", "enemyCorrupted",
  "enemyVampiric", "enemyArmored", "enemyRising", "enemySleeping", "allyChained", "veinIntact"];
/* Une règle sans objet ici : sa situation ne peut pas se présenter dans cette sortie. */
function etRuleUseless(rule, possible) {
  return !!(rule && rule.conditionId && ET_KNOWABLE_CONDS.indexOf(rule.conditionId) !== -1 && !possible[rule.conditionId]);
}
window.etPossibleConds = etPossibleConds;
window.etRuleUseless = etRuleUseless;

/* « Tout préparer » : les situations dans l'ordre, autant que d'emplacements ouverts ; le reste des règles suit.
   v3.738.0 (Seb 07/11) : items, objets emportés ; un trait qu'ils tiennent ne prend plus d'emplacement. */
function grimoirePrepareAll(ctx, items) {
  if (!etEditable()) return null;
  var kit = etKit(), sits = grimoireSortieSituations(ctx), open = (typeof getGrimoireSlotCount === "function") ? getGrimoireSlotCount(game.worldsEverReached) : 3;
  var before = etCopyRules(), active = before.slice(0, open);
  var want = sits.filter(function (x) { return !x.opt && !etItemHolds(x.trait, items); }).slice(0, open);
  var res = want.map(function (x) {
    return active.filter(function (r) { return r.conditionId === x.cond && etRuleCovers(r, kit); })[0] || { conditionId: x.cond, actionSlot: x.slot };
  });
  var store = Math.max(open, (typeof GRIMOIRE_SLOT_COUNT === "number") ? GRIMOIRE_SLOT_COUNT : 3);
  var has = function (r) { return res.some(function (y) { return y.conditionId === r.conditionId; }); };
  var rest = before.slice(0, store).filter(function (r) { return r.conditionId && r.actionSlot && !has(r); });
  var possible = etPossibleConds(ctx);
  rest.filter(function (r) { return !etRuleUseless(r, possible); }).concat(rest.filter(function (r) { return etRuleUseless(r, possible); })).forEach(function (r) { if (!has(r)) res.push(r); });
  res = res.slice(0, store);
  while (res.length < store) res.push({ conditionId: null, actionSlot: null });
  res = res.concat(before.slice(store)); // règles d'avant pas encore migrées : gardées, non jouées
  var pad = function (l) { l = l.slice(0, open); while (l.length < open) l.push({ conditionId: null, actionSlot: null }); return JSON.stringify(l); };
  if (pad(res) === pad(active)) return { changed: false, before: before };
  etCommitRules(res);
  return { changed: true, before: before };
}
window.grimoirePrepareAll = grimoirePrepareAll;

/* « Ajouter » (Seb 07/11, plein A) : corrige la règle de la même situation, sinon prend une place libre, sinon remplace
   une règle sans objet ici (la dernière) ; sinon { pick: true } : le joueur choisit laquelle remplacer. */
function grimoireAddRule(ctx, cond) {
  if (!etEditable()) return null;
  var kit = etKit(), slot = etAdvisedSlot(cond, kit);
  if (!slot) return null;
  var open = (typeof getGrimoireSlotCount === "function") ? getGrimoireSlotCount(game.worldsEverReached) : 3;
  var before = etCopyRules(), rules = etCopyRules(), nr = { conditionId: cond, actionSlot: slot }, i;
  while (rules.length < open) rules.push({ conditionId: null, actionSlot: null });
  for (i = 0; i < open; i++) if (rules[i].conditionId === cond) {
    if (etRuleCovers(rules[i], kit)) return { kind: "same", index: i, before: before };
    var o = rules[i]; rules[i] = nr; etCommitRules(rules); return { kind: "fixed", index: i, old: o, rule: nr, before: before };
  }
  for (i = 0; i < open; i++) if (!rules[i].conditionId || !rules[i].actionSlot) { rules[i] = nr; etCommitRules(rules); return { kind: "added", index: i, rule: nr, before: before }; }
  var possible = etPossibleConds(ctx);
  for (i = open - 1; i >= 0; i--) if (etRuleUseless(rules[i], possible)) { var u = rules[i]; rules[i] = nr; etCommitRules(rules); return { kind: "replaced", index: i, old: u, rule: nr, before: before }; }
  return { kind: "pick", pick: true, rule: nr, before: before };
}
window.grimoireAddRule = grimoireAddRule;

/* Remplacement choisi par le joueur (aucune règle sans objet). */
function grimoireReplaceRule(index, cond) {
  if (!etEditable()) return null;
  var slot = etAdvisedSlot(cond, etKit()), before = etCopyRules(), rules = etCopyRules();
  if (!slot || !rules[index]) return null;
  var o = rules[index]; rules[index] = { conditionId: cond, actionSlot: slot };
  etCommitRules(rules);
  return { kind: "replaced", index: index, old: o, rule: rules[index], before: before };
}
window.grimoireReplaceRule = grimoireReplaceRule;

/* « Annuler » : les règles d'avant le geste reviennent (dans le jeu actif aussi). */
function grimoireUndoRules(before) {
  if (!etEditable() || !Array.isArray(before)) return false;
  etCommitRules(before.map(function (r) { return { conditionId: r.conditionId, actionSlot: r.actionSlot }; }));
  return true;
}
window.grimoireUndoRules = grimoireUndoRules;
window.etRuleCovers = etRuleCovers;
window.etRuleLabel = etRuleLabel;

/* v3.738.0 (Seb 07/11, « on peut crafter des contres dans les potions ») : objets de combat dans le pronostic.
   L'objet d'un trait (data/combat-items.js), son stock, où il se prépare ; « soften » : il atténue sans couvrir. */
function etItemForTrait(trait) {
  if (!trait || !window.COMBAT_ITEMS) return null;
  var id = (window.COMBAT_ITEM_ORDER || []).filter(function (k) { return COMBAT_ITEMS[k] && COMBAT_ITEMS[k].trait === trait; })[0];
  return id ? COMBAT_ITEMS[id] : null;
}
/* Un objet de la liste tient-il ce trait (Baume, Encens, Huile, Sel) ? Les objets qui atténuent ne comptent pas. */
function etItemHolds(trait, items) {
  return (Array.isArray(items) ? items : []).some(function (id) { var it = id && window.COMBAT_ITEMS && COMBAT_ITEMS[id]; return !!(it && trait && it.trait === trait && !it.soften); });
}
function etItemStock(id) { return window.CombatItems ? CombatItems.getStock(id) : 0; }
/* Où se prépare un objet absent de l'Entrepôt (Apothicaire : recette sue, commande à livrer, ou monde à atteindre). */
function etItemWhere(id) {
  var A = window.ApothecaryManager, r = A && A.getRecipe ? A.getRecipe(id) : null;
  if (!A) return "";
  if (A.getLevel() <= 0) return _t("Se prépare à l'Apothicaire, une fois construit.");
  if (A.isLearned(id)) return _t("Se prépare à l'Apothicaire.");
  if (A.isOrderOpen(id)) return _t("Recette à commander à l'Apothicaire.");
  return _t("Recette de l'Apothicaire, qui s'ouvre {lieu}.", { lieu: window.WorldCaps ? WorldCaps.withPrep(Number((r && r.worldIndex) || 0)) : _t("plus tard") });
}
/* Le combat compte-t-il un miroir (TowerSystem.isMirror) : boss à phase « mirror », Gardien qui répète, boss du Sommet interdit. */
function etMirrorFoe(ctx) {
  return etCreaturesFor(ctx).some(function (c) {
    if (c.kind === "elite") return c.id === "gardien_qui_repete";
    if (c.kind === "dungeonBoss") return Number(c.id) === 6;
    return c.kind === "boss" && (c.phases || []).some(function (ph) { return ph && ph.mirror; });
  });
}
/* L'objet fait-il mieux que la règle ? Cas mesuré (banc silhouette-rodeur, Baume froid 81 → 94 %) : trait permanent tenu,
   face à un miroir où la règle ferait rejouer la même technique. Situation s de grimoireSortieSituations. */
// v3.739.0 (Seb 07/11) : seuls les objets au gain mesuré (Huile de lame : 91 → 91 %, sans gain, reste « Ou emporte »)
var ET_ITEMS_MESURES = {}; // v3.776.0 : les objets contre les traits sont retirés ; ces aides ne proposent plus rien
function etItemBeatsRule(ctx, s, rules) {
  var it = s && etItemForTrait(s.trait);
  if (!it || it.soften || !ET_ITEMS_MESURES[it.id] || !etMirrorFoe(ctx)) return false;
  var r = etRuleResponse(s.cond, rules || game.grimoireRules, etKit()), slot = r.status === "counter" ? r.rule.actionSlot : s.slot;
  return /^skill[123]$/.test(slot || "");
}
/* « Tout préparer » (point 3) : objets en stock, non choisis, qui font mieux que leur règle. */
function grimoireAutoItems(ctx, items) {
  var out = [];
  if (!window.CombatItems) return out;
  grimoireSortieSituations(ctx).forEach(function (s) {
    var it = etItemForTrait(s.trait);
    if (s.opt || !it || (items || []).indexOf(it.id) !== -1 || out.indexOf(it.id) !== -1 || etItemStock(it.id) <= 0) return;
    if (etItemBeatsRule(ctx, s)) out.push(it.id);
  });
  return out;
}
/* Objets conseillés pour une sortie, en stock, du plus utile au moins utile : traits sans place au Grimoire, objets meilleurs
   que leur règle, autres traits tenus, puis ceux qui atténuent (Bouclier, Silence, Tri, Carapace). Suivi par le robot.
   v3.739.0 (Seb 07/11) : sansStock, ce qu'il faudrait avoir (le robot fabrique à l'avance pour les prochains boss). */
function sortieAdvisedItems(ctx, sansStock) {
  var out = [], open = (typeof getGrimoireSlotCount === "function") ? getGrimoireSlotCount(game.worldsEverReached) : 3;
  if (!window.CombatItems || !ctx) return out;
  var push = function (it) { if (it && out.indexOf(it.id) === -1 && (sansStock || etItemStock(it.id) > 0)) out.push(it.id); };
  var sits = grimoireSortieSituations(ctx).filter(function (x) { return !x.opt; }), prev = getEnemyTraitsPreview(ctx).traits;
  sits.slice(open).forEach(function (s) { var it = etItemForTrait(s.trait); if (it && !it.soften) push(it); });
  grimoireSortieSituations(ctx).forEach(function (s) { if (!s.opt && etItemBeatsRule(ctx, s)) push(etItemForTrait(s.trait)); });
  prev.forEach(function (t) { var it = etItemForTrait(t.trait); if (!t.opt && it && !it.soften) push(it); });
  prev.forEach(function (t) { var it = etItemForTrait(t.trait); if (!t.opt && it && it.soften) push(it); });
  return out;
}
window.etItemForTrait = etItemForTrait;
window.etItemHolds = etItemHolds;
window.etItemWhere = etItemWhere;
window.etMirrorFoe = etMirrorFoe;
window.etItemBeatsRule = etItemBeatsRule;
window.grimoireAutoItems = grimoireAutoItems;
window.sortieAdvisedItems = sortieAdvisedItems;

/* v3.736.0 (Seb 07/11, Grimoire vivant) : situations CERTAINES d'une créature, même jamais vaincue (données du moteur) :
   un boss se soigne et se protège, une élite se protège et s'exalte, un ennemi ordinaire charge ou, dès le Désert, muselle. */
function etWorldIndex(ctx) {
  var q = ctx && ctx.type === "adventure" ? (window.ADVENTURE_QUESTS || {})[ctx.id] : null;
  var d = ctx && ctx.type === "dungeon" ? (window.DUNGEONS || []).filter(function (x) { return x.id === Number(ctx.id); })[0] : null;
  var wid = (q && q.worldId) || (d && d.worldId) || null, W = window.WORLDS || [];
  for (var i = 0; wid && i < W.length; i++) if (W[i].id === wid) return i;
  return window.WorldManager ? Number(WorldManager.worldIndex || 0) : 0;
}
function etCertainTraits(c, ctx) {
  if (c.kind === "boss" || c.kind === "dungeonBoss") return c.noHeal ? [{ trait: "shielded" }] : [{ trait: "heal" }, { trait: "shielded" }]; // v3.737.0
  if (c.kind === "elite") return [{ trait: "shielded" }, { trait: "surge" }];
  if (c.kind !== "enemy") return [];
  var fixed = (typeof FIXED_ENEMY_ARCHETYPES !== "undefined" && FIXED_ENEMY_ARCHETYPES[c.id]) || null;
  var silence = !fixed && !c.inDungeon && etWorldIndex(ctx) >= Number(window.SILENCED_MIN_WORLD_INDEX || 1), out = [];
  if (fixed !== "shielded" && fixed !== "silenced") out.push({ trait: "charge", ou: silence });
  if (silence) out.push({ trait: "silenced", ou: true });
  return out;
}
/* Phases actives dès le round 1 (atPct 1) : annoncées (Seb 07/11, g1-phase A) ; « elle se bat comme toi » = trait de ta classe. */
function etRoundOnePhaseTraits(c) {
  var out = [];
  (Array.isArray(c.phases) ? c.phases : []).forEach(function (ph) {
    if (!ph || Number(ph.atPct) < 1) return;
    var arch = ph.copyClass ? ((window.TOWER_CLASS_ARCHETYPE || {})[window.TowerSystem ? TowerSystem.baseHeroId(game.heroId) : game.heroId] || "enraged") : ph.archetype;
    var t = [];
    if (arch && ENEMY_TRAIT_DEFS[arch]) t.push(arch);
    if (ph.sleepAdds) t.push("asleep");
    if (ph.sorts) t.push("sorting");
    if (ph.adds && !ph.sleepAdds) t.push("adds");
    t.forEach(function (x) { out.push({ trait: x, phase: ph.label || "" }); });
  });
  return out;
}

/* v3.742.0 (Seb 07/11, boss courts) : boss déjà vaincu, ses phases en cours de combat sont annoncées (later). */
function etLaterPhaseTraits(c) {
  return etRoundOnePhaseTraits({ phases: (Array.isArray(c.phases) ? c.phases : []).filter(function (ph) { return ph && Number(ph.atPct) < 1; })
    .map(function (ph) { var o = {}; for (var k in ph) o[k] = ph[k]; o.atPct = 1; return o; }) })
    .map(function (x) { x.later = true; return x; });
}

/* Traits connus (groupés) et créatures jamais vaincues ; v3.736.0 : + situations certaines et phases du round 1,
   une situation certaine jamais rencontrée (GrimoireSeen) compte dans « unknown » sans être nommée. */
function getEnemyTraitsPreview(ctx) {
  var traits = {}, unmet = 0, seen = {};
  var put = function (t, name, x) {
    if (!ENEMY_TRAIT_DEFS[t]) return;
    var e = traits[t] = traits[t] || { names: [], ou: true, opt: true, phase: null, later: false, sure: true };
    if (name && e.names.indexOf(name) === -1) e.names.push(name);
    if (!(x && x.sure)) e.sure = false; // vu sur une créature vaincue : rencontré, jamais caché
    if (!(x && x.ou)) e.ou = false;
    if (!(x && x.opt)) e.opt = false;
    if (x && x.phase != null && (e.phase == null || (e.later && !x.later))) { e.phase = x.phase; e.later = !!x.later; } // le round 1 prime
  };
  etCreaturesFor(ctx).forEach(function (c) {
    var key = c.kind + ":" + c.id;
    if (seen[key]) return;
    seen[key] = true;
    var d = etDescribe(c), nom = d.met ? d.name : (c.kind === "enemy" ? _t("créatures jamais vaincues") : c.kind === "elite" ? _t("l'élite") : _t("le boss"));
    etCertainTraits(c, ctx).forEach(function (x) { x.sure = true; put(x.trait, nom, x); });
    etRoundOnePhaseTraits(c).forEach(function (x) { x.sure = true; put(x.trait, nom, x); });
    if (!d.met) { unmet++; return; }
    d.traits.forEach(function (t) { put(t, d.name); });
    if (c.kind === "boss" || c.kind === "dungeonBoss") etLaterPhaseTraits(c).forEach(function (x) { put(x.trait, d.name, x); });
  });
  etQuestTraits(ctx).forEach(function (x) { if (x.trait === "vein") x.sure = true; put(x.trait, x.name, x); });
  var unknown = 0;
  var list = ENEMY_TRAIT_ORDER.filter(function (t) { return traits[t]; }).filter(function (t) {
    var cond = ENEMY_TRAIT_DEFS[t].cond, hide = !!(traits[t].sure && cond && window.GrimoireSeen && !GrimoireSeen.isVisible(cond));
    if (hide) unknown++;
    return !hide;
  }).map(function (t) { var e = traits[t]; return { trait: t, names: e.names, ou: e.ou, opt: e.opt, phase: e.phase, later: e.later }; });
  list.sort(function (a, b) { return (a.phase != null ? 0 : 1) - (b.phase != null ? 0 : 1); }); // la phase du round 1 en tête
  return { traits: list, unmet: unmet, unknown: unknown };
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
