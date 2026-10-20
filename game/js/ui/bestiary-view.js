"use strict";
/* ui/bestiary-view.js — écran Bestiaire (liste par monde, accordéon) fusionné avec Codex (2 sous-onglets, v2.83.40). Estimation combat resynchronisée sur progression-system.js (v3.46.0). Détail : COMMENTAIRES_ORIGINAUX.md */

/* v3.405.0 (décision Seb 01/10/2026) : la Bibliothèque regroupe Bestiaire, Codex et Tutoriels
   dans un rail en haut (comme Quêtes) au lieu de la barre du bas. Les onglets "bestiary" et
   "tutorials" ouvrent tous deux cette page ; Bestiaire et Codex n'apparaissent qu'une fois
   l'onglet Bestiaire débloqué par l'Histoire, Tutoriels est toujours là. */
var activeBestiaryCodexSubTab = "bestiary"; // "bestiary" | "codex" | "tutorials"

function libraryHasBestiary() {
  return typeof isTabUnlocked !== "function" || isTabUnlocked("bestiary");
}
function libraryActiveSub() {
  var s = activeBestiaryCodexSubTab;
  if (s !== "codex" && s !== "tutorials") s = "bestiary";
  return (s !== "tutorials" && !libraryHasBestiary()) ? "tutorials" : s;
}

function setBestiaryCodexSubTab(tab) {
  activeBestiaryCodexSubTab = (tab === "codex" || tab === "tutorials") ? tab : "bestiary";
  if (typeof renderPanel === "function") renderPanel();
}
window.setBestiaryCodexSubTab = setBestiaryCodexSubTab;

var LIBRARY_SUBS = [
  { key: "bestiary", icon: "images/Icons/subtabs/bestiary.png", label: _t("Bestiaire") },
  { key: "codex", icon: "images/Icons/subtabs/codex.png", label: _t("Codex") },
  { key: "tutorials", icon: "images/Icons/codex/codex_lore.png", label: _t("Tutoriels") }
];

/* Rail du kit (.kseg.is-stack). Masqué s'il ne reste qu'un onglet (Bestiaire pas encore débloqué). */
function buildBestiaryCodexSubTabBarHTML() {
  var subs = LIBRARY_SUBS.filter(function (s) { return s.key === "tutorials" || libraryHasBestiary(); });
  if (subs.length < 2) return "";
  var cur = libraryActiveSub();
  var h = '<div class="kseg is-stack lib-tabs">';
  subs.forEach(function (s) {
    h += '<button type="button" class="lib-tab' + (cur === s.key ? ' is-on' : '') + '" onclick="setBestiaryCodexSubTab(\'' + s.key + '\')">';
    h += '<img src="' + s.icon + '" alt=""><span>' + esc(s.label) + '</span></button>';
  });
  h += '</div>';
  return h;
}

var BESTIARY_ENEMY_POWER_DMG_COEF = 0.5;
var BESTIARY_ENEMY_PRECISION_CRIT_COEF = 0.3;

function findCreatureLocation(id, isBoss) {
  var dj = bestiaryDungeonOf(id); // v3.456.8 : boss de donjon, rangé dans le monde de son donjon
  if (dj) {
    var dw = WORLDS.findIndex(function (w) { return w.id === dj.worldId; });
    return { worldIndex: dw === -1 ? 0 : dw, adventureIndex: 0 };
  }
  // v3.205.0 (E5) : une élite n'est ni un boss d'aventure ni dans un enemyPool —
  // on la localise via l'ennemi dont elle est la variante.
  var eliteDef = (window.ELITE_DB && ELITE_DB[id]) || null;
  if (eliteDef) return findCreatureLocation(eliteDef.baseId, false);
  // v3.360.0 (acte IV) : un boss d'Histoire qu'aucune aventure ne déclare (Nezzam) dit son monde.
  var fiche = isBoss && window.BOSS_DB ? BOSS_DB[id] : ((window.ENEMY_DB && ENEMY_DB[id]) || null); // v3.456.7 : un ennemi hors aventure (Bâtisseur) dit aussi son monde
  if (fiche && fiche.worldId) {
    var wi = WORLDS.findIndex(function (w) { return w.id === fiche.worldId; });
    if (wi !== -1) return { worldIndex: wi, adventureIndex: 0 };
  }

  for (var w = 0; w < WORLDS.length; w++) {
    var adventures = WORLDS[w].adventures || [];
    for (var a = 0; a < adventures.length; a++) {
      if (isBoss) {
        if (adventures[a].boss === id) return { worldIndex: w, adventureIndex: a };
      } else if ((adventures[a].enemyPool || []).indexOf(id) !== -1) {
        return { worldIndex: w, adventureIndex: a };
      }
    }
  }
  return null;
}

