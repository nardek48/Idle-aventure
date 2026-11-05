"use strict";
/* ui/tutorial-view.js — popup pédagogique par étape Histoire (v3.107.7, décision Seb). Affiché une
   seule fois, à la première arrivée sur l'onglet lié à l'étape courante et acceptée (voir
   step.tutorial dans data/story-quests.js, déclenché depuis switchTab() dans ui/ui-root.js).
   Réutilise le pattern .full-menu-overlay/.dungeon-story-card déjà en place (donjon, exploration). */

var pendingTutorial = null; // { chapterId, tutorial } le temps que la modale est ouverte

/* Aperçu fidèle d'un badge de statut réel (ex. télégraphe de charge), pour montrer au joueur
   exactement ce qu'il verra en combat plutôt que de le décrire seulement en texte. */
/* v3.263.0 (retour Seb) : l'aperçu reprend l'alerte du combat et son icône, lues dans COMBAT_STATES.
   v3.683.0 (audit NOV-5, OUB-1) : la vraie puce .cbx-chip.is-urgent, le bandeau .cb-alert n'existant plus. */
function buildTutorialPreviewHTML(kind) {
  var def = (window.COMBAT_STATES || {})[kind];
  if (!def) return "";
  return '<span class="cbx-chip is-urgent tutorial-preview-alert">' + renderIconOrEmojiHTML(def.icon, "", _td(def.nom))
    + '<span>' + esc(_td(def.mot || def.nom)) + '</span></span>';
}

function buildTutorialModalHTML(closeHandlerJs, tutorial) {
  // v3.400.0 (lot F-2) : fenêtre centrée du kit (.kwin)
  var h = '<div class="full-menu-overlay kwin-veil tutorial-overlay">';
  h += '  <div class="kwin dungeon-story-card tutorial-card">';
  h += kWinHeadHTML({ icon: renderIconOrEmojiHTML(tutorial.icon || "images/Icons/codex/codex_lore.webp", "dungeon-story-icon-img", ""), title: esc(_td(tutorial.title || "")) });
  h += '    <div class="kwin-body tutorial-points">';
  (tutorial.points || []).forEach(function (p) {
    h += '<div class="tutorial-point">';
    h += '<span class="tutorial-point-icon">' + renderIconOrEmojiHTML(p.icon, "tutorial-point-ico", "") + '</span>';
    h += '<span class="tutorial-point-text">' + esc(_td(p.text || ""));
    if (p.preview) h += ' ' + buildTutorialPreviewHTML(p.preview);
    h += '</span>';
    h += '</div>';
  });
  h += '    </div>';
  h += '    <div class="tut-more" aria-hidden="true"><i><span>' + esc(_t("Suite ↓")) + '</span></i></div>'; // v3.703.0 (TUTO-11) : indice de suite
  h += '    <div class="kwin-foot">';
  h += '      <button class="kbtn primary" type="button" onclick="' + closeHandlerJs + '">' + _t("Compris") + '</button>';
  h += '    </div>';
  h += '  </div>';
  h += '</div>';
  return h;
}

/* v3.703.0 (TUTO-11, atelier « Fenêtres », Seb A) : dégradé et « Suite ↓ » tant que la liste déborde,
   effacés en fin de liste (classe is-end) ; posé par chaque ouverture d'une fenêtre d'aide. */
function wireTutorialHint(host) {
  var card = host && host.querySelector ? host.querySelector(".tutorial-card") : null;
  var body = card && card.querySelector(".kwin-body");
  if (!body || !card.querySelector(".tut-more")) return;
  var up = function () { card.classList.toggle("is-end", body.scrollTop + body.clientHeight >= body.scrollHeight - 4); };
  body.addEventListener("scroll", up, { passive: true });
  up();
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(up); // après le chargement des icônes et polices
}
window.wireTutorialHint = wireTutorialHint;

/* Affiche le popup si cette étape en a un et qu'il n'a jamais été vu. Appelé depuis switchTab(). */
function maybeShowStepTutorial(chapterId, tabName) {
  if (!window.StoryQuestManager || pendingTutorial) return; // v3.683.0 (TUTO-5) : jamais par-dessus une autre aide
  var step = StoryQuestManager.getCurrentStep(chapterId);
  if (!step || !step.tutorial || step.tutorial.tab !== tabName) return;
  if (typeof step.tutorial.when === "function" && !step.tutorial.when()) return; // v3.683.0 : contexte voulu (ex. Petite Aventure)
  if (!StoryQuestManager.isCurrentStepAccepted(chapterId)) return;
  var st = StoryQuestManager.getState(chapterId);
  if (!st.tutorialsSeen || typeof st.tutorialsSeen !== "object") st.tutorialsSeen = {};
  if (st.tutorialsSeen[step.id]) return;

  pendingTutorial = { chapterId: chapterId, tutorial: step.tutorial };
  var host = document.getElementById("tutorial-modal-root");
  if (host) { host.innerHTML = buildTutorialModalHTML("closeTutorialModal('" + esc(chapterId) + "')", step.tutorial); wireTutorialHint(host); }
}
window.maybeShowStepTutorial = maybeShowStepTutorial;

