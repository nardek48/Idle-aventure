# Aethervale — v3.96.3

## Ajout : descriptions d'effet sur les boutons d'action des parcelles

### Ajouté

Retour Seb : l'effet des améliorations n'était pas clair sans texte explicatif. Chaque
bouton de la zone d'actions (sélection d'une parcelle) affiche désormais une courte
description sous son libellé :

- **Défricher** : "Rend cette parcelle cultivable."
- **Améliorer** : prévisualisation chiffrée du gain, ex. "Blé/min : 0.7 → 1.2 (niv. 2)" —
  calculée dynamiquement à partir du taux réel de la parcelle (profil + niveau actuel vs
  niveau suivant), jamais une valeur codée en dur.
- **🌿 Fertile** : "+8% Blé, permanent. Terre enrichie, rendement durablement amélioré."
- **💧 Irriguée** : "+10% Blé, permanent. Sillon irrigué depuis le Puits, rendement
  durablement amélioré."

Les pourcentages affichés (+8%, +10%) sont lus depuis `FARM_PLOTS_CONFIG.bonusPerImprovement`
plutôt qu'écrits en dur dans le texte — si ces valeurs sont ajustées plus tard (rééquilibrage
annoncé pour une prochaine session), le texte suit automatiquement sans modification de code.

### Détails techniques

- `js/data/farm-plots.js` — `improvementCost.fertile.desc` / `improvementCost.irrigated.desc`
  ajoutés (texte court, même pattern que `profiles.*.desc` déjà existant pour les 3 profils
  de parcelle).
- `js/ui/production-view.js` — `buildFarmActionButtonHTML(opts)` : nouvelle fonction
  factorisée pour les 4 boutons d'action (Défricher/Améliorer/Fertile/Irriguée), qui
  partagent désormais la même structure à 3 zones (libellé, description, coût). Le calcul
  de prévisualisation pour "Améliorer" appelle `FarmPlotsSystem.getPlotRatePerMin()` deux
  fois (niveau actuel, niveau+1) sans modifier l'état réel de la parcelle.
- `css/04-panel-production.css` — `.farm-plot-action-btn` passé de "1 ligne libellé+coût" à
  "libellé + description empilés à gauche, coût à droite" (`.farm-plot-action-btn-text`,
  `.farm-plot-action-label`, `.farm-plot-action-desc`). Hauteur minimale des boutons
  augmentée (36px → 44px) pour accueillir la ligne de description.
- Aucun changement de logique métier (`farm-plots-system.js` / `production-system.js` non
  touchés) — uniquement présentation. Les 39 tests système existants restent valides
  (relancés, toujours 39/39). Vérification fonctionnelle complémentaire (harnais `vm`,
  génération HTML avec la vraie `formatNumber`) : descriptions et prévisualisation de taux
  générées correctement pour les 4 types d'action.
- `sw.js` — `CACHE_VERSION` → `3.96.3`.
