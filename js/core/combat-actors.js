"use strict";
/* core/combat-actors.js — v3.266.0 (lot L-0) : SOCLE du combat de groupe.
   Voir Aethervale_Conception_Combat_Groupe_v1_0.docx §3 (modèle « acteur »).

   Ce que ce fichier pose, et rien de plus :
     - game.combat : deux tableaux d'ACTEURS de même forme (alliés / ennemis), la cible
       collante et la file des actions Manuel. À un ennemi et un héros, le combat se
       déroule EXACTEMENT comme avant — aucun comportement n'est modifié par ce lot.
     - game.enemy devient une PROPRIÉTÉ CALCULÉE sur l'objet game (installCombatAlias) :
       lire renvoie l'ennemi cible, écrire un objet pose un groupe d'un seul membre,
       écrire null vide le groupe. Les ~300 lectures/écritures existantes (moteur, vues,
       harnais, bancs) continuent de fonctionner sans une ligne de changement.
     - le héros-acteur : une VUE sur game.heroHp / heroMaxHp / heroGauge (accesseurs,
       jamais une copie), pour que stats-system, camp-system, heros-view, potion-system
       et la sauvegarde ne voient aucune différence. Même principe que la propriété
       calculée `image` de data/heroes.js (v3.151.0).

   IMPORTANT (pose de l'alias) : plusieurs chemins vident l'objet game en entier
   (Object.keys(game).forEach(delete) dans save-system.js et modal-view.js) avant de
   le repeupler. L'accesseur y est donc détruit, puis reposé par ensureGameStateDefaults()
   → installCombatAlias(), qui récupère au passage la valeur écrite entre-temps. */

/* ---------- État de combat ---------- */

function createCombatState() {
  return {
    allies: [],       // 1 à 3 acteurs, le héros toujours en [0]
    enemies: [],      // 1 à 3 acteurs
    targetId: null,   // cible collante (actorId ennemi) ou null = choix automatique
    pending: {},      // rounds Manuel : { actorId: { slot, arg } } — actions préchargées
    selection: null,  // acteur dont les actions sont affichées en bas
    nextActorId: 1    // compteur d'identifiants, remis à 1 à chaque nouveau groupe
  };
}

var COMBAT_MAX_ALLIES = 3;   // plafond dur (décision Seb : 3 contre 3)
var COMBAT_MAX_ENEMIES = 3;

