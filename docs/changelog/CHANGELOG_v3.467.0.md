# v3.467.0 — Petites Aventures : les pièges

Lot 2 du chantier Pièges (conception `systemes/petites-aventures/Aethervale_Conception_Pieges_PA_v0_1.md`, décisions PG-A à PG-G). L'atelier `atelier/pieges-pa.html` a été validé par Seb, avec Désamorcer sans Souffle.

## Ce qui change en jeu
- **Pièges sur les sentiers.** Au départ, des pièges sont posés au milieu de certains sentiers :
  - le nombre suit l'anneau de la carte vivante : 1 par acte sur le Sentier, 2 sur le Chemin, 3 sur le Périple ;
  - un point garde toujours une sortie sans piège, et un sentier unique (vers le camp, le seuil) n'est jamais piégé ;
  - aux Ruines, aucun piège ne part d'un point dont un mur bouge ;
  - les parcours (quêtes, étapes d'Histoire) n'en ont jamais.
- **On les voit venir.** Un losange rouge, avec l'icône de l'effet, marque le sentier piégé dès qu'il est dans la vue. Plus loin, le sentier piégé est tracé en pâle. À la Crypte, dans le noir, un piège ne se voit qu'à la Lanterne allumée ou une fois qu'on a marché dessus.
- **Sur le piège**, le héros s'arrête au milieu du sentier :
  - **Désamorcer** : dé de précision, sans Souffle. De justesse : −10 Souffle. Raté : l'effet joue.
  - **Trousse de crocheteur** : désamorcé à coup sûr.
  - **Subir** : pas de dé, l'effet joue.
  - **Rebrousser** : retour au point d'avant pour 10 Souffle ; le piège reste.
- **Cinq effets qui durent** (à partir du pas suivant) :
  - **Venin** : −4 % des PV par pas, 3 pas ; une ration, un repas au feu ou un autel le lèvent. Il peut achever le héros.
  - **Alarme** : le prochain combat a un ennemi de plus, et Ruser y est impossible.
  - **Entrave** : +6 Souffle par pas, 3 pas ; le repos au camp ou au seuil la lève.
  - **Aveuglé** : une rangée de vue en moins (au moins 1), 3 pas ; une torche ou la Lanterne allumée l'annulent.
  - **Besace percée** : un objet de la besace perdu au hasard.
- Les effets en cours s'affichent en pastilles rouges dans l'en-tête (« Entrave 2 », « Alarme »).
- **Vingt pièges**, un par effet et par monde, avec les textes validés le 23/10. Le caractère du monde pèse double : Venin et Entrave en Forêt, Aveuglé et Entrave au Désert, Alarme et Besace percée aux Ruines, Alarme et Aveuglé à la Crypte.
- **Trousse de crocheteur** dans la besace : gratuite, 1 place, 2 crochets. La Corde ne sert plus qu'aux obstacles (sa description le dit).
- Légende de la carte : une ligne « Piège ».

## Mesures (banc `pa2-bench`, 150 runs par cellule, 3 classes)
| Cas | KO | Or par run | Pièges rencontrés |
| --- | --- | --- | --- |
| Forêt, Sentier, sans pièges | 5 % | 178 | — |
| Forêt, Sentier, joueur prudent (contourne) | 5 % | 183 | 0 |
| Forêt, Sentier, droit devant | 4 % | 180 | 0,67 |
| Forêt, Périple, sans pièges | 30 % | 248 | — |
| Forêt, Périple, joueur prudent | 34 % | 237 | 0 |
| Forêt, Périple, droit devant | 32 % | 240 | 1,54 |
| Crypte, Sentier, sans pièges | 8 % | 1 309 | — |
| Crypte, Sentier | 9 % | 1 255 | 0,50 |
| Crypte, Périple, sans pièges | 22 % | 2 087 | — |
| Crypte, Périple | 26 % | 2 026 | 1,53 |

À lire :
- dans un monde éclairé, un joueur prudent contourne tous les pièges : le piège coûte surtout un détour ;
- à la Crypte, il pèse vraiment : +4 points de KO au Périple ;
- les écarts de KO en Forêt (±4 points) sont du bruit à 150 runs.

## Code
- `data/pa2-content.js` : `PA2_TRAP_RULES`, `PA2_TRAP_FX`, `PA2_TRAP_WEIGHTS`, `PA2_TRAPS`, la Trousse ; la Crypte a `trapsHidden`.
- `systems/pa2-run.js` :
  - nouveau statut `pa2-trap` ;
  - `_placeTraps`, `isTrapShown`, `trapOptions`, `resolveTrap`, `trapContinue`, `_tickFx` ;
  - `moveTo` s'arrête sur le piège, et le pas passe dans `_step` ;
  - l'Alarme agit dans `_prepareNode`, l'Aveuglé dans `isVisible`, et le Venin et l'Entrave sont levés par les rations, l'autel et le camp.
- `ui/pa2-view.js` : losanges sur la carte, fiche du piège, pastilles d'effets, Ruser bloqué par l'Alarme, animation jusqu'au milieu du sentier et reprise.
- `css/04-panel-pa2.css` : `.pa2-trap`, `.pa2-chip.is-fx`, `.pa2-fxline`, `.pa2-medal.is-trap`, `.pa2-echo.is-red`.
- `lang/en.js` (81 textes, et celui de la Corde réécrit) et `lang/data-fields.js` (registre des pièges).
- État du run dans `game.sceneRun` (`traps`, `fx`, `trap`), déjà sauvegardé : rien à câbler dans `save-system.js`. Un run commencé avant la mise à jour n'a pas de pièges.
- Aucun fichier protégé, aucun fichier ajouté.

## Images à faire (icône générique en attendant)
- `images/Icons/scene/traps/fx_venom.webp`, `fx_alarm.webp`, `fx_snare.webp`, `fx_blind.webp`, `fx_torn_bag.webp` (servent aussi au losange de la carte) ;
- `images/Icons/scene/items/item_lockpicks.webp` (Trousse de crocheteur).

## Outils
- `round-harness.js` :
  - section [281] (34 contrôles : pose, sortie libre, Ruines, arrêt, quatre choix, cinq effets, Crypte, écran) ;
  - les contrôles historiques des Petites Aventures tournent sans pièges (`g.__traps`) ;
  - les runs au hasard [158], [163], [164] les traversent.
- `parcours-harness.js` : P7 et `drivePa2` ne touchent un sentier que sur la carte (après un piège, la feuille du nœud est déjà ouverte).
- `pa2-bench.js` : `--sans-pieges`, `--droit-devant`, ligne « pièges » dans `--resume`. Le robot contourne, prend la trousse, sinon désamorce.
- `campagne-harness.js` : même politique de pièges ; Ruser évité sous Alarme.

## Contrôles
- Chromium, 390 et 320 px, vrai jeu : losanges sur la carte, arrêt au milieu du sentier, fiche à quatre choix, « Subi » puis pastille « Entrave 3 », reprise jusqu'au point, rien ne déborde.
- i18n 100 %, aucun orphelin ; `missing-icons.js` : les 6 images ci-dessus.
- round-harness 4679 OK, 0 échec (deux passes) ; boot, création du héros, parcours (139) OK.
