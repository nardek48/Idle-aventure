"use strict";
/* ui/camp-view.js — écran Campement (page d'accueil, v3.7 ; hub v3.103.1) : feu de camp (repos long/court), tableau de
   missions (MissionBoard.top(3), LIGNE_DIRECTRICE §3). Accès rapides supprimés v3.181.0. */

var CAMP_MISSION_STATUS_CLASS = { claimable: "is-claimable", running: "is-running", accepted: "is-running", available: "" };

function buildCampMissionActionHTML(m) {
  if (m.claim) return '<button class="settings-btn primary camp-mission-btn" type="button" onclick="event.stopPropagation(); campMissionAction(\'' + esc(m.id) + '\', \'claim\')"><img class=ico-inline src=images/Icons/dungeon/dungeon_guaranteed_loot.webp> ' + (m.claimLabel ? esc(m.claimLabel) : _t("Réclamer")) + '</button>';
  if (m.status === "running" || m.status === "accepted") {
    var h = '<div class="camp-mission-actions">';
    // v3.117.0 : "accepted" = acceptée mais pas encore lancée (ex. expédition à mini-jeu juste
    // acceptée) -> "Partir" ; "running" = déjà en cours -> "Continuer". Même bouton launch.
    var launchLabel = m.status === "running" ? '<img class="ico-btn" src="images/Icons/quests/continue.webp" alt=""> ' + _t("Continuer") : '<img class="ico-btn" src="images/Icons/quests/start_expedition.webp" alt=""> ' + _t("Partir");
    if (m.launchLabel) launchLabel = esc(m.launchLabel); // v3.429.2 : verbe propre à la mission (ex. « Décider »)
    if (m.launch) h += '<button class="settings-btn primary camp-mission-btn" type="button" onclick="event.stopPropagation(); campMissionAction(\'' + esc(m.id) + '\', \'launch\')">' + launchLabel + '</button>';
    if (m.abandon) h += '<button class="settings-btn danger camp-mission-btn" type="button" onclick="event.stopPropagation(); campMissionAction(\'' + esc(m.id) + '\', \'abandon\')">' + _t("Abandonner") + '</button>';
    h += '</div>';
    return h;
  }
  if (m.accept) return '<button class="settings-btn primary camp-mission-btn" type="button" onclick="event.stopPropagation(); campMissionAction(\'' + esc(m.id) + '\', \'accept\')">' + _t("Accepter") + '</button>';
  return "";
}

/* Audit SUIV-11 (ERG-5 point 2) : ce que le départ consomme, et le stock, avant de toucher « Partir ». */
function buildCampMissionCostHTML(cost) {
  if (!cost || !cost.resourceId) return "";
  var def = (window.WAREHOUSE_RESOURCES || {})[cost.resourceId] || {}, need = Number(cost.amount || 0);
  var have = (window.WarehouseManager && WarehouseManager.getAmount) ? Number(WarehouseManager.getAmount(cost.resourceId) || 0) : 0;
  return '<div class="camp-mission-cost' + (have < need ? ' is-short' : '') + '">' + renderIconOrEmojiHTML(def.icon || "images/Icons/quests/ration_reward.webp", "ico-inline", "")
    + ' ' + esc(_t("Départ : {x} ×{n} · stock {h}", { x: def.name ? _td(def.name) : cost.resourceId, n: need, h: formatNumber(have) })) + '</div>';
}
window.buildCampMissionCostHTML = buildCampMissionCostHTML;

/* v3.704.0 (NOV-2, Seb A) : récit de l'étape d'Histoire sur la carte du Camp. Pli ouvert par chapitre,
   gardé le temps de la session (pas d'état sauvegardé). */
var campStoryFoldOpen = {};
function campStoryStepOf(m) {
  if (!m || m.sourceKind !== "story" || !window.StoryQuestManager) return null;
  var step = StoryQuestManager.getCurrentStep(m.worldId);
  return step && step.narrative && step.narrative.objective ? step : null;
}
// La première phrase du récit (le reste vient avec le pli)
function campStoryLead(text) {
  var t = String(text || ""), k = t.search(/[.!?…](\s|$)/);
  return k >= 0 ? t.slice(0, k + 1) : t;
}
function buildCampStoryFoldHTML(m, step) {
  var open = !!campStoryFoldOpen[m.worldId], acc = m.status !== "available";
  var lines = acc && step.narrative.dialogue ? step.narrative.dialogue.filter(Boolean).length : 0;
  var h = '<div class="nv2-recit"><button type="button" class="nv2-fold" aria-expanded="' + open + '" onclick="toggleCampStoryFold(this, \'' + esc(m.worldId) + '\')">'
    + '<span>' + _t("Récit") + '</span>' + (lines ? '<small>' + esc(_tn(lines, "{n} réplique", "{n} répliques")) + '</small>' : '') + '<i>▸</i></button>';
  h += '<div class="nv2-body"' + (open ? '' : ' hidden') + '><div class="story-step-text">' + esc(_td(step.narrative.objective)) + '</div>';
  if (acc && typeof buildStoryDialogueHTML === "function") h += buildStoryDialogueHTML(step); // répliques une fois l'étape acceptée, comme dans Quêtes
  return h + '</div></div>';
}
function toggleCampStoryFold(btn, id) {
  var open = !campStoryFoldOpen[id], body = btn && btn.parentNode ? btn.parentNode.querySelector(".nv2-body") : null;
  campStoryFoldOpen[id] = open;
  if (btn) btn.setAttribute("aria-expanded", String(open));
  if (body) { if (open) body.removeAttribute("hidden"); else body.setAttribute("hidden", ""); }
}
window.toggleCampStoryFold = toggleCampStoryFold;