function estimateCreatureCombatStats(id, data, isBoss) {
  var stats = data && data.stats;
  if (!stats) return null;

  var location = findCreatureLocation(id, isBoss);
  var worldIndex = location ? location.worldIndex : 0;
  var adventureIndex = location ? location.adventureIndex : 0;

  var pvMult = (typeof window.ENEMY_PV_MULT === "number") ? window.ENEMY_PV_MULT : 4.0;
  var bossPvMult = (typeof window.BOSS_PV_MULT === "number") ? window.BOSS_PV_MULT : 6.7;
  var worldExp = (typeof window.ENEMY_PV_WORLD_EXP === "number") ? window.ENEMY_PV_WORLD_EXP : 1.45;
  var powerExp = (typeof window.ENEMY_POWER_SCALE_EXP === "number") ? window.ENEMY_POWER_SCALE_EXP : 0.9;

  var hp, scale;
  if (isBoss) {
    var bossWorldComponent = Math.pow(1 + worldIndex * 1.3, worldExp);
    scale = bossWorldComponent + adventureIndex * 0.4;
    hp = Math.floor((stats.endurance || 0) * bossPvMult * scale);
  } else {
    var worldComponent = Math.pow(1 + worldIndex * 0.90, worldExp);
    scale = worldComponent + adventureIndex * 0.30;
    hp = Math.floor((stats.endurance || 0) * pvMult * scale);
  }

  var scaledPower = (stats.power || 0) * Math.pow(scale, powerExp);
  var dmg = Math.max(1, Math.floor(scaledPower * BESTIARY_ENEMY_POWER_DMG_COEF));
  var critChance = Math.min(40, (stats.precision || 0) * BESTIARY_ENEMY_PRECISION_CRIT_COEF);

  return { hp: Math.max(1, hp), dmg: dmg, critChance: critChance };
}

function getAllBestiaryIds() {
  // v3.205.0 (E5) : les élites ont leur entrée, comme les boss.
  var eliteIds = window.ELITE_DB ? Object.keys(ELITE_DB) : [];
  return Object.keys(ENEMY_DB).concat(Object.keys(BOSS_DB)).concat(eliteIds).concat(bestiaryDungeonBossIds());
}

/* ---------- v3.456.8 (liste de Seb) : boss de donjon, fiche commune, « où la trouver », fiche en grand ---------- */

/* Un boss de donjon bâti sur une fiche d'un autre nom (la Liche sur le Nécromancien suprême, Varrek, le Basilic)
   a sa propre entrée « donjon_<id> », rencontrée quand le donjon est terminé (dungeon-system.js n'est pas touché). */
var BESTIARY_DUNGEON_PREFIX = "donjon_";
function bestiaryDungeonBossIds() {
  return (window.DUNGEONS || []).filter(function (d) {
    var b = d.boss, base = b && BOSS_DB[b.baseId];
    return !!(b && b.name && base && b.name !== base.name);
  }).map(function (d) { return BESTIARY_DUNGEON_PREFIX + d.id; });
}
function bestiaryDungeonOf(id) {
  if (typeof id !== "string" || id.indexOf(BESTIARY_DUNGEON_PREFIX) !== 0) return null;
  var n = Number(id.slice(BESTIARY_DUNGEON_PREFIX.length));
  return (window.DUNGEONS || []).filter(function (d) { return d.id === n; })[0] || null;
}

