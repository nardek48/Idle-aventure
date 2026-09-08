/* ============================================================
Aethervale — ui/kframe-decorator.js
v3.190.0 : bascule du cadre principal v2 (assets Cadre_Haut/Milieux/Bas,
texture moussue) SANS toucher aux 17 builders — après chaque rendu de
panel, chaque .nb-page-frame est transformé en structure 3 rangées
(kf-top / kf-mid / kf-bot, voir css/00-kbtn.css et
css/00-kframe-scope.css). Idempotent (marqueur .kframe).
v3.193.0/193.1 : MODE PAGE (proposition Seb) — les frames marqués
.kframe-page : titre injecté depuis data-kf-title, kf-bot flottant, et
surtout kf-top EXTRAIT du flux scrollable (structure de la sonde ; la
v3.193.0 en sticky laissait le contenu remonter dans les bandes
latérales — retour iPhone de Seb). Deux stratégies selon la page, voir
les commentaires dans la fonction. Les frames non marqués gardent le
comportement 3 rangées classique.
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
    var isPage = f.classList.contains("kframe-page");
    var title = f.getAttribute("data-kf-title");
    if (title && isPage) {
      var span = document.createElement("span");
      span.className = "kf-title";
      span.textContent = title;
      top.appendChild(span);
    }
    var bot = document.createElement("div");
    bot.className = "kf-bot";
    if (isPage) {
      // v3.193.1 : le bandeau SORT du flux scrollable (structure de la sonde —
      // le sticky de v3.193.0 laissait le contenu remonter dans les bandes
      // latérales, constaté par Seb sur iPhone).
      var holder = document.createElement("div");
      holder.className = "kfp-top-holder";
      holder.appendChild(top);
      var subtabContent = f.closest ? f.closest(".subtab-page-content") : null;
      if (subtabContent && subtabContent.parentNode) {
        // page à sous-onglets : le porte-bandeau se place AU-DESSUS de la zone
        // scrollable existante, symétrique de la barre de sous-onglets du bas.
        holder.classList.add("is-subtab");
        subtabContent.parentNode.insertBefore(holder, subtabContent);
      } else if (f.parentNode) {
        // page simple : le scroll vit dans #panel-container (02-layout, fichier
        // RESYNC intouché) — on enveloppe la page dans une colonne pleine
        // hauteur avec une zone de scroll INTERNE ; le panel ne déborde plus,
        // son propre scroll reste inerte.
        var wrap = document.createElement("div");
        wrap.className = "kfp-wrap";
        var zone = document.createElement("div");
        zone.className = "kfp-scrollzone";
        f.parentNode.insertBefore(wrap, f);
        wrap.appendChild(holder);
        wrap.appendChild(zone);
        zone.appendChild(f);
      }
      f.appendChild(mid);
      f.appendChild(bot);
    } else {
      f.appendChild(top);
      f.appendChild(mid);
      f.appendChild(bot);
    }
    f.classList.add("kframe");
  }
}

window.decoratePageFrames = decoratePageFrames;
