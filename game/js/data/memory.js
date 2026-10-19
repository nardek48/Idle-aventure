"use strict";
/* data/memory.js — v3.322.0 (Offrande, conception v1.2) : le niveau de Mémoire remplace l'Ascension.
   L'Aether gagné (Offrandes + Souvenirs) remplit une jauge qui ne se vide jamais
   (game.totalAetherEarned) ; chaque niveau ouvre un choix. v3.358.0 (D7) : plus de solde
   d'Aether, les reprises se paient en or. Valeurs mesurées : sim/offrande-bench.js. */

/* Offrande : Aether rendu selon la rareté seule (les reforges restent à l'emplacement). */
var MEMORY_OFFERING_VALUES = { common: 1, green: 3, rare: 8, epic: 25, legendary: 80 };

/* Souvenirs : l'Aether retient aussi ce que le héros a vécu (O10). */
var MEMORY_SOUVENIRS = {
  storyStep: 1,     // étape d'Histoire terminée
  adventureBoss: 2, // boss d'aventure vaincu
  elite: 3,         // élite vaincue, à chaque fois
  dungeonClear: 3   // run de donjon complet
};

/* Coût de chaque niveau (O11), mesuré au banc : Forêt 5/8/11/14, Désert 20/25/30/35.
   v3.453.0 : règle O16 (sim/offrande-bench.js, N = 14 runs du donjon du monde) — Ruines 35/44/52/62,
   Crypte 77/99/116/138 (provisoire : seul l'acte I existe, ses aventures sont comptées comme aux Ruines). */
var MEMORY_LEVEL_COSTS = [5, 8, 11, 14, 20, 25, 30, 35, 35, 44, 52, 62, 77, 99, 116, 138];
var MEMORY_LEVELS_PER_WORLD = 4;        // O6 : plafond par monde atteint
var MEMORY_REPRISE_BASE_COST = 500;     // O5 : reprise d'un choix, ×3 à chaque fois ; v3.358.0 : en or (10 Aether × AETHER_GOLD_RATE)
var MEMORY_REPRISE_MULT = 3;
var MEMORY_CUISINE_PETITE_RATION_MULT = 1.25; // Cuisine de campagne : +25 % sur la Petite ration seule (décision Seb)
/* v3.453.0 : chiffres des niveaux 9 à 16 (conception Mémoire Ruines-Crypte v1.0), au banc. */
var MEMORY_VALUES = {
  achever_net_rise: 0.25,     // un ennemi qui se relève revient avec 25 % de ses PV au lieu de 50 %
  trait_sur_cooldown: 1,      // Le dernier trait : recharge 1 round au lieu de 2
  ce_qui_reste_keep: 0.75,    // fuite : 75 % du butin au lieu de 50 %
  tout_ou_rien_mult: 1.15,    // sortie réussie : +15 % de butin (or et ressources)
  taille_rapide_mult: 2,      // Clé de voûte taillée deux fois plus vite
  sommeil_lourd_rounds: 1,    // réveil seul un round plus tard
  reveil_brutal_mult: 0.25,   // le coup qui réveille : +25 %
  pas_encore_rounds: 3,       // Pas encore : 3 rounds au lieu de 2
  main_offrante_mult: 1.5,    // Offrande : +50 % d'Aether
  butin_des_morts: 0.25,      // dormeur réveillé puis vaincu : +25 % d'or (s'ajoute au choix « portent »)
  rien_ne_dort_pct: 15        // dormeur réveillé puis vaincu : 15 % de chances d'un objet
};

/* Les huit niveaux (conception v1.2 §5.3-5.4). `id` est la clé lue par MemoryManager.has().
   Icônes : images/Icons/memory/<id>.png, à générer (icône générique en attendant, règle Seb). */
