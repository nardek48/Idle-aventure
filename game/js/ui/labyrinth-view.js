"use strict";
/* ui/labyrinth-view.js — v3.434.0 (Ruines, RU12) : l'écran du Labyrinthe aux leviers.
   Atelier validé : atelier/labyrinthe-final.html. La vue à la torche suit le héros, la carte d'Edda
   se dessine dans le coin ; le moteur (systems/labyrinth-run.js) applique et sauvegarde chaque geste. */

var LAB_CELL = 100, LAB_ROOM = 74, LAB_WALK_MS = 170, LAB_VIEW_W = 340; // v3.435.1 : caméra un peu plus près (vue plein écran)
var labView = { sheet: null, walk: null, flash: 0, drawn: null };

/* ---------- Routage (buildSceneScreenHTML) ---------- */
function buildLabyrinthScreenHTML(run) {
  setTimeout(labAfterRender, 0);
  if (run.status === LAB_STATUS.done) return labEndHTML(run);
  var h = '<div class="lab-page" id="lab-root">';
  h += '<div class="lab-hud"><div class="lab-top"><span id="lab-floor"></span><span id="lab-best"></span></div>';
  h += '<span class="lab-floorname" id="lab-fname"></span>';
  h += '<div class="lab-gauges"><div class="lab-gauge is-hp"><i id="lab-hpbar"></i><span id="lab-hp"></span></div>';
  h += '<div class="lab-gauge is-br"><i id="lab-brbar"></i><span id="lab-br"></span></div></div>';
  h += '<div class="lab-loot"><span id="lab-bag"></span><span id="lab-foe" class="is-hunt"></span></div></div>';
  h += '<div class="lab-view"><svg id="lab-map" viewBox="0 0 400 440" preserveAspectRatio="xMidYMid slice" onclick="labTapMap(event)"><g id="lab-world"></g></svg>';
  h += '<div class="lab-vignette"></div>';
  h += '<button type="button" class="lab-chart" id="lab-chart" onclick="labOpenChart()" aria-label="' + esc(_t("Ouvrir la carte d'Edda")) + '"></button></div>';
  h += '<div class="lab-note" id="lab-note"></div>';
  h += '<div class="lab-actions"><button type="button" class="kbtn is-sec" onclick="labOpenChart()">' + esc(_t("Carte")) + '</button>';
  h += '<button type="button" class="kbtn is-sec" onclick="labAskLeave()">' + esc(_t("Remonter")) + '</button></div>';
  h += '</div><div id="lab-sheet"></div>';
  return h;
}
window.buildLabyrinthScreenHTML = buildLabyrinthScreenHTML;

function labAfterRender() {
  var run = window.LabyrinthRun ? LabyrinthRun.getRun() : null;
  if (document.body && document.body.classList) document.body.classList.toggle("lab-run", !!run && game.activeTab === "scene");
  if (!run || run.status === LAB_STATUS.done || !document.getElementById("lab-root")) return;
  labDraw(true);
  if (labView.sheet) labShowSheet();
}

