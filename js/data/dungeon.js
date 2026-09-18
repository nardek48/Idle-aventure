"use strict";
/* data/dungeon.js — un donjon PAR MONDE (v3.245.0, refonte Donjons, doc de conception v1.1 §3).
   Logique : systems/dungeon-system.js. Détail complet : COMMENTAIRES_ORIGINAUX.md */

var DUNGEON_CONFIG = {
  waveCount: 15,
  freeTicketsPerDay: 1,
  ticketResetHours: 24,
  ticketCostEssence: 100,
  ticketCostGrowth: 1.2,
  maxTicketPurchasesPerDay: 20,

  /* Multiplicateur par défaut des vagues normales. v3.253.0 : chaque donjon peut le
     surcharger par wavePremiumMult — la Forêt est passée à 2,8, les autres mondes gardent
     1,3 en attendant leur propre chantier d'équilibrage. */
  basePremiumMult: 1.3,
  waveRampMult: 1,
  bossPremiumMult: 1.8,

  fullClearGoldBase: 500,
  fullClearEssenceBase: 40,
  partialLootChance: 40,

  shardsPerWaveCleared: 1,
  shardsBossBonus: 10,

  /* v3.245.0 — Marques (doc §3.1, valeurs confirmées par sim/dungeon-bench.js, lot D-0). */
  maxMarks: 3,              // Marques actives au plus par run
  markStackBonus: 0.15,     // bonus d'or/essence/matériau par Marque active (1 + n × 0,15)
  specialPerMark: 2,        // matériau de monde supplémentaire par Marque (décision Seb 12.2 : +2)
  eliteShardsBonus: 3       // éclats en plus pour une vague élite passée
};

/* v3.245.0 — DUNGEON_TIERS est absorbé ici : chaque donjon EST le palier de son monde.
   id reste NUMÉRIQUE et égal à l'ancien numéro de palier : dungeonTierCleared,
   dungeonTiersEntered, le Codex (dungeon_tier_N) et forest_14 restent valides sans migration.

   worldRequired      index du monde à avoir atteint (plus haut jamais atteint, worldsEverReached)
   worldPower         échelle des vagues et pool d'ennemis (mondes 0..worldPower), inchangé
   difficultyMult     inchangé pour la Forêt ; les mondes 2 à 6 seront rebasés sur l'échelle
                      du monde quand leur monde sera travaillé (décision Seb 15/09/2026, rapport D-0 §5)
   eliteWaves         vague -> id de ELITE_DB ; null tant que le monde n'a pas ses élites
   boss               identité du boss final : baseId dans BOSS_DB, nom propre, trait signature
                      (archetype lu tel quel par combat-engine.js), statMult relatif, image optionnelle
   locked             donjon déclaré mais pas encore ouvert (art et banc manquants) */
