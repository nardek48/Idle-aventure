# Aethervale v3.424.0 — Chantier Héros, H-1 : la navigation

Décisions de Seb du 02/10/2026 : atelier H-0 validé. S'applique sur la v3.423.1.

## Ce qui change
- **Un seul cadre « Héros »**, avec le **rail du kit en haut** (« mode train », comme le Village, le Camp et les Quêtes). La barre de sous-onglets du bas disparaît.
- **Quatre onglets** : Résumé · Équipement · Talents · **Compagnons**. Compagnons redevient un onglet ; il apparaît dès qu'un compagnon est recruté. Le bouton Compagnons du pied du Résumé est retiré.
- **Pastilles du rail** : les points de talent à placer (Talents) et les patrouilles rentrées (Compagnons).
- **La Boutique d'équipement s'installe à la Halle marchande** : un segment **Échoppe** dans la feuille de la Halle (Caravane · Échoppe · Agrandir).
  - Tant que la Halle n'est pas bâtie, la Boutique reste dans Héros › Équipement : un joueur doit pouvoir acheter sa première arme.
  - Une fois la Halle bâtie, Équipement ne garde que Équipé · Sac, avec un renvoi « Boutique d'équipement, à la Halle marchande du Village ».
  - `goToEquipShop()` ouvre la Halle sur son Échoppe. Un achat ou un renouvellement redessine la feuille (`equipShopBuy`, `equipShopRefresh`).

## Technique
- `heros-view.js` : `getHerosTabs`, `getHerosTabBadges`, `buildHerosRailHTML`, `herosFrameOpen`, `isEquipShopAtHall`. `buildHerosHTML` rend une page simple, sans `.subtab-page`. `buildHerosSubTabBarHTML` est retirée.
- `village-building-view.js` : segment `shop` de la Halle. Le renvoi « Voir l'échoppe dans Héros → Équipement » est retiré.
- `css/04-panel-hero-summary.css` : rail et renvoi vers la Halle.
- 2 nouveaux textes, traduits. 1 texte orphelin retiré.
- **Atelier H-0** (`atelier-heros.html`, `atelier/atelier-heros.js`) : prototype, **ne pas mettre en ligne**. On peut le supprimer, son contenu est maintenant en jeu.

## Fichiers protégés
Aucun.

## Harnais
- Nouvelle section **[196]** (11 contrôles). Sections [RESUME], [BILAN] et Compagnons (v3.268) adaptées.
- Résultats : round **3 800 OK**, boot 4, création 44, parcours 139, campagne 38, i18n 100 %.

---

# v3.424.1 — Retour de Seb
- Halle bâtie : le renvoi « Boutique d'équipement » est retiré d'Équipement. La Boutique se trouve dans la Halle, segment Échoppe.
- Harnais [196] adapté. Round 3 800 OK.
