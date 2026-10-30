# v3.572.0 — iPhone : la page descend jusqu'en bas de l'écran

Retour de Seb du 30/10 (capture iPhone, appli installée) : « des fois j'ai le chargement jusqu'en bas, des fois pas ».

## Cause
Défaut d'iOS pour les applis web installées : selon les lancements, iOS donne au jeu une hauteur d'écran réduite de la zone de la barre d'accueil (environ 54 px). Toute la page se calait au-dessus d'une bande vide ; les boutons du bas des feuilles étaient coupés.

## Correction
- Un petit script en tête de `index.html` (appli installée sur iPhone seulement, `navigator.standalone`) mesure la vraie hauteur de l'écran et l'écart avec la hauteur donnée par iOS ; il recalcule en cas de rotation et au retour dans l'appli.
- `css/01-base.css` : la page et tous les écrans plein écran (chargement, accueil, création, prologue, feuilles, fenêtres, voiles) s'étendent de cet écart jusqu'en bas. Écart nul : rien ne change.
- Remplace la règle « 100lvh » de la v3.571.0 (`css/00-title-screen.css`), qui ne couvrait pas ce cas.
- iPad, PC, Safari et Android ne sont pas concernés.

## Contrôles
`round-harness` 5 521 OK, 0 échec (deux passes) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` P11 15 OK. Simulation Chromium (écran 390 × 844, fenêtre réduite à 790) : accueil, barre du bas et page jusqu'à 844 px. À confirmer sur iPhone (plusieurs lancements).
