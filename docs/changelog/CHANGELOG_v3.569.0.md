# v3.569.0 — Plus de saut au lancement sur PC et tablette

Retour de Seb du 30/10 : « une espèce de tremblement quand je lance le jeu ».

## Cause (mesurée image par image, Chromium 1440 × 900)
L'écran de chargement s'affichait d'abord en format téléphone (fond en hauteur) ; le format PC n'était posé que 0,35 s plus tard, quand `js/ui/desktop-scale.js` se chargeait, et l'écran sautait vers le fond paysage et la mise en page PC.

## Correction
- `prefs-system.js` et `desktop-scale.js` sont chargés dans l'en-tête de `index.html`, avant le corps de la page : le format (téléphone, colonne ou PC) est connu avant la première image. Les deux fichiers ne dépendent de rien d'autre.
- Mesure après correction : format PC et fond paysage dès la première image (113 ms) ; téléphone inchangé (format téléphone dès la première image).

## Contrôles
`round-harness` 5 512 OK, 0 échec (deux passes) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` P11 15 OK. Aucun fichier ajouté, aucun fichier protégé.
