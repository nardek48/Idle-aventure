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
  repeatableElite: { brakePerWin: 0.50, sevePerWin: 2 },
  /* Effets tenus (C-3), chiffres en un seul endroit. */
  effects: { productionMult: 1.10, contractMult: 1.10, gourdeBreath: 40, ropeBonus: 1 },
  /* §5.4 : Palissade (C-3). Frein : chance qu'un échec ne recouvre rien. Tenue : anneau conservé à l'Ascension. */
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
      // Arbre-mère (C-5) : élite RÉPÉTABLE — se rejoue à volonté une fois libérée, hors cap, sans
      // ration ; chaque victoire du jour durcit la suivante (LIVING_MAP_RULES.repeatableElite).
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
  }
};
window.LIVING_MAPS = LIVING_MAPS;
