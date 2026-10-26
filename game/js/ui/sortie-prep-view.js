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

/* opts : { title, sub, icon, ctx, onGo }. onGo lance la sortie une fois la feuille validée ;
   ctx (comme « Ce que tu vas affronter » : { type, id }) sert à dire quels objets servent ici. */
function openSortiePrep(opts) {
  opts = opts || {};
  if (typeof opts.onGo !== "function") return;
  if (!sortiePrepHasChoice()) return opts.onGo();
  if (!sortiePrepGrimoireOpen() && game.combatMode === "grimoire" && window.CombatEngine) CombatEngine.setCombatMode("tactique");
  sortiePrep = { opts: opts, preset: null, buffs: {}, items: [], pick: -1 };
  renderSortiePrep();
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

  h += buildSortiePrepTraitsHTML(grim);   // v3.446.1 : la menace d'abord (décision Seb), la préparation ensuite

  /* Mode, figé jusqu'au retour au Campement */
  if (grimOpen) {
    h += '<div class="sp-sec"><div class="sp-title">' + _t("Mode de combat") + '</div>';
    h += '<div class="sp-mode">';
    h += '<button type="button" class="' + (!grim ? 'is-on' : '') + '" onclick="sortiePrepMode(\'tactique\')"><img src="images/Icons/combat_stats/stat_critical.webp" alt="">' + _t("Tactique") + '</button>';
    h += '<button type="button" class="' + (grim ? 'is-on' : '') + '" onclick="sortiePrepMode(\'grimoire\')"><img src="images/Icons/codex/codex_lore.webp" alt="">' + _t("Grimoire") + '</button>';
    h += '</div>';
    h += '<div class="cp-behavior-hint">' + (grim
      ? _t("Les rounds s'enchaînent seuls et tes règles choisissent l'action.")
      : _t("Chaque round attend ton choix — tes règles se contentent de surligner l'action conseillée.")) + '</div>';
    h += '<div class="sp-lock"><img class="ico-inline" src="images/Icons/system/lock_closed.webp" alt=""> ' + _t("Figé jusqu'au retour au Campement.") + '</div>';
    h += '</div>';
    // v3.458.4 (audit C14) : règles, cible et potions automatiques rejoignent les réglages repliés
    var main = h; h = '';

    var presets = (typeof ensureGrimoirePresets === "function") ? ensureGrimoirePresets() : [];
    if (presets.length) {
      h += '<div class="cp-behavior-row"><span>' + _t("Règles") + '</span></div><div class="sp-presets">';
      h += '<button type="button" class="' + (!sortiePrep.preset ? 'is-on' : '') + '" onclick="sortiePrepPreset(\'\')"><img src="images/Icons/codex/codex_lore.webp" alt="">' + _t("Mes règles actuelles") + '</button>';
      presets.forEach(function (p) {
        h += '<button type="button" class="' + (sortiePrep.preset === p.id ? 'is-on' : '') + '" onclick="sortiePrepPreset(\'' + esc(p.id) + '\')"><img src="' + esc(p.icon || "images/Icons/codex/codex_lore.webp") + '" alt="">' + esc(_td(p.name)) + '</button>';
      });
      h += '</div>';
    }
    h += buildSortiePrepRulesHTML();
    if (grim) {
      if (window.RiseSystem) {
        var pol = RiseSystem.getPolicy();
        h += '<div class="cp-behavior-row"><span>' + _t("Cible") + '</span>' + sortiePrepSegHTML(GRIMOIRE_TARGET_POLICIES, pol, "sortiePrepTarget") + '</div>';
        h += '<div class="cp-behavior-hint">' + esc(_td(RiseSystem.getPolicyDef(pol).desc)) + '</div>';
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
  h += '<div class="ksheet-foot sp-foot">';
  h += '<button type="button" class="kbtn" onclick="closeSortiePrep()">' + _t("Renoncer") + '</button>';
  h += '<button type="button" class="kbtn primary" onclick="confirmSortiePrep()">' + _t("Partir") + '</button>';
  h += '</div></div>';
  return h;
}

/* v3.445.0 : les règles avec lesquelles on part (celles du preset choisi, sinon les actuelles), en lecture ;
   « Modifier » ouvre l'onglet Grimoire, qui garde le chemin du retour vers cette feuille. */
function sortiePrepRules() {
  var id = sortiePrep && sortiePrep.preset;
  var p = id ? ensureGrimoirePresets().filter(function (x) { return x.id === id; })[0] : null;
  var rules = p ? p.rules : (game.grimoireRules || []);
  return (typeof sanitizeGrimoireRules === "function") ? sanitizeGrimoireRules(rules, getGrimoireCurrentKit()) : rules;
}

function buildSortiePrepRulesHTML() {
  if (typeof getGrimoireCurrentKit !== "function") return "";
  var kit = getGrimoireCurrentKit(), rules = sortiePrepRules();
  var open = (typeof getGrimoireSlotCount === "function") ? getGrimoireSlotCount(game.worldsEverReached) : rules.length;
  var h = '<div class="sp-rules">', n = 0;
  rules.slice(0, open).forEach(function (r, i) {
    var cond = getGrimoireCondition(r.conditionId), act = (kit && kit.actions && r.actionSlot) ? kit.actions[r.actionSlot] : null;
    if (!cond || !act) return;
    n++;
    h += '<div class="sp-rule"><i>' + (i + 1) + '</i>' + renderIconOrEmojiHTML(cond.icon, "", "")
      + '<span>' + esc(_t("Si {x}", { x: getGrimoireConditionShortLabel(r.conditionId) })) + ' <b>→</b> ' + esc(_td(act.label)) + '</span>'
      + (isGrimoireRuleCounter(r, kit) ? '<em>' + _t("Contre") + '</em>' : '') + '</div>';
  });
  if (!n) h += '<div class="cp-behavior-hint">' + _t("Aucune règle : le Grimoire attaque à chaque round.") + '</div>';
  else if (open - n > 0) h += '<div class="cp-behavior-hint">' + esc(_tn(open - n, "{n} emplacement libre.", "{n} emplacements libres.")) + '</div>';
  h += '<button type="button" class="kbtn sp-rules-edit" onclick="sortiePrepEditRules()"><img class="ico-inline" src="images/Icons/codex/codex_lore.webp" alt=""> '
    + (sortiePrep.preset ? _t("Modifier ces règles") : _t("Modifier mes règles")) + '</button>';
  if (sortiePrep.preset) h += '<div class="cp-behavior-hint">' + _t("Le preset devient tes règles actuelles, puis s'ouvre dans le Grimoire.") + '</div>';
  return h + '</div>';
}

/* Va au Grimoire en gardant la feuille (choix compris) ; « Revenir à la préparation » la rouvre telle quelle. */
function sortiePrepEditRules() {
  if (!sortiePrep) return;
  var saved = sortiePrep, fromTab = game.activeTab;
  if (saved.preset && typeof loadGrimoirePreset === "function") loadGrimoirePreset(saved.preset);
  saved.preset = null;
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

function sortiePrepTraitsPreview() {
  return (sortiePrep.opts.ctx && typeof getEnemyTraitsPreview === "function") ? getEnemyTraitsPreview(sortiePrep.opts.ctx) : { traits: [], unmet: 0 };
}

/* v3.446.0 : « Ce que tu vas affronter », section à part en tête de feuille (seul endroit depuis le retrait de
   l'encart des écrans de lancement) : la réponse à chaque trait connu, par l'objet emporté ou la règle du départ. */
function buildSortiePrepTraitsHTML(grim) {
  var prev = sortiePrepTraitsPreview();
  if (!prev.traits.length) return "";
  var kit = (typeof getGrimoireCurrentKit === "function") ? getGrimoireCurrentKit() : null, chosen = sortiePrep.items;
  var h = '<div class="sp-sec"><div class="sp-title">' + _t("Ce que tu vas affronter") + '</div>';
  prev.traits.forEach(function (t) {
    var def = ENEMY_TRAIT_DEFS[t.trait], st = enemyTraitLook(t.trait); // v3.492.14 : nom et icône, état de combat ou propres
    var item = chosen.filter(function (id) { return id && COMBAT_ITEMS[id] && COMBAT_ITEMS[id].trait === t.trait; })[0];
    var r = grim && def.cond ? etRuleResponse(def.cond, sortiePrepRules(), kit) : { status: "none" };
    var sansRegle = !def.cond && !item; // aucune règle du Grimoire ne vise cette mécanique
    var cls = item ? "is-item" : (r.status === "counter" ? "is-rule" : (grim && !sansRegle ? "is-none" : "is-free"));
    var resp = item ? (COMBAT_ITEMS[item].soften ? _t("{o} l'atténue.", { o: _td(COMBAT_ITEMS[item].name) }) : _t("{o} le tient.", { o: _td(COMBAT_ITEMS[item].name) }))
      : r.status === "counter" ? _t("Ta règle « {r} » le contre.", { r: etRuleLabel(r.rule, kit) })
      : r.status === "react" ? _t("Ta règle « {r} » réagit, sans le contrer.", { r: etRuleLabel(r.rule, kit) })
      : sansRegle ? _t("Ni règle ni objet n'y répond : à toi de le gérer en combat.")
      : grim ? _t("Aucune règle ni objet ne répond.") : _t("À toi de le contrer en combat.");
    h += '<div class="sp-trait ' + cls + '"><img src="' + esc(st.icon || "") + '" alt=""><span><b>' + esc(_td(st.nom)) + '</b> · '
      + esc(t.names.map(function (n) { return _td(n); }).join(", ")) + '<em>' + esc(resp) + '</em></span>'
      + (cls === "is-none" ? '<button type="button" class="sp-trait-fix" onclick="sortiePrepEditRules()">' + _t("Règle") + ' ›</button>' : '') + '</div>';
  });
  if (prev.unmet) h += '<div class="cp-behavior-hint">' + esc(_tn(prev.unmet, "{n} créature jamais vaincue : ses traits se révéleront au premier combat.", "{n} créatures jamais vaincues : leurs traits se révéleront au premier combat.")) + '</div>';
  return h + '</div>';
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
  for (var i = 0; i < 2; i++) {
    if (i >= slots) {
      h += '<div class="sp-slot is-locked"><img src="images/Icons/system/lock_closed.webp" alt="">' + _t("2e place")
        + '<small>' + _t("Apothicaire niveau {n}", { n: COMBAT_ITEM_SECOND_SLOT_APOTHECARY_LEVEL }) + '</small></div>';
      continue;
    }
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
        : counters[o.trait] ? '<span class="sp-tag is-meh">' + esc(_t("Déjà contré par ta règle")) + '</span>'
        : '<span class="sp-tag is-good">' + esc(_t("Utile ici : {t}", { t: tn })) + '</span>';
      h += '<button type="button" class="sp-item" onclick="sortiePrepItem(' + slot + ', \'' + oid + '\')"><img src="' + esc(o.icon) + '" alt="">'
        + '<span><b>' + esc(_td(o.name)) + '</b>' + esc(_td(o.desc)) + tag + '</span><i>×' + CombatItems.getStock(oid) + '</i></button>';
    });
    if (!owned.length) h += '<div class="cp-behavior-hint">' + _t("Aucun objet en stock : prépare-les à l'Apothicaire (Boutique, Potions).") + '</div>';
    h += '</div>';
  }
  h += '<div class="cp-behavior-hint">' + _t("Un objet agit seul, en Tactique comme en Grimoire. Il est consommé au retour, qu'il ait servi ou non.")
    + (COMBAT_ITEMS.fiole_noire && owned.indexOf("fiole_noire") !== -1 ? ' ' + _t("La Fiole noire revient si elle n'a pas servi.") : '') + '</div>';
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
    var pr = sortiePrep.preset && typeof ensureGrimoirePresets === "function" ? ensureGrimoirePresets().filter(function (p) { return p.id === sortiePrep.preset; })[0] : null;
    parts.push(pr ? _td(pr.name) : _t("Mes règles actuelles"));
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
function sortiePrepPreset(id) { if (sortiePrep) sortiePrep.preset = id || null; renderSortiePrep(); }
function sortiePrepTarget(id) { if (window.RiseSystem) RiseSystem.setPolicy(id); renderSortiePrep(); }
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
  if (s.preset && typeof loadGrimoirePreset === "function") loadGrimoirePreset(s.preset);
  // v3.449.0 : on retient ce départ s'il emportait des potions à bonus ou des objets
  var buffsPris = Object.keys(s.buffs).filter(function (id) { return s.buffs[id] && !PotionManager.isArmed(id); });
  var objetsPris = s.items.filter(Boolean);
  if (buffsPris.length || objetsPris.length) game.lastSortiePrep = { buffs: buffsPris, items: objetsPris };
  Object.keys(s.buffs).forEach(function (id) { if (s.buffs[id] && !PotionManager.isArmed(id)) PotionManager.usePotion(id); });
  s.opts.onGo();
  if (window.CombatItems) CombatItems.takeForSortie(s.items.filter(Boolean));   // v3.441.0 : une fois la sortie ouverte
}

window.openSortiePrep = openSortiePrep;
window.closeSortiePrep = closeSortiePrep;
window.confirmSortiePrep = confirmSortiePrep;
window.sortiePrepHasChoice = sortiePrepHasChoice;
window.sortiePrepMode = sortiePrepMode;
window.sortiePrepPreset = sortiePrepPreset;
window.sortiePrepTarget = sortiePrepTarget;
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
