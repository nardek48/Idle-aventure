"use strict";
/* ui/quests-view.js — écran Quêtes : badge agrégé (Menu), sous-onglets Général/Journalières, filtre Active/Terminée unifiant questlines de monde + quêtes d'aventure + chasses en cartes repliables groupées par monde. Détail : COMMENTAIRES_ORIGINAUX.md */

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

function getAscensionAvailableCount() {
  return (window.AscensionManager && typeof AscensionManager.canAscend === "function" && AscensionManager.canAscend()) ? 1 : 0;
}

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

var activeQuestsSubTab = "general"; // "general" | "daily"

function setQuestsSubTab(tab) {
  activeQuestsSubTab = (tab === "daily") ? "daily" : "general";
  if (typeof renderPanel === "function") renderPanel();
}

function buildQuestsSubTabBarHTML() {
  var h = '<div class="pc-subtab-bar">';
  h += '<button type="button" class="pc-subtab-btn' + (activeQuestsSubTab === "general" ? ' is-active' : '') + '" onclick="setQuestsSubTab(\'general\')">🗺️<span>Général</span></button>';
  h += '<button type="button" class="pc-subtab-btn' + (activeQuestsSubTab === "daily" ? ' is-active' : '') + '" onclick="setQuestsSubTab(\'daily\')">📋<span>Journalières</span></button>';
  h += '</div>';
  return h;
}

var activeQuestsFilter = "active"; // "active" | "completed"

var expandedQuestCardIds = {};

function setQuestsFilter(filter) {
  activeQuestsFilter = (filter === "completed") ? "completed" : "active";
  if (typeof renderPanel === "function") renderPanel();
}

function toggleQuestCardExpand(cardId) {
  expandedQuestCardIds[cardId] = !expandedQuestCardIds[cardId];
  if (typeof renderPanel === "function") renderPanel();
}
window.setQuestsFilter = setQuestsFilter;
window.toggleQuestCardExpand = toggleQuestCardExpand;

function buildQuestsFilterBarHTML() {
  var h = '<div class="quest-top-actions">';
  h += '<button class="quest-mode-btn' + (activeQuestsFilter === "active" ? ' is-active' : '') + '" type="button" onclick="setQuestsFilter(\'active\')">Quête active</button>';
  h += '<button class="quest-mode-btn' + (activeQuestsFilter === "completed" ? ' is-active' : '') + '" type="button" onclick="setQuestsFilter(\'completed\')">Quête terminée</button>';
  h += '</div>';
  return h;
}

function buildQuestsGeneralSubTabHTML() {
  var h = '';
  h += buildQuestsFilterBarHTML();

  var cardsHTML = (activeQuestsFilter === "completed")
    ? buildCompletedQuestCardsHTML()
    : buildActiveQuestCardsHTML();

  h += cardsHTML
    ? '<div class="quest-list">' + cardsHTML + '</div>'
    : '<div class="eq-empty">' +
      (activeQuestsFilter === "completed" ? "Aucune quête terminée pour l'instant." : "Aucune quête active pour l'instant.") +
      '</div>';

  return h;
}

function buildQuestsDailySubTabHTML() {
  var h = '';
  h += '<div class="quest-timer">Reset dans ' + esc(QuestManager.timeUntilReset()) + '</div>';

  if (!game.quests || !game.quests.length) {
    h += '<div class="eq-empty">Aucune quête active.</div>';
    return h;
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

  return h;
}

function buildQuestsHTML() {
  var h = '<div class="subtab-page">';
  h += '<div class="subtab-page-content">';
  h += '<div class="nb-page-frame">';

  if (activeQuestsSubTab === "daily") {
    h += buildQuestsDailySubTabHTML();
  } else {
    h += buildQuestsGeneralSubTabHTML();
  }

  h += '</div>'; // fin .nb-page-frame
  h += '</div>'; // fin .subtab-page-content

  h += '<div class="subtab-bar-wrapper">';
  h += buildQuestsSubTabBarHTML();
  h += '</div>';

  h += '</div>'; // fin .subtab-page
  return h;
}

function getNextLockedWorldIndex() {
  if (!window.WorldQuestManager || !window.WORLDS) return -1;
  for (var i = 0; i < WORLDS.length; i++) {
    if (!WorldQuestManager.isWorldUnlocked(i)) return i;
  }
  return -1;
}

function buildWorldUnlockQuestDetailHTML(quest, worldIndex) {
  var h = '';
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
    h += '<button class="settings-btn primary map-quest-claim-btn" type="button" onclick="event.stopPropagation(); claimWorldQuest(' + worldIndex + ')">🗺️ Réclamer et débloquer ' + esc(targetWorld ? targetWorld.name : "") + '</button>';
  }

  return h;
}