var MEMORY_LEVELS = [
  { level: 1, theme: "Confort", options: [
    { id: "sac_profond", name: "Sac profond", icon: "images/Icons/memory/sac_profond.png",
      desc: "Ton sac passe de 25 à 50 places." },
    { id: "reserve_alchimiste", name: "Réserve d'alchimiste", icon: "images/Icons/memory/reserve_alchimiste.png",
      desc: "Tu peux garder jusqu'à 15 potions de chaque sorte au lieu de 9." }
  ] },
  { level: 2, theme: "Façon de jouer", options: [
    { id: "grimoire_etendu", name: "Grimoire étendu", icon: "images/Icons/memory/grimoire_etendu.png",
      desc: "Une règle active de plus dans le Grimoire." },
    { id: "repos_camp", name: "Repos du camp", icon: "images/Icons/memory/repos_camp.png",
      desc: "Tu récupères 50 % plus vite au Campement, et jusqu'à 75 % de tes PV hors ligne au lieu de 50 %." }
  ] },
  /* v3.323.0 (décision Seb) : la Fiole de réserve quitte le niveau 3 — au banc elle portait le
     Chevalier de 67 à 92 % sur le sphinx. Elle ira aux Ruines (niveaux 9 à 12), où le calibrage
     la supposera acquise ; le crochet getSortiePotionCap() reste en place pour elle. */
  { level: 3, theme: "Entre deux combats", options: [
    { id: "fidelite_wenna", name: "Fidélité de Wenna", icon: "images/Icons/memory/fidelite_wenna.png",
      desc: "Après un KO, Wenna revient au combat suivant avec tous ses PV au lieu de 30 %." },
    { id: "cuisine_campagne", name: "Cuisine de campagne", icon: "images/Icons/memory/cuisine_campagne.png",
      desc: "Les Petites rations soignent 25 % de plus au Campement (35 % → 43 % des PV)." }
  ] },
  { level: 4, theme: "La Mémoire", jalon: true, options: [
    { id: "memoire_vive", name: "Mémoire vive", icon: "images/Icons/memory/memoire_vive.png",
      desc: "+25 % sur tout l'Aether que tu gagnes." },
    { id: "echo_faille", name: "Écho de la faille", icon: "images/Icons/memory/echo_faille.png",
      desc: "+50 % d'Éclats à chaque run de donjon." },
    { id: "recolte", name: "Récolte", icon: "images/Icons/memory/recolte.png",
      desc: "+1 matériau de monde à chaque Petite Aventure réussie." }
  ] },
  { level: 5, theme: "La soif", options: [
    { id: "seconde_gorgee", name: "Seconde gorgée", icon: "images/Icons/memory/seconde_gorgee.png",
      desc: "Deux gorgées de gourde par run au Désert au lieu d'une." },
    { id: "outre_cuir", name: "Outre de cuir", icon: "images/Icons/memory/outre_cuir.png",
      desc: "L'Outre pleine rend 50 % de Souffle en plus." }
  ] },
  { level: 6, theme: "Le marché", options: [
    { id: "oeil_marchand", name: "Œil du marchand", icon: "images/Icons/memory/oeil_marchand.png",
      desc: "Actualiser la vitrine de l'échoppe coûte moitié prix." },
    { id: "etal_garni", name: "Étal garni", icon: "images/Icons/memory/etal_garni.png",
      desc: "Un objet de plus dans la vitrine de l'échoppe." }
  ] },
  { level: 7, theme: "Maddoc", options: [
    { id: "fidelite_maddoc", name: "Fidélité de Maddoc", icon: "images/Icons/memory/fidelite_maddoc.png",
      desc: "Après un KO, Maddoc revient au combat suivant avec tous ses PV au lieu de 30 %." },
    { id: "voie_libre", name: "Voie libre", icon: "images/Icons/memory/voie_libre.png",
      desc: "Un changement de voie de Maddoc gratuit par jour. Les suivants gardent leur prix." }
  ] },
  { level: 8, theme: "Le verre et le fer", jalon: true, options: [
    { id: "main_forgeron", name: "Main du forgeron", icon: "images/Icons/memory/main_forgeron.png",
      desc: "Les reforges coûtent 25 % d'or en moins." },
    { id: "chitine_fendue", name: "Chitine fendue", icon: "images/Icons/memory/chitine_fendue.png",
      desc: "Une Chitine des profondeurs de plus à chaque victoire sur le Dard." },
    { id: "regard_marchand", name: "Regard du marchand", icon: "images/Icons/memory/regard_marchand.png",
      desc: "Les objets Inhabituels peuvent occuper jusqu'à 40 % de la vitrine au lieu de 25 %." }
  ] },
  /* v3.453.0 : niveaux 9 à 16 (Ruines, Crypte), option C de Seb (16/10/2026) — chaque niveau oppose
     Garder (`side: "garder"`) à Donner (`side: "donner"`). Au jalon, la LIGNE (`line`) ne s'ouvre que si
     les trois niveaux précédents du monde ont été pris du même côté ; ligne cassée = effet éteint,
     le jalon se rechoisit sans frais (MemoryManager.lineOpen, isLineBroken). */
  { level: 9, theme: "La relève", options: [
    { id: "fiole_reserve", side: "garder", name: "Fiole de réserve", icon: "images/Icons/memory/fiole_reserve.png",
      desc: "Une potion de soin de plus emportée en sortie." },
    { id: "achever_net", side: "donner", name: "Achever net", icon: "images/Icons/memory/achever_net.png",
      desc: "Un ennemi qui se relève ne revient qu'avec 25 % de ses PV au lieu de 50 %." }
  ] },
  { level: 10, theme: "Les murs", options: [
    { id: "craie_epaisse", side: "garder", name: "Craie épaisse", icon: "images/Icons/memory/craie_epaisse.png",
      desc: "Un trait de Craie de plus par Petite Aventure." },
    { id: "pierre_de_plus", side: "donner", name: "Pierre de plus", icon: "images/Icons/memory/pierre_de_plus.png",
      desc: "+1 Pierre errante à chaque destination atteinte aux Ruines." }
  ] },
  { level: 11, theme: "Edda", options: [
    { id: "fidelite_edda", side: "garder", name: "Fidélité d'Edda", icon: "images/Icons/memory/fidelite_edda.png",
      desc: "Après un KO, Edda revient au combat suivant avec tous ses PV." },
    { id: "trait_sur", side: "donner", name: "Trait sûr", icon: "images/Icons/memory/trait_sur.png",
      desc: "Le dernier trait se recharge en 1 round au lieu de 2." }
  ] },
  { level: 12, theme: "La pierre qui tient", jalon: true, options: [
    { id: "cle_econome", side: "garder", name: "Clé économe", icon: "images/Icons/memory/cle_econome.png",
      desc: "La Forge 4 et les reforges 7 et 8 demandent une Clé de voûte de moins (jamais moins d'une)." },
    { id: "taille_rapide", side: "donner", name: "Taille rapide", icon: "images/Icons/memory/taille_rapide.png",
      desc: "Les Clés de voûte se taillent deux fois plus vite." },
    { id: "ce_qui_reste", line: "garder", name: "Ce qui reste", icon: "images/Icons/memory/ce_qui_reste.png",
      desc: "Quand tu fuis une sortie, tu gardes 75 % du butin au lieu de 50 %." },
    { id: "tout_ou_rien", line: "donner", name: "Tout ou rien", icon: "images/Icons/memory/tout_ou_rien.png",
      desc: "Le butin des sorties réussies augmente de 15 %." }
  ] },
  { level: 13, theme: "Le sommeil", options: [
    { id: "sommeil_lourd", side: "garder", name: "Sommeil lourd", icon: "images/Icons/memory/sommeil_lourd.png",
      desc: "Un dormeur se lève seul un round plus tard (4 à 6)." },
    { id: "reveil_brutal", side: "donner", name: "Réveil brutal", icon: "images/Icons/memory/reveil_brutal.png",
      desc: "Un dormeur que tu réveilles prend 25 % de dégâts en plus à ce premier coup." }
  ] },
  { level: 14, theme: "La lanterne", options: [
    { id: "meche_longue", side: "garder", name: "Mèche longue", icon: "images/Icons/memory/meche_longue.png",
      desc: "La Lanterne de la Petite Aventure de la Crypte éclaire deux pas de plus." },
    { id: "cire_chaude", side: "donner", name: "Cire chaude", icon: "images/Icons/memory/cire_chaude.png",
      desc: "+1 Cire de sépulcre à chaque destination atteinte à la Crypte." }
  ] },
  // v3.455.0 : si Ysolt se recouche (choix « ysolt » = garder), ce niveau se reprend une fois sans frais
  { level: 15, theme: "Ysolt", freeRepriseOnChoice: { key: "ysolt", value: "garder" }, options: [
    { id: "fidelite_ysolt", side: "garder", name: "Fidélité d'Ysolt", icon: "images/Icons/memory/fidelite_ysolt.png",
      desc: "Après un KO, Ysolt revient au combat suivant avec tous ses PV." },
    { id: "pas_encore_encore", side: "donner", name: "Pas encore, encore", icon: "images/Icons/memory/pas_encore_encore.png",
      desc: "Pas encore repousse le réveil de 3 rounds au lieu de 2." }
  ] },
  { level: 16, theme: "Ceux qui sont montés", jalon: true, options: [
    { id: "main_offrante", side: "garder", name: "Main offrante", icon: "images/Icons/memory/main_offrante.png",
      desc: "+50 % d'Aether pour les objets offerts." },
    { id: "butin_des_morts", side: "donner", name: "Le butin des morts", icon: "images/Icons/memory/butin_des_morts.png",
      desc: "Un dormeur réveillé puis vaincu rapporte 25 % d'or en plus." },
    { id: "personne_ne_se_leve", line: "garder", name: "Personne ne se lève", icon: "images/Icons/memory/personne_ne_se_leve.png",
      desc: "Une fois par combat, le premier dormeur qui allait se lever seul se rendort." },
    { id: "rien_ne_dort", line: "donner", name: "Rien ne dort pour rien", icon: "images/Icons/memory/rien_ne_dort.png",
      desc: "Un dormeur réveillé puis vaincu a 15 % de chances de laisser un objet." }
  ] }
];

window.MEMORY_OFFERING_VALUES = MEMORY_OFFERING_VALUES;
window.MEMORY_SOUVENIRS = MEMORY_SOUVENIRS;
window.MEMORY_LEVEL_COSTS = MEMORY_LEVEL_COSTS;
window.MEMORY_LEVELS_PER_WORLD = MEMORY_LEVELS_PER_WORLD;
window.MEMORY_REPRISE_BASE_COST = MEMORY_REPRISE_BASE_COST;
window.MEMORY_REPRISE_MULT = MEMORY_REPRISE_MULT;
window.MEMORY_CUISINE_PETITE_RATION_MULT = MEMORY_CUISINE_PETITE_RATION_MULT;
window.MEMORY_LEVELS = MEMORY_LEVELS;
window.MEMORY_VALUES = MEMORY_VALUES;