/* ---------- Dessin ---------- */
function labX(F, k) { return 50 + LabyrinthRun.cr(k)[0] * LAB_CELL; }
function labY(F, k) { return 50 + (F.h - 1 - LabyrinthRun.cr(k)[1]) * LAB_CELL; }
function labTile(run, k) {
  var F = run.F, T = LABYRINTH_TILES, L = LabyrinthRun;
  if (k === F.stairs) return !run.bossDown ? T.bossRoom : T.stairsDown[L.cr(k)[0] % 2];
  if (k === F.start) return T.stairsUp;
  if (L.leverAt(run, k) >= 0) return T.lever;
  if (k === F.spring && !run.springUsed) return T.spring;
  if (k === F.chest && !run.chestTaken) return T.chest;
  var h = 0, s = k + "#" + run.floor; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 97;
  return T.rooms[h % T.rooms.length];
}
function labDraw(jump, flashMask) {
  var run = LabyrinthRun.getRun(), L = LabyrinthRun; if (!run || !run.F) return;
  var F = run.F, svg = [], doors = {}, w = document.getElementById("lab-world"); if (!w) return;
  L.rooms(F).forEach(function (k) { L.nbrs(F, k).forEach(function (m) { doors[L.door(k, m)] = 1; }); });
  function st(k) { return k === run.at ? "" : (L.isLit(run, k) ? "is-lit" : "is-mem"); }
  function shown(k) { return run.seen[k] || L.isLit(run, k); }
  Object.keys(doors).forEach(function (d) {                    // couloirs ouverts
    var p = d.split("|"), a = p[0], b = p[1]; if (!L.openNow(run, d) || !shown(a) || !shown(b) || !(run.seen[a] || run.seen[b])) return;
    var pv = L.pivotOf(F, d), hz = labY(F, a) === labY(F, b), mx = (labX(F, a) + labX(F, b)) / 2, my = (labY(F, a) + labY(F, b)) / 2;
    svg.push('<image class="lab-tile ' + (st(a) === "is-mem" && st(b) === "is-mem" ? "is-mem" : "is-lit") + '" href="' + LABYRINTH_TILES.corridor + '" x="' + (mx - LAB_CELL / 2) + '" y="' + (my - LAB_CELL / 4) + '" width="' + LAB_CELL + '" height="' + (LAB_CELL / 2) + '" preserveAspectRatio="none"' + (hz ? "" : ' transform="rotate(90 ' + mx + " " + my + ')"') + '/>');
    if (pv >= 0) svg.push('<rect class="lab-pivopen' + (flashMask && ((flashMask >> pv) & 1) ? " is-flash" : "") + '" x="' + (hz ? mx - 14 : mx - 18) + '" y="' + (hz ? my - 18 : my - 14) + '" width="' + (hz ? 28 : 36) + '" height="' + (hz ? 36 : 28) + '" rx="6"/>');
  });
  L.rooms(F).forEach(function (k) {                             // salles
    if (!shown(k)) return;
    var x = labX(F, k) - LAB_ROOM / 2, y = labY(F, k) - LAB_ROOM / 2, li = L.leverAt(run, k);
    svg.push('<image class="lab-tile ' + st(k) + '" href="' + labTile(run, k) + '" x="' + x + '" y="' + y + '" width="' + LAB_ROOM + '" height="' + LAB_ROOM + '" preserveAspectRatio="none"/>');
    if (li >= 0 && li === F.guarded && run.guardUp) svg.push('<text class="lab-badge" x="' + (x + LAB_ROOM - 10) + '" y="' + (y + 10) + '">⚔️</text>');
    svg.push('<rect class="lab-hit' + (L.canMove(run, k) ? " is-can" : "") + '" data-k="' + k + '" x="' + x + '" y="' + y + '" width="' + LAB_ROOM + '" height="' + LAB_ROOM + '" rx="6"/>');
  });
  Object.keys(doors).forEach(function (d) {                    // pans fermés : la dalle violette
    var p = d.split("|"), a = p[0], b = p[1], pv = L.pivotOf(F, d);
    if (pv < 0 || L.openNow(run, d) || !(run.seen[a] || run.seen[b])) return;
    var hz = labY(F, a) === labY(F, b), mx = (labX(F, a) + labX(F, b)) / 2, my = (labY(F, a) + labY(F, b)) / 2;
    svg.push('<image class="' + (flashMask && ((flashMask >> pv) & 1) ? "is-flash" : "") + '" href="' + LABYRINTH_TILES.pan + '" x="' + (mx - 37) + '" y="' + (my - 12) + '" width="74" height="24" preserveAspectRatio="none"' + (hz ? ' transform="rotate(90 ' + mx + " " + my + ')"' : "") + '/>');
  });
  if (run.foe && L.isLit(run, run.foe.at)) svg.push('<text class="lab-foe" x="' + labX(F, run.foe.at) + '" y="' + labY(F, run.foe.at) + '">' + (run.foe.stun > 0 ? "😵" : "🗿") + '</text>');
  svg.push('<circle class="lab-hero" cx="' + labX(F, run.at) + '" cy="' + labY(F, run.at) + '" r="11"/>');
  if (jump || labView.drawn !== run.floor) w.style.transition = "none";
  w.innerHTML = svg.join("");
  /* La vue suit la hauteur de l'écran : LAB_VIEW_W de large, la hauteur au prorata ; le héros au centre */
  var sv = document.getElementById("lab-map"), vw = LAB_VIEW_W, vh = 440;
  if (sv && sv.clientWidth > 0 && sv.clientHeight > 0) vh = Math.max(260, Math.round(vw * sv.clientHeight / sv.clientWidth));
  if (sv) sv.setAttribute("viewBox", "0 0 " + vw + " " + vh);
  w.style.transform = "translate(" + Math.round(vw / 2 - labX(F, run.at)) + "px," + (Math.round(vh / 2) - labY(F, run.at)) + "px)";
  if (jump || labView.drawn !== run.floor) { w.getBoundingClientRect(); w.style.transition = ""; }
  labView.drawn = run.floor;
  var ch = document.getElementById("lab-chart"); if (ch) ch.innerHTML = labChartSVG(false) + '<span class="lab-chart-cap">' + esc(_t("Carte d'Edda")) + '</span>';
  labHud(run);
}
function labHud(run) {
  var c = LABYRINTH_CONFIG, T = LABYRINTH_TEXTS, set = function (id, v) { var e = document.getElementById(id); if (e) e.textContent = v; };
  var hp = Math.max(0, Math.min(1, Number(game.heroHp || 0) / Math.max(1, game.heroMaxHp)));
  set("lab-floor", _t("Étage {n}", { n: run.floor }) + (run.F.boss ? " · " + _t("Gardien") : ""));
  set("lab-best", _t("Record : étage {n}", { n: LabyrinthRun.bestFloor() }));
  set("lab-fname", _td(T.floorNames[(run.floor - 1) % T.floorNames.length]));
  set("lab-hp", _t("PV {a} / {b}", { a: Math.round(game.heroHp || 0), b: Math.round(game.heroMaxHp || 0) }));
  set("lab-br", _t("Souffle {n}", { n: run.breath }));
  set("lab-bag", _t("Sac : {s} Pierres errantes · {g} or", { s: run.stones, g: run.gold }));
  var fd = LabyrinthRun.foeDist(run);
  set("lab-foe", !run.foe ? "" : (run.foe.stun > 0 ? _t("Contremaître : sonné") : (fd != null && fd >= 0 && fd <= 4 ? _t("Des pas, tout près") : _t("Contremaître : quelque part"))));
  var hb = document.getElementById("lab-hpbar"), bb = document.getElementById("lab-brbar");
  if (hb) hb.style.width = Math.round(hp * 100) + "%"; if (bb) bb.style.width = Math.round(run.breath / c.breathStart * 100) + "%";
  var n = document.getElementById("lab-note");
  if (n && run.note) { n.textContent = run.note.data ? _td(run.note.text) : run.note.text; n.classList.toggle("is-alert", !!run.note.alert); }
}

