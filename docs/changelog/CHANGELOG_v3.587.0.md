# v3.587.0 — Correctif : la carte des Petites Aventures disparaissait

Signalé par Seb sur iPhone (30/10) : plus aucune carte de fond en Petite Aventure, seulement les points sur du noir.

## Cause
Régression de la v3.580.0 (l'objet de la nuit). Le panneau « ★ Cette nuit » avait reçu la classe `pa2-night`, avec une règle `.pa2-night img { width: 34px; height: 34px }`. Or `pa2-night` existait déjà : c'est la classe posée sur le `<body>` quand la carte d'une Petite Aventure est affichée. Toutes les images de l'écran passaient donc à 34 × 34 px, l'image de fond comprise (mesuré sous Chromium : 34 × 34 au lieu de 793 × 1182), et le `body` prenait aussi le style du panneau.

## Correctif
- Le panneau de l'objet de la nuit prend sa propre classe, `pa2-nightitem` (`js/ui/pa2-view.js`, `css/04-panel-pa2.css`).
- Nouveau contrôle [391] : aucune règle CSS ne doit viser `.pa2-night` seule (il trouve les 4 règles fautives sur l'ancien CSS, 0 maintenant).

## Contrôles
`round-harness` 5 590 OK, 0 échec (deux passes) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` 142 OK. Carte des Ruines vérifiée sous Chromium à taille iPhone (390 × 844, ×3).
