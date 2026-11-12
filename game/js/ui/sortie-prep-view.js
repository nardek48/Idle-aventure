"use strict";
/* ui/sortie-prep-view.js — v3.440.0 : PRÉPARATION DE SORTIE (décision Seb, atelier/preparation-sortie.html).
   Avant chaque sortie (chasse, quête, donjon, élite de carte), jamais avant un combat : mode figé jusqu'au
   retour, règles du Grimoire, cible, potion automatique, équipe, comportement de Wenna, potions à boire.
   Les réglages déjà persistants s'appliquent au toucher ; preset et potions seulement à « Partir ». */

var sortiePrep = null;   // { opts, preset, buffs, items, pick } pendant que la feuille est ouverte

function sortiePrepRoot() {
  var host = document.getElementById("sortie-prep-root");
  if (!host) {
    host = document.createElement("div");
    host.id = "sortie-prep-root";
    document.body.appendChild(host);
  }
  return host;
}

function sortiePrepGrimoireOpen() {
  return typeof isTabUnlocked === "function" ? isTabUnlocked("grimoire") : true;
}

/* Potions à bonus proposables : en stock ou déjà bues pour la prochaine sortie. */
function sortiePrepBuffList() {
  if (!window.PotionManager || typeof POTIONS_DB === "undefined") return [];
  return POTIONS_DB.filter(function (p) { return p.perRun && (PotionManager.getStock(p.id) > 0 || PotionManager.isArmed(p.id)); });
}

/* Rien à choisir (début de partie) : on part directement, sans feuille vide. */
function sortiePrepHasChoice() {
  var mates = window.CompanionManager ? CompanionManager.unlockedIds().length : 0;
  var items = window.CombatItems ? CombatItems.ownedIds().length : 0;   // v3.441.0 : objets de combat
  return sortiePrepGrimoireOpen() || mates > 0 || sortiePrepBuffList().length > 0 || items > 0;
}

/* v3.513.0 (décision Seb, atelier/pv-bas-depart.html) : PV bas au départ contre une élite ou un boss. */
var SORTIE_LOW_HP_PCT = 0.70;

/* Sortie qui mène à une élite ou un boss : donjon, élite de carte, quête d'élite ou à boss (jamais la chasse). */
function sortieHasStrongFoe(ctx) {
  if (!ctx) return false;
  if (ctx.type === "dungeon" || ctx.type === "elite") return true;
  var q = (ctx.type === "adventure" && window.ADVENTURE_QUESTS) ? ADVENTURE_QUESTS[ctx.id] : null;
  return !!q && (q.type === "elite" || (q.steps || []).some(function (s) { return s.type === "bossKill" || s.type === "eliteKill"; }));
}

function sortieLowHp(opts) {
  return sortieHasStrongFoe(opts && opts.ctx) && (game.heroHp || 0) / (game.heroMaxHp || 1) < SORTIE_LOW_HP_PCT;
}

/* opts : { title, sub, icon, ctx, food, onGo }. onGo lance la sortie une fois la feuille validée ;
   ctx (comme « Ce que tu vas affronter » : { type, id }) sert à dire quels objets servent ici ;
   food ({ kind, ref } de ProvisionsManager) garde les vivres du départ hors des rations à manger. */
function openSortiePrep(opts) {
  opts = opts || {};
  if (typeof opts.onGo !== "function") return;
  var lvlEl = sortiePrepEliteLevelCtx(opts.ctx); // v3.657.0 : élite à niveaux — le niveau est un choix
  var bare = !sortiePrepHasChoice() && !(lvlEl && lvlEl.best > 0);
  if (bare && !sortieLowHp(opts)) return opts.onGo();
  if (!sortiePrepGrimoireOpen() && game.combatMode === "grimoire" && window.CombatEngine) CombatEngine.setCombatMode("tactique");
  sortiePrep = { opts: opts, buffs: {}, items: [], pick: -1, bare: bare, level: lvlEl ? Math.max(1, lvlEl.best) : null, msg: null };   // bare : feuille réduite à l'alerte PV ; msg : geste du pronostic (v3.736.0)
  renderSortiePrep();
  // v3.704.0 (TUTO-16) : première feuille qui propose un choix, la fiche au-dessus d'elle
  if (!bare && typeof openGenericTutorialOnce === "function") openGenericTutorialOnce("sortie_prep", { allow: "sortie-prep-root" });
}

function closeSortiePrep() {
  sortiePrep = null;
  var host = document.getElementById("sortie-prep-root");
  if (host) host.innerHTML = "";
}

function renderSortiePrep() {
  if (!sortiePrep) return;
  var host = sortiePrepRoot();
  var body = host.querySelector(".ksheet-body"), top = body ? body.scrollTop : 0;
  host.innerHTML = buildSortiePrepHTML();
  body = host.querySelector(".ksheet-body");
  if (body) body.scrollTop = top;   // un réglage touché ne remonte pas la feuille
}

function sortiePrepSegHTML(list, cur, fn) {
  var h = '<div class="kseg">';
  list.forEach(function (o) {
    h += '<button type="button" class="' + (o.id === cur ? 'is-on' : '') + '" onclick="' + fn + '(\'' + o.id + '\')">' + esc(_td(o.label)) + '</button>';
  });
  return h + '</div>';
}

