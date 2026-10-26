"use strict";
/* ui/companions-view.js — v3.268.0 (lot L-2) : sous-onglet Héros › Compagnons.
   Doc : Aethervale_Conception_Combat_Groupe_v1_0.docx §4.6.

   Une carte par compagnon rejoint : portrait, rôle, PV, stats du monde COURANT,
   compétence signature, interrupteur Auto/Manuel, bouton Présent/Au camp, et la
   ligne d'améliorations avec son coût. Aucune logique ici — tout passe par
   CompanionManager. */

function buildCompanionCardHTML(companionId) {
  var def = getCompanionDef(companionId);
  var st = CompanionManager.state(companionId);
  if (!def || !st) return "";

  var stats = CompanionManager.statsOf(companionId);
  var hp = CompanionManager.hpOf(companionId);
  var maxHp = stats.maxHp;
  var pct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
  var ko = hp <= 0;

  var h = '<div class="cp-card' + (ko ? ' is-ko' : '') + '">';

  h += '<div class="cp-head">';
  h += '<div class="cp-portrait"><img src="' + esc(def.image) + '" alt="' + esc(_td(def.name)) + '"></div>';
  h += '<div class="cp-ident">';
  h += '<div class="cp-name">' + esc(_td(def.name)) + '</div>';
  h += '<div class="cp-role">' + esc(COMPANION_ROLE_LABELS[def.role] ? _td(COMPANION_ROLE_LABELS[def.role]) : def.role) + '</div>';
  h += '</div>';
  h += '</div>';

  h += '<div class="kgauge kgauge-dragon-claw cp-hp">';
  h += '<div class="kgauge-track"><div class="kgauge-fill" style="width:' + pct.toFixed(1) + '%"></div></div>';
  h += '<div class="kgauge-text">' + formatNumber(Math.ceil(hp)) + ' / ' + formatNumber(maxHp) + '</div>';
  h += '</div>';
  if (ko) h += '<div class="cp-ko-note">' + _t("Hors de combat — revient affaibli au prochain combat.") + '</div>';

  h += '<div class="cp-stats">';
  h += '<span>' + _t("Dégâts") + ' <b>' + formatNumber(stats.damage) + '</b></span>';
  h += '<span>' + _t("PV", "unité") + ' <b>' + formatNumber(maxHp) + '</b></span>';
  h += '</div>';

  h += '<div class="cp-skill">';
  h += '<img class="cp-skill-ico" src="' + esc(def.skill.icon) + '" alt="">';
  h += '<div><b>' + esc(_td(def.skill.name)) + '</b><div class="cp-skill-desc">' + esc(companionSkillDescRanked(companionId, def))
    + ' ' + esc(_t("Recharge : {n} rounds.", { n: def.skill.cooldown })) + '</div>' + buildCompanionSkillRankHTML(companionId) + '</div>';
  h += '</div>';

  /* v3.334.0 (P2) : en patrouille, on le dit. v3.440.0 : « Avec toi / Au camp » se choisit à la
     préparation de sortie (ui/sortie-prep-view.js) ; la fiche le rappelle. */
  if (window.PatrolManager && PatrolManager.isOnPatrol(companionId)) {
    h += '<div class="cp-patrol-note">' + (st.present ? _t("En patrouille — repartira avec toi à son retour.") : _t("En patrouille — restera au camp à son retour.")) + '</div>';
  }

  // v3.334.0 (Évolutions, P9) : patrouille — départ, retour, rappel
  if (typeof buildCompanionPatrolHTML === "function") h += buildCompanionPatrolHTML(companionId);

  /* v3.276.0 (décision Seb) : l'interrupteur Auto/Manuel est retiré — c'est le mode de
     combat qui décide, pour tout le monde. On le RAPPELLE ici plutôt que de laisser un
     réglage muet : le joueur doit savoir où se règle ce qu'il cherche. */
  h += '<div class="cp-controlnote">'
    + _t("Il joue seul en mode <b>Grimoire</b>, tu le joues en mode <b>Tactique</b>. Qui part avec toi, le mode et son comportement se choisissent au départ de chaque sortie.")
    + '</div>';

  /* v3.311.0 : voie (Maddoc) — la voie courante, l'autre, et le prix du changement (D4b). */
  if (CompanionManager.hasVoies(companionId)) h += buildCompanionVoieHTML(companionId, st);

  /* v3.271.0 (L-5) puis v3.440.0 : le comportement de soin se règle à la préparation de sortie. */

  h += buildCompanionTrainingHTML(companionId, st, stats);
  if (window.CompanionRelics) h += buildCompanionRelicsHTML(companionId); // H4 reliques (atelier reliques-compagnons.html, variante A)

  h += '</div>';
  return h;
}

