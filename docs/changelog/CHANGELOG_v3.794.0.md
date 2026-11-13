# v3.794.0 — Critique plafonné à 100 % affiché ; ménage des traductions ; diagnostic [496] (13/11/2026)

Suite des « Signalés, sans correction d'office » (Seb 13/11 : points 1 option B, 2 et 3). Aucun fichier protégé modifié, aucun changement de sauvegarde, aucun fichier ajouté.

## 1. Critique au-delà de 100 % (option B)
- **Relevé** (robot, 3 parties complètes, `MESURE_CRIT=1`) : la Volonté des ennemis n'ôte que 0,5 à 2,6 points de critique.
  - Seul le Rôdeur dépasse 100 %, à la Tour : 91 % en moyenne, 122 % au plus. Il perd 4,5 points en moyenne sur 24 % des coups.
  - Chevalier (74 %) et Mage (70 %) n'y arrivent pas ; le Mage à 105 % du relevé du 12/11 portait la panoplie Légendaire.
- **Fiche du Héros** (`ui/heros-view.js`, `ui/heros-screens-view.js`) :
  - la Précision affiche « CRIT 100 % (max) » au-delà de 100 % ;
  - sa fiche ouverte ajoute une ligne rouge « Critique : le critique est plafonné à 100 % : tu as N %, le surplus ne sert plus. Mets tes points ailleurs. » ;
  - le résumé affiche « 100 % max ».
- Le combat ne change pas.

## 2. Contrôle [496] du harnais (intermittent en CI)
- Non reproduit : 6 passes sous Node 24 (la version de la CI) et 2 sous Node 22, toutes vertes.
- Pistes écartées :
  - une sortie ou une Petite Aventure restée active d'un contrôle précédent (`fullResetState` les remet à zéro) ;
  - un identifiant de jeu en double (compteur) ;
  - des minuteries (neutralisées dans le harnais).
- Les deux contrôles concernés affichent désormais, en cas d'échec, l'état utile : Grimoire modifiable, verrou du héros, sortie active, jeux et jeu actif.

## 3. Traductions anglaises
- 16 clés en double retirées de `en.js`, en gardant la valeur affichée jusqu'ici. 5 avaient deux valeurs : « The Trunk », « The watchtower », « Gourd », « The Sleepers' Aisle », « Under the lava ».
- Contrôle du harnais [513c] : aucune clé en double. L'outil d'ajout n'ajoute plus que les textes manquants.

## Outils
- Robot `tools/sim/campagne-harness.js` : relevé `MESURE_CRIT=1`, reposé à chaque relance du bac à sable.

## Contrôles
- `round-harness` 7085 OK, 0 échec, sur 2 passes ([513c] doublons, [513d] plafond du critique, NOV-20 adapté).
- boot 4 OK ; création du héros 46 OK ; parcours complet 236 OK ; i18n 100 %, 0 orphelin ; captures de la fiche avec un critique forcé à 112 %.
- Quoi de neuf : une ligne (FR + EN).
