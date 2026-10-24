# v3.475.0 — Tanière : préparation cochée

Bilan des donjons, point 2 (la préparation), option A de Seb.

## Ce qui change en jeu
Tant que la Tanière du Basilic n'est pas terminée, sa feuille de lancement montre une **liste de préparation cochée** à la place du conseil en texte :
- l'arme de la Fileuse aux yeux blancs (Fil-de-lame, Arc à corde blanche ou Bâton aux fils blancs selon la classe) ;
- le Plastron d'écorce brûlée (Ronce qui se souvient) ;
- le Terrain d'entraînement niveau 4 (avec le niveau actuel).

Chaque ligne est cochée ✔ selon la partie (quête d'élite réussie, niveau du bâtiment) ; ce qui manque dit où aller. Tout coché : « Préparation : tout est prêt ». L'équilibrage ne bouge pas (au banc : 0 % sans les deux armes, 100 % avec). Le conseil de l'étape forest_14 reste sur la fiche de quête.

## Code
- `data/dungeon.js` : `prepChecks` sur la Tanière (le `prepHint` reste en repli pour un donjon sans liste).
- `ui/dungeon-view.js` : `buildDungeonPrepHTML` ; `css/04-panel-dungeon.css`.
- `lang/en.js` : 6 textes. Aucun fichier protégé, aucun fichier ajouté.

## Outils
- `round-harness.js` : section [296] (rien de prêt, tout prêt, liste à la place du conseil, plus de liste une fois terminée).
