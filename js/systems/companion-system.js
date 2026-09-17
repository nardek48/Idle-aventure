"use strict";
/* systems/companion-system.js — v3.268.0 (lot L-2) : le compagnon en jeu.
   Doc : Aethervale_Conception_Combat_Groupe_v1_0.docx §4.

   Découpage volontaire : ce fichier tient TOUT ce qui est propre aux compagnons
   (roster persistant, acteurs de combat, politique automatique, KO, améliorations).
   combat-engine.js ne gagne qu'un appel — alliesTurn() — et ne connaît rien de Wenna.

   PERSISTANCE : un seul objet, game.companions, câblé aux quatre points obligatoires
   de save-system.js. Les acteurs de combat (game.combat.allies) ne sont PAS sauvegardés,
   comme game.enemy : ils se reconstruisent au spawn depuis game.companions. */

var CompanionManager = {

  /* ---------- Roster persistant ---------- */

  ensure: function () {
    if (!game.companions || typeof game.companions !== "object") game.companions = {};
    return game.companions;
  },

  /* État d'un compagnon, créé au besoin. hp est le report entre deux combats. */
  state: function (companionId) {
    var all = this.ensure();
    if (!getCompanionDef(companionId)) return null;
    if (!all[companionId] || typeof all[companionId] !== "object") {
      all[companionId] = { unlocked: false, upgrades: 0, control: "auto", present: false, hp: null,
        healThreshold: "normal", healPriority: "lowest", keepReserve: false };
    }
    var st = all[companionId];
    if (typeof st.unlocked !== "boolean") st.unlocked = false;
    if (typeof st.upgrades !== "number" || st.upgrades < 0) st.upgrades = 0;
    if (st.control !== "manual") st.control = "auto";
    if (typeof st.present !== "boolean") st.present = false;
    // v3.271.0 (L-5) : réglages de comportement (mode Auto). Valeurs sûres pour une save d'avant.
    if (!isCompanionHealThreshold(st.healThreshold)) st.healThreshold = "normal";
    if (st.healPriority !== "hero") st.healPriority = "lowest";
    if (typeof st.keepReserve !== "boolean") st.keepReserve = false;
    return st;
  },

  isUnlocked: function (companionId) {
    var st = this.state(companionId);
    return !!(st && st.unlocked);
  },

  /* Appelé par l'étape d'Histoire qui fait rejoindre le compagnon. */
  unlock: function (companionId) {
    var def = getCompanionDef(companionId);
    var st = this.state(companionId);
    if (!def || !st || st.unlocked) return false;
    st.unlocked = true;
    st.present = true;
    st.hp = this.maxHpOf(companionId);
    if (def.lines && def.lines.join && typeof addLog === "function") {
      addLog("🤝 " + def.name + " — « " + def.lines.join + " »", "event");
    }
    if (typeof saveGame === "function") saveGame();
    return true;
  },

  unlockedIds: function () {
    var all = this.ensure(), out = [];
    Object.keys(COMPANIONS_DB).forEach(function (id) {
      if (all[id] && all[id].unlocked) out.push(id);
    });
    return out;
  },

  /* Compagnons qui partent avec le héros, dans l'ordre, plafonnés. */
  partyIds: function () {
    var self = this;
    return this.unlockedIds().filter(function (id) {
      return !!self.state(id).present;
    }).slice(0, COMPANION_MAX_PRESENT);
  },

  setPresent: function (companionId, present) {
    var st = this.state(companionId);
    if (!st || !st.unlocked) return false;
    if (present && this.partyIds().length >= COMPANION_MAX_PRESENT && !st.present) {
      if (typeof showToast === "function") showToast("Deux compagnons au maximum", 1400);
      return false;
    }
    st.present = !!present;
    if (typeof saveGame === "function") saveGame();
    return true;
  },

  /* Réglages de comportement. Un seul point d'entrée : la valeur est validée ici, pas
     dans la vue, pour qu'une save trafiquée ne puisse pas casser la politique auto. */
  setSetting: function (companionId, key, value) {
    var st = this.state(companionId);
    if (!st) return false;
    if (key === "healThreshold") {
      if (!isCompanionHealThreshold(value)) return false;   // contrôle strict : on refuse
      st.healThreshold = value;
    } else if (key === "healPriority") {
      st.healPriority = (value === "hero") ? "hero" : "lowest";
    } else if (key === "keepReserve") {
      st.keepReserve = !!value;
    } else return false;
    if (typeof saveGame === "function") saveGame();
    return true;
  },

  /* v3.276.0 (décision Seb) : plus d'interrupteur par compagnon. Le mode de combat décide
     pour tout le monde — Grimoire, les compagnons jouent seuls ; Tactique, tu les joues.
     C'était déjà la règle implicite (le Grimoire ignorait l'interrupteur) ; elle devient
     la seule, et il n'y a plus un réglage qui puisse la contredire. */
  controlOf: function () {
    return (game.combatMode === "grimoire") ? "auto" : "manual";
  },

  /* Conservé pour les appelants existants et le harnais : le réglage n'est plus stocké,
     mais forcer un mode reste possible en changeant le mode de combat. */
  setControl: function (companionId, control) {
    var st = this.state(companionId);
    if (!st) return false;
    st.control = (control === "manual") ? "manual" : "auto";
    return true;
  },

  /* ---------- Stats et soin ---------- */

  /* Le monde DU COMBAT, pas le monde le plus avancé (§4.2). */
  worldIndex: function () {
    return (window.WorldManager && typeof WorldManager.worldIndex === "number") ? WorldManager.worldIndex : 0;
  },

  statsOf: function (companionId) {
    var st = this.state(companionId);
    return getCompanionStats(companionId, this.worldIndex(), st ? st.upgrades : 0);
  },

  maxHpOf: function (companionId) {
    var s = this.statsOf(companionId);
    return s ? s.maxHp : 1;
  },

  hpOf: function (companionId) {
    var st = this.state(companionId);
    if (!st) return 0;
    var max = this.maxHpOf(companionId);
    if (typeof st.hp !== "number" || !isFinite(st.hp) || st.hp > max) st.hp = max;
    return Math.max(0, st.hp);
  },

  healAll: function () {
    var self = this;
    this.unlockedIds().forEach(function (id) {
      self.state(id).hp = self.maxHpOf(id);
    });
  },

  /* ---------- Acteurs de combat ---------- */

  /* Construit (ou rafraîchit) les acteurs alliés dans game.combat.allies.
     Appelé au spawn d'un groupe ennemi : allies[0] reste le héros. */
  syncParty: function () {
    if (!window.CombatActors) return [];
    var c = CombatActors.ensure();
    if (!c) return [];

    var self = this;
    var ids = this.partyIds();

    // On repart de zéro derrière le héros : un compagnon retiré doit disparaître.
    c.allies.length = 0;
    c.allies.push(CombatActors.heroActor());

    ids.forEach(function (id) {
      c.allies.push(self.buildActor(id));
    });
    return c.allies;
  },

  buildActor: function (companionId) {
    var def = getCompanionDef(companionId);
    var st = this.state(companionId);
    if (!def || !st) return null;

    var stats = this.statsOf(companionId);
    var self = this;

    /* PV du compagnon : une VUE sur game.companions[id].hp, jamais une copie —
       même principe que le héros-acteur (core/combat-actors.js). */
    var actor = {
      actorId: "a_" + companionId,
      companionId: companionId,
      side: "ally",
      role: def.role,
      name: def.name,
      image: def.image,
      threat: 0,
      threatMult: def.threatMult || 1,
      damage: stats.damage,
      cooldown: 0,
      charges: this.chargesMax(companionId),
      isBoss: false,
      isElite: false
    };

    /* v3.276.0 : `control` est une VUE sur le mode de combat, pas une valeur figée au
       spawn — sinon un changement de mode en plein combat laissait l'acteur sur l'ancien
       réglage et le compagnon ne jouait plus du tout (constaté au banc). */
    Object.defineProperty(actor, "control", {
      get: function () { return self.controlOf(); },
      enumerable: true
    });

    Object.defineProperty(actor, "hp", {
      get: function () { return self.hpOf(companionId); },
      set: function (v) { self.state(companionId).hp = Math.max(0, Number(v) || 0); },
      enumerable: true
    });
    Object.defineProperty(actor, "maxHp", {
      get: function () { return self.maxHpOf(companionId); },
      enumerable: true
    });
    Object.defineProperty(actor, "ko", {
      get: function () { return self.hpOf(companionId) <= 0; },
      set: function () {}, // dérivé des PV : un compagnon est KO quand il est à 0
      enumerable: true
    });

    return actor;
  },

  /* Charges restantes d'un compagnon sur le combat en cours. Elles ne sont pas
     persistées : un nouveau combat les rend, c'est tout leur intérêt face au cooldown
     (qui, lui, tient le rythme à l'intérieur d'un même combat). */
  chargesMax: function (companionId) {
    var def = getCompanionDef(companionId);
    return (def && def.skill && typeof def.skill.charges === "number") ? def.skill.charges : 0;
  },

  /* Ouverture d'un combat : un compagnon KO revient avec des PV réduits (§4.4). */
  onCombatStart: function () {
    var self = this;
    this.partyIds().forEach(function (id) {
      var st = self.state(id);
      var max = self.maxHpOf(id);
      if (typeof st.hp !== "number" || !isFinite(st.hp)) st.hp = max;
      if (st.hp <= 0) st.hp = Math.max(1, Math.floor(max * COMPANION_KO_RETURN_PCT));
      if (st.hp > max) st.hp = max;
    });
    this.syncParty();
    // v3.270.0 (L-4) : la file du round précédent ne survit pas à un nouveau combat.
    if (window.CombatEngine && typeof CombatEngine.clearQueue === "function") CombatEngine.clearQueue();
  },

  /* ---------- Tour d'un compagnon ---------- */

  /* Politique automatique : premier slot jouable gagne. La compétence de soin n'est
     jouée que si un allié est réellement sous le seuil — sinon elle gâche le round
     ET le cooldown, exactement le piège relevé au banc Forêt sur la Défense. */
  chooseAction: function (actor) {
    var def = getCompanionDef(actor.companionId);
    if (!def) return null;
    var policy = def.autoPolicy || ["basic"];

    for (var i = 0; i < policy.length; i++) {
      if (policy[i] === "skill") {
        if (Number(actor.cooldown || 0) > 0) continue;
        if (this.chargesMax(actor.companionId) > 0 && Number(actor.charges || 0) <= 0) continue; // plafond du combat atteint
        if (def.skill && def.skill.type === "heal") {
          var st = this.state(actor.companionId);
          /* v3.271.0 (L-5) : réserve — il garde sa dernière charge pour un coup dur,
             sauf si l'allié visé est vraiment bas (moitié du seuil). */
          var t = this.autoHealTarget(actor);
          if (!t) continue;
          var seuil = getCompanionHealThreshold(st.healThreshold).value;
          var ratio = Number(t.maxHp || 0) > 0 ? (t.hp / t.maxHp) : 1;
          if (ratio >= seuil) continue;
          if (st.keepReserve && Number(actor.charges || 0) <= 1 && ratio > seuil / 2) continue;
        }
        return "skill";
      }
      if (policy[i] === "basic") return "basic";
    }
    return "basic";
  },

  allyById: function (actorId) {
    if (!window.CombatActors || !actorId) return null;
    var list = CombatActors.aliveAllies();
    for (var i = 0; i < list.length; i++) if (list[i].actorId === actorId) return list[i];
    return null;
  },

  /* Alliés réellement soignables : c'est ce que le popup de cible propose. */
  woundedAllies: function () {
    if (!window.CombatActors) return [];
    return CombatActors.aliveAllies().filter(function (a) {
      return Number(a.maxHp || 0) > 0 && Number(a.hp || 0) < Number(a.maxHp || 0);
    });
  },

  /* Qui il soigne en Auto : le plus bas, ou toi d'abord si le réglage le dit et que tu
     es toi-même sous le seuil. */
  autoHealTarget: function (actor) {
    var st = this.state(actor.companionId);
    if (st && st.healPriority === "hero" && window.CombatActors) {
      var hero = CombatActors.heroActor();
      var seuil = getCompanionHealThreshold(st.healThreshold).value;
      if (hero && Number(hero.maxHp || 0) > 0 && (hero.hp / hero.maxHp) < seuil) return hero;
    }
    return this.lowestAlly();
  },

  lowestAlly: function () {
    if (!window.CombatActors) return null;
    var list = CombatActors.aliveAllies();
    if (!list.length) return null;
    var best = list[0];
    for (var i = 1; i < list.length; i++) {
      var a = list[i], b = best;
      if (Number(a.maxHp || 1) <= 0) continue;
      if ((a.hp / a.maxHp) < (b.hp / b.maxHp)) best = a;
    }
    return best;
  },

  /* Joue le tour d'un compagnon. slot forcé (mode Manuel) ou choisi par sa politique.
     Retourne true si une action a été jouée. */
  takeTurn: function (actor, forcedSlot, forcedArg) {
    if (!actor || !actor.companionId) return false;
    if (actor.hp <= 0) return false;
    var def = getCompanionDef(actor.companionId);
    if (!def) return false;

    var slot = forcedSlot || this.chooseAction(actor);

    var sansCharge = this.chargesMax(actor.companionId) > 0 && Number(actor.charges || 0) <= 0;
    if (slot === "skill" && Number(actor.cooldown || 0) <= 0 && !sansCharge && def.skill) {
      if (this.useSkill(actor, def, forcedArg)) return true;
      slot = "basic"; // compétence sans cible utile : on frappe plutôt que de perdre le round
    }

    return this.basicAttack(actor);
  },

  basicAttack: function (actor) {
    if (!window.CombatEngine || !window.CombatActors) return false;
    var target = CombatActors.target();
    if (!target || Number(target.hp || 0) <= 0) return false;

    // Passe par le VRAI dealDamage : affinités, archétypes, bouclier et vulnérabilité
    // s'appliquent au compagnon exactement comme au héros.
    var dmg = Math.max(1, Number(actor.damage || 1));

    /* La menace est attribuée par CombatEngine.noteThreat() — l'allié qui frappe est celui
       que le moteur a posé, héros compris. Rien à compter ici.
       v3.277.0 (retour Seb) : fromTap à true pour que les dégâts du compagnon S'AFFICHENT
       au-dessus de l'ennemi, comme les tiens — ils étaient muets à l'écran. */
    CombatEngine.dealDamage(dmg, false, true, true, target);

    /* v3.268.1 (retour Seb) : l'attaque du compagnon ne laissait AUCUNE trace — les PV
       de l'ennemi tombaient plus vite sans explication. Une ligne de journal, comme
       pour le soin et pour les coups qu'il encaisse. */
    if (typeof addLog === "function") {
      addLog("🗡️ " + (actor.name || "Compagnon") + " frappe " + (target.name || "l'ennemi")
        + " (-" + (typeof formatNumber === "function" ? formatNumber(dmg) : dmg) + ")", "normal");
    }
    return true;
  },

  /* forcedTargetId (mode Manuel) : la cible choisie au popup. Sans elle, l'allié le plus
     bas — c'est-à-dire ce que le mode Auto ferait. */
  useSkill: function (actor, def, forcedTargetId) {
    var skill = def.skill;
    if (!skill) return false;

    if (skill.type === "heal") {
      var t = forcedTargetId ? this.allyById(forcedTargetId) : null;
      if (!t || Number(t.hp || 0) <= 0) t = this.autoHealTarget(actor);
      if (!t || Number(t.maxHp || 0) <= 0) return false;
      if (t.hp >= t.maxHp) return false;
      var healed = Math.max(1, Math.floor(t.maxHp * Number(skill.value || 0)));
      t.hp = Math.min(t.maxHp, t.hp + healed);
      actor.cooldown = Number(skill.cooldown || 0);
      if (typeof actor.charges === "number") actor.charges = Math.max(0, actor.charges - 1);
      if (typeof addLog === "function") {
        addLog("💚 " + def.name + " — " + skill.name + " : +" + (typeof formatNumber === "function" ? formatNumber(healed) : healed) + " PV à " + (t.name || "toi"), "event");
      }
      if (typeof renderHeroHp === "function") renderHeroHp();
      return true;
    }

    return false;
  },

  /* Fin de round : cooldowns des compagnons, une fois par round. */
  onRoundEnd: function () {
    if (!window.CombatActors) return;
    CombatActors.allies().forEach(function (a) {
      if (a && a.companionId && Number(a.cooldown || 0) > 0) a.cooldown -= 1;
    });
  },

  /* Annonce du KO — appelé par le moteur quand un compagnon tombe à 0. */
  noteKo: function (actor) {
    var def = actor && getCompanionDef(actor.companionId);
    if (!def) return;
    if (typeof addLog === "function") {
      addLog("💤 " + (def.lines && def.lines.ko ? def.lines.ko : def.name + " est hors de combat."), "event");
    }
    actor.threat = 0;
  },

  /* ---------- Améliorations ---------- */

  buyUpgrade: function (companionId) {
    var st = this.state(companionId);
    if (!st || !st.unlocked) return false;
    var cost = getCompanionUpgradeCost(companionId, st.upgrades);
    if (cost == null) {
      if (typeof showToast === "function") showToast("Ligne d'améliorations terminée", 1400);
      return false;
    }
    if ((game.gold || 0) < cost) {
      if (typeof showToast === "function") showToast("Pas assez d'or", 1200);
      return false;
    }
    game.gold -= cost;
    st.upgrades += 1;
    // Les PV max montent avec l'amélioration : on offre le gain plutôt que de laisser
    // un compagnon « amélioré » apparaître blessé.
    st.hp = this.maxHpOf(companionId);
    if (typeof saveGame === "function") saveGame();
    if (typeof renderAll === "function") renderAll();
    return true;
  },

  /* ---------- Sauvegarde ---------- */

  /* Forme persistée : rien de dérivable (ni stats, ni PV max, ni acteurs). */
  buildSaveData: function () {
    var all = this.ensure(), out = {};
    Object.keys(all).forEach(function (id) {
      if (!getCompanionDef(id)) return;
      var st = all[id];
      out[id] = {
        unlocked: !!st.unlocked,
        upgrades: Number(st.upgrades || 0),
        control: st.control === "manual" ? "manual" : "auto",
        present: !!st.present,
        hp: (typeof st.hp === "number" && isFinite(st.hp)) ? st.hp : null,
        healThreshold: st.healThreshold,     // v3.271.0 (L-5)
        healPriority: st.healPriority,
        keepReserve: !!st.keepReserve
      };
    });
    return out;
  },

  restore: function (data) {
    game.companions = {};
    if (!data || typeof data !== "object") return;
    var self = this;
    Object.keys(data).forEach(function (id) {
      if (!getCompanionDef(id)) return; // id inconnu (donnée retirée) : ignoré
      var d = data[id] || {};
      var st = self.state(id);
      st.unlocked = !!d.unlocked;
      st.upgrades = Math.max(0, Math.min(getCompanionMaxUpgrades(id), Number(d.upgrades || 0)));
      st.control = d.control === "manual" ? "manual" : "auto";
      st.present = !!d.present;
      st.hp = (typeof d.hp === "number" && isFinite(d.hp)) ? d.hp : null;
      // v3.271.0 (L-5) : réglages relus en passant par setSetting, qui valide.
      if (d.healThreshold) self.setSetting(id, "healThreshold", d.healThreshold);
      if (d.healPriority) self.setSetting(id, "healPriority", d.healPriority);
      self.setSetting(id, "keepReserve", !!d.keepReserve);
    });
  }
};

window.CompanionManager = CompanionManager;
