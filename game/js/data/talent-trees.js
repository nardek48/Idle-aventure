"use strict";
/* data/talent-trees.js — v3.327.0 : un arbre de talents PAR CLASSE (conception Talents v1.1,
   décisions T1 à T14 de Seb, 24/09/2026). Remplace data/talents.js (27 talents communs).

   Forme (T3, T13, T14) : un tronc de 3 nœuds, puis deux voies de 4 nœuds + une clé de voûte.
     - les voies s'ouvrent après TALENT_TRUNK_GATE points dans le tronc ;
     - ordre libre dans une voie ; la clé demande TALENT_KEY_GATE nœuds de sa voie ;
     - les deux clés d'un arbre s'excluent (remise à zéro gratuite pour changer).

   Deux sortes d'effets :
     - `mods` : DONNÉE. Réécrit une valeur du kit (class-skills.js) à la lecture, via
       TalentManager.modKit — le Grimoire automatique joue le talent sans rien savoir de lui.
       Chemins : "resource.x.y", "actions.<slot>.x", "actions.<slot>.effects#<type>.x".
       Opérations : set (remplace), push (ajoute à une liste).
     - sans `mods` : CROCHET. L'effet est lu par TalentManager.has(id) dans le moteur
       (systems/talent-system.js liste les sept points d'appel).
   Chiffres provisoires, réglés au banc (lot T-3). Ids préfixés par classe (k_, a_, m_). */

var TALENT_TRUNK_GATE = 2;
var TALENT_KEY_GATE = 3;