function claimWorldQuest(worldIndex) {
  if (window.WorldQuestManager) WorldQuestManager.claim(worldIndex);
  if (typeof renderPanel === "function") renderPanel();
}
window.claimWorldQuest = claimWorldQuest;

var pendingAdventureQuestId = null;

function buildAdventureQuestIntroHTML(questId) {
  var quest = window.ADVENTURE_QUESTS ? ADVENTURE_QUESTS[questId] : null;
  if (!quest) return "";

  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu dungeon-story-card">';
  h += '    <div class="dungeon-story-icon">' + renderIconOrEmojiHTML(quest.icon || "📜", "dungeon-story-icon-img", quest.name) + '</div>';
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

function buildAdventureQuestDetailHTML(quest, claimed, runningQuest) {
  var isRunning = !!(runningQuest && runningQuest.id === quest.id);
  var h = '';

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
    h += '<button class="settings-btn primary" type="button" onclick="event.stopPropagation(); switchTab(\'combat\')">Voir le combat</button>';
    h += '<button class="settings-btn danger" type="button" onclick="event.stopPropagation(); AdventureQuestManager.forfeit(); if (typeof renderPanel === \'function\') renderPanel();">Abandonner</button>';
    h += '</div>';
  } else if (runningQuest) {
    h += '<div class="map-quest-claimed-label">Termine ta quête en cours d\'abord</div>';
  } else {
    h += '<button class="settings-btn primary map-quest-claim-btn" type="button" onclick="event.stopPropagation(); openAdventureQuestIntro(\'' + quest.id + '\')">Lancer</button>';
  }

  return h;
}

function buildCollapsibleQuestCardHTML(cardId, icon, name, detailHTML, extraClass) {
  var expanded = !!expandedQuestCardIds[cardId];
  var h = '<div class="map-quest-card quest-card-collapsible' + (expanded ? ' is-expanded' : '') + (extraClass ? ' ' + extraClass : '') + '">';
  h += '<div class="map-quest-head quest-card-header" onclick="toggleQuestCardExpand(\'' + esc(cardId) + '\')">';
  h += '<span class="map-quest-icon">' + renderIconOrEmojiHTML(icon, "map-quest-icon-img", name) + '</span>';
  h += '<span class="map-quest-name">' + esc(name) + '</span>';
  h += '<span class="quest-card-chevron">' + (expanded ? '▾' : '▸') + '</span>';
  h += '</div>';
  if (expanded) {
    h += '<div class="quest-card-detail">' + detailHTML + '</div>';
  }
  h += '</div>';
  return h;
}

function collectActiveQuestCardEntries() {
  var entries = [];

  if (window.WorldQuestManager) {
    var worldIndex = getNextLockedWorldIndex();
    if (worldIndex !== -1) {
      var worldQuest = WorldQuestManager.getQuestForWorldIndex(worldIndex);
      if (worldQuest) {
        entries.push({
          worldId: worldQuest.worldId,
          html: buildCollapsibleQuestCardHTML(
            'world_' + worldQuest.id,
            worldQuest.icon || "🗺️",
            worldQuest.name,
            buildWorldUnlockQuestDetailHTML(worldQuest, worldIndex),
            ""
          )
        });
      }
    }
  }

  if (window.AdventureQuestManager) {
    var quests = AdventureQuestManager.getAllQuests();
    var runningQuest = AdventureQuestManager.getRunningQuest();
    quests.forEach(function (quest) {
      if (game.adventureQuestsCompleted[quest.id]) return; // -> liste Terminée
      var isRunning = !!(runningQuest && runningQuest.id === quest.id);
      entries.push({
        worldId: quest.worldId,
        html: buildCollapsibleQuestCardHTML(
          'adv_' + quest.id,
          quest.icon || "📜",
          quest.name,
          buildAdventureQuestDetailHTML(quest, false, runningQuest),
          isRunning ? "is-running" : ""
        )
      });
    });
  }

  if (window.HuntQuestManager) {
    var huntQuests = HuntQuestManager.getAllQuests();
    var runningHunt = HuntQuestManager.getRunningQuest();
    huntQuests.forEach(function (quest) {
      var isRunning = !!(runningHunt && runningHunt.id === quest.id);
      entries.push({
        worldId: quest.worldId,
        html: buildCollapsibleQuestCardHTML(
          'hunt_' + quest.id,
          quest.icon || "🏹",
          quest.name,
          buildHuntQuestDetailHTML(quest, runningHunt),
          isRunning ? "is-running" : ""
        )
      });
    });
  }

  return entries;
}

