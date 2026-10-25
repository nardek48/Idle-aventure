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
  desert: { matPerHour: 125, goldPerHour: 18 },
  /* v3.457.3 (audit P1, décision Seb du 20/10) : banc étendu. Ruines : plafonds du Désert, mêmes taux ;
     Crypte : 187 / 21 pour ~15 % des matériaux et 8 % de l'or (deux compagnons hors du groupe). */
  ruins: { matPerHour: 125, goldPerHour: 18 },
  crypt: { matPerHour: 190, goldPerHour: 21 },
  mountain: { matPerHour: 260, goldPerHour: 24 } // v3.489.0 : dans le prolongement (Crypte ×1,37), au banc
};

var PATROL_SPLIT = { main: 0.7, second: 0.3 };        // ressource dominante du secteur / seconde
var PATROL_RING_MULT = { 1: 1.0, 2: 1.15, 3: 1.3 };    // tenir loin rapporte un peu plus
var PATROL_UPGRADE_BONUS = 0.05;                       // P8 : +5 % par amélioration du compagnon
var PATROL_JITTER = 0.10;                              // ±10 % à chaque départ
var PATROL_RATION_CHANCE_PER_H = 0.03;                 // P5 : ingrédients de rations, rarement
var PATROL_RATION_LOOT = {
  forest: { viande: 10 },                              // v3.484.0 (lot S) : viande brute, plus de Viande séchée
  desert: { viande: 15, pain: 1 },                     // une ration moyenne (E4)
  ruins: { viande: 15, pain: 1 },                      // v3.457.3 : comme le Désert
  crypt: { viande: 15, pain: 1 },
  mountain: { viande: 15, pain: 1 } // v3.489.0
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
  },
  // v3.457.3 (document « Patrouilles des Ruines et de la Crypte » v1.0, validé par Seb le 20/10)
  ruins: {
    place_etals: ["ble", "viande"], rue_tourne: ["bois", "pierre"], puits_range: ["eau", "pierre"],
    maisons_basses: ["bois", "pierre"], couloirs: ["pierre", "fer"], fenetres: ["bois", "pierre"],
    bibliotheque: ["bois", "pierre"], cimetiere: ["pierre", "viande"], pont: ["pierre", "eau"],
    escalier: ["pierre", "fer"], carriere: ["pierre", "fer"], tour_garde: ["fer", "pierre"],
    echafaudages: ["bois", "fer"], coeur: ["fer", "pierre"], porte_sanctuaire: ["pierre", "fer"]
  },
  crypt: {
    salle_ronde: ["pierre", "fer"], lac: ["eau", "pierre"], maisons: ["bois", "pierre"],
    porte_muree: ["pierre", "fer"], fosse: ["fer", "pierre"], cercle: ["pierre", "eau"],
    obelisque: ["pierre", "fer"], tombes: ["pierre", "bois"], etais: ["bois", "fer"],
    crane: ["pierre", "viande"], nef: ["pierre", "bois"], source: ["eau", "ble"],
    cotes: ["viande", "pierre"], temple: ["fer", "pierre"]
  },
  mountain: { // v3.489.0 (Montagne)
    pente_grise: ["pierre", "fer"], ruisseaux: ["fer", "pierre"], paroi_noire: ["pierre", "fer"],
    eboulis: ["pierre", "bois"], nid: ["viande", "pierre"], champ_basalte: ["pierre", "fer"],
    fumerolles: ["eau", "pierre"], coulee_morte: ["fer", "pierre"], forge_froide: ["fer", "pierre"],
    lac_de_lave: ["fer", "eau"], antre: ["pierre", "fer"]
  }
};

