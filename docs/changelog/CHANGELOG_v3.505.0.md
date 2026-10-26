# v3.505.0 — Grand écran, lot GE-5 : combat, Petites aventures et carte vivante dans la fenêtre

Dernier lot de l'option B du compte rendu grand écran (accord de Seb du 26/10, décision D4 « dans la coque »). Format large seulement : **le téléphone ne change pas**.

## Ce qui change sur grand écran
| Avant | Maintenant |
| --- | --- |
| Le combat passait en colonne de téléphone (390 px), bandeau et menu disparus. | Le combat reste dans la fenêtre : bandeau en haut, rail à gauche, **arène de 560 px au centre**, Chronique à droite. |
| La Petite aventure : colonne de téléphone sur le fond du monde. | Sa page s'ouvre au centre de la fenêtre (640 px au plus), entre le rail et la Chronique. |
| La carte vivante : plein écran, avec la barre du bas du téléphone. | Elle remplit la page, avec le rail (on peut changer d'écran) et la Chronique. |
| — | **Chronique de combat** : la règle du Grimoire qui vient de jouer (mode Grimoire), les États du combat (ceux de la feuille « États du combat »), le butin de la sortie, et le journal depuis le début du combat. |

- En combat et en Petite aventure, on ne navigue pas (comme au téléphone) : le rail et le bandeau restent visibles, grisés et inactifs. Les touches 1 à 6 et Espace gardent leurs actions de combat ; les raccourcis de la fenêtre (1 à 5, C) restent coupés.
- **Fond d'arène** : le fond du monde, en hauteur, est net dans la colonne de combat ; sur les côtés, le même fond, flouté. Dès qu'un fond paysage existe (`images/Maps/<monde>-combat-wide.webp`, liste des images à créer), il est pris tout seul pour les côtés, sans flou.
- Le labyrinthe garde son plein écran.

## Mesures (Chromium, partie avancée aux Ruines)
- Combat : arène x 332 → 892 à 1440 × 900, 295 → 855 à 1366 × 768, 334 → 894 à 1180 × 820 (Chronique repliée) ; aucune barre horizontale.
- Petite aventure et carte vivante : page entre le rail (104 px) et la Chronique.
- Téléphone 390 × 844 : combat, Petite aventure et carte vivante aux mêmes positions qu'avant.

## Code
- `css/09-wide.css` : la grille de la fenêtre s'applique aussi au combat, à la Petite aventure et à la carte vivante (`body:not(.lab-run)`).
- `css/10-grand-ecran.css` : section « lot GE-5 » (rail inactif, arène, fond flouté ou paysage, Chronique de combat).
- `js/ui/chronique-view.js` : contenu de combat, test du fond `-wide`.
- `js/ui/combat-screen-view.js` : `buildCbxStatesBodyHTML` (corps des États, partagé feuille et Chronique) ; la dernière règle du Grimoire est gardée.
- `js/lang/en.js` : textes anglais. Aucun fichier ajouté, aucun fichier protégé.

## Contrôles
`round-harness` 5 193 OK, 0 échec (deux passes ; section [330] ajoutée, contrôle [179] mis à jour) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` P11 15 OK.
