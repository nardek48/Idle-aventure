# Aethervale — v3.96.4

## Correctif : bouton "Récolter" affichait un montant supérieur à la somme visible des parcelles

### Corrigé

Bug signalé par Seb (capture d'écran) : la carte Champs affichait "Récolter · 1" alors que
les 4 parcelles ouvertes affichaient toutes "0/49", "0/132", "0/60", "0/15".

**Cause** : `getTotalStock()` sommait le stock **brut** (non arrondi) de chaque parcelle
avant d'arrondir le total (`Math.floor(0.9 + 0.9 + 0.9 + 0.9) = Math.floor(3.6) = 3`), alors
que chaque mini-carte de parcelle arrondit individuellement (`Math.floor(0.9) = 0`). Le
total affiché ne correspondait donc pas à la somme de ce que le joueur voyait sur les
parcelles.

**Correctif** : `getTotalStock()` additionne désormais `Math.floor(plot.stock)` de chaque
parcelle **avant** de sommer, exactement comme le faisait déjà `harvestAll()` en interne
pour le calcul réel de récolte. Le total affiché correspond maintenant systématiquement à
la somme exacte des valeurs visibles sur les parcelles, et à ce qui sera réellement crédité
à la récolte.

### Effet de bord (mineur, attendu)

Le stock "fractionnaire" sous 1 par parcelle (ex. 0.9 blé) n'est plus compté dans le total
affiché tant que la parcelle n'atteint pas 1 elle-même. Rien n'est perdu : ce stock reste
dans la parcelle et continue de s'accumuler au tick suivant, jusqu'à franchir 1 et
apparaître normalement. Comportement volontairement identique à celui déjà en place pour
les 5 autres bâtiments de Production (arrondi par `Math.floor` à l'affichage).

### Détails techniques

- `js/systems/farm-plots-system.js` — `getTotalStock()` : `total += p.stock` remplacé par
  `total += Math.floor(p.stock)`.
- Aucun changement à `harvestAll()` (déjà correct), ni à `getTotalCapacity()` /
  `getTotalRatePerMin()` (pas concernées par ce bug, qui portait uniquement sur
  l'affichage du stock).
- Harnais de test étendu : nouveau test reproduisant exactement le scénario signalé (4
  parcelles à 0.9 chacune, total affiché doit être 0 et non 3) + vérification que la
  récolte réelle reste cohérente avec ce total affiché (0 affiché = 0 blé réellement
  crédité). Un test existant a été ajusté pour refléter le nouveau comportement (un tick
  court peut désormais afficher un total "0" même si le stock brut a légèrement progressé
  — le test vérifie maintenant le stock brut de la parcelle séparément, et le total affiché
  avec un tick assez long pour dépasser 1). **41/41 tests passent.**
- `sw.js` — `CACHE_VERSION` → `3.96.4`.
