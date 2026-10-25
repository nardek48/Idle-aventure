"use strict";
/* data/pa2-content.js — v3.381.0 (Petites Aventures v2, lot PA2-0) : contenu et réglages du mode.
   Conception Petites Aventures v2 v1.1 (décisions V1-V19, Q1-Q12). Purement des données.
   Les chiffres marqués « banc » sont des points de départ : ils se calent au lot PA2-3
   (sim/pa2-bench.js), jamais à la main. Textes déclarés dans js/lang/data-fields.js. */

/* Besace : 6 places (V11). */
var PA2_BAG_SIZE = 6;

/* Objets de besace (V11, Q5). size = places occupées. uses = charges (consommables).
   resource = pris dans l'Entrepôt au départ, rendu s'il n'a pas servi (Q5). Sans resource :
   matériel gratuit et illimité. unlock = objet du coffre d'expédition (V12, Q8), gagné à la
   destination indiquée. Les rations reprennent le nom de l'Entrepôt (WAREHOUSE_RESOURCES). */
var PA2_ITEMS = {
  petite_ration: { id: "petite_ration", resource: "petite_ration", size: 1, uses: 1, healPct: 0.35,
    icon: "images/Icons/resources/petite_ration_icon.webp",
    pro: "Rend 35 % des PV. Cuisinée au camp ou au seuil : 70 % et une blessure en moins." },
  ration: { id: "ration", resource: "ration", size: 2, uses: 1, healPct: 0.60, healsWound: true,
    icon: "images/Icons/resources/ration_icon.webp",
    pro: "Rend 60 % des PV et efface une blessure.", con: "Encombrante." },
  grande_ration: { id: "grande_ration", resource: "grande_ration", size: 3, uses: 1, healPct: 1.00, healsWound: true,
    icon: "images/Icons/resources/grande_ration_icon.webp",
    pro: "Rend tous les PV et efface une blessure.", con: "Prend la moitié de la besace." },
  gourde: { id: "gourde", name: "Gourde", size: 1, uses: 2, breath: 25,
    icon: "images/Icons/scene/water_flask.webp",
    pro: "Deux gorgées : +25 Souffle chacune." },
  // v3.387.0 (PA2-5, F2) : l'Outre du Désert, prise à l'Entrepôt. Puits sec tenu : +15 ; Outre de cuir (Mémoire) : ×1,5.
  outre: { id: "outre", resource: "outre_pleine", size: 1, uses: 1, breath: 40, worlds: ["desert"], bonusEffect: "outre_plus",
    icon: "images/Icons/resources/outre_pleine_icon.webp",
    pro: "Une grande gorgée : +40 Souffle.", con: "Une seule gorgée." },
  // v3.429.0 (Ruines, U-6) : la Craie d'Edda, gratuite. Chaque trait empêche un mur de bouger à portée de vue.
  craie: { id: "craie", name: "Craie", size: 1, uses: 2, worlds: ["ruins"],
    icon: "images/Icons/scene/items/item_chalk.webp",
    pro: "Deux traits : un mur qui bougerait près de toi reste en place.", con: "Ne sert qu'aux Ruines." },
  // v3.454.0 (Crypte, CR10) : la Lanterne de Sarkel, gratuite. Allumée, elle éclaire deux rangées de plus quelques pas.
  lanterne: { id: "lanterne", name: "Lanterne de Sarkel", size: 1, uses: 1, worlds: ["crypt"], light: true,
    icon: "images/Icons/scene/items/item_lantern.webp",
    pro: "Allumée, elle montre deux rangées de plus pendant quelques pas.", con: "Une seule mèche." },
  corde: { id: "corde", name: "Corde", size: 1, uses: 1,
    icon: "images/Icons/scene/rope.webp",
    pro: "Réussite assurée sur un obstacle, voie précision. Pas sur les pièges.", con: "Une seule fois." },
  // v3.467.0 (Pièges, PG-D2) : la Trousse de crocheteur, gratuite. Un piège désamorcé à coup sûr.
  trousse: { id: "trousse", name: "Trousse de crocheteur", size: 1, uses: 2,
    icon: "images/Icons/scene/items/item_lockpicks.webp",
    pro: "Deux crochets : un piège désamorcé à coup sûr, sans dé ni Souffle.", con: "Ne sert qu'aux pièges." },
  torche: { id: "torche", name: "Torche", size: 1,
    icon: "images/Icons/scene/torch.webp",
    pro: "Tu vois une rangée de plus devant toi, et les pièges cachés des sentiers que tu peux prendre.", con: "Sa lumière attire : combats +15 % de dégâts." }, // v3.467.1 : les pièges cachés
  armure: { id: "armure", name: "Armure de voyage", size: 3,
    icon: "images/Icons/scene/items/item_armor.webp",
    pro: "Combats : −35 % de dégâts reçus.", con: "Chaque obstacle coûte +8 Souffle." },
  carte: { id: "carte", name: "Carte du braconnier", size: 1,
    icon: "images/Icons/scene/items/item_poacher_map.webp",
    pro: "Chaque trouvaille : choisis 1 carte parmi 2.", con: "Il faut la payer : butin final −20 %." },
  fiole: { id: "fiole", name: "Fiole noire", size: 1,
    icon: "images/Icons/scene/items/item_black_vial.webp",
    pro: "À 0 PV, tu te relèves avec 40 % des PV.", con: "Si elle sert : butin final divisé par deux." },
  bois: { id: "bois", name: "Bois de cerf", size: 2, unlock: "boss",
    icon: "images/Icons/scene/items/item_stag_antler.webp",
    pro: "+1 cran sur la voie force et en chargeant.",
    lockedHint: "Coffre d'expédition : abattre le gardien de la forêt." },
  veilleurs: { id: "veilleurs", name: "Lanterne des veilleurs", size: 1, unlock: "clairiere",
    icon: "images/Icons/scene/items/item_watch_lantern.webp",
    pro: "Toute la carte est visible, et les sources rendent +10.",
    lockedHint: "Coffre d'expédition : atteindre la Clairière aux lanternes." },
  // v3.469.4 (PA-R1) : le coffre d'expédition des autres mondes, deux objets chacun (gardien, clairière)
  ecaille: { id: "ecaille", name: "Écaille du Ver", size: 2, unlock: "boss",
    icon: "images/Icons/scene/items/item_worm_scale.webp",
    pro: "+1 cran sur la voie endurance, et la marche coûte 1 Souffle de moins par pas.",
    lockedHint: "Coffre d'expédition : abattre le Ver du plateau." },
  natte: { id: "natte", name: "Natte de caravane", size: 1, unlock: "clairiere",
    icon: "images/Icons/scene/items/item_caravan_mat.webp",
    pro: "Se reposer au camp ou au seuil rend le double (PV et Souffle).",
    lockedHint: "Coffre d'expédition : atteindre le campement des tentes." },
  pierre_gardien: { id: "pierre_gardien", name: "Pierre taillée du gardien", size: 2, unlock: "boss",
    icon: "images/Icons/scene/items/item_guardian_stone.webp",
    pro: "+1 cran sur la voie précision, et pour désamorcer un piège.",
    lockedHint: "Coffre d'expédition : abattre le gardien de la porte." },
  pierre_puits: { id: "pierre_puits", name: "Pierre du puits", size: 1, unlock: "clairiere",
    icon: "images/Icons/scene/items/item_well_stone.webp",
    pro: "Les pièges cachés se voient dans toute ta vue.",
    lockedHint: "Coffre d'expédition : atteindre la cour au puits." },
  epee_gisant: { id: "epee_gisant", name: "Épée du gisant", size: 2, unlock: "boss",
    icon: "images/Icons/scene/items/item_sleeper_sword.webp",
    pro: "Combats : en Tenant, −20 % de dégâts reçus.",
    lockedHint: "Coffre d'expédition : combattre le gardien couché." },
  cierge: { id: "cierge", name: "Cierge de la chapelle", size: 1, unlock: "clairiere",
    icon: "images/Icons/scene/items/item_chapel_candle.webp",
    pro: "Les effets des pièges ne durent qu'un pas au lieu de trois.",
    lockedHint: "Coffre d'expédition : atteindre la chapelle de l'ouest." }
};
var PA2_ITEM_ORDER = ["petite_ration", "ration", "grande_ration", "gourde", "outre", "craie", "lanterne", "corde", "trousse", "torche", "armure", "carte", "fiole", "bois", "veilleurs", "ecaille", "natte", "pierre_gardien", "pierre_puits", "epee_gisant", "cierge"];

/* Pactes (V14, Q6) : malus choisis contre du butin final. */
var PA2_PACTS = {
  tarie:  { id: "tarie",  bonus: 0.25, icon: "images/Icons/scene/pacts/pact_dry.webp",
    name: "Sources taries", desc: "Les sources ne rendent presque plus rien." },
  enrage: { id: "enrage", bonus: 0.40, icon: "images/Icons/scene/pacts/pact_awake.webp",
    name: "La bête est éveillée", desc: "Les combats de l'acte III et le gardien frappent 40 % plus fort." },
  retour: { id: "retour", bonus: 0.30, icon: "images/Icons/scene/pacts/pact_no_return.webp",
    name: "Pas de retour", desc: "Tomber à 0 PV, c'est tout perdre (au lieu de la moitié)." },
  lourd:  { id: "lourd",  bonus: 0.20, icon: "images/Icons/scene/pacts/pact_heavy.webp",
    name: "Pas lourd", desc: "Chaque pas coûte 4 Souffle." }
};
var PA2_PACT_ORDER = ["tarie", "enrage", "retour", "lourd"];

