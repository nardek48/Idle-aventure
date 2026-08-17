# Aethervale — v3.33.1
Correctifs visuels : fond blanc parasite (Production) + débordement du stepper (Entrepôt)

## Bugs corrigés

### 1. Fond blanc + bordure parasites sur les boutons Production
Les boutons Récolter/Améliorer (fonds fournis en `background-image`,
voir v3.33.0) laissaient apparaître un liseré blanc et une bordure
autour du visuel — le style natif du navigateur pour `<button>`
(fond blanc, `appearance` par défaut) n'était pas entièrement
neutralisé, seul `border: none` avait été posé.

**Correctif :** `background-color: transparent`, `box-shadow: none`,
`border-radius: 0`, `outline: none`, `margin: 0`, `appearance: none`
ajoutés à `.production-action-btn` pour repartir d'un bouton
totalement nu avant d'appliquer le fond fourni.

### 2. Stepper de l'Entrepôt qui déborde du cadre
Les boutons −/valeur/+/Max du stepper de vente (voir v3.32.0)
dépassaient la largeur du panneau détail sur mobile — le panneau fait
50% de la largeur de l'écran (`.eq-detail-panel`), soit environ
150-170px sur les formats les plus étroits, alors que le stepper
d'origine (boutons 34px, gaps 8px, bouton Max ~60px) totalisait
davantage.

**Correctif :** tailles et espacements réduits (`.warehouse-qty-btn`
34px → 28px, `.warehouse-qty-max-btn` plus compact, gap 8px → 6px),
`flex-shrink: 0` sur chaque élément pour un alignement stable.
Vérifié par mesure DOM réelle (`getBoundingClientRect()`) qu'aucun
élément ne dépasse plus le bord du panneau, y compris à 320px (borne
minimale du format cible).

## Fichiers modifiés
- `css/04-panel-production.css` (`.production-action-btn`)
- `css/04-panel-village.css` (`.warehouse-qty-*`)
- `sw.js` (`CACHE_VERSION` → `3.33.1`)

## Tests effectués
- Les 3 harnais `vm` existants (33 assertions au total) repassés au
  vert — correctif purement CSS, aucune logique concernée.
- Vérification Playwright : capture zoomée sur un bouton Production
  confirmant l'absence de liseré blanc, capture de l'Entrepôt à 375px
  et 320px confirmant que le stepper tient dans le cadre, mesure DOM
  directe (bord droit du stepper vs bord droit du panneau) confirmant
  l'absence de débordement même au format le plus étroit. Aucune
  erreur console/page JS.

## Test manuel à réaliser (Seb)
Ouvrir Village > Production et Village > Entrepôt sur mobile réel,
vérifier que les boutons Récolter/Améliorer n'ont plus de liseré blanc
et que le stepper de vente (−/+/Max) reste bien dans son cadre sans
déborder, quelle que soit la ressource sélectionnée.
