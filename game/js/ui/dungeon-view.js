"use strict";
/* ui/dungeon-view.js — écran Donjon (v3.245.0, refonte Donjons, doc v1.1 §5) : une carte par monde, feuille basse .ksheet de
   lancement avec les Marques, carte de run actif, sorties du jour, rapport de fin. La Boutique d'éclats vit chez l'Enchanteresse
   (ui/village-building-view.js). Détail complet : COMMENTAIRES_ORIGINAUX.md */

var pendingDungeonId = null;   // donjon ouvert dans la feuille de lancement
var pendingDungeonMarks = [];  // bascules de la feuille — copiées dans game.dungeonRun.marks au start() seulement
var pendingDungeonLevel = 1;   // v3.464.0 : niveau choisi (atelier/niveaux-donjon.html, validé le 23/10)
var pendingDungeonFree = false; // v3.464.0 : mode libre (sorties illimitées, 1 Ration moyenne)
var pendingDungeonMarksOpen = false; // v3.476.0 : Marques repliées par défaut (point 5 du bilan)
var pendingDungeonLoreOpen = false;  // v3.476.0 : récit et Sceau repliés

function buildDungeonActiveHTML() {
  var dungeon = DungeonManager.getById(game.dungeonRun.dungeonId);
  var wave = game.dungeonRun.wave || 1;
  var total = DUNGEON_CONFIG.waveCount;
  var isBossWave = wave > total;
  var progressPct = Math.min(100, Math.round((Math.min(wave, total) / total) * 100));
  var marks = DungeonManager.getRunMarks();

  var h = '<div class="panel-card dungeon-active-card">';
  h += '<div class="dungeon-active-tier">' + esc(_td(dungeon.name)) + '</div>';
  h += '<div class="dungeon-wave-label">' + (isBossWave ? '<img class=ico-inline src=images/Icons/dungeon/boss_crown.webp> ' + _t("Boss du donjon") : _t("Vague {a} / {b}", { a: wave, b: total })) + '</div>';
  h += '<div class="dungeon-progress-bar"><div class="dungeon-progress-fill' + (isBossWave ? ' is-boss' : '') + '" style="width:' + progressPct + '%"></div></div>';
  if (marks.length) {
    h += '<div class="dungeon-active-marks">';
    marks.forEach(function (m) { h += renderIconOrEmojiHTML(m.icon, "dungeon-active-mark-icon", _td(m.name)); });
    h += '<span>×' + DungeonManager.getMarkRewardMult(marks.length).toFixed(2).replace(/0$/, "") + '</span></div>';
  }
  var boons = DungeonManager.getRunBoons(); // v3.472.0 : cartes prises aux haltes
  if (boons.length) h += '<div class="dungeon-active-boons">' + boons.map(function (c) { return '<span>' + esc(_td(c.name)) + '</span>'; }).join("") + '</div>';
  h += '<p class="panel-sub">' + _t("Bats-toi dans l’onglet Combat. Si tes PV tombent à 0, la tentative s’arrête ici (récompense réduite selon les vagues passées).") + '</p>';
  h += '<button class="settings-btn danger" type="button" onclick="DungeonManager.forfeit()">' + _t("Abandonner la tentative") + '</button>';
  h += '</div>';
  return h;
}

/* Une carte par donjon : image 96 px à gauche (.is-full existante), monde, nom, rareté max,
   matériau annoncé, raison du verrou ou statut « Boss vaincu ». */
function buildDungeonCardHTML(dungeon) {
  var reason = DungeonManager.getLockReason(dungeon.id);
  var unlocked = reason === null;
  var heroDowned = (game.heroHp || 0) <= 0;
  var rarityLabel = (typeof RARITY_LABELS !== "undefined" && RARITY_LABELS[dungeon.maxRarity]) ? _td(RARITY_LABELS[dungeon.maxRarity]) : dungeon.maxRarity;
  var rarityColor = (typeof RARITY_COLORS !== "undefined" && RARITY_COLORS[dungeon.maxRarity]) || "#9ca3af";
  var world = (window.WORLDS || []).find(function (w) { return w.id === dungeon.worldId; });

  var imageHTML = dungeon.icon
    ? renderIconOrEmojiHTML(dungeon.icon, "dungeon-tier-img", _td(dungeon.name))
    : '<span class="dungeon-tier-num">' + dungeon.id + '</span>';

  var cardTag = unlocked ? 'button' : 'div';
  var cardAttrs = unlocked ? ' type="button" onclick="openDungeonSheet(' + dungeon.id + ')"' : '';

  var h = '<' + cardTag + ' class="dungeon-tier-card is-full' + (unlocked ? ' is-tappable' : ' is-locked') + (unlocked && heroDowned ? ' is-downed' : '') + '"' + cardAttrs + '>';
  h += '<div class="dungeon-tier-image">' + imageHTML
     + (unlocked ? '' : '<span class="dungeon-tier-image-lock"><img class=ico-inline src=images/Icons/system/lock_closed.webp></span>')
     + (unlocked && heroDowned ? '<span class="dungeon-tier-image-lock"><img class=ico-inline src=images/Icons/camp/hero_defeated.webp></span>' : '') + '</div>';
  h += '<div class="dungeon-tier-info">';
  if (world) h += '<div class="dungeon-tier-world">' + esc(_td(world.name)) + '</div>';
  h += '<div class="dungeon-tier-name">' + esc(_td(dungeon.name)) + '</div>';
  h += '<div class="dungeon-tier-rarity" style="color:' + rarityColor + '"><img class=ico-inline src=images/Icons/dungeon/dungeon_guaranteed_loot.webp> ' + esc(_t("{x} max", { x: rarityLabel })) + '</div>';

  /* v3.223.0 : le matériau de monde est annoncé AVANT d'entrer — c'est une raison de choisir ce donjon. */
  if (dungeon.specialResourceId && dungeon.specialResourceAmount > 0) {
    var specialDef = WAREHOUSE_RESOURCES[dungeon.specialResourceId];
    if (specialDef) {
      h += '<div class="dungeon-tier-special">'
         + renderIconOrEmojiHTML(specialDef.icon, "dungeon-tier-special-icon", _td(specialDef.name))
         + '+' + dungeon.specialResourceAmount + ' ' + esc(_td(specialDef.name)) + '</div>';
    }
  }

  if (!unlocked) {
    var lockText;
    if (reason === "data") {
      lockText = dungeon.lockedHint ? esc(_td(dungeon.lockedHint)) : _t("Pas encore disponible");
    } else if (reason === "world") {
      var reqWorld = (window.WORLDS && WORLDS[dungeon.worldRequired]) ? _td(WORLDS[dungeon.worldRequired].name) : null;
      lockText = reqWorld ? esc(_t("Atteins {w} pour débloquer", { w: reqWorld })) : _t("Monde trop bas");
    } else {
      var list = DUNGEONS || [];
      var idx = list.indexOf(dungeon);
      var previous = idx > 0 ? list[idx - 1] : null;
      lockText = previous ? esc(_t("Termine {x} pour débloquer", { x: _td(previous.name) })) : _t("Verrouillé");
    }
    h += '<div class="dungeon-tier-lock-text">' + lockText + '</div>';
  } else if (heroDowned) {
    h += '<div class="dungeon-tier-lock-text">' + _t("Héros à terre — repos requis") + '</div>';
  } else if ((game.dungeonTierCleared || {})[dungeon.id]) {
    h += '<div class="dungeon-tier-done"><img src="images/Icons/dungeon/boss_crown.webp" alt=""> ' + _t("Boss vaincu") + '</div>';
  }
  if (unlocked) h += buildDungeonRunsLineHTML(dungeon.id); // v3.358.0 (D7)

  h += '</div>';
  h += '</' + cardTag + '>';
  return h;
}
/* v3.358.0 (D7) : sorties du jour de ce donjon, ou « offerte » quand l'Histoire la demande. */
function buildDungeonRunsLineHTML(dungeonId) {
  if (DungeonManager.isStoryTicketFree(dungeonId)) return '<div class="dungeon-tier-runs is-free">' + _t("Sortie offerte par l'Histoire") + '</div>';
  var left = DungeonManager.getRunsLeft(dungeonId), max = DungeonManager.getRunsPerDay();
  return '<div class="dungeon-tier-runs' + (left <= 0 ? ' is-empty' : '') + '">' + _t("Sorties restantes : {a} / {b}", { a: left, b: max }) + '</div>';
}
window.buildDungeonRunsLineHTML = buildDungeonRunsLineHTML;

