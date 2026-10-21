"use strict";
/* data/class-skills.js — kits de compétences par classe (2 héros/classe partagent le même kit). v3.102.0 (P2) : toutes les
   durées en ROUNDS (cooldownRounds/durationRounds, ex-ms ÷ 2 500 arrondi sup.), Concentration 15/attaque, Mana 8/round. */

window.CLASS_SKILLS = {
  knight: {
    classId: "knight",

    resource: {
      id: "rage",
      label: "Rage",
      max: 100,
      initial: 0,
      generation: {
        type: "damageDealtPercent",
        value: 0.40,
        maxGainPerHit: 20
      }
    },

    actions: {
      basic: {
        id: "knight_basic",
        slot: "basic",
        label: "Attaque de base",
        description: "Inflige 100% des dégâts. Génère de la Rage selon la règle de classe.",
        type: "damage",
        damageMultiplier: 1.00,
        hits: 1,
        resourceCost: 0,
        resourceGain: 0,
        cooldownRounds: 0,
        conditions: {},
        effects: []
      },
      skill1: {
        id: "knight_heavy_strike",
        slot: "skill1",
        label: "Frappe lourde",
        description: "Inflige 165% des dégâts. Coûte 18 Rage.",
        type: "damage",
        damageMultiplier: 1.65,
        hits: 1,
        resourceCost: 18,
        resourceGain: 0,
        cooldownRounds: 1,
        conditions: {},
        counters: ["healIncoming"],
        effects: [
          { type: "enemyCorruptionPurge" },
          { type: "enemyRageSuppression" }
        ]
      },
      skill2: {
        id: "knight_guard_break",
        slot: "skill2",
        label: "Brise-garde",
        description: "Inflige 110% des dégâts. Coûte 28 Rage. Rend l'ennemi vulnérable (+20% dégâts subis de TOUS les coups) pendant 2 rounds.",
        type: "damage",
        damageMultiplier: 1.10,
        hits: 1,
        resourceCost: 28,
        resourceGain: 0,
        cooldownRounds: 2,
        conditions: {},
        counters: ["shieldIncoming"],
        effects: [
          {
            type: "enemyVulnerability",
            value: 0.20,
            durationRounds: 2
          },
          { type: "enemyLifestealSuppression" },
          { type: "enemyArmorSuppression" }
        ]
      },
      skill3: {
        id: "knight_execute",
        slot: "skill3",
        label: "Exécution",
        description: "Inflige 230% des dégâts. Coûte 50 Rage. Utilisable seulement si l'ennemi est à 35% PV ou moins.",
        type: "damage",
        damageMultiplier: 2.30,
        hits: 1,
        resourceCost: 50,
        resourceGain: 0,
        cooldownRounds: 4,
        conditions: {
          enemyHpPercentBelowOrEqual: 0.35
        },
        effects: []
      },
      defense: {
        id: "knight_guard",
        slot: "defense",
        label: "Garde",
        description: "Réduit les dégâts reçus de 50% pendant 1 round.",
        type: "defense",
        damageMultiplier: null,
        hits: 0,
        resourceCost: 0,
        resourceGain: 0,
        cooldownRounds: 3,
        conditions: {},
        counters: ["chargeIncoming", "enemySilenceIncoming", "eliteSurgeIncoming"],
        effects: [
          {
            type: "damageReduction",
            value: 0.50,
            durationRounds: 1
          }
        ]
      }
    }
  },

  archer: {
    classId: "archer",

    resource: {
      id: "focus",
      label: "Concentration",
      max: 100,
      initial: 0,
      generation: {
        type: "successfulBasicAttack",
        value: 15,
        criticalBonus: 4
      }
    },

    actions: {
      basic: {
        id: "archer_basic",
        slot: "basic",
        label: "Attaque de base",
        description: "Inflige 85% des dégâts. +15 Concentration sur réussite, +4 supplémentaire sur coup critique.",
        type: "damage",
        damageMultiplier: 1,
        hits: 1,
        resourceCost: 0,
        resourceGain: 7,
        cooldownRounds: 0,
        conditions: {},
        effects: []
      },
      skill1: {
        id: "archer_precise_shot",
        slot: "skill1",
        label: "Tir précis",
        description: "Inflige 170% des dégâts. Coûte 20 Concentration.",
        type: "damage",
        damageMultiplier: 1.70,
        hits: 1,
        resourceCost: 20,
        resourceGain: 0,
        cooldownRounds: 1,
        conditions: {},
        counters: ["shieldIncoming"],
        effects: [
          { type: "enemyCorruptionPurge" },
          { type: "enemyRageSuppression" }
        ]
      },
      skill2: {
        id: "archer_volley",
        slot: "skill2",
        label: "Rafale",
        description: "3 coups de 60% des dégâts chacun. Coûte 35 Concentration.",
        type: "damage",
        damageMultiplier: 0.60,
        hits: 3,
        resourceCost: 35,
        resourceGain: 0,
        cooldownRounds: 2,
        conditions: {},
        counters: ["healIncoming"],
        effects: [
          { type: "enemyLifestealSuppression" },
          { type: "enemyArmorSuppression" }
        ]
      },
      skill3: {
        id: "archer_piercing_shot",
        slot: "skill3",
        label: "Tir perforant",
        description: "Inflige 200% des dégâts. Ignore la résistance/faiblesse d'arme de l'ennemi. Coûte 50 Concentration.",
        type: "damage",
        damageMultiplier: 2.00,
        hits: 1,
        ignoreAffinity: true,
        resourceCost: 50,
        resourceGain: 0,
        cooldownRounds: 4,
        conditions: {},
        effects: []
      },
      defense: {
        id: "archer_evasion",
        slot: "defense",
        label: "Esquive",
        description: "Évite ou réduit fortement la prochaine attaque ennemie pendant 1 round.",
        type: "defense",
        damageMultiplier: null,
        hits: 0,
        resourceCost: 10,
        resourceGain: 0,
        cooldownRounds: 4,
        conditions: {},
        counters: ["chargeIncoming", "enemySilenceIncoming", "eliteSurgeIncoming"],
        effects: [
          {
            type: "evasion",
            value: 0.70,
            durationRounds: 1
          }
        ]
      }
    }
  },

  mage: {
    classId: "mage",

    resource: {
      id: "mana",
      label: "Mana",
      max: 100,
      initial: 100,
      generation: {
        type: "passiveAndBasicAttack",
        passivePerRound: 8,
        basicAttackGain: 8
      }
    },

    actions: {
      basic: {
        id: "mage_arcane_bolt",
        slot: "basic",
        label: "Trait arcanique",
        description: "Inflige 70% des dégâts. +8 Mana.",
        type: "damage",
        damageMultiplier: 1,
        hits: 1,
        resourceCost: 0,
        resourceGain: 8,
        cooldownRounds: 0,
        conditions: {},
        effects: []
      },
      skill1: {
        id: "mage_arcane_blast",
        slot: "skill1",
        label: "Éclair arcanique",
        description: "Inflige 180% des dégâts. Coûte 18 Mana.",
        type: "damage",
        damageMultiplier: 1.80,
        hits: 1,
        resourceCost: 18,
        resourceGain: 0,
        cooldownRounds: 1,
        conditions: {},
        counters: ["shieldIncoming"],
        effects: [
          { type: "enemyCorruptionPurge" },
          { type: "enemyRageSuppression" }
        ]
      },
      skill2: {
        id: "mage_arcane_burn",
        slot: "skill2",
        label: "Brûlure arcanique",
        description: "Inflige 90% des dégâts. Coûte 28 Mana. Applique un effet de dégâts sur la durée (50% des dégâts de ce coup par round pendant 2 rounds).",
        type: "damage",
        damageMultiplier: 0.90,
        hits: 1,
        resourceCost: 28,
        resourceGain: 0,
        cooldownRounds: 2,
        conditions: {},
        counters: ["healIncoming"],
        effects: [
          {
            type: "damageOverTime",
            percentPerRound: 0.50,
            durationRounds: 2
          },
          { type: "enemyLifestealSuppression" },
          { type: "enemyArmorSuppression" }
        ]
      },
      skill3: {
        id: "mage_arcane_nova",
        slot: "skill3",
        label: "Déflagration",
        description: "Inflige 240% des dégâts. Coûte 50 Mana — le coup le plus puissant du Mage.",
        type: "damage",
        damageMultiplier: 2.40,
        hits: 1,
        resourceCost: 50,
        resourceGain: 0,
        cooldownRounds: 4,
        conditions: {},
        effects: []
      },
      defense: {
        id: "mage_arcane_barrier",
        slot: "defense",
        label: "Barrière arcanique",
        description: "Absorbe 40% des dégâts reçus pendant 2 rounds. Coûte 30 Mana.",
        type: "defense",
        damageMultiplier: null,
        hits: 0,
        resourceCost: 30,
        resourceGain: 0,
        cooldownRounds: 4,
        conditions: {},
        counters: ["chargeIncoming", "enemySilenceIncoming", "eliteSurgeIncoming"],
        effects: [
          {
            type: "damageAbsorption",
            value: 0.40,
            durationRounds: 2
          }
        ]
      }
    }
  }
};

