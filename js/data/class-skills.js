"use strict";
/* ============================================================
Aethervale — data/class-skills.js
v3.33.2 : catalogue de DONNÉES de prototype pour les futurs kits de
compétences par classe (voir data/classes.js pour la correspondance
héros -> classe). Les 2 héros d'une même classe partagent EXACTEMENT
le même kit de 5 actions ; leurs différences restent leurs stats,
équipement, talents, etc. (data/heroes.js).

v3.34.0 : BRANCHÉ au combat réel (voir systems/class-combat-system.js,
l'adaptateur qui relie ces données à game.*). Ce fichier reste une
couche de DONNÉES pure ; toute la logique d'exécution (dépense/gain de
ressource, cooldowns, application des effets) vit dans
class-combat-system.js + combat-resource-system.js/combat-cooldown-
system.js (toujours purs, non modifiés). Les valeurs ci-dessous sont
désormais les valeurs RÉELLES du jeu, plus des coefficients de
prototype — ajuster ici les affecte directement en jeu.

v3.34.1 : les 5 effets restés non branchés en v3.34.0 sont réglés —
2 branchés tels quels, 2 remplacés par un mécanisme existant plus
adapté (les ennemis n'ont AUCUNE stat de défense dans le moteur
actuel), 1 retiré (pas pertinent pour ce jeu) :
  - knight_guard_break.effects[0] : enemyDefenseReduction -> BRANCHÉ,
    remplacé par enemyVulnerability (+20% dégâts subis de TOUS les
    coups pendant 5s, voir CombatEngine.dealDamage()).
  - archer_precise_shot : criticalChanceBonus RETIRÉ (pas retenu).
  - archer_piercing_shot : ignoreDefense -> BRANCHÉ, remplacé par le
    champ ignoreAffinity: true sur l'action elle-même (même mécanisme
    que l'ancienne "Explosion arcanique" du Mage historique).
  - mage_arcane_burn.effects[0] : damageOverTime -> BRANCHÉ tel quel
    (tick réel 1s, voir ClassCombatManager.tickDoT()).
  - mage_arcane_nova : areaOfEffect RETIRÉ (un seul ennemi affiché à
    la fois, pas de vraie zone possible dans ce jeu).
Les 3 effets "defense" (knight_guard, archer_evasion,
mage_arcane_barrier) restent appliqués comme depuis v3.34.0
(réduction/évasion/absorption des dégâts de riposte pendant leur
durée).

v3.52.0 : champ "counters" (tableau d'ids de condition du Grimoire,
voir data/grimoire-conditions.js) ajouté sur 9 actions — 3 par classe,
1 par pattern (Charge/Bouclier/Soin). Décision actée par Seb : le
contre n'agit QUE si l'action est déclenchée par une règle du Grimoire
dont la condition correspond exactement à une entrée de counters
(jamais via un tap manuel ou le repli automatique par défaut, même
avec la même action au même moment) — voir
ClassCombatManager.useSkill()/applyGrimoireCounter(), systems/class-
combat-system.js, pour le mécanisme exact. Effet : annulation TOTALE
du pattern en cours de télégraphe (le bouclier ne se pose pas, le soin
ne rend aucun PV, la charge n'inflige aucun dégât) — pas de
neutralisation partielle. Mapping D'ORIGINE (v3.52.0, remplacé par
celui de v3.60.0 ci-dessous) : Bouclier sur skill3, Soin sur skill3,
Charge sur defense.

v3.60.0 : mapping des counters DÉPLACÉ de skill3 vers skill1 pour
Bouclier et Soin (skill2/defense inchangés) — demande explicite de
Seb en jeu réel : skill3 coûte systématiquement 100 (le max de la
barre), rendant le contre très lent à devenir disponible même une
fois exclu du repli (v3.58.0-v3.59.0) — il faut accumuler la TOTALITÉ
de la ressource avant de pouvoir contrer. skill1 coûte 2 à 3× moins
cher (35-40 selon la classe), disponible bien plus vite après un
combat qui vient de commencer ou une dépense récente. Nouveau mapping
(skill1 et skill2 seulement, PLUS JAMAIS skill3) :
  - Bouclier (shieldIncoming)  : knight_guard_break (skill2, INCHANGÉ)
    / archer_precise_shot (skill1, NOUVEAU — était archer_piercing_shot
    skill3) / mage_arcane_blast (skill1, NOUVEAU — était mage_arcane_
    nova skill3)
  - Soin (healIncoming)        : knight_heavy_strike (skill1, NOUVEAU
    — était knight_execute skill3) / archer_volley (skill2, INCHANGÉ)
    / mage_arcane_burn (skill2, INCHANGÉ)
  - Charge (chargeIncoming)    : INCHANGÉ — les 3 actions "defense"
    (Garde/Esquive/Barrière arcanique), déjà à coût 0-30
Coûts de ressource RÉDUITS DE MOITIÉ sur TOUTES les actions skill1/
skill2/skill3 des 3 classes (pas seulement celles qui contrent) —
demande explicite de Seb : "on meurt très vite [...] avoir un peu
plus de puissance est cohérent [...] l'équilibrage n'est pas une
priorité [tant que le système de contre] ne marche pas". Skill3 passe
systématiquement de 100 à 50 (jamais un contre, mais rendu plus
accessible en jeu normal), skill1/skill2 réduits dans la même
proportion (÷2). Rebalancing volontairement GROSSIER (division par 2
partout, pas de nouveau calibrage fin par batch-sim) — un futur
passage d'équilibrage est prévu une fois le système de contre validé
en jeu réel par Seb, cohérent avec sa décision de prioriser le
fonctionnement avant l'équilibrage précis pour cette itération.

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
v3.46.0 : maxGainPerHit (Chevalier uniquement) — plafonne le gain d'UN
SEUL coup pour le type "damageDealtPercent", voir applyResourceGain(),
combat-resource-system.js, et le commentaire sur resource.generation
du Chevalier ci-dessous pour le contexte complet.
============================================================ */

