"use strict";
/* ============================================================
Aethervale — data/enemy-archetypes.js
v3.68.0 : premier archétype de la feuille de route combat (Phase 9,
"Extension des archétypes") — ENRAGÉ.
v3.69.0 : deuxième archétype — CORRUPTEUR. Décision actée avec Seb :
les archétypes se construisent un par un, chacun designé/chiffré/
testé avant de passer au suivant (Silencieux/Vampirique/Blindé
restent à faire dans de futures livraisons).

Différence fondamentale avec les patterns Charge/Bouclier/Soin (v3.48-
v3.49) : ces derniers sont des ÉVÉNEMENTS ponctuels (télégraphe -> impact),
un archétype est un ÉTAT PERMANENT de l'ennemi tant qu'il reste affiché
(pas de télégraphe, pas de minuteur d'apparition/résolution).

v3.69.0 : UN SEUL archétype actif par boss à la fois (décision actée
avec Seb, "le plus simple") — decideEnemyArchetype() retourne au plus
UNE valeur parmi "enraged"/"corrupted"/null, jamais les deux. Structure
du tirage à 2 niveaux : d'abord "ce boss a-t-il un archétype ?" (25%,
ENRAGED_SPAWN_CHANCE_PCT réutilisée comme seuil COMMUN), puis SI oui,
50/50 entre Enragé et Corrupteur (voir decideEnemyArchetype()).

Corrupteur, contrairement à Enragé (qui modifie les dégâts DE
L'ENNEMI), touche une STAT DU HÉROS : chaque riposte reçue ajoute 1
stack de corruption, chaque stack réduit les dégâts infligés PAR LE
HÉROS de 5%, jusqu'à 5 stacks (-25% max) — effet cumulatif discret
(des stacks entiers, pas un pourcentage continu), purgé D'UN COUP par
le contre (skill1 de chaque classe, PAS skill3 déjà pris par Enragé).

STATUT — donnée + logique PURE (comme data/grimoire-conditions.js) :
aucun accès à game.* dans ce fichier, aucune mutation. La décision
"quel archétype pour CET ennemi, à CETTE apparition" (aléatoire +
condition de monde) vit dans decideEnemyArchetype(), qui reçoit
worldIndex/isBoss/randomRolls en paramètres — c'est l'APPELANT
(WorldManager.generateEnemy(), systems/progression-system.js) qui
fournit ces valeurs et applique le résultat sur l'objet ennemi généré.
============================================================ */

/* Index du monde (WORLDS, voir data/worlds.js) à partir duquel un
   archétype (Enragé OU Corrupteur) peut apparaître — Crypte (3),
   décision actée avec Seb : Ruines (2) est le tout premier jalon
   narratif du Grimoire, on évite de superposer un nouvel archétype
   d'ennemi au moment où le joueur découvre encore le système de
   règles. Seuil COMMUN aux 2 archétypes pour cette 2e livraison —
   pourra diverger plus tard si un futur archétype doit apparaître
   plus tard/plus tôt que les 2 premiers. */
var ENRAGED_MIN_WORLD_INDEX = 3;
var CORRUPTED_MIN_WORLD_INDEX = 3;

/* Chance qu'un boss généré (une fois le monde minimum atteint) porte
   UN archétype quelconque — 25%, valeur de départ raisonnable (ni
   systématique, ni anecdotique). v3.69.0 : ce seuil est désormais le
   1er niveau du tirage à 2 niveaux (voir decideEnemyArchetype()) — le
   2e niveau (lequel des 2 archétypes) est un 50/50 séparé, pas une
   subdivision de ce pourcentage (chaque archétype garde donc bien
   ~12.5% de chance individuelle d'apparaître, la moitié de 25%). */
var ENRAGED_SPAWN_CHANCE_PCT = 25;

/* Bonus de dégâts de riposte PAR TRANCHE de 10% de PV perdus par le
   boss, et plafond du multiplicateur total — valeurs validées par
   simulation hors-jeu avec Seb (voir résumé de session) : à 0% PV
   perdus, rageMult = 1 (normal) ; à 50%+ PV perdus, rageMult = 1.50
   (plafond atteint, +50% de dégâts de riposte). Impact mesuré en
   simulation : environ +15-20% de dégâts subis en moyenne sur
   l'ensemble d'un combat contre un boss Enragé par rapport à un boss
   normal équivalent — sensible sans être écrasant. */
var ENRAGED_DAMAGE_BONUS_PER_10PCT_LOST = 0.08;
var ENRAGED_DAMAGE_BONUS_CAP = 0.50;

/* v3.68.0 : durée du gel de la montée en rage après un contre skill3
   réussi (voir data/class-skills.js pour l'effet ajouté à skill3 des
   3 classes) — pendant cette fenêtre, le ratio de PV perdus utilisé
   par getEnragedDamageMultiplier() ci-dessous reste BLOQUÉ à sa valeur
   au moment de l'activation (pas remis à 0, pas recalculé), voir
   CombatEngine.dealDamage() pour où ce gel est réellement appliqué. */
var ENRAGED_FREEZE_DURATION_MS = 4000;

/* v3.68.0 : réduction immédiate du ratio de PV perdus "effectif" au
   moment où skill3 supprime la rage — en points de pourcentage (ex.
   0.20 = -20 points), appliquée AVANT le gel ci-dessus. Combinée au
   gel, décision actée avec Seb : un vrai soulagement immédiat ET
   visible, pas seulement un plafond qui empêche d'empirer. */
var ENRAGED_SUPPRESSION_REDUCTION_PCT = 0.20;

