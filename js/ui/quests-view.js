"use strict";
/* ui/quests-view.js — écran Quêtes : badge agrégé (Menu), sous-onglets Général/Journalières, filtre Active/Terminée,
   4 catégories repliables (Histoire/Ressources/Aventure/Expéditions) unifiant questlines de monde + quêtes d'aventure
   + chasses, chaque catégorie groupée par monde en cartes repliables. Détail : COMMENTAIRES_ORIGINAUX.md */

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

  var storyReady = (window.StoryQuestManager && typeof StoryQuestManager.getClaimableCount === "function")
    ? StoryQuestManager.getClaimableCount()
    : 0;

  var total = achievementsReady + talentsReady + ascensionReady + codexUnread + dungeonTicketReady + storyReady; // v3.116.0 : plus de journalières
  badge.textContent = total > 0 ? String(total) : "";
  badge.style.display = total > 0 ? "inline-flex" : "none";
}

/* v3.116.0 (Lot B) : onglets de catégorie en tête du tableau (Histoire/Secondaires/Chasse/Aventure),
   mapping par sourceKind des missions du MissionBoard. « Terminées » devient un lien discret. */

var activeQuestsFilter = "active"; // "active" | "completed"
var activeQuestCategory = "histoire"; // histoire | secondaires | chasse | aventure

var QUEST_BOARD_CATEGORIES = [
  { key: "histoire", label: "Histoire", icon: "📜", kinds: ["story", "worldExpedition"], emptyText: "Aucune quête d'histoire pour le moment." },
  { key: "secondaires", label: "Secondaires", icon: "⭐", kinds: ["village", "workshop", "exploration", "scene"], emptyText: "Aucune quête secondaire disponible pour le moment." }, // v3.122.0 (Lot S2a) : "scene" ajouté (quêtes migrées vers le scene-engine)
  { key: "chasse", label: "Chasse", icon: "🐾", kinds: ["hunt"], emptyText: "Aucune chasse disponible pour le moment." },
  { key: "aventure", label: "Aventure", icon: "🧭", kinds: ["adventure", "dungeon"], emptyText: "Aucune aventure disponible pour le moment." }
];

function setQuestCategory(key) {
  activeQuestCategory = key;
  activeQuestsFilter = "active";
  if (typeof renderPanel === "function") renderPanel();
}
window.setQuestCategory = setQuestCategory;

var expandedQuestCardIds = {};
var expandedQuestSectionIds = {}; // v3.89 : cartes-catégories (Histoire/Ressources/Aventure/Expéditions), repliées par défaut

var DIFFICULTY_LABELS = { easy: "Facile", medium: "Moyen", hard: "Difficile" };
var DIFFICULTY_COLORS = { easy: "#4ade80", medium: "#f0b429", hard: "#ef4444" };

var QUEST_SECTIONS = [
  { key: "worldexpedition", label: "Histoire", icon: "🗺️", emptyText: "Aucune questline de monde disponible pour le moment." },
  { key: "resource", label: "Ressources", icon: "🏹", emptyText: "Aucune quête de ressource disponible pour le moment." },
  { key: "adventure", label: "Aventure", icon: "📜", emptyText: "Aucune quête d'aventure disponible pour le moment." },
  { key: "expedition", label: "Expéditions", icon: "🧭", emptyText: "Aucune quête disponible pour le moment." }
];

function toggleQuestSectionExpand(sectionKey) {
  expandedQuestSectionIds[sectionKey] = !expandedQuestSectionIds[sectionKey];
  if (typeof renderPanel === "function") renderPanel();
}
window.toggleQuestSectionExpand = toggleQuestSectionExpand;

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

/* v3.116.0 (Lot B) : barre d'onglets de catégorie façon maquette — bannière parchemin, icône
   au-dessus du libellé, pastille si une mission de la catégorie est réclamable. */
function buildQuestCategoryTabsHTML(missions) {
  var claimableByCat = {};
  QUEST_BOARD_CATEGORIES.forEach(function (cat) {
    claimableByCat[cat.key] = missions.some(function (m) {
      return cat.kinds.indexOf(m.sourceKind) !== -1 && (m.status === "claimable" || m.status === "ready");
    });
  });
  // La chaîne Histoire (hors MissionBoard côté onglet) compte aussi pour la pastille Histoire.
  if (window.StoryQuestManager && typeof StoryQuestManager.getClaimableCount === "function" && StoryQuestManager.getClaimableCount() > 0) {
    claimableByCat.histoire = true;
  }

  var h = '<div class="qb-tabs">';
  QUEST_BOARD_CATEGORIES.forEach(function (cat) {
    h += '<button type="button" class="qb-tab' + (activeQuestCategory === cat.key ? ' is-active' : '') + '" onclick="setQuestCategory(\'' + cat.key + '\')">';
    h += '<span class="qb-tab-icon">' + cat.icon + '</span>';
    h += '<span class="qb-tab-label">' + esc(cat.label) + '</span>';
    if (claimableByCat[cat.key]) h += '<span class="qb-tab-dot"></span>';
    h += '</button>';
  });
  h += '</div>';
  return h;
}