/* Fiche d'une créature, quelle que soit sa table. */
function bestiaryData(id) {
  var dj = bestiaryDungeonOf(id);
  if (dj) {
    var base = BOSS_DB[dj.boss.baseId], m = dj.boss.statMult || {};
    return { name: dj.boss.name, image: dj.boss.image || base.image, asset: base.asset, lore: dj.boss.lore || "",
      resists: base.resists || [], weak: base.weak || [], isBoss: true, isElite: false,
      stats: makeRpgStats(Math.floor((base.stats.power || 0) * (m.power || 1)), Math.floor((base.stats.endurance || 0) * (m.endurance || 1)),
        base.stats.celerity, base.stats.precision, base.stats.will) };
  }
  var elite = window.ELITE_DB && ELITE_DB[id];
  var d = elite ? buildEliteBestiaryData(elite) : (BOSS_DB[id] || ENEMY_DB[id]);
  if (!d) return null;
  var out = {};
  Object.keys(d).forEach(function (k) { out[k] = d[k]; });
  out.isBoss = !!BOSS_DB[id] || !!elite;
  out.isElite = !!elite;
  return out;
}
function bestiaryKills(id) {
  var dj = bestiaryDungeonOf(id);
  if (dj) return (game.dungeonTierCleared || {})[dj.id] ? 1 : 0;
  return Number((game.killCounts || {})[id] || 0);
}
function bestiaryMet(id) { return bestiaryKills(id) > 0; }

/* Où la croiser : aventures, donjons (vagues, élites, boss), quêtes, parcours, cartes. Trois lieux au plus. */
function creatureWhere(id) {
  var out = [];
  function add(x) { if (x && out.indexOf(x) === -1) out.push(x); }
  var dj = bestiaryDungeonOf(id);
  if (dj) return [_td(dj.name)];
  WORLDS.forEach(function (w) { (w.adventures || []).forEach(function (a) { if ((a.enemyPool || []).indexOf(id) !== -1 || a.boss === id) add(_td(a.name)); }); });
  (window.DUNGEONS || []).forEach(function (d) {
    if (d.locked && !d.requiresStoryStep) return;
    var ew = d.eliteWaves || {};
    if ((d.enemyPool || []).indexOf(id) !== -1 || Object.keys(ew).some(function (k) { return ew[k] === id; })) add(_td(d.name));
  });
  var Q = window.ADVENTURE_QUESTS || {};
  Object.keys(Q).forEach(function (k) {
    var q = Q[k], inGroup = (q.encounters || []).some(function (e) { return (e.group || []).indexOf(id) !== -1; });
    if (q.eliteId === id || q.bossId === id || inGroup) add(_td(q.name));
  });
  var S = window.SCENE_TEMPLATES || {};
  Object.keys(S).forEach(function (k) {
    var p = S[k].parcours;
    if (p && (p.steps || []).some(function (st) { return st.foe === id; })) add(_td(S[k].title));
  });
  return out.slice(0, 3);
}

/* v3.456.8 : nom lisible d'un type d'attaque (les fiches gardent l'identifiant : sword, bow, magic). */
function bestiaryAttackLabel(t) {
  return ({ sword: _t("l'épée"), bow: _t("l'arc"), magic: _t("la magie") })[t] || _td(t);
}

/* Ce qu'elle fait de particulier, lu sur la fiche (traits des mondes). */
function creatureTraits(id) {
  var e = (window.ENEMY_DB || {})[id] || {}, el = (window.ELITE_DB || {})[id] || {}, out = [];
  if (e.support) out.push(_t("Soutien : elle aide les autres, vise-la d'abord."));
  if (e.calls) out.push(_t("Appelle : réveille un mort qui dort."));
  if (el.wakesOnHit) out.push(_t("Frappé, il réveille un dormeur de son escorte."));
  if (el.lulls) out.push(_t("Endort un compagnon un round."));
  if (el.archetype || e.archetype) { var a = el.archetype || e.archetype, st = window.COMBAT_STATES && COMBAT_STATES[a]; if (st && st.nom) out.push(_td(st.nom)); }
  return out;
}

function getBestiarySheetRoot() {
  var root = document.getElementById("bestiary-sheet-root");
  if (!root && document.body && typeof document.createElement === "function") {
    root = document.createElement("div");
    root.id = "bestiary-sheet-root";
    document.body.appendChild(root);
  }
  return root;
}

