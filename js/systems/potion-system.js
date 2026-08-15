"use strict";
/* ============================================================
Quest Idle — systems/potion-system.js
Achat et gestion des potions temporaires (voir data/potions.js).
Deux mécanismes distincts :
  - game.activePotions      { id: timestamp d'expiration } pour les
    potions à durée (Force/Célérité/Précision/Endurance/Fortune)
  - game.pendingPotionBonuses  bonus en attente sans minuteur
    (Élixir d'Aether), consommé par ascendNow() en
    progression-system.js puis remis à zéro
Les effets réels sont appliqués dans StatsSystem.recalcStats() via
PotionManager.getActiveEffects() — ce fichier ne touche jamais
directement game.tapDamage/goldMult/etc.

v2.83.45 : achat et activation DÉCOUPLÉS — acheter une potion
l'ajoute maintenant à un stock (game.potionsOwned[id]), comme les
potions de soin depuis toujours. L'activation réelle (démarrer le
minuteur, ou ajouter à pendingPotionBonuses pour l'Élixir d'Aether)
se fait à la demande via usePotion(id), depuis le nouveau sous-onglet
"🧪 Potions" de l'écran Équipement (voir ui/equipment-view.js) —
permet d'acheter à l'avance et de boire au bon moment plutôt que
d'être forcé d'activer immédiatement à l'achat.
============================================================ */

// v3.18 : hausse de prix composée par cycle (game.cycleCount) sur
// TOUTES les potions — voir getCost() plus bas.
var POTION_CYCLE_PRICE_GROWTH = 0.15; // +15% composé par cycle

