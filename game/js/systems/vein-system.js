"use strict";
/* systems/vein-system.js — v3.487.0 (Montagne, lot M-1) : LES VEINES.
   Conception Montagne v1.0, MT2 (validé par Seb le 25/10/2026 après l'atelier veines.html).

   LA RÈGLE :
     - dans chaque combat de la Montagne, une veine affleure ; ce n'est pas un ennemi, ton camp ne la vise jamais ;
     - TAILLER remplace le coup du héros : +1 Cendre vive au butin du combat, la lame du héros +15 %
       pour le reste du combat (+20 % avec le choix `veine` = « soi », acte I étape 5), et +1 cran de chaleur ;
     - chaque cran de chaleur rend les façonnés 10 % plus forts jusqu'à la fin du combat ;
     - trois tailles au plus ; la laisser, c'est un combat normal ;
     - la Cendre se verse à la victoire (perdue sur défaite ou fuite) ; « Le puits chaud » (choix `veine` =
       « aeswyn ») en verse une de plus par taille ; rien en mode libre du donjon (RE-5, comme la Cire).
   Branchement : lignes de garde dans combat-engine.js (accord de Seb du 25/10/2026), comme les dormeurs.
   Rien n'est sauvegardé : tout vit le temps du combat (`state`). Le compteur des tailles passe par les Hauts faits. */

var VEIN_CUTS_MAX = 3;           // atelier : trois tailles au plus
var VEIN_BLADE_PER_CUT = 0.15;   // lame +15 % par taille du héros (MT2, §3.2.1)
var VEIN_BLADE_PER_CUT_SOI = 0.20; // choix `veine` = « soi » (La veine dans la lame), au banc
var VEIN_HEAT_PER_CUT = 0.10;    // chaleur : +10 % de puissance des façonnés par cran (retour d'atelier)
var VEIN_ASH_PER_CUT = 1;        // Cendre vive par taille
var VEIN_ASH_WELL = 1;           // choix `veine` = « aeswyn » (Le puits chaud) : une de plus par taille, au banc
var VEIN_SORT_MULT = 1.5;        // v3.489.0 (acte II, montagne_08) : le tri du Démon mineur, +50 % sur celui qui a taillé (au banc)
var VEIN_SORT_STEP = "montagne_08"; // le tri s'apprend à cette étape (tutoriel)
var VEIN_DIVE_ALL_MULT = 0.8;
var VEIN_DROIT_HEAT_BLADE = 0.05; // v3.491.0 (acte IV, choix « droit » = laisser) : chaque cran de chaleur porte aussi le héros, à la Montagne    // v3.490.0 (acte III) : le Wyrm ressort de la lave, chaque allié frappé à ×0,8 (au banc)