var CombatActors = {
  /* Garantit la forme de game.combat et la présence du héros en allies[0]. */
  ensure: function () {
    if (typeof game === "undefined" || !game) return null;
    var c = game.combat;
    if (!c || typeof c !== "object" || !Array.isArray(c.enemies) || !Array.isArray(c.allies)) {
      c = createCombatState();
      game.combat = c;
    }
    if (!c.pending || typeof c.pending !== "object" || Array.isArray(c.pending)) c.pending = {};
    if (typeof c.nextActorId !== "number" || !isFinite(c.nextActorId)) c.nextActorId = 1;
    if (!c.allies.length) c.allies.push(this.heroActor());
    return c;
  },

  /* Pose actorId/side/champs de round sur un objet qui entre dans le combat.
     N'écrase jamais un champ déjà présent : un ennemi conserve tout ce que
     WorldManager.generateEnemy() et CombatEngine.prepareEnemy() lui ont posé. */
  attach: function (actor, side) {
    if (!actor || typeof actor !== "object") return actor;
    var c = this.ensure();
    if (!actor.actorId) {
      actor.actorId = (side === "ally" ? "a" : "e") + (c ? c.nextActorId++ : 0);
    }
    if (!actor.side) actor.side = (side === "ally") ? "ally" : "enemy";
    if (typeof actor.threat !== "number") actor.threat = 0;
    if (typeof actor.ko !== "boolean") actor.ko = false;
    return actor;
  },

  /* ---------- Côté ennemi ---------- */

  enemies: function () {
    var c = this.ensure();
    return c ? c.enemies : [];
  },

  aliveEnemies: function () {
    return this.enemies().filter(function (e) { return e && Number(e.hp || 0) > 0; });
  },

  /* L'ennemi visé : la cible collante si elle est encore là, sinon le premier du groupe.
     C'est ce que renvoie game.enemy. */
  target: function () {
    var c = this.ensure();
    if (!c || !c.enemies.length) return null;
    if (c.targetId) {
      for (var i = 0; i < c.enemies.length; i++) {
        if (c.enemies[i] && c.enemies[i].actorId === c.targetId) return c.enemies[i];
      }
    }
    return c.enemies[0] || null;
  },

  /* Cible collante : posée par un tap sur un portrait ennemi (L-3), effacée à sa mort. */
  setTarget: function (actorIdOrActor) {
    var c = this.ensure();
    if (!c) return null;
    if (!actorIdOrActor) { c.targetId = null; return null; }
    var id = (typeof actorIdOrActor === "string") ? actorIdOrActor : actorIdOrActor.actorId;
    for (var i = 0; i < c.enemies.length; i++) {
      if (c.enemies[i] && c.enemies[i].actorId === id) { c.targetId = id; return c.enemies[i]; }
    }
    return null;
  },

  /* Remplace le groupe ennemi. Les objets sont pris tels quels (mêmes références). */
  setEnemies: function (list) {
    var c = this.ensure();
    if (!c) return [];
    var arr = [].concat(list || []).filter(Boolean).slice(0, COMBAT_MAX_ENEMIES);
    c.enemies.length = 0;
    c.targetId = null;
    c.nextActorId = 1;
    for (var i = 0; i < arr.length; i++) {
      // Nouveau groupe = nouveaux identifiants : un objet réutilisé (harnais, respawn de run)
      // ne doit pas garder l'actorId d'un combat précédent.
      arr[i].actorId = null;
      c.enemies.push(this.attach(arr[i], "enemy"));
    }
    if (c.enemies.length) c.targetId = c.enemies[0].actorId;
    return c.enemies;
  },

  clearEnemies: function () {
    var c = this.ensure();
    if (!c) return;
    c.enemies.length = 0;
    c.targetId = null;
    c.nextActorId = 1;
  },

  /* Retire un ennemi mort du groupe (utilisé à partir du lot L-3 : à un seul ennemi,
     killEnemy garde son enchaînement historique et n'appelle pas ceci). */
  removeEnemy: function (actor) {
    var c = this.ensure();
    if (!c || !actor) return false;
    var idx = c.enemies.indexOf(actor);
    if (idx === -1) return false;
    c.enemies.splice(idx, 1);
    if (c.targetId === actor.actorId) c.targetId = c.enemies.length ? c.enemies[0].actorId : null;
    return true;
  },

  /* ---------- Côté allié ---------- */

  allies: function () {
    var c = this.ensure();
    return c ? c.allies : [];
  },

  aliveAllies: function () {
    return this.allies().filter(function (a) { return a && !a.ko && Number(a.hp || 0) > 0; });
  },

  /* Le héros-acteur : une VUE sur les champs plats de game, jamais une copie.
     Singleton : l'objet survit aux resets, ses accesseurs lisent toujours game. */
  heroActor: function () {
    if (this._heroActor) return this._heroActor;
    var a = { actorId: "a0", side: "ally", control: "hero", threat: 0, ko: false, isBoss: false, isElite: false };

    Object.defineProperty(a, "hp", {
      get: function () { return Number(game.heroHp != null ? game.heroHp : (game.heroMaxHp || 0)); },
      set: function (v) { game.heroHp = Math.max(0, Number(v) || 0); },
      enumerable: true
    });
    Object.defineProperty(a, "maxHp", {
      get: function () { return Number(game.heroMaxHp || 0); },
      set: function (v) { game.heroMaxHp = Math.max(1, Number(v) || 1); },
      enumerable: true
    });
    Object.defineProperty(a, "gauge", {
      get: function () { return Number(game.heroGauge || 0); },
      set: function (v) { game.heroGauge = Math.max(0, Number(v) || 0); },
      enumerable: true
    });
    Object.defineProperty(a, "name", {
      get: function () {
        var hero = (typeof getHeroByGameId === "function") ? getHeroByGameId(game.heroId) : null;
        return (hero && hero.name) || game.playerName || "Héros";
      },
      enumerable: true
    });
    Object.defineProperty(a, "stats", {
      get: function () {
        var hero = (typeof getHeroByGameId === "function") ? getHeroByGameId(game.heroId) : null;
        return (hero && hero.stats) || null;
      },
      enumerable: true
    });

    this._heroActor = a;
    return a;
  },

  isHero: function (actor) {
    return !!actor && actor === this._heroActor;
  },

  /* Voir assignCurrentEnemy : ferme la porte au spawn enchaîné d'un run pendant qu'on
     lui fait compter la mort d'un membre de groupe. */
  holdSpawn: function (on) { this._holdSpawn = !!on; },
  _holdSpawn: false,

  _heroActor: null
};

