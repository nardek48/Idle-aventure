# CHANGELOG v3.250.0 — La Boutique a de nouveau une porte

**Base :** v3.249.0 (à installer avant) · **Delta :** 5 fichiers · `CACHE_VERSION` et `GAME_VERSION` → `3.250.0`

Correctif d'un **blocage de progression** remonté par Seb. À installer avant tout nouveau test.

---

## Le problème

Le lot Navigation N-1 (v3.244.0) a retiré la Boutique du menu ☰, en prévision du lot N-2 qui devait l'installer dans les bâtiments du Village. Entre les deux, l'écran n'avait plus **aucune porte accessible en début de partie** : les seuls renvois vivent dans les fiches de l'**Apothicaire** (et seulement si `level > 0`) et de la **Taverne** — deux bâtiments de rang 2, qui exigent le Village, débloqué à `forest_06`.

Or `forest_04` « Le colporteur » débloque l'onglet `shop` et demande *« Faire 1 achat en boutique (Économie ou Potion) »*. Reproduit sur une partie neuve : onglet débloqué, objectif affiché, **zéro porte** — ni menu, ni Camp, ni Village. La chaîne d'Histoire était **bloquée à la 4e étape**.

Deux conséquences en cascade :

- plus aucune potion de soin achetable — et ce sont elles qui décident : 98 % d'échec sans, 0 % avec trois, mesuré sur « Prouver sa valeur » ;
- le conseil du pronostic livré en v3.249.0 (« emporte des potions ») envoyait vers un écran inatteignable.

## Le correctif

Une carte **« Préparer »** au Campement, avec deux portes — **Potions** (avec le nombre en réserve en pastille) et **Économie** —, visible dès que l'onglet `shop` est débloqué. Elle vit au même endroit et sur le même modèle que la carte Grimoire : le Campement est le lieu où l'on prépare sa sortie.

C'est **transitoire** : quand la Halle et l'Apothicaire porteront les boutiques (lot N-2), cette porte pointera vers eux ou disparaîtra. Le commentaire dans `camp-view.js` le dit, pour qu'on ne l'oublie pas.

Le conseil du pronostic indique désormais le chemin : « Campement → Préparer → Potions ».

## Ce qui n'était pas en cause

**L'Apothicaire ne conditionne pas l'achat des potions.** C'est le bâtiment de **brassage** : il ouvre des recettes (`APOTHECARY_RECIPES`) et ajoute une ligne « Préparer » sous les cartes de la Boutique. Sans lui, la Boutique fonctionne normalement (`if (level <= 0) return ""` dans `potion-view.js`). Le problème était uniquement l'accès à l'écran.

## Audit des autres onglets

Passés en revue, tous ont une porte : `combat` par une mission, `dungeon` et `map` par le bloc Expédition du Camp, `equip`, `talents` et `ascension` par Héros, `grimoire` par sa carte au Campement, `bestiary`, `achievements`, `log`, `tutorials` et `settings` par le menu ☰. `shop` était le seul orphelin.

---

## Fichiers

| Fichier | Protégé | Intervention |
|---|---|---|
| `js/ui/camp-view.js` | non | `buildCampPreparationDoorsHTML()` et son appel |
| `js/systems/combat-forecast-system.js` | — | le conseil indique le chemin |
| `round-harness.js` | — | section [52] |
| `js/core/constants.js`, `sw.js` | — | version |

## Vérifications

- `round-harness.js` : section **[52]** (10 assertions : pas de porte quand l'onglet est verrouillé, les deux portes dès qu'il l'est, scénario complet de `forest_04` jusqu'à l'étape redevenue réclamable, et confirmation que la potion s'achète Apothicaire non construit). **1846–1848 OK, 0 échec sur 6 passages.**
- `hero-creation-harness.js` : 44 / 0.
- Chromium, partie neuve à `forest_04` : portes « Potions » et « Économie » présentes, achat effectué, « Le colporteur » passe à « récompense prête ».

## Remarque de méthode

Ce bug n'était détectable par aucun harnais existant : tous les tests partaient d'un état où les onglets étaient déjà débloqués par `skipAll()` ou posés à la main. La section [52] teste désormais le **chemin d'accès**, pas seulement la fonctionnalité. Il vaudrait la peine d'étendre ce principe : un test qui, pour chaque onglet débloqué par l'Histoire, vérifie qu'une porte existe à ce moment-là de la progression.
