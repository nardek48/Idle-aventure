"use strict";
/* ui/tutorial-view.js — popup pédagogique par étape Histoire (v3.107.7, décision Seb). Affiché une
   seule fois, à la première arrivée sur l'onglet lié à l'étape courante et acceptée (voir
   step.tutorial dans data/story-quests.js, déclenché depuis switchTab() dans ui/ui-root.js).
   Réutilise le pattern .full-menu-overlay/.dungeon-story-card déjà en place (donjon, exploration). */

var pendingTutorial = null; // { chapterId, tutorial } le temps que la modale est ouverte

/* Aperçu fidèle d'un badge de statut réel (ex. télégraphe de charge), pour montrer au joueur
   exactement ce qu'il verra en combat plutôt que de le décrire seulement en texte. */
function buildTutorialPreviewHTML(kind) {
  if (kind === "charge") {
    return '<div class="enemy-status-icon enemy-status-charge tutorial-preview-badge" title="Charge au prochain tour !"><span class="enemy-status-emoji">💢</span></div>';
  }
  return "";
}

function buildTutorialModalHTML(closeHandlerJs, tutorial) {
  var h = '<div class="full-menu-overlay tutorial-overlay">';
  h += '  <div class="full-menu dungeon-story-card tutorial-card">';
  h += '    <div class="dungeon-story-icon">' + esc(tutorial.icon || "📖") + '</div>';
  h += '    <div class="dungeon-story-title">' + esc(tutorial.title || "") + '</div>';
  h += '    <div class="tutorial-points">';
  (tutorial.points || []).forEach(function (p) {
    h += '<div class="tutorial-point">';
    h += '<span class="tutorial-point-icon">' + esc(p.icon || "") + '</span>';
    h += '<span class="tutorial-point-text">' + esc(p.text || "");
    if (p.preview) h += ' ' + buildTutorialPreviewHTML(p.preview);
    h += '</span>';
    h += '</div>';
  });
  h += '    </div>';
  h += '    <div class="dungeon-story-actions">';
  h += '      <button class="settings-btn primary" type="button" onclick="' + closeHandlerJs + '">Compris</button>';
  h += '    </div>';
  h += '  </div>';
  h += '</div>';
  return h;
}

/* Affiche le popup si cette étape en a un et qu'il n'a jamais été vu. Appelé depuis switchTab(). */
function maybeShowStepTutorial(chapterId, tabName) {
  if (!window.StoryQuestManager) return;
  var step = StoryQuestManager.getCurrentStep(chapterId);
  if (!step || !step.tutorial || step.tutorial.tab !== tabName) return;
  if (!StoryQuestManager.isCurrentStepAccepted(chapterId)) return;
  var st = StoryQuestManager.getState(chapterId);
  if (!st.tutorialsSeen || typeof st.tutorialsSeen !== "object") st.tutorialsSeen = {};
  if (st.tutorialsSeen[step.id]) return;

  pendingTutorial = { chapterId: chapterId, tutorial: step.tutorial };
  var host = document.getElementById("tutorial-modal-root");
  if (host) host.innerHTML = buildTutorialModalHTML("closeTutorialModal('" + esc(chapterId) + "')", step.tutorial);
}
window.maybeShowStepTutorial = maybeShowStepTutorial;

function closeTutorialModal(chapterId) {
  if (window.StoryQuestManager) {
    var step = StoryQuestManager.getCurrentStep(chapterId);
    var st = StoryQuestManager.getState(chapterId);
    if (step && st) {
      if (!st.tutorialsSeen || typeof st.tutorialsSeen !== "object") st.tutorialsSeen = {};
      st.tutorialsSeen[step.id] = true;
    }
  }
  pendingTutorial = null;
  var host = document.getElementById("tutorial-modal-root");
  if (host) host.innerHTML = "";
  if (typeof saveGame === "function") saveGame();
}
window.closeTutorialModal = closeTutorialModal;

/* v3.107.9 : tutoriels GÉNÉRIQUES, pas liés à une étape Histoire (ex. Village/Production,
   accroché à « Les fondations » sortie de la chaîne en v3.107.8). Déclaré dans GENERIC_TUTORIALS
   ci-dessous — même rendu visuel (buildTutorialModalHTML), persistance dans
   game.genericTutorialsSeen (flag par id, indépendant de tout chapitre Histoire). */
