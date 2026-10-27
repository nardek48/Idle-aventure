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
    icon: "images/Icons/plots/enriched_soil.webp",
    buildingId: "farm",
    section: "resource",
    category: "side",
    narrative: {
      objective: "Le Clos d'Aeswyn nourrit à peine trois familles. Juste à côté, le Champ Béni attend sous les ronces — du bois pour les clôtures, de la pierre pour le muret, et la terre sera à nous.",
      completion: "Deux parcelles, deux récoltes. Wenna a compté les sillons deux fois. Le blé ne manquera plus les soirs de disette — et il reste sept terres à reprendre." // v3.197.0 (bible B §2.1)
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
      icon: "images/Icons/plots/enriched_soil.webp",
      title: "Agrandir un bâtiment : les zones",
      points: [
        { icon: "images/Icons/quests/quest_resources.webp", text: "Chaque bâtiment de production possède 9 zones (les « Parcelles » pour le Champs). Seule la première est ouverte au départ. En Forêt, tu peux en ouvrir 3 contre des ressources ; les autres s'ouvrent dans les mondes suivants." },
        { icon: "images/Icons/scene/scene_harvest.webp", text: "Chaque zone ouverte produit en continu, indépendamment des autres, avec son propre stock local — plus de zones, plus de blé à chaque récolte." },
        { icon: "⚖️", text: "Les zones ont des profils différents (rapide, équilibrée, lente) : une zone lente produit moins vite mais stocke davantage — pratique si tu récoltes rarement." },
        { icon: "images/Icons/workshops/fine_sawmill.webp", text: "Le déblocage du Champ Béni coûte du bois et de la pierre : la Scierie et la Carrière (ouverte par l'expédition de la Veine instable) alimentent le Champs — chaque bâtiment nourrit les autres." }
      ]
    }
  },
  {
    id: "farm_level_two",
    title: "Une terre bien menée",
    icon: "images/Icons/system/upgrade.webp",
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
      icon: "images/Icons/system/upgrade.webp",
      title: "Améliorer une zone : les niveaux",
      points: [
        { icon: "images/Icons/system/upgrade.webp", text: "Chaque zone ouverte peut monter de niveau : jusqu'au 5 en Forêt, et le plafond monte à chaque monde. Chaque niveau augmente à la fois sa vitesse de production et sa capacité de stock local." },
        { icon: "images/Icons/scene/node_clear_spring.webp", text: "Pour le Champs, l'amélioration coûte du bois et de l'eau — le Puits n'est pas là que pour les rations." },
        { icon: "📈", text: "Le coût grimpe un peu à chaque niveau (×1,15)." },
        { icon: "images/Icons/combat_stats/stat_critical.webp", text: "Conseil : améliore d'abord la zone que tu récoltes le plus souvent — c'est elle qui convertit le mieux chaque ressource dépensée." }
      ]
    }
  },
  {
    id: "farm_improvement",
    title: "Le secret des sillons",
    icon: "images/Icons/scene/node_clear_spring.webp",
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
    reward: { gold: 300, potions: { potion_celerity: 1 } }, // v3.115.0
    tutorial: {
      tab: "village",
      icon: "images/Icons/scene/node_clear_spring.webp",
      title: "Les améliorations permanentes",
      points: [
        { icon: "images/Icons/plots/enriched_soil.webp", text: "« Terre enrichie » (+8 % de rendement) et « Sillon irrigué » (+10 %) sont des améliorations PERMANENTES, distinctes des niveaux — elles s'achètent une fois par zone." },
        { icon: "➕", text: "Les deux se cumulent sur la même zone, et se cumulent aussi avec les niveaux : une parcelle niveau 5, enrichie et irriguée, est la meilleure terre d'Aeswyn." },
        { icon: "images/Icons/system/warning.webp", text: "Elles ne sont pas réversibles — mais il n'y a aucun piège : c'est toujours un gain net pour la zone." },
        { icon: "images/Icons/codex/world_ruins.webp", text: "Tous les bâtiments de production ont leurs deux améliorations, sous d'autres noms — ce que tu apprends ici vaut pour la Scierie, la Mine et les autres." }
      ]
    }
  },

  /* ================= v3.112.0 (Lot C) — quêtes d'atelier =================
     Suite de la même chaîne séquentielle : du blé aux recettes (Boulangerie ; v3.484.0, lot S : Moulin retiré),
     puis les matériaux de craft (Scierie fine + Fonderie), puis l'amélioration d'un
     atelier. Les checks de craft lisent le compteur cumulatif
     explorationProgression.villageQuests.craftCounts (alimenté par WorkshopsSystem,
     tick + hors-ligne) : fabriquer suffit, consommer ensuite ne fait jamais reculer. */

  {
    id: "workshop_first_bread",
    title: "Le pain d'Aeswyn",
    icon: "images/Icons/quests/ration_reward.webp",
    buildingId: "farm",
    section: "resource",
    category: "side",
    narrative: {
      objective: "Blé du Champs, eau du Puits : la Boulangerie a tout ce qu'il faut pour rallumer son four. Le premier pain d'Aeswyn depuis l'incendie — les anciens en parleront longtemps.",
      completion: "L'odeur a traversé tout le village. Un seul pain, et déjà on fait la file devant la Boulangerie. Orwen en a pris un morceau et l'a mis de côté, sans dire pour qui." // v3.197.0 (bible B) : graine — le pain pour la braise
    },
    objectiveLabel: "Fabriquer 1 Pain à la Boulangerie",
    check: function () {
      return VillageQuestManager.getCraftCount("pain") >= 1;
    },
    progress: function () {
      return Math.min(VillageQuestManager.getCraftCount("pain"), 1) + "/1";
    },
    reward: { gold: 350, resources: { eau: 10, ble: 10 } }, // v3.484.1 : + la récompense de « La première mouture » (retirée)
    tutorial: {
      tab: "village",
      icon: "images/Icons/quests/ration_reward.webp",
      title: "Les ateliers : transformer les ressources",
      points: [
        { icon: "images/Icons/quests/mission_construction.webp", text: "Chaque bâtiment possède ses ateliers (la Boulangerie pour le Champs). Un atelier transforme des ressources brutes en produits via des recettes." },
        { icon: "🧾", text: "Une recette peut demander PLUSIEURS ingrédients, venus de bâtiments différents : le pain prend 15 blé du Champs et 5 eau du Puits. Plus loin, il entre dans la Ration de la Cuisine de camp." },
        { icon: "images/Icons/system/import.webp", text: "Les intrants sont déduits de l'Entrepôt dès que tu lances le craft — le produit est crédité à la FIN du temps de fabrication." },
        { icon: "images/Icons/system/hourglass_waiting.webp", text: "Chaque atelier a sa propre file d'attente : tu peux empiler plusieurs lots, ils s'enchaînent tout seuls — même hors ligne." },
        { icon: "images/Icons/system/auto_repeat.webp", text: "Le mode Auto d'une recette relance un lot dès que les ingrédients sont là (une seule recette auto par atelier) — parfait pendant que tu joues ailleurs." },
        { icon: "images/Icons/quests/ration_reward.webp", text: "Ouvre le Champs et lance ton premier pain à la Boulangerie." }
      ]
    }
  },
  {
    id: "workshop_materials",
    title: "Planche et lingot",
    icon: "images/Icons/plots/reinforced_gallery.webp",
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
      completion: "Une planche et un lingot. Brannoc les a soupesés longtemps, comme s'il comptait autre chose que le poids. Tout ce qui s'améliorera à Aeswyn passera par eux." // v3.197.0 (bible B §2.1)
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
      icon: "images/Icons/plots/reinforced_gallery.webp",
      title: "Les matériaux de construction",
      points: [
        { icon: "images/Icons/workshops/fine_sawmill.webp", text: "Chaque bâtiment a ses propres ateliers : la Scierie fine (Scierie) transforme 5 bois en 1 planche, la Fonderie (Mine) coule 5 fer en 1 lingot." },
        { icon: "images/Icons/plots/reinforced_gallery.webp", text: "Planches et lingots sont les matériaux « travaillés » d'Aeswyn : c'est avec eux que s'améliorent les ateliers — et que se bâtiront les projets à venir." },
        { icon: "images/Icons/workshops/masonry.webp", text: "Tu as déjà croisé la planche avec « Les fondations » : chaque planche fabriquée compte, quelle que soit la raison pour laquelle tu la fabriques." },
        { icon: "⚖️", text: "Conseil : garde toujours quelques planches et lingots d'avance — les besoins arrivent souvent d'un coup." }
      ]
    }
  },
  {
    id: "workshop_level_two",
    title: "L'atelier bien huilé",
    icon: "images/Icons/system/wrench_settings.webp",
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
    reward: { gold: 375 },
    tutorial: {
      tab: "village",
      icon: "images/Icons/system/wrench_settings.webp",
      title: "Améliorer un atelier",
      points: [
        { icon: "images/Icons/system/upgrade.webp", text: "Chaque atelier monte de niveau (2 en Forêt, 3 dans les mondes suivants), indépendamment des autres (la Scierie fine niveau 3 ne change rien à la Menuiserie)." },
        { icon: "images/Icons/workshops/craft_speed.webp", text: "Chaque niveau accélère les crafts (-8 % de temps par niveau) ET allonge la file d'attente : sa taille est égale au niveau de l'atelier." },
        { icon: "images/Icons/plots/reinforced_gallery.webp", text: "Le coût se paie en planches et lingots, et grimpe de ×1,4 par niveau." },
        { icon: "images/Icons/combat_stats/stat_critical.webp", text: "Conseil : améliore d'abord l'atelier qui tourne le plus (souvent celui en mode Auto) — chaque pour cent de vitesse y rapporte davantage." }
      ]
    }
  }
];