/* v3.358.0 (D7) : plus de tickets. Le bandeau dit la règle et le renouvellement ; le compte
   de chaque donjon est sur sa carte. */
function buildDungeonTicketBadgeHTML() {
  var h = '<div class="dungeon-ticket-badge dungeon-runs-badge">';
  h += '<span class="dungeon-ticket-badge-icon"><img class=ico-inline src=images/Icons/dungeon/dungeon_ticket.webp></span>';
  h += '<span class="dungeon-ticket-badge-label">' + esc(_t("{n} sorties par jour et par donjon · renouvellement dans {d}", { n: DungeonManager.getRunsPerDay(), d: DungeonManager.timeUntilTicketReset() })) + '</span>';
  h += '</div>';
  return h;
}

function buildDungeonLobbyHTML() {
  var h = buildDungeonTicketBadgeHTML();
  h += '<div class="dungeon-list">';
  (DUNGEONS || []).forEach(function (dungeon) { h += buildDungeonCardHTML(dungeon); });
  h += '</div>';
  return '<div class="nb-page-frame nb-page-frame-fill kframe-page" data-kf-title="' + esc("images/Icons/subtabs/dungeon.webp|" + _t("Donjon")) + '">' + h + '</div>'; // v2.83.28
}

function buildDungeonHTML() {
  if (window.DungeonManager && typeof DungeonManager.checkTicketReset === "function") {
    DungeonManager.checkTicketReset();
  }
  var isActive = !!(game.dungeonRun && game.dungeonRun.active);
  // v3.245.0 : plus de sous-onglets (la Boutique est chez l'Enchanteresse) — .subtab-page conservé pour le scroll
  var h = '<div class="subtab-page">';
  h += '<div class="subtab-page-content">';
  h += isActive ? buildDungeonActiveHTML() : buildDungeonLobbyHTML();
  h += '</div>';
  h += '</div>';
  return h;
}
window.buildDungeonHTML = buildDungeonHTML;

/* ---------- Feuille de lancement (.ksheet) ---------- */
function buildDungeonSceauLoreHTML(dungeonId) {
  if (typeof CodexManager === "undefined") return "";
  var entry = CodexManager.getById("dungeon_tier_" + dungeonId);
  if (!entry) return "";
  return '<div class="dsheet-lore">« ' + esc(_td(entry.text)) + ' »</div>';
}

/* v3.464.0 (Niveaux de donjon, lot 5) : mode, niveau, et ce que le niveau rapporte. */
function dungeonRarityHTML(r) {
  var lab = (typeof RARITY_LABELS !== "undefined" && RARITY_LABELS[r]) ? _td(RARITY_LABELS[r]) : r;
  var col = (typeof RARITY_COLORS !== "undefined" && RARITY_COLORS[r]) || "#9ca3af";
  return '<b class="dsheet-rarity" style="color:' + col + '">' + esc(lab) + '</b>';
}

function buildDungeonLevelHTML(d) {
  var D = DungeonManager, L = pendingDungeonLevel, max = D.getMaxLevel(d.id), best = D.getLevelBest(d.id);
  var cleared = !!(game.dungeonTierCleared || {})[d.id], left = D.getRunsLeft(d.id), per = D.getRunsPerDay();
  var h = '<div class="dlvl"><div class="kseg">';
  h += '<button type="button" class="' + (!pendingDungeonFree ? 'is-on' : '') + '"' + (left <= 0 ? ' disabled' : '') + ' onclick="setDungeonMode(false)"><span>' + _t("Sortie du jour") + '</span><small>' + left + ' / ' + per + '</small></button>';
  h += '<button type="button" class="' + (pendingDungeonFree ? 'is-on' : '') + '"' + (cleared ? '' : ' disabled') + ' onclick="setDungeonMode(true)"><span>' + _t("Mode libre") + '</span><small>' + (cleared ? _t("1 Ration moyenne") : _t("après une victoire")) + '</small></button>';
  h += '</div><div class="dlvl-row">';
  h += '<button type="button" class="dlvl-step" aria-label="' + _t("Niveau précédent") + '"' + (L <= 1 ? ' disabled' : '') + ' onclick="stepDungeonLevel(-1)">‹</button>';
  h += '<div class="dlvl-num"><small>' + _t("Niveau") + '</small><strong>' + L + '</strong><small>' + (best ? _t("meilleur : {n}", { n: best }) : _t("jamais terminé")) + '</small></div>';
  h += '<button type="button" class="dlvl-step" aria-label="' + _t("Niveau suivant") + '"' + (L >= max ? ' disabled' : '') + ' onclick="stepDungeonLevel(1)">›</button>';
  h += '</div>';
  h += '</div>';
  return h;
}

