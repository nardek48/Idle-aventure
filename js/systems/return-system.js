"use strict";
/* systems/return-system.js — v3.332.0 (Évolutions, lot R-1) : l'écran de retour.
   Conception « Évolutions » v1.0 §2, décisions R1 à R5 (Seb, 24/09/2026).

   UN écran pour les deux chemins de retour (R1) :
     - chargement de la page : OfflineManager (seuil 5 min), appelé en fin de boot ;
     - reprise de la PWA     : ResumeManager (seuil 30 min, choix Seb).
   Les deux construisent un résumé et appellent ReturnManager.request(). Si le héros
   est engagé (combat, Petite Aventure), l'écran ATTEND : une pastille le signale, il
   s'ouvre dès que le héros est libre. Il ne coupe jamais une action.

   Ce fichier ne fait que LIRE et comparer. Les gestes de l'écran (récolter, livrer)
   délèguent à ProductionManager et TavernManager (voir ui/return-view.js). */

var ReturnManager = {
  _pending: null,

  /* ---------- Photographie AVANT le rattrapage ---------- */

  /* Ce que la production ne dit pas : chantier, Taverne, PV, patrouilles.
     Lu tel quel, sans appeler aucun ensure() qui créerait de l'état. */
  capture: function () {
    var site = (game.village && game.village.site && typeof game.village.site === "object") ? game.village.site : null;
    return {
      at: Date.now(),
      site: site ? { id: site.id, targetLevel: site.targetLevel, endsAt: Number(site.endsAt || 0) } : null,
      tavernReset: (game.tavern && typeof game.tavern.resetTime === "number") ? game.tavern.resetTime : 0,
      hp: Number(game.heroHp != null ? game.heroHp : 0)
    };
  },

  /* ---------- Comparaison APRÈS ---------- */

  /* Complète un résumé de production (OfflineManager / ResumeManager) avec le reste.
     `extras` = capture() prise avant le rattrapage. */
  complete: function (summary, extras) {
    var s = summary || { produced: {}, crafted: {}, fullPlots: 0, openPlots: 0 };
    var now = Date.now();
    var ex = extras || {};

    // Chantier : terminé si sa fin est passée (le tick l'a soldé ou va le faire)
    s.siteDone = null;
    if (ex.site && ex.site.endsAt && ex.site.endsAt <= now && window.VILLAGE_BUILDINGS && VILLAGE_BUILDINGS[ex.site.id]) {
      s.siteDone = { name: VILLAGE_BUILDINGS[ex.site.id].name, level: ex.site.targetLevel };
    }

    // Taverne : tableau renouvelé pendant l'absence, contrats livrables maintenant
    s.tavernNew = false;
    s.tavernReady = 0;
    if (window.TavernManager && TavernManager.getLevel() > 0) {
      s.tavernNew = !!(ex.tavernReset && ex.tavernReset <= now);
      s.tavernReady = TavernManager.getContracts().filter(function (c) { return !c.done && TavernManager.canDeliver(c.id); }).length;
    }

    // Héros : PV rendus par le feu (chargement seulement : c'est là que la régénération hors ligne s'applique)
    s.hpGain = Math.max(0, Math.floor(Number(game.heroHp || 0) - Number(ex.hp || 0)));

    // Patrouilles rentrées (lot P-1)
    s.patrolsBack = (window.PatrolManager && typeof PatrolManager.getReturned === "function") ? PatrolManager.getReturned().length : 0;

    return s;
  },

  /* Y a-t-il quelque chose à dire ? */
  hasContent: function (s) {
    if (!s) return false;
    return Object.keys(s.produced || {}).length > 0 || Object.keys(s.crafted || {}).length > 0
      || !!s.siteDone || !!s.tavernNew || s.tavernReady > 0 || s.hpGain > 0 || s.patrolsBack > 0;
  },

  /* ---------- Ouverture, ou attente si le héros est engagé (R1) ---------- */

  isHeroEngaged: function () {
    if (game.activeTab === "combat" || game.activeTab === "scene") return true;
    return !!(window.SceneRunManager && typeof SceneRunManager.isHeroEngaged === "function" && SceneRunManager.isHeroEngaged());
  },

  request: function (summary) {
    if (!this.hasContent(summary)) return false;
    if (this.isHeroEngaged()) {
      this._pending = summary;
      if (typeof renderReturnPending === "function") renderReturnPending(true);
      return true;
    }
    this._pending = null;
    if (typeof renderReturnPending === "function") renderReturnPending(false);
    if (typeof openReturnScreen === "function") openReturnScreen(summary);
    return true;
  },

  hasPending: function () { return !!this._pending; },

  /* Appelé une fois par seconde par la vue tant qu'un retour attend. */
  flushPending: function () {
    if (!this._pending || this.isHeroEngaged()) return false;
    var s = this._pending;
    this._pending = null;
    if (typeof renderReturnPending === "function") renderReturnPending(false);
    if (typeof openReturnScreen === "function") openReturnScreen(s);
    return true;
  },

  /* ---------- Phrase du monde (R5) ---------- */

  pickLine: function () {
    var w = (window.WORLDS && window.WorldManager) ? WORLDS[Number(WorldManager.worldIndex || 0)] : null;
    var pool = (window.RETURN_WORLD_LINES && w) ? (RETURN_WORLD_LINES[w.id] || []) : [];
    var ok = pool.filter(function (l) {
      return !l.needs || (window.CompanionManager && CompanionManager.isUnlocked(l.needs));
    });
    if (!ok.length) return "";
    return ok[Math.floor(Math.random() * ok.length)].text;
  }
};

/* R5 — une ligne d'accueil par retour, dans la voix du monde. `needs` : compagnon requis.
   Textes PROVISOIRES, à relire par Seb selon la bible. */
var RETURN_WORLD_LINES = {
  forest: [
    { text: "Le feu a tenu. Quelqu'un a remis une bûche sans te réveiller." },
    { text: "Aldric compte ses sacs devant la réserve. Il ne se plaint pas, ce qui chez lui est un compliment." },
    { text: "Le Veilleur n'a pas quitté son banc. Il dit que la forêt a été calme. Il ment un peu." },
    { text: "Une brume basse traîne encore sur les Champs. Le village a travaillé sans toi." },
    { text: "Wenna a laissé une trace de boue jusqu'à la porte. Elle, au moins, n'a pas dormi.", needs: "wenna" },
    { text: "Les cloches du village n'ont pas sonné. C'est une bonne nouvelle." }
  ],
  desert: [
    { text: "Le sable a recouvert le seuil. Ici, on le balaie à chaque retour." },
    { text: "La nuit a été froide. Les jarres ont gardé leur eau." },
    { text: "Le vent a tourné pendant ton absence. Les dunes ne sont plus tout à fait au même endroit." },
    { text: "Maddoc a fait deux fois le tour du camp. Il dit qu'il ne s'inquiétait pas.", needs: "maddoc" },
    { text: "Au marché de sel, on parle d'une lumière vue dans la Cité engloutie." },
    { text: "Rien n'a bougé à l'horizon. Ici, c'est plutôt rassurant." }
  ]
};

window.ReturnManager = ReturnManager;
window.RETURN_WORLD_LINES = RETURN_WORLD_LINES;
