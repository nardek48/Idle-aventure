# Rendu du d20 (outillage, hors jeu)

Pré-rendu du d20 des Petites Aventures à partir du modèle CC0 « Polyhedral Dice » (TSE-WEI-CHEN). Le jeu n'affiche que les images produites : aucun moteur 3D en jeu.

Préparer (une fois, dans ce dossier) :
- `npm install --no-save three@0.160.0`
- copier le dossier `PolyhedralDice` du zip de Seb sous le nom `dice/` (D20.gltf, D20.bin, textures/).

Produire :
- `node faces.js` : relève les 20 normales de faces dans `faces.json` (déjà fourni).
- `node final.js` : 20 faces (`out/face_<n>.png`, face tirée vers la caméra, chiffre à l'endroit) et 16 images de roulé (`out/roll_<t>.png`), 512 px.
- Ensuite, recadrer (80..432) et réduire à 256 px, WebP : faces `d20_<n>.webp`, roulé en bande de 16 images `d20_roll.webp`.

La table `MAP` de `final.js` donne, pour chaque valeur, la face du modèle et son sens de lecture (relevés à l'œil le 04/11). Le 6 et le 9 sont deux faces tournées pour se lire 6 et 9.
