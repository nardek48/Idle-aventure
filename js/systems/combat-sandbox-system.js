"use strict";
/* ============================================================
Aethervale — systems/combat-sandbox-system.js
v3.33.4 : logique de SIMULATION du bac à sable de combat (écran
Paramètres > Bac à sable de combat, voir ui/combat-sandbox-view.js).

STATUT — bac à sable isolé, jamais branché à la partie réelle :
  - Ne lit ni ne modifie game.* (aucun accès à l'état réel du héros,
    de l'inventaire, des quêtes).
  - N'appelle jamais killEnemy(), onHeroDefeated(), ni aucune fonction
    de systems/combat-engine.js, systems/special-attack-system.js,
    systems/stats-system.js, main/game-loop.js, systems/save-system.js.
  - Toute donnée source (HEROES_DB, ENEMY_DB, CLASS_SKILLS...) est
    clonée en profondeur (structuredClone) avant usage — jamais
    l'objet partagé, jamais de mutation qui pourrait se propager.
  - Réutilise EXCLUSIVEMENT les fonctions déjà exportées par
    systems/combat-resource-system.js et systems/combat-cooldown-system.js
    pour toute la logique de ressource/cooldown/condition — aucune
    duplication de cette logique ici.

STATS DU HÉROS DE TEST — simplification documentée :
  StatsSystem.recalcStats() (le vrai calcul de jeu) est fortement
  couplé à game.* (entraînement, équipement, talents, ascension,
  affliction, bonus de bestiaire...) et ne peut pas être appelé
  proprement de façon isolée sans lire/muter l'état réel de la
  partie — ce qui est interdit ici. Ce bac à sable calcule donc les
  stats du héros de test en appliquant UNIQUEMENT les coefficients de
  base (mêmes constantes que stats-system.js, dupliquées ici en
  lecture seule, voir SANDBOX_HERO_BASE_COEFS ci-dessous) sur les
  stats BRUTES de HEROES_DB[heroId].stats — sans bonus d'équipement,
  de talents, d'entraînement ni d'ascension. C'est un jeu de stats de
  base raisonnable, pas les stats réelles du joueur.

ÉCHELLE ENNEMI — simplification documentée, ÉTENDUE en v3.46.0 :
  WorldManager.generateEnemy() (le vrai calcul de PV/dégâts ennemi)
  dépend de game.cycleCount, de la position sur la carte (monde/
  aventure) et du nombre de kills — tout ça appartient à l'état réel
  de la partie. ENEMY_DB ne contient d'ailleurs aucun champ PV/dégâts
  direct, ni de regroupement par zone (uniquement des stats RPG à 5
  axes).
  Jusqu'à v3.45.0, ce bac à sable appliquait une échelle FIXE et
  neutre (scale = 1, aucun bonus de monde/cycle) — un ennemi de test
  représentatif de son "monde 1, cycle 0" uniquement.
  v3.46.0 : WORLD_INDEX/ADVENTURE_INDEX/CYCLE_COUNT (dans
  SANDBOX_ENEMY_COEFS, réglables via le panneau de coefficients d'ennemi,
  voir ui/combat-sandbox-view.js) permettent de recalculer scale/
  bossScale avec les VRAIES formules de progression-system.js (même
  poids 0.90/1.3, 0.30/0.4, 0.45/0.7, même exposant PV_WORLD_EXP limité
  au terme monde) — un ennemi de test peut donc représenter n'importe
  quel point de la progression, pas seulement le tout début. Valeurs par
  défaut = 0 (comportement neutre, identique à avant cette version).
  enemyIndex (progression DANS une même aventure) reste volontairement
  absent — poids négligeable (0.05/ennemi) et ce bac à sable n'a pas de
  notion de "position dans l'aventure courante", juste un ennemi isolé.

IDENTIFICATION D'UN BOSS (v3.33.5, mode Run) :
  data/enemies.js (ENEMY_DB) n'a AUCUN champ boss. Les boss réels du
  jeu vivent dans une base SÉPARÉE, data/bosses.js (BOSS_DB), avec la
  même forme (name/asset/image/resists/weak/stats) — c'est déjà le
  critère utilisé nativement par le jeu (voir l'IIFE en fin de
  bosses.js : var isBoss = !!BOSS_DB[id]). Ce bac à sable reprend
  EXACTEMENT ce critère : buildSandboxEnemyStats() et
  listSandboxEnemies() savent désormais lire ENEMY_DB ET BOSS_DB,
  jamais fusionnés ni modifiés, avec un champ isBoss dans le résultat.

REGROUPEMENT PAR ZONE (v3.33.5, mode Run) :
  Existe réellement dans data/worlds.js : WORLDS[i].adventures[j] a
  un enemyPool[] (ennemis normaux, ordre déclaré) et un boss (id
  résolu dans BOSS_DB). listSandboxZones()/buildSandboxQueueFromZone()
  l'utilisent pour composer une file automatique : enemyPool dans
  l'ordre, boss explicitement en dernière position.

RIPOSTE ENNEMIE — cadence choisie :
  Après CHAQUE action du joueur (plutôt qu'un minuteur en secondes
  réelles) : le plus simple à implémenter et à tester de façon
  déterministe (pas de dépendance à setInterval/Date.now dans une
  logique qui doit rester pure), et suffisant pour observer le
  rythme ressource/cooldown/PV du bac à sable. Documenté ici comme
  demandé par la tâche.
============================================================ */

/* Coefficients de base repris de stats-system.js (lecture seule,
   jamais appliqués à game.* ici) — voir StatsSystem.recalcStats().
   v3.33.14 — CORRECTIF : BASE_CRIT_CHANCE était à 0.05 (fraction)
   alors que le jeu réel exprime critChance en POINTS DE POURCENTAGE
   (game.critChance = 5, voir stats-system.js recalcStats() ; comparé
   via chance(percent) => Math.random()*100 < percent, core/utils.js).
   Avec l'ancienne valeur, critChance dans buildSandboxHeroStats()
   dépassait systématiquement 1.0 dès quelques points de Précision
   (ex. Précision 66 -> "401%"), donc Math.random() < critChance était
   TOUJOURS vrai — un héros de test critiquait 100% du temps, quelle
   que soit sa Précision réelle. Corrigé à 5 (même échelle que le jeu
   réel) ; voir buildSandboxHeroStats() pour la conversion en fraction
   0-1 ET le plafond à 1.0 ajoutés au même correctif. */
var SANDBOX_HERO_BASE_COEFS = {
  FORCE_TAP_COEF: 0.2,
  PRECISION_CRIT_COEF: 0.06,
  WILL_CRIT_MULT_COEF: 0.01,
  // v3.46.0 : conversion Endurance->PV NON LINÉAIRE, alignée sur le jeu
  // réel (voir stats-system.js recalcStats()) — ENDURANCE_HP_EXP < 1
  // resserre l'écart de PV entre héros à haute/basse Endurance (ex.
  // Chevalier 76 vs Mage 34), sans changer les stats de base ni le kit
  // d'aucune classe. COEF recalé pour garder le Chevalier à ~456 PV
  // (référence inchangée), comme dans stats-system.js.
  ENDURANCE_HP_EXP: 0.75,
  ENDURANCE_HP_COEF: 17.716,
  HERO_DEFENSE_COEF: 0.002,
  BASE_TAP_DAMAGE: 1,
  BASE_CRIT_CHANCE: 5, // v3.33.14 : 0.05 -> 5 (points de %, comme game.critChance)
  BASE_CRIT_MULT: 2
};

/* Coefficients d'ennemi repris de progression-system.js/combat-engine.js
   (lecture seule, échelle neutre — voir note d'en-tête). v3.33.12 :
   BOSS_ENDURANCE_HP_COEF ajouté ici (était codé en dur "2" dans
   buildSandboxEnemyStats()) pour que TOUS les coefficients ennemis
   soient réglables depuis un seul objet — voir overrideEnemyCoefs
   plus bas. */
// v3.46.0 : coefficients par défaut alignés sur la nouvelle courbe RÉELLE
// du jeu (ENEMY_PV_MULT/ENEMY_PV_WORLD_EXP/BOSS_PV_MULT/
// ENEMY_POWER_SCALE_EXP, progression-system.js) — avant, ce bac à sable
// ne pouvait tester qu'une échelle NEUTRE fixe (worldIndex/cycleCount
// figés à 0, voir note d'en-tête du fichier). ENDURANCE_HP_COEF/
// BOSS_ENDURANCE_HP_COEF renommés en *_PV_MULT pour matcher les noms
// réels du jeu (ancien "1.2 fixe" devient un multiplicateur d'échelle,
// pas d'endurance seule) — la valeur par défaut suit la même migration
// (1.2 -> 4.0, 2 -> 6.7). worldIndex/cycleCount/adventureIndex ajoutés
// ici comme nouveaux coefficients réglables (0 par défaut = comportement
// neutre identique à avant, rétrocompatible avec tout state existant).
var SANDBOX_ENEMY_COEFS = {
  ENDURANCE_HP_COEF: 4.0,        // v3.46.0 : 1.2 -> 4.0 (ENEMY_PV_MULT réel)
  BOSS_ENDURANCE_HP_COEF: 6.7,    // v3.46.0 : 2 -> 6.7 (BOSS_PV_MULT réel)
  PV_WORLD_EXP: 1.45,              // v3.46.0 : ENEMY_PV_WORLD_EXP réel — exposant sur le terme monde uniquement
  POWER_SCALE_EXP: 0.3,            // v3.46.0 : ENEMY_POWER_SCALE_EXP réel — puissance de riposte mise à l'échelle (0.9 initial, révisé à 0.3 après validation batch-sim, voir progression-system.js)
  POWER_DMG_COEF: 0.5,
  ATTACK_BASE_INTERVAL_S: 3,
  RESIST_DMG_MULT: 0.7,
  WEAK_DMG_MULT: 1.3,
  NO_WEAPON_MULT: 0.8,
  WORLD_INDEX: 0,      // v3.46.0 : 0 = monde 1 (Forêt), même convention que WorldManager.worldIndex
  ADVENTURE_INDEX: 0,  // v3.46.0 : simplifié à 0 par défaut, réglable comme demandé (pas de vraie liste d'aventures ici)
  CYCLE_COUNT: 0        // v3.46.0 : nombre de cycles bouclés simulés
};

/* Cooldown de base par défaut de l'attaque de base DANS LE BAC À
   SABLE uniquement (v3.33.6) — ne remplace JAMAIS cooldownMs: 0 dans
   data/class-skills.js (jeu réel inchangé). Réglable dans l'écran de
   test, voir ui/combat-sandbox-view.js.
   v3.33.9 : 600 -> 1000ms — l'ancienne valeur donnait un ressenti trop
   proche du spam de clics. Uniquement la valeur de DÉPART (à
   l'ouverture du bac à sable / au reset des réglages) ; le réglage
   reste librement modifiable ensuite, formule et plafond de réduction
   par Célérité inchangés (voir computeEffectiveCooldownMs()). */
var SANDBOX_DEFAULT_BASE_COOLDOWN_MS = 1000;

