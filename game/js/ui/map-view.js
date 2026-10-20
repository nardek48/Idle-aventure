"use strict";
/* ui/map-view.js — Carte du monde v2.90.14 : chemin illustré (nœuds ronds + tracé SVG), popup détail par monde (#map-modal-root). Détail complet : COMMENTAIRES_ORIGINAUX.md */

/* v3.301.0 (W-2b) : un monde est ouvert dès qu'il a été atteint — le voyage permet d'en
   revenir, donc « plus loin que le monde courant » ne veut plus dire « fermé ». */
function isWorldUnlocked(index) {
  return index <= (WorldManager.worldIndex || 0) || !!(game.worldsEverReached && game.worldsEverReached[index]);
}

function getWorldProgressText(index) {
  if (index === (WorldManager.worldIndex || 0)) return _t("Tu es ici");
  if (isWorldUnlocked(index)) return _t("Atteint");
  // v3.299.0 (W-1c) : plus de questline de monde — un monde s'ouvre par sa traversée.
  return _t("Verrouillé");
}

function getWorldThumb(world) {
  return "images/Worlds/thumb_" + (world.assetKey || "forest") + ".png";
}

/* v3.456.7 (liste de Seb) : toutes les créatures du monde, comme le Bestiaire (ennemis, élites, boss d'Histoire
   et de donjon). Une créature pas encore rencontrée reste un « ? » : on la découvre en la croisant. */
function getWorldMonsterList(world) {
  var idx = (window.WORLDS || []).indexOf(world);
  var ids = (idx >= 0 && typeof getBestiaryGroupedByWorld === "function") ? (getBestiaryGroupedByWorld()[idx] || []) : [];
  var seen = (game.explorationProgression && game.explorationProgression.bestiarySeen) || {};
  return ids.map(function (id) {
    var data = typeof bestiaryData === "function" ? bestiaryData(id) : null; // v3.456.8 : boss de donjon compris
    if (!data) return null;
    var met = bestiaryMet(id);
    return { id: id, name: data.name, icon: renderIcon(data.isBoss && !data.isElite ? "bosses" : "enemies", data.asset), image: data.image || "",
      isBoss: data.isBoss && !data.isElite, isElite: data.isElite, met: met, isNew: met && !seen[id] };
  }).filter(Boolean);
}

var MAP_WORLD_CODEX_IDS = ["world_forest", "world_desert", "world_ruins", "world_crypt", "world_mountain", "world_tower"];

function buildWorldLoreExcerptHTML(worldIndex) {
  var codexId = MAP_WORLD_CODEX_IDS[worldIndex];
  if (!codexId || typeof buildCodexExcerptHTML !== "function") return "";
  return buildCodexExcerptHTML(codexId, "map-world-lore");
}

var MAP_NODE_POSITIONS = [
  { x: 48.8, y: 10.2 },
  { x: 45.6, y: 34.5 },
  { x: 70.3, y: 43.6 },
  { x: 18.2, y: 60.0 },
  { x: 65.1, y: 64.7 },
  { x: 76.8, y: 79.9 }
];
var MAP_PATH_VIEWBOX_H = 179.17; // ratio réel de world_map.jpg (2752/1536×100)

function buildMapPathSvgHTML(count) {
  var pts = MAP_NODE_POSITIONS.slice(0, count).map(function (p) {
    return { x: p.x, y: p.y * (MAP_PATH_VIEWBOX_H / 100) };
  });
  if (pts.length < 2) return "";

  var d = "M " + pts[0].x + " " + pts[0].y;
  for (var i = 1; i < pts.length; i++) {
    var prev = pts[i - 1], cur = pts[i];
    var midX = (prev.x + cur.x) / 2;
    d += " C " + midX + " " + prev.y + ", " + midX + " " + cur.y + ", " + cur.x + " " + cur.y;
  }

  return '<svg class="map-path-svg" viewBox="0 0 100 ' + MAP_PATH_VIEWBOX_H + '" preserveAspectRatio="none">' +
         '<path d="' + d + '" fill="none" stroke="#fff2d0" stroke-width="1.1" stroke-linecap="round" stroke-dasharray="0.2 2.6" opacity="0.9"/>' +
         '</svg>';
}

function buildMapNodeHTML(world, index) {
  var pos = MAP_NODE_POSITIONS[index] || { x: 50, y: 50 };
  var currentWorldIndex = WorldManager.worldIndex || 0;
  var unlocked = isWorldUnlocked(index);
  var isCurrent = index === currentWorldIndex;
  var isDone = unlocked && !isCurrent; // v3.301.0 : atteint et quitté (le voyage permet d'y revenir)

  var classes = ["map-node"];
  if (isCurrent) classes.push("is-current");
  if (!unlocked) classes.push("is-locked");
  if (isDone) classes.push("is-done");

  var h = '<button type="button" class="' + classes.join(" ") + '" style="left:' + pos.x + '%;top:' + pos.y + '%;" onclick="tapMapWorld(' + index + ')">';
  h += '<span class="map-node-circle"><img src="' + esc(getWorldThumb(world)) + '" alt="' + esc(_td(world.name)) + '" draggable="false">';
  if (isCurrent) h += '<span class="map-node-badge">' + _t("Actuel") + '</span>';
  if (!unlocked) h += '<span class="map-node-lock"><img class=ico-inline src=images/Icons/system/lock_closed.png></span>';
  h += '</span>';
  h += '<span class="map-node-name">' + esc(_td(world.name)) + '</span>';
  h += '</button>';
  return h;
}

