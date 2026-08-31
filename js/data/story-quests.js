"use strict";
/* data/story-quests.js — questline « Les Braises d'Aeswyn » (chapitre 1, Forêt) : 15 étapes séquentielles.
   Accepter une étape débloque ses onglets ; l'objectif enseigne la mécanique ; réclamer donne la récompense. Logique : systems/story-quest-system.js */

/* Récompenses placeholder, regroupées ici pour le passage d'équilibrage or ultérieur (15 lignes).
   Formats : gold, essence, healingPotion {id,count}, equipmentRarity + equipmentCount, resources {clé Entrepôt: qté}.
   v3.100.3 : viande/eau sur 6/7 pour rendre la Petite ration (25 viande + 2 eau) craftable dès l'étape 8. */
var STORY_REWARDS = {
  forest_01: { gold: 50 },
  forest_02: { gold: 100, essence: 5 },
  forest_03: { gold: 150, essence: 5 },
  forest_04: { healingPotion: { id: "potion_soin_mineur", count: 1 } },
  forest_05: { gold: 400, essence: 10 },
  forest_06: { gold: 200, resources: { viande: 15 } },
  forest_07: { gold: 150, essence: 5, resources: { eau: 5 } },
  forest_08: { gold: 200, essence: 5 },
  forest_09: { gold: 200, essence: 5 },
  forest_10: { gold: 500, essence: 15 },
  forest_11: { gold: 300, essence: 10 },
  forest_12: { gold: 400, essence: 10 },
  forest_13: { gold: 500, essence: 15 },
  forest_14: { gold: 600, essence: 20, equipmentRarity: "common", equipmentCount: 1 },
  forest_15: { gold: 1000, essence: 30, equipmentRarity: "common", equipmentCount: 1 }
};

/* Libellés des onglets débloqués (clé = game.unlockedTabs), pour l'affichage « Débloque : … ». */
var STORY_TAB_LABELS = {
  combat: "Combat", village: "Village", more: "Héros",
  dungeon: "Donjon", shop: "Boutique", talents: "Talents", equip: "Équipement",
  ascension: "Ascension", map: "Carte du monde", achievements: "Hauts faits",
  bestiary: "Bestiaire", afflictions: "Afflictions", grimoire: "Grimoire"
};

/* Étape 15, condition PROVISOIRE (à remplacer par le halo, voir ROADMAP §7). Niveau 5 ≈ 192 XP ≈ 200 kills
   à 1 XP/kill (niveau 10 ≈ 1250 kills aurait été hors échelle). ASCENSION_CONFIG.computeGain() ≥ 4 à 200 kills. */
var STORY_STEP15_PROVISIONAL = { totalKills: 200, coeurBossKills: 3, heroLevel: 5 };

/* Kills en Forêt : les 2 aventures partagent le même enemyPool, donc somme de killCounts sur ce pool. */
function storyCountForestKills(game) {
  var pool = (window.WORLDS && WORLDS[0] && WORLDS[0].adventures[0]) ? WORLDS[0].adventures[0].enemyPool : ["slime", "wolf", "goblin", "spider"];
  var total = 0;
  pool.forEach(function (id) { total += Number((game.killCounts || {})[id] || 0); });
  return total;
}

function storyHasEquippedItem(game) {
  var eq = game.equipped || {};
  return Object.keys(eq).some(function (slot) { return !!eq[slot]; });
}

function storyCountTrainingUpgrades(game) {
  var ids = window.HEROS_TRAINING_UPGRADE_IDS || ["utrain_power", "utrain_endurance", "utrain_celerity", "utrain_precision", "utrain_will"];
  var total = 0;
  ids.forEach(function (id) { total += Number((game.upgrades || {})[id] || 0); });
  return total;
}

/* Achat Boutique : niveau Économie (u_gold/u_bounty) OU stock de potion possédé (bonus ou soin). */
function storyHasShopPurchase(game) {
  var up = game.upgrades || {};
  if (Number(up.u_gold || 0) + Number(up.u_bounty || 0) >= 1) return true;
  var hasStock = function (obj) {
    return Object.keys(obj || {}).some(function (id) { return Number(obj[id] || 0) > 0; });
  };
  return hasStock(game.potionsOwned) || hasStock(game.healingPotionsOwned);
}

