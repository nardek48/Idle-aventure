"use strict";
/* ui/quests-view.js — écran Quêtes : badge agrégé (Menu), sous-onglets Général/Journalières, filtre Active/Terminée,
   4 catégories repliables (Histoire/Ressources/Aventure/Expéditions) unifiant questlines de monde + quêtes d'aventure
   + chasses, chaque catégorie groupée par monde en cartes repliables. Détail : COMMENTAIRES_ORIGINAUX.md */

function getTalentsAvailableCount() {
  // v3.327.0 : un talent achetable maintenant (points, plafond d'acte et règles de l'arbre)
  return (window.TalentManager && TalentManager.hasAffordable()) ? 1 : 0;
}

/* v3.320.0 (décision Seb) : pastille du bouton Menu retirée — elle additionnait des
   destinations sorties du menu (talents, ascension, donjon, Histoire). Gardée vide : 4 fichiers l'appellent. */
function updateQuestBadge() {}

/* v3.116.0 (Lot B) : onglets de catégorie en tête du tableau (Histoire/Secondaires/Chasse/Aventure),
   mapping par sourceKind des missions du MissionBoard. « Terminées » devient un lien discret. */

var activeQuestsFilter = "active"; // "active" | "completed"
var activeQuestCategory = "histoire"; // histoire | secondaires | chasse | aventure

/* v3.370.0 : libellés traduits à la définition (changer de langue relance le jeu, i18n D2). */
var QUEST_BOARD_CATEGORIES = [
  { key: "histoire", label: _t("Histoire", "catégorie"), icon: "images/Icons/quests/quest_story.png", kinds: ["story"], emptyText: _t("Aucune quête d'histoire pour le moment.") },
  { key: "secondaires", label: _t("Secondaires"), icon: "images/Icons/quests/quest_side.png", kinds: ["village", "workshop", "exploration", "scene"], emptyText: _t("Aucune quête secondaire disponible pour le moment.") }, // v3.122.0 (Lot S2a) : "scene" ajouté (quêtes migrées vers le scene-engine)
  { key: "chasse", label: _t("Chasse", "quête"), icon: "images/Icons/quests/quest_hunt.png", kinds: ["hunt"], emptyText: _t("Aucune chasse disponible pour le moment.") },
  { key: "aventure", label: _t("Aventure"), icon: "images/Icons/quests/quest_adventure.png", kinds: ["adventure", "dungeon"], emptyText: _t("Aucune aventure disponible pour le moment.") }
];

function setQuestCategory(key) {
  activeQuestCategory = key;
  activeQuestsFilter = "active";
  if (typeof renderPanel === "function") renderPanel();
}
window.setQuestCategory = setQuestCategory;

var expandedQuestCardIds = {};
var expandedQuestSectionIds = {}; // v3.89 : cartes-catégories (Histoire/Ressources/Aventure/Expéditions), repliées par défaut

var DIFFICULTY_LABELS = { easy: _t("Facile"), medium: _t("Moyen"), hard: _t("Difficile") };
var DIFFICULTY_COLORS = { easy: "#4ade80", medium: "#f0b429", hard: "#ef4444" };

var QUEST_SECTIONS = [
  { key: "worldexpedition", label: _t("Histoire", "catégorie"), icon: "images/Icons/quests/quest_story.png", emptyText: _t("Aucune questline de monde disponible pour le moment.") },
  { key: "resource", label: _t("Ressources"), icon: "images/Icons/quests/quest_resources.png", emptyText: _t("Aucune quête de ressource disponible pour le moment.") },
  { key: "adventure", label: _t("Aventure"), icon: "images/Icons/quests/quest_adventure.png", emptyText: _t("Aucune quête d'aventure disponible pour le moment.") },
  { key: "expedition", label: _t("Expéditions"), icon: "images/Icons/scene/journey_long.png", emptyText: _t("Aucune quête disponible pour le moment.") }
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

  // v3.401.0 (lot O-1) : onglets du kit (.kseg, rail), icône au-dessus du libellé
  var h = '<div class="kseg is-stack qb-tabs">';
  QUEST_BOARD_CATEGORIES.forEach(function (cat) {
    h += '<button type="button" class="qb-tab' + (activeQuestCategory === cat.key ? ' is-on' : '') + '" onclick="setQuestCategory(\'' + cat.key + '\')">';
    h += renderIconOrEmojiHTML(cat.icon, "qb-tab-icon-img", cat.label);
    h += '<span class="qb-tab-label">' + esc(cat.label) + '</span>';
    if (claimableByCat[cat.key]) h += '<span class="kseg-dot qb-tab-dot"></span>';
    h += '</button>';
  });
  h += '</div>';
  return h;
}