/* Trouvailles (V13) : objets de RUN, perdus au retour. rar : com / rare / leg.
   eventOnly : ne sort que d'une rencontre (jamais d'un tirage). */
var PA2_RELICS = {
  seve:   { id: "seve",   rar: "com",  icon: "images/Icons/scene/relics/relic_seve.webp",   name: "Sève vive",         fx: "Les sources rendent le double." },
  braise: { id: "braise", rar: "com",  icon: "images/Icons/scene/relics/relic_braise.webp", name: "Braise tenace",     fx: "Chaque pas rend 3 % des PV." },
  plume:  { id: "plume",  rar: "com",  icon: "images/Icons/scene/relics/relic_plume.webp",  name: "Plume de geai",     fx: "La voie précision ne coûte plus de Souffle." },
  dent:   { id: "dent",   rar: "rare", icon: "images/Icons/scene/relics/relic_dent.webp",   name: "Dent de loup",      fx: "Combats : −25 % de dégâts reçus." },
  pierre: { id: "pierre", rar: "rare", icon: "images/Icons/scene/relics/relic_pierre.webp", name: "Pierre qui chante", fx: "+1 cran sur la voie force." },
  oeil:   { id: "oeil",   rar: "rare", icon: "images/Icons/scene/relics/relic_oeil.webp",   name: "Œil de chouette",   fx: "Toute la carte se révèle." },
  ronce:  { id: "ronce",  rar: "leg",  icon: "images/Icons/scene/relics/relic_ronce.webp",  name: "Cœur de ronce",     fx: "Butin +30 %, mais chaque pas coûte 3 Souffle." },
  fleche: { id: "fleche", rar: "leg",  icon: "images/Icons/scene/relics/relic_fleche.webp", name: "Flèche du veneur",  fx: "+1 cran en force et pour ruser, combats −15 % de dégâts.", eventOnly: true },
  // v3.469.5 (PA-R2) : trois reliques par monde, tirées seulement dans leur monde (world)
  perle:    { id: "perle",    rar: "com",  world: "desert", icon: "images/Icons/scene/relics/relic_perle.webp",    name: "Perle de rosée",         fx: "La marche coûte 1 Souffle de moins par pas." },
  scarabee: { id: "scarabee", rar: "rare", world: "desert", icon: "images/Icons/scene/relics/relic_scarabee.webp", name: "Œil de scarabée",        fx: "Ruser gagne un cran." },
  dune:     { id: "dune",     rar: "leg",  world: "desert", icon: "images/Icons/scene/relics/relic_dune.webp",     name: "Cœur de dune",           fx: "Butin final +25 %, mais les points d'eau ne rendent que la moitié." },
  clou:     { id: "clou",     rar: "com",  world: "ruins",  icon: "images/Icons/scene/relics/relic_clou.webp",     name: "Clou de bâtisseur",      fx: "Désamorcer un piège gagne un cran." },
  fil:      { id: "fil",      rar: "rare", world: "ruins",  icon: "images/Icons/scene/relics/relic_fil.webp",      name: "Fil d'Edda",             fx: "Les murs ne bougent plus devant toi." },
  marteau:  { id: "marteau",  rar: "leg",  world: "ruins",  icon: "images/Icons/scene/relics/relic_marteau.webp",  name: "Marteau du Contremaître", fx: "+1 cran sur toutes les voies d'obstacle, mais combats +15 % de dégâts reçus." },
  meche:    { id: "meche",    rar: "com",  world: "crypt",  icon: "images/Icons/scene/relics/relic_meche.webp",    name: "Mèche de Sarkel",        fx: "La Lanterne brûle 3 pas de plus." },
  cendre:   { id: "cendre",   rar: "rare", world: "crypt",  icon: "images/Icons/scene/relics/relic_cendre.webp",   name: "Cendre de veilleur",     fx: "Les alcôves sont gratuites et soignent le double." },
  cloche:   { id: "cloche",   rar: "leg",  world: "crypt",  icon: "images/Icons/scene/relics/relic_cloche.webp",   name: "Cloche muette",          fx: "L'Alarme ne se déclenche jamais, et Ruser gagne deux crans." }
};
var PA2_RELIC_RARITY_WEIGHTS = { com: 60, rare: 30, leg: 10 };

/* Types de nœuds tirés sur le tracé, par acte (V5). Garanties : au moins un combat et une
   trouvaille par acte, une source à l'acte II, la rencontre à l'acte I (PA2_HOOKS). */
var PA2_NODE_WEIGHTS = {
  1: { obstacle: 38, combat: 24, source: 12, autel: 8, trouvaille: 14 },
  2: { obstacle: 34, combat: 30, source: 10, autel: 10, trouvaille: 14 },
  3: { obstacle: 30, combat: 46, source: 5, autel: 8, trouvaille: 12 }
};

/* Actes (V5). foeMult : force des ennemis (PV et dégâts) ; pack : ennemis par combat ;
   failPct : PV perdus sur un obstacle raté. Banc. */
var PA2_ACTS = {
  1: { foeMult: 1.80, pack: 2, failPct: 0.08 }, // v3.383.0 (PA2-3, C2) : banc, Tenir ≈ 10 / 15 / 20 % des PV
  2: { foeMult: 2.30, pack: 2, failPct: 0.11 },
  3: { foeMult: 2.60, pack: 3, failPct: 0.14 }
};

/* Anneau du secteur de la carte vivante = difficulté imposée (Q1). Clé = intensité renvoyée par
   LivingMapManager.getIntensity (anneau 1/2/3). Hors carte vivante : anneau 1. Banc. */
var PA2_RINGS = {
  sentier: { ring: 1, label: "Sentier", diffMult: 1.00, foeMult: 1.00, lootMult: 1.0 },  // v3.383.0 (PA2-3) : KO ~3 / 9 / 19 %,
  chemin:  { ring: 2, label: "Chemin", diffMult: 1.20, foeMult: 1.30, lootMult: 1.55 }, // or par minute de la v1 (C2, C3)
  periple: { ring: 3, label: "Périple", diffMult: 1.40, foeMult: 1.75, lootMult: 2.55 }
};

/* Indexation sur le NIVEAU du héros (Q3). Chaque tranche donne le monde et l'aventure dont les
   ennemis servent de référence (WorldManager.generateEnemy, via QuestEnemyManager.spawnFor), et
   l'échelle des obstacles (même forme que heroScaling v1 : 1 + 0,6 × (bonus attendu − 21) / 10).
   Plancher : le monde de la carte. Repères de campagne (sim/campagne-lot.js, v3.365.0) : niveau 8
   à l'arrivée au Désert, 12 à la fin du chapitre II. Au-delà, la dernière tranche s'applique. */
var PA2_LEVEL_BANDS = [
  { minLevel: 1,  worldId: "forest", adventureIndex: 0, obstacleScale: 1.0, foeScale: 0.8, heroRef: "foret1" }, // v3.383.0 : héros sans vitrine (banc)
  { minLevel: 5,  worldId: "forest", adventureIndex: 1, obstacleScale: 1.5, heroRef: "foret2" },
  { minLevel: 8,  worldId: "desert", adventureIndex: 0, obstacleScale: 2.1, heroRef: "desert10" },
  { minLevel: 11, worldId: "desert", adventureIndex: 1, obstacleScale: 2.7, heroRef: "desert12" },
  // v3.429.0 (Ruines) : tranche PLANCHER de la carte des Ruines seulement (levelBand) — minLevel hors
  // d'atteinte pour ne pas changer les Petites Aventures de la Forêt et du Désert d'un héros avancé
  { minLevel: 99, worldId: "ruins", adventureIndex: 0, obstacleScale: 3.3, heroRef: "joueurDesert2" },
  { minLevel: 99, worldId: "crypt", adventureIndex: 0, obstacleScale: 3.9, heroRef: "joueurRuines" } // v3.454.0 (Crypte) : plancher de la carte, au banc
];

/* v3.423.0 (chantier Difficulté, A, décision Seb) : la tranche donne les ennemis et les obstacles
   d'un héros NORMAL de ce niveau ; au-delà, l'aventure suit la force RÉELLE du héros, comparée au
   héros de référence de la tranche (heroRef, data/worlds.js). Avant, la dernière tranche (niv. 11)
   plafonnait tout : un héros entraîné à fond traversait le Périple sans perdre un quart de ses PV.
   exp 0,75 : le héros garde environ un quart de son avance (log). Obstacles : difficulté ×
   (moyenne des deux multiplicateurs)^obstacleExp. Marge de 10 % : les écarts entre classes d'un héros normal ne comptent pas.
   Banc (sim/_campagne… non livré, sauvegarde « Luca ») : voir CHANGELOG_v3.423.0. */
var PA2_HERO_SCALING = { exp: 0.75, margin: 1.1, cap: 3, obstacleExp: 0.6 };

/* Obstacles : gabarits partagés (SCENE_NODES.obstacles) et pas de difficulté par rangée.
   Les voies reprennent le triangle de la Forêt v1 (optionProfiles du canevas). */
var PA2_OBSTACLES = {
  forest: ["eboulis", "gouffre", "porte_scellee", "paroi", "riviere", "racines"],
  desert: ["sables_mouvants", "dune", "dalle_scellee", "puits_effondre", "vent_de_face", "dalles_ensablees"], // v3.387.0
  ruins: ["route_de_pierre", "rue_qui_tourne", "mur_neuf", "escalier_sans_fin", "dalle_qui_glisse"], // v3.429.0
  crypt: ["allee_des_gisants", "grille_basse", "couloir_noir", "cire_au_sol", "dalle_qui_glisse"] // v3.454.0
};
var PA2_OBSTACLE_TERTRE = { baseDifficulty: 7, gabaritId: "porte_scellee", byWorld: { desert: "dalle_scellee", ruins: "porte_qui_attend", crypt: "porte_basse" } };

