"use strict";
/* ui/prologue-view.js — v3.570.0 : le prologue (option B de Seb, atelier atelier/prologue.html).
   Planches 1-4 avant la création du héros, 5-6 après ; conception : systemes/introduction/Aethervale_Prologue_v0_2.md. */

/* Les planches (images et textes) sont dans data/prologue.js (PROLOGUE_PLANCHES). */
var PROLOGUE_TEMPS = { avant: [0, 4], apres: [4, 6], tout: [0, 6] }; // avant, après la création ; tout = « Revoir »
var PROLOGUE_MS_LETTRE = 40;                           // choix de Seb : lettre à lettre, vitesse normale, rythme régulier

var PrologueView = {
  active: false,
  temps: null,
  idx: 0,
  fin: null,
  timers: [],
  deck: null, // v3.623.0 : planches jouées (prologue ou ouverture de chapitre), voir deckPrologue / deckChapitre

  /* Lance un temps ("avant" ou "apres") ; onEnd est appelé à la fin ou sur « Passer ». */
  play: function (temps, onEnd) {
    var root = PrologueView.root();
    if (!root || !PROLOGUE_TEMPS[temps]) { if (onEnd) onEnd(); return; }
    PrologueView.start(PrologueView.deckPrologue(temps), temps, onEnd);
  },

  /* v3.623.0 : ouverture d'un chapitre (data/chapter-openings.js), trois planches, même lecture que le prologue. */
  playChapter: function (id, onEnd) {
    var c = window.CHAPTER_OPENINGS && CHAPTER_OPENINGS[id];
    if (!c || !PrologueView.root()) { if (onEnd) onEnd(); return; }
    PrologueView.start({ planches: c.planches, dir: "images/Chapitres/", range: [0, c.planches.length], label: _td(c.num), eyebrow: _td(c.num), teinte: c.teinte, cls: "is-chapitre" }, "chapitre", onEnd);
  },

  /* v3.631.0 (Tour) : paquet de planches libre (vision, fins), images dans images/Tour/. */
  playDeck: function (deck, onEnd) {
    if (!deck || !PrologueView.root()) { if (onEnd) onEnd(); return; }
    PrologueView.start({ planches: deck.planches, dir: "images/Tour/", range: [0, deck.planches.length], label: _td(deck.num), eyebrow: _td(deck.eyebrow || ""), teinte: deck.teinte, cls: "is-chapitre" }, "tour", onEnd);
  },

  deckPrologue: function (temps) {
    return { planches: PROLOGUE_PLANCHES, dir: "images/Prologue/", range: PROLOGUE_TEMPS[temps], label: _t("Prologue"), eyebrow: "", teinte: null, cls: "" };
  },

  start: function (deck, temps, onEnd) {
    PrologueView.active = true;
    PrologueView.temps = temps;
    PrologueView.deck = deck;
    PrologueView.fin = onEnd || null;
    var a = document.activeElement; if (a && a.blur) a.blur(); // v3.573.0 : pas de clavier ouvert sous les planches
    PrologueView.show(deck.range[0]);
  },

  /* Calque plein écran créé à la demande, au-dessus de la création du héros (z-index 3001). */
  root: function () {
    if (typeof document === "undefined" || !document.body) return null;
    var el = document.getElementById("prologue-root");
    if (!el) { el = document.createElement("div"); el.id = "prologue-root"; document.body.appendChild(el); }
    return el;
  },

  src: function (i, wide) { var d = PrologueView.deck || PrologueView.deckPrologue("tout"); return d.dir + d.planches[i].img + (wide ? "-wide" : "") + ".webp"; },

  show: function (i) {
    PrologueView.clear();
    PrologueView.idx = i;
    var d = PrologueView.deck, p = d.planches[i], range = d.range, dots = "";
    for (var k = range[0]; k < range[1]; k++) dots += '<i class="' + (k === i ? "on" : "") + '"></i>';
    var lignes = p.lignes.map(function (l, n) {
      var txt = _td(l).split("{nom}").join((typeof game !== "undefined" && game && game.playerName) || ""); // v3.631.0 : nom du héros
      return '<p class="' + (p.nom === n ? "is-nom" : "") + '">' + prologueLetters(txt) + '</p>';
    }).join("");
    // v3.623.0 : teinte du chapitre en variables (fond animé si l'image manque), chapitre rappelé sur la première planche
    var tv = d.teinte ? ' style="--pro-a:' + d.teinte[0] + ';--pro-b:' + d.teinte[1] + ';--pro-c:' + d.teinte[2] + '"' : "";
    PrologueView.root().innerHTML = '<div class="prologue ' + d.cls + '" role="dialog" aria-modal="true" aria-label="' + esc(d.label) + '"' + tv + '>'
      + '<div class="prologue-scene" onclick="PrologueView.next()">'
      + '<picture><source media="(min-aspect-ratio: 1/1)" srcset="' + PrologueView.src(i, true) + '">'
      + '<img id="prologue-img" src="' + PrologueView.src(i, false) + '" alt=""></picture>'
      + '<div class="prologue-veil"></div>' + (d.eyebrow && i === range[0] ? '<div class="prologue-eyebrow">' + esc(d.eyebrow) + '</div>' : '')
      + '<div class="prologue-text" aria-live="polite">' + lignes + '</div></div>'
      + '<button class="prologue-skip" type="button" onclick="PrologueView.skip()">' + esc(_t("Passer ▸")) + '</button>'
      + '<div class="prologue-foot"><div class="prologue-dots">' + dots + '</div>'
      + '<span class="prologue-hint" id="prologue-hint">' + esc(_t("Toucher pour continuer")) + '</span></div></div>';
    var img = document.getElementById("prologue-img");
    var on = function () { img.classList.add("on"); };
    // v3.623.0 : image absente (pas encore livrée) -> fond animé de la teinte ; le chemin reste celui attendu
    var vide = function () { var sc = img.closest(".prologue-scene"); if (sc) sc.classList.add("is-vide"); img.classList.add("is-absente"); };
    if (img.complete && img.naturalWidth) requestAnimationFrame(on);
    else if (img.complete) vide();
    else { img.onload = on; img.onerror = vide; }
    PrologueView.type();
    if (i + 1 < range[1] && typeof Image !== "undefined") { var pre = new Image(); pre.src = PrologueView.src(i + 1, window.matchMedia && matchMedia("(min-aspect-ratio: 1/1)").matches); }
  },

  /* Lettre à lettre, au rythme régulier ; d'un bloc si l'appareil demande moins d'animations. */
  type: function () {
    var ls = document.querySelectorAll("#prologue-root .prologue-l"), t = 700;
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) { PrologueView.revealAll(); return; }
    Array.prototype.forEach.call(ls, function (el, k) {
      var next = ls[k + 1];
      PrologueView.timers.push(setTimeout(function () { el.classList.add("v"); }, t));
      t += PROLOGUE_MS_LETTRE;
      if (next && el.parentNode.parentNode !== next.parentNode.parentNode) t += PROLOGUE_MS_LETTRE * 5; // court temps entre deux lignes
    });
    PrologueView.timers.push(setTimeout(PrologueView.hint, t + 200));
  },

  revealAll: function () {
    PrologueView.clear();
    Array.prototype.forEach.call(document.querySelectorAll("#prologue-root .prologue-l"), function (el) { el.classList.add("v"); });
    PrologueView.hint();
  },

  hint: function () { var h = document.getElementById("prologue-hint"); if (h) h.classList.add("on"); },
  clear: function () { PrologueView.timers.forEach(clearTimeout); PrologueView.timers = []; },

  /* Toucher : d'abord tout le texte, puis la planche suivante (ou la fin du temps). */
  next: function () {
    if (!PrologueView.active) return;
    if (document.querySelector("#prologue-root .prologue-l:not(.v)")) { PrologueView.revealAll(); return; }
    if (PrologueView.idx + 1 < PrologueView.deck.range[1]) PrologueView.show(PrologueView.idx + 1);
    else PrologueView.end();
  },

  skip: function () { if (PrologueView.active) PrologueView.end(); },

  end: function () {
    var cb = PrologueView.fin, nom = PrologueView.temps === "avant" && document.getElementById("player-name-input");
    PrologueView.clear();
    PrologueView.active = false;
    PrologueView.fin = null;
    PrologueView.deck = null;
    var root = document.getElementById("prologue-root");
    if (root) root.innerHTML = "";
    if (nom) { try { nom.focus({ preventScroll: true }); } catch (e) { nom.focus(); } } // le clavier s'ouvre au nom, pas avant
    if (cb) cb();
  }
};

