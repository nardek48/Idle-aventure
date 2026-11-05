# v3.707.0 — Finitions sous 600 px de haut : carte d'Histoire du Camp (UI-10, fin) et écran de retour (validé par Seb le 05/11)

Deux défauts mesurés dans le vrai jeu, corrigés en CSS seulement, dans un bloc `@media (max-height: 599px)` : au-dessus de 600 px de haut, rien ne change (vérifié au pixel). Aucun fichier protégé touché. Aucun état sauvegardé nouveau. Aucun fichier ajouté.

## Corrigé

- **UI-10 (cas restant)** : carte de mission d'Histoire (`.camp-mission-card.is-main`) resserrée sous 600 px de haut, sans retirer d'information :
  - titre seul sur sa ligne, le badge « Histoire » passe à côté du lieu (le titre ne se coupe plus en deux lignes à cause du badge) ;
  - première phrase du récit (NOV-2) sur 1 ligne (points de suspension) au lieu de 2 ; le texte complet reste dans le pli « Récit » ;
  - récompense à droite du pli « Récit » (même rangée de 44 px, jusqu'à 3 lignes alignées à droite) ; pli ouvert, elle repasse dessous ;
  - marges internes 8/10 → 6 px, « Accepter » à 4 px sous la rangée (au lieu de 8). Les zones de toucher (pli 44 px, bouton 48 px) ne changent pas.
  - `css/07-responsive.css`.
- **Écran de retour** : sous 600 px de haut, en-tête en ligne (icône 36 px au lieu de 48, titre 17 px à gauche, marges 10 px), corps à 10/12 px de marge, phrase d'ambiance à interligne 1,4 et 8 px dessous (même recette que l'aide TUTO-11 sous 700 px). `css/07-responsive.css`.
- Quoi de neuf : une ligne FR + EN (`js/ui/news-view.js`, `js/lang/en.js`).
- `tools/harness/round-harness.js` : [473] (nouveau, 7 contrôles) : bloc sous 600 px présent, récit 1 ligne dessous / 2 lignes au-dessus, titre et badge, récompense à côté du pli (dessous pli ouvert), bouton et zones de toucher, en-tête du retour, structure de la carte intacte.

## Mesures (vrai jeu, Chromium, Chevalier)

**Camp › Missions, carte d'Histoire à l'ouverture** : marge entre le bas d'« Accepter » et le haut de la barre du bas (négatif = dessous). 140 états : nouvelle partie (forest_01) + chaque étape d'Histoire des six mondes (115 étapes), plus 24 de ces étapes avec une quête secondaire acceptée.

| Taille | Avant (nouvelle partie / pire cas / états sous 4 px) | Après |
|---|---|---|
| 320×568 Normale | −16 / −68 (ruines_08) / 140 sur 140 | **+38 / +6 (crypte_12) / 0** |
| 320×568 Grande (bandeau caché) | +74 / −1 (ruines_04) / 3 | **+133 / +68 / 0** |
| 390×844 Normale | +212 / +179 / 0 | identique au pixel (140 états) |
| 390×844 Grande | +160 / +119 / 0 | identique au pixel (140 états) |

La quête secondaire n'a pas d'effet : la carte d'Histoire est toujours la première. Débordement horizontal 0, aucune erreur de page.

**Écran de retour, Village + Caravanes** (phrase d'ambiance la plus longue du jeu, sans Taverne) : bas de « Décharger » moins le bas de la zone visible (positif = sous le pli).

| Taille | Avant | Après |
|---|---|---|
| 320×568 Grande | +86 px (en-tête 168 px, ambiance 66 px) | **−8 px, visible** (en-tête 89 px, ambiance 61 px) |
| 320×568 Normale | −5 px (tout juste) | −105 px (en-tête 59 px) |
| 390×844 Normale / Grande | −196 / −233 px | identiques au pixel |

Avec une phrase d'ambiance tirée au hasard et la Taverne, 320×568 Grande : +64 → −8 px. Le « 7 px » relevé auparavant était mesuré pendant l'animation d'ouverture de la fenêtre (échelle 0,94) ; une fois posée, l'écart réel était de 64 à 86 px.

## Laissés

- Aucun.

Contrôles : `node --check` sur chaque JS modifié ; round-harness 6 603 OK, 0 échec (2 passes) ; boot 4 OK ; création 44 OK ; i18n 100 % (8 482 textes), 0 orphelin ; parcours 232 OK, 0 échec.
