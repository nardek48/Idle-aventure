"use strict";

/* ============================================================
   v1.9.4 — Refonte de l'écran carte.
   Fini le gros fond unique + points scattered en % fragiles.
   Chaque monde est une carte autonome (vignette biome + statut),
   organisée en grille 2 colonnes. Le détail (aventures/monstres)
   passe en liste compacte, plus de coordonnées à la main.
============================================================ */

/* Quel monde est actuellement affiché en détail sur la carte (pas
   forcément le monde où le joueur progresse réellement — on peut
   consulter un autre monde sans y être). Stocké directement sur
   `game` par simplicité, mais volontairement PAS sauvegardé (pas
   dans buildSaveData) : juste un état d'UI temporaire. */
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

/* Change le monde consulté en détail (clic sur une vignette). */
function selectMapWorld(index) {
  if (index < 0 || index >= WORLDS.length) return;
  game.mapSelectedWorldIndex = index;
  renderPanel();
}

/* Un monde n'est vraiment jouable que s'il est à portée séquentielle
   (index <= monde courant) ET que la condition d'ascension est
   remplie — un monde "sauté" par manque d'ascension reste verrouillé
   même si le joueur a dépassé son index (ne devrait pas arriver vu
   WorldManager.advance(), mais gardé en sécurité). */
function isWorldUnlocked(index) {
  return index <= (WorldManager.worldIndex || 0) && WorldManager.meetsAscensionRequirement(index);
}

/* Texte de statut affiché sur chaque vignette/en-tête de monde. */
function getWorldProgressText(index) {
  if (index < (WorldManager.worldIndex || 0)) return "Terminé";
  if (index === (WorldManager.worldIndex || 0)) return "En cours";
  if (!WorldManager.meetsAscensionRequirement(index)) {
    var req = (WORLDS[index] && WORLDS[index].requiredAscension) || 0;
    var current = game.ascensionCount || 0;
    return "🌀 Ascension " + current + "/" + req + " requise";
  }
  return "Verrouillé";
}

/* Vignette illustrée par monde (découpée depuis la carte fantasy fournie).
   Fallback sur un dégradé neutre si l'image n'est pas trouvée. */
function getWorldThumb(world) {
  return "images/Worlds/thumb_" + (world.assetKey || "forest") + ".png";
}

/* Liste des ennemis + boss d'un monde, pour l'aperçu compact (plus de
   positionnement en % sur la carte). */
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
    return data ? { id: id, name: data.name, icon: renderIcon("enemies", data.asset), isBoss: false } : null;
  }).filter(Boolean);

  if (bossId && BOSS_DB[bossId]) {
    monsters.push({ id: bossId, name: BOSS_DB[bossId].name, icon: renderIcon("bosses", BOSS_DB[bossId].asset), isBoss: true });
  }

  return monsters;
}

/* Assemble l'écran carte : résumé en haut, grille des 6 vignettes de
   monde, puis le détail du monde sélectionné (aventures, monstres,
   ou message d'aide si verrouillé par ascension). */
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

  var h = '<div class="panel-title">🗺️ Carte du monde</div>';

  h += '<div class="map-grid">';
  h += '<div class="map-row"><span class="map-label">Monde actuel</span><span class="map-value">' + (currentWorldIndex + 1) + ' / ' + WORLDS.length + '</span></div>';
  h += '<div class="map-row"><span class="map-label">Quêtes terminées</span><span class="map-value">' + done + '/' + total + '</span></div>';
  h += '<div class="map-row"><span class="map-label">Boss vaincus</span><span class="map-value">' + bosses + '</span></div>';
  h += '</div>';

  h += '<div class="map-world-grid">';
  WORLDS.forEach(function (world, index) {
    var unlocked = isWorldUnlocked(index);
    var isCurrent = index === currentWorldIndex;
    var isDone = index < currentWorldIndex;
    var isSelected = index === selectedIndex;

    var classes = ["map-world-card"];
    if (isCurrent) classes.push("is-current");
    if (isDone) classes.push("is-done");
    if (!unlocked) classes.push("is-locked");
    if (isSelected) classes.push("is-selected");

    h += '<button class="' + classes.join(" ") + '" type="button" onclick="selectMapWorld(' + index + ')"';
    h += ' style="background-image:url(\'' + esc(getWorldThumb(world)) + '\')">';
    h += '<div class="map-world-card-overlay">';
    if (isCurrent) h += '<span class="map-world-card-badge">Actuel</span>';
    if (!unlocked) h += '<span class="map-world-card-lock">🔒</span>';
    h += '<div class="map-world-card-name">' + esc(world.name) + '</div>';
    h += '<div class="map-world-card-status status-' + (isDone ? "done" : isCurrent ? "current" : "locked") + '">' + getWorldProgressText(index) + '</div>';
    h += '</div>';
    h += '</button>';
  });
  h += '</div>';

  h += '<div class="map-world-card-detail">';
  h += '<div class="map-world-head">';
  h += '<div>';
  h += '<div class="map-world-kicker">Monde sélectionné</div>';
  h += '<div class="map-world-title">' + esc(selectedWorld.name) + '</div>';
  h += '<div class="map-world-status status-' + (selectedIndex < currentWorldIndex ? "done" : selectedIndex === currentWorldIndex ? "current" : "locked") + '">' + getWorldProgressText(selectedIndex) + '</div>';
  h += '</div>';
  h += '</div>';

  if (selectedIndex === currentWorldIndex) {
    var currentAdventure = selectedWorld.adventures[currentAdventureIndex];
    if (currentAdventure) {
      h += '<div class="map-current-adventure">';
      h += '<strong>Aventure actuelle :</strong> ' + esc(currentAdventure.name);
      h += ' <span>(' + ((WorldManager.enemyIndex || 0) + 1) + '/' + (currentAdventure.enemyCount || 1) + ')</span>';
      h += '</div>';
    }
  } else if (!isWorldUnlocked(selectedIndex) && !WorldManager.meetsAscensionRequirement(selectedIndex)) {
    var reqAscend = (selectedWorld.requiredAscension || 0);
    h += '<div class="map-lock-hint">';
    h += '<div class="map-lock-hint-text">🌀 Ce monde se débloque en ascensionnant. Chaque ascension réinitialise ta progression classique contre de l\'Aether, et compte pour le déblocage des mondes.</div>';
    h += '<button class="map-lock-hint-btn" type="button" onclick="switchTab(\'ascension\')">Aller à l\'Ascension</button>';
    h += '</div>';
  }

  var monsters = getWorldMonsterList(selectedWorld);
  if (monsters.length) {
    h += '<div class="map-monster-row">';
    monsters.forEach(function (m) {
      h += '<div class="map-monster-chip' + (m.isBoss ? " is-boss" : "") + '" title="' + esc(m.name) + '">' + m.icon + '</div>';
    });
    h += '</div>';
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

  return h;
}

window.getMapSelectedWorldIndex = getMapSelectedWorldIndex;
window.selectMapWorld = selectMapWorld;
window.getWorldMonsterList = getWorldMonsterList;
window.buildMapHTML = buildMapHTML;