/* Bouton d'action d'une carte du tableau — mêmes verbes que le Campement (campMissionAction). */
function buildQuestBoardActionHTML(m) {
  if (m.claim) return '<button class="settings-btn primary qb-card-btn" type="button" onclick="event.stopPropagation(); campMissionAction(\'' + esc(m.id) + '\', \'claim\')">🎁 Réclamer</button>';
  if (m.status === "running" || m.status === "accepted") {
    var h = '';
    // v3.117.0 : "accepted" (pas encore lancée) -> Partir ; "running" (déjà en cours) -> Continuer.
    var launchLabel = m.status === "running" ? "▶ Continuer" : "🚩 Partir";
    if (m.launch) h += '<button class="settings-btn primary qb-card-btn" type="button" onclick="event.stopPropagation(); campMissionAction(\'' + esc(m.id) + '\', \'launch\')">' + launchLabel + '</button>';
    if (m.abandon) h += '<button class="settings-btn danger qb-card-btn" type="button" onclick="event.stopPropagation(); campMissionAction(\'' + esc(m.id) + '\', \'abandon\')">Abandonner</button>';
    return h;
  }
  if (m.accept) return '<button class="settings-btn primary qb-card-btn" type="button" onclick="event.stopPropagation(); campMissionAction(\'' + esc(m.id) + '\', \'accept\')">Accepter</button>';
  if (m.status === "locked") return '<span class="qb-card-locked">Occupé ailleurs</span>';
  // v3.141.0 (audit Forêt, cap journalier de la Petite Aventure) : sans ce cas, une carte
  // "unavailable" (cap des 3 runs/jour atteint) retombait dans le "" final — ni bouton ni texte,
  // la carte semblait inerte plutôt que clairement indisponible pour aujourd'hui. Réutilise le
  // même habillage visuel que "locked" (qb-card-locked, is-locked sur la carte).
  if (m.status === "unavailable") return '<span class="qb-card-locked">⏳ Revenez demain</span>';
  return "";
}

/* Carte façon maquette : bannière-icône à gauche, titre + description, chips récompenses, action. */
function buildQuestBoardCardHTML(m) {
  var statusCls = m.status === "claimable" || m.status === "ready" ? " is-claimable"
    : (m.status === "running" || m.status === "accepted") ? " is-running"
    // v3.141.0 : "unavailable" (cap journalier PA atteint) même style estompé que "locked" —
    // la carte reste visible et lisible (titre, description, comment ça marche) mais son statut
    // "pas aujourd'hui" saute aux yeux au lieu de ressembler à une mission normale sans action.
    : (m.status === "locked" || m.status === "unavailable") ? " is-locked" : "";
  var h = '<div class="qb-card' + statusCls + (m.isMain ? ' is-main' : '') + '">';
  h += '<div class="qb-card-banner qb-banner-' + esc(m.type || "combat") + '">' + renderIconOrEmojiHTML(MissionBoard.typeIcon(m.type), "qb-card-banner-img", m.title) + '</div>';
  h += '<div class="qb-card-body">';
  h += '<div class="qb-card-title-row"><span class="qb-card-title">' + esc(m.title) + '</span>';
  if (m.isMain) h += '<span class="quest-badge quest-badge-main">Principale</span>';
  h += '</div>';
  var desc = m.blurb || m.objectiveLabel || "";
  if (desc) h += '<div class="qb-card-desc">' + esc(desc) + '</div>';
  var hasStepsDetail = Array.isArray(m.stepsDetail) && m.stepsDetail.length > 0;
  // v3.131.3 : progressLabel masqué ici quand stepsDetail est présent — le détail par étape
  // (juste en dessous) couvre déjà cette info avec plus de contexte, éviter la redondance.
  if ((m.status === "running" || m.status === "accepted") && m.progressLabel && !hasStepsDetail) {
    h += '<div class="qb-card-progress">' + esc(m.progressLabel) + '</div>';
  }
  // v3.131.0 : détail des étapes (m.stepsDetail, optionnel, générique — voir _workshopMissions()
  // pour "Les fondations") — visible tant que la mission est acceptée/en cours, pas avant.
  if ((m.status === "running" || m.status === "accepted") && hasStepsDetail) {
    h += '<div class="qb-card-steps">';
    m.stepsDetail.forEach(function (s) {
      var stateCls = s.done ? "is-done" : s.current ? "is-current" : "is-pending";
      var icon = s.done ? "✔" : s.current ? "▶" : "○";
      h += '<div class="qb-card-step ' + stateCls + '">';
      h += '<span class="qb-card-step-icon">' + icon + '</span>';
      h += '<span class="qb-card-step-label">' + esc(s.label) + '</span>';
      if (s.current && s.progress) h += '<span class="qb-card-step-progress">' + esc(s.progress) + '</span>';
      h += '</div>';
    });
    h += '</div>';
  }
  h += '<div class="qb-card-footer">';
  if (m.rewardSummary) {
    h += '<div class="qb-card-rewards">';
    m.rewardSummary.split(" · ").forEach(function (chip) {
      h += '<span class="qb-reward-chip">' + esc(chip) + '</span>';
    });
    h += '</div>';
  } else {
    h += '<div class="qb-card-rewards"></div>';
  }
  h += '<div class="qb-card-action">' + buildQuestBoardActionHTML(m) + '</div>';
  h += '</div>'; // fin .qb-card-footer
  h += '</div>'; // fin .qb-card-body
  h += '</div>';
  return h;
}

