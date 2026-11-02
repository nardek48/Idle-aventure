"use strict";
/* data/village-events.js — v3.604.0 (événements du village, E1 validé par Seb le 31/10 ; atelier evenements-village) :
   « Ce matin à Aeswyn ». Un événement à la fois, tiré à l'aube (systems/village-event-system.js), 2 jours de jeu.
   Types : rumeur (un lieu de la carte rapporte plus), demande (livrer), marche (l'échoppe), fete (pain contre soin et or).
   Textes intégrés avant relecture (accord de Seb) ; {lieu} = le secteur choisi à l'aube. Littéraux pour l'audit i18n. */

var VILLAGE_EVENT_DAYS = 2;           // durée, en jours de jeu
var VILLAGE_EVENT_CHANCE = 0.5;       // chance qu'une aube sans événement en amène un
var VILLAGE_EVENT_SCALE = [1, 1.5, 2, 2.5, 3, 3.5]; // quantités demandées selon le monde où vit le héros
var VILLAGE_EVENT_RUMOR = { lootMult: 1.5, rare: 2 };     // la Petite Aventure du lieu de la rumeur
var VILLAGE_EVENT_MARKET = { discount: 0.8, extra: 1 };   // l'échoppe pendant le marché
var VILLAGE_EVENT_RUMOR2 = { lootMult: 1.75, rare: 3 };   // v3.607.0 : la deuxième rumeur, plus loin et plus riche
var VILLAGE_EVENT_PALISADE = 0.15;                        // v3.607.0 : « Le compte est juste », frein de la Palissade en plus
var VILLAGE_EVENT_FETE = { goldMult: 1.25, sorties: 3 };  // la fête : soin du camp, puis l'or des sorties suivantes
var VILLAGE_EVENT_BUYBACK = { lot: 5, maxLots: 10, // v3.606.0 (D2) : Sarkel rachète les ressources rares pendant son marché
  prices: { seve_aeswyn: 20, verre_des_dunes: 40, pierre_errante: 80, cire_sepulcre: 130, cendre_vive: 220 } }; // banc : le quart de l'or d'une Petite Aventure, par unité rapportée
var VILLAGE_EVENT_DEMAND_MULT = 1.5; // une demande paie 1,5 fois un contrat de Taverne (banc : quantités du haut d'un contrat)
var VILLAGE_EVENT_ICONS = { rumeur: "images/Icons/village_events/event_rumeur.webp", demande: "images/Icons/village_events/event_demande.webp",
  cadeau: "images/Icons/village_events/event_cadeau.webp", palissade: "images/Icons/village_events/event_palissade.webp", // v3.607.0 : les suites
  marche: "images/Icons/village_events/event_marche.webp", fete: "images/Icons/village_events/event_fete.webp" };