/* H4 reliques : icône (carré générique tant que l'image manque) et pastille du monde d'origine, sans aura d'affinité. */
function companionRelicIconHTML(relic, cls) {
  var w = window.WORLDS ? WORLDS[relic.w] : null;
  return '<span class="' + cls + '"><img class="cp-relic-img" src="' + esc(CompanionRelics.icon(relic)) + '" alt="">'
    + (w ? '<span class="wpip" title="' + esc(_td(w.name)) + '"><img class="wpip-img" src="images/Icons/codex/world_' + esc(w.id) + '.webp" alt=""></span>' : '') + '</span>';
}

function buildCompanionRelicsHTML(companionId) {
  var CR = CompanionRelics, open = CR.slotsOpen(companionId), worn = CR.worn(companionId), n = 0;
  var cells = "";
  for (var k = 0; k < 3; k++) {
    if (k >= open) { cells += '<div class="cp-relic-slot is-lock"><span class="cp-relic-plus"><img class="cp-relic-lock" src="images/Icons/system/lock_closed.webp" alt=""></span><b>' + esc(_t("Palier {n}", { n: COMPANION_RELIC_SLOTS_AT[k] })) + '</b></div>'; continue; } // « Palier 25 » seul : le bloc Entraînement est juste au-dessus
    var r = worn[k] != null ? CR.byId(worn[k]) : null;
    if (!r) { cells += '<button type="button" class="cp-relic-slot is-empty" onclick="companionPickRelic(\'' + companionId + '\', ' + k + ')"><span class="cp-relic-plus">+</span><b>' + esc(_t("Équiper")) + '</b></button>'; continue; }
    n++;
    cells += '<button type="button" class="cp-relic-slot" onclick="companionPickRelic(\'' + companionId + '\', ' + k + ')">' + companionRelicIconHTML(r, "cp-relic-ico")
      + '<b>' + esc(CR.name(r)) + '</b><small>' + esc(CR.effectText(r)) + '</small></button>';
  }
  return '<div class="cp-relics"><div class="cp-relics-h"><span>' + _t("Reliques") + ' <b>' + n + ' / ' + open + '</b></span><small>'
    + esc(_t("une par famille · rapportées de patrouille")) + '</small></div><div class="cp-relic-slots">' + cells + '</div></div>';
}

