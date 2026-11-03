"use strict";
/* data/faille.js — v3.638.0 (Faille, lot F-1) : la faille sans fond, ouverte une fois la Question répondue.
   Conception « Faille » v0.1 (idees/, validée par Seb le 03/11). Moteur partagé : systems/labyrinth-run.js (sorte « faille »).
   On y MONTE (la Tour, « là-haut ») et on redescend avec le sac. Chiffres de départ, à caler au banc au lot F-2 (FA4). */

var FAILLE_CONFIG = {
  worldId: "tower",
  adventureIndex: 1,                 // ennemis et héros de référence : la Tour (WORLD_HERO_SCALING.refByWorld.tower)
  reserve: 2,                        // FA7 : 2 montées, une revient toutes les 6 h
  rechargeMs: 6 * 3600e3,
  entryCost: { resourceId: "grande_ration", amount: 1 }, // FA7 : même coût que la faille de l'étape 17

  /* Étages : mêmes grilles que le Labyrinthe (le moteur est le même) */
  sizeBase: { w: 5, h: 6 }, sizeMax: { w: 6, h: 8 },
  stairsDist: { base: 9, perFloor: 1, max: 16 },
  loopPct: 0.12, gatesFrom2: 2, decoyFrom: 4,
  costMaxBase: 44, costMaxPerGate: 10,

  /* Souffle */
  breathStart: 100, step: 3, pull: 4, breathFloor: 50, // v3.640.0 (FA4) : +50 par escalier (au banc, +30 arrêtait toutes les montées vers l'étage 7)
  springBreath: 25, springHealPct: 0.20,

  /* Gardes : ennemis de la Tour ; FA4 : +6 % composés par étage (pas de fond, la montée doit finir par fermer) */
  guardFoes: ["guardian", "corruptmage", "hybrid"], guardPack: 2, guardMult: 1.2, guardPerFloor: 0.06, guardCompound: true,
  guardFoeMult: { guardian: 1, corruptmage: 1, hybrid: 1 },

  /* FA6 : la forme au sol suit (tous les 3 pas, dès l'étage 3). Elle ne se bat pas : elle prend du Souffle et recule. */
  foeTouch: 10, foeFrom: 3, foeEvery: 3, foeEveryFast: 3, foeFastFrom: 9999, foeStun: 4,

  /* FA5 : le Reflet garde l'escalier tous les 5 étages ; sa force suit l'étage, comme les gardes */
  bossEvery: 5, bossFoe: "corruptmage", bossHpMult: 5.3, bossPowMult: 1.6, bossCompound: true,
  bossName: "Le Reflet",
  combatGold: { guard: 1.7, foe: 2.5, boss: 6 },
  ruseBase: 0.6, rusePerFloor: 0.05, ruseMin: 0.3, ruseBreath: 10,
  fleeBreath: 10,
  refGoldFoe: "guardian",            // or de référence : un gardien de la Tour

  /* Gains : du Givre bleu (FA8 : butin courant ; la Mémoire 25 à 28 viendra au lot F-3) */
  stairsStones: 1, stairsStonesPerFloor: 0, stairsGoldPerFloor: 150,
  chestStones: 1, chestStonesPerTwoFloors: 0, chestGoldPerFloor: 100,
  bossStones: 3,
  stoneResource: "givre_bleu",

  /* v3.640.0 (lot F-2, FA3) : LES ÉCHOS. Un écho tiré par étage dès l'étage 2 (jamais deux fois le même de suite),
     le palier sur l'étage du Reflet. Règles au niveau de la carte et du pronostic, sans moteur de combat. */
  echoes: ["sable", "rue", "gisants", "veine", "palier"], echoFrom: 2, bossEcho: "palier",
  echoSandStep: 1.5, echoSandSpring: 2,  // le sable : chaque pas ×1,5 de Souffle ; la source rend le double
  echoSleepPct: 0.5, echoSleepPack: 3,   // les gisants : une garde sur deux dort ; la combattre en réveille une troisième
  echoVeinHeat: 0.08, echoVeinMax: 5, echoVeinGain: 1, // la veine : +1 Givre bleu par taille, +8 % de coups reçus sur l'étage
  echoMirror: 0.25                       // le palier : même approche que le combat précédent, +25 % de coups reçus
};