window.VILLAGE_QUESTS = VILLAGE_QUESTS;
window.getFarmPlotsReadOnly = getFarmPlotsReadOnly;

/* v3.509.0 (option A de Seb du 27/10, atelier jalons-village-heros.html variante B) : JALONS du village et du
   héros, 6 par monde (3 + 3). Mesure : MilestoneManager.measure(kind, arg) ; « go » : où l'on agit ; book : fiche. */
var MILESTONE_REWARD_BY_WORLD = [
  { gold: 250, mat: "resine_durcie" }, { gold: 600, mat: "verre_trempe" }, { gold: 1500, mat: "cle_de_voute" },
  { gold: 4000, mat: "cire_consacree" }, { gold: 12000, mat: "obsidienne_taillee" }
]; // ~10 % de l'or que rapporte chaque monde (audit du 26/10), + 1 matériau du monde
var VILLAGE_MILESTONES = [
  // Forêt
  { id: "ms_f_zones", w: 0, g: "v", title: "Trois zones au niveau 3", kind: "zonesAtLevel", arg: 3, target: 3, icon: "images/Production/farm.webp", go: "production" },
  { id: "ms_f_entrepot", w: 0, g: "v", title: "Entrepôt niveau 2", kind: "building", arg: "warehouse", target: 2, icon: "images/Icons/village_buildings/warehouse_expanded.webp", go: "b:warehouse" },
  { id: "ms_f_taverne", w: 0, g: "v", title: "Livrer un contrat à la Taverne", kind: "counter", arg: "tavernDelivered", target: 1, icon: "images/Icons/village_buildings/tavern.webp", go: "b:tavern" },
  { id: "ms_f_rang", w: 0, g: "h", title: "Premier rang d'un sort", kind: "spellRankMax", target: 1, icon: "images/Icons/special_attacks/smashing_blow.webp", go: "skills", book: "rangs" },
  { id: "ms_f_wenna", w: 0, g: "h", title: "Wenna au palier 5", kind: "companionUpg", arg: "wenna", target: 5, icon: "images/Companions/wenna.webp", go: "c:wenna", book: "ardeur" },
  { id: "ms_f_relique", w: 0, g: "h", title: "Équiper une relique", kind: "relicsWorn", target: 1, icon: "images/Icons/quests/mission_exploration.webp", go: "c:wenna", book: "reliques" },
  // Désert
  { id: "ms_d_zones", w: 1, g: "v", title: "Six zones au niveau 5", kind: "zonesAtLevel", arg: 5, target: 6, icon: "images/Production/sawmill.webp", go: "production" },
  { id: "ms_d_entrepot", w: 1, g: "v", title: "Entrepôt niveau 5", kind: "building", arg: "warehouse", target: 5, icon: "images/Icons/village_buildings/warehouse_expanded.webp", go: "b:warehouse" },
  { id: "ms_d_apothicaire", w: 1, g: "v", title: "Apothicaire : une préparation", kind: "counter", arg: "apothecaryCrafts", target: 1, icon: "images/Icons/village_buildings/apothecary.webp", go: "b:apothecary", book: "apothicaire" },
  { id: "ms_d_rang", w: 1, g: "h", title: "Un sort au rang 2", kind: "spellRankMax", target: 2, icon: "images/Icons/special_attacks/smashing_blow.webp", go: "skills" },
  { id: "ms_d_wenna", w: 1, g: "h", title: "Compétence de Wenna au rang 2", kind: "companionRank", arg: "wenna", target: 2, icon: "images/Companions/wenna.webp", go: "c:wenna", book: "competence" },
  { id: "ms_d_maddoc", w: 1, g: "h", title: "Maddoc au palier 5", kind: "companionUpg", arg: "maddoc", target: 5, icon: "images/Companions/maddoc.webp", go: "c:maddoc" },
  // Ruines
  { id: "ms_r_zones", w: 2, g: "v", title: "Six zones au niveau 8", kind: "zonesAtLevel", arg: 8, target: 6, icon: "images/Production/quarry.webp", go: "production" },
  { id: "ms_r_caravane", w: 2, g: "v", title: "Une caravane rentrée", kind: "counter", arg: "caravansBack", target: 1, icon: "images/Icons/village_buildings/caravan.webp", go: "b:hall", book: "caravane" },
  { id: "ms_r_terrain", w: 2, g: "v", title: "Terrain d'entraînement niveau 10", kind: "building", arg: "training", target: 10, icon: "images/Icons/village_buildings/training_grounds.webp", go: "b:training" },
  { id: "ms_r_rangs", w: 2, g: "h", title: "Les quatre sorts au rang 2", kind: "spellRankMin", target: 2, icon: "images/Icons/special_attacks/smashing_blow.webp", go: "skills" },
  { id: "ms_r_edda", w: 2, g: "h", title: "Edda au palier 5", kind: "companionUpg", arg: "edda", target: 5, icon: "images/Companions/edda.webp", go: "c:edda" },
  { id: "ms_r_reliques", w: 2, g: "h", title: "Deux reliques équipées", kind: "relicsWorn", target: 2, icon: "images/Icons/quests/mission_exploration.webp", go: "c:wenna" },
  // Crypte
  { id: "ms_c_zones", w: 3, g: "v", title: "Neuf zones ouvertes dans un bâtiment", kind: "zonesOpenMax", target: 9, icon: "images/Production/mine.webp", go: "production" },
  { id: "ms_c_entrepot", w: 3, g: "v", title: "Entrepôt niveau 10", kind: "building", arg: "warehouse", target: 10, icon: "images/Icons/village_buildings/warehouse_expanded.webp", go: "b:warehouse" },
  { id: "ms_c_taverne", w: 3, g: "v", title: "Taverne niveau 6", kind: "building", arg: "tavern", target: 6, icon: "images/Icons/village_buildings/tavern.webp", go: "b:tavern" },
  { id: "ms_c_rang", w: 3, g: "h", title: "Un sort au rang 4", kind: "spellRankMax", target: 4, icon: "images/Icons/special_attacks/smashing_blow.webp", go: "skills" },
  { id: "ms_c_palier", w: 3, g: "h", title: "Un compagnon au palier 15", kind: "companionUpgMax", target: 15, icon: "images/Companions/ysolt.webp", go: "companions" },
  { id: "ms_c_entrainement", w: 3, g: "h", title: "Une caractéristique entraînée à 150", kind: "trainingMax", target: 150, icon: "images/Icons/village_buildings/training_grounds.webp", go: "training" },
  // Montagne
  { id: "ms_m_zones", w: 4, g: "v", title: "Trois zones au niveau 14", kind: "zonesAtLevel", arg: 14, target: 3, icon: "images/Production/well.webp", go: "production" },
  { id: "ms_m_entrepot", w: 4, g: "v", title: "Entrepôt niveau 14", kind: "building", arg: "warehouse", target: 14, icon: "images/Icons/village_buildings/warehouse_expanded.webp", go: "b:warehouse" },
  { id: "ms_m_terrain", w: 4, g: "v", title: "Terrain d'entraînement niveau 18", kind: "building", arg: "training", target: 18, icon: "images/Icons/village_buildings/training_grounds.webp", go: "b:training" },
  { id: "ms_m_rang", w: 4, g: "h", title: "Un sort au rang 5", kind: "spellRankMax", target: 5, icon: "images/Icons/special_attacks/smashing_blow.webp", go: "skills" },
  { id: "ms_m_sarkel", w: 4, g: "h", title: "Compétence de Sarkel au rang 3", kind: "companionRank", arg: "sarkel", target: 3, icon: "images/Companions/sarkel.webp", go: "c:sarkel" },
  { id: "ms_m_reliques", w: 4, g: "h", title: "Trois reliques sur un même compagnon", kind: "relicsOnOne", target: 3, icon: "images/Icons/quests/mission_exploration.webp", go: "companions" }
];
/* Fiches « comment ça marche » (premier jalon d'un système). */
var MILESTONE_BOOKS = {
  rangs: { title: "Les rangs des sorts", icon: "images/Icons/special_attacks/smashing_blow.webp", tips: [
    ["images/Icons/subtabs/hero_abilities.webp", "Héros › Capacités : chaque sort monte du rang 0 au rang 5. Un rang donne +8 % de dégâts (+2 points pour la défense)."],
    ["images/Icons/resources/resine_durcie_icon.webp", "Un rang coûte de l'or et un matériau du monde. Le rang 2 s'ouvre au Désert, le 3 aux Ruines, et ainsi de suite."],
    ["images/Icons/gold_icon.webp", "La bulle d'or te signale un rang payable : « J'y vais » ouvre le bon sort."]] },
  ardeur: { title: "Entraîner un compagnon", icon: "images/Companions/wenna.webp", tips: [
    ["images/Icons/subtabs/hero_roster.webp", "Héros › Compagnons : chaque palier donne +8 % au choix, en Ardeur (dégâts) ou en Vigueur (PV, et il attire davantage les coups)."],
    ["images/Icons/system/lock_open.webp", "Les paliers 5, 15 et 25 ouvrent les trois emplacements de relique."],
    ["images/Icons/gold_icon.webp", "« Répartir de nouveau » rend l'or et remet les paliers à choisir."]] },
  reliques: { title: "Patrouilles et reliques", icon: "images/Icons/quests/mission_exploration.webp", tips: [
    ["images/Icons/quests/mission_exploration.webp", "Un compagnon resté au camp peut partir en patrouille (2, 4 ou 8 h). Ta première patrouille terminée rapporte toujours une relique."],
    ["images/Icons/codex/world_forest.webp", "La relique vient du monde patrouillé : plus le monde est loin, plus elle est forte (rang 1 à 5)."],
    ["images/Companions/wenna.webp", "Fiche du compagnon › Reliques, une par famille : Croc (dégâts), Écorce (PV), Sceau (menace), Sablier (recharge), Emblème (dégâts du héros), Besace (butin)."]] },
  apothicaire: { title: "L'Apothicaire", icon: "images/Icons/village_buildings/apothecary.webp", tips: [
    ["images/Icons/village_buildings/apothecary.webp", "L'Apothicaire prépare des potions et des objets de combat avec tes ressources, à côté de l'achat en or."],
    ["images/Icons/system/hourglass_waiting.webp", "Il fait 4 préparations par jour, 2 de plus par niveau."]] },
  competence: { title: "La compétence d'un compagnon", icon: "images/Companions/wenna.webp", tips: [
    ["images/Icons/subtabs/hero_roster.webp", "Fiche du compagnon : sa compétence signature monte du rang 0 au rang 5 (soin plus fort, frappe plus dure, une charge de plus…)."],
    ["images/Icons/resources/verre_trempe_icon.webp", "Un rang coûte de l'or et 2 matériaux du monde. Comme les sorts du héros, le rang 2 s'ouvre au Désert, le 3 aux Ruines."]] },
  caravane: { title: "Les caravanes", icon: "images/Icons/village_buildings/caravan.webp", tips: [
    ["images/Icons/village_buildings/merchant_hall.webp", "La Halle marchande envoie des caravanes vers les marchés des mondes déjà libérés : trajet court (1 h), moyen (4 h) ou long (8 h)."],
    ["images/Icons/gold_icon.webp", "Au retour, elle rapporte de l'or et des ressources du monde visité ; le trajet long peut ramener une rareté."]] }
};
window.MILESTONE_REWARD_BY_WORLD = MILESTONE_REWARD_BY_WORLD;
window.VILLAGE_MILESTONES = VILLAGE_MILESTONES;
window.MILESTONE_BOOKS = MILESTONE_BOOKS;
