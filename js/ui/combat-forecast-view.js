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
    h += '    <div class="cf-lowhp"><img class="cf-lowhp-ico" src="images/Icons/combat_stats/stat_health.png" alt="">'
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
    h += '      <div class="cf-row"><span>' + _t("Estimation") + '</span><span>' + _t("~{a} rounds contre ~{b}", { a: f.roundsToKill, b: f.roundsToDie }) + '</span></div>';
  }
  h += '    </div>';

  if (opts.traitsHTML) h += opts.traitsHTML; // v3.378.0 : « Ce que tu vas affronter »
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
  /* v3.378.0 : le Donjon lancé du tableau n'a pas de feuille — l'encart des traits passe ici,
     et ouvre l'écran même sur un combat abordable (les quêtes l'ont dans leur introduction). */
  var traitsHTML = (mission.sourceKind === "dungeon" && typeof buildEnemyTraitsCardHTML === "function")
    ? buildEnemyTraitsCardHTML({ type: "dungeon", id: Number(String(mission.id).replace("dungeon_", "")) }) : "";
  if (!lowHp && !traitsHTML && CombatForecast.getLevelDef(f.id).level < 2) return action();
  openCombatForecastConfirm(f, {
    title: mission.title || _t("Avant de partir"),
    confirmLabel: (f.unwinnable || lowHp) ? _t("Partir quand même") : _t("Partir"),
    lowHp: lowHp,
    traitsHTML: traitsHTML,
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

/* Trait → condition du Grimoire qui le vise, et état de combat qui le décrit (nom, icône, conseil). */
var ENEMY_TRAIT_DEFS = {
  shielded:  { cond: "shieldIncoming",       state: "shieldIncoming" },
  silenced:  { cond: "enemySilenceIncoming", state: "silence" },
  armored:   { cond: "enemyArmored",         state: "armored" },
  enraged:   { cond: "enemyEnraged",         state: "enraged" },
  vampiric:  { cond: "enemyVampiric",        state: "vampiric" },
  corrupted: { cond: "enemyCorrupted",       state: "corrupted" }
};
var ENEMY_TRAIT_ORDER = ["shielded", "silenced", "armored", "enraged", "vampiric", "corrupted"];

var enemyTraitsLastCtx = null; // contexte du dernier encart, pour le redessiner après un preset

/* L'encart n'existe qu'en mode Grimoire (en Tactique, le trait se lit en direct sous la barre de vie). */
function isEnemyTraitsPreviewActive() {
  if (!window.game || game.combatMode !== "grimoire") return false;
  return (typeof isTabUnlocked !== "function") || isTabUnlocked("grimoire");
}

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
  if (quest.eliteId) out.push({ kind: "elite", id: quest.eliteId });
  if (quest.bossId) out.push({ kind: "boss", id: quest.bossId, archetype: quest.bossArchetype || null });
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
  if (ctx.type === "elite") return [{ kind: "elite", id: ctx.id }];
  if (ctx.type === "dungeon") {
    var d = (window.DUNGEONS || []).filter(function (x) { return x.id === Number(ctx.id); })[0];
    if (!d) return [];
    var out = [];
    etDungeonPool(d).forEach(function (id) {
      if (window.FIXED_ENEMY_ARCHETYPES && FIXED_ENEMY_ARCHETYPES[id]) out.push({ kind: "enemy", id: id });
    });
    Object.keys(d.eliteWaves || {}).forEach(function (w) {
      var eid = d.eliteWaves[w];
      if (!out.some(function (x) { return x.id === eid; })) out.push({ kind: "elite", id: eid });
    });
    if (d.boss) out.push({ kind: "dungeonBoss", id: d.id, name: d.boss.name, archetype: d.boss.archetype || null });
    return out;
  }
  return [];
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

/* Nom, trait fixe et « déjà vaincu » d'une créature. */
function etDescribe(c) {
  if (c.kind === "enemy") {
    var e = window.ENEMY_DB && ENEMY_DB[c.id];
    var fixed = (typeof FIXED_ENEMY_ARCHETYPES !== "undefined" && FIXED_ENEMY_ARCHETYPES[c.id]) || null;
    return { name: e ? e.name : c.id, trait: fixed, met: etKilled(c.id) };
  }
  if (c.kind === "elite") {
    var el = window.ELITE_DB && ELITE_DB[c.id];
    return { name: el ? el.name : c.id, trait: el ? (el.archetype || null) : null, met: etKilled(c.id) };
  }
  if (c.kind === "boss") {
    var b = window.BOSS_DB && BOSS_DB[c.id];
    return { name: b ? b.name : c.id, trait: c.archetype, met: etKilled(c.id) };
  }
  if (c.kind === "dungeonBoss") {
    return { name: c.name || "Boss", trait: c.archetype, met: !!(game.dungeonTierCleared && game.dungeonTierCleared[c.id]) };
  }
  return { name: c.id, trait: null, met: false };
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
    if (!d.trait || !ENEMY_TRAIT_DEFS[d.trait]) return;
    (traits[d.trait] = traits[d.trait] || []).push(d.name);
  });
  var list = ENEMY_TRAIT_ORDER.filter(function (t) { return traits[t]; }).map(function (t) { return { trait: t, names: traits[t] }; });
  return { traits: list, unmet: unmet };
}
window.getEnemyTraitsPreview = getEnemyTraitsPreview;

