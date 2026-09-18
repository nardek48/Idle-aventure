"use strict";
/* ui/combat-group-view.js — v3.269.0 (lot L-3) : l'arène de groupe.
   Issu de atelier-groupe.html, validé sur iPhone par Seb le 17/09/2026.

   Deux blocs, et rien d'autre :
     - la RANGÉE D'ENNEMIS au-dessus de l'illustration, qui n'apparaît qu'à partir de
       deux ennemis (à un seul, l'écran est exactement celui d'avant) ;
     - la RANGÉE D'ALLIÉS au-dessus du bandeau héros, qui n'apparaît que si un compagnon
       est présent.

   Décisions d'affichage figées à l'atelier : portraits de 104 px rabattus au tiers de la
   rangée en 320 px ; nom POSÉ SUR le portrait (bandeau crème, encre sombre) ; statuts en
   pastilles rondes SOUS le portrait ; cible collante marquée par un halo ; illustration
   principale conservée, avec le nom de la cible en titre juste au-dessus.

   Le mode Manuel (bloc du bas qui bascule sur l'acteur choisi) est le lot L-4 : ici les
   compagnons jouent en Auto et leurs cartes sont en lecture seule. */

/* ---------- Rangée d'ennemis ---------- */

/* Ce qui se lit sur un portrait, dans l'ordre de gravité : ce qui arrive au prochain
   round d'abord (pastille qui bat de l'œil), puis l'archétype permanent. */
function getEnemyRowBadges(e) {
  var out = [];
  if (!e) return out;
  if (e.chargeTelegraphed) out.push({ ico: "images/Icons/combat_status/charge_incoming.png", urgent: true, t: "Charge au prochain round" });
  else if (e.silenceTelegraphed) out.push({ ico: "images/Icons/combat_status/silence_incoming.png", urgent: true, t: "Silence au prochain round" });
  else if (e.shieldTelegraphed) out.push({ ico: "images/Icons/combat_status/shield_incoming.png", urgent: true, t: "Bouclier au prochain round" });
  else if (e.healTelegraphed) out.push({ ico: "images/Icons/combat_status/heal_incoming.png", urgent: true, t: "Soin au prochain round" });
  else if (e.surgeTelegraphed) out.push({ ico: "images/Icons/combat_status/arcane_burn.png", urgent: true, t: "Exaltation au prochain round" });

  if (Number(e.engageIn || 0) > 0) out.push({ ico: "images/Icons/combat_status/enemy_approaching.png", urgent: false, t: "Arrive dans " + e.engageIn + " round(s)" });
  if (e.archetype === "armored") out.push({ ico: "images/Icons/combat_status/armored.png", urgent: false, t: "Blindé" });
  if (e.archetype === "enraged") out.push({ ico: "images/Icons/combat_status/rage.png", urgent: false, t: "Enragé" });
  if (e.archetype === "vampiric") out.push({ ico: "images/Icons/combat_status/vampiric.png", urgent: false, t: "Vampirique" });
  if (e.archetype === "corrupted") out.push({ ico: "images/Icons/combat_status/corruption.png", urgent: false, t: "Corrompu" });
  return out.slice(0, 3); // au-delà, la rangée devient illisible en 320 px
}

function getEnemyPortrait(e) {
  if (!e) return "";
  var db = e.isBoss ? window.BOSS_DB : window.ENEMY_DB;
  var data = (window.ELITE_DB && ELITE_DB[e.id]) ? {} : ((db && db[e.id]) || {});
  return data.image || e.image || "";
}

