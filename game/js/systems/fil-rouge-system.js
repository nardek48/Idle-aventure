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
  claim: "images/Icons/quests/quest_complete.webp",
  memory: "images/Icons/aether_icon.webp",
  heal: "images/Icons/quests/ration_reward.webp",
  story: "images/Icons/quests/quest_story.webp",
  patrol: "images/Icons/quests/mission_exploration.webp",
  tavern: "images/Icons/village_buildings/tavern.webp",
  plots: "images/Icons/system/collect_all.webp",
  idle: "images/Icons/quests/quest_list.webp",
  forge: "images/Icons/workshops/smithing_station.webp",
  enchant: "images/Icons/village_buildings/enchantress_tower.webp",
  bestiary: "images/Icons/subtabs/bestiary.webp",
  achievement: "images/Icons/menu_icons/achivment_menu.webp",
  pa: "images/Icons/scene/journey_long.webp",          // v3.510.0 : ex-bulles du dock
  dungeon: "images/Icons/subtabs/dungeon.webp"
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
     la dernière place de « Aussi » s'il n'y est pas déjà (v3.510.0 : une 3e place, sans remplacer la 2e). */
  also: function () {
    this.get();
    var list = this._alsoCached.slice();
    var ach = this._achievement();
    if (ach) list.push(ach); // v3.510.0 (option A, Seb 27/10) : 3e place, les deux suivantes restent visibles
    return list;
  },

  _achievement: function () {
    if (!window.AchievementManager) return null;
    var n = AchievementManager.getAvailableToClaimCount();
    if (!n) return null;
    return {
      id: "achievement", urgent: false, icon: "images/Icons/menu_icons/achivment_menu.webp",
      title: n > 1 ? _t("{n} hauts faits à réclamer", { n: n }) : _t("Un haut fait à réclamer"),
      reason: _t("Récompense prête dans les Hauts faits."), goLabel: _t("Voir"),
      go: function () { if (typeof switchTab === "function") switchTab("achievements"); }
    };
  },

  invalidate: function () { this._cached = null; },

  next: function () { return this.all()[0]; },

  /* Toutes les situations vraies, dans l'ordre F2. La dernière (activité du monde) est
     toujours présente : le fil rouge a toujours quelque chose à dire. */
  all: function () {
    var out = [];
    var checks = [this._claim, this._memory, this._heal, this._story, this._patrol, this._tavern, this._pa, this._dungeon, this._plots, this._talents, this._relic, this._zoneUp, this._apres]; // v3.508.0 : talents, relique, zone ; v3.510.0 : petite aventure, donjon
    for (var i = 0; i < checks.length; i++) {
      var r = null;
      try { r = checks[i].call(this); } catch (e) { r = null; } // une source cassée ne doit pas éteindre le fil
      if (r) out = out.concat(r); // _apres rend une liste
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
      title: _t("Réclamer : {x}", { x: m.title }),
      reason: (m.sourceKind === "story" ? _t("Ton étape d'Histoire est terminée.") : _t("Objectif atteint.")) + (m.rewardSummary ? " " + m.rewardSummary + "." : ""),
      goLabel: _t("Réclamer"),
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
      title: _t("Un choix de Mémoire t'attend"),
      reason: n > 1 ? _t("{n} niveaux atteints, un choix pour chacun.", { n: n }) : _t("Un niveau atteint : un souvenir à choisir."),
      goLabel: _t("Choisir"),
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
      title: _t("Reprends des forces"),
      reason: _t("Prochaine étape : {x}. Tu es à {p} % de tes PV.", { x: m.title, p: Math.round(pct * 100) }),
      goLabel: _t("Au Campement"),
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
        title: _t("Nouvelle étape : {x}", { x: m.title }),
        reason: m.blurb || _t("L'Histoire continue."),
        goLabel: _t("Accepter"),
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
      goLabel: _t("Y aller"),
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
      title: back.length > 1 ? _t("{n} patrouilles sont rentrées", { n: back.length })
        : (p.feminine ? _t("{x} est rentrée", { x: _td(p.companionName) }) : _t("{x} est rentré", { x: _td(p.companionName) })),
      reason: _t("Retour de {x}.", { x: _td(p.sectorName) }),
      goLabel: _t("Voir"),
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
      title: _t("Livrer à la Taverne"),
      reason: _tn(ready.length, "{n} contrat livrable : {g} or.", "{n} contrats livrables : {g} or.", { g: formatNumber(gold) }),
      goLabel: _t("Aller à la Taverne"),
      go: function () {
        if (typeof switchTab === "function") switchTab("village");
        if (typeof setVillageSubTab === "function") setVillageSubTab("village");
        if (typeof openVillageBuildingSheet === "function") openVillageBuildingSheet("tavern");
      }
    };
  },

  /* 6 bis. v3.510.0 (option B du 27/10) : la petite aventure du jour, ex-bulle du dock (pas sur son écran). */
  _pa: function () {
    if (((window.game && game.activeTab) || "") === "scene") return null;
    var m = this._paMission();
    if (!m) return null;
    var run = m.status === "running";
    return {
      id: "pa", urgent: false, icon: FIL_ROUGE_ICONS.pa,
      title: run ? _t("Ta petite aventure t'attend") : _t("Une petite aventure est disponible"),
      reason: _t("Une nouvelle chaque jour."), goLabel: run ? _t("Reprendre") : _t("Partir"),
      go: function () { var x = FilRouge._paMission(), fn = x && (x.launch || x.accept); if (typeof fn === "function") fn(); }
    };
  },
  /* Celle en cours d'abord, sinon une disponible aujourd'hui dans le monde courant. */
  _paMission: function () {
    if (!window.MissionBoard || typeof MissionBoard._petiteAventureMissions !== "function") return null;
    var list = MissionBoard._petiteAventureMissions(), avail = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].status === "running") return list[i];
      if (!avail && list[i].status === "available" && !MissionBoard._isOtherWorld(list[i], MissionBoard._currentWorldId())) avail = list[i];
    }
    return avail;
  },

  /* 6 ter. v3.510.0 : sorties de donjon du jour restantes, ex-bulle du dock (pas sur l'écran Donjon). */
  _dungeon: function () {
    if (((window.game && game.activeTab) || "") === "dungeon") return null;
    var d = this._dungeonRunsLeft();
    if (d <= 0) return null;
    return {
      id: "dungeon", urgent: false, icon: FIL_ROUGE_ICONS.dungeon,
      title: _tn(d, "Une sortie de donjon disponible", "{n} sorties de donjon disponibles", { n: d }),
      reason: _t("Les sorties se renouvellent chaque jour."), goLabel: _t("Aller au donjon"),
      go: function () { if (typeof switchTab === "function") switchTab("dungeon"); }
    };
  },
  /* Tous donjons débloqués confondus ; 0 si l'onglet Donjon est fermé. */
  _dungeonRunsLeft: function () {
    if (!window.DungeonManager || !Array.isArray(window.DUNGEONS)) return 0;
    if (typeof isTabUnlocked === "function" && !isTabUnlocked("dungeon")) return 0;
    var n = 0;
    DUNGEONS.forEach(function (dg) { if (dg && DungeonManager.isUnlocked(dg.id)) n += Number(DungeonManager.getRunsLeft(dg.id) || 0); });
    return n;
  },

  /* 7. La moitié des zones ouvertes sont pleines. */
  _plots: function () {
    if (!window.OfflineManager || typeof OfflineManager._countFullPlots !== "function") return null;
    var c = OfflineManager._countFullPlots();
    if (!c.open || c.full < c.open * FIL_ROUGE_PLOTS_RATIO) return null;
    return {
      id: "plots", urgent: false, icon: FIL_ROUGE_ICONS.plots,
      title: _t("Récolter le village"),
      reason: _tn(c.full, "{n} zone pleine sur {m} : elles ne produisent plus.", "{n} zones pleines sur {m} : elles ne produisent plus.", { m: c.open }),
      goLabel: _t("Récolter"),
      go: function () {
        if (typeof switchTab === "function") switchTab("village");
        if (typeof setVillageSubTab === "function") setVillageSubTab("production");
      }
    };
  },

  /* 7 ter. v3.508.0 (lot C) : des points de talent qu'un talent achetable peut prendre. */
  _talents: function () {
    var T = window.TalentManager;
    if (!T || typeof T.available !== "function" || T.available() <= 0) return null;
    var any = (T.getNodes() || []).some(function (e) { var n = e.node || e; return T.canBuy(n.id); });
    if (!any) return null;
    var n = T.available();
    return {
      id: "talents", urgent: false, icon: FIL_ROUGE_ICONS.idle,
      title: _tn(n, "{n} point de talent à dépenser", "{n} points de talent à dépenser"),
      reason: _t("Un talent t'attend dans l'arbre de ta classe."), goLabel: _t("Voir les talents"),
      go: function () { if (typeof switchTab === "function") switchTab("more"); if (typeof setHerosSubTab === "function") setHerosSubTab("talents"); }
    };
  },

  /* 7 quater. v3.508.0 (lot C) : une relique libre et un emplacement vide chez un compagnon du groupe. */
  _relic: function () {
    var CR = window.CompanionRelics, CM = window.CompanionManager;
    if (!CR || !CM) return null;
    var libres = CR.ensure().inv.filter(function (r) { return !CR.wornBy(r.id); });
    if (!libres.length) return null;
    var cid = CM.partyIds().concat(CM.unlockedIds()).filter(function (id) {
      var w = CR.worn(id), open = CR.slotsOpen(id), fams = w.map(function (x) { var r = x != null ? CR.byId(x) : null; return r ? r.f : null; });
      return w.slice(0, open).some(function (x) { return x == null; }) && libres.some(function (r) { return fams.indexOf(r.f) < 0; });
    })[0];
    if (!cid) return null;
    var def = typeof getCompanionDef === "function" ? getCompanionDef(cid) : null;
    return {
      id: "relic", urgent: false, icon: FIL_ROUGE_ICONS.patrol,
      title: _t("Une relique à équiper"),
      reason: _t("{x} a un emplacement libre.", { x: def ? _td(def.name) : cid }), goLabel: _t("Équiper"),
      go: function () {
        if (typeof switchTab === "function") switchTab("more");
        if (typeof setHerosSubTab === "function") setHerosSubTab("companions");
        if (typeof herosOpenCompanion === "function") herosOpenCompanion(cid);
      }
    };
  },

  /* 7 quinquies. v3.508.0 (lot C) : une zone de production qu'on peut monter tout de suite (20 niveaux). */
  _zoneUp: function () {
    var P = window.ProductionPlotsSystem;
    if (!P || typeof getProductionPlotUpgradeCost !== "function" || !window.WarehouseManager) return null;
    if (typeof isTabUnlocked === "function" && !isTabUnlocked("village")) return null;
    var found = null;
    P.getManagedBuildingIds().some(function (bid) {
      return P.getPlots(bid).some(function (pl, i) {
        if (pl.state !== "open" || P.isPlotMaxLevel(pl)) return false;
        var c = getProductionPlotUpgradeCost(bid, pl.level, i);
        if (!c || !Object.keys(c).every(function (k) { return WarehouseManager.getAmount(k) >= c[k]; })) return false;
        found = { bid: bid, name: typeof getProductionZoneName === "function" ? getProductionZoneName(bid, i) : bid, level: pl.level };
        return true;
      });
    });
    if (!found) return null;
    return {
      id: "zoneUp", urgent: false, icon: FIL_ROUGE_ICONS.plots,
      title: _t("Monter une zone de production"),
      reason: _t("{x} peut passer au niveau {n}.", { x: _td(found.name), n: found.level + 1 }), goLabel: _t("Production"),
      go: function () {
        if (typeof switchTab === "function") switchTab("village");
        if (typeof setVillageSubTab === "function") setVillageSubTab("production");
      }
    };
  },

  /* 7 bis. v3.459.11 (audit I1) — après l'Histoire : objectifs longs chiffrés, le plus proche du
     but en tête (les autres passent dans « Aussi »). Rien tant qu'un chapitre reste ouvert. */
  _apres: function () {
    var SQ = window.StoryQuestManager;
    if (!SQ || typeof SQ.activeChapterIds !== "function" || SQ.activeChapterIds().length) return null;
    var out = [];
    function obj(id, icon, titre, a, b, reason, goLabel, go) {
      if (!(b > 0) || a >= b) return;
      out.push({ id: "apres_" + id, urgent: false, icon: icon, ratio: a / b,
        title: _t("{x} : {a} / {b}", { x: titre, a: a, b: b }), reason: _t("Après l'Histoire.") + " " + reason, goLabel: goLabel, go: go });
    }
    function sheet(bid) {
      return function () {
        if (typeof switchTab === "function") switchTab("village");
        if (typeof setVillageSubTab === "function") setVillageSubTab("village");
        if (typeof openVillageBuildingSheet === "function") openVillageBuildingSheet(bid);
      };
    }
    var slots = window.EQUIPMENT_SLOTS || [];
    if (window.ForgeManager && window.WorldCaps) {
      var top = WorldCaps.getVillageCap("forge") * (window.FORGE_LEVELS_PER_BUILDING_LEVEL || 2);
      if (isFinite(top) && top > 0) {
        var n = slots.filter(function (sl) { return ForgeManager.getLevel(sl) >= top; }).length;
        obj("forge", FIL_ROUGE_ICONS.forge, _t("Reforges"), n, slots.length,
          _t("Pièces reforgées au niveau {n}, le plus haut de ce monde.", { n: top }), _t("Voir la Forge"), sheet("forge"));
      }
    }
    if (window.MemoryManager && window.MEMORY_LEVEL_COSTS) {
      var cap = Math.min(MemoryManager.getCap(), MEMORY_LEVEL_COSTS.length);
      obj("memoire", FIL_ROUGE_ICONS.memory, _t("Mémoire"), MemoryManager.getLevel(), cap,
        _t("L'Aether gagné en combat fait monter la Mémoire."), _t("Voir la Mémoire"),
        function () { if (typeof switchTab === "function") switchTab("ascension"); });
    }
    if (window.EnchantManager && window.VillageBuildingManager && window.WorldCaps) {
      var ecap = Math.min(2, WorldCaps.getVillageCap("enchanter")), elvl = VillageBuildingManager.getLevel("enchanter");
      if (elvl < ecap) {
        obj("enchanteresse", FIL_ROUGE_ICONS.enchant, _t("Enchanteresse"), elvl, ecap,
          _t("Au niveau 2, elle relance les bonus des pièces Épiques, contre de l'or seul."), _t("Voir l'Enchanteresse"), sheet("enchanter"));
      } else {
        var lignes = 0, aMax = 0;
        slots.forEach(function (sl) {
          var it = (game.equipped || {})[sl];
          if (!it || !EnchantManager.canRerollRarity(it.rarity)) return;
          (it.affixes || []).forEach(function (a, i) {
            var r = EnchantManager.getRange(it, i);
            if (!r) return;
            lignes++;
            if (Number(a.value) >= r.max - Math.pow(10, -r.decimals) / 2) aMax++;
          });
        });
        obj("relances", FIL_ROUGE_ICONS.enchant, _t("Bonus au maximum"), aMax, lignes,
          _t("L'Enchanteresse relance un bonus contre de l'or ; il ne baisse jamais."), _t("Voir l'Enchanteresse"), sheet("enchanter"));
      }
    }
    if (typeof BESTIARY_BONUS_CONFIG !== "undefined") {
      var ids = Object.keys(BESTIARY_BONUS_CONFIG), faits = ids.filter(function (id) {
        var t = BESTIARY_BONUS_CONFIG[id] || [], last = t.length ? Number(t[t.length - 1].kills || 0) : 0;
        return last > 0 && Number((game.killCounts || {})[id] || 0) >= last;
      }).length;
      obj("bestiaire", FIL_ROUGE_ICONS.bestiary, _t("Bestiaire"), faits, ids.length,
        _t("Fiches complètes : chaque créature vaincue assez souvent pour son dernier palier."), _t("Voir le Bestiaire"),
        function () { if (typeof switchTab === "function") switchTab("bestiary"); });
    }
    if (window.AchievementManager && typeof ACHIEVEMENTS_DB !== "undefined") {
      var hf = ACHIEVEMENTS_DB.filter(function (a) { return AchievementManager.isClaimed(a.id); }).length;
      obj("hauts_faits", FIL_ROUGE_ICONS.achievement, _t("Hauts faits"), hf, ACHIEVEMENTS_DB.length,
        _t("Hauts faits réclamés."), _t("Voir les Hauts faits"),
        function () { if (typeof switchTab === "function") switchTab("achievements"); });
    }
    out.sort(function (x, y) { return y.ratio - x.ratio; }); // le plus proche du but d'abord
    return out.length ? out : null;
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
        reason: engaged ? _t("Rien ne presse. Tu peux reprendre là où tu en étais.") : _t("Rien ne presse.") + " " + (m.rewardSummary ? _t("Récompense : {x}.", { x: m.rewardSummary }) : _t("Une activité du monde t'attend.")),
        goLabel: engaged ? _t("Reprendre") : _t("Voir"),
        go: function () {
          if (engaged && typeof m.launch === "function") m.launch();
          else if (typeof switchTab === "function") switchTab("quests");
        }
      };
    }
    return {
      id: "idle", urgent: false, icon: FIL_ROUGE_ICONS.idle,
      title: _t("Tableau de missions"), reason: _t("Rien ne presse. Choisis ta prochaine sortie."),
      goLabel: _t("Ouvrir"),
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
    return { text: text, label: st ? _t("Suivre l'Histoire") : _t("Tableau de missions"),
      go: function () { if (st) st.go(); else if (typeof switchTab === "function") switchTab("quests"); } };
  }
  if (kind === "heroLock") {
    return { text: _t("Ton héros est en expédition."), label: _t("Reprendre l'expédition"), go: function () {
      if (typeof resumeSceneRun === "function") resumeSceneRun(); else if (typeof switchTab === "function") switchTab("scene");
    } };
  }
  if (kind === "questCap") {
    return { text: _t("Trois quêtes en cours au plus : termine ou abandonne l'une d'elles."), label: _t("Voir mes quêtes"),
      go: function () { if (typeof switchTab === "function") switchTab("quests"); } };
  }
  if (kind === "warehouseFull") {
    var res = ctx.resourceId, name = ((window.WAREHOUSE_RESOURCES || {})[res] || {}).name ? _td(WAREHOUSE_RESOURCES[res].name) : (res || "");
    var contract = (window.TavernManager && TavernManager.getLevel() > 0) ? TavernManager.getContracts().filter(function (c) {
      return !c.done && c.resourceId === res && TavernManager.canDeliver(c.id);
    })[0] : null;
    if (contract) {
      return { text: _t("Entrepôt plein en {x}. La Taverne en demande {n}.", { x: name, n: formatNumber(contract.quantity) }), label: _t("Livrer à la Taverne"),
        go: function () { self._tavernGo(); } };
    }
    return { text: _t("Entrepôt plein en {x}. Un niveau d'Entrepôt ajoute 250 de place.", { x: name }), label: _t("Voir l'Entrepôt"),
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
    return story(_t("Niveau {n} des zones : il s'ouvre {lieu}.", { n: lvl + 1, lieu: where || _t("dans un prochain monde") }));
  }
  if (kind === "talentCap") {
    var next = this._nextTalentAct();
    return story(next ? _t("Plafond de l'acte : {n} points {lieu}.", { n: next.points, lieu: next.where }) : _t("Plafond de l'acte atteint : l'Histoire ouvre la suite."));
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
      : WorldCaps.atAct(a.act, a.worldIndex); // v3.371.0 : phrase entière portée par WorldCaps
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
