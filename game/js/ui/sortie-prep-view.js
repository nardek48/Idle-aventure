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

  /* Mode, figé jusqu'au retour au Campement */
  if (grimOpen) {
    h += '<div class="sp-sec"><div class="sp-title">' + _t("Mode de combat") + '</div>';
    h += '<div class="sp-mode">';
    h += '<button type="button" class="' + (!grim ? 'is-on' : '') + '" onclick="sortiePrepMode(\'tactique\')"><img src="images/Icons/combat_stats/stat_critical.png" alt="">' + _t("Tactique") + '</button>';
    h += '<button type="button" class="' + (grim ? 'is-on' : '') + '" onclick="sortiePrepMode(\'grimoire\')"><img src="images/Icons/codex/codex_lore.png" alt="">' + _t("Grimoire") + '</button>';
    h += '</div>';
    h += '<div class="cp-behavior-hint">' + (grim
      ? _t("Les rounds s'enchaînent seuls et tes règles choisissent l'action.")
      : _t("Chaque round attend ton choix — tes règles se contentent de surligner l'action conseillée.")) + '</div>';
    h += '<div class="sp-lock"><img class="ico-inline" src="images/Icons/system/lock_closed.png" alt=""> ' + _t("Figé jusqu'au retour au Campement.") + '</div>';

    var presets = (typeof ensureGrimoirePresets === "function") ? ensureGrimoirePresets() : [];
    if (presets.length) {
      h += '<div class="cp-behavior-row"><span>' + _t("Règles") + '</span></div><div class="sp-presets">';
      h += '<button type="button" class="' + (!sortiePrep.preset ? 'is-on' : '') + '" onclick="sortiePrepPreset(\'\')"><img src="images/Icons/codex/codex_lore.png" alt="">' + _t("Mes règles actuelles") + '</button>';
      presets.forEach(function (p) {
        h += '<button type="button" class="' + (sortiePrep.preset === p.id ? 'is-on' : '') + '" onclick="sortiePrepPreset(\'' + esc(p.id) + '\')"><img src="' + esc(p.icon || "images/Icons/codex/codex_lore.png") + '" alt="">' + esc(_td(p.name)) + '</button>';
      });
      h += '</div>';
    }
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
    h += '</div>';
  }

  h += buildSortiePrepTeamHTML(grim);
  h += buildSortiePrepItemsHTML(grim);
  h += buildSortiePrepPotionsHTML();

  h += '</div>';
  h += '<div class="ksheet-foot sp-foot">';
  h += '<button type="button" class="kbtn" onclick="closeSortiePrep()">' + _t("Renoncer") + '</button>';
  h += '<button type="button" class="kbtn primary" onclick="confirmSortiePrep()">' + _t("Partir") + '</button>';
  h += '</div></div>';
  return h;
}

/* Équipe : deux compagnons au plus ; Wenna règle ses soins, la voie de Maddoc se lit (elle se paie à sa fiche). */
function buildSortiePrepTeamHTML(grim) {
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
  h += '<div class="cp-behavior-hint">' + (grim ? _t("En Grimoire, ils jouent seuls après toi à chaque round.") : _t("En Tactique, tu choisis aussi leur action à chaque round.")) + '</div>';
  return h + '</div>';
}

/* v3.441.0 — OBJETS DE COMBAT : les traits connus de la sortie et ce qui y répond (règle, objet, rien),
   puis les places. Un objet tient un trait tout seul ; il est retiré de l'Entrepôt au départ. */
function sortiePrepTraitName(trait) {
  var def = (typeof ENEMY_TRAIT_DEFS !== "undefined") ? ENEMY_TRAIT_DEFS[trait] : null;
  var st = def ? (window.COMBAT_STATES || {})[def.state] : null;
  return st && st.nom ? _td(st.nom) : trait;
}

function buildSortiePrepItemsHTML(grim) {
  if (!window.CombatItems || !window.ApothecaryManager) return "";
  var owned = CombatItems.ownedIds();
  var learned = COMBAT_ITEM_ORDER.some(function (id) { return ApothecaryManager.isLearned(id); });
  if (!owned.length && !learned) return "";
  var slots = CombatItems.slotCount(), chosen = sortiePrep.items;
  var h = '<div class="sp-sec"><div class="sp-title">' + _t("Objets") + '<small>' + chosen.filter(Boolean).length + ' / ' + slots + '</small></div>';

  // Ce que tu vas affronter : la réponse à chaque trait connu
  var prev = (sortiePrep.opts.ctx && typeof getEnemyTraitsPreview === "function") ? getEnemyTraitsPreview(sortiePrep.opts.ctx) : { traits: [], unmet: 0 };
  var kit = (typeof getGrimoireCurrentKit === "function") ? getGrimoireCurrentKit() : null;
  var counters = {};
  if (prev.traits.length) {
    h += '<div class="cp-behavior-title">' + _t("Ce que tu vas affronter") + '</div>';
    prev.traits.forEach(function (t) {
      var def = ENEMY_TRAIT_DEFS[t.trait], st = (window.COMBAT_STATES || {})[def.state] || {};
      var item = chosen.filter(function (id) { return id && COMBAT_ITEMS[id].trait === t.trait; })[0];
      var r = grim ? etRuleResponse(def.cond, game.grimoireRules || [], kit) : { status: "none" };
      if (r.status === "counter") counters[t.trait] = true;
      var cls = item ? "is-item" : (r.status === "counter" ? "is-rule" : (grim ? "is-none" : "is-free"));
      var resp = item ? _t("{o} le tient.", { o: _td(COMBAT_ITEMS[item].name) })
        : r.status === "counter" ? _t("Ta règle « {r} » le contre.", { r: etRuleLabel(r.rule, kit) })
        : r.status === "react" ? _t("Ta règle « {r} » réagit, sans le contrer.", { r: etRuleLabel(r.rule, kit) })
        : grim ? _t("Aucune règle ni objet ne répond.") : _t("À toi de le contrer en combat.");
      h += '<div class="sp-trait ' + cls + '"><img src="' + esc(st.icon || "") + '" alt=""><span><b>' + esc(_td(st.nom || t.trait)) + '</b> · '
        + esc(t.names.map(function (n) { return _td(n); }).join(", ")) + '<em>' + esc(resp) + '</em></span></div>';
    });
  }
  if (prev.unmet) h += '<div class="cp-behavior-hint">' + esc(_tn(prev.unmet, "{n} créature jamais vaincue : ses traits se révéleront au premier combat.", "{n} créatures jamais vaincues : leurs traits se révéleront au premier combat.")) + '</div>';

  // Les places
  var known = {};
  prev.traits.forEach(function (t) { known[t.trait] = true; });
  h += '<div class="sp-slots">';
  for (var i = 0; i < 2; i++) {
    if (i >= slots) {
      h += '<div class="sp-slot is-locked"><img src="images/Icons/system/lock_closed.png" alt="">' + _t("2e place")
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
