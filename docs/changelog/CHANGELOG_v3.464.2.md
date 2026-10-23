# v3.464.2 — Décor des donjons : le monde du donjon

Retour de Seb : le fond de combat d'un donjon doit correspondre au monde de ce donjon.

## Le défaut
Seule la Tanière du Basilic déclarait son propre décor (`donjon_poison.webp`). Les autres donjons avaient `combatMap: null` : le jeu gardait le fond du monde où se trouvait le héros. Faite depuis la Crypte, la Cité engloutie s'affichait donc sur le fond de la Crypte.

## Ce qui change
- Cité engloutie : décor du Désert (`images/Maps/desert-combat.webp`).
- Ruines : décor des Ruines (`ruins-combat.webp`).
- Ossuaire : décor de la Crypte (`crypt-combat.webp`).
- Montagne et Tour, pas encore ouverts : décor de leur monde.
- La Tanière garde le sien, inchangée.
- Les images sont celles des combats ordinaires de chaque monde ; aucune nouvelle image.

## Code
- `data/dungeon.js` : `combatMap` des donjons 2 à 6.
- Aucun fichier protégé, aucun fichier ajouté.

## Contrôles
- Relevé dans le vrai jeu (Chromium), héros dans la Crypte :
  - chaque donjon pose le décor de son monde (Tanière : le sien) ;
  - le décor tient à la vague 2 ;
  - le fond du monde revient en fin de run.
- Harnais [278] : chaque donjon a le décor de combat de son monde.
- round-harness 4629 OK, 0 échec (deux passes) ; boot, création du héros, parcours (139) OK.
