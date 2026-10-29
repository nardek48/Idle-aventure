# v3.539.0 — Donjon sans soin gratuit ; jalons des compagnons après leur arrivée

Deux retours de Seb, option A pour chacun, avec son accord pour modifier `dungeon-system.js` (protégé) et `village-quest-system.js`.

## Ce qui change en jeu
- **Donjon** : on entre avec ses PV actuels. Avant, l'entrée remettait les PV à 100 %.
  - Une Marque qui change les PV max (Fragilité, −30 %) garde la même proportion : entrer à 50 % donne 50 %.
  - La préparation affiche déjà les PV : le bouton devient « Partir à N % », avec un avertissement quand les PV sont bas.
- **Jalons (Quêtes › Secondaires)** : un jalon de compagnon n'apparaît qu'une fois ce compagnon arrivé dans le groupe.
  - Concernés : « Maddoc au palier 5 » (Désert, avant desert_08), « Wenna au palier 5 » (Forêt, avant forest_wenna), « Edda au palier 5 » (Ruines, avant ruines_03) et « Compétence de Sarkel au rang 3 » (Montagne, avant montagne_03).
  - Les jalons de relique et « Un compagnon au palier 15 » attendent qu'au moins un compagnon soit là.

## Code
- `systems/dungeon-system.js` (protégé, accord de Seb) : deux lignes `game.heroHp = game.heroMaxHp` retirées de `DungeonManager.start`.
- `systems/village-quest-system.js` : filtre dans `MilestoneManager.ofWorld`.
- Harnais [357]. Le contrôle [331] compte 4 jalons en Forêt sur une partie neuve (sans compagnon), au lieu de 6.
- Aucun état sauvegardé, aucun texte, aucun fichier ajouté.

## Contrôles
- Round : 5 383 OK, 0 échec, sur deux passes.
- Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- i18n : 100 %, 0 orphelin.
- Campagne du robot (Chevalier, `--combats`) : 101 OK, 0 échec, 20,1 h. Le robot se soigne avant ses sorties, donc les bancs ne bougent pas.