/* Compteurs Histoire tenus par StoryQuestManager (delta de game.totalKills à chaque rendu, voir
   systems/story-quest-system.js:_trackKills) : coeurKills, coeurBossKills. */
function storyCounter(game, key) {
  var st = (game.storyQuests || {}).forest;
  return Number(((st && st.counters) || {})[key] || 0);
}

function storyExplorationDone(questId) {
  return !!(window.ExplorationManager && typeof ExplorationManager.isQuestCompleted === "function" && ExplorationManager.isQuestCompleted(questId));
}

function storyResourceAmount(key) {
  return (window.WarehouseManager && typeof WarehouseManager.getAmount === "function") ? Number(WarehouseManager.getAmount(key) || 0) : 0;
}

function storyCountTalentsBought(game) {
  var t = game.talents || {};
  return Object.keys(t).reduce(function (acc, id) { return acc + (Number(t[id] || 0) > 0 ? 1 : 0); }, 0);
}

function storyCountActiveGrimoireRules(game) {
  return (game.grimoireRules || []).filter(function (r) { return r && r.conditionId && r.actionSlot; }).length;
}

function storyActiveAfflictions() {
  return (window.AfflictionManager && typeof AfflictionManager.getActiveCount === "function") ? AfflictionManager.getActiveCount() : 0;
}