/* Feuille « Choisir une relique » (variante A) : l'inventaire, relique par relique. */
var companionRelicPick = null; // { id, slot }
function companionPickRelic(companionId, slot) {
  companionRelicPick = { id: companionId, slot: slot };
  if (typeof openHerosSheet === "function") openHerosSheet("relic");
}
function buildCompanionRelicPickHTML() {
  var p = companionRelicPick, CR = window.CompanionRelics;
  if (!p || !CR) return "";
  var def = getCompanionDef(p.id), worn = CR.worn(p.id), R = CR.ensure();
  var fams = worn.filter(function (x, k) { return x != null && k !== p.slot; }).map(function (x) { var r = CR.byId(x); return r ? r.f : null; });
  var list = R.inv.slice().sort(function (a, b) { return COMPANION_RELIC_ORDER.indexOf(a.f) - COMPANION_RELIC_ORDER.indexOf(b.f) || b.w - a.w; });
  var h = '<div class="hs-sheet"><div class="cp-relic-pick-h"><b>' + esc(_t("Emplacement {n} · {x}", { n: p.slot + 1, x: _td(def.name) })) + '</b>'
    + '<button type="button" class="cp-relic-back" onclick="herosOpenCompanion(\'' + p.id + '\')">‹ ' + esc(_td(def.name)) + '</button></div>';
  if (!list.length) return h + '<div class="pc-empty">' + esc(_t("Aucune relique pour l'instant. Les compagnons en rapportent de patrouille.")) + '</div></div>';
  h += '<div class="cp-relic-list">';
  list.forEach(function (r) {
    var by = CR.wornBy(r.id), here = by === p.id, idx = worn.indexOf(r.id), famPrise = !here && fams.indexOf(r.f) >= 0;
    var sub = here ? _t("Portée ici") : by ? _t("Portée par {x}", { x: _td(getCompanionDef(by).name) }) : _t("Libre");
    var btn = here ? '<button type="button" class="cp-relic-btn is-ghost" onclick="companionUnequipRelic(\'' + p.id + '\', ' + idx + ')">' + esc(_t("Retirer")) + '</button>'
      : famPrise ? '<button type="button" class="cp-relic-btn" disabled>' + esc(_t("Famille prise")) + '</button>'
      : '<button type="button" class="cp-relic-btn" onclick="companionEquipRelic(\'' + p.id + '\', ' + p.slot + ', ' + r.id + ')">' + esc(_t("Équiper")) + '</button>';
    h += '<div class="cp-relic-row">' + companionRelicIconHTML(r, "cp-relic-ico is-small") + '<span class="cp-relic-txt"><b>' + esc(CR.name(r)) + '</b><small class="is-fx">'
      + esc(CR.effectText(r)) + '</small><small>' + esc(sub) + '</small></span>' + btn + '</div>';
  });
  return h + '</div></div>';
}
function companionEquipRelic(companionId, slot, relicId) {
  var r = CompanionRelics.byId(relicId), other = CompanionRelics.wornBy(relicId);
  if (!CompanionRelics.equip(companionId, slot, relicId)) return;
  if (typeof showToast === "function") showToast(other && other !== companionId
    ? _t("{x} équipée (retirée à {y})", { x: CompanionRelics.name(r), y: _td(getCompanionDef(other).name) })
    : _t("{x} équipée", { x: CompanionRelics.name(r) }), 1400);
  companionBackToRelics(companionId);
}
/* Retour à la fiche du compagnon, sur le bloc des reliques. */
function companionBackToRelics(companionId) {
  if (typeof herosOpenCompanion !== "function") return;
  herosOpenCompanion(companionId);
  var b = document.querySelector("#heros-sheet-root .ksheet-body"), el = b && b.querySelector(".cp-relics");
  if (el) b.scrollTop = Math.max(0, el.offsetTop - b.offsetTop - 12);
}
function companionUnequipRelic(companionId, slot) {
  if (CompanionRelics.unequip(companionId, slot)) companionBackToRelics(companionId); // comme après « Équiper »
}
window.companionPickRelic = companionPickRelic;
window.buildCompanionRelicPickHTML = buildCompanionRelicPickHTML;
window.companionEquipRelic = companionEquipRelic;
window.companionUnequipRelic = companionUnequipRelic;

/* H4 partie C : rang de la compétence signature — pastilles, effet au rang, puis le rang suivant (même bloc que les sorts du héros). */
/* Description de la compétence avec la valeur du rang (« 18 % » → « 24 % », « 2,5 fois » → « 3,1 fois »). */
function companionSkillDescRanked(companionId, def) {
  var txt = _td(def.skill.desc), sk = CompanionManager.skillOf(companionId), v0 = def.skill.value;
  if (!sk || typeof v0 !== "number" || sk.value === v0) return txt;
  if (sk.type === "heal" || sk.type === "taunt") return txt.replace(new RegExp(Math.round(v0 * 100) + "(\\s?|\u00a0)%"), Math.round(sk.value * 100) + "$1%");
  var f = function (v, sep) { return (Math.round(v * 10) / 10).toFixed(1).replace(".", sep).replace(sep + "0", ""); };
  return txt.replace(f(v0, ","), f(sk.value, ",")).replace(f(v0, "."), f(sk.value, "."));
}

