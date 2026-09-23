"use strict";
/* ui/admin-view.js — écran Admin/Debug (dev uniquement) : éditeur rapide de
   stats/ressources + accès direct au bac à sable de combat. Accessible via
   l'onglet caché "admin" (bouton dans Paramètres). N'ajoute aucune logique
   métier : appelle uniquement les points d'écriture déjà en place
   (WarehouseManager, StatsSystem.recalcStats, CombatEngine.killEnemy...). */

function buildAdminHTML() {
  var h = '<div class="admin-panel">';

  // v3.295.0 : diagnostic du bug iPhone « boutons de combat sans réponse » (ui/debug-touch-view.js)
  var debugOn = !!(window.TouchDebug && TouchDebug.isOn());
  h += '<div class="panel-card admin-card">';
  h += '<h3><img class=ico-inline src=images/Icons/system/warning.png> Diagnostic combat</h3>';
  h += '<p class="panel-sub">Affiche en haut de l\'écran ce que reçoit chaque toucher, l\'état du tour et les erreurs. Ne bloque aucun toucher.</p>';
  h += '<div class="admin-quick-row">';
  h += '<button class="settings-btn admin-btn" onclick="TouchDebug.setOn(' + (debugOn ? 'false' : 'true') + '); renderPanel();">' + (debugOn ? 'Désactiver' : 'Activer') + ' le diagnostic tactile</button>';
  h += '<button class="settings-btn admin-btn" onclick="forceLeaveCombat()">Quitter le combat en cours</button>';
  h += '</div>';
  h += '</div>';

  h += '<div class="panel-card admin-card">';
  h += '<h3><img class=ico-inline src=images/Icons/gold_icon.png> Or & Essence</h3>';
  h += adminFieldRow("admin-gold", "Or", game.gold, "adminApplyGold()");
  h += adminFieldRow("admin-essence", "Essence", game.essence, "adminApplyEssence()");
  h += '<div class="admin-quick-row">';
  h += '<button class="settings-btn admin-btn" onclick="adminQuickAdd(\'gold\', 10000)">+10 000 or</button>';
  h += '<button class="settings-btn admin-btn" onclick="adminQuickAdd(\'essence\', 1000)">+1 000 essence</button>';
  h += '</div>';
  h += '</div>';

  h += '<div class="panel-card admin-card">';
  h += '<h3><img class=ico-inline src=images/Icons/system/warehouse_supplies.png> Éclats de donjon</h3>';
  h += adminFieldRow("admin-shards", "Éclats", game.dungeonShards || 0, "adminApplyShards()");
  h += '</div>';

  h += '<div class="panel-card admin-card">';
  h += '<h3><img class=ico-inline src=images/Icons/improvement_icons/power.png> Stats entraînées</h3>';
  h += adminFieldRow("admin-power", "Puissance", game.trainedStats.power, "adminApplyTrainedStat('power')");
  h += adminFieldRow("admin-endurance", "Endurance", game.trainedStats.endurance, "adminApplyTrainedStat('endurance')");
  h += adminFieldRow("admin-celerity", "Célérité", game.trainedStats.celerity, "adminApplyTrainedStat('celerity')");
  h += adminFieldRow("admin-precision", "Précision", game.trainedStats.precision, "adminApplyTrainedStat('precision')");
  h += adminFieldRow("admin-will", "Volonté", game.trainedStats.will, "adminApplyTrainedStat('will')");
  h += '<div class="admin-quick-row">';
  h += '<button class="settings-btn admin-btn" onclick="adminRecalcStats()"><img class=ico-inline src=images/Icons/system/reset.png> Recalculer les stats</button>';
  h += '</div>';
  h += '</div>';

  h += '<div class="panel-card admin-card">';
  h += '<h3><img class=ico-inline src=images/Icons/combat_stats/stat_health.png> PV du héros</h3>';
  h += adminFieldRow("admin-herohp", "PV actuels (max " + Math.floor(game.heroMaxHp) + ")", game.heroHp, "adminApplyHeroHp()");
  h += '<div class="admin-quick-row">';
  h += '<button class="settings-btn admin-btn" onclick="adminHeroHpMax()"><img class=ico-inline src=images/Icons/combat_status/heal_incoming.png> PV au maximum</button>';
  h += '<button class="settings-btn admin-btn" onclick="adminKillEnemy()"><img class=ico-inline src=images/Icons/combat_status/corruption.png> Tuer l\'ennemi affiché</button>';
  h += '</div>';
  h += '</div>';

  h += '<div class="panel-card admin-card">';
  h += '<h3><img class=ico-inline src=images/Icons/quests/quest_resources.png> Monde & cycle</h3>';
  h += '<p class="panel-sub">Monde actuel : ' + (window.WorldManager ? WorldManager.worldIndex : 0) + ' (' + ((window.WorldManager && WorldManager.getWorld() && WorldManager.getWorld().name) || "?") + ')</p>';
  h += adminFieldRow("admin-worldindex", "Index de monde (0–6)", (window.WorldManager ? WorldManager.worldIndex : 0), "adminApplyWorldIndex()", 0, 6);
  h += adminFieldRow("admin-cyclecount", "Nombre de cycles", game.cycleCount || 0, "adminApplyCycleCount()");
  h += '<p class="panel-sub admin-warn">Changer l\'index de monde réinitialise la progression d\'aventure/ennemi du monde (adventureIndex/enemyIndex à 0).</p>';
  h += '</div>';

  h += '<div class="panel-card admin-card">';
  h += '<h3><img class=ico-inline src=images/Icons/subtabs/potions.png> Bac à sable de combat</h3>';
  h += '<p class="panel-sub">Simulateur de rounds sur les vraies données (budgets RPT/RPM, sorties Monte-Carlo, export Markdown) — sans effet sur ta partie.</p>';
  h += '<button class="settings-btn admin-btn" onclick="switchTab(\'combat-sandbox\')"><img class=ico-inline src=images/Icons/subtabs/potions.png> Ouvrir le bac à sable</button>';
  h += '</div>';

  // v3.122.0 (Lot S2a) : expedition_faille (canevas génératif du scene-engine) n'est plus
  // accessible depuis le menu ☰ (décision Seb : l'onglet Expédition sert uniquement à
  // afficher un run en cours, lancé depuis le tableau de missions) — conservé ici comme outil
  // de test/démo du moteur, réserve pour une future feature répétable (Petites Aventures).
  if (window.SceneRunManager && window.SCENE_TEMPLATES && SCENE_TEMPLATES.expedition_faille) {
    h += '<div class="panel-card admin-card">';
    h += '<h3><img class=ico-inline src=images/Icons/scene/scene_cavern.png> Bac à sable d\'expédition</h3>';
    h += '<p class="panel-sub">Canevas génératif du scene-engine (8 profondeurs, push-your-luck) — hors catalogue de quêtes, réserve pour une future feature.</p>';
    h += '<button class="settings-btn admin-btn" onclick="adminStartSandboxExpedition()"><img class=ico-inline src=images/Icons/scene/scene_cavern.png> Lancer l\'expédition sandbox</button>';
    h += '</div>';
  }

  /* v3.279.0 (demande Seb) : relancer n'importe quelle quête de COMBAT pour la tester.
     Les quêtes d'aventure et de chasse ont chacune leur moteur de run ; on remet leur
     progression à zéro avant de lancer, sinon une quête déjà terminée refuserait de
     repartir et une quête entamée reprendrait au milieu. */
  h += buildAdminCombatQuestHTML();

  // v3.324.0 (demande Seb) : raccourcis de test — compagnons, Petites Aventures, Histoire
  h += buildAdminCompanionsHTML();
  h += buildAdminPetiteAventureHTML();
  h += buildAdminStoryHTML();

  h += '<button class="settings-btn admin-btn" onclick="switchTab(\'settings\')"><img class=ico-inline src=images/Icons/system/back.png> Retour aux Paramètres</button>';

  h += '</div>';
  return '<div class="nb-page-frame admin-root kframe-page" data-kf-title="Admin">' + h + '</div>';
}

