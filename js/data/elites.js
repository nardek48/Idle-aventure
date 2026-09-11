"use strict";
/* data/elites.js — créatures ÉLITE : variantes NOMMÉES d'un ennemi de base.
   Logique : systems/elite-system.js. Quêtes : data/adventure-quests.js (type "elite").

   FORME (décisions Seb, 10/09/2026) :
     baseId      ennemi de ENEMY_DB dont l'élite hérite stats, image et asset
     statMult    surcharges RELATIVES, jamais de valeurs absolues — c'est ce qui
                 permettra au Donjon d'échelonner la même élite sur ses paliers
                 sans la redéfinir (refonte Donjon prévue, non planifiée)
     archetype   identité mécanique (enraged / armored / vampiric / corrupted).
                 shielded et silenced sont exclus : une élite est isBoss, et le
                 moteur réserve leur branche de télégraphe aux ennemis normaux
     phases      RÉSERVÉ, non lu par le code. Prévu dès maintenant pour les
                 élites à plusieurs phases (idée Seb), afin que le jour venu
                 EliteManager absorbe le besoin sans rouvrir de fichier protégé
     repeatable  RÉSERVÉ, inerte. Mode « défi » à récompense réduite, plus tard

   CALIBRAGE (sim/forest-bench.js, sortie complète 6 kills + élite, entr.+8,
   300 runs par cellule, potions comprises) :
     Fileuse aux yeux blancs  20 % d'échec moyen (C 7 / R 25 / M 28)  — cible 20 %
     Ronce qui se souvient    35 % d'échec moyen (C 30 / R 40 / M 34)  — cible 40 %

   Recalibrées en v3.206.0 après le passage de l'approche à 2 rounds, qui a
   allégé les deux classes à distance. La Ronce s'arrête à 35 % et non 40 % :
   sa puissance passe de 28 à 29 par simple arrondi au multiplicateur suivant,
   et l'échec saute alors à 56 %. Il n'existe pas de palier intermédiaire.

   Bases choisies pour leur FAIBLE endurance : les combats restent courts pour
   les trois classes, ce qui resserre l'écart entre elles. Sur une base tanky
   (troll, loup), le Chevalier — qui met 10,9 rounds à tuer contre 6,7 au Mage —
   encaissait jusqu'à 88 points d'échec de plus que le Mage.

   NARRATIF (bible A, pilier 3 + bible C §4.4) : dans la Forêt, une élite est
   une bête MARQUÉE par le passage de celui qui est venu avant. Le mot
   « Veilleur » n'apparaît jamais, l'incendie n'a pas d'auteur, la Forêt
   suggère. Les textes ci-dessous s'y tiennent. */

var ELITE_DB = {
  araignee_marquee: {
    id: "araignee_marquee",
    baseId: "spider",
    name: "Fileuse aux yeux blancs",
    archetype: "enraged",
    statMult: { endurance: 4.8, power: 1.55, celerity: 1.0 },
    // Ligne de bestiaire — ce que la Forêt laisse entendre, sans jamais nommer.
    lore: "Ses yeux ont blanchi. Elle tisse toujours, mais plus rien ne se prend dans sa toile : "
      + "on dirait qu'elle attend autre chose. Quelqu'un est passé par ici avant toi.",
    questIcon: "./images/Icons/quest_icons/elite/elite1.png",
    phases: null,
    repeatable: false
  },

  ronce_ardente: {
    id: "ronce_ardente",
    baseId: "bramble",
    name: "Ronce qui se souvient",
    archetype: "enraged",
    statMult: { endurance: 2.4, power: 1.11, celerity: 1.0 },
    lore: "Elle a poussé sur de la cendre, et la cendre ne l'a pas quittée. Quand on la coupe, "
      + "elle chauffe au lieu de saigner.",
    questIcon: "./images/Icons/quest_icons/elite/elite4.png",
    phases: null,
    repeatable: false
  }
};

/* v3.209.0 (demande Seb) — les deux élites donnaient chacune une ARME, donc la
   seconde récompense était mécaniquement redondante avec la première. La Fileuse
   garde l'arme, la Ronce donne désormais une ARMURE : on gagne d'abord en attaque
   à la Lisière, puis en survie au Cœur, où le combat est plus long.

   ARME — déclinée PAR CLASSE : generateEquipmentItem() restreint l'icône d'arme à
   la classe du héros (un Rôdeur ne trouve pas de bâton) et
   unequipIncompatibleWeapon() déséquipe ce qui ne l'est plus. Une arme unique à
   icône fixe serait donc inutilisable par deux classes sur trois.
   Valeur 26 : juste au-dessus du plafond commun (25), donc un gain GARANTI quelle
   que soit l'arme portée, et dans le premier tiers de l'Inhabituel (23-32) pour ne
   pas déplacer la courbe de puissance.

   ARMURE — aucune déclinaison : EQUIPMENT_SLOT_CONFIG.armor n'a qu'une icône et
   aucune restriction de classe, les trois classes portent la même.
   Valeur 0.04 : la défense s'affiche arrondie au pour-cent (Math.round(v*100)),
   et les ranges d'armure sont arrondies à 2 décimales — une commune plafonne donc
   à 3 %, une inhabituelle couvre 3 à 5 %. 0.04 (= 4 %) est la transposition exacte
   du raisonnement de l'arme : strictement au-dessus de toute commune, dans la
   moitié basse de l'Inhabituel. */
var ELITE_UNIQUE_LOOT = {
  araignee_marquee: {
    slot: "weapon",
    stat: "tapDmg",
    rarity: "green",
    value: 26,
    /* v3.225.0 (O3) : affixe FIXE, pas tiré — la récompense reste déterministe. Haut de la fourchette Inhabituelle. */
    affixes: [{ stat: "critChance", value: 2, tier: "P" }],
    byClass: {
      knight: { name: "Fil-de-lame", icon: "sword" },
      archer: { name: "Arc à corde blanche", icon: "bow" },
      mage: { name: "Bâton aux fils blancs", icon: "staff" }
    }
  },

  ronce_ardente: {
    slot: "armor",
    stat: "defense",
    rarity: "green",
    value: 0.04,
    affixes: [{ stat: "maxHpPct", value: 0.05, tier: "P" }], // v3.225.0 (O3) : fixe, cf. arme
    item: { name: "Plastron d'écorce brûlée", icon: "armor" }
  }
};

/* Libellé de la ligne de butin, par emplacement — repris tel quel dans le popup de
   fin de quête et dans le résumé du tableau de missions. */
var ELITE_UNIQUE_LOOT_LABELS = {
  weapon: "Arme unique",
  armor: "Armure unique"
};

window.ELITE_UNIQUE_LOOT = ELITE_UNIQUE_LOOT;
window.ELITE_UNIQUE_LOOT_LABELS = ELITE_UNIQUE_LOOT_LABELS;

window.ELITE_DB = ELITE_DB;
