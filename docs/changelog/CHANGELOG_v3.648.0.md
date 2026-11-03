# v3.648.0 — Héros : onglet « Alliés » ; « Expéditions » tient à 320 px

Accord de Seb du 03/11 (revue des écrans, libellés trop larges sur petit téléphone).

## Ce qui change
- **Héros** : l'onglet « Compagnons » s'appelle **« Alliés »**, comme l'onglet de Quêtes (34 px au lieu de 80 pour un onglet de 64 px à 320 px de large). Les textes qui renvoyaient à « Héros › Compagnons » (tutoriels, quêtes d'histoire, Entrepôt, outil admin) disent « Héros › Alliés » ; l'historique de « Quoi de neuf » reste tel quel.
- **Camp** : « Expéditions » garde son nom (choix de la v3.426.0) ; sous 360 px, son rail est un peu élargi et les lettres resserrées : 65 px pour un onglet de 67 px (avant : 70 pour 64). Texte gardé en 12 px.
- « Compagnons » reste le nom des compagnons partout ailleurs.
- Une ligne dans « Quoi de neuf ». Anglais : « Allies », « Hero › Allies ».

## Fichiers
`js/ui/heros-view.js`, `js/data/story-quests.js`, `js/data/village-quests.js`, `js/ui/tutorial-view.js`, `js/ui/warehouse-view.js`, `js/ui/companions-view.js` (commentaire), `js/ui/admin-view.js`, `css/04-panel-camp.css`, `js/ui/news-view.js`, `js/lang/en.js`.

## Contrôles
`round-harness` 0 échec (deux passes) ; `boot-harness`, `hero-creation-harness` ; audit i18n 100 %, 0 orphelin. Mesure Chromium à 320 px : tous les libellés des onglets Camp, Quêtes, Héros tiennent ou gardent au moins 7 px d'écart (« Équipement » 71 px pour 64, noté à Seb).
