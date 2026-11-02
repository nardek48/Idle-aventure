"use strict";
/* ui/news-view.js — v3.592.0 : « Quoi de neuf » après une mise à jour (atelier quoi-de-neuf.html, choix A de Seb).
   - Une fenêtre centrée, une seule fois après une mise à jour, partie chargée, héros libre ;
     jamais pour un nouveau joueur (il découvre tout).
   - Les nouveautés depuis la dernière version vue sur cet appareil (préférence « newsSeen »),
     5 lignes au plus ; « Tout voir » ouvre la liste groupée par version.
   - Paramètres › Partie › Mises à jour : « Voir les nouveautés ».
   À chaque version visible pour le joueur : une ou deux lignes en tête de newsEntries(). */

/* [version, icône, texte] — la plus récente en premier. Textes littéraux : audit i18n. */
function newsEntries() {
  return [
    ["3.620.0", "menu_icons/heroes_menu", _t("L\'habillage des cartes est terminé : le bouton de l\'équipe du Résumé prend aussi son cadre.")],
    ["3.619.1", "menu_icons/heroes_menu", _t("Correctif : le mannequin de l\'équipement et l\'image de la route de la Caravane sont de retour.")],
    ["3.619.0", "menu_icons/quests_menu", _t("Les quêtes, le tableau des missions, les contrats de la Taverne et l\'objectif de la Chronique deviennent des parchemins déchirés.")],
    ["3.618.1", "menu_icons/settings_menu", _t("Sur les cartes en parchemin, le vert des gains, l'or des récompenses et les sous-titres sont plus foncés, donc plus lisibles.")],
    ["3.618.0", "menu_icons/heroes_menu", _t("Les cartes des écrans prennent un fond de parchemin et un fin cadre de bronze. Les quêtes et les missions suivront, en parchemin déchiré.")],
    ["3.617.0", "menu_icons/settings_menu", _t("Lisibilité : l\'or, le vert des gains et le texte secondaire sont un peu plus foncés sur les cartes crème.")],
    ["3.616.3", "menu_icons/village_menu", _t("Les fiches ont un nouveau fond de parchemin crème, plus fin et plus léger.")],
    ["3.616.2", "menu_icons/village_menu", _t("Nouvelles icônes : les événements du village, les sujets au feu, les reliques des compagnons, les objets de l\'artisan, l\'entrée de donjon et le Sommet interdit.")],
    ["3.616.1", "menu_icons/village_menu", _t("Correctif : la description du Terrain d\'entraînement donne les bons plafonds (+10 pour la caractéristique de classe et l\'Endurance, environ +7 pour les autres).")],
    ["3.616.0", "menu_icons/village_menu", _t("Forêt : le Village s\'ouvre quand « La Meute affamée » est réussie, plus dès qu\'on l\'accepte. La Scierie, la Mine et les Champs ne s\'ouvrent plus sans leur expédition.")],
    ["3.616.0", "menu_icons/quests_menu", _t("« Comme la dernière fois » ne reprend plus la besace d\'une autre partie. Plusieurs aides des tutoriels sont corrigées (carte, Grimoire, compagnons, Terrain, petite aventure).")],
    ["3.615.2", "menu_icons/heroes_menu", _t("La Boutique d\'équipement reste à côté du Sac toute la partie, dans Héros › Équipement ; la Halle marchande la propose aussi.")],
    ["3.615.1", "menu_icons/heroes_menu", _t("Correctif : sur l\'écran Équipé, on peut de nouveau choisir n\'importe quel emplacement après en avoir touché un.")],
    ["3.615.0", "menu_icons/heroes_menu", _t("Chaque pièce d\'équipement a maintenant un niveau d\'objet (ilvl) : en coin sur son icône, et détaillé dans sa fiche. Environ 10 par monde, plus selon la rareté.")],
    ["3.614.0", "menu_icons/heroes_menu", _t("Entraînement : ta caractéristique de classe et l\'Endurance montent jusqu\'au plafond du Terrain ; les trois autres s\'arrêtent à 70 % de ce plafond.")],
    ["3.613.0", "menu_icons/heroes_menu", _t("L\'entraînement coûte quatre fois plus cher à partir du Désert : chaque palier du Terrain se gagne. Et les combats avec Wenna contre une élite seule comptent bien un par un.")],
    ["3.612.0", "menu_icons/village_menu", _t("Les bâtiments de production n'ont plus que 3 zones, qui montent plus haut à chaque monde. Dès le Désert, l'achat automatique les améliore avec ton surplus.")],
    ["3.611.0", "menu_icons/village_menu", _t("Caravanes : le trajet Long rapporte 2 matériaux rares à coup sûr, et chaque marché passe une commande du jour (+25 % d'or, +1 rare).")],
    ["3.610.0", "menu_icons/village_menu", _t("La part laissée au village par la caravane se règle (10 à 75 % du plafond) : plus de caravane bloquée faute de surplus.")],
    ["3.609.0", "menu_icons/village_menu", _t("Le Grand Ouvrage ouvre dès le Désert et se remplit tout seul : au-delà de 80 % du plafond (réglable), les matières brutes y partent au lieu d'être perdues.")],
    ["3.608.0", "camp/campfire", _t("La Grande ration ne demande plus de Sève d'Aeswyn : 1 Ration, 15 Viandes et 10 Eau à la Cuisine de camp.")],
    ["3.607.0", "menu_icons/village_menu", _t("Les événements du village ont des suites : livre une demande ou joue une rumeur, et le lendemain le village te le rend. Et au feu, demande à un compagnon « Et ce matin ? ».")],
    ["3.606.0", "menu_icons/village_menu", _t("L'artisan d'Aeswyn : fabrique au village une corde tressée, une trousse de maître et une torche résinée, meilleures pour les Petites Aventures. Et pendant son marché, Sarkel rachète tes ressources rares.")],
    ["3.605.0", "camp/campfire", _t("Au feu, un nouveau sujet : « Et les autres ? ». Demande à un compagnon ce qu'il pense de chacun des autres.")],
    ["3.604.0", "menu_icons/village_menu", _t("Ce matin à Aeswyn : à l'aube, un événement peut arriver au village pour 2 jours. Une rumeur de Taverne, une demande d'un ancien, le marché de Sarkel ou une fête.")],
    ["3.603.0", "menu_icons/map_menu", _t("Quêtes des compagnons : chaque étape a maintenant son propre lieu sur la carte, marqué du portrait. Une Petite Aventure ne fait avancer qu'une seule quête.")],
    ["3.602.0", "camp/campfire", _t("Les jours du monde : une nuit tombe toutes les 3 sorties (le jour est sur le bandeau du Camp). La nuit, la carte du monde où tu vis peut reprendre un secteur lointain ; la Palissade le protège.")],
    ["3.601.0", "camp/campfire", _t("Au feu, touche un compagnon : choisis de quoi parler. Ses souvenirs, ce qu'il pense du monde où vous êtes, sa quête.")],
    ["3.600.0", "menu_icons/map_menu", _t("Quêtes des compagnons : « J'y vais » mène au bon monde, et la carte vivante marque d'un portrait les lieux qui font avancer la quête.")],
    ["3.599.0", "camp/campfire", _t("Au feu, tes compagnons veulent te parler : 27 conversations sur eux, l'histoire et le monde, avec un choix de réponse.")],
    ["3.599.0", "quests/quest_side", _t("Chaque compagnon a ses quêtes personnelles (14 en tout), ouvertes par ses conversations. Chacune donne une relique unique.")],
    // v3.596.0 : les nouveautés des v3.594.0 et v3.595.0, annoncées ici pour qu'elles s'affichent aussi chez qui a déjà ouvert ces versions
    ["3.596.0", "camp/campfire", _t("Le Camp s'anime : chaque soir une phrase, et tes compagnons restés au camp autour du feu. Touche-les.")],
    ["3.596.0", "menu_icons/camp_menu", _t("Camp : un onglet « Le feu » réunit la santé, les rations et les compagnons.")],
    ["3.596.0", "menu_icons/map_menu", _t("La Carte est dans la barre du bas. Entre dans le donjon de n'importe quel monde atteint, sans y voyager.")],
    ["3.593.0", "menu_icons/bestiaire_menu", _t("Combat sur téléphone : chaque ennemi porte son nom sous lui, pas seulement la cible.")],
    ["3.592.0", "system/upgrade", _t("Après une mise à jour, cette fenêtre te dit ce qui a changé. Tu la retrouves dans Paramètres › Partie.")],
    ["3.591.0", "menu_icons/settings_menu", _t("Une roue des Paramètres sur l'accueil : importe une sauvegarde, change la langue ou la taille du texte avant de jouer.")],
    ["3.591.0", "system/reset", _t("Paramètres › Partie : cherche ou force une mise à jour.")],
    ["3.590.0", "system/warning", _t("« Abandonner » et « Effacer » sont cerclés de rouge : impossible de les confondre avec « Continuer ».")],
    ["3.589.0", "menu_icons/heroes_menu", _t("Combat : ta carte prend moins de place, l'arène et les monstres davantage.")],
    ["3.588.0", "menu_icons/journal_menu", _t("Sur téléphone, les titres et le récit de l'Histoire prennent les polices du jeu.")],
    ["3.586.0", "menu_icons/camp_menu", _t("Expéditions : une ligne par sorte (Donjon, Petites Aventures, Patrouilles, Caravane).")],
    ["3.584.0", "menu_icons/village_menu", _t("Plus de grand cadre : le décor du monde passe entre les blocs.")],
    ["3.581.0", "menu_icons/map_menu", _t("Chaque écran ouvre sur une illustration qui évolue avec ton aventure.")]
  ];
}

