"use strict";
/* data/equipment.js — base équipement procédural (7 emplacements), raretés, bonus de set. Détail complet : COMMENTAIRES_ORIGINAUX.md */

var RARITY_COLORS = {
  common: "#9ca3af",
  green: "#22c55e",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b"
};

var RARITY_LABELS = {
  common: "Commun",
  green: "Inhabituel",
  rare: "Rare",
  epic: "Épique",
  legendary: "Légendaire"
};

var RARITY_ORDER = ["common", "green", "rare", "epic", "legendary"];

var RARITY_DROP_RATES = {
  common: 55,
  green: 25,
  rare: 15,
  epic: 4,
  legendary: 1
};

var WORLD_RARITY_UNLOCKS = [
  ["common"],
  ["common", "green"],
  ["common", "green", "rare"],
  ["common", "green", "rare", "epic"],
  ["common", "green", "rare", "epic"],
  ["common", "green", "rare", "epic", "legendary"]
];

var SET_BONUS_CONFIG = {
  tiers: [
    {
      count: 3,
      bonuses: {
        common: { name: "Panoplie commune (3)", apply: function () { return { tapDamage: 2 }; } },
        green: { name: "Panoplie inhabituelle (3)", apply: function () { return { tapMult: 0.05, goldMult: 0.05 }; } },
        rare: { name: "Panoplie rare (3)", apply: function () { return { tapMult: 0.10, goldMult: 0.10 }; } },
        epic: { name: "Panoplie épique (3)", apply: function () { return { tapMult: 0.20, critChance: 5 }; } },
        legendary: { name: "Panoplie légendaire (3)", apply: function () { return { tapMult: 0.35, critChance: 10, goldMult: 0.20 }; } }
      }
    },
    {
      count: 7,
      bonuses: {
        common: { name: "Panoplie commune complète (7)", apply: function () { return { tapDamage: 4, autoDps: 2 }; } },
        green: { name: "Panoplie inhabituelle complète (7)", apply: function () { return { tapMult: 0.08, goldMult: 0.08, critChance: 3 }; } },
        rare: { name: "Panoplie rare complète (7)", apply: function () { return { tapMult: 0.15, goldMult: 0.15, critChance: 5 }; } },
        epic: { name: "Panoplie épique complète (7)", apply: function () { return { tapMult: 0.25, critChance: 8, critMult: 0.3 }; } },
        legendary: { name: "Panoplie légendaire complète (7)", apply: function () { return { tapMult: 0.40, critChance: 15, critMult: 0.5, goldMult: 0.25 }; } }
      }
    }
  ],
  sameRarityCount: 3
};

/* v3.220.0 — ÉCHELLE DE MONDE SUR L'ÉQUIPEMENT.
   Jusqu'ici, un objet trouvé au monde 6 valait exactement un objet trouvé en
   Forêt : seule la rareté progressait, soit ×3,4 au total, quand les PV des
   ennemis font ×214. Mesure du 11/09/2026 sur le vrai moteur : le combat
   passait de 0,7 à 31 rounds par ennemi normal entre le premier et le dernier
   monde. La courbe ci-dessous (option B, validée par Seb) ramène ce coût autour
   de 4 à 5 rounds sur les cinq derniers mondes.

   Elle reste BIEN en dessous de la courbe des PV (×214) : les stats entraînées
   font déjà ×16 sur la partie, et l'ascension garde son rôle. Reprendre la
   courbe des PV telle quelle remplacerait ces deux systèmes au lieu de les
   compléter.

   RECALAGE : la proposition initiale (×1 1,3 1,7 2,5 5 9) venait d'un modèle
   supposant que 75 % des dégâts suivaient la courbe. Mesure faite : seules les
   stats PLATES la suivent, donc la cible n'était pas atteinte aux mondes 5 et 6
   (10,6 et 8,7 rounds au lieu de 4-5). Les coefficients ci-dessous sont ceux
   qui atteignent la cible sur le vrai moteur, PV moyennés sur les trois
   aventures de chaque monde.

   NE S'APPLIQUE QU'AUX STATS PLATES (scalesWithWorld ci-dessous). Les stats en
   pourcentage — défense, chance et multiplicateur de critique, multiplicateur
   de dégâts et d'or — ne doivent JAMAIS être mises à l'échelle : la défense est
   plafonnée à 60 %, et multiplier un multiplicateur n'a pas de sens. C'est le
   piège principal de ce chantier. */
var EQUIP_WORLD_SCALE = [1, 1.4, 2.2, 4, 10, 18];