var DUNGEONS = [
  {
    id: 1, key: "basilic",
    name: "Tanière du Basilic",
    worldId: "forest", worldRequired: 0, worldPower: 0, difficultyMult: 1,
    /* v3.253.0 (retour de jeu de Seb : « le donjon un peu facile »). Les vagues faisaient
       37 à 54 PV quand un ennemi de farm de la Forêt en fait 109 à 140 : elles valaient un
       tiers d'un combat ordinaire, tombaient en un ou deux rounds et n'usaient rien. Le boss
       était le seul vrai combat du run.
       Mesuré (sim/dungeon-bench.js, 40 runs × 3 classes) : monter le BOSS ne servait à rien
       — le run nu restait à 0 % d'échec jusqu'à 1 286 PV de boss, tandis que Colosses passait
       de 0 à 100 %. C'est l'usure des quinze vagues qui manquait.
       À 2,8 : vagues de 80 à 117 PV, run de 37-41 rounds au lieu de 24-28, les potions
       servent enfin, et les Marques restent jouables. */
    wavePremiumMult: 2.8,
    maxRarity: "common",
    specialResourceId: "seve_aeswyn", specialResourceAmount: 2,
    icon: "images/Dungeons/donjon_poison/donjon_poison.jpg",
    banner: "images/Dungeons/donjon_poison/donjon_poison_baniere.jpg",
    combatMap: "../images/Dungeons/donjon_poison/donjon_poison.jpg",
    desc: "Un antre reptilien tapi sous la roche, jusqu'au repaire du Basilic lui-même.",
    story: "Les premières salles sentent la terre humide et la mousse. Des bruits de pas résonnent au loin — rien de bien effrayant, pour l'instant.",
    enemyPool: null,
    eliteWaves: { 5: "araignee_marquee", 10: "ronce_ardente" },
    /* v3.288.0 — PHASES DU BASILIC (idée Seb). Deux seuils, pas plus : un combat de boss
       doit rester lisible. Chaque phase s'annonce dans le journal, et les renforts arrivent
       au round SUIVANT (engageIn), jamais par surprise.
         75 % : une couvée de serpents sort des failles — UN seul renfort, mesuré ; deux
                d'un coup quadruplaient déjà les morts sur la Fileuse.
         25 % : il enrage. L'archétype « enraged » existe depuis la v3.204 et fait monter
                ses dégâts à mesure qu'il perd des PV — il ne reste qu'à l'allumer.
       Tant qu'un renfort tient debout, son soin de boss est suspendu (combat-engine) :
       sinon les renforts allongeraient le combat et multiplieraient les soins. */
    boss: {
      baseId: "slimeking", name: "Basilic", archetype: "corrupted",
      statMult: { endurance: 1.2, power: 1.5 }, image: null,
      phases: [
        /* Seb parlait de serpents : il n'y en a pas au bestiaire. On prend l'araignée,
           qui existe et tient le rôle dans un antre humide. Le jour où un serpent est
           ajouté à ENEMY_DB, il suffit de changer cet identifiant. */
        { atPct: 0.75, adds: ["spider"], addsHpMult: 0.16, addsPowerMult: 0.45,
          label: "des fileuses descendent des voûtes" },
        { atPct: 0.25, archetype: "enraged", label: "il entre en rage" }
      ]
    },
    locked: false
  },
  {
    id: 2, key: "desert",
    name: "Cité engloutie",
    worldId: "desert", worldRequired: 1, worldPower: 1, difficultyMult: 2.5,
    maxRarity: "green",
    specialResourceId: null, specialResourceAmount: 0,
    icon: "images/Dungeons/Icone_base/palier2.jpg", banner: null, combatMap: null,
    desc: "Une cité que le sable a prise, salle après salle.",
    story: "Les couloirs se resserrent. Des ombres inhabituelles glissent entre les pierres, et l'air se charge d'une tension nouvelle.",
    enemyPool: null, eliteWaves: null,
    boss: { baseId: "djinn", name: "Sultan des sables", archetype: "vampiric", statMult: { endurance: 1, power: 1 }, image: null },
    /* v3.300.0 (W-2) : fermé jusqu'au lot W-4. La traversée rend le Désert atteignable, et ce
       donjon s'ouvrait sur worldRequired 1 sans pool, sans élites ni boss calibré. */
    locked: true
  },
  {
    id: 3, key: "ruins",
    name: "Sanctuaire scellé",
    worldId: "ruins", worldRequired: 2, worldPower: 2, difficultyMult: 6,
    maxRarity: "rare",
    specialResourceId: null, specialResourceAmount: 0,
    icon: "images/Dungeons/Icone_base/palier3.jpg", banner: null, combatMap: null,
    desc: "Ce que les ruines gardent encore, elles le gardent avec méthode.",
    story: "Un froid ancien s'infiltre jusque dans les os. Ces lieux ne sont pas laissés à l'abandon — quelque chose les garde, avec méthode.",
    enemyPool: null, eliteWaves: null,
    boss: { baseId: "skeletonlord", name: "Gardien scellé", archetype: "armored", statMult: { endurance: 1, power: 1 }, image: null },
    locked: false
  },
  {
    id: 4, key: "crypt",
    name: "Ossuaire",
    worldId: "crypt", worldRequired: 3, worldPower: 3, difficultyMult: 14,
    maxRarity: "epic",
    specialResourceId: null, specialResourceAmount: 0,
    icon: "images/Dungeons/Icone_base/palier4.jpg", banner: null, combatMap: null,
    desc: "Les os y sont rangés. Pas tous.",
    story: "Les murs eux-mêmes semblent respirer. Peu de ceux qui s'aventurent ici en ressortent sans égratignures — et encore moins sans butin.",
    enemyPool: null, eliteWaves: null,
    boss: { baseId: "necrosupreme", name: "Liche des sépulcres", archetype: "corrupted", statMult: { endurance: 1, power: 1 }, image: null },
    locked: false
  },
  {
    id: 5, key: "mountain",
    name: "Gueule du volcan",
    worldId: "mountain", worldRequired: 4, worldPower: 4, difficultyMult: 22,
    maxRarity: "epic", // le légendaire ne tombe qu'à la Tour (décision 12.1)
    specialResourceId: null, specialResourceAmount: 0,
    icon: "images/Dungeons/Icone_base/palier5.jpg", banner: null, combatMap: null,
    desc: "La montagne respire par ici. Chaud.",
    story: "Le seuil du dernier palier. Une puissance oubliée sommeille dans l'obscurité — et elle sait déjà que tu es arrivé.",
    enemyPool: null, eliteWaves: null,
    boss: { baseId: "ancientdragon", name: "Wyrm de cendres", archetype: "enraged", statMult: { endurance: 1, power: 1 }, image: null },
    locked: false
  },
  {
    id: 6, key: "tower",
    name: "Sommet interdit",
    worldId: "tower", worldRequired: 5, worldPower: 5, difficultyMult: 30,
    maxRarity: "legendary",
    specialResourceId: null, specialResourceAmount: 0,
    icon: null, banner: null, combatMap: null,
    desc: "Le sommet de la Tour, et ce qui s'y reflète.",
    story: "",
    enemyPool: null, eliteWaves: null,
    boss: { baseId: "archmage", name: "Reflet de l'Archimage", archetype: "vampiric", statMult: { endurance: 1, power: 1 }, image: null },
    locked: true, lockedHint: "Pas encore disponible"
  }
];