/* Gardien de la destination « combat » (v3.383.0, PA2-3) : un ennemi d'acte III renforcé,
   indexé sur la tranche de niveau comme les autres. Multiplicateurs calés au banc. */
var PA2_GUARDIAN = {
  forest: { foe: "foresttroll", hpMult: 5, powMult: 2.2 },
  desert: { foe: "sandworm", hpMult: 4.25, powMult: 1.9 }, // v3.387.0 (F4) : le Ver du plateau, adouci de 15 %
  ruins: { foe: "skeleton", hpMult: 6.4, powMult: 1.9 },   // v3.429.0 : le gardien se relève une fois (PV ×1,5, combat par approche)
  crypt: { foe: "deadknight", hpMult: 4.3, powMult: 1.9, sleeps: true } // v3.454.0 (CR10) : il dort ; on fait le tour ou on le réveille (au banc)
};

/* Approches de combat (V17, Q2). dmg : dégâts reçus ; loot : or gagné. Ruser = jet de précision. */
var PA2_APPROACHES = {
  charger: { id: "charger", dmg: 1.3, loot: 1.4, rounds: 2, icon: "images/Icons/combat_status/charge_incoming.webp" },
  tenir:   { id: "tenir",   dmg: 0.7, loot: 1.0, rounds: 3, icon: "images/Icons/combat_status/shield_active.webp" }
};

/* Or, en multiples de l'or d'un ennemi de référence (G, indexé sur le niveau). Banc. */
var PA2_GOLD = {
  combat: 1.7,       // par ennemi abattu, × approche (v3.383.0, C3 : or par minute de la v1)
  obstacle: 2.55,    // × lootMod de la voie
  obstacleMid: 0.4,  // part gagnée « de justesse »
  ruse: 0.5,         // part de l'or du combat évité
  ruseMid: 0.25,
  event: 20,         // prendre l'arc
  boss: 20,
  clairiere: 10,
  clairiereSauve: 17,
  tertre: 14
};

/* Ressource rare (Sève d'Aeswyn en Forêt) : jamais perdue (comme en v1). Banc. */
var PA2_RARE = {
  forest: { resourceId: "seve_aeswyn", findChancePct: 25, dest: { 1: 2, 2: 3, 3: 4 } },
  desert: { resourceId: "verre_des_dunes", findChancePct: 25, dest: { 1: 2, 2: 3, 3: 4 } }, // v3.387.0
  ruins: { resourceId: "pierre_errante", findChancePct: 25, dest: { 1: 2, 2: 3, 3: 4 } }, // v3.429.0
  crypt: { resourceId: "cire_sepulcre", findChancePct: 25, dest: { 1: 2, 2: 3, 3: 4 } }   // v3.454.0
};

/* v3.453.0 : choix de Mémoire qui ajoutent 1 matériau rare par destination atteinte, par monde. */
var PA2_MEMORY_DEST_RARE = { ruins: "pierre_de_plus", crypt: "cire_chaude" };

/* Coffre d'expédition : destination -> objet débloqué (V12, Q8). */
/* v3.387.0 : par monde ; v3.469.4 : un coffre dans chaque monde. */
var PA2_CHEST_REWARDS = {
  forest: { boss: "bois", clairiere: "veilleurs" },
  desert: { boss: "ecaille", clairiere: "natte" },           // v3.469.4 (PA-R1)
  ruins: { boss: "pierre_gardien", clairiere: "pierre_puits" },
  crypt: { boss: "epee_gisant", clairiere: "cierge" }        // gardien couché : seulement s'il est combattu
};

/* Réglages divers. Banc. */
var PA2_RULES = {
  sightRows: 2,              // rangées visibles devant soi (torche : +1)
  breathStart: 100,
  bruteForcePct: 0.15,       // passer sans Souffle
  eventHandsPct: 0.15,       // ouvrir le piège à mains nues
  fleeBreath: 30,
  ruseMidBreath: 15,
  mistBreath: 10,            // « de justesse » sur un obstacle
  sourceAmount: 20, sourceDry: 5, sourceLantern: 10,   // v3.383.0 (C2) : 25 -> 20
  altarCostPct: 0.25, altarMinCost: 10, altarHealPct: 0.20,
  campRestPct: 0.10, seuilRestPct: 0.06, cookPct: 0.70, // v3.383.0 (C2) : 30/20 -> 15/10 ; v3.423.0 (C) : 10/6, les rations comptent
  fioleHpPct: 0.40,
  revengeMult: 1.3, enrageMult: 1.4, torchDmgMult: 1.15, armorDmgMult: 0.65, armorBreath: 8,
  dentMult: 0.75, flecheMult: 0.85, boisChargeMult: 0.85, epeeTenirMult: 0.8, ecailleStep: 1, natteRestMult: 2, ciergeSteps: 1, // v3.469.4
  guardRingShare: 0.5, // v3.469.6 : gardien au Chemin ×1,15, au Périple ×1,375 (au lieu de ×1,30 et ×1,75), banc
  perleStep: 1, duneLoot: 1.25, duneSource: 0.5, marteauDmg: 1.15, mecheSteps: 3, cendreHeal: 2, // v3.469.5 : reliques des mondes
  surprisedMult: 1.2, heavyStep: 4, ronceStep: 3, ronceLoot: 1.3, braiseHealPct: 0.03,
  carteLoot: 0.8, fioleLoot: 0.5, damageSpread: 0.15, maxRounds: 60,
  wallShiftPct: 0.35, wallChalkRows: 2,  // v3.429.0 (Ruines) : un mur bouge après un pas ; la Craie tient à 2 rangées devant
  lanternRows: 2, lanternSteps: 3        // v3.454.0 (Crypte) : la Lanterne, deux rangées de plus pendant 3 pas (Mèche longue : +2 pas)
};

/* v3.387.0 (PA2-5, F2) : la soif du Désert. stepBreath : Souffle perdu à chaque pas ;
   gourdeUses : gorgées de la gourde (décision Seb de la v1 : une seule au Désert). Banc. */
var PA2_WORLD_RULES = {
  forest: { stepBreath: 4 },                // v3.423.0 (B) : la marche essouffle aussi en Forêt
  desert: { stepBreath: 4, gourdeUses: 1 }, // v3.423.0 (B) : 3 -> 4
  ruins: { stepBreath: 4 },                 // v3.429.0 : pas de soif, des murs qui bougent (PA2_RULES.wallShiftPct)
  crypt: { stepBreath: 4, sightRows: 1, trapsHidden: true } // v3.454.0 (CR10) : l'obscurité ; v3.467.0 : pièges vus seulement à la Lanterne
};

/* v3.467.0 (Pièges, conception PG-A à PG-G) : pièges posés sur les sentiers. perAct : pièges par acte
   selon l'anneau (PG-G) ; un point garde toujours une sortie libre. Chiffres de départ, au banc. */
var PA2_TRAP_RULES = {
  perAct: { sentier: 1, chemin: 2, periple: 3 },
  hiddenPct: 0.5,     // v3.467.1 (retour Seb) : un piège sur deux caché hors de la Crypte (là-bas, tous)
  baseDifficulty: 4,  // désamorcer : dé de précision, comme un obstacle de base
  midBreath: 10,      // « de justesse »
  backBreath: 10,     // rebrousser
  veninPct: 0.04, entraveBreath: 6, steps: 3
};
/* v3.468.0 (Tracé qui change, PG-A1) : sentiers coupés au départ, par un obstacle du monde (PG-A1b). */
var PA2_CUT_RULES = { min: 3, max: 5 };
var PA2_CUTS = {
  forest: { arbre: { name: "Arbre abattu", icon: "images/Icons/scene/cuts/cut_fallen_tree.webp" }, crue: { name: "Ruisseau en crue", icon: "images/Icons/scene/cuts/cut_flood.webp" } },
  desert: { dune: { name: "Dune nouvelle", icon: "images/Icons/scene/cuts/cut_dune.webp" }, ravin: { name: "Ravin effondré", icon: "images/Icons/scene/cuts/cut_ravine.webp" } },
  ruins:  { rue: { name: "Rue effondrée", icon: "images/Icons/scene/cuts/cut_collapsed_street.webp" }, porte: { name: "Porte murée", icon: "images/Icons/scene/cuts/cut_walled_door.webp" } },
  crypt:  { grille: { name: "Grille tombée", icon: "images/Icons/scene/cuts/cut_gate.webp" }, voute: { name: "Voûte écroulée", icon: "images/Icons/scene/cuts/cut_collapse.webp" } }
};
/* v3.469.0 (Condition du run, PG-B1a à PG-B1c) : tirée au lancement, propre au monde, un avantage et un
   inconvénient, annoncée sur la préparation. fx : réglages lus par Pa2Run (cond). « Nuit calme » une fois sur cinq. */
