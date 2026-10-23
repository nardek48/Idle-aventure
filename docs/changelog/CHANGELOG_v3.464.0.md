# v3.464.0 — Niveaux de donjon, lot 5 : la feuille de lancement

Dernier lot de la conception « Niveaux de donjon » v0.3. Cette version rend jouables les niveaux et le mode libre, livrés au moteur aux lots 1 à 4 (v3.460.0 à v3.463.0). C'est la feuille validée par Seb à l'atelier `atelier/niveaux-donjon.html`.

## Ce qui change pour le joueur
- **Mode**, en haut de la feuille : « Sortie du jour » (sorties restantes) ou « Mode libre » (1 Ration moyenne). Le mode libre s'ouvre après une première victoire.
- **Niveau** : flèches ‹ › de 1 au meilleur niveau + 1. La feuille s'ouvre au meilleur niveau tenu.
- **Résumé** de ce que rapporte le niveau :
  - rareté et monde du butin ;
  - PV et dégâts des monstres ;
  - au-delà du plafond : « Touché par l'Aether » (plancher) et or et Éclats en plus ;
  - sinon, le prochain palier (« Niveau 10 : butin Inhabituel (Cité engloutie) ») ;
  - en libre : or ÷ 4, Éclats ÷ 2, pas de ressource de monde.
- L'en-tête (« Épique max ») suit le niveau choisi, et le pronostic est recalculé au niveau choisi.
- **Quota du jour vide** : la feuille s'ouvre quand même, directement en libre, si le donjon a déjà été fini.
- **Sortie offerte par l'Histoire** : rien ne change (niveau 1, sans le bloc).

## Code
- `dungeon-view.js` :
  - `buildDungeonLevelHTML`, `setDungeonMode`, `stepDungeonLevel` ;
  - la feuille passe le niveau et le mode à `DungeonManager.start` ;
  - lignes de sorties, de vivres et de récompenses en mode libre ;
  - `openDungeonSheet` s'ouvre en libre quand le quota est vide.
- `combat-forecast-system.js` : `forDungeon(id, marks, level)`.
- `04-panel-dungeon.css` : `.dlvl` (segment `.kseg` existant, flèches de 44 px, résumé), textes à 12 px au moins.
- `en.js` : 19 textes. « Libre » était déjà traduit « Idle » ailleurs : l'onglet s'appelle « Mode libre ».
- Aucun fichier protégé, aucun fichier ajouté.

## Contrôles
- Harnais [277] :
  - ouverture au meilleur niveau, borne au meilleur + 1 ;
  - résumé de l'Ossuaire 4 et texte du mode libre ;
  - Entrer appelle `start(4, marques, 5, libre)` ;
  - quota vide → libre ;
  - palier annoncé à la Tanière 8, en-tête « Inhabituel max » à la Tanière 12 ;
  - le pronostic joue les vagues du niveau ;
  - sortie offerte par l'Histoire sans bloc.
- Mesuré dans Chromium à 390 et 320 px, Chevalier de fin d'Histoire du robot :
  - 5 états de l'atelier, rien ne déborde, la feuille ne défile pas ;
  - le bloc fait 194 à 260 px.
- i18n 100 % (5437 textes) ; CSS morte : 0.
- round-harness 4628 OK, 0 échec (deux passes) ; boot, création du héros, parcours (139) OK.