/* Catalogue des combats relançables : quêtes d'aventure (kill / boss / élite) et quêtes
   de chasse. Les étapes d'Histoire ne sont pas listées — elles n'ont pas de run propre,
   elles s'appuient sur le farm ou sur l'une de ces quêtes. */
function getAdminCombatQuests() {
  var out = [];
  if (window.ADVENTURE_QUESTS) {
    Object.keys(ADVENTURE_QUESTS).forEach(function (id) {
      var q = ADVENTURE_QUESTS[id];
      if (!q) return;
      var monde = (window.WORLDS || []).find(function (w) { return w.id === q.worldId; });
      out.push({
        id: id, kind: "adventure",
        label: (q.name || id) + (monde ? " — " + monde.name : ""),
        groupe: Array.isArray(q.group) ? q.group.length : 1
      });
    });
  }
  if (window.HUNT_QUESTS) {
    Object.keys(HUNT_QUESTS).forEach(function (id) {
      var q = HUNT_QUESTS[id];
      if (!q) return;
      out.push({ id: id, kind: "hunt", label: "🏹 " + (q.name || id), groupe: Array.isArray(q.group) ? q.group.length : 1 });
    });
  }
  out.sort(function (a, b) { return a.label.localeCompare(b.label); });
  return out;
}

function buildAdminCombatQuestHTML() {
  var liste = getAdminCombatQuests();
  if (!liste.length) return "";

  var h = '<div class="panel-card admin-card">';
  h += '<h3><img class=ico-inline src=images/Icons/combat_stats/stat_attack.png> Rejouer un combat</h3>';
  h += '<p class="panel-sub">Relance la quête choisie depuis le début : sa progression est remise à zéro, puis le run démarre. Le nombre entre parenthèses est la taille du groupe ennemi.</p>';
  h += '<select id="admin-combat-quest" class="admin-select">';
  liste.forEach(function (q) {
    h += '<option value="' + esc(q.kind + ":" + q.id) + '">' + esc(q.label)
      + (q.groupe > 1 ? " (groupe de " + q.groupe + ")" : "") + '</option>';
  });
  h += '</select>';
  h += '<button class="settings-btn admin-btn" onclick="adminReplayCombatQuest()"><img class=ico-inline src=images/Icons/system/reset.png> Lancer ce combat</button>';
  h += '</div>';
  return h;
}

