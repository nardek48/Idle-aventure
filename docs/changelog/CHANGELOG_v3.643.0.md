# v3.643.0 — Village et Héros : finitions

Accord de Seb du 03/11, après l'atelier `atelier/village-heros.html`. Les Ateliers en une grille de 3 colonnes ne sont pas retenus : Seb les retravaillera.

## Ce qui change
- **Héros › Compagnons** : le choix « Avec toi / Au camp » passe sur la ligne des PV, une rangée de moins par compagnon (téléphone et grand écran).
- **Village › Entrepôt** : « Matières brutes » en titre, « plafond 1 250 » en petit à côté ; le titre ne passe plus sur deux lignes.
- **Village › Production** (téléphone) : quand il n'y a rien à récolter, le bouton grisé « Tout récolter » est masqué, la consigne reste. Il réapparaît au tick suivant dès qu'un bâtiment a du stock (le même identifiant `prod-harvest-all-btn` est tenu à jour par `ProductionManager.updateDOM`). Grand écran inchangé.
- Onglets du Village à 320 px : mesurés, 4 px entre « Bâtiments » et « Production » (la pastille donnait l'impression qu'ils se touchaient) ; rien à corriger.
- Une ligne dans « Quoi de neuf ».

## Fichiers
`js/ui/heros-screens-view.js`, `js/ui/warehouse-view.js`, `css/04-panel-heros-screens.css`, `css/04-panel-village.css`, `css/04-panel-production.css`, `js/ui/news-view.js`, `js/lang/en.js` (« Matières brutes · plafond {n} » devient « plafond {n} »).

## Contrôles
`round-harness` 0 échec (deux passes) ; `boot-harness`, `hero-creation-harness` ; audit i18n 100 %, 0 orphelin. Chromium : iPhone 390 px et Mac 1440 × 900 ; bouton « Tout récolter » masqué sans stock, revenu avec du stock ; aucune erreur.