function getClassSkills(classId) {
  if (!classId || typeof classId !== "string") return null;
  var kit = window.CLASS_SKILLS[classId];
  if (!kit) return null;
  // v3.327.0 : les talents de classe réécrivent le kit à la lecture (data/talent-trees.js)
  if (window.TalentManager && typeof TalentManager.modKit === "function") return TalentManager.modKit(classId, kit);
  return kit;
}

function getClassAction(classId, actionSlot) {
  var kit = getClassSkills(classId);
  if (!kit) return null;
  if (!actionSlot || typeof actionSlot !== "string") return null;
  return kit.actions[actionSlot] || null;
}

function getClassResource(classId) {
  var kit = getClassSkills(classId);
  if (!kit) return null;
  return kit.resource || null;
}

/* v3.458.2 (audit C2) : description d'une action telle qu'affichée. Le coût suit le kit (un talent
   peut le baisser) ; l'attaque de base reçoit la règle de gain de la ressource, lue dans le kit. */
function getSkillDescText(classId, action) {
  if (!action) return "";
  var txt = _td(action.description || "");
  var cost = Number(action.resourceCost || 0);
  if (cost > 0) txt = txt.replace(/(Coûte|Costs) \d+/, "$1 " + cost);
  if (action.slot !== "basic") return txt;
  var res = getClassResource(classId), g = res && res.generation, lbl = res ? _td(res.label) : "";
  if (!g) return txt;
  var rule = g.type === "damageDealtPercent" ? _t("Chaque attaque de base rend {x} : {p} % des dégâts infligés, {m} au plus.", { x: lbl, p: Math.round(g.value * 100), m: g.maxGainPerHit })
    : g.type === "successfulBasicAttack" ? _t("Chaque attaque de base qui touche rend {n} {x}, {c} de plus sur un coup critique.", { n: g.value, x: lbl, c: g.criticalBonus })
    : g.type === "passiveAndBasicAttack" ? _t("{x} : +{r} à chaque round, +{n} par attaque de base.", { x: lbl, r: g.passivePerRound, n: g.basicAttackGain }) : "";
  return txt.split(".")[0] + ". " + rule + " " + _t("Les compétences dépensent ce que l'attaque de base a rendu.");
}

window.getClassSkills = getClassSkills;
window.getSkillDescText = getSkillDescText;
window.getClassAction = getClassAction;
window.getClassResource = getClassResource;