function companionSkillEffectLines(companionId, a, b) {
  var A = CompanionManager.skillOf(companionId, a), B = CompanionManager.skillOf(companionId, b), out = [];
  var mult = function (v) { var s = (Math.round(v * 10) / 10).toFixed(1); return (window.I18n && I18n.lang && I18n.lang() === "en") ? s : s.replace(".", ","); };
  if (A.value !== B.value) out.push(A.type === "heal" || A.type === "taunt"
    ? _t("Soin {a} % → {b} %", { a: Math.round(A.value * 100), b: Math.round(B.value * 100) })
    : _t("Frappe ×{a} → ×{b}", { a: mult(A.value), b: mult(B.value) }));
  if (Number(A.charges || 0) !== Number(B.charges || 0)) out.push(_t("Par combat : {a} → {b}", { a: A.charges, b: B.charges }));
  if (!A.bonusAsh && B.bonusAsh) out.push(_t("+1 Cendre vive à la 1re taille"));
  return out;
}

function buildCompanionSkillRankHTML(companionId) {
  var CM = CompanionManager, r = CM.skillRank(companionId), max = CM.skillRankMax(), st = CM.skillRankStatus(companionId);
  var h = '<span class="pc-skill-rk"><span class="pc-skill-pips" aria-hidden="true">';
  for (var i = 1; i <= COMPANION_SKILL_RANK_MAX; i++) h += '<i class="' + (i <= r ? "is-on" : (i > max ? "is-lock" : "")) + '"></i>';
  h += '</span>' + esc(_t("Rang {n}/{m}", { n: r, m: COMPANION_SKILL_RANK_MAX })) + '</span>';
  if (st === "max") return h + '<div class="pc-skill-max">★ ' + esc(_t("Rang maximum")) + '</div>';
  if (st === "lock") return h + '<div class="pc-skill-lock">' + esc(_t("Rang {n} : {w}.", { n: r + 1, w: _t("s'ouvre {w}", { w: WorldCaps.withPrep(r) }) })) + '</div>';
  var p = COMPANION_SKILL_RANK_PRICES[r], def = (typeof WAREHOUSE_RESOURCES !== "undefined" && WAREHOUSE_RESOURCES[p.mat]) || {};
  var stock = window.WarehouseManager ? WarehouseManager.getAmount(p.mat) : 0, lines = companionSkillEffectLines(companionId, r, r + 1);
  h += '<div class="pc-skill-next"><span class="pc-skill-next-t">' + esc(_t("Rang {a} → {b}", { a: r, b: r + 1 })) + '</span>';
  h += '<span class="pc-skill-next-v">' + (lines.length ? lines.map(esc).join('<br>') : esc(_t("Prépare le rang suivant"))) + '</span>';
  h += '<span class="pc-skill-cost"><span class="pc-skill-chip' + (Number(game.gold || 0) >= p.gold ? '' : ' is-short') + '"><img src="images/Icons/gold_icon.webp" alt="">' + esc(_t("{n} or", { n: formatNumber(p.gold) })) + '</span>';
  h += '<span class="pc-skill-chip' + (stock >= p.qty ? '' : ' is-short') + '">' + renderIconOrEmojiHTML(def.icon || "", "pc-skill-chip-img", "") + p.qty + ' ' + esc(_td(def.name || p.mat)) + ' <small>(' + formatNumber(stock) + ')</small></span></span>';
  h += '<button type="button" class="kbtn" onclick="companionBuySkillRank(\'' + companionId + '\')"' + (st === "ok" ? '' : ' disabled') + '>' + esc(_t("Monter au rang {n}", { n: r + 1 })) + '</button></div>';
  return h;
}

function companionBuySkillRank(companionId) { if (window.CompanionManager) CompanionManager.buySkillRank(companionId); }
window.companionBuySkillRank = companionBuySkillRank;
window.buildCompanionSkillRankHTML = buildCompanionSkillRankHTML;

/* H4 (chantier du héros, atelier compagnons-ardeur.html variante A) : entraînement réparti. Une case par palier (or = équilibré,
   rouge = Ardeur, vert = Vigueur, pointillé = monde pas atteint), deux boutons d'achat, et la remise à zéro qui rend l'or. */