function buildCampMissionCardHTML(m) {
  var cls = CAMP_MISSION_STATUS_CLASS[m.status] || "";
  var story = campStoryStepOf(m);
  var h = '<div class="camp-mission-card ' + cls + (m.isMain ? ' is-main' : '') + '">';
  h += '<div class="camp-mission-head">';
  h += '<span class="camp-mission-icon">' + renderIconOrEmojiHTML(MissionBoard.typeIcon(m.type), "camp-mission-icon-img", _td(m.title)) + '</span>';
  h += '<div class="camp-mission-title-col">';
  h += '<div class="camp-mission-title-row">';
  h += '<span class="camp-mission-title">' + esc(_td(m.title)) + '</span>';
  h += '<span class="camp-mission-badge camp-mission-badge-' + esc(m.badge) + '">' + (m.badge === "story" ? _t("Histoire", "badge") : _t("Contrat", "badge")) + '</span>';
  h += '</div>';
  if (m.place) h += '<div class="camp-mission-place">' + esc(_td(m.place)) + '</div>';
  h += '</div>';
  h += '</div>';
  if (story) h += '<div class="nv2-lead">' + esc(campStoryLead(_td(story.narrative.objective))) + '</div>';
  // v3.234.0 (retour Seb) : le `||` faisait gagner le compteur dès qu'il existait,
  // et objectiveLabel — le seul champ qui dit QUOI FAIRE — disparaissait. Sur une
  // quête de village, progress() renvoie un « 0/2 » nu : la carte ne disait plus rien.
  var enCours = m.status === "running" || m.status === "accepted";
  var objective = m.objectiveLabel || "";
  if (enCours && m.progressLabel) objective = objective ? (objective + " \u2014 " + m.progressLabel) : m.progressLabel;
  if (objective) h += '<div class="camp-mission-objective">' + esc(objective) + '</div>';
  if (story) h += buildCampStoryFoldHTML(m, story);
  if (m.rewardSummary) h += '<div class="camp-mission-reward"><img class=ico-inline src=images/Icons/dungeon/dungeon_guaranteed_loot.webp> ' + esc(m.rewardSummary) + '</div>';
  h += buildCampMissionCostHTML(m.entryCost);
  h += buildCampMissionActionHTML(m);
  h += '</div>';
  return h;
}

function buildCampMissionBoardHTML() {
  if (!window.MissionBoard) return '<div class="camp-summary-row camp-summary-empty">' + _t("Tableau de missions indisponible.") + '</div>';
  var top = MissionBoard.top(3);
  if (!top.length) return '<div class="camp-summary-row camp-summary-empty">' + _t("Rien à signaler pour l'instant.") + '</div>';
  return top.map(buildCampMissionCardHTML).join("");
}

/* Point d'entrée unique des boutons de mission (évite d'inliner 4 managers différents dans le HTML). */
function campMissionAction(missionId, action) {
  var m = window.MissionBoard ? MissionBoard.getById(missionId) : null;
  if (!m || typeof m[action] !== "function") return;
  var run = function () {
    var done = m[action]();
    if (typeof renderPanel === "function") renderPanel();
    // v3.734.0 (Seb 07/11) : étape d'Histoire de combat acceptée PV bas -> rappel de se soigner (une fois)
    if (action === "accept" && m.sourceKind === "story" && done && typeof maybeStoryLowHpReminder === "function") maybeStoryLowHpReminder(m.worldId);
  };
  // v3.440.0 : le Donjon du tableau part sans feuille, la préparation de sortie passe ici
  if (action === "accept" && m.sourceKind === "dungeon" && typeof openSortiePrep === "function") {
    var go = run;
    var dCtx = { type: "dungeon", id: Number(String(m.id).replace("dungeon_", "")) };
    run = function () { openSortiePrep({ title: m.title, icon: "images/Icons/quests/mission_dungeon.webp", ctx: dCtx,
      food: { kind: "dungeon", ref: window.DungeonManager ? DungeonManager.getById(dCtx.id) : null }, onGo: go }); }; // v3.513.0
  }
  /* v3.247.0 : avant de PARTIR (accept), on montre le pronostic si le combat est risqué ou
     pire, avec possibilité d'annuler. Les autres actions (réclamer, abandonner) passent direct. */
  if (action === "accept" && typeof launchWithForecast === "function") return launchWithForecast(m, run);
  run();
}
window.campMissionAction = campMissionAction;
window.buildCampMissionBoardHTML = buildCampMissionBoardHTML;
window.buildCampMissionCardHTML = buildCampMissionCardHTML;

/* v3.260.0 : état du « ? » de la régénération (non persistant, replié au chargement). */
var campRegenHelpOpen = false;
function toggleCampRegenHelp() {
  campRegenHelpOpen = !campRegenHelpOpen;
  if (typeof renderPanel === "function") renderPanel();
}
window.toggleCampRegenHelp = toggleCampRegenHelp;

/* v3.411.0 : onglet ouvert du Campement (retenu pendant la session). */
var CAMP_TABS = [
  { key: "feu", label: _t("Le feu"), icon: "images/Icons/camp/campfire.webp" }, // v3.594.0 (atelier camp-carte, choix Seb) : santé, repas, compagnons
  { key: "missions", label: _t("Mis\u00ADsions", "sous-onglet"), icon: "images/Icons/quests/quest_list.webp" },
  { key: "depart", label: _t("Expé\u00ADdi\u00ADtions", "sous-onglet"), icon: "images/Icons/quests/start_expedition.webp" }, // v3.426.0 : était « Départ »
  { key: "grimoire", label: _t("Gri\u00ADmoire", "sous-onglet"), icon: "images/Icons/system/grimoire.webp" }
];
var campTab = "missions";
var campShownTab = null; // v3.426.0 : l'onglet réellement affiché au dernier rendu
function setCampTab(tab) {
  campTab = tab;
  if (typeof renderPanel === "function") renderPanel();
}
window.setCampTab = setCampTab;