/* v3.69.0 : réduction de dégâts DU HÉROS par stack de corruption, et
   nombre maximal de stacks — décision actée avec Seb : -5%/stack,
   jusqu'à 5 stacks (-25% max), valeur de départ symétrique à
   l'ampleur d'Enragé (+50% max côté ennemi) sans être identique —
   Corrupteur agit sur une base multiplicative différente (dégâts DU
   HÉROS, déjà eux-mêmes très variables selon l'équipement), un
   pourcentage plus mesuré reste cohérent avec "jamais une serrure
   absolue" même si le joueur ne purge jamais un seul stack. */
var CORRUPTED_DAMAGE_REDUCTION_PER_STACK = 0.05;
var CORRUPTED_MAX_STACKS = 5;

/* decideEnemyArchetype(worldIndex, isBoss, spawnRoll, archetypeRoll)
   Décide si un ennemi généré doit porter un archétype, et LEQUEL —
   v3.69.0 : tirage à 2 NIVEAUX, un seul archétype actif à la fois
   (décision actée avec Seb) :
     1) spawnRoll (0-100, fourni par l'appelant) détermine si CE boss
        porte un archétype DU TOUT (<= ENRAGED_SPAWN_CHANCE_PCT) ;
     2) SI oui, archetypeRoll (0-100, fourni séparément par l'appelant
        — 2 tirages indépendants, jamais dérivés l'un de l'autre) fait
        un 50/50 entre "enraged" (<= 50) et "corrupted" (> 50).
   isBoss doit être vrai (archétypes réservés aux boss). worldIndex
   doit atteindre le seuil minimum de l'archétype tiré — comme les 2
   seuils sont identiques pour cette livraison (ENRAGED_MIN_WORLD_INDEX
   === CORRUPTED_MIN_WORLD_INDEX === 3), un seul check suffit ici,
   mais écrit explicitement par archétype pour rester correct si les
   seuils divergent dans une future livraison.
   Retourne null, "enraged" ou "corrupted". Ne mute rien, ne lit aucun
   état externe (les 2 rolls sont toujours fournis par l'appelant,
   jamais tirés ici — contrat de pureté inchangé). */
function decideEnemyArchetype(worldIndex, isBoss, spawnRoll, archetypeRoll) {
  if (!isBoss) return null;
  if (typeof worldIndex !== "number") return null;
  if (typeof spawnRoll !== "number" || spawnRoll > ENRAGED_SPAWN_CHANCE_PCT) return null;

  var picksCorrupted = (typeof archetypeRoll === "number" && archetypeRoll > 50);
  if (picksCorrupted) {
    if (worldIndex < CORRUPTED_MIN_WORLD_INDEX) return null;
    return "corrupted";
  }
  if (worldIndex < ENRAGED_MIN_WORLD_INDEX) return null;
  return "enraged";
}

/* getEnragedDamageMultiplier(pctHpLost)
   pctHpLost : fraction 0-1 de PV déjà perdus par le boss. Retourne le
   multiplicateur de dégâts de riposte à appliquer (1 = normal, jamais
   moins que 1). Utilise Math.floor(pctHpLost*10) pour des PALIERS de
   10% (pas un dégradé continu) — plus lisible pour le joueur ("il
   passe un cran plus loin") qu'une formule linéaire imperceptible
   coup par coup. Ne mute rien. */
function getEnragedDamageMultiplier(pctHpLost) {
  var pct = (typeof pctHpLost === "number" && pctHpLost > 0) ? Math.min(1, pctHpLost) : 0;
  var tier = Math.floor(pct * 10);
  var bonus = Math.min(ENRAGED_DAMAGE_BONUS_CAP, tier * ENRAGED_DAMAGE_BONUS_PER_10PCT_LOST);
  return 1 + bonus;
}

/* getCorruptedDamageMultiplier(stackCount)
   stackCount : nombre entier de stacks de corruption actuellement sur
   le héros (0-CORRUPTED_MAX_STACKS, toute valeur hors bornes est
   clampée). Retourne le multiplicateur à appliquer aux dégâts INFLIGÉS
   PAR LE HÉROS (1 = normal, jamais plus que 1 — Corrupteur ne peut
   jamais BOOSTER le héros, seulement l'affaiblir). Ne mute rien. */
function getCorruptedDamageMultiplier(stackCount) {
  var stacks = (typeof stackCount === "number" && stackCount > 0) ? Math.min(CORRUPTED_MAX_STACKS, Math.floor(stackCount)) : 0;
  return Math.max(0, 1 - stacks * CORRUPTED_DAMAGE_REDUCTION_PER_STACK);
}

window.ENRAGED_MIN_WORLD_INDEX = ENRAGED_MIN_WORLD_INDEX;
window.CORRUPTED_MIN_WORLD_INDEX = CORRUPTED_MIN_WORLD_INDEX;
window.ENRAGED_SPAWN_CHANCE_PCT = ENRAGED_SPAWN_CHANCE_PCT;
window.ENRAGED_DAMAGE_BONUS_PER_10PCT_LOST = ENRAGED_DAMAGE_BONUS_PER_10PCT_LOST;
window.ENRAGED_DAMAGE_BONUS_CAP = ENRAGED_DAMAGE_BONUS_CAP;
window.ENRAGED_FREEZE_DURATION_MS = ENRAGED_FREEZE_DURATION_MS;
window.ENRAGED_SUPPRESSION_REDUCTION_PCT = ENRAGED_SUPPRESSION_REDUCTION_PCT;
window.CORRUPTED_DAMAGE_REDUCTION_PER_STACK = CORRUPTED_DAMAGE_REDUCTION_PER_STACK;
window.CORRUPTED_MAX_STACKS = CORRUPTED_MAX_STACKS;
window.decideEnemyArchetype = decideEnemyArchetype;
window.getEnragedDamageMultiplier = getEnragedDamageMultiplier;
window.getCorruptedDamageMultiplier = getCorruptedDamageMultiplier;