var PA2_CONDITION_RULES = { calmPct: 0.2 };
var PA2_CONDITION_CALM = { id: "calme", name: "Nuit calme", kicker: "nuit calme", line: "Rien de particulier cette nuit. C'est rare, ici.", fx: {} };
var PA2_CONDITIONS = {
  forest: {
    brouillard: { name: "Brouillard", kicker: "nuit de brouillard", line: "Le brouillard monte du sol. On n'y voit pas loin, et eux non plus.",
      pro: "Ruser gagne un cran", con: "Une rangée de vue en moins", tip: "torche", fx: { ruseBonus: 1, sight: -1 } },
    orage: { name: "Orage", kicker: "nuit d'orage", line: "Il pleut depuis midi. Les ruisseaux débordent, et les sources aussi.",
      pro: "Les sources rendent le double", con: "Deux sentiers coupés de plus", tip: "gourde", fx: { sourceMult: 2, extraCuts: 2 } },
    braconniers: { name: "Nuit des braconniers", kicker: "nuit des braconniers", line: "Des collets neufs aux lisières. Quelqu'un chasse ce soir, et il laisse des choses derrière lui.",
      pro: "Trouvailles : une relique au choix parmi deux", con: "Un piège de plus par acte", tip: "trousse", fx: { relicDraw: 2, trapsPerAct: 1 } },
    pleine_lune: { name: "Pleine lune", kicker: "nuit de pleine lune", line: "La lune est pleine. On voit loin. Les bêtes aussi, et elles sont nerveuses.",
      pro: "Une rangée de vue en plus", con: "Combats : +8 % de dégâts reçus", tip: "armure", fx: { sight: 1, combatDmg: 1.08 } } // v3.469.1 : 15 -> 8 % (banc)
  },
  desert: {
    vent: { name: "Vent de sable", kicker: "nuit de vent de sable", line: "Le vent soulève le sable et découvre ce qu'il cachait. On voit à peine ses pieds.",
      pro: "Obstacles : +30 % d'or", con: "Une rangée de vue en moins", tip: "torche", fx: { obstacleGold: 1.3, sight: -1 } },
    canicule: { name: "Canicule", kicker: "nuit brûlante", line: "La chaleur ne tombe pas avec le soleil. Chaque pas coûte. Les points d'eau, eux, sont pleins.",
      pro: "Les points d'eau rendent le double", con: "La marche coûte 2 Souffle de plus par pas", tip: "outre", fx: { sourceMult: 2, stepBreath: 2 } },
    fraiche: { name: "Nuit fraîche", kicker: "nuit fraîche", line: "Pour une fois, la nuit est froide. On marche bien. Les pillards aussi sortent.",
      pro: "La marche coûte 2 Souffle de moins par pas", con: "Premier combat de chaque acte : un ennemi de plus", tip: "armure", fx: { stepBreath: -2, firstCombatExtra: 1 } },
    pillards: { name: "Pillards", kicker: "nuit des pillards", line: "Des feux sur les crêtes. Ils ont piégé les passes, et caché ce qu'ils ont pris.",
      pro: "Butin final +20 %", con: "Un piège de plus par acte", tip: "trousse", fx: { lootMult: 1.2, trapsPerAct: 1 } }
  },
  ruins: {
    murs: { name: "Les murs s'agitent", kicker: "nuit où les murs s'agitent", line: "Les murs ne tiennent pas en place ce soir. Edda t'a donné un bout de craie de plus.",
      pro: "Un trait de Craie offert", con: "Les murs bougent presque deux fois plus souvent", tip: "craie", fx: { chalkBonus: 1, wallShiftMult: 1.8 } },
    poussiere: { name: "Poussière de chantier", kicker: "nuit de poussière", line: "On a bâti toute la journée. La poussière n'est pas retombée, mais les pierres sont neuves et faciles.",
      pro: "Obstacles : un cran plus faciles", con: "Une rangée de vue en moins", tip: "torche", fx: { obstacleBonus: 1, sight: -1 } },
    batisseurs: { name: "Bâtisseurs au travail", kicker: "nuit des bâtisseurs", line: "Les bâtisseurs ont muré des portes. Ils ont aussi rempli les coupes des niches.",
      pro: "Les niches sont gratuites", con: "Deux sentiers coupés de plus", tip: null, fx: { altarFree: true, extraCuts: 2 } },
    guetteurs: { name: "Nuit des guetteurs", kicker: "nuit des guetteurs", line: "Des guetteurs sur les toits. Ils ont tendu des fils partout. Ce qu'ils gardent vaut la peine.",
      pro: "Butin final +20 %", con: "Un piège de plus par acte, et plus souvent l'Alarme", tip: "trousse", fx: { lootMult: 1.2, trapsPerAct: 1, alarmWeight: 2 } }
  },
  crypt: {
    dormeurs: { name: "Les dormeurs remuent", kicker: "nuit où les dormeurs remuent", line: "Les dormeurs se retournent dans leurs niches. Ceux qui se lèvent ont de la cire sur les doigts.",
      pro: "Une Cire de sépulcre de plus à la destination", con: "Premier combat de chaque acte : un ennemi de plus", tip: "armure", fx: { rareDest: 1, firstCombatExtra: 1 } },
    meches: { name: "Mèches humides", kicker: "nuit humide", line: "L'eau suinte de partout. Les mèches prennent mal, mais on ne manquera pas d'eau.",
      pro: "L'eau qui suinte rend le double", con: "La Lanterne brûle 2 pas de moins", tip: "torche", fx: { sourceMult: 2, lanternSteps: -2 } },
    courants: { name: "Courants d'air", kicker: "nuit des courants d'air", line: "Un courant d'air froid traverse les couloirs. Il fait bouger les fils tendus, et il fatigue.",
      pro: "Les pièges cachés se voient sur les sentiers que tu peux prendre", con: "La marche coûte 1 Souffle de plus par pas", tip: "gourde", fx: { trapsNear: true, stepBreath: 1 } }, // v3.469.1 : 2 -> 1 (banc)
    veillee: { name: "Veillée", kicker: "nuit de veillée", line: "Quelqu'un veille les morts cette nuit. Les coupes sont pleines, et chaque cloche est prête à sonner.",
      pro: "Les alcôves sont gratuites", con: "Un piège de plus par acte, et plus souvent l'Alarme", tip: "trousse", fx: { altarFree: true, trapsPerAct: 1, alarmWeight: 2 } }
  }
};
/* Les cinq effets (PG-C). steps : pas pendant lesquels l'effet dure (0 : immédiat ou jusqu'au combat). */
var PA2_TRAP_FX = {
  venin:   { id: "venin",   name: "Venin",         steps: 3, icon: "images/Icons/scene/traps/fx_venom.webp",
    desc: "−4 % des PV à chaque pas", cure: "Une ration ou un autel le lèvent." },
  alarme:  { id: "alarme",  name: "Alarme",        steps: 0, icon: "images/Icons/scene/traps/fx_alarm.webp",
    desc: "Prochain combat : un ennemi de plus, pas de Ruse", cure: "Dure jusqu'au prochain combat." },
  entrave: { id: "entrave", name: "Entrave",       steps: 3, icon: "images/Icons/scene/traps/fx_snare.webp",
    desc: "+6 Souffle par pas", cure: "Le repos au camp ou au seuil la lève." },
  aveugle: { id: "aveugle", name: "Aveuglé",       steps: 3, icon: "images/Icons/scene/traps/fx_blind.webp",
    desc: "Une rangée de vue en moins", cure: "Une torche ou la Lanterne allumée l'annulent." },
  besace:  { id: "besace",  name: "Besace percée", steps: 0, icon: "images/Icons/scene/traps/fx_torn_bag.webp",
    desc: "Un objet de la besace perdu au hasard", cure: "Tout de suite." }
};
var PA2_TRAP_FX_ORDER = ["venin", "alarme", "entrave", "aveugle", "besace"];
/* PG-E : les cinq effets partout, ceux du caractère du monde pèsent double. */
var PA2_TRAP_WEIGHTS = {
  forest: { venin: 2, alarme: 1, entrave: 2, aveugle: 1, besace: 1 },
  desert: { venin: 1, alarme: 1, entrave: 2, aveugle: 2, besace: 1 },
  ruins:  { venin: 1, alarme: 2, entrave: 1, aveugle: 1, besace: 2 },
  crypt:  { venin: 1, alarme: 2, entrave: 1, aveugle: 2, besace: 1 }
};
/* PG-E : un piège par effet et par monde, textes validés par Seb le 23/10/2026. */
var PA2_TRAPS = {
  forest: {
    venin:   { name: "Ronces noires",        line: "Des épines noires, luisantes, en travers du sentier." },
    alarme:  { name: "Fil aux clochettes",   line: "Un fil entre deux troncs, des clochettes de bois au bout." },
    entrave: { name: "Collet du braconnier", line: "Un nœud coulant, sous les feuilles. Il n'attend que ton pied." },
    aveugle: { name: "Vesses-de-loup",       line: "Des champignons gros comme des poings. Ils éclatent en poussière." },
    besace:  { name: "Branche taillée",      line: "Une branche taillée en pointe, à hauteur de sac." }
  },
  desert: {
    venin:   { name: "Pierres à scorpions",  line: "Les pierres plates bougent quand on ne les regarde pas." },
    alarme:  { name: "Jarres en équilibre",  line: "Des jarres empilées au milieu du passage. Un souffle les ferait tomber." },
    entrave: { name: "Filet enfoui",         line: "Une corde de filet dépasse du sable. Le reste est dessous." },
    aveugle: { name: "Vent de sable",        line: "Le vent tourne dans le défilé. Il porte du sable fin." },
    besace:  { name: "Arête de roche",       line: "Une arête de roche, fine comme une lame, au ras de l'épaule." }
  },
  ruins: {
    venin:   { name: "Niche aux aiguilles",  line: "Une niche à hauteur de main. Quelque chose brille au fond." },
    alarme:  { name: "Dalle qui sonne",      line: "Une dalle plus claire que les autres. Sous elle, du vide, et une cloche." },
    entrave: { name: "Gravats roulants",     line: "Des gravats ronds comme des billes, sur toute la largeur." },
    aveugle: { name: "Mortier en poudre",    line: "Des sacs de mortier crevés. Un pas, et l'air devient blanc." },
    besace:  { name: "Herse basse",          line: "Une herse à demi baissée. Il faut passer dessous, de côté." }
  },
  crypt: {
    venin:   { name: "Poignée piquée",       line: "La seule porte a une poignée. Elle est hérissée de pointes fines." },
    alarme:  { name: "Cloche des veilleurs", line: "Un fil court au ras du sol, jusqu'à une cloche. Ici, on réveille les morts." },
    entrave: { name: "Linceuls tendus",      line: "Des linceuls tendus d'un mur à l'autre. Ils s'enroulent à ce qui passe." },
    aveugle: { name: "Encens froid",         line: "De l'encens qui fume encore, épais, dans un couloir sans air." },
    besace:  { name: "Marche creuse",        line: "Une marche sonne creux. Dessous, le noir, et rien pour retenir un sac." }
  }
};