/* tab : optionnel (harnais) — sinon l'onglet retenu */
function buildCampHTML(tab) {
  if (window.CampManager) CampManager.ensureDefaults();

  // v3.101.0 (P3-lite) : régénération lente + Repas (v3.786.0), plus de repos à horloge.
  if (window.CampManager) CampManager.applyRegen(false);
  var maxHp = game.heroMaxHp || 1;
  var hp = game.heroHp != null ? game.heroHp : maxHp;
  var hpFull = hp >= maxHp;
  var regenPct = window.CampManager ? Math.round(CampManager.getRegenPctPerMin() * 100) : 5;
  var minutesToFull = window.CampManager ? CampManager.getMinutesToFull() : 0;

  var h = '<div class="nb-page-frame nb-page-frame-fill camp-page kframe-page" data-kf-banner="camp" data-kf-title="images/Icons/camp/camp_title.webp|' + _t("Campement") + '">';

  // v3.194.0 (Seb) : titre et sous-titre retirés — le bandeau figé porte
  // déjà « <img class=ico-inline src=images/Icons/quests/village_quest.webp> Campement », la ligne d'ambiance n'apportait rien.

  if (game.justDied) {
    h += '<div class="camp-death-banner"><img class="ico-lg" src="images/Icons/camp/hero_defeated.webp" alt=""> ' + _t("Tu es à terre. Prends un repas, ou laisse le feu faire son œuvre, avant de repartir.") + '</div>';
    if (typeof takeDefeatResourceTipHTML === "function") h += takeDefeatResourceTipHTML(); // v3.689.0 (COMB-4) : astuce de défaite
    game.justDied = false;
  }

  var hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));

  /* v3.411.0 (atelier Campement, Seb : R3b) : la santé tient en deux lignes et reste toujours
     visible — ligne 1 : icône + jauge de PV (+ régénération dessous) ; puis (v3.786.0) anneaux des
     compagnons, Repas et Festin.
     Les identifiants camp-hp-fill, camp-fire-hp-value et camp-fire-eta sont gardés : le
     système de camp les met à jour en direct. */
  var hc = '<div class="camp-card camp-health-card">'; // v3.594.0 : la santé passe dans l'onglet « Le feu »
  var h0 = h; h = hc; // la suite assemble le bloc santé dans h, rendu à h0 plus bas
  h += '<div class="camp-hp-line"><img class="camp-hp-ico" src="images/Icons/combat_stats/stat_health.webp" alt="">';
  h += '<div class="camp-hp-bar kgauge kgauge-thin kgauge-hp"><div class="kgauge-track"><div class="kgauge-fill" id="camp-hp-fill" style="width:' + hpPct + '%"></div></div>'
    + '<span class="kgauge-text" id="camp-fire-hp-value">' + formatNumber(Math.floor(hp)) + ' / ' + formatNumber(maxHp) + '</span></div></div>';

  /* Régénération — v3.260.0 (décision Seb) : une seule ligne et un « ? » qui déplie l'explication. */
  h += '<div class="camp-regen-line">';
  h += '<span class="camp-regen-rate">' + _t("+{n} % PV/min", { n: regenPct }) + '</span>';
  // v3.242.0 (bug Seb) : esc() enveloppait AUSSI la balise <img> — seule la partie texte est échappée.
  h += '<span class="camp-regen-eta" id="camp-fire-eta">' + (hpFull
    ? '<img class=ico-inline src=images/Icons/system/check_valid.webp> ' + _t("PV au maximum")
    : '<img class=ico-inline src=images/Icons/system/hourglass_waiting.webp> ' + esc(_t("Max dans {d}", { d: formatTime(Math.ceil(minutesToFull * 60)) }))) + '</span>';
  h += '<button type="button" class="camp-help-btn" aria-label="' + _t("Régénération : explication") + '" aria-expanded="' + (campRegenHelpOpen ? 'true' : 'false') + '" onclick="toggleCampRegenHelp()">?</button>';
  h += '</div>';
  if (campRegenHelpOpen) {
    h += '<div class="camp-regen-desc">' + _t("Hors combat, tes PV remontent seuls au rythme indiqué, même pendant ton absence. Le repas remet tout de suite l'équipe à plein.") + '</div>';
  }

  /* v3.786.0 (atelier repas-camp, Seb) : les compagnons en anneaux de PV (toucher = parler, ex-« Au coin du feu »),
     puis le Repas (toute l'équipe à plein) et le Festin côte à côte. */
  var campMates = window.CampManager ? CampManager.campCompanionIds() : [];
  h += campRingsHTML(campMates);
  var teamFull = window.CampManager ? CampManager.teamFull() : hpFull;
  var campLock = (window.CampManager && CampManager.mealLockReason()) || null; // v3.307.0 ; audit 04/11 (QA-8) : sortie de combat
  if (campLock) h += '<div class="camp-lock-note"><img class="ico-inline" src="images/Icons/system/hero_away.webp" alt=""> ' + esc(campLock) + '</div>';
  h += campMealActsHTML(teamFull, campLock);
  h += '</div>'; // fin .camp-health-card
  hc = h; h = h0;

  // v3.133.0 : bloc « Les braises » — offrande de l'étape Histoire courante (forest_15), affiché
  // seulement pendant l'étape acceptée et tant que l'offrande n'est pas faite (StoryQuestManager.getOfferingInfo).
  var offering = (window.StoryQuestManager && typeof StoryQuestManager.getOfferingInfo === "function") ? StoryQuestManager.getOfferingInfo(null, "camp") : null; // v3.297.0 : chapitre actif ; v3.310.0 : offrandes du Camp seulement
  var eh = ""; // v3.429.19 : rendu ici, posé SOUS les onglets (le Partir de l'Histoire restait sous la nav)
  if (offering) {
    eh += '<div class="camp-card camp-embers-card">';
    eh += '<div class="ksec camp-section-title"><img class="ico-lg" src="images/Icons/camp/campfire.webp" alt=""> ' + _t("Les braises") + '</div>';
    eh += '<div class="camp-embers-desc">' + esc(_td(offering.step.narrative.objective)) + '</div>';
    // v3.197.0 (passe de ton) : les anciens parlent avant l'offrande (buildStoryDialogueHTML, quests-view.js).
    if (typeof buildStoryDialogueHTML === "function") eh += buildStoryDialogueHTML(offering.step);
    eh += '<div class="camp-embers-list">';
    offering.items.forEach(function (it) {
      var okItem = it.have >= it.need;
      eh += '<div class="camp-embers-item' + (okItem ? ' is-ready' : '') + '">';
      eh += '<span class="camp-embers-icon">' + renderIconOrEmojiHTML(it.icon || "images/Icons/scene/path_easy.webp", "camp-embers-icon-img", _td(it.name)) + '</span>';
      eh += '<span class="camp-embers-name">' + esc(_td(it.name)) + '</span>';
      eh += '<span class="camp-embers-count">' + (okItem ? '<img class=ico-inline src=images/Icons/system/check_valid.webp> ' : '') + formatNumber(Math.min(it.have, it.need)) + '/' + formatNumber(it.need) + '</span>';
      eh += '</div>';
    });
    eh += '</div>';
    eh += '<button class="settings-btn primary camp-embers-btn" type="button"' + (offering.canOffer ? ' onclick="StoryQuestManager.offerToEmbers(\'' + esc(offering.chapterId) + '\');"' : ' disabled') + '><img class=ico-inline src=images/Icons/camp/campfire.webp> ' + _t("Offrir aux braises") + '</button>';
    eh += '</div>';
  }

  /* v3.411.0 (atelier Campement, R3) : sous la santé, trois onglets en rail du kit —
     Missions · Départ (préparer, expédition) · Grimoire. Un onglet n'apparaît que s'il a du
     contenu ; s'il n'en reste qu'un, pas de rail. L'onglet ouvert est retenu (campTab). */
  var tabsHTML = {};
  // v3.639.0 (atelier onglets-alleges) : la santé d'abord ; « veut te parler » seulement pour qui n'est pas au feu (la bulle « … » suffit)
  tabsHTML.feu = hc + campFeuStoryHTML(campMates) + (typeof campTalkCardsHTML === "function" ? campTalkCardsHTML(campFeuMateIds(campMates)) : "") + campHereCardHTML();
  var talkReady = !!(window.CompanionTalkManager && CompanionTalkManager.available().length); // v3.597.0
  var mh = '<div class="camp-card camp-missions-card">';
  mh += buildCampMissionBoardHTML();
  mh += '<button class="settings-btn" type="button" onclick="switchTab(\'quests\')">' + _t("Voir le tableau complet") + '</button>';
  mh += '</div>';
  tabsHTML.missions = mh;
  // v3.244.0 (chantier Navigation, décision Seb) : Donjon et Carte du monde quittent le menu ☰ pour le bloc « Expédition »
  // v3.426.0 (chantier Expéditions) : l'onglet devient le tableau des départs (ui/expeditions-view.js)
  var dep = (typeof buildExpeditionsBoardHTML === "function") ? buildExpeditionsBoardHTML() : "";
  if (dep) tabsHTML.depart = dep;
  // v3.210.0 (décision Seb) : le Grimoire au Camp, même verrou que l'ancienne entrée de menu.
  if (typeof isTabUnlocked !== "function" || isTabUnlocked("grimoire")) {
    ensureGrimoireRules();
    var slotCount = (typeof getGrimoireSlotCount === "function") ? getGrimoireSlotCount(game.worldsEverReached) : 6;
    var kit = (typeof getGrimoireCurrentKit === "function") ? getGrimoireCurrentKit() : null;
    // v3.639.0 (atelier onglets-alleges, Seb) : le Grimoire montre son contenu (mode, règles, Presets, Rapport)
    if (typeof grimoireEditIndex !== "undefined" && grimoireEditIndex !== null && grimoireEditIndex >= slotCount) grimoireEditIndex = null;
    tabsHTML.grimoire = '<div class="camp-card camp-grimoire-card">' + ((typeof grimoireEditIndex !== "undefined" && grimoireEditIndex !== null)
      ? buildGrimoireEditHTML(grimoireEditIndex, kit) : buildGrimoireListHTML(kit, slotCount)) + '</div>';
  }
  // v3.558.0 (grand écran, option B) : une seule page, sans onglets ; v3.567.0 (option D) : blocs compacts
  // de la maquette (atelier/grand-ecran.html) — équipe, repas, Grimoire, missions, expéditions. Le téléphone ne change pas.
  if (!tab && document.documentElement.classList.contains("wide-mode")) {
    var titled = function (t, sub, x) { return x ? '<section class="cw-card"><h3 class="cw-h">' + esc(t) + (sub ? ' <small>' + sub + '</small>' : '') + '</h3>' + x + '</section>' : ""; };
    campShownTab = "missions";
    var sub = esc(_t("+{n} % PV/min", { n: regenPct })) + ' · <span id="camp-fire-eta">' + esc(hpFull ? _t("PV au maximum") : _t("Max dans {d}", { d: formatTime(Math.ceil(minutesToFull * 60)) })) + '</span>';
    return h + '<div class="cw"><div class="cw-col">'
      + titled(_t("Le feu de camp"), sub, campWideTeamHTML(maxHp, hp, teamFull, campLock, campMates)) + eh
      + titled(_t("Expéditions"), "", tabsHTML.depart || "") // v3.772.0 (atelier mode-pc) : sous le feu, elle était coupée sous les missions
      + titled(_t("Grimoire"), tabsHTML.grimoire ? esc(campWideRulesCount()) : "", tabsHTML.grimoire ? campWideGrimoireHTML() : "") + '</div>'
      + '<div class="cw-col">' + titled(_t("Missions"), "", campWideMissionsHTML()) + '</div></div></div>';
  }
  var order = CAMP_TABS.filter(function (t) { return !!tabsHTML[t.key]; });
  var want = tab || campTab;
  var cur = tabsHTML[want] ? want : order[0].key;
  if (order.length > 1) {
    var claimable = window.MissionBoard ? MissionBoard.top(3).filter(function (m) { return !!m.claim; }).length : 0;
    var toCollect = (typeof countExpeditionsToCollect === "function") ? countExpeditionsToCollect() : 0; // v3.426.0
    h += '<div class="kseg is-stack camp-tabs">';
    order.forEach(function (t) {
      h += '<button type="button" class="' + (cur === t.key ? 'is-on' : '') + '" onclick="setCampTab(\'' + t.key + '\')">'
        + '<img src="' + t.icon + '" alt=""><span>' + esc(t.label) + '</span>'
        + (t.key === "feu" && (!teamFull || talkReady) ? '<span class="kseg-dot">!</span>' : '') // v3.594.0 : à soigner ; v3.597.0 : quelqu'un veut parler
        + (t.key === "missions" && claimable ? '<span class="kseg-dot">' + claimable + '</span>' : '')
        + (t.key === "depart" && toCollect ? '<span class="kseg-dot is-green">' + toCollect + '</span>' : '') + '</button>';
    });
    h += '</div>';
  }
  campShownTab = cur; // v3.426.0 : lu par renderPanel (bulles masquées sur Expéditions)
  h += tabsHTML[cur];
  h += eh; // v3.429.19 : bloc « Les braises » sous les Missions (mesuré : Partir 1076 -> 520 px, nav à 752)

  // v3.181.0 (décision Seb) : carte « Accès rapide » supprimée — la nav du
  // bas couvre ces raccourcis depuis la refonte.

  h += '</div>';
  if (window.WorldDays && WorldDays.ensure().pending && typeof setTimeout === "function") setTimeout(worldNightShow, 0); // v3.602.0 : la nuit, au retour au Camp
  return h;
}

