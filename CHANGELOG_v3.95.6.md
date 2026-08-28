# Changelog v3.95.6 — Correctif : boutons Récolter/Améliorer désalignés sur certaines cartes

Bug rapporté par Seb (capture d'écran) : sur certaines cartes de Production (ex. Chasse
niveau max), le bouton "Niveau max" se retrouvait tout en bas de la carte au lieu d'être
juste sous "Récolter", cassant l'alignement en colonne des 2 boutons d'action attendu.

2 fichiers modifiés, node --check OK. Structure de rendu revalidée via harnais node vm
sur les 2 cas (bâtiment normal, Champs avec panneau Parcelles).

---

## Cause

.production-card était passée en flex-wrap: wrap en v3.95.1, pour permettre au
panneau "Parcelles et améliorations" (Champs) de passer sur sa propre ligne sous la
rangée principale. Mais ce flex-wrap s'appliquait à tous les enfants directs de la
carte, y compris .production-card-actions (Récolter/Améliorer) — dès que le texte de
statut ("Plein dans 1m 28s") ou le nom du bâtiment poussait la largeur totale
(portrait+infos+actions) au-delà de l'espace disponible, le navigateur pouvait choisir de
faire passer la colonne d'actions à la ligne suivante plutôt que de compresser la zone
infos, séparant visuellement "Récolter" du bouton du dessous.

## css/04-panel-production.css

Nouvelle classe .production-card-main-row : conteneur dédié à la rangée
portrait+infos+actions, en flex-wrap: nowrap — ces 3 éléments ne peuvent plus jamais
être séparés entre eux. Seul .production-card-full-row (le panneau Parcelles) reste
autorisé à passer à la ligne suivante, via le flex-wrap: wrap du conteneur parent
.production-card (align-items ajusté de center à flex-start, cohérent avec une
carte qui peut maintenant contenir 2 lignes empilées).

## js/ui/production-view.js

buildProductionCardHTML() enveloppe désormais portrait+infos+actions dans ce nouveau
<div class="production-card-main-row">, avant l'éventuel panneau Parcelles. Aucun autre
changement de contenu ou de logique — uniquement la structure d'enveloppement.

---

## Tests manuels à effectuer

- Chasse (ou tout bâtiment niveau max) : les boutons "Récolter" et "Niveau max" doivent
  rester alignés l'un sous l'autre, juste à droite de la carte — plus de grand espace
  vertical entre eux.
- Vérifier sur les 6 bâtiments, à différents niveaux (y compris niveau max) et avec des
  textes de statut variables ("Plein dans Xs/Xm", "Stock plein").
- Champs : le panneau "Parcelles et améliorations" continue de s'afficher normalement
  sous la rangée principale, sans régression sur son comportement (v3.95.1-v3.95.5).
