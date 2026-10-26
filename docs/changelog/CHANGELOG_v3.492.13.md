# v3.492.13 — Pastille du monde sur les objets (L2, variante D)

Seb a choisi la variante D dans l'atelier (`atelier/pastille-monde.html`, v2). Aucun fichier JS ou CSS n'est ajouté, et aucun équilibrage ne change.

## Ce qui change
- **Chaque objet porte l'icône de son monde d'origine**, dans le coin haut gauche de son icône (icônes du Codex, `Icons/codex/world_*.webp`). Le badge de comparaison ▲▼ garde le coin opposé.
- **Cercle d'or** : la pastille est cerclée d'or et rayonne quand l'objet a l'affinité de monde (+10 %), c'est-à-dire quand son monde est celui où se tient le héros, à partir de la Montagne. Dans la Montagne, ce sont les pièces de la Montagne. Ailleurs, aucune pastille n'a le cercle d'or.
- **Où** : sur toutes les icônes d'objet du jeu (`buildEquipmentIconHTML`) et sur les tuiles du Sac :
  - Héros › Équipé et sa fiche d'emplacement ;
  - la fiche de comparaison ;
  - l'échoppe de la Halle ;
  - les listes d'objets compatibles.
- **Un objet d'une ancienne sauvegarde**, sans monde enregistré, affiche la Forêt, comme sa ligne « Trouvé en ».

## Retouche d'affichage
Avec l'affinité, les dégâts plats et la célérité pouvaient s'afficher avec une décimale (« +125,4 dégâts par coup »). Ils sont maintenant affichés en entier, écarts de comparaison compris. Le moteur ne change pas.

## Fichiers touchés
- `ui/ui-root.js` : `buildItemWorldPipHTML(item)`, posé par `buildEquipmentIconHTML`.
- `ui/heros-screens-view.js` : la pastille sur les tuiles du Sac.
- `ui/equipment-view.js` : dégâts et célérité affichés en entier.
- `css/00-rframe.css` : `.wpip` et `.wpip.is-here`.

## Harnais
- Nouvelle section [317] : 5 contrôles.

## Contrôles
- `node --check` sur les JS modifiés.
- **Harnais** :
  - round-harness : 5056 OK, 0 échec, sur 2 passes ;
  - boot : 4 OK ;
  - création du héros : 44 OK ;
  - parcours : 139 OK.
- **i18n** : 6404 textes, 100 %, 0 orphelin.
- **Chromium** à 390 et 320 px, sans erreur de console : le Sac, Équipé, la fiche de comparaison et l'échoppe.
