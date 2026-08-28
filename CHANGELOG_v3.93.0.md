# Changelog v3.93.0 — La Meute Affamée : déblocage de la Chasse via combat réel

Troisième "expédition" de déblocage, avec un twist majeur par rapport aux deux
précédentes : celle-ci appelle du **vrai combat** (10 ennemis à tuer en Forêt) plutôt
qu'un minijeu autonome. Suit le même schéma que la Carrière (v3.92.0) : déblocage réel
et définitif du bâtiment Chasse en Production, puis activité répétable une fois débloqué
— sauf que l'activité répétable, c'est la Chasse en Forêt qui existait déjà.

8 fichiers modifiés, aucun fichier créé. `node --check` OK sur le projet complet.
Boucle complète et migration revalidées via harnais `node vm`.

---

## Décision d'architecture (validée avec Seb avant codage)

Le combat réel dans une quête est déjà un pattern **existant et éprouvé** :
`AdventureQuestManager` (protégé) gère déjà des objectifs `type: "kill"` avec vrai
combat, callbacks déjà câblés dans `combat-engine.js` (protégé). Créer un nouveau
manager de combat dédié aurait nécessité de toucher `combat-engine.js` — risque jugé non
justifié pour un seul objectif de kill. **Décision : réutiliser `AdventureQuestManager`
tel quel**, sans le modifier ni modifier `combat-engine.js`.

Conséquence assumée : la carte "La Meute Affamée" vit dans la catégorie **Aventure** de
l'écran Quêtes (pas Expéditions) — c'est structurellement une Adventure Quest classique,
avec en plus une récompense de déblocage de bâtiment.

**La Chasse en Forêt existante n'a pas été supprimée** — elle EST l'activité répétable
demandée. Elle est seulement rendue invisible/non lançable tant que le bâtiment Chasse
n'est pas débloqué.

---

## `js/data/adventure-quests.js`
Nouvelle entrée `ADVENTURE_QUESTS.hq_wolf_pack` : "La Meute Affamée", `type: "kill"`,
10 ennemis en Forêt (adventureIndex 0), `category: "main"` (débloque un bâtiment, donc
structurellement principale), récompense `{gold: 400, essence: 8, unlockBuildingId:
"hunt"}` — pas de coût en ration (convention Adventure Quest classique, validé avec Seb).

**Écart signalé et accepté avant codage** : impossible de forcer exclusivement des
"Loups" sans toucher `progression-system.js` (protégé, tirage aléatoire dans le pool
d'ennemis de la Forêt : slime/loup/gobelin/araignée). Le texte de l'étape a été ajusté en
conséquence ("Tuer 10 ennemis en Forêt"), le titre et le texte narratif restent
inchangés. Comme la quête n'a aucun step `bossKill`, `AdventureQuestManager` (protégé,
`nextSpawnIsBoss()`) ne force jamais de boss dans la boucle — garanti par construction,
sans avoir eu besoin de toucher quoi que ce soit.

## `js/core/state.js`
`explorationProgression` étendu avec `huntBuildingUnlocked: false` par défaut. Garde de
migration correspondante (forme uniquement) dans `ensureGameStateDefaults()`.

## `js/systems/production-system.js` (non protégé)
Généralisation du système de verrou introduit en v3.92.0 pour la Carrière :
- Nouvelle table `PRODUCTION_UNLOCK_FLAGS = { quarry: "quarryUnlocked", hunt:
  "huntBuildingUnlocked" }`.
- `isBuildingUnlocked(id)` généralisée : lit le flag correspondant dans
  `PRODUCTION_UNLOCK_FLAGS`, retourne `true` pour tout bâtiment non listé (comportement
  historique inchangé pour Champs/Scierie/Mine/Puits).
- `unlockQuarry()` renommée en `unlockBuilding(id)` générique — appelable pour n'importe
  quel bâtiment verrouillable. **Appel existant mis à jour dans `mining-system.js`**
  (`ProductionManager.unlockQuarry()` → `ProductionManager.unlockBuilding("quarry")`),
  aucune régression sur le déblocage de la Carrière (revalidé par test).

## `js/systems/mining-system.js`
Seul changement : adaptation de l'appel à `unlockBuilding("quarry")` suite au
renommage ci-dessus. Comportement strictement identique.

