"use strict";
/* ============================================================
Quest Idle — ui/quests-view.js
Écran "Quêtes" + badge de notification unifié sur le bouton Menu
(pastille numérique, hors du panneau lui-même).

v2.14 : le badge (toujours nommé updateQuestBadge pour ne pas casser
tous ses appels existants) agrège plusieurs sources d'attention :
quêtes prêtes à réclamer + hauts faits prêts à réclamer + ticket de
donjon disponible et non utilisé — plutôt que les quêtes seules.
v2.21 : + talents à dépenser + ascension disponible.
============================================================ */

/* 1 si au moins un point de talent est disponible ET dépensable dans
   au moins une branche (évite de signaler "disponible" si le joueur
   a des points mais que tous les talents accessibles sont déjà pris). */
function getTalentsAvailableCount() {
  if ((game.talentPoints || 0) <= 0) return 0;
  if (typeof getAllTalentNodes !== "function") return (game.talentPoints > 0) ? 1 : 0;

  var tree = getAllTalentNodes();
  var hasPurchasable = ["combat", "fortune", "survival"].some(function (branch) {
    return (tree[branch] || []).some(function (node) {
      return !game.talents[node.id] && (!node.requires || game.talents[node.requires]);
    });
  });
  return hasPurchasable ? 1 : 0;
}

/* 1 si une ascension est possible dès maintenant. */
function getAscensionAvailableCount() {
  return (window.AscensionManager && typeof AscensionManager.canAscend === "function" && AscensionManager.canAscend()) ? 1 : 0;
}

/* Pastille numérique sur le bouton Menu, agrégeant tout ce qui mérite
   l'attention du joueur. Appelée après quasiment chaque action de jeu
   (achat, kill, ascension...).
   v3.7 : Donjon a rejoint la grille du Menu (retiré de la barre du
   bas au profit du Campement) — son ticket disponible réintègre donc
   le total agrégé ci-dessous, au même titre que Hauts faits/Talents/
   Ascension/Codex (il avait été explicitement exclu en v2.70 tant
   qu'il avait sa propre pastille dédiée sur son propre bouton ; cette
   pastille séparée (#dungeon-tab-badge) n'existe plus). La pastille
   individuelle sur la carte "Donjon" du Menu (voir MENU_ITEMS,
   ui/menu-view.js) montre déjà ce même nombre, comme les autres
   cartes. */
function updateQuestBadge() {
  var badge = document.getElementById("quest-badge");
  if (!badge) return;

  var questsReady = Array.isArray(game.quests)
    ? game.quests.filter(function (q) { return !q.claimed && QuestManager.isComplete(q); }).length
    : 0;

  var achievementsReady = (window.AchievementManager && typeof AchievementManager.getAvailableToClaimCount === "function")
    ? AchievementManager.getAvailableToClaimCount()
    : 0;

  var dungeonTicketReady = 0;
  if (window.DungeonManager && typeof DungeonManager.checkTicketReset === "function") {
    DungeonManager.checkTicketReset();
    if ((game.dungeonTickets || 0) > 0 && !(game.dungeonRun && game.dungeonRun.active)) {
      dungeonTicketReady = 1;
    }
  }

  var talentsReady = getTalentsAvailableCount();
  var ascensionReady = getAscensionAvailableCount();
  var codexUnread = (window.CodexManager && typeof CodexManager.getUnreadCount === "function")
    ? CodexManager.getUnreadCount()
    : 0;

  var total = questsReady + achievementsReady + talentsReady + ascensionReady + codexUnread + dungeonTicketReady;
  badge.textContent = total > 0 ? String(total) : "";
  badge.style.display = total > 0 ? "inline-flex" : "none";
}

