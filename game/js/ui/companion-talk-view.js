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

// Fermer avant la fin : rien n'est noté, la conversation reste proposée.
function closeCompanionTalk(done) {
  if (done && talkScene && talkScene.quest) CompanionQuestManager.sceneDone(talkScene.quest);
  else if (done && talkScene) CompanionTalkManager.finish(talkScene.id, talkScene.choices || "-");
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
  var dim = cur.w === "n" || cur.w === "me";
  var h = '<div class="talk-scene" role="dialog" aria-modal="true" aria-label="' + esc(_t("Conversation avec {n}", { n: name })) + '"' + (bg ? ' style="background-image:url(\'' + esc(bg) + '\')"' : '') + '>'
    + '<button type="button" class="talk-x" onclick="closeCompanionTalk(false)" aria-label="' + esc(_t("Fermer")) + '">✕</button>'
    + '<img class="talk-por' + (dim ? ' is-dim' : '') + '" src="' + esc(def.image) + '" alt="' + esc(name) + '"><div class="talk-box">';
  if (cur.choix) {
    var last = talkScene.last;
    if (last && last.w !== "me") h += '<div class="talk-line is-ask">' + (last.w === "n" ? '' : '<b>' + esc(name) + '</b>') + '<p class="' + (last.w === "n" ? "is-n" : "") + '">' + esc(last.t) + '</p></div>';
    h += cur.choix.map(function (c, k) { return '<button type="button" class="talk-choice" onclick="talkChoose(' + k + ')">' + esc(c.t) + '</button>'; }).join("");
  } else if (cur.fin) {
    if (t && t.unlocks && t.unlocks.title) h += '<div class="talk-unlock"><b>' + esc(_t("Quête de {n} débloquée", { n: name })) + '</b><span>' + esc(t.unlocks.title) + '</span></div>';
    h += '<button type="button" class="talk-next" onclick="closeCompanionTalk(true)">' + esc(talkScene.quest ? _t("Continuer") : _t("Retour au feu")) + '</button>';
  } else {
    var who = cur.w === "me" ? _t("Toi") : (cur.w === "n" ? "" : name);
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
    if ((e.key === "Enter" || e.key === " ") && talkScene.cur && !talkScene.cur.choix && !talkScene.cur.fin) { e.preventDefault(); talkNext(); }
  });
}

window.openCompanionTalk = openCompanionTalk;
window.openQuestScene = openQuestScene;
window.talkNext = talkNext;
window.talkChoose = talkChoose;
window.closeCompanionTalk = closeCompanionTalk;
window.campTalkCardsHTML = campTalkCardsHTML;
