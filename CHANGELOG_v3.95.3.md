# Changelog v3.95.3 — Ouvrir une parcelle a maintenant un effet réel

Suite à la question de Seb : ouvrir une parcelle ("Préparer un sillon") n'avait
jusqu'ici aucun effet en soi — c'était un simple prérequis avant de pouvoir la
fertiliser/irriguer. Corrigé : chaque parcelle ouverte donne désormais un petit bonus de
base, cumulable avec les améliorations. Le nombre de parcelles ouvertes au tout début
d'une partie est aussi réduit, pour une progression plus lisible.

2 fichiers modifiés, node --check OK. Comportement revalidé via harnais node vm,
y compris l'effet rétroactif sur une sauvegarde déjà entamée.

---

## js/data/farm-plots.js

- startingOpenPlots : 4 -> 1 — une seule parcelle ouverte au tout début d'une nouvelle
  partie, les 8 autres toutes à débloquer via le choix "Préparer un sillon" (validé avec
  Seb : progression plus lisible, chaque déblocage devient un vrai jalon visible).
- Nouveau baseBonusPerOpenPlot: 0.03 — toute parcelle ouverte contribue +3% Blé, en plus
  des bonus fertile (+8%) et irriguée (+10%) si elle en reçoit ensuite.
- Texte de l'action "Préparer un sillon" mis à jour pour afficher ce bonus.

## js/systems/farm-plots-system.js

getBonusPct() ajoute désormais baseBonusPerOpenPlot pour chaque parcelle à l'état
open, en plus des bonus d'amélioration déjà cumulés. Aucun changement de logique de
déblocage — seule la formule du bonus change.

Effet rétroactif confirmé (comportement voulu, pas un bug) : une sauvegarde déjà
entamée avant ce patch, avec ses parcelles déjà ouvertes (ex. les 4 parcelles de départ de
l'ancienne version), reçoit automatiquement le bonus de base sur ces parcelles dès le
chargement — getBonusPct() ne fait aucune distinction entre une parcelle ouverte avant
ou après ce patch, seul l'état open compte. ensurePlots() ne réinitialise jamais un
tableau de parcelles déjà existant (le nombre total reste 9), donc aucune parcelle déjà
ouverte n'est reverrouillée pour les joueurs en cours de partie.

---

## Tests manuels à effectuer

- Nouvelle partie : une seule parcelle ouverte au départ (au lieu de 4), effet initial
  "+3% Blé" visible immédiatement dans le panneau.
- Choisir "Préparer un sillon" : le bonus cumulé augmente de +3% immédiatement, avant
  même toute amélioration fertile/irriguée sur cette parcelle.
- Fertiliser/irriguer une parcelle déjà ouverte : le bonus de base (+3%) et le bonus
  d'amélioration (+8% ou +10%) s'additionnent bien (ex. +11% ou +13% pour cette
  parcelle seule).
- Sauvegarde existante (créée avant ce patch, avec 4 parcelles déjà ouvertes) : au
  chargement, l'effet cumulé doit refléter automatiquement +12% (4 x 3%) rien que pour
  ces 4 parcelles, sans action du joueur.