function buildQuestsHTML() {
  var h = '';

  // NB : "Raid" n'a toujours pas de onclick (aucun mode de jeu associé) —
  // purement décoratif pour l'instant. "Donjon" navigue vers le nouvel
  // écran Donjon (voir ui/dungeon-view.js).
  h += '<div class="quest-top-actions">';
  h += '<button class="quest-mode-btn" type="button">Raid</button>';
  h += '<button class="quest-mode-btn" type="button" onclick="switchTab(\'dungeon\')">Donjon</button>';
  h += '</div>';

  h += buildWorldUnlockQuestSectionHTML();
  h += buildAdventureQuestsSectionHTML();

  h += '<div class="quest-timer">Reset dans ' + esc(QuestManager.timeUntilReset()) + '</div>';

  if (!game.quests || !game.quests.length) {
    h += '<div class="eq-empty">Aucune quête active.</div>';
    return '<div class="nb-page-frame">' + h + '</div>'; // v2.83.28
  }

  h += '<div class="quest-list">';
  game.quests.forEach(function (q) {
    var progress = QuestManager.getProgress(q);
    var done = QuestManager.isComplete(q);
    var claimed = !!q.claimed;
    var pct = Math.min(100, (progress / q.target) * 100);

    h += '<div class="nb-entry-card' + (claimed ? ' is-claimed' : done ? ' is-complete' : '') + '">';
    h += '<div class="nb-entry-icon-col"><div class="nb-entry-icon-frame">' + renderIconOrEmojiHTML(q.icon, "nb-entry-icon", q.name) + '</div></div>';
    h += '<div class="nb-entry-info-col">';
    h += '<div class="nb-entry-name">' + esc(q.name) + '</div>';
    h += '<div class="nb-entry-desc">' + esc(q.desc) + '</div>';
    h += '<div class="nb-entry-progress-bar"><div class="nb-entry-progress-fill' + (done ? ' done' : '') + '" style="width:' + pct + '%"></div><span class="nb-entry-progress-text">' + Math.min(progress, q.target) + ' / ' + q.target + '</span></div>';
    h += '<div class="nb-entry-meta">🎁 ' + formatNumber(q.rewardGold || 0) + ' or · ' + formatNumber(q.rewardEssence || 0) + ' essence</div>';
    h += '</div>';

    h += '<div class="nb-entry-status-col">';
    if (claimed) {
      h += '<span class="nb-entry-status-label is-complete">✔ Reçue</span>';
    } else if (done) {
      h += '<button class="btn-buy" onclick="QuestManager.claim(\'' + esc(q.id) + '\')">Réclamer</button>';
    } else {
      h += '<span class="nb-entry-status-label">En cours</span>';
    }
    h += '</div>';

    h += '</div>';
  });
  h += '</div>';

  return '<div class="nb-page-frame">' + h + '</div>'; // v2.83.28
}

/* v3.3 : questline de déblocage du PROCHAIN monde verrouillé (voir
   data/world-quests.js, WorldQuestManager) — déplacée ici depuis la
   popup Carte (v2.83-v3.2), pour rassembler toutes les quêtes du jeu
   au même endroit. On ne montre que la toute PROCHAINE questline
   incomplète (peu importe où en est WorldManager.worldIndex dans le
   run courant — worldIndex retombe à 0 à chaque ascension, mais
   worldQuestsCompleted, lui, est permanent) : les questlines plus
   lointaines (ex. Crypte avant même d'avoir fini celle de Ruines)
   n'ont aucune valeur à afficher tant que la précédente n'est pas
   terminée. */
function getNextLockedWorldIndex() {
  if (!window.WorldQuestManager || !window.WORLDS) return -1;
  for (var i = 0; i < WORLDS.length; i++) {
    if (!WorldQuestManager.isWorldUnlocked(i)) return i;
  }
  return -1;
}

function buildWorldUnlockQuestSectionHTML() {
  if (!window.WorldQuestManager) return "";
  var worldIndex = getNextLockedWorldIndex();
  if (worldIndex === -1) return "";

  var quest = WorldQuestManager.getQuestForWorldIndex(worldIndex);
  if (!quest) return "";

  var h = '<div class="map-adventure-quests">';
  h += '<div class="map-adventure-quests-title">🗺️ Questline de déblocage</div>';

  h += '<div class="map-quest-card">';
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
  h += '</div>';
  return h;
}

/* Callback bouton "Réclamer" — voir WorldQuestManager.claim(). Déplacé
   depuis ui/map-view.js en v3.3 (voir buildWorldUnlockQuestSectionHTML
   ci-dessus) — rafraîchit l'onglet Quêtes après réclamation. */
function claimWorldQuest(worldIndex) {
  if (window.WorldQuestManager) WorldQuestManager.claim(worldIndex);
  if (typeof renderPanel === "function") renderPanel();
}
window.claimWorldQuest = claimWorldQuest;

/* v3.5 : petite fenêtre narrative affichée UNE FOIS au clic sur
   "Lancer" (immersion) — se ferme avant que le run de combat démarre
   réellement, même pattern que buildDungeonIntroHTML/openDungeonIntro
   (ui/dungeon-view.js). Texte au champ `story` de chaque quête (voir
   data/adventure-quests.js). */
var pendingAdventureQuestId = null;

function buildAdventureQuestIntroHTML(questId) {
  var quest = window.ADVENTURE_QUESTS ? ADVENTURE_QUESTS[questId] : null;
  if (!quest) return "";

  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu dungeon-story-card">';
  h += '    <div class="dungeon-story-icon">' + esc(quest.icon || "📜") + '</div>';
  h += '    <div class="dungeon-story-title">' + esc(quest.name) + '</div>';
  if (quest.story) h += '    <div class="dungeon-story-text">' + esc(quest.story) + '</div>';
  h += '    <div class="dungeon-story-actions">';
  h += '      <button class="settings-btn" type="button" onclick="closeAdventureQuestIntro()">Annuler</button>';
  h += '      <button class="settings-btn primary" type="button" onclick="confirmAdventureQuestStart()">Commencer</button>';
  h += '    </div>';
  h += '  </div>';
  h += '</div>';
  return h;
}

function openAdventureQuestIntro(questId) {
  pendingAdventureQuestId = questId;
  var host = document.getElementById("adventure-quest-modal-root");
  if (host) host.innerHTML = buildAdventureQuestIntroHTML(questId);
}

