"use strict";
/* systems/fil-rouge-system.js — v3.332.0 (Évolutions, lot F-1) : le fil rouge.
   Conception « Évolutions » v1.0 §3, décisions F1 à F4 (Seb, 24/09/2026).

   UNE fonction pure en entrée : FilRouge.next() lit l'état et rend UNE proposition
   { id, title, reason, icon, goLabel, go(), urgent }. Aucune mutation ici, sauf dans go(),
   qui délègue au système d'origine (StoryQuestManager, TavernManager, switchTab…).

   ORDRE (F2) : la première situation vraie gagne. L'Histoire passe avant le village,
   comme dans MissionBoard.list() où elle a toujours le rang 0. Le choix de Mémoire en
   attente passe par ici (R2 : il n'a pas de rubrique à l'écran de retour).

   COÛT : le HUD se redessine à chaque image. get() garde le résultat une seconde ;
   invalidate() force le recalcul après une action. */

var FIL_ROUGE_CACHE_MS = 1000;
var FIL_ROUGE_HEAL_PCT = 0.60;      // en dessous, on propose de se soigner avant un combat d'Histoire
var FIL_ROUGE_PLOTS_RATIO = 0.5;    // au moins la moitié des zones ouvertes pleines

var FIL_ROUGE_ICONS = {
  claim: "images/Icons/quests/quest_complete.png",
  memory: "images/Icons/aether_icon.png",
  heal: "images/Icons/quests/ration_reward.png",
  story: "images/Icons/quests/quest_story.png",
  patrol: "images/Icons/quests/mission_exploration.png",
  tavern: "images/Icons/village_buildings/tavern.png",
  plots: "images/Icons/system/collect_all.png",
  idle: "images/Icons/quests/quest_list.png"
};

