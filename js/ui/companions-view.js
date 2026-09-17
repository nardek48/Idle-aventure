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
  h += '<div class="cp-portrait"><img src="' + esc(def.image) + '" alt="' + esc(def.name) + '"></div>';
  h += '<div class="cp-ident">';
  h += '<div class="cp-name">' + esc(def.name) + '</div>';
  h += '<div class="cp-role">' + esc(COMPANION_ROLE_LABELS[def.role] || def.role) + '</div>';
  h += '</div>';
  h += '</div>';

  h += '<div class="kgauge kgauge-dragon-claw cp-hp">';
  h += '<div class="kgauge-track"><div class="kgauge-fill" style="width:' + pct.toFixed(1) + '%"></div></div>';
  h += '<div class="kgauge-text">' + formatNumber(Math.ceil(hp)) + ' / ' + formatNumber(maxHp) + '</div>';
  h += '</div>';
  if (ko) h += '<div class="cp-ko-note">Hors de combat — revient affaibli au prochain combat.</div>';

  h += '<div class="cp-stats">';
  h += '<span>Dégâts <b>' + formatNumber(stats.damage) + '</b></span>';
  h += '<span>PV <b>' + formatNumber(maxHp) + '</b></span>';
  h += '</div>';

  h += '<div class="cp-skill">';
  h += '<img class="cp-skill-ico" src="' + esc(def.skill.icon) + '" alt="">';
  h += '<div><b>' + esc(def.skill.name) + '</b><div class="cp-skill-desc">' + esc(def.skill.desc)
    + ' Recharge : ' + def.skill.cooldown + ' rounds.</div></div>';
  h += '</div>';

  /* Présence et contrôle : deux segments, l'état du jeu se lit d'un coup d'œil. */
  h += '<div class="kseg cp-seg">';
  h += '<button type="button" class="' + (st.present ? 'is-on' : '') + '" onclick="companionSetPresent(\'' + companionId + '\', true)">Avec toi</button>';
  h += '<button type="button" class="' + (!st.present ? 'is-on' : '') + '" onclick="companionSetPresent(\'' + companionId + '\', false)">Au camp</button>';
  h += '</div>';

  h += '<div class="kseg cp-seg">';
  h += '<button type="button" class="' + (st.control === "auto" ? 'is-on' : '') + '" onclick="companionSetControl(\'' + companionId + '\', \'auto\')">Auto</button>';
  h += '<button type="button" class="' + (st.control === "manual" ? 'is-on' : '') + '" onclick="companionSetControl(\'' + companionId + '\', \'manual\')">Manuel</button>';
  h += '</div>';

  var maxUp = getCompanionMaxUpgrades(companionId);
  var cost = getCompanionUpgradeCost(companionId, st.upgrades);
  h += '<div class="cp-upgrade">';
  h += '<div class="cp-upgrade-label">Entraînement <b>' + st.upgrades + ' / ' + maxUp + '</b>';
  h += '<span class="cp-upgrade-hint">+' + Math.round((def.upgrades.statPct || 0) * 100) + ' % à toutes ses stats par palier</span></div>';
  if (cost == null) {
    h += '<div class="cp-upgrade-done">Terminé</div>';
  } else {
    var afford = (game.gold || 0) >= cost;
    h += '<button type="button" class="kbtn' + (afford ? '' : ' is-disabled') + '" onclick="companionBuyUpgrade(\'' + companionId + '\')"'
      + (afford ? '' : ' disabled') + '>' + formatNumber(cost) + ' or</button>';
  }
  h += '</div>';

  h += '</div>';
  return h;
}

function buildHerosCompanionsHTML() {
  var h = '<div class="nb-page-frame kframe-page" data-kf-title="images/Icons/subtabs/hero_summary.png|Compagnons">';

  var ids = (window.CompanionManager) ? CompanionManager.unlockedIds() : [];
  if (!ids.length) {
    h += '<div class="pc-empty">Personne ne t\'accompagne encore.</div>';
  } else {
    h += '<div class="cp-intro">Deux compagnons au maximum peuvent partir avec toi. '
      + 'Ils jouent après toi à chaque round.</div>';
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

function companionSetControl(companionId, control) {
  if (!window.CompanionManager) return;
  CompanionManager.setControl(companionId, control);
  if (typeof renderAll === "function") renderAll();
}

function companionBuyUpgrade(companionId) {
  if (!window.CompanionManager) return;
  CompanionManager.buyUpgrade(companionId);
}

window.buildHerosCompanionsHTML = buildHerosCompanionsHTML;
window.buildCompanionCardHTML = buildCompanionCardHTML;
window.companionSetPresent = companionSetPresent;
window.companionSetControl = companionSetControl;
window.companionBuyUpgrade = companionBuyUpgrade;