function buildMapHTML() {
  // v3.324.0 (bug Seb) : une carte ouverte par un autre héros ne s'affiche plus
  if (typeof livingMapDropStale === "function") livingMapDropStale();
  // v3.256.0 (Cartes Vivantes, C-2) : une carte vivante ouverte remplace la carte du monde.
  if (typeof isLivingMapOpen === "function" && isLivingMapOpen() && typeof buildLivingMapHTML === "function") {
    var lm = buildLivingMapHTML(livingMapOpenId);
    if (lm) return lm;
  }
  var h = '<div class="map-path-frame">';
  h += '<img class="map-path-bg" src="images/Map/world_map.jpg" alt="' + _t("Carte du monde") + '" draggable="false">';
  h += buildMapPathSvgHTML(WORLDS.length);
  WORLDS.forEach(function (world, index) {
    h += buildMapNodeHTML(world, index);
  });
  h += '</div>';
  return h;
}

function buildWorldPopupHTML(index) {
  var world = WORLDS[index];
  if (!world) return "";

  var currentWorldIndex = WorldManager.worldIndex || 0;
  var currentAdventureIndex = WorldManager.adventureIndex || 0;
  var isCurrent = index === currentWorldIndex;
  var reached = isWorldUnlocked(index);
  var statusClass = isCurrent ? "current" : reached ? "done" : "locked";

  var h = '<div class="full-menu-overlay" onclick="if (event.target === this) closeWorldPopup();">';
  h += '  <div class="full-menu map-popup-card">';
  h += kSheetHeadHTML({ title: esc(_td(world.name)), close: "closeWorldPopup()" });
  h += '  <div class="ksheet-body">';
  h += '    <img class="map-popup-thumb" src="' + esc(getWorldThumb(world)) + '" alt="' + esc(_td(world.name)) + '">';
  h += '    <div class="map-popup-status status-' + statusClass + '">' + esc(getWorldProgressText(index)) + '</div>';

  h += buildWorldLoreExcerptHTML(index);

  if (isCurrent) {
    var currentAdventure = world.adventures[currentAdventureIndex];
    if (currentAdventure) {
      h += '<div class="map-current-adventure">';
      h += '<strong>' + _t("Aventure actuelle :") + '</strong> ' + esc(_td(currentAdventure.name)); // v3.299.0 : plus de compteur d'ennemis (farm libre retiré)
      h += '</div>';
    }
  }

  var monsters = getWorldMonsterList(world);
  if (monsters.length) {
    var vus = monsters.filter(function (m) { return m.met; }).length;
    h += '<div class="map-monster-count">' + _t("Créatures rencontrées : {a} / {b}", { a: vus, b: monsters.length }) + '</div>'; // v3.456.7
    h += '<div class="map-monster-row">';
    monsters.forEach(function (m) {
      var tap = ' onclick="openCreatureSheet(\'' + esc(m.id) + '\')"'; // v3.456.8 : la fiche en grand, ou où la chercher
      if (!m.met) { // v3.456.7 : pas encore rencontrée
        h += '<button type="button" class="map-monster-chip is-unknown' + (m.isBoss ? " is-boss" : "") + (m.isElite ? " is-elite" : "") + '" title="' + esc(_t("Pas encore rencontré")) + '"' + tap + '>?</button>';
        return;
      }
      h += '<button type="button" class="map-monster-chip' + (m.isBoss ? " is-boss" : "") + (m.isElite ? " is-elite" : "") + (m.isNew ? " is-new" : "") + (m.image ? " has-icon-img" : "") + '" title="' + esc(_td(m.name)) + '"' + tap + '>';
      if (m.image) {
        h += '<img src="' + esc(m.image) + '" alt="' + esc(_td(m.name)) + '" onerror="this.parentElement.classList.remove(\'has-icon-img\'); this.remove();">';
        h += '<span class="icon-img-fallback">' + renderIconOrEmojiHTML(m.icon, "map-fallback-ico", "") + '</span>';
      } else {
        h += m.icon;
      }
      h += '</button>';
    });
    h += '</div>';
    // v3.456.8 : vues une fois ouvertes, elles ne sont plus « nouvelles » (jour noté dans explorationProgression, déjà sauvegardé)
    var ep = game.explorationProgression || (game.explorationProgression = {}), seenMap = ep.bestiarySeen || (ep.bestiarySeen = {});
    monsters.forEach(function (m) { if (m.met) seenMap[m.id] = 1; });
  }

  h += '<div class="map-adventure-list">';
  world.adventures.forEach(function (adv, advIndex) {
    var advClasses = ["map-adventure-item"];

    if (index !== currentWorldIndex && reached) {
      advClasses.push("is-done");
    } else if (index !== currentWorldIndex) {
      advClasses.push("is-locked");
    } else {
      if (advIndex < currentAdventureIndex) advClasses.push("is-done");
      else if (advIndex === currentAdventureIndex) advClasses.push("is-current");
      else advClasses.push("is-next");
    }

    h += '<div class="' + advClasses.join(" ") + '">';
    h += '<div class="map-adventure-top">';
    h += '<span class="map-adventure-name">' + esc(_td(adv.name)) + '</span>';
    if (BOSS_DB[adv.boss]) { // v3.456.8 : le boss se découvre comme les autres
      h += '<span class="map-adventure-boss">' + (bestiaryMet(adv.boss) ? esc(_td(BOSS_DB[adv.boss].name)) : "?") + '</span>';
    }
    h += '</div>';
    h += '<div class="map-adventure-text">' + esc(_td(adv.introText || "")) + '</div>';
    h += '</div>';
  });
  /* v3.456.8 : le donjon du monde et son vrai boss (la Liche à l'Ossuaire, Varrek au Sanctuaire) */
  (window.DUNGEONS || []).forEach(function (d) {
    if (d.worldId !== world.id || !d.boss || (d.locked && !d.requiresStoryStep)) return;
    var bid = (typeof bestiaryDungeonOf === "function" && bestiaryDungeonOf("donjon_" + d.id)) ? "donjon_" + d.id : d.boss.baseId;
    h += '<div class="map-adventure-item is-dungeon">';
    h += '<div class="map-adventure-top"><span class="map-adventure-name">' + esc(_td(d.name)) + '</span>';
    h += '<span class="map-adventure-boss">' + (bestiaryMet(bid) ? esc(_td(d.boss.name)) : "?") + '</span></div>';
    h += '<div class="map-adventure-text">' + _t("Donjon") + '</div>';
    h += '</div>';
  });
  h += '</div>';

  /* v3.301.0 (W-2b, D7) : voyage libre vers un monde déjà atteint. */
  h += '  </div>'; // ksheet-body
  if (reached && !isCurrent && window.WorldTravel) {
    var refusal = WorldTravel.refusalReason(world.id);
    if (refusal) h += '<div class="ksheet-body map-popup-refusal"><div class="map-current-adventure">' + esc(refusal) + '</div></div>';
    h += '    <div class="ksheet-foot">';
    h += '    <button class="settings-btn primary" type="button"' + (refusal ? ' disabled' : ' onclick="travelToWorldFromUI(\'' + esc(world.id) + '\')"') + '>' + _t("Y voyager") + '</button>';
    if (window.LivingMapManager && LivingMapManager.getMapForWorld(world.id)) {
      h += '    <button class="settings-btn" type="button" onclick="closeWorldPopup(); openLivingMap(\'' + esc(LivingMapManager.getMapForWorld(world.id).id) + '\')">' + _t("Voir la carte") + '</button>';
    }
    h += '    </div>';
  }
  h += '  </div>';
  h += '</div>';
  return h;
}