function adminReplayCombatQuest() {
  var sel = document.getElementById("admin-combat-quest");
  if (!sel || !sel.value) return;
  var parts = sel.value.split(":");
  var kind = parts[0], id = parts[1];

  /* Un run déjà en cours doit être abandonné, sinon deux moteurs se disputeraient l'ennemi. */
  if (window.AdventureQuestManager && game.adventureQuestRun && game.adventureQuestRun.active
    && typeof AdventureQuestManager.forfeit === "function") AdventureQuestManager.forfeit();
  if (window.HuntQuestManager && game.huntRun && game.huntRun.active
    && typeof HuntQuestManager.stop === "function") HuntQuestManager.stop();

  if (kind === "adventure") {
    var q = (window.ADVENTURE_QUESTS || {})[id];
    if (!q || !window.AdventureQuestManager) return;
    // Remise à zéro : terminée, elle refuserait de repartir ; entamée, elle reprendrait au milieu.
    if (game.adventureQuestsCompleted) delete game.adventureQuestsCompleted[id];
    if (game.adventureQuestProgress) {
      game.adventureQuestProgress[id] = {};
      (q.steps || []).forEach(function (s) { game.adventureQuestProgress[id][s.id] = 0; });
    }
    AdventureQuestManager.start(id);
  } else if (kind === "hunt") {
    if (!window.HuntQuestManager) return;
    HuntQuestManager.start(id);
  }

  if (typeof showToast === "function") showToast("⚔️ Combat relancé", 1400);
  if (typeof saveGame === "function") saveGame();
}

