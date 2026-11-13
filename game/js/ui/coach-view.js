"use strict";
/* ui/coach-view.js — v3.761.0 : tutoriels SUR L'ÉCRAN (atelier tutoriels-ecran.html, Seb 10/11 : bulle A, « Suivant » ou toucher).
   L'écran s'assombrit, l'élément réel est éclairé, une bulle par étape. Rendu dans #tutorial-modal-root (le combat attend).
   Repli sur la fenêtre classique si moins de deux étapes trouvent leur élément, ou en format large. */

/* Étapes par tutoriel (id d'étape d'Histoire ou de tutoriel générique). sel : sélecteur CSS (le premier élément visible) ;
   prepare : geste fait avant de mesurer (onglet à montrer). Textes tirés des tutoriels d'origine, raccourcis. */
var COACH_TUTORIALS = {
  camp_welcome: {
    steps: [
      { sel: ".camp-mission-card.is-main", title: _t("Ton Histoire"), text: _t("L'étape d'Histoire en cours est toujours en tête. Touche « Accepter », puis « Partir ».") },
      { sel: ".hud-band", title: _t("Ta santé"), text: _t("Hors combat et hors sortie, tu récupères 5 % de tes PV max par minute, même hors ligne.") },
      { sel: ".camp-tabs button:first-child", title: _t("Le feu"), text: _t("Santé, repas et compagnons. Le repas remet toute l'équipe à plein, payé en blé, viande et eau.") },
      { sel: "#hud-dock .hud-bub", title: _t("Le fil rouge"), text: _t("Il propose ta prochaine action. Touche-le quand tu ne sais pas quoi faire.") }
    ]
  },
  forest_02: {
    steps: [
      { sel: ".cbx-attack", title: _t("Attaquer"), text: _t("Ton attaque de base : elle ne coûte rien. Toujours disponible.") },
      { sel: ".cbx-skills .cbx-skill:not(:last-child)", all: true, title: _t("Compétences"), text: _t("Plus fortes, elles coûtent ta ressource de classe (le chiffre sous chacune). Grisées tant que tu n'en as pas assez.") },
      { sel: ".cbx-res", title: _t("Ta ressource"), text: _t("Rage, Concentration ou Mana selon ta classe : c'est elle que dépensent tes compétences.") },
      { sel: ".cbx-skills .cbx-skill:last-child", title: _t("La Défense"), text: _t("Garde, Esquive ou Barrière selon ta classe : elle réduit le prochain coup. Garde-la pour quand l'ennemi annonce une attaque forte.") },
      { sel: ".cbx-chips", title: _t("Ce que prépare l'ennemi"), text: _t("Sous sa vie s'affichent ses annonces. Quand une attaque forte s'annonce, c'est le moment de la Défense.") },
      { sel: ".cbx-cel", title: _t("La célérité"), text: _t("Cette fine jauge se remplit quand tu frappes. Pleine, tu frappes deux fois d'affilée.") }
    ]
  },
  village_production: {
    prepare: function () { if (typeof setVillageSubTab === "function") setVillageSubTab("production"); },
    steps: [
      { sel: ".prod-tile", title: _t("Les bâtiments"), text: _t("Chacun produit une ressource en continu, même quand tu ne joues pas. Touche-le pour ses ateliers et ses zones.") },
      { sel: ".prod-tile .prod-tile-gauge", title: _t("Le stock du bâtiment"), text: _t("Ce qu'il a produit, et sa limite. Plein, il s'arrête : pense à récolter.") },
      { sel: ".prod-tile .prod-tile-meta", title: _t("Ton Entrepôt"), text: _t("Ce que tu as en réserve, et son plafond. Une ressource pleine ne se produit plus.") },
      { sel: ".prod-tile .prod-tile-rib.is-up", title: _t("Une zone à monter"), text: _t("Ce badge dit qu'une zone peut monter : plus de production et plus de stock.") },
      { sel: ".village-tabs .village-tab:nth-child(3)", title: _t("Les Ateliers"), text: _t("Ils transforment le brut en objets utiles : viande et eau deviennent des rations.") }
    ]
  },
  forest_brume: {
    steps: [
      { sel: ".lm-node.is-village", title: _t("Aeswyn, le foyer"), text: _t("La carte est découpée en secteurs autour d'Aeswyn.") },
      { sel: ".lm-node.is-voile", title: _t("Un secteur à libérer"), text: _t("Termine sa Petite Aventure, ou bats l'élite qui le garde. Seuls ceux qui touchent le foyer ou un secteur libéré sont atteignables.") },
      { sel: ".lm-node.is-libere", title: _t("Un secteur libéré"), text: _t("Il donne souvent un effet. Rejoué et raté, la brume le reprend : c'est le Recouvrement. Une première tentative ratée ne coûte rien.") },
      { sel: "#lmx-legend-btn", title: _t("Le « ? »"), text: _t("Il rappelle ce que veut dire chaque pastille de la carte.") }
    ]
  },
  pa2_prep: {
    steps: [
      { sel: "#pa2-bag", title: _t("Ta besace"), text: _t("« Ajouter des objets » : rations ou objets. Chacun a un avantage (en vert) et souvent un prix (en rouge). Les rations non mangées retournent à l'Entrepôt.") },
      { sel: ".pa2-prep .pa2-heroline", title: _t("Tes PV"), text: _t("Tu pars avec tes PV actuels. En route, seuls te soignent les rations, les sources, le repos, les autels et quelques reliques.") },
      { sel: ".pa2-prep .pa2-list", title: _t("Les pactes"), text: _t("Facultatifs : chacun rend la nuit plus dure et le retour plus riche. Prends-les quand tu t'en sens capable.") },
      { sel: ".pa2-prep .pa2-link", title: _t("Renoncer", "tuto"), text: _t("Tant que tu n'es pas parti, tu reviens sans rien perdre.") }
    ]
  },
  forest_12: {
    steps: [
      { sel: ".grimoire-head", title: _t("Tactique ou Grimoire"), text: _t("Tactique : tu joues chaque round. Grimoire : tes règles décident. Le mode se choisit au départ de chaque sortie, ou au Campement.") },
      { sel: ".grimoire-rule-row.is-empty", title: _t("Une règle"), text: _t("Si une condition, alors une action : « si une charge est annoncée → Défense ». Touche un emplacement pour créer une règle.") },
      { sel: ".grimoire-rule-row.is-locked", title: _t("D'autres emplacements"), text: _t("Tu commences avec 2 règles ; d'autres s'ouvrent en avançant dans l'Histoire.") }
    ]
  },
  /* v3.781.0 (chantier des tutoriels sur l'écran, lot 1, Seb 13/11) : écrans de la Forêt et préparation de sortie. */
  forest_03: {
    prepare: function () { if (typeof openHerosSheet === "function") openHerosSheet("stats"); },
    steps: [
      { sel: ".pc-stat-card:has(.pc-stat-card-main)", title: _t("Ta caractéristique principale"), text: _t("Marquée « Principale », elle fait l'essentiel de tes dégâts : Force pour le Chevalier, Célérité pour le Rôdeur, Volonté pour le Mage.") },
      { sel: ".pc-stat-card-buy", title: _t("Acheter un niveau"), text: _t("Chaque niveau monte la caractéristique pour toujours, contre de l'or. Le prix grimpe à chaque achat : étale tes achats.") },
      { sel: ".pc-stat-list-v2", title: _t("Ce que fait chacune"), text: _t("Force : dégâts de l'attaque. Endurance : PV et un peu de défense. Célérité : la frappe bonus. Précision : chance de critique. Volonté : dégâts des critiques.") }
    ]
  },
  forest_04: {
    steps: [
      { sel: ".nb-purchase-card", title: _t("Les potions de soin"), text: _t("La mineure rend 35 % de tes PV, la majeure 60 %. Elles se boivent en combat, à la place de ton action.") },
      { sel: ".nb-purchase-card .btn-buy", title: _t("Acheter"), text: _t("Touche le prix pour en acheter une. Ton stock s'affiche sous chaque potion.") },
      { sel: ".nb-purchase-card .nb-purchase-meta", title: _t("Deux par sortie"), text: _t("Au plus 2 potions par sortie : garde-les pour la fin du combat.") }
    ]
  },
  forest_08: {
    prepare: function () { if (typeof setVillageSubTab === "function") setVillageSubTab("shops"); },
    steps: [
      { sel: ".village-tabs .village-tab:nth-child(3)", title: _t("Les Ateliers"), text: _t("Le sentier obstrué consomme une Petite ration : la source t'en a donné une. Les suivantes se fabriquent ici.") },
      { sel: ".wk-tile", title: _t("La Cuisine de camp"), text: _t("L'atelier de la Chasse. Touche-le pour choisir la recette Petite ration et la fabriquer.") },
      { sel: ".wk-tile .wk-tile-recipe", title: _t("La recette"), text: _t("8 Viande et 4 Eau donnent une Petite ration. En stock, « La veine instable » la prendra toute seule.") }
    ]
  },
  forest_13: {
    steps: [
      { sel: ".dungeon-tier-card.is-tappable", title: _t("La Tanière du Basilic"), text: _t("15 vagues d'ennemis puis un boss, d'une traite. Tu y entres avec tes PV du moment. Touche-la pour entrer.") },
      { sel: ".dungeon-tier-card.is-tappable .dungeon-tier-runs", title: _t("Tes sorties"), text: _t("Trois par jour et par donjon. Pour cette étape, l'entrée est offerte : passe 5 vagues.") },
      { sel: ".dungeon-tier-card.is-tappable .dungeon-tier-image", title: _t("En route"), text: _t("Des haltes : choisis une carte (un bonus, un échange, un coffre) ou passe. Le donjon fini, chaque niveau battu ouvre le suivant, plus dur et plus riche.") }
    ]
  },
  forest_wenna: {
    prepare: function () { if (typeof setHerosSubTab === "function") setHerosSubTab("companions"); },
    steps: [
      { sel: ".hs-comp", title: _t("Wenna"), text: _t("Un compagnon joue une action par round, à sa place dans l'ordre des tours. Wenna est un Soutien : elle soigne l'allié le plus bas en PV.") },
      { sel: ".hs-comp .hs-comp-hp", title: _t("Ses PV"), text: _t("Tombée à 0 PV, elle est hors combat jusqu'à la fin, et revient affaiblie au combat suivant.") },
      { sel: ".hs-comp .cp-seg", title: _t("Avec toi ou au camp"), text: _t("Deux compagnons au plus t'accompagnent. En Grimoire, ils jouent seuls ; en Tactique, tu choisis leurs actions.") },
      { sel: ".hs-comp .hs-comp-head", title: _t("Sa fiche"), text: _t("Ni équipement ni talents : elle s'améliore contre de l'or. Touche sa carte.") }
    ]
  },
  forest_15: {
    steps: [
      { sel: ".camp-embers-item", title: _t("La Sève d'Aeswyn"), text: _t("Elle se trouve en Petite Aventure, sur la carte de la Forêt : parfois en route, surtout en atteignant une destination.") },
      { sel: ".camp-embers-item:nth-child(2)", title: _t("La Ration moyenne"), text: _t("À la Cuisine de camp (Chasse) : 15 Viandes et 1 Pain. Le Pain vient de la Boulangerie du Champs, ouvert par « La Terre en Friche » (Quêtes › Annexes).") },
      { sel: ".camp-embers-btn", title: _t("L'offrande"), text: _t("Quand tout est réuni, touche ce bouton pour l'offrir aux braises.") }
    ]
  },
  sortie_prep: {
    steps: [
      { sel: ".sortie-prep .sp-sec", title: _t("Ce que tu vas affronter"), text: _t("Il dit si une règle ou un objet répond aux traits déjà connus de l'adversaire.") },
      { sel: ".sortie-prep .sp-team", title: _t("Ton équipe"), text: _t("Touche un compagnon pour l'emmener ou le laisser. Deux au plus partent avec toi.") },
      { sel: ".sortie-prep .sp-fold", title: _t("Réglages"), text: _t("Règles, objets et potions à boire avant de partir, une de chaque. « Comme la dernière fois » reprend tes choix.") },
      { sel: ".sortie-prep .sp-foot", title: _t("Partir ou renoncer"), text: _t("« Renoncer » ne lance rien. Après « Partir », le mode de combat reste figé jusqu'au retour, et tes PV ne remontent pas d'eux-mêmes.") }
    ]
  },
  forest_11: {
    steps: [
      { sel: ".hst-bar", title: _t("Tes points"), text: _t("Chaque niveau donne un point de talent. Chaque acte fixe combien tu peux en placer : le surplus attend en réserve.") },
      { sel: ".hst-trunk", title: _t("Le tronc"), text: _t("Ton arbre est propre à ta classe. On commence par le tronc.") },
      { sel: ".hst-paths .hst-banner", all: true, title: _t("Deux voies"), text: _t("Elles changent ta façon de combattre. Au bout de chacune, une clé de voûte : tu n'en choisiras qu'une.") },
      { sel: ".hst-bar-reset", title: _t("Recommencer"), text: _t("La réinitialisation est gratuite, hors d'une sortie en cours. Essaie, compare, recommence.") }
    ]
  }
};

