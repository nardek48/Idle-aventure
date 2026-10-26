# v3.492.2 — Le retour « ‹ » du bandeau répond de nouveau

Retour de Seb (iPhone) : le bouton « ‹ » en haut à gauche des écrans ne faisait rien. Cela touchait le Grimoire, le Donjon, l'échoppe, les Potions, la Mémoire, l'Ascension et tous les écrans ouverts depuis un onglet du bas.

## Cause
Le bandeau du cadre (`.kf-top`) est en `pointer-events: none`, pour laisser passer les touchers vers la page. Cette propriété se transmet aux éléments contenus dans le bandeau. Le bouton retour, ajouté dans le bandeau en v3.458.2, en héritait : aucun toucher ne lui parvenait.

## Correction
- `css/00-kbtn.css` : `.kf-back` reçoit `pointer-events: auto`. Le bandeau, lui, ne change pas.

## Vérifications
- **Chromium**, à 390 et 320 px, clic réel au centre du bouton :
  - Grimoire et Donjon reviennent au Camp ;
  - l'échoppe revient au Village ;
  - l'Ascension revient au Menu ;
  - le « ‹ » de la carte vivante fonctionnait déjà.
- **Harnais** : un contrôle de plus dans [314] vérifie que le retour reçoit le toucher.

## Contrôles
- Round-harness : 5034 OK, 0 échec, sur 2 passes.
- Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
