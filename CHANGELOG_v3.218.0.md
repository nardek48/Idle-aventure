# CHANGELOG v3.218.0 — Construction du village, lot V-7 (Entrepôt agrandi)

**Base d'entrée :** v3.217.0 · **Harnais :** 1447 → **1459-1461 OK, 0 échec**
(+14 assertions, nouveau bloc `[27]`) · **boot-harness :** 4 OK, 0 échec
**Aucun fichier protégé modifié.**

---

## 1. Ce que fait l'Entrepôt agrandi

Chaque niveau ajoute **250 au plafond de chaque ressource fabriquée** : 999 sans
bâtiment, 3 499 au niveau 10. Premier bâtiment de **rang 4** (Atelier niveau 7),
et le premier dont les paliers hauts demandent la **Résine durcie**.

Les matières brutes n'ont pas de plafond dans le jeu et n'en reçoivent pas : le
bâtiment ne leur invente rien.

---

## 2. Le vrai travail : un seul plafond, partout

Le plafond était lu à trois endroits, chacun directement dans la table
(`WAREHOUSE_RESOURCES[key].cap`) : l'ajout de ressource, le calcul de lots
automatiques des ateliers, et rien du tout à l'affichage.

Le relever depuis un bâtiment sans unifier aurait produit un bug silencieux
désagréable : **un atelier aurait calculé ses lots avec l'ancien plafond**,
fabriqué le surplus, et `addResource` l'aurait écrêté à l'arrivée — intrants et
temps de craft perdus, sans message.

`WarehouseManager.getCap(key)` devient donc la seule source de vérité, et le
fichier reprend la même règle que pour l'écriture : l'Entrepôt est **le seul
point de vérité du plafond**, comme il est le seul point d'écriture. Une
assertion du harnais lit la source de `getMaxAutoCraftTimes()` pour vérifier
qu'elle passe bien par `getCap` et ne lit plus la table.

---

## 3. Le stock déjà accumulé n'est jamais raboté

`addResource` plafonne les **ajouts**, il ne retire rien. Un joueur qui se
retrouverait au-dessus du plafond (retour à une version antérieure, sauvegarde
bricolée) garde tout ce qu'il a ; simplement, plus rien ne rentre tant qu'il est
au-dessus. Vérifié au harnais.

---

## 4. Fichiers modifiés

- **`js/systems/warehouse-system.js`** — `getCap()`, utilisé par `addResource`.
- **`js/systems/workshops-system.js`** — le calcul de lots automatiques lit
  `getCap` au lieu de la table.
- **`js/data/hunt-quests.js`** — constante `WAREHOUSE_CAP_PER_LEVEL`.
- **`js/data/village-buildings.js`** — Entrepôt agrandi livré, paliers 5-9 à la
  Résine durcie.
- **`js/ui/warehouse-view.js`** — le détail d'une ressource affiche
  `stock / plafond`, et « plein » quand c'est le cas. Sans ça, le joueur ne voit
  jamais ce que lui rapporte le bâtiment, ni pourquoi un atelier s'arrête.
- **`js/ui/village-building-view.js`** — `goToWarehouse()`.
- **`sw.js`** (`3.218.0`), **`round-harness.js`**.

---

## 5. Vérifications effectuées

- **Harnais** : 1459-1461 OK, 0 échec sur trois passages.
- Le bloc `[27]` couvre : le plafond aux niveaux 0, 4 et 10, les matières brutes
  laissées sans plafond, l'écrêtage d'`addResource` avec et sans bâtiment, la
  place gagnée immédiatement utilisable, le stock au-dessus du plafond non
  détruit, la lecture du plafond par les ateliers (contrôle sur la source), le
  verrou de rang 4 et les paliers à la Résine.

---

## 6. Points d'attention

- **Équilibrage** : 250 par niveau est calé sur le plafond d'origine (999), pas
  sur le débit de production. Si un atelier remplit 3 499 planches aussi vite
  qu'il remplissait 999, le bâtiment n'aura servi qu'à retarder le moment où le
  joueur doit dépenser — à mesurer.
- **La Palissade reste le dernier bâtiment non livré**, avec la Forge. Elle
  dépend des cartes vivantes : tant qu'elles n'existent pas, « freiner la
  régression du Recouvrement » n'a rien sur quoi agir. Sa carte reste
  verrouillée avec sa condition écrite dessus.
- **Rappel cache** : `CACHE_VERSION` est à `3.218.0`.

---

## 7. Où en est le village

| Bâtiment | Rang | État |
|---|---|---|
| Atelier de Construction | — | Livré (V-1) |
| Terrain d'entraînement | 1 | Livré (V-2) |
| Apothicaire | 2 | Livré (V-4) |
| Halle marchande | 3 | Livré (V-5) |
| Taverne | 3 | Livré (V-6) |
| **Entrepôt agrandi** | **4** | **Livré (ce lot)** |
| Forge | 2 | En attente — conception à revoir, non prioritaire |
| Palissade | 4 | En attente — dépend des cartes vivantes |

**Six bâtiments sur huit sont livrés.** Les deux qui restent attendent une
décision de conception, pas du code.
