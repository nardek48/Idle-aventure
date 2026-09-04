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
  if (run.status === "profile") return buildSceneProfileChoiceHTML(); // v3.125.0 (Petites Aventures)
  if (run.status === "preparation") return buildScenePreparationHTML();
  if (run.status === "gate") return buildSceneGateChoiceHTML();
  if (run.status === "node") return buildSceneNodeHTML();
  if (run.status === "combat") return buildSceneCombatPendingHTML(run); // v3.126.0 (Lot PA2)
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

/* v3.139.0 (audit Forêt §3.6, horizon de visibilité) : buildSceneProgressHTML() type désormais
   les nœuds à venir dans un HORIZON limité (1 palier d'avance, 2 avec torche active sur le palier
   courant — décision Seb 04/09/2026), au lieu d'une simple frise de segments plats. Chaque palier
   dans l'horizon affiche l'icône réelle de son type (SCENE_NODES.icons) ; au-delà, un ❓ muet.
   Palette de nœuds distincte de buildSceneGateChoiceHTML (celle-ci reste inchangée : c'est elle
   qui gère le détail/estimate du palier COURANT via la torche, la frise ne montre QUE le type). */
/* v3.142.0 (Petite Aventure, remplace la frise v3.139.0) : chemin illustré à nœuds cliquables,
   même pattern que la carte du monde (js/ui/map-view.js:buildMapPathSvgHTML/buildMapNodeHTML) —
   positions fixes en %, tracé SVG en courbes de Bézier, nœuds ronds avec état visuel. Réservé
   aux canevas à gatesPerDepth [1,1] (1 seul palier = 1 seul nœud, jamais de choix de porte) —
   c'est le cas de petite_aventure_foret ET des 6 quêtes de déblocage, mais SEULE la Petite
   Aventure utilise ce rendu pour l'instant (décision Seb 04/09/2026 : voir le rendu avant
   d'étendre). buildSceneProgressHTML (frise plate, v3.139.0) reste utilisée par les autres
   canevas via buildSceneStatusBarHTML (branche ci-dessous). Fond en dur (--nb-cream-deep) pour
   l'instant — remplaçable par une image dédiée plus tard sans changer la structure (voir
   .scene-path-bg-img, non utilisée tant qu'aucune image n'est fournie). */
var SCENE_PATH_TEMPLATE_IDS = ["petite_aventure_foret"]; // canevas qui utilisent le chemin illustré

/* 8 positions de paliers en serpentin (bas -> haut, alternance gauche/droite) + 1 position pour
   la chambre finale, en % du cadre (comme MAP_NODE_POSITIONS). viewBox H choisi pour un cadre
   plus haut que large (portrait, cohérent avec un écran mobile 320-430px). */
var SCENE_PATH_NODE_POSITIONS = [
  { x: 20, y: 90 }, { x: 55, y: 76 }, { x: 22, y: 62 }, { x: 60, y: 48 },
  { x: 25, y: 34 }, { x: 62, y: 22 }, { x: 30, y: 12 }, { x: 68, y: 6 },
  { x: 50, y: 2 } // chambre finale, en haut du chemin
];
var SCENE_PATH_VIEWBOX_H = 70; // portrait modéré (≈ 1.4:1) plutôt que très haut — tient sur mobile sans écraser le reste de l'écran

function buildScenePathSvgHTML(count) {
  var pts = SCENE_PATH_NODE_POSITIONS.slice(0, count).map(function (p) {
    return { x: p.x, y: p.y * (SCENE_PATH_VIEWBOX_H / 100) };
  });
  if (pts.length < 2) return "";

  var d = "M " + pts[0].x + " " + pts[0].y;
  for (var i = 1; i < pts.length; i++) {
    var prev = pts[i - 1], cur = pts[i];
    var midY = (prev.y + cur.y) / 2;
    d += " C " + prev.x + " " + midY + ", " + cur.x + " " + midY + ", " + cur.x + " " + cur.y;
  }

  return '<svg class="scene-path-svg" viewBox="0 0 100 ' + SCENE_PATH_VIEWBOX_H + '" preserveAspectRatio="none">' +
         '<path d="' + d + '" fill="none" stroke="#fff2d0" stroke-width="1.1" stroke-linecap="round" stroke-dasharray="0.2 2.6" opacity="0.9"/>' +
         '</svg>';
}