/* Bouton d'action d'une carte du tableau — mêmes verbes que le Campement (campMissionAction). */
function buildQuestBoardActionHTML(m) {
  if (m.claim) return '<button class="settings-btn primary qb-card-btn" type="button" onclick="event.stopPropagation(); campMissionAction(\'' + esc(m.id) + '\', \'claim\')"><img class=ico-inline src=images/Icons/dungeon/dungeon_guaranteed_loot.png> ' + _t("Réclamer") + '</button>';
  if (m.status === "running" || m.status === "accepted") {
    var h = '';
    // v3.117.0 : "accepted" (pas encore lancée) -> Partir ; "running" (déjà en cours) -> Continuer.
    var launchLabel = m.status === "running" ? '<img class="ico-btn" src="images/Icons/quests/continue.png" alt=""> ' + _t("Continuer") : '<img class="ico-btn" src="images/Icons/quests/start_expedition.png" alt=""> ' + _t("Partir");
    if (m.launchLabel) launchLabel = esc(m.launchLabel); // v3.429.2 : verbe propre à la mission (ex. « Décider »)
    if (m.launch) h += '<button class="settings-btn primary qb-card-btn" type="button" onclick="event.stopPropagation(); campMissionAction(\'' + esc(m.id) + '\', \'launch\')">' + launchLabel + '</button>';
    if (m.abandon) h += '<button class="settings-btn danger qb-card-btn" type="button" onclick="event.stopPropagation(); campMissionAction(\'' + esc(m.id) + '\', \'abandon\')">' + _t("Abandonner") + '</button>';
    return h;
  }
  if (m.accept) return '<button class="settings-btn primary qb-card-btn" type="button" onclick="event.stopPropagation(); campMissionAction(\'' + esc(m.id) + '\', \'accept\')">' + _t("Accepter") + '</button>';
  if (m.status === "locked") return '<span class="qb-card-locked">' + _t("Occupé ailleurs") + '</span>';
  // v3.141.0 (audit Forêt, cap journalier de la Petite Aventure) : sans ce cas, une carte
  // "unavailable" (cap des 3 runs/jour atteint) retombait dans le "" final — ni bouton ni texte,
  // la carte semblait inerte plutôt que clairement indisponible pour aujourd'hui. Réutilise le
  // même habillage visuel que "locked" (qb-card-locked, is-locked sur la carte).
  // v3.366.0 : les places se rechargent une à une — on dit quand revient la prochaine
  if (m.status === "unavailable") return '<span class="qb-card-locked"><img class=ico-inline src=images/Icons/system/hourglass_waiting.png> '
    + (m.isPetiteAventure && window.SceneRunManager ? esc(_t("Dans {d}", { d: SceneRunManager.formatPetiteAventureWait(SceneRunManager.petiteAventureNextInMs()) })) : _t("Revenez demain")) + '</span>';
  return "";
}

/* Carte façon maquette : bannière-icône à gauche, titre + description, chips récompenses, action. */
/* v3.265.0 : carte à mettre en évidence à l'arrivée sur l'écran Quêtes (depuis un bâtiment
   verrouillé de la Production). Consommée par openQuestsAt, qui fait défiler jusqu'à elle. */
var questsHighlightId = null;
function highlightQuestCard(missionId) { questsHighlightId = missionId || null; }
window.highlightQuestCard = highlightQuestCard;

