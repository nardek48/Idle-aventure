"use strict";
/* ============================================================
Quest Idle — ui/bestiary-view.js
Écran "Bestiaire" — liste complète (une carte par créature), même
principe que Quêtes/Hauts faits/Codex, voir css/00-components.css
pour le composant partagé ".nb-entry-card".

v2.82 : abandon du principe grille d'icônes + un seul détail affiché
en haut (v2.5) au profit d'une liste complète — chaque créature
affiche directement ses PV/dégâts/critique estimés et ses
résistances/faiblesses, plus besoin de taper dessus.

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

/* Une carte de créature : icône, nom, kills, résistances/faiblesses,
   et le nombre de kills en statut à droite (grand nombre, plus
   parlant qu'un badge "En cours"/"Terminé" puisque les kills
   s'accumulent sans plafond réel). */
function getAllBestiaryIds() {
  return Object.keys(ENEMY_DB).concat(Object.keys(BOSS_DB));
}

function buildBestiaryEntryCardHTML(id) {
  var isBoss = !!BOSS_DB[id];
  var data = isBoss ? BOSS_DB[id] : ENEMY_DB[id];
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
      h += '<span class="nb-entry-meta">❤️ ' + formatNumber(combat.hp) + '</span>';
      h += '<span class="nb-entry-meta">⚔️ ' + formatNumber(combat.dmg) + '</span>';
      h += '<span class="nb-entry-meta">🎯 ' + Math.round(combat.critChance) + '%</span>';
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

function buildBestiaryListHTML() {
  var ids = getAllBestiaryIds();
  var h = '';
  ids.forEach(function (id) {
    h += buildBestiaryEntryCardHTML(id);
  });
  return h;
}

function buildBestiaryHTML() {
  var h = (typeof buildCodexExcerptHTML === "function") ? buildCodexExcerptHTML("bestiary") : "";
  h += buildBestiaryListHTML();
  return h;
}

window.buildBestiaryHTML = buildBestiaryHTML;
