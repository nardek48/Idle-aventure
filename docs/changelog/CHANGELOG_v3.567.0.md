# v3.567.0 — Grand écran, option D : les composants de la maquette

Accord de Seb du 30/10 (« tu peux commencer sans commit… on commit en une fois »), après la comparaison maquette / jeu : les pages du grand écran gardaient les éléments du téléphone agrandis. Format large seulement : **le téléphone ne change pas**.

## Camp
- **Équipe compacte** : le héros et les compagnons qui partent avec lui sur une ligne chacun (portrait, nom, compétence, « avec toi », barre fine de PV) ; ceux restés au camp en pastilles.
- **Rations** sur trois cases (soin, nom, stock).
- **Grimoire** : bascule Tactique / Grimoire et liste des règles actives (« SI … → … »).
- **Missions en lignes** (icône, titre et badge, lieu et objectif, récompenses, action à droite) ; **expéditions** en petites cartes sur deux colonnes.

## Village › Production
- Onglets en pastilles, **3 vignettes par rangée**, « Tout récolter » à côté de la consigne.
- **Fiche résumée** : grande illustration, nom, réserve et débit, puis récolte, ateliers (deux colonnes) et zones.

## Combat (arène paysage)
- Les ennemis **s'écartent sur toute l'arène** et sont plus grands ; chacun a son **étiquette au sol** (« Araignée géante · cible ») ; la cible a son **anneau doré**.

## Partout
- **Onglets de page en pastilles** (Héros, Quêtes, Village…).
- **Boutons à la taille de la maquette** : le bleu pour l'action principale, cerclé d'or pour les autres, au lieu de s'étirer sur toute la largeur.
- Quêtes : bouton d'étape à sa taille, étapes terminées plus discrètes.

## Code
- `css/10-grand-ecran.css` : section « option D » (couleurs de la palette uniquement).
- `js/ui/camp-view.js` : `campWideTeamHTML`, `campWideGrimoireHTML`, `campWideMissionsHTML` ; barres de PV reliées à la mise à jour en direct du camp.
- `js/ui/production-view.js` : en-tête illustré de la fiche ancrée.
- `js/ui/combat-screen-view.js` : `arenaSpread` (écart des couloirs, arène paysage seulement) et étiquette au sol.
- `js/lang/en.js` : textes anglais. `tools/harness/round-harness.js` : contrôle [373] adapté aux nouveaux blocs du Camp.
- Aucun fichier ajouté, aucun fichier protégé.

## Contrôles
`round-harness` 5 508 OK, 0 échec (deux passes) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` P11 15 OK. Comparaisons au pixel avec la maquette à 1440 × 900 ; téléphone inchangé.

## Écarts restants avec la maquette
La fiche du Village garde les cases de zones et d'ateliers du jeu (elles portent les actions) ; le journal de combat garde le texte du moteur, non regroupé par round.
