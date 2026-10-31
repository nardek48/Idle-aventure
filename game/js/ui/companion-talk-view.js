"use strict";
/* ui/companion-talk-view.js — v3.597.0 (atelier conversations, mise en page B « la scène », choix de Seb) :
   plein écran sur l'image du camp, le compagnon en grand, une réplique à la fois, deux réponses au choix. */

var talkScene = null; // { id, companion, queue, cur, choices } ; quest : scène d'une quête de compagnon (v3.598.0)

function talkRoot() {
  if (typeof document === "undefined" || !document.body) return null;
  var el = document.getElementById("talk-root");
  if (!el) { el = document.createElement("div"); el.id = "talk-root"; document.body.appendChild(el); }
  return el;
}

function openCompanionTalk(id) {
  var t = CompanionTalkManager.get(id);
  if (!t || !CompanionTalkManager.isAvailable(t)) return;
  talkScene = { id: id, companion: t.companion, queue: t.lines.slice(), cur: null, choices: "" };
  talkNext();
}

// v3.598.0 : étape « scène » d'une quête de compagnon, dans la même mise en scène que les conversations.
function openQuestScene(questId) {
  var q = window.CompanionQuestManager ? CompanionQuestManager.get(questId) : null, st = q ? CompanionQuestManager.step(q) : null;
  if (!st || st.type !== "scene") return;
  talkScene = { quest: questId, companion: q.companion, queue: (st.lines || []).slice(), cur: null, choices: "" };
  talkNext();
}

function talkNext() {
  if (!talkScene) return;
  talkScene.cur = talkScene.queue.shift() || { fin: true };
  if (!talkScene.cur.choix && !talkScene.cur.fin) talkScene.last = talkScene.cur; // la réplique reste au-dessus des réponses
  renderTalkScene();
}

function talkChoose(k) {
  var c = talkScene && talkScene.cur && talkScene.cur.choix ? talkScene.cur.choix[k] : null;
  if (!c) return;
  talkScene.choices += String.fromCharCode(97 + k); // « a », « b »
  talkScene.queue = [{ w: "me", t: c.t }].concat(c.suite || [], talkScene.queue);
  talkNext();
}

/* v3.601.0 (atelier sujets-compagnons, M1) : toucher un compagnon ouvre la scène sur la liste des sujets. */
function openCompanionMenu(companionId) {
  if (!getCompanionDef(companionId)) return;
  talkScene = { companion: companionId, menu: true, queue: [], cur: {}, choices: "" };
  renderTalkScene();
}

// Un sujet libre ou le point sur la quête : une suite de répliques, puis « ‹ Autre chose ».
function talkTopic(kind) {
  if (!talkScene) return;
  var cid = talkScene.companion, M = CompanionTalkManager, lines = null, quest = null;
  if (kind === "talk") { var t = M.availableFor(cid); if (t) openCompanionTalk(t.id); return; }
  if (kind === "toi" || kind === "monde") {
    var tp = kind === "toi" ? M.topicToi(cid) : M.topicMonde(cid);
    if (!tp) return;
    M.markHeard(cid, tp.key);
    lines = tp.lines;
  } else if (kind === "quete") {
    quest = companionTalkActiveQuest(cid);
    if (!quest) return;
    var Q = CompanionQuestManager, st = Q.step(quest), s = Q.stateOf(quest.id), pr = Q.progressText(quest);
    lines = [{ w: "n", t: _t("{t} · étape {a} sur {b}", { t: _td(quest.title), a: s.s + 1, b: quest.steps.length }) },
      { w: "n", t: companionQuestStepLabel(st) + (pr ? " (" + pr + ")" : "") }];
  }
  if (!lines) return;
  talkScene = { companion: cid, topic: kind, quest: null, questTopic: quest ? quest.id : null, queue: lines.slice(), cur: null, choices: "" };
  talkNext();
}

function companionTalkActiveQuest(cid) {
  if (!window.CompanionQuestManager) return null;
  return CompanionQuestManager.list().filter(function (q) { return q.companion === cid && CompanionQuestManager.step(q); })[0] || null;
}

