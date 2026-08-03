"use strict";
/* ============================================================
Quest Idle — ui/bestiary-view.js
Écran "Bestiaire" v2.5 — même principe que la carte du monde et les
talents : une grille d'icônes en bas, la créature sélectionnée
s'affiche en grand en haut avec ses vraies stats de combat calculées
(PV, dégâts de riposte, chance de critique), pas juste le profil brut
power/endurance/celerity/precision/will.

Les PV/dégâts affichés sont une ESTIMATION "à la première rencontre"
(monde où la créature apparaît, cycle 0) : les vraies valeurs en jeu
grandissent avec ta progression (voir WorldManager.generateEnemy en
progression-system.js). Les coefficients ci-dessous sont dupliqués
depuis combat-engine.js/progression-system.js (valeurs locales à ces
fichiers, pas exportées) — à garder synchronisés si jamais ils changent.
============================================================ */

var BESTIARY_ENEMY_ENDURANCE_HP_COEF = 1.2;
var BESTIARY_BOSS_ENDURANCE_HP_COEF = 2;
var BESTIARY_ENEMY_POWER_DMG_COEF = 0.5;
var BESTIARY_ENEMY_PRECISION_CRIT_COEF = 0.3;

/* Trouve le premier monde/aventure où cette créature apparaît (pool
   d'ennemis normaux, ou boss d'une aventure). Renvoie
   { worldIndex, adventureIndex } ou null si jamais utilisée nulle
   part (ne devrait pas arriver pour une entrée de ENEMY_DB/BOSS_DB
   réellement utilisée). */
