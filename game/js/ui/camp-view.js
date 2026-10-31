"use strict";
/* ui/camp-view.js — écran Campement (page d'accueil, v3.7 ; hub v3.103.1) : feu de camp (repos long/court), tableau de
   missions (MissionBoard.top(3), LIGNE_DIRECTRICE §3). Accès rapides supprimés v3.181.0. Détail : COMMENTAIRES_ORIGINAUX.md */

var CAMP_MISSION_TYPE_LABEL = { combat: _t("Combat"), expedition: _t("Expédition"), chasse: _t("Chasse", "quête"), donjon: _t("Donjon") };
var CAMP_MISSION_STATUS_CLASS = { claimable: "is-claimable", running: "is-running", accepted: "is-running", available: "" };

function buildCampMissionActionHTML(m) {
  if (m.claim) return '<button class="settings-btn primary camp-mission-btn" type="button" onclick="event.stopPropagation(); campMissionAction(\'' + esc(m.id) + '\', \'claim\')"><img class=ico-inline src=images/Icons/dungeon/dungeon_guaranteed_loot.webp> ' + _t("Réclamer") + '</button>';
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

function buildCampMissionCardHTML(m) {
  var cls = CAMP_MISSION_STATUS_CLASS[m.status] || "";
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
  // v3.234.0 (retour Seb) : le `||` faisait gagner le compteur dès qu'il existait,
  // et objectiveLabel — le seul champ qui dit QUOI FAIRE — disparaissait. Sur une
  // quête de village, progress() renvoie un « 0/2 » nu : la carte ne disait plus rien.
  var enCours = m.status === "running" || m.status === "accepted";
  var objective = m.objectiveLabel || "";
  if (enCours && m.progressLabel) objective = objective ? (objective + " \u2014 " + m.progressLabel) : m.progressLabel;
  if (objective) h += '<div class="camp-mission-objective">' + esc(objective) + '</div>';
  if (m.rewardSummary) h += '<div class="camp-mission-reward"><img class=ico-inline src=images/Icons/dungeon/dungeon_guaranteed_loot.webp> ' + esc(m.rewardSummary) + '</div>';
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
    m[action]();
    if (typeof renderPanel === "function") renderPanel();
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

/* v3.458.3 (audit C9) : toucher une ration épuisée. */
function campRationEmpty() {
  if (typeof showToast === "function") showToast(_t("Les rations se préparent à la Cuisine de camp : Village › Ateliers."), 2600);
}
window.campRationEmpty = campRationEmpty;

/* v3.411.0 : onglet ouvert du Campement (retenu pendant la session). */
var CAMP_TABS = [
  { key: "feu", label: _t("Le feu"), icon: "images/Icons/camp/campfire.webp" }, // v3.594.0 (atelier camp-carte, choix Seb) : santé, rations, compagnons
  { key: "missions", label: _t("Missions"), icon: "images/Icons/quests/quest_list.webp" },
  { key: "depart", label: _t("Expéditions"), icon: "images/Icons/quests/start_expedition.webp" }, // v3.426.0 : était « Départ »
  { key: "grimoire", label: _t("Grimoire"), icon: "images/Icons/codex/codex_lore.webp" }
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

  // v3.101.0 (P3-lite) : régénération lente + Rations (v3.106.0), plus de repos à horloge.
  if (window.CampManager) CampManager.applyRegen(false);
  var maxHp = game.heroMaxHp || 1;
  var hp = game.heroHp != null ? game.heroHp : maxHp;
  var hpFull = hp >= maxHp;
  var regenPct = window.CampManager ? Math.round(CampManager.getRegenPctPerMin() * 100) : 5;
  var minutesToFull = window.CampManager ? CampManager.getMinutesToFull() : 0;
  var rationOptions = window.CampManager ? CampManager.getRationOptions() : [];

  var h = '<div class="nb-page-frame nb-page-frame-fill camp-page kframe-page" data-kf-banner="camp" data-kf-title="images/Icons/quests/village_quest.webp|' + _t("Campement") + '">';

  // v3.194.0 (Seb) : titre et sous-titre retirés — le bandeau figé porte
  // déjà « <img class=ico-inline src=images/Icons/quests/village_quest.webp> Campement », la ligne d'ambiance n'apportait rien.

  if (game.justDied) {
    h += '<div class="camp-death-banner"><img class="ico-lg" src="images/Icons/camp/hero_defeated.webp" alt=""> ' + _t("Tu es à terre. Mange une ration, ou laisse le feu faire son œuvre, avant de repartir.") + '</div>';
    game.justDied = false;
  }

  var hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));

  /* v3.411.0 (atelier Campement, Seb : R3b) : la santé tient en deux lignes et reste toujours
     visible — ligne 1 : icône + jauge de PV (+ régénération dessous) ; ligne 2 : les rations en
     boutons carrés (icône, soin, stock en pastille). Toucher une ration = la manger.
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
    h += '<div class="camp-regen-desc">' + _t("Hors combat, tes PV remontent seuls au rythme indiqué, même pendant ton absence. Les rations soignent tout de suite.") + '</div>';
  }

  /* v3.448.0 : les compagnons au camp, une ligne fine chacun — le feu et les rations les soignent aussi. */
  var campMates = window.CampManager ? CampManager.campCompanionIds() : [];
  if (campMates.length) {
    h += '<div class="camp-mates">';
    campMates.forEach(function (id) {
      var def = getCompanionDef(id), mx = Math.max(1, CompanionManager.maxHpOf(id)), cur = CompanionManager.hpOf(id);
      h += '<div class="camp-mate">' + renderIconOrEmojiHTML(def.image, "camp-mate-ico", _td(def.name)) + '<span>' + esc(_td(def.name)) + '</span>'
        + '<div class="kgauge kgauge-thin kgauge-hp"><div class="kgauge-track"><div class="kgauge-fill" id="camp-comp-hp-' + esc(id) + '" style="width:' + Math.max(0, Math.min(100, cur / mx * 100)) + '%"></div></div></div></div>';
    });
    h += '</div>';
  }
  var teamFull = window.CampManager ? CampManager.teamFull() : hpFull;

  var campLock = (window.heroLockReason && heroLockReason()) || null; // v3.307.0
  if (campLock) h += '<div class="camp-lock-note"><img class="ico-inline" src="images/Icons/system/hero_away.webp" alt=""> ' + esc(campLock) + '</div>';
  h += '<div class="camp-ration-row">';
  rationOptions.forEach(function (r) {
    var def = (window.WAREHOUSE_RESOURCES || {})[r.id] || {};
    var healValue = Math.floor(maxHp * r.healPct);
    var canEat = r.amount >= 1 && !teamFull && !campLock;
    h += '<button type="button" class="camp-ration-ib' + (r.amount < 1 ? ' is-empty' : '') + '"'
      + ' title="' + esc(_td(r.name) + " · " + Math.round(r.healPct * 100) + " %") + '" aria-label="' + esc(_t("Manger : {x}", { x: _td(r.name) })) + '"'
      // v3.458.3 (audit C9) : une ration à 0 dit où elle se prépare, au lieu d'un bouton muet
      + (canEat ? ' onclick="CampManager.eatRation(\'' + esc(r.id) + '\');"' : (r.amount < 1 ? ' onclick="campRationEmpty()"' : ' disabled')) + '>';
    h += renderIconOrEmojiHTML(def.icon || "images/Icons/quests/ration_reward.webp", "camp-ration-ib-img", _td(r.name));
    h += '<b>+' + formatNumber(healValue) + '</b>';
    h += '<i class="camp-ration-ib-n">' + formatNumber(r.amount) + '</i>';
    h += '</button>';
  });
  h += '</div>';
  if (!teamFull && !campLock && rationOptions.some(function (r) { return r.amount >= 1; })) h += '<div class="camp-ration-hint">' + (campMates.length ? _t("Toucher une ration : toute l'équipe mange") : _t("Toucher une ration pour la manger")) + '</div>';
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
  tabsHTML.feu = campHereCardHTML() + hc;
  var mh = '<div class="camp-card camp-missions-card">';
  mh += buildCampMissionBoardHTML();
  mh += '<button class="settings-btn" type="button" onclick="switchTab(\'quests\')">' + _t("Voir le tableau complet") + '</button>';
  mh += '</div>';
  tabsHTML.missions = mh;
  // v3.244.0 (chantier Navigation, décision Seb) : Donjon et Carte du monde quittent le menu ☰ pour le bloc « Expédition »
  // v3.426.0 (chantier Expéditions) : l'onglet devient le tableau des départs (ui/expeditions-view.js)
  var dep = (typeof buildExpeditionsBoardHTML === "function") ? buildExpeditionsBoardHTML() : "";
  if (dep) tabsHTML.depart = dep;
  // v3.210.0 (décision Seb) : raccourci vers le Grimoire, même verrou que l'ancienne entrée de menu.
  if (typeof isTabUnlocked !== "function" || isTabUnlocked("grimoire")) {
    ensureGrimoireRules();
    var slotCount = (typeof getGrimoireSlotCount === "function") ? getGrimoireSlotCount(game.worldsEverReached) : 6;
    var kit = (typeof getGrimoireCurrentKit === "function") ? getGrimoireCurrentKit() : null;
    var activeRules = game.grimoireRules.slice(0, slotCount).filter(function (r) {
      return r && r.conditionId && r.actionSlot;
    });
    var counterCount = activeRules.filter(function (r) {
      return (typeof isGrimoireRuleCounter === "function") && isGrimoireRuleCounter(r, kit);
    }).length;
    var gh = '<div class="camp-card camp-grimoire-card">';
    gh += '<div class="camp-grimoire-summary">' + _t("{a} / {b} règles actives", { a: activeRules.length, b: slotCount })
      + (counterCount ? ' · <span class="camp-grimoire-counters"><img class=ico-inline src=images/Icons/combat_status/counter.webp> ' + _tn(counterCount, "{n} contre", "{n} contres") + '</span>' : '')
      + '</div>';
    gh += '<div class="camp-grimoire-mode">' + (game.combatMode === "grimoire"
      ? '<img class=ico-inline src=images/Icons/codex/codex_lore.webp> ' + _t("Mode Grimoire : tes règles jouent seules.")
      : '<img class=ico-inline src=images/Icons/combat_stats/stat_critical.webp> ' + _t("Mode Tactique : tes règles conseillent, tu choisis.")) + '</div>';
    gh += '<button class="settings-btn" type="button" onclick="switchTab(\'grimoire\')">' + _t("Régler mes tactiques") + '</button>';
    gh += '</div>';
    tabsHTML.grimoire = gh;
  }
  // v3.558.0 (grand écran, option B) : une seule page, sans onglets ; v3.567.0 (option D) : blocs compacts
  // de la maquette (atelier/grand-ecran.html) — équipe, rations, Grimoire, missions, expéditions. Le téléphone ne change pas.
  if (!tab && document.documentElement.classList.contains("wide-mode")) {
    var titled = function (t, sub, x) { return x ? '<section class="cw-card"><h3 class="cw-h">' + esc(t) + (sub ? ' <small>' + sub + '</small>' : '') + '</h3>' + x + '</section>' : ""; };
    campShownTab = "missions";
    var sub = esc(_t("+{n} % PV/min", { n: regenPct })) + ' · <span id="camp-fire-eta">' + esc(hpFull ? _t("PV au maximum") : _t("Max dans {d}", { d: formatTime(Math.ceil(minutesToFull * 60)) })) + '</span>';
    return h + '<div class="cw"><div class="cw-col">'
      + titled(_t("Le feu de camp"), sub, campWideTeamHTML(maxHp, hp, rationOptions, teamFull, campLock, campMates)) + eh
      + titled(_t("Grimoire"), tabsHTML.grimoire ? esc(campWideRulesCount()) : "", tabsHTML.grimoire ? campWideGrimoireHTML() : "") + '</div>'
      + '<div class="cw-col">' + titled(_t("Missions"), "", campWideMissionsHTML()) + titled(_t("Expéditions"), "", tabsHTML.depart || "") + '</div></div></div>';
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
        + (t.key === "feu" && !teamFull ? '<span class="kseg-dot">!</span>' : '') // v3.594.0 : à soigner
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
  return h;
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

// Le héros et les compagnons qui partent avec lui, puis ceux restés au camp, puis les rations
function campWideTeamHTML(maxHp, hp, rations, teamFull, campLock, campMates) {
  var hero = typeof getSelectedHero === "function" ? getSelectedHero() : null, cls = hero && typeof getClassForHero === "function" ? getClassForHero(hero) : null;
  var h = '<div class="cw-team"><div class="cw-mb">' + renderIconOrEmojiHTML((hero && hero.image) || "", "cw-mb-img", "")
    + '<div class="cw-mb-nm"><b>' + esc(game.playerName || "") + '</b><small>' + esc((cls ? _td(cls.label) + " · " : "") + _t("niv. {n}", { n: Number(game.heroLevel || 1) })) + '</small></div>'
    + '<div class="cw-mb-row">' + campWideBar(hp, maxHp, "camp-hp-fill") + '<span id="camp-fire-hp-value">' + formatNumber(Math.floor(hp)) + ' / ' + formatNumber(maxHp) + '</span></div></div>';
  var CM = window.CompanionManager, party = CM ? CM.partyIds() : [];
  party.forEach(function (id) {
    var def = getCompanionDef(id), mx = Math.max(1, CM.maxHpOf(id)), cur = CM.hpOf(id);
    h += '<div class="cw-mb">' + renderIconOrEmojiHTML(def.image, "cw-mb-img", "")
      + '<div class="cw-mb-nm"><b>' + esc(_td(def.name)) + '</b><small>' + esc(def.skill ? _td(def.skill.name) : "") + '</small><span class="cw-pill">' + esc(_t("avec toi")) + '</span></div>'
      + '<div class="cw-mb-row">' + campWideBar(cur, mx, "camp-comp-hp-" + esc(id)) + '<span>' + formatNumber(Math.floor(cur)) + ' / ' + formatNumber(mx) + '</span></div></div>';
  });
  h += '</div>';
  var others = (campMates || []).filter(function (id) { return party.indexOf(id) < 0; });
  if (others.length) {
    h += '<div class="cw-others">' + esc(_t("Au camp :"));
    others.forEach(function (id) {
      var def = getCompanionDef(id), mx = Math.max(1, CM.maxHpOf(id)), cur = Math.floor(CM.hpOf(id));
      h += '<span>' + renderIconOrEmojiHTML(def.image, "", "") + esc(_td(def.name)) + (cur < mx ? ' ' + formatNumber(cur) + ' / ' + formatNumber(mx) : '') + '</span>';
    });
    h += '</div>';
  }
  if (campLock) h += '<div class="camp-lock-note"><img class="ico-inline" src="images/Icons/system/hero_away.webp" alt=""> ' + esc(campLock) + '</div>';
  h += '<div class="cw-rations">';
  rations.forEach(function (r) {
    var def = (window.WAREHOUSE_RESOURCES || {})[r.id] || {}, canEat = r.amount >= 1 && !teamFull && !campLock;
    h += '<button type="button" class="cw-ration' + (r.amount < 1 ? ' is-off' : '') + '"' + (canEat ? ' onclick="CampManager.eatRation(\'' + esc(r.id) + '\');"' : (r.amount < 1 ? ' onclick="campRationEmpty()"' : ' disabled')) + '>'
      + renderIconOrEmojiHTML(def.icon || "images/Icons/quests/ration_reward.webp", "", "") + '<span><b>+' + formatNumber(Math.floor(maxHp * r.healPct)) + '</b><small>' + esc(_td(r.name)) + '</small></span>'
      + '<i class="cw-ration-n">' + formatNumber(r.amount) + '</i></button>';
  });
  h += '</div><p class="cw-note">' + esc(party.length || (campMates || []).length ? _t("Une ration : toute l'équipe mange.") : _t("Toucher une ration pour la manger")) + '</p>';
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

