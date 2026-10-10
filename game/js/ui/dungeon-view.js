"use strict";
/* ui/dungeon-view.js — écran Donjon (v3.245.0, refonte Donjons, doc v1.1 §5) : une carte par monde, feuille basse .ksheet de
   lancement avec les Marques, carte de run actif, sorties du jour, rapport de fin. La Boutique d'éclats vit chez l'Enchanteresse
   (ui/village-building-view.js). Détail complet : COMMENTAIRES_ORIGINAUX.md */

var pendingDungeonId = null;   // donjon ouvert dans la feuille de lancement
var pendingDungeonMarks = [];  // bascules de la feuille — copiées dans game.dungeonRun.marks au start() seulement

function buildDungeonActiveHTML() {
  var dungeon = DungeonManager.getById(game.dungeonRun.dungeonId);
  var wave = game.dungeonRun.wave || 1;
  var total = DUNGEON_CONFIG.waveCount;
  var isBossWave = wave > total;
  var progressPct = Math.min(100, Math.round((Math.min(wave, total) / total) * 100));
  var marks = DungeonManager.getRunMarks();

  var h = '<div class="panel-card dungeon-active-card">';
  h += '<div class="dungeon-active-tier">' + esc(_td(dungeon.name)) + '</div>';
  h += '<div class="dungeon-wave-label">' + (isBossWave ? '<img class=ico-inline src=images/Icons/dungeon/boss_crown.png> ' + _t("Boss du donjon") : _t("Vague {a} / {b}", { a: wave, b: total })) + '</div>';
  h += '<div class="dungeon-progress-bar"><div class="dungeon-progress-fill' + (isBossWave ? ' is-boss' : '') + '" style="width:' + progressPct + '%"></div></div>';
  if (marks.length) {
    h += '<div class="dungeon-active-marks">';
    marks.forEach(function (m) { h += renderIconOrEmojiHTML(m.icon, "dungeon-active-mark-icon", _td(m.name)); });
    h += '<span>×' + DungeonManager.getMarkRewardMult(marks.length).toFixed(2).replace(/0$/, "") + '</span></div>';
  }
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
     + (unlocked ? '' : '<span class="dungeon-tier-image-lock"><img class=ico-inline src=images/Icons/system/lock_closed.png></span>')
     + (unlocked && heroDowned ? '<span class="dungeon-tier-image-lock"><img class=ico-inline src=images/Icons/camp/hero_defeated.png></span>' : '') + '</div>';
  h += '<div class="dungeon-tier-info">';
  if (world) h += '<div class="dungeon-tier-world">' + esc(_td(world.name)) + '</div>';
  h += '<div class="dungeon-tier-name">' + esc(_td(dungeon.name)) + '</div>';
  h += '<div class="dungeon-tier-rarity" style="color:' + rarityColor + '"><img class=ico-inline src=images/Icons/dungeon/dungeon_guaranteed_loot.png> ' + esc(_t("{x} max", { x: rarityLabel })) + '</div>';

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
    h += '<div class="dungeon-tier-done"><img src="images/Icons/dungeon/boss_crown.png" alt=""> ' + _t("Boss vaincu") + '</div>';
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
  return '<div class="dungeon-tier-runs' + (left <= 0 ? ' is-empty' : '') + '">' + _t("Sorties aujourd'hui : {a} / {b}", { a: left, b: max }) + '</div>';
}
window.buildDungeonRunsLineHTML = buildDungeonRunsLineHTML;

/* v3.358.0 (D7) : plus de tickets. Le bandeau dit la règle et le renouvellement ; le compte
   de chaque donjon est sur sa carte. */
function buildDungeonTicketBadgeHTML() {
  var h = '<div class="dungeon-ticket-badge dungeon-runs-badge">';
  h += '<span class="dungeon-ticket-badge-icon"><img class=ico-inline src=images/Icons/dungeon/dungeon_ticket.png></span>';
  h += '<span class="dungeon-ticket-badge-label">' + esc(_t("{n} sorties par jour et par donjon · renouvellement dans {d}", { n: DungeonManager.getRunsPerDay(), d: DungeonManager.timeUntilTicketReset() })) + '</span>';
  h += '</div>';
  return h;
}

