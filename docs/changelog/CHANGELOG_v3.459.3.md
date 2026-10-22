# v3.459.3 — Lot 8c, septième passe : icônes, interface, cadres, boutons, donjons (audit O4)

## Retirés
- Les 69 originaux PNG/JPG passés en WebP en v3.459.2.

## En WebP
- 338 images : tout `Icons/` restant (système, quêtes, talents, états de combat, Village, scène, potions…), `UI`, `Borders`, `Buttons`, `Dungeons`. Icônes ramenées à 256 px au plus ; interface, cadres et boutons sans perte. 17,2 → 5,2 Mo.
- Chemins réécrits dans 93 fichiers, plus les chemins construits : états de combat (`combat-states.js`, `combat-screen-view.js`) et statistiques (`heros-screens-view.js`).
- Seules restent en PNG les 5 icônes de la PWA (manifeste, iOS, favicon).
- Les originaux restent une version. `game/images` : 44 → 40 Mo, et 22 Mo environ une fois les originaux retirés.

## Harnais
- `round-harness.js` : un lecteur d'en-tête PNG/WebP (`imgInfo`) remplace la lecture PNG seule pour les contrôles de taille et de transparence ; 12 attentes passent en `.webp`.

## Contrôles
- Les 338 WebP se décodent dans Chromium ; combat, Caravane, Talents et Mémoire vérifiés à l'écran ; `missing-icons.js` : les 24 mêmes absentes.
- round-harness 4545 OK, 0 échec (deux passes) ; boot, création du héros OK ; parcours complets 139 OK, 0 échec.
