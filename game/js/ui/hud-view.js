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
    // v3.553.0 (grand écran, option A) : nom et classe du héros, format large seulement
    +   '<span class="hud-name"><strong id="hud-name-t"></strong><small id="hud-name-s"></small></span>'
    +   '<div class="hud-gauges">'
    +     '<div class="kgauge kgauge-thin hud-gauge is-hp" id="hud-hp"><div class="kgauge-track"><div class="kgauge-fill" id="hud-hp-fill" style="width:100%"></div></div><div class="kgauge-text" id="hud-hp-text"></div></div>'
    +     '<div class="kgauge kgauge-thin hud-gauge is-xp"><div class="kgauge-track"><div class="kgauge-fill" id="hud-xp-fill" style="width:0%"></div></div><div class="kgauge-text" id="hud-xp-text"></div></div>'
    +   '</div>'
    // v3.503.0 (grand écran, GE-2) : lieu dans l'Histoire et 4 ressources, montrés au format large seulement
    +   '<div class="hud-where" id="hud-where"><img id="hud-where-ico" alt=""><span class="hud-where-txt"><strong id="hud-where-t"></strong><small id="hud-where-s"></small></span></div>'
    +   '<div class="hud-res">'
    +     '<span class="hud-res-item"><img src="images/Icons/gold_icon.webp" alt="' + _t("Or") + '"><span id="hud-gold">0</span></span>'
    +     [0, 1, 2, 3].map(function (i) { return '<span class="hud-res-item hud-res-x" id="hud-rx-' + i + '"><img alt=""><span></span></span>'; }).join("")
    +     '<button type="button" class="hud-res-item hud-wh" onclick="hudOpenWarehouse()">' + _t("Entrepôt") + ' ›</button>'
    // v3.422.0 (Seb) : la ressource de la carte du monde quitte le bandeau, l'or reste seul
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
    + '<div class="stat-item"><span class="stat-label"><img class=ico-inline src=images/Icons/combat_stats/stat_attack.webp> ' + _t("Attaque") + '</span><span class="stat-value" id="stat-tap-dmg">1</span></div>'
    + '<div class="stat-item"><span class="stat-label"><img class=ico-inline src=images/Icons/combat_stats/stat_speed.webp> ' + _t("Célérité") + '</span><span class="stat-value" id="stat-auto-dps">0</span></div>'
    + '<div class="stat-item"><span class="stat-label"><img class=ico-inline src=images/Icons/combat_stats/stat_critical.webp> ' + _t("Critique") + '</span><span class="stat-value" id="stat-crit">5%</span></div>'
    + '<div class="stat-item"><span class="stat-label"><img class=ico-inline src=images/Icons/combat_stats/stat_critical.webp> ' + _t("Dégâts crit.") + '</span><span class="stat-value" id="stat-crit-percent">x2.00</span></div>'
    + '<div class="stat-item"><span class="stat-label"><img class="stat-label-icon" src="images/Icons/gold_icon.webp" alt="' + _t("Or") + '"> ' + _t("Or") + '</span><span class="stat-value" id="stat-gold-mult">x1.00</span></div>';
}

function mountHudAndStatsBar() {
  var hud = document.getElementById("hud");
  var statsBar = document.getElementById("stats-bar");
  if (hud) hud.innerHTML = buildHudHTML();
  if (statsBar) statsBar.innerHTML = buildStatsBarHTML();
  if (typeof mountHudDock === "function") mountHudDock(); // v3.396.0 : bulles de raccourci
}

/* v3.458.5 (audit O5) : renderHud tourne à chaque image (game-loop) ; la régénération se calcule
   une fois par seconde et les bulles quatre fois (renderPanel les redessine aussi, sans attendre). */
var hudRegenAt = 0, hudDockAt = 0;
function renderHud() {
  var now = Date.now();
  // v3.101.0 : régénération au camp (accrual paresseux, voir systems/camp-system.js)
  if (now - hudRegenAt >= 1000 && window.CampManager && typeof CampManager.applyRegen === "function") { hudRegenAt = now; CampManager.applyRegen(false); }
  renderHudBand();
  renderHeroHp();
  if (now - hudDockAt >= 250 && typeof renderHudDock === "function") { hudDockAt = now; renderHudDock(); } // v3.396.0 : fil rouge, sac, talents
  renderHudAchievementTier(); // v3.338.0 (H4)
  if (now - hudWideAt >= 1000 || hudWideTab !== game.activeTab) { hudWideAt = now; hudWideTab = game.activeTab; renderHudWide(); } // v3.503.0 (v3.553.0 : tout de suite au changement d'écran)
  if (window.Chronique && document.documentElement.classList.contains("wide-mode")) { if (!Chronique.el) Chronique.mount(); else Chronique.render(false); }
}

/* v3.503.0 (grand écran, GE-2) : bandeau du format large — où l'on en est dans l'Histoire, et le Bois,
   la Pierre, le Fer et le matériau du monde où se tient le héros. Le téléphone ne les affiche pas. */