/* ---------- Textes ---------- */

/* Combats : ennemis par acte (ENEMY_DB), réplique d'entrée. */
var PA2_FOES = {
  forest: { 1: ["wolf", "goblin"], 2: ["spider", "bramble"], 3: ["foresttroll", "bramble"] },
  desert: { 1: ["scarab"], 2: ["sandwarrior", "scarab"], 3: ["sandworm", "sandwarrior"] }, // v3.387.0 (F4)
  ruins: { 1: ["skeleton", "zombie"], 2: ["ghoul", "skeleton"], 3: ["gargoyle", "batisseur"] }, // v3.429.0
  crypt: { 1: ["spectre", "wraith"], 2: ["wraith", "necromancer"], 3: ["deadknight", "necromancer"] } // v3.454.0
};
var PA2_FOE_LINES = {
  wolf: "Deux yeux dans la fougère. Puis quatre.",
  goblin: "Il fouillait un sac qui n'est pas le sien.",
  spider: "Les fils brillent sous la lune. Tu es déjà dedans.",
  bramble: "La haie se lève et marche vers toi.",
  foresttroll: "Ce que tu prenais pour un rocher se déplie.",
  scarab: "Le sable bouge sous tes pieds. Il a des pattes.",
  sandwarrior: "Des silhouettes sur la crête. Elles ne se cachent pas.",
  sandworm: "Le sol se soulève, puis retombe. Quelque chose respire dessous.",
  // v3.429.0 (Ruines)
  skeleton: "Des os rangés contre un mur, bien alignés. Ils se lèvent ensemble.",
  zombie: "Il marche droit vers toi, sans se presser. Il a tout son temps.",
  ghoul: "Quelque chose court sur les toits, plus vite que toi.",
  gargoyle: "La statue du carrefour n'était pas tournée de ce côté tout à l'heure.",
  batisseur: "Quelqu'un pose des pierres au milieu de la rue. Il en pose une devant toi.",
  // v3.454.0 (Crypte)
  spectre: "Une forme pâle au bout du couloir. Elle ne marche pas : elle se rapproche.",
  wraith: "La lumière baisse d'un coup. Quelque chose est passé devant.",
  necromancer: "Une voix dit un nom, doucement. Pas le tien.",
  deadknight: "Un chevalier couché en travers du passage. Il se lève sans un bruit d'armure."
};

/* Obstacles : une phrase d'ambiance par gabarit (bible narrative §4.3). */
var PA2_OBSTACLE_LINES = {
  eboulis: "Des pierres encore tièdes barrent le sentier. Quelque chose les a fait tomber.",
  gouffre: "La terre s'ouvre sous les racines. En bas, de l'eau. Ou autre chose.",
  porte_scellee: "Une porte de pierre, au milieu des arbres. Aucun mur autour.",
  paroi: "La roche monte droit. Elle est tiède sous la main.",
  riviere: "L'eau est noire et rapide. Elle ne fait aucun bruit.",
  racines: "Les racines ont bouché le passage cette nuit. Elles serrent encore.",
  sables_mouvants: "Le sable a l'air ferme. Une botte y est restée, debout.",
  dune: "La dune a bougé cette nuit. Le sentier passe dessous.",
  dalle_scellee: "Une dalle, à plat dans le sable. Des signes gravés. Elle sonne creux.",
  puits_effondre: "Le puits s'est effondré sur le chemin. En bas, pas d'eau. Du froid.",
  vent_de_face: "Le vent se lève d'un coup. Il porte du sable, et il ne tourne pas.",
  dalles_ensablees: "Des dalles sous le sable, bien alignées. Quelqu'un a construit une route ici. Elle s'enfonce.",
  // v3.428.0 (Ruines)
  route_de_pierre: "Une route de pierre, propre, sans une trace de pas. Des blocs sont tombés dessus cette nuit.",
  rue_qui_tourne: "La rue tourne là où elle allait tout droit. Le mur d'en face est neuf.",
  // v3.389.0 (chantier P) : les obstacles des quêtes de déblocage
  tronc_deracine: "Un tronc en travers du sentier. Ses racines tiennent encore une motte de terre.",
  troncs_jumeaux: "Deux troncs poussés l'un contre l'autre. Entre eux, à peine la place d'un bras.",
  fute_dense: "Les arbres serrés ne laissent passer ni lumière ni bruit. Le sentier s'y perd.",
  ronces_epaisses: "Des ronces plus hautes qu'un homme. Quelqu'un a essayé avant toi : il reste un bout de manche.",
  sillons_geles: "Les sillons d'un champ oublié, durcis comme de la pierre. On a labouré ici, il y a longtemps.",
  talus_boueux: "Le talus glisse sous la main. En haut, le champ. En bas, toi.",
  filon_fragile: "Un filon qui brille dans la roche. La roche autour s'effrite quand on la regarde.",
  paroi_instable: "La paroi craque doucement, comme un plancher la nuit.",
  veine_rougeatre: "Une veine rouge court dans la pierre. Elle tache les doigts.",
  eboulis_recent: "Des pierres fraîchement tombées. La poussière n'est pas encore retombée.",
  source_irreguliere: "L'eau sort par à-coups, puis s'arrête. Puis reprend.",
  bassin_trouble: "Un bassin d'eau grise. On ne voit pas le fond. On ne voit pas non plus où il finit.",
  // v3.454.0 (Crypte)
  allee_des_gisants: "Des gisants en travers de l'allée, de mur à mur. Il faut passer entre eux.",
  grille_basse: "Une grille à hauteur de genou. De l'autre côté, le couloir continue.",
  couloir_noir: "Un couloir sans lampe. La lumière s'arrête au premier pas.",
  cire_au_sol: "De la cire sur tout le sol, épaisse, encore molle. Elle garde la forme des pas."
};

/* Lieux sans choix de voie (bible narrative §4.5). */
var PA2_PLACES = {
  source: { name: "Une source", text: "De l'eau, entre les racines. Elle est bonne." },
  sourceDry: { name: "Une source tarie", text: "Un filet d'eau. Il faut attendre pour en remplir une gorgée." },
  autel: { name: "Un autel de pierre", text: "L'autel demande {cost} or. Il rend une plaie." },
  autelFree: { name: "Un autel de pierre", text: "Les pierres dressées veillent sur celui-ci. Il ne demande rien." },
  trouvaille: { name: "Une trouvaille", text: "Quelque chose a été laissé là. Pas pour toi, mais tu es là." },
  camp: { name: "Le camp", text: "Une clairière basse, un cercle de pierres noircies. Quelqu'un a fait du feu ici, il n'y a pas longtemps." },
  seuil: { name: "Le seuil", text: "Le pont. Au-delà, la brume est plus épaisse et les arbres plus vieux. Ce qui t'attend là-bas ne dort plus." }
};

/* v3.387.0 (PA2-5) : les lieux d'un autre monde remplacent ceux de la Forêt, clé par clé. */
var PA2_PLACES_BY_WORLD = {
  desert: {
    source: { name: "Un point d'eau", text: "De l'eau, sous une pierre plate. Elle est tiède, mais elle est là." },
    sourceDry: { name: "Un point d'eau tari", text: "Du sable humide. Il faut creuser pour en tirer une gorgée." },
    autel: { name: "Une stèle", text: "La stèle demande {cost} or. Elle rend une plaie." },
    autelFree: { name: "Une stèle", text: "Les stèles tenues veillent sur celle-ci. Elle ne demande rien." },
    trouvaille: { name: "Une trouvaille", text: "Quelque chose dépasse du sable. Pas pour toi, mais tu es là." },
    camp: { name: "L'oasis", text: "Un creux de palmiers au fond du canyon. De la cendre froide, et des traces qui repartent." },
    seuil: { name: "Le seuil", text: "Le pont sur l'oued. Au-delà, le vent tombe d'un coup. Ce qui t'attend là-bas ne dort plus." }
  },
  ruins: { // v3.429.0 (U-6)
    source: { name: "Une fontaine", text: "Une fontaine de pierre, neuve. L'eau coule. Personne ne l'a mise en route." },
    sourceDry: { name: "Une fontaine sèche", text: "Le bassin est propre et vide. Au fond, un filet d'eau, pour une gorgée." },
    autel: { name: "Une niche", text: "Une niche dans le mur, une coupe posée. Elle demande {cost} or. Elle rend une plaie." },
    autelFree: { name: "Une niche", text: "Une niche dans le mur. La coupe est déjà pleine. Elle ne demande rien." },
    trouvaille: { name: "Une trouvaille", text: "Une pierre posée à part, comme mise de côté. Pas pour toi, mais tu es là." },
    camp: { name: "La cour", text: "Une cour carrée, des bancs de pierre. Quelqu'un les a balayés ce matin." },
    seuil: { name: "Le seuil", text: "Une arche, au milieu de la rue. De l'autre côté, les murs sont plus neufs. Ce qui t'attend là-bas ne dort plus." }
  },
  crypt: { // v3.454.0 (Crypte)
    source: { name: "Une eau qui suinte", text: "De l'eau qui suinte du plafond, froide. Elle a le goût de la pierre." },
    sourceDry: { name: "Une eau qui suinte", text: "Une goutte, puis rien. Il faut attendre pour une gorgée." },
    autel: { name: "Une alcôve vide", text: "Une alcôve vide, une coupe posée devant. Elle demande {cost} or. Elle rend une plaie." },
    autelFree: { name: "Une alcôve vide", text: "Une alcôve vide. La coupe est déjà pleine. Elle ne demande rien." },
    trouvaille: { name: "Une trouvaille", text: "Quelque chose posé au bord d'une alcôve, à portée de main. Pas pour toi, mais tu es là." },
    camp: { name: "La salle aux lampes", text: "Une salle basse, trois lampes contre le mur. Sarkel est passé par ici." },
    seuil: { name: "Le seuil", text: "Une grille ouverte. De l'autre côté, il fait plus froid. Ce qui t'attend là-bas dort encore." }
  }
};

