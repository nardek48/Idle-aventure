# Aethervale v3.358.0 — Corrections de la campagne B, lot 4 : l'essence disparaît

Base : v3.357.0. Décision D7 de Seb du 26/09/2026, avec ses cinq précisions (voir `Aethervale_Changements_v1_0.md`).

**Aucun fichier JS nouveau, aucun fichier à supprimer.** Seb a validé D7, donc les modifications de fichiers protégés qui suivent :

| Fichier protégé | Ce qui change |
| --- | --- |
| `combat-engine.js` | plus d'essence au kill, `grantEssence` et l'événement « Fontaine d'essence » retirés |
| `dungeon-system.js` | sorties du jour à la place des tickets, fin de donjon en or seulement |
| `save-system.js` | conversion unique des anciennes sauvegardes, `dungeonRunsUsed` aux 4 emplacements |
| `progression-system.js` | un champ mort `essenceReward` retiré |
| `story-quest-system.js`, `adventure-quest-system.js`, `mission-board-system.js` | les lignes d'essence retirées des récompenses |

`stats-system.js` garde ses multiplicateurs internes d'essence (`essenceGlobalMult`, `essenceBonus` du bestiaire). Plus rien ne les lit : ils sont inoffensifs, et je n'ai pas touché ce fichier sans nécessité.

## 1. L'essence disparaît

- **Plus aucun gain** : ni au kill, ni sur les élites, ni en fin de donjon. Le butin de sortie ne porte que l'or.
- **Toutes les récompenses en essence deviennent de l'or, à 5 or l'essence** : Histoire (680 essences, soit 3 400 or sur les deux mondes), quêtes d'aventure (88, soit 440 or), quêtes du village (25, soit 125 or), paliers bronze et argent des Hauts faits (1 400, soit 7 000 or). La stèle « Déterrer les noms » donne 200 or.
- **La barre du haut** ne montre plus que l'or. L'essence disparaît aussi de l'écran de combat, des quêtes, des Hauts faits, de la scène et de l'outil d'administration.
- **Taux de 5 or** : c'est le taux d'échange que suggéraient les récompenses existantes. Avec lui, une étape qui donnait « 450 or + 30 essence » donne 600 or.

## 2. Les donjons : 3 sorties par jour et par donjon

- **Chaque donjon** peut être lancé **3 fois par jour**. Le compteur est propre à chaque donjon, et il est remis à zéro toutes les 24 h, sur l'ancienne horloge des tickets.
- **Les sorties d'Histoire** (`forest_13`, `forest_14`, `desert_12`, `desert_15`) sont **gratuites et hors quota**, comme avant.
- **À l'écran** :
  - le bandeau du haut dit la règle : « 3 sorties par jour et par donjon · renouvellement dans … ». Ce n'est plus un bouton ;
  - chaque carte ouverte affiche « Sorties aujourd'hui : 2 / 3 », en gris quand le quota est épuisé, ou « Sortie offerte par l'Histoire » ;
  - la feuille de lancement affiche « Sorties restantes aujourd'hui : x / y » ;
  - le Camp compte les sorties restantes sur les donjons ouverts.
- **Le tableau de missions** propose le donjon tant qu'il reste une sortie.
- **L'écran d'achat de tickets est retiré.**

### La Clé de faille, à valider

Elle réduisait le prix des tickets, ce qui n'a plus de sens. Je propose : **+1 sortie par jour dans chaque donjon, par niveau, 2 niveaux au plus**, soit 5 sorties au maximum. Les prix des niveaux ne changent pas. Un joueur qui avait acheté plus de 2 niveaux est plafonné à 2. **À valider par Seb.**

## 3. L'Aether n'a plus qu'un sens

- L'Aether **remplit la jauge de la Mémoire, et rien d'autre**. Il n'y a plus de solde d'Aether à dépenser.
- **Reprendre un choix de la Mémoire se paie en or** : **500 or**, puis ×3 à chaque reprise (1 500, 4 500…). Avant, c'était 10 Aether, puis ×3.
- Les paliers or des Hauts faits donnaient de l'Aether : ils donnent **500 or** (Forêt) et **750 or** (Désert), à 50 or l'Aether.