/* La fiche en grand : image, ce qu'elle fait, où la trouver, chiffres. Pas encore rencontrée : où la chercher. */
function openCreatureSheet(id) {
  var d = bestiaryData(id);
  if (!d) return;
  var met = bestiaryMet(id), kills = bestiaryKills(id), where = creatureWhere(id);
  var kind = d.isElite ? _t("Élite") : (d.isBoss ? _t("Boss") : _t("Créature"));
  var title = met ? _td(d.name) : "???";
  var h = '<div class="hf-sheet-bg"><div class="ksheet-backdrop" onclick="closeCreatureSheet()"></div><div class="ksheet hf-sheet bst-sheet" role="dialog" aria-label="' + esc(title) + '">';
  h += kSheetHeadHTML({ title: esc(title), close: "closeCreatureSheet()" });
  h += '<div class="ksheet-body">';
  h += '<div class="bst-portrait' + (d.isBoss ? ' is-boss' : '') + (d.isElite ? ' is-elite' : '') + (met ? '' : ' is-unknown') + '">';
  if (met && d.image) h += '<img src="' + esc(d.image) + '" alt="' + esc(title) + '">';
  else if (met) h += '<span class="bst-portrait-emoji">' + renderIcon(d.isBoss ? "bosses" : "enemies", d.asset || "") + '</span>';
  else h += '<span class="bst-portrait-q">?</span>';
  h += '</div>';
  h += '<div class="bst-kind">' + esc(kind) + (met ? ' · ' + esc(_tn(kills, "vaincue une fois", "vaincue {n} fois")) : '') + '</div>';
  if (!met) {
    h += '<p class="bst-line">' + _t("Pas encore rencontrée.") + '</p>';
  } else {
    if (d.lore) h += '<p class="bst-lore">' + esc(_td(d.lore)) + '</p>';
    creatureTraits(id).forEach(function (t) { h += '<p class="bst-line">' + esc(t) + '</p>'; });
    var resists = Array.isArray(d.resists) ? d.resists : [], weak = Array.isArray(d.weak) ? d.weak : [];
    if (resists.length) h += '<p class="bst-line">' + esc(_t("Résiste : {liste}", { liste: resists.map(bestiaryAttackLabel).join(", ") })) + '</p>';
    if (weak.length) h += '<p class="bst-line">' + esc(_t("Faible : {liste}", { liste: weak.map(bestiaryAttackLabel).join(", ") })) + '</p>';
    var c = estimateCreatureCombatStats(id, d, d.isBoss);
    if (c) {
      h += '<div class="nb-entry-meta-row bst-stats">';
      h += '<span class="nb-entry-meta"><img class=ico-inline src=images/Icons/combat_stats/stat_health.png> ' + formatNumber(c.hp) + '</span>';
      h += '<span class="nb-entry-meta"><img class=ico-inline src=images/Icons/combat_stats/stat_attack.png> ' + formatNumber(c.dmg) + '</span>';
      h += '<span class="nb-entry-meta"><img class=ico-inline src=images/Icons/combat_stats/stat_critical.png> ' + Math.round(c.critChance) + '%</span>';
      h += '</div>';
    }
  }
  if (where.length) h += '<p class="bst-where"><strong>' + _t("Où la trouver :") + '</strong> ' + esc(where.join(" · ")) + '</p>';
  h += '</div></div></div>';
  var root = getBestiarySheetRoot();
  if (root) root.innerHTML = h;
}
function closeCreatureSheet() {
  var root = document.getElementById("bestiary-sheet-root");
  if (root) root.innerHTML = "";
}

/* v3.205.0 (E5) : une élite n'a pas d'entrée propre dans ENEMY_DB/BOSS_DB — on
   compose sa fiche depuis sa base et ses multiplicateurs, source unique. */
function buildEliteBestiaryData(def) {
  var base = (window.ENEMY_DB && ENEMY_DB[def.baseId]) || null;
  if (!base) return null;
  var m = def.statMult || {};
  return {
    name: def.name,
    asset: base.asset,
    image: def.image || base.image, // v3.348.0 : portrait propre de l'élite
    lore: def.lore || "",
    resists: base.resists || [],
    weak: base.weak || [],
    stats: makeRpgStats(
      Math.floor((base.stats.power || 0) * (m.power || 1)),
      Math.floor((base.stats.endurance || 0) * (m.endurance || 1)),
      Math.floor((base.stats.celerity || 0) * (m.celerity || 1)),
      base.stats.precision,
      base.stats.will
    )
  };
}
window.buildEliteBestiaryData = buildEliteBestiaryData;

var expandedBestiaryWorld = null; // v2.83.37 : accordéon replié par défaut

