"use strict";
/* ui/heros-view.js — écran Personnage (v2.75, fiche façon jeu de rôle), 3 sous-onglets Héros/Amélioration/Stats. Carrousel de 3 emplacements de héros indépendants (v3.25). Détail : COMMENTAIRES_ORIGINAUX.md */

/* v3.244.0 (chantier Navigation, décision Seb 14/09/2026) : Héros devient le hub
   « Progresser ». Sous-onglets : Résumé / Équipement / Talents. Les anciens
   sous-onglets Stats (amelioration) et Capacités (stats) deviennent des FEUILLES
   BASSES ouvertes depuis le Résumé — le Résumé reste visible derrière. */
var activeHerosSubTab = "hero"; // "hero" | "equip" | "talents"
var herosOpenSheet = null;      // null | "stats" | "abilities"

/* v3.222.0 : voir setVillageSubTab — une carte de caractéristique dépliée ne
   doit pas rester ouverte quand on revient sur l'écran. */
function setHerosSubTab(tab) {
  if (typeof expandedHeroStat !== "undefined") expandedHeroStat = null;
  // Compat v3.244.0 : les deux anciens noms ouvrent la feuille correspondante.
  if (tab === "amelioration") { openHerosSheet("stats"); return; }
  if (tab === "stats") { openHerosSheet("abilities"); return; }
  setHerosSubTabSilent(tab);
  if (typeof renderPanel === "function") renderPanel();
}

/* Positionne le sous-onglet sans rendre — pour switchTab('equip'/'talents') (ui-root.js). */
function setHerosSubTabSilent(tab) {
  if (tab === "equip" || tab === "talents") activeHerosSubTab = tab;
  else activeHerosSubTab = "hero";
}

/* v3.203.0 : buildCharacterAbilityCardHTML() et buildCharacterAbilitiesHTML()
   retirées. Elles rendaient les capacités en cartes fermées, sans dire QUAND
   s'en servir. Remplacées par buildHeroSkillCardHTML(), qui déplie les contres
   du Grimoire. Plus aucun appelant dans js/ ni dans index.html. */

/* v3.202.0 : le carrousel d'emplacements et ses trois actions (sélection,
   création, suppression) sont RETIRÉS de cet écran. Ils dupliquaient, en
   moins complet, la gestion d'emplacements de l'écran titre
   (ui/title-screen-view.js : monde, temps de jeu, date de sauvegarde,
   confirmation de suppression dédiée), avec des window.confirm() natifs
   étrangers au reste de l'app. Le bouton "Mes héros" du Résumé ouvre
   désormais cet écran-là : un seul endroit gère les emplacements. */

function buildPcStatRowHTML(icon, label, value) {
  return ''
    + '<div class="pc-stat-row">'
    + '<span class="pc-stat-icon">' + renderIconOrEmojiHTML(icon, "pc-stat-ico-img", "") + '</span>'
    + '<span class="pc-stat-label">' + esc(label) + '</span>'
    + '<span class="pc-stat-value">' + esc(value) + '</span>'
    + '</div>';
}

/* v3.202.0 — ÉCRAN 1 : RÉSUMÉ (maquette atelier-heros.html, validée par Seb).
   Cet écran ne fait que LIRE : aucun achat, aucun dépliage, seulement des
   sorties. C'est ce qui lui permet de tenir sur une hauteur d'écran, ce que
   l'ancienne fiche suivie du carrousel ne faisait pas.
   Ce qu'il apporte par rapport à l'ancienne fiche :
     - la CLASSE et sa ressource, affichées nulle part depuis v3.34.0 ;
     - deux raccourcis renseignés vers les deux autres sous-onglets ;
     - une sortie vers la gestion d'emplacements, au lieu du carrousel. */

/* Ressource de classe (Rage / Concentration / Mana). Lecture SEULE de
   game.classResource : on n'appelle pas ensureForCurrentClass() ici, un écran
   d'affichage n'a pas à créer d'état de combat. Hors combat la valeur est
   nulle, et c'est très bien : la jauge dit ce que le héros EST, pas ce qu'il
   a en réserve à cet instant. */
function getHeroSummaryResource(cls) {
  if (!cls || !cls.resource) return null;
  var state = game.classResource;
  var sameClass = !!(state && state.classId === cls.id);
  var current = (sameClass && typeof state.current === "number") ? state.current : 0;
  var max = (sameClass && state.max) ? state.max : Number(cls.resource.max || 100);
  return { label: cls.resource.label, current: current, max: Math.max(1, max) };
}

/* Marge d'entraînement restante, tous entraînements confondus. Alimente le
   raccourci "Stats" : sans ce chiffre, le raccourci serait une flèche muette. */
function getHeroTrainingProgress() {
  if (typeof UPGRADES === "undefined") return null;
  var done = 0, total = 0;
  UPGRADES.forEach(function (u) {
    if (HEROS_TRAINING_UPGRADE_IDS.indexOf(u.id) === -1) return;
    done += Number((game.upgrades && game.upgrades[u.id]) || 0);
    total += Number(u.maxLevel || 0);
  });
  if (total <= 0) return null;
  return {
    done: done,
    total: total,
    left: Math.max(0, total - done),
    pct: Math.max(0, Math.min(100, Math.round((done / total) * 100)))
  };
}

function buildHeroSummaryGaugeHTML(tag, cssClass, pct, text, extraClass) {
  return '<div class="pc-sum-gauge-row"><span class="pc-sum-gauge-tag">' + esc(tag) + '</span>'
    + '<div class="kgauge kgauge-thin ' + cssClass + (extraClass || "") + '">'
    + '<div class="kgauge-track"><div class="kgauge-fill" style="width:' + pct + '%"></div></div>'
    + '<span class="kgauge-text">' + esc(text) + '</span></div></div>';
}

function buildHeroSummaryIdentityHTML(hero) {
  var cls = (typeof getClassForHero === "function") ? getClassForHero(hero) : null;
  var heroLevel = Number(game.heroLevel || 1);
  var heroXp = Number(game.heroXp || 0);
  var heroXpToNext = Math.max(1, Number(game.heroXpToNext || 20));
  var xpPct = Math.max(2, Math.min(100, Math.round((heroXp / heroXpToNext) * 100)));

  var h = '<div class="pc-sum-ident">';

  h += '<div class="pc-sum-portrait' + (cls ? ' is-class-' + esc(cls.id) : '') + '">';
  if (hero && hero.image) {
    h += '<img src="' + esc(hero.image) + '" alt="' + esc(hero.name) + '">';
  } else {
    h += '<div class="pc-portrait-placeholder">?</div>';
  }
  h += '<div class="pc-sum-lvl">Niveau ' + esc(heroLevel) + '</div>';
  h += '</div>';

  h += '<div class="pc-sum-col">';
  h += '<div class="pc-sum-name">' + esc(game.playerName || (hero ? hero.name : "Sans nom")) + '</div>';

  if (cls) {
    h += '<div class="pc-sum-class is-class-' + esc(cls.id) + '">' + renderIconOrEmojiHTML(cls.icon, "pc-sum-class-ico", cls.label) + ' ' + esc(cls.label);
    if (cls.resource && cls.resource.label) {
      h += '<span class="pc-sum-class-res">' + esc(cls.resource.label) + '</span>';
    }
    h += '</div>';
  }

  h += '<div class="pc-sum-gauges">';
  h += buildHeroSummaryGaugeHTML("EXP", "kgauge-xp", xpPct,
    formatNumber(heroXp) + " / " + formatNumber(heroXpToNext));
  var res = getHeroSummaryResource(cls);
  if (res) {
    h += buildHeroSummaryGaugeHTML(res.label, "", Math.round((res.current / res.max) * 100),
      formatNumber(res.current) + " / " + formatNumber(res.max),
      res.current <= 0 ? " is-res-empty" : "");
  }
  h += '</div>';

  h += '</div></div>';
  return h;
}

