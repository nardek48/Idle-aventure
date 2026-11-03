# v3.642.0 — Héros › Compagnons : phrase d'aide lisible

Correctif demandé par Seb le 03/11 (relevé pendant l'analyse des écrans Village et Héros).

## Ce qui change
- La phrase « Deux compagnons au maximum peuvent partir avec toi. Ils jouent après toi à chaque round. » était en brun foncé, posée directement sur le décor sombre : illisible. Elle passe en texte clair ombré, comme les autres textes posés sur le décor (`css/00-kbtn.css`).
- Balayage de contraste sur les 17 écrans principaux (Camp, Quêtes, Village, Héros, Carte) : c'était le seul texte illisible. Les titres de groupe des Ateliers (bronze sur le décor) restent lisibles, à revoir dans l'atelier Village et Héros.
- Une ligne dans « Quoi de neuf ».

## Fichiers
`css/00-kbtn.css`, `js/ui/news-view.js`, `js/lang/en.js`.

## Contrôles
`round-harness` 0 échec (deux passes) ; `boot-harness`, `hero-creation-harness` ; audit i18n 100 %. Capture Chromium (iPhone 390 px) : texte clair sur le décor.
