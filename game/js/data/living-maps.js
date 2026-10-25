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
                 (v3.422.0 : pools.obstacle seul est lu, par Pa2Run._obstaclePool, 3 obstacles
                 sur 4 tirés dedans ; les anciens pools.combat sont retirés)
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
  /* §6.2 : l'anneau fixe la difficulté — ids de PA2_RINGS (data/pa2-content.js). */
  ringIntensity: { 1: "sentier", 2: "chemin", 3: "periple" },
  /* §4.4 : ressource rare de la carte à la première libération, jamais aux reprises (Sève en Forêt). */
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
    asset: "images/Maps/foret_atelier.webp",  // provisoire (décision 13), 372 Ko — v3.260.0 : casse du dossier (GitHub Pages distingue maps/Maps)
    village: { x: 51.1, y: 46.7, name: "Aeswyn" },
    caravanMarket: { x: 51, y: 74 },          // v3.420.0 (E-3) : le marché où va la caravane (route du sud, visible sans déplacer la carte)
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
        heldEffect: { id: "autel_normale", label: "L'autel de pierre ne demande rien, une fois par aventure." }, // v3.382.0 : effet v2 (Q11)
        lore: "Neuf pierres debout. La dixième est couchée et personne ne se souvient l'avoir vue tomber." },
      { id: "arbredore", name: "Arbre doré", x: 37.9, y: 73.0, ring: 2, neighbors: ["etang", "toiles"],
        content: { type: "expedition", templateId: "petite_aventure_foret", pools: {} },
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
          then: { type: "expedition", templateId: "petite_aventure_foret", pools: {} } },
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
    asset: "images/Maps/desert.webp", // image de Seb (18/09/2026), carrée, centre = le camp
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
    caravanMarket: { x: 28, y: 47 },          // v3.420.0 (E-3) : le marché où va la caravane (piste de l'ouest, visible sans déplacer la carte)
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
        content: { type: "expedition", templateId: "petite_aventure_desert", pools: {} },
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
          then: { type: "expedition", templateId: "petite_aventure_desert", pools: {} } },
        /* v3.314.0 (W-4a1) : l'effet de la tour EST le frein déclaré plus haut en choiceBrakes.
           heldEffect ne sert ici qu'à l'afficher sur le panneau du secteur (living-map-view.js) :
           aucun hasEffect("guet_tour") ailleurs dans le code, et il ne faut pas en écrire un,
           sous peine de compter le frein deux fois. Relever le Serment ne pose jamais l'effet. */
        heldEffect: { id: "guet_tour", label: "La tour tient le sable : l'Ensablement recule plus souvent." },
        effectLostOnChoice: { key: "serment", value: "relever" },
        lore: "Quelqu'un monte encore la garde là-haut. Il ne s'est pas retourné." },
      { id: "lit_fleuve", name: "Le lit du fleuve", x: 19.5, y: 60, ring: 2, neighbors: ["steles", "trone"],
        content: { type: "expedition", templateId: "petite_aventure_desert", pools: {} },
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
        content: { type: "expedition", templateId: "petite_aventure_desert", pools: {} },
        heldEffect: null,
        lore: "Un siège taillé dans la dune, face au sud. Le vent ne l'use pas." }
    ],
    landmarks: []
  },

  /* ================= v3.429.0 (Ruines, U-5) — LA CARTE DES RUINES =================
     Image de Seb (04/10/2026), carrée, centre = la Borne. Quatorze quartiers, positions relevées sur
     l'image. Même moteur que le Désert ; s'y ajoute LE CHANTIER ERRANT (chantier, ci-dessous, lu par
     LivingMapManager.getChantier) : chaque jour civil la cité rebâtit un quartier — un quartier libéré
     repasse « Rebâti » —, et le libérer ce jour-là rapporte des Pierres errantes. L'échec : l'Éboulement.
     La carte s'ouvre avec l'étape ruines_07. */
  ruins: {
    id: "ruins",
    worldId: "ruins",
    name: "Ruines anciennes",
    asset: "images/Maps/ruines.webp",
    opensAtStoryStep: "ruines_07",
    rewardResourceId: "pierre_errante",
    chantier: { reward: 3 },   // Pierres errantes pour le chantier du jour (provisoire, banc)
    /* v3.431.0 (acte III, choix « salle ») : la salle laissée se fermer freine l'Éboulement sur toute la
       carte, tant que la porte du Sanctuaire tient (elle n'est jamais rebâtie par le chantier). */
    choiceBrakes: [
      { key: "salle", value: "fermer", sectorId: "porte_sanctuaire", bonus: 0.10 }
    ],
    /* v3.433.0 (acte IV, choix « plan », option A du 09/10) — lu par LivingMapManager :
       finir : la carte se fige (plus de chantier ni d'Éboulement), le Cœur rapporte dailyStones par jour ;
       tomber : les quartiers de collapse passent en éboulis (effet tenu perdu, effectLostOnChoice),
                et se rejouent en carrières (+quarryBonus Pierres errantes par victoire). Chiffres au banc. */
    plan: { key: "plan", finir: { dailyStones: 3 }, tomber: { collapse: ["escalier", "bibliotheque", "carriere", "echafaudages"], quarryBonus: 2 } },
    words: {
      cover: "l'Éboulement", coverCap: "L'Éboulement", coveredState: "Rebâti",
      home: "la Borne", fogLore: "Les rues changent trop vite pour qu'on sache ce qu'il y a là.",
      openElsewhere: "La ville attend encore ailleurs",
      homeTitle: "La Borne ne bouge pas.",
      homeLore: "Le camp de Sarkel, autour de la borne. C'est la seule pierre de la ville qui reste à sa place. Les quartiers de l'anneau 1 sont toujours à portée.",
      intro: "Touche un quartier pour voir ce qu'on en sait. Chaque jour, la ville rebâtit un quartier : le chantier.",
      runLoot: "Pierre du run seule",
      mapBlurb: "Choisis un quartier sur la carte des Ruines : la ville se rebâtit, un quartier par jour."
    },
    village: { x: 48.3, y: 49.3, name: "La Borne" },
    caravanMarket: { x: 41, y: 40 },          // le Marché des Ruines, entre la place aux étals et la Borne
    sectors: [
      /* Anneau 1 — autour de la Borne */
      { id: "place_etals", name: "La place aux étals", x: 35.2, y: 35.2, ring: 1, neighbors: ["couloirs", "fenetres", "cimetiere", "coeur"],
        content: { type: "expedition", templateId: "petite_aventure_ruines", pools: { obstacle: ["dalle_qui_glisse", "mur_neuf"] } },
        heldEffect: null,
        lore: "Des étals de pierre bien alignés. Ce qu'on y pose le soir n'y est plus le matin." },
      { id: "rue_tourne", name: "La rue qui tourne", x: 61, y: 34.7, ring: 1, neighbors: ["couloirs", "bibliotheque", "pont", "coeur"],
        content: { type: "expedition", templateId: "petite_aventure_ruines", pools: { obstacle: ["rue_qui_tourne", "route_de_pierre"] } },
        heldEffect: { id: "craie_plus", label: "La Craie : un trait de plus en Petite Aventure." },
        lore: "Une rue ronde qui revient sur elle-même. Edda y a usé un bâton de craie entier." },
      { id: "puits_range", name: "Le puits rangé", x: 64, y: 57.6, ring: 1, neighbors: ["pont", "echafaudages"],
        content: { type: "expedition", templateId: "petite_aventure_ruines", pools: { obstacle: ["dalle_qui_glisse", "route_de_pierre"] } },
        heldEffect: { id: "puits_plus", label: "Puits +10 %." },
        lore: "Un puits au milieu d'une cour balayée. Le seau est toujours remonté, jamais par personne." },
      { id: "maisons_basses", name: "Les maisons basses", x: 36.1, y: 62.5, ring: 1, neighbors: ["cimetiere", "tour_garde", "porte_sanctuaire"],
        content: { type: "expedition", templateId: "petite_aventure_ruines", pools: { obstacle: ["mur_neuf", "rue_qui_tourne"] } },
        heldEffect: null,
        lore: "Des maisons sans étage, toutes pareilles. Les portes sont à la bonne hauteur, ici." },

      /* Anneau 2 */
      { id: "couloirs", name: "Les couloirs couverts", x: 49.3, y: 17.6, ring: 2, neighbors: ["place_etals", "rue_tourne", "escalier", "coeur"], labelTop: true,
        content: { type: "expedition", templateId: "petite_aventure_ruines", pools: { obstacle: ["mur_neuf", "escalier_sans_fin"] } },
        heldEffect: null,
        lore: "Une rue qui a reçu un toit pendant la nuit. Dessous, il fait plus froid que dehors." },
      { id: "fenetres", name: "Le quartier des fenêtres", x: 27.3, y: 19.5, ring: 2, neighbors: ["place_etals", "carriere", "cimetiere"],
        content: { type: "expedition", templateId: "petite_aventure_ruines", pools: { obstacle: ["escalier_sans_fin", "dalle_qui_glisse"] } },
        heldEffect: null,
        lore: "Des maisons pleines de fenêtres. Le soir, l'une d'elles est éclairée. Jamais la même." },
      { id: "bibliotheque", name: "La bibliothèque murée", x: 74.2, y: 23, ring: 2, neighbors: ["rue_tourne", "escalier", "pont"],
        content: { type: "expedition", templateId: "petite_aventure_ruines", pools: { obstacle: ["mur_neuf", "porte_qui_attend"] } },
        heldEffect: null,
        lore: "Les fenêtres ont été murées de l'intérieur. Quelqu'un voulait garder ce qui est dedans." },
      { id: "cimetiere", name: "Le cimetière aligné", x: 16, y: 43, ring: 2, neighbors: ["place_etals", "fenetres", "maisons_basses", "tour_garde"],
        content: { type: "expedition", templateId: "petite_aventure_ruines", pools: { obstacle: ["route_de_pierre", "dalle_qui_glisse"] } },
        heldEffect: null,
        lore: "Des tombes en rangs parfaits. Certaines sont ouvertes. Elles se referment le jour." },
      { id: "pont", name: "Le pont de pierre", x: 87.9, y: 42, ring: 2, neighbors: ["rue_tourne", "puits_range", "bibliotheque", "echafaudages"],
        content: { type: "expedition", templateId: "petite_aventure_ruines", pools: { obstacle: ["route_de_pierre", "escalier_sans_fin"] } },
        heldEffect: null,
        lore: "Un pont au-dessus d'un ravin sec. Il est plus neuf que le ravin." },

      /* Anneau 3 */
      { id: "escalier", name: "L'escalier sans fin", x: 48.8, y: 6.3, ring: 3, neighbors: ["couloirs", "bibliotheque"], labelTop: true,
        content: { type: "expedition", templateId: "petite_aventure_ruines", pools: { obstacle: ["escalier_sans_fin", "mur_neuf"] } },
        heldEffect: null,
        lore: "Une tour qu'on monte par l'extérieur. On compte les marches, et le compte ne tombe jamais juste." },
      { id: "carriere", name: "La carrière", x: 16, y: 12.2, ring: 3, neighbors: ["fenetres"],
        content: { type: "expedition", templateId: "petite_aventure_ruines", pools: { obstacle: ["dalle_qui_glisse", "route_de_pierre"] } },
        heldEffect: { id: "carriere_plus", label: "Carrière +10 %." },
        effectLostOnChoice: { key: "plan", value: "tomber" }, // v3.433.0 : en éboulis si la cité tombe
        lore: "Une falaise taillée en marches. Les blocs qui en sortent sont déjà à la bonne taille." },
      { id: "tour_garde", name: "La tour de garde", x: 17.6, y: 72.3, ring: 3, neighbors: ["cimetiere", "maisons_basses", "porte_sanctuaire"],
        content: { type: "expedition", templateId: "petite_aventure_ruines", pools: { obstacle: ["escalier_sans_fin", "mur_neuf"] } },
        heldEffect: null,
        lore: "Une tour qui regarde la ville, pas la plaine. On gardait quelque chose à l'intérieur." },
      { id: "echafaudages", name: "Le chantier aux échafaudages", x: 79.1, y: 67.4, ring: 3, neighbors: ["puits_range", "pont", "porte_sanctuaire"],
        content: { type: "expedition", templateId: "petite_aventure_ruines", pools: { obstacle: ["mur_neuf", "dalle_qui_glisse"] } },
        heldEffect: { id: "mine_plus", label: "Mine +10 %." },
        effectLostOnChoice: { key: "plan", value: "tomber" }, // v3.433.0 : en éboulis si la cité tombe
        lore: "Des échafaudages autour d'un bloc qui flotte. Personne ne monte dessus. Le bloc monte quand même." },
      /* v3.432.0 (acte IV, étape 16) — LE CŒUR : la grande halle au-dessus de la Borne (choix de Seb
         du 09/10, emplacement A). Paraît à ruines_16 ; ne s'ouvre qu'avec ses trois voisins libérés ;
         le chantier errant ne s'y pose pas. Il porte le boss d'Histoire et le choix du plan (livraison 2). */
      { id: "coeur", name: "Le Cœur", x: 50.5, y: 27, ring: 2, neighbors: ["place_etals", "rue_tourne", "couloirs"],
        requiresStoryStep: "ruines_16", requiresAllNeighbors: true, noChantier: true,
        content: { type: "expedition", templateId: "petite_aventure_ruines", pools: { obstacle: ["mur_neuf", "porte_qui_attend"] } },
        heldEffect: null,
        lore: "Un quartier qui n'était pas là hier. Au milieu, une arche gagne une rangée de pierres chaque nuit. Personne ne les pose." },
      // Fermé jusqu'à l'acte III : la porte du Sanctuaire scellé (donjon 3)
      { id: "porte_sanctuaire", name: "La porte du Sanctuaire", x: 49.3, y: 83, ring: 3, neighbors: ["maisons_basses", "tour_garde", "echafaudages"],
        requiresStoryStep: "ruines_11",
        noChantier: true, // v3.430.0 : « la seule porte qu'aucun chantier ne touche » (hors tirage du chantier errant)
        content: { type: "expedition", templateId: "petite_aventure_ruines", pools: { obstacle: ["porte_qui_attend", "mur_neuf"] } },
        heldEffect: null,
        lore: "Une arche qui descend sous la ville. C'est la seule porte qu'aucun chantier ne touche." }
    ],
    landmarks: []
  },
  /* v3.454.0 (Crypte, lot C-3, CR9) — LES GISANTS. Visuel de Seb du 19/10/2026. Chaque couloir a ses gisants :
     au départ, on les laisse (comme d'habitude) ou on les réveille (gisants.wakeMult plus dur, +wakeRare
     Cire de sépulcre à la destination). L'échec ne reprend rien (ici, rien ne bouge) : c'est « Le réveil »,
     le couloir raté reste hostile jusqu'au lendemain (hostileMult). Pas de chantier. Chiffres au banc.
     La carte s'ouvre avec l'étape crypte_07. */
  crypt: {
    id: "crypt",
    worldId: "crypt",
    name: "Crypte des dormeurs",
    asset: "images/Maps/crypte.webp",
    opensAtStoryStep: "crypte_07",
    rewardResourceId: "cire_sepulcre",
    gisants: { wakeMult: 1.3, wakeRare: 2, hostileMult: 1.25 },
    noRegress: true,
    words: {
      cover: "le réveil", coverCap: "Le réveil", coveredState: "Hostile",
      home: "la Veillée", fogLore: "Les lampes ne vont pas jusque-là. On ne sait pas qui y dort.",
      openElsewhere: "La Crypte attend encore ailleurs",
      homeTitle: "La Veillée tient.",
      homeLore: "Le camp de Sarkel, trois lampes contre un mur. Les couloirs de l'anneau 1 sont toujours à portée.",
      intro: "Touche un couloir pour voir ce qu'on en sait. Avant de partir, choisis : laisser dormir ses gisants, ou les réveiller.",
      runLoot: "Cire du run seule",
      mapBlurb: "Choisis un couloir sur la carte de la Crypte : chacun a ses gisants."
    },
    village: { x: 50, y: 86, name: "La Veillée" },
    caravanMarket: { x: 37, y: 86 },          // le Marché de la Crypte, la pierre plate à côté de la Veillée
    sectors: [
      /* Anneau 1 — autour de la Veillée */
      { id: "salle_ronde", name: "La salle ronde", x: 50, y: 58, ring: 1, neighbors: ["lac", "fosse", "obelisque", "cercle", "maisons"],
        content: { type: "expedition", templateId: "petite_aventure_crypte", pools: { obstacle: ["allee_des_gisants", "couloir_noir"] } },
        heldEffect: null,
        lore: "Une salle ronde, des bancs de pierre tournés vers le milieu. On s'y assoit pour attendre." },
      { id: "lac", name: "Le lac froid", x: 18, y: 80, ring: 1, neighbors: ["salle_ronde", "fosse"],
        content: { type: "expedition", templateId: "petite_aventure_crypte", pools: { obstacle: ["cire_au_sol", "dalle_qui_glisse"] } },
        heldEffect: null,
        lore: "Une eau verte, immobile. Des tombes à moitié dedans. Personne ne les a noyées : l'eau est montée." },
      { id: "maisons", name: "Les maisons des morts", x: 82, y: 72, ring: 1, neighbors: ["salle_ronde", "cercle", "porte_muree"],
        content: { type: "expedition", templateId: "petite_aventure_crypte", pools: { obstacle: ["grille_basse", "allee_des_gisants"] } },
        heldEffect: null,
        lore: "Des maisons basses, sans fenêtres. Chacune a son lit de pierre." },
      { id: "porte_muree", name: "La porte murée", x: 90, y: 87, ring: 1, neighbors: ["maisons"],
        content: { type: "expedition", templateId: "petite_aventure_crypte", pools: { obstacle: ["grille_basse", "couloir_noir"] } },
        heldEffect: null,
        lore: "Une porte violette, murée de l'intérieur. La lumière passe quand même." },
      /* Anneau 2 */
      { id: "fosse", name: "La fosse rouge", x: 24, y: 55, ring: 2, neighbors: ["lac", "salle_ronde", "tombes"],
        content: { type: "expedition", templateId: "petite_aventure_crypte", pools: { obstacle: ["cire_au_sol", "couloir_noir"] } },
        heldEffect: null,
        lore: "Une lueur rouge monte du fond. Elle ne chauffe pas." },
      { id: "cercle", name: "Le cercle tracé", x: 78, y: 52, ring: 2, neighbors: ["salle_ronde", "maisons", "etais", "cotes"],
        content: { type: "expedition", templateId: "petite_aventure_crypte", pools: { obstacle: ["allee_des_gisants", "dalle_qui_glisse"] } },
        heldEffect: null,
        lore: "Un cercle gravé au sol, des bougies autour. Les bougies sont neuves. Personne ne les allume." },
      { id: "obelisque", name: "L'obélisque", x: 50, y: 41, ring: 2, neighbors: ["salle_ronde", "tombes", "cotes", "source"],
        content: { type: "expedition", templateId: "petite_aventure_crypte", pools: { obstacle: ["couloir_noir", "grille_basse"] } },
        heldEffect: { id: "lanterne_plus", label: "La Lanterne : un pas de plus en Petite Aventure." },
        lore: "Une pierre dressée, plus haute que les autres. Des noms dessus, effacés un par un." },
      { id: "tombes", name: "Les tombes rangées", x: 30, y: 40, ring: 2, neighbors: ["fosse", "obelisque", "crane", "nef"],
        content: { type: "expedition", templateId: "petite_aventure_crypte", pools: { obstacle: ["allee_des_gisants", "cire_au_sol"] } },
        heldEffect: null,
        lore: "Des tombes en rangs serrés. Toutes ouvertes. Toutes occupées." },
      { id: "etais", name: "Les étais", x: 88, y: 40, ring: 2, neighbors: ["cercle", "temple"],
        content: { type: "expedition", templateId: "petite_aventure_crypte", pools: { obstacle: ["dalle_qui_glisse", "grille_basse"] } },
        heldEffect: null,
        lore: "Des étais de bois contre la paroi. Quelqu'un a commencé à creuser, et s'est arrêté." },
      /* Anneau 3 */
      { id: "crane", name: "Le crâne", x: 10, y: 30, ring: 3, neighbors: ["tombes", "nef"],
        content: { type: "expedition", templateId: "petite_aventure_crypte", pools: { obstacle: ["couloir_noir", "allee_des_gisants"] } },
        heldEffect: null,
        lore: "Une entrée taillée en crâne. Dedans, des lueurs violettes. Ysolt n'y va pas." },
      { id: "nef", name: "La nef", x: 22, y: 12, ring: 3, neighbors: ["tombes", "crane", "source"], labelTop: true,
        content: { type: "expedition", templateId: "petite_aventure_crypte", pools: { obstacle: ["allee_des_gisants", "grille_basse"] } },
        heldEffect: null,
        lore: "Une église sous la terre, plus haute qu'aucune maison d'Aeswyn. Elle n'a pas de fidèles. Elle a des dormeurs." },
      { id: "source", name: "La source verte", x: 51, y: 10, ring: 3, neighbors: ["obelisque", "nef", "temple"], labelTop: true,
        content: { type: "expedition", templateId: "petite_aventure_crypte", pools: { obstacle: ["cire_au_sol", "dalle_qui_glisse"] } },
        heldEffect: null,
        lore: "De l'eau qui tombe d'une fente, verte, sans bruit. En bas, des statues regardent l'eau." },
      { id: "cotes", name: "Les côtes", x: 64, y: 33, ring: 3, neighbors: ["obelisque", "cercle", "temple"],
        content: { type: "expedition", templateId: "petite_aventure_crypte", pools: { obstacle: ["couloir_noir", "cire_au_sol"] } },
        heldEffect: null,
        lore: "Des os plus grands qu'une maison, en voûte. Quelque chose est mort ici, et on a construit dedans." },
      { id: "temple", name: "Le temple aux portes", x: 78, y: 12, ring: 3, neighbors: ["source", "cotes", "etais"], labelTop: true,
        content: { type: "expedition", templateId: "petite_aventure_crypte", pools: { obstacle: ["grille_basse", "couloir_noir"] } },
        heldEffect: null,
        lore: "Un temple, trois portes. Une seule s'ouvre, jamais la même." }
    ],
    // v3.456.0 (crypte_16) : la chaîne de la Liche, des côtes à la porte murée, tracée à partir de l'étape
    chainTrace: { requiresStoryStep: "crypte_16", sectors: ["cotes", "cercle", "maisons", "porte_muree"] },
    landmarks: []
  },

  /* v3.489.0 (Montagne, lot M-3, MT9) — LES VEINES DE LA CARTE. Chaque secteur a sa veine : la tailler
     (plus de Cendre vive ; le secteur chauffe d'un cran, ses combats plus durs, un cran retombe par jour)
     ou la laisser. Échec : « La coulée », le secteur sous la lave jusqu'au lendemain. Visuel à fournir par
     Seb : positions provisoires, à recaler sur l'image. Deux élites répétables (le nid, la forge froide). */
  mountain: {
    id: "mountain",
    worldId: "mountain",
    name: "Montagne brûlante",
    asset: "images/Maps/montagne.webp",
    opensAtStoryStep: "montagne_07",
    rewardResourceId: "cendre_vive",
    veins: { cutRare: 2, heatStep: 0.10, heatMax: 3, hostileMult: 1.25 },
    noRegress: true,
    words: {
      cover: "la coulée", coverCap: "La coulée", coveredState: "Sous la lave",
      home: "le Replat", fogLore: "La fumée cache la pente. On ne sait pas ce qui s'y tient.",
      openElsewhere: "La Montagne attend encore ailleurs",
      homeTitle: "Le Replat tient.",
      homeLore: "Le camp de Sarkel, contre la paroi coupée. Les pentes de l'anneau 1 sont toujours à portée.",
      intro: "Touche un secteur pour voir ce qu'on en sait. Avant de partir, choisis : laisser sa veine, ou la tailler.",
      runLoot: "Cendre du run seule",
      mapBlurb: "Choisis un secteur sur la carte de la Montagne : chacun a sa veine."
    },
    village: { x: 50, y: 86, name: "Le Replat" },
    caravanMarket: { x: 37, y: 86 },          // le Marché de la Montagne, à côté du Replat (MT8)
    sectors: [
      /* Anneau 1 — autour du Replat */
      { id: "pente_grise", name: "La pente grise", x: 50, y: 60, ring: 1, neighbors: ["ruisseaux", "paroi_noire", "nid", "champ_basalte"],
        content: { type: "expedition", templateId: "petite_aventure_montagne", pools: { obstacle: ["lacets_de_cendre", "eboulis_chaud"] } },
        heldEffect: null,
        lore: "Une pente de cendre grise, toute droite. Les traces de pas s'y effacent dans l'heure." },
      { id: "ruisseaux", name: "Les deux ruisseaux", x: 22, y: 72, ring: 1, neighbors: ["pente_grise", "eboulis", "nid"],
        content: { type: "expedition", templateId: "petite_aventure_montagne", pools: { obstacle: ["pierres_plates", "croute_de_lave"] } },
        heldEffect: null,
        lore: "Deux ruisseaux de lave, côte à côte. Entre eux, une bande de roche où l'on peut marcher." },
      { id: "paroi_noire", name: "La paroi noire", x: 78, y: 70, ring: 1, neighbors: ["pente_grise", "champ_basalte", "fumerolles"],
        content: { type: "expedition", templateId: "petite_aventure_montagne", pools: { obstacle: ["paroi_coupee", "lacets_de_cendre"] } },
        heldEffect: null,
        lore: "La paroi continue après le Replat. Plus loin, elle n'est plus coupée." },
      /* Anneau 2 */
      { id: "eboulis", name: "L'éboulis chaud", x: 14, y: 48, ring: 2, neighbors: ["ruisseaux", "nid", "coulee_morte"],
        content: { type: "expedition", templateId: "petite_aventure_montagne", pools: { obstacle: ["eboulis_chaud", "croute_de_lave"] } },
        heldEffect: null,
        lore: "Des pierres tombées d'en haut, encore chaudes. Il en tombe d'autres, de temps en temps." },
      { id: "nid", name: "Le nid", x: 36, y: 40, ring: 2, neighbors: ["ruisseaux", "eboulis", "pente_grise", "forge_froide", "coulee_morte"],
        content: { type: "elite", eliteId: "mere_dragonnets", repeatable: true },
        heldEffect: null,
        lore: "Un creux dans la roche, tapissé de coquilles noires. Quelque chose y couve encore." },
      { id: "champ_basalte", name: "Le champ de basalte", x: 62, y: 44, ring: 2, neighbors: ["pente_grise", "paroi_noire", "fumerolles", "forge_froide", "lac_de_lave"],
        content: { type: "expedition", templateId: "petite_aventure_montagne", pools: { obstacle: ["croute_de_lave", "paroi_coupee"] } },
        heldEffect: null,
        lore: "Des colonnes de basalte, toutes à la même hauteur, comme taillées. Personne ne les a taillées." },
      { id: "fumerolles", name: "Les fumerolles", x: 86, y: 46, ring: 2, neighbors: ["paroi_noire", "champ_basalte", "lac_de_lave", "antre"],
        content: { type: "expedition", templateId: "petite_aventure_montagne", pools: { obstacle: ["eboulis_chaud", "lacets_de_cendre"] } },
        heldEffect: null,
        lore: "Des trous dans le sol qui soufflent de la vapeur. Ils soufflent l'un après l'autre, dans l'ordre." },
      /* Anneau 3 */
      { id: "coulee_morte", name: "La coulée morte", x: 20, y: 22, ring: 3, neighbors: ["eboulis", "nid", "forge_froide"], labelTop: true,
        content: { type: "expedition", templateId: "petite_aventure_montagne", pools: { obstacle: ["croute_de_lave", "pierres_plates"] } },
        heldEffect: null,
        lore: "Une coulée qui a refroidi en route. Elle garde la forme d'une vague." },
      { id: "forge_froide", name: "La forge froide", x: 46, y: 16, ring: 3, neighbors: ["coulee_morte", "nid", "champ_basalte", "lac_de_lave"], labelTop: true,
        content: { type: "elite", eliteId: "vieux_golem", repeatable: true },
        heldEffect: null,
        lore: "Un cercle de pierres noires, une enclume au milieu. L'enclume est froide. Celui qui la garde ne l'est pas." },
      { id: "lac_de_lave", name: "Le lac de lave", x: 70, y: 20, ring: 3, neighbors: ["forge_froide", "champ_basalte", "fumerolles", "antre"], labelTop: true,
        content: { type: "expedition", templateId: "petite_aventure_montagne", pools: { obstacle: ["pierres_plates", "eboulis_chaud"] } },
        heldEffect: null,
        lore: "Un lac qui bouge lentement, d'un bord à l'autre. Des îles noires flottent dessus." },
      { id: "antre", name: "L'entrée de l'Antre", x: 88, y: 10, ring: 3, neighbors: ["lac_de_lave", "fumerolles"], labelTop: true,
        content: { type: "expedition", templateId: "petite_aventure_montagne", pools: { obstacle: ["paroi_coupee", "croute_de_lave"] } },
        heldEffect: null,
        lore: "Une bouche dans la montagne. L'air qui en sort est plus chaud que le soleil." }
    ],
    landmarks: []
  }
};
window.LIVING_MAPS = LIVING_MAPS;
