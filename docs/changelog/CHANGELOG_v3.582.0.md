# v3.582.0 — Le donjon sur la carte du monde

Chantier « icône de donjon », options A et 1 de Seb (30/10) : un repère du donjon de chaque monde sur la carte du monde, téléphone et PC.

## Le badge
- Accroché en bas à droite du cercle de chaque monde atteint.
- **Pas de badge** tant que l'Histoire n'a pas annoncé le donjon, ni sur un monde pas encore atteint.
- **Gris au cadenas** : annoncé, pas encore ouvert.
- **Doré, lumineux** : ouvert, des sorties restent aujourd'hui.
- **Éteint** : plus de sortie aujourd'hui.
- Au toucher : dans le monde où tu es, la fiche du donjon s'ouvre. Sinon un message : « Ossuaire : pas encore ouvert. » ou « … : voyage d'abord jusqu'à ce monde. »

## L'image
- Nouvelle icône prévue : `images/Icons/dungeon/dungeon_entrance.webp` (porte de donjon à arche de pierre, prompt donné à Seb). **Pas encore livrée** : le chemin est gardé et l'icône générique s'affiche (`tools/audit/missing-icons.js` la liste).
- La fiche du monde sur PC n'emprunte plus l'icône « Butin garanti » (doublon signalé) : elle prend la même icône de donjon.
- Signalé à Seb, sans correction : les icônes des donjons ne vont pas ensemble (scène en portrait pour le Basilic, boucliers numérotés « palier 2 à 5 », rien pour le Sommet interdit).

## Code
- `js/ui/map-view.js` : `DUNGEON_MAP_ICON`, `dungeonMapIconHTML`, `mapDungeonOf`, `mapDungeonBadgeHTML`, `tapMapDungeon` ; le cercle du monde est enveloppé (`.map-node-pic`) pour porter le badge.
- `css/06-map.css` : le badge et ses états.
- `js/lang/en.js` : textes anglais.
- Aucun fichier ajouté (l'image viendra), aucun fichier protégé, aucun nouvel état.

## Contrôles
`round-harness` 5 582 OK, 0 échec (deux passes ; nouvelle section [386]) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` 142 OK ; audit i18n 100 %, 0 orphelin ; `missing-icons` : 1 image attendue (celle-ci). Carte vérifiée sous Chromium à 390 × 844 et 1440 × 900.