function collectCompletedQuestCardEntries() {
  var entries = [];

  if (window.WorldQuestManager && window.WORLD_QUESTS) {
    Object.keys(WORLD_QUESTS).forEach(function (key) {
      var quest = WORLD_QUESTS[key];
      if (!game.worldQuestsCompleted || !game.worldQuestsCompleted[quest.id]) return;
      entries.push({
        worldId: quest.worldId,
        html: buildCollapsibleQuestCardHTML(
          'world_' + quest.id,
          quest.icon || "🗺️",
          quest.name,
          buildWorldUnlockQuestDetailHTML(quest, quest.worldIndex),
          "is-claimed"
        )
      });
    });
  }

  if (window.AdventureQuestManager) {
    var quests = AdventureQuestManager.getAllQuests();
    quests.forEach(function (quest) {
      if (!game.adventureQuestsCompleted[quest.id]) return;
      entries.push({
        worldId: quest.worldId,
        html: buildCollapsibleQuestCardHTML(
          'adv_' + quest.id,
          quest.icon || "📜",
          quest.name,
          buildAdventureQuestDetailHTML(quest, true, null),
          "is-claimed"
        )
      });
    });
  }

  return entries;
}

function buildQuestCardsGroupedByWorldHTML(entries) {
  if (!entries.length) return "";

  var byWorld = {};
  entries.forEach(function (entry) {
    var key = entry.worldId || "_other";
    if (!byWorld[key]) byWorld[key] = [];
    byWorld[key].push(entry.html);
  });

  var h = "";
  (WORLDS || []).forEach(function (world) {
    var cards = byWorld[world.id];
    if (!cards || !cards.length) return;
    h += '<div class="quest-world-section">';
    h += '<div class="quest-world-section-title">' + esc(world.name) + '</div>';
    h += cards.join("");
    h += '</div>';
    delete byWorld[world.id];
  });

  Object.keys(byWorld).forEach(function (key) {
    h += '<div class="quest-world-section">';
    h += '<div class="quest-world-section-title">Autres</div>';
    h += byWorld[key].join("");
    h += '</div>';
  });

  return h;
}

function buildActiveQuestCardsHTML() {
  return buildQuestCardsGroupedByWorldHTML(collectActiveQuestCardEntries());
}

function buildCompletedQuestCardsHTML() {
  return buildQuestCardsGroupedByWorldHTML(collectCompletedQuestCardEntries());
}

function buildHuntQuestDetailHTML(quest, runningHunt) {
  var isRunning = !!(runningHunt && runningHunt.id === quest.id);
  var stock = Number((game.resources || {})[quest.resourceKey] || 0);
  var resDef = (window.WAREHOUSE_RESOURCES && WAREHOUSE_RESOURCES[quest.resourceKey]) || null;

  var h = '';
  h += '<div class="map-quest-step">';
  h += '<div class="map-quest-step-row">';
  h += '<span class="map-quest-step-desc">' + (resDef ? esc(resDef.icon + " " + resDef.name) : "Ressource") + ' en Entrepôt</span>';
  h += '<span class="map-quest-step-count">' + formatNumber(stock) + '</span>';
  h += '</div>';
  h += '</div>';

  if (isRunning) {
    var inLot = Number((game.huntRun && game.huntRun.killsInLot) || 0);
    var pct = Math.min(100, Math.floor((inLot / quest.lotSize) * 100));
    h += '<div class="map-quest-step is-done">';
    h += '<div class="map-quest-step-row">';
    h += '<span class="map-quest-step-desc">Lot en cours</span>';
    h += '<span class="map-quest-step-count">' + inLot + '/' + quest.lotSize + '</span>';
    h += '</div>';
    h += '<div class="map-quest-step-bar"><div class="map-quest-step-fill" style="width:' + pct + '%"></div></div>';
    h += '</div>';
  }

  h += '<div class="map-quest-reward">';
  h += '<span class="map-quest-reward-label">Chance par kill</span>';
  h += '<span class="map-quest-reward-value">' + quest.dropChancePct + '% · lot de ' + quest.lotSize + '</span>';
  h += '</div>';

  if (isRunning) {
    h += '<div class="map-quest-run-actions">';
    h += '<button class="settings-btn primary" type="button" onclick="event.stopPropagation(); switchTab(\'combat\')">Voir le combat</button>';
    h += '<button class="settings-btn danger" type="button" onclick="event.stopPropagation(); HuntQuestManager.stop(); if (typeof renderPanel === \'function\') renderPanel();">Arrêter la chasse</button>';
    h += '</div>';
  } else if (runningHunt) {
    h += '<div class="map-quest-claimed-label">Termine ta chasse en cours d\'abord</div>';
  } else {
    h += '<button class="settings-btn primary map-quest-claim-btn" type="button" onclick="event.stopPropagation(); openHuntQuestIntro(\'' + quest.id + '\')">Chasser</button>';
  }

  return h;
}