/* v3.683.0 (audit TUTO-8) : une autre fenêtre (*-modal-root hors tutoriel) est-elle ouverte ? */
function otherModalRootOpen() {
  if (!document.querySelectorAll) return false;
  var roots = document.querySelectorAll('[id$="-modal-root"]');
  for (var i = 0; i < roots.length; i++) if (roots[i].id !== "tutorial-modal-root" && roots[i].innerHTML) return true;
  return false;
}

/* v3.518.0 (audit TUT-4) : après « Partir », le tutoriel d'étape jamais vu s'ouvre là où l'on arrive.
   Combat et Scène exclus : ils s'ouvrent plus tard d'eux-mêmes, au bon écran. */
function showStepTutorialAfterGo(chapterId) {
  var host = document.getElementById("tutorial-modal-root");
  if (pendingTutorial || !host || host.innerHTML || !window.StoryQuestManager) return;
  if (otherModalRootOpen()) return; // v3.683.0 (TUTO-8) : pas de second voile sur le pronostic ou une autre fenêtre
  var step = StoryQuestManager.getCurrentStep(chapterId);
  if (!step || !step.tutorial || step.tutorial.tab === "combat" || step.tutorial.tab === "scene") return;
  maybeShowStepTutorial(chapterId, step.tutorial.tab);
}
window.showStepTutorialAfterGo = showStepTutorialAfterGo;

function closeTutorialModal(chapterId) {
  if (window.StoryQuestManager) {
    var step = StoryQuestManager.getCurrentStep(chapterId);
    var st = StoryQuestManager.getState(chapterId);
    if (step && st) {
      if (!st.tutorialsSeen || typeof st.tutorialsSeen !== "object") st.tutorialsSeen = {};
      st.tutorialsSeen[step.id] = true;
    }
  }
  pendingTutorial = null;
  var host = document.getElementById("tutorial-modal-root");
  if (host) host.innerHTML = "";
  if (typeof saveGame === "function") saveGame();
}
window.closeTutorialModal = closeTutorialModal;

/* v3.107.9 : tutoriels GÉNÉRIQUES, pas liés à une étape Histoire (ex. Village/Production,
   accroché à « Les fondations » sortie de la chaîne en v3.107.8). Déclaré dans GENERIC_TUTORIALS
   ci-dessous — même rendu visuel (buildTutorialModalHTML), persistance dans
   game.genericTutorialsSeen (flag par id, indépendant de tout chapitre Histoire). */