function buildCompanionTrainingHTML(companionId, st, stats) {
  var CM = CompanionManager, max = CM.trainingMax(companionId), cost = CM.nextTrainingCost(companionId);
  var b = getCompanionTrainingBonus(companionId, st.upgrades, st.ardeur, st.vigueur), pct = Math.round(COMPANION_TRAINING_PCT * 100);
  var def = getCompanionDef(companionId), eqPct = Math.round(((def.upgrades && def.upgrades.statPct) || 0) * 100);
  var h = '<div class="cp-train"><div class="cp-train-h"><span>' + _t("Entraînement") + ' <b>' + st.upgrades + ' / ' + max + '</b></span><small>' + esc(_t("+{p} % par palier, au choix", { p: pct })) + '</small></div>';
  var cells = Math.ceil((max + COMPANION_TRAINING_PER_WORLD) / 10) * 10, seq = [];
  for (var i = 0; i < b.eq; i++) seq.push("is-eq");
  for (i = 0; i < st.ardeur; i++) seq.push("is-ar");
  for (i = 0; i < st.vigueur; i++) seq.push("is-vi");
  h += '<div class="cp-train-pips" aria-hidden="true">';
  for (i = 0; i < cells; i++) h += '<i class="' + (seq[i] || (i >= max ? "is-lock" : "")) + '"></i>';
  h += '</div><div class="cp-train-legend">';
  if (b.eq) h += '<span><i class="is-eq"></i>' + esc(_t("Équilibré ×{n}", { n: b.eq })) + ' <b>' + esc(_t("+{p} % aux deux", { p: eqPct * b.eq })) + '</b></span>';
  h += '<span><i class="is-ar"></i>' + esc(_t("Ardeur ×{n}", { n: st.ardeur })) + ' <b>' + esc(_t("+{p} % dégâts", { p: pct * st.ardeur })) + '</b></span>';
  h += '<span><i class="is-vi"></i>' + esc(_t("Vigueur ×{n}", { n: st.vigueur })) + ' <b>' + esc(_t("+{p} % PV", { p: pct * st.vigueur })) + '</b></span></div>';
  if (cost == null) {
    var w = (typeof WORLDS !== "undefined") ? WORLDS[(COMPANION_JOIN_WORLD[companionId] || 0) + max / COMPANION_TRAINING_PER_WORLD] : null;
    h += '<div class="cp-train-lock">' + esc(w ? _t("Paliers {a} à {b} : s'ouvrent {w}.", { a: max + 1, b: max + COMPANION_TRAINING_PER_WORLD, w: WorldCaps.withPrep(WORLDS.indexOf(w)) }) : _t("Entraînement complet.")) + '</div>';
  } else {
    var ok = Number(game.gold || 0) >= cost;
    var nextAr = getCompanionTrainingBonus(companionId, st.upgrades + 1, st.ardeur + 1, st.vigueur), nextVi = getCompanionTrainingBonus(companionId, st.upgrades + 1, st.ardeur, st.vigueur + 1);
    var price = '<span class="cp-train-price"><img src="images/Icons/gold_icon.webp" alt="">' + formatNumber(cost) + '</span>';
    h += '<div class="cp-train-two">'
      + '<button type="button" class="cp-train-pick is-ar" onclick="companionBuyUpgrade(\'' + companionId + '\', \'ardeur\')"' + (ok ? '' : ' disabled') + '><b>' + _t("Ardeur") + '</b><small>'
      + esc(_t("Dégâts {a} → {b}", { a: formatNumber(stats.damage), b: formatNumber(Math.floor(stats.damage * nextAr.dmg / b.dmg)) })) + '</small>' + price + '</button>'
      + '<button type="button" class="cp-train-pick is-vi" onclick="companionBuyUpgrade(\'' + companionId + '\', \'vigueur\')"' + (ok ? '' : ' disabled') + '><b>' + _t("Vigueur") + '</b><small>'
      + esc(_t("PV {a} → {b}", { a: formatNumber(stats.maxHp), b: formatNumber(Math.floor(stats.maxHp * nextVi.hp / b.hp)) })) + '</small>' + price + '</button></div>';
  }
  if (st.ardeur + st.vigueur) h += '<button type="button" class="cp-train-reset" onclick="companionResetTraining(\'' + companionId + '\')">↺ ' + _t("Répartir de nouveau") + '</button>';
  return h + '</div>';
}

