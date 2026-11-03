# v3.646.0 — Les secteurs dans les récits de patrouille

Relevé à la v3.645.0, sur les recommandations de Claude (Seb, 03/11). Les noms de secteur portent leur article avec une majuscule (« Le puits sec »). Environ 48 récits plus anciens écrivaient « À {secteur} », « de {secteur} » ou « jusqu'à {secteur} », ce qui donnait « jusqu'à Le puits sec » ou « de La tour de guet ».

## Correction dans le code (`systems/patrol-system.js`)
- Nouvelle fonction `PatrolManager._placeSector`, appelée par `storyText`.
- **En début de phrase**, le nom reste tel quel : « Le palier sans murs. »
- **En milieu de phrase**, l'article passe en minuscule : « J'ai tracé la porte du Sanctuaire ».
- **Contractions** : « à le » → « au », « à les » → « aux », « de le » → « du », « de les » → « des ». La majuscule est gardée (« Au trône de sable »), « jusqu'à » est compris (« jusqu'au trône de sable »).
- La phrase du narrateur en profite : « Sarkel rentre de la rue qui tient ».
- En anglais, « The » passe en minuscule en milieu de phrase. Les règles françaises ne s'appliquent pas.
- Aucun texte réécrit.

## Contrôles
- Tous les récits avec tous les secteurs de leur monde, sur toutes les cartes : 0 tournure fautive (« à Le », « de Les », article en majuscule après un mot).
- `node --check` sur les fichiers modifiés.
- `round-harness.js` : 6 090 OK, 0 échec, sur deux passes.
- `boot-harness.js` : 4 OK.
- `parcours-harness.js` : 212 OK, 0 échec.

## Fichiers
- Fichiers modifiés : `systems/patrol-system.js`, `ui/news-view.js`, `lang/en.js`, `core/constants.js`, `sw.js`.
- Aucun fichier protégé touché, aucun fichier ajouté.
