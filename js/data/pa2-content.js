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
    icon: "images/Icons/resources/petite_ration_icon.png",
    pro: "Rend 35 % des PV. Cuisinée au camp ou au seuil : 70 % et une blessure en moins." },
  ration: { id: "ration", resource: "ration", size: 2, uses: 1, healPct: 0.60, healsWound: true,
    icon: "images/Icons/resources/ration_icon.png",
    pro: "Rend 60 % des PV et efface une blessure.", con: "Encombrante." },
  grande_ration: { id: "grande_ration", resource: "grande_ration", size: 3, uses: 1, healPct: 1.00, healsWound: true,
    icon: "images/Icons/resources/grande_ration_icon.png",
    pro: "Rend tous les PV et efface une blessure.", con: "Prend la moitié de la besace." },
  gourde: { id: "gourde", name: "Gourde", size: 1, uses: 2, breath: 25,
    icon: "images/Icons/scene/water_flask.png",
    pro: "Deux gorgées : +25 Souffle chacune." },
  corde: { id: "corde", name: "Corde", size: 1, uses: 1,
    icon: "images/Icons/scene/rope.png",
    pro: "Réussite assurée sur un obstacle, voie précision.", con: "Une seule fois." },
  torche: { id: "torche", name: "Torche", size: 1,
    icon: "images/Icons/scene/torch.png",
    pro: "Tu vois une rangée de plus devant toi.", con: "Sa lumière attire : combats +15 % de dégâts." },
  armure: { id: "armure", name: "Armure de voyage", size: 3,
    icon: "images/Icons/scene/items/item_armor.png",
    pro: "Combats : −35 % de dégâts reçus.", con: "Chaque obstacle coûte +8 Souffle." },
  carte: { id: "carte", name: "Carte du braconnier", size: 1,
    icon: "images/Icons/scene/items/item_poacher_map.png",
    pro: "Chaque trouvaille : choisis 1 carte parmi 2.", con: "Il faut la payer : butin final −20 %." },
  fiole: { id: "fiole", name: "Fiole noire", size: 1,
    icon: "images/Icons/scene/items/item_black_vial.png",
    pro: "À 0 PV, tu te relèves avec 40 % des PV.", con: "Si elle sert : butin final divisé par deux." },
  bois: { id: "bois", name: "Bois de cerf", size: 2, unlock: "boss",
    icon: "images/Icons/scene/items/item_stag_antler.png",
    pro: "+1 cran sur la voie force et en chargeant.",
    lockedHint: "Coffre d'expédition : abattre le gardien de la forêt." },
  veilleurs: { id: "veilleurs", name: "Lanterne des veilleurs", size: 1, unlock: "clairiere",
    icon: "images/Icons/scene/items/item_watch_lantern.png",
    pro: "Toute la carte est visible, et les sources rendent +10.",
    lockedHint: "Coffre d'expédition : atteindre la Clairière aux lanternes." }
};
var PA2_ITEM_ORDER = ["petite_ration", "ration", "grande_ration", "gourde", "corde", "torche", "armure", "carte", "fiole", "bois", "veilleurs"];

/* Pactes (V14, Q6) : malus choisis contre du butin final. */
var PA2_PACTS = {
  tarie:  { id: "tarie",  bonus: 0.25, icon: "images/Icons/scene/pacts/pact_dry.png",
    name: "Sources taries", desc: "Les sources ne rendent presque plus rien." },
  enrage: { id: "enrage", bonus: 0.40, icon: "images/Icons/scene/pacts/pact_awake.png",
    name: "La bête est éveillée", desc: "Les combats de l'acte III et le gardien frappent 40 % plus fort." },
  retour: { id: "retour", bonus: 0.30, icon: "images/Icons/scene/pacts/pact_no_return.png",
    name: "Pas de retour", desc: "Tomber à 0 PV, c'est tout perdre (au lieu de la moitié)." },
  lourd:  { id: "lourd",  bonus: 0.20, icon: "images/Icons/scene/pacts/pact_heavy.png",
    name: "Pas lourd", desc: "Chaque pas coûte 4 Souffle." }
};
var PA2_PACT_ORDER = ["tarie", "enrage", "retour", "lourd"];

/* Trouvailles (V13) : objets de RUN, perdus au retour. rar : com / rare / leg.
   eventOnly : ne sort que d'une rencontre (jamais d'un tirage). */
