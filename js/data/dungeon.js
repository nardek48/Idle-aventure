"use strict";
/* ============================================================
Quest Idle — data/dungeon.js
Configuration du donjon : un gauntlet de 15 vagues + un boss final,
séparé de la progression normale des mondes. Voir
systems/dungeon-system.js pour la logique.

v2.16 : le donjon est maintenant découpé en 5 PALIERS choisis par le
joueur (DUNGEON_TIERS ci-dessous), chacun à difficulté FIXE et à
rareté de butin garantie plafonnée. Avant, la difficulté se calait
sur WorldManager.worldIndex (le monde COURANT) — un problème, car ce
compteur retombe à 0 à chaque ascension alors que la puissance du
joueur (bonus d'ascension, boutique du donjon, talents...) ne
redescend jamais : le donjon redevenait trivial après quelques
ascensions. Les paliers fixes corrigent ça.
============================================================ */

var DUNGEON_CONFIG = {
  waveCount: 15,              // vagues normales avant le boss (vague 16)
  freeTicketsPerDay: 1,
  ticketResetHours: 24,
  ticketCostEssence: 100,      // prix du premier ticket supplémentaire de la journée (valable pour n'importe quel palier)
  ticketCostGrowth: 1.2,        // v2.30 : le prix grimpe ×1.2 à chaque achat depuis le début de la journée
  maxTicketPurchasesPerDay: 20, // v2.30 : 10 -> 20 achats par jour max (au-delà, seul le ticket gratuit du lendemain compte)

  // Multiplicateurs de difficulté, appliqués par-dessus la difficulté
  // de base du palier choisi (voir DUNGEON_TIERS.worldPower ci-dessous).
  basePremiumMult: 1.3,        // le donjon est TOUJOURS plus dur qu'un combat normal au même "niveau de monde"
  waveRampMult: 1,             // v2.30 : 1.5 -> 1, intensité additionnelle entre la vague 1 et la vague 15
  bossPremiumMult: 1.8,        // le boss de donjon est nettement plus fort qu'un boss de monde

  // Récompenses
  fullClearGoldBase: 500,      // + bonus par palier/vague, voir DungeonManager.finish
  fullClearEssenceBase: 40,
  partialLootChance: 40,        // % de chance de butin quand même en cas d'échec

  // Monnaie exclusive au donjon (Éclats), gagnée en jouant, dépensable
  // UNIQUEMENT à la boutique du donjon ci-dessous.
  shardsPerWaveCleared: 1,       // gagné à chaque vague passée, succès ou échec
  shardsBossBonus: 10            // bonus supplémentaire si le boss tombe
};

/* Les 5 paliers de donjon, sur le même principe que le déblocage des
   mondes (voir data/worlds.js) :
   - requiredAscension  nombre d'ascensions pour débloquer ce palier
   - maxRarity          rareté du butin GARANTI en fin de palier réussi
                         (et plafond des rareté possibles en cas
                         d'échec partiel) — un palier bas ne peut plus
                         donner de butin au-dessus de sa rareté, même
                         si le joueur a débloqué mieux ailleurs
   - worldPower          "niveau de monde" fixe utilisé pour calibrer
                         la difficulté (remplace l'ancien
                         WorldManager.worldIndex, qui variait) et pour
                         choisir le pool d'ennemis (mondes 0..worldPower) */
/* v2.17 : ajout de difficultyMult, un multiplicateur de difficulté
   PROPRE à chaque palier (en plus de worldPower qui gère surtout le
   pool d'ennemis) — pour que le saut d'un palier à l'autre soit
   vraiment marqué, pas juste une progression linéaire douce. */
