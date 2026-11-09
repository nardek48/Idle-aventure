"use strict";
/* ui/alpha-view.js — v3.753.0 : fenêtres de l'édition Alpha (atelier alpha-fenetres.html, Seb 09/11 : ton B, option A).
   Premier lancement : journal actif ou coupé. Fin (desert_18) : avis facultatif, puis envoi du journal par le menu de partage. */

/* Questionnaire : 6 notes de 1 à 10, la difficulté en 3 choix, un texte libre ; tout est facultatif.
   Libellés en fonctions : chaque _t() reste littéral pour l'audit i18n. */
var ALPHA_AVIS_QUESTIONS = [
  { id: "aime", kind: "note", label: function () { return _t("Globalement, tu as aimé ?"); } },
  { id: "combats", kind: "note", label: function () { return _t("Les combats"); } },
  { id: "village", kind: "note", label: function () { return _t("Le village (bâtiments, production, Forge)"); } },
  { id: "histoire", kind: "note", label: function () { return _t("L'Histoire et les personnages"); } },
  { id: "clarte", kind: "note", label: function () { return _t("Tu comprenais ce qu'il fallait faire ?"); } },
  { id: "suite", kind: "note", label: function () { return _t("Tu aurais envie de jouer la suite ?"); } },
  { id: "difficulte", kind: "choix", label: function () { return _t("La difficulté"); }, choix: [["facile", function () { return _t("Trop facile"); }], ["juste", function () { return _t("Juste bien"); }], ["dur", function () { return _t("Trop dur"); }]] },
  { id: "gene", kind: "texte", label: function () { return _t("Ce qui t'a le plus gêné"); } }
];
var ALPHA_AVIS_TEXTE_MAX = 500;

var alphaFinStep = "fin";  // "fin" → "avis" → "envoi"
var alphaAvis = {};

function alphaRoot() {
  var root = document.getElementById("alpha-win-root");
  if (!root) { root = document.createElement("div"); root.id = "alpha-win-root"; document.body.appendChild(root); }
  return root;
}

function alphaWinHTML(o) {
  var h = '<div class="full-menu-overlay kwin-veil"><div class="kwin alpha-win" role="dialog" aria-modal="true" aria-label="' + esc(o.title) + '">';
  h += kWinHeadHTML({ icon: '<span class="alpha-ico" aria-hidden="true">' + o.ico + '</span>', title: esc(o.title), sub: esc(o.sub) });
  h += '<div class="kwin-body' + (o.long ? ' alpha-long' : '') + '">' + o.body + '</div>';
  h += '<div class="kwin-foot">' + o.foot + '</div></div></div>';
  return h;
}

function alphaBtn(label, onclick, primary) {
  return '<button type="button" class="kbtn' + (primary ? ' primary' : '') + '" onclick="' + onclick + '">' + esc(label) + '</button>';
}

/* ---------- Premier lancement ---------- */
function alphaIntroHTML() {
  var body = '<p class="kwin-quote">' + esc(_t("« Note tout. Les pas, les coups, ce que ça coûte. Un jour, quelqu'un lira. » — Maddoc")) + '</p>'
    + '<p class="kwin-text">' + esc(_t("Cette route s'arrête au bout du Désert. Un carnet te suit jusque-là : étapes, combats, morts, or, équipement.")) + '</p>'
    + '<p class="alpha-mini">' + esc(_t("Rien de personnel, ni nom ni adresse. Le carnet reste sur ce téléphone ; c'est toi qui choisis de l'envoyer, à la fin. Paramètres › Appareil pour le fermer.")) + '</p>';
  return alphaWinHTML({ ico: "α", title: _t("Avant de partir"), sub: _t("Version Alpha · Forêt et Désert"), body: body,
    foot: alphaBtn(_t("D'accord"), "closeAlphaIntro(true)", true) + alphaBtn(_t("Ne pas enregistrer"), "closeAlphaIntro(false)") });
}

function openAlphaIntro() {
  if (!document.body) return;
  alphaRoot().innerHTML = alphaIntroHTML();
  if (window.Prefs) Prefs.setValue("alphaIntroSeen", "1"); // une fois par appareil
}

function closeAlphaIntro(garder) {
  alphaRoot().innerHTML = "";
  if (window.JournalTest) JournalTest.setOn(!!garder);
  if (typeof showToast === "function") showToast(garder ? _t("Journal actif. Bonne route !") : _t("Journal coupé"), 1600);
}

/* ---------- Fin de l'Alpha ---------- */
function alphaAvisCount() {
  return Object.keys(alphaAvis).filter(function (k) { return alphaAvis[k] !== null && alphaAvis[k] !== undefined && alphaAvis[k] !== ""; }).length;
}