function buildQuestBoardCardHTML(m) {
  var statusCls = m.status === "claimable" || m.status === "ready" ? " is-claimable"
    : (m.status === "running" || m.status === "accepted") ? " is-running"
    // v3.141.0 : "unavailable" (cap journalier PA atteint) même style estompé que "locked" —
    // la carte reste visible et lisible (titre, description, comment ça marche) mais son statut
    // "pas aujourd'hui" saute aux yeux au lieu de ressembler à une mission normale sans action.
    : (m.status === "locked" || m.status === "unavailable") ? " is-locked" : "";
  var h = '<div class="qb-card' + statusCls + (m.isMain ? ' is-main' : '') + (questsHighlightId && questsHighlightId === m.id ? ' is-highlight' : '') + '" data-mission-id="' + esc(m.id) + '">';
  h += '<div class="qb-card-banner qb-banner-' + esc(m.type || "combat") + '">' + renderIconOrEmojiHTML(MissionBoard.typeIcon(m.type), "qb-card-banner-img", _td(m.title)) + '</div>';
  h += '<div class="qb-card-body">';
  h += '<div class="qb-card-title-row"><span class="qb-card-title">' + esc(_td(m.title)) + '</span>';
  if (m.isMain) h += '<span class="quest-badge quest-badge-main">' + _t("Principale") + '</span>';
  h += '</div>';
  var desc = m.blurb ? _td(m.blurb) : (m.objectiveLabel || "");
  if (desc) h += '<div class="qb-card-desc">' + esc(desc) + '</div>';
  var hasStepsDetail = Array.isArray(m.stepsDetail) && m.stepsDetail.length > 0;
  // v3.131.3 : progressLabel masqué ici quand stepsDetail est présent — le détail par étape
  // (juste en dessous) couvre déjà cette info avec plus de contexte, éviter la redondance.
  if ((m.status === "running" || m.status === "accepted") && m.progressLabel && !hasStepsDetail) {
    // v3.234.0 (retour Seb) : même correctif qu'au Campement — le compteur seul
    // ne dit pas ce qu'il faut faire. objectiveLabel le précède quand il existe.
    var ligne = m.objectiveLabel ? (m.objectiveLabel + " \u2014 " + m.progressLabel) : m.progressLabel;
    h += '<div class="qb-card-progress">' + esc(ligne) + '</div>';
  }
  // v3.131.0 : détail des étapes (m.stepsDetail, optionnel, générique — voir _workshopMissions()
  // pour "Les fondations") — visible tant que la mission est acceptée/en cours, pas avant.
  if ((m.status === "running" || m.status === "accepted") && hasStepsDetail) {
    h += '<div class="qb-card-steps">';
    m.stepsDetail.forEach(function (s) {
      var stateCls = s.done ? "is-done" : s.current ? "is-current" : "is-pending";
      var icon = s.done ? "<img class=ico-inline src=images/Icons/system/check_valid.png>" : s.current ? "<img class=ico-inline src=images/Icons/quests/continue.png>" : "○";
      h += '<div class="qb-card-step ' + stateCls + '">';
      h += '<span class="qb-card-step-icon">' + icon + '</span>';
      h += '<span class="qb-card-step-label">' + esc(_td(s.label)) + '</span>';
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
    + (atCap ? '<img class="ico-sys" src="images/Icons/quests/quest_capacity_full.png" alt="">' : '<img class="ico-sys" src="images/Icons/quests/quest_list.png" alt="">') + ' ' + _t("Quêtes actives : {a}/{b}", { a: count, b: cap })
    + '</div>';
}

/* v3.116.0 (Lot B) : vue par catégorie — Histoire garde la chaîne détaillée (buildStoryChainHTML)
   suivie des questlines de monde ; les autres onglets listent leurs missions en cartes bannière. */
function buildQuestsGeneralSubTabHTML() {
  var missions = window.MissionBoard ? MissionBoard.list() : []; // v3.301.0 : filtré sur le monde où tu es
  var h = '';
  h += buildQuestCategoryTabsHTML(missions);
  h += buildActiveQuestCapIndicatorHTML();

  if (activeQuestsFilter === "completed") {
    h += '<div class="qb-completed-bar"><button class="qb-completed-link" type="button" onclick="setQuestsFilter(\'active\')">◂ ' + _t("Retour aux quêtes actives") + '</button></div>';
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

  h += buildOtherWorldQuestsHTML();
  h += '<div class="qb-completed-bar"><button class="qb-completed-link" type="button" onclick="setQuestsFilter(\'completed\')">' + _t("Voir les quêtes terminées") + ' ▸</button></div>';
  return h;
}

/* v3.301.0 (W-2b) : quêtes proposées dans un autre monde, masquées du tableau — dites en une
   ligne par monde, avec le bouton pour y aller. Rien si le voyage est impossible. */
function buildOtherWorldQuestsHTML() {
  if (!window.MissionBoard || typeof MissionBoard.hiddenByWorld !== "function" || !window.WORLDS) return "";
  var hidden = MissionBoard.hiddenByWorld();
  var h = "";
  Object.keys(hidden).forEach(function (worldId) {
    var w = WORLDS.find(function (x) { return x.id === worldId; });
    if (!w) return;
    var n = hidden[worldId];
    var refusal = window.WorldTravel ? WorldTravel.refusalReason(worldId) : _t("Voyage indisponible");
    h += '<div class="qb-other-world">';
    h += '<span class="qb-other-world-text">' + esc(_tn(n, "{n} quête {lieu}", "{n} quêtes {lieu}", { lieu: worldInPrep(WORLDS.indexOf(w)) })) + '</span>';
    if (!refusal) h += '<button class="settings-btn" type="button" onclick="travelToWorldFromUI(\'' + esc(worldId) + '\')">' + _t("Y aller") + '</button>';
    h += '</div>';
  });
  return h;
}
window.buildOtherWorldQuestsHTML = buildOtherWorldQuestsHTML;

/* « dans la Forêt enchantée », « au Désert oublié » — où se trouvent les quêtes masquées. */
/* v3.370.0 : la préposition dépend de la langue : chaque tournure est un texte entier, {w} = nom du monde. */
var WORLD_IN_PREP = [_t("dans la {w}"), _t("au {w}"), _t("dans les {w}"), _t("dans la {w}"), _t("sur la {w}"), _t("dans la {w}")];
function worldInPrep(index) {
  var w = WORLDS[index];
  return w ? I18n.fill(WORLD_IN_PREP[index] || _t("dans {w}"), { w: _td(w.name) }) : "";
}
window.worldInPrep = worldInPrep;

/* Voyage depuis l'interface (écran Quêtes, carte du monde) : refus expliqué, sinon arrivée. */
function travelToWorldFromUI(worldId) {
  if (!window.WorldTravel) return false;
  var refusal = WorldTravel.refusalReason(worldId);
  if (refusal) { if (typeof showToast === "function") showToast(refusal, 1800); return false; }
  var done = WorldTravel.travelTo(worldId);
  if (done) {
    var w = WORLDS[WorldTravel.indexOf(worldId)];
    if (typeof closeWorldPopup === "function") closeWorldPopup();
    if (typeof showToast === "function") showToast(_t("Tu rejoins {w}", { w: w ? _td(w.name) : worldId }), 1600);
    if (typeof renderAll === "function") renderAll();
  }
  return done;
}
window.travelToWorldFromUI = travelToWorldFromUI;

function buildQuestsHTML() {
  var h = '<div class="subtab-page">';
  h += '<div class="subtab-page-content">';
  h += '<div class="nb-page-frame nb-page-frame-fill kframe-page" data-kf-title="images/Icons/quests/quest_story.png|' + _t("Quêtes") + '">';

  h += buildQuestsGeneralSubTabHTML();

  h += '</div>'; // fin .nb-page-frame
  h += '</div>'; // fin .subtab-page-content
  h += '</div>'; // fin .subtab-page
  return h;
}

/* v3.299.0 (W-1c, D5) : questlines de déblocage de monde retirées (getNextLockedWorldIndex,
   buildWorldUnlockQuestDetailHTML, claimWorldQuest). Un monde s'ouvre par une traversée. */

var pendingAdventureQuestId = null;

function buildAdventureQuestIntroHTML(questId) {
  var quest = window.ADVENTURE_QUESTS ? ADVENTURE_QUESTS[questId] : null;
  if (!quest) return "";

  var h = '<div class="full-menu-overlay kwin-veil">';
  h += '  <div class="kwin dungeon-story-card">';
  h += kWinHeadHTML({ icon: renderIconOrEmojiHTML(quest.icon || "images/Icons/quests/quest_story.png", "dungeon-story-icon-img", _td(quest.name)), title: esc(_td(quest.name)) }); // v3.400.0 (F-2)
  h += '    <div class="kwin-body">';
  if (quest.story) h += '    <div class="kwin-quote dungeon-story-text">' + esc(_td(quest.story)) + '</div>';
  if (typeof buildEnemyTraitsCardHTML === "function") h += buildEnemyTraitsCardHTML({ type: "adventure", id: questId }); // v3.378.0
  h += '    </div>';
  h += '    <div class="kwin-foot">';
  h += '      <button class="kbtn" type="button" onclick="closeAdventureQuestIntro()">' + _t("Annuler") + '</button>';
  h += '      <button class="kbtn primary" type="button" onclick="confirmAdventureQuestStart()">' + _t("Commencer") + '</button>';
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
    var desc = String(_td(step.desc || "")).replace("{target}", step.target);

    h += '<div class="map-quest-step' + (done ? " is-done" : "") + '">';
    h += '<div class="map-quest-step-row">';
    h += '<span class="map-quest-step-desc">' + (done ? "<img class=ico-inline src=images/Icons/system/check_valid.png> " : "") + esc(desc) + '</span>';
    h += '<span class="map-quest-step-count">' + esc(progress) + '/' + esc(step.target) + '</span>';
    h += '</div>';
    h += '<div class="map-quest-step-bar"><div class="map-quest-step-fill" style="width:' + pct + '%"></div></div>';
    h += '</div>';
  });

  var reward = quest.reward || {};
  h += '<div class="map-quest-reward">';
  h += '<span class="map-quest-reward-label">' + _t("Récompense") + '</span>';
  h += '<span class="map-quest-reward-value">';
  if (reward.gold) h += esc(_t("{n} or", { n: formatNumber(reward.gold) }));
  h += '</span>';
  h += '</div>';

  if (claimed) {
    h += '<div class="map-quest-claimed-label"><img class=ico-inline src=images/Icons/system/check_valid.png> ' + _t("Terminée") + '</div>';
  } else if (isRunning) {
    h += '<div class="map-quest-run-actions">';
    h += '<button class="settings-btn primary" type="button" onclick="event.stopPropagation(); switchTab(\'combat\')">' + _t("Voir le combat") + '</button>';
    h += '<button class="settings-btn danger" type="button" onclick="event.stopPropagation(); AdventureQuestManager.forfeit(); if (typeof renderPanel === \'function\') renderPanel();">' + _t("Abandonner") + '</button>';
    h += '</div>';
  } else if (runningQuest) {
    h += '<div class="map-quest-claimed-label">' + _t("Termine ta quête en cours d'abord") + '</div>';
  } else {
    h += '<button class="settings-btn primary map-quest-claim-btn" type="button" onclick="event.stopPropagation(); openAdventureQuestIntro(\'' + quest.id + '\')">' + _t("Lancer") + '</button>';
  }

  return h;
}

function buildQuestBadgesHTML(quest) {
  var h = "";
  if (quest.difficulty && DIFFICULTY_LABELS[quest.difficulty]) {
    h += '<span class="quest-badge quest-badge-difficulty" style="color:' + (DIFFICULTY_COLORS[quest.difficulty] || 'inherit') + '">' + esc(DIFFICULTY_LABELS[quest.difficulty]) + '</span>';
  }
  if (quest.category === "main") {
    h += '<span class="quest-badge quest-badge-main">' + _t("Principale") + '</span>';
  } else if (quest.category === "side") {
    h += '<span class="quest-badge quest-badge-side">' + _t("Secondaire") + '</span>';
  }
  return h;
}

function buildCollapsibleQuestCardHTML(cardId, icon, name, detailHTML, extraClass, quest) {
  var expanded = !!expandedQuestCardIds[cardId];
  var h = '<div class="map-quest-card quest-card-collapsible' + (expanded ? ' is-expanded' : '') + (extraClass ? ' ' + extraClass : '') + '">';
  h += '<div class="map-quest-head quest-card-header" onclick="toggleQuestCardExpand(\'' + esc(cardId) + '\')">';
  h += '<span class="map-quest-icon">' + renderIconOrEmojiHTML(icon, "map-quest-icon-img", _td(name)) + '</span>';
  h += '<span class="map-quest-name">' + esc(_td(name)) + '</span>';
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

  if (window.AdventureQuestManager) {
    var quests = AdventureQuestManager.getAllQuests();
    quests.forEach(function (quest) {
      if (!game.adventureQuestsCompleted[quest.id]) return;
      entries.push({
        worldId: quest.worldId,
        section: quest.section || "adventure",
        html: buildCollapsibleQuestCardHTML(
          'adv_' + quest.id,
          quest.icon || "images/Icons/quests/quest_story.png",
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
          quest.icon || "images/Icons/quests/village_quest.png",
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
          template.icon || "images/Icons/quests/quest_adventure.png",
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
    h += '<div class="quest-world-section-title">' + esc(_td(world.name)) + '</div>';
    h += cards.join("");
    h += '</div>';
    delete byWorld[world.id];
  });

  Object.keys(byWorld).forEach(function (key) {
    h += '<div class="quest-world-section">';
    h += '<div class="quest-world-section-title">' + _t("Autres") + '</div>';
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
  if (reward.gold) parts.push(_t("{n} or", { n: formatNumber(reward.gold) }));
  if (reward.healingPotion) {
    var potion = (window.PotionManager && typeof PotionManager.getHealingPotion === "function") ? PotionManager.getHealingPotion(reward.healingPotion.id) : null;
    parts.push((reward.healingPotion.count || 1) + " " + (potion ? _td(potion.name) : _t("potion")));
  }
  if (reward.resources && typeof reward.resources === "object") {
    Object.keys(reward.resources).forEach(function (key) {
      var def = (window.WAREHOUSE_RESOURCES || {})[key];
      parts.push(formatNumber(reward.resources[key]) + " " + (def ? _td(def.name) : key));
    });
  }
  if (reward.equipmentRarity) parts.push(_tn(reward.equipmentCount || 1, "{n} objet {r}", "{n} objets {r}", { r: _td((window.RARITY_LABELS || {})[reward.equipmentRarity] || reward.equipmentRarity) }));
  return parts.join(" · ") || "—";
}

function buildStoryStepUnlockText(step) {
  var labels = window.STORY_TAB_LABELS || {};
  return (step.unlockTabs || []).map(function (t) { return labels[t] ? _td(labels[t]) : t; }).join(", ");
}

function buildStoryClaimedStepHTML(chapterId, step, index) {
  var cardId = "story_" + step.id;
  var expanded = !!expandedQuestCardIds[cardId];
  var h = '<div class="story-step story-step-claimed' + (expanded ? ' is-expanded' : '') + '" onclick="toggleQuestCardExpand(\'' + esc(cardId) + '\')">';
  h += '<div class="story-step-row"><span class="story-step-num"><img class=ico-inline src=images/Icons/system/check_valid.png> ' + (index + 1) + '</span><span class="story-step-title">' + esc(_td(step.title)) + '</span><span class="quest-card-chevron">' + (expanded ? '▾' : '▸') + '</span></div>';
  if (expanded) h += '<div class="story-step-text">' + esc(_td(step.narrative.completion)) + '</div>';
  h += '</div>';
  return h;
}

/* v3.197.0 (passe de ton, bible B §2.1/§4.7) : rendu d'un dialogue d'anciens attaché à une étape
   d'histoire (step.narrative.dialogue, facultatif — tableau de { who, text }). who = nom de
   l'ancien ; who null = didascalie du narrateur (ex. « Aldric ne dit rien. »). Partagé entre
   l'étape courante (ci-dessous) et le bloc « Les braises » du Campement (camp-view.js). Les
   étapes sans dialogue ne changent pas. */
function buildStoryDialogueHTML(step) {
  var lines = step && step.narrative && step.narrative.dialogue;
  if (!lines || !lines.length) return "";
  var h = '<div class="story-dialogue">';
  lines.forEach(function (line) {
    if (!line) return;
    if (line.who) {
      h += '<div class="story-dialogue-line"><span class="story-dialogue-who">' + esc(_td(line.who)) + '</span><span class="story-dialogue-text">' + esc(_td(line.text || "")) + '</span></div>';
    } else {
      h += '<div class="story-dialogue-line story-dialogue-aside">' + esc(_td(line.text || "")) + '</div>';
    }
  });
  h += '</div>';
  return h;
}
window.buildStoryDialogueHTML = buildStoryDialogueHTML;

function buildStoryCurrentStepHTML(chapterId, chapter, step, index) {
  var accepted = StoryQuestManager.isCurrentStepAccepted(chapterId);
  var ready = StoryQuestManager.isCurrentStepReady(chapterId);
  var unlockText = buildStoryStepUnlockText(step);

  var h = '<div class="story-step story-step-current' + (ready ? ' is-ready' : accepted ? ' is-accepted' : '') + '">';
  if (step.act) h += '<div class="story-step-act">' + esc(_td(step.act)) + '</div>';
  h += '<div class="story-step-row"><span class="story-step-num">' + (index + 1) + '/' + chapter.steps.length + '</span><span class="story-step-title">' + esc(_td(step.title)) + '</span><span class="quest-badge quest-badge-main">' + _t("Principale") + '</span></div>';
  h += '<div class="story-step-text">' + esc(_td(step.narrative.objective)) + '</div>';
  if (accepted) h += buildStoryDialogueHTML(step); // v3.197.0 : dialogue une fois l'étape acceptée

  h += '<div class="map-quest-step">';
  h += '<div class="map-quest-step-row"><span class="map-quest-step-desc">' + (ready ? "<img class=ico-inline src=images/Icons/system/check_valid.png> " : "") + esc(_td(step.objectiveLabel || "")) + '</span></div>';
  var progressText = accepted ? step.progress(game) : "";
  if (progressText) h += '<div class="story-step-progress">' + esc(progressText) + '</div>';
  h += '</div>';

  if (unlockText) h += '<div class="story-step-unlock"><img class=ico-inline src=images/Icons/system/lock_open.png> ' + esc(_t("Débloque : {x}", { x: unlockText })) + '</div>';
  h += '<div class="map-quest-reward"><span class="map-quest-reward-label">' + _t("Récompense") + '</span><span class="map-quest-reward-value">' + esc(buildStoryStepRewardText(step.reward)) + '</span></div>';

  h += '<div class="story-step-actions">';
  if (!accepted) {
    h += '<button class="settings-btn primary" type="button" onclick="StoryQuestManager.acceptStep(\'' + esc(chapterId) + '\')">' + _t("Accepter") + '</button>';
  } else if (ready) {
    h += '<button class="settings-btn primary" type="button" onclick="StoryQuestManager.claimStep(\'' + esc(chapterId) + '\')"><img class=ico-inline src=images/Icons/dungeon/dungeon_guaranteed_loot.png> ' + _t("Réclamer") + '</button>';
  } else {
    // v3.311.0 : choix posé sur la carte d'étape (ex. la voie de Maddoc), avant tout le reste
    var cardChoice = (typeof storyPendingCardChoice === "function") ? storyPendingCardChoice(chapterId) : null;
    if (cardChoice) h += '<button class="settings-btn primary" type="button" onclick="openStoryChoiceModal(\'' + esc(chapterId) + '\')">' + esc(cardChoice.choice.buttonLabel ? _td(cardChoice.choice.buttonLabel) : _t("Choisir")) + '</button>';
    // v3.310.0 : offrande faite depuis la carte d'étape (step.offeringUi.where === "story")
    var offer = StoryQuestManager.getOfferingInfo(chapterId, "story");
    if (offer) {
      h += '<button class="settings-btn primary" type="button"' + (offer.canOffer ? ' onclick="StoryQuestManager.offerToEmbers(\'' + esc(chapterId) + '\')"' : ' disabled') + '>' + esc(_td(offer.step.offeringUi.buttonLabel)) + '</button>';
      if (!offer.canOffer) h += '<div class="story-step-progress">' + esc(_td(offer.step.offeringUi.lackToast)) + '</div>';
    }
    if (step.linkTo && !(offer && offer.canOffer)) {
      h += '<button class="settings-btn" type="button" onclick="StoryQuestManager.goToLink(\'' + esc(chapterId) + '\')"><img class=ico-inline src=images/Icons/system/forward.png> ' + esc(step.linkTo.label ? _td(step.linkTo.label) : _t("Aller à la quête")) + '</button>';
    }
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
    if (!StoryQuestManager.isChapterOpen(chapterId)) return; // v3.297.0 : chapitre suivant pas encore ouvert

    var claimed = chapter.steps.filter(function (s) { return !!st.claimedSteps[s.id]; });
    var current = StoryQuestManager.getCurrentStep(chapterId);
    var completedMode = activeQuestsFilter === "completed";
    if (completedMode && !claimed.length) return;

    h += '<div class="story-chain">';
    h += '<div class="story-chain-head"><span class="story-chain-icon">' + renderIconOrEmojiHTML(chapter.icon || "images/Icons/quests/quest_story.png", "story-chain-ico", "") + '</span><span class="story-chain-title">' + esc(_td(chapter.title)) + '</span><span class="story-chain-progress">' + claimed.length + '/' + chapter.steps.length + '</span></div>';
    if (chapter.subtitle) h += '<div class="story-chain-sub">' + esc(_td(chapter.subtitle)) + '</div>';

    if (completedMode) {
      claimed.forEach(function (step) { h += buildStoryClaimedStepHTML(chapterId, step, chapter.steps.indexOf(step)); });
    } else {
      if (claimed.length) {
        // Étapes passées derrière une seule ligne repliable (jusqu'à 14 lignes sinon).
        var listId = "story_claimed_" + chapterId;
        var listOpen = !!expandedQuestCardIds[listId];
        h += '<div class="story-claimed-toggle" onclick="toggleQuestCardExpand(\'' + esc(listId) + '\')"><span><img class=ico-inline src=images/Icons/system/check_valid.png> ' + _tn(claimed.length, "{n} étape terminée", "{n} étapes terminées") + '</span><span class="quest-card-chevron">' + (listOpen ? '▾' : '▸') + '</span></div>';
        if (listOpen) {
          h += '<div class="story-claimed-list">';
          claimed.forEach(function (step) { h += buildStoryClaimedStepHTML(chapterId, step, chapter.steps.indexOf(step)); });
          h += '</div>';
        }
      }
      if (current) {
        h += buildStoryCurrentStepHTML(chapterId, chapter, current, st.currentStep);
      } else {
        h += '<div class="story-step story-step-end">' + (StoryQuestManager.isChapterCompleted(chapterId) ? (chapter.endText ? _td(chapter.endText) : _t("Chapitre terminé.")) : _t("La suite de l'histoire arrive bientôt…")) + '</div>';
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
  // v3.265.0 : défile jusqu'à la carte demandée, puis oublie la demande (la mise en évidence
  // disparaît au rendu suivant).
  if (questsHighlightId && typeof document !== "undefined" && document.querySelector) {
    var target = document.querySelector('[data-mission-id="' + questsHighlightId + '"]');
    if (target && target.scrollIntoView) target.scrollIntoView({ block: "center", behavior: "smooth" });
  }
  questsHighlightId = null;
}
window.buildStoryChainHTML = buildStoryChainHTML;
window.openQuestsAt = openQuestsAt;

/* v3.111.0 (Lot B) : détail d'une quête tutorielle du Village réclamée — narratif de
   conclusion + récompense (le suivi de la quête courante vit au tableau de missions). */
function buildVillageQuestDetailHTML(quest) {
  var h = '';
  h += '<div class="map-quest-step">';
  h += '<div class="map-quest-step-row">';
  h += '<span class="map-quest-step-desc">' + esc(_td((quest.narrative && quest.narrative.completion) || quest.objectiveLabel || '')) + '</span>';
  h += '</div>';
  h += '</div>';

  var reward = quest.reward || {};
  var parts = [];
  if (reward.gold) parts.push(_t("{n} or", { n: formatNumber(reward.gold) }));
  if (reward.resources && typeof reward.resources === 'object') {
    Object.keys(reward.resources).forEach(function (key) {
      var def = (window.WAREHOUSE_RESOURCES || {})[key];
      parts.push(formatNumber(reward.resources[key]) + ' ' + (def ? _td(def.name) : key));
    });
  }
  h += '<div class="map-quest-reward">';
  h += '<span class="map-quest-reward-label">' + _t("Récompense") + '</span>';
  h += '<span class="map-quest-reward-value">' + esc(parts.join(' · ') || '—') + '</span>';
  h += '</div>';

  h += '<div class="map-quest-claimed-label"><img class=ico-inline src=images/Icons/system/check_valid.png> ' + _t("Terminée") + '</div>';
  return h;
}

function buildSceneQuestCompletedDetailHTML(template) {
  var h = '';
  h += '<div class="map-quest-step">';
  h += '<div class="map-quest-step-row">';
  h += '<span class="map-quest-step-desc">' + esc(_td(template.title)) + '</span>';
  h += '</div>';
  h += '</div>';

  var resDef = (window.WAREHOUSE_RESOURCES || {})[template.lootResource];
  h += '<div class="map-quest-reward">';
  h += '<span class="map-quest-reward-label">' + _t("Ressource") + '</span>';
  h += '<span class="map-quest-reward-value">' + esc((resDef && resDef.name) ? _td(resDef.name) : template.lootResource) + '</span>';
  h += '</div>';

  h += '<div class="map-quest-claimed-label"><img class=ico-inline src=images/Icons/system/check_valid.png> ' + _t("Terminée") + '</div>';
  return h;
}

function buildCompletedQuestCardsHTML() {
  return buildQuestCardsGroupedBySectionHTML(collectCompletedQuestCardEntries());
}

var pendingHuntQuestId = null;

function buildHuntQuestIntroHTML(questId) {
  var quest = window.HUNT_QUESTS ? HUNT_QUESTS[questId] : null;
  if (!quest) return "";

  var h = '<div class="full-menu-overlay kwin-veil">';
  h += '  <div class="kwin dungeon-story-card">';
  h += kWinHeadHTML({ icon: renderIconOrEmojiHTML(quest.icon || "images/Icons/classes/class_ranger.png", "dungeon-story-icon-img", _td(quest.name)), title: esc(_td(quest.name)) }); // v3.400.0 (F-2)
  h += '    <div class="kwin-body">';
  if (quest.story) h += '    <div class="kwin-quote dungeon-story-text">' + esc(_td(quest.story)) + '</div>';
  if (window.ProvisionsManager) h += ProvisionsManager.buildLineHTML("hunt", quest); // v3.330.1 : vivres de sortie
  if (typeof buildEnemyTraitsCardHTML === "function") h += buildEnemyTraitsCardHTML({ type: "hunt", id: questId }); // v3.378.0
  h += '    </div>';
  h += '    <div class="kwin-foot">';
  h += '      <button class="kbtn" type="button" onclick="closeHuntQuestIntro()">' + _t("Annuler") + '</button>';
  h += '      <button class="kbtn primary" type="button" onclick="confirmHuntQuestStart()">' + _t("Commencer") + '</button>';
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

  var h = '<div class="full-menu-overlay kwin-veil">';
  h += '  <div class="kwin dungeon-story-card is-success">';
  // v3.370.0 : titre et texte peuvent venir d'un fichier protégé (adventure-quest-system.js) : traduits ici
  h += kWinHeadHTML({ icon: renderIconOrEmojiHTML(config.icon || "images/Icons/quests/quest_story.png", "dungeon-story-icon-img", _td(config.title || "")),
    title: esc(config.title ? _td(config.title) : _t("Quête terminée !")), sub: config.title ? _t("Quête terminée !") : "" }); // v3.400.0 (F-2)
  h += '    <div class="kwin-body">';
  if (config.text) h += '    <div class="kwin-quote dungeon-story-text">' + esc(_td(config.text)) + '</div>';
  // v3.297.0 (W-1a) : dialogue de complétion d'une étape d'Histoire (narrative.completionDialogue)
  if (Array.isArray(config.dialogue) && config.dialogue.length) h += buildStoryDialogueHTML({ narrative: { dialogue: config.dialogue } });

  if (Array.isArray(config.rewardRows) && config.rewardRows.length) {
    h += '    <div class="dungeon-summary-rewards">';
    config.rewardRows.forEach(function (row) {
      h += '      <div class="dungeon-summary-row"><span>' + esc(_td(row.label)) + '</span><span>' + esc(_td(row.value)) + '</span></div>';
    });
    h += '    </div>';
  }

  h += '    </div>';
  h += '    <div class="kwin-foot">';
  // v3.208.0 (bug Seb) : le bouton de fermeture était câblé en dur sur closeQuestCompletePopup(),
  // qui vide la modale sans toucher à la navigation — après une chasse, le joueur restait donc sur
  // l'écran Combat. config.closeOnclick permet à l'appelant de router la fermeture (voir les chasses).
  h += '      <button class="kbtn primary" type="button" onclick="' + (config.closeOnclick || "closeQuestCompletePopup()") + '">' + esc(config.closeLabel ? _td(config.closeLabel) : _t("Continuer")) + '</button>';
  if (config.extraActionLabel && config.extraActionOnclick) {
    h += '      <button class="kbtn" type="button" onclick="' + config.extraActionOnclick + '">' + esc(_td(config.extraActionLabel)) + '</button>';
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
   des quêtes classiques (AdventureQuestManager, protégé, ne connaît que l'or dans
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

/* v3.412.0 (retour Seb) : la fenêtre de fin de chasse ou de battue dit ce que le lot a rapporté,
   à partir du bilan de sortie (game.lastSortieSummary.kept) : l'or gagné (ramassé + prime de
   battue), puis chaque ressource et les objets. Avant, une battue (pas de ressource) affichait
   « {x} en stock · 0 ». */
function buildHuntLotRewardRows(quest) {
  var sum = game.lastSortieSummary;
  // Le bilan ne compte que s'il vient bien de cette chasse (sinon il resterait celui d'une sortie précédente).
  var kept = (sum && sum.context === "hunt" && sum.outcome === "success" && sum.kept) || {};
  var rows = [];
  var gold = Number(kept.gold || 0) + Number(quest.rewardGold || 0);
  if (gold > 0) rows.push({ label: _t("Or gagné"), value: "+" + formatNumber(gold) + (quest.rewardGold ? " " + _t("(dont {n} de prime)", { n: formatNumber(quest.rewardGold) }) : "") });
  var res = kept.resources || {};
  Object.keys(res).forEach(function (key) {
    var n = Number(res[key] || 0);
    if (n <= 0) return;
    var def = (window.WAREHOUSE_RESOURCES || {})[key];
    rows.push({ label: def ? _td(def.name) : key, value: "+" + formatNumber(n) });
  });
  var items = Array.isArray(kept.items) ? kept.items.length : 0;
  if (items > 0) rows.push({ label: _t("Objets trouvés"), value: "+" + formatNumber(items) });
  if (!rows.length) rows.push({ label: _t("Butin"), value: _t("rien cette fois") });
  return rows;
}

function buildHuntLotCompleteHTML(quest) {
  if (!quest) return "";
  var battue = !!quest.rewardGold && !quest.resourceKey;
  return buildQuestCompleteHTML({
    icon: quest.icon || "images/Icons/classes/class_ranger.png",
    title: battue ? _t("Battue terminée !") : _t("Chasse terminée !"),
    text: battue
      ? _t("{n} ennemis vaincus. La prime est à toi — relance une battue quand tu veux.", { n: quest.lotSize })
      : _t("{n} bêtes abattues. Le gibier se fait plus rare pour l’instant — reviens plus tard, ou relance une nouvelle chasse tout de suite.", { n: quest.lotSize }),
    rewardRows: buildHuntLotRewardRows(quest),
    closeLabel: _t("Fermer"),
    closeOnclick: "closeHuntLotComplete()", // v3.208.0 : ramène au Campement (le lot est fini, plus rien à faire en Combat)
    extraActionLabel: battue ? _t("Nouvelle battue") : _t("Chasser à nouveau"),
    extraActionOnclick: "restartHuntQuest(\'" + quest.id + "\')"
  });
}

function openHuntLotComplete(quest) {
  var host = document.getElementById("adventure-quest-modal-root");
  if (host) host.innerHTML = buildHuntLotCompleteHTML(quest);
}

/* v3.208.0 : fin d'un lot de chasse/battue = retour au Campement. Le joueur est resté sur
   l'onglet Combat depuis HuntQuestManager.start() ; sans ce switchTab il retombait sur un
   combat libre qu'il n'a pas demandé. « Chasser à nouveau » passe par restartHuntQuest(),
   qui rebascule seul vers Combat via HuntQuestManager.start(). */
function closeHuntLotComplete(backToCamp) {
  closeQuestCompletePopup();
  if (backToCamp !== false && typeof switchTab === "function") switchTab("campement");
}

function restartHuntQuest(questId) {
  closeHuntLotComplete(false);
  if (questId && window.HuntQuestManager) HuntQuestManager.start(questId);
}

window.openHuntLotComplete = openHuntLotComplete;
window.closeHuntLotComplete = closeHuntLotComplete;
window.restartHuntQuest = restartHuntQuest;
window.buildHuntLotCompleteHTML = buildHuntLotCompleteHTML;

window.openHuntQuestIntro = openHuntQuestIntro;
window.closeHuntQuestIntro = closeHuntQuestIntro;
window.confirmHuntQuestStart = confirmHuntQuestStart;

window.updateQuestBadge = updateQuestBadge;
window.getTalentsAvailableCount = getTalentsAvailableCount;
window.buildQuestsHTML = buildQuestsHTML;
window.buildCompletedQuestCardsHTML = buildCompletedQuestCardsHTML;
window.buildQuestCardsGroupedBySectionHTML = buildQuestCardsGroupedBySectionHTML;
window.buildSceneQuestCompletedDetailHTML = buildSceneQuestCompletedDetailHTML; // v3.124.0 (retrait ancien moteur)

