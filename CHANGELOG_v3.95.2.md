# Changelog v3.95.2 — Correctif : choix de parcelle jamais proposé sur un bâtiment déjà avancé

Bug rapporté par Seb (capture d'écran) : Champs niveau 7, "Effet actuel : +0% Blé",
aucun bouton de choix visible en dépliant le panneau, malgré 6 paliers déjà franchis.

2 fichiers modifiés, node --check OK. Bug de récursion infinie trouvé et corrigé en
cours de développement, avant livraison.

---

## Cause

markChoicePending() (v3.95.0) n'était appelée que depuis ProductionManager.buy(), donc
uniquement au moment où le joueur clique "Améliorer" après l'installation de cette
version. Un bâtiment déjà à un niveau élevé (progression antérieure au patch, ou
plusieurs niveaux achetés d'affilée sans jamais rouvrir le panneau Parcelles) n'avait
jamais eu l'occasion de déclencher ce crochet pour ses paliers déjà franchis — les choix
correspondants étaient donc perdus, sans indication ni rattrapage possible.

## js/systems/farm-plots-system.js

Nouveau champ persistant game.production.farm.choicesConsumed (compteur, 0 par défaut
pour toute sauvegarde n'ayant pas encore ce champ). Nouvelle fonction
syncPendingChoices() : compare le nombre de paliers franchis (niveau - 1) au nombre de
choix déjà consommés, et affiche un choix en attente si un écart existe — peu importe
quand ce retard s'est accumulé, y compris rétroactivement pour une progression antérieure
à ce système. Appelée à chaque ensurePlots() (donc à chaque accès au panneau), et
re-synchronisée immédiatement après chaque applyChoice() réussi pour enchaîner sur le
choix suivant s'il en reste plusieurs dus (badge "+N" mis à jour en conséquence sur le
bouton).

Bug de récursion infinie trouvé et corrigé pendant le développement : la première
version de syncPendingChoices() appelait getAvailableChoices(), qui repassait par
getPlots() -> ensurePlots() -> syncPendingChoices() -> boucle infinie
(RangeError: Maximum call stack size exceeded), détecté par le harnais de test avant
livraison. Corrigé en isolant une version interne _getAvailableChoicesRaw(plots), sans
aucune dépendance vers ensurePlots(), utilisée uniquement par syncPendingChoices() —
getAvailableChoices() (publique, utilisée par l'UI) reste inchangée dans son
comportement, juste réécrite pour réutiliser cette fonction interne sans duplication.

## js/ui/production-view.js

getOutstandingChoicesCount() étant redéfinie comme le total de choix dus (et non plus
seulement ceux "en plus" du choix déjà affiché), le badge du bouton "Parcelles et
améliorations" utilise directement cette valeur sans y additionner hasPendingChoice() —
évite un double comptage qui aurait affiché "7" au lieu de "6" dans le cas du bug
rapporté.

---

## Non-régression vérifiée

- Nouvelle partie / progression normale (un niveau acheté à la fois, panneau consulté à
  chaque fois) : comportement strictement identique à avant, un seul choix affiché par
  palier, choicesConsumed s'incrémente correctement.
- Aucun changement à la formule de bonus, à la grille de parcelles, ni au coût
  multi-ressources introduit en v3.95.0/v3.95.1.

---

## Tests manuels à effectuer

- Reproduire exactement le scénario de la capture d'écran : charger une sauvegarde avec
  Champs niveau > 1 et aucune parcelle jamais débloquée (ou simuler en créant une partie,
  achetant plusieurs niveaux via la console avant d'ouvrir le panneau pour la première
  fois) — le badge doit afficher le nombre de paliers franchis, et les 3 boutons de choix
  doivent être disponibles au dépliage.
- Résoudre tous les choix rattrapés un par un : le badge décrémente à chaque fois,
  disparaît une fois tout consommé, l'effet cumulé (+X% Blé) reflète bien les choix faits.
- Nouvelle partie : progression normale niveau par niveau, un seul choix à la fois comme
  avant ce correctif.
