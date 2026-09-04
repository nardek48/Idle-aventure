# CHANGELOG v3.153.0 — Correctif urgent : menu du bas cassé (v3.152.0)

## Bug remonté par Seb (capture d'écran)
Après l'intégration v3.152.0, le menu du bas flottait au milieu de l'écran,
superposé au contenu (fiche personnage, sous-onglets Héros/Amélioration/
Stats), et les icônes des 5 boutons (camp, village, etc.) ne s'affichaient
pas du tout — cases vides.

## Cause racine (une seule, explique les deux symptômes)
`#tab-bar-row` utilisait `margin: 27.81% 4.04% 8.86% 4.43%` pour se
positionner dans la zone "ardoise" du cadre. **Erreur de CSS** : les
marges `top`/`bottom` exprimées en `%` sont TOUJOURS calculées par rapport
à la **largeur** du bloc conteneur, jamais sa hauteur — règle de la
spec CSS, contre-intuitive, indépendante de la propriété visée. Le
`27.81%` du haut, censé représenter 27.81% de la hauteur du bandeau
(~103px, soit ~29px), était en réalité calculé sur sa largeur (~430px,
soit ~120px) — la rangée de boutons se retrouvait poussée ~90px trop bas,
hors du cadre visible.

De plus, `#tab-bar` (le parent visé) n'avait pas `position: relative` —
`#tab-bar-row` en position absolue (une fois le fix appliqué) se serait
donc calé par rapport à un ancêtre plus haut dans l'arbre DOM (probablement
`<body>`), ce qui explique le flottement au milieu de l'écran plutôt qu'un
simple débordement local.

Les icônes invisibles avaient la même cause : la rangée de boutons
positionnée n'importe où recevait des dimensions incohérentes, écrasant
les icônes filles à une taille effectivement nulle ou hors-écran.

## Corrections
1. `#tab-bar` : ajout de `position: relative` (ancre son enfant absolu).
2. `#tab-bar-row` : `margin` en `%` remplacé par
   `position: absolute; top/bottom/left/right` — ces 4 propriétés se
   calculent CHACUNE sur la bonne dimension de l'ancêtre positionné
   (`top`/`bottom` → hauteur, `left`/`right` → largeur), contrairement à
   `margin`.
3. `.tab-btn` : retrait de `justify-content: stretch`, valeur **invalide**
   en CSS flexbox (silencieusement ignorée par le navigateur, sans effet
   direct grave ici car `.tab-icon-frame` a déjà `width:100%` explicite,
   mais autant corriger pendant l'intervention).

## Leçon retenue pour la suite
Mon script de vérification visuelle avant la livraison v3.152.0 (rendu
généré en Python/PIL) calculait correctement les proportions de façon
indépendante — il a donc confirmé "ça a l'air bon" sans jamais exécuter le
CSS réel du projet, et n'a pas pu détecter cette erreur de propriété CSS.
Il valide l'intention du design, pas le code livré. Pour toute future
modification de positionnement CSS avec des valeurs en %, vérifier
explicitement quelle dimension chaque propriété (`margin`, `padding`,
`top`/`bottom`, `left`/`right`) utilise comme référence avant de livrer,
plutôt que de se fier uniquement à un rendu généré séparément.

## Fichiers modifiés
- `css/02-layout.css`
- `sw.js` (CACHE_VERSION 3.152.0 → 3.153.0)

## Aucun nouvel asset (correctif CSS uniquement)

## Vérifications effectuées
- Accolades CSS équilibrées (54/54).
- `boot-harness.js` : 4/4.
- `hero-creation-harness.js` : 44/44.
- `round-harness.js` : 913 OK, 0 échec.
- Recalcul manuel des dimensions attendues (bandeau 430×103px, rangée de
  boutons 394×66px positionnée à 19px/28px du coin) : cohérent avec les
  mesures de zone ardoise faites en v3.152.0.

## À tester par Seb — priorité haute
Ce correctif doit être appliqué par-dessus le delta v3.152.0 (mêmes assets
images, uniquement le CSS et sw.js changent ici). Vérifier en priorité :
1. Le menu du bas reste bien collé en bas de l'écran, sans superposition,
   sur tous les onglets (notamment celui avec sous-onglets qui a révélé le
   bug : Personnage/Héros).
2. Les 5 icônes (camp, quêtes, village, héros, menu) sont bien visibles
   dans leurs cases.
3. Les cases restent bien dans la zone ardoise du cadre, sans déborder.