function buildHeroSummaryCellHTML(label, value, hint) {
  return '<div class="pc-sum-cell"><div class="pc-sum-cell-lbl">' + esc(label) + '</div>'
    + '<div class="pc-sum-cell-val">' + esc(value) + '</div>'
    + (hint ? '<div class="pc-sum-cell-hint">' + esc(hint) + '</div>' : '') + '</div>';
}

/* v3.228.0 : nom de la stat principale de la classe, avec le libellé de l'écran
   Amélioration (« Force », pas « Puissance »). Vide si la règle n'est pas chargée. */
function getHeroMainStatLabel() {
  if (typeof getHeroMainStat !== "function") return "";
  var key = getHeroMainStat(game.heroId).stat;
  for (var i = 0; i < HEROS_STAT_ROWS.length; i++) {
    if (HEROS_STAT_ROWS[i].key === key) return HEROS_STAT_ROWS[i].name;
  }
  return "";
}

/* Les cinq valeurs de combat, telles que le moteur les lit. Mêmes sources
   que l'ancienne fiche : aucune formule nouvelle ici. La PROVENANCE de ces
   valeurs sera le sujet du sous-onglet Stats, pas de celui-ci. */
function buildHeroSummaryCombatHTML() {
  var heroMaxHp = Math.max(1, Math.floor(Number(game.heroMaxHp || 1)));
  var atk = (typeof EquipmentManager !== "undefined") ? EquipmentManager.effectiveTapDamage() : 0;
  var defPct = Math.round(Number(game.heroDefensePct || 0) * 100);
  var vit = Math.round((window.CombatEngine && typeof CombatEngine.getTotalCelerity === "function")
    ? CombatEngine.getTotalCelerity() : 0);
  var critPct = (typeof EquipmentManager !== "undefined")
    ? (Math.round(EquipmentManager.effectiveCritChance() * 10) / 10) : 0;
  var critMult = (typeof EquipmentManager !== "undefined")
    ? (Math.round(EquipmentManager.effectiveCritMult() * 100) / 100) : 1;

  var h = '<div class="pc-section-label">En combat</div>';
  h += '<div class="pc-sum-combat">';
  h += buildHeroSummaryCellHTML("PV", formatNumber(heroMaxHp));
  h += buildHeroSummaryCellHTML("ATK", formatNumber(atk), getHeroMainStatLabel()); // v3.228.0 : quelle stat porte les dégâts
  h += buildHeroSummaryCellHTML("VIT", formatNumber(vit));
  h += '<div class="pc-sum-cell is-wide">';
  h += '<span class="pc-sum-cell-lbl">DÉFENSE</span><span class="pc-sum-cell-val">' + defPct + ' %</span>';
  h += '<span class="pc-sum-cell-lbl">CRITIQUE</span><span class="pc-sum-cell-val">' + esc(critPct) + ' % · ×' + esc(critMult) + '</span>';
  h += '</div>';
  h += '</div>';
  return h;
}

/* Raccourcis vers les deux autres sous-onglets. Chacun porte l'information
   qui donne une raison d'y aller : marge d'entraînement d'un côté, aperçu du
   kit de classe de l'autre. */
function buildHeroSummaryJumpsHTML() {
  var h = '<div class="pc-section-label">Aller plus loin</div>';

  var prog = getHeroTrainingProgress();
  h += '<button type="button" class="pc-sum-jump" onclick="openHerosSheet(\'stats\')">';
  h += '<span class="pc-sum-jump-ico"><img class=ico-inline src=images/Icons/subtabs/hero_stats.png></span>';
  h += '<span class="pc-sum-jump-txt"><span class="pc-sum-jump-t">Stats</span>';
  h += '<span class="pc-sum-jump-s">' + (prog
    ? (prog.left > 0
      ? formatNumber(prog.left) + " niveaux d\u2019entraînement restants"
      : "Tout est entraîné au maximum")
    : "Entraînement") + '</span></span>';
  if (prog) {
    h += '<span class="pc-sum-jump-prog"><span class="pc-sum-jump-pct">' + prog.pct + ' %</span>';
    h += '<span class="pc-sum-bar' + (prog.left === 0 ? ' is-capped' : '') + '">'
      + '<i style="width:' + Math.max(2, prog.pct) + '%"></i></span></span>';
  }
  h += '<span class="pc-sum-jump-chev">›</span>';
  h += '</button>';

  var actions = [];
  if (window.ClassCombatManager && typeof ClassCombatManager.getAction === "function") {
    ["skill1", "skill2", "skill3", "defense"].forEach(function (slot) {
      var a = ClassCombatManager.getAction(slot);
      if (a) actions.push(a);
    });
  }
  h += '<button type="button" class="pc-sum-jump" onclick="openHerosSheet(\'abilities\')">';
  h += '<span class="pc-sum-jump-ico"><img class=ico-inline src=images/Icons/combat_stats/stat_attack.png></span>';
  h += '<span class="pc-sum-jump-txt"><span class="pc-sum-jump-t">Capacités</span>';
  h += '<span class="pc-sum-jump-s">' + (actions.length
    ? actions.length + " technique" + (actions.length > 1 ? "s" : "")
    : "Aucune capacité") + '</span></span>';
  if (actions.length) {
    // CLASS_ACTION_ICON_FALLBACK contient des CHEMINS D'IMAGE, pas des emojis
    // (class-combat-system.js) : esc() les affichait tels quels. On passe par
    // renderIconOrEmojiHTML, qui gère les deux cas — même helper que les
    // cartes de capacité plus haut dans ce fichier.
    h += '<span class="pc-sum-jump-kit">';
    actions.forEach(function (a) {
      var icon = (typeof CLASS_ACTION_ICON_FALLBACK !== "undefined" && CLASS_ACTION_ICON_FALLBACK[a.id])
        || (a.type === "defense" ? "images/Icons/combat_stats/stat_defense.png" : "images/Icons/scene/node_discovery.png");
      h += '<span>' + renderIconOrEmojiHTML(icon, "pc-sum-jump-kit-ico", a.label || "") + '</span>';
    });
    h += '</span>';
  }
  h += '<span class="pc-sum-jump-chev">›</span>';
  h += '</button>';

  // v3.244.0 : l'Ascension quitte le menu ☰ — c'est une étape de progression du héros,
  // elle s'ouvre d'ici. Même verrou d'Histoire que l'ancienne case de menu.
  if (typeof isTabUnlocked !== "function" || isTabUnlocked("ascension")) {
    var aetherNow = Number(game.aether || 0);
    h += '<button type="button" class="pc-sum-jump" onclick="switchTab(\'ascension\')">';
    h += '<span class="pc-sum-jump-ico"><img class=ico-inline src=images/Icons/subtabs/ascension_tab.png></span>';
    h += '<span class="pc-sum-jump-txt"><span class="pc-sum-jump-t">Ascension</span>';
    h += '<span class="pc-sum-jump-s">' + formatNumber(aetherNow) + ' Aether · ' + formatNumber(game.cycleCount || 0) + ' ascension' + ((game.cycleCount || 0) > 1 ? 's' : '') + '</span></span>';
    h += '<span class="pc-sum-jump-chev">›</span>';
    h += '</button>';
  }

  return h;
}