/* v3.602.0 (atelier jours-du-monde, plein écran) : la tombée de la nuit, montrée une fois au retour au Camp. */
function worldNightShow() {
  if (typeof document === "undefined" || !document.body || !window.WorldDays || game.activeTab !== "campement") return;
  if (window.SortieManager && SortieManager.ensure().active) return;
  var night = WorldDays.takePending();
  if (!night) return;
  var w = window.WORLDS ? WORLDS.filter(function (x) { return x.id === night.world; })[0] : null;
  var root = document.getElementById("world-night-root");
  if (!root) { root = document.createElement("div"); root.id = "world-night-root"; document.body.appendChild(root); }
  var lost = night.kind === "reprise" || (night.kind === "chantier" && night.sectorId);
  root.innerHTML = '<div class="wn" role="dialog" aria-modal="true" aria-label="' + esc(_t("Jour {n}", { n: night.day })) + '"><div class="wn-in">'
    + '<h3>' + esc(_t("Jour {n}", { n: night.day })) + '</h3>' + (w ? '<small class="wn-w">' + esc(_td(w.name)) + '</small>' : '')
    + '<p>' + esc(_t("La nuit tombe.")) + '</p>'
    + '<p class="wn-what' + (lost ? ' is-lost' : '') + '">' + esc(WorldDays.nightText(night)) + '</p>'
    + (typeof villageEventMorningHTML === "function" ? villageEventMorningHTML(night) : '') // v3.604.0
    + '<button type="button" class="kbtn primary wn-ok" onclick="worldNightClose()">' + esc(_t("Au matin")) + '</button></div></div>';
  if (typeof saveGame === "function") saveGame();
}
function worldNightClose() {
  var root = document.getElementById("world-night-root");
  if (root) root.innerHTML = "";
}
window.worldNightShow = worldNightShow;
window.worldNightClose = worldNightClose;

