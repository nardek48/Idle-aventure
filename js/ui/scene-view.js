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
  if (estimate === "high") return _t("Bonne chance");
  if (estimate === "medium") return _t("Chance moyenne");
  return _t("Faible chance");
}

var SCENE_STAT_LABELS = { power: _t("Puissance"), precision: _t("Précision"), endurance: _t("Endurance") }; // v3.370.0 : traduits à la définition (i18n D2)

/* --- Routeur principal de l'onglet "scene" (appelé par renderPanel(), case "scene") --- */

function buildSceneScreenHTML() {
  var run = SceneRunManager.getRun();
  if (!run || run.status === "completed") {
    return buildSceneLandingHTML();
  }
  if (run.status === "profile") return buildSceneProfileChoiceHTML(); // v3.125.0 (Petites Aventures)
  if (run.status === "intensity") return buildSceneIntensityChoiceHTML(); // v3.195.0
  if (run.status === "mutator-announce") return buildSceneMutatorAnnounceHTML(); // v3.196.0
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
  if (game.sceneRun && game.sceneRun.status === "completed") {
    return buildSceneCompleteHTML(); // bilan pas encore consulté (ex. reprise post-rechargement)
  }
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
  sceneRunLog = [];
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
   dans l'horizon affiche l'icône réelle de son type (SCENE_NODES.icons) ; au-delà, un <img class=ico-inline src=images/Icons/scene/node_unknown.png> muet.
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
/* v3.142.0 : canevas qui utilisent le chemin illustré (1 seul nœud cliquable par palier,
   enterSceneGate(0) en dur dans buildScenePathNodeHTML). v3.195.0 (gatesPerDepth [2,2] sur la
   Petite Aventure) : petite_aventure_foret RETIRÉ de cette liste — le chemin illustré suppose
   structurellement 1 porte/palier (un seul nœud rendu, clic figé sur l'index 0), incompatible
   avec 2 portes sans refonte visuelle (afficher 2 nœuds cliquables par palier). Bascule donc
   sur buildSceneProgressHTML (barre segmentée) + la grille de cartes de
   buildSceneGateChoiceHTML — chemin déjà emprunté par expedition_faille, zéro code neuf à
   risque. Remettre ce canevas ici nécessiterait d'abord d'adapter buildScenePathNodeHTML à un
   nombre de portes variable (chantier UI distinct, pas fait dans ce lot). */
var SCENE_PATH_TEMPLATE_IDS = [];

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
    icon = isVisible ? "<img class=ico-inline src=images/Icons/scene/final_reward.png>" : "";
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
  h += '<span class="scene-path-node-circle">' + (icon ? renderIconOrEmojiHTML(icon, "scene-node-ico", "") : "") + '</span>';
  h += "</" + tag + ">";
  return h;
}

