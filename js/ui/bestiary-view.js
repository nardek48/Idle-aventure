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

v2.83.40 : fusionné avec le Codex (2 sous-onglets, même principe que
Équipement/Inventaire/Boutique) — Bestiaire et Codex sont tous les
deux de la "documentation" passive sur l'univers du jeu, regroupés
pour désencombrer le menu ☰ (voir ui/menu-view.js). Le contenu du
Codex lui-même (ui/codex-view.js) n'a pas changé, juste son
emplacement dans la navigation.
============================================================ */

var activeBestiaryCodexSubTab = "bestiary"; // "bestiary" | "codex"

function setBestiaryCodexSubTab(tab) {
  activeBestiaryCodexSubTab = (tab === "codex") ? "codex" : "bestiary";
  if (typeof renderPanel === "function") renderPanel();
}
window.setBestiaryCodexSubTab = setBestiaryCodexSubTab;

function buildBestiaryCodexSubTabBarHTML() {
  var h = '<div class="pc-subtab-bar">';
  h += '<button type="button" class="pc-subtab-btn' + (activeBestiaryCodexSubTab === "bestiary" ? ' is-active' : '') + '" onclick="setBestiaryCodexSubTab(\'bestiary\')">🐾<span>Bestiaire</span></button>';
  h += '<button type="button" class="pc-subtab-btn' + (activeBestiaryCodexSubTab === "codex" ? ' is-active' : '') + '" onclick="setBestiaryCodexSubTab(\'codex\')">📖<span>Codex</span></button>';
  h += '</div>';
  return h;
}

/* v3.46.0 : les coefficients LOCAUX (BESTIARY_ENEMY_ENDURANCE_HP_COEF
   etc.) ont été retirés — ce fichier réutilise désormais directement
   les VRAIES constantes exportées par progression-system.js
   (ENEMY_PV_MULT/ENEMY_PV_WORLD_EXP/BOSS_PV_MULT/ENEMY_POWER_SCALE_EXP,
   voir window.* en fin de ce fichier), au lieu de dupliquer une
   estimation qui pouvait dériver de la vraie formule sans qu'on s'en
   rende compte (c'était déjà le cas avant cette version : les poids
   monde/aventure utilisés ici, 0.60/0.22, ne correspondaient déjà plus
   aux vrais poids de generateEnemy(), 0.90/0.30, depuis le
   rééquilibrage v2.11). BESTIARY_ENEMY_POWER_DMG_COEF/
   BESTIARY_ENEMY_PRECISION_CRIT_COEF restent dupliqués : ce sont des
   coefficients de COMBAT-ENGINE.JS (pas de progression-system.js),
   jamais retouchés dans le cadre de la présente livraison. */
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

/* Estimation des PV/dégâts/critique "à la première rencontre" — MÊMES
   formules que WorldManager.generateEnemy() (progression-system.js),
   avec cycleCount=0 et enemyIndex=0 (première rencontre, pas encore
   avancé dans l'aventure). v3.46.0 : suit désormais la nouvelle courbe
   (exposant PV_WORLD_EXP limité au terme monde, Puissance de riposte
   mise à l'échelle) — resynchronisé avec generateEnemy() après avoir
   dérivé de la vraie formule sur plusieurs rééquilibrages successifs
   (voir note au-dessus des constantes). */
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

  // v3.46.0 : dmg suit désormais aussi l'échelle (ENEMY_POWER_SCALE_EXP),
  // comme la vraie Puissance de riposte de generateEnemy() — avant,
  // seuls les PV grandissaient dans cette estimation.
  var scaledPower = (stats.power || 0) * Math.pow(scale, powerExp);
  var dmg = Math.max(1, Math.floor(scaledPower * BESTIARY_ENEMY_POWER_DMG_COEF));
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

var expandedBestiaryWorld = null; // v2.83.37 : accordéon replié par défaut

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

function toggleBestiaryWorld(worldIndex) {
  expandedBestiaryWorld = (expandedBestiaryWorld === worldIndex) ? null : worldIndex;
  if (typeof renderPanel === "function") renderPanel();
}
window.toggleBestiaryWorld = toggleBestiaryWorld;

/* Regroupe toutes les créatures (ennemis normaux + boss) par monde
   d'origine — déduit via findCreatureLocation (v2.83.37), sans rien
   ajouter aux données : { worldIndex: [id, id, ...] }, dans l'ordre
   des mondes (WORLDS[0..n]). */
function getBestiaryGroupedByWorld() {
  var ids = getAllBestiaryIds();
  var groups = {};

  ids.forEach(function (id) {
    var isBoss = !!BOSS_DB[id];
    var location = findCreatureLocation(id, isBoss);
    var worldIndex = location ? location.worldIndex : 0;
    if (!groups[worldIndex]) groups[worldIndex] = [];
    // Boss en dernier dans sa section, ennemis normaux avant.
    if (isBoss) groups[worldIndex].push(id); else groups[worldIndex].unshift(id);
  });

  return groups;
}

/* En-tête cliquable d'une section-monde (accordéon) — nom du monde +
   compteur "X/Y rencontrées". */
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
  h += '<div class="nb-page-frame nb-page-frame-fill">';

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
