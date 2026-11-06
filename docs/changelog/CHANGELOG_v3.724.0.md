# v3.724.0 — Petites Aventures : parcours de la Forêt (06/11/2026)

Conception `systemes/petites-aventures/Aethervale_Conception_Parcours_PA_v0_2.md`, lots 2 (code de la Forêt) et 3 (banc). Décisions de Seb du 06/11 (PP-Q1 b, Q2 b, Q3 a, Q4 a, Q5 a) et choix de l'atelier `aventure-parcours.html`.

## Ajouté (foret_1 et foret_2)
- **A, le carnier** (accroche « chasseur », branches ration ou mains) : annoncé par une fiche à la halte. Cache sur une case non jouée voisine du chemin, 2 pas au plus ; retour en trace claire qui coule ; un loup sans or au premier pas du retour ; cases revisitées vides, camp non refait ; une cache par run (8 G × anneau, 50 % de chance d'un rare).
- **B, le verrou** (accroche « gouffre ») : la passerelle sur foret_1 (clé : crochet), la rive sur foret_2 (clé : gaffe). Fiche Ouvrir / Forcer / Rebrousser ; Forcer passe toujours (de justesse −10 Souffle, raté : une blessure et les dégâts de l'acte). Clé dans une poche de quête hors besace.
- **C, passages secrets** : fouille automatique et gratuite à l'arrivée (base 6), montrée seulement réussie ou de justesse ; après un indice, « ? » et « Chercher encore » (10 Souffle, avantage, une fois). Torche et Lanterne donnent l'avantage. Points bleu pâle. foret_1 : L4>L6, R6>R8 ; foret_2 : L7>W10, R4>R6 (coordonnées relevées au pixel).
- **D, fin imposée** (accroche « feu ») : seul le Tertre reste ouvert, les autres fins sont effacées ; annoncée sur « Prêt à partir » et au HUD.
- **D, fin cachée** (accroche « pierre », branche « main ») : la Pierre, révélée par son passage ; 16 G et +1 Sève.
- Anciens runs sauvegardés : se jouent sans quête.

## Banc (Forêt, 100 runs par cellule)
| | KO | Or par run |
|---|---|---|
| Sentier, avant / après | 3 % / 2 % | 210 / 213 |
| Périple, avant / après | 17 % / 15 % | 370 / 389 |
Fouille sans torche (base 6) : Chevalier ~43 %, Rôdeur ~81 %, Mage ~54 % au Sentier. À juger en jeu : le carnier est pris dans 97 % des annonces au robot (cible 60-70 %).

## À signaler
- 7 icônes à dessiner (icône générique en attendant) : `scene/quest/quest_cache`, `quest_lock`, `quest_hint`, `quest_secret`, `quest_crochet`, `quest_gaffe`, `scene/dest/dest_forest_cachee`.
- Le coffre dessiné du carnier ressemble à l'icône de la Trouvaille (`node_discovery.webp`) : à distinguer.
- Reste : variante foret_2b (camp en détour), Désert, Ruines, Crypte, Montagne, Tour ; tutoriel non mis à jour.

## Contrôles
round-harness 6 742 OK, 0 échec (2 passes), dont la section [485] (57 contrôles) ; boot ; création du héros ; i18n 0 manquant, 0 orphelin ; parcours 235 OK.