var pendingHuntQuestId = null;

function buildHuntQuestIntroHTML(questId) {
  var quest = window.HUNT_QUESTS ? HUNT_QUESTS[questId] : null;
  if (!quest) return "";

  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu dungeon-story-card">';
  h += '    <div class="dungeon-story-icon">' + renderIconOrEmojiHTML(quest.icon || "🏹", "dungeon-story-icon-img", quest.name) + '</div>';
  h += '    <div class="dungeon-story-title">' + esc(quest.name) + '</div>';
  if (quest.story) h += '    <div class="dungeon-story-text">' + esc(quest.story) + '</div>';
  h += '    <div class="dungeon-story-actions">';
  h += '      <button class="settings-btn" type="button" onclick="closeHuntQuestIntro()">Annuler</button>';
  h += '      <button class="settings-btn primary" type="button" onclick="confirmHuntQuestStart()">Commencer</button>';
  h += '    </div>';
  h += '  </div>';
  h += '</div>';
  return h;
}

function openHuntQuestIntro(questId) {
  pendingHuntQuestId = questId;
  var host = document.getElementById("adventure-quest-modal-root");
  if (host) host.innerHTML = buildHuntQuestIntroHTML(questId);
}

function closeHuntQuestIntro() {
  pendingHuntQuestId = null;
  var host = document.getElementById("adventure-quest-modal-root");
  if (host) host.innerHTML = "";
}

function confirmHuntQuestStart() {
  var questId = pendingHuntQuestId;
  closeHuntQuestIntro();
  if (questId && window.HuntQuestManager) HuntQuestManager.start(questId);
}

function buildHuntLotCompleteHTML(quest) {
  if (!quest) return "";
  var stock = Number((game.resources && game.resources[quest.resourceKey]) || 0);
  var resource = window.WAREHOUSE_RESOURCES ? WAREHOUSE_RESOURCES[quest.resourceKey] : null;

  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu dungeon-story-card is-success">';
  h += '    <div class="dungeon-story-icon">' + renderIconOrEmojiHTML(quest.icon || "🏹", "dungeon-story-icon-img", quest.name) + '</div>';
  h += '    <div class="dungeon-story-title">Chasse terminée !</div>';
  h += '    <div class="dungeon-story-text">' + esc(quest.lotSize) + ' bêtes abattues. Le gibier se fait plus rare pour l\u2019instant — reviens plus tard, ou relance une nouvelle chasse tout de suite.</div>';

  h += '    <div class="dungeon-summary-rewards">';
  h += '      <div class="dungeon-summary-row"><span>' + esc(resource ? resource.name : quest.resourceKey) + ' en stock</span><span>' + esc(formatNumber(stock)) + '</span></div>';
  h += '    </div>';

  h += '    <div class="dungeon-story-actions">';
  h += '      <button class="settings-btn" type="button" onclick="closeHuntLotComplete()">Fermer</button>';
  h += '      <button class="settings-btn primary" type="button" onclick="restartHuntQuest(\'' + esc(quest.id) + '\')">Chasser à nouveau</button>';
  h += '    </div>';
  h += '  </div>';
  h += '</div>';
  return h;
}

function openHuntLotComplete(quest) {
  var host = document.getElementById("adventure-quest-modal-root");
  if (host) host.innerHTML = buildHuntLotCompleteHTML(quest);
}

function closeHuntLotComplete() {
  var host = document.getElementById("adventure-quest-modal-root");
  if (host) host.innerHTML = "";
}

function restartHuntQuest(questId) {
  closeHuntLotComplete();
  if (questId && window.HuntQuestManager) HuntQuestManager.start(questId);
}

window.openHuntLotComplete = openHuntLotComplete;
window.closeHuntLotComplete = closeHuntLotComplete;
window.restartHuntQuest = restartHuntQuest;
window.buildHuntLotCompleteHTML = buildHuntLotCompleteHTML;

window.openHuntQuestIntro = openHuntQuestIntro;
window.closeHuntQuestIntro = closeHuntQuestIntro;
window.confirmHuntQuestStart = confirmHuntQuestStart;
window.buildHuntQuestDetailHTML = buildHuntQuestDetailHTML;

window.updateQuestBadge = updateQuestBadge;
window.getTalentsAvailableCount = getTalentsAvailableCount;
window.getAscensionAvailableCount = getAscensionAvailableCount;
window.buildQuestsHTML = buildQuestsHTML;
window.setQuestsSubTab = setQuestsSubTab;
window.buildActiveQuestCardsHTML = buildActiveQuestCardsHTML;
window.buildCompletedQuestCardsHTML = buildCompletedQuestCardsHTML;

