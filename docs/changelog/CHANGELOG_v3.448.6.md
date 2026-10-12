# Aethervale v3.448.6 — Le palier Rare dit ce qui manque, et où le trouver

Suite de l'audit du 11/10 : le palier Rare (ruines_13) pèse 18 à 31 h sur les 22 à 39 h d'étapes du chapitre III, et ses matériaux viennent de mondes passés sans que le jeu dise où. Validé par Seb. S'applique sur la v3.448.5.

## Ce qui change
- **Carte d'étape, « Ce qui manque »** (une fois l'étape acceptée, tant qu'elle n'est pas prête) :
  - pièces Rares : le compte, et d'où elles viennent (Sanctuaire scellé, échoppe de la Halle marchande, élites des Ruines) ;
  - Forge 4 : chaque matériau qui manque, avec où le trouver ; « Tout est là : à construire au Village, Bâtiments » si rien ne manque ;
  - reforge suivante de l'arme : chaque matériau qui manque et où le trouver ; « Il faut d'abord la Forge 4 » si le niveau est bloqué ; « Tout est là : à la Forge, Établi » sinon.
  - Les quantités et les coûts sont lus dans le vrai jeu (`VillageBuildingManager.getNextCost`, `ForgeManager.getCost`), remises de l'Histoire et des choix comprises.
- **Établi de la Forge** : sous une reforge qui manque de matériaux, la provenance de chacun (le `sourceHint` déjà montré sur les chantiers du village). Chaque provenance n'apparaît qu'une fois sur l'établi.
- Mécanisme réutilisable : une étape peut porter `missing(game)` (liste de `{ text, where }`).

## Code
- `js/data/story-quests.js` : `storyMissingCostLines`, `storyPalierRuinesRareMissing`, `missing` sur ruines_13.
- `js/ui/quests-view.js` : bloc « Ce qui manque » de la carte d'étape.
- `js/ui/village-building-view.js` : provenances sous les reforges.
- `css/04-panel-quests.css` : style du bloc.
- `js/lang/en.js` : 8 traductions.
- `tools/harness/round-harness.js` : section [230] (7 contrôles).
- Aucun fichier ajouté, aucun fichier protégé touché.

## À signaler (non corrigé)
- La provenance de la Clé de voûte dit « Pierres errantes et Pierre taillées au Tailleur de pierre » : l'accord de « taillées » est ambigu. Texte de données existant, laissé tel quel.

## Contrôles
- Chromium (390 × 844 et 320 × 568), partie amenée à ruines_13 par l'Admin, deux états (Forge 3, puis Forge 4 avec l'arme à 6) : le bloc liste les bons manques, l'établi ne répète pas les provenances.
- Round : **4 247 OK**, 0 échec, sur trois passes. Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK. i18n : 4 660 textes, 100 %, 0 orphelin.
