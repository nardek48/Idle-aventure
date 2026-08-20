"use strict";
/* ============================================================
Aethervale — data/construction.js
v3.37 : système de Construction — 4e système économique, séparé de
Village (bonus hors-ligne, systems/offline-system.js), Production
(récolte brute, data/production-buildings.js) et l'artisanat de
l'Entrepôt (data/recipes.js). Dépense Or + ressources de l'Entrepôt
pour améliorer un bâtiment qui donne un bonus passif permanent.

Palier 1 (niveaux 1-5) : Atelier de Construction (id "workshop",
STABLE et volontairement réutilisé dans une session future pour
conditionner des recettes via station: "workshop" sur data/recipes.js
— rien de tel n'est branché ici, seul l'id est réservé). Coût en
Or + Planche + Pierre. Bonus : +3%/niveau sur le prix de vente de
TOUTE l'Entrepôt (bruts et tier 1 confondus), lu par
WarehouseManager.sellResource() via ConstructionManager.getSellBonus()
(voir systems/construction-system.js) — choisi plutôt qu'un bonus de
capacité ou de rendement pour ne dupliquer ni la Mine d'Or du Village
(qui ne touche que la chasse ambiante/hors-ligne, jamais l'Entrepôt)
ni aucun effet de Production.

v3.40 : palier 2 (niveaux 6-10) — coût additionnel en Lingot. Passage
d'une formule continue unique (costPerLevel) à une structure par
PALIERS (costTiers, tableau) — demande explicite : permet d'ajouter un
palier 3 plus tard (nouvelle ressource) sans réécrire cette logique,
juste un nouvel élément dans le tableau. Chaque palier a son propre
baseCost/costMult/liste de ressources ; le coût à l'intérieur d'un
palier reste une croissance géométrique classique (base × mult^n),
exactement comme avant, mais n recommence à 0 à chaque nouveau palier
(pas de continuité exponentielle brute d'un palier à l'autre — le
"saut" de valeur entre la fin du palier 1 et le début du palier 2 est
choisi à la main via baseCost, pas calculé).

Valeurs du palier 2 (niveau 6 = 1er achat du palier, mult^0) :
baseCost { gold: 120, planche: 45, pierre: 65, lingot: 8 }, costMult
1.40 — volontairement au-dessus de la fin du palier 1 (dernier achat
niveau 4->5 : 83 or / 33 planche / 49 pierre) pour que la progression
ne redescende jamais en passant au palier suivant. costMult un peu
plus fort que le palier 1 (1.40 vs 1.35) pour marquer une difficulté
croissante. Quantité de Lingot volontairement faible (8 au départ) :
1 Lingot = 5 Fer (25 or de valeur brute si vendu séparément) contre
seulement 10 or si le Lingot est vendu tel quel — un coût de
construction en Lingot doit rester nettement inférieur à un coût
équivalent en Fer brut, sinon le palier 2 punirait le craft plutôt
que de le valoriser.

bonusMultiplierAtLevel() reste À L'IDENTIQUE sur toute la plage 1-10
(même formule 1 + 0.03×niveau, donc +30% au niveau 10) — demande
explicite : "seul le coût change de nature, pas l'effet", aucune
rupture de logique de bonus entre niveau 5 et niveau 6. */

var CONSTRUCTION_BUILDINGS = {
  workshop: {
    id: "workshop",
    name: "Atelier de Construction",
    desc: "Améliore l'Atelier pour augmenter le prix de vente de toutes les ressources de l'Entrepôt.",
    icon: "images/Icons/construction_icon.png",
    maxLevel: 10,

    /* v3.40 : structure par paliers — minLevel/maxLevel EXCLUSIFS du
       niveau actuel (le "niveau actuel" auquel costPerLevel(level) est
       appelé est le niveau AVANT l'achat, donc palier 1 couvre les
       achats qui font passer du niveau 0 au niveau 5 inclus, palier 2
       du niveau 5 au niveau 10 inclus — voir getCostTierForLevel()). */
    costTiers: [
      {
        minLevel: 0,
        maxLevel: 4, // dernier "niveau actuel" couvert par ce palier (achat 4->5)
        resources: ["gold", "planche", "pierre"],
        baseCost: { gold: 25, planche: 10, pierre: 15 },
        costMult: 1.35
      },
      {
        minLevel: 5,
        maxLevel: 9, // dernier "niveau actuel" couvert (achat 9->10)
        resources: ["gold", "planche", "pierre", "lingot"],
        baseCost: { gold: 120, planche: 45, pierre: 65, lingot: 8 },
        costMult: 1.40
      }
    ],

    /* Retrouve le palier applicable pour costPerLevel(level) —
       "level" ici est le niveau ACTUEL (avant achat), voir l'appelant
       dans systems/construction-system.js (getNextCost). */
    getCostTierForLevel: function (level) {
      for (var i = 0; i < this.costTiers.length; i++) {
        var tier = this.costTiers[i];
        if (level >= tier.minLevel && level <= tier.maxLevel) return tier;
      }
      return this.costTiers[this.costTiers.length - 1]; // filet de sécurité, ne devrait pas arriver avec maxLevel=10 cohérent
    },

    /* Coût du niveau (0-indexé, donc costPerLevel(0) = coût pour
       passer du niveau 0 au niveau 1) : base × mult^n DANS le palier
       applicable, n recommençant à 0 au début de chaque palier — pas
       une formule continue sur toute la plage 0-10. Calculée
       indépendamment pour chaque ressource du palier ; un futur
       palier 3 ajoute juste un 3e élément à costTiers, sans toucher
       à cette fonction ni à aucun appelant existant (chaque appelant
       lit les clés du coût par leur nom, jamais Object.keys en boucle
       aveugle sur une liste figée). */
    costPerLevel: function (level) {
      var tier = this.getCostTierForLevel(level);
      var n = level - tier.minLevel;
      var mult = Math.pow(tier.costMult, n);

      var result = {};
      tier.resources.forEach(function (key) {
        result[key] = Math.floor(tier.baseCost[key] * mult);
      });
      return result;
    },

    /* Bonus cumulé au niveau donné (0 = aucun bonus). Multiplicateur
       direct (1.30 au niveau 10) plutôt qu'un pourcentage brut, pour
       être appliqué tel quel par WarehouseManager.sellResource().
       v3.40 : formule INCHANGÉE sur toute la plage 1-10, aucune
       rupture au passage palier 1 -> palier 2 (seul le coût change de
       nature entre les deux paliers, pas cet effet). */
    bonusMultiplierAtLevel: function (level) {
      return 1 + 0.03 * level;
    }
  }
};

window.CONSTRUCTION_BUILDINGS = CONSTRUCTION_BUILDINGS;
