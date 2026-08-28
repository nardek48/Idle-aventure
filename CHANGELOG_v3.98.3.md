# Aethervale — v3.98.3

## Bouton "Améliorer" sur les ateliers (désactivé, "Bientôt")

Ajout du bouton "⬆️ Améliorer" sur les 6 ateliers actifs, comme dans le prototype fourni
par Seb — mais **désactivé**, affichant "Bientôt" : le système de niveau/vitesse d'atelier
reste différé (décision v3.98.0), seule la place est réservée pour l'instant.

### Détails techniques

- `js/ui/production-view.js` — `buildWorkshopCardHTML()` : ajout d'un bouton
  `<button class="workshop-upgrade-btn is-disabled" disabled>⬆️ Améliorer · Bientôt</button>`
  après le bloc craft (stepper + Fabriquer), sur les ateliers actifs uniquement.
- `css/04-panel-production.css` — `.workshop-upgrade-btn` / `.workshop-upgrade-btn.is-disabled`,
  style cohérent avec le thème du jeu (pas de style importé du prototype).
- Aucun changement de logique métier. Les 129 assertions des 3 harnais existants (zones,
  ateliers, DOM ciblé) relancées : toujours valides. Vérification fonctionnelle
  complémentaire : bouton présent et bien désactivé sur un atelier actif.
- `sw.js` — `CACHE_VERSION` → `3.98.3`.
