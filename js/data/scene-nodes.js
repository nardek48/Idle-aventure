"use strict";
/* data/scene-nodes.js — banque de gabarits partagée du scene-engine (obstacles, textes
   d'ambiance des salles non-obstacle). Purement des données, aucune logique. Un gabarit
   d'obstacle est réutilisable par plusieurs canevas (data/scene-templates.js) via
   template.pools.obstacle. Tag "biome" pour permettre plus tard un tirage filtré par monde
   (non exploité en v1 : un seul biome, "forest"). Détail : DESIGN_Scene_Engine_v1.md §5 */

var SCENE_NODES = {
  obstacles: {
    eboulis: {
      id: "eboulis", biome: "forest", name: "L'éboulis",
      baseDifficulty: 4,
      options: {
        power: { stat: "power", label: "Forcer le passage" },
        precision: { stat: "precision", label: "Se faufiler" },
        endurance: { stat: "endurance", label: "Déblayer patiemment" }
      }
    },
    gouffre: {
      id: "gouffre", biome: "forest", name: "Le gouffre",
      baseDifficulty: 5, ropeOption: true,
      options: {
        precision: { stat: "precision", label: "Sauter de pierre en pierre" },
        power: { stat: "power", label: "Abattre un tronc en pont" },
        endurance: { stat: "endurance", label: "Longer la corniche" }
      }
    },
    porte_scellee: {
      id: "porte_scellee", biome: "forest", name: "La porte scellée",
      baseDifficulty: 6,
      options: {
        power: { stat: "power", label: "Défoncer la porte" },
        precision: { stat: "precision", label: "Crocheter le mécanisme" },
        endurance: { stat: "endurance", label: "Chercher un autre accès" }
      }
    },
    paroi: {
      id: "paroi", biome: "forest", name: "La paroi lisse",
      baseDifficulty: 5, ropeOption: true,
      options: {
        power: { stat: "power", label: "Tailler des prises" },
        precision: { stat: "precision", label: "Grimper en finesse" },
        endurance: { stat: "endurance", label: "Contourner par le boyau" }
      }
    },
    riviere: {
      id: "riviere", biome: "forest", name: "La rivière noire",
      baseDifficulty: 5, ropeOption: true,
      options: {
        endurance: { stat: "endurance", label: "Traverser à la nage" },
        power: { stat: "power", label: "Déplacer les blocs du gué" },
        precision: { stat: "precision", label: "Bondir sur les rochers" }
      }
    },
    racines: {
      id: "racines", biome: "forest", name: "Les racines vives",
      baseDifficulty: 4,
      options: {
        power: { stat: "power", label: "Trancher le passage" },
        endurance: { stat: "endurance", label: "Ramper en dessous" },
        precision: { stat: "precision", label: "Repérer le chemin sûr" }
      }
    },

    /* v3.122.0 (Lot S2a) — gabarits thématiques des 3 quêtes de déblocage migrées. Biome
       "forest" comme le reste, mais volontairement narratifs (liés au lore d'origine des
       quêtes plutôt que génériques) : ces canevas sont courts (2-3 paliers), chaque obstacle
       doit raconter une étape précise, pas juste varier un décor interchangeable. */
    tronc_deracine: {
      id: "tronc_deracine", biome: "forest", name: "Le tronc déraciné",
      baseDifficulty: 4,
      options: {
        power: { stat: "power", label: "Déplacer le tronc" },
        precision: { stat: "precision", label: "Chercher un passage étroit" },
        endurance: { stat: "endurance", label: "Dégager branche par branche" }
      }
    },
    ronces_epaisses: {
      id: "ronces_epaisses", biome: "forest", name: "Les ronces épaisses",
      baseDifficulty: 4,
      options: {
        power: { stat: "power", label: "Arracher les ronces" },
        precision: { stat: "precision", label: "Se glisser entre les épines" },
        endurance: { stat: "endurance", label: "Avancer malgré les griffures" }
      }
    },
    troncs_jumeaux: {
      id: "troncs_jumeaux", biome: "forest", name: "Les troncs jumeaux",
      baseDifficulty: 5,
      options: {
        power: { stat: "power", label: "Abattre les troncs morts" },
        precision: { stat: "precision", label: "Choisir l'angle de coupe" },
        endurance: { stat: "endurance", label: "Scier sans relâche" }
      }
    },
    fute_dense: {
      id: "fute_dense", biome: "forest", name: "La futaie dense",
      baseDifficulty: 5, ropeOption: true,
      options: {
        power: { stat: "power", label: "Se frayer un chemin à la hache" },
        precision: { stat: "precision", label: "Suivre la trouée de lumière" },
        endurance: { stat: "endurance", label: "Contourner par le sous-bois" }
      }
    },
    sillons_geles: {
      id: "sillons_geles", biome: "forest", name: "Les sillons figés",
      baseDifficulty: 4,
      options: {
        power: { stat: "power", label: "Retourner la terre à la force" },
        precision: { stat: "precision", label: "Tracer les sillons au cordeau" },
        endurance: { stat: "endurance", label: "Labourer patiemment" }
      }
    },
    talus_boueux: {
      id: "talus_boueux", biome: "forest", name: "Le talus boueux",
      baseDifficulty: 5, ropeOption: true,
      options: {
        endurance: { stat: "endurance", label: "Patauger jusqu'au bout" },
        power: { stat: "power", label: "Damer un passage" },
        precision: { stat: "precision", label: "Suivre la crête sèche" }
      }
    },

    /* v3.123.0 (Lot S2b) — gabarits thématiques des 3 quêtes de minage/eau migrées.
       Registre minier (Veine Instable, Éboulis Ferreux) et aquatique (Source Tarie) plutôt
       que forestier — même biome "forest" globalement (un seul monde en v1), mais vocabulaire
       propre à chaque quête (frapper la roche, puiser l'eau). */
    filon_fragile: {
      id: "filon_fragile", biome: "forest", name: "Le filon fragile",
      baseDifficulty: 4,
      options: {
        power: { stat: "power", label: "Frapper de toutes ses forces" },
        precision: { stat: "precision", label: "Viser la faille exacte" },
        endurance: { stat: "endurance", label: "Creuser sans relâche" }
      }
    },
    paroi_instable: {
      id: "paroi_instable", biome: "forest", name: "La paroi instable",
      baseDifficulty: 5,
      options: {
        power: { stat: "power", label: "Dégager les gravats" },
        precision: { stat: "precision", label: "Repérer les points faibles" },
        endurance: { stat: "endurance", label: "Étayer et avancer" }
      }
    },
    veine_rougeatre: {
      id: "veine_rougeatre", biome: "forest", name: "La veine rougeâtre",
      baseDifficulty: 4,
      options: {
        power: { stat: "power", label: "Attaquer la roche à la masse" },
        precision: { stat: "precision", label: "Suivre le filon de fer" },
        endurance: { stat: "endurance", label: "Tailler par petites passes" }
      }
    },
    eboulis_recent: {
      id: "eboulis_recent", biome: "forest", name: "L'éboulis récent",
      baseDifficulty: 5, ropeOption: true,
      options: {
        power: { stat: "power", label: "Forcer un passage" },
        precision: { stat: "precision", label: "Slalomer entre les blocs" },
        endurance: { stat: "endurance", label: "Déblayer méthodiquement" }
      }
    },
    source_irreguliere: {
      id: "source_irreguliere", biome: "forest", name: "La source irrégulière",
      baseDifficulty: 4,
      options: {
        precision: { stat: "precision", label: "Puiser au bon moment" },
        endurance: { stat: "endurance", label: "Attendre l'accalmie" },
        power: { stat: "power", label: "Élargir le passage de l'eau" }
      }
    },
    bassin_trouble: {
      id: "bassin_trouble", biome: "forest", name: "Le bassin trouble",
      baseDifficulty: 4,
      options: {
        endurance: { stat: "endurance", label: "Filtrer patiemment" },
        precision: { stat: "precision", label: "Cibler l'eau claire" },
        power: { stat: "power", label: "Dégager le conduit obstrué" }
      }
    }
  },

  /* Textes d'ambiance courts pour les silhouettes (portes non révélées, sans torche).
     v3.125.0 (Petites Aventures, Lot PA1/PA2) : combat et bloqueur ajoutés — ces deux types
     n'existent que dans petite_aventure_foret (profil Bourrin/Prudent), jamais en mystère
     (non tirés par _revealMystery, voir scene-run-system.js), silhouette non utilisée en
     pratique mais fournie pour cohérence du contrat SCENE_NODES.*[type]. */
  silhouettes: {
    obstacle: "Un passage difficile",
    autel: "Une lueur étrange",
    decouverte: "Un reflet brillant",
    source: "Un bruit d'eau",
    mystere: "Une ombre indistincte",
    combat: "Des bruits de pas",
    bloqueur: "Un obstacle qui prendra du temps"
  },

  /* Indices qualitatifs affichés SANS torche (décision Seb 03/09/2026 : un "???" pur sur
     toutes les portes ne donne aucune base de décision). Le détail précis reste réservé à la
     torche — ces indices ne donnent jamais le nom du gabarit ni la stat concernée. */
  hints: {
    obstacle: { low: "Semble périlleux", medium: "Praticable", high: "Semble aisé" },
    autel: "Une présence recueillie",
    decouverte: "Prometteur",
    source: "Apaisant",
    combat: "Une présence hostile",
    bloqueur: "Une attente s'annonce"
  },

  /* Indice de gain relatif d'un obstacle (v3.121.0, recalibrage Seb "le choix est trop
     linéaire") — TOUJOURS visible (torche ou non), c'est lui qui rend le choix risque/
     récompense réel : une porte au gain élevé compense sa difficulté annoncée plus faible.
     Voir SceneEngine.riskLevel(riskMod). */
  gainHints: {
    low: "Butin modeste",
    medium: "Bon butin",
    high: "Gros butin"
  },

  labels: {
    obstacle: "Passage",
    autel: "Autel oublié",
    decouverte: "Découverte",
    source: "Source claire",
    mystere: "Zone inconnue",
    combat: "Rencontre",
    bloqueur: "Chemin long"
  },

  icons: {
    obstacle: "⛰", autel: "🕯", decouverte: "✨", source: "💧", mystere: "❓",
    combat: "⚔️", bloqueur: "⏳"
  },

  /* v3.125.0 (Lot PA2) : groupes d'ennemis exploitables par un slot combat de scene-engine
     (template.pools.combat -> gabaritId ici). enemyFilter passé tel quel à
     QuestEnemyManager.spawnFor() — mêmes ids que ENEMY_DB (world "forest"). Purement des
     données : aucune logique, cohérent avec le reste de ce fichier. */
  combatGroups: {
    gobelins_foret: { name: "Une bande de gobelins", enemyFilter: ["goblin"] },
    loups_foret: { name: "Une meute de loups", enemyFilter: ["wolf"] },
    araignees_foret: { name: "Un nid d'araignées", enemyFilter: ["spider"] }
  }
};

window.SCENE_NODES = SCENE_NODES;
