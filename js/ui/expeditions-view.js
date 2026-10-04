"use strict";
/* ui/expeditions-view.js — v3.426.0 (chantier Expéditions) : tout ce qui part et revient, au
   même endroit. Ateliers E-0 et E-1 validés par Seb le 02/10/2026.

   L'onglet « Départ » du Campement devient « Expéditions » (le Campement est le lieu où l'on
   prépare sa sortie). Un TABLEAU DES DÉPARTS, rangé par état, toutes sortes mêlées :
     À récupérer · Prêts à partir · En route · Plus tard
   Sortes : Petites Aventures (places du jour → la Carte), Patrouilles (un compagnon par ligne),
   Caravane, Donjon. En pied : Carte et Potions.

   Deux feuilles (#exp-sheet-root, hors de #panel-container, comme les feuilles de Héros) :
     - Patrouille : durée, monde (vignettes), une carte par lieu avec ce qu'il rapporte ;
     - Caravane   : marché (vignettes), trajets, chargement (ui/caravan-view.js).

   Les patrouilles et la caravane partent vers N'IMPORTE QUELLE carte atteinte, sans changer
   de monde (PatrolManager.getDestinations, CaravanManager.getMarkets). */

var expSheet = null; // null | { type: "patrol" | "caravan", id }

(function () {
  var ICON = {
    pa: "images/Icons/scene/path_easy.png",
    patrol: "images/Icons/quests/mission_exploration.png",
    caravan: "images/Icons/village_buildings/caravan.png",
    dungeon: "images/Icons/subtabs/dungeon.png",
    map: "images/Icons/menu_icons/map_menu.png",
    potions: "images/Icons/subtabs/potions.png"
  };
  function img(src, cls) { return '<img class="' + (cls || "") + '" src="' + esc(src) + '" alt="">'; }
  function rerender() { if (typeof renderPanel === "function") renderPanel(); }
  function unlocked(t) { return typeof isTabUnlocked !== "function" || isTabUnlocked(t); }
  function timeLeft(endAt) { return formatTime(Math.max(0, Math.ceil((endAt - Date.now()) / 1000))); }
  function mapName(mapId) {
    var w = (window.WORLDS || []).filter(function (x) { return x.id === LIVING_MAPS[mapId].worldId; })[0];
    return w ? _td(w.name) : _td(LIVING_MAPS[mapId].name);
  }
  // v3.428.0 : une vignette par carte (Ruines : fond à venir)
  function mapThumb(mapId) { return ({ desert: "images/Maps/parcours/desert_route.jpg", ruins: "images/Maps/parcours/ruines_route.jpg" })[mapId] || "images/Maps/parcours/foret_quetes.jpg"; }
  function resDef(k) { return (window.WAREHOUSE_RESOURCES || {})[k] || {}; }

  /* =========================================================
     LES ENTRÉES : une par chose qui part et revient
     tone : collect (à récupérer) · ready (prêt à partir) · away (en route) · wait (plus tard)
     ========================================================= */
  function paEntries() {
    var SRM = window.SceneRunManager;
    if (!SRM || !unlocked("map") || typeof SRM.getPetiteAventureCap !== "function") return [];
    if (window.Pa2Run && Pa2Run.getRun()) {
      return [{ kind: "pa", icon: ICON.pa, title: _t("Petite Aventure"), status: _t("En cours"), tone: "away", action: { label: _t("Reprendre"), onclick: "switchTab('scene')", primary: true } }];
    }
    var cap = SRM.getPetiteAventureCap(), left = Math.max(0, cap - SRM.petiteAventureCountToday());
    if (left > 0) {
      return [{ kind: "pa", icon: ICON.pa, title: _t("Petites Aventures"), tone: "ready", pips: { n: left, max: cap },
        status: _tn(left, "{n} place sur {c} · choisis un lieu sur la carte", "{n} places sur {c} · choisis un lieu sur la carte", { c: cap }),
        action: { label: _t("Carte") + " ›", onclick: "switchTab('map')", primary: true } }];
    }
    var ms = SRM.petiteAventureNextInMs();
    return [{ kind: "pa", icon: ICON.pa, title: _t("Petites Aventures"), tone: "wait", pips: { n: 0, max: cap },
      status: _t("Plus de place · la prochaine revient"), endAt: ms ? Date.now() + ms : null }];
  }

  function patrolEntries() {
    var PM = window.PatrolManager;
    if (!PM || !PM.isUnlocked() || !window.CompanionManager) return [];
    var hasDest = PM.getDestinations().length > 0;
    return CompanionManager.unlockedIds().map(function (id) {
      var def = getCompanionDef(id), p = PM.get(id), fem = !!PATROL_COMPANION_FEMININE[id];
      var e = { kind: "patrol", id: id, icon: def.image, portrait: true, title: _td(def.name), open: "openExpeditionsSheet('patrol', '" + id + "')" };
      var sec = p ? PM.getSectorDef(p.mapId, p.sectorId) : null, sName = sec ? _td(sec.name) : (p ? p.sectorId : "");
      if (p && Date.now() >= p.endsAt) {
        e.status = fem ? _t("Rentrée de {x}", { x: sName }) : _t("Rentré de {x}", { x: sName });
        e.tone = "collect"; e.action = { label: _t("Prendre le butin"), onclick: "patrolCollect('" + id + "')", primary: true };
      } else if (p) {
        e.status = _t("En patrouille · {x}", { x: sName }); e.tone = "away"; e.endAt = p.endsAt;
      } else if (!hasDest) {
        e.status = _t("Libère un secteur de la carte pour l’envoyer en patrouille."); e.tone = "wait"; e.open = null;
      } else {
        e.status = (CompanionManager.state(id).present ? _t("Avec toi au combat") : _t("Au camp")) + " · " + _t("peut partir en patrouille");
        e.tone = "ready"; e.action = { label: _t("Envoyer") + "…", onclick: e.open };
      }
      return e;
    });
  }

  function caravanEntries() {
    var CM = window.CaravanManager;
    if (!CM || !CM.isAvailable()) return [];
    var e = { kind: "caravan", icon: ICON.caravan, title: _t("Caravane"), open: "openExpeditionsSheet('caravan')" };
    if (CM.isBack()) { e.status = _t("Rentrée · {n} or à décharger", { n: formatNumber(CM.get().gold) }); e.tone = "collect"; e.action = { label: _t("Décharger"), onclick: "unloadCaravanFromSheet()", primary: true }; }
    else if (CM.isTraveling()) { e.status = _t("En route vers le marché"); e.tone = "away"; e.endAt = CM.get().endsAt; }
    else { e.status = _t("Prête · vend le surplus de l'Entrepôt"); e.tone = "ready"; e.action = { label: _t("Partir") + "…", onclick: e.open }; }
    return [e];
  }

  function dungeonEntries() {
    if (!unlocked("dungeon") || !window.DungeonManager) return [];
    if (typeof DungeonManager.checkTicketReset === "function") DungeonManager.checkTicketReset();
    var tickets = (window.DUNGEONS || []).filter(function (dg) { return DungeonManager.isUnlocked(dg.id); })
      .reduce(function (t, dg) { return t + DungeonManager.getRunsLeft(dg.id); }, 0);
    var e = { kind: "dungeon", icon: ICON.dungeon, title: _t("Donjon"), open: "switchTab('dungeon')" };
    if (game.dungeonRun && game.dungeonRun.active) { e.status = _t("Tentative en cours"); e.tone = "away"; e.action = { label: _t("Reprendre"), onclick: "switchTab('dungeon')", primary: true }; }
    else if (tickets > 0) { e.status = _tn(tickets, "{n} sortie aujourd'hui", "{n} sorties aujourd'hui"); e.tone = "ready"; e.action = { label: _t("Entrer") + " ›", onclick: "switchTab('dungeon')" }; }
    else { e.status = _t("Plus de sortie aujourd'hui"); e.tone = "wait"; }
    return [e];
  }

  function getExpeditionEntries() { return paEntries().concat(patrolEntries(), caravanEntries(), dungeonEntries()); }
  function countExpeditionsToCollect() { return getExpeditionEntries().filter(function (e) { return e.tone === "collect"; }).length; }

  /* ---------- Tableau des départs ---------- */
  function kindLabel(k) { return { pa: _t("Petite Aventure"), patrol: _t("Patrouille"), caravan: _t("Caravane"), dungeon: _t("Donjon") }[k]; }

  function rowHTML(e) {
    var h = '<div class="exp-row is-' + e.tone + '"' + (e.open ? ' onclick="' + e.open + '"' : '') + '>';
    h += '<span class="exp-row-ico' + (e.portrait ? ' is-portrait' : '') + '">' + img(e.icon) + (e.portrait ? img(ICON.patrol, "exp-row-sub") : '') + '</span>';
    h += '<span class="exp-row-txt"><b>' + esc(e.title) + (e.kind === "patrol" ? ' <small class="exp-kind">· ' + esc(kindLabel(e.kind)) + '</small>' : '') + '</b>';
    h += '<small>' + esc(e.status) + (e.endAt ? ' · <span class="exp-left" data-exp-end="' + e.endAt + '">' + timeLeft(e.endAt) + '</span>' : '') + '</small>';
    if (e.pips) { h += '<span class="exp-pips">'; for (var i = 0; i < e.pips.max; i++) h += '<i' + (i < e.pips.n ? ' class="is-on"' : '') + '></i>'; h += '</span>'; }
    h += '</span>';
    if (e.action) h += '<button type="button" class="exp-act' + (e.action.primary ? ' is-primary' : '') + '" onclick="event.stopPropagation();' + e.action.onclick + '">' + esc(e.action.label) + '</button>';
    else if (e.open) h += '<i class="exp-chev">›</i>';
    return h + '</div>';
  }

  function footerHTML() {
    var h = '<div class="exp-foot">';
    if (unlocked("map")) {
      var world = (window.WorldManager && typeof WorldManager.getWorld === "function") ? WorldManager.getWorld() : null;
      h += '<button type="button" class="exp-door" onclick="switchTab(\'map\')">' + img(ICON.map) + '<span><b>' + _t("Carte") + '</b><small>' + esc(world && world.name ? _td(world.name) : _t("Monde")) + '</small></span><i class="exp-chev">›</i></button>';
    }
    if (unlocked("shop")) {
      var potions = 0;
      if (window.PotionManager && typeof PotionManager.getHealingStock === "function") (window.HEALING_POTIONS_DB || []).forEach(function (po) { potions += Number(PotionManager.getHealingStock(po.id) || 0); });
      h += '<button type="button" class="exp-door" onclick="goToPotions()">' + img(ICON.potions) + '<span><b>' + _t("Potions") + '</b><small>' + (potions > 0 ? _t("{n} en réserve", { n: potions }) : _t("aucune en réserve")) + '</small></span><i class="exp-chev">›</i></button>';
    }
    return h + '</div>';
  }

  /* Contenu de l'onglet ; "" quand rien n'est encore débloqué (l'onglet disparaît alors). */
  function buildExpeditionsBoardHTML() {
    var list = getExpeditionEntries();
    if (!list.length && !unlocked("map") && !unlocked("shop")) return "";
    var c = { collect: 0, ready: 0, away: 0 };
    list.forEach(function (e) { if (c[e.tone] != null) c[e.tone]++; });
    var h = '<div class="exp-sum">'
      + '<span class="is-collect"><b>' + c.collect + '</b>' + esc(_t("à récupérer")) + '</span>'
      + '<span class="is-ready"><b>' + c.ready + '</b>' + esc(_t("prêts à partir")) + '</span>'
      + '<span class="is-away"><b>' + c.away + '</b>' + esc(_t("en route")) + '</span></div>';
    [["collect", _t("À récupérer")], ["ready", _t("Prêts à partir")], ["away", _t("En route")], ["wait", _t("Plus tard")]].forEach(function (g) {
      var part = list.filter(function (e) { return e.tone === g[0]; });
      if (!part.length) return;
      h += '<div class="ksec exp-sec is-' + g[0] + '"><span>' + esc(g[1]) + '</span></div><div class="exp-list">' + part.map(rowHTML).join("") + '</div>';
    });
    return h + footerHTML();
  }

  /* =========================================================
     FEUILLE « PATROUILLE » : durée, monde, une carte par lieu
     ========================================================= */
  function patrolPick(id, key, val) {
    var ui = patrolUi[id] || (patrolUi[id] = {});
    ui[key] = key === "hours" ? Number(val) : val;
    if (key === "mapId") ui.sectorId = null;
    renderExpeditionsSheet();
  }
  function ringDots(r) { var h = '<span class="exp-ring" title="' + esc(_t("Anneau {n}", { n: r })) + '">'; for (var i = 1; i <= 3; i++) h += '<i' + (i <= r ? ' class="is-on"' : '') + '></i>'; return h + '</span>'; }

  function buildPatrolSheetHTML(id) {
    var PM = PatrolManager;
    if (PM.get(id)) return buildPatrolProgressHTML(id); // en route ou rentré
    var dests = PM.getDestinations();
    var h = buildPatrolLastResultHTML(id);
    if (!dests.length) return h + '<div class="exp-empty">' + _t("Libère un secteur de la carte pour l’envoyer en patrouille.") + '</div>';
    var maps = PM.reachedMapIds();
    var ui = patrolUi[id] || (patrolUi[id] = {});
    if (PATROL_DURATIONS_H.indexOf(ui.hours) === -1) ui.hours = 8;
    if (maps.indexOf(ui.mapId) === -1) ui.mapId = maps.indexOf(PM.currentMapId()) >= 0 ? PM.currentMapId() : maps[0];
    var here = dests.filter(function (d) { return d.mapId === ui.mapId; });
    if (!here.some(function (d) { return d.sectorId === ui.sectorId; })) ui.sectorId = here.length === 1 ? here[0].sectorId : null; // un seul lieu : déjà choisi

    h += '<div class="exp-pick-row"><span class="exp-pick-lbl">' + _t("Durée") + '</span><div class="kseg exp-seg">';
    PATROL_DURATIONS_H.forEach(function (hrs) { h += '<button type="button" class="' + (ui.hours === hrs ? 'is-on' : '') + '" onclick="patrolPick(\'' + id + '\', \'hours\', ' + hrs + ')">' + hrs + ' h</button>'; });
    h += '</div></div>';
    // v3.426.1 (retour Seb) : la vignette du monde reste visible même quand une seule carte est atteinte.
    if (maps.length) {
      h += '<div class="exp-worlds' + (maps.length === 1 ? ' is-single' : '') + '">';
      maps.forEach(function (m) {
        var n = dests.filter(function (d) { return d.mapId === m; }).length;
        h += '<button type="button" class="exp-world' + (ui.mapId === m ? ' is-on' : '') + '" onclick="patrolPick(\'' + id + '\', \'mapId\', \'' + m + '\')" style="background-image:url(\'' + mapThumb(m) + '\')">'
          + '<span class="exp-world-txt"><b>' + esc(mapName(m)) + '</b><small>' + esc(_tn(n, "{n} lieu libéré", "{n} lieux libérés")) + '</small></span></button>';
      });
      h += '</div>';
    }
    // Une carte par lieu : ce que rapporte la patrouille, à la durée choisie.
    var best = 0;
    here.forEach(function (d) {
      d.est = PM.estimate(id, d.mapId, d.sectorId, ui.hours);
      d.total = Object.keys(d.est.loot).reduce(function (t, k) { return t + d.est.loot[k]; }, 0);
      best = Math.max(best, d.total);
    });
    h += '<div class="exp-dests">';
    here.forEach(function (d) {
      h += '<button type="button" class="exp-dest' + (ui.sectorId === d.sectorId ? ' is-on' : '') + '" onclick="patrolPick(\'' + id + '\', \'sectorId\', \'' + d.sectorId + '\')">'
        + '<span class="exp-dest-head"><b>' + esc(_td(d.name)) + '</b>' + ringDots(d.ring) + (d.total === best ? '<i class="exp-best">' + _t("le plus") + '</i>' : '') + '</span><span class="exp-dest-loot">';
      Object.keys(d.est.loot).forEach(function (k) {
        if (d.est.loot[k] > 0) h += '<span class="exp-res">' + img(resDef(k).icon || "images/Icons/system/warehouse_supplies.png") + '<b>' + formatNumber(d.est.loot[k]) + '</b><small>' + esc(resDef(k).name ? _td(resDef(k).name) : k) + '</small></span>';
      });
      if (d.est.gold) h += '<span class="exp-res">' + img("images/Icons/gold_icon.png") + '<b>' + formatNumber(d.est.gold) + '</b><small>' + _t("or") + '</small></span>';
      h += '</span></button>';
    });
    h += '</div>';
    var why = PM.canStart(id), def = getCompanionDef(id), sel = here.filter(function (d) { return d.sectorId === ui.sectorId; })[0];
    h += '<div class="exp-go">';
    if (why) h += '<div class="exp-why">' + esc(why) + '</div>';
    h += '<button type="button" class="exp-act is-primary exp-go-btn"' + (why || !sel ? ' disabled' : '') + ' onclick="patrolStart(\'' + id + '\')">'
      + esc(sel ? _t("Envoyer {x} · {h} h · {y}", { x: _td(def.name), h: ui.hours, y: _td(sel.name) }) : _t("Choisis un lieu")) + '</button>';
    h += '<small class="exp-hint">' + _t("Absent des combats pendant la patrouille. Aucun risque : il revient toujours.") + '</small></div>';
    return h;
  }

  /* =========================================================
     FEUILLES : rendu dans #exp-sheet-root, alimenté par renderPanel
     ========================================================= */
  function buildExpeditionsSheetHTML() {
    if (!expSheet) return "";
    var title, icon, body;
    if (expSheet.type === "patrol") {
      var def = window.getCompanionDef ? getCompanionDef(expSheet.id) : null;
      if (!def) return "";
      title = _t("Patrouille · {x}", { x: _td(def.name) }); icon = def.image; body = buildPatrolSheetHTML(expSheet.id);
    } else if (expSheet.type === "caravan") {
      title = _t("Caravane"); icon = ICON.caravan; body = (typeof buildCaravanHTML === "function") ? buildCaravanHTML() : "";
    } else return "";
    return '<div class="ksheet-backdrop" onclick="closeExpeditionsSheet()"></div><div class="ksheet exp-sheet">'
      + kSheetHeadHTML({ icon: '<img src="' + esc(icon) + '" alt="">', title: title, close: "closeExpeditionsSheet()" })
      + '<div class="ksheet-body">' + body + '</div></div>';
  }

  function renderExpeditionsSheet() {
    var root = document.getElementById("exp-sheet-root");
    if (!root) return;
    if (!expSheet || game.activeTab !== "campement") { root.innerHTML = ""; return; }
    var body = root.querySelector(".ksheet-body"), keep = body ? body.scrollTop : 0;
    root.innerHTML = buildExpeditionsSheetHTML();
    body = root.querySelector(".ksheet-body");
    if (body && keep) body.scrollTop = keep;
  }
  function openExpeditionsSheet(type, id) { expSheet = { type: type, id: id || null }; renderExpeditionsSheet(); }
  function closeExpeditionsSheet() { expSheet = null; renderExpeditionsSheet(); }

  /* D'ailleurs (fiche du compagnon, fil rouge, carte vivante, Halle) vers l'onglet, feuille ouverte. */
  function goToExpeditions(sheetType, id) {
    campTab = "depart";
    expSheet = sheetType ? { type: sheetType, id: id || null } : null;
    if (typeof switchTab === "function") switchTab("campement");
    renderExpeditionsSheet();
  }

  /* Halle marchande : la Caravane est ici maintenant ; la fiche de la Halle garde un renvoi. */
  function buildHallCaravanLinkHTML() {
    var CM = window.CaravanManager;
    if (!CM || !CM.isAvailable()) return "";
    var sub = CM.isBack() ? _t("Rentrée · à décharger") : CM.isTraveling() ? _t("En route · retour dans {d}", { d: formatTime(CM.getSecondsLeft()) }) : _t("Prête à partir");
    return '<button type="button" class="exp-moved vb-hall-caravan' + (CM.isBack() ? ' is-collect' : '') + '" onclick="goToCaravan()">' + img(ICON.caravan)
      + '<span><b>' + _t("Caravane") + '</b><small>' + esc(sub) + ' · ' + _t("Campement › Expéditions") + '</small></span><i class="exp-chev">›</i></button>';
  }

  /* Chaque seconde (ProductionManager.updateDOM) : comptes à rebours du tableau ; une échéance
     passée redessine l'écran (la ligne change de rubrique). */
  function refreshExpeditionsDOM() {
    if (typeof document === "undefined" || !document.querySelectorAll || game.activeTab !== "campement") return;
    var due = false;
    Array.prototype.forEach.call(document.querySelectorAll("#panel-container [data-exp-end]"), function (el) {
      var end = Number(el.getAttribute("data-exp-end"));
      if (end <= Date.now()) due = true; else el.textContent = timeLeft(end);
    });
    if (due) rerender();
  }

  window.getExpeditionEntries = getExpeditionEntries;
  window.countExpeditionsToCollect = countExpeditionsToCollect;
  window.buildExpeditionsBoardHTML = buildExpeditionsBoardHTML;
  window.buildPatrolSheetHTML = buildPatrolSheetHTML;
  window.buildExpeditionsSheetHTML = buildExpeditionsSheetHTML;
  window.renderExpeditionsSheet = renderExpeditionsSheet;
  window.openExpeditionsSheet = openExpeditionsSheet;
  window.closeExpeditionsSheet = closeExpeditionsSheet;
  window.goToExpeditions = goToExpeditions;
  window.buildHallCaravanLinkHTML = buildHallCaravanLinkHTML;
  window.refreshExpeditionsDOM = refreshExpeditionsDOM;
  window.patrolPick = patrolPick;
})();