/* ---------- Alias game.enemy ---------- */

function currentTargetEnemy() {
  return CombatActors.target();
}

/* v3.269.0 (L-3) : écrire un TABLEAU dans game.enemy pose un groupe. C'est la couture
   qui évite de modifier les systèmes de quête (adventure/hunt/scene, protégés) : ils font
   tous `game.enemy = QuestEnemyManager.spawnFor(...)`, qui renvoie désormais un tableau
   quand la quête déclare un groupe. Un seul objet : comportement inchangé. */
function assignCurrentEnemy(value) {
  /* v3.269.0 (L-3) : quand un MEMBRE d'un groupe tombe, on laisse quand même le système
     de quête compter son kill — sinon une meute de trois n'avancerait que d'un cran. Ces
     systèmes enchaînent aussitôt sur `game.enemy = <nouvel ennemi>` : cette écriture-là
     est ignorée tant qu'il reste des survivants, sans quoi le spawn du run remplacerait
     le groupe en cours de combat. C'est ce drapeau qui tient la porte fermée. */
  if (CombatActors._holdSpawn && CombatActors.aliveEnemies().length > 0) return;
  if (!value) { CombatActors.clearEnemies(); return; }
  if (Array.isArray(value)) {
    var list = value.filter(Boolean);
    if (!list.length) { CombatActors.clearEnemies(); return; }
    if (window.CombatEngine && typeof CombatEngine.spawnGroup === "function") { CombatEngine.spawnGroup(list); return; }
    CombatActors.setEnemies(list);
    return;
  }
  CombatActors.setEnemies([value]);
}

/* Pose (ou repose) l'accesseur game.enemy. Idempotent : marqué par _aethervaleAlias.
   Récupère la valeur d'une propriété simple écrite avant la pose — cas du wipe complet
   de `game` suivi d'un loadGame() (save-system.js), qui écrit game.enemy = null. */
function installCombatAlias() {
  if (typeof game === "undefined" || !game) return false;

  var desc = Object.getOwnPropertyDescriptor(game, "enemy");
  if (desc && desc.get && desc.get._aethervaleAlias) { CombatActors.ensure(); return true; }

  var pending = desc ? game.enemy : null;
  if (desc) delete game.enemy;

  var getter = function () { return currentTargetEnemy(); };
  getter._aethervaleAlias = true;

  Object.defineProperty(game, "enemy", {
    get: getter,
    set: assignCurrentEnemy,
    enumerable: true,
    configurable: true
  });

  CombatActors.ensure();
  if (pending) assignCurrentEnemy(pending);
  return true;
}

/* Pose immédiate : ce fichier est chargé juste après core/state.js, donc avant tout
   script susceptible d'écrire game.enemy. ensureGameStateDefaults() la repose ensuite
   après chaque wipe complet de l'objet game. */
installCombatAlias();

window.CombatActors = CombatActors;
window.createCombatState = createCombatState;
window.installCombatAlias = installCombatAlias;
window.COMBAT_MAX_ALLIES = COMBAT_MAX_ALLIES;
window.COMBAT_MAX_ENEMIES = COMBAT_MAX_ENEMIES;