window.CLASS_SKILLS = {
  knight: {
    classId: "knight",

    // Rage : gagnée en infligeant des dégâts (jamais en recevant).
    // v3.33.15 : 0.10 -> 0.40 (équilibrage, voir NOTE_v3.33.15_rage_chevalier.md).
    // v3.46.0 : maxGainPerHit ajouté (20) — sans lui, un gros tapDamage
    // (bonus d'équipement) crée une boucle de rétroaction avec le kit du
    // Chevalier (aucune des 2 autres classes n'a ce problème, leur
    // ressource est gagnée par montant FIXE, pas proportionnel aux
    // dégâts) : dégâts d'équipement élevés -> Rage pleine en 1-2 coups
    // -> skills quasi ininterrompus -> encore plus de dégâts. Repéré par
    // batch-sim (héros de test légendaire) : le Chevalier survivait
    // 2 à 9× plus longtemps que Rôdeur/Mage selon le monde simulé, un
    // écart totalement absent sans équipement (référence v3.33.17 :
    // Chevalier 62.7 / Rôdeur 60.6 / Mage 65.4, écart < 8 kills).
    // 20 choisi comme valeur légèrement AU-DESSUS du plus gros gain
    // naturel SANS équipement (Exécution, 230% mult, ~12 Rage à stats
    // de base) — donc AUCUN changement de comportement pour un
    // Chevalier sans/peu équipé (le plafond ne s'active quasiment
    // jamais), mais casse la boucle une fois le tapDamage boosté par de
    // l'équipement. Voir applyResourceGain(), combat-resource-system.js.
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
        resourceGain: 0, // gain réel dérivé de resource.generation, pas d'un montant fixe ici
        cooldownMs: 0,
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
        cooldownMs: 1500,
        conditions: {},
        // v3.60.0 : contre du Soin de boss — déplacé depuis
        // knight_execute (skill3), voir en-tête de fichier pour la
        // raison exacte (skill3 coûte toujours 100, trop lent à
        // accumuler même une fois exclu du repli).
        counters: ["healIncoming"],
        // v3.69.0 : effet AJOUTÉ (Phase 9, Corrupteur) — indépendant du
        // mécanisme de contre ci-dessus (counters/applyGrimoireCounterIfApplicable) :
        // si l'ennemi affiché porte l'archétype "corrupted", ce coup
        // purge TOUS les stacks de corruption accumulés, en PLUS de ses
        // dégâts normaux et de son contre existant sur healIncoming. Voir
        // ClassCombatManager.applyActionEffects()/applyEnemyCorruptionPurge().
        // Sans effet (silencieusement ignoré) si l'ennemi n'est pas Corrupteur.
        effects: [
          { type: "enemyCorruptionPurge" }
        ]
      },
      skill2: {
        id: "knight_guard_break",
        slot: "skill2",
        label: "Brise-garde",
        description: "Inflige 110% des dégâts. Coûte 28 Rage. Rend l'ennemi vulnérable (+20% dégâts subis de TOUS les coups) pendant 5 000 ms.",
        type: "damage",
        damageMultiplier: 1.10,
        hits: 1,
        resourceCost: 28,
        resourceGain: 0,
        cooldownMs: 4000,
        conditions: {},
        // v3.52.0 : contre du Bouclier de boss — n'agit QUE via une
        // règle du Grimoire dont la condition est "shieldIncoming",
        // voir en-tête de fichier.
        counters: ["shieldIncoming"],
        effects: [
          {
            // v3.34.1 : remplace enemyDefenseReduction (les ennemis
            // n'ont aucune stat de défense dans le moteur actuel, cet
            // effet n'avait rien à réduire) — vulnérabilité appliquée
            // à TOUS les dégâts encaissés par l'ennemi pendant la
            // durée (tap, auto-DPS, autres skills), voir
            // CombatEngine.dealDamage(), pas seulement ce coup-ci.
            type: "enemyVulnerability",
            value: 0.20,
            durationMs: 5000
          }
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
        cooldownMs: 8000,
        conditions: {
          enemyHpPercentBelowOrEqual: 0.35
        },
        // v3.60.0 : n'est PLUS un contre — déplacé vers knight_heavy_
        // strike (skill1), voir en-tête de fichier. skill3 ne contre
        // plus jamais rien, quelle que soit la classe (demande
        // explicite de Seb).
        // v3.68.0 : effet AJOUTÉ (pas un contre au sens counters/
        // applyGrimoireCounterIfApplicable) — si l'ennemi porte
        // l'archétype "enraged" (Phase 9, data/enemy-archetypes.js),
        // ce coup réduit ET gèle temporairement sa montée en rage, en
        // PLUS de ses dégâts normaux. Voir ClassCombatManager.
        // applyActionEffects() pour l'application réelle, et
        // CombatEngine.getEnragedEffectivePctHpLost() pour comment ce
        // gel est lu au moment de la riposte suivante. Sans effet
        // (silencieusement ignoré) si l'ennemi affiché n'est pas
        // Enragé — reste une simple Exécution normale dans ce cas.
        effects: [
          { type: "enemyRageSuppression" }
        ]
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
        // v3.52.0 : contre de la Charge d'ennemi normal — n'agit QUE
        // via une règle du Grimoire dont la condition est
        // "chargeIncoming", voir en-tête de fichier.
        counters: ["chargeIncoming"],
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
        value: 10,
        criticalBonus: 5
      }
    },

    actions: {
      basic: {
        id: "archer_basic",
        slot: "basic",
        label: "Attaque de base",
        description: "Inflige 85% des dégâts. +10 Concentration sur réussite, +5 supplémentaire sur coup critique.",
        type: "damage",
        damageMultiplier: 0.85,
        hits: 1,
        resourceCost: 0,
        resourceGain: 10, // valeur de base ; +criticalBonus (resource.generation) sur critique
        cooldownMs: 0,
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
        cooldownMs: 2000,
        conditions: {},
        // v3.60.0 : contre du Bouclier de boss — déplacé depuis
        // archer_piercing_shot (skill3), voir en-tête de fichier.
        // v3.34.1 : criticalChanceBonus retiré (pas retenu pour ce
        // jeu, voir NOTE_v3.34.1_effets_non_branches.md) — action
        // purement offensive, sans effet secondaire.
        counters: ["shieldIncoming"],
        // v3.69.0 : effet AJOUTÉ (Phase 9, Corrupteur) — voir la note
        // équivalente sur knight_heavy_strike (skill1 Chevalier).
        effects: [
          { type: "enemyCorruptionPurge" }
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
        cooldownMs: 5000,
        conditions: {},
        // v3.52.0 : contre du Soin de boss — voir en-tête de fichier.
        counters: ["healIncoming"],
        effects: []
      },
      skill3: {
        id: "archer_piercing_shot",
        slot: "skill3",
        label: "Tir perforant",
        description: "Inflige 200% des dégâts. Ignore la résistance/faiblesse d'arme de l'ennemi. Coûte 50 Concentration.",
        type: "damage",
        damageMultiplier: 2.00,
        hits: 1,
        // v3.34.1 : remplace ignoreDefense (les ennemis n'ont aucune
        // stat de défense dans le moteur actuel) — reprend le même
        // mécanisme que l'ancienne "Explosion arcanique" du Mage
        // (dégâts qui ignorent complètement l'affinité d'arme), voir
        // CombatEngine.dealDamage()/getDamageAffinity(). Champ lu
        // directement sur l'action par ClassCombatManager.applyDamageAction(),
        // pas via effects[] (ce n'est pas un effet à durée, il ne
        // s'applique qu'à CE coup).
        ignoreAffinity: true,
        resourceCost: 50,
        resourceGain: 0,
        cooldownMs: 8000,
        conditions: {},
        // v3.60.0 : n'est PLUS un contre — déplacé vers archer_precise_
        // shot (skill1), voir en-tête de fichier.
        // v3.68.0 : effet AJOUTÉ (Phase 9, Enragé) — voir la note
        // équivalente sur knight_execute (skill3 Chevalier) ci-dessus,
        // même principe exact pour les 3 classes.
        effects: [
          { type: "enemyRageSuppression" }
        ]
      },
      defense: {
        id: "archer_evasion",
        slot: "defense",
        label: "Esquive",
        description: "Évite ou réduit fortement la prochaine attaque ennemie pendant 1 000 ms.",
        type: "defense",
        damageMultiplier: null,
        hits: 0,
        resourceCost: 10,
        resourceGain: 0,
        cooldownMs: 8000,
        conditions: {},
        // v3.52.0 : contre de la Charge d'ennemi normal — voir en-tête
        // de fichier.
        counters: ["chargeIncoming"],
        effects: [
          {
            // v3.34.0 : valeur fixée au branchement réel (70%, choix
            // de Seb pour le bac à sable — voir NOTE_v3.33.17).
            type: "evasion",
            value: 0.70,
            durationMs: 1000
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
        description: "Inflige 180% des dégâts. Coûte 18 Mana.",
        type: "damage",
        damageMultiplier: 1.80,
        hits: 1,
        resourceCost: 18,
        resourceGain: 0,
        cooldownMs: 2000,
        conditions: {},
        // v3.60.0 : contre du Bouclier de boss — déplacé depuis
        // mage_arcane_nova (skill3), voir en-tête de fichier.
        counters: ["shieldIncoming"],
        // v3.69.0 : effet AJOUTÉ (Phase 9, Corrupteur) — voir la note
        // équivalente sur knight_heavy_strike (skill1 Chevalier).
        effects: [
          { type: "enemyCorruptionPurge" }
        ]
      },
      skill2: {
        id: "mage_arcane_burn",
        slot: "skill2",
        label: "Brûlure arcanique",
        description: "Inflige 90% des dégâts. Coûte 28 Mana. Applique un effet de dégâts sur la durée (20% des dégâts de ce coup par seconde pendant 5 000 ms).",
        type: "damage",
        damageMultiplier: 0.90,
        hits: 1,
        resourceCost: 28,
        resourceGain: 0,
        cooldownMs: 5000,
        conditions: {},
        // v3.52.0 : contre du Soin de boss — voir en-tête de fichier.
        counters: ["healIncoming"],
        effects: [
          {
            // v3.34.1 : branché — voir ClassCombatManager.applyDoT()/
            // tickDoT() (systems/class-combat-system.js), game.enemyDot.
            // percentPerSecond s'applique au dégât DIRECT de ce coup
            // (avant multiplicateur de vulnérabilité/affinité), pas au
            // damageMultiplier brut de l'action — voir le calcul exact
            // dans applyDoT().
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
        description: "Inflige 240% des dégâts. Coûte 50 Mana — le coup le plus puissant du Mage.",
        type: "damage",
        damageMultiplier: 2.40,
        hits: 1,
        resourceCost: 50,
        resourceGain: 0,
        cooldownMs: 8000,
        conditions: {},
        // v3.60.0 : n'est PLUS un contre — déplacé vers mage_arcane_
        // blast (skill1), voir en-tête de fichier.
        // v3.34.1 : areaOfEffect retiré (pas retenu pour ce jeu — un
        // seul ennemi affiché à la fois, pas de vraie zone possible,
        // voir NOTE_v3.34.1_effets_non_branches.md) — action purement
        // offensive à un coup, sans effet secondaire.
        // v3.68.0 : effet AJOUTÉ (Phase 9, Enragé) — voir la note
        // équivalente sur knight_execute (skill3 Chevalier), même
        // principe exact pour les 3 classes.
        effects: [
          { type: "enemyRageSuppression" }
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
        // v3.52.0 : contre de la Charge d'ennemi normal — voir en-tête
        // de fichier.
        counters: ["chargeIncoming"],
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
