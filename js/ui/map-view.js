"use strict";

/* ============================================================
   Helper map. 
============================================================ */


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

/* ============================================================
   Utilisé par onclick.  
============================================================ */

function selectMapWorld(index) {
  if (index < 0 || index >= WORLDS.length) return;
  game.mapSelectedWorldIndex = index;
  renderPanel();
}

/* ============================================================
   Helper interne. 
============================================================ */

function isWorldUnlocked(index) {
  return index <= (WorldManager.worldIndex || 0);
}

/* ============================================================
   Helper interne. 
============================================================ */

function getWorldProgressText(index) {
  if (index < (WorldManager.worldIndex || 0)) return "Terminé";
  if (index === (WorldManager.worldIndex || 0)) return "En cours";
  return "Verrouillé";
}

/* ============================================================
   Utilisé surtout en interne. 
============================================================ */

function getMapMonsterNodes(worldIndex) {
  var positionsByWorld = {
    0: [
      { left: 22, top: 30 }, // Slim
      { left: 34, top: 24 }, // Wolf
      { left: 15, top: 27 }, // Gobelin
      { left: 32, top: 28 }, // Spider
      { left: 35, top: 19, boss: true } // Lord Slim
    ],
    1: [
      { left: 65, top: 30 }, // Scarab
      { left: 69, top: 26 }, // Scorpion
      { left: 67, top: 20 }, // Ver
      { left: 60, top: 20 }, // Guard
      { left: 73, top: 18, boss: true }
    ],
    2: [
      { left: 16, top: 44 },
      { left: 29, top: 42 },
      { left: 18, top: 55 },
      { left: 31, top: 56 },
      { left: 24, top: 48, boss: true }
    ],
    3: [
      { left: 63, top: 41 },
      { left: 78, top: 40 },
      { left: 65, top: 53 },
      { left: 79, top: 54 },
      { left: 72, top: 47, boss: true }
    ],
    4: [
      { left: 17, top: 73 },
      { left: 31, top: 70 },
      { left: 20, top: 84 },
      { left: 34, top: 85 },
      { left: 28, top: 78, boss: true }
    ],
    5: [
      { left: 66, top: 76 },
      { left: 80, top: 75 },
      { left: 68, top: 88 },
      { left: 81, top: 88 },
      { left: 74, top: 82, boss: true }
    ]
  };

  var world = WORLDS[worldIndex];
  if (!world) return [];

  var positions = positionsByWorld[worldIndex] || [];
  var ids = [];
  var bossId = null;

  world.adventures.forEach(function (adv) {
    (adv.enemyPool || []).forEach(function (enemyId) {
      if (ids.indexOf(enemyId) === -1) ids.push(enemyId);
    });
    if (!bossId && adv.boss) bossId = adv.boss;
  });

  var nodes = [];
  for (var i = 0; i < ids.length && i < positions.length - 1; i++) {
    var enemyId = ids[i];
    var enemyData = ENEMY_DB[enemyId];
    if (!enemyData) continue;
    nodes.push({
      type: "enemy",
      id: enemyId,
      name: enemyData.name,
      image: enemyData.image || "",
      icon: renderIcon("enemies", enemyData.asset),
      left: positions[i].left,
      top: positions[i].top,
      isBoss: false
    });
  }

  if (bossId && positions.length) {
    var bossData = BOSS_DB[bossId];
    var bossPos = positions[positions.length - 1];
    if (bossData && bossPos) {
    nodes.push({
      type: "boss",
      id: bossId,
      name: bossData.name,
      image: bossData.image || "",
      icon: renderIcon("bosses", bossData.asset),
      left: bossPos.left,
      top: bossPos.top,
      isBoss: true
    });
    }
  }

  return nodes;
}

/* ============================================================
   Builder map. 
============================================================ */

