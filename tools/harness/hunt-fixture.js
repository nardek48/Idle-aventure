"use strict";
/* tools/harness/hunt-fixture.js — v3.511.0 : les chasses sont retirées du jeu (HUNT_QUESTS = {}),
   mais le moteur reste. Le harnais le teste avec les 4 anciennes chasses, copiées ici. */
module.exports = {
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
    icon: "images/Icons/quests/ration_reward.webp",
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
    icon: "images/Icons/codex/world_forest.webp",
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
    icon: "images/Icons/gold_icon.webp",
    lotSize: 20,
    // 120 or = exactement le double de ce que rapportent déjà 20 kills en Lisière
    // (120 or bruts, ~3 min). Repères : amélioration de Force 45-122 or au niveau
    // 8-15, potion mineure 150. Une source d'or INFINIE ne doit pas dépasser le
    // rythme des quêtes uniques (élite : 700-1200 or).
    rewardGold: 120
  },

  /* v3.356.0 (D2, décision Seb 26/09/2026) — Battue du Désert. Le Désert n'avait aucune source
     d'or répétable : le joueur y farmait la Battue de la Forêt à 120 or le lot (~166 or/h) face
     aux prix du Désert (Inhabituel à 4 000 or). Même moteur, bêtes des Dunes brûlantes, prime
     fixée par Seb. Ouverte à l'arrivée au Désert (desertCrossingCompleted, étape desert_01). */
  hq_desert_battue: {
    id: "hq_desert_battue",
    type: "gold",
    section: "resource",
    difficulty: "medium",
    progressionStage: "world_start",
    category: "side",
    worldId: "desert",
    adventureIndex: 0,
    name: "Battue du Désert",
    story: "Le Veilleur ne paie pas, lui. Mais les caravanes qui passent encore la frange, si. "
      + "Vingt bêtes éloignées de la piste, et la bourse s'ouvre.",
    icon: "images/Icons/gold_icon.webp",
    lotSize: 20,
    rewardGold: 450
  }
};