## 4. Les anciennes sauvegardes

Au chargement, l'essence et le solde d'Aether d'une ancienne sauvegarde sont **convertis en or, une seule fois**, à 5 or l'essence et 50 or l'Aether. Le journal l'annonce : « 🪙 L'essence et l'Aether de réserve disparaissent : +X or ». La jauge de la Mémoire n'est pas touchée. La sauvegarde suivante n'écrit plus ces deux champs, donc rien n'est converti deux fois. Les tickets en réserve sont perdus : les sorties du jour les remplacent.

## Ce que ça change pour la campagne

12 campagnes, vrais combats, Grimoire :

| | v3.357.0 | v3.358.0 |
| --- | --- | --- |
| Campagne, médiane | 63 h | **61 h** (46 à 93 h) |
| `desert_13`, médiane | 16 h | **13 h** |
| Murs | aucun | aucun |
| Morts sur la partie | 0 à 6 | 0 à 3 |

L'or venu de l'ancienne essence raccourcit surtout le farm de la Forge 2. Le quota de sorties ne gêne pas la campagne : le robot ne fait que les sorties de l'Histoire, qui sont offertes.

## Contrôles

| Contrôle | Résultat |
| --- | --- |
| round-harness.js ([85] neutralisée) | 3 399 à 3 400 OK, 0 échec, 2 passages. Nouvelle section [137], 40 contrôles. Une vingtaine de contrôles anciens ont été adaptés (essence, tickets, reprise, paliers). |
| boot-harness.js · hero-creation-harness.js | 4 OK · 44 OK |
| retour-demarrage-bench.js | OK |
| parcours-harness.js (P1 à P10) | 97 OK |
| campagne-harness.js, option A | 35 / 35, sur les 3 classes |
| campagne-harness.js, option B, 12 parties | toutes au bout, aucun mur |
| Rendu dans Chromium, 390 × 844 | barre du haut avec l'or seul ; bandeau, carte et feuille du donjon ; aucune erreur de console, pas de défilement horizontal |

## Fichiers

- `js/core/constants.js` (`GAME_VERSION`, `ESSENCE_GOLD_RATE`, `AETHER_GOLD_RATE`)
- `js/core/state.js`
- `js/data/achievements.js`, `adventure-quests.js`, `dungeon.js`, `memory.js`, `story-quests.js`, `village-quests.js`
- `js/systems/combat-engine.js` (protégé)
- `js/systems/dungeon-system.js` (protégé)
- `js/systems/save-system.js` (protégé)
- `js/systems/progression-system.js` (protégé, champ mort)
- `js/systems/story-quest-system.js`, `adventure-quest-system.js`, `mission-board-system.js` (quêtes)
- `js/systems/achievement-system.js`, `elite-system.js`, `memory-system.js`, `quest-enemy-system.js`, `sortie-system.js`
- `js/ui/achievement-view.js`, `admin-view.js`, `ascension-view.js`, `camp-view.js`, `combat-view.js`, `dungeon-view.js`, `hud-view.js`, `quests-view.js`, `scene-view.js`
- `css/02-layout.css`, `css/04-panel-dungeon.css`
- `sw.js` (`CACHE_VERSION`)
- `round-harness.js`
- Outils hors jeu : `sim/campagne-harness.js`, `sim/plafond-bench.js`, `sim/dungeon-bench.js`, `sim/cite-vague5-bench.js`, `sim/quest-cost-bench.js`, `sim/seve-bench.js`

`sim/seve-bench.js` lit maintenant les sorties du jour. Il s'arrêtait déjà avant ce lot (« ANCRE PERDUE : coût de reforge introuvable »), parce qu'il cherche une formule de la Forge qui a changé depuis. Je ne l'ai pas réparé dans ce lot.