/* ---------- La carte d'Edda : papier et craie, cadrée sur ce qui est dessiné ---------- */
function labChartSVG(big) {
  var run = LabyrinthRun.getRun(), L = LabyrinthRun, F = run.F, S = 40, pad = 10, o = [], c0 = 99, c1 = -1, r0 = 99, r1 = -1;
  function grow(k) { var p = L.cr(k); c0 = Math.min(c0, p[0]); c1 = Math.max(c1, p[0]); r0 = Math.min(r0, p[1]); r1 = Math.max(r1, p[1]); }
  L.rooms(F).forEach(function (k) { if (run.seen[k] || L.isLit(run, k)) grow(k); });
  F.pivots.forEach(function (pv, i) { if (run.knownPiv[i]) pv.a.split("|").concat(pv.b.split("|")).forEach(grow); });
  c0 = Math.max(0, c0 - 1); c1 = Math.min(F.w - 1, c1 + 1); r0 = Math.max(0, r0 - 1); r1 = Math.min(F.h - 1, r1 + 1);
  while (c1 - c0 < 2) { if (c0 > 0) c0--; else if (c1 < F.w - 1) c1++; else break; }
  while (r1 - r0 < 2) { if (r0 > 0) r0--; else if (r1 < F.h - 1) r1++; else break; }
  var w = (c1 - c0 + 1) * S + pad * 2, h = (r1 - r0 + 1) * S + pad * 2;
  function x(k) { return pad + (L.cr(k)[0] - c0) * S + S / 2; } function y(k) { return pad + (r1 - L.cr(k)[1]) * S + S / 2; }
  var doors = {}; L.rooms(F).forEach(function (k) { L.nbrs(F, k).forEach(function (m) { doors[L.door(k, m)] = 1; }); });
  Object.keys(doors).forEach(function (d) {
    var p = d.split("|"), a = p[0], b = p[1], pv = L.pivotOf(F, d), op = L.openNow(run, d), hz = y(a) === y(b), mx = (x(a) + x(b)) / 2, my = (y(a) + y(b)) / 2;
    if (pv >= 0 && run.knownPiv[pv]) {
      var nw = run.newPiv[pv] ? " is-new" : "";
      if (op) o.push('<line class="lab-c-piv' + nw + '" x1="' + x(a) + '" y1="' + y(a) + '" x2="' + x(b) + '" y2="' + y(b) + '" style="stroke-width:3"/>');
      else o.push('<line class="lab-c-piv' + nw + '" x1="' + (hz ? mx : mx - 13) + '" y1="' + (hz ? my - 13 : my) + '" x2="' + (hz ? mx : mx + 13) + '" y2="' + (hz ? my + 13 : my) + '"/>');
      return;
    }
    if (!(run.seen[a] && run.seen[b]) && !(run.seen[a] && L.isLit(run, b)) && !(run.seen[b] && L.isLit(run, a))) return;
    if (op) o.push('<line class="lab-c-door" x1="' + x(a) + '" y1="' + y(a) + '" x2="' + x(b) + '" y2="' + y(b) + '"/>');
  });
  L.rooms(F).forEach(function (k) {
    if (!run.seen[k] && !L.isLit(run, k)) return;
    var go = big && run.seen[k] && k !== run.at;
    o.push('<rect class="lab-c-room' + (k === run.at ? " is-here" : "") + (!run.seen[k] ? " is-guess" : "") + '"' + (go ? ' data-go="' + k + '"' : "") + ' x="' + (x(k) - 13) + '" y="' + (y(k) - 13) + '" width="26" height="26" rx="3"/>');
    var li = L.leverAt(run, k), gl = k === F.stairs ? "⬇" : li >= 0 ? "⚙" : (k === F.spring && !run.springUsed ? "💧" : (k === F.chest && !run.chestTaken ? "▣" : ""));
    if (gl && run.seen[k]) o.push('<text class="lab-c-glyph" x="' + x(k) + '" y="' + y(k) + '">' + gl + '</text>');
  });
  L.rooms(F).forEach(function (k) {                             // murs connus entre deux salles vues
    if (!run.seen[k]) return;
    L.nbrs(F, k).forEach(function (m) {
      var d = L.door(k, m); if (k > m || L.pivotOf(F, d) >= 0 || L.openNow(run, d) || !(run.seen[m] || L.isLit(run, m))) return;
      var hz = y(k) === y(m), mx = (x(k) + x(m)) / 2, my = (y(k) + y(m)) / 2;
      o.push('<line class="lab-c-wall" x1="' + (hz ? mx : mx - 13) + '" y1="' + (hz ? my - 13 : my) + '" x2="' + (hz ? mx : mx + 13) + '" y2="' + (hz ? my + 13 : my) + '"/>');
    });
  });
  var fd = L.foeDist(run); if (fd != null && fd >= 0 && fd <= 4) o.push('<circle class="lab-c-foe" cx="' + x(run.foe.at) + '" cy="' + y(run.foe.at) + '" r="16"/>');
  o.push('<circle cx="' + x(run.at) + '" cy="' + y(run.at) + '" r="6" fill="#2563c9" stroke="#fff" stroke-width="2"/>');
  return '<svg viewBox="0 0 ' + w + ' ' + h + '"' + (big ? ' onclick="labTapChart(event)"' : "") + '>' + o.join("") + '</svg>';
}