function buildSortiePrepHTML() {
  var o = sortiePrep.opts, grimOpen = sortiePrepGrimoireOpen(), grim = grimOpen && game.combatMode === "grimoire";
  var h = '<div class="ksheet-backdrop" onclick="closeSortiePrep()"></div>';
  h += '<div class="ksheet sortie-prep">';
  h += kSheetHeadHTML({
    icon: o.icon ? renderIconOrEmojiHTML(o.icon, "", "") : '',
    title: esc(o.title || _t("Préparer la sortie")),
    sub: esc(o.sub || _t("Préparer la sortie")),
    close: "closeSortiePrep()"
  });
  h += '<div class="ksheet-body">';

  var lowHp = sortieLowHp(o);
  if (lowHp) h += buildSortiePrepLowHpHTML();   // v3.513.0 : avant tout le reste
  else if (sortiePrep.bare) h += buildSortiePrepHpOkHTML();   // ration mangée : la feuille réduite ne reste pas vide
  if (sortiePrep.bare) return h + '</div>' + buildSortiePrepFootHTML(lowHp);

  h += buildSortiePrepEliteLevelHTML();   // v3.657.0 : élites à niveaux (atelier elites-niveaux.html, A)
  h += buildSortiePrepForecastHTML();   // v3.523.0 : le verdict de l'élite, frein du jour compris
  h += buildSortiePrepTraitsHTML(grim);   // v3.446.1 : la menace d'abord (décision Seb), la préparation ensuite
  if (grimOpen) h += buildSortiePrepRulesHTML(grim);   // v3.736.0 (Seb 07/11, Grimoire vivant) : jeux et règles juste sous le pronostic

  /* Mode, figé jusqu'au retour au Campement */
  if (grimOpen) {
    h += '<div class="sp-sec"><div class="sp-title">' + _t("Mode de combat") + '</div>';
    h += '<div class="sp-mode">';
    h += '<button type="button" class="' + (!grim ? 'is-on' : '') + '" onclick="sortiePrepMode(\'tactique\')"><img src="images/Icons/system/mode_tactique.webp" alt="">' + _t("Tactique") + '</button>';
    h += '<button type="button" class="' + (grim ? 'is-on' : '') + '" onclick="sortiePrepMode(\'grimoire\')"><img src="images/Icons/system/grimoire.webp" alt="">' + _t("Grimoire") + '</button>';
    h += '</div>';
    h += '<div class="cp-behavior-hint">' + (grim
      ? _t("Les rounds s'enchaînent seuls et tes règles choisissent l'action.")
      : _t("Chaque round attend ton choix — tes règles se contentent de surligner l'action conseillée.")) + '</div>';
    h += '<div class="sp-lock"><img class="ico-inline" src="images/Icons/system/lock_closed.webp" alt=""> ' + _t("Figé jusqu'au retour au Campement.") + '</div>';
    h += '</div>';
    // v3.458.4 (audit C14) : règles, cible et potions automatiques rejoignent les réglages repliés
    var main = h; h = '';

    if (grim) {
      if (window.RiseSystem) {
        var pol = RiseSystem.getPolicy();
        h += '<div class="cp-behavior-row"><span>' + _t("Cible") + '</span>' + sortiePrepSegHTML(GRIMOIRE_TARGET_POLICIES, pol, "sortiePrepTarget") + '</div>';
        h += '<div class="cp-behavior-hint">' + esc(_td(RiseSystem.getPolicyDef(pol).desc)) + '</div>';
      }
      if (game.worldsEverReached && game.worldsEverReached[5]) { // v3.653.0 : réglage « Varier », dès la Tour
        h += '<label class="cp-behavior-check"><input type="checkbox"' + (game.grimoireVarier ? ' checked' : '')
          + ' onclick="sortiePrepVarier(this.checked)"><span>' + _t("Varier : ne pas refaire la même technique") + '</span></label>';
        h += '<div class="cp-behavior-hint">' + _t("Si une autre technique est prête, elle passe avant celle d'avant. Contre le miroir de la Tour, tu gardes toute ta force.") + '</div>';
      }
      if (window.PotionAutoManager) {
        var pa = PotionAutoManager.ensure();
        h += '<div class="cp-behavior-row"><span>' + _t("Boire") + '</span>' + sortiePrepSegHTML(POTION_AUTO_THRESHOLDS, pa.threshold, "sortiePrepPotAuto") + '</div>';
        h += '<div class="cp-behavior-hint">' + esc(PotionAutoManager.getThreshold(pa.threshold).desc) + '</div>';
        h += '<label class="cp-behavior-check"><input type="checkbox"' + (pa.keepForBoss ? ' checked' : '')
          + ' onclick="sortiePrepKeepBoss(this.checked)"><span>' + _t("Garder la dernière pour le boss") + '</span></label>';
      }
    }
    var tune = h ? '<div class="sp-sec">' + h + '</div>' : '';
    h = main;
  } else var tune = '';

  h += buildSortiePrepTeamHTML(grim, "mates");
  h += buildSortiePrepAgainHTML();   // v3.449.0 : « Comme la dernière fois » ; v3.492.16 (Seb) : sorti du pli « Réglages »
  // v3.458.4 (audit C14) : le reste se replie sous « Réglages », résumé sur une ligne ; ordre de v3.446.1 gardé
  var open = !!sortiePrep.tuneOpen;
  h += '<button type="button" class="sp-fold' + (open ? ' is-open' : '') + '" onclick="sortiePrepFold()"><span><b>' + _t("Réglages") + '</b><small>'
    + esc(sortiePrepTuneSummary(grim)) + '</small></span><i>' + (open ? '▾' : '▸') + '</i></button>';
  if (open) {
    h += tune;
    h += buildSortiePrepTeamHTML(grim, "sets");
    h += buildSortiePrepItemsHTML(grim);
    h += buildSortiePrepPotionsHTML();
  }

  h += '</div>';
  return h + buildSortiePrepFootHTML(lowHp);
}

/* Pied de feuille ; PV bas : « Partir à X % » en rouge (kbtn danger), on peut toujours partir. */
function buildSortiePrepFootHTML(lowHp) {
  var pct = Math.floor((game.heroHp || 0) / (game.heroMaxHp || 1) * 100);
  var h = '<div class="ksheet-foot sp-foot">';
  h += '<button type="button" class="kbtn" onclick="closeSortiePrep()">' + _t("Renoncer") + '</button>';
  h += lowHp
    ? '<button type="button" class="kbtn danger" onclick="confirmSortiePrep()">' + _t("Partir à {n} %", { n: pct }) + '</button>'
    : '<button type="button" class="kbtn primary" onclick="confirmSortiePrep()">' + _t("Partir") + '</button>';
  return h + '</div></div>';
}

/* Rations mangeables d'ici, vivres du départ mis de côté ; soin réel (Cuisine de campagne comprise). */
function sortiePrepRations() {
  if (!window.CampManager) return [];
  var food = sortiePrep.opts.food;
  var req = (food && window.ProvisionsManager) ? ProvisionsManager.getRequirement(food.kind, food.ref) : null;
  return CampManager.getRationOptions().map(function (r) {
    r.free = Math.floor(r.amount) - (req && req.resourceId === r.id ? req.amount : 0);
    if (r.id === "petite_ration" && window.MemoryManager && MemoryManager.has("cuisine_campagne")) {
      r.healPct *= (typeof MEMORY_CUISINE_PETITE_RATION_MULT === "number" ? MEMORY_CUISINE_PETITE_RATION_MULT : 1.25);
    }
    return r;
  }).filter(function (r) { return r.free > 0 && r.healPct > 0; });
}

/* Encart « PV bas » : jauge avec le seuil, rappel des potions, ration ou Feu de camp. */
function buildSortiePrepLowHpHTML() {
  var pct = Math.floor((game.heroHp || 0) / (game.heroMaxHp || 1) * 100);
  var ctx = sortiePrep.opts.ctx || {}, elite = ctx.type === "elite" || (ctx.type === "adventure" && sortieIsEliteQuest(ctx.id));
  var h = '<div class="sp-lowhp">';
  h += '<div class="sp-lowhp-t"><img src="images/Icons/system/warning.webp" alt="">'
    + (elite ? _t("PV bas pour une élite") : _t("PV bas pour un boss")) + '</div>';
  h += sortiePrepHpGaugeHTML(false);
  var cap = (typeof getSortiePotionCap === "function") ? getSortiePotionCap() : 2;
  h += '<p>' + _t("Tu pars avec {n} % de tes PV. Ils ne remontent pas d'eux-mêmes pendant la sortie : {p} potions de soin au plus.", { n: pct, p: cap }) + '</p>';
  h += '<div class="sp-lowhp-acts">';
  var rations = sortiePrepRations();
  rations.forEach(function (r) {
    var gain = Math.min(100 - pct, Math.round(r.healPct * 100));
    h += '<button type="button" class="sp-lowhp-act" onclick="sortiePrepEat(\'' + r.id + '\')"><img src="' + esc(((window.WAREHOUSE_RESOURCES || {})[r.id] || {}).icon || "") + '" alt="">'
      + '<span>' + esc(_t("Manger : {x}", { x: _td(r.name) })) + '<small>' + _t("En stock : {n}", { n: r.free }) + '</small></span><em>+' + gain + ' %</em></button>';
  });
  if (!rations.length) h += '<div class="sp-lowhp-none">' + _t("Aucune ration à manger · Cuisine de camp") + '</div>';
  h += '<button type="button" class="sp-lowhp-act" onclick="sortiePrepRest()"><img src="images/Icons/camp/rest.webp" alt="">'
    + '<span>' + _t("Se reposer au Feu de camp") + '<small>' + _t("PV au maximum dans {d}", { d: formatTime(Math.ceil(CampManager.getMinutesToFull() * 60)) }) + '</small></span></button>';
  return h + '</div></div>';
}

/* Jauge seule, en vert : le seuil est passé, on peut partir. */
function sortiePrepHpGaugeHTML(ok) {
  var max = game.heroMaxHp || 1, hp = Math.floor(game.heroHp || 0), pct = Math.floor(hp / max * 100);
  return '<div class="sp-lowhp-gauge' + (ok ? ' is-ok' : '') + '"><i style="width:' + pct + '%"></i><u style="left:' + Math.round(SORTIE_LOW_HP_PCT * 100) + '%"></u>'
    + '<span>' + formatNumber(hp) + ' / ' + formatNumber(max) + ' ' + _t("PV") + ' · ' + pct + ' %</span></div>';
}