function buildHeroFicheHTML() {
  var hero = getSelectedHero();

  var h = buildHeroSummaryIdentityHTML(hero);
  h += buildHeroSummaryCombatHTML();
  h += buildHeroSummaryJumpsHTML();

  h += '<div class="pc-sum-foot">';
  h += '<button class="settings-btn" type="button" onclick="openHeroSlotsScreen()"><img class=ico-inline src=images/Icons/subtabs/hero_roster.png> Mes héros</button>';
  // v3.244.0 : le bouton « Équipement » est parti — c'est un sous-onglet de cet écran.
  h += '</div>';

  return '<div class="nb-page-frame kframe-page" data-kf-title="images/Icons/combat_stats/stat_defense.png|R\u00e9sum\u00e9">' + h + '</div>';
}

/* Ouvre l'écran titre directement sur "Charger une partie", qui est la gestion
   d'emplacements complète et déjà éprouvée. openTitleScreen() prend un callback
   résolu au retour : on se contente de re-rendre, HeroSlotManager.switchToSlot()
   ayant déjà sauvegardé la partie quittée et chargé la nouvelle. */
function openHeroSlotsScreen() {
  if (typeof openTitleScreen !== "function" || typeof titleScreenShowLoad !== "function") return;
  openTitleScreen(function () {
    if (typeof renderAll === "function") renderAll();
  });
  titleScreenShowLoad(true); // true : ouvert depuis le jeu, le retour ramène au jeu
}

var HEROS_TRAINING_UPGRADE_IDS = [
  "utrain_power",
  "utrain_endurance",
  "utrain_celerity",
  "utrain_precision",
  "utrain_will"
];


/* =====================================================================
   v3.203.0 — SOUS-ONGLET STATS (écran 2 sur 3, maquette validée par Seb)

   La stat et son achat vivent sur la MÊME carte. Avant, l'écran des stats
   dérivées (PV/ATK/DEF/VIT/CRIT) et l'écran d'entraînement (Puissance,
   Endurance, Célérité, Précision, Volonté) étaient deux onglets distincts
   et RIEN ne les reliait : le joueur qui achetait "+1 Précision" ne pouvait
   savoir nulle part ce que ça faisait sur "CRIT".

   Chaque carte porte donc, de gauche à droite : la stat, CE QU'ELLE PRODUIT
   dans le vocabulaire du combat, sa valeur, sa progression vers le plafond
   RÉEL d'upgrades.js, et son prix. Dépliée, elle donne la provenance des
   points et le gain du prochain achat.
   ===================================================================== */

var expandedHeroStat = null;

function toggleHeroStat(key) {
  expandedHeroStat = (expandedHeroStat === key) ? null : key;
  if (typeof renderPanel === "function") renderPanel();
}

/* Table des cinq lignes. `read` renvoie la valeur dérivée TELLE QUE LE JEU
   la calcule : on appelle les mêmes accesseurs que le combat, jamais une
   formule recopiée. `fmt` ne sert qu'à l'affichage.
   Endurance produit deux choses (PV et Défense) : les PV sont la valeur de
   tête, la Défense apparaît dans le corps déplié. */
var HEROS_STAT_ROWS = [
  {
    key: "power", upgradeId: "utrain_power", trainedKey: "power",
    name: "Force", icon: "./images/Icons/improvement_icons/power.png",
    produces: "Dégâts de l'attaque de base", unit: "ATK",
    read: function () { return (typeof EquipmentManager !== "undefined") ? EquipmentManager.effectiveTapDamage() : 0; },
    fmt: function (v) { return "ATK " + formatNumber(Math.round(v)); },
    fmtDelta: function (d) { return "+" + formatNumber(Math.round(d)) + " ATK"; }
  },
  {
    key: "endurance", upgradeId: "utrain_endurance", trainedKey: "endurance",
    name: "Endurance", icon: "./images/Icons/improvement_icons/endurance.png",
    produces: "Points de vie", unit: "PV",
    read: function () { return Number(game.heroMaxHp || 0); },
    fmt: function (v) { return "PV " + formatNumber(Math.round(v)); },
    fmtDelta: function (d) { return "+" + formatNumber(Math.round(d)) + " PV"; },
    extra: function () { return "Défense : " + Math.round(Number(game.heroDefensePct || 0) * 100) + " %"; }
  },
  {
    key: "celerity", upgradeId: "utrain_celerity", trainedKey: "celerity",
    name: "Célérité", icon: "./images/Icons/improvement_icons/celerity.png",
    produces: "Vitesse de remplissage de la jauge", unit: "VIT",
    read: function () {
      return (window.CombatEngine && typeof CombatEngine.getTotalCelerity === "function")
        ? CombatEngine.getTotalCelerity() : 0;
    },
    fmt: function (v) { return "VIT " + formatNumber(Math.round(v)); },
    fmtDelta: function (d) { return "+" + formatNumber(Math.round(d)) + " VIT"; }
  },
  {
    key: "precision", upgradeId: "utrain_precision", trainedKey: "precision",
    name: "Précision", icon: "./images/Icons/improvement_icons/accuracy.png",
    produces: "Chance de coup critique", unit: "CRIT",
    read: function () { return (typeof EquipmentManager !== "undefined") ? EquipmentManager.effectiveCritChance() : 0; },
    fmt: function (v) { return "CRIT " + (Math.round(v * 10) / 10) + " %"; },
    fmtDelta: function (d) { return "+" + (Math.round(d * 10) / 10) + " % de critique"; }
  },
  {
    key: "will", upgradeId: "utrain_will", trainedKey: "will",
    name: "Volonté", icon: "./images/Icons/improvement_icons/will.png",
    produces: "Puissance des coups critiques", unit: "CRIT ×",
    read: function () { return (typeof EquipmentManager !== "undefined") ? EquipmentManager.effectiveCritMult() : 0; },
    fmt: function (v) { return "CRIT × " + (Math.round(v * 100) / 100); },
    fmtDelta: function (d) { return "+" + (Math.round(d * 100) / 100) + " au multiplicateur"; }
  }
];