var STORY_QUESTS = {
  forest: {
    id: "forest",
    worldId: "forest",
    title: "Les Braises d'Aeswyn",
    subtitle: "Chapitre 1 — Forêt",
    icon: "🔥",
    steps: [
      /* ---------- Acte I — Le feu et la lame ---------- */
      {
        id: "forest_01",
        title: "Le feu de camp",
        act: "Acte I — Le feu et la lame",
        narrative: {
          objective: "Aeswyn n'est plus qu'un cercle de cendres. Le feu tient encore. Il te faudra une lame pour tenir la nuit.",
          completion: "La lame est tirée. Ce qui rôde à la Lisière ne dort jamais."
        },
        objectiveLabel: "Accepter la quête",
        unlockTabs: ["combat"],
        reward: STORY_REWARDS.forest_01,
        check: function () { return true; },
        progress: function () { return ""; }
      },
      {
        id: "forest_02",
        title: "Premier sang",
        act: "Acte I — Le feu et la lame",
        narrative: {
          objective: "Les bêtes viennent flairer les braises. Écarte-les, et garde ce qu'elles laissent.",
          completion: "Une pièce d'armure grossière, mais c'est un début. Tout se prend sur le corps des vaincus."
        },
        objectiveLabel: "Vaincre 5 ennemis à la Lisière et équiper 1 objet",
        unlockTabs: ["equip"],
        reward: STORY_REWARDS.forest_02,
        linkTo: { tab: "combat" },
        check: function (game) { return storyCountForestKills(game) >= 5 && storyHasEquippedItem(game); },
        progress: function (game) {
          return "Kills " + Math.min(5, storyCountForestKills(game)) + "/5 · Équipé " + (storyHasEquippedItem(game) ? "1/1" : "0/1");
        }
      },
      {
        id: "forest_03",
        title: "Prendre la mesure",
        act: "Acte I — Le feu et la lame",
        narrative: {
          objective: "Chaque combat t'endurcit. Apprends à lire ce que ton corps devient, et à le forger.",
          completion: "Tu connais tes forces. Reste à savoir quoi en faire."
        },
        objectiveLabel: "Atteindre le niveau 2 et acheter 1 amélioration d'entraînement",
        unlockTabs: ["more"],
        reward: STORY_REWARDS.forest_03,
        linkTo: { tab: "more" },
        // v3.100.1 : niveau 2 (≈20 kills) et non 3 (≈57 kills, hors séquence entre les étapes 2 et 5).
        check: function (game) { return Number(game.heroLevel || 1) >= 2 && storyCountTrainingUpgrades(game) >= 1; },
        progress: function (game) {
          return "Niveau " + Math.min(2, Number(game.heroLevel || 1)) + "/2 · Entraînement " + Math.min(1, storyCountTrainingUpgrades(game)) + "/1";
        }
      },
      {
        id: "forest_04",
        title: "Le colporteur",
        act: "Acte I — Le feu et la lame",
        narrative: {
          objective: "Un colporteur a planté sa carriole à la Lisière. Il vend cher, mais il vend ce qu'on ne trouve pas dans la forêt.",
          completion: "L'or a un usage. Le colporteur reviendra tant que tu paieras."
        },
        objectiveLabel: "Gagner 300 or au total et faire 1 achat (Économie ou Potion)",
        unlockTabs: ["shop"],
        reward: STORY_REWARDS.forest_04,
        linkTo: { tab: "shop" },
        check: function (game) { return Number(game.totalGoldEarned || 0) >= 300 && storyHasShopPurchase(game); },
        progress: function (game) {
          return "Or " + formatNumber(Math.min(300, Math.floor(game.totalGoldEarned || 0))) + "/300 · Achat " + (storyHasShopPurchase(game) ? "1/1" : "0/1");
        }
      },
      {
        id: "forest_05",
        title: "Le Roi des marais",
        act: "Acte I — Le feu et la lame",
        narrative: {
          objective: "Quelque chose de lourd traîne dans les marais au bout de la Lisière. La forêt ne s'ouvrira pas tant qu'il vit.",
          completion: "Le Roi Slime s'affaisse. Derrière lui, le Cœur de la forêt. Tu commences à cartographier ce monde et ce qui l'habite."
        },
        objectiveLabel: "Terminer la quête d'aventure « Prouver sa valeur »",
        unlockTabs: ["map", "bestiary", "achievements"],
        reward: STORY_REWARDS.forest_05,
        linkTo: { section: "adventure", cardId: "adv_aq_forest_expedition" },
        check: function (game) { return !!(game.adventureQuestsCompleted || {}).aq_forest_expedition; },
        progress: function (game) { return (game.adventureQuestsCompleted || {}).aq_forest_expedition ? "1/1" : "0/1"; }
      },
      /* ---------- Acte II — Le campement devient village ---------- */
      {
        id: "forest_06",
        title: "La meute affamée",
        act: "Acte II — Le campement devient village",
        narrative: {
          objective: "Les loups tournent autour du camp. Chasse-les, et rapporte de quoi nourrir plus que toi.",
          completion: "Le gibier s'entasse. Un camp qui stocke est déjà un village."
        },
        objectiveLabel: "Terminer « La Meute Affamée » et stocker 20 Viande",
        unlockTabs: ["village"],
        reward: STORY_REWARDS.forest_06,
        linkTo: { section: "adventure", cardId: "adv_hq_wolf_pack" },
        // v3.101.0 : 20 (et non 10) — le stock de départ de 10 viande est fait pour être mangé, pas pour valider l'étape.
        check: function (game) { return !!(game.adventureQuestsCompleted || {}).hq_wolf_pack && storyResourceAmount("viande") >= 20; },
        progress: function (game) {
          return "Meute " + ((game.adventureQuestsCompleted || {}).hq_wolf_pack ? "1/1" : "0/1") + " · Viande " + Math.min(20, Math.floor(storyResourceAmount("viande"))) + "/20";
        }
      },
      {
        id: "forest_07",
        title: "La source tarie",
        act: "Acte II — Le campement devient village",
        narrative: {
          objective: "Sans eau, rien ne tient. Une source jaillit encore derrière les rochers, mais son débit est capricieux.",
          completion: "L'eau coule. Aeswyn respire un peu mieux."
        },
        objectiveLabel: "Terminer l'expédition « La source tarie » (Puits)",
        unlockTabs: [],
        reward: STORY_REWARDS.forest_07,
        linkTo: { section: "expedition", cardId: "exploration_driedSpring" },
        check: function () { return !!(window.WellManager && WellManager.isQuestCompleted()); },
        progress: function () { return (window.WellManager && WellManager.isQuestCompleted()) ? "1/1" : "0/1"; }
      },
      {
        id: "forest_08",
        title: "Le sentier obstrué",
        act: "Acte II — Le campement devient village",
        narrative: {
          objective: "Viande et eau font une ration. Une ration fait une route. Un tronc bloque celle vers une clairière oubliée.",
          completion: "La clairière s'ouvre. Ce qu'il y a au fond mérite qu'on creuse."
        },
        objectiveLabel: "Fabriquer 1 Petite ration et terminer l'expédition « Le sentier obstrué »",
        unlockTabs: [],
        reward: STORY_REWARDS.forest_08,
        linkTo: { section: "expedition", cardId: "exploration_blockedPath" },
        // La ration est consommée par l'expédition : « en stock OU sentier terminé » évite un faux 0/1 après coup.
        check: function () { return storyExplorationDone("blockedPath"); },
        progress: function () {
          var done = storyExplorationDone("blockedPath");
          return "Ration " + ((done || storyResourceAmount("petite_ration") >= 1) ? "1/1" : "0/1") + " · Sentier " + (done ? "1/1" : "0/1");
        }
      },
      {
        id: "forest_09",
        title: "La veine instable",
        act: "Acte II — Le campement devient village",
        narrative: {
          objective: "Au fond de la clairière, la roche est fragile et chaude. Frappe juste, avant qu'elle ne se referme.",
          completion: "La Carrière est ouverte. La pierre était sous tes pieds depuis le début."
        },
        objectiveLabel: "Terminer l'expédition « La veine instable » (Carrière)",
        unlockTabs: [],
        reward: STORY_REWARDS.forest_09,
        linkTo: { section: "expedition", cardId: "exploration_unstableVein" },
        check: function () { return !!(window.MiningManager && MiningManager.isQuestCompleted()); },
        progress: function () { return (window.MiningManager && MiningManager.isQuestCompleted()) ? "1/1" : "0/1"; }
      },
      {
        id: "forest_10",
        title: "Les fondations",
        act: "Acte II — Le campement devient village",
        narrative: {
          objective: "Bois, planches, pierre. Assemble-les, et Aeswyn aura son premier mur.",
          completion: "L'Atelier se dresse. Ce n'est plus un camp."
        },
        objectiveLabel: "Construire l'Atelier de Construction (chaîne de 4 objectifs)",
        unlockTabs: [],
        reward: STORY_REWARDS.forest_10,
        linkTo: { tab: "village" },
        check: function (game) { return !!((game.workshopUnlock || {}).completed); },
        progress: function (game) {
          var wu = game.workshopUnlock || {};
          var total = (window.WORKSHOP_UNLOCK_STEPS || []).length || 4;
          return (wu.completed ? total : Math.min(total, Number(wu.currentStep || 0))) + "/" + total;
        }
      },

      /* ---------- Acte III — Le héros s'affirme ---------- */
      {
        id: "forest_11",
        title: "L'éveil des talents",
        act: "Acte III — Le héros s'affirme",
        narrative: {
          objective: "Chaque niveau franchi laisse une trace en toi. Il est temps de choisir quoi en faire.",
          completion: "Un talent gravé. Il y en aura d'autres."
        },
        // Niveau ≥ 3 déplacé ici depuis l'étape 3 (décision Seb, v3.100.1) : au moins 2 points quand l'arbre s'ouvre.
        objectiveLabel: "Atteindre le niveau 3 et dépenser 1 point de talent",
        unlockTabs: ["talents"],
        reward: STORY_REWARDS.forest_11,
        linkTo: { tab: "talents" },
        check: function (game) { return Number(game.heroLevel || 1) >= 3 && storyCountTalentsBought(game) >= 1; },
        progress: function (game) {
          return "Niveau " + Math.min(3, Number(game.heroLevel || 1)) + "/3 · Talent " + Math.min(1, storyCountTalentsBought(game)) + "/1";
        }
      },
      {
        id: "forest_12",
        title: "Le grimoire du veilleur",
        act: "Acte III — Le héros s'affirme",
        narrative: {
          objective: "Au Cœur, les combats s'enchaînent trop vite pour tout décider à la main. Écris tes réflexes.",
          completion: "Le Grimoire agit à ta place quand tu ne regardes pas. Apprends à lui faire confiance."
        },
        objectiveLabel: "Remporter 10 victoires au Cœur de la forêt et activer 1 règle du Grimoire",
        unlockTabs: ["grimoire"],
        reward: STORY_REWARDS.forest_12,
        linkTo: { tab: "grimoire" },
        check: function (game) { return storyCounter(game, "coeurKills") >= 10 && storyCountActiveGrimoireRules(game) >= 1; },
        progress: function (game) {
          return "Cœur " + Math.min(10, storyCounter(game, "coeurKills")) + "/10 · Règle " + Math.min(1, storyCountActiveGrimoireRules(game)) + "/1";
        }
      },
      {
        id: "forest_13",
        title: "Marques du corrompu",
        act: "Acte III — Le héros s'affirme",
        narrative: {
          objective: "Certaines bêtes portent une marque. Provoque-la, et vois ce qu'elle t'apporte. Un jour elles viendront sans qu'on les appelle.",
          completion: "La marque pique, mais elle paie. Souviens-t'en."
        },
        // Variante B (décision Seb) : 2 afflictions actives simultanément + 10 victoires au Cœur (compteur global,
        // pas de comptage « sous affliction »). Les victoires de l'étape 12 comptent déjà : la marque n'exige que l'activation.
        objectiveLabel: "Activer 2 afflictions en même temps et compter 10 victoires au Cœur",
        unlockTabs: ["afflictions"],
        reward: STORY_REWARDS.forest_13,
        linkTo: { tab: "afflictions" },
        check: function (game) { return storyActiveAfflictions() >= 2 && storyCounter(game, "coeurKills") >= 10; },
        progress: function (game) {
          return "Afflictions " + Math.min(2, storyActiveAfflictions()) + "/2 · Cœur " + Math.min(10, storyCounter(game, "coeurKills")) + "/10";
        }
      },
      {
        id: "forest_14",
        title: "La tanière du Basilic",
        act: "Acte III — Le héros s'affirme",
        narrative: {
          objective: "Sous les racines, une tanière. Les marques n'y ont pas cours — seule ta lame compte. Prends un ticket, et redescends vivant.",
          completion: "Le Basilic recule. Ses éclats ouvriront des portes que l'or ne peut pas."
        },
        objectiveLabel: "Vaincre le Donjon I",
        unlockTabs: ["dungeon"],
        reward: STORY_REWARDS.forest_14,
        linkTo: { tab: "dungeon" },
        check: function (game) { return !!((game.dungeonTierCleared || {})[1]); },
        progress: function (game) { return (game.dungeonTierCleared || {})[1] ? "1/1" : "0/1"; }
      },

      /* ---------- Acte IV — L'Aether ---------- */
      {
        id: "forest_15",
        title: "Les braises s'éveillent",
        act: "Acte IV — L'Aether",
        narrative: {
          objective: "La braise sous Aeswyn ne s'éteint plus. Elle demande quelque chose. Un jour tu devras tout rendre à la forêt pour renaître plus fort — pas aujourd'hui, mais la porte est ouverte.",
          completion: "Tu sais désormais ce qu'est l'Aether. Le désert t'attend. Reviens quand la forêt te l'ordonnera."
        },
        objectiveLabel: "Vaincre 200 ennemis, terrasser 3 fois le Seigneur de guerre orc au Cœur et atteindre le niveau 5",
        unlockTabs: ["ascension"],
        reward: STORY_REWARDS.forest_15,
        linkTo: { tab: "combat" },
        check: function (game) {
          var c = STORY_STEP15_PROVISIONAL;
          return Number(game.totalKills || 0) >= c.totalKills && storyCounter(game, "coeurBossKills") >= c.coeurBossKills && Number(game.heroLevel || 1) >= c.heroLevel;
        },
        progress: function (game) {
          var c = STORY_STEP15_PROVISIONAL;
          return "Kills " + Math.min(c.totalKills, Math.floor(game.totalKills || 0)) + "/" + c.totalKills
            + " · Seigneur de guerre orc " + Math.min(c.coeurBossKills, storyCounter(game, "coeurBossKills")) + "/" + c.coeurBossKills
            + " · Niveau " + Math.min(c.heroLevel, Number(game.heroLevel || 1)) + "/" + c.heroLevel;
        }
      }
    ]
  }
};

window.STORY_REWARDS = STORY_REWARDS;
window.STORY_TAB_LABELS = STORY_TAB_LABELS;
window.STORY_STEP15_PROVISIONAL = STORY_STEP15_PROVISIONAL;
window.STORY_QUESTS = STORY_QUESTS;