function adminFieldRow(inputId, label, currentValue, onApplyCall, minVal, maxVal) {
  var v = (typeof currentValue === "number" && isFinite(currentValue)) ? Math.floor(currentValue) : 0;
  var attrs = "";
  if (typeof minVal === "number") attrs += ' min="' + minVal + '"';
  if (typeof maxVal === "number") attrs += ' max="' + maxVal + '"';
  var row = '<div class="admin-field-row">';
  row += '<label for="' + inputId + '">' + label + '</label>';
  row += '<input type="number" id="' + inputId + '" class="admin-input" value="' + v + '"' + attrs + '>';
  row += '<button class="settings-btn admin-btn admin-apply-btn" onclick="' + onApplyCall + '">Appliquer</button>';
  row += '</div>';
  return row;
}

function adminReadInt(inputId) {
  var el = document.getElementById(inputId);
  if (!el) return null;
  var n = Math.floor(Number(el.value));
  return isFinite(n) ? n : null;
}

function adminRefresh() {
  saveGame();
  if (typeof renderAll === "function") renderAll();
  if (game.activeTab === "admin" && typeof renderPanel === "function") renderPanel();
}

function adminApplyGold() {
  var n = adminReadInt("admin-gold");
  if (n === null || n < 0) return;
  game.gold = n;
  adminRefresh();
}

function adminApplyEssence() {
  var n = adminReadInt("admin-essence");
  if (n === null || n < 0) return;
  game.essence = n;
  adminRefresh();
}

function adminApplyShards() {
  var n = adminReadInt("admin-shards");
  if (n === null || n < 0) return;
  game.dungeonShards = n;
  adminRefresh();
}

function adminQuickAdd(field, amount) {
  if (field === "gold") game.gold = (game.gold || 0) + amount;
  else if (field === "essence") game.essence = (game.essence || 0) + amount;
  adminRefresh();
}

function adminApplyTrainedStat(statKey) {
  var idMap = { power: "admin-power", endurance: "admin-endurance", celerity: "admin-celerity", precision: "admin-precision", will: "admin-will" };
  var n = adminReadInt(idMap[statKey]);
  if (n === null || n < 0) return;
  game.trainedStats[statKey] = n;
  StatsSystem.recalcStats();
  adminRefresh();
}

function adminRecalcStats() {
  StatsSystem.recalcStats();
  adminRefresh();
}

function adminApplyHeroHp() {
  var n = adminReadInt("admin-herohp");
  if (n === null || n < 0) return;
  game.heroHp = Math.min(n, game.heroMaxHp);
  adminRefresh();
}

function adminHeroHpMax() {
  game.heroHp = game.heroMaxHp;
  adminRefresh();
}

function adminKillEnemy() {
  if (!game.enemy) return;
  CombatEngine.killEnemy();
  adminRefresh();
}

function adminApplyWorldIndex() {
  var n = adminReadInt("admin-worldindex");
  if (n === null || n < 0 || n > 6 || !window.WorldManager || typeof WORLDS === "undefined" || !WORLDS[n]) return;
  WorldManager.worldIndex = n;
  WorldManager.adventureIndex = 0;
  WorldManager.enemyIndex = 0;
  if (typeof WorldManager.markWorldReached === "function") WorldManager.markWorldReached(n);
  if (typeof WorldManager.applyWorldTheme === "function") WorldManager.applyWorldTheme();
  adminRefresh();
}

function adminApplyCycleCount() {
  var n = adminReadInt("admin-cyclecount");
  if (n === null || n < 0) return;
  game.cycleCount = n;
  adminRefresh();
}

/* v3.122.0 (Lot S2a) : lance expedition_faille (scene-engine générique) directement, sans
   passer par le tableau de missions (le canevas n'y figure plus). Réutilise startSceneExpedition()
   de scene-view.js (fixée sur "expedition_faille"). */
