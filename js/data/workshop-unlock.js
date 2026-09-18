"use strict";
/* data/workshop-unlock.js — chaîne de 4 étapes linéaire, tutoriel + gate d'accès à l'Atelier de Construction uniquement.
   v3.213.0 (lot V-1) : la chaîne devient la PORTE D'ENTRÉE DU VILLAGE. Elle enseigne la
   boucle du village — matière brute → matériau travaillé → chantier — et sa dernière
   étape est le premier chantier à durée réelle du jeu. Deux corrections de texte au
   passage : les planches se fabriquent à la Scierie fine (atelier de la Scierie), plus à
   l'Entrepôt comme le disait l'étape 2 depuis l'arrivée des ateliers ; et l'Atelier se
   construit désormais depuis la grille du Village, plus depuis l'Entrepôt.
   Logique : systems/workshop-unlock-system.js. Détail complet : COMMENTAIRES_ORIGINAUX.md */

var WORKSHOP_UNLOCK_STEPS = [
  {
    id: "harvest_wood",
    label: "Récolter 10 Bois",
    narrative: {
      objective: "Le village n'est encore qu'un campement de fortune. Avant toute chose, il faut du bois pour bâtir.",
      completion: "Dix rondins entassés près du feu. Assez pour commencer à façonner quelque chose de durable."
    },
    check: function (game) {
      return Number(game.resources.bois || 0) >= 10;
    },
    progress: function (game) {
      return Math.min(10, Math.floor(game.resources.bois || 0)) + "/10";
    }
  },
  {
    id: "craft_planks",
    label: "Fabriquer 5 Planches",
    narrative: {
      objective: "Le bois brut ne suffit pas : il faut le tailler. Va à la Scierie fine, l'atelier de ta Scierie, pour transformer ton bois en planches.",
      completion: "Les premières planches sont prêtes. Le bruit de la scie a attiré l'attention de quelques curieux du village."
    },
    check: function (game) {
      return Number((game.workshopUnlock || {}).planchesCrafted || 0) >= 5;
    },
    progress: function (game) {
      return Math.min(5, Math.floor((game.workshopUnlock || {}).planchesCrafted || 0)) + "/5";
    }
  },
  {
    id: "harvest_stone",
    label: "Récolter 15 Pierre",
    narrative: {
      objective: "Le bois seul ne fera pas de fondations solides. Il faut aussi de la pierre, extraite de la Carrière.",
      completion: "La pierre s'entasse à côté des planches. Tout ce qu'il faut est enfin réuni."
    },
    check: function (game) {
      return Number(game.resources.pierre || 0) >= 15;
    },
    progress: function (game) {
      return Math.min(15, Math.floor(game.resources.pierre || 0)) + "/15";
    }
  },
  {
    id: "build_workshop",
    label: "Construire l'Atelier de Construction (niveau 1)",
    narrative: {
      objective: "Planches et pierre attendent d'être assemblées. Ouvre le Village et lance le chantier : bâtir prend du temps, mais l'Atelier sera le premier vrai édifice d'Aeswyn.",
      completion: "L'Atelier se dresse enfin. Le village vient de faire son premier vrai pas vers quelque chose de plus grand — et chaque chantier suivant partira d'ici."
    },
    /* v3.213.0 : le niveau est lu sur le socle du village. L'étape se valide
       à la FIN du chantier (VillageBuildingManager._finishSite appelle
       checkCurrentStep), pas à son lancement. */
    check: function (game) {
      return window.VillageBuildingManager && VillageBuildingManager.getLevel("workshop") >= 1;
    },
    progress: function (game) {
      var level = window.VillageBuildingManager ? VillageBuildingManager.getLevel("workshop") : 0;
      return Math.min(1, level) + "/1";
    }
  }
];

window.WORKSHOP_UNLOCK_STEPS = WORKSHOP_UNLOCK_STEPS;