var FilRouge = {
  _cached: null,
  _cachedAt: 0,
  _alsoCached: [],

  /* Proposition courante, recalculée au plus une fois par seconde. */
  get: function () {
    var now = Date.now();
    if (!this._cached || now - this._cachedAt >= FIL_ROUGE_CACHE_MS) {
      var all = this.all();
      this._cached = all[0];
      this._alsoCached = all.slice(1, 3);
      this._cachedAt = now;
    }
    return this._cached;
  },

  /* Les deux propositions suivantes, pour la ligne « Aussi » de la bulle.
     v3.338.0 (H10) : un haut fait à réclamer n'est JAMAIS la proposition principale ; il prend
     la dernière place de « Aussi » s'il n'y est pas déjà. */
  also: function () {
    this.get();
    var list = this._alsoCached.slice();
    var ach = this._achievement();
    if (ach) { if (list.length >= 2) list[1] = ach; else list.push(ach); }
    return list;
  },

  _achievement: function () {
    if (!window.AchievementManager) return null;
    var n = AchievementManager.getAvailableToClaimCount();
    if (!n) return null;
    return {
      id: "achievement", urgent: false, icon: "images/Icons/menu_icons/achivment_menu.png",
      title: n > 1 ? (n + " hauts faits à réclamer") : "Un haut fait à réclamer",
      reason: "Récompense prête dans les Hauts faits.", goLabel: "Voir",
      go: function () { if (typeof switchTab === "function") switchTab("achievements"); }
    };
  },

  invalidate: function () { this._cached = null; },

  next: function () { return this.all()[0]; },

  /* Toutes les situations vraies, dans l'ordre F2. La dernière (activité du monde) est
     toujours présente : le fil rouge a toujours quelque chose à dire. */
  all: function () {
    var out = [];
    var checks = [this._claim, this._memory, this._heal, this._story, this._patrol, this._tavern, this._plots];
    for (var i = 0; i < checks.length; i++) {
      var r = null;
      try { r = checks[i].call(this); } catch (e) { r = null; } // une source cassée ne doit pas éteindre le fil
      if (r) out.push(r);
    }
    out.push(this._idle());
    return out;
  },

  /* ---------- Sources ---------- */

  _missions: function () {
    return (window.MissionBoard && typeof MissionBoard.list === "function") ? MissionBoard.list() : [];
  },

  _storyMission: function () {
    return this._missions().filter(function (m) { return m.sourceKind === "story"; })[0] || null;
  },

  _storyStep: function (m) {
    if (!m || !window.StoryQuestManager) return null;
    return StoryQuestManager.getCurrentStep(m.worldId);
  },

  /* 1. Une récompense à réclamer (Histoire d'abord, puis le reste du tableau). */
  _claim: function () {
    var m = this._missions().filter(function (x) { return x.status === "claimable" && typeof x.claim === "function"; })[0];
    if (!m) return null;
    var self = this;
    return {
      id: "claim", urgent: true, icon: FIL_ROUGE_ICONS.claim,
      title: "Réclamer : " + m.title,
      reason: (m.sourceKind === "story" ? "Ton étape d'Histoire est terminée." : "Objectif atteint.") + (m.rewardSummary ? " " + m.rewardSummary + "." : ""),
      goLabel: "Réclamer",
      go: function () { m.claim(); self.invalidate(); if (typeof renderAll === "function") renderAll(); }
    };
  },

  /* 2. Un niveau de Mémoire atteint, choix pas encore fait. */
  _memory: function () {
    if (!window.MemoryManager || typeof MemoryManager.getPendingLevels !== "function") return null;
    if (typeof isTabUnlocked === "function" && !isTabUnlocked("ascension")) return null;
    var n = MemoryManager.getPendingLevels().length;
    if (!n) return null;
    return {
      id: "memory", urgent: true, icon: FIL_ROUGE_ICONS.memory,
      title: "Un choix de Mémoire t'attend",
      reason: n > 1 ? (n + " niveaux atteints, un choix pour chacun.") : "Un niveau atteint : un souvenir à choisir.",
      goLabel: "Choisir",
      go: function () { if (typeof switchTab === "function") switchTab("ascension"); }
    };
  },

  /* L'étape mène-t-elle à un combat ? Lu sur son lien, sans liste codée en dur. */
  _isFightStep: function (step) {
    var link = step && step.linkTo;
    if (!link) return false;
    var card = String(link.cardId || "");
    var tab = (typeof link.tab === "function") ? null : link.tab;
    return tab === "combat" || link.section === "adventure" || card.indexOf("adv_") === 0 || card.indexOf("hunt_") === 0;
  },

  /* 3. Combat d'Histoire en vue, héros entamé. */
  _heal: function () {
    var m = this._storyMission();
    if (!m || m.status !== "accepted") return null;
    if (!this._isFightStep(this._storyStep(m))) return null;
    var max = Number(game.heroMaxHp || 0);
    if (!(max > 0)) return null;
    var pct = Number(game.heroHp != null ? game.heroHp : max) / max;
    if (pct >= FIL_ROUGE_HEAL_PCT) return null;
    return {
      id: "heal", urgent: false, icon: FIL_ROUGE_ICONS.heal,
      title: "Reprends des forces",
      reason: "Prochaine étape : " + m.title + ". Tu es à " + Math.round(pct * 100) + " % de tes PV.",
      goLabel: "Au Campement",
      go: function () { if (typeof switchTab === "function") switchTab("campement"); }
    };
  },

  /* 4. L'étape d'Histoire en cours (ou à accepter). */
  _story: function () {
    var m = this._storyMission();
    if (!m || m.status === "claimable") return null;
    var self = this;
    if (m.status === "available") {
      return {
        id: "story", urgent: false, icon: FIL_ROUGE_ICONS.story,
        title: "Nouvelle étape : " + m.title,
        reason: m.blurb || "L'Histoire continue.",
        goLabel: "Accepter",
        go: function () {
          if (typeof m.accept === "function") m.accept();
          self.invalidate();
          if (typeof renderAll === "function") renderAll();
        }
      };
    }
    return {
      id: "story", urgent: false, icon: FIL_ROUGE_ICONS.story,
      title: m.title,
      reason: m.blurb || m.objectiveLabel || "",
      goLabel: "Y aller",
      go: function () {
        if (typeof m.launch === "function") m.launch();
        else if (typeof switchTab === "function") switchTab("quests");
      }
    };
  },

  /* 5. Une patrouille rentrée (lot P-1, PatrolManager). */
  _patrol: function () {
    if (!window.PatrolManager || typeof PatrolManager.getReturned !== "function") return null;
    var back = PatrolManager.getReturned();
    if (!back.length) return null;
    var p = back[0];
    return {
      id: "patrol", urgent: true, icon: FIL_ROUGE_ICONS.patrol,
      title: back.length > 1 ? (back.length + " patrouilles sont rentrées") : (p.companionName + " est rentré" + (p.feminine ? "e" : "")),
      reason: "Retour de " + p.sectorName + ".",
      goLabel: "Voir",
      go: function () { if (typeof openPatrolScreen === "function") openPatrolScreen(); }
    };
  },

  /* 6. Un contrat de Taverne livrable maintenant. */
  _tavern: function () {
    if (!window.TavernManager || TavernManager.getLevel() <= 0) return null;
    var ready = TavernManager.getContracts().filter(function (c) { return !c.done && TavernManager.canDeliver(c.id); });
    if (!ready.length) return null;
    var gold = ready.reduce(function (s, c) { return s + TavernManager.getPayout(c); }, 0);
    return {
      id: "tavern", urgent: false, icon: FIL_ROUGE_ICONS.tavern,
      title: "Livrer à la Taverne",
      reason: ready.length + " contrat" + (ready.length > 1 ? "s livrables" : " livrable") + " : " + formatNumber(gold) + " or.",
      goLabel: "Aller à la Taverne",
      go: function () {
        if (typeof switchTab === "function") switchTab("village");
        if (typeof setVillageSubTab === "function") setVillageSubTab("village");
        if (typeof openVillageBuildingSheet === "function") openVillageBuildingSheet("tavern");
      }
    };
  },

  /* 7. La moitié des zones ouvertes sont pleines. */
  _plots: function () {
    if (!window.OfflineManager || typeof OfflineManager._countFullPlots !== "function") return null;
    var c = OfflineManager._countFullPlots();
    if (!c.open || c.full < c.open * FIL_ROUGE_PLOTS_RATIO) return null;
    return {
      id: "plots", urgent: false, icon: FIL_ROUGE_ICONS.plots,
      title: "Récolter le village",
      reason: c.full + " zone" + (c.full > 1 ? "s pleines" : " pleine") + " sur " + c.open + " : elles ne produisent plus.",
      goLabel: "Récolter",
      go: function () {
        if (typeof switchTab === "function") switchTab("village");
        if (typeof setVillageSubTab === "function") setVillageSubTab("production");
      }
    };
  },

  /* 8. Rien ne presse : une activité engagée ou disponible du monde, sinon le tableau. */
  _idle: function () {
    var m = this._missions().filter(function (x) {
      return x.sourceKind !== "story" && (x.status === "running" || x.status === "accepted" || x.status === "available");
    })[0];
    if (m) {
      var engaged = m.status !== "available";
      return {
        id: "idle", urgent: false, icon: FIL_ROUGE_ICONS.idle,
        title: m.title,
        reason: engaged ? "Rien ne presse. Tu peux reprendre là où tu en étais." : "Rien ne presse. " + (m.rewardSummary ? "Récompense : " + m.rewardSummary + "." : "Une activité du monde t'attend."),
        goLabel: engaged ? "Reprendre" : "Voir",
        go: function () {
          if (engaged && typeof m.launch === "function") m.launch();
          else if (typeof switchTab === "function") switchTab("quests");
        }
      };
    }
    return {
      id: "idle", urgent: false, icon: FIL_ROUGE_ICONS.idle,
      title: "Tableau de missions", reason: "Rien ne presse. Choisis ta prochaine sortie.",
      goLabel: "Ouvrir",
      go: function () { if (typeof switchTab === "function") switchTab("quests"); }
    };
  }
};

