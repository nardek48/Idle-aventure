"use strict";
/* ui/scene-view.js — écran plein cadre du scene-engine générique (DESIGN_Scene_Engine_v1.md,
   Lot S1). Rendu dans #panel-container (onglet "scene", accès via le menu ☰), tab-bar masquée
   (body.scene-active, voir ui-root.js + css/02-layout.css) — même principe que le combat.
   Structure calquée sur le prototype HTML validé par Seb (aethervale-expedition-v2.html) :
   bandeau de pilules, grille de cartes, journal encadré, écran de fin — adaptée à la palette
   --nb-* (css/04-panel-scene.css). Détail : COMMENTAIRES_ORIGINAUX.md */

/* --- Journal de run (historique affiché sous les cartes) --- */
var sceneRunLog = []; // volatile, non persisté (fil narratif de la session en cours)

function sceneLog(text) {
  sceneRunLog.push(text);
  if (sceneRunLog.length > 12) sceneRunLog.shift();
}

function buildSceneLogHTML() {
  if (!sceneRunLog.length) return "";
  var h = '<div class="scene-log">';
  sceneRunLog.forEach(function (line) { h += '<div class="scene-log-line">' + line + '</div>'; });
  h += '</div>';
  return h;
}

function sceneEstimateClass(estimate) {
  if (estimate === "high") return "is-good";
  if (estimate === "medium") return "is-medium";
  return "is-low";
}

function sceneEstimateLabel(estimate) {
  if (estimate === "high") return "Bonne chance";
  if (estimate === "medium") return "Chance moyenne";
  return "Faible chance";
}

var SCENE_STAT_LABELS = { power: "Puissance", precision: "Précision", endurance: "Endurance" };

/* --- Routeur principal de l'onglet "scene" (appelé par renderPanel(), case "scene") --- */

function buildSceneScreenHTML() {
  var run = SceneRunManager.getRun();
  if (!run || run.status === "completed") {
    return buildSceneLandingHTML();
  }
  if (run.status === "preparation") return buildScenePreparationHTML();
  if (run.status === "gate") return buildSceneGateChoiceHTML();
  if (run.status === "node") return buildSceneNodeHTML();
  if (run.status === "finale") return buildSceneFinaleHTML(run);
  return buildSceneLandingHTML();
}
window.buildSceneScreenHTML = buildSceneScreenHTML;

/* Rafraîchit uniquement le contenu de l'écran courant, sans repasser par switchTab()
   (évite de redéclencher le garde anti-sortie à chaque action de jeu). */
function refreshSceneScreen() {
  var container = document.getElementById("panel-container");
  if (container && game.activeTab === "scene") container.innerHTML = buildSceneScreenHTML();
}

/* --- Écran d'accueil : pas de run actif --- */
/* v3.122.0 (Lot S2a) : l'onglet "scene" n'est plus un point de départ (retiré du menu ☰,
   décision Seb "c'est l'onglet Quêtes qui est important") — il n'affiche qu'un run en cours,
   lancé depuis le tableau de missions. Sans run actif, invite à y retourner plutôt que de
   proposer de lancer quoi que ce soit ici. */
function buildSceneLandingHTML() {
  if (game.sceneRun && game.sceneRun.status === "completed") {
    return buildSceneCompleteHTML(); // bilan pas encore consulté (ex. reprise post-rechargement)
  }
  var h = '<div class="panel-title">Expédition</div>';
  h += '<div class="scene-landing">';
  h += '<div class="scene-landing-icon">🕳️</div>';
  h += '<p class="scene-landing-text">Aucune expédition en cours, direction le tableau de missions.</p>';
  h += '<button class="settings-btn primary" type="button" onclick="switchTab(\'quests\')">Voir le tableau de missions</button>';
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
  sceneRunLog = [];
  var result = SceneRunManager.startRun(templateId);
  if (!result.ok) {
    showToast(result.reason, 1600);
    refreshSceneScreen();
    return;
  }
  refreshSceneScreen();
}
window.openSceneQuestEntry = openSceneQuestEntry;

function startSceneExpedition() {
  sceneRunLog = [];
  var result = SceneRunManager.startRun("expedition_faille");
  if (!result.ok) {
    showToast(result.reason, 1600);
    return;
  }
  refreshSceneScreen();
}
window.startSceneExpedition = startSceneExpedition;

