# v3.726.0 — Petites Aventures : parcours de la Crypte et de la Montagne (06/11/2026)

Suite de l'extension des parcours (v3.724.0 Forêt, v3.725.0 Désert et Ruines), mêmes mécanismes et formats.

## Ajouté
| Accroche | Mécanique |
|---|---|
| garçon (branche « réveiller ») | A, la boîte à mèches, annoncée à la salle aux lampes ; au retour, un spectre se lève (×0,6, sans or) |
| lampe (« porter ») | D cachée, la niche aux lampes ; la lampe portée donne l'avantage à la fouille |
| cloche | D imposée, la chapelle de l'ouest |
| pioche (« laisser ») | A, la veine de la pioche : un retour vers la lave |
| forme | D imposée, la source chaude |
- Passages secrets relevés au pixel : crypte_1 « Le caveau du milieu », « L'allée des gisants » ; crypte_2 « L'escalier de la tour », « La rampe de la grotte » ; montagne_1 « La sente de la coulée », « La croûte froide » ; montagne_2 « La vire de basalte », « La crête fumante ». Fin cachée `NICHE` sur les deux cartes de la Crypte.
- **Crypte** : rien n'y modifie le tracé pendant un run ; une case revisitée reste vide, un seul gisant se lève au premier pas du retour et suit l'état du secteur (réveil, « Le réveil » du jour).
- **Montagne** : la lave attend pendant le détour du trésor (`lavaWaits`), brûlures annoncées sur la fiche ; la lave suit les passages secrets (sauter une rangée la fait monter d'autant) ; gratter le trésor ne compte pas comme tailler une veine.
- La Montagne n'a que deux accroches : pas encore de verrou ni de fin cachée.

## Banc (100 runs par cellule, sans quêtes → avec quêtes)
| | KO | Or/min |
|---|---|---|
| Crypte Sentier | 11 → 11 % | +2 % |
| Crypte Périple | 24 → 26 % | +21 % |
| Montagne Sentier | 1 → 1 % | +16 % |
| Montagne Périple | 2 → 3 % | +14 % |
Retour vers la lave : coût annoncé = coût dépensé (28 Souffle au Sentier, 25 au Périple), aucun KO pendant le détour. Deux passes de réglage (spectre au lieu du gisant, chapelle imposée au lieu de la rotonde, passages qui gardent la salle aux lampes). Option mesurée non appliquée : `cacheGold` 4 au lieu de 8 ramènerait la Montagne à +7/+8 %.

## À signaler
- Icône absente : `scene/dest/dest_crypt_cachee`.
- Image : sur crypte_1, la niche est posée sur un petit mausolée qui ressemble à la chapelle de l'ouest.

## Contrôles
round-harness 6 843 OK, 0 échec (2 passes), dont la section [487] (52 contrôles) ; boot ; création du héros ; i18n 0 manquant, 0 orphelin ; parcours 235 OK.