/* SANDBOX_WILL_COOLDOWN_MIN_RATIO (v3.33.15)
   Plafond de réduction du cooldown des SKILLS (skill1/skill2/skill3/
   defense) par la Volonté du héros de test — voir applySandboxAction().
   Même principe et même formule que Célérité pour l'attaque de base
   (computeEffectiveCooldownMs, combat-cooldown-system.js), mais
   appliqué aux 4 autres slots, jamais "basic" qui garde son propre
   traitement Célérité existant (v3.33.6, inchangé).

   Contexte : avant ce correctif, la Volonté n'avait qu'un seul effet
   dans TOUT le jeu (réel et bac à sable) — +critMult, un bonus
   conditionnel qui ne s'applique qu'au moment d'un critique (~5-15%
   des coups avec les taux réels, voir correctif critChance v3.33.14
   ci-dessous). Comparée aux 4 autres stats (Force/Célérité/Précision/
   Endurance, chacune avec un effet permanent appliqué à 100% des
   actions), la Volonté avait donc un rendement structurellement plus
   faible — repéré par Seb en observant que le Mage (Volonté la plus
   haute des 3 classes, 76) n'en tirait presque aucun bénéfice mesurable.

   Choix retenu (option B, sur 2 proposées) : donner à la Volonté un
   second rôle UNIVERSEL aux 3 classes (pas seulement au Mage) —
   accélérer l'accès aux compétences spéciales, symétrique à ce que
   fait déjà Célérité pour l'attaque de base. Testé en simulation avant
   adoption : effet progressif et proportionné à la Volonté de chaque
   classe (peu de changement pour le Chevalier à Volonté modeste,
   effet plus visible pour le Mage à Volonté élevée), contrairement à
   l'option alternée testée (Volonté -> régénération de ressource) qui
   avantageait davantage le Chevalier que le Mage — voir notes de
   session, non reproduites ici. */
var SANDBOX_WILL_COOLDOWN_MIN_RATIO = 0.5; // -50% de réduction maximum, comme Célérité

/* SANDBOX_DEFENSE_EFFECTS (v3.33.13)
   Table de correspondance action defense -> réduction de dégâts
   APPLIQUÉE dans ce bac à sable. data/class-skills.js déclare ces 3
   effets ("damageReduction"/"evasion"/"damageAbsorption") mais aucun
   n'était branché au moteur avant cette version — voir demande de
   Seb. Deux des trois ont une valeur déjà fixée dans la donnée
   (reprise ici telle quelle) ; la troisième (Esquive de l'Archer) a
   value:null dans data/class-skills.js ("réservé", non fixé) — valeur
   0.70 choisie par Seb pour ce bac à sable UNIQUEMENT (réduction
   forte mais partielle, plus efficace que Garde/Barrière), documentée
   ici plutôt que dans data/class-skills.js qui reste inchangé. Ne
   modifie ni ne remplace le vrai combat (combat-engine.js n'a pas non
   plus de réduction liée à ces compétences — ce système n'existe que
   dans le bac à sable). Clé = action.id (data/class-skills.js). */
var SANDBOX_DEFENSE_EFFECTS = {
  knight_guard: { reductionPct: 0.50, durationMs: 2000 },   // damageReduction 0.50, valeur reprise de class-skills.js
  archer_evasion: { reductionPct: 0.70, durationMs: 1000 }, // evasion value:null dans la donnée -> 0.70 fixé pour ce bac à sable (choix Seb) ; durationMs 2000->1000 v3.33.17, synchronisé avec data/class-skills.js
  mage_arcane_barrier: { reductionPct: 0.40, durationMs: 3000 } // damageAbsorption 0.40, valeur reprise de class-skills.js
};

/* getSandboxHeroBaseStats(heroId)
   Retourne une COPIE des stats de base RÉELLES du héros
   (HEROES_DB[heroId].stats, clonées) — utilisée par le bouton
   "Réinitialiser les stats" du panneau d'édition (voir
   ui/combat-sandbox-view.js) pour restaurer exactement les valeurs
   d'origine. Retourne null si heroId est invalide/inconnu. Ne modifie
   jamais HEROES_DB. */
function getSandboxHeroBaseStats(heroId) {
  if (typeof HEROES_DB === "undefined" || !HEROES_DB || !heroId || !HEROES_DB[heroId]) return null;
  return structuredClone(HEROES_DB[heroId].stats || {});
}

/* buildSandboxHeroStats(heroId, overrideStats)
   Calcule un jeu de stats de test pour un héros (tapDamage, critChance,
   critMult, maxHp, defensePct, celerity) à partir de ses stats BRUTES
   (HEROES_DB[heroId].stats, clonées) OU de overrideStats si fourni
   (v3.33.6, panneau d'édition de stats du bac à sable — voir
   ui/combat-sandbox-view.js), coefficients de base uniquement (voir
   note d'en-tête). overrideStats doit être un objet
   {power, endurance, celerity, precision, will} — mêmes clés que
   HEROES_DB[id].stats (voir data/heroes.js), PARTIEL accepté (les
   clés absentes retombent sur les stats de base réelles du héros).
   Ne modifie jamais HEROES_DB ni overrideStats. Retourne null si
   heroId est invalide/inconnu. */
function buildSandboxHeroStats(heroId, overrideStats) {
  if (typeof HEROES_DB === "undefined" || !HEROES_DB || !heroId || !HEROES_DB[heroId]) return null;
  var hero = structuredClone(HEROES_DB[heroId]);
  var baseStats = hero.stats || {};
  var override = (overrideStats && typeof overrideStats === "object") ? structuredClone(overrideStats) : null;
  var s = override ? Object.assign({}, baseStats, override) : baseStats;
  var c = SANDBOX_HERO_BASE_COEFS;

  var tapDamage = c.BASE_TAP_DAMAGE + (s.power || 0) * c.FORCE_TAP_COEF;
  // v3.33.14 : formule en points de % (comme game.critChance), puis
  // convertie en fraction 0-1 ET plafonnée à 1.0 (100%) — avant ce
  // correctif, critChance dépassait 1.0 dès quelques points de
  // Précision et Math.random() < critChance était toujours vrai (voir
  // note de SANDBOX_HERO_BASE_COEFS ci-dessus).
  var critChancePercent = c.BASE_CRIT_CHANCE + (s.precision || 0) * c.PRECISION_CRIT_COEF;
  var critChance = Math.min(1, Math.max(0, critChancePercent / 100));
  var critMult = c.BASE_CRIT_MULT + (s.will || 0) * c.WILL_CRIT_MULT_COEF;
  var maxHp = Math.max(1, Math.floor(Math.pow(Math.max(0, s.endurance || 0), c.ENDURANCE_HP_EXP) * c.ENDURANCE_HP_COEF));
  var defensePct = Math.min(0.60, (s.endurance || 0) * c.HERO_DEFENSE_COEF);

  return {
    heroId: heroId,
    name: hero.name,
    weaponType: hero.weaponType,
    stats: s, // v3.33.6 : conservées telles quelles pour ré-affichage/édition dans le panneau de stats
    tapDamage: tapDamage,
    celerity: s.celerity || 0, // v3.33.6 : nécessaire au cooldown effectif de l'attaque de base
    critChance: critChance,
    critMult: critMult,
    maxHp: maxHp,
    hp: maxHp,
    defensePct: defensePct
  };
}

/* applySandboxEquipmentBonus(heroStats, rarity)
   v3.46.0 : simule un set COMPLET (7 emplacements, EQUIPMENT_SLOTS) de
   la rareté donnée sur un héros de test déjà construit par
   buildSandboxHeroStats() — pour tester l'alignement gear/monde de la
   nouvelle courbe de PV (voir section "Pourquoi ces valeurs" du prompt
   de livraison). Valeur de CHAQUE emplacement = MOYENNE de son range
   (EQUIPMENT_SLOT_CONFIG[slot].ranges[rarity], data/equipment.js), pas
   un tirage aléatoire — un résultat déterministe et reproductible est
   plus utile pour comparer deux réglages que percentage de chance.
   Ajoute aussi le bonus de panoplie 7 pièces (SET_BONUS_CONFIG, la
   panoplie 3 pièces est un sous-ensemble strict de 7 pièces de même
   rareté donc toujours actif en même temps — les DEUX bonus se
   cumulent, comme en jeu réel, voir getActiveSetBonuses() dans
   stats-system.js).
   Retourne un NOUVEL objet heroStats (ne mute jamais celui reçu).
   rarity absent/null/invalide = heroStats renvoyé tel quel (pas
   d'équipement simulé, comportement identique à avant cette version).
   Champs affectés : tapDamage (+ tapDmg plat, × tapMult), critChance
   (+ plat, replafonné à 1.0 comme buildSandboxHeroStats), critMult
   (+ plat), maxHp/defensePct (+ defense, même plafond 0.60 que le jeu
   réel). autoDps/goldMult calculés pour référence (affichage) mais
   SANS EFFET sur le combat simulé — ce bac à sable ne modélise ni
   l'auto-DPS ni les gains d'or, voir note d'en-tête du fichier. */
function applySandboxEquipmentBonus(heroStats, rarity) {
  if (!heroStats) return heroStats;
  if (!rarity || typeof rarity !== "string") return Object.assign({}, heroStats);
  if (typeof EQUIPMENT_SLOTS === "undefined" || typeof EQUIPMENT_SLOT_CONFIG === "undefined") return Object.assign({}, heroStats);

  var totals = { tapDmg: 0, tapMult: 0, goldMult: 0, critChance: 0, critMult: 0, autoDps: 0, defense: 0 };

  EQUIPMENT_SLOTS.forEach(function (slot) {
    var config = EQUIPMENT_SLOT_CONFIG[slot];
    if (!config || !config.ranges || !config.ranges[rarity]) return;
    var range = config.ranges[rarity];
    var avgValue = (Number(range[0]) + Number(range[1])) / 2;
    if (totals.hasOwnProperty(config.stat)) totals[config.stat] += avgValue;
  });

  // Bonus de panoplie — 3 pièces ET 7 pièces (les deux actifs
  // simultanément avec un set complet de 7, voir note ci-dessus).
  if (typeof SET_BONUS_CONFIG !== "undefined" && SET_BONUS_CONFIG.tiers) {
    SET_BONUS_CONFIG.tiers.forEach(function (tier) {
      var tierBonus = tier.bonuses && tier.bonuses[rarity];
      if (!tierBonus || typeof tierBonus.apply !== "function") return;
      var effect = tierBonus.apply() || {};
      if (effect.tapDamage != null) totals.tapDmg += effect.tapDamage;
      if (effect.tapMult != null) totals.tapMult += effect.tapMult;
      if (effect.goldMult != null) totals.goldMult += effect.goldMult;
      if (effect.critChance != null) totals.critChance += effect.critChance;
      if (effect.critMult != null) totals.critMult += effect.critMult;
      if (effect.autoDps != null) totals.autoDps += effect.autoDps;
    });
  }

  // v2.29 (jeu réel) : (base × tapMult) PUIS + bonus plat — même ordre
  // reproduit ici pour rester cohérent avec effectiveTapDamage().
  var tapMultTotal = 1 + totals.tapMult;
  var newTapDamage = heroStats.tapDamage * tapMultTotal + totals.tapDmg;

  // critChance stockée en FRACTION 0-1 dans ce bac à sable (voir
  // buildSandboxHeroStats() — correctif v3.33.14) ; les bonus
  // d'équipement réels sont en POINTS DE % (comme game.critChance) —
  // conversion /100 avant d'additionner, puis replafonnage à 1.0.
  var newCritChance = Math.min(1, Math.max(0, heroStats.critChance + totals.critChance / 100));
  var newCritMult = heroStats.critMult + totals.critMult;
  var newDefensePct = Math.min(0.60, heroStats.defensePct + totals.defense);

  return Object.assign({}, heroStats, {
    tapDamage: newTapDamage,
    critChance: newCritChance,
    critMult: newCritMult,
    defensePct: newDefensePct,
    // Champs de référence uniquement (affichage) — voir note d'en-tête,
    // ce bac à sable ne simule ni l'auto-DPS ni l'or.
    equipmentAutoDpsRef: totals.autoDps,
    equipmentGoldMultRef: 1 + totals.goldMult,
    equipmentRarity: rarity
  });
}