function adminStartSandboxExpedition() {
  if (window.SceneRunManager && SceneRunManager.isRunActive()) {
    showToast("Une expédition est déjà en cours", 1600);
    return;
  }
  if (typeof switchTab === "function") switchTab("scene");
  if (typeof startSceneExpedition === "function") startSceneExpedition();
}

window.buildAdminHTML = buildAdminHTML;
window.getAdminCombatQuests = getAdminCombatQuests;
window.buildAdminCombatQuestHTML = buildAdminCombatQuestHTML;
window.adminReplayCombatQuest = adminReplayCombatQuest;
window.adminApplyGold = adminApplyGold;
window.adminApplyEssence = adminApplyEssence;
window.adminApplyShards = adminApplyShards;
window.adminQuickAdd = adminQuickAdd;
window.adminApplyTrainedStat = adminApplyTrainedStat;
window.adminRecalcStats = adminRecalcStats;
window.adminApplyHeroHp = adminApplyHeroHp;
window.adminHeroHpMax = adminHeroHpMax;
window.adminKillEnemy = adminKillEnemy;
window.adminApplyWorldIndex = adminApplyWorldIndex;
window.adminApplyCycleCount = adminApplyCycleCount;
window.adminStartSandboxExpedition = adminStartSandboxExpedition;

/* ================= v3.324.0 (demande Seb) — RACCOURCIS DE TEST =================
   Trois cartes : recruter les compagnons, rendre des Petites Aventures du jour, avancer
   dans l'Histoire. Aucun fichier protégé touché : tout passe par les API existantes. */

/* ---------- Compagnons ---------- */

function buildAdminCompanionsHTML() {
  if (!window.CompanionManager || !window.COMPANIONS_DB) return "";
  var h = '<div class="panel-card admin-card">';
  h += '<h3><img class=ico-inline src=images/Icons/subtabs/hero_abilities.png> Compagnons</h3>';
  var lignes = Object.keys(COMPANIONS_DB).map(function (id) {
    var st = CompanionManager.state(id), def = getCompanionDef(id);
    var etat = st && st.unlocked ? "recruté" + (st.voie ? " (" + COMPANIONS_DB[id].voies[st.voie].label + ")" : "") : "non recruté";
    return esc(def ? def.name : id) + " : " + etat;
  });
  h += '<p class="panel-sub">' + lignes.join(" · ") + '</p>';
  h += '<p class="panel-sub">Recrute les compagnons manquants et ouvre Héros › Compagnons. Une voie sans choix prend la voie par défaut, modifiable ensuite dans sa fiche.</p>';
  h += '<button class="settings-btn admin-btn" onclick="adminRecruitCompanions()"><img class=ico-inline src=images/Icons/subtabs/hero_abilities.png> Recruter les compagnons</button>';
  h += '</div>';
  return h;
}

function adminRecruitCompanions() {
  if (!window.CompanionManager) return;
  var recrues = [];
  Object.keys(COMPANIONS_DB).forEach(function (id) {
    if (CompanionManager.unlock(id)) recrues.push(COMPANIONS_DB[id].name);
    // Compagnon à voies : sans voie, sa fiche resterait en attente du choix de l'étape 8
    var raw = COMPANIONS_DB[id], st = CompanionManager.state(id);
    if (raw.voies && st && !st.voie) CompanionManager.chooseVoie(id, raw.defaultVoie);
  });
  if (!game.unlockedTabs || typeof game.unlockedTabs !== "object") game.unlockedTabs = {};
  game.unlockedTabs.companions = true;
  if (typeof refreshTabBarVisibility === "function") refreshTabBarVisibility();
  showToast(recrues.length ? "🤝 Recrutés : " + recrues.join(", ") : "Déjà tous recrutés", 1600);
  adminRefresh();
}

/* ---------- Petites Aventures ---------- */

/* Le compteur du jour peut passer sous zéro : chaque cran négatif est une tentative de plus
   que le cap. Il repart de lui-même au changement de jour civil (SceneRunManager). */
