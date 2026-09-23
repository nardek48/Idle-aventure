# Aethervale v3.324.0 — Outils d'admin et carte d'un autre héros

Session de retours de test ouverte sur la v3.323.0.

## Bug : la carte du Désert chez un héros resté en Forêt
- **Cause :** la carte vivante ouverte (`livingMapOpenId`) vivait hors de `game` et survivait au changement de héros.
- **Correctif :** la vue retient l'emplacement de héros qui a ouvert la carte (`livingMapOpenSlot`). Avant chaque rendu de l'écran Carte, `livingMapDropStale()` referme la carte dans deux cas :
  - l'emplacement a changé ;
  - le héros n'a pas encore atteint cette carte (`isMapOpen`).
- Fichiers : `js/ui/living-map-view.js` et `js/ui/map-view.js`. Aucun fichier protégé.

## Écran Admin : trois nouvelles cartes (`js/ui/admin-view.js`)
- **Compagnons.** « Recruter les compagnons » recrute Wenna et Maddoc et ouvre Héros › Compagnons. Maddoc sans voie prend « Le tronc », modifiable dans sa fiche.
- **Petites Aventures.** Affiche les tentatives restantes du jour, avec trois boutons : +1, +5, et « Remettre le jour à zéro ». Le compteur peut dépasser le cap ; il repart seul le lendemain.
- **Histoire.**
  - **Valider l'étape en cours** : accepte l'étape si besoin, puis la réclame en forçant sa condition. La récompense et le popup de fin s'affichent.
  - **Avancer jusqu'à l'étape…** : valide les étapes une à une, sans popup, et s'arrête sur l'étape choisie, pas encore acceptée.
  - L'avance forcée pose ce que le contenu lié aurait posé :
    - les quêtes d'aventure liées sont marquées terminées ;
    - les canevas de scène appliquent leurs déblocages, drapeaux et voyages (traversée du Désert, descente au Temple) ;
    - les secteurs de carte liés sont libérés ;
    - les donjons 1 et 2 sont marqués franchis ;
    - les drapeaux `outreFilled`, `verreTrempe` et `citeVague5` sont posés ;
    - les compteurs d'offrande sont remplis.
  - Un choix en attente prend sa première option.
  - Les récompenses des quêtes d'aventure liées ne sont pas données.
  - L'avance est refusée pendant un combat ou un run. On ne peut qu'avancer.

## Harnais
- Nouvelle section **[119]** : 27 contrôles (admin et carte d'un autre héros).
- **round-harness** : 0 échec sur 3 passages, 3 030 à 3 031 OK, section [85] sautée.
- **boot-harness** : 4 OK.
- **hero-creation-harness** : 44 OK.

## Livraison
Delta sur la v3.323.0. Aucun fichier nouveau hors ce changelog.