/* v3.595.0 (C1 et C2, data/camp-soir.js) : la phrase du soir, tirée à chaque retour au Camp,
   et les compagnons restés au camp autour du feu ; toucher l'un d'eux affiche sa phrase. */
var campSoir = { key: null, text: "", tap: null };
function campSoirWorld() { return Math.max(0, Math.min(5, Number((window.WorldManager && WorldManager.worldIndex) || 0))); }
function campMoment() { return window.WorldDays && typeof WorldDays.moment === "function" ? WorldDays.moment() : "soir"; } // v3.655.0 (C3)
function campSoirPick(ids) {
  var all = campSoirData(), D = all[campSoirWorld()] || all[0], any = campSoirAny(), mo = campMoment();
  // v3.655.0 (C3) : le matin et en journée, les phrases du moment ; les compagnons parlent le soir
  var day = (mo === "matin" || mo === "jour") && D[mo] && D[mo].length, pool = day ? D[mo].slice() : D.lieu.slice();
  if (!day) ids.forEach(function (id) { (D[id] || (any[id] && any[id].soir) || []).forEach(function (t) { pool.push(t); }); });
  var ev = window.VillageEvents && VillageEvents.def(), evs = ev && typeof villageEventSoirData === "function" ? villageEventSoirData() : null; // v3.607.0 (E3) : l'événement en cours
  if (evs) { var et = ev.type === "cadeau" || ev.type === "palissade" ? "demande" : ev.type; if (evs[et]) { pool.push(evs[et]); pool.push(evs[et]); } }
  return pool[Math.floor(Math.random() * pool.length)] || "";
}
function campSoirTapText(id) {
  var D = campSoirData()[campSoirWorld()] || {}, any = campSoirAny();
  return (D.tap && D.tap[id]) || (any[id] && any[id].tap) || "";
}
/* v3.655.0 (C3) : l'en-tête de la carte suit le moment du jour. */
function campMomentTitle() {
  var mo = campMoment();
  return mo === "matin" ? _t("Ce matin au camp") : mo === "jour" ? _t("Au camp, en journée") : _t("Ce soir au camp");
}
/* Compagnons assis au feu. v3.601.0 : hors sortie, l'équipe est aussi au feu (on peut parler à tout le monde) */
function campFeuMateIds(campMates) {
  if (typeof campSoirData !== "function") return [];
  var away = window.SortieManager && typeof SortieManager.ensure === "function" && SortieManager.ensure().active;
  var party = away && window.CompanionManager ? CompanionManager.partyIds() : [];
  return (campMates || []).filter(function (id) { return party.indexOf(id) < 0; });
}