/* buildSandboxEnemyStats(enemyId, overrideCoefs)
   Calcule un jeu de PV/dégâts de test pour un ennemi OU un boss, à
   partir de ses stats BRUTES (clonées) et d'une échelle fixe/neutre
   (voir note d'en-tête). Cherche d'abord dans ENEMY_DB, puis dans
   BOSS_DB si absent (voir note "IDENTIFICATION D'UN BOSS" en tête de
   fichier) — le résultat porte un champ isBoss reflétant l'origine
   réelle. Retourne null si enemyId est invalide/inconnu dans les deux
   bases. Ne modifie jamais ENEMY_DB ni BOSS_DB.

   v3.33.12 — overrideCoefs (optionnel) : objet PARTIEL avec les mêmes
   clés que SANDBOX_ENEMY_COEFS (voir panneau de réglage,
   ui/combat-sandbox-view.js), pour surcharger les coefficients de
   PV/vitesse d'ennemi sans toucher à ce fichier. Clés absentes de
   overrideCoefs retombent sur SANDBOX_ENEMY_COEFS (valeurs "réelles"
   du jeu). Ne mute jamais overrideCoefs. */
function buildSandboxEnemyStats(enemyId, overrideCoefs) {
  if (!enemyId) return null;
  var isBoss = false;
  var source = null;

  if (typeof ENEMY_DB !== "undefined" && ENEMY_DB && ENEMY_DB[enemyId]) {
    source = ENEMY_DB[enemyId];
  } else if (typeof BOSS_DB !== "undefined" && BOSS_DB && BOSS_DB[enemyId]) {
    source = BOSS_DB[enemyId];
    isBoss = true;
  }
  if (!source) return null;

  var enemy = structuredClone(source);
  var s = enemy.stats || {};
  var c = Object.assign({}, SANDBOX_ENEMY_COEFS, overrideCoefs || {});

  // v3.33.5 : un boss de test utilise BOSS_ENDURANCE_HP_COEF (=6.7 par
  // défaut depuis v3.46.0, contre 4.0 pour un ennemi normal).
  // v3.33.12 : lu depuis c (réglable) au lieu d'un "2" codé en dur.
  // v3.46.0 : WORLD_INDEX/ADVENTURE_INDEX/CYCLE_COUNT (0 par défaut =
  // comportement NEUTRE identique à avant cette version, voir note
  // d'en-tête du fichier sur pourquoi ce bac à sable utilisait jusqu'ici
  // une échelle fixe) permettent de recalculer un vrai `scale`/`bossScale`
  // avec les FORMULES RÉELLES du jeu (mêmes poids 0.90/1.3, 0.30/0.4,
  // 0.45/0.7 que progression-system.js) au lieu d'une valeur figée à 1 —
  // PV_WORLD_EXP appliqué UNIQUEMENT au terme monde, jamais à
  // adventureIndex/cycleCount (même règle que le jeu réel).
  var worldIndex = Number(c.WORLD_INDEX || 0);
  var adventureIndex = Number(c.ADVENTURE_INDEX || 0);
  var cycleCount = Number(c.CYCLE_COUNT || 0);
  var worldExp = (typeof c.PV_WORLD_EXP === "number") ? c.PV_WORLD_EXP : 1;

  var scale, hpCoef;
  if (isBoss) {
    var bossWorldComponent = Math.pow(1 + worldIndex * 1.3, worldExp);
    scale = bossWorldComponent + adventureIndex * 0.4 + cycleCount * 0.7;
    hpCoef = c.BOSS_ENDURANCE_HP_COEF;
  } else {
    var worldComponent = Math.pow(1 + worldIndex * 0.90, worldExp);
    scale = worldComponent + adventureIndex * 0.30 + cycleCount * 0.45;
    hpCoef = c.ENDURANCE_HP_COEF;
  }

  var maxHp = Math.max(1, Math.floor((s.endurance || 0) * hpCoef * scale));

  // v3.46.0 : Puissance de riposte mise à l'échelle avec scale, comme le
  // jeu réel (ENEMY_POWER_SCALE_EXP) — POWER_SCALE_EXP à 0 revient à un
  // exposant neutre (Math.pow(scale, 0) === 1), donc AUCUN changement si
  // ce coefficient n'est pas explicitement réglé au-delà de sa valeur
  // par défaut (0.9, alignée sur le jeu réel).
  var powerExp = (typeof c.POWER_SCALE_EXP === "number") ? c.POWER_SCALE_EXP : 0;
  var scaledPower = (s.power || 0) * Math.pow(scale, powerExp);

  var attackIntervalS = c.ATTACK_BASE_INTERVAL_S / (1 + (s.celerity || 0) / 40);

  return {
    enemyId: enemyId,
    name: enemy.name,
    asset: enemy.asset,
    isBoss: isBoss,
    resists: enemy.resists || [],
    weak: enemy.weak || [],
    power: scaledPower,
    maxHp: maxHp,
    hp: maxHp,
    attackIntervalS: attackIntervalS
  };
}

/* listSandboxEnemies()
   Retourne un tableau [{id, name, isBoss}] pour TOUS les ennemis de
   ENEMY_DB ET tous les boss de BOSS_DB, trié alphabétiquement par nom
   affiché — utilisé pour peupler la liste déroulante et la sélection
   manuelle de file. ENEMY_DB/BOSS_DB n'ont pas de regroupement par
   zone exploitable (voir listSandboxZones() pour ça) : liste plate.
   Ne modifie jamais ENEMY_DB ni BOSS_DB. */
function listSandboxEnemies() {
  var list = [];
  if (typeof ENEMY_DB !== "undefined" && ENEMY_DB) {
    Object.keys(ENEMY_DB).forEach(function (id) {
      list.push({ id: id, name: ENEMY_DB[id].name, isBoss: false });
    });
  }
  if (typeof BOSS_DB !== "undefined" && BOSS_DB) {
    Object.keys(BOSS_DB).forEach(function (id) {
      list.push({ id: id, name: BOSS_DB[id].name, isBoss: true });
    });
  }
  return list.sort(function (a, b) { return a.name.localeCompare(b.name, "fr"); });
}

/* listSandboxAllEnemiesInOrder()
   v3.33.9 — Liste COMPLÈTE des ennemis de ENEMY_DB, dans l'ORDRE DE
   PROGRESSION DU JEU (pas l'ordre alphabétique de listSandboxEnemies(),
   qui sert uniquement à peupler un <select> lisible). Construite à
   partir de WORLDS[i].adventures[j].enemyPool[] (data/worlds.js),
   dans l'ordre des mondes puis des aventures puis des pools déclarés
   — chaque ennemi n'apparaît qu'UNE FOIS, à sa première rencontre
   dans cet ordre (un même ennemi peut réapparaître dans plusieurs
   enemyPool, ex. Slime en forest_1 ET forest_2). Tous les ennemis de
   ENEMY_DB sont couverts par cet ordre (vérifié : les 24 ennemis
   apparaissent dans au moins un enemyPool). Ne contient QUE des
   ennemis normaux (pas de boss — voir listSandboxZones() pour la
   sélection incluant les boss par zone). Retourne [] si ENEMY_DB ou
   WORLDS est absent. Ne modifie aucune donnée source. */
function listSandboxAllEnemiesInOrder() {
  if (typeof ENEMY_DB === "undefined" || !ENEMY_DB) return [];
  var ordered = [];
  var seen = {};

  if (typeof WORLDS !== "undefined" && WORLDS) {
    WORLDS.forEach(function (world) {
      (world.adventures || []).forEach(function (adv) {
        (adv.enemyPool || []).forEach(function (id) {
          if (!seen[id] && ENEMY_DB[id]) {
            seen[id] = true;
            ordered.push(id);
          }
        });
      });
    });
  }

  // Filet de sécurité : tout ennemi de ENEMY_DB non couvert par
  // WORLDS (ne devrait pas arriver, vérifié ci-dessus) est ajouté à
  // la fin dans l'ordre de déclaration du fichier — voir consigne
  // "sinon ordre de déclaration dans le fichier".
  Object.keys(ENEMY_DB).forEach(function (id) {
    if (!seen[id]) {
      seen[id] = true;
      ordered.push(id);
    }
  });

  return ordered;
}

/* listSandboxZones()
   Retourne un tableau [{worldId, worldName, adventureId,
   adventureName, enemyPool: [id...], boss: id}] à partir de
   data/worlds.js (WORLDS[i].adventures[j]) — regroupement par zone
   RÉEL du jeu (voir note "REGROUPEMENT PAR ZONE" en tête de fichier).
   Retourne [] si WORLDS est absent. Ne modifie jamais WORLDS. */
function listSandboxZones() {
  if (typeof WORLDS === "undefined" || !WORLDS) return [];
  var zones = [];
  WORLDS.forEach(function (world) {
    (world.adventures || []).forEach(function (adv) {
      zones.push({
        worldId: world.id,
        worldName: world.name,
        adventureId: adv.id,
        adventureName: adv.name,
        enemyPool: (adv.enemyPool || []).slice(),
        boss: adv.boss || null
      });
    });
  });
  return zones;
}

/* buildSandboxQueueFromZone(worldId, adventureId)
   Construit une file d'IDs [enemyId, ..., bossId] à partir d'une zone
   de listSandboxZones() : enemyPool dans son ordre déclaré, boss
   explicitement en DERNIÈRE position (voir note d'en-tête). Retourne
   [] si la zone est introuvable, ou si son boss/enemyPool ne résout
   à aucune entrée existante de ENEMY_DB/BOSS_DB. Ne modifie rien. */
function buildSandboxQueueFromZone(worldId, adventureId) {
  var zones = listSandboxZones();
  var zone = zones.filter(function (z) { return z.worldId === worldId && z.adventureId === adventureId; })[0];
  if (!zone) return [];

  var queue = zone.enemyPool.filter(function (id) {
    return typeof ENEMY_DB !== "undefined" && ENEMY_DB && !!ENEMY_DB[id];
  });
  if (zone.boss && typeof BOSS_DB !== "undefined" && BOSS_DB && BOSS_DB[zone.boss]) {
    queue.push(zone.boss);
  }
  return queue;
}



/* getDamageAffinityMult(weaponType, resists, weak, overrideCoefs)
   Même convention que CombatEngine (RESIST_DMG_MULT/WEAK_DMG_MULT/
   NO_WEAPON_MULT), dupliquée ici en lecture seule. v3.33.12 :
   overrideCoefs (optionnel, PARTIEL) surcharge SANDBOX_ENEMY_COEFS —
   voir buildSandboxEnemyStats() pour la même convention. */
function getDamageAffinityMult(weaponType, resists, weak, overrideCoefs) {
  var c = Object.assign({}, SANDBOX_ENEMY_COEFS, overrideCoefs || {});
  if (!weaponType) return c.NO_WEAPON_MULT;
  if ((resists || []).indexOf(weaponType) !== -1) return c.RESIST_DMG_MULT;
  if ((weak || []).indexOf(weaponType) !== -1) return c.WEAK_DMG_MULT;
  return 1;
}

/* createSandboxCombatState(classId, heroId, enemyId, overrideStats, baseCooldownMs)
   Initialise un NOUVEL état de combat de test complet : stats héros/
   ennemi (clonées, voir ci-dessus), ressource de classe à sa valeur
   initiale (createCombatResourceState, combat-resource-system.js),
   cooldowns à zéro (createCooldownState, combat-cooldown-system.js),
   PV au maximum des deux côtés, journal vide. Retourne null si
   classId/heroId/enemyId est invalide, si heroId n'appartient pas à
   la classe (getClassByHeroId), ou si l'un des modules requis est
   absent. Ne modifie aucune donnée source.

   v3.33.6 :
   - overrideStats (optionnel) — objet {power, endurance, celerity,
     precision, will} PARTIEL, voir buildSandboxHeroStats() ; permet
     au panneau d'édition de stats du bac à sable de tester un héros
     "amélioré" sans toucher HEROES_DB.
   - baseCooldownMs (optionnel) — cooldown de base de l'attaque de
     test AVANT réduction de Célérité (voir
     computeEffectiveCooldownMs(), combat-cooldown-system.js) ;
     défaut SANDBOX_DEFAULT_BASE_COOLDOWN_MS (600ms) si omis. Stocké
     dans le state (baseCooldownMs) pour rester accessible à chaque
     applySandboxAction()/tickSandboxTime() sans le repasser à chaque
     appel. */