function buildScenePathHTML(run) {
  var template = SceneEngine.getTemplate(run.templateId);
  var depthMax = Number(template.depthMax || 1);
  var horizon = SceneRunManager.getVisibilityHorizon(); // v3.196.0 (centralisé, Brouillard)

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
  // v3.195.0 : depthMax RÉEL du run = intensité choisie si présente (SCENE_INTENSITY), sinon
  // template.depthMax (canevas sans intensité, ex. expedition_faille — inchangé). Même règle
  // que SceneRunManager._advanceOrFinish, jamais désynchronisée.
  var intensity = (run.intensity && window.SCENE_INTENSITY) ? window.SCENE_INTENSITY[run.intensity] : null;
  var depthMax = (intensity && intensity.depthMax) || Number(template.depthMax || 1);
  var horizon = SceneRunManager.getVisibilityHorizon(); // v3.196.0 (centralisé, Brouillard)

  var h = '<div class="scene-progress">';
  for (var i = 0; i < depthMax; i++) {
    var cls = i < run.depth ? " is-done" : (i === run.depth ? " is-current" : (i <= horizon ? " is-upcoming" : " is-hidden"));
    var icon = "";
    if (i <= horizon || i < run.depth) {
      var level = run.card[i] || [];
      var slotType = level[0] && level[0].type;
      icon = (slotType && SCENE_NODES.icons[slotType]) || "";
    }
    h += '<i class="scene-progress-seg' + cls + '">' + (icon ? renderIconOrEmojiHTML(icon, "scene-seg-ico", "") : "") + '</i>';
  }
  // Chambre finale : nœud virtuel après depthMax, hors run.card (résolu par resolveFinale) —
  // même règle d'horizon (icône coffre visible seulement si atteint dans le champ de visibilité).
  var finaleCls = run.depth >= depthMax ? " is-done" : (horizon >= depthMax ? " is-upcoming" : " is-hidden");
  h += '<i class="scene-progress-seg scene-progress-finale' + finaleCls + '">' + (horizon >= depthMax || run.depth >= depthMax ? "<img class=ico-inline src=images/Icons/scene/final_reward.png>" : "") + '</i>';
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
    lootLabel = _t("Or");
  } else {
    var resDef = (window.WAREHOUSE_RESOURCES || {})[template.lootResource];
    lootLabel = (resDef && resDef.name) ? _td(resDef.name) : template.lootResource;
  }

  // v3.195.0 : depthMax RÉEL du run = intensité si présente (même règle que
  // buildSceneProgressHTML/_advanceOrFinish) — corrige un affichage figé sur template.depthMax
  // resté en dur depuis le lot précédent (repéré en posant le mutateur "Nuit noire" ici).
  var displayIntensity = (run.intensity && window.SCENE_INTENSITY) ? window.SCENE_INTENSITY[run.intensity] : null;
  var displayDepthMax = (displayIntensity && displayIntensity.depthMax) || Number(template.depthMax || 1);

  var h = SCENE_PATH_TEMPLATE_IDS.indexOf(run.templateId) !== -1 ? buildScenePathHTML(run) : buildSceneProgressHTML(run);
  h += '<div class="scene-status-bar">';
  h += '<span class="scene-status-pill scene-status-depth">' + _t("Profondeur {a}/{b}", { a: run.depth + 1, b: displayDepthMax }) + '</span>';
  h += '<span class="scene-status-pill scene-status-loot">' + esc(lootLabel) + ' : ' + lootAmount + '</span>';
  // v3.198.0 : le plafond vient du canevas (template.maxInjuries) — la Petite Aventure
  // evacue a 2, expedition_faille et les quetes migrees restent a 3.
  var injuryMax = SceneRunManager.getMaxInjuries(run.templateId);
  h += '<span class="scene-status-pill scene-status-injury' + (run.injuries.length >= injuryMax - 1 ? ' is-low' : '') + '">' + _t("Blessures : {a}/{b}", { a: run.injuries.length, b: injuryMax }) + '</span>';
  // v3.195.0 : pastille Souffle — seuils visuels (is-low sous 30, cohérent avec le seuil qui
  // rend l'option "power" indisponible pour la plupart des gabarits, breathCost 3).
  if (typeof run.breath === "number") {
    // v3.199.0 : seuil d'alerte relevé de 30 à 40. La voie d'endurance coûte 20 et le passage
    // de palier 5 : sous 40, le joueur est déjà à deux paliers de l'épuisement, c'est là qu'il
    // doit le voir, pas quand il est trop tard pour boire ou viser une source.
    h += '<span class="scene-status-pill scene-status-breath' + (run.breath < 40 ? ' is-low' : '') + '">' + _t("Souffle : {n}/100", { n: Math.round(run.breath) }) + '</span>';
  }
  if (run.torchCharges > 0) h += '<span class="scene-status-pill">' + _t("Torche x{n}", { n: run.torchCharges }) + '</span>';
  // v3.198.0 : corde et provisions ont des charges — le joueur doit les voir fondre.
  if (Number(run.ropeCharges || 0) > 0) h += '<span class="scene-status-pill">' + _t("Corde x{n}", { n: run.ropeCharges }) + '</span>';
  if (Number(run.provisionCharges || 0) > 0) h += '<span class="scene-status-pill">' + _t("Provisions x{n}", { n: run.provisionCharges }) + '</span>';
  // v3.196.0 : pastille mutateur, visible tout le run (pas seulement à l'annonce) — omise si
  // "aucun" (rien à rappeler au joueur dans ce cas, cohérent avec les autres pastilles qui
  // n'apparaissent que si pertinentes, ex. torche).
  var statusMutator = SceneRunManager.getActiveMutator();
  if (statusMutator.id && statusMutator.id !== "aucun") {
    h += '<span class="scene-status-pill scene-status-mutator">' + renderIconOrEmojiHTML(statusMutator.icon, "scene-pill-ico", "") + ' ' + esc(_td(statusMutator.label)) + '</span>';
  }
  h += '</div>';
  // v3.195.0 : bouton Gourde, utilisable à tout moment tant qu'elle est en loadout et que le
  // Souffle n'est pas déjà au maximum (même emplacement que le bouton torche, juste après la
  // barre de statut — voir buildSceneGateChoiceHTML pour le placement exact du bloc torche).
  if (run.gourdeAvailable && run.breath < 100) {
    h += '<div class="scene-actions" style="margin-top:0;margin-bottom:8px;">';
    // v3.304.0 : montant réel (40 avec l'Autel de pierre tenu), gorgées restantes si comptées
    var gorgees = run.gourdeUses != null ? (run.gourdeUses > 1 ? ", " + _t("{n} gorgées", { n: run.gourdeUses }) : ", " + _t("dernière gorgée")) : "";
    h += '  <button class="settings-btn" type="button" onclick="useSceneGourde()">' + _t("Boire à la gourde (+{n} Souffle{g})", { n: SceneRunManager.getGourdeAmount(), g: gorgees }) + '</button>';
    h += '</div>';
  }
  // v3.303.0 : objets à boire (l'Outre pleine), une charge par exemplaire emporté
  if (run.breathItems && run.breath < 100) {
    var tplB = SceneEngine.getTemplate(run.templateId);
    Object.keys(run.breathItems).forEach(function (itemId) {
      if (!(Number(run.breathItems[itemId] || 0) > 0) || !tplB.items[itemId]) return;
      h += '<div class="scene-actions" style="margin-top:0;margin-bottom:8px;">';
      h += '  <button class="settings-btn" type="button" onclick="useSceneBreathItem(\'' + esc(itemId) + '\')">' + esc(_t("Boire : {x} (+{n} Souffle{c})", { x: _td(tplB.items[itemId].name), n: SceneRunManager.getBreathItemAmount(itemId, tplB), c: run.breathItems[itemId] > 1 ? ', x' + run.breathItems[itemId] : '' })) + '</button>';
      h += '</div>';
    });
  }
  // v3.198.0 : bouton Provisions, meme emplacement et memes conditions d'affichage que la
  // gourde (charge restante + un effet reel a produire). Seul moyen d'effacer une blessure
  // grave : l'autel et la source ne retirent que les legeres.
  if (Number(run.provisionCharges || 0) > 0 && run.injuries.length > 0) {
    h += '<div class="scene-actions" style="margin-top:0;margin-bottom:8px;">';
    h += '  <button class="settings-btn" type="button" onclick="useSceneProvision()">' + _t("Manger les provisions (soigne la pire blessure)") + '</button>';
    h += '</div>';
  }
  // Bouton "Rentrer" toujours accessible tant que le run est engagé (décision Seb : le
  // joueur doit pouvoir sortir quand il veut, pas seulement sur l'écran de choix de porte).
  // Masqué pendant la préparation (le run n'a pas vraiment commencé) et la chambre finale
  // (rentrer n'a plus de sens, il ne reste que les deux coffres) via opts.hideLeave.
  if (!opts.hideLeave) {
    h += '<div class="scene-actions scene-actions-leave">';
    h += '  <button class="settings-btn scene-btn-leave" type="button" onclick="leaveSceneNow()">' + _t("Rentrer au camp") + '</button>';
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

  var h = '<div class="panel-title">' + esc(_td(template.title)) + '</div>';
  h += '<div class="scene-screen">';
  h += '  <div class="scene-heading">';
  h += '    <div class="scene-heading-title">' + _t("Choisis ton approche") + '</div>';
  // v3.256.0 (Cartes Vivantes, C-2) : run ciblé — le secteur, sa ligne de lore, et l'intensité que l'anneau impose.
  if (run.livingMap && window.LivingMapManager) {
    var lmDef = LivingMapManager.getSectorDef(run.livingMap.mapId, run.livingMap.sectorId);
    var lmInt = lmDef && window.SCENE_INTENSITY && SCENE_INTENSITY[LivingMapManager.getIntensity(lmDef)];
    if (lmDef) h += '    <div class="scene-map-target"><b>' + esc(_td(lmDef.name)) + '</b> · ' + esc(lmInt ? _td(lmInt.label) : "") + ' — ' + esc(_td(lmDef.lore || "")) + '</div>';
  }
  h += '    <div class="scene-heading-text">' + _t("Le butin final est identique quel que soit ton choix — seul le chemin change.") + '</div>';
  h += '  </div>';

  h += '  <div class="scene-card-grid">';
  h += '<button type="button" class="scene-card" onclick="chooseSceneProfile(\'bourrin\')">';
  h += '<span class="scene-card-icon"><img class=ico-inline src=images/Icons/combat_stats/stat_attack.png></span>';
  h += '<span class="scene-card-label">' + _t("Bourrin") + '</span>';
  h += '<span class="scene-card-sub">' + _t("Rapide, plus de combats, aucune attente.") + '</span>';
  h += '</button>';
  h += '<button type="button" class="scene-card" onclick="chooseSceneProfile(\'prudent\')">';
  h += '<span class="scene-card-icon"><img class=ico-inline src=images/Icons/combat_stats/stat_defense.png></span>';
  h += '<span class="scene-card-label">' + _t("Prudent") + '</span>';
  h += '<span class="scene-card-sub">' + _t("Plus long, peu de combats, quelques attentes à faire pendant que tu vaques à autre chose.") + '</span>';
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
  sceneLog(profileId === "bourrin" ? _t("Tu pars en terrain conquérant.") : _t("Tu pars à pas mesurés."));
  refreshSceneScreen();
}
window.chooseSceneProfile = chooseSceneProfile;

