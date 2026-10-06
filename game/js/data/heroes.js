"use strict";
/* data/heroes.js — héros jouables, choix définitif à la création. Détail : COMMENTAIRES_ORIGINAUX.md

   v3.151.0 : portraits Homme/Femme (Seb) — le genre est un SKIN COSMÉTIQUE,
   pas une nouvelle identité de héros (option A validée par Seb : zéro
   risque sur les saves existantes, aucune stat ne dépend du genre).
   `image` (imageM/imageF selon game.heroGender) est exposé comme PROPRIÉTÉ
   CALCULÉE (Object.defineProperty, getter) sur chaque entrée : tous les
   appelants existants qui lisent `hero.image` (ui/heros-view.js,
   ui/hud-view.js, ui/more-view.js, ui/modal-view.js, ui/ui-root.js
   getHeroByGameId/getSelectedHero) continuent de fonctionner SANS
   modification — ils reçoivent simplement la bonne image automatiquement.
   game.heroGender : "m" (défaut) | "f" — voir core/state.js
   (ensureGameStateDefaults) et systems/save-system.js (buildSaveData,
   restoreBaseState, fullResetState) pour la persistance/migration. */

/* makeRpgStats(power, endurance, celerity, precision, will) — ordre positionnel, voir stats-system.js. */
var HEROES_DB = {
  knight: {
    id: "knight",
    name: "Chevalier",
    imageM: "./images/Heroes/knight_m.png",
    imageF: "./images/Heroes/knight_f.png",
    weaponType: "sword",
    stats: makeRpgStats(60, 62, 32, 40, 52)
  },
  ranger: {
    id: "ranger",
    name: "Rôdeur",
    imageM: "./images/Heroes/ranger_m.png",
    imageF: "./images/Heroes/ranger_f.png",
    weaponType: "bow",
    stats: makeRpgStats(46, 44, 70, 60, 40)
  },
  mage: {
    id: "mage",
    name: "Mage",
    imageM: "./images/Heroes/mage_m.png",
    imageF: "./images/Heroes/mage_f.png",
    weaponType: "magic",
    stats: makeRpgStats(62, 40, 40, 42, 76)
  },
  chaosKnight: {
    id: "chaosKnight",
    name: "Chevalier du Chaos",
    imageM: "./images/Heroes/chaosKnight_m.png",
    imageF: "./images/Heroes/chaosKnight_f.png",
    weaponType: "sword",
    stats: makeRpgStats(63, 56, 42, 52, 47)
  },
  chaosRanger: {
    id: "chaosRanger",
    name: "Rôdeur du chaos",
    imageM: "./images/Heroes/chaosRanger_m.png",
    imageF: "./images/Heroes/chaosRanger_f.png",
    weaponType: "bow",
    stats: makeRpgStats(50, 46, 62, 58, 44)
  },
  chaosMage: {
    id: "chaosMage",
    name: "Sorcier du Chaos",
    imageM: "./images/Heroes/chaosMage_m.png",
    imageF: "./images/Heroes/chaosMage_f.png",
    weaponType: "magic",
    stats: makeRpgStats(66, 44, 30, 44, 78)
  }
};

/* Propriété calculée `image` sur chaque entrée : lit game.heroGender à
   chaque accès (pas figée à l'initialisation, donc réagit si le joueur
   change de genre pendant la création AVANT confirmation). Fallback sur
   imageM si game n'existe pas encore (ordre de chargement des scripts) ou
   si heroGender est absent/invalide. */
Object.keys(HEROES_DB).forEach(function (key) {
  var hero = HEROES_DB[key];
  Object.defineProperty(hero, "image", {
    enumerable: true,
    get: function () {
      var gender = (typeof game !== "undefined" && game && game.heroGender === "f") ? "f" : "m";
      return (gender === "f" ? hero.imageF : hero.imageM) || hero.imageM || hero.imageF || "";
    }
  });
});

var HERO_LEVELING = {
  baseXp: 10,
  xpGrowth: 1.35
};
