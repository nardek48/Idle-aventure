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

/* v3.624.0 (atelier aeswyn-habitants, A) : Aeswyn se repeuple. 9 habitants (trois familles), +1 par niveau de
   bâtiment (Terrain : +1 tous les 2), +6 par monde atteint après la Forêt. Calculé, rien n'est sauvegardé. */
var AESWYN_TIERS = [9, 15, 25, 40, 55, 70, 85, 100];
function aeswynTierText(i) {
  return [
    _t("Trois familles autour du feu. Le reste est encore de la cendre."),
    _t("Un toit de plus, cette saison. Quelqu'un est revenu des bois."),
    _t("On se dispute pour le puits, le matin. Brannoc dit que c'est bon signe."),
    _t("Des enfants courent entre les maisons. Personne ne les gronde."),
    _t("Des gens arrivent par la route, avec leurs sacs. Ils demandent s'il reste de la place."),
    _t("Le marché tient tout seul, le matin. Sarkel s'en plaint."),
    _t("Il faut des noms pour les rues, maintenant. Wenna en a déjà une liste."),
    _t("On ne connaît plus tout le monde. Orwen regarde la place pleine, et ne dit rien.")
  ][i];
}
function aeswynPopulation() {
  var n = 9, VB = window.VillageBuildingManager;
  if (VB && window.VILLAGE_BUILDINGS) Object.keys(VILLAGE_BUILDINGS).forEach(function (id) {
    var lv = Math.max(0, Number(VB.getLevel(id)) || 0);
    n += id === "training" ? Math.floor(lv / 2) : lv;
  });
  return n + 6 * ScreenBanner.furthestWorld();
}
function aeswynTier(n) { var t = 0; AESWYN_TIERS.forEach(function (x, i) { if (n >= x) t = i; }); return t; }
function aeswynExplain() {
  if (typeof showToast === "function") showToast(_t("Chaque niveau de bâtiment ramène quelqu'un au village. Chaque monde ouvert aussi : on apprend qu'Aeswyn tient encore."), 4200);
}

