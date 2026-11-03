# v3.646.0 — Village en lignes (50:50)

Accord de Seb du 03/11, après l'atelier `atelier/ateliers-maquettes.html` (option 2, moitié texte, moitié image).

## Ce qui change (téléphone)
- **Production, Bâtiments et Ateliers** passent en lignes : une par bâtiment ou atelier. Le texte occupe la moitié gauche (nom, jauge, stock, recette, état), l'image la moitié droite. Petits téléphones (320-359 px) : 56 % pour le texte, 44 % pour l'image.
- **Ateliers** : plus de titres de groupe ; le bâtiment (Chasse, Mine…) est écrit en petit au-dessus du nom de l'atelier. Dans la fiche d'un bâtiment, ses ateliers suivent la même disposition, sans répéter son nom.
- Pastilles de niveau (3/8, 1) déplacées en bas à droite, côté image ; rubans d'état inchangés (en haut à droite).
- Grand écran : inchangé.
- Une ligne dans « Quoi de neuf ».

## Les images
- La moitié droite affiche la **scène de ligne** du bâtiment dès qu'elle est livrée (`images/Buildings/scenes/<clé>.webp`, 3:2), recadrée et fondue dans le parchemin par son bord gauche (CSS). Clés : `prod_<id>`, `village_<id>`, `atelier_<id>`, la forge de la Mine en `atelier_forge_mine` (prompts dans « Images à générer »).
- Tant qu'une scène n'est pas livrée, la ligne montre l'image actuelle **du même bâtiment**, centrée. Aucune image empruntée à un autre, aucune requête vers un fichier absent : les scènes livrées sont listées dans `BUILDING_SCENES_READY` (`js/ui/village-view.js`), vide pour l'instant. Livrer une scène = déposer le fichier, ajouter sa clé, ajouter le fichier au précache si besoin, nouvelle version.
- Les fiches des bâtiments gardent leur image actuelle ; elles prendront la scène à la livraison.

## Fichiers
`js/ui/village-view.js` (`BUILDING_SCENES_READY`, `buildingSceneHTML`), `js/ui/production-view.js`, `js/ui/grand-ouvrage-view.js`, `css/04-panel-village.css`, `js/ui/news-view.js`, `js/lang/en.js`. Aucun fichier nouveau, aucun fichier protégé touché.

## Contrôles
`round-harness` 0 échec (deux passes) ; `boot-harness`, `hero-creation-harness`, `parcours-harness` P14 ; audit i18n 100 %. Chromium : iPhone 390 et 320 px (aucun texte ne passe sous l'image), Mac 1440 × 900 inchangé ; simulation avec trois scènes de test (Mine, Carrière, Puits) : fondu et cadrage conformes à l'atelier.