/* --- Choix d'intensité (v3.195.0) --- */
/* ORTHOGONAL au profil (déjà choisi juste avant) : profil = nature du parcours (combats,
   bloqueurs), intensité = ampleur du risque/gain sur ce parcours (longueur, difficulté,
   multiplicateur de butin). SCENE_INTENSITY, data/scene-templates.js. */

function buildSceneIntensityChoiceHTML() {
  var run = SceneRunManager.getRun();
  if (!run) return "";
  var template = SceneEngine.getTemplate(run.templateId);

  var h = '<div class="panel-title">' + esc(_td(template.title)) + '</div>';
  h += '<div class="scene-screen">';
  h += '  <div class="scene-heading">';
  h += '    <div class="scene-heading-title">' + _t("Choisis ton intensité") + '</div>';
  h += '    <div class="scene-heading-text">' + _t("Plus le parcours est long et périlleux, plus le butin final est important.") + '</div>';
  h += '  </div>';

  h += '  <div class="scene-card-grid">';
  Object.keys(SCENE_INTENSITY).forEach(function (key) {
    var intensity = SCENE_INTENSITY[key];
    h += '<button type="button" class="scene-card" onclick="chooseSceneIntensity(\'' + esc(key) + '\')">';
    h += '<span class="scene-card-icon">' + renderIconOrEmojiHTML(intensity.icon, "scene-card-ico", "") + '</span>';
    h += '<span class="scene-card-label">' + esc(_td(intensity.label)) + '</span>';
    h += '<span class="scene-card-sub">' + esc(_td(intensity.desc)) + '</span>';
    h += '</button>';
  });
  h += '  </div>';
  h += '</div>';
  return h;
}

function chooseSceneIntensity(intensityId) {
  var result = SceneRunManager.chooseIntensity(intensityId);
  if (!result.ok) {
    showToast(result.reason, 1600);
    return;
  }
  var intensity = SCENE_INTENSITY[intensityId];
  sceneLog(_t("{x}. Le chemin est posé.", { x: _td(intensity.label) })); // v3.197.0 (bible B §4.4)
  refreshSceneScreen();
}
window.chooseSceneIntensity = chooseSceneIntensity;

/* --- Annonce du mutateur de run (v3.196.0) --- */
/* Écran court, sans choix : juste faire savoir au joueur ce qui l'attend AVANT la préparation
   (loadout), pour qu'il compose en connaissance de cause (ex. prendre la Gourde s'il sait que
   la Pluie va augmenter le coût en Souffle). */

