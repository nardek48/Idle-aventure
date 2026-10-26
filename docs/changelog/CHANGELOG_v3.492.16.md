# v3.492.16 — « Comme la dernière fois » sort du pli « Réglages »

Idée de Seb : la section « Objets » de la préparation reste repliée sous « Réglages », mais le bouton « Comme la dernière fois » passe au-dessus du pli. Aucun fichier JS ou CSS n'est ajouté.

## Ce qui change
- **Emplacement** : le bouton se place sous l'équipe, juste avant « Réglages ». La liste de ce qu'il remet est dessous, par exemple « Leurre de cendre, Coin d'obsidienne ».
- **Effet** : un toucher remet les potions à bonus et les objets du dernier départ, s'ils sont en stock, sans ouvrir le pli. Le résumé du pli se met à jour, par exemple « 2 objets ».
- **Inchangé** : le pli « Réglages » (audit C14, v3.458.4) et la règle du bouton (v3.449.0, option A). Il n'apparaît que si le dernier départ emportait une potion à bonus ou un objet.

## Fichiers touchés
- `ui/sortie-prep-view.js` : `buildSortiePrepAgainHTML()` est appelé avant le pli, et plus dedans.

## Harnais
- Nouvelle section [320] : 3 contrôles. Le bouton est visible pli fermé, il n'apparaît qu'une fois pli ouvert, et il est absent sans départ précédent.

## Contrôles
- `node --check` sur les JS modifiés.
- **Harnais** :
  - round-harness : 5072 OK, 0 échec, sur 2 passes ;
  - boot : 4 OK ;
  - création du héros : 44 OK ;
  - parcours : 139 OK.
- **Chromium** à 390 et 320 px, sans erreur de console : la préparation de la Gueule, avec un départ précédent qui emportait deux objets.