/* v3.224.0 (D11) : vue d'une ligne selon la classe. La stat principale (Célérité
   du Rôdeur, Volonté du Mage) produit d'abord des dégâts : elle prend la tête
   « ATK » de la Force, et son rôle universel (VIT, CRIT ×) passe en repli, comme
   Endurance affiche PV puis Défense. Force reste « ATK » pour tous (rôle universel).
   Les autres lignes sont renvoyées telles quelles. */
function getHeroStatRowView(row) {
  var rule = (typeof getHeroMainStat === "function") ? getHeroMainStat(game.heroId) : null;
  var isMain = !!rule && rule.stat === row.key;
  if (!isMain || row.key === "power") {
    return Object.assign({}, row, { isMain: isMain });
  }
  var universal = row;
  return Object.assign({}, row, {
    isMain: true,
    produces: "Dégâts de l'attaque de base",
    unit: "ATK",
    read: function () { return (typeof EquipmentManager !== "undefined") ? EquipmentManager.effectiveTapDamage() : 0; },
    fmt: function (v) { return "ATK " + formatNumber(Math.round(v)); },
    fmtDelta: function (d) { return "+" + formatNumber(Math.round(d)) + " ATK"; },
    extra: function () { return universal.produces + " : " + universal.fmt(universal.read()).replace(universal.unit + " ", ""); },
    /* Sonde du premier palier visible : un niveau fait déjà bouger le rôle universel (VIT, CRIT ×)
       même quand l'ATK arrondi ne bouge pas encore — sinon « visible à partir de 25 niveaux » mentirait. */
    probeRead: function () { return EquipmentManager.effectiveTapDamage() * 1000 + universal.read(); }
  });
}

function getHeroStatUpgrade(upgradeId) {
  if (typeof UPGRADES === "undefined") return null;
  for (var i = 0; i < UPGRADES.length; i++) {
    if (UPGRADES[i].id === upgradeId) return UPGRADES[i];
  }
  return null;
}

/* Gain du prochain achat, obtenu par SIMULATION sur le vrai moteur et non
   par une formule recopiée : on pousse temporairement le niveau d'upgrade,
   on appelle StatsSystem.recalcStats() — qui recompose entièrement les stats
   à chaque appel, c'est sa nature — on relit la valeur dérivée, puis on
   restaure. Aucun coefficient de stats-system.js n'est dupliqué ici, donc un
   rééquilibrage futur ne pourra pas faire mentir cet écran.
   Le try/finally garantit la restauration même si un accesseur lève.
   game.heroHp est sauvegardé parce que recalcStats le rabote sur heroMaxHp. */
function getHeroStatGainPreview(row, buyAmount) {
  var upgrade = getHeroStatUpgrade(row.upgradeId);
  if (!upgrade || typeof StatsSystem === "undefined" || typeof StatsSystem.recalcStats !== "function") return null;
  if (typeof getUpgradePurchasePreview !== "function") return null;

  var preview = getUpgradePurchasePreview(upgrade, buyAmount);
  var count = Number(preview.count || 0);
  if (count <= 0) return null;

  var before = row.read();
  var savedLevel = Number((game.upgrades && game.upgrades[row.upgradeId]) || 0);
  var savedHp = game.heroHp;
  var after = before;

  try {
    game.upgrades[row.upgradeId] = savedLevel + count;
    StatsSystem.recalcStats();
    after = row.read();
  } finally {
    game.upgrades[row.upgradeId] = savedLevel;
    game.heroHp = savedHp;
    StatsSystem.recalcStats();
  }

  return { count: count, delta: after - before, totalCost: Number(preview.totalCost || 0) };
}

/* Combien de niveaux faut-il pour que la valeur dérivée BOUGE réellement ?
   Nécessaire parce que plusieurs valeurs sont plancherisées : un niveau de
   Force vaut +0,2 de dégât brut, or effectiveTapDamage() fait un Math.floor,
   donc un achat x1 affiche "+0 ATK". Exact, mais inutile au joueur, et même
   décourageant. On cherche donc le premier palier qui produit un changement
   visible, et on le lui dit.
   Recherche sur une échelle courte (1, 2, 5, 10, 25, 50) plutôt qu'un
   balayage : six recalculs au pire, seulement quand le gain arrondi est nul,
   et jamais au-delà du plafond de l'amélioration. */
var HEROS_GAIN_PROBE_STEPS = [1, 2, 5, 10, 25, 50];

function getHeroStatFirstVisibleStep(row) {
  var upgrade = getHeroStatUpgrade(row.upgradeId);
  if (!upgrade || typeof StatsSystem === "undefined") return null;

  var savedLevel = Number((game.upgrades && game.upgrades[row.upgradeId]) || 0);
  var maxLevel = Number(upgrade.maxLevel || 0);
  var savedHp = game.heroHp;
  var probe = (typeof row.probeRead === "function") ? row.probeRead : row.read; // v3.224.0
  var before = probe();
  var found = null;

  try {
    for (var i = 0; i < HEROS_GAIN_PROBE_STEPS.length; i++) {
      var step = HEROS_GAIN_PROBE_STEPS[i];
      if (maxLevel > 0 && savedLevel + step > maxLevel) break;
      game.upgrades[row.upgradeId] = savedLevel + step;
      StatsSystem.recalcStats();
      if (Math.abs(probe() - before) >= 0.005) { found = step; break; }
    }
  } finally {
    game.upgrades[row.upgradeId] = savedLevel;
    game.heroHp = savedHp;
    StatsSystem.recalcStats();
  }

  return found;
}


/* Sources de bonus, mesurées une par une sur le VRAI moteur.

   La maquette faisait de l'équipement, des talents et de l'Aether des lignes de
   la STAT ("Épée de garnison +34" sur la Force). Le code dit autre chose : une
   épée n'ajoute pas de Force, elle ajoute des dégâts plats et un multiplicateur
   (stats-system.js). Une stat RPG ne reçoit que sa base et son entraînement.
   Ces bonus existent bien, mais sur la valeur PRODUITE — c'est donc là qu'ils
   sont affichés.

   Chaque contribution est obtenue en neutralisant temporairement sa source et
   en relisant la valeur : "voilà ce que tu perdrais sans". Pas de somme
   affichée, parce que ces bonus se composent en partie multiplicativement et
   qu'un total additif serait faux.

   Les potions et les afflictions sont volontairement absentes : elles sont
   temporaires, elles n'ont pas leur place dans une fiche de progression. */
