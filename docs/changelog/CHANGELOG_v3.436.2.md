# Aethervale v3.436.2 — Rapport de donjon : tout le butin, dans l'ordre

Suite de la v3.436.1, d'après la capture de Seb (Sanctuaire scellé).

## Ce qui change
- **Ordre de l'or** : Butin des vagues → En sûreté au campement → Prime de fin → Total or.
- « En sûreté au campement » n'ajoute plus « or » après le montant, comme les autres lignes.
- **Matériau du donjon** :
  - il prend sa vraie icône (la Pierre errante n'emprunte plus `scene/path_easy.png`) ;
  - la part du campement est comptée, y compris quand on sort au campement.
- **Butin** : tous les objets du run, colorés selon leur rareté :
  - ceux mis en sûreté au campement ;
  - ceux ramassés dans les vagues (boss compris) ;
  - l'objet de la récompense de fin.
- Le libellé « Butin » reste sur une ligne ; une longue liste d'objets passe à la ligne, calée à droite.

## Code
- `systems/dungeon-system.js` (protégé, accord de Seb) : le rapport reçoit `specialIcon` et `wavesItems` ; le nom et l'icône du matériau sont aussi transmis lors d'une sortie au campement.
- `ui/dungeon-view.js` : lignes réordonnées, matériau et liste d'objets.
- `css/04-panel-dungeon.css` : sélecteurs en enfant direct (`>`), pour que les noms d'objets imbriqués gardent leur couleur et leur graisse.
- Aucun fichier ajouté.

## Contrôles
- Banc (Sanctuaire, campement « Souffler » puis « Sortir ») : rapport complet dans les deux cas.
- Chromium (390 × 844) : 4 objets sur 2 lignes, aucun débordement (largeur de défilement égale à la largeur des lignes).
- Round : 4 113 OK, 0 échec, sur trois passes. Boot : 4 OK. i18n : 100 %.
