# v3.491.0 — Montagne, lot M-5 : acte IV « Le droit de prendre »

Les étapes 16 à 20 ferment le chapitre V. Elles suivent le document « Montagne — Acte IV » v1.0, validé par délégation de Seb le 25/10. Aucun fichier du jeu n'est ajouté.

## Les cinq étapes
16. **Ce qui respire** : libérer une fois chacun des quatre secteurs du haut de la carte (la coulée morte, la forge froide, le lac de lave, l'entrée de l'Antre).
17. **Le sentier du dessus** : un parcours de cinq paliers, de la coupe du lac au plateau du nid. Il coûte une Ration.
18. **Ceux qu'il a triés** : quatre rencontres sur le plateau du nid.
19. **Le Dragon ancien** : deux rencontres, puis le boss. Tutoriel du même nom.
    - Il trie dès l'entrée : il frappe celui qui a taillé, ×1,5.
    - À 75, 50 et 25 % de ses PV, la chaleur monte d'un cran, en plus des tailles.
    - À 50 %, deux dragonnets descendent du nid.
    - Sous 25 %, il enrage.
20. **Le droit de prendre** : troisième choix pesant de la Montagne, clé `droit`.
    - *La prendre pour Aeswyn* (Garder + Aeswyn) : le puits de la veine-mère verse 3 Cendres vives par jour civil, comme la table des noms de la Crypte.
    - *La laisser à la Montagne* (Donner + Soi) : à la Montagne, chaque cran de chaleur donne aussi +5 % aux coups du héros.
    - Dans les deux branches, *Le fil bleu* : une amulette Épique de la Montagne.

**Fin du chapitre** : Orwen voit une tour depuis Aeswyn. « Il reste la Tour. Elle te prendra le reste. » Rien n'est dévoilé sur le Veilleur (MT1).

## Mémoire 20 : « Le droit de prendre » (jalon)
| Option | Côté | Effet |
| --- | --- | --- |
| Rien ne se perd | Garder | La Cendre taillée est versée même si le combat est perdu |
| Lame vive | Donner | +5 % de lame de plus par taille du héros |
| Le froid de la pierre | ligne Garder | Le premier cran de chaleur de chaque combat ne compte pas |
| Ce qui a été pris | ligne Donner | +25 % d'or sur un boss ou une élite de la Montagne vaincu après une taille |

Coût du niveau : 265.

« Ce que tu portes » affiche trois effets de plus : *L'ouvrage achevé* (choix de l'étape 14), *La veine-mère* et *Ce que la Montagne apprend*.

## Équilibrage
La campagne au robot part des sauvegardes de fin d'acte III : 12 étapes OK, 0 échec pour les trois classes, avec 0 à 2 morts.

Mesures au banc (`montagne-acte3-bench.js --quetes`, sauvegardes de fin de chapitre, 10 runs par classe) :

| Combat | Chevalier | Rôdeur | Mage |
| --- | --- | --- | --- |
| Ceux qu'il a triés (puissance 6,5) | 80 % | 100 % | 90 % |
| Dragon ancien, PV ×2,1 et puissance ×0,85 | 60 % | 100 % | 10 % |
| Dragon ancien, PV ×1,8 et puissance ×0,75 | 100 % | 100 % | 50 % |
| Dragon ancien, PV ×1,6 et puissance ×0,65 | 100 % | 100 % | 80 % |

Le Dragon est réglé à **PV ×1,7, puissance ×0,7**, entre les deux derniers essais. C'est le Mage qui fixe le réglage.

## Fichiers protégés touchés (accord Montagne de Seb)
- `combat-engine.js`, une ligne : la victoire passe le dernier ennemi tombé aux veines, `VeinSystem.onVictory(enemy)`. Cela sert à « Ce qui a été pris ».

## Images (à fournir par Seb)
Les 8 prompts sont dans « Images à faire », groupe « M-5 · acte IV » :
- le fond du parcours `montagne_sommet` ;
- trois effets d'Histoire ;
- quatre Mémoires.

Le prompt de *La veine-mère* est écrit pour se distinguer du *Puits chaud* de l'étape 5 : les deux montrent un puits.

## Contrôles
- `node --check` sur les JS modifiés.
- Round-harness : 5028 OK, 0 échec, sur 2 passes. Nouvelle section [313] : 14 contrôles.
- Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- i18n : 6378 textes, 100 %, 0 orphelin.
- Chromium à 390 et 320 px, sans erreur de console : la carte du choix « Le droit de prendre ».
