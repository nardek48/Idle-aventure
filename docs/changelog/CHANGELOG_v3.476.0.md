# v3.476.0 — Donjons : feuille de lancement réorganisée

Bilan des donjons, point 5 (la lisibilité), option A de Seb, d'après le prototype validé (`atelier/feuille-lancement.html`, page Artifact « Feuille de lancement »).

## Ce qui change en jeu
La feuille de lancement d'un donjon se lit maintenant de haut en bas, dans l'ordre de la décision :
1. **Mode et niveau** (onglets Sortie du jour / Mode libre, flèches de niveau), puis le **pronostic**.
2. La **préparation cochée** (Tanière jamais terminée).
3. **À gagner** : la rareté du butin, le matériau de monde et les Éclats (ou, en mode libre, « or ÷ 4, Éclats ÷ 2 »), **l'unique du boss** avec son taux (5 % par victoire) et son pouvoir, l'or et les Éclats au-delà du plafond avec « Touché par l'Aether », ou le prochain palier de butin. Le multiplicateur des Marques est en titre.
4. **Ce qui t'attend** : 15 vagues dont 4 en groupe, les élites qui mettent le butin en sûreté, le campement (Ruines, Crypte), le renfort des monstres au niveau choisi, les haltes (1 à 3 sur un donjon terminé, sinon « après une première victoire »).
5. **Marques**, repliées par défaut avec leur résumé (« 0 / 3 · ×1.0 ») ; on touche pour les ouvrir.
6. **Histoire** (récit et Sceau), repliée.

« Sorties restantes » n'apparaît plus qu'une fois (dans l'onglet), et la ligne « Mode libre : sorties illimitées » disparaît (l'onglet le dit). « Entrée offerte » reste en bas pendant l'Histoire. Rien ne change dans les règles.

## Code
- `ui/dungeon-view.js` : `buildDungeonGainHTML`, `buildDungeonAheadHTML`, replis (`toggleDungeonFold`, Marques et Histoire repliées à chaque ouverture) ; `buildDungeonLevelHTML` ne garde que mode et niveau.
- `css/04-panel-dungeon.css` : blocs `.dgain`, replis `.dsheet-fold`.
- `lang/en.js` : 8 textes ajoutés, 2 retirés (plus utilisés). Aucun fichier protégé, aucun fichier ajouté.

## Outils
- `round-harness.js` : section [297] (unique et pouvoir, vagues de groupe, élites, haltes, campement, replis, plus de doublon) ; [47b] et [277] suivent la nouvelle feuille (Marques ouvertes pour leurs contrôles, texte du mode libre).
