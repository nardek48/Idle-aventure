# v3.296.0 — Secours de tap sur l'écran Combat (bug iPhone)

## Ce que le diagnostic v3.295.0 a montré

Capture de Seb sur iPhone, chasse avec Wenna, mode Tactique : deux actions passent
(`heroAction(basic) = true` deux fois), puis chaque tap sur **Fuir** produit `touchstart`,
`pointerdown`, `pointerup` et `touchend` **sur le bouton**, mais **aucun `click`**. Safari ne
délivre plus le click ; les `onclick` des boutons ne sont donc jamais appelés. Le moteur, lui,
accepte le tour (« tour : OK »). Chromium délivre le click dans la même séquence : le bug est
propre à WebKit.

## Correctif de contournement — `js/ui/tap-rescue.js` (nouveau)

Limité à l'onglet Combat :
- un tap net (moins de 10 px de déplacement, moins de 800 ms) qui se termine sur un bouton arme
  un secours ;
- si aucun click natif n'arrive sur ce bouton dans les 450 ms, le code le clique ;
- si le bouton a été remplacé par un nouveau rendu entre le toucher et le relâcher, c'est le
  bouton présent au même endroit qui est cliqué ;
- un click natif qui arrive annule le secours : **jamais de double action** ;
- un bouton désactivé n'est jamais cliqué ; hors de l'écran Combat, rien ne change.

La cause profonde n'est pas encore établie. Le diagnostic reste en place pour la trouver.

## Diagnostic tactile enrichi

- Chaque bouton reçoit un numéro stable (`n1`, `n2`…) : deux numéros différents entre
  `touchstart` et `touchend` indiquent que le bouton a été remplacé pendant le toucher ;
  `(détaché)` signale un nœud déjà retiré de la page.
- Chaque secours déclenché apparaît en ligne `★ SECOURS n°…`, avec « bouton remplacé » le cas
  échéant. Un click natif arrivé ailleurs que sur le bouton tapé est aussi signalé.

## Contrôles

- round-harness : 0 échec, stable sur 3 passages (2 568-2 570 OK, [85] sautée). Nouvelle
  section **[91]** (6 contrôles).
- boot-harness 4 OK ; hero-creation-harness 44 OK.
- Playwright, iPhone 13 (Chromium), quatre cas vérifiés :
  - taps normaux : aucun secours, une seule fenêtre « Fuir ? » ;
  - click supprimé sur ATTAQUER : secours, le choix de Wenna est joué une fois ;
  - click supprimé et bouton Fuir remplacé pendant le toucher : secours sur le nouveau bouton ;
  - hors combat : aucun secours.

Aucun fichier protégé modifié.

## Fichiers

Nouveau : `js/ui/tap-rescue.js`. Modifiés : `js/ui/debug-touch-view.js`, `index.html`, `sw.js`,
`js/core/constants.js`, `round-harness.js`.

À appliquer après v3.295.0.