/* --- Bandeau d'état permanent --- */

function buildSceneProgressHTML(run) {
  var template = SceneEngine.getTemplate(run.templateId);
  var depthMax = Number(template.depthMax || 1);
  var h = '<div class="scene-progress">';
  for (var i = 0; i < depthMax; i++) {
    var cls = i < run.depth ? " is-done" : (i === run.depth ? " is-current" : "");
    h += '<i class="scene-progress-seg' + cls + '"></i>';
  }
  h += '</div>';
  return h;
}

function buildSceneStatusBarHTML(run, opts) {
  opts = opts || {};
  var template = SceneEngine.getTemplate(run.templateId);
  var isGold = template.lootResource === "gold";
  var lootAmount = isGold
    ? Math.floor((game.sortie && game.sortie.loot && game.sortie.loot.gold) || 0)
    : Math.floor((game.sortie && game.sortie.loot && game.sortie.loot.resources && game.sortie.loot.resources[template.lootResource]) || 0);
  var lootLabel;
  if (isGold) {
    lootLabel = "Or";
  } else {
    var resDef = (window.WAREHOUSE_RESOURCES || {})[template.lootResource];
    lootLabel = (resDef && resDef.name) || template.lootResource;
  }

  var h = buildSceneProgressHTML(run);
  h += '<div class="scene-status-bar">';
  h += '<span class="scene-status-pill scene-status-depth">Profondeur ' + (run.depth + 1) + '/' + template.depthMax + '</span>';
  h += '<span class="scene-status-pill scene-status-loot">' + esc(lootLabel) + ' : ' + lootAmount + '</span>';
  h += '<span class="scene-status-pill scene-status-injury">Blessures : ' + run.injuries.length + '/3</span>';
  if (run.torchCharges > 0) h += '<span class="scene-status-pill">Torche x' + run.torchCharges + '</span>';
  h += '</div>';
  // Bouton "Rentrer" toujours accessible tant que le run est engagé (décision Seb : le
  // joueur doit pouvoir sortir quand il veut, pas seulement sur l'écran de choix de porte).
  // Masqué pendant la préparation (le run n'a pas vraiment commencé) et la chambre finale
  // (rentrer n'a plus de sens, il ne reste que les deux coffres) via opts.hideLeave.
  if (!opts.hideLeave) {
    h += '<div class="scene-actions scene-actions-leave">';
    h += '  <button class="settings-btn scene-btn-leave" type="button" onclick="leaveSceneNow()">Rentrer au camp</button>';
    h += '</div>';
  }
  return h;
}

/* --- Préparation : choix de 3 objets --- */

var scenePrepSelected = [];

function buildScenePreparationHTML() {
  var run = SceneRunManager.getRun();
  if (!run) return "";
  var template = SceneEngine.getTemplate(run.templateId);
  var slots = Number(template.loadoutSlots || 3);

  var h = '<div class="panel-title">Préparation de l\u2019expédition</div>';
  h += '<div class="scene-screen">';
  h += '  <div class="scene-heading">';
  h += '    <div class="scene-heading-title">' + esc(template.title) + '</div>';
  h += '    <div class="scene-heading-text">Choisis ' + slots + ' objets pour ton départ (' + scenePrepSelected.length + '/' + slots + '). Ton équipement décide de ton style d\u2019expédition.</div>';
  h += '  </div>';

  h += '  <div class="scene-card-grid">';
  var offerUnique = template.loadoutOffer.filter(function (id, i) { return template.loadoutOffer.indexOf(id) === i; });
  offerUnique.forEach(function (itemId) {
    var item = template.items[itemId];
    var maxCopies = template.loadoutOffer.filter(function (id) { return id === itemId; }).length;
    var selectedCount = scenePrepSelected.filter(function (id) { return id === itemId; }).length;
    var full = scenePrepSelected.length >= slots;
    var atMax = selectedCount >= maxCopies;
    var disabled = (full && selectedCount === 0) || atMax;
    var badge = selectedCount > 0 ? ' (x' + selectedCount + ')' : '';
    h += '<button type="button" class="scene-card' + (selectedCount > 0 ? ' is-selected' : '') + '"'
      + ' onclick="toggleScenePrepItem(\'' + esc(itemId) + '\')"' + (disabled && selectedCount === 0 ? ' disabled' : '') + '>';
    h += '<span class="scene-card-label">' + esc(item.name) + esc(badge) + '</span>';
    h += '<span class="scene-card-sub">' + esc(item.desc) + (maxCopies > 1 ? ' (max ' + maxCopies + ')' : '') + '</span>';
    h += '</button>';
  });
  h += '  </div>';

  h += '  <div class="scene-actions">';
  h += '    <button class="settings-btn primary" type="button"' + (scenePrepSelected.length === slots ? '' : ' disabled') + ' onclick="confirmScenePreparation()">Descendre dans la faille</button>';
  h += '  </div>';
  h += '</div>';
  return h;
}