function buildEnemyRowHTML() {
  if (!window.CombatActors) return "";
  var list = CombatActors.enemies();
  if (!list || list.length < 2) return ""; // un seul ennemi : écran historique

  var cible = CombatActors.target();
  var h = '<div class="cbg-foes">';

  list.forEach(function (e) {
    var mort = Number(e.hp || 0) <= 0;
    var pct = (Number(e.maxHp || 0) > 0) ? Math.max(0, (e.hp / e.maxHp) * 100) : 0;
    var img = getEnemyPortrait(e);

    h += '<button type="button" class="cbg-foe' + (e === cible ? " is-target" : "") + (mort ? " is-dead" : "") + '"'
      + ' onclick="selectEnemyTarget(\'' + esc(e.actorId || "") + '\')"'
      + ' aria-label="' + esc(e.name || "Ennemi") + '">';

    h += '<div class="cbg-foe-frame">';
    h += img
      ? '<img src="' + esc(img) + '" alt="">'
      : (typeof renderIcon === "function" ? renderIcon(e.isBoss ? "bosses" : "enemies", e.asset || "") : "");
    h += '<div class="cbg-foe-name">' + esc(e.name || "") + '</div>';
    h += '</div>';

    h += '<div class="cbg-foe-hp"><i style="width:' + pct.toFixed(1) + '%"></i></div>';

    h += '<div class="cbg-foe-badges">';
    getEnemyRowBadges(e).forEach(function (b) {
      h += '<span class="cbg-pastille' + (b.urgent ? " is-urgent" : "") + '" title="' + esc(b.t) + '">'
        + '<img src="' + esc(b.ico) + '" alt=""></span>';
    });
    h += '</div>';

    h += '</button>';
  });

  h += '</div>';
  return h;
}

/* v3.280.0 : la rangée n'est RÉÉCRITE que si son contenu a changé.
   renderEnemyRow est appelée à chaque dégât et à chaque rafraîchissement de l'écran ;
   réécrire innerHTML entre le toucher et le relâchement annule le tap sur mobile — le
   portrait ne réagissait alors pas, sans qu'aucune erreur n'apparaisse. Le même
   raisonnement vaut pour la rangée d'alliés. */
function renderEnemyRow() {
  var host = document.getElementById("enemy-row");
  if (!host) return;
  var html = buildEnemyRowHTML();
  if (host.innerHTML === html) return;
  host.innerHTML = html;
}

/* Tap sur un portrait : cible collante. Elle tient jusqu'à la mort de l'ennemi visé,
   puis CombatActors rend la main au choix automatique. */
function selectEnemyTarget(actorId) {
  if (!window.CombatActors || !actorId) return;
  var e = CombatActors.setTarget(actorId);
  if (!e || Number(e.hp || 0) <= 0) return;
  if (typeof renderEnemy === "function") renderEnemy();
}

/* ---------- Rangée d'alliés ---------- */