/* v3.256.0 (C-2, §9.1) : toucher un monde qui a une carte vivante l'ouvre ; un monde sans
   carte garde sa popup. Depuis la carte vivante elle-même, « Le monde » rouvre la popup. */
function tapMapWorld(index) {
  var world = WORLDS[index];
  // v3.301.0 (W-2b) : un monde atteint mais quitté ouvre sa fiche, avec le bouton de voyage
  if (world && index !== (WorldManager.worldIndex || 0) && isWorldUnlocked(index)) { openWorldPopup(index); return; }
  if (world && window.LivingMapManager && LivingMapManager.getMapForWorld(world.id)
      && typeof isLivingMapOpen === "function" && !isLivingMapOpen() && typeof openLivingMap === "function") {
    openLivingMap(LivingMapManager.getMapForWorld(world.id).id);
    return;
  }
  openWorldPopup(index);
}
window.tapMapWorld = tapMapWorld;

function openWorldPopup(index) {
  if (index < 0 || index >= WORLDS.length) return;
  game.mapSelectedWorldIndex = index;
  var host = document.getElementById("map-modal-root");
  if (host) host.innerHTML = buildWorldPopupHTML(index);
}

function closeWorldPopup() {
  var host = document.getElementById("map-modal-root");
  if (host) host.innerHTML = "";
}

window.getWorldMonsterList = getWorldMonsterList;
window.buildMapHTML = buildMapHTML;
window.openWorldPopup = openWorldPopup;
window.closeWorldPopup = closeWorldPopup;
