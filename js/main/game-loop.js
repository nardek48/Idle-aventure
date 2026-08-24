"use strict";
/* ============================================================
Quest Idle — main/game-loop.js
La boucle de jeu principale (requestAnimationFrame), et la gestion
de l'intervalle d'auto-tap séparé (setInterval, car son rythme
change avec un talent — pas besoin d'être dans la boucle à 60fps).
============================================================ */

var lastTick = Date.now();

// v3.16 : bug corrigé — la pastille "choses à faire" du bouton Menu
// (#quest-badge, voir updateQuestBadge() dans ui/quests-view.js)
// n'était rafraîchie que par renderAll(), donc uniquement après une
// action explicite du joueur (achat, changement d'onglet...). Toute
// progression AMBIANTE (quête journalière complétée pendant un farm
// auto-DPS sans autre interaction, haut fait débloqué via la chasse
// du village hors écran Combat, ticket de donjon qui redevient
// disponible au fil du temps...) ne se reflétait donc jamais tant que
// le joueur ne déclenchait pas une autre action. Throttlé à 1x/seconde
// (pas besoin d'une précision à la frame pour un simple compteur).
var questBadgeThrottleAccum = 0;

/* v3.4 : une fenêtre plein écran bloquante (résumé de cycle, popup
   Carte, Village/Donjon/Talents) COUVRE visuellement tout l'écran,
   mais rien n'empêchait jusqu'ici le combat de continuer à tourner
   EN DESSOUS (auto-DPS, riposte) tant que game.activeTab === "combat"
   — ce qui pouvait redéclencher une AUTRE ouverture de la même
   fenêtre (ex. verrou de monde suivant) et reconstruire son contenu
   PENDANT que le joueur essayait de cliquer dessus, rendant le
   bouton "Continuer" en pratique inutilisable (bug remonté en test,
   surtout visible depuis v3.3.0 : deux verrous peuvent maintenant se
   suivre de près — Forêt→Désert puis Désert→Ruines). Cette fonction
   vérifie si l'un des conteneurs de fenêtre plein écran contient
   quelque chose, pour mettre en pause le combat automatique tant que
   c'est le cas. */
var BLOCKING_MODAL_IDS = ["cycle-modal-root", "map-modal-root", "dungeon-modal-root", "village-modal-root", "talent-modal-root", "adventure-quest-modal-root"];
function isBlockingModalOpen() {
  for (var i = 0; i < BLOCKING_MODAL_IDS.length; i++) {
    var el = document.getElementById(BLOCKING_MODAL_IDS[i]);
    if (el && el.innerHTML && el.innerHTML.length > 0) return true;
  }
  return false;
}
window.isBlockingModalOpen = isBlockingModalOpen;

/* (Re)démarre l'intervalle d'auto-tap (talent Main spectrale) au bon
   rythme : 2s par défaut, ~1.79s avec Transe de bataille (+12% vitesse).
   À rappeler chaque fois qu'un talent qui affecte ce rythme change
   (voir buyTalentNode/respecTalents en progression-system.js). */
function syncAutoTapLoop() {
  if (autoTapInterval) {
    clearInterval(autoTapInterval);
    autoTapInterval = null;
  }

  var autoTapLevel = (game.talents && game.talents.t_auto_tap) || 0;
  // v3.28 : l'intervalle de base dépend maintenant du NIVEAU de Main
  // spectrale (2s au niveau 1, comme avant cette refonte ; 1.5s au
  // niveau 2 ; 1s au niveau 3) — voir data/talents.js.
  var interval = autoTapLevel >= 3 ? 1000 : autoTapLevel === 2 ? 1500 : 2000;
  if (game.talents && game.talents.t_battle_trance) {
    interval = Math.floor(interval / (1 + 0.12 * game.talents.t_battle_trance));
  }

  autoTapInterval = setInterval(function () {
    if (typeof isBlockingModalOpen === "function" && isBlockingModalOpen()) return;
    CombatEngine.autoTap();
  }, interval);
}