function buildDungeonLobbyHTML() {
  var h = buildDungeonTicketBadgeHTML();
  h += '<div class="dungeon-list">';
  (DUNGEONS || []).forEach(function (dungeon) { h += buildDungeonCardHTML(dungeon); });
  h += '</div>';
  return '<div class="nb-page-frame nb-page-frame-fill kframe-page" data-kf-title="' + esc("images/Icons/subtabs/dungeon.png|" + _t("Donjon")) + '">' + h + '</div>'; // v2.83.28
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

function buildDungeonSheetHTML(dungeonId) {
  var dungeon = DungeonManager.getById(dungeonId);
  var world = (window.WORLDS || []).find(function (w) { return w.id === dungeon.worldId; });
  var rarityLabel = (typeof RARITY_LABELS !== "undefined" && RARITY_LABELS[dungeon.maxRarity]) ? _td(RARITY_LABELS[dungeon.maxRarity]) : dungeon.maxRarity;
  var rarityColor = (typeof RARITY_COLORS !== "undefined" && RARITY_COLORS[dungeon.maxRarity]) || "#9ca3af";
  var n = pendingDungeonMarks.length;
  var maxMarks = DUNGEON_CONFIG.maxMarks || 3;
  var mult = DungeonManager.getMarkRewardMult(n);
  var storyFree = typeof DungeonManager.isStoryTicketFree === "function" && DungeonManager.isStoryTicketFree(dungeon.id);

  var h = '<div class="ksheet-backdrop" onclick="closeDungeonSheet()"></div>';
  h += '<div class="ksheet dungeon-sheet">';
  h += kSheetHeadHTML({
    icon: renderIconOrEmojiHTML(dungeon.icon || "images/Icons/subtabs/dungeon.png", "", _td(dungeon.name)),
    title: esc(_td(dungeon.name)),
    sub: (world ? esc(_td(world.name)) + ' · ' : '') + _t("{n} vagues + boss · {r} max", { n: DUNGEON_CONFIG.waveCount, r: '<span class="dsheet-rarity" style="color:' + rarityColor + '">' + esc(rarityLabel) + '</span>' }),
    close: "closeDungeonSheet()"
  });
  h += '<div class="ksheet-body">';
  if (dungeon.story) h += '<div class="dsheet-story">' + esc(_td(dungeon.story)) + '</div>';
  h += buildDungeonSceauLoreHTML(dungeon.id);

  h += '<div class="dsheet-marks-title"><span>' + _t("Marques") + '</span><span>' + n + ' / ' + maxMarks + '</span></div>';
  (DUNGEON_MARKS || []).forEach(function (m) {
    var on = pendingDungeonMarks.indexOf(m.id) !== -1;
    var ok = DungeonManager.isMarkUnlocked(m.id, dungeon.id);
    h += '<button type="button" class="dmark' + (on ? ' is-on' : '') + (ok ? '' : ' is-locked') + '" onclick="toggleDungeonMark(\'' + esc(m.id) + '\')">';
    h += renderIconOrEmojiHTML(m.icon, "dmark-img", _td(m.name));
    h += '<span class="dmark-body"><span class="dmark-name">' + esc(_td(m.name)) + '</span><br><span class="dmark-desc">' + (ok ? esc(_td(m.desc)) : _t("Termine ce donjon une fois")) + '</span></span>';
    h += '<span class="dmark-state"></span></button>';
  });

  /* Récompense projetée : la raison d'être des Marques, visible sans dérouler. */
  h += '<div class="dsheet-reward"><span>' + _t("Récompenses") + ' <strong>×' + mult.toFixed(2).replace(/0$/, "") + '</strong></span>';
  var specialDef = dungeon.specialResourceId ? WAREHOUSE_RESOURCES[dungeon.specialResourceId] : null;
  if (specialDef && dungeon.specialResourceAmount > 0) {
    h += '<span>' + renderIconOrEmojiHTML(specialDef.icon, "dsheet-reward-icon", _td(specialDef.name)) + ' ' + esc(_td(specialDef.name)) + ' <strong>+' + DungeonManager.getSpecialAmount(dungeon, n) + '</strong></span>';
  } else {
    h += '<span><img class=ico-inline src=images/Icons/subtabs/shard_shop.png> ' + _t("Éclats") + ' <strong>+' + (DUNGEON_CONFIG.waveCount + DUNGEON_CONFIG.shardsBossBonus) + '</strong></span>';
  }
  h += '</div>';

  /* v3.247.0 : pronostic du donjon, Marques comprises. v3.429.7 : le run ENTIER (usure des
     quinze vagues, entrée à PV pleins), puis le boss avec ce qui reste. */
  if (window.CombatForecast && typeof CombatForecast.forDungeon === "function") {
    try {
      var f = CombatForecast.forDungeon(dungeon.id, pendingDungeonMarks);
      if (f) h += buildCombatForecastLineHTML(f);
    } catch (e) { /* pronostic indisponible : la feuille reste utilisable */ }
  }
  if (typeof buildEnemyTraitsCardHTML === "function") h += buildEnemyTraitsCardHTML({ type: "dungeon", id: dungeon.id }); // v3.378.0
  // v3.429.6 : conseil de préparation, tant que le donjon n'a jamais été vaincu
  if (dungeon.prepHint && !(game.dungeonTierCleared || {})[dungeon.id]) h += '<div class="dsheet-ticket"><img class=ico-inline src=images/Icons/system/warning.png> ' + esc(_td(dungeon.prepHint)) + '</div>';

  if (storyFree) {
    h += '<div class="dsheet-ticket"><img class=ico-inline src=images/Icons/dungeon/dungeon_ticket.png> <strong>' + _t("Entrée offerte") + '</strong> ' + _t("— les braises te guident, aucune sortie du jour consommée") + '</div>';
  } else {
    h += '<div class="dsheet-ticket"><img class=ico-inline src=images/Icons/dungeon/dungeon_ticket.png> ' + _t("Sorties restantes aujourd'hui :") + ' <strong>' + DungeonManager.getRunsLeft(dungeon.id) + ' / ' + DungeonManager.getRunsPerDay() + '</strong></div>';
  }
  // v3.330.1 : vivres de sortie (donjon déjà fini une fois)
  var dDef = (window.DUNGEONS || []).filter(function (x) { return x.id === Number(dungeonId); })[0];
  if (window.ProvisionsManager && dDef) h += ProvisionsManager.buildLineHTML("dungeon", dDef);
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
  if (!storyFree && DungeonManager.getRunsLeft(dungeonId) <= 0) return showToast(_t("Plus de sortie aujourd'hui dans ce donjon — renouvellement dans {d}", { d: DungeonManager.timeUntilTicketReset() }), 1800); // v3.358.0 (D7)
  pendingDungeonId = Number(dungeonId);
  pendingDungeonMarks = [];
  renderDungeonSheet();
}

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
  var marks = pendingDungeonMarks.slice();
  closeDungeonSheet();
  if (id != null) DungeonManager.start(id, marks);
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
  var CM = window.CompanionManager, heal = campPick === "souffler", pct = Number(camp.healPct) || 0.4;
  var cand = DungeonManager.campCandidates(), now = CM ? CM.partyIds() : [];
  var canSwap = CM && cand.length > now.length;
  var shown = campPick === "changer" ? campParty : now;
  var loot = run.campLoot || {};

  var h = '<div class="ksheet-backdrop"></div>';
  h += '<div class="ksheet dungeon-camp-sheet">';
  h += kSheetHeadHTML({
    icon: '<img src="images/Icons/camp/campfire.png" alt="">',
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
  h += '<span><img class=ico-inline src=images/Icons/gold_icon.png> +' + formatNumber(loot.gold || 0) + ' ' + _t("or") + '</span>';
  h += '<span><img class=ico-inline src=images/Icons/subtabs/shard_shop.png> +' + formatNumber(loot.shards || 0) + ' ' + _t("Éclats") + '</span>';
  var sDef = loot.stoneId && WAREHOUSE_RESOURCES[loot.stoneId];
  if (sDef && loot.stone > 0) h += '<span>' + renderIconOrEmojiHTML(sDef.icon, "ico-inline", _td(sDef.name)) + ' +' + loot.stone + ' ' + esc(_td(sDef.name)) + '</span>';
  (loot.items || []).forEach(function (it) {
    var col = (typeof RARITY_COLORS !== "undefined" && RARITY_COLORS[it.rarity]) || "inherit";
    h += '<span><img class=ico-inline src=images/Icons/dungeon/dungeon_guaranteed_loot.png> <span style="color:' + col + '">' + esc(_td(it.name)) + '</span></span>';
  });
  h += '</div>';

  h += '<div class="dcamp-lbl">' + _t("Une seule action") + '</div>';
  h += buildCampOptionHTML("souffler", "images/Icons/combat_stats/stat_health.png", _t("Souffler"), _t("Le groupe reprend {n} % de ses PV.", { n: Math.round(pct * 100) }), heal ? _t("Puis la descente reprend.") : "", "", true);
  var sw = "";
  if (campPick === "changer") {
    sw = '<div class="dcamp-swap">' + cand.map(function (id) {
      var def = getCompanionDef(id), on = campParty.indexOf(id) !== -1;
      return '<button type="button" aria-pressed="' + on + '" onclick="event.stopPropagation();toggleCampCompanion(\'' + esc(id) + '\')">'
        + '<img src="' + esc(def && def.image || "") + '" alt="">' + esc(def ? _td(def.name) : id) + '</button>';
    }).join("") + '</div>';
  }
  h += buildCampOptionHTML("changer", "images/Icons/subtabs/hero_summary.png", _t("Changer de compagnon"),
    canSwap ? _t("Deux sur trois, selon ce qui attend en bas. Celui qui arrive est frais.") : _t("Aucun autre compagnon ne peut descendre."), campSwapText(now), sw, canSwap);
  h += buildCampOptionHTML("sortir", "images/Icons/camp/campfire.png", _t("Sortir"), _t("Tu remontes avec le butin de l’étape 1. Il est à toi."), campPick === "sortir" ? _t("La sortie s’arrête là.") : "", "", true);
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
  // v3.436.1 (bug Seb) : tout l'or reçu, dans l'ordre du run — vagues, campement, prime, total
  var wavesGold = Number(result.wavesGold || 0), campLoot = result.campLoot || {}, campGold = Number(campLoot.gold || 0);
  var goldIco = '<img class=ico-inline src=images/Icons/gold_icon.png> ';
  if (wavesGold > 0) h += '      <div class="dungeon-summary-row"><span>' + goldIco + _t("Butin des vagues") + '</span><span>+' + formatNumber(wavesGold) + '</span></div>';
  if (campGold > 0) h += '      <div class="dungeon-summary-row"><span><img class=ico-inline src=images/Icons/camp/campfire.png> ' + _t("En sûreté au campement") + '</span><span>+' + formatNumber(campGold) + '</span></div>';
  h += '      <div class="dungeon-summary-row"><span>' + goldIco + (wavesGold > 0 || campGold > 0 ? _t("Prime de fin") : _t("Or")) + '</span><span>+' + formatNumber(result.goldReward) + '</span></div>';
  if (wavesGold > 0 || campGold > 0) h += '      <div class="dungeon-summary-row"><span><b>' + _t("Total or") + '</b></span><span><b>+' + formatNumber(wavesGold + campGold + Number(result.goldReward || 0)) + '</b></span></div>';
  h += '      <div class="dungeon-summary-row"><span><img class=ico-inline src=images/Icons/subtabs/shard_shop.png> ' + _t("Éclats") + '</span><span>+' + formatNumber(result.shardsGained) + '</span></div>';
  // v3.436.2 : matériau avec sa vraie icône, part du campement comprise
  var special = Number(result.specialGained || 0) + Number(campLoot.stone || 0);
  if (special > 0 && result.specialName) {
    h += '      <div class="dungeon-summary-row"><span>' + renderIconOrEmojiHTML(result.specialIcon, "ico-inline", _td(result.specialName)) + ' ' + esc(_td(result.specialName)) + '</span><span>+' + special + '</span></div>';
  }
  // v3.436.2 (Seb) : tout le butin d'objets — campement, vagues, récompense de fin
  var objets = [].concat(campLoot.items || [], result.wavesItems || [], result.lootedItem ? [result.lootedItem] : []);
  if (objets.length) {
    h += '      <div class="dungeon-summary-row dungeon-summary-loot"><span><img class=ico-inline src=images/Icons/dungeon/dungeon_guaranteed_loot.png> ' + _t("Butin") + '</span><span>' + objets.map(function (it) {
      var col = (typeof RARITY_COLORS !== "undefined" && RARITY_COLORS[it.rarity]) || "inherit";
      return '<span style="color:' + col + '">' + esc(_td(it.name)) + '</span>';
    }).join(', ') + '</span></div>';
  }
  h += '    </div>';
  // v3.245.0 : les éclats se dépensent chez l'Enchanteresse
  h += '    <div class="dungeon-story-meta"><img class=ico-inline src=images/Icons/subtabs/shard_shop.png> ' + _t("Les Éclats se dépensent chez l’Enchanteresse, au Village.") + '</div>';
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

/* v3.358.0 (D7) : l'overlay d'achat de tickets est retiré avec l'essence. */