function buildAllyRowHTML() {
  if (!window.CombatActors || !window.CompanionManager) return "";
  var allies = CombatActors.allies();
  if (!allies || allies.length < 2) return ""; // personne ne t'accompagne

  var h = '<div class="cbg-allies">';
  h += buildHeroCardHTML();   // v3.273.0 (retour Seb) : le héros a sa carte, comme les autres
  allies.forEach(function (a) {
    if (!a || !a.companionId) return; // le héros a déjà sa carte, juste au-dessus
    var max = Number(a.maxHp || 0);
    var pct = max > 0 ? Math.max(0, (a.hp / max) * 100) : 0;
    var ko = Number(a.hp || 0) <= 0;
    var def = getCompanionDef(a.companionId);
    var chargesMax = CompanionManager.chargesMax(a.companionId);

    /* v3.270.0 (L-4) : en Manuel, la carte devient cliquable — elle sélectionne l'acteur
       dont les actions s'affichent en bas, montre s'il attend encore son choix, et le
       coche une fois choisi. En Auto, elle reste en lecture seule. */
    var manuel = (a.control === "manual" && window.CombatEngine && CombatEngine.hasManualAllies());
    var choisi = manuel && !!CombatEngine.pendingOf(a);
    var actif = manuel && CombatEngine.selectedActor() === a;
    var attend = manuel && !choisi && !ko;

    h += '<button type="button" class="cbg-ally' + (ko ? " is-ko" : "") + (actif ? " is-active" : "")
      + (attend ? " is-waiting" : "") + (choisi ? " is-done" : "") + '"'
      + (manuel && !ko ? ' onclick="selectCombatActor(\'' + esc(a.actorId) + '\')"' : " disabled") + '>';
    h += '<div class="cbg-ally-portrait"><img src="' + esc((def && def.image) || "") + '" alt=""></div>';
    h += '<div class="cbg-ally-right">';
    h += '<div class="cbg-ally-name"><span>' + esc(a.name || "") + '</span>';
    if (choisi) h += '<span class="cbg-ally-tick">\u2713</span>';
    else if (Number(a.cooldown || 0) > 0) h += '<span class="cbg-ally-cd">' + a.cooldown + '</span>';
    h += '</div>';
    h += '<div class="cbg-ally-hp"><i style="width:' + pct.toFixed(1) + '%"></i></div>';
    if (chargesMax > 0) {
      h += '<div class="cbg-ally-charges">';
      for (var i = 0; i < chargesMax; i++) {
        h += '<i class="' + (i < Number(a.charges || 0) ? "" : "is-off") + '"></i>';
      }
      h += '</div>';
    }
    h += '</div></button>';
  });
  h += '</div>';
  return h;
}

function renderAllyRow() {
  var host = document.getElementById("ally-row");
  if (!host) return;
  var html = buildAllyRowHTML();
  if (host.innerHTML === html) return;
  host.innerHTML = html;
}

/* Carte du héros dans la rangée. Elle existe pour deux raisons : on ne perd jamais ses
   PV de vue quand le cadre du bas affiche un compagnon, et elle sert à reprendre la main
   d'un tap en mode Manuel. */
function buildHeroCardHTML() {
  var hero = CombatActors.heroActor();
  var max = Number(hero.maxHp || 0);
  var pct = max > 0 ? Math.max(0, (hero.hp / max) * 100) : 0;
  var manuel = (window.CombatEngine && CombatEngine.hasManualAllies());
  var choisi = manuel && !!CombatEngine.pendingOf(hero);
  var actif = manuel && CombatEngine.selectedActor() === hero;
  var attend = manuel && !choisi;

  var heroDef = (typeof getHeroByGameId === "function") ? getHeroByGameId(game.heroId) : null;
  var img = (heroDef && heroDef.image) || "";

  /* v3.281.0 (bug Seb, iPhone) : <button> et non <div> — un div à onclick ne reçoit pas
     toujours le tap sur iOS. */
  var h = '<button type="button" class="cbg-ally cbg-me' + (actif ? " is-active" : "")
    + (attend ? " is-waiting" : "") + (choisi ? " is-done" : "") + '"'
    + (manuel ? ' onclick="selectCombatActor(\'' + esc(hero.actorId) + '\')"' : " disabled") + '>';
  h += '<div class="cbg-ally-portrait"><img src="' + esc(img) + '" alt=""></div>';
  h += '<div class="cbg-ally-right">';
  h += '<div class="cbg-ally-name"><span>' + esc(hero.name || "Toi") + '</span>';
  h += choisi ? '<span class="cbg-ally-tick">\u2713</span>' : '<span class="cbg-ally-cd">\u2014</span>';
  h += '</div>';
  h += '<div class="cbg-ally-hp"><i style="width:' + pct.toFixed(1) + '%"></i></div>';
  h += '</div></button>';
  return h;
}

/* ---------- Mode Manuel : actions de l'acteur sélectionné ---------- */

/* La rangée d'actions du bas montre le kit du héros, ou les actions du compagnon
   sélectionné. Le bandeau héros, lui, ne bouge PAS : c'est au moment de choisir pour un
   compagnon qu'on a le plus besoin de voir ses propres PV. Les PV du compagnon restent
   lisibles sur sa mini-carte, juste au-dessus. */
