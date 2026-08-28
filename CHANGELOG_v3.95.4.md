# Changelog v3.95.4 — Confirmation avant application d'un choix de parcelle

Bug rapporté par Seb : cliquer sur une parcelle appliquait immédiatement et
définitivement le choix (ouvrir/fertiliser/irriguer), sans aucune étape de confirmation
— une erreur de clic était irréversible.

2 fichiers modifiés, node --check OK. Flux complet (sélection, changement d'avis,
désélection, validation, annulation) testé via harnais node vm.

---

## Nouveau flux en 2 temps

1. Sélection : cliquer une parcelle éligible ne fait plus qu'une sélection visuelle
   (bordure pointillée dorée, distincte du simple surlignage "éligible") — rien n'est
   appliqué ni sauvegardé à ce stade. Le joueur peut cliquer une autre parcelle éligible
   pour changer sa sélection sans aucune conséquence, ou cliquer "Choisir une autre
   parcelle" pour revenir à l'état de sélection sans perdre l'action choisie
   (ouvrir/fertiliser/irriguer), ou "Annuler" pour tout annuler et revenir aux 3 boutons
   d'action.
2. Validation : un nouveau bouton "Valider" applique réellement le choix — c'est la
   seule action qui écrit dans l'état persistant et déclenche la sauvegarde.

## js/ui/production-view.js

Nouvelle variable selectedFarmPlotIndex (état de sélection en attente, distinct de
pendingFarmUpgradeAction). confirmFarmUpgradeChoice(plotIndex) (qui appliquait
directement) est remplacée par selectFarmPlot(plotIndex) (sélection pure) +
validateFarmUpgradeChoice() (application réelle, seule fonction qui appelle
FarmPlotsSystem.applyChoice()). Nouvelle fonction deselectFarmPlot() pour revenir à
l'étape de sélection sans perdre l'action en cours.

## css/04-panel-production.css

Nouvelle classe .farm-plot.is-selected (bordure pointillée + fond doré, distincte de
.is-eligible) et .farm-upgrade-confirm-actions (rangée des 2 boutons
"Choisir une autre parcelle" / "Valider").

---

## Garanties

- Aucune application accidentelle : applyChoice() (qui débite le palier et sauvegarde)
  n'est appelée que par validateFarmUpgradeChoice(), jamais par un simple clic sur une
  parcelle.
- Le palier reste dû (hasPendingChoice() reste true) tant qu'aucune validation
  explicite n'a eu lieu — annuler à n'importe quelle étape ne fait perdre aucun choix.

---

## Tests manuels à effectuer

- Choisir une action, cliquer une parcelle éligible : elle doit apparaître sélectionnée
  (bordure pointillée) sans que rien ne change dans la grille ni dans l'effet cumulé.
- Cliquer une autre parcelle éligible : la sélection doit basculer sur la nouvelle,
  toujours sans rien appliquer.
- Cliquer "Choisir une autre parcelle" : retour à la surbrillance des parcelles
  éligibles, l'action reste la même.
- Cliquer "Valider" : le choix s'applique réellement (parcelle ouverte ou améliorée,
  effet cumulé mis à jour, palier consommé).
- Cliquer "Annuler" à n'importe quelle étape avant validation : retour aux 3 boutons
  d'action, aucun palier perdu (le badge de compte reste correct).
