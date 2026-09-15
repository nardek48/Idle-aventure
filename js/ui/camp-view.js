"use strict";
/* ui/camp-view.js — écran Campement (page d'accueil, v3.7 ; hub v3.103.1) : feu de camp (repos long/court), tableau de
   missions (MissionBoard.top(3), LIGNE_DIRECTRICE §3). Accès rapides supprimés v3.181.0. Détail : COMMENTAIRES_ORIGINAUX.md */

var CAMP_MISSION_TYPE_LABEL = { combat: "Combat", expedition: "Expédition", chasse: "Chasse", donjon: "Donjon" };
var CAMP_MISSION_STATUS_CLASS = { claimable: "is-claimable", running: "is-running", accepted: "is-running", available: "" };

function buildCampMissionActionHTML(m) {
  if (m.claim) return '<button class="settings-btn primary camp-mission-btn" type="button" onclick="event.stopPropagation(); campMissionAction(\'' + esc(m.id) + '\', \'claim\')"><img class=ico-inline src=images/Icons/dungeon/dungeon_guaranteed_loot.png> Réclamer</button>';
  if (m.status === "running" || m.status === "accepted") {
    var h = '<div class="camp-mission-actions">';
    // v3.117.0 : "accepted" = acceptée mais pas encore lancée (ex. expédition à mini-jeu juste
    // acceptée) -> "Partir" ; "running" = déjà en cours -> "Continuer". Même bouton launch.
    var launchLabel = m.status === "running" ? '<img class="ico-btn" src="images/Icons/quests/continue.png" alt=""> Continuer' : '<img class="ico-btn" src="images/Icons/quests/start_expedition.png" alt=""> Partir';
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
  if (!window.MissionBoard) return '<div class="camp-summary-row camp-summary-empty">Tableau de missions indisponible.</div>';
  var top = MissionBoard.top(3);
  if (!top.length) return '<div class="camp-summary-row camp-summary-empty">Rien à signaler pour l\'instant.</div>';
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

  var h = '<div class="nb-page-frame camp-page kframe-page" data-kf-title="images/Icons/quests/village_quest.png|Campement">';

  // v3.194.0 (Seb) : titre et sous-titre retirés — le bandeau figé porte
  // déjà « <img class=ico-inline src=images/Icons/quests/village_quest.png> Campement », la ligne d'ambiance n'apportait rien.

  if (game.justDied) {
    h += '<div class="camp-death-banner"><img class="ico-lg" src="images/Icons/camp/hero_defeated.png" alt=""> Tu es tombé au combat. Mange une ration, ou laisse le feu faire son œuvre, avant de repartir.</div>';
    game.justDied = false;
  }

  var hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));

  // v3.116.0 (Lot C, maquette Seb) : bloc Santé du Héros — barre de PV pleine largeur.
  h += '<div class="camp-card camp-health-card">';
  h += '<div class="camp-section-title"><img class="ico-lg" src="images/Icons/combat_stats/stat_health.png" alt=""> Santé du Héros</div>';
  // v3.173.0 : jauge fine du kit (vert, aligné sur les PV héros du combat — avant : rouge).
  // v3.174.0 (retour Seb) : PV courants/max affichés DANS la barre (kgauge-text)
  // au lieu d'une ligne séparée dessous — l'id camp-fire-hp-value migre sur le
  // texte de la jauge (camp-system.js le met à jour tel quel).
  h += '<div class="camp-hp-bar kgauge kgauge-thin kgauge-hp"><div class="kgauge-track"><div class="kgauge-fill" id="camp-hp-fill" style="width:' + hpPct + '%"></div></div>'
    + '<span class="kgauge-text" id="camp-fire-hp-value">' + formatNumber(Math.floor(hp)) + ' / ' + formatNumber(maxHp) + '</span></div>';

  // Bloc Rations — 3 cartes côte à côte (icône, soin, stock, bouton Manger).
  h += '<div class="camp-section-title camp-section-sub"><img class="ico-lg" src="images/Icons/quests/ration_reward.png" alt=""> Rations</div>';
  h += '<div class="camp-ration-grid">';
  rationOptions.forEach(function (r) {
    var def = (window.WAREHOUSE_RESOURCES || {})[r.id] || {};
    var healValue = Math.floor(maxHp * r.healPct);
    var canEat = r.amount >= 1 && !hpFull;
    h += '<div class="camp-ration-item' + (r.amount < 1 ? ' is-empty' : '') + '" title="' + esc(r.name) + '">';
    h += '<div class="camp-ration-icon">' + renderIconOrEmojiHTML(def.icon || "images/Icons/quests/ration_reward.png", "camp-ration-icon-img", r.name) + '</div>';
    h += '<div class="camp-ration-heal"><img class=ico-inline src=images/Icons/combat_stats/stat_health.png> +' + formatNumber(healValue) + '</div>';
    h += '<div class="camp-ration-stock">×' + formatNumber(r.amount) + ' · ' + Math.round(r.healPct * 100) + ' %</div>';
    h += '<button class="settings-btn primary camp-ration-btn" type="button"' + (canEat ? ' onclick="CampManager.eatRation(\'' + esc(r.id) + '\');"' : ' disabled') + '>Manger</button>';
    h += '</div>';
  });
  h += '</div>';

  // Bloc Régénération — phrase + rythme + temps restant.
  // v3.233.0 (Seb) : barre retirée. Elle était remplie avec hpPct, donc un
  // doublon exact de la barre de PV trois lignes plus haut, en sarcelle.
  h += '<div class="camp-section-title camp-section-sub"><img class="ico-lg" src="images/Icons/camp/regeneration.png" alt=""> Régénération</div>';
  h += '<div class="camp-regen-desc">Récupère des PV automatiquement au fil du temps, hors combat.</div>';
  h += '<div class="camp-regen-meta">';
  h += '<span class="camp-regen-rate">+' + regenPct + ' % PV par minute</span>';
  // v3.242.0 (bug Seb) : esc() enveloppait AUSSI la balise <img> — le joueur lisait le
  // HTML au lieu de voir le sablier. Seule la partie texte est échappée désormais.
  h += '<span class="camp-regen-eta" id="camp-fire-eta">' + (hpFull
    ? '<img class=ico-inline src=images/Icons/system/check_valid.png> PV au maximum'
    : '<img class=ico-inline src=images/Icons/system/hourglass_waiting.png> ' + esc('Max dans ' + formatTime(Math.ceil(minutesToFull * 60)))) + '</span>';
  h += '</div>';

  h += '</div>'; // fin .camp-health-card

  // v3.133.0 : bloc « Les braises » — offrande de l'étape Histoire courante (forest_15), affiché
  // seulement pendant l'étape acceptée et tant que l'offrande n'est pas faite (StoryQuestManager.getOfferingInfo).
  var offering = (window.StoryQuestManager && typeof StoryQuestManager.getOfferingInfo === "function") ? StoryQuestManager.getOfferingInfo("forest") : null;
  if (offering) {
    h += '<div class="camp-card camp-embers-card">';
    h += '<div class="camp-section-title"><img class="ico-lg" src="images/Icons/camp/campfire.png" alt=""> Les braises</div>';
    h += '<div class="camp-embers-desc">' + esc(offering.step.narrative.objective) + '</div>';
    // v3.197.0 (passe de ton) : les anciens parlent avant l'offrande (buildStoryDialogueHTML, quests-view.js).
    if (typeof buildStoryDialogueHTML === "function") h += buildStoryDialogueHTML(offering.step);
    h += '<div class="camp-embers-list">';
    offering.items.forEach(function (it) {
      var okItem = it.have >= it.need;
      h += '<div class="camp-embers-item' + (okItem ? ' is-ready' : '') + '">';
      h += '<span class="camp-embers-icon">' + renderIconOrEmojiHTML(it.icon || "images/Icons/scene/path_easy.png", "camp-embers-icon-img", it.name) + '</span>';
      h += '<span class="camp-embers-name">' + esc(it.name) + '</span>';
      h += '<span class="camp-embers-count">' + (okItem ? '<img class=ico-inline src=images/Icons/system/check_valid.png> ' : '') + formatNumber(Math.min(it.have, it.need)) + '/' + formatNumber(it.need) + '</span>';
      h += '</div>';
    });
    h += '</div>';
    h += '<button class="settings-btn primary camp-embers-btn" type="button"' + (offering.canOffer ? ' onclick="StoryQuestManager.offerToEmbers(\'forest\');"' : ' disabled') + '><img class=ico-inline src=images/Icons/camp/campfire.png> Offrir aux braises</button>';
    h += '</div>';
  }

  h += '<div class="camp-card camp-missions-card">';
  h += '<div class="camp-card-title"><img class=ico-inline src=images/Icons/quests/quest_list.png> Tableau de missions</div>';
  h += buildCampMissionBoardHTML();
  h += '<button class="settings-btn" type="button" onclick="switchTab(\'quests\')">Voir le tableau complet</button>';
  h += '</div>';

  // v3.244.0 (chantier Navigation, décision Seb) : Donjon et Carte du monde quittent le
  // menu ☰ pour le bloc « Expédition » du Campement — c'est d'ici qu'on part. Mêmes
  // verrous d'Histoire que leurs anciennes cases ; rien tant que rien n'est débloqué.
  h += buildCampPreparationDoorsHTML();
  h += buildCampExpeditionDoorsHTML();

  // v3.210.0 (décision Seb) : raccourci vers le Grimoire, retiré du menu ☰ au passage.
  // Le Campement est le lieu de préparation — on règle ses tactiques avant de partir.
  // Respecte le même verrou que l'entrée de menu qu'il remplace : rien tant que
  // l'onglet n'est pas débloqué.
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

    h += '<div class="camp-card camp-grimoire-card">';
    h += '<div class="camp-card-title"><img class=ico-inline src=images/Icons/codex/codex_lore.png> Grimoire de tactiques</div>';
    h += '<div class="camp-grimoire-summary">' + activeRules.length + ' / ' + slotCount + ' règles actives'
      + (counterCount ? ' · <span class="camp-grimoire-counters"><img class=ico-inline src=images/Icons/combat_stats/stat_speed.png> ' + counterCount + ' contre' + (counterCount > 1 ? 's' : '') + '</span>' : '')
      + '</div>';
    h += '<div class="camp-grimoire-mode">' + (game.combatMode === "grimoire"
      ? '<img class=ico-inline src=images/Icons/codex/codex_lore.png> Mode Grimoire : tes règles jouent seules.'
      : '<img class=ico-inline src=images/Icons/combat_stats/stat_critical.png> Mode Tactique : tes règles conseillent, tu choisis.') + '</div>';
    h += '<button class="settings-btn" type="button" onclick="switchTab(\'grimoire\')">Régler mes tactiques</button>';
    h += '</div>';
  }

  // v3.181.0 (décision Seb) : carte « Accès rapide » supprimée — la nav du
  // bas couvre ces raccourcis depuis la refonte.

  h += '</div>';
  return h;
}

