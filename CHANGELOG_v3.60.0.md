# Aethervale — v3.60.0

Le mapping des contres est déplacé de skill3 vers skill1, et tous les coûts de ressource (skill1/2/3)
sont réduits de moitié — proposition de Seb après plusieurs itérations sur le sujet des contres.

## Contexte

Même avec les corrections successives (exclusion du repli v3.58.0-v3.59.0, fenêtre d'anticipation
v3.55.0-v3.59.0), skill3 coûte systématiquement 100 — le maximum de la barre. Même exclu du repli,
il faut accumuler la TOTALITÉ de la ressource pour pouvoir contrer, ce qui reste lent et peu fiable
en pratique, en particulier avec plusieurs patterns qui se chevauchent.

## Design retenu (validé par Seb)

1. skill3 ne contre plus jamais rien, sur aucune des 3 classes — le contre est déplacé vers
   skill1 pour Bouclier et Soin (Charge reste sur defense, déjà à coût 0-30, inchangée). skill2
   garde son rôle de contre là où il l'avait déjà.
2. Tous les coûts de ressource (skill1/skill2/skill3) sont divisés par 2 sur les 3 classes — pas
   seulement les actions de contre. Rend l'ensemble des compétences spéciales plus accessibles en
   jeu normal, cohérent avec le ressenti de Seb ("on meurt très vite"). Rebalancing volontairement
   grossier (division par 2, pas de nouveau calibrage par batch-sim) — décision explicite de Seb de
   prioriser le bon fonctionnement du système de contre avant un équilibrage précis.

## Nouveau mapping

Pattern Bouclier : Brise-garde (skill2, inchangé, Chevalier) / Tir précis (skill1, nouveau, Rôdeur)
/ Éclair arcanique (skill1, nouveau, Mage).
Pattern Soin : Frappe lourde (skill1, nouveau, Chevalier) / Rafale (skill2, inchangé, Rôdeur) /
Brûlure arcanique (skill2, inchangé, Mage).
Pattern Charge : Garde / Esquive / Barrière (defense, inchangé pour les 3 classes).

## Nouveaux coûts (÷2 sur toutes les actions skill1/2/3)

Chevalier — Frappe lourde : 35→18, Brise-garde : 55→28, Exécution : 100→50.
Rôdeur — Tir précis : 40→20, Rafale : 70→35, Tir perforant : 100→50.
Mage — Éclair arcanique : 35→18, Brûlure arcanique : 55→28, Déflagration : 100→50.

## Implémentation

- data/class-skills.js — seul fichier modifié. Pour les 3 classes :
  - counters retiré de skill3 (Exécution/Tir perforant/Déflagration).
  - counters ajouté à skill1 (Frappe lourde → healIncoming, Tir précis/Éclair arcanique →
    shieldIncoming).
  - resourceCost divisé par 2 sur skill1/skill2/skill3 des 3 classes (defense/basic inchangés).
  - Descriptions textuelles mises à jour pour refléter les nouveaux coûts.
  - En-tête de fichier étendu avec la note v3.60.0 expliquant le changement.
- Aucune modification de logique — chooseGrimoireAction, applyGrimoireCounterIfApplicable,
  getAllCounterActionSlots, getPrioritaryCounterRule, la fenêtre d'anticipation, la réserve de
  ressource : tout lit action.counters/action.resourceCost dynamiquement depuis les données, donc
  s'adapte automatiquement au nouveau mapping sans qu'aucun fichier système n'ait besoin d'être
  touché.
- sw.js — CACHE_VERSION → 3.60.0.

## Tests effectués

- node --check sur class-skills.js — OK.
- Harness vm :
  - Frappe lourde (skill1) contre bien le Soin en contre manuel — confirmé.
  - Simulation complète du combat auto (pipeline fidèle) : le contre réussit via le Grimoire avec
    le nouveau coût réduit.
  - Vérification exhaustive : skill3 n'a plus de counters sur aucune des 3 classes.

## Fichiers non modifiés dans cette étape (vérifiés par checksum, identiques à v3.59.0)

combat-sandbox-system.js, combat-resource-system.js, combat-cooldown-system.js, classes.js,
combat-auto-policy-system.js, class-combat-system.js, combat-engine.js, grimoire-conditions.js —
confirme qu'aucune logique n'a été touchée, uniquement les données déclaratives de class-skills.js.

## Ce que cette étape NE fait PAS

- Aucun nouveau calibrage fin par batch-sim — la division par 2 est volontairement grossière, Seb a
  explicitement priorisé le fonctionnement du système de contre sur l'équilibrage précis pour cette
  itération. Un futur passage d'équilibrage est prévu une fois le système validé en jeu réel.
- N'ajuste pas les dégâts (damageMultiplier) pour compenser la baisse des coûts — les actions
  deviennent donc objectivement plus rentables qu'avant, effet voulu par Seb.
