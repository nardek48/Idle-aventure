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
      { id: "k_sang_chaud", img: "images/Icons/talents/knight/k_sang_chaud.png",
        name: "Sang chaud", short: "25 Rage au départ",
        effect: "Tu commences chaque combat avec au moins 25 Rage.",
        mods: [{ path: "resource.initial", set: 25 }] },
      { id: "k_cuirasse", img: "images/Icons/talents/knight/k_cuirasse.png",
        name: "Cuirasse", maxRank: 2, short: "+6 % PV max par rang",
        effect: "+6 % de PV max par rang.", stats: { hpPct: 0.06 } },
      { id: "k_colere_froide", img: "images/Icons/talents/knight/k_colere_froide.png",
        name: "Colère froide", short: "Rage par coup : 30 max",
        effect: "La Rage gagnée par coup monte jusqu'à 30 au lieu de 20.",
        mods: [{ path: "resource.generation.maxGainPerHit", set: 30 }] }
    ],
    paths: [
      { id: "rempart", name: "Rempart", tag: "Tenir, encaisser, rendre", nodes: [
        { id: "k_rancune", img: "images/Icons/talents/knight/k_rancune.png",
        name: "Rancune", short: "Coups reçus → Rage",
          effect: "Les dégâts que tu subis te donnent de la Rage : 15 % des dégâts, 10 au plus par coup." },
        { id: "k_garde_vengeresse", img: "images/Icons/talents/knight/k_garde_vengeresse.png",
        name: "Garde vengeresse", short: "Garde : +15 Rage",
          effect: "Activer la Garde te donne 15 Rage.",
          mods: [{ path: "actions.defense.resourceGain", set: 15 }] },
        { id: "k_mur", img: "images/Icons/talents/knight/k_mur.png",
        name: "Mur", short: "Garde : −65 %",
          effect: "La Garde réduit les dégâts de 65 % au lieu de 50 %.",
          mods: [{ path: "actions.defense.effects#damageReduction.value", set: 0.65 }] },
        { id: "k_riposte", img: "images/Icons/talents/knight/k_riposte.png",
        name: "Riposte", short: "Renvoie 30 % bloqués",
          effect: "Pendant la Garde, 30 % des dégâts bloqués sont renvoyés à l'attaquant." },
        { id: "k_bastion", img: "images/Icons/talents/knight/k_bastion.png",
        name: "Bastion", key: true, short: "Garde 2 rounds, Rage ×2",
          effect: "La Garde dure 2 rounds (recharge 4). Pendant la Garde, tes attaques de base donnent le double de Rage.",
          mods: [{ path: "actions.defense.effects#damageReduction.durationRounds", set: 2 },
                 { path: "actions.defense.cooldownRounds", set: 4 }] }
      ] },
      { id: "bourreau", name: "Bourreau", tag: "Préparer, puis achever", nodes: [
        { id: "k_elan", img: "images/Icons/talents/knight/k_elan.png",
        name: "Élan", short: "Frappe lourde : 12 Rage, soin",
          effect: "Frappe lourde coûte 12 Rage au lieu de 18 et te soigne de 2 % de tes PV max.",
          mods: [{ path: "actions.skill1.resourceCost", set: 12 }, { path: "actions.skill1.healMaxHpPct", set: 0.02 }] },
        { id: "k_brise_os", img: "images/Icons/talents/knight/k_brise_os.png",
        name: "Brise-os", short: "Vulnérabilité +30 %",
          effect: "Brise-garde rend l'ennemi vulnérable à +30 % au lieu de +20 %.",
          mods: [{ path: "actions.skill2.effects#enemyVulnerability.value", set: 0.30 }] },
        { id: "k_curee", img: "images/Icons/talents/knight/k_curee.png",
        name: "Curée", short: "Exécution dès 45 %",
          effect: "Exécution est utilisable dès que l'ennemi passe sous 45 % de ses PV (au lieu de 35 %).",
          mods: [{ path: "actions.skill3.conditions.enemyHpPercentBelowOrEqual", set: 0.45 }] },
        { id: "k_soif_bourreau", img: "images/Icons/talents/knight/k_soif_bourreau.png",
        name: "Soif du bourreau", short: "Ennemi tué : +20 Rage",
          effect: "Tuer un ennemi te rend 20 Rage. Utile dans les vagues, les donjons et les groupes." },
        { id: "k_sentence", img: "images/Icons/talents/knight/k_sentence.png",
        name: "Sentence", key: true, short: "Exécution : recharge 2",
          effect: "Exécution se recharge en 2 rounds au lieu de 4.",
          mods: [{ path: "actions.skill3.cooldownRounds", set: 2 }] }
      ] }
    ]
  },

  archer: {
    trunk: [
      { id: "a_oeil_vif", img: "images/Icons/talents/archer/a_oeil_vif.png",
        name: "Œil vif", maxRank: 2, short: "+4 % critique par rang",
        effect: "+4 % de chance de critique par rang.", stats: { critChance: 4 } },
      { id: "a_souffle_court", img: "images/Icons/talents/archer/a_souffle_court.png",
        name: "Souffle court", short: "Esquive gratuite",
        effect: "L'Esquive ne coûte plus de Concentration (10 → 0).",
        mods: [{ path: "actions.defense.resourceCost", set: 0 }] },
      { id: "a_rythme", img: "images/Icons/talents/archer/a_rythme.png",
        name: "Rythme", short: "Jauge +10 %",
        effect: "La jauge de célérité se remplit 10 % plus vite : plus de frappes bonus." }
    ],
    paths: [
      { id: "faucon", name: "Faucon", tag: "Un tir, au bon moment", nodes: [
        { id: "a_tir_ajuste", img: "images/Icons/talents/archer/a_tir_ajuste.png",
        name: "Visée posée", short: "Tir précis +15 % crit., +10 % PV",
          effect: "Tir précis a 15 % de chance de critique en plus. +10 % de PV max.",
          stats: { hpPct: 0.10 },
          mods: [{ path: "actions.skill1.critBonus", set: 15 }] },
        { id: "a_marque_chasseur", img: "images/Icons/talents/archer/a_marque_chasseur.png",
        name: "Marque du chasseur", short: "Tir précis : vulnérable",
          effect: "Tir précis rend la cible vulnérable : +10 % de dégâts subis pendant 2 rounds.",
          mods: [{ path: "actions.skill1.effects", push: { type: "enemyVulnerability", value: 0.10, durationRounds: 2 } }] },
        { id: "a_coup_au_but", img: "images/Icons/talents/archer/a_coup_au_but.png",
        name: "Coup au but", short: "Critique : +10 Conc.",
          effect: "Un coup critique te donne 10 Concentration au lieu de 4.",
          mods: [{ path: "resource.generation.criticalBonus", set: 10 }] },
        { id: "a_perforation", img: "images/Icons/talents/archer/a_perforation.png",
        name: "Perforation", short: "Tir perforant : 40",
          effect: "Tir perforant coûte 40 Concentration au lieu de 50.",
          mods: [{ path: "actions.skill3.resourceCost", set: 40 }] },
        { id: "a_tir_mortel", img: "images/Icons/talents/archer/a_tir_mortel.png",
        name: "Tir mortel", key: true, short: "Critique : recharge −1",
          effect: "Chaque coup critique réduit d'un round la recharge de Tir perforant." }
      ] },
      { id: "ombre", name: "Ombre", tag: "Esquiver pour frapper", nodes: [
        { id: "a_pas_de_cote", img: "images/Icons/talents/archer/a_pas_de_cote.png",
        name: "Pas de côté", short: "Esquive : recharge 3",
          effect: "L'Esquive se recharge en 3 rounds au lieu de 4.",
          mods: [{ path: "actions.defense.cooldownRounds", set: 3 }] },
        { id: "a_contre_tir", img: "images/Icons/talents/archer/a_contre_tir.png",
        name: "Contre-tir", short: "Esquive → frappe bonus",
          effect: "Chaque coup esquivé déclenche une frappe bonus." },
        { id: "a_transe", img: "images/Icons/talents/archer/a_transe.png",
        name: "Transe", short: "Frappes bonus +20 %",
          effect: "Tes frappes bonus infligent 20 % de dégâts en plus." },
        { id: "a_nuee_fleches", img: "images/Icons/talents/archer/a_nuee_fleches.png",
        name: "Nuée de flèches", short: "Rafale : 4 coups",
          effect: "Rafale tire 4 coups au lieu de 3.",
          mods: [{ path: "actions.skill2.hits", set: 4 }] },
        { id: "a_danse_ombres", img: "images/Icons/talents/archer/a_danse_ombres.png",
        name: "Danse des ombres", key: true, short: "Esquive 2 rounds, jauge",
          effect: "L'Esquive dure 2 rounds. Chaque coup esquivé remplit la jauge de célérité de 25 %.",
          mods: [{ path: "actions.defense.effects#evasion.durationRounds", set: 2 }] }
      ] }
    ]
  },

  mage: {
    trunk: [
      { id: "m_reserve", img: "images/Icons/talents/mage/m_reserve.png",
        name: "Réserve", short: "Mana max 120",
        effect: "Ton Mana maximum passe de 100 à 120.",
        mods: [{ path: "resource.max", set: 120 }] },
      { id: "m_flux", img: "images/Icons/talents/mage/m_flux.png",
        name: "Flux", short: "+11 Mana par round",
        effect: "Tu regagnes 11 Mana par round au lieu de 8.",
        mods: [{ path: "resource.generation.passivePerRound", set: 11 }] },
      { id: "m_peau_arcane", img: "images/Icons/talents/mage/m_peau_arcane.png",
        name: "Peau d'arcane", maxRank: 2, short: "+5 % PV max par rang",
        effect: "+5 % de PV max par rang.", stats: { hpPct: 0.05 } }
    ],
    paths: [
      { id: "braise", name: "Braise", tag: "Brûler, laisser brûler", nodes: [
        { id: "m_braises_tenaces", img: "images/Icons/talents/mage/m_braises_tenaces.png",
        name: "Braises tenaces", short: "Brûlure : 3 rounds",
          effect: "Brûlure arcanique dure 3 rounds au lieu de 2.",
          mods: [{ path: "actions.skill2.effects#damageOverTime.durationRounds", set: 3 }] },
        { id: "m_combustion", img: "images/Icons/talents/mage/m_combustion.png",
        name: "Combustion", short: "La brûlure critique",
          effect: "Chaque round de brûlure peut faire un coup critique." },
        { id: "m_attiser", img: "images/Icons/talents/mage/m_attiser.png",
        name: "Attiser", short: "Éclair : +1 round",
          effect: "Éclair arcanique sur une cible qui brûle : la brûlure dure un round de plus." },
        { id: "m_incendie", img: "images/Icons/talents/mage/m_incendie.png",
        name: "Incendie", short: "Déflagration +25 %",
          effect: "Déflagration inflige 25 % de plus à une cible qui brûle." },
        { id: "m_brasier", img: "images/Icons/talents/mage/m_brasier.png",
        name: "Brasier", key: true, short: "La brûlure se propage",
          effect: "Quand une cible meurt en brûlant, la brûlure passe à l'ennemi suivant." }
      ] },
      { id: "sceau", name: "Sceau", tag: "La Barrière comme arme", nodes: [
        { id: "m_barriere_vive", img: "images/Icons/talents/mage/m_barriere_vive.png",
        name: "Barrière vive", short: "Absorbe 55 %",
          effect: "La Barrière arcanique absorbe 55 % des dégâts au lieu de 40 %.",
          mods: [{ path: "actions.defense.effects#damageAbsorption.value", set: 0.55 }] },
        { id: "m_echo_barriere", img: "images/Icons/talents/mage/m_echo_barriere.png",
        name: "Écho de barrière", short: "Absorbé → Mana",
          effect: "25 % des dégâts absorbés par la Barrière te reviennent en Mana." },
        { id: "m_economie", img: "images/Icons/talents/mage/m_economie.png",
        name: "Économie", short: "Éclair : 14 Mana",
          effect: "Éclair arcanique coûte 14 Mana au lieu de 18.",
          mods: [{ path: "actions.skill1.resourceCost", set: 14 }] },
        { id: "m_surtension", img: "images/Icons/talents/mage/m_surtension.png",
        name: "Surtension", short: "> 80 Mana : +10 %",
          effect: "Tant que tu as plus de 80 Mana, tu infliges 10 % de dégâts en plus." },
        { id: "m_surcharge", img: "images/Icons/talents/mage/m_surcharge.png",
        name: "Surcharge", key: true, short: "La Barrière explose",
          effect: "À la fin de la Barrière, elle explose et inflige 100 % des dégâts qu'elle a absorbés." }
      ] }
    ]
  }
};

/* Chiffres des crochets (un seul endroit à régler au banc). */
var TALENT_VALUES = {
  k_sang_chaud: 25,          // Rage minimale à l'ouverture d'un combat
  k_rancune_pct: 0.15, k_rancune_max: 10,
  k_riposte_pct: 0.30,
  k_bastion_rage_mult: 2,
  k_soif_bourreau: 20,
  a_rythme: 0.10,            // remplissage de jauge
  a_transe: 0.20,            // dégâts des frappes bonus
  a_danse_gauge: 25,
  m_incendie: 0.25,
  m_echo_pct: 0.25,
  m_surtension_seuil: 80, m_surtension: 0.10,
  m_surcharge_pct: 1.0
};

window.TALENT_TREES = TALENT_TREES;
window.TALENT_VALUES = TALENT_VALUES;
window.TALENT_TRUNK_GATE = TALENT_TRUNK_GATE;
window.TALENT_KEY_GATE = TALENT_KEY_GATE;