/* Destinations (V3, Q9). La forêt est la seule carte du lot : un jeu de textes par monde. */
var PA2_DESTS = {
  forest: {
    boss: { name: "Le Cerf-Racine", line: "Il est plus grand que les arbres autour. Ses bois sont des racines, et elles fouillent le sol en cherchant quelque chose.",
      win: "Ses bois se sont brisés comme du bois mort. Dessous, du bois vivant. Tu en emportes un morceau." },
    clairiere: { name: "La Clairière aux lanternes", line: "Pas un bruit. Des lanternes pendent aux branches, toutes allumées, et aucune ne fume.",
      win: "Sur une pierre, une lanterne t'attendait." },
    tertre: { name: "Le Tertre scellé", line: "Un tertre de pierres moussues. Sur le sceau, une écriture que tu connais. La tienne.",
      win: "Le sceau a cédé. Ce qui dormait dessous n'est plus là. Il reste ce qu'il gardait.",
      fail: "Le sceau a tenu. Tu repars avec ce que tu portais, et la sensation d'avoir été regardé." }
  },
  desert: { // v3.387.0 (PA2-5) : le plateau, le campement de tentes, les colonnes ensablées
    boss: { name: "Le Ver du plateau", line: "Le plateau est lisse, comme balayé. Au centre, le sable tourne sur lui-même.",
      win: "Il retombe et ne bouge plus. Entre ses anneaux, du verre, fondu par la chaleur de son corps." },
    clairiere: { name: "Le campement des tentes", line: "Trois tentes dressées, vides. Les piquets sont neufs. Personne n'a dormi dedans.",
      win: "Sous une natte, quelqu'un a laissé de l'eau." },
    tertre: { name: "Les colonnes ensablées", line: "Des colonnes qui ne portent plus rien. Entre elles, une dalle scellée. Le sceau est tiède.",
      win: "La dalle a glissé. Dessous, un escalier que le sable n'a pas rempli. Il reste ce qu'il gardait.",
      fail: "La dalle n'a pas bougé. Tu repars avec ce que tu portais, et du sable plein les yeux." }
  },
  ruins: { // v3.429.0 (U-6) : la porte gardée, la cour au puits, la chambre scellée
    boss: { name: "Le gardien de la porte", line: "Devant la grille, un squelette plus grand que les autres, assis sur une marche. Il se lève. Il se relèvera.",
      win: "Il tombe une deuxième fois, et cette fois les os se rangent d'eux-mêmes au pied de la grille. Entre eux, une pierre taillée." },
    clairiere: { name: "La cour au puits", line: "Un puits, un arbre, une cour fermée. Rien ici n'a été rebâti : c'est resté.",
      win: "Sur la margelle, quelqu'un a posé une pierre pour toi." },
    tertre: { name: "La chambre scellée", line: "Une chambre fermée, un coffre au milieu. La porte attend quelque chose. Elle n'a pas l'air pressée.",
      win: "La porte a cédé. Dans le coffre, rangé comme on range pour quelqu'un, ce qu'elle gardait.",
      fail: "La porte a tenu. Tu repars avec ce que tu portais. Derrière toi, elle se referme mieux qu'avant." }
  },
  crypt: { // v3.454.0 : le sanctuaire à la statue, la chapelle de l'ouest, la rotonde
    boss: { name: "Le gardien couché", line: "Devant la statue voilée, un chevalier mort, allongé en travers des marches, l'épée sur la poitrine. Il dort.",
      win: "Il retombe sur les marches, l'épée en travers. Sous lui, un coffre.",
      pass: "Tu fais le tour, par le bord des marches. Il ne bouge pas. Le coffre reste sous lui." },
    clairiere: { name: "La chapelle de l'ouest", line: "Une chapelle basse, deux vasques allumées. Rien ne dort ici.",
      win: "Au pied de l'autel, quelqu'un a laissé de la cire, encore tiède." },
    tertre: { name: "La rotonde", line: "Une rotonde sous une coupole, un sarcophage au milieu. Une porte basse le ferme.",
      win: "La porte a cédé. Dans le sarcophage, personne. Il reste ce qu'il gardait.",
      fail: "La porte a tenu. Tu repars avec ce que tu portais. Derrière toi, quelqu'un se retourne dans son sommeil." }
  }
};

/* Accroches et rencontres chaînées (V19, Q9). Une accroche est tirée au départ ; sa rencontre
   tombe à l'acte I et ses suites reviennent plus tard (au camp, ou en combat à l'acte II/III). */
var PA2_HOOKS = {
  chasseur: {
    id: "chasseur", worldId: "forest",
    title: "Un chasseur n'est pas revenu",
    lede: "On l'a vu partir vers les ronces à l'aube. Son chien est rentré seul. Trois sentiers mènent au cœur du bois, et aucun ne ressort au même endroit.",
    event: {
      name: "Le chasseur",
      text: "Un homme adossé à un chêne, la jambe prise dans un piège à mâchoires. Le sien, sans doute. Son arc est à portée de ta main. Pas de la sienne.",
      branches: {
        ration: { label: "Ouvrir le piège, partager une ration", cost: { ration: 1 }, text: "Il mange sans un mot. Puis : « Au camp. Je t'y retrouverai. » Il part en boitant, plus vite que tu ne l'aurais cru." },
        mains: { label: "L'ouvrir à mains nues", text: "Les mâchoires mordent tes doigts avant de céder. Il te regarde saigner pour lui. « Au camp. Je te dois ça. »" },
        arc: { label: "Prendre l'arc et partir", text: "Tu prends l'arc. Il ne crie pas. Il te regarde partir, et c'est pire." }
      }
    },
    campGift: { text: "Le chasseur est là. Il boite, mais il a marché plus vite que toi. Il te tend une flèche à l'empenne noire.", relic: "fleche", branches: ["ration", "mains"] },
    revenge: { name: "Le chasseur, revenu", line: "Il porte ton odeur. Il n'a pas oublié son arc.", foe: "goblin" },
    clairiere: {
      saved: "Au centre, le chasseur que tu as aidé t'attend. Il savait que tu viendrais ici.",
      other: "Au centre, quelqu'un qui ressemble au chasseur. Il te regarde sans te voir."
    }
  }
};
/* v3.385.0 (PA2-4, E2) : trois accroches de la bible narrative (§4.5, bible B §5), décrites par
   les données. cost : stock (objet de besace) | ration | breath. gainBreath : Souffle rendu.
   Suites différées (lues par le moteur) : assist (l'homme du gouffre, un ennemi de moins au 1er combat des
   actes II-III), destGold (or des destinations ×), destRare (Sève en plus), mark (crans et
   dégâts), campGift (trouvaille au camp). echo : lignes posées sur le nœud concerné. */
