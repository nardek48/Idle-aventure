# Aethervale — v3.42.0

## Chasse : uniquement de la viande, popup de fin de lot, relance manuelle

### 1. Plus d'or/essence/XP/équipement pendant une chasse

**Avant** : un kill pendant une chasse déclenchait le calcul de récompense
normal (or, essence, XP, chance d'événement aléatoire ±or/essence) EN PLUS
de la viande — la Chasse était un farm classique déguisé.

**Après** : `CombatEngine.killEnemy()` court-circuite tout en haut, avant le
moindre calcul de récompense, dès que `game.huntRun.active` est vrai.
Seuls `game.totalKills`/`game.killCounts` (statistiques globales, pas des
récompenses — alimentent bestiaire/hauts faits) continuent d'être suivis.
La viande reste gérée par `HuntQuestManager.onEnemyKilled()`, inchangé.

### 2. Fin de lot (10 kills) : arrêt + popup, plus de boucle infinie

**Avant** : au bout de `lotSize` kills (10), un nouveau lot démarrait
automatiquement sans interruption — la chasse ne s'arrêtait jamais tant que
le joueur n'appuyait pas sur "Arrêter la chasse".

**Après** : `HuntQuestManager.finishLot()` arrête le run
(`game.huntRun.active = false`) et ouvre un nouveau popup de fin de chasse
(`ui/quests-view.js`, `openHuntLotComplete()`) — récapitulatif du stock de
viande + bouton "Chasser à nouveau" (relance immédiate, sans repasser par
l'intro narrative) ou "Fermer".

### Fichiers modifiés

- **`js/systems/combat-engine.js`** — court-circuit Chasse déplacé tout en
  haut de `killEnemy()` (avant le calcul or/essence/XP), au lieu du point
  d'entrée existant plus bas (devenu mort, laissé en commentaire explicatif).
- **`js/systems/hunt-quest-system.js`** — `finishLot()` arrête le run et
  appelle `openHuntLotComplete()` au lieu de relancer un lot automatiquement.
  Commentaire d'en-tête mis à jour (plus de "boucle infinie").
- **`js/ui/quests-view.js`** — nouveau popup `buildHuntLotCompleteHTML()` /
  `openHuntLotComplete()` / `closeHuntLotComplete()` / `restartHuntQuest()`,
  réutilise le host DOM `adventure-quest-modal-root` (jamais actif en même
  temps que l'intro de chasse) et le style `dungeon-story-card` existant.

### Non modifié

- `lotSize: 10` dans `data/hunt-quests.js` — déjà correct, confirmé avec Seb.
- Arrêt volontaire (`stop()`) et défaite en chasse (`onDefeat()`) —
  comportement inchangé, testés pour confirmer qu'ils restent cohérents avec
  les changements ci-dessus.

### CACHE_VERSION

`sw.js` : `3.41.1` → `3.42.0`.

### Tests

- `node --check` OK sur les 3 fichiers touchés.
- Harnais Node dédié (`vm`, chargement des vrais fichiers) : chasse complète
  de 10 kills → 0 or, 0 essence, 10 viande accumulée, run arrêté, popup ouvert,
  compteur `huntStats` incrémenté ; relance manuelle après popup OK ; arrêt
  volontaire en cours de lot OK ; défaite en cours de chasse OK (PV restaurés,
  run arrêté).
