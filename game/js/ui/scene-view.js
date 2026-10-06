"use strict";
/* ui/scene-view.js — onglet "scene" (plein cadre, tab-bar masquée). v3.391.0 (lot P-3) : l'ancien
   moteur est retiré ; l'écran route vers pa2-view.js et garde l'accueil et le départ refusé. */

var SCENE_STAT_LABELS = { power: _t("Puissance"), precision: _t("Précision"), endurance: _t("Endurance") }; // v3.370.0 : traduits à la définition (i18n D2)
/* v3.422.0 : libellé traduit AU RENDU (la table ci-dessus est figée au chargement, dans la
   langue de ce moment-là ; la pseudo-langue du scan l'a montré). */
function sceneStatLabel(stat) {
  if (stat === "power") return _t("Puissance");
  if (stat === "precision") return _t("Précision");
  if (stat === "endurance") return _t("Endurance");
  return stat;
}
window.sceneStatLabel = sceneStatLabel;

/* --- Routeur de l'onglet "scene" (renderPanel(), case "scene") --- */
function buildSceneScreenHTML() {
  var run = SceneRunManager.getRun();
  if (run && run.end && run.end.how === "cancel") { SceneRunManager.clearRun(); run = null; } // préparation abandonnée : rien à montrer
  if (run && window.buildPa2ScreenHTML) return buildPa2ScreenHTML(run);
  return buildSceneLandingHTML();
}
window.buildSceneScreenHTML = buildSceneScreenHTML;

/* Rafraîchit uniquement le contenu de l'écran courant, sans repasser par switchTab()
   (évite de redéclencher le garde anti-sortie à chaque action de jeu). */
function refreshSceneScreen() {
  var container = document.getElementById("panel-container");
  if (container && game.activeTab === "scene") {
    container.innerHTML = buildSceneScreenHTML();
    if (window.decoratePageFrames) decoratePageFrames(container); // v3.190.0 : rendu direct hors renderPanel
  }
}

/* --- Écran d'accueil : pas de run actif --- */
/* v3.122.0 (Lot S2a) : l'onglet "scene" n'est plus un point de départ (retiré du menu ☰,
   décision Seb "c'est l'onglet Quêtes qui est important") — il n'affiche qu'un run en cours,
   lancé depuis le tableau de missions. Sans run actif, invite à y retourner plutôt que de
   proposer de lancer quoi que ce soit ici. */
/* v3.260.0 (retour Seb) : départ refusé -> l'écran dit POURQUOI au lieu de « aucune expédition ».
   Non sauvegardé : un rechargement retombe sur l'accueil normal. */
var sceneStartBlock = null; // { templateId, reason }

/* Recette qui produit une ressource (premier atelier trouvé), pour dire où la fabriquer. */
function findSceneCostRecipe(resourceId) {
  var cfg = window.WORKSHOPS_CONFIG || {};
  var found = null;
  Object.keys(cfg).some(function (wid) {
    return (cfg[wid].recipes || []).some(function (r) {
      if (!(r.outputs || []).some(function (o) { return o.resourceId === resourceId; })) return false;
      found = { workshopName: cfg[wid].name, inputs: r.inputs || [] };
      return true;
    });
  });
  return found;
}
window.findSceneCostRecipe = findSceneCostRecipe;

/* Écran du départ refusé : ressource manquante (icône, quantité, recette, raccourci Ateliers)
   ou, à défaut, la raison brute. Si le manque est comblé entre-temps, propose de repartir. */
function buildSceneStartBlockHTML(block) {
  var template = (window.SceneEngine && SceneEngine.getTemplate) ? SceneEngine.getTemplate(block.templateId) : null;
  var cost = template && template.entryCost;
  var h = '<div class="panel-title">' + _t("Expédition") + '</div>';
  h += '<div class="scene-landing scene-landing-blocked">';
  if (cost) {
    var def = (window.WAREHOUSE_RESOURCES || {})[cost.resourceId] || {};
    var need = Number(cost.amount || 0);
    var have = (window.WarehouseManager && WarehouseManager.getAmount) ? Number(WarehouseManager.getAmount(cost.resourceId) || 0) : 0;
    var name = def.name ? _td(def.name) : cost.resourceId;
    h += '<div class="scene-landing-icon scene-cost-icon' + (have >= need ? ' is-ok' : '') + '">' + renderIconOrEmojiHTML(def.icon || "images/Icons/quests/ration_reward.png", "scene-cost-img", name) + '</div>';
    if (have < need) {
      h += '<div class="scene-cost-title">' + esc(need - have > 1 ? _t("Il te manque {n} {x}", { n: need - have, x: name }) : _t("Il te manque une {x}", { x: name })) + '</div>';
      h += '<p class="scene-landing-text">' + esc(_t("{q} consomme {n} {x} au départ. Tu en as {h}.", { q: template.title ? _td(template.title) : _t("Cette expédition"), n: need, x: name, h: have })) + '</p>';
      var recipe = findSceneCostRecipe(cost.resourceId);
      if (recipe) {
        h += '<div class="scene-cost-recipe"><span class="scene-cost-recipe-label">' + esc(_td(recipe.workshopName)) + '</span>';
        recipe.inputs.forEach(function (inp) {
          var rd = (window.WAREHOUSE_RESOURCES || {})[inp.resourceId] || {};
          var got = (window.WarehouseManager && WarehouseManager.getAmount) ? Number(WarehouseManager.getAmount(inp.resourceId) || 0) : 0;
          h += '<span class="scene-cost-input' + (got >= inp.quantity ? '' : ' is-missing') + '">' + renderIconOrEmojiHTML(rd.icon || "", "scene-cost-input-img", rd.name ? _td(rd.name) : inp.resourceId) + formatNumber(got) + '/' + formatNumber(inp.quantity) + '</span>';
        });
        h += '</div>';
        h += '<button class="settings-btn primary" type="button" onclick="goToSceneCostWorkshop()">' + _t("Préparer aux Ateliers") + '</button>';
      }
    } else {
      h += '<div class="scene-cost-title">' + esc(_t("{x} prête", { x: name })) + '</div>';
      h += '<p class="scene-landing-text">' + _t("Tu as ce qu’il faut pour partir.") + '</p>';
      h += '<button class="settings-btn primary" type="button" onclick="retrySceneStart()">' + _t("Partir") + '</button>';
    }
  } else {
    h += '<div class="scene-landing-icon"><img class=ico-inline src=images/Icons/system/warning.png></div>';
    h += '<p class="scene-landing-text">' + esc(block.reason ? _td(block.reason) : _t("Départ impossible pour l’instant.")) + '</p>';
  }
  h += '<button class="settings-btn" type="button" onclick="leaveSceneStartBlock()">' + _t("Voir le tableau de missions") + '</button>';
  h += '</div>';
  return h;
}

