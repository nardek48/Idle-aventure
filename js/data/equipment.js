"use strict";
/* ============================================================
QUEST IDLE — data/equipment.js
Base équipement, raretés et bonus de set.

Chaque objet d'EQUIPMENT_DB (plus bas dans le fichier) a la forme :
  { name, icon, rarity, stat, value }
  - icon détermine le TYPE DE DÉGÂTS pour les armes (sword/axe -> "sword",
    staff -> "magic", bow -> "bow", voir WEAPON_ICON_DAMAGE_TYPE dans
    combat-engine.js) et juste l'apparence pour armure/amulette
  - stat: un parmi tapDmg/tapMult/goldMult/critChance/critMult/autoDps,
    appliqué une seule fois dans StatsSystem.recalcStats()
============================================================ */

/* formatSetBonusEffect() est définie dans systems/stats-system.js. */

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

/* Raretés disponibles au drop selon le monde en cours (index dans WORLDS).
   Cumulatif : chaque palier ajoute une rareté à celles déjà débloquées.
   Si le joueur est en plein cycle (a déjà bouclé tous les mondes une fois),
   toutes les raretés sont disponibles dès le premier monde. */
var WORLD_RARITY_UNLOCKS = [
  ["common", "green"],                                // Forêt (monde 0) — v2.83.2 : ajout Inhabituel (était [common] seul)
  ["common", "green"],                                // Désert (monde 1)
  ["common", "green", "rare"],                        // Ruines (monde 2)
  ["common", "green", "rare", "epic"],                // Crypte (monde 3)
  ["common", "green", "rare", "epic"],                // Montagne (monde 4)
  ["common", "green", "rare", "epic", "legendary"]     // Tour (monde 5)
];

/* Bonus actif quand 3 (sameRarityCount) pièces équipées partagent la
   même rareté. apply() retourne un objet de bonus fusionné dans les
   stats du joueur (voir StatsSystem.getSetBonus en stats-system.js). */
/* v3.18 : deuxième palier de panoplie — 7 pièces (l'équipement COMPLET,
   tous les emplacements de la même rareté) en plus des 3 déjà
   existantes. Les deux bonus SE CUMULENT (atteindre 7 donne le bonus
   3-pièces ET le bonus 7-pièces en plus, pas l'un OU l'autre) — voir
   getSetBonus() dans systems/stats-system.js, qui applique maintenant
   les deux paliers atteints au lieu d'un seul. */
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
  // v3.18 : conservé pour compatibilité — ancien code qui lirait
  // encore SET_BONUS_CONFIG.sameRarityCount/bonuses directement (le
  // seuil MINIMUM, 3 pièces, reste ici pour un éventuel repli).
  sameRarityCount: 3
};

