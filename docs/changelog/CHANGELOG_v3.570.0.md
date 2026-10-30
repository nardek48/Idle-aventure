# v3.570.0 — iPhone : plus de tremblement à l'ouverture de l'appli

Vidéo de Seb du 30/10 (iPhone, appli installée), analysée à 60 images/s.

## Cause
Pendant le fondu d'ouverture (environ 0,2 s), iOS fait alterner la hauteur de l'écran à chaque image : avec, puis sans la zone de la barre d'accueil (environ 40 px). L'accueil, collé au bas de l'écran, montait et descendait avec elle (13 allers-retours). Le mode PC n'y est pour rien : l'écran reste en mode téléphone tout du long.

## Correction
- Dans l'appli installée (pas dans Safari, où la barre d'outils du bas cacherait les boutons), l'accueil, la création du héros et l'écran de chargement prennent la plus grande hauteur d'écran (`100lvh`), qui ne change pas pendant l'ouverture.
- `css/00-title-screen.css` seulement. Mode PC et tablette non concernés.

## Contrôles
`round-harness` 5 512 OK, 0 échec (deux passes) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` P11 15 OK. Mise en page de l'accueil identique avec la règle forcée (Chromium). À vérifier sur iPhone : Chromium ne reproduit pas l'ouverture d'iOS.