/* Un nœud du chemin : palier normal (index < depthMax) ou chambre finale (index === depthMax).
   Cliquable UNIQUEMENT s'il est le palier courant ET que le statut du run permet d'y entrer
   (gate) — les nœuds passés/à venir sont purement visuels, cohérent avec un chemin linéaire à
   1 porte/palier (jamais de saut possible). */
function buildScenePathNodeHTML(run, template, index, depthMax, horizon) {
  var pos = SCENE_PATH_NODE_POSITIONS[index] || { x: 50, y: 50 };
  var isFinale = index === depthMax;
  var isDone = isFinale ? run.depth >= depthMax : index < run.depth;
  var isCurrent = isFinale ? (run.depth >= depthMax && run.status === "finale") : (index === run.depth);
  var isVisible = isFinale ? (horizon >= depthMax || run.depth >= depthMax) : (index <= horizon || index < run.depth);

  var classes = ["scene-path-node"];
  if (isFinale) classes.push("scene-path-node-finale");
  if (isDone) classes.push("is-done");
  else if (isCurrent) classes.push("is-current");
  else if (isVisible) classes.push("is-upcoming");
  else classes.push("is-hidden");

  var icon = "";
  if (isFinale) {
    icon = isVisible ? "🏆" : "";
  } else if (isVisible) {
    var level = run.card[index] || [];
    var slotType = level[0] && level[0].type;
    icon = (slotType && SCENE_NODES.icons[slotType]) || "";
  }

  // v3.126.0 (nœud combat) : un palier combat bascule déjà sur l'onglet Combat via enterGate ->
  // enterCombatNode — le clic ici appelle la même fonction, aucune divergence de flux.
  var clickable = !isFinale && isCurrent && run.status === "gate";
  var tag = clickable ? "button" : "span";
  var attrs = clickable ? ' type="button" onclick="enterSceneGate(0)"' : "";

  var h = "<" + tag + ' class="' + classes.join(" ") + '" style="left:' + pos.x + '%;top:' + pos.y + '%;"' + attrs + ">";
  h += '<span class="scene-path-node-circle">' + (icon ? esc(icon) : "") + '</span>';
  h += "</" + tag + ">";
  return h;
}

function buildScenePathHTML(run) {
  var template = SceneEngine.getTemplate(run.templateId);
  var depthMax = Number(template.depthMax || 1);
  var torchOn = SceneRunManager.torchActiveThisLevel();
  var horizon = run.depth + (torchOn ? 2 : 1);

  var h = '<div class="scene-path-frame">';
  h += buildScenePathSvgHTML(depthMax + 1);
  for (var i = 0; i <= depthMax; i++) {
    h += buildScenePathNodeHTML(run, template, i, depthMax, horizon);
  }
  h += "</div>";
  return h;
}

