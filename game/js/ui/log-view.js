"use strict";
/* ui/log-view.js — écran Journal : 50 événements les plus récents (window.gameLog). */

/* v3.365.0 (lot J, demande Seb 28/09/2026) : le Bilan de la partie, venu des Hauts faits, en tête
   du Journal. Ouvert par défaut, repliable ; l'état replié suit l'appareil (Prefs « logTotals »). */
function toggleLogTotals() {
  if (window.Prefs) Prefs.set("logTotals", !Prefs.get("logTotals"));
  if (typeof renderPanel === "function") renderPanel();
}
window.toggleLogTotals = toggleLogTotals;

function buildLogTotalsHTML() {
  if (typeof buildAchievementTotalsHTML !== "function") return "";
  var open = !window.Prefs || Prefs.get("logTotals") !== false;
  var h = '<div class="hf-old log-totals"><button type="button" class="hf-old-h" aria-expanded="' + (open ? 'true' : 'false') + '" onclick="toggleLogTotals()">'
    + (open ? '▾' : '▸') + ' ' + _t("Bilan de la partie") + '</button>';
  if (open) h += buildAchievementTotalsHTML();
  return h + '</div>';
}

/* v3.649.0 (atelier journal.html, option C validée par Seb le 03/11) : une seule carte, une ligne par
   événement ; filtres (Tout, Histoire, Gains, Village, Combat) ; une étape d'Histoire en un bloc (titre,
   récit, gains en pastilles), les livraisons d'un même moment réunies. Lu dans les phrases du jeu,
   traduites comme lui : sans correspondance, la ligne reste telle quelle. */
var logFilter = "tout"; // filtre du Journal (session)
function setLogFilter(f) { logFilter = f; if (typeof renderPanel === "function") renderPanel(); }
window.setLogFilter = setLogFilter;

/* Phrase du jeu -> expression : {x}, {n}… deviennent des groupes, dans l'ordre */
function logTplRe(tpl) {
  var src = tpl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\{(\w+)\\\}/g, "(.+?)");
  return new RegExp("^" + src + "$");
}
var logPatterns = null;
function logPats() {
  if (logPatterns) return logPatterns;
  logPatterns = {
    step: logTplRe("📖 " + _t("Étape terminée : {x}")),
    souvenir: logTplRe("✨ " + _t("{x} : +{n} Aether")),
    xp: logTplRe(_t("+{n} XP héros")), xpLvl: logTplRe(_t("+{n} XP héros ({a} → {b})")),
    reward: logTplRe("🎁 " + _t("Récompense d'histoire : {x}")),
    level: logTplRe(_t("Niveau du héros : {n} ({x})")),
    store: logTplRe(_t("{x} +{n} (Entrepôt)"))
  };
  return logPatterns;
}

/* Catégorie d'une ligne, lue à son icône de tête (le type noté est presque toujours « event ») */
function logCat(t, type) {
  if (/^(⚔️|🗡️|🩸|🦴|🐍|💤|🕷️|💀|🛡️)/.test(t) || type === "danger" || type === "boss") return "combat";
  if (/^(📖|📜|🎁)/.test(t) || logPats().souvenir.test(t)) return "histoire";
  if (/^\+\d/.test(t) || logPats().store.test(t) || logPats().level.test(t)) return "gains";
  return "village";
}

function logIconSplit(t) {
  var m = t.match(/^((?:[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF])\uFE0F?)\s*/);
  return m ? [m[1], t.slice(m[0].length)] : ["·", t];
}
function logRowHTML(t, cls) {
  var s = logIconSplit(t);
  return '<div class="jx-row' + (cls ? ' ' + cls : '') + '"><span class="jx-ico">' + esc(s[0]) + '</span><span class="jx-tx">' + esc(s[1]) + '</span></div>';
}