function buildSortiePrepHpOkHTML() {
  return '<div class="sp-lowhp is-ok"><div class="sp-lowhp-t"><img src="images/Icons/system/check_valid.webp" alt="">' + _t("PV suffisants pour partir") + '</div>'
    + sortiePrepHpGaugeHTML(true) + '</div>';
}

function sortieIsEliteQuest(id) {
  var q = window.ADVENTURE_QUESTS ? ADVENTURE_QUESTS[id] : null;
  return !!q && q.type === "elite";
}

/* La ration se mange sans quitter la feuille ; l'encart disparaît une fois le seuil passé. */
function sortiePrepEat(id) {
  if (window.CampManager && CampManager.eatRation(id)) renderSortiePrep();
}

function sortiePrepRest() {
  closeSortiePrep();
  if (typeof switchTab === "function") switchTab("campement");
}

/* v3.445.0 : les règles avec lesquelles on part, en lecture ; « Modifier » ouvre l'onglet Grimoire, qui garde le chemin du retour.
   v3.736.0 (Seb 07/11, jeux A) : ce sont celles du jeu actif ; la rangée des jeux en change d'un toucher (★ : le conseillé). */
function sortiePrepRules() {
  var rules = game.grimoireRules || [];
  return (typeof sanitizeGrimoireRules === "function") ? sanitizeGrimoireRules(rules, getGrimoireCurrentKit()) : rules;
}

function buildSortiePrepJeuxHTML() {
  if (typeof ensureGrimoireJeux !== "function") return "";
  var active = ensureGrimoireJeux(), presets = ensureGrimoirePresets(), ctx = sortiePrep.opts.ctx;
  if (presets.length < 2) return "";
  var sugg = ctx && typeof getSuggestedGrimoirePreset === "function" ? getSuggestedGrimoirePreset(ctx) : null;
  var h = '<div class="sp-presets" role="tablist" aria-label="' + esc(_t("Jeux de règles")) + '">';
  presets.forEach(function (p) {
    var on = p.id === active.id, sc = ctx && typeof grimoireJeuScore === "function" ? grimoireJeuScore(p.rules, ctx, sortiePrep.items) : null; // v3.738.0 : objets choisis comptés
    h += '<button type="button" role="tab" aria-selected="' + on + '" class="' + (on ? 'is-on' : '') + (sugg && sugg.id === p.id ? ' is-sugg' : '') + '"' + (on ? '' : ' onclick="sortiePrepJeu(\'' + esc(p.id) + '\')"') + '>'
      + (sugg && sugg.id === p.id ? '<span class="sp-star" aria-label="' + esc(_t("Conseillé")) + '">★</span>' : '')
      + renderIconOrEmojiHTML(p.icon || "images/Icons/system/grimoire.webp", "", "") + esc(_td(p.name))
      + (sc && sc.of ? ' <small>' + sc.n + '/' + sc.of + '</small>' : '') + '</button>';
  });
  return h + '</div>';
}

/* Message du dernier geste du pronostic (ajout, remplacement, « Tout préparer ») avec « Annuler » ; en choix, les règles à remplacer. */
function buildSortiePrepMsgHTML(kit) {
  var m = sortiePrep.msg;
  if (!m) return "";
  var h = '<div class="sp-msg" role="status"><span>' + esc(m.text) + '</span><div class="sp-msg-acts">';
  if (m.before) h += '<button type="button" class="kbtn" onclick="sortiePrepUndo()">' + _t("Annuler") + '</button>';
  if (m.pick) h += '<button type="button" class="kbtn" onclick="sortiePrepCloseMsg()">' + _t("Ne rien changer") + '</button>';
  return h + '</div></div>';
}

function buildSortiePrepRulesHTML(grim) {
  if (typeof getGrimoireCurrentKit !== "function") return "";
  var kit = getGrimoireCurrentKit(), rules = sortiePrepRules(), ctx = sortiePrep.opts.ctx, pick = sortiePrep.msg && sortiePrep.msg.pick;
  var open = (typeof getGrimoireSlotCount === "function") ? getGrimoireSlotCount(game.worldsEverReached) : rules.length;
  var possible = ctx && typeof etPossibleConds === "function" ? etPossibleConds(ctx) : null;
  var active = typeof ensureGrimoireJeux === "function" ? ensureGrimoireJeux() : null;
  var h = '<div class="sp-sec"><div class="sp-title">' + _t("Tes règles") + '<small>' + esc(active ? _td(active.name) : "") + '</small></div>';
  h += buildSortiePrepJeuxHTML();
  h += buildSortiePrepMsgHTML(kit);
  h += '<div class="sp-rules">';
  var n = 0;
  rules.slice(0, open).forEach(function (r, i) {
    var cond = getGrimoireCondition(r.conditionId), act = (typeof getGrimoireActionDef === "function") ? getGrimoireActionDef(kit, r.actionSlot) : null;
    var useless = !!(possible && cond && etRuleUseless(r, possible));
    var tag = useless ? '<em class="is-nul">' + _t("sans objet ici") + '</em>' : (cond && act && etRuleCovers(r, kit) ? '<em>' + _t("Contre") + '</em>' : '');
    var inner = '<i>' + (i + 1) + '</i>' + (cond && act ? renderIconOrEmojiHTML(cond.icon, "", "")
      + '<span>' + esc(_t("Si {x}", { x: getGrimoireConditionShortLabel(r.conditionId) })) + ' <b>→</b> ' + esc(_td(act.label)) + '</span>' + tag
      : '<span class="is-free">' + _t("Emplacement libre") + '</span>');
    if (cond && act) n++;
    h += pick ? '<button type="button" class="sp-rule is-pick" onclick="sortiePrepReplace(' + i + ')">' + inner + '<em class="is-new">' + _t("Remplacer") + '</em></button>'
      : '<div class="sp-rule">' + inner + '</div>';
  });
  h += '</div>';
  if (!n) h += '<div class="cp-behavior-hint">' + (grim ? _t("Aucune règle : le Grimoire attaque à chaque round.") : _t("Aucune règle : rien n'est surligné en Tactique.")) + '</div>';
  h += '<button type="button" class="kbtn sp-rules-edit" onclick="sortiePrepEditRules()"><img class="ico-inline" src="images/Icons/system/grimoire.webp" alt=""> ' + _t("Modifier mes règles") + '</button>';
  return h + '</div>';
}

/* Va au Grimoire en gardant la feuille (choix compris) ; « Revenir à la préparation » la rouvre telle quelle. */
function sortiePrepEditRules() {
  if (!sortiePrep) return;
  var saved = sortiePrep, fromTab = game.activeTab;
  saved.msg = null;
  closeSortiePrep();
  if (typeof switchTab === "function") switchTab("grimoire");
  if (game.activeTab !== "grimoire") return;
  grimoireEditIndex = null;
  grimoireReturn = {
    fromTab: fromTab, label: _t("Revenir à la préparation"),
    reopen: function () { sortiePrep = saved; renderSortiePrep(); }
  };
  if (typeof renderPanel === "function") renderPanel();
}

