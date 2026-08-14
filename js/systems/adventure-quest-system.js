"use strict";
/* ============================================================
Aethervale — systems/adventure-quest-system.js
v3.0 : suivi des quêtes d'aventure (voir data/adventure-quests.js).
Système INDÉPENDANT de systems/world-quest-system.js (qui débloque
les MONDES) — celui-ci scope ses quêtes à {worldId, adventureIndex}
et peut en plus verrouiller le passage d'une aventure à la suivante
à l'intérieur d'un même monde (quêtes de type "expedition").

v3.2 : la progression ne se fait plus en tâche de fond pendant le
farm normal (comme en v3.0) — chaque quête se LANCE explicitement
depuis l'onglet Quêtes (AdventureQuestManager.start()) et bascule sur
l'écran Combat pour un run DÉDIÉ, exactement le même principe que le
Donjon (game.dungeonRun.active / DungeonManager) : CombatEngine
délègue à onEnemyKilled()/onDefeat() tant que game.adventureQuestRun
est actif, au lieu du farm classique. La récompense est distribuée
AUTOMATIQUEMENT à la complétion du run (pas de bouton "Réclamer").

Progression et complétion restent PERMANENTES (survivent à
l'ascension, comme WorldQuestManager — voir hardResetState en
save-system.js), remises à zéro uniquement par le reset complet. Le
run en cours lui-même (game.adventureQuestRun) NE survit PAS à
l'ascension ni au reset complet (même traitement que
game.dungeonRun) — seule la progression déjà enregistrée persiste.
============================================================ */

