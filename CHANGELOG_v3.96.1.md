# Aethervale — v3.96.1

## Correctifs UI Champs (retours sur v3.96.0)

### Corrigé

- **Nom du bâtiment tronqué** ("C..." au lieu de "Champs") : le badge "3 / 9 parcelles"
  dans le titre poussait le nom hors du conteneur. Déplacé dans le bouton dépliable
  "Parcelles" (`.farm-plots-count`), le titre garde uniquement le nom du bâtiment.
- **"Récolter tout" → "Récolter"** : tient désormais sur une seule ligne dans le bouton.
- **Débordement des mini-cartes de parcelle hors du cadre** : trop d'information empilée
  par carte (nom, niveau, jauge, icônes, bouton avec coût sur 2 lignes). Le bouton d'action
  a été retiré de chaque mini-carte.

### Changé — nouveau flux de sélection

Remplace le bouton individuel par mini-carte par une interaction en 2 temps, plus légère :

1. Le joueur **tape une parcelle** dans la grille (ouverte ou verrouillée) → elle se
   sélectionne visuellement (bordure dorée). Une seule parcelle sélectionnée à la fois —
   retaper la même la désélectionne, taper une autre change la sélection.
2. Une **zone d'actions commune** apparaît sous la grille, propre à la parcelle
   sélectionnée :
   - Parcelle verrouillée → bouton **Défricher** avec son coût.
   - Parcelle ouverte → bouton **Améliorer** (si niveau < max) et boutons **🌿 Fertile** /
     **💧 Irriguée** (si pas encore appliquées), chacun avec son coût affiché.

Mini-carte allégée en conséquence : niveau au-dessus du nom (comme demandé), jauge, icônes
fertile/irriguée en état visuel seul (grisées/colorées, plus tapables directement — l'action
passe maintenant par la zone commune). Hauteur réduite (~92px contre ~128px), tient dans le
cadre de la grille 3×3.

### Détails techniques

- `js/ui/production-view.js` — `selectedFarmPlotIndex` (état local, une seule sélection),
  `selectFarmPlot(index)` (toggle sélection/désélection), `buildFarmPlotActionsHTML()`
  (nouvelle zone d'actions), `buildFarmPlotCardHTML()` allégée (plus de bouton intégré),
  `buildFarmImprovementIconHTML()` simplifiée (état visuel seul, `onclick` retiré).
  Les icônes fertile/irriguée ne sont plus tapables individuellement — cohérent avec le
  nouveau flux où toutes les actions d'une parcelle passent par la zone commune une fois
  sélectionnée.
- `css/04-panel-production.css` — `.farm-plots-count` (nouveau badge dans le toggle),
  `.farm-plot-card` allégée et réduite, `.farm-plot-card.is-selected` (surbrillance),
  `.farm-plot-actions`/`.farm-plot-actions-title` (nouvelle zone), `.farm-plot-action-btn`
  reformaté en ligne horizontale (icône/libellé à gauche, coût à droite) plutôt qu'empilé
  verticalement dans une carte étroite.
- **Aucun changement côté `farm-plots-system.js` / `production-system.js`** — la logique
  métier (déblocage, amélioration, fertile/irriguée, tick, récolte) est strictement
  identique à v3.96.0, seule l'interaction UI change. Les 39 tests système de v3.96.0
  restent valides tels quels (relancés, toujours 39/39).
- Test fonctionnel complémentaire (harnais `vm`, génération HTML) : ouverture du panneau,
  sélection/désélection par retap, affichage correct de la zone d'actions selon l'état de
  la parcelle (verrouillée → Défricher ; ouverte → Améliorer/Fertile/Irriguée) — tout génère
  sans exception.
- `sw.js` — `CACHE_VERSION` → `3.96.1`.
- Aucun fichier protégé touché.

### Pour la prochaine session

- Vérifier en jeu que la grille tient bien dans le cadre sur les largeurs 320-360px les
  plus étroites (le correctif vise ce cas, non re-testé visuellement au-delà du harnais).
- Reste ouvert : palier 6+ par parcelle lié aux mondes, quête d'introduction Champs,
  rééquilibrage général une fois testé en conditions réelles (reportés depuis v3.96.0).
