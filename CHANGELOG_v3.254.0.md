# CHANGELOG v3.254.0 — Lot D-4 : suppression des afflictions parquées

**Base :** v3.253.0 (à installer avant) · **Delta :** 9 fichiers, dont **3 supprimés** · `CACHE_VERSION` et `GAME_VERSION` → `3.254.0`

Dernier lot de la refonte des Donjons, et dernier du groupe B. Nettoyage : les afflictions étaient parquées depuis la v3.245.0 (retirées du menu, code neutralisé) le temps de valider leur reprise en Marques de donjon. C'est fait.

---

## Supprimés

| Fichier | Raison |
|---|---|
| `js/data/afflictions.js` | `DUNGEON_MARKS` (dans `js/data/dungeon.js`) est la seule table depuis la v3.245.0 |
| `js/ui/afflictions-view.js` | l'écran n'était plus monté depuis la v3.245.0 |
| `css/04-panel-afflictions.css` | son style |

Leurs entrées dans `index.html` et `sw.js` disparaissent avec eux.

## La clé de sauvegarde `activeAfflictions`

Retirée des quatre points de câblage. Une sauvegarde d'avant la v3.245.0 qui la porte encore n'est pas cassée : elle est **ignorée puis retirée** au chargement (`delete game.activeAfflictions`), sans effet sur le jeu — les Marques vivent dans `dungeonRun.marks`.

## Ce qui reste, volontairement

- **`AfflictionManager`** garde son nom et reste l'API unique des modificateurs de combat. Les neuf points de lecture dans `stats-system.js`, `combat-engine.js`, `potion-system.js`, `apothecary-system.js` et `combat-view.js` n'ont jamais eu à changer : seules la source et la garde ont bougé en v3.245.0. Le renommer toucherait cinq fichiers dont trois protégés, pour un gain cosmétique.
- **`case "afflictions"` dans `ui-root.js`** : une sauvegarde peut encore pointer sur l'onglet supprimé. L'écran de repli renvoie vers le donjon.
- **Les identifiants `aff_*` et le dossier `images/Icons/afflictions/`** : les renommer imposerait une migration de sauvegarde pour rien.

## Fichiers

| Fichier | Protégé | Intervention |
|---|---|---|
| `js/data/afflictions.js`, `js/ui/afflictions-view.js`, `css/04-panel-afflictions.css` | — | **supprimés** |
| `js/systems/save-system.js` | **oui** | trois emplacements : plus d'écriture, purge au chargement, plus de remise à zéro |
| `js/core/state.js` | non | clé retirée de l'état initial et de `ensure()` |
| `js/systems/affliction-system.js` | non | `ensure()` ne crée plus la clé ; en-tête mis à jour |
| `js/data/story-quests.js` | non | libellé d'onglet inerte retiré de `STORY_TAB_LABELS` |
| `js/ui/ui-root.js` | non | commentaire du repli |
| `index.html`, `sw.js` | — | trois entrées retirées |
| `round-harness.js` | — | section [56], quatre tests adaptés |

## Vérifications

- `round-harness.js` : section **[56]** (10 assertions : les trois symboles supprimés n'existent plus, `DUNGEON_MARKS` seule table, `AfflictionManager` toujours fonctionnel, clé absente de la sauvegarde, sauvegarde ancienne ignorée et purgée, onglet supprimé qui ne casse pas le rendu, Marque toujours appliquée en run). **1905–1906 OK, 0 échec sur 6 passages.**
- `hero-creation-harness.js` : 44 / 0. `node --check` sur les fichiers modifiés.
- Quatre tests existants qui lisaient `AFFLICTIONS` ou posaient `activeAfflictions` ont été réécrits sur `DUNGEON_MARKS`.

## Un test instable, hors périmètre

Un test des **Petites Aventures** échoue environ une fois sur dix : *« run terminé soit par évacuation soit par fin de carte »*. Il est **préexistant** et sans rapport avec ce lot — un run de scène peut visiblement se terminer par une troisième voie que l'assertion ne prévoit pas. Je ne l'ai pas corrigé : sans comprendre cette troisième voie, le « réparer » reviendrait sans doute à masquer un vrai comportement. À regarder avec le chantier Petites Aventures.

## Groupe B terminé

B-1 (états de combat), B-2 (lisibilité de l'équipement), B-3 (D-3 recalibrage, D-4 nettoyage) sont livrés. La refonte des Donjons est close : D-0 à D-4.

Le document de conception des Donjons reste à passer en v1.2 (échelle des vagues, statMult du Basilic, cibles du banc). Ensuite, groupe C.