function toggleScenePrepItem(itemId) {
  var run = SceneRunManager.getRun();
  var template = SceneEngine.getTemplate(run.templateId);
  var slots = Number(template.loadoutSlots || 3);
  var selectedCount = scenePrepSelected.filter(function (id) { return id === itemId; }).length;

  if (selectedCount > 0) {
    scenePrepSelected.splice(scenePrepSelected.indexOf(itemId), 1);
  } else if (scenePrepSelected.length < slots) {
    var maxCopies = template.loadoutOffer.filter(function (id) { return id === itemId; }).length;
    if (selectedCount < maxCopies) scenePrepSelected.push(itemId);
  }
  refreshSceneScreen();
}
window.toggleScenePrepItem = toggleScenePrepItem;

function confirmScenePreparation() {
  var run = SceneRunManager.getRun();
  var template = SceneEngine.getTemplate(run.templateId);
  var result = SceneRunManager.confirmLoadout(scenePrepSelected);
  if (!result.ok) {
    showToast(result.reason, 1600);
    return;
  }
  sceneLog("Départ, équipé de : " + scenePrepSelected.map(function (id) { return template.items[id].name; }).join(", "));
  refreshSceneScreen();
}
window.confirmScenePreparation = confirmScenePreparation;

/* --- Choix de porte (palier courant) --- */

function buildSceneGateChoiceHTML() {
  var run = SceneRunManager.getRun();
  if (!run) return "";
  var template = SceneEngine.getTemplate(run.templateId);
  var level = SceneRunManager.getCurrentLevel();
  var torchOn = SceneRunManager.torchActiveThisLevel();

  var h = '<div class="panel-title">' + esc(template.title) + '</div>';
  h += '<div class="scene-screen">';
  h += buildSceneStatusBarHTML(run);
  h += '  <div class="scene-heading">';
  h += '    <div class="scene-heading-title">Profondeur ' + (run.depth + 1) + '</div>';
  h += '    <div class="scene-heading-text">' + level.length + ' passages s\u2019ouvrent devant toi' + (torchOn ? ' (torche active).' : '.') + '</div>';
  h += '  </div>';

  if (!torchOn && run.torchCharges > 0) {
    h += '  <div class="scene-actions" style="margin-top:0;margin-bottom:8px;">';
    h += '    <button class="settings-btn" type="button" onclick="useSceneTorch()">Utiliser la torche (' + run.torchCharges + ' restante' + (run.torchCharges > 1 ? 's' : '') + ')</button>';
    h += '  </div>';
  }

  h += '  <div class="scene-card-grid">';
  level.forEach(function (slot, idx) {
    var label, sub, subClass = "";
    var icon = SCENE_NODES.icons[slot.type] || "?";
    if (slot.type === "mystere") {
      label = "???";
      sub = SCENE_NODES.silhouettes.mystere + "\u2026";
    } else if (slot.type === "obstacle") {
      var gabarit = SCENE_NODES.obstacles[slot.gabaritId];
      var bestEstimate = "low";
      var order = { low: 0, medium: 1, high: 2 };
      Object.keys(gabarit.options).forEach(function (key) {
        var statEff = SceneRunManager.statEffective(run, gabarit.options[key].stat);
        var e = SceneEngine.estimateObstacle(gabarit, key, statEff, run.depth, slot.riskMod);
        if (order[e] > order[bestEstimate]) bestEstimate = e;
      });
      var riskLvl = SceneEngine.riskLevel(slot.riskMod);
      var gainLabel = SCENE_NODES.gainHints[riskLvl];
      if (torchOn) {
        label = gabarit.name;
        sub = sceneEstimateLabel(bestEstimate) + " — " + gainLabel;
      } else {
        // Sans torche : indice qualitatif au lieu d'un simple "???" (décision Seb 03/09/2026 :
        // un "???" pur ne donnait aucune base de décision). v3.121.0 : le gain relatif à la
        // porte (SCENE_NODES.gainHints) est TOUJOURS visible, torche ou non — c'est lui qui
        // rend le choix risque/récompense réel, la torche ne précise que la chance de réussite.
        label = SCENE_NODES.labels.obstacle;
        sub = SCENE_NODES.hints.obstacle[bestEstimate] + " — " + gainLabel;
      }
      subClass = sceneEstimateClass(bestEstimate);
    } else if (torchOn) {
      label = SCENE_NODES.labels[slot.type] || "???";
      sub = SCENE_NODES.silhouettes[slot.type];
    } else {
      label = SCENE_NODES.labels[slot.type] || "???";
      sub = SCENE_NODES.hints[slot.type] || SCENE_NODES.silhouettes[slot.type];
    }
    h += '<button type="button" class="scene-card" onclick="enterSceneGate(' + idx + ')">';
    h += '<span class="scene-card-icon">' + esc(icon) + '</span>';
    h += '<span class="scene-card-label">' + esc(label) + '</span>';
    h += '<span class="scene-card-sub' + (subClass ? ' ' + subClass : '') + '">' + esc(sub) + '</span>';
    h += '</button>';
  });
  h += '  </div>';

  h += buildSceneLogHTML();
  h += '</div>';
  return h;
}