/* ---------- Gestes ---------- */
function labTapMap(e) {
  var k = e.target && e.target.getAttribute && e.target.getAttribute("data-k"), run = LabyrinthRun.getRun();
  if (!k || !run || labView.sheet) return;
  if (LabyrinthRun.canMove(run, k)) { labStopWalk(); labStep(k, false); }
  else if (run.seen[k]) labWalkTo(k);
}
window.labTapMap = labTapMap;
function labStep(k, passing) {
  var r = LabyrinthRun.move(k, passing);
  if (!r.ok) return r;
  var run = LabyrinthRun.getRun();
  if (r.event === "end") { labStopWalk(); refreshSceneScreen(); return r; }
  labDraw(false);
  if (r.event === "lever") { labStopWalk(); labOpenSheet({ kind: "lever", li: LabyrinthRun.leverAt(run, run.at) }); }
  else if (r.event === "stairs") { labStopWalk(); labOpenSheet({ kind: "stairs" }); }
  else if (r.event) labStopWalk();
  else if (run.note && run.note.alert) labStopWalk();
  return r;
}
function labWalkTo(k) {
  var path = LabyrinthRun.walkPath(k);
  if (!path) { if (typeof showToast === "function") showToast(_t("Edda : « Je n'ai pas de chemin dessiné jusque-là. »"), 1800); return; }
  labCloseSheet(); labStopWalk();
  labView.walk = setInterval(function () {
    if (!path.length || !LabyrinthRun.getRun()) return labStopWalk();
    var next = path.shift(), r = labStep(next, path.length > 0);
    if (!r || !r.ok) labStopWalk();
  }, LAB_WALK_MS);
}
function labStopWalk() { if (labView.walk) { clearInterval(labView.walk); labView.walk = null; } }

