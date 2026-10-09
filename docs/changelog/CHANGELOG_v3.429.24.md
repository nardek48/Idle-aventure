# Aethervale v3.429.24 — Bulle « or à investir »

Décision de Seb : option A, bulle dédiée, prototype `atelier/or-a-investir.html`. Point relevé en jouant la troisième heure : plus de 12 000 or en poche au Désert, sans rien qui indique où le dépenser. S'applique sur la v3.429.23.

## La règle
- Une bulle dorée s'ajoute au dock, au-dessus des trois situations, **seulement si une dépense est payable tout de suite** (or et matériaux) et que le héros a au moins 1 000 or.
- Dépenses suivies : chantiers du village, reforges, améliorations de compagnons, entraînement sous le plafond du Terrain. Boutique, potions, enchantement et parcelles gardent leur propre parcours.
- Pas de dépense pendant un chantier en cours. Pas de reforge, de compagnon ni d'entraînement quand le héros est en expédition.
- Une fois ouverte, la bulle se tait. Elle ne revient que pour une **nouvelle** dépense payable : niveau suivant, nouveau plafond du Terrain. Cette mémoire n'est pas sauvegardée : après un rechargement, la bulle peut revenir une fois.

## La fenêtre
- La meilleure dépense en carte, avec son coût (vert : on l'a ; rouge : il en manque). Ordre : Atelier de Construction, Forge, autres bâtiments du moins cher au plus cher, reforge, compagnon, entraînement.
- **Atelier qui ferme la Forge** : s'il ne manque que des matériaux, il passe en tête avec ce qui manque (« Planche : il en manque 8. Production : Scierie fine. »), et le bouton mène au producteur. Il ne fait jamais apparaître la bulle à lui seul.
- « Aussi ouvert » : jusqu'à 4 autres dépenses avec leur prix ; chacune mène à sa fiche (bâtiment, Forge, Héros › Compagnons, Héros › Stats).

## Vérifié dans le jeu (Chromium 430×932, Désert, 12 271 or, 5 planches)
- Bulle affichée ; fenêtre : Atelier niv. 2 (5/13 planches), puis Terrain niv. 6 (320 or) et Wenna niv. 2 (60 or). « Aller produire » ouvre la Scierie fine. Après ouverture, la bulle disparaît.
- Forge simulée niv. 1 : Forge niv. 2 en tête. Sans acier, seule la reforge de l'arme est proposée (or seulement, Histoire) ; avec acier, l'armure aussi.

## Code
- **Fichier ajouté : `js/ui/or-a-investir-view.js`** (dans `index.html` avant `hud-dock-view.js`, et dans le précache de `sw.js`).
- `js/ui/hud-dock-view.js` : la bulle d'or s'ajoute en haut du dock.
- `css/04-panel-evolutions.css` : styles `.oi-*`.
- `js/lang/en.js` : 13 clés.
- Aucun fichier protégé touché. Aucun état persistant ajouté.

## Contrôles
- Round : **3 967 OK**, 0 échec, sur trois passages (4 contrôles ajoutés). Boot : 4 OK. Création du héros : 44 OK. i18n : 4 221 textes, 100 %.
- `node --check` sur les fichiers modifiés.
