"use strict";
/* ============================================================
Aethervale — data/class-skills.js
v3.33.2 : catalogue de DONNÉES de prototype pour les futurs kits de
compétences par classe (voir data/classes.js pour la correspondance
héros -> classe). Les 2 héros d'une même classe partagent EXACTEMENT
le même kit de 5 actions ; leurs différences restent leurs stats,
équipement, talents, etc. (data/heroes.js).

IMPORTANT — ce fichier ne fait QUE déclarer des données. Rien ici
n'est exécuté ni branché au combat actuel :
  - systems/combat-engine.js n'est pas modifié et ne lit pas ce
    fichier ;
  - aucun cooldown n'est réellement décompté, aucune ressource
    (rage/focus/mana) n'existe dans game.* ;
  - les valeurs (damageMultiplier, resourceCost, cooldownMs...) sont
    des coefficients de PROTOTYPE, à ajuster ici même le jour où une
    vraie implémentation sera décidée.

Structure par action (voir chaque kit ci-dessous) :
  - id                identifiant unique sur TOUT le catalogue
  - slot               "basic" | "skill1" | "skill2" | "skill3" | "defense"
  - label/description   affichage
  - type                "damage" | "defense"
  - damageMultiplier     dégâts = tapDamage effectif × ce multiplicateur
                          (même logique que HERO_SPECIAL_ATTACKS,
                          voir data/heroes.js — PAS réutilisé ici,
                          juste la même convention de calcul)
  - hits                 nombre de coups (Rafale de l'Archer)
  - resourceCost/Gain     coût/gain de ressource de classe à l'usage
  - cooldownMs            temps de recharge prototype (non fonctionnel)
  - conditions            contraintes déclaratives (ex. PV ennemi ≤ X%)
  - effects               effets non implémentés, déclarés en donnée
                           pure (voir chaque champ pour le sens exact)

Champ "generation" de resource : décrit COMMENT la ressource serait
gagnée si le système était câblé (dégâts infligés / attaque de base
réussie+critique / passif+attaque de base) — voir chaque classe.
============================================================ */