window.buildCampHTML = buildCampHTML;

/* v3.250.0 (bug remonté par Seb) — PORTE DE LA BOUTIQUE.
   Le lot Navigation N-1 (v3.244.0) a retiré la Boutique du menu ☰ en prévision du lot N-2,
   qui devait l'installer dans les bâtiments du Village. Entre les deux, l'écran n'avait plus
   AUCUNE porte accessible en début de partie : les seuls renvois vivent dans les fiches de
   l'Apothicaire (niveau > 0) et de la Taverne, deux bâtiments de rang 2 qui exigent le Village
   — débloqué à forest_06. Or forest_04 débloque `shop` et demande « faire 1 achat en boutique » :
   la chaîne d'Histoire était bloquée à la 4e étape sur une partie neuve, et les potions de soin
   (décisives : 98 % d'échec sans, 0 % avec, cf. sim/forecast-calibration-bench.js) étaient
   inatteignables.

   La porte vit au Campement, comme celle du Grimoire : c'est le lieu où l'on prépare sa sortie.
   Transitoire — quand la Halle et l'Apothicaire porteront les boutiques (lot N-2), elle pointera
   vers eux ou disparaîtra. */
function buildCampPreparationDoorsHTML() {
  var unlocked = function (t) { return typeof isTabUnlocked !== "function" || isTabUnlocked(t); };
  if (!unlocked("shop")) return "";

  var potions = 0;
  if (window.PotionManager && typeof PotionManager.getHealingStock === "function") {
    (window.HEALING_POTIONS_DB || []).forEach(function (po) { potions += Number(PotionManager.getHealingStock(po.id) || 0); });
  }

  var h = '<div class="camp-card camp-expedition-card">';
  h += '<div class="camp-card-title"><img class=ico-inline src=images/Icons/subtabs/potions.png> Préparer</div>';
  h += '<div class="camp-doors">';

  h += '<button type="button" class="camp-door" onclick="goToPotions()">';
  h += '<img class="camp-door-ico" src="images/Icons/subtabs/potions.png" alt="">';
  h += '<span class="camp-door-txt"><span class="camp-door-t">Potions</span>';
  h += '<span class="camp-door-s">' + (potions > 0 ? potions + ' en réserve' : 'aucune en réserve') + '</span></span>';
  if (potions > 0) h += '<span class="camp-door-badge kbadge kbadge-round"><span>' + potions + '</span></span>';
  h += '<span class="camp-door-chev">›</span>';
  h += '</button>';

  h += '<button type="button" class="camp-door" onclick="goToEconomy()">';
  h += '<img class="camp-door-ico" src="images/Icons/subtabs/economy.png" alt="">';
  h += '<span class="camp-door-txt"><span class="camp-door-t">Économie</span>';
  h += '<span class="camp-door-s">Améliorations d\'or</span></span>';
  h += '<span class="camp-door-chev">›</span>';
  h += '</button>';

  h += '</div></div>';
  return h;
}
window.buildCampPreparationDoorsHTML = buildCampPreparationDoorsHTML;