/* v3.131.0 (retour Seb) : indicateur permanent du cap de 3 quêtes actives (village/workshop/
   scene/adventure/hunt confondus — voir MissionBoard.ACTIVE_QUEST_CAP). Discret quand il reste
   de la marge, en alerte visuelle quand le cap est atteint (couleur + icône). */
function buildActiveQuestCapIndicatorHTML() {
  if (!window.MissionBoard || typeof MissionBoard.getActiveQuestCount !== "function") return "";
  var count = MissionBoard.getActiveQuestCount();
  var cap = (typeof ACTIVE_QUEST_CAP === "number") ? ACTIVE_QUEST_CAP : 3;
  var atCap = count >= cap;
  return '<div class="qb-cap-indicator' + (atCap ? ' is-full' : '') + '">'
    + (atCap ? '⛔' : '🗂️') + ' Quêtes actives : ' + count + '/' + cap
    + '</div>';
}

/* v3.116.0 (Lot B) : vue par catégorie — Histoire garde la chaîne détaillée (buildStoryChainHTML)
   suivie des questlines de monde ; les autres onglets listent leurs missions en cartes bannière. */
function buildQuestsGeneralSubTabHTML() {
  var missions = window.MissionBoard ? MissionBoard.list() : [];
  var h = '';
  h += buildQuestCategoryTabsHTML(missions);
  h += buildActiveQuestCapIndicatorHTML();

  if (activeQuestsFilter === "completed") {
    h += '<div class="qb-completed-bar"><button class="qb-completed-link" type="button" onclick="setQuestsFilter(\'active\')">◂ Retour aux quêtes actives</button></div>';
    h += buildCompletedQuestCardsHTML();
    return h;
  }

  var cat = QUEST_BOARD_CATEGORIES.find(function (c) { return c.key === activeQuestCategory; }) || QUEST_BOARD_CATEGORIES[0];
  var catMissions = missions.filter(function (m) {
    return cat.kinds.indexOf(m.sourceKind) !== -1 && m.sourceKind !== "story";
  });

  var storyHTML = (cat.key === "histoire") ? buildStoryChainHTML() : "";
  h += storyHTML;

  if (catMissions.length) {
    h += '<div class="quest-board-list">' + catMissions.map(buildQuestBoardCardHTML).join("") + '</div>';
  } else if (!storyHTML) {
    h += '<div class="eq-empty">' + esc(cat.emptyText) + '</div>';
  }

  h += '<div class="qb-completed-bar"><button class="qb-completed-link" type="button" onclick="setQuestsFilter(\'completed\')">Voir les quêtes terminées ▸</button></div>';
  return h;
}

