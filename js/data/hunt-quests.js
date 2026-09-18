"use strict";
/* data/hunt-quests.js — v3.135.0 : desc bois/fer/pierre réécrites (plus « réservé aux futures constructions », audit Forêt §3.5).
   Chasses "de boucle" (lots de kills relancés automatiquement) + catalogue ressources Entrepôt.
   v3.114.0 : sellPrice des ressources BRUTES abaissés (viande 3→2, blé/bois/pierre 2→1, fer 5→3) —
   la vente de production idle doit rester moins rentable que le jeu actif (décision Seb) ;
   les prix des ressources CRAFTÉES sont inchangés (la transformation reste valorisante).
   Logique : systems/hunt-quest-system.js. Détail complet : COMMENTAIRES_ORIGINAUX.md */

/* v3.218.0 (lot V-7) : chaque niveau de l'« Entrepôt agrandi » ajoute ceci au
   plafond de CHAQUE ressource fabriquée. 999 → 3 499 au niveau 10. */
var WAREHOUSE_CAP_PER_LEVEL = 250;

var WAREHOUSE_RESOURCES = {
  viande: { id: "viande", name: "Viande", icon: "images/Icons/resources/meat_icon.png", desc: "Butin de chasse, obtenu en Forêt ou au bâtiment Chasse.", sellPrice: 2, tier: "raw" },
  viande_sechee: { id: "viande_sechee", name: "Viande séchée", icon: "images/Icons/resources/meat_icon.png", desc: "Séchée au Séchoir (atelier de Chasse) à partir de Viande.", sellPrice: 8, tier: "crafted", cap: 999 },
  ble: { id: "ble", name: "Blé", icon: "images/Icons/resources/wheat_icon.png", desc: "Récolté au bâtiment Champs.", sellPrice: 1, tier: "raw" },
  bois: { id: "bois", name: "Bois", icon: "images/Icons/resources/wood_icon.png", desc: "Coupé à la Scierie. Sert aux zones de production, aux planches et aux fondations du village.", sellPrice: 1, tier: "raw" },
  fer: { id: "fer", name: "Fer", icon: "images/Icons/resources/iron_icon.png", desc: "Extrait à la Mine. Sert aux zones de production et aux lingots de la Fonderie.", sellPrice: 3, tier: "raw" },
  pierre: { id: "pierre", name: "Pierre", icon: "images/Icons/resources/stone_icon.png", desc: "Extraite à la Carrière. Sert aux zones de production, aux sillons irrigués et aux fondations du village.", sellPrice: 1, tier: "raw" },
  eau: { id: "eau", name: "Eau", icon: "images/Icons/resources/water_icon.png", desc: "Puisée au Puits — ressource la moins chère du village.", sellPrice: 1, tier: "raw" },
  /* v3.215.0 (lot V-4) : intrant unique de l'Apothicaire. Purifiée au Puits,
     elle donne enfin un débouché à un bâtiment de production qui n'en avait
     qu'un très faible (l'eau brute ne servait qu'au pain et aux petites
     rations). Invendable : c'est un intrant, pas un revenu. */
  eau_purifiee: { id: "eau_purifiee", name: "Eau purifiée", icon: "images/Icons/resources/water_icon.png", desc: "Eau filtrée à la Station de purification (atelier du Puits). Base de toutes les préparations de l'Apothicaire.", sellPrice: 0, tier: "crafted", cap: 999, sourceHint: "Se filtre à la Station de purification (Puits)" },
  planche: { id: "planche", name: "Planche", icon: "images/Icons/resources/plank_icon.png", desc: "Fabriquée à partir de Bois.", sellPrice: 7, tier: "crafted", cap: 999 },
  lingot: { id: "lingot", name: "Lingot", icon: "images/Icons/resources/ingot_icon.png", desc: "Fabriqué à partir de Fer.", sellPrice: 10, tier: "crafted", cap: 999 },
  /* v3.221.0 (lot V-8) : matériau de reforge. Troisième atelier de tier 2
     activé (Forge de la Mine), et premier débouché du Lingot en dehors de la
     construction. Invendable : c'est un intrant. */
  acier: { id: "acier", name: "Acier", icon: "images/Icons/resources/acier_icon.png", desc: "Lingot retravaillé à la Forge de la Mine. Sert à reforger l'équipement.", sellPrice: 0, tier: "crafted", cap: 999, sourceHint: "Se forge à la Forge (Mine), à partir de Lingot" },
  farine: { id: "farine", name: "Farine", icon: "images/Icons/resources/flour_icon.png", desc: "Moulue à partir de Blé.", sellPrice: 7, tier: "crafted", cap: 999 },
  // v3.137.0 : desc corrigée — la Boulangerie (Champs), pas l'Atelier de Construction, cuit le Pain.
  pain: { id: "pain", name: "Pain", icon: "images/Icons/resources/bread_icon.png", desc: "Cuit à la Boulangerie (Champs) à partir d'Eau et de Farine.", sellPrice: 19, tier: "crafted", cap: 999 },
  ration: { id: "ration", name: "Ration moyenne", icon: "images/Icons/resources/ration_icon.png", desc: "Repas au Campement : restaure 60 % des PV max. Crafté à la Cuisine de camp à partir de Viande séchée et de Pain.", sellPrice: 36, tier: "crafted", cap: 999, healPct: 0.60 },
  petite_ration: { id: "petite_ration", name: "Petite ration", icon: "images/Icons/resources/petite_ration_icon.png", desc: "Repas au Campement : restaure 35 % des PV max. Crafté à la Cuisine de camp à partir de Viande et d'Eau.", sellPrice: 18, tier: "crafted", cap: 999, healPct: 0.35 },
  // v3.137.0 : recette de craft ajoutée (Cuisine de camp : Ration moyenne + 3 Sève d'Aeswyn) — desc mise à jour.
  /* v3.303.0 (W-2, Désert D3) : l'Outre pleine, fabriquée au Réservoir du Puits. Emportée dans
     la préparation d'un parcours du Désert, elle rend du Souffle une fois. Jamais obligatoire.
     v3.304.0 : icône propre (générique en jeu tant qu'elle n'est pas dessinée), plus celle de la gourde. */
  outre_pleine: { id: "outre_pleine", name: "Outre pleine", icon: "images/Icons/resources/outre_pleine_icon.png", desc: "Se remplit au Réservoir (Puits). Emportée dans un parcours du Désert, elle rend du Souffle une fois.", sellPrice: 20, tier: "crafted", cap: 99 },
  grande_ration: { id: "grande_ration", name: "Grande ration", icon: "images/Icons/resources/grande_ration_icon.png", desc: "Repas au Campement : restaure 100 % des PV max. Cuisine de camp (Chasse) : 1 Ration moyenne + 3 Sève d'Aeswyn → 1.", sellPrice: 60, tier: "crafted", cap: 999, healPct: 1.00 },
  // v3.127.0 (Petites Aventures, Lot PA3) : butin exclusif du scene-engine petite_aventure_foret
  // (voir data/scene-templates.js, exclusiveLoot) — nom + icône validés Seb 03/09/2026.
  // Ressource de collection (tier "special", distinct de raw/crafted) : pas de sellPrice
  // significatif (0, on ne veut pas encourager à la vendre), pas de cap (comme les ressources
  // brutes non plafonnées). v3.137.0 : premier usage de craft (Grande ration) — desc mise à jour.
  // D'autres usages plus marquants (gemmes, enchantement, upgrade d'arme) restent envisagés
  // pour plus tard (décision Seb 04/09/2026, non actée).
  seve_aeswyn: { id: "seve_aeswyn", name: "Sève d'Aeswyn", icon: "images/Icons/resources/seve_aeswyn_icon.png", desc: "Résine runique rare, trouvée en Petite Aventure. Sert à cuisiner la Grande ration et, durcie à la Menuiserie, à bâtir les hauts paliers du village.", sellPrice: 0, tier: "special" },
  /* v3.304.0 (W-2) : la ressource rare du Désert, butin exclusif de sa Petite Aventure (mêmes
     points de tirage que la Sève). Ses dépenses viendront avec le Tailleur de pierre (W-6). */
  verre_des_dunes: { id: "verre_des_dunes", name: "Verre des dunes", icon: "images/Icons/resources/verre_des_dunes_icon.png", desc: "Sable fondu par la foudre, lisse comme de l'eau. Trouvé en Petite Aventure du Désert.", sellPrice: 0, tier: "special" },
  /* v3.214.0 (lot V-3) : matériau de construction de la Forêt. Premier des six
     matériaux de monde — c'est lui qui porte le plafond de construction, à la
     place d'un verrou abstrait : un palier qui le demande est de fait
     injoignable avant d'avoir atteint son monde, et le joueur lit une ligne de
     coût avec l'endroit où la trouver. Invendable : ce n'est pas un revenu. */
  resine_durcie: { id: "resine_durcie", name: "Résine durcie", icon: "images/Icons/resources/resine_durcie_icon.png", desc: "Sève d'Aeswyn durcie à la Menuiserie. Matériau de construction des hauts paliers du village, en Forêt enchantée.", sellPrice: 0, tier: "crafted", cap: 999, worldIndex: 0, worldName: "Forêt enchantée", sourceHint: "Sève d'Aeswyn durcie à la Menuiserie (Scierie)" }
};

