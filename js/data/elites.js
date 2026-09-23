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
    /* v3.286.0 — ESCORTE. La Fileuse ne garde pas ses toiles seule : une araignée de sa
       couvée l'accompagne. Une étape d'élite demande « vaincre la Fileuse », pas « en tuer
       N » : l'escorte durcit la rencontre sans jamais rendre l'objectif moins cher — c'est
       pour ça qu'une élite est le bon endroit pour un groupe, là où un compteur de kills
       oblige à relever la cible (voir La Meute, la Chasse).

       UNE seule araignée, et une élite abaissée. Mesuré, profil de fin de Forêt :
         la Fileuse seule                    Chev. 87 % PV / 23 % morts · Rôd. 90/38 · Mage 91/44
         + 1 araignée, élite inchangée       Chev. 97 / 83        · Rôd. 99/97 · Mage 99/94
         + 1 araignée, élite p1,35 e4,1      Chev. 82 / 24        · Rôd. 90/53 · Mage 91/53
       Le multiplicateur de PV de l'escorte ne change presque rien : ce sont les frappes en
       plus qui tuent. C'est donc l'élite qu'on abaisse, pas l'escorte qu'on affaiblit. */
    escort: {
      members: ["spider"],
      hpMult: 0.25,
      goldMult: 0.25,
      eliteStatMult: { power: 1.35, endurance: 4.1 }   // au lieu de 1,55 / 4,8 en duel
    },
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
  },

  /* v3.258.0 (Cartes Vivantes, C-5) : l'Arbre-mère, élite répétable du secteur 7 de la
     Forêt (data/living-maps.js). Base Troll des forêts (lent, endurant, archétype shielded
     fixe) — décision Seb 16/09/2026. Aucun butin unique : la récompense est la Sève par
     victoire, freinée par la journée (LIVING_MAP_RULES.motherTree). Pas de quête d'aventure :
     elle ne se joue que depuis la carte. */
  /* v3.314.0 (W-4a1, acte III §4) — LE SERMENT SOUS L'ARMURE, élite de la tour de guet.
     Base : sandwarrior, le Guerrier des sables (resists épée et arc, faible en magie,
     Blindé au monde 1). L'archétype reste "armored" : l'élite est le même garde, en plus
     entêté — elle ne change pas de nature, elle tient plus longtemps et frappe plus fort.

     « Serment sous l'armure » est un TYPE, pas un individu (acte III §2) : celui de la tour
     en est un, la Cité engloutie en est pleine (vague élite 5, lot W-4a2). Rien dans la
     donnée ne l'attache au secteur, ce qui permettra au donjon de réutiliser la même entrée.

     Pas d'entrée dans ELITE_UNIQUE_LOOT : le butin unique appartient à la QUÊTE d'une élite
     (elite-system.js), pas au combat de carte. Ici, la récompense d'équipement est le heaume
     du guet, et elle dépend du CHOIX de l'étape 11, pas de la victoire (voir heaume_guet).

     Chiffres : provisoires, à trancher au banc (sim/desert-elite-bench.js --sweep). */
  serment_armure: {
    id: "serment_armure",
    baseId: "sandwarrior",
    name: "Le Serment sous l'armure",
    archetype: "armored",
    /* Calibré au banc (sim/desert-elite-bench.js --sweep, 40 runs/cellule, profil de fin
       d'acte II) : puissance 2,6 / endurance 1,6 -> 100 % de réussite, 49 / 53 / 58 % de PV
       à l'arrivée (Chev. / Rôd. / Mage), 1,1 potion bue par le Chevalier. Le contenu de
       l'acte II laissait ~70 % de PV et aucune potion : c'est le cran demandé par Seb.
       Mesuré aussi : la PUISSANCE porte la difficulté, l'ENDURANCE n'allonge que le combat.
       Même leçon qu'au Basilic.
       v3.318.0 : chiffres RECONTRÔLÉS après correction du banc (il mesurait parfois un héros
       seul, EliteManager.spawn ne rebâtissant pas le groupe sans escorte). Les valeurs
       tiennent : 50 / 52 / 60 % de PV, 0,6 potion pour le Chevalier. La « non-monotonie »
       signalée en v3.317.0 venait du banc, pas du jeu. */
    statMult: { endurance: 1.6, power: 2.6, celerity: 1.0 },
    lore: "L'armure est vide. Ce qui la tient debout n'est pas un homme : c'est une phrase, "
      + "dite il y a longtemps à quelqu'un qui n'est jamais revenu l'en délier.",
    // Icône propre, pas encore générée : jamais d'emprunt à une autre image (règle Seb 18/09/2026).
    questIcon: "./images/Icons/quest_icons/elite/elite_serment.png",
    phases: null,
    repeatable: false
  },

  /* v3.317.0 (W-4c, acte III §7) — LE DARD DES PROFONDEURS, élite RÉPÉTABLE de la bête sous
     la dune, et vague élite 10 de la Cité engloutie : la dune est son terrier, la cité son
     terrain de chasse. On ne la tue pas, on la renvoie en bas.
     Base : sandworm, le Ver des sables (résiste à l'épée, faible à l'arc, très endurant).
     Premier contenu calé SUR LE PALIER de l'étape 13. Chiffres au banc (--profil palier).
     winResource : lu par LivingMapManager à chaque victoire, en plus de la Sève du secteur. */
  dard_profondeurs: {
    id: "dard_profondeurs",
    baseId: "sandworm",
    name: "Le Dard des profondeurs",
    archetype: "enraged",
    /* Calibré au banc (--elite dard_profondeurs --profil palier, 40 runs/cellule) :
       100 % de réussite, 49 / 60 / 64 % de PV à l'arrivée (Chev. / Rôd. / Mage), 1 potion
       pour le Chevalier — que le Ver des sables désavantage (il résiste à l'épée).
       Endurance laissée à 1,0 : la base a déjà 81 d'endurance, la monter n'allongerait que
       le combat.
       v3.318.0 : recontrôlé au banc corrigé — 51 / 58 / 64 % de PV, 0,8 potion pour le
       Chevalier. La non-monotonie signalée en v3.317.0 venait du banc. */
    statMult: { endurance: 1.0, power: 2.8, celerity: 1.0 },
    lore: "La dune bouge avant lui. Quand le dard sort, l'eau des mares a déjà baissé : "
      + "il boit d'abord, il frappe ensuite.",
    // Icône propre, pas encore générée : jamais d'emprunt (règle Seb 18/09/2026).
    questIcon: "./images/Icons/quest_icons/elite/elite_dard.png",
    winResource: { id: "chitine_profondeurs", amount: 1 },
    phases: null,
    repeatable: true
  },

  arbre_mere: {
    id: "arbre_mere",
    baseId: "foresttroll",
    name: "L'Arbre-mère",
    archetype: "shielded",
    statMult: { endurance: 2.6, power: 1.05, celerity: 0.8 },
    lore: "Ce n'est pas un arbre qui a poussé. C'est quelque chose qui a pris la forme d'un arbre "
      + "pour qu'on cesse de le regarder. Le battement vient de dessous.",
    questIcon: "./images/Icons/quest_icons/elite/elite2.png",
    phases: null,
    repeatable: true
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

  /* v3.314.0 (W-4a1, acte III §4) — LE HEAUME DU GUET. Seule entrée de cette table qui ne
     récompense PAS une victoire : elle récompense le CHOIX de relever le Serment de son
     serment (story-quests.js, desert_11, choice.apply). buildUniqueLoot() ne fait qu'une
     lecture par clé, donc l'étape l'appelle avec "heaume_guet" sans rien changer au système.
     Laisser le Serment à son poste ne donne rien ici : l'effet vit dans la carte (choiceBrakes).

     Valeur 0.24 : l'emplacement casque porte critMult (EQUIPMENT_SLOT_CONFIG.helmet), dont
     la fourchette commune plafonne à 0,20 et l'Inhabituelle va de 0,20 à 0,35. 0,24 est donc
     strictement au-dessus de toute commune, dans la moitié basse de l'Inhabituel — même
     raisonnement que l'arme de la Fileuse et le plastron de la Ronce. Le casque n'a ni
     déclinaison de classe ni restriction d'icône. Ce heaume compte pour le palier de
     l'étape 13 (4 emplacements Inhabituels sur 7, dont l'arme). */
  heaume_guet: {
    slot: "helmet",
    stat: "critMult",
    rarity: "green",
    value: 0.24,
    affixes: [{ stat: "maxHpPct", value: 0.05, tier: "P" }],
    item: { name: "Heaume du guet", icon: "casque" }
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
  armor: "Armure unique",
  helmet: "Casque unique" // v3.314.0 (W-4a1) : heaume du guet, étape 11
};

window.ELITE_UNIQUE_LOOT = ELITE_UNIQUE_LOOT;
window.ELITE_UNIQUE_LOOT_LABELS = ELITE_UNIQUE_LOOT_LABELS;

window.ELITE_DB = ELITE_DB;