var TALENT_TREES = {
  knight: {
    trunk: [
      { id: "k_sang_chaud", img: "images/Icons/talents/knight/k_sang_chaud.webp",
        name: "Sang chaud", short: "25 Rage au départ",
        effect: "Tu commences chaque combat avec au moins 25 Rage.",
        mods: [{ path: "resource.initial", set: 25 }] },
      { id: "k_cuirasse", img: "images/Icons/talents/knight/k_cuirasse.webp",
        name: "Cuirasse", maxRank: 3, short: "+6 % PV max par rang", // H3 : 3 rangs
        effect: "+6 % de PV max par rang.", stats: { hpPct: 0.06 } },
      { id: "k_colere_froide", img: "images/Icons/talents/knight/k_colere_froide.webp",
        name: "Colère froide", short: "Rage par coup : 30 max",
        effect: "La Rage gagnée par coup monte jusqu'à 30 au lieu de 20.",
        mods: [{ path: "resource.generation.maxGainPerHit", set: 30 }] }
    ],
    paths: [
      { id: "rempart", name: "Rempart", tag: "Tenir, encaisser, rendre", nodes: [
        { id: "k_rancune", img: "images/Icons/talents/knight/k_rancune.webp",
        name: "Rancune", short: "Coups reçus → Rage",
          effect: "Les dégâts que tu subis te donnent de la Rage : 15 % des dégâts, 10 au plus par coup." },
        { id: "k_garde_vengeresse", img: "images/Icons/talents/knight/k_garde_vengeresse.webp",
        name: "Garde vengeresse", short: "Garde : +15 Rage",
          effect: "Activer la Garde te donne 15 Rage.",
          mods: [{ path: "actions.defense.resourceGain", set: 15 }] },
        { id: "k_mur", img: "images/Icons/talents/knight/k_mur.webp",
        name: "Mur", maxRank: 2, short: "Garde : −65 % (−70 %)",
          effect: "La Garde réduit les dégâts de 65 % au lieu de 50 % (70 % au rang 2).",
          mods: [{ path: "actions.defense.effects#damageReduction.value", set: [0.65, 0.70] }] }, // H3 : valeur par rang
        { id: "k_riposte", img: "images/Icons/talents/knight/k_riposte.webp",
        name: "Riposte", maxRank: 2, short: "Renvoie 30 % bloqués (45 %)",
          effect: "Pendant la Garde, 30 % des dégâts bloqués sont renvoyés à l'attaquant (45 % au rang 2)." },
        { id: "k_bastion", img: "images/Icons/talents/knight/k_bastion.webp",
        name: "Bastion", key: true, short: "Garde 2 rounds, Rage ×2",
          effect: "La Garde dure 2 rounds (recharge 4). Pendant la Garde, tes attaques de base donnent le double de Rage.",
          mods: [{ path: "actions.defense.effects#damageReduction.durationRounds", set: 2 },
                 { path: "actions.defense.cooldownRounds", set: 4 }] }
      ] },
      { id: "bourreau", name: "Bourreau", tag: "Préparer, puis achever", nodes: [
        { id: "k_elan", img: "images/Icons/talents/knight/k_elan.webp",
        name: "Élan", short: "Frappe lourde : 12 Rage, soin",
          effect: "Frappe lourde coûte 12 Rage au lieu de 18 et te soigne de 2 % de tes PV max.",
          mods: [{ path: "actions.skill1.resourceCost", set: 12 }, { path: "actions.skill1.healMaxHpPct", set: 0.02 }] },
        { id: "k_brise_os", img: "images/Icons/talents/knight/k_brise_os.webp",
        name: "Brise-os", maxRank: 2, short: "Vulnérabilité +30 % (+40 %)",
          effect: "Brise-garde rend l'ennemi vulnérable à +30 % au lieu de +20 % (+40 % au rang 2).",
          mods: [{ path: "actions.skill2.effects#enemyVulnerability.value", set: [0.30, 0.40] }] },
        { id: "k_curee", img: "images/Icons/talents/knight/k_curee.webp",
        name: "Curée", short: "Exécution dès 45 %",
          effect: "Exécution est utilisable dès que l'ennemi passe sous 45 % de ses PV (au lieu de 35 %).",
          mods: [{ path: "actions.skill3.conditions.enemyHpPercentBelowOrEqual", set: 0.45 }] },
        { id: "k_soif_bourreau", img: "images/Icons/talents/knight/k_soif_bourreau.webp",
        name: "Soif du bourreau", maxRank: 2, short: "Ennemi tué : +20 Rage (+30)",
          effect: "Tuer un ennemi te rend 20 Rage (30 au rang 2). Utile dans les vagues, les donjons et les groupes." },
        { id: "k_sentence", img: "images/Icons/talents/knight/k_sentence.webp",
        name: "Sentence", key: true, short: "Exécution : recharge 2",
          effect: "Exécution se recharge en 2 rounds au lieu de 4.",
          mods: [{ path: "actions.skill3.cooldownRounds", set: 2 }] }
      ] }
    ]
  },

  archer: {
    trunk: [
      { id: "a_oeil_vif", img: "images/Icons/talents/archer/a_oeil_vif.webp",
        name: "Œil vif", maxRank: 3, short: "+4 % critique par rang", // H3 : 3 rangs
        effect: "+4 % de chance de critique par rang.", stats: { critChance: 4 } },
      { id: "a_souffle_court", img: "images/Icons/talents/archer/a_souffle_court.webp",
        name: "Souffle court", short: "Esquive gratuite",
        effect: "L'Esquive ne coûte plus de Concentration (10 → 0).",
        mods: [{ path: "actions.defense.resourceCost", set: 0 }] },
      { id: "a_rythme", img: "images/Icons/talents/archer/a_rythme.webp",
        name: "Rythme", short: "Jauge +10 %",
        effect: "La jauge de célérité se remplit 10 % plus vite : plus de frappes bonus." }
    ],
    paths: [
      { id: "faucon", name: "Faucon", tag: "Un tir, au bon moment", nodes: [
        { id: "a_tir_ajuste", img: "images/Icons/talents/archer/a_tir_ajuste.webp",
        name: "Visée posée", short: "Tir précis +15 % crit., +10 % PV",
          effect: "Tir précis a 15 % de chance de critique en plus. +10 % de PV max.",
          stats: { hpPct: 0.10 },
          mods: [{ path: "actions.skill1.critBonus", set: 15 }] },
        { id: "a_marque_chasseur", img: "images/Icons/talents/archer/a_marque_chasseur.webp",
        name: "Marque du chasseur", short: "Tir précis : vulnérable",
          effect: "Tir précis rend la cible vulnérable : +10 % de dégâts subis pendant 2 rounds.",
          mods: [{ path: "actions.skill1.effects", push: { type: "enemyVulnerability", value: 0.10, durationRounds: 2 } }] },
        { id: "a_coup_au_but", img: "images/Icons/talents/archer/a_coup_au_but.webp",
        name: "Coup au but", maxRank: 2, short: "Critique : +10 Conc. (+15)",
          effect: "Un coup critique te donne 10 Concentration au lieu de 4 (15 au rang 2).",
          mods: [{ path: "resource.generation.criticalBonus", set: [10, 15] }] },
        { id: "a_perforation", img: "images/Icons/talents/archer/a_perforation.webp",
        name: "Perforation", maxRank: 2, short: "Tir perforant : 40 (35)",
          effect: "Tir perforant coûte 40 Concentration au lieu de 50 (35 au rang 2).",
          mods: [{ path: "actions.skill3.resourceCost", set: [40, 35] }] },
        { id: "a_tir_mortel", img: "images/Icons/talents/archer/a_tir_mortel.webp",
        name: "Tir mortel", key: true, short: "Critique : recharge −1",
          effect: "Chaque coup critique réduit d'un round la recharge de Tir perforant." }
      ] },
      { id: "ombre", name: "Ombre", tag: "Esquiver pour frapper", nodes: [
        { id: "a_pas_de_cote", img: "images/Icons/talents/archer/a_pas_de_cote.webp",
        name: "Pas de côté", short: "Esquive : recharge 3",
          effect: "L'Esquive se recharge en 3 rounds au lieu de 4.",
          mods: [{ path: "actions.defense.cooldownRounds", set: 3 }] },
        { id: "a_contre_tir", img: "images/Icons/talents/archer/a_contre_tir.webp",
        name: "Contre-tir", short: "Esquive → frappe bonus",
          effect: "Chaque coup esquivé déclenche une frappe bonus." },
        { id: "a_transe", img: "images/Icons/talents/archer/a_transe.webp",
        name: "Transe", maxRank: 2, short: "Frappes bonus +20 % (+30 %)",
          effect: "Tes frappes bonus infligent 20 % de dégâts en plus (30 % au rang 2)." },
        { id: "a_nuee_fleches", img: "images/Icons/talents/archer/a_nuee_fleches.webp",
        name: "Nuée de flèches", maxRank: 2, short: "Rafale : 4 coups (5)",
          effect: "Rafale tire 4 coups au lieu de 3 (5 au rang 2).",
          mods: [{ path: "actions.skill2.hits", set: [4, 5] }] },
        { id: "a_danse_ombres", img: "images/Icons/talents/archer/a_danse_ombres.webp",
        name: "Danse des ombres", key: true, short: "Esquive 2 rounds, jauge",
          effect: "L'Esquive dure 2 rounds. Chaque coup esquivé remplit la jauge de célérité de 25 %.",
          mods: [{ path: "actions.defense.effects#evasion.durationRounds", set: 2 }] }
      ] }
    ]
  },

  mage: {
    trunk: [
      { id: "m_reserve", img: "images/Icons/talents/mage/m_reserve.webp",
        name: "Réserve", short: "Mana max 120",
        effect: "Ton Mana maximum passe de 100 à 120.",
        mods: [{ path: "resource.max", set: 120 }] },
      { id: "m_flux", img: "images/Icons/talents/mage/m_flux.webp",
        name: "Flux", short: "+11 Mana par round",
        effect: "Tu regagnes 11 Mana par round au lieu de 8.",
        mods: [{ path: "resource.generation.passivePerRound", set: 11 }] },
      { id: "m_peau_arcane", img: "images/Icons/talents/mage/m_peau_arcane.webp",
        name: "Peau d'arcane", maxRank: 3, short: "+5 % PV max par rang", // H3 : 3 rangs
        effect: "+5 % de PV max par rang.", stats: { hpPct: 0.05 } }
    ],
    paths: [
      { id: "braise", name: "Braise", tag: "Brûler, laisser brûler", nodes: [
        { id: "m_braises_tenaces", img: "images/Icons/talents/mage/m_braises_tenaces.webp",
        name: "Braises tenaces", maxRank: 2, short: "Brûlure : 3 rounds (4)",
          effect: "Brûlure arcanique dure 3 rounds au lieu de 2 (4 au rang 2).",
          mods: [{ path: "actions.skill2.effects#damageOverTime.durationRounds", set: [3, 4] }] },
        { id: "m_combustion", img: "images/Icons/talents/mage/m_combustion.webp",
        name: "Combustion", short: "La brûlure critique",
          effect: "Chaque round de brûlure peut faire un coup critique." },
        { id: "m_attiser", img: "images/Icons/talents/mage/m_attiser.webp",
        name: "Attiser", short: "Éclair : +1 round",
          effect: "Éclair arcanique sur une cible qui brûle : la brûlure dure un round de plus." },
        { id: "m_incendie", img: "images/Icons/talents/mage/m_incendie.webp",
        name: "Incendie", maxRank: 2, short: "Déflagration +25 % (+40 %)",
          effect: "Déflagration inflige 25 % de plus à une cible qui brûle (40 % au rang 2)." },
        { id: "m_brasier", img: "images/Icons/talents/mage/m_brasier.webp",
        name: "Brasier", key: true, short: "La brûlure se propage",
          effect: "Quand une cible meurt en brûlant, la brûlure passe à l'ennemi suivant." }
      ] },
      { id: "sceau", name: "Sceau", tag: "La Barrière comme arme", nodes: [
        { id: "m_barriere_vive", img: "images/Icons/talents/mage/m_barriere_vive.webp",
        name: "Barrière vive", maxRank: 2, short: "Absorbe 55 % (65 %)",
          effect: "La Barrière arcanique absorbe 55 % des dégâts au lieu de 40 % (65 % au rang 2).",
          mods: [{ path: "actions.defense.effects#damageAbsorption.value", set: [0.55, 0.65] }] },
        { id: "m_echo_barriere", img: "images/Icons/talents/mage/m_echo_barriere.webp",
        name: "Écho de barrière", short: "Absorbé → Mana",
          effect: "25 % des dégâts absorbés par la Barrière te reviennent en Mana." },
        { id: "m_economie", img: "images/Icons/talents/mage/m_economie.webp",
        name: "Économie", short: "Éclair : 14 Mana",
          effect: "Éclair arcanique coûte 14 Mana au lieu de 18.",
          mods: [{ path: "actions.skill1.resourceCost", set: 14 }] },
        { id: "m_surtension", img: "images/Icons/talents/mage/m_surtension.webp",
        name: "Surtension", maxRank: 2, short: "> 80 Mana : +10 % (+15 %)",
          effect: "Tant que tu as plus de 80 Mana, tu infliges 10 % de dégâts en plus (15 % au rang 2)." },
        { id: "m_surcharge", img: "images/Icons/talents/mage/m_surcharge.webp",
        name: "Surcharge", key: true, short: "La Barrière explose",
          effect: "À la fin de la Barrière, elle explose et inflige 100 % des dégâts qu'elle a absorbés." }
      ] }
    ]
  }
};

