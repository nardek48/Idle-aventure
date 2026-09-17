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
  forest_15: { gold: 1000, essence: 30, equipmentRarity: "common", equipmentCount: 1 }
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

/* v3.260.0 (retour Seb) : les objectifs de kills repartent de 0 à l'acceptation. forestKillsBase
   est posé par onAccept de forest_02 ; absent (save acceptée avant la version) = ancien comptage. */
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
   systems/story-quest-system.js:_trackKills) : coeurKills, coeurReached (v3.109.0, persistant : survit à une mort). */
function storyCounter(game, key) {
  var st = (game.storyQuests || {}).forest;
  return Number(((st && st.counters) || {})[key] || 0);
}

/* v3.261.0 (retour Seb) : « Franchir la Lisière » est une traversée COMPLÈTE — l'acceptation ramène
   au début de la Lisière. Même garde que storyGoToCoeur : une activité dédiée en cours n'est pas
   touchée, le retour est alors reporté (StoryQuestManager._trackKills le rejoue). Renvoie true si fait. */
function storyResetLisiere(g) {
  if (!window.WorldManager) return false;
  if (g.dungeonRun && g.dungeonRun.active) return false;
  if (g.adventureQuestRun && g.adventureQuestRun.active) return false;
  if (g.huntRun && g.huntRun.active) return false;
  if (g.livingMaps && g.livingMaps.fight) return false;
  if (g.sceneRun && g.sceneRun.status && g.sceneRun.status !== "completed") return false;
  var moved = WorldManager.worldIndex !== 0 || WorldManager.adventureIndex !== 0 || WorldManager.enemyIndex !== 0;
  WorldManager.worldIndex = 0;
  WorldManager.adventureIndex = 0;
  WorldManager.enemyIndex = 0;
  if (moved && window.CombatEngine && typeof CombatEngine.spawnEnemy === "function") CombatEngine.spawnEnemy();
  return true;
}

/* v3.109.0 : progression de la traversée de la Lisière pour le compteur de mission (enemyIndex 0..9, 10 = Cœur atteint). */
function storyLisiereCrossingProgress(game) {
  if (storyCounter(game, "crossingReset") >= 1) return 0; // retour à la Lisière pas encore appliqué
  if (storyCounter(game, "coeurReached") >= 1) return 10;
  var wm = window.WorldManager;
  if (!wm || Number(wm.worldIndex || 0) !== 0) return 0;
  if (Number(wm.adventureIndex || 0) >= 1) return 10;
  return Math.min(9, Number(wm.enemyIndex || 0));
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

/* v3.131.2 (forest_12), factorisé v3.134.0 (réutilisé par forest_13) : repositionne le joueur au Cœur de la forêt
   (worldIndex 0 / adventureIndex 1) et régénère un ennemi cohérent. Ne fait rien si une activité de combat dédiée
   (donjon/aventure/chasse/scene) est en cours — le joueur y est engagé volontairement. Idempotent si déjà au Cœur
   (l'ennemi en cours n'est pas remplacé). */
function storyGoToCoeur(g) {
  if (!window.WorldManager) return;
  if (g.dungeonRun && g.dungeonRun.active) return;
  if (g.adventureQuestRun && g.adventureQuestRun.active) return;
  if (g.huntRun && g.huntRun.active) return;
  if (g.sceneRun && g.sceneRun.status && g.sceneRun.status !== "completed") return;
  var alreadyAtCoeur = WorldManager.worldIndex === 0 && WorldManager.adventureIndex === 1;
  WorldManager.worldIndex = 0;
  WorldManager.adventureIndex = 1;
  if (!alreadyAtCoeur) {
    WorldManager.enemyIndex = 0;
    if (window.CombatEngine && typeof CombatEngine.spawnEnemy === "function") CombatEngine.spawnEnemy();
  }
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
        objectiveLabel: "Vaincre 5 ennemis à la Lisière", // v3.260.0 : l'équipement passe à forest_03
        unlockTabs: ["equip"],
        reward: STORY_REWARDS.forest_02,
        linkTo: { tab: "combat" },
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
        // v3.107.1 : killTarget déclaratif — affiché comme compteur de mission en combat (combat-view.js)
        // et déclenche un retour auto au Campement une fois check() vrai (story-quest-system.js).
        killTarget: { label: "Premier sang", counter: storyForestKillsSinceAccept, target: 5, autoReturn: true },
        onAccept: function (game, st) { st.counters.forestKillsBase = storyCountForestKills(game); },
        check: function (game) { return storyForestKillsSinceAccept(game) >= 5; },
        progress: function (game) {
          return "Kills " + Math.min(5, storyForestKillsSinceAccept(game)) + "/5";
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
        objectiveLabel: "Atteindre le Cœur de la forêt (enchaîner la Lisière jusqu'au Roi Slime)",
        unlockTabs: [],
        reward: STORY_REWARDS.forest_crossing,
        linkTo: { tab: "combat" },
        killTarget: { label: "Vers le Cœur", counter: storyLisiereCrossingProgress, target: 10, autoReturn: true },
        onAccept: function (game, st) { // v3.261.0 : la traversée repart de 0
          st.counters.coeurReached = 0;
          st.counters.crossingReset = storyResetLisiere(game) ? 0 : 1;
        },
        check: function (game) { return storyCounter(game, "coeurReached") >= 1; },
        progress: function (game) { return "Lisière " + storyLisiereCrossingProgress(game) + "/10"; }
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
            { icon: "images/Icons/quests/quest_side.png", text: "Chaque niveau franchi te donne un point de talent à dépenser." },
            { icon: "images/Icons/plots/preserved_wood.png", text: "Les talents sont propres à ta classe et améliorent tes mécaniques de combat (ex. durée de ta Défense, vitesse de ta jauge de célérité, sang-froid en cas de mort...)." },
            { icon: "images/Icons/system/reset.png", text: "Rien n'est figé : tu peux réinitialiser tous tes talents contre de l'or (150 or par point déjà investi) si tu changes d'avis sur ta répartition." }
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
        objectiveLabel: "Remporter 10 victoires au Cœur de la forêt et activer 1 règle du Grimoire",
        // v3.131.0 : pas de killTarget ici (check combine coeurKills + règle active) — autoReturn
        // générique pour quand même ramener au Campement dès l'objectif atteint, comme forest_02/forest_11.
        autoReturn: true,
        unlockTabs: ["grimoire"],
        reward: STORY_REWARDS.forest_12,
        // v3.131.2 (retour Seb) : tant qu'aucune règle n'est configurée, le lien mène au
        // Grimoire (il faut d'abord aller le configurer). Dès qu'au moins 1 règle est active,
        // il mène directement au combat — beforeGo repositionne le joueur au Cœur de la forêt
        // (worldIndex 0 / adventureIndex 1) et régénère un ennemi cohérent à cette position,
        // au cas où le joueur ait bougé ailleurs entre-temps (autre aventure, donjon...).
        linkTo: {
          tab: function (g) { return storyCountActiveGrimoireRules(g) >= 1 ? "combat" : "grimoire"; },
          // pas encore de règle -> pas de repositionnement, direction Grimoire normale
          beforeGo: function (g) { if (storyCountActiveGrimoireRules(g) >= 1) storyGoToCoeur(g); }
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
        onAccept: function (game, st) { st.counters.coeurKills = 0; }, // v3.260.0 : seules les victoires après acceptation comptent
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
        objectiveLabel: "Remporter 3 combats avec Wenna à tes côtés",
        unlockTabs: ["companions"],
        reward: STORY_REWARDS.forest_wenna,
        linkTo: { tab: "combat" },
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