function buildAdminPetiteAventureHTML() {
  if (!window.SceneRunManager || typeof SceneRunManager.getPetiteAventureCap !== "function") return "";
  var cap = SceneRunManager.getPetiteAventureCap();
  var restantes = cap - SceneRunManager.petiteAventureCountToday();
  var h = '<div class="panel-card admin-card">';
  h += '<h3><img class=ico-inline src=images/Icons/scene/path_easy.png> Petites Aventures</h3>';
  h += '<p class="panel-sub">Tentatives restantes aujourd\'hui : ' + restantes + ' (cap du jour : ' + cap + ')</p>';
  h += '<div class="admin-quick-row">';
  h += '<button class="settings-btn admin-btn" onclick="adminAddPetiteAventure(1)">+1 tentative</button>';
  h += '<button class="settings-btn admin-btn" onclick="adminAddPetiteAventure(5)">+5 tentatives</button>';
  h += '<button class="settings-btn admin-btn" onclick="adminResetPetiteAventure()"><img class=ico-inline src=images/Icons/system/reset.png> Remettre le jour à zéro</button>';
  h += '</div>';
  h += '</div>';
  return h;
}

function adminPetiteAventureState() {
  SceneRunManager.ensureDefaults();
  var pa = game.explorationProgression.petiteAventure, today = SceneRunManager._today();
  if (pa.day !== today) { pa.day = today; pa.count = 0; }
  return pa;
}

function adminAddPetiteAventure(n) {
  if (!window.SceneRunManager) return;
  var pa = adminPetiteAventureState();
  pa.count = Number(pa.count || 0) - Math.max(1, Number(n) || 1);
  showToast("+" + n + " Petite" + (n > 1 ? "s" : "") + " Aventure" + (n > 1 ? "s" : ""), 1200);
  adminRefresh();
}

function adminResetPetiteAventure() {
  if (!window.SceneRunManager) return;
  adminPetiteAventureState().count = 0;
  showToast("Compteur du jour remis à zéro", 1200);
  adminRefresh();
}

/* ---------- Histoire ---------- */

/* Toutes les étapes, chapitres dans l'ordre de STORY_QUESTS (Forêt puis Désert). */
function adminStoryAllSteps() {
  var out = [];
  if (!window.STORY_QUESTS) return out;
  Object.keys(STORY_QUESTS).forEach(function (chapterId) {
    (STORY_QUESTS[chapterId].steps || []).forEach(function (step, idx) {
      out.push({ chapterId: chapterId, idx: idx, step: step });
    });
  });
  return out;
}

/* Position globale de l'étape en cours : la première étape non terminée, tous chapitres
   confondus. -1 si toute l'Histoire livrée est terminée. */
function adminStoryCurrentPos(all) {
  var SQ = StoryQuestManager;
  for (var i = 0; i < all.length; i++) {
    var st = SQ.getState(all[i].chapterId);
    if (st.skipped) continue;
    if (all[i].idx >= st.currentStep) return i;
  }
  return -1;
}

function buildAdminStoryHTML() {
  if (!window.StoryQuestManager || !window.STORY_QUESTS) return "";
  var all = adminStoryAllSteps(), pos = adminStoryCurrentPos(all);
  var h = '<div class="panel-card admin-card">';
  h += '<h3><img class=ico-inline src=images/Icons/camp/campfire.png> Histoire</h3>';
  if (pos < 0) {
    h += '<p class="panel-sub">Toute l\'Histoire livrée est terminée.</p></div>';
    return h;
  }
  var cur = all[pos], accepted = StoryQuestManager.getState(cur.chapterId).accepted;
  h += '<p class="panel-sub">Étape en cours : <strong>' + esc(cur.step.title) + '</strong> (' + esc(cur.step.id) + ', ' + (accepted ? "acceptée" : "pas encore acceptée") + ')</p>';
  h += '<button class="settings-btn admin-btn" onclick="adminValidateStoryStep()"><img class=ico-inline src=images/Icons/dungeon/dungeon_guaranteed_loot.png> Valider l\'étape en cours</button>';

  if (pos < all.length - 1) {
    h += '<select id="admin-story-target" class="admin-select">';
    for (var i = pos + 1; i < all.length; i++) {
      var ch = STORY_QUESTS[all[i].chapterId];
      var monde = (window.WORLDS || []).find(function (w) { return w.id === (ch.worldId || all[i].chapterId); });
      h += '<option value="' + esc(all[i].step.id) + '">' + esc((monde ? monde.name : all[i].chapterId) + " " + (all[i].idx + 1) + " — " + all[i].step.title) + '</option>';
    }
    h += '</select>';
    h += '<button class="settings-btn admin-btn" onclick="adminJumpToStoryStep()"><img class=ico-inline src=images/Icons/system/forward.png> Avancer jusqu\'à cette étape</button>';
  }
  h += '<p class="panel-sub admin-warn">Valider donne la récompense de l\'étape, pose les drapeaux et le monde qu\'elle aurait posés, et prend la première option d\'un choix en attente. Les récompenses des quêtes d\'aventure liées ne sont pas données. On ne peut qu\'avancer.</p>';
  h += '</div>';
  return h;
}

