# v3.775.0 — Simplification : le Labyrinthe aux leviers est retiré (12/11/2026)

Décision de Seb (12/11). Premier des 6 lots de simplification avant l'Alpha (relevé `Aethervale_Releve_Mecaniques_2026-11-12_v3774_0.md` du dépôt de conception) : le Labyrinthe était une mission facultative des Ruines, sans intérêt en fin de partie. Aucun fichier ajouté ni supprimé du jeu, aucun fichier protégé touché.

## Ce qui change
- **La sorte « labyrinthe » ne s'ouvre plus** (`data/labyrinth.js`, `retired`). Sa carte disparaît du tableau des missions. Ses réglages, cases et textes restent : ils sont la base du moteur à leviers que reprend la Faille.
- **Descente en cours dans une vieille sauvegarde** : elle se clôt au chargement, sans remboursement (décision de Seb), dans `SceneRunManager.getRun`.
- **Tutoriel** : `labyrinth_first` est retiré. Le premier point du tutoriel de la Faille ne renvoie plus au Labyrinthe, il explique lui-même les salles dans le noir et les leviers (FR et EN).
- **Textes** :
  - la Ration moyenne ne cite plus le Labyrinthe ;
  - l'Entrepôt ne le donne plus comme départ ;
  - 5 traductions orphelines sont retirées de `en.js`.
- **Ce qui ne change pas** :
  - le Contremaître reste au donjon des Ruines (vague 8), donc « Naturaliste des Ruines » et son haut fait restent possibles ;
  - la Pierre errante garde ses autres sources (carte des Ruines, Petites Aventures, Histoire).
- **Outils** :
  - `tools/sim/labyrinthe-bench.js` est retiré ;
  - dans le harnais, de [210] à [435], la sorte est rouverte comme banc d'essai du moteur partagé avec la Faille, puis refermée.

## Contrôles
- `round-harness` 7311 OK, 0 échec, sur 2 passes ; nouveau contrôle [522] (fermé, plus de carte, tutoriel retiré, vieille descente close, Faille intacte).
- boot 4 OK ; création du héros 46 OK ; parcours complet 239 OK ; i18n 100 %, 0 orphelin.
- Quoi de neuf : une ligne (FR + EN).
