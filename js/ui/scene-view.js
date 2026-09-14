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
function buildSceneLandingHTML() {
  if (game.sceneRun && game.sceneRun.status === "completed") {
    return buildSceneCompleteHTML(); // bilan pas encore consulté (ex. reprise post-rechargement)
  }
  var h = '<div class="panel-title">Expédition</div>';
  h += '<div class="scene-landing">';
  h += '<div class="scene-landing-icon"><img class=ico-inline src=images/Icons/scene/scene_cavern.png></div>';
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
    lootLabel = "Or";
  } else {
    var resDef = (window.WAREHOUSE_RESOURCES || {})[template.lootResource];
    lootLabel = (resDef && resDef.name) || template.lootResource;
  }

  // v3.195.0 : depthMax RÉEL du run = intensité si présente (même règle que
  // buildSceneProgressHTML/_advanceOrFinish) — corrige un affichage figé sur template.depthMax
  // resté en dur depuis le lot précédent (repéré en posant le mutateur "Nuit noire" ici).
  var displayIntensity = (run.intensity && window.SCENE_INTENSITY) ? window.SCENE_INTENSITY[run.intensity] : null;
  var displayDepthMax = (displayIntensity && displayIntensity.depthMax) || Number(template.depthMax || 1);

  var h = SCENE_PATH_TEMPLATE_IDS.indexOf(run.templateId) !== -1 ? buildScenePathHTML(run) : buildSceneProgressHTML(run);
  h += '<div class="scene-status-bar">';
  h += '<span class="scene-status-pill scene-status-depth">Profondeur ' + (run.depth + 1) + '/' + displayDepthMax + '</span>';
  h += '<span class="scene-status-pill scene-status-loot">' + esc(lootLabel) + ' : ' + lootAmount + '</span>';
  // v3.198.0 : le plafond vient du canevas (template.maxInjuries) — la Petite Aventure
  // evacue a 2, expedition_faille et les quetes migrees restent a 3.
  var injuryMax = SceneRunManager.getMaxInjuries(run.templateId);
  h += '<span class="scene-status-pill scene-status-injury' + (run.injuries.length >= injuryMax - 1 ? ' is-low' : '') + '">Blessures : ' + run.injuries.length + '/' + injuryMax + '</span>';
  // v3.195.0 : pastille Souffle — seuils visuels (is-low sous 30, cohérent avec le seuil qui
  // rend l'option "power" indisponible pour la plupart des gabarits, breathCost 3).
  if (typeof run.breath === "number") {
    // v3.199.0 : seuil d'alerte relevé de 30 à 40. La voie d'endurance coûte 20 et le passage
    // de palier 5 : sous 40, le joueur est déjà à deux paliers de l'épuisement, c'est là qu'il
    // doit le voir, pas quand il est trop tard pour boire ou viser une source.
    h += '<span class="scene-status-pill scene-status-breath' + (run.breath < 40 ? ' is-low' : '') + '">Souffle : ' + Math.round(run.breath) + '/100</span>';
  }
  if (run.torchCharges > 0) h += '<span class="scene-status-pill">Torche x' + run.torchCharges + '</span>';
  // v3.198.0 : corde et provisions ont des charges — le joueur doit les voir fondre.
  if (Number(run.ropeCharges || 0) > 0) h += '<span class="scene-status-pill">Corde x' + run.ropeCharges + '</span>';
  if (Number(run.provisionCharges || 0) > 0) h += '<span class="scene-status-pill">Provisions x' + run.provisionCharges + '</span>';
  // v3.196.0 : pastille mutateur, visible tout le run (pas seulement à l'annonce) — omise si
  // "aucun" (rien à rappeler au joueur dans ce cas, cohérent avec les autres pastilles qui
  // n'apparaissent que si pertinentes, ex. torche).
  var statusMutator = SceneRunManager.getActiveMutator();
  if (statusMutator.id && statusMutator.id !== "aucun") {
    h += '<span class="scene-status-pill scene-status-mutator">' + renderIconOrEmojiHTML(statusMutator.icon, "scene-pill-ico", "") + ' ' + esc(statusMutator.label) + '</span>';
  }
  h += '</div>';
  // v3.195.0 : bouton Gourde, utilisable à tout moment tant qu'elle est en loadout et que le
  // Souffle n'est pas déjà au maximum (même emplacement que le bouton torche, juste après la
  // barre de statut — voir buildSceneGateChoiceHTML pour le placement exact du bloc torche).
  if (run.gourdeAvailable && run.breath < 100) {
    h += '<div class="scene-actions" style="margin-top:0;margin-bottom:8px;">';
    h += '  <button class="settings-btn" type="button" onclick="useSceneGourde()">Boire à la gourde (+' + SceneRunManager.GOURDE_BREATH_AMOUNT + ' Souffle)</button>';
    h += '</div>';
  }
  // v3.198.0 : bouton Provisions, meme emplacement et memes conditions d'affichage que la
  // gourde (charge restante + un effet reel a produire). Seul moyen d'effacer une blessure
  // grave : l'autel et la source ne retirent que les legeres.
  if (Number(run.provisionCharges || 0) > 0 && run.injuries.length > 0) {
    h += '<div class="scene-actions" style="margin-top:0;margin-bottom:8px;">';
    h += '  <button class="settings-btn" type="button" onclick="useSceneProvision()">Manger les provisions (soigne la pire blessure)</button>';
    h += '</div>';
  }
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
  h += '<span class="scene-card-icon"><img class=ico-inline src=images/Icons/combat_stats/stat_attack.png></span>';
  h += '<span class="scene-card-label">Bourrin</span>';
  h += '<span class="scene-card-sub">Rapide, plus de combats, aucune attente.</span>';
  h += '</button>';
  h += '<button type="button" class="scene-card" onclick="chooseSceneProfile(\'prudent\')">';
  h += '<span class="scene-card-icon"><img class=ico-inline src=images/Icons/combat_stats/stat_defense.png></span>';
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