/* ---------- Feuilles ---------- */
function labOpenSheet(s) { labView.sheet = s; labShowSheet(); }
function labCloseSheet() { labView.sheet = null; var b = document.getElementById("lab-sheet"); if (b) b.innerHTML = ""; }
window.labCloseSheet = labCloseSheet;
function labSheetHTML(title, sub, body, buttons) {
  var h = '<div class="lab-scrim" onclick="labCloseSheet()"></div><div class="lab-ksheet" role="dialog">';
  h += '<div class="lab-khead"><div class="lab-ktitle">' + esc(title) + '</div><span class="lab-ksub">' + esc(sub) + '</span></div>';
  h += '<div class="lab-kbody">' + body + '</div><div class="lab-kfoot">';
  buttons.forEach(function (b) { h += '<button type="button" class="kbtn ' + (b.sec ? "is-sec" : "primary") + '" onclick="' + b.on + '">' + esc(b.t) + '</button>'; });
  return h + '</div></div>';
}
function labVerdictHTML(est) {
  if (!est) return "";
  var words = window.PA2_VERDICT_WORD || {}, v = est.unwinnable ? "mortel" : est.verdict;
  return '<p class="lab-cost">' + esc(_t("Combat : {x}", { x: _td(est.foeName || "") })) + ' · <b>' + esc(words[v] || "") + '</b>' + (est.unwinnable ? "" : " · ~" + est.hpLoss + " " + esc(_t("PV"))) + '</p>';
}
function labShowSheet() {
  var box = document.getElementById("lab-sheet"), s = labView.sheet, run = LabyrinthRun.getRun(), c = LABYRINTH_CONFIG;
  if (!box || !s || !run) return;
  var h = "";
  if (s.kind === "lever") {
    var info = LabyrinthRun.leverInfo(s.li);
    h = labSheetHTML(_t("Un levier"), info.guarded ? _t("Gardé") : (info.pulled ? _t("Déjà tiré {n} fois", { n: info.pulled }) : _t("Libre")),
      '<p class="lab-quote">' + esc(info.guarded ? _td(info.guardLine) : (info.pulled ? _t("Le tirer encore remet les pans comme avant.") : _t("Personne ne sait encore ce qu'il fait tourner. Edda tient sa craie prête."))) + '</p>'
      + (info.guarded ? labVerdictHTML(info.estimate) : "") + '<p class="lab-cost">' + esc(info.guarded ? _t("Puis tirer : Souffle −{n}", { n: c.pull }) : _t("Tirer : Souffle −{n}", { n: c.pull })) + '</p>',
      [info.guarded ? { t: _t("Combattre"), on: "labGuard(" + s.li + ")" } : { t: _t("Tirer le levier"), on: "labPull(" + s.li + ")" }, { t: _t("Laisser"), sec: true, on: "labCloseSheet()" }]);
  } else if (s.kind === "stairs") {
    if (!run.bossDown) {
      h = labSheetHTML(_td(c.bossName), _t("Étage {n} · il garde l'escalier", { n: run.floor }),
        '<img class="lab-portrait" src="' + LABYRINTH_TILES.bossPortrait + '" alt="" onerror="this.style.display=\'none\'"><p class="lab-quote">' + esc(_td(LABYRINTH_TEXTS.bossLine)) + '</p>' + labVerdictHTML(LabyrinthRun.estimate("boss")),
        [{ t: _t("Combattre"), on: "labBoss()" }, { t: _t("Reculer"), sec: true, on: "labCloseSheet()" }]);
    } else {
      var g = LabyrinthRun.claimStairs() || LabyrinthRun.stairsGain(run);
      labHud(run);
      h = labSheetHTML(_t("L'escalier"), _t("Étage {n} franchi · +{s} Pierres errantes", { n: run.floor, s: g.stones }),
        '<div class="lab-bigchart">' + labChartSVG(false) + '</div><p>' + esc(_t("Dans le sac : {s} Pierres errantes, {g} or.", { s: run.stones, g: run.gold })) + '</p>'
        + '<p class="lab-cost">' + esc(_t("Descendre : Souffle +{n}, étage plus dur. Tomber ou s'essouffler plus bas fait perdre la moitié du sac.", { n: c.breathFloor })) + '</p>',
        [{ t: _t("Descendre à l'étage {n}", { n: run.floor + 1 }), on: "labDescend()" }, { t: _t("Remonter avec le sac"), sec: true, on: "labLeave()" }]);
    }
  } else if (s.kind === "chart") {
    h = labSheetHTML(_t("La carte d'Edda"), _t("Étage {n} · touche une salle dessinée pour y aller", { n: run.floor }),
      '<div class="lab-bigchart">' + labChartSVG(true) + '</div><p class="lab-cost">' + esc(_t("En violet : les pans qui tournent. Pointillés : les salles qu'on devine. Cercle rouge : les pas qu'on entend.")) + '</p>',
      [{ t: _t("Fermer"), sec: true, on: "labCloseSheet()" }]);
  } else if (s.kind === "leave") {
    h = labSheetHTML(_t("Remonter ?"), _t("Étage {n}", { n: run.floor }),
      '<p>' + esc(_t("Edda roule sa carte. Vous remontez avec tout le sac : {s} Pierres errantes, {g} or.", { s: run.stones, g: run.gold })) + '</p>',
      [{ t: _t("Remonter"), on: "labLeave()" }, { t: _t("Rester"), sec: true, on: "labCloseSheet()" }]);
  }
  box.innerHTML = h;
}
function labOpenChart() { var run = LabyrinthRun.getRun(); if (run && run.status === LAB_STATUS.map) { labStopWalk(); labOpenSheet({ kind: "chart" }); } }
window.labOpenChart = labOpenChart;
function labTapChart(e) { var k = e.target && e.target.getAttribute && e.target.getAttribute("data-go"); if (k) labWalkTo(k); }
window.labTapChart = labTapChart;
function labAskLeave() { labStopWalk(); labOpenSheet({ kind: "leave" }); }
window.labAskLeave = labAskLeave;
function labGuard(li) {
  var r = LabyrinthRun.fightGuard(li);
  if (r.ko) { labCloseSheet(); refreshSceneScreen(); return; }
  labDraw(false); labOpenSheet({ kind: "lever", li: li });
}
window.labGuard = labGuard;
function labPull(li) { var r = LabyrinthRun.pull(li); labCloseSheet(); if (LabyrinthRun.getRun().status === LAB_STATUS.done) { refreshSceneScreen(); return; } labDraw(false, r.mask); }
window.labPull = labPull;
function labBoss() { var r = LabyrinthRun.fightBoss(); if (r.ko) { labCloseSheet(); refreshSceneScreen(); return; } labDraw(false); labOpenSheet({ kind: "stairs" }); }
window.labBoss = labBoss;
function labDescend() { labCloseSheet(); LabyrinthRun.descend(); labDraw(true); }
window.labDescend = labDescend;
function labLeave() { labCloseSheet(); labStopWalk(); LabyrinthRun.finish("remonte"); refreshSceneScreen(); }
window.labLeave = labLeave;