var AdventureQuestManager = {
  ensureDefaults: function () {
    if (!game.adventureQuestProgress || typeof game.adventureQuestProgress !== "object") {
      game.adventureQuestProgress = {};
    }
    if (!game.adventureQuestsCompleted || typeof game.adventureQuestsCompleted !== "object") {
      game.adventureQuestsCompleted = {};
    }
    if (!game.resources || typeof game.resources !== "object") {
      game.resources = { mineraiRare: 0 };
    }
    if (typeof game.resources.mineraiRare !== "number") game.resources.mineraiRare = 0;

    Object.keys(ADVENTURE_QUESTS).forEach(function (key) {
      var quest = ADVENTURE_QUESTS[key];
      if (!game.adventureQuestProgress[quest.id]) game.adventureQuestProgress[quest.id] = {};
      quest.steps.forEach(function (step) {
        if (typeof game.adventureQuestProgress[quest.id][step.id] !== "number") {
          game.adventureQuestProgress[quest.id][step.id] = 0;
        }
      });
      if (typeof game.adventureQuestsCompleted[quest.id] !== "boolean") {
        game.adventureQuestsCompleted[quest.id] = false;
      }
    });

    this.ensureRun();
  },

  ensureRun: function () {
    if (!game.adventureQuestRun || typeof game.adventureQuestRun !== "object") {
      game.adventureQuestRun = { active: false, questId: null };
    }
  },

  /* Toutes les quêtes définies, pour l'onglet Quêtes (v3.2 : plus
     scopées à la position courante du joueur sur la Carte — un run
     est un aller-retour instancié, indépendant d'où il se trouve
     réellement dans WorldManager). */
  getAllQuests: function () {
    return Object.keys(ADVENTURE_QUESTS).map(function (k) { return ADVENTURE_QUESTS[k]; });
  },

  /* La quête actuellement en cours de run, ou null. */
  getRunningQuest: function () {
    this.ensureRun();
    if (!game.adventureQuestRun.active) return null;
    return ADVENTURE_QUESTS[game.adventureQuestRun.questId] || null;
  },

  getStepProgress: function (quest, step) {
    this.ensureDefaults();
    return Math.min(step.target, Number((game.adventureQuestProgress[quest.id] || {})[step.id] || 0));
  },

  isStepComplete: function (quest, step) {
    return this.getStepProgress(quest, step) >= step.target;
  },

  isReadyToClaim: function (quest) {
    if (!quest) return false;
    if (game.adventureQuestsCompleted[quest.id]) return false;
    var self = this;
    return quest.steps.every(function (step) { return self.isStepComplete(quest, step); });
  },

  /* Le passage adventureIndex -> adventureIndex+1 est verrouillé si une
     quête "expedition" cible explicitement cette transition
     (gatesTransitionTo) et n'est pas encore terminée. Aucune quête
     définie pour cette transition = toujours débloqué (comportement
     WorldManager.advance() inchangé pour tout le reste du jeu). */
  isTransitionUnlocked: function (worldId, fromAdventureIndex) {
    this.ensureDefaults();
    var targetIndex = fromAdventureIndex + 1;
    var gateQuest = null;
    Object.keys(ADVENTURE_QUESTS).some(function (key) {
      var quest = ADVENTURE_QUESTS[key];
      if (quest.type === "expedition" && quest.worldId === worldId && quest.gatesTransitionTo === targetIndex) {
        gateQuest = quest;
        return true;
      }
      return false;
    });
    if (!gateQuest) return true;
    return !!game.adventureQuestsCompleted[gateQuest.id];
  },

  /* v3.3 : même principe que isTransitionUnlocked ci-dessus, mais pour
     le passage d'un monde ENTIER au suivant (worldIndex -> +1),
     appelée depuis WorldManager.meetsAscensionRequirement(). Cherche
     une quête du monde `worldId` marquée gatesNextWorld:true — aucune
     quête définie = toujours débloqué (comportement inchangé pour
     tous les mondes sans contenu ici, aucune régression). */
  isWorldTransitionUnlocked: function (worldId) {
    this.ensureDefaults();
    var gateQuest = null;
    Object.keys(ADVENTURE_QUESTS).some(function (key) {
      var quest = ADVENTURE_QUESTS[key];
      if (quest.worldId === worldId && quest.gatesNextWorld === true) {
        gateQuest = quest;
        return true;
      }
      return false;
    });
    if (!gateQuest) return true;
    return !!game.adventureQuestsCompleted[gateQuest.id];
  },

  /* Peint le fond de combat du monde CIBLE de la quête (peut différer
     du monde où se trouve réellement le joueur) — même mécanisme que
     WorldManager.applyWorldTheme()/DungeonManager.applyDungeonTheme(),
     lu directement dans WORLDS plutôt que via la position courante. */
  applyQuestTheme: function (quest) {
    var root = document.documentElement;
    if (!root) return;
    var world = (WORLDS || []).find(function (w) { return w.id === quest.worldId; });
    if (world && world.combatMap) {
      root.style.setProperty("--world-combat-map", 'url("' + world.combatMap + '")');
    }
  },

  /* Génère un ennemi représentatif du monde/aventure CIBLE de la
     quête, en réutilisant TEL QUEL WorldManager.generateEnemy() (même
     formule de PV/récompenses que le vrai farm de ce monde, aucune
     duplication) via un échange de contexte temporaire : on bascule
     worldIndex/adventureIndex/enemyIndex sur la cible, on génère,
     puis on restaure IMMÉDIATEMENT la vraie position du joueur — rien
     d'autre ne s'exécute entre les deux (JS mono-thread, synchrone),
     donc sans aucun risque de corrompre la progression réelle.
     forceBoss force le cran d'ennemi qui déclenche isBoss dans
     generateEnemy() (dernier ennemi de l'aventure). */
  buildQuestEnemy: function (quest, forceBoss) {
    if (!window.WorldManager) return null;
    var worldIdx = (WORLDS || []).findIndex(function (w) { return w.id === quest.worldId; });
    if (worldIdx === -1) return null;

    var savedWorldIndex = WorldManager.worldIndex;
    var savedAdventureIndex = WorldManager.adventureIndex;
    var savedEnemyIndex = WorldManager.enemyIndex;

    WorldManager.worldIndex = worldIdx;
    WorldManager.adventureIndex = quest.adventureIndex;
    var adventure = WorldManager.getAdventure();
    var enemyCount = (adventure && adventure.enemyCount) || 1;
    WorldManager.enemyIndex = forceBoss ? Math.max(0, enemyCount - 1) : 0;

    var enemy = WorldManager.generateEnemy();

    WorldManager.worldIndex = savedWorldIndex;
    WorldManager.adventureIndex = savedAdventureIndex;
    WorldManager.enemyIndex = savedEnemyIndex;

    return enemy;
  },

  /* Le prochain ennemi du run doit-il être LE boss visé par une étape
     "bossKill" pas encore complétée ? Uniquement une fois que tous
     les AUTRES objectifs (kill/collect) sont déjà remplis, pour ne
     pas noyer le joueur sous des ennemis normaux une fois l'essentiel
     acquis. */
  nextSpawnIsBoss: function (quest) {
    var self = this;
    var pendingBossStep = quest.steps.find(function (s) { return s.type === "bossKill" && !self.isStepComplete(quest, s); });
    if (!pendingBossStep) return false;
    return quest.steps.every(function (s) {
      return s.type === "bossKill" || self.isStepComplete(quest, s);
    });
  },

  spawnRunEnemy: function (quest) {
    var forceBoss = this.nextSpawnIsBoss(quest);
    var enemy = this.buildQuestEnemy(quest, forceBoss);
    if (!enemy) {
      this.forfeit();
      return;
    }

    game.enemy = enemy;
    game._enemyAttackTimer = 0;
    this.applyQuestTheme(quest);
    if (typeof renderEnemy === "function") renderEnemy();
    if (typeof renderHud === "function") renderHud();
  },

  /* Lance un run dédié pour cette quête (bouton "Lancer" dans l'onglet
     Quêtes) : bascule sur l'écran Combat, fait apparaître un premier
     ennemi représentatif du monde/aventure ciblé. v3.1.0 oblige, le
     joueur doit ensuite AIDER ACTIVEMENT (taper, auto-DPS tant qu'il
     reste sur l'écran Combat) — la quête n'avance plus toute seule en
     tâche de fond comme en v3.0. */
  start: function (questId) {
    this.ensureDefaults();

    var quest = ADVENTURE_QUESTS[questId];
    if (!quest) return showToast("Quête introuvable", 1200);
    if (game.adventureQuestsCompleted[questId]) return showToast("Quête déjà terminée", 1200);
    if (game.adventureQuestRun.active) return showToast("Une quête est déjà en cours", 1200);
    if (window.DungeonManager && game.dungeonRun && game.dungeonRun.active) {
      return showToast("Termine ou abandonne ton donjon avant de lancer une quête", 1600);
    }

    game.adventureQuestRun = { active: true, questId: questId };
    addLog("📜 Départ en quête : " + quest.name, "event");
    this.spawnRunEnemy(quest);
    if (typeof switchTab === "function") switchTab("combat");
    saveGame();
  },

  /* Appelée par CombatEngine.killEnemy() quand un ennemi tombe PENDANT
     un run de quête actif — ne touche QUE la quête en cours (plus de
     scan global façon v3.0 : la progression d'une quête n'avance que
     via son propre run explicite, jamais en ambiant). */
  onEnemyKilled: function (enemy) {
    this.ensureRun();
    var quest = ADVENTURE_QUESTS[game.adventureQuestRun.questId];
    if (!quest) {
      this.forfeit();
      return;
    }

    var progress = game.adventureQuestProgress[quest.id];

    quest.steps.forEach(function (step) {
      if (step.type === "kill" && !enemy.isBoss) {
        if (progress[step.id] < step.target) progress[step.id] += 1;
      } else if (step.type === "bossKill" && enemy.isBoss && step.bossId === enemy.id) {
        if (progress[step.id] < step.target) progress[step.id] += 1;
      }
    });

    // Ressource rare (Collecte) : même principe de chance de drop que
    // la chasse ambiante du village, mais UNIQUEMENT pendant le run
    // de LA quête concernée, sur un kill normal (jamais sur le boss).
    if (!enemy.isBoss) {
      quest.steps.forEach(function (step) {
        if (step.type === "collect" && chance(20)) {
          if (!game.resources || typeof game.resources !== "object") game.resources = {};
          game.resources[step.resourceKey] = Number(game.resources[step.resourceKey] || 0) + 1;
          addLog("⛏️ " + (step.resourceKey === "mineraiRare" ? "Minerai rare" : step.resourceKey) + " trouvé (+1)", "event");
          if (progress[step.id] < step.target) progress[step.id] += 1;
        }
      });
    }

    if (this.isReadyToClaim(quest)) {
      this.finish(quest, true);
      return;
    }

    this.spawnRunEnemy(quest);
  },

  /* Distribue la récompense (or/essence) et termine le run — SUCCÈS
     uniquement (un run interrompu par défaite/abandon ne donne jamais
     la récompense, voir onDefeat()/forfeit() ci-dessous ; la
     progression déjà enregistrée sur les étapes reste acquise pour la
     prochaine tentative, rien n'est perdu). Repasse ensuite sur un
     ennemi de monde normal, comme DungeonManager.finish(). */
  finish: function (quest, success) {
    this.ensureRun();
    game.adventureQuestRun = { active: false, questId: null };

    if (success && quest) {
      game.adventureQuestsCompleted[quest.id] = true;

      var reward = quest.reward || {};
      game.gold += Number(reward.gold || 0);
      game.essence += Number(reward.essence || 0);
      game.totalGoldEarned += Number(reward.gold || 0);

      addLog("📜 Quête terminée : " + quest.name + " (+" + formatNumber(reward.gold || 0) + " or, +" + formatNumber(reward.essence || 0) + " essence)", "event");
      showToast("📜 " + quest.name + " terminée !", 2200);
    }

    if (window.CombatEngine && typeof CombatEngine.spawnEnemy === "function") {
      CombatEngine.spawnEnemy();
    }

    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  /* Défaite pendant un run de quête : arrête le run SANS récompense
     et sans le malus d'or classique — la progression déjà enregistrée
     reste acquise, le joueur peut relancer plus tard. PV restaurés,
     même traitement que DungeonManager.onDefeat(). */
  onDefeat: function () {
    this.ensureRun();
    var quest = ADVENTURE_QUESTS[game.adventureQuestRun.questId];
    game.heroHp = game.heroMaxHp || 1;
    addLog("💀 Quête interrompue" + (quest ? " : " + quest.name : "") + " — progression conservée.", "event");
    vibrate([80, 40, 80]);
    this.finish(quest, false);
  },

  /* Abandon volontaire (bouton dans l'onglet Quêtes). Même résultat
     qu'une défaite (pas de récompense, progression conservée), sans
     le message "interrompu". */
  forfeit: function () {
    this.ensureRun();
    if (!game.adventureQuestRun.active) return;
    var quest = ADVENTURE_QUESTS[game.adventureQuestRun.questId];
    addLog("🏳️ Quête abandonnée" + (quest ? " : " + quest.name : "") + " — progression conservée.", "event");
    this.finish(quest, false);
  }
};

window.AdventureQuestManager = AdventureQuestManager;
