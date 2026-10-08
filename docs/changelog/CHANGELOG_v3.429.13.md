# Aethervale v3.429.13 — Le message en bas d'écran ne chevauche plus les bulles

Relevé pendant la première heure de jeu testée dans Chromium. S'applique sur la v3.429.12.

## Le constat
Le message temporaire (`#toast`, centré, à 120 px du bas) recouvrait le libellé des bulles de raccourci (« Réclamer : Le feu de camp »), qui s'étend vers la gauche depuis l'icône : deux textes l'un sur l'autre. Mesuré au pixel dans Chromium, message long : 3 840 px² de chevauchement en 320 px, 3 464 en 390, 3 704 en 430. Les icônes elles-mêmes n'étaient pas touchées.

## Le correctif
Pendant qu'un message est affiché, le libellé des bulles s'efface (classe `toast-shown` sur `body`) ; l'icône reste. Le message garde sa place habituelle.

Mesuré après correctif : 0 px² de chevauchement visible en 320, 390 et 430 px.

## Code
- `js/ui/toast.js` : classe `toast-shown` posée le temps du message.
- `css/02-layout.css` : `body.toast-shown .hud-bub .hud-bub-tip { opacity: 0; }`.
- Aucun fichier protégé touché. Aucun fichier ajouté.

## Contrôles
- Round : **3 963 OK**, 0 échec, sur trois passages. Boot : 4 OK. Création du héros : 44 OK.
- Chromium : mesure au pixel aux trois largeurs, capture vérifiée.
- `node --check` sur tous les JS modifiés.
