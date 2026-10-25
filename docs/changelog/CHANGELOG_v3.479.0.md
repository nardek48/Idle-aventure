# v3.479.0 — Refonte de l'économie, RE-2 : les zones s'achètent par rangée

Question de Seb (« 9 zones par ressource, ce n'est pas trop ? »), option 1 retenue, atelier `atelier/zones-par-rangee.html` validé. La grille 3×3 reste ; ce sont les achats qui se regroupent.

## Ce qui change en jeu
- Dans la feuille d'un bâtiment de production (onglet des zones), **une barre par rangée ouverte** sous la grille :
  - **Défricher ×n** : ouvre d'un coup les zones verrouillées de la rangée ;
  - **↑ Niv. n ×n** : monte d'un niveau les zones les plus basses de la rangée, jusqu'à ce qu'elles soient à égalité ; s'arrête au plafond du monde ;
  - **Améliorer ×n** : pose les deux améliorations sur toutes les zones ouvertes de la rangée.
- Chaque achat additionne le coût des zones et se paie en entier ou pas du tout. Un bouton grisé pâlit la ressource qui manque.
- Une rangée finie tient sur une ligne (« au maximum »). Les rangées des mondes pas encore atteints ne s'affichent pas.
- Le bouton « La moins chère » et son drapeau vert sur la grille disparaissent. Toucher une zone ouvre toujours sa fenêtre, pour la régler à part.
- Correction : à 320 px, le nom et le monde des zones verrouillées débordaient de leur carte ; ils finissent maintenant par « … ».

## Mesure
Achats pour tout monter (6 bâtiments, stock suffisant pour une rangée entière) : 372 → 108 (Forêt 84 → 24, Désert 162 → 48, Crypte 126 → 36).

## Code
- `systems/production-plots-system.js` : `getRowState`, `unlockRow`, `upgradeRow`, `improveRow`.
- `ui/production-view.js` : `buildZoneGroupActionsHTML` (barres de rangée), `productionRowAction` ; `getCheapestUpgradablePlot` et `productionUpgradeCheapest` retirés.
- `css/04-panel-production.css` : barres de rangée, coupure des noms de zone ; règles de « la − chère » retirées.
- `lang/en.js` : 10 textes ajoutés, 3 retirés.
- Aucun fichier protégé, aucun fichier ajouté, rien dans la sauvegarde.

## Outils
- `round-harness.js` :
  - section [300] (9 contrôles : état d'une rangée, défricher, monter à égalité, plafond du monde, améliorer, tout ou rien, rangée d'un monde non atteint, barres, 320 px) ;
  - section des zones : les contrôles de « la − chère » remplacés par ceux des barres.

## Contrôles
- Chromium, vrai jeu, Scierie en Forêt, au Désert et à la Crypte, 390 et 320 px : barres conformes à l'atelier, « Défricher ×3 » ouvre la rangée 2 d'un toucher, rien ne déborde.
- i18n 100 %, aucun orphelin.
- round-harness 4871 OK, 0 échec (deux passes) ; boot, création du héros, parcours (139) OK.
