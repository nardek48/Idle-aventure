# v3.621.2 — Correctif iPhone : le centre des parchemins déchirés

Bug signalé par Seb (captures iPhone, 13 h 24) : sur Safari, une bande sombre masquait le milieu de chaque document en parchemin déchiré (prologue, chaînes de quêtes, tableau des missions), texte compris.

## Cause
La découpe déchirée est déclarée deux fois : `-webkit-mask-box-image` (lu par Chrome, qui remplit toujours le centre) et `mask-border` (standard, lu par Safari). Dans la norme, sans le mot-clé `fill`, la tranche centrale du masque est jetée, donc transparente : tout le milieu de la carte disparaît. Les contrôles tournaient sous Chromium, qui ignore `mask-border` : le bug ne s'y voyait pas.

## Changement
- `css/00-cartes.css` : `60 fill` dans les quatre déclarations de masque (classe `.kc-doc` et règle des documents).
- Harnais [416] : contrôle que chaque déclaration de masque garde `fill`.
- Quoi de neuf : une ligne (FR + EN).

## Contrôles
- Chromium : rendu inchangé (capture du prologue), `-webkit-mask-box-image-slice` = `60 fill`.
- Safari : pas de moteur WebKit dans l'environnement de test ; correctif déduit de la norme CSS Masking, à confirmer sur iPhone.
- Harnais, parcours, boot, création du héros, i18n.