/* --- Choix d'intensité (v3.195.0) --- */
/* ORTHOGONAL au profil (déjà choisi juste avant) : profil = nature du parcours (combats,
   bloqueurs), intensité = ampleur du risque/gain sur ce parcours (longueur, difficulté,
   multiplicateur de butin). SCENE_INTENSITY, data/scene-templates.js. */

function buildSceneIntensityChoiceHTML() {
  var run = SceneRunManager.getRun();
  if (!run) return "";
  var template = SceneEngine.getTemplate(run.templateId);

  var h = '<div class="panel-title">' + esc(template.title) + '</div>';
  h += '<div class="scene-screen">';
  h += '  <div class="scene-heading">';
  h += '    <div class="scene-heading-title">Choisis ton intensité</div>';
  h += '    <div class="scene-heading-text">Plus le parcours est long et périlleux, plus le butin final est important.</div>';
  h += '  </div>';

  h += '  <div class="scene-card-grid">';
  Object.keys(SCENE_INTENSITY).forEach(function (key) {
    var intensity = SCENE_INTENSITY[key];
    h += '<button type="button" class="scene-card" onclick="chooseSceneIntensity(\'' + esc(key) + '\')">';
    h += '<span class="scene-card-icon">' + renderIconOrEmojiHTML(intensity.icon, "scene-card-ico", "") + '</span>';
    h += '<span class="scene-card-label">' + esc(intensity.label) + '</span>';
    h += '<span class="scene-card-sub">' + esc(intensity.desc) + '</span>';
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
  sceneLog(intensity.label + ". Le chemin est posé."); // v3.197.0 (bible B §4.4)
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

  var h = '<div class="panel-title">' + esc(template.title) + '</div>';
  h += '<div class="scene-screen">';
  h += '  <div class="scene-mutator-announce">';
  h += '    <span class="scene-mutator-icon">' + renderIconOrEmojiHTML(mutator.icon || "images/Icons/scene/weather_clear.png", "scene-mutator-img", "") + '</span>';
  h += '    <div class="scene-mutator-label">' + esc(mutator.label || "Rien à signaler") + '</div>';
  h += '    <div class="scene-mutator-desc">' + esc(mutator.desc || "") + '</div>';
  h += '  </div>';
  h += '  <div class="scene-actions">';
  h += '    <button type="button" class="settings-btn" onclick="acknowledgeSceneMutator()">Continuer</button>';
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
    h += '<span class="scene-card-icon">' + renderIconOrEmojiHTML(item.icon, "scene-card-ico", "") + '</span>';
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
    h += '<span class="scene-card-icon">' + renderIconOrEmojiHTML(info.icon, "scene-card-ico", "") + '</span>';
    h += '<span class="scene-card-label">' + esc(info.label) + '</span>';
    h += '<span class="scene-card-sub' + (info.subClass ? ' ' + info.subClass : '') + '">' + esc(info.sub) + '</span>';
    h += '<span class="scene-card-solo-hint">Touche le nœud sur le chemin pour t\u2019y engager.</span>';
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
  sceneLog('Tu manges. La plaie se referme.'); // v3.197.0 (bible B : narrateur proche, concret)
  refreshSceneScreen();
}
window.useSceneProvision = useSceneProvision;

function useSceneGourde() {
  var result = SceneRunManager.useSceneGourde();
  if (!result.ok) {
    showToast(result.reason, 1600);
    return;
  }
  sceneLog("Tu reprends ton souffle.");
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
  if (result.outcome === "epuisement") sceneLog("Tu n\u2019en peux plus. On te ramène.");
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

/* v3.195.0 : icônes/labels de gain relatif par profil d'option (power/precision/endurance),
   affichés sur chaque carte d'obstacle pour rendre le triangle risque/gain/coût lisible
   d'un coup d'œil, sans dupliquer les chiffres exacts de SCENE_NODES.optionProfiles. */
var SCENE_OPTION_GAIN_LABELS = { power: "Gros butin", precision: "Bon butin", endurance: "Butin modeste" };

function buildSceneObstacleHTML(run) {
  var gabarit = SCENE_NODES.obstacles[run.pendingNode.gabaritId];
  var h = '<div class="panel-title">' + esc(gabarit.name) + '</div>';
  h += '<div class="scene-screen">';
  h += buildSceneStatusBarHTML(run);
  h += '  <div class="scene-heading">';
  h += '    <div class="scene-heading-text">Choisis ton approche.</div>';
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
    h += '<span class="scene-card-label">' + esc(option.label) + '</span>';
    h += '<span class="scene-card-sub">' + SCENE_STAT_LABELS[option.stat] + ' — <span class="' + sceneEstimateClass(estimate) + '">' + esc(sceneEstimateLabel(estimate)) + '</span></span>';
    h += '<span class="scene-card-sub scene-card-cost">' + esc(gainLabel) + ' · Souffle ' + factors.breathCost + (canAfford ? '' : ' (insuffisant)') + '</span>';
    h += '</button>';
  });
  if (gabarit.ropeOption && Number(run.ropeCharges || 0) > 0) {
    h += '<button type="button" class="scene-card" onclick="resolveSceneObstacleChoice(\'corde\')">';
    h += '<span class="scene-card-label">Assurer à la corde</span>';
    h += '<span class="scene-card-sub is-good">Réussite garantie, gain réduit</span>';
    // v3.198.0 : la corde se consomme — l'afficher evite que le joueur la croie illimitee.
    h += '<span class="scene-card-sub scene-card-cost">Consomme la corde (x' + run.ropeCharges + ')</span>';
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
  // v3.198.0 : le seuil vient du canevas, le texte ne l'ecrit plus en dur.
  else if (result.outcome === "evacuation") sceneLog('Tu ne tiens plus debout. On te ramène.'); // v3.197.0 (bible B §4.4)
  else sceneLog('Réussi. +' + result.gainAmount);

  refreshSceneScreen();
}
window.resolveSceneObstacleChoice = resolveSceneObstacleChoice;

function buildSceneAutelHTML(run) {
  // v3.198.0 : l'autel ne retire qu'une blessure legere — inutile de proposer une offrande
  // au joueur qui ne porte qu'une plaie grave, elle lui couterait de l'or pour rien.
  var canHeal = SceneRunManager.canHealHere(run);
  var cost = canHeal ? Math.max(5, Math.round(run.loot * 0.2)) : 0;
  var h = '<div class="panel-title">Autel oublié</div>';
  h += '<div class="scene-screen">';
  h += buildSceneStatusBarHTML(run);
  h += '  <div class="scene-heading">';
  h += '    <div class="scene-heading-text">' + (canHeal ? 'L\u2019autel demande ' + cost + '. Il rend une plaie.' : (run.injuries.length ? 'Il ne peut rien pour cette plaie-là.' : 'Tu n\u2019as rien à lui rendre.')) /* v3.197.0 (bible B §4.5) */ + '</div>';
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
  h += '    <div class="scene-heading-text">Quelque chose a été laissé là. Pas pour toi, mais tu es là.</div>';
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
  h += '    <div class="scene-heading-text">De l\u2019eau, entre les racines. Elle est bonne.</div>';
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
  // v3.198.0 : seuil lu sur le canevas (template.maxInjuries) — était figé à 3, ce qui
  // affichait un bilan "réussite" sur une Petite Aventure évacuée à 2 blessures.
  // v3.199.0 : l'épuisement est une seconde cause de fin ratée, distincte des blessures.
  var isEvacuation = run.exhausted === true || run.injuries.length >= SceneRunManager.getMaxInjuries(run.templateId);

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
