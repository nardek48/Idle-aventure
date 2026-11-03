# v3.641.0 — Quêtes : onglets « Annexes » et « Alliés »

Accord de Seb du 03/11 : des noms plus courts que « Secondaires » et « Compagnons », trop larges sur un petit téléphone.

## Ce qui change
- Onglets de Quêtes : **Histoire · Annexes · Alliés · Aventure**. Mesuré en 12 px gras : Annexes 52 px (Secondaires 74), Alliés 34 px (Compagnons 80), pour des onglets de 64 px à 320 px de large et 81 px à 390.
- Le resserrage des lettres ajouté en v3.639.0 pour les écrans de 320 à 359 px est retiré : il n'est plus utile.
- Même nom partout où le joueur le lit : filtre du grand écran, badge « Annexe » des quêtes terminées, indice de l'Atelier de Construction (« Quêtes › Annexes »), message de liste vide.
- « Compagnons » reste le nom des compagnons ailleurs dans le jeu (Héros, fiches) ; seul l'onglet de Quêtes s'appelle « Alliés ».
- Une ligne dans « Quoi de neuf ». Traductions anglaises : Side quests, Allies.

## Fichiers
`js/ui/quests-view.js`, `js/data/workshop-unlock.js`, `js/ui/news-view.js`, `js/lang/en.js`, `css/04-panel-quests.css`. Clés internes inchangées (`secondaires`, `compagnons`) : rien à migrer.

## Contrôles
`round-harness` 0 échec (deux passes) ; `boot-harness`, `hero-creation-harness` ; audit i18n 100 %, 0 orphelin. Chromium à 320 et 390 px : les 4 libellés tiennent dans leur onglet, sans erreur.
