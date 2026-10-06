# Aethervale v3.426.0 — Chantier Expéditions : tout ce qui part et revient, au même endroit

Ateliers E-0 et E-1 validés par Seb le 02/10/2026. S'applique sur la v3.425.0.

## Campement › Expéditions
- L'onglet « Départ » du Campement devient **« Expéditions »**. **Pastille verte** quand quelque chose attend d'être récupéré.
- **Tableau des départs** (variante B), toutes sortes mêlées, rangé par état : **À récupérer · Prêts à partir · En route · Plus tard**, avec trois compteurs en tête.
  - **Petites Aventures** : les places du jour (pastilles), la prochaine place quand il n'y en a plus, « Carte › » pour choisir le lieu.
  - **Patrouilles** : une ligne par compagnon (au camp, en route avec le compte à rebours, rentré avec « Prendre le butin »).
  - **Caravane** : prête, en route, rentrée avec « Décharger ».
  - **Donjon** : les sorties du jour, la tentative en cours.
  - En pied : **Carte** et **Potions** (les portes de l'ancien onglet).
- Les comptes à rebours avancent chaque seconde ; une échéance passée fait changer la ligne de rubrique.
- Pas de bulles flottantes sur le tableau (elles cachaient les boutons des lignes).

## Feuille « Patrouille »
- Plus de liste déroulante : la **durée** (2 h, 4 h, 8 h), le **monde** en vignettes (comme les marchés de la Caravane), puis **une carte par lieu libéré avec ce qu'il rapporte** (chaque ressource, l'or, l'anneau en points ; « le plus » sur le lieu qui rapporte le plus).
- Le bouton dit tout : « Envoyer Maddoc · 8 h · Arbre-mère ».
- **On envoie un compagnon sur n'importe quelle carte atteinte**, sans changer de monde (Forêt depuis le Désert).
- En route ou rentrée : l'état de la patrouille (Rappeler, Prendre le butin), puis le dernier retour en tête de la feuille.

## Feuille « Caravane »
- **Choix du marché** en vignettes : Forêt enchantée (trajet Long : Sève d'Aeswyn) ou Désert oublié (Verre des dunes). **Plus besoin de changer de monde.** La caravane roule sur la carte vivante du marché choisi. Choix retenu sur l'appareil, comme le trajet.
- Trajets, chargement et départ : inchangés.

## Ce qui a bougé
- **Halle marchande** : la Caravane quitte sa feuille (segments **Échoppe · Agrandir**, l'Échoppe par défaut). Un renvoi en tête dit où en est la caravane et mène aux Expéditions. Le ruban « De retour » reste sur la tuile de la Halle.
- **Fiche du compagnon** (Héros › Compagnons) : la Patrouille est remplacée par un renvoi (« Rentré · butin à prendre », « En route · retour dans… », « Se lance depuis Campement › Expéditions »).
- Toucher la caravane sur la carte vivante, le fil rouge « patrouille rentrée » : mènent aux Expéditions, feuille ouverte.

## Systèmes
- `PatrolManager.getDestinations([mapId])` : toutes les cartes atteintes (un secteur libéré suffit), ou une seule. Nouveau `reachedMapIds()`. Les identifiants de secteur sont uniques entre cartes.
- `CaravanManager.getMarkets()`, `depart(tripId, worldIndex)`, `getRareKey(worldIndex)` : le monde du marché décide du matériau rare et de la carte où roule la caravane.
- Aucun nouvel état sauvegardé (le monde de la caravane était déjà dans `game.village.caravan.world`). Choix du marché : préférence de l'appareil (`caravanMarket`).

## Code
- Nouveaux : `js/ui/expeditions-view.js`, `css/04-panel-expeditions.css`, `#exp-sheet-root` dans `index.html`.
- `patrol-view.js` : `buildPatrolProgressHTML`, `buildPatrolLastResultHTML`, renvoi dans la fiche ; `patrolPick` passe dans `expeditions-view.js`.
- `camp-view.js` : portes Potions / Donjon / Carte retirées (dans le tableau), `campShownTab`.
- `caravan-view.js` : marché (`getCaravanSelectedMarket`, `selectCaravanMarket`), feuille des Expéditions.
- Couleurs des nouvelles feuilles de style rattachées à la palette (écart invisible) : 132 couleurs restent en clair dans tout le CSS.

## Harnais
- Nouvelle section **[198]** (21 contrôles). Contrôles de la Caravane mis à jour ([191], [192]).
- Résultats : round **3 850 OK**, boot 4, création 44, parcours 139, campagne 38, i18n 100 % (0 orphelin).

---

# v3.426.1 — Retour de Seb : « pas de monde ? »

- Feuille Patrouille : **la vignette du monde reste affichée même quand une seule carte est atteinte** (avant, elle n'apparaissait qu'à partir de deux). Pleine largeur. Même chose pour le marché de la Caravane.
- Un seul lieu libéré dans le monde choisi : **il est déjà sélectionné**, le bouton « Envoyer » est prêt.
- Rappel : un monde apparaît dès qu'un de ses secteurs est libéré sur la carte vivante.
- Harnais : 2 contrôles ajoutés à [198]. Round **3 852 OK**.

---

# v3.426.2 — Retours de Seb (13 h 38)

- **Production** : la jauge du stock des tuiles est plus épaisse sur mobile (cadre fin étiré, fenêtre d'environ 8 à 14 px), texte à 12 px.
- **Héros › Équipé** : emplacements agrandis (60 → 70 px, silhouette un peu plus haute). Le détail de l'emplacement choisi est un **panneau collé en bas, par-dessus la silhouette**, comme celui des Talents : icône à gauche, nom, stat et affixes au milieu, Déséquiper et Changer à droite.
- **Héros › Talents** : icônes agrandies (54 → 64 px, clés de voûte 74 → 86 px).
- L'annonce du retour de la caravane dit maintenant « décharge-la dans Campement › Expéditions » (elle renvoyait encore à la Halle).
- Harnais : 3 contrôles ajoutés à [198]. Round **3 855 OK**, parcours 139, i18n 100 %.

---

# v3.426.3 — Retour de Seb (13 h 47)

- **Héros › Équipé** : les bonus de panoplie passent **sous la silhouette**, au-dessus du panneau de détail.
- Harnais : 1 contrôle ajouté à [198]. Round **3 856 OK**.