function buildSceneProgressHTML(run) {
  var template = SceneEngine.getTemplate(run.templateId);
  var depthMax = Number(template.depthMax || 1);
  var torchOn = SceneRunManager.torchActiveThisLevel();
  var horizon = run.depth + (torchOn ? 2 : 1); // dernier index de palier visible en type (inclus)

  var h = '<div class="scene-progress">';
  for (var i = 0; i < depthMax; i++) {
    var cls = i < run.depth ? " is-done" : (i === run.depth ? " is-current" : (i <= horizon ? " is-upcoming" : " is-hidden"));
    var icon = "";
    if (i <= horizon || i < run.depth) {
      var level = run.card[i] || [];
      var slotType = level[0] && level[0].type;
      icon = (slotType && SCENE_NODES.icons[slotType]) || "";
    }
    h += '<i class="scene-progress-seg' + cls + '">' + (icon ? esc(icon) : "") + '</i>';
  }
  // Chambre finale : nœud virtuel après depthMax, hors run.card (résolu par resolveFinale) —
  // même règle d'horizon (icône coffre visible seulement si atteint dans le champ de visibilité).
  var finaleCls = run.depth >= depthMax ? " is-done" : (horizon >= depthMax ? " is-upcoming" : " is-hidden");
  h += '<i class="scene-progress-seg scene-progress-finale' + finaleCls + '">' + (horizon >= depthMax || run.depth >= depthMax ? "🏆" : "") + '</i>';
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

  var h = SCENE_PATH_TEMPLATE_IDS.indexOf(run.templateId) !== -1 ? buildScenePathHTML(run) : buildSceneProgressHTML(run);
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

/* --- Choix de profil (Petites Aventures uniquement, v3.125.0) --- */
/* Concept §2 : Bourrin (rapide, plus de combats, aucun bloqueur) vs Prudent (plus long,
   peu/pas de combat, 1-2 bloqueurs "carotte"). Choisi une seule fois, avant la préparation
   — génère réellement la carte (voir SceneRunManager.chooseProfile). */

function buildSceneProfileChoiceHTML() {
  var run = SceneRunManager.getRun();
  if (!run) return "";
  var template = SceneEngine.getTemplate(run.templateId);

  var h = '<div class="panel-title">' + esc(template.title) + '</div>';
  h += '<div class="scene-screen">';
  h += '  <div class="scene-heading">';
  h += '    <div class="scene-heading-title">Choisis ton approche</div>';
  h += '    <div class="scene-heading-text">Le butin final est identique quel que soit ton choix — seul le chemin change.</div>';
  h += '  </div>';

  h += '  <div class="scene-card-grid">';
  h += '<button type="button" class="scene-card" onclick="chooseSceneProfile(\'bourrin\')">';
  h += '<span class="scene-card-icon">⚔️</span>';
  h += '<span class="scene-card-label">Bourrin</span>';
  h += '<span class="scene-card-sub">Rapide, plus de combats, aucune attente.</span>';
  h += '</button>';
  h += '<button type="button" class="scene-card" onclick="chooseSceneProfile(\'prudent\')">';
  h += '<span class="scene-card-icon">🛡️</span>';
  h += '<span class="scene-card-label">Prudent</span>';
  h += '<span class="scene-card-sub">Plus long, peu de combats, quelques attentes à faire pendant que tu vaques à autre chose.</span>';
  h += '</button>';
  h += '  </div>';
  h += '</div>';
  return h;
}

function chooseSceneProfile(profileId) {
  var result = SceneRunManager.chooseProfile(profileId);
  if (!result.ok) {
    showToast(result.reason, 1600);
    return;
  }
  sceneLog(profileId === "bourrin" ? "Tu pars en terrain conquérant." : "Tu pars à pas mesurés.");
  refreshSceneScreen();
}
window.chooseSceneProfile = chooseSceneProfile;

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

/* v3.142.0 : extrait de buildSceneGateChoiceHTML — label/sub/subClass/icon d'un slot, réutilisé
   par la grille de cartes historique (canevas à plusieurs portes) ET par la fiche unique du
   nouveau chemin illustré (canevas à 1 porte, ex. Petite Aventure). Comportement inchangé (même
   logique torche/estimate/gainHint qu'avant cette extraction). */
function buildSceneSlotInfo(run, slot, torchOn) {
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
  return { icon: icon, label: label, sub: sub, subClass: subClass };
}

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

  // v3.142.0 : sur le chemin illustré (1 porte/palier), plus de grille de boutons — le clic se
  // fait directement sur le nœud courant du chemin (buildScenePathNodeHTML). Ici, une fiche
  // UNIQUE en lecture seule (même info label/sub/estimate qu'avant), sans action propre.
  if (SCENE_PATH_TEMPLATE_IDS.indexOf(run.templateId) !== -1 && level.length === 1) {
    var info = buildSceneSlotInfo(run, level[0], torchOn);
    h += '  <div class="scene-card scene-card-solo">';
    h += '<span class="scene-card-icon">' + esc(info.icon) + '</span>';
    h += '<span class="scene-card-label">' + esc(info.label) + '</span>';
    h += '<span class="scene-card-sub' + (info.subClass ? ' ' + info.subClass : '') + '">' + esc(info.sub) + '</span>';
    h += '<span class="scene-card-solo-hint">Touche le nœud sur le chemin pour t\u2019y engager.</span>';
    h += '  </div>';
  } else {
    h += '  <div class="scene-card-grid">';
    level.forEach(function (slot, idx) {
      var info = buildSceneSlotInfo(run, slot, torchOn);
      h += '<button type="button" class="scene-card" onclick="enterSceneGate(' + idx + ')">';
      h += '<span class="scene-card-icon">' + esc(info.icon) + '</span>';
      h += '<span class="scene-card-label">' + esc(info.label) + '</span>';
      h += '<span class="scene-card-sub' + (info.subClass ? ' ' + info.subClass : '') + '">' + esc(info.sub) + '</span>';
      h += '</button>';
    });
    h += '  </div>';
  }

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
  if (type === "bloqueur") return buildSceneBloqueurHTML(run); // v3.125.0 (Petites Aventures)
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

/* --- Nœud bloqueur (Petites Aventures, profil Prudent, v3.125.0) --- */
/* Concept §2 "fonction du bloqueur" : pensé comme une carotte, pas une attente morte —
   pendant ces 5-10 min le joueur est encouragé à faire autre chose au village. Le minuteur
   tourne en fond (timestamp, voir SceneRunManager.isBlockerReady) : rien n'empêche de quitter
   l'écran, changer d'onglet, revenir plus tard — cet écran affiche juste où en est l'attente
   si le joueur reste dessus, sans setInterval ni polling forcé (refreshSceneScreen suffit à
   chaque retour sur l'onglet "scene", voir switchTab). */

/* mm:ss simple — pas de dépendance à un formateur global (aucun formatDuration* dans le
   codebase à ce jour, voir grep effectué avant écriture). */
function sceneFormatRemaining(ms) {
  var totalSec = Math.max(0, Math.ceil(ms / 1000));
  var min = Math.floor(totalSec / 60);
  var sec = totalSec % 60;
  return min + ":" + (sec < 10 ? "0" : "") + sec;
}

function buildSceneBloqueurHTML(run) {
  var ready = SceneRunManager.isBlockerReady();
  var remainingMs = SceneRunManager.blockerRemainingMs();
  var remainingLabel = sceneFormatRemaining(remainingMs);

  var h = '<div class="panel-title">Chemin long</div>';
  h += '<div class="scene-screen">';
  h += buildSceneStatusBarHTML(run, { hideLeave: true }); // v3.125.0 : Rentrer masqué ici, voir note ci-dessous
  h += '  <div class="scene-heading">';
  h += '    <div class="scene-heading-title">' + (ready ? "Le chemin est dégagé." : "Le chemin est long.") + '</div>';
  h += '    <div class="scene-heading-text">' + (ready
    ? "Tu peux continuer ta route."
    : "Encore " + esc(remainingLabel) + " (mm:ss) — profites-en pour avancer au village, la route t\u2019attendra.") + '</div>';
  h += '  </div>';
  h += '  <div class="scene-actions">';
  if (ready) {
    h += '    <button class="settings-btn primary" type="button" onclick="resolveSceneBloqueur()">Continuer</button>';
  } else {
    h += '    <button class="settings-btn primary" type="button" onclick="switchTab(\'village\')">Aller au village</button>';
  }
  h += '  </div>';
  h += '</div>';
  return h;
}

/* Rentrer masqué pendant un bloqueur : l'expédition est engagée, le joueur PEUT quitter
   l'onglet (aucun blocage réel), mais "Rentrer au camp" abandonnerait le run et perdrait la
   position — cohérent avec le hideLeave déjà utilisé pour la chambre finale/préparation. Le
   joueur revient simplement sur l'onglet "scene" plus tard, le bloqueur l'y attend. */

function resolveSceneBloqueur() {
  var result = SceneRunManager.resolveBloqueur();
  if (!result.ok) { showToast(result.reason, 1600); return; }
  sceneLog("Le chemin est enfin dégagé. +" + result.gainAmount);
  refreshSceneScreen();
}
window.resolveSceneBloqueur = resolveSceneBloqueur;

/* --- Combat en cours (Petites Aventures, profil Bourrin, v3.126.0) --- */
/* Écran affiché seulement si le joueur revient sur l'onglet "scene" pendant un combat en
   cours (enterGate a déjà fait switchTab("combat") — ce cas est donc rare, ex. navigation
   arrière). Aucune action ici : le combat doit être résolu ou fui depuis l'onglet Combat lui-même. */
function buildSceneCombatPendingHTML(run) {
  var h = '<div class="panel-title">Combat en cours</div>';
  h += '<div class="scene-screen">';
  h += '  <div class="scene-heading">';
  h += '    <div class="scene-heading-text">Un affrontement t\u2019attend.</div>';
  h += '  </div>';
  h += '  <div class="scene-actions">';
  h += '    <button class="settings-btn primary" type="button" onclick="switchTab(\'combat\')">Reprendre le combat</button>';
  h += '  </div>';
  h += '</div>';
  return h;
}

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