var PATROL_COMPANION_FEMININE = { wenna: true, maddoc: false, edda: true, ysolt: true, sarkel: false }; // v3.457.3 : Edda et Ysolt ; v3.488.0 : Sarkel

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
    },
    ruins: {
      common: [
        "À {secteur}, la rue n'était plus où je l'avais laissée hier. J'ai suivi la craie d'Edda. Elle avait raison, comme d'habitude.",
        "Quelqu'un balaie {secteur} chaque nuit. Je n'ai vu personne. Le balai était rangé contre le mur, encore humide.",
        "J'ai rempli les sacs à {secteur}. Une pierre a changé de place pendant que je comptais. J'ai recompté."
      ],
      rare: ["À {secteur}, une porte peinte en bleu, toute neuve, sur un mur qui n'était pas là ce matin. Je n'ai pas frappé."]
    },
    crypt: {
      common: [
        "J'ai laissé un bout de pain à {secteur}. Au retour, il n'y était plus. Les miettes, si.",
        "Il fait froid à {secteur}. J'ai parlé tout bas pour ne réveiller personne. Ça a marché, je crois.",
        "Les sacs sont pleins. À {secteur}, la cire coulait le long des murs, comme si quelqu'un venait d'allumer."
      ],
      rare: ["À {secteur}, un gisant avait les mains ouvertes. Hier, elles étaient jointes. J'en suis sûre."]
    },
    mountain: { // v3.489.0
      common: [
        "Il fait trop chaud à {secteur}. J'ai rempli les sacs quand même. Je ne veux plus jamais avoir chaud.",
        "À {secteur}, une bête m'a regardée passer. Elle ne m'a rien fait. Elle regardait mes mains.",
        "Les sacs sont pleins. À {secteur}, la cendre est tombée toute la journée, comme de la neige tiède."
      ],
      rare: ["À {secteur}, un petit façonné m'a suivie jusqu'au bord. Il s'est arrêté là où la roche refroidit."]
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
    },
    ruins: {
      common: [
        "{secteur}. Des marches partout. Ma jambe n'aime pas les marches.",
        "Les murs de {secteur} sont droits. Trop droits. Chez nous, le vent arrondit tout.",
        "J'ai ramassé ce qui traînait à {secteur}. Les murs bougent. Les cailloux, non."
      ],
      rare: ["À {secteur}, un établi, les outils posés en ordre, encore chauds. J'ai attendu l'ouvrier. Il n'est pas venu."]
    },
    crypt: {
      common: [
        "{secteur}. Pas un bruit. Même ma jambe s'est tue.",
        "De l'eau coule à {secteur}. Personne pour la boire. Ça me fait mal de la laisser.",
        "J'ai compté les tombes de {secteur}. Une de plus qu'hier. Je n'ai pas recompté."
      ],
      rare: ["À {secteur}, une chaîne traînait par terre, attachée à rien. Elle était tiède."]
    },
    mountain: { // v3.489.0
      common: [
        "{secteur}. Chaud comme chez nous à midi. Ma jambe, elle, aime bien.",
        "À {secteur}, la roche bat. Je n'aime pas ce qui bat sans cœur.",
        "J'ai ramassé ce qui traînait à {secteur}. Les golems m'ont laissé faire. Je ne sais pas pourquoi."
      ],
      rare: ["À {secteur}, un golem assis, immobile. Il avait une pioche dans la main. Pas la sienne."]
    }
  },
  // v3.457.3 : Edda et Ysolt, dans les mondes où elles ont une raison d'être (option B)
  edda: {
    ruins: {
      common: [
        "{secteur} a bougé de deux pas vers l'est. Je l'ai noté.",
        "J'ai tracé {secteur} trois fois. Les trois sont justes. Ce sont les murs qui hésitent.",
        "On m'a vue à {secteur}. Personne ne l'a dit, mais une fenêtre s'est fermée."
      ],
      rare: ["À {secteur}, un mur portait mon trait de craie. Je ne suis jamais passée par là."]
    },
    mountain: { // v3.489.0
      common: [
        "{secteur} a coulé de trois pas depuis hier. Je l'ai noté. Ici, ça descend.",
        "J'ai tracé {secteur}. La lave efface le bas de mes traits pendant que je dessine.",
        "Les veines de {secteur} battent ensemble. Je ne sais pas comment le dessiner."
      ],
      rare: ["À {secteur}, une colonne de basalte portait une marque droite, nette. Pas un outil d'ici."]
    }
  },
  // v3.489.0 (Montagne) : les quatre qui montent ; Ysolt, si elle est restée, rentre avec le narrateur
  sarkel: {
    mountain: {
      common: [
        "{secteur}. J'ai rapporté ce qui se ramasse. Ce qui se taille, je le garde pour plus tard.",
        "À {secteur}, j'ai frappé la roche. Elle a rendu un bruit que je ne connais pas.",
        "Les sacs sont pleins. À {secteur}, personne n'achète rien. Ça repose."
      ],
      rare: ["À {secteur}, une coupe dans la roche, comme au Replat. Plus petite. Plus vieille, je crois."]
    }
  },
  ysolt: {
    crypt: {
      common: [
        "{secteur} dort bien. J'ai remis une couverture sur l'un d'eux.",
        "À {secteur}, j'ai dit les noms que je connais. Il en manque toujours un.",
        "J'ai fait le tour de {secteur}. Personne ne s'est levé. C'est ce que je voulais."
      ],
      rare: ["À {secteur}, quelqu'un a dit mon nom en dormant. Je ne l'ai pas réveillé."]
    }
  }
};

/* v3.457.3 : un compagnon hors de son monde (Edda en Forêt) — le narrateur, sans récit de voix. */
var PATROL_STORY_NARRATOR = "{nom} rentre de {secteur}, les sacs pleins.";

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
window.PATROL_STORY_NARRATOR = PATROL_STORY_NARRATOR;
