"use strict";
/* systems/story-quest-system.js — chaîne Histoire (data/story-quests.js). Modèle : workshop-unlock-system.js généralisé.
   Cycle par étape : disponible → acceptée (onglets débloqués) → objectif atteint → réclamée. État : game.storyQuests[chapterId]. */

var STORY_CHECK_THROTTLE_MS = 1000;

var StoryQuestManager = {
  _lastCheckAt: 0,

  ensure: function () {
    if (!game.storyQuests || typeof game.storyQuests !== "object") game.storyQuests = {};
    var self = this;
    Object.keys(STORY_QUESTS).forEach(function (chapterId) { self._ensureChapter(chapterId); });
  },

  _ensureChapter: function (chapterId) {
    var st = game.storyQuests[chapterId];
    if (!st || typeof st !== "object") st = game.storyQuests[chapterId] = {};
    if (typeof st.currentStep !== "number" || st.currentStep < 0) st.currentStep = 0;
    if (typeof st.accepted !== "boolean") st.accepted = false;
    if (!st.claimedSteps || typeof st.claimedSteps !== "object") st.claimedSteps = {};
    if (!st.tutorialsSeen || typeof st.tutorialsSeen !== "object") st.tutorialsSeen = {}; // v3.107.7 : popups pédagogiques déjà vus
    if (typeof st.readyNotified !== "boolean") st.readyNotified = false;
    // skipped : chapitre court-circuité (save migrée déjà tout débloquée, ou bouton Paramètres).
    if (typeof st.skipped !== "boolean") st.skipped = false;
    // v3.100.1 : compteurs Histoire (victoires au Cœur) alimentés par _trackKills. v3.109.0 : coeurBossKills retiré
    // (le boss du Cœur passe par aq_forest_depths) ; coeurReached (0/1) = le Cœur a été atteint au moins une fois.
    if (!st.counters || typeof st.counters !== "object") st.counters = {};
    if (typeof st.counters.coeurKills !== "number") st.counters.coeurKills = 0;
    if (typeof st.counters.coeurReached !== "number") st.counters.coeurReached = 0;
    if (typeof st.counters.offeringDone !== "number") st.counters.offeringDone = 0; // v3.133.0 : offrande aux braises (forest_15)
    if (typeof st.counters.coeurKillsMarked !== "number") st.counters.coeurKillsMarked = 0; // v3.134.0 : kills au Cœur sous ≥ 2 afflictions (forest_13)
    if (typeof st.counters.companionWins !== "number") st.counters.companionWins = 0; // v3.268.0 (L-2) : combats gagnés avec un compagnon (forest_wenna)
    if (typeof st.lastSeenTotalKills !== "number") st.lastSeenTotalKills = Number(game.totalKills || 0);
    this._migrateV3109(chapterId, st);
    var fromBeforeV3259 = !st.migratedV3259; // lu AVANT _migrateV3259, qui pose le drapeau
    this._migrateV3259(chapterId, st);
    this._migrateV3260(chapterId, st, fromBeforeV3259);
    this._migrateV3261(chapterId, st);
    this._migrateV3268(chapterId, st);
    return st;
  },

  /* v3.259.0 (C-4) : « Ce que la brume reprend » insérée (après forest_06 ; après forest_09 depuis v3.260.0). Même modèle que
     _migrateV3109 : currentStep est un index, une save déjà au-delà se décale d'un cran, une
     seule fois. Un joueur qui a déjà libéré un secteur verra l'étape immédiatement prête. */
  _migrateV3259: function (chapterId, st) {
    if (st.migratedV3259) return;
    var chapter = STORY_QUESTS[chapterId];
    var idx = chapter ? chapter.steps.findIndex(function (s) { return s.id === "forest_brume"; }) : -1;
    if (idx !== -1 && typeof st.currentStep === "number" && st.currentStep >= idx) st.currentStep += 1;
    st.migratedV3259 = true;
  },

  /* v3.260.0 : « Ce que la brume reprend » déplacée de l'index 6 (après forest_06) à la fin de
     l'Acte II (après forest_09). Seules les saves v3.259.0 pointées entre les deux positions sont
     concernées : elles reprennent à la première étape non réclamée. Une save d'avant v3.259.0 a
     déjà été placée par _migrateV3259, qui lit la position actuelle. */
  _migrateV3260: function (chapterId, st, fromBeforeV3259) {
    if (st.migratedV3260) return;
    st.migratedV3260 = true;
    if (fromBeforeV3259 || chapterId !== "forest" || typeof st.currentStep !== "number") return;
    var OLD_ORDER = ["forest_01", "forest_02", "forest_03", "forest_04", "forest_05", "forest_06", "forest_brume", "forest_07", "forest_08", "forest_09"];
    var oldId = OLD_ORDER[st.currentStep];
    if (st.currentStep < 6 || !oldId) return; // avant la brume ou au-delà de forest_09 : même index
    var steps = STORY_QUESTS[chapterId].steps;
    var target = st.currentStep;
    for (var i = 6; i < steps.length; i++) { if (!st.claimedSteps[steps[i].id]) { target = i; break; } }
    st.currentStep = target;
    if (steps[target].id !== oldId) { st.accepted = false; st.readyNotified = false; } // l'acceptation portait sur l'ancienne étape
  },

  /* v3.268.0 (L-2) : « Celle qui demande » insérée entre forest_14 (le Basilic) et
     forest_15 (les braises). currentStep est un INDEX : une save déjà à l'étape 15 ou
     au-delà doit être décalée d'un cran, une seule fois. Même modèle que _migrateV3109
     et _migrateV3259. Un joueur qui était pile sur forest_15 découvre donc l'étape
     Wenna avant l'offrande, ce qui est le but. */
  _migrateV3268: function (chapterId, st) {
    if (st.migratedV3268) return;
    st.migratedV3268 = true;
    var chapter = STORY_QUESTS[chapterId];
    var idx = chapter ? chapter.steps.findIndex(function (s) { return s.id === "forest_wenna"; }) : -1;
    if (idx !== -1 && typeof st.currentStep === "number" && st.currentStep >= idx) {
      st.currentStep += 1;
    }
  },

  /* v3.261.0 : « Franchir la Lisière » déjà acceptée avec une traversée entamée en farm libre
     (le cas remonté par Seb, 5/10 dès l'acceptation) : le retour au début de la Lisière est
     appliqué une fois, comme s'il venait d'accepter. Étape déjà remplie : rien ne change. */
  _migrateV3261: function (chapterId, st) {
    if (st.migratedV3261) return;
    st.migratedV3261 = true;
    var step = STORY_QUESTS[chapterId] && STORY_QUESTS[chapterId].steps[st.currentStep];
    if (!step || step.id !== "forest_crossing" || !st.accepted || st.counters.coeurReached >= 1) return;
    st.counters.crossingReset = 1; // appliqué par _trackKills dès qu'aucune activité n'est en cours
  },

  /* v3.109.0 : « Franchir la Lisière » insérée à l'index 9 (avant forest_11). currentStep est un index : une save
     déjà à l'Acte III ou au-delà doit être décalée d'un cran, une seule fois (même modèle que migratedV31078). */
  _migrateV3109: function (chapterId, st) {
    if (st.migratedV3109) return;
    var chapter = STORY_QUESTS[chapterId];
    var idx = chapter ? chapter.steps.findIndex(function (s) { return s.id === "forest_crossing"; }) : -1;
    if (idx !== -1 && typeof st.currentStep === "number" && st.currentStep >= idx) {
      st.currentStep += 1;
      st.counters.coeurReached = 1; // déjà au-delà : la traversée est considérée faite
    }
    st.migratedV3109 = true;
  },

  getChapter: function (chapterId) {
    return STORY_QUESTS[chapterId || "forest"] || null;
  },

  getState: function (chapterId) {
    this.ensure();
    return game.storyQuests[chapterId || "forest"];
  },

  /* Étape courante (null si chapitre terminé/court-circuité ou si la suite n'est pas encore livrée). */
  getCurrentStep: function (chapterId) {
    var chapter = this.getChapter(chapterId);
    var st = this.getState(chapterId);
    if (!chapter || st.skipped) return null;
    return chapter.steps[st.currentStep] || null;
  },

  isChapterCompleted: function (chapterId) {
    var chapter = this.getChapter(chapterId);
    var st = this.getState(chapterId);
    if (!chapter) return true;
    return st.skipped || st.currentStep >= chapter.steps.length;
  },

  isCurrentStepAccepted: function (chapterId) {
    return !!this.getCurrentStep(chapterId) && this.getState(chapterId).accepted;
  },

  isCurrentStepReady: function (chapterId) {
    var step = this.getCurrentStep(chapterId);
    if (!step || !this.getState(chapterId).accepted) return false;
    try { return !!step.check(game); } catch (e) { return false; }
  },

  /* Nombre d'étapes réclamables (badge Quêtes / Menu). */
  getClaimableCount: function () {
    var self = this;
    return Object.keys(STORY_QUESTS).filter(function (id) { return self.isCurrentStepReady(id); }).length;
  },

  /* Accepter l'étape courante : applique unlockTabs immédiatement (décision Seb, v3.100.0). */
  acceptStep: function (chapterId) {
    chapterId = chapterId || "forest";
    var step = this.getCurrentStep(chapterId);
    var st = this.getState(chapterId);
    if (!step || st.accepted) return false;

    st.accepted = true;
    st.readyNotified = false;
    // v3.260.0 : hook d'étape (remise à zéro des compteurs de kills — l'objectif part de 0)
    if (typeof step.onAccept === "function") step.onAccept(game, st);
    this._applyUnlockTabs(step);

    addLog("📖 " + step.title + " — " + step.narrative.objective, "event");
    var unlocked = this._describeUnlocks(step);
    if (unlocked && typeof showToast === "function") showToast("🔓 Débloqué : " + unlocked, 2000);

    this._refreshAfterChange();
    return true;
  },

  _applyUnlockTabs: function (step) {
    if (!game.unlockedTabs || typeof game.unlockedTabs !== "object") game.unlockedTabs = {};
    (step.unlockTabs || []).forEach(function (tab) { game.unlockedTabs[tab] = true; });
  },

  _describeUnlocks: function (step) {
    var labels = window.STORY_TAB_LABELS || {};
    return (step.unlockTabs || []).map(function (t) { return labels[t] || t; }).join(", ");
  },

  /* Vérification opportuniste (renderPanel, throttlée) : signale une seule fois le passage à « réclamable ».
     Ne déclenche jamais de rendu (appelée depuis le rendu lui-même). */
  checkCurrentStep: function (silent) {
    this._trackKills();
    var now = Date.now();
    if (now - this._lastCheckAt < STORY_CHECK_THROTTLE_MS) return false;
    this._lastCheckAt = now;
    return this._checkNow(silent);
  },

  /* v3.100.1 : compte les victoires au Cœur de la forêt sans toucher combat-engine.js (protégé) :
     combat-engine appelle renderAll() après chaque kill, donc le delta de game.totalKills entre deux
     appels = kills récents. Attribué au Cœur si worldIndex 0 / adventureIndex 1, hors runs de
     Chasse/Donjon/Quête d'aventure (v3.109.0 : la quête n'était pas exclue — ses kills sont ceux de son
     propre run, pas de la position WorldManager). v3.113.0 : la chasse ambiante du village
     est supprimée — tous les kills comptés ici sont désormais des kills réels. */
  /* v3.107.4 : synchronise le pool d'ennemis du Cœur (Troll/Ronce dès l'Acte III) sur l'objet WORLDS
     réel (référence directe, mutable en place) — évite de toucher combat-engine.js/progression-system.js
     (protégés). Appelé à chaque round (comme _trackKills, non throttlé) : toujours frais avant le
     prochain generateEnemy(), y compris juste après le chargement d'une save. */
  _syncCoeurEnemyPool: function () {
    if (!window.WORLDS || !window.STORY_COEUR_BASE_POOL) return;
    var forestWorld = WORLDS.find(function (w) { return w.id === "forest"; });
    var coeur = forestWorld && forestWorld.adventures[1];
    if (!coeur) return;
    // v3.107.8 : comparaison par id d'étape (pas un index numérique en dur) — reste correct même
    // si la chaîne Histoire change de longueur (ex. forest_10 retirée, décision Seb).
    var chapter = STORY_QUESTS.forest;
    var currentIdx = (game.storyQuests && game.storyQuests.forest) ? game.storyQuests.forest.currentStep : 0;
    var targetIdx = chapter.steps.findIndex(function (s) { return s.id === (window.STORY_COEUR_ACT3_STEP_ID || "forest_11"); });
    var act3Reached = targetIdx !== -1 && currentIdx >= targetIdx;
    var wantedPool = act3Reached ? STORY_COEUR_ACT3_POOL : STORY_COEUR_BASE_POOL;
    coeur.enemyPool = wantedPool;
  },

  _trackKills: function () {
    this.ensure();
    this._syncCoeurEnemyPool();
    var st = game.storyQuests.forest;
    if (!st) return;
    var wm = window.WorldManager;
    // v3.261.0 : retour à la Lisière demandé à l'acceptation de forest_crossing, reporté si une activité était en cours
    if (st.counters.crossingReset && typeof storyResetLisiere === "function" && storyResetLisiere(game)) st.counters.crossingReset = 0;
    var atCoeur = !!wm && Number(wm.worldIndex || 0) === 0 && Number(wm.adventureIndex || 0) === 1;
    // v3.109.0 : « Franchir la Lisière » — drapeau persistant (une mort en farm libre renvoie en Lisière via resetToCycleStart).
    if (atCoeur && !st.counters.crossingReset && !(game.adventureQuestRun && game.adventureQuestRun.active) && !(game.huntRun && game.huntRun.active) && !(game.dungeonRun && game.dungeonRun.active)) {
      st.counters.coeurReached = 1;
    }
    var total = Number(game.totalKills || 0);
    var delta = total - st.lastSeenTotalKills;
    st.lastSeenTotalKills = total;
    if (delta <= 0) return; // reset/ascension : on resynchronise sans compter

    /* v3.268.0 (L-2) : combats gagnés avec un compagnon présent (étape forest_wenna).
       Compté AVANT les filtres de contexte ci-dessous : ce qu'on découvre est le
       compagnon, pas un lieu — chasse, donjon ou farm libre comptent pareil. */
    if (window.CompanionManager && typeof CompanionManager.partyIds === "function"
      && CompanionManager.partyIds().length > 0) {
      st.counters.companionWins += delta;
    }
    if (game.huntRun && game.huntRun.active) return;
    if (game.dungeonRun && game.dungeonRun.active) {
      // v3.245.0 (refonte Donjons, forest_13) : vagues de donjon passées sous ≥ 1 Marque -> compteur coeurKillsMarked
      if (Array.isArray(game.dungeonRun.marks) && game.dungeonRun.marks.length >= 1) {
        // v3.261.0 (retour Seb) : les 5 vagues se passent dans UN run — un nouveau run repart de 0.
        // Le run est marqué d'une étiquette, sauvegardée avec lui (dungeonRun est persisté tel quel).
        if (!game.dungeonRun.storyRunTag) game.dungeonRun.storyRunTag = "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        if (st.markedRunTag !== game.dungeonRun.storyRunTag) { st.markedRunTag = game.dungeonRun.storyRunTag; st.counters.coeurKillsMarked = 0; }
        st.counters.coeurKillsMarked += delta;
      }
      return;
    }
    if (game.adventureQuestRun && game.adventureQuestRun.active) return;
    if (!atCoeur) return;
    st.counters.coeurKills += delta;
  },

  _checkNow: function (silent) {
    var self = this;
    var anyNew = false;
    Object.keys(STORY_QUESTS).forEach(function (chapterId) {
      var st = self.getState(chapterId);
      if (!self.isCurrentStepReady(chapterId) || st.readyNotified) return;
      st.readyNotified = true;
      anyNew = true;
      var step = self.getCurrentStep(chapterId);
      if (!silent) {
        addLog("✅ Objectif atteint : " + step.title + " — réclame ta récompense dans Quêtes.", "event");
        if (typeof showToast === "function") showToast("✅ " + step.title + " — récompense prête", 2000);
      }
      // v3.107.1 : killTarget.autoReturn — dès l'objectif atteint (ex. forest_02 « Premier sang »), retour
      // au Campement pour que le joueur voie tout de suite qu'il peut réclamer, sans continuer à farmer inutilement.
      // v3.131.0 : step.autoReturn générique — même comportement pour les étapes dont le check ne passe pas
      // par killTarget (ex. forest_12 « Le grimoire du veilleur », qui combine coeurKills + règle Grimoire active).
      if (step && game.activeTab === "combat" && ((step.killTarget && step.killTarget.autoReturn) || step.autoReturn)) {
        if (typeof switchTab === "function") switchTab("campement");
      }
    });
    if (anyNew && typeof updateQuestBadge === "function") updateQuestBadge();
    return anyNew;
  },

  claimStep: function (chapterId) {
    chapterId = chapterId || "forest";
    var step = this.getCurrentStep(chapterId);
    var st = this.getState(chapterId);
    if (!step || !st.accepted) return false;
    if (!this.isCurrentStepReady(chapterId)) {
      if (typeof showToast === "function") showToast("Objectif non atteint", 1200);
      return false;
    }

    var rewardRows = this._grantReward(step.reward || {});
    st.claimedSteps[step.id] = true;
    st.currentStep += 1;
    // v3.260.0 : une étape déjà réclamée plus loin (forest_brume sur une save v3.259.0) est sautée
    var steps = this.getChapter(chapterId).steps;
    while (st.currentStep < steps.length && st.claimedSteps[steps[st.currentStep].id]) st.currentStep += 1;
    st.accepted = false;
    st.readyNotified = false;

    addLog("📖 Étape terminée : " + step.title, "event");
    if (typeof openQuestCompletePopup === "function") {
      openQuestCompletePopup({
        icon: "images/Icons/camp/campfire.png",
        title: step.title,
        text: step.narrative.completion,
        rewardRows: rewardRows,
        closeLabel: "Continuer",
        suggestNextQuest: false // v3.100.4 ; sans effet depuis v3.109.0 (bouton retiré partout), conservé pour lisibilité
      });
    }

    this._refreshAfterChange();
    return true;
  },

  /* Or/essence en direct (même pratique que adventure-quest-system), potion de soin via healingPotionsOwned,
     équipement via LootSystem.rollDropAtRarity (pattern world-quest-system). */
  _grantReward: function (reward) {
    var rows = [];
    // v3.103.3 (P4, décision §10 n°6) : chaque étape réclamée donne 15 XP, indépendamment du contenu de `reward`.
    if (typeof grantHeroXp === "function") grantHeroXp(15, "story");
    if (reward.gold) {
      game.gold += Number(reward.gold);
      rows.push({ label: "Or", value: formatNumber(reward.gold) });
    }
    if (reward.essence) {
      game.essence += Number(reward.essence);
      rows.push({ label: "Essence", value: formatNumber(reward.essence) });
    }
    if (reward.healingPotion && reward.healingPotion.id) {
      if (window.PotionManager && typeof PotionManager.ensureHealing === "function") PotionManager.ensureHealing();
      if (!game.healingPotionsOwned || typeof game.healingPotionsOwned !== "object") game.healingPotionsOwned = {};
      var count = Number(reward.healingPotion.count || 1);
      game.healingPotionsOwned[reward.healingPotion.id] = Number(game.healingPotionsOwned[reward.healingPotion.id] || 0) + count;
      var potion = (window.PotionManager && typeof PotionManager.getHealingPotion === "function") ? PotionManager.getHealingPotion(reward.healingPotion.id) : null;
      rows.push({ label: potion ? potion.name : "Potion", value: "×" + count });
    }
    /* v3.115.0 : potions per-run en récompense — reward.potions = {potionId: n}, ajoutées au
       stock (potionsOwned, plafond POTION_STOCK_CAP), même porte pour les quêtes de village. */
    if (reward.potions && typeof reward.potions === "object" && window.PotionManager) {
      PotionManager.ensure();
      var potionCap = typeof POTION_STOCK_CAP === "number" ? POTION_STOCK_CAP : 9;
      Object.keys(reward.potions).forEach(function (pid) {
        var pdef = PotionManager.getPotion(pid);
        if (!pdef || !pdef.perRun) return; // seules les potions per-run sont distribuables
        var have = Number(game.potionsOwned[pid] || 0);
        var granted = Math.max(0, Math.min(potionCap - have, Number(reward.potions[pid] || 0)));
        if (granted <= 0) return;
        game.potionsOwned[pid] = have + granted;
        rows.push({ label: pdef.name, value: "×" + granted });
      });
    }
    if (reward.resources && typeof reward.resources === "object" && window.WarehouseManager) {
      Object.keys(reward.resources).forEach(function (key) {
        var applied = WarehouseManager.addResource(key, reward.resources[key], true);
        var def = (window.WAREHOUSE_RESOURCES || {})[key];
        if (applied > 0) rows.push({ label: def ? def.name : key, value: "+" + formatNumber(applied) });
      });
    }
    /* v3.249.0 : objet FIXE (equipmentItem), par opposition à equipmentRarity qui tire au sort.
       Même forme d'objet que generateEquipmentItem : rien à changer côté inventaire ni équipement. */
    if (reward.equipmentItem) {
      var def = reward.equipmentItem;
      var cls = (typeof getClassByHeroId === "function") ? getClassByHeroId(game.heroId) : null;
      var variant = (def.byClass && def.byClass[cls ? cls.id : "knight"]) || def.byClass_knight || null;
      var fixe = {
        uid: "itm_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8),
        slot: def.slot,
        name: variant ? variant.name : (def.name || "Objet"),
        icon: variant ? variant.icon : def.icon,
        rarity: def.rarity || "common",
        stat: def.stat,
        value: def.value,
        affixes: [],
        worldIndex: 0
      };
      if (typeof addLootToInventory === "function" && addLootToInventory(fixe)) {
        addLog("🎁 Récompense d'histoire : " + fixe.name, "event");
        rows.push({ label: "Objet", value: fixe.name });
      }
    }
    if (reward.equipmentRarity && reward.equipmentCount) {
      var granted = 0;
      for (var i = 0; i < reward.equipmentCount; i++) {
        var item = (window.LootSystem && typeof LootSystem.rollDropAtRarity === "function") ? LootSystem.rollDropAtRarity(reward.equipmentRarity) : null;
        if (item && typeof addLootToInventory === "function" && addLootToInventory(item)) {
          granted += 1;
          addLog("🎁 Récompense d'histoire : " + item.name, "event");
        }
      }
      if (granted) rows.push({ label: "Objet", value: granted + " (" + ((window.RARITY_LABELS || {})[reward.equipmentRarity] || reward.equipmentRarity) + ")" });
    }
    return rows;
  },

  _refreshAfterChange: function () {
    if (typeof refreshTabBarVisibility === "function") refreshTabBarVisibility();
    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  /* Court-circuite le chapitre (bouton Paramètres « Débloquer tous les onglets »). */
  skipAll: function () {
    this.ensure();
    Object.keys(STORY_QUESTS).forEach(function (id) { game.storyQuests[id].skipped = true; });
  },

  /* Boot : garantit l'état et rattrape un objectif déjà atteint hors ligne (sans toast, le log suffit). */
  runRetroactiveCheck: function () {
    this.ensure();
    this._syncCoeurEnemyPool();
    // Resynchronise le repère de kills au boot — garde-fou conservé (v3.113.0 : plus de
    // kills hors ligne, mais la resync reste un filet contre toute dérive du compteur).
    game.storyQuests.forest.lastSeenTotalKills = Number(game.totalKills || 0);
    this._checkNow(true);
  },

  /* Navigation « Aller à la quête » : onglet direct, ou section/carte de l'écran Quêtes. */
  /* v3.133.0 : offrande aux braises (étape à champ `offering`, ex. forest_15). getOfferingInfo() -> null si aucune
     étape acceptée n'en demande (ou déjà faite), sinon { step, items:[{id,name,icon,need,have}], canOffer }. */
  getOfferingInfo: function (chapterId) {
    chapterId = chapterId || "forest";
    var step = this.getCurrentStep(chapterId);
    var st = this.getState(chapterId);
    if (!step || !step.offering || !st.accepted || Number(st.counters.offeringDone || 0) >= 1) return null;
    var canOffer = true;
    var items = Object.keys(step.offering).map(function (key) {
      var def = (window.WAREHOUSE_RESOURCES || {})[key] || {};
      var have = (window.WarehouseManager && typeof WarehouseManager.getAmount === "function") ? Number(WarehouseManager.getAmount(key) || 0) : 0;
      var need = Number(step.offering[key] || 0);
      if (have < need) canOffer = false;
      return { id: key, name: def.name || key, icon: def.icon || "", need: need, have: have };
    });
    return { step: step, items: items, canOffer: canOffer };
  },

  /* Consomme les ressources de l'offrande (WarehouseManager, jamais game.resources) et pose counters.offeringDone = 1.
     Tout-ou-rien : rien n'est retiré si une seule ressource manque. */
  offerToEmbers: function (chapterId) {
    chapterId = chapterId || "forest";
    var info = this.getOfferingInfo(chapterId);
    if (!info) return false;
    if (!info.canOffer) { if (typeof showToast === "function") showToast("Il manque encore de quoi nourrir les braises", 1600); return false; }
    if (!window.WarehouseManager) return false;
    for (var i = 0; i < info.items.length; i++) {
      if (!WarehouseManager.removeResource(info.items[i].id, info.items[i].need)) return false;
    }
    this.getState(chapterId).counters.offeringDone = 1;
    addLog("🔥 Offrande aux braises : " + info.items.map(function (it) { return it.need + " " + it.name; }).join(", ") + ". Les braises rougeoient.", "event");
    if (typeof showToast === "function") showToast("🔥 Les braises s'éveillent", 1800);
    if (typeof vibrate === "function") vibrate([40, 30, 80]);
    if (typeof renderAll === "function") renderAll();
    if (typeof saveGame === "function") saveGame();
    return true;
  },

  goToLink: function (chapterId) {
    var step = this.getCurrentStep(chapterId);
    if (!step || !step.linkTo) return;
    // v3.131.2 (retour Seb) : linkTo.beforeGo, hook optionnel exécuté juste avant la navigation
    // — utilisé par forest_12 (Grimoire) pour repositionner le joueur au Cœur de la forêt et
    // relancer un combat cohérent une fois qu'une règle est déjà configurée, plutôt que de
    // renvoyer indéfiniment vers l'écran Grimoire une fois la config faite.
    if (typeof step.linkTo.beforeGo === "function") step.linkTo.beforeGo(game);
    var targetTab = (typeof step.linkTo.tab === "function") ? step.linkTo.tab(game) : step.linkTo.tab;
    if (targetTab) {
      if (typeof switchTab === "function") switchTab(targetTab);
      // v3.107.1 : sous-onglet optionnel (ex. forest_03 -> Menu > Amélioration directement, décision Seb).
      // v3.260.0 : même mécanisme pour la Boutique (forest_04 -> Potions directement).
      if (step.linkTo.subTab && targetTab === "shop") { if (typeof setShopSubTab === "function") setShopSubTab(step.linkTo.subTab); return; }
      if (step.linkTo.subTab && typeof setHerosSubTab === "function") setHerosSubTab(step.linkTo.subTab);
      return;
    }
    // v3.107.6 : les expéditions à mini-jeu ont un vrai point d'entrée dédié — openQuestsAt()
    // seul ne fait que changer d'onglet sans rien déclencher (bug remonté par Seb : bouton
    // « Aller à la quête » inerte).
    // v3.122.0/v3.123.0 (Lots S2a/S2b) : les 6 quêtes de déblocage migrées vers le scene-engine
    // ont pour cardId "scene_<templateId>" — routées vers openSceneQuestEntry(), qui gère la
    // navigation elle-même (switchTab("scene") inclus).
    var cardId = step.linkTo.cardId || "";
    // v3.259.0 (Cartes Vivantes, C-4) : "livingmap_<mapId>" ouvre la carte vivante du monde
    // (sous-vue de l'onglet Carte) — openLivingMap gère la navigation elle-même.
    if (cardId.indexOf("livingmap_") === 0 && typeof openLivingMap === "function") {
      openLivingMap(cardId.replace("livingmap_", ""));
      return;
    }
    if (cardId.indexOf("scene_") === 0 && typeof openSceneQuestEntry === "function") {
      if (typeof switchTab === "function") switchTab("scene");
      openSceneQuestEntry(cardId.replace("scene_", ""));
      return;
    }
    if (cardId.indexOf("exploration_") === 0 && typeof openExplorationPrep === "function") { openExplorationPrep(cardId.replace("exploration_", "")); return; }
    if (typeof openQuestsAt === "function") openQuestsAt(step.linkTo.section, step.linkTo.cardId);
  }
};

window.StoryQuestManager = StoryQuestManager;
