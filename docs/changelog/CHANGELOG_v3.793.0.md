# v3.793.0 — Petites Aventures : les mots de la Montagne et de la Tour (13/11/2026)

Correction demandée par Seb (13/11). Aucun fichier protégé modifié, aucun changement de sauvegarde, aucun fichier ajouté.

## Ce qui change
- `pa2Words` (`ui/pa2-view.js`) : la Montagne et la Tour reprenaient les textes de la Forêt. Elles ont maintenant les leurs :
  - **Montagne** :
    - départ « Gravir la montagne » ; repos « Écouter la montagne » ;
    - retour « … avant que la lave ne monte. La montagne garde ses veines. » ;
    - chute « … reste dans la cendre » ;
    - destination « S'approcher de la source ».
  - **Tour** :
    - départ « Monter l'escalier » ; repos « Écouter la Tour » ;
    - retour « … avant le palier suivant. La Tour garde ses étages. » ;
    - chute « … reste dans l'escalier » ;
    - destination « S'approcher de la citerne ».
- **Traductions** : 12 textes nouveaux (dont la ligne du Quoi de neuf) ; « Écouter la Tour » existait déjà.

## Contrôles
- `round-harness` 7082 OK, 0 échec ([513b] nouveau : textes propres, aucun mot de la Forêt).
- boot 4 OK ; création du héros 46 OK ; parcours complet 236 OK ; i18n 100 %, 0 orphelin ; capture du bouton « Gravir la montagne ».
- Quoi de neuf : une ligne (FR + EN).
