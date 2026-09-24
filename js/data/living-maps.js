"use strict";
/* data/living-maps.js — v3.255.0 (Cartes Vivantes, lot C-1) : une carte par monde.
   Rapport de conception « Cartes Vivantes » v1.0 (13/09/2026), §4, §8, §10.
   Positions et adjacences reprises TELLES QUELLES d'atelier-cartes.html (C-0),
   validées par Seb le 15/09/2026. Positions en % de l'asset recadré
   (foret_atelier.jpg), à recaler sur l'asset bord à bord quand il existera.

   Purement des données, aucune logique : la logique vit dans
   systems/living-map-system.js (LivingMapManager).

   Un secteur porte :
     ring        anneau 1/2/3 — fixe l'intensité (voir LIVING_MAP_RULES.ringIntensity)
     neighbors   secteurs adjacents ; le village est voisin implicite de l'anneau 1
     content     { type: "expedition", templateId, pools } ou
                 { type: "elite", eliteId, then: {expedition} } — l'élite se joue
                 UNE fois (première libération), les reprises jouent `then` ; ou
                 { type: "elite", eliteId, repeatable: true } — se rejoue à volonté (C-5)
     heldEffect  { id, label } — descripteur lu par les systèmes concernés via
                 LivingMapManager.hasEffect(id) (C-3) : corde_plus, gourde_40, autel_normale
                 -> scene-run-system ; puits_plus, scierie_plus -> production-system ;
                 contrats_plus -> tavern-system. null si aucun
     lore        une ligne, au présent, une chose perçue (bible, pilier 6)
   La récompense de première libération se lit sur l'anneau (LIVING_MAP_RULES.firstReward). */

var LIVING_MAP_RULES = {
  /* §6.2 : l'anneau fixe l'intensité — ids de SCENE_INTENSITY. */
  ringIntensity: { 1: "sentier", 2: "chemin", 3: "periple" },
  /* §4.4 : Sève d'Aeswyn à la première libération, jamais aux reprises. À confirmer au banc (sim/map-bench.js). */
  firstReward: { 1: 5, 2: 8, 3: 12 },
  seveResourceId: "seve_aeswyn",
  /* Arbre-mère (C-5) : élite répétable à frein interne. Chaque victoire du jour durcit la
     suivante (+brakePerWin sur PV et dégâts), remise à zéro au jour civil. Sève par victoire,
     XP de mission ordinaire (5, boss). Chiffres fixés au banc sim/arbremere-bench.js
     (16/09/2026) : +50 % = 4 à 4,5 victoires/jour en fin de Forêt, ~9 Sève/jour. */
  /* v3.331.0 (suite du recalage, R2) : base de l'Arbre-mère durcie (data/elites.js), frein
     0,50 -> 0,25. Mesuré (plafond-bench --journee) : fin de Forêt ~4 victoires par jour, ~8 Sève
     (la cible d'origine) ; avant : 7,5 victoires faciles, 15 Sève. */
  repeatableElite: { brakePerWin: 0.25, sevePerWin: 2 },
  /* Effets tenus (C-3), chiffres en un seul endroit. */
  effects: { productionMult: 1.10, contractMult: 1.10, gourdeBreath: 40, ropeBonus: 1,
    outreBreathBonus: 15, // v3.305.0 : puits sec tenu -> l'Outre rend 55 au lieu de 40 (provisoire)
    workshopSpeedMult: 1.10 }, // v3.305.0 : oasis basse / verrerie tenues -> Réservoir / Tailleur de pierre 10 % plus rapides
  /* §5.4 : Palissade (C-3). Frein : chance qu'un échec ne recouvre rien. Tenue : secteur d'un anneau tenu, jamais repris par un échec (v3.335.0 : l'Ascension n'existe plus). */
  palisade: {
    buildingId: "palisade",
    brakePerLevel: 0.07,
    holdRingLevels: { 1: 3, 2: 7, 3: 10 }, // anneau tenu -> niveau requis
    revealLevel: 5                          // révèle le nom des secteurs voilés au front
  }
};
window.LIVING_MAP_RULES = LIVING_MAP_RULES;