/* ============================================================
v2.83.55 : passage à un système d'équipement PROCÉDURAL — remplace
les 51 objets écrits à la main (repris ci-dessus dans l'historique
Git si besoin) par 7 emplacements, chacun avec UN SEUL type de bonus
et une VALEUR TIRÉE ALÉATOIREMENT dans une plage bornée par la
rareté. Décidé avec l'utilisateur : les 51 objets fixes disparaissent
entièrement (pourront revenir plus tard comme objets uniques, ex.
butin garanti de donjon — voir data/dungeon.js, ça existe déjà pour
les récompenses de palier).

EQUIPMENT_SLOTS : ordre canonique des 7 emplacements.
EQUIPMENT_SLOT_LABELS / _EMOJI : affichage (nom FR, emoji de repli).
EQUIPMENT_SLOT_CONFIG[slot] :
  - stat      : LA seule stat que ce type peut donner (voir
                StatsSystem.recalcStats en systems/stats-system.js
                pour la liste complète des stats reconnues)
  - decimals  : 0 pour une valeur entière (dégâts, DPS, %crit),
                2 pour une fraction (défense/dégâts%/or%/mult. crit)
  - icons     : types d'icônes possibles (images/Icons/equipment_icon/
                {icon}_{rareté}.png ou .jpg selon le type, voir
                getEquipmentIconPath en systems/equipment-system.js),
                tirés au hasard pour la variété visuelle.
                v3.8 : simplification temporaire — une seule
                illustration par type (rareté forcée à "common"), le
                temps que Bottes reçoive son visuel.
                v3.9 : icônes de Bottes fournies (5 raretés).
                v3.11 : revert du forçage "common" — CHAQUE emplacement
                affiche à nouveau une image différente selon sa vraie
                rareté (tous ont désormais un set complet de 5 sur le
                disque). L'arme (weapon) reste en plus le SEUL
                emplacement avec plusieurs flavors possibles
                (bow/sword/axe/staff, voir getEquipmentIconPath) —
                chaque clé de flavor correspond au bon visuel sur le
                disque : axe -> hache, sword -> épée, staff -> bâton,
                bow -> arc (vérifié). Les autres flavors retirés du
                tirage (robe/shield/crown) restent sur le disque, non
                supprimés, juste plus tirés.
  - names     : noms possibles, tirés au hasard (flavor uniquement,
                la rareté est déjà indiquée par la couleur/bordure)
  - ranges    : { rareté: [min, max] } — voir LootSystem.generateEquipmentItem
                en systems/loot-system.js pour le tirage réel
============================================================ */

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
    decimals: 0,
    // v3.9 : réactivé à la demande de Seb — l'arme est le SEUL
    // emplacement avec plusieurs illustrations (les autres n'en ont
    // qu'une, voir armor/helmet/gloves/boots/ring/amulet plus bas).
    // Chaque clé DOIT correspondre au bon visuel sur le disque
    // (images/Icons/equipment_icon/{clé}_{rareté}.png) — vérifié :
    // axe -> hache, sword -> épée, staff -> bâton, bow -> arc.
    icons: ["bow", "sword", "axe", "staff"],
    names: ["Épée", "Hache", "Bâton", "Arc", "Dague", "Lame"],
    // v3.16 : correctif d'un bug réel — nom et icône étaient tirés
    // INDÉPENDAMMENT (deux randInt() séparés dans generateEquipmentItem,
    // systems/loot-system.js), un objet pouvait donc s'appeler "Bâton"
    // et afficher l'icône d'un arc. namesByIcon force maintenant un nom
    // cohérent AVEC l'icône réellement tirée — voir loot-system.js, qui
    // utilise ce champ en priorité pour les emplacements qui le
    // définissent (repli sur `names` ci-dessus si absent, comme pour
    // tous les autres emplacements à icône unique).
    namesByIcon: {
      bow: ["Arc"],
      sword: ["Épée", "Lame", "Dague"],
      axe: ["Hache"],
      staff: ["Bâton"]
    },
    ranges: {
      common: [10, 25],
      green: [26, 35],
      rare: [40, 60],
      epic: [75, 110],
      legendary: [140, 200]
    }
  },
  armor: {
    stat: "defense",
    decimals: 2,
    icons: ["armor"], // v3.8 : une seule illustration par type (robe/shield retirés du tirage, voir note plus haut dans le fichier)
    names: ["Armure", "Cuirasse", "Plastron"],
    ranges: {
      common: [0.01, 0.03],
      green: [0.03, 0.05],
      rare: [0.05, 0.08],
      epic: [0.08, 0.12],
      legendary: [0.12, 0.18]
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
    decimals: 0,
    icons: ["bottes"], // v3.9 : visuel fourni par Seb (5 raretés), plus aucun emplacement sans illustration
    names: ["Bottes"],
    ranges: {
      common: [2, 5],
      green: [5, 9],
      rare: [9, 15],
      epic: [15, 28],
      legendary: [28, 50]
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
    icons: ["amulet"], // v3.8 : une seule illustration par type (crown retiré du tirage)
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

window.EQUIPMENT_SLOTS = EQUIPMENT_SLOTS;
window.EQUIPMENT_SLOT_LABELS = EQUIPMENT_SLOT_LABELS;
window.EQUIPMENT_SLOT_EMOJI = EQUIPMENT_SLOT_EMOJI;
window.EQUIPMENT_SLOT_CONFIG = EQUIPMENT_SLOT_CONFIG;