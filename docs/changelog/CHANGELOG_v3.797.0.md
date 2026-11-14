# v3.797.0 — Montagne : la case blanche d'Edda (fin cachée) (14/11/2026)

Point 5 des « Signalés » (Seb 14/11 : option B, textes validés). Seconde moitié : la fin cachée. Aucun fichier protégé modifié, aucun changement de sauvegarde, aucun fichier ajouté.

## Accroche « La case blanche d'Edda » (`data/pa2-content.js`)
- 4ᵉ accroche de la Montagne : mini-quête de fin cachée, sur le modèle de la lampe (Crypte) et de la marche en trop (Tour).
- Rencontre « La fumée droite » : *La suivre des yeux* (10 Souffle) lance la quête, *Passer* non.
- Destination cachée « Le foyer taillé » (`PA2_DESTS.mountain.cachee`) : 16 G de base et +1 Sève, comme aux autres mondes.
- **Image à fournir** : `images/Icons/scene/dest/dest_mountain_cachee.webp` (`ui/pa2-view.js`). Le chemin est gardé, l'icône générique s'affiche en attendant.

- Nom choisi par Seb (14/11, option B) : la carte vivante a déjà un secteur « La forge froide » (élite du Vieux golem).

## Cartes (`data/pa2-maps.js`)
- Case `FORGE` (rangée des fins, cachée), relevée au pixel :
  - `montagne_1` : 285, 105, la brèche entre les aiguilles à gauche du trieur ;
  - `montagne_2` : 300, 105, sous la colonne de fumée entre les orgues.
- Passage secret `L6>FORGE` sur les deux pentes : « La sente de la fumée » et « Le couloir de fumée » (`PA2_SECRETS`).

## Banc (Périple, 150 runs × 3 classes, `--montagne --accroche=fumee --resume`)
- KO 6 %, or 7 618, Sève 5,00.
- Fin cachée atteinte dans 64 runs sur 225 où la quête est lancée (28 %). Pour comparaison, la marche en trop de la Tour : 26 sur 158 (16 %).
- Aucun ajustement.

## Contrôles
- `round-harness` 7095 OK, 0 échec, sur 2 passes ([513g]).
- boot 4 OK ; création du héros 46 OK ; parcours complet 236 OK ; i18n 100 %.
- Captures iPhone sur les deux pentes : carte avec le passage, écran du foyer taillé.
- Quoi de neuf : une ligne (FR + EN).
