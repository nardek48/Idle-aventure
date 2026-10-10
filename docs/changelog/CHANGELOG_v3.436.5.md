# Aethervale v3.436.5 — Caravane : la Halle marchande d'abord

Bug relevé au rejeu des 4 premières heures. Décision de Seb : bug 2 du rapport, option B. S'applique sur la v3.436.4.

## Le constat
- La caravane part de la Halle marchande. Sans Halle, `buildCaravanHTML()` ne rendait rien.
- À l'étape « On n'y vend rien. Pas encore. » (ruines_04), « Partir » ouvrait une feuille « Caravane » vide, titre seul. Rien ne disait qu'il fallait bâtir la Halle.

## Ce qui change
- **La feuille Caravane, sans Halle** : « Pas encore de caravane — La caravane part de la Halle marchande. Bâtis-la au Village. » et un bouton « Voir la Halle marchande ». Le bouton ferme la feuille et ouvre la fiche de la Halle (Village › Bâtiments), qui donne son coût et ses prérequis. Valable par tous les chemins qui mènent à la feuille.
- **L'étape ruines_04, tant que la Halle n'existe pas** :
  - l'objectif ajoute « Bâtis d'abord la Halle marchande (Village › Bâtiments) », à la place du compteur « Caravane du Marché des Ruines 0/1 » ;
  - « Partir » mène à la fiche de la Halle au lieu de la feuille Caravane.
- Une fois la Halle bâtie, rien ne change : compteur et feuille Caravane comme avant.

## Code
- `js/ui/caravan-view.js` : état « pas encore de caravane », `goToCaravanHall()`.
- `js/data/story-quests.js` : ruines_04, `linkTo` et `progress` selon `storyCaravanReady()` (nouvelle aide).
- `js/lang/en.js` : 3 textes (« Market Hall », comme le reste du jeu).
- Aucun fichier ajouté.

## Contrôles
- Chromium (390 × 844), sauvegarde du rejeu à ruines_04 sans Halle : objectif avec la mention, « Partir » → Village, fiche de la Halle ouverte ; feuille Caravane ouverte directement → texte et bouton, le bouton mène à la Halle.
- Même étape, Halle bâtie : « Partir » ouvre la feuille Caravane (caravane rentrée, « Décharger »).
- Round : 4 113 OK, 0 échec, sur deux passes. Boot : 4 OK. i18n : 100 %.