/* v3.476.0 (point 5 du bilan, atelier/feuille-lancement.html, validé par Seb) : « À gagner » regroupe tout le butin. */
function buildDungeonGainHTML(d, L, free, nMarks) {
  var D = DungeonManager, pct = function (x) { return Math.round(x * 100); };
  var src = D.getLevelLootSource(d, L), beyond = D.getLevelBeyond(d, L), mult = D.getMarkRewardMult(nMarks);
  var w = (window.WORLDS || []).find(function (x) { return x.id === src.worldId; });
  var row = function (ico, html) { return '<div class="dgain-row">' + (ico ? renderIconOrEmojiHTML(ico, "dgain-ico", "") : '<span class="dgain-dot" aria-hidden="true"></span>') + '<span>' + html + '</span></div>'; };
  var h = '<div class="dgain"><div class="dgain-ttl"><span>' + _t("À gagner") + '</span><span>' + _t("Récompenses") + ' <strong>×' + mult.toFixed(2).replace(/0$/, "") + '</strong></span></div>';
  h += row(null, _t("Butin :") + ' ' + dungeonRarityHTML(src.maxRarity) + (w ? ' · ' + esc(_td(w.name)) : ''));
  var sp = d.specialResourceId && WAREHOUSE_RESOURCES[d.specialResourceId];
  if (free) {
    h += row("images/Icons/subtabs/shard_shop.webp", _t("Libre : or ÷ 4, Éclats ÷ 2") + (sp ? ', ' + _t("pas de {x}", { x: esc(_td(sp.name)) }) : ''));
  } else {
    var sh = DUNGEON_CONFIG.waveCount + DUNGEON_CONFIG.shardsBossBonus;
    h += row(sp ? sp.icon : "images/Icons/subtabs/shard_shop.webp", (sp && d.specialResourceAmount > 0 ? esc(_td(sp.name)) + ' <strong>+' + D.getSpecialAmount(d, nMarks) + '</strong> · ' : '') + _t("Éclats") + ' <strong>+' + sh + '</strong>');
  }
  var u = d.boss && d.boss.unique, pw = u && window.LEGENDARY_POWER_BY_ID ? LEGENDARY_POWER_BY_ID[u.power] : null;
  if (u) {
    var uIco = typeof getEquipmentIconPath === "function" ? getEquipmentIconPath({ icon: u.icon, rarity: src.maxRarity }) : "";
    h += row(uIco, '<b>' + esc(_td(u.name)) + '</b> · ' + _t("{n} % par victoire", { n: DUNGEON_CONFIG.uniqueDropPct })
      + (pw ? '<br><span class="is-dim"><b>' + esc(_td(pw.label)) + '</b> · ' + esc(_td(pw.desc)) + '</span>' : ''));
  }
  if (beyond > 0) {
    h += row("images/Icons/gold_icon.webp", _t("Or et Éclats +{g} %", { g: pct(D.getBeyondMult(DUNGEON_CONFIG.beyondGoldPct, beyond) - 1) })
      + ' · <span class="is-aether">✦ ' + _t("Touché par l'Aether : objets tirés au-dessus de {f} %", { f: pct(D.getLevelFloor(d, L)) }) + '</span>'); // v3.473.1 : en cumul
  } else {
    var next = (d.levelSteps || []).filter(function (st) { return st.level > L; })[0];
    if (next) {
      var nd = D.getById(next.dungeonId);
      h += row(null, '<span class="is-dim">' + (D.isUnlocked(next.dungeonId)
        ? _t("Niveau {n} : butin {r} ({x})", { n: next.level, r: dungeonRarityHTML(nd.maxRarity), x: esc(_td(nd.name)) })
        : _t("Niveau {n} : butin {r} ({x}, une fois ouvert)", { n: next.level, r: dungeonRarityHTML(nd.maxRarity), x: esc(_td(nd.name)) })) + '</span>');
    } else if (L > 1 || D.getLevelBest(d.id)) {
      h += row(null, '<span class="is-dim">' + _t("Au-delà du niveau {n} : or, Éclats et objets « Touché par l'Aether »", { n: D.getCapLevel(d) }) + '</span>');
    }
  }
  return h + '</div>';
}

/* v3.476.0 : « Ce qui t'attend » — vagues de groupe, élites qui mettent le butin en sûreté, campement, haltes. */
function buildDungeonAheadHTML(d, L, storyFree) {
  var D = DungeonManager, pct = function (x) { return Math.round(x * 100); }, m = D.getLevelMult(L);
  var groups = Object.keys(d.groupWaves || {}).length, elites = Object.keys(d.eliteWaves || {}).map(Number).sort(function (a, b) { return a - b; });
  var camp = D.getCamp(d), cleared = !!(game.dungeonTierCleared || {})[d.id];
  var row = function (html) { return '<div class="dgain-row"><span class="dgain-dot" aria-hidden="true"></span><span>' + html + '</span></div>'; };
  var h = '<div class="dgain"><div class="dgain-ttl"><span>' + _t("Ce qui t'attend") + '</span></div>';
  var line = _t("{w} vagues, dont {n} en groupe", { w: DUNGEON_CONFIG.waveCount, n: groups });
  if (elites.length) line += ' · ' + _t("élites aux vagues {a} ; chacune met ton butin en sûreté", { a: elites.join(" " + _t("et") + " ") });
  h += row(line);
  if (camp) h += row(_t("Un campement après la vague {n}", { n: camp.afterWave }));
  if (L > 1) h += row(_t("Monstres : PV +{a} %, dégâts +{b} %", { a: pct(m.hp - 1), b: pct(m.power - 1) }));
  if ((d.haltSlots || []).length) h += row(cleared && !storyFree ? _t("1 à 3 haltes, trois cartes au choix (aucune ne soigne)") : _t("Des haltes, après une première victoire"));
  return h + '</div>';
}

function setDungeonMode(free) {
  pendingDungeonFree = !!free;
  renderDungeonSheet();
}
window.setDungeonMode = setDungeonMode;

function stepDungeonLevel(dl) {
  if (pendingDungeonId == null) return;
  pendingDungeonLevel = Math.max(1, Math.min(DungeonManager.getMaxLevel(pendingDungeonId), pendingDungeonLevel + dl));
  renderDungeonSheet();
}
window.stepDungeonLevel = stepDungeonLevel;

