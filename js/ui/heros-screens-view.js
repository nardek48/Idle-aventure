"use strict";
/* ui/heros-screens-view.js — v3.425.0 (chantier Héros, lot H-2) : les quatre écrans de Héros
   refaits pour la lisibilité. Ateliers H-2 à H-5 validés par Seb le 02/10/2026.
   Chargé APRÈS ui/heros-view.js (rail, cadre, feuilles) : ce fichier fournit le contenu.

   Règles communes :
     1. une information = un endroit ;
     2. le plus important en haut, le détail au toucher (feuille ou panneau du bas) ;
     3. un seul niveau de commandes sous le rail ;
     4. rien sous les bulles flottantes (masquées sur Héros, voir ui-root renderPanel) ;
     5. aucun texte coupé, 12 px au moins.

   Écrans :
     - Résumé   : bannière du portrait, les 4 chiffres sur une ligne, 3 tuiles (Entraînement,
                  Capacités, Mémoire), « Mes héros » en bas ;
     - Équipé   : silhouette à capuche (homme / femme), les 7 emplacements autour du corps, le
                  détail de l'emplacement choisi sous la silhouette ;
     - Sac      : modèle de l'Entrepôt (liste déroulante « Afficher », tuiles sombres), une
                  pastille par objet : ▲ mieux · ▼ moins bien · ⇅ des changements ;
     - Talents  : arbre d'icônes sur le fond de la classe, emblème par voie, détail en bas ;
     - Compagnons : une carte courte par compagnon, le reste dans sa fiche. */