function buildQuestsHTML() {
  var h = '<div class="subtab-page">';
  h += '<div class="subtab-page-content">';
  h += '<div class="nb-page-frame">';

  h += buildQuestsGeneralSubTabHTML();

  h += '</div>'; // fin .nb-page-frame
  h += '</div>'; // fin .subtab-page-content
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

function buildQuestBadgesHTML(quest) {
  var h = "";
  if (quest.difficulty && DIFFICULTY_LABELS[quest.difficulty]) {
    h += '<span class="quest-badge quest-badge-difficulty" style="color:' + (DIFFICULTY_COLORS[quest.difficulty] || 'inherit') + '">' + esc(DIFFICULTY_LABELS[quest.difficulty]) + '</span>';
  }
  if (quest.category === "main") {
    h += '<span class="quest-badge quest-badge-main">Principale</span>';
  } else if (quest.category === "side") {
    h += '<span class="quest-badge quest-badge-side">Secondaire</span>';
  }
  return h;
}

function buildCollapsibleQuestCardHTML(cardId, icon, name, detailHTML, extraClass, quest) {
  var expanded = !!expandedQuestCardIds[cardId];
  var h = '<div class="map-quest-card quest-card-collapsible' + (expanded ? ' is-expanded' : '') + (extraClass ? ' ' + extraClass : '') + '">';
  h += '<div class="map-quest-head quest-card-header" onclick="toggleQuestCardExpand(\'' + esc(cardId) + '\')">';
  h += '<span class="map-quest-icon">' + renderIconOrEmojiHTML(icon, "map-quest-icon-img", name) + '</span>';
  h += '<span class="map-quest-name">' + esc(name) + '</span>';
  if (quest) h += buildQuestBadgesHTML(quest);
  h += '<span class="quest-card-chevron">' + (expanded ? '▾' : '▸') + '</span>';
  h += '</div>';
  if (expanded) {
    h += '<div class="quest-card-detail">' + detailHTML + '</div>';
  }
  h += '</div>';
  return h;
}

function collectCompletedQuestCardEntries() {
  var entries = [];

  if (window.WorldQuestManager && window.WORLD_QUESTS) {
    Object.keys(WORLD_QUESTS).forEach(function (key) {
      var quest = WORLD_QUESTS[key];
      if (!game.worldQuestsCompleted || !game.worldQuestsCompleted[quest.id]) return;
      entries.push({
        worldId: quest.worldId,
        section: quest.section || "worldexpedition",
        html: buildCollapsibleQuestCardHTML(
          'world_' + quest.id,
          quest.icon || "🗺️",
          quest.name,
          buildWorldUnlockQuestDetailHTML(quest, quest.worldIndex),
          "is-claimed",
          quest
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
        section: quest.section || "adventure",
        html: buildCollapsibleQuestCardHTML(
          'adv_' + quest.id,
          quest.icon || "📜",
          quest.name,
          buildAdventureQuestDetailHTML(quest, true, null),
          "is-claimed",
          quest
        )
      });
    });
  }

  // v3.111.0 (Lot B) : quêtes tutorielles du Village réclamées (chaîne Champs).
  if (window.VillageQuestManager && window.VILLAGE_QUESTS) {
    VILLAGE_QUESTS.forEach(function (quest) {
      if (!VillageQuestManager.isClaimed(quest.id)) return;
      entries.push({
        worldId: null,
        section: quest.section || "resource",
        html: buildCollapsibleQuestCardHTML(
          'village_' + quest.id,
          quest.icon || "🏡",
          quest.title,
          buildVillageQuestDetailHTML(quest),
          "is-claimed",
          quest
        )
      });
    });
  }

  /* v3.124.0 (retrait ancien moteur) : historique des 6 quêtes de déblocage migrées vers le
     scene-engine — lecture directe depuis SCENE_TEMPLATES + game.explorationProgression, sans
     dépendance à ExplorationManager/MiningManager/WellManager (retirés). Une seule fonction
     générique remplace les anciennes buildExplorationQuestDetailHTML/buildMiningQuestDetailHTML/
     buildDriedSpringQuestDetailHTML/buildUnstableVeinQuestDetailHTML — elles ne géraient plus
     que le cas "terminée" en pratique (le lancement passe uniquement par MissionBoard désormais). */
  if (window.SceneRunManager && window.SCENE_TEMPLATES) {
    SceneRunManager._SCENE_QUEST_LEGACY_IDS_FOR_HISTORY = SceneRunManager._SCENE_QUEST_LEGACY_IDS_FOR_HISTORY
      || ["sentier_obstrue", "bosquet_silencieux", "terre_en_friche", "veine_instable", "eboulis_ferreux", "source_tarie"];
    SceneRunManager._SCENE_QUEST_LEGACY_IDS_FOR_HISTORY.forEach(function (templateId) {
      var template = SCENE_TEMPLATES[templateId];
      if (!template || !SceneRunManager.isQuestCompleted(templateId)) return;
      entries.push({
        worldId: null,
        section: "expedition",
        html: buildCollapsibleQuestCardHTML(
          'scene_' + templateId,
          template.icon || "🧭",
          template.title,
          buildSceneQuestCompletedDetailHTML(template),
          "is-claimed",
          template
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

/* v3.89 : carte-catégorie repliable (Histoire/Ressources/Aventure/Expéditions), pattern
   inspiré de buildDungeonCardHTML — repliée par défaut, affiche un compte au repos. */
function buildQuestSectionCardHTML(sectionDef, entriesForSection) {
  // v3.100.0 : la chaîne Histoire (StoryQuestManager) vit dans la section « Histoire », en tête ;
  // la section s'ouvre d'elle-même tant que la chaîne est active (jamais explicitement repliée).
  var storyHTML = (sectionDef.key === "worldexpedition") ? buildStoryChainHTML() : "";
  if (storyHTML && expandedQuestSectionIds[sectionDef.key] === undefined) expandedQuestSectionIds[sectionDef.key] = true;
  var expanded = !!expandedQuestSectionIds[sectionDef.key];
  var count = entriesForSection.length + (storyHTML ? 1 : 0);

  var h = '<div class="quest-section-card' + (expanded ? ' is-expanded' : '') + '">';
  h += '<button type="button" class="quest-section-head" onclick="toggleQuestSectionExpand(\'' + esc(sectionDef.key) + '\')">';
  h += '<span class="quest-section-icon">' + renderIconOrEmojiHTML(sectionDef.icon, "quest-section-icon-img", sectionDef.label) + '</span>';
  h += '<span class="quest-section-name">' + esc(sectionDef.label) + '</span>';
  if (count > 0) h += '<span class="quest-section-count">' + count + '</span>';
  h += '<span class="quest-section-chevron">' + (expanded ? '▲' : '▼') + '</span>';
  h += '</button>';

  if (expanded) {
    h += '<div class="quest-section-body">';
    if (storyHTML) h += storyHTML;
    if (count > 0) {
      h += buildQuestCardsGroupedByWorldHTML(entriesForSection);
    } else if (!storyHTML) {
      h += '<div class="eq-empty">' + esc(sectionDef.emptyText) + '</div>';
    }
    h += '</div>';
  }

  h += '</div>';
  return h;
}

function buildQuestCardsGroupedBySectionHTML(entries) {
  var bySection = {};
  entries.forEach(function (entry) {
    var key = entry.section || "adventure";
    if (!bySection[key]) bySection[key] = [];
    bySection[key].push(entry);
  });

  var h = '<div class="quest-section-list">';
  QUEST_SECTIONS.forEach(function (sectionDef) {
    h += buildQuestSectionCardHTML(sectionDef, bySection[sectionDef.key] || []);
  });
  h += '</div>';
  return h;
}

/* v3.103.2 (P4) : collectActiveQuestCardEntries()/buildActiveQuestCardsHTML() retirées — remplacées
   par MissionBoard.list() (systems/mission-board-system.js), même façade que le Campement. La collecte
   « Terminée » (ci-dessus) reste inchangée, MissionBoard ne couvrant que les missions actives/proposables.

   v3.100.0 : chaîne Histoire « Les Braises d'Aeswyn » (data/story-quests.js). Étape courante mise en
   avant (Accepter → objectif → Réclamer), étapes réclamées repliées en une ligne. Filtre Terminée :
   uniquement les étapes réclamées. Retourne "" si aucun chapitre à afficher (skipped, ou rien réclamé en mode Terminée). */
function buildStoryStepRewardText(reward) {
  var parts = [];
  reward = reward || {};
  if (reward.gold) parts.push(formatNumber(reward.gold) + " or");
  if (reward.essence) parts.push(formatNumber(reward.essence) + " essence");
  if (reward.healingPotion) {
    var potion = (window.PotionManager && typeof PotionManager.getHealingPotion === "function") ? PotionManager.getHealingPotion(reward.healingPotion.id) : null;
    parts.push((reward.healingPotion.count || 1) + " " + (potion ? potion.name : "potion"));
  }
  if (reward.resources && typeof reward.resources === "object") {
    Object.keys(reward.resources).forEach(function (key) {
      var def = (window.WAREHOUSE_RESOURCES || {})[key];
      parts.push(formatNumber(reward.resources[key]) + " " + (def ? def.name : key));
    });
  }
  if (reward.equipmentRarity) parts.push((reward.equipmentCount || 1) + " objet " + ((window.RARITY_LABELS || {})[reward.equipmentRarity] || reward.equipmentRarity));
  return parts.join(" · ") || "—";
}

function buildStoryStepUnlockText(step) {
  var labels = window.STORY_TAB_LABELS || {};
  return (step.unlockTabs || []).map(function (t) { return labels[t] || t; }).join(", ");
}

function buildStoryClaimedStepHTML(chapterId, step, index) {
  var cardId = "story_" + step.id;
  var expanded = !!expandedQuestCardIds[cardId];
  var h = '<div class="story-step story-step-claimed' + (expanded ? ' is-expanded' : '') + '" onclick="toggleQuestCardExpand(\'' + esc(cardId) + '\')">';
  h += '<div class="story-step-row"><span class="story-step-num">✔ ' + (index + 1) + '</span><span class="story-step-title">' + esc(step.title) + '</span><span class="quest-card-chevron">' + (expanded ? '▾' : '▸') + '</span></div>';
  if (expanded) h += '<div class="story-step-text">' + esc(step.narrative.completion) + '</div>';
  h += '</div>';
  return h;
}

function buildStoryCurrentStepHTML(chapterId, chapter, step, index) {
  var accepted = StoryQuestManager.isCurrentStepAccepted(chapterId);
  var ready = StoryQuestManager.isCurrentStepReady(chapterId);
  var unlockText = buildStoryStepUnlockText(step);

  var h = '<div class="story-step story-step-current' + (ready ? ' is-ready' : accepted ? ' is-accepted' : '') + '">';
  if (step.act) h += '<div class="story-step-act">' + esc(step.act) + '</div>';
  h += '<div class="story-step-row"><span class="story-step-num">' + (index + 1) + '/' + chapter.steps.length + '</span><span class="story-step-title">' + esc(step.title) + '</span><span class="quest-badge quest-badge-main">Principale</span></div>';
  h += '<div class="story-step-text">' + esc(step.narrative.objective) + '</div>';

  h += '<div class="map-quest-step">';
  h += '<div class="map-quest-step-row"><span class="map-quest-step-desc">' + (ready ? "✔ " : "") + esc(step.objectiveLabel || "") + '</span></div>';
  var progressText = accepted ? step.progress(game) : "";
  if (progressText) h += '<div class="story-step-progress">' + esc(progressText) + '</div>';
  h += '</div>';

  if (unlockText) h += '<div class="story-step-unlock">🔓 Débloque : ' + esc(unlockText) + '</div>';
  h += '<div class="map-quest-reward"><span class="map-quest-reward-label">Récompense</span><span class="map-quest-reward-value">' + esc(buildStoryStepRewardText(step.reward)) + '</span></div>';

  h += '<div class="story-step-actions">';
  if (!accepted) {
    h += '<button class="settings-btn primary" type="button" onclick="StoryQuestManager.acceptStep(\'' + esc(chapterId) + '\')">Accepter</button>';
  } else if (ready) {
    h += '<button class="settings-btn primary" type="button" onclick="StoryQuestManager.claimStep(\'' + esc(chapterId) + '\')">🎁 Réclamer</button>';
  } else if (step.linkTo) {
    h += '<button class="settings-btn" type="button" onclick="StoryQuestManager.goToLink(\'' + esc(chapterId) + '\')">➜ Aller à la quête</button>';
  }
  h += '</div>';
  h += '</div>';
  return h;
}

function buildStoryChainHTML() {
  if (!window.StoryQuestManager || !window.STORY_QUESTS) return "";
  var h = "";

  Object.keys(STORY_QUESTS).forEach(function (chapterId) {
    var chapter = STORY_QUESTS[chapterId];
    var st = StoryQuestManager.getState(chapterId);
    if (st.skipped) return;

    var claimed = chapter.steps.filter(function (s) { return !!st.claimedSteps[s.id]; });
    var current = StoryQuestManager.getCurrentStep(chapterId);
    var completedMode = activeQuestsFilter === "completed";
    if (completedMode && !claimed.length) return;

    h += '<div class="story-chain">';
    h += '<div class="story-chain-head"><span class="story-chain-icon">' + esc(chapter.icon || "📖") + '</span><span class="story-chain-title">' + esc(chapter.title) + '</span><span class="story-chain-progress">' + claimed.length + '/' + chapter.steps.length + '</span></div>';
    if (chapter.subtitle) h += '<div class="story-chain-sub">' + esc(chapter.subtitle) + '</div>';

    if (completedMode) {
      claimed.forEach(function (step) { h += buildStoryClaimedStepHTML(chapterId, step, chapter.steps.indexOf(step)); });
    } else {
      if (claimed.length) {
        // Étapes passées derrière une seule ligne repliable (jusqu'à 14 lignes sinon).
        var listId = "story_claimed_" + chapterId;
        var listOpen = !!expandedQuestCardIds[listId];
        h += '<div class="story-claimed-toggle" onclick="toggleQuestCardExpand(\'' + esc(listId) + '\')"><span>✔ ' + claimed.length + ' étape' + (claimed.length > 1 ? 's' : '') + ' terminée' + (claimed.length > 1 ? 's' : '') + '</span><span class="quest-card-chevron">' + (listOpen ? '▾' : '▸') + '</span></div>';
        if (listOpen) {
          h += '<div class="story-claimed-list">';
          claimed.forEach(function (step) { h += buildStoryClaimedStepHTML(chapterId, step, chapter.steps.indexOf(step)); });
          h += '</div>';
        }
      }
      if (current) {
        h += buildStoryCurrentStepHTML(chapterId, chapter, current, st.currentStep);
      } else {
        h += '<div class="story-step story-step-end">' + (StoryQuestManager.isChapterCompleted(chapterId) ? "Chapitre terminé — le Désert t'attend." : "La suite de l'histoire arrive bientôt…") + '</div>';
      }
    }
    h += '</div>';
  });

  return h;
}

/* Ouvre l'écran Quêtes (Général, filtre Active) sur une section et une carte données — cible du bouton « Aller à la quête ». */
/* v3.103.2 (P4) : sectionKey ne pilote plus de repli de catégorie (le tableau MissionBoard n'en a plus) —
   conservé en signature pour ne pas casser les appelants existants (mini-jeux d'exploration, etc.).
   cardId reste utile pour déplier une carte précise dans le filtre Terminée (encore par section). */
function openQuestsAt(sectionKey, cardId) {
  activeQuestsFilter = "active";
  // v3.116.0 (Lot B) : anciennes sections -> nouveaux onglets de catégorie.
  var sectionToCategory = { worldexpedition: "histoire", resource: "secondaires", expedition: "secondaires", adventure: "aventure" };
  if (sectionKey && sectionToCategory[sectionKey]) activeQuestCategory = sectionToCategory[sectionKey];
  if (cardId) expandedQuestCardIds[cardId] = true;
  if (typeof switchTab === "function") switchTab("quests");
  // v3.107.6 : switchTab() seul ne re-render pas toujours immédiatement le panneau selon le
  // point d'appel (bouton "Aller à la quête" depuis le Campement) — force le rendu pour être
  // sûr que le joueur voit bien l'écran Quêtes à jour, pas un état visuellement figé.
  if (typeof renderPanel === "function") renderPanel();
}
window.buildStoryChainHTML = buildStoryChainHTML;
window.openQuestsAt = openQuestsAt;

/* v3.111.0 (Lot B) : détail d'une quête tutorielle du Village réclamée — narratif de
   conclusion + récompense (le suivi de la quête courante vit au tableau de missions). */
function buildVillageQuestDetailHTML(quest) {
  var h = '';
  h += '<div class="map-quest-step">';
  h += '<div class="map-quest-step-row">';
  h += '<span class="map-quest-step-desc">' + esc((quest.narrative && quest.narrative.completion) || quest.objectiveLabel || '') + '</span>';
  h += '</div>';
  h += '</div>';

  var reward = quest.reward || {};
  var parts = [];
  if (reward.gold) parts.push(formatNumber(reward.gold) + ' or');
  if (reward.essence) parts.push(formatNumber(reward.essence) + ' essence');
  if (reward.resources && typeof reward.resources === 'object') {
    Object.keys(reward.resources).forEach(function (key) {
      var def = (window.WAREHOUSE_RESOURCES || {})[key];
      parts.push(formatNumber(reward.resources[key]) + ' ' + (def ? def.name : key));
    });
  }
  h += '<div class="map-quest-reward">';
  h += '<span class="map-quest-reward-label">Récompense</span>';
  h += '<span class="map-quest-reward-value">' + esc(parts.join(' · ') || '—') + '</span>';
  h += '</div>';

  h += '<div class="map-quest-claimed-label">✔ Terminée</div>';
  return h;
}

function buildSceneQuestCompletedDetailHTML(template) {
  var h = '';
  h += '<div class="map-quest-step">';
  h += '<div class="map-quest-step-row">';
  h += '<span class="map-quest-step-desc">' + esc(template.title) + '</span>';
  h += '</div>';
  h += '</div>';

  var resDef = (window.WAREHOUSE_RESOURCES || {})[template.lootResource];
  h += '<div class="map-quest-reward">';
  h += '<span class="map-quest-reward-label">Ressource</span>';
  h += '<span class="map-quest-reward-value">' + esc((resDef && resDef.name) || template.lootResource) + '</span>';
  h += '</div>';

  h += '<div class="map-quest-claimed-label">✔ Terminée</div>';
  return h;
}

function buildCompletedQuestCardsHTML() {
  return buildQuestCardsGroupedBySectionHTML(collectCompletedQuestCardEntries());
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

/* --- Template générique popup de fin de quête (titre/texte/récompenses/actions) ---
   Réutilisé par Chasses, Quêtes d'aventure et Questlines de monde : toute nouvelle
   quête doit passer par buildQuestCompleteHTML()/openQuestCompletePopup() plutôt que
   dupliquer son propre HTML de popup. Ancrage partagé "adventure-quest-modal-root"
   (déjà dans BLOCKING_MODAL_IDS du game-loop -> bloquant par nature). */
function buildQuestCompleteHTML(config) {
  if (!config) return "";

  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu dungeon-story-card is-success">';
  h += '    <div class="dungeon-story-icon">' + renderIconOrEmojiHTML(config.icon || "📜", "dungeon-story-icon-img", config.title || "") + '</div>';
  h += '    <div class="dungeon-story-title">' + esc(config.title || "Quête terminée !") + '</div>';
  if (config.text) h += '    <div class="dungeon-story-text">' + esc(config.text) + '</div>';

  if (Array.isArray(config.rewardRows) && config.rewardRows.length) {
    h += '    <div class="dungeon-summary-rewards">';
    config.rewardRows.forEach(function (row) {
      h += '      <div class="dungeon-summary-row"><span>' + esc(row.label) + '</span><span>' + esc(row.value) + '</span></div>';
    });
    h += '    </div>';
  }

  h += '    <div class="dungeon-story-actions">';
  h += '      <button class="settings-btn primary" type="button" onclick="closeQuestCompletePopup()">' + esc(config.closeLabel || "Fermer") + '</button>';
  if (config.extraActionLabel && config.extraActionOnclick) {
    h += '      <button class="settings-btn" type="button" onclick="' + config.extraActionOnclick + '">' + esc(config.extraActionLabel) + '</button>';
  }
  h += '    </div>';
  h += '  </div>';
  h += '</div>';
  return h;
}
window.buildQuestCompleteHTML = buildQuestCompleteHTML;

// v3.109.0 : bouton « Quête suivante » du popup de fin retiré (décision Seb) — il proposait des quêtes
// masquées par le tableau de missions (aq_forest_scout, depuis supprimée) : c'est le tableau qui guide.
function openQuestCompletePopup(config) {
  applyQuestUnlockSideEffects();
  var host = document.getElementById("adventure-quest-modal-root");
  if (host) host.innerHTML = buildQuestCompleteHTML(config);
}
window.openQuestCompletePopup = openQuestCompletePopup;
window.applyQuestUnlockSideEffects = applyQuestUnlockSideEffects;

/* v3.93.0 : point d'observation pour les récompenses "déblocage de bâtiment" portées par
   des quêtes classiques (AdventureQuestManager, protégé, ne connaît que gold/essence dans
   son reward). Appelé à chaque ouverture du popup de fin générique — vérifie simplement si
   une quête ayant reward.unlockBuildingId vient de passer à "complétée" et, si oui,
   applique le déblocage (idempotent : ProductionManager.unlockBuilding() ne réinitialise
   jamais un bâtiment déjà présent). Ne modifie ni adventure-quest-system.js ni
   combat-engine.js (protégés) — entièrement piloté depuis ce fichier. */
function applyQuestUnlockSideEffects() {
  if (!window.ADVENTURE_QUESTS || !window.ProductionManager) return;
  Object.keys(ADVENTURE_QUESTS).forEach(function (key) {
    var quest = ADVENTURE_QUESTS[key];
    var unlockBuildingId = quest.reward && quest.reward.unlockBuildingId;
    if (!unlockBuildingId) return;
    if (!game.adventureQuestsCompleted || !game.adventureQuestsCompleted[quest.id]) return;

    var flagName = (typeof PRODUCTION_UNLOCK_FLAGS !== "undefined") ? PRODUCTION_UNLOCK_FLAGS[unlockBuildingId] : null;
    if (flagName && game.explorationProgression && !game.explorationProgression[flagName]) {
      game.explorationProgression[flagName] = true;
    }
    ProductionManager.unlockBuilding(unlockBuildingId);
  });
}

function closeQuestCompletePopup() {
  var host = document.getElementById("adventure-quest-modal-root");
  if (host) host.innerHTML = "";
}
window.closeQuestCompletePopup = closeQuestCompletePopup;

function buildHuntLotCompleteHTML(quest) {
  if (!quest) return "";
  var stock = Number((game.resources && game.resources[quest.resourceKey]) || 0);
  var resource = window.WAREHOUSE_RESOURCES ? WAREHOUSE_RESOURCES[quest.resourceKey] : null;

  return buildQuestCompleteHTML({
    icon: quest.icon || "🏹",
    title: "Chasse terminée !",
    text: quest.lotSize + " bêtes abattues. Le gibier se fait plus rare pour l\u2019instant — reviens plus tard, ou relance une nouvelle chasse tout de suite.",
    rewardRows: [{ label: (resource ? resource.name : quest.resourceKey) + " en stock", value: formatNumber(stock) }],
    closeLabel: "Fermer",
    extraActionLabel: "Chasser à nouveau",
    extraActionOnclick: "restartHuntQuest(\'" + quest.id + "\')"
  });
}

function openHuntLotComplete(quest) {
  var host = document.getElementById("adventure-quest-modal-root");
  if (host) host.innerHTML = buildHuntLotCompleteHTML(quest);
}

function closeHuntLotComplete() {
  closeQuestCompletePopup();
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
window.buildCompletedQuestCardsHTML = buildCompletedQuestCardsHTML;
window.buildQuestCardsGroupedBySectionHTML = buildQuestCardsGroupedBySectionHTML;
window.buildSceneQuestCompletedDetailHTML = buildSceneQuestCompletedDetailHTML; // v3.124.0 (retrait ancien moteur)