function buildDungeonSheetHTML(dungeonId) {
  var dungeon = DungeonManager.getById(dungeonId);
  var world = (window.WORLDS || []).find(function (w) { return w.id === dungeon.worldId; });
  var storyFree = typeof DungeonManager.isStoryTicketFree === "function" && DungeonManager.isStoryTicketFree(dungeon.id);
  var level = storyFree ? 1 : pendingDungeonLevel, free = !storyFree && pendingDungeonFree; // la sortie de l'Histoire : niveau 1
  var lootRarity = DungeonManager.getLevelLootSource(dungeon, level).maxRarity; // v3.464.0 : l'en-tête suit le niveau
  var rarityLabel = (typeof RARITY_LABELS !== "undefined" && RARITY_LABELS[lootRarity]) ? _td(RARITY_LABELS[lootRarity]) : lootRarity;
  var rarityColor = (typeof RARITY_COLORS !== "undefined" && RARITY_COLORS[lootRarity]) || "#9ca3af";
  var n = pendingDungeonMarks.length;
  var maxMarks = DUNGEON_CONFIG.maxMarks || 3;
  var mult = DungeonManager.getMarkRewardMult(n);

  var h = '<div class="ksheet-backdrop" onclick="closeDungeonSheet()"></div>';
  h += '<div class="ksheet dungeon-sheet">';
  h += kSheetHeadHTML({
    icon: renderIconOrEmojiHTML(dungeon.icon || "images/Icons/subtabs/dungeon.webp", "", _td(dungeon.name)),
    title: esc(_td(dungeon.name)),
    sub: (world ? esc(_td(world.name)) + ' · ' : '') + _t("{n} vagues + boss · {r} max", { n: DUNGEON_CONFIG.waveCount, r: '<span class="dsheet-rarity" style="color:' + rarityColor + '">' + esc(rarityLabel) + '</span>' }),
    close: "closeDungeonSheet()"
  });
  h += '<div class="ksheet-body">';
  // v3.476.0 (point 5) : ce qui décide d'abord (mode, niveau, pronostic), puis la préparation, le butin, la suite
  if (!storyFree) h += buildDungeonLevelHTML(dungeon);
  /* v3.247.0 : pronostic du donjon, Marques comprises. v3.429.7 : le run ENTIER (usure des
     quinze vagues, entrée à PV pleins), puis le boss avec ce qui reste. */
  if (window.CombatForecast && typeof CombatForecast.forDungeon === "function") {
    try {
      var f = CombatForecast.forDungeon(dungeon.id, pendingDungeonMarks, level);
      if (f) h += buildCombatForecastLineHTML(f);
    } catch (e) { noteErreur("dungeon-view.buildDungeonSheetHTML", e); /* pronostic indisponible : la feuille reste utilisable */ }
  }
  // v3.429.6 : conseil de préparation, tant que le donjon n'a jamais été vaincu ; v3.475.0 : liste cochée (prepChecks)
  if (!(game.dungeonTierCleared || {})[dungeon.id]) {
    if (dungeon.prepChecks && dungeon.prepChecks.length) h += buildDungeonPrepHTML(dungeon);
    else if (dungeon.prepHint) h += '<div class="dsheet-ticket"><img class=ico-inline src=images/Icons/system/warning.webp> ' + esc(_td(dungeon.prepHint)) + '</div>';
  }
  h += buildDungeonGainHTML(dungeon, level, free, n);
  h += buildDungeonAheadHTML(dungeon, level, storyFree);

  // Marques, repliées par défaut : le résumé dit combien et pour quel gain
  h += '<button type="button" class="dsheet-fold" aria-expanded="' + pendingDungeonMarksOpen + '" onclick="toggleDungeonFold(\'marks\')"><b>' + _t("Marques") + '</b><span>'
    + n + ' / ' + maxMarks + ' · ×' + mult.toFixed(2).replace(/0$/, "") + ' <i aria-hidden="true">' + (pendingDungeonMarksOpen ? '▲' : '▼') + '</i></span></button>';
  if (pendingDungeonMarksOpen) (DUNGEON_MARKS || []).forEach(function (m) {
    var on = pendingDungeonMarks.indexOf(m.id) !== -1;
    var ok = DungeonManager.isMarkUnlocked(m.id, dungeon.id);
    h += '<button type="button" class="dmark' + (on ? ' is-on' : '') + (ok ? '' : ' is-locked') + '" onclick="toggleDungeonMark(\'' + esc(m.id) + '\')">';
    h += renderIconOrEmojiHTML(m.icon, "dmark-img", _td(m.name));
    h += '<span class="dmark-body"><span class="dmark-name">' + esc(_td(m.name)) + '</span><br><span class="dmark-desc">' + (ok ? esc(_td(m.desc)) : _t("Termine ce donjon une fois")) + '</span></span>';
    h += '<span class="dmark-state"></span></button>';
  });

  // Histoire : le récit et le Sceau, repliés
  var lore = (dungeon.story ? '<div class="dsheet-story">' + esc(_td(dungeon.story)) + '</div>' : '') + buildDungeonSceauLoreHTML(dungeon.id);
  if (lore) {
    h += '<button type="button" class="dsheet-fold" aria-expanded="' + pendingDungeonLoreOpen + '" onclick="toggleDungeonFold(\'lore\')"><b>' + _t("Histoire") + '</b><span><i aria-hidden="true">' + (pendingDungeonLoreOpen ? '▲' : '▼') + '</i></span></button>';
    if (pendingDungeonLoreOpen) h += lore;
  }

  if (storyFree) h += '<div class="dsheet-ticket"><img class=ico-inline src=images/Icons/dungeon/dungeon_ticket.webp> <strong>' + _t("Entrée offerte") + '</strong> ' + _t("— les braises te guident, aucune sortie du jour consommée") + '</div>';
  // v3.330.1 : vivres de sortie (donjon déjà fini une fois)
  var dDef = (window.DUNGEONS || []).filter(function (x) { return x.id === Number(dungeonId); })[0];
  if (window.ProvisionsManager && dDef) h += ProvisionsManager.buildLineHTML(free ? "dungeonFree" : "dungeon", dDef);
  h += '</div>'; // ksheet-body
  h += '<div class="ksheet-foot"><button type="button" class="kbtn primary" onclick="confirmDungeonStart()">' + _t("Entrer") + '</button></div>';
  h += '</div>';
  return h;
}

function renderDungeonSheet() {
  var host = document.getElementById("dungeon-modal-root");
  if (host && pendingDungeonId != null) host.innerHTML = buildDungeonSheetHTML(pendingDungeonId);
}

function openDungeonSheet(dungeonId) {
  if (!DungeonManager.isUnlocked(dungeonId)) return showToast(_t("Donjon verrouillé"), 1200);
  if ((game.heroHp || 0) <= 0) return showToast(_t("Héros à terre — repose-toi au Campement d'abord"), 1600);
  var storyFree = typeof DungeonManager.isStoryTicketFree === "function" && DungeonManager.isStoryTicketFree(dungeonId);
  var cleared = !!(game.dungeonTierCleared || {})[Number(dungeonId)]; // v3.464.0 : quota vide, le mode libre reste ouvert
  if (!storyFree && !cleared && DungeonManager.getRunsLeft(dungeonId) <= 0) return showToast(_t("Plus de sortie aujourd'hui dans ce donjon — renouvellement dans {d}", { d: DungeonManager.timeUntilTicketReset() }), 1800); // v3.358.0 (D7)
  pendingDungeonId = Number(dungeonId);
  pendingDungeonMarks = [];
  pendingDungeonLevel = Math.max(1, Math.min(DungeonManager.getMaxLevel(dungeonId), DungeonManager.getLevelBest(dungeonId))); // le meilleur niveau tenu
  pendingDungeonFree = !storyFree && DungeonManager.getRunsLeft(dungeonId) <= 0;
  pendingDungeonMarksOpen = false; pendingDungeonLoreOpen = false; // v3.476.0
  renderDungeonSheet();
}

