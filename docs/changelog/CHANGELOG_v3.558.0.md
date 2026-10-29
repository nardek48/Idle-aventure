# v3.558.0 — Grand écran, option B (4 et 5/5) : le Camp sur une page, le Héros complété

Fin de l'option B (accord de Seb du 29/10, « tu peux lancer les 2 »), d'après la maquette `atelier/grand-ecran.html`. Format large seulement : **le téléphone ne change pas**.

## Camp
- **Une seule page, plus d'onglets** : à gauche, *Le feu de camp* (PV, régénération, équipe, rations), *Les braises* quand une offrande est en cours, puis le *Grimoire* (règles actives, mode, Régler mes tactiques) ; à droite, les *Missions* (avec Voir le tableau complet) et les *Expéditions* (à récupérer, prêts à partir, en route).
- Chaque bloc a son titre en Cinzel, comme la maquette.

## Héros › Résumé
- **À gauche** : le héros, puis Entraînement, Mémoire, Ce que tu portes et Mes héros.
- **Au centre** : *Équipement* (silhouette ; un emplacement ouvre sa fiche), la panoplie, et un bouton **Sac · n** qui ouvre le sac.
- **À droite** : *Stats*, puis **Capacités** (chaque technique avec sa recharge et son rang, la fiche Capacités au toucher) et **Compagnons** (ceux qui partent avec toi : portrait, compétence, PV ; la page Compagnons au toucher).

## Code
- `js/ui/camp-view.js` : au format large, `buildCampHTML` pose les blocs côte à côte au lieu des onglets (un onglet demandé explicitement garde l'affichage du téléphone).
- `js/ui/heros-screens-view.js` : `wideSkillsHTML`, `wideCompanionsHTML` ; `heroTiles` peut laisser la tuile Capacités (elle a sa liste au format large).
- `css/10-grand-ecran.css` : section « option B, Camp et Héros ».
- `js/lang/en.js` : textes anglais. Aucun fichier ajouté, aucun fichier protégé.

## Contrôles
`round-harness` 5 474 OK, 0 échec (deux passes, section [373] ajoutée) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` P11 15 OK. Captures à 1440 × 900 ; téléphone inchangé.