function buildSceneMutatorAnnounceHTML() {
  var run = SceneRunManager.getRun();
  if (!run) return "";
  var template = SceneEngine.getTemplate(run.templateId);
  var mutator = SceneRunManager.getActiveMutator();

  var h = '<div class="panel-title">' + esc(_td(template.title)) + '</div>';
  h += '<div class="scene-screen">';
  h += '  <div class="scene-mutator-announce">';
  h += '    <span class="scene-mutator-icon">' + renderIconOrEmojiHTML(mutator.icon || "images/Icons/scene/weather_clear.png", "scene-mutator-img", "") + '</span>';
  h += '    <div class="scene-mutator-label">' + esc(mutator.label ? _td(mutator.label) : _t("Rien à signaler")) + '</div>';
  h += '    <div class="scene-mutator-desc">' + esc(_td(mutator.desc || "")) + '</div>';
  h += '  </div>';
  h += '  <div class="scene-actions">';
  h += '    <button type="button" class="settings-btn" onclick="acknowledgeSceneMutator()">' + _t("Continuer") + '</button>';
  h += '  </div>';
  h += '</div>';
  return h;
}

function acknowledgeSceneMutator() {
  var result = SceneRunManager.acknowledgeMutator();
  if (!result.ok) {
    showToast(result.reason, 1600);
    return;
  }
  refreshSceneScreen();
}
window.acknowledgeSceneMutator = acknowledgeSceneMutator;

/* --- Préparation : choix de 3 objets --- */

var scenePrepSelected = [];

function buildScenePreparationHTML() {
  var run = SceneRunManager.getRun();
  if (!run) return "";
  var template = SceneEngine.getTemplate(run.templateId);
  var slots = Number(template.loadoutSlots || 3);

  var h = '<div class="panel-title">' + _t("Préparation de l’expédition") + '</div>';
  h += '<div class="scene-screen">';
  h += '  <div class="scene-heading">';
  h += '    <div class="scene-heading-title">' + esc(_td(template.title)) + '</div>';
  h += '    <div class="scene-heading-text">' + _t("Choisis {n} objets pour ton départ ({a}/{n}). Ton équipement décide de ton style d’expédition.", { n: slots, a: scenePrepSelected.length }) + '</div>';
  h += '  </div>';

  h += '  <div class="scene-card-grid">';
  var offerUnique = template.loadoutOffer.filter(function (id, i) { return template.loadoutOffer.indexOf(id) === i; });
  offerUnique.forEach(function (itemId) {
    var item = template.items[itemId];
    var maxCopies = template.loadoutOffer.filter(function (id) { return id === itemId; }).length;
    var selectedCount = scenePrepSelected.filter(function (id) { return id === itemId; }).length;
    var full = scenePrepSelected.length >= slots;
    var atMax = selectedCount >= maxCopies;
    // v3.303.0 : objet payé en ressource (l'Outre) — le stock borne ce qu'on peut emporter
    var stock = (item.consumes && window.WarehouseManager) ? Number(WarehouseManager.getAmount(item.consumes.resourceId) || 0) : null;
    if (stock !== null && selectedCount >= Math.floor(stock / Number(item.consumes.amount || 1))) atMax = true;
    var disabled = (full && selectedCount === 0) || atMax;
    var badge = selectedCount > 0 ? ' (x' + selectedCount + ')' : '';
    h += '<button type="button" class="scene-card' + (selectedCount > 0 ? ' is-selected' : '') + '"'
      + ' onclick="toggleScenePrepItem(\'' + esc(itemId) + '\')"' + (disabled && selectedCount === 0 ? ' disabled' : '') + '>';
    h += '<span class="scene-card-icon">' + renderIconOrEmojiHTML(item.icon, "scene-card-ico", "") + '</span>';
    h += '<span class="scene-card-label">' + esc(_td(item.name)) + esc(badge) + '</span>';
    h += '<span class="scene-card-sub">' + esc(_td(item.desc)) + (maxCopies > 1 ? ' ' + _t("(max {n})", { n: maxCopies }) : '') + (stock !== null ? ' — ' + _t("en stock : {n}", { n: stock }) : '') + '</span>';
    h += '</button>';
  });
  h += '  </div>';

  h += '  <div class="scene-actions">';
  h += '    <button class="settings-btn primary" type="button"' + (scenePrepSelected.length === slots ? '' : ' disabled') + ' onclick="confirmScenePreparation()">' + esc(template.departLabel ? _td(template.departLabel) : _t("Descendre dans la faille")) + '</button>'; // v3.304.0 : libellé par canevas
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
  sceneLog(_t("Départ, équipé de : {x}", { x: scenePrepSelected.map(function (id) { return _td(template.items[id].name); }).join(", ") }));
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
    sub = _td(SCENE_NODES.silhouettes.mystere) + "\u2026";
  } else if (slot.type === "obstacle") {
    var gabarit = SCENE_NODES.obstacles[slot.gabaritId];
    var bestEstimate = "low";
    var order = { low: 0, medium: 1, high: 2 };
    // v3.195.0 : diffMult (profil de l'option x intensité de run) composé via
    // SceneRunManager._obstacleFactors — même calcul que getObstacleEstimate (résolution
    // réelle), pour ne jamais désynchroniser cet aperçu-avant-porte du calcul qui suivra.
    // v3.198.0 : l'apercu ne considere que les voies REELLEMENT exposees par ce noeud
    // (slot.voies), sinon la porte s'annoncerait sur une approche que le joueur ne pourra
    // pas prendre une fois entre.
    SceneEngine.nodeVoies(gabarit, slot).forEach(function (key) {
      var statEff = SceneRunManager.statEffective(run, gabarit.options[key].stat);
      var factors = SceneRunManager._obstacleFactors(run, key);
      var e = SceneEngine.estimateObstacle(gabarit, key, statEff, run.depth, slot.riskMod, factors.diffMult);
      if (order[e] > order[bestEstimate]) bestEstimate = e;
    });
    var riskLvl = SceneEngine.riskLevel(slot.riskMod);
    var gainLabel = _td(SCENE_NODES.gainHints[riskLvl]);
    if (torchOn) {
      label = _td(gabarit.name);
      sub = sceneEstimateLabel(bestEstimate) + " — " + gainLabel;
    } else {
      // Sans torche : indice qualitatif au lieu d'un simple "???" (décision Seb 03/09/2026 :
      // un "???" pur ne donnait aucune base de décision). v3.121.0 : le gain relatif à la
      // porte (SCENE_NODES.gainHints) est TOUJOURS visible, torche ou non — c'est lui qui
      // rend le choix risque/récompense réel, la torche ne précise que la chance de réussite.
      label = _td(SCENE_NODES.labels.obstacle);
      sub = _td(SCENE_NODES.hints.obstacle[bestEstimate]) + " — " + gainLabel;
    }
    subClass = sceneEstimateClass(bestEstimate);
  } else if (torchOn) {
    label = _td(SCENE_NODES.labels[slot.type] || "???");
    sub = _td(SCENE_NODES.silhouettes[slot.type]);
  } else {
    label = _td(SCENE_NODES.labels[slot.type] || "???");
    sub = _td(SCENE_NODES.hints[slot.type] || SCENE_NODES.silhouettes[slot.type]);
  }
  return { icon: icon, label: label, sub: sub, subClass: subClass };
}

