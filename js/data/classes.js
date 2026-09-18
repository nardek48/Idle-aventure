"use strict";
/* data/classes.js — regroupement héros -> classe (Chevalier/Archer/Mage). Détail complet : COMMENTAIRES_ORIGINAUX.md
   Note : champ combat{} déclaré vide à l'origine (v3.33.2) — vérifier s'il est encore utilisé, class-skills.js a pris ce rôle depuis v3.34.0. */

var CLASSES = [
  {
    id: "knight",
    label: "Chevalier",
    icon: "images/Icons/classes/class_knight.png",
    weaponType: "sword",
    weaponIcons: ["sword", "axe"],
    heroIds: ["knight", "chaosKnight"],
    /* v3.224.0 (D11/D12) : stat principale et coefficient de dégâts, voir MAIN_STAT_RULES ci-dessous. */
    mainStat: "power",
    mainStatTapCoef: 0.14,
    resource: {
      id: "rage",
      label: "Rage",
      max: 100
    },
    combat: {
      basicAttack: null,
      skills: [],
      defense: null,
      autoDefaults: null
    }
  },
  {
    id: "archer",
    label: "Archer",
    icon: "images/Icons/classes/class_ranger.png",
    weaponType: "bow",
    weaponIcons: ["bow"],
    heroIds: ["ranger", "chaosRanger"],
    mainStat: "celerity",
    mainStatTapCoef: 0.09,
    resource: {
      id: "focus",
      label: "Concentration",
      max: 100
    },
    combat: {
      basicAttack: null,
      skills: [],
      defense: null,
      autoDefaults: null
    }
  },
  {
    id: "mage",
    label: "Mage",
    icon: "images/Icons/classes/class_mage.png",
    weaponType: "magic",
    weaponIcons: ["staff"],
    heroIds: ["mage", "chaosMage"],
    mainStat: "will",
    mainStatTapCoef: 0.11,
    resource: {
      id: "mana",
      label: "Mana",
      max: 100
    },
    combat: {
      basicAttack: null,
      skills: [],
      defense: null,
      autoDefaults: null
    }
  }
];

function getClassById(classId) {
  if (!classId || typeof classId !== "string") return null;
  for (var i = 0; i < CLASSES.length; i++) {
    if (CLASSES[i].id === classId) return CLASSES[i];
  }
  return null;
}

function getClassByHeroId(heroId) {
  if (!heroId || typeof heroId !== "string") return null;
  for (var i = 0; i < CLASSES.length; i++) {
    var cls = CLASSES[i];
    for (var j = 0; j < cls.heroIds.length; j++) {
      if (cls.heroIds[j] === heroId) return cls;
    }
  }
  return null;
}

function getClassForHero(hero) {
  if (!hero || typeof hero !== "object") return null;
  return getClassByHeroId(hero.id);
}

/* Icônes d'arme autorisées pour le héros courant (game.heroId). Fallback : toutes les icônes (pas de restriction si classe inconnue). */
function getAllowedWeaponIconsForCurrentHero() {
  var cls = getClassByHeroId(window.game ? game.heroId : null);
  if (!cls || !Array.isArray(cls.weaponIcons) || !cls.weaponIcons.length) {
    return (typeof EQUIPMENT_SLOT_CONFIG !== "undefined" && EQUIPMENT_SLOT_CONFIG.weapon)
      ? EQUIPMENT_SLOT_CONFIG.weapon.icons
      : null;
  }
  return cls.weaponIcons;
}

/* v3.224.0 — STAT PRINCIPALE PAR CLASSE (chantier Équipement multi-affixes, D11-D13).
   Les dégâts de l'attaque de base ne viennent plus de la seule Force :
     tapDamage += Force × FORCE_UNIVERSAL_TAP_COEF + statPrincipale × mainStatTapCoef
   La Force garde un rôle universel (option A, mesurée au banc sim/tree-bench.js :
   l'option B « Force → ressource » ne faisait rien pour le Mage). Les coefficients
   sont iso-dégâts au niveau 0 : Chevalier 60×0,06+60×0,14 = 12,0 (inchangé),
   Rôdeur 46×0,06+70×0,09 = 9,06 (9,2 avant), Mage 62×0,06+76×0,11 = 12,08 (12,4 avant).
   Célérité et Volonté conservent leur rôle universel (jauge, mult. critique). */
var FORCE_UNIVERSAL_TAP_COEF = 0.06;
var DEFAULT_MAIN_STAT_RULE = { stat: "power", coef: 0.14 };

/* Règle { stat, coef } d'une classe ; repli Chevalier si classe absente/inconnue. */
function getClassMainStat(classId) {
  var cls = getClassById(classId);
  if (!cls || typeof cls.mainStat !== "string" || typeof cls.mainStatTapCoef !== "number") {
    return { stat: DEFAULT_MAIN_STAT_RULE.stat, coef: DEFAULT_MAIN_STAT_RULE.coef };
  }
  return { stat: cls.mainStat, coef: cls.mainStatTapCoef };
}

/* Même règle, à partir d'un id de héros (game.heroId). Jamais null. */
function getHeroMainStat(heroId) {
  var cls = getClassByHeroId(heroId);
  return getClassMainStat(cls ? cls.id : null);
}

window.CLASSES = CLASSES;
window.FORCE_UNIVERSAL_TAP_COEF = FORCE_UNIVERSAL_TAP_COEF;
window.getClassMainStat = getClassMainStat;
window.getHeroMainStat = getHeroMainStat;
window.getClassById = getClassById;
window.getClassByHeroId = getClassByHeroId;
window.getClassForHero = getClassForHero;
window.getAllowedWeaponIconsForCurrentHero = getAllowedWeaponIconsForCurrentHero;
