# CHANGELOG v3.220.0 — Échelle de monde sur l'équipement

**Base d'entrée :** v3.219.0 · **Harnais :** 1469-1471 → **1481-1482 OK, 0 échec**
(+12 assertions, nouveau bloc `[29]`) · **boot-harness :** 4 OK, 0 échec
**Banc Forêt : identique**, au point de pourcentage près.
**Aucun fichier protégé modifié.**

---

## 1. Le problème mesuré

Un objet trouvé à la Tour valait exactement un objet trouvé en Forêt : seule la
rareté progressait, soit **×3,4 au total**, quand les PV des ennemis font
**×214**. Mesure sur le vrai moteur, avec l'entraînement et la rareté plausibles
de chaque monde, crit et attaque automatique compris :

| Rounds pour tuer un ennemi normal | M1 | M2 | M3 | M4 | M5 | M6 |
|---|---|---|---|---|---|---|
| **Avant** | 0,7 | 3,2 | 6,8 | 4,4 | 20,6 | 30,7 |
| **Après** | 1 | 5 | 5 | 3 | 6 | 5 |

Le combat devenait sept fois plus long entre le début et la fin de la partie.

---

## 2. Ce qui a changé

Un objet est désormais **estampillé du monde où il tombe** (`worldIndex`) et sa
valeur est mise à l'échelle **à la génération**, pas à la lecture. Deux raisons :
la valeur affichée est la vraie, sans calcul caché, et un objet gardé ne change
pas de puissance quand le joueur change de monde.

Courbe retenue : `[1, 1.4, 2.2, 4, 10, 18]`.

---

## 3. Le piège du chantier : toutes les stats ne peuvent pas suivre

**Seules les stats plates sont mises à l'échelle** — dégâts d'arme et célérité
des bottes. Les stats en pourcentage ne le sont jamais :

- la **défense** est plafonnée à 60 % : une armure légendaire ×9 donnerait 117 %
  de réduction, c'est-à-dire l'invulnérabilité ;
- **multiplier un multiplicateur** (critique, dégâts, or) n'a aucun sens.

C'est marqué par un drapeau `scalesWithWorld` sur les deux emplacements
concernés, et deux assertions du harnais vérifient que l'armure et le casque n'y
figurent pas.

---

## 4. Recalage après mesure

La courbe validée en discussion était `[1, 1.3, 1.7, 2.5, 5, 9]`. Elle venait
d'un modèle supposant que 75 % des dégâts suivraient l'échelle. Une fois
implémentée pour de vrai, la mesure donnait **10,6 et 8,7 rounds** aux mondes 5
et 6 — la cible de 4-5 n'était pas atteinte, parce que seule la part plate
bouge, pas les multiplicateurs.

Les coefficients ont donc été recalés **sur le moteur**, PV moyennés sur les
trois aventures de chaque monde, jusqu'à atteindre la cible. C'est le même
principe que d'habitude : le modèle propose, la mesure décide.

---

## 5. Fichiers modifiés

- **`js/data/equipment.js`** — `EQUIP_WORLD_SCALE`, `getEquipWorldScale()`,
  drapeau `scalesWithWorld` sur l'arme et les bottes.
- **`js/systems/loot-system.js`** — `generateEquipmentItem(slot, rarity, worldIndex)`
  applique l'échelle et estampille l'objet.
- **`js/ui/equipment-view.js`** — `buildItemOriginHTML()`, affichée sur les trois
  panneaux de détail (sac, emplacement équipé, comparaison).
- **`sw.js`** (`3.220.0`), **`round-harness.js`**.

---

## 6. Compatibilité

- **Les objets d'une sauvegarde antérieure n'ont pas de `worldIndex`.** Ils sont
  traités comme des objets de Forêt — ce qu'ils sont de fait, puisqu'ils ont été
  tirés sans échelle. Aucune migration, aucun objet cassé, et la ligne de
  provenance affiche « Forêt enchantée » plutôt qu'un trou.
- **L'arme de départ** garde sa valeur imposée (1), hors échelle.
- **Le butin unique des élites** est écrit à la main dans `data/elites.js` et
  n'est pas mis à l'échelle. Ces objets sont de palier Forêt par construction ;
  quand les élites des autres mondes arriveront, leurs valeurs seront écrites au
  palier du monde concerné.
- **L'échoppe d'équipement** indexe déjà ses prix sur le monde atteint
  (v3.114.0) : un objet plus puissant y coûte donc mécaniquement plus cher, sans
  rien à changer.

---

## 7. Vérifications

- **Banc Forêt** : identique avant/après. La Forêt est le monde 1, coefficient 1
  — rien n'y bouge, et c'est vérifié plutôt que supposé.
- **Harnais** : 1481-1482 OK, 0 échec sur trois passages. Le bloc `[29]` couvre
  la liste exacte des emplacements mis à l'échelle, la croissance de la courbe,
  son écart avec celle des PV, l'estampille du monde, la valeur hors fourchette
  à la Tour, l'armure qui **reste** dans sa fourchette à tous les mondes, l'objet
  sans `worldIndex`, et l'arme de départ.

---

## 8. Points d'attention

- **Le creux du monde 4 subsiste** (3 rounds contre 5 au monde 3). Il ne vient
  pas de l'équipement mais de `WORLD_MULT_BY_WORLD`, dont les paliers sont
  irréguliers (1,26 / 1,64 / 1,92 / 2,76 / 5,42 / 7,89). C'est un chantier à
  part, à traiter quand tu voudras.
- **Le monde 1 reste sous un round par ennemi normal.** C'était déjà le cas
  avant ; les ennemis de Forêt sont volontairement expédiés.
- **Un joueur en cours de partie ne verra rien changer immédiatement** : ses
  objets actuels gardent leur valeur. La différence apparaîtra au premier drop
  dans un monde avancé — et elle sera spectaculaire, ce qui est le but.
- Ce lot était le second préalable à la Forge. Les fourchettes sont régulières
  (v3.219.0) et l'échelle de monde est posée : la règle « 30 niveaux de forge =
  un cran de rareté » peut maintenant s'appliquer proprement, à l'intérieur du
  palier de monde de l'objet.
