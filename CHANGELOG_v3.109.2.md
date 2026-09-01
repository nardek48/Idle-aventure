# CHANGELOG v3.109.2 — Switch de héros : la position est conservée (fichier protégé, scope validé Seb)

Base : v3.109.1. Un fichier protégé modifié : `save-system.js`. Harnais : 428 → **436 assertions**, 0 échec, stable sur 5 runs
(section [70] : flux complet création → switch → suppression via HeroSlotManager réel).

## `js/systems/save-system.js`
- `resumeCombatAfterSlotChange(freshState)` — remplace la règle v3.41 (« switch = toujours monde 1, 1er ennemi ») :
  - **Switch d'emplacement, annulation de création, import de save** : la position (`worldIndex`/`adventureIndex`/`enemyIndex`)
    est celle restaurée par `loadGame()`, exactement comme au boot. Un switch de classe en plein Acte III ne renvoie plus
    en Lisière : le héros reprend au Cœur là où il en était. Le thème du monde suit via `spawnEnemy()` (inchangé).
  - **`freshState=true`** (création d'un héros, suppression du dernier emplacement) : `resetToCycleStart()` conservé —
    indispensable, car `WorldManager` ne vit pas dans `game` : sans lui, un héros neuf héritait de la position de l'ancien
    (vérifié par le test avant correctif).
  - Appelants : `createHeroInSlot` et le repli de `deleteSlot` passent `true` ; `switchToSlot`, l'import multi-héros et
    `cancelHeroSelection` (modal-view.js, non modifié) passent par `loadGame()` et conservent.

## Infra
- `sw.js` : `CACHE_VERSION` 3.109.2

## État de la session (v3.108.0 → v3.109.2)
Tous les points de l'audit Forêt sont traités. En attente : retours de test terrain (traversée Lisière→Cœur, Cœur en Acte III,
run « Le Cœur de la Forêt » sur les 3 classes, switch de héros en cours de chapitre).