/* ---------- F-2 (v3.336.0) : transformer un « non » en « voici comment » ----------
   Conception « Évolutions » v1.0 §3 F3, décision Seb 24/09/2026. Pour les cinq refus les plus
   fréquents, howTo(kind, ctx) rend { text, label, go } : ce qui bloque, et un geste pour
   avancer. La vue (showHowToToast) l'affiche sous le message de refus. null : rien à proposer. */
FilRouge.howTo = function (kind, ctx) {
  ctx = ctx || {};
  var self = this;
  function story(text) {
    var st = self._story();
    return { text: text, label: st ? "Suivre l'Histoire" : "Tableau de missions",
      go: function () { if (st) st.go(); else if (typeof switchTab === "function") switchTab("quests"); } };
  }
  if (kind === "heroLock") {
    return { text: "Ton héros est en expédition.", label: "Reprendre l'expédition", go: function () {
      if (typeof resumeSceneRun === "function") resumeSceneRun(); else if (typeof switchTab === "function") switchTab("scene");
    } };
  }
  if (kind === "questCap") {
    return { text: "Trois quêtes en cours au plus : termine ou abandonne l'une d'elles.", label: "Voir mes quêtes",
      go: function () { if (typeof switchTab === "function") switchTab("quests"); } };
  }
  if (kind === "warehouseFull") {
    var res = ctx.resourceId, name = ((window.WAREHOUSE_RESOURCES || {})[res] || {}).name || res || "";
    var contract = (window.TavernManager && TavernManager.getLevel() > 0) ? TavernManager.getContracts().filter(function (c) {
      return !c.done && c.resourceId === res && TavernManager.canDeliver(c.id);
    })[0] : null;
    if (contract) {
      return { text: "Entrepôt plein en " + name + ". La Taverne en demande " + formatNumber(contract.quantity) + ".", label: "Livrer à la Taverne",
        go: function () { self._tavernGo(); } };
    }
    return { text: "Entrepôt plein en " + name + ". Un niveau d'Entrepôt ajoute 250 de place.", label: "Voir l'Entrepôt",
      go: function () {
        if (typeof switchTab === "function") switchTab("village");
        if (typeof setVillageSubTab === "function") setVillageSubTab("village");
        if (typeof openVillageBuildingSheet === "function") openVillageBuildingSheet("warehouse");
      } };
  }
  if (kind === "zoneCap") {
    // Premier monde dont le plafond dépasse le niveau actuel de la zone
    var lvl = Number(ctx.level || 0), where = null;
    if (window.WORLD_CAPS && window.WorldCaps) {
      for (var i = 0; i < WORLD_CAPS.length; i++) if (Number(WORLD_CAPS[i].zoneLevel) > lvl) { where = WorldCaps.withPrep(i); break; }
      if (!where) where = WorldCaps.withPrep(WORLD_CAPS.length);
    }
    return story("Niveau " + (lvl + 1) + " des zones : il s'ouvre " + (where || "dans un prochain monde") + ".");
  }
  if (kind === "talentCap") {
    var next = this._nextTalentAct();
    return story(next ? ("Plafond de l'acte : " + next.points + " points " + next.where + ".") : "Plafond de l'acte atteint : l'Histoire ouvre la suite.");
  }
  return null;
};

