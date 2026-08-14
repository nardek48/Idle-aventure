# Aethervale — CHANGELOG v3.3.0

Base : v3.2.0. Deux changements discutés en session, complémentaires :
1. La fin d'une quête d'aventure peut désormais déclencher le déblocage du
   monde SUIVANT (pas juste l'aventure suivante à l'intérieur d'un monde).
2. Les questlines de déblocage de monde existantes (ex. "L'Appel des
   Ruines") sont déplacées de la popup Carte vers l'onglet Quêtes, pour
   regrouper TOUTES les quêtes du jeu au même endroit.

## 1. Quête d'aventure → déblocage du monde suivant

**Contenu concret pour Forêt** : la quête de Collecte "Minerai des
profondeurs" (`aq_forest_collect`, Cœur de la forêt) verrouille maintenant
le passage Forêt → Désert. C'est un changement de design assumé et validé
en session : le Désert n'est plus accessible dès le début sans condition
(auparavant "Forêt et Désert restent accessibles dès le début, sans
questline", voir Guide d'équilibrage section 6) — il faut désormais avoir
terminé cette quête.

**Mécanisme technique (généralisable à d'autres mondes plus tard)** :
- `data/adventure-quests.js` : nouveau champ `gatesNextWorld: true` sur une
  quête — indépendant de `gatesTransitionTo` (qui gate une aventure suivante
  DANS le même monde). Peut être posé sur n'importe quelle quête du monde
  concerné, pas seulement les quêtes de type "expedition".
- `systems/adventure-quest-system.js` : nouvelle fonction
  `isWorldTransitionUnlocked(worldId)` — cherche une quête de ce monde
  marquée `gatesNextWorld`, renvoie `true` si aucune (comportement inchangé
  partout ailleurs) ou si elle est complétée.
- `systems/progression-system.js` : `WorldManager.meetsAscensionRequirement(index)`
  vérifie maintenant DEUX conditions au lieu d'une seule : la questline
  `WorldQuestManager` existante (inchangée) ET ce nouveau verrou
  `AdventureQuestManager` sur le monde précédent. Les deux doivent être
  levés. Cette fonction est utilisée à la fois par `WorldManager.advance()`
  (la vraie progression) et par `map-view.js` (l'affichage "verrouillé" sur
  la Carte) — donc le Désert s'affiche bien cadenassé au même titre que
  Ruines/Crypte/etc., cohérent visuellement.

**Aucune régression sur le reste** : Désert → Ruines continue de dépendre
uniquement de la questline `WorldQuestManager` existante ("L'Appel des
Ruines"), qui n'a pas été touchée — voir point 2 ci-dessous pour son
changement d'emplacement (UI seulement, mécanique inchangée).

## 2. Questlines de monde déplacées vers l'onglet Quêtes

Comme pour les quêtes d'aventure (v3.2.0), les questlines de déblocage de
monde (`data/world-quests.js`, `WorldQuestManager`, ex. "L'Appel des
Ruines") ne s'affichent plus dans la popup Carte — elles ont maintenant
leur section dans l'onglet Quêtes, au-dessus des quêtes d'aventure.

**Ce qui NE change PAS** : le mécanisme lui-même (suivi ambiant pendant le
farm normal du monde concerné, bouton "Réclamer" manuel une fois tous les
objectifs remplis) reste identique — seul l'EMPLACEMENT d'affichage change.
Contrairement aux quêtes d'aventure (v3.2.0), ces questlines ne sont pas
passées à un modèle de run dédié : elles représentent une progression sur
le farm réel du monde en cours, pas un aller-retour instancié.

**Détail des changements**
- `js/ui/quests-view.js` : nouvelle fonction `buildWorldUnlockQuestSectionHTML()`
  — affiche uniquement la TOUTE PROCHAINE questline incomplète
  (`getNextLockedWorldIndex()`, parcourt les mondes dans l'ordre et
  s'arrête au premier non débloqué). Les questlines plus lointaines
  n'ont aucune valeur à montrer tant que la précédente n'est pas finie.
  `claimWorldQuest(worldIndex)` déplacée ici aussi (callback du bouton
  Réclamer), rafraîchit l'onglet Quêtes après réclamation.
- `js/ui/map-view.js` : `buildWorldQuestHTML()` et `claimWorldQuest()`
  retirés. La popup d'un monde verrouillé affiche maintenant un simple
  message "🗺️ Questline de déblocage en cours — voir l'onglet Quêtes."
  au lieu du détail complet.
- Ordre d'affichage dans l'onglet Quêtes : Questline de monde (si une est
  en cours) → Quêtes d'aventure → Quêtes journalières.

## Tests effectués

- `node --check` sur tous les fichiers touchés.
- Nouveau harnais Node `vm` dédié (9 assertions) : Désert verrouillé par
  défaut, complétion réelle d'`aq_forest_collect` via un run (pas une
  simulation directe), déblocage effectif du Désert après coup,
  `WorldManager.advance()` fait bien passer `worldIndex` à 1 (Désert) une
  fois la quête terminée (testé sur le VRAI flux de fin de vague, pas un
  appel direct à la fonction de vérification), aucune régression sur la
  questline Désert→Ruines (toujours verrouillée, mécanisme
  `WorldQuestManager` intact), `getNextLockedWorldIndex()` saute bien le
  Désert (déjà débloqué) pour pointer vers Ruines.
- Re-passage des harnais v3.1.0 et v3.2.0 (chasse ambiante, runs de
  quêtes) : aucune régression.
- Playwright headless (rendu réel, 390×844) : popup Carte du Désert
  affiche bien "Verrouillé" + le message pointant vers l'onglet Quêtes ;
  onglet Quêtes affiche bien "L'Appel des Ruines" (progression 0/50 kills
  Désert, 0/3 objets, 0/2 boss, récompense) au-dessus de la section Quêtes
  d'aventure. Aucune erreur console.

## Prochaine étape

Toujours en attente du retour de Seb sur le ressenti de la boucle complète
(v3.1 → v3.3) avant d'aller plus loin. Si validé, candidats naturels pour
la suite : répliquer `gatesNextWorld` sur d'autres mondes, ou entamer la
généralisation complète évoquée en session (remplacer progressivement les
questlines `WorldQuestManager` handwritten par des quêtes d'aventure
`AdventureQuestManager` équivalentes, pour n'avoir plus qu'UN SEUL système
de déblocage à terme).
