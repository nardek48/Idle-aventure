"use strict";
/* data/story-quests.js — questline « Les Braises d'Aeswyn » (chapitre 1, Forêt) : 16 étapes séquentielles (v3.107.8 : « Les fondations » sortie ; v3.109.0 : « Franchir la Lisière » ajoutée ; v3.259.0 : « Ce que la brume reprend » ajoutée, déplacée en fin d'Acte II en v3.260.0).
   Accepter une étape débloque ses onglets ; l'objectif enseigne la mécanique ; réclamer donne la récompense. Logique : systems/story-quest-system.js */

/* Récompenses placeholder, regroupées ici pour le passage d'équilibrage or ultérieur. forest_10 (« Les fondations »)
   reste ici : réclamée via MissionBoard._workshopMissions (v3.107.8). Formats : gold, essence, healingPotion {id,count},
   equipmentRarity + equipmentCount, resources {clé Entrepôt: qté}. Viande/eau sur 6/7 : Petite ration (8 viande + 4 eau) craftable dès l'étape 8. */
/* v3.249.0 (idée Seb 15/09/2026) — ARME OFFERTE À LA PREMIÈRE ÉTAPE.
   « Le feu de camp » ne donnait que 50 or, et le narratif promettait déjà une lame : « Il te
   faudra une lame pour tenir la nuit ». Elle est maintenant réellement remise, ce qui règle
   deux choses d'un coup :
     - l'étape SUIVANTE (forest_02) exige « équiper 1 objet » : le joueur a désormais de quoi
       le faire tout de suite, et la leçon devient « je reçois une arme, je l'équipe » ;
     - plus aucun héros ne peut se retrouver bloqué faute d'arme. Mesuré
       (sim/forecast-calibration-bench.js) sur « Prouver sa valeur », sans rien d'autre :
       sans arme, 83 à 100 % d'échec selon la classe ; avec cette arme, 0 % pour les trois.
   Valeur 15 : milieu de la fourchette commune (10-25), donc en dessous de l'arme de la vitrine
   de départ (25) — l'échoppe garde tout son intérêt. Déclinée par classe : un Mage ne peut pas
   se servir d'une épée (voir generateEquipmentItem et EQUIP_SHOP_STARTER).
   v3.260.0 (décision Seb 16/09/2026) : l'arme de 1 dégât n'est plus équipée à la création, et
   celle-ci devient la RÉCOMPENSE de « Premier sang ». Le premier combat se joue à mains nues :
   mesuré (sim/premier-sang-bench.js), 90 à 99 % de réussite sur 5 victoires sans potion, fini
   à 14-24 % des PV — tendu sans bloquer (une mort ne retire aucun kill). La leçon « équiper »
   passe à « Prendre la mesure ». */
var STORY_STARTER_WEAPON = {
  slot: "weapon",
  stat: "tapDmg",
  value: 15,
  rarity: "common",
  byClass: {
    knight: { name: "Lame ébréchée", icon: "sword" },
    archer: { name: "Arc de fortune", icon: "bow" },
    mage: { name: "Bâton noueux", icon: "staff" }
  }
};

var STORY_REWARDS = {
  forest_01: { gold: 50 },
  forest_02: { gold: 100, essence: 5, equipmentItem: STORY_STARTER_WEAPON }, // v3.260.0 : l'arme passe ici (décision Seb)
  forest_03: { gold: 150, essence: 5 },
  forest_04: { healingPotion: { id: "potion_soin_mineur", count: 1 } },
  forest_05: { gold: 400, essence: 10, potions: { potion_power: 1 } }, // v3.115.0 : découverte des potions per-run
  forest_06: { gold: 200, resources: { viande: 15 } },
  forest_brume: { gold: 150, resources: { seve_aeswyn: 3 } }, // v3.259.0 (C-4) : les 3 Sève que réclamera l'offrande aux braises (forest_15)
  forest_07: { gold: 150, essence: 5, resources: { eau: 5 } },
  forest_08: { gold: 200, essence: 5 },
  forest_09: { gold: 200, essence: 5 },
  forest_crossing: { gold: 250, essence: 10 }, // v3.109.0 : Franchir la Lisière (placeholder, même échelle que 08/09)
  forest_10: { gold: 500, essence: 15, potions: { potion_endurance: 1, potion_power: 1 } }, // v3.115.0 : kit avant le Cœur
  forest_11: { gold: 300, essence: 10 },
  forest_12: { gold: 400, essence: 10 },
  forest_13: { gold: 500, essence: 15 },
  forest_14: { gold: 600, essence: 20, equipmentRarity: "common", equipmentCount: 1 },
  forest_wenna: { gold: 500, essence: 15 }, // v3.268.0 (L-2) : Wenna rejoint
  forest_15: { gold: 1000, essence: 30, equipmentRarity: "common", equipmentCount: 1 },
  desert_01: { gold: 600, essence: 20 }, // v3.300.0 (W-2) : provisoire, à caler au banc avec l'acte I
  desert_02: { gold: 700, essence: 20 }, // v3.302.0 : provisoire, même remarque
  desert_03: { gold: 750, essence: 20 }, // v3.304.0 : provisoire, même remarque
  desert_04: { gold: 800, essence: 25 }, // v3.305.0 : provisoire, même remarque
  desert_05: { gold: 850, essence: 25 }, // v3.306.0 : provisoire, même remarque
  desert_06: { gold: 900, essence: 30 }, // v3.310.0 : provisoire, même remarque
  desert_07: { gold: 950, essence: 30 }, // v3.310.0 : provisoire, même remarque
  desert_08: { gold: 1000, essence: 35 }, // v3.311.0 : provisoire, même remarque
  desert_09: { gold: 1050, essence: 35 }, // v3.312.0 : provisoire, même remarque
  desert_10: { gold: 1100, essence: 40 }, // v3.312.0 : provisoire, même remarque
  desert_11: { gold: 2150, essence: 40 }, // v3.314.0 (W-4a1) : provisoire ; v3.330.0 : +1 000 (banc « or par acte », E2/E6)
  desert_12: { gold: 2200, essence: 45 }, // v3.315.0 (W-4a2) : provisoire ; v3.330.0 : +1 000
  desert_13: { gold: 2250, essence: 45 }, // v3.316.0 (W-4b) : provisoire ; v3.330.0 : +1 000
  desert_14: { gold: 1300, essence: 50 }, // v3.317.0 (W-4c) : provisoire, même remarque
  desert_15: { gold: 1500, essence: 60 } // v3.319.0 (W-4d) : fin d'acte III, provisoire
};

/* Libellés des onglets débloqués (clé = game.unlockedTabs), pour l'affichage « Débloque : … ». */
var STORY_TAB_LABELS = {
  combat: "Combat", village: "Village", more: "Héros",
  dungeon: "Donjon", shop: "Boutique", talents: "Talents", equip: "Équipement",
  ascension: "Ascension", map: "Carte du monde", achievements: "Hauts faits",
  bestiary: "Bestiaire", grimoire: "Grimoire", companions: "Compagnons"
};

/* Étape 15 — v3.133.0 (audit Forêt, décision Seb) : les 200 kills (pur temps d'attente, ~100 kills de farm libre non guidé)
   sont remplacés par une OFFRANDE aux braises au Campement : 3 Sève d'Aeswyn (Petite Aventure) + 1 Ration moyenne (chaîne
   Village). L'Ascension elle-même reste gatée à 200 kills (ASCENSION_CONFIG.minKillsToAscend) — « pas aujourd'hui ».
   Consommée par StoryQuestManager.offerToEmbers(), compteur counters.offeringDone (0/1). */
var STORY_STEP15_OFFERING = { seve_aeswyn: 3, ration: 1 };

/* v3.133.0 : ressources encore à réunir pour l'offrande (0 si tout est là). */
function storyOfferingMissing(offering) {
  var missing = 0;
  Object.keys(offering || {}).forEach(function (key) { missing += Math.max(0, Number(offering[key]) - storyResourceAmount(key)); });
  return missing;
}

/* Kills en Forêt : les 2 aventures partagent le même enemyPool, donc somme de killCounts sur ce pool. */
function storyCountForestKills(game) {
  var pool = (window.WORLDS && WORLDS[0] && WORLDS[0].adventures[0]) ? WORLDS[0].adventures[0].enemyPool : (window.STORY_COEUR_BASE_POOL || ["slime", "goblin", "spider"]); // v3.135.0 : repli aligné sur le pool réel
  var total = 0;
  pool.forEach(function (id) { total += Number((game.killCounts || {})[id] || 0); });
  return total;
}

/* v3.260.0 : kills à la Lisière depuis l'acceptation de forest_02 (forestKillsBase).
   v3.293.0 : plus lu par l'étape — conservé pour la migration des saves (_migrateV3293). */