var NEWS_MAX_LINES = 5;

/* « 3.590.0 » < « 3.591.0 » : comparaison nombre par nombre */
function newsCompare(a, b) {
  var x = String(a || "0").split("."), y = String(b || "0").split(".");
  for (var i = 0; i < Math.max(x.length, y.length); i++) {
    var d = (Number(x[i]) || 0) - (Number(y[i]) || 0);
    if (d) return d;
  }
  return 0;
}

function newsSeenVersion() {
  return (window.Prefs && Prefs.has("newsSeen")) ? Prefs.getValue("newsSeen") : "";
}

function newsMarkSeen() {
  if (window.Prefs && typeof GAME_VERSION === "string") Prefs.setValue("newsSeen", GAME_VERSION);
}

/* Nouveautés plus récentes que la dernière version vue */
function newsUnseen() {
  var seen = newsSeenVersion();
  return newsEntries().filter(function (n) { return newsCompare(n[0], seen) > 0; });
}

/* Le héros est-il libre, et rien d'autre n'est-il ouvert ? (même esprit que la bannière de mise à jour) */
function newsCanShow() {
  if (typeof titleScreenResolved !== "undefined" && !titleScreenResolved) return false;
  if (!window.game || !game.heroId) return false;
  if (game.activeTab === "combat" || game.activeTab === "scene") return false;
  if (window.SceneRunManager && typeof SceneRunManager.isHeroEngaged === "function" && SceneRunManager.isHeroEngaged()) return false;
  // seules les fenêtres affichées comptent : certaines restent dans la page, masquées
  var open = document.querySelectorAll(".kwin-veil, .ksheet-backdrop, .prologue, #title-screen-root .title-screen-overlay");
  for (var i = 0; i < open.length; i++) if (open[i].getClientRects().length) return false;
  return true;
}