var GENERIC_TUTORIALS = {
  /* v3.116.0 : accueil Campement — migré depuis forest_01.tutorial (jamais affiché : il exigeait
     l'étape acceptée alors que l'arrivée au Campement précède toujours l'acceptation). Sans
     condition : affiché une seule fois, dès la toute première arrivée (y compris au boot). */
  camp_welcome: {
    tab: "campement",
    icon: "images/Icons/plots/hunting_blind.webp",
    title: "Le Campement",
    points: [
      { icon: "images/Icons/plots/hunting_blind.webp", text: "Le Campement est ton point de ralliement entre deux expéditions — c'est ici que tu gères tout ce qui n'est pas le combat." },
      { icon: "images/Icons/combat_stats/stat_health.webp", text: "Ta santé — hors combat et hors sortie (expédition, donjon, Petite Aventure), tu récupères 5 % de tes PV max par minute, même hors ligne. Suis ta barre de vie et la régénération en haut de l'écran." },
      { icon: "images/Icons/quests/ration_reward.webp", text: "Les rations soignent instantanément un % fixe de tes PV (35/60/100 % selon le type) : utile pour repartir vite sans attendre." },
      { icon: "images/Icons/quests/quest_list.webp", text: "Le tableau de missions — l'étape d'Histoire en cours (badge doré « Histoire ») est toujours en tête. Touche « Accepter », puis « Partir » pour ta prochaine quête : c'est elle qui te mènera au combat avec un vrai objectif." }
    ]
  },
  village_production: {
    tab: "village",
    // v3.697.0 (TUTO-6, Seb A) : sans condition, à la première ouverture de l'onglet Village ; déclaré
    // avant le Terrain pour passer en premier (maybeShowGenericTutorial suit l'ordre de déclaration).
    icon: "images/Icons/scene/scene_harvest.webp",
    title: "Village & Production",
    points: [
      { icon: "images/Icons/scene/scene_harvest.webp", text: "Les zones produisent une ressource en continu, même hors ligne — mais chaque bâtiment a un stock local limité (la jauge « 0 / 45 » sur sa carte)." },
      { icon: "images/Icons/subtabs/inventory.webp", text: "Touche « Récolter » pour transférer ce stock vers ton Entrepôt, qui a son propre plafond (plus grand)." },
      { icon: "images/Icons/system/upgrade.webp", text: "Améliorer une zone augmente sa vitesse de production et sa capacité de stock local." },
      { icon: "images/Icons/quests/mission_construction.webp", text: "Les Ateliers (comme la Cuisine de camp) transforment des ressources brutes (ex. viande + eau) en objets utiles (ex. rations) — file d'attente, continue même hors ligne." },
      { icon: "images/Icons/system/warehouse_supplies.webp", text: "Garde un œil sur ton Entrepôt : une ressource pleine ne se produit plus tant que tu ne l'as pas dépensée (l'Entrepôt ne rachète rien)." }
    ]
  },
  /* v3.213.1 (lot V-2) : premier plafond d'entraînement. Condition : une
     caractéristique a buté à 20 — le joueur vient de rencontrer le mur, c'est
     le seul moment où l'explication a du sens. */
  village_training: {
    tab: "village",
    condition: function () {
      return !!(window.VILLAGE_BUILDINGS && VILLAGE_BUILDINGS.training
        && typeof VILLAGE_BUILDINGS.training.unlockCheck === "function"
        && VILLAGE_BUILDINGS.training.unlockCheck());
    },
    icon: "images/Icons/village_buildings/training_grounds.webp",
    title: "Le Terrain d'entraînement",
    points: [
      { icon: "images/Icons/system/training_cap.webp", text: "Ta caractéristique de classe et l'Endurance butent à 20, les trois autres à 14 : c'est la limite de l'entraînement de fortune du campement. Pour aller plus loin, il faut un vrai terrain." },
      { icon: "images/Icons/workshops/masonry.webp", text: "Le Terrain se bâtit ici, au Village, comme l'Atelier : des matériaux, puis un chantier qui prend un peu de temps." },
      { icon: "images/Icons/village_buildings/training_grounds.webp", text: "Chaque niveau du Terrain relève le plafond de CHACUNE des cinq caractéristiques : +10 pour ta caractéristique de classe et l'Endurance, environ +7 pour les trois autres — jamais un total à répartir." },
      { icon: "images/Icons/gold_icon.webp", text: "L'entraînement lui-même se paie toujours en or, dans Héros → Entraînement. Le Terrain décide jusqu'où tu peux monter, pas combien ça coûte." }
    ]
  },
  /* v3.704.0 (TUTO-16, Seb A) : « Ce matin à Aeswyn », à la première ouverture du Village pendant un événement. */
  village_events: {
    tab: "village", section: "village", solo: true,
    condition: function () { return !!(window.VillageEvents && VillageEvents.active()); },
    icon: "images/Icons/village_events/event_village.webp",
    title: "Ce matin à Aeswyn",
    points: [
      { icon: "images/Icons/village_events/event_village.webp", text: "Après une nuit (toutes les 3 sorties), l'aube amène parfois un événement à Aeswyn, une fois sur deux. Sa carte « Ce matin à Aeswyn » s'affiche en tête du Village, pour 2 jours de jeu." },
      { icon: "images/Icons/village_events/event_village.webp", text: "Rumeur : un lieu de la carte rapporte +50 % de butin. Demande : un ancien attend des ressources, contre de l'or. Marché : l'échoppe fait −20 %. Fête : du pain contre un soin du camp et plus d'or." },
      { icon: "images/Icons/village_events/event_cadeau.webp", text: "Réussi (livré, fête lancée, rumeur jouée), un événement appelle souvent une suite à l'aube suivante, comme un cadeau. La pastille « ! » de l'onglet Village te dit quand agir." }
    ]
  },
  /* v3.211.0 : aide du Grimoire. Déclarée ICI et pas dans grimoire-view.js pour une
     seule raison — les trois sources du catalogue de Tutoriels (systems/tutorial-catalog-system.js)
     ramassent GENERIC_TUTORIALS tel quel, donc l'écran Tutoriels la reprend sans code
     supplémentaire, et il n'existe qu'UN texte à maintenir pour les deux endroits.
     PAS de champ `tab` : maybeShowGenericTutorial() cherche par onglet, l'absence de tab
     garantit qu'aucun popup ne s'ouvre tout seul en arrivant sur le Grimoire — c'est le
     bouton « ? » qui l'affiche, et lui seul, conformément à la refonte v3.210.0. */
  /* v3.322.0 (O12) : mini-tutoriel du premier niveau de Mémoire, montré à la première
     ouverture de l'écran de Mémoire une fois le niveau 1 atteint. */
  memoire: {
    tab: "ascension",
    condition: function () { return !!(window.MemoryManager && MemoryManager.getLevel() >= 1); },
    icon: "images/Icons/aether_icon.webp",
    title: "La Mémoire",
    points: [
      { icon: "images/Icons/aether_icon.webp", text: "Ce que tu donnes, l'Aether le retient. Chaque objet offert depuis ton sac et chaque grande victoire remplissent la jauge ; un niveau ouvre un choix." },
      { icon: "images/Icons/system/upgrade.webp", text: "Choisis. Une seule amélioration par niveau. L'autre n'est pas perdue : elle reste là." },
      { icon: "images/Icons/system/lock_closed.webp", text: "Reprendre a un prix. Changer d'avis coûte de l'or, trois fois plus à chaque fois." },
      { icon: "images/Icons/gold_icon.webp", text: "Un objet acheté à l'échoppe ne porte aucun souvenir : il ne rend pas d'Aether." }
    ]
  },

  /* v3.334.0 (Évolutions, P9) : patrouilles — à la première visite de l'écran Héros une fois
     un compagnon arrivé. Rejoint le catalogue de tutoriels comme les autres. */
  patrols_intro: {
    tab: "more",
    // v3.697.0 (TUTO-13, Seb A) : après la réclamation de forest_wenna (l'étape qui exige Wenna dans le groupe)
    condition: function () { return !!(window.PatrolManager && PatrolManager.isUnlocked()) && storyStepClaimed("forest_wenna"); },
    icon: "images/Icons/quests/mission_exploration.webp",
    title: "Les patrouilles",
    points: [
      { icon: "images/Icons/quests/mission_exploration.webp", text: "Un compagnon peut partir en patrouille 2, 4 ou 8 heures vers un secteur libéré de la carte, même quand tu ne joues pas." },
      { icon: "images/Icons/resources/wood_icon.webp", text: "Il rapporte les matériaux du secteur, un peu d'or, parfois de quoi faire des rations — et une petite histoire." },
      { icon: "images/Icons/system/hourglass_waiting.webp", text: "Pendant ce temps, il ne combat pas avec toi. Tu peux le rappeler quand tu veux : il rapporte ce qu'il a déjà trouvé." },
      { icon: "images/Icons/system/check_valid.webp", text: "Aucun risque : une patrouille revient toujours. Réglage sur la fiche du compagnon (Héros › Alliés)." }
    ]
  },
  /* v3.429.12 : première préparation d'une petite aventure (besace, pactes). Pas les parcours
     d'Histoire (pas de besace à remplir) : seulement l'expédition libre des secteurs. */
  pa2_prep: {
    tab: "scene",
    condition: function () {
      var run = game.sceneRun;
      return !!(run && run.pa2 && run.status === "pa2-prep" && !run.parcours);
    },
    icon: "images/Icons/dungeon/dungeon_sacoche.webp",
    title: "Préparer une petite aventure",
    points: [
      { icon: "images/Icons/dungeon/dungeon_sacoche.webp", text: "La besace : touche une case pour y mettre des rations ou des objets. Chacun a un avantage (en vert) et souvent un prix (en rouge). Les rations que tu ne manges pas retournent à l'Entrepôt." },
      { icon: "images/Icons/combat_stats/stat_health.webp", text: "Tu pars avec tes PV actuels : en route, seuls te soignent les rations de la besace, les sources, le repos (au seuil ou au feu de camp), les autels et quelques reliques." },
      { icon: "images/Icons/scene/pacts/pact_awake.webp", text: "Les pactes ne sont pas obligatoires. Chacun rend la nuit plus dure et le retour plus riche : choisis-les quand tu t'en sens capable." },
      { icon: "images/Icons/scene/node_threshold.webp", text: "« Renoncer à cette aventure » te ramène sans rien perdre, tant que tu n'es pas encore parti." }
    ]
  },
  /* v3.469.2 (retour Seb, PA-T1) : la condition du run, à la première préparation qui en a une (pas une nuit calme). */
  pa2_night: {
    tab: "scene",
    condition: function () {
      var run = game.sceneRun, c = run && run.pa2 && run.status === "pa2-prep" && window.Pa2Run ? Pa2Run.condition(run) : null;
      return !!(c && c.pro);
    },
    icon: "images/Icons/scene/path_easy.webp",
    title: "La nuit du run",
    points: [
      { icon: "images/Icons/scene/path_easy.webp", text: "Chaque petite aventure a sa nuit : brouillard, orage, pillards… Elle est annoncée ici, avant que tu remplisses ta besace." },
      { icon: "images/Icons/system/check_valid.webp", text: "En vert, ce qu'elle t'apporte ; en rouge, ce qu'elle te coûte. Les deux valent pour tout le run." },
      { icon: "images/Icons/dungeon/dungeon_sacoche.webp", text: "« Utile cette nuit » nomme l'objet qui t'aidera le plus. Une nuit sur cinq est calme : rien ne change." },
      { icon: "images/Icons/scene/ui/ui_hero_marker.webp", text: "En route, la pastille dorée en haut de l'écran te rappelle la nuit : touche-la." }
    ]
  },
  /* v3.469.2 (PA-T1) : la première fois qu'un piège ou un sentier coupé apparaît sur la carte (ou qu'on marche sur un piège caché). */
  pa2_traps: {
    tab: "scene",
    condition: function () {
      var run = game.sceneRun, P = window.Pa2Run;
      if (!run || !run.pa2 || run.parcours || !P) return false;
      if (run.status === "pa2-trap") return true;
      if (run.status !== "pa2-map" && run.status !== "pa2-node") return false;
      return Object.keys(run.traps || {}).some(function (k) { return P.isTrapShown(k, run); }) || Object.keys(run.cuts || {}).some(function (k) { return P.isCutShown(k, run); });
    },
    icon: "images/Icons/scene/traps/fx_venom.webp",
    title: "Pièges et sentiers coupés",
    points: [
      { icon: "images/Icons/scene/traps/fx_venom.webp", text: "Un losange rouge sur un sentier, c'est un piège. Son icône dit ce qu'il fait : venin, alarme, entrave, aveuglement ou besace percée." },
      { icon: "images/Icons/scene/torch.webp", text: "Certains pièges sont cachés. La torche montre ceux des sentiers que tu peux prendre ; à la Crypte, la Lanterne allumée aussi." },
      { icon: "images/Icons/scene/items/item_lockpicks.webp", text: "Sur un piège : Désamorcer (un dé ; raté, l'effet joue et te blesse), la Trousse (à coup sûr), Subir (l'effet, sans blessure) ou Rebrousser (10 Souffle)." },
      { icon: "images/Icons/scene/traps/fx_snare.webp", text: "Les effets en cours s'affichent en rouge en haut de l'écran, avec les pas qu'il leur reste." },
      { icon: "images/Icons/scene/cuts/cut_fallen_tree.webp", text: "Un rond gris barré : le sentier est coupé pour ce run. Il reste toujours un autre chemin." }
    ]
  },
  /* v3.435.0 (Ruines, RU12) : première descente dans le Labyrinthe aux leviers. Edda explique. */
  labyrinth_first: {
    tab: "scene",
    condition: function () { var run = game.sceneRun; return !!(run && run.lab && (run.kind || "labyrinthe") === "labyrinthe" && run.status === "lab-map"); }, // v3.638.0 : pas dans la faille
    icon: "images/Icons/quest_icons/exploration/labyrinthe.webp",
    title: "Le Labyrinthe aux leviers",
    points: [
      { icon: "images/Maps/labyrinthe/salle_1.webp", text: "Il fait noir : tu ne vois que ta salle et celles qui s'ouvrent à côté. Touche une salle voisine pour avancer. Chaque pas coûte du Souffle." },
      { icon: "images/Maps/labyrinthe/levier.webp", text: "Un levier fait tourner des pans de mur : un passage s'ouvre, un autre se ferme. Le tirer encore remet tout comme avant. L'un des deux leviers de l'étage est gardé." },
      { icon: "images/Maps/labyrinthe/papier.webp", text: "Edda dessine la carte dans le coin. Ce que les leviers font tourner, même au loin, y est noté en violet. Touche une salle dessinée sur la grande carte pour y retourner." },
      { icon: "images/Maps/labyrinthe/escalier_bas.webp", text: "À l'escalier : descends pour un sac plus lourd, ou remonte avec tout ce que tu portes. Tomber ou t'essouffler en bas n'en garde que la moitié." },
      { icon: "images/Enemies/elite_contremaitre.webp", text: "Dès l'étage 2, le Contremaître te cherche. Tu l'entends avant de le voir : écoute de quel côté viennent ses pas." }
    ]
  },
  /* v3.638.0 (Faille, F-1) : première montée dans la faille, après la Question. */
  faille_first: {
    tab: "scene",
    condition: function () { var run = game.sceneRun; return !!(run && run.lab && run.kind === "faille" && run.status === "lab-map"); },
    icon: "images/Icons/quest_icons/exploration/faille.webp",
    title: "La faille",
    points: [
      { icon: "images/Maps/faille/salle_1.webp", text: "La faille se parcourt comme le Labyrinthe des Ruines : des salles dans le noir, des leviers qui font tourner des pans, du Souffle à chaque pas." },
      { icon: "images/Maps/faille/escalier_1.webp", text: "Elle n'a pas de fond. Chaque étage est plus dur que le précédent, et ton record est gardé. Redescends quand tu veux avec tout le sac : tomber ou t'essouffler n'en garde que la moitié." },
      { icon: "images/Boss/reflet.webp", text: "Tous les cinq étages, le Reflet garde l'escalier." },
      { icon: "images/Maps/faille/salle_3.webp", text: "Dès l'étage 2, chaque étage se souvient d'un monde, et son nom dit sa règle : la soif, la relève, le sommeil, la chaleur ou le miroir." },
      { icon: "images/Boss/silhouette.webp", text: "Dès l'étage 3, la forme au sol te suit. Elle ne se bat pas : si elle te rejoint, elle prend du Souffle et recule. Sa lumière froide te prévient quand elle approche." }
    ]
  },
  grimoire_rules: {
    icon: "images/Icons/system/grimoire.webp",
    title: "Le Grimoire de tactiques",
    points: [
      { icon: "images/Icons/system/grimoire.webp", text: "Le Grimoire programme ton combat automatique : si une situation se présente, ton héros joue l'action que tu as choisie en priorité." },
      { icon: "images/Icons/system/sort.webp", text: "Les règles sont lues dans l'ordre, de haut en bas. La première qui s'applique l'emporte." },
      { icon: "images/Icons/combat_status/counter.webp", text: "Une action marquée « ⚡ Contre » annule complètement l'attaque adverse. C'est le meilleur appariement possible pour cette situation." },
      { icon: "images/Icons/system/ascension.webp", text: "S'il n'y a aucune règle applicable, ton héros continue de se battre normalement — le Grimoire s'ajoute au comportement automatique, il ne le remplace pas." },
      { icon: "images/Icons/system/lock_closed.webp", text: "En combat, ton héros met de côté un peu de ressource pour garantir ton contre le plus prioritaire : il jouera moins d'actions coûteuses en attendant." },
      { icon: "images/Icons/quests/quest_resources.webp", text: "De nouvelles règles se débloquent en atteignant de nouveaux mondes pour la première fois." }
    ]
  },
  /* v3.704.0 (TUTO-16, atelier « Aides et récit », Seb A) : sept fiches de plus. Sans tab : ouvertes par
     openGenericTutorialOnce() à l'endroit qu'elles expliquent ; solo : jamais par-dessus une autre fenêtre. */
  tavern_contracts: {
    section: "village",
    icon: "images/Icons/village_buildings/tavern.webp",
    title: "Les contrats de la Taverne",
    points: [
      { icon: "images/Icons/village_buildings/tavern.webp", text: "La Taverne affiche des contrats : livre la quantité demandée d'une ressource de l'Entrepôt (« Livrer ») et touche l'or annoncé. C'est le débouché de ton surplus : l'Entrepôt ne rachète rien." },
      { icon: "images/Icons/system/hourglass_waiting.webp", text: "Le tableau se renouvelle toutes les 6 heures. Un contrat honoré reste barré jusque-là, et jamais deux contrats ne demandent la même ressource." },
      { icon: "images/Icons/system/upgrade.webp", text: "Chaque niveau ajoute un contrat (2 au niveau 1, 7 au niveau 6) et ouvre des commandes mieux payées : planches, puis lingots et pain, puis rations. Au niveau 6, tout est payé 15 % de plus." }
    ]
  },
  achievements_intro: {
    tab: "achievements", solo: true,
    icon: "images/Icons/menu_icons/achivment_menu.webp",
    title: "Les hauts faits",
    points: [
      { icon: "images/Icons/gold_icon.webp", text: "Un haut fait obtenu reste acquis, même si la carte recule ensuite. Touche « Réclamer » ou « Tout réclamer » pour toucher son or : une récompense unique, sans bonus permanent." },
      { icon: "images/Icons/achivement/palier.webp", text: "Dans chaque monde, 3, 6 puis 8 hauts faits réclamés ouvrent les paliers Bronze, Argent et Or, qui paient encore de l'or. Le palier Or donne un titre." },
      { icon: "images/Icons/menu_icons/achivment_menu.webp", text: "Le titre porté se choisit en tête de cet écran et s'affiche sous ton nom, dans Héros. Quelques hauts faits sont cachés : ils se révèlent une fois obtenus, et aucun ne peut se rater." }
    ]
  },
  bestiary_intro: {
    tab: "bestiary", solo: true,
    condition: function () { return typeof libraryActiveSub !== "function" || libraryActiveSub() === "bestiary"; },
    icon: "images/Icons/subtabs/bestiary.webp",
    title: "Le Bestiaire",
    points: [
      { icon: "images/Icons/subtabs/bestiary.webp", text: "Une créature entre au Bestiaire à ta première victoire contre elle ; avant, sa fiche dit déjà où la trouver. Touche une carte : ce qu'elle fait, ses PV, son attaque et combien de fois tu l'as vaincue." },
      { icon: "images/Icons/gold_icon.webp", text: "Vaincre souvent la même créature rapporte plus d'or, partout : +1 % à 10 victoires, +3 % à 50, +5 % à 100. Une élite ou un boss : +2, +5 puis +10 % dès 3, 10 et 25 victoires." },
      { icon: "images/Icons/menu_icons/achivment_menu.webp", text: "Rencontrer toutes les créatures d'un monde est un haut fait « Naturaliste » de ce monde ; 25, 50 et 100 % du Bestiaire en sont trois autres." }
    ]
  },
  companion_quests: {
    tab: "quests", solo: true,
    condition: function () { return !!(window.CompanionQuestManager && CompanionQuestManager.list().length > 0); },
    icon: "images/Icons/subtabs/companions.webp",
    title: "Les quêtes des compagnons",
    points: [
      { icon: "images/Icons/camp/topic_talk.webp", text: "Au feu du Camp, « Wenna veut te parler » : certaines conversations ouvrent une quête personnelle du compagnon." },
      { icon: "images/Icons/camp/topic_quest.webp", text: "Ses quêtes sont dans Quêtes › Alliés, une étape à la fois : donner des ressources, écouter une scène, ou réussir une Petite Aventure ou battre une élite au lieu marqué sur la carte, le compagnon dans l'équipe." },
      { icon: "images/Icons/companions/relics/relic_unique.webp", text: "La dernière étape donne sa relique unique, à équiper dans la fiche du compagnon (Héros › Alliés)." }
    ]
  },
  chaos_variant: {
    icon: "images/Icons/classes/chaos.webp",
    title: "La variante du Chaos",
    points: [
      { icon: "images/Icons/classes/chaos.webp", text: "Le Chevalier, le Rôdeur et le Sorcier du Chaos gardent leur classe : mêmes compétences, même ressource (Rage, Concentration, Mana), même caractéristique principale." },
      { icon: "images/Icons/classes/chaos.webp", text: "Seules leurs cinq caractéristiques de départ changent. L'aperçu (PV, ATK, DEF, VIT, CRIT) suit la case cochée : compare avant de choisir." },
      { icon: "images/Icons/system/lock_closed.webp", text: "La variante se choisit ici, à la création, et reste celle de ce héros. Tu pourras créer d'autres héros plus tard (Héros › Mes héros)." }
    ]
  },
  combat_forecast: {
    icon: "images/Icons/system/forecast.webp",
    title: "Le pronostic",
    points: [
      { icon: "images/Icons/combat_stats/stat_attack.webp", text: "Avant une mission, un donjon ou une élite de la carte, le pronostic compare tes dégâts et tes PV, potions comprises, à ceux de l'adversaire : Sans danger, Abordable, Risqué, Très difficile ou Hors de portée." },
      { icon: "images/Icons/combat_stats/stat_health.webp", text: "Au départ d'une mission, il ne t'arrête que si c'est Risqué ou pire, ou sous 60 % de tes PV : « Annuler » (ou « Me soigner ») ou partir quand même. Il écarte l'impossible, sans prédire l'issue." },
      { icon: "images/Icons/combat_status/heal_incoming.webp", text: "Un boss qui se soigne demande un minimum de dégâts par round (« il faut plus de N dégâts / round ») : en dessous, il est intuable. Monte tes caractéristiques ou ton équipement avant." }
    ]
  },
  sortie_prep: {
    icon: "images/Icons/system/sortie_prep.webp",
    title: "Préparer la sortie",
    points: [
      { icon: "images/Icons/system/sortie_prep.webp", text: "Avant une quête, un donjon ou une élite de la carte, cette feuille règle ce qui part avec toi. « Ce que tu vas affronter » dit si une règle ou un objet répond aux traits déjà connus." },
      { icon: "images/Icons/system/lock_closed.webp", text: "Le mode de combat choisi ici, Tactique ou Grimoire, reste figé jusqu'au retour au Campement. Pendant la sortie, tes PV ne remontent pas d'eux-mêmes." },
      { icon: "images/Icons/system/auto_repeat.webp", text: "« Réglages » : règles, objets et potions à boire avant de partir (une de chaque), pris au toucher de « Partir ». « Comme la dernière fois » reprend tes choix ; « Renoncer » ne lance rien." }
    ]
  },
  equipment_intro: {
    tab: "more", solo: true,
    condition: function () { return typeof activeHerosSubTab !== "undefined" && activeHerosSubTab === "equip" && (game.inventory || []).length > 0; },
    icon: "images/Icons/menu_icons/equip_menu.webp",
    title: "L'équipement",
    points: [
      { icon: "images/Icons/subtabs/equipment.webp", text: "Héros › Équipement : 7 emplacements autour de ta silhouette ; touche-en un pour comparer la pièce portée. Dans le Sac, une pastille par objet : ▲ mieux, ▼ moins bien, ⇅ des changements." },
      { icon: "images/Icons/equipment_slots/set_bonus.webp", text: "La couleur dit la rareté : gris Commun, vert Inhabituel, bleu Rare, violet Épique, doré Légendaire ; plus elle monte, plus la pièce a d'effets. 3 pièces portées de même rareté donnent un bonus de panoplie, 7 la panoplie complète." },
      { icon: "images/Icons/subtabs/inventory.webp", text: "Le Sac tient 25 objets ; plein, le suivant est offert d'office à l'Aether. Une pièce en trop s'offre (« Offrir ») : elle rend de l'Aether à la Mémoire, sauf si elle vient de l'échoppe." }
    ]
  }
};
window.GENERIC_TUTORIALS = GENERIC_TUTORIALS;