/* Mots insécables, lettres déjà en place mais invisibles : rien ne saute pendant la frappe. */
function prologueLetters(text) {
  // v3.631.0 : « : ; ! ? » » collés au mot d'avant, « « » au suivant (pas de deux-points seul en début de ligne)
  var t = String(text).replace(/ ([:;!?»])/g, "\u00a0$1").replace(/« /g, "«\u00a0");
  return t.split(" ").map(function (mot) {
    return '<span class="prologue-m">' + mot.split("").map(function (c) { return '<span class="prologue-l">' + esc(c) + '</span>'; }).join("") + '</span>';
  }).join(" ");
}

/* Quêtes › Histoire : « Revoir le prologue » rejoue les six planches d'un trait. */
function openPrologueReplay() {
  PrologueView.play("tout", null);
}

/* v3.623.0 : ouvertures de chapitre. Jouée une fois à la fin de l'étape d'arrivée du monde, revue depuis Quêtes › Histoire. */
function chapterOpeningForStepTitle(title) {
  var found = null;
  (window.CHAPTER_OPENING_ORDER || []).forEach(function (id) {
    var q = window.STORY_QUESTS && STORY_QUESTS[id], c = CHAPTER_OPENINGS[id];
    var st = q && q.steps.find(function (s) { return s.id === c.step; });
    if (st && st.title === title && window.StoryQuestManager && StoryQuestManager.isStepReached && StoryQuestManager.getState(id).claimedSteps[c.step]) found = id;
  });
  return found;
}
function chapterOpeningsAvailable() { // chapitres dont l'étape d'arrivée est faite (parties en cours comprises)
  return (window.CHAPTER_OPENING_ORDER || []).filter(function (id) {
    var st = window.StoryQuestManager && StoryQuestManager.getState(id);
    return !!(st && st.claimedSteps && st.claimedSteps[CHAPTER_OPENINGS[id].step]);
  });
}
function openChapterOpeningReplay(id) { PrologueView.playChapter(id, null); }

if (typeof document !== "undefined") {
  document.addEventListener("keydown", function (e) {
    if (!PrologueView.active) return;
    if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") { e.preventDefault(); PrologueView.next(); }
  });
}

window.PrologueView = PrologueView;
window.prologueLetters = prologueLetters;
window.openPrologueReplay = openPrologueReplay;
window.chapterOpeningForStepTitle = chapterOpeningForStepTitle;
window.chapterOpeningsAvailable = chapterOpeningsAvailable;
window.openChapterOpeningReplay = openChapterOpeningReplay;
