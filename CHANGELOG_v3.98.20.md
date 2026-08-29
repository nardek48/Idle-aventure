# Aethervale — Changelog v3.98.20

## Correctif urgent — page Production inaccessible

La v3.98.19 (noms de lieux pour les zones) avait supprimé par erreur la
déclaration de `buildingCfg` dans `buildPlotCardHTML()`, encore utilisée plus
loin dans la même fonction pour afficher les icônes d'amélioration
(Fertile/Irriguée). Résultat : `ReferenceError: buildingCfg is not defined` dès
qu'un bâtiment à zones (Champs, Chasse, Scierie, Mine, Carrière, Puits) tentait
de s'afficher — rendait l'onglet Production, et potentiellement le Village
entier, inutilisable.

Corrigé : la déclaration de `buildingCfg` a été restaurée en début de fonction,
en plus du nouveau `zoneName` ajouté en v3.98.19.

## Fichiers modifiés

- `js/ui/production-view.js` — `buildingCfg` de nouveau déclaré dans
  `buildPlotCardHTML()`
- `sw.js` — `CACHE_VERSION` → 3.98.20

## Notes techniques

- Aucun fichier protégé modifié.
- Vérifié cette fois par un test de **rendu réel** (exécution effective de
  `buildPlotsPanelHTML()` avec des zones ouvertes et verrouillées, avec et sans
  zone sélectionnée) plutôt que la seule validation syntaxique
  (`node --check`), qui ne détecte pas les `ReferenceError` à l'exécution comme
  celle-ci — les deux chemins de code touchés par le bug ont été exercés sans
  erreur.
