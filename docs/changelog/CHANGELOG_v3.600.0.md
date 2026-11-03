# v3.600.0 — Quêtes des compagnons : le lieu à jouer

Demande de Seb (31/10) : montrer quelle Petite Aventure faire pour une quête de compagnon. Option B validée.

## Ce qui change
- **« J'y vais »** sur l'étape en cours, pour les étapes « Petite Aventure » et « élite » :
  - si le héros est dans le monde de l'étape, le bouton ouvre la carte vivante, centrée sur un secteur qui compte ;
  - sinon, il ouvre la fiche du monde, avec le voyage.
- **Sur la carte vivante**, une pastille au portrait du compagnon marque, en bas à gauche du secteur, les secteurs qui font avancer son étape :
  - Petites Aventures pour une étape « Petite Aventure » ;
  - élites pour une étape « élite ».
  - Seuls les secteurs atteignables et ouverts par l'Histoire sont marqués. Un secteur libéré non rejouable n'est marqué que s'il ne reste plus rien d'autre à faire, comme le veut la carte.
- **Le volet du secteur** dit « Quête de Wenna : compte pour « La graine du Clos » » et rappelle si le compagnon doit rejoindre l'équipe.
- **La légende** de la carte vivante gagne une ligne « Quête d'un compagnon ».

## Fichiers
- `js/systems/companion-quest-system.js` : `sectorsFor`, `questsAt`.
- `js/ui/companion-quest-view.js` : bouton et `companionQuestGo`.
- `js/ui/living-map-view.js` : pastille, ligne du volet, légende.
- `css/04-panel-living-map.css`, `js/lang/en.js`, `js/ui/news-view.js` (une ligne « Quoi de neuf »).
- Aucun fichier ajouté. Aucun fichier protégé touché.

## Contrôles
- `round-harness` : 5 661 OK, 0 échec, sur deux passes. Nouvelle section [397] ; la section [88] compte une ligne de légende de plus.
- `boot-harness` : 4 OK. `hero-creation-harness` : 44 OK. `parcours-harness` : 142 OK.
- Audit i18n : 100 %.
- Capture sous Chromium à 390 × 844 : pastille de 26 px, volet du secteur.