/* v3.298.0 (W-1b) : lignes du journal scripté dues à ce moment du run (canevas à journalByDepth). */
function sceneFlushScriptedJournal(run) {
  if (!window.SceneRunManager || typeof SceneRunManager.takeJournalLines !== "function") return;
  SceneRunManager.takeJournalLines(run).forEach(function (line) { sceneLog(esc(_td(line))); });
}

function buildSceneGateChoiceHTML() {
  var run = SceneRunManager.getRun();
  if (!run) return "";
  sceneFlushScriptedJournal(run);
  var template = SceneEngine.getTemplate(run.templateId);
  var level = SceneRunManager.getCurrentLevel();
  var torchOn = SceneRunManager.torchActiveThisLevel();

  var h = '<div class="panel-title">' + esc(_td(template.title)) + '</div>';
  h += '<div class="scene-screen">';
  h += buildSceneStatusBarHTML(run);
  h += '  <div class="scene-heading">';
  h += '    <div class="scene-heading-title">' + _t("Profondeur {n}", { n: run.depth + 1 }) + '</div>';
  h += '    <div class="scene-heading-text">' + (torchOn ? _t("{n} passages s’ouvrent devant toi (torche active).", { n: level.length }) : _t("{n} passages s’ouvrent devant toi.", { n: level.length })) + '</div>';
  h += '  </div>';

  if (!torchOn && run.torchCharges > 0) {
    h += '  <div class="scene-actions" style="margin-top:0;margin-bottom:8px;">';
    h += '    <button class="settings-btn" type="button" onclick="useSceneTorch()">' + _tn(run.torchCharges, "Utiliser la torche ({n} restante)", "Utiliser la torche ({n} restantes)") + '</button>';
    h += '  </div>';
  }

  // v3.142.0 : sur le chemin illustré (1 porte/palier), plus de grille de boutons — le clic se
  // fait directement sur le nœud courant du chemin (buildScenePathNodeHTML). Ici, une fiche
  // UNIQUE en lecture seule (même info label/sub/estimate qu'avant), sans action propre.
  if (SCENE_PATH_TEMPLATE_IDS.indexOf(run.templateId) !== -1 && level.length === 1) {
    var info = buildSceneSlotInfo(run, level[0], torchOn);
    h += '  <div class="scene-card scene-card-solo">';
    h += '<span class="scene-card-icon">' + renderIconOrEmojiHTML(info.icon, "scene-card-ico", "") + '</span>';
    h += '<span class="scene-card-label">' + esc(info.label) + '</span>';
    h += '<span class="scene-card-sub' + (info.subClass ? ' ' + info.subClass : '') + '">' + esc(info.sub) + '</span>';
    h += '<span class="scene-card-solo-hint">' + _t("Touche le nœud sur le chemin pour t’y engager.") + '</span>';
    h += '  </div>';
  } else {
    h += '  <div class="scene-card-grid">';
    level.forEach(function (slot, idx) {
      var info = buildSceneSlotInfo(run, slot, torchOn);
      h += '<button type="button" class="scene-card" onclick="enterSceneGate(' + idx + ')">';
      h += '<span class="scene-card-icon">' + renderIconOrEmojiHTML(info.icon, "scene-card-ico", "") + '</span>';
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

function useSceneProvision() {
  var result = SceneRunManager.useSceneProvision();
  if (!result.ok) { showToast(result.reason, 1600); return; }
  sceneLog(_t("Tu manges. La plaie se referme.")); // v3.197.0 (bible B : narrateur proche, concret)
  refreshSceneScreen();
}
window.useSceneProvision = useSceneProvision;

function useSceneGourde() {
  var result = SceneRunManager.useSceneGourde();
  if (!result.ok) {
    showToast(result.reason, 1600);
    return;
  }
  sceneLog(_t("Tu reprends ton souffle."));
  refreshSceneScreen();
}
window.useSceneGourde = useSceneGourde;

function enterSceneGate(idx) {
  var result = SceneRunManager.enterGate(idx);
  if (!result.ok) {
    showToast(result.reason, 1600);
    return;
  }
  // v3.199.0 : le franchissement peut vider le Souffle (coût de palier) ou tomber sur un
  // obstacle dont aucune voie n'est payable. Le run est déjà clos côté manager, on annonce.
  if (result.outcome === "epuisement") sceneLog(_t("Tu n’en peux plus. On te ramène."));
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
  if (type === "evenement") return buildSceneEventHTML(run); // v3.312.0 (W-3d)
  return buildSceneGateChoiceHTML();
}

/* --- Événement à branches (v3.312.0, W-3d, bible B §5) ---
   L'annonce, puis une branche par bouton ; le coût est dans le libellé, jamais de jugement.
   Une branche impayable reste visible, grisée. La conséquence immédiate va au journal. */
function buildSceneEventHTML(run) {
  var ev = SceneRunManager.getPendingEvent();
  if (!ev) return buildSceneGateChoiceHTML();
  var h = '<div class="panel-title">' + esc(ev.title ? _td(ev.title) : _t("Quelqu'un")) + '</div>';
  h += '<div class="scene-screen">';
  h += buildSceneStatusBarHTML(run);
  h += '  <div class="scene-heading"><div class="scene-heading-text">' + esc(_td(ev.annonce)) + '</div></div>';
  h += '  <div class="scene-actions scene-event-actions">';
  ev.branches.forEach(function (b) {
    var ok = SceneRunManager.canTakeEventBranch(b);
    h += '    <button class="settings-btn' + (b.id === "passer" ? '' : ' primary') + '" type="button"' + (ok ? ' onclick="resolveSceneEvent(\'' + esc(b.id) + '\')"' : ' disabled') + '>' + esc(_td(b.label)) + '</button>';
  });
  h += '  </div>';
  h += buildSceneLogHTML();
  h += '</div>';
  return h;
}

function resolveSceneEvent(branchId) {
  var result = SceneRunManager.resolveEvent(branchId);
  if (!result.ok) { showToast(result.reason, 1600); return; }
  sceneLog(esc(_td(result.text)));
  refreshSceneScreen();
}
window.resolveSceneEvent = resolveSceneEvent;
window.buildSceneEventHTML = buildSceneEventHTML;

/* v3.195.0 : icônes/labels de gain relatif par profil d'option (power/precision/endurance),
   affichés sur chaque carte d'obstacle pour rendre le triangle risque/gain/coût lisible
   d'un coup d'œil, sans dupliquer les chiffres exacts de SCENE_NODES.optionProfiles. */
var SCENE_OPTION_GAIN_LABELS = { power: _t("Gros butin"), precision: _t("Bon butin"), endurance: _t("Butin modeste") }; // v3.370.0 : traduits à la définition

function buildSceneObstacleHTML(run) {
  var gabarit = SCENE_NODES.obstacles[run.pendingNode.gabaritId];
  var h = '<div class="panel-title">' + esc(_td(gabarit.name)) + '</div>';
  h += '<div class="scene-screen">';
  h += buildSceneStatusBarHTML(run);
  h += '  <div class="scene-heading">';
  h += '    <div class="scene-heading-text">' + _t("Choisis ton approche.") + '</div>';
  h += '  </div>';

  h += '  <div class="scene-card-grid">';
  // v3.198.0 : seules les voies tirees pour ce noeud sont jouables (template.optionsPerNode).
  // Meme source de verite que la resolution (SceneEngine.nodeVoies) : jamais deux listes.
  var pendingSlot = (SceneRunManager.getCurrentLevel() || [])[run.currentGate] || run.pendingNode;
  SceneEngine.nodeVoies(gabarit, pendingSlot).forEach(function (key) {
    var option = gabarit.options[key];
    var estimate = SceneRunManager.getObstacleEstimate(key);
    var factors = SceneRunManager._obstacleFactors(run, key);
    var canAfford = Number(run.breath || 0) >= factors.breathCost;
    var gainLabel = SCENE_OPTION_GAIN_LABELS[key] || "";
    h += '<button type="button" class="scene-card"'
      + (canAfford ? ' onclick="resolveSceneObstacleChoice(\'' + esc(key) + '\')"' : ' disabled') + '>';
    h += '<span class="scene-card-label">' + esc(_td(option.label)) + '</span>';
    h += '<span class="scene-card-sub">' + SCENE_STAT_LABELS[option.stat] + ' — <span class="' + sceneEstimateClass(estimate) + '">' + esc(sceneEstimateLabel(estimate)) + '</span></span>';
    h += '<span class="scene-card-sub scene-card-cost">' + esc(gainLabel) + ' · ' + _t("Souffle {n}", { n: factors.breathCost }) + (canAfford ? '' : ' ' + _t("(insuffisant)")) + '</span>';
    h += '</button>';
  });
  if (gabarit.ropeOption && Number(run.ropeCharges || 0) > 0) {
    h += '<button type="button" class="scene-card" onclick="resolveSceneObstacleChoice(\'corde\')">';
    h += '<span class="scene-card-label">' + _t("Assurer à la corde") + '</span>';
    h += '<span class="scene-card-sub is-good">' + _t("Réussite garantie, gain réduit") + '</span>';
    // v3.198.0 : la corde se consomme — l'afficher evite que le joueur la croie illimitee.
    h += '<span class="scene-card-sub scene-card-cost">' + _t("Consomme la corde (x{n})", { n: run.ropeCharges }) + '</span>';
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
  if (result.outcome === "setback") sceneLog(_t("Échec, blessure. +{n}", { n: result.gainAmount }));
  else if (result.outcome === "perfect") sceneLog(_t("Parfait ! +{n}", { n: result.gainAmount }));
  // v3.198.0 : le seuil vient du canevas, le texte ne l'ecrit plus en dur.
  else if (result.outcome === "evacuation") sceneLog(_t("Tu ne tiens plus debout. On te ramène.")); // v3.197.0 (bible B §4.4)
  else sceneLog(_t("Réussi. +{n}", { n: result.gainAmount }));

  refreshSceneScreen();
}
window.resolveSceneObstacleChoice = resolveSceneObstacleChoice;

function buildSceneAutelHTML(run) {
  // v3.198.0 : l'autel ne retire qu'une blessure legere — inutile de proposer une offrande
  // au joueur qui ne porte qu'une plaie grave, elle lui couterait de l'or pour rien.
  var canHeal = SceneRunManager.canHealHere(run);
  var cost = canHeal ? Math.max(5, Math.round(run.loot * 0.2)) : 0;
  var h = '<div class="panel-title">' + _t("Autel oublié") + '</div>';
  h += '<div class="scene-screen">';
  h += buildSceneStatusBarHTML(run);
  h += '  <div class="scene-heading">';
  h += '    <div class="scene-heading-text">' + (canHeal ? _t("L’autel demande {n}. Il rend une plaie.", { n: cost }) : (run.injuries.length ? _t("Il ne peut rien pour cette plaie-là.") : _t("Tu n’as rien à lui rendre."))) /* v3.197.0 (bible B §4.5) */ + '</div>';
  h += '  </div>';
  h += '  <div class="scene-actions">';
  if (canHeal) h += '    <button class="settings-btn primary" type="button" onclick="resolveSceneAutel(true)">' + _t("Faire l’offrande") + '</button>';
  h += '    <button class="settings-btn" type="button" onclick="resolveSceneAutel(false)">' + _t("Passer son chemin") + '</button>';
  h += '  </div>';
  h += '</div>';
  return h;
}

function resolveSceneAutel(accept) {
  var result = SceneRunManager.resolveAutel(accept);
  if (!result.ok) { showToast(result.reason, 1600); return; }
  sceneLog(accept ? _t("L’autel absorbe l’offrande. Une blessure se referme.") : _t("Tu ignores l’autel."));
  refreshSceneScreen();
}
window.resolveSceneAutel = resolveSceneAutel;

function buildSceneDecouverteHTML(run) {
  var h = '<div class="panel-title">' + _t("Découverte") + '</div>';
  h += '<div class="scene-screen">';
  h += buildSceneStatusBarHTML(run);
  h += '  <div class="scene-heading">';
  h += '    <div class="scene-heading-text">' + _t("Quelque chose a été laissé là. Pas pour toi, mais tu es là.") + '</div>';
  h += '  </div>';
  h += '  <div class="scene-actions">';
  h += '    <button class="settings-btn primary" type="button" onclick="resolveSceneDecouverte()">' + _t("Continuer") + '</button>';
  h += '  </div>';
  h += '</div>';
  return h;
}

function resolveSceneDecouverte() {
  var result = SceneRunManager.resolveDecouverte();
  if (!result.ok) { showToast(result.reason, 1600); return; }
  sceneLog(_t("Découverte : +{n}", { n: result.gainAmount }));
  refreshSceneScreen();
}
window.resolveSceneDecouverte = resolveSceneDecouverte;

function buildSceneSourceHTML(run) {
  var h = '<div class="panel-title">' + _t("Source claire") + '</div>';
  h += '<div class="scene-screen">';
  h += buildSceneStatusBarHTML(run);
  h += '  <div class="scene-heading">';
  h += '    <div class="scene-heading-text">' + _t("De l’eau, entre les racines. Elle est bonne.") + '</div>';
  h += '  </div>';
  h += '  <div class="scene-actions">';
  h += '    <button class="settings-btn primary" type="button" onclick="resolveSceneSource()">' + _t("Continuer") + '</button>';
  h += '  </div>';
  h += '</div>';
  return h;
}

function resolveSceneSource() {
  var result = SceneRunManager.resolveSource();
  if (!result.ok) { showToast(result.reason, 1600); return; }
  sceneLog(result.healed ? _t("Tu bois longuement : une blessure se referme.") : _t("Tu remplis ta gourde."));
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

  var h = '<div class="panel-title">' + _t("Chemin long") + '</div>';
  h += '<div class="scene-screen">';
  h += buildSceneStatusBarHTML(run, { hideLeave: true }); // v3.125.0 : Rentrer masqué ici, voir note ci-dessous
  h += '  <div class="scene-heading">';
  h += '    <div class="scene-heading-title">' + (ready ? _t("Le chemin est dégagé.") : _t("Le chemin est long.")) + '</div>';
  h += '    <div class="scene-heading-text">' + (ready
    ? _t("Tu peux continuer ta route.")
    : _t("Encore {d} (mm:ss) — profites-en pour avancer au village, la route t’attendra.", { d: esc(remainingLabel) })) + '</div>';
  h += '  </div>';
  h += '  <div class="scene-actions">';
  if (ready) {
    h += '    <button class="settings-btn primary" type="button" onclick="resolveSceneBloqueur()">' + _t("Continuer") + '</button>';
  } else {
    h += '    <button class="settings-btn primary" type="button" onclick="switchTab(\'village\')">' + _t("Aller au village") + '</button>';
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
  sceneLog(_t("Le chemin est enfin dégagé. +{n}", { n: result.gainAmount }));
  refreshSceneScreen();
}
window.resolveSceneBloqueur = resolveSceneBloqueur;

/* --- Combat en cours (Petites Aventures, profil Bourrin, v3.126.0) --- */
/* Écran affiché seulement si le joueur revient sur l'onglet "scene" pendant un combat en
   cours (enterGate a déjà fait switchTab("combat") — ce cas est donc rare, ex. navigation
   arrière). Aucune action ici : le combat doit être résolu ou fui depuis l'onglet Combat lui-même. */
function buildSceneCombatPendingHTML(run) {
  var h = '<div class="panel-title">' + _t("Combat en cours") + '</div>';
  h += '<div class="scene-screen">';
  h += '  <div class="scene-heading">';
  h += '    <div class="scene-heading-text">' + _t("Un affrontement t’attend.") + '</div>';
  h += '  </div>';
  h += '  <div class="scene-actions">';
  h += '    <button class="settings-btn primary" type="button" onclick="switchTab(\'combat\')">' + _t("Reprendre le combat") + '</button>';
  h += '  </div>';
  h += '</div>';
  return h;
}

/* --- Chambre finale --- */

function buildSceneFinaleHTML(run) {
  run = run || SceneRunManager.getRun();
  sceneFlushScriptedJournal(run);
  var h = '<div class="panel-title">' + _t("La chambre du trésor") + '</div>';
  h += '<div class="scene-screen">';
  h += buildSceneStatusBarHTML(run, { hideLeave: true });
  h += '  <div class="scene-heading">';
  h += '    <div class="scene-heading-text">' + _t("Deux coffres t’attendent.") + '</div>';
  h += '  </div>';
  h += '  <div class="scene-card-grid">';
  h += '<button type="button" class="scene-card" onclick="resolveSceneFinale(\'sur\')">';
  h += '<span class="scene-card-label">' + _t("Coffre patiné") + '</span>';
  h += '<span class="scene-card-sub is-good">' + _t("Gain garanti") + '</span></button>';
  h += '<button type="button" class="scene-card" onclick="resolveSceneFinale(\'risque\')">';
  h += '<span class="scene-card-label">' + _t("Coffre scellé") + '</span>';
  h += '<span class="scene-card-sub is-medium">' + _t("50% : butin doublé, 50% : moitié perdue") + '</span></button>';
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
  // v3.198.0 : seuil lu sur le canevas (template.maxInjuries) — était figé à 3, ce qui
  // affichait un bilan "réussite" sur une Petite Aventure évacuée à 2 blessures.
  // v3.199.0 : l'épuisement est une seconde cause de fin ratée, distincte des blessures.
  var isEvacuation = run.exhausted === true || run.injuries.length >= SceneRunManager.getMaxInjuries(run.templateId);

  var h = '<div class="panel-title">' + _t("Résumé de l’expédition") + '</div>';
  h += '<div class="scene-screen">';
  h += '  <div class="scene-end-card' + (isEvacuation ? ' is-failure' : '') + '">';
  // v3.263.0 (retour Seb) : icônes du kit au lieu des emoji (Campement de la barre de navigation, héros à terre)
  h += '    <div class="scene-end-icon"><img class="scene-end-img" src="' + (isEvacuation ? 'images/Icons/camp/hero_defeated.png' : 'images/Icons/menu_icons/camp_menu.png') + '" alt=""></div>';
  h += '  </div>';

  h += '  <div class="dungeon-summary-rewards">';
  h += '    <div class="dungeon-summary-row"><span>' + _t("Profondeur atteinte") + '</span><span>' + (run.depth + 1) + '</span></div>';
  h += '    <div class="dungeon-summary-row"><span>' + _t("Blessures") + '</span><span>' + run.injuries.length + '</span></div>';
  if (kept && window.SortieManager) {
    h += '    <div class="dungeon-summary-row"><span>' + _t("Butin rapporté") + '</span><span>' + esc(SortieManager.getLootSummary(kept)) + '</span></div>';
  }
  if (lost && window.SortieManager && (lost.gold || (lost.resources && Object.keys(lost.resources).some(function (k) { return lost.resources[k] > 0; })))) {
    h += '    <div class="dungeon-summary-row"><span>' + _t("Perdu") + '</span><span>' + esc(SortieManager.getLootSummary(lost)) + '</span></div>';
  }
  h += '  </div>';

  // v3.256.0 (Cartes Vivantes, C-2) : run ciblé — ce que la carte en a fait, puis retour sur la carte.
  if (run.livingMap) {
    var rep = run.livingMapReport;
    if (rep && rep.message) h += '  <div class="scene-map-report' + (rep.regressed ? ' is-loss' : '') + '">' + esc(rep.message) + '</div>';
    h += '  <div class="scene-actions">';
    h += '    <button class="settings-btn primary" type="button" onclick="leaveSceneScreen()">' + _t("Retour à la carte") + '</button>';
    h += '  </div>';
    h += '</div>';
    return h;
  }

  /* v3.260.0 (retour Seb) : « Nouvelle expédition » retirée. Elle relançait toujours
     expedition_faille (bac à sable admin), quel que soit le run terminé. Retour au Campement seul. */
  h += '  <div class="scene-actions">';
  h += '    <button class="settings-btn primary" type="button" onclick="leaveSceneScreen()">' + _t("Retour au Campement") + '</button>';
  h += '  </div>';
  h += '</div>';
  return h;
}

/* Nettoie le bilan et retourne au Campement — seul vrai point de sortie complet de l'écran
   Expédition une fois le run terminé (décision Seb : le joueur doit pouvoir quitter, pas
   seulement relancer). */
function leaveSceneScreen() {
  var run = SceneRunManager.getRun();
  var target = (run && run.livingMap) ? run.livingMap : null; // v3.256.0 (C-2) : lu AVANT clearRun
  SceneRunManager.clearRun();
  sceneRunLog = [];
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

/* v3.303.0 : boire un objet de préparation (l'Outre pleine). */
function useSceneBreathItem(itemId) {
  var r = SceneRunManager.useBreathItem(itemId);
  if (!r.ok) { if (typeof showToast === "function") showToast(r.reason, 1400); return; }
  sceneLog(_t("Tu bois à l’outre. +{n} Souffle.", { n: r.gained }));
  if (typeof refreshSceneScreen === "function") refreshSceneScreen(); else if (typeof renderPanel === "function") renderPanel();
}
window.useSceneBreathItem = useSceneBreathItem;