/* Contenu répétable ou partagé que le check lit, et que l'avance forcée doit poser à la
   place du joueur : ce que la suite du jeu relit (monde, donjons, drapeaux, secteurs). */
var ADMIN_STORY_EXTRA = {
  forest_14: function () { adminSetDungeonCleared(1); },
  forest_15: function (st) { st.counters.offeringDone = 1; },
  desert_03: function () { adminSetFlag("outreFilled"); },
  desert_07: function (st) { st.counters.outreGiven = 1; },
  desert_09: function () { adminSetFlag("verreTrempe"); },
  desert_12: function () { adminSetFlag("citeVague5"); },
  desert_15: function () { adminSetDungeonCleared(2); }
};

function adminSetFlag(key) {
  if (!game.explorationProgression) game.explorationProgression = {};
  game.explorationProgression[key] = true;
}

function adminSetDungeonCleared(id) {
  if (!game.dungeonTierCleared || typeof game.dungeonTierCleared !== "object") game.dungeonTierCleared = {};
  game.dungeonTierCleared[id] = true;
}

/* Effets de fin d'un canevas de scène (déblocage, drapeau de réussite, voyage), sans le run. */
function adminApplySceneTemplate(templateId) {
  var t = window.SCENE_TEMPLATES && SCENE_TEMPLATES[templateId];
  if (!t || !window.SceneRunManager) return;
  if (t.unlockOnSuccess) SceneRunManager._applyUnlock(t.unlockOnSuccess);
  if (t.successFlag) adminSetFlag(t.successFlag);
  if (t.travelOnSuccess && window.WorldTravel) WorldTravel.arrive(t.travelOnSuccess.worldId, t.travelOnSuccess.adventureIndex);
}

/* Lit le lien de l'étape (linkTo.cardId) pour poser ce que le contenu lié aurait posé. */
function adminApplyStoryLink(step) {
  var card = step.linkTo && step.linkTo.cardId;
  if (!card) return;
  if (card.indexOf("adv_") === 0) {
    if (!game.adventureQuestsCompleted) game.adventureQuestsCompleted = {};
    game.adventureQuestsCompleted[card.slice(4)] = true;
  } else if (card.indexOf("scene_") === 0) {
    adminApplySceneTemplate(card.slice(6));
  } else if (window.SCENE_TEMPLATES && SCENE_TEMPLATES[card]) {
    adminApplySceneTemplate(card); // ex. petite_aventure_desert
  } else if (card.indexOf("livingmap_") === 0 && card.indexOf(":") > 0 && window.LivingMapManager) {
    var parts = card.slice(10).split(":"), mapId = parts[0], sectorId = parts[1];
    if (!LivingMapManager.isLiberated(mapId, sectorId)) LivingMapManager.setState(mapId, sectorId, "libere", "admin");
    // Premier passage scénarisé du secteur (ex. la descente au Temple)
    var def = LivingMapManager.getSectorDef(mapId, sectorId);
    if (def && def.firstContent && def.firstContent.type === "expedition") adminApplySceneTemplate(def.firstContent.templateId);
  }
}