function buildEnemyTraitsCardHTML(ctx) {
  if (!isEnemyTraitsPreviewActive()) return "";
  var p = getEnemyTraitsPreview(ctx);
  if (!p.traits.length) return "";
  enemyTraitsLastCtx = ctx;
  if (typeof ensureGrimoireRules === "function") ensureGrimoireRules();
  var kit = (typeof getGrimoireCurrentKit === "function") ? getGrimoireCurrentKit() : null;
  var rules = game.grimoireRules || [];

  var h = '<div class="et-card" id="et-card">';
  h += '<div class="et-title"><img class=ico-inline src=images/Icons/codex/codex_lore.png> ' + _t("Ce que tu vas affronter") + '</div>';
  h += '<div class="et-sub">' + _t("Ton Grimoire jouera seul : vérifie qu'il répond.") + '</div>';

  p.traits.forEach(function (t) {
    var def = ENEMY_TRAIT_DEFS[t.trait];
    var st = (window.COMBAT_STATES || {})[def.state] || {};
    var r = etRuleResponse(def.cond, rules, kit);
    h += '<div class="et-row is-' + r.status + '">';
    h += '<img class="et-ico" src="' + esc(st.icon || "") + '" alt="">';
    h += '<div class="et-body">';
    h += '<div class="et-name"><b>' + esc(_td(st.nom || t.trait)) + '</b> · ' + esc(t.names.map(function (n) { return _td(n); }).join(", ")) + '</div>';
    if (st.hint) h += '<div class="et-hint">' + esc(_td(st.hint)) + '</div>';
    h += '<div class="et-resp">';
    if (r.status === "counter") h += '<img class=ico-inline src=images/Icons/combat_stats/stat_speed.png> ' + esc(_t("Ta règle « {r} » le contre.", { r: etRuleLabel(r.rule, kit) }));
    else if (r.status === "react") h += esc(_t("Ta règle « {r} » réagit, sans le contrer.", { r: etRuleLabel(r.rule, kit) }));
    else h += '<img class=ico-inline src=images/Icons/system/warning.png> ' + _t("Aucune règle active ne répond.");
    h += '</div></div></div>';
  });

  if (p.unmet) h += '<div class="et-unmet">' + esc(_tn(p.unmet, "{n} créature jamais vaincue : ses traits se révéleront au premier combat.", "{n} créatures jamais vaincues : leurs traits se révéleront au premier combat.")) + '</div>';

  /* Presets : un geste pour changer de jeu de règles, avec ce que chacun contre ici. */
  var presets = (typeof ensureGrimoirePresets === "function") ? ensureGrimoirePresets() : [];
  var editable = (typeof isGrimoireEditable !== "function") || isGrimoireEditable();
  if (presets.length) {
    var current = JSON.stringify(etActiveRules(rules).map(function (x) { return [x.conditionId, x.actionSlot]; }));
    h += '<div class="et-presets-title">' + _t("Presets") + '</div><div class="et-presets">';
    presets.forEach(function (pr) {
      var n = p.traits.filter(function (t) { return etRuleResponse(ENEMY_TRAIT_DEFS[t.trait].cond, pr.rules, kit).status === "counter"; }).length;
      var isCur = JSON.stringify(etActiveRules(pr.rules).map(function (x) { return [x.conditionId, x.actionSlot]; })) === current;
      h += '<button type="button" class="et-chip' + (isCur ? ' is-current' : '') + '"' + (editable && !isCur ? ' onclick="loadEnemyTraitsPreset(\'' + esc(pr.id) + '\')"' : ' disabled') + '>'
        + esc(_td(pr.name)) + ' <span class="et-chip-n">⚡ ' + n + '/' + p.traits.length + '</span></button>';
    });
    h += '</div>';
    if (!editable) h += '<div class="et-unmet">' + _t("Grimoire verrouillé pendant une sortie.") + '</div>';
  }
  h += '<button type="button" class="settings-btn et-open" onclick="openGrimoireFromTraits()">' + _t("Ouvrir le Grimoire") + '</button>';
  h += '</div>';
  return h;
}
window.buildEnemyTraitsCardHTML = buildEnemyTraitsCardHTML;

/* Charge un preset sans quitter l'écran de lancement, puis redessine l'encart. */
function loadEnemyTraitsPreset(presetId) {
  if (typeof isGrimoireEditable === "function" && !isGrimoireEditable()) return;
  if (typeof loadGrimoirePreset !== "function") return;
  loadGrimoirePreset(presetId);
  var pr = (game.grimoirePresets || []).filter(function (x) { return x.id === presetId; })[0];
  var el = document.getElementById("et-card");
  if (el && enemyTraitsLastCtx) el.outerHTML = buildEnemyTraitsCardHTML(enemyTraitsLastCtx);
  if (pr && typeof showToast === "function") showToast(_t("Preset « {x} » chargé", { x: _td(pr.name) }), 1400);
}
window.loadEnemyTraitsPreset = loadEnemyTraitsPreset;

/* Ferme l'écran de lancement en cours et ouvre le Grimoire (le joueur relancera ensuite). */
function openGrimoireFromTraits() {
  ["closeAdventureQuestIntro", "closeHuntQuestIntro", "closeDungeonSheet", "closeCombatForecast"].forEach(function (f) {
    if (typeof window[f] === "function") window[f]();
  });
  if (typeof switchTab === "function") switchTab("grimoire");
}
window.openGrimoireFromTraits = openGrimoireFromTraits;
