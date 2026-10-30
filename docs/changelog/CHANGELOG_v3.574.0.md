# v3.574.0 — Les cartes vivantes refaites

Images de Seb (liste « Images à générer », famille Grand écran). Les cinq cartes vivantes passent en **2048 × 2048** (au lieu de 1144 à 1254 px), plus nettes sur PC, tablette et iPhone, avec une palette plus vive.

- Forêt (`images/Maps/foret_atelier.webp`), Désert (`desert.webp`), Ruines (`ruines.webp`), Crypte (`crypte.webp`), Montagne (`montagne.webp`) : mêmes noms de fichiers.
- **Composition vérifiée** avant intégration, puisque les secteurs sont placés en pourcentage sur l'image : aucun décalage mesuré entre l'ancienne et la nouvelle carte (corrélation de phase), et chaque secteur du jeu tombe sur son lieu (superposition des coordonnées de `data/living-maps.js`). La Forêt change surtout de couleurs, plus claires et plus vertes ; sa composition est identique.
- Poids : 0,72 à 0,85 Mo par carte (chargée seulement à l'ouverture de la carte).
- Aucun fichier de code modifié hors numéro de version ; aucun fichier ajouté.

## Contrôles
`round-harness` 5 522 OK, 0 échec (deux passes) ; `boot-harness` 4 OK ; `missing-icons` : aucune image absente. Carte de la Forêt ouverte dans le jeu à 390 × 844 et 1440 × 900.
