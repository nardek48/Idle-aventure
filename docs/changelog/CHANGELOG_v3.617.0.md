# v3.617.0 — Habillage des cartes, lot 1 : fondations

Atelier « Cartes E » validé par Seb (02/11) : cadre secondaire pour l'interface, parchemin déchiré pour les documents de l'histoire, texture crème partout. Ce lot pose les fondations ; aucune carte ne change encore d'habillage.

## Fichiers ajoutés
- `css/00-cartes.css` (NOUVEAU) : classes `.kc-tex` (texture), `.kc-sec` (cadre secondaire), `.kc-doc` et `.kc-doc.kc-petit` (parchemin déchiré). Ajouté à `index.html` et au précache de `sw.js`.
- `images/UI/frames/kc-secondaire.webp` (600 × 677, 87 Ko) : cadre secondaire de Seb, voile blanc intérieur retiré.
- `images/UI/frames/kc-dechire-masque.webp` (768 × 503, 10 Ko) : silhouette du parchemin déchiré (découpe).
- `images/UI/frames/kc-dechire-bord.webp` (768 × 503, 63 Ko) : bord déchiré de Seb, halo et tache blanche retirés.

## Changements
- `css/00-tokens.css` : trois encres légèrement plus foncées pour rester lisibles sur la texture et près des cadres (≥ 4,6:1 mesuré) : `--nb-gold-deep` #7c5114 → #784e13, `--nb-green-text` #1e7236 → #1a642f, `--nb-ink-dim` #6b5d45 → #635640.
- Quoi de neuf : une ligne (FR + EN).
- Ateliers : `atelier/parchemin-cadre.html` (exploration) et `atelier/cartes-final.html` (règles, 15 écrans, lots).

## Décisions de Seb (02/11)
- Habillage E. La Chronique (PC) sera traitée comme un document. L'en-tête de la Taverne sera corrigé au lot 3. Firefox (pas de découpe déchirée) accepté.

## Contrôles
- Classes lues par Chromium, images servies (200), encres appliquées.
- Captures avant/après (Quêtes, Taverne) : seuls les textes changent, écart de 2 à 6 niveaux.
- Harnais 5 822 OK, 0 échec (2 passes) ; boot, création du héros, i18n 100 %, icônes, parcours 142 OK.

## À reprendre au lot 2
- Plusieurs textes des cartes n'utilisent pas ces jetons (vert des gains `--c-green-650-vivid` #16a34a, sous-titres à 72 % d'opacité…) : à mesurer sur la texture.