function buildMapHTML() {
  var selectedIndex = getMapSelectedWorldIndex();
  var selectedWorld = WORLDS[selectedIndex] || WORLDS[0];
  var currentWorldIndex = WorldManager.worldIndex || 0;
  var currentAdventureIndex = WorldManager.adventureIndex || 0;
  var total = Array.isArray(game.quests) ? game.quests.length : 0;
  var done = Array.isArray(game.quests)
    ? game.quests.filter(function (q) { return q.claimed; }).length
    : 0;
  var bosses = (game.questProgress && game.questProgress.bossKills) || 0;

  var mapNodes = [
    { index: 0, left: 24, top: 18, label: "Forêt", labelOffsetX: -10, labelOffsetY: -38 },
    { index: 1, left: 73, top: 18, label: "Désert", labelOffsetX: 10, labelOffsetY: -38 },
    { index: 2, left: 25, top: 48, label: "Ruines", labelOffsetX: -12, labelOffsetY: 34 },
    { index: 3, left: 71, top: 47, label: "Crypte", labelOffsetX: 14, labelOffsetY: 34 },
    { index: 4, left: 29, top: 79, label: "Montagne", labelOffsetX: -6, labelOffsetY: -42 },
    { index: 5, left: 73, top: 82, label: "Tour", labelOffsetX: 0, labelOffsetY: -40 }
  ];

  var h = '<div class="panel-title">🗺️ Carte du monde</div>';
  h += '<div class="map-intro">Explore les régions du monde et consulte la progression de chaque aventure.</div>';

  h += '<div class="map-grid">';
  h += '<div class="map-row"><span class="map-label">Monde actuel</span><span class="map-value">' + (currentWorldIndex + 1) + '</span></div>';
  h += '<div class="map-row"><span class="map-label">Quêtes terminées</span><span class="map-value">' + done + '/' + total + '</span></div>';
  h += '<div class="map-row"><span class="map-label">Boss vaincus</span><span class="map-value">' + bosses + '</span></div>';
  h += '</div>';

  h += '<div class="world-map-shell">';

  h += '<div class="world-map-card">';
  h += '<div class="world-map-visual">';
  h += '<img src="images/Worlds/World.png" alt="Carte du monde fantasy" class="world-map-image">';

  mapNodes.forEach(function (node) {
    var world = WORLDS[node.index];
    if (!world) return;

    var classes = ["map-node"];
    if (node.index === currentWorldIndex) classes.push("is-current");
    if (node.index === selectedIndex) classes.push("is-selected");
    if (!isWorldUnlocked(node.index)) classes.push("is-locked");

    h += '<button class="' + classes.join(" ") + '"';
    h += ' style="left:' + node.left + '%; top:' + node.top + '%;"';
    h += ' onclick="selectMapWorld(' + node.index + ')">';
    h += '<span class="map-node-ping"></span>';
    h += '<span class="map-node-dot"></span>';
    h += '</button>';

    h += '<div class="map-node-label-floating';
    if (node.index === currentWorldIndex) h += ' is-current';
    if (node.index === selectedIndex) h += ' is-selected';
    if (!isWorldUnlocked(node.index)) h += ' is-locked';
    h += '" style="left:calc(' + node.left + '% + ' + (node.labelOffsetX || 0) + 'px); top:calc(' + node.top + '% + ' + (node.labelOffsetY || 0) + 'px);">';
    h += esc(node.label);
    h += '</div>';
  });

  mapNodes.forEach(function (node) {
    if (node.index !== selectedIndex && node.index !== currentWorldIndex) return;

    var monsterNodes = getMapMonsterNodes(node.index);
    monsterNodes.forEach(function (monster) {
      var monsterClasses = ["map-monster-node"];
      if (monster.isBoss) monsterClasses.push("is-boss");
      if (node.index === currentWorldIndex) monsterClasses.push("is-current-world");
      if (node.index !== selectedIndex) monsterClasses.push("is-faded");

      h += '<div class="' + monsterClasses.join(" ") + '"';
      h += ' style="left:' + monster.left + '%; top:' + monster.top + '%;"';
      h += ' title="' + esc(monster.name) + '">';
      if (monster.image) {
        h += '<img class="map-monster-image" src="' + esc(monster.image) + '" alt="' + esc(monster.name) + '">';
      } else {
        h += '<span class="map-monster-icon">' + monster.icon + '</span>';
      }
      h += '</div>';
    });
  });

  h += '</div>';
  h += '</div>';

  h += '<div class="map-world-card">';
  h += '<div class="map-world-head">';
  h += '<div>';
  h += '<div class="map-world-kicker">Monde sélectionné</div>';
  h += '<div class="map-world-title">' + esc(selectedWorld.name) + '</div>';
  h += '<div class="map-world-status ' + (selectedIndex < currentWorldIndex ? 'status-done' : selectedIndex === currentWorldIndex ? 'status-current' : 'status-locked') + '">' + getWorldProgressText(selectedIndex) + '</div>';
  h += '</div>';
  h += '<div class="map-world-icon">' + esc(renderIcon("worlds", selectedWorld.assetKey)) + '</div>';
  h += '</div>';

  if (selectedIndex === currentWorldIndex) {
    var currentAdventure = selectedWorld.adventures[currentAdventureIndex];
    if (currentAdventure) {
      h += '<div class="map-current-adventure">';
      h += '<strong>Aventure actuelle :</strong> ' + esc(currentAdventure.name);
      h += ' <span>(' + ((WorldManager.enemyIndex || 0) + 1) + '/' + (currentAdventure.enemyCount || 1) + ')</span>';
      h += '</div>';
    }
  }

  h += '<div class="map-adventure-list">';
  selectedWorld.adventures.forEach(function (adv, advIndex) {
    var advClasses = ["map-adventure-item"];

    if (selectedIndex < currentWorldIndex) {
      advClasses.push("is-done");
    } else if (selectedIndex > currentWorldIndex) {
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
    h += '<div class="map-adventure-meta">' + esc((adv.enemyCount || 0) + ' combats avant le boss') + '</div>';
    h += '</div>';
  });
  h += '</div>';

  h += '</div>';
  h += '</div>';

  return h;
}


window.getMapSelectedWorldIndex = getMapSelectedWorldIndex;
window.selectMapWorld = selectMapWorld;
window.getMapMonsterNodes = getMapMonsterNodes;
window.buildMapHTML = buildMapHTML;