var VeinSystem = {

  state: null,   // { cuts, heroCuts, heat } le temps d'un combat ; null hors de la Montagne

  /* Règle du monde : seule la Montagne a des veines. Au donjon, seule la Gueule du volcan (v3.490.0, MT11). */
  inMaw: function () {
    var run = game.dungeonRun;
    if (!run || !run.active || !window.DungeonManager) return false;
    var d = DungeonManager.getById(run.dungeonId);
    return !!(d && d.worldId === "mountain");
  },
  worldHasVeins: function () {
    if (game.dungeonRun && game.dungeonRun.active) return this.inMaw();
    var w = (typeof WORLDS !== "undefined" && window.WorldManager) ? WORLDS[WorldManager.worldIndex] : null;
    return !!(w && w.id === "mountain");
  },
  /* v3.490.0 : choix « ouvrage » (montagne_14) = donner : la Gueule plus chaude et plus riche. */
  mawFinished: function () {
    return this.inMaw() && !!(window.StoryQuestManager && StoryQuestManager.getChoice("ouvrage") === "donner");
  },

  /* Garde de spawnGroup : une veine par combat de la Montagne (par vague dans la Gueule). */
  onCombatStart: function () {
    if (this.state && this.state.cuts && this._mem("rien_ne_se_perd")) this.payout(this.state); // v3.491.0 : Mémoire 20, combat perdu ou fui
    this.state = this.worldHasVeins() ? { cuts: 0, heroCuts: 0, heat: 0 } : null;
    if (this.state && typeof addLog === "function") addLog("🪨 " + _t("Une veine affleure entre les pierres. Elle bat."), "event");
    if (this.state && this.mawFinished()) {
      this.state.heat = 1;
      if (typeof addLog === "function") addLog("🔥 " + _t("L'ouvrage achevé chauffe la Gueule : un cran de chaleur dès le départ."), "event");
    }
    return !!this.state;
  },

  active: function () { return !!this.state; },
  cuts: function () { return this.state ? this.state.cuts : 0; },
  cutsLeft: function () { return this.state ? Math.max(0, VEIN_CUTS_MAX - this.state.cuts) : 0; },
  canCut: function () { return this.cutsLeft() > 0; },
  /* « Veine intacte » (Grimoire) : présente et jamais taillée. */
  intact: function () { return !!this.state && this.state.cuts === 0; },

  choice: function () {
    return (window.StoryQuestManager && typeof StoryQuestManager.getChoice === "function") ? StoryQuestManager.getChoice("veine") : null;
  },
  bladePerCut: function () {
    return (this.choice() === "soi" ? VEIN_BLADE_PER_CUT_SOI : VEIN_BLADE_PER_CUT) + (this._mem("lame_vive") ? Number(this._memV("lame_vive_blade", 0.05)) : 0); // v3.491.0 : Lame vive
  },
  /* v3.491.0 : choix « droit » (montagne_20) = laisser — la Montagne apprend de toi. */
  mountainLearns: function () { return !!(window.StoryQuestManager && StoryQuestManager.getChoice("droit") === "laisser"); },

  /* Tailler : par le héros (son action du tour), ou par un compagnon (Sarkel, lot M-2 : pas de lame).
     v3.489.0 : on retient qui a taillé en dernier (le tri du Démon mineur) ; companionId pour un compagnon. */
  cut: function (byHero, companionId) {
    if (!this.canCut()) return false;
    this.state.cuts += 1;
    if (byHero) this.state.heroCuts += 1;
    this.state.lastCutter = byHero ? "hero" : (companionId || "sarkel");
    if (!byHero && this._mem("pioche_sure")) this.state.bonusAsh = Number(this.state.bonusAsh || 0) + Number(this._memV("pioche_sure_ash", 1)); // v3.489.0 : Mémoire 19
    if (window.AchievementManager) AchievementManager.bump("veinsCut", 1); // compteur cumulé (objectif de montagne_04, hauts faits)
    this.growShells();
    if (typeof addLog === "function") {
      addLog("🪨 " + (byHero
        ? _t("Tu tailles la veine : lame +{b} %, chaleur +{h} %.", { b: Math.round(this.bladeMult() * 100 - 100), h: Math.round(this.heatMult() * 100 - 100) })
        : _t("La veine est taillée : chaleur +{h} %.", { h: Math.round(this.heatMult() * 100 - 100) })), "event");
      if (!this.canCut()) addLog("🪨 " + _t("La veine s'éteint. La chaleur reste."), "event");
    }
    return true;
  },

  _mem: function (id) { return !!(window.MemoryManager && MemoryManager.has(id)); },
  _memV: function (k, d) { return (window.MemoryManager && typeof MemoryManager.V === "function") ? MemoryManager.V(k) : d; },
  /* Multiplicateur des dégâts du héros (attaque de base et compétences). Taille franche (Mémoire 17) : +10 % à la première. */
  bladeMult: function () {
    if (!this.state) return 1;
    return 1 + this.state.heroCuts * this.bladePerCut() + (this.state.heroCuts > 0 && this._mem("taille_franche") ? Number(this._memV("taille_franche_blade", 0.10)) : 0)
      + (this.mountainLearns() ? this.heatLevel() * VEIN_DROIT_HEAT_BLADE : 0);
  },
  /* Multiplicateur des frappes ennemies (les façonnés, tous les ennemis de la Montagne). Peau de basalte (Mémoire 17) : +7 %. */
  heatMult: function () {
    if (!this.state) return 1;
    var cran = (this._mem("peau_basalte") ? Number(this._memV("peau_basalte_heat", 0.07)) : VEIN_HEAT_PER_CUT)
      * ((typeof uniquePowerMult === "function") ? uniquePowerMult("dun_braise") : 1); // v3.490.0 : Heaume du Wyrm
    return 1 + this.heatLevel() * cran;
  },
  /* Crans de chaleur du combat : tailles et crans ajoutés (Wyrm, ouvrage achevé). Le froid de la pierre (Mémoire 20) : le premier ne compte pas. */
  heatLevel: function () {
    if (!this.state) return 0;
    var n = this.state.cuts + Number(this.state.heat || 0);
    return this._mem("froid_pierre") ? Math.max(0, n - 1) : n;
  },
  addHeat: function (n) {
    if (!this.state) return; // pas de veine, pas de chaleur
    this.state.heat = Number(this.state.heat || 0) + n;
  },

  /* v3.489.0 (Montagne, acte II) — LE TRI. Un ennemi qui porte `sorts` (le Démon mineur) annonce le tri
     s'il y a eu une taille, puis, à son tour suivant, frappe celui qui a taillé en dernier, +50 %.
     Garde de enemyTurn ; takeSort est lu par enemyStrike (victime et multiplicateur), une seule fois. */
  sorterDef: function (e) {
    if (e && e.isElite && window.ELITE_DB && ELITE_DB[e.id]) return ELITE_DB[e.id]; // v3.490.0 : l'Ifrit qui trie
    return (e && window.ENEMY_DB && ENEMY_DB[e.id]) || null;
  },
  sortTarget: function () {
    var who = this.state && this.state.lastCutter;
    if (!who || !window.CombatActors) return null;
    var list = CombatActors.aliveAllies();
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      if (who === "hero" ? CombatActors.isHero(a) : a.companionId === who) return a;
    }
    return null;
  },
  /* Garde de enemyTurn : true si l'ennemi ne joue pas son tour ordinaire (le Wyrm qui ressort). */
  onEnemyTurn: function (e) {
    if (!e || Number(e.hp || 0) <= 0) return false;
    if (this.tickBurns(e)) return true;
    if (e.diving) return this.surface(e);
    this.sortTurn(e);
    return false;
  },
  sortTurn: function (e) {
    var def = this.sorterDef(e);
    if (!((def && def.sorts) || (e && e.sorts)) || !this.state || !e || Number(e.hp || 0) <= 0 || e.downed) return; // v3.491.0 : e.sorts, le Dragon ancien
    if (!window.StoryQuestManager || !StoryQuestManager.isStepReached(VEIN_SORT_STEP)) return;
    var t = this.sortTarget();
    if (!t) { e.sortArmed = false; return; }
    if (!e.sortArmed) {
      e.sortArmed = true;
      if (typeof addLog === "function") addLog("👁️ " + _t("{x} regarde les mains de {y}.", { x: _td(e.name), y: CombatActors.isHero(t) ? _t("toi") : _td(t.name || "") }), "event");
      return;
    }
    e.sortArmed = false;
    e._sortNow = true; // la frappe de ce tour vise celui qui a taillé
    if (typeof addLog === "function") addLog("👁️ " + _t("{x} trie : il frappe celui qui a pris.", { x: _td(e.name) }), "event");
  },
  takeSort: function (e) {
    if (e && e._forceHero && window.CombatActors) { e._forceHero = false; return { actor: CombatActors.heroActor(), mult: 1 }; }
    if (!e || !e._sortNow) return null;
    e._sortNow = false;
    var t = this.sortTarget();
    if (t) this.ignite(e, t);
    var lure = window.CombatItems && CombatItems.holds("sorting"); // v3.492.15 : Leurre de cendre
    return t ? { actor: t, mult: lure ? COMBAT_ITEM_LURE_SORT_MULT : VEIN_SORT_MULT } : null;
  },

  /* v3.490.0 (Montagne, acte III) — LA GUEULE DU VOLCAN (MT11). Tout vit sur l'ennemi, le temps du combat. */
  eliteDef: function (e) { return (e && e.isElite && window.ELITE_DB && ELITE_DB[e.id]) || null; },
  /* Le Golem-forge : chaque taille lui ajoute une carapace (part de ses PV max), mangée avant ses PV. */
  growShells: function () {
    if (!window.CombatActors) return;
    var self = this;
    CombatActors.aliveEnemies().forEach(function (e) {
      var def = self.eliteDef(e);
      if (!def || !def.forgeShell) return;
      var pct = (window.CombatItems && CombatItems.holds("shell")) ? Math.min(Number(def.forgeShell), COMBAT_ITEM_WEDGE_SHELL_PCT) : Number(def.forgeShell); // v3.492.15 : Coin d'obsidienne
      var n = Math.max(1, Math.floor(Number(e.maxHp || 0) * pct));
      e.shell = Number(e.shell || 0) + n;
      if (typeof addLog === "function") addLog("🪨 " + _t("{x} se couvre d'une carapace de Cendre (+{n}).", { x: _td(e.name), n: formatNumber(n) }), "event");
    });
  },
  /* Lu par dealDamage, avant les PV : renvoie les dégâts qui passent la carapace. */
  absorb: function (foe, dmg) {
    if (!foe || !(Number(foe.shell || 0) > 0) || !(dmg > 0)) return dmg;
    var pris = Math.min(Number(foe.shell), dmg);
    foe.shell = Number(foe.shell) - pris;
    if (foe.shell <= 0 && typeof addLog === "function") addLog("🪨 " + _t("La carapace de {x} éclate.", { x: _td(foe.name) }), "event");
    return dmg - pris;
  },
  /* L'Ifrit qui trie : celui qu'il frappe en triant brûle (def.burns : rounds, part des PV max par round). */
  ignite: function (e, actor) {
    var def = this.eliteDef(e);
    if (!def || !def.burns || !actor) return;
    e.burns = (e.burns || []).filter(function (b) { return b.actor !== actor; });
    e.burns.push({ actor: actor, rounds: Number(def.burns.rounds || 2), pct: Number(def.burns.pct || 0.03) });
    if (typeof addLog === "function") addLog("🔥 " + (window.CombatActors && CombatActors.isHero(actor) ? _t("Tu prends feu.") : _t("{x} prend feu.", { x: _td(actor.name || "") })), "event");
  },
  /* Au tour de l'Ifrit : chaque brûlure mord, puis s'use. true si le héros tombe (le tour s'arrête). */
  tickBurns: function (e) {
    if (!e || !Array.isArray(e.burns) || !e.burns.length || !window.CombatActors) return false;
    var heroDown = false;
    e.burns.forEach(function (b) {
      var a = b.actor, hero = CombatActors.isHero(a);
      var max = hero ? Number(game.heroMaxHp || 0) : Number(a.maxHp || 0);
      var n = Math.max(1, Math.floor(max * b.pct));
      b.rounds -= 1;
      if (hero) {
        if ((game.heroHp || 0) <= 0) return;
        game.heroHp = Math.max(0, Number(game.heroHp || 0) - n);
        if (typeof addLog === "function") addLog("🔥 " + _t("Tu brûles (-{n} PV).", { n: formatNumber(n) }), "event");
        if (typeof renderHeroHp === "function") renderHeroHp();
        if (game.heroHp <= 0) heroDown = true;
      } else if (Number(a.hp || 0) > 0) {
        a.hp = Math.max(0, Number(a.hp || 0) - n);
        if (typeof addLog === "function") addLog("🔥 " + _t("{x} brûle (-{n} PV).", { x: _td(a.name || ""), n: formatNumber(n) }), "event");
        if (a.hp <= 0 && window.CompanionManager) CompanionManager.noteKo(a);
      }
    });
    e.burns = e.burns.filter(function (b) { return b.rounds > 0; });
    if (heroDown && window.CombatEngine) { CombatEngine.onHeroDefeated(); return true; }
    return false;
  },
  heroBurnRounds: function () {
    if (!window.CombatActors) return 0;
    var hero = CombatActors.heroActor(), n = 0;
    CombatActors.aliveEnemies().forEach(function (e) {
      (e.burns || []).forEach(function (b) { if (b.actor === hero) n = Math.max(n, b.rounds); });
    });
    return n;
  },
  /* Phases du Wyrm de cendres, appelées par BossMomentManager.onPhase : chaleur d'un coup, puis plongée. */
  onBossPhase: function (e, ph) {
    if (!e || !ph) return;
    if (ph.heat) {
      this.addHeat(Number(ph.heat));
      if (typeof addLog === "function") addLog("🔥 " + _t("La chaleur monte de {n} crans.", { n: Number(ph.heat) }), "event");
    }
    if (ph.dive) e.diving = true; // sous la lave jusqu'à son prochain tour : on ne le touche pas
    if (ph.sorts) e.sorts = true; // v3.491.0 : le Dragon ancien trie
  },
  /* Lu par dealDamage : sous la lave, aucun coup ne porte. */
  blocksHit: function (foe) { return !!(foe && foe.diving && Number(foe.hp || 0) > 0); },
  /* Il ressort : il frappe chaque allié vivant (×0,8, chaleur comprise), puis son tour s'arrête. */
  surface: function (e) {
    e.diving = false;
    if (typeof addLog === "function") addLog("🌋 " + _t("{x} jaillit de la lave et frappe tout le groupe !", { x: _td(e.name) }), "event");
    if (!window.CombatEngine || !window.CombatActors) return true;
    var mult = VEIN_DIVE_ALL_MULT;
    CombatActors.aliveAllies().forEach(function (a) {
      if (!CombatActors.isHero(a) && Number(a.hp || 0) > 0) CombatEngine.enemyStrikeCompanion(e, a, mult * VeinSystem.heatMult(), true);
    });
    if ((game.heroHp || 0) > 0) { e._forceHero = true; CombatEngine.enemyStrike(mult, true); e._forceHero = false; }
    return true;
  },

  /* Garde de killEnemy : le combat est gagné, la Cendre taillée est versée. v3.491.0 : enemy, le dernier tombé
     (Mémoire 20, « Ce qui a été pris » : boss ou élite de la Montagne vaincu après une taille, +25 % d'or). */
  onVictory: function (enemy) {
    var st = this.state;
    this.state = null;
    if (st && !st.cuts && window.AchievementManager) { // v3.492.0 : hauts faits de la Montagne
      AchievementManager.bump("veinsLeft", 1);
      if (enemy && enemy.isBoss && enemy.id === "ancientdragon" && game.adventureQuestRun && game.adventureQuestRun.active) AchievementManager.flag("dragonNoCut");
    }
    if (st && st.cuts && enemy && (enemy.isBoss || enemy.isElite) && this._mem("ce_qui_a_ete_pris") && window.CombatEngine) {
      var bonus = Math.floor(Number(enemy.goldReward || 0) * Number(this._memV("ce_qui_a_ete_pris_gold", 0.25)));
      if (bonus > 0) { CombatEngine.grantGold(bonus); if (typeof addLog === "function") addLog("🪨 " + _t("Ce qui a été pris : +{n} or.", { n: formatNumber(bonus) }), "event"); }
    }
    return this.payout(st);
  },
  /* La Cendre taillée d'un combat, versée à l'Entrepôt. */
  payout: function (st) {
    if (!st || !st.cuts || !window.WarehouseManager) return 0;
    if (game.dungeonRun && game.dungeonRun.active && game.dungeonRun.free) return 0; // RE-5 : rien en mode libre
    var n = st.cuts * VEIN_ASH_PER_CUT + (this.choice() === "aeswyn" ? st.cuts * VEIN_ASH_WELL : 0) + Number(st.bonusAsh || 0)
      + (this.mawFinished() ? st.cuts : 0); // v3.490.0 : l'ouvrage achevé, une Cendre de plus par taille dans la Gueule
    WarehouseManager.addResource("cendre_vive", n, true);
    if (typeof addLog === "function") addLog("🪨 " + _t("Cendre vive : +{n} (veine taillée).", { n: n }), "event");
    return n;
  }
};

/* L'action « Tailler » du Grimoire et de la barre de combat : pas une compétence de classe, une
   pseudo-action lue par getGrimoireActionDef (Grimoire) et ClassCombatManager.getAction("vein"). */
var VEIN_ACTION = {
  id: "vein_cut", slot: "vein", type: "vein", resourceCost: 0,
  label: _t("Tailler"), // traduit au chargement (la langue ne change qu'au relancement)
  description: _t("Tu tailles la veine au lieu de frapper : +1 Cendre vive, ta lame +15 %, et un cran de chaleur pour les façonnés.")
};
function getGrimoireActionDef(kit, slot) {
  if (slot === "vein") return VEIN_ACTION;
  return (kit && kit.actions && slot) ? (kit.actions[slot] || null) : null;
}

window.VeinSystem = VeinSystem;
window.VEIN_ACTION = VEIN_ACTION;
window.getGrimoireActionDef = getGrimoireActionDef;