function findCreatureLocation(id, isBoss) {
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

/* Estimation des PV/dégâts/critique "à la première rencontre" (mêmes
   formules que WorldManager.generateEnemy, avec cycle 0). */
function estimateCreatureCombatStats(id, data, isBoss) {
  var stats = data && data.stats;
  if (!stats) return null;

  var location = findCreatureLocation(id, isBoss);
  var worldIndex = location ? location.worldIndex : 0;
  var adventureIndex = location ? location.adventureIndex : 0;

  var hp;
  if (isBoss) {
    var bossScale = 1 + worldIndex * 0.90 + adventureIndex * 0.30;
    hp = Math.floor((stats.endurance || 0) * BESTIARY_BOSS_ENDURANCE_HP_COEF * bossScale);
  } else {
    var scale = 1 + worldIndex * 0.60 + adventureIndex * 0.22;
    hp = Math.floor((stats.endurance || 0) * BESTIARY_ENEMY_ENDURANCE_HP_COEF * scale);
  }

  var dmg = Math.max(1, Math.floor((stats.power || 0) * BESTIARY_ENEMY_POWER_DMG_COEF));
  var critChance = Math.min(40, (stats.precision || 0) * BESTIARY_ENEMY_PRECISION_CRIT_COEF);

  return { hp: Math.max(1, hp), dmg: dmg, critChance: critChance };
}

/* Barres de stats (Puissance/Endurance/Célérité/Précision/Volonté)
   d'une créature — profil relatif, en complément des stats de combat
   ci-dessus. */
function buildBestiaryStatsHTML(stats) {
  if (!stats) return "";

  var keys = ["power", "endurance", "celerity", "precision", "will"];
  var html = '<div class="bestiary-stats">';

  keys.forEach(function (key) {
    var value = clampStatValue(stats[key]);
    html += ''
      + '<div class="bestiary-stat-row">'
      +   '<div class="bestiary-stat-head">'
      +     '<span class="bestiary-stat-label">' + esc(getStatLabel(key)) + '</span>'
      +     '<span class="bestiary-stat-value">' + value + '</span>'
      +   '</div>'
      +   '<div class="bestiary-stat-bar">'
      +     '<div class="bestiary-stat-fill" style="width:' + value + '%"></div>'
      +   '</div>'
      + '</div>';
  });

  html += '</div>';
  return html;
}

/* Image de la créature si dispo, sinon repli sur l'emoji ASSETS. */
function buildBestiaryImageHTML(data, isBoss, size) {
  var imagePath = data && data.image ? data.image : "";
  var iconKey = data && data.asset ? data.asset : "";
  var cls = size === "lg" ? "bestiary-thumb-wrap-lg" : "bestiary-thumb-wrap-sm";

  if (imagePath) {
    return ''
      + '<div class="' + cls + (isBoss ? ' boss' : '') + '">'
      +   '<img class="bestiary-thumb" src="' + esc(imagePath) + '" alt="' + esc(data.name || "Créature") + '">'
      + '</div>';
  }

  return ''
    + '<div class="' + cls + '-fallback' + (isBoss ? ' boss' : '') + '">'
    +   renderIcon(isBoss ? "bosses" : "enemies", iconKey)
    + '</div>';
}

/* Liste "Résiste :" / "Faible :" d'une créature, à partir des types
   de dégâts sword/bow/magic. */
function buildResistWeakHTML(data) {
  var resists = data && Array.isArray(data.resists) ? data.resists : [];
  var weak = data && Array.isArray(data.weak) ? data.weak : [];
  var html = '<div class="bestiary-tags">';

  if (resists.length) {
    html += '<div class="bestiary-tag-group"><span class="bestiary-tag-title">Résiste :</span> ' + esc(resists.join(", ")) + '</div>';
  }

  if (weak.length) {
    html += '<div class="bestiary-tag-group"><span class="bestiary-tag-title">Faible :</span> ' + esc(weak.join(", ")) + '</div>';
  }

  html += '</div>';
  return html;
}

/* Liste ordonnée de tous les ids de créatures (ennemis puis boss),
   utilisée à la fois par la grille et par la sélection courante. */
function getAllBestiaryIds() {
  return Object.keys(ENEMY_DB).concat(Object.keys(BOSS_DB));
}

function getBestiarySelectedId() {
  var ids = getAllBestiaryIds();
  if (!game.bestiarySelectedId || ids.indexOf(game.bestiarySelectedId) === -1) {
    game.bestiarySelectedId = ids[0];
  }
  return game.bestiarySelectedId;
}

/* Sélectionne une créature pour l'affichage détaillé en haut d'écran. */
function selectBestiaryCreature(id) {
  var ids = getAllBestiaryIds();
  if (ids.indexOf(id) === -1) return;
  game.bestiarySelectedId = id;
  if (typeof renderPanel === "function") renderPanel();
}

/* Grande carte de détail en haut d'écran pour la créature sélectionnée :
   image, nom, kills, PV/dégâts/critique estimés, résistances/faiblesses,
   puis le profil de stats en barres. */
function buildBestiaryDetailHTML(id) {
  var isBoss = !!BOSS_DB[id];
  var data = isBoss ? BOSS_DB[id] : ENEMY_DB[id];
  if (!data) return "";

  var kills = game.killCounts[id] || 0;
  var combat = estimateCreatureCombatStats(id, data, isBoss);

  var h = '<div class="bestiary-detail' + (isBoss ? ' boss' : '') + '">';
  h += '<div class="bestiary-detail-top">';
  h += buildBestiaryImageHTML(data, isBoss, "lg");
  h += '<div class="bestiary-detail-main">';
  h += '<div class="bestiary-card-title-row">';
  h += '<div class="bestiary-card-name">' + esc(data.name) + (isBoss ? ' <span class="bestiary-boss-badge">BOSS</span>' : '') + '</div>';
  h += '</div>';
  h += '<div class="bestiary-card-kills">Tués : ' + formatNumber(kills) + '</div>';
  h += buildResistWeakHTML(data);
  h += '</div>';
  h += '</div>';

  if (combat) {
    h += '<div class="bestiary-combat-row">';
    h += '<div class="bestiary-combat-stat"><span class="bestiary-combat-icon">❤️</span><span class="bestiary-combat-value">' + formatNumber(combat.hp) + '</span><span class="bestiary-combat-label">PV</span></div>';
    h += '<div class="bestiary-combat-stat"><span class="bestiary-combat-icon">⚔️</span><span class="bestiary-combat-value">' + formatNumber(combat.dmg) + '</span><span class="bestiary-combat-label">Dégâts</span></div>';
    h += '<div class="bestiary-combat-stat"><span class="bestiary-combat-icon">🎯</span><span class="bestiary-combat-value">' + Math.round(combat.critChance) + '%</span><span class="bestiary-combat-label">Critique</span></div>';
    h += '</div>';
    h += '<div class="bestiary-combat-note">Estimation à la première rencontre — augmente avec ta progression.</div>';
  }

  h += buildBestiaryStatsHTML(data.stats);
  h += '</div>';
  return h;
}

/* Grille d'icônes de toutes les créatures (rencontrées ou non). Le
   compteur de kills apparaît en petit badge, la créature sélectionnée
   est mise en évidence. */
function buildBestiaryGridHTML(selectedId) {
  var ids = getAllBestiaryIds();
  var h = '<div class="bestiary-grid">';

  ids.forEach(function (id) {
    var isBoss = !!BOSS_DB[id];
    var data = isBoss ? BOSS_DB[id] : ENEMY_DB[id];
    var kills = game.killCounts[id] || 0;
    var isSelected = id === selectedId;

    h += '<button class="bestiary-grid-item' + (isBoss ? ' boss' : '') + (isSelected ? ' is-selected' : '') + '" type="button" onclick="selectBestiaryCreature(\'' + esc(id) + '\')" title="' + esc(data.name) + '">';
    h += buildBestiaryImageHTML(data, isBoss, "sm");
    if (kills > 0) h += '<span class="bestiary-grid-kills">' + formatNumber(kills) + '</span>';
    h += '</button>';
  });

  h += '</div>';
  return h;
}

function buildBestiaryHTML() {
  var selectedId = getBestiarySelectedId();
  var h = '<div class="panel-title">Bestiaire</div>';
  h += (typeof buildCodexExcerptHTML === "function") ? buildCodexExcerptHTML("bestiary") : "";
  h += buildBestiaryDetailHTML(selectedId);
  h += buildBestiaryGridHTML(selectedId);
  return h;
}

window.buildBestiaryHTML = buildBestiaryHTML;
window.selectBestiaryCreature = selectBestiaryCreature;