/* createSandboxCombatState(classId, heroId, enemyId, overrideStats, baseCooldownMs, overrideEnemyCoefs)
   Initialise un NOUVEL état de combat de test complet : stats héros/
   ennemi (clonées, voir ci-dessus), ressource de classe à sa valeur
   initiale (createCombatResourceState, combat-resource-system.js),
   cooldowns à zéro (createCooldownState, combat-cooldown-system.js),
   PV au maximum des deux côtés, journal vide. Retourne null si
   classId/heroId/enemyId est invalide, si heroId n'appartient pas à
   la classe (getClassByHeroId), ou si l'un des modules requis est
   absent. Ne modifie aucune donnée source.

   v3.33.6 :
   - overrideStats (optionnel) — objet {power, endurance, celerity,
     precision, will} PARTIEL, voir buildSandboxHeroStats() ; permet
     au panneau d'édition de stats du bac à sable de tester un héros
     "amélioré" sans toucher HEROES_DB.
   - baseCooldownMs (optionnel) — cooldown de base de l'attaque de
     test AVANT réduction de Célérité (voir
     computeEffectiveCooldownMs(), combat-cooldown-system.js) ;
     défaut SANDBOX_DEFAULT_BASE_COOLDOWN_MS (600ms) si omis. Stocké
     dans le state (baseCooldownMs) pour rester accessible à chaque
     applySandboxAction()/tickSandboxTime() sans le repasser à chaque
     appel.

   v3.33.12 :
   - overrideEnemyCoefs (optionnel) — objet PARTIEL, mêmes clés que
     SANDBOX_ENEMY_COEFS (ENDURANCE_HP_COEF, BOSS_ENDURANCE_HP_COEF,
     POWER_DMG_COEF, ATTACK_BASE_INTERVAL_S, RESIST_DMG_MULT,
     WEAK_DMG_MULT, NO_WEAPON_MULT) ; permet au panneau de réglage du
     bac à sable de tester un ennemi "plus fort/rapide" sans toucher
     à ce fichier ni à progression-system.js/combat-engine.js (jeu
     réel inchangé, ces coefficients ne sont dupliqués qu'ici). Stocké
     dans state.enemyCoefs, relu par computeSandboxActionDamage()/
     resolveSandboxEnemyStrike() à CHAQUE action/tick — donc un
     réglage modifié en cours de combat s'applique dès la prochaine
     action (contrairement à overrideStats/baseCooldownMs qui ne
     s'appliquent qu'au combat SUIVANT, voir
     ui/combat-sandbox-view.js).

   v3.46.0 :
   - equipmentRarity (optionnel) — "common"/"green"/"rare"/"epic"/
     "legendary", ou null/absent = aucun équipement simulé (comportement
     identique à avant cette version). Voir applySandboxEquipmentBonus() :
     appliqué APRÈS overrideStats, comme le jeu réel applique l'équipement
     après les stats RPG du héros dans StatsSystem.recalcStats(). Figé au
     lancement du combat, comme overrideStats/baseCooldownMs. */
function createSandboxCombatState(classId, heroId, enemyId, overrideStats, baseCooldownMs, overrideEnemyCoefs, equipmentRarity) {
  if (typeof getClassByHeroId !== "function" || typeof getClassSkills !== "function") return null;
  if (typeof createCombatResourceState !== "function" || typeof createCooldownState !== "function") return null;

  var cls = getClassByHeroId(heroId);
  if (!cls || cls.id !== classId) return null;

  var kit = getClassSkills(classId);
  if (!kit) return null;

  var heroStats = buildSandboxHeroStats(heroId, overrideStats);
  if (heroStats && equipmentRarity) heroStats = applySandboxEquipmentBonus(heroStats, equipmentRarity);
  var enemyStats = buildSandboxEnemyStats(enemyId, overrideEnemyCoefs);
  if (!heroStats || !enemyStats) return null;

  var resourceState = createCombatResourceState(classId);
  if (!resourceState) return null;

  var effectiveBaseCooldownMs = (typeof baseCooldownMs === "number" && baseCooldownMs >= 0)
    ? baseCooldownMs
    : SANDBOX_DEFAULT_BASE_COOLDOWN_MS;

  return {
    classId: classId,
    heroId: heroId,
    enemyId: enemyId,
    hero: heroStats,
    enemy: enemyStats,
    enemyCoefs: (overrideEnemyCoefs && typeof overrideEnemyCoefs === "object") ? structuredClone(overrideEnemyCoefs) : null, // v3.33.12
    resourceState: resourceState,
    cooldownState: createCooldownState(),
    baseCooldownMs: effectiveBaseCooldownMs, // v3.33.6, bac à sable uniquement
    // v3.33.9 : minuteur de riposte ennemie INDÉPENDANT du rythme du
    // joueur — voir tickSandboxTime(). Initialisé à sa pleine durée
    // (enemy.attackIntervalS, déjà dérivé de sa Célérité, voir
    // buildSandboxEnemyStats()) : l'ennemi n'attaque pas à la toute
    // première milliseconde du combat, comme en jeu réel.
    enemyAttackTimerMs: enemyStats.attackIntervalS * 1000,
    // v3.33.13 : effet défensif temporaire actif (Garde/Esquive/
    // Barrière arcanique), ou null si aucun. Voir SANDBOX_DEFENSE_EFFECTS
    // et resolveSandboxEnemyStrike() plus bas. Forme :
    // { reductionPct: number (0-1), expiresAtMs: number, sourceLabel: string }
    activeDefense: null,
    // v3.33.13 : compteurs cumulés pour le tableau de résultats
    // (PV restants/dégâts évités calculables a posteriori, mais ces
    // deux-là nécessitent un cumul au fil du combat) — voir note
    // d'en-tête "SUIVI DÉGÂTS ÉVITÉS" et resolveSandboxEnemyStrike().
    totalDamageAvoided: 0,
    status: "ongoing", // "ongoing" | "victory" | "defeat"
    elapsedMs: 0,        // horloge de SIMULATION (pas Date.now())
    actionsUsed: 0,
    log: []
  };
}

/* appendSandboxLog(state, message)
   Retourne un NOUVEL état avec `message` ajouté au journal. Ne mute
   jamais l'état reçu. */
function appendSandboxLog(state, message) {
  if (!state) return state;
  var entry = { atMs: state.elapsedMs, text: String(message == null ? "" : message) };
  return Object.assign({}, state, { log: state.log.concat([entry]) });
}

/* computeSandboxActionDamage(state, action)
   Calcule les dégâts totaux d'une action de type "damage" contre
   l'ennemi courant de state : (hero.tapDamage × action.damageMultiplier
   × affinité) par coup, × action.hits coups, avec un tirage de
   critique indépendant par coup (hero.critChance/critMult, même
   convention que le combat réel). Retourne { totalDamage,
   anyCritical, hitsDamage: [...] }. Retourne des dégâts nuls pour une
   action de type "defense" (pas de damageMultiplier). Ne mute rien. */
function computeSandboxActionDamage(state, action) {
  if (!state || !action || action.type !== "damage" || typeof action.damageMultiplier !== "number") {
    return { totalDamage: 0, anyCritical: false, hitsDamage: [] };
  }
  var hero = state.hero;
  var enemy = state.enemy;
  var affinityMult = getDamageAffinityMult(hero.weaponType, enemy.resists, enemy.weak, state.enemyCoefs);
  var hits = Math.max(1, action.hits || 1);
  var hitsDamage = [];
  var anyCritical = false;

  for (var i = 0; i < hits; i++) {
    var isCritical = Math.random() < hero.critChance;
    if (isCritical) anyCritical = true;
    var base = hero.tapDamage * action.damageMultiplier * affinityMult;
    var dmg = Math.max(1, Math.floor(isCritical ? base * hero.critMult : base));
    hitsDamage.push(dmg);
  }

  var totalDamage = hitsDamage.reduce(function (sum, d) { return sum + d; }, 0);
  return { totalDamage: totalDamage, anyCritical: anyCritical, hitsDamage: hitsDamage };
}

/* resolveSandboxEnemyStrike(state)
   Calcule les dégâts de riposte de l'ennemi de test contre le héros
   de test, même convention que CombatEngine.enemyStrike() (power ×
   POWER_DMG_COEF, réduit par hero.defensePct), dupliquée ici en
   lecture seule. v3.33.12 : POWER_DMG_COEF lu depuis state.enemyCoefs
   si réglé (voir createSandboxCombatState()), sinon SANDBOX_ENEMY_COEFS
   par défaut.

   v3.33.13 : applique EN PLUS la réduction de state.activeDefense
   (Garde/Esquive/Barrière arcanique, voir SANDBOX_DEFENSE_EFFECTS) si
   encore valide (state.elapsedMs < activeDefense.expiresAtMs) — un
   effet expiré est ignoré ici sans avoir besoin d'être purgé au
   préalable (tickSandboxTime() le purge aussi, par cohérence de
   l'état, mais cette fonction ne DÉPEND pas de cette purge). Les deux
   réductions (defensePct fixe + activeDefense temporaire) sont
   multiplicatives, pas additives — cohérent avec la convention déjà
   en place pour defensePct seul. Retourne { damage, avoided } —
   avoided = delta entre les dégâts SANS activeDefense et le résultat
   final, pour alimenter state.totalDamageAvoided (voir
   triggerSandboxEnemyStrike()). Ne modifie rien. */
function resolveSandboxEnemyStrike(state) {
  if (!state) return { damage: 0, avoided: 0 };
  var c = Object.assign({}, SANDBOX_ENEMY_COEFS, state.enemyCoefs || {});
  var raw = state.enemy.power * c.POWER_DMG_COEF;
  var afterDefensePct = raw * (1 - state.hero.defensePct);

  var activeDefense = state.activeDefense;
  var isDefenseActive = !!(activeDefense && state.elapsedMs < activeDefense.expiresAtMs);
  var mitigated = isDefenseActive ? afterDefensePct * (1 - activeDefense.reductionPct) : afterDefensePct;

  var damageWithoutActiveDefense = Math.max(1, Math.floor(afterDefensePct));
  var damage = Math.max(1, Math.floor(mitigated));
  var avoided = isDefenseActive ? Math.max(0, damageWithoutActiveDefense - damage) : 0;

  return { damage: damage, avoided: avoided };
}

/* triggerSandboxEnemyStrike(state)
   v3.33.9 : applique une riposte ennemie à state (dégâts au héros de
   test, ligne de journal, transition vers "defeat" le cas échéant) —
   factorisé pour être appelé UNIQUEMENT depuis tickSandboxTime() une
   fois que enemyAttackTimerMs atteint 0 (minuteur propre à l'ennemi,
   indépendant du rythme du joueur — voir note "CADENCE DE RIPOSTE"
   en tête de fichier). N'est plus jamais appelé directement par
   applySandboxAction(). Retourne un NOUVEL état, jamais de mutation.
   v3.33.13 : cumule strike.avoided dans next.totalDamageAvoided, et
   mentionne la réduction dans le log si un effet défensif était actif
   au moment de la riposte. */
function triggerSandboxEnemyStrike(state) {
  var strike = resolveSandboxEnemyStrike(state);
  var next = Object.assign({}, state, {
    hero: Object.assign({}, state.hero, {
      hp: Math.max(0, state.hero.hp - strike.damage)
    }),
    totalDamageAvoided: (state.totalDamageAvoided || 0) + strike.avoided
  });
  var logLine = next.enemy.name + " attaque → " + strike.damage + " dégâts au héros de test.";
  if (strike.avoided > 0) {
    logLine += " (" + strike.avoided + " dégâts évités grâce à " + state.activeDefense.sourceLabel + ")";
  }
  next = appendSandboxLog(next, logLine);

  if (next.hero.hp <= 0) {
    next.status = "defeat";
    next = appendSandboxLog(next, "💀 Défaite — le héros de test tombe.");
    return finalizeSandboxCombat(next);
  }
  return next;
}

