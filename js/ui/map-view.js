"use strict";
/* ui/map-view.js — Carte du monde v2.90.14 : chemin illustré (nœuds ronds + tracé SVG), popup détail par monde (#map-modal-root). Détail complet : COMMENTAIRES_ORIGINAUX.md */

function getMapSelectedWorldIndex() {
  if (typeof game.mapSelectedWorldIndex !== "number") {
    game.mapSelectedWorldIndex = WorldManager.worldIndex || 0;
  }
  if (game.mapSelectedWorldIndex < 0) game.mapSelectedWorldIndex = 0;
  if (game.mapSelectedWorldIndex >= WORLDS.length) {
    game.mapSelectedWorldIndex = WORLDS.length - 1;
  }
  return game.mapSelectedWorldIndex;
}

function isWorldUnlocked(index) {
  return index <= (WorldManager.worldIndex || 0);
}

function getWorldProgressText(index) {
  if (index < (WorldManager.worldIndex || 0)) return "Terminé";
  if (index === (WorldManager.worldIndex || 0)) return "En cours";
  if (!WorldManager.meetsAscensionRequirement(index)) {
    var quest = window.WorldQuestManager ? WorldQuestManager.getQuestForWorldIndex(index) : null;
    if (quest && WorldQuestManager.isReadyToClaim(quest)) return "🗺️ Questline prête !";
    if (quest) return "🗺️ " + quest.name;
    return "Verrouillé";
  }
  return "Verrouillé";
}

function getWorldThumb(world) {
  return "images/Worlds/thumb_" + (world.assetKey || "forest") + ".png";
}

function getWorldMonsterList(world) {
  var ids = [];
  var bossId = null;

  (world.adventures || []).forEach(function (adv) {
    (adv.enemyPool || []).forEach(function (enemyId) {
      if (ids.indexOf(enemyId) === -1) ids.push(enemyId);
    });
    if (!bossId && adv.boss) bossId = adv.boss;
  });

  var monsters = ids.map(function (id) {
    var data = ENEMY_DB[id];
    return data ? { id: id, name: data.name, icon: renderIcon("enemies", data.asset), image: data.image || "", isBoss: false } : null;
  }).filter(Boolean);

  if (bossId && BOSS_DB[bossId]) {
    var bossData = BOSS_DB[bossId];
    monsters.push({ id: bossId, name: bossData.name, icon: renderIcon("bosses", bossData.asset), image: bossData.image || "", isBoss: true });
  }

  return monsters;
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
  var isDone = index < currentWorldIndex;

  var classes = ["map-node"];
  if (isCurrent) classes.push("is-current");
  if (!unlocked) classes.push("is-locked");
  if (isDone) classes.push("is-done");

  var h = '<button type="button" class="' + classes.join(" ") + '" style="left:' + pos.x + '%;top:' + pos.y + '%;" onclick="openWorldPopup(' + index + ')">';
  h += '<span class="map-node-circle"><img src="' + esc(getWorldThumb(world)) + '" alt="' + esc(world.name) + '" draggable="false">';
  if (isCurrent) h += '<span class="map-node-badge">Actuel</span>';
  if (!unlocked) h += '<span class="map-node-lock">🔒</span>';
  h += '</span>';
  h += '<span class="map-node-name">' + esc(world.name) + '</span>';
  h += '</button>';
  return h;
}

function buildMapHTML() {
  var h = '<div class="map-path-frame">';
  h += '<img class="map-path-bg" src="images/Map/world_map.jpg" alt="Carte du monde" draggable="false">';
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
  var statusClass = index < currentWorldIndex ? "done" : isCurrent ? "current" : "locked";

  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu map-popup-card">';
  h += '    <img class="map-popup-thumb" src="' + esc(getWorldThumb(world)) + '" alt="' + esc(world.name) + '">';
  h += '    <div class="map-popup-title">' + esc(world.name) + '</div>';
  h += '    <div class="map-popup-status status-' + statusClass + '">' + esc(getWorldProgressText(index)) + '</div>';

  h += buildWorldLoreExcerptHTML(index);

  if (isCurrent) {
    var currentAdventure = world.adventures[currentAdventureIndex];
    if (currentAdventure) {
      h += '<div class="map-current-adventure">';
      h += '<strong>Aventure actuelle :</strong> ' + esc(currentAdventure.name);
      h += ' <span>(' + ((WorldManager.enemyIndex || 0) + 1) + '/' + (currentAdventure.enemyCount || 1) + ')</span>';
      h += '</div>';
    }
  } else if (!isWorldUnlocked(index) && !WorldManager.meetsAscensionRequirement(index)) {
    h += '<div class="map-current-adventure">🗺️ Questline de déblocage en cours — voir l\'onglet Quêtes.</div>';
  }

  var monsters = getWorldMonsterList(world);
  if (monsters.length) {
    h += '<div class="map-monster-row">';
    monsters.forEach(function (m) {
      h += '<div class="map-monster-chip' + (m.isBoss ? " is-boss" : "") + (m.image ? " has-icon-img" : "") + '" title="' + esc(m.name) + '">';
      if (m.image) {
        h += '<img src="' + esc(m.image) + '" alt="' + esc(m.name) + '" onerror="this.parentElement.classList.remove(\'has-icon-img\'); this.remove();">';
        h += '<span class="icon-img-fallback">' + m.icon + '</span>';
      } else {
        h += m.icon;
      }
      h += '</div>';
    });
    h += '</div>';
  }

  h += '<div class="map-adventure-list">';
  world.adventures.forEach(function (adv, advIndex) {
    var advClasses = ["map-adventure-item"];

    if (index < currentWorldIndex) {
      advClasses.push("is-done");
    } else if (index > currentWorldIndex) {
      advClasses.push("is-locked");
    } else {
      if (advIndex < currentAdventureIndex) advClasses.push("is-done");
      else if (advIndex === currentAdventureIndex) advClasses.push("is-current");
      else advClasses.push("is-next");
    }

    h += '<div class="' + advClasses.join(" ") + '">';
    h += '<div class="map-adventure-top">';
    h += '<span class="map-adventure-name">' + esc(adv.name) + '</span>';
    if (BOSS_DB[adv.boss]) {
      h += '<span class="map-adventure-boss">' + esc(BOSS_DB[adv.boss].name) + '</span>';
    }
    h += '</div>';
    h += '<div class="map-adventure-text">' + esc(adv.introText || "") + '</div>';
    h += '<div class="map-adventure-meta">' + esc((adv.enemyCount || 0) + " combats avant le boss") + '</div>';
    h += '</div>';
  });
  h += '</div>';

  h += '    <button class="settings-btn" type="button" onclick="closeWorldPopup()">Fermer</button>';
  h += '  </div>';
  h += '</div>';
  return h;
}

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

function selectMapWorld(index) {
  openWorldPopup(index);
}

window.getMapSelectedWorldIndex = getMapSelectedWorldIndex;
window.selectMapWorld = selectMapWorld;
window.getWorldMonsterList = getWorldMonsterList;
window.buildMapHTML = buildMapHTML;
window.openWorldPopup = openWorldPopup;
window.closeWorldPopup = closeWorldPopup;
