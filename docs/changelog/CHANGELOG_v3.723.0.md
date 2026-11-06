# v3.723.0 — Petites Aventures : écran « Prêt à partir » (06/11/2026)

Décisions de Seb (06/11) : pistes A + B + C du relevé de la besace, variante B de l'atelier `atelier/aventure-parcours.html` (« Récap et feuille »), objets qu'on n'a pas invisibles, objets rattachés à leur monde. Conception : `systemes/petites-aventures/Aethervale_Conception_Parcours_PA_v0_2.md` §8.

## Changé
- **Écran « Prêt à partir »** (`pa2-view.js`) : accroche en une ligne dépliable, nuit en une bande avec son objet ★ et « + Prendre » ; la besace est un récapitulatif dès le premier écran (noms, usages réels dont celui de la nuit, soins emportés, rations prises à l'Entrepôt, encombrement attaché à l'objet, « − ») ; feuille d'ajout qui reste ouverte (« − » / « + », détail au toucher, « Fini ») ; pactes en bascules sur le même écran ; trophées repliés ; bouton de départ collé en bas avec le **vrai multiplicateur final** (anneau × pactes × nuit × Carte × rumeur) et la ligne de calcul.
- **Une seule étape** : plus d'étape Pactes séparée. « Comme la dernière fois » gardé ; une besace sans l'objet de la nuit le signale.
- **Objets visibles** : un objet du coffre non gagné est caché ; un objet pris à l'Entrepôt est caché à stock nul (sauf s'il est déjà dans la besace) ; le matériel gratuit reste visible.
- **Objets rattachés à leur monde** (`pa2-content.js`, champ `worlds` des 10 objets du coffre, d'après `PA2_CHEST_REWARDS`) : un objet gagné ne sert plus que dans son monde. Communs : rations, gourde, corde, trousse, torche, armure, carte, fiole et les 3 objets fabriqués au village.
- `pa2-run.js` : `bagStock`, `endLootMult` (sorti de `finish`, calcul en un seul exemplaire) et `departLootMult`.
- Cibles ≥ 44 px, information ≥ 13 px, plus de toast qui couvre un bouton ; rappel des PV seulement à la première préparation. Tutoriel : deux erreurs factuelles corrigées.

## Mesures (Playwright)
Haut de la besace : y = 277 (iPhone 390 × 844), y = 279 (SE 320 × 568) ; bouton de départ toujours visible ; plus petite cible 44 × 44.

## Contrôles
round-harness 6 682 OK, 0 échec (2 passes), dont la section [483] (22 contrôles) ; boot ; création du héros ; i18n 0 manquant, 0 orphelin ; parcours 235 OK ; aucune icône absente.