/* v3.245.0 — MARQUES de run (ex-afflictions, doc §3.3). Mêmes id et mêmes icônes que
   data/afflictions.js (aucune migration) ; Avarice n'est pas reprise. Les modificateurs sont
   lus par AfflictionManager.getCombinedModifiers() (Fragilité, Ascétisme, Fléau, cumul) ;
   Colosses et Traque agissent dans DungeonManager.buildWaveEnemy().
   unlock : null = libre ; "cleared" = disponible une fois le donjon terminé une fois. */
var DUNGEON_MARKS = [
  { id: "aff_colossus", name: "Colosses", icon: "images/Icons/afflictions/aff_colossus.png",
    desc: "Boss 2× PV · +50 % or et essence sur le boss", unlock: null,
    modifiers: { bossHpMult: 2, bossGoldBonusPct: 0.50, bossEssenceBonusPct: 0.50 } },
  { id: "aff_asceticism", name: "Ascétisme", icon: "images/Icons/afflictions/aff_asceticism.png",
    desc: "Potions interdites · +15 % dégâts", unlock: null,
    modifiers: { tapMult: 0.15, forbidPotions: true } },
  { id: "aff_fragility", name: "Fragilité", icon: "images/Icons/afflictions/aff_fragility.png",
    desc: "−30 % PV max · +30 % dégâts", unlock: null,
    modifiers: { heroMaxHpMult: 0.70, tapMult: 0.30 } },
  { id: "aff_plague", name: "Fléau", icon: "images/Icons/afflictions/aff_plague.png",
    desc: "Dégâts ennemis +30 % · +20 % or", unlock: "cleared",
    modifiers: { enemyPowerMult: 1.30, goldMult: 1.20 } },
  { id: "aff_elite", name: "Traque", icon: "images/Icons/afflictions/aff_elite.png",
    desc: "Chaque vague est une élite · +20 % or", unlock: "cleared",
    modifiers: { forceAllBosses: true, goldMult: 1.20 } }
];

/* Élite GÉNÉRIQUE de Traque pour un donjon sans élites de données : l'ennemi de la vague
   passe boss avec ces multiplicateurs relatifs (banc D-0 : 8–32 % d'échec seule en Forêt). */
var DUNGEON_GENERIC_ELITE_MULT = { endurance: 2.4, power: 1.1 };

var DUNGEON_SHOP = [
  { id: "d_power", name: "Lame du donjon", icon: "images/Icons/dungeon/dungeon_weapon.png", desc: "+2% dégâts globaux par niveau.", baseCost: 5, costMult: 1.30, maxLevel: 20 },
  { id: "d_gold", name: "Trésor du donjon", icon: "images/Icons/dungeon/dungeon_gold.png", desc: "+2% or global par niveau.", baseCost: 5, costMult: 1.30, maxLevel: 20 },
  { id: "d_essence", name: "Essence du donjon", icon: "images/Icons/essence_icon.png", desc: "+2% essence globale par niveau.", baseCost: 5, costMult: 1.30, maxLevel: 20 },
  { id: "d_defense", name: "Armure du donjon", icon: "images/Icons/dungeon/dungeon_armor.png", desc: "+1% défense par niveau.", baseCost: 5, costMult: 1.30, maxLevel: 20 }
];

window.DUNGEONS = DUNGEONS;
window.DUNGEON_CONFIG = DUNGEON_CONFIG;
window.DUNGEON_MARKS = DUNGEON_MARKS;
window.DUNGEON_GENERIC_ELITE_MULT = DUNGEON_GENERIC_ELITE_MULT;
window.DUNGEON_SHOP = DUNGEON_SHOP;