window.CLASS_SKILLS = {
  knight: {
    classId: "knight",

    // Rage : gagnée uniquement en infligeant des dégâts, jamais en en
    // recevant. "damageDealtPercent" = fraction du multiplicateur de
    // dégâts de l'action convertie en Rage (donnée non branchée).
    resource: {
      id: "rage",
      label: "Rage",
      max: 100,
      initial: 0,
      generation: {
        type: "damageDealtPercent",
        value: 0.10
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
        resourceGain: 0, // gain réel dérivé de resource.generation, pas d'un montant fixe ici
        cooldownMs: 0,
        conditions: {},
        effects: []
      },
      skill1: {
        id: "knight_heavy_strike",
        slot: "skill1",
        label: "Frappe lourde",
        description: "Inflige 165% des dégâts. Coûte 35 Rage.",
        type: "damage",
        damageMultiplier: 1.65,
        hits: 1,
        resourceCost: 35,
        resourceGain: 0,
        cooldownMs: 1500,
        conditions: {},
        effects: []
      },
      skill2: {
        id: "knight_guard_break",
        slot: "skill2",
        label: "Brise-garde",
        description: "Inflige 110% des dégâts. Coûte 55 Rage. Réduit la défense ennemie de 20% pendant 5 000 ms.",
        type: "damage",
        damageMultiplier: 1.10,
        hits: 1,
        resourceCost: 55,
        resourceGain: 0,
        cooldownMs: 4000,
        conditions: {},
        effects: [
          {
            type: "enemyDefenseReduction",
            value: 0.20,
            durationMs: 5000
          }
        ]
      },
      skill3: {
        id: "knight_execute",
        slot: "skill3",
        label: "Exécution",
        description: "Inflige 230% des dégâts. Coûte 100 Rage. Utilisable seulement si l'ennemi est à 35% PV ou moins.",
        type: "damage",
        damageMultiplier: 2.30,
        hits: 1,
        resourceCost: 100,
        resourceGain: 0,
        cooldownMs: 8000,
        conditions: {
          enemyHpPercentBelowOrEqual: 0.35
        },
        effects: []
      },
      defense: {
        id: "knight_guard",
        slot: "defense",
        label: "Garde",
        description: "Réduit les dégâts reçus de 50% pendant 2 000 ms.",
        type: "defense",
        damageMultiplier: null,
        hits: 0,
        resourceCost: 0,
        resourceGain: 0,
        cooldownMs: 7000,
        conditions: {},
        effects: [
          {
            type: "damageReduction",
            value: 0.50,
            durationMs: 2000
          }
        ]
      }
    }
  },

  archer: {
    classId: "archer",

    // Concentration : gagnée uniquement par attaque de base réussie,
    // bonus sur critique. Aucune perte, aucun raté/changement de
    // cible dans cette première version de données.
    resource: {
      id: "focus",
      label: "Concentration",
      max: 100,
      initial: 0,
      generation: {
        type: "successfulBasicAttack",
        value: 20,
        criticalBonus: 10
      }
    },

    actions: {
      basic: {
        id: "archer_basic",
        slot: "basic",
        label: "Attaque de base",
        description: "Inflige 85% des dégâts. +20 Concentration sur réussite, +10 supplémentaire sur coup critique.",
        type: "damage",
        damageMultiplier: 0.85,
        hits: 1,
        resourceCost: 0,
        resourceGain: 20, // valeur de base ; +criticalBonus (resource.generation) sur critique
        cooldownMs: 0,
        conditions: {},
        effects: []
      },
      skill1: {
        id: "archer_precise_shot",
        slot: "skill1",
        label: "Tir précis",
        description: "Inflige 170% des dégâts. Coûte 40 Concentration.",
        type: "damage",
        damageMultiplier: 1.70,
        hits: 1,
        resourceCost: 40,
        resourceGain: 0,
        cooldownMs: 2000,
        conditions: {},
        effects: [
          {
            // Bonus de critique déclaré en donnée, pas encore appliqué :
            // valeur ajoutée à la chance de critique le temps du coup.
            type: "criticalChanceBonus",
            value: 0.15
          }
        ]
      },
      skill2: {
        id: "archer_volley",
        slot: "skill2",
        label: "Rafale",
        description: "3 coups de 60% des dégâts chacun. Coûte 70 Concentration.",
        type: "damage",
        damageMultiplier: 0.60,
        hits: 3,
        resourceCost: 70,
        resourceGain: 0,
        cooldownMs: 5000,
        conditions: {},
        effects: []
      },
      skill3: {
        id: "archer_piercing_shot",
        slot: "skill3",
        label: "Tir perforant",
        description: "Inflige 200% des dégâts. Coûte 100 Concentration.",
        type: "damage",
        damageMultiplier: 2.00,
        hits: 1,
        resourceCost: 100,
        resourceGain: 0,
        cooldownMs: 8000,
        conditions: {},
        effects: [
          {
            // Réservé pour un futur ignore-défense — pas appliqué.
            type: "ignoreDefense",
            value: null
          }
        ]
      },
      defense: {
        id: "archer_evasion",
        slot: "defense",
        label: "Esquive",
        description: "Évite ou réduit fortement la prochaine attaque ennemie pendant 2 000 ms.",
        type: "defense",
        damageMultiplier: null,
        hits: 0,
        resourceCost: 0,
        resourceGain: 0,
        cooldownMs: 8000,
        conditions: {},
        effects: [
          {
            type: "evasion",
            value: null, // taux d'évitement/réduction non fixé, réservé
            durationMs: 2000
          }
        ]
      }
    }
  },

  mage: {
    classId: "mage",

    // Mana : commence à 100 (plein) et non 0, contrairement aux 2
    // autres ressources. Régénération passive déclarée en donnée
    // (non branchée dans main/game-loop.js), + petit gain sur
    // attaque de base.
    resource: {
      id: "mana",
      label: "Mana",
      max: 100,
      initial: 100,
      generation: {
        type: "passiveAndBasicAttack",
        passivePerSecond: 4,
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
        damageMultiplier: 0.70,
        hits: 1,
        resourceCost: 0,
        resourceGain: 8,
        cooldownMs: 0,
        conditions: {},
        effects: []
      },
      skill1: {
        id: "mage_arcane_blast",
        slot: "skill1",
        label: "Éclair arcanique",
        description: "Inflige 180% des dégâts. Coûte 35 Mana.",
        type: "damage",
        damageMultiplier: 1.80,
        hits: 1,
        resourceCost: 35,
        resourceGain: 0,
        cooldownMs: 2000,
        conditions: {},
        effects: []
      },
      skill2: {
        id: "mage_arcane_burn",
        slot: "skill2",
        label: "Brûlure arcanique",
        description: "Inflige 90% des dégâts. Coûte 55 Mana. Réserve un effet de dégâts sur la durée (20% des dégâts par seconde pendant 5 000 ms).",
        type: "damage",
        damageMultiplier: 0.90,
        hits: 1,
        resourceCost: 55,
        resourceGain: 0,
        cooldownMs: 5000,
        conditions: {},
        effects: [
          {
            type: "damageOverTime",
            percentPerSecond: 0.20,
            durationMs: 5000
          }
        ]
      },
      skill3: {
        id: "mage_arcane_nova",
        slot: "skill3",
        label: "Déflagration",
        description: "Inflige 240% des dégâts. Coûte 100 Mana. Réserve un champ pour de futurs dégâts de zone.",
        type: "damage",
        damageMultiplier: 2.40,
        hits: 1,
        resourceCost: 100,
        resourceGain: 0,
        cooldownMs: 8000,
        conditions: {},
        effects: [
          {
            // Réservé pour de futurs dégâts de zone — pas appliqué.
            type: "areaOfEffect",
            value: null
          }
        ]
      },
      defense: {
        id: "mage_arcane_barrier",
        slot: "defense",
        label: "Barrière arcanique",
        description: "Absorbe 40% des dégâts reçus pendant 3 000 ms. Coûte 30 Mana.",
        type: "defense",
        damageMultiplier: null,
        hits: 0,
        resourceCost: 30,
        resourceGain: 0,
        cooldownMs: 8000,
        conditions: {},
        effects: [
          {
            type: "damageAbsorption",
            value: 0.40,
            durationMs: 3000
          }
        ]
      }
    }
  }
};

/* getClassSkills(classId) — renvoie le kit complet {classId, resource,
   actions} d'une classe, ou null si classId est absent/invalide/
   inconnu. Ne modifie jamais CLASS_SKILLS. */
function getClassSkills(classId) {
  if (!classId || typeof classId !== "string") return null;
  var kit = window.CLASS_SKILLS[classId];
  return kit || null;
}

/* getClassAction(classId, actionSlot) — renvoie une action précise
   (ex. "skill1") d'une classe, ou null proprement si classId ou
   actionSlot est absent/invalide/inconnu. */
function getClassAction(classId, actionSlot) {
  var kit = getClassSkills(classId);
  if (!kit) return null;
  if (!actionSlot || typeof actionSlot !== "string") return null;
  return kit.actions[actionSlot] || null;
}

/* getClassResource(classId) — renvoie la description de ressource
   (id/label/max/initial/generation) d'une classe, ou null si classId
   est absent/invalide/inconnu. */
function getClassResource(classId) {
  var kit = getClassSkills(classId);
  if (!kit) return null;
  return kit.resource || null;
}

window.getClassSkills = getClassSkills;
window.getClassAction = getClassAction;
window.getClassResource = getClassResource;
