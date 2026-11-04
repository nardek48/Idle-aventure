# v3.673.0 — Le d20 pré-rendu des Petites Aventures

- **Images** (`images/UI/de/`, 21 fichiers, ≈ 470 Ko, chargés à la demande) : `d20_vide_<1..20>.webp` (256 px, une pose par valeur, toujours pointe en haut, chiffre de la face avant retiré du modèle) et `d20_roll.webp` (bande de 16 images du roulé). Rendues hors jeu depuis le modèle CC0 « Polyhedral Dice » (TSE-WEI-CHEN) avec `tools/rendu-de/` ; aucun moteur 3D en jeu.
- `js/ui/pa2-view.js` : `pa2DieFace` pose l'image de la valeur et écrit le chiffre par-dessus ; `pa2RollDie` montre le roulé 0,8 s puis pose la face (petit rebond). Le roulé est préchargé au premier affichage du dé.
- `css/04-panel-pa2.css` : dé à 96 px (72 avant), chiffre en Cinzel couleur or vieilli au centre de la face (54,1 % / 56,8 %), vert au 20 naturel, rouge au 1 ; le d20 SVG est retiré.
- `tools/harness/round-harness.js` [381] : vérifie le d20 pré-rendu au lieu du SVG.
- Atelier : `atelier/de-d20.html` (validé par Seb le 04/11).

Contrôles : round 6 140 OK (2 passes), boot 4 OK, parcours 212 OK. Icônes absentes : 0.