function campFeuStoryHTML(campMates) {
  if (typeof campSoirData !== "function") return "";
  var ids = campFeuMateIds(campMates);
  var key = campSoirWorld() + "|" + campMoment() + "|" + ids.join(","); // v3.655.0 : nouvelle phrase quand le moment change
  if (lastRenderedTab !== "campement" || campSoir.key !== key) campSoir = { key: key, text: campSoirPick(ids), tap: null };
  var dark = window.WorldDays && WorldDays.isDark(); // v3.602.0 : la soirée qui suit la nuit dit ce qu'elle a fait
  var h = dark
    ? '<div class="camp-card camp-soir is-night"><div class="camp-soir-k">' + esc(_t("Cette nuit")) + '</div><p class="camp-soir-t">' + esc(WorldDays.nightText()) + '</p></div>'
    : '<div class="camp-card camp-soir is-' + campMoment() + '"><div class="camp-soir-k">' + esc(campMomentTitle()) + '</div><p class="camp-soir-t">' + esc(campSoir.text) + '</p></div>';
  return h; // v3.786.0 : « Au coin du feu » passe dans les anneaux, le festin à côté du repas
}

/* v3.786.0 : anneaux de PV autour des portraits, sur une ligne (5 au plus). Assis au feu : toucher ouvre ses sujets,
   « … » s'il a du nouveau. En sortie, ceux partis avec le héros ont leur anneau, sans conversation. */
function campRingsHTML(campMates) {
  if (!campMates || !campMates.length || !window.CompanionManager) return "";
  var feu = campFeuMateIds(campMates), CT = window.CompanionTalkManager;
  var h = '<div class="camp-rings">' + campMates.map(function (id) {
    var def = getCompanionDef(id), p = Math.max(0, Math.min(100, CompanionManager.hpOf(id) / Math.max(1, CompanionManager.maxHpOf(id)) * 100));
    var here = feu.indexOf(id) >= 0, news = here && CT && typeof CT.hasNewTopic === "function" && CT.hasNewTopic(id);
    var ring = '<span class="camp-ring' + (p < 35 ? ' is-low' : '') + '" id="camp-ring-' + esc(id) + '" style="--p:' + p.toFixed(1) + '">'
      + smallPortraitHTML(def.image, "camp-ring-img", _td(def.name)) + '</span>' + (news ? '<i class="camp-ring-talk">…</i>' : '') + '<span class="camp-ring-nm">' + esc(_td(def.name)) + '</span>';
    return here ? '<button type="button" class="camp-ring-who" onclick="openCompanionMenu(\'' + esc(id) + '\')" aria-label="' + esc(_t("Parler à {n}", { n: _td(def.name) })) + '">' + ring + '</button>'
      : '<span class="camp-ring-who is-away">' + ring + '</span>';
  }).join("") + '</div>';
  if (feu.length) h += '<p class="camp-rings-hint">' + esc(_t("Touche un compagnon pour lui parler.")) + '</p>';
  return h;
}

/* Puces de prix (blé, viande, eau), en rouge s'il en manque. */
function campCostChipsHTML(cost, miss) {
  return Object.keys(cost).map(function (k) {
    var def = (window.WAREHOUSE_RESOURCES || {})[k] || {};
    return '<span class="camp-cost' + (miss.indexOf(k) >= 0 ? ' is-short' : '') + '" title="' + esc(_td(def.name || k)) + '">' + renderIconOrEmojiHTML(def.icon, "camp-cost-ico", "") + formatNumber(cost[k]) + '</span>';
  }).join("");
}
function campMealCostHTML() {
  if (!window.CampManager || CampManager.teamFull()) return "";
  return campCostChipsHTML(CampManager.mealCost(), CampManager.mealMissing());
}
window.campMealCostHTML = campMealCostHTML;

