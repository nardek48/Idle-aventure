# Aethervale v3.429.12 — Frictions de la deuxième heure

Relevées pendant la deuxième heure de jeu testée dans Chromium. S'applique sur la v3.429.11.

## Un objet acheté se porte tout de suite
À l'échoppe, un objet dont l'emplacement est vide est équipé à l'achat (bandeau « Équipé : Casque cabossé »). Si l'emplacement est occupé, l'objet va au sac, comme avant : un objet choisi par le joueur n'est jamais remplacé. En jeu, remplir cinq emplacements vides demandait 15 touches.

## « Les fondations » dit d'où viennent les planches
Tant que la Scierie n'existe pas, l'étape « Fabriquer 5 Planches » ajoute : « Débloque d'abord la Scierie : quête « Le Bosquet Silencieux » (Quêtes › Secondaires) ». C'est vrai au Campement (libellé de l'étape en cours) et dans le détail du contrat (Quêtes). Le « Partir » du contrat menait au Village sans rien dire.

## Tutoriel de la préparation d'une petite aventure
Il s'affiche une seule fois, à la première préparation d'une expédition de secteur (les parcours d'Histoire n'ont pas de besace), en quatre points : la besace (avantages en vert, prix en rouge, rations rendues à l'Entrepôt), les PV de départ, les pactes facultatifs, et « Renoncer » qui ne coûte rien avant d'entrer (vérifié : la besace et la sortie du jour ne sont prélevées qu'à l'entrée). Il reprend le mécanisme existant (`GENERIC_TUTORIALS`, déjà sauvegardé dans `game.genericTutorialsSeen`) : aucun nouvel état persistant.

Non traité, par choix : le stock du Village plein en 30 minutes. C'est la zone « rapide » de départ (15 places) ; les zones lentes (60 places, « tolère l'absence ») se débloquent.

## Code
- `js/systems/equip-shop-system.js` : équipement à l'achat si l'emplacement est vide.
- `js/data/workshop-unlock.js` : `lockedHint` et `isLocked` sur l'étape des planches. `js/systems/mission-board-system.js` : affichage du conseil.
- `js/ui/tutorial-view.js` : tutoriel `pa2_prep`.
- `js/lang/data-fields.js` : `*.lockedHint` (WORKSHOP_UNLOCK_STEPS). `js/lang/en.js` : sept traductions.
- `CLAUDE.md` : le push sur `main` devient automatique une fois la version validée et les contrôles passés.
- Aucun fichier protégé touché. Aucun fichier ajouté.

## Contrôles
- Round : **3 963 OK**, 0 échec, sur trois passages. Boot : 4 OK. Création du héros : 44 OK.
- i18n : 4 191 textes, 100 %, 0 orphelin.
- Chromium (390×844) : armure achetée → équipée, bandeau « Équipé : Armure de cuir usée » ; conseil des planches présent sans Scierie, absent avec ; tutoriel affiché à la première préparation, pas à la suivante. Console sans erreur.
- `node --check` sur tous les fichiers modifiés.
