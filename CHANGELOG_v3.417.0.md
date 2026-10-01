# Aethervale v3.417.0 — Zones de production : une fenêtre par zone

Version Z2 de l'atelier des zones, choisie par Seb le 01/10/2026. S'applique sur la v3.416.0.

## Ce qui change
Ce qui change dans l'onglet Zones de la feuille d'un bâtiment de production :
- **La grille 3×3 reste**, mais il n'y a plus de sélection. Toucher une zone ouvre une **fenêtre centrée** avec ses actions :
  - zone ouverte :
    - sa jauge ;
    - **Niveau N+1**, avec le débit avant et après (« Eau/min : 0,7 → 1,2 ») et son coût ;
    - les **deux améliorations** propres au bâtiment, avec leur effet et leur coût, ou grisées et cochées quand elles sont installées ;
  - zone verrouillée : **Défricher** et son coût ;
  - plafond du monde atteint : « Plafond de ce monde (niv. N) », à toucher pour savoir où s'ouvre la suite.
- La fenêtre **reste ouverte après une action** : on peut monter une zone de plusieurs niveaux d'affilée. La croix ou le voile la ferment.
- **Sous la grille, un seul bouton fixe** : « ↑ La moins chère », et une ligne d'aide. Plus rien n'apparaît ni ne disparaît.
- Sur la grille :
  - la **prochaine zone à défricher** est encadrée d'or, avec « Défricher » ;
  - la zone la moins chère porte son étiquette verte au-dessus de la carte (elle ne cache plus le niveau) ;
  - les zones d'un monde pas encore atteint ne s'ouvrent pas.
- **Correction** : la grille débordait à droite de la feuille quand le nom d'une zone était long (« Abysse Primordial »). Ce bug venait de la v3.415.0 : le nettoyage du CSS avait retiré la règle qui l'empêchait.
- Le niveau de la zone passe en 12 px (il était en 10 px).

## Technique
- `production-view.js` :
  - **ajoutés** : `getNextUnlockablePlot`, `openZoneWindow`, `closeZoneWindow`, `buildZoneWindowHTML` et `buildZoneActionHTML` ;
  - `buildPlotsPanelHTML`, `buildPlotCardHTML` (les cartes deviennent des boutons) et `buildZoneGroupActionsHTML` sont réécrits ;
  - **retirés** : `selectedProductionPlotIndex`, `selectProductionPlot`, `buildPlotActionsHTML`, `buildPlotActionButtonHTML` et `productionSelectFirstLocked` ;
  - la fenêtre est rendue avec la feuille du bâtiment, si bien qu'elle survit à ses redessins. Elle se ferme quand on change d'onglet de feuille ou qu'on ferme la feuille.
- `04-panel-production.css` : styles de la fenêtre (`.zone-act`), de la prochaine zone et de l'étiquette « la − chère ». Les règles de l'ancien panneau sous la grille et de la sélection sont retirées.
- Textes : 8 nouveaux, traduits ; 3 orphelins retirés.

## Fichiers protégés
Aucun.

## Harnais
- Section [UX-PROD] adaptée : plus de sélection, fenêtre par-dessus, bouton fixe.
- Nouvelle section **[189]** :
  - prochaine zone signalée, zone d'un autre monde fermée ;
  - fenêtre : niveau, deux améliorations, amélioration installée cochée, Défricher ;
  - fermeture au changement d'onglet et à la fermeture de la feuille ;
  - code retiré ;
  - grille sans débordement.
- Résultats : round **3 704 OK** (deux passages), boot 4, création 44, parcours 139, campagne 38, i18n **100 % (3 719 textes)**.

## À tester en jeu
- Ouvrir la feuille du Puits, onglet des zones.
- Toucher une zone ouverte : la monter de deux niveaux sans fermer la fenêtre, puis installer une amélioration.
- Toucher la zone encadrée d'or et la défricher.
- Vérifier que la grille ne déborde plus à droite, sur ton téléphone.
