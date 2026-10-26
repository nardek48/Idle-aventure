# v3.492.11 — Les pièces de la Montagne, plus lisibles (L1, L3)

Retour de Seb : on ne voit pas facilement si un objet est un Épique de la Montagne. On garde donc ceux de la Crypte, et les quêtes qui demandent des pièces de la Montagne deviennent difficiles. Seb a validé les options L1 et L3. Aucun équilibrage ne change, et aucun fichier JS ou CSS n'est ajouté.

## Ce qui a été constaté dans le code
L'échelle de monde (Crypte ×4, Montagne ×6) ne s'applique qu'aux stats plates :
- les dégâts de l'arme ;
- les dégâts auto des bottes ;
- les affixes plats.

Les stats en pourcentage gardent les mêmes fourchettes dans tous les mondes. C'est une règle de conception. Sur 5 emplacements sur 7 (armure, casque, gants, anneau, amulette), un Épique de la Montagne vaut donc un Épique de la Crypte, au tirage près. La puissance est une décision à part, qui reste à prendre (option P1, à mesurer au banc).

## L1 : le monde d'origine, partout
- **Fiche d'objet, fiche de comparaison et fiche d'emplacement** : « Trouvé en … » s'affiche sur les 7 emplacements. Avant, seulement sur l'arme et les bottes.
- **Héros › Équipé**, panneau sous la silhouette : une ligne courte avec le nom du monde, par exemple « Montagne brûlante ».
- **Échoppe de la Halle** : le monde suit la rareté, par exemple « Épique · Montagne brûlante ».

## L3 : ce qui compte pour l'Histoire
- **Ce qui manque** (étapes 9 et 13 de la Montagne) : les emplacements sans pièce de la Montagne sont nommés. Par exemple : « Sans pièce de la Montagne : Casque, Gants, Anneau, Amulette. »
- **« ✓ Compte pour l'Histoire »**, pendant le palier en cours :
  - sur un objet du sac ou de l'échoppe qui comblerait un emplacement : Épique ou mieux, de la Montagne, pour un emplacement qui n'en porte pas encore ;
  - sur une pièce portée qui compte : la coche suit le nom du monde dans le panneau d'Équipé.

## Fichiers touchés
- `data/story-quests.js` : `storyItemCompteMontagne`, `storyMontagneTrous`, `storyItemComptePourPalier`, et le texte de « Ce qui manque ».
- `ui/equipment-view.js` : l'origine sur tous les emplacements et `buildItemStoryCountHTML`.
- `ui/heros-screens-view.js` : la ligne courte du panneau d'Équipé.
- `ui/equip-shop-view.js` : le monde et la mention sur la carte de l'échoppe.
- `css/04-panel-heros-screens.css` : `.hs-edetail-orig`.
- `lang/en.js` : 2 textes.

## Harnais
- [29b] : le contrôle « aucune provenance sur un emplacement qui ne suit pas l'échelle » est inversé, sur décision de Seb (L1).
- Nouvelle section [315] : 7 contrôles.

## Contrôles
- `node --check` sur les JS modifiés.
- **Harnais** :
  - round-harness : 5043 OK, 0 échec, sur 2 passes ;
  - boot : 4 OK ;
  - création du héros : 44 OK ;
  - parcours : 139 OK.
- **i18n** : 6402 textes, 100 %, 0 orphelin.
- **Chromium** à 390 et 320 px, sans erreur de console : la fiche de comparaison, le panneau d'Équipé, l'échoppe de la Halle et « Ce qui manque » de l'étape 9.