/* applySandboxAction(state, actionSlot)
   Fonction PRINCIPALE d'utilisation d'une action de test : vérifie
   canUseAction() (combat-cooldown-system.js) avec un combatContext
   dérivé de state (enemyHp/enemyMaxHp), résout les dégâts si l'action
   en inflige, met à jour ressource/cooldowns/PV/journal/statut de fin
   de combat. Retourne un NOUVEL état — ne mute jamais l'état reçu. Si
   l'action est refusée (canUseAction false) ou si le combat est déjà
   terminé (state.status !== "ongoing"), retourne un état avec une
   ligne de journal expliquant le refus, sans autre effet. N'appelle
   jamais killEnemy() ni aucun système de progression réel — la
   victoire/défaite est un simple champ `status` local.

   v3.33.9 — CORRIGÉ : cette fonction NE déclenche plus la riposte
   ennemie (elle le faisait à chaque appel, donc à chaque action du
   joueur — la cadence de riposte dépendait à tort du rythme de clic).
   La riposte est désormais entièrement pilotée par le minuteur propre
   de l'ennemi (state.enemyAttackTimerMs), décrémenté par
   tickSandboxTime() et déclenché via triggerSandboxEnemyStrike()
   quand il atteint 0 — voir tickSandboxTime() plus bas. */
function applySandboxAction(state, actionSlot) {
  if (!state) return state;
  if (state.status !== "ongoing") {
    return appendSandboxLog(state, "Combat déjà terminé — relance un combat pour continuer.");
  }

  var kit = getClassSkills(state.classId);
  var action = kit ? kit.actions[actionSlot] : null;
  if (!action) {
    return appendSandboxLog(state, "Action inconnue (" + actionSlot + ").");
  }

  var combatContext = {
    enemyHp: state.enemy.hp,
    enemyMaxHp: state.enemy.maxHp
  };

  if (!canUseAction(state.resourceState, state.cooldownState, action, combatContext)) {
    var reason = "indisponible";
    if (!canAfford(state.resourceState, action.resourceCost)) reason = "ressource insuffisante";
    else if (!isCooldownReady(state.cooldownState, action.id)) reason = "en recharge";
    else if (!checkActionConditions(action.conditions, combatContext)) reason = "condition non remplie";
    return appendSandboxLog(state, action.label + " refusé (" + reason + ").");
  }

  var next = Object.assign({}, state);
  next.actionsUsed = state.actionsUsed + 1;

  // 1. Coût + cooldown + gain fixe éventuel de l'action (useAction()).
  var useResult = useAction(state.resourceState, state.cooldownState, action, combatContext);
  next.resourceState = useResult.resourceState;
  next.cooldownState = useResult.cooldownState;

  // 1bis. v3.33.6 — cooldown de l'attaque de base, BAC À SABLE
  // UNIQUEMENT : action.cooldownMs vaut 0 dans data/class-skills.js
  // (jeu réel inchangé, useAction() vient donc de démarrer un
  // cooldown nul ci-dessus, sans effet). On écrase ce cooldown pour
  // le seul slot "basic" avec un cooldown effectif dérivé de la
  // Célérité du héros de test (computeEffectiveCooldownMs,
  // combat-cooldown-system.js) et de state.baseCooldownMs (réglable,
  // voir ui/combat-sandbox-view.js). N'affecte JAMAIS skill1/skill2/
  // skill3/defense, qui gardent leur propre action.cooldownMs déjà
  // posé par useAction() ci-dessus.
  if (actionSlot === "basic" && typeof computeEffectiveCooldownMs === "function") {
    var effectiveBasicCooldownMs = computeEffectiveCooldownMs(state.baseCooldownMs, next.hero.celerity);
    next.cooldownState = startCooldown(next.cooldownState, action.id, effectiveBasicCooldownMs);
  }

  // 1ter. v3.33.15 — cooldown des SKILLS (skill1/skill2/skill3/
  // defense), BAC À SABLE UNIQUEMENT : réduit par la Volonté du héros
  // de test, même formule et même plafond que Célérité pour l'attaque
  // de base ci-dessus (computeEffectiveCooldownMs, plafond
  // SANDBOX_WILL_COOLDOWN_MIN_RATIO = -50% max). Écrase le cooldown
  // déjà posé par useAction() (action.cooldownMs brut, voir
  // data/class-skills.js) — jamais "basic", qui garde son propre
  // traitement Célérité juste au-dessus. Donne un second rôle,
  // universel aux 3 classes, à une stat qui n'avait auparavant qu'un
  // effet conditionnel faible (+critMult, voir SANDBOX_HERO_BASE_COEFS
  // et note d'en-tête de SANDBOX_WILL_COOLDOWN_MIN_RATIO).
  if (actionSlot !== "basic" && action.cooldownMs > 0 && typeof computeEffectiveCooldownMs === "function") {
    var reducedSkillCooldownMs = computeEffectiveCooldownMs(action.cooldownMs, next.hero.stats.will, { minRatio: SANDBOX_WILL_COOLDOWN_MIN_RATIO });
    next.cooldownState = startCooldown(next.cooldownState, action.id, reducedSkillCooldownMs);
  }

  var logLine = action.label;
  var isCritical = false;
  var damageDealt = 0;

  // 2. Dégâts à l'ennemi de test (jamais combat-engine.js / killEnemy()).
  if (action.type === "damage") {
    var dmgResult = computeSandboxActionDamage(next, action);
    isCritical = dmgResult.anyCritical;
    damageDealt = dmgResult.totalDamage;
    next.enemy = Object.assign({}, next.enemy, {
      hp: Math.max(0, next.enemy.hp - damageDealt)
    });
    logLine += " → " + damageDealt + " dégâts" + (isCritical ? " (critique)" : "");
  } else if (action.type === "defense") {
    // v3.33.13 : pose un effet défensif temporaire (voir
    // SANDBOX_DEFENSE_EFFECTS) consulté par resolveSandboxEnemyStrike()
    // pour la PROCHAINE riposte tant qu'il n'a pas expiré (elapsedMs
    // absolu, purgé aussi par tickSandboxTime()). Rejouer l'action
    // pendant qu'un effet est déjà actif le REMPLACE (pas de cumul).
    var defenseEffect = SANDBOX_DEFENSE_EFFECTS[action.id];
    if (defenseEffect) {
      next.activeDefense = {
        reductionPct: defenseEffect.reductionPct,
        expiresAtMs: next.elapsedMs + defenseEffect.durationMs,
        sourceLabel: action.label
      };
      logLine += " → posture défensive activée (" + Math.round(defenseEffect.reductionPct * 100) + "% de réduction, " + (defenseEffect.durationMs / 1000) + "s)";
    } else {
      logLine += " → posture défensive activée";
    }
  }

  // 3. Gain de ressource dérivé de resource.generation (distinct du
  //    resourceGain fixe déjà appliqué par useAction()) — ex. Rage du
  //    Chevalier proportionnelle aux dégâts réellement infligés.
  var resourceDef = getClassResource(state.classId);
  if (resourceDef && resourceDef.generation) {
    var gainContext = {
      damageDealt: damageDealt,
      isCritical: isCritical,
      isBasicAttack: actionSlot === "basic"
    };
    var beforeGain = next.resourceState.current;
    next.resourceState = applyResourceGain(next.resourceState, resourceDef.generation, gainContext);
    var gained = next.resourceState.current - beforeGain;
    if (gained > 0) {
      logLine += " (+" + (Math.round(gained * 100) / 100) + " " + resourceDef.label + ")";
    }
  }

  next = appendSandboxLog(next, logLine);

  // 4. Fin de combat côté ennemi ? (la riposte n'est PLUS déclenchée
  //    ici — voir note d'en-tête, elle vit dans tickSandboxTime()).
  if (next.enemy.hp <= 0) {
    next.status = "victory";
    next = appendSandboxLog(next, "🏆 Victoire — l'ennemi de test est vaincu.");
    return finalizeSandboxCombat(next);
  }

  return next;
}

/* finalizeSandboxCombat(state)
   Ajoute une ligne de résumé (actions utilisées, ressource restante
   gaspillée) une fois state.status !== "ongoing". Retourne un NOUVEL
   état. N'écrit rien en dehors de state.log. */
function finalizeSandboxCombat(state) {
  if (!state || state.status === "ongoing") return state;
  var resourceDef = getClassResource(state.classId);
  var wasted = Math.round((state.resourceState.current || 0) * 100) / 100;
  var summary = "Résumé — " + state.actionsUsed + " action(s) utilisée(s), " +
    wasted + " " + (resourceDef ? resourceDef.label : "ressource") + " restante(s) inutilisée(s).";
  return appendSandboxLog(state, summary);
}

/* tickSandboxTime(state, elapsedMs)
   Avance l'horloge de SIMULATION (pas Date.now()) : décrémente les
   cooldowns (tickCooldowns), applique la régénération passive de
   ressource (tickResourceRegen, pertinent pour le Mana), ET (v3.33.9)
   décrémente le minuteur de riposte PROPRE à l'ennemi
   (state.enemyAttackTimerMs) — dès qu'il atteint 0, l'ennemi attaque
   via triggerSandboxEnemyStrike() puis le minuteur repart à sa pleine
   durée (state.enemy.attackIntervalS × 1000), en reportant l'éventuel
   surplus de temps écoulé (pour ne pas dériver si elapsedMs est
   ponctuellement plus grand qu'un intervalle, ex. après une longue
   inactivité de l'UI). Peut donc déclencher PLUSIEURS ripostes en un
   seul appel si elapsedMs couvre plusieurs intervalles complets — le
   minuteur de l'ennemi tourne réellement en continu, indépendamment
   du rythme du joueur (voir note "CADENCE DE RIPOSTE" en tête de
   fichier). S'arrête dès que le combat n'est plus "ongoing" (ex. une
   riposte vient de provoquer une défaite). Retourne un NOUVEL état.
   Sans effet si state est absent, si le combat n'est déjà plus
   "ongoing" à l'appel, ou si elapsedMs <= 0. */
function tickSandboxTime(state, elapsedMs) {
  if (!state || state.status !== "ongoing") return state;
  var elapsed = (typeof elapsedMs === "number" && elapsedMs > 0) ? elapsedMs : 0;
  if (elapsed <= 0) return Object.assign({}, state);

  var resourceDef = getClassResource(state.classId);
  var next = Object.assign({}, state);
  next.elapsedMs = state.elapsedMs + elapsed;
  next.cooldownState = tickCooldowns(state.cooldownState, elapsed);
  if (resourceDef && resourceDef.generation) {
    next.resourceState = tickResourceRegen(state.resourceState, resourceDef.generation, elapsed);
  }

  // v3.33.13 : purge l'effet défensif temporaire expiré (voir
  // SANDBOX_DEFENSE_EFFECTS/resolveSandboxEnemyStrike()) — n'affecte
  // pas le résultat d'une riposte déjà résolue avant ce tick, juste
  // la cohérence de l'état pour la suite.
  if (next.activeDefense && next.elapsedMs >= next.activeDefense.expiresAtMs) {
    next.activeDefense = null;
  }

  // Minuteur de riposte ennemie — indépendant des actions du joueur.
  var remaining = (typeof next.enemyAttackTimerMs === "number") ? next.enemyAttackTimerMs - elapsed : -1;
  var fullIntervalMs = next.enemy.attackIntervalS * 1000;
  var guard = 0; // sécurité anti-boucle infinie si fullIntervalMs est ~0
  while (remaining <= 0 && next.status === "ongoing" && guard < 1000) {
    next = triggerSandboxEnemyStrike(next);
    remaining += fullIntervalMs > 0 ? fullIntervalMs : 1;
    guard++;
  }
  if (next.status === "ongoing") {
    next.enemyAttackTimerMs = remaining;
  }

  return next;
}

