# v3.458.7 — Lot 8c, premier dossier : icônes d'équipement en WebP (audit O4)

Option 1 de Seb : dossier par dossier, une version à chaque fois, en commençant par `equipment_icon`.

## Ce qui change
- Les 55 icônes d'équipement (11 types × 5 raretés) passent en WebP, ramenées à 256 px au plus (qualité 85, transparence gardée) : 12,7 Mo → 1,0 Mo.
- Taille mesurée avant de réduire : une icône d'équipement s'affiche à 84 px au plus (fiche d'objet), soit 252 pixels réels sur un écran ×3. 256 px suffisent ; comparaison PNG / WebP à l'écran ×3 sans différence visible.
- Chemins : `getEquipmentIconPath` (`equipment-system.js`), les trois icônes de la caravane (`caravan-view.js`), un commentaire CSS.

## Gardé une version
- Les 55 PNG restent dans `images/Icons/equipment_icon/` ; ils seront retirés à la version suivante (règle de livraison 3). Ils n'ont jamais été précachés par `sw.js`.

## Contrôles
- Dans le jeu : `sword_epic.webp` chargée (254 px), pas d'icône générique.
- `missing-icons.js` : toujours 24 images absentes, les mêmes.
- round-harness 4543 OK, 0 échec (deux passes), section [263] (les 55 WebP existent, aucune au-delà de 60 Ko) ; boot, création du héros OK ; parcours complets 139 OK, 0 échec.