var DUNGEON_TIERS = [
  { id: 1, name: "Donjon I",   requiredAscension: 0,  maxRarity: "common",    worldPower: 0, difficultyMult: 1,
    icon: "images/Dungeons/Icone_base/palier1.jpg", // v2.83.9 : icône générique de palier, partagée par tous les donjons
    story: "Les premières salles sentent la terre humide et la mousse. Des bruits de pas résonnent au loin — rien de bien effrayant, pour l'instant." },
  { id: 2, name: "Donjon II",  requiredAscension: 2,  maxRarity: "green",     worldPower: 1, difficultyMult: 2.5,
    icon: "images/Dungeons/Icone_base/palier2.jpg",
    story: "Les couloirs se resserrent. Des ombres inhabituelles glissent entre les pierres, et l'air se charge d'une tension nouvelle." },
  { id: 3, name: "Donjon III", requiredAscension: 4,  maxRarity: "rare",      worldPower: 2, difficultyMult: 6,
    icon: "images/Dungeons/Icone_base/palier3.jpg",
    story: "Un froid ancien s'infiltre jusque dans les os. Ces lieux ne sont pas laissés à l'abandon — quelque chose les garde, avec méthode." },
  { id: 4, name: "Donjon IV",  requiredAscension: 8,  maxRarity: "epic",      worldPower: 3, difficultyMult: 14,
    icon: "images/Dungeons/Icone_base/palier4.jpg",
    story: "Les murs eux-mêmes semblent respirer. Peu de ceux qui s'aventurent ici en ressortent sans égratignures — et encore moins sans butin." },
  { id: 5, name: "Donjon V",   requiredAscension: 15, maxRarity: "legendary", worldPower: 5, difficultyMult: 30,
    icon: "images/Dungeons/Icone_base/palier5.jpg",
    story: "Le seuil du dernier palier. Une puissance oubliée sommeille dans l'obscurité — et elle sait déjà que tu es arrivé." }
];

/* Boutique exclusive du donjon, payée en Éclats (game.dungeonShards).
   Mêmes principes que AETHER_SHOP (data/upgrades.js) : achats par
   niveau, coût croissant, bonus permanent appliqué dans
   StatsSystem.recalcStats(). */
var DUNGEON_SHOP = [
  { id: "d_power", name: "Lame du donjon", icon: "⚔️", desc: "+2% dégâts globaux par niveau.", baseCost: 5, costMult: 1.5, maxLevel: 20 },
  { id: "d_gold", name: "Trésor du donjon", icon: "💰", desc: "+2% or global par niveau.", baseCost: 5, costMult: 1.5, maxLevel: 20 },
  { id: "d_essence", name: "Essence du donjon", icon: "images/Icons/essence_icon.png", desc: "+2% essence globale par niveau.", baseCost: 5, costMult: 1.5, maxLevel: 20 }
];

/* v2.83.6 : regroupement des paliers par DONJON, pour préparer l'ajout
   de futurs donjons distincts (chacun avec ses 5 paliers). Ne fait que
   RÉFÉRENCER les paliers existants par id (tierIds) — DUNGEON_TIERS
   reste la seule source de vérité pour le contenu des paliers,
   DungeonManager n'a besoin d'aucune modification. `locked` : condition
   d'affichage uniquement (pas encore de vrai déblocage multi-donjon
   tant qu'il n'y en a qu'un — à définir quand un 2e donjon arrive). */
var DUNGEONS = [
  {
    id: "basilic",
    name: "Tanière du Basilic",
    icon: "images/Dungeons/donjon_poison/donjon_poison.jpg",
    banner: "images/Dungeons/donjon_poison/donjon_poison_baniere.jpg",
    combatMap: "../images/Dungeons/donjon_poison/donjon_poison.jpg", // v2.83.12 : fond affiché pendant les tentatives dans ce donjon (voir DungeonManager.applyDungeonTheme) — "../" nécessaire ici, cf. combatMap des mondes dans data/worlds.js (résolu depuis css/01-base.css, pas depuis index.html)
    desc: "Un antre reptilien tapi sous la roche — cinq paliers de danger croissante, jusqu'au repaire du Basilic lui-même.",
    tierIds: [1, 2, 3, 4, 5],
    locked: false
  }
];

window.DUNGEONS = DUNGEONS;

window.DUNGEON_CONFIG = DUNGEON_CONFIG;
window.DUNGEON_TIERS = DUNGEON_TIERS;
window.DUNGEON_SHOP = DUNGEON_SHOP;