/* Tuiles à générer (Images à générer, famille « La faille ») : vrai chemin gardé, l'icône générique en attendant. */
var FAILLE_TILES = {
  rooms: ["images/Maps/faille/salle_1.webp", "images/Maps/faille/salle_2.webp", "images/Maps/faille/salle_3.webp"],
  corridor: "images/Maps/faille/couloir.webp",
  pan: "images/Maps/faille/pan.webp",
  lever: "images/Maps/faille/levier.webp",
  stairsDown: ["images/Maps/faille/escalier_1.webp", "images/Maps/faille/escalier_2.webp"],
  stairsUp: "images/Maps/faille/palier.webp",
  spring: "images/Maps/faille/source.webp",
  chest: "images/Maps/faille/givre.webp",
  vein: "images/Maps/faille/veine.webp",       // v3.640.0 : la veine (écho de la Montagne)
  bossRoom: "images/Maps/faille/salle_reflet.webp",
  bossPortrait: "images/Boss/reflet.webp",   // la fiche du Reflet (Sommet interdit) : même image, déjà listée
  icon: "images/Icons/quest_icons/exploration/faille.webp",
  foeGlyph: "👤"
};

var FAILLE_TEXTS = {
  title: "La faille",
  blurb: "Ce qu'elle n'a pas fini de prendre. Des étages sans fond, et chacun plus dur que le précédent.",
  floorNames: ["Le premier palier", "Les marches qui manquent", "La salle qui se répète", "Le froid sans vent",
    "Le palier du Reflet", "Plus haut que la Tour", "Là où elle n'a rien appris"],
  floorLines: ["La lumière bleue passe sous tes pieds. Il n'y a pas de fond, seulement des marches.",
    "Il manque des marches. Elle ne les a pas oubliées : elle ne les a jamais vues.",
    "Cette salle, tu l'as déjà traversée. Elle aussi s'en souvient.",
    "Il fait froid, et aucun vent ne passe.",
    "Quelqu'un attend devant l'escalier. Il a tes gestes, avec un temps de retard.",
    "Plus haut que la Tour. Plus haut que ce que le Veilleur a écrit.",
    "Ici, elle n'a rien appris. Elle regarde."],
  /* FA1 : la première ligne de la montée dit la fin choisie (clés de TOWER_FINS) */
  entryLines: {
    sienne: "Tu es en haut. Elle continue de descendre en toi.",
    aeswyn: "La couture bleue pâlit. Dessous, il reste ce qu'elle n'a pas pris.",
    tienne: "Le ciel est toujours fendu. Tu montes parce que tu peux.",
    rien: "La braise tient. Là-haut, ça ne tient pas. Aldric dit d'y aller doucement."
  },
  guardLines: ["Un gardien tient le levier, la main posée dessus, comme on l'a posée là.",
    "Un mage corrompu parle au levier. Le levier ne répond pas.",
    "Un hybride tourne autour du levier. Il n'a pas décidé ce qu'il est."],
  bossLine: "Il se bat comme toi, avec un geste de retard. Il garde ce que tu viens de faire.",
  /* v3.640.0 (FA3) : les cinq échos. Chaque étage se souvient d'un monde et en reprend la leçon. */
  echoes: {
    sable: { name: "L'étage du sable", rule: "la soif", line: "Du sable sur les marches, venu de nulle part. Chaque pas coûte plus de Souffle ; la source rend le double." },
    rue: { name: "La rue qui tient", rule: "la relève", line: "Une rue, entre deux paliers. Ce qui tombe ici se relève quand tu repasses, sauf si tu l'as achevé en chargeant." },
    gisants: { name: "Les gisants debout", rule: "le sommeil", line: "Des gisants debout contre les murs. Une garde sur deux dort : on passe sans la réveiller, ou on la paie." },
    veine: { name: "La veine du dedans", rule: "la chaleur", line: "Une veine bat dans la pierre. La tailler rapporte du givre, et chaque coup réchauffe l'étage." },
    palier: { name: "Le palier sans murs", rule: "le miroir", line: "Ici, elle garde tes gestes. La même approche deux fois de suite coûte plus cher." }
  },
  /* Textes propres à la faille (LabyrinthRun.say) : sans clé ici, le texte du Labyrinthe */
  say: {
    locked: "La faille s'ouvre une fois la Question répondue",
    nextIn: "Prochaine montée dans {d}",
    reserve: "{a}/{b} montées",
    startLog: "Tu montes dans la faille.",
    endLog: "Faille : redescendu de l'étage {n}.",
    koLog: "Tu te réveilles au dernier camp. La moitié du sac est restée là-haut.",
    spring: "Une flaque de lumière, qui ne mouille pas. Souffle +{n}, PV +{p} %.",
    chest: "Du givre pris dans la pierre : +{s} Givre bleu, +{g} or.",
    touched: "La forme au sol te rejoint. Elle ne frappe pas : elle regarde. Souffle −{n}.",
    hintWall: "Une lumière froide, quelque part. Un mur vous sépare.",
    hintNear: "Une lumière froide, tout près — {dir}.",
    hintFar: "Une lumière froide, {dir}.",
    bossDown: "Le Reflet se défait. +{n} Givre bleu.",
    pullNote: "Tu le notes sur ta carte, en violet. Souffle −{n}.",
    chartAria: "Ouvrir ta carte",
    chartCap: "Ta carte",
    chartTitle: "Ta carte",
    noPath: "Aucun chemin tracé jusque-là.",
    hudBoss: "Reflet",
    bag: "Sac : {s} Givre bleu · {g} or",
    foeStunned: "La forme au sol : immobile",
    foeClose: "Une lumière froide, tout près",
    foeSomewhere: "La forme au sol : quelque part",
    leverNew: "Personne ne sait encore ce qu'il fait tourner.",
    stairsSub: "Étage {n} franchi · +{s} Givre bleu",
    stairsBag: "Dans le sac : {s} Givre bleu, {g} or.",
    climbCost: "Monter : Souffle +{n}, étage plus dur. Tomber ou t'essouffler plus haut fait perdre la moitié du sac.",
    climbBtn: "Monter à l'étage {n}",
    leaveBagBtn: "Redescendre avec le sac",
    leaveBtn: "Redescendre",
    leaveTitle: "Redescendre ?",
    leaveLine: "Tu redescends avec tout le sac : {s} Givre bleu, {g} or.",
    koLine: "Tu tombes. Tu te réveilles au dernier camp. La moitié du sac est restée là-haut.",
    bossDownTitle: "Le Reflet se défait",
    stones: "Givre bleu",
    endTitle: "La faille",
    endRemonteTitle: "Redescendu de la faille",
    endAbandonTitle: "Montée abandonnée",
    endRemonte: "Tu redescends. Derrière toi, les étages se défont déjà.",
    endKo: "Tu te réveilles au dernier camp. Elle a gardé la moitié du sac. Elle garde toujours quelque chose.",
    endSouffle: "Tu ne sens plus tes jambes. Tu redescends à tâtons, une marche après l'autre.",
    endAbandon: "Tu redescends sans te retourner.",
    lost: "Resté là-haut : {s} Givre bleu, {g} or.",
    statCaught: "Rejoint par la forme au sol",
    endChartCap: "Ta carte · étage {n}",
    /* v3.640.0 (FA3) : les échos */
    rise: "La garde se relève. Il fallait l'achever.",
    asleepLine: "La garde dort debout, la main sur le levier. Elle ne t'a pas entendu.",
    veinTitle: "La veine",
    veinSub: "Tailler : +{g} Givre bleu · Souffle −{n}",
    veinHeat: "Chaleur de l'étage : coups reçus +{p} %.",
    veinCold: "La pierre est encore froide.",
    veinCut: "Tu tailles. +{g} Givre bleu, l'étage chauffe : coups reçus +{p} %. Souffle −{n}.",
    veinDone: "La veine ne bat plus. Il n'y a plus rien à tailler.",
    veinLeft: "Encore {n} tailles possibles.",
    veinBtn: "Tailler",
    mirror: "Le miroir : +{p} %",
    heat: "Chaleur : +{p} %"
  }
};

/* La sorte « faille » du moteur à leviers : ouverte une fois la Question répondue (TowerSystem.ending). */
LAB_KINDS.faille = {
  config: FAILLE_CONFIG, tiles: FAILLE_TILES, texts: FAILLE_TEXTS, stateKey: "faille",
  isUnlocked: function () { return !!(window.TowerSystem && TowerSystem.ending()); },
  /* FA1 : au premier étage, la ligne de la fin choisie (texte des données, traduit à l'affichage) */
  floorNote: function (run) {
    var f = run.floor === 1 && window.TowerSystem ? TowerSystem.ending() : null;
    return f && FAILLE_TEXTS.entryLines[f] ? FAILLE_TEXTS.entryLines[f] : null;
  }
};

window.FAILLE_CONFIG = FAILLE_CONFIG;
window.FAILLE_TILES = FAILLE_TILES;
window.FAILLE_TEXTS = FAILLE_TEXTS;
