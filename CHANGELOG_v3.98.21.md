# Aethervale — Changelog v3.98.21

## Correctif — la production automatique continuait au-delà du plafond de stock

Les ressources transformées (Farine, Pain, Planche, Lingot, etc.) ont un plafond
de stockage (999). Le chaînage automatique ne le vérifiait pas : il continuait de
consommer des intrants et d'occuper la file même quand la ressource produite
était déjà pleine, gaspillant intrants et temps de craft pour un résultat en
partie ou totalement perdu au moment du crédit.

Corrigé : le calcul de la quantité automatique possible prend désormais aussi en
compte la marge disponible avant le plafond de chaque ressource produite par la
recette, en plus des intrants et de la réserve protégée. Si le stock est déjà
plein, l'auto n'ajoute simplement plus de nouveau lot (elle retentera
périodiquement, comme pour un blocage par réserve — voir v3.98.18).

## Correctif — scroll qui saccadait sur la page Production

Chaque complétion de lot d'atelier (craft manuel ou automatique) déclenchait un
rendu complet de la page, qui interrompait le défilement en cours. Avec le
chaînage automatique actif sur des recettes à cycle court, ces complétions
pouvaient survenir toutes les quelques secondes, rendant le scroll saccadé.

Corrigé : une complétion de lot ne régénère plus que le petit bloc "file de
fabrication" de l'atelier concerné (structure changeante : entrée qui disparaît,
nouvelle entrée automatique qui apparaît), au lieu de toute la page. Le reste des
informations qui changent en continu (temps restant, barre de progression, badge
"File : X/Y", bouton "Tout récolter") continue d'être mis à jour indépendamment,
comme c'était déjà le cas. Les actions manuelles du joueur (fabriquer, améliorer,
annuler un lot) continuent de déclencher un rendu complet normal, sans changement
de comportement perceptible pour elles.

## Fichiers modifiés

- `js/systems/workshops-system.js` — `getMaxAutoCraftTimes()` borné aussi par le
  plafond des ressources produites ; `tickWorkshop()` remplace son
  `renderPanel()` par un rafraîchissement ciblé
- `js/systems/production-system.js` — `updateDOM()` tient aussi à jour le badge
  "File : X/Y" de chaque atelier
- `js/ui/production-view.js` — `id` ajouté sur le bloc file d'atelier et sur le
  badge de file, nouvelle fonction `refreshWorkshopQueueDOM()`
- `sw.js` — `CACHE_VERSION` → 3.98.21

## Notes techniques

- Aucun fichier protégé modifié.
- Logique testée isolément (harnais Node) : plafond de sortie respecté (marge
  exacte avant le cap, pas seulement limité par les intrants), aucun lot poussé
  quand le stock est déjà plein, aucun gaspillage d'intrants dans ce cas, et
  surtout **zéro appel à `renderPanel()` pendant une cascade de plusieurs cycles
  de tick/auto-craft** (seules les actions manuelles ponctuelles en déclenchent
  un) — tous les cas passent.