// Les lignes du menu : la conversation de l'histoire en tête, puis toi, ce monde, la quête.
function talkMenuTopics(cid) {
  var M = CompanionTalkManager, out = [], talk = M.availableFor(cid), def = getCompanionDef(cid), name = _td(def.name);
  if (talk) out.push({ k: "talk", icon: "images/Icons/camp/campfire.webp", t: _t("{n} veut te parler", { n: name }), s: talk.lines[0] && talk.lines[0].t ? "« " + talk.lines[0].t + " »" : "", hot: true, isNew: true });
  var toi = M.topicToi(cid), monde = M.topicMonde(cid), q = companionTalkActiveQuest(cid);
  if (toi) out.push({ k: "toi", icon: "images/Icons/subtabs/hero_summary.webp", t: _t("Parle-moi de toi"), s: _t("Un souvenir de {n}", { n: name }), isNew: !M.heard(cid, toi.key) });
  if (monde) { var w = WORLDS[M._worldIdx(monde.world)]; out.push({ k: "monde", icon: "images/Icons/codex/world_" + monde.world + ".webp", t: _t("Et ce monde-ci ?"), s: w ? _td(w.name) : "", isNew: !M.heard(cid, monde.key) }); }
  if (q) { var Q = CompanionQuestManager; out.push({ k: "quete", icon: "images/Icons/quests/quest_side.webp", t: _t("Ta quête"), s: _td(q.title) + " · " + (Q.stateOf(q.id).s + 1) + " / " + q.steps.length, seen: true }); }
  return out;
}

// Après le point sur la quête : l'action de l'étape (ferme la scène d'abord).
function talkQuestAction(id) {
  var q = CompanionQuestManager.get(id), st = q ? CompanionQuestManager.step(q) : null;
  closeCompanionTalk(false);
  if (!st) return;
  if (st.type === "scene") openQuestScene(id);
  else if (st.type === "deliver") companionQuestDeliver(id);
  else companionQuestGo(id);
}

// Fermer avant la fin : rien n'est noté, la conversation reste proposée.
function closeCompanionTalk(done) {
  if (done && talkScene && talkScene.quest) CompanionQuestManager.sceneDone(talkScene.quest);
  else if (done && talkScene && talkScene.id) CompanionTalkManager.finish(talkScene.id, talkScene.choices || "-");
  talkScene = null;
  var root = document.getElementById("talk-root");
  if (root) root.innerHTML = "";
  if (typeof renderPanel === "function") renderPanel();
}