function toggleDungeonFold(which) {
  if (which === "marks") pendingDungeonMarksOpen = !pendingDungeonMarksOpen;
  else pendingDungeonLoreOpen = !pendingDungeonLoreOpen;
  renderDungeonSheet();
}
window.toggleDungeonFold = toggleDungeonFold;

function closeDungeonSheet() {
  pendingDungeonId = null;
  pendingDungeonMarks = [];
  var host = document.getElementById("dungeon-modal-root");
  if (host) host.innerHTML = "";
}

function toggleDungeonMark(markId) {
  if (pendingDungeonId == null) return;
  if (!DungeonManager.isMarkUnlocked(markId, pendingDungeonId)) return;
  var i = pendingDungeonMarks.indexOf(markId);
  if (i !== -1) pendingDungeonMarks.splice(i, 1);
  else if (pendingDungeonMarks.length >= (DUNGEON_CONFIG.maxMarks || 3)) return showToast(_t("{n} Marques au plus", { n: DUNGEON_CONFIG.maxMarks || 3 }), 1200);
  else pendingDungeonMarks.push(markId);
  renderDungeonSheet();
}

function confirmDungeonStart() {
  var id = pendingDungeonId;
  var marks = pendingDungeonMarks.slice(), level = pendingDungeonLevel, free = pendingDungeonFree;
  closeDungeonSheet();
  if (id == null) return;
  var d = DungeonManager.getById(id);
  // v3.440.0 : préparation de sortie avant le départ
  openSortiePrep({ title: d ? _td(d.name) : "", icon: (d && d.icon) || "images/Icons/quests/mission_dungeon.webp", ctx: { type: "dungeon", id: id },
    onGo: function () { DungeonManager.start(id, marks, level, free); } });
}

/* ---------- Le campement (v3.430.0, RU13 — atelier/campement-sanctuaire.html, validé le 09/10) ----------
   Feuille sans croix : on n'en sort qu'en choisissant. Une seule action : Souffler, Changer de
   compagnon (le nouveau venu descend à PV pleins), Sortir. Le combat attend derrière (modale bloquante). */
var campPick = null;
var campParty = [];

function openDungeonCampSheet() {
  if (!DungeonManager.isCampPending()) return;
  campPick = null;
  campParty = window.CompanionManager ? CompanionManager.partyIds().slice() : [];
  renderDungeonCampSheet();
}

function renderDungeonCampSheet() {
  var host = document.getElementById("dungeon-modal-root");
  if (!host) return;
  if (!DungeonManager.isCampPending()) { host.innerHTML = ""; return; }
  host.innerHTML = buildDungeonCampSheetHTML();
}

function campPct(hp, max) { return Math.max(0, Math.min(100, Math.round(Number(hp || 0) / Math.max(1, Number(max || 1)) * 100))); }

/* Une ligne du groupe : PV, et l'aperçu avant / après quand Souffler est choisi. */
function buildCampMemberHTML(img, name, hp, max, gain, fresh) {
  var p = campPct(hp, max), a = gain ? campPct(Math.min(max, hp + gain), max) : p;
  var h = '<div class="dcamp-who">' + (img ? '<img class="dcamp-ava" src="' + esc(img) + '" alt="">' : '<span class="dcamp-ava is-hero">' + _t("Toi") + '</span>');
  h += '<b>' + esc(name) + (fresh ? ' <small>· ' + _t("frais") + '</small>' : '') + '</b>';
  h += '<span class="dcamp-num">' + (gain ? p + ' % → <em>' + a + ' %</em>' : p + ' %') + '</span>';
  h += '<div class="dcamp-pv"><i class="' + (gain ? 'is-gain' : (p < 35 ? 'is-low' : '')) + '" style="width:' + a + '%' + (gain && a > 0 ? ';--from:' + Math.round(p / a * 100) + '%' : '') + '"></i></div></div>';
  return h;
}

function buildDungeonCampSheetHTML() {
  var run = game.dungeonRun || {}, dungeon = DungeonManager.getById(run.dungeonId), camp = DungeonManager.getCamp(dungeon) || {};
  var CM = window.CompanionManager, heal = campPick === "souffler", pct = DungeonManager.getCampHealPct(camp); // v3.463.0 : + Second souffle
  var cand = DungeonManager.campCandidates(), now = CM ? CM.partyIds() : [];
  var canSwap = CM && cand.length > now.length;
  var shown = campPick === "changer" ? campParty : now;
  var loot = run.campLoot || {};

  var h = '<div class="ksheet-backdrop"></div>';
  h += '<div class="ksheet dungeon-camp-sheet">';
  h += kSheetHeadHTML({
    icon: '<img src="images/Icons/camp/campfire.webp" alt="">',
    title: _t("Le campement"),
    sub: _t("Salle de garde · étape 1 sur 2 passée")
  });
  h += '<div class="ksheet-body">';
  h += '<p class="dcamp-quote">' + _t("Des lits de pierre, trop courts pour Maddoc. Tu fais du feu. La fumée monte droit, par un trou percé exprès pour elle.") + '</p>';

  h += '<div class="dcamp-lbl">' + _t("Le groupe") + '</div><div class="dcamp-card">';
  h += buildCampMemberHTML(null, _t("Toi"), game.heroHp || 0, game.heroMaxHp || 1, heal ? Math.floor((game.heroMaxHp || 1) * pct) : 0, false);
  shown.forEach(function (id) {
    var def = getCompanionDef(id), max = CM.maxHpOf(id), fresh = now.indexOf(id) === -1;
    var hp = fresh ? max : CM.hpOf(id);
    h += buildCampMemberHTML(def && def.image, def ? _td(def.name) : id, hp, max, heal ? Math.floor(max * pct) : 0, fresh);
  });
  h += '</div>';

  h += '<div class="dcamp-lbl">' + _t("Butin de l’étape 1") + '</div><div class="dcamp-card dcamp-loot">';
  h += '<span><img class=ico-inline src=images/Icons/gold_icon.webp> +' + formatNumber(loot.gold || 0) + ' ' + _t("or") + '</span>';
  h += '<span><img class=ico-inline src=images/Icons/subtabs/shard_shop.webp> +' + formatNumber(loot.shards || 0) + ' ' + _t("Éclats") + '</span>';
  var sDef = loot.stoneId && WAREHOUSE_RESOURCES[loot.stoneId];
  if (sDef && loot.stone > 0) h += '<span>' + renderIconOrEmojiHTML(sDef.icon, "ico-inline", _td(sDef.name)) + ' +' + loot.stone + ' ' + esc(_td(sDef.name)) + '</span>';
  (loot.items || []).forEach(function (it) {
    var col = (typeof RARITY_COLORS !== "undefined" && RARITY_COLORS[it.rarity]) || "inherit";
    h += '<span><img class=ico-inline src=images/Icons/dungeon/dungeon_guaranteed_loot.webp> <span style="color:' + col + '">' + esc(_td(it.name)) + '</span></span>';
  });
  h += '</div>';

  h += '<div class="dcamp-lbl">' + _t("Une seule action") + '</div>';
  h += buildCampOptionHTML("souffler", "images/Icons/combat_stats/stat_health.webp", _t("Souffler"), _t("Le groupe reprend {n} % de ses PV.", { n: Math.round(pct * 100) }), heal ? _t("Puis la descente reprend.") : "", "", true);
  var sw = "";
  if (campPick === "changer") {
    sw = '<div class="dcamp-swap">' + cand.map(function (id) {
      var def = getCompanionDef(id), on = campParty.indexOf(id) !== -1;
      return '<button type="button" aria-pressed="' + on + '" onclick="event.stopPropagation();toggleCampCompanion(\'' + esc(id) + '\')">'
        + '<img src="' + esc(def && def.image || "") + '" alt="">' + esc(def ? _td(def.name) : id) + '</button>';
    }).join("") + '</div>';
  }
  h += buildCampOptionHTML("changer", "images/Icons/subtabs/hero_summary.webp", _t("Changer de compagnon"),
    canSwap ? _t("Deux sur trois, selon ce qui attend en bas. Celui qui arrive est frais.") : _t("Aucun autre compagnon ne peut descendre."), campSwapText(now), sw, canSwap);
  h += buildCampOptionHTML("sortir", "images/Icons/camp/campfire.webp", _t("Sortir"), _t("Tu remontes avec le butin de l’étape 1. Il est à toi."), campPick === "sortir" ? _t("La sortie s’arrête là.") : "", "", true);
  h += '<p class="dcamp-next">' + _t("En bas : vagues {a} à {b}, une élite, puis le boss. Tomber en bas ne coûte que le butin d’en bas.", { a: (Number(camp.afterWave) || 8) + 1, b: DUNGEON_CONFIG.waveCount }) + '</p>';
  h += '</div>';

  var changed = campParty.slice().sort().join() !== now.slice().sort().join();
  var ready = campPick === "souffler" || campPick === "sortir" || (campPick === "changer" && changed && campParty.length === Math.min(COMPANION_MAX_PRESENT, cand.length));
  var label = !campPick ? _t("Choisis une action") : campPick === "souffler" ? _t("Souffler, puis descendre")
    : campPick === "sortir" ? _t("Remonter avec le butin") : (ready ? _t("Changer, puis descendre") : _t("Choisis qui descend"));
  h += '<div class="ksheet-foot"><button type="button" class="kbtn primary"' + (ready ? '' : ' disabled') + ' onclick="confirmCampAction()">' + label + '</button></div>';
  h += '</div>';
  return h;
}