/* Prochaine entrée de TALENT_CAP_BY_ACT pas encore atteinte : { points, where }. */
FilRouge._nextTalentAct = function () {
  if (!window.TALENT_CAP_BY_ACT || !window.WorldCaps) return null;
  var SQ = window.StoryQuestManager, world = WorldCaps.getReachedWorldIndex(), cap = WorldCaps.getTalentActCap();
  for (var i = 0; i < TALENT_CAP_BY_ACT.length; i++) {
    var a = TALENT_CAP_BY_ACT[i];
    if (a.worldIndex < world || !(a.points > cap)) continue;
    if (SQ && SQ.isStepReached(a.stepId)) continue;
    var w = window.WORLDS ? WORLDS[a.worldIndex] : null;
    var where = a.worldIndex > world ? WorldCaps.withPrep(a.worldIndex)
      : ("à l'acte " + a.act + " " + ((window.WORLD_CAPS_DE || [])[a.worldIndex] || "de") + " " + (w ? w.name : ""));
    return { points: a.points, where: where };
  }
  return null;
};

FilRouge._tavernGo = function () {
  if (typeof switchTab === "function") switchTab("village");
  if (typeof setVillageSubTab === "function") setVillageSubTab("village");
  if (typeof openVillageBuildingSheet === "function") openVillageBuildingSheet("tavern");
};

window.FilRouge = FilRouge;
