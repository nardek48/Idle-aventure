# v3.788.0 — Simplification des rations (4/4) : Boulangerie et Cuisine de camp retirées (13/11/2026)

Décisions de Seb (13/11) : retrait des deux ateliers et adaptation de tout ce qui demandait du pain ou des rations. **Accord de Seb pour `js/data/story-quests.js`** (forest_07, forest_08, forest_15, dernier camp de la Tour) **et pour `fullResetState`** (`js/systems/save-system.js`, une ligne). Aucun autre fichier protégé modifié. Aucun fichier ajouté ni supprimé.

## Ce qui change
- **Ateliers** (`data/workshops.js`) : Boulangerie (Champs) et Cuisine de camp (Chasse) retirées. Les Champs et la Chasse n'ont plus d'atelier : leur feuille s'ouvre sur les zones.
- **Pain et rations retirés de l'Entrepôt** (`data/warehouse-resources.js`, `systems/warehouse-system.js`) :
  - même mécanisme que la Farine en v3.484.0 : au chargement, le stock est rendu en brut, sans plafond, une seule fois ;
    - Pain : 15 Blé + 5 Eau ;
    - Petite ration : 8 Viande + 4 Eau ;
    - Ration : 15 Viande + 15 Blé + 5 Eau ;
    - Grande ration : 30 Viande + 15 Blé + 15 Eau ;
  - les lots encore en file de ces ateliers sont rendus aussi, ainsi que leurs améliorations payées (4 planches et 3 lingots au niveau 2, ×1,4 par niveau) ;
  - un butin encore en route (patrouille, cadeau) arrive en brut.
- **Histoire** (accord de Seb) :
  - forest_07 : plus de Petite ration en récompense ;
  - forest_08 : objectif « Terminer l'expédition « Le sentier obstrué » » ; récit « Viande et eau font un repas. Un repas fait une route. » ; tutoriel « Le repas », au Camp (fenêtre et bulles sur l'écran : anneaux, Repas, Festin) ;
  - forest_15 : offrande 3 Sève + 15 Viandes + 10 Eau, point de tutoriel et bulle « La viande et l'eau » réécrits ; récit « les vivres du village » et dialogue « Pourquoi elle prend nos vivres ? C'est pour nous, ça. » / « Elle prend ce qu'on est. Ce qu'on mange, c'est nous. » (validés par Seb) ;
  - Tour, dernier camp : 400 Bois + 200 Viandes + 100 Eau ; le bouton « Aller aux Ateliers » est retiré.
- **Quêtes du Village** : « Le pain d'Aeswyn » est retirée.
  - Son tutoriel des ateliers et sa récompense (+350 or, 10 eau, 10 blé) passent à « Planche et lingot ».
  - « L'atelier bien huilé » se rattache à la Scierie.
- **Dépendants** :
  - Apothicaire : Soin majeur et Endurance prennent 30 Blé + 10 Eau au lieu de 2 Pains ; commandes au même équivalent ;
  - Taverne : contrats Pain et Ration retirés ; le Bloc taillé prend le rang 4 (« Seuil de la Halle ») ;
  - quêtes de compagnons : 10 Pains → 150 Blé, 15 Pains → 225 Blé ;
  - événements du Village :
    - la fête demande du Blé (90 par monde, au lieu de 6 Pains) ;
    - les gains des demandes deviennent du brut ;
    - le cadeau d'Orwen devient 60 Viandes + 60 Blé + 30 Eau ;
  - patrouilles : le Pain des ingrédients devient 15 Blé ;
  - Labyrinthe : entrée gratuite (était 1 Ration).
- **Textes** :
  - tutoriels du Village, de la Taverne, des patrouilles et de la besace ;
  - bulle « Les Ateliers ».
- **Nouvelle partie** (Seb, option A) : plus de rations de départ, ni dans `createInitialGameState` ni dans `fullResetState`. Le repas reste gratuit tant que la Chasse, les Champs et le Puits sont fermés (il ne compte que les denrées produites) : la Chasse s'ouvre à forest_06.
- **Robot** : plus de ration fabriquée ni ajoutée (forest_08, secteurs rejoués, Faille) ; `forge-mondes-bench` et le parcours n'ajoutent plus de rations.
- **Traductions** : 34 textes nouveaux, 54 orphelins retirés.

## Images
- Aucune image supprimée.
- Ne servent plus en jeu :
  - `bread_icon.webp`, `bakery.webp` ;
  - `ration_icon`, `petite_ration_icon` et `grande_ration_icon`, gardées par la besace ;
  - `camp_kitchen.webp`, qui illustre la ligne du « Quoi de neuf » ;
  - les scènes `atelier_boulangerie` et `atelier_cuisine_de_camp`.

## Contrôles
- `round-harness` 7080 OK, 0 échec, sur 2 passes (dont : repas gratuit tant que rien n'est produit). Sections adaptées : [16], [37], [49], [54], [55], [61b] braises, [64], [65], [66], [67], [72], [73], [75], [87], v3.137 → conversion v3.788, [UX-PROD], [161], [186], [187], [188], [200], [203], [210], [212], [274], [305], [306], [307], [340], [395], [400], [403], [421], [448], [449], [458], [464], [522].
- boot 4 OK ; création du héros 46 OK ; i18n 100 %, 0 orphelin.
- Tutoriels sur l'écran (captures iPhone) : forest_08 « Le repas » (2 bulles, pas encore de compagnon), forest_15 (3 bulles).
- Parcours complet (Chromium) 236 OK, 0 échec.
- Robot, 9 parties (3 par classe) : 9 au bout, aucun mur, médiane 19,8 h (16 à 34 h) ; 3 KO sur des boss d'Histoire (forest_15 Orc ×2, montagne_15 Wyrm).
- Quoi de neuf : une ligne (FR + EN).