var HUNT_QUESTS = {
  hq_forest_boar: {
    id: "hq_forest_boar",
    type: "resource",
    section: "resource",
    difficulty: "easy",
    progressionStage: "world_start",
    category: "side",
    worldId: "forest",
    adventureIndex: 0,
    name: "Chasse en Forêt",
    story: "Le gibier ne manque pas à la Lisière, et ce qu'il traîne avec lui non plus. Une bête abattue sur cinq ne laisse rien ; les autres rapportent viande, blé, bois, fer, pierre ou eau pour l'Entrepôt. Une chasse peut se répéter indéfiniment.",
    icon: "images/Icons/quests/ration_reward.png",
    enemyFilter: ["wolf"], // v3.108.0 : le gibier, c'est le Loup (sorti du pool libre en 3.107.4) — plus de viande de slime
    resourceKey: "viande",
    /* v3.260.0 (décision Seb) : 80 % de butin par kill, la ressource tirée à parts égales parmi
       les six ressources de base (13,3 % chacune). resourceKey reste le repli d'une save/d'un
       code qui ne lit pas resourcePool. Viande : ~1,3 par lot de 10 (5 avant). */
    resourcePool: ["viande", "ble", "bois", "fer", "pierre", "eau"],

    /* v3.284.0 — LA CHASSE S'OUVRE AUX GROUPES. Les loups chassent en meute : le gibier
       vient par deux. Trois chiffres bougent ensemble, et ils se tiennent l'un l'autre —
       changer l'un sans les autres casse l'économie de la chasse.

       Mesuré (sim/quest-cost-bench.js, héros nu, sans compagnon : cette chasse se joue
       bien avant que Wenna rejoigne), PV perdus par cran d'objectif :
         un par un       Chevalier 160 · Rôdeur 159 · Mage 132
         meutes de 2      Chevalier  99 · Rôdeur 106 · Mage  85

       - lotSize 10 -> 16 : sans ça, un lot coûterait 40 % moins cher qu'avant, puisque
         chaque combat rapporte deux crans. À 16, le lot revient au coût d'avant.
       - dropChancePct 80 -> 50 : à 16 kills au lieu de 10, le butin par lot aurait
         augmenté de 60 % pour le même coût. 16 × 50 % ≈ 8 ressources, contre 10 × 80 %
         ≈ 8 avant : le rendement par lot est conservé.

       Ce qui reste gagné, et qui est la récompense assumée du risque : la vitesse. Un lot
       demande environ 1,4 fois moins de rounds. Une meute frappe deux fois par round —
       plus dangereuse à armure égale, surtout pour les classes fragiles. */
    group: ["wolf", "wolf"],
    groupHpMult: 0.40,
    groupGoldMult: 0.40,
    dropChancePct: 50,
    lotSize: 16
  },

  /* v3.236.0 — « Ce que les bêtes ont bu » : chasse à la Sève d'Aeswyn.

     POURQUOI. Le banc sim/seve-bench.js a montré que le problème de la Sève
     n'est pas le volume mais l'INSENSIBILITÉ À L'EFFORT : la Petite Aventure est
     capée à 3 runs par jour civil, et le Donjon est freiné par un prix de ticket
     en 1,2^n. Résultat mesuré, passer de 0,5 h à 3 h de jeu par jour ne divisait
     le délai « Village + Forge » que par 1,4. Une chasse est la seule source
     strictement PROPORTIONNELLE au temps passé : elle rend l'investissement
     lisible. Avec elle, le même écart divise par 2,1, et ça continue au-delà.

     POURQUOI LE CŒUR (adventureIndex 1). Le moteur de chasse est protégé et ne
     lit aucun multiplicateur de difficulté : le seul verrou disponible est
     l'aventure de rattachement. Le Cœur sert donc de seuil — la chasse n'est pas
     accessible dès la Lisière, elle arrive quand le joueur encaisse. Mesuré sur
     le vrai générateur : 101 PV en Lisière contre 132 au Cœur, soit 77 % de
     kills par heure.

     POURQUOI 3 %. C'est ce qui compense exactement la perte de cadence du Cœur :
     9,2 Sève par heure, un peu mieux que 2 % en Lisière. Attention, le taux est
     le SEUL levier d'économie ici — la taille du lot n'y change rien, le drop
     étant par kill.

     POURQUOI UN LOT DE 30. Le butin de ressource passe par SortieManager : il
     est banqué à la fin du lot, perdu à la mort, à moitié sur un arrêt manuel.
     Le lot ne règle donc pas le rendement, il règle la MISE. 30 kills font
     ~6 min au rythme du Cœur : assez pour que mourir coûte, pas assez pour punir.

     Aucun enemyFilter : au Cœur, toute bête porte la marque. C'est aussi ce que
     dit le titre. */
  hq_forest_seve: {
    id: "hq_forest_seve",
    type: "resource",
    section: "resource",
    difficulty: "medium",
    progressionStage: "world_end",
    category: "side",
    worldId: "forest",
    adventureIndex: 1, // Cœur de la forêt — verrou de difficulté ET d'accès
    name: "Ce que les bêtes ont bu",
    story: "Les bêtes du Cœur ne saignent pas comme les autres. Sous l'écorce de leur peau, "
      + "quelque chose de clair affleure et durcit à l'air. La Forêt leur a donné quelque chose ; "
      + "rien n'empêche de le reprendre.",
    icon: "images/Icons/codex/world_forest.png",
    resourceKey: "seve_aeswyn",
    dropChancePct: 3,
    lotSize: 30
  },

  /* v3.207.0 — Battue : farm d'OR pur, répétable à volonté (décision Seb).
     Réutilise le moteur des chasses (lots relancés indéfiniment) plutôt que
     d'ouvrir un système de plus. Deux différences avec une chasse :
       - pas de resourceKey ni de dropChancePct : aucune ressource ne tombe
       - rewardGold : une prime versée à la fin du lot, pas à chaque kill
     Aucun enemyFilter : n'importe quel monstre de la zone compte, c'est le
     principe d'une battue.
     v3.264.0 (décision Seb) : ouverte avec le Village (onglet village, « La meute
     affamée ») au lieu du lancement du jeu — gating dans MissionBoard._huntMissions.
     Butin (matériaux, ingrédients) volontairement laissé de côté pour l'instant. */
  hq_forest_battue: {
    id: "hq_forest_battue",
    type: "gold",
    section: "resource",
    difficulty: "easy",
    progressionStage: "world_start",
    category: "side",
    worldId: "forest",
    adventureIndex: 0,
    name: "Battue en Forêt",
    story: "Aldric paie à la tête. Vingt bêtes, et la bourse s'ouvre — il ne demande ni laquelle, "
      + "ni pourquoi. La Forêt en a toujours vingt de plus.",
    icon: "images/Icons/gold_icon.png",
    lotSize: 20,
    // 120 or = exactement le double de ce que rapportent déjà 20 kills en Lisière
    // (120 or bruts, ~3 min). Repères : amélioration de Force 45-122 or au niveau
    // 8-15, potion mineure 150. Une source d'or INFINIE ne doit pas dépasser le
    // rythme des quêtes uniques (élite : 700-1200 or).
    rewardGold: 120
  }
};

// v3.106.0 : ordre d'affichage des rations au Campement (petite -> grande).
var RATION_IDS = ["petite_ration", "ration", "grande_ration"];

window.WAREHOUSE_RESOURCES = WAREHOUSE_RESOURCES;
window.WAREHOUSE_CAP_PER_LEVEL = WAREHOUSE_CAP_PER_LEVEL;
window.HUNT_QUESTS = HUNT_QUESTS;
window.RATION_IDS = RATION_IDS;
