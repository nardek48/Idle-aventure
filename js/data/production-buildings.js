"use strict";
/* ============================================================
Aethervale — data/production-buildings.js
v3.31 : bâtiments de production (voir systems/production-system.js) —
système DISTINCT de VILLAGE_CONFIG (offline-system.js) : le Village
donne des bonus passifs en %, sans stock ; la Production accumule un
STOCK LOCAL plafonné par bâtiment, à récolter manuellement vers
l'Entrepôt (voir WarehouseManager.addResource()).

Les 4 bâtiments sont identiques en V1 (mêmes coefficients de
rendement/coût/capacité) — seuls l'icône et la ressource produite
changent. Valeurs validées avec Seb avant implémentation :
  - Niveau 1 : 1 unité/min, capacité 25 (remplissage ~25 min)
  - Rendement : ×1.25 par niveau (+25%/niveau)
  - Capacité  : ×(1 + 0.10×(niveau-1)) — progression volontairement
    plus lente que le rendement, pour que le temps de remplissage
    reste proche de 20-30 min même en fin de progression plutôt que
    de s'effondrer à quelques minutes (capacité ET rendement montent
    presque au même rythme). AUCUN aménagement séparé pour l'instant
    (voir "capacityMult" plus bas si on veut découpler ça plus tard).
  - Coût d'amélioration : 200 or de base, ×1.6/niveau, jusqu'au niveau 15
Toutes ces valeurs sont ici, dans PRODUCTION_CONFIG (coefficients
partagés par les 4 bâtiments) — à ajuster ici seulement si besoin de
rééquilibrer, jamais en dur ailleurs dans le code. */

var PRODUCTION_CONFIG = {
  baseRatePerMin: 1,       // rendement niveau 1, unités/minute
  rateGrowthPerLevel: 1.25, // multiplicateur de rendement par niveau
  baseCapacity: 25,         // capacité de stock local niveau 1
  capacityGrowthPerLevel: 0.10, // +10% de capacité par niveau (additif simple, voir formule ci-dessous)
  baseCost: 200,            // coût d'amélioration niveau 1 -> 2, en or
  costMult: 1.6,             // multiplicateur de coût par niveau
  maxLevel: 15
};

/* Catalogue des 4 bâtiments. resourceKey doit exister dans
   WAREHOUSE_RESOURCES (voir data/hunt-quests.js) — Bois/Fer y sont
   déjà déclarés, réservés à de futures constructions/améliorations.
   Tous accessibles dès le départ en V1 (aucune logique de déblocage
   existante compatible n'a été trouvée pour ce type de bâtiment —
   VILLAGE_CONFIG n'a pas de notion de déblocage non plus, cohérent).

   v3.33 : buildingImage (illustration ronde fournie par Seb, voir
   images/Production/) — distincte de `icon` (petite icône de la
   ressource produite, images/Icons/resources/, réutilisée ailleurs
   dans l'Entrepôt). La carte de l'écran Production (ui/production-view.js)
   affiche buildingImage ; icon reste disponible si besoin futur.

   v3.36 : Carrière (5e bâtiment, produit Pierre) — mêmes coefficients
   PRODUCTION_CONFIG que les 4 autres (décision explicite, pas de
   config par-bâtiment séparée). Aucune modification requise ailleurs :
   ui/production-view.js et systems/production-system.js itèrent déjà
   Object.keys(PRODUCTION_BUILDINGS) sans rien coder en dur.

   v3.45 : Puits (6e bâtiment, produit Eau) — même principe EXACT,
   aucune formule spéciale (PRODUCTION_CONFIG partagé, décision
   explicite). Accessible dès le départ comme les 5 autres, pas de
   gate par quête. */
var PRODUCTION_BUILDINGS = {
  hunt: { id: "hunt", name: "Chasse", resourceKey: "viande", icon: "images/Icons/resources/meat_icon.png", buildingImage: "images/Production/hunt.png", desc: "Produit de la viande en continu." },
  farm: { id: "farm", name: "Champs", resourceKey: "ble", icon: "images/Icons/resources/wheat_icon.png", buildingImage: "images/Production/farm.png", desc: "Produit du blé en continu." },
  sawmill: { id: "sawmill", name: "Scierie", resourceKey: "bois", icon: "images/Icons/resources/wood_icon.png", buildingImage: "images/Production/sawmill.png", desc: "Produit du bois en continu." },
  mine: { id: "mine", name: "Mine", resourceKey: "fer", icon: "images/Icons/resources/iron_icon.png", buildingImage: "images/Production/mine.png", desc: "Produit du fer en continu." },
  quarry: { id: "quarry", name: "Carrière", resourceKey: "pierre", icon: "images/Icons/resources/stone_icon.png", buildingImage: "images/Production/quarry.png", desc: "Produit de la pierre en continu." },
  well: { id: "well", name: "Puits", resourceKey: "eau", icon: "images/Icons/resources/water_icon.png", buildingImage: "images/Production/well.png", desc: "Produit de l'eau en continu." }
};

window.PRODUCTION_CONFIG = PRODUCTION_CONFIG;
window.PRODUCTION_BUILDINGS = PRODUCTION_BUILDINGS;