/* ============================================================
   MODE RUN (v3.33.5) — enchaîne plusieurs combats de test à la suite
   contre une file d'ennemis (composée manuellement ou via une zone,
   voir listSandboxZones()/buildSandboxQueueFromZone() ci-dessus).

   Le combat unique existant (createSandboxCombatState/applySandboxAction/
   tickSandboxTime) est totalement INCHANGÉ et continue d'être utilisé
   TEL QUEL pour chaque combat individuel du run — le run ne fait
   qu'orchestrer plusieurs de ces combats à la suite, avec un réglage
   de persistance appliqué à la TRANSITION entre deux combats.

   runState : {
     classId, heroId,
     queue: [enemyId, ...],       file complète, ordre fixé au lancement
     currentIndex: 0,              index du combat en cours dans queue
     currentCombat: <combat state> résultat de createSandboxCombatState,
                                    identique à un combat unique
     persistence: { hpMode, hpPercent, resourceMode, resourcePercent, cooldownMode },
     status: "ongoing" | "victory" | "defeat" | "stopped",
     victories: 0,
     totalDamageDealt: 0, totalDamageTaken: 0,
     actionCounts: { actionId: count, ... },  pour "action la plus utilisée"
     startedAtMs: 0, elapsedMs: 0,
     deathAt: null | { index, enemyId },
     log: [...]                    journal PARTAGÉ du run (transitions +
                                    lignes des combats individuels)
   }
============================================================ */

/* Valeurs par défaut de persistance — raisonnables pour un premier
   test (voir demande) : PV conservés, ressource conservée, cooldowns
   réinitialisés (un run reste jouable même avec un kit "épuisé" par
   le combat précédent en PV/ressource, mais chaque combat démarre
   avec ses compétences dispo). */
function createDefaultSandboxPersistence() {
  return {
    hpMode: "keep",        // "keep" | "percent" | "full"
    hpPercent: 50,
    resourceMode: "keep",  // "keep" | "percent" | "full"
    resourcePercent: 50,
    cooldownMode: "reset"  // "reset" | "keep"
  };
}

/* createSandboxRunState(classId, heroId, queue, persistence, overrideStats, baseCooldownMs, overrideEnemyCoefs)
   Initialise un NOUVEL état de run : premier combat de la file démarré
   via createSandboxCombatState() (INCHANGÉ), compteurs à zéro. Retourne
   null si classId/heroId est invalide, ou si queue est vide/invalide,
   ou si le premier combat ne peut pas être créé. Ne modifie aucune
   donnée source.

   v3.33.6 : overrideStats/baseCooldownMs (optionnels, mêmes formats
   que createSandboxCombatState()) sont conservés dans le runState
   (overrideStats/baseCooldownMs) pour être réappliqués identiquement
   à CHAQUE nouveau combat de la file lors des transitions — voir
   applySandboxRunAction(), qui les repasse à createSandboxCombatState()
   au lieu de repartir des stats de base à chaque combat.

   v3.33.12 : overrideEnemyCoefs (optionnel, même format que
   createSandboxCombatState()) suit la même logique — conservé dans le
   runState, réappliqué à chaque nouveau combat de la file.

   v3.46.0 : equipmentRarity (optionnel, même format que
   createSandboxCombatState()) suit la même logique — conservé dans le
   runState, réappliqué à chaque nouveau combat de la file. */
function createSandboxRunState(classId, heroId, queue, persistence, overrideStats, baseCooldownMs, overrideEnemyCoefs, equipmentRarity) {
  if (!Array.isArray(queue) || queue.length === 0) return null;
  var firstCombat = createSandboxCombatState(classId, heroId, queue[0], overrideStats, baseCooldownMs, overrideEnemyCoefs, equipmentRarity);
  if (!firstCombat) return null;

  var pers = persistence || createDefaultSandboxPersistence();

  return {
    classId: classId,
    heroId: heroId,
    overrideStats: overrideStats || null,
    baseCooldownMs: firstCombat.baseCooldownMs,
    overrideEnemyCoefs: overrideEnemyCoefs || null,
    equipmentRarity: equipmentRarity || null,
    queue: queue.slice(),
    currentIndex: 0,
    currentCombat: firstCombat,
    persistence: pers,
    status: "ongoing",
    victories: 0,
    totalDamageDealt: 0,
    totalDamageTaken: 0,
    totalDamageAvoided: 0, // v3.33.13 — voir SANDBOX_DEFENSE_EFFECTS
    actionCounts: {},
    elapsedMs: 0,
    deathAt: null,
    log: [appendRunLogEntry(0, "--- Début du combat contre " + firstCombat.enemy.name + (firstCombat.enemy.isBoss ? " (BOSS)" : "") + " (1/" + queue.length + ") ---")]
  };
}

function appendRunLogEntry(atMs, text) {
  return { atMs: atMs, text: text };
}

/* sumSandboxDamageFromLog(prevCombat, nextCombat)
   Best-effort : dérive les dégâts infligés/reçus entre deux instantanés
   successifs d'un même combat, à partir des PV (hp) plutôt que de
   reparser le texte du journal — fiable et ne duplique aucune règle de
   calcul de dégâts. */
function diffSandboxHp(prevCombat, nextCombat) {
  var dealt = Math.max(0, prevCombat.enemy.hp - nextCombat.enemy.hp);
  var taken = Math.max(0, prevCombat.hero.hp - nextCombat.hero.hp);
  return { dealt: dealt, taken: taken };
}

/* applySandboxPersistence(combat, persistence)
   Applique le réglage de persistance à la TRANSITION entre deux
   combats du run : PV/ressource conservés, restaurés en % configurable,
   ou restaurés à 100% ; cooldowns conservés en cours ou réinitialisés.
   Retourne un NOUVEL état de combat (même forme que
   createSandboxCombatState, PV/ressource/cooldowns ajustés, reste
   inchangé). Utilise EXCLUSIVEMENT des fonctions déjà exportées
   (restoreResourcePercent, createCooldownState) — aucune règle
   dupliquée ici. */
function applySandboxPersistence(combat, persistence) {
  var next = Object.assign({}, combat);

  // PV du héros.
  if (persistence.hpMode === "full") {
    next.hero = Object.assign({}, next.hero, { hp: next.hero.maxHp });
  } else if (persistence.hpMode === "percent") {
    var hpGain = next.hero.maxHp * (Math.max(0, Math.min(100, persistence.hpPercent || 0)) / 100);
    next.hero = Object.assign({}, next.hero, { hp: Math.min(next.hero.maxHp, next.hero.hp + hpGain) });
  }
  // "keep" : aucun changement, PV tels quels.

  // Ressource de classe.
  if (persistence.resourceMode === "full") {
    next.resourceState = Object.assign({}, next.resourceState, { current: next.resourceState.max });
  } else if (persistence.resourceMode === "percent") {
    next.resourceState = restoreResourcePercent(next.resourceState, persistence.resourcePercent || 0);
  }
  // "keep" : aucun changement.

  // Cooldowns.
  if (persistence.cooldownMode === "reset") {
    next.cooldownState = createCooldownState();
  }
  // "keep" : cooldownState tel quel (temps restants conservés).

  return next;
}

/* applySandboxRunAction(runState, actionSlot)
   Fonction PRINCIPALE du mode Run : applique une action au combat en
   cours (applySandboxAction(), INCHANGÉE), met à jour les compteurs
   globaux du run (dégâts, fréquence d'action), et gère les
   transitions :
     - victoire du combat en cours + file épuisée -> run "victory" ;
     - victoire du combat en cours + file non épuisée -> combat suivant
       créé via createSandboxCombatState() (INCHANGÉ) puis
       applySandboxPersistence() ;
     - défaite du combat en cours -> run "defeat" IMMÉDIAT, deathAt
       renseigné, AUCUN combat suivant n'est démarré (le héros ne
       ressuscite jamais automatiquement).
   Retourne un NOUVEL état de run. Si runState est absent ou déjà
   terminé (status !== "ongoing"), retourne l'état inchangé. */
function applySandboxRunAction(runState, actionSlot) {
  if (!runState) return runState;
  if (runState.status !== "ongoing") return runState;

  var prevCombat = runState.currentCombat;
  var nextCombat = applySandboxAction(prevCombat, actionSlot);

  var next = Object.assign({}, runState);
  next.currentCombat = nextCombat;
  next.elapsedMs = runState.elapsedMs + (nextCombat.elapsedMs - prevCombat.elapsedMs);

  // Compteur d'usage d'action — seulement si l'action a réellement été
  // exécutée (pas un refus : on compare actionsUsed avant/après).
  if (nextCombat.actionsUsed > prevCombat.actionsUsed) {
    var kit = getClassSkills(runState.classId);
    var action = kit ? kit.actions[actionSlot] : null;
    if (action) {
      next.actionCounts = Object.assign({}, runState.actionCounts);
      next.actionCounts[action.id] = (next.actionCounts[action.id] || 0) + 1;
    }
    var diff = diffSandboxHp(prevCombat, nextCombat);
    next.totalDamageDealt = runState.totalDamageDealt + diff.dealt;
    next.totalDamageTaken = runState.totalDamageTaken + diff.taken;
    next.totalDamageAvoided = (runState.totalDamageAvoided || 0) + ((nextCombat.totalDamageAvoided || 0) - (prevCombat.totalDamageAvoided || 0)); // v3.33.13
  }

  // Copier les nouvelles lignes de journal du combat courant dans le
  // journal du run (seulement les lignes ajoutées depuis prevCombat).
  var newLines = nextCombat.log.slice(prevCombat.log.length);
  next.log = runState.log.concat(newLines.map(function (entry) {
    return appendRunLogEntry(runState.elapsedMs + entry.atMs, entry.text);
  }));

  if (nextCombat.status === "defeat") {
    next.status = "defeat";
    next.deathAt = { index: runState.currentIndex, enemyId: runState.queue[runState.currentIndex] };
    next.log = next.log.concat([appendRunLogEntry(next.elapsedMs, "--- Run interrompu : défaite au combat " + (runState.currentIndex + 1) + "/" + runState.queue.length + " contre " + nextCombat.enemy.name + " ---")]);
    return finalizeSandboxRun(next);
  }

  if (nextCombat.status === "victory") {
    next.victories = runState.victories + 1;
    next.log = next.log.concat([appendRunLogEntry(next.elapsedMs, "--- Fin du combat contre " + nextCombat.enemy.name + ", victoire (" + next.victories + "/" + runState.queue.length + ") ---")]);

    var isLast = runState.currentIndex >= runState.queue.length - 1;
    if (isLast) {
      next.status = "victory";
      next.log = next.log.concat([appendRunLogEntry(next.elapsedMs, "🏆 Run terminé — tous les combats remportés.")]);
      return finalizeSandboxRun(next);
    }

    var nextIndex = runState.currentIndex + 1;
    var nextEnemyId = runState.queue[nextIndex];
    var freshCombat = createSandboxCombatState(runState.classId, runState.heroId, nextEnemyId, runState.overrideStats, runState.baseCooldownMs, runState.overrideEnemyCoefs, runState.equipmentRarity);
    if (!freshCombat) {
      next.status = "stopped";
      next.log = next.log.concat([appendRunLogEntry(next.elapsedMs, "--- Run arrêté : ennemi suivant invalide (" + nextEnemyId + ") ---")]);
      return next;
    }
    var carried = applySandboxPersistence(Object.assign({}, freshCombat, {
      hero: Object.assign({}, freshCombat.hero, { hp: nextCombat.hero.hp }),
      resourceState: nextCombat.resourceState,
      cooldownState: nextCombat.cooldownState
    }), runState.persistence);

    next.currentIndex = nextIndex;
    next.currentCombat = carried;
    next.log = next.log.concat([appendRunLogEntry(next.elapsedMs, "--- Début du combat contre " + carried.enemy.name + (carried.enemy.isBoss ? " (BOSS)" : "") + " (" + (nextIndex + 1) + "/" + runState.queue.length + ") ---")]);
  }

  return next;
}

