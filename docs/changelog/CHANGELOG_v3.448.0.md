# Aethervale v3.448.0 — Le feu et les rations pour toute l'équipe

Question de Seb : comment soigner les compagnons ? Constat dans le code : rien ne les soignait hors combat (ni le feu,
ni les rations) ; un compagnon blessé le restait, alors qu'un compagnon tombé revenait à 30 %. Option 3 choisie.

## Ce qui change
- **Le feu de camp soigne aussi les compagnons** au camp (recrutés, pas en patrouille) : même rythme que le héros,
  même plafond pendant l'absence.
- **Une ration nourrit toute l'équipe** : héros et compagnons regagnent le même pourcentage de leurs PV max. Elle se
  mange dès qu'au moins un membre est blessé. Descriptions des trois rations mises à jour.
- **Carte du Campement** : une ligne fine par compagnon (portrait, nom, jauge) sous la jauge du héros ;
  indication « Toucher une ration : toute l'équipe mange ».

## Mesure (campagne-lot, 12 parties, --combats, avant → après)
Durée médiane 35 → 32 h ; soin au camp 7,7 → 6,8 h ; morts du Chevalier 20/29/24/26 → 16/29/22/21.

## Contrôles
- `round-harness` : 4 199 OK, 0 échec ; contrôle [223] ajouté.
- `parcours-harness` : 139 OK (3 passes). Correctif du test P4 (reprise après 40 min) : sous l'horloge factice de
  Playwright, la boucle de jeu peut rester figée après le saut ; depuis l'initiative (v3.447.0), le combat a besoin
  d'elle. Le combat de ce test est rejoué en mode synchrone (sujet du test : l'écran de retour).
- `boot` 4 OK ; `hero-creation` 44 OK ; i18n 100 %, 0 orphelin. Aucun fichier ajouté, aucun fichier protégé modifié.
