# Aethervale v3.432.0 — Ruines, acte IV (livraison 1) : le Cœur, « Vers le Cœur », « Le dernier trait »

Première livraison de l'acte IV des Ruines, « Le plan ». Textes : document « Ruines — Acte IV » v1.0 (validé par Seb le 09/10/2026). Le Cœur est posé sur la grande halle au-dessus de la Borne (emplacement A, choix de Seb du 09/10). S'applique sur la v3.431.0.

## L'histoire : trois étapes de plus (ruines_16 à ruines_18)

| # | Étape | Ce qu'elle fait jouer |
| --- | --- | --- |
| 16 | La carte qui manque | Le Cœur paraît sur la carte des Ruines ; tenir les trois quartiers qui le touchent. Tutoriel « Le Cœur » |
| 17 | Ce qu'il demande | La demande du Veilleur (« Aide-la à finir ») ; le parcours « Vers le Cœur » |
| 18 | Le dernier trait | Trois rencontres de bâtisseurs en masse, puis le Golem ; Edda reste |

- Fin affichée en attendant la livraison 2 : « La suite de l'acte IV arrive bientôt. »
- Récompenses provisoires :
  - étape 16 : 3 200 or et 2 Pierres errantes ;
  - étape 17 : 3 300 or ;
  - étape 18 : 3 400 or et 3 Pierres errantes.

## Le Cœur (carte des Ruines)
- Nouveau quartier `coeur`, à 50,5 / 27, sur la grande halle. Il paraît à l'étape 16.
- Ses voisins sont la place aux étals, la rue qui tourne et les couloirs couverts. Le voisinage est réciproque.
- **Il ne s'ouvre qu'avec ses trois voisins libérés** : nouvelle règle de carte `requiresAllNeighbors`.
- Le chantier errant ne s'y pose jamais (`noChantier`).
- L'étape 16 compte les voisins **tenus maintenant**. Si le chantier en reprend un, il faut le libérer à nouveau.
- La carte compte désormais 15 quartiers.

## Le parcours « Vers le Cœur »
- Parcours dédié de cinq paliers, sur le modèle de la remontée du fleuve. Il coûte une Ration moyenne, hors lancements du jour.
- Paliers :
  1. la rue qui tourne ;
  2. deux squelettes ;
  3. **le Veilleur pose la main sur le mur, et le mur s'ouvre** : une source qui rend tout le Souffle, sans épreuve ;
  4. deux gargouilles ;
  5. l'arche du Cœur.
- **Fond provisoire** : la route des Ruines. Le fond « Vers le Cœur » viendra avec les images.
- **Simplification** : les murs ne bougent pas pendant ce parcours, car le moteur des parcours ne porte pas encore les bascules de la Petite Aventure. Le texte des paliers le raconte.

## « Le dernier trait » (étape 18)
- Quête d'élite à rencontres, même forme que l'étape 14 : trois groupes de bâtisseurs escortés, puis le Golem, avec ses propres chiffres de quête.

## Équilibrage (banc `tools/sim/ruines-acte3-bench.js --golem --quete aq_ruines_coeur`, 24 runs, fin d'acte III, Wenna + Maddoc)

| Réglage | Chevalier | Rôdeur | Mage |
| --- | --- | --- | --- |
| Chiffres de l'étape 14 | 96 % | 92 % | 100 % |
| Rencontres ×2,2 / ×5,4, Golem ×3,3 / ×2,9 | 42 % | 58 % | 79 % |
| **Retenu : rencontres ×2,1 / ×5,0, Golem ×3,0 / ×2,7** | **79 %** | **88 %** | **96 %** |

C'est un cran plus dur que l'étape 14, avant le boss d'Histoire de la livraison 2. Le parcours garde les réglages de combat des Petites Aventures des Ruines.

## Code
- `living-map-system.js` : `requiresAllNeighbors` dans `isReachable`.
- Données :
  - `living-maps.js` : le Cœur et les voisinages ;
  - `scene-templates.js` : `vers_le_coeur` ;
  - `adventure-quests.js` : `aq_ruines_coeur` ;
  - `story-quests.js` : étapes et `storyCoeurVoisins`.
- `tools/sim/ruines-acte3-bench.js` : option `--quete`.
- **Aucun fichier ajouté au jeu. Aucun fichier protégé touché. Aucun nouvel état sauvegardé** : le drapeau du parcours vit dans `explorationProgression`, le Cœur dans le bloc des cartes.

## Images à fournir (avec les précédentes)
- Fond du parcours « Vers le Cœur » (`images/Maps/parcours/…`, 1024 × 1536, chemin à poser dans `PA2_PARCOURS_IMAGES`).

## Contrôles
- Round : **4 028 OK**, 0 échec, sur deux passes. Nouvelle section [208] (14 contrôles). Trois contrôles mis à jour : la carte passe à 15 quartiers, les tranches d'étapes, la fin de l'acte III.
- Boot : 4 OK. Création du héros : 44 OK.
- i18n : 4 385 textes, 100 %, 0 orphelin. 47 nouvelles traductions anglaises.
- Chromium (390×844), vrai jeu :
  - le Cœur posé sur la halle, relié à ses trois voisins ;
  - tutoriel « Le Cœur » affiché ;
  - le parcours se lance ;
  - console sans erreur.
- `node --check` sur tous les fichiers modifiés.
