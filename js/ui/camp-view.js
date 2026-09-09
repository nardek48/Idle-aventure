"use strict";
/* ui/camp-view.js — écran Campement (page d'accueil, v3.7 ; hub v3.103.1) : feu de camp (repos long/court), tableau de
   missions (MissionBoard.top(3), LIGNE_DIRECTRICE §3). Accès rapides supprimés v3.181.0. Détail : COMMENTAIRES_ORIGINAUX.md */

var CAMP_MISSION_TYPE_LABEL = { combat: "Combat", expedition: "Expédition", chasse: "Chasse", donjon: "Donjon" };
var CAMP_MISSION_STATUS_CLASS = { claimable: "is-claimable", running: "is-running", accepted: "is-running", available: "" };

function buildCampMissionActionHTML(m) {
  if (m.claim) return '<button class="settings-btn primary camp-mission-btn" type="button" onclick="event.stopPropagation(); campMissionAction(\'' + esc(m.id) + '\', \'claim\')">🎁 Réclamer</button>';
  if (m.status === "running" || m.status === "accepted") {
    var h = '<div class="camp-mission-actions">';
    // v3.117.0 : "accepted" = acceptée mais pas encore lancée (ex. expédition à mini-jeu juste
    // acceptée) -> "Partir" ; "running" = déjà en cours -> "Continuer". Même bouton launch.
    var launchLabel = m.status === "running" ? "▶ Continuer" : "🚩 Partir";
    if (m.launch) h += '<button class="settings-btn primary camp-mission-btn" type="button" onclick="event.stopPropagation(); campMissionAction(\'' + esc(m.id) + '\', \'launch\')">' + launchLabel + '</button>';
    if (m.abandon) h += '<button class="settings-btn danger camp-mission-btn" type="button" onclick="event.stopPropagation(); campMissionAction(\'' + esc(m.id) + '\', \'abandon\')">Abandonner</button>';
    h += '</div>';
    return h;
  }
  if (m.accept) return '<button class="settings-btn primary camp-mission-btn" type="button" onclick="event.stopPropagation(); campMissionAction(\'' + esc(m.id) + '\', \'accept\')">Accepter</button>';
  return "";
}

function buildCampMissionCardHTML(m) {
  var cls = CAMP_MISSION_STATUS_CLASS[m.status] || "";
  var h = '<div class="camp-mission-card ' + cls + (m.isMain ? ' is-main' : '') + '">';
  h += '<div class="camp-mission-head">';
  h += '<span class="camp-mission-icon">' + renderIconOrEmojiHTML(MissionBoard.typeIcon(m.type), "camp-mission-icon-img", m.title) + '</span>';
  h += '<div class="camp-mission-title-col">';
  h += '<div class="camp-mission-title-row">';
  h += '<span class="camp-mission-title">' + esc(m.title) + '</span>';
  h += '<span class="camp-mission-badge camp-mission-badge-' + esc(m.badge) + '">' + (m.badge === "story" ? "Histoire" : "Contrat") + '</span>';
  h += '</div>';
  if (m.place) h += '<div class="camp-mission-place">' + esc(m.place) + '</div>';
  h += '</div>';
  h += '</div>';
  var objective = m.status === "running" || m.status === "accepted" ? (m.progressLabel || m.objectiveLabel) : m.objectiveLabel;
  if (objective) h += '<div class="camp-mission-objective">' + esc(objective) + '</div>';
  if (m.rewardSummary) h += '<div class="camp-mission-reward">🎁 ' + esc(m.rewardSummary) + '</div>';
  h += buildCampMissionActionHTML(m);
  h += '</div>';
  return h;
}

function buildCampMissionBoardHTML() {
  if (!window.MissionBoard) return '<div class="camp-summary-row camp-summary-empty">Tableau de missions indisponible.</div>';
  var top = MissionBoard.top(3);
  if (!top.length) return '<div class="camp-summary-row camp-summary-empty">Rien à signaler pour l\'instant.</div>';
  return top.map(buildCampMissionCardHTML).join("");
}