/* Le Repas (toute l'équipe à plein, prix au manque) et le Festin (+10 % dégâts et PV, 3 sorties), côte à côte. */
function campMealActsHTML(teamFull, campLock) {
  if (!window.CampManager) return "";
  var CM = CampManager, okMeal = !teamFull && !campLock && !CM.mealMissing().length;
  var mealIco = "images/Icons/camp/camp_meal.webp";
  var h = '<div class="camp-acts"><button type="button" class="camp-act"' + (okMeal ? ' onclick="CampManager.eatMeal()"' : ' disabled') + '>'
    + renderIconOrEmojiHTML(mealIco, "camp-act-ico", "") + '<b>' + esc(teamFull ? _t("Équipe pleine") : _t("Repas")) + '</b>'
    + '<span class="camp-act-hint">' + esc(teamFull ? _t("rien à payer") : _t("Toute l'équipe à plein")) + '</span>'
    + '<span class="camp-act-cost" id="camp-meal-cost">' + campMealCostHTML() + '</span></button>';
  if (window.FeastManager && window.WarehouseManager) {
    var F = FeastManager, n = F.left(), p = Math.round(FEAST_BONUS * 100);
    if (n > 0) {
      h += '<div class="camp-act is-live">' + renderIconOrEmojiHTML(FEAST_ICON, "camp-act-ico", "") + '<b>' + esc(_t("Festin actif")) + '</b>'
        + '<span class="camp-act-hint">' + esc(_tn(n, "+{p} % dégâts et PV · encore {n} sortie", "+{p} % dégâts et PV · encore {n} sorties", { n: n, p: p })) + '</span></div>';
    } else {
      var miss = F.missing(), okF = !miss.length && !campLock;
      h += '<button type="button" class="camp-act"' + (okF ? ' onclick="FeastManager.prepare()"' : ' disabled') + '>' + renderIconOrEmojiHTML(FEAST_ICON, "camp-act-ico", "")
        + '<b>' + esc(_t("Festin")) + '</b><span class="camp-act-hint">' + esc(_t("+{p} % dégâts et PV, {k} sorties", { p: p, k: FEAST_SORTIES })) + '</span>'
        + '<span class="camp-act-cost">' + campCostChipsHTML(F.cost(), miss) + '</span></button>';
    }
  }
  return h + '</div>';
}

/* v3.594.0 (atelier camp-carte, option M3 de Seb) : en tête du « feu », le monde où l'on est et la carte. */
function campHereCardHTML() {
  if (typeof isTabUnlocked === "function" && !isTabUnlocked("map")) return "";
  var w = window.WorldManager && typeof WorldManager.getWorld === "function" ? WorldManager.getWorld() : null;
  if (!w) return "";
  var lm = window.LivingMapManager ? LivingMapManager.getMapForWorld(w.id) : null, sub = _t("Carte du monde");
  if (lm) { var sm = LivingMapManager.getSummary(lm.id); sub = _t("Carte vivante · {k} secteurs sur {n} libérés", { k: sm.libere, n: sm.total }); }
  return '<button type="button" class="camp-card camp-here" onclick="switchTab(\'map\')"><img class="camp-here-img" src="' + esc(getWorldThumb(w)) + '" alt="">'
    + '<span class="camp-here-tx"><b>' + esc(_t("Tu es ici : {w}", { w: _td(w.name) })) + '</b><small>' + esc(sub) + '</small></span><span class="camp-here-go">' + esc(_t("Carte")) + ' ›</span></button>';
}

/* =========================================================
   v3.567.0 (grand écran, option D) : blocs compacts du Camp, d'après la maquette.
   ========================================================= */
function campWideBar(cur, max, id) { // id : barre tenue à jour par CampManager.refreshCampCard
  return '<span class="cw-bar"><i' + (id ? ' id="' + id + '"' : '') + ' style="width:' + Math.max(0, Math.min(100, 100 * cur / Math.max(1, max))).toFixed(1) + '%"></i></span>';
}

// Le héros et les compagnons qui partent avec lui, puis ceux restés au camp, puis le repas et le festin
function campWideTeamHTML(maxHp, hp, teamFull, campLock, campMates) {
  var hero = typeof getSelectedHero === "function" ? getSelectedHero() : null, cls = hero && typeof getClassForHero === "function" ? getClassForHero(hero) : null;
  var h = '<div class="cw-team"><div class="cw-mb">' + smallPortraitHTML((hero && hero.image) || "", "cw-mb-img", "")
    + '<div class="cw-mb-nm"><b>' + esc(game.playerName || "") + '</b><small>' + esc((cls ? _td(cls.label) + " · " : "") + _t("niv. {n}", { n: Number(game.heroLevel || 1) })) + '</small></div>'
    + '<div class="cw-mb-row">' + campWideBar(hp, maxHp, "camp-hp-fill") + '<span id="camp-fire-hp-value">' + formatNumber(Math.floor(hp)) + ' / ' + formatNumber(maxHp) + '</span></div></div>';
  var CM = window.CompanionManager, party = CM ? CM.partyIds() : [];
  party.forEach(function (id) {
    var def = getCompanionDef(id), mx = Math.max(1, CM.maxHpOf(id)), cur = CM.hpOf(id);
    h += '<div class="cw-mb">' + smallPortraitHTML(def.image, "cw-mb-img", "")
      + '<div class="cw-mb-nm"><b>' + esc(_td(def.name)) + '</b><small>' + esc(def.skill ? _td(def.skill.name) : "") + '</small><span class="cw-pill">' + esc(_t("avec toi")) + '</span></div>'
      + '<div class="cw-mb-row">' + campWideBar(cur, mx, "camp-comp-hp-" + esc(id)) + '<span>' + formatNumber(Math.floor(cur)) + ' / ' + formatNumber(mx) + '</span></div></div>';
  });
  h += '</div>';
  var others = (campMates || []).filter(function (id) { return party.indexOf(id) < 0; });
  if (others.length) {
    h += '<div class="cw-others">' + esc(_t("Au camp :"));
    others.forEach(function (id) {
      var def = getCompanionDef(id), mx = Math.max(1, CM.maxHpOf(id)), cur = Math.floor(CM.hpOf(id));
      h += '<span>' + smallPortraitHTML(def.image, "", "") + esc(_td(def.name)) + (cur < mx ? ' ' + formatNumber(cur) + ' / ' + formatNumber(mx) : '') + '</span>';
    });
    h += '</div>';
  }
  if (campLock) h += '<div class="camp-lock-note"><img class="ico-inline" src="images/Icons/system/hero_away.webp" alt=""> ' + esc(campLock) + '</div>';
  h += campMealActsHTML(teamFull, campLock); // v3.786.0 : repas et festin, comme au téléphone
  return h;
}

