# Aethervale v3.435.1 — Labyrinthe : l'écran prend tout l'iPhone

Retour de Seb sur iPhone : la zone du labyrinthe ne prenait pas tout l'écran. S'applique sur la v3.435.0.

## Ce qui change
- **Plein écran pendant une descente** :
  - l'écran du labyrinthe couvre tout l'iPhone ;
  - il respecte l'encoche et la barre d'accueil : le bandeau du haut ne passe plus sous l'heure et la batterie ;
  - il n'y a plus de bande vide en bas.
- **La vue s'étire sur toute la hauteur disponible**, entre le bandeau et les boutons. Elle reste centrée sur le héros.
- **La caméra est un peu plus près** : les salles sont 18 % plus grandes.
- La vignette de la carte d'Edda prend au plus 40 % de la hauteur de la vue.

## Code
- `css/04-panel-labyrinth.css` : page fixe sur tout l'écran (zones sûres de l'iPhone), vue flexible.
- `ui/labyrinth-view.js` : la hauteur visible suit celle de l'écran (`viewBox` recalculée à chaque dessin).
- Aucun fichier ajouté. Aucun fichier protégé touché.

## Contrôles
- Round : 4 096 OK, 0 échec, sur deux passes. Boot : 4 OK. Parcours : 139 OK.
- Chromium (390 × 844), vrai jeu :
  - la vue va du bandeau aux boutons ;
  - la carte d'Edda, le tutoriel, le rechargement et le bilan fonctionnent ;
  - console sans erreur.