function buildCampOptionHTML(id, icon, title, desc, eff, extra, enabled) {
  var on = campPick === id;
  return '<div class="dcamp-opt' + (on ? ' is-on' : '') + (enabled ? '' : ' is-off') + '" role="radio" tabindex="0" aria-checked="' + on + '"'
    + (enabled ? ' onclick="pickCampAction(\'' + id + '\')"' : '') + '>'
    + '<img src="' + icon + '" alt=""><b>' + title + '</b><span>' + desc + '</span>'
    + (eff ? '<span class="dcamp-eff">' + eff + '</span>' : '') + (extra || '') + '</div>';
}

function campSwapText(now) {
  if (campPick !== "changer") return "";
  var inn = campParty.filter(function (id) { return now.indexOf(id) === -1; });
  var out = now.filter(function (id) { return campParty.indexOf(id) === -1; });
  if (campParty.length < Math.min(COMPANION_MAX_PRESENT, DungeonManager.campCandidates().length)) return _t("Touche qui descend.");
  if (!inn.length) return _t("Touche celui qui garde le feu, puis celui qui descend.");
  var n = function (id) { var d = getCompanionDef(id); return d ? _td(d.name) : id; };
  return _t("{a} descend, {b} garde le feu.", { a: n(inn[0]), b: n(out[0]) });
}

function pickCampAction(id) {
  campPick = id;
  if (id !== "changer") campParty = window.CompanionManager ? CompanionManager.partyIds().slice() : [];
  renderDungeonCampSheet();
}

function toggleCampCompanion(id) {
  var i = campParty.indexOf(id);
  if (i !== -1) campParty.splice(i, 1);
  else if (campParty.length < COMPANION_MAX_PRESENT) campParty.push(id);
  renderDungeonCampSheet();
}

function confirmCampAction() {
  var pick = campPick, party = campParty.slice();
  if (!pick) return;
  var host = document.getElementById("dungeon-modal-root");
  if (pick !== "sortir" && host) host.innerHTML = "";
  if (!DungeonManager.campAction(pick, party)) { renderDungeonCampSheet(); return; }
  campPick = null;
  if (pick !== "sortir" && typeof switchTab === "function") switchTab("combat");
}

/* ---------- Préparation (v3.475.0, point 2 du bilan) ----------
   Une ligne par condition, cochée selon la partie : l'arme ou l'armure d'une élite (quête d'élite réussie),
   un bâtiment au niveau voulu. Ce qui manque dit où aller. */
function dungeonPrepRows(dungeon) {
  return (dungeon.prepChecks || []).map(function (c) {
    if (c.kind === "elite") {
      var def = (window.ELITE_UNIQUE_LOOT || {})[c.eliteId], elite = (window.ELITE_DB || {})[c.eliteId];
      var cls = typeof getClassByHeroId === "function" ? getClassByHeroId(game.heroId) : null;
      var entry = def && (def.item || (def.byClass && (def.byClass[cls ? cls.id : "knight"] || def.byClass.knight)));
      var done = !!(game.adventureQuestsCompleted || {})[c.questId];
      return { done: done, label: entry ? _td(entry.name) : c.eliteId,
        sub: done ? _t("obtenu") : _t("à gagner contre {e}, dans Quêtes › Aventure", { e: elite ? _td(elite.name) : c.eliteId }) };
    }
    if (c.kind === "building") {
      var b = (window.VILLAGE_BUILDINGS || {})[c.buildingId];
      var lvl = window.VillageBuildingManager && typeof VillageBuildingManager.getLevel === "function" ? VillageBuildingManager.getLevel(c.buildingId) : 0;
      return { done: lvl >= c.level, label: _t("{x} niveau {n}", { x: b ? _td(b.name) : c.buildingId, n: c.level }),
        sub: lvl >= c.level ? _t("atteint") : _t("niveau actuel : {n}, au Village", { n: lvl }) };
    }
    return null;
  }).filter(Boolean);
}

function buildDungeonPrepHTML(dungeon) {
  var rows = dungeonPrepRows(dungeon), ready = rows.every(function (r) { return r.done; });
  var h = '<div class="dprep"><div class="dprep-ttl">' + (ready ? _t("Préparation : tout est prêt") : _t("Préparation conseillée")) + '</div>';
  rows.forEach(function (r) {
    h += '<div class="dprep-row' + (r.done ? ' is-done' : '') + '"><span class="dprep-mark" aria-hidden="true">' + (r.done ? '✔' : '✗') + '</span>'
      + '<span><b>' + esc(r.label) + '</b> · ' + esc(r.sub) + '</span></div>';
  });
  return h + '</div>';
}

