# v3.615.2 — La Boutique reste à côté du Sac

Demande de Seb (option A) : la Boutique d'équipement ne disparaît plus de Héros une fois la Halle marchande bâtie.

## Changements
- `js/ui/heros-view.js` (`buildHerosEquipHTML`) : l'onglet **Boutique** est toujours affiché dans Héros › Équipement (Équipé · Sac · Boutique), Halle bâtie ou non. La Halle garde son segment Échoppe, qui montre la même boutique.
- `js/ui/equip-shop-view.js` (`refreshHallShopSheet`) : hors fiche de la Halle, un achat ou un renouvellement rafraîchit le panneau courant.
- Quoi de neuf : une ligne (FR + EN).

## Contrôles
- Harnais : [196] mis à jour (la Boutique reste dans Héros après la Halle), nouvelle section [412] (2 contrôles). 5 802 OK, 0 échec, stable sur 3 passes.
- Achat vérifié dans le vrai jeu (Chromium 390 px, Halle niv. 3) : or débité, pièce équipée.
- boot, création du héros, audit i18n (100 %), parcours.