var hudWideAt = 0; var hudWideTab = "";
var HUD_WORLD_MATERIAL = { forest: "seve_aeswyn", desert: "verre_des_dunes", ruins: "pierre_errante", crypt: "cire_sepulcre", mountain: "cendre_vive" };
function renderHudWide() {
  if (!document.documentElement.classList.contains("wide-mode")) return;
  var world = window.WorldManager ? WorldManager.getWorld() : null;
  var SQ = window.StoryQuestManager, cid = SQ && SQ.activeChapterIds ? SQ.activeChapterIds()[0] : null;
  var ch = cid && window.STORY_QUESTS ? STORY_QUESTS[cid] : null, step = ch ? SQ.getCurrentStep(cid) : null;
  var sub = ch ? _td(ch.title) + (step ? " · " + _t("étape {a} / {b}", { a: ch.steps.indexOf(step) + 1, b: ch.steps.length }) : "") : "";
  var where = hudWhere(world, ch, sub);
  hudSet("hud-where-t", "text", where[0]);
  hudSet("hud-where-s", "text", where[1]);
  hudSet("hud-where-ico", "src", where[2] || (ch && ch.icon) || "images/Icons/camp/campfire.webp");
  var hero = typeof getSelectedHero === "function" ? getSelectedHero() : null, cls = hero && typeof getClassForHero === "function" ? getClassForHero(hero) : null;
  hudSet("hud-name-t", "text", game.playerName || "");
  hudSet("hud-name-s", "text", cls ? _td(cls.label) : "");
  if (!window.WarehouseManager || !window.WAREHOUSE_RESOURCES) return;
  var keys = ["bois", "pierre", "fer", world && HUD_WORLD_MATERIAL[world.id]];
  keys.forEach(function (k, i) {
    var el = document.getElementById("hud-rx-" + i), def = k && WAREHOUSE_RESOURCES[k];
    if (!el) return;
    hudSet("hud-rx-" + i, "display", def ? "" : "none");
    if (!def) return;
    var n = Math.floor(WarehouseManager.getAmount(k) || 0), cap = WarehouseManager.getCap(k);
    var key = k + "|" + n + "|" + cap;
    if (el.dataset.k === key) return;
    el.dataset.k = key;
    el.querySelector("img").src = def.icon;
    el.querySelector("span").textContent = hudNum(n);
    el.title = _td(def.name) + " · " + hudNum(n) + (cap ? " / " + hudNum(cap) : "");
  });
}

/* v3.553.0 (option A) : le titre du bandeau suit l'écran ouvert (maquette atelier/grand-ecran.html) ;
   renvoie [titre, sous-titre, icône]. Hors des 5 écrans : le monde et l'étape d'Histoire. */
function hudWhere(world, ch, sub) {
  var tab = (window.game && game.activeTab) || "", wn = world ? _td(world.name) : "";
  var ico = function (t) { var im = document.querySelector('.tab-btn[data-tab="' + t + '"] img'); return im ? im.getAttribute("src") : ""; };
  if (tab === "campement") return [_t("Campement d'Aeswyn"), wn + (sub ? " · " + sub : ""), ico("campement")];
  if (tab === "quests" && ch) return [_td(ch.title), wn + " · " + sub.split(" · ").slice(1).join(" · "), ico("quests")];
  if (tab === "village") {
    var n = 0;
    if (window.PRODUCTION_BUILDINGS && window.ProductionManager) Object.keys(PRODUCTION_BUILDINGS).forEach(function (id) { if (ProductionManager.isBuildingUnlocked(id)) n++; });
    return [_t("Le village"), _tn(n, "{n} bâtiment de production", "{n} bâtiments de production"), ico("village")];
  }
  if (tab === "more") {
    var mem = window.MemoryManager ? MemoryManager.getProgress().level : 0;
    return [(game.playerName || _t("Héros")), _t("Niveau {n}", { n: Number(game.heroLevel || 1) }) + (mem ? " · " + _t("Mémoire {n}", { n: mem }) : ""), ico("more")];
  }
  if (tab === "map" && window.WORLDS) {
    var k = Math.min(WORLDS.length, (window.WorldManager ? WorldManager.worldIndex : 0) + 1);
    return [_t("Carte du monde"), _t("{n} mondes · {k} ouverts", { n: WORLDS.length, k: k }), ico("map")];
  }
  return [wn, sub, ""];
}

// Bouton « Entrepôt » du bandeau : Village › Entrepôt
function hudOpenWarehouse() {
  if (typeof isTabUnlocked === "function" && !isTabUnlocked("village")) return;
  switchTab("village");
  if (typeof setVillageSubTab === "function") setVillageSubTab("entrepot");
}
window.hudOpenWarehouse = hudOpenWarehouse;

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
}

/* v3.338.0 (Hauts faits, H4) : liseré du portrait selon le palier du monde courant.
   Lu au plus une fois par seconde, classe réécrite seulement si elle change. */
var hudAchTierLast = null, hudAchTierAt = 0;
function renderHudAchievementTier() {
  var now = Date.now();
  if (now - hudAchTierAt < 1000) return;
  hudAchTierAt = now;
  // v3.396.0 : liseré posé sur le portrait du bandeau ET sur le mini-héros du combat
  // v3.422.0 (Seb) : plus de liseré sur le portrait du bandeau (il recouvrait le niveau) ; le mini-héros du combat le garde
  var els = [document.querySelector ? document.querySelector("#combat-hero-mini .combat-hero-mini-portrait") : null].filter(Boolean);
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

  // v3.458.5 (audit O5) : réécrit seulement si la valeur change
  if (miniText && miniText.textContent !== hpText) miniText.textContent = hpText;
  if (miniFill && miniFill._pct !== pct) {
    miniFill._pct = pct;
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