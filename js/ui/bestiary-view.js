"use strict";
/* ui/bestiary-view.js — écran Bestiaire (liste par monde, accordéon) fusionné avec Codex (2 sous-onglets, v2.83.40). Estimation combat resynchronisée sur progression-system.js (v3.46.0). Détail : COMMENTAIRES_ORIGINAUX.md */

var activeBestiaryCodexSubTab = "bestiary"; // "bestiary" | "codex"

function setBestiaryCodexSubTab(tab) {
  activeBestiaryCodexSubTab = (tab === "codex") ? "codex" : "bestiary";
  if (typeof renderPanel === "function") renderPanel();
}
window.setBestiaryCodexSubTab = setBestiaryCodexSubTab;

function buildBestiaryCodexSubTabBarHTML() {
  var h = '<div class="pc-subtab-bar">';
  h += '<button type="button" class="pc-subtab-btn' + (activeBestiaryCodexSubTab === "bestiary" ? ' is-active' : '') + '" onclick="setBestiaryCodexSubTab(\'bestiary\')"><img class="pc-subtab-ico" src="images/Icons/subtabs/bestiary.png" alt=""><span>Bestiaire</span></button>';
  h += '<button type="button" class="pc-subtab-btn' + (activeBestiaryCodexSubTab === "codex" ? ' is-active' : '') + '" onclick="setBestiaryCodexSubTab(\'codex\')"><img class="pc-subtab-ico" src="images/Icons/subtabs/codex.png" alt=""><span>Codex</span></button>';
  h += '</div>';
  return h;
}

var BESTIARY_ENEMY_POWER_DMG_COEF = 0.5;
var BESTIARY_ENEMY_PRECISION_CRIT_COEF = 0.3;

function findCreatureLocation(id, isBoss) {
  // v3.205.0 (E5) : une élite n'est ni un boss d'aventure ni dans un enemyPool —
  // on la localise via l'ennemi dont elle est la variante.
  var eliteDef = (window.ELITE_DB && ELITE_DB[id]) || null;
  if (eliteDef) return findCreatureLocation(eliteDef.baseId, false);

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
  return Object.keys(ENEMY_DB).concat(Object.keys(BOSS_DB)).concat(eliteIds);
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
    image: base.image,
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
  var eliteDef = (window.ELITE_DB && ELITE_DB[id]) || null;
  var isBoss = !!BOSS_DB[id] || !!eliteDef;
  var data = eliteDef
    ? buildEliteBestiaryData(eliteDef)
    : (BOSS_DB[id] || ENEMY_DB[id]);
  if (!data) return "";

  var kills = game.killCounts[id] || 0;
  var met = kills > 0;

  var h = '<div class="nb-entry-card' + (isBoss ? ' boss' : '') + (!met ? ' is-locked' : '') + '">';

  h += '<div class="nb-entry-icon-col"><div class="nb-entry-icon-frame">';
  var imagePath = data.image || "";
  if (imagePath) {
    h += '<img src="' + esc(imagePath) + '" alt="' + esc(data.name || "Créature") + '">';
  } else {
    h += '<span class="nb-entry-icon-emoji">' + renderIcon(isBoss ? "bosses" : "enemies", data.asset || "") + '</span>';
  }
  h += '</div></div>';

  h += '<div class="nb-entry-info-col">';
  h += '<div class="nb-entry-name">' + esc(met ? data.name : "???") + (isBoss ? ' <span class="nb-entry-badge">BOSS</span>' : '') + '</div>';

  if (met) {
    var resists = Array.isArray(data.resists) ? data.resists : [];
    var weak = Array.isArray(data.weak) ? data.weak : [];
    if (resists.length) h += '<div class="nb-entry-desc">Résiste : ' + esc(resists.join(", ")) + '</div>';
    if (weak.length) h += '<div class="nb-entry-desc">Faible : ' + esc(weak.join(", ")) + '</div>';

    var combat = estimateCreatureCombatStats(id, data, isBoss);
    if (combat) {
      h += '<div class="nb-entry-meta-row">';
      h += '<span class="nb-entry-meta"><img class=ico-inline src=images/Icons/combat_stats/stat_health.png> ' + formatNumber(combat.hp) + '</span>';
      h += '<span class="nb-entry-meta"><img class=ico-inline src=images/Icons/combat_stats/stat_attack.png> ' + formatNumber(combat.dmg) + '</span>';
      h += '<span class="nb-entry-meta"><img class=ico-inline src=images/Icons/combat_stats/stat_critical.png> ' + Math.round(combat.critChance) + '%</span>';
      h += '</div>';
    }
  } else {
    h += '<div class="nb-entry-desc">Pas encore rencontrée.</div>';
  }

  h += '</div>'; // /nb-entry-info-col

  h += '<div class="nb-entry-status-col">';
  h += '<span class="nb-entry-status-label' + (met ? ' is-complete' : '') + '">' + (met ? formatNumber(kills) : "—") + '</span>';
  if (met) h += '<span class="nb-entry-meta">tués</span>';
  h += '</div>';

  h += '</div>';
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
  var metCount = ids.filter(function (id) { return (game.killCounts[id] || 0) > 0; }).length;
  var h = '<button type="button" class="nb-accordion-head' + (isExpanded ? ' is-expanded' : '') + '" onclick="toggleBestiaryWorld(' + worldIndex + ')">';
  h += '<span class="nb-accordion-name">' + esc(world ? world.name : "Monde inconnu") + '</span>';
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

function buildBestiaryHTML() {
  var h = '<div class="subtab-page">';
  h += '<div class="subtab-page-content">';
  // v3.194.0 (Seb) : le bandeau suit le sous-onglet actif.
  var kfTitle = activeBestiaryCodexSubTab === "codex" ? "\ud83d\udcd6 Codex" : "\ud83d\udc32 Bestiaire";
  h += '<div class="nb-page-frame nb-page-frame-fill kframe-page" data-kf-title="' + kfTitle + '">';

  if (activeBestiaryCodexSubTab === "codex") {
    h += (typeof buildCodexHTML === "function") ? buildCodexHTML() : "";
  } else {
    h += (typeof buildCodexExcerptHTML === "function") ? buildCodexExcerptHTML("bestiary") : "";
    h += buildBestiaryListHTML();
  }

  h += '</div>';
  h += '</div>';

  h += '<div class="subtab-bar-wrapper">';
  h += buildBestiaryCodexSubTabBarHTML();
  h += '</div>';

  h += '</div>';
  return h;
}

window.buildBestiaryHTML = buildBestiaryHTML;
