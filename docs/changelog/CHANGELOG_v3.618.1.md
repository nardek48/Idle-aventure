# v3.618.1 — Encres lisibles dans les cartes habillées

Option A de Seb : foncer les encres trop claires seulement à l'intérieur des cartes en parchemin (lot 2), sans toucher les fonds sombres.

## Changements
- `css/00-cartes.css` : dans les cartes habillées, la couleur du texte change sélecteur par sélecteur (52 règles du jeu relevées automatiquement), vers des teintes déjà présentes dans la palette :
  - vert des gains (`--c-green-650-vivid` #16a34a, 5 règles) → `--nb-green-text` #1a642f : 2,1 → 4,7:1 près du cadre ;
  - `--c-brown-650` #7a6444 (3 règles) → `--c-brown-750-soft` #5a4630 ;
  - or des récompenses (`--c-brown-700-vivid` #8a5c14, 44 règles) → `--c-brown-750-3` #7a4e12 : 3,8 → ≥ 4,6:1 ;
  - `--nb-ink-dim` (brun à 72 % sur les fiches et le journal) → `--c-brown-750-soft`.
- Les jetons de la palette ne sont pas redéfinis (règle du harnais [182]) et aucune couleur n'est ajoutée en clair.
- Hors des cartes, les couleurs d'origine restent : vérifié dans Chromium (Boutique, Hauts faits, Camp, Taverne : aucune encre d'origine dans une carte).
- Quoi de neuf : une ligne (FR + EN).

## Contrôles
- Harnais, parcours P1–P14, boot, création du héros, i18n.
