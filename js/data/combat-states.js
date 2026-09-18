"use strict";
/* data/combat-states.js — CATALOGUE DES ÉTATS DE COMBAT (v3.251.0, lot B-1).

   Avant, chaque état vivait sous forme de chaînes dispersées dans buildEnemyStatusBarHTML() :
   un title HTML (invisible sur mobile, il faut un survol souris), une icône, parfois un
   compteur. Trois familles très différentes s'y mélangeaient, toutes rendues pareil : ce qui
   arrive au prochain round, ce que l'ennemi porte en permanence, ce que le héros a posé ou
   subit. Une pastille qui exige une action AVAIT LE MÊME POIDS VISUEL qu'un décor.

   Le catalogue est ici pour que l'écran de combat et la feuille d'explication lisent la même
   source, et pour qu'ajouter un état soit une ligne de donnée, pas une branche de rendu.

   Champs :
     famille  "alerte" (au prochain round) | "enemy" (porté par l'ennemi)
              | "mine" (posé par le héros) | "onme" (subi par le héros)
     mot      texte du bandeau, pour la famille "alerte" uniquement — court, il doit tenir
              sur une ligne à deux télégraphes simultanés
     desc     ce que ça fait
     hint     CE QU'ON PEUT FAIRE. C'est le manque principal de l'ancien title, qui décrivait
              toujours l'effet et jamais la réponse.
     teinte   classe CSS optionnelle du bandeau (le soin n'est pas une menace : il annule le
              travail du joueur, d'où une couleur distincte) */

var COMBAT_STATE_ICON = "images/Icons/combat_status/";

var COMBAT_STATES = {
  /* --- Au prochain round --- */
  charge: {
    famille: "alerte", nom: "Charge", icon: COMBAT_STATE_ICON + "charge_incoming.png",
    mot: "Il charge !",
    desc: "Sa prochaine attaque frappe beaucoup plus fort.",
    hint: "Défense, ou une compétence qui contre la charge."
  },
  silence: {
    famille: "alerte", nom: "Silence", icon: COMBAT_STATE_ICON + "silence_incoming.png",
    mot: "Silence !",
    desc: "Il s'apprête à bloquer tes techniques.",
    hint: "Place ta grosse compétence maintenant, avant d'être muselé."
  },
  shieldIncoming: {
    famille: "alerte", nom: "Bouclier", icon: COMBAT_STATE_ICON + "shield_incoming.png",
    mot: "Il se protège !",
    desc: "Il va réduire de moitié les dégâts qu'il subit.",
    hint: "Garde tes gros coups pour après, ou brise le bouclier."
  },
  healIncoming: {
    famille: "alerte", nom: "Soin", icon: COMBAT_STATE_ICON + "heal_incoming.png",
    mot: "Il va se soigner !", teinte: "is-heal",
    desc: "Il récupère une partie de ses PV : ton travail est effacé.",
    hint: "Interromps-le — c'est le télégraphe qui coûte le plus cher."
  },
  doubleStrike: {
    famille: "alerte", nom: "Double frappe", icon: COMBAT_STATE_ICON + "gauge_full.png",
    mot: "Deux frappes !",
    desc: "Sa jauge est pleine : il frappera deux fois au prochain tour.",
    hint: "Soigne-toi avant, ou défends."
  },
  approaching: {
    famille: "alerte", nom: "Il approche", icon: COMBAT_STATE_ICON + "enemy_approaching.png",
    mot: "Il approche",
    desc: "Il n'est pas encore au contact et ne frappe pas — mais il arrive lancé.",
    hint: "Tes tours les plus sûrs : frappe fort maintenant."
  },

  /* --- Porté par l'ennemi --- */
  enraged: {
    famille: "enemy", nom: "Enragé", icon: COMBAT_STATE_ICON + "rage.png",
    iconSuppressed: COMBAT_STATE_ICON + "rage_calmed.png",
    desc: "Plus il perd de PV, plus il frappe fort.",
    hint: "Finis-le vite plutôt que de l'user.",
    descSuppressed: "Sa rage est apaisée pour quelques rounds."
  },
  corrupted: {
    famille: "enemy", nom: "Corrupteur", icon: COMBAT_STATE_ICON + "corruption.png",
    desc: "Chaque coup qu'il te porte réduit tes dégâts, et ça se cumule.",
    hint: "Évite d'encaisser : chaque coup pris te diminue."
  },
  vampiric: {
    famille: "enemy", nom: "Vampirique", icon: COMBAT_STATE_ICON + "vampiric.png",
    desc: "Il se soigne à chaque coup qu'il te porte.",
    hint: "Le laisser frapper, c'est le soigner.",
    descSuppressed: "Son vol de vie est bloqué pour quelques rounds."
  },
  armored: {
    famille: "enemy", nom: "Blindé", icon: COMBAT_STATE_ICON + "armored.png",
    desc: "Il subit en permanence un peu moins de dégâts.",
    hint: "Une compétence de suppression fissure son blindage.",
    descSuppressed: "Son blindage est fissuré pour quelques rounds."
  },
  shieldActive: {
    famille: "enemy", nom: "Bouclier actif", icon: COMBAT_STATE_ICON + "shield_active.png",
    desc: "−50 % sur les dégâts qu'il subit, pour quelques rounds.",
    hint: "Attends la fin plutôt que de gaspiller tes compétences coûteuses."
  },

  /* --- Posé par le héros --- */
  vulnerable: {
    famille: "mine", nom: "Vulnérable", icon: COMBAT_STATE_ICON + "vulnerable.png",
    desc: "Il subit davantage de dégâts — c'est toi qui l'as ouvert.",
    hint: "Enchaîne tes plus gros coups tant que ça dure."
  },
  dot: {
    famille: "mine", nom: "Brûlure arcanique", icon: COMBAT_STATE_ICON + "arcane_burn.png",
    desc: "Il perd des PV à chaque round, sans que tu aies à agir.",
    hint: "Inutile de la réappliquer tant qu'elle court."
  },
  countered: {
    famille: "mine", nom: "Contré", icon: "images/Icons/combat_stats/stat_speed.png",
    desc: "Tu as contré son attaque : elle n'a rien donné.",
    hint: ""
  },

  /* --- Subi par le héros --- */
  silenced: {
    famille: "onme", nom: "Tu es silencié", icon: COMBAT_STATE_ICON + "silenced.png",
    desc: "Tes techniques sont bloquées.",
    hint: "L'attaque de base et la Défense restent disponibles."
  }
};

/* Ordre d'affichage dans la feuille. L'ordre compte : ce qui demande une action d'abord. */
var COMBAT_STATE_FAMILIES = [
  { id: "alerte", titre: "Au prochain round" },
  { id: "enemy", titre: "Ce que porte l'ennemi" },
  { id: "mine", titre: "Ce que tu as posé" },
  { id: "onme", titre: "Ce que tu subis" }
];

/* Au-delà, une pastille « +N » : la rangée ne doit jamais repousser l'image de l'ennemi. */
var COMBAT_STATES_MAX_VISIBLE = 6;

window.COMBAT_STATES = COMBAT_STATES;
window.COMBAT_STATE_FAMILIES = COMBAT_STATE_FAMILIES;
window.COMBAT_STATES_MAX_VISIBLE = COMBAT_STATES_MAX_VISIBLE;
