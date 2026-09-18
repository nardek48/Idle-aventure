# v3.296.1 — Tap immédiat sur l'écran Combat (latence)

Retour de Seb après la v3.296.0 : les boutons répondent de nouveau, mais avec une grosse latence
à chaque clic. Cause : sur l'iPhone, le click natif ne vient presque jamais, donc chaque action
attendait les 450 ms du secours avant d'être jouée.

## Changement — `js/ui/tap-rescue.js`

- Le bouton est cliqué **dès que le doigt se relève** (tap net : moins de 10 px, moins de 800 ms).
  Plus aucune attente.
- Le click natif de ce même tap, s'il arrive quand même, est **absorbé** en phase de capture
  (fenêtre de 800 ms, à moins de 30 px du point de relâcher) : une seule action par tap.
- Un click natif ailleurs n'est jamais absorbé. Toujours limité à l'onglet Combat ; un bouton
  désactivé n'est jamais cliqué ; bouton remplacé pendant le toucher -> celui du même endroit.
- Le diagnostic tactile note chaque tap joué et chaque click absorbé.

## Contrôles

- round-harness : 0 échec, stable sur 3 passages (2 569-2 571 OK, [85] sautée). Section [91]
  réécrite (7 contrôles).
- boot-harness 4 OK ; hero-creation-harness 44 OK.
- Playwright, iPhone 13 (Chromium) : quatre taps sur ATTAQUER avec Wenna en Tactique = quatre
  étapes exactes (choix du héros, choix de Wenna, deux fois), quatre clicks natifs absorbés ; un
  tap sur Fuir = une seule fenêtre de confirmation ; click supprimé comme sur Safari : action
  jouée 26 ms après le relâcher.

## Fichiers

`js/ui/tap-rescue.js`, `js/core/constants.js`, `sw.js`, `round-harness.js`.

À appliquer après v3.296.0.
