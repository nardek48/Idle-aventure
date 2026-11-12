# v3.772.0 — Mode PC : variante A de l'atelier mode-pc (12/11/2026)

Atelier `atelier/mode-pc.html` validé par Seb (12/11) : en-tête « A · bandeau bas », avec une réserve sur les trois entrées du bas du rail (en ligne, le texte dépassait) : elles gardent l'icône sur le libellé. Règles propres au mode PC (`html.wide-mode`) ; sur téléphone, Camp, Village, Héros et Quêtes sont identiques au pixel. Aucun fichier ajouté (un `<div class="tab-minis">` dans `index.html`).

## Ce qui change
- **En-tête** (`js/ui/screen-banner.js`, `WIDE_H`) : en mode PC, bandeau de 140 px (au lieu de l'image entière en 3:1, environ 300 px à 1366 et 430 px à 1920). Titre centré en hauteur, voile depuis la gauche. Le repli au défilement reste le même (56 px).
- **Rail** (`index.html`, `css/10-grand-ecran.css`) : Hauts faits, Bibliothèque, Journal et Paramètres forment un petit groupe encadré au bas du rail. Une entrée encore fermée ne laisse plus de case vide, et le séparateur disparaît.
- **Camp** (`js/ui/camp-view.js`) : Expéditions passe sous Le feu de camp, Missions garde la colonne de droite. Une ligne par sorte d'expédition, avec le bouton à droite.
- **Village** : la fiche du bâtiment passe en parchemin (texture des cartes) ; elle était blanche.
- **Notifications** : en bas à droite de la page, à gauche de la Chronique. En combat, elles se posent à droite, à mi-hauteur de l'arène, pour ne pas couvrir les techniques ni « Attaquer ».
- **Bandeau du haut** (`js/ui/hud-view.js`) : chaque ressource porte son nom (Or, Bois, Pierre…), et une ressource à 0 est cachée (l'or reste).
- Le menu plein écran n'est de toute façon pas accessible en mode PC (bouton Menu masqué) : rien à changer.

## Mesures (Chromium, `tools/audit/pc-captures.js`)
- **Libellés du groupe à 12 px :** aucun ne dépasse. « Bibliothèque » garde 7 px de marge de chaque côté à 1366 × 768, et 8 px à 1920 × 1080.
- **Héros, emplacement des bottes :** bas à 720 px pour un écran de 768 à 1366, et à 952 px pour un écran de 1080 à 1920. Il est entièrement visible ; il était coupé avant.
- **Téléphone (390 × 844) :** Camp, Village, Héros et Quêtes sont identiques au pixel, avant comme après. Le Menu ne diffère que par le chronomètre du combat derrière.

## Contrôles
- `round-harness` 7304 OK, 0 échec, sur 3 passes : la règle [171] des 12 px minimum a fait passer les libellés de 11,5 à 12 px.
- boot 4 OK ; création du héros 44 OK ; parcours complet 239 OK ; i18n sans texte en dur.
- Quoi de neuf : deux lignes (FR + EN).
- Atelier reconstruit : le groupe du rail y prend lui aussi l'icône sur le libellé.
