# v3.616.3 — Nouveau fond de parchemin des fiches

Texture crème générée par Seb (option A de l'atelier « Parchemin et cadre »).

## Changements
- `images/UI/frames/parchment-cream.webp` (nouvelle image) : texture rendue raccordable (fondu croisé des bords), 512 px, 18 Ko (l'ancienne `parchment-tile.webp` faisait 44 Ko ; elle n'est plus utilisée).
- `css/00-tokens.css` (`--sheet-body-bg`) et `css/10-grand-ecran.css` (cartes du grand écran) : branchés sur la nouvelle texture, même voile crème.
- Quoi de neuf : une ligne (FR + EN).
- Atelier `atelier/parchemin-cadre.html` : texture et cadre orné sur les cartes des écrans (option B), en cours.

## Contrôles
- Fiche de la Halle vérifiée sous Chromium (390 px) : texture chargée, aucune erreur réseau.
- Contrastes des encres sur la texture avec le voile : 4,5 à 11,6.
- Harnais 5 822 OK, 0 échec (2 passes) ; boot, création du héros, i18n 100 %, parcours.
- Pas de nouveau JS/CSS : `sw.js` ne change que de version.