function villageEventsData() {
  return [
    /* ---------- Rumeurs de Taverne ---------- */
    { id: "r_harde", type: "rumeur", who: _t("Rumeur de Taverne"), title: _t("Une harde à {lieu}"), text: _t("« On dit qu'une harde s'est couchée près de {lieu}. Les bêtes y sont grasses, et pas farouches. »"), next: "s_rumeur2" },
    { id: "r_cache", type: "rumeur", who: _t("Rumeur de Taverne"), title: _t("Une cache à {lieu}"), text: _t("« Un colporteur a laissé un sac à {lieu}. Il n'est jamais revenu le chercher. »"), next: "s_rumeur2" },
    { id: "r_lueur", type: "rumeur", who: _t("Rumeur de Taverne"), title: _t("Une lueur à {lieu}"), text: _t("« Quelqu'un a vu une lueur à {lieu}, la nuit dernière. Pas un feu. Autre chose. »"), next: "s_rumeur2" },
    { id: "r_passage", type: "rumeur", who: _t("Rumeur de Taverne"), title: _t("Un passage à {lieu}"), text: _t("« Le chemin de {lieu} est dégagé, pour une fois. Ça ne durera pas. »"), next: "s_rumeur2" },
    { id: "r_nid", type: "rumeur", who: _t("Rumeur de Taverne"), title: _t("Un nid à {lieu}"), text: _t("« Les chasseurs parlent d'un nid à {lieu}. Ils parlent beaucoup. Ils n'y vont pas. »"), next: "s_rumeur2" },
    { id: "r_pluie", type: "rumeur", who: _t("Rumeur de Taverne"), title: _t("Après l'orage, {lieu}"), text: _t("« L'orage a tout lavé du côté de {lieu}. Ce qui était enterré est remonté. »"), next: "s_rumeur2" },
    /* ---------- Demandes des anciens ---------- */
    { id: "d_brannoc_fer", type: "demande", who: _t("Demande de Brannoc"), title: _t("Le fer de la forge"), text: _t("« Il me faut du fer avant que le froid prenne. Après, je ne pourrai plus chauffer assez. »"), res: { fer: 80 }, gain: { lingot: 2 }, next: "s_lame" },
    { id: "d_brannoc_bois", type: "demande", who: _t("Demande de Brannoc"), title: _t("Le charbon de bois"), text: _t("« Du bois sec. Beaucoup. Le feu de la forge mange plus que nous tous. »"), res: { bois: 100 }, gain: { planche: 4 } },
    { id: "d_orwen_ble", type: "demande", who: _t("Demande d'Orwen"), title: _t("Les réserves d'hiver"), text: _t("« Les réserves baissent. Je n'aime pas compter les sacs à l'envers. »"), res: { ble: 110 }, gain: { pain: 3 }, next: "s_fete_orwen" },
    { id: "d_orwen_eau", type: "demande", who: _t("Demande d'Orwen"), title: _t("L'eau des malades"), text: _t("« Wenna n'est pas là, et quelqu'un tousse dans la deuxième maison. De l'eau propre, vite. »"), res: { eau: 110 }, gain: { petite_ration: 2 }, next: "s_orwen_merci" },
    { id: "d_aldric_pierre", type: "demande", who: _t("Demande d'Aldric"), title: _t("Le mur qui penche"), text: _t("« Le mur nord penche de deux doigts. J'ai mesuré. Deux fois. Il faut de la pierre. »"), res: { pierre: 100 }, gain: { bloc: 2 }, next: "s_aldric" },
    { id: "d_aldric_viande", type: "demande", who: _t("Demande d'Aldric"), title: _t("Le compte des repas"), text: _t("« Il manque des repas dans mon registre. Ou de la viande dans le fumoir. L'un des deux. »"), res: { viande: 70 }, gain: { ration: 1 } },
    /* ---------- Marchés de Sarkel ---------- */
    { id: "m_sud", type: "marche", who: _t("Marché de Sarkel"), title: _t("L'étal du sud"), text: _t("« J'ai rapporté des choses du sud. Pas cher. Enfin, pas trop. »") },
    { id: "m_fin", type: "marche", who: _t("Marché de Sarkel"), title: _t("La fin de saison"), text: _t("« Fin de saison : tout doit partir. Moi aussi, d'ailleurs. »") },
    { id: "m_neuf", type: "marche", who: _t("Marché de Sarkel"), title: _t("Une pièce de plus"), text: _t("« Celle-là, je l'ai gardée pour toi. Ne le dis à personne. Je le dis à tout le monde. »") },
    { id: "m_troc", type: "marche", who: _t("Marché de Sarkel"), title: _t("Jour de troc"), text: _t("« Aujourd'hui, je fais un prix. Demain, je me souviendrai de pourquoi je ne le fais jamais. »") },
    { id: "m_caravane", type: "marche", who: _t("Marché de Sarkel"), title: _t("La caravane est passée"), text: _t("« Une caravane m'a laissé ce qu'elle ne pouvait plus porter. Sa perte, ton prix. »") },
    { id: "m_pluie", type: "marche", who: _t("Marché de Sarkel"), title: _t("Marché sous la pluie"), text: _t("« Il pleut, personne ne vient. Alors je baisse les prix. Toi, tu es venu. »") },
    /* ---------- Fêtes ---------- */
    { id: "f_moissons", type: "fete", who: _t("Fête"), title: _t("La fête des moissons"), text: _t("« Orwen a sorti les grandes tables. Il ne manque que le pain. »") },
    { id: "f_feu", type: "fete", who: _t("Fête"), title: _t("La nuit du grand feu"), text: _t("« Ce soir, on allume le grand feu. Pas pour se souvenir. Pour danser autour. »") },
    { id: "f_naissance", type: "fete", who: _t("Fête"), title: _t("Une naissance"), text: _t("« Un enfant est né dans la troisième maison. Le premier depuis l'hiver. Tout le monde veut du pain. »") },
    { id: "f_retour", type: "fete", who: _t("Fête"), title: _t("Le retour des chasseurs"), text: _t("« Les chasseurs sont rentrés tous les trois. Brannoc dit que ça se fête. Aldric dit que ça se compte. »") },
    { id: "f_toit", type: "fete", who: _t("Fête"), title: _t("Le toit de la Halle"), text: _t("« La dernière tuile est posée. Brannoc refuse de descendre de l'échelle avant qu'on trinque. »") },
    { id: "f_printemps", type: "fete", who: _t("Fête"), title: _t("Le premier jour doux"), text: _t("« Il fait doux, ce matin. Personne ne l'a décidé, mais tout le monde a sorti une chaise. »") },
    /* ---------- v3.607.0 (E3, S1) : les suites, jamais tirées au hasard ----------
       Un événement réussi (livré, fête lancée, rumeur jouée) appelle sa suite à l'aube suivante ;
       un marché où l'on a vendu fait revenir Sarkel à l'aube qui suit sa fin. */
    { id: "s_lame", type: "cadeau", suite: true, gift: "equip", giftSlot: "weapon", who: _t("Demande de Brannoc"), title: _t("La lame de Brannoc"), text: _t("« Ton fer est devenu ça. Prends. Je n'ai pas le temps de l'admirer. »") },
    { id: "s_orwen_merci", type: "cadeau", suite: true, gift: { grande_ration: 1, ration: 2 }, who: _t("Demande d'Orwen"), title: _t("Plus personne ne tousse"), text: _t("« Plus personne ne tousse dans la deuxième maison. Tiens, c'est pour la route. »") },
    { id: "s_fete_orwen", type: "fete", suite: true, free: true, who: _t("Fête"), title: _t("La table d'Orwen"), text: _t("« Les réserves sont pleines. Ce soir, c'est moi qui fournis le pain. »") },
    { id: "s_aldric", type: "palissade", suite: true, who: _t("Demande d'Aldric"), title: _t("Le compte est juste"), text: _t("« Le mur est droit. J'ai recompté les pieux. Il n'en manque aucun, pour une fois. »") },
    { id: "s_rumeur2", type: "rumeur", suite: true, rumor2: true, who: _t("Rumeur de Taverne"), title: _t("Plus loin, {lieu}"), text: _t("« Les bêtes de l'autre fois ont filé vers {lieu}. Celles-là sont plus grosses. »") },
    { id: "s_sarkel_retour", type: "marche", suite: true, who: _t("Marché de Sarkel"), title: _t("Sarkel est revenu"), text: _t("« Tu m'as bien vendu, la dernière fois. Je suis revenu avant que tu m'oublies. »") }
  ];
}

