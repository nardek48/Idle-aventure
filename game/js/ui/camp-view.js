"use strict";
/* ui/camp-view.js — écran Campement (page d'accueil, v3.7 ; hub v3.103.1) : feu de camp (repos long/court), tableau de
   missions (MissionBoard.top(3), LIGNE_DIRECTRICE §3). Accès rapides supprimés v3.181.0. Détail : COMMENTAIRES_ORIGINAUX.md */

var CAMP_MISSION_TYPE_LABEL = { combat: _t("Combat"), expedition: _t("Expédition"), chasse: _t("Chasse", "quête"), donjon: _t("Donjon") };
var CAMP_MISSION_STATUS_CLASS = { claimable: "is-claimable", running: "is-running", accepted: "is-running", available: "" };

function buildCampMissionActionHTML(m) {
  if (m.claim) return '<button class="settings-btn primary camp-mission-btn" type="button" onclick="event.stopPropagation(); campMissionAction(\'' + esc(m.id) + '\', \'claim\')"><img class=ico-inline src=images/Icons/dungeon/dungeon_guaranteed_loot.png> ' + _t("Réclamer") + '</button>';
  if (m.status === "running" || m.status === "accepted") {
    var h = '<div class="camp-mission-actions">';
    // v3.117.0 : "accepted" = acceptée mais pas encore lancée (ex. expédition à mini-jeu juste
    // acceptée) -> "Partir" ; "running" = déjà en cours -> "Continuer". Même bouton launch.
    var launchLabel = m.status === "running" ? '<img class="ico-btn" src="images/Icons/quests/continue.png" alt=""> ' + _t("Continuer") : '<img class="ico-btn" src="images/Icons/quests/start_expedition.png" alt=""> ' + _t("Partir");
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
  if (m.rewardSummary) h += '<div class="camp-mission-reward"><img class=ico-inline src=images/Icons/dungeon/dungeon_guaranteed_loot.png> ' + esc(m.rewardSummary) + '</div>';
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
  { key: "missions", label: _t("Missions"), icon: "images/Icons/quests/quest_list.png" },
  { key: "depart", label: _t("Expéditions"), icon: "images/Icons/quests/start_expedition.png" }, // v3.426.0 : était « Départ »
  { key: "grimoire", label: _t("Grimoire"), icon: "images/Icons/codex/codex_lore.png" }
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

  var h = '<div class="nb-page-frame nb-page-frame-fill camp-page kframe-page" data-kf-title="images/Icons/quests/village_quest.png|' + _t("Campement") + '">';

  // v3.194.0 (Seb) : titre et sous-titre retirés — le bandeau figé porte
  // déjà « <img class=ico-inline src=images/Icons/quests/village_quest.png> Campement », la ligne d'ambiance n'apportait rien.

  if (game.justDied) {
    h += '<div class="camp-death-banner"><img class="ico-lg" src="images/Icons/camp/hero_defeated.png" alt=""> ' + _t("Tu es tombé au combat. Mange une ration, ou laisse le feu faire son œuvre, avant de repartir.") + '</div>';
    game.justDied = false;
  }

  var hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));

  /* v3.411.0 (atelier Campement, Seb : R3b) : la santé tient en deux lignes et reste toujours
     visible — ligne 1 : icône + jauge de PV (+ régénération dessous) ; ligne 2 : les rations en
     boutons carrés (icône, soin, stock en pastille). Toucher une ration = la manger.
     Les identifiants camp-hp-fill, camp-fire-hp-value et camp-fire-eta sont gardés : le
     système de camp les met à jour en direct. */
  h += '<div class="camp-card camp-health-card">';
  h += '<div class="camp-hp-line"><img class="camp-hp-ico" src="images/Icons/combat_stats/stat_health.png" alt="">';
  h += '<div class="camp-hp-bar kgauge kgauge-thin kgauge-hp"><div class="kgauge-track"><div class="kgauge-fill" id="camp-hp-fill" style="width:' + hpPct + '%"></div></div>'
    + '<span class="kgauge-text" id="camp-fire-hp-value">' + formatNumber(Math.floor(hp)) + ' / ' + formatNumber(maxHp) + '</span></div></div>';

  /* Régénération — v3.260.0 (décision Seb) : une seule ligne et un « ? » qui déplie l'explication. */
  h += '<div class="camp-regen-line">';
  h += '<span class="camp-regen-rate">' + _t("+{n} % PV/min", { n: regenPct }) + '</span>';
  // v3.242.0 (bug Seb) : esc() enveloppait AUSSI la balise <img> — seule la partie texte est échappée.
  h += '<span class="camp-regen-eta" id="camp-fire-eta">' + (hpFull
    ? '<img class=ico-inline src=images/Icons/system/check_valid.png> ' + _t("PV au maximum")
    : '<img class=ico-inline src=images/Icons/system/hourglass_waiting.png> ' + esc(_t("Max dans {d}", { d: formatTime(Math.ceil(minutesToFull * 60)) }))) + '</span>';
  h += '<button type="button" class="camp-help-btn" aria-label="' + _t("Régénération : explication") + '" aria-expanded="' + (campRegenHelpOpen ? 'true' : 'false') + '" onclick="toggleCampRegenHelp()">?</button>';
  h += '</div>';
  if (campRegenHelpOpen) {
    h += '<div class="camp-regen-desc">' + _t("Hors combat, tes PV remontent seuls au rythme indiqué. Les rations soignent tout de suite. Pendant ton absence, le feu rend au plus {n} % des PV max.",
      { n: Math.round((typeof getCampOfflineRegenCap === "function" ? getCampOfflineRegenCap() : 0.5) * 100) }) + '</div>';
  }

  var campLock = (window.heroLockReason && heroLockReason()) || null; // v3.307.0
  if (campLock) h += '<div class="camp-lock-note"><img class="ico-inline" src="images/Icons/system/hero_away.png" alt=""> ' + esc(campLock) + '</div>';
  h += '<div class="camp-ration-row">';
  rationOptions.forEach(function (r) {
    var def = (window.WAREHOUSE_RESOURCES || {})[r.id] || {};
    var healValue = Math.floor(maxHp * r.healPct);
    var canEat = r.amount >= 1 && !hpFull && !campLock;
    h += '<button type="button" class="camp-ration-ib' + (r.amount < 1 ? ' is-empty' : '') + '"'
      + ' title="' + esc(_td(r.name) + " · " + Math.round(r.healPct * 100) + " %") + '" aria-label="' + esc(_t("Manger : {x}", { x: _td(r.name) })) + '"'
      + (canEat ? ' onclick="CampManager.eatRation(\'' + esc(r.id) + '\');"' : ' disabled') + '>';
    h += renderIconOrEmojiHTML(def.icon || "images/Icons/quests/ration_reward.png", "camp-ration-ib-img", _td(r.name));
    h += '<b>+' + formatNumber(healValue) + '</b>';
    h += '<i class="camp-ration-ib-n">' + formatNumber(r.amount) + '</i>';
    h += '</button>';
  });
  h += '</div>';
  if (!hpFull && !campLock && rationOptions.some(function (r) { return r.amount >= 1; })) h += '<div class="camp-ration-hint">' + _t("Toucher une ration pour la manger") + '</div>';
  h += '</div>'; // fin .camp-health-card

  // v3.133.0 : bloc « Les braises » — offrande de l'étape Histoire courante (forest_15), affiché
  // seulement pendant l'étape acceptée et tant que l'offrande n'est pas faite (StoryQuestManager.getOfferingInfo).
  var offering = (window.StoryQuestManager && typeof StoryQuestManager.getOfferingInfo === "function") ? StoryQuestManager.getOfferingInfo(null, "camp") : null; // v3.297.0 : chapitre actif ; v3.310.0 : offrandes du Camp seulement
  if (offering) {
    h += '<div class="camp-card camp-embers-card">';
    h += '<div class="ksec camp-section-title"><img class="ico-lg" src="images/Icons/camp/campfire.png" alt=""> ' + _t("Les braises") + '</div>';
    h += '<div class="camp-embers-desc">' + esc(_td(offering.step.narrative.objective)) + '</div>';
    // v3.197.0 (passe de ton) : les anciens parlent avant l'offrande (buildStoryDialogueHTML, quests-view.js).
    if (typeof buildStoryDialogueHTML === "function") h += buildStoryDialogueHTML(offering.step);
    h += '<div class="camp-embers-list">';
    offering.items.forEach(function (it) {
      var okItem = it.have >= it.need;
      h += '<div class="camp-embers-item' + (okItem ? ' is-ready' : '') + '">';
      h += '<span class="camp-embers-icon">' + renderIconOrEmojiHTML(it.icon || "images/Icons/scene/path_easy.png", "camp-embers-icon-img", _td(it.name)) + '</span>';
      h += '<span class="camp-embers-name">' + esc(_td(it.name)) + '</span>';
      h += '<span class="camp-embers-count">' + (okItem ? '<img class=ico-inline src=images/Icons/system/check_valid.png> ' : '') + formatNumber(Math.min(it.have, it.need)) + '/' + formatNumber(it.need) + '</span>';
      h += '</div>';
    });
    h += '</div>';
    h += '<button class="settings-btn primary camp-embers-btn" type="button"' + (offering.canOffer ? ' onclick="StoryQuestManager.offerToEmbers(\'' + esc(offering.chapterId) + '\');"' : ' disabled') + '><img class=ico-inline src=images/Icons/camp/campfire.png> ' + _t("Offrir aux braises") + '</button>';
    h += '</div>';
  }

  /* v3.411.0 (atelier Campement, R3) : sous la santé, trois onglets en rail du kit —
     Missions · Départ (préparer, expédition) · Grimoire. Un onglet n'apparaît que s'il a du
     contenu ; s'il n'en reste qu'un, pas de rail. L'onglet ouvert est retenu (campTab). */
  var tabsHTML = {};
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
      + (counterCount ? ' · <span class="camp-grimoire-counters"><img class=ico-inline src=images/Icons/combat_stats/stat_speed.png> ' + _tn(counterCount, "{n} contre", "{n} contres") + '</span>' : '')
      + '</div>';
    gh += '<div class="camp-grimoire-mode">' + (game.combatMode === "grimoire"
      ? '<img class=ico-inline src=images/Icons/codex/codex_lore.png> ' + _t("Mode Grimoire : tes règles jouent seules.")
      : '<img class=ico-inline src=images/Icons/combat_stats/stat_critical.png> ' + _t("Mode Tactique : tes règles conseillent, tu choisis.")) + '</div>';
    gh += '<button class="settings-btn" type="button" onclick="switchTab(\'grimoire\')">' + _t("Régler mes tactiques") + '</button>';
    gh += '</div>';
    tabsHTML.grimoire = gh;
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
        + (t.key === "missions" && claimable ? '<span class="kseg-dot">' + claimable + '</span>' : '')
        + (t.key === "depart" && toCollect ? '<span class="kseg-dot is-green">' + toCollect + '</span>' : '') + '</button>';
    });
    h += '</div>';
  }
  campShownTab = cur; // v3.426.0 : lu par renderPanel (bulles masquées sur Expéditions)
  h += tabsHTML[cur];

  // v3.181.0 (décision Seb) : carte « Accès rapide » supprimée — la nav du
  // bas couvre ces raccourcis depuis la refonte.

  h += '</div>';
  return h;
}

window.buildCampHTML = buildCampHTML;

/* v3.426.0 (chantier Expéditions) : les portes Potions (v3.250.0), Donjon et Carte (v3.244.0) de
   l'ancien onglet « Départ » sont dans le tableau des départs (ui/expeditions-view.js). */