/* Équipe : deux compagnons au plus ; Wenna règle ses soins, la voie de Maddoc se lit (elle se paie à sa fiche). */
/* v3.458.4 (audit C14) : part = "mates" (les portraits, visibles) ou "sets" (les comportements, repliés). */
function buildSortiePrepTeamHTML(grim, part) {
  if (!window.CompanionManager) return "";
  var ids = CompanionManager.unlockedIds();
  if (!ids.length) return "";
  var party = CompanionManager.partyIds();
  var h = '<div class="sp-sec"><div class="sp-title">' + _t("Équipe") + '<small>' + party.length + ' / ' + COMPANION_MAX_PRESENT + '</small></div><div class="sp-team">';
  ids.forEach(function (id) {
    var def = getCompanionDef(id), st = CompanionManager.state(id);
    var patrol = !!(window.PatrolManager && PatrolManager.isOnPatrol(id));
    var on = party.indexOf(id) !== -1;
    var role = COMPANION_ROLE_LABELS[def.role] ? _td(COMPANION_ROLE_LABELS[def.role]) : def.role;
    h += '<button type="button" class="sp-mate' + (on ? ' is-on' : '') + '"' + (patrol ? ' disabled' : '')
      + ' onclick="sortiePrepMate(\'' + id + '\', ' + (!st.present) + ')"><img src="' + esc(def.image) + '" alt="">'
      + '<b>' + esc(_td(def.name)) + '</b><small>' + esc(patrol ? _t("En patrouille") : role) + '</small></button>';
  });
  h += '</div>';
  if (part === "mates") return h + '<div class="cp-behavior-hint">' + (grim ? _t("En Grimoire, ils jouent seuls après toi à chaque round.") : _t("En Tactique, tu choisis aussi leur action à chaque round.")) + '</div></div>';
  if (part === "sets") h = '<div class="sp-sec">';
  party.forEach(function (id) {
    var def = getCompanionDef(id), st = CompanionManager.state(id);
    if (def.skill && def.skill.type === "heal") {
      h += '<div class="cp-behavior sp-mate-set"><div class="cp-behavior-title">' + esc(_td(def.name)) + ' — ' + _t("Comportement")
        + (grim ? '' : ' <span class="cp-behavior-off">' + _t("— sert en mode Grimoire") + '</span>') + '</div>';
      h += '<div class="cp-behavior-row"><span>' + _t("Soigne") + '</span>' + sortiePrepSegHTML(COMPANION_HEAL_THRESHOLDS, st.healThreshold, "sortiePrepHeal") + '</div>';
      h += '<div class="cp-behavior-hint">' + esc(_td(getCompanionHealThreshold(st.healThreshold).desc)) + '</div>';
      h += '<div class="cp-behavior-row"><span>' + _t("En priorité") + '</span>' + sortiePrepSegHTML(COMPANION_HEAL_PRIORITIES, st.healPriority, "sortiePrepPrio") + '</div>';
      h += '<label class="cp-behavior-check"><input type="checkbox"' + (st.keepReserve ? ' checked' : '')
        + ' onclick="sortiePrepSetting(\'' + id + '\', \'keepReserve\', this.checked)"><span>' + _t("Garder une charge en réserve") + '</span></label>';
      h += '<div class="cp-behavior-hint">' + _t("Il n'utilise pas sa dernière charge, sauf si un allié est vraiment bas.") + '</div>';
      h += '</div>';
    } else if (CompanionManager.hasVoies(id) && st.voie) {
      h += '<div class="cp-behavior sp-mate-set"><div class="cp-behavior-title">' + esc(_td(def.name)) + ' — ' + _t("Voie :") + ' <b>' + esc(_td(def.label || "")) + '</b></div>'
        + '<div class="cp-behavior-hint">' + _t("Elle se change à sa fiche, dans Compagnons.") + '</div></div>';
    }
  });
  if (part === "sets") return h === '<div class="sp-sec">' ? "" : h + '</div>';
  h += '<div class="cp-behavior-hint">' + (grim ? _t("En Grimoire, ils jouent seuls après toi à chaque round.") : _t("En Tactique, tu choisis aussi leur action à chaque round.")) + '</div>';
  return h + '</div>';
}

/* v3.441.0 — OBJETS DE COMBAT : les traits connus de la sortie et ce qui y répond (règle, objet, rien),
   puis les places. Un objet tient un trait tout seul ; il est retiré de l'Entrepôt au départ. */
function sortiePrepTraitName(trait) {
  return typeof enemyTraitLook === "function" ? _td(enemyTraitLook(trait).nom) : trait; // v3.492.14
}

/* v3.657.0 (élites à niveaux, atelier elites-niveaux.html, A) : élite de carte rejouable, son niveau et ce qu'il change. */
function sortiePrepEliteLevelCtx(ctx) {
  var LM = window.LivingMapManager;
  if (!ctx || ctx.type !== "elite" || !ctx.mapId || !LM || typeof LM.getEliteLevelBest !== "function" || !LM.isRepeatable(ctx.mapId, ctx.sectorId)) return null;
  return { mapId: ctx.mapId, sectorId: ctx.sectorId, best: LM.getEliteLevelBest(ctx.mapId, ctx.sectorId), max: LM.getEliteMaxLevel(ctx.mapId, ctx.sectorId) };
}
function buildSortiePrepEliteLevelHTML() {
  var c = sortiePrepEliteLevelCtx(sortiePrep.opts.ctx);
  if (!c) return "";
  var LM = LivingMapManager, L = LM.clampEliteLevel(c.mapId, c.sectorId, sortiePrep.level), m = LM.getEliteLevelMult(L), pct = function (x) { return Math.round(x * 100); };
  sortiePrep.level = L;
  var resId = LM.getRewardResourceId(c.mapId), res = (window.WAREHOUSE_RESOURCES || {})[resId] || {}, eDef = (window.ELITE_DB || {})[sortiePrep.opts.ctx.id] || {};
  var row = function (ico, html) { return '<div class="dgain-row">' + (ico ? renderIconOrEmojiHTML(ico, "dgain-ico", "") : '<span class="dgain-dot" aria-hidden="true"></span>') + '<span>' + html + '</span></div>'; };
  var h = '<div class="sp-sec dlvl"><div class="dlvl-row">';
  h += '<button type="button" class="dlvl-step" aria-label="' + esc(_t("Niveau précédent")) + '"' + (L <= 1 ? ' disabled' : '') + ' onclick="sortiePrepEliteLevel(-1)">‹</button>';
  h += '<div class="dlvl-num"><small>' + esc(_t("Niveau")) + '</small><strong>' + L + '</strong><small>' + esc(c.best ? _t("meilleur : {n}", { n: c.best }) : _t("jamais battue")) + '</small></div>';
  h += '<button type="button" class="dlvl-step" aria-label="' + esc(_t("Niveau suivant")) + '"' + (L >= c.max ? ' disabled' : '') + ' onclick="sortiePrepEliteLevel(1)">›</button></div>';
  h += '<div class="dgain"><div class="dgain-ttl"><span>' + esc(_t("À gagner")) + '</span></div>';
  h += row(res.icon, esc(_td(res.name || resId)) + ' <strong>+' + LM.getRepeatRewardAt(c.mapId, L) + '</strong>' + (L > 1 ? ' <span class="is-dim">(×' + L + ')</span>' : ''));
  var wr = typeof LM.getEliteWinResource === "function" ? LM.getEliteWinResource(sortiePrep.opts.ctx.id) : null; // v3.689.0 (COMB-22) : la Chitine du Dard
  var wrDef = wr && (window.WAREHOUSE_RESOURCES || {})[wr.id];
  if (wr && wr.amount > 0) h += row(wrDef ? wrDef.icon : null, esc(wrDef ? _td(wrDef.name) : wr.id) + ' <strong>+' + wr.amount + '</strong>');
  if (L > 1) h += row("images/Icons/gold_icon.webp", esc(_t("Or +{p} %", { p: pct(m.gold - 1) })));
  if (eDef.winDrop) h += row(null, esc(_t("Pièce : {n} % par victoire, la {k}e sans pièce en donne une", { n: eDef.winDrop.chancePct, k: Number(eDef.winDrop.pityAfter || 0) + 1 })));
  h += '</div><div class="dgain"><div class="dgain-ttl"><span>' + esc(_t("Ce qui t'attend")) + '</span></div>';
  h += row(null, L > 1 ? esc(_t("Niveau {n} : PV +{a} %, dégâts +{b} %", { n: L, a: pct(m.hp - 1), b: pct(m.power - 1) })) : esc(_t("Niveau 1 : l'élite à sa force de base")));
  var wins = LM.getDailyWins(c.mapId, c.sectorId);
  if (wins) h += row(null, esc(_tn(wins, "Aujourd'hui, {n} victoire : encore +{p} % (le frein retombe à la nuit)", "Aujourd'hui, {n} victoires : encore +{p} % (le frein retombe à la nuit)", { n: wins, p: pct(LM.getBrakeMult(c.mapId, c.sectorId) - 1) })));
  return h + '</div></div>';
}
function sortiePrepEliteLevel(d) {
  var c = sortiePrep && sortiePrepEliteLevelCtx(sortiePrep.opts.ctx);
  if (!c) return;
  sortiePrep.level = LivingMapManager.clampEliteLevel(c.mapId, c.sectorId, (sortiePrep.level || 1) + d);
  renderSortiePrep();
}
window.sortiePrepEliteLevel = sortiePrepEliteLevel;

