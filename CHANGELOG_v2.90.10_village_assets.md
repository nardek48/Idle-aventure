# CHANGELOG — v2.90.10 (Village — nouveaux visuels fond + bâtiment)

## Résumé
Intégration des nouveaux assets fournis par l'utilisateur : 6 fonds
de scène (sol/chemin, un par bâtiment) + 6 illustrations de bâtiments
détourées (PNG avec transparence), posées en superposition sur
chaque carte de la grille Village.

## Correspondance utilisée
D'après le nommage fourni (position dans la grille 2×3 actuelle) :

| ID interne   | Fond fourni       | Bâtiment fourni    |
|---------------|-------------------|---------------------|
| watchtower    | haut gauche.png   | hotel de ville.png  |
| barracks      | haut droite.png   | caserne.png         |
| essenceWell   | milieu gauche.png | alchimiste.png      |
| sanctuary     | milieu droite.png | forges.png          |
| timeRelay     | bas gauche.png    | tourmage.png        |
| goldMine      | bas droite.png    | mine.png            |

## Fichiers images (nouveaux, dans images/Village/)
- `bg_<id>.jpg` (6 fichiers) : fonds convertis en JPG (RGB opaque à
  la source, pas besoin de transparence) — 768×900~929 selon le
  fichier, qualité 87. Remplace le fond parchemin uni qu'il y avait
  derrière chaque bâtiment.
- `<id>.png` (6 fichiers) : bâtiments détourés, gardés en PNG
  (transparence nécessaire). Remplacent les anciennes découpes
  `.jpg` (retirées) issues de la toute première image fournie.

## Fichiers modifiés

### `js/ui/village-view.js`
- `VILLAGE_BUILDING_MAP` : chaque entrée a maintenant `bg` (fond) EN
  PLUS de `image` (bâtiment), au lieu d'une seule image plate.
- `buildVillageHTML()` : chaque carte affiche désormais 2 balises
  `<img>` superposées (`.village-building-bg` en dessous,
  `.village-building-sprite` au-dessus) au lieu d'une seule.

### `css/04-panel-village.css`
- `.village-building-image` : ratio changé de `4/3` (paysage) à
  `5/6` (portrait) — les nouveaux visuels sont tous plus hauts que
  larges, contrairement à l'ancienne découpe unique.
- `.village-building-bg` (nouveau) : remplit toute la case
  (`object-fit: cover`), absorbe les petites variations de ratio
  entre les 6 fonds (900 à 929px de haut) sans bande vide.
- `.village-building-sprite` (nouveau) : bâtiment centré
  horizontalement, ancré vers le bas de la case (comme posé sur le
  sol), `object-fit: contain` pour ne jamais déformer l'illustration
  quel que soit son ratio d'origine (varie d'un bâtiment à l'autre),
  + `drop-shadow` pour l'ancrage visuel sur le fond.

### `sw.js`
`CACHE_VERSION` incrémenté à `"2.90.10"`.

## Tests effectués
- `node --check` : OK.
- Équilibrage des accolades CSS : OK.
- Harnais Node.js (vrais fichiers) : les 12 fichiers image (6 fonds +
  6 bâtiments) référencés par `VILLAGE_BUILDING_MAP` existent tous
  réellement sur disque et apparaissent bien dans le HTML généré.
- Rendu réel (Playwright, 390px) : capture de la grille complète
  (fond + bâtiment superposés sur les 6 cartes) et de la popup de
  détail d'un bâtiment (Mine d'Or) — aucune régression, tout
  fonctionne comme avant, seul le visuel des cartes change.