function storyForestKillsSinceAccept(game) {
  var base = storyCounter(game, "forestKillsBase");
  return Math.max(0, storyCountForestKills(game) - base);
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

/* Achat Boutique : stock de potion possédé (bonus ou soin). v3.313.0 : l'onglet Économie
   (u_gold/u_bounty) n'existe plus. */
function storyHasShopPurchase(game) {
  var hasStock = function (obj) {
    return Object.keys(obj || {}).some(function (id) { return Number(obj[id] || 0) > 0; });
  };
  return hasStock(game.potionsOwned) || hasStock(game.healingPotionsOwned);
}

/* Compteurs Histoire tenus par StoryQuestManager (systems/story-quest-system.js:_trackKills).
   v3.293.0 : coeurKills / coeurReached ne sont plus alimentés (farm libre retiré), lus par la migration. */
function storyCounter(game, key) {
  return storyChapterCounter(game, "forest", key);
}

/* v3.297.0 (W-1a) : compteur d'un chapitre donné — les étapes du Désert liront le leur. */
function storyChapterCounter(game, chapterId, key) {
  var st = (game.storyQuests || {})[chapterId];
  return Number(((st && st.counters) || {})[key] || 0);
}

/* v3.297.0 (W-1a) — REGISTRE DES DEUX AXES (bible, partie III §3). Chaque choix pesant
   noté dans un chapitre (StoryQuestManager.recordChoice) pèse sur un ou plusieurs pôles.
   Le registre se calcule (StoryQuestManager.getRegister), il n'est jamais stocké à part.
   « noms » : étape 5 du Désert ; « roi » : étape 18 (la branche « soi » compte aussi pour
   le Chaos, sans effet visible en v1). */
var STORY_CHOICE_AXES = {
  noms: { deterrer: ["donner"], laisser: ["garder"] },
  /* v3.314.0 (W-4a1) : second choix pesant du Désert. Même polarité que « les noms » —
     laisser en place = garder, emporter = donner. À REVOIR avec le registre des axes (W-5) :
     la conception du registre n'était pas disponible à l'écriture de l'acte III. */
  serment: { relever: ["donner"], laisser: ["garder"] },
  roi: { soi: ["soi", "chaos"], aeswyn: ["aeswyn"] }
};

/* v3.293.0 (règle Seb 18/09/2026) : storyResetLisiere, storyLisiereCrossingProgress et
   storyGoToCoeur retirées — elles déplaçaient le joueur pour le farm libre, qui n'existe plus.
   Les étapes concernées lisent désormais leur run défini (data/adventure-quests.js). */
function storyAdvDone(game, questId) {
  return !!(game.adventureQuestsCompleted || {})[questId];
}

/* Avancement d'une étape de run pour l'affichage (plein une fois la quête terminée). */
function storyAdvProgress(game, questId, stepId, target) {
  if (storyAdvDone(game, questId)) return target;
  var p = (game.adventureQuestProgress || {})[questId] || {};
  return Math.min(target, Number(p[stepId] || 0));
}

/* v3.124.0 (retrait ancien moteur) : lecture directe des flags de progression, sans passer par
   un manager (ExplorationManager retiré). completionFlag/unlockFlag connus par questId — même
   contrat que SceneRunManager.isQuestCompleted(), juste indexé par l'ancien nom de quête plutôt
   que par templateId (ces flags sont partagés, écrits par le scene-engine désormais). */
var STORY_EXPLORATION_FLAGS = {
  blockedPath: { completionFlag: "blockedPathCompleted", unlockFlag: "forgottenClearingUnlocked" },
  unstableVein: { completionFlag: "unstableVeinDiscoveryCompleted", unlockFlag: "quarryUnlocked" },
  driedSpring: { completionFlag: "driedSpringDiscoveryCompleted", unlockFlag: "wellUnlocked" },
  ironLode: { completionFlag: "ironLodeDiscoveryCompleted", unlockFlag: "mineUnlocked" },
  silentGrove: { completionFlag: "silentGroveDiscoveryCompleted", unlockFlag: "sawmillUnlocked" },
  fallowField: { completionFlag: "fallowFieldDiscoveryCompleted", unlockFlag: "farmUnlocked" }
};

function storyExplorationDone(questId) {
  var flags = STORY_EXPLORATION_FLAGS[questId];
  if (!flags || !game.explorationProgression) return false;
  return !!(game.explorationProgression[flags.completionFlag] || game.explorationProgression[flags.unlockFlag]);
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

/* v3.245.0 : nombre de Marques du run de donjon en cours (ex-afflictions actives). */
function storyActiveAfflictions() {
  return (window.AfflictionManager && typeof AfflictionManager.getActiveCount === "function") ? AfflictionManager.getActiveCount() : 0;
}

var STORY_QUESTS = {
  forest: {
    id: "forest",
    worldId: "forest",
    title: "Les Braises d'Aeswyn",
    subtitle: "Chapitre 1 — Forêt",
    endText: "Chapitre terminé — le Désert t'attend.", // v3.297.0 : texte de fin propre au chapitre
    icon: "images/Icons/camp/campfire.png",
    steps: [
      /* ---------- Acte I — Le feu et la lame ---------- */
      {
        id: "forest_01",
        title: "Le feu de camp",
        act: "Acte I — Le feu et la lame",
        narrative: {
          objective: "Aeswyn n'est plus qu'un cercle de cendres. Le feu tient encore. Il te faudra une lame pour tenir la nuit.",
          completion: "Tu te lèves. Ce qui rôde à la Lisière ne dort jamais." // v3.260.0 : plus de lame remise ici (texte validé Seb)
        },
        objectiveLabel: "Accepter la quête",
        unlockTabs: ["combat"],
        reward: STORY_REWARDS.forest_01,
        // v3.116.0 : tutoriel migré vers GENERIC_TUTORIALS.camp_welcome (ui/tutorial-view.js) —
        // ici il exigeait l'étape acceptée, or l'arrivée au Campement précède toujours l'acceptation.
        check: function () { return true; },
        progress: function () { return ""; }
      },
      {
        id: "forest_02",
        title: "Premier sang",
        act: "Acte I — Le feu et la lame",
        narrative: {
          objective: "Les bêtes viennent flairer les braises. Écarte-les, et garde ce qu'elles laissent.",
          completion: "Sous la dernière bête, une arme oubliée. Grossière, mais c'est un début. Tout se prend sur le corps des vaincus."
        },
        objectiveLabel: "Terminer « Premier sang » : vaincre 5 ennemis à la Lisière", // v3.293.0 : run défini
        unlockTabs: ["equip"],
        reward: STORY_REWARDS.forest_02,
        linkTo: { section: "adventure", cardId: "adv_aq_story_premier_sang" }, // v3.293.0 : plus de farm libre
        // v3.107.7 : tutorial déclaratif — popup pédagogique affiché une seule fois, à la première
        // arrivée sur l'onglet cible (tab) une fois l'étape acceptée. Voir switchTab() (ui-root.js)
        // pour le déclenchement, ui/tutorial-view.js pour le rendu.
        tutorial: {
          tab: "combat",
          icon: "images/Icons/combat_stats/stat_attack.png",
          title: "Le combat",
          points: [
            { icon: "images/Icons/combat_stats/stat_attack.png", text: "Attaque de base — frappe l'ennemi sans coûter de ressource. Toujours disponible." },
            { icon: "images/Icons/scene/node_discovery.png", text: "Compétences (1/2/3) — coûtent de la ressource de ta classe (Rage, Concentration ou Mana selon ton héros), pour plus de dégâts ou un effet spécial." },
            { icon: "images/Icons/combat_stats/stat_defense.png", text: "Défense — réduit ou évite le prochain coup. Utile quand ce bandeau apparaît sous la barre de vie de l'ennemi : il prépare une attaque plus forte.", preview: "charge" },
            { icon: "images/Icons/combat_stats/stat_speed.png", text: "Jauge de célérité — se remplit à chaque round. Une fois pleine, tu frappes deux fois d'affilée." }
          ]
        },
        /* v3.293.0 (règle Seb) : les 5 victoires se jouent dans le run « Premier sang »
           (data/adventure-quests.js), plus sur l'onglet Combat nu. Mêmes ennemis. */
        check: function (game) { return storyAdvDone(game, "aq_story_premier_sang"); },
        progress: function (game) {
          return "Kills " + storyAdvProgress(game, "aq_story_premier_sang", "kills_premier_sang", 5) + "/5";
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
        objectiveLabel: "Équiper ton arme et acheter 1 amélioration d'entraînement", // v3.260.0 : la leçon « équiper » arrive avec l'arme
        unlockTabs: ["more"],
        reward: STORY_REWARDS.forest_03,
        linkTo: { tab: "more", subTab: "amelioration" }, // v3.107.1 : direct sur le sous-onglet Amélioration (décision Seb)
        // v3.107.9 : chaque stat détaillée (décision Seb).
        tutorial: {
          tab: "more",
          icon: "images/Icons/system/upgrade.png",
          title: "L'Amélioration",
          points: [
            { icon: "images/Icons/system/upgrade.png", text: "Chaque amélioration augmente une statistique de façon permanente contre de l'or. Le prix grimpe à chaque achat — étale tes investissements plutôt que de tout miser sur une seule stat." },
            { icon: "images/Icons/improvement_icons/power.png", text: "Puissance — dégâts de ton attaque de base." },
            { icon: "images/Icons/combat_stats/stat_critical.png", text: "Précision — chance de coup critique." },
            { icon: "images/Icons/scene/node_discovery.png", text: "Volonté — dégâts bonus en cas de critique." },
            { icon: "images/Icons/combat_stats/stat_health.png", text: "Endurance — PV maximum et une partie de ta défense." },
            { icon: "images/Icons/combat_stats/stat_speed.png", text: "Célérité — remplit ta jauge de combat plus vite (frappe bonus plus fréquente)." }
          ]
        },
        // v3.109.0 : condition « niveau 2 » retirée — l'XP est par mission depuis P4 (15/étape Histoire), le niveau 2
        // (20 XP) est atteint en réclamant forest_02, avant même d'accepter celle-ci : condition morte, libellé trompeur.
        check: function (game) { return storyHasEquippedItem(game) && storyCountTrainingUpgrades(game) >= 1; },
        progress: function (game) {
          return "Équipé " + (storyHasEquippedItem(game) ? "1/1" : "0/1") + " · Entraînement " + Math.min(1, storyCountTrainingUpgrades(game)) + "/1";
        }
      },
      {
        id: "forest_04",
        title: "Le colporteur",
        act: "Acte I — Le feu et la lame",
        narrative: {
          objective: "Un colporteur a planté sa carriole à la Lisière. Sarkel, il s'appelle. Il vend cher, mais il vend ce qu'on ne trouve pas dans la forêt.",
          completion: "L'or a un usage. Sarkel reviendra tant que tu paieras. Il vient de plus loin que la forêt, et il en parle peu."
        },
        objectiveLabel: "Faire 1 achat en boutique (Économie ou Potion)",
        unlockTabs: ["shop"],
        reward: STORY_REWARDS.forest_04,
        linkTo: { tab: "shop", subTab: "potions" }, // v3.260.0 (retour Seb) : arrive sur Potions, pas sur Économie
        // v3.107.9 : potions détaillées (décision Seb).
        tutorial: {
          tab: "shop",
          icon: "images/Icons/subtabs/equipment_shop.png",
          title: "La Boutique",
          points: [
            { icon: "images/Icons/subtabs/equipment_shop.png", text: "La Boutique vend des potions et des améliorations d'Économie contre de l'or." },
            { icon: "images/Icons/subtabs/potions.png", text: "Potions de soin — sur le 2e onglet de la Boutique. Mineure (35 % PV, 150 or) ou Majeure (60 % PV, 400 or). Utilisables en combat comme une action à part entière — elles consomment ton tour." },
            { icon: "images/Icons/system/warning.png", text: "Maximum 2 potions par sortie — pense à te ménager pour la suite du combat." }
          ]
        },
        // v3.107.1 : condition « 300 or gagné » retirée (décision Seb) — pur temps d'attente passive,
        // le joueur gagne l'or de toute façon en jouant. Seul l'achat compte désormais.
        check: function (game) { return storyHasShopPurchase(game); },
        progress: function (game) {
          return "Achat " + (storyHasShopPurchase(game) ? "1/1" : "0/1");
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
        objectiveLabel: "Terminer « La Meute Affamée »",
        unlockTabs: ["village"],
        reward: STORY_REWARDS.forest_06,
        linkTo: { section: "adventure", cardId: "adv_hq_wolf_pack" },
        // v3.105.1 : condition viande retirée — le bâtiment Chasse (seule vraie source) est débloqué PAR cette
        // quête, verrou de progression impossible à lever (20 viande inatteignable avant sa propre récompense).
        check: function (game) { return !!(game.adventureQuestsCompleted || {}).hq_wolf_pack; },
        progress: function (game) {
          return "Meute " + ((game.adventureQuestsCompleted || {}).hq_wolf_pack ? "1/1" : "0/1");
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
        linkTo: { section: "expedition", cardId: "scene_source_tarie" }, // v3.123.0 (Lot S2b) : migrée vers le scene-engine
        check: function () { return storyExplorationDone("driedSpring"); },
        progress: function () { return storyExplorationDone("driedSpring") ? "1/1" : "0/1"; }
      },
      {
        id: "forest_08",
        title: "Le sentier obstrué",
        act: "Acte II — Le campement devient village",
        narrative: {
          objective: "Viande et eau font une ration. Une ration fait une route. Un tronc bloque celle vers une clairière oubliée.",
          completion: "La clairière s'ouvre. Ce qu'il y a au fond mérite qu'on creuse.",
          // v3.197.0 (passe de ton, bible B §4.7) : Brannoc laisse échapper — graine du Veilleur (pilier 3).
          dialogue: [
            { who: "Brannoc", text: "Un tronc, ça se scie. Celui-là, c'est la troisième fois que je le trouve en travers. La première… enfin." },
            { who: "Brannoc", text: "Il en est venu un autre, avant toi. Il n'est pas revenu. Bon. Pousse, je tire." }
          ]
        },
        objectiveLabel: "Fabriquer 1 Petite ration et terminer l'expédition « Le sentier obstrué »",
        unlockTabs: [],
        reward: STORY_REWARDS.forest_08,
        linkTo: { section: "expedition", cardId: "scene_sentier_obstrue" }, // v3.122.0 (Lot S2a) : migrée vers le scene-engine
        // v3.107.12 : popup déclenché sur Village (là où se trouve l'atelier Cuisine de camp),
        // pas sur l'écran de l'expédition elle-même — le craft doit se faire AVANT de lancer.
        tutorial: {
          tab: "village",
          icon: "images/Icons/subtabs/inventory.png",
          title: "Fabriquer une ration",
          points: [
            { icon: "images/Icons/subtabs/inventory.png", text: "Cette expédition consomme une Petite ration — il faut d'abord la fabriquer avant de partir." },
            { icon: "images/Icons/quests/mission_construction.png", text: "Rends-toi au Village, dans l'atelier Cuisine de camp (bâtiment Chasse)." },
            { icon: "images/Icons/quests/ration_reward.png", text: "Choisis la recette Petite ration (8 Viande + 4 Eau) et clique sur Fabriquer." },
            { icon: "images/Icons/quests/quest_adventure.png", text: "Une fois la ration en stock, reviens sur ce tableau et lance l'expédition — elle la consommera automatiquement." }
          ]
        },
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
        linkTo: { section: "expedition", cardId: "scene_veine_instable" }, // v3.123.0 (Lot S2b) : migrée vers le scene-engine
        check: function () { return storyExplorationDone("unstableVein"); },
        progress: function () { return storyExplorationDone("unstableVein") ? "1/1" : "0/1"; }
      },
      /* v3.259.0 (Cartes Vivantes, lot C-4) : introduction du Recouvrement par les anciens.
         v3.260.0 (retour de jeu Seb) : déplacée après « La veine instable », en fin d'Acte II.
         Un secteur coûte une Petite ration (8 viande + 4 eau) : juste après la Meute, l'eau
         n'existait pas encore et la fabrication n'était pas enseignée (forest_08) — blocage. Bible A pilier 3 et bible C §4.4 : les anciens disent « elle »,
         jamais « Aether » — le mot reste à Orwen pour forest_15 (« Elle prend ce qu'on est »),
         qui répond à « Autour, c'est elle ». La puissance est dite par ce qu'elle FAIT, pas
         nommée ; « vivre avec » est la dernière réplique d'Orwen, jamais une leçon du
         narrateur ; le mot « Recouvrement » n'est que dans l'interface. Aldric se tait, comme
         à forest_15. Textes validés par Seb le 16/09/2026. */
      {
        id: "forest_brume",
        title: "Ce que la brume reprend",
        act: "Acte II — Le campement devient village",
        narrative: {
          objective: "Orwen t'attend au bord du village, une carte roulée sous le bras. Il ne l'a jamais montrée à personne.",
          completion: "Un secteur de moins pour la brume. Orwen a roulé la carte moins serré. Il n'a dit qu'une chose de plus : ce qu'on tient, on peut le perdre. Et on y retourne.",
          dialogue: [
            { who: "Orwen", text: "Regarde. Là, c'est nous. Autour, c'est elle." },
            { who: "Wenna", text: "La brume ? Elle bouge pas, la brume." },
            { who: "Orwen", text: "Elle bouge quand on lui laisse la place. Partout où personne ne va, elle revient. Ici elle ne revient pas, parce qu'on y vit." },
            { who: "Brannoc", text: "On a tenu le gué, une fois. Trois jours. Puis on a eu autre chose à faire." },
            { who: "Orwen", text: "On ne la chasse pas. On lui reprend un bout, on le tient, et quand elle le reprend, on y retourne. C'est comme ça qu'on vit ici." },
            { who: null, text: "Aldric a déjà tourné le dos. Le moulin, lui, ne se tient pas tout seul." }
          ]
        },
        objectiveLabel: "Libérer un secteur de la carte de la Forêt",
        unlockTabs: [],
        reward: STORY_REWARDS.forest_brume,
        /* Pas de carte de mission : la carte vivante est une sous-vue de l'onglet Carte, ouverte
           par son propre point d'entrée (ui/living-map-view.js), comme le scene-engine a le sien. */
        linkTo: { section: "map", cardId: "livingmap_forest" },
        check: function () {
          return !!(window.LivingMapManager && LivingMapManager.getSummary("forest").libere > 0);
        },
        progress: function () {
          var n = window.LivingMapManager ? LivingMapManager.getSummary("forest").libere : 0;
          return "Secteurs libérés " + Math.min(1, n) + "/1";
        }
      },

      /* ---------- Acte III — Le héros s'affirme ---------- */
      {
        // v3.109.0 : après « Prouver sa valeur », le joueur reste positionné en Lisière (spawnFor restaure les index) ;
        // rien ne lui disait d'enchaîner le farm libre jusqu'au Roi Slime pour atteindre le Cœur (forest_12 restait à 0/10).
        id: "forest_crossing",
        title: "Franchir la Lisière",
        act: "Acte III — Le héros s'affirme",
        narrative: {
          objective: "Le Roi des marais est tombé, mais la Lisière n'a pas fini de te tester. Traverse-la une dernière fois, et ne t'arrête plus avant le Cœur.",
          completion: "Les arbres se referment derrière toi. Ici, la forêt ne chuchote plus : elle observe."
        },
        objectiveLabel: "Terminer « Franchir la Lisière » : 9 ennemis puis le Roi Slime, d'une traite",
        unlockTabs: [],
        reward: STORY_REWARDS.forest_crossing,
        // v3.293.0 (règle Seb) : run défini, même composition que l'ancienne traversée en farm libre
        linkTo: { section: "adventure", cardId: "adv_aq_story_lisiere" },
        check: function (game) { return storyAdvDone(game, "aq_story_lisiere"); },
        progress: function (game) {
          var boss = storyAdvProgress(game, "aq_story_lisiere", "boss_lisiere", 1);
          return "Lisière " + (storyAdvProgress(game, "aq_story_lisiere", "kills_lisiere", 9) + boss) + "/10";
        }
      },
      {
        id: "forest_11",
        title: "L'éveil des talents",
        act: "Acte III — Le héros s'affirme",
        narrative: {
          objective: "Chaque niveau franchi laisse une trace en toi. Il est temps de choisir quoi en faire.",
          completion: "Un talent gravé. Il y en aura d'autres."
        },
        // v3.109.0 : condition « niveau 3 » retirée (morte) — à cette étape l'XP Histoire seule (≥ 150 XP) donne le niveau 4,
        // soit 3 points de talent disponibles.
        objectiveLabel: "Dépenser 1 point de talent",
        unlockTabs: ["talents"],
        reward: STORY_REWARDS.forest_11,
        linkTo: { tab: "talents" },
        // v3.107.9 : talents détaillés, réversibilité vérifiée dans le code (respecTalents).
        tutorial: {
          tab: "talents",
          icon: "images/Icons/quests/quest_side.png",
          title: "Les Talents",
          points: [
            // v3.327.0 : talents par classe (conception Talents v1.1)
            { icon: "images/Icons/quests/quest_side.png", text: "Chaque niveau franchi te donne un point de talent. Chaque acte de l'Histoire fixe combien tu peux en placer : le surplus attend en réserve." },
            { icon: "images/Icons/plots/preserved_wood.png", text: "Ton arbre est propre à ta classe : un tronc, puis deux voies qui changent ta façon de combattre. Au bout de chaque voie, une clé de voûte — tu n'en choisiras qu'une." },
            { icon: "images/Icons/system/reset.png", text: "Rien n'est figé : la réinitialisation est gratuite, hors d'une sortie en cours. Essaie, compare, recommence." }
          ]
        },
        check: function (game) { return storyCountTalentsBought(game) >= 1; },
        progress: function (game) {
          return "Talent " + Math.min(1, storyCountTalentsBought(game)) + "/1";
        }
      },
      {
        id: "forest_12",
        title: "Le grimoire du veilleur",
        act: "Acte III — Le héros s'affirme",
        narrative: {
          objective: "Au Cœur, les combats s'enchaînent trop vite pour tout décider à la main. Écris tes réflexes.",
          completion: "Le Grimoire agit à ta place quand tu ne regardes pas. Quelqu'un l'a tenu avant toi : les pages du début sont d'une autre main. Apprends à lui faire confiance."
        },
        objectiveLabel: "Activer 1 règle du Grimoire et terminer « Tenir le Cœur » (10 victoires d'affilée)",
        unlockTabs: ["grimoire"],
        reward: STORY_REWARDS.forest_12,
        // v3.131.2 (retour Seb) : tant qu'aucune règle n'est configurée, le lien mène au
        // Grimoire (il faut d'abord aller le configurer). Dès qu'au moins 1 règle est active,
        // il mène directement au combat — beforeGo repositionne le joueur au Cœur de la forêt
        // (worldIndex 0 / adventureIndex 1) et régénère un ennemi cohérent à cette position,
        // au cas où le joueur ait bougé ailleurs entre-temps (autre aventure, donjon...).
        // v3.293.0 (règle Seb) : la règle d'abord (Grimoire), puis le run « Tenir le Cœur ».
        linkTo: {
          tab: function (g) { return storyCountActiveGrimoireRules(g) >= 1 ? null : "grimoire"; },
          section: "adventure", cardId: "adv_aq_story_coeur"
        },
        // v3.107.9 : Grimoire détaillé (nombre de règles vérifié dans le code).
        tutorial: {
          tab: "grimoire",
          icon: "images/Icons/codex/codex_lore.png",
          title: "Le Grimoire",
          points: [
            { icon: "images/Icons/codex/codex_lore.png", text: "Le Grimoire automatise tes actions en combat selon des règles conditionnelles que tu définis (ex. « si une charge est annoncée → Défense »)." },
            { icon: "🎚️", text: "Tu commences avec 2 règles disponibles, et tu en débloqueras d'autres au fil de ta progression dans le jeu." },
            { icon: "🔀", text: "Bascule entre mode Tactique (manuel, tu joues chaque round) et mode Grimoire (automatique, tes règles décident) à tout moment depuis l'écran Combat." }
          ]
        },
        check: function (game) { return storyAdvDone(game, "aq_story_coeur") && storyCountActiveGrimoireRules(game) >= 1; },
        progress: function (game) {
          return "Cœur " + storyAdvProgress(game, "aq_story_coeur", "kills_coeur", 10) + "/10 · Règle " + Math.min(1, storyCountActiveGrimoireRules(game)) + "/1";
        }
      },
      {
        id: "forest_13",
        title: "Marques du corrompu",
        act: "Acte III — Le héros s'affirme",
        narrative: {
          objective: "Sous les racines, une tanière. Entre sous une Marque — la tienne, choisie — et vois ce qu'elle t'apporte. Cinq salles, et tu sauras.",
          completion: "La Marque pique, mais elle paie. Souviens-t'en."
        },
        // v3.245.0 (refonte Donjons, doc v1.1 §6.3) : les afflictions sont devenues les MARQUES d'un run de donjon.
        // L'étape ouvre le Donjon (avancé d'une étape) et se joue dans la Tanière : 5 vagues passées avec ≥ 1 Marque.
        // Même id, même position, même compteur coeurKillsMarked (réutilisé : vagues de donjon sous Marque) — les
        // parties en cours ne sont pas décalées ; l'entrée est offerte par l'Histoire (DungeonManager.isStoryTicketFree).
        objectiveLabel: "Entrer dans la Tanière du Basilic sous au moins une Marque et passer 5 vagues dans le même run",
        unlockTabs: ["dungeon"],
        reward: STORY_REWARDS.forest_13,
        linkTo: { tab: "dungeon" },
        tutorial: {
          tab: "dungeon",
          icon: "images/Icons/afflictions/aff_plague.png",
          title: "Les Marques",
          points: [
            { icon: "images/Icons/afflictions/aff_plague.png", text: "Une Marque est un handicap volontaire pour un run de donjon (boss plus dur, potions interdites, PV réduits...) en échange de récompenses plus riches." },
            { icon: "➕", text: "Jusqu'à 3 Marques par run. Chaque Marque ajoute +15 % aux récompenses et +2 matériau de monde, en plus de ses effets propres." },
            { icon: "images/Icons/subtabs/dungeon.png", text: "Elles se choisissent à l'entrée du donjon, dans la feuille de lancement, et restent figées pour le run." },
            { icon: "images/Icons/combat_stats/stat_attack.png", text: "Pour cette étape : entre dans la Tanière sous au moins une Marque et passe 5 vagues. L'entrée est offerte tant que l'étape est en cours." }
          ]
        },
        killTarget: { label: "Sous la Marque", counter: function (g) { return storyCounter(g, "coeurKillsMarked"); }, target: 5, autoReturn: false },
        onAccept: function (game, st) { st.counters.coeurKillsMarked = 0; st.markedRunTag = null; }, // v3.260.0 : idem forest_12 ; v3.261.0 : 5 vagues dans un même run
        check: function (game) { return storyCounter(game, "coeurKillsMarked") >= 5; },
        progress: function (game) {
          return "Vagues sous Marque " + Math.min(5, storyCounter(game, "coeurKillsMarked")) + "/5";
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

      /* v3.268.0 (L-2) — premier compagnon. Même forme que forest_12 (le Grimoire) :
         l'étape donne un outil, puis oblige à s'en servir une fois. Wenna rejoint à
         l'ACCEPTATION (onAccept), l'objectif se joue avec elle. Interdits de la Forêt
         respectés (bible C §4.4) : ni « Aether » ni « Veilleur » dans ces lignes. */
      {
        id: "forest_wenna",
        title: "Celle qui demande",
        act: "Acte III — Le héros s'affirme",
        narrative: {
          objective: "La tanière est vide, le Basilic n'est plus. À Aeswyn, quelqu'un t'attend devant la palissade, le sac déjà fait.",
          completion: "Elle marche derrière toi et pose des questions. Aucune n'a de réponse. Elle continue quand même.",
          dialogue: [
            { who: "Wenna", text: "Tu repars quand ?" },
            { who: "Orwen", text: "Le pain d'abord." },
            { who: "Wenna", text: "C'est pas une réponse. Toi non plus tu réponds jamais." },
            { who: "Brannoc", text: "Laisse-la partir, petit. Elle demande depuis qu'elle sait parler… enfin. Prends-en soin." },
            { who: null, text: "Orwen met un morceau de pain de côté. Deux, cette fois." }
          ]
        },
        objectiveLabel: "Remporter 3 combats avec Wenna à tes côtés (chasse, élite, donjon ou carte)",
        unlockTabs: ["companions"],
        reward: STORY_REWARDS.forest_wenna,
        linkTo: { section: "adventure" }, // v3.293.0 : le tableau des missions, plus l'onglet Combat nu
        /* Wenna rejoint dès l'acceptation, et le compteur repart de 0 — règle posée par
           Seb le 16/09/2026 : une quête de combat repart systématiquement de zéro. */
        onAccept: function (g, st) {
          if (st && st.counters) st.counters.companionWins = 0;
          if (window.CompanionManager) CompanionManager.unlock("wenna");
        },
        tutorial: {
          tab: "more",
          icon: "images/Icons/subtabs/hero_summary.png",
          title: "Les compagnons",
          points: [
            { icon: "images/Icons/subtabs/hero_summary.png", text: "Un compagnon combat à tes côtés : il joue son action après la tienne, à chaque round. Deux au maximum peuvent t'accompagner." },
            { icon: "images/Icons/combat_status/heal_incoming.png", text: "Wenna est un Soutien : elle soigne l'allié le plus bas en PV. Elle n'a ni équipement ni talents — elle s'améliore contre de l'or, dans Héros › Compagnons." },
            { icon: "images/Icons/combat_stats/stat_attack.png", text: "Tu choisis pour chacun : Auto (il décide seul) ou Manuel. Un compagnon tombé à 0 PV est hors de combat jusqu'à la fin, et revient affaibli au combat suivant." }
          ]
        },
        check: function (game) { return storyCounter(game, "companionWins") >= 3; },
        progress: function (game) {
          return "Combats à deux " + Math.min(3, storyCounter(game, "companionWins")) + "/3";
        }
      },

      /* ---------- Acte IV — L'Aether ---------- */
      {
        id: "forest_15",
        title: "Les braises s'éveillent",
        act: "Acte IV — L'Aether",
        narrative: {
          objective: "La braise sous Aeswyn ne s'éteint plus. Elle demande quelque chose : la sève de la forêt, et le pain du village. Un jour tu devras tout lui rendre pour renaître plus fort — pas aujourd'hui, mais la porte est ouverte.",
          completion: "La braise a pris. Tu sais ce qu'elle prend, maintenant. Sarkel dit que le sable commence là où la forêt s'arrête, et qu'on y vend cher.",
          // v3.197.0 (passe de ton, bible B §4.7) : le dialogue tient enfin la promesse « tu sais ce qu'est
          // l'Aether » — par les anciens, jamais par le narrateur (pilier 6). Affiché au bloc « Les braises »
          // du Campement et sur l'étape courante (buildStoryDialogueHTML, quests-view.js).
          dialogue: [
            { who: "Orwen", text: "Pose ça là. Pas plus près." },
            { who: "Wenna", text: "Pourquoi elle prend le pain ? Le pain c'est pour nous." },
            { who: "Orwen", text: "Elle prend ce qu'on est. Le pain, c'est nous." },
            { who: "Brannoc", text: "Elle prenait déjà, cette nuit-là. Elle ne savait pas encore quoi… enfin. Vas-y, petit. Elle t'attend, celle-là. Toi." },
            { who: null, text: "Aldric ne dit rien. Il est retourné au moulin." }
          ]
        },
        // v3.109.0 : le Seigneur de guerre orc se vainc dans la quête « Le Cœur de la Forêt » (aq_forest_depths, run dédié,
        // liée ici comme « Prouver sa valeur » l'est à forest_05) — elle est aussi la porte du Désert (gatesNextWorld).
        // v3.133.0 : + offrande aux braises (voir STORY_STEP15_OFFERING) à la place des 200 kills.
        objectiveLabel: "Terminer « Le Cœur de la Forêt » (Seigneur de guerre orc) et offrir aux braises 3 Sève d'Aeswyn + 1 Ration moyenne",
        unlockTabs: ["ascension"],
        reward: STORY_REWARDS.forest_15,
        offering: STORY_STEP15_OFFERING,
        // Tant que l'Orc tient, le lien mène à la quête d'aventure ; ensuite au Campement (bloc « Les braises »).
        linkTo: {
          tab: function (g) { return (g.adventureQuestsCompleted || {}).aq_forest_depths ? "campement" : null; },
          section: "adventure", cardId: "adv_aq_forest_depths"
        },
        tutorial: {
          tab: "campement",
          icon: "images/Icons/camp/campfire.png",
          title: "Les braises d'Aeswyn",
          points: [
            { icon: "images/Icons/scene/path_easy.png", text: "La Sève d'Aeswyn se trouve en Petite Aventure (tableau de missions, 3 par jour) — 1 à 2 par parcours, davantage en profil Bourrin." },
            { icon: "images/Icons/quests/ration_reward.png", text: "La Ration moyenne se cuisine à la Cuisine de camp (bâtiment Chasse) : 10 Viande séchée (Séchoir) + 1 Pain (Moulin puis Boulangerie du Champs)." },
            { icon: "images/Icons/camp/campfire.png", text: "Quand tout est réuni, reviens au Campement : le bloc « Les braises » te laisse faire l'offrande." }
          ]
        },
        check: function (game) {
          return !!(game.adventureQuestsCompleted || {}).aq_forest_depths && storyCounter(game, "offeringDone") >= 1;
        },
        progress: function (game) {
          var done = storyCounter(game, "offeringDone") >= 1;
          var detail = done ? "" : " (Sève " + Math.min(3, storyResourceAmount("seve_aeswyn")) + "/3 · Ration " + Math.min(1, storyResourceAmount("ration")) + "/1)";
          return "Seigneur de guerre orc " + ((game.adventureQuestsCompleted || {}).aq_forest_depths ? "1/1" : "0/1")
            + " · Offrande " + (done ? "1/1" : "0/1") + detail;
        }
      }
    ]
  }
};

/* ================= v3.300.0 (W-2) — CHAPITRE 2, LE DÉSERT =================
   Document « Désert — Acte I » v1.0 (textes validés par Seb le 18/09/2026). S'ouvre quand
   le chapitre de la Forêt est terminé (requiresChapter, v3.297.0). Livré étape par étape :
   un chapitre dont la suite n'est pas encore écrite affiche « La suite de l'histoire arrive
   bientôt… » après sa dernière étape livrée. */
/* v3.306.0 — CHOIX PESANTS SUR LA CARTE. Un choix se déclare sur son étape (step.choice :
   chapitre, clé du registre, carte et secteur où il se pose, options, conséquences). Il se
   propose sur le volet du secteur quand l'étape est en cours, acceptée, le secteur libéré et
   le choix pas encore fait. La vue (living-map-view.js) ne connaît que ces deux fonctions. */
function storyPendingChoiceAt(mapId, sectorId) {
  if (!window.StoryQuestManager || !window.LivingMapManager) return null;
  var ids = Object.keys(STORY_QUESTS);
  for (var i = 0; i < ids.length; i++) {
    var step = StoryQuestManager.getCurrentStep(ids[i]);
    var c = step && step.choice;
    if (!c || c.mapId !== mapId || c.sectorId !== sectorId) continue;
    if (!StoryQuestManager.isCurrentStepAccepted(ids[i]) || StoryQuestManager.getChoice(c.key) != null) continue;
    if (!LivingMapManager.isLiberated(mapId, sectorId)) continue;
    return { chapterId: ids[i], step: step, choice: c };
  }
  return null;
}

/* v3.311.0 : choix posé depuis la carte d'étape (onStoryCard), ex. la voie de Maddoc. Un tel
   choix n'entre pas au registre (noRecord) : il dit lui-même s'il est fait (isDone). */
function storyPendingCardChoice(chapterId) {
  if (!window.StoryQuestManager) return null;
  var step = StoryQuestManager.getCurrentStep(chapterId), c = step && step.choice;
  if (!c || !c.onStoryCard || !StoryQuestManager.isCurrentStepAccepted(chapterId)) return null;
  if (typeof c.isDone === "function" ? c.isDone() : StoryQuestManager.getChoice(c.key) != null) return null;
  return { chapterId: chapterId, step: step, choice: c };
}
window.storyPendingCardChoice = storyPendingCardChoice;

// Applique un choix : noté au registre (définitif), puis ses conséquences immédiates
function storyMakeChoice(chapterId, value) {
  var step = StoryQuestManager.getCurrentStep(chapterId), c = step && step.choice;
  if (!c || !c.options.some(function (o) { return o.value === value; })) return false;
  if (c.noRecord) { // v3.311.0 : choix de build, hors registre
    if (typeof c.isDone === "function" && c.isDone()) return false;
  } else if (!StoryQuestManager.recordChoice(chapterId, c.key, value)) return false;
  if (typeof c.apply === "function") c.apply(value);
  if (typeof saveGame === "function") saveGame();
  return true;
}
window.storyCiteWave5 = storyCiteWave5;
window.storyPalierDesert = storyPalierDesert;
window.storyPendingChoiceAt = storyPendingChoiceAt;
window.storyMakeChoice = storyMakeChoice;

// v3.306.0 : essence donnée tout de suite quand on déterre les noms (provisoire)
var STORY_NOMS_ESSENCE = 40;
window.STORY_NOMS_ESSENCE = STORY_NOMS_ESSENCE;

// v3.305.0 : secteurs de la carte du Désert libérés au moins une fois (étape 4)
function storyDesertSectorsFreed() {
  var lm = window.LivingMapManager, map = lm && lm.getMap("desert");
  if (!map) return 0;
  return map.sectors.filter(function (d) { var st = lm.getState("desert", d.id); return !!(st && st.liberatedCount > 0); }).length;
}

function storyDesertFlag(key) {
  return !!(game.explorationProgression && game.explorationProgression[key]);
}

/* v3.311.0 (acte II §8) : ce qui s'est passé avec Maddoc en surface — "aided", "passed" ou null
   (jamais croisé). Posé par l'événement de Petite Aventure (W-3d). */
function storyMaddocMet() {
  var v = game.explorationProgression && game.explorationProgression.maddocMet;
  return (v === "aided" || v === "passed") ? v : null;
}
window.storyMaddocMet = storyMaddocMet;

var STORY_MADDOC_GREETING = {
  aided: "Toi. La gourde. Je te dois une eau. Je paie en marchant devant.",
  passed: "Toi. Tu étais pressé, là-haut. On l'est tous. Je viens.",
  none: "Maddoc. J'habite de l'autre côté. Il n'y a plus vraiment de côté."
};
window.STORY_MADDOC_GREETING = STORY_MADDOC_GREETING;

STORY_QUESTS.desert = {
  id: "desert",
  worldId: "desert",
  requiresChapter: "forest",
  title: "Ce que le sable garde",
  subtitle: "Chapitre 2 — Désert",
  icon: "images/Icons/codex/world_desert.png",
  endText: "Chapitre terminé.",
  steps: [
    /* ---------- Acte I — La surface ---------- */
    {
      id: "desert_01",
      title: "La traversée",
      act: "Acte I — La surface",
      narrative: {
        objective: "Sarkel a chargé sa carriole au Portail en ruine, derrière l'étang. Il connaît la route du sud. Il ne la fait jamais à vide.",
        completion: "Le sable s'arrête contre des pieux et de la toile. Au milieu, un puits, et des gens qui ne demandent pas d'où tu viens. Sarkel appelle ça le camp du Portail. D'ici, on ne voit aucun portail.",
        dialogue: [
          { who: "Sarkel", text: "Trois jours de sable, deux puits, un camp au bout. Je porte les sacs, tu portes la lame." },
          { who: "Sarkel", text: "Une ration moyenne, payée avant de partir. Pas après. Après, les gens oublient." },
          { who: "Wenna", text: "Il y a quoi, au bout ?" },
          { who: "Sarkel", text: "Du sel. Des pierres qui dépassent. Et un vieux qui paie bien pour ce qu'on lui apporte." },
          { who: "Wenna", text: "Quel vieux ?" },
          { who: "Sarkel", text: "Le vieux. Bon. On part avant la chaleur." },
          { who: "Orwen", text: "L'eau d'abord. Le sable a soif." },
          { who: "Brannoc", text: "Le sud, hein. Un autre a pris cette route, avant toi. Il n'est jamais… enfin. Toi, tu reviens, petit." },
          { who: null, text: "Aldric a compté les sacs deux fois. Il n'a rien dit. Il en a ajouté un." }
        ],
        completionDialogue: [
          { who: "Sarkel", text: "Ici, on paie l'eau. Pas cher. Mais on la paie." },
          { who: "Wenna", text: "Pourquoi le Portail, s'il n'y en a pas ?" },
          { who: "Sarkel", text: "Parce que c'est par là qu'on arrive. Le reste du nom, demande au vieux." },
          { who: "Wenna", text: "Il est où, le vieux ?" },
          { who: "Sarkel", text: "Dessous." },
          { who: null, text: "Il montre le sol. Personne au camp ne regarde dans cette direction." }
        ]
      },
      objectiveLabel: "Terminer la traversée (coût : 1 Ration moyenne)",
      unlockTabs: [],
      reward: STORY_REWARDS.desert_01,
      linkTo: { section: "expedition", cardId: "scene_traversee_desert" },
      // Arrivée = chambre finale du run résolue (travelOnSuccess pose le monde, completionFlag marque l'étape)
      check: function () { return storyDesertFlag("desertCrossingCompleted"); },
      progress: function () { return "Traversée " + (storyDesertFlag("desertCrossingCompleted") ? "1/1" : "0/1"); }
    },
    {
      id: "desert_02",
      title: "Ce qui vit ici a le temps",
      act: "Acte I — La surface",
      narrative: {
        objective: "Le sable bouge sous la toile, la nuit. Ce qui tourne autour du camp ne se presse pas. Va voir.",
        completion: "Six bêtes. Aucune n'a reculé. Certaines ont su te faire taire, un temps. Ici, on gagne en tenant.",
        dialogue: [
          { who: "Sarkel", text: "Les bêtes d'ici ne chargent pas. Elles attendent que tu te fatigues." },
          { who: "Wenna", text: "Elles ont pas peur du feu ?" },
          { who: "Sarkel", text: "Elles ont le temps. Le feu, non." },
          { who: null, text: "Une femme du camp tend une outre vide à Sarkel. Il la remplit, la pèse, et lui rend la monnaie." }
        ]
      },
      objectiveLabel: "Terminer « Ce qui tourne autour du camp » : 6 bêtes des Dunes, d'une traite",
      unlockTabs: [],
      reward: STORY_REWARDS.desert_02,
      linkTo: { section: "adventure", cardId: "adv_aq_desert_dunes" },
      tutorial: {
        tab: "combat",
        icon: "images/Icons/combat_status/silence_incoming.png",
        title: "Le silence",
        points: [
          { icon: "images/Icons/combat_status/silence_incoming.png", text: "Un ennemi Silencieux l'annonce sous sa barre de vie. S'il va au bout, tes compétences sont bloquées 2 rounds." },
          { icon: "images/Icons/combat_stats/stat_defense.png", text: "Ta Défense, jouée au bon moment, l'en empêche. Dans le Grimoire, c'est la condition « L'ennemi va te réduire au silence »." },
          { icon: "images/Icons/combat_stats/stat_attack.png", text: "Ton attaque de base, ta Défense et Wenna ne sont jamais réduites au silence." },
          { icon: "images/Icons/combat_stats/stat_health.png", text: "Au Désert, les bêtes encaissent plus et frappent moins. Les combats sont longs : garde tes potions pour la fin." }
        ]
      },
      check: function (game) { return storyAdvDone(game, "aq_desert_dunes"); },
      progress: function (game) { return "Bêtes " + storyAdvProgress(game, "aq_desert_dunes", "kills_dunes", 6) + "/6"; }
    },
    /* v3.304.0 (W-2) — acte I, §5. Le Réservoir (openAtStoryStep) et la Petite Aventure du Désert
       (boardRequires.storyStep) s'ouvrent avec cette étape. Deux drapeaux permanents : la première
       Outre remplie (firstCraftFlag), une chambre finale de PA du Désert résolue (successFlag). */
    {
      id: "desert_03",
      title: "L'outre",
      act: "Acte I — La surface",
      narrative: {
        objective: "Au camp, l'eau se paie à la mesure. À Aeswyn, le puits coule pour rien. Il manque de quoi la porter.",
        completion: "L'outre est tiède contre ta hanche. Le sable a soif. Toi, un peu moins. Tu es allé plus loin qu'hier.",
        dialogue: [
          { who: "Wenna", text: "La dame du puits coud les outres avec du boyau. J'ai regardé. Je sais faire." },
          { who: "Sarkel", text: "Pleine, une outre vaut trois repas ici. Vide, c'est un bout de cuir. Rapporte-les pleines." },
          { who: "Brannoc", text: "Le réservoir ? Je l'ai monté il y a… enfin. Pour rien, je croyais. Il servira." },
          { who: "Aldric", text: "Une outre, quatre mesures. Je note." }
        ]
      },
      objectiveLabel: "Remplir 1 Outre au Réservoir, puis terminer une Petite aventure du Désert",
      unlockTabs: [],
      reward: STORY_REWARDS.desert_03,
      linkTo: { section: "expedition", cardId: "petite_aventure_desert" },
      tutorial: {
        tab: "village",
        icon: "images/Icons/workshops/water_reservoir.png",
        title: "L'outre",
        points: [
          { icon: "images/Icons/workshops/water_reservoir.png", text: "Le Réservoir est un atelier du Puits, au Village. Il transforme ton eau en Outres pleines." },
          { icon: "images/Icons/resources/outre_pleine_icon.png", text: "Avant un parcours au Désert, emporte une Outre dans ta préparation : elle te rendra du Souffle quand tu en manques." },
          { icon: "images/Icons/scene/journey_long.png", text: "Le Désert coûte plus de Souffle par palier que la Forêt. Sans Outre, tu passes quand même, mais tu vas moins loin." }
        ]
      },
      check: function () { return storyDesertFlag("outreFilled") && storyDesertFlag("desertPaCompleted"); },
      progress: function () {
        return "Outre " + (storyDesertFlag("outreFilled") ? "1/1" : "0/1") + " · Petite aventure " + (storyDesertFlag("desertPaCompleted") ? "1/1" : "0/1");
      }
    },
    /* v3.305.0 (W-2) — acte I, §6. La carte du Désert s'ouvre avec cette étape (opensAtStoryStep).
       Compte les secteurs libérés AU MOINS UNE FOIS : un secteur repris par le sable reste acquis
       pour l'étape, comme la brume en Forêt ne retire pas une étape déjà gagnée. */
    {
      id: "desert_04",
      title: "Les pierres qui dépassent",
      act: "Acte I — La surface",
      narrative: {
        objective: "Sarkel a déplié une peau tannée sur la table du camp. Des traits à l'encre, des croix, et beaucoup de blanc.",
        completion: "Deux croix de plus sur la peau de Sarkel. Il les a tracées à l'encre, pas au charbon. Ce qu'on tient, le sable le reprend. On y retourne.",
        dialogue: [
          { who: "Sarkel", text: "Mes routes. Là, un puits. Là, une caravane qui n'est jamais arrivée. Le reste, le sable l'a mangé." },
          { who: "Wenna", text: "Il mange quoi, le sable ?" },
          { who: "Sarkel", text: "Ce qu'on n'use pas. Une route où personne ne passe, trois jours après elle est dessous." },
          { who: "Wenna", text: "Comme la brume, chez nous." },
          { who: "Sarkel", text: "Chez vous, la brume s'en va. Le sable, lui, reste." },
          { who: null, text: "Il pose deux cailloux sur la peau, le puits sec et la caravane. Puis il attend que tu y ailles." }
        ]
      },
      objectiveLabel: "Libérer 2 secteurs de la carte du Désert",
      unlockTabs: [],
      reward: STORY_REWARDS.desert_04,
      linkTo: { section: "map", cardId: "livingmap_desert" },
      tutorial: {
        tab: "map",
        icon: "images/Icons/resources/verre_des_dunes_icon.png",
        title: "L'Ensablement",
        points: [
          { icon: "images/Icons/scene/node_obstacle.png", text: "La carte du Désert fonctionne comme celle de la Forêt. Tu libères un secteur en terminant son parcours." },
          { icon: "images/Icons/scene/node_unknown.png", text: "Un parcours raté rend un secteur au sable. Sa récompense de secteur tenu est perdue jusqu'à ce que tu le reprennes." },
          { icon: "images/Icons/scene/protective_amulet.png", text: "La Palissade d'Aeswyn freine l'Ensablement, comme elle freine la brume." }
        ]
      },
      check: function () { return storyDesertSectorsFreed() >= 2; },
      progress: function () { return "Secteurs libérés " + Math.min(2, storyDesertSectorsFreed()) + "/2"; }
    },
    /* v3.306.0 (W-2) — acte I, §7 : le premier choix pesant. Se pose aux stèles penchées, sur la
       carte ; si elles ne sont pas libérées, l'étape demande d'abord de les libérer. Définitif,
       y compris après une Ascension (noté dans storyQuests). La complétion dépend du choix. */
    {
      id: "desert_05",
      title: "Les noms sous le sable",
      act: "Acte I — La surface",
      narrative: {
        objective: "Aux stèles penchées, le vent a découvert une ligne de signes. Des noms, dit la gardienne du puits. Personne au camp ne les lit.",
        get completion() {
          return (window.StoryQuestManager && StoryQuestManager.getChoice("noms") === "deterrer")
            ? "Les noms sont dans ton sac, sur des éclats de pierre. Derrière toi, le sable recouvre déjà les stèles. Orwen saura quoi en faire. Ou elle se taira."
            : "Tu repousses le sable sur la première ligne. La gardienne ne dit pas merci. Elle remplit ton outre sans la peser.";
        },
        dialogue: [
          { who: "La gardienne du puits", text: "Ce sont des noms. On ne les lit pas. On ne les déterre pas. Le sable les garde, et il se tient tranquille." },
          { who: "Sarkel", text: "Des noms de rois, taillés dans la bonne pierre. À Aeswyn, ils les prendraient pour rien. Moi, je les vendrais." },
          { who: "Wenna", text: "Des gens avaient ces noms. Quelqu'un les cherche peut-être encore." },
          { who: "La gardienne du puits", text: "Plus personne ne les cherche. C'est pour ça qu'ils sont tranquilles." },
          { who: null, text: "Le vent repousse le sable sur la première ligne. Il la découvrira encore demain." }
        ]
      },
      objectiveLabel: "Aller aux stèles penchées (carte du Désert) et choisir",
      unlockTabs: [],
      reward: STORY_REWARDS.desert_05,
      linkTo: { section: "map", cardId: "livingmap_desert:steles" },
      tutorial: {
        tab: "map",
        icon: "images/Icons/codex/codex_lore.png",
        title: "Un choix qui pèse",
        points: [
          { icon: "images/Icons/codex/codex_lore.png", text: "Certains choix ne se reprennent pas." }, // v3.335.0 : l'Ascension n'existe plus
          { icon: "images/Icons/scene/node_discovery.png", text: "Chacun des deux chemins apporte quelque chose que l'autre n'apporte pas." },
          { icon: "images/Icons/scene/node_unknown.png", text: "Rien ne te dira si tu as bien choisi." }
        ]
      },
      choice: {
        key: "noms", mapId: "desert", sectorId: "steles",
        buttonLabel: "Lire les noms",
        title: "Les noms sous le sable",
        text: "Une ligne de signes dépasse du sable, au pied de la première stèle. D'autres dorment dessous.",
        options: [
          { value: "deterrer", label: "Déterrer les noms", desc: "Les noms partent pour Aeswyn. Le sable reprend les stèles." },
          { value: "laisser", label: "Les laisser au sable", desc: "Les stèles restent debout et tiennent le sable. Les noms restent dessous." }
        ],
        // Déterrer : essence tout de suite, les stèles retournent au sable (leur effet est perdu
        // pour de bon, effectLostOnChoice). La quête de village viendra avec celles du Désert.
        // Laisser : rien d'immédiat — le frein vit dans la carte (choiceBrakes).
        apply: function (value) {
          if (value !== "deterrer") return;
          game.essence = Number(game.essence || 0) + STORY_NOMS_ESSENCE;
          if (window.LivingMapManager) LivingMapManager.setState("desert", "steles", "recouvert", "noms déterrés");
          if (typeof addLog === "function") addLog("Les noms sont dans ton sac. +" + STORY_NOMS_ESSENCE + " essence.", "event");
        }
      },
      check: function () { return !!(window.StoryQuestManager && StoryQuestManager.getChoice("noms")); },
      progress: function () {
        var chosen = !!(window.StoryQuestManager && StoryQuestManager.getChoice("noms"));
        var freed = chosen || !!(window.LivingMapManager && LivingMapManager.isLiberated("desert", "steles"));
        return "Stèles libérées " + (freed ? "1/1" : "0/1") + " · Choix " + (chosen ? "1/1" : "0/1");
      }
    },

    /* ---------- Acte II — Le Temple et l'homme assis ---------- */
    /* v3.310.0 (W-3a) — acte II §4. La porte du Temple (anneau 3, fermée par l'Histoire jusqu'ici)
       n'est atteignable que par la verrerie ou le marché de sel. Sa première libération joue la
       descente (firstContent), hors cap ; l'arrivée pose le Temple ensablé. */
    {
      id: "desert_06",
      title: "La descente",
      act: "Acte II — Le Temple et l'homme assis",
      narrative: {
        objective: "La porte du Temple dépasse du sable, au nord. Deux battants plus hauts que des arbres. Sarkel a dit « dessous ». C'est par là.",
        completion: "Une salle, des piliers, et une chaise tournée vers une porte fermée. La lampe est posée à côté. Personne sur la chaise.",
        dialogue: [
          { who: "Sarkel", text: "Je t'emmène jusqu'à la porte. Pas plus loin. Ce qui est dessous ne se vend pas." },
          { who: "Wenna", text: "Tu y es déjà descendu ?" },
          { who: "Sarkel", text: "Une fois. J'ai remonté un sac de sel. Il était plein de sable." },
          { who: "La gardienne du puits", text: "Prends de l'eau pour trois. On ne sait jamais combien on remonte." }
        ],
        completionDialogue: [
          { who: "Wenna", text: "Il y a quelqu'un, ici." },
          { who: "Wenna", text: "Ou il y avait." },
          { who: null, text: "La lampe brûle droit. Rien, ici, ne la fait bouger." }
        ]
      },
      objectiveLabel: "Libérer la porte du Temple (carte du Désert, par la verrerie ou le marché de sel)",
      unlockTabs: [],
      reward: STORY_REWARDS.desert_06,
      linkTo: { section: "map", cardId: "livingmap_desert:porte_temple" },
      check: function () { return storyDesertFlag("templeDescended"); },
      progress: function () { return "Porte du Temple " + (storyDesertFlag("templeDescended") ? "1/1" : "0/1"); }
    },
    /* v3.310.0 (W-3a) — acte II §5. Aucun combat : une Outre pleine donnée depuis la carte d'étape
       (offrande générique, offeringUi.where = "story"), pour l'homme derrière la porte. */
    {
      id: "desert_07",
      title: "Un homme assis",
      act: "Acte II — Le Temple et l'homme assis",
      narrative: {
        objective: "L'homme est sur la chaise, face à la porte fermée. Il ne se lève pas. La lampe est de son côté.",
        completion: "Il couche l'outre sur la pierre et la pousse sous la porte, du plat de la main. De l'autre côté, rien. Puis un choc contre le battant. Un seul.",
        dialogue: [
          { who: "Le Veilleur", text: "Tu viens d'Aeswyn. Tu as encore de la sève sur tes bottes. Il n'y a qu'une chaise. Le sol est propre, je l'ai balayé." },
          { who: "Wenna", text: "C'est vous, le vieux ?" },
          { who: "Le Veilleur", text: "Sarkel dit « le vieux » parce qu'il ne sait pas mon nom. Au camp, on dit le Veilleur, parce que je veille. Les deux sont exacts." },
          { who: "Le Veilleur", text: "Cette porte ne s'ouvre pas de ce côté. Un homme est descendu avant toi. Il boitait. Il n'est pas remonté. Je la tiens pour qu'il puisse revenir." },
          { who: "Le Veilleur", text: "Il avait une outre. Elle doit être vide. Il y a un jour sous le battant, assez pour en passer une pleine." }
        ],
        completionDialogue: [
          { who: "Le Veilleur", text: "Il est vivant. Tu l'as entendu comme moi." },
          { who: "Le Veilleur", text: "Tu as un grimoire dans ton sac. Garde-le. Il fait ce que je lui ai appris." },
          { who: "Wenna", text: "Vous lui avez appris quoi ?" },
          { who: "Le Veilleur", text: "À agir quand on ne regarde pas. C'est tout ce qu'il sait faire, et il le fait bien." }
        ]
      },
      objectiveLabel: "Donner une Outre pleine au Veilleur",
      unlockTabs: [],
      reward: STORY_REWARDS.desert_07,
      offering: { outre_pleine: 1 },
      offeringKey: "outreGiven",
      offeringUi: {
        where: "story",
        buttonLabel: "Donner l'Outre",
        lackToast: "Il te faut une Outre pleine. Le Réservoir la remplit, au Puits.",
        doneToast: "L'outre passe sous la porte",
        log: "Tu donnes une Outre pleine au Veilleur. Elle passe sous la porte."
      },
      linkTo: {
        tab: "village", label: "Aller au Réservoir",
        afterGo: function () {
          if (typeof setVillageSubTab === "function") setVillageSubTab("production");
          if (typeof setProductionViewTab === "function") setProductionViewTab("shops");
        }
      },
      check: function (game) { return storyChapterCounter(game, "desert", "outreGiven") >= 1; },
      progress: function (game) { return "Outre donnée " + (storyChapterCounter(game, "desert", "outreGiven") >= 1 ? "1/1" : "0/1"); }
    },
    /* v3.311.0 (W-3b) — acte II §6. Maddoc rejoint à l'acceptation (première amélioration offerte
       s'il a été aidé en surface), sa voie se choisit sur la carte d'étape AVANT les combats (hors
       registre), puis trois rencontres à trois au Temple (aq_desert_gouffre). */
    {
      id: "desert_08",
      title: "Celui qui n'est pas rentré",
      act: "Acte II — Le Temple et l'homme assis",
      narrative: {
        objective: "La porte est ouverte. Quelqu'un l'a poussée de l'autre côté, pendant la nuit. Derrière, un gouffre, et une passerelle dont il reste la moitié.",
        completion: "Vous remontez à trois. La gardienne du puits compte trois ombres dans l'escalier. Elle remplit trois outres.",
        get dialogue() {
          return [
            { who: "Le Veilleur", text: "Je reste ici. Si elle se referme, elle ne se rouvrira pas de ce côté. Va." },
            { who: null, text: "De l'autre côté du gouffre, un homme est assis contre la paroi, une outre sur les genoux. Il se lève en s'aidant du mur." },
            { who: "Maddoc", text: STORY_MADDOC_GREETING[storyMaddocMet() || "none"] },
            { who: "Wenna", text: "Il boite." },
            { who: "Maddoc", text: "Je boite. Je ne tombe pas." },
            { who: "Maddoc", text: "Je peux me mettre devant et prendre les coups. Ou rester derrière et viser. Pas les deux. Choisis, c'est toi qui avances." }
          ];
        },
        completionDialogue: [
          { who: "Le Veilleur", text: "Il est rentré. C'est tout ce que je voulais." },
          { who: "Maddoc", text: "Il tient cette porte depuis combien de temps ?" },
          { who: "Le Veilleur", text: "Depuis avant ta naissance. Pas pour toi, au début." }
        ]
      },
      objectiveLabel: "Choisir la voie de Maddoc, puis remonter à trois : 3 rencontres au Temple",
      unlockTabs: [],
      reward: STORY_REWARDS.desert_08,
      linkTo: { section: "adventure", cardId: "adv_aq_desert_gouffre" },
      onAccept: function () {
        if (!window.CompanionManager) return;
        CompanionManager.unlock("maddoc");
        // Aidé en surface : première amélioration offerte, une seule fois
        var st = CompanionManager.state("maddoc");
        if (storyMaddocMet() === "aided" && st && st.upgrades === 0 && !game.explorationProgression.maddocGift) {
          st.upgrades = 1;
          st.hp = CompanionManager.maxHpOf("maddoc");
          game.explorationProgression.maddocGift = true;
          if (typeof addLog === "function") addLog("🤝 Maddoc marche devant. Il n'a pas oublié la gourde.", "event");
        }
      },
      choice: {
        key: "maddocVoie", onStoryCard: true, noRecord: true,
        buttonLabel: "Choisir sa voie",
        title: "Devant ou derrière",
        text: "Maddoc attend, la main sur la paroi. Il ne choisira pas pour toi.",
        options: [
          { value: "tronc", label: "Devant — Le tronc", desc: "Il se met devant et prend les coups. Il attire les ennemis et encaisse." },
          { value: "affut", label: "Derrière — L'affût", desc: "Il reste derrière et vise. Il frappe fort mais attire peu." }
        ],
        isDone: function () { return !!(window.CompanionManager && CompanionManager.state("maddoc").voie); },
        apply: function (value) { if (window.CompanionManager) CompanionManager.chooseVoie("maddoc", value); }
      },
      tutorial: {
        tab: "more",
        icon: "images/Icons/subtabs/hero_summary.png",
        title: "À trois",
        points: [
          { icon: "images/Icons/subtabs/hero_summary.png", text: "Maddoc se bat à tes côtés, comme Wenna. Sa voie décide de son rôle : devant, il attire les coups ; derrière, il frappe fort mais attire peu." },
          { icon: "images/Icons/system/forward.png", text: "Tu peux changer de voie depuis sa fiche, dans Héros › Compagnons. Chaque changement coûte plus cher que le précédent. Ses améliorations sont conservées." }
        ]
      },
      check: function (game) { return !!(window.CompanionManager && CompanionManager.state("maddoc").voie) && storyAdvDone(game, "aq_desert_gouffre"); },
      progress: function (game) {
        var voie = !!(window.CompanionManager && CompanionManager.state("maddoc").voie);
        return "Voie " + (voie ? "1/1" : "0/1") + " · Rencontres " + storyAdvProgress(game, "aq_desert_gouffre", "rencontres_gouffre", 3) + "/3";
      }
    },
    /* v3.312.0 (W-3c) — acte II §7. Le Tailleur de pierre (Carrière) s'ouvre avec l'étape
       (openAtStoryStep) ; le premier Verre trempé pose verreTrempe (firstCraftFlag). */
    {
      id: "desert_09",
      title: "Le verre des dunes",
      act: "Acte II — Le Temple et l'homme assis",
      narrative: {
        objective: "Maddoc ramasse un éclat de verre vert au bord du camp. Il le tourne contre le soleil, puis le frappe sur une pierre. Il ne casse pas.",
        completion: "Le premier Verre trempé sort du four de la Carrière. Vert, froid, plus lourd qu'il ne devrait. Brannoc passe l'ongle dessus. Il ne le raye pas.",
        dialogue: [
          { who: "Maddoc", text: "Chez moi, on le chauffait deux fois. Une pour le fondre, une pour le rendre dur. Après, il coupait le fer." },
          { who: "Wenna", text: "Chez toi, c'est où ?" },
          { who: "Maddoc", text: "De l'autre côté. Il y avait un four. Il est sous le sable, maintenant." },
          { who: "Sarkel", text: "Du verre qui coupe le fer. Je t'en prends dix. Non. Je t'en prends tout." },
          { who: "Brannoc", text: "Le tailleur de la Carrière sait chauffer la pierre. Le verre, il apprendra. Montre-lui, petit." }
        ],
        completionDialogue: [
          { who: "Brannoc", text: "Ça, petit, ça tiendra un toit." },
          { who: "Maddoc", text: "Ça tenait des villes." }
        ]
      },
      objectiveLabel: "Fabriquer 1 Verre trempé au Tailleur de pierre (Carrière)",
      unlockTabs: [],
      reward: STORY_REWARDS.desert_09,
      linkTo: {
        tab: "village", label: "Aller aux Ateliers",
        afterGo: function () {
          if (typeof setVillageSubTab === "function") setVillageSubTab("production");
          if (typeof setProductionViewTab === "function") setProductionViewTab("shops");
        }
      },
      tutorial: {
        tab: "village",
        icon: "images/Icons/workshops/stonemason.png",
        title: "Le Tailleur de pierre",
        points: [
          { icon: "images/Icons/workshops/stonemason.png", text: "À la Carrière, le Tailleur de pierre chauffe le Verre des dunes avec de la Pierre. Il en sort du Verre trempé." },
          { icon: "images/Icons/resources/verre_des_dunes_icon.png", text: "Le Verre des dunes se trouve en Petite Aventure du Désert, et à la première libération des secteurs de la carte." },
          { icon: "images/Icons/resources/verre_trempe_icon.png", text: "Le Verre trempé servira aux hauts paliers des bâtiments d'Aeswyn." },
          { icon: "images/Icons/scene/node_discovery.png", text: "Libérer la verrerie ensevelie fait travailler le Tailleur 10 % plus vite." }
        ]
      },
      check: function () { return storyDesertFlag("verreTrempe"); },
      progress: function () { return "Verre trempé " + (storyDesertFlag("verreTrempe") ? "1/1" : "0/1"); }
    },
    /* v3.312.0 (W-3c) — acte II §7. La grammaire de groupes : six rencontres scriptées aux Dunes
       (aq_desert_nuee), une nuée = une rencontre. Le champ de scarabées s'ouvre à la réclamation
       (requiresStoryStep: "desert_10" est atteint dès qu'on passe à l'étape suivante). */
    {
      id: "desert_10",
      title: "La nuée",
      act: "Acte II — Le Temple et l'homme assis",
      narrative: {
        objective: "Le sable crépite, au sud du camp. La gardienne du puits a tendu une corde autour de la réserve d'eau. Hier, elle n'y était pas.",
        completion: "Six rencontres. Les carapaces par tas de trois, deux boucliers couchés l'un contre l'autre. Au sud, le sable ne crépite plus. Pas aujourd'hui.",
        dialogue: [
          { who: "Maddoc", text: "Les petites viennent par trois. Toujours. Tu en tues une, les deux autres ne s'en aperçoivent pas." },
          { who: "Wenna", text: "Et les grands ?" },
          { who: "Maddoc", text: "Par deux, dos à dos. Ils ont appris ça de quelqu'un." },
          { who: "Sarkel", text: "Les carapaces, je les reprends. Trois pièces l'une. Une nuée, ça fait neuf. Fais le compte." }
        ],
        completionDialogue: [
          { who: "Maddoc", text: "Elles reviendront. Par trois." }
        ]
      },
      objectiveLabel: "Terminer « La nuée » : 6 rencontres aux Dunes, nuées et paires",
      unlockTabs: [],
      reward: STORY_REWARDS.desert_10,
      linkTo: { section: "adventure", cardId: "adv_aq_desert_nuee" },
      tutorial: {
        tab: "combat",
        icon: "images/Icons/combat_status/double_strike.png",
        title: "La nuée",
        points: [
          { icon: "images/Icons/combat_status/double_strike.png", text: "Au Désert, certaines bêtes vont en groupe : les scarabées par trois, les guerriers des sables par deux." },
          { icon: "images/Icons/combat_stats/stat_attack.png", text: "Touche un ennemi pour le cibler. Une nuée tue par le nombre de ses coups : chaque scarabée abattu en retire un." },
          { icon: "images/Icons/quests/quest_list.png", text: "Dans cette quête, un groupe compte pour une seule rencontre." },
          { icon: "images/Icons/codex/codex_lore.png", text: "Dans le Grimoire, la condition « Ils sont plusieurs » te permet de régler ton kit face à un groupe." }
        ]
      },
      check: function (game) { return storyAdvDone(game, "aq_desert_nuee"); },
      progress: function (game) { return "Rencontres " + storyAdvProgress(game, "aq_desert_nuee", "rencontres_nuee", 6) + "/6"; }
    },

    /* ---------- Acte III — La cité engloutie ---------- */
    /* v3.314.0 (W-4a1) — acte III §4. La tour de guet (anneau 2, voisine du champ de scarabées
       ouvert à l'étape 10) est fermée par l'Histoire jusqu'ici. Sa première libération est le
       combat contre le Serment sous l'armure ; le choix ne s'affiche qu'ENSUITE, parce que
       storyPendingChoiceAt() exige le secteur libéré. Deuxième choix pesant du chapitre,
       après « les noms » à l'étape 5 : même écran, même définitivité, même grammaire (ce qu'on
       laisse en place tient le sable).

       La réplique de l'armure (« Personne ne remonte le fleuve ») est posée en dernière ligne
       du dialogue d'acceptation, faute de crochet de texte AVANT un combat d'élite de carte.
       Elle plante le fleuve, donc Nezzam, que le sphinx nommera à l'étape 15. */
    {
      id: "desert_11",
      title: "Le serment sous l'armure",
      act: "Acte III — La cité engloutie",
      narrative: {
        objective: "Depuis le champ de scarabées, on voit la tour. En haut, une silhouette en armure, tournée vers l'est. Elle n'a pas bougé depuis l'étape d'avant. Ni depuis bien plus longtemps.",
        get completion() {
          return (window.StoryQuestManager && StoryQuestManager.getChoice("serment") === "relever")
            ? "Tu dis les mots qu'il attendait, ou d'autres qui leur ressemblent. L'armure s'ouvre et le sable s'en va, tout d'un coup, comme un souffle retenu. Le heaume roule jusqu'à tes pieds."
            : "L'armure se redresse sans toi. Elle se remet face à l'est, là où était le fleuve. Le sable autour de la tour cesse de glisser.";
        },
        dialogue: [
          { who: "Maddoc", text: "Il était là quand je suis descendu. Je suis passé derrière. Il ne se retourne pas." },
          { who: "Wenna", text: "Et si on passe devant ?" },
          { who: "Maddoc", text: "Personne n'est passé devant." },
          { who: "L'armure", text: "Personne ne remonte le fleuve." }
        ],
        get completionDialogue() {
          return (window.StoryQuestManager && StoryQuestManager.getChoice("serment") === "relever")
            ? [{ who: "Wenna", text: "Il était fatigué." }, { who: "Maddoc", text: "Il a tenu. C'est assez." }]
            : [{ who: "Wenna", text: "Il garde quoi, au juste ?" }, { who: "Maddoc", text: "Une promesse. Pas la nôtre." }];
        }
      },
      objectiveLabel: "Libérer la tour de guet (carte du Désert), puis choisir",
      unlockTabs: [],
      reward: STORY_REWARDS.desert_11,
      linkTo: { section: "map", cardId: "livingmap_desert:tour_guet" },
      choice: {
        key: "serment", mapId: "desert", sectorId: "tour_guet",
        buttonLabel: "Parler à l'armure",
        title: "Le serment sous l'armure",
        text: "L'armure est vide. Ce qui la tient debout est une phrase, dite à quelqu'un qui n'est jamais revenu l'en délier.",
        options: [
          { value: "laisser", label: "Le laisser à son poste", desc: "Il reprend le guet. La tour tient le sable." },
          { value: "relever", label: "Le relever de son serment", desc: "Il peut enfin tomber. Son heaume reste." }
        ],
        /* Relever : le heaume tout de suite, et l'effet de la tour est perdu pour de bon
           (living-maps.js, effectLostOnChoice). Laisser : rien d'immédiat — le frein vit
           dans la carte (choiceBrakes), exactement comme les stèles laissées au sable. */
        apply: function (value) {
          if (value !== "relever") return;
          var loot = window.EliteManager && EliteManager.buildUniqueLoot("heaume_guet");
          if (loot && typeof addLootToInventory === "function") {
            addLootToInventory(loot);
            if (typeof addLog === "function") addLog("Le heaume du guet roule jusqu'à toi. (" + loot.name + ")", "event");
          }
        }
      },
      check: function () {
        return !!(window.StoryQuestManager && StoryQuestManager.getChoice("serment"));
      },
      progress: function () {
        var chosen = !!(window.StoryQuestManager && StoryQuestManager.getChoice("serment"));
        var freed = chosen || !!(window.LivingMapManager && LivingMapManager.isLiberated("desert", "tour_guet"));
        return "Tour libérée " + (freed ? "1/1" : "0/1") + " · Choix " + (chosen ? "1/1" : "0/1");
      }
    },

    /* v3.315.0 (W-4a2) — acte III §5. La Cité engloutie s'ouvre ici : le verrou du donjon lit
       requiresStoryStep dans sa donnée (dungeon.js), et l'entrée est offerte tant que l'étape
       court (storyFreeSteps), comme la Tanière pour forest_13 / forest_14.

       Objectif : passer la vague 5, la première vague élite. Le relevé se fait sans toucher au
       compteur du donjon : game.dungeonRun porte dungeonId et wave, et storyCiteWave5() note le
       passage au vol, sur le modèle de _trackKills pour le Cœur. La vague 5 franchie, le donjon
       est à la vague 6 : c'est ce qu'on guette. */
    {
      id: "desert_12",
      title: "La cité engloutie",
      act: "Acte III — La cité engloutie",
      narrative: {
        objective: "Derrière le gouffre, la passerelle continue. En bas, des toits. Une ville entière, sous le sable, et le sable ne l'a pas écrasée : il l'a remplie, doucement, rue par rue.",
        completion: "Au bout de la grande rue, une place. Sur la place, couché, quelque chose de très grand avec une tête d'homme. Ses yeux sont ouverts. Il ne regarde pas toi : il regarde la rue par laquelle tu es venu, comme s'il attendait quelqu'un d'autre.",
        dialogue: [
          { who: "Maddoc", text: "J'ai vécu dans la première rue. Je ne suis jamais allé plus loin." },
          { who: "Wenna", text: "Pourquoi ?" },
          { who: "Maddoc", text: "Il y en a d'autres comme celle de la tour. À chaque carrefour." },
          { who: "Le Veilleur", text: "Ils gardent les rues comme on le leur a demandé. Ils ne savent pas que la ville est morte. Personne ne le leur a dit." }
        ],
        completionDialogue: [
          { who: "Wenna", text: "Il est vivant ?" },
          { who: "Maddoc", text: "Il est là. Ici, c'est pareil." }
        ]
      },
      objectiveLabel: "Passer la vague 5 de la Cité engloutie",
      unlockTabs: [],
      reward: STORY_REWARDS.desert_12,
      linkTo: { tab: "dungeon" },
      tutorial: {
        tab: "dungeon",
        icon: "images/Icons/subtabs/dungeon.png",
        title: "La Cité engloutie",
        points: [
          { icon: "images/Icons/subtabs/dungeon.png", text: "Le donjon du Désert est bien plus dur que la Tanière. Ses vagues élites sont des gardes du royaume mort." },
          { icon: "images/Icons/dungeon/dungeon_weapon.png", text: "On y trouve de l'équipement Inhabituel : c'est ici qu'on se prépare pour la suite." },
          { icon: "images/Icons/dungeon/wave_record.png", text: "Tu n'as pas à aller jusqu'au bout maintenant. Ce qui dort sur la place peut attendre." }
        ]
      },
      check: function (game) { return storyCiteWave5(game); },
      progress: function (game) { return "Vague 5 " + (storyCiteWave5(game) ? "1/1" : "0/1"); }
    },

    /* v3.316.0 (W-4b) — acte III §6. LE PALIER D'ÉQUIPEMENT, demandé par Seb (« les combats
       sont trop faciles », 20/09/2026). Trois compteurs, remplis dans n'importe quel ordre.
       C'est à partir d'ici que le contenu se cale au banc EN SUPPOSANT le palier atteint, et
       sur les dégâts des ennemis — les PV ne font qu'allonger (mesure du lot W-4a1). */
    {
      id: "desert_13",
      title: "Le verre et le fer",
      act: "Acte III — La cité engloutie",
      narrative: {
        objective: "Vous remontez de la cité avec ce que vous aviez en descendant. Maddoc s'arrête sur la passerelle et regarde ton arme, longtemps.",
        completion: "La lame sort du feu avec un fil vert sur le tranchant, fin comme un cheveu. Maddoc passe le pouce dessus, sans appuyer.",
        dialogue: [
          { who: "Maddoc", text: "Pas avec ça." },
          { who: "Wenna", text: "Ça a suffi jusqu'ici." },
          { who: "Maddoc", text: "Jusqu'ici, rien ne gardait rien." },
          { who: "Le Veilleur", text: "Le verre des dunes coupe le fer. Ils ont appris ça de quelqu'un. Apprends-le aussi." }
        ],
        completionDialogue: [
          { who: "Maddoc", text: "Là." },
          { who: "Wenna", text: "C'est tout ?" },
          { who: "Maddoc", text: "Chez moi, c'était un compliment." }
        ]
      },
      objectiveLabel: "4 emplacements Inhabituels dont l'arme, Forge 3, arme reforgée à 4",
      unlockTabs: [],
      reward: STORY_REWARDS.desert_13,
      linkTo: { tab: "equip" },
      tutorial: {
        tab: "equip",
        icon: "images/Icons/workshops/smithing_station.png",
        title: "Le palier",
        points: [
          { icon: "images/Icons/equipment_slots/slot_weapon.png", text: "Pour aller plus loin au Désert, il faut être équipé pour. Les trois compteurs de l'étape te disent où tu en es." },
          { icon: "images/Icons/dungeon/dungeon_weapon.png", text: "L'équipement Inhabituel se trouve au donjon, à la boutique et dans le butin des Petites Aventures." },
          { icon: "images/Icons/workshops/smithing_station.png", text: "La Forge du village peut monter d'un niveau avec du Verre trempé. Plus haut, elle reforge plus loin — et le niveau de reforge reste à l'emplacement quand tu changes de pièce." }
        ]
      },
      check: function (game) {
        var p = storyPalierDesert(game);
        return p.pieces >= STORY_PALIER_PIECES && p.armeVerte && p.forge >= STORY_PALIER_FORGE && p.reforge >= STORY_PALIER_REFORGE;
      },
      progress: function (game) {
        var p = storyPalierDesert(game);
        return "Inhabituels " + Math.min(p.pieces, STORY_PALIER_PIECES) + "/" + STORY_PALIER_PIECES
          + (p.armeVerte ? "" : " (arme comprise)")
          + " · Forge " + Math.min(p.forge, STORY_PALIER_FORGE) + "/" + STORY_PALIER_FORGE
          + " · Reforge de l'arme " + Math.min(p.reforge, STORY_PALIER_REFORGE) + "/" + STORY_PALIER_REFORGE;
      }
    },

    /* v3.317.0 (W-4c) — acte III §7. La bête sous la dune, anneau 3, atteignable par l'oasis
       ou la verrerie. Élite RÉPÉTABLE : on ne la tue pas, on la renvoie en bas. Chaque victoire
       donne sa Chitine (ELITE_DB.dard_profondeurs.winResource), ingrédient des reforges 5 et 6.
       Premier contenu calé SUR LE PALIER de l'étape 13, sur les dégâts. */
    {
      id: "desert_14",
      title: "La bête sous la dune",
      act: "Acte III — La cité engloutie",
      narrative: {
        objective: "La dune derrière l'oasis a bougé cette nuit. Pas le sable dessus : la dune elle-même. L'eau de la mare a baissé d'un doigt.",
        completion: "Le dard s'enfonce, puis toute la dune avec lui, en un long soupir. Le sable se referme. Au bout d'un moment, la mare remonte d'un doigt.",
        dialogue: [
          { who: "Wenna", text: "C'est celle de la cité ?" },
          { who: "Maddoc", text: "C'est la même. Elle remonte quand elle a soif." },
          { who: "Le Veilleur", text: "Elle était là avant la ville. Ils ont construit par-dessus. Ils pensaient que ça la tiendrait." }
        ],
        completionDialogue: [
          { who: "Wenna", text: "Elle est morte ?" },
          { who: "Maddoc", text: "Non. Elle est partie. Elle reviendra." },
          { who: "Wenna", text: "Et nous ?" },
          { who: "Maddoc", text: "Nous aussi." }
        ]
      },
      objectiveLabel: "Libérer la bête sous la dune (carte du Désert)",
      unlockTabs: [],
      reward: STORY_REWARDS.desert_14,
      linkTo: { section: "map", cardId: "livingmap_desert:bete_dune" },
      tutorial: {
        tab: "map",
        icon: "images/Icons/resources/chitine_profondeurs_icon.png",
        title: "Une bête qui revient",
        points: [
          { icon: "images/Icons/scene/node_encounter.png", text: "Cette bête revient. Tu peux la combattre à nouveau, et son butin avec elle." },
          { icon: "images/Icons/resources/chitine_profondeurs_icon.png", text: "Chaque victoire donne une Chitine des profondeurs : c'est ce qu'exigent les reforges 5 et 6, ouvertes par la Forge 3." },
          { icon: "images/Icons/combat_stats/stat_attack.png", text: "Chaque victoire du jour rend la suivante plus dure. Le lendemain, elle repart à sa force de base." }
        ]
      },
      check: function () { return !!(window.LivingMapManager && LivingMapManager.isLiberated("desert", "bete_dune")); },
      progress: function () {
        var freed = !!(window.LivingMapManager && LivingMapManager.isLiberated("desert", "bete_dune"));
        return "Bête renvoyée " + (freed ? "1/1" : "0/1");
      }
    },

    /* v3.319.0 (W-4d) — acte III §7, FIN DE L'ACTE III. Vaincre le sphinx au bout de la Cité
       engloutie : même forme que forest_14 avec le Basilic (game.dungeonTierCleared). Le boss
       est répétable comme tout boss de donjon — il ne meurt pas, il se recouche.
       C'est ici que le nom de NEZZAM est prononcé pour la première fois : il ouvre l'acte IV. */
    {
      id: "desert_15",
      title: "Ce qui garde la porte",
      act: "Acte III — La cité engloutie",
      narrative: {
        objective: "Dans la cité, les armures ont bougé. Elles ne regardent plus leurs rues : elles regardent toutes la place.",
        completion: "Le sphinx se couche lentement, comme on se rassoit. Ses yeux retournent à la rue.",
        dialogue: [
          { who: "Maddoc", text: "Elles savent que tu y vas." },
          { who: "Wenna", text: "Et lui ?" },
          { who: "Le Veilleur", text: "Lui le sait depuis que tu es entré. Il pose une question à ceux qui arrivent. Une seule." },
          { who: "Wenna", text: "Laquelle ?" },
          { who: "Le Veilleur", text: "Il la choisit en te regardant." }
        ],
        completionDialogue: [
          { who: "Le sphinx", text: "Il est parti par le fleuve, quand le fleuve coulait encore. Il reviendra par le fleuve. Je suis là pour le lui interdire." },
          { who: "Wenna", text: "Qui ?" },
          { who: "Le sphinx", text: "Nezzam." },
          { who: "Le Veilleur", text: "Tout ce qu'il a dit est vrai." }
        ]
      },
      objectiveLabel: "Vaincre le sphinx au bout de la Cité engloutie",
      unlockTabs: [],
      reward: STORY_REWARDS.desert_15,
      linkTo: { tab: "dungeon" },
      check: function (game) { return !!((game.dungeonTierCleared || {})[2]); },
      progress: function (game) { return "Sphinx vaincu " + ((game.dungeonTierCleared || {})[2] ? "1/1" : "0/1"); }
    }
  ]
};

/* v3.316.0 (W-4b) — le palier de l'étape 13, en un seul endroit pour que check et progress
   ne puissent pas diverger. Lecture seule : équipement porté, niveau du bâtiment Forge,
   niveau de reforge de l'arme. Aucun compteur ajouté nulle part. */
var STORY_PALIER_PIECES = 4;   // emplacements Inhabituels sur 7, l'arme comprise
var STORY_PALIER_FORGE = 3;    // niveau du bâtiment Forge (ouvre la reforge jusqu'à 6)
var STORY_PALIER_REFORGE = 4;  // niveau de reforge de l'arme — le maximum d'un bâtiment 2

function storyPalierDesert(game) {
  var portes = (game && game.equipped) || {};
  var rang = (window.RARITY_ORDER || ["common", "green", "rare", "epic", "legendary"]).indexOf("green");
  var pieces = 0, armeVerte = false;
  (window.EQUIPMENT_SLOTS || []).forEach(function (slot) {
    var it = portes[slot];
    if (!it) return;
    var r = (window.RARITY_ORDER || []).indexOf(it.rarity);
    if (r >= rang) {
      pieces++;
      if (slot === "weapon") armeVerte = true;
    }
  });
  return {
    pieces: pieces,
    armeVerte: armeVerte,
    forge: (window.VillageBuildingManager && typeof VillageBuildingManager.getLevel === "function") ? VillageBuildingManager.getLevel("forge") : 0,
    reforge: (window.ForgeManager && typeof ForgeManager.getLevel === "function") ? ForgeManager.getLevel("weapon") : 0
  };
}

/* v3.315.0 (W-4a2) : note au vol le passage de la vague 5 de la Cité engloutie (donjon 2), puis
   garde le drapeau. Lecture seule sur game.dungeonRun : aucun compteur ajouté au donjon. */
function storyCiteWave5(game) {
  if (!game) return false;
  if (!game.explorationProgression || typeof game.explorationProgression !== "object") game.explorationProgression = {};
  var run = game.dungeonRun;
  if (run && run.active && Number(run.dungeonId) === 2 && Number(run.wave) > 5) game.explorationProgression.citeVague5 = true;
  return !!game.explorationProgression.citeVague5;
}

window.STORY_REWARDS = STORY_REWARDS;
window.STORY_STARTER_WEAPON = STORY_STARTER_WEAPON;
window.STORY_TAB_LABELS = STORY_TAB_LABELS;
window.STORY_STEP15_OFFERING = STORY_STEP15_OFFERING;
window.storyOfferingMissing = storyOfferingMissing;
// v3.107.4 : Troll des forêts + Ronce animée réapparaissent au Cœur dès l'Acte III (v3.109.0 : dès « Franchir la Lisière ») —
// pool de base réduit (slime/goblin/spider, voir data/worlds.js), synchronisé dynamiquement par
// StoryQuestManager._trackKills() (systems/story-quest-system.js) selon l'étape Histoire en cours.
var STORY_COEUR_ACT3_STEP_ID = "forest_crossing";
var STORY_COEUR_BASE_POOL = ["slime", "goblin", "spider"];
var STORY_COEUR_ACT3_POOL = ["slime", "goblin", "spider", "foresttroll", "bramble"];

window.STORY_COEUR_ACT3_STEP_ID = STORY_COEUR_ACT3_STEP_ID;
window.STORY_COEUR_BASE_POOL = STORY_COEUR_BASE_POOL;
window.STORY_COEUR_ACT3_POOL = STORY_COEUR_ACT3_POOL;
window.STORY_QUESTS = STORY_QUESTS;
window.STORY_CHOICE_AXES = STORY_CHOICE_AXES;
window.storyChapterCounter = storyChapterCounter;