/* Étape d'Histoire réclamée : l'étape suivante est atteinte (chapitre fini ou passé compris). */
function storyStepClaimed(stepId) {
  if (!window.StoryQuestManager || !window.STORY_QUESTS) return true;
  var ids = Object.keys(STORY_QUESTS);
  for (var i = 0; i < ids.length; i++) {
    var steps = STORY_QUESTS[ids[i]].steps, k = steps.findIndex(function (s) { return s.id === stepId; });
    if (k === -1) continue;
    return steps[k + 1] ? StoryQuestManager.isStepReached(steps[k + 1].id) : (StoryQuestManager.getState(ids[i]).skipped || StoryQuestManager.isChapterCompleted(ids[i]));
  }
  return true;
}
window.storyStepClaimed = storyStepClaimed;

function maybeShowGenericTutorial(tabName) {
  if (pendingTutorial) return; // v3.107.12 : ne jamais écraser un popup déjà ouvert (même conteneur DOM)
  if (!game.genericTutorialsSeen || typeof game.genericTutorialsSeen !== "object") game.genericTutorialsSeen = {};

  /* v3.213.1 : un onglet peut porter PLUSIEURS tutoriels (le Village en a deux
     depuis le Terrain d'entraînement). On prend le premier candidat non vu
     dont la condition est remplie, au lieu du premier déclaré — sinon un
     tutoriel déjà vu masquerait définitivement les suivants. */
  var id = Object.keys(GENERIC_TUTORIALS).find(function (key) {
    var t = GENERIC_TUTORIALS[key];
    if (t.tab !== tabName) return false;
    if (game.genericTutorialsSeen[key]) return false;
    if (typeof t.condition === "function" && !t.condition()) return false;
    if (t.solo && tutorialOtherWindowOpen()) return false; // v3.704.0 (TUTO-16) : jamais par-dessus une autre fenêtre
    return true;
  });
  if (!id) return;
  var tut = GENERIC_TUTORIALS[id];

  pendingTutorial = { genericId: id, tutorial: tut };
  var host = document.getElementById("tutorial-modal-root");
  if (host) { host.innerHTML = buildTutorialModalHTML("closeGenericTutorialModal('" + esc(id) + "')", tut); wireTutorialHint(host); }
}
window.maybeShowGenericTutorial = maybeShowGenericTutorial;

