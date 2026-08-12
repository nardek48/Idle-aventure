"use strict";

/* ============================================================
   v2.90.14 — Carte du monde : chemin illustré (remplace la grille de
   6 vignettes + panneau de détail permanent, v1.9.4 à v2.90.13).
   La progression des mondes est LINÉAIRE (WorldManager.worldIndex,
   toujours dans l'ordre WORLDS[0..5]) — contrairement aux talents
   (branches), un chemin unique convient parfaitement ici. Chaque
   monde est un nœud rond (vraie vignette illustrée, images/Worlds/
   thumb_*.png — déjà de vraies illustrations, pas des placeholders),
   relié au suivant par un tracé SVG. Le détail (lore/aventures/
   questline) passe dans une popup au tap (#map-modal-root, même
   pattern que Village/Donjon/Talents cette session) au lieu d'un
   panneau permanent qui doublonnait l'info et laissait un grand vide
   en bas d'écran sur les mondes sans beaucoup de contenu.
============================================================ */

/* Quel monde est actuellement consulté (popup ouverte) — pas
   forcément le monde où le joueur progresse réellement. Stocké
   directement sur `game` par simplicité, mais volontairement PAS
   sauvegardé (pas dans buildSaveData) : juste un état d'UI temporaire. */
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

/* Un monde n'est vraiment jouable que s'il est à portée séquentielle
   (index <= monde courant) ET que la condition d'ascension est
   remplie — un monde "sauté" par manque d'ascension reste verrouillé
   même si le joueur a dépassé son index (ne devrait pas arriver vu
   WorldManager.advance(), mais gardé en sécurité). */
/* Un monde déjà atteint reste débloqué pour toujours, même si son
   requiredAscension est relevé plus tard par un patch d'équilibrage
   (sinon un joueur en cours de route dans ce monde le verrait
   affiché "verrouillé" alors qu'il y joue activement — c'est
   exactement ce bug qui a été corrigé ici en v2.12 : avant, la
   condition vérifiait meetsAscensionRequirement() à chaque affichage,
   qui pouvait échouer rétroactivement pour un monde déjà en cours). */
function isWorldUnlocked(index) {
  return index <= (WorldManager.worldIndex || 0);
}

/* Texte de statut affiché sur chaque vignette/en-tête de monde.
   v2.83 : le verrou n'est plus lié à l'ascension mais à une questline
   (voir data/world-quests.js) — le texte reflète sa progression. */
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

/* Bloc détaillé de la questline de déblocage d'un monde verrouillé :
   narration + progression de chaque étape + bouton de réclamation
   dès que tout est terminé. */
function buildWorldQuestHTML(worldIndex) {
  if (!window.WorldQuestManager) return "";
  var quest = WorldQuestManager.getQuestForWorldIndex(worldIndex);
  if (!quest) return "";

  var h = '<div class="map-quest-card">';
  h += '<div class="map-quest-head"><span class="map-quest-icon">' + esc(quest.icon || "🗺️") + '</span><span class="map-quest-name">' + esc(quest.name) + '</span></div>';

  quest.steps.forEach(function (step) {
    var progress = WorldQuestManager.getStepProgress(quest, step);
    var done = progress >= step.target;
    var pct = Math.min(100, Math.floor((progress / step.target) * 100));
    var desc = String(step.desc || "").replace("{target}", step.target);

    h += '<div class="map-quest-step' + (done ? " is-done" : "") + '">';
    h += '<div class="map-quest-step-text">' + esc(step.text || "") + '</div>';
    h += '<div class="map-quest-step-row">';
    h += '<span class="map-quest-step-desc">' + (done ? "✔ " : "") + esc(desc) + '</span>';
    h += '<span class="map-quest-step-count">' + esc(progress) + '/' + esc(step.target) + '</span>';
    h += '</div>';
    h += '<div class="map-quest-step-bar"><div class="map-quest-step-fill" style="width:' + pct + '%"></div></div>';
    h += '</div>';
  });

  var reward = quest.reward || {};
  h += '<div class="map-quest-reward">';
  h += '<span class="map-quest-reward-label">Récompense</span>';
  h += '<span class="map-quest-reward-value">';
  if (reward.gold) h += esc(formatNumber(reward.gold)) + ' or · ';
  if (reward.essence) h += esc(formatNumber(reward.essence)) + ' essence · ';
  if (reward.equipmentRarity) h += '1 objet ' + esc(RARITY_LABELS[reward.equipmentRarity] || reward.equipmentRarity) + ' · ';
  if (reward.aether) h += esc(reward.aether) + ' Aether';
  h += '</span>';
  h += '</div>';

  if (WorldQuestManager.isReadyToClaim(quest)) {
    var targetWorld = WORLDS[worldIndex];
    h += '<button class="settings-btn primary map-quest-claim-btn" type="button" onclick="claimWorldQuest(' + worldIndex + ')">🗺️ Réclamer et débloquer ' + esc(targetWorld ? targetWorld.name : "") + '</button>';
  }

  h += '</div>';
  return h;
}

