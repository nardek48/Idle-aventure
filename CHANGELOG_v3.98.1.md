# Aethervale — v3.98.1

## Correctif majeur : saccades sur l'écran Production (rendu toutes les secondes)

Retour Seb : l'écran Production semblait "saccadé", pas fluide sur mobile. Confirmé — un
throttle existant (`_renderAccum`, préexistant à cette session) déclenche `renderPanel()`
chaque seconde tant que l'écran Production est visible, et `renderPanel()` reconstruit
**tout le HTML de l'écran Village** (`container.innerHTML = buildVillageHTML()`) à chaque
appel : potentiellement 6 bâtiments, 54 zones, 12 ateliers. C'est ce remplacement complet
du DOM chaque seconde qui causait le rendu saccadé.

### Correctif

`ProductionManager.tick()` n'appelle plus `renderPanel()` automatiquement. À la place,
une nouvelle méthode `ProductionManager.updateDOM()` met à jour **directement** les
éléments DOM concernés (jauges, labels, statuts, bouton Récolter, compte à rebours de
craft) via leurs `id`, sans reconstruire le HTML environnant. Le rendu complet
(`renderPanel()`) ne se déclenche plus que lors d'une vraie action du joueur (récolte,
achat, sélection de zone, déblocage, craft, annulation...) — exactement comme les autres
écrans du jeu, qui ne se rafraîchissent déjà que sur action.

### Ce qui est mis à jour en continu (sans reconstruction du DOM)

- Carte principale de chaque bâtiment : jauge de stock, label "X / Y [ressource]", statut
  "Plein dans..." ↔ "✅ Stock plein", bouton Récolter (activé/désactivé + texte "· X").
- Mini-cartes de zone (si le panneau "Parcelles/Territoires/etc." est ouvert) : jauge et
  label de stock individuels.
- File de craft d'un atelier (si le panneau "⚙️ Production" est ouvert) : compte à rebours
  et barre de progression du lot en cours.

Toute action qui change la **structure** du DOM (une zone qui passe de verrouillée à
ouverte, une entrée de file qui apparaît/disparaît, un niveau qui change de palier) continue
de passer par `renderPanel()` classique, déclenché directement par l'action concernée — pas
par le tick automatique.

### Détails techniques

- `js/ui/production-view.js` — ajout d'`id` prévisibles sur les éléments concernés :
  `prod-bar-{buildingId}`, `prod-stock-label-{buildingId}`, `prod-status-{buildingId}`,
  `prod-harvest-btn-{buildingId}`, `prod-plot-bar-{buildingId}-{index}`, `prod-plot-stock-
  {buildingId}-{index}`, `prod-workshop-time-{workshopId}`, `prod-workshop-bar-
  {workshopId}`.
- `js/systems/production-system.js` — `ProductionManager.updateDOM()` (nouvelle méthode) :
  parcourt les 6 bâtiments et les 6 ateliers actifs, met à jour `style.width`,
  `textContent`/`innerHTML` et les classes des éléments trouvés par `id`. Deux helpers
  `setElementWidth(id, pct)` / `setElementText(id, text)`, avec garde défensive sur
  `typeof document === "undefined"` (compatible harnais de test Node, sans DOM). Chaque
  accès DOM vérifie l'existence de l'élément avant manipulation — un panneau fermé (donc
  ses éléments jamais créés) ne provoque aucune erreur, `updateDOM()` l'ignore simplement.
- Le throttle à 1 seconde (`_renderAccum`) est conservé tel quel — ce n'est pas sa
  fréquence qui posait problème, mais le coût de `renderPanel()` à chaque déclenchement.
- Aucun changement de logique métier (production, craft, coûts) — uniquement le mécanisme
  de rendu. Aucun fichier protégé touché.

### Tests

Nouveau harnais `node vm` avec stub DOM minimal (`getElementById`/`style`/`classList`/
`textContent`/`innerHTML`/`querySelector`, fidèle au comportement réel — retourne `null`
si l'élément n'existe pas) — **8/8 assertions passent** : `updateDOM()` n'appelle jamais
`renderPanel()`, jauge et label de la carte principale mis à jour après un tick, bouton
Récolter réactivé automatiquement quand du stock apparaît, jauge de zone individuelle mise
à jour, compte à rebours et barre de progression d'un atelier mis à jour, **et surtout**
`updateDOM()` ne plante pas quand des éléments n'existent pas encore dans le DOM (panneaux
fermés — cas le plus fréquent en jeu). Harnais des zones et des ateliers (121 assertions,
v3.97.x/v3.98.0) relancés sans modification : toujours valides, aucune régression.

### Pour la prochaine session

- Si des saccades persistent ailleurs dans le jeu (hors écran Production), il faudra
  étendre la même approche de mise à jour ciblée à ces écrans — décision explicite prise
  de cibler Production en priorité pour cette passe (le tick le plus fréquent).
