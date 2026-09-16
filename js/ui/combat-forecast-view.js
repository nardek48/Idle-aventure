"use strict";
/* ui/combat-forecast-view.js — écran de pronostic AVANT le lancement d'un combat (v3.247.0,
   demande Seb 15/09/2026 : « un message juste avant de lancer le combat, avec possibilité
   d'annuler, et qui dise s'il faut monter ses caractéristiques ou acheter de l'équipement »).

   Deux usages :
     - buildCombatForecastLineHTML(f) : une ligne à intégrer dans un écran de lancement
       existant (feuille de donjon) ;
     - openCombatForecastConfirm(f, opts) : l'overlay de confirmation, pour les lancements
       qui n'ont pas d'écran intermédiaire (missions du tableau).
   L'overlay ne s'ouvre que si le pronostic est « Risqué » ou pire : sur un combat abordable,
   il n'y a rien à dire et une confirmation de plus serait une gêne. */

/* v3.265.0 (retour Seb) : sous ce seuil de PV, le départ en mission est précédé d'un
   avertissement « soigne-toi », quel que soit le verdict du pronostic. */
var FORECAST_LOW_HP_PCT = 0.60;
window.FORECAST_LOW_HP_PCT = FORECAST_LOW_HP_PCT;

function getHeroHpRatio() {
  var max = Number(game.heroMaxHp || 0);
  if (max <= 0) return 1;
  return Math.max(0, Number(game.heroHp != null ? game.heroHp : max)) / max;
}
window.getHeroHpRatio = getHeroHpRatio;

/* Soigner = aller au Campement (rations, régénération) : ferme l'overlay sans lancer. */
function goHealFromForecast() {
  closeCombatForecast();
  if (typeof switchTab === "function") switchTab("campement");
}
window.goHealFromForecast = goHealFromForecast;

function getForecastLevelClass(f) {
  return f ? ("is-" + f.id) : "";
}

/* Ligne compacte : verdict + estimation de rounds. */
function buildCombatForecastLineHTML(f) {
  if (!f || !window.CombatForecast) return "";
  var def = CombatForecast.getLevelDef(f.id);
  var h = '<div class="cf-line ' + getForecastLevelClass(f) + '">';
  h += '<span class="cf-line-verdict">' + esc(def.label) + '</span>';
  if (f.unwinnable) {
    h += '<span class="cf-line-detail">il se soigne plus vite que tu ne frappes</span>';
  } else if (f.roundsToKill) {
    h += '<span class="cf-line-detail">~' + f.roundsToKill + ' rounds pour le vaincre, ~' + f.roundsToDie + ' pour tomber</span>';
  }
  h += '</div>';
  return h;
}
window.buildCombatForecastLineHTML = buildCombatForecastLineHTML;

var pendingForecastAction = null;

function buildCombatForecastHTML(f, opts) {
  var def = CombatForecast.getLevelDef(f.id);
  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu cf-card ' + getForecastLevelClass(f) + '">';
  h += '    <div class="cf-title">' + esc(opts.title || "Avant de partir") + '</div>';
  if (opts.lowHp) {
    h += '    <div class="cf-lowhp"><img class="cf-lowhp-ico" src="images/Icons/combat_stats/stat_health.png" alt="">'
      + '<span><b>Attention, il faut te soigner.</b> Tu pars à ' + Math.round(getHeroHpRatio() * 100) + ' % de tes PV : '
      + 'mange une ration au Campement ou laisse le feu te remettre sur pied.</span></div>';
  }
  h += '    <div class="cf-verdict">' + esc(def.label) + '</div>';
  if (f.enemyName) h += '    <div class="cf-enemy">Adversaire annoncé : ' + esc(f.enemyName) + '</div>';

  h += '    <div class="cf-rows">';
  h += '      <div class="cf-row"><span>Tes dégâts</span><span>' + formatNumber(f.heroDamagePerRound) + ' / round</span></div>';
  h += '      <div class="cf-row"><span>Ses dégâts</span><span>' + formatNumber(f.enemyDamagePerRound) + ' / round</span></div>';
  h += '      <div class="cf-row"><span>Ses PV</span><span>' + formatNumber(f.enemyHp) + '</span></div>';
  if (f.healThreshold > 0) {
    h += '      <div class="cf-row' + (f.unwinnable ? ' is-blocking' : '') + '"><span>Il se soigne</span><span>il faut plus de ' + formatNumber(f.healThreshold) + ' dégâts / round</span></div>';
  }
  if (!f.unwinnable) {
    h += '      <div class="cf-row"><span>Estimation</span><span>~' + f.roundsToKill + ' rounds contre ~' + f.roundsToDie + '</span></div>';
  }
  h += '    </div>';

  if (f.reason) h += '    <div class="cf-reason">' + esc(f.reason) + '</div>';
  if (f.advice) h += '    <div class="cf-advice">' + esc(f.advice) + '</div>';
  if (def.hint) h += '    <div class="cf-hint">' + esc(def.hint) + '</div>';

  h += '    <div class="cf-actions">';
  if (opts.lowHp) h += '      <button class="settings-btn" type="button" onclick="goHealFromForecast()">Me soigner</button>';
  else h += '      <button class="settings-btn" type="button" onclick="closeCombatForecast()">Annuler</button>';
  h += '      <button class="settings-btn primary" type="button" onclick="confirmCombatForecast()">' + esc(opts.confirmLabel || "Partir quand même") + '</button>';
  h += '    </div>';
  h += '  </div>';
  h += '</div>';
  return h;
}

function getForecastHost() {
  return document.getElementById("forecast-modal-root") || document.getElementById("dungeon-modal-root");
}

function openCombatForecastConfirm(f, opts) {
  opts = opts || {};
  pendingForecastAction = opts.onConfirm || null;
  var host = getForecastHost();
  if (!host) { if (pendingForecastAction) { var a = pendingForecastAction; pendingForecastAction = null; a(); } return; }
  host.innerHTML = buildCombatForecastHTML(f, opts);
}
window.openCombatForecastConfirm = openCombatForecastConfirm;

function closeCombatForecast() {
  pendingForecastAction = null;
  var host = getForecastHost();
  if (host) host.innerHTML = "";
}
window.closeCombatForecast = closeCombatForecast;

function confirmCombatForecast() {
  var action = pendingForecastAction;
  closeCombatForecast();
  if (typeof action === "function") action();
}
window.confirmCombatForecast = confirmCombatForecast;

/* Point d'entrée unique : lance `action`, précédée de l'overlay si le pronostic l'exige.
   Utilisé par campMissionAction() — donc par le tableau du Camp ET par l'écran Quêtes. */
function launchWithForecast(mission, action) {
  if (!window.CombatForecast || !mission) return action();
  var f = null;
  try { f = CombatForecast.forMission(mission); } catch (e) { f = null; }
  if (!f) return action();
  // v3.265.0 : PV sous le seuil -> avertissement même sur un combat abordable
  var lowHp = getHeroHpRatio() < FORECAST_LOW_HP_PCT;
  if (!lowHp && CombatForecast.getLevelDef(f.id).level < 2) return action();
  openCombatForecastConfirm(f, {
    title: mission.title || "Avant de partir",
    confirmLabel: (f.unwinnable || lowHp) ? "Partir quand même" : "Partir",
    lowHp: lowHp,
    onConfirm: action
  });
}
window.launchWithForecast = launchWithForecast;