/* ---------- La halte (v3.472.0, atelier/halte-donjon.html, validé par Seb) ----------
   Feuille sans croix : trois cartes, une à prendre, ou Passer. Le combat attend derrière (modale bloquante). */
var haltPick = null;

function openDungeonHaltSheet() {
  if (!DungeonManager.isHaltPending()) return;
  haltPick = null;
  renderDungeonHaltSheet();
}

function renderDungeonHaltSheet() {
  var host = document.getElementById("dungeon-modal-root");
  if (!host) return;
  if (!DungeonManager.isHaltPending()) { host.innerHTML = ""; return; }
  host.innerHTML = buildDungeonHaltSheetHTML();
}

// Lignes d'une carte : gain ▲, coût ▼, note ; le Râtelier nomme l'objet qu'il donne
function haltCardLines(card, dungeon) {
  var h = '<span class="dhalt-l is-gain">▲ ' + esc(_td(card.gain)) + '</span>';
  if (card.cost) h += '<span class="dhalt-l is-cost">▼ ' + esc(_td(card.cost)) + '</span>';
  var item = card.counterItem && window.COMBAT_ITEMS ? COMBAT_ITEMS[DungeonManager.getCounterItemId(dungeon)] : null;
  if (item) h += '<span class="dhalt-l">' + esc(_td(item.name)) + ' : ' + esc(_td(item.desc)) + '</span>';
  else if (card.note) h += '<span class="dhalt-l">' + esc(_td(card.note)) + '</span>';
  return h;
}

function haltCardIcon(card, dungeon) {
  var item = card.counterItem && window.COMBAT_ITEMS ? COMBAT_ITEMS[DungeonManager.getCounterItemId(dungeon)] : null;
  return renderIconOrEmojiHTML((item && item.icon) || card.icon || "images/Icons/dungeon/halte.webp", "dhalt-ico", _td(card.name));
}

function buildDungeonHaltSheetHTML() {
  var run = game.dungeonRun || {}, dungeon = DungeonManager.getById(run.dungeonId);
  var halts = run.halts || [], done = (run.haltsDone || []).length, wave = Math.max(0, Number(run.wave || 1) - 1);
  var taken = DungeonManager.getRunBoons();
  var h = '<div class="ksheet-backdrop"></div>';
  h += '<div class="ksheet dungeon-halt-sheet">';
  h += kSheetHeadHTML({
    icon: renderIconOrEmojiHTML("images/Icons/dungeon/halte.webp", "", ""),
    title: _t("Une halte"),
    sub: _t("Après la vague {n} · halte {a} sur {b}", { n: wave, a: done, b: halts.length })
      + (taken.length ? '<span class="dhalt-prev"> · ' + _t("déjà pris : {x}", { x: esc(taken.map(function (c) { return _td(c.name); }).join(", ")) }) + '</span>' : "")
  });
  h += '<div class="ksheet-body">';
  h += '<p class="dcamp-quote">' + _t("Une salle oubliée, à l'écart du passage. Rien n'y bouge, sauf ce qu'on y a laissé.") + '</p>';
  h += '<div class="dhalt-rule">' + _t("Aucune halte ne soigne : tes PV restent ceux de la vague {n}.", { n: wave }) + '</div>';
  if (taken.length) {
    h += '<div class="dcamp-lbl dhalt-taken-lbl">' + _t("Déjà pris sur ce run") + '</div>';
    taken.forEach(function (c) { h += '<div class="dhalt-taken">' + haltCardIcon(c, dungeon) + '<span><b>' + esc(_td(c.name)) + '</b> · ' + esc(_td(c.gain)) + '</span></div>'; });
  }
  h += '<div class="dcamp-lbl">' + _t("Prends une carte, ou passe") + '</div>';
  (run.haltDraw || []).forEach(function (id) {
    var c = DungeonManager.getHaltCard(id);
    if (!c) return;
    var on = haltPick === id;
    h += '<div class="dhalt-opt' + (on ? ' is-on' : '') + '" role="radio" tabindex="0" aria-checked="' + on + '" onclick="pickHaltCard(\'' + esc(id) + '\')">'
      + haltCardIcon(c, dungeon) + '<b>' + esc(_td(c.name)) + '</b>'
      + '<span class="dhalt-tag' + (c.kind === "echange" ? ' is-trade' : '') + '">' + esc(_td(DUNGEON_HALT_KIND_LABELS[c.kind] || "")) + '</span>'
      + haltCardLines(c, dungeon) + '</div>';
  });
  h += '</div>';
  var pick = haltPick && DungeonManager.getHaltCard(haltPick);
  h += '<div class="ksheet-foot dhalt-foot"><button type="button" class="kbtn primary"' + (pick ? '' : ' disabled') + ' onclick="confirmHaltCard()">'
    + (pick ? _t("Prendre « {x} »", { x: _td(pick.name) }) : _t("Choisis une carte")) + '</button>'
    + '<button type="button" class="kbtn dhalt-pass" onclick="passHalt()">' + _t("Passer", "halte") + '</button></div>';
  h += '</div>';
  return h;
}

function pickHaltCard(id) {
  haltPick = id;
  renderDungeonHaltSheet();
}

function closeHaltAndFight(cardId) {
  var host = document.getElementById("dungeon-modal-root");
  if (host) host.innerHTML = "";
  if (!DungeonManager.haltAction(cardId)) { renderDungeonHaltSheet(); return; }
  haltPick = null;
  if (typeof switchTab === "function") switchTab("combat");
}

function confirmHaltCard() { if (haltPick) closeHaltAndFight(haltPick); }
function passHalt() { closeHaltAndFight(null); }

