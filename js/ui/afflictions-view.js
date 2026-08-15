"use strict";
/* ============================================================
Aethervale — ui/afflictions-view.js
v3.20 : écran "Afflictions" (Menu ☰) — liste des modificateurs
optionnels et cumulables (voir data/afflictions.js,
systems/affliction-system.js), chacun avec un interrupteur, même
pattern visuel que le toggle d'autovente (ui/equipment-view.js).
Activation/désactivation IMMÉDIATE, pas de "confirmer" séparé.
============================================================ */

function buildAfflictionsHTML() {
  if (window.AfflictionManager) AfflictionManager.ensure();

  var activeCount = window.AfflictionManager ? AfflictionManager.getActiveCount() : 0;
  var maxActive = window.AFFLICTION_MAX_ACTIVE || 4;
  var stackMult = window.AfflictionManager ? AfflictionManager.getStackRewardMult() : 1;

  var h = '<div class="nb-page-frame">';

  h += '<div class="affliction-intro">';
  h += '<div class="affliction-intro-title">🔥 Afflictions</div>';
  h += '<div class="affliction-intro-desc">Des modificateurs optionnels pour ton farm dans les mondes — jamais un pur malus, toujours un vrai compromis. Cumulables jusqu\'à ' + maxActive + ' à la fois.</div>';
  h += '<div class="affliction-intro-count">' + activeCount + ' / ' + maxActive + ' actives';
  if (activeCount > 0) {
    h += ' — <span class="affliction-stack-bonus">+' + Math.round((stackMult - 1) * 100) + '% à toutes les récompenses (bonus de cumul)</span>';
  }
  h += '</div>';
  h += '</div>';

  (window.AFFLICTIONS || []).forEach(function (a) {
    var isOn = window.AfflictionManager && AfflictionManager.isActive(a.id);
    var atCap = !isOn && activeCount >= maxActive;

    h += '<div class="affliction-card' + (isOn ? ' is-on' : '') + (atCap ? ' is-capped' : '') + '">';
    h += '<button class="affliction-toggle' + (isOn ? ' is-on' : '') + '" type="button" ' + (atCap ? 'disabled' : '') + ' onclick="AfflictionManager.toggle(\'' + a.id + '\')">';
    h += '<span class="affliction-toggle-icon">' + esc(a.icon || "🔥") + '</span>';
    h += '<span class="affliction-toggle-body">';
    h += '<span class="affliction-toggle-name">' + esc(a.name) + '</span>';
    h += '<span class="affliction-toggle-desc">' + esc(a.desc) + '</span>';
    h += '</span>';
    h += '<span class="affliction-switch"></span>';
    h += '</button>';
    h += '</div>';
  });

  h += '</div>';
  return h;
}

window.buildAfflictionsHTML = buildAfflictionsHTML;
