"use strict";
/* ============================================================
Aethervale — data/classes.js
v3.33.2 : couche de données "classes", introduite pour REGROUPER les 6
héros existants (data/heroes.js) sans toucher à leur comportement. Ne
fait QUE déclarer des données — aucune classe n'est encore consommée
par le combat, les stats ou l'UI.

Chaque héros garde ses propres stats/weaponType/attaque spéciale
(voir data/heroes.js) ; cette table ajoute juste une correspondance
héros -> classe, utile pour de futures mécaniques partagées par
classe (jauge de ressource, compétences communes...).

Champs par classe :
  - id/label/icon       identité affichage
  - weaponType           doit correspondre au weaponType des héros
                          membres (voir data/heroes.js)
  - heroIds               IDs réels de data/heroes.js, PAS inventés
  - resource               jauge dédiée à la classe (déclarée mais pas
                            encore utilisée en jeu — voir game.* pour
                            un futur câblage)
  - combat                 réservé aux futures mécaniques communes de
                            classe (attaque de base, compétences,
                            défense, comportements auto). Vide pour
                            cette première livraison : le combat
                            actuel (combat-engine.js, stats-system.js,
                            special-attack-system.js) n'est PAS
                            modifié et continue de fonctionner par
                            héros, pas par classe.
============================================================ */

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

/* getClassById(classId) — renvoie l'objet classe ou null si absent/
   introuvable. N'accepte que des chaînes valides. */
function getClassById(classId) {
  if (!classId || typeof classId !== "string") return null;
  for (var i = 0; i < CLASSES.length; i++) {
    if (CLASSES[i].id === classId) return CLASSES[i];
  }
  return null;
}

/* getClassByHeroId(heroId) — résout la classe à partir d'un ID héros
   (chaîne). Renvoie null proprement si l'ID est absent, invalide, ou
   ne correspond à aucun héros répertorié dans une classe. Ne modifie
   jamais data/heroes.js ni l'objet héros. */
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

/* getClassForHero(hero) — même résolution que getClassByHeroId(), mais
   à partir d'un objet héros (typiquement un objet de HEROES_DB). Ne
   lit que hero.id, ne modifie jamais l'objet reçu. Renvoie null si
   hero est absent, invalide, ou sans id exploitable. */
function getClassForHero(hero) {
  if (!hero || typeof hero !== "object") return null;
  return getClassByHeroId(hero.id);
}

window.CLASSES = CLASSES;
window.getClassById = getClassById;
window.getClassByHeroId = getClassByHeroId;
window.getClassForHero = getClassForHero;