/* v3.704.0 (TUTO-16) : une fenêtre (racine *-root de feuille ou de modale) est-elle ouverte, hors `allow` ? */
var TUTORIAL_SHEET_ROOTS = ["sortie-prep-root", "heros-sheet-root", "grimoire-sheet-root", "exp-sheet-root", "hero-selection-root", "full-menu-root"];
function tutorialOtherWindowOpen(allow) {
  if (!document.querySelectorAll) return false;
  var roots = [].slice.call(document.querySelectorAll('[id$="-modal-root"]'));
  TUTORIAL_SHEET_ROOTS.forEach(function (id) { var el = document.getElementById(id); if (el) roots.push(el); });
  return roots.some(function (el) { return el.id !== "tutorial-modal-root" && el.id !== allow && !!el.innerHTML.trim(); });
}
window.tutorialOtherWindowOpen = tutorialOtherWindowOpen;

/* v3.704.0 (TUTO-16) : ouvre une fiche générique jamais vue, au-dessus de la seule fenêtre `opts.allow` ;
   opts.after est appelé à « Compris », opts.noSave évite une sauvegarde (création du héros). Rend true si ouverte. */
function openGenericTutorialOnce(id, opts) {
  opts = opts || {};
  var tut = GENERIC_TUTORIALS[id], host = document.getElementById("tutorial-modal-root");
  if (!tut || pendingTutorial || !host || host.innerHTML) return false;
  if (!game.genericTutorialsSeen || typeof game.genericTutorialsSeen !== "object") game.genericTutorialsSeen = {};
  if (game.genericTutorialsSeen[id] || tutorialOtherWindowOpen(opts.allow)) return false;
  pendingTutorial = { genericId: id, tutorial: tut, after: opts.after || null, noSave: !!opts.noSave };
  host.innerHTML = buildTutorialModalHTML("closeGenericTutorialModal('" + esc(id) + "')", tut);
  wireTutorialHint(host);
  return true;
}
window.openGenericTutorialOnce = openGenericTutorialOnce;

