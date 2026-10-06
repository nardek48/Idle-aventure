"use strict";
/* ui/heros-view.js — écran Personnage (v2.75, fiche façon jeu de rôle), 3 sous-onglets Héros/Amélioration/Stats. Carrousel de 3 emplacements de héros indépendants (v3.25). Détail : COMMENTAIRES_ORIGINAUX.md */

/* v3.244.0 (chantier Navigation, décision Seb 14/09/2026) : Héros devient le hub
   « Progresser ». Sous-onglets : Résumé / Équipement / Talents. Les anciens
   sous-onglets Stats (amelioration) et Capacités (stats) deviennent des FEUILLES
   BASSES ouvertes depuis le Résumé — le Résumé reste visible derrière. */
var activeHerosSubTab = "hero"; // "hero" | "equip" | "talents" | "companions"
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
  /* v3.268.1 (bug Seb) : liste blanche. « companions » y manquait, donc le clic sur le
     sous-onglet retombait silencieusement sur le Résumé — rien ne se passait à l'écran.
     Toute nouvelle valeur d'activeHerosSubTab doit être ajoutée ICI, pas seulement dans
     la barre de boutons et le routeur de buildHerosHTML(). */
  if (tab === "equip" || tab === "talents" || tab === "companions") activeHerosSubTab = tab;
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

  var achTier = window.AchievementManager ? AchievementManager.getCurrentWorldTier() : null; // v3.338.0 (H4)
  h += '<div class="pc-sum-portrait' + (cls ? ' is-class-' + esc(cls.id) : '') + (achTier ? ' hf-tier-' + achTier : '') + '">';
  if (hero && hero.image) {
    h += '<img src="' + esc(hero.image) + '" alt="' + esc(_td(hero.name)) + '">';
  } else {
    h += '<div class="pc-portrait-placeholder">?</div>';
  }
  h += '<div class="pc-sum-lvl">' + esc(_t("Niveau {n}", { n: heroLevel })) + '</div>';
  h += '</div>';

  h += '<div class="pc-sum-col">';
  h += '<div class="pc-sum-name">' + esc(game.playerName || (hero ? _td(hero.name) : _t("Sans nom"))) + '</div>';
  var heroicTitle = window.AchievementManager ? AchievementManager.getTitle() : null; // v3.338.0 (H8) : titre porté
  if (heroicTitle) h += '<div class="pc-sum-title">' + esc(_td(heroicTitle)) + '</div>';

  if (cls) {
    h += '<div class="pc-sum-class is-class-' + esc(cls.id) + '">' + renderIconOrEmojiHTML(cls.icon, "pc-sum-class-ico", _td(cls.label)) + ' ' + esc(_td(cls.label));
    if (cls.resource && cls.resource.label) {
      h += '<span class="pc-sum-class-res">' + esc(_td(cls.resource.label)) + '</span>';
    }
    h += '</div>';
  }

  h += '<div class="pc-sum-gauges">';
  h += buildHeroSummaryGaugeHTML(_t("EXP", "unité"), "kgauge-xp", xpPct,
    formatNumber(heroXp) + " / " + formatNumber(heroXpToNext));
  var res = getHeroSummaryResource(cls);
  if (res) {
    h += buildHeroSummaryGaugeHTML(_td(res.label), "", Math.round((res.current / res.max) * 100),
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

  var h = '<div class="ksec pc-section-label">' + _t("En combat") + '</div>';
  h += '<div class="pc-sum-combat">';
  h += buildHeroSummaryCellHTML(_t("PV", "unité"), formatNumber(heroMaxHp));
  h += buildHeroSummaryCellHTML(_t("ATK", "unité"), formatNumber(atk), getHeroMainStatLabel()); // v3.228.0 : quelle stat porte les dégâts
  h += buildHeroSummaryCellHTML(_t("VIT", "unité"), formatNumber(vit));
  h += '<div class="pc-sum-cell is-wide">';
  h += '<span class="pc-sum-cell-lbl">' + _t("DÉFENSE") + '</span><span class="pc-sum-cell-val">' + defPct + ' %</span>';
  h += '<span class="pc-sum-cell-lbl">' + _t("CRITIQUE") + '</span><span class="pc-sum-cell-val">' + esc(critPct) + ' % · ×' + esc(critMult) + '</span>';
  h += '</div>';
  h += '</div>';
  return h;
}

/* Raccourcis vers les deux autres sous-onglets. Chacun porte l'information
   qui donne une raison d'y aller : marge d'entraînement d'un côté, aperçu du
   kit de classe de l'autre. */
function buildHeroSummaryJumpsHTML() {
  var h = '<div class="ksec pc-section-label">' + _t("Aller plus loin") + '</div>';

  var prog = getHeroTrainingProgress();
  h += '<button type="button" class="pc-sum-jump" onclick="openHerosSheet(\'stats\')">';
  h += '<span class="pc-sum-jump-ico"><img class=ico-inline src=images/Icons/subtabs/hero_stats.png></span>';
  h += '<span class="pc-sum-jump-txt"><span class="pc-sum-jump-t">' + _t("Stats") + '</span>';
  h += '<span class="pc-sum-jump-s">' + (prog
    ? (prog.left > 0
      ? _t("{n} niveaux d’entraînement restants", { n: formatNumber(prog.left) })
      : _t("Tout est entraîné au maximum"))
    : _t("Entraînement")) + '</span></span>';
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
  h += '<span class="pc-sum-jump-txt"><span class="pc-sum-jump-t">' + _t("Capacités") + '</span>';
  h += '<span class="pc-sum-jump-s">' + (actions.length
    ? _tn(actions.length, "{n} technique", "{n} techniques")
    : _t("Aucune capacité")) + '</span></span>';
  if (actions.length) {
    // CLASS_ACTION_ICON_FALLBACK contient des CHEMINS D'IMAGE, pas des emojis
    // (class-combat-system.js) : esc() les affichait tels quels. On passe par
    // renderIconOrEmojiHTML, qui gère les deux cas — même helper que les
    // cartes de capacité plus haut dans ce fichier.
    h += '<span class="pc-sum-jump-kit">';
    actions.forEach(function (a) {
      var icon = (typeof CLASS_ACTION_ICON_FALLBACK !== "undefined" && CLASS_ACTION_ICON_FALLBACK[a.id])
        || (a.type === "defense" ? "images/Icons/combat_stats/stat_defense.png" : "images/Icons/scene/node_discovery.png");
      h += '<span>' + renderIconOrEmojiHTML(icon, "pc-sum-jump-kit-ico", a.label ? _td(a.label) : "") + '</span>';
    });
    h += '</span>';
  }
  h += '<span class="pc-sum-jump-chev">›</span>';
  h += '</button>';

  // v3.244.0 : l'Ascension quitte le menu ☰ — c'est une étape de progression du héros,
  // elle s'ouvre d'ici. Même verrou d'Histoire que l'ancienne case de menu.
  if (typeof isTabUnlocked !== "function" || isTabUnlocked("ascension")) {
    // v3.322.0 : l'Ascension devient la Mémoire (même onglet)
    var mp = window.MemoryManager ? MemoryManager.getProgress() : { level: 0 };
    var nPending = window.MemoryManager ? MemoryManager.getPendingLevels().length : 0;
    h += '<button type="button" class="pc-sum-jump" onclick="switchTab(\'ascension\')">';
    h += '<span class="pc-sum-jump-ico"><img class=ico-inline src=images/Icons/subtabs/ascension_tab.png></span>';
    h += '<span class="pc-sum-jump-txt"><span class="pc-sum-jump-t">' + _t("Mémoire") + '</span>';
    h += '<span class="pc-sum-jump-s">' + _t("Niveau {n}", { n: mp.level }) + (nPending ? ' · ' + _t("un choix t'attend") : '') + '</span></span>';
    h += '<span class="pc-sum-jump-chev">›</span>';
    h += '</button>';
  }

  return h;
}

/* v3.363.0 (acte IV) — traits gagnés par l'Histoire. Un seul pour l'instant : La forme du roi
   (choix « roi » = prendre). Aucun état propre : le choix noté fait foi. */
function buildHeroSummaryTraitsHTML() {
  var soi = !!(window.StoryQuestManager && StoryQuestManager.getChoice("roi") === "soi");
  if (!soi) return "";
  var h = '<div class="ksec pc-section-label">' + _t("Ce que tu portes") + '</div>';
  h += '<div class="pc-sum-jump is-static">';
  h += '<span class="pc-sum-jump-ico"><img class="ico-inline" src="images/Icons/memory/forme_du_roi.png" alt=""></span>';
  h += '<span class="pc-sum-jump-txt"><span class="pc-sum-jump-t">' + _t("La forme du roi") + '</span>';
  h += '<span class="pc-sum-jump-s">' + _t("Le silence ne te tient plus qu’un round.") + '</span></span>';
  h += '</div>';
  return h;
}

function buildHeroFicheHTML() {
  // v3.425.0 (chantier Héros, lot H-2) : Résumé refait (ui/heros-screens-view.js). Les anciens
  // morceaux (buildHeroSummary*) restent pour la feuille Stats et les tests de rendu.
  return herosFrameOpen("hs-page nb-page-frame-fill") + buildHerosResumeHTML() + '</div>';
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
    name: _t("Force"), icon: "./images/Icons/improvement_icons/power.png",
    produces: _t("Dégâts de l'attaque de base"), unit: _t("ATK", "unité"),
    read: function () { return (typeof EquipmentManager !== "undefined") ? EquipmentManager.effectiveTapDamage() : 0; },
    fmt: function (v) { return _t("ATK", "unité") + " " + formatNumber(Math.round(v)); },
    fmtDelta: function (d) { return "+" + formatNumber(Math.round(d)) + " " + _t("ATK", "unité"); }
  },
  {
    key: "endurance", upgradeId: "utrain_endurance", trainedKey: "endurance",
    name: _t("Endurance"), icon: "./images/Icons/improvement_icons/endurance.png",
    produces: _t("Points de vie"), unit: _t("PV", "unité"),
    read: function () { return Number(game.heroMaxHp || 0); },
    fmt: function (v) { return _t("PV", "unité") + " " + formatNumber(Math.round(v)); },
    fmtDelta: function (d) { return "+" + formatNumber(Math.round(d)) + " " + _t("PV", "unité"); },
    extra: function () { return _t("Défense : {p} %", { p: Math.round(Number(game.heroDefensePct || 0) * 100) }); }
  },
  {
    key: "celerity", upgradeId: "utrain_celerity", trainedKey: "celerity",
    name: _t("Célérité"), icon: "./images/Icons/improvement_icons/celerity.png",
    produces: _t("Vitesse de remplissage de la jauge"), unit: _t("VIT", "unité"),
    read: function () {
      return (window.CombatEngine && typeof CombatEngine.getTotalCelerity === "function")
        ? CombatEngine.getTotalCelerity() : 0;
    },
    fmt: function (v) { return _t("VIT", "unité") + " " + formatNumber(Math.round(v)); },
    fmtDelta: function (d) { return "+" + formatNumber(Math.round(d)) + " " + _t("VIT", "unité"); }
  },
  {
    key: "precision", upgradeId: "utrain_precision", trainedKey: "precision",
    name: _t("Précision"), icon: "./images/Icons/improvement_icons/accuracy.png",
    produces: _t("Chance de coup critique"), unit: _t("CRIT", "unité"),
    read: function () { return (typeof EquipmentManager !== "undefined") ? EquipmentManager.effectiveCritChance() : 0; },
    fmt: function (v) { return _t("CRIT", "unité") + " " + (Math.round(v * 10) / 10) + " %"; },
    fmtDelta: function (d) { return _t("+{n} % de critique", { n: Math.round(d * 10) / 10 }); }
  },
  {
    key: "will", upgradeId: "utrain_will", trainedKey: "will",
    name: _t("Volonté"), icon: "./images/Icons/improvement_icons/will.png",
    produces: _t("Puissance des coups critiques"), unit: _t("CRIT ×", "unité"),
    read: function () { return (typeof EquipmentManager !== "undefined") ? EquipmentManager.effectiveCritMult() : 0; },
    fmt: function (v) { return _t("CRIT ×", "unité") + " " + (Math.round(v * 100) / 100); },
    fmtDelta: function (d) { return _t("+{n} au multiplicateur", { n: Math.round(d * 100) / 100 }); }
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
    produces: _t("Dégâts de l'attaque de base"),
    unit: _t("ATK", "unité"),
    read: function () { return (typeof EquipmentManager !== "undefined") ? EquipmentManager.effectiveTapDamage() : 0; },
    fmt: function (v) { return _t("ATK", "unité") + " " + formatNumber(Math.round(v)); },
    fmtDelta: function (d) { return "+" + formatNumber(Math.round(d)) + " " + _t("ATK", "unité"); },
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
    id: "training", label: _t("Entraînement"),
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
    id: "gear", label: _t("Équipement"),
    off: function () { var saved = game.equipped; game.equipped = {}; return saved; },
    on: function (saved) { game.equipped = saved; }
  },
  {
    id: "talents", label: _t("Talents"),
    off: function () { var saved = game.talents; game.talents = {}; return saved; },
    on: function (saved) { game.talents = saved; }
  }
  // v3.322.0 : Ascension et Aether ne sont plus des sources de stats (Offrande)
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
  h += renderIconOrEmojiHTML(row.icon, "pc-stat-card-ico", _td(row.name));
  h += '<span class="pc-stat-card-texts">';
  h += '<span class="pc-stat-card-name">' + esc(_td(row.name))
    + (row.isMain ? ' <span class="pc-stat-card-main">' + _t("principale", "stat") + '</span>' : '') + '</span>';
  h += '<span class="pc-stat-card-out">' + esc(row.fmt(row.read())) + '</span>';
  h += '</span>';
  h += '<span class="pc-stat-card-num">';
  h += '<span class="pc-stat-card-total">' + formatNumber(base + trained) + '</span>';
  h += '<span class="pc-stat-card-cap">' + level + ' / ' + (maxLevel || "∞") + '</span>';
  h += '</span>';
  h += '<span class="pc-stat-card-chev">›</span>';
  h += '</button>';

  if (atHardMax) {
    h += '<div class="pc-stat-card-buy is-capped">' + _t("Maximum") + '<small>' + _t("atteint") + '</small></div>';
  } else if (capped) {
    /* Le mur pointe vers sa solution : un clic ouvre le Village, là où se
       bâtit le Terrain. */
    // v3.425.0 (lot H-2) : la carte dit « Plafond », le bandeau en tête de feuille pointe vers le Terrain.
    h += '<div class="pc-stat-card-buy is-capped is-training-wall">' + _t("Plafond") + '<small>' + cap + '</small></div>';
  } else if (locked) {
    h += '<div class="pc-stat-card-buy is-locked">' + _t("Monde") + '<small>' + ((upgrade.unlockWorld || 0) + 1) + '</small></div>';
  } else if (gain) {
    h += '<button type="button" class="pc-stat-card-buy kbuy" onclick="buyUpgrade(\'' + esc(row.upgradeId) + '\', ' + buyAmount + ')">';
    h += '<img src="images/Icons/gold_icon.png" alt="">' + formatNumber(gain.totalCost) + '<small>×' + gain.count + '</small></button>';
  } else {
    h += '<div class="pc-stat-card-buy kbuy is-poor"><img src="images/Icons/gold_icon.png" alt="">' + formatNumber(nextCost) + '</div>';
  }
  h += '</div>';

  h += '<div class="pc-stat-card-bar' + (capped ? ' is-capped' : '') + '"><i style="width:' + pctLevel + '%"></i></div>';

  if (open) {
    h += '<div class="pc-stat-card-body">';
    h += '<div class="pc-stat-break">';
    h += '<div class="pc-stat-break-row"><span>' + _t("Base du héros") + '</span><span>+' + formatNumber(base) + '</span></div>';
    h += '<div class="pc-stat-break-row' + (trained === 0 ? ' is-zero' : '') + '"><span>' + _t("Entraînement (niveau {n})", { n: level }) + '</span><span>+' + formatNumber(trained) + '</span></div>';
    h += '<div class="pc-stat-break-row is-total"><span>' + esc(row.produces) + '</span><span>' + esc(row.fmt(row.read())) + '</span></div>';
    if (typeof row.extra === "function") {
      h += '<div class="pc-stat-break-row"><span>' + _t("Aussi") + '</span><span>' + esc(row.extra()) + '</span></div>';
    }
    h += '</div>';

    // Ce que chaque source apporte à la valeur produite, mesuré en la
    // neutralisant. Masqué s'il n'y a rien à montrer (héros neuf sans
    // équipement, sans talent et sans Aether) : un bloc vide n'apprend rien.
    var sources = getHeroStatSources(row);
    if (sources.length) {
      h += '<div class="pc-stat-sources">';
      h += '<div class="pc-stat-sources-lbl">' + _t("Ce que chaque source t'apporte") + '</div>';
      sources.forEach(function (src) {
        h += '<div class="pc-stat-break-row"><span>' + esc(_td(src.label)) + '</span><span>'
          + esc(row.fmtDelta(src.delta)) + '</span></div>';
      });
      h += '</div>';
    }
    if (gain && Math.abs(gain.delta) >= 0.005) {
      h += '<div class="pc-stat-next"><img class=ico-inline src=images/Icons/system/upgrade.png> ' + esc(_t("{x} pour {n} or", { x: row.fmtDelta(gain.delta), n: formatNumber(gain.totalCost) })) + '</div>';
    } else if (gain) {
      // Gain réel mais invisible après arrondi : on dit à partir de combien il
      // se verra, plutôt que d'afficher un "+0" décourageant.
      var step = getHeroStatFirstVisibleStep(row);
      h += '<div class="pc-stat-next is-slow">' + (step
        ? _tn(step, "Effet visible à partir de {n} niveau d'un coup.", "Effet visible à partir de {n} niveaux d'un coup.")
        : _t("Le gain est trop fin pour se voir sur un seul achat.")) + '</div>';
    } else if (capped) {
      h += '<div class="pc-stat-next is-done">' + _t("Cette stat est entraînée au maximum.") + '</div>';
    }
    h += '</div>';
  }

  h += '</div>';
  return h;
}

