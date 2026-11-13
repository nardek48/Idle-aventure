# v3.792.0 — Tutoriels sur l'écran, lot 5 : Montagne et Tour (13/11/2026)

Chantier des tutoriels sur l'écran, option B (choix A), lot 5 et dernier. Aucun fichier protégé modifié, aucun changement de sauvegarde, aucun fichier ajouté.

## Ce qui change (`js/ui/coach-view.js`)
- montagne_06 « Le sol qui brûle » : préparation de la Petite Aventure, Pierre froide, veines et gardien.
- montagne_07 « Les veines de la carte » : secteur, veine, coulée (carte vivante).
- tour_06 « Les étages » : un étage, les mondes, la redite (carte en coupe).
- **Fin du chantier** : 40 tutoriels sur l'écran. Les mécaniques d'ennemis, les fiches de donjon, les conseils de la Forge et le récit gardent la fenêtre (CLAUDE.md mis à jour).
- **Traductions** : 16 textes nouveaux.
- **Doublons** : 4 clés anglaises que l'outil d'ajout avait doublées sont retirées, les traductions d'origine sont gardées. L'outil n'ajoute plus que les textes manquants. Les 16 doublons plus anciens du fichier ne sont pas touchés : la dernière valeur l'emporte, sans effet visible.

## Signalé à Seb (non corrigé)
- Petites Aventures de la **Montagne et de la Tour** : `pa2Words` (`ui/pa2-view.js`) n'a pas leurs textes. Elles reprennent ceux de la Forêt : « Entrer dans la forêt », « Écouter la forêt », « … reste dans la forêt », « Prendre la lanterne qui t'attend ».

## Contrôles
- `round-harness` 7080 OK, 0 échec ([513] 40 tutoriels).
- boot 4 OK ; création du héros 46 OK ; i18n 100 %, 0 orphelin.
- Captures iPhone des 3 tutoriels : toutes sur l'écran, 3 bulles chacune (`captures/lot2-planches/lot5-planche.png`).
- Quoi de neuf : une ligne (FR + EN).
