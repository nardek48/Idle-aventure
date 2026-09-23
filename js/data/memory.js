"use strict";
/* data/memory.js — v3.322.0 (Offrande, conception v1.2) : le niveau de Mémoire remplace l'Ascension.
   L'Aether gagné (Offrandes + Souvenirs) remplit une jauge qui ne se vide jamais
   (game.totalAetherEarned) ; chaque niveau ouvre un choix. game.aether reste le solde
   dépensable, qui ne sert plus qu'aux reprises. Valeurs mesurées : sim/offrande-bench.js. */

/* Offrande : Aether rendu selon la rareté seule (les reforges restent à l'emplacement). */
var MEMORY_OFFERING_VALUES = { common: 1, green: 3, rare: 8, epic: 25, legendary: 80 };

/* Souvenirs : l'Aether retient aussi ce que le héros a vécu (O10). */
var MEMORY_SOUVENIRS = {
  storyStep: 1,     // étape d'Histoire terminée
  adventureBoss: 2, // boss d'aventure vaincu
  elite: 3,         // élite vaincue, à chaque fois
  dungeonClear: 3   // run de donjon complet
};

/* Coût de chaque niveau (O11), mesuré au banc : Forêt 5/8/11/14, Désert 20/25/30/35. */
var MEMORY_LEVEL_COSTS = [5, 8, 11, 14, 20, 25, 30, 35];
var MEMORY_LEVELS_PER_WORLD = 4;        // O6 : plafond par monde atteint
var MEMORY_REPRISE_BASE_COST = 10;      // O5 : reprise d'un choix, ×3 à chaque fois
var MEMORY_REPRISE_MULT = 3;
var MEMORY_CUISINE_PETITE_RATION_MULT = 1.25; // Cuisine de campagne : +25 % sur la Petite ration seule (décision Seb)

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