var HEROS_STAT_SOURCES = [
  {
    id: "training", label: "Entraînement",
    off: function () {
      var saved = {};
      HEROS_TRAINING_UPGRADE_IDS.forEach(function (id) {
        saved[id] = game.upgrades[id] || 0;
        game.upgrades[id] = 0;
      });
      return saved;
    },
    on: function (saved) {
      HEROS_TRAINING_UPGRADE_IDS.forEach(function (id) { game.upgrades[id] = saved[id]; });
    }
  },
  {
    id: "gear", label: "Équipement",
    off: function () { var saved = game.equipped; game.equipped = {}; return saved; },
    on: function (saved) { game.equipped = saved; }
  },
  {
    id: "talents", label: "Talents",
    off: function () { var saved = game.talents; game.talents = {}; return saved; },
    on: function (saved) { game.talents = saved; }
  },
  {
    id: "ascension", label: "Ascension",
    off: function () { var saved = game.ascensionCount; game.ascensionCount = 0; return saved; },
    on: function (saved) { game.ascensionCount = saved; }
  },
  {
    id: "aether", label: "Aether",
    off: function () { var saved = game.aetherUpgrades; game.aetherUpgrades = {}; return saved; },
    on: function (saved) { game.aetherUpgrades = saved; }
  }
];

/* Renvoie [{label, delta}] pour les sources qui pèsent réellement sur cette
   valeur. Cinq recalculs, uniquement sur la carte dépliée. Même discipline que
   getHeroStatGainPreview : try/finally, et game.heroHp sauvegardé parce que
   recalcStats() le rabote sur heroMaxHp. */
function getHeroStatSources(row) {
  if (typeof StatsSystem === "undefined" || typeof StatsSystem.recalcStats !== "function") return [];

  var total = row.read();
  var savedHp = game.heroHp;
  var out = [];

  HEROS_STAT_SOURCES.forEach(function (src) {
    var saved = null;
    var sans = total;
    try {
      saved = src.off();
      StatsSystem.recalcStats();
      sans = row.read();
    } finally {
      src.on(saved);
      game.heroHp = savedHp;
      StatsSystem.recalcStats();
    }
    var delta = total - sans;
    if (Math.abs(delta) >= 0.005) out.push({ label: src.label, delta: delta });
  });

  return out;
}

function buildHeroStatCardHTML(row, buyAmount) {
  var upgrade = getHeroStatUpgrade(row.upgradeId);
  if (!upgrade) return "";

  var level = Number((game.upgrades && game.upgrades[row.upgradeId]) || 0);
  var hardMax = Number(upgrade.maxLevel || 0);
  /* v3.213.1 (lot V-2) : la barre et le plafond affichés suivent le TERRAIN
     D'ENTRAÎNEMENT, plus le maximum absolu d'upgrades.js. Deux murs
     différents, deux messages différents : « Plafond » quand il ne reste
     qu'à bâtir, « Maximum » quand il n'y a plus rien après. */
  var cap = (typeof getUpgradeCap === "function") ? Number(getUpgradeCap(upgrade)) : hardMax;
  var maxLevel = cap;
  var atHardMax = hardMax > 0 && level >= hardMax;
  var capped = cap > 0 && level >= cap;
  var locked = (WorldManager.worldIndex || 0) < (upgrade.unlockWorld || 0);
  var open = expandedHeroStat === row.key;

  var hero = getSelectedHero();
  var base = (hero && hero.stats) ? Number(hero.stats[row.trainedKey]) || 0 : 0;
  var trained = Number((game.trainedStats && game.trainedStats[row.trainedKey]) || 0);
  var pctLevel = maxLevel > 0 ? Math.max(0, Math.min(100, Math.round((level / maxLevel) * 100))) : 0;

  var gain = (!capped && !locked) ? getHeroStatGainPreview(row, buyAmount) : null;
  var nextCost = (typeof getUpgradeCost === "function") ? getUpgradeCost(upgrade, level) : 0;

  var h = '<div class="pc-stat-card' + (open ? ' is-open' : '') + (capped ? ' is-capped' : '') + '">';

  h += '<div class="pc-stat-card-head">';
  h += '<button type="button" class="pc-stat-card-id" onclick="toggleHeroStat(\'' + esc(row.key) + '\')">';
  h += renderIconOrEmojiHTML(row.icon, "pc-stat-card-ico", row.name);
  h += '<span class="pc-stat-card-texts">';
  h += '<span class="pc-stat-card-name">' + esc(row.name)
    + (row.isMain ? ' <span class="pc-stat-card-main">principale</span>' : '') + '</span>';
  h += '<span class="pc-stat-card-out">' + esc(row.fmt(row.read())) + '</span>';
  h += '</span>';
  h += '<span class="pc-stat-card-num">';
  h += '<span class="pc-stat-card-total">' + formatNumber(base + trained) + '</span>';
  h += '<span class="pc-stat-card-cap">' + level + ' / ' + (maxLevel || "∞") + '</span>';
  h += '</span>';
  h += '<span class="pc-stat-card-chev">›</span>';
  h += '</button>';

  if (atHardMax) {
    h += '<div class="pc-stat-card-buy is-capped">Maximum<small>atteint</small></div>';
  } else if (capped) {
    /* Le mur pointe vers sa solution : un clic ouvre le Village, là où se
       bâtit le Terrain. */
    h += '<button type="button" class="pc-stat-card-buy is-training-wall" onclick="goToTrainingGround()">Terrain<small>à améliorer</small></button>';
  } else if (locked) {
    h += '<div class="pc-stat-card-buy is-locked">Monde<small>' + ((upgrade.unlockWorld || 0) + 1) + '</small></div>';
  } else if (gain) {
    h += '<button type="button" class="pc-stat-card-buy" onclick="buyUpgrade(\'' + esc(row.upgradeId) + '\', ' + buyAmount + ')">';
    h += formatNumber(gain.totalCost) + '<small>or · x' + gain.count + '</small></button>';
  } else {
    h += '<div class="pc-stat-card-buy is-poor">' + formatNumber(nextCost) + '<small>or manquant</small></div>';
  }
  h += '</div>';

  h += '<div class="pc-stat-card-bar' + (capped ? ' is-capped' : '') + '"><i style="width:' + pctLevel + '%"></i></div>';

  if (open) {
    h += '<div class="pc-stat-card-body">';
    h += '<div class="pc-stat-break">';
    h += '<div class="pc-stat-break-row"><span>Base du héros</span><span>+' + formatNumber(base) + '</span></div>';
    h += '<div class="pc-stat-break-row' + (trained === 0 ? ' is-zero' : '') + '"><span>Entraînement (niveau ' + level + ')</span><span>+' + formatNumber(trained) + '</span></div>';
    h += '<div class="pc-stat-break-row is-total"><span>' + esc(row.produces) + '</span><span>' + esc(row.fmt(row.read())) + '</span></div>';
    if (typeof row.extra === "function") {
      h += '<div class="pc-stat-break-row"><span>Aussi</span><span>' + esc(row.extra()) + '</span></div>';
    }
    h += '</div>';

    // Ce que chaque source apporte à la valeur produite, mesuré en la
    // neutralisant. Masqué s'il n'y a rien à montrer (héros neuf sans
    // équipement, sans talent et sans Aether) : un bloc vide n'apprend rien.
    var sources = getHeroStatSources(row);
    if (sources.length) {
      h += '<div class="pc-stat-sources">';
      h += '<div class="pc-stat-sources-lbl">Ce que chaque source t\'apporte</div>';
      sources.forEach(function (src) {
        h += '<div class="pc-stat-break-row"><span>' + esc(src.label) + '</span><span>'
          + esc(row.fmtDelta(src.delta)) + '</span></div>';
      });
      h += '</div>';
    }
    if (gain && Math.abs(gain.delta) >= 0.005) {
      h += '<div class="pc-stat-next"><img class=ico-inline src=images/Icons/system/upgrade.png> ' + esc(row.fmtDelta(gain.delta)) + ' pour ' + formatNumber(gain.totalCost) + ' or</div>';
    } else if (gain) {
      // Gain réel mais invisible après arrondi : on dit à partir de combien il
      // se verra, plutôt que d'afficher un "+0" décourageant.
      var step = getHeroStatFirstVisibleStep(row);
      h += '<div class="pc-stat-next is-slow">' + (step
        ? 'Effet visible à partir de ' + step + ' niveau' + (step > 1 ? 's' : '') + ' d\'un coup.'
        : 'Le gain est trop fin pour se voir sur un seul achat.') + '</div>';
    } else if (capped) {
      h += '<div class="pc-stat-next is-done">Cette stat est entraînée au maximum.</div>';
    }
    h += '</div>';
  }

  h += '</div>';
  return h;
}