function newsRoot() {
  var root = document.getElementById("news-root");
  if (!root && document.body) { root = document.createElement("div"); root.id = "news-root"; document.body.appendChild(root); }
  return root;
}

function newsLineHTML(n) {
  return '<li><img src="images/Icons/' + n[1] + '.webp" alt=""><span>' + esc(n[2]) + '</span></li>';
}

/* Fenêtre « Quoi de neuf » : les nouveautés non vues, 5 au plus */
function openNewsWindow(list) {
  var root = newsRoot();
  if (!root) return;
  list = list || newsUnseen();
  var total = newsEntries().length;
  var h = '<div class="full-menu-overlay kwin-veil"><div class="kwin news-win" role="dialog" aria-label="' + esc(_t("Quoi de neuf")) + '">';
  h += kWinHeadHTML({ icon: '<img src="images/Icons/system/upgrade.webp" alt="">', title: esc(_t("Quoi de neuf")),
    sub: esc(_t("Depuis ta dernière visite · v{v}", { v: String(GAME_VERSION).replace(/\.0$/, "") })) });
  h += '<div class="kwin-body"><ul class="news-list">' + list.slice(0, NEWS_MAX_LINES).map(newsLineHTML).join("") + '</ul>';
  h += '<button type="button" class="klink news-more" onclick="openNewsList()">' + esc(_tn(total, "Tout voir ({n} nouveauté)", "Tout voir ({n} nouveautés)")) + '</button>';
  h += '<button type="button" class="kbtn primary" onclick="closeNews()">' + esc(_t("Compris")) + '</button></div></div></div>';
  root.innerHTML = h;
  newsMarkSeen(); // vue une fois : elle ne revient pas au prochain lancement
}

