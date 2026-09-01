# v3.106.2 — Nettoyage : suppression du bac à sable pré-P2 (code mort)

## Contexte

Question posée en session : `combat-sandbox-system.js` et consorts sont-ils encore utilisés depuis le passage au moteur par rounds (P2) ? Vérification : aucun de ces fichiers n'est chargé par `index.html`, et rien dans les fichiers réellement chargés n'y fait référence. Code mort confirmé, sans impact fonctionnel à la suppression.

## Fichiers supprimés

- `js/systems/combat-sandbox-system.js` (82 Ko) — ancien moteur de simulation « auto-DPS », remplacé par `js/sim/combat-round-sim.js` (P2)
- `js/systems/combat-batch-sim-system.js` (10 Ko) — ancien agrégateur de runs batch, remplacé par `aggregateSorties()` du nouveau simulateur
- `js/ui/combat-sandbox-view.js` (67 Ko) — ancienne vue du bac à sable, remplacée par `js/ui/combat-round-sandbox-view.js` (déjà en prod, seule vue chargée)

~160 Ko de code mort retirés, aucune ligne de logique active touchée.

## Fichier modifié

- `sw.js` — `CACHE_VERSION` 3.106.2

## Tests

Harnais complet toujours à **284 assertions, 0 échec** après suppression — confirme que le jeu n'avait aucune dépendance sur ces fichiers.
