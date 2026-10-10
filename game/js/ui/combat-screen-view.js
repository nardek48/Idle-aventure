"use strict";
/* ui/combat-screen-view.js — v3.427.0 : NOUVEL ÉCRAN DE COMBAT (atelier CB-0 à CB-8, validé par Seb le 02/10/2026).

   Ce fichier REMPLACE le rendu de l'écran de combat sans toucher au moteur (combat-engine.js,
   protégé) : il redéfinit les points d'entrée de rendu que le moteur, la boucle et ui-root
   appellent déjà (buildCombatHTML, renderEnemy, renderEnemyHp, renderClassSkillButtons…).
   Les anciens constructeurs (combat-view.js, combat-group-view.js) restent chargés : le
   harnais les teste encore, ils seront retirés au prochain nettoyage.

   Décisions de l'atelier :
     - barre du haut : lieu, progression, butin, Fuir/Rentrer ;
     - bandeau de la cible (une seule fois) : nom, pastilles d'état, jauge, télégraphes du groupe ;
     - arène « Scène » : chaque ennemi a son COULOIR (G, C, D) et avance dedans selon sa distance
       (engageIn : 2 loin · 1 approche · 0 contact) ; formation en V à trois ; un tireur se poste
       au rang « approche » ; un boss reste grand au fond, ses sbires devant lui ; la cible passe devant ;
     - effets : télégraphes sur le monstre (charge rouge, soin BLEU, silence violet), brûlure,
       bouclier, vulnérable ; coups spéciaux sur les cartes d'Équipe (charge, silence, corruption) ;
     - cartes d'Équipe (héros + compagnons) : à qui le tour en Tactique, vraie barre de PV du héros ;
     - commandes en bas : Tactique (conseil du Grimoire avec sa raison, 4 techniques, potions,
       ATTAQUER) ou bande fine en Grimoire, avec la règle jouée affichée dans l'arène ;
     - feuille « États du combat » : tout ce qui est en cours, ennemi par ennemi, et l'équipe. */

