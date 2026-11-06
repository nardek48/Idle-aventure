# v3.727.0 — Petites Aventures : accroches et parcours de la Tour (06/11/2026)

Accroches de la Tour validées par Seb (06/11), textes compris : `systemes/petites-aventures/Aethervale_Accroches_Tour_v0_1.md`, recommandations du §9. Fin de l'extension des parcours (v3.724.0 à v3.727.0).

## Ajouté
| Accroche | Mécanique |
|---|---|
| Des pas qui redescendent (Wenna, branche « suivre ») | A, le sac sous le sable ; retour gardé par un gardien de pierre (×0,6, sans or) |
| La porte que personne ne tient (Maddoc) | B, la porte sans cadre, verrou sur le seuil ; clé : la cale, marquée si le gardien est aidé ; passer sans l'aider : −15 % d'or aux fins |
| La marche en trop (Wenna, Edda, branche « monter ») | D cachée, le palier en trop ; « Poser le pied dessus » pose la marque (+1 cran, ×1,2 de dégâts reçus) |
- `PA2_HOOKS_BY_WORLD.tower` : tirées dès l'ouverture de la carte des étages (tour_06).
- Passages secrets relevés au pixel : tour_1 C0>CAMP, R4>R6, C6>PALIER ; tour_2 C0>CAMP (l'arche bleue), L4>L6, R6>PALIER. Fin cachée `PALIER` : pan de tour au-dessus du gardien (tour_1), îlot à la petite tour (tour_2).
- **Icônes des fins de la Tour** : la Tour avait les icônes de la Forêt (le gardien avec l'image du Cerf-Racine) ; elle a maintenant ses propres chemins (`PA2_ICONS_BY_WORLD.tower`), icône générique en attendant les images.
- La redite : aucune règle propre (elle ne tombe qu'après un run raté ; la quête suivante repart de zéro).

## Banc (Tour, héros niveau 25, 100 runs par cellule, sans quêtes → avec)
| | KO | Or/min |
|---|---|---|
| Sentier | 0 → 0 % | +5 % |
| Périple | 9 → 11 % | +1 % |
Aucun KO pendant le détour du sac. Campagne v3.726.0 (12 parties) : 12/12 au bout, médianes 36,3 / 37,9 / 33,0 h, 99 morts.

## À signaler
- Icônes absentes : `scene/dest/dest_tower_boss`, `dest_tower_clairiere`, `dest_tower_tertre`, `dest_tower_cachee`, `scene/quest/quest_cale`.
- À la Tour, le bilan de fin de run s'affiche sur le fond forestier et le bouton de fuite dit « Fuir par les fourrés ».
- tour_1 : le palier caché et le gardien sont proches à l'écran.

## Contrôles
round-harness 6 903 OK, 0 échec (2 passes), dont la section [488] (60 contrôles) ; boot ; création du héros ; i18n 0 manquant, 0 orphelin ; parcours 235 OK.