var PotionManager = {
  ensure: function () {
    if (!game.activePotions || typeof game.activePotions !== "object") game.activePotions = {};
    if (!game.pendingPotionBonuses || typeof game.pendingPotionBonuses !== "object") {
      game.pendingPotionBonuses = { aetherNext: 0 };
    }
    if (typeof game.pendingPotionBonuses.aetherNext !== "number") game.pendingPotionBonuses.aetherNext = 0;
    if (typeof game.aetherElixirStackCount !== "number") game.aetherElixirStackCount = 0;
    if (!game.potionsOwned || typeof game.potionsOwned !== "object") game.potionsOwned = {};
  },

  getPotion: function (id) {
    return (POTIONS_DB || []).find(function (p) { return p.id === id; }) || null;
  },

  getStock: function (id) {
    this.ensure();
    return Number(game.potionsOwned[id] || 0);
  },

  /* Millisecondes restantes avant expiration d'une potion à durée
     (0 si inactive ou déjà expirée). */
  getRemainingMs: function (id) {
    this.ensure();
    var expires = game.activePotions[id];
    if (!expires) return 0;
    return Math.max(0, expires - Date.now());
  },

  isActive: function (id) {
    return this.getRemainingMs(id) > 0;
  },

  /* Coût réel d'une potion : fixe pour les potions à durée, mais
     CROISSANT pour l'Élixir d'Aether (potion.costMult) — chaque achat
     depuis la dernière ascension augmente le prix du suivant, ce qui
     empêche d'en empiler dix d'un coup pour un bonus disproportionné.
     Le compteur (game.aetherElixirStackCount) repart à 0 à chaque
     ascension (voir progression-system.js, ascendNow()). Note
     v2.83.45 : le coût croissant se déclenche maintenant à l'ACHAT
     (mise en stock), pas à l'activation — cohérent avec le fait que
     c'est l'achat qui est limité, pas l'usage.

     v3.18 : un second multiplicateur s'ajoute, cette fois basé sur
     game.cycleCount (nombre de boucles complètes à travers tous les
     mondes, PAS remis à zéro par l'ascension — seulement par un reset
     complet) — TOUTES les potions (soin comprises) coûtent
     progressivement plus cher au fil des cycles. Objectif : préparer
     un futur système de craft (rations/ressources) qui devrait
     progressivement devenir plus intéressant que l'achat pur en or à
     mesure que les cycles avancent. Taux choisi par défaut (+15%
     composé par cycle, POTION_CYCLE_PRICE_GROWTH) — facile à ajuster
     si le rythme ne convient pas une fois testé en jeu. */
  getCost: function (potion) {
    this.ensure();
    var base = potion.cost;
    if (potion.costMult) {
      var stacks = Number(game.aetherElixirStackCount || 0);
      base = base * Math.pow(potion.costMult, stacks);
    }
    var cycleMult = Math.pow(1 + POTION_CYCLE_PRICE_GROWTH, Number(game.cycleCount || 0));
    return Math.floor(base * cycleMult);
  },

  /* Achète UNE potion (ajoutée au stock, pas activée immédiatement —
     voir usePotion pour l'activation). Même principe que
     buyHealingPotion. */
  buyPotion: function (id) {
    this.ensure();
    var potion = this.getPotion(id);
    if (!potion) return showToast("Potion introuvable", 1000);

    // v3.20 : Ascétisme (affliction) interdit l'achat ET l'usage de
    // potions — voir AfflictionManager.arePotionsForbidden().
    if (window.AfflictionManager && typeof AfflictionManager.arePotionsForbidden === "function" && AfflictionManager.arePotionsForbidden()) {
      return showToast("🚫 Potions interdites (Ascétisme actif)", 1600);
    }

    var cost = this.getCost(potion);
    if ((game.gold || 0) < cost) return showToast("Pas assez d'or", 1000);

    game.gold -= cost;
    game.potionsOwned[id] = this.getStock(id) + 1;
    if (!potion.durationMin) game.aetherElixirStackCount = Number(game.aetherElixirStackCount || 0) + 1;

    if (window.QuestManager && typeof QuestManager.track === "function") {
      QuestManager.track("goldSpent", cost);
    }

    addLog("🧪 " + potion.name + " achetée (stock : " + game.potionsOwned[id] + ")", "event");
    showToast(potion.name + " +1", 1300);
    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  /* Consomme UNE potion du stock et l'active réellement : redémarre
     son minuteur (potions à durée — boire une potion déjà active la
     RECHARGE, ne cumule pas son effet), ou ajoute son bonus à
     pendingPotionBonuses.aetherNext (Élixir d'Aether). */
  usePotion: function (id) {
    this.ensure();
    var potion = this.getPotion(id);
    if (!potion) return showToast("Potion introuvable", 1000);

    // v3.20 : Ascétisme (affliction) — même blocage qu'à l'achat, au
    // cas où une potion serait déjà en stock avant d'activer
    // l'affliction (achetée avant, utilisable seulement après
    // désactivation).
    if (window.AfflictionManager && typeof AfflictionManager.arePotionsForbidden === "function" && AfflictionManager.arePotionsForbidden()) {
      return showToast("🚫 Potions interdites (Ascétisme actif)", 1600);
    }

    var stock = this.getStock(id);
    if (stock <= 0) return showToast("Aucune potion en stock", 1000);

    game.potionsOwned[id] = stock - 1;

    if (potion.durationMin) {
      game.activePotions[id] = Date.now() + potion.durationMin * 60000;
      addLog("🧪 " + potion.name + " bue (" + potion.durationMin + " min)", "event");
    } else {
      game.pendingPotionBonuses.aetherNext = Number(game.pendingPotionBonuses.aetherNext || 0) + potion.bonus;
      addLog("🌀 " + potion.name + " bu — bonus prêt pour la prochaine ascension", "event");
    }

    if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") {
      StatsSystem.recalcStats();
    }

    showToast(potion.name + " utilisée", 1500);
    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  /* Revend UNE potion du stock (effet ou soin) contre de l'or — la
     moitié du prix d'achat ACTUEL (v3.18 : this.getCost(), qui
     inclut désormais la hausse par cycle — avant, potion.cost brut,
     ce qui aurait rendu le ratio de revente de moins en moins
     avantageux à mesure que les cycles avancent), arrondi à
     l'inférieur. Fonctionne pour les 2 catalogues (POTIONS_DB et
     HEALING_POTIONS_DB). */
  sellPotion: function (id) {
    this.ensure();
    this.ensureHealing();
    var potion = this.getPotion(id) || this.getHealingPotion(id);
    if (!potion) return showToast("Potion introuvable", 1000);

    var isHealing = !this.getPotion(id);
    var stock = isHealing ? this.getHealingStock(id) : this.getStock(id);
    if (stock <= 0) return showToast("Aucune potion à vendre", 1000);

    var value = Math.floor(this.getCost(potion) / 2);
    if (isHealing) game.healingPotionsOwned[id] = stock - 1;
    else game.potionsOwned[id] = stock - 1;
    game.gold += value;

    addLog("💰 " + potion.name + " vendue (+" + formatNumber(value) + " or)", "event");
    showToast("+" + formatNumber(value) + " or", 1300);
    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  /* Purge les potions à durée expirées. Renvoie true si au moins une
     a expiré (pour savoir s'il faut recalculer les stats/redessiner).
     Appelée à chaque frame de la boucle de jeu (voir main/game-loop.js) —
     le coût est négligeable (juste un parcours de quelques clés). */
  tick: function () {
    this.ensure();
    var now = Date.now();
    var changed = false;

    Object.keys(game.activePotions).forEach(function (id) {
      if (game.activePotions[id] <= now) {
        delete game.activePotions[id];
        changed = true;
      }
    });

    if (changed && window.StatsSystem && typeof StatsSystem.recalcStats === "function") {
      StatsSystem.recalcStats();
    }

    return changed;
  },

  // ============================================================
  // Potions de soin (v2.16) — achat en stock, usage instantané
  // depuis le bouton dédié de l'écran Combat (voir ui/combat-view.js)
  // ET depuis le sous-onglet "🧪 Potions" de l'écran Équipement
  // (v2.83.45, voir ui/equipment-view.js) — même stock partagé entre
  // les deux points d'accès.
  // ============================================================

  ensureHealing: function () {
    if (!game.healingPotionsOwned || typeof game.healingPotionsOwned !== "object") {
      game.healingPotionsOwned = {};
    }
    if (typeof game.lastHealUse !== "number") game.lastHealUse = 0;
  },

  getHealingPotion: function (id) {
    return (HEALING_POTIONS_DB || []).find(function (p) { return p.id === id; }) || null;
  },

  getHealingStock: function (id) {
    this.ensureHealing();
    return Number(game.healingPotionsOwned[id] || 0);
  },

  /* Achète UNE potion de soin (ajoutée au stock, pas consommée
     immédiatement — voir useHealingPotion pour l'usage). */
  buyHealingPotion: function (id) {
    this.ensureHealing();
    var potion = this.getHealingPotion(id);
    if (!potion) return;

    // v3.20 : Ascétisme (affliction) — même blocage que les potions à
    // effet, voir AfflictionManager.arePotionsForbidden().
    if (window.AfflictionManager && typeof AfflictionManager.arePotionsForbidden === "function" && AfflictionManager.arePotionsForbidden()) {
      return showToast("🚫 Potions interdites (Ascétisme actif)", 1600);
    }

    // v3.20 : bug trouvé au passage — cette fonction utilisait encore
    // potion.cost BRUT au lieu de this.getCost(potion), donc la hausse
    // de prix par cycle (v3.18) ne s'appliquait en réalité JAMAIS aux
    // potions de soin à l'achat (seule sellPotion() avait été corrigée
    // à l'époque). Corrigé — cohérent avec buyPotion() ci-dessus.
    var cost = this.getCost(potion);
    if ((game.gold || 0) < cost) return showToast("Pas assez d'or", 1000);

    game.gold -= cost;
    game.healingPotionsOwned[id] = this.getHealingStock(id) + 1;

    addLog("🩹 " + potion.name + " achetée (stock : " + game.healingPotionsOwned[id] + ")", "event");
    showToast(potion.name + " +1", 1300);
    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  /* Millisecondes restantes avant de pouvoir réutiliser une potion de
     soin (cooldown commun à toutes, pour éviter le spam). */
  getHealCooldownRemainingMs: function () {
    this.ensureHealing();
    var elapsed = Date.now() - (game.lastHealUse || 0);
    return Math.max(0, HEALING_POTION_COOLDOWN_MS - elapsed);
  },

  /* Consomme une potion de soin du stock et restaure des PV
     immédiatement (plafonnés aux PV max). Respecte le cooldown
     commun. Utilisable à tout moment, y compris en plein donjon. */
  useHealingPotion: function (id) {
    this.ensureHealing();
    var potion = this.getHealingPotion(id);
    if (!potion) return;

    // v3.20 : Ascétisme (affliction) — bloque aussi l'usage réel
    // (pas seulement l'achat), voir AfflictionManager.arePotionsForbidden().
    if (window.AfflictionManager && typeof AfflictionManager.arePotionsForbidden === "function" && AfflictionManager.arePotionsForbidden()) {
      return showToast("🚫 Potions interdites (Ascétisme actif)", 1600);
    }

    if (this.getHealCooldownRemainingMs() > 0) {
      return showToast("⏳ Encore un instant...", 900);
    }

    var stock = this.getHealingStock(id);
    if (stock <= 0) return showToast("Aucune potion en stock", 1000);

    var maxHp = Number(game.heroMaxHp || 1);
    var currentHp = Number(game.heroHp != null ? game.heroHp : maxHp);
    if (currentHp >= maxHp) return showToast("PV déjà au maximum", 1000);

    game.healingPotionsOwned[id] = stock - 1;
    var healed = Math.floor(maxHp * potion.healPercent);
    game.heroHp = Math.min(maxHp, currentHp + healed);
    game.lastHealUse = Date.now();

    addLog("🩹 " + potion.name + " utilisée (+" + formatNumber(healed) + " PV)", "event");
    showToast("+" + formatNumber(healed) + " PV", 1200);
    if (typeof renderHeroHp === "function") renderHeroHp();
    if (typeof renderHud === "function") renderHud();
    if (typeof renderHealButtons === "function") renderHealButtons();
    if (typeof renderPanel === "function") renderPanel();
    saveGame();
  },

  /* Agrège les bonus de TOUTES les potions à durée actuellement
     actives, par clé de stat (voir StatsSystem.recalcStats). Les
     potions n'ayant pas de durée (Élixir d'Aether) n'apparaissent
     jamais ici — elles passent par pendingPotionBonuses. */
  getActiveEffects: function () {
    this.ensure();
    var now = Date.now();
    var effects = {};

    (POTIONS_DB || []).forEach(function (potion) {
      if (!potion.durationMin) return;
      var expires = game.activePotions[potion.id];
      if (expires && expires > now) {
        effects[potion.stat] = (effects[potion.stat] || 0) + potion.bonus;
      }
    });

    return effects;
  }
};

window.PotionManager = PotionManager;
