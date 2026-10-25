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

var VeinSystem = {

  state: null,   // { cuts, heroCuts } le temps d'un combat ; null hors de la Montagne

  /* Règle du monde : seule la Montagne a des veines. Pas dans les donjons (la Faille est ailleurs) :
     la Gueule du volcan branchera ses vagues avec l'acte III (lot M-4, MT11). */
  worldHasVeins: function () {
    if (game.dungeonRun && game.dungeonRun.active) return false;
    var w = (typeof WORLDS !== "undefined" && window.WorldManager) ? WORLDS[WorldManager.worldIndex] : null;
    return !!(w && w.id === "mountain");
  },

  /* Garde de spawnGroup : une veine par combat de la Montagne. */
  onCombatStart: function () {
    this.state = this.worldHasVeins() ? { cuts: 0, heroCuts: 0 } : null;
    if (this.state && typeof addLog === "function") addLog("🪨 " + _t("Une veine affleure entre les pierres. Elle bat."), "event");
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
  bladePerCut: function () { return this.choice() === "soi" ? VEIN_BLADE_PER_CUT_SOI : VEIN_BLADE_PER_CUT; },

  /* Tailler : par le héros (son action du tour), ou par un compagnon (Sarkel, lot M-2 : pas de lame). */
  cut: function (byHero) {
    if (!this.canCut()) return false;
    this.state.cuts += 1;
    if (byHero) this.state.heroCuts += 1;
    if (window.AchievementManager) AchievementManager.bump("veinsCut", 1); // compteur cumulé (objectif de montagne_04, hauts faits)
    if (typeof addLog === "function") {
      addLog("🪨 " + (byHero
        ? _t("Tu tailles la veine : lame +{b} %, chaleur +{h} %.", { b: Math.round(this.bladeMult() * 100 - 100), h: Math.round(this.heatMult() * 100 - 100) })
        : _t("La veine est taillée : chaleur +{h} %.", { h: Math.round(this.heatMult() * 100 - 100) })), "event");
      if (!this.canCut()) addLog("🪨 " + _t("La veine s'éteint. La chaleur reste."), "event");
    }
    return true;
  },

  /* Multiplicateur des dégâts du héros (attaque de base et compétences). */
  bladeMult: function () { return this.state ? 1 + this.state.heroCuts * this.bladePerCut() : 1; },
  /* Multiplicateur des frappes ennemies (les façonnés, tous les ennemis de la Montagne). */
  heatMult: function () { return this.state ? 1 + this.state.cuts * VEIN_HEAT_PER_CUT : 1; },

  /* Garde de killEnemy : le combat est gagné, la Cendre taillée est versée. */
  onVictory: function () {
    var st = this.state;
    this.state = null;
    if (!st || !st.cuts || !window.WarehouseManager) return 0;
    if (game.dungeonRun && game.dungeonRun.active && game.dungeonRun.free) return 0; // RE-5 : rien en mode libre
    var n = st.cuts * VEIN_ASH_PER_CUT + (this.choice() === "aeswyn" ? st.cuts * VEIN_ASH_WELL : 0);
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
