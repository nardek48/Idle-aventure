"use strict";
/* data/story-quests.js — questline « Les Braises d'Aeswyn » (chapitre 1, Forêt) : 15 étapes séquentielles (v3.107.8 : « Les fondations » sortie ; v3.109.0 : « Franchir la Lisière » ajoutée).
   Accepter une étape débloque ses onglets ; l'objectif enseigne la mécanique ; réclamer donne la récompense. Logique : systems/story-quest-system.js */

/* Récompenses placeholder, regroupées ici pour le passage d'équilibrage or ultérieur. forest_10 (« Les fondations »)
   reste ici : réclamée via MissionBoard._workshopMissions (v3.107.8). Formats : gold, essence, healingPotion {id,count},
   equipmentRarity + equipmentCount, resources {clé Entrepôt: qté}. Viande/eau sur 6/7 : Petite ration (8 viande + 4 eau) craftable dès l'étape 8. */
var STORY_REWARDS = {
  forest_01: { gold: 50 },
  forest_02: { gold: 100, essence: 5 },
  forest_03: { gold: 150, essence: 5 },
  forest_04: { healingPotion: { id: "potion_soin_mineur", count: 1 } },
  forest_05: { gold: 400, essence: 10, potions: { potion_power: 1 } }, // v3.115.0 : découverte des potions per-run
  forest_06: { gold: 200, resources: { viande: 15 } },
  forest_07: { gold: 150, essence: 5, resources: { eau: 5 } },
  forest_08: { gold: 200, essence: 5 },
  forest_09: { gold: 200, essence: 5 },
  forest_crossing: { gold: 250, essence: 10 }, // v3.109.0 : Franchir la Lisière (placeholder, même échelle que 08/09)
  forest_10: { gold: 500, essence: 15, potions: { potion_endurance: 1, potion_power: 1 } }, // v3.115.0 : kit avant le Cœur
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

/* Étape 15, condition PROVISOIRE (à remplacer par le halo, voir ROADMAP §7) : 200 kills, ASCENSION_CONFIG.computeGain() ≥ 4.
   v3.109.0 : « 3 boss du Cœur » et « niveau 5 » retirés — le boss passe par la quête « Le Cœur de la Forêt » (run dédié,
   le farm libre relançait un cycle à chaque kill), et l'XP Histoire (15/étape) atteint le niveau 5 avant cette étape. */
var STORY_STEP15_PROVISIONAL = { totalKills: 200 };

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
   systems/story-quest-system.js:_trackKills) : coeurKills, coeurReached (v3.109.0, persistant : survit à une mort). */
function storyCounter(game, key) {
  var st = (game.storyQuests || {}).forest;
  return Number(((st && st.counters) || {})[key] || 0);
}

