# v3.725.0 — Petites Aventures : parcours du Désert et des Ruines (06/11/2026)

Extension des parcours de la v3.724.0 (Seb 06/11 : « étendre aux autres mondes »), mêmes mécanismes et formats. Conception : `systemes/petites-aventures/Aethervale_Conception_Parcours_PA_v0_2.md`.

## Ajouté
| Accroche | Mécanique |
|---|---|
| maddoc | B, le pont de l'oued (clé : cheville) |
| caravane | A, le bât enterré (branche « suivre » ; retour gardé par un scarabée sans or) |
| sentinelle | D cachée, la tour de guet (branche « veiller ») |
| bâtisseur | B, l'arche murée (clé : pince) |
| statue | A, les pièces du socle (branche « prendre » ; retour gardé par un squelette) |
| carnet | D imposée, la cour au puits |
- Passages secrets relevés au pixel : desert_1 « La faille » (L4>L6), « La sente du guet » (C8>TOUR), « Le gué de pierres » (R8>TOUR) ; ruines_1 « La voûte de l'ouest » (L4>C6), « La voûte de l'est » (R4>C6) ; ruines_2 « La herse de l'arène » (R1>R3), « Le dessus de l'aqueduc » (R4>R6).
- **Ruines, murs qui bougent** : pendant une quête, un mur ne bascule pas s'il touche une fin écartée, la cible d'un verrou fermé ou le chemin du trésor annoncé ; le chemin du trésor se calcule sur le tracé du moment ; aucun passage secret ne part d'une case dont les murs bougent (`Pa2Run._wallFrozen`).
- Textes du trésor communs à tous les mondes (`quest.text.got`), icône de fin cachée propre à chaque monde.
- Robot de campagne : vise les destinations lues sur la carte et prend la fin cachée en priorité.

## Banc (100 runs par cellule, sans quêtes → avec quêtes)
| | KO | Or/min |
|---|---|---|
| Désert Sentier | 6 → 6 % | 86,8 → 87,3 |
| Désert Périple | 33 → 29 % | 146 → 158 |
| Ruines Sentier | 3 → 0 % | 178 → 182 |
| Ruines Périple | 21 → 18 % | 313 → 336 |
Une passe de réglage : le gué sous le pont du Désert (R6>R8) retiré (+15 % → +6 % d'or au Périple).

## À signaler
- Icônes absentes (générique en attendant) : `scene/quest/quest_cheville`, `quest_pince`, `scene/dest/dest_desert_cachee`.
- À juger en jeu : trésor pris dans 87 à 100 % des annonces par le robot ; fin cachée du Désert peut-être généreuse ; les deux voûtes de ruines_1 contournent toutes deux l'arche.
- Image : sur ruines_2, la case R4 est posée sur la statue renversée, alors que l'accroche « statue » parle d'une statue qui change de place.

## Contrôles
round-harness 6 791 OK, 0 échec (2 passes), dont la section [486] (49 contrôles) ; boot ; création du héros ; i18n 0 manquant, 0 orphelin ; parcours 235 OK.
