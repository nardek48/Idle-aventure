"use strict";
/* ui/coach-view.js — v3.761.0 : tutoriels SUR L'ÉCRAN (atelier tutoriels-ecran.html, Seb 10/11 : bulle A, « Suivant » ou toucher).
   L'écran s'assombrit, l'élément réel est éclairé, une bulle par étape. Rendu dans #tutorial-modal-root (le combat attend).
   Repli sur la fenêtre classique si moins de deux étapes trouvent leur élément, ou en format large. */

/* Étapes par tutoriel (id d'étape d'Histoire ou de tutoriel générique). sel : sélecteur CSS (le premier élément visible) ;
   prepare : geste fait avant de mesurer (onglet à montrer). Textes tirés des tutoriels d'origine, raccourcis. */
/* Lot 3 : la feuille du Champs, onglet des zones (quêtes du Champs). */
function coachOpenFarmZones() {
  if (typeof setVillageSubTab === "function") setVillageSubTab("production");
  if (typeof openProductionBuildingDetail === "function") openProductionBuildingDetail("farm");
  if (typeof setProductionSheetTab === "function") setProductionSheetTab("zones");
}

/* Lot 4 : la carte vivante du monde, ouverte (le soir qui tombe d'abord refermé). */
function coachOpenLivingMap(worldId) {
  return function () {
    var night = document.getElementById("world-night-root"); if (night) night.innerHTML = "";
    var m = window.LivingMapManager && LivingMapManager.getMapForWorld(worldId);
    if (m && typeof openLivingMap === "function") openLivingMap(m.id);
  };
}
function coachOpenProduction() { if (typeof setVillageSubTab === "function") setVillageSubTab("production"); }
function coachOpenAllies() { if (typeof setHerosSubTab === "function") setHerosSubTab("companions"); }

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
      { sel: ".village-tabs .village-tab:nth-child(3)", title: _t("Les Ateliers"), text: _t("Ils transforment le brut en matériaux : le bois devient planche, le fer devient lingot.") }
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
      { sel: "#pa2-bag", title: _t("Ta besace"), text: _t("« Ajouter des objets » : rations ou objets. Chacun a un avantage (en vert) et souvent un prix (en rouge). Les rations sont gratuites : seule la place compte.") },
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
  forest_08: { // v3.788.0 (Seb 13/11) : « Le repas », au Camp (la Cuisine de camp est retirée)
    prepare: function () { if (typeof setCampTab === "function") setCampTab("feu"); },
    steps: [
      { sel: ".camp-rings", title: _t("Ton équipe"), text: _t("Les anneaux disent les PV de tes compagnons. Touche-en un pour lui parler.") },
      { sel: ".camp-acts .camp-act:first-child", title: _t("Le repas"), text: _t("Toute l'équipe à plein, tout de suite. Il se paie en blé, viande et eau, selon les PV qui manquent.") },
      { sel: ".camp-acts .camp-act:nth-child(2)", title: _t("Le festin"), text: _t("+10 % de dégâts et de PV pour 3 sorties. Plus cher : garde-le pour un boss.") }
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
      { sel: ".camp-embers-item:nth-child(2)", title: _t("La viande et l'eau"), text: _t("15 Viandes de la Chasse, 10 Eau du Puits : elles arrivent seules à l'Entrepôt.") },
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
  /* Lot 2 (Seb 13/11) : écrans du Désert (silence, outre, nuée, Forge) et génériques (pronostic, équipement, nuit et pièges, Terrain). */
  desert_02: {
    steps: [
      { sel: ".cbx-badges", title: _t("Ses traits"), text: _t("Touche-les pour lire ce que fait l'ennemi. Un Silencieux annonce son silence sous sa barre de vie : s'il va au bout, tes compétences sont bloquées 2 rounds.") },
      { sel: ".cbx-skills .cbx-skill:last-child", title: _t("Ta Défense"), text: _t("Jouée au bon moment, elle empêche le silence.") },
      { sel: ".cbx-rule", title: _t("En Grimoire"), text: _t("La condition « L'ennemi va te réduire au silence » joue ta Défense à ta place.") },
      { sel: ".cbx-card.is-hero", title: _t("Ce qui reste"), text: _t("Ton attaque de base, ta Défense et Wenna ne sont jamais réduites au silence.") },
      { sel: ".cbx-pot", title: _t("Tes potions"), text: _t("Au Désert, les bêtes encaissent plus et frappent moins : les combats sont longs, garde tes potions pour la fin.") }
    ]
  },
  desert_03: {
    prepare: function () { if (typeof setVillageSubTab === "function") setVillageSubTab("shops"); },
    steps: [
      { sel: "#wk-tile-reservoir", title: _t("Le Réservoir"), text: _t("Un atelier du Puits : il change ton eau en Outres pleines. Touche-le pour en fabriquer.") },
      { sel: "#wk-tile-reservoir .wk-tile-recipe", title: _t("La recette"), text: _t("16 Eau et 2 Viandes donnent une Outre pleine.") },
      { sel: ".village-tabs .village-tab:nth-child(4)", title: _t("Avant de partir"), text: _t("L'Outre attend à l'Entrepôt. Au Désert, chaque pas coûte du Souffle : mets-en une dans ta besace, elle t'en rend quand tu en manques.") }
    ]
  },
  desert_10: {
    steps: [
      { sel: ".cbx-foe.is-target", title: _t("Ta cible"), text: _t("Touche un ennemi pour le cibler : sa vie s'affiche en haut.") },
      { sel: ".cbx-foe:not(.is-target)", title: _t("La nuée"), text: _t("Les scarabées vont par trois, les guerriers des sables par deux. Une nuée tue par le nombre de ses coups : chaque bête abattue en retire un.") },
      { sel: ".cbx-ctx", title: _t("Le compteur"), text: _t("Dans cette quête, un groupe compte pour une seule rencontre.") },
      { sel: ".cbx-rule", title: _t("En Grimoire"), text: _t("La condition « Ils sont plusieurs » règle ton kit face à un groupe.") }
    ]
  },
  desert_13: {
    prepare: function () { if (typeof setHerosSubTab === "function") setHerosSubTab("equip"); },
    steps: [
      { sel: ".hs-eslot.pin-helmet", title: _t("Tes pièces"), text: _t("Construis la Forge au Village, puis reforge ton arme une fois. Chaque reforge renforce ton héros pour toujours : au Désert, +0,5 % de PV max.") },
      { sel: ".hs-edetail", title: _t("Le niveau de reforge"), text: _t("La Forge 1 ouvre deux reforges par emplacement, la Forge 2 quatre (le Verre trempé la construit). Le niveau reste à l'emplacement quand tu changes de pièce.") },
      { sel: ".hs-subseg button:nth-child(2)", title: _t("Des pièces vertes"), text: _t("Les pièces Inhabituelles aident aussi : élites de la Forêt, heaume du guet, donjon, boutique, Petites Aventures. Rien ne l'exige : le pronostic dit si un combat est trop dur.") }
    ]
  },
  combat_forecast: {
    steps: [
      { sel: ".cf-verdict", title: _t("Le pronostic"), text: _t("Il compare tes dégâts et tes PV, potions comprises, à ceux de l'adversaire : Sans danger, Abordable, Risqué, Très difficile ou Hors de portée.") },
      { sel: ".cf-rows", title: _t("Le détail"), text: _t("Un boss qui se soigne demande un minimum de dégâts par round : en dessous, il est intuable. Monte tes caractéristiques ou ton équipement avant.") },
      { sel: ".cf-card .kwin-foot", title: _t("Partir ou non"), text: _t("Il ne t'arrête que si c'est Risqué ou pire, ou sous 50 % de tes PV. Il écarte l'impossible, sans prédire l'issue.") }
    ]
  },
  equipment_intro: {
    steps: [
      { sel: ".hs-eslot.pin-helmet", title: _t("Tes emplacements"), text: _t("Sept autour de ta silhouette. Touche-en un pour voir la pièce portée et la comparer.") },
      { sel: ".hs-edetail", title: _t("La pièce portée"), text: _t("La couleur dit la rareté : gris, vert, bleu, violet, doré. Plus elle monte, plus la pièce a d'effets ; 3 pièces de même rareté donnent un bonus.") },
      { sel: ".hs-subseg button:nth-child(2)", title: _t("Le Sac"), text: _t("25 objets au plus, une pastille par objet : ▲ mieux, ▼ moins bien. Une pièce en trop s'offre à l'Aether ; plein, le suivant y part tout seul.") }
    ]
  },
  pa2_night: {
    steps: [
      { sel: ".pa2-cond .pa2-kicker", title: _t("La nuit du run"), text: _t("Chaque petite aventure a sa nuit : brouillard, orage, pillards… Elle vaut pour tout le run.") },
      { sel: ".pa2-cond .pa2-pro", title: _t("Ce qu'elle apporte"), text: _t("En vert, son avantage.") },
      { sel: ".pa2-cond .pa2-con", title: _t("Ce qu'elle coûte"), text: _t("En rouge, son prix. Une nuit sur cinq est calme : rien ne change.") },
      { sel: ".pa2-nightitem", title: _t("L'objet de la nuit"), text: _t("L'étoile ★ marque l'objet qui t'aidera le plus. En route, la pastille dorée en haut de l'écran te rappelle la nuit.") }
    ]
  },
  pa2_traps: {
    steps: [
      { sel: ".pa2-trap", noHit: true, title: _t("Un piège"), text: _t("Un losange rouge sur un sentier. Son icône dit ce qu'il fait : venin, alarme, entrave, aveuglement ou besace percée. La torche montre les pièges cachés.") },
      { sel: ".pa2-trap", noHit: true, title: _t("Sur un piège"), text: _t("Désamorcer (un dé ; raté, il joue et te blesse), la Trousse (à coup sûr), Subir (sans blessure) ou Rebrousser (10 Souffle). Ses effets s'affichent en rouge en haut.") },
      { sel: ".pa2-cut", title: _t("Un sentier coupé"), text: _t("Rond gris barré : coupé pour ce run. Il reste toujours un autre chemin.") }
    ]
  },
  village_training: {
    prepare: function () { if (typeof setVillageSubTab === "function") setVillageSubTab("buildings"); },
    steps: [
      { sel: ".vb-card[onclick*=\"'training'\"]", title: _t("Le Terrain d'entraînement"), text: _t("Sans lui, ta caractéristique de classe et l'Endurance butent à 20, les trois autres à 14. Il se bâtit ici, comme l'Atelier, et chaque niveau relève les cinq plafonds.") },
      { sel: ".village-tabs .village-tab:first-child", title: _t("Un chantier à la fois"), text: _t("Bâtir ou monter un niveau, c'est un chantier : des matériaux, puis un peu de temps. Le village n'en mène qu'un à la fois.") },
      { sel: ".tab-btn[data-tab=\"more\"]", title: _t("L'entraînement"), text: _t("Il se paie toujours en or, dans Héros › Entraînement. Le Terrain dit jusqu'où monter, pas combien ça coûte.") }
    ]
  },
  /* Lot 3 (Seb 13/11) : les quêtes du village (data/village-quests.js), la feuille du Champs ou les Ateliers ouverts. */
  farm_second_plot: {
    prepare: coachOpenFarmZones,
    steps: [
      { sel: ".pc3-list .pc3:first-child", title: _t("Tes zones"), text: _t("Chaque bâtiment a 3 zones, les Parcelles au Champs. La première est ouverte ; les deux autres s'ouvrent contre des ressources.") },
      { sel: ".pc3-list .pc3:nth-child(2)", title: _t("Une autre zone"), text: _t("Chacune produit en continu, avec son propre stock. Rapide, équilibrée ou lente : une zone lente stocke davantage, pratique si tu récoltes rarement.") },
      { sel: ".pc3-list .pc3:nth-child(2) .pc3-act", title: _t("Son prix"), text: _t("Le Champ Béni coûte du bois et de la pierre : la Scierie et la Carrière nourrissent le Champs. Chaque bâtiment nourrit les autres.") }
    ]
  },
  farm_level_two: {
    prepare: coachOpenFarmZones,
    steps: [
      { sel: ".pc3-list .pc3:first-child .pc3-meta", title: _t("Son niveau"), text: _t("Jusqu'au 5 en Forêt, plus haut dans les mondes suivants. Chaque niveau monte la production et le stock de la zone.") },
      { sel: ".pc3-list .pc3-act", title: _t("Monter d'un niveau"), text: _t("Au Champs, du bois et de l'eau. Le coût grimpe un peu à chaque niveau (×1,15).") },
      { sel: ".pc3-auto", title: _t("L'achat automatique"), text: _t("Il monte pour toi la zone la moins chère. Conseil : d'abord celle que tu récoltes le plus souvent.") }
    ]
  },
  farm_improvement: {
    prepare: coachOpenFarmZones,
    steps: [
      { sel: ".pc3-list .pc3:first-child .pc3-main", title: _t("Les améliorations"), text: _t("Touche une zone : sa fenêtre propose « Terre enrichie » (+8 %) et « Sillon irrigué » (+10 %). Une fois par zone, pour toujours.") },
      { sel: ".pc3-list .pc3:first-child .pc3-bar", title: _t("Elles se cumulent"), text: _t("Entre elles et avec les niveaux : une parcelle niveau 5, enrichie et irriguée, est la meilleure terre d'Aeswyn. Aucun piège, c'est toujours un gain.") },
      { sel: ".prod-sheet .ksheet-title", title: _t("Partout pareil"), text: _t("Tous les bâtiments ont leurs deux améliorations, sous d'autres noms : ce que tu apprends ici vaut pour la Scierie, la Mine et les autres.") }
    ]
  },
  workshop_materials: {
    prepare: function () { if (typeof setVillageSubTab === "function") setVillageSubTab("shops"); },
    steps: [
      { sel: "#wk-tile-scierie_fine", title: _t("La Scierie fine"), text: _t("Un atelier transforme le brut : 5 bois donnent 1 planche. Touche-le pour fabriquer.") },
      { sel: "#wk-tile-scierie_fine .wk-tile-recipe", title: _t("Intrants et produit"), text: _t("Les intrants sont pris dès que tu lances ; le produit arrive à la fin du temps de fabrication. Les lots s'enchaînent seuls, même hors ligne.") },
      { sel: "#wk-tile-fonderie", title: _t("La Fonderie"), text: _t("À la Mine, 5 fer donnent 1 lingot. Planches et lingots améliorent les ateliers et bâtissent le village : garde-en d'avance.") },
      { sel: "#prod-queues-btn", title: _t("Les files"), text: _t("En mode Continu, une recette se relance dès que les ingrédients sont là. « Files » montre tout ce qui tourne.") }
    ]
  },
  workshop_level_two: {
    prepare: function () { if (typeof setVillageSubTab === "function") setVillageSubTab("shops"); if (typeof openWorkshopSheet === "function") openWorkshopSheet("scierie_fine"); },
    steps: [
      { sel: ".wk-sheet .ksheet-title", title: _t("Chacun son niveau"), text: _t("Chaque atelier monte seul (2 en Forêt, 3 ensuite) : la Scierie fine ne change rien à la Menuiserie.") },
      { sel: ".wk-queue", title: _t("La file"), text: _t("Sa taille est égale au niveau de l'atelier, et chaque niveau ôte 8 % au temps de fabrication.") },
      { sel: ".wk-up-row", title: _t("Améliorer"), text: _t("Le coût se paie en planches et lingots, ×1,4 par niveau. Conseil : d'abord l'atelier qui tourne le plus.") }
    ]
  },
  /* Lot 4 (option B, Seb 13/11) : écrans des Ruines et de la Crypte. */
  ruines_03: {
    prepare: coachOpenAllies,
    steps: [
      { sel: ".hs-comp .cp-seg", title: _t("Deux sur trois"), text: _t("Trois compagnons, mais deux seulement en combat. Choisis-les ici, avant de partir.") },
      { sel: ".hs-comp:last-child", title: _t("Celui qui reste"), text: _t("Il garde le camp, et peut partir en patrouille.") },
      { sel: ".hs-comp .hs-comp-head", title: _t("Chacun sa place"), text: _t("Wenna soigne, Maddoc tient ou frappe de loin, Edda achève ceux qui veulent se relever.") }
    ]
  },
  ruines_04: {
    prepare: coachOpenProduction,
    steps: [
      { sel: ".prod-tile[onclick*=\"'farm'\"]", title: _t("Le blé"), text: _t("Sarkel veut garnir les étals : 150 Blé, des Champs.") },
      { sel: ".prod-tile[onclick*=\"'quarry'\"]", title: _t("La pierre"), text: _t("Et 100 Pierre, de la Carrière. La Production les fournit.") },
      { sel: ".tab-btn[data-tab=\"campement\"]", title: _t("Livrer au Marché"), text: _t("Depuis la carte d'étape, au Camp. Le marché paie en or, et en Pierres errantes, la pierre des Ruines.") }
    ]
  },
  ruines_06: {
    steps: [
      { sel: ".pa2-prep .pa2-hook", title: _t("Les murs bougent"), text: _t("Aux Ruines, la nuit, les passages changent : un chemin devant toi peut se fermer, et un autre s'ouvrir.") },
      { sel: ".pa2-prep .pa2-addbig", title: _t("La Craie d'Edda"), text: _t("Elle se met dans ta besace sans rien coûter : chaque trait empêche un mur de bouger près de toi.") },
      { sel: ".pa2-go", title: _t("La Pierre errante"), text: _t("Elle se trouve dans les trouvailles et aux destinations. Elle n'est jamais perdue.") }
    ]
  },
  ruines_07: {
    prepare: coachOpenLivingMap("ruins"),
    steps: [
      { sel: ".lm-node.is-voile:not(.is-far):not(.is-chantier)", title: _t("Un quartier"), text: _t("Comme au Désert : tu le libères en terminant sa Petite Aventure, ou en battant l'élite qui le garde.") },
      { sel: ".lm-node.is-chantier", title: _t("Le chantier"), text: _t("Chaque jour, la cité rebâtit un quartier. Il change de place à chaque nuit, même sur un quartier libéré. Le libérer rapporte des Pierres errantes.") },
      { sel: ".lmx-pill.is-pal", noHit: true, title: _t("L'Éboulement"), text: _t("Un échec sur un quartier libéré le fait retomber : c'est l'Éboulement. La Palissade d'Aeswyn le freine.") }
    ]
  },
  ruines_16: {
    prepare: coachOpenLivingMap("ruins"),
    steps: [
      { sel: ".lm-node[onclick*=\"'coeur'\"]", title: _t("Le Cœur"), text: _t("Un quartier nouveau est apparu au centre de la carte des Ruines.") },
      { sel: ".lm-node[onclick*=\"'place_etals'\"]", title: _t("Ses trois voisins"), text: _t("Il s'ouvre quand les trois quartiers qui le touchent sont libérés : la place aux étals, la rue qui tourne et les couloirs couverts.") },
      { sel: ".lm-node.is-chantier", title: _t("Pas de chantier"), text: _t("Le chantier errant ne se pose jamais sur le Cœur.") }
    ]
  },
  crypte_03: {
    prepare: coachOpenAllies,
    steps: [
      { sel: ".hs-comp .cp-seg", title: _t("Deux sur quatre"), text: _t("Quatre compagnons, deux seulement en combat : choisis-les ici, avant de partir.") },
      { sel: ".hs-comp:last-child", title: _t("Ysolt"), text: _t("Elle garde le sommeil : une fois par combat, elle retarde le réveil d'un dormeur.") },
      { sel: ".hs-comp .hs-comp-head", title: _t("Ceux qui restent"), text: _t("Ils gardent le camp, et peuvent partir en patrouille.") }
    ]
  },
  crypte_04: {
    prepare: coachOpenProduction,
    steps: [
      { sel: ".prod-tile[onclick*=\"'farm'\"]", title: _t("Le blé"), text: _t("Sarkel veut du blé pour la pierre plate : 200 Blé, des Champs.") },
      { sel: ".village-tabs .village-tab:nth-child(4)", title: _t("Ton Entrepôt"), text: _t("Le blé récolté y attend. Garde-en assez.") },
      { sel: ".tab-btn[data-tab=\"campement\"]", title: _t("Livrer au Marché"), text: _t("Depuis la carte d'étape, au Camp. Les morts laissent de l'or et des Cires de sépulcre en échange.") }
    ]
  },
  crypte_06: {
    steps: [
      { sel: ".pa2-prep .pa2-hook", title: _t("L'obscurité"), text: _t("Dans la Crypte, la Petite Aventure se fait dans le noir : tu ne vois que la rangée devant toi.") },
      { sel: ".pa2-prep .pa2-addbig", title: _t("La Lanterne de Sarkel"), text: _t("Elle se met dans ta besace sans rien coûter. Allumée, elle montre deux rangées de plus pendant quelques pas.") },
      { sel: ".pa2-go", title: _t("Le gardien dort"), text: _t("Fais le tour, ou réveille-le pour son coffre : plus dur, plus riche. La Cire de sépulcre se trouve en route, jamais perdue.") }
    ]
  },
  crypte_07: {
    prepare: coachOpenLivingMap("crypt"),
    steps: [
      { sel: ".lm-node.is-voile:not(.is-far)", title: _t("Un couloir"), text: _t("Comme aux Ruines : tu le libères en terminant sa Petite Aventure, ou en battant l'élite qui le garde.") },
      { sel: ".lm-node.is-voile:not(.is-far)", title: _t("Ses gisants"), text: _t("Avant de partir, tu choisis : les laisser (plus facile, moins riche) ou les réveiller (plus dur, plus de Cire). Un échec réveille le couloir jusqu'à la prochaine nuit.") },
      { sel: ".lm-node.is-village", title: _t("La Veillée"), text: _t("Le Marché de la Crypte est sur la carte, à côté de la Veillée.") }
    ]
  },
  /* Lot 5 (option B, Seb 13/11) : écrans de la Montagne et de la Tour. */
  montagne_06: {
    steps: [
      { sel: ".pa2-prep .pa2-hook", title: _t("Le sol qui brûle"), text: _t("À la Montagne, certaines cases brûlent : y marcher coûte du Souffle. À chaque pas, la lave avance d'une rangée.") },
      { sel: ".pa2-prep .pa2-addbig", title: _t("La Pierre froide"), text: _t("La Pierre de Sarkel se met dans ta besace sans rien coûter. Posée, elle te fait traverser une case brûlante sans dommage, quelques fois par parcours.") },
      { sel: ".pa2-go", title: _t("Veines et gardien"), text: _t("Tailler une veine rapporte de la Cendre vive, mais la lave avance plus vite. Au bout, le gardien trie : rien taillé, il te laisse passer ; taillé, il se bat pour son coffre.") }
    ]
  },
  montagne_07: {
    prepare: coachOpenLivingMap("mountain"),
    steps: [
      { sel: ".lm-node.is-voile:not(.is-far)", title: _t("Un secteur"), text: _t("Comme à la Crypte : tu le libères en terminant sa Petite Aventure, ou en battant l'élite qui le garde.") },
      { sel: ".lm-node.is-voile:not(.is-far)", title: _t("Sa veine"), text: _t("Avant de partir, tu choisis : la tailler (plus de Cendre vive, mais le secteur chauffe et ses combats durcissent) ou la laisser (plus facile, moins riche).") },
      { sel: ".lm-node.is-elite", title: _t("La coulée"), text: _t("Une Petite Aventure ratée recouvre le secteur de lave jusqu'à la prochaine nuit. Une élite perdue, elle, se retente le jour même.") }
    ]
  },
  tour_06: {
    prepare: coachOpenLivingMap("tower"),
    steps: [
      { sel: ".lm-node.is-voile", title: _t("Un étage"), text: _t("La carte de la Tour est en coupe : un étage par secteur. Tu le libères en terminant sa Petite Aventure.") },
      { sel: ".lmx-pill.is-title", noHit: true, title: _t("Les mondes"), text: _t("Chaque étage se souvient d'un monde : ses obstacles viennent du Désert, des Ruines, de la Crypte ou de la Montagne.") },
      { sel: ".lm-node.is-village", title: _t("La redite"), text: _t("Une Petite Aventure ratée, et la Tour refait l'étage : plus dur jusqu'à la prochaine nuit (toutes les 3 sorties). Rien n'est perdu.") }
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
    if (!document.elementFromPoint || st.noHit) return true; // noHit : élément de décor (pointer-events: none), pas de test de toucher
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
      // lot 3 : hors écran OU couvert (bandeau collant d'un écran défilé) : on le recentre
      if (el && el.scrollIntoView) { var r0 = self._rect(st); if (r0 && (!self._onScreen(r0) || !self._onTop(st))) { try { el.scrollIntoView({ block: "center" }); } catch (e) { noteErreur("coach.scroll", e); } } }
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
    if (el && el.scrollIntoView) { var r0 = this._rect(st); if (r0 && (!this._onScreen(r0) || !this._onTop(st))) { try { el.scrollIntoView({ block: "center" }); } catch (e) { noteErreur("coach.scroll", e); } } }
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