var LIVING_MAPS = {
  forest: {
    id: "forest",
    worldId: "forest",                       // WORLDS[0].id
    name: "Forêt enchantée",
    asset: "images/Maps/foret_atelier.jpg",  // provisoire (décision 13), 372 Ko — v3.260.0 : casse du dossier (GitHub Pages distingue maps/Maps)
    village: { x: 51.1, y: 46.7, name: "Aeswyn" },
    sectors: [
      { id: "gue", name: "Pont du gué", x: 30.3, y: 52.2, ring: 1, neighbors: ["menhirs", "arbremere"],
        content: { type: "expedition", templateId: "petite_aventure_foret", pools: { obstacle: ["riviere", "gouffre"] } },
        heldEffect: { id: "corde_plus", label: "La corde tient un usage de plus." },
        lore: "Les planches du pont sont neuves, quelqu'un les a changées cet hiver." },
      { id: "camp", name: "Campement", x: 82.9, y: 44.5, ring: 1, neighbors: ["autel"],
        content: { type: "expedition", templateId: "petite_aventure_foret", pools: { obstacle: ["eboulis", "racines"] } },
        heldEffect: { id: "contrats_plus", label: "Contrats de la Taverne : +10 % d'or." }, // décision Seb 16/09/2026 (la Taverne n'a pas de rumeurs)
        lore: "Des toiles tendues entre deux chênes, un feu qui ne fume presque pas." },
      { id: "etang", name: "Étang aux roseaux", x: 63.2, y: 65.3, ring: 1, neighbors: ["portail", "arbredore"],
        content: { type: "expedition", templateId: "petite_aventure_foret", pools: { obstacle: ["riviere", "racines"] } },
        heldEffect: { id: "puits_plus", label: "Puits +10 %." },
        lore: "L'eau est claire jusqu'au fond. Rien n'y bouge, ce qui n'est pas normal." },
      { id: "menhirs", name: "Cercle des menhirs", x: 16.0, y: 53.3, ring: 2, neighbors: ["gue", "toiles", "arbremere"], labelTop: true,
        content: { type: "expedition", templateId: "petite_aventure_foret", pools: { obstacle: ["porte_scellee", "paroi"] } },
        heldEffect: { id: "autel_normale", label: "L'autel soigne aussi une blessure normale." },
        lore: "Neuf pierres debout. La dixième est couchée et personne ne se souvient l'avoir vue tomber." },
      { id: "arbredore", name: "Arbre doré", x: 37.9, y: 73.0, ring: 2, neighbors: ["etang", "toiles"],
        content: { type: "expedition", templateId: "petite_aventure_foret", pools: { combat: ["araignees_foret"] } },
        heldEffect: { id: "scierie_plus", label: "Scierie +10 %." },
        lore: "Une maison dans les branches, une échelle, une lanterne encore chaude." },
      { id: "autel", name: "Autel de pierre", x: 74.1, y: 23.7, ring: 2, neighbors: ["camp", "arbremere"],
        content: { type: "expedition", templateId: "petite_aventure_foret", pools: { obstacle: ["porte_scellee", "paroi"] } },
        heldEffect: { id: "gourde_40", label: "Gourde : 40 Souffle au lieu de 25." },
        lore: "Des marches trop hautes pour des jambes humaines. En haut, une lueur." },
      // Arbre-mère (C-5) : élite RÉPÉTABLE — se rejoue à volonté une fois libérée, hors cap ; chaque
      // victoire du jour durcit la suivante (LIVING_MAP_RULES.repeatableElite). v3.331.0 : une
      // ration par combat rejoué (vivres de sortie, décision E4 confirmée par Seb).
      { id: "arbremere", name: "Arbre-mère", x: 29.2, y: 12.7, ring: 3, neighbors: ["gue", "menhirs", "autel"],
        content: { type: "elite", eliteId: "arbre_mere", repeatable: true },
        heldEffect: null,
        lore: "On l'entend avant de la voir. Un battement lent, sous l'écorce." },
      // Camp des toiles : l'élite une fois, puis expédition Périple aux reprises (décision Seb, 15/09/2026).
      { id: "toiles", name: "Camp des toiles", x: 10.5, y: 78.5, ring: 3, neighbors: ["menhirs", "arbredore"],
        content: { type: "elite", eliteId: "araignee_marquee",
          then: { type: "expedition", templateId: "petite_aventure_foret", pools: { combat: ["araignees_foret"] } } },
        heldEffect: null,
        lore: "Les fils vont d'un arbre à l'autre à hauteur de gorge." },
      // Portail en ruine : porte narrative du Désert (colporteur). Aucun effet en v1, réservé à la carte du Désert.
      { id: "portail", name: "Portail en ruine", x: 91.7, y: 73.0, ring: 3, neighbors: ["etang"],
        content: { type: "expedition", templateId: "petite_aventure_foret", pools: {} },
        heldEffect: null,
        lore: "Le sable entre les dalles ne vient pas d'ici." }
    ],
    /* Amers en réserve : posés sur la carte, jamais joués. Ni état ni fiche (§2, la carte reste un paysage). */
    landmarks: [
      { id: "temple", name: "Temple", x: 64.2, y: 10.5 },
      { id: "grotte", name: "Grotte", x: 91.7, y: 14.9 }
    ]
  },

  /* ================= v3.305.0 (W-2) — LA CARTE DU DÉSERT =================
     Conception Désert §7 (secteurs, effets, positions relevées sur l'image de Seb) et acte I §6.
     Même moteur que la Forêt ; seuls changent les mots (l'Ensablement), la ressource de
     première libération (Verre des dunes) et quatre secteurs fermés par l'Histoire
     (requiresStoryStep : le secteur n'est ni atteignable ni rejouable avant l'étape).
     La carte elle-même s'ouvre avec l'étape 4 (opensAtStoryStep). */
  desert: {
    id: "desert",
    worldId: "desert",
    name: "Désert oublié",
    asset: "images/Maps/desert.jpg", // image de Seb (18/09/2026), carrée, centre = le camp
    opensAtStoryStep: "desert_04",
    rewardResourceId: "verre_des_dunes",
    /* v3.306.0 (étape 5) : noms laissés -> tant que les stèles sont libérées, elles tiennent le
       sable : +10 % au frein de la Palissade sur CETTE carte (provisoire, à caler au banc). */
    /* v3.314.0 (W-4a1, acte III §4) : le Serment laissé à son poste tient le sable comme les
       stèles laissées au sable. Même grammaire, même bonus — ce qu'on laisse en place freine
       l'Ensablement, et seulement tant que le secteur reste libéré. */
    choiceBrakes: [
      { key: "noms", value: "laisser", sectorId: "steles", bonus: 0.10 },
      { key: "serment", value: "laisser", sectorId: "tour_guet", bonus: 0.10 }
    ],
    words: {
      cover: "l'Ensablement", coverCap: "L'Ensablement", coveredState: "Ensablé",
      home: "le camp", fogLore: "Le sable ne laisse rien voir.",
      openElsewhere: "Le sable attend encore ailleurs",
      homeTitle: "Le camp tient le puits.",
      homeLore: "Le camp du Portail, hors du Cycle. Les secteurs de l'anneau 1 sont toujours à portée.",
      intro: "Touche un secteur pour voir ce qu'on en sait. L'Ensablement ne reprend que ce qu'on lui laisse, quand une expédition échoue.",
      runLoot: "Verre du run seul",
      mapBlurb: "Choisis un secteur sur la carte du Désert : chaque expédition repousse le sable."
    },
    village: { x: 49.4, y: 47, name: "Le camp du Portail" },
    sectors: [
      /* Anneau 1 — ce qu'on voit depuis le camp */
      { id: "puits_sec", name: "Le puits sec", x: 39, y: 30, ring: 1, neighbors: ["verrerie", "oasis"],
        content: { type: "expedition", templateId: "petite_aventure_desert", pools: { obstacle: ["puits_effondre", "dune"] } },
        heldEffect: { id: "outre_plus", label: "L'Outre rend 15 Souffle de plus." },
        lore: "La margelle est chaude au toucher. Au fond, pas d'eau, mais le seau est neuf." },
      { id: "caravane", name: "La caravane renversée", x: 63, y: 29.5, ring: 1, neighbors: ["verrerie", "marche_sel"],
        content: { type: "expedition", templateId: "petite_aventure_desert", pools: { obstacle: ["dalles_ensablees", "sables_mouvants"] } },
        heldEffect: { id: "contrats_plus", label: "Contrats de la Taverne : +10 % d'or." },
        lore: "Les roues en l'air, les sacs éventrés. Personne n'a pris le sel." },
      { id: "steles", name: "Les stèles penchées", x: 40, y: 63, ring: 1, neighbors: ["lit_fleuve", "oasis"],
        content: { type: "expedition", templateId: "petite_aventure_desert", pools: { obstacle: ["dalle_scellee", "vent_de_face"] } },
        heldEffect: { id: "autel_normale", label: "L'autel soigne aussi une blessure normale." },
        // v3.306.0 (étape 5) : noms déterrés -> la stèle est vide, son effet est perdu pour de bon
        effectLostOnChoice: { key: "noms", value: "deterrer" },
        lore: "Elles penchent toutes du même côté, comme si quelque chose était passé entre elles." },
      // Fermé jusqu'à l'étape 10 « La nuée » : son contenu est une nuée (acte I §6)
      { id: "scarabees", name: "Le champ de scarabées", x: 60.5, y: 63.5, ring: 1, neighbors: ["tour_guet"],
        requiresStoryStep: "desert_10",
        content: { type: "expedition", templateId: "petite_aventure_desert", pools: { combat: ["scarabees_desert"] } },
        heldEffect: null,
        lore: "Le sable crépite au soleil. De près, ce n'est pas le sable." },

      /* Anneau 2 — ce qui demande d'y retourner */
      { id: "verrerie", name: "La verrerie ensevelie", x: 49.5, y: 16.5, ring: 2, neighbors: ["puits_sec", "caravane", "bete_dune", "porte_temple"], labelTop: true,
        content: { type: "expedition", templateId: "petite_aventure_desert", pools: { obstacle: ["dalle_scellee", "sables_mouvants"] } },
        heldEffect: { id: "tailleur_plus", label: "Tailleur de pierre +10 %." },
        lore: "Un four à demi enterré. Autour, du verre vert en éclats, lisse comme de l'eau." },
      { id: "oasis", name: "L'oasis basse", x: 19, y: 35, ring: 2, neighbors: ["puits_sec", "steles", "bete_dune"],
        content: { type: "expedition", templateId: "petite_aventure_desert", pools: { obstacle: ["sables_mouvants", "puits_effondre"] } },
        heldEffect: { id: "reservoir_plus", label: "Réservoir +10 %." },
        lore: "Trois palmiers et une mare qui baisse. Les traces autour sont toutes fraîches." },
      { id: "marche_sel", name: "Le marché de sel", x: 83, y: 34, ring: 2, neighbors: ["caravane", "porte_temple"],
        content: { type: "expedition", templateId: "petite_aventure_desert", pools: { obstacle: ["dalles_ensablees", "vent_de_face"] } },
        heldEffect: { id: "puits_plus", label: "Puits +10 %." },
        lore: "Des étals vides sous des toiles déchirées. Les balances sont encore réglées." },
      // Élite une fois (le Serment sous l'armure), puis expédition. Ouvre avec son étape (W-4).
      { id: "tour_guet", name: "La tour de guet", x: 75.5, y: 54, ring: 2, neighbors: ["scarabees", "trone"],
        requiresStoryStep: "desert_11",
        content: { type: "elite", eliteId: "serment_armure",
          then: { type: "expedition", templateId: "petite_aventure_desert", pools: { combat: ["guerriers_desert"] } } },
        /* v3.314.0 (W-4a1) : l'effet de la tour EST le frein déclaré plus haut en choiceBrakes.
           heldEffect ne sert ici qu'à l'afficher sur le panneau du secteur (living-map-view.js) :
           aucun hasEffect("guet_tour") ailleurs dans le code, et il ne faut pas en écrire un,
           sous peine de compter le frein deux fois. Relever le Serment ne pose jamais l'effet. */
        heldEffect: { id: "guet_tour", label: "La tour tient le sable : l'Ensablement recule plus souvent." },
        effectLostOnChoice: { key: "serment", value: "relever" },
        lore: "Quelqu'un monte encore la garde là-haut. Il ne s'est pas retourné." },
      { id: "lit_fleuve", name: "Le lit du fleuve", x: 19.5, y: 60, ring: 2, neighbors: ["steles", "trone"],
        content: { type: "expedition", templateId: "petite_aventure_desert", pools: { combat: ["ver_desert"] } },
        heldEffect: null,
        lore: "Un fleuve est passé ici. Les pierres rondes s'en souviennent mieux que l'eau." },

      /* Anneau 3 — le périple */
      // Élite répétable (le Dard des profondeurs). Ouvre avec l'étape 14 « La bête sous la dune ».
      { id: "bete_dune", name: "La bête sous la dune", x: 25, y: 12.5, ring: 3, neighbors: ["oasis", "verrerie"],
        requiresStoryStep: "desert_14",
        content: { type: "elite", eliteId: "dard_profondeurs", repeatable: true },
        heldEffect: null,
        lore: "La dune respire. Pas beaucoup, mais elle respire." },
      // Hors de portée pendant tout l'acte I : ouvre avec l'étape 6 « La descente »
      // v3.310.0 (acte II §4) : première libération = la descente (canevas dédié, hors cap), puis PA
      { id: "porte_temple", name: "La porte du Temple", x: 81, y: 10, ring: 3, neighbors: ["verrerie", "marche_sel"], labelTop: true,
        requiresStoryStep: "desert_06",
        firstContent: { type: "expedition", templateId: "descente_temple" },
        content: { type: "expedition", templateId: "petite_aventure_desert", pools: { obstacle: ["dalle_scellee", "puits_effondre"] } },
        heldEffect: null,
        lore: "Deux battants plus hauts que des arbres. L'un est ouvert de la largeur d'un homme." },
      { id: "trone", name: "Le trône de sable", x: 51, y: 81, ring: 3, neighbors: ["lit_fleuve", "tour_guet"],
        content: { type: "expedition", templateId: "petite_aventure_desert", pools: { combat: ["guerriers_desert"] } },
        heldEffect: null,
        lore: "Un siège taillé dans la dune, face au sud. Le vent ne l'use pas." }
    ],
    landmarks: []
  }
};
window.LIVING_MAPS = LIVING_MAPS;
