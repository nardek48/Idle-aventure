"use strict";
/* ui/screen-banner.js — v3.581.0 : bandeaux illustrés des écrans Camp, Quêtes, Village et Héros
   (ateliers bandeau-camp, bandeaux-mondes et bandeaux-jeu validés par Seb).
   - Camp et Quêtes suivent le monde où vit le héros (WorldManager.worldIndex) : le camp de
     l'expédition et son tableau des missions changent de décor à chaque monde.
   - Village et Héros restent à Aeswyn et grandissent avec le monde le plus loin atteint
     (revenir en Forêt ne fait pas reculer le village).
   Le décorateur (ui/kframe-decorator.js) pose le bandeau en tête de la zone de défilement,
   à la place du titre ; il se replie en défilant (sticky, haut négatif) et ne garde que le titre. */

var SCREEN_BANNER_WORLDS = ["forest", "desert", "ruins", "crypt", "mountain", "tower"];

// Nom et phrase du camp, monde par monde (décision Seb) ; textes littéraux pour l'audit i18n
function screenBannerCamp(i) {
  return [
    [_t("Campement d'Aeswyn"), _t("Un refuge au cœur de la forêt")],
    [_t("Camp de l'oasis"), _t("Un peu d'ombre au bord des dunes")],
    [_t("Camp des colonnes"), _t("Des tentes entre les pierres d'autrefois")],
    [_t("Camp de la veille"), _t("On ne dort que d'un œil, ici")],
    [_t("Camp des cendres"), _t("Accroché aux pentes du volcan")],
    [_t("Le dernier camp"), _t("Un dernier feu avant la Tour")]
  ][i];
}

var ScreenBanner = {
  MIN_PHONE: 44, MIN_WIDE: 56, // hauteur gardée une fois replié (ligne de titre)
  PHONE_H: 150,

  clampWorld: function (i) {
    return Math.max(0, Math.min(SCREEN_BANNER_WORLDS.length - 1, Number(i) || 0));
  },

  /* Monde où vit le héros */
  residenceWorld: function () {
    return this.clampWorld(window.WorldManager ? WorldManager.worldIndex : 0);
  },

  /* Monde le plus loin atteint (même lecture que la Boutique d'équipement) */
  furthestWorld: function () {
    var max = this.residenceWorld();
    var seen = (typeof game !== "undefined" && game.worldsEverReached) || null;
    if (seen && typeof seen === "object") {
      Object.keys(seen).forEach(function (k) { if (seen[k] && Number(k) > max) max = Number(k); });
    }
    return this.clampWorld(max);
  },

  /* Nom du camp du monde courant : aussi repris par le bandeau du haut (ui/hud-view.js) */
  campName: function () {
    return screenBannerCamp(this.residenceWorld())[0];
  },

  /* [image, titre, phrase] d'un écran, ou null s'il n'a pas de bandeau */
  data: function (screen) {
    var w = this.residenceWorld(), far = this.furthestWorld();
    if (screen === "camp") { var c = screenBannerCamp(w); return ["images/Banners/camp_" + SCREEN_BANNER_WORLDS[w] + ".webp", c[0], c[1]]; }
    if (screen === "quetes") {
      var wn = window.WORLDS && WORLDS[w] ? _td(WORLDS[w].name) : "";
      return ["images/Banners/quetes_" + SCREEN_BANNER_WORLDS[w] + ".webp", _t("Le tableau des missions"), wn];
    }
    if (screen === "village") return ["images/Banners/village_" + (far + 1) + ".webp", _t("Le village d'Aeswyn"), _t("Rebâti planche après planche")];
    if (screen === "heros") return ["images/Banners/heros_" + (far + 1) + ".webp", _t("Le terrain d'entraînement"), _t("Se préparer avant de repartir")];
    // v3.583.0 : pages du menu, une image chacune
    if (screen === "bibliotheque") return ["images/Banners/bibliotheque.webp", _t("La bibliothèque"), _t("Bêtes et savoirs du voyage")];
    if (screen === "journal") return ["images/Banners/journal.webp", _t("Le journal"), _t("La chronique du voyage")];
    if (screen === "hauts_faits") return ["images/Banners/hauts_faits.webp", _t("Les hauts faits"), _t("Le mur des trophées")];
    return null;
  },

  /* Élément du bandeau (le titre de l'écran reste lu par les lecteurs d'écran via aria-label) */
  build: function (screen) {
    var d = this.data(screen);
    if (!d) return null;
    var el = document.createElement("div");
    el.className = "kfb";
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", d[1] + ". " + d[2]);
    el.style.backgroundImage = "url('" + d[0] + "')";
    var tx = document.createElement("div");
    tx.className = "kfb-tx";
    var t = document.createElement("span");
    t.className = "kfb-t"; t.textContent = d[1];
    var s = document.createElement("span");
    s.className = "kfb-s"; s.textContent = d[2];
    tx.appendChild(t); tx.appendChild(s);
    el.appendChild(tx);
    // v3.594.0 (atelier camp-carte, option M3 de Seb) : le bandeau du Camp ouvre la carte du monde
    if (screen === "camp" && (typeof isTabUnlocked !== "function" || isTabUnlocked("map"))) {
      el.classList.add("kfb-go");
      el.setAttribute("role", "button"); el.setAttribute("tabindex", "0");
      el.setAttribute("aria-label", d[1] + ". " + _t("Ouvrir la carte du monde"));
      el.onclick = function () { if (typeof switchTab === "function") switchTab("map"); };
      el.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.onclick(); } };
      var go = document.createElement("span");
      go.className = "kfb-gochip"; go.textContent = _t("Carte du monde") + " ›";
      el.appendChild(go);
    }
    return el;
  },

  /* Pose le bandeau en tête de la zone de défilement et branche le repli */
  attach: function (el, scroller) {
    if (!el || !scroller) return;
    scroller.insertBefore(el, scroller.firstChild);
    this.fit(el);
    var self = this, queued = false;
    scroller.addEventListener("scroll", function () {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(function () { queued = false; self.mini(el, scroller); });
    }, { passive: true });
    this.mini(el, scroller);
  },

  /* Hauteur : 150 px sur téléphone, image entière (3:1) en grand écran ; le haut négatif replie */
  fit: function (el) {
    var wide = document.documentElement.classList.contains("wide-mode");
    var h = wide ? Math.round(el.getBoundingClientRect().width / 3) : this.PHONE_H;
    if (!(h > 0)) h = this.PHONE_H;
    var min = wide ? this.MIN_WIDE : this.MIN_PHONE;
    el.style.height = h + "px";
    el.style.top = (min - h) + "px";
    el.dataset.fold = String(h - min);
  },

  /* Replié : la phrase s'efface, seul le titre reste */
  mini: function (el, scroller) {
    var fold = Number(el.dataset.fold) || 0;
    el.classList.toggle("is-mini", scroller.scrollTop >= fold - 4);
  },

  /* Changement de format (rotation, passage PC / téléphone) : recalcul des bandeaux visibles */
  refitAll: function () {
    var list = document.querySelectorAll(".kfb");
    for (var i = 0; i < list.length; i++) ScreenBanner.fit(list[i]);
  }
};

if (typeof window.addEventListener === "function") window.addEventListener("resize", function () { ScreenBanner.refitAll(); }); // absent des harnais

window.ScreenBanner = ScreenBanner;
window.screenBannerCamp = screenBannerCamp;