/* v3.453.0 : LA VOIE DU COMMANDEMENT (conception Talents v1.1 §4ter, décisions de Seb du 16/10/2026).
   Commune aux trois classes, ouverte à la Crypte (monde `opensAt`) ; 5 nœuds appris dans l'ordre,
   le dernier est sa clé (indépendante des clés de classe). Points partagés avec l'arbre de classe.
   Tous les effets sont des CROCHETS, lus par TalentManager.has(id) dans companion-system. */
var TALENT_COMMAND = {
  id: "commandement", name: "Commandement", tag: "Mener tes compagnons", opensAt: 3,
  nodes: [
    { id: "c_serrez_rangs", img: "images/Icons/talents/command/c_serrez_rangs.webp",
      name: "Serrez les rangs", short: "Compagnons : +8 % PV",
      effect: "Tes compagnons ont 8 % de PV en plus." },
    { id: "c_mon_signal", img: "images/Icons/talents/command/c_mon_signal.webp",
      name: "À mon signal", short: "Compagnons : +10 % dégâts",
      effect: "Tes compagnons frappent 10 % plus fort." },
    { id: "c_charge_plus", img: "images/Icons/talents/command/c_charge_plus.webp",
      name: "Une charge de plus", short: "+1 charge par combat",
      effect: "Les compétences à charges de tes compagnons en ont une de plus par combat (Wenna : 4 soins, Ysolt : 2)." },
    { id: "c_personne_terre", img: "images/Icons/talents/command/c_personne_terre.webp",
      name: "Personne ne reste à terre", short: "KO : retour à 50 % PV",
      effect: "Un compagnon tombé revient au combat suivant avec la moitié de ses PV." },
    { id: "c_relais", img: "images/Icons/talents/command/c_relais.webp",
      name: "Relais", key: true, short: "Compétence → +40 % au coup suivant",
      effect: "Quand un compagnon utilise sa compétence, ta prochaine attaque de base fait 40 % de dégâts en plus." }
  ]
};

