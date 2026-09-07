/* ============================================================
Aethervale — ui/kframe-decorator.js
v3.190.0 : bascule du cadre principal v2 (assets Cadre_Haut/Milieux/Bas,
texture moussue) SANS toucher aux 17 builders — après chaque rendu de
panel, chaque .nb-page-frame est transformé en structure 3 rangées
(kf-top / kf-mid / kf-bot, voir css/00-kbtn.css et
css/00-kframe-scope.css). Idempotent (marqueur .kframe).
============================================================ */

"use strict";

function decoratePageFrames(root) {
  if (!root || !root.querySelectorAll) return;
  var frames = root.querySelectorAll(".nb-page-frame:not(.kframe)");
  for (var i = 0; i < frames.length; i++) {
    var f = frames[i];
    var mid = document.createElement("div");
    mid.className = "kf-mid";
    while (f.firstChild) mid.appendChild(f.firstChild);
    var top = document.createElement("div");
    top.className = "kf-top";
    var bot = document.createElement("div");
    bot.className = "kf-bot";
    f.appendChild(top);
    f.appendChild(mid);
    f.appendChild(bot);
    f.classList.add("kframe");
  }
}

window.decoratePageFrames = decoratePageFrames;
