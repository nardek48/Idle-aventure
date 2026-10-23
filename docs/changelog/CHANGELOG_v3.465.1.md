# v3.465.1 — Icônes des articles de la boutique d'Éclats

Les 4 articles des paliers de la boutique d'Éclats (v3.463.0) ont leur icône, générées par Seb à partir des prompts de `Aethervale_Prompts_images_a_faire_v1_0.md`.

## Images
- `images/Icons/dungeon/dungeon_butin.webp` : Butin de faille (coffre ouvert, épée et anneau).
- `images/Icons/dungeon/dungeon_main_sure.webp` : Main sûre (gantelet tenant un éclat violet).
- `images/Icons/dungeon/dungeon_second_souffle.webp` : Second souffle (feu de camp, souffle violet).
- `images/Icons/dungeon/dungeon_resonance.webp` : Résonance de la faille (éclat et anneaux de lumière).

Préparation :
- découpées dans une planche 2 × 2 de 1254 px ;
- réduites à 128 × 128 ;
- elles reprennent le masque de transparence des articles existants (Clé de faille, Doigté), pour que le fond violet se fonde de la même façon ;
- WebP de 4,6 à 5,5 Ko.

## Contrôles
- `missing-icons.js` : 24 images absentes au lieu de 28.
- Chromium : la boutique charge les 4 images (128 × 128).
- round-harness 4643 OK, 0 échec (deux passes) ; boot, création du héros, parcours (139) OK.