/* La boucle de jeu, rappelée à chaque frame via requestAnimationFrame.
   Calcule le delta-temps (dt, plafonné à 0.25s pour éviter les gros
   sauts si l'onglet était en arrière-plan), puis avance tout ce qui
   dépend du temps : auto-attaque, riposte ennemie, régénération
   d'essence (Régénération), intérêt composé sur l'or (toutes les 10s),
   reset des quêtes journalières si le délai est passé, et rafraîchit
   le HUD/PV ennemi à chaque frame. */
function gameLoop() {
  var now = Date.now();
  var dt = (now - lastTick) / 1000;
  lastTick = now;

  if (!isFinite(dt) || dt < 0) dt = 0;
  if (dt > 0.25) dt = 0.25;

  game.playTime += dt;

  if (window.QuestManager && typeof QuestManager.track === "function") {
    QuestManager.track("combatTime", dt);
  }

  // v3.4 : plus aucun combat automatique (auto-DPS, riposte) tant
  // qu'une fenêtre plein écran bloquante est ouverte — voir
  // isBlockingModalOpen() ci-dessus. La chasse ambiante du village,
  // elle, n'est pas concernée (aucun risque de reconstruire une
  // fenêtre pendant qu'elle tourne).
  var modalOpen = isBlockingModalOpen();

  // v3.15 : un héros à 0 PV (juste terrassé, pas encore reposé au
  // Campement) ne participe plus du tout au combat — ni l'aide active
  // (tap/auto-DPS), ni la riposte ennemie — le temps qu'il se soigne
  // (voir CampManager.useLongRest()/useShortRest(), systems/camp-system.js).
  // Sans ce garde, revenir sur l'écran Combat à 0 PV redéclencherait
  // la défaite (et sa pénalité d'or) à chaque tick de riposte.
  var heroDowned = (game.heroHp || 0) <= 0;

  // v3.0 : l'auto-DPS du héros (Célérité) n'est plus une simulation de
  // fond permanente — elle ne s'applique QUE quand le joueur est
  // réellement sur l'écran Combat (aide active), même principe que la
  // riposte ennemie juste en dessous (déjà limitée à cet onglet depuis
  // v2.10). La chasse ambiante indépendante de l'écran est désormais
  // portée par le village (Hôtel de Ville) — voir
  // VillageManager.tickAmbientHunting() juste après.
  if (game.activeTab === "combat" && !modalOpen && !heroDowned) {
    CombatEngine.autoAttack(dt);
  }

  // v3.34.3 : décompte du cooldown de l'attaque de base (tap manuel),
  // déclenche automatiquement le coup en file d'attente à expiration
  // (voir CombatEngine.tickBasicAttackCooldown()). Mêmes conditions
  // que l'auto-DPS juste au-dessus — pas de raison de laisser courir
  // ce cooldown si le joueur ne peut de toute façon pas taper
  // (héros à terre, modale ouverte, autre onglet).
  if (game.activeTab === "combat" && !modalOpen && !heroDowned && typeof CombatEngine.tickBasicAttackCooldown === "function") {
    CombatEngine.tickBasicAttackCooldown(dt);
  }

  // v3.0 : chasse ambiante du village (Hôtel de Ville) — tourne EN
  // CONTINU, peu importe l'onglet ouvert (y compris Combat, en plus
  // de l'aide active du joueur). Même formule que le calcul hors-ligne
  // (OfflineManager.calculate()), appliquée en continu plutôt qu'en un
  // seul bloc au retour d'absence. 0 si l'Hôtel de Ville n'est pas
  // investi (comme hors-ligne), hormis le plancher symbolique déjà
  // existant.
  if (window.VillageManager && typeof VillageManager.tickAmbientHunting === "function") {
    VillageManager.tickAmbientHunting(dt);
  }

  // v3.31 : bâtiments de production (Chasse/Champs/Scierie/Mine, voir
  // data/production-buildings.js) — tourne EN CONTINU comme la chasse
  // ambiante du village juste au-dessus, indépendamment de l'onglet
  // ouvert. Chaque bâtiment a son propre plafond de stock local (voir
  // ProductionManager.tick()), distinct des bonus % du Village.
  if (window.ProductionManager && typeof ProductionManager.tick === "function") {
    ProductionManager.tick(dt);
  }

  // v3.43 : file d'attente de craft de l'Entrepôt (voir
  // WarehouseManager.tickCraftQueue()) — tourne EN CONTINU comme
  // Production juste au-dessus, indépendamment de l'onglet ouvert,
  // SANS rattrapage hors-ligne (pas d'appel dans main/boot.js).
  if (window.WarehouseManager && typeof WarehouseManager.tickCraftQueue === "function") {
    WarehouseManager.tickCraftQueue(dt);
  }

  // v2.10 : la riposte ennemie ne s'applique QUE quand le joueur est
  // réellement sur l'écran Combat — avant, elle tournait en continu
  // même en naviguant dans les autres onglets, faisant baisser les PV
  // "dans le dos" du joueur sans qu'il puisse réagir. Le reste (auto
  // DPS, potions, régénération, intérêt composé...) continue de
  // tourner normalement en arrière-plan, seule la riposte est mise
  // en pause hors de l'écran Combat.
  if (game.activeTab === "combat" && !modalOpen && !heroDowned && typeof CombatEngine.enemyAttackTick === "function") {
    CombatEngine.enemyAttackTick(dt);
  }

  // v3.48.0 : Charge — minuteur indépendant de la riposte normale
  // ci-dessus (voir CombatEngine.enemyChargeTick()), mêmes conditions
  // de garde (écran Combat actif, pas de modale, héros pas à terre).
  if (game.activeTab === "combat" && !modalOpen && !heroDowned && typeof CombatEngine.enemyChargeTick === "function") {
    CombatEngine.enemyChargeTick(dt);
  }

  // v3.71.0 : Silencieux (3e archétype, Phase 9) — minuteur INDÉPENDANT
  // de Charge ci-dessus (voir CombatEngine.enemySilenceTick()), même
  // structure et mêmes conditions de garde. Mutuellement exclusif avec
  // Charge sur un même ennemi (garde interne sur archetype), donc les
  // 2 ticks ne s'activent jamais en même temps pour un même ennemi,
  // mais les 2 appels restent inconditionnels ici (chacun a sa propre
  // garde, comme bossPatternTick() ci-dessous).
  if (game.activeTab === "combat" && !modalOpen && !heroDowned && typeof CombatEngine.enemySilenceTick === "function") {
    CombatEngine.enemySilenceTick(dt);
  }

  // v3.49.0 : patterns de boss (Bouclier + Soin) — minuteurs
  // indépendants de la Charge ci-dessus et l'un de l'autre (voir
  // CombatEngine.bossPatternTick()), mêmes conditions de garde. Ne
  // fait rien si l'ennemi affiché n'est pas un boss (garde interne).
  if (game.activeTab === "combat" && !modalOpen && !heroDowned && typeof CombatEngine.bossPatternTick === "function") {
    CombatEngine.bossPatternTick(dt);
  }

  // Potions temporaires : purge celles qui viennent d'expirer, et
  // rafraîchit le compte à rebours affiché si l'onglet Boutique est
  // ouvert (pas besoin de redessiner ailleurs, personne ne le voit).
  if (window.PotionManager && typeof PotionManager.tick === "function") {
    var potionExpired = PotionManager.tick();
    game._potionUiTimer = (game._potionUiTimer || 0) + dt;
    if (potionExpired || game._potionUiTimer >= 1) {
      game._potionUiTimer = 0;
      if (game.activeTab === "shop" && typeof renderPanel === "function") renderPanel();
    }
  }

  if (game.talents.t_regenerate) {
    game.essence += dt;
  }

  // Bouton de soin rapide : rafraîchi chaque seconde pour que le
  // cooldown se débloque visuellement tout seul, sans action du joueur.
  if (window.PotionManager && typeof renderHealButtons === "function") {
    game._healUiTimer = (game._healUiTimer || 0) + dt;
    if (game._healUiTimer >= 1) {
      game._healUiTimer = 0;
      renderHealButtons();
    }
  }

  // v3.34.0 : décompte des cooldowns + régénération passive de la
  // ressource de classe (Mana) — voir ClassCombatManager.tick(),
  // systems/class-combat-system.js. Se fige d'elle-même hors combat
  // actif (géré en interne par isCombatActive()), donc appelée sans
  // garde supplémentaire ici, comme les autres systèmes tick() du
  // fichier (Production/PotionManager...).
  // v3.34.1 : tick() décompte aussi le DoT actif sur l'ennemi affiché
  // (Brûlure arcanique) — mêmes conditions de combat actif.
  if (window.ClassCombatManager && typeof ClassCombatManager.tick === "function") {
    ClassCombatManager.tick(dt);
  }

  // v3.47.0 : combat auto de base (skill1/skill2/skill3/defense +
  // attaque de base) — remplace le tap manuel tant que
  // game.autoSkillsEnabled est vrai (Paramètres, actif par défaut).
  // Mêmes conditions de garde que tick() ci-dessus (combat actif),
  // vérifiées en interne par ClassCombatManager.
  if (window.ClassCombatManager && typeof ClassCombatManager.tickAutoSkills === "function") {
    ClassCombatManager.tickAutoSkills(dt);
  }
  if (window.ClassCombatManager && typeof ClassCombatManager.tryAutoBasicAttack === "function") {
    ClassCombatManager.tryAutoBasicAttack();
  }

  // Rafraîchit les 4 boutons d'action de classe (compte à rebours des
  // cooldowns + jauge de ressource) — même throttle 1×/seconde que les
  // autres compteurs de cette boucle.
  if (window.ClassCombatManager && typeof renderClassSkillButtons === "function") {
    game._classSkillsUiTimer = (game._classSkillsUiTimer || 0) + dt;
    if (game._classSkillsUiTimer >= 1) {
      game._classSkillsUiTimer = 0;
      renderClassSkillButtons();
    }
  }

  // v2.90 : barre de mini-icônes des potions actives (écran Combat).
  if (window.PotionManager && typeof renderActivePotionsBar === "function") {
    game._activePotionsUiTimer = (game._activePotionsUiTimer || 0) + dt;
    if (game._activePotionsUiTimer >= 1) {
      game._activePotionsUiTimer = 0;
      renderActivePotionsBar();
    }
  }

  // v2.90.23 : "Intérêt composé" rapportait +0.05% de l'OR ACTUEL toutes les
  // 10s, sans plafond — effet boule de neige disproportionné en fin de partie
  // (plus tu es riche, plus ça rapporte, indépendamment de toute progression
  // réelle). Remplacé par un flat indexé sur game.goldMult (la vraie
  // progression du joueur) plutôt que sur son or accumulé : +2 or/seconde ×
  // goldMult, versé toutes les 10s (accumulateur pour rester précis même
  // avec des dt irréguliers).
  if (game.talents.t_interest) {
    game._interestTimer = (game._interestTimer || 0) + dt;
    while (game._interestTimer >= 10) {
      // v3.29.6 : bonus scalé par le NIVEAU du talent — avant, identique
      // niveau 1/2/3 malgré le texte "augmente par niveau" (bug).
      var bonus = Math.floor(10 * 2 * game.talents.t_interest * Number(game.goldMult || 1));
      if (bonus > 0) {
        game.gold += bonus;
        game.totalGoldEarned += bonus;
        if (window.QuestManager && typeof QuestManager.track === "function") {
          QuestManager.track("goldEarned", bonus);
        }
      }
      game._interestTimer -= 10;
    }
  }

  if (window.QuestManager && typeof QuestManager.checkReset === "function") {
    QuestManager.checkReset();
  }

  if (typeof renderHud === "function") renderHud();
  if (typeof renderEnemyHp === "function") renderEnemyHp();

  questBadgeThrottleAccum += dt;
  if (questBadgeThrottleAccum >= 1) {
    questBadgeThrottleAccum = 0;
    if (typeof updateQuestBadge === "function") updateQuestBadge();
  }

  requestAnimationFrame(gameLoop);
}

window.syncAutoTapLoop = syncAutoTapLoop;