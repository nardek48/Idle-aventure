"use strict";
/* ui/hud-view.js — barre du haut (ressources, mini-portrait héros) + barre de stats sous combat. Injectés une fois au boot. Détail complet : COMMENTAIRES_ORIGINAUX.md */

/* v3.200.0 : HUD_PAGE_TITLES, updateHudPageTitle() et l'élément #hud-page-title sont retirés.
   Le titre de page était redondant depuis v3.190.0 : les bandeaux figés des kframes portent le
   titre de chaque écran (voir kframe-decorator.js). Neutralisé par CSS depuis v3.194.0 en
   attendant le resync du HUD ; le retrait propre est fait ici. La map devait par ailleurs être
   tenue à jour à chaque nouvel onglet, ce que plus personne ne faisait. */

/* v3.396.0 (lot HUD-1, atelier HUD validé par Seb le 30/09/2026, variante « C · Ornée ») :
   bandeau de pierre de 60 px — portrait et niveau, jauges PV et XP, or et ressource de la carte
   du monde. Les raccourcis (fil rouge, sac, talents) sortent du bandeau : ce sont les bulles de
   ui/hud-dock-view.js. Le mini-héros du combat (#combat-hero-mini, ids conservés) reste dans le
   HUD, rangé caché hors combat : relocateCombatHeroMini le déplace dans le panneau du combat. */
function buildHudHTML() {
  return ''
    + '<div class="hud-band">'
    +   '<button type="button" class="hud-pt" id="hud-pt" onclick="openHeroFromHud()" aria-label="' + _t("Héros") + '">'
    +     '<img id="hud-pt-img" class="hud-pt-img" src="" alt="" style="display:none">'
    +     '<span class="hud-pt-lvl" id="hud-pt-lvl">' + _t("Niv. {n}", { n: 1 }) + '</span>'
    +   '</button>'
    +   '<div class="hud-gauges">'
    +     '<div class="kgauge kgauge-thin hud-gauge is-hp" id="hud-hp"><div class="kgauge-track"><div class="kgauge-fill" id="hud-hp-fill" style="width:100%"></div></div><div class="kgauge-text" id="hud-hp-text"></div></div>'
    +     '<div class="kgauge kgauge-thin hud-gauge is-xp"><div class="kgauge-track"><div class="kgauge-fill" id="hud-xp-fill" style="width:0%"></div></div><div class="kgauge-text" id="hud-xp-text"></div></div>'
    +   '</div>'
    +   '<div class="hud-res">'
    +     '<span class="hud-res-item"><img src="images/Icons/gold_icon.png" alt="' + _t("Or") + '"><span id="hud-gold">0</span></span>'
    +     '<span class="hud-res-item" id="hud-wres" style="display:none"><img id="hud-wres-img" src="" alt=""><span id="hud-wres-num">0</span></span>'
    +   '</div>'
    + '</div>'
    + '<div id="hud-mini-park">'
    +   '<div id="combat-hero-mini" class="combat-hero-mini" role="img">'
    +     '<div class="combat-hero-mini-portrait">'
    +       '<img id="combat-hero-mini-img" class="combat-hero-mini-img" src="" alt="" style="display:none">'
    +       '<div id="combat-hero-mini-placeholder" class="combat-hero-mini-placeholder">?</div>'
    +       '<span class="combat-hero-mini-level" id="combat-hero-mini-level">' + _t("Niv. {n}", { n: 1 }) + '</span>'
    +     '</div>'
    // v3.172.0 : PV du héros sur la jauge dragon du kit. Ids conservés (renderHeroHp).
    +     '<div class="combat-hero-mini-hp-bar kgauge kgauge-dragon kgauge-hp">'
    +       '<div class="kgauge-track"><div id="combat-hero-mini-hp-fill" class="combat-hero-mini-hp-fill kgauge-fill" style="width:100%"></div></div>'
    +       '<span class="kgauge-text" id="combat-hero-mini-hp-text">10 / 10</span>'
    +     '</div>'
    +   '</div>'
    + '</div>';
}

/* v3.396.0 : toucher le portrait ouvre Héros › Résumé (les Talents ont leur bulle). */
function openHeroFromHud() {
  if (typeof setHerosSubTabSilent === "function") setHerosSubTabSilent("hero");
  if (typeof switchTab === "function") switchTab("more");
}
window.openHeroFromHud = openHeroFromHud;

/* v3.396.0 : nombres du HUD à la française. v3.397.0 : formatNumber suit la même règle ;
   le HUD garde le nombre entier jusqu'à 99 999 (la place est là). */
function hudNum(n) {
  n = Math.max(0, Math.floor(Number(n) || 0));
  return n < 100000 ? formatNumberGroup(String(n)) : formatNumber(n);
}
window.hudNum = hudNum;
window.hudHpShort = hudHpShort;

function buildStatsBarHTML() {
  return ''
    + '<div class="stat-item"><span class="stat-label"><img class=ico-inline src=images/Icons/combat_stats/stat_attack.png> ' + _t("Attaque") + '</span><span class="stat-value" id="stat-tap-dmg">1</span></div>'
    + '<div class="stat-item"><span class="stat-label"><img class=ico-inline src=images/Icons/combat_stats/stat_speed.png> ' + _t("Célérité") + '</span><span class="stat-value" id="stat-auto-dps">0</span></div>'
    + '<div class="stat-item"><span class="stat-label"><img class=ico-inline src=images/Icons/combat_stats/stat_critical.png> ' + _t("Critique") + '</span><span class="stat-value" id="stat-crit">5%</span></div>'
    + '<div class="stat-item"><span class="stat-label"><img class=ico-inline src=images/Icons/combat_stats/stat_critical.png> ' + _t("Dégâts crit.") + '</span><span class="stat-value" id="stat-crit-percent">x2.00</span></div>'
    + '<div class="stat-item"><span class="stat-label"><img class="stat-label-icon" src="images/Icons/gold_icon.png" alt="' + _t("Or") + '"> ' + _t("Or") + '</span><span class="stat-value" id="stat-gold-mult">x1.00</span></div>';
}

function mountHudAndStatsBar() {
  var hud = document.getElementById("hud");
  var statsBar = document.getElementById("stats-bar");
  if (hud) hud.innerHTML = buildHudHTML();
  if (statsBar) statsBar.innerHTML = buildStatsBarHTML();
  if (typeof mountHudDock === "function") mountHudDock(); // v3.396.0 : bulles de raccourci
}

function renderHud() {
  // v3.101.0 : régénération au camp (accrual paresseux, voir systems/camp-system.js)
  if (window.CampManager && typeof CampManager.applyRegen === "function") CampManager.applyRegen(false);
  renderHudBand();
  renderHeroHp();
  if (typeof renderHudDock === "function") renderHudDock(); // v3.396.0 : fil rouge, sac, talents
  renderHudAchievementTier(); // v3.338.0 (H4)
}

/* v3.396.0 : bandeau — chaque texte n'est réécrit que s'il change (renderHud tourne à chaque image). */
var hudBandLast = {};
function hudSet(id, prop, val) {
  if (hudBandLast[id + prop] === val) return;
  var el = document.getElementById(id);
  if (!el) return;
  hudBandLast[id + prop] = val;
  if (prop === "text") el.textContent = val;
  else if (prop === "width") el.style.width = val;
  else if (prop === "display") el.style.display = val;
  else if (prop === "src") el.src = val;
}
/* Ressource de la carte du monde en cours (Sève d'Aeswyn en Forêt, Verre des dunes au Désert) ;
   rien tant que le monde n'a pas de carte ouverte. */
function hudWorldResourceId() {
  if (!window.LivingMapManager || !window.WORLDS || !window.WorldManager) return null;
  var w = WORLDS[WorldManager.worldIndex || 0], map = w ? LivingMapManager.getMapForWorld(w.id) : null;
  return map ? LivingMapManager.getRewardResourceId(map.id) : null;
}
function renderHudBand() {
  hudSet("hud-gold", "text", hudNum(game.gold));
  var hp = Math.max(0, Math.ceil(Number(game.heroHp != null ? game.heroHp : game.heroMaxHp || 1)));
  var maxHp = Math.max(1, Math.floor(Number(game.heroMaxHp || 1)));
  var pct = Math.max(0, Math.min(100, Math.round(100 * hp / maxHp)));
  hudSet("hud-hp-fill", "width", pct + "%");
  hudSet("hud-hp-text", "text", _t("{a} / {b} PV", { a: hudNum(hp), b: hudNum(maxHp) }));
  var low = pct <= 25, hpEl = document.getElementById("hud-hp");
  if (hpEl && hudBandLast.low !== low) { hudBandLast.low = low; hpEl.classList.toggle("is-low", low); }
  // XP en nombre (choix de Seb), comme la fiche Héros
  var xp = Math.max(0, Math.floor(Number(game.heroXp || 0))), next = Math.max(1, Math.floor(Number(game.heroXpToNext || 20)));
  hudSet("hud-xp-fill", "width", Math.max(0, Math.min(100, Math.round(100 * xp / next))) + "%");
  hudSet("hud-xp-text", "text", _t("{a} / {b} XP", { a: hudNum(xp), b: hudNum(next) }));
  hudSet("hud-pt-lvl", "text", _t("Niv. {n}", { n: Number(game.heroLevel || 1) }));
  var rid = hudWorldResourceId(), def = rid && window.WAREHOUSE_RESOURCES ? WAREHOUSE_RESOURCES[rid] : null;
  hudSet("hud-wres", "display", def ? "" : "none");
  if (def) {
    hudSet("hud-wres-img", "src", def.icon);
    var img = document.getElementById("hud-wres-img");
    if (img && img.alt !== _td(def.name)) img.alt = _td(def.name);
    hudSet("hud-wres-num", "text", hudNum(window.WarehouseManager ? WarehouseManager.getAmount(rid) : 0));
  }
}

/* v3.338.0 (Hauts faits, H4) : liseré du portrait selon le palier du monde courant.
   Lu au plus une fois par seconde, classe réécrite seulement si elle change. */
var hudAchTierLast = null, hudAchTierAt = 0;
function renderHudAchievementTier() {
  var now = Date.now();
  if (now - hudAchTierAt < 1000) return;
  hudAchTierAt = now;
  // v3.396.0 : liseré posé sur le portrait du bandeau ET sur le mini-héros du combat
  var els = [document.querySelector ? document.querySelector("#combat-hero-mini .combat-hero-mini-portrait") : null, document.getElementById("hud-pt")].filter(Boolean);
  if (!els.length || !window.AchievementManager) return;
  var tier = AchievementManager.getCurrentWorldTier() || "none";
  if (tier === hudAchTierLast) return;
  els.forEach(function (el) {
    if (hudAchTierLast) el.classList.remove("hf-tier-" + hudAchTierLast);
    if (tier !== "none") el.classList.add("hf-tier-" + tier);
  });
  hudAchTierLast = tier === "none" ? null : tier;
}

/* v3.379.1 : PV du mini-héros (panneau du combat), format court qui tient dans la fenêtre de la
   jauge (~47 px sur iPhone). v3.397.0 : à la française, sans espace pour tenir (1,2k · 45k · 1,2M). */
function hudHpShort(n) {
  n = Math.max(0, Math.floor(Number(n) || 0));
  if (n < 1000) return String(n);
  if (n < 10000) return (Math.floor(n / 100) / 10).toFixed(1).replace(/\.0$/, "").replace(".", ",") + "k";
  if (n < 1000000) return Math.floor(n / 1000) + "k";
  return (Math.floor(n / 100000) / 10).toFixed(1).replace(/\.0$/, "").replace(".", ",") + "M";
}

function renderHeroHp() {
  var miniText = document.getElementById("combat-hero-mini-hp-text");
  var miniFill = document.getElementById("combat-hero-mini-hp-fill");
  if (!miniText && !miniFill) return;

  var hp = Math.max(0, Math.ceil(Number(game.heroHp != null ? game.heroHp : game.heroMaxHp || 1)));
  var maxHp = Math.max(1, Math.floor(Number(game.heroMaxHp || 1)));
  var pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  var hpText = hudHpShort(hp) + "/" + hudHpShort(maxHp); // v3.379.1 : court et sans espaces (« 623 / 895 » passait sur deux lignes)

  if (miniText) miniText.textContent = hpText;
  if (miniFill) {
    miniFill.style.width = pct + "%";
    miniFill.classList.toggle("low", pct <= 25);
  }
}

/* v3.241.0 : le mini-héros (portrait + niveau + PV, ids conservés) vit dans le HUD
   hors combat et dans le panneau héros en bas de l'écran pendant le combat. */
function relocateCombatHeroMini(intoCombat) {
  var mini = document.getElementById("combat-hero-mini");
  if (!mini) return;
  var target = intoCombat
    ? document.getElementById("combat-hero-slot")
    : document.getElementById("hud-mini-park"); // v3.396.0 : rangé caché hors combat (le bandeau a son propre portrait)
  if (target && mini.parentNode !== target) target.appendChild(mini);
}
window.relocateCombatHeroMini = relocateCombatHeroMini;

function renderCombatHeroMini() {
  var img = document.getElementById("combat-hero-mini-img");
  var placeholder = document.getElementById("combat-hero-mini-placeholder");
  var levelEl = document.getElementById("combat-hero-mini-level");
  if (!img && !placeholder && !levelEl) return;

  var hero = (typeof getHeroByGameId === "function") ? getHeroByGameId(game.heroId) : null;

  if (hero && hero.image) {
    if (img) {
      img.src = hero.image;
      img.alt = hero.name || "";
      img.style.display = "block";
    }
    if (placeholder) placeholder.style.display = "none";
  } else {
    if (img) img.style.display = "none";
    if (placeholder) placeholder.style.display = "flex";
  }

  if (levelEl) levelEl.textContent = _t("Niv. {n}", { n: Number(game.heroLevel || 1) });
  var pt = document.getElementById("hud-pt-img"); // v3.396.0 : portrait du bandeau
  if (pt) {
    if (hero && hero.image) { if (pt.getAttribute("src") !== hero.image) pt.src = hero.image; pt.alt = hero.name || ""; pt.style.display = "block"; }
    else pt.style.display = "none";
  }
}

function renderStats() {
  var tap = document.getElementById("stat-tap-dmg");
  var auto = document.getElementById("stat-auto-dps");
  var crit = document.getElementById("stat-crit");
  var critPercent = document.getElementById("stat-crit-percent");
  var gold = document.getElementById("stat-gold-mult");

  function fmt2(n) {
    return (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);
  }

  if (tap) tap.textContent = fmt2(EquipmentManager.effectiveTapDamage());
  if (auto) auto.textContent = String(Math.round((window.CombatEngine && typeof CombatEngine.getTotalCelerity === "function") ? CombatEngine.getTotalCelerity() : 0));
  if (crit) crit.textContent = fmt2(EquipmentManager.effectiveCritChance()) + "%";
  if (critPercent) critPercent.textContent = "x" + fmt2(EquipmentManager.effectiveCritMult());
  if (gold) gold.textContent = "x" + fmt2(EquipmentManager.effectiveGoldMult());
}

window.renderHud = renderHud;
window.buildHudHTML = buildHudHTML;
window.buildStatsBarHTML = buildStatsBarHTML;
window.mountHudAndStatsBar = mountHudAndStatsBar;
window.renderHeroHp = renderHeroHp;
window.renderCombatHeroMini = renderCombatHeroMini;
window.renderStats = renderStats;

function openBagFromHud() {
  if (typeof activeEquipSubTab !== "undefined") activeEquipSubTab = "inventory";
  if (typeof switchTab === "function") switchTab("equip");
}
window.openBagFromHud = openBagFromHud;