# v3.596.0 — Quoi de neuf : les nouveautés du Camp et de la Carte

Demande de Seb (31/10) : chaque mise à jour passe par la fenêtre « Quoi de neuf ».

## Ce qui change
- Trois lignes en tête de `newsEntries()` (`js/ui/news-view.js`), pour les v3.594.0 et v3.595.0 :
  - le Camp s'anime (la phrase du soir, les compagnons au coin du feu) ;
  - l'onglet « Le feu » ;
  - la Carte dans la barre du bas, et les donjons de tous les mondes atteints sans voyager.
- Elles portent le numéro 3.596.0 : la fenêtre ne montre que les versions plus récentes que la dernière vue sur l'appareil, et quiconque a déjà ouvert la v3.594.0 ou la v3.595.0 ne les aurait jamais vues sous leur vrai numéro.
- `CLAUDE.md` : la ligne « Quoi de neuf » devient une étape de la livraison d'une version.

## Code
- `js/ui/news-view.js` : trois entrées ; `js/lang/en.js` : leur anglais.
- Aucun fichier ajouté, aucun fichier protégé, aucun nouvel état.

## Contrôles
`round-harness` 5 615 OK, 0 échec (deux passes) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` 142 OK ; audit i18n 100 %, 0 orphelin. Fenêtre vérifiée sous Chromium à 390 × 844 (dernière version vue : 3.593.0).
