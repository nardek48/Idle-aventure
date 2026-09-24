# Aethervale v3.338.0 — Refonte des Hauts faits

Base : v3.337.0. Conception « Hauts faits » v1.0, décisions H1 à H11 de Seb (24/09/2026), atelier `atelier-hauts-faits.html` (H-0). Lots H-1, H-2 et H-3 livrés ensemble.

**Aucun fichier JS nouveau** (précache inchangé, sauf `CACHE_VERSION`). `atelier-hauts-faits.html` est l'atelier, hors jeu.

**Fichiers protégés touchés :**
- `combat-engine.js` : **une ligne**, à côté du crochet de boss : `AchievementManager.onEnemyKilled(enemy)` dans `killEnemy`.
- `save-system.js` : `game.achievementStats` aux **quatre points** (écrit ; relu avec filtrage ; conservé à la reprise ; vidé à la réinitialisation complète) + le titre porté lu dans `getSlotSummary` pour la sélection des héros. Plus `state.js` (état initial).
- `stats-system.js` : **pas touché**. `AchievementManager.getTotalBonus()` rend `{}` : l'appel existant n'a plus d'effet.

## Le catalogue (H1, H2, H5) — `data/achievements.js`

| Catégorie | Hauts faits | Paliers |
| --- | --- | --- |
| Forêt | 8 + 2 cachés (Palissade 3, carte libérée, Basilic, élites, Arbre-mère ×10, une expédition jusqu'au bout, Bestiaire du monde, Seigneur de guerre orc ; cachés : récit rare de patrouille, orc sans potion) | Bronze 3 · Argent 6 · Or 8 |
| Désert | 8 + 2 cachés (Djinn, sphinx, carte libérée, élites, Palissade 7, Dard ×10, une expédition, Bestiaire du monde ; cachés : récit rare, secteur ensablé repris) | Idem |
| Grimoire | Première règle, un préréglage, 50 ennemis en Grimoire, un boss en Grimoire sans passer en Tactique, règles déclenchées 100 fois (titre « Tacticien ») | — |
| Village | Bâtiments de la Forêt, Entrepôt 5, zones au plafond, 20 contrats de Taverne, première reforge | — |
| Compagnons | Wenna au maximum, voie de Maddoc, 10 patrouilles, une nuit complète, deux compagnons en patrouille | — |
| Collection | Mémoire 1, 4, 8 · Bestiaire 25, 50, 100 % (titre « Naturaliste ») · premier objet épique, premier légendaire | — |

- **Mêmes identifiants** pour Mémoire, Bestiaire et objets : ce qui était réclamé reste réclamé, sans seconde récompense.
- **Retirés (9)** : kills, critiques, panoplie, donjon. Déjà réclamés → section repliée « Anciens exploits », sans récompense (H9).
- Écart avec la conception : « La Cité engloutie » (15e vague) aurait doublé « Ce que garde le sphinx » (le sphinx **est** le boss de la Cité, et les deux donjons ont 15 vagues) ; remplacé par « Le dard, encore » (Dard des profondeurs ×10), pendant de l'Arbre-mère.
- Icônes des nouveaux : `images/Icons/achivement/<id>.png`, **à générer** (icône générique d'ici là). Textes **provisoires**.

## Récompenses (H3, H4, H7)

- **Plus aucun bonus permanent.** Les bancs ne les ayant jamais comptés, le joueur revient à la cible mesurée ; aucune compensation.
- Une fois, en réclamant : 150 or par haut fait de la Forêt (300 caché), 600 au Désert (1 200 caché), 150 à 600 pour les transversales.
- Paliers : Forêt +100 / +250 essence, puis titre « Gardien d'Aeswyn » + 10 Aether ; Désert +300 / +750, puis « Celui qui marche sur le sable » + 15 Aether. L'Aether va au **porte-monnaie seulement**, pas à `totalAetherEarned` (jauge de Mémoire).
- **Total de l'or ponctuel : 15 600** (Forêt 1 800, Désert 7 200, Grimoire 1 200, Village 1 350, Compagnons 1 500, Collection 2 550), soit ~18 % des ~87 000 or dépensés jusqu'à la fin du Désert (`revente-bench.js`). La conception visait moins de 10 % en ne comptant que les mondes. **À surveiller en jeu** ; si besoin, diviser par deux les transversales.

## Règles

- **Rattrapage** : tout ce qui se lit dans l'état (kills, carte, bâtiments, compagnons, Mémoire…) arrive « à réclamer » à l'ouverture de l'écran. Les compteurs neufs partent de cette version (« compté depuis la mise à jour »).
- **Acquis pour toujours** : atteint une fois = obtenu, même si la condition cesse (carte reprise par le Recouvrement).
- **Réclamation à la main** (H6), un par un ou « Tout réclamer ».
- Les cachés ne comptent pas dans les paliers et s'affichent « ??? » avec un indice.

## L'écran — `ui/achievement-view.js` réécrit (maquette de l'atelier)

- En-tête : compteur « x / 43 obtenus », titre porté (touchable), « Tout réclamer (n) ».
- Onglets en pastilles (monde courant par défaut), pastille rouge sur ceux qui ont à réclamer.
- Barre de paliers pour un monde ; cartes triées : à réclamer, en cours (barre), obtenus (date), cachés.
- Collection : « Anciens exploits » et « Bilan de la partie » (l'ancien bandeau de statistiques) repliés en bas.
- Choix du titre : feuille du bas ; titres pas encore gagnés cadenassés, avec leur provenance.

## Titres et liseré (H4, H8)

- Titre porté : sous le nom dans **Héros › Résumé** et sur la **sélection des héros**. Pas dans le HUD.
- Liseré du palier du **monde courant** (bronze, argent, or) autour du portrait du HUD et du Résumé ; le cadre du Résumé garde la couleur de la classe.

## Fil rouge (H10)

Un haut fait à réclamer apparaît dans « Aussi » seulement, **jamais en premier**.

## Compteurs neufs et crochets

| Compteur | Où |
| --- | --- |
| Ennemis et boss vaincus en Grimoire, orc sans potion | `combat-engine.js` (1 ligne), `combat-view.js` (début de combat, bascule de mode), `potion-system.js` |
| Règles déclenchées | `class-combat-system.js` (`chooseRoundAction`) |
| Expédition menée jusqu'au bout | `scene-run-system.js` |
| Patrouilles, nuit complète, récits rares, deux en même temps | `patrol-system.js` |
| Secteur ensablé repris | `living-map-system.js` (`setState`) |
| Contrats livrés | `tavern-system.js` |

## Contrôles

- `round-harness.js` : **0 échec**, ~3 310 OK ([85] sautée), stable sur 3 passages. Nouvelle section **[133]** (44 vérifications). Deux tests anciens adaptés : la Mémoire est rangée dans Collection (sections [118] et [132]) ; le bilan de partie est replié en bas de Collection, « obtenus » remplace « réclamés » (section [BILAN]).
- `[ENCRE]` : `.hf-top`, `.hf-tiers`, `.hf-card`, `.hf-old-h` enregistrés dans `00-kframe-scope.css`.
- `boot-harness.js` 4 OK, `hero-creation-harness.js` 44 OK.
- Rendu vérifié dans Chromium sur un héros réel : rattrapage (4 à réclamer), « Tout réclamer », feuille des titres, Collection.

## À tester en jeu

- Ouvrir les Hauts faits avec une ancienne sauvegarde de fin de Forêt, puis de fin du Désert : ce qui arrive à réclamer, l'or reçu.
- Le liseré du portrait après un palier ; le titre dans le Résumé et sur la sélection des héros.
- « Sans une gorgée » et « Laisser faire » sur le Seigneur de guerre orc rejoué.
