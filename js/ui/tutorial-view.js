"use strict";
/* ui/tutorial-view.js — popup pédagogique par étape Histoire (v3.107.7, décision Seb). Affiché une
   seule fois, à la première arrivée sur l'onglet lié à l'étape courante et acceptée (voir
   step.tutorial dans data/story-quests.js, déclenché depuis switchTab() dans ui/ui-root.js).
   Réutilise le pattern .full-menu-overlay/.dungeon-story-card déjà en place (donjon, exploration). */

var pendingTutorial = null; // { chapterId, tutorial } le temps que la modale est ouverte

/* Aperçu fidèle d'un badge de statut réel (ex. télégraphe de charge), pour montrer au joueur
   exactement ce qu'il verra en combat plutôt que de le décrire seulement en texte. */
/* v3.263.0 (retour Seb) : l'aperçu reprend le BANDEAU d'alerte du combat (v3.251.0) et son icône
   PNG, lus dans COMBAT_STATES — l'ancien badge à emoji n'existe plus en jeu. */
function buildTutorialPreviewHTML(kind) {
  var def = (window.COMBAT_STATES || {})[kind];
  if (!def) return "";
  return '<span class="cb-alert tutorial-preview-alert">' + renderIconOrEmojiHTML(def.icon, "", def.nom)
    + '<span>' + esc(def.mot || def.nom) + '</span></span>';
}