function useSceneTorch() {
  SceneRunManager.useTorchForLevel();
  refreshSceneScreen();
}
window.useSceneTorch = useSceneTorch;

function enterSceneGate(idx) {
  var result = SceneRunManager.enterGate(idx);
  if (!result.ok) {
    showToast(result.reason, 1600);
    return;
  }
  refreshSceneScreen();
}
window.enterSceneGate = enterSceneGate;

function leaveSceneNow() {
  var result = SceneRunManager.leaveNow();
  if (!result.ok) {
    showToast(result.reason, 1600);
    return;
  }
  refreshSceneScreen();
}
window.leaveSceneNow = leaveSceneNow;

/* --- Résolution d'un nœud (obstacle / autel / découverte / source) --- */

function buildSceneNodeHTML() {
  var run = SceneRunManager.getRun();
  if (!run || !run.pendingNode) return buildSceneGateChoiceHTML();
  var type = run.pendingNode.type;
  if (type === "obstacle") return buildSceneObstacleHTML(run);
  if (type === "autel") return buildSceneAutelHTML(run);
  if (type === "decouverte") return buildSceneDecouverteHTML(run);
  if (type === "source") return buildSceneSourceHTML(run);
  return buildSceneGateChoiceHTML();
}

function buildSceneObstacleHTML(run) {
  var gabarit = SCENE_NODES.obstacles[run.pendingNode.gabaritId];
  var h = '<div class="panel-title">' + esc(gabarit.name) + '</div>';
  h += '<div class="scene-screen">';
  h += buildSceneStatusBarHTML(run);
  h += '  <div class="scene-heading">';
  h += '    <div class="scene-heading-text">Choisis ton approche.</div>';
  h += '  </div>';

  h += '  <div class="scene-card-grid">';
  Object.keys(gabarit.options).forEach(function (key) {
    var option = gabarit.options[key];
    var estimate = SceneRunManager.getObstacleEstimate(key);
    h += '<button type="button" class="scene-card" onclick="resolveSceneObstacleChoice(\'' + esc(key) + '\')">';
    h += '<span class="scene-card-label">' + esc(option.label) + '</span>';
    h += '<span class="scene-card-sub">' + SCENE_STAT_LABELS[option.stat] + ' — <span class="' + sceneEstimateClass(estimate) + '">' + esc(sceneEstimateLabel(estimate)) + '</span></span>';
    h += '</button>';
  });
  if (gabarit.ropeOption && run.ropeAvailable) {
    h += '<button type="button" class="scene-card" onclick="resolveSceneObstacleChoice(\'corde\')">';
    h += '<span class="scene-card-label">Assurer à la corde</span>';
    h += '<span class="scene-card-sub is-good">Réussite garantie, gain réduit</span>';
    h += '</button>';
  }
  h += '  </div>';
  h += '</div>';
  return h;
}