window.villageEventsData = villageEventsData;
window.VILLAGE_EVENT_DAYS = VILLAGE_EVENT_DAYS;
window.VILLAGE_EVENT_CHANCE = VILLAGE_EVENT_CHANCE;
window.VILLAGE_EVENT_SCALE = VILLAGE_EVENT_SCALE;
window.VILLAGE_EVENT_RUMOR = VILLAGE_EVENT_RUMOR;
window.VILLAGE_EVENT_MARKET = VILLAGE_EVENT_MARKET;
window.VILLAGE_EVENT_RUMOR2 = VILLAGE_EVENT_RUMOR2;
window.VILLAGE_EVENT_PALISADE = VILLAGE_EVENT_PALISADE;
window.VILLAGE_EVENT_FETE = VILLAGE_EVENT_FETE;
window.VILLAGE_EVENT_DEMAND_MULT = VILLAGE_EVENT_DEMAND_MULT;
window.VILLAGE_EVENT_BUYBACK = VILLAGE_EVENT_BUYBACK;
window.VILLAGE_EVENT_ICONS = VILLAGE_EVENT_ICONS;

/* v3.607.0 (E3, S2) : une phrase du soir au camp par type d'événement en cours (ajoutée aux phrases du soir). */
function villageEventSoirData() {
  return { rumeur: _t("À la Taverne, on parle bas d'un endroit sur la carte. Tout le monde a l'air de savoir lequel."), demande: _t("Un ancien fait le tour des maisons, un sac vide à la main. Il revient avec le même sac, toujours vide."), marche: _t("L'étal de Sarkel est encore ouvert à la lueur d'une lampe. Il marchande avec un chat."), fete: _t("Des tables traînent encore sur la place. Quelqu'un chante, faux, et personne ne l'arrête.") };
}
window.villageEventSoirData = villageEventSoirData;