function getEquipWorldScale(worldIndex) {
  var i = Math.max(0, Math.min(EQUIP_WORLD_SCALE.length - 1, Math.floor(Number(worldIndex) || 0)));
  return EQUIP_WORLD_SCALE[i];
}

var EQUIPMENT_SLOTS = ["weapon", "armor", "helmet", "gloves", "boots", "ring", "amulet"];

var EQUIPMENT_SLOT_LABELS = {
  weapon: "Arme",
  armor: "Armure",
  helmet: "Casque",
  gloves: "Gants",
  boots: "Bottes",
  ring: "Anneau",
  amulet: "Amulette"
};

var EQUIPMENT_SLOT_EMOJI = {
  weapon: "⚔️",
  armor: "🛡️",
  helmet: "🪖",
  gloves: "🧤",
  boots: "👢",
  ring: "💍",
  amulet: "📿"
};

var EQUIPMENT_SLOT_CONFIG = {
  weapon: {
    stat: "tapDmg",
    /* Stat plate : suit l'échelle de monde (voir EQUIP_WORLD_SCALE). */
    scalesWithWorld: true,
    decimals: 0,
    icons: ["bow", "sword", "axe", "staff"],
    names: ["Épée", "Hache", "Bâton", "Arc", "Dague", "Lame"],
    namesByIcon: {
      bow: ["Arc"],
      sword: ["Épée", "Lame", "Dague"],
      axe: ["Hache"],
      staff: ["Bâton"]
    },
    ranges: {
      // Ranges réduites (session équilibrage "scie") : desserre l'écart de DPS entre paliers hauts, cf. rapport.
      common: [10, 25],
      green: [23, 32],
      rare: [32, 48],
      epic: [49, 72],
      legendary: [59, 84]
    }
  },
  armor: {
    stat: "defense",
    decimals: 2,
    icons: ["armor"],
    names: ["Armure", "Cuirasse", "Plastron"],
    ranges: {
      /* v3.219.0 : échelle refaite. Les fourchettes réduites de la session
         « scie » étaient plates en haut (légendaire +3 % sur épique), parce
         que l'endurance saturait le plafond de 60 % à elle seule et qu'il n'y
         avait plus de place. La défense étant devenue dégressive
         (stats-system.js), l'armure retrouve une marge d'environ 13 points et
         peut de nouveau constituer un vrai palier — écarts calés sur ceux de
         l'amulette, le seul emplacement dont l'échelle était restée régulière.
         Ancien barème : commun .01-.03, inhab. .027-.045, rare .038-.06,
         épique .044-.066, légendaire .046-.068. */
      common: [0.015, 0.035],
      green: [0.032, 0.055],
      rare: [0.05, 0.08],
      epic: [0.075, 0.105],
      legendary: [0.10, 0.13]
    }
  },
  helmet: {
    stat: "critMult",
    decimals: 2,
    icons: ["casque"],
    names: ["Casque", "Heaume"],
    ranges: {
      common: [0.10, 0.20],
      green: [0.20, 0.35],
      rare: [0.35, 0.55],
      epic: [0.55, 0.85],
      legendary: [0.85, 1.30]
    }
  },
  gloves: {
    stat: "tapMult",
    decimals: 2,
    icons: ["gants"],
    names: ["Gants"],
    ranges: {
      common: [0.10, 0.20],
      green: [0.20, 0.35],
      rare: [0.35, 0.55],
      epic: [0.55, 0.90],
      legendary: [0.90, 1.50]
    }
  },
  boots: {
    stat: "autoDps",
    /* Stat plate : suit l'échelle de monde. */
    scalesWithWorld: true,
    decimals: 0,
    icons: ["bottes"],
    names: ["Bottes"],
    ranges: {
      // Ranges réduites (session équilibrage "scie") : réduit autoDps en fin de jeu, cf. rapport.
      common: [2, 5],
      green: [4, 8],
      rare: [7, 12],
      epic: [9, 17],
      legendary: [11, 19]
    }
  },
  ring: {
    stat: "goldMult",
    decimals: 2,
    icons: ["ring"],
    names: ["Anneau", "Bague", "Chevalière"],
    ranges: {
      common: [0.05, 0.10],
      green: [0.10, 0.18],
      rare: [0.18, 0.30],
      epic: [0.30, 0.50],
      legendary: [0.50, 0.80]
    }
  },
  amulet: {
    stat: "critChance",
    decimals: 0,
    icons: ["amulet"],
    names: ["Amulette", "Pendentif", "Collier", "Talisman", "Médaillon"],
    ranges: {
      common: [1, 3],
      green: [3, 5],
      rare: [5, 8],
      epic: [8, 13],
      legendary: [13, 20]
    }
  }
};