function companionResetTraining(companionId) {
  if (!window.CompanionManager) return;
  var st = CompanionManager.state(companionId), def = getCompanionDef(companionId);
  var go = function () { CompanionManager.resetTraining(companionId); };
  if (typeof showConfirmModal === "function") {
    showConfirmModal(_t("Répartir de nouveau ?"), _t("Les {n} paliers Ardeur et Vigueur de {x} sont rendus en or. Les paliers équilibrés restent.", { n: st.ardeur + st.vigueur, x: _td(def.name) }),
      "images/Icons/system/auto_repeat.webp", go);
  } else go();
}
window.companionResetTraining = companionResetTraining;
window.buildCompanionTrainingHTML = buildCompanionTrainingHTML;

/* v3.311.0 : bloc « Voie » d'un compagnon à voies. Tant que la voie n'est pas choisie
   (étape 8 acceptée, écran de choix pas encore passé), la carte renvoie à l'Histoire. */
function buildCompanionVoieHTML(companionId, st) {
  var raw = COMPANIONS_DB[companionId];
  var h = '<div class="cp-voie">';
  if (!st.voie) {
    h += '<div class="cp-voie-title">' + _t("Voie") + '</div><div class="cp-behavior-hint">' + _t("Pas encore choisie. Elle se choisit dans l'Histoire.") + '</div>';
    return h + '</div>';
  }
  var cur = raw.voies[st.voie];
  h += '<div class="cp-voie-title">' + _t("Voie :") + ' <b>' + esc(_td(cur.label)) + '</b></div>';
  h += '<div class="cp-behavior-hint">' + esc(_td(cur.desc)) + '</div>';
  var free = !!(window.MemoryManager && MemoryManager.isVoieFreeToday()); // v3.322.0 : Voie libre
  var cost = free ? 0 : getVoieChangeCost(st.voieChanges);
  Object.keys(raw.voies).forEach(function (vid) {
    if (vid === st.voie) return;
    var v = raw.voies[vid], afford = (game.gold || 0) >= cost;
    h += '<div class="cp-voie-other"><span>' + esc(_td(v.label)) + ' — ' + esc(_td(v.desc)) + '</span>';
    h += '<button type="button" class="kbtn' + (afford ? '' : ' is-disabled') + '"' + (afford ? '' : ' disabled')
      + ' onclick="companionChangeVoie(\'' + companionId + '\', \'' + vid + '\')">' + (free ? _t("Changer : gratuit aujourd'hui") : _t("Changer : {n} or", { n: formatNumber(cost) })) + '</button></div>';
  });
  h += '<div class="cp-behavior-hint">' + _t("Ses améliorations sont conservées. Chaque changement coûte trois fois le précédent.") + '</div>';
  return h + '</div>';
}

function companionChangeVoie(companionId, voieId) {
  if (!window.CompanionManager) return;
  var raw = COMPANIONS_DB[companionId], st = CompanionManager.state(companionId);
  var free = !!(window.MemoryManager && MemoryManager.isVoieFreeToday());
  var cost = free ? 0 : getVoieChangeCost(st.voieChanges);
  var go = function () { CompanionManager.changeVoie(companionId, voieId); };
  if (typeof showConfirmModal === "function") {
    showConfirmModal(_t("Changer de voie ?"), free
      ? _t("{x} passe à « {v} » gratuitement (Voie libre).", { x: _td(raw.name), v: _td(raw.voies[voieId].label) })
      : _t("{x} passe à « {v} » pour {n} or.", { x: _td(raw.name), v: _td(raw.voies[voieId].label), n: formatNumber(cost) }), "images/Icons/system/auto_repeat.webp", go);
  } else go();
}
window.companionChangeVoie = companionChangeVoie;
window.buildCompanionVoieHTML = buildCompanionVoieHTML;

/* ---------- Actions ---------- */

function companionSetPresent(companionId, present) {
  if (!window.CompanionManager) return;
  CompanionManager.setPresent(companionId, present);
  if (typeof renderAll === "function") renderAll();
}

function companionBuyUpgrade(companionId, kind) {
  if (!window.CompanionManager) return;
  CompanionManager.buyUpgrade(companionId, kind); // H4 : "ardeur" ou "vigueur"
}

window.buildCompanionCardHTML = buildCompanionCardHTML;
window.companionSetPresent = companionSetPresent;
window.companionBuyUpgrade = companionBuyUpgrade;