function closeGenericTutorialModal(id) {
  if (!game.genericTutorialsSeen || typeof game.genericTutorialsSeen !== "object") game.genericTutorialsSeen = {};
  game.genericTutorialsSeen[id] = true;
  var was = pendingTutorial; // v3.704.0 : suite éventuelle (pronostic après sa fiche)
  pendingTutorial = null;
  var host = document.getElementById("tutorial-modal-root");
  if (host) host.innerHTML = "";
  if (!(was && was.noSave) && typeof saveGame === "function") saveGame();
  if (was && typeof was.after === "function") { was.after(); return; }
  // v3.469.2 : en aventure, la fenêtre suivante (la nuit du run) vient tout de suite, pas au prochain geste
  if (game.activeTab === "scene" && typeof maybeShowGenericTutorial === "function") maybeShowGenericTutorial("scene");
}
window.closeGenericTutorialModal = closeGenericTutorialModal;

/* v3.111.0 (Lot B) : popups pédagogiques des quêtes tutorielles du Village — même rendu
   (buildTutorialModalHTML), déclaré par quête dans data/village-quests.js (quest.tutorial),
   affiché à la première arrivée sur l'onglet cible pendant que la quête est la courante
   non réclamée. Persistance via VillageQuestManager (explorationProgression.villageQuests). */
