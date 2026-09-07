# v3.189.0 — Cadre v2 : décisions figées (Seb)

ATELIER UNIQUEMENT.

## Décisions figées
1. **Intérieur = texture moussue** — devient le DÉFAUT du composant
   .kframe (parchemin passe en variante de réserve .kframe-parchment,
   sombre uni conservé en .kframe-dark).
2. **Milieu = source LONGUE** pour le grand cadre ; la courte
   (.kframe-court) reste dédiée aux petites fenêtres/popups.
3. **Périmètre de bascule = cadre principal uniquement** (.nb-page-frame,
   17 écrans). Les cadres intérieurs (cartes, panneaux) sont un chantier
   ULTÉRIEUR avec les assets frame-content-small/medium/large du kit —
   avec d'abord un jugement sur écran pilote : les cartes crème sur la
   pierre moussue pourraient bien rendre telles quelles (parchemins sur
   table sombre).

## Prochaine étape
Bascule des 17 écrans : nouvelle session avec le ZIP COMPLET du build
actuel de Seb (HUD inclus) — helper JS pour le markup 3 rangées,
reprise des couleurs de texte écran par écran, contrôle Playwright de
chaque écran avant livraison.

sw.js → 3.189.0 · harness : 4 / 44 / 913 OK.
