# CHANGELOG v3.223.0 — Donjons : plafond par monde et matériau de monde

**Base d'entrée :** v3.222.0 · **Harnais :** 1520-1521 → **1534-1536 OK, 0 échec**
(+14 assertions, nouveau bloc `[32]`) · **boot-harness :** 4 OK, 0 échec

⚠️ **Fichier protégé modifié : `js/systems/dungeon-system.js`**, périmètre
confirmé par Seb, limité à `isTierUnlocked()` et à la fonction de fin de run
(`finish()`). Aucune autre logique touchée.

---

## 1. Plafond de palier par monde

Un Donjon V donne du légendaire. Le proposer en Forêt, où le loot plafonne au
commun, n'avait pas de sens.

| Palier | Monde requis | Rareté maximale |
|---|---|---|
| Donjon I | Forêt enchantée | Commun |
| Donjon II | Désert oublié | Inhabituel |
| Donjon III | Ruines anciennes | Rare |
| Donjon IV | Crypte oubliée | Épique |
| Donjon V | Montagne brûlante | Légendaire |

**Le monde retenu est le plus haut jamais atteint**, pas le monde courant :
redescendre en Forêt ne referme pas un donjon déjà ouvert. C'est vérifié.

**Les deux verrous restent indépendants.** Atteindre le Désert n'ouvre pas le
Donjon II si le Donjon I n'a pas été terminé, et inversement. La carte dit
laquelle des deux conditions manque — « Atteins Désert oublié pour débloquer »
ou « Termine Donjon I pour débloquer » — au lieu d'un « Verrouillé » sec.

---

## 2. Le donjon devient une source de matériau de monde

Le Donjon I rapporte **2 Sève d'Aeswyn** à la réussite complète. Ça règle un
manque laissé par la v3.214.0 : la Sève n'avait qu'une source, les Petites
Aventures, que la Menuiserie et la Grande ration se disputaient déjà.

- **Réussite complète seulement.** Une fuite ou une mort n'en donne pas, comme
  pour le butin d'équipement.
- **Écriture par `WarehouseManager`**, seul point d'entrée des ressources — le
  plafond de l'Entrepôt s'applique donc normalement.
- **Annoncé sur la carte avant d'entrer**, pas découvert à la fin : c'est une
  raison de choisir ce palier.
- Ligne dédiée dans le rapport de fin de run.

Les paliers II à V n'ont pas encore de matériau : ceux des mondes 2 à 5
n'existent pas. Ils arriveront avec eux, comme la Résine est arrivée avec la
Menuiserie.

---

## 3. Fichiers modifiés

- **`js/data/dungeon.js`** — `worldRequired`, `specialResourceId`,
  `specialResourceAmount` sur les cinq paliers.
- **`js/systems/dungeon-system.js`** (périmètre confirmé) —
  `getHighestWorldReached()`, `isTierAllowedByWorld()`, `getTierLockReason()`,
  `isTierUnlocked()` réécrit par-dessus, et le crédit du matériau dans
  `finish()`.
- **`js/ui/dungeon-view.js`** — matériau annoncé sur la carte, message de verrou
  selon la raison, ligne dans le rapport de fin.
- **`css/04-panel-dungeon.css`**, **`sw.js`** (`3.223.0`), **`round-harness.js`**.

---

## 4. Vérifications

- **Harnais** : 1534-1536 OK, 0 échec sur trois passages. Le bloc `[32]` couvre
  le Donjon II fermé en Forêt malgré le palier précédent terminé, la raison
  donnée, l'ouverture au Désert, le donjon qui ne se referme pas en
  redescendant, l'indépendance des deux verrous, la déclaration du monde sur les
  cinq paliers, la Sève sur le Donjon I, le crédit réservé à la réussite, le
  passage par `WarehouseManager`, et l'annonce sur la carte.
- **Rendu Chromium** à 390 px : Donjon I ouvert avec sa ligne « +2 Sève
  d'Aeswyn », Donjons II et III verrouillés avec le nom du monde à atteindre.

---

## 5. Points d'attention

- **Un joueur avancé pourrait voir des paliers se refermer** s'il avait débloqué
  au-delà de son monde. C'est le comportement voulu, mais si tu as une partie de
  test dans ce cas, c'est là que ça se verra.
- **Équilibrage** : 2 Sève par run complet de Donjon I, contre des ticket-runs
  limités par jour. À comparer au rendement des Petites Aventures une fois que
  tu auras joué les deux.
- La Sève est maintenant demandée par la Menuiserie (Résine durcie), la Grande
  ration et l'offrande de l'étape 15 de l'Histoire. Avec cette seconde source,
  la pression devrait redescendre — c'est à mesurer.
