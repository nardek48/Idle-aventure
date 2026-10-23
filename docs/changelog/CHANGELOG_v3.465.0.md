# v3.465.0 — Enchanteresse : la transmutation

Chantier « Enchanteresse » (conception v0.1, décisions E-A, E-B, E-C ; atelier `atelier/enchanteresse.html` validé par Seb). L'Enchanteresse ne faisait que relancer des valeurs. Elle offre maintenant un choix de build : changer la stat d'un bonus.

## Ce qui change pour le joueur
- Nouvel onglet **Transmuer** dans la fiche de l'Enchanteresse : Relance · Transmuer · Éclats.
- Chaque bonus d'une pièce portée montre en puces les stats qu'il peut devenir, avec la valeur obtenue.
  - Ce sont les stats de son groupe (combat ou secondaire) qui ne sont ni la stat de base de la pièce, ni sur une autre ligne.
  - Exemple, sur une arme Épique : « +25 % dégâts » peut devenir « +4 % critique » ou « +0,3x dégâts crit ».
- La valeur garde sa place dans la fourchette : un bonus haut reste haut, et un objet « Touché par l'Aether » le reste.
- **Prix** : 2 relances de base (Épique en Crypte : 35 000 or), puis ×1,55 à chaque transmutation de la même ligne. Le Doigté s'applique (−10 % par niveau). Le compteur des relances de la ligne est conservé et reste séparé.
- Toucher une puce demande confirmation, avec le prix.
- Mêmes raretés et mêmes niveaux de bâtiment que la relance. La pièce portée reste gelée pendant une expédition.
- Nouveau texte du bâtiment : « Relance la valeur d'un bonus d'une pièce équipée, ou change sa nature. La pièce ne peut jamais empirer. » ; effet : « Relance et transmute les bonus ».

## Correctif
- Feuille de donjon (v3.464.0) : les flèches ‹ › du niveau avaient une règle de police invalide (`font: … inherit`), ignorée par le navigateur. Elles prennent maintenant la police du jeu.

## Code
- `enchant-system.js` :
  - `getTransmuteOptions`, `getTransmuteCount`, `getTransmuteCost`, `getTransmuteBlockReason`, `transmute` ;
  - `ENCHANT_TRANSMUTE_BASE` = 2 ;
  - le compteur `a.transmutes` vit dans la ligne, donc rien à câbler dans la sauvegarde.
- `village-building-view.js` : `buildTransmuteBoardHTML`, `askTransmuteAffix` (modale de confirmation existante), et l'onglet ajouté au segment.
- `village-buildings.js` : description et effet du bâtiment.
- CSS :
  - `04-panel-village.css` : `.ench-tr-*`, puces de 40 px ;
  - `04-panel-dungeon.css` : correctif des flèches.
- `en.js` : 9 textes.
- Aucun fichier protégé, aucun fichier ajouté.

## Contrôles
- Harnais [279] :
  - choix possibles (ni la base ni une ligne déjà portée), valeur à la même place dans la fourchette ;
  - prix 35 000, puis ×1,55, Doigté −10 % ;
  - relances gardées ;
  - refus sans or, et sur la stat de base ;
  - groupe plein, niveau de bâtiment requis ;
  - onglet et textes.
- Chromium, à 390 et 320 px, Chevalier de fin d'Histoire du robot :
  - rien ne déborde, puces de 40 px ;
  - transmutation confirmée de bout en bout : « +25 % dégâts » → « +4 % critique », 31 500 or payés, fiche rafraîchie.
- i18n 100 % (5445 textes) ; CSS morte : 0.
- round-harness 4643 OK, 0 échec (deux passes) ; boot, création du héros, parcours (139) OK.
