# v3.573.0 — Le clavier du prologue, et les images refaites (premier lot)

## Prologue : le clavier ne s'ouvre plus sur la première planche (retour de Seb)
Le champ du nom prenait le focus en ouvrant la création, sous les planches 1 à 4 : sur iPhone, le clavier virtuel montait dès la première image. Désormais aucun champ n'a le focus pendant le prologue ; le champ du nom le prend à la fin des planches (dernier toucher ou « Passer ▸ »), donc le clavier s'ouvre au moment d'entrer le nom.
- `js/ui/prologue-view.js` : focus retiré au lancement, rendu au champ du nom à la fin des planches 1-4.
- `js/ui/modal-view.js` : pas de focus automatique du nom tant que le prologue est affiché.

## Images (lot fourni par Seb, liste « Images à générer »)
- **Pastilles des élites de la carte vivante** : « pièce Rare » (lueur bleue) et « pièce Épique » (lueur violette), `images/Icons/living_map/elite_gain_rare.webp` et `elite_gain_epic.webp` (256 px). Elles remplacent l'icône d'armure empruntée (point ouvert de la passation, réglé). `js/ui/living-map-view.js`.
- **Élites et boss en 1088 px** (au lieu de 400), vignettes 256 refaites : la Liche des sépulcres, le Wyrm de cendres, le Porte-couronne, la Pleureuse, le Golem-forge, l'Ifrit qui trie. Le Golem-forge et l'Ifrit passent d'un découpage sur fond transparent à une scène complète, comme les autres élites.
- **Silhouette du héros** (homme et femme) en 1024 × 1421 (au lieu de 560 × 777) : nette sur Mac Retina ; les emplacements d'équipement tombent toujours sur le corps (vérifié à 390 × 844 et 1440 × 900).
- **Cadenas** en 256 px (au lieu de 128).
- Aucun fichier ajouté au précache : les images passent par le cache d'images (une image refaite s'affiche une fois dans l'ancienne version, puis se met à jour).

## Contrôles
`round-harness` 5 522 OK, 0 échec (deux passes ; contrôles [366] et [367] des pastilles mis à jour, contrôle du clavier ajouté en [379]) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` P1 18 OK, P11 15 OK ; `missing-icons` : aucune image absente.