function buildHerosAmeliorationHTML() {
  if (typeof UPGRADES === "undefined") {
    return '<div class="pc-empty">Entraînement indisponible.</div>';
  }

  var buyAmount = Number(game.shopBuyAmount || 1);
  if ([1, 10, 25, -1].indexOf(buyAmount) === -1) buyAmount = 1;

  var h = '';
  // v3.202.1 : titre du cadre aligné sur le libellé du sous-onglet. Le bas de
  // l'écran disait "Stats" et le bandeau "Amélioration" : le joueur tapait un
  // nom et arrivait sur un autre.
  // v3.244.0 : le corps est rendu dans une feuille basse — plus de cadre de page.
  h += '<div class="pc-heros-train-section">';

  h += '<div class="pc-stat-gold"><img src="images/Icons/gold_icon.png" alt=""> ' + formatNumber(game.gold || 0) + '</div>';

  // .shop-buy-toolbar : c'est ce conteneur qui porte l'état actif du bouton
  // (css/04-panel-village-shop.css). Conservé tel quel de l'ancien écran.
  h += '<div class="pc-heros-train-toolbar"><div class="shop-buy-toolbar">';
  [[1, "x1"], [10, "x10"], [25, "x25"], [-1, "MAX"]].forEach(function (b) {
    h += '<button class="settings-btn ' + (buyAmount === b[0] ? 'active' : '') + '" onclick="setShopBuyAmount(' + b[0] + ')">' + b[1] + '</button>';
  });
  h += '</div></div>';

  h += '<div class="pc-stat-list-v2">';
  HEROS_STAT_ROWS.forEach(function (row) { h += buildHeroStatCardHTML(getHeroStatRowView(row), buyAmount); });
  h += '</div>';

  h += '</div>';
  return h;
}

/* =====================================================================
   v3.203.0 — SOUS-ONGLET CAPACITÉS (écran 3 sur 3)

   Les cartes étaient déjà là, mais fermées : le joueur voyait un nom, une
   description et un rechargement, sans savoir QUAND s'en servir. Les
   capacités portent pourtant des `counters` en donnée (class-skills.js),
   qui pointent vers les cartes-conditions du Grimoire — l'information
   existait et n'était affichée nulle part sur cet écran.

   Chaque carte se déplie donc sur ses contres, avec les icônes et les
   libellés du Grimoire (même vocabulaire des deux côtés), et sur un
   emplacement réservé à l'amélioration future des capacités.
   ===================================================================== */

var expandedHeroSkill = null;

function toggleHeroSkill(id) {
  expandedHeroSkill = (expandedHeroSkill === id) ? null : id;
  if (typeof renderPanel === "function") renderPanel();
}

/* Nombre de rangs prévus par capacité. AUCUN système d'amélioration n'existe
   encore : la constante ne sert qu'à dessiner l'emplacement réservé, validé
   sur maquette. Le jour où le système arrivera, c'est le seul endroit à
   brancher sur une vraie donnée. */
var HEROS_SKILL_RANK_MAX = 3;