var sceneNodeBusy = false;

function resolveSceneObstacleChoice(optionKey) {
  if (sceneNodeBusy) return;
  sceneNodeBusy = true;
  var result = SceneRunManager.resolveObstacle(optionKey);
  sceneNodeBusy = false;

  if (!result.ok) {
    showToast(result.reason, 1600);
    return;
  }
  if (result.outcome === "setback") sceneLog('Échec, blessure. +' + result.gainAmount);
  else if (result.outcome === "perfect") sceneLog('Parfait ! +' + result.gainAmount);
  else if (result.outcome === "evacuation") sceneLog('Trois blessures, évacuation d\u2019urgence.');
  else sceneLog('Réussi. +' + result.gainAmount);

  refreshSceneScreen();
}
window.resolveSceneObstacleChoice = resolveSceneObstacleChoice;

function buildSceneAutelHTML(run) {
  var canHeal = run.injuries.length > 0;
  var cost = canHeal ? Math.max(5, Math.round(run.loot * 0.2)) : 0;
  var h = '<div class="panel-title">Autel oublié</div>';
  h += '<div class="scene-screen">';
  h += buildSceneStatusBarHTML(run);
  h += '  <div class="scene-heading">';
  h += '    <div class="scene-heading-text">' + (canHeal ? 'Une offrande de ' + cost + ' apaiserait tes plaies.' : 'Tu n\u2019as aucune blessure à soigner.') + '</div>';
  h += '  </div>';
  h += '  <div class="scene-actions">';
  if (canHeal) h += '    <button class="settings-btn primary" type="button" onclick="resolveSceneAutel(true)">Faire l\u2019offrande</button>';
  h += '    <button class="settings-btn" type="button" onclick="resolveSceneAutel(false)">Passer son chemin</button>';
  h += '  </div>';
  h += '</div>';
  return h;
}

function resolveSceneAutel(accept) {
  var result = SceneRunManager.resolveAutel(accept);
  if (!result.ok) { showToast(result.reason, 1600); return; }
  sceneLog(accept ? "L\u2019autel absorbe l\u2019offrande. Une blessure se referme." : "Tu ignores l\u2019autel.");
  refreshSceneScreen();
}
window.resolveSceneAutel = resolveSceneAutel;

function buildSceneDecouverteHTML(run) {
  var h = '<div class="panel-title">Découverte</div>';
  h += '<div class="scene-screen">';
  h += buildSceneStatusBarHTML(run);
  h += '  <div class="scene-heading">';
  h += '    <div class="scene-heading-text">Une cache scintille entre les pierres.</div>';
  h += '  </div>';
  h += '  <div class="scene-actions">';
  h += '    <button class="settings-btn primary" type="button" onclick="resolveSceneDecouverte()">Continuer</button>';
  h += '  </div>';
  h += '</div>';
  return h;
}

function resolveSceneDecouverte() {
  var result = SceneRunManager.resolveDecouverte();
  if (!result.ok) { showToast(result.reason, 1600); return; }
  sceneLog('Découverte : +' + result.gainAmount);
  refreshSceneScreen();
}
window.resolveSceneDecouverte = resolveSceneDecouverte;

function buildSceneSourceHTML(run) {
  var h = '<div class="panel-title">Source claire</div>';
  h += '<div class="scene-screen">';
  h += buildSceneStatusBarHTML(run);
  h += '  <div class="scene-heading">';
  h += '    <div class="scene-heading-text">Une source murmure dans la pénombre.</div>';
  h += '  </div>';
  h += '  <div class="scene-actions">';
  h += '    <button class="settings-btn primary" type="button" onclick="resolveSceneSource()">Continuer</button>';
  h += '  </div>';
  h += '</div>';
  return h;
}

