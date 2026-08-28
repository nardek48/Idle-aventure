# Changelog v3.95.5 — Correctif : écran figé après validation d'un choix de parcelle

Bug rapporté par Seb : après avoir cliqué "Valider", le popup de validation restait
affiché, l'écran semblait figé et plus rien ne réagissait.

1 fichier modifié, node --check OK. Reproduit et corrigé, revalidé via harnais node vm
capturant le HTML réellement régénéré (pas un simple stub muet).

---

## Cause

validateFarmUpgradeChoice() (v3.95.4) appelait FarmPlotsSystem.applyChoice() — qui
déclenche son propre renderPanel() en interne, de façon synchrone — avant de remettre
pendingFarmUpgradeAction/selectedFarmPlotIndex à null. Le rendu déclenché par
applyChoice() reconstruisait donc le HTML en lisant encore l'ancien état (action et
parcelle toujours "en attente" côté vue), même si l'état réel du jeu
(game.production.farm.pendingUpgradeChoice) avait déjà été correctement mis à jour.
Les deux variables étaient ensuite remises à null après coup, sans qu'aucun second
rendu ne vienne jamais corriger l'affichage — l'écran restait bloqué sur le popup de
validation déjà traité.

## js/ui/production-view.js

validateFarmUpgradeChoice() réordonnée : pendingFarmUpgradeAction/
selectedFarmPlotIndex sont désormais remis à null avant l'appel à
FarmPlotsSystem.applyChoice() (l'action et la parcelle sont capturées dans des
variables locales juste avant, pour ne pas perdre l'information à transmettre). Le
renderPanel() interne à applyChoice() génère ainsi directement le bon HTML — plus
besoin d'un second rendu correctif après coup.

---

## Tests manuels à effectuer

- Sélectionner une action, choisir une parcelle, cliquer "Valider" : le panneau doit
  immédiatement revenir à son état normal (grille mise à jour, effet cumulé actualisé,
  plus aucun popup de validation affiché), et le reste de l'écran doit rester réactif.
- Si un autre palier reste dû après cette validation, le prochain popup de choix doit
  s'afficher directement (comportement du rattrapage introduit en v3.95.2, non affecté
  par ce correctif).
