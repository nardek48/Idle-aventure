# v3.461.1 — Crypte : nouvelles images des monstres, dormeurs lisibles

Les cinq monstres de la Crypte qui étaient encore en style chibi passent au style réaliste des élites et de la Liche (atelier/crypte-images.html). Le rendu des morts qui dorment est revu pour ces images plus sombres (atelier/crypte-ombres.html, variante C).

## Images
Mêmes chemins, fichiers remplacés :
- `images/Enemies/spectre.webp` (Spectre) ;
- `images/Enemies/wraith.webp` (Spectre errant) ;
- `images/Enemies/necromancer.webp` (Nécromancien) ;
- `images/Enemies/deadknight.webp` (Chevalier mort) ;
- `images/Boss/Lord_Necro.webp` (Nécromancien suprême).

Fichiers fournis par Seb, gardés tels quels (340 à 430 Ko chacun, contre 70 à 160 Ko avant).

## Dormeurs (variante C)
L'assombrissement de profondeur et celui du sommeil s'additionnaient : un dormeur au fond ne gardait que 0,49 de sa luminosité, et le Chevalier mort devenait une silhouette noire. Désormais :
- le dormeur ignore l'assombrissement de profondeur ;
- le sommeil pâlit au lieu de noircir : `brightness(.85) contrast(.85) saturate(.35) blur(1px)` (était `brightness(.7) saturate(.35) blur(1.2px)`) ;
- sa pastille dans la rangée des tours : `brightness(.8)` (était `.6`).

Luminance au centre d'un dormeur, mesurée en jeu : Chevalier mort 18 → 41 à 48, Spectre 65 → 98. Un ennemi éveillé est entre 26 et 109 selon l'image.

## Code
- `css/03-combat-screen.css` : trois règles du bloc « mort qui dort ».
- Aucun fichier ajouté. Aucun fichier protégé touché.

## Note
Les images vivent dans le cache durable du service worker : chez un joueur qui a déjà vu l'ancienne image, la nouvelle est récupérée en arrière-plan à la première ouverture et s'affiche à la suivante.

## Outils (hors jeu)
- `tools/audit/crypte-captures.js` et `tools/audit/crypte-ombres-captures.js` : captures des deux ateliers.

## Contrôles
- round-harness 4588 OK, 0 échec (deux passes) ; boot (4), création du héros (44), parcours (139) OK.
- Captures en jeu : luminances identiques à la variante C de l'atelier.
