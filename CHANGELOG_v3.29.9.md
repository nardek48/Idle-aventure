# Aethervale — v3.29.9

## Donjon bloqué quand le héros est à terre (0 PV)

Avant : le Donjon soignait automatiquement le héros à 100% à l'entrée (`game.heroHp = game.heroMaxHp`, comportement v2.83.30 conservé), donc un héros KO pouvait quand même lancer un donjon. Bloqué maintenant — un repos au Campement est requis d'abord.

- **Garde-fou système** (autoritaire) : `DungeonManager.start()` refuse si `heroHp <= 0`, toast "Héros à terre — repose-toi au Campement d'abord". `systems/dungeon-system.js`.
- **Popup d'intro** : `openDungeonIntro()` bloque avant même d'afficher la fenêtre "Entrer" (même message). `ui/dungeon-view.js`.
- **Grille de paliers** : carte grisée (`is-downed`) avec texte "Héros à terre — repos requis" à la place du texte de rareté, quand le héros est à 0 PV — reste cliquable pour afficher le toast explicatif (pas un `<div>` inerte comme un palier verrouillé, pour que le message soit visible au tap).

## Fichiers modifiés

- `js/systems/dungeon-system.js`
- `js/ui/dungeon-view.js`
- `css/04-panel-dungeon.css`
- `sw.js` (CACHE_VERSION 3.29.8 → 3.29.9)

## Tests effectués

- `node --check` sur tous les fichiers `.js`.
- Playwright : héros à 0 PV + grille dépliée → carte "Donjon I" grisée avec texte explicite ; clic → toast, popup d'intro NE s'ouvre PAS ; appel direct `DungeonManager.start(1)` en contournant l'UI → refusé (`dungeonRun.active` reste `false`). Après remise des PV au max → grille normale, popup d'intro s'ouvre normalement.
- Aucune erreur console/page.
