# Aethervale v3.457.3 — Patrouilles des Ruines et de la Crypte

Lot 2 de l'audit du 20/10 (constat P1), d'après le document « Patrouilles des Ruines et de la Crypte » v1.0, validé par Seb le 20/10/2026.

## Le défaut
Une patrouille envoyée dans les Ruines ou la Crypte revenait avec 0 ressource et 0 or. Les tables de patrouille ne connaissaient que la Forêt et le Désert. Chaque lieu était marqué « le plus », puisque tous valaient 0. Edda et Ysolt n'avaient aucun récit de retour, et le texte les mettait au masculin (« Edda est rentré »).

## Ce qui change
- **Rendements**, mesurés au banc `patrouille-bench.js` (cible : environ 15 % des matériaux d'un joueur actif, au plus 10 % de l'or de Taverne) :
  - **Ruines** : 125 matériaux et 18 or par heure, les mêmes taux qu'au Désert, puisque les plafonds de village sont identiques. Le banc donne 15,0 % des matériaux et 7,9 % de l'or.
  - **Crypte** : 190 matériaux et 21 or par heure. Le banc donne 15,2 % et 7,9 %.
- **Ressources par lieu** : une principale et une secondaire pour chacun des 15 lieux des Ruines et des 14 lieux de la Crypte. Par exemple :
  - Place aux étals : blé et viande ;
  - Lac froid : eau et pierre ;
  - Source verte : eau et blé.
- **Ingrédients de rations** : 3 viandes séchées et 1 pain, comme au Désert.
- **Edda et Ysolt au féminin** : « rentrée », « repartie ».
- **Récits de retour** (24 nouveaux) :
  - Wenna et Maddoc aux Ruines et dans la Crypte ;
  - Edda aux Ruines ;
  - Ysolt dans la Crypte.

  Un compagnon qui patrouille hors de son monde, par exemple Edda en Forêt, revient avec la phrase du narrateur : « Edda rentre de {lieu}, les sacs pleins. » Avant, Wenna et Maddoc racontaient la Forêt partout.
- **Garde-fou pour les mondes futurs** :
  - une carte sans rendement n'est plus proposée en patrouille ;
  - « le plus » n'est plus affiché quand tout vaut 0.

## Code
- **Données** : `patrols.js` (taux, rations, ressources, féminin, récits, phrase du narrateur).
- **Système** : `patrol-system.js` (cartes sans taux filtrées, récit du narrateur).
- **Interface** : `expeditions-view.js` (« le plus »).
- **Langue** : `en.js` (25 textes) et `data-fields.js` (registre). L'audit i18n donne 100 % et 0 orphelin.
- **Outils** : `patrouille-bench.js` couvre les Ruines et la Crypte. Le harnais a une nouvelle section, [253]. Résultat : 4 488 OK, 0 échec, sur deux passes.

Aucun fichier protégé n'a été touché et aucun fichier n'a été ajouté.