var GENERIC_TUTORIALS = {
  village_production: {
    tab: "village",
    // Condition d'affichage : seulement une fois la mission "Les fondations" accessible (La veine
    // instable terminée) — avant, le joueur n'a pas encore vraiment de quoi produire à comprendre.
    condition: function () { return !!(window.MiningManager && MiningManager.isQuestCompleted()); },
    icon: "🌾",
    title: "Village & Production",
    points: [
      { icon: "🌾", text: "Les parcelles produisent une ressource en continu, même hors ligne — mais chaque bâtiment a un stock local limité (« Plein dans Xm »)." },
      { icon: "🎒", text: "Clique sur « Récolter » pour transférer ce stock vers ton Entrepôt, qui a son propre plafond (plus grand)." },
      { icon: "⬆️", text: "Améliorer une parcelle augmente sa vitesse de production et sa capacité de stock local." },
      { icon: "🔨", text: "Les Ateliers (comme la Cuisine de camp) transforment des ressources brutes (ex. viande + eau) en objets utiles (ex. rations) — file d'attente, continue même hors ligne." },
      { icon: "📦", text: "Garde un œil sur ton Entrepôt : une ressource pleine ne se produit plus tant que tu ne l'as pas dépensée ou vendue." }
    ]
  }
};
window.GENERIC_TUTORIALS = GENERIC_TUTORIALS;

function maybeShowGenericTutorial(tabName) {
  if (pendingTutorial) return; // v3.107.12 : ne jamais écraser un popup déjà ouvert (même conteneur DOM)
  var id = Object.keys(GENERIC_TUTORIALS).find(function (key) { return GENERIC_TUTORIALS[key].tab === tabName; });
  if (!id) return;
  var tut = GENERIC_TUTORIALS[id];
  if (typeof tut.condition === "function" && !tut.condition()) return;
  if (!game.genericTutorialsSeen || typeof game.genericTutorialsSeen !== "object") game.genericTutorialsSeen = {};
  if (game.genericTutorialsSeen[id]) return;

  pendingTutorial = { genericId: id, tutorial: tut };
  var host = document.getElementById("tutorial-modal-root");
  if (host) host.innerHTML = buildTutorialModalHTML("closeGenericTutorialModal('" + esc(id) + "')", tut);
}
window.maybeShowGenericTutorial = maybeShowGenericTutorial;

function closeGenericTutorialModal(id) {
  if (!game.genericTutorialsSeen || typeof game.genericTutorialsSeen !== "object") game.genericTutorialsSeen = {};
  game.genericTutorialsSeen[id] = true;
  pendingTutorial = null;
  var host = document.getElementById("tutorial-modal-root");
  if (host) host.innerHTML = "";
  if (typeof saveGame === "function") saveGame();
}
window.closeGenericTutorialModal = closeGenericTutorialModal;

/* v3.111.0 (Lot B) : popups pédagogiques des quêtes tutorielles du Village — même rendu
   (buildTutorialModalHTML), déclaré par quête dans data/village-quests.js (quest.tutorial),
   affiché à la première arrivée sur l'onglet cible pendant que la quête est la courante
   non réclamée. Persistance via VillageQuestManager (explorationProgression.villageQuests). */
function maybeShowVillageQuestTutorial(tabName) {
  if (pendingTutorial) return; // ne jamais écraser un popup déjà ouvert (même conteneur DOM)
  if (!window.VillageQuestManager) return;
  var quest = VillageQuestManager.getCurrentQuest();
  if (!quest || !quest.tutorial || quest.tutorial.tab !== tabName) return;
  if (!VillageQuestManager.isQuestAvailable(quest)) return; // v3.112.0 : chaîne en pause (prérequis)
  if (VillageQuestManager.isTutorialSeen(quest.id)) return;

  pendingTutorial = { villageQuestId: quest.id, tutorial: quest.tutorial };
  var host = document.getElementById("tutorial-modal-root");
  if (host) host.innerHTML = buildTutorialModalHTML("closeVillageQuestTutorialModal('" + esc(quest.id) + "')", quest.tutorial);
}
window.maybeShowVillageQuestTutorial = maybeShowVillageQuestTutorial;

function closeVillageQuestTutorialModal(questId) {
  if (window.VillageQuestManager) VillageQuestManager.markTutorialSeen(questId);
  pendingTutorial = null;
  var host = document.getElementById("tutorial-modal-root");
  if (host) host.innerHTML = "";
}
window.closeVillageQuestTutorialModal = closeVillageQuestTutorialModal;