function buildCompanionActionsHTML(actor) {
  var def = getCompanionDef(actor.companionId);
  if (!def) return "";
  var choix = CombatEngine.pendingOf(actor);
  var enRecharge = Number(actor.cooldown || 0) > 0;
  var sansCharge = CompanionManager.chargesMax(actor.companionId) > 0 && Number(actor.charges || 0) <= 0;
  var h = "";

  /* Compétence signature. Indisponible, elle le DIT : rounds restants pendant la
     recharge, ∅ quand les charges du combat sont épuisées. */
  var off = enRecharge || sansCharge;
  h += '<button type="button" class="cbg-act' + (off ? " is-off" : "") + (choix && choix.slot === "skill" ? " is-picked" : "") + '"'
    + ' onclick="companionAction(\'skill\')" aria-label="' + esc(def.skill.name) + '">'
    + '<img src="' + esc(def.skill.icon) + '" alt="">'
    + (enRecharge ? '<span class="cbg-act-cd">' + actor.cooldown + '</span>' : "")
    + (!enRecharge && sansCharge ? '<span class="cbg-act-cd">\u2205</span>' : "")
    + '</button>';

  h += '<button type="button" class="cbg-act' + (choix && choix.slot === "basic" ? " is-picked" : "") + '"'
    + ' onclick="companionAction(\'basic\')" aria-label="Attaque">'
    + '<img src="images/Icons/special_attacks/attack3.png" alt=""></button>';

  return '<div class="cbg-acts">' + h + '</div>';
}

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
      if (!blesses.length) { showToast("Personne n'est blessé", 1200); return; }
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
  h += '<div class="ksheet cbg-heal-sheet"><div class="ksheet-title"><span>Qui soigner ?</span></div>';
  h += '<div class="ksheet-body">';
  var bas = blesses.slice().sort(function (x, y) { return (x.hp / x.maxHp) - (y.hp / y.maxHp); })[0];
  blesses.forEach(function (t) {
    var pct = Math.round((t.hp / t.maxHp) * 100);
    h += '<button type="button" class="cbg-heal-opt' + (t === bas ? " is-best" : "") + '"'
      + ' onclick="chooseHealTarget(\'' + esc(t.actorId) + '\')">'
      + '<div class="cbg-heal-txt"><b>' + esc(t.name || "") + (t === bas ? " \u00b7 le plus bas" : "") + '</b>'
      + '<span>' + formatNumber(Math.ceil(t.hp)) + " / " + formatNumber(t.maxHp) + ' (' + pct + ' %)</span>'
      + '<i class="cbg-heal-bar"><b style="width:' + pct + '%"></b></i></div></button>';
  });
  h += '</div><button type="button" class="ksheet-close" onclick="closeHealTargetSheet()">Annuler</button></div>';
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

/* v3.273.0 (maquette validée) : quand un COMPAGNON est l'acteur sélectionné, le cadre du
   bas devient le sien — portrait, PV, et à la place de Mana/Célérité (qu'il n'a pas) une
   ligne qui dit ce qu'il a vraiment : ses charges et sa recharge. Le mini-héros du HUD
   est simplement masqué le temps de la sélection, jamais détruit. */