function alphaJournalStat() {
  var n = window.JournalTest ? JournalTest.count() : 0, min = Math.round(Number(game.playTime || 0) / 60);
  var temps = Math.floor(min / 60) + " h " + (min % 60 < 10 ? "0" : "") + (min % 60);
  return _tn(n, "Carnet : {n} ligne · {t} de route", "Carnet : {n} lignes · {t} de route", { t: temps });
}

function alphaQuestionHTML(q) {
  var v = alphaAvis[q.id], lid = "alpha-l-" + q.id, h = '<div class="alpha-q"><div class="alpha-q-l" id="' + lid + '">' + esc(q.label()) + '</div>';
  if (q.kind === "note") {
    h += '<div class="alpha-q-n" role="group" aria-labelledby="' + lid + '">';
    for (var i = 1; i <= 10; i++) h += '<button type="button" aria-pressed="' + (v === i) + '" onclick="alphaAvisSet(\'' + q.id + '\',' + i + ')">' + i + '</button>';
    h += '</div><div class="alpha-q-bornes"><span>' + esc(_t("1 · pas du tout")) + '</span><span>' + esc(_t("10 · énormément")) + '</span></div>';
  } else if (q.kind === "choix") {
    h += '<div class="alpha-q-3" role="group" aria-labelledby="' + lid + '">' + q.choix.map(function (c) {
      return '<button type="button" aria-pressed="' + (v === c[0]) + '" onclick="alphaAvisSet(\'' + q.id + '\',\'' + c[0] + '\')">' + esc(c[1]()) + '</button>';
    }).join("") + '</div>';
  } else {
    h += '<textarea id="alpha-q-' + q.id + '" maxlength="' + ALPHA_AVIS_TEXTE_MAX + '" aria-labelledby="' + lid + '" placeholder="' + esc(_t("Facultatif")) + '" oninput="alphaAvisText(\'' + q.id + '\', this.value)">' + esc(v || "") + '</textarea>';
  }
  return h + '</div>';
}

function alphaFinHTML() {
  var journal = !!(window.JournalTest && JournalTest.isOn());
  var quote = '<p class="kwin-quote">' + esc(_t("« Au nord, des pierres qui bougent. » Sarkel regarde la route. Elle n'est pas encore tracée.")) + '</p>';
  var ouvert = '<p class="alpha-mini">' + esc(_t("Le village, les donjons et les Petites Aventures restent ouverts.")) + '</p>';
  var continuer = alphaBtn(_t("Continuer à jouer"), "closeAlphaFin()", !journal);
  if (!journal) {
    return alphaWinHTML({ ico: "✓", title: _t("La route du nord attendra"), sub: _t("Fin de l'Alpha"),
      body: quote + '<p class="kwin-text">' + esc(_t("Le Désert est derrière toi. Tu as voyagé sans carnet : rien à envoyer, et c'est très bien comme ça.")) + '</p>' + ouvert, foot: continuer });
  }
  if (alphaFinStep === "avis") {
    var body = ALPHA_AVIS_QUESTIONS.map(alphaQuestionHTML).join("") + '<p class="alpha-q-compte" aria-live="polite">' + esc(_t("{n} réponse(s) sur {m}", { n: alphaAvisCount(), m: ALPHA_AVIS_QUESTIONS.length })) + '</p>';
    return alphaWinHTML({ ico: "✎", title: _t("Ce que tu en as pensé"), sub: _t("8 questions · aucune n'est obligatoire"), body: body, long: true,
      foot: alphaBtn(_t("Valider"), "alphaFinGo('envoi')", true) + alphaBtn(_t("Passer", "avis"), "alphaFinGo('passer')") });
  }
  if (alphaFinStep === "envoi") {
    var avec = alphaAvisCount() > 0;
    return alphaWinHTML({ ico: "✓", title: _t("Le carnet est prêt"), sub: _t("Dernière étape"),
      body: '<p class="kwin-text">' + esc(avec ? _t("Tes mots sont glissés à la dernière page du carnet.") : _t("Pas de mots cette fois : le carnet part tel quel.")) + '</p>'
        + '<p class="kwin-text">' + esc(_t("Envoie-le par le moyen que tu veux : mail, messages, Discord…")) + '</p>'
        + '<p class="alpha-stat">' + esc(alphaJournalStat()) + '</p>',
      foot: '<button type="button" class="kbtn primary" onclick="alphaSendJournal()">' + esc(_t("Envoyer mon journal")) + '</button>' + continuer });
  }
  return alphaWinHTML({ ico: "✓", title: _t("La route du nord attendra"), sub: _t("Fin de l'Alpha"),
    body: quote + '<p class="kwin-text">' + esc(_t("Le Désert est derrière toi. La suite viendra. En attendant, ton carnet peut aider à la tracer : envoie-le par le moyen que tu veux.")) + '</p>'
      + '<p class="alpha-stat">' + esc(alphaJournalStat()) + '</p>' + ouvert,
    foot: '<button type="button" class="kbtn primary" onclick="alphaFinGo(\'avis\')">' + esc(_t("Donner mon avis · 1 min")) + '</button>' + alphaBtn(_t("Passer", "avis"), "alphaFinGo('passer')") });
}

