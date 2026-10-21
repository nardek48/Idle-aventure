# v3.458.1 — Lot 6a : pastilles, onglet du bas, bulles du Donjon, zoom (audit P29, C8, P28, P30)

Première partie du lot 6 (lisibilité et mobile) : les corrections sans changement de mise en page. Le reste (6b) passe d'abord par l'atelier.

## P29 — Hauts faits : la catégorie active reste à l'écran
- Une rangée de pastilles qui défile (`.kchips.is-scroll`) garde sa position au re-rendu ; si la pastille active sort du champ, elle y revient (`revealActiveChips`, `ui-root.js`).
- Mesuré à 320 px : « Collection » touchée reste visible (x 198 à 287, rangée jusqu'à 289) au lieu de repartir à x = 595.

## C8 — L'onglet du bas qui contient l'écran s'allume
- Donjon, Carte, Grimoire → Campement ; Potions (Boutique) → Village ; Mémoire, Équipement, Talents → Héros. Hauts faits, Journal, Tutoriels, Paramètres → Menu, comme avant (`TAB_PARENT`).

## P28 — Pas de bulles flottantes sur le Donjon
- Même masquage que Héros et Expéditions (`body.dg-on-list`). Nombre de bulles inchangé ailleurs.

## P30 — Le pincement pour zoomer est permis
- `index.html` : `maximum-scale` et `user-scalable=no` retirés du viewport (Android peut zoomer).
- Sur iOS seulement, `maximum-scale=1.0` est remis par un script en tête : Safari laisse pincer malgré lui, et il évite le zoom automatique au toucher d'un champ de moins de 16 px (code de sauvegarde, Grimoire).
- Les cartes gardent leur propre pincement (`touch-action: none`). Commentaire faux de `01-base.css` corrigé.

## Contrôles
- round-harness 4516 OK, 0 échec (deux passes), section [259] ; boot, création du héros OK ; parcours complets 139 OK, 0 échec.
- Chromium 320/390 px : mesures ci-dessus ; viewport Android sans plafond, iOS avec `maximum-scale=1.0`.
- Aucun fichier protégé, aucun fichier ajouté.
