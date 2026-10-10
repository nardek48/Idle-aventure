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
  h += '<div><b>' + esc(_td(def.skill.name)) + '</b><div class="cp-skill-desc">' + esc(_td(def.skill.desc))
    + ' ' + esc(_t("Recharge : {n} rounds.", { n: def.skill.cooldown })) + '</div></div>';
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

  var maxUp = getCompanionMaxUpgrades(companionId);
  var cost = getCompanionUpgradeCost(companionId, st.upgrades);
  h += '<div class="cp-upgrade">';
  h += '<div class="cp-upgrade-label">' + _t("Entraînement") + ' <b>' + st.upgrades + ' / ' + maxUp + '</b>';
  h += '<span class="cp-upgrade-hint">' + _t("+{p} % à toutes ses stats par palier", { p: Math.round((def.upgrades.statPct || 0) * 100) }) + '</span></div>';
  if (cost == null) {
    h += '<div class="cp-upgrade-done">' + _t("Terminé") + '</div>';
  } else {
    var afford = (game.gold || 0) >= cost;
    h += '<button type="button" class="kbtn' + (afford ? '' : ' is-disabled') + '" onclick="companionBuyUpgrade(\'' + companionId + '\')"'
      + (afford ? '' : ' disabled') + '>' + _t("{n} or", { n: formatNumber(cost) }) + '</button>';
  }
  h += '</div>';

  h += '</div>';
  return h;
}

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
      : _t("{x} passe à « {v} » pour {n} or.", { x: _td(raw.name), v: _td(raw.voies[voieId].label), n: formatNumber(cost) }), "images/Icons/system/auto_repeat.png", go);
  } else go();
}
window.companionChangeVoie = companionChangeVoie;
window.buildCompanionVoieHTML = buildCompanionVoieHTML;

function buildHerosCompanionsHTML() {
  var h = '<div class="nb-page-frame kframe-page" data-kf-title="' + esc("images/Icons/subtabs/hero_summary.png|" + _t("Compagnons")) + '">';

  var ids = (window.CompanionManager) ? CompanionManager.unlockedIds() : [];
  if (!ids.length) {
    h += '<div class="pc-empty">' + _t("Personne ne t'accompagne encore.") + '</div>';
  } else {
    h += '<div class="cp-intro">' + _t("Deux compagnons au maximum peuvent partir avec toi. Ils jouent après toi à chaque round.") + '</div>';
    ids.forEach(function (id) { h += buildCompanionCardHTML(id); });
  }

  h += '</div>';
  return h;
}

/* ---------- Actions ---------- */

function companionSetPresent(companionId, present) {
  if (!window.CompanionManager) return;
  CompanionManager.setPresent(companionId, present);
  if (typeof renderAll === "function") renderAll();
}

function companionSetSetting(companionId, key, value) {
  if (!window.CompanionManager) return;
  // v3.307.0 : garde ici et pas dans setSetting, que restore() rappelle au chargement
  if (window.heroLockToast && heroLockToast()) { if (typeof renderAll === "function") renderAll(); return; }
  CompanionManager.setSetting(companionId, key, value);
  if (typeof renderAll === "function") renderAll();
}

function companionBuyUpgrade(companionId) {
  if (!window.CompanionManager) return;
  CompanionManager.buyUpgrade(companionId);
}

window.buildHerosCompanionsHTML = buildHerosCompanionsHTML;
window.buildCompanionCardHTML = buildCompanionCardHTML;
window.companionSetPresent = companionSetPresent;
window.companionBuyUpgrade = companionBuyUpgrade;
window.companionSetSetting = companionSetSetting;