/* Callback bouton "Réclamer" — voir WorldQuestManager.claim(). */
/* v2.90.17 : rafraîchit aussi la popup ouverte après réclamation
   (même pattern que buyDungeonTicketFromOverlay en ui/dungeon-view.js)
   — sans ça, la popup restait figée sur l'ancien état "verrouillé/
   questline en cours" puisqu'elle vit hors du cycle renderPanel()
   habituel (#map-modal-root, séparé du panneau principal). */
function claimWorldQuest(worldIndex) {
  if (window.WorldQuestManager) WorldQuestManager.claim(worldIndex);
  if (typeof renderPanel === "function") renderPanel();
  if (typeof openWorldPopup === "function") openWorldPopup(worldIndex);
}
window.claimWorldQuest = claimWorldQuest;

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
    return data ? { id: id, name: data.name, icon: renderIcon("enemies", data.asset), image: data.image || "", isBoss: false } : null;
  }).filter(Boolean);

  if (bossId && BOSS_DB[bossId]) {
    var bossData = BOSS_DB[bossId];
    monsters.push({ id: bossId, name: bossData.name, icon: renderIcon("bosses", bossData.asset), image: bossData.image || "", isBoss: true });
  }

  return monsters;
}

/* Assemble l'écran carte : résumé en haut, grille des 6 vignettes de
   monde, puis le détail du monde sélectionné (aventures, monstres,
   ou message d'aide si verrouillé par ascension). */
/* Courte citation du Codex pour le monde sélectionné, si l'entrée
   correspondante est débloquée — un avant-goût qui donne envie
   d'aller lire l'entrée complète dans le Codex. */
var MAP_WORLD_CODEX_IDS = ["world_forest", "world_desert", "world_ruins", "world_crypt", "world_mountain", "world_tower"];

function buildWorldLoreExcerptHTML(worldIndex) {
  var codexId = MAP_WORLD_CODEX_IDS[worldIndex];
  if (!codexId || typeof buildCodexExcerptHTML !== "function") return "";
  return buildCodexExcerptHTML(codexId, "map-world-lore");
}

/* ============================================================
   Chemin illustré (chaque monde = un nœud rond relié au suivant).
============================================================ */

/* Positions (%) des 6 nœuds, calées PRÉCISÉMENT sur les 6 zones de
   images/Map/world_map.jpg (fournie par l'utilisateur — une seule
   illustration continue, pas des tuiles séparées comme le Village).
   Relevées à la main sur l'image réelle (grille de repérage) :
     Forêt (arbre)         : 750,280   sur 1536×2752
     Désert (oasis)        : 700,950
     Ruines (cristal bleu) : 1080,1200
     Crypte (temple violet): 280,1650
     Montagne (volcan)     : 1000,1780
     Tour (sur les nuages) : 1180,2200
   Une 7e zone (grotte cristal en bas à gauche) reste décorative,
   aucun monde ne lui correspond. */
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

  // v2.90.16 : coordonnées réelles (relevées sur images/Map/world_map.jpg)
  // pas symétriques comme l'ancien zigzag générique — le point de
  // contrôle de chaque courbe est maintenant calculé au milieu RÉEL
  // de chaque segment (x ET y), pour une courbe fluide qui suit
  // naturellement le tracé plutôt qu'un "50" fixe qui zigzaguerait
  // trop large sur certains segments et pas assez sur d'autres.
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

/* v2.90.15 : résumé "Monde actuel / Quêtes terminées / Boss vaincus"
   retiré à la demande de l'utilisateur — le monde actuel est déjà
   visuellement évident sur le chemin (badge "Actuel" + halo doré du
   nœud), "Monde X/6" est déjà affiché sur Personnage > Stats (info
   dupliquée), et "Quêtes terminées" concernait les quêtes
   journalières, sans rapport avec la navigation sur la carte —
   l'écran va directement du titre au chemin illustré. */
/* v2.90.16 : plus de .nb-page-frame ici — images/Map/world_map.jpg
   a déjà sa propre bordure ornée (griffons, boussole, échelle),
   ajouter le cadre parchemin standard par-dessus aurait fait un
   "cadre dans le cadre". Seul écran du jeu dans ce cas (décision
   discutée avec l'utilisateur avant implémentation) — tous les
   autres gardent .nb-page-frame. */
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

/* ============================================================
   Popup de détail d'un monde (#map-modal-root) — même pattern que
   les popups Village/Donjon/Talents de cette session
   (.full-menu-overlay/.full-menu).
============================================================ */

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
    h += buildWorldQuestHTML(index);
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

/* Conservée pour compatibilité (ancien nom, ex. lien direct depuis
   une autre vue) — équivaut maintenant à ouvrir la popup. */
function selectMapWorld(index) {
  openWorldPopup(index);
}

window.getMapSelectedWorldIndex = getMapSelectedWorldIndex;
window.selectMapWorld = selectMapWorld;
window.getWorldMonsterList = getWorldMonsterList;
window.buildWorldQuestHTML = buildWorldQuestHTML;
window.buildMapHTML = buildMapHTML;
window.openWorldPopup = openWorldPopup;
window.closeWorldPopup = closeWorldPopup;