function buildTutorialModalHTML(closeHandlerJs, tutorial) {
  var h = '<div class="full-menu-overlay tutorial-overlay">';
  h += '  <div class="full-menu dungeon-story-card tutorial-card">';
  h += '    <div class="dungeon-story-icon">' + renderIconOrEmojiHTML(tutorial.icon || "images/Icons/codex/codex_lore.png", "dungeon-story-icon-img", "") + '</div>';
  h += '    <div class="dungeon-story-title">' + esc(tutorial.title || "") + '</div>';
  h += '    <div class="tutorial-points">';
  (tutorial.points || []).forEach(function (p) {
    h += '<div class="tutorial-point">';
    h += '<span class="tutorial-point-icon">' + renderIconOrEmojiHTML(p.icon, "tutorial-point-ico", "") + '</span>';
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
  /* v3.116.0 : accueil Campement — migré depuis forest_01.tutorial (jamais affiché : il exigeait
     l'étape acceptée alors que l'arrivée au Campement précède toujours l'acceptation). Sans
     condition : affiché une seule fois, dès la toute première arrivée (y compris au boot). */
  camp_welcome: {
    tab: "campement",
    icon: "images/Icons/plots/hunting_blind.png",
    title: "Le Campement",
    points: [
      { icon: "images/Icons/plots/hunting_blind.png", text: "Le Campement est ton point de ralliement entre deux expéditions — c'est ici que tu gères tout ce qui n'est pas le combat." },
      { icon: "images/Icons/combat_stats/stat_health.png", text: "Ta santé — hors combat, tu récupères 5 % de tes PV max par minute (jusqu'à 50 % si tu es hors ligne). Suis ta barre de vie et la régénération en bas de l'écran." },
      { icon: "images/Icons/quests/ration_reward.png", text: "Les rations soignent instantanément un % fixe de tes PV (35/60/100 % selon le type) : utile pour repartir vite sans attendre." },
      { icon: "images/Icons/quests/quest_list.png", text: "Le tableau de missions — l'étape d'Histoire en cours (badge doré « Principale ») est toujours en tête. Clique sur « Partir » pour ta prochaine quête : c'est elle qui te mènera au combat avec un vrai objectif." }
    ]
  },
  /* v3.213.1 (lot V-2) : premier plafond d'entraînement. Condition : une
     caractéristique a buté à 10 — le joueur vient de rencontrer le mur, c'est
     le seul moment où l'explication a du sens. */
  village_training: {
    tab: "village",
    condition: function () {
      return !!(window.VILLAGE_BUILDINGS && VILLAGE_BUILDINGS.training
        && typeof VILLAGE_BUILDINGS.training.unlockCheck === "function"
        && VILLAGE_BUILDINGS.training.unlockCheck());
    },
    icon: "images/Icons/combat_stats/stat_critical.png",
    title: "Le Terrain d'entraînement",
    points: [
      { icon: "🚧", text: "Tes caractéristiques butent à 10 : c'est la limite de l'entraînement de fortune du campement. Pour aller plus loin, il faut un vrai terrain." },
      { icon: "images/Icons/workshops/masonry.png", text: "Le Terrain se bâtit ici, au Village, comme l'Atelier : des matériaux, puis un chantier qui prend un peu de temps." },
      { icon: "images/Icons/combat_stats/stat_critical.png", text: "Chaque niveau du Terrain ouvre 10 niveaux de plus sur CHACUNE des cinq caractéristiques — jamais un total à répartir." },
      { icon: "images/Icons/gold_icon.png", text: "L'entraînement lui-même se paie toujours en or, dans Personnage → Stats. Le Terrain décide jusqu'où tu peux monter, pas combien ça coûte." }
    ]
  },
  village_production: {
    tab: "village",
    // Condition d'affichage : seulement une fois la mission "Les fondations" accessible (La veine
    // instable terminée) — avant, le joueur n'a pas encore vraiment de quoi produire à comprendre.
    condition: function () { return !!(game.explorationProgression && (game.explorationProgression.unstableVeinDiscoveryCompleted || game.explorationProgression.quarryUnlocked)); }, // v3.124.0 (retrait ancien moteur) : lecture directe du flag, sans MiningManager
    icon: "images/Icons/scene/scene_harvest.png",
    title: "Village & Production",
    points: [
      { icon: "images/Icons/scene/scene_harvest.png", text: "Les parcelles produisent une ressource en continu, même hors ligne — mais chaque bâtiment a un stock local limité (« Plein dans Xm »)." },
      { icon: "images/Icons/subtabs/inventory.png", text: "Clique sur « Récolter » pour transférer ce stock vers ton Entrepôt, qui a son propre plafond (plus grand)." },
      { icon: "images/Icons/system/upgrade.png", text: "Améliorer une parcelle augmente sa vitesse de production et sa capacité de stock local." },
      { icon: "images/Icons/quests/mission_construction.png", text: "Les Ateliers (comme la Cuisine de camp) transforment des ressources brutes (ex. viande + eau) en objets utiles (ex. rations) — file d'attente, continue même hors ligne." },
      { icon: "images/Icons/system/warehouse_supplies.png", text: "Garde un œil sur ton Entrepôt : une ressource pleine ne se produit plus tant que tu ne l'as pas dépensée ou vendue." }
    ]
  },

  /* v3.211.0 : aide du Grimoire. Déclarée ICI et pas dans grimoire-view.js pour une
     seule raison — les trois sources du catalogue de Tutoriels (systems/tutorial-catalog-system.js)
     ramassent GENERIC_TUTORIALS tel quel, donc l'écran Tutoriels la reprend sans code
     supplémentaire, et il n'existe qu'UN texte à maintenir pour les deux endroits.
     PAS de champ `tab` : maybeShowGenericTutorial() cherche par onglet, l'absence de tab
     garantit qu'aucun popup ne s'ouvre tout seul en arrivant sur le Grimoire — c'est le
     bouton « ? » qui l'affiche, et lui seul, conformément à la refonte v3.210.0. */
  /* v3.322.0 (O12) : mini-tutoriel du premier niveau de Mémoire, montré à la première
     ouverture de l'écran de Mémoire une fois le niveau 1 atteint. */
  memoire: {
    tab: "ascension",
    condition: function () { return !!(window.MemoryManager && MemoryManager.getLevel() >= 1); },
    icon: "images/Icons/aether_icon.png",
    title: "La Mémoire",
    points: [
      { icon: "images/Icons/aether_icon.png", text: "Ce que tu donnes, l'Aether le retient. Chaque objet offert depuis ton sac et chaque grande victoire remplissent la jauge ; un niveau ouvre un choix." },
      { icon: "images/Icons/system/upgrade.png", text: "Choisis. Une seule amélioration par niveau. L'autre n'est pas perdue : elle reste là." },
      { icon: "images/Icons/system/lock_closed.png", text: "Reprendre a un prix. Changer d'avis coûte de l'Aether, trois fois plus à chaque fois." },
      { icon: "images/Icons/gold_icon.png", text: "Un objet acheté à l'échoppe ne porte aucun souvenir : il ne rend pas d'Aether." }
    ]
  },

  /* v3.334.0 (Évolutions, P9) : patrouilles — à la première visite de l'écran Héros une fois
     un compagnon arrivé. Rejoint le catalogue de tutoriels comme les autres. */
  patrols_intro: {
    tab: "more",
    condition: function () { return !!(window.PatrolManager && PatrolManager.isUnlocked()); },
    icon: "images/Icons/quests/mission_exploration.png",
    title: "Les patrouilles",
    points: [
      { icon: "images/Icons/quests/mission_exploration.png", text: "Un compagnon peut partir en patrouille 2, 4 ou 8 heures vers un secteur libéré de la carte, même quand tu ne joues pas." },
      { icon: "images/Icons/resources/wood_icon.png", text: "Il rapporte les matériaux du secteur, un peu d'or, parfois de quoi faire des rations — et une petite histoire." },
      { icon: "images/Icons/system/hourglass_waiting.png", text: "Pendant ce temps, il ne combat pas avec toi. Tu peux le rappeler quand tu veux : il rapporte ce qu'il a déjà trouvé." },
      { icon: "images/Icons/system/check_valid.png", text: "Aucun risque : une patrouille revient toujours. Réglage sur la fiche du compagnon (Héros › Compagnons)." }
    ]
  },
  grimoire_rules: {
    icon: "images/Icons/codex/codex_lore.png",
    title: "Le Grimoire de tactiques",
    points: [
      { icon: "images/Icons/codex/codex_lore.png", text: "Le Grimoire programme ton combat automatique : si une situation se présente, ton héros joue l'action que tu as choisie en priorité." },
      { icon: "🔢", text: "Les règles sont lues dans l'ordre, de haut en bas. La première qui s'applique l'emporte." },
      { icon: "images/Icons/combat_stats/stat_speed.png", text: "Une action marquée « ⚡ Contre » annule complètement l'attaque adverse. C'est le meilleur appariement possible pour cette situation." },
      { icon: "images/Icons/system/ascension.png", text: "S'il n'y a aucune règle applicable, ton héros continue de se battre normalement — le Grimoire s'ajoute au comportement automatique, il ne le remplace pas." },
      { icon: "images/Icons/system/lock_closed.png", text: "En combat, ton héros met de côté un peu de ressource pour garantir ton contre le plus prioritaire : il jouera moins d'actions coûteuses en attendant." },
      { icon: "images/Icons/quests/quest_resources.png", text: "De nouvelles règles se débloquent en atteignant de nouveaux mondes pour la première fois." }
    ]
  }
};
window.GENERIC_TUTORIALS = GENERIC_TUTORIALS;

function maybeShowGenericTutorial(tabName) {
  if (pendingTutorial) return; // v3.107.12 : ne jamais écraser un popup déjà ouvert (même conteneur DOM)
  if (!game.genericTutorialsSeen || typeof game.genericTutorialsSeen !== "object") game.genericTutorialsSeen = {};

  /* v3.213.1 : un onglet peut porter PLUSIEURS tutoriels (le Village en a deux
     depuis le Terrain d'entraînement). On prend le premier candidat non vu
     dont la condition est remplie, au lieu du premier déclaré — sinon un
     tutoriel déjà vu masquerait définitivement les suivants. */
  var id = Object.keys(GENERIC_TUTORIALS).find(function (key) {
    var t = GENERIC_TUTORIALS[key];
    if (t.tab !== tabName) return false;
    if (game.genericTutorialsSeen[key]) return false;
    if (typeof t.condition === "function" && !t.condition()) return false;
    return true;
  });
  if (!id) return;
  var tut = GENERIC_TUTORIALS[id];

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
