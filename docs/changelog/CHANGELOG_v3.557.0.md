# v3.557.0 — Grand écran, option B (3/5) : Village, la fiche du bâtiment à côté de la grille

Suite de l'option B (accord de Seb du 29/10, « ok pour la suite »), d'après la maquette `atelier/grand-ecran.html`. Format large seulement : **le téléphone ne change pas** (feuille du bas).

## Ce qui change sur grand écran
- Village › Production : **la grille des bâtiments à gauche, la fiche du bâtiment choisi ancrée à droite**, toujours ouverte. À l'arrivée, le premier bâtiment débloqué est choisi ; toucher une vignette change la fiche, la vignette choisie est cerclée d'or.
- La fiche est celle du téléphone, en entier : récolte et Entrepôt, onglets Ateliers et Zones, zones, rangées, actions. Plus de voile, plus de croix : la grille reste utilisable à côté.
- Les autres onglets du Village (Bâtiments, Ateliers, Entrepôt) et la fiche d'un atelier ne changent pas.

## Code
- `js/ui/production-view.js` : `productionSheetDocked`, `productionDockedId` ; `buildProdDashboardHTML` met la grille et la fiche côte à côte au format large ; `buildProductionSheetHTML` sait se rendre ancrée (sans voile ni croix) ; `renderProductionSheet` et `refreshProductionSheet` redessinent la page quand la fiche est ancrée.
- `js/ui/village-view.js` : pas de rafraîchissement de la feuille du bas quand la fiche est ancrée.
- `css/10-grand-ecran.css` : section « option B, Village ».
- Aucun fichier ajouté, aucun fichier protégé.

## Contrôles
`round-harness` 5 469 OK, 0 échec (deux passes, section [372] ajoutée) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` P11 15 OK. Captures à 1440 × 900 (changement de bâtiment, onglet Zones) ; téléphone inchangé.
