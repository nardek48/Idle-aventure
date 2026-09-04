# CHANGELOG v3.136.0 — Ticket Donjon I offert (forest_14) + afflictions farm libre uniquement

Deux derniers points de l'audit Forêt (§3.4 et anomalie v3.134.0), validés par Seb.
**Fichier protégé touché : `dungeon-system.js`** (scope minimal, validé) — `combat-engine.js` et
`progression-system.js` NON touchés (le contexte est géré en amont dans `affliction-system.js`).
Harness **858-860 OK / 0 échec**.

## 1. Ticket Donjon I offert tant que « La tanière du Basilic » est en cours
- `js/systems/dungeon-system.js` : `isStoryTicketFree(tierId)` — vrai pour le palier I si forest_14
  est l'étape courante et acceptée. `start()` : ni vérification ni décompte de ticket dans ce cas.
  Palier II+ et toute autre étape : inchangés.
- `js/ui/dungeon-view.js` : `openDungeonIntro` laisse passer sans ticket ; l'intro affiche
  « 🎟️ Entrée offerte » à la place du compteur / lien d'achat.
- Effet joueur : un échec au Donjon I pendant la chaîne principale ne coûte plus une journée
  (1 ticket gratuit/jour) ni 100 essence.

## 2. Afflictions : farm libre uniquement (le code rejoint le commentaire de `afflictions.js`)
Décision : aligner le code sur l'intention documentée (et sur la calibration des Petites Aventures,
qui n'avait pas été faite avec Fléau +30 % de riposte).
- `js/systems/affliction-system.js` : `isContextActive()` — vrai hors sortie ou en sortie « farm »,
  faux en mission (dungeon/adventure/hunt/scene, lu sur `game.sortie.context`).
  `getCombinedModifiers()` renvoie l'objet neutre et `getStackRewardMult()` = 1 quand le contexte est
  inactif → couvre d'un coup riposte/PV boss (combat-engine, progression), tapMult/PV max/or
  (stats-system), forçage boss, interdiction de potions. Les toggles restent visibles et actifs à
  l'écran (`getActiveCount`/`isActive`/`getActiveList` non filtrés — forest_13 les lit toujours).
- `js/systems/sortie-system.js` : `start()` (mission) et `end()` recalculent les stats en conservant
  le **ratio de PV** (Fragilité -30 % PV max ne fait plus entrer un donjon à 70 %). `end()` :
  `recalcStats` désormais systématique après `consumeRunPotions()` (qui ne recalculait que si une
  potion était armée — sans ça les afflictions ne se réappliquaient pas au retour).
- `js/data/afflictions.js` (en-tête) et `js/ui/afflictions-view.js` (intro) : mention explicite.
- `round-harness.js` : + 22 assertions (ticket offert palier I seulement, intro, refus/décompte
  normaux après réclamation ; afflictions actives hors sortie et en farm, neutres dans les 4
  contextes de mission, PV max restaurés/réduits avec ratio conservé, toggles intacts).
- `sw.js` : CACHE_VERSION 3.136.0.
