# v3.538.0 — « Texte grand » et titre de page à 18 px (audit, lot 10 : ERG-11 A, INT-11 B)

Décisions de Seb (« 1A et 2B ») sur l'atelier `atelier/taille-texte.html`.

## Ce qui change en jeu
- **Taille du texte (ERG-11, option A)** : nouvelle carte « Taille du texte » dans Paramètres › Appareil, avec deux choix, « Normale » et « Grande ».
  - « Grande » agrandit de 12 % les pages, les feuilles et les fenêtres.
  - Le bandeau du haut, la barre du bas, les bulles et l'écran de combat gardent leur taille. Le combat reste calé au pixel.
  - Le réglage est propre à l'appareil : il est rangé dans les préférences, hors de la sauvegarde.
- **Titre de page (INT-11, option B)** : le titre en tête du cadre (« Campement », « Village », « Hauts faits »…) passe de 15 à 18 px, aussi au format large (il y était à 16 px). Rien d'autre ne change.
- L'échelle complète (option A d'INT-11) n'est pas faite : elle pourra venir plus tard, écran par écran.

## Code
- `systems/prefs-system.js` : préférence `textSize` (« normal » par défaut).
- `ui/desktop-scale.js` : `textBig`, `setTextSize`, et la classe `html.text-big`.
- `ui/settings-view.js` : la carte du réglage.
- `css/07-responsive.css` : `zoom: 1.12` sur `#panel-container` et les racines `*-modal-root` et `*-sheet-root`.
- `css/00-kbtn.css` et `css/09-wide.css` : `.kf-title` à 18 px.
- `en.js` : 4 textes.
- Harnais [356].
- Aucun état sauvegardé, aucun fichier protégé ni ajouté.

## Contrôles
- Round : 5 379 OK, 0 échec, sur deux passes.
- Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- i18n : 6 612 textes, 100 %, 0 orphelin.
- Chromium, 18 écrans et feuilles (pages des onglets, sous-onglets du Village et de Héros, Hauts faits, Bibliothèque, Paramètres, carte, fiches Stats et Forge, menu ☰, bulle du fil rouge), 0 erreur :
  - à 320 px en texte normal, puis à 320 et 390 px en texte grand ;
  - aucun titre de page coupé, aucun débordement en largeur, et les voiles couvrent tout l'écran ;
  - lignes coupées par « … » : 2 → 3 dans la fiche de la Forge à 320 px, inchangées ailleurs.
- Le réglage s'active d'un toucher et tient après rechargement.
- **Reste à faire** : regarder « Grande » sur iPhone. Safari applique `zoom` à sa façon, et Chromium ne le reproduit pas.
