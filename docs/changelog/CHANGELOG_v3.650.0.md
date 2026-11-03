# v3.650.0 — Bulles flottantes : plus petites, et jamais de bouton coincé dessous

Accord de Seb du 03/11 après l'atelier `atelier/bulles-flottantes.html` : on garde les bulles en bas à droite (pratiques, sous le pouce), option « F0+ », et on les rapetisse. La marge réservée (F1), la rangée au-dessus de la barre (F2), la languette (F3) et la bulle unique (F4) ne sont pas retenues ; le bandeau du haut non plus (décision v3.396.0 gardée).

## Ce qui change (téléphone)
- Bulles de 48 à **40 px** (icône 30 → 25 px), 8 px entre elles ; la petite bulle du fil rouge au calme passe de 36 à 32 px. Le grand écran ne change pas.
- **Fin de liste** : chaque zone qui défile se termine par un espace de la hauteur des bulles (`--hud-dock-space`, mesurée à chaque rendu des bulles). En bas de liste, n'importe quel bouton remonte au-dessus d'elles ; pendant la lecture, aucune place perdue.
- Mesure (iPhone 390, liste défilée jusqu'en bas) : Camp, Quêtes, Village (Production, Ateliers), Journal : 0 bouton recouvert.
- Une ligne dans « Quoi de neuf ».

## Fichiers
`js/ui/hud-dock-view.js`, `css/02-layout.css`, `js/ui/news-view.js`, `js/lang/en.js`.

## Contrôles
`round-harness` 0 échec (deux passes) ; `boot-harness`, `hero-creation-harness`, `parcours-harness` P14 ; audit i18n 100 %.
