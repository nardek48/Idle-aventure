"use strict";
/* data/hunt-quests.js — v3.135.0 : desc bois/fer/pierre réécrites (plus « réservé aux futures constructions », audit Forêt §3.5).
   Chasses "de boucle" (lots de kills relancés automatiquement) + catalogue ressources Entrepôt.
   v3.114.0 : sellPrice des ressources BRUTES abaissés (viande 3→2, blé/bois/pierre 2→1, fer 5→3) —
   la vente de production idle doit rester moins rentable que le jeu actif (décision Seb) ;
   les prix des ressources CRAFTÉES sont inchangés (la transformation reste valorisante).
   Logique : systems/hunt-quest-system.js. Détail complet : COMMENTAIRES_ORIGINAUX.md */

/* v3.218.0 (lot V-7) : chaque niveau de l'« Entrepôt agrandi » ajoute ceci au
   plafond de CHAQUE ressource fabriquée. 999 → 3 499 au niveau 10. */
var WAREHOUSE_CAP_PER_LEVEL = 250;
/* Option B (Seb, 27/10) : au-delà du niveau 10, chaque niveau ajoute 500 (6 000 brutes à l'Entrepôt 16, Montagne). */
var WAREHOUSE_CAP_HIGH_FROM = 10, WAREHOUSE_CAP_PER_LEVEL_HIGH = 500;
function getWarehouseCapBonus(level) {
  var n = Math.max(0, Math.floor(Number(level) || 0)), low = Math.min(n, WAREHOUSE_CAP_HIGH_FROM);
  return low * WAREHOUSE_CAP_PER_LEVEL + (n - low) * WAREHOUSE_CAP_PER_LEVEL_HIGH;
}

/* v3.330.0 (économie du village, décision E1 de Seb) : les ressources BRUTES plafonnent aussi.
   500 de base, + WAREHOUSE_CAP_PER_LEVEL par niveau d'Entrepôt (1 250 au plafond de la Forêt,
   2 000 au Désert). Un stock déjà au-dessus est conservé (a1) : rien ne rentre tant qu'on y est. */
var RAW_STOCK_BASE = 500;

