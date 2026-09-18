"use strict";
/* ui/debug-touch-view.js — v3.295.0 : DIAGNOSTIC TACTILE, pour le bug « les boutons du combat ne
   répondent plus » remonté par Seb sur iPhone (18/09/2026), non reproductible en émulation
   Chromium. Outil de mesure, pas un correctif : il affiche en haut de l'écran, sans capter
   aucun toucher (pointer-events: none), ce que le téléphone reçoit réellement.

   Ce qu'il montre :
     - les 8 derniers événements (touchstart, touchend, pointerdown, pointerup, click) : la
       cible réelle et l'élément réellement au premier plan à cet endroit ;
     - l'état qui décide si un tour peut se jouer (CombatEngine.isHeroTurnAvailable) ;
     - chaque appel de CombatEngine.heroAction et son résultat ;
     - les 3 dernières erreurs JavaScript, avec fichier et ligne.

   Activation : Paramètres › Admin › « Diagnostic tactile », ou ?debug=touch dans l'adresse.
   Mémorisé dans localStorage (une seule clé), jamais dans la sauvegarde. */

var TOUCH_DEBUG_KEY = "aethervale_debug_touch";
var TouchDebug = {
  on: false,
  events: [],
  errors: [],
  actions: [],
  _timer: 0,
  _wrapped: false,

  isOn: function () {
    try { return localStorage.getItem(TOUCH_DEBUG_KEY) === "1"; } catch (e) { return false; }
  },

  setOn: function (value) {
    try { localStorage.setItem(TOUCH_DEBUG_KEY, value ? "1" : "0"); } catch (e) { /* stockage indisponible : réglage de session seulement */ }
    if (value) this.start(); else this.stop();
  },

  /* Description courte d'un nœud : balise#id.classes, et un bout de texte pour un bouton. */
  describe: function (el) {
    if (!el || !el.tagName) return "∅";
    var s = el.tagName.toLowerCase();
    if (el.id) s += "#" + el.id;
    var cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
    if (cls) s += "." + cls;
    var btn = el.closest ? el.closest("button") : null;
    if (btn) s += " «" + (btn.textContent || "").trim().replace(/\s+/g, " ").slice(0, 14) + "»" + (btn.disabled ? "[désactivé]" : "");
    return s;
  },

  /* Pourquoi un tour de combat serait refusé : même ordre que CombatEngine.isHeroTurnAvailable. */
  turnReason: function () {
    if (typeof game === "undefined" || !game) return "pas de partie";
    if (!game.enemy) return "aucun ennemi";
    if (game.activeTab !== "combat") return "onglet " + game.activeTab;
    var open = (window.BLOCKING_MODAL_IDS || []).filter(function (id) {
      var el = document.getElementById(id);
      return el && el.innerHTML && el.innerHTML.length > 0;
    });
    if (open.length) return "fenêtre ouverte : " + open.join(",");
    if ((game.heroHp || 0) <= 0) return "héros à terre";
    if (game.combatRound && game.combatRound.busy) return "round bloqué (busy)";
    if (game.combatMode === "grimoire") return "OK (mode Grimoire : attaque manuelle refusée)";
    return "OK";
  },

  contextLabel: function () {
    var parts = [];
    if (game.adventureQuestRun && game.adventureQuestRun.active) parts.push("aventure");
    if (game.huntRun && game.huntRun.active) parts.push("chasse");
    if (game.dungeonRun && game.dungeonRun.active) parts.push("donjon");
    if (game.livingMaps && game.livingMaps.fight) parts.push("élite carte");
    if (game.sceneRun && game.sceneRun.status === "combat") parts.push("scène");
    return parts.length ? parts.join("+") : "aucun run";
  },

  _ids: (typeof WeakMap === "function") ? new WeakMap() : null,
  _next: 1,

  /* v3.296.0 : numéro stable par nœud — deux événements sur « Fuir » avec deux numéros
     différents = le bouton a été remplacé entre le toucher et le relâcher. */
  nodeId: function (el) {
    if (!el || !this._ids) return "";
    var b = el.closest ? (el.closest("button") || el) : el;
    if (!this._ids.has(b)) this._ids.set(b, this._next++);
    return " n" + this._ids.get(b) + (b.isConnected === false ? "(détaché)" : "");
  },

  note: function (msg) {
    this.events.unshift("★ " + msg);
    if (this.events.length > 8) this.events.length = 8;
    this.render();
  },

  record: function (e) {
    var t = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : e;
    var x = Math.round(t.clientX || 0), y = Math.round(t.clientY || 0);
    var top = (typeof document.elementFromPoint === "function") ? document.elementFromPoint(x, y) : null;
    var same = top && e.target && (top === e.target || (e.target.contains && e.target.contains(top)));
    this.events.unshift(e.type.replace("pointer", "ptr").replace("touch", "tch") + " " + x + "," + y
      + " → " + this.describe(e.target) + this.nodeId(e.target) + (same ? "" : "  | dessus : " + this.describe(top))
      + (e.defaultPrevented ? " [bloqué]" : ""));
    if (this.events.length > 8) this.events.length = 8;
    this.render();
  },

  onError: function (msg, file, line) {
    var f = String(file || "").split("/").pop();
    this.errors.unshift(String(msg).slice(0, 90) + " @" + f + ":" + (line || "?"));
    if (this.errors.length > 3) this.errors.length = 3;
    this.render();
  },

  /* Enveloppe heroAction pour voir chaque demande et son résultat (session de diagnostic seulement). */
  wrapHeroAction: function () {
    if (this._wrapped || !window.CombatEngine || typeof CombatEngine.heroAction !== "function") return;
    var self = this, original = CombatEngine.heroAction;
    CombatEngine.heroAction = function (slot) {
      var reason = self.turnReason();
      var result;
      try { result = original.apply(CombatEngine, arguments); }
      catch (err) { self.onError(err && err.message, "heroAction(" + slot + ")", ""); throw err; }
      if (self.on) {
        self.actions.unshift("heroAction(" + slot + ") = " + result + (result ? "" : "  (" + reason + ")"));
        if (self.actions.length > 3) self.actions.length = 3;
        self.render();
      }
      return result;
    };
    this._wrapped = true;
  },

  render: function () {
    if (!this.on) return;
    var box = document.getElementById("touch-debug");
    if (!box) return;
    var r = game.combatRound || {};
    var c = (window.CombatActors && CombatActors.ensure) ? CombatActors.ensure() : null;
    var lines = [
      "v" + (window.GAME_VERSION || "?") + " · " + game.activeTab + " · " + this.contextLabel() + " · mode " + game.combatMode,
      "tour : " + this.turnReason() + " · round " + (r.number || 0) + (r.busy ? " BUSY" : "")
        + (window.CombatEngine && CombatEngine._manualRoundOpen ? " · round manuel ouvert, sélection " + ((c && c.selection) || "∅") : ""),
      "PV " + Math.round(game.heroHp || 0) + "/" + Math.round(game.heroMaxHp || 0)
    ];
    lines = lines.concat(this.actions, ["— événements —"], this.events);
    if (this.errors.length) lines = lines.concat(["— ERREURS —"], this.errors);
    box.textContent = lines.join("\n");
  },

  start: function () {
    if (this.on) return;
    this.on = true;
    var box = document.getElementById("touch-debug");
    if (!box && document.body) {
      box = document.createElement("div");
      box.id = "touch-debug";
      box.setAttribute("style", "position:fixed;left:4px;right:4px;top:calc(env(safe-area-inset-top,0px) + 4px);"
        + "z-index:2147483647;pointer-events:none;background:rgba(0,0,0,.82);color:#7CFC00;"
        + "font:10px/1.3 ui-monospace,Menlo,monospace;padding:4px 6px;border-radius:6px;"
        + "white-space:pre-wrap;word-break:break-all;max-height:46vh;overflow:hidden;");
      document.body.appendChild(box);
    }
    this.wrapHeroAction();
    var self = this;
    this._timer = setInterval(function () { self.render(); }, 500);
    this.render();
  },

  stop: function () {
    this.on = false;
    if (this._timer) clearInterval(this._timer);
    this._timer = 0;
    var box = document.getElementById("touch-debug");
    if (box && box.parentNode) box.parentNode.removeChild(box);
  },

  /* Écouteurs posés une fois, en capture et passifs : ils observent, ils ne bloquent rien. */
  install: function () {
    if (typeof document === "undefined" || !document.addEventListener) return;
    var self = this;
    ["touchstart", "touchend", "pointerdown", "pointerup", "click"].forEach(function (type) {
      document.addEventListener(type, function (e) { if (self.on) self.record(e); }, { capture: true, passive: true });
    });
    if (window.addEventListener) {
      window.addEventListener("error", function (e) { if (self.on) self.onError(e.message, e.filename, e.lineno); });
      window.addEventListener("unhandledrejection", function (e) { if (self.on) self.onError("promesse : " + (e.reason && e.reason.message || e.reason), "", ""); });
    }
    var fromUrl = false;
    try { fromUrl = /[?&]debug=touch\b/.test(String(location.search || "")); } catch (e) { /* location absente (harnais) */ }
    if (fromUrl) { try { localStorage.setItem(TOUCH_DEBUG_KEY, "1"); } catch (e) { /* ignoré */ } }
    if (this.isOn()) {
      if (document.body) this.start();
      else document.addEventListener("DOMContentLoaded", function () { self.start(); });
    }
  }
};

