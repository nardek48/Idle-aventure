# Aethervale — v3.97.1

## Noms et icônes thématiques pour les améliorations de zone

Remplace les libellés génériques "🌿 Fertile" / "💧 Irriguée" (identiques sur les 6
bâtiments) par des noms et icônes propres à chaque bâtiment, inspirés de la maquette
fournie par Seb (`aethervale-maquette-domaines-production.html`). **Effet inchangé** :
toujours +8% et +10% de taux, cumulables — seuls le nom et l'icône changent.

### Grille validée avec Seb

| Bâtiment | Amélioration (+8%) | Amélioration (+10%) |
|---|---|---|
| Champs | 🌱 Terre enrichie | 💧 Sillon irrigué |
| Chasse | 🪤 Pièges entretenus | 🏕️ Affût aménagé |
| Scierie | 🌱 Reboisement | 🌳 Bois préservé |
| Mine | ⛏️ Galerie étayée | 🪨 Filon dégagé |
| Carrière | 💎 Veine prospectée | 🧱 Galerie consolidée |
| Puits | 🏺 Bassin agrandi | ⚙️ Pompe optimisée |

### Détails techniques

- `js/data/production-plots.js` — chaque entrée `improvementCost.fertile` /
  `improvementCost.irrigated` de `PRODUCTION_PLOTS_BUILDINGS` gagne deux champs `label` et
  `icon` (en plus du `cost` et `desc` déjà existants). Source unique de vérité pour le nom
  affiché — plus aucun libellé ou icône générique codé en dur côté UI.
- `js/ui/production-view.js` — `buildPlotImprovementIconHTML()` lit désormais `label`/`icon`
  depuis `buildingCfg.improvementCost[kind]` (nouvelle signature : prend `buildingCfg` en
  paramètre plutôt qu'une icône fixe passée à l'appel). `buildPlotActionsHTML()` construit
  le libellé des boutons Fertile/Irriguée à partir de `fertileDef.icon + " " +
  fertileDef.label` / `irrigatedDef.icon + " " + irrigatedDef.label` au lieu du texte fixe
  "🌿 Fertile" / "💧 Irriguée".
- Aucun changement de logique métier (coûts, formules, cumul des bonus identiques) —
  uniquement présentation. Les 89 tests système existants restent valides (relancés,
  toujours 89/89, aucun ne dépendait des libellés). Vérification fonctionnelle
  complémentaire (harnais `vm`, génération HTML) : les 12 nouveaux libellés (6 bâtiments ×
  2 améliorations) et leurs icônes apparaissent correctement, y compris l'état visuel
  "appliqué" (testé sur Carrière : 💎 Veine prospectée).
- `sw.js` — `CACHE_VERSION` → `3.97.1`.
- Aucun fichier protégé touché.