PA2_HOOKS.gouffre = {
  id: "gouffre", worldId: "forest", // v3.386.0 : l'homme reste sans nom, Maddoc garde sa rencontre au Désert
  title: "De l'autre côté du gouffre",
  lede: "Un marchand de bois devait passer le gouffre avant la nuit. Sa charrette est rentrée sans lui. De l'autre côté, on l'attend encore.",
  event: {
    name: "L'homme contre le tronc",
    text: "Un homme, assis contre un tronc. Sa jambe ne va pas dans le bon sens. Il a vu que tu portais une gourde.",
    branches: {
      gourde: { label: "Lui donner la gourde", cost: { stock: "gourde" }, text: "Il boit. Il ne dit pas merci. Il dit d'où il vient : de l'autre côté du gouffre." },
      epaule: { label: "L'aider à marcher", cost: { breath: 20 }, text: "Il s'appuie sur toi jusqu'au sentier. Puis il lâche ton épaule, et c'est tout." },
      passer: { label: "Passer", text: "Tu passes. Il ne t'appelle pas." }
    }
  },
  assist: { branches: ["gourde", "epaule"] },
  destGold: { passer: 0.7 },
  echo: {
    assist: "Une pierre siffle depuis les fourrés. L'un d'eux tombe avant d'avoir compris. Quelqu'un, derrière, qui boite.",
    dest: "Quelqu'un est passé avant toi. Il a pris ce qu'un homme peut porter d'une main."
  },
  clairiere: {
    gourde: "Contre l'arbre du centre, une béquille taillée dans une branche. Quelqu'un est passé en boitant, et a laissé de la lumière.",
    epaule: "Contre l'arbre du centre, une béquille taillée dans une branche. Quelqu'un est passé en boitant, et a laissé de la lumière.",
    other: "Au centre, personne. Les lanternes brûlent pour quelqu'un d'autre."
  }
};
PA2_HOOKS.pierre = {
  id: "pierre", worldId: "forest",
  title: "La pierre qui luit",
  lede: "Brannoc a envoyé deux hommes couper au nord du ruisseau. Ils sont revenus sans le bois. Ils n'ont pas dit pourquoi.",
  event: {
    name: "La pierre marquée",
    text: "Un rocher, en travers du sentier. Dessus, un trait qui luit quand tu ne regardes pas.",
    branches: {
      main: { label: "Poser la main sur le trait", gainBreath: 40, text: "C'est tiède. Ton souffle revient d'un coup, plus que tu n'en avais perdu." },
      tour: { label: "Faire le tour", cost: { breath: 10 }, text: "Le détour est long. Quand tu te retournes, la pierre ne luit plus." }
    }
  },
  mark: { branch: "main", dmgMult: 1.2 },
  echo: { mark: "Il y a un trait sur ta paume. Il ne part pas à l'eau." },
  clairiere: {
    main: "Au centre, une pierre comme celle du sentier. Le trait sur ta main luit en même temps qu'elle.",
    other: "Au centre, une pierre. Elle ne luit pas pour toi."
  }
};
PA2_HOOKS.feu = {
  id: "feu", worldId: "forest",
  title: "Un feu sans fumée",
  lede: "Orwen a vu une lueur au fond du bois, là où personne ne fait de feu. Elle n'a rien dit. Elle a mis un pain de côté.",
  event: {
    name: "Le cercle de cendres",
    text: "Un cercle de cendres, vieux. Pas de fumée. Au milieu, une braise. Elle ne s'éteint pas.",
    branches: {
      nourrir: { label: "La nourrir d'une ration", cost: { ration: 1 }, text: "Elle prend le pain. La cendre autour devient chaude, puis froide." },
      passer: { label: "Passer", text: "Tu passes. La lueur reste longtemps dans ton dos." }
    }
  },
  destGold: { nourrir: 1.25 },
  destRare: { nourrir: 1 },
  campGift: { text: "Dans les pierres du camp, une braise que tu n'as pas allumée.", relic: "braise", branches: ["passer"] },
  echo: { dest: "Ce que tu trouves ici pèse plus lourd que prévu. Il y a de la cendre dessus." },
  clairiere: {
    nourrir: "Les lanternes brûlent sans fumée. Toutes.",
    other: "Une lanterne est éteinte, au pied de l'arbre du centre."
  }
};
/* v3.387.0 (PA2-5, F3-F4) : les accroches du Désert. Maddoc reprend l'événement de la v1 : il
   passe avant les autres tant que l'Histoire le permet (priority + eligible), une fois par partie
   (storyFlag : drapeau permanent de l'Histoire, lu par storyMaddocMet). */
PA2_HOOKS.maddoc = {
  id: "maddoc", worldId: "desert",
  priority: true,
  eligible: function () {
    var SQ = window.StoryQuestManager;
    return !!(SQ && SQ.isStepReached("desert_03") && !SQ.isStepReached("desert_08"));
  },
  storyFlag: { key: "maddocMet", values: { gourde: "aided", epaule: "aided", passer: "passed" } },
  title: "Un homme dans les dunes",
  lede: "Les caravaniers parlent d'un homme qui marche seul, de l'autre côté du gouffre. On ne sait pas s'il cherche quelque chose ou s'il fuit.",
  event: {
    name: "Un homme",
    text: "Un homme, assis contre une dalle. Sa jambe ne va pas dans le bon sens. Il a vu que tu portais une gourde.",
    branches: {
      gourde: { label: "Lui donner la gourde", cost: { stock: "gourde" }, text: "Il boit. Il ne dit pas merci, il dit son nom : Maddoc, de l'autre côté du gouffre." },
      epaule: { label: "L'aider à marcher", cost: { breath: 20 }, text: "Il s'appuie sur toi jusqu'au bout du passage. Il ne dit pas merci, il dit son nom : Maddoc, de l'autre côté du gouffre." },
      passer: { label: "Passer", text: "Tu passes. Il ne t'appelle pas." }
    }
  },
  assist: { branches: ["gourde", "epaule"] },
  destGold: { passer: 0.85 }, // v1 : −15 % au coffre final
  echo: {
    assist: "Une pierre siffle depuis les dunes. L'un d'eux tombe avant d'avoir compris. Quelqu'un, derrière, qui boite.",
    dest: "Le coffre est ouvert. Il manque ce qu'un homme peut porter d'une main."
  },
  clairiere: {
    gourde: "Contre la tente du milieu, une béquille taillée dans un bois de caravane. Quelqu'un est passé en boitant.",
    epaule: "Contre la tente du milieu, une béquille taillée dans un bois de caravane. Quelqu'un est passé en boitant.",
    other: "Les tentes sont vides. Personne ne t'attendait."
  }
};
PA2_HOOKS.caravane = {
  id: "caravane", worldId: "desert",
  title: "La caravane du sel",
  lede: "Une caravane de sel devait arriver au camp avant-hier. Les chameaux sont rentrés seuls, les bâts vides.",
  event: {
    name: "Le bât éventré",
    text: "Un bât de chameau, éventré dans le sable. Le sel s'en échappe encore. Les traces partent vers l'oued, et elles sont fraîches.",
    branches: {
      suivre: { label: "Suivre les traces", cost: { breath: 15 }, text: "Les traces s'arrêtent net au bord d'un creux. Tu ne descends pas. Tu sais maintenant par où ils sont passés." },
      passer: { label: "Passer", text: "Tu passes. Le vent recouvre déjà les traces." }
    }
  },
  destGold: { suivre: 1.25 },
  destRare: { suivre: 1 },
  echo: { dest: "Des traces de bât, jusqu'ici. Ils ont caché quelque chose avant de partir." },
  clairiere: {
    suivre: "Derrière les tentes, des bâts de sel, rangés. Quelqu'un a fini le voyage à ta place.",
    other: "Du sel, répandu devant les tentes. Personne ne l'a ramassé."
  }
};
PA2_HOOKS.sentinelle = {
  id: "sentinelle", worldId: "desert",
  title: "La tour qui ne répond plus",
  lede: "Depuis trois nuits, la tour de guet ne répond plus aux feux du camp. Personne n'y est monté voir.",
  event: {
    name: "La sentinelle",
    text: "Un homme en faction, debout sur une pierre, face au nord. Il ne se retourne pas quand tu approches. Sa lance est plantée dans le sable.",
    branches: {
      veiller: { label: "Prendre la garde avec lui", cost: { breath: 15 }, text: "Vous regardez le nord ensemble. Au bout d'un moment, il dit : « Là. » Tu ne vois rien. Puis tu vois." },
      passer: { label: "Passer", text: "Tu passes derrière lui. Il ne se retourne pas." }
    }
  },
  mark: { branch: "veiller", dmgMult: 1.2 },
  echo: { mark: "Tu vois plus loin qu'avant. Et ce qui est loin te voit aussi." },
  clairiere: {
    veiller: "Devant les tentes, une lance plantée dans le sable, face au nord.",
    other: "Les tentes sont vides. Au loin, la tour de guet ne répond toujours pas."
  }
};
/* v3.429.0 (Ruines, U-6) : une accroche, la page du carnet d'Edda. */
PA2_HOOKS.carnet = {
  id: "carnet", worldId: "ruins",
  title: "La page qui manque",
  lede: "Une page du carnet d'Edda s'est envolée hier soir. Elle dit qu'elle ne la retrouvera pas où elle l'a perdue : la rue n'est plus là.",
  event: {
    name: "La page",
    text: "Une feuille coincée sous une pierre, au milieu d'une cour. Les rues tracées dessus ne ressemblent à rien d'ici. Puis tu reconnais celle où tu es.",
    branches: {
      suivre: { label: "Suivre le tracé", cost: { breath: 15 }, text: "Tu prends la rue de la page plutôt que celle de tes yeux. Elle mène où la page dit." },
      garder: { label: "La ranger pour Edda", text: "Tu plies la page en quatre. Edda la voudra telle qu'elle est." }
    }
  },
  mark: { branch: "suivre", dmgMult: 1.2 },
  echo: { mark: "Tu marches sur des rues d'hier. Ce qui vit dans celles d'aujourd'hui te remarque." },
  clairiere: {
    suivre: "Sur la margelle, la même écriture que sur la page : « ici, ça reste ».",
    other: "Sur la margelle, un trait de craie. Edda est passée avant toi, un autre jour."
  }
};
/* v3.454.0 (Crypte) : une accroche, la lampe qui manque à Sarkel. */
PA2_HOOKS.lampe = {
  id: "lampe", worldId: "crypt",
  title: "La lampe qui manque",
  lede: "Sarkel a compté ses lampes en rentrant. Il en manque une. Il dit qu'il ne l'a pas posée, et qu'il ne la cherchera pas.",
  event: {
    name: "La lampe",
    text: "Une lampe posée par terre, au milieu du couloir, allumée. Personne autour. La flamme ne bouge pas.",
    branches: {
      porter: { label: "La porter devant toi", cost: { breath: 15 }, text: "Elle est lourde pour une lampe. Elle éclaire loin, et elle ne fume pas." },
      laisser: { label: "La laisser où elle est", text: "Tu passes à côté. Derrière toi, quelqu'un se lève pour la prendre." }
    }
  },
  destRare: { porter: 1 },
  echo: { dest: "Quelqu'un attendait cette lampe. Il a laissé de la cire en échange." },
  clairiere: {
    porter: "Sur l'autel, une place vide, à la taille d'une lampe. Tu y poses la tienne.",
    other: "Sur l'autel, une lampe éteinte. Personne ne l'a rallumée."
  }
};
/* v3.469.3 (bilan des Petites Aventures, point 2) : deux accroches de plus aux Ruines et à la Crypte. */
PA2_HOOKS.batisseur = {
  id: "batisseur", worldId: "ruins",
  title: "Le bâtisseur égaré",
  lede: "Un des bâtisseurs n'est pas rentré au chantier. Les autres disent qu'il a suivi une rue qui tournait.",
  event: {
    name: "Le bâtisseur",
    text: "Un homme assis sur une pierre de taille, une truelle à la main. Il ne sait plus quelle rue mène au chantier. Il a soif.",
    branches: {
      gourde: { label: "Lui donner la gourde", cost: { stock: "gourde" }, text: "Il boit, puis il montre une rue du menton : « Pas celle-là. Celle d'hier. » Il repart vers le chantier." },
      chemin: { label: "Lui montrer le chemin", cost: { breath: 20 }, text: "Tu le ramènes jusqu'à une rue qu'il reconnaît. Il pose une main sur un mur et ne dit plus rien. Il sait où il est." },
      passer: { label: "Passer", text: "Tu passes. Derrière toi, il recommence à compter les pierres." }
    }
  },
  assist: { branches: ["gourde", "chemin"] },
  destGold: { passer: 0.85 },
  echo: {
    assist: "Une pierre de taille tombe d'un toit, pile sur l'un d'eux. En haut, une truelle te salue.",
    dest: "Il manque une pierre au coffre. Quelqu'un l'a prise pour finir un mur."
  },
  clairiere: {
    gourde: "Sur la margelle, une pierre neuve, taillée net. Une truelle y a gravé une marque.",
    chemin: "Sur la margelle, une pierre neuve, taillée net. Une truelle y a gravé une marque.",
    other: "Le puits est fermé d'une pierre neuve. Personne ne l'a descellée."
  }
};
PA2_HOOKS.statue = {
  id: "statue", worldId: "ruins",
  title: "La statue au carrefour",
  lede: "Les enfants disent qu'une statue des Ruines a changé de place. Edda dit qu'elles le font toutes, mais pas toujours vers nous.",
  event: {
    name: "La statue",
    text: "Une statue sur un socle, au milieu d'un carrefour. Sa main tendue tient une pièce. Elle n'était pas là ce matin.",
    branches: {
      prendre: { label: "Prendre la pièce", text: "La pièce est froide et lourde. Quand tu relèves la tête, la statue te regarde." },
      offrir: { label: "Poser une ration à ses pieds", cost: { ration: 1 }, text: "Tu poses la ration sur le socle. Il te semble que la main s'est refermée un peu." },
      passer: { label: "Passer", text: "Tu passes. Au carrefour suivant, la même statue. Tu ne te retournes pas." }
    }
  },
  mark: { branch: "prendre", dmgMult: 1.2 },
  campGift: { text: "Sur un banc de la cour, une petite pierre qui chante quand le vent passe. Elle n'était pas là.", relic: "pierre", branches: ["offrir"] },
  echo: { mark: "La pièce pèse dans ta poche. Ce qui vit dans les murs sait que tu l'as." },
  clairiere: {
    prendre: "Au milieu de la cour, la statue. Sa main est ouverte, tendue vers toi.",
    offrir: "Au bord du puits, une ration posée, intacte. Quelqu'un te la rend.",
    other: "Au milieu de la cour, un socle vide."
  }
};
PA2_HOOKS.garcon = {
  id: "garcon", worldId: "crypt",
  title: "Le garçon aux mèches",
  lede: "Le garçon qui allume les lampes pour Sarkel s'est endormi en bas. Sarkel dit qu'on ne réveille pas quelqu'un qui dort là-dessous. Pas sans raison.",
  event: {
    name: "Le garçon",
    text: "Un garçon endormi contre un pilier, une mèche éteinte à la main. Autour de lui, les morts dorment aussi.",
    branches: {
      reveiller: { label: "Le réveiller doucement", cost: { breath: 15 }, text: "Il ouvre les yeux sans un bruit. Il a l'habitude. « Je rentre par la salle aux lampes », souffle-t-il, et il disparaît entre les piliers." },
      laisser: { label: "Le laisser dormir", text: "Tu le laisses. Il sourit dans son sommeil, comme ceux d'à côté." }
    }
  },
  campGift: { text: "À la salle aux lampes, le garçon t'attend, une mèche allumée. « Je connais les couloirs. » Il te les montre du doigt, un par un.", relic: "oeil", branches: ["reveiller"] },
  echo: {},
  clairiere: {
    reveiller: "Dans la chapelle, les deux vasques brûlent avec des mèches neuves.",
    other: "Dans la chapelle, une des deux vasques est éteinte."
  }
};
PA2_HOOKS.cloche = {
  id: "cloche", worldId: "crypt",
  title: "La cloche sans sonneur",
  lede: "Une cloche a sonné cette nuit, au fond de la Crypte. Il n'y a plus de sonneur depuis cent ans.",
  event: {
    name: "La cloche",
    text: "Une petite cloche suspendue à une voûte basse. Sa corde bouge encore. Personne au bout.",
    branches: {
      tenir: { label: "Tenir la corde", cost: { breath: 10 }, text: "La corde tire, doucement, à intervalles réguliers. Quelque part, quelqu'un compte. Tu tiens bon." },
      couper: { label: "Lui donner ta Corde", cost: { stock: "corde" }, text: "Tu noues ta Corde à la place de la sienne, serré, jusqu'au mur. La cloche ne bouge plus. Plus loin, quelque chose cesse d'attendre." },
      passer: { label: "Passer", text: "Tu passes sous la voûte. La corde bouge encore quand tu te retournes." }
    }
  },
  mark: { branch: "tenir", dmgMult: 1.2 },
  destGold: { couper: 1.25 },
  destRare: { couper: 1 },
  echo: {
    mark: "Tu entends encore la cloche, même loin d'elle. Ce qui dort l'entend aussi.",
    dest: "Sous l'autel, de la cire et une petite cloche muette. On te remercie."
  },
  clairiere: {
    tenir: "Dans la chapelle, une corde neuve pend d'une poutre. Elle ne bouge pas.",
    couper: "Sur l'autel, un bout de ta Corde, noué serré, et de la cire posée dessus.",
    other: "Une cloche se tait quand tu entres."
  }
};
var PA2_HOOKS_BY_WORLD = {
  forest: ["chasseur", "gouffre", "pierre", "feu"],
  desert: ["maddoc", "caravane", "sentinelle"],
  ruins: ["carnet", "batisseur", "statue"], // v3.469.3 : deux de plus
  crypt: ["lampe", "garcon", "cloche"]       // v3.454.0 ; v3.469.3 : deux de plus
};

