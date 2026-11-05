"use strict";
/* data/hunt-quests.js — chasses "de boucle" (lots de kills relancés automatiquement), retirées en v3.511.0.
   Logique : systems/hunt-quest-system.js. Les ressources de l'Entrepôt sont dans data/warehouse-resources.js. */

/* v3.511.0 (option A, Seb 27/10) : les chasses et les battues sont retirées (onglet Chasse peu utilisé).
   Le moteur (hunt-quest-system.js) reste, inerte sans chasse. */
var HUNT_QUESTS = {};

window.HUNT_QUESTS = HUNT_QUESTS;