function renderAlphaFin() {
  var body = document.querySelector("#alpha-win-root .kwin-body"), top = body ? body.scrollTop : 0;
  var html = alphaFinHTML();
  if (body) html = html.replace('class="kwin alpha-win"', 'class="kwin alpha-win alpha-still"'); // fenêtre déjà ouverte : pas de nouvelle animation
  alphaRoot().innerHTML = html;
  body = document.querySelector("#alpha-win-root .kwin-body");
  if (body) body.scrollTop = top; // une note touchée ne remonte pas la liste
}

function openAlphaFin() {
  if (!document.body) return;
  alphaFinStep = "fin"; alphaAvis = {};
  renderAlphaFin();
  if (window.Prefs) Prefs.setValue("alphaFinSeen", "1"); // une fois par appareil ; Paramètres › Appareil la rouvre
}

function closeAlphaFin() { alphaRoot().innerHTML = ""; }

/* « Valider » note l'avis dans le journal (une ligne « avis ») ; « Passer » depuis l'avis l'oublie */
function alphaFinGo(step) {
  if (step === "passer" && alphaFinStep === "avis") alphaAvis = {};
  if (step === "envoi" || step === "passer") {
    if (alphaFinStep === "avis" && alphaAvisCount() > 0 && window.JournalTest) { JournalTest.log("avis", Object.assign({}, alphaAvis)); JournalTest.flush(); }
    alphaFinStep = "envoi";
  } else alphaFinStep = step;
  renderAlphaFin();
}

function alphaAvisSet(id, v) {
  alphaAvis[id] = alphaAvis[id] === v ? null : v; // toucher la note choisie l'efface
  renderAlphaFin();
}

function alphaAvisText(id, v) {
  alphaAvis[id] = String(v || "").trim().slice(0, ALPHA_AVIS_TEXTE_MAX);
  var c = document.querySelector("#alpha-win-root .alpha-q-compte");
  if (c) c.textContent = _t("{n} réponse(s) sur {m}", { n: alphaAvisCount(), m: ALPHA_AVIS_QUESTIONS.length });
}

function alphaSendJournal() {
  if (window.JournalTest) JournalTest.shareFile();
}

/* Au lancement, comme « La Forge a changé » : attend que le héros soit libre et qu'aucune fenêtre ne soit ouverte */
var alphaWatchTimer = null;
function alphaWatch() {
  if (alphaWatchTimer || typeof setInterval !== "function" || !window.Prefs || !isAlphaEdition()) return;
  alphaWatchTimer = setInterval(function () {
    if (Prefs.has("alphaIntroSeen") && Prefs.has("alphaFinSeen")) { clearInterval(alphaWatchTimer); alphaWatchTimer = null; return; }
    if (typeof newsCanShow === "function" && !newsCanShow()) return;
    if (!Prefs.has("alphaIntroSeen")) return openAlphaIntro();
    if (window.AlphaEdition && AlphaEdition.isFinished() && !Prefs.has("alphaFinSeen")) openAlphaFin();
  }, 2500);
}
if (typeof window !== "undefined" && typeof window.addEventListener === "function") window.addEventListener("load", alphaWatch);

/* Pas d'outils de test pour les testeurs : l'onglet Admin reste vide en Alpha (le lien est aussi retiré des Paramètres) */
if (typeof isAlphaEdition === "function" && isAlphaEdition() && typeof window.buildAdminHTML === "function") {
  window.buildAdminHTML = function () { return '<div class="set-card"><p class="set-note">' + esc(_t("Outils de test indisponibles dans la version Alpha.")) + '</p></div>'; };
}

window.openAlphaIntro = openAlphaIntro;
window.closeAlphaIntro = closeAlphaIntro;
window.openAlphaFin = openAlphaFin;
window.closeAlphaFin = closeAlphaFin;
window.alphaFinGo = alphaFinGo;
window.alphaAvisSet = alphaAvisSet;
window.alphaAvisText = alphaAvisText;
window.alphaSendJournal = alphaSendJournal;
window.alphaFinHTML = alphaFinHTML;
window.alphaIntroHTML = alphaIntroHTML;
