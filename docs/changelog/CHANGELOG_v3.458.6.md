# v3.458.6 — Lot 8b : 20 images inutilisées supprimées (audit O7)

Accord de Seb : tout supprimer. Chaque fichier a été vérifié (chemin, nom, chemins construits par le code pour équipements, vignettes, talents) : aucun n'est cité dans le jeu ni dans les outils, aucun n'était précaché par `sw.js`. 5,7 Mo de moins.

## Supprimés
- `images/Heroes/` : `knight.jpg`, `mage.jpg`, `ranger.jpg`, `ChaosNight.jpg`, `ChaosRanger.jpg`, `ChaosSorcier.jpg` (anciens portraits).
- `images/Heroes/full/silhouette.webp` (les versions `_hood_m` et `_hood_f` restent).
- `images/TitleScreen/` : `bouton_retour.png`, `btn_charger_base.png`, `btn_charger_partie.png`, `btn_nouvelle_partie.png`, `carte_active.png`, `carte_inactive.png`, `title_background.jpg` (le fond `_new.webp` reste).
- `images/UI/` : `buttons/btn-round-back.png`, `buttons/btn-round-back-pressed.png`, `talents/frame_big.webp`, `talents/divider.webp`, `textures/bg-moss-stonesd.png`.
- `images/Village/village_foret.jpg`.

Gardé : `images/Icons/memory/forme_du_roi.png`, pour les icônes de « Ce que tu portes » à venir.

## Contrôles
- `missing-icons.js` : toujours 24 images absentes, les mêmes (aucune nouvelle).
- round-harness 4540 OK, 0 échec (deux passes) ; boot, création du héros OK ; parcours complets 139 OK, 0 échec.