var ScreenBanner = {
  MIN_PHONE: 44, MIN_WIDE: 56, // hauteur gardée une fois replié (ligne de titre)
  PHONE_H: 150,
  PHONE_H_SHORT: 104, SHORT_MAX_H: 600, // v3.702.0 (UI-10, A) : écran de moins de 600 px de haut, bandeau sans la phrase

  /* Hauteur du bandeau sur téléphone : 104 px sous 600 px de haut (hors mode PC), 150 sinon */
  phoneH: function () {
    var vh = (typeof window !== "undefined" && window.innerHeight) || 0;
    return vh > 0 && vh < this.SHORT_MAX_H && !document.documentElement.classList.contains("pc-mode") ? this.PHONE_H_SHORT : this.PHONE_H;
  },

  /* UI-10 (C restreinte, Seb 05/11) : texte Grande sur téléphone de moins de 600 px de haut, pas de bandeau
     (« Accepter » du Camp restait sous la barre du bas) ; partout ailleurs, rien ne change. */
  isOff: function () {
    var de = document.documentElement;
    return de.classList.contains("text-big") && !de.classList.contains("wide-mode") && this.phoneH() === this.PHONE_H_SHORT;
  },

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
    if (screen === "village") return ["images/Banners/village_" + (far + 1) + ".webp", _t("Le village d'Aeswyn"), ((window.TowerSystem && TowerSystem.bannerLine()) || aeswynTierText(aeswynTier(aeswynPopulation())))]; // v3.624.0 : la phrase du palier ; v3.631.0 : celle de la fin
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
    el.setAttribute("data-src", d[0]);
    var z = (window.DesktopScale && DesktopScale.zoom) || 1; // premier choix sans mise en page ; fit() l'affine
    this.setImage(el, !document.documentElement.classList.contains("wide-mode") && this.phoneH() * 3 * z * (window.devicePixelRatio || 1) <= this.PHONE_IMG_W);
    var tx = document.createElement("div");
    tx.className = "kfb-tx";
    var t = document.createElement("span");
    t.className = "kfb-t"; t.textContent = d[1];
    var s = document.createElement("span");
    s.className = "kfb-s"; s.textContent = d[2];
    tx.appendChild(t); tx.appendChild(s);
    el.appendChild(tx);
    if (screen === "camp" && window.WorldDays) this.dayPill(el); // v3.602.0 (atelier jours-du-monde, B)
    if (screen === "village") this.popPill(el); // v3.624.0 (atelier aeswyn-habitants, A)
    return el;
  },

  /* Le jour du monde et les sorties avant la nuit, en bas à droite du bandeau du Camp (visible replié). */
  dayPill: function (el) {
    var W = WorldDays, left = W.left(), done = WORLD_DAY_SORTIES - left, p = document.createElement("div"), moons = "";
    for (var i = 0; i < WORLD_DAY_SORTIES; i++) moons += '<i class="' + (i < done ? "is-on" : "") + '"></i>';
    p.className = "kfb-day";
    var mo = typeof W.moment === "function" ? W.moment() : "soir"; // v3.655.0 (C3) : ☀ le matin et en journée
    p.innerHTML = '<b>' + (mo === "matin" || mo === "jour" ? "☀" : "☾") + ' ' + esc(_t("Jour {n}", { n: W.day() })) + '</b><span class="kfb-moons" title="' + esc(_tn(left, "{n} sortie avant la nuit", "{n} sorties avant la nuit")) + '">' + moons + '</span>';
    el.appendChild(p);
    if (window.FeastManager && FeastManager.left() > 0) { // v3.656.0 : le festin, tant qu'il dure
      var f = document.createElement("div");
      f.className = "kfb-feast";
      f.innerHTML = renderIconOrEmojiHTML(FEAST_ICON, "kfb-feast-ico", "") + esc(_t("Festin · {n}", { n: FeastManager.left() }));
      el.appendChild(f);
    }
    if (W.isDark()) el.classList.add("is-night");
    else el.classList.add("is-" + mo); // v3.655.0 (C3) : teinte du matin, du jour, du soir
  },

  /* Les habitants d'Aeswyn, en haut à droite du bandeau du Village ; toucher dit d'où ils viennent. */
  popPill: function (el) {
    var n = aeswynPopulation(), b = document.createElement("button");
    b.type = "button"; b.className = "kfb-pop";
    b.setAttribute("onclick", "aeswynExplain()");
    b.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 1 7.6h2v6.9h4v-4h2v4h4V7.6h2z"/></svg>' + esc(_tn(n, "{n} habitant", "{n} habitants"));
    el.removeAttribute("role"); // un bouton dans le bandeau : plus une simple image
    el.appendChild(b);
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

  /* Hauteur : 150 px sur téléphone (104 sur petit écran), image entière (3:1) en grand écran ; le haut négatif replie */
  fit: function (el) {
    var wide = document.documentElement.classList.contains("wide-mode"), off = this.isOff();
    el.classList.toggle("is-off", off); // caché (css/07-responsive.css) : rien à replier, onglets collés en haut
    if (off) { el.classList.remove("is-mini", "is-short"); el.dataset.fold = "0"; return; }
    var h = wide ? Math.round(el.getBoundingClientRect().width / 3) : this.phoneH();
    if (!(h > 0)) h = this.PHONE_H;
    el.classList.toggle("is-short", !wide && h === this.PHONE_H_SHORT); // phrase masquée (css/07-responsive.css)
    var min = wide ? this.MIN_WIDE : this.MIN_PHONE;
    el.style.height = h + "px";
    el.style.top = (min - h) + "px";
    el.dataset.fold = String(h - min);
    var b = el.getBoundingClientRect(); // image en cover (3:1) : largeur utile = max(largeur, 3 × hauteur), zoom compris
    if (b.width > 0) this.setImage(el, Math.max(b.width, b.height * 3) * (window.devicePixelRatio || 1) <= this.PHONE_IMG_W);
  },

  /* PERF-10 : variante de 1 350 px (Banners/phone/) quand l'écran n'affiche pas plus ; l'image entière sinon */
  PHONE_IMG_W: 1350,
  setImage: function (el, phone) {
    var src = el.getAttribute("data-src") || "", url = phone ? src.replace("images/Banners/", "images/Banners/phone/") : src;
    if (el.getAttribute("data-img") === url) return;
    el.setAttribute("data-img", url);
    el.style.backgroundImage = "url('" + url + "')";
  },

  /* Replié : la phrase s'efface, seul le titre reste */
  mini: function (el, scroller) {
    var fold = Number(el.dataset.fold) || 0;
    el.classList.toggle("is-mini", !el.classList.contains("is-off") && scroller.scrollTop >= fold - 4);
  },

  /* Changement de format (rotation, passage PC / téléphone) : recalcul des bandeaux visibles */
  refitAll: function () {
    var list = document.querySelectorAll(".kfb");
    for (var i = 0; i < list.length; i++) ScreenBanner.fit(list[i]);
  }
};

if (typeof window.addEventListener === "function") window.addEventListener("resize", function () { ScreenBanner.refitAll(); }); // absent des harnais

window.aeswynPopulation = aeswynPopulation;
window.aeswynTier = aeswynTier;
window.aeswynExplain = aeswynExplain;
window.ScreenBanner = ScreenBanner;
window.screenBannerCamp = screenBannerCamp;