/* Point d'entrée unique des boutons de mission (évite d'inliner 4 managers différents dans le HTML). */
function campMissionAction(missionId, action) {
  var m = window.MissionBoard ? MissionBoard.getById(missionId) : null;
  if (!m || typeof m[action] !== "function") return;
  m[action]();
  if (typeof renderPanel === "function") renderPanel();
}
window.campMissionAction = campMissionAction;
window.buildCampMissionBoardHTML = buildCampMissionBoardHTML;
window.buildCampMissionCardHTML = buildCampMissionCardHTML;

function buildCampHTML() {
  if (window.CampManager) CampManager.ensureDefaults();

  // v3.101.0 (P3-lite) : régénération lente + Rations (v3.106.0), plus de repos à horloge.
  if (window.CampManager) CampManager.applyRegen(false);
  var maxHp = game.heroMaxHp || 1;
  var hp = game.heroHp != null ? game.heroHp : maxHp;
  var hpFull = hp >= maxHp;
  var regenPct = window.CampManager ? Math.round(CampManager.getRegenPctPerMin() * 100) : 5;
  var minutesToFull = window.CampManager ? CampManager.getMinutesToFull() : 0;
  var rationOptions = window.CampManager ? CampManager.getRationOptions() : [];

  var h = '<div class="nb-page-frame camp-page kframe-page" data-kf-title="\u26fa Campement">';

  // v3.194.0 (Seb) : titre et sous-titre retirés — le bandeau figé porte
  // déjà « ⛺ Campement », la ligne d'ambiance n'apportait rien.

  if (game.justDied) {
    h += '<div class="camp-death-banner">💀 Tu es tombé au combat. Mange une ration, ou laisse le feu faire son œuvre, avant de repartir.</div>';
    game.justDied = false;
  }

  var hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));

  // v3.116.0 (Lot C, maquette Seb) : bloc Santé du Héros — barre de PV pleine largeur.
  h += '<div class="camp-card camp-health-card">';
  h += '<div class="camp-section-title">❤️ Santé du Héros</div>';
  // v3.173.0 : jauge fine du kit (vert, aligné sur les PV héros du combat — avant : rouge).
  // v3.174.0 (retour Seb) : PV courants/max affichés DANS la barre (kgauge-text)
  // au lieu d'une ligne séparée dessous — l'id camp-fire-hp-value migre sur le
  // texte de la jauge (camp-system.js le met à jour tel quel).
  h += '<div class="camp-hp-bar kgauge kgauge-thin kgauge-hp"><div class="kgauge-track"><div class="kgauge-fill" id="camp-hp-fill" style="width:' + hpPct + '%"></div></div>'
    + '<span class="kgauge-text" id="camp-fire-hp-value">' + formatNumber(Math.floor(hp)) + ' / ' + formatNumber(maxHp) + '</span></div>';

  // Bloc Rations — 3 cartes côte à côte (icône, soin, stock, bouton Manger).
  h += '<div class="camp-section-title camp-section-sub">🍖 Rations</div>';
  h += '<div class="camp-ration-grid">';
  rationOptions.forEach(function (r) {
    var def = (window.WAREHOUSE_RESOURCES || {})[r.id] || {};
    var healValue = Math.floor(maxHp * r.healPct);
    var canEat = r.amount >= 1 && !hpFull;
    h += '<div class="camp-ration-item' + (r.amount < 1 ? ' is-empty' : '') + '">';
    h += '<div class="camp-ration-icon">' + renderIconOrEmojiHTML(def.icon || "🍞", "camp-ration-icon-img", r.name) + '</div>';
    h += '<div class="camp-ration-heal">❤️ +' + formatNumber(healValue) + '</div>';
    h += '<div class="camp-ration-stock">×' + formatNumber(r.amount) + ' · ' + Math.round(r.healPct * 100) + ' %</div>';
    h += '<button class="settings-btn primary camp-ration-btn" type="button"' + (canEat ? ' onclick="CampManager.eatRation(\'' + esc(r.id) + '\');"' : ' disabled') + '>Manger</button>';
    h += '</div>';
  });
  h += '</div>';

  // Bloc Régénération — barre verte + rythme + temps restant.
  h += '<div class="camp-section-title camp-section-sub">✚ Régénération</div>';
  h += '<div class="camp-regen-desc">Récupère des PV automatiquement au fil du temps, hors combat.</div>';
  // v3.173.0 : jauge fine du kit, teinte sarcelle (kgauge-focus) pour la distinguer de la barre de PV verte juste au-dessus.
  h += '<div class="camp-regen-bar kgauge kgauge-thin kgauge-focus"><div class="kgauge-track"><div class="kgauge-fill" id="camp-regen-fill" style="width:' + hpPct + '%"></div></div></div>';
  h += '<div class="camp-regen-meta">';
  h += '<span class="camp-regen-rate">+' + regenPct + ' % PV par minute</span>';
  h += '<span class="camp-regen-eta" id="camp-fire-eta">' + (hpFull ? '✔ PV au maximum' : esc('⏳ Max dans ' + formatTime(Math.ceil(minutesToFull * 60)))) + '</span>';
  h += '</div>';

  h += '</div>'; // fin .camp-health-card

  // v3.133.0 : bloc « Les braises » — offrande de l'étape Histoire courante (forest_15), affiché
  // seulement pendant l'étape acceptée et tant que l'offrande n'est pas faite (StoryQuestManager.getOfferingInfo).
  var offering = (window.StoryQuestManager && typeof StoryQuestManager.getOfferingInfo === "function") ? StoryQuestManager.getOfferingInfo("forest") : null;
  if (offering) {
    h += '<div class="camp-card camp-embers-card">';
    h += '<div class="camp-section-title">🔥 Les braises</div>';
    h += '<div class="camp-embers-desc">' + esc(offering.step.narrative.objective) + '</div>';
    // v3.197.0 (passe de ton) : les anciens parlent avant l'offrande (buildStoryDialogueHTML, quests-view.js).
    if (typeof buildStoryDialogueHTML === "function") h += buildStoryDialogueHTML(offering.step);
    h += '<div class="camp-embers-list">';
    offering.items.forEach(function (it) {
      var okItem = it.have >= it.need;
      h += '<div class="camp-embers-item' + (okItem ? ' is-ready' : '') + '">';
      h += '<span class="camp-embers-icon">' + renderIconOrEmojiHTML(it.icon || "🍃", "camp-embers-icon-img", it.name) + '</span>';
      h += '<span class="camp-embers-name">' + esc(it.name) + '</span>';
      h += '<span class="camp-embers-count">' + (okItem ? '✔ ' : '') + formatNumber(Math.min(it.have, it.need)) + '/' + formatNumber(it.need) + '</span>';
      h += '</div>';
    });
    h += '</div>';
    h += '<button class="settings-btn primary camp-embers-btn" type="button"' + (offering.canOffer ? ' onclick="StoryQuestManager.offerToEmbers(\'forest\');"' : ' disabled') + '>🔥 Offrir aux braises</button>';
    h += '</div>';
  }

  h += '<div class="camp-card camp-missions-card">';
  h += '<div class="camp-card-title">📋 Tableau de missions</div>';
  h += buildCampMissionBoardHTML();
  h += '<button class="settings-btn" type="button" onclick="switchTab(\'quests\')">Voir le tableau complet</button>';
  h += '</div>';

  // v3.181.0 (décision Seb) : carte « Accès rapide » supprimée — la nav du
  // bas couvre ces raccourcis depuis la refonte.

  h += '</div>';
  return h;
}

window.buildCampHTML = buildCampHTML;