/* v3.523.0 (audit PLA-3) : verdict d'une élite de carte, frein du jour compris. Une quête d'élite a déjà la fenêtre
   du tableau (launchWithForecast), le donjon sa feuille : pas de doublon ici. */
function buildSortiePrepForecastHTML() {
  var ctx = sortiePrep.opts.ctx || {}, f = null;
  if (!window.CombatForecast || typeof buildCombatForecastLineHTML !== "function") return "";
  try {
    if (ctx.type === "elite" && ctx.mapId) f = CombatForecast.forMapElite(ctx.mapId, ctx.sectorId, ctx.id, sortiePrep.level || null);
  } catch (e) { if (typeof noteErreur === "function") noteErreur("sortie-prep-view.buildSortiePrepForecastHTML", e); f = null; }
  return f ? '<div class="sp-sec">' + buildCombatForecastLineHTML(f, { brake: true }) + '</div>' : ""; // le titre nomme déjà l'élite
}

function sortiePrepTraitsPreview() {
  return (sortiePrep.opts.ctx && typeof getEnemyTraitsPreview === "function") ? getEnemyTraitsPreview(sortiePrep.opts.ctx) : { traits: [], unmet: 0 };
}

/* v3.446.0 : « Ce que tu vas affronter », la réponse à chaque trait connu (objet emporté ou règle du départ).
   v3.736.0 (Seb 07/11, pronostic B) : coche couvert / pas couvert, « Ajouter » ou « Corriger », « Tout préparer » en tête. */
function buildSortiePrepTraitsHTML(grim) {
  var prev = sortiePrepTraitsPreview();
  if (!prev.traits.length && !prev.unknown) return "";
  var kit = (typeof getGrimoireCurrentKit === "function") ? getGrimoireCurrentKit() : null, chosen = sortiePrep.items;
  var ctx = sortiePrep.opts.ctx, rules = sortiePrepRules();
  var open = (typeof getGrimoireSlotCount === "function") ? getGrimoireSlotCount(game.worldsEverReached) : 3;
  var want = grim && typeof grimoireSortieSituations === "function" ? grimoireSortieSituations(ctx).filter(function (x) { return !x.opt; }) : [];
  // v3.738.0 (Seb 07/11) : un trait tenu par un objet choisi compte comme couvert
  var miss = want.filter(function (x) { return !etItemHolds(x.trait, chosen) && etRuleResponse(x.cond, rules, kit).status !== "counter"; });
  var h = '<div class="sp-sec"><div class="sp-title">' + _t("Ce que tu vas affronter")
    + (want.length ? '<small>' + esc(_t("{a} / {b} couvertes", { a: want.length - miss.length, b: want.length })) + '</small>' : '') + '</div>';
  if (grim && want.length) {
    var top = want.slice(0, open), topMiss = top.filter(function (x) { return miss.indexOf(x) !== -1; });
    if (topMiss.length) {
      h += '<div class="sp-prep"><span>' + esc(_tn(topMiss.length, "{n} situation sans réponse.", "{n} situations sans réponse.")) + '</span>'
        + '<button type="button" class="kbtn primary" onclick="sortiePrepAll()">' + _t("Tout préparer") + '</button></div>';
    } else {
      var rest = miss.map(function (x) { return sortiePrepTraitName(x.trait); });
      // v3.738.0 : un objet en stock ferait mieux que sa règle (miroir) : « Tout préparer » l'emporte
      var auto = typeof grimoireAutoItems === "function" && sortiePrepFreeItemSlot() >= 0 ? grimoireAutoItems(ctx, chosen) : [];
      h += '<div class="sp-prep is-ok"><span>' + esc(rest.length
        ? _t("✓ Tes emplacements répondent aux situations les plus fréquentes. Pas de place pour : {x} (la Défense de repli joue sur une annonce).", { x: rest.join(", ") })
        : _t("✓ Tes règles répondent à ce combat.")) + '</span>'
        + (auto.length ? '<button type="button" class="kbtn primary" onclick="sortiePrepAll()">' + _t("Tout préparer") + '</button>' : '') + '</div>';
    }
  }
  prev.traits.forEach(function (t) {
    var def = ENEMY_TRAIT_DEFS[t.trait], st = enemyTraitLook(t.trait); // v3.492.14 : nom et icône, état de combat ou propres
    var item = chosen.filter(function (id) { return id && COMBAT_ITEMS[id] && COMBAT_ITEMS[id].trait === t.trait; })[0];
    var r = grim && def.cond ? etRuleResponse(def.cond, rules, kit) : { status: "none" };
    var slot = grim && def.cond && typeof etAdvisedSlot === "function" ? etAdvisedSlot(def.cond, kit) : null;
    var sansRegle = !def.cond && !item; // aucune règle du Grimoire ne vise cette mécanique
    // v3.738.0 : un objet qui atténue (Acide, Pastille) ne couvre pas une annonce : seule la règle l'annule
    var soft = item && COMBAT_ITEMS[item].soften && def.cond ? item : null, tient = item && !soft;
    var cls = tient ? "is-item" : (r.status === "counter" ? "is-rule" : (grim && !sansRegle ? "is-none" : "is-free"));
    var conseil = slot && r.status !== "counter" ? sortiePrepActionLabel(kit, slot) : "";
    var resp = tient ? (COMBAT_ITEMS[item].soften ? _t("{o} l'atténue.", { o: _td(COMBAT_ITEMS[item].name) }) : _t("{o} le tient.", { o: _td(COMBAT_ITEMS[item].name) }))
      : r.status === "counter" ? (def.cond === "veinIntact" ? _t("Ta règle « {r} » y répond.", { r: etRuleLabel(r.rule, kit) }) : _t("Ta règle « {r} » le contre.", { r: etRuleLabel(r.rule, kit) }))
      : r.status === "react" ? _t("Ta règle « {r} » réagit, sans le contrer.", { r: etRuleLabel(r.rule, kit) }) + (conseil ? " " + _t("Conseillé : {a}.", { a: conseil }) : "")
      : sansRegle ? _t("Ni règle ni objet n'y répond : à toi de le gérer en combat.")
      : grim ? (conseil ? _t("Pas couvert. Conseillé : {a}.", { a: conseil }) : _t("Aucune règle ni objet ne répond."))
      : _t("À toi de le contrer en combat.");
    if (soft) resp = _t("{o} l'atténue.", { o: _td(COMBAT_ITEMS[soft].name) }) + " " + resp;
    var chk = !grim || sansRegle ? '' : '<i class="sp-chk' + (cls === "is-rule" || cls === "is-item" ? ' is-ok">✓' : '">✗') + '</i>';
    var tags = (t.phase != null ? ' <span class="sp-flag is-phase">' + _t("phase") + '</span>' : '')
      + (t.ou ? ' <span class="sp-flag">' + _t("l'un ou l'autre") + '</span>' : '')
      + (t.opt ? ' <span class="sp-flag">' + _t("facultatif") + '</span>' : '');
    var src = t.phase != null ? (t.later ? _t("en cours de combat : « {x} »", { x: _td(t.phase) }) : _t("dès le round 1 : « {x} »", { x: _td(t.phase) })) : t.names.map(function (n) { return _td(n); }).join(", ");
    var btn = cls === "is-none" && slot ? '<button type="button" class="sp-trait-fix" onclick="sortiePrepAdd(\'' + esc(def.cond) + '\')">' + (r.status === "react" ? _t("Corriger") : _t("Ajouter")) + '</button>' : '';
    h += '<div class="sp-trait ' + cls + '">' + chk + '<img src="' + esc(st.icon || "") + '" alt=""><span><b>' + esc(_td(st.nom)) + '</b>' + tags + ' · '
      + esc(src) + '<em>' + esc(resp) + '</em></span>' + btn + '</div>';
    if (!item) h += sortiePrepOfferHTML(ctx, t, cls, rules);
  });
  if (prev.unknown) h += '<div class="cp-behavior-hint">' + esc(_tn(prev.unknown, "{n} situation encore inconnue", "{n} situations encore inconnues")) + ' · ' + _t("elle se révélera en combat.") + '</div>';
  if (prev.unmet) h += '<div class="cp-behavior-hint">' + esc(_tn(prev.unmet, "{n} créature jamais vaincue : ses traits se révéleront au premier combat.", "{n} créatures jamais vaincues : leurs traits se révéleront au premier combat.")) + '</div>';
  return h + '</div>';
}