function buildHeroSkillCardHTML(action) {
  if (!action) return "";

  var id = String(action.id || "");
  var open = expandedHeroSkill === id;
  var isDefense = action.type === "defense";
  var remaining = (game.classCooldowns && typeof game.classCooldowns[id] === "number") ? game.classCooldowns[id] : 0;
  var icon = (typeof CLASS_ACTION_ICON_FALLBACK !== "undefined" && CLASS_ACTION_ICON_FALLBACK[id])
    || (isDefense ? "images/Icons/combat_stats/stat_defense.png" : "images/Icons/scene/node_discovery.png");
  var cost = Number(action.resourceCost || 0);
  var resLabel = "";
  if (typeof getClassForHero === "function") {
    var cls = getClassForHero(getSelectedHero());
    if (cls && cls.resource) resLabel = cls.resource.label;
  }

  var h = '<div class="pc-skill-card' + (open ? ' is-open' : '') + (isDefense ? ' is-defense' : '') + '">';

  h += '<button type="button" class="pc-skill-head" onclick="toggleHeroSkill(\'' + esc(id) + '\')">';
  // renderIconOrEmojiHTML gère les deux cas : CLASS_ACTION_ICON_FALLBACK contient
  // des CHEMINS d'image pour certaines actions et des emojis pour d'autres.
  h += '<span class="pc-skill-ico">' + renderIconOrEmojiHTML(icon, "pc-skill-ico-img", action.label) + '</span>';
  h += '<span class="pc-skill-name">' + esc(action.label) + '</span>';
  h += '<span class="pc-skill-tags">';
  h += cost > 0
    ? '<span class="pc-skill-tag is-cost">' + cost + (resLabel ? ' ' + esc(resLabel) : '') + '</span>'
    : '<span class="pc-skill-tag is-free">Sans coût</span>';
  h += '<span class="pc-skill-tag is-cd' + (remaining > 0 ? ' is-active' : '') + '">'
    + (remaining > 0 ? remaining + " r restants" : Number(action.cooldownRounds || 0) + " round" + (Number(action.cooldownRounds || 0) > 1 ? "s" : ""))
    + '</span>';
  h += '</span>';
  h += '<span class="pc-skill-chev">›</span>';
  h += '</button>';

  if (open) {
    h += '<div class="pc-skill-body">';
    h += '<div class="pc-skill-desc">' + esc(action.description || "") + '</div>';

    h += '<div class="pc-skill-counters">';
    h += '<div class="pc-skill-counters-lbl"><img class=ico-inline src=images/Icons/combat_stats/stat_speed.png> Utile contre</div>';
    // v3.208.0 : liste complète (counters + suppressions d'archétype portées par effects).
    // Avant, seul action.counters était lu — la moitié des contres n'était annoncée nulle part.
    var ids = (typeof getAllGrimoireCounterIds === "function")
      ? getAllGrimoireCounterIds(action)
      : ((action.counters && action.counters.length) ? action.counters : []);
    if (!ids.length) {
      h += '<div class="pc-skill-counter-none">Aucune situation particulière : c\'est une technique de dégâts brute, à jouer quand rien d\'autre ne presse.</div>';
    } else {
      ids.forEach(function (condId) {
        var cond = (typeof getGrimoireCondition === "function") ? getGrimoireCondition(condId) : null;
        if (!cond) return;
        h += '<div class="pc-skill-counter">';
        h += '<span class="pc-skill-counter-ico">' + renderIconOrEmojiHTML(cond.icon, "pc-skill-counter-img", "") + '</span>';
        h += '<span class="pc-skill-counter-texts">';
        h += '<span class="pc-skill-counter-lbl">' + esc(cond.label) + '</span>';
        h += '<span class="pc-skill-counter-desc">' + esc(cond.description || "") + '</span>';
        h += '</span></div>';
      });
    }
    h += '</div>';

    h += '<div class="pc-skill-rank"><span class="pc-skill-pips">';
    for (var i = 1; i <= HEROS_SKILL_RANK_MAX; i++) {
      h += '<i' + (i === 1 ? ' class="is-on"' : '') + '></i>';
    }
    h += '</span><span>Amélioration des capacités — à venir</span></div>';

    h += '</div>';
  }

  h += '</div>';
  return h;
}

function buildHerosStatsHTML() {
  var h = '';

  if (!window.ClassCombatManager || typeof ClassCombatManager.getAction !== "function") {
    h += '<div class="pc-empty">Aucune capacité disponible pour le moment.</div>';
  } else {
    var cls = (typeof getClassForHero === "function") ? getClassForHero(getSelectedHero()) : null;
    if (cls) h += '<div class="pc-section-label">' + renderIconOrEmojiHTML(cls.icon, "pc-section-ico", "") + ' Kit du ' + esc(cls.label) + '</div>';

    var cards = "";
    ["skill1", "skill2", "skill3", "defense"].forEach(function (slot) {
      cards += buildHeroSkillCardHTML(ClassCombatManager.getAction(slot));
    });
    h += cards || '<div class="pc-empty">Aucune capacité disponible pour le moment.</div>';
  }

  // v3.202.1 : le bandeau de statistiques cumulées est parti chez les Hauts
  // faits (ui/achievement-view.js : buildAchievementTotalsHTML). Il n'avait
  // aucun rapport avec les capacités de classe, et le renommage de v3.202.0
  // rendait la cohabitation franchement fausse : un onglet "Capacités" qui
  // affiche le temps de jeu.
  // v3.202.1 : titre du cadre aligné sur le libellé du sous-onglet.
  // v3.244.0 : rendu dans une feuille basse — plus de cadre de page.
  return '<div>' + h + '</div>';
}

function buildHerosSubTabBarHTML() {
  var unlocked = function (t) { return typeof isTabUnlocked !== "function" || isTabUnlocked(t); };
  var h = '<div class="pc-subtab-bar">';
  h += '<button type="button" class="pc-subtab-btn' + (activeHerosSubTab === "hero" ? ' is-active' : '') + '" onclick="setHerosSubTab(\'hero\')"><img class="pc-subtab-ico" src="images/Icons/subtabs/hero_summary.png" alt=""><span>Résumé</span></button>';
  // v3.244.0 : Équipement et Talents rejoignent Héros. Mêmes verrous d'Histoire que
  // leurs anciennes cases de menu — un sous-onglet verrouillé n'est pas dessiné.
  if (unlocked("equip")) {
    h += '<button type="button" class="pc-subtab-btn' + (activeHerosSubTab === "equip" ? ' is-active' : '') + '" onclick="setHerosSubTab(\'equip\')"><img class="pc-subtab-ico" src="images/Icons/subtabs/equipment.png" alt=""><span>Équipement</span></button>';
  }
  if (unlocked("talents")) {
    h += '<button type="button" class="pc-subtab-btn' + (activeHerosSubTab === "talents" ? ' is-active' : '') + '" onclick="setHerosSubTab(\'talents\')"><img class="pc-subtab-ico" src="images/Icons/scene/node_discovery.png" alt=""><span>Talents</span></button>';
  }
  h += '</div>';
  return h;
}

/* v3.244.0 : sous-onglet Équipement — un segment Équipé / Sac (/ Boutique, transitoire
   jusqu'au lot N-2 qui l'emmène à la Halle marchande) au-dessus du contenu existant de
   ui/equipment-view.js. L'état reste activeEquipSubTab : rien ne change pour les
   fonctions qui le lisent (sélection d'objet, tri, autovente). */
function buildHerosEquipHTML() {
  var cur = (typeof activeEquipSubTab !== "undefined") ? activeEquipSubTab : "equipment";
  var bagCount = Array.isArray(game.inventory) ? game.inventory.length : 0;
  // Le segment est passé EN TÊTE DU CADRE (topHTML) : posé avant, il tomberait entre le
  // bandeau, que kframe-decorator sort du flux, et le corps du cadre.
  var seg = '<div class="kseg kseg-in-frame">';
  seg += '<button type="button" class="' + (cur === "equipment" ? 'is-on' : '') + '" onclick="setEquipSubTab(\'equipment\')">Équipé</button>';
  seg += '<button type="button" class="' + (cur === "inventory" ? 'is-on' : '') + '" onclick="setEquipSubTab(\'inventory\')">Sac<span class="kseg-count">' + bagCount + '</span></button>';
  seg += '<button type="button" class="' + (cur === "shop" ? 'is-on' : '') + '" onclick="setEquipSubTab(\'shop\')">Boutique</button>';
  seg += '</div>';

  var h = '';
  if (cur === "inventory") {
    h += (typeof buildInventoryTabContentHTML === "function") ? buildInventoryTabContentHTML(seg) : "";
  } else if (cur === "shop") {
    h += '<div class="nb-page-frame nb-page-frame-fill kframe-page" data-kf-title="images/Icons/subtabs/equipment_shop.png|Boutique d\u2019\u00e9quipement">';
    h += seg;
    h += (typeof buildEquipShopHTML === "function") ? buildEquipShopHTML() : "";
    h += '</div>';
  } else {
    h += (typeof buildEquipmentTabContentHTML === "function") ? buildEquipmentTabContentHTML(seg) : "";
  }
  return h;
}