/* ---------- Bilan ---------- */
function labEndHTML(run) {
  labStopWalk(); labView.sheet = null;
  var e = run.end || {}, kept = (e.summary && e.summary.kept) || { gold: 0, resources: {} };
  var stones = Number((kept.resources || {})[LABYRINTH_CONFIG.stoneResource] || 0);
  var title = { remonte: _t("Remonté des profondeurs"), ko: _t("Tombé à l'étage {n}", { n: e.floor }), souffle: _t("À bout de souffle, étage {n}", { n: e.floor }), abandon: _t("Descente abandonnée") }[e.how] || _t("Labyrinthe");
  var h = '<div class="lab-page lab-end"><img class="lab-end-icon" src="' + LABYRINTH_TILES.icon + '" alt="" onerror="this.style.display=\'none\'">';
  h += '<div class="lab-ktitle">' + esc(title) + '</div><p>' + esc(_t("Profondeur atteinte : étage {n}. Record : étage {b}.", { n: e.floor, b: LabyrinthRun.bestFloor() })) + '</p>';
  h += '<p class="lab-endloot"><b>' + esc(_t("{s} Pierres errantes", { s: stones })) + '</b> · ' + esc(_t("{g} or", { g: Math.floor(kept.gold || 0) })) + '</p>';
  if (e.how !== "remonte") h += '<p class="lab-cost">' + esc(_t("La moitié du sac est restée en bas.")) + '</p>';
  h += '<button type="button" class="kbtn primary" onclick="leaveSceneScreen()">' + esc(_t("Retour au village")) + '</button></div>';
  return h;
}

/* ---------- Lancement depuis le tableau ---------- */
function labLaunch() {
  var run = LabyrinthRun.getRun();
  if (run && run.status !== LAB_STATUS.done) { switchTab("scene"); return; }
  var r = LabyrinthRun.start();
  if (!r.ok) { if (typeof showToast === "function") showToast(r.reason, 2000); return; }
  labView.sheet = null; labView.drawn = null;
  switchTab("scene");
}
window.labLaunch = labLaunch;