/* tickSandboxRunTime(runState, elapsedMs)
   Avance l'horloge du combat EN COURS dans le run via tickSandboxTime()
   (cooldowns/régénération passive/minuteur de riposte ennemie — voir
   v3.33.9). Retourne un NOUVEL état de run.

   v3.33.9 — IMPORTANT : depuis que la riposte ennemie est pilotée par
   son propre minuteur (et non plus uniquement déclenchée par une
   action du joueur, voir tickSandboxTime()), un simple tick PEUT
   provoquer une défaite (le héros meurt d'une riposte alors que le
   joueur était inactif). Ce cas est donc géré ICI exactement comme
   applySandboxRunAction() le fait pour une défaite déclenchée par une
   action : run "defeat" IMMÉDIAT, deathAt renseigné, AUCUN combat
   suivant démarré. Le mode Run applique le même arrêt immédiat sur
   mort, que la mort vienne d'un clic ou du simple écoulement du
   temps. Sans effet si runState est absent ou déjà terminé. */
function tickSandboxRunTime(runState, elapsedMs) {
  if (!runState || runState.status !== "ongoing") return runState;
  var prevCombat = runState.currentCombat;
  var nextCombat = tickSandboxTime(prevCombat, elapsedMs);
  var elapsed = (typeof elapsedMs === "number" && elapsedMs > 0) ? elapsedMs : 0;

  var next = Object.assign({}, runState);
  next.currentCombat = nextCombat;
  next.elapsedMs = runState.elapsedMs + elapsed;

  var diff = diffSandboxHp(prevCombat, nextCombat);
  next.totalDamageTaken = runState.totalDamageTaken + diff.taken;
  next.totalDamageAvoided = (runState.totalDamageAvoided || 0) + ((nextCombat.totalDamageAvoided || 0) - (prevCombat.totalDamageAvoided || 0)); // v3.33.13

  var newLines = nextCombat.log.slice(prevCombat.log.length);
  next.log = runState.log.concat(newLines.map(function (entry) {
    return appendRunLogEntry(runState.elapsedMs + entry.atMs, entry.text);
  }));

  if (nextCombat.status === "defeat") {
    next.status = "defeat";
    next.deathAt = { index: runState.currentIndex, enemyId: runState.queue[runState.currentIndex] };
    next.log = next.log.concat([appendRunLogEntry(next.elapsedMs, "--- Run interrompu : défaite au combat " + (runState.currentIndex + 1) + "/" + runState.queue.length + " contre " + nextCombat.enemy.name + " ---")]);
    return finalizeSandboxRun(next);
  }

  return next;
}

/* stopSandboxRun(runState)
   Arrêt MANUEL d'un run en cours (bouton dédié) — statut "stopped",
   distinct de "defeat"/"victory". Retourne un NOUVEL état. Sans effet
   si runState est absent ou déjà terminé. */
function stopSandboxRun(runState) {
  if (!runState || runState.status !== "ongoing") return runState;
  var next = Object.assign({}, runState, { status: "stopped" });
  next.log = runState.log.concat([appendRunLogEntry(runState.elapsedMs, "--- Run arrêté manuellement (combat " + (runState.currentIndex + 1) + "/" + runState.queue.length + ") ---")]);
  return finalizeSandboxRun(next);
}

/* finalizeSandboxRun(runState)
   Ajoute le résumé de fin de run (combats remportés, dégâts totaux,
   temps total, ressource/PV restants, action la plus utilisée, et
   détail de la mort le cas échéant) une fois status !== "ongoing".
   Retourne un NOUVEL état. N'écrit rien en dehors de runState.log. */
function finalizeSandboxRun(runState) {
  if (!runState || runState.status === "ongoing") return runState;

  var mostUsedId = null;
  var mostUsedCount = 0;
  Object.keys(runState.actionCounts).forEach(function (id) {
    if (runState.actionCounts[id] > mostUsedCount) {
      mostUsedCount = runState.actionCounts[id];
      mostUsedId = id;
    }
  });

  var lines = [];
  lines.push("📊 Résumé du run — " + runState.victories + "/" + runState.queue.length + " combat(s) remporté(s).");
  lines.push("Dégâts totaux infligés : " + Math.round(runState.totalDamageDealt) + " — reçus : " + Math.round(runState.totalDamageTaken) + ".");
  lines.push("Temps total : " + (Math.round(runState.elapsedMs / 100) / 10) + "s.");
  lines.push("PV restants : " + Math.max(0, Math.floor(runState.currentCombat.hero.hp)) + " / " + runState.currentCombat.hero.maxHp + ".");
  lines.push("Ressource restante : " + (Math.round(runState.currentCombat.resourceState.current * 100) / 100) + " / " + runState.currentCombat.resourceState.max + ".");
  lines.push(mostUsedId ? ("Action la plus utilisée : " + mostUsedId + " (" + mostUsedCount + " fois).") : "Aucune action utilisée.");
  if (runState.deathAt) {
    lines.push("💀 Mort au combat " + (runState.deathAt.index + 1) + "/" + runState.queue.length + " contre " + runState.deathAt.enemyId + ".");
  }

  return Object.assign({}, runState, {
    log: runState.log.concat(lines.map(function (text) { return appendRunLogEntry(runState.elapsedMs, text); }))
  });
}

/* ============================================================
   MODE INFINI (v3.33.9) — enchaîne TOUS les ennemis de ENEMY_DB dans
   l'ordre de progression du jeu (listSandboxAllEnemiesInOrder()),
   sans fin définie à l'avance : reboucle sur la liste complète tant
   que le héros ne meurt pas, ou jusqu'à un arrêt manuel.

   Réutilise EXACTEMENT le même système de persistance que le mode Run
   (applySandboxPersistence(), createDefaultSandboxPersistence()) —
   aucune nouvelle logique de persistance inventée pour ce mode,
   comme demandé. La structure infiniteState est volontairement très
   proche de runState (mode Run) : mêmes principes de transition
   (victoire -> combat suivant persistant ; défaite -> arrêt immédiat,
   pas de résurrection), simplement sans notion de file FIGÉE ni de
   fin de run automatique par épuisement de la liste — l'épuisement
   déclenche un nouveau tour (loopCount+1) plutôt qu'une fin de run.

   infiniteState : {
     classId, heroId, overrideStats, baseCooldownMs, persistence,
     enemyOrder: [enemyId, ...],    liste complète, ordre fixé au lancement
     currentPosition: 0,             index dans enemyOrder (0-based)
     loopCount: 1,                    nombre de tours de liste effectués
     currentCombat: <combat state>,
     status: "ongoing" | "defeat" | "stopped",
     defeatedCount: 0,                ennemis vaincus consécutivement
     totalDamageDealt: 0, totalDamageTaken: 0,
     actionCounts: {...},
     elapsedMs: 0,
     deathAt: null | { enemyId, position, loopCount },
     log: [...]
   }
============================================================ */

/* createSandboxInfiniteState(classId, heroId, persistence, overrideStats, baseCooldownMs, overrideEnemyCoefs)
   Initialise un NOUVEL état de mode infini : liste complète des
   ennemis via listSandboxAllEnemiesInOrder(), premier combat démarré
   via createSandboxCombatState() (INCHANGÉE). Retourne null si
   classId/heroId est invalide, si la liste d'ennemis est vide, ou si
   le premier combat ne peut pas être créé. Ne modifie aucune donnée
   source.

   v3.33.12 : overrideEnemyCoefs (optionnel, même format que
   createSandboxCombatState()) — conservé dans l'état, réappliqué à
   chaque nouveau combat de la boucle (voir
   advanceSandboxInfiniteToNextEnemy()).

   v3.46.0 : equipmentRarity (optionnel, même format que
   createSandboxCombatState()) — conservé dans l'état, réappliqué à
   chaque nouveau combat de la boucle. */
function createSandboxInfiniteState(classId, heroId, persistence, overrideStats, baseCooldownMs, overrideEnemyCoefs, equipmentRarity) {
  var enemyOrder = listSandboxAllEnemiesInOrder();
  if (!enemyOrder.length) return null;

  var firstCombat = createSandboxCombatState(classId, heroId, enemyOrder[0], overrideStats, baseCooldownMs, overrideEnemyCoefs, equipmentRarity);
  if (!firstCombat) return null;

  var pers = persistence || createDefaultSandboxPersistence();

  return {
    classId: classId,
    heroId: heroId,
    overrideStats: overrideStats || null,
    baseCooldownMs: firstCombat.baseCooldownMs,
    overrideEnemyCoefs: overrideEnemyCoefs || null,
    equipmentRarity: equipmentRarity || null,
    persistence: pers,
    enemyOrder: enemyOrder,
    currentPosition: 0,
    loopCount: 1,
    currentCombat: firstCombat,
    status: "ongoing", // "ongoing" | "defeat" | "stopped"
    defeatedCount: 0,
    totalDamageDealt: 0,
    totalDamageTaken: 0,
    totalDamageAvoided: 0, // v3.33.13 — voir SANDBOX_DEFENSE_EFFECTS
    actionCounts: {},
    elapsedMs: 0,
    deathAt: null,
    log: [appendRunLogEntry(0, "--- Début du combat contre " + firstCombat.enemy.name + " (Ennemi 1/" + enemyOrder.length + ", Boucle 1) ---")]
  };
}

/* advanceSandboxInfiniteToNextEnemy(infiniteState, nextCombatFromCurrent)
   Fait avancer infiniteState d'une position dans enemyOrder (en
   rebouclant sur la liste avec loopCount+1 si la fin est atteinte),
   crée le combat suivant et lui applique applySandboxPersistence()
   avec l'état de héros/ressource/cooldowns hérité de
   nextCombatFromCurrent (combat qui vient d'être remporté). Retourne
   { status: "ok", state } ou { status: "invalid" } si le combat
   suivant n'a pas pu être créé (donnée corrompue, ne devrait pas
   arriver). Factorisé car utilisé par applySandboxInfiniteAction() ET
   potentiellement une future extension — évite la duplication entre
   les deux points d'avancement du mode infini. */
function advanceSandboxInfiniteToNextEnemy(infiniteState, nextCombatFromCurrent) {
  var nextPosition = infiniteState.currentPosition + 1;
  var loopCount = infiniteState.loopCount;
  var loopedThisStep = false;
  if (nextPosition >= infiniteState.enemyOrder.length) {
    nextPosition = 0;
    loopCount = infiniteState.loopCount + 1;
    loopedThisStep = true;
  }

  var nextEnemyId = infiniteState.enemyOrder[nextPosition];
  var freshCombat = createSandboxCombatState(infiniteState.classId, infiniteState.heroId, nextEnemyId, infiniteState.overrideStats, infiniteState.baseCooldownMs, infiniteState.overrideEnemyCoefs, infiniteState.equipmentRarity);
  if (!freshCombat) return { status: "invalid" };

  var carried = applySandboxPersistence(Object.assign({}, freshCombat, {
    hero: Object.assign({}, freshCombat.hero, { hp: nextCombatFromCurrent.hero.hp }),
    resourceState: nextCombatFromCurrent.resourceState,
    cooldownState: nextCombatFromCurrent.cooldownState
  }), infiniteState.persistence);

  return { status: "ok", position: nextPosition, loopCount: loopCount, loopedThisStep: loopedThisStep, combat: carried };
}