/* v3.244.0 : deux portes côte à côte — Donjon (tickets en pastille) et Carte du monde
   (monde courant · aventure). Chacune n'apparaît que si son onglet est débloqué ; si
   aucune ne l'est, le bloc entier reste absent. */
function buildCampExpeditionDoorsHTML() {
  var unlocked = function (t) { return typeof isTabUnlocked !== "function" || isTabUnlocked(t); };
  var showDungeon = unlocked("dungeon");
  var showMap = unlocked("map");
  if (!showDungeon && !showMap) return "";

  var h = '<div class="camp-card camp-expedition-card">';
  h += '<div class="camp-card-title"><img class=ico-inline src=images/Icons/quests/start_expedition.png> Expédition</div>';
  h += '<div class="camp-doors">';

  if (showDungeon) {
    if (window.DungeonManager && typeof DungeonManager.checkTicketReset === "function") DungeonManager.checkTicketReset();
    var tickets = Number(game.dungeonTickets || 0);
    var running = !!(game.dungeonRun && game.dungeonRun.active);
    h += '<button type="button" class="camp-door" onclick="switchTab(\'dungeon\')">';
    h += '<img class="camp-door-ico" src="images/Icons/subtabs/dungeon.png" alt="">';
    h += '<span class="camp-door-txt"><span class="camp-door-t">Donjon</span>';
    h += '<span class="camp-door-s">' + (running ? 'En cours' : (tickets + ' ticket' + (tickets > 1 ? 's' : ''))) + '</span></span>';
    if (tickets > 0 && !running) h += '<span class="camp-door-badge kbadge kbadge-round"><span>' + tickets + '</span></span>';
    h += '<span class="camp-door-chev">›</span>';
    h += '</button>';
  }

  if (showMap) {
    var world = (window.WorldManager && typeof WorldManager.getWorld === "function") ? WorldManager.getWorld() : null;
    h += '<button type="button" class="camp-door" onclick="switchTab(\'map\')">';
    h += '<img class="camp-door-ico" src="images/Icons/menu_icons/map_menu.png" alt="">';
    h += '<span class="camp-door-txt"><span class="camp-door-t">Carte</span>';
    // Nom du monde seul : « Forêt enchantée · 1/8 » se coupait à 390 px.
    h += '<span class="camp-door-s">' + esc(world && world.name ? world.name : 'Monde') + '</span></span>';
    h += '<span class="camp-door-chev">›</span>';
    h += '</button>';
  }

  h += '</div>';
  h += '</div>';
  return h;
}
window.buildCampExpeditionDoorsHTML = buildCampExpeditionDoorsHTML;

