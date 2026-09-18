"use strict";
/* systems/village-building-system.js — v3.213.0 (lot V-1) : VillageBuildingManager,
   socle unique des bâtiments du Village (data/village-buildings.js).

   ÉTAT EN SAUVEGARDE :
     game.village.buildings[id] = { level }
     game.village.site          = { id, targetLevel, endsAt } | null

   RÈGLES (rapport de conception du 11/09/2026) :
   - UN SEUL chantier actif pour tout le village, pas de file d'attente.
   - Les matériaux sont débités AU LANCEMENT ; un chantier lancé ne s'annule pas.
   - `endsAt` est un horodatage absolu : la reprise compare à Date.now(), il n'y
     a AUCUNE boucle hors ligne (pas de production qui s'accumule toute seule).
     Le chantier avance donc pendant une sortie et app fermée, sans rattrapage.
   - Toute écriture de ressource passe par WarehouseManager ; l'or est débité en
     dur (pattern du projet, cf. construction-system.js v3.37).

   ConstructionManager (systems/construction-system.js) est devenu un alias mince
   vers ce manager : le bâtiment « Atelier de Construction » est le premier cas
   du socle, pas un système à part. */

var VillageBuildingManager = {

  /* ---------- état ---------- */

  ensure: function () {
    if (!game.village || typeof game.village !== "object") game.village = {};
    if (!game.village.buildings || typeof game.village.buildings !== "object") {
      game.village.buildings = {};
    }
    Object.keys(VILLAGE_BUILDINGS).forEach(function (id) {
      var b = game.village.buildings[id];
      if (!b || typeof b !== "object") game.village.buildings[id] = { level: 0 };
      if (typeof game.village.buildings[id].level !== "number" || game.village.buildings[id].level < 0) {
        game.village.buildings[id].level = 0;
      }
    });

    var site = game.village.site;
    if (site && (typeof site !== "object" || !VILLAGE_BUILDINGS[site.id] ||
                 typeof site.endsAt !== "number" || typeof site.targetLevel !== "number")) {
      /* Chantier corrompu ou visant un bâtiment disparu : on l'oublie
         plutôt que de bloquer le village pour toujours. */
      game.village.site = null;
    }
  },

  /* Migration v3.213.0 : game.construction.workshop.level (v3.37) →
     game.village.buildings.workshop.level. L'ancien objet est CONSERVÉ en
     sauvegarde (jamais supprimé) : si le joueur revient à une version
     antérieure, il retrouve son Atelier. La migration ne s'applique que si
     le nouveau socle est encore à zéro — elle ne peut donc pas écraser une
     progression plus récente. */
  migrateFromConstruction: function () {
    this.ensure();
    if (!game.construction || typeof game.construction !== "object") return;

    var legacy = game.construction.workshop;
    if (!legacy || typeof legacy.level !== "number" || legacy.level <= 0) return;
    if (this.getLevel("workshop") > 0) return;

    game.village.buildings.workshop.level = Math.min(
      VILLAGE_BUILDINGS.workshop.maxLevel,
      Math.floor(legacy.level)
    );
    addLog("Atelier de Construction repris dans le Village (niveau " +
      game.village.buildings.workshop.level + ").", "event");
  },

  /* Migration v3.213.1 — « déjà en jeu = acquis ». Une partie qui a déjà payé
     des niveaux d'entraînement ne doit rien perdre : le Terrain démarre au
     niveau qui couvre la caractéristique la plus haute. 47 en Force →
     plafond 50 → Terrain niveau 4. Le joueur ne redescend jamais, et
     getUpgradeCap() le protège de toute façon en gardant le niveau acquis
     comme plancher. Ne s'applique qu'une fois, tant que le Terrain est à 0. */
  migrateTraining: function () {
    this.ensure();
    if (this.getLevel("training") > 0) return;

    var ids = window.HEROS_TRAINING_UPGRADE_IDS
      || ["utrain_power", "utrain_endurance", "utrain_celerity", "utrain_precision", "utrain_will"];
    var highest = 0;
    ids.forEach(function (id) {
      highest = Math.max(highest, Number((game.upgrades && game.upgrades[id]) || 0));
    });
    if (highest <= 10) return; // rien d'acquis au-delà de l'entraînement de fortune

    var level = Math.min(VILLAGE_BUILDINGS.training.maxLevel, Math.ceil(highest / 10) - 1);
    if (level <= 0) return;

    game.village.buildings.training.level = level;
    addLog("Terrain d'entraînement repris au niveau " + level + " (entraînement déjà acquis).", "event");
  },

  getLevel: function (id) {
    this.ensure();
    return Number((game.village.buildings[id] || {}).level || 0);
  },

  /* v3.289.0 : plafond EFFECTIF = min(max propre, plafond du plus haut monde atteint)
     (data/world-caps.js). Jamais sous le niveau déjà construit : rien n'est repris. */
  getMaxLevel: function (id) {
    var def = VILLAGE_BUILDINGS[id];
    if (!def) return 0;
    var cap = (window.WorldCaps) ? WorldCaps.getVillageCap(id) : Infinity;
    return Math.max(this.getLevel(id), Math.min(def.maxLevel, cap));
  },

  /* Vrai quand le plafond vient du monde et non du bâtiment : la suite existe ailleurs. */
  isWorldCapped: function (id) {
    var def = VILLAGE_BUILDINGS[id];
    return !!def && this.getMaxLevel(id) < def.maxLevel;
  },

  /* « S'ouvre au Désert oublié » / « Suite au Désert oublié » pour le prochain niveau
     bloqué par le monde. */
  getWorldCapLabel: function (id) {
    var next = this.getLevel(id) + 1;
    var where = window.WorldCaps ? WorldCaps.getWorldOpening(id, next) : "dans un prochain monde";
    return (this.getLevel(id) === 0 ? "S'ouvre " : "Suite ") + where;
  },

  isMaxLevel: function (id) {
    var def = VILLAGE_BUILDINGS[id];
    if (!def) return true;
    return this.getLevel(id) >= this.getMaxLevel(id);
  },

  /* ---------- rangs ---------- */

  /* Rang courant du village = rang atteint par l'Atelier de Construction. */
  getRank: function () {
    var lvl = this.getLevel("workshop");
    var rank = 0;
    for (var i = 0; i < VILLAGE_RANK_THRESHOLDS.length; i++) {
      if (lvl >= VILLAGE_RANK_THRESHOLDS[i]) rank = i + 1;
    }
    return rank;
  },

  /* ---------- coûts ---------- */

  /* CONVENTION : le palier est choisi sur le niveau ACTUEL (héritée de
     construction.js — ne pas inverser, ça changerait tous les prix). */
  getCostTierForLevel: function (def, level) {
    if (!def.costTiers || !def.costTiers.length) return null;
    for (var i = 0; i < def.costTiers.length; i++) {
      var tier = def.costTiers[i];
      if (level >= tier.minLevel && level <= tier.maxLevel) return tier;
    }
    return def.costTiers[def.costTiers.length - 1];
  },

  getNextCost: function (id) {
    var def = VILLAGE_BUILDINGS[id];
    if (!def || this.isMaxLevel(id)) return null;

    var level = this.getLevel(id);
    // v3.264.0 : coût propre au niveau 1 (Atelier de Construction), les paliers reprennent ensuite
    if (level === 0 && def.firstLevelCost) return Object.assign({}, def.firstLevelCost);
    var tier = this.getCostTierForLevel(def, level);
    if (!tier) return null;

    var mult = Math.pow(tier.costMult, level - tier.minLevel);
    var out = {};
    tier.resources.forEach(function (key) {
      out[key] = Math.floor(tier.baseCost[key] * mult);
    });
    return out;
  },

  getNextBuildSeconds: function (id) {
    if (this.isMaxLevel(id)) return 0;
    return getVillageBuildSeconds(this.getLevel(id) + 1);
  },

  getAffordability: function (id) {
    var cost = this.getNextCost(id);
    if (!cost) return { all: false };

    var result = {};
    Object.keys(cost).forEach(function (key) {
      result[key] = (key === "gold")
        ? Number(game.gold || 0) >= cost[key]
        : WarehouseManager.getAmount(key) >= cost[key];
    });
    result.all = Object.keys(result).every(function (k) { return result[k]; });
    return result;
  },

  /* ---------- chantier ---------- */

  getSite: function () {
    this.ensure();
    return game.village.site || null;
  },

  isBuilding: function (id) {
    var site = this.getSite();
    return !!(site && (!id || site.id === id));
  },

  getSiteSecondsLeft: function () {
    var site = this.getSite();
    if (!site) return 0;
    return Math.max(0, (site.endsAt - Date.now()) / 1000);
  },

  getSiteProgressPct: function () {
    var site = this.getSite();
    if (!site) return 0;
    var total = getVillageBuildSeconds(site.targetLevel);
    if (total <= 0) return 100;
    var pct = (1 - this.getSiteSecondsLeft() / total) * 100;
    return Math.max(0, Math.min(100, pct));
  },

  /* Raison pour laquelle un chantier ne peut pas démarrer, ou null si tout
     va bien. Renvoyer la RAISON (et pas un simple false) permet à la fiche
     d'écrire ce qui manque au lieu d'un bouton mort. */
  getBlockReason: function (id) {
    var def = VILLAGE_BUILDINGS[id];
    if (!def) return "Bâtiment inconnu";
    if (!def.implemented) return "Bientôt disponible";
    /* L'Atelier a sa propre porte d'entrée : la chaîne de déblocage
       (data/workshop-unlock.js). Garde-fou ceinture-bretelles — la grille
       ne propose déjà pas le chantier avant. */
    if (id === "workshop" && window.WorkshopUnlockManager
        && typeof WorkshopUnlockManager.isWorkshopVisible === "function"
        && !WorkshopUnlockManager.isWorkshopVisible()) {
      return "Objectif en cours";
    }
    if (this.isMaxLevel(id)) return this.isWorldCapped(id) ? this.getWorldCapLabel(id) : "Niveau maximum";
    if (this.isBuilding()) return "Un chantier est déjà en cours";
    if (def.rank > 0 && this.getRank() < def.rank) {
      return "Atelier niveau " + VILLAGE_RANK_THRESHOLDS[def.rank - 1];
    }
    /* Condition propre au bâtiment, en plus du rang (v3.213.1 : le Terrain
       n'apparaît qu'une fois une caractéristique butée à 10). Elle ne
       s'applique qu'au premier chantier : une fois construit, le bâtiment
       s'améliore sans la revérifier. */
    if (this.getLevel(id) === 0 && typeof def.unlockCheck === "function" && !def.unlockCheck()) {
      return def.lockLabel || "Condition non remplie";
    }
    if (!this.getAffordability(id).all) return "Matériaux manquants";
    return null;
  },

  _starting: false,

  startBuild: function (id) {
    var def = VILLAGE_BUILDINGS[id];
    if (!def || this._starting) return false;

    this.ensure();

    var reason = this.getBlockReason(id);
    if (reason) {
      showToast(reason, 1200);
      return false;
    }

    /* v3.291.0 : l'état de l'Apothicaire est posé AVANT tout chantier, au niveau actuel —
       sa migration « déjà en jeu = acquis » ne doit jamais prendre un niveau construit
       après la v3.291.0 pour un niveau hérité. */
    if (id === "apothecary" && window.ApothecaryManager) ApothecaryManager.ensureState();

    var cost = this.getNextCost(id);
    this._starting = true;

    /* Débit au lancement. L'or en dur, le reste par WarehouseManager. */
    Object.keys(cost).forEach(function (key) {
      if (key === "gold") game.gold -= cost[key];
      else WarehouseManager.removeResource(key, cost[key]);
    });

    if (window.QuestManager && typeof QuestManager.track === "function" && cost.gold) {
      QuestManager.track("goldSpent", cost.gold);
    }

    var targetLevel = this.getLevel(id) + 1;
    var seconds = getVillageBuildSeconds(targetLevel);
    game.village.site = {
      id: id,
      targetLevel: targetLevel,
      endsAt: Date.now() + seconds * 1000
    };

    addLog("Chantier lancé : " + def.name + " (niveau " + targetLevel + ").", "event");
    showToast("🧱 Chantier lancé", 1200);

    if (typeof renderPanel === "function") renderPanel();
    if (typeof renderHud === "function") renderHud();
    saveGame();

    this._starting = false;
    return true;
  },

  /* Appelée par la boucle de jeu et une fois au boot (reprise hors ligne). */
  tick: function () {
    var site = this.getSite();
    if (!site) return false;
    if (Date.now() < site.endsAt) return false;
    return this._finishSite();
  },

  _finishSite: function () {
    var site = game.village.site;
    if (!site) return false;

    var def = VILLAGE_BUILDINGS[site.id];
    game.village.site = null;
    if (!def) return false;

    var level = Math.min(def.maxLevel, Math.max(this.getLevel(site.id), site.targetLevel));
    game.village.buildings[site.id].level = level;

    /* Compat v3.37 : le miroir game.construction.workshop est tenu à jour à
       CHAQUE chantier, y compris sur une save née en v3.213.0 où il n'existe
       pas encore. Sans ça, un joueur qui reviendrait à une version antérieure
       retrouverait son Atelier au niveau 0. Coût : deux lignes. */
    if (site.id === "workshop") {
      if (!game.construction || typeof game.construction !== "object") game.construction = {};
      if (!game.construction.workshop || typeof game.construction.workshop !== "object") {
        game.construction.workshop = { level: 0 };
      }
      game.construction.workshop.level = level;
    }

    addLog(def.name + " — chantier terminé (niveau " + level + ").", "event");
    showToast("✅ " + def.name + " niv. " + level, 1600);

    /* La chaîne de déblocage de l'Atelier valide son étape « construire »
       ici, pas au lancement : c'est la fin du chantier qui compte. */
    if (window.WorkshopUnlockManager && typeof WorkshopUnlockManager.checkCurrentStep === "function") {
      WorkshopUnlockManager.checkCurrentStep();
    }

    if (typeof renderPanel === "function") renderPanel();
    if (typeof renderHud === "function") renderHud();
    saveGame();
    return true;
  },

  /* ---------- effets ---------- */

  /* Bonus de vente de l'Entrepôt — lu par warehouse-system.js via
     ConstructionManager.getSellBonus(), conservé à l'identique. */
  getSellBonus: function () {
    var def = VILLAGE_BUILDINGS.workshop;
    if (!def || typeof def.sellBonusAtLevel !== "function") return 1;
    return def.sellBonusAtLevel(this.getLevel("workshop"));
  },

  getEffectLabel: function (id, level) {
    var def = VILLAGE_BUILDINGS[id];
    if (!def || typeof def.effectLabel !== "function") return "";
    return def.effectLabel(typeof level === "number" ? level : this.getLevel(id));
  },

  /* État d'affichage d'une carte de la grille.
     "site" | "maxed" | "built" | "ready" | "locked" */
  getCardState: function (id) {
    var def = VILLAGE_BUILDINGS[id];
    if (!def) return "locked";
    if (this.isBuilding(id)) return "site";

    var level = this.getLevel(id);
    // v3.289.0 : un bâtiment fermé dans ce monde (plafond 0) reste verrouillé, pas « maxed »
    if (level === 0 && this.getMaxLevel(id) === 0) return "locked";
    if (level >= this.getMaxLevel(id)) return "maxed";
    if (level > 0) return "built";
    if (!def.implemented) return "locked";
    if (def.rank > 0 && this.getRank() < def.rank) return "locked";
    if (typeof def.unlockCheck === "function" && !def.unlockCheck()) return "locked";
    return "ready";
  }
};

window.VillageBuildingManager = VillageBuildingManager;