/* applySandboxInfiniteAction(infiniteState, actionSlot)
   Équivalent de applySandboxRunAction() pour le mode infini : applique
   une action au combat en cours (applySandboxAction(), INCHANGÉE),
   met à jour les compteurs globaux, et gère les transitions :
     - victoire -> ennemi suivant dans enemyOrder (ou reboucle avec
       loopCount+1 si la liste est épuisée), persistance appliquée,
       defeatedCount incrémenté ;
     - défaite -> mode infini "defeat" IMMÉDIAT, deathAt renseigné
       (enemyId/position/loopCount), AUCUN combat suivant démarré, le
       héros ne ressuscite jamais automatiquement.
   Retourne un NOUVEL état. Si infiniteState est absent ou déjà
   terminé (status !== "ongoing"), retourne l'état inchangé. N'appelle
   jamais killEnemy() ni aucun système de progression réel. */
function applySandboxInfiniteAction(infiniteState, actionSlot) {
  if (!infiniteState) return infiniteState;
  if (infiniteState.status !== "ongoing") return infiniteState;

  var prevCombat = infiniteState.currentCombat;
  var nextCombat = applySandboxAction(prevCombat, actionSlot);

  var next = Object.assign({}, infiniteState);
  next.currentCombat = nextCombat;
  next.elapsedMs = infiniteState.elapsedMs + (nextCombat.elapsedMs - prevCombat.elapsedMs);

  if (nextCombat.actionsUsed > prevCombat.actionsUsed) {
    var kit = getClassSkills(infiniteState.classId);
    var action = kit ? kit.actions[actionSlot] : null;
    if (action) {
      next.actionCounts = Object.assign({}, infiniteState.actionCounts);
      next.actionCounts[action.id] = (next.actionCounts[action.id] || 0) + 1;
    }
    var diff = diffSandboxHp(prevCombat, nextCombat);
    next.totalDamageDealt = infiniteState.totalDamageDealt + diff.dealt;
    next.totalDamageTaken = infiniteState.totalDamageTaken + diff.taken;
    next.totalDamageAvoided = (infiniteState.totalDamageAvoided || 0) + ((nextCombat.totalDamageAvoided || 0) - (prevCombat.totalDamageAvoided || 0)); // v3.33.13
  }

  var newLines = nextCombat.log.slice(prevCombat.log.length);
  next.log = infiniteState.log.concat(newLines.map(function (entry) {
    return appendRunLogEntry(infiniteState.elapsedMs + entry.atMs, entry.text);
  }));

  if (nextCombat.status === "defeat") {
    next.status = "defeat";
    next.deathAt = { enemyId: infiniteState.enemyOrder[infiniteState.currentPosition], position: infiniteState.currentPosition, loopCount: infiniteState.loopCount };
    next.log = next.log.concat([appendRunLogEntry(next.elapsedMs, "--- Mode infini interrompu : défaite contre " + nextCombat.enemy.name + " (Ennemi " + (infiniteState.currentPosition + 1) + "/" + infiniteState.enemyOrder.length + ", Boucle " + infiniteState.loopCount + ") ---")]);
    return finalizeSandboxInfinite(next);
  }

  if (nextCombat.status === "victory") {
    next.defeatedCount = infiniteState.defeatedCount + 1;
    next.log = next.log.concat([appendRunLogEntry(next.elapsedMs, "--- Fin du combat contre " + nextCombat.enemy.name + ", victoire (" + next.defeatedCount + " vaincu(s) au total) ---")]);

    var advance = advanceSandboxInfiniteToNextEnemy(infiniteState, nextCombat);
    if (advance.status === "invalid") {
      next.status = "stopped";
      next.log = next.log.concat([appendRunLogEntry(next.elapsedMs, "--- Mode infini arrêté : ennemi suivant invalide ---")]);
      return next;
    }

    next.currentPosition = advance.position;
    next.loopCount = advance.loopCount;
    next.currentCombat = advance.combat;
    if (advance.loopedThisStep) {
      next.log = next.log.concat([appendRunLogEntry(next.elapsedMs, "🔁 Liste complète parcourue — Boucle " + advance.loopCount + " commence.")]);
    }
    next.log = next.log.concat([appendRunLogEntry(next.elapsedMs, "--- Début du combat contre " + advance.combat.enemy.name + " (Ennemi " + (advance.position + 1) + "/" + infiniteState.enemyOrder.length + ", Boucle " + advance.loopCount + ") ---")]);
  }

  return next;
}

/* tickSandboxInfiniteTime(infiniteState, elapsedMs)
   Équivalent de tickSandboxRunTime() pour le mode infini — mêmes
   garanties, y compris la gestion d'une défaite déclenchée par le
   simple écoulement du temps (riposte ennemie via son propre
   minuteur, voir tickSandboxTime()). Retourne un NOUVEL état. Sans
   effet si infiniteState est absent ou déjà terminé. */
function tickSandboxInfiniteTime(infiniteState, elapsedMs) {
  if (!infiniteState || infiniteState.status !== "ongoing") return infiniteState;
  var prevCombat = infiniteState.currentCombat;
  var nextCombat = tickSandboxTime(prevCombat, elapsedMs);
  var elapsed = (typeof elapsedMs === "number" && elapsedMs > 0) ? elapsedMs : 0;

  var next = Object.assign({}, infiniteState);
  next.currentCombat = nextCombat;
  next.elapsedMs = infiniteState.elapsedMs + elapsed;

  var diff = diffSandboxHp(prevCombat, nextCombat);
  next.totalDamageTaken = infiniteState.totalDamageTaken + diff.taken;
  next.totalDamageAvoided = (infiniteState.totalDamageAvoided || 0) + ((nextCombat.totalDamageAvoided || 0) - (prevCombat.totalDamageAvoided || 0)); // v3.33.13

  var newLines = nextCombat.log.slice(prevCombat.log.length);
  next.log = infiniteState.log.concat(newLines.map(function (entry) {
    return appendRunLogEntry(infiniteState.elapsedMs + entry.atMs, entry.text);
  }));

  if (nextCombat.status === "defeat") {
    next.status = "defeat";
    next.deathAt = { enemyId: infiniteState.enemyOrder[infiniteState.currentPosition], position: infiniteState.currentPosition, loopCount: infiniteState.loopCount };
    next.log = next.log.concat([appendRunLogEntry(next.elapsedMs, "--- Mode infini interrompu : défaite contre " + nextCombat.enemy.name + " (Ennemi " + (infiniteState.currentPosition + 1) + "/" + infiniteState.enemyOrder.length + ", Boucle " + infiniteState.loopCount + ") ---")]);
    return finalizeSandboxInfinite(next);
  }

  return next;
}

/* stopSandboxInfinite(infiniteState)
   Arrêt MANUEL du mode infini (bouton dédié) — statut "stopped",
   distinct de "defeat". Retourne un NOUVEL état. Sans effet si
   infiniteState est absent ou déjà terminé. */
function stopSandboxInfinite(infiniteState) {
  if (!infiniteState || infiniteState.status !== "ongoing") return infiniteState;
  var next = Object.assign({}, infiniteState, { status: "stopped" });
  next.log = infiniteState.log.concat([appendRunLogEntry(infiniteState.elapsedMs, "--- Mode infini arrêté manuellement (Ennemi " + (infiniteState.currentPosition + 1) + "/" + infiniteState.enemyOrder.length + ", Boucle " + infiniteState.loopCount + ") ---")]);
  return finalizeSandboxInfinite(next);
}

/* finalizeSandboxInfinite(infiniteState)
   Ajoute le résumé de fin (ennemis vaincus, dégâts totaux, temps
   total, ressource/PV restants, action la plus utilisée, détail de
   la mort le cas échéant) une fois status !== "ongoing". Distingue
   explicitement un arrêt volontaire ("stopped") d'une défaite
   ("defeat") dans le texte du résumé, comme demandé. Retourne un
   NOUVEL état. N'écrit rien en dehors de infiniteState.log. */
function finalizeSandboxInfinite(infiniteState) {
  if (!infiniteState || infiniteState.status === "ongoing") return infiniteState;

  var mostUsedId = null;
  var mostUsedCount = 0;
  Object.keys(infiniteState.actionCounts).forEach(function (id) {
    if (infiniteState.actionCounts[id] > mostUsedCount) {
      mostUsedCount = infiniteState.actionCounts[id];
      mostUsedId = id;
    }
  });

  var lines = [];
  var isVoluntaryStop = infiniteState.status === "stopped";
  lines.push(isVoluntaryStop
    ? "📊 Résumé (arrêt volontaire) — " + infiniteState.defeatedCount + " ennemi(s) vaincu(s) au total."
    : "📊 Résumé (défaite) — " + infiniteState.defeatedCount + " ennemi(s) vaincu(s) avant la mort.");
  lines.push("Dégâts totaux infligés : " + Math.round(infiniteState.totalDamageDealt) + " — reçus : " + Math.round(infiniteState.totalDamageTaken) + ".");
  lines.push("Temps total : " + (Math.round(infiniteState.elapsedMs / 100) / 10) + "s.");
  lines.push("PV restants : " + Math.max(0, Math.floor(infiniteState.currentCombat.hero.hp)) + " / " + infiniteState.currentCombat.hero.maxHp + ".");
  lines.push("Ressource restante : " + (Math.round(infiniteState.currentCombat.resourceState.current * 100) / 100) + " / " + infiniteState.currentCombat.resourceState.max + ".");
  lines.push(mostUsedId ? ("Action la plus utilisée : " + mostUsedId + " (" + mostUsedCount + " fois).") : "Aucune action utilisée.");
  if (infiniteState.deathAt) {
    lines.push("💀 Mort contre " + infiniteState.deathAt.enemyId + " (Ennemi " + (infiniteState.deathAt.position + 1) + "/" + infiniteState.enemyOrder.length + ", Boucle " + infiniteState.deathAt.loopCount + ").");
  }

  return Object.assign({}, infiniteState, {
    log: infiniteState.log.concat(lines.map(function (text) { return appendRunLogEntry(infiniteState.elapsedMs, text); }))
  });
}

window.SANDBOX_HERO_BASE_COEFS = SANDBOX_HERO_BASE_COEFS;
window.SANDBOX_ENEMY_COEFS = SANDBOX_ENEMY_COEFS;
window.buildSandboxHeroStats = buildSandboxHeroStats;
window.getSandboxHeroBaseStats = getSandboxHeroBaseStats;
window.applySandboxEquipmentBonus = applySandboxEquipmentBonus; // v3.46.0
window.SANDBOX_DEFAULT_BASE_COOLDOWN_MS = SANDBOX_DEFAULT_BASE_COOLDOWN_MS;
window.buildSandboxEnemyStats = buildSandboxEnemyStats;
window.listSandboxEnemies = listSandboxEnemies;
window.listSandboxZones = listSandboxZones;
window.buildSandboxQueueFromZone = buildSandboxQueueFromZone;
window.getDamageAffinityMult = getDamageAffinityMult;
window.createSandboxCombatState = createSandboxCombatState;
window.applySandboxAction = applySandboxAction;
window.tickSandboxTime = tickSandboxTime;
window.computeSandboxActionDamage = computeSandboxActionDamage;
window.resolveSandboxEnemyStrike = resolveSandboxEnemyStrike;
window.createDefaultSandboxPersistence = createDefaultSandboxPersistence;
window.createSandboxRunState = createSandboxRunState;
window.applySandboxPersistence = applySandboxPersistence;
window.applySandboxRunAction = applySandboxRunAction;
window.tickSandboxRunTime = tickSandboxRunTime;
window.stopSandboxRun = stopSandboxRun;
window.finalizeSandboxRun = finalizeSandboxRun;
window.listSandboxAllEnemiesInOrder = listSandboxAllEnemiesInOrder;
window.createSandboxInfiniteState = createSandboxInfiniteState;
window.applySandboxInfiniteAction = applySandboxInfiniteAction;
window.tickSandboxInfiniteTime = tickSandboxInfiniteTime;
window.stopSandboxInfinite = stopSandboxInfinite;
window.finalizeSandboxInfinite = finalizeSandboxInfinite;
