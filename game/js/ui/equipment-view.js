"use strict";
/* ui/equipment-view.js — écran Équipement, 3 sous-onglets Équipement/Inventaire/Boutique. Panneau détail unifié équipement+potions (v2.83.46), comparaison avec équipé, bonus de set. */

var activeEquipSubTab = "equipment"; // "equipment" | "inventory" | "shop" | "potions"
var selectedEquipSlot = "weapon"; // un des 7 slots réels (voir EQUIPMENT_SLOTS)
var selectedInventoryKey = null; // clé unifiée équipement("eq:uid")/potion("buff:id"/"heal:id") — v2.83.46

/* v3.222.0 : même règle que le Village — revenir sur un sous-onglet le ramène
   à son état d'accueil, plutôt qu'à l'objet qu'on regardait la fois d'avant. */
function setEquipSubTab(tab) {
  selectedInventoryKey = null;
  if (tab === "inventory") activeEquipSubTab = "inventory";
  else if (tab === "shop") activeEquipSubTab = "shop";
  else activeEquipSubTab = "equipment";
  if (typeof renderPanel === "function") renderPanel();
}
window.setEquipSubTab = setEquipSubTab;

var inventoryFilter = "all"; // "all" | "equipment" | "potions" — v2.83.46

function formatEquipmentStat(item) {
  if (!item) return "";
  var ka = typeof getItemAffinityMult === "function" ? getItemAffinityMult(item) : 1; // v3.492.12 (P1) : valeur lue par le moteur
  return formatEquipmentStatValue(item.stat, Number(item.value || 0) * ka);
}

/* v3.225.0 : texte d'une stat quelle que soit sa source (stat de base ou affixe). */
function formatEquipmentStatValue(stat, value) {
  if (stat === "tapDmg") return _t("+{n} dégâts par coup", { n: formatNumber(Math.round(value)) }); // v3.492.13 : entier, affinité comprise
  if (stat === "tapMult") return _t("+{n}% dégâts de base", { n: Math.round(value * 100) }); // v3.546.0 : ne multiplie que la Force, pas le plat de l'arme
  if (stat === "goldMult") return _t("+{n}% or", { n: Math.round(value * 100) });
  if (stat === "critChance") return _t("+{n}% critique", { n: formatNumber(value) });
  if (stat === "critMult") return _t("+{n}x dégâts crit", { n: formatNumber(value) });
  if (stat === "autoDps") return _t("+{n} célérité", { n: formatNumber(Math.round(value)) });
  if (stat === "defense") return _t("+{n}% défense", { n: formatNumber(Math.round(value * 1000) / 10) }); // v3.683.0 (NOV-20) : 1,5
  if (stat === "maxHpPct") return _t("+{n}% PV max", { n: Math.round(value * 100) });
  if (stat === "xpMult") return _t("+{n}% expérience", { n: Math.round(value * 100) });
  if (stat === "dropChance") return _t("+{n}% de butin", { n: formatNumber(value) }); // court : tient sur une ligne à 320 px

  return "+" + formatNumber(value) + " " + esc(stat);
}

/* v3.225.0 : lignes d'affixes sous la stat de base (Lot 1b — sans comparaison, voir Lot 2).
   Primaires puis secondaires ; vide pour un Commun ou un objet d'avant v3.225.0. */
function buildEquipmentAffixLinesHTML(item) {
  var affixes = (typeof getItemAffixes === "function") ? getItemAffixes(item) : [];
  if (!affixes.length) return "";
  /* v3.252.0 : primaire et secondaire ne se distinguaient que par un italique atténué —
     invisible en pratique. Une puce pleine / creuse porte la différence, et le libellé
     l'explicite pour qui ne connaît pas encore le vocabulaire. */
  var ka = typeof getItemAffinityMult === "function" ? getItemAffinityMult(item) : 1; // v3.492.12 (P1)
  var h = '<div class="eq-affix-lines">';
  affixes.forEach(function (a) {
    var sec = a.tier === "S";
    h += '<div class="eq-affix-line' + (sec ? ' is-secondary' : '') + '">';
    h += '<span class="eq-affix-dot" aria-hidden="true"></span>';
    h += '<span class="eq-affix-txt">' + esc(formatEquipmentStatValue(a.stat, a.value * ka)) + '</span>';
    h += '</div>';
  });
  h += '</div>';
  return h;
}

