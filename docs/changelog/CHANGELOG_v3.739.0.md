# v3.739.0 — « Tout préparer » sans Huile d'office ; robot qui apprend les recettes (07/11/2026)

Décisions de Seb (07/11).

## Changé
- **« Tout préparer »** : seuls les objets au gain mesuré passent avant la règle face à un miroir (`ET_ITEMS_MESURES = { baume_froid: true }`). L'Huile de lame n'est plus ajoutée d'office (Rôdeur sur la Silhouette : 91 → 91 %) ; elle reste proposée (« Ou emporte : Huile de lame (×n). » et « Emporter »).
- `sortieAdvisedItems(ctx, sansStock)` : ce qu'il faudrait avoir, stock ou non (lu par le robot).

## Outils
- **Robot de campagne** : bâtit l'Apothicaire quand un objet est utile, livre les commandes des objets conseillés pour ses 3 prochaines quêtes (recette apprise), en fabrique jusqu'à 2 de chaque dans le plafond quotidien, et les emporte. Trace : `TRACE_OBJETS=1`. `campagne-lot.js` : recettes, objets fabriqués et emportés par partie.
- Campagne `--n 2` : 6/6 au bout, aucun mur ; médiane 31,3 → 33,8 h (attente « apothicaire » 1,2 h) ; morts 14 → 19 (2 parties par classe : surtout du hasard) ; 5-6 recettes et 10-14 objets emportés par partie (contre presque aucun). Le Chevalier n'a pas son Baume à la Silhouette : plafond quotidien de préparations pris par la Pastille de miel (point ouvert, outils seulement).

## Contrôles
round-harness 7 139 OK, 0 échec (2 passes) ; boot ; création du héros ; i18n 0 manquant, 0 orphelin ; parcours 235 OK.