/* Chiffres des crochets (un seul endroit à régler au banc). */
var TALENT_VALUES = {
  k_sang_chaud: 25,          // Rage minimale à l'ouverture d'un combat
  k_rancune_pct: 0.15, k_rancune_max: 10,
  k_riposte_pct: [0.30, 0.45], // H3 : tableau = valeur par rang
  k_bastion_rage_mult: 2,
  k_soif_bourreau: [20, 30],
  a_rythme: 0.10,            // remplissage de jauge
  a_transe: [0.20, 0.30],    // dégâts des frappes bonus
  a_danse_gauge: 25,
  m_incendie: [0.25, 0.40],
  m_echo_pct: 0.25,
  m_surtension_seuil: 80, m_surtension: [0.10, 0.15],
  m_surcharge_pct: 1.0,
  c_serrez_rangs: 0.08,      // v3.453.0 : Commandement (au banc)
  c_mon_signal: 0.10,
  c_charge_plus: 1,
  c_personne_terre: 0.5,
  c_relais: 0.40
};

window.TALENT_TREES = TALENT_TREES;
window.TALENT_VALUES = TALENT_VALUES;
window.TALENT_COMMAND = TALENT_COMMAND;
window.TALENT_TRUNK_GATE = TALENT_TRUNK_GATE;
window.TALENT_KEY_GATE = TALENT_KEY_GATE;