function closeAdventureQuestIntro() {
  pendingAdventureQuestId = null;
  var host = document.getElementById("adventure-quest-modal-root");
  if (host) host.innerHTML = "";
}

function confirmAdventureQuestStart() {
  var questId = pendingAdventureQuestId;
  closeAdventureQuestIntro();
  if (questId && window.AdventureQuestManager) AdventureQuestManager.start(questId);
}

window.openAdventureQuestIntro = openAdventureQuestIntro;
window.closeAdventureQuestIntro = closeAdventureQuestIntro;
window.confirmAdventureQuestStart = confirmAdventureQuestStart;

/* v3.2 : quêtes d'aventure (data/adventure-quests.js) — déplacées ici
   depuis la popup Carte (v3.0). Lancement explicite d'un run de
   combat dédié (AdventureQuestManager.start(), même principe que le
   Donjon) plutôt qu'un suivi ambiant pendant le farm normal. Réutilise
   le style .map-quest-card/.map-quest-step (css/06-map.css) qui gère
   déjà l'affichage multi-étapes, pas besoin de nouveau CSS. */
function buildAdventureQuestsSectionHTML() {
  if (!window.AdventureQuestManager) return "";

  var quests = AdventureQuestManager.getAllQuests();
  if (!quests.length) return "";

  var runningQuest = AdventureQuestManager.getRunningQuest();

  // v3.5 : groupées par monde (en-tête par monde), dans l'ordre des
  // mondes (WORLDS) plutôt qu'une liste plate — plus lisible une fois
  // qu'il y a des quêtes sur plusieurs mondes à la fois.
  var questsByWorld = {};
  quests.forEach(function (quest) {
    if (!questsByWorld[quest.worldId]) questsByWorld[quest.worldId] = [];
    questsByWorld[quest.worldId].push(quest);
  });

  var h = '<div class="map-adventure-quests">';
  h += '<div class="map-adventure-quests-title">🧭 Quêtes d\'aventure';
  h += ' <span class="map-adventure-quests-resource">⛏️ Minerai rare : ' + esc(formatNumber((game.resources && game.resources.mineraiRare) || 0)) + '</span>';
  h += '</div>';

  (WORLDS || []).forEach(function (world) {
    var worldQuests = questsByWorld[world.id];
    if (!worldQuests || !worldQuests.length) return;

    h += '<div class="map-adventure-quests-world-header">' + esc(world.name) + '</div>';

    worldQuests.forEach(function (quest) {
    var claimed = !!game.adventureQuestsCompleted[quest.id];
    var isRunning = !!(runningQuest && runningQuest.id === quest.id);

    h += '<div class="map-quest-card' + (claimed ? " is-claimed" : isRunning ? " is-running" : "") + '">';
    h += '<div class="map-quest-head"><span class="map-quest-icon">' + esc(quest.icon || "📜") + '</span><span class="map-quest-name">' + esc(quest.name) + '</span></div>';

    quest.steps.forEach(function (step) {
      var progress = AdventureQuestManager.getStepProgress(quest, step);
      var done = progress >= step.target;
      var pct = Math.min(100, Math.floor((progress / step.target) * 100));
      var desc = String(step.desc || "").replace("{target}", step.target);

      h += '<div class="map-quest-step' + (done ? " is-done" : "") + '">';
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
    if (reward.gold) h += esc(formatNumber(reward.gold)) + ' or';
    if (reward.essence) h += ' · ' + esc(formatNumber(reward.essence)) + ' essence';
    h += '</span>';
    h += '</div>';

    if (claimed) {
      h += '<div class="map-quest-claimed-label">✔ Terminée</div>';
    } else if (isRunning) {
      h += '<div class="map-quest-run-actions">';
      h += '<button class="settings-btn primary" type="button" onclick="switchTab(\'combat\')">Voir le combat</button>';
      h += '<button class="settings-btn danger" type="button" onclick="AdventureQuestManager.forfeit(); if (typeof renderPanel === \'function\') renderPanel();">Abandonner</button>';
      h += '</div>';
    } else if (runningQuest) {
      // Une AUTRE quête est déjà en cours de run — pas de bouton
      // Lancer tant qu'elle n'est pas terminée/abandonnée (un seul
      // run possible à la fois, même règle que le Donjon).
      h += '<div class="map-quest-claimed-label">Termine ta quête en cours d\'abord</div>';
    } else {
      h += '<button class="settings-btn primary map-quest-claim-btn" type="button" onclick="openAdventureQuestIntro(\'' + quest.id + '\')">Lancer</button>';
    }

    h += '</div>';
    });
  });

  h += '</div>';
  return h;
}

window.updateQuestBadge = updateQuestBadge;
window.getTalentsAvailableCount = getTalentsAvailableCount;
window.getAscensionAvailableCount = getAscensionAvailableCount;
window.buildQuestsHTML = buildQuestsHTML;
window.buildWorldUnlockQuestSectionHTML = buildWorldUnlockQuestSectionHTML;
window.buildAdventureQuestsSectionHTML = buildAdventureQuestsSectionHTML;