/* Valide l'étape en cours du premier chapitre actif. quiet : sans popup ni toast (avance
   en série). Renvoie l'id de l'étape validée, ou null. */
function adminForceStoryStep(quiet) {
  var SQ = StoryQuestManager;
  var chapterId = SQ.activeChapterIds()[0];
  var step = chapterId && SQ.getCurrentStep(chapterId);
  if (!step) return null;
  var st = SQ.getState(chapterId);

  // Muet pendant l'avance en série : popups de fin, toasts d'acceptation
  var saved = { popup: window.openQuestCompletePopup, toast: window.showToast };
  if (quiet) { window.openQuestCompletePopup = function () {}; window.showToast = function () {}; }
  var check = step.check, ok = false;
  try {
    if (!st.accepted) SQ.acceptStep(chapterId);
    adminApplyStoryLink(step);
    if (ADMIN_STORY_EXTRA[step.id]) ADMIN_STORY_EXTRA[step.id](st);
    // Choix en attente : première option, avec ses conséquences (storyMakeChoice)
    var c = step.choice;
    var choicePending = c && (typeof c.isDone === "function" ? !c.isDone() : SQ.getChoice(c.key) == null);
    if (choicePending && typeof storyMakeChoice === "function") storyMakeChoice(chapterId, c.options[0].value);
    // Étape passée : son tutoriel rejoint le catalogue d'aide sans s'ouvrir
    if (quiet && step.tutorial) st.tutorialsSeen[step.id] = true;
    step.check = function () { return true; };
    ok = SQ.claimStep(chapterId);
  } finally {
    step.check = check;
    window.openQuestCompletePopup = saved.popup;
    window.showToast = saved.toast;
  }
  return ok ? step.id : null;
}

function adminStoryBusy() {
  if (window.WorldTravel && WorldTravel.isBusy()) {
    showToast("Une activité est en cours : « Quitter le combat en cours » d'abord", 2200);
    return true;
  }
  return false;
}

function adminValidateStoryStep() {
  if (!window.StoryQuestManager || adminStoryBusy()) return;
  var id = adminForceStoryStep(false);
  if (!id) showToast("Aucune étape à valider", 1400);
  adminRefresh();
}

function adminJumpToStoryStep() {
  var sel = document.getElementById("admin-story-target");
  if (!sel || !sel.value || !window.StoryQuestManager || adminStoryBusy()) return;
  var target = sel.value, count = 0;
  // Garde-fou : jamais plus d'étapes qu'il n'en existe
  for (var n = adminStoryAllSteps().length; n > 0; n--) {
    var all = adminStoryAllSteps(), pos = adminStoryCurrentPos(all);
    if (pos < 0 || all[pos].step.id === target) break;
    if (!adminForceStoryStep(true)) break;
    count += 1;
  }
  var all2 = adminStoryAllSteps(), pos2 = adminStoryCurrentPos(all2);
  var arrived = pos2 >= 0 && all2[pos2].step.id === target;
  showToast(arrived ? "📖 " + count + " étape" + (count > 1 ? "s" : "") + " validée" + (count > 1 ? "s" : "") + " — à accepter dans Quêtes" : "Avance interrompue après " + count + " étape(s)", 2200);
  adminRefresh();
}

window.buildAdminCompanionsHTML = buildAdminCompanionsHTML;
window.adminRecruitCompanions = adminRecruitCompanions;
window.buildAdminPetiteAventureHTML = buildAdminPetiteAventureHTML;
window.adminAddPetiteAventure = adminAddPetiteAventure;
window.adminResetPetiteAventure = adminResetPetiteAventure;
window.buildAdminStoryHTML = buildAdminStoryHTML;
window.adminForceStoryStep = adminForceStoryStep;
window.adminValidateStoryStep = adminValidateStoryStep;
window.adminJumpToStoryStep = adminJumpToStoryStep;