function formatStatDelta(stat, delta) {
  var sign = delta > 0 ? "+" : "";
  if (stat === "tapMult" || stat === "goldMult" || stat === "maxHpPct" || stat === "xpMult") return sign + Math.round(delta * 100) + "%";
  if (stat === "defense") return sign + fmtDec(Math.round(delta * 1000) / 10) + "%"; // NOV-20 : 1,5 en français ; v3.226.0 : 1 décimale, les affixes de défense en ont 3
  if (stat === "critMult") return sign + formatNumber(delta) + "x";
  if (stat === "critChance" || stat === "dropChance") return sign + formatNumber(delta) + "%";
  return sign + formatNumber(stat === "tapDmg" || stat === "autoDps" ? Math.round(delta) : delta); // v3.492.13 : entier
}

/* v3.230.0 : ligne de pouvoir d'un objet légendaire — sans delta, ce n'est pas
   une valeur qui se compare. Vide pour tout autre objet. */
function buildEquipmentPowerHTML(item) {
  var power = (typeof getItemPower === "function") ? getItemPower(item) : null;
  if (!power) return "";
  return '<div class="eq-power-line"><span class="eq-power-label">' + esc(_td(power.label)) + '</span>'
    + '<span class="eq-power-desc">' + esc(_td(power.desc)) + '</span></div>';
}

/* v3.226.0 (Lot 2) : lignes du candidat avec un delta par ligne face à l'objet équipé
   (getEquipmentCompareLines, systems/equipment-system.js). Stat de base en tête, puis
   affixes, puis en atténué ce que seul l'objet équipé porte (▼). Emplacement vide : tout ▲. */
function buildEquipmentCompareLinesHTML(candidate, equipped) {
  var lines = (typeof getEquipmentCompareLines === "function") ? getEquipmentCompareLines(candidate, equipped) : [];
  if (!lines.length) return "";
  var h = '<div class="eq-cmp-lines">';
  lines.forEach(function (l) {
    var cls = l.onlyEquipped ? "is-lost" : (l.tier === "B" ? "is-base" : (l.tier === "S" ? "is-secondary" : "is-primary"));
    var shown = l.onlyEquipped ? l.equipValue : l.candValue;
    var dcls = l.delta > 0 ? "is-up" : (l.delta < 0 ? "is-down" : "is-flat");
    var arrow = l.delta > 0 ? "\u25b2 " : (l.delta < 0 ? "\u25bc " : "\u2014");
    h += '<div class="eq-cmp-row ' + cls + '">';
    h += '<span class="eq-cmp-txt">' + esc(formatEquipmentStatValue(l.stat, shown)) + (l.onlyEquipped ? ' <small>' + _t("(équipé)") + '</small>' : '') + '</span>';
    h += '<span class="eq-cmp-delta ' + dcls + '">' + arrow + (l.delta !== 0 ? esc(formatStatDelta(l.stat, l.delta)) : '') + '</span>';
    h += '</div>';
  });
  h += '</div>';
  return h;
}

