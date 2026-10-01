# Aethervale v3.414.0 — Village : rail à quatre onglets, vignettes (lot VUI-1)

Premier lot de la refonte du Village, d'après l'atelier validé le 01/10/2026 (version A2, `atelier-village-8.html`). Les lots suivants : VUI-2 (Ateliers en vignettes) et VUI-3 (Entrepôt).

## Navigation
- **Quatre onglets en rail en haut** : Bâtiments · Production · Ateliers · Entrepôt.
  - Ils remplacent les trois boutons du bas (Village, Entrepôt, Production) et le double bouton Production | Ateliers.
  - Le cadre s'appelle toujours « Village ».
- **L'onglet Village s'ouvre toujours sur Production** (décision Seb : c'est là qu'on récolte).
- **Pastilles du rail** :
  - Bâtiments : chantiers possibles, sauf si un chantier est déjà en cours ;
  - Production : bâtiments au stock plein ;
  - Ateliers : ateliers à l'arrêt ;
  - Entrepôt : ressources brutes au plafond.
- Les anciens liens (fil rouge, quêtes, « Préparer aux Ateliers », Terrain) arrivent au bon onglet. L'ancien nom « village » mène à Bâtiments.

## Bâtiments
Grandes vignettes, avec :
- l'illustration en 84 px ;
- le niveau en pastille en haut à gauche ;
- un ruban vert « Construire » ou bleu « Chantier » ;
- la condition écrite sur les bâtiments verrouillés.

## Production
- **Six vignettes illustrées** (l'image du bâtiment), chacune avec :
  - la jauge du stock local ;
  - le stock à l'Entrepôt et le nombre de zones.
- **Ruban d'état** :
  - « Plein » en rouge quand le bâtiment ET l'Entrepôt sont pleins ;
  - « Récolter » en vert quand seul le stock local attend ;
  - « ↑ zone » quand une zone est améliorable.
- **Toucher un bâtiment ouvre sa feuille** (elle remplace l'ancienne sous-page de détail) :
  - la récolte, avec la jauge, le stock à l'Entrepôt et le bouton bleu « Récolter » ;
  - un avertissement si l'Entrepôt est plein de cette ressource ;
  - un rail **Ateliers · N | Zones · a/9**. L'onglet Ateliers est ouvert par défaut et montre seulement les ateliers de ce bâtiment. L'onglet Zones reprend la grille 3×3 et les actions groupées d'avant.
- En format tablette / PC, trois colonnes de vignettes.

## Ateliers et Entrepôt
- L'onglet Ateliers reprend la vue agrégée actuelle, avec ses cartes. VUI-2 les passera en vignettes.
- L'onglet Entrepôt est inchangé pour l'instant. VUI-3 apportera les tuiles T3, la liste déroulante et « Ma sélection ».

## Technique
- `village-view.js` :
  - `activeVillageSubTab` vaut `buildings | production | shops | entrepot` ;
  - nouvelles fonctions `onVillageTabEnter` (appelée par `switchTab`) et `getVillageSubTabBadges`.
- `production-view.js` :
  - la feuille est rendue dans `#village-modal-root`, hors du panneau, avec les fonctions `buildProductionSheetHTML`, `renderProductionSheet`, `refreshProductionSheet`, `refreshProductionSheetDOM`, `setProductionSheetTab` et `getWorkshopsOfBuilding` ;
  - `buildBuildingDetailHTML` et `buildProductionSwitchHTML` sont retirés ;
  - `setProductionViewTab` et `openProductionBuildingDetail` gardent leur nom pour les anciens appelants.
- `production-system.js` (non protégé) : le tick `updateDOM` tient aussi à jour la jauge de la feuille.
- `village-building-view.js` : ouvrir la fiche d'un bâtiment du village referme la feuille de production. Les deux partagent `#village-modal-root`.
- CSS :
  - `04-panel-village.css` et `04-panel-production.css` : vignettes, rubans et feuille ;
  - `99-icon-assets.css` : icône de bâtiment en 84 px ;
  - `09-wide.css` : trois colonnes.
- `tools/css-palette.py` relancé. Quelques jetons ont changé de nom à valeur égale (par exemple `--c-cream-150` est devenu `--c-cream-150-3`), d'où des retouches dans d'autres feuilles de style. **Rien ne change à l'écran.**
- Textes : 10 nouveaux, traduits en anglais ; 7 orphelins retirés de `en.js`.
- `sim/design-audit.js` : écran « batiment » corrigé (il ouvrait la Ferme comme un bâtiment du village), nouvel écran « ateliers ». `sim/i18n-pseudo-scan.js` : nom d'onglet à jour.

## Fichiers protégés
Aucun.

## Harnais
- La section [UX-PROD] est réécrite pour le rail et la feuille (plus de sous-page de détail ni de bandeau titré).
- Nouvelle section **[186]** : ouverture sur Production, anciens noms d'onglets, rail en haut, six vignettes, rubans Plein / Récolter, pastilles, feuille (ateliers du bâtiment seulement, ids propres, onglet Zones), fermeture au changement d'onglet.
- Résultats : round **3 660 OK** (deux passages), boot 4, création 44, parcours 139, campagne 38, i18n **100 % (3 678 textes, 0 orphelin)**.

## À tester en jeu
- Ouvrir le Village depuis la barre du bas : tu arrives sur Production.
- Toucher une vignette :
  - récolter ;
  - passer d'Ateliers à Zones, puis améliorer ou défricher une zone (la feuille reste ouverte et se met à jour) ;
  - fermer la feuille par la croix ou par le voile.
- Le fil rouge et « Préparer aux Ateliers » (Petite Aventure sans ration) arrivent au bon onglet.
- Les pastilles du rail.
- Le format tablette / PC : les trois colonnes.