window.PA2_BAG_SIZE = PA2_BAG_SIZE;
window.PA2_WORLD_RULES = PA2_WORLD_RULES;
window.PA2_TRAP_RULES = PA2_TRAP_RULES;
window.PA2_CUT_RULES = PA2_CUT_RULES;
window.PA2_CUTS = PA2_CUTS;
window.PA2_CONDITION_RULES = PA2_CONDITION_RULES;
window.PA2_CONDITION_CALM = PA2_CONDITION_CALM;
window.PA2_CONDITIONS = PA2_CONDITIONS;
window.PA2_TRAP_FX = PA2_TRAP_FX;
window.PA2_TRAP_FX_ORDER = PA2_TRAP_FX_ORDER;
window.PA2_TRAP_WEIGHTS = PA2_TRAP_WEIGHTS;
window.PA2_TRAPS = PA2_TRAPS;
window.PA2_PLACES_BY_WORLD = PA2_PLACES_BY_WORLD;
window.PA2_ITEMS = PA2_ITEMS;
window.PA2_ITEM_ORDER = PA2_ITEM_ORDER;
window.PA2_PACTS = PA2_PACTS;
window.PA2_PACT_ORDER = PA2_PACT_ORDER;
window.PA2_RELICS = PA2_RELICS;
window.PA2_RELIC_RARITY_WEIGHTS = PA2_RELIC_RARITY_WEIGHTS;
window.PA2_NODE_WEIGHTS = PA2_NODE_WEIGHTS;
window.PA2_ACTS = PA2_ACTS;
window.PA2_RINGS = PA2_RINGS;
window.PA2_LEVEL_BANDS = PA2_LEVEL_BANDS;
window.PA2_HERO_SCALING = PA2_HERO_SCALING;
window.PA2_OBSTACLES = PA2_OBSTACLES;
window.PA2_OBSTACLE_TERTRE = PA2_OBSTACLE_TERTRE;
window.PA2_GUARDIAN = PA2_GUARDIAN;
window.PA2_APPROACHES = PA2_APPROACHES;
window.PA2_GOLD = PA2_GOLD;
window.PA2_RARE = PA2_RARE;
window.PA2_MEMORY_DEST_RARE = PA2_MEMORY_DEST_RARE;
window.PA2_CHEST_REWARDS = PA2_CHEST_REWARDS;
window.PA2_RULES = PA2_RULES;
window.PA2_FOES = PA2_FOES;
window.PA2_FOE_LINES = PA2_FOE_LINES;
window.PA2_OBSTACLE_LINES = PA2_OBSTACLE_LINES;
window.PA2_PLACES = PA2_PLACES;
window.PA2_DESTS = PA2_DESTS;
window.PA2_HOOKS = PA2_HOOKS;
window.PA2_HOOKS_BY_WORLD = PA2_HOOKS_BY_WORLD;