/* v3.738.0 (Seb 07/11) : « ou emporte » sous un trait qu'un objet de combat contre. En stock : un toucher l'emporte (place
   libre) ; sinon, où il se prépare. Déjà couvert par une règle : proposé seulement en stock. */
function sortiePrepFreeItemSlot() {
  var n = window.CombatItems ? CombatItems.slotCount() : 1;
  for (var i = 0; i < n; i++) if (!sortiePrep.items[i]) return i;
  return -1;
}
function sortiePrepOfferHTML(ctx, t, cls, rules) {
  var it = typeof etItemForTrait === "function" ? etItemForTrait(t.trait) : null;
  if (!it || t.opt || !window.CombatItems) return "";
  var n = CombatItems.getStock(it.id), o = _td(it.name), libre = sortiePrepFreeItemSlot() >= 0;
  var couvert = cls === "is-rule" || cls === "is-item";
  if (couvert && n <= 0) return "";
  var sit = { trait: t.trait, cond: ENEMY_TRAIT_DEFS[t.trait].cond, slot: typeof etAdvisedSlot === "function" ? etAdvisedSlot(ENEMY_TRAIT_DEFS[t.trait].cond, getGrimoireCurrentKit()) : null };
  var mieux = n > 0 && game.combatMode === "grimoire" && etItemBeatsRule(ctx, sit, rules);
  var txt = mieux ? _t("Mieux contre son miroir : emporte {o} (×{n}), ta règle ne rejouera plus la même technique.", { o: o, n: n })
    : it.soften ? (n > 0 ? _t("En plus : {o} (×{n}), il l'atténue.", { o: o, n: n }) : _t("En plus : {o}, il l'atténue.", { o: o }) + " " + etItemWhere(it.id))
    : (n > 0 ? _t("Ou emporte : {o} (×{n}).", { o: o, n: n }) : _t("Ou emporte : {o}.", { o: o }) + " " + etItemWhere(it.id));
  if (n > 0 && !libre) txt += " " + _t("Tes places d'objet sont prises.");
  var btn = n > 0 && libre ? '<button type="button" class="sp-trait-fix" onclick="sortiePrepTake(\'' + esc(it.id) + '\')">' + _t("Emporter") + '</button>' : '';
  return '<div class="sp-offer' + (mieux ? ' is-better' : '') + '"><img src="' + esc(it.icon) + '" alt=""><span>' + esc(txt) + '</span>' + btn + '</div>';
}
/* Emporte l'objet dans la première place libre (pris de l'Entrepôt au départ, comme depuis « Objets »). */
function sortiePrepTake(id) {
  if (!sortiePrep || !window.COMBAT_ITEMS || !COMBAT_ITEMS[id] || !window.CombatItems || CombatItems.getStock(id) <= 0) return;
  if (sortiePrep.items.indexOf(id) !== -1) return;
  var i = sortiePrepFreeItemSlot();
  if (i < 0) return;
  sortiePrep.items[i] = id;
  sortiePrep.msg = { text: _t("{o} emporté : il tient ce trait tout le combat.", { o: _td(COMBAT_ITEMS[id].name) }) };
  if (COMBAT_ITEMS[id].soften) sortiePrep.msg = { text: _t("{o} emporté : il s'ajoute à ta règle.", { o: _td(COMBAT_ITEMS[id].name) }) };
  renderSortiePrep();
}

/* Nom de l'action conseillée (« Garde », « Tailler »…). */
function sortiePrepActionLabel(kit, slot) {
  var a = typeof getGrimoireActionDef === "function" ? getGrimoireActionDef(kit, slot) : null;
  return a ? _td(a.label) : slot;
}

/* Gestes du pronostic : le message dit ce qui a changé, « Annuler » remet les règles d'avant. */
function sortiePrepRuleText(rule) {
  var kit = getGrimoireCurrentKit();
  return _t("Si {x}", { x: getGrimoireConditionShortLabel(rule.conditionId) }) + " → " + sortiePrepActionLabel(kit, rule.actionSlot);
}
function sortiePrepAdd(cond) {
  if (!sortiePrep || typeof grimoireAddRule !== "function") return;
  var r = grimoireAddRule(sortiePrep.opts.ctx, cond), m = null;
  if (!r) return;
  if (r.kind === "added") m = { text: _t("Ajoutée en {n} : « {r} ».", { n: r.index + 1, r: sortiePrepRuleText(r.rule) }), before: r.before };
  else if (r.kind === "fixed") m = { text: _t("Corrigée : « {a} » devient « {b} ».", { a: sortiePrepRuleText(r.old), b: sortiePrepRuleText(r.rule) }), before: r.before };
  else if (r.kind === "replaced") m = { text: _t("Remplace « {r} », inutile ici.", { r: sortiePrepRuleText(r.old) }), before: r.before };
  else if (r.kind === "pick") m = { text: _t("Tes emplacements sont pleins. Remplacer laquelle par « {r} » ?", { r: sortiePrepRuleText(r.rule) }), pick: cond };
  sortiePrep.msg = m;
  renderSortiePrep();
}
function sortiePrepReplace(index) {
  if (!sortiePrep || !sortiePrep.msg || !sortiePrep.msg.pick) return;
  var r = grimoireReplaceRule(index, sortiePrep.msg.pick);
  sortiePrep.msg = r ? { text: _t("Remplace « {r} ».", { r: sortiePrepRuleText(r.old) }), before: r.before } : null;
  renderSortiePrep();
}
function sortiePrepAll() {
  if (!sortiePrep || typeof grimoirePrepareAll !== "function") return;
  // v3.738.0 (Seb 07/11) : les règles d'abord ; l'objet seulement en stock et meilleur que sa règle (miroir), place libre
  var ctx = sortiePrep.opts.ctx, pris = [];
  (typeof grimoireAutoItems === "function" ? grimoireAutoItems(ctx, sortiePrep.items) : []).forEach(function (id) {
    var i = sortiePrepFreeItemSlot();
    if (i >= 0) { sortiePrep.items[i] = id; pris.push(_td(COMBAT_ITEMS[id].name)); }
  });
  var r = grimoirePrepareAll(ctx, sortiePrep.items);
  if (!r) return;
  sortiePrep.msg = r.changed ? { text: _t("Grimoire préparé pour ce combat : les contres d'annonce d'abord."), before: r.before } : { text: _t("Rien à changer : tes règles répondent déjà au mieux.") };
  if (pris.length) sortiePrep.msg.text += " " + _t("Emporté aussi : {o}.", { o: pris.join(", ") });
  renderSortiePrep();
}
function sortiePrepUndo() {
  if (!sortiePrep || !sortiePrep.msg || !sortiePrep.msg.before) return;
  grimoireUndoRules(sortiePrep.msg.before);
  sortiePrep.msg = null;
  renderSortiePrep();
}
function sortiePrepCloseMsg() { if (sortiePrep) sortiePrep.msg = null; renderSortiePrep(); }
/* Un toucher sur un jeu : il devient actif (ses 3 règles jouent) ; le message en cours ne vaut plus. */
function sortiePrepJeu(id) {
  if (!sortiePrep || typeof activateGrimoireJeu !== "function") return;
  activateGrimoireJeu(id);
  sortiePrep.msg = null;
  renderSortiePrep();
}