window.EQUIP_WORLD_SCALE = EQUIP_WORLD_SCALE;
window.getEquipWorldScale = getEquipWorldScale;
window.EQUIPMENT_SLOTS = EQUIPMENT_SLOTS;
window.EQUIPMENT_SLOT_LABELS = EQUIPMENT_SLOT_LABELS;
window.EQUIPMENT_SLOT_EMOJI = EQUIPMENT_SLOT_EMOJI;
window.EQUIPMENT_SLOT_CONFIG = EQUIPMENT_SLOT_CONFIG;

/* v3.225.0 — AFFIXES (chantier Équipement multi-affixes, doc v1.2, tables figées au Lot 0).
   Un objet garde sa stat de base (stat/value, identité de l'emplacement) et reçoit en plus
   des affixes { stat, value, tier } tirés à la génération (voir rollEquipmentAffixes,
   systems/loot-system.js). Commun = 0 affixe : rien ne change en Forêt. Le premier affixe
   est toujours PRIMAIRE (combat) : dès l'Inhabituel, un drop change quelque chose en combat.
   Les affixes ne sont ni forgés (D14) ni mis à l'échelle après coup : les plats (tapDmg,
   autoDps) suivent EQUIP_WORLD_SCALE à la génération, les pourcentages jamais. */
var AFFIX_COUNT_BY_RARITY = {
  common: { primary: 0, secondary: 0 },
  green: { primary: 1, secondary: 0 },
  rare: { primary: 1, secondary: 1 },
  epic: { primary: 2, secondary: 1 },
  legendary: { primary: 2, secondary: 2 }
};

/* Pools par emplacement. Un affixe ne duplique jamais la stat de base ni un autre affixe
   du même objet. tapDmg limité à Gants/Anneau (D16) : l'arme reste l'emplacement des dégâts plats. */
var AFFIX_POOLS = {
  weapon: { primary: ["tapMult", "critChance", "critMult"], secondary: ["goldMult", "xpMult", "dropChance"] },
  armor: { primary: ["maxHpPct", "autoDps", "critChance"], secondary: ["goldMult", "xpMult", "dropChance"] },
  helmet: { primary: ["critChance", "maxHpPct", "tapMult"], secondary: ["goldMult", "xpMult", "dropChance"] },
  gloves: { primary: ["tapDmg", "critChance", "autoDps"], secondary: ["goldMult", "xpMult", "dropChance"] },
  boots: { primary: ["maxHpPct", "defense", "critMult"], secondary: ["goldMult", "xpMult", "dropChance"] },
  ring: { primary: ["tapDmg", "critChance", "tapMult"], secondary: ["xpMult", "dropChance"] },
  amulet: { primary: ["critMult", "tapMult", "maxHpPct"], secondary: ["goldMult", "xpMult", "dropChance"] }
};

/* Fourchettes [min, max] par rareté (à partir de l'Inhabituel). flat = × échelle de monde. */
var AFFIX_RANGES = {
  tapDmg: { flat: true, decimals: 0, green: [6, 10], rare: [9, 15], epic: [14, 22], legendary: [18, 28] },
  tapMult: { decimals: 2, green: [0.08, 0.15], rare: [0.15, 0.25], epic: [0.25, 0.40], legendary: [0.40, 0.65] },
  critChance: { decimals: 0, green: [1, 2], rare: [2, 4], epic: [4, 6], legendary: [6, 9] },
  critMult: { decimals: 2, green: [0.08, 0.15], rare: [0.15, 0.25], epic: [0.25, 0.40], legendary: [0.40, 0.60] },
  defense: { decimals: 3, green: [0.015, 0.025], rare: [0.022, 0.036], epic: [0.034, 0.047], legendary: [0.045, 0.06] },
  autoDps: { flat: true, decimals: 0, green: [2, 3], rare: [3, 5], epic: [4, 7], legendary: [5, 9] },
  maxHpPct: { decimals: 2, green: [0.03, 0.06], rare: [0.06, 0.10], epic: [0.10, 0.15], legendary: [0.15, 0.22] },
  goldMult: { decimals: 2, green: [0.03, 0.06], rare: [0.05, 0.10], epic: [0.08, 0.15], legendary: [0.12, 0.20] },
  xpMult: { decimals: 2, green: [0.03, 0.06], rare: [0.05, 0.10], epic: [0.08, 0.15], legendary: [0.12, 0.20] },
  dropChance: { decimals: 0, green: [2, 4], rare: [4, 7], epic: [6, 10], legendary: [8, 14] }
};

