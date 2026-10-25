# v3.484.0 — Refonte de l'économie, lot S (RE-8) : Farine, Viande séchée et Eau purifiée retirées

Décision de Seb (option 1) : retirer ces trois produits intermédiaires et garder la Chitine. Les recettes qui les demandaient prennent leur équivalent brut. Le banc des débouchés (scénario S1) ne montre pas de surplus en plus.

## Ce qui change en jeu
- **Ateliers retirés** : Moulin (Champs), Séchoir (Chasse), Station de purification (Puits). Il reste un atelier aux Champs (Boulangerie), un à la Chasse (Cuisine de camp) et un au Puits (Réservoir).
- **Recettes à l'équivalent brut** (1 Farine = 5 Blés, 1 Viande séchée = 5 Viandes, 1 Eau purifiée = 4 Eaux) :
  - Pain : 15 blé + 5 eau ;
  - Ration moyenne : 15 viandes + 1 pain ;
  - Outre : 16 eau + 2 viandes ;
  - Apothicaire : toutes les préparations et les commandes partent de l'Eau du Puits. Exemple : Soin mineur, 12 eau + 4 blé. Le puits du roi divise toujours l'eau par deux.
- **Taverne** : les contrats « Sacs pour le moulin » et « Vivres de chasse » disparaissent.
- **Patrouilles** : les ingrédients de rations rapportent 10 viandes en Forêt, et 15 viandes + 1 pain au-delà.
- **Quêtes du Village** : « La première mouture » est retirée. « Le pain d'Aeswyn » suit directement les quêtes des Champs et reprend le tutoriel des ateliers.
- **Textes** :
  - le tutoriel de la Ration moyenne (Histoire) est mis à jour ;
  - la description du Pain et celle de la Ration aussi ;
  - la ligne du puits du roi devient « moitié moins d'eau ».

## Anciennes sauvegardes
La conversion est faite une seule fois au chargement, sans plafond, car ces ressources étaient déjà acquises :
- les stocks de Farine, de Viande séchée et d'Eau purifiée deviennent leur équivalent brut ;
- les lots en file dans les ateliers retirés sont rendus en équivalent brut ;
- les améliorations payées sur ces ateliers sont rendues en planches et lingots ;
- un butin parti avant la mise à jour (patrouille, sortie) arrive en équivalent brut.

## Code
- `data/workshops.js` : retrait des 3 ateliers ; recettes du Pain, de la Ration et de l'Outre.
- `data/hunt-quests.js` : retrait des 3 ressources ; descriptions du Pain et de la Ration.
- `data/apothecary-recipes.js` : intrants et commandes convertis.
- `systems/apothecary-system.js` : le puits du roi porte sur `eau`.
- `systems/warehouse-system.js` :
  - `WAREHOUSE_LEGACY_RESOURCES` et `WAREHOUSE_LEGACY_WORKSHOPS` ;
  - `_migrateLegacy` (appelée par `ensure`) ;
  - `addResource` convertit une clé retirée.
- `data/tavern-contracts.js`, `data/patrols.js`, `data/village-quests.js`, `data/story-quests.js`, `core/state.js` : mises à jour décrites ci-dessus.
- `ui/village-building-view.js` : texte du puits du roi.
- Commentaires : `ui/production-view.js`, `systems/production-system.js`.
- `lang/en.js` : 30 entrées retirées, 11 ajoutées.
- Aucun fichier protégé modifié. `save-system.js` crée encore `farine: 0` sur une ancienne sauvegarde ; la conversion efface cette clé. Aucun fichier ajouté.

## Images qui ne servent plus (non supprimées)
`images/Icons/resources/flour_icon.webp`, `images/Icons/workshops/grain_mill.webp`, `drying_rack.webp`, `purification_station.webp`.

## Outils
- `round-harness.js` :
  - nouvelle section [305], 14 contrôles :
    - retraits ;
    - recettes ;
    - absence de clé retirée dans les données ;
    - patrouilles ;
    - Apothicaire et puits du roi ;
    - chaîne du Village et tutoriel ;
    - nouvelle partie ;
    - conversion des stocks, des files et des niveaux ;
    - idempotence ;
    - butin en route.
  - Sections mises à jour : [42b], [66], [67], [72], [73], [125], [186], [187] et les sections qui prenaient le Moulin comme atelier d'exemple (Production, Apothicaire, Réservoir, patrouilles, Entrepôt). Elles prennent maintenant la Boulangerie.
- `tools/sim/debouches-bench.js` : le scénario S1 est désormais identique à A0.

## Contrôles
- Chromium, vrai jeu, ancienne sauvegarde avec stocks et file au Moulin :
  - conversion faite ;
  - feuilles Champs, Chasse et Puits avec un atelier chacune ;
  - Apothicaire sans « purifiée » ;
  - rien ne déborde à 390 et à 320 px, aucune erreur.
- i18n : 100 % des textes traduits, aucun orphelin.
- round-harness 4901 OK, 0 échec (deux passes) ; boot, création du héros, parcours (139) OK.
