# v3.603.0 — Quêtes des compagnons : un lieu par quête

Demande de Seb (31/10). Jusqu'ici, n'importe quelle Petite Aventure du bon monde comptait : une seule sortie pouvait faire avancer plusieurs quêtes de compagnon. Désormais, chaque quête a son lieu.

## Ce qui change
- **Chaque étape « Petite Aventure » ou « élite » reçoit un seul lieu** sur la carte vivante de son monde. Il est choisi parmi les lieux jouables à ce moment-là, de préférence un secteur pas encore libéré. Seul ce lieu compte.
- **Deux quêtes en cours ne reçoivent pas le même lieu** quand la carte en offre assez. S'il n'y en a plus, le lieu est partagé, mais **une sortie ne fait avancer qu'une seule quête**.
- **Après chaque réussite, un autre lieu** si possible. Une étape à 3 Petites Aventures se joue donc sur 3 lieux.
- Un lieu qui n'est plus jouable est remplacé tout seul.
- **Seuls les secteurs de la carte vivante comptent.** Les parcours de l'Histoire ne comptent plus pour ces quêtes.
- **La carte de quête** dit où aller : « Lieu : … », ou « un secteur voilé (marqué sur la carte) ». Si la carte du monde n'est pas encore ouverte : « Aucun lieu ouvert pour l'instant ».
- **Sur la carte vivante**, une seule pastille au portrait, sur ce lieu. « J'y vais » centre la carte dessus.
- Le lieu attribué et le dernier lieu joué sont gardés avec la quête (`sec`, `last`, dans l'état du compagnon déjà sauvegardé).

## Fichiers
- `js/systems/companion-quest-system.js` : `assignAll`, `targetOf` ; `_count` crédite une quête par sortie.
- `js/systems/pa2-run.js` et `js/systems/living-map-system.js` : le lieu joué est transmis.
- `js/systems/companion-system.js` : `sec` et `last` sauvegardés.
- `js/ui/companion-quest-view.js` : la ligne « Lieu ».
- `css/04-panel-quests.css`, `js/lang/en.js`, `js/ui/news-view.js` (une ligne « Quoi de neuf »).
- Aucun fichier ajouté. Aucun fichier protégé touché.

## Contrôles
- `round-harness` : 5 687 OK, 0 échec, sur deux passes. Les sections [395] et [397] sont revues :
  - un seul lieu compte, et un autre arrive après une réussite ;
  - deux quêtes reçoivent deux lieux différents ;
  - une sortie ne crédite qu'une quête.
- `boot-harness` : 4 OK. `hero-creation-harness` : 44 OK. `parcours-harness` : 142 OK.
- Audit i18n : 100 %.
- Capture sous Chromium à 390 × 844.