function buildHerosAmeliorationHTML() {
  if (typeof UPGRADES === "undefined") {
    return '<div class="pc-empty">' + _t("Entraînement indisponible.") + '</div>';
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
  // v3.402.0 (lot B-1) : quantité d'achat = rail du kit (.kseg)
  h += '<div class="kseg shop-buy-toolbar pc-heros-train-toolbar">';
  [[1, "×1"], [10, "×10"], [25, "×25"], [-1, _t("MAX")]].forEach(function (b) {
    h += '<button type="button" class="' + (buyAmount === b[0] ? 'is-on' : '') + '" onclick="setShopBuyAmount(' + b[0] + ')">' + b[1] + '</button>';
  });
  h += '</div>';

  var cards = '';
  HEROS_STAT_ROWS.forEach(function (row) { cards += buildHeroStatCardHTML(getHeroStatRowView(row), buyAmount); });
  // v3.425.0 (lot H-2) : au plafond de l'entraînement, UN bandeau explique et mène au Terrain.
  if (cards.indexOf("is-training-wall") !== -1) {
    var terrain = window.VillageBuildingManager ? VillageBuildingManager.getLevel("training") : 0;
    h += '<div class="hs-capbanner"><span><b>' + _t("Plafond de l'entraînement : {c}", { c: getTrainingCapLevels() }) + '</b><br>'
      + _t("Terrain d'entraînement niv. {t} — chaque niveau ouvre +10.", { t: terrain }) + '</span>'
      + '<button type="button" onclick="closeHerosSheet();goToTrainingGround()">' + _t("Terrain") + ' ›</button></div>';
  }
  h += '<div class="pc-stat-list-v2">' + cards + '</div>';

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
    if (cls && cls.resource) resLabel = _td(cls.resource.label);
  }

  var h = '<div class="pc-skill-card' + (open ? ' is-open' : '') + (isDefense ? ' is-defense' : '') + '">';

  h += '<button type="button" class="pc-skill-head" onclick="toggleHeroSkill(\'' + esc(id) + '\')">';
  // renderIconOrEmojiHTML gère les deux cas : CLASS_ACTION_ICON_FALLBACK contient
  // des CHEMINS d'image pour certaines actions et des emojis pour d'autres.
  h += '<span class="pc-skill-ico">' + renderIconOrEmojiHTML(icon, "pc-skill-ico-img", _td(action.label)) + '</span>';
  h += '<span class="pc-skill-name">' + esc(_td(action.label)) + '</span>';
  h += '<span class="pc-skill-tags">';
  h += cost > 0
    ? '<span class="pc-skill-tag is-cost">' + cost + (resLabel ? ' ' + esc(resLabel) : '') + '</span>'
    : '<span class="pc-skill-tag is-free">' + _t("Sans coût") + '</span>';
  h += '<span class="pc-skill-tag is-cd' + (remaining > 0 ? ' is-active' : '') + '">'
    + (remaining > 0 ? _t("{n} r restants", { n: remaining }) : _tn(Number(action.cooldownRounds || 0), "{n} round", "{n} rounds"))
    + '</span>';
  h += '</span>';
  h += '<span class="pc-skill-chev">›</span>';
  h += '</button>';

  if (open) {
    h += '<div class="pc-skill-body">';
    h += '<div class="pc-skill-desc">' + esc(_td(action.description || "")) + '</div>';

    h += '<div class="pc-skill-counters">';
    h += '<div class="pc-skill-counters-lbl"><img class=ico-inline src=images/Icons/combat_stats/stat_speed.png> ' + _t("Utile contre") + '</div>';
    // v3.208.0 : liste complète (counters + suppressions d'archétype portées par effects).
    // Avant, seul action.counters était lu — la moitié des contres n'était annoncée nulle part.
    var ids = (typeof getAllGrimoireCounterIds === "function")
      ? getAllGrimoireCounterIds(action)
      : ((action.counters && action.counters.length) ? action.counters : []);
    if (!ids.length) {
      h += '<div class="pc-skill-counter-none">' + _t("Aucune situation particulière : c'est une technique de dégâts brute, à jouer quand rien d'autre ne presse.") + '</div>';
    } else {
      ids.forEach(function (condId) {
        var cond = (typeof getGrimoireCondition === "function") ? getGrimoireCondition(condId) : null;
        if (!cond) return;
        h += '<div class="pc-skill-counter">';
        h += '<span class="pc-skill-counter-ico">' + renderIconOrEmojiHTML(cond.icon, "pc-skill-counter-img", "") + '</span>';
        h += '<span class="pc-skill-counter-texts">';
        h += '<span class="pc-skill-counter-lbl">' + esc(_td(cond.label)) + '</span>';
        h += '<span class="pc-skill-counter-desc">' + esc(_td(cond.description || "")) + '</span>';
        h += '</span></div>';
      });
    }
    h += '</div>';

    h += '<div class="pc-skill-rank"><span class="pc-skill-pips">';
    for (var i = 1; i <= HEROS_SKILL_RANK_MAX; i++) {
      h += '<i' + (i === 1 ? ' class="is-on"' : '') + '></i>';
    }
    h += '</span><span>' + _t("Amélioration des capacités — à venir") + '</span></div>';

    h += '</div>';
  }

  h += '</div>';
  return h;
}