/* Plafond de la chance de butin apportée par l'équipement (points, sur les 50 % de base). */
var EQUIP_DROP_CHANCE_CAP = 25;

window.AFFIX_COUNT_BY_RARITY = AFFIX_COUNT_BY_RARITY;
window.AFFIX_POOLS = AFFIX_POOLS;
window.AFFIX_RANGES = AFFIX_RANGES;
window.EQUIP_DROP_CHANCE_CAP = EQUIP_DROP_CHANCE_CAP;

/* v3.230.0 — POUVOIRS LÉGENDAIRES (Lot 4). Un pouvoir fixe par objet légendaire,
   tiré parmi les 2 candidats de son emplacement, en plus de ses 4 affixes.
   `hook` documente où l'effet est lu — aucun effet n'est câblé ici, la donnée
   ne fait que décrire. Le Légendaire ne tombe qu'à la Tour (WORLD_RARITY_UNLOCKS)
   ou en cycle : ces pouvoirs sont du contenu de fin de course. */
var LEGENDARY_POWERS = {
  weapon: [
    { id: "leg_echo", label: "Écho", desc: "10 % de chance qu'une attaque de base frappe deux fois.", hook: "combat-engine" },
    { id: "leg_vorace", label: "Lame vorace", desc: "Chaque ennemi vaincu rend 2 % des PV max.", hook: "combat-engine" }
  ],
  armor: [
    { id: "leg_ecorce", label: "Peau d'écorce", desc: "+5 % de défense pendant le round qui suit un coup reçu.", hook: "combat-engine" },
    { id: "leg_second_souffle", label: "Second souffle", desc: "Une fois par combat, survit à un coup mortel avec 1 PV.", hook: "combat-engine" }
  ],
  helmet: [
    { id: "leg_faucon", label: "Œil du faucon", desc: "Les coups critiques infligent +25 % de dégâts aux Élites.", hook: "combat-engine" },
    { id: "leg_clairvoyance", label: "Clairvoyance", desc: "Les intentions de l'ennemi se lisent un round plus tôt.", hook: "combat-engine" }
  ],
  gloves: [
    { id: "leg_poigne", label: "Poigne de fer", desc: "Le premier coup d'un combat est toujours critique.", hook: "combat-engine" },
    { id: "leg_frenesie", label: "Frénésie", desc: "+2 % de dégâts par ennemi vaincu sans subir de dégâts (max +20 %).", hook: "combat-engine" }
  ],
  /* v3.230.0 : « Pas rapides » et « Chasseur » (doc v1.2) n'avaient pas de mécanique en face —
     le repos court n'existe plus dans le code, et la Petite Aventure ne lit pas la Célérité.
     Remplacés par deux effets réels, l'un en combat, l'autre en Sortie. */
  boots: [
    { id: "leg_foulee", label: "Foulée vive", desc: "La jauge de célérité démarre chaque combat à moitié pleine.", hook: "combat-engine" },
    { id: "leg_marcheur", label: "Endurance du marcheur", desc: "Les options d'obstacle coûtent 15 % de Souffle en moins.", hook: "scene-run" }
  ],
  ring: [
    { id: "leg_prospecteur", label: "Prospecteur", desc: "10 % des boss vaincus rapportent le double d'or.", hook: "combat-engine" },
    { id: "leg_collectionneur", label: "Collectionneur", desc: "+1 exemplaire sur chaque butin d'ingrédient en Sortie.", hook: "scene-run" }
  ],
  amulet: [
    { id: "leg_coeur_ardent", label: "Cœur ardent", desc: "La ressource de classe démarre chaque combat à +10 %.", hook: "class-combat" },
    /* v3.230.0 : remplace « Ténacité », dont l'effet n'avait jamais été défini (retiré par Seb le 12/09).
       La recharge passe par combat-cooldown-system.js, hors fichiers protégés. */
    { id: "leg_memoire", label: "Mémoire des anciens", desc: "Les compétences récupèrent un round plus vite (minimum 1).", hook: "cooldown" }
  ]
};

/* Index id → pouvoir, pour lire un pouvoir sans connaître son emplacement. */
var LEGENDARY_POWER_BY_ID = {};
Object.keys(LEGENDARY_POWERS).forEach(function (slot) {
  LEGENDARY_POWERS[slot].forEach(function (p) {
    LEGENDARY_POWER_BY_ID[p.id] = { id: p.id, label: p.label, desc: p.desc, hook: p.hook, slot: slot };
  });
});

window.LEGENDARY_POWERS = LEGENDARY_POWERS;
window.LEGENDARY_POWER_BY_ID = LEGENDARY_POWER_BY_ID;