function getInventoryItemsForSlot(slot) {
  var inventory = Array.isArray(game.inventory) ? game.inventory : [];
  var order = (typeof RARITY_ORDER !== "undefined") ? RARITY_ORDER : ["common", "green", "rare", "epic", "legendary"];
  return inventory
    .filter(function (i) { return i.slot === slot; })
    .sort(function (a, b) {
      var ra = order.indexOf(a.rarity), rb = order.indexOf(b.rarity);
      if (ra !== rb) return rb - ra;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
}

/* v3.252.0 (lot B-2) — RÉSUMÉ DE COMPARAISON d'un objet du sac face à l'équipé.
   Avant, la liste n'affichait qu'un delta sur la STAT DE BASE (getEquipmentStatDelta, qui
   renvoie même null quand les deux objets n'ont pas la même stat) plus un badge « +3 » muet :
   un objet avec trois affixes excellents était indiscernable d'un objet avec trois affixes
   médiocres, et le joueur ne pouvait pas savoir lequel prendre — ce que cet écran existe
   pourtant pour lui dire.
   getEquipmentCompareLines() savait déjà fusionner base et affixes par statistique et sortir
   les deltas ; elle n'était utilisée que dans la feuille. On s'en sert ici. */
function getEquipmentCompareSummary(candidate, equipped) {
  var lines = (typeof getEquipmentCompareLines === "function") ? getEquipmentCompareLines(candidate, equipped) : [];
  if (!lines.length) return null;
  var base = null, gains = 0, pertes = 0;
  lines.forEach(function (l) {
    if (l.tier === "B" && !l.onlyEquipped) base = l;
    if (l.delta > 0) gains += 1;
    else if (l.delta < 0 || l.onlyEquipped) pertes += 1;
  });
  return { lines: lines, base: base, gains: gains, pertes: pertes };
}

/* Une ligne du sac : nom complet, stat de base avec son delta, puis le RESTE chiffré
   (« +2 autres gains », « −1 perte ») au lieu d'un badge « +3 » qui ne disait rien. */
function buildCompatibleItemsListHTML(slot) {
  var items = getInventoryItemsForSlot(slot);
  if (!items.length) return "";

  var equipped = game.equipped[slot];
  var h = '<div class="eq-compat-list">';
  h += '<div class="ksec eq-compat-title"><img class=ico-inline src=images/Icons/subtabs/inventory.webp> ' + _t("Dans le sac ({n})", { n: items.length }) + '</div>';

  items.slice(0, 5).forEach(function (item) {
    var sum = getEquipmentCompareSummary(item, equipped);
    var baseDelta = (sum && sum.base) ? sum.base.delta : null;
    var autresGains = sum ? Math.max(0, sum.gains - (baseDelta > 0 ? 1 : 0)) : 0;
    var pertes = sum ? sum.pertes : 0;

    h += '<div class="eq-compat-row" onclick="openEquipCompareSheet(\'' + esc(item.uid) + '\')">';
    h += '<div class="eq-compat-icon">' + buildEquipmentIconHTML(item, "eq-compat-icon-img rframe") + '</div>';
    h += '<div class="eq-compat-info">';
    var dIl = equipped && typeof getItemLevel === "function" ? getItemLevel(item) - getItemLevel(equipped) : 0; // v3.615.0 : écart d'ilvl avec la pièce portée
    h += '<div class="eq-compat-name rarity-' + esc(item.rarity) + '">' + esc(_td(item.name))
      + (dIl ? ' <span class="eq-ilvl-delta ' + (dIl > 0 ? "is-up" : "is-down") + '">' + esc(_t("ilvl {d}", { d: (dIl > 0 ? "\u25b2 +" : "\u25bc ") + dIl })) + '</span>' : '') + '</div>';
    h += '<div class="eq-compat-stat">' + esc(formatEquipmentStat(item));
    if (baseDelta != null && baseDelta !== 0) {
      h += ' <span class="eq-compat-delta ' + (baseDelta > 0 ? "is-up" : "is-down") + '">'
        + (baseDelta > 0 ? "\u25b2" : "\u25bc") + esc(formatStatDelta(sum.base.stat, baseDelta)) + '</span>';
    }
    h += '</div>';
    /* Le reste du bilan, en clair. C'est ce qui permet enfin de choisir. */
    if (autresGains > 0 || pertes > 0) {
      h += '<div class="eq-compat-extra">';
      if (autresGains > 0) h += '<span class="is-up">' + _tn(autresGains, "+{n} gain", "+{n} gains") + '</span>';
      if (autresGains > 0 && pertes > 0) h += '<span class="eq-compat-extra-sep">\u00b7</span>';
      if (pertes > 0) h += '<span class="is-down">' + _tn(pertes, "−{n} perte", "−{n} pertes") + '</span>';
      h += '</div>';
    }
    h += '</div>';
    h += '<button class="btn-buy eq-compat-equip-btn" type="button" onclick="event.stopPropagation(); EquipmentManager.equip(\'' + esc(item.uid) + '\')">' + _t("Équiper") + '</button>';
    h += '</div>';
  });

  if (items.length > 5) {
    h += '<button class="eq-compat-more-btn" type="button" onclick="setEquipSubTab(\'inventory\')">' + _t("Voir les {n} objets dans l’Inventaire →", { n: items.length }) + '</button>';
  }

  h += '</div>';
  return h;
}

/* Feuille de comparaison détaillée — même composant que la feuille d'états de combat (B-1).
   C'est le seul endroit où l'on peut dire honnêtement « +79 dégâts mais −6 % d'or » : un
   arbitrage que la liste seule rend invisible. */
function buildEquipCompareSheetHTML(uid) {
  var item = (game.inventory || []).find(function (i) { return i.uid === uid; });
  if (!item) return "";
  var equipped = game.equipped[item.slot];
  var sum = getEquipmentCompareSummary(item, equipped);

  var h = '<div class="ksheet-backdrop" onclick="closeEquipCompareSheet()"></div>';
  h += '<div class="ksheet eqs-sheet">';
  h += kSheetHeadHTML({
    icon: buildEquipmentIconHTML(item, "eqs-title-icon rframe"),
    title: '<span class="rarity-' + esc(item.rarity) + '">' + esc(_td(item.name)) + '</span>',
    sub: esc(_td(EQUIPMENT_SLOT_LABELS[item.slot] || item.slot))
      + (equipped ? ' · ' + esc(_t("comparé à {x}", { x: _td(equipped.name) })) : ' · ' + _t("emplacement vide")),
    close: "closeEquipCompareSheet()"
  });
  h += '<div class="ksheet-body">';

  if (sum && sum.lines.length) {
    sum.lines.forEach(function (l) {
      var shown = l.onlyEquipped ? l.equipValue : l.candValue;
      var tier = l.tier === "B" ? _t("base", "ligne d'objet") : (l.tier === "S" ? _t("secondaire") : _t("primaire"));
      var dcls = l.delta > 0 ? "is-up" : (l.delta < 0 ? "is-down" : "is-flat");
      h += '<div class="eqs-row' + (l.onlyEquipped ? " is-lost" : "") + '">';
      h += '<div class="eqs-row-body">';
      h += '<div class="eqs-row-txt">' + esc(formatEquipmentStatValue(l.stat, shown)) + '</div>';
      h += '<div class="eqs-row-tier">' + tier + (l.onlyEquipped ? " — " + _t("seulement sur l’objet porté") : "") + '</div>';
      h += '</div>';
      h += '<div class="eqs-row-delta ' + dcls + '">'
        + (l.delta > 0 ? "\u25b2 " : l.delta < 0 ? "\u25bc " : "\u2014")
        + (l.delta !== 0 ? esc(formatStatDelta(l.stat, l.delta)) : "") + '</div>';
      h += '</div>';
    });
  }

  var power = buildEquipmentPowerHTML(item);
  if (power) h += '<div class="eqs-power">' + power + '</div>';
  h += buildItemOriginHTML(item);
  h += buildItemStoryCountHTML(item, false);
  h += '</div>';
  h += '<div class="ksheet-foot"><button type="button" class="kbtn primary" onclick="equipFromCompareSheet(\'' + esc(uid) + '\')">' + _t("Équiper") + '</button></div>';
  h += '</div>';
  return h;
}

function openEquipCompareSheet(uid) {
  var host = document.getElementById("equip-compare-modal-root");
  if (host) host.innerHTML = buildEquipCompareSheetHTML(uid);
}
function closeEquipCompareSheet() {
  var host = document.getElementById("equip-compare-modal-root");
  if (host) host.innerHTML = "";
}
function equipFromCompareSheet(uid) {
  closeEquipCompareSheet();
  if (window.EquipmentManager && typeof EquipmentManager.equip === "function") EquipmentManager.equip(uid);
}
window.getEquipmentCompareSummary = getEquipmentCompareSummary;
window.buildEquipCompareSheetHTML = buildEquipCompareSheetHTML;
window.openEquipCompareSheet = openEquipCompareSheet;
window.closeEquipCompareSheet = closeEquipCompareSheet;
window.equipFromCompareSheet = equipFromCompareSheet;

function buildEquipDetailPanelHTML() {
  var slot = selectedEquipSlot;
  var label = _td(EQUIPMENT_SLOT_LABELS[slot] || slot);
  var emoji = EQUIPMENT_SLOT_EMOJI[slot] || "images/Icons/equipment_slots/slot_unknown.webp";
  var item = game.equipped[slot];
  var h = '<div class="eq-detail-panel">';

  if (item) {
    h += '<div class="eq-detail-icon">' + buildEquipmentIconHTML(item, "eq-detail-icon-img rframe") + '</div>';
    h += '<div class="eq-detail-name rarity-' + esc(item.rarity) + '">' + esc(_td(item.name)) + '</div>';
    h += '<div class="eq-detail-stat">' + esc(formatEquipmentStat(item)) + '</div>';
    h += buildEquipmentAffixLinesHTML(item);
    h += buildEquipmentPowerHTML(item); // v3.230.0
    h += buildItemOriginHTML(item);
    h += buildItemStoryCountHTML(item, true);
    h += '<button class="btn-buy is-sec eq-detail-action" type="button" onclick="EquipmentManager.unequip(\'' + esc(slot) + '\')">' + _t("Déséquiper") + '</button>';
  } else {
    h += '<div class="eq-detail-icon eq-detail-icon-empty">' + renderIconOrEmojiHTML(emoji, "eq-detail-empty-img", "") + '</div>';
    h += '<div class="eq-detail-name">' + esc(_t("{x} — vide", { x: label })) + '</div>';
    h += '<div class="eq-detail-hint">' + _t("Équipe un objet depuis l’Inventaire pour remplir cet emplacement.") + '</div>';
  }

  // v3.252.0 : la liste du sac a quitté ce panneau — il fait 50 % de largeur (~150 px utiles),
  // ce qui tronquait les noms à une lettre (« D… »). Elle est rendue en pleine largeur, après.
  h += buildCompactSetBonusHTML();

  h += '</div>';
  return h;
}

function buildCompactSetBonusHTML() {
  var active = (window.EquipmentManager && typeof EquipmentManager.getActiveSetBonuses === "function")
    ? EquipmentManager.getActiveSetBonuses()
    : [];

  if (!active.length) {
    var h = '<div class="eq-detail-setbonus">';
    h += '<span class="eq-detail-setbonus-icon"><img class=ico-inline src=images/Icons/equipment_slots/set_bonus.webp></span>';
    h += '<span class="eq-detail-setbonus-text">' + _t("Bonus de set inactif") + '</span>';
    h += '</div>';
    return h;
  }

  var out = '';
  active.forEach(function (entry) {
    out += '<div class="eq-detail-setbonus is-active">';
    out += '<span class="eq-detail-setbonus-icon"><img class=ico-inline src=images/Icons/equipment_slots/set_bonus.webp></span>';
    out += '<span class="eq-detail-setbonus-text">' + esc(_td(entry.config.name)) + ' — ' + esc(_td(entry.config.text)) + '</span>';
    out += '</div>';
  });
  return out;
}

function getUnifiedInventoryEntries() {
  var entries = [];

  if (inventoryFilter !== "potions") {
    (Array.isArray(game.inventory) ? game.inventory : []).forEach(function (item) {
      entries.push({ key: "eq:" + item.uid, type: "equipment", item: item });
    });
  }

  if (inventoryFilter !== "equipment") {
    getOwnedPotionsList().forEach(function (p) {
      entries.push({ key: p.key, type: "potion", potion: p.potion, isHealing: p.isHealing, stock: p.stock });
    });
    // v3.448.11 : les objets de combat rejoignent les potions (stock toujours tenu par l'Entrepôt)
    (window.COMBAT_ITEM_ORDER || []).forEach(function (id) {
      var stock = window.WarehouseManager ? WarehouseManager.getAmount(id) : 0;
      if (stock > 0) entries.push({ key: "item:" + id, type: "combatItem", item: COMBAT_ITEMS[id], stock: stock });
    });
  }

  return entries;
}

/* v3.220.0 : provenance d'un objet. Avec l'échelle de monde, deux objets de
   même rareté peuvent avoir des valeurs très différentes — sans cette ligne, le
   joueur n'a aucun moyen de comprendre pourquoi. Un objet d'une sauvegarde
   antérieure n'a pas de `worldIndex` : il est de fait de Forêt, et on l'affiche
   comme tel plutôt que de laisser un trou. */
/* v3.615.0 (atelier ilvl, variante C) : dans la fiche, « ilvl 57 » et le détail du calcul. */
function buildItemLevelLineHTML(item) {
  var p = typeof getItemLevelParts === "function" ? getItemLevelParts(item) : null;
  if (!p) return "";
  var w = window.WORLDS && WORLDS[p.world] ? _td(WORLDS[p.world].name).split(" ")[0] : "";
  var parts = [w + " " + p.monde, String(_td((window.RARITY_LABELS || {})[item.rarity || "common"] || "") || "").toLowerCase() + " +" + p.rarete, _t("tirage +{n}", { n: p.tirage })];
  if (p.aether) parts.push(_t("Aether +{n}", { n: p.aether }));
  return '<div class="eq-detail-ilvl"><span class="ilpill rarity-' + esc(item.rarity) + '">' + esc(_t("ilvl {n}", { n: p.total })) + '</span><span>' + esc(parts.join(" · ")) + '</span></div>';
}
window.buildItemLevelLineHTML = buildItemLevelLineHTML;

function buildItemOriginHTML(item) {
  if (!item) return "";
  // v3.461.0 (N-E) : objet tiré au-delà du plafond d'un niveau de donjon
  var aether = item.aether > 0 ? '<div class="eq-detail-hint">✦ ' + esc(_t("Touché par l'Aether · niveau {n}", { n: item.aether })) + '</div>' : "";
  // v3.492.11 (L1, retour Seb) : sur les 7 emplacements, plus seulement ceux qui suivent l'échelle de monde
  var idx = (typeof item.worldIndex === "number") ? item.worldIndex : 0;
  var world = (window.WORLDS && WORLDS[idx]) ? WORLDS[idx].name : null;
  if (!world) return buildItemLevelLineHTML(item) + aether;
  // v3.492.12 (P1) : l'affinité de monde, active ou non selon où se tient le héros
  var A = window.EQUIP_WORLD_AFFINITY, aff = "";
  if (A && idx >= A.fromWorld) {
    var n = Math.round(A.bonus * 100), actif = typeof getItemAffinityMult === "function" && getItemAffinityMult(item) > 1;
    aff = '<div class="eq-detail-hint">✦ ' + esc(actif ? _t("Affinité : +{n} % ici, dans son monde", { n: n }) : _t("Affinité : +{n} % en {w}", { n: n, w: _td(world) })) + '</div>';
  }
  return buildItemLevelLineHTML(item) + '<div class="eq-detail-hint"><img class=ico-inline src=images/Icons/quests/quest_resources.webp> ' + esc(_t("Trouvé en {w}", { w: _td(world) })) + '</div>' + aff + aether;
}
window.buildItemOriginHTML = buildItemOriginHTML;

/* v3.492.11 (L3) : pendant le palier de la Montagne, l'objet qui comble un emplacement (ou qui compte, s'il est porté). */
function buildItemStoryCountHTML(item, equipped) {
  if (typeof storyItemComptePourPalier !== "function" || !storyItemComptePourPalier(item, equipped)) return "";
  return '<div class="eq-detail-hint eq-story-count"><img class=ico-inline src=images/Icons/system/check_valid.webp> ' + esc(_t("Compte pour l'Histoire")) + '</div>';
}
window.buildItemStoryCountHTML = buildItemStoryCountHTML;

function buildUnifiedDetailPanelHTML(entries) {
  var entry = entries.find(function (e) { return e.key === selectedInventoryKey; });
  var h = '<div class="eq-detail-panel">';

  if (!entry) {
    h += '<div class="eq-detail-icon eq-detail-icon-empty"><img class=ico-inline src=images/Icons/subtabs/inventory.webp></div>';
    h += '<div class="eq-detail-name">' + _t("Aucun objet sélectionné") + '</div>';
    h += '<div class="eq-detail-hint">' + _t("Touche un objet dans le sac pour voir son détail ici.") + '</div>';
  } else if (entry.type === "equipment") {
    var item = entry.item;
    h += '<div class="eq-detail-icon">' + buildEquipmentIconHTML(item, "eq-detail-icon-img rframe") + '</div>';
    h += '<div class="eq-detail-name rarity-' + esc(item.rarity) + '">' + esc(_td(item.name)) + '</div>';
    h += buildEquipmentCompareLinesHTML(item, game.equipped ? game.equipped[item.slot] : null); // v3.226.0 : delta par ligne
    h += buildEquipmentPowerHTML(item); // v3.230.0
    h += buildItemOriginHTML(item);
    h += buildItemStoryCountHTML(item, false);
    h += '<button class="btn-buy eq-detail-action" type="button" onclick="EquipmentManager.equip(\'' + esc(item.uid) + '\')">' + _t("Équiper") + '</button>';
    // v3.322.0 (O2) : la vente devient l'Offrande ; la valeur s'affiche, 0 compris (O9)
    var offerVal = window.MemoryManager ? Math.floor(MemoryManager.rollOfferingValue(item)) : 0; // v3.453.0 : Main offrante comprise
    h += '<button class="btn-buy is-sec eq-detail-action" type="button" onclick="confirmSellItem(\'' + esc(item.uid) + '\')">' + (offerVal > 0 ? _t("Offrir (+{n} Aether)", { n: offerVal }) : _t("Offrir (aucun souvenir)")) + '</button>';
    h += buildEquippedComparisonHTML(item);
  } else if (entry.type === "combatItem") {
    // v3.448.11 : fiche d'un objet de combat — ce qu'il contre, d'où il vient, où il sert
    var ci = entry.item;
    h += '<div class="eq-detail-icon">' + renderIconOrEmojiHTML(ci.icon, "eq-detail-icon-img", _td(ci.name)) + '</div>';
    h += '<div class="eq-detail-name">' + esc(_td(ci.name)) + '</div>';
    h += '<div class="eq-detail-stat">' + esc(_td(ci.desc)) + (ci.con ? ' ' + esc(_td(ci.con)) : '') + '</div>';
    h += '<div class="eq-detail-hint"><img class=ico-inline src=images/Icons/subtabs/inventory.webp> ' + _t("Stock : {n}", { n: entry.stock }) + '</div>';
    h += '<div class="eq-detail-hint">' + _t("Se prépare à l'Apothicaire. S'emporte au départ, dans la préparation de sortie.") + '</div>';
  } else {
    var potion = entry.potion;
    var descText = entry.isHealing
      ? _t("Restaure {p}% des PV max.", { p: Math.round(potion.healPercent * 100) })
      : _td(potion.desc);

    h += '<div class="eq-detail-icon">' + renderIconOrEmojiHTML(potion.icon, "eq-detail-icon-img", _td(potion.name)) + '</div>';
    h += '<div class="eq-detail-name">' + esc(_td(potion.name)) + '</div>';
    h += '<div class="eq-detail-stat">' + esc(descText) + '</div>';
    h += '<div class="eq-detail-hint"><img class=ico-inline src=images/Icons/subtabs/inventory.webp> ' + _t("Stock : {n}", { n: entry.stock }) + '</div>';

    // v3.466.1 (retour Seb) : plus de bouton Utiliser ici, les potions se prennent dans la préparation de sortie
    h += '<div class="eq-detail-hint">' + (entry.isHealing
      ? _t("Se boit en combat : la préparation de sortie dit combien tu en emportes.")
      : _t("Se boit au départ, dans la préparation de sortie.")) + '</div>';
    h += '<button class="btn-buy is-sec eq-detail-action" type="button" onclick="PotionManager.sellPotion(\'' + esc(potion.id) + '\')">' + _t("Vendre") + '</button>';
  }

  h += '</div>';
  return h;
}

function buildEquippedComparisonHTML(item) {
  var equipped = game.equipped ? game.equipped[item.slot] : null;
  var h = '<div class="eq-compare-box">';
  h += '<div class="eq-compare-title"><img class=ico-inline src=images/Icons/system/auto_repeat.webp> ' + _t("Actuellement équipé") + '</div>';

  if (!equipped) {
    h += '<div class="eq-compare-empty">' + _t("Rien d’équipé sur cet emplacement — équiper cet objet sera un pur gain.") + '</div>';
  } else {
    h += '<div class="eq-compare-row">';
    h += '<div class="eq-compare-icon">' + buildEquipmentIconHTML(equipped, "eq-compare-icon-img rframe") + '</div>';
    h += '<div class="eq-compare-info">';
    h += '<div class="eq-compare-name rarity-' + esc(equipped.rarity) + '">' + esc(_td(equipped.name)) + '</div>';
    h += '<div class="eq-compare-stat">' + esc(formatEquipmentStat(equipped)) + '</div>';
    h += buildEquipmentAffixLinesHTML(equipped);
    h += '</div>';
    h += '</div>';

    /* v3.226.0 : le delta global a disparu (D6) — chaque ligne du candidat porte le sien, ci-dessus. */
  }

  h += '</div>';
  return h;
}

function applyInventorySort(kind) {
  if (kind === "type") sortInventoryByType();
  else sortInventoryByRarity();
}
window.applyInventorySort = applyInventorySort;

function buildInventorySettingsHTML() {
  var threshold = game.autoSellRarityThreshold || "common";
  var rarities = (typeof RARITY_ORDER !== "undefined") ? RARITY_ORDER : ["common", "green", "rare", "epic", "legendary"];

  // v3.400.0 (lot F-2) : réglages = feuille du bas du kit (en-tête de pierre, croix, voile)
  var h = '<div class="full-menu-overlay" onclick="if (event.target === this) closeInventorySettings();">';
  h += '  <div class="full-menu inv-settings-sheet">';
  h += kSheetHeadHTML({ icon: '<img src="images/Icons/system/auto_sell.webp" alt="">', title: _t("Réglages du sac"), close: "closeInventorySettings()" });
  h += '  <div class="ksheet-body">';

  h += '    <div class="auto-sell-toggle-row">';
  h += '      <button class="auto-sell-toggle' + (game.autoSellEquipment ? ' is-on' : '') + '" type="button" onclick="toggleAutoSellEquipment();openInventorySettings();">';
  h += '        <span class="auto-sell-switch"></span>';
  h += '        <span class="auto-sell-label"><img class=ico-inline src=images/Icons/system/auto_sell.webp> ' + (game.autoSellEquipment ? _t("Auto-offrande activée") : _t("Auto-offrande désactivée")) + '</span>';
  h += '      </button>';
  h += '    </div>';

  h += '    <div class="inv-threshold-label">' + _t("Offrir automatiquement tout objet de rareté :") + '</div>';
  h += '    <div class="inv-threshold-row">';
  rarities.forEach(function (r) {
    var label = (typeof RARITY_LABELS !== "undefined" && RARITY_LABELS[r]) ? _td(RARITY_LABELS[r]) : r;
    h += '<button class="inv-threshold-pill rarity-' + esc(r) + (threshold === r ? ' is-active' : '') + '" type="button" onclick="setAutoSellRarityThreshold(\'' + esc(r) + '\');openInventorySettings();">' + esc(label) + '</button>';
  });
  h += '    </div>';
  h += '    <div class="inv-threshold-hint">' + _t("... ou en dessous.") + '</div>';
  // v3.228.0 : l'autovente ne regarde que la rareté, pas les affixes — le dire pour éviter la mauvaise surprise.
  h += '    <div class="inv-threshold-hint">' + _t("Le tri se fait sur la rareté seule : un objet de cette rareté part même si ses bonus sont excellents. Une arme d'élite n'est jamais offerte d'office.") + '</div>';

  h += '  </div>'; // ksheet-body
  h += '  <div class="ksheet-foot"><button class="kbtn danger" type="button" onclick="confirmSellAllInventory()"><img class=ico-inline src=images/Icons/system/bulk_sell.webp> ' + _t("Tout offrir") + '</button></div>';

  h += '  </div>';
  h += '</div>';
  return h;
}

function openInventorySettings() {
  var host = document.getElementById("full-menu-root");
  if (host) host.innerHTML = buildInventorySettingsHTML();
}

function closeInventorySettings() {
  var host = document.getElementById("full-menu-root");
  if (host) host.innerHTML = "";
}
window.openInventorySettings = openInventorySettings;
window.closeInventorySettings = closeInventorySettings;

/* v3.322.0 (O2) : confirmations d'Offrande. Les noms des fonctions sont gardés (appelants). */
/* v3.427.1 : `after` (facultatif) est appelé une fois l'Offrande faite — l'écran Héros s'en sert pour
   refermer la fiche de l'objet et revenir au sac (retour Seb). */
function confirmSellItem(uid, after) {
  var item = (Array.isArray(game.inventory) ? game.inventory : []).find(function (i) { return i.uid === uid; });
  var itemName = item ? _td(item.name) : _t("cet objet");
  var value = (item && window.MemoryManager) ? Math.floor(MemoryManager.rollOfferingValue(item)) : 0; // v3.453.0 : Main offrante comprise
  if (typeof showConfirmModal !== "function") { EquipmentManager.sell(uid); if (typeof after === "function") after(); return; }
  showConfirmModal(
    _t("Offrir cet objet ?"),
    value > 0
      ? _t("Tu donnes {x} à l'Aether, qui t'en rendra {n}. L'objet disparaît.", { x: itemName, n: formatNumber(value) })
      : _t("{x} a été acheté : il ne porte aucun souvenir et ne rendra pas d'Aether. L'objet disparaît.", { x: itemName }),
    "images/Icons/system/ascension.webp",
    function () { EquipmentManager.sell(uid); if (typeof after === "function") after(); }
  );
}
window.confirmSellItem = confirmSellItem;

function confirmSellAllInventory() {
  var inventory = Array.isArray(game.inventory) ? game.inventory : [];
  var count = inventory.filter(function (it) { return it && !it.unique; }).length;
  if (!count) { showToast(_t("Aucun objet à offrir"), 1200); return; }
  var totalValue = window.MemoryManager ? MemoryManager.previewOfferAll() : 0;
  if (typeof showConfirmModal !== "function") { sellAllInventory(); return; }
  closeInventorySettings();
  showConfirmModal(
    _t("Tout offrir ?"),
    _t("Tu donnes les {n} objets de ton sac à l'Aether, pour {v} Aether environ. Les armes d'élite restent. Cette action est irréversible.", { n: count, v: formatNumber(totalValue) }),
    "images/Icons/system/trash.webp",
    function () { sellAllInventory(); }
  );
}
window.confirmSellAllInventory = confirmSellAllInventory;

function getOwnedPotionsList() {
  var order = (typeof RARITY_ORDER !== "undefined") ? RARITY_ORDER : ["common", "green", "rare", "epic", "legendary"];
  var list = [];

  (POTIONS_DB || []).forEach(function (p) {
    var stock = PotionManager.getStock(p.id);
    if (stock > 0) list.push({ key: "buff:" + p.id, potion: p, isHealing: false, stock: stock });
  });
  (HEALING_POTIONS_DB || []).forEach(function (p) {
    var stock = PotionManager.getHealingStock(p.id);
    if (stock > 0) list.push({ key: "heal:" + p.id, potion: p, isHealing: true, stock: stock });
  });

  list.sort(function (a, b) {
    var ra = order.indexOf(a.potion.rarity || "common"), rb = order.indexOf(b.potion.rarity || "common");
    if (ra !== rb) return rb - ra;
    return String(a.potion.name || "").localeCompare(String(b.potion.name || ""));
  });

  return list;
}
