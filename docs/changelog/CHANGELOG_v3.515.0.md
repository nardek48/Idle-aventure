# v3.515.0 — Une ressource qui manque mène à sa fiche Entrepôt

Décisions de Seb du 27/10 : option B (tous les coûts du jeu), variante A de l'atelier `atelier/ressource-manquante.html`.

## Ce qui change en jeu
- Partout où un coût s'affiche, une ressource qui manque se touche : elle ouvre sa fiche Entrepôt (« D'où ça vient », avec l'atelier ou le bâtiment qui la produit, cliquable).
- Un bouton « ‹ » en haut de la fiche ramène à l'écran d'origine : chantier du village, Forge, Apothicaire, Taverne, bâtiment de production, atelier, ou feuille de Héros (Capacités, compagnon).
- Lignes de chantier : « › » au bout de la ligne, et le lien « Où en trouver : … › » dessous. Pastilles (zones, Forge, ateliers, préparations, rangs des sorts et des compagnons) : la pastille rouge est entourée de pointillés.
- Une ressource fabriquée sans texte de provenance (Planche…) dit désormais quel atelier la fait (« Scierie fine (Scierie) ») : elle restait rouge sans explication.
- Toucher une pastille dans un bouton d'achat (zones) n'achète rien.

## Vérifications
- Chromium, 320 et 390 px : chantier, tuile et feuille d'atelier, Forge, zone, rang de sort ; ouverture de la bonne fiche, retour au bon écran, aucun achat déclenché.
- Test des fenêtres de quêtes inchangé : 53/53 tutoriels, 95/95 fins d'étape, 0 erreur.

## Code
- `ui/warehouse-view.js` : `resGoAttr`, `openResourceFromCost`, `warehouseGoBack`, bouton retour de la fiche.
- `ui/village-building-view.js`, `ui/production-view.js`, `ui/potion-view.js`, `ui/heros-view.js`, `ui/companions-view.js` : le geste sur chaque coût. `getVillageResourceHint` nomme le producteur à défaut de texte.
- `css/04-panel-village.css`, `lang/en.js` (2 textes). Harnais [336].
- Aucun fichier ajouté, aucun fichier protégé, aucun nouvel état sauvegardé.
