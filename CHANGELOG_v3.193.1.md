# CHANGELOG v3.193.1 — Bandeau réellement hors scroll (retour iPhone Seb)

## 🐛 Le bug

Sur iPhone (v3.193.0) : le vert dépassait légèrement le contour du cadre,
et au scroll le contenu débordait au-dessus du bandeau. Cause : j'avais
validé la **sonde** (bandeau structurellement hors du flux scrollable)
mais implémenté en **`position: sticky`** — un mécanisme différent,
jamais testé en scroll long réel. Le sticky épingle dans le scrollport
mais laisse le contenu remonter dans les bandes latérales (zone des
rails, 3,45 % de chaque côté) et la frange du remplissage étendu à
`top: 0` dépassait le contour de l'art.

## ✅ Le fix : la structure de la sonde, exactement

Le décorateur **sort physiquement kf-top du flux scrollable** :

- **Pages à sous-onglets** (en pratique : toutes les pages migrées —
  Quêtes, Talents, Village… utilisent le scaffold `.subtab-page`) : le
  porte-bandeau `.kfp-top-holder.is-subtab` est inséré **au-dessus de
  `.subtab-page-content`**, symétrique de la barre de sous-onglets du
  bas. L'overflow de la zone coupe le contenu **exactement** au bas du
  bandeau (vérifié : `zoneTop == holderBottom` au pixel).
- **Pages simples** (fallback, si un écran scrollait dans
  `#panel-container`) : enveloppe `.kfp-wrap` pleine hauteur + zone de
  scroll interne `.kfp-scrollzone` — 02-layout.css (fichier RESYNC)
  toujours intouché.
- Le remplissage du cap **revient à l'origine** (28 % → bas) : plus rien
  ne passe derrière, la frange verte disparaît.
- Attrapé au test : le kf-top détaché perdait `--kf-fill` (scopée
  `.kframe`) et sa texture (règle `.kframe .kf-top::before`) — bandeau
  transparent sur la forêt. Le holder redonne les deux.

## Fichiers

`js/ui/kframe-decorator.js`, `css/00-kbtn.css`, `sw.js` (3.193.1).
Aucune vue modifiée, aucun système touché.

## Validation

Test de **scroll long réel** (ce qui manquait en v3.193.0) : Quêtes avec
30 blocs injectés + Village Production, géométrie mesurée
(`clips: true`, bandeau au pixel), captures — coupe nette, fond mousse
derrière le titre, zéro frange, zéro débordement latéral. Tour d'écrans
complet rejoué (6 écrans, zéro erreur JS). Harness 3 runs
948/946/948 OK, 0 échec.

## Leçon (pour le Guide UI au prochain cycle doc)

Une sonde valide une **structure**, pas un mécanisme « équivalent » :
si l'implémentation change de mécanisme (sticky vs hors-flux), elle doit
repasser par le même protocole de test que la sonde — scroll long
compris.