if (typeof window.COACH_OFF === "undefined") window.COACH_OFF = false; // outillage : vrai = fenêtre classique (posé avant le chargement)
var COACH_SETTLE_MS = 450; // l'écran pose ses derniers éléments (carte du héros, annonces) avant la mesure
var COACH_RETRIES = 7;      // éléments manquants ou couverts : remesure toutes les 300 ms (2,1 s de plus au plus)

var CoachTutorial = {
  host: null, key: null, steps: null, i: 0, closeJs: null, _token: null,

  /* Rectangle (écran) d'un élément visible, ou null. all : union de tous les éléments trouvés. */
  _rect: function (st) {
    var els = [].slice.call(document.querySelectorAll(st.sel)).filter(function (el) {
      var b = el.getBoundingClientRect(), cs = window.getComputedStyle ? getComputedStyle(el) : null;
      return b.width > 4 && b.height > 2 && (!cs || (cs.visibility !== "hidden" && cs.display !== "none"));
    });
    if (!els.length) return null;
    if (!st.all) {                                       // le premier élément à l'écran (carte plus large que le téléphone), sinon le premier
      var self = this, vis = els.filter(function (el) { var b = el.getBoundingClientRect(); return self._onScreen({ l: b.left, t: b.top, r: b.right, b: b.bottom }); });
      els = (vis.length ? vis : els).slice(0, 1);
    }
    var r = null;
    els.forEach(function (el) {
      var b = el.getBoundingClientRect();
      r = r ? { l: Math.min(r.l, b.left), t: Math.min(r.t, b.top), r: Math.max(r.r, b.right), b: Math.max(r.b, b.bottom) } : { l: b.left, t: b.top, r: b.right, b: b.bottom };
    });
    return r;
  },

  /* L'élément est-il au premier plan à son centre ? (une fenêtre posée dessus le cache : étape sautée) */
  _onTop: function (st) {
    if (!document.elementFromPoint) return true;
    var els = [].slice.call(document.querySelectorAll(st.sel)), self = this;
    return els.some(function (el) {
      var b = el.getBoundingClientRect();
      if (!self._onScreen({ l: b.left, t: b.top, r: b.right, b: b.bottom })) return false;
      var H = window.innerHeight || 844, x = (b.left + b.right) / 2;  // trois hauteurs : un bloc haut peut avoir un panneau collé sur son bas
      return [0.25, 0.5, 0.75].some(function (f) {
        var y = Math.max(1, Math.min(H - 1, b.top + (b.bottom - b.top) * f));
        var hit = document.elementFromPoint(x, y);
        if (!hit || hit === document.body || hit === document.documentElement) return true; // fond inerte : ignoré par le test, pas caché
        return el === hit || el.contains(hit) || hit.contains(el);
      });
    });
  },

  _onScreen: function (r) {
    var w = window.innerWidth || 390, h = window.innerHeight || 844;
    return r && r.r > 0 && r.l < w && r.b > 0 && r.t < h && (r.b - r.t) < h * 0.9;
  },

  /* Ouvre le tutoriel sur l'écran à la place de la fenêtre. Rend false pour garder la fenêtre classique (format large).
     L'écran finit de se poser (carte du héros, annonces) : on mesure après COACH_SETTLE_MS, derrière un voile transparent
     qui bloque déjà le jeu ; moins de deux éléments trouvés -> la fenêtre classique s'ouvre à sa place. */
  show: function (host, key, closeJs, tutorial) {
    var def = COACH_TUTORIALS[key];
    if (!def || !host || window.COACH_OFF) return false; // COACH_OFF : outillage (parcours qui testent autre chose)
    var root = document.documentElement;
    if (root.classList.contains("wide-mode") || root.classList.contains("pc-mode")) return false; // grand écran : la fenêtre
    var self = this, token = {};
    this._token = token;
    host.innerHTML = '<div class="coach-wait" aria-hidden="true"></div>';
    setTimeout(function () { if (self._token === token) self._start(host, key, closeJs, tutorial); }, COACH_SETTLE_MS);
    return true;
  },

  _start: function (host, key, closeJs, tutorial, tries) {
    var def = COACH_TUTORIALS[key], self = this, token = this._token;
    tries = tries || 0;
    if (!tries && typeof def.prepare === "function") { try { def.prepare(); } catch (e) { noteErreur("coach.prepare", e); } }
    var wait = host.firstChild;
    if (wait && wait.style) wait.style.pointerEvents = "none"; // le voile d'attente ne compte pas pour elementFromPoint
    var steps = def.steps.filter(function (st) {
      var el = document.querySelector(st.sel);
      if (el && el.scrollIntoView) { var r0 = self._rect(st); if (r0 && !self._onScreen(r0)) { try { el.scrollIntoView({ block: "center" }); } catch (e) { noteErreur("coach.scroll", e); } } }
      return self._onScreen(self._rect(st)) && self._onTop(st);
    });
    if (wait && wait.style) wait.style.pointerEvents = "";
    if (steps.length < def.steps.length && tries < COACH_RETRIES) { // une fenêtre s'efface encore (prologue) : on remesure
      setTimeout(function () { if (self._token === token) self._start(host, key, closeJs, tutorial, tries + 1); }, 300);
      return;
    }
    if (steps.length < 2) {                               // repli : la fenêtre d'origine, même clôture
      this._token = null;
      host.innerHTML = buildTutorialModalHTML(closeJs, tutorial);
      if (typeof wireTutorialHint === "function") wireTutorialHint(host);
      return;
    }
    this.host = host; this.key = key; this.steps = steps; this.i = 0; this.closeJs = closeJs;
    this.render();
  },

  render: function () {
    var st = this.steps && this.steps[this.i];
    if (!st || !this.host) return;
    var el = document.querySelector(st.sel);
    if (el && el.scrollIntoView) { var r0 = this._rect(st); if (r0 && !this._onScreen(r0)) { try { el.scrollIntoView({ block: "center" }); } catch (e) { noteErreur("coach.scroll", e); } } }
    var r = this._rect(st);
    if (!this._onScreen(r)) { this.next(); return; }       // élément parti entre deux étapes : on passe
    var W = window.innerWidth || 390, H = window.innerHeight || 844, pad = 4;
    var x = Math.round(r.l - pad), y = Math.round(r.t - pad), w = Math.round(r.r - r.l + pad * 2), h = Math.round(r.b - r.t + pad * 2);
    var below = y + h / 2 < H / 2;                         // élément en haut : bulle dessous
    var ax = Math.max(24, Math.min(W - 36, (r.l + r.r) / 2 - 12));
    var n = this.steps.length, last = this.i === n - 1, dots = "";
    for (var k = 0; k < n; k++) dots += '<i' + (k === this.i ? ' class="is-on"' : '') + '></i>';
    var pos = below ? 'top:' + (y + h + 14) + 'px' : 'bottom:' + (H - y + 14) + 'px';
    var hh = '<div class="coach" role="dialog" aria-modal="true" aria-label="' + esc(st.title) + '">';
    hh += '<div class="coach-veil"></div>';
    hh += '<button type="button" class="coach-spot" style="left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px" onclick="CoachTutorial.next()" aria-label="' + esc(_t("Suivant")) + '"></button>';
    hh += '<div class="coach-bub ' + (below ? 'is-below' : 'is-above') + '" style="' + pos + ';--ax:' + Math.round(ax - 12) + 'px">';
    hh += '<span class="coach-arrow"></span><div class="coach-top"><b class="coach-t">' + esc(st.title) + '</b><span class="coach-n">' + (this.i + 1) + ' / ' + n + '</span></div>';
    hh += '<p class="coach-x">' + esc(st.text) + '</p><div class="coach-foot"><span class="coach-dots">' + dots + '</span>';
    hh += '<button type="button" class="coach-skip" onclick="CoachTutorial.finish()">' + esc(_t("Passer", "tuto")) + '</button>';
    hh += '<button type="button" class="kbtn primary coach-next" onclick="CoachTutorial.next()">' + esc(last ? _t("Compris") : _t("Suivant")) + '</button></div></div></div>';
    this.host.innerHTML = hh;
    var host = this.host, give = function () {             // le focus va au bouton ; reposé si une fenêtre qui se ferme l'a repris
      var nb = host.querySelector(".coach-next"), c = host.querySelector(".coach");
      if (nb && nb.focus && c && !c.contains(document.activeElement)) { try { nb.focus({ preventScroll: true }); } catch (e) { nb.focus(); } }
    };
    give(); setTimeout(give, 0); setTimeout(give, 200); setTimeout(give, 700); // après la fermeture du prologue (premier lancement)
  },

  next: function () {
    if (!this.steps) return;
    if (this.i < this.steps.length - 1) { this.i++; this.render(); } else this.finish();
  },

  /* Fin (« Compris » ou « Passer ») : même clôture que la fenêtre d'origine (tutoriel noté vu, sauvegarde). */
  finish: function () {
    var js = this.closeJs;
    this._token = null;
    this.steps = null; this.key = null; this.closeJs = null;
    if (this.host) this.host.innerHTML = "";
    this.host = null;
    if (js) { try { (new Function(js))(); } catch (e) { noteErreur("coach.finish", e); } }
  },

  isOpen: function () { return !!this.steps; }
};

if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("resize", function () { if (CoachTutorial.isOpen()) CoachTutorial.render(); });
}
window.COACH_TUTORIALS = COACH_TUTORIALS;
window.CoachTutorial = CoachTutorial;