function resolveSceneSource() {
  var result = SceneRunManager.resolveSource();
  if (!result.ok) { showToast(result.reason, 1600); return; }
  sceneLog(result.healed ? "Tu bois longuement : une blessure se referme." : "Tu remplis ta gourde.");
  refreshSceneScreen();
}
window.resolveSceneSource = resolveSceneSource;

/* --- Chambre finale --- */

function buildSceneFinaleHTML(run) {
  run = run || SceneRunManager.getRun();
  var h = '<div class="panel-title">La chambre du trésor</div>';
  h += '<div class="scene-screen">';
  h += buildSceneStatusBarHTML(run, { hideLeave: true });
  h += '  <div class="scene-heading">';
  h += '    <div class="scene-heading-text">Deux coffres t\u2019attendent.</div>';
  h += '  </div>';
  h += '  <div class="scene-card-grid">';
  h += '<button type="button" class="scene-card" onclick="resolveSceneFinale(\'sur\')">';
  h += '<span class="scene-card-label">Coffre patiné</span>';
  h += '<span class="scene-card-sub is-good">Gain garanti</span></button>';
  h += '<button type="button" class="scene-card" onclick="resolveSceneFinale(\'risque\')">';
  h += '<span class="scene-card-label">Coffre scellé</span>';
  h += '<span class="scene-card-sub is-medium">50% : butin doublé, 50% : moitié perdue</span></button>';
  h += '  </div>';
  h += '</div>';
  return h;
}

function resolveSceneFinale(choiceId) {
  var result = SceneRunManager.resolveFinale(choiceId);
  if (!result.ok) { showToast(result.reason, 1600); return; }
  refreshSceneScreen();
}
window.resolveSceneFinale = resolveSceneFinale;

/* --- Bilan de fin --- */

function buildSceneCompleteHTML() {
  var run = SceneRunManager.getRun();
  if (!run) return "";
  var summary = game.lastSortieSummary;
  var kept = summary ? summary.kept : null;
  var lost = summary ? summary.lost : null;
  var isEvacuation = run.injuries.length >= 3;

  var h = '<div class="panel-title">Résumé de l\u2019expédition</div>';
  h += '<div class="scene-screen">';
  h += '  <div class="scene-end-card' + (isEvacuation ? ' is-failure' : '') + '">';
  h += '    <div class="scene-end-icon">' + (isEvacuation ? '\u{1F480}' : '\u{1F3D5}\uFE0F') + '</div>';
  h += '  </div>';

  h += '  <div class="dungeon-summary-rewards">';
  h += '    <div class="dungeon-summary-row"><span>Profondeur atteinte</span><span>' + (run.depth + 1) + '</span></div>';
  h += '    <div class="dungeon-summary-row"><span>Blessures</span><span>' + run.injuries.length + '</span></div>';
  if (kept && window.SortieManager) {
    h += '    <div class="dungeon-summary-row"><span>Butin rapporté</span><span>' + esc(SortieManager.getLootSummary(kept)) + '</span></div>';
  }
  if (lost && window.SortieManager && (lost.gold || lost.essence || (lost.resources && Object.keys(lost.resources).some(function (k) { return lost.resources[k] > 0; })))) {
    h += '    <div class="dungeon-summary-row"><span>Perdu</span><span>' + esc(SortieManager.getLootSummary(lost)) + '</span></div>';
  }
  h += '  </div>';

  h += '  <div class="scene-actions">';
  h += '    <button class="settings-btn primary" type="button" onclick="startSceneExpeditionAgain()">Nouvelle expédition</button>';
  h += '    <button class="settings-btn" type="button" onclick="leaveSceneScreen()">Quitter</button>';
  h += '  </div>';
  h += '</div>';
  return h;
}

/* Nettoie le bilan et relance directement une expédition (raccourci pratique). */
function startSceneExpeditionAgain() {
  SceneRunManager.clearRun();
  sceneRunLog = [];
  startSceneExpedition();
}
window.startSceneExpeditionAgain = startSceneExpeditionAgain;

/* Nettoie le bilan et retourne au Campement — seul vrai point de sortie complet de l'écran
   Expédition une fois le run terminé (décision Seb : le joueur doit pouvoir quitter, pas
   seulement relancer). */
function leaveSceneScreen() {
  SceneRunManager.clearRun();
  sceneRunLog = [];
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