/* v3.244.0 : sous-onglet Talents — les trois branches passent de la barre du kit à
   un segment (second niveau), au-dessus de l'arbre existant de ui/talents-view.js. */
function buildHerosTalentsHTML() {
  if (typeof buildTalentBranchHTML !== "function") return '<div class="pc-empty">Talents indisponibles.</div>';
  var cats = ["combat", "fortune", "survival"];
  var cur = (typeof activeTalentCategory !== "undefined") ? activeTalentCategory : "combat";
  var seg = '<div class="kseg kseg-in-frame">';
  cats.forEach(function (c) {
    seg += '<button type="button" class="' + (c === cur ? 'is-on' : '') + '" onclick="window.setTalentCategory(\'' + c + '\')">'
      + esc(getTalentCategoryLabel(c)) + '</button>';
  });
  seg += '</div>';
  var h = '<div class="nb-page-frame kframe-page" data-kf-title="images/Icons/scene/node_discovery.png|Talents">';
  h += seg; // en tête du cadre, même raison que buildHerosEquipHTML
  h += buildTalentSummaryBarHTML();
  h += buildTalentBranchHTML(cur);
  h += '</div>';
  return h;
}

function buildHerosHTML() {
  var h = '<div class="subtab-page">';

  // v3.194.1 : chaque sous-vue possède en fait SON cadre racine — le bandeau
  // autonome de v3.194.0 le doublait (retour Seb). Les cadres portent
  // désormais le titre eux-mêmes (schéma standard des autres pages).

  h += '<div class="subtab-page-content">';

  if (activeHerosSubTab === "equip") {
    h += buildHerosEquipHTML();
  } else if (activeHerosSubTab === "talents") {
    h += buildHerosTalentsHTML();
  } else {
    h += buildHeroFicheHTML();
  }

  h += '</div>'; // fin .subtab-page-content

  h += '<div class="subtab-bar-wrapper">';
  h +=   buildHerosSubTabBarHTML();
  h += '</div>';

  h += '</div>'; // fin .subtab-page

  return h;
}

/* ============================================================
   v3.244.0 — FEUILLES BASSES du Résumé (Stats, Capacités)
   Rendues dans #heros-sheet-root, HORS de #panel-container (même raison que le
   Grimoire, v3.212.0 : isolation:isolate y enfermait le z-index sous la barre du
   bas). Alimentées par renderPanel() à chaque rendu, vidées en quittant l'écran.
   ============================================================ */
var HEROS_SHEETS = {
  stats: { title: "Stats", icon: "images/Icons/subtabs/hero_stats.png", build: function () { return buildHerosAmeliorationHTML(); } },
  abilities: { title: "Capacités", icon: "images/Icons/subtabs/hero_abilities.png", build: function () { return buildHerosStatsHTML(); } }
};

function buildHerosSheetHTML() {
  var def = herosOpenSheet && HEROS_SHEETS[herosOpenSheet];
  if (!def) return "";
  return '<div class="ksheet-backdrop" onclick="closeHerosSheet()"></div>'
    + '<div class="ksheet"><div class="ksheet-handle"></div>'
    + '<div class="ksheet-title"><img src="' + def.icon + '" alt=""><span>' + def.title + '</span></div>'
    + '<div class="ksheet-body">' + def.build() + '</div>'
    + '<button type="button" class="ksheet-close" onclick="closeHerosSheet()">Fermer</button>'
    + '</div>';
}

function renderHerosSheet(isHerosTab) {
  var root = document.getElementById("heros-sheet-root");
  if (!root) return;
  if (!isHerosTab || !herosOpenSheet) { root.innerHTML = ""; return; }
  // Un achat de stat re-rend tout : on garde la position de lecture de la feuille.
  var body = root.querySelector(".ksheet-body");
  var keep = body ? body.scrollTop : 0;
  root.innerHTML = buildHerosSheetHTML();
  body = root.querySelector(".ksheet-body");
  if (body && keep) body.scrollTop = keep;
}

function openHerosSheet(name) {
  if (!HEROS_SHEETS[name]) return;
  if (typeof expandedHeroStat !== "undefined") expandedHeroStat = null;
  if (typeof expandedHeroSkill !== "undefined") expandedHeroSkill = null;
  herosOpenSheet = name;
  if (typeof renderPanel === "function") renderPanel();
}

function closeHerosSheet() {
  herosOpenSheet = null;
  if (typeof renderPanel === "function") renderPanel();
}

window.buildHerosEquipHTML = buildHerosEquipHTML;
window.buildHerosTalentsHTML = buildHerosTalentsHTML;
window.renderHerosSheet = renderHerosSheet;
window.openHerosSheet = openHerosSheet;
window.closeHerosSheet = closeHerosSheet;
window.setHerosSubTabSilent = setHerosSubTabSilent;

function selectHeroInline(heroId) {
  if (!heroId || heroId === game.heroId) return;
  if (typeof HEROES_DB === "undefined") return;

  var found = null;
  Object.keys(HEROES_DB).forEach(function (key) {
    if (HEROES_DB[key] && HEROES_DB[key].id === heroId) found = HEROES_DB[key];
  });
  if (!found) return;

  game.heroId = heroId;
  if (heroId.indexOf("chaos") === 0) game.codexChaosSeen = true;

  if (window.ClassCombatManager && typeof ClassCombatManager.resetForNewHero === "function") {
    ClassCombatManager.resetForNewHero();
  }

  // Arme de l'ancienne classe potentiellement incompatible avec la nouvelle -> retour inventaire.
  if (typeof unequipIncompatibleWeapon === "function") unequipIncompatibleWeapon();
  if ((!game.equipped || !game.equipped.weapon) && typeof equipStarterWeapon === "function") {
    equipStarterWeapon();
  }

  if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") {
    StatsSystem.recalcStats();
  }

  if (typeof saveGame === "function") saveGame();
  if (typeof renderAll === "function") renderAll();
  if (typeof showToast === "function") showToast("Héros changé : " + found.name, 1200);
}

window.buildHerosHTML = buildHerosHTML;
window.openHeroSlotsScreen = openHeroSlotsScreen; // v3.202.0
window.selectHeroInline = selectHeroInline; // v3.25 : conservée pour compat
window.setHerosSubTab = setHerosSubTab;
window.toggleHeroStat = toggleHeroStat;   // v3.203.0
window.toggleHeroSkill = toggleHeroSkill; // v3.203.0