## `js/systems/save-system.js` — exception déjà en cours d'usage
`huntBuildingUnlocked` ajouté aux mêmes 4 emplacements que `quarryUnlocked`
(`buildSaveData`/`loadGame`/`hardResetState`/`fullResetState`), avec **exactement le même
raisonnement de migration** : toute sauvegarde antérieure à cette version (où la Chasse
était débloquée nativement, sans aucun verrou) reçoit `huntBuildingUnlocked: true`
d'office à la première ouverture — qu'elle ait ou non déjà un `explorationProgression`.
Conservé à l'ascension (progression permanente), remis à zéro au reset complet.

## `js/ui/quests-view.js`
**Point d'accroche du déblocage, sans toucher aux fichiers protégés** : nouvelle fonction
`applyQuestUnlockSideEffects()`, appelée à chaque ouverture du popup générique de fin de
quête (`openQuestCompletePopup()`, déjà appelé par `AdventureQuestManager.finish()` sans
modification). Elle scanne toutes les `ADVENTURE_QUESTS` ayant un
`reward.unlockBuildingId`, vérifie si elles sont déjà marquées complétées
(`game.adventureQuestsCompleted`), et applique le déblocage
(`ProductionManager.unlockBuilding()`) — idempotent, sans effet si déjà débloqué.

**Filtrage de la Chasse répétable** : dans `collectActiveQuestCardEntries()`, la quête
`hq_forest_boar` (Chasse en Forêt) n'est ajoutée à la liste que si
`game.explorationProgression.huntBuildingUnlocked` est vrai — filtrage à l'affichage
uniquement, `hunt-quest-system.js` (protégé) reste totalement inchangé.

**Limite assumée et signalée** : ce filtrage n'est qu'un filtre d'affichage, pas une
garde métier dans `HuntQuestManager.start()` (protégé) — un appel direct à cette
fonction (hors UI normale) contournerait le verrou. Accepté comme compromis pour ne pas
toucher un fichier protégé pour un seul objectif de kill.

## `js/main/boot.js` (non protégé)
Appel de `applyQuestUnlockSideEffects()` juste après `loadGame()`, avant
`ProductionManager.catchUpOffline()` — couvre le cas où la quête a été complétée dans une
session précédente mais où le popup de fin n'a jamais été revu depuis (le déblocage ne
dépendrait alors que de la prochaine ouverture d'un popup de quête, ce qui pourrait ne
jamais arriver).

## `sw.js`
`CACHE_VERSION` : 3.92.2 → 3.93.0.

---

## Fichiers protégés — confirmation de non-modification

`combat-engine.js`, `adventure-quest-system.js`, `hunt-quest-system.js`,
`stats-system.js`, `progression-system.js`, `game-loop.js`, `class-combat-system.js`,
`dungeon-system.js`, `world-quest-system.js` : **aucun n'a été modifié** — vérifié
explicitement, la logique de combat et de récompense standard de
`AdventureQuestManager`/`HuntQuestManager` continue de fonctionner à l'identique.

---

## Tests manuels à effectuer

- Avant complétion : carte "La Meute Affamée" visible dans Aventure, aucune carte Chasse
  dans Quêtes > Ressources, bâtiment Chasse invisible en Production.
- Lancer la quête : bascule sur l'onglet Combat, comme toute Adventure Quest (comportement
  standard, non modifié).
- Tuer 10 ennemis : la quête se termine, popup de fin (or/essence), la carte disparaît de
  Aventure > Active et apparaît dans Terminée.
- Immédiatement après : le bâtiment Chasse apparaît en Production (niveau 1, production
  passive fonctionnelle), et la carte "Chasse en Forêt" apparaît dans Quêtes > Ressources.
- Lancer la Chasse répétable depuis cette carte : comportement identique à avant
  (`hunt-quest-system.js` non modifié) — combat en boucle, popup de lot terminé.
- Rechargement de page juste après complétion de la quête, avant d'avoir revu le popup de
  fin : le déblocage doit quand même s'appliquer au chargement suivant (testé via
  `applyQuestUnlockSideEffects()` appelée au boot).
- Chargement d'une sauvegarde antérieure à cette version : `huntBuildingUnlocked` doit
  être `true` automatiquement, Chasse visible immédiatement en Production et carte
  répétable visible dans Ressources, sans perdre le niveau/stock déjà accumulé.
- Non-régression Carrière/Veine Instable (v3.92.x) : toujours fonctionnels à l'identique.
- Non-régression Sentier Obstrué, autres Adventure Quests, World Quests, Donjon, Combat
  classique : aucun de ces systèmes n'a été touché.