var PA2_RELICS = {
  seve:   { id: "seve",   rar: "com",  icon: "images/Icons/scene/relics/relic_seve.png",   name: "Sève vive",         fx: "Les sources rendent le double." },
  braise: { id: "braise", rar: "com",  icon: "images/Icons/scene/relics/relic_braise.png", name: "Braise tenace",     fx: "Chaque pas rend 3 % des PV." },
  plume:  { id: "plume",  rar: "com",  icon: "images/Icons/scene/relics/relic_plume.png",  name: "Plume de geai",     fx: "La voie précision ne coûte plus de Souffle." },
  dent:   { id: "dent",   rar: "rare", icon: "images/Icons/scene/relics/relic_dent.png",   name: "Dent de loup",      fx: "Combats : −25 % de dégâts reçus." },
  pierre: { id: "pierre", rar: "rare", icon: "images/Icons/scene/relics/relic_pierre.png", name: "Pierre qui chante", fx: "+1 cran sur la voie force." },
  oeil:   { id: "oeil",   rar: "rare", icon: "images/Icons/scene/relics/relic_oeil.png",   name: "Œil de chouette",   fx: "Toute la carte se révèle." },
  ronce:  { id: "ronce",  rar: "leg",  icon: "images/Icons/scene/relics/relic_ronce.png",  name: "Cœur de ronce",     fx: "Butin +30 %, mais chaque pas coûte 3 Souffle." },
  fleche: { id: "fleche", rar: "leg",  icon: "images/Icons/scene/relics/relic_fleche.png", name: "Flèche du veneur",  fx: "+1 cran en force et pour ruser, combats −15 % de dégâts.", eventOnly: true }
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
  sentier: { ring: 1, diffMult: 1.00, foeMult: 1.00, lootMult: 1.0 },  // v3.383.0 (PA2-3) : KO ~3 / 9 / 19 %,
  chemin:  { ring: 2, diffMult: 1.20, foeMult: 1.30, lootMult: 1.55 }, // or par minute de la v1 (C2, C3)
  periple: { ring: 3, diffMult: 1.40, foeMult: 1.75, lootMult: 2.55 }
};

/* Indexation sur le NIVEAU du héros (Q3). Chaque tranche donne le monde et l'aventure dont les
   ennemis servent de référence (WorldManager.generateEnemy, via QuestEnemyManager.spawnFor), et
   l'échelle des obstacles (même forme que heroScaling v1 : 1 + 0,6 × (bonus attendu − 21) / 10).
   Plancher : le monde de la carte. Repères de campagne (sim/campagne-lot.js, v3.365.0) : niveau 8
   à l'arrivée au Désert, 12 à la fin du chapitre II. Au-delà, la dernière tranche s'applique. */
var PA2_LEVEL_BANDS = [
  { minLevel: 1,  worldId: "forest", adventureIndex: 0, obstacleScale: 1.0, foeScale: 0.8 }, // v3.383.0 : héros sans vitrine (banc)
  { minLevel: 5,  worldId: "forest", adventureIndex: 1, obstacleScale: 1.5 },
  { minLevel: 8,  worldId: "desert", adventureIndex: 0, obstacleScale: 2.1 },
  { minLevel: 11, worldId: "desert", adventureIndex: 1, obstacleScale: 2.7 }
];

/* Obstacles : gabarits partagés (SCENE_NODES.obstacles) et pas de difficulté par rangée.
   Les voies reprennent le triangle de la Forêt v1 (optionProfiles du canevas). */
var PA2_OBSTACLES = {
  forest: ["eboulis", "gouffre", "porte_scellee", "paroi", "riviere", "racines"]
};
var PA2_OBSTACLE_TERTRE = { baseDifficulty: 7, gabaritId: "porte_scellee" };

/* Gardien de la destination « combat » (v3.383.0, PA2-3) : un ennemi d'acte III renforcé,
   indexé sur la tranche de niveau comme les autres. Multiplicateurs calés au banc. */
var PA2_GUARDIAN = {
  forest: { foe: "foresttroll", hpMult: 5, powMult: 2.2 }
};

/* Approches de combat (V17, Q2). dmg : dégâts reçus ; loot : or gagné. Ruser = jet de précision. */
var PA2_APPROACHES = {
  charger: { id: "charger", dmg: 1.3, loot: 1.4, rounds: 2, icon: "images/Icons/combat_status/charge_incoming.png" },
  tenir:   { id: "tenir",   dmg: 0.7, loot: 1.0, rounds: 3, icon: "images/Icons/combat_status/shield_active.png" }
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
  forest: { resourceId: "seve_aeswyn", findChancePct: 25, dest: { 1: 2, 2: 3, 3: 4 } }
};