var WAREHOUSE_RESOURCES = {
  viande: { id: "viande", name: "Viande", icon: "images/Icons/resources/meat_icon.webp", desc: "Produite au bâtiment Chasse ; les patrouilles en rapportent aussi.", sellPrice: 2, tier: "raw" },
  ble: { id: "ble", name: "Blé", icon: "images/Icons/resources/wheat_icon.webp", desc: "Récolté au bâtiment Champs.", sellPrice: 1, tier: "raw" },
  bois: { id: "bois", name: "Bois", icon: "images/Icons/resources/wood_icon.webp", desc: "Coupé à la Scierie. Sert aux zones de production, aux planches et aux fondations du village.", sellPrice: 1, tier: "raw" },
  fer: { id: "fer", name: "Fer", icon: "images/Icons/resources/iron_icon.webp", desc: "Extrait à la Mine. Sert aux zones de production et aux lingots de la Fonderie.", sellPrice: 3, tier: "raw" },
  pierre: { id: "pierre", name: "Pierre", icon: "images/Icons/resources/stone_icon.webp", desc: "Extraite à la Carrière. Sert aux zones de production, aux sillons irrigués et aux fondations du village.", sellPrice: 1, tier: "raw" },
  eau: { id: "eau", name: "Eau", icon: "images/Icons/resources/water_icon.webp", desc: "Puisée au Puits — ressource la moins chère du village.", sellPrice: 1, tier: "raw" },
  /* v3.484.0 (refonte de l'économie, lot S, RE-8) : Farine, Viande séchée et Eau purifiée retirées ;
     leurs recettes prennent l'équivalent brut (WAREHOUSE_LEGACY_RESOURCES, systems/warehouse-system.js). */
  planche: { id: "planche", name: "Planche", icon: "images/Icons/resources/plank_icon.webp", desc: "Fabriquée à partir de Bois.", sellPrice: 7, tier: "crafted", cap: 999 },
  lingot: { id: "lingot", name: "Lingot", icon: "images/Icons/resources/ingot_icon.webp", desc: "Fabriqué à partir de Fer.", sellPrice: 10, tier: "crafted", cap: 999 },
  /* v3.330.0 (E3) : Bloc taillé, Maçonnerie de la Carrière (ouverte au Désert). Invendable. */
  bloc: { id: "bloc", name: "Bloc taillé", icon: "images/Icons/resources/bloc_taille_icon.webp", desc: "Pierre équarrie et cerclée de fer, à la Maçonnerie de la Carrière. Sert aux constructions du Désert.", sellPrice: 0, tier: "crafted", cap: 999, worldIndex: 1, worldName: "Désert", sourceHint: "Se taille à la Maçonnerie (Carrière), avec de la Pierre et du Fer" },
  /* v3.221.0 (lot V-8) : matériau de reforge. Troisième atelier de tier 2
     activé (Forge de la Mine), et premier débouché du Lingot en dehors de la
     construction. Invendable : c'est un intrant. */
  acier: { id: "acier", name: "Acier", icon: "images/Icons/resources/acier_icon.webp", desc: "Lingot retravaillé à la Forge de la Mine. Sert à reforger l'équipement.", sellPrice: 0, tier: "crafted", cap: 999, sourceHint: "Se forge à la Forge (Mine), à partir de Lingot" },
  // v3.137.0 : desc corrigée — la Boulangerie (Champs), pas l'Atelier de Construction, cuit le Pain.
  pain: { id: "pain", name: "Pain", icon: "images/Icons/resources/bread_icon.webp", desc: "Cuit à la Boulangerie (Champs) à partir de Blé et d'Eau.", sellPrice: 19, tier: "crafted", cap: 999 },
  ration: { id: "ration", name: "Ration moyenne", icon: "images/Icons/resources/ration_icon.webp", desc: "Repas au Campement : restaure 60 % des PV max de toute l'équipe. Vivres pour repartir au Désert, aux Ruines et à la Crypte (chasse, donjon, élite rejouée). Cuisine de camp : 15 Viandes + 1 Pain.", sellPrice: 36, tier: "crafted", cap: 999, healPct: 0.60 },
  petite_ration: { id: "petite_ration", name: "Petite ration", icon: "images/Icons/resources/petite_ration_icon.webp", desc: "Repas au Campement : restaure 35 % des PV max de toute l'équipe. Vivres pour repartir en Forêt (chasse, donjon, élite rejouée). Crafté à la Cuisine de camp à partir de Viande et d'Eau.", sellPrice: 18, tier: "crafted", cap: 999, healPct: 0.35 },
  // v3.137.0 : recette de craft ajoutée (Cuisine de camp : Ration moyenne + 3 Sève d'Aeswyn) — desc mise à jour.
  /* v3.303.0 (W-2, Désert D3) : l'Outre pleine, fabriquée au Réservoir du Puits. Emportée dans
     la préparation d'un parcours du Désert, elle rend du Souffle une fois. Jamais obligatoire.
     v3.304.0 : icône propre (générique en jeu tant qu'elle n'est pas dessinée), plus celle de la gourde. */
  outre_pleine: { id: "outre_pleine", name: "Outre pleine", icon: "images/Icons/resources/outre_pleine_icon.webp", desc: "Se remplit au Réservoir (Puits). Emportée dans un parcours du Désert, elle rend du Souffle une fois.", sellPrice: 20, tier: "crafted", cap: 99 },
  grande_ration: { id: "grande_ration", name: "Grande ration", icon: "images/Icons/resources/grande_ration_icon.webp", desc: "Repas au Campement : restaure 100 % des PV max de toute l'équipe. Cuisine de camp (Chasse) : 1 Ration moyenne + 3 Sève d'Aeswyn → 1.", sellPrice: 60, tier: "crafted", cap: 999, healPct: 1.00 },
  // v3.127.0 (Petites Aventures, Lot PA3) : butin exclusif du scene-engine petite_aventure_foret
  // (voir data/scene-templates.js, exclusiveLoot) — nom + icône validés Seb 03/09/2026.
  // Ressource de collection (tier "special", distinct de raw/crafted) : pas de sellPrice
  // significatif (0, on ne veut pas encourager à la vendre), pas de cap (comme les ressources
  // brutes non plafonnées). v3.137.0 : premier usage de craft (Grande ration) — desc mise à jour.
  // D'autres usages plus marquants (gemmes, enchantement, upgrade d'arme) restent envisagés
  // pour plus tard (décision Seb 04/09/2026, non actée).
  seve_aeswyn: { id: "seve_aeswyn", name: "Sève d'Aeswyn", icon: "images/Icons/resources/seve_aeswyn_icon.webp", desc: "Résine runique rare de la Forêt. Sert à cuisiner la Grande ration et, durcie à la Menuiserie, à bâtir les hauts paliers du village.", sellPrice: 0, tier: "special", sourceHint: "L'Arbre-mère, carte de la Forêt (+2 par victoire, rejouable) · la Tanière du Basilic (+2 par Marque) · Petites Aventures de la Forêt · caravane longue au marché de la Forêt" }, // v3.457.5 (audit C7)
  /* v3.304.0 (W-2) : la ressource rare du Désert, butin exclusif de sa Petite Aventure (mêmes
     points de tirage que la Sève). Il se chauffe en Verre trempé au Tailleur de pierre (v3.312.0). */
  verre_des_dunes: { id: "verre_des_dunes", name: "Verre des dunes", icon: "images/Icons/resources/verre_des_dunes_icon.webp", desc: "Sable fondu par la foudre, lisse comme de l'eau. Trouvé en Petite Aventure du Désert.", sellPrice: 0, tier: "special", sourceHint: "Le Dard des profondeurs, carte du Désert (+2 par victoire, rejouable) · la Cité engloutie (+2 par Marque) · Petites Aventures du Désert · caravane longue au marché du Désert" }, // v3.457.5 (audit C7)
  /* v3.312.0 (W-3c, acte II étape 9) : le matériau de monde du Désert, chauffé au Tailleur de
     pierre. Ses dépenses (hauts paliers du village) viennent avec W-6. Icône à générer. */
  /* v3.317.0 (W-4c, acte III §7) : lâchée par le Dard des profondeurs, ingrédient des reforges
     5 et 6 — la bande que la Forge 3 ouvre. Le Verre trempé CONSTRUIT la Forge, la Chitine
     NOURRIT la reforge : deux matériaux du Désert, deux rôles. */
  chitine_profondeurs: { id: "chitine_profondeurs", name: "Chitine des profondeurs", icon: "images/Icons/resources/chitine_profondeurs_icon.webp", desc: "Une plaque arrachée au dard de la bête. Elle ne chauffe pas : elle boit le feu. On s'en sert pour les dernières reforges.", sellPrice: 0, tier: "crafted", cap: 999, worldIndex: 1, worldName: "Désert", sourceHint: "Le Dard des profondeurs (la bête sous la dune, carte du Désert)" },

  /* v3.428.0 (Ruines, RU7) : la pierre qui bouge d'un Cycle à l'autre. Matériau brut du monde 3 :
     marché de la caravane (acte I), puis chantier errant, Petite Aventure et donjon (acte II).
     Sa forme raffinée, la Clé de voûte, viendra avec la Forge 4 (acte III). Icône à générer. */
  pierre_errante: { id: "pierre_errante", name: "Pierre errante", icon: "images/Icons/resources/pierre_errante_icon.webp", desc: "Une pierre taillée qui n'était pas là hier. Elle vient des Ruines, où rien ne reste en place.", sellPrice: 0, tier: "special", worldIndex: 2, worldName: "Ruines anciennes", sourceHint: "Petites Aventures et carte des Ruines · le Sanctuaire scellé (+2 par Marque) · le Labyrinthe · le chantier errant · caravane longue au Marché des Ruines" },
  /* v3.431.0 (Ruines, acte III §3, RU7) : la forme raffinée de la Pierre errante, taillée au Tailleur
     de pierre. Elle CONSTRUIT la Forge 4 et NOURRIT les reforges 7 et 8. Icône à générer. */
  cle_de_voute: { id: "cle_de_voute", name: "Clé de voûte", icon: "images/Icons/resources/cle_de_voute_icon.webp", desc: "Une pierre taillée en coin, plus large en haut qu'en bas. Elle tient une arche à elle seule. Matériau de la Forge 4, de la Halle 9 et 10 et des reforges 7 à 10.", sellPrice: 0, tier: "crafted", cap: 999, worldIndex: 2, worldName: "Ruines anciennes", sourceHint: "Se taille au Tailleur de pierre (Carrière), à partir de Pierres errantes et de Pierre" },
  /* v3.450.0 (Crypte, CR8, lot C-0) : la cire des morts. Brute : Marché de la Crypte (acte I), puis
     gisants, Petite Aventure et Ossuaire. Raffinée : Forge du palier Épique et dernières reforges (acte III). Icônes à générer. */
  cire_sepulcre: { id: "cire_sepulcre", name: "Cire de sépulcre", icon: "images/Icons/resources/cire_sepulcre_icon.webp", desc: "Un pain de cire blanche, encore tiède. On le trouve là où on a laissé du pain aux morts.", sellPrice: 0, tier: "special", worldIndex: 3, worldName: "Crypte des dormeurs", sourceHint: "Petites Aventures et carte de la Crypte · l'Ossuaire (+2 par Marque) · la veillée d'Aeswyn (morts laissés endormis) · caravane longue au Marché de la Crypte" },
  /* v3.486.0 (Montagne, MT8, lot M-0) : brute = veines taillées (combat, carte, Petites Aventures, donjon, Sarkel) ;
     raffinée = Forge 6 et reforges 11-12 seulement (recette à l'acte III). Icônes dans « Images à faire ». */
  cendre_vive: { id: "cendre_vive", name: "Cendre vive", icon: "images/Icons/resources/cendre_vive_icon.webp", desc: "Un éclat de roche noire qui s'effrite en cendre chaude. Une veine bleue le traverse et bat encore.", sellPrice: 0, tier: "special", worldIndex: 4, worldName: "Montagne brûlante", sourceHint: "Veines taillées à la Montagne : en combat, sur la carte, dans les Petites Aventures et la Gueule du volcan" },
  obsidienne_taillee: { id: "obsidienne_taillee", name: "Obsidienne taillée", icon: "images/Icons/resources/obsidienne_taillee_icon.webp", desc: "Cendre vive fondue puis taillée en barres noires et lisses. Une veine bleue court dedans. Matériau de la Forge de la Montagne et des dernières reforges.", sellPrice: 0, tier: "crafted", cap: 999, worldIndex: 4, worldName: "Montagne brûlante", sourceHint: "Se taille à la Fonderie (Mine), avec de la Cendre vive et de l'Acier" },
  cire_consacree: { id: "cire_consacree", name: "Cire consacrée", icon: "images/Icons/resources/cire_consacree_icon.webp", desc: "Cire de sépulcre fondue et coulée en barres. Elle ne coule plus, même au feu. Matériau du palier Épique de la Forge et des dernières reforges.", sellPrice: 0, tier: "crafted", cap: 999, worldIndex: 3, worldName: "Crypte des dormeurs", sourceHint: "Se coule à partir de Cire de sépulcre (recette à l'acte III de la Crypte)" },
  verre_trempe: { id: "verre_trempe", name: "Verre trempé", icon: "images/Icons/resources/verre_trempe_icon.webp", desc: "Verre des dunes chauffé deux fois au Tailleur de pierre. Il coupe le fer. Matériau de la Forge 3, des hauts paliers des Ruines et des reforges 7 à 10.", sellPrice: 0, tier: "crafted", cap: 999, worldIndex: 1, worldName: "Désert", sourceHint: "Verre des dunes et Pierre chauffés au Tailleur de pierre (Carrière)" },
  /* v3.214.0 (lot V-3) : matériau de construction de la Forêt. Premier des six
     matériaux de monde — c'est lui qui porte le plafond de construction, à la
     place d'un verrou abstrait : un palier qui le demande est de fait
     injoignable avant d'avoir atteint son monde, et le joueur lit une ligne de
     coût avec l'endroit où la trouver. Invendable : ce n'est pas un revenu. */
  resine_durcie: { id: "resine_durcie", name: "Résine durcie", icon: "images/Icons/resources/resine_durcie_icon.webp", desc: "Sève d'Aeswyn durcie à la Menuiserie. Matériau de construction des hauts paliers du village, en Forêt enchantée.", sellPrice: 0, tier: "crafted", cap: 999, worldIndex: 0, worldName: "Forêt enchantée", sourceHint: "Sève d'Aeswyn durcie à la Menuiserie (Scierie)" }
};

/* v3.511.0 (option A, Seb 27/10) : les chasses et les battues sont retirées (onglet Chasse peu utilisé).
   Le moteur (hunt-quest-system.js) reste, inerte sans chasse. */
var HUNT_QUESTS = {};

// v3.106.0 : ordre d'affichage des rations au Campement (petite -> grande).
var RATION_IDS = ["petite_ration", "ration", "grande_ration"];

window.WAREHOUSE_RESOURCES = WAREHOUSE_RESOURCES;
window.WAREHOUSE_CAP_PER_LEVEL = WAREHOUSE_CAP_PER_LEVEL;
window.WAREHOUSE_CAP_HIGH_FROM = WAREHOUSE_CAP_HIGH_FROM;
window.WAREHOUSE_CAP_PER_LEVEL_HIGH = WAREHOUSE_CAP_PER_LEVEL_HIGH;
window.getWarehouseCapBonus = getWarehouseCapBonus;
window.RAW_STOCK_BASE = RAW_STOCK_BASE;
window.HUNT_QUESTS = HUNT_QUESTS;
window.RATION_IDS = RATION_IDS;
