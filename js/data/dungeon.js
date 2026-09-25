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
    /* v3.326.0 (plan C-2) : 1 -> 1,8. Banc sim/plafond-bench.js, entr. 60 avec les uniques des
       deux élites : Basilic 100 %, 42-53 rounds, 48-52 % de PV, 0,3-0,7 potion. Objectif de
       l'étape 13 (5 vagues sous une Marque) tenu à 100 % même en vitrine. ATTENTION : sans arme
       unique ni équivalent (vitrine seule), le run complet tombe à 0 % dès 1,4. */
    worldId: "forest", worldRequired: 0, worldPower: 0, difficultyMult: 1.8,
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
      statMult: { endurance: 1.2, power: 1.5 }, image: "./images/Boss/basilic.jpg", // v3.348.0
      phases: [
        /* Seb parlait de serpents : il n'y en a pas au bestiaire. On prend l'araignée,
           qui existe et tient le rôle dans un antre humide. Le jour où un serpent est
           ajouté à ENEMY_DB, il suffit de changer cet identifiant. */
        { atPct: 0.75, adds: ["spider"], addsHpMult: 0.16, addsPowerMult: 0.45,
          label: "des fileuses descendent des voûtes" },
        { atPct: 0.25, archetype: "enraged", label: "il entre en rage" }
      ]
    },
    locked: false,
    /* v3.315.0 (W-4a2) : ces deux étapes étaient nommées en dur dans isStoryTicketFree
       (dungeon-system.js). Elles vivent maintenant dans la donnée, comme pour la Cité. */
    storyChapterId: "forest",
    storyFreeSteps: ["forest_13", "forest_14"]
  },
  {
    id: 2, key: "desert",
    name: "Cité engloutie",
    /* v3.319.0 (W-4d) : difficultyMult 2,5 -> 1,7, mesuré. À 2,5 le Chevalier mourait dans
       les vagues avant même de voir le boss (15,0 vagues tenues pour les classes à distance,
       14,7 pour lui, 0 % de boss). La difficulté du donjon passe dans le SPHINX, pas dans
       l'usure des quinze vagues — c'est la leçon du Basilic, appliquée. */
    /* v3.326.0 (plan C-2) : 1,7 -> 2,6, avec les élites des vagues 5 et 10 recalées. Banc
       sim/plafond-bench.js, fin d'acte III (Mar) : sphinx 75 / 95 / 95 %, 53-66 rounds, 1,1-1,9
       potion. Début d'acte III : vague 5 passée à 100 % (objectif de l'étape 12), sphinx 0 %.
       Le Chevalier reste en retrait : chantier des arbres de talents par classe. */
    worldId: "desert", worldRequired: 1, worldPower: 1, difficultyMult: 2.6,
    maxRarity: "green",
    // v3.321.0 (décision Seb) : la matière brute de la Petite Aventure du monde, comme la Sève en Forêt
    specialResourceId: "verre_des_dunes", specialResourceAmount: 2,
    icon: "images/Dungeons/Icone_base/palier2.jpg", banner: null, combatMap: null,
    desc: "Une cité que le sable a prise, salle après salle.",
    story: "Les couloirs se resserrent. Des ombres inhabituelles glissent entre les pierres, et l'air se charge d'une tension nouvelle.",
    /* v3.315.0 (W-4a2, acte III §5) : le pool du Désert, les quatre bêtes de l'usure.
       Vague élite 5 = le Serment sous l'armure, le même TYPE qu'à la tour de guet : la cité
       en est pleine. Vague 10 : le Dard des profondeurs — la même bête qu'à la dune (acte III §7). */
    enemyPool: ["scarab", "scorpion", "sandworm", "sandwarrior"],
    eliteWaves: { 5: "serment_armure", 10: "dard_profondeurs" }, // v3.317.0 (W-4c) : la vague 10 arrive
    /* v3.319.0 (W-4d, décision Seb) — LE SPHINX remplace le « Sultan des sables », qui
       empruntait le Djinn des dunes (BOSS_DB). Deux seuils de phase, comme le Basilic,
       et la difficulté portée par les DÉGÂTS et les renforts, jamais par la seule barre de
       vie : mesuré au Basilic (les PV ne changeaient rien) puis reconfirmé en v3.318.0.
         66 % : deux armures du Serment sortent des rues — il cesse d'attendre une réponse ;
         33 % : il change d'archétype et frappe comme il regarde, droit devant.
       Tant qu'un renfort tient debout, son soin de boss reste suspendu (combat-engine). */
    boss: {
      baseId: "sphinx", name: "Le sphinx", archetype: "armored",
      /* Calibré au banc (sim/cite-vague5-bench.js --profil palier, 16 runs/classe, sans
         Marque), sur les VRAIES stats de BOSS_DB : Chevalier 69 % de boss vaincu en brûlant
         ses deux potions, Rôdeur et Mage 100 % pour 0,6 à 0,9. Multiplicateurs sous 1 parce
         que la base est déjà un boss (104 d'endurance) : on ne le gonfle pas, on l'aiguise.
         L'écart entre classes sur un run long est un chantier à part (voir le changelog). */
      statMult: { endurance: 0.8, power: 1.6 }, image: null,
      phases: [
        { atPct: 0.66, adds: ["sandwarrior", "sandwarrior"], addsHpMult: 0.18, addsPowerMult: 0.5,
          label: "il n'attend plus de réponse" },
        { atPct: 0.33, archetype: "enraged", label: "il regarde la rue" }
      ]
    },
    /* v3.300.0 (W-2) : fermé jusqu'au lot W-4, faute de pool, d'élites et de boss calibré.
       v3.315.0 : le verrou de donnée tombe, remplacé par un verrou d'HISTOIRE — la cité s'ouvre
       à l'étape 12 et pas à l'arrivée au Désert (getLockReason lit requiresStoryStep). */
    locked: false,
    requiresStoryStep: "desert_12",
    lockedHint: "Le sable la garde encore.",
    storyChapterId: "desert",
    storyFreeSteps: ["desert_12", "desert_15"] // v3.319.0 : l'entrée est aussi offerte pour le sphinx
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

/* v3.321.0 (décision Seb, 23/09/2026) : la boutique ne vend plus de PUISSANCE. Dégâts et défense
   faussaient le calibrage (aucun banc ne les voyait) ; or et essence ne touchaient que les kills,
   moins de 10 % des revenus. Chaque article déclare un `effect` et un `perLevel`, lus par
   DungeonManager.getShardEffect() ; un article absent d'ici n'agit plus. Prix provisoires. */
var DUNGEON_SHOP = [
  { id: "d_sacoche", name: "Sacoche du donjon", icon: "images/Icons/dungeon/dungeon_sacoche.png",
    desc: "+1 matériau de monde par run réussi, par niveau.",
    effect: "specialBonus", perLevel: 1, baseCost: 20, costMult: 1.5, maxLevel: 5 },
  { id: "d_cle", name: "Clé de faille", icon: "images/Icons/dungeon/dungeon_cle.png",
    desc: "−10 % sur le coût en essence des tickets achetés, par niveau.",
    effect: "ticketDiscount", perLevel: 0.10, baseCost: 15, costMult: 1.4, maxLevel: 5 },
  { id: "d_doigte", name: "Doigté de l'Enchanteresse", icon: "images/Icons/dungeon/dungeon_doigte.png",
    desc: "−1 Sève par relance d'affixe, par niveau (jamais moins d'une).",
    effect: "seveDiscount", perLevel: 1, baseCost: 30, costMult: 1.6, maxLevel: 3 },
  { id: "d_eclaireur", name: "Carte de l'éclaireur", icon: "images/Icons/dungeon/dungeon_eclaireur.png",
    desc: "+1 Petite Aventure par jour, par niveau.",
    effect: "paBonus", perLevel: 1, baseCost: 60, costMult: 2, maxLevel: 2 }
];

window.DUNGEONS = DUNGEONS;
window.DUNGEON_CONFIG = DUNGEON_CONFIG;
window.DUNGEON_MARKS = DUNGEON_MARKS;
window.DUNGEON_GENERIC_ELITE_MULT = DUNGEON_GENERIC_ELITE_MULT;
window.DUNGEON_SHOP = DUNGEON_SHOP;