(function () {
  /* ---------- Outils ---------- */
  function num(n) { return formatNumber(n); }
  function img(src, cls) { return '<img class="' + (cls || "") + '" src="' + esc(src) + '" alt="">'; }
  function rerender() { if (typeof renderPanel === "function") renderPanel(); }

  /* =========================================================
     RÉSUMÉ
     ========================================================= */
  function combatValues() {
    var EM = window.EquipmentManager;
    return {
      hp: Math.max(1, Math.floor(Number(game.heroMaxHp || 1))),
      atk: EM ? EM.effectiveTapDamage() : 0,
      def: Math.round(Number(game.heroDefensePct || 0) * 100),
      crit: EM ? Math.round(EM.effectiveCritChance() * 10) / 10 : 0
    };
  }

  // Ce que dit la tuile Entraînement : la vraie situation, pas un pourcentage du maximum absolu.
  function trainingStatus() {
    var ids = window.HEROS_TRAINING_UPGRADE_IDS || [];
    var cap = (typeof getTrainingCapLevels === "function") ? getTrainingCapLevels() : 150;
    var terrain = window.VillageBuildingManager ? VillageBuildingManager.getLevel("training") : 0;
    var left = 0;
    ids.forEach(function (id) { left += Math.max(0, cap - Number((game.upgrades || {})[id] || 0)); });
    // Tout au maximum absolu (maxLevel de chaque entraînement) : c'est fini, quel que soit le Terrain.
    var prog = (typeof getHeroTrainingProgress === "function") ? getHeroTrainingProgress() : null;
    if (prog && prog.total > 0 && prog.left === 0) return { tone: "done", line: _t("Tout est entraîné au maximum"), sub: _t("Maximum absolu atteint") };
    if (left > 0) return { tone: "go", line: _tn(left, "{n} niveau à acheter", "{n} niveaux à acheter"), sub: _t("Plafond {c} · Terrain niv. {t}", { c: cap, t: terrain }) };
    if (cap >= 150) return { tone: "done", line: _t("Tout est entraîné au maximum"), sub: _t("Maximum absolu atteint") };
    return { tone: "wall", line: _t("Plafond atteint ({c})", { c: cap }), sub: _t("Terrain niv. {a} → niv. {b} : +10", { a: terrain, b: terrain + 1 }) };
  }

  function skillIcons() {
    var out = "";
    if (window.ClassCombatManager && typeof ClassCombatManager.getAction === "function") {
      ["skill1", "skill2", "skill3", "defense"].forEach(function (slot) {
        var a = ClassCombatManager.getAction(slot);
        if (!a) return;
        var icon = (typeof CLASS_ACTION_ICON_FALLBACK !== "undefined" && CLASS_ACTION_ICON_FALLBACK[a.id]) || "images/Icons/scene/node_discovery.png";
        out += renderIconOrEmojiHTML(icon, "hs-mini-ico", a.label ? _td(a.label) : "");
      });
    }
    return out;
  }

  function tileHTML(o) {
    return '<button type="button" class="hs-tile is-' + (o.tone || "plain") + '" onclick="' + o.onclick + '">'
      + '<span class="hs-tile-top">' + img(o.icon, "hs-tile-ico") + '<b>' + esc(o.title) + '</b>' + (o.badge ? '<i class="hs-badge">' + o.badge + '</i>' : '') + '</span>'
      + '<span class="hs-tile-line">' + o.line + '</span>'
      + (o.sub ? '<span class="hs-tile-sub">' + o.sub + '</span>' : '') + '</button>';
  }

  function heroTiles() {
    var tr = trainingStatus();
    var t = tileHTML({ icon: "images/Icons/subtabs/hero_stats.png", title: _t("Entraînement"), line: esc(tr.line), sub: esc(tr.sub), tone: tr.tone, onclick: "openHerosSheet('stats')" });
    t += tileHTML({ icon: "images/Icons/subtabs/hero_abilities.png", title: _t("Capacités"), line: '<span class="hs-icons">' + skillIcons() + '</span>', sub: esc(_t("Quand s'en servir")), onclick: "openHerosSheet('abilities')" });
    if (typeof isTabUnlocked !== "function" || isTabUnlocked("ascension")) {
      var mp = window.MemoryManager ? MemoryManager.getProgress() : { level: 0 };
      var pend = window.MemoryManager ? MemoryManager.getPendingLevels().length : 0;
      t += tileHTML({ icon: "images/Icons/subtabs/ascension_tab.png", title: _t("Mémoire"), line: esc(_t("Niveau {n}", { n: mp.level })),
        sub: esc(pend ? _t("Un choix t'attend") : _t("Souvenirs du héros")), tone: pend ? "go" : "plain", badge: pend || "", onclick: "switchTab('ascension')" });
    }
    return t;
  }

  function bannerHTML() {
    var hero = getSelectedHero(), cls = (typeof getClassForHero === "function") ? getClassForHero(hero) : null;
    var lvl = Number(game.heroLevel || 1), xp = Number(game.heroXp || 0), nx = Math.max(1, Number(game.heroXpToNext || 20));
    var title = window.AchievementManager ? AchievementManager.getTitle() : null;
    return '<div class="hs-banner">' + (hero && hero.image ? img(hero.image, "hs-banner-img") : '')
      + '<div class="hs-banner-txt"><div class="hs-name">' + esc(game.playerName || "") + '</div>'
      + '<div class="hs-banner-sub">' + (cls ? esc(_td(cls.label)) + ' · ' : '') + esc(_t("Niveau {n}", { n: lvl })) + (title ? ' · ' + esc(_td(title)) : '') + '</div>'
      + '<div class="kgauge kgauge-thin kgauge-xp hs-xp"><div class="kgauge-track"><div class="kgauge-fill" style="width:' + Math.max(2, Math.round(100 * xp / nx)) + '%"></div></div><span class="kgauge-text">' + esc(_t("{a} / {b} XP", { a: num(xp), b: num(nx) })) + '</span></div></div>'
      + '</div>';
  }

  // Les 4 chiffres sur UNE ligne (icône + valeur), le détail dans la feuille Stats.
  function kpiStripHTML() {
    var c = combatValues();
    var k = function (ico, lbl, val) { return '<span class="hs-kstat">' + img("images/Icons/combat_stats/" + ico + ".png") + '<b>' + val + '</b><small>' + esc(lbl) + '</small></span>'; };
    return '<button type="button" class="hs-kstrip" onclick="openHerosSheet(\'stats\')">'
      + k("stat_health", _t("PV"), num(c.hp)) + k("stat_attack", _t("Attaque"), num(c.atk)) + k("stat_defense", _t("Défense"), c.def + " %") + k("stat_critical", _t("Critique"), c.crit + " %")
      + '<i class="hs-chev">›</i></button>';
  }

  function traitsHTML() {
    var soi = !!(window.StoryQuestManager && StoryQuestManager.getChoice("roi") === "soi");
    if (!soi) return "";
    return '<details class="hs-traits"><summary>' + _t("Ce que tu portes") + ' <small>1</small></summary>'
      + '<div class="hs-trait">' + img("images/Icons/memory/forme_du_roi.png", "hs-trait-ico") + '<span><b>' + _t("La forme du roi") + '</b><small>' + _t("Le silence ne te tient plus qu’un round.") + '</small></span></div></details>';
  }

  function buildHerosResumeHTML() {
    var h = bannerHTML() + kpiStripHTML() + '<div class="hs-tiles">' + heroTiles() + '</div>' + traitsHTML();
    // Changer de héros : un vrai bouton en bas (une icône dans la bannière était trop petite).
    h += '<button type="button" class="hs-roster-btn" onclick="openHeroSlotsScreen()">' + img("images/Icons/subtabs/hero_roster.png")
      + '<span><b>' + _t("Mes héros") + '</b><small>' + _t("Changer de héros ou en créer un") + '</small></span><i class="hs-chev">›</i></button>';
    return h;
  }

  /* =========================================================
     COMPARAISON (Sac et Équipé)
     ========================================================= */
  /* Pastille de comparaison avec l'objet équipé au même emplacement.
       up : mieux (que des gains, ou emplacement vide) · down : moins bien (que des pertes)
       mix : des gains ET des pertes · same : pareil */
  function cmpState(it) {
    var eq = game.equipped ? game.equipped[it.slot] : null;
    if (!eq) return "up";
    var s = getEquipmentCompareSummary(it, eq);
    if (!s || (!s.gains && !s.pertes)) return "same";
    if (s.gains && !s.pertes) return "up";
    if (s.pertes && !s.gains) return "down";
    return "mix";
  }
  function cmpLabel(c) { return { up: _t("Mieux"), down: _t("Moins bien"), mix: _t("Des changements"), same: _t("Pareil") }[c]; }
  var CMP_SIGN = { up: "▲", down: "▼", mix: "⇅", same: "=" };
  function cmpBadge(c, extra) { return '<i class="hs-cmp is-' + c + (extra ? ' ' + extra : '') + '" title="' + esc(cmpLabel(c)) + '">' + CMP_SIGN[c] + '</i>'; }
  function countInBag(slot, state) { return getInventoryItemsForSlot(slot).filter(function (it) { return cmpState(it) === state; }).length; }

  /* =========================================================
     ÉQUIPÉ : silhouette à capuche, emplacements autour du corps
     ========================================================= */
  var SLOTS = ["helmet", "amulet", "armor", "gloves", "weapon", "ring", "boots"];
  function slotLabel(slot) { return _td(EQUIPMENT_SLOT_LABELS[slot] || slot); }
  function silhouette() { return "images/Heroes/full/silhouette_hood_" + (game.heroGender === "f" ? "f" : "m") + ".webp"; }

  function herosPickSlot(slot) { selectedEquipSlot = slot; rerender(); }
  function herosOpenSlotSheet(slot) { selectedEquipSlot = slot; openHerosSheet("slot"); }

  function setLineHTML() {
    var active = (EquipmentManager.getActiveSetBonuses ? EquipmentManager.getActiveSetBonuses() : []);
    var ico = img("images/Icons/equipment_slots/set_bonus.png", "hs-mini-ico");
    if (!active.length) return '<div class="hs-set is-off">' + ico + _t("Aucune panoplie active") + '</div>';
    return active.map(function (e) { return '<div class="hs-set">' + ico + '<b>' + esc(_td(e.config.name)) + '</b> · ' + esc(_td(e.config.text)) + '</div>'; }).join("");
  }

  function slotBtn(slot) {
    var it = game.equipped ? game.equipped[slot] : null;
    var mark = countInBag(slot, "up") ? cmpBadge("up", "hs-slot-cmp") : (countInBag(slot, "mix") ? cmpBadge("mix", "hs-slot-cmp") : "");
    return '<button type="button" class="hs-eslot pin-' + slot + (selectedEquipSlot === slot ? ' is-sel' : '') + '" data-slot="' + slot + '" onclick="herosPickSlot(\'' + slot + '\')">'
      + (it ? buildEquipmentIconHTML(it, "hs-eslot-ico rframe") : '<span class="hs-eslot-ico is-empty">' + renderIconOrEmojiHTML(EQUIPMENT_SLOT_EMOJI[slot], "", "") + '</span>')
      + mark + '<small>' + esc(slotLabel(slot)) + '</small></button>';
  }

  // Détail de l'emplacement choisi : panneau collé en bas, par-dessus la silhouette, comme celui des
  // Talents (v3.426.2, retour Seb). Icône à gauche, texte au milieu, actions à droite.
  function slotDetailHTML() {
    var slot = selectedEquipSlot || "weapon", it = game.equipped ? game.equipped[slot] : null, up = countInBag(slot, "up");
    var h = '<div class="hs-edetail">'
      + (it ? buildEquipmentIconHTML(it, "hs-edetail-ico rframe") : '<span class="hs-edetail-ico is-empty">' + renderIconOrEmojiHTML(EQUIPMENT_SLOT_EMOJI[slot], "", "") + '</span>')
      + '<div class="hs-edetail-head"><small>' + esc(slotLabel(slot)) + '</small>';
    if (it) h += '<b class="rarity-' + esc(it.rarity) + '">' + esc(_td(it.name)) + '</b><span>' + esc(formatEquipmentStat(it)) + '</span>' + buildEquipmentAffixLinesHTML(it);
    else h += '<b>' + _t("Emplacement vide") + '</b>';
    h += '</div><div class="hs-edetail-act">';
    if (it) h += '<button type="button" class="kbtn is-sec" onclick="EquipmentManager.unequip(\'' + slot + '\')">' + _t("Déséquiper") + '</button>';
    h += '<button type="button" class="kbtn' + (up ? ' primary' : '') + '" onclick="herosOpenSlotSheet(\'' + slot + '\')">'
      + (up ? _t("Mieux dans le sac ({n})", { n: up }) : _t("Changer")) + ' ›</button></div></div>';
    return h;
  }

  function buildHerosEquippedHTML() {
    if (!selectedEquipSlot) selectedEquipSlot = "weapon";
    // v3.426.3 (retour Seb) : les bonus de panoplie passent SOUS la silhouette.
    return '<div class="hs-eq" style="background-image:url(' + silhouette() + ')">' + SLOTS.map(slotBtn).join("") + '</div>'
      + '<div class="hs-sets">' + setLineHTML() + '</div>'
      + slotDetailHTML();
  }

  /* =========================================================
     SAC : modèle de l'Entrepôt
     ========================================================= */
  function bagFilters() {
    return [
      ["all", _t("Tout"), "images/Icons/subtabs/inventory.png"],
      ["weapon", _t("Armes"), "images/Icons/equipment_slots/slot_weapon.png", ["weapon"]],
      ["armor", _t("Armures"), "images/Icons/equipment_slots/slot_armor.png", ["helmet", "armor", "gloves", "boots"]],
      ["jewel", _t("Bijoux"), "images/Icons/equipment_slots/slot_ring.png", ["ring", "amulet"]],
      ["potion", _t("Potions"), "images/Icons/subtabs/potions.png"],
      "-",
      ["better", _t("Mieux que l'équipé"), "images/Icons/system/upgrade.png"]
    ];
  }
  var bagFilter = "all", bagMenuOpen = false;
  function herosBagFilter(f) { bagFilter = f; bagMenuOpen = false; rerender(); }
  function herosBagMenu() { bagMenuOpen = !bagMenuOpen; rerender(); }
  // Le tri est une action ponctuelle (il réordonne game.inventory), pas un réglage gardé.
  function herosBagSort(k) { applyInventorySort(k); bagMenuOpen = false; rerender(); }
  function herosOpenItem(key) { selectedInventoryKey = key; openHerosSheet("item"); }

  function bagEntries(f) {
    var inv = Array.isArray(game.inventory) ? game.inventory : [];
    var def = bagFilters().filter(function (x) { return x !== "-" && x[0] === f; })[0];
    var out = [];
    if (f !== "potion") inv.forEach(function (it) {
      if (f === "better" && cmpState(it) !== "up") return;
      if (def && def[3] && def[3].indexOf(it.slot) < 0) return;
      out.push({ key: "eq:" + it.uid, type: "equipment", item: it });
    });
    if (f === "all" || f === "potion") getOwnedPotionsList().forEach(function (p) { out.push({ key: p.key, type: "potion", potion: p.potion, stock: p.stock }); });
    return out;
  }

  function bagTileHTML(e) {
    if (e.type === "potion") {
      return '<button type="button" class="wh-tile hs-btile rarity-' + esc(e.potion.rarity || "common") + '" onclick="herosOpenItem(\'' + esc(e.key) + '\')">'
        + renderIconOrEmojiHTML(e.potion.icon, "wh-tile-img", "") + '<span class="wh-tile-band"><span class="wh-tile-n">' + e.stock + '</span><span class="wh-tile-name">' + esc(_td(e.potion.name)) + '</span></span></button>';
    }
    var it = e.item, p = (typeof getEquipmentIconPath === "function") ? getEquipmentIconPath(it) : "";
    return '<button type="button" class="wh-tile hs-btile rarity-' + esc(it.rarity) + '" onclick="herosOpenItem(\'' + esc(e.key) + '\')">'
      + (p ? '<img class="hs-btile-img" src="' + esc(p) + '" alt="">' : '<span class="hs-btile-img">' + renderIcon("equipment", it.icon) + '</span>')
      + cmpBadge(cmpState(it))
      + '<span class="wh-tile-band"><span class="wh-tile-name rarity-' + esc(it.rarity) + '">' + esc(_td(it.name)) + '</span></span></button>';
  }

  function buildHerosBagHTML() {
    var filters = bagFilters();
    var cur = filters.filter(function (d) { return d !== "-" && d[0] === bagFilter; })[0] || filters[0];
    var n = Array.isArray(game.inventory) ? game.inventory.length : 0, cap = (typeof getInventoryCap === "function" ? getInventoryCap() : 25);
    var h = '<div class="hs-cmp-legend">' + ["up", "down", "mix"].map(function (c) { return '<span>' + cmpBadge(c) + esc(cmpLabel(c)) + '</span>'; }).join("") + '</div>';
    h += '<div class="wh-filter">';
    if (bagMenuOpen) h += '<div class="wh-dd-veil" onclick="herosBagMenu()"></div>';
    h += '<div class="wh-dd' + (bagMenuOpen ? ' is-open' : '') + '"><button type="button" class="wh-dd-btn" onclick="herosBagMenu()"><img src="' + cur[2] + '" alt=""><span><small>' + _t("Afficher") + '</small>' + esc(cur[1]) + '</span><span class="wh-dd-car">▼</span></button>';
    if (bagMenuOpen) {
      h += '<div class="wh-dd-menu">';
      filters.forEach(function (d) {
        if (d === "-") { h += '<hr>'; return; }
        var c = bagEntries(d[0]).length;
        h += '<button type="button" class="' + (d[0] === bagFilter ? 'is-on' : '') + '" onclick="herosBagFilter(\'' + d[0] + '\')"><img src="' + d[2] + '" alt="">' + esc(d[1]) + '<span class="wh-dd-n' + (d[0] === "better" && c ? ' is-green' : '') + '">' + c + '</span></button>';
      });
      h += '<hr><div class="hs-dd-sort">' + _t("Trier :") + ' <button type="button" onclick="herosBagSort(\'rarity\')">' + _t("Rareté") + '</button>'
        + '<button type="button" onclick="herosBagSort(\'type\')">' + _t("Type") + '</button></div>';
      h += '<button type="button" class="wh-dd-pick" onclick="herosBagMenu();openInventorySettings()"><img src="images/Icons/system/auto_sell.png" alt="">' + _t("Autovente") + '…</button></div>';
    }
    h += '</div><span class="hs-bagcap"><b>' + n + '</b> / ' + cap + '<small>' + _t("objets") + '</small></span></div>';
    var es = bagEntries(bagFilter);
    var eqs = es.filter(function (e) { return e.type === "equipment"; }), pots = es.filter(function (e) { return e.type === "potion"; });
    if (eqs.length) h += '<div class="ksec"><span>' + _t("Équipement") + '</span></div><div class="wh-grid hs-bgrid">' + eqs.map(bagTileHTML).join("") + '</div>';
    if (pots.length) h += '<div class="ksec"><span>' + _t("Potions") + '</span></div><div class="wh-grid hs-bgrid">' + pots.map(bagTileHTML).join("") + '</div>';
    if (!es.length) h += '<div class="eq-empty">' + _t("Rien à afficher pour l’instant.") + '</div>';
    return h;
  }

  /* =========================================================
     TALENTS : arbre d'icônes sur le fond de la classe
     ========================================================= */
  var TT_IMG = "images/UI/talents/";
  var talentSel = null;
  function slug(x) { return String(x || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, ""); }

  // Choisir un talent ne re-rend pas la page : on déplace la sélection et on remplace le panneau du bas.
  function herosTalentSelect(id) {
    talentSel = id;
    var root = document.querySelector("#panel-container .hst-tree");
    var det = document.querySelector("#panel-container .hst-detail");
    if (!root || !det) { rerender(); return; }
    root.querySelectorAll(".hst-node.is-sel").forEach(function (b) { b.classList.remove("is-sel"); });
    root.querySelectorAll(".hst-node").forEach(function (b) { if (b.getAttribute("data-id") === id) b.classList.add("is-sel"); });
    det.outerHTML = talentDetailHTML();
  }
  function herosTalentLearn() {
    if (talentSel && TalentManager.buy(talentSel)) { if (typeof saveGame === "function") saveGame(); rerender(); }
  }

  function talentNode(n, big) {
    var TM = TalentManager, st = talentNodeState(n), r = TM.rank(n.id), max = TM.maxRank(n), pips = '';
    if (max > 1) { pips = '<span class="hst-pips">'; for (var i = 1; i <= max; i++) pips += '<i' + (i <= r ? ' class="is-on"' : '') + '></i>'; pips += '</span>'; }
    var owned = st.indexOf("is-owned") >= 0;
    return '<button type="button" data-id="' + esc(n.id) + '" class="hst-node ' + st + (big ? ' is-key' : '') + (talentSel === n.id ? ' is-sel' : '') + '" onclick="herosTalentSelect(\'' + esc(n.id) + '\')" aria-label="' + esc(_td(n.name)) + '">'
      + '<span class="hst-art">' + img(n.img || "", "hst-ico") + img(TT_IMG + (big ? "frame_key" : "frame_node") + ".webp", "hst-frame")
      + (big && !owned ? img(TT_IMG + "lock.webp", "hst-lock") : '') + '</span>' + pips + '</button>';
  }

  function talentDetailHTML() {
    var TM = TalentManager, t = TM.getTree();
    if (!talentSel || !TM.find(talentSel)) talentSel = (t.trunk[0] || {}).id;
    var e = TM.find(talentSel); if (!e) return '<div class="hst-detail"></div>';
    var n = e.node, r = TM.rank(n.id), max = TM.maxRank(n), block = TM.blockInfo ? TM.blockInfo(n.id) : null;
    var where = e.zone === "trunk" ? _t("Tronc") : _t("Voie {x}", { x: _td(e.path.name) }) + (n.key ? " · " + _t("clé de voûte") : "");
    var h = '<div class="hst-detail"><span class="hst-detail-ico">' + img(n.img || "") + '</span><div class="hst-detail-txt"><b>' + esc(_td(n.name)) + '</b><small>' + esc(where) + (max > 1 ? ' · ' + esc(_t("rang {a} / {b}", { a: r, b: max })) : '') + '</small><span>' + esc(_td(n.effect)) + '</span></div><div class="hst-detail-act">';
    if (r >= max) h += '<span class="hst-done">' + _t("Appris") + ' ✓</span>';
    else h += '<button type="button" class="kbtn primary"' + (block ? ' disabled' : '') + ' onclick="herosTalentLearn()">' + (r ? _t("Rang suivant") : _t("Apprendre")) + '<small>' + _t("1 point") + '</small></button>' + (block ? '<small class="hst-why">' + esc(block.text) + '</small>' : '');
    return h + '</div></div>';
  }

  function buildHerosTalentTreeHTML() {
    var TM = window.TalentManager;
    if (!TM || !TM.getTree()) return '<div class="pc-empty">' + _t("Talents indisponibles.") + '</div>';
    var t = TM.getTree(), gate = window.TALENT_TRUNK_GATE || 2;
    var av = TM.available(), cap = TM.cap(), cls = TM.getClassId ? TM.getClassId() : "knight";
    var h = '<div class="hst-bar"><span class="hst-bar-pts"><b>' + av + '</b> ' + esc(_tn(av, "point à placer", "points à placer")) + '</span>'
      + '<span class="hst-bar-cap">' + esc(_t("{a} / {b} placés", { a: TM.spent(), b: isFinite(cap) ? cap : "∞" })) + '</span>'
      + '<button type="button" class="hst-bar-reset" onclick="respecTalents()"' + (TM.spent() ? '' : ' disabled') + ' aria-label="' + esc(_t("Réinitialiser")) + '">↺</button></div>';
    h += '<div class="hst-tree" style="background-image:url(' + TT_IMG + 'bg_' + cls + '.webp)">'
      + '<div class="hst-trunk">' + t.trunk.map(function (n) { return talentNode(n, false); }).join('<i class="hst-link-h"></i>') + '</div>'
      + '<div class="hst-fork' + (TM.trunkSpent() >= gate ? ' is-open' : '') + '"></div><div class="hst-paths">';
    t.paths.forEach(function (p, pi) {
      h += '<div class="hst-path is-p' + pi + '"><div class="hst-banner">' + img(TT_IMG + "emb_" + slug(p.name) + ".webp", "hst-emb")
        + '<span class="hst-banner-txt"><b>' + esc(_td(p.name)) + '</b><small>' + TM.pathSpent(p) + ' / ' + p.nodes.length + '</small></span></div>';
      p.nodes.forEach(function (n) { h += '<i class="hst-link-v"></i>' + talentNode(n, !!n.key); });
      h += '</div>';
    });
    h += img(TT_IMG + "chain.webp", "hst-chain") + '</div></div>';
    return h + talentDetailHTML();
  }

  /* =========================================================
     COMPAGNONS : une carte courte, le reste dans la fiche
     ========================================================= */
  var openCompanionId = null;
  function herosOpenCompanion(id) { openCompanionId = id; openHerosSheet("companion"); }

  function companionStatus(id) {
    if (window.PatrolManager && PatrolManager.isOnPatrol(id)) {
      if (PatrolManager.isBack(id)) return { tone: "go", txt: _t("Rentré de patrouille : butin à prendre") };
      var p = PatrolManager.get(id), left = Math.max(0, Math.round((p.endsAt - Date.now()) / 60000));
      return { tone: "away", txt: _t("En patrouille · retour dans {t}", { t: left >= 60 ? _t("{h} h {m} min", { h: Math.floor(left / 60), m: left % 60 }) : _t("{m} min", { m: left }) }) };
    }
    return CompanionManager.state(id).present ? { tone: "on", txt: _t("Avec toi au combat") } : { tone: "off", txt: _t("Au camp") };
  }

  function buildHerosCompanionListHTML() {
    var h = '<div class="cp-intro">' + _t("Deux compagnons au maximum peuvent partir avec toi. Ils jouent après toi à chaque round.") + '</div>';
    CompanionManager.unlockedIds().forEach(function (id) {
      var def = getCompanionDef(id), st = CompanionManager.state(id), stats = CompanionManager.statsOf(id), hp = CompanionManager.hpOf(id), s = companionStatus(id);
      var pct = stats.maxHp > 0 ? Math.max(0, Math.min(100, hp / stats.maxHp * 100)) : 0;
      var role = COMPANION_ROLE_LABELS[def.role] ? _td(COMPANION_ROLE_LABELS[def.role]) : def.role;
      h += '<div class="hs-comp"><button type="button" class="hs-comp-head" onclick="herosOpenCompanion(\'' + id + '\')">'
        + img(def.image, "hs-comp-pt") + '<span class="hs-comp-txt"><b>' + esc(_td(def.name)) + '</b><small>' + esc(role) + ' · ' + _t("Dégâts") + ' ' + num(stats.damage) + '</small>'
        + '<span class="hs-comp-st is-' + s.tone + '">' + esc(s.txt) + '</span></span><i class="hs-chev">›</i></button>'
        + '<div class="kgauge kgauge-thin hs-comp-hp"><div class="kgauge-track"><div class="kgauge-fill" style="width:' + pct.toFixed(1) + '%"></div></div><span class="kgauge-text">' + num(Math.ceil(hp)) + ' / ' + num(stats.maxHp) + ' ' + _t("PV") + '</span></div>';
      if (!(window.PatrolManager && PatrolManager.isOnPatrol(id))) {
        h += '<div class="kseg cp-seg"><button type="button" class="' + (st.present ? 'is-on' : '') + '" onclick="companionSetPresent(\'' + id + '\', true)">' + _t("Avec toi") + '</button>'
          + '<button type="button" class="' + (!st.present ? 'is-on' : '') + '" onclick="companionSetPresent(\'' + id + '\', false)">' + _t("Au camp") + '</button></div>';
      }
      h += '</div>';
    });
    return h;
  }

  /* =========================================================
     FEUILLES (registre de ui/heros-view.js)
     ========================================================= */
  HEROS_SHEETS.slot = { title: _t("Emplacement"), icon: "images/Icons/subtabs/equipment.png", build: function () {
    return '<div class="hs-sheet">' + buildEquipDetailPanelHTML() + buildCompatibleItemsListHTML(selectedEquipSlot) + '</div>'; } };
  HEROS_SHEETS.item = { title: _t("Objet"), icon: "images/Icons/subtabs/inventory.png", build: function () {
    return '<div class="hs-sheet">' + buildUnifiedDetailPanelHTML(getUnifiedInventoryEntries()) + '</div>'; } };
  HEROS_SHEETS.companion = { title: _t("Compagnon"), icon: "images/Icons/subtabs/hero_abilities.png", build: function () {
    return '<div class="hs-sheet">' + (openCompanionId ? buildCompanionCardHTML(openCompanionId) : "") + '</div>'; } };

  /* ---------- Exports ---------- */
  window.buildHerosResumeHTML = buildHerosResumeHTML;
  window.buildHerosEquippedHTML = buildHerosEquippedHTML;
  window.buildHerosBagHTML = buildHerosBagHTML;
  window.buildHerosTalentTreeHTML = buildHerosTalentTreeHTML;
  window.buildHerosCompanionListHTML = buildHerosCompanionListHTML;
  window.herosItemCompareState = cmpState;
  window.herosPickSlot = herosPickSlot;
  window.herosOpenSlotSheet = herosOpenSlotSheet;
  window.herosBagFilter = herosBagFilter;
  window.herosBagMenu = herosBagMenu;
  window.herosBagSort = herosBagSort;
  window.herosOpenItem = herosOpenItem;
  window.herosTalentSelect = herosTalentSelect;
  window.herosTalentLearn = herosTalentLearn;
  window.herosOpenCompanion = herosOpenCompanion;
})();