function campWideActiveRules() {
  if (typeof ensureGrimoireRules === "function") ensureGrimoireRules();
  var n = typeof getGrimoireSlotCount === "function" ? getGrimoireSlotCount(game.worldsEverReached) : 6;
  return { slots: n, rules: (game.grimoireRules || []).slice(0, n).filter(function (r) { return r && r.conditionId && r.actionSlot; }) };
}
function campWideRulesCount() { var a = campWideActiveRules(); return _t("{a} / {b} règles actives", { a: a.rules.length, b: a.slots }); }

// Grimoire : bascule Tactique / Grimoire, puis les règles actives (« Si … → … »)
function campWideGrimoireHTML() {
  var grim = game.combatMode === "grimoire", a = campWideActiveRules();
  var kit = typeof getGrimoireCurrentKit === "function" ? getGrimoireCurrentKit() : null;
  var h = '<div class="cw-seg"><button type="button" class="' + (grim ? '' : 'is-on') + '" onclick="if(window.CombatEngine)CombatEngine.setCombatMode(\'tactique\');renderPanel()">' + esc(_t("Tactique")) + '</button>'
    + '<button type="button" class="' + (grim ? 'is-on' : '') + '" onclick="if(window.CombatEngine)CombatEngine.setCombatMode(\'grimoire\');renderPanel()">' + esc(_t("Grimoire")) + '</button></div>';
  h += '<p class="cw-note">' + esc(grim ? _t("Mode Grimoire : tes règles jouent seules.") : _t("Mode Tactique : tes règles conseillent, tu choisis.")) + '</p>';
  if (a.rules.length) {
    h += '<div class="cw-rules">';
    a.rules.forEach(function (r) {
      var c = typeof getGrimoireCondition === "function" ? getGrimoireCondition(r.conditionId) : null;
      var act = typeof getGrimoireActionDef === "function" ? getGrimoireActionDef(kit, r.actionSlot) : null;
      var icon = act ? ((typeof CLASS_ACTION_ICON_FALLBACK !== "undefined" && CLASS_ACTION_ICON_FALLBACK[act.id]) || act.icon || "") : "";
      h += '<div class="cw-rule"><b>' + esc(_t("SI")) + '</b><span>' + esc(c ? _td(c.label) : "") + ' → ' + esc(act && act.label ? _td(act.label) : "") + '</span>' + (icon ? renderIconOrEmojiHTML(icon, "", "") : "") + '</div>';
    });
    h += '</div>';
  }
  return h + '<button class="cw-btn" type="button" onclick="switchTab(\'grimoire\')">' + esc(_t("Régler mes tactiques")) + '</button>';
}

// Missions en lignes : icône, titre et badge, lieu et objectif, récompenses, action à droite
function campWideMissionsHTML() {
  if (!window.MissionBoard) return "";
  var top = MissionBoard.top(3);
  var h = '<div class="cw-mlist">';
  if (!top.length) h += '<p class="cw-note">' + esc(_t("Rien à signaler pour l'instant.")) + '</p>';
  top.forEach(function (m) {
    var enCours = m.status === "running" || m.status === "accepted", obj = m.objectiveLabel || "";
    if (enCours && m.progressLabel) obj = obj ? obj + " — " + m.progressLabel : m.progressLabel;
    h += '<div class="cw-mrow' + (m.claim ? ' is-claim' : '') + '">' + renderIconOrEmojiHTML(MissionBoard.typeIcon(m.type), "cw-mrow-ico", "")
      + '<div class="cw-mrow-tx"><h4>' + esc(_td(m.title)) + ' <span class="cw-badge">' + (m.badge === "story" ? _t("Histoire", "badge") : _t("Contrat", "badge")) + '</span></h4>'
      + '<p>' + esc([m.place ? _td(m.place) : "", obj].filter(Boolean).join(" · ")) + '</p>'
      + (m.rewardSummary ? '<div class="cw-chips">' + m.rewardSummary.split(" · ").map(function (c) { return '<span>' + esc(c) + '</span>'; }).join("") + '</div>' : '')
      + '</div><div class="cw-mrow-act">' + buildCampMissionActionHTML(m) + '</div></div>';
  });
  return h + '<div class="cw-mfoot"><button class="cw-btn" type="button" onclick="switchTab(\'quests\')">' + esc(_t("Voir le tableau complet")) + '</button></div></div>';
}

window.buildCampHTML = buildCampHTML;

/* v3.426.0 (chantier Expéditions) : les portes Potions (v3.250.0), Donjon et Carte (v3.244.0) de
   l'ancien onglet « Départ » sont dans le tableau des départs (ui/expeditions-view.js). */