function buildSortiePrepItemsHTML(grim) {
  if (!window.CombatItems || !window.ApothecaryManager) return "";
  var owned = CombatItems.ownedIds();
  var learned = COMBAT_ITEM_ORDER.some(function (id) { return ApothecaryManager.isLearned(id); });
  if (!owned.length && !learned) return "";
  var slots = CombatItems.slotCount(), chosen = sortiePrep.items;
  var h = '<div class="sp-sec"><div class="sp-title">' + _t("Objets") + '<small>' + chosen.filter(Boolean).length + ' / ' + slots + '</small></div>';
  var prev = sortiePrepTraitsPreview(), kit = (typeof getGrimoireCurrentKit === "function") ? getGrimoireCurrentKit() : null;
  var counters = {};
  if (grim) prev.traits.forEach(function (t) { var c = ENEMY_TRAIT_DEFS[t.trait].cond; if (c && etRuleResponse(c, sortiePrepRules(), kit).status === "counter") counters[t.trait] = true; });

  // Les places
  var known = {};
  prev.traits.forEach(function (t) { known[t.trait] = true; });
  h += '<div class="sp-slots">';
  for (var i = 0; i < slots; i++) { // v3.776.0 : une seule place (la Fiole noire)
    var id = chosen[i], it = id ? COMBAT_ITEMS[id] : null;
    h += '<button type="button" class="sp-slot' + (it ? ' is-full' : '') + (sortiePrep.pick === i ? ' is-open' : '') + '" onclick="sortiePrepPick(' + i + ')">'
      + (it ? '<img src="' + esc(it.icon) + '" alt="">' + esc(_td(it.name)) + '<small>' + _t("Touche pour changer") + '</small>'
            : '<span class="sp-plus">+</span>' + _t("Choisir un objet")) + '</button>';
  }
  h += '</div>';

  if (sortiePrep.pick >= 0) {
    var slot = sortiePrep.pick;
    h += '<div class="sp-pick"><button type="button" class="sp-item" onclick="sortiePrepItem(' + slot + ', \'\')"><span><b>' + _t("Aucun objet") + '</b></span></button>';
    owned.forEach(function (oid) {
      if (chosen.indexOf(oid) !== -1 && chosen[slot] !== oid) return;   // déjà dans l'autre place
      var o = COMBAT_ITEMS[oid], tn = o.trait ? sortiePrepTraitName(o.trait) : "";
      var tag = !o.trait ? '<span class="sp-tag is-cost">' + esc(_td(o.con || "")) + '</span>'   // v3.442.0 : objet à contrepartie
        : !known[o.trait] ? '<span class="sp-tag is-meh">' + esc(_t("Aucun {t} connu dans cette sortie", { t: tn })) + '</span>'
        : (counters[o.trait] && o.soften) ? '<span class="sp-tag is-good">' + esc(_t("Utile ici : {t}, en plus de ta règle", { t: tn })) + '</span>'
        // v3.738.0 (Seb 07/11) : l'objet reste « Utile ici » ; la règle qui le contre aussi est dite, sans dissuader
        : counters[o.trait] ? '<span class="sp-tag is-good">' + esc(_t("Utile ici : {t}", { t: tn })) + '</span> <span class="sp-tag is-note">' + esc(_t("Ta règle le contre aussi")) + '</span>'
        : '<span class="sp-tag is-good">' + esc(_t("Utile ici : {t}", { t: tn })) + '</span>';
      h += '<button type="button" class="sp-item" onclick="sortiePrepItem(' + slot + ', \'' + oid + '\')"><img src="' + esc(o.icon) + '" alt="">'
        + '<span><b>' + esc(_td(o.name)) + '</b>' + esc(_td(o.desc)) + tag + '</span><i>×' + CombatItems.getStock(oid) + '</i></button>';
    });
    if (!owned.length) h += '<div class="cp-behavior-hint">' + _t("Aucun objet en stock : prépare-les à l'Apothicaire (Boutique, Potions).") + '</div>';
    h += '</div>';
  }
  h += '<div class="cp-behavior-hint">' + _t("La Fiole noire revient si elle n'a pas servi.") + '</div>'; // v3.776.0
  return h + '</div>';
}

/* v3.449.0 (décision Seb, option A) : « COMME LA DERNIÈRE FOIS ». Le dernier départ avec des potions à
   bonus ou des objets est gardé (game.lastSortiePrep) ; un toucher les recoche, s'ils sont en stock. */
function sortiePrepLast() {
  var l = game.lastSortiePrep;
  return (l && typeof l === "object" && ((l.buffs || []).length || (l.items || []).length)) ? l : null;
}
function sortiePrepLastName(id) {
  var d = (window.COMBAT_ITEMS && COMBAT_ITEMS[id]) || (typeof POTIONS_DB !== "undefined" ? POTIONS_DB.filter(function (p) { return p.id === id; })[0] : null);
  return d ? _td(d.name) : id;
}
function buildSortiePrepAgainHTML() {
  var l = sortiePrepLast();
  if (!l) return "";
  var noms = (l.buffs || []).concat(l.items || []).map(sortiePrepLastName);
  var h = '<div class="sp-again"><button type="button" class="kbtn is-sec" onclick="sortiePrepAgain()">'
    + '<img class="ico-inline" src="images/Icons/system/auto_repeat.webp" alt=""> ' + _t("Comme la dernière fois") + '</button>'
    + '<small>' + esc(noms.join(", ")) + '</small>';
  if (sortiePrep.againMissing && sortiePrep.againMissing.length) {
    h += '<div class="cp-behavior-hint">' + esc(_t("Plus en stock : {x}", { x: sortiePrep.againMissing.map(sortiePrepLastName).join(", ") })) + '</div>';
  }
  return h + '</div>';
}
function sortiePrepAgain() {
  var l = sortiePrepLast();
  if (!sortiePrep || !l) return;
  var manque = [], banned = !!(window.AfflictionManager && typeof AfflictionManager.arePotionsForbidden === "function" && AfflictionManager.arePotionsForbidden());
  (l.buffs || []).forEach(function (id) {
    if (window.PotionManager && PotionManager.isArmed(id)) return;   // déjà bue pour cette sortie
    if (!banned && window.PotionManager && PotionManager.getStock(id) > 0) sortiePrep.buffs[id] = true;
    else manque.push(id);
  });
  var places = window.CombatItems ? CombatItems.slotCount() : 1, items = [];
  (l.items || []).forEach(function (id) {
    if (items.length < places && items.indexOf(id) === -1 && window.CombatItems && CombatItems.getStock(id) > 0) items.push(id);
    else manque.push(id);
  });
  sortiePrep.items = items;
  sortiePrep.pick = -1;
  sortiePrep.againMissing = manque;
  renderSortiePrep();
}

