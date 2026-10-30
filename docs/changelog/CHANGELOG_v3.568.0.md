# v3.568.0 — Grand écran : l'écran d'accueil et la création du héros

D'après l'atelier `atelier/accueil-grand-ecran.html` (accord de Seb du 30/10) et les deux nouveaux fonds faits par Seb.

## Grand écran (PC, tablette en paysage)
- **Accueil** : nouveau fond paysage plein écran, logo sur le ciel, panneau à droite (héros à reprendre et Continuer, toutes les parties avec Charger et corbeille, Nouvelle partie). Première visite : Bienvenue, Nouvelle partie, Charger. L'écran de chargement prend aussi ce fond.
- **Création du héros sur une page** : le héros à gauche (portrait, nom, classe et ressource, phrase de la classe) ; à droite le nom, la classe (Homme / Femme, variante du Chaos), les statistiques et les compétences, puis « Commencer l'aventure ».

## Téléphone
- Seule l'image d'accueil change (nouvelle version, même nom de fichier). Les écrans gardent leur forme.

## Code
- **Fichiers ajoutés** : `images/TitleScreen/title_background_wide.webp` (3 072 × 2 048, chargée à la demande) ; `atelier/accueil-grand-ecran.html`.
- `js/ui/title-screen-view.js` : `buildTitleScreenWideHTML`. `js/ui/modal-view.js` : `buildHeroCreationWideHTML`, `heroCreationWideStart`.
- `css/10-grand-ecran.css`, `js/lang/en.js`. Aucun fichier protégé.

## Contrôles
`round-harness` 5 512 OK, 0 échec (deux passes) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` P11 15 OK. Création d'une partie vérifiée au grand écran et au téléphone.