function buildBestiaryEntryCardHTML(id) {
  var data = bestiaryData(id); // v3.456.8 : toutes les tables, boss de donjon compris
  if (!data) return "";
  var isBoss = data.isBoss;

  var kills = bestiaryKills(id);
  var met = kills > 0;

  // v3.456.8 : toucher la carte ouvre la fiche en grand
  var h = '<button type="button" class="nb-entry-card' + (isBoss ? ' boss' : '') + (!met ? ' is-locked' : '') + '" onclick="openCreatureSheet(\'' + esc(id) + '\')">';

  h += '<div class="nb-entry-icon-col"><div class="nb-entry-icon-frame">';
  var imagePath = data.image || "";
  if (imagePath) {
    h += '<img src="' + esc(imagePath) + '" alt="' + esc(data.name ? _td(data.name) : _t("Créature")) + '">';
  } else {
    h += '<span class="nb-entry-icon-emoji">' + renderIcon(isBoss ? "bosses" : "enemies", data.asset || "") + '</span>';
  }
  h += '</div></div>';

  h += '<div class="nb-entry-info-col">';
  h += '<div class="nb-entry-name">' + esc(met ? _td(data.name) : "???") + (isBoss ? ' <span class="nb-entry-badge">' + _t("BOSS") + '</span>' : '') + '</div>';

  if (met) {
    var resists = Array.isArray(data.resists) ? data.resists : [];
    var weak = Array.isArray(data.weak) ? data.weak : [];
    if (resists.length) h += '<div class="nb-entry-desc">' + esc(_t("Résiste : {liste}", { liste: resists.map(bestiaryAttackLabel).join(", ") })) + '</div>';
    if (weak.length) h += '<div class="nb-entry-desc">' + esc(_t("Faible : {liste}", { liste: weak.map(bestiaryAttackLabel).join(", ") })) + '</div>';
    if (data.lore) h += '<div class="nb-entry-desc nb-entry-lore">' + esc(_td(data.lore)) + '</div>'; // v3.360.0 : une ligne de bestiaire

    var combat = estimateCreatureCombatStats(id, data, isBoss);
    if (combat) {
      h += '<div class="nb-entry-meta-row">';
      h += '<span class="nb-entry-meta"><img class=ico-inline src=images/Icons/combat_stats/stat_health.png> ' + formatNumber(combat.hp) + '</span>';
      h += '<span class="nb-entry-meta"><img class=ico-inline src=images/Icons/combat_stats/stat_attack.png> ' + formatNumber(combat.dmg) + '</span>';
      h += '<span class="nb-entry-meta"><img class=ico-inline src=images/Icons/combat_stats/stat_critical.png> ' + Math.round(combat.critChance) + '%</span>';
      h += '</div>';
    }
  } else {
    h += '<div class="nb-entry-desc">' + _t("Pas encore rencontrée.") + '</div>';
  }

  h += '</div>'; // /nb-entry-info-col

  h += '<div class="nb-entry-status-col">';
  h += '<span class="nb-entry-status-label' + (met ? ' is-complete' : '') + '">' + (met ? formatNumber(kills) : "—") + '</span>';
  if (met) h += '<span class="nb-entry-meta">' + _t("tués") + '</span>';
  h += '</div>';

  h += '</button>';
  return h;
}

function toggleBestiaryWorld(worldIndex) {
  expandedBestiaryWorld = (expandedBestiaryWorld === worldIndex) ? null : worldIndex;
  if (typeof renderPanel === "function") renderPanel();
}
window.toggleBestiaryWorld = toggleBestiaryWorld;

function getBestiaryGroupedByWorld() {
  var ids = getAllBestiaryIds();
  var groups = {};

  ids.forEach(function (id) {
    var isBoss = !!BOSS_DB[id] || !!(window.ELITE_DB && ELITE_DB[id]); // v3.205.0 (E5)
    var location = findCreatureLocation(id, isBoss);
    var worldIndex = location ? location.worldIndex : 0;
    if (!groups[worldIndex]) groups[worldIndex] = [];
    if (isBoss) groups[worldIndex].push(id); else groups[worldIndex].unshift(id);
  });

  return groups;
}

