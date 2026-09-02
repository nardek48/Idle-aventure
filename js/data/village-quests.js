"use strict";
/* data/village-quests.js — v3.111.0 (Lot B) : chaîne de quêtes tutorielles du Village,
   ciblée Champs (décision Seb : narratif fort sur UN bâtiment plutôt que générique).
   Séquentielle (une quête visible à la fois au tableau), chaque quête porte un popup
   pédagogique déclaratif `tutorial` (même forme que GENERIC_TUTORIALS, rendu par
   ui/tutorial-view.js) affiché à la première arrivée sur l'onglet Village pendant que la
   quête est en cours. Les check() lisent game.production.farm SANS ensurePlots — jamais
   de création de bucket ici (un bucket prouve une save pré-verrou pour la migration
   v3.110.0, voir ProductionManager._migrateLegacyUnlocks).
   Logique : systems/village-quest-system.js. */

/* Lecture défensive des parcelles du Champs : tableau vide si bâtiment jamais initialisé. */
function getFarmPlotsReadOnly() {
  var bucket = game.production && game.production.farm;
  return (bucket && Array.isArray(bucket.plots)) ? bucket.plots : [];
}

var VILLAGE_QUESTS = [
  {
    id: "farm_second_plot",
    title: "Le Clos qui s'agrandit",
    icon: "🌱",
    buildingId: "farm",
    section: "resource",
    category: "side",
    narrative: {
      objective: "Le Clos d'Aeswyn nourrit à peine trois familles. Juste à côté, le Champ Béni attend sous les ronces — du bois pour les clôtures, de la pierre pour le muret, et la terre sera à nous.",
      completion: "Deux parcelles, deux récoltes. Le blé ne manquera plus les soirs de disette — et il reste sept terres à reprendre."
    },
    objectiveLabel: "Débloquer une 2e parcelle du Champs",
    check: function () {
      return getFarmPlotsReadOnly().filter(function (p) { return p.state === "open"; }).length >= 2;
    },
    progress: function () {
      var open = getFarmPlotsReadOnly().filter(function (p) { return p.state === "open"; }).length;
      return Math.min(open, 2) + "/2";
    },
    reward: { gold: 100, resources: { ble: 5 } },
    tutorial: {
      tab: "village",
      icon: "🌱",
      title: "Agrandir un bâtiment : les zones",
      points: [
        { icon: "🗺️", text: "Chaque bâtiment de production possède 9 zones (les « Parcelles » pour le Champs). Seule la première est ouverte au départ — les autres se débloquent contre des ressources." },
        { icon: "🌾", text: "Chaque zone ouverte produit en continu, indépendamment des autres, avec son propre stock local — plus de zones, plus de blé à chaque récolte." },
        { icon: "⚖️", text: "Les zones ont des profils différents (rapide, équilibrée, lente) : une zone lente produit moins vite mais stocke davantage — pratique si tu récoltes rarement." },
        { icon: "🪵", text: "Le déblocage du Champ Béni coûte du bois et de la pierre : la Scierie et la Carrière alimentent le Champs — chaque bâtiment nourrit les autres." }
      ]
    }
  },
  {
    id: "farm_level_two",
    title: "Une terre bien menée",
    icon: "⬆️",
    buildingId: "farm",
    section: "resource",
    category: "side",
    narrative: {
      objective: "Une terre qu'on laboure sans l'entretenir s'épuise. Fumier, jachère, outils affûtés : mène une parcelle au niveau 2 et elle te le rendra à chaque saison.",
      completion: "La parcelle respire. Le blé y pousse plus dru, et le grenier se remplit plus vite qu'il ne se vide."
    },
    objectiveLabel: "Monter une parcelle du Champs au niveau 2",
    check: function () {
      return getFarmPlotsReadOnly().some(function (p) { return p.state === "open" && Number(p.level) >= 2; });
    },
    progress: function () {
      var best = 1;
      getFarmPlotsReadOnly().forEach(function (p) { if (p.state === "open" && Number(p.level) > best) best = Number(p.level); });
      return Math.min(best, 2) + "/2";
    },
    reward: { gold: 150, resources: { eau: 5 } },
    tutorial: {
      tab: "village",
      icon: "⬆️",
      title: "Améliorer une zone : les niveaux",
      points: [
        { icon: "⬆️", text: "Chaque zone ouverte peut monter jusqu'au niveau 5. Chaque niveau augmente à la fois sa vitesse de production et sa capacité de stock local." },
        { icon: "💧", text: "Pour le Champs, l'amélioration coûte du bois et de l'eau — le Puits n'est pas là que pour les rations." },
        { icon: "📈", text: "Le coût grimpe à chaque niveau (×1,4) : monter une zone au niveau 2 est bon marché, la mener au niveau 5 est un vrai investissement." },
        { icon: "🎯", text: "Conseil : améliore d'abord la zone que tu récoltes le plus souvent — c'est elle qui convertit le mieux chaque ressource dépensée." }
      ]
    }
  },
  {
    id: "farm_improvement",
    title: "Le secret des sillons",
    icon: "💧",
    buildingId: "farm",
    section: "resource",
    category: "side",
    narrative: {
      objective: "Les anciens d'Aeswyn juraient par deux secrets : une terre enrichie de cendres, et des sillons qui boivent au ruisseau. Applique l'un des deux à une parcelle — la terre s'en souviendra pour toujours.",
      completion: "Le secret a pris. Cette parcelle donnera plus que les autres, saison après saison, sans rien demander de plus."
    },
    objectiveLabel: "Appliquer une amélioration (Terre enrichie ou Sillon irrigué) à une parcelle",
    check: function () {
      return getFarmPlotsReadOnly().some(function (p) { return p.state === "open" && (p.fertile === true || p.irrigated === true); });
    },
    progress: function () {
      var done = getFarmPlotsReadOnly().some(function (p) { return p.state === "open" && (p.fertile === true || p.irrigated === true); });
      return (done ? 1 : 0) + "/1";
    },
    reward: { gold: 250, essence: 10, potions: { potion_celerity: 1 } }, // v3.115.0
    tutorial: {
      tab: "village",
      icon: "💧",
      title: "Les améliorations permanentes",
      points: [
        { icon: "🌱", text: "« Terre enrichie » (+8 % de rendement) et « Sillon irrigué » (+10 %) sont des améliorations PERMANENTES, distinctes des niveaux — elles s'achètent une fois par zone." },
        { icon: "➕", text: "Les deux se cumulent sur la même zone, et se cumulent aussi avec les niveaux : une parcelle niveau 5, enrichie et irriguée, est la meilleure terre d'Aeswyn." },
        { icon: "⚠️", text: "Elles ne sont pas réversibles — mais il n'y a aucun piège : c'est toujours un gain net pour la zone." },
        { icon: "🏛️", text: "Tous les bâtiments de production ont leurs deux améliorations, sous d'autres noms — ce que tu apprends ici vaut pour la Scierie, la Mine et les autres." }
      ]
    }
  },

  /* ================= v3.112.0 (Lot C) — quêtes d'atelier =================
     Suite de la même chaîne séquentielle : du blé aux recettes (Moulin -> Boulangerie),
     puis les matériaux de craft (Scierie fine + Fonderie), puis l'amélioration d'un
     atelier. Les checks de craft lisent le compteur cumulatif
     explorationProgression.villageQuests.craftCounts (alimenté par WorkshopsSystem,
     tick + hors-ligne) : fabriquer suffit, consommer ensuite ne fait jamais reculer. */

  {
    id: "workshop_first_flour",
    title: "La première mouture",
    icon: "⚙️",
    buildingId: "farm",
    section: "resource",
    category: "side",
    narrative: {
      objective: "Le blé s'entasse mais il ne se mange pas cru. Le Moulin du Champs attend sa première meule — porte-lui cinq gerbes, et rapporte de la farine.",
      completion: "La meule a tourné. Une farine grossière, mais Aeswyn n'en demandait pas plus pour rêver de pain."
    },
    objectiveLabel: "Fabriquer 1 Farine au Moulin",
    check: function () {
      return VillageQuestManager.getCraftCount("farine") >= 1;
    },
    progress: function () {
      return Math.min(VillageQuestManager.getCraftCount("farine"), 1) + "/1";
    },
    reward: { gold: 150, resources: { ble: 10 } },
    tutorial: {
      tab: "village",
      icon: "⚙️",
      title: "Les ateliers : transformer les ressources",
      points: [
        { icon: "🔨", text: "Chaque bâtiment possède ses ateliers (le Moulin et la Boulangerie pour le Champs). Un atelier transforme des ressources brutes en produits via des recettes." },
        { icon: "📥", text: "Les intrants (ex. 5 blé) sont déduits de l'Entrepôt dès que tu lances le craft — le produit est crédité à la FIN du temps de fabrication." },
        { icon: "⏳", text: "Chaque atelier a sa propre file d'attente : tu peux empiler plusieurs lots, ils s'enchaînent tout seuls — même hors ligne." },
        { icon: "⚙️", text: "Ouvre le Champs et lance ta première mouture au Moulin : 5 blé donnent 1 farine." }
      ]
    }
  },
  {
    id: "workshop_first_bread",
    title: "Le pain d'Aeswyn",
    icon: "🥖",
    buildingId: "farm",
    section: "resource",
    category: "side",
    narrative: {
      objective: "Farine du Moulin, eau du Puits : la Boulangerie a tout ce qu'il faut pour rallumer son four. Le premier pain d'Aeswyn depuis l'incendie — les anciens en parleront longtemps.",
      completion: "L'odeur a traversé tout le village. Un seul pain, et déjà on fait la file devant la Boulangerie."
    },
    objectiveLabel: "Fabriquer 1 Pain à la Boulangerie",
    check: function () {
      return VillageQuestManager.getCraftCount("pain") >= 1;
    },
    progress: function () {
      return Math.min(VillageQuestManager.getCraftCount("pain"), 1) + "/1";
    },
    reward: { gold: 200, resources: { eau: 10 } },
    tutorial: {
      tab: "village",
      icon: "🥖",
      title: "Les chaînes de recettes",
      points: [
        { icon: "🔗", text: "Les recettes s'enchaînent : le blé devient farine (Moulin), la farine devient pain (Boulangerie, 3 farine + 5 eau). Plus loin, le pain entre dans la Ration de la Cuisine de camp." },
        { icon: "🧾", text: "Une recette peut demander PLUSIEURS ingrédients, venus de bâtiments différents — garde un œil sur l'Entrepôt avant de lancer un lot." },
        { icon: "🔁", text: "Le mode Auto d'une recette relance un lot dès que les ingrédients sont là (une seule recette auto par atelier) — parfait pour la farine pendant que tu joues ailleurs." },
        { icon: "🥖", text: "Fais moudre assez de farine, puis lance ton premier pain à la Boulangerie." }
      ]
    }
  },
  {
    id: "workshop_materials",
    title: "Planche et lingot",
    icon: "🧱",
    buildingId: "sawmill",
    section: "resource",
    category: "side",
    // La Scierie fine et la Fonderie exigent leurs bâtiments — la chaîne se met en pause
    // (carte masquée) tant que la Scierie ET la Mine ne sont pas débloquées.
    requires: function () {
      return !!(game.explorationProgression && game.explorationProgression.sawmillUnlocked && game.explorationProgression.mineUnlocked);
    },
    narrative: {
      objective: "Nourrir le village ne suffit pas : il faut l'outiller. La Scierie fine débite des planches, la Fonderie coule des lingots — fabrique un de chaque, et Aeswyn pourra bâtir.",
      completion: "Une planche et un lingot : rien de spectaculaire, mais tout ce qui s'améliorera à Aeswyn passera par eux."
    },
    objectiveLabel: "Fabriquer 1 Planche (Scierie fine) et 1 Lingot (Fonderie)",
    check: function () {
      return VillageQuestManager.getCraftCount("planche") >= 1 && VillageQuestManager.getCraftCount("lingot") >= 1;
    },
    progress: function () {
      var done = (VillageQuestManager.getCraftCount("planche") >= 1 ? 1 : 0) + (VillageQuestManager.getCraftCount("lingot") >= 1 ? 1 : 0);
      return done + "/2";
    },
    reward: { gold: 250, resources: { bois: 5, fer: 5 } },
    tutorial: {
      tab: "village",
      icon: "🧱",
      title: "Les matériaux de construction",
      points: [
        { icon: "🪚", text: "Chaque bâtiment a ses propres ateliers : la Scierie fine (Scierie) transforme 5 bois en 1 planche, la Fonderie (Mine) coule 5 fer en 1 lingot." },
        { icon: "🧱", text: "Planches et lingots sont les matériaux « travaillés » d'Aeswyn : c'est avec eux que s'améliorent les ateliers — et que se bâtiront les projets à venir." },
        { icon: "🏗️", text: "Tu as déjà croisé la planche avec « Les fondations » : chaque planche fabriquée compte, quelle que soit la raison pour laquelle tu la fabriques." },
        { icon: "⚖️", text: "Conseil : garde toujours quelques planches et lingots d'avance — les besoins arrivent souvent d'un coup." }
      ]
    }
  },
  {
    id: "workshop_level_two",
    title: "L'atelier bien huilé",
    icon: "🔧",
    buildingId: "farm",
    section: "resource",
    category: "side",
    narrative: {
      objective: "Un artisan vaut ce que vaut son établi. Prends tes planches et tes lingots, et améliore un atelier — n'importe lequel — au niveau 2 : Aeswyn mérite mieux que du provisoire.",
      completion: "L'établi renforcé ne grince plus. Les lots sortent plus vite, la file s'allonge — le village commence à ressembler à un village."
    },
    objectiveLabel: "Améliorer un atelier au niveau 2",
    check: function () {
      var production = game.production;
      if (!production || typeof production !== "object") return false;
      return Object.keys(production).some(function (buildingId) {
        var workshops = production[buildingId] && production[buildingId].workshops;
        if (!workshops || typeof workshops !== "object") return false;
        return Object.keys(workshops).some(function (wid) {
          return Number(workshops[wid] && workshops[wid].level) >= 2;
        });
      });
    },
    progress: function () {
      var best = 1;
      var production = game.production || {};
      Object.keys(production).forEach(function (buildingId) {
        var workshops = production[buildingId] && production[buildingId].workshops;
        if (!workshops || typeof workshops !== "object") return;
        Object.keys(workshops).forEach(function (wid) {
          var lvl = Number(workshops[wid] && workshops[wid].level) || 1;
          if (lvl > best) best = lvl;
        });
      });
      return Math.min(best, 2) + "/2";
    },
    reward: { gold: 300, essence: 15 },
    tutorial: {
      tab: "village",
      icon: "🔧",
      title: "Améliorer un atelier",
      points: [
        { icon: "⬆️", text: "Chaque atelier monte jusqu'au niveau 5, indépendamment des autres (le Moulin niveau 3 ne change rien à la Boulangerie)." },
        { icon: "⚡", text: "Chaque niveau accélère les crafts (-8 % de temps par niveau, jusqu'à -32 %) ET allonge la file d'attente : sa taille est égale au niveau de l'atelier." },
        { icon: "🧱", text: "Le coût se paie en planches et lingots, et grimpe de ×1,4 par niveau — comme les zones de production." },
        { icon: "🎯", text: "Conseil : améliore d'abord l'atelier qui tourne le plus (souvent celui en mode Auto) — chaque pour cent de vitesse y rapporte davantage." }
      ]
    }
  }
];

window.VILLAGE_QUESTS = VILLAGE_QUESTS;
window.getFarmPlotsReadOnly = getFarmPlotsReadOnly;
