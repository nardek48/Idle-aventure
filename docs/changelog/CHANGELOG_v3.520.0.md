# v3.520.0 — Fiches de ressources et coûts (audit, lot 5)

Audit du 27/10, lot 5 : RES-3, ERG-5.1, RES-9. Le diff a été relu sous trois angles, et chaque constat est passé par une vérification adverse. Les 9 défauts confirmés sont corrigés ici. Aucun fichier protégé.

## Ce qui change en jeu
- **La fiche dit où part une ressource (RES-3)**. « Où ça part » lit les données au lieu d'une liste écrite à la main :
  - les rangs des capacités du héros et ceux des compagnons ;
  - les vivres pour rejouer un donjon ou une élite, avec le monde, plus le mode libre des donjons pour la Ration moyenne ;
  - les départs d'expédition et le Labyrinthe, seulement dans les mondes atteints, le plus récent d'abord. Une traversée compte dans le monde qu'elle quitte. Au-delà de quatre départs : « A, B, C et 4 autres » ;
  - la besace des Petites Aventures et les objets de combat.
  - Avec tous les mondes atteints, plus aucune ressource n'affiche « Rien pour l'instant ».
- **D'où ça vient** : « Patrouilles des compagnons » pour ce que rapportent les secteurs libérés.
- La ligne du bas devient « Ne se vend pas. », puisque les usages sont listés plus haut.
- **Écran de départ refusé d'une expédition (ERG-5.1)** : l'icône de la ressource manquante et chaque ingrédient manquant se touchent et ouvrent leur fiche de l'Entrepôt. La fiche affiche « ‹ Expédition » pour revenir.
  - Depuis la fiche, une ligne d'atelier ou de bâtiment ouvre sa feuille par-dessus l'expédition. En la fermant, on retrouve l'écran de refus.
- **Rangée de zones trop chère pour l'Entrepôt (RES-9)** : quand le coût dépasse le plafond, le refus et la ligne sous les boutons l'expliquent. Exemple : « Il faut 664 Bois, mais l'Entrepôt n'en garde que 500. Monte l'Entrepôt, ou défriche zone par zone. »
  - Un stock au-dessus du plafond, après un remboursement, n'est pas bloqué s'il couvre le coût.

## Correctifs de la revue
- La zone touchable se limite à l'icône, avec un contour rouge lisible.
- La liste des départs se limite aux mondes atteints, se trie et se raccourcit (« et {n} autres », pluriel déclaré).
- Les patrouilles ne citent que les secteurs des cartes atteintes.
- Les lignes d'usage passent par `renderIconOrEmojiHTML` : une icône manquante affiche l'icône générique.
- Le texte du plafond est fait de deux phrases entières, pour la traduction.
- Une feuille d'atelier, de bâtiment ou de l'Entrepôt ouverte hors du Village se redessine (`ui-root.js`).
- Le blocage du plafond tient compte du stock, comme vu plus haut.
- Anglais : « run preparation », selon le glossaire.

## Mesures (Chromium, 320 px, sauvegardes réelles)
- Écran de refus : icône touchable de 72 × 72 px, contour `rgb(138, 47, 32)`.
- Parcours vérifié : refus → fiche de la Petite ration (« ‹ Expédition ») → Cuisine de camp → fermeture → retour au refus. La feuille tient après 2,5 s et après un rendu complet. 0 erreur de page.
- Champs, 3e rangée : « Il faut 664 Bois, mais l'Entrepôt n'en garde que 500… »

## Code
- `ui/warehouse-view.js` : `getWarehouseOtherUses`, « D'où ça vient », retour « Expédition ».
- `ui/scene-view.js`, `css/04-panel-scene.css` : coûts touchables.
- `systems/production-plots-system.js` : `overCap` et `overCapReason`, testés dans `unlockRow` et `upgradeRow`. `ui/production-view.js`, `css/04-panel-production.css` : la ligne d'explication.
- `ui/ui-root.js` : redessin des feuilles hors du Village.
- `en.js` : 11 clés ajoutées, 1 renommée.
- Harnais [341].
- Aucun fichier ajouté.

## À signaler à Seb
- **Images** : la ligne des patrouilles prend `quests/mission_exploration.webp`, l'icône des patrouilles partout ailleurs, et non `camp/campfire.webp`, qui sert déjà au campement. La ligne d'un objet de combat prend l'icône propre de l'objet. Aucun chemin n'ouvre encore la fiche d'un objet de combat, donc cette ligne ne s'affiche pas pour l'instant.
- **Défaut ancien, non corrigé** : un atelier dont le bâtiment est verrouillé n'apparaît pas dans « D'où ça vient ». Avant la Chasse, la fiche de la Petite ration dit « Butin : expéditions… », alors que sa description cite la Cuisine de camp.

## Contrôles
- Round : 5 299 OK, 0 échec, sur deux passes.
- Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- i18n : 6 581 textes, 100 %, 0 orphelin.