function buildBestiaryWorldHeaderHTML(worldIndex, ids, isExpanded) {
  var world = WORLDS[worldIndex];
  var metCount = ids.filter(bestiaryMet).length; // v3.456.8
  var h = '<button type="button" class="nb-accordion-head' + (isExpanded ? ' is-expanded' : '') + '" onclick="toggleBestiaryWorld(' + worldIndex + ')">';
  h += '<span class="nb-accordion-name">' + esc(world ? _td(world.name) : _t("Monde inconnu")) + '</span>';
  h += '<span class="nb-accordion-count">' + metCount + ' / ' + ids.length + '</span>';
  h += '<span class="nb-accordion-chevron">' + (isExpanded ? "▲" : "▼") + '</span>';
  h += '</button>';
  return h;
}

function buildBestiaryListHTML() {
  var groups = getBestiaryGroupedByWorld();
  var h = '';

  WORLDS.forEach(function (world, worldIndex) {
    var ids = groups[worldIndex];
    if (!ids || !ids.length) return;

    var isExpanded = expandedBestiaryWorld === worldIndex;

    h += '<div class="nb-accordion-section' + (isExpanded ? ' is-expanded' : '') + '">';
    h += buildBestiaryWorldHeaderHTML(worldIndex, ids, isExpanded);
    if (isExpanded) {
      h += '<div class="nb-accordion-body">';
      ids.forEach(function (id) {
        h += buildBestiaryEntryCardHTML(id);
      });
      h += '</div>';
    }
    h += '</div>';
  });

  return h;
}

/* v3.333.0 (Évolutions, B5) : trophées de boss — première victoire sur chaque boss ou élite,
   dans l'ordre où ils ont été gagnés. Rien tant qu'aucun n'est gagné. */
var bestiaryTrophiesOpen = false;
function toggleBestiaryTrophies() { bestiaryTrophiesOpen = !bestiaryTrophiesOpen; if (typeof renderPanel === "function") renderPanel(); }
window.toggleBestiaryTrophies = toggleBestiaryTrophies;

function buildBestiaryTrophiesHTML() {
  var list = window.BossMomentManager ? BossMomentManager.list() : [];
  if (!list.length) return "";
  var h = '<div class="nb-accordion-section' + (bestiaryTrophiesOpen ? ' is-expanded' : '') + '">';
  h += '<button type="button" class="nb-accordion-head' + (bestiaryTrophiesOpen ? ' is-expanded' : '') + '" onclick="toggleBestiaryTrophies()">'
    + '<span class="nb-accordion-name">' + '<img class="ico-inline" src="images/Icons/menu_icons/achivment_menu.png" alt=""> ' + _t("Trophées") + '</span><span class="nb-accordion-count">' + list.length + '</span>'
    + '<span class="nb-accordion-chevron">' + (bestiaryTrophiesOpen ? "▲" : "▼") + '</span></button>';
  if (bestiaryTrophiesOpen && typeof buildBossTrophyCardHTML === "function") {
    h += '<div class="nb-accordion-body bm-trophies">' + list.map(buildBossTrophyCardHTML).join("") + '</div>';
  }
  h += '</div>';
  return h;
}
window.buildBestiaryTrophiesHTML = buildBestiaryTrophiesHTML;

function buildBestiaryHTML() {
  var cur = libraryActiveSub();
  var h = '<div class="nb-page-frame nb-page-frame-fill kframe-page" data-kf-title="' + esc("images/Icons/menu_icons/bestiaire_menu.png|" + _t("Bibliothèque")) + '">';
  h += buildBestiaryCodexSubTabBarHTML();

  if (cur === "codex") {
    h += (typeof buildCodexHTML === "function") ? buildCodexHTML() : "";
  } else if (cur === "tutorials") {
    h += (typeof buildTutorialsHTML === "function") ? buildTutorialsHTML() : "";
  } else {
    h += (typeof buildCodexExcerptHTML === "function") ? buildCodexExcerptHTML("bestiary") : "";
    h += buildBestiaryTrophiesHTML(); // v3.333.0 (B5)
    h += buildBestiaryListHTML();
  }

  h += '</div>';
  return h;
}

window.buildBestiaryHTML = buildBestiaryHTML;

window.bestiaryData = bestiaryData;
window.bestiaryMet = bestiaryMet;
window.bestiaryKills = bestiaryKills;
window.creatureWhere = creatureWhere;
window.openCreatureSheet = openCreatureSheet;
window.closeCreatureSheet = closeCreatureSheet;