function buildHerosStatsHTML() {
  var h = '';

  if (!window.ClassCombatManager || typeof ClassCombatManager.getAction !== "function") {
    h += '<div class="pc-empty">' + _t("Aucune capacité disponible pour le moment.") + '</div>';
  } else {
    var cls = (typeof getClassForHero === "function") ? getClassForHero(getSelectedHero()) : null;
    if (cls) h += '<div class="ksec pc-section-label">' + renderIconOrEmojiHTML(cls.icon, "pc-section-ico", "") + ' ' + esc(_t("Kit du {x}", { x: _td(cls.label) })) + '</div>';

    var cards = "";
    ["skill1", "skill2", "skill3", "defense"].forEach(function (slot) {
      cards += buildHeroSkillCardHTML(ClassCombatManager.getAction(slot));
    });
    h += cards || '<div class="pc-empty">' + _t("Aucune capacité disponible pour le moment.") + '</div>';
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

/* v3.424.0 (chantier Héros, H-1, décisions de Seb du 02/10/2026) : un seul cadre « Héros »,
   le rail du kit EN HAUT (.kseg.is-stack, comme Village, Camp, Quêtes) et quatre onglets :
   Résumé · Équipement · Talents · Compagnons. Plus de barre de sous-onglets en bas.
   Compagnons redevient un onglet (il n'apparaît qu'une fois un compagnon recruté). */
var HEROS_FRAME_ICON = "images/Icons/menu_icons/heroes_menu.png";

function getHerosTabs() {
  var unlocked = function (t) { return typeof isTabUnlocked !== "function" || isTabUnlocked(t); };
  var tabs = [["hero", "images/Icons/subtabs/hero_summary.png", _t("Résumé")]];
  if (unlocked("equip")) tabs.push(["equip", "images/Icons/subtabs/equipment.png", _t("Équipement")]);
  if (unlocked("talents")) tabs.push(["talents", "images/Icons/scene/node_discovery.png", _t("Talents")]);
  if (unlocked("companions") && window.CompanionManager && CompanionManager.unlockedIds().length) {
    tabs.push(["companions", "images/Icons/subtabs/hero_abilities.png", _t("Compagnons")]);
  }
  return tabs;
}
window.getHerosTabs = getHerosTabs;

/* Pastilles du rail : points de talent à placer, patrouilles rentrées (0 = pas de pastille). */
function getHerosTabBadges() {
  var b = { hero: 0, equip: 0, talents: 0, companions: 0 };
  if (window.TalentManager && typeof TalentManager.available === "function") b.talents = Number(TalentManager.available() || 0);
  if (window.PatrolManager && typeof PatrolManager.getReturned === "function") b.companions = PatrolManager.getReturned().length;
  return b;
}
window.getHerosTabBadges = getHerosTabBadges;

function buildHerosRailHTML() {
  var tabs = getHerosTabs(), badges = getHerosTabBadges();
  if (tabs.length < 2) return "";
  var h = '<div class="kseg is-stack heros-tabs">';
  tabs.forEach(function (t) {
    h += '<button type="button" class="heros-tab' + (activeHerosSubTab === t[0] ? ' is-on' : '') + '" onclick="setHerosSubTab(\'' + t[0] + '\')">';
    h += '<img src="' + t[1] + '" alt=""><span>' + esc(t[2]) + '</span>';
    if (badges[t[0]] > 0) h += '<span class="kseg-dot">' + badges[t[0]] + '</span>';
    h += '</button>';
  });
  return h + '</div>';
}
window.buildHerosRailHTML = buildHerosRailHTML;

/* Ouverture du cadre « Héros », rail compris. extraClass : classes propres à la sous-vue. */
function herosFrameOpen(extraClass) {
  return '<div class="nb-page-frame kframe-page heros-frame' + (extraClass ? ' ' + extraClass : '') + '" data-kf-title="' + esc(HEROS_FRAME_ICON + "|" + _t("Héros")) + '">' + buildHerosRailHTML();
}
window.herosFrameOpen = herosFrameOpen;

/* Le cadre d'une sous-vue construite ailleurs (équipement, compagnons) devient le cadre
   « Héros » : même titre, rail juste sous le bandeau. */
function asHerosFrame(html, withRail) {
  var out = String(html || "").replace(/data-kf-title="[^"]*"/, 'data-kf-title="' + esc(HEROS_FRAME_ICON + "|" + _t("Héros")) + '"');
  if (!withRail) return out;
  var i = out.indexOf(">", out.indexOf("nb-page-frame"));
  return i < 0 ? out : out.slice(0, i + 1) + buildHerosRailHTML() + out.slice(i + 1);
}

/* La Boutique d'équipement s'installe à la Halle marchande dès qu'elle est bâtie (H-1).
   Avant, elle reste ici : un joueur doit pouvoir acheter sa première arme. */
function isEquipShopAtHall() {
  return !!(window.VillageBuildingManager && typeof VillageBuildingManager.getLevel === "function" && VillageBuildingManager.getLevel("hall") > 0);
}
window.isEquipShopAtHall = isEquipShopAtHall;


/* v3.244.0 : sous-onglet Équipement — un segment Équipé / Sac (/ Boutique, transitoire
   jusqu'au lot N-2 qui l'emmène à la Halle marchande) au-dessus du contenu existant de
   ui/equipment-view.js. L'état reste activeEquipSubTab : rien ne change pour les
   fonctions qui le lisent (sélection d'objet, tri, autovente). */
function buildHerosEquipHTML() {
  var cur = (typeof activeEquipSubTab !== "undefined") ? activeEquipSubTab : "equipment";
  var atHall = isEquipShopAtHall(); // v3.424.0 (H-1) : la Boutique part à la Halle
  if (atHall && cur === "shop") { activeEquipSubTab = "equipment"; cur = "equipment"; }
  var bagCount = Array.isArray(game.inventory) ? game.inventory.length : 0;
  var seg = '<div class="kseg hs-subseg">'; // v3.401.0 (lot O-1) : rail du kit, déjà taillé pour le parchemin
  seg += '<button type="button" class="' + (cur === "equipment" ? 'is-on' : '') + '" onclick="setEquipSubTab(\'equipment\')"><span>' + _t("Équipé") + '</span></button>';
  seg += '<button type="button" class="' + (cur === "inventory" ? 'is-on' : '') + '" onclick="setEquipSubTab(\'inventory\')"><span>' + _t("Sac") + '<span class="kseg-count">' + bagCount + '</span></span></button>';
  if (!atHall) seg += '<button type="button" class="' + (cur === "shop" ? 'is-on' : '') + '" onclick="setEquipSubTab(\'shop\')"><span>' + _t("Boutique") + '</span></button>';
  seg += '</div>';

  // v3.425.0 (lot H-2) : Équipé (silhouette, emplacements autour du corps) et Sac (modèle de
  // l'Entrepôt, pastilles de comparaison) sont dans ui/heros-screens-view.js.
  var body;
  if (cur === "inventory") body = buildHerosBagHTML();
  else if (cur === "shop") body = (typeof buildEquipShopHTML === "function") ? buildEquipShopHTML() : "";
  else body = buildHerosEquippedHTML();
  return herosFrameOpen("hs-page nb-page-frame-fill") + seg + body + '</div>';
}

/* v3.327.0 : sous-onglet Talents — un arbre par classe (ui/talents-view.js). */
/* v3.425.0 (lot H-2) : l'arbre d'icônes sur le fond de la classe (ui/heros-screens-view.js).
   ui/talents-view.js garde l'ancien plateau (buildTalentBoardHTML) et la feuille « talent ». */
function buildHerosTalentsHTML() {
  return herosFrameOpen("hs-page nb-page-frame-fill") + buildHerosTalentTreeHTML() + '</div>';
}

function buildHerosHTML() {
  // v3.424.0 (H-1) : une page simple (un cadre « Héros », rail en haut), comme le Village.
  if (activeHerosSubTab === "companions" && !getHerosTabs().some(function (t) { return t[0] === "companions"; })) activeHerosSubTab = "hero";
  if (activeHerosSubTab === "equip") return buildHerosEquipHTML();
  if (activeHerosSubTab === "talents") return buildHerosTalentsHTML();
  // v3.425.0 (lot H-2) : une carte courte par compagnon, la fiche complète en feuille.
  if (activeHerosSubTab === "companions") return herosFrameOpen("hs-page nb-page-frame-fill") + buildHerosCompanionListHTML() + '</div>';
  return buildHeroFicheHTML();
}

/* ============================================================
   v3.244.0 — FEUILLES BASSES du Résumé (Stats, Capacités)
   Rendues dans #heros-sheet-root, HORS de #panel-container (même raison que le
   Grimoire, v3.212.0 : isolation:isolate y enfermait le z-index sous la barre du
   bas). Alimentées par renderPanel() à chaque rendu, vidées en quittant l'écran.
   ============================================================ */
var HEROS_SHEETS = {
  stats: { title: _t("Stats"), icon: "images/Icons/subtabs/hero_stats.png", build: function () { return buildHerosAmeliorationHTML(); } },
  abilities: { title: _t("Capacités"), icon: "images/Icons/subtabs/hero_abilities.png", build: function () { return buildHerosStatsHTML(); } },
  // v3.327.0 : détail d'un talent (ui/talents-view.js, openTalentSheet)
  talent: { title: _t("Talent"), icon: "images/Icons/scene/node_discovery.png", build: function () { return buildTalentSheetBodyHTML(); } }
};

function buildHerosSheetHTML() {
  var def = herosOpenSheet && HEROS_SHEETS[herosOpenSheet];
  if (!def) return "";
  return '<div class="ksheet-backdrop" onclick="closeHerosSheet()"></div>'
    + '<div class="ksheet">'
    + kSheetHeadHTML({ icon: '<img src="' + def.icon + '" alt="">', title: def.title, close: "closeHerosSheet()" })
    + '<div class="ksheet-body">' + def.build() + '</div>'
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

window.buildHerosHTML = buildHerosHTML;
window.openHeroSlotsScreen = openHeroSlotsScreen; // v3.202.0
window.setHerosSubTab = setHerosSubTab;
window.toggleHeroStat = toggleHeroStat;   // v3.203.0
window.toggleHeroSkill = toggleHeroSkill; // v3.203.0
