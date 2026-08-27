# Changelog v3.95.0 — Champs : parcelles évolutives + coût Production multi-ressources

Inspiré des 2 prototypes fournis par Seb (choix retenu : le Prototype 1 "carte dépliable",
gardant l'interface actuelle plutôt que la refonte en onglets du Prototype 2). Deux
chantiers livrés ensemble, comme validé : les 6 bâtiments de Production passent d'un coût
en or pur à un coût multi-ressources (façon Atelier de Construction), et les Champs
reçoivent un nouveau système de parcelles évolutives.

4 fichiers créés, 4 modifiés. node --check OK sur le projet complet. Boucle complète
testée via harnais node vm.

---

## 1. Coût multi-ressources pour les 6 bâtiments de Production

### js/data/production-buildings.js
Chaque bâtiment a désormais son propre costTiers (même pattern que
CONSTRUCTION_BUILDINGS.workshop dans data/construction.js), un seul palier chacun
pour l'instant (niveaux 1-15) — volontairement simple, d'autres paliers pourront être
ajoutés plus tard (ex. liés à la progression de monde, comme évoqué avec Seb) sans
migration de sauvegarde nécessaire : getProductionBuildingCost() recalcule toujours le
coût à la volée à partir du seul niveau stocké.

Chaque bâtiment paie avec de l'Or + 2 ressources produites par d'autres bâtiments
(jamais sa propre production, pour ne pas fausser l'équilibrage) :

| Bâtiment | Ressources | Or base | Mult |
|---|---|---|---|
| Champs (Blé) | Bois + Eau | 80 | 1.45 |
| Chasse (Viande) | Bois + Fer | 90 | 1.45 |
| Scierie (Bois) | Fer + Pierre | 90 | 1.45 |
| Mine (Fer) | Bois + Pierre | 100 | 1.45 |
| Carrière (Pierre) | Bois + Fer | 90 | 1.45 |
| Puits (Eau) | Pierre + Bois | 70 | 1.45 |

PRODUCTION_CONFIG.baseCost/costMult (l'ancien coût en or unique, partagé par les 6)
retirés — remplacés par costTiers par bâtiment.

### js/systems/production-system.js (non protégé)
getCost() remplacée par getNextCost() (retourne {gold, res1, res2} ou null si
niveau max) et getAffordability() (retourne l'éligibilité détaillée par ressource, même
pattern que ConstructionManager). buy() refondue : vérifie chaque ressource
individuellement, débite via WarehouseManager.removeResource() (jamais d'écriture
directe dans game.resources), message d'erreur nommant précisément la ressource
manquante.

---

## 2. Système de parcelles des Champs

### js/data/farm-plots.js (nouveau)
Grille fixe de 9 parcelles, 4 ouvertes par défaut (cohérent avec le prototype). 2
améliorations cumulables par parcelle ouverte : fertile (+8% Blé), irriguée (+10% Blé) —
une parcelle peut avoir les deux en même temps, jusqu'à +18% cumulé. Le "enrichi" (+15%)
initialement envisagé a été retiré en cours de discussion : seuls 3 choix existent au
total (ouvrir/fertiliser/irriguer), fidèle au prototype original. 27 actions possibles au
total (9 ouvertures + 9 fertile + 9 irrigated) contre 14 paliers de niveau (2 à 15) — la
grille ne peut donc jamais être épuisée avant le niveau max, confirmé par calcul.

### js/systems/farm-plots-system.js (nouveau)
FarmPlotsSystem — persistance directement dans game.production.farm.plots (aucune
modification de save-system.js nécessaire, confirmé : game.production[id] est déjà un
objet libre entièrement sérialisé, deep-copié tel quel à l'ascension). Choix libre à
chaque niveau atteint (indépendant du coût d'amélioration ci-dessus, appelé depuis
ProductionManager.buy("farm") uniquement) : getAvailableChoices() filtre les 3 actions
selon ce qui reste possible, getEligiblePlotIndexes() liste les parcelles cibles valides
pour une action, applyChoice() idempotent (une action déjà appliquée à une parcelle ne
peut plus être re-sélectionnée). getBonusPct() lu par
ProductionManager.getRatePerMin("farm") — effet strictement isolé aux Champs, testé sans
impact sur les 5 autres bâtiments.

### js/ui/production-view.js
Bouton dépliable "🌾 Parcelles et améliorations" sous la carte Champs uniquement (pattern
repris des cartes de quête repliables déjà en place, badge rouge si un choix est en
attente). Panneau déplié : grille 3×3, effet cumulé actuel, et — si un palier vient
d'être atteint — les 3 boutons de choix. Sélection de la parcelle cible directement sur
la grille (les cases éligibles se surlignent et deviennent cliquables, comme validé avec
Seb — pas de second popup). Bouton "Améliorer" des 6 cartes affiche désormais le coût
multi-ressources (icônes empilées, rouge sur la ressource manquante).

### css/04-panel-production.css
Nouveau bloc pour le panneau parcelles (grille, cases fertile/irriguée/verrouillée,
popup de choix) et pour l'affichage compact multi-ressources du bouton Améliorer.

---

## Ce qui n'a PAS changé

- Les 5 autres bâtiments (Chasse/Scierie/Mine/Carrière/Puits) : aucun système de
  parcelles, comportement de production/récolte strictement identique, seul le coût
  d'amélioration passe à multi-ressources.
- save-system.js : aucune ligne touchée.
- Aucun fichier protégé modifié.

---

## Tests manuels à effectuer

- Écran Production : les 6 bâtiments affichent un coût multi-ressources sur le bouton
  Améliorer (or + 2 icônes de ressource), bouton grisé si une ressource manque, message
  d'erreur nommant la ressource précise au clic.
- Achat d'un niveau : débit correct de l'or ET des 2 ressources via l'Entrepôt (vérifier
  que le stock diminue bien dans l'écran Entrepôt).
- Carte Champs uniquement : bouton "🌾 Parcelles et améliorations" visible, badge rouge
  après un achat de niveau.
- Dépliage du panneau : grille 3×3 (4 ouvertes/5 verrouillées au départ), 3 boutons de
  choix visibles.
- Choisir "Préparer un sillon" : les parcelles verrouillées se surlignent, clic dessus
  débloque la parcelle, effet appliqué immédiatement.
- Choisir "Enrichir la terre"/"Creuser une rigole" : seules les parcelles ouvertes sans
  cette amélioration se surlignent, une parcelle peut recevoir les deux.
- Effet cumulé affiché en bas du panneau (+X% Blé), et le taux de production réel de la
  carte Champs (au-dessus) reflète bien ce bonus.
- Rechargement de page en cours de choix (avant sélection de parcelle) : le popup de
  choix doit rester disponible (état persistant), même si l'action précédemment
  sélectionnée n'est pas mémorisée (acceptable, détail mineur).
- Ascension : niveaux et parcelles des Champs conservés (progression permanente, comme
  les 5 autres bâtiments).
- Non-régression Carrière/Chasse/Puits (Veine Instable/Meute Affamée/Source Tarie) :
  tous testés inchangés.
