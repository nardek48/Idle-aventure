# v3.722.0 — Fenêtres sur le cadre parchemin de Seb (variante B)

Atelier `atelier/fenetres-parchemin.html`, choix de Seb le 06/11 (« B partout »). Aucun état sauvegardé nouveau, aucun fichier JS/CSS ajouté.

## Livré

- **Gabarit `.kwin`** (`css/00-components.css`, bloc v3.722.0), donc les 16 fenêtres du jeu d'un coup : le cadre parchemin de Seb sous chaque fenêtre (`.kwin::before`, `border-image … 90 fill / 46px` : coins ornés fixes, bords et centre étirés), ombre portée. Plus d'en-tête de pierre : icône au-dessus (40 px), titre en Alegreya 22 px sur le parchemin, sous-titre en italique 16 px, filet doré à losange (SVG en ligne), croix ronde dans le coin. Texte des fenêtres (`.kwin-text`) en Alegreya 17 px. Pied resserré (4 px de côté) pour que deux boutons tiennent à 320 px.
- **Fil rouge** (`js/ui/fil-rouge-view.js`, `css/04-panel-evolutions.css`) : les liens « Aussi : » deviennent « Pendant ce temps… », une ligne de 48 px par proposition avec son icône et un chevron, comme la maquette de Seb. Règles UI-9 de `07-responsive.css` retirées (inutiles).
- **Image** : `images/UI/frames/kwin-parchemin.webp` (561 × 701, 66 Ko, chargée à la demande, hors précache).
- Quoi de neuf : une ligne FR + EN ; clé « Pendant ce temps… » ajoutée, « Aussi : » retirée.
- `tools/harness/round-harness.js` : UI-9 mis à jour ; [483] (nouveau, 4 contrôles).

## Vérifié

- Captures Chromium à 390 × 844 et 320 × 568 : fil rouge, Ton or peut servir, carte de niveau, fiche d'aide (Taverne, qui défile), livre des jalons, quête terminée, confirmation « Effacer la partie ». Rien ne déborde, la croix reste dans le cadre.
- Non vus en capture (la partie de test ne les ouvre pas) : « Quoi de neuf », fenêtre de zone, pronostic avant sortie, bilan de donjon, récit de la carte vivante, absence ; même gabarit.

## Contrôles

- `node --check` sur chaque JS modifié.
- `round-harness.js` : 6 664 OK, 0 échec (deux passes) ; `boot-harness.js` 4/0 ; `hero-creation-harness.js` 44/0 ; `parcours-harness.js` 232/0.
