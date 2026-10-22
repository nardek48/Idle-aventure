"use strict";
/* ui/combat-group-view.js — v3.269.0 (lot L-3) : actions de l'arène de groupe. Depuis v3.459.7 (audit O13),
   les rangées d'ennemis et d'alliés sont dessinées par ui/combat-screen-view.js ; restent ici la cible
   collante, le portrait d'un ennemi, les actions d'un compagnon en Manuel et la feuille « Qui soigner ? ». */

function getEnemyPortrait(e) {
  if (!e) return "";
  var db = e.isBoss ? window.BOSS_DB : window.ENEMY_DB;
  var data = (window.ELITE_DB && ELITE_DB[e.id]) ? {} : ((db && db[e.id]) || {});
  return e.image || data.image || ""; // v3.355.0 (D3) : l'image propre d'abord, la fiche de base en repli
}

/* Tap sur un portrait : cible collante. Elle tient jusqu'à la mort de l'ennemi visé,
   puis CombatActors rend la main au choix automatique. */
function selectEnemyTarget(actorId) {
  if (!window.CombatActors || !actorId) return;
  var e = CombatActors.setTarget(actorId);
  if (!e || Number(e.hp || 0) <= 0) return;
  game.combat.targetLocked = true; // v3.428.0 : le toucher prime sur le réglage « Cible »
  if (typeof renderEnemy === "function") renderEnemy();
}

/* ---------- Mode Manuel : actions de l'acteur sélectionné ---------- */

function companionAction(slot) {
  if (!window.CombatEngine) return;
  var actor = CombatEngine.selectedActor();
  if (!actor || !actor.companionId) return;

  /* Soin : la cible se choisit dans une feuille basse, et SEULEMENT s'il y a un vrai
     choix. Un seul allié blessé, le soin part dessus ; aucun, l'action n'est pas jouable.
     Sur un jeu idle, un tap de plus par round pour une décision évidente est ce qui fait
     basculer tout le monde en Auto. */
  if (slot === "skill") {
    var def = getCompanionDef(actor.companionId);
    var enRecharge = Number(actor.cooldown || 0) > 0;
    var sansCharge = CompanionManager.chargesMax(actor.companionId) > 0 && Number(actor.charges || 0) <= 0;
    if (enRecharge || sansCharge) return;
    if (def && def.skill && def.skill.type === "heal") {
      var blesses = CompanionManager.woundedAllies();
      if (!blesses.length) { showToast(_t("Personne n'est blessé"), 1200); return; }
      if (blesses.length > 1) { openHealTargetSheet(actor, blesses); return; }
      CombatEngine.queueChoice("skill", blesses[0].actorId);
      return;
    }
  }
  CombatEngine.queueChoice(slot, null);
}

function openHealTargetSheet(actor, blesses) {
  var root = document.getElementById("combat-sortie-sheet-root");
  if (!root) return;
  var h = '<div class="ksheet-backdrop" onclick="closeHealTargetSheet()"></div>';
  h += '<div class="ksheet cbg-heal-sheet">' + kSheetHeadHTML({ title: _t("Qui soigner ?"), close: "closeHealTargetSheet()" });
  h += '<div class="ksheet-body">';
  var bas = blesses.slice().sort(function (x, y) { return (x.hp / x.maxHp) - (y.hp / y.maxHp); })[0];
  blesses.forEach(function (t) {
    var pct = Math.round((t.hp / t.maxHp) * 100);
    h += '<button type="button" class="cbg-heal-opt' + (t === bas ? " is-best" : "") + '"'
      + ' onclick="chooseHealTarget(\'' + esc(t.actorId) + '\')">'
      + '<div class="cbg-heal-txt"><b>' + esc(_td(t.name || "")) + (t === bas ? " \u00b7 " + _t("le plus bas") : "") + '</b>'
      + '<span>' + formatNumber(Math.ceil(t.hp)) + " / " + formatNumber(t.maxHp) + ' (' + pct + ' %)</span>'
      + '<i class="cbg-heal-bar"><b style="width:' + pct + '%"></b></i></div></button>';
  });
  h += '</div></div>';
  root.innerHTML = h;
}

function closeHealTargetSheet() {
  var root = document.getElementById("combat-sortie-sheet-root");
  if (root) root.innerHTML = "";
}

function chooseHealTarget(targetActorId) {
  closeHealTargetSheet();
  var actor = CombatEngine.selectedActor();
  if (actor && actor.companionId) CombatEngine.queueChoice("skill", targetActorId);
}

function selectCombatActor(actorId) {
  if (window.CombatEngine) CombatEngine.selectActor(actorId);
}

window.companionAction = companionAction;
window.openHealTargetSheet = openHealTargetSheet;
window.closeHealTargetSheet = closeHealTargetSheet;
window.chooseHealTarget = chooseHealTarget;
window.selectCombatActor = selectCombatActor;

window.selectEnemyTarget = selectEnemyTarget;
