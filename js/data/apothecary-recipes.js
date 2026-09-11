"use strict";
/* data/apothecary-recipes.js — v3.215.0 (lot V-4) : préparations de l'Apothicaire.

   PRINCIPE (règle de fusion du rapport du 11/09/2026) : le bâtiment n'enlève
   jamais rien. L'achat en or des potions reste disponible tel quel dans la
   Boutique ; l'Apothicaire AJOUTE une seconde voie, payée en ressources. Le
   joueur qui ne construit rien ne perd rien ; celui qui construit transforme sa
   production en consommables au lieu de vendre puis racheter.

   ORDRE DES RECETTES = ordre de déblocage. Le niveau N de l'Apothicaire ouvre
   les N premières. Les soins viennent en premier : c'est la condition centrale
   du Grimoire, donc la voie la plus utile tôt.

   Toutes les recettes partent de l'Eau purifiée (Station de purification, atelier
   du Puits), ce qui donne au Puits le débouché qui lui manquait.

   La fabrication est INSTANTANÉE, contrairement aux ateliers de Production :
   le seul minuteur du village est celui des chantiers, on n'en ajoute pas un
   deuxième pour un geste que le joueur fait juste avant de partir en mission.

   Logique : systems/apothecary-system.js. */

var APOTHECARY_RECIPES = [
  {
    potionId: "potion_soin_mineur",
    kind: "healing",                 // HEALING_POTIONS_DB
    inputs: { eau_purifiee: 3, ble: 4 }
  },
  {
    potionId: "potion_power",
    kind: "run",                     // POTIONS_DB (per-run)
    inputs: { eau_purifiee: 4, viande: 5 }
  },
  {
    potionId: "potion_celerity",
    kind: "run",
    inputs: { eau_purifiee: 4, farine: 3 }
  },
  {
    potionId: "potion_soin_majeur",
    kind: "healing",
    inputs: { eau_purifiee: 6, pain: 2 }
  },
  {
    potionId: "potion_precision",
    kind: "run",
    inputs: { eau_purifiee: 5, viande_sechee: 4 }
  },
  {
    potionId: "potion_endurance",
    kind: "run",
    inputs: { eau_purifiee: 6, pain: 2, viande_sechee: 3 }
  }
];

window.APOTHECARY_RECIPES = APOTHECARY_RECIPES;
