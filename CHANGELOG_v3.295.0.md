# v3.295.0 — Diagnostic tactile du combat (bug iPhone)

Bug remonté par Seb (18/09/2026) : sur iPhone, dans **tous** les combats, les boutons ne
répondent plus, Fuir compris ; le menu du bas répond. Présent au moins depuis la v3.292.0.

**Ce lot ne corrige pas le bug : il le mesure.** Il n'a pas été reproduit :
- en émulation iPhone (Chromium, Playwright, tap tactile réel) : aucun élément ne recouvre les
  boutons, le tap sur ATTAQUER joue le round ;
- au harnais : 270 combats complets avec Wenna en Tactique (trois classes, six quêtes, chasse,
  élites) sans blocage ni exception.
WebKit (le moteur de Safari) n'est pas disponible dans l'environnement de test. D'où cet outil,
à activer sur le téléphone.

## 1. Diagnostic tactile — `js/ui/debug-touch-view.js` (nouveau)

Un bandeau en haut de l'écran, qui ne capte aucun toucher (`pointer-events: none`) :
- ligne 1 : version, onglet, run en cours, mode de combat ;
- ligne 2 : **pourquoi un tour serait refusé**, dans l'ordre de `isHeroTurnAvailable` :
  aucun ennemi, mauvais onglet, fenêtre ouverte (laquelle), héros à terre, round bloqué ;
- chaque appel à `CombatEngine.heroAction` et son résultat ;
- les 8 derniers événements (touchstart, touchend, pointerdown, pointerup, click) avec la cible
  réelle **et l'élément réellement au premier plan** s'ils diffèrent ;
- les 3 dernières erreurs JavaScript, avec fichier et ligne.

Activation : **Paramètres › Admin › Diagnostic combat**, ou `?debug=touch` dans l'adresse.
Le réglage vit dans `localStorage`, jamais dans la sauvegarde.

## 2. Sortie de secours

Même carte Admin : **Quitter le combat en cours**. Ferme le run quel qu'il soit (aventure,
chasse, donjon, élite de carte, scène) par ses sorties existantes, sans `confirm()`, libère
l'état du round et ramène au Campement.

## Contrôles

- round-harness : 0 échec, stable sur 3 passages (2 561-2 562 OK, [85] sautée). Nouvelle
  section **[90]**.
- boot-harness 4 OK ; hero-creation-harness 44 OK.
- Playwright (iPhone 13, Chromium) : bandeau rendu, tap sur ATTAQUER tracé de bout en bout,
  sortie forcée vérifiée, aucune erreur de page.

Aucun fichier protégé modifié.

## Fichiers

Nouveau : `js/ui/debug-touch-view.js`. Modifiés : `js/ui/admin-view.js`, `index.html`, `sw.js`,
`js/core/constants.js`, `round-harness.js`.

À appliquer après v3.293.0 et v3.294.0.