/* Potions : le soin se lit (bu en combat), les potions à bonus se boivent au départ. */
function buildSortiePrepPotionsHTML() {
  if (!window.PotionManager) return "";
  var h = '<div class="sp-sec"><div class="sp-title">' + _t("Potions") + '</div>';
  var cap = (typeof getSortiePotionCap === "function") ? getSortiePotionCap() : 2;
  h += '<div class="cp-behavior-row"><span>' + _tn(cap, "Soin : {n} par sortie, bue en combat", "Soin : {n} par sortie, bues en combat") + '</span></div><div class="sp-heal">';
  (typeof HEALING_POTIONS_DB !== "undefined" ? HEALING_POTIONS_DB : []).forEach(function (p) {
    h += '<div class="sp-pot"><img src="' + esc(p.icon) + '" alt=""><span><b>×' + PotionManager.getHealingStock(p.id) + '</b>'
      + esc(_td(p.name)) + ' · ' + Math.round(p.healPercent * 100) + ' %</span></div>';
  });
  h += '</div>';
  var buffs = sortiePrepBuffList();
  if (buffs.length) {
    var banned = !!(window.AfflictionManager && typeof AfflictionManager.arePotionsForbidden === "function" && AfflictionManager.arePotionsForbidden());
    h += '<div class="cp-behavior-row"><span>' + _t("À boire avant de partir · 1 de chaque") + '</span></div><div class="sp-buffs">';
    buffs.forEach(function (p) {
      var armed = PotionManager.isArmed(p.id), on = armed || !!sortiePrep.buffs[p.id];
      h += '<button type="button" class="sp-buff' + (on ? ' is-on' : '') + '"' + (armed || banned ? ' disabled' : '')
        + ' onclick="sortiePrepBuff(\'' + p.id + '\')"><img src="' + esc(p.icon) + '" alt="">'
        + '<span><b>' + esc(_td(p.name)) + '</b>' + esc(_td(p.desc)) + '</span><i>' + (on ? '✓' : '×' + PotionManager.getStock(p.id)) + '</i></button>';
    });
    h += '</div>';
    if (banned) h += '<div class="cp-behavior-hint">' + _t("🚫 Potions interdites (Ascétisme actif)") + '</div>';
  }
  return h + '</div>';
}

/* ---------- Actions ---------- */
function sortiePrepFold() { if (sortiePrep) sortiePrep.tuneOpen = !sortiePrep.tuneOpen; renderSortiePrep(); }
/* v3.458.4 (audit C14) : ce que contiennent les réglages repliés, en une ligne. */
function sortiePrepTuneSummary(grim) {
  var parts = [];
  if (grim) {
    var pr = typeof ensureGrimoireJeux === "function" ? ensureGrimoireJeux() : null; // v3.736.0 : le jeu actif
    if (pr) parts.push(_td(pr.name));
  }
  var items = (sortiePrep.items || []).filter(Boolean).length;
  parts.push(_tn(items, "{n} objet", "{n} objets"));
  var cap = (typeof getSortiePotionCap === "function") ? getSortiePotionCap() : 2;
  parts.push(_tn(cap, "{n} potion de soin par sortie", "{n} potions de soin par sortie"));
  var buffs = sortiePrepBuffList().length;
  if (buffs) parts.push(_tn(buffs, "{n} potion à boire", "{n} potions à boire"));
  return parts.join(" · ");
}
function sortiePrepMode(mode) { if (window.CombatEngine) CombatEngine.setCombatMode(mode); renderSortiePrep(); }
function sortiePrepPreset(id) { if (id) sortiePrepJeu(id); } // v3.736.0 : ancien nom, le jeu se prend d'un toucher
function sortiePrepTarget(id) { if (window.RiseSystem) RiseSystem.setPolicy(id); renderSortiePrep(); }
function sortiePrepVarier(on) { game.grimoireVarier = !!on; if (typeof saveGame === "function") saveGame(); renderSortiePrep(); } // v3.653.0
function sortiePrepPotAuto(id) { if (window.PotionAutoManager) PotionAutoManager.set("threshold", id); renderSortiePrep(); }
function sortiePrepKeepBoss(on) { if (window.PotionAutoManager) PotionAutoManager.set("keepForBoss", !!on); renderSortiePrep(); }
function sortiePrepMate(id, present) { if (window.CompanionManager) CompanionManager.setPresent(id, present); renderSortiePrep(); }
function sortiePrepSetting(id, key, value) { if (window.CompanionManager) CompanionManager.setSetting(id, key, value); renderSortiePrep(); }
function sortiePrepHeal(v) { sortiePrepSetting("wenna", "healThreshold", v); }
function sortiePrepPrio(v) { sortiePrepSetting("wenna", "healPriority", v); }
function sortiePrepBuff(id) { if (sortiePrep) sortiePrep.buffs[id] = !sortiePrep.buffs[id]; renderSortiePrep(); }
function sortiePrepPick(slot) { if (sortiePrep) sortiePrep.pick = (sortiePrep.pick === slot) ? -1 : slot; renderSortiePrep(); }
function sortiePrepItem(slot, id) {
  if (!sortiePrep) return;
  sortiePrep.items[slot] = id || null;
  sortiePrep.items = sortiePrep.items.slice(0, window.CombatItems ? CombatItems.slotCount() : 1);
  sortiePrep.pick = -1;
  renderSortiePrep();
}

function confirmSortiePrep() {
  if (!sortiePrep) return;
  var s = sortiePrep;
  closeSortiePrep();
  // v3.449.0 : on retient ce départ s'il emportait des potions à bonus ou des objets
  var buffsPris = Object.keys(s.buffs).filter(function (id) { return s.buffs[id] && !PotionManager.isArmed(id); });
  var objetsPris = s.items.filter(Boolean);
  if (buffsPris.length || objetsPris.length) game.lastSortiePrep = { buffs: buffsPris, items: objetsPris };
  Object.keys(s.buffs).forEach(function (id) { if (s.buffs[id] && !PotionManager.isArmed(id)) PotionManager.usePotion(id); });
  s.opts.onGo(s); // v3.657.0 : la feuille passe ses choix (niveau de l'élite)
  if (window.CombatItems) CombatItems.takeForSortie(s.items.filter(Boolean));   // v3.441.0 : une fois la sortie ouverte
}

window.openSortiePrep = openSortiePrep;
window.closeSortiePrep = closeSortiePrep;
window.confirmSortiePrep = confirmSortiePrep;
window.sortiePrepEat = sortiePrepEat;
window.sortiePrepRest = sortiePrepRest;
window.sortiePrepHasChoice = sortiePrepHasChoice;
window.sortiePrepMode = sortiePrepMode;
window.sortiePrepPreset = sortiePrepPreset;
window.sortiePrepTarget = sortiePrepTarget;
window.sortiePrepVarier = sortiePrepVarier;
window.sortiePrepPotAuto = sortiePrepPotAuto;
window.sortiePrepKeepBoss = sortiePrepKeepBoss;
window.sortiePrepMate = sortiePrepMate;
window.sortiePrepSetting = sortiePrepSetting;
window.sortiePrepHeal = sortiePrepHeal;
window.sortiePrepPrio = sortiePrepPrio;
window.sortiePrepBuff = sortiePrepBuff;
window.sortiePrepPick = sortiePrepPick;
window.sortiePrepItem = sortiePrepItem;
window.sortiePrepAgain = sortiePrepAgain;
window.sortiePrepEditRules = sortiePrepEditRules;
window.sortiePrepAdd = sortiePrepAdd;
window.sortiePrepReplace = sortiePrepReplace;
window.sortiePrepAll = sortiePrepAll;
window.sortiePrepTake = sortiePrepTake;
window.sortiePrepUndo = sortiePrepUndo;
window.sortiePrepCloseMsg = sortiePrepCloseMsg;
window.sortiePrepJeu = sortiePrepJeu;
