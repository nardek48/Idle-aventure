# Aethervale — v3.236.0

Nouvelle chasse : **« Ce que les bêtes ont bu »**, source de Sève d'Aeswyn
proportionnelle au temps de jeu.
**Aucun fichier protégé touché. Le Donjon n'est pas modifié.**
Harnais : 1723 assertions, 0 échec.

---

## Pourquoi cette quête

Le banc `sim/seve-bench.js` avait établi que le problème de la Sève n'est pas le
volume mais l'**insensibilité à l'effort**. Les deux sources existantes sont bridées :

- Petite Aventure : cap de 3 runs par jour civil, rien ne peut l'accélérer ;
- Donjon I : prix de ticket en 1,2ⁿ, donc dix fois plus d'essence n'achète que six
  tickets de plus.

Mesuré avant : passer de 0,5 h à 3 h de jeu par jour ne divisait le délai
« Village + Forge » que par **1,4**. Le joueur qui s'investissait ne le voyait pas.

Une chasse est la seule source strictement proportionnelle au temps passé.

```
                 avant          après
0,5 h/jour      18 jours      15 jours
  1 h/jour      16 jours      12 jours
  2 h/jour      14 jours       8 jours
  3 h/jour      13 jours       7 jours
  5 h/jour      11 jours       5 jours
```

Le même écart 0,5 h → 3 h divise maintenant par **2,1**, et continue au-delà.

Elle est de surcroît **strictement additive** : les kills d'une chasse passent par le
moteur de combat normal et rapportent donc aussi leur essence, celle qui finance les
tickets de Donjon. Chasser ne prend son heure à aucune autre source.

---

## Réglages, et pourquoi ils sont ceux-là

Le moteur de chasse (`hunt-quest-system.js`, **protégé**) ne lit que sept champs :
`worldId`, `adventureIndex`, `enemyFilter`, `resourceKey`, `dropChancePct`,
`lotSize`, `rewardGold`. Aucun multiplicateur de difficulté. Cela cadre les leviers.

**`adventureIndex: 1` (Cœur de la forêt).** Le seul verrou de difficulté lisible par
le moteur. Mesuré sur le vrai générateur : 101 PV en Lisière contre 132 au Cœur, soit
77 % de kills par heure. Le Cœur fait donc à la fois le seuil d'accès et la
difficulté.

**`dropChancePct: 3`.** Le taux est le **seul** levier d'économie : la longueur du lot
n'y change rien, le drop étant par kill. 3 % au Cœur compense exactement la perte de
cadence et donne 9,2 Sève par heure — un peu mieux que 2 % en Lisière.

**`lotSize: 30`.** Ne règle pas le rendement mais la **mise** : le butin de ressource
passe par `SortieManager`, donc banqué en fin de lot, perdu à la mort, à moitié sur un
arrêt manuel. 30 kills font ~6 min au rythme du Cœur — assez pour que mourir coûte,
pas assez pour punir.

**Aucun `enemyFilter`.** Au Cœur, toute bête porte la marque. C'est aussi ce que dit
le titre.

Verrou d'accès : la quête apparaît à la fin de « Prouver sa valeur »
(`aq_forest_expedition`), soit l'événement exact qui ouvre le Cœur.

---

## Correctif d'affichage au passage

La ligne de récompense d'une chasse affichait « 3 % par kill » sans dire de quoi.
Sans conséquence tant qu'il n'y avait qu'une chasse à ressource ; avec deux, c'était
illisible. Elle nomme désormais la ressource : « 3 % de Sève d'Aeswyn par kill ».

---

## Garde-fous ajoutés au harnais

Bloc **[44] Chasse à la Sève** :

- la quête existe, donne bien de la Sève, est rattachée au Cœur, n'a pas de prime d'or ;
- **aucun champ inerte** — le moteur étant protégé et ne lisant que sept champs, un
  champ inventé donnerait une quête qui ne fait rien, en silence. L'assertion liste
  les intrus ;
- invisible avant la fin de « Prouver sa valeur », visible après ;
- la ligne de récompense nomme la ressource.

---

## Fichiers modifiés

| Fichier | Nature |
| --- | --- |
| `js/data/hunt-quests.js` | quête `hq_forest_seve` |
| `js/systems/mission-board-system.js` | verrou d'accès + récompense nommée |
| `sim/seve-bench.js` | lit la chasse réelle au lieu d'un paramètre |
| `round-harness.js` | bloc [44] |
| `js/core/constants.js` | `GAME_VERSION` → 3.236.0 |
| `sw.js` | `CACHE_VERSION` → 3.236.0 |

---

## Reste ouvert

- **L'Arbre-mère**, élite répétable : à concevoir. Le champ `repeatable` de
  `ELITE_DB` est réservé et toujours inerte. Réserve exprimée en session : une élite
  à cooldown recréerait exactement l'horloge qu'on vient de contourner — si elle doit
  servir au farm, il lui faut un frein interne (difficulté croissante dans la journée)
  plutôt qu'un cooldown.
- **Donjon** : l'effort y paie mal (tickets en 1,2ⁿ) et chaque ticket acheté est une
  perte nette d'essence (100 à l'achat, 76 rendus). Laissé intact pour la refonte.