function renderTalkScene() {
  var root = talkRoot();
  if (!root || !talkScene) return;
  var t = talkScene.quest ? null : CompanionTalkManager.get(talkScene.id), def = getCompanionDef(talkScene.companion), name = _td(def.name), cur = talkScene.cur;
  var bg = window.ScreenBanner && typeof ScreenBanner.data === "function" ? (ScreenBanner.data("camp") || [])[0] : "";
  var dim = !!cur.w && cur.w !== talkScene.companion; // narrateur, héros ou autre compagnon : le portrait s'efface
  var nameOf = function (w) { var d = w && w !== talkScene.companion && w !== "n" && w !== "me" ? getCompanionDef(w) : null; return d ? _td(d.name) : name; };
  var h = '<div class="talk-scene" role="dialog" aria-modal="true" aria-label="' + esc(_t("Conversation avec {n}", { n: name })) + '"' + (bg ? ' style="background-image:url(\'' + esc(bg) + '\')"' : '') + '>'
    + '<button type="button" class="talk-x" onclick="closeCompanionTalk(false)" aria-label="' + esc(_t("Fermer")) + '">✕</button>'
    + '<img class="talk-por' + (dim ? ' is-dim' : '') + '" src="' + esc(def.image) + '" alt="' + esc(name) + '"><div class="talk-box">';
  if (talkScene.menu) {
    var hello = typeof campSoirTapText === "function" ? String(campSoirTapText(talkScene.companion) || "").replace(/^«\s*|\s*»$/g, "") : "";
    if (hello) h += '<div class="talk-line is-ask"><b>' + esc(name) + '</b><p>' + esc(hello) + '</p></div>';
    h += talkMenuTopics(talkScene.companion).map(function (o) {
      return '<button type="button" class="talk-topic' + (o.hot ? ' is-hot' : '') + '" onclick="talkTopic(\'' + o.k + '\')"><img src="' + esc(o.icon) + '" alt=""><span><b>' + esc(o.t) + '</b>'
        + (o.s ? '<small>' + esc(o.s) + '</small>' : '') + '</span>' + (o.isNew ? '<i class="talk-topic-new" aria-label="' + esc(_t("Nouveau")) + '"></i>' : o.seen ? '' : '<i class="talk-topic-seen">✓</i>') + '</button>';
    }).join("");
    h += '<button type="button" class="talk-topic is-quiet" onclick="closeCompanionTalk(false)"><b>' + esc(_t("Rien, merci")) + '</b></button>';
  } else if (cur.choix) {
    var last = talkScene.last;
    if (last && last.w !== "me") h += '<div class="talk-line is-ask">' + (last.w === "n" ? '' : '<b>' + esc(nameOf(last.w)) + '</b>') + '<p class="' + (last.w === "n" ? "is-n" : "") + '">' + esc(last.t) + '</p></div>';
    h += cur.choix.map(function (c, k) { return '<button type="button" class="talk-choice" onclick="talkChoose(' + k + ')">' + esc(c.t) + '</button>'; }).join("");
  } else if (cur.fin) {
    if (t && t.unlocks && t.unlocks.title) h += '<div class="talk-unlock"><b>' + esc(_t("Quête de {n} débloquée", { n: name })) + '</b><span>' + esc(t.unlocks.title) + '</span></div>';
    if (talkScene.questTopic) {
      var aq = CompanionQuestManager.get(talkScene.questTopic), ast = aq ? CompanionQuestManager.step(aq) : null;
      if (ast && (ast.type !== "deliver" || CompanionQuestManager.canDeliver(aq))) h += '<button type="button" class="talk-next" onclick="talkQuestAction(\'' + esc(aq.id) + '\')">' + esc(ast.type === "scene" ? _t("Écouter") : ast.type === "deliver" ? _t("Donner") : _t("J'y vais")) + '</button>';
    }
    if (talkScene.topic) h += '<button type="button" class="talk-choice talk-back" onclick="openCompanionMenu(\'' + esc(talkScene.companion) + '\')">‹ ' + esc(_t("Autre chose")) + '</button>';
    else h += '<button type="button" class="talk-next" onclick="closeCompanionTalk(true)">' + esc(talkScene.quest ? _t("Continuer") : _t("Retour au feu")) + '</button>';
  } else {
    var who = cur.w === "me" ? _t("Toi") : (cur.w === "n" ? "" : nameOf(cur.w));
    h += '<div class="talk-line" onclick="talkNext()" role="button" tabindex="0">' + (who ? '<b>' + esc(who) + '</b>' : '')
      + '<p class="' + (cur.w === "n" ? "is-n" : "") + '">' + esc(cur.t) + '</p><span class="talk-hint">' + esc(_t("Touche pour continuer")) + ' ▸</span></div>';
  }
  root.innerHTML = h + '</div></div>';
}

/* Dans « Le feu » : une carte par compagnon qui a quelque chose à dire. */
function campTalkCardsHTML() {
  if (!window.CompanionTalkManager) return "";
  return CompanionTalkManager.available().map(function (t) {
    var def = getCompanionDef(t.companion), first = (t.lines || [])[0];
    return '<button type="button" class="camp-card camp-talk" onclick="openCompanionTalk(\'' + esc(t.id) + '\')">'
      + renderIconOrEmojiHTML(def.image, "camp-talk-img", _td(def.name))
      + '<span class="camp-talk-tx"><b>' + esc(_t("{n} veut te parler", { n: _td(def.name) })) + '</b>'
      + (first && first.t ? '<small>« ' + esc(first.t) + ' »</small>' : '') + '</span><span class="camp-talk-go">' + esc(_t("Parler")) + '</span></button>';
  }).join("");
}

if (typeof document !== "undefined") {
  document.addEventListener("keydown", function (e) {
    if (!talkScene) return;
    if (e.key === "Escape") { closeCompanionTalk(false); return; }
    if ((e.key === "Enter" || e.key === " ") && !talkScene.menu && talkScene.cur && !talkScene.cur.choix && !talkScene.cur.fin) { e.preventDefault(); talkNext(); }
  });
}

window.openCompanionTalk = openCompanionTalk;
window.openQuestScene = openQuestScene;
window.openCompanionMenu = openCompanionMenu;
window.talkTopic = talkTopic;
window.talkQuestAction = talkQuestAction;
window.talkNext = talkNext;
window.talkChoose = talkChoose;
window.closeCompanionTalk = closeCompanionTalk;
window.campTalkCardsHTML = campTalkCardsHTML;
