# v3.549.0 — Carte vivante : objectif de l'Histoire et élites signalées

Retour de Seb, points 5 et 6, style A choisi dans l'atelier `atelier/carte-objectif.html`.

## Objectif de l'Histoire (point 5)
- Pendant une étape d'Histoire acceptée qui vise un ou plusieurs secteurs, la carte trace en doré le chemin offert. Le tracé part du déjà libéré (ou du foyer) et va jusqu'à l'objectif le plus proche. C'est le même chemin que l'offre gratuite de la v3.548.0 (`LivingMapManager.getStoryFocus`).
- L'objectif porte un halo doré et le parchemin de l'Histoire.
- Les étapes « N secteurs au choix » n'affichent pas de tracé.

## Élites (point 6)
- Chaque élite porte un liseré rouge et une pastille qui montre ce qu'elle donne :
  - la ressource de victoire (Chitine du Dard) ;
  - sinon une pièce Épique (élites de la Montagne) ;
  - sinon la ressource de la carte (Sève de l'Arbre-mère).
- ↻ signale une élite qui se rejoue.
- La pastille est visible même sur un secteur encore voilé (décision de Seb). Une élite unique déjà battue n'est plus signalée.
- La légende gagne deux lignes : Objectif de l'Histoire et Élite.

## Image à signaler
La pastille « pièce Épique » réutilise `images/Icons/equipment_icon/armor_epic.webp` (l'armure Épique), alors que la pièce peut tomber sur n'importe quel emplacement. Une icône dédiée « pièce Épique » serait plus juste.

## Fichiers
- `js/systems/living-map-system.js` : `getStoryFocus`.
- `js/ui/living-map-view.js` : tracé, parchemin, pastilles (`lmEliteGainIcon`), légende.
- `css/04-panel-living-map.css` : styles `.lm-story-*`, `.lm-elite-gain`.
- `js/lang/en.js` : 3 textes.
- `tools/harness/round-harness.js` : contrôle [366] ; [88] compte 10 lignes de légende.

Aucun fichier ajouté au jeu. Outil d'atelier : `tools/audit/carte-objectif-captures.js`.