/* ---------- Rapport de fin ---------- */
function buildDungeonSummaryHTML(result) {
  var h = '<div class="full-menu-overlay kwin-veil">';
  h += '  <div class="kwin dungeon-story-card' + (result.success ? ' is-success' : ' is-failure') + '">';
  h += kWinHeadHTML({ icon: '<img src="images/Icons/' + (result.success ? 'scene/final_reward.png' : 'subtabs/dungeon.png') + '" alt="">',
    title: esc(result.success ? _t("{x} : sortie terminée !", { x: _td(result.tierName) }) : _t("{x} : sortie interrompue", { x: _td(result.tierName) })) }); // v3.400.0 (F-2)
  h += '    <div class="kwin-body">';
  h += '    <div class="kwin-quote dungeon-story-text">' + (result.success
    ? _t("Le boss s’effondre. La salle retrouve son calme — pour cette fois.")
    : result.outcome === "camp" ? _t("Tu remontes du campement. Ce que tu portais est à toi.")
    : _t("La tentative s’arrête à la vague {a} sur {b}. Tu récupères quand même quelque chose avant de te replier.", { a: result.clearedWave, b: result.wavesTotal })) + '</div>';

  h += '    <div class="dungeon-summary-rewards">';
  h += '      <div class="dungeon-summary-row"><span>' + _t("Vagues passées") + '</span><span>' + Math.min(result.clearedWave, result.wavesTotal) + ' / ' + result.wavesTotal + (result.success ? ' + ' + _t("Boss") : '') + '</span></div>';
  if (result.marks && result.marks.length) {
    var names = result.marks.map(function (id) { var m = DungeonManager.getMark(id); return m ? _td(m.name) : id; }).join(", ");
    h += '      <div class="dungeon-summary-row"><span>' + _t("Marques") + '</span><span>×' + Number(result.markMult || 1).toFixed(2).replace(/0$/, "") + ' · ' + esc(names) + '</span></div>';
  }
  // v3.472.0 : cartes prises aux haltes
  if (result.boons && result.boons.length) {
    var bn = result.boons.map(function (id) { var c = DungeonManager.getHaltCard(id); return c ? _td(c.name) : id; }).join(", ");
    h += '      <div class="dungeon-summary-row"><span>' + _t("Haltes") + '</span><span>' + esc(bn) + '</span></div>';
  }
  // v3.436.1 (bug Seb) : tout l'or reçu, dans l'ordre du run — vagues, campement, prime, total
  var wavesGold = Number(result.wavesGold || 0), campLoot = result.campLoot || {}, campGold = Number(campLoot.gold || 0);
  var eliteLoot = result.eliteLoot || {}, eliteGold = Number(eliteLoot.gold || 0); // v3.474.0 : mis en sûreté par les élites
  campGold += eliteGold; // compté avec le campement dans les totaux
  var goldIco = '<img class=ico-inline src=images/Icons/gold_icon.webp> ';
  if (wavesGold > 0) h += '      <div class="dungeon-summary-row"><span>' + goldIco + _t("Butin des vagues") + '</span><span>+' + formatNumber(wavesGold) + '</span></div>';
  if (campGold - eliteGold > 0) h += '      <div class="dungeon-summary-row"><span><img class=ico-inline src=images/Icons/camp/campfire.webp> ' + _t("En sûreté au campement") + '</span><span>+' + formatNumber(campGold - eliteGold) + '</span></div>';
  if (eliteGold > 0) h += '      <div class="dungeon-summary-row"><span>' + goldIco + _t("En sûreté après les élites") + '</span><span>+' + formatNumber(eliteGold) + '</span></div>';
  h += '      <div class="dungeon-summary-row"><span>' + goldIco + (wavesGold > 0 || campGold > 0 ? _t("Prime de fin") : _t("Or")) + '</span><span>+' + formatNumber(result.goldReward) + '</span></div>';
  if (wavesGold > 0 || campGold > 0) h += '      <div class="dungeon-summary-row"><span><b>' + _t("Total or") + '</b></span><span><b>+' + formatNumber(wavesGold + campGold + Number(result.goldReward || 0)) + '</b></span></div>';
  h += '      <div class="dungeon-summary-row"><span><img class=ico-inline src=images/Icons/subtabs/shard_shop.webp> ' + _t("Éclats") + '</span><span>+' + formatNumber(result.shardsGained) + '</span></div>';
  // v3.436.2 : matériau avec sa vraie icône, part du campement comprise
  var special = Number(result.specialGained || 0) + Number(campLoot.stone || 0);
  if (special > 0 && result.specialName) {
    h += '      <div class="dungeon-summary-row"><span>' + renderIconOrEmojiHTML(result.specialIcon, "ico-inline", _td(result.specialName)) + ' ' + esc(_td(result.specialName)) + '</span><span>+' + special + '</span></div>';
  }
  // v3.436.2 (Seb) : tout le butin d'objets — campement, vagues, récompense de fin
  // v3.470.0 : l'unique du boss a sa ligne, avec son pouvoir
  if (result.lootedUnique) {
    var uq = result.lootedUnique, uqPow = (typeof getItemPower === "function") ? getItemPower(uq) : null;
    var uqCol = (typeof RARITY_COLORS !== "undefined" && RARITY_COLORS[uq.rarity]) || "inherit";
    h += '      <div class="dungeon-summary-row dungeon-summary-loot"><span>✦ ' + _t("Objet unique") + '</span><span><b style="color:' + uqCol + '">' + esc(_td(uq.name)) + '</b>'
      + (uqPow ? ' · ' + esc(_td(uqPow.label)) : '') + '</span></div>';
  }
  var objets = [].concat(campLoot.items || [], eliteLoot.items || [], result.wavesItems || [], result.lootedItem ? [result.lootedItem] : [], result.lootedItem2 ? [result.lootedItem2] : []);
  if (objets.length) {
    h += '      <div class="dungeon-summary-row dungeon-summary-loot"><span><img class=ico-inline src=images/Icons/dungeon/dungeon_guaranteed_loot.webp> ' + _t("Butin") + '</span><span>' + objets.map(function (it) {
      var col = (typeof RARITY_COLORS !== "undefined" && RARITY_COLORS[it.rarity]) || "inherit";
      return '<span style="color:' + col + '">' + esc(_td(it.name)) + '</span>';
    }).join(', ') + '</span></div>';
  }
  h += '    </div>';
  // v3.245.0 : les éclats se dépensent chez l'Enchanteresse
  h += '    <div class="dungeon-story-meta"><img class=ico-inline src=images/Icons/subtabs/shard_shop.webp> ' + _t("Les Éclats se dépensent chez l’Enchanteresse, au Village.") + '</div>';
  h += '    </div>';
  h += '    <div class="kwin-foot"><button class="kbtn primary" type="button" onclick="closeDungeonSummary()">' + _t("Continuer") + '</button></div>';
  h += '  </div>';
  h += '</div>';
  return h;
}

function openDungeonSummary(result) {
  var host = document.getElementById("dungeon-modal-root");
  if (host) host.innerHTML = buildDungeonSummaryHTML(result);
}

function closeDungeonSummary() {
  var host = document.getElementById("dungeon-modal-root");
  if (host) host.innerHTML = "";
}

window.openDungeonSheet = openDungeonSheet;
window.closeDungeonSheet = closeDungeonSheet;
window.toggleDungeonMark = toggleDungeonMark;
window.confirmDungeonStart = confirmDungeonStart;
window.openDungeonSummary = openDungeonSummary;
window.closeDungeonSummary = closeDungeonSummary;
window.openDungeonCampSheet = openDungeonCampSheet;
window.pickCampAction = pickCampAction;
window.toggleCampCompanion = toggleCampCompanion;
window.confirmCampAction = confirmCampAction;
window.openDungeonHaltSheet = openDungeonHaltSheet;
window.pickHaltCard = pickHaltCard;
window.confirmHaltCard = confirmHaltCard;
window.passHalt = passHalt;

/* v3.358.0 (D7) : l'overlay d'achat de tickets est retiré avec l'essence. */
