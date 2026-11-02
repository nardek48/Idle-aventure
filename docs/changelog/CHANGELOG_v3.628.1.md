# v3.628.1 — Le détail de l'équipement reste visible

Retour de Seb (capture iPhone) : dans Héros › Équipement › Équipé, le détail de la pièce choisie était tout en bas de la page, sous les panoplies ; il fallait défiler pour le voir.

- **Cause** : l'habillage des cartes (v3.618.0) pose `position: relative` sur toutes les cartes à cadre secondaire, dont `.hs-edetail`. Sa règle passait devant `position: sticky` (le panneau collé en bas, comme les Talents, depuis v3.426.2).
- **Correctif** (`css/00-cartes.css`) : `.hs-edetail:not(#kc-sticky) { position: sticky; }`. Le cadre reste (un élément sticky est positionné : son cadre en pseudo-élément tient).
- Relevé de toutes les cartes habillées : c'était la seule qui avait son propre positionnement.
- Vérifié dans Chromium (390 × 844 et 1440 × 900) : le panneau colle au bas de la zone de défilement.
- Harnais [423] : contrôle ajouté.