function buildCompanionBandHTML(actor) {
  var def = getCompanionDef(actor.companionId);
  var max = Number(actor.maxHp || 0);
  var pct = max > 0 ? Math.max(0, (actor.hp / max) * 100) : 0;

  /* v3.279.0 (retour Seb) : MÊME structure que le cadre du héros — portrait et barre de
     PV sur une rangée centrée, puis la ligne d'information en dessous, à la place qu'occupe
     sa jauge de ressource. C'est ce qui met les deux barres exactement au même endroit. */
  var h = '<div class="cbg-band">';
  h += '<div class="cbg-band-portrait"><img src="' + esc((def && def.image) || "") + '" alt="">'
    + '<span class="cbg-band-tag">' + (actor.control === "manual" ? "Manuel" : "Auto") + '</span></div>';
  h += '<div class="cbg-band-hp kgauge kgauge-dragon-claw">'
    + '<div class="kgauge-track"><div class="kgauge-fill" style="width:' + pct.toFixed(1) + '%"></div></div>'
    + '<span class="kgauge-text">' + formatNumber(Math.ceil(actor.hp)) + " / " + formatNumber(max) + '</span></div>';
  h += '</div>';

  var chargesMax = CompanionManager.chargesMax(actor.companionId);
  var dots = "";
  for (var i = 0; i < chargesMax; i++) dots += '<i class="' + (i < Number(actor.charges || 0) ? "" : "is-off") + '"></i>';
  h += '<div class="cbg-band-extra"><div class="cbg-band-line">';
  if (chargesMax) h += '<span>Charges <span class="cbg-band-dots">' + dots + '</span></span>';
  h += '<span>' + (Number(actor.cooldown || 0) > 0 ? "Recharge " + actor.cooldown + " r" : "Prêt") + '</span>';
  h += '</div></div>';
  return h;
}

/* Bascule le cadre du bas entre le héros et le compagnon sélectionné. */
function renderActorBand() {
  /* Le bouton d'attaque dit pour QUI il joue quand un compagnon est sélectionné. */
  var btn = document.getElementById("combat-attack-btn");
  if (btn && window.CombatEngine && typeof CombatEngine.hasManualAllies === "function") {
    var sel = CombatEngine.hasManualAllies() ? CombatEngine.selectedActor() : null;
    btn.textContent = (sel && sel.companionId) ? ("ATTAQUER (" + (sel.name || "") + ")") : "ATTAQUER";
  }

  var slot = document.getElementById("combat-hero-slot");
  var res = document.getElementById("class-resource-root");
  var cel = document.getElementById("combat-celerity-root");
  if (!slot) return;

  var acteur = (window.CombatEngine && CombatEngine.hasManualAllies()) ? CombatEngine.selectedActor() : null;
  var host = document.getElementById("companion-band-root");
  var cadre = document.querySelector(".cb-hero");

  /* v3.274.0 (retour Seb) : le portrait du héros ne doit PAS rester visible pendant le
     tour d'un compagnon. On pose une classe sur le cadre plutôt que des styles en ligne :
     le mini-héros est déplacé du HUD à l'exécution (relocateCombatHeroMini) et remettait
     son style à zéro au premier rendu, d'où le portrait qui revenait. */
  if (cadre) cadre.classList.toggle("is-companion-band", !!(acteur && acteur.companionId));

  if (acteur && acteur.companionId) {
    if (host) host.innerHTML = buildCompanionBandHTML(acteur);
    return;
  }
  if (host) host.innerHTML = "";
}

window.buildCompanionBandHTML = buildCompanionBandHTML;
window.renderActorBand = renderActorBand;

function selectCombatActor(actorId) {
  if (window.CombatEngine) CombatEngine.selectActor(actorId);
}

window.buildCompanionActionsHTML = buildCompanionActionsHTML;
window.companionAction = companionAction;
window.openHealTargetSheet = openHealTargetSheet;
window.closeHealTargetSheet = closeHealTargetSheet;
window.chooseHealTarget = chooseHealTarget;
window.selectCombatActor = selectCombatActor;

window.buildEnemyRowHTML = buildEnemyRowHTML;
window.renderEnemyRow = renderEnemyRow;
window.selectEnemyTarget = selectEnemyTarget;
window.buildAllyRowHTML = buildAllyRowHTML;
window.buildHeroCardHTML = buildHeroCardHTML;
window.renderAllyRow = renderAllyRow;
window.getEnemyRowBadges = getEnemyRowBadges;
