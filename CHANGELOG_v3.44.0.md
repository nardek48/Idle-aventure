# Aethervale — v3.44.0

## Correctif : l'étape 3 de la chaîne de déblocage de l'Atelier ne se validait pas à la récolte

**Symptôme (remonté par Seb)** : récolter les 15 Pierre requises par l'étape 3
("Récolter 15 Pierre") ne validait pas la quête immédiatement. L'Atelier se
débloquait quand même (visible sur la carte Entrepôt), mais il fallait
ensuite construire le premier niveau pour que l'étape 3 se valide enfin.

**Cause** : `WarehouseManager.addResource()` (`systems/warehouse-system.js`)
ne déclenche `WorkshopUnlockManager.checkCurrentStep()` que si
`key === "bois"` — ce hook a été ajouté en v3.39 spécifiquement pour l'étape 1
("Récolter 10 Bois"), mais jamais étendu à `"pierre"` pour l'étape 3.
Résultat : l'étape 3 ne se validait qu'accidentellement, quand
`checkCurrentStep()` était redéclenché ailleurs pour une autre raison — ce
qui arrive dans `ConstructionManager.buy()` (`systems/construction-system.js`)
à chaque achat de niveau, d'où le symptôme "il faut monter un niveau pour
que la quête se valide".

**Fix** : la condition couvre maintenant `"bois"` ET `"pierre"` — les deux
seules ressources brutes suivies par la chaîne (étapes 1 et 3).

### Fichier modifié

- **`js/systems/warehouse-system.js`** — `addResource()`, condition du hook
  `WorkshopUnlockManager.checkCurrentStep()` étendue à `"pierre"`.

### CACHE_VERSION

`sw.js` : `3.43.0` → `3.44.0`.

### Tests

- `node --check` OK.
- Harnais Node dédié : récolter 15 Pierre valide l'étape 3 immédiatement
  (reproduit exactement le symptôme signalé, confirmé corrigé) ; non-régression
  sur le hook bois (étape 1, toujours fonctionnel) ; confirmation que les
  ressources non suivies par la chaîne (viande, fer, blé, planche, lingot,
  farine) ne déclenchent pas `checkCurrentStep()` inutilement.

### Test manuel à réaliser (device)

Sur une sauvegarde où l'étape 3 n'est pas encore validée : récolter 15 Pierre
(bâtiment Carrière) et vérifier que le popup de complétion de l'étape 3
s'affiche immédiatement, sans avoir besoin de construire l'Atelier au préalable.