function goToSceneCostWorkshop() {
  sceneStartBlock = null;
  if (typeof closeLivingMap === "function" && typeof isLivingMapOpen === "function" && isLivingMapOpen()) closeLivingMap(); // appel depuis la carte
  if (typeof switchTab === "function") switchTab("village");
  if (typeof setVillageSubTab === "function") setVillageSubTab("production");
  if (typeof setProductionViewTab === "function") setProductionViewTab("shops");
}
function retrySceneStart() {
  var id = sceneStartBlock && sceneStartBlock.templateId;
  sceneStartBlock = null;
  if (id) openSceneQuestEntry(id);
}
function leaveSceneStartBlock() {
  sceneStartBlock = null;
  if (typeof switchTab === "function") switchTab("quests");
}
window.goToSceneCostWorkshop = goToSceneCostWorkshop;
window.retrySceneStart = retrySceneStart;
window.leaveSceneStartBlock = leaveSceneStartBlock;
window.buildSceneStartBlockHTML = buildSceneStartBlockHTML;

function buildSceneLandingHTML() {
  if (sceneStartBlock) return buildSceneStartBlockHTML(sceneStartBlock); // v3.260.0
  var h = '<div class="panel-title">' + _t("Expédition") + '</div>';
  h += '<div class="scene-landing">';
  h += '<div class="scene-landing-icon"><img class=ico-inline src=images/Icons/scene/scene_cavern.png></div>';
  h += '<p class="scene-landing-text">' + _t("Aucune expédition en cours, direction le tableau de missions.") + '</p>';
  h += '<button class="settings-btn primary" type="button" onclick="switchTab(\'quests\')">' + _t("Voir le tableau de missions") + '</button>';
  h += '</div>';
  return h;
}

/* Point d'entrée déclenché depuis MissionBoard._sceneMissions() (launch d'une carte acceptée) :
   lance le canevas correspondant si aucun run n'est actif, sinon ne fait rien (le run affiché
   est déjà le bon — accepted/running pointent tous deux vers le templateId de la carte). */
function openSceneQuestEntry(templateId) {
  var run = SceneRunManager.getRun();
  if (run && run.status !== "completed" && run.templateId === templateId) {
    refreshSceneScreen(); // run déjà en cours pour cette quête -> juste (ré)afficher l'écran
    return;
  }
  if (SceneRunManager.isRunActive()) return; // un AUTRE run est en cours, rien à faire ici (switchTab a déjà affiché son écran)
  var result = SceneRunManager.startRun(templateId);
  // v3.260.0 : le refus reste affiché à l'écran (ration manquante, cap du jour...)
  sceneStartBlock = result.ok ? null : { templateId: templateId, reason: result.reason };
  if (!result.ok) {
    if (game.activeTab !== "scene") showToast(result.reason, 1600); // sur l'écran, le refus est déjà affiché
    refreshSceneScreen();
    return;
  }
  refreshSceneScreen();
}
window.openSceneQuestEntry = openSceneQuestEntry;

/* Nettoie le run terminé et retourne au Campement (ou à la carte vivante pour un run ciblé). */
function leaveSceneScreen() {
  var run = SceneRunManager.getRun();
  var target = (run && run.livingMap) ? run.livingMap : null; // v3.256.0 (C-2) : lu AVANT clearRun
  SceneRunManager.clearRun();
  // v3.256.0 (C-2, décision Seb) : un run ciblé ramène sur la carte, là où la brume a bougé.
  if (target && typeof openLivingMap === "function") { openLivingMap(target.mapId, target.sectorId); return; }
  if (typeof switchTab === "function") switchTab("campement");
}
window.leaveSceneScreen = leaveSceneScreen;

/* --- Reprise d'un run actif (ex. après rechargement de page) --- */

function resumeSceneRun() {
  var run = SceneRunManager.getRun();
  if (!run) return;
  if (typeof switchTab === "function") switchTab("scene");
}
window.resumeSceneRun = resumeSceneRun;
