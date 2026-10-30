# v3.586.0 — Expéditions : une ligne par sorte, et la page garde sa place

Retour de Seb (30/10), option A validée.

## Campement › Expéditions
- **Ordre fixe, une ligne par sorte** : Donjon, Petites Aventures, Patrouilles, Caravane. Les rubriques par état (À récupérer, Prêts à partir, En route, Plus tard) disparaissent : l'état se lit sur chaque ligne (couleur, bouton, compte à rebours). Le compteur en tête reste.
- **Patrouilles** : une seule ligne, par exemple « 1 de retour · 1 en patrouille · 1 au camp ». « Prendre le butin » (ou « Tout prendre » s'il y en a plusieurs) récupère tous les retours. Sinon la ligne ouvre la feuille **Patrouilles**, un compagnon par ligne ; la fiche d'un compagnon ouverte depuis là y revient à la fermeture.
- **Caravane** : une seule ligne aussi (« 2 en route », « Rentrée · 120 or à décharger »). « Décharger » vide toutes les caravanes rentrées.
- Quand une partie est au camp et une autre en route, la ligne montre aussi le compte à rebours du premier retour.

## La page ne remonte plus
- Cause, mesurée sous Chromium : la position n'est gardée que si l'écran reste « le même », et ce repère lisait le texte de l'onglet actif, **pastille de compte comprise**. Récupérer une caravane ou une patrouille faisait disparaître la pastille verte d'Expéditions : l'écran était pris pour un autre, et la page repartait en haut. Le même défaut touchait l'onglet Missions et sa pastille.
- Correctif : le repère ignore les pastilles (`getPanelScreenKey`, `js/ui/ui-root.js`). Mesure : avant, 357 px puis 0 après « Prendre le butin » ; après, 168 px puis 168.

## Code
- `js/ui/expeditions-view.js` : `patrolSummaryEntry`, `patrolCollectAll`, `caravanSummaryEntry`, `caravanUnloadAll`, feuille `patrols`, ordre des entrées, tableau sans rubriques.
- `js/ui/ui-root.js` : `getPanelScreenKey` sans les pastilles.
- `css/04-panel-expeditions.css`, `css/10-grand-ecran.css` : styles des anciennes rubriques retirés.
- `js/lang/en.js` : textes anglais ; deux anciennes chaînes retirées.
- Aucun fichier ajouté, aucun fichier protégé, aucun nouvel état.

## Contrôles
`round-harness` 5 588 OK, 0 échec (deux passes ; nouvelle section [390], [191], [198] et [250] mis à jour) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` 142 OK ; audit i18n 100 %, 0 orphelin. Écran vérifié sous Chromium à 390 × 844 et 1440 × 900.