/* Sortie de secours (Admin) : quitte le combat en cours quel qu'il soit, sans passer par
   confirm(), et libère l'état de round. Utilise uniquement les sorties déjà existantes. */
function forceLeaveCombat() {
  if (window.SortieManager && typeof SortieManager.isActive === "function" && SortieManager.isActive()
    && typeof SortieManager.flee === "function") {
    SortieManager.flee();
  }
  if (game.adventureQuestRun && game.adventureQuestRun.active && window.AdventureQuestManager) AdventureQuestManager.forfeit();
  if (game.huntRun && game.huntRun.active && window.HuntQuestManager) HuntQuestManager.stop();
  if (game.dungeonRun && game.dungeonRun.active && window.DungeonManager) DungeonManager.forfeit();
  if (game.livingMaps && game.livingMaps.fight && window.LivingMapManager && typeof LivingMapManager.abandonFight === "function") LivingMapManager.abandonFight();
  if (game.sceneRun && game.sceneRun.status && game.sceneRun.status !== "completed" && window.SceneRunManager) SceneRunManager.abandon();
  if (window.CombatEngine && typeof CombatEngine.cancelManualRound === "function") CombatEngine.cancelManualRound();
  if (game.combatRound) { game.combatRound.busy = false; game.combatRound.continueAttack = false; }
  if (typeof switchTab === "function") switchTab("campement");
  if (typeof showToast === "function") showToast("Combat quitté", 1400);
  if (typeof saveGame === "function") saveGame();
}

TouchDebug.install();
window.TouchDebug = TouchDebug;
window.forceLeaveCombat = forceLeaveCombat;
