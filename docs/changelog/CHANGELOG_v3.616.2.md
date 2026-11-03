# v3.616.2 — 30 nouvelles icônes

Images générées par Seb (planches), découpées et livrées en WebP transparent.

## Images ajoutées (`game/images/`)
- `Icons/village_events/` : event_rumeur, event_demande, event_marche, event_fete, event_cadeau, event_palissade (256 px).
- `Icons/dungeon/dungeon_entrance.webp` : badge d'entrée de donjon de la carte (256 px).
- `Icons/resources/` : corde_tressee_icon, trousse_maitre_icon, torche_resinee_icon (256 px).
- `Icons/camp/` : topic_talk, topic_self, topic_world, topic_quest, topic_others (256 px).
- `Icons/companions/relics/` : les 14 reliques uniques (Wenna, Maddoc, Edda, Ysolt, Sarkel), 256 px.
- `Dungeons/Icone_base/palier6.webp` : Sommet interdit, 400 px de large comme la série. Damier incrusté de la planche effacé.

## Code
- `js/data/dungeon.js` : le donjon 6 (Sommet interdit) reçoit son icône (`icon: null` → `palier6.webp`). Les 29 autres chemins étaient déjà branchés.
- Quoi de neuf : une ligne (FR + EN).

## Contrôles
- Audit des icônes : aucune image absente. Harnais 5 822 OK, 0 échec (2 passes). boot, création du héros, i18n 100 %, parcours.
- Pas de nouveau JS/CSS : `sw.js` ne change que de version.
