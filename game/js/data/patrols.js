"use strict";
/* data/patrols.js — v3.334.0 (Évolutions, lot P-1) : patrouilles de compagnons.
   Conception « Évolutions » v1.0 §4, décisions P1 à P9 (Seb, 24/09/2026).
   Logique : systems/patrol-system.js. Chiffres : sim/patrouille-bench.js (P-0).

   PRINCIPES (P3, P5, P7) :
   - rendement ÉGAL par heure pour 2, 4 et 8 h : dormir ne rapporte pas moins que revenir
     souvent, revenir souvent ne rapporte pas plus ; seule la chance de récit rare croît ;
   - un bonus, jamais une source dont on dépend : cible ~15 % des matériaux et <= 10 % de
     l'or qu'un joueur actif gagne par jour (journée type : 8 h la nuit + 4 h le jour) ;
   - aucun échec : une patrouille revient toujours, avec son butin. */

var PATROL_DURATIONS_H = [2, 4, 8];

/* Par heure de patrouille, selon le monde de la carte du secteur. Banc P-0 (24/09/2026,
   sim/patrouille-bench.js, 4 visites/jour, 12 h/compagnon, 2 améliorations) :
     Forêt  (Wenna seule)       ~15 % des matériaux, ~9,5 % de l'or de Taverne du jour
     Désert (Wenna et Maddoc)   ~15 % / ~9,5 %
   Premier jet 70/22 et 316/55 : 19 %/17 % en Forêt, 38 %/29 % au Désert (deux compagnons). */
var PATROL_RATES = {
  forest: { matPerHour: 55, goldPerHour: 12 },
  desert: { matPerHour: 125, goldPerHour: 18 }
};

var PATROL_SPLIT = { main: 0.7, second: 0.3 };        // ressource dominante du secteur / seconde
var PATROL_RING_MULT = { 1: 1.0, 2: 1.15, 3: 1.3 };    // tenir loin rapporte un peu plus
var PATROL_UPGRADE_BONUS = 0.05;                       // P8 : +5 % par amélioration du compagnon
var PATROL_JITTER = 0.10;                              // ±10 % à chaque départ
var PATROL_RATION_CHANCE_PER_H = 0.03;                 // P5 : ingrédients de rations, rarement
var PATROL_RATION_LOOT = {
  forest: { viande_sechee: 2 },
  desert: { viande_sechee: 3, pain: 1 }                // une ration moyenne (E4)
};
/* P6 : chance de récit rare = base par heure, +bonus pour la nuit complète (8 h). */
var PATROL_RARE_PER_H = 0.02;
var PATROL_RARE_NIGHT_BONUS = 0.10;

/* Ressource dominante et seconde de chaque secteur (P4). Absent : bois / pierre. */
var PATROL_SECTORS = {
  forest: {
    gue: ["bois", "eau"], camp: ["viande", "bois"], etang: ["eau", "ble"],
    menhirs: ["pierre", "fer"], arbredore: ["bois", "pierre"], autel: ["pierre", "fer"],
    arbremere: ["bois", "viande"], toiles: ["viande", "bois"], portail: ["pierre", "fer"]
  },
  desert: {
    puits_sec: ["eau", "pierre"], caravane: ["ble", "viande"], steles: ["pierre", "fer"],
    scarabees: ["viande", "pierre"], verrerie: ["pierre", "fer"], oasis: ["eau", "ble"],
    marche_sel: ["ble", "eau"], tour_guet: ["fer", "pierre"], lit_fleuve: ["pierre", "eau"],
    bete_dune: ["viande", "fer"], porte_temple: ["pierre", "fer"], trone: ["fer", "pierre"]
  }
};

var PATROL_COMPANION_FEMININE = { wenna: true, maddoc: false };

/* P6 — récits de retour, dans la voix du compagnon : 3 communs + 1 rare par monde.
   {secteur} est remplacé par le nom du secteur. Textes PROVISOIRES, à relire selon la bible. */
var PATROL_STORIES = {
  wenna: {
    forest: {
      common: [
        "J'ai fait le tour par {secteur}. Rien de méchant, juste des traces qui tournaient en rond. J'ai rapporté ce que j'ai pu porter.",
        "{secteur}, c'est plus calme la nuit. Enfin, plus calme… disons que ce qui bouge fait moins de bruit.",
        "Quelqu'un est passé avant moi à {secteur}. Il a laissé un feu mal éteint. Je l'ai éteint. De rien."
      ],
      rare: ["À {secteur}, une page de parchemin coincée dans une souche. Je n'ai pas su la lire. Elle parlait d'un fleuve, je crois. Je l'ai perdue en rentrant. Désolée."]
    },
    desert: {
      common: [
        "Le sable efface tout, même mes propres traces. J'ai dû revenir de {secteur} en suivant les étoiles.",
        "À {secteur}, un marchand m'a proposé de l'eau contre ma cape. J'ai gardé la cape.",
        "Il fait trop chaud pour penser. Alors j'ai juste ramassé ce qui traînait à {secteur}."
      ],
      rare: ["À {secteur}, une empreinte de pas plus grande que ma main ouverte. Une seule. Rien avant, rien après."]
    }
  },
  maddoc: {
    forest: {
      common: [
        "Trop d'arbres. On ne voit rien venir. J'ai rapporté ce que {secteur} voulait bien donner.",
        "À {secteur}, la terre est molle. Ma jambe préfère le sable. Je ne pensais pas dire ça un jour.",
        "Ça sent la pluie à {secteur}. Chez nous, on paierait pour ça."
      ],
      rare: ["Un cerf blanc à {secteur}. Il m'a regardé comme s'il me connaissait. On n'a rien dit, ni l'un ni l'autre."]
    },
    desert: {
      common: [
        "{secteur}. J'y suis allé, j'en suis revenu. Le reste, c'est dans les sacs.",
        "Ma jambe a tenu. Le chemin de {secteur}, un peu moins.",
        "Un gamin m'a suivi jusqu'à {secteur}. Il voulait savoir si je boitais depuis toujours. Je lui ai dit que oui."
      ],
      rare: ["À {secteur}, la tour de guet était allumée. Personne ne devrait y être. Je n'ai pas insisté."]
    }
  }
};

window.PATROL_DURATIONS_H = PATROL_DURATIONS_H;
window.PATROL_RATES = PATROL_RATES;
window.PATROL_SPLIT = PATROL_SPLIT;
window.PATROL_RING_MULT = PATROL_RING_MULT;
window.PATROL_UPGRADE_BONUS = PATROL_UPGRADE_BONUS;
window.PATROL_JITTER = PATROL_JITTER;
window.PATROL_RATION_CHANCE_PER_H = PATROL_RATION_CHANCE_PER_H;
window.PATROL_RATION_LOOT = PATROL_RATION_LOOT;
window.PATROL_RARE_PER_H = PATROL_RARE_PER_H;
window.PATROL_RARE_NIGHT_BONUS = PATROL_RARE_NIGHT_BONUS;
window.PATROL_SECTORS = PATROL_SECTORS;
window.PATROL_COMPANION_FEMININE = PATROL_COMPANION_FEMININE;
window.PATROL_STORIES = PATROL_STORIES;
