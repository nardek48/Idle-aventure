# Aethervale — v3.96.2

## Correctif : timer sur 2 lignes quand le panneau Parcelles est ouvert

### Corrigé

- Quand le panneau "Parcelles" se déplie, le texte de statut ("⏳ Plein dans Xm Ys") de la
  carte du haut pouvait passer sur 2 lignes, ce qui grandissait `.production-card-info` et
  faisait légèrement descendre le portrait et le bouton "Récolter" (recentrés
  verticalement par rapport à ce bloc devenu plus haut).
- `.production-card-status` n'avait pas de `white-space: nowrap` (contrairement à
  `.production-card-name` et `.production-card-level-badge`, déjà protégés) — corrigé,
  avec troncature (`ellipsis`) en garde-fou si jamais l'espace venait à manquer.

### Détails techniques

- `css/04-panel-production.css` — `.production-card-status` : ajout de
  `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`.
- Aucun changement JS, aucun changement de logique métier.
- `sw.js` — `CACHE_VERSION` → `3.96.2`.
