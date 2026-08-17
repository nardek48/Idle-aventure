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

/* v3.17 : onglet Quêtes séparé en 2 sous-onglets (Général / Journalières),
   même pattern que la fiche personnage (Héros/Amélioration/Stats) —
   voir buildHerosSubTabBarHTML ci-dessus dans heros-view.js pour la
   référence visuelle copiée ici. */
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

/* v3.29.7 : REFONTE — les boutons Raid/Donjon (décoratif/lien externe)
   sont remplacés par un filtre "Quête active" / "Quête terminée" qui
   unifie questline de déblocage + quêtes d'aventure dans une seule
   liste filtrée. Périmètre confirmé avec Seb : ne couvre PAS les
   quêtes journalières (restent dans leur propre sous-onglet). */
var activeQuestsFilter = "active"; // "active" | "completed"

/* Repliage inline (titre+icône -> détail complet au clic) — état en
   mémoire seulement, pas persisté en sauvegarde (pas nécessaire). */
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

/* Sous-onglet "Général" : questline de déblocage de monde + quêtes
   d'aventure, filtrées Active/Terminée — tout ce qui N'EST PAS
   renouvelé chaque jour. */
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

/* Sous-onglet "Journalières" : la liste des quêtes du jour (voir
   QuestManager, systems/progression-system.js), inchangée par
   rapport à avant — juste déplacée dans son propre sous-onglet. */
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
  // v3.17 : structure en 2 sous-onglets (barre fixée en bas, comme la
  // fiche personnage) — voir note "Layout trap" du projet : ne
  // JAMAIS appliquer .nb-page-frame-fill directement sur
  // .subtab-page-content, toujours un enfant imbriqué (ici
  // .nb-page-frame, imbriqué normalement, pas de risque).
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

/* v3.29.7 : contenu détaillé (étapes + récompense + bouton) d'une
   questline de monde — extrait de l'ancienne buildWorldUnlockQuestSectionHTML
   pour être réutilisable dans la carte repliable générique. */
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

/* v3.29.7 : contenu détaillé (étapes + récompense + actions) d'une
   quête d'aventure — extrait de l'ancienne buildAdventureQuestsSectionHTML
   pour être réutilisable dans la carte repliable générique. */
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
    // Une AUTRE quête est déjà en cours de run — pas de bouton
    // Lancer tant qu'elle n'est pas terminée/abandonnée (un seul
    // run possible à la fois, même règle que le Donjon).
    h += '<div class="map-quest-claimed-label">Termine ta quête en cours d\'abord</div>';
  } else {
    h += '<button class="settings-btn primary map-quest-claim-btn" type="button" onclick="event.stopPropagation(); openAdventureQuestIntro(\'' + quest.id + '\')">Lancer</button>';
  }

  return h;
}

/* v3.29.7 : carte repliable générique — titre+icône seuls au repos,
   détail complet affiché au clic (voir toggleQuestCardExpand). Utilisée
   pour les 2 types de quêtes (monde + aventure) dans les listes
   Active/Terminée. `extraClass` reprend is-claimed/is-running pour le
   liseré visuel déjà existant. */
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

/* v3.29.8 : liste "Quête active" — la prochaine questline de monde non
   terminée (s'il y en a une) + toutes les quêtes d'aventure non
   réclamées (disponibles ou en cours de run). Retourne une liste
   d'entrées {worldId, html} plutôt qu'une chaîne concaténée — le
   groupement par monde est fait par buildQuestCardsGroupedByWorldHTML(). */
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

  return entries;
}

/* v3.29.8 : liste "Quête terminée" — toutes les questlines de monde
   déjà réclamées + toutes les quêtes d'aventure déjà réclamées. Même
   forme {worldId, html} que collectActiveQuestCardEntries(). */
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

/* v3.29.8 : regroupe les entrées {worldId, html} en sections par
   monde, dans l'ordre de WORLDS (Forêt -> Désert -> ... -> Tour).
   Une entrée sans worldId reconnu (ne devrait pas arriver avec les
   données actuelles) atterrit dans une section "Autres" en fin de
   liste plutôt que d'être perdue silencieusement. */
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

  // Monde(s) non reconnu(s) éventuel(s) — filet de sécurité, pas de
  // section visible pour ça normalement.
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

window.updateQuestBadge = updateQuestBadge;
window.getTalentsAvailableCount = getTalentsAvailableCount;
window.getAscensionAvailableCount = getAscensionAvailableCount;
window.buildQuestsHTML = buildQuestsHTML;
window.setQuestsSubTab = setQuestsSubTab;
window.buildActiveQuestCardsHTML = buildActiveQuestCardsHTML;
window.buildCompletedQuestCardsHTML = buildCompletedQuestCardsHTML;