/* v3.109.0 : progression de la traversée de la Lisière pour le compteur de mission (enemyIndex 0..9, 10 = Cœur atteint). */
function storyLisiereCrossingProgress(game) {
  if (storyCounter(game, "coeurReached") >= 1) return 10;
  var wm = window.WorldManager;
  if (!wm || Number(wm.worldIndex || 0) !== 0) return 0;
  if (Number(wm.adventureIndex || 0) >= 1) return 10;
  return Math.min(9, Number(wm.enemyIndex || 0));
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
          completion: "Une pièce d'armure grossière, mais c'est un début. Tout se prend sur le corps des vaincus."
        },
        objectiveLabel: "Vaincre 5 ennemis à la Lisière et équiper 1 objet",
        unlockTabs: ["equip"],
        reward: STORY_REWARDS.forest_02,
        linkTo: { tab: "combat" },
        // v3.107.7 : tutorial déclaratif — popup pédagogique affiché une seule fois, à la première
        // arrivée sur l'onglet cible (tab) une fois l'étape acceptée. Voir switchTab() (ui-root.js)
        // pour le déclenchement, ui/tutorial-view.js pour le rendu.
        tutorial: {
          tab: "combat",
          icon: "⚔️",
          title: "Le combat",
          points: [
            { icon: "⚔️", text: "Attaque de base — frappe l'ennemi sans coûter de ressource. Toujours disponible." },
            { icon: "✨", text: "Compétences (1/2/3) — coûtent de la ressource de ta classe (Rage, Concentration ou Mana selon ton héros), pour plus de dégâts ou un effet spécial." },
            { icon: "🛡️", text: "Défense — réduit ou évite le prochain coup. Utile quand un badge comme celui-ci apparaît au-dessus de l'ennemi : il prépare une attaque plus forte.", preview: "charge" },
            { icon: "⚡", text: "Jauge de célérité — se remplit à chaque round. Une fois pleine, tu frappes deux fois d'affilée." }
          ]
        },
        // v3.107.1 : killTarget déclaratif — affiché comme compteur de mission en combat (combat-view.js)
        // et déclenche un retour auto au Campement une fois check() vrai (story-quest-system.js).
        killTarget: { label: "Premier sang", counter: storyCountForestKills, target: 5, autoReturn: true },
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
        objectiveLabel: "Acheter 1 amélioration d'entraînement",
        unlockTabs: ["more"],
        reward: STORY_REWARDS.forest_03,
        linkTo: { tab: "more", subTab: "amelioration" }, // v3.107.1 : direct sur le sous-onglet Amélioration (décision Seb)
        // v3.107.9 : chaque stat détaillée (décision Seb).
        tutorial: {
          tab: "more",
          icon: "⬆️",
          title: "L'Amélioration",
          points: [
            { icon: "⬆️", text: "Chaque amélioration augmente une statistique de façon permanente contre de l'or. Le prix grimpe à chaque achat — étale tes investissements plutôt que de tout miser sur une seule stat." },
            { icon: "💪", text: "Puissance — dégâts de ton attaque de base." },
            { icon: "🎯", text: "Précision — chance de coup critique." },
            { icon: "✨", text: "Volonté — dégâts bonus en cas de critique." },
            { icon: "❤️", text: "Endurance — PV maximum et une partie de ta défense." },
            { icon: "⚡", text: "Célérité — remplit ta jauge de combat plus vite (frappe bonus plus fréquente)." }
          ]
        },
        // v3.109.0 : condition « niveau 2 » retirée — l'XP est par mission depuis P4 (15/étape Histoire), le niveau 2
        // (20 XP) est atteint en réclamant forest_02, avant même d'accepter celle-ci : condition morte, libellé trompeur.
        check: function (game) { return storyCountTrainingUpgrades(game) >= 1; },
        progress: function (game) {
          return "Entraînement " + Math.min(1, storyCountTrainingUpgrades(game)) + "/1";
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
        objectiveLabel: "Faire 1 achat en boutique (Économie ou Potion)",
        unlockTabs: ["shop"],
        reward: STORY_REWARDS.forest_04,
        linkTo: { tab: "shop" },
        // v3.107.9 : potions détaillées (décision Seb).
        tutorial: {
          tab: "shop",
          icon: "🛒",
          title: "La Boutique",
          points: [
            { icon: "🛒", text: "La Boutique vend des potions et des améliorations d'Économie contre de l'or." },
            { icon: "🧪", text: "Potions de soin — sur le 2e onglet de la Boutique. Mineure (35 % PV, 150 or) ou Majeure (60 % PV, 3000 or). Utilisables en combat comme une action à part entière — elles consomment ton tour." },
            { icon: "⚠️", text: "Maximum 2 potions par sortie — pense à te ménager pour la suite du combat." }
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
        // v3.107.12 : popup déclenché sur Village (là où se trouve l'atelier Cuisine de camp),
        // pas sur l'écran de l'expédition elle-même — le craft doit se faire AVANT de lancer.
        tutorial: {
          tab: "village",
          icon: "🎒",
          title: "Fabriquer une ration",
          points: [
            { icon: "🎒", text: "Cette expédition consomme une Petite ration — il faut d'abord la fabriquer avant de partir." },
            { icon: "🔨", text: "Rends-toi au Village, dans l'atelier Cuisine de camp (bâtiment Chasse)." },
            { icon: "🥩", text: "Choisis la recette Petite ration (8 Viande + 4 Eau) et clique sur Fabriquer." },
            { icon: "🧭", text: "Une fois la ration en stock, reviens sur ce tableau et lance l'expédition — elle la consommera automatiquement." }
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
        linkTo: { section: "expedition", cardId: "exploration_unstableVein" },
        check: function () { return !!(window.MiningManager && MiningManager.isQuestCompleted()); },
        progress: function () { return (window.MiningManager && MiningManager.isQuestCompleted()) ? "1/1" : "0/1"; }
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
          icon: "🌟",
          title: "Les Talents",
          points: [
            { icon: "🌟", text: "Chaque niveau franchi te donne un point de talent à dépenser." },
            { icon: "🌳", text: "Les talents sont propres à ta classe et améliorent tes mécaniques de combat (ex. durée de ta Défense, vitesse de ta jauge de célérité, sang-froid en cas de mort...)." },
            { icon: "🔄", text: "Rien n'est figé : tu peux réinitialiser tous tes talents contre de l'or (150 or par point déjà investi) si tu changes d'avis sur ta répartition." }
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
          completion: "Le Grimoire agit à ta place quand tu ne regardes pas. Apprends à lui faire confiance."
        },
        objectiveLabel: "Remporter 10 victoires au Cœur de la forêt et activer 1 règle du Grimoire",
        unlockTabs: ["grimoire"],
        reward: STORY_REWARDS.forest_12,
        linkTo: { tab: "grimoire" },
        // v3.107.9 : Grimoire détaillé (nombre de règles vérifié dans le code).
        tutorial: {
          tab: "grimoire",
          icon: "📖",
          title: "Le Grimoire",
          points: [
            { icon: "📖", text: "Le Grimoire automatise tes actions en combat selon des règles conditionnelles que tu définis (ex. « si une charge est annoncée → Défense »)." },
            { icon: "🎚️", text: "Tu commences avec 2 règles disponibles, et tu en débloqueras d'autres au fil de ta progression dans le jeu." },
            { icon: "🔀", text: "Bascule entre mode Tactique (manuel, tu joues chaque round) et mode Grimoire (automatique, tes règles décident) à tout moment depuis l'écran Combat." }
          ]
        },
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
        // v3.109.0 : le Seigneur de guerre orc se vainc dans la quête « Le Cœur de la Forêt » (aq_forest_depths, run dédié,
        // liée ici comme « Prouver sa valeur » l'est à forest_05) — elle est aussi la porte du Désert (gatesNextWorld).
        objectiveLabel: "Vaincre 200 ennemis et terminer la quête « Le Cœur de la Forêt » (Seigneur de guerre orc)",
        unlockTabs: ["ascension"],
        reward: STORY_REWARDS.forest_15,
        linkTo: { section: "adventure", cardId: "adv_aq_forest_depths" },
        check: function (game) {
          return Number(game.totalKills || 0) >= STORY_STEP15_PROVISIONAL.totalKills && !!(game.adventureQuestsCompleted || {}).aq_forest_depths;
        },
        progress: function (game) {
          var c = STORY_STEP15_PROVISIONAL;
          return "Kills " + Math.min(c.totalKills, Math.floor(game.totalKills || 0)) + "/" + c.totalKills
            + " · Seigneur de guerre orc " + ((game.adventureQuestsCompleted || {}).aq_forest_depths ? "1/1" : "0/1");
        }
      }
    ]
  }
};

window.STORY_REWARDS = STORY_REWARDS;
window.STORY_TAB_LABELS = STORY_TAB_LABELS;
window.STORY_STEP15_PROVISIONAL = STORY_STEP15_PROVISIONAL;
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
