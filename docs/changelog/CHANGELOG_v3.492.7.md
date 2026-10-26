# v3.492.7 — Montagne : les trois cartes

Seb a fourni les deux cartes de Petite Aventure et la carte vivante de la Montagne. Toutes correspondent à leur prompt. Les places, jusqu'ici copiées de la Crypte, sont relevées sur les nouvelles images. Aucun fichier JS ou CSS n'est ajouté.

## Images
| Image | Chemin | Format |
| --- | --- | --- |
| Les pentes de cendre | `Maps/pa2/montagne_1.webp` | 848 × 1264 (fournie en 1028 × 1530, même rapport) |
| Le champ de basalte | `Maps/pa2/montagne_2.webp` | 848 × 1264 (fournie en 1028 × 1530) |
| Carte vivante | `Maps/montagne.webp` | 1254 × 1254 |

## Petites Aventures (`data/pa2-maps.js`)
Le tracé logique ne change pas (celui des Ruines et de la Crypte, 5 rencontres jouées). Seules les places bougent, posées sur les replats peints :
- **Départ** : la tente de Sarkel (carte 1), le haut de l'escalier (carte 2).
- **Camp** : l'abri sous la roche (carte 1), le creux entre les colonnes (carte 2).
- **Seuil** : l'arche du haut, à un tiers de la carte. Chaque carte a une deuxième arche plus bas : elle reste un décor, et une rencontre s'y pose.
- **Destinations** : la source chaude à gauche (fin sans combat), le golem sur son coffre au centre (gardien), la paroi à la fente à droite (coffre scellé).
- **Espacement** : au moins 150 px de carte entre deux places, pour que les pastilles (environ 145 px de carte à 390 px d'écran) ne se chevauchent pas.

## Carte vivante (`data/living-maps.js`)
Les 11 secteurs, le Replat et le Marché sont recalés sur l'image. Le Marché passe à droite du Replat, où est peint l'étal.

| Secteur | Avant | Après |
| --- | --- | --- |
| La pente grise | 50, 60 | 47, 62 |
| Les deux ruisseaux | 22, 72 | 18, 70 |
| La paroi noire | 78, 70 | 80, 76 |
| L'éboulis chaud | 14, 48 | 15, 44 |
| Le nid | 36, 40 | 39, 38 |
| Le champ de basalte | 62, 44 | 64, 48 |
| Les fumerolles | 86, 46 | 88, 45 |
| La coulée morte | 20, 22 | 16, 16 |
| La forge froide | 46, 16 | 46, 15 |
| Le lac de lave | 70, 20 | 67, 17 |
| L'entrée de l'Antre | 88, 10 | 87, 19 |
| Le Replat | 50, 86 | 47, 86 |
| Le Marché | 37, 86 | 58, 86 |

## Suivi
- **Images à faire** : les 3 cartes y sont cochées « faites ». Il en reste 20 pour la Montagne : le fond `montagne_sommet`, les 6 Mémoires 17 à 19, 3 effets d'Histoire, les 10 hauts faits.

## Contrôles
- `node --check` sur les JS modifiés.
- Round-harness : 5035 OK, 0 échec, sur 2 passes. Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- Chromium à 390 et 320 px, sans erreur de console : la carte vivante et les deux cartes de Petite Aventure.
