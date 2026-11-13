# v3.791.0 — Tutoriels sur l'écran, lot 4 : Ruines et Crypte (13/11/2026)

Chantier des tutoriels sur l'écran, option B (Seb 13/11, choix A : les écrans des mondes suivants, en 2 lots). Lot 4 : 9 tutoriels des Ruines et de la Crypte passent en bulles. Les mécaniques d'ennemis, les fiches de donjon et les conseils de la Forge gardent la fenêtre. Aucun fichier protégé modifié, aucun changement de sauvegarde, aucun fichier ajouté.

## Ce qui change (`js/ui/coach-view.js`)
- **Ruines** :
  - ruines_03 « Deux sur trois » : Héros › Alliés ;
  - ruines_04 « Le Marché » : Champs, Carrière, Camp ;
  - ruines_06 « Les murs bougent » : préparation de la Petite Aventure, Craie, Pierre errante ;
  - ruines_07 « Le chantier errant » : quartier, chantier, Éboulement (carte vivante) ;
  - ruines_16 « Le Cœur » : le Cœur, ses trois voisins, pas de chantier.
- **Crypte** :
  - crypte_03 « Deux sur quatre » : Ysolt ;
  - crypte_04 « Le Marché » : blé, Entrepôt, Camp ;
  - crypte_06 « L'obscurité » : le noir, la Lanterne, le gardien ;
  - crypte_07 « Les gisants » : couloir, gisants, la Veillée.
- Aides : la carte vivante du monde s'ouvre pour les tutoriels de carte (le soir qui tombe d'abord refermé) ; Production et Alliés ouverts pour les autres.
- **Outil** `tools/audit/coach-captures.js` :
  - il part vraiment en Petite Aventure pour une étape de scène (repli : celle du monde) ;
  - il ne clique plus le « Compris » du tutoriel en route.
- 9 sauvegardes du robot ajoutées à `captures/coach-saves/` (hors dépôt).
- **Traductions** : 40 textes nouveaux. **CLAUDE.md** : 37 tutoriels sur l'écran.

## Contrôles
- `round-harness` 7080 OK, 0 échec ([513] 37 tutoriels).
- boot 4 OK ; création du héros 46 OK ; i18n 100 %, 0 orphelin.
- Parcours complet (Chromium) 236 OK, 0 échec.
- Captures iPhone des 9 tutoriels : toutes sur l'écran, 3 bulles chacune, **validées par Seb** (`captures/lot2-planches/lot4-planche-*.png`).
- Alpha mise à jour en v3.791.0 (accord de Seb).
- Quoi de neuf : une ligne (FR + EN).
