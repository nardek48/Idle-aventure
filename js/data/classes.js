"use strict";
/* data/classes.js — regroupement héros -> classe (Chevalier/Archer/Mage). Détail complet : COMMENTAIRES_ORIGINAUX.md
   Note : champ combat{} déclaré vide à l'origine (v3.33.2) — vérifier s'il est encore utilisé, class-skills.js a pris ce rôle depuis v3.34.0. */

var CLASSES = [
  {
    id: "knight",
    label: "Chevalier",
    icon: "⚔️",
    weaponType: "sword",
    heroIds: ["knight", "chaosKnight"],
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
    icon: "🏹",
    weaponType: "bow",
    heroIds: ["ranger", "chaosRanger"],
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
    icon: "🔮",
    weaponType: "magic",
    heroIds: ["mage", "chaosMage"],
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

window.CLASSES = CLASSES;
window.getClassById = getClassById;
window.getClassByHeroId = getClassByHeroId;
window.getClassForHero = getClassForHero;