(function () {
  /* ---------- Outils ---------- */
  var IC = {
    gold: "images/Icons/gold_icon.png",
    flee: "images/Icons/quests/flee.png",
    back: "images/Icons/plots/hunting_blind.png",
    grim: "images/Icons/codex/codex_lore.png",
    tact: "images/Icons/combat_stats/stat_critical.png",
    cont: "images/Icons/quests/continue.png",
    stop: "images/Icons/system/pause_stop.png",
    attack: "images/Icons/special_attacks/attack3.png",
    ctxDungeon: "images/Icons/quests/mission_dungeon.png",
    ctxMission: "images/Icons/quests/mission_combat.png",
    ctxHunt: "images/Icons/quests/mission_hunt.png",
    st: "images/Icons/combat_status/"
  };
  /* Règle de Seb (18/09/2026) : une icône qui n'existe pas encore garde son vrai chemin et
     s'affiche en générique (ici : un « ? » doré), pour qu'il repère les manquantes. */
  var GENERIC = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#3b2a12" stroke="#e8bf5a" stroke-width="2"/><text x="16" y="22" font-size="17" font-weight="900" text-anchor="middle" fill="#e8bf5a" font-family="sans-serif">?</text></svg>');
  function ico(src, cls) {
    return '<img' + (cls ? ' class="' + cls + '"' : '') + ' src="' + esc(src || "") + '" alt="" onerror="this.onerror=null;this.dataset.missing=this.src;this.src=\'' + GENERIC + '\'">';
  }
  function byId(id) { return (typeof document !== "undefined" && document.getElementById) ? document.getElementById(id) : null; }
  function num(v) { return Number(v || 0); }
  function fmt(n) { return (typeof formatNumber === "function") ? formatNumber(Math.max(0, Math.ceil(num(n)))) : String(Math.max(0, Math.ceil(num(n)))); }
  function setHtml(host, html) {
    if (!host) return false;
    if (typeof setHtmlIfChanged === "function") return setHtmlIfChanged(host, html);
    if (host.innerHTML !== html) host.innerHTML = html;
    return true;
  }
  function inCombatScreen() { return !!byId("cbx"); }
  function actorsApi() { return window.CombatActors || null; }
  function engine() { return window.CombatEngine || null; }
  function isManual() {
    var E = engine();
    return !!(E && typeof E.hasManualAllies === "function" && E.hasManualAllies() && !(game.combatRound && game.combatRound.continueAttack));
  }

  /* ---------- Squelette ---------- */
  function cbxBuildHTML() {
    return ''
      + '<div id="cbx" class="cbx">'
      +   '<header id="cbx-top" class="cbx-top"></header>'
      +   '<section id="cbx-arena" class="cbx-arena">'
      +     '<div id="active-potions-bar" class="cbx-buffs"></div>'
      +     '<div id="cbx-target" class="cbx-target"></div>'
      +     '<div id="cbx-stage" class="cbx-stage"></div>'
      +     '<div id="cbx-rule" class="cbx-rule" aria-live="polite"></div>'
      +   '</section>'
      +   '<section id="cbx-team" class="cbx-team"></section>'
      +   '<section id="cbx-cmd" class="cbx-cmd"></section>'
      +   '<div id="combat-speed-inline" class="cbx-hidden" hidden></div>'   // renderCombatSpeedBar y écrit : on garde l'hôte, masqué
      +   '<div id="cbx-fx" class="cbx-fx" aria-hidden="true"></div>'
      +   '<div id="combat-sortie-sheet-root"></div>'
      + '</div>';
  }

  /* ---------- Contexte (barre du haut) ---------- */
  function contextInfo() {
    var label = (typeof getCombatMissionProgressLabel === "function") ? getCombatMissionProgressLabel() : "";
    if (window.DungeonManager && game.dungeonRun && game.dungeonRun.active) {
      var d = (typeof DungeonManager.getById === "function") ? DungeonManager.getById(game.dungeonRun.dungeonId) : null;
      return { icon: (d && d.icon) || IC.ctxDungeon, title: d ? _td(d.name) : _t("Donjon"), sub: label };
    }
    var world = (window.WorldManager && typeof WORLDS !== "undefined") ? WORLDS[WorldManager.worldIndex] : null;
    var worldName = world ? _td(world.name) : "";
    if (label) {
      var cut = label.indexOf(" · ");
      if (cut > 0) return { icon: IC.ctxMission, title: label.slice(0, cut), sub: label.slice(cut + 3) };
      return { icon: IC.ctxMission, title: label, sub: worldName };
    }
    return { icon: IC.ctxHunt, title: worldName || _t("Combat"), sub: _t("Exploration") };
  }

  function buildTopHTML() {
    var c = contextInfo();
    var h = '<div class="cbx-ctx">' + ico(c.icon) + '<div class="cbx-ctx-txt"><b>' + esc(c.title) + '</b>' + (c.sub ? '<small>' + esc(c.sub) + '</small>' : '') + '</div></div>';
    var S = window.SortieManager ? SortieManager.ensure() : null;
    var downed = num(game.heroHp) <= 0;
    if (S && S.active) {
      var loot = S.loot || {}, objets = (loot.items && loot.items.length) || 0;
      h += '<button type="button" class="cbx-pill" onclick="openSortieSheet()" aria-label="' + esc(_t("Butin de la sortie")) + '">' + ico(IC.gold)
        + fmt(Math.floor(num(loot.gold))) + (objets ? ' · ' + _tn(objets, "{n} obj.", "{n} obj.") : '') + '</button>';
    }
    // v3.440.0 : « Continuer » (Tactique) ou la vitesse (Grimoire), sortis de la rangée du mode
    if (game.combatMode === "grimoire") {
      h += '<button type="button" id="cbx-grim-btn" class="cbx-pill is-tempo" onclick="cbxCycleSpeed()" aria-label="' + esc(_t("Vitesse")) + '">▶ x' + num(game.combatSpeed || 1) + '</button>';
    } else {
      var cont = !!(game.combatRound && game.combatRound.continueAttack);
      h += '<button type="button" class="cbx-pill is-tempo' + (cont ? ' is-on' : '') + '"' + (downed ? ' disabled' : '') + ' onclick="CombatEngine.toggleContinueAttack()" aria-label="'
        + esc(cont ? _t("Stop") : _t("Continuer")) + '">' + ico(cont ? IC.stop : IC.cont) + '</button>';
    }
    if (S && S.active && SortieManager.isMission()) {
      h += '<button type="button" class="cbx-pill is-flee"' + (downed ? ' disabled' : '') + ' onclick="confirmFlee()">' + ico(IC.flee) + _t("Fuir") + '</button>';
    } else {
      h += '<button type="button" class="cbx-pill"' + (downed ? ' disabled' : '') + ' onclick="SortieManager.returnToCamp()">' + ico(IC.back) + _t("Rentrer") + '</button>';
    }
    return h;
  }

  /* ---------- États par ennemi (généralise getActiveCombatStates, qui ne lit que la cible) ---------- */
  function isRanged(e) {
    return !!e && !e.isBoss && typeof ENEMY_ENGAGE_ROUNDS !== "undefined" && ENEMY_ENGAGE_ROUNDS.hasOwnProperty(e.id) && ENEMY_ENGAGE_ROUNDS[e.id] === 0;
  }
  var CBX_STATES = window.COMBAT_STATES_SCREEN || {};   // Tireur, Exaltation (data/combat-states.js)
  function stateDef(id) { return (window.COMBAT_STATES && COMBAT_STATES[id]) || CBX_STATES[id] || null; }

  function statesOf(e, isTarget) {
    var out = [];
    if (!e || num(e.hp) <= 0) return out;
    function push(id, n, sup) { var d = stateDef(id); if (d) out.push({ id: id, def: d, n: (typeof n === "number" && n > 0) ? n : null, suppressed: !!sup }); }
    if (e.downed) push("rising");   // v3.428.2 : à terre, il se relèvera
    if (num(e.engageIn) > 0) push("approaching", num(e.engageIn));
    if (e.chargeTelegraphed) push("charge");
    if (e.silenceTelegraphed) push("silence");
    if (e.shieldTelegraphed) push("shieldIncoming");
    if (e.healTelegraphed) push("healIncoming");
    if (e.surgeTelegraphed) push("surge");
    if (isTarget && engine() && typeof CombatEngine.enemyDoubleStrikeNext === "function" && CombatEngine.enemyDoubleStrikeNext()) push("doubleStrike");
    if (isRanged(e)) push("ranged");
    if (e.archetype === "enraged") push("enraged", null, num(e.rageFreezeRounds) > 0);
    if (e.archetype === "corrupted") push("corrupted", num(e.corruptedStacks));
    if (e.archetype === "vampiric") push("vampiric", null, num(e.vampiricSuppressedRounds) > 0);
    if (e.archetype === "armored") push("armored", null, num(e.armorSuppressedRounds) > 0);
    if (num(e.shieldRounds) > 0) push("shieldActive", num(e.shieldRounds));
    if (num(e.vulnerableRounds) > 0) push("vulnerable", num(e.vulnerableRounds));
    if (e.dot && num(e.dot.rounds) > 0) push("dot", num(e.dot.rounds));
    if (num(e.counteredRounds) > 0) push("countered");
    return out;
  }
  function stIcon(st) { return (st.suppressed && st.def.iconSuppressed) ? st.def.iconSuppressed : st.def.icon; }

  /* ---------- Bandeau de la cible ---------- */
  function enemies() { var A = actorsApi(); return A ? A.enemies() : (game.enemy ? [game.enemy] : []); }
  function target() { var A = actorsApi(); return A ? A.target() : game.enemy; }

  function buildTargetHTML() {
    var t = target(), h = "";
    if (t) {
      var tag = t.isElite ? '<span class="cbx-tag-badge is-elite">' + _t("ÉLITE") + '</span>' : (t.isBoss ? '<span class="cbx-tag-badge">' + _t("BOSS") + '</span>' : '');
      var perm = statesOf(t, true).filter(function (s) { return s.def.famille !== "alerte"; }).slice(0, 4);
      h += '<div class="cbx-tname">' + '<b>' + esc(_td(t.name || "")) + '</b>' + tag
        + '<button type="button" class="cbx-badges" onclick="openCombatStatesSheet()" aria-label="' + esc(_t("États du combat")) + '">'
        + perm.map(function (s) { return '<span class="cbx-badge' + (s.suppressed ? ' is-sup' : '') + '">' + ico(stIcon(s)) + '</span>'; }).join("")
        + '<span class="cbx-badge is-info">i</span></button></div>';
      var gauge = t.isElite ? "kgauge-elite" : (t.isBoss ? "kgauge-boss" : "kgauge-dragon-claw");
      var pct = num(t.maxHp) > 0 ? Math.max(0, num(t.hp) / num(t.maxHp) * 100) : 0;
      h += '<div class="cbx-tgauge kgauge ' + gauge + ' kgauge-hp-enemy' + (num(t.shieldRounds) > 0 ? ' is-shielded' : '') + '">'
        + '<div class="kgauge-track"><div class="kgauge-fill" style="width:' + pct.toFixed(1) + '%"></div></div>'
        + '<div class="kgauge-text">' + fmt(t.hp) + ' / ' + fmt(t.maxHp) + '</div></div>';
    }
    // Télégraphes de TOUT le groupe : c'est ce qui arrive au prochain round.
    var chips = "", list = enemies();
    list.forEach(function (e) {
      statesOf(e, e === t).forEach(function (s) {
        if (s.def.famille !== "alerte" || s.id === "approaching") return;
        var heal = s.id === "healIncoming", rise = s.id === "rising";
        chips += '<button type="button" class="cbx-chip is-urgent' + (heal ? ' is-heal' : '') + (rise ? ' is-rise' : '') + '" onclick="openCombatStatesSheet()">' + ico(stIcon(s))
          + (list.length > 1 && e !== t ? esc(_td(e.name || "")) + ' · ' : '') + esc(_td(s.def.mot || s.def.nom))
          + (heal ? ' <small>' + _t("Interromps-le !") + '</small>' : '') + (rise ? ' <small>' + _t("Achève-le !") + '</small>' : '') + '</button>';
      });
    });
    if (cbx.phase) chips += '<button type="button" class="cbx-chip is-phase" onclick="cbxReplayPhase()">⚑ ' + esc(cbx.phase.label) + '</button>';
    h += '<div class="cbx-chips">' + chips + '</div>';
    return h;
  }

  /* ---------- Scène : couloirs et profondeur ---------- */
  var RANK = { 0: { y: 5, s: 1 }, 1: { y: 30, s: 0.78 }, 2: { y: 50, s: 0.6 } };
  var LANE_X = { L: { 0: 19, 1: 27, 2: 35 }, C: { 0: 50, 1: 50, 2: 50 }, R: { 0: 81, 1: 73, 2: 65 } };
  var LANE_UP = { L: 0, C: 17, R: 0 };   // à trois : le couloir central en retrait (formation en V)
  var LANE_X_BOSS = { L: { 0: 15, 1: 19, 2: 24 }, R: { 0: 85, 1: 81, 2: 76 } };
  var BOSS_RANK = { 0: { y: 8, s: 1 }, 1: { y: 13, s: 0.92 }, 2: { y: 19, s: 0.84 } };
  var ADD_RANK = { 0: { y: 3, s: 1 }, 1: { y: 20, s: 0.82 }, 2: { y: 38, s: 0.62 } };

  function rankOf(e) { return isRanged(e) ? (num(e.engageIn) > 0 ? 2 : 1) : Math.min(2, num(e.engageIn)); }

  /* Un couloir attribué une fois pour toutes, à l'arrivée (le champ vit sur l'objet ennemi). */
  function assignLanes(list) {
    var used = {};
    list.forEach(function (e) { if (e._cbxLane) used[e._cbxLane] = true; });
    var fresh = list.filter(function (e) { return !e._cbxLane; });
    if (!fresh.length) return;
    var hasBoss = list.some(function (e) { return e.isBoss; });
    var order = list.length === 1 ? ["C"] : (hasBoss || (list.length === 2 && !used.C) ? ["L", "R", "C"] : ["L", "C", "R"]);
    fresh.forEach(function (e) {
      if (e.isBoss && !used.C) { e._cbxLane = "C"; used.C = true; return; }
      for (var k = 0; k < order.length; k++) if (!used[order[k]]) { e._cbxLane = order[k]; used[order[k]] = true; return; }
      e._cbxLane = "C";
    });
  }

  function layout(list) {
    assignLanes(list);
    var pos = {};
    var boss = list.filter(function (e) { return e.isBoss; })[0];
    if (boss && list.length > 1) {
      var br = rankOf(boss);
      list.forEach(function (e) {
        var r = rankOf(e);
        if (e === boss) pos[e.actorId] = { left: 50, bottom: BOSS_RANK[br].y + 12, w: "min(64%, 74cqh)", s: BOSS_RANK[br].s, z: 4, rank: br, boss: true };
        else pos[e.actorId] = { left: (LANE_X_BOSS[e._cbxLane] || LANE_X_BOSS.L)[r], bottom: ADD_RANK[r].y, w: "min(40%, 46cqh)", s: ADD_RANK[r].s, z: 20 - r * 3, rank: r };
      });
      return pos;
    }
    var n = list.length;
    var base = n <= 1 ? "min(86%, 96cqh)" : (n === 2 ? "min(56%, 64cqh)" : "min(50%, 58cqh)");
    list.forEach(function (e) {
      var r = rankOf(e);
      var lane = e._cbxLane || "C";
      var x = n <= 1 ? 50 : LANE_X[lane][r];
      var up = n >= 3 ? LANE_UP[lane] : (n === 2 ? 3 : 4);
      var b = (n <= 1 && e.isBoss) ? BOSS_RANK[r] : RANK[r];
      pos[e.actorId] = { left: x, bottom: b.y + up, w: base, s: b.s, z: 10 - r * 3 - (lane === "C" && n >= 3 ? 1 : 0), rank: r, boss: !!e.isBoss };
    });
    return pos;
  }

  function enemyImage(e) {
    if (typeof getEnemyPortrait === "function") return getEnemyPortrait(e);
    return e.image || "";
  }

  function foeUiHTML(e, solo) {
    var pct = num(e.maxHp) > 0 ? Math.max(0, num(e.hp) / num(e.maxHp) * 100) : 0;
    var h = solo ? '' : '<div class="cbx-foe-hp"><i style="width:' + pct.toFixed(1) + '%"></i></div>';
    var tele = e.downed ? "rising" : e.chargeTelegraphed ? "charge" : e.healTelegraphed ? "healIncoming" : e.silenceTelegraphed ? "silence" : e.shieldTelegraphed ? "shieldIncoming" : e.surgeTelegraphed ? "surge" : null;
    if (tele) h += '<button type="button" class="cbx-foe-tele" onclick="openCombatStatesSheet()"><span class="cbx-badge is-urgent">' + ico(stateDef(tele).icon) + '</span></button>';
    if (e.dot && num(e.dot.rounds) > 0) h += '<button type="button" class="cbx-foe-dot" onclick="openCombatStatesSheet()">' + ico(IC.st + "arcane_burn.png") + '<b>' + num(e.dot.rounds) + '</b></button>';
    var marks = "";
    if (num(e.engageIn) > 0) marks += '<button type="button" class="cbx-dist-badge" onclick="openCombatStatesSheet()">' + ico(IC.st + "enemy_approaching.png") + '<b>' + num(e.engageIn) + '</b></button>';
    if (isRanged(e)) marks += '<button type="button" class="cbx-dist-badge is-ranged" onclick="openCombatStatesSheet()">' + ico(CBX_STATES.ranged.icon) + '<span>' + _t("à distance") + '</span></button>';
    if (marks) h += '<div class="cbx-foe-marks">' + marks + '</div>';
    return h;
  }

  /* Rendu PAR CLÉ (actorId) : les éléments restent d'une image à l'autre, seuls styles et classes
     changent — c'est ce qui fait « marcher » un ennemi dans son couloir (transitions CSS). */
  function renderStage() {
    var stage = byId("cbx-stage");
    if (!stage || !stage.querySelector) return;
    var list = enemies().filter(function (e) { return e && num(e.hp) > 0; });
    var t = target();
    var pos = layout(list);
    var keep = {};
    list.forEach(function (e) {
      var key = String(e.actorId || "e");
      var el = stage.querySelector('.cbx-foe[data-k="' + key + '"]');
      var p = pos[e.actorId] || { left: 50, bottom: 5, w: "min(86%, 96cqh)", s: 1, z: 10, rank: 0 };
      var width = "calc(" + p.w + " * " + p.s + ")";
      if (el && el._cbxRef !== e) { el.remove(); el = null; }   // même actorId, autre combat
      if (!el) {
        el = document.createElement("div");
        el.className = "cbx-foe is-new";
        el.setAttribute("data-k", key);
        el._cbxRef = e;
        el.innerHTML = '<button type="button" class="cbx-foe-hit" onclick="selectEnemyTarget(\'' + esc(key) + '\')" aria-label="' + esc(_td(e.name || "")) + '">'
          + '<div class="cbx-foe-ground"></div><div class="cbx-foe-halo"></div><div class="cbx-foe-shield"></div>'
          + '<img class="cbx-foe-img" src="' + esc(enemyImage(e)) + '" alt="">'
          + '<div class="cbx-foe-fx">' + new Array(10).join("<i></i>") + '</div><div class="cbx-foe-healfx">' + new Array(8).join("<i></i>") + '</div>'
          + '<span class="cbx-foe-zone"></span></button>'   // zone de toucher ovale : les coins transparents de l'image ne volent pas le tap du voisin
          + '<div class="cbx-foe-ui"></div>';
        // Entrée : il apparaît au fond, petit, puis gagne sa place.
        el.style.left = p.left + "%"; el.style.bottom = "56%"; el.style.width = "calc(" + p.w + " * .45)";
        stage.appendChild(el);
        void el.offsetWidth;
      }
      var isT = (e === t);
      el.style.left = p.left + "%"; el.style.bottom = p.bottom + "%"; el.style.width = width;
      el.style.zIndex = isT ? 30 : p.z;   // la cible passe devant (choix Seb), sa profondeur ne change pas
      var cls = "cbx-foe r" + p.rank + (p.boss ? " is-boss" : "") + (isT ? " is-target" : "")
        + (e.chargeTelegraphed ? " tele-charge" : "") + (e.healTelegraphed ? " tele-heal" : "") + (e.silenceTelegraphed ? " tele-silence" : "")
        + (e.shieldTelegraphed ? " tele-shield" : "") + (e.surgeTelegraphed ? " tele-surge" : "")
        + (e.dot && num(e.dot.rounds) > 0 ? " dot-burn" : "") + (num(e.shieldRounds) > 0 ? " is-shielded" : "") + (num(e.vulnerableRounds) > 0 ? " is-vuln" : "")
        + (e._cbxDash ? " is-dash" : "") + (e.downed ? " is-downed" : "");
      if (el.className !== cls) el.className = cls;
      var ui = el.querySelector(".cbx-foe-ui"), html = foeUiHTML(e, list.length === 1);
      if (ui && ui._h !== html) { ui.innerHTML = html; ui._h = html; }
      keep[key] = true;
    });
    // Ceux qui ne sont plus là : fondu, puis retrait.
    Array.prototype.forEach.call(stage.querySelectorAll(".cbx-foe"), function (el) {
      if (keep[el.getAttribute("data-k")] || el.classList.contains("is-dead")) return;
      el.classList.add("is-dead");
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 650);
    });
  }

  /* ---------- Équipe ---------- */
  function heroDef() { return (typeof getHeroByGameId === "function") ? getHeroByGameId(game.heroId) : null; }
  function allies() { var A = actorsApi(); return A ? A.allies() : []; }

  function turnState(actor) {
    if (!isManual() || num(actor.hp) <= 0) return "";
    var E = engine();
    if (E.pendingOf(actor)) return "done";
    return E.selectedActor() === actor ? "now" : "wait";
  }
  function turnTagHTML(st) {
    if (st === "done") return '<span class="cbx-turn-badge is-done">✓</span>';
    if (st === "now") return '<span class="cbx-turn-badge is-now">' + _t("À toi") + '</span>';
    if (st === "wait") return '<span class="cbx-turn-badge is-wait"></span>';
    return "";
  }
  function worstCorruption() {
    var m = 0;
    enemies().forEach(function (e) { if (e && e.archetype === "corrupted") m = Math.max(m, num(e.corruptedStacks)); });
    return m;
  }

  var hpMemo = typeof WeakMap === "function" ? new WeakMap() : null;   // dernière largeur affichée par acteur (traînée)

  function heroCardHTML(hero, many) {
    var def = heroDef();
    var max = Math.max(1, num(hero.maxHp)), hp = Math.max(0, num(hero.hp));
    var pct = hp / max * 100, prev = hpMemo && hpMemo.has(hero) ? hpMemo.get(hero) : pct;
    var st = turnState(hero), silenced = num(game.silencedRounds) > 0, corr = worstCorruption();
    var defense = (window.ClassCombatManager && typeof ClassCombatManager.getActiveDefenseEffect === "function") ? ClassCombatManager.getActiveDefenseEffect() : null;
    var marks = "";
    if (silenced) marks += '<i>' + ico(IC.st + "silenced.png") + '</i>';
    if (corr) marks += '<i>' + ico(IC.st + "corruption.png") + '<b>' + corr + '</b></i>';
    if (defense) marks += '<i>' + ico(IC.st + "shield_active.png") + '</i>';
    var res = (window.ClassCombatManager && typeof ClassCombatManager.ensureForCurrentClass === "function") ? ClassCombatManager.ensureForCurrentClass() : null;
    var resPct = res && res.max ? Math.max(0, Math.min(100, res.current / res.max * 100)) : 0;
    var celMax = (typeof CELERITY_GAUGE_MAX === "number") ? CELERITY_GAUGE_MAX : 100;
    var celPct = Math.max(0, Math.min(100, num(game.heroGauge) / celMax * 100));
    var resDef = (res && window.ClassCombatManager && typeof getClassResource === "function") ? getClassResource(ClassCombatManager.getCurrentClassId()) : null;

    var h = '<button type="button" class="cbx-card is-hero' + (hp <= 0 ? ' is-ko' : '') + (silenced ? ' v-silence' : (corr >= 3 ? ' v-corrupt' : '')) + (st ? ' t-' + st : '') + '"'
      + ' data-who="' + esc(hero.actorId || "a0") + '"' + (st === "wait" ? ' onclick="selectCombatActor(\'' + esc(hero.actorId) + '\')"' : '') + '>';
    h += many ? turnTagHTML(st) : '';
    h += '<div class="cbx-card-pt">' + ico((def && def.image) || "") + '<span class="cbx-lvl-badge">' + _t("Niv. {n}", { n: num(game.heroLevel) || 1 }) + '</span>'
      + (marks ? '<span class="cbx-pt-badges">' + marks + '</span>' : '') + '</div>';
    h += '<div class="cbx-card-nm"><span>' + esc(hero.name || "") + '</span></div>';
    h += '<div class="cbx-res r-' + esc((res && res.resourceId) || "") + '" title="' + esc(resDef ? _td(resDef.label) : "") + '"><i style="width:' + resPct.toFixed(1) + '%"></i><u style="width:' + celPct.toFixed(1) + '%"></u></div>';
    h += '<div class="cbx-hpbar' + (pct < 35 ? ' is-low' : '') + '"><i class="is-trail" style="width:' + Math.max(prev, pct).toFixed(1) + '%" data-to="' + pct.toFixed(1) + '"></i>'
      + '<i class="is-fill" style="width:' + Math.min(prev, pct).toFixed(1) + '%" data-to="' + pct.toFixed(1) + '"></i>'
      + '<span class="gauge-text">' + fmt(hp) + '<small> / ' + fmt(max) + '</small></span></div>';
    return h + '</button>';
  }

  function companionCardHTML(a) {
    var def = (typeof getCompanionDef === "function") ? getCompanionDef(a.companionId) : null;
    var max = Math.max(1, num(a.maxHp)), ko = num(a.hp) <= 0, pct = Math.max(0, num(a.hp) / max * 100);
    var cmax = window.CompanionManager ? CompanionManager.chargesMax(a.companionId) : 0;
    var st = turnState(a), dots = "";
    for (var i = 0; i < cmax; i++) dots += '<i class="' + (i < num(a.charges) ? "" : "is-off") + '"></i>';
    var h = '<button type="button" class="cbx-card' + (ko ? ' is-ko' : '') + (st ? ' t-' + st : '') + '" data-who="' + esc(a.actorId) + '"'
      + (st === "wait" || st === "now" ? ' onclick="selectCombatActor(\'' + esc(a.actorId) + '\')"' : '') + '>';
    h += turnTagHTML(st);
    h += '<div class="cbx-card-pt">' + ico((def && def.image) || "") + '</div>';
    h += '<div class="cbx-card-nm"><span>' + esc(_td(a.name || "")) + '</span><small class="cbx-cd-count' + (!ko && !num(a.cooldown) ? ' is-ready' : '') + '">'
      + (ko ? _t("K.O.") : (num(a.cooldown) > 0 ? _t("{n} r", { n: num(a.cooldown) }) : _t("Prêt"))) + '</small></div>';
    h += '<div class="cbx-bars"><div class="cbx-bar' + (pct < 35 ? ' is-low' : '') + '"><i style="width:' + pct.toFixed(1) + '%"></i></div>'
      + (cmax ? '<span class="cbx-dots">' + dots + '</span>' : '') + '</div>';
    return h + '</button>';
  }

  function renderTeam() {
    var host = byId("cbx-team");
    if (!host) return;
    var list = allies();
    var A = actorsApi();
    var hero = A ? A.heroActor() : { hp: game.heroHp, maxHp: game.heroMaxHp, name: "" };
    var comps = list.filter(function (a) { return a && a.companionId; });
    var h = heroCardHTML(hero, comps.length > 0);
    comps.forEach(function (a) { h += companionCardHTML(a); });
    var cls = "cbx-team c" + (1 + comps.length);
    if (host.className !== cls) host.className = cls;
    if (setHtml(host, h)) {
      if (hpMemo) hpMemo.set(hero, Math.max(0, num(hero.hp)) / Math.max(1, num(hero.maxHp)) * 100);
      // Les barres partent de l'ancienne valeur ; la nouvelle est posée à l'image suivante pour que la transition joue.
      var raf = (typeof requestAnimationFrame === "function") ? requestAnimationFrame : function (f) { setTimeout(f, 16); };
      raf(function () {
        Array.prototype.forEach.call(host.querySelectorAll(".cbx-hpbar i[data-to]"), function (i) { i.style.width = i.getAttribute("data-to") + "%"; });
      });
    }
  }

  /* ---------- Commandes ---------- */
  var SLOTS = ["skill1", "skill2", "skill3", "defense"];
  var KEYS = { skill1: "1", skill2: "2", skill3: "3", defense: "4" };

  function actionIcon(action) {
    return (typeof CLASS_ACTION_ICON_FALLBACK !== "undefined" && CLASS_ACTION_ICON_FALLBACK[action.id])
      || (action.type === "defense" ? "images/Icons/combat_stats/stat_defense.png" : "images/Icons/scene/node_discovery.png");
  }

  /* Le conseil du Grimoire, avec SA RAISON : la condition de la règle qui s'applique. */
  function heroAdvice() {
    if (!window.ClassCombatManager || typeof ClassCombatManager.chooseRoundAction !== "function" || !game.enemy) return null;
    var d = ClassCombatManager.chooseRoundAction(false);
    var slot = (d && d.slot) || "basic";
    var action = slot !== "basic" ? ClassCombatManager.getAction(slot) : null;
    return { slot: slot, cond: d ? d.matchedConditionId : null, label: action ? _td(action.label) : _t("Attaque"), icon: action ? actionIcon(action) : IC.attack };
  }
  function condInfo(id) {
    var c = (typeof GRIMOIRE_CONDITIONS !== "undefined" && id) ? GRIMOIRE_CONDITIONS[id] : null;
    return c ? { label: _td(c.label), icon: c.icon } : null;
  }

  function skillButtonHTML(slot, advice, small) {
    var action = ClassCombatManager.getAction(slot);
    if (!action) return "";
    var res = ClassCombatManager.ensureForCurrentClass();
    var cd = (game.classCooldowns && typeof game.classCooldowns[action.id] === "number") ? game.classCooldowns[action.id] : 0;
    var affordable = !res || res.current >= (action.resourceCost || 0);
    var auto = !isManualOrSolo();
    var silenced = num(game.silencedRounds) > 0 && action.slot !== "defense";
    var condOk = (typeof checkActionConditions !== "function") || checkActionConditions(action.conditions, { enemyHp: game.enemy ? game.enemy.hp : null, enemyMaxHp: game.enemy ? game.enemy.maxHp : null });
    var heroDone = isManual() && engine().pendingOf(actorsApi().heroActor());
    var disabled = cd > 0 || !affordable || auto || silenced || !condOk || num(game.heroHp) <= 0 || heroDone;
    var sugg = !small && !disabled && advice && advice.slot === slot;
    var defense = (action.type === "defense" && typeof ClassCombatManager.getActiveDefenseEffect === "function") ? ClassCombatManager.getActiveDefenseEffect() : null;
    var active = !!(defense && defense.actionId === action.id);
    var played = small && cbx.lastHeroSlot === slot;
    var h = '<button type="button" class="cbx-skill' + (sugg ? ' is-suggested' : '') + (silenced ? ' is-silenced' : '') + (played ? ' is-played' : '') + (active ? ' is-active' : '')
      + (!affordable && !cd ? ' is-poor' : '') + '"' + (disabled && !small ? ' disabled' : '') + (small ? ' tabindex="-1"' : '')
      + ' onclick="CombatEngine.heroAction(\'' + slot + '\')" aria-label="' + esc(_td(action.label)) + '">' + ico(actionIcon(action));
    if (silenced) h += '<span class="cbx-skill-lock">' + ico(IC.st + "silenced.png") + '</span>';
    else if (cd > 0) h += '<span class="cbx-skill-cd">' + cd + _t("r", "round abrégé, collé au nombre") + '</span>';
    else if (active) h += '<span class="cbx-on-badge">' + _t("ACTIF") + '</span>';
    if (!small && action.resourceCost) h += '<span class="cbx-cost-badge">' + action.resourceCost + '</span>';
    if (!small) h += '<span class="cbx-key-badge">' + KEYS[slot] + '</span>';
    return h + '</button>';
  }
  function isManualOrSolo() {
    return game.combatMode !== "grimoire" && !(game.combatRound && game.combatRound.continueAttack);
  }

  function potionHTML(index) {
    if (typeof HEALING_POTIONS_DB === "undefined" || !window.PotionManager) return "";
    var p = HEALING_POTIONS_DB[index];
    if (!p) return "";
    var stock = PotionManager.getHealingStock(p.id);
    var busy = !!(game.combatRound && game.combatRound.busy);
    var heroDone = isManual() && engine().pendingOf(actorsApi().heroActor());
    var dis = stock <= 0 || busy || num(game.heroHp) <= 0 || heroDone;
    return '<button type="button" class="cbx-pot"' + (dis ? ' disabled' : '') + ' onclick="CombatEngine.heroAction(\'potion\', \'' + esc(p.id) + '\')" aria-label="' + esc(_td(p.name)) + '">'
      + ico(p.icon) + '<span class="cbx-pot-count">' + stock + '</span><em class="cbx-key-badge">' + (index + 5) + '</em></button>';
  }

  function companionActionsHTML(a) {
    var def = getCompanionDef(a.companionId);
    if (!def || !def.skill) return "";
    var cmax = CompanionManager.chargesMax(a.companionId);
    var noCharge = cmax > 0 && num(a.charges) <= 0, cd = num(a.cooldown);
    var off = cd > 0 || noCharge;
    var advise = !off && CompanionManager.chooseAction(a) === "skill";
    var dots = "";
    for (var i = 0; i < cmax; i++) dots += '<i class="' + (i < num(a.charges) ? "" : "is-off") + '"></i>';
    var h = '<div class="cbx-cskill">';
    h += '<button type="button" class="cbx-skill' + (advise ? ' is-suggested' : '') + '"' + (off ? ' disabled' : '') + ' onclick="companionAction(\'skill\')" aria-label="' + esc(_td(def.skill.name)) + '">'
      + ico(def.skill.icon) + (cd > 0 ? '<span class="cbx-skill-cd">' + cd + _t("r", "round abrégé, collé au nombre") + '</span>' : (noCharge ? '<span class="cbx-skill-cd">∅</span>' : '')) + '</button>';
    h += '<div class="cbx-cskill-txt"><b>' + esc(_td(def.skill.name)) + (cmax ? ' <span class="cbx-dots">' + dots + '</span>' : '') + '</b><span>' + esc(_td(def.skill.desc || "")) + '</span>'
      + (advise ? '<em>' + ico(IC.grim) + _t("Le Grimoire la conseille") + '</em>' : '') + '</div>';
    return h + '</div>';
  }

  function buildCmdHTML() {
    if (!window.ClassCombatManager || !engine()) return "";
    CombatEngine.ensureState();
    /* v3.440.0 : le mode se choisit à la préparation de sortie et reste figé ; « Continuer » et la
       vitesse passent dans la barre du haut (buildTopHTML). La rangée du mode disparaît. */
    var grim = game.combatMode === "grimoire";
    var downed = num(game.heroHp) <= 0;
    var cont = !!(game.combatRound && game.combatRound.continueAttack);
    var h = '';

    if (grim) {
      h += '<div class="cbx-strip">' + potionHTML(0) + '<div class="cbx-strip-mid"><div class="cbx-strip-skills">';
      SLOTS.forEach(function (s) { h += skillButtonHTML(s, null, true); });
      h += '</div><div class="cbx-strip-last">' + _t("Le Grimoire joue pour toute l'équipe") + '</div></div>' + potionHTML(1) + '</div>';
      return h;
    }

    var manual = isManual();
    var sel = manual ? CombatEngine.selectedActor() : null;
    var compTurn = !!(sel && sel.companionId);
    if (compTurn) {
      h += companionActionsHTML(sel);
    } else {
      var adv = (!cont && !downed) ? heroAdvice() : null;
      if (adv) {
        var c = condInfo(adv.cond);
        h += '<div class="cbx-advice">' + ico(IC.grim, "is-book") + '<span>' + (c ? ico(c.icon) + esc(c.label) : _t("Par défaut")) + ' <b>→</b> ' + ico(adv.icon) + '<b>' + esc(adv.label) + '</b></span></div>';
      }
      h += '<div class="cbx-skills">';
      SLOTS.forEach(function (s) { h += skillButtonHTML(s, adv, false); });
      h += '</div>';
    }
    var atkDis = cont || downed || (manual && !compTurn && CombatEngine.pendingOf(actorsApi().heroActor()));
    h += '<div class="cbx-attack-row">' + potionHTML(0)
      + '<button type="button" id="combat-attack-btn" class="cbx-attack' + (compTurn ? ' is-comp' : '') + '"' + (atkDis ? ' disabled' : '') + ' onclick="CombatEngine.heroAction(\'basic\')" aria-label="' + esc(_t("Attaque (barre espace)")) + '">'
      + (compTurn ? ico((getCompanionDef(sel.companionId) || {}).image) + _t("ATTAQUER") + ' <small>' + esc(_td(sel.name || "")) + '</small>' : _t("ATTAQUER"))
      + '<em class="cbx-key-badge">' + _t("Espace") + '</em></button>' + potionHTML(1) + '</div>';
    return h;
  }

  function renderCmd() {
    var host = byId("cbx-cmd");
    if (!host) return;
    var cls = "cbx-cmd" + (game.combatMode === "grimoire" ? " is-grim" : "");
    if (host.className !== cls) host.className = cls;
    setHtml(host, buildCmdHTML());
  }

  /* ---------- Feuille « États du combat » ---------- */
  function stRowHTML(st, who, alert) {
    var desc = (st.suppressed && st.def.descSuppressed) ? st.def.descSuppressed : st.def.desc;
    var fam = st.def.famille;
    var n = st.n ? (st.n + ((fam === "mine" || fam === "onme" || st.id === "approaching") ? " " + _t("rd", "round abrégé") : "")) : "";
    if (st.id === "corrupted" && st.n) n = "×" + st.n;
    return '<div class="st-row' + (alert ? ' is-alert' : '') + '">' + ico(stIcon(st), "st-row-ico")
      + '<div class="st-row-body"><div class="st-row-name">' + esc(_td(st.def.nom)) + (who ? ' <span class="cbx-st-who">· ' + esc(who) + '</span>' : '') + '</div>'
      + '<div class="st-row-desc">' + esc(_td(desc || "")) + '</div>'
      + (st.def.hint && !st.suppressed ? '<div class="st-row-hint">' + esc(_td(st.def.hint)) + '</div>' : '') + '</div>'
      + (n ? '<div class="st-row-n">' + n + '</div>' : '') + '</div>';
  }

  function buildStatesSheetHTML() {
    var groups = { alerte: [], enemy: [], mine: [], onme: [] };
    var list = enemies(), t = target();
    list.forEach(function (e) {
      var who = list.length > 1 ? _td(e.name || "") : "";
      statesOf(e, e === t).forEach(function (st) { var f = st.def.famille; if (groups[f]) groups[f].push(stRowHTML(st, who, f === "alerte")); });
    });
    if (num(game.silencedRounds) > 0 && stateDef("silenced")) groups.onme.push(stRowHTML({ id: "silenced", def: stateDef("silenced"), n: num(game.silencedRounds) }, "", false));

    var h = '<div class="ksheet-backdrop" onclick="closeCombatStatesSheet()"></div><div class="ksheet cbx-states-sheet">';
    h += kSheetHeadHTML({ title: _t("États du combat"), sub: _t("Ce qui pèse sur ce combat, et quoi en faire."), close: "closeCombatStatesSheet()" });
    h += '<div class="ksheet-body">';
    var empty = true;
    var preps = (typeof getRunPreparations === "function") ? getRunPreparations() : [];
    if (preps.length) {
      empty = false;
      h += '<div class="st-group-title">' + _t("Pour ce run") + '</div>';
      preps.forEach(function (p) {
        h += '<div class="st-row">' + ico(p.icon, "st-row-ico") + '<div class="st-row-body"><div class="st-row-name">' + esc(_td(p.name)) + '</div>'
          + '<div class="st-row-desc">' + esc(_td(p.desc || "")) + '</div>'
          + (p.kind === "potion" && !p.live ? '<div class="st-row-hint">' + _t("Armée : elle agira à la prochaine mission.") + '</div>' : '') + '</div></div>';
      });
    }
    (window.COMBAT_STATE_FAMILIES || []).forEach(function (fam) {
      if (!groups[fam.id] || !groups[fam.id].length) return;
      empty = false;
      h += '<div class="st-group-title">' + esc(_td(fam.titre)) + '</div>' + groups[fam.id].join("");
    });
    var comps = allies().filter(function (a) { return a && a.companionId; });
    if (comps.length) {
      empty = false;
      h += '<div class="st-group-title">' + _t("Ton équipe") + '</div>';
      comps.forEach(function (a) {
        var def = getCompanionDef(a.companionId), cmax = CompanionManager.chargesMax(a.companionId);
        var line = num(a.hp) <= 0 ? _t("K.O.") : (num(a.cooldown) > 0 ? _tn(num(a.cooldown), "Recharge : {n} round", "Recharge : {n} rounds") : _t("Compétence prête"));
        if (cmax) line += " · " + _t("charges {a} / {b}", { a: num(a.charges), b: cmax });
        h += '<div class="st-row">' + ico((def && def.image) || "", "st-row-ico is-round") + '<div class="st-row-body"><div class="st-row-name">' + esc(_td(a.name || ""))
          + (def && def.skill ? ' <span class="cbx-st-who">· ' + esc(_td(def.skill.name)) + '</span>' : '') + '</div><div class="st-row-desc">' + esc(line) + '</div></div></div>';
      });
    }
    if (empty) h += '<div class="st-empty">' + _t("Rien de particulier pour l’instant.") + '</div>';
    return h + '</div></div>';
  }

  function openStates() {
    var host = byId("combat-states-modal-root");
    if (host) host.innerHTML = buildStatesSheetHTML();
  }
  function refreshStatesSheet() {
    var host = byId("combat-states-modal-root");
    if (host && host.innerHTML && host.querySelector && host.querySelector(".cbx-states-sheet")) setHtml(host, buildStatesSheetHTML());
  }

  /* ---------- Effets : chiffres flottants, marques sur les cartes ---------- */
  var cbx = { pending: [], hp: typeof WeakMap === "function" ? new WeakMap() : null, tele: typeof WeakMap === "function" ? new WeakMap() : null,
    silenced: 0, notes: [], lastHeroSlot: null, phase: null, lastDeadRect: null };
  window.cbxState = cbx;

  function fxBase() {
    var app = byId("cbx");
    if (!app || !app.getBoundingClientRect) return null;
    var r = app.getBoundingClientRect();
    // Mode PC : la colonne est zoomée — on ramène les coordonnées écran à celles du CSS.
    var z = app.offsetWidth ? (r.width / app.offsetWidth) : 1;
    return { r: r, z: z || 1 };
  }
  function anchorOf(el, yRatio) {
    var b = fxBase();
    if (!b || !el || !el.getBoundingClientRect) return null;
    var r = el.getBoundingClientRect();
    return { x: (r.left - b.r.left + r.width / 2) / b.z, y: (r.top - b.r.top + r.height * (yRatio == null ? 0.4 : yRatio)) / b.z, w: r.width / b.z };
  }
  var stack = {};
  function floatAt(a, text, cls, key) {
    var fx = byId("cbx-fx");
    if (!fx || !a) return;
    var n = (stack[key] = (stack[key] || 0) + 1);
    setTimeout(function () { stack[key] = Math.max(0, (stack[key] || 1) - 1); }, 450);
    var el = document.createElement("div");
    el.className = "cbx-num " + (cls || "");
    el.textContent = text;
    el.style.left = (a.x + (Math.random() * 0.36 - 0.18) * a.w) + "px";
    el.style.top = (a.y - (n - 1) * 22) + "px";
    fx.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1100);
  }
  function foeEl(e) { var s = byId("cbx-stage"); return (s && s.querySelector && e) ? s.querySelector('.cbx-foe[data-k="' + (e.actorId || "") + '"] .cbx-foe-hit') : null; }
  function allyEl(a) { var t = byId("cbx-team"); return (t && t.querySelector && a) ? t.querySelector('.cbx-card[data-who="' + (a.actorId || "a0") + '"]') : null; }
  function flash(el, cls) { if (!el || !el.classList) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  function stamp(el, kind) {
    if (!el) return;
    var s = document.createElement("span");
    s.className = "cbx-stamp is-" + kind;
    el.appendChild(s);
    setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 900);
  }

  /* Remplace l'affichage du moteur : il ne sait pas QUEL ennemi a été touché. Au moment de l'appel,
     les PV de la victime sont déjà baissés — on la retrouve par l'écart avec la valeur mémorisée. */
  function onDamageShown(amount, isCrit) {
    if (!inCombatScreen() || !cbx.hp) return;
    var best = null, bestGap = Infinity;
    enemies().forEach(function (e) {
      var before = cbx.hp.has(e) ? cbx.hp.get(e) : num(e.hp);
      var gap = Math.abs((before - num(e.hp)) - num(amount));
      if (before > num(e.hp) && gap < bestGap) { best = e; bestGap = gap; }
    });
    var e = best || target();
    if (!e) return;
    var el = foeEl(e);
    cbx.hp.set(e, num(e.hp));
    if (el) {
      floatAt(anchorOf(el), (typeof formatNumber === "function" ? formatNumber(amount) : amount), isCrit ? "is-crit" : (num(e.shieldRounds) > 0 ? "is-blocked" : ""), "f" + e.actorId);
      flash(el, "is-hit");
      cbx.lastDeadRect = anchorOf(el, 0.55);
    }
    if (isCrit) flash(byId("cbx-stage"), "is-quake");
  }

  /* Veille des PV, une fois par image : soins ennemis, brûlure, coups reçus par l'équipe. */
  function watch() {
    if (!cbx.hp || !inCombatScreen()) return;
    var chargeLanded = false;
    enemies().forEach(function (e) {
      var before = cbx.hp.has(e) ? cbx.hp.get(e) : null, now = num(e.hp);
      var teleBefore = cbx.tele.has(e) ? cbx.tele.get(e) : false;
      if (teleBefore && !e.chargeTelegraphed && now > 0) { chargeLanded = true; e._cbxDash = true; setTimeout(function () { e._cbxDash = false; }, 500); }
      cbx.tele.set(e, !!e.chargeTelegraphed);
      if (before !== null && now !== before) {
        var el = foeEl(e);
        if (el && now > before) floatAt(anchorOf(el), "+" + fmt(now - before), "is-foeheal", "f" + e.actorId);
        else if (el && now < before) {
          var burn = e.dot && Math.abs((before - now) - num(e.dot.perRound)) <= 1;
          floatAt(anchorOf(el), fmt(before - now), burn ? "is-burn" : "", "f" + e.actorId);
          flash(el, burn ? "is-burn-tick" : "is-hit");
        }
      }
      cbx.hp.set(e, now);
    });
    allies().forEach(function (a) {
      if (!a) return;
      var before = cbx.hp.has(a) ? cbx.hp.get(a) : null, now = num(a.hp);
      if (before !== null && now !== before) {
        var el = allyEl(a);
        if (el && now < before) {
          floatAt(anchorOf(el, 0.3), "-" + fmt(before - now), chargeLanded ? "is-hurt is-big" : "is-hurt", "a" + a.actorId);
          flash(el, chargeLanded ? "is-crushed" : "is-hurt");
          if (chargeLanded) { stamp(el, "slash"); flash(byId("cbx"), "is-shake"); }
          else if (a.control === "hero" && worstCorruption() > 0) stamp(el, "corrupt");
        } else if (el && now > before) {
          floatAt(anchorOf(el, 0.3), "+" + fmt(now - before), "is-heal", "a" + a.actorId);
          stamp(el, "heal");
        }
      }
      cbx.hp.set(a, now);
    });
    var sil = num(game.silencedRounds);
    if (sil > 0 && cbx.silenced <= 0) { var A = actorsApi(); if (A) stamp(allyEl(A.heroActor()), "silence"); }
    cbx.silenced = sil;
    if (cbx.notes.length) flushRule();
  }

  /* ---------- Grimoire : la règle qui vient de jouer ---------- */
  var ruleTimer = null;
  function noteDecision(n) { if (game.combatMode === "grimoire") cbx.notes.push(n); }
  function flushRule() {
    var el = byId("cbx-rule");
    var notes = cbx.notes.splice(0, cbx.notes.length).slice(0, 2);
    if (!el || !notes.length) return;
    el.innerHTML = notes.map(function (l) {
      var c = condInfo(l.cond);
      return '<div class="cbx-rule-line">' + (l.who ? ico(l.who, "is-who") : '')
        + (c ? '<span class="cbx-rule-if">' + _t("Si") + '</span>' + ico(c.icon) + '<span class="cbx-rule-c">' + esc(c.label) + '</span>' : '<span class="cbx-rule-if">' + _t("Par défaut") + '</span>')
        + '<b>→</b>' + ico(l.icon) + '<strong>' + esc(l.label) + '</strong></div>';
    }).join("");
    el.classList.remove("is-on"); void el.offsetWidth; el.classList.add("is-on");
    flash(byId("cbx-grim-btn"), "is-firing");
    clearTimeout(ruleTimer);
    ruleTimer = setTimeout(function () { el.classList.remove("is-on"); }, Math.max(700, 1500 / Math.max(1, num(game.combatSpeed) || 1)));
  }

  /* ---------- Rendu complet / par image ---------- */
  /* Appelée à chaque image par la boucle (renderEnemyHp) : chaque bloc n'est réécrit que s'il a
     changé. Les commandes, elles, sont recalculées au plus 8 fois par seconde (le conseil du
     Grimoire évalue ses règles) — les actions les redessinent tout de suite par leurs propres appels. */
  var lastCmdAt = 0;
  function renderFrame(force) {
    if (!inCombatScreen()) return;
    setHtml(byId("cbx-top"), buildTopHTML());
    setHtml(byId("cbx-target"), buildTargetHTML());
    renderStage();
    renderTeam();
    var now = Date.now();
    if (force === true || now - lastCmdAt > 120) { lastCmdAt = now; renderCmd(); }
    refreshStatesSheet();
    watch();
  }

  /* ---------- Points d'entrée redéfinis ---------- */
  var oldRenderHeroHp = window.renderHeroHp;
  var oldShowBossPhase = window.showBossPhase;

  window.buildCombatHTML = cbxBuildHTML;
  window.mountCombatArea = function () {
    var gameArea = byId("game-area");
    if (gameArea) gameArea.innerHTML = cbxBuildHTML();
    if (typeof relocateCombatHeroMini === "function") relocateCombatHeroMini(document.body.classList.contains("combat-active"));
    renderFrame(true);
  };
  window.renderEnemy = function () {
    if (!game.enemy) { renderFrame(true); return; }
    if (game.activeTab === "combat" && window.AchievementManager) AchievementManager.onFightStart(game.enemy);
    if (game.activeTab === "combat" && game.enemy.isBoss && window.BossMomentManager) BossMomentManager.onEnemyShown(game.enemy);
    if (!game.enemy.isBoss) cbx.phase = null;
    if (typeof renderActivePotionsBar === "function") renderActivePotionsBar();
    renderFrame(true);
  };
  window.renderEnemyHp = renderFrame;
  window.renderEnemyStatusBar = function () { setHtml(byId("cbx-target"), buildTargetHTML()); refreshStatesSheet(); };
  window.renderEnemyRow = renderStage;
  window.renderAllyRow = renderTeam;
  window.renderActorBand = function () { renderTeam(); renderCmd(); };
  window.renderClassSkillButtons = renderCmd;
  window.renderClassResourceBar = renderTeam;
  window.renderHealButtons = renderCmd;
  window.renderCombatControls = function () {
    if (window.AchievementManager) AchievementManager.onModeShown(game.combatMode);
    renderCmd();
    if (typeof renderCombatSpeedBar === "function") renderCombatSpeedBar();
  };
  window.renderCombatMissionProgress = function () { setHtml(byId("cbx-top"), buildTopHTML()); };
  window.renderHeroHp = function () { if (typeof oldRenderHeroHp === "function") oldRenderHeroHp(); renderTeam(); };
  window.openCombatStatesSheet = openStates;
  window.buildCbxStatesSheetHTML = buildStatesSheetHTML;
  window.buildCbxTargetHTML = buildTargetHTML;
  window.buildCbxCmdHTML = buildCmdHTML;
  window.buildCbxTopHTML = buildTopHTML;
  window.cbxStatesOf = statesOf;
  window.cbxLayout = layout;
  window.cbxIsRanged = isRanged;

  // Le moteur affiche ses dégâts dans l'ancien décor : on les reprend ici, sur le bon ennemi.
  window.showFloatingDamage = function (amount, isCrit) { onDamageShown(amount, isCrit); };
  window.showDamageTakenPopup = function () { /* repris par watch() sur la carte touchée */ };
  window.showGoldPopup = function (amount) {
    var a = cbx.lastDeadRect;
    if (!a) { var st = byId("cbx-stage"); a = st ? anchorOf(st, 0.6) : null; }
    floatAt(a, "+" + (typeof formatNumber === "function" ? formatNumber(amount) : amount), "is-gold", "gold");
  };

  /* Phase de boss : le bandeau bref reste celui du jeu, une pastille le garde lisible ensuite. */
  window.showBossPhase = function (enemy, label, line, full) {
    var name = window.BossMomentManager ? _td(BossMomentManager.cleanName(enemy)) : "";
    var lbl = _td(label || "");
    cbx.phase = { label: lbl.charAt(0).toUpperCase() + lbl.slice(1), title: name + " — " + lbl, line: _td(line || "") };
    if (typeof oldShowBossPhase === "function") oldShowBossPhase(enemy, label, line, full);
    setHtml(byId("cbx-target"), buildTargetHTML());
  };
  window.cbxReplayPhase = function () {
    if (cbx.phase && typeof showBossBanner === "function") showBossBanner(cbx.phase.title, cbx.phase.line, 1600, false);
  };

  window.cbxCycleSpeed = function () {
    var opts = (typeof COMBAT_SPEED_OPTIONS !== "undefined") ? COMBAT_SPEED_OPTIONS : [1, 2, 4];
    var i = opts.indexOf(num(game.combatSpeed || 1));
    if (typeof setCombatSpeed === "function") setCombatSpeed(opts[(i + 1) % opts.length]);
    setHtml(byId("cbx-top"), buildTopHTML());
    renderCmd();
  };

  // La vitesse vit dans la bande Grimoire : l'ancien hôte reste vide.
  var oldSpeedBar = window.renderCombatSpeedBar;
  window.renderCombatSpeedBar = function () {
    if (typeof oldSpeedBar === "function") oldSpeedBar();
    renderCmd();
  };

  /* Ce que le Grimoire décide, relevé sans toucher aux systèmes : on enveloppe leurs méthodes. */
  if (window.ClassCombatManager && typeof ClassCombatManager.chooseRoundAction === "function") {
    var origChoose = ClassCombatManager.chooseRoundAction;
    ClassCombatManager.chooseRoundAction = function (forExecution) {
      var d = origChoose.apply(this, arguments);
      if (forExecution) {
        var slot = (d && d.slot) || "basic";
        var action = slot !== "basic" ? this.getAction(slot) : null;
        cbx.lastHeroSlot = slot;
        var hd = heroDef();
        noteDecision({ who: hd && hd.image, cond: d ? d.matchedConditionId : null, label: action ? _td(action.label) : _t("Attaque"), icon: action ? actionIcon(action) : IC.attack });
      }
      return d;
    };
  }
  if (window.CompanionManager && typeof CompanionManager.takeTurn === "function") {
    var origTurn = CompanionManager.takeTurn;
    CompanionManager.takeTurn = function (actor, forcedSlot) {
      var cdBefore = actor ? num(actor.cooldown) : 0;
      var r = origTurn.apply(this, arguments);
      if (!forcedSlot && actor && num(actor.cooldown) > cdBefore) {   // la compétence a été jouée
        var def = getCompanionDef(actor.companionId);
        var cond = def && def.skill && def.skill.type === "heal" ? (num(game.heroHp) < num(game.heroMaxHp) * 0.6 ? "heroLowHp" : "allyLowHp") : null;
        if (def && def.skill) noteDecision({ who: def.image, cond: cond, label: _td(def.skill.name), icon: def.skill.icon });
      }
      return r;
    };
  }
})();
