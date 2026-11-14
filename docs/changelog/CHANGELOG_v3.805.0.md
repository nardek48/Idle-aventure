# v3.805.0 — Petites Aventures : les aides arrivent au moment où elles servent (14/11/2026)

Audit de l'Alpha (13/11) : à la première Petite Aventure, 8 bulles puis deux fenêtres longues (830 et 640 caractères) avant le premier pas. Option A de Seb (14/11). Aucun fichier protégé modifié, aucun changement de sauvegarde, aucun fichier ajouté.

## Constat
- « Pièges et sentiers coupés » avait sa version en bulles, mais retombait sur la fenêtre de 5 lignes dès qu'un seul élément était visible, souvent un sentier coupé dès le départ, sans piège.
- « Les petites quêtes du chemin » s'ouvrait au premier passage secret trouvé (souvent au premier pas) et expliquait cinq mécaniques d'un coup.

## Changement
- `ui/tutorial-view.js` :
  - `pa2_traps` : les pièges seuls (4 lignes en fenêtre de repli), à la première apparition d'un piège ;
  - `pa2_cuts` (nouveau) : le sentier coupé, à sa première apparition ;
  - `pa2_quests` remplacé par quatre fenêtres courtes, chacune à la première apparition de sa mécanique : `pa2_secret` (premier passage secret), `pa2_lock` (premier verrou ou clé montrée), `pa2_cache` (première cache annoncée), `pa2_ends` (première fin imposée ou cachée). La cache et les fins rappellent en tête qu'une rencontre peut lancer une petite quête, rappelée en haut de l'écran.
  - Qui a déjà vu l'ancienne fenêtre des petites quêtes ne voit pas les nouvelles (`pa2TutoRun`).
- `ui/coach-view.js` : `pa2_traps` en 2 bulles ; `pa2_cuts` en 1 bulle (`minSteps: 1`, nouveau réglage du repli : une aide d'une bulle ne retombe plus sur la fenêtre).
- Textes repris des fenêtres d'origine ; nouveaux : les six titres et la phrase de la rencontre (FR + EN).

## Captures (validées par Seb avant publication)
- `tools/audit/coach-captures.js` : déclencheurs `pa2_cuts`, `pa2_secret`, `pa2_lock`, `pa2_cache`, `pa2_ends` sur une vraie carte de la Forêt. Captures dans `captures/tutos-pa/`.

## Contrôles
- `round-harness` 7122 OK, 0 échec, sur 2 passes ([284], [513], [520] mis à jour pour le nouveau découpage).
- boot 4 OK ; création du héros 46 OK ; parcours complet 236 OK ; i18n 100 %, 0 orphelin.
- Quoi de neuf : une ligne (FR + EN).