function maybeShowVillageQuestTutorial(tabName) {
  if (pendingTutorial) return; // ne jamais écraser un popup déjà ouvert (même conteneur DOM)
  if (!window.VillageQuestManager) return;
  var quest = VillageQuestManager.getCurrentQuest();
  if (!quest || !quest.tutorial || quest.tutorial.tab !== tabName) return;
  if (!VillageQuestManager.isQuestAvailable(quest)) return; // v3.112.0 : chaîne en pause (prérequis)
  if (VillageQuestManager.isTutorialSeen(quest.id)) return;

  pendingTutorial = { villageQuestId: quest.id, tutorial: quest.tutorial };
  var host = document.getElementById("tutorial-modal-root");
  if (host) { host.innerHTML = buildTutorialModalHTML("closeVillageQuestTutorialModal('" + esc(quest.id) + "')", quest.tutorial); wireTutorialHint(host); }
}
window.maybeShowVillageQuestTutorial = maybeShowVillageQuestTutorial;

function closeVillageQuestTutorialModal(questId) {
  if (window.VillageQuestManager) VillageQuestManager.markTutorialSeen(questId);
  pendingTutorial = null;
  var host = document.getElementById("tutorial-modal-root");
  if (host) host.innerHTML = "";
}
window.closeVillageQuestTutorialModal = closeVillageQuestTutorialModal;