/* Lignes du Journal (la plus récente d'abord), regroupées : [{ cat, html }] */
function buildLogItems(entries) {
  var P = logPats(), list = entries.map(function (e) { return { text: _td(e.text), type: e.type }; }), out = [], i = 0;
  while (i < list.length) {
    var t = list[i].text, m = t.match(P.step);
    if (m) { // l'étape, ses gains juste après, son récit un peu plus loin
      var title = m[1], gains = [], recit = "", j = i + 1, mm;
      for (; j < list.length; j++) {
        var u = list[j].text;
        if ((mm = u.match(P.souvenir))) gains.push(u.slice(u.lastIndexOf(mm[1]) + mm[1].length).replace(/^\s*:\s*/, ""));
        else if (P.xp.test(u) || P.xpLvl.test(u) || P.level.test(u)) gains.push(u);
        else if ((mm = u.match(P.reward))) gains.push(mm[1]);
        else break;
      }
      var head = "📖 " + title + " — ";
      for (var r = j; r < Math.min(list.length, j + 10); r++) {
        if (list[r].text.indexOf(head) === 0) { recit = list[r].text.slice(head.length); list.splice(r, 1); break; }
      }
      out.push({ cat: "histoire", html: '<div class="jx-row jx-step"><span class="jx-ico">📖</span><span class="jx-tx"><b>' + esc(title) + '</b>'
        + (recit ? '<p>' + esc(recit) + '</p>' : '') + (gains.length ? '<span class="jx-gains">' + gains.map(function (g) { return '<span>' + esc(g) + '</span>'; }).join("") + '</span>' : '') + '</span></div>' });
      i = j; continue;
    }
    if (P.store.test(t)) { // livraisons à l'Entrepôt d'un même moment
      var items = [];
      while (i < list.length && (mm = list[i].text.match(P.store))) { items.push(mm[1] + " +" + mm[2]); i++; }
      out.push({ cat: "gains", html: items.length > 1 ? logRowHTML("📦 " + _t("Entrepôt : {liste}", { liste: items.join(" · ") })) : logRowHTML(t) });
      continue;
    }
    var p = t.match(/^(.*) \(([^)]+)\)(\s*:\s*.*)$/); // même phrase, seul le lieu entre parenthèses change
    if (p) {
      var lieux = [p[2]], k = i + 1;
      while (k < list.length) { var q = list[k].text.match(/^(.*) \(([^)]+)\)(\s*:\s*.*)$/); if (!q || q[1] !== p[1] || q[3] !== p[3]) break; lieux.push(q[2]); k++; }
      if (lieux.length > 1) { out.push({ cat: logCat(t, list[i].type), html: logRowHTML(p[1] + " (" + lieux.join(", ") + ")" + p[3] + " " + _t("chacun")) }); i = k; continue; }
    }
    out.push({ cat: logCat(t, list[i].type), html: logRowHTML(t, /^📖 .+ — /.test(t) ? "is-recit" : "") });
    i++;
  }
  return out;
}

function buildLogHTML() {
  var entries = window.gameLog || [];
  var h = buildLogTotalsHTML() + '<div id="log-container">';

  if (!entries.length) {
    h += '<div style="color:var(--nb-ink-dim);text-align:center;padding:20px;">' + _t("Aucun événement.") + '</div>';
  } else {
    var items = buildLogItems(entries.slice(0, 50));
    var cats = [["tout", _t("Tout")], ["histoire", _t("Histoire", "catégorie")], ["gains", _t("Gains")], ["village", _t("Village")], ["combat", _t("Combat")]];
    if (!cats.some(function (c) { return c[0] === logFilter; })) logFilter = "tout";
    h += '<div class="jx-chips" role="group" aria-label="' + esc(_t("Filtrer le journal")) + '">' + cats.map(function (c) {
      var n = c[0] === "tout" ? items.length : items.filter(function (x) { return x.cat === c[0]; }).length;
      return '<button type="button" class="' + (logFilter === c[0] ? 'is-on' : '') + '" aria-pressed="' + (logFilter === c[0]) + '" onclick="setLogFilter(\'' + c[0] + '\')">' + esc(c[1]) + '<small>' + n + '</small></button>';
    }).join("") + '</div>';
    var shown = items.filter(function (x) { return logFilter === "tout" || x.cat === logFilter; });
    h += '<div class="jx-card kc-sec kc-tex">' + (shown.length ? shown.map(function (x) { return x.html; }).join("")
      : '<div class="jx-row"><span class="jx-tx">' + _t("Aucun événement.") + '</span></div>') + '</div>';
  }

  h += '</div>';
  return '<div class="nb-page-frame nb-page-frame-fill kframe-page" data-kf-banner="journal" data-kf-title="' + esc("images/Icons/codex/codex_lore.webp|" + _t("Journal")) + '">' + h + '</div>';
}

window.buildLogHTML = buildLogHTML;
window.buildLogItems = buildLogItems;