/* Coffre d'expédition : destination -> objet débloqué (V12, Q8). */
var PA2_CHEST_REWARDS = { boss: "bois", clairiere: "veilleurs" };

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
  campRestPct: 0.15, seuilRestPct: 0.10, cookPct: 0.70, // v3.383.0 (C2) : 30/20 -> 15/10, les rations comptent
  fioleHpPct: 0.40,
  revengeMult: 1.3, enrageMult: 1.4, torchDmgMult: 1.15, armorDmgMult: 0.65, armorBreath: 8,
  dentMult: 0.75, flecheMult: 0.85, boisChargeMult: 0.85,
  surprisedMult: 1.2, heavyStep: 4, ronceStep: 3, ronceLoot: 1.3, braiseHealPct: 0.03,
  carteLoot: 0.8, fioleLoot: 0.5, damageSpread: 0.15, maxRounds: 60
};

/* ---------- Textes ---------- */

/* Combats : ennemis par acte (ENEMY_DB), réplique d'entrée. */
var PA2_FOES = {
  forest: { 1: ["wolf", "goblin"], 2: ["spider", "bramble"], 3: ["foresttroll", "bramble"] }
};
var PA2_FOE_LINES = {
  wolf: "Deux yeux dans la fougère. Puis quatre.",
  goblin: "Il fouillait un sac qui n'est pas le sien.",
  spider: "Les fils brillent sous la lune. Tu es déjà dedans.",
  bramble: "La haie se lève et marche vers toi.",
  foresttroll: "Ce que tu prenais pour un rocher se déplie."
};

/* Obstacles : une phrase d'ambiance par gabarit (bible narrative §4.3). */
var PA2_OBSTACLE_LINES = {
  eboulis: "Des pierres encore tièdes barrent le sentier. Quelque chose les a fait tomber.",
  gouffre: "La terre s'ouvre sous les racines. En bas, de l'eau. Ou autre chose.",
  porte_scellee: "Une porte de pierre, au milieu des arbres. Aucun mur autour.",
  paroi: "La roche monte droit. Elle est tiède sous la main.",
  riviere: "L'eau est noire et rapide. Elle ne fait aucun bruit.",
  racines: "Les racines ont bouché le passage cette nuit. Elles serrent encore."
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
   Suites différées (lues par le moteur) : assist (Maddoc, un ennemi de moins au 1er combat des
   actes II-III), destGold (or des destinations ×), destRare (Sève en plus), mark (crans et
   dégâts), campGift (trouvaille au camp). echo : lignes posées sur le nœud concerné. */
PA2_HOOKS.maddoc = {
  id: "maddoc", worldId: "forest",
  title: "De l'autre côté du gouffre",
  lede: "Un marchand de bois devait passer le gouffre avant la nuit. Sa charrette est rentrée sans lui. De l'autre côté, on l'attend encore.",
  event: {
    name: "L'homme contre le tronc",
    text: "Un homme, assis contre un tronc. Sa jambe ne va pas dans le bon sens. Il a vu que tu portais une gourde.",
    branches: {
      gourde: { label: "Lui donner la gourde", cost: { stock: "gourde" }, text: "Il boit. Il ne dit pas merci, il dit son nom : Maddoc, de l'autre côté du gouffre." },
      epaule: { label: "L'aider à marcher", cost: { breath: 20 }, text: "Il s'appuie sur toi jusqu'au sentier. Il dit son nom : Maddoc. Puis il lâche ton épaule, et c'est tout." },
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
var PA2_HOOKS_BY_WORLD = { forest: ["chasseur", "maddoc", "pierre", "feu"] };

window.PA2_BAG_SIZE = PA2_BAG_SIZE;
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
window.PA2_OBSTACLES = PA2_OBSTACLES;
window.PA2_OBSTACLE_TERTRE = PA2_OBSTACLE_TERTRE;
window.PA2_GUARDIAN = PA2_GUARDIAN;
window.PA2_APPROACHES = PA2_APPROACHES;
window.PA2_GOLD = PA2_GOLD;
window.PA2_RARE = PA2_RARE;
window.PA2_CHEST_REWARDS = PA2_CHEST_REWARDS;
window.PA2_RULES = PA2_RULES;
window.PA2_FOES = PA2_FOES;
window.PA2_FOE_LINES = PA2_FOE_LINES;
window.PA2_OBSTACLE_LINES = PA2_OBSTACLE_LINES;
window.PA2_PLACES = PA2_PLACES;
window.PA2_DESTS = PA2_DESTS;
window.PA2_HOOKS = PA2_HOOKS;
window.PA2_HOOKS_BY_WORLD = PA2_HOOKS_BY_WORLD;