/* Liste complète, groupée par version (« Tout voir », Paramètres › Partie) */
function openNewsList() {
  var root = newsRoot();
  if (!root) return;
  var groups = [], last = null;
  newsEntries().forEach(function (n) {
    if (!last || last.v !== n[0]) { last = { v: n[0], items: [] }; groups.push(last); }
    last.items.push(n);
  });
  var h = '<div class="hf-sheet-bg"><div class="ksheet-backdrop" onclick="closeNews()"></div><div class="ksheet hf-sheet news-sheet" role="dialog" aria-label="' + esc(_t("Nouveautés")) + '">';
  h += kSheetHeadHTML({ icon: '<img src="images/Icons/system/upgrade.webp" alt="">', title: esc(_t("Nouveautés")), sub: esc(_t("Les dernières versions")), close: "closeNews()" });
  h += '<div class="ksheet-body">' + groups.map(function (g) {
    return '<div class="news-v">' + esc(_t("Version {v}", { v: g.v.replace(/\.0$/, "") })) + '</div><ul class="news-list">' + g.items.map(newsLineHTML).join("") + '</ul>';
  }).join("") + '</div></div></div>';
  root.innerHTML = h;
  newsMarkSeen();
}

function closeNews() {
  var root = document.getElementById("news-root");
  if (root) root.innerHTML = "";
}

/* Au lancement : premier lancement de l'appareil -> rien (nouveau joueur, ou ancien joueur sans repère :
   on lui montre les dernières nouveautés s'il a déjà progressé) ; sinon, s'il y a du nouveau, la fenêtre
   attend que le héros soit libre. */
var newsTimer = null;
function newsWatch() {
  if (newsTimer || typeof setInterval !== "function" || typeof document === "undefined") return;
  newsTimer = setInterval(function () {
    if (typeof titleScreenResolved !== "undefined" && !titleScreenResolved) return;
    if (!window.game || !game.heroId) return;
    if (!newsSeenVersion()) {
      var veteran = Number(game.heroLevel || 1) > 1 || Number(game.playTime || 0) > 600;
      if (!veteran) { newsMarkSeen(); clearInterval(newsTimer); newsTimer = null; return; }
      if (window.Prefs) Prefs.setValue("newsSeen", "3.580.0"); // ancien joueur : depuis les bandeaux illustrés
    }
    if (!newsUnseen().length) { clearInterval(newsTimer); newsTimer = null; return; }
    if (!newsCanShow()) return;
    clearInterval(newsTimer); newsTimer = null;
    openNewsWindow();
  }, 2000);
}
if (typeof window !== "undefined" && typeof window.addEventListener === "function") window.addEventListener("load", newsWatch);

window.newsEntries = newsEntries;
window.newsCompare = newsCompare;
window.newsUnseen = newsUnseen;
window.openNewsWindow = openNewsWindow;
window.openNewsList = openNewsList;
window.closeNews = closeNews;
window.newsWatch = newsWatch;
