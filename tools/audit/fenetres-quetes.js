"use strict";
/* tools/audit/fenetres-quetes.js — v3.512.0 : les fenêtres des quêtes s'ouvrent-elles au bon moment ?
   Le vrai index.html dans Chromium (390 px). Une partie neuve (Chevalier) avance l'Histoire étape par étape
   (adminForceStoryStep, sans le mode muet) et, à chaque étape, vérifie À L'ÉCRAN :
     - tutoriel d'étape : pas avant l'acceptation ; après, à l'arrivée sur son onglet (onglet ouvert ?) ;
     - dialogue d'ouverture dans la carte de quête (narrative.dialogue) ;
     - fenêtre de fin : titre, texte, dialogue d'arrivée (completionDialogue) ;
     - onglets promis (unlockTabs) ouverts après la réclamation ;
     - tutoriels génériques : à quelle étape chacun devient visible ; ceux qui ne s'ouvrent jamais.
   Lancer : node tools/audit/fenetres-quetes.js .     Sortie : rapport texte + captures/fenetres-quetes/rapport.json */

var http = require("http"), fs = require("fs"), path = require("path");
var chromium = require("playwright").chromium;
var ROOT = require("../chemins.js").jeu(process.argv[2]);
var OUT = require("../chemins.js").captures("fenetres-quetes");
var MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".json": "application/json", ".webmanifest": "application/manifest+json", ".woff2": "font/woff2", ".mp3": "audio/mpeg" };
var srv = http.createServer(function (q, res) {
  var p = decodeURIComponent(q.url.split("?")[0]); if (p === "/") p = "/index.html";
  fs.readFile(path.join(ROOT, p), function (e, d) { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" }); res.end(d); });
});

/* ---------- Fonctions exécutées dans la page ---------- */
var PAGE = function () {
  window.__F = {
    norm: function (t) { return String(t || "").replace(/\s+/g, " ").trim(); },
    neutral: function (tab) { return tab === "quests" ? "campement" : "quests"; },
    modal: function (id) { var h = document.getElementById(id); return h && h.innerText.trim() ? h.innerText.replace(/\s+/g, " ").trim() : ""; },
    // Ferme ce qui est ouvert (tutoriel, fin de quête, carte de boss) par son vrai bouton
    closeAll: function () {
      var seen = [];
      for (var i = 0; i < 8; i++) {
        var roots = ["tutorial-modal-root", "adventure-quest-modal-root", "cycle-modal-root"], open = null;
        roots.forEach(function (r) { var h = document.getElementById(r); if (!open && h && h.innerText.trim()) open = h; });
        if (!open) break;
        seen.push(open.id + " : " + open.innerText.replace(/\s+/g, " ").trim().slice(0, 60));
        var b = open.querySelector(".kwin-foot .kbtn.primary, .kwin-foot button, button");
        if (b) b.click(); else open.innerHTML = "";
      }
      return seen;
    },
    genericCandidates: function () {
      var out = [];
      Object.keys(GENERIC_TUTORIALS).forEach(function (k) {
        var t = GENERIC_TUTORIALS[k];
        if ((game.genericTutorialsSeen || {})[k] || !t.tab) return;
        out.push({ id: k, tab: t.tab, unlocked: isTabUnlocked(t.tab), cond: typeof t.condition !== "function" || !!t.condition() });
      });
      return out;
    }
  };
};

(async function () {
  await new Promise(function (r) { srv.listen(0, r); });
  var b = await chromium.launch();
  var ctx = await b.newContext({ locale: "fr-FR", serviceWorkers: "block", viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  var p = await ctx.newPage(), errs = [];
  p.on("pageerror", function (e) { errs.push(e.message); });
  p.on("console", function (m) { if (m.type() === "error") errs.push("console : " + m.text().slice(0, 160)); });
  await p.goto("http://localhost:" + srv.address().port + "/index.html");
  await p.waitForFunction(function () { var t = document.getElementById("title-screen-root"); return t && t.innerHTML.length > 0; }, null, { timeout: 20000 });
  await p.waitForFunction(function () { var g = document.getElementById("pwa-boot-gate"); return !g || !g.classList.contains("show"); }, null, { timeout: 20000 }).catch(function () {});
  await p.evaluate(function () { titleScreenNewGame(); });
  await p.waitForTimeout(300);
  await p.evaluate(function () { pendingHeroId = "knight"; pendingPlayerName = "Seb"; confirmHeroSelection(); });
  await p.waitForTimeout(600);
  await p.evaluate(PAGE);
  await p.evaluate(function () { return __F.closeAll(); });

  var rows = [], generics = {}, anomalies = [];
  for (var n = 0; n < 220; n++) {
    var r = await p.evaluate(function () {
      var SQ = StoryQuestManager, ch = SQ.activeChapterIds()[0], step = ch && SQ.getCurrentStep(ch);
      if (!step) return null;
      var o = { ch: ch, id: step.id, title: _td(step.title), notes: [] };
      __F.closeAll();
      // 1. Tutoriel AVANT l'acceptation : ne doit pas s'ouvrir
      var tut = step.tutorial;
      if (tut && !SQ.isCurrentStepAccepted(ch) && tut.tab !== "combat") {
        switchTab(__F.neutral(tut.tab)); __F.closeAll(); switchTab(tut.tab);
        var avant = __F.modal("tutorial-modal-root");
        if (avant.indexOf(_td(tut.title)) >= 0) o.notes.push("tutoriel ouvert AVANT l'acceptation");
        __F.closeAll();
      }
      // 2. Acceptation : aucune fenêtre ne doit surgir d'elle-même (sinon on la note)
      if (!SQ.isCurrentStepAccepted(ch)) SQ.acceptStep(ch);
      var surgi = __F.closeAll();
      if (surgi.length) o.accept = surgi;
      // 3. Dialogue d'ouverture dans la carte de quête
      var dl = step.narrative && step.narrative.dialogue;
      if (dl && dl.length) {
        switchTab("quests"); if (typeof setQuestCategory === "function") setQuestCategory("histoire");
        __F.closeAll();
        var first = dl.filter(Boolean)[0], txt = _td(first.text || "");
        var panel = document.getElementById("panel-container"), found = panel && panel.innerText.indexOf(txt.slice(0, 40)) >= 0;
        if (!found) {   // la carte de l'étape en cours est peut-être repliée : on l'ouvre comme le joueur
          var card = Array.prototype.slice.call(document.querySelectorAll("#panel-container .story-step-card, #panel-container [data-step-id]")).filter(function (c) { return (c.getAttribute("data-step-id") || "") === step.id; })[0];
          if (card) { card.click(); found = panel.innerText.indexOf(txt.slice(0, 40)) >= 0; }
        }
        o.dialogue = found ? "vu" : "absent";
      }
      // 4. Tutoriel APRÈS l'acceptation, à l'arrivée sur son onglet
      if (tut) {
        o.tutTab = tut.tab; o.tutUnlocked = isTabUnlocked(tut.tab);
        var qid = tut.tab === "combat" && step.linkTo && String(step.linkTo.cardId || "").indexOf("adv_aq_") === 0 ? String(step.linkTo.cardId).slice(4) : null;
        switchTab(__F.neutral(tut.tab)); __F.closeAll();
        if (qid) {   // l'écran Combat ne s'ouvre qu'avec un combat : on lance la vraie quête, comme depuis le tableau
          game.heroHp = game.heroMaxHp; AdventureQuestManager.start(qid);
          o.lance = qid + (game.activeTab === "combat" ? "" : " (écran Combat non ouvert : " + game.activeTab + ")");
        } else switchTab(tut.tab);
        var m = __F.modal("tutorial-modal-root"), bc = __F.modal("cycle-modal-root");
        o.tut = m.indexOf(_td(tut.title)) >= 0 ? "vu" : m ? "autre fenêtre : " + m.slice(0, 50) : "rien";
        if (o.tut === "vu" && bc) o.notes.push("tutoriel et carte de boss ouverts ensemble");
        __F.closeAll();
        if (qid && game.adventureQuestRun && game.adventureQuestRun.active) { AdventureQuestManager.forfeit(); game.heroHp = game.heroMaxHp; __F.closeAll(); switchTab("campement"); __F.closeAll(); }
      }
      // 5. Réclamation : fenêtre de fin, texte, dialogue d'arrivée
      var want = { text: step.narrative && step.narrative.completion ? _td(step.narrative.completion) : "", dlg: (step.narrative && step.narrative.completionDialogue || []).length };
      var id = adminForceStoryStep(false);
      if (id !== step.id) { o.notes.push("réclamation refusée (" + id + ")"); return o; }
      var fin = document.getElementById("adventure-quest-modal-root"), ft = fin ? __F.norm(fin.innerText) : "";
      var boss = __F.modal("cycle-modal-root");
      o.fin = !ft.trim() ? (boss ? "derrière une carte de boss" : "rien") : ft.indexOf(_td(step.title)) >= 0 ? "vu" : "autre : " + ft.slice(0, 50);
      want.text = step.narrative && step.narrative.completion ? _td(step.narrative.completion) : "";   // relu : il dépend du choix fait à la réclamation
      if (want.text && ft && ft.indexOf(__F.norm(want.text).slice(0, 30)) < 0) o.notes.push("texte de fin absent : « " + __F.norm(want.text).slice(0, 30) + " »");
      if (want.dlg) o.finDlg = fin ? fin.querySelectorAll(".story-dialogue-line").length + "/" + want.dlg : "0/" + want.dlg;
      o.apres = __F.closeAll().slice(1);   // fenêtres ouvertes en chaîne après la fin (hors la fin elle-même)
      // 6. Onglets promis
      var miss = (step.unlockTabs || []).filter(function (t) { return !isTabUnlocked(t); });
      if (miss.length) o.notes.push("onglets non ouverts : " + miss.join(", "));
      return o;
    });
    if (!r) break;
    // 7. Tutoriels génériques : chaque candidat dont la condition est remplie, sur son onglet
    var cands = await p.evaluate(function () { return __F.genericCandidates(); });
    for (var c of cands) {
      if (!c.cond || !c.unlocked || generics[c.id]) continue;
      var vu = await p.evaluate(function (c) {
        switchTab(__F.neutral(c.tab)); __F.closeAll(); switchTab(c.tab);
        var m = __F.modal("tutorial-modal-root"), t = _td(GENERIC_TUTORIALS[c.id].title || "");
        __F.closeAll();
        return m.indexOf(t) >= 0;
      }, c);
      if (vu) generics[c.id] = r.id;
    }
    rows.push(r);
    var bad = [];
    if (r.tut && r.tut !== "vu") bad.push("tutoriel : " + r.tut + (r.tutUnlocked ? "" : " (onglet « " + r.tutTab + " » fermé)"));
    if (r.dialogue === "absent") bad.push("dialogue d'ouverture absent");
    if (r.fin && r.fin !== "vu") bad.push("fin : " + r.fin);
    if (r.finDlg && r.finDlg.split("/")[0] !== r.finDlg.split("/")[1]) bad.push("dialogue de fin " + r.finDlg);
    if (r.accept) bad.push("à l'acceptation : " + r.accept.join(" | "));
    if (r.apres && r.apres.length) bad.push("après la fin : " + r.apres.join(" | "));
    bad = bad.concat(r.notes);
    if (bad.length) anomalies.push(r.id + " « " + r.title + " » — " + bad.join(" ; "));
  }
  var all = await p.evaluate(function () { return Object.keys(GENERIC_TUTORIALS).map(function (k) { return { id: k, tab: GENERIC_TUTORIALS[k].tab || "(sans onglet)", seen: !!(game.genericTutorialsSeen || {})[k] }; }); });
  var tuts = rows.filter(function (r) { return r.tutTab; });
  console.log("Étapes parcourues : " + rows.length + " · tutoriels d'étape : " + tuts.filter(function (r) { return r.tut === "vu"; }).length + "/" + tuts.length
    + " · fenêtres de fin vues : " + rows.filter(function (r) { return r.fin === "vu"; }).length + "/" + rows.length
    + " · dialogues d'ouverture vus : " + rows.filter(function (r) { return r.dialogue === "vu"; }).length + "/" + rows.filter(function (r) { return r.dialogue; }).length);
  console.log("\nTutoriels génériques (étape où ils s'ouvrent) :");
  all.forEach(function (g) { console.log("  " + g.id.padEnd(22) + (generics[g.id] ? "à " + generics[g.id] : g.seen ? "vu (hors balayage)" : "JAMAIS ouvert") + "  [onglet " + g.tab + "]"); });
  console.log("\nAnomalies (" + anomalies.length + ") :");
  anomalies.forEach(function (a) { console.log("  ✘ " + a); });
  console.log("\nErreurs de la page (" + errs.length + ") :");
  errs.slice(0, 15).forEach(function (e) { console.log("  " + e); });
  fs.writeFileSync(path.join(OUT, "rapport.json"), JSON.stringify({ rows: rows, generics: generics, anomalies: anomalies, errs: errs }, null, 1));
  await b.close(); srv.close();
})().catch(function (e) { console.error(e); process.exit(1); });